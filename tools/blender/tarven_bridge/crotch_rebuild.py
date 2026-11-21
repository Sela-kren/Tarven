"""Rebuilds the folded skin of her crotch as one clean, even sheet (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/crotch_rebuild.py -- [out.blend] [--map old_to_new.npy]

Her vulva and anus were joined onto her body with the skin round and between them (her smallclothes' skin, T_smalls)
folded over itself in layers: about 4 in 10 of its faces there had another sheet within 1.5 mm, and opening her legs
crumpled it. Brushes move every layer together, so it can't be sculpted clean. This replaces that patch:

  1. The patch: T_smalls faces round her crotch (REGION). The vulva and anus pieces themselves are left as they are:
     the game shapes them by their UV grids (vulva.ts readVulva, anus.ts readAnus), and the canals behind them.
  2. Its edges are kept point for point, so it joins exactly onto the skin, labia and anus skin round it.
  3. Seen round the left-right line through her pelvis (AXIS), the patch is flat; an even triangle mesh (STEP apart)
     is laid inside its edges (a constrained Delaunay triangulation) and eased even.
  4. Each new point goes onto the OUTERMOST skin along its line from that axis: the folded layers under it are never
     used.
  5. Materials, both UV maps, weights (then blurred across the new sheet), cup keys (_BUST_KEY_*) and _SKIN_DETAIL
     are interpolated from the old skin under each new point.

--map writes, for every point of the old mesh, its index in the new mesh (-1 where it was removed), for the files that
hold her points by index (her cup-key file, its as-made reference, the vulva sculpt file).
"""
import math
import os
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
MAP = argv[argv.index("--map") + 1] if "--map" in argv else None
rest = [a for i, a in enumerate(argv) if a != "--map" and (i == 0 or argv[i - 1] != "--map")]
OUT = rest[0] if rest else None

SKIN = "T_smalls"
REGION = {"x": 0.045, "y": (-0.005, 0.135), "z": 0.95}   # |x| below, y between, z below (centroids)
AXIS = (0.055, 0.965)              # (y, z) of the left-right line the patch is seen round
R0 = 0.06                           # angle -> length, about the patch's distance from the axis
STEP = 0.001                        # new triangles' size
EASE_PASSES = 30
BLUR_PASSES = 20

t0 = time.time()
body = bpy.data.objects["Female_Body"]
me = body.data
mats = [m.name if m else "" for m in me.materials]
skin_mat = mats.index(SKIN)
n_old = len(me.vertices)
co = np.empty(n_old * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)


def to2d(p):
    """(u, v): across her, and round the axis (as a length)."""
    p = np.atleast_2d(p)
    ang = np.arctan2(-(p[:, 2] - AXIS[1]), p[:, 1] - AXIS[0])  # 0 = straight forward, pi/2 = straight down
    return np.stack([p[:, 0], ang * R0], axis=1)


def ray_dir(v):
    ang = v / R0
    return np.stack([np.zeros_like(ang), np.cos(ang), -np.sin(ang)], axis=1)


# ---------------------------------------------------------------- the patch and its edges
polys = me.polygons
cent = np.array([co[list(p.vertices)].mean(0) for p in polys])
in_region = np.array([
    p.material_index == skin_mat and abs(c[0]) < REGION["x"] and REGION["y"][0] < c[1] < REGION["y"][1] and c[2] < REGION["z"]
    for p, c in zip(polys, cent)
])
# Skin tucked under her labia or anus pieces (seen from outside towards the axis, one of them is in front) stays:
# seen flat it lies under them, and no flat picture holds both. Skin hidden only by more of itself is a fold and goes.
all_tris, tri_face = [], []
for p in polys:
    if mats[p.material_index] in ("T_lingerie", "T_pubic"):
        continue
    vs = list(p.vertices)
    for k in range(1, len(vs) - 1):
        all_tris.append((vs[0], vs[k], vs[k + 1]))
        tri_face.append(p.index)
whole = BVHTree.FromPolygons([Vector(x) for x in co], all_tris)
tucked = 0
for f in np.nonzero(in_region)[0]:
    c = cent[f]
    ang = math.atan2(-(c[2] - AXIS[1]), c[1] - AXIS[0])
    d = Vector((0, math.cos(ang), -math.sin(ang)))
    start = Vector((c[0], AXIS[0], AXIS[1])) + d * 0.4
    hit = whole.ray_cast(start, -d, 0.6)
    if hit[0] is not None:
        front = polys[tri_face[hit[2]]].material_index
        if front != skin_mat:
            in_region[f] = False
            tucked += 1
