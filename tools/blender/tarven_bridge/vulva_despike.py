"""Smooths out the spikes round her vulva in the crotch sculpt file, and only those (2026-11-21).

  D:/blender/blender.exe -b art/female_vulva_edit.blend --python tools/blender/tarven_bridge/vulva_despike.py -- [out.blend]

Where her lips were split, many thin triangles meet in a star and the surface folds back on itself in little spikes.
A spike is a point whose own normal turns more than SPIKE_DEG from the average of its neighbours'; each is smoothed
(towards the middle of its neighbours) with everything within REACH of it, eased off by FADE_TO.
Everything else stays exactly as sculpted. Her points before are kept in ref/_sculpt_work/vulva/before_despike.npy.
A whole-crotch relax was tried first and creased the folds of her groin.
"""
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else None
SPIKE_DEG = 60.0
REACH, FADE_TO = 0.003, 0.005
PASSES = 150
NEAR = 0.04  # only round her vulva
OVERLAYS = {"T_lingerie", "T_pubic"}
VULVA = {"T_vulva", "T_labia", "T_canal", "T_hole"}

body = bpy.data.objects["Female_Body"]
me = body.data
n = len(me.vertices)
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
if OUT is None:
    np.save(os.path.join(core.repo_root(), "ref", "_sculpt_work", "vulva", "before_despike.npy"), co)
names = [m.name if m else "" for m in me.materials]
me.calc_loop_triangles()
tris = np.empty(len(me.loop_triangles) * 3, np.int32)
me.loop_triangles.foreach_get("vertices", tris)
tris = tris.reshape(-1, 3)
tm = np.empty(len(me.loop_triangles), np.int32)
me.loop_triangles.foreach_get("material_index", tm)
tris = tris[~np.isin(tm, [i for i, nm in enumerate(names) if nm in OVERLAYS])]
edges = np.empty(len(me.edges) * 2, np.int32)
me.edges.foreach_get("vertices", edges)
edges = edges.reshape(-1, 2)

overlay = np.zeros(n, bool)
vulva = set()
for p in me.polygons:
    if names[p.material_index] in OVERLAYS:
        overlay[list(p.vertices)] = True
    if names[p.material_index] in VULVA:
        vulva.update(p.vertices)
centre = co[list(vulva)].mean(0)
near = (np.linalg.norm(co - centre, axis=1) < NEAR) & ~overlay
e = edges[near[edges[:, 0]] & near[edges[:, 1]]]


def normals(p):
    a, b, c = p[tris[:, 0]], p[tris[:, 1]], p[tris[:, 2]]
    fn = np.cross(b - a, c - a)
    vn = np.zeros_like(p)
    for k in range(3):
        np.add.at(vn, tris[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def neighbour_mean(values):
    s = np.zeros_like(values)
    np.add.at(s, e[:, 0], values[e[:, 1]])
    np.add.at(s, e[:, 1], values[e[:, 0]])
    deg = np.zeros(n)
    np.add.at(deg, e[:, 0], 1)
    np.add.at(deg, e[:, 1], 1)
    return s / np.maximum(deg, 1)[:, None], deg


nrm = normals(co)
mean_n, deg = neighbour_mean(nrm)
mean_n /= np.maximum(np.linalg.norm(mean_n, axis=1, keepdims=True), 1e-12)
turn = np.degrees(np.arccos(np.clip((nrm * mean_n).sum(1), -1, 1)))
spike = near & (deg > 0) & (turn > SPIKE_DEG)

# Everything within REACH of a spike, eased off by FADE_TO: the triangles there are a tenth of a millimetre across,
# so a few rings round a spike is nothing; the wrinkles run millimetres.
from mathutils.kdtree import KDTree  # noqa: E402
tree = KDTree(int(spike.sum()))
for k, v in enumerate(np.nonzero(spike)[0]):
    tree.insert(co[v], k)
tree.balance()
weight = np.zeros(n)
for v in np.nonzero(near)[0]:
    found = tree.find(co[v])
    if found[1] is not None and found[2] < FADE_TO:
        t = max(0.0, (found[2] - REACH) / (FADE_TO - REACH))
        weight[v] = 1 - t * t * (3 - 2 * t)

p = co.copy()
for _ in range(PASSES):
    avg, _ = neighbour_mean(p)
    p += (avg - p) * (0.5 * weight)[:, None]
shift = np.linalg.norm(p - co, axis=1)
turn_after = np.degrees(np.arccos(np.clip((normals(p) * (lambda m: m / np.maximum(np.linalg.norm(m, axis=1, keepdims=True), 1e-12))(neighbour_mean(normals(p))[0])).sum(1), -1, 1)))
print(f"vulva_despike: {int(spike.sum())} spikes, {int((weight > 0).sum())} points smoothed, most moved {shift.max() * 1000:.2f} mm;"
      f" spikes left {int((near & (deg > 0) & (turn_after > SPIKE_DEG)).sum())}")
print("vulva_despike: spikes at", np.round(co[spike].mean(0), 3).tolist() if spike.any() else None)
me.vertices.foreach_set("co", p.ravel())
me.update()
print("vulva_despike: saved", core.save_blend(OUT))
