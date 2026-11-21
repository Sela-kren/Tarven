"""Presses the folded skin between her vulva and anus flat onto her outer skin there (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/perineum_press.py -- [out.blend]

Her perineum (between the bottom of her vulva and the front of her anus) was a knot: one sheet of tiny triangles
folded over itself in loops up to a centimetre deep, each fold with its own weights, so with her legs apart the folds
poked out as specks and tears. Cutting it out and refilling failed (the folds are too interleaved for a clean
outline: perineum_patch.py), so nothing is cut or joined here:

  1. Her outer skin there is what is seen from below: straight up from under her, the first surface facing down.
  2. Every point in the strip moves straight up or down onto it: the outermost stays on it, the folds go INSET under.
  3. Every point's weights become a smooth blur (by where it is, BLUR across) of the outer skin's weights round it,
     so folds pressed onto the same spot carry the same weights and can never come apart.

All of it fades out over FADE at the strip's edges. The vulva pieces (the game's vulva grid) and everything inside
her are not touched; the same points in the same order, so nothing that holds her points by index changes.
Backs the file up when saving over it.
"""
import os
import shutil
import sys
import time

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else None
env = lambda k, d: [float(v) for v in os.environ.get(k, d).split()]  # noqa: E731
X_HALF, = env("PRESS_X", "0.011")            # strip half-width (fades out over FADE beyond)
Y_RANGE = env("PRESS_Y", "0.020 0.050")      # back (anus) to front (vulva)
Z_RANGE = env("PRESS_Z", "0.893 0.94")       # her inner thighs' walls hang lower and are left alone
FADE, = env("PRESS_FADE", "0.003")
INSET, = env("PRESS_INSET", "0.0003")
BLUR, = env("PRESS_BLUR", "0.0025")          # weight blur (sigma)
ON = 0.00015                                 # a point this close to the outer skin is on it
DOWN = float(os.environ.get("PRESS_DOWN", 2))  # outer skin must face down at least this much (normal z); 2 = any: folds there face inwards
LEAVE = set(os.environ.get("PRESS_LEAVE", "T_lingerie T_pubic T_canal T_hole T_vulva T_anus").split())

t0 = time.time()
body = bpy.data.objects["Female_Body"]
me = body.data
names = [m.name if m else "" for m in me.materials]
n = len(me.vertices)
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
fmat = np.empty(len(me.polygons), np.int32)
me.polygons.foreach_get("material_index", fmat)
fname = np.array(names)[fmat]
loop_v = np.empty(len(me.loops), np.int32)
me.loops.foreach_get("vertex_index", loop_v)
lstart = np.empty(len(me.polygons), np.int32)
me.polygons.foreach_get("loop_start", lstart)
ltotal = np.empty(len(me.polygons), np.int32)
me.polygons.foreach_get("loop_total", ltotal)
face_of_loop = np.repeat(np.arange(len(me.polygons)), ltotal)

# Points it may move: on her skin (or the anus piece's outer skin), never on anything in LEAVE.
on_left = np.zeros(n, bool)
on_left[loop_v[np.isin(fname[face_of_loop], list(LEAVE))]] = True
used = np.zeros(n, bool)
used[loop_v] = True


