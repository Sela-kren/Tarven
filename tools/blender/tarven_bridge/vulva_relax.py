"""Evens out the triangles round her vulva in the crotch sculpt file, keeping its shape (2026-11-21).

  D:/blender/blender.exe -b art/female_vulva_edit.blend --python tools/blender/tarven_bridge/vulva_relax.py -- [passes]

Her sculpted vulva was joined onto this body with very small triangles beside long thin ones, so strokes there broke
into spiky cracks (worst along the split between her lips). Each pass slides every point towards the middle of its
neighbours along the surface only (the move along its normal is taken out), so the spacing evens out but nothing
rises or sinks. Full strength within FULL of her vulva, fading to nothing by FADE. Same points and count, so the
read-back (vulva_in.py) and the game's vulva are unaffected. Her points before are kept in
ref/_sculpt_work/vulva/before_relax.npy.
"""
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PASSES = int(argv[0]) if argv else 30
STEP = 0.5
FULL, FADE = 0.035, 0.06
VULVA = {"T_vulva", "T_labia", "T_canal", "T_hole"}
OVERLAYS = {"T_lingerie", "T_pubic"}
WORK = os.path.join(core.repo_root(), "ref", "_sculpt_work", "vulva")

body = bpy.data.objects["Female_Body"]
me = body.data
n = len(me.vertices)
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
np.save(os.path.join(WORK, "before_relax.npy"), co)
names = [m.name if m else "" for m in me.materials]

me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles) * 3, np.int32)
me.loop_triangles.foreach_get("vertices", tris)
tris = tris.reshape(-1, 3)
tri_mat = np.empty(len(me.loop_triangles), np.int32)
me.loop_triangles.foreach_get("material_index", tri_mat)
over_ids = [i for i, nm in enumerate(names) if nm in OVERLAYS]
tris = tris[~np.isin(tri_mat, over_ids)]

edges = np.empty(len(me.edges) * 2, np.int32)
me.edges.foreach_get("vertices", edges)
edges = edges.reshape(-1, 2)
# Points on an open edge (the rim of an opening) stay put, so openings keep their outline.
count = {}
for f in me.polygons:
    for k in f.edge_keys:
        count[k] = count.get(k, 0) + 1
rim = np.zeros(n, bool)
for (a, b), c in count.items():
    if c == 1:
        rim[a] = rim[b] = True
overlay = np.zeros(n, bool)
for p in me.polygons:
    if names[p.material_index] in OVERLAYS:
        overlay[list(p.vertices)] = True

vulva_pts = set()
for p in me.polygons:
    if names[p.material_index] in VULVA:
        vulva_pts.update(p.vertices)
centre = co[list(vulva_pts)].mean(0)
d = np.linalg.norm(co - centre, axis=1)
t = np.clip((d - FULL) / (FADE - FULL), 0, 1)
weight = (1 - t * t * (3 - 2 * t)) * ~rim * ~overlay
moving = weight > 0
keep = moving[edges[:, 0]] | moving[edges[:, 1]]
e = edges[keep]
deg = np.zeros(n)
np.add.at(deg, e[:, 0], 1)
np.add.at(deg, e[:, 1], 1)


def normals(p):
    a, b, c = p[tris[:, 0]], p[tris[:, 1]], p[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    vn = np.zeros_like(p)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def quality(p, sel):
    a, b, c = p[tris[sel, 0]], p[tris[sel, 1]], p[tris[sel, 2]]
    ls = (np.linalg.norm(b - a, axis=1) ** 2 + np.linalg.norm(c - b, axis=1) ** 2 + np.linalg.norm(a - c, axis=1) ** 2)
    area = np.linalg.norm(np.cross(b - a, c - a), axis=1) / 2
    return 4 * np.sqrt(3) * area / np.maximum(ls, 1e-18)


region = (weight[tris] > 0.5).all(1)
q0 = quality(co, region)
# Back onto her surface as sculpted after each pass, so sliding never cuts across a crease (the split between her
# lips): only onto surface within SNAP, so a point never jumps across a narrow gap to the other side.
SNAP = 0.0003
surface = BVHTree.FromPolygons([Vector(x) for x in co], tris.tolist())
movers = np.nonzero(moving)[0]
p = co.copy()
for _ in range(PASSES):
    s = np.zeros_like(p)
    np.add.at(s, e[:, 0], p[e[:, 1]])
    np.add.at(s, e[:, 1], p[e[:, 0]])
    avg = s / np.maximum(deg, 1)[:, None]
    move = avg - p
    nrm = normals(p)
    move -= (move * nrm).sum(1, keepdims=True) * nrm  # along the surface only
    p += move * (STEP * weight)[:, None]
    for v in movers:
        q, _, _, dist = surface.find_nearest(Vector(p[v]), SNAP)
        if q is not None:
            p[v] = q
q1 = quality(p, region)
shift = np.linalg.norm(p - co, axis=1)
print(f"vulva_relax: {int(moving.sum())} points eased, {PASSES} passes; most slid {shift.max() * 1000:.2f} mm")
print(f"vulva_relax: thin slivers (quality < 0.2) {int((q0 < 0.2).sum())} -> {int((q1 < 0.2).sum())} of {int(region.sum())}; "
      f"median quality {np.median(q0):.2f} -> {np.median(q1):.2f}")
me.vertices.foreach_set("co", p.ravel())
me.update()
print("vulva_relax: saved", core.save_blend())
