"""
Bigger eyes for real_heroin: each eye's opening (and its lids, and the skin round them, fading out) grown about the
opening's centre, wider (EYE_SX) and taller (EYE_SZ), and the eyeball grown (EYE_BALL) to fill it. Every moved point
keeps how far it stood off the ball, so the lids keep their thickness and stay wrapped round it.

Run on a COPY of art/real_heroin_sculpt.blend, before add_eyes.py:
blender -b rh_copy.blend -P tools/blender/real_heroin/eye_size.py -- <out.blend>
"""
import bpy, bmesh, math, sys
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else None

EYE_SX = 1.18        # opening width x this
EYE_SZ = 1.45        # opening height x this
EYE_BALL = 1.12      # eyeball radius x this
MARGIN = 0.005       # the lids (and this much skin round the opening) move fully...
WRAP = (0.003, 0.008)   # lids up to 3 mm off the ball wrap the grown ball fully, fading out by 8 mm
FADE = 1.3           # ...fading out by this many more opening-sizes past that

MM = 0.001
body = bpy.data.objects["real_heroin_body"]
me = body.data
mw = body.matrix_world
inv = mw.inverted()
# her shading is stored as custom normals: keep them, and redo them only where the skin moves (else a pale band)
import numpy as np
old_normals = [n.vector.copy() for n in me.corner_normals] if me.has_custom_normals else None
geo_before = [n.vector.copy() for n in me.vertex_normals]
moved_ids = set()
bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
world = [mw @ v.co for v in bm.verts]
info = {}
for side, tag in ((1, "L"), (-1, "R")):
    eye = bpy.data.objects[f"real_heroin_eye.{tag}"]
    C = eye.matrix_world.translation.copy()
    R = max(eye.dimensions) / 2
    loop = [v for v in bm.verts if v.is_boundary and world[v.index].x * side > 0.012 and world[v.index].z > 1.58]
    OC = sum((world[v.index] for v in loop), Vector()) / len(loop)
    hw = max(abs(world[v.index].x - OC.x) for v in loop)
    hh = max(abs(world[v.index].z - OC.z) for v in loop)
    C2 = OC + (C - OC) * EYE_BALL
    R2 = R * EYE_BALL
    moved = 0
    for v in bm.verts:
        p = world[v.index]
        if p.x * side <= 0:
            continue
        # fades out towards the back (the sides of her head), no hard cut
        ty = min(1.0, max(0.0, (p.y - (C.y - 0.014)) / 0.010))
        wy = ty * ty * (3 - 2 * ty)
        if wy <= 0:
            continue
        dx, dz = p.x - OC.x, p.z - OC.z
        e = math.hypot(dx / (hw + MARGIN), dz / (hh + MARGIN))
        if e >= 1 + FADE:
            continue
        t = 0.0 if e <= 1 else (e - 1) / FADE
        w = (1 - t * t * (3 - 2 * t)) * wy           # smoothstep falloff
        q = Vector((OC.x + dx * (1 + (EYE_SX - 1) * w), p.y, OC.z + dz * (1 + (EYE_SZ - 1) * w)))
        # keep its standing-off from the ball: as far out from the grown ball as it was from the old one
        # (only the lids: skin further off the ball than WRAP keeps its depth, or her face puffs up round the eye)
        off = (p - C).length - R
        tw = min(1.0, max(0.0, (off - WRAP[0]) / (WRAP[1] - WRAP[0])))
        wr = w * (1 - tw * tw * (3 - 2 * tw))
        r = q - C2
        q = q.lerp(C2 + r.normalized() * (R2 + off), wr) if r.length > 1e-6 else q
        v.co = inv @ q
        moved += 1
        moved_ids.add(v.index)
    eye.matrix_world.translation = C2
    for ev in eye.data.vertices:
        ev.co *= EYE_BALL
    info[tag] = dict(open_mm=(round(hw * 2000, 1), round(hh * 2000, 1)), to_mm=(round(hw * 2000 * EYE_SX, 1), round(hh * 2000 * EYE_SZ, 1)),
                     ball_r=round(R2 * 1000, 2), moved=moved)
bm.to_mesh(me)
bm.free()
me.update()
if old_normals is not None:
    # each moved corner's normal turned as far as the surface under it turned
    geo_after = [n.vector.copy() for n in me.vertex_normals]
    new = []
    for i, loop in enumerate(me.loops):
        n = old_normals[i]
        vi = loop.vertex_index
        if vi in moved_ids:
            n = geo_before[vi].rotation_difference(geo_after[vi]) @ n
        new.append(tuple(n.normalized()))
    me.normals_split_custom_set(new)
print("EYESIZE", info)
if OUT:
    bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