def smooth01(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


x, y, z = co[:, 0], co[:, 1], co[:, 2]
fx = smooth01((X_HALF + FADE - np.abs(x)) / FADE)
fy = smooth01(np.minimum(y - (Y_RANGE[0] - FADE), (Y_RANGE[1] + FADE) - y) / FADE)
fz = ((z > Z_RANGE[0]) & (z < Z_RANGE[1])).astype(float)
fade = fx * fy * fz * used * ~on_left
movers = np.nonzero(fade > 0)[0]

# Her outer skin from below: every face round there but the overlays and her insides.
near = np.linalg.norm(co[loop_v] - [0, np.mean(Y_RANGE), np.mean(Z_RANGE)], axis=1) < 0.09
near_faces = np.unique(face_of_loop[near])
near_faces = near_faces[~np.isin(fname[near_faces], ["T_lingerie", "T_pubic", "T_canal", "T_hole"])]
tris = []
for f in near_faces:
    vs = loop_v[lstart[f]:lstart[f] + ltotal[f]]
    for k in range(1, len(vs) - 1):
        tris.append((int(vs[0]), int(vs[k]), int(vs[k + 1])))
tree = BVHTree.FromPolygons([Vector(p) for p in co], tris)
up = Vector((0, 0, 1))
target = co.copy()
outer = np.zeros(n, bool)
pressed = np.zeros(n, bool)
no_floor = 0
for v in movers:
    hit = tree.ray_cast(Vector((x[v], y[v], 0.80)), up, 0.3)
    if hit[0] is None or hit[1].z > DOWN:
        fade[v] = 0
        no_floor += 1
        continue
    surf = np.array(hit[0])
    if abs(z[v] - surf[2]) < ON:
        outer[v] = True
        target[v] = co[v]
    else:
        target[v] = surf + [0, 0, INSET]
        pressed[v] = True
new_co = co + (target - co) * fade[:, None]

# Weights: a blur, by where it is, of the outer skin's weights round the strip (the outer skin in it, and her skin
# just outside it, which keeps its own).
gname = [g.name for g in body.vertex_groups]
W = np.zeros((n, len(gname)))
for v in range(n):
    for g in me.vertices[v].groups:
        W[v, g.group] = g.weight
src = np.nonzero(used & ~np.isin(np.arange(n), np.nonzero(pressed)[0])
                 & (np.abs(x) < X_HALF + FADE + 3 * BLUR) & (y > Y_RANGE[0] - FADE - 3 * BLUR)
                 & (y < Y_RANGE[1] + FADE + 3 * BLUR) & (z > Z_RANGE[0] - 0.01) & (z < Z_RANGE[1]))[0]
# Only the outer skin within the strip is a source; outside it, all her skin (it is a single layer there).
src = src[(fade[src] == 0) | outer[src]]
kd = KDTree(len(src))
for k, v in enumerate(src):
    kd.insert((x[v], y[v], 0.0), k)
kd.balance()
newW = W.copy()
for v in np.nonzero(fade > 0)[0]:
    found = kd.find_range((x[v], y[v], 0.0), 3 * BLUR)
    if not found:
        continue
    idx = np.array([src[k] for _, k, _ in found])
    d = np.array([dd for _, _, dd in found])
    g = np.exp(-0.5 * (d / BLUR) ** 2)
    field = (W[idx] * g[:, None]).sum(0) / g.sum()
    newW[v] = W[v] * (1 - fade[v]) + field * fade[v]

me.vertices.foreach_set("co", new_co.ravel())
groups = body.vertex_groups
for v in np.nonzero(fade > 0)[0]:
    for g in [g.group for g in me.vertices[v].groups]:
        groups[g].remove([int(v)])
    top = np.argsort(-newW[v])[:4]
    top = top[newW[v, top] > 1e-4]
    total = newW[v, top].sum() or 1
    for gi in top:
        groups[int(gi)].add([int(v)], float(newW[v, gi] / total), "REPLACE")
me.update()
moved = np.linalg.norm(new_co - co, axis=1)
print(f"perineum_press: {int((fade > 0).sum())} points in the strip, {int(outer.sum())} on her outer skin, "
      f"{int(pressed.sum())} folds pressed under it (median {np.median(moved[pressed]) * 1000:.1f} mm, "
      f"most {moved.max() * 1000:.1f} mm), {no_floor} left with no outer skin under them ({time.time() - t0:.0f} s)")

if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    stem = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
    shutil.copy2(bpy.data.filepath, os.path.join(backups, f"{stem}_{time.strftime('%Y%m%d_%H%M%S')}_before_perineum_press.blend"))
print("perineum_press: saved", core.save_blend(OUT))
