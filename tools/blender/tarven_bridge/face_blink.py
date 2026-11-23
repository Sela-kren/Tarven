"""A first pass at her "Blink" shape key, in art/female_face_keys.blend: the lids shut over her eyes.

  D:/blender/blender.exe -b art/female_face_keys.blend --python tools/blender/tarven_bridge/face_blink.py

The key was left empty for sculpting by hand (face_keys_build.py); this fills it so the game's blinks (game.ts
eyesAlive) show, and the user can re-sculpt it on top. Back the .blend up first; it saves over it.

How: each eye's opening is the loop of open edges in the face mesh around the eyeball (Eye_L/R, a sphere). Seen from
the eyeball's centre, every point near the eye has a height angle (up and down, about the eye's side-to-side axis)
and a bearing (left and right). Along the opening, the upper lid's edge and the lower lid's edge give two heights
for each bearing. Shut, they meet where the old rig met them (facerig.ts Blink: upper lid all the way, lower lid a
quarter): a quarter of the way up from the lower edge. Every upper-lid point turns down about the eyeball's centre
by the upper edge's travel, fading out above the lid towards the brow, so the lid slides over the ball and keeps its
thickness; the lower lid turns up likewise, fading towards the cheek. The lashes ride with their lid.
"""
import math

import bmesh
import bpy
import numpy as np

#: Where the lids meet, as a share of the opening from the lower edge (the old rig's lidLower 0.25).
MEET = 0.25
#: How far above the upper edge the upper lid still moves (radians of height, seen from the eye's centre), and below
#: the lower edge the lower lid.
UPPER_REACH = 0.75
LOWER_REACH = 0.4
#: Points further than this from the eyeball's surface don't move (metres): brow, cheek, nose.
SKIN_NEAR = 0.010
SKIN_FAR = 0.024
#: Past the corners of the eye, the move fades over this much bearing (radians).
CORNER_FADE = 0.12


def smooth(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def world_points(obj):
    m = np.array(obj.matrix_world)
    co = np.array([v.co[:] for v in obj.data.vertices])
    return co @ m[:3, :3].T + m[:3, 3], m


def sphere_centre(p):
    a = np.c_[2 * p, np.ones(len(p))]
    sol = np.linalg.lstsq(a, (p ** 2).sum(1), rcond=None)[0]
    c = sol[:3]
    return c, math.sqrt(sol[3] + (c ** 2).sum())


def angles(rel):
    """Bearing (side to side) and height (up and down) of points about the eye's centre; the face looks along +Y."""
    bearing = np.arctan2(rel[:, 0], rel[:, 1])
    height = np.arctan2(rel[:, 2], rel[:, 1])
    return bearing, height


def turn(rel, by):
    """Turns points about the eye's side-to-side axis (X) by `by` radians each, raising their height angle."""
    c, s = np.cos(by), np.sin(by)
    out = rel.copy()
    out[:, 1] = rel[:, 1] * c - rel[:, 2] * s
    out[:, 2] = rel[:, 1] * s + rel[:, 2] * c
    return out


def lid_edges(face, points, centre, radius):
    """The opening's upper and lower edge heights against bearing, from the open-edge loop around this eye."""
    bm = bmesh.new()
    bm.from_mesh(face.data)
    edge_verts = sorted({v.index for e in bm.edges if e.is_boundary for v in e.verts})
    bm.free()
    near = [i for i in edge_verts if np.linalg.norm(points[i] - centre) < radius * 1.5]
    bearing, height = angles(points[near] - centre)
    left, right = bearing.min(), bearing.max()
    # Each side's corner splits the loop: at a bearing, the higher points are the upper lid, the lower the lower lid.
    bins = np.linspace(left, right, 15)
    up_b, up_h, lo_b, lo_h = [], [], [], []
    for a, b in zip(bins[:-1], bins[1:]):
        inside = (bearing >= a) & (bearing <= b)
        if not inside.any():
            continue
        mid = (a + b) / 2
        up_b.append(mid)
        up_h.append(height[inside].max())
        lo_b.append(mid)
        lo_h.append(height[inside].min())
    corner_l = height[bearing.argmin()]
    corner_r = height[bearing.argmax()]
    up_b = [left, *up_b, right]
    lo_b = [left, *lo_b, right]
    up_h = [corner_l, *up_h, corner_r]
    lo_h = [corner_l, *lo_h, corner_r]
    return (left, right), (np.array(up_b), np.array(up_h)), (np.array(lo_b), np.array(lo_h)), len(near)


def blink_moves(points, centre, radius, span, upper, lower, lashes=False):
    """How far each point moves, shut, for one eye (world-space offsets)."""
    rel = points - centre
    bearing, height = angles(rel)
    b = np.clip(bearing, span[0], span[1])
    top = np.interp(b, *upper)
    bottom = np.interp(b, *lower)
    meet = bottom + MEET * (top - bottom)
    # Fade past the corners, and on the far side of the ball (behind the eye's front).
    corner = 1 - smooth(0, CORNER_FADE, np.maximum(span[0] - bearing, bearing - span[1]))
    front = smooth(-0.002, 0.006, rel[:, 1])
    if lashes:
        near = np.ones(len(points))
    else:
        gap = np.linalg.norm(rel, axis=1) - radius
        near = 1 - smooth(SKIN_NEAR, SKIN_FAR, gap)
    middle = (top + bottom) / 2
    upper_side = height >= middle
    by = np.where(
        upper_side,
        -(top - meet) * (1 - smooth(0, UPPER_REACH, height - top)),
        (meet - bottom) * (1 - smooth(0, LOWER_REACH, bottom - height)),
    )
    by *= corner * front * near
    return turn(rel, by) - rel


def main():
    face = bpy.data.objects["Face"]
    face_points, face_m = world_points(face)
    face_moves = np.zeros_like(face_points)
    lash_moves = {}
    for side in ("L", "R"):
        eye_points, _ = world_points(bpy.data.objects["Eye_" + side])
        centre, radius = sphere_centre(eye_points)
        span, upper, lower, found = lid_edges(face, face_points, centre, radius)
        print(f"Eye_{side}: centre {np.round(centre, 4)}, radius {radius:.4f}, opening points {found}, "
              f"opening height {math.degrees(float(np.max(upper[1] - lower[1]))):.1f} deg")
        # Each eye moves only the points on its own side of the face.
        mine = np.sign(face_points[:, 0]) == np.sign(centre[0])
        moves = blink_moves(face_points, centre, radius, span, upper, lower)
        face_moves[mine] = moves[mine]
        lash = bpy.data.objects["Lash_" + side]
        lash_points, lash_m = world_points(lash)
        lash_moves[lash.name] = (lash, lash_m, blink_moves(lash_points, centre, radius, span, upper, lower, lashes=True))

    def write(obj, m, moves):
        key = obj.data.shape_keys.key_blocks["Blink"]
        basis = obj.data.shape_keys.key_blocks[0]
        to_local = np.linalg.inv(m[:3, :3])
        local = moves @ to_local.T
        count = 0
        for i, (b, k) in enumerate(zip(basis.data, key.data)):
            k.co = (b.co[0] + local[i, 0], b.co[1] + local[i, 1], b.co[2] + local[i, 2])
            if np.linalg.norm(local[i]) > 1e-6:
                count += 1
        print(f"{obj.name}: Blink moves {count} points, most {np.linalg.norm(moves, axis=1).max() * 1000:.1f} mm")

    write(face, face_m, face_moves)
    for obj, m, moves in lash_moves.values():
        write(obj, m, moves)
    bpy.ops.wm.save_mainfile()
    print("saved", bpy.data.filepath)


main()
