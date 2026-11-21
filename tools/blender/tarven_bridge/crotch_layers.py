"""One skin at her crotch: the hidden skin under her vulva and anus pieces goes (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/crotch_layers.py -- [out.blend] [--map old_to_new.npy]

Her vulva piece (T_labia, T_vulva: the game's vulva grid) and anus piece (T_anus_skin, T_anus) were laid ON her skin
like stickers, and the skin (T_smalls) carried on underneath them as a second, hidden sheet. With different weights the
two layers pulled apart and crossed when her legs opened, which crumpled the skin between vulva and anus; the grid's
outer columns (its "wings" on her groin) stood off the skin as loose flaps.

  1. Hidden skin: a T_smalls face with a piece face straight above it (along its normal, within UNDER), facing the
     same way (so her inner thighs, facing the labia across a gap, are never taken).
  2. The wings (the grid's columns past WING[0] across, wholly by WING[1]: vulva.ts VULVA_COLUMNS) are laid onto the
     hidden skin under them, LIFT above it, and take its weights: they move with the skin they sit on. The lips
     themselves keep their raised shape and weights.
  3. The hidden skin is deleted. The pieces stay joined to the skin round them at their edges; nothing inside her (the
     canals, T_canal and T_hole) is touched.

--map writes each old point's index in the new mesh (-1 where removed), for the files that hold her points by index.
"""
import os
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MAP = argv[argv.index("--map") + 1] if "--map" in argv else None
rest = [a for i, a in enumerate(argv) if a != "--map" and (i == 0 or argv[i - 1] != "--map")]
OUT = rest[0] if rest else None

SKIN = {"T_smalls"}
VULVA = {"T_labia", "T_vulva"}
ANUS = {"T_anus_skin", "T_anus"}
UNDER = 0.03          # how far below a piece hidden skin can lie
FACING = 0.3          # normals at least this alike (dot)
WING = (0.37, 0.62)   # grid column (across, -1..1) where the wings start, and are wholly wings
LIFT = 0.0006
COLUMNS = [-1, -0.8, -0.62, -0.48, -0.37, -0.28, -0.2, -0.15, -0.11, -0.075, -0.045, -0.02, 0,
           0.02, 0.045, 0.075, 0.11, 0.15, 0.2, 0.28, 0.37, 0.48, 0.62, 0.8, 1]
CENTRE, REACH = np.array([0.0, 0.055, 0.905]), 0.12

t0 = time.time()
body = bpy.data.objects["Female_Body"]
me = body.data
names = [m.name if m else "" for m in me.materials]
n_old = len(me.vertices)
co = np.empty(n_old * 3)
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


def tris_of(faces):
    tris, owner = [], []
    for f in faces:
        vs = list(polys[f].vertices)
        for k in range(1, len(vs) - 1):
            tris.append((vs[0], vs[k], vs[k + 1]))
            owner.append(f)
    return tris, np.array(owner)


near = np.linalg.norm(fcent - CENTRE, axis=1) < REACH
pieces = np.nonzero(np.isin(fname, list(VULVA | ANUS)) & near)[0]
p_tris, p_owner = tris_of(pieces)
piece_tree = BVHTree.FromPolygons([Vector(p) for p in co], p_tris)

# ---------------------------------------------------------------- 1. the hidden skin
skin_faces = np.nonzero(np.isin(fname, list(SKIN)) & near)[0]
hidden = []
for f in skin_faces:
    n = Vector(fnorm[f])
    hit = piece_tree.ray_cast(Vector(fcent[f]) + n * 0.0002, n, UNDER)
    if hit[0] is not None and fnorm[p_owner[hit[2]]] @ fnorm[f] > FACING:
        hidden.append(f)
hidden = np.array(hidden)
print(f"crotch_layers: {len(hidden)} of {len(skin_faces)} skin faces round her crotch lie hidden under a piece")
h_tris, _ = tris_of(hidden)
hidden_tree = BVHTree.FromPolygons([Vector(p) for p in co], h_tris)

