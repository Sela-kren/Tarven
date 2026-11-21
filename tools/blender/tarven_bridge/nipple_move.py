"""Slides her nipple and areola discs (T_areola) across her skin (2026-11-20).

On her hand sculpt the discs (copied from a swap build by overlays.py) sat 2.5 cm inside the middle of each breast;
the user wanted them "a bit more to the side". Her sculpt has no nipple of its own (the disc is the nipple: the game
shapes it, nipples.ts), so only the disc moves: each of its points goes OUT outward (and DOWN down) and is laid back on
her skin at the same height over it, and takes the weights of the skin under it. Its UVs (which the game reads the
disc by) stay as they are.

  D:/blender/blender.exe -b <master>.blend --python tools/blender/tarven_bridge/nipple_move.py -- <out.blend> [OUT] [DOWN]
"""
import os
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
OUT_FILE = argv[0]
OUT = float(argv[1]) if len(argv) > 1 else 0.025   # m, away from her middle
DOWN = float(argv[2]) if len(argv) > 2 else 0.0    # m
PATCHES = ("T_areola", "T_lingerie", "T_pubic", "T_vulva", "T_labia", "T_canal", "T_hole", "T_anus", "T_anus_skin")

body = bpy.data.collections[core.MASTER_COLLECTION].all_objects["Female_Body"]
me = body.data
w = body.matrix_world
inv = w.inverted()
names = [s.material.name if s.material else "" for s in body.material_slots]
disc = sorted({v for p in me.polygons if names[p.material_index] == "T_areola" for v in p.vertices})
skin_faces = [p for p in me.polygons if names[p.material_index] not in PATCHES]
skin_points = sorted({v for p in skin_faces for v in p.vertices})
skin = BVHTree.FromPolygons([w @ v.co for v in me.vertices], [p.vertices[:] for p in skin_faces])

before = {}
for side in (1, -1):
    pts = [w @ me.vertices[v].co for v in disc if (w @ me.vertices[v].co).x * side > 0]
    before[side] = sum(pts, Vector()) / len(pts)

moved = {}
for v in disc:
    p = w @ me.vertices[v].co
    loc, n, _i, _d = skin.find_nearest(p)
    height = (p - loc).dot(n)
    side = 1 if p.x > 0 else -1
    goal = loc + Vector((side * OUT, 0.0, -DOWN))
    # Back onto her skin from in front of the goal (her front is +y), at the same height.
    hit, hn, _i, _d = skin.ray_cast(goal + n * 0.05, -n, 0.1)
    if hit is None:
        hit, hn, _i, _d = skin.find_nearest(goal)
    moved[v] = hit + hn * height
for v, p in moved.items():
    me.vertices[v].co = inv @ p

# Weights: the skin point nearest each moved point.
kd = KDTree(len(skin_points))
for k, v in enumerate(skin_points):
    kd.insert(w @ me.vertices[v].co, k)
kd.balance()
for v in disc:
    _c, k, _d = kd.find(w @ me.vertices[v].co)
    src = me.vertices[skin_points[k]]
    for g in list(me.vertices[v].groups):
        body.vertex_groups[g.group].remove([v])
    for g in src.groups:
        body.vertex_groups[g.group].add([v], g.weight, "REPLACE")
me.update()

for side in (1, -1):
    pts = [w @ me.vertices[v].co for v in disc if (w @ me.vertices[v].co).x * side > 0]
    c = sum(pts, Vector()) / len(pts)
    print(f"nipple_move: side {side:+d} centre {tuple(round(x, 3) for x in before[side])} -> {tuple(round(x, 3) for x in c)}")
core.relink_textures()
bpy.ops.wm.save_as_mainfile(filepath=OUT_FILE, relative_remap=True)
print("saved", OUT_FILE)