# Only the largest connected piece (by shared edges).
faces_of_edge = {}
for f in np.nonzero(in_region)[0]:
    for k in polys[f].edge_keys:
        faces_of_edge.setdefault(k, []).append(f)
seen, best = set(), []
for f0 in np.nonzero(in_region)[0]:
    if f0 in seen:
        continue
    comp, stack = [], [f0]
    while stack:
        f = stack.pop()
        if f in seen:
            continue
        seen.add(f)
        comp.append(f)
        for k in polys[f].edge_keys:
            stack.extend(g for g in faces_of_edge[k] if g not in seen)
    if len(comp) > len(best):
        best = comp
in_region[:] = False
in_region[best] = True
print(f"crotch_rebuild: {tucked} faces left as tucked under her labia or anus")
patch = np.nonzero(in_region)[0]
edge_count = {}
for f in patch:
    for k in polys[f].edge_keys:
        edge_count[k] = edge_count.get(k, 0) + 1
used_by_others = set()
for p in polys:
    if not in_region[p.index]:
        used_by_others.update(p.vertices)
border_edges = [k for k, c in edge_count.items() if c == 1]
border_pts = sorted({v for k in border_edges for v in k})
inner_pts = sorted({v for f in patch for v in polys[f].vertices} - set(border_pts))
# A point inside the patch but also used outside it (a fold through its edge) would be torn: keep it as an edge too.
torn = [v for v in inner_pts if v in used_by_others]
print(f"crotch_rebuild: patch {len(patch)} faces, {len(inner_pts)} inner points, edge {len(border_edges)} edges; torn {len(torn)}")
assert not torn, "points inside the patch are used outside it"

# ---------------------------------------------------------------- the flat picture and the new triangles
bidx = {v: i for i, v in enumerate(border_pts)}
b2 = to2d(co[border_pts])
cons = [(bidx[a], bidx[b]) for a, b in border_edges]

# Where the folds reach its edge, the edge crosses itself seen flat. The edge's points stay where they are on her; only
# the flat picture the triangles are laid out on is untangled: each edge loop eased along itself until nothing crosses.
loop_nbrs = [[] for _ in range(len(border_pts))]
for a, b in cons:
    loop_nbrs[a].append(b)
    loop_nbrs[b].append(a)
print('crotch_rebuild: edge points by neighbours', {k: sum(1 for x in loop_nbrs if len(x) == k) for k in range(1, 7)})


def crossing_edges(p2):
    """The edges (as indices into cons) crossing another edge, seen flat."""
    A, B = p2[[a for a, _ in cons]], p2[[b for _, b in cons]]
    bad = set()
    lo_ = np.minimum(A, B)
    hi_ = np.maximum(A, B)
    for i in range(len(cons)):
        a0, b0 = A[i], B[i]
        near = np.nonzero((lo_[:, 0] <= max(a0[0], b0[0])) & (hi_[:, 0] >= min(a0[0], b0[0]))
                          & (lo_[:, 1] <= max(a0[1], b0[1])) & (hi_[:, 1] >= min(a0[1], b0[1])))[0]
        for k in near:
            if k <= i or len({cons[i][0], cons[i][1]} & {cons[k][0], cons[k][1]}):
                continue
            c0, d0 = A[k], B[k]
            den = (b0[0] - a0[0]) * (d0[1] - c0[1]) - (b0[1] - a0[1]) * (d0[0] - c0[0])
            if abs(den) < 1e-18:
                continue
            t = ((c0[0] - a0[0]) * (d0[1] - c0[1]) - (c0[1] - a0[1]) * (d0[0] - c0[0])) / den
            u = ((c0[0] - a0[0]) * (b0[1] - a0[1]) - (c0[1] - a0[1]) * (b0[0] - a0[0])) / den
            if 0 < t < 1 and 0 < u < 1:
                bad.update((i, k))
    return bad


def crossings(p2):
    return len(crossing_edges(p2)) // 2