# ---------------------------------------------------------------- 2. the wings onto the skin under them
lv = np.empty(len(me.loops), np.int32)
me.loops.foreach_get("vertex_index", lv)
uv = np.empty(len(me.loops) * 2)
me.uv_layers["UVMap"].data.foreach_get("uv", uv)
uv = uv.reshape(-1, 2)
vulva_pts = sorted({v for f in np.nonzero(np.isin(fname, list(VULVA)))[0] for v in polys[f].vertices})
loop_vul = np.zeros(len(me.loops), bool)
for f in np.nonzero(np.isin(fname, list(VULVA)))[0]:
    loop_vul[polys[f].loop_start:polys[f].loop_start + polys[f].loop_total] = True
u_sum = np.zeros(n_old)
u_cnt = np.zeros(n_old)
np.add.at(u_sum, lv[loop_vul], uv[loop_vul, 0])
np.add.at(u_cnt, lv[loop_vul], 1)
across = np.interp(u_sum / np.maximum(u_cnt, 1) * (len(COLUMNS) - 1), np.arange(len(COLUMNS)), COLUMNS)
t = np.clip((np.abs(across) - WING[0]) / (WING[1] - WING[0]), 0, 1)
wing = (t * t * (3 - 2 * t)) * (u_cnt > 0)
vn = np.empty(n_old * 3)
me.vertices.foreach_get("normal", vn)
vn = vn.reshape(-1, 3)
gname = {g.index: g.name for g in body.vertex_groups}
moved = []
new_co = co.copy()
wing_weights = {}
for v in np.nonzero(wing > 0)[0]:
    loc, nrm, ti, dist = hidden_tree.find_nearest(Vector(co[v]), UNDER)
    if loc is None:
        continue
    tri = h_tris[ti]
    target = np.array(loc) + np.array(nrm) * LIFT * (1 if np.array(nrm) @ vn[v] >= 0 else -1)
    new_co[v] = co[v] + (target - co[v]) * wing[v]
    moved.append(np.linalg.norm(new_co[v] - co[v]))
    bary = poly_3d_calc([Vector(co[x]) for x in tri], loc)
    under = {}
    for x, b in zip(tri, bary):
        for g in me.vertices[x].groups:
            under[gname[g.group]] = under.get(gname[g.group], 0) + g.weight * b
    own = {gname[g.group]: g.weight for g in me.vertices[v].groups}
    mixed = {k: own.get(k, 0) * (1 - wing[v]) + under.get(k, 0) * wing[v] for k in set(own) | set(under)}
    wing_weights[int(v)] = mixed
me.vertices.foreach_set("co", new_co.ravel())
groups = {g.name: g for g in body.vertex_groups}
for v, ws in wing_weights.items():
    top = sorted(ws.items(), key=lambda kv: -kv[1])[:4]
    total = sum(x for _, x in top) or 1
    for g in [gname[g.group] for g in me.vertices[v].groups]:
        groups[g].remove([v])
    for g, x in top:
        if x > 1e-4:
            groups[g].add([v], x / total, "REPLACE")
print(f"crotch_layers: {len(moved)} wing points laid onto her skin, most {max(moved, default=0) * 1000:.1f} mm")

# ---------------------------------------------------------------- 3. the hidden skin goes
bm = bmesh.new()
bm.from_mesh(me)
tag = bm.verts.layers.int.new("_old_index")
for v in bm.verts:
    v[tag] = v.index + 1
bm.faces.ensure_lookup_table()
open_before = sum(1 for e in bm.edges if e.is_boundary)
bmesh.ops.delete(bm, geom=[bm.faces[f] for f in hidden], context="FACES")
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context="VERTS")
open_after = sum(1 for e in bm.edges if e.is_boundary)
bm.to_mesh(me)
bm.free()
me.update()
n_new = len(me.vertices)
tags = np.empty(n_new, np.int32)
me.attributes["_old_index"].data.foreach_get("value", tags)
me.attributes.remove(me.attributes["_old_index"])
old_to_new = np.full(n_old, -1, np.int64)
old_to_new[tags - 1] = np.arange(n_new)
print(f"crotch_layers: {n_old} -> {n_new} points; open edges {open_before} -> {open_after} ({time.time() - t0:.0f} s)")
if MAP:
    np.save(MAP, old_to_new)
    print("crotch_layers: map written", MAP)
print("crotch_layers: saved", core.save_blend(OUT))
