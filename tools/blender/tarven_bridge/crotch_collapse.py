"""Presses the hidden skin layers round her crotch flat under her outer skin, so they move with it (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/crotch_collapse.py -- [out.blend]

Between her vulva and anus her skin lies in up to five sheets within a few millimetres (the vulva and anus pieces were
laid on her skin, and their joins left layers under them). Each sheet had its own weights, so with her legs apart the
inner ones poked out through the outer one as specks and tears. Deleting them opened holes (crotch_layers.py), so here
nothing is deleted or joined: every point that only touches hidden faces is moved to just under (INSET) the outer skin
over it and takes that skin's weights, so it moves exactly with it. The same points in the same order: the bust keys,
the vulva files and the game's vulva and anus grids are unaffected.

A face is hidden when, straight out along its normal within UNDER, there is another face of her facing the same way
(so the inner faces of her lips, which face each other, and her thighs, facing her lips, are never taken). The inside
of her (T_canal, T_hole) and the overlay shells are left alone. Backs the file up when saving over it.
"""
import os
import shutil
import sys
import time

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else None
UNDER = 0.012        # how far under another face a hidden face can lie
FACING = 0.3         # normals at least this alike (dot)
INSET = 0.0004       # hidden points sit this far under the outer skin
MOST = float(os.environ.get("CROTCH_MOST", 0.004))     # the skin over a point must be this close
ALIKE = float(os.environ.get("CROTCH_ALIKE", 0.8))    # and face this nearly the same way
MOVE_POINTS = os.environ.get("CROTCH_MOVE", "0") == "1"  # off: points stay, only their weights follow the skin over them
REACH = 0.075        # round the middle of her vulva and anus
SKIP = {"T_lingerie", "T_pubic", "T_canal", "T_hole"}
SKIN = {"T_smalls", "T_skin_f"}  # only her skin layers move; the vulva and anus pieces (the game reads them) never

t0 = time.time()
body = bpy.data.objects["Female_Body"]
me = body.data
names = [m.name if m else "" for m in me.materials]
n = len(me.vertices)
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
polys = me.polygons
fmat = np.empty(len(polys), np.int32)
polys.foreach_get("material_index", fmat)
fname = np.array(names)[fmat]
fnorm = np.empty(len(polys) * 3)
polys.foreach_get("normal", fnorm)
fnorm = fnorm.reshape(-1, 3)
fcent = np.empty(len(polys) * 3)
polys.foreach_get("center", fcent)
fcent = fcent.reshape(-1, 3)
loop_v = np.empty(len(me.loops), np.int32)
me.loops.foreach_get("vertex_index", loop_v)
lstart = np.empty(len(polys), np.int32)
polys.foreach_get("loop_start", lstart)
ltotal = np.empty(len(polys), np.int32)
polys.foreach_get("loop_total", ltotal)


def verts_of(f):
    return loop_v[lstart[f]:lstart[f] + ltotal[f]]


def pts_of(mats):
    fs = np.nonzero(np.isin(fname, list(mats)))[0]
    return np.unique(np.concatenate([verts_of(f) for f in fs]))


centre = (co[pts_of({"T_vulva", "T_labia"})].mean(0) + co[pts_of({"T_anus", "T_anus_skin"})].mean(0)) / 2
near = (np.linalg.norm(fcent - centre, axis=1) < REACH) & ~np.isin(fname, list(SKIP))
faces = np.nonzero(near)[0]


def tris_of(fs):
    tris, owner = [], []
    for f in fs:
        vs = verts_of(f)
        for k in range(1, len(vs) - 1):
            tris.append((int(vs[0]), int(vs[k]), int(vs[k + 1])))
            owner.append(f)
    return tris, np.array(owner)


tris, owner = tris_of(faces)
tree = BVHTree.FromPolygons([Vector(p) for p in co], tris)
hidden = np.zeros(len(polys), bool)
for f in faces:
    if fname[f] not in SKIN:
        continue
    nv = Vector(fnorm[f])
    hit = tree.ray_cast(Vector(fcent[f]) + nv * 0.00005, nv, UNDER)
    if hit[0] is not None and owner[hit[2]] != f and fnorm[owner[hit[2]]] @ fnorm[f] > FACING:
        hidden[f] = True
shown = faces[~hidden[faces]]
print(f"crotch_collapse: {int(hidden.sum())} of {len(faces)} faces round her crotch lie hidden under her skin")

# Points touching only hidden faces (and nothing outside the region, so the region's edge never moves).
touch_shown = np.zeros(n, bool)
touch_hidden = np.zeros(n, bool)
for f in range(len(polys)):
    vs = verts_of(f)
    if hidden[f]:
        touch_hidden[vs] = True
    elif fname[f] not in ("T_lingerie", "T_pubic"):
        touch_shown[vs] = True
movers = np.nonzero(touch_hidden & ~touch_shown)[0]

s_tris, s_owner = tris_of(shown)
s_tree = BVHTree.FromPolygons([Vector(p) for p in co], s_tris)
gname = {g.index: g.name for g in body.vertex_groups}
groups = {g.name: g for g in body.vertex_groups}
new_co = co.copy()
moved, skipped = [], 0
new_w = {}
vnorm = np.empty(n * 3)
me.vertices.foreach_get("normal", vnorm)
vnorm = vnorm.reshape(-1, 3)
for v in movers:
    # The skin straight over it (out along its normal), facing the same way: that is the skin it lies under.
    nv = Vector(vnorm[v])
    loc, nrm, ti, dist = s_tree.ray_cast(Vector(co[v]), nv, MOST)
    if loc is None or Vector(fnorm[s_owner[ti]]) @ nv < ALIKE:
        skipped += 1
        continue
    fn = Vector(fnorm[s_owner[ti]])
    if MOVE_POINTS:
        new_co[v] = np.array(loc - fn * INSET)
    moved.append(dist)
    tri = s_tris[ti]
    bary = poly_3d_calc([Vector(co[x]) for x in tri], loc)
    ws = {}
    for x, b in zip(tri, bary):
        for g in me.vertices[x].groups:
            ws[gname[g.group]] = ws.get(gname[g.group], 0) + g.weight * b
    new_w[int(v)] = ws
me.vertices.foreach_set("co", new_co.ravel())
for v, ws in new_w.items():
    top = sorted(ws.items(), key=lambda kv: -kv[1])[:4]
    total = sum(x for _, x in top) or 1
    for g in [gname[g.group] for g in me.vertices[v].groups]:
        groups[g].remove([v])
    for g, x in top:
        if x > 1e-4:
            groups[g].add([v], x / total, "REPLACE")
me.update()
moved = np.array(moved) if moved else np.zeros(1)
print(f"crotch_collapse: {len(new_w)} hidden points pressed under her skin (median {np.median(moved) * 1000:.1f} mm,"
      f" most {moved.max() * 1000:.1f} mm), {skipped} with no skin straight over them left as they were ({time.time() - t0:.0f} s)")

if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    stem = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
    shutil.copy2(bpy.data.filepath, os.path.join(backups, f"{stem}_{time.strftime('%Y%m%d_%H%M%S')}_before_crotch_collapse.blend"))
print("crotch_collapse: saved", core.save_blend(OUT))