ea_i = np.array([a for a, _ in cons] + [b for _, b in cons])
eb_i = np.array([b for _, b in cons] + [a for a, _ in cons])
deg_b = np.bincount(ea_i, minlength=len(b2))
eased = 0
for _ in range(500):
    bad = crossing_edges(b2)
    if not bad:
        break
    local = np.zeros(len(b2), bool)
    for e_ in bad:
        local[list(cons[e_])] = True
    for _ in range(4):  # and four points either way along the edge
        local[eb_i[local[ea_i]]] = True
    for _ in range(5):
        s_ = np.zeros_like(b2)
        np.add.at(s_, ea_i, b2[eb_i])
        b2 = np.where(local[:, None], b2 + 0.5 * (s_ / np.maximum(deg_b, 1)[:, None] - b2), b2)
    eased += 1
print(f"crotch_rebuild: edge untangled in {eased} local rounds, {crossings(b2)} crossings left")

# Grid points inside the edges (even-odd over every edge), not crowding the edges.
lo, hi = b2.min(0), b2.max(0)
xs = np.arange(lo[0], hi[0], STEP)
ys = np.arange(lo[1], hi[1], STEP * math.sqrt(3) / 2)
gx, gy = np.meshgrid(xs, ys)
gx = gx + (np.arange(len(ys))[:, None] % 2) * STEP / 2
cand = np.stack([gx.ravel(), gy.ravel()], axis=1)
ea = b2[[a for a, _ in cons]]
eb = b2[[b for _, b in cons]]


def inside(pts):
    x, y = pts[:, 0:1], pts[:, 1:2]
    cross = ((ea[None, :, 1] > y) != (eb[None, :, 1] > y)) & (
        x < (eb[None, :, 0] - ea[None, :, 0]) * (y - ea[None, :, 1]) / (eb[None, :, 1] - ea[None, :, 1] + 1e-15) + ea[None, :, 0])
    return cross.sum(1) % 2 == 1


def edge_distance(pts):
    d = eb - ea
    t = np.clip(((pts[:, None, :] - ea[None]) * d[None]).sum(2) / np.maximum((d * d).sum(1), 1e-15)[None], 0, 1)
    near = ea[None] + t[..., None] * d[None]
    return np.linalg.norm(pts[:, None, :] - near, axis=2).min(1)


keep = []
for chunk in range(0, len(cand), 2000):
    c = cand[chunk:chunk + 2000]
    ok = inside(c)
    ok[ok] &= edge_distance(c[ok]) > STEP * 0.6
    keep.append(c[ok])
interior2 = np.concatenate(keep)
all2 = np.concatenate([b2, interior2])
out = delaunay_2d_cdt([Vector(p) for p in all2], cons, [], 0, 1e-9)
verts2 = np.array([[v.x, v.y] for v in out[0]])
orig = out[3]
tris = [f for f in out[2] if len(f) == 3]
# Which output vertex is which input point; only triangles inside the edges stay.
which = np.full(len(verts2), -1)
for i, o in enumerate(orig):
    if o:
        which[i] = o[0]
added = np.nonzero(which < 0)[0]
merged = [o for o in orig if len(o) > 1]
# Edge points on one spot of the flat picture: the same spot on her too (doubled points) are welded after.
weld = []
for o in merged:
    pts3 = co[[border_pts[i] for i in o if i < len(border_pts)]]
    spread = np.linalg.norm(pts3 - pts3[0], axis=1).max() if len(pts3) > 1 else 0
    assert spread < 0.0002, f"edge points {o} share a spot flat but are {spread * 1000:.2f} mm apart on her"
    weld.append([border_pts[i] for i in o])
print(f"crotch_rebuild: triangulation added {len(added)} points (edges crossing), merged {len(merged)}")
# A point the triangulation added where two edges still cross is laid on her skin like the new points.
extra = [i for i in added]
for i in extra:
    which[i] = len(all2)
    all2 = np.concatenate([all2, verts2[i][None]])
tri_c = np.array([verts2[t].mean(0) for t in tris])
tris = [t for t, ok in zip(tris, inside(tri_c)) if ok]
print(f"crotch_rebuild: {len(interior2)} new points, {len(tris)} triangles ({time.time() - t0:.0f} s)")

# ---------------------------------------------------------------- even them out, then onto her outermost skin
nb = len(border_pts)
pos2 = all2.copy()
nbrs = [set() for _ in range(len(all2))]
for t in tris:
    a, b, c = (which[i] for i in t)
    nbrs[a].update((b, c)); nbrs[b].update((a, c)); nbrs[c].update((a, b))
for _ in range(EASE_PASSES):
    new = pos2.copy()
    for i in range(nb, len(all2)):
        if nbrs[i]:
            new[i] = pos2[i] + 0.5 * (pos2[list(nbrs[i])].mean(0) - pos2[i])
    pos2 = new

