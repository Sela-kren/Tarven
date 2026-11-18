"""Proposes rounder big cups in a bust review file, in the direction the user's own fixes went, for them to adjust.

The user's F fix (art/sculpt_fixes/female_02.npz) rounded the breasts, drew the outer side and the underside in by a
few millimetres, and brought the front forwards and down (a fuller, lower front). The big cups as the game grows
them are boxy: wide, with corners and a flat wall down the cleavage. For each of CUPS this rounds each breast towards
a ball about its own middle (Blender's Cast, sphere, as strong as STRENGTH says for the cup), only where the cup
grew her past the C cup, pulls the outer spill in, lets the front hang, and keeps the two sides off each other at
the middle. It changes the open review file's Bust_<cup> objects in place and saves it, so the user sees the
proposal and sculpts on from it; tools/blender/bust_fixes.py then reads it back like any other sculpting.

Run: D:\\blender\\blender.exe -b art/bust_review/bust_review_NN.blend -P tools/blender/bust_propose.py
"""
import bpy
import numpy as np

# Cast strength, outer pull-in (share of the breast's half width) and front droop (metres), per cup.
PROPOSAL = {
    "J": (0.3, 0.06, 0.008),
    "M": (0.36, 0.08, 0.012),
    "Q": (0.42, 0.1, 0.016),
    "U": (0.46, 0.11, 0.02),
    "Z": (0.5, 0.12, 0.024),
}
# Where the cup grew her by this share of its most growth the proposal is whole; none at the first.
GROWN = (0.08, 0.45)
# The two sides stay at least this far either side of her middle.
MIDDLE_GAP = 0.002


def co_of(mesh):
    a = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def propose(cup, strength, pull, droop, base):
    obj = bpy.data.objects[f"Bust_{cup}"]
    co = co_of(obj.data)
    grown = np.linalg.norm(co - base, axis=1)
    weight = smoothstep(GROWN[0] * grown.max(), GROWN[1] * grown.max(), grown)
    # Each breast's middle, from the points the cup grew most (she faces -Y here, her left at +X).
    for side in (-1, 1):
        mine = (np.sign(co[:, 0]) == side) & (weight > 0)
        w = weight * mine
        centre = (co * w[:, None]).sum(0) / w.sum()
        group = obj.vertex_groups.new(name=f"breast_{side}")
        for i in np.nonzero(mine)[0]:
            group.add([int(i)], float(w[i]), "REPLACE")
        empty = bpy.data.objects.new(f"centre_{cup}_{side}", None)
        bpy.context.collection.objects.link(empty)
        empty.parent = obj
        empty.location = centre
        cast = obj.modifiers.new(f"round_{side}", "CAST")
        cast.cast_type = "SPHERE"
        cast.factor = strength
        cast.vertex_group = group.name
        cast.object = empty
        cast.use_transform = False
    depsgraph = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(depsgraph)
    new = co_of(ev.to_mesh())
    ev.to_mesh_clear()
    for mod in list(obj.modifiers):
        obj.modifiers.remove(mod)
    for side in (-1, 1):
        mine = np.sign(co[:, 0]) == side
        w = weight * mine
        centre = (co * w[:, None]).sum(0) / w.sum()
        # Rounding a box out to a ball swells it: brought back to the size it was (the mean cube of each point's
        # distance from the middle, as a volume goes), so it changes shape, not cup.
        r_was = np.linalg.norm(co - centre, axis=1)
        r_now = np.linalg.norm(new - centre, axis=1)
        k = (((r_was ** 3) * w).sum() / ((r_now ** 3) * w).sum()) ** (1 / 3)
        new = new + ((centre + (new - centre) * k) - new) * w[:, None]
        half = np.percentile(np.abs(co[w > 0.5, 0] - centre[0]), 95)
        # Outer spill drawn in towards the breast's middle, most at its outer edge.
        out = np.clip(side * (new[:, 0] - centre[0]) / half, 0, 1.5)
        new[:, 0] -= side * pull * half * out * w
        # The front hangs: lowered by how far forwards (-Y) of the middle it stands.
        ahead = np.clip((centre[1] - new[:, 1]) / 0.08, 0, 1.5)
        new[:, 2] -= droop * ahead * w
    # Neither side passes the middle.
    side = np.sign(co[:, 0])
    cross = (side != 0) & (side * new[:, 0] < MIDDLE_GAP) & (weight > 0)
    new[cross, 0] = side[cross] * np.maximum(MIDDLE_GAP, np.minimum(side[cross] * co[cross, 0], MIDDLE_GAP))
    final = co + (new - co) * 1.0
    obj.data.vertices.foreach_set("co", final.ravel())
    obj.data.update()
    for g in list(obj.vertex_groups):
        obj.vertex_groups.remove(g)
    for e in [o for o in bpy.data.objects if o.name.startswith(f"centre_{cup}_")]:
        bpy.data.objects.remove(e)
    moved = np.linalg.norm(final - co, axis=1)
    print(f"proposal {cup}: {int((moved > 0.001).sum())} points, most {moved.max() * 1000:.1f} mm")


def main():
    base = co_of(bpy.data.objects["Bust_C"].data)
    for cup, (strength, pull, droop) in PROPOSAL.items():
        if f"Bust_{cup}" in bpy.data.objects:
            propose(cup, strength, pull, droop, base)
    bpy.ops.wm.save_mainfile()


main()