skin_tris = []
for p in polys:
    if p.material_index == skin_mat:
        vs = list(p.vertices)
        for k in range(1, len(vs) - 1):
            skin_tris.append((vs[0], vs[k], vs[k + 1]))
tree = BVHTree.FromPolygons([Vector(p) for p in co], skin_tris)
new3 = np.zeros((len(all2) - nb, 3))
miss = 0
for i in range(nb, len(all2)):
    u, v = pos2[i]
    d = ray_dir(np.array([v]))[0]
    origin = Vector((u, AXIS[0] + d[1] * 0.4, AXIS[1] + d[2] * 0.4))
    hit = tree.ray_cast(origin, Vector((0, -d[1], -d[2])), 0.6)
    if hit[0] is None:
        miss += 1
        loc, _, _, _ = tree.find_nearest(Vector((u, AXIS[0] + d[1] * R0, AXIS[1] + d[2] * R0)))
        new3[i - nb] = np.array(loc)
    else:
        new3[i - nb] = np.array(hit[0])
print(f"crotch_rebuild: onto her outer skin, {miss} missed ({time.time() - t0:.0f} s)")

# ---------------------------------------------------------------- what each new point takes from the old skin
old_tri = np.array(skin_tris)
interp = []  # (three old points, three weights) per new point
for p in new3:
    loc, _, ti, _ = tree.find_nearest(Vector(p))
    tri = old_tri[ti]
    interp.append((tri, np.array(poly_3d_calc([Vector(co[v]) for v in tri], loc))))

# ---------------------------------------------------------------- into the mesh
names = {g.index: g.name for g in body.vertex_groups}
old_w = {}
for k, _ in interp:
    for v in k:
        if v not in old_w:
            old_w[v] = {names[g.group]: g.weight for g in me.vertices[v].groups}
point_attrs = [a.name for a in me.attributes if a.domain == "POINT" and a.data_type == "FLOAT_VECTOR"
               and (a.name.startswith("_BUST_KEY_") or a.name == "_SKIN_DETAIL") and len(a.data) == n_old]
attr_old = {}
for name in point_attrs:
    d = np.empty(n_old * 3, np.float32)
    me.attributes[name].data.foreach_get("vector", d)
    attr_old[name] = d.reshape(-1, 3)
uv_old = {}
for layer in me.uv_layers:
    per_vert = np.zeros((n_old, 2))
    cnt = np.zeros(n_old)
    uvs = np.empty(len(me.loops) * 2)
    layer.data.foreach_get("uv", uvs)
    uvs = uvs.reshape(-1, 2)
    lv = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get("vertex_index", lv)
    lp = np.zeros(len(me.loops), bool)
    for p in polys:
        if p.material_index == skin_mat:
            lp[p.loop_start:p.loop_start + p.loop_total] = True
    np.add.at(per_vert, lv[lp], uvs[lp])
    np.add.at(cnt, lv[lp], 1)
    uv_old[layer.name] = per_vert / np.maximum(cnt, 1)[:, None]

bm = bmesh.new()
bm.from_mesh(me)
tag = bm.verts.layers.int.new("_old_index")
for v in bm.verts:
    v[tag] = v.index + 1
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.faces[f] for f in patch], context="FACES_ONLY")
bm.verts.ensure_lookup_table()
gone = [bm.verts[v] for v in inner_pts]
bmesh.ops.delete(bm, geom=gone, context="VERTS")
bm.verts.ensure_lookup_table()
by_old = {v[tag] - 1: v for v in bm.verts}
newv = []
for i, p in enumerate(new3):
    v = bm.verts.new(Vector(p))
    v[tag] = 0
    newv.append(v)
point_of = [by_old[border_pts[i]] for i in range(nb)] + newv
uvl = {layer.name: bm.loops.layers.uv[layer.name] for layer in me.uv_layers}
made = 0
flipped = 0
for t in tris:
    vs = [point_of[which[i]] for i in t]
    try:
        f = bm.faces.new(vs)
    except ValueError:
        continue
    f.material_index = skin_mat
    f.smooth = True
    made += 1
bm.faces.ensure_lookup_table()
bm.normal_update()
# Facing out like the skin they replace (away from her pelvis).
for f in bm.faces[-made:]:
    c = f.calc_center_median()
    out_dir = Vector((0, c.y - AXIS[0], c.z - AXIS[1]))
    if f.normal.dot(out_dir) < 0:
        f.normal_flip()
        flipped += 1
# UVs at each corner from the point it sits on.
new_index = {v: i for i, v in enumerate(newv)}
for f in bm.faces[-made:]:
    for loop in f.loops:
        v = loop.vert
        if v in new_index:
            tri, w = interp[new_index[v]]
            for name, layer in uvl.items():
                loop[layer].uv = tuple((uv_old[name][tri] * w[:, None]).sum(0))
        else:
            o = v[tag] - 1
            for name, layer in uvl.items():
                loop[layer].uv = tuple(uv_old[name][o])
if weld:
    targetmap = {}
    for group in weld:
        keep_v = by_old[group[0]]
        for o in group[1:]:
            if o in by_old and by_old[o] is not keep_v:
                targetmap[by_old[o]] = keep_v
    bmesh.ops.weld_verts(bm, targetmap=targetmap)
    print(f"crotch_rebuild: welded {len(targetmap)} doubled edge points")
bm.verts.index_update()
bm.to_mesh(me)
bm.free()
me.update()

n_new = len(me.vertices)
tags = np.empty(n_new, np.int32)
me.attributes["_old_index"].data.foreach_get("value", tags)
me.attributes.remove(me.attributes["_old_index"])
old_to_new = np.full(n_old, -1, np.int64)
old_to_new[tags[tags > 0] - 1] = np.nonzero(tags > 0)[0]
new_pts = np.nonzero(tags == 0)[0]
# the new points in the order they were made: by position
order = {tuple(np.round(p, 7)): i for i, p in enumerate(new3)}
ncoords = np.empty(n_new * 3)
me.vertices.foreach_get("co", ncoords)
ncoords = ncoords.reshape(-1, 3)
made_index = np.array([order[tuple(np.round(ncoords[v], 7))] for v in new_pts])

for name, old in attr_old.items():
    newa = np.zeros((n_new, 3), np.float32)
    kept = tags > 0
    newa[kept] = old[tags[kept] - 1]
    for v, mi in zip(new_pts, made_index):
        tri, w = interp[mi]
        newa[v] = (old[tri] * w[:, None]).sum(0)
    me.attributes[name].data.foreach_set("vector", newa.ravel())

# Weights: from the old skin under each new point, then blurred over the new sheet and its edge.
groups = {g.name: g for g in body.vertex_groups}
for v, mi in zip(new_pts, made_index):
    tri, w = interp[mi]
    acc = {}
    for ov, ow in zip(tri, w):
        for g, x in old_w[ov].items():
            acc[g] = acc.get(g, 0) + x * ow
    for g, x in acc.items():
        if x > 1e-4:
            groups[g].add([int(v)], float(x), "REPLACE")
sheet = set(new_pts.tolist()) | {int(old_to_new[b]) for b in border_pts}
adj = {v: set() for v in sheet}
for e in me.edges:
    a, b = e.vertices
    if a in adj and b in adj:
        adj[a].add(b); adj[b].add(a)
gnames = [g.name for g in body.vertex_groups]
W = {v: {gnames[g.group]: g.weight for g in me.vertices[v].groups} for v in sheet}
movable = set(new_pts.tolist())
for _ in range(BLUR_PASSES):
    nxt = {}
    for v in movable:
        if not adj[v]:
            continue
        acc = {}
        for u in adj[v]:
            for g, x in W[u].items():
                acc[g] = acc.get(g, 0) + x / len(adj[v])
        mixed = {g: 0.5 * W[v].get(g, 0) + 0.5 * acc.get(g, 0) for g in set(W[v]) | set(acc)}
        nxt[v] = mixed
    W.update(nxt)
for v in movable:
    ws = sorted(W[v].items(), key=lambda kv: -kv[1])[:4]
    total = sum(x for _, x in ws) or 1
    for g in [gnames[g.group] for g in me.vertices[v].groups]:
        groups[g].remove([int(v)])
    for g, x in ws:
        if x > 1e-4:
            groups[g].add([int(v)], x / total, "REPLACE")
me.update()

print(f"crotch_rebuild: {n_old} -> {n_new} points; patch {len(patch)} faces -> {made} triangles ({flipped} turned to face out)"
      f" in {time.time() - t0:.0f} s")
if MAP:
    np.save(MAP, old_to_new)
    print("crotch_rebuild: map written", MAP)
print("crotch_rebuild: saved", core.save_blend(OUT))
