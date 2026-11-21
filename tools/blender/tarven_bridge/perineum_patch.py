"""Rebuilds the crumpled skin between her vulva and anus as one smooth sheet (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/perineum_patch.py -- [out.blend]

The skin between the bottom of her vulva and the front of her anus (her perineum, about 3 cm by 2.5 cm) was a knot:
17 000 tenth-of-a-millimetre triangles folded over themselves in loops up to a centimetre deep, one continuous sheet
(no open or doubled edges), left where the vulva and anus pieces were stitched on. With her legs apart the folds
poked out as specks and tears. Deleting layers opened holes and reweighting them made slabs (crotch_layers.py,
crotch_collapse.py), so here the knot is cut out whole and the hole filled fresh:

  1. Her skin faces (T_smalls, T_skin_f) inside the ellipse CUT go; the vulva and anus pieces (the game reads them by
     UV) and everything inside her are never touched. The hole must have one outline.
  2. The outline is laid round a circle by its length (PATCH_MODE=disk; it is too crooked to lay flat on a plane)
     and filled evenly with about PATCH_POINTS points.
  3. Each new point's place, weights, UVs and point attributes are the smoothest fill (harmonic) of the outline's
     values. The fill sags out between her inner thighs, so what lies past the plane through the bottom of her vulva
     and the front of her anus is pulled back by PATCH_FLAT.
  4. The seam: the new skin, her skin and her vulva piece's bottom edge within PATCH_BAND of the outline are relaxed
     together, along with their weights.

The new points reuse the points the knot freed, so she keeps exactly as many points in the same order (the bust
keys, the vulva files and the game's grids hold her points by index); the freed points left over have no faces
(the export leaves them out) and sit inside the new skin. Backs the file up when saving over it.
"""
import os
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

sys.stdout.reconfigure(line_buffering=True)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else None
CUT = [float(v) for v in os.environ.get("PATCH_CUT", "0 0.034 0.015 0.014").split()]  # centre x, y; half-widths
Z_RANGE = tuple(float(v) for v in os.environ.get("PATCH_Z", "0.885 0.94").split())
SPACING = float(os.environ.get("PATCH_SPACING", 0.0009))
SKIN = {"T_smalls", "T_skin_f"}
OVERLAYS = {"T_lingerie", "T_pubic"}
BAND = False
ISLAND = 3000      # cut-off bits of skin smaller than this (faces) go with the knot


def fail(msg):
    print("perineum_patch: STOPPED,", msg)
    sys.exit(1)


t0 = time.time()
body = bpy.data.objects["Female_Body"]
me = body.data
names = [m.name if m else "" for m in me.materials]
skin_ids = {i for i, n in enumerate(names) if n in SKIN}
over_ids = {i for i, n in enumerate(names) if n in OVERLAYS}
n_pts = len(me.vertices)

bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
uv_layers = {u.name: bm.loops.layers.uv[u.name] for u in me.uv_layers}
deform = bm.verts.layers.deform.active


def inside(c):
    return ((c.x - CUT[0]) / CUT[2]) ** 2 + ((c.y - CUT[1]) / CUT[3]) ** 2 < 1 and Z_RANGE[0] < c.z < Z_RANGE[1]


cut = {f for f in bm.faces if f.material_index in skin_ids and inside(f.calc_center_median())}
TRANSFER = False

# Or the faces in a file (PATCH_FACES, e.g. picked inside an outline the user drew on a render). Those may take in
# the vulva and anus pieces' edges, but never a whole cell of their grids (vulva.ts readVulva, anus.ts readAnus need a
# point in every cell): a cell the cut would empty keeps its faces.
if os.environ.get("PATCH_FACES"):
    bm.faces.ensure_lookup_table()
    cut = {bm.faces[int(i)] for i in np.load(os.environ["PATCH_FACES"])}
    uvl = bm.loops.layers.uv["UVMap"]
    vul_ids = {i for i, nm in enumerate(names) if nm in ("T_labia", "T_vulva")}
    an_ids = {i for i, nm in enumerate(names) if nm in ("T_anus", "T_anus_skin")}

    def cells_of(f):
        out = set()
        for lp in f.loops:
            u, v = lp[uvl].uv
            if f.material_index in vul_ids:
                out.add(("v", min(24, max(0, round(u * 24))), min(48, max(0, round((1 - v) * 48)))))
            elif f.material_index in an_ids:
                ring = min(12, max(0, round(u * 12)))
                out.add(("a", ring, 0 if ring == 0 else round((1 - v) * 12) % 12))
        return out
    pieces = [f for f in bm.faces if f.material_index in vul_ids | an_ids]
    cells_before = set()
    for f in pieces:
        cells_before |= cells_of(f)
    TRANSFER = os.environ.get("PATCH_CELLS", "transfer") == "transfer"
    for _ in range(0 if TRANSFER else 20):
        have = set()
        for f in pieces:
            if f not in cut:
                have |= cells_of(f)
        lost = set()
        for f in cut:
            if f.material_index in vul_ids | an_ids:
                lost |= cells_of(f) - have
        if not lost:
            break
        back = {f for f in cut if cells_of(f) & lost}
        cut -= back
        print(f"perineum_patch: {len(lost)} grid cells would empty; {len(back)} of their faces kept")
    print(f"perineum_patch: cutting {len(cut)} faces from {os.path.basename(os.environ['PATCH_FACES'])}")


def real_faces(e):
    return [g for g in e.link_faces if g.material_index not in over_ids]


def open_adjacency(cut):
    edges = [e for e in {e for f in cut for e in f.edges}
             if sum(1 for g in real_faces(e) if g not in cut) == 1]
    adj = {}
    for e in edges:
        a, b = e.verts
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    return adj


def loops_of(adj):
    loops, seen = [], set()
    for s in adj:
        if s in seen:
            continue
        loop, prev, v = [s], None, s
        seen.add(s)
        while True:
            nxt = [w for w in adj[v] if w is not prev][0]
            if nxt is s or len(loop) > len(adj):
                break
            loop.append(nxt)
            seen.add(nxt)
            prev, v = v, nxt
        loops.append(loop)
    return loops


grow_ids = skin_ids | ({i for i, nm in enumerate(names) if nm in ("T_labia", "T_anus_skin")} if os.environ.get("PATCH_FACES") else set())
# The cut grows until it leaves one clean outline: where the outline pinches (a point with more than two open
# edges, the cut passing between folds of the knot) the skin faces at that point go too, and bits of skin the cut
# leaves cut off from the rest of her go with it.
for step in range(60):
    adj = open_adjacency(cut)
    pinch = [v for v in adj if len(adj[v]) != 2]
    if pinch:
        grow = {f for v in pinch for f in v.link_faces if f not in cut and f.material_index in grow_ids}
        if not grow:
            fail(f"the outline pinches at {len(pinch)} points of the vulva or anus pieces")
        cut |= grow
        continue
    loops = loops_of(adj)
    if len(loops) == 1:
        break
    for loop in sorted(loops, key=len)[:-1]:
        start = [f for f in loop[0].link_faces if f not in cut and f.material_index in grow_ids]
        comp, stack = set(), list(start)
        while stack and len(comp) <= ISLAND:
            f = stack.pop()
            if f in comp:
                continue
            comp.add(f)
            for e in f.edges:
                stack.extend(g for g in real_faces(e) if g not in cut and g not in comp and g.material_index in grow_ids)
        if len(comp) <= ISLAND:
            cut |= comp
        elif os.environ.get("PATCH_FACES") and len(loops_of(open_adjacency(cut))) == 2:
            # A second outline round a bit of a piece the cut encircled: the cut takes that bit's outer faces, ring by
            # ring, until the two outlines meet (never the anus's inner rings or the vulva's insides).
            uvl_ = bm.loops.layers.uv["UVMap"]
            added = 0
            for _grow in range(60):
                adj_ = open_adjacency(cut)
                pinch_ = [v for v in adj_ if len(adj_[v]) != 2]
                if pinch_:
                    cut |= {f for v in pinch_ for f in v.link_faces if f not in cut and f.material_index in grow_ids}
                    continue
                ls_ = loops_of(adj_)
                if len(ls_) < 2 or added > 4000:
                    break
                # the encircled bit's outline: the one with no skin round it, only a piece
                def skin_share(L):
                    fs_ = [f for v in L for f in v.link_faces if f not in cut]
                    return sum(f.material_index in skin_ids for f in fs_) / max(1, len(fs_))
                small = min(ls_, key=skin_share)
                add = set()
                for v in small:
                    for f in v.link_faces:
                        if f in cut or f.material_index not in grow_ids:
                            continue
                        if names[f.material_index] == "T_anus_skin" and min(round(lp[uvl_].uv[0] * 12) for lp in f.loops) < 8:
                            continue
                        add.add(f)
                if not add:
                    break
                cut |= add
                added += len(add)
                print(f"perineum_patch:   growing over the encircled bit: +{len(add)} faces, {len(ls_)} outlines")
            adj_ = open_adjacency(cut)
            if all(len(a) == 2 for a in adj_.values()) and len(loops_of(adj_)) == 2:
                BAND = True
            break
        else:
            import collections as _c
            for L in loops:
                P_ = np.array([tuple(v.co) for v in L])
                nb_ = _c.Counter(names[f.material_index] for v in L for f in v.link_faces if f not in cut)
                print("perineum_patch:   outline", len(L), "points round", P_.mean(0).round(4).tolist(), "span mm",
                      ((P_.max(0) - P_.min(0)) * 1000).round(1).tolist(), dict(nb_))
                if len(L) < 30:
                    for v in L[:3]:
                        print("perineum_patch:     point", v.index, [(names[f.material_index], f in cut) for f in v.link_faces],
                              "edges", [(len(e.link_faces), sum(1 for g in real_faces(e) if g not in cut)) for e in v.link_edges])
            fail(f"a {len(loop)}-point hole in the skin round the cut would stay open")
    if BAND:
        break
else:
    fail("the outline never came clean")
loops = loops_of(open_adjacency(cut))
if len(loops) != (2 if BAND else 1):
    fail(f"the hole has {len(loops)} outlines")
print(f"perineum_patch: the cut grew {step} times to a clean outline" + (" (a band: two outlines)" if BAND else ""))
if BAND:
    # Two outlines (the cut is a band): the second runs the same way round as the first, started where it lies
    # nearest, so the ring between them maps across without twisting.
    A_, B_ = sorted(loops, key=len, reverse=True)
    PA = np.array([tuple(v.co) for v in A_])
    PB = np.array([tuple(v.co) for v in B_])

    def arc(P):
        st = np.linalg.norm(np.roll(P, -1, 0) - P, axis=1)
        return np.concatenate([[0], np.cumsum(st)[:-1]]) / st.sum()

    def sample(P, t, q):
        return P[np.searchsorted(t, q, side="right") - 1]
    qs = np.linspace(0, 1, 96, endpoint=False)
    sa = sample(PA, arc(PA), qs)
    best = None
    for dirn in (1, -1):
        Bd = B_ if dirn == 1 else B_[::-1]
        Pd = PB if dirn == 1 else PB[::-1]
        for sh in range(0, len(Bd), max(1, len(Bd) // 96)):
            Ps = np.roll(Pd, -sh, 0)
            cost = np.linalg.norm(sa - sample(Ps, arc(Ps), qs), axis=1).mean()
            if best is None or cost < best[0]:
                best = (cost, dirn, sh)
    _, dirn, sh = best
    B_ = list(np.roll(np.array(B_ if dirn == 1 else B_[::-1], dtype=object), -sh))
    nA = len(A_)
    ring = list(A_) + list(B_)
else:
    ring = loops[0]
print(f"perineum_patch: {len(cut)} faces of the knot cut out; outline {len(ring)} points")

# What the outline's points carry: UVs from the cut faces' corners there (the faces being replaced).
ring_uv = {}
for name, layer in uv_layers.items():
    vals = np.zeros((len(ring), 2))
    for k, v in enumerate(ring):
        corners = [lp[layer].uv for lp in v.link_loops if lp.face in cut]
        vals[k] = np.mean([tuple(c) for c in corners], axis=0)
    ring_uv[name] = vals

# ---------------------------------------------------------------- the outline, flat
R = np.array([tuple(v.co) for v in ring])
origin = R.mean(0)
_, _, vt = np.linalg.svd(R - origin)
normal = vt[2] if vt[2][2] < 0 else -vt[2]      # out of her, downwards
e1 = np.cross([0, 1, 0], normal)
e1 /= np.linalg.norm(e1)
e2 = np.cross(normal, e1)
flat = np.stack([(R - origin) @ e1, (R - origin) @ e2], 1)
DISK = os.environ.get("PATCH_MODE", "disk") == "disk"
if DISK:
    # The outline round a circle by its length (a flat outline can't cross itself), the new points filled evenly
    # inside, and each new point's place the smoothest fill between the outline's (Tutte / Coons-style).
    step = np.linalg.norm(np.roll(R, -1, 0) - R, axis=1)
    along = np.concatenate([[0], np.cumsum(step)[:-1]]) / step.sum() * 2 * np.pi
    radius = step.sum() / (2 * np.pi)
    flat = radius * np.stack([np.cos(along), np.sin(along)], 1)
    # The outline zigzags, so its length overstates the hole: space the inside for about POINTS new points.
    SPACING = radius * np.sqrt(np.pi / (0.866 * float(os.environ.get("PATCH_POINTS", 1200))))
    if BAND:
        RA, RB = R[:nA], R[nA:]
        ta = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(RA, axis=0), axis=1))]); ta = ta / (ta[-1] + np.linalg.norm(RA[0] - RA[-1]))
        tb = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(RB, axis=0), axis=1))]); tb = tb / (tb[-1] + np.linalg.norm(RB[0] - RB[-1]))
        radius = (np.linalg.norm(np.diff(RA, axis=0), axis=1).sum()) / (2 * np.pi)
        inner = radius * 0.45
        flat = np.concatenate([radius * np.stack([np.cos(2 * np.pi * ta), np.sin(2 * np.pi * ta)], 1),
                               inner * np.stack([np.cos(2 * np.pi * tb), np.sin(2 * np.pi * tb)], 1)])
        SPACING = np.sqrt(np.pi * (radius ** 2 - inner ** 2) / (0.866 * float(os.environ.get("PATCH_POINTS", 1200))))
if os.environ.get("PATCH_DUMP"):
    np.savez(os.environ["PATCH_DUMP"], R=R, flat=flat, mats=np.array([";".join(sorted({names[f.material_index] for f in v.link_faces if f not in cut and f.material_index not in over_ids})) for v in ring]))


def crosses(p, q, r, s):
    d = lambda a, b, c: (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
    return d(p, q, r) * d(p, q, s) < 0 and d(r, s, p) * d(r, s, q) < 0


nr = len(ring)
seg = [(flat[k], flat[(k + 1) % nr]) for k in range(nr)]
for a in (range(0) if BAND else range(nr)):
    for b in range(a + 2, nr):
        if a == 0 and b == nr - 1:
            continue
        if crosses(*seg[a], *seg[b]):
            fail("the hole's outline crosses itself when laid flat")

# Even points inside, kept clear of the outline.
lo, hi = flat.min(0), flat.max(0)
gx, gy = np.meshgrid(np.arange(lo[0], hi[0], SPACING), np.arange(lo[1], hi[1], SPACING * np.sqrt(3) / 2))
gx = gx + (np.arange(gx.shape[0])[:, None] % 2) * SPACING / 2
grid = np.stack([gx.ravel(), gy.ravel()], 1)
# point-in-polygon (even-odd)
x, y = grid[:, 0], grid[:, 1]
inpoly = np.zeros(len(grid), bool)
for k in range(nr):
    (x1, y1), (x2, y2) = seg[k]
    hit = ((y1 > y) != (y2 > y)) & (x < (x2 - x1) * (y - y1) / ((y2 - y1) + 1e-30) + x1)
    inpoly ^= hit
grid = grid[inpoly] if not BAND else grid[(np.linalg.norm(grid, axis=1) < radius - SPACING * 0.6)
                                         & (np.linalg.norm(grid, axis=1) > inner + SPACING * 0.6)]
# distance to the outline
a, b = flat, np.roll(flat, -1, 0)
ab = b - a
tt = np.clip(((grid[:, None, :] - a[None]) * ab[None]).sum(2) / np.maximum((ab ** 2).sum(1), 1e-30)[None], 0, 1)
dist = np.linalg.norm(grid[:, None, :] - (a[None] + tt[..., None] * ab[None]), axis=2).min(1)
if not BAND:
    grid = grid[dist > SPACING * 0.6]

pts2 = np.concatenate([flat, grid])
if BAND:
    nB = nr - nA
    ed_ = [(k, (k + 1) % nA) for k in range(nA)] + [(nA + k, nA + (k + 1) % nB) for k in range(nB)]
    out = delaunay_2d_cdt([Vector(p) for p in pts2], ed_, [], 0, 1e-9, True)
    vcoords, _, tris, orig_v = out[0], out[1], out[2], out[3]
    tris = [t for t in tris if np.linalg.norm(np.mean([tuple(vcoords[i]) for i in t], axis=0)) > inner]
else:
    out = delaunay_2d_cdt([Vector(p) for p in pts2], [(k, (k + 1) % nr) for k in range(nr)], [list(range(nr))], 1, 1e-9, True)
    vcoords, _, tris, orig_v = out[0], out[1], out[2], out[3]
if len(vcoords) != len(pts2):
    fail(f"the fill added {len(vcoords) - len(pts2)} points of its own")
to_in = [ov[0] for ov in orig_v]           # output index -> input index
tris = [[to_in[i] for i in t] for t in tris]
ni = len(grid)
print(f"perineum_patch: filled with {ni} new points, {len(tris)} triangles")

# ---------------------------------------------------------------- smoothest fill of the outline's values
nb = nr
adj = [set() for _ in range(nb + ni)]
for t in tris:
    for i in range(3):
        for j in range(3):
            if i != j:
                adj[t[i]].add(t[j])
rows = np.array([i for i in range(nb, nb + ni) for j in adj[i]])
cols = np.array([j for i in range(nb, nb + ni) for j in adj[i]])
deg = np.array([len(adj[i]) for i in range(nb, nb + ni)], float)


def harmonic(ring_vals):
    """Interior values with each the average of its neighbours, the outline held (conjugate gradients)."""
    ring_vals = np.asarray(ring_vals, float).reshape(nb, -1)
    k = ring_vals.shape[1]
    # A x = b: deg_i x_i - sum_{j interior} x_j = sum_{j ring} v_j
    b = np.zeros((ni, k))
    m = cols < nb
    np.add.at(b, rows[m] - nb, ring_vals[cols[m]])
    mi = ~m

    def A(x):
        y = deg[:, None] * x
        np.subtract.at(y, rows[mi] - nb, x[cols[mi] - nb])
        return y
    x = np.repeat(ring_vals.mean(0, keepdims=True), ni, 0)
    r = b - A(x)
    p = r.copy()
    rs = (r * r).sum(0)
    for _ in range(4000):
        Ap = A(p)
        alpha = rs / np.maximum((p * Ap).sum(0), 1e-300)
        x += alpha * p
        r -= alpha * Ap
        rs_new = (r * r).sum(0)
        if np.sqrt(rs_new.max()) < 1e-12:
            break
        p = r + (rs_new / np.maximum(rs, 1e-300)) * p
        rs = rs_new
    return x


if DISK:
    new_co = harmonic(R)
    height = np.zeros(1)
    # The fill sags out between her legs (it spans down her inner thighs' walls). Pull what lies out past the plane
    # through the bottom of her vulva and the front of her anus (the outline's points on those pieces) back towards
    # it by FLAT, fully in the middle and easing off to the outline.
    FLAT = float(os.environ.get("PATCH_FLAT", 0.8))
    on_piece = np.array([any(f.material_index not in skin_ids and f.material_index not in over_ids and f not in cut
                             for f in v.link_faces) for v in ring])
    if FLAT > 0 and on_piece.sum() >= 3:
        Q = R[on_piece]
        q0 = Q.mean(0)
        _, _, qv = np.linalg.svd(Q - q0)
        qn = qv[2] if qv[2][2] < 0 else -qv[2]          # out of her, downwards
        out_by = (new_co - q0) @ qn
        r = np.linalg.norm(grid, axis=1) / radius
        ease = np.clip(1 - r * r, 0, 1)
        if BAND:
            mid = (np.linalg.norm(grid, axis=1) - inner) / (radius - inner)
            ease = np.clip(1 - (2 * mid - 1) ** 2, 0, 1)
        new_co -= (np.maximum(out_by, 0) * FLAT * ease)[:, None] * qn
        print(f"perineum_patch: flattened the sag, most {np.max(np.maximum(out_by, 0) * FLAT * ease) * 1000:.1f} mm")
    # The fill spans straight across from one inner thigh to the other like a web. WRAP lays it back up onto the old
    # surface it replaces (the first of it straight up into her from each new point: her strip in the middle, her
    # thighs' walls rising at the sides); the seam relax then smooths out the old surface's crumples.
    # SHRINK (the tutorials' grid fill + Shrinkwrap): the new skin is laid onto her old surface (her form as it was,
    # the V of her thighs into a narrow ridge) and smoothed, a few times over. Each new point goes in along its own
    # outward direction to the first old surface facing out the same way (so her folds inside, and her other thigh
    # across the gap, which faces the other way, are passed by), then the new skin is evened out.
    SHRINK = int(os.environ.get("PATCH_SHRINK", 0))
    if SHRINK > 0:
        from mathutils.bvhtree import BVHTree
        bm.verts.index_update()
        skip_ids = {i for i, nm in enumerate(names) if nm in ("T_lingerie", "T_pubic", "T_canal", "T_hole")}
        mid_ = R.mean(0)
        old_tris = []
        for f in bm.faces:
            if f.material_index in skip_ids:
                continue
            if f not in cut and (Vector(mid_) - f.calc_center_median()).length > 0.05:
                continue
            vs = [v.index for v in f.verts]
            for k in range(1, len(vs) - 1):
                old_tris.append((vs[0], vs[k], vs[k + 1]))
        oldsurf = BVHTree.FromPolygons([tuple(v.co) for v in bm.verts], old_tris)
        # which way the new triangles face: as the kept skin on the outline does
        vote_ = 0
        for t in tris:
            for i in range(3):
                a_, b_ = t[i], t[(i + 1) % 3]
                if a_ < nr and b_ < nr:
                    e_ = bm.edges.get((ring[a_], ring[b_]))
                    if e_ is None:
                        continue
                    for g in e_.link_faces:
                        if g in cut:
                            continue
                        lp = [l for l in g.loops if l.vert is ring[a_]][0]
                        vote_ += 1 if lp.link_loop_next.vert is ring[b_] else -1
        sign_ = -1.0 if vote_ > 0 else 1.0
        T_ = np.array(tris)
        nbrs = [set() for _ in range(nr + ni)]
        for t in tris:
            for i in range(3):
                nbrs[t[i]].update((t[(i + 1) % 3], t[(i + 2) % 3]))
        nb_i = [np.array(sorted(nbrs[nr + k])) for k in range(ni)]
        SH_OUT = float(os.environ.get("PATCH_SHRINK_OUT", 0.006))
        moved_ = 0
        for rnd in range(SHRINK):
            P_ = np.concatenate([R, new_co])
            fn_ = np.cross(P_[T_[:, 1]] - P_[T_[:, 0]], P_[T_[:, 2]] - P_[T_[:, 0]]) * sign_
            vn_ = np.zeros_like(P_)
            for j in range(3):
                np.add.at(vn_, T_[:, j], fn_)
            vn_ /= np.maximum(np.linalg.norm(vn_, axis=1, keepdims=True), 1e-12)
            hits_ = 0
            for k in range(ni):
                n_ = Vector(vn_[nr + k])
                start = Vector(new_co[k]) + n_ * SH_OUT
                travelled = 0.0
                while travelled < 2.5 * SH_OUT + 0.01:
                    h = oldsurf.ray_cast(start, -n_, 2.5 * SH_OUT + 0.01 - travelled)
                    if h[0] is None:
                        break
                    if h[1] @ n_ > 0.2:
                        new_co[k] = np.array(h[0])
                        hits_ += 1
                        break
                    travelled += (h[0] - start).length + 1e-5
                    start = h[0] - n_ * 1e-5
            moved_ = hits_
            # even it out (the outline holds)
            for _ in range(int(os.environ.get("PATCH_SHRINK_SMOOTH", 6))):
                P_ = np.concatenate([R, new_co])
                avg = np.array([P_[nb].mean(0) for nb in nb_i])
                new_co += (avg - new_co) * 0.5
        print(f"perineum_patch: new skin laid onto her old form {SHRINK} times ({moved_} of {ni} points found it last time)")
        # SINK: her old form's outermost layer ran straight under her vulva, so from the front the new skin read as a
        # shelf between her thighs. It goes in (along its inward direction) by up to SINK in the middle, none at the
        # outline, so it tucks back behind the bottom of her vulva as her skin did before.
        SINK = float(os.environ.get("PATCH_SINK", 0))
        if SINK > 0:
            P_ = np.concatenate([R, new_co])
            fn_ = np.cross(P_[T_[:, 1]] - P_[T_[:, 0]], P_[T_[:, 2]] - P_[T_[:, 0]]) * sign_
            vn_ = np.zeros_like(P_)
            for j in range(3):
                np.add.at(vn_, T_[:, j], fn_)
            vn_ /= np.maximum(np.linalg.norm(vn_, axis=1, keepdims=True), 1e-12)
            # how far in from the outline, along the new skin (rings of neighbours), 0..1
            depth = np.full(nr + ni, np.inf)
            depth[:nr] = 0
            frontier = list(range(nr))
            while frontier:
                nxt = []
                for a_ in frontier:
                    for b_ in nbrs[a_]:
                        if depth[b_] == np.inf:
                            depth[b_] = depth[a_] + 1
                            nxt.append(b_)
                frontier = nxt
            dd = depth[nr:] / max(1.0, np.nanmax(depth[np.isfinite(depth)]))
            ease_s = np.sin(np.clip(dd, 0, 1) * np.pi / 2) ** 2
            new_co -= vn_[nr:] * (SINK * ease_s)[:, None]
            for _ in range(int(os.environ.get("PATCH_SHRINK_SMOOTH", 6))):
                P_ = np.concatenate([R, new_co])
                avg = np.array([P_[nb].mean(0) for nb in nb_i])
                new_co += (avg - new_co) * 0.5
            print(f"perineum_patch: new skin sunk in by up to {SINK * 1000:.1f} mm")
    WRAP = float(os.environ.get("PATCH_WRAP", 0))
    if WRAP > 0:
        from mathutils.bvhtree import BVHTree
        old = [tuple(v.co) for v in bm.verts]
        old_tris = []
        for f in cut:
            vs = [v.index for v in f.verts]
            for k in range(1, len(vs) - 1):
                old_tris.append((vs[0], vs[k], vs[k + 1]))
        bm.verts.index_update()
        knot = BVHTree.FromPolygons(old, old_tris)
        r = np.linalg.norm(grid, axis=1) / radius
        ease = np.clip(1 - r * r, 0, 1) ** 0.5
        hits = 0
        for k in range(ni):
            h = knot.ray_cast(Vector(new_co[k]) - Vector((0, 0, 0.002)), Vector((0, 0, 1)), 0.03)
            if h[0] is not None:
                new_co[k] += (np.array(h[0]) - new_co[k]) * WRAP * ease[k]
                hits += 1
        print(f"perineum_patch: {hits} of {ni} new points laid back onto the old surface")
else:
    height = harmonic((R - origin) @ normal)[:, 0]
    new_co = origin + grid[:, :1] * e1 + grid[:, 1:] * e2 + height[:, None] * normal

gname = [g.name for g in body.vertex_groups]
ring_w = np.zeros((nb, len(gname)))
for k, v in enumerate(ring):
    for gi, w in v[deform].items():
        ring_w[k, gi] = w
new_w = np.clip(harmonic(ring_w), 0, 1)

# ---------------------------------------------------------------- into her mesh, reusing the freed points
cut_list = list(cut)
# The pieces' faces being cut: where they were, so the new faces there can take their material and grid cells over.
old_piece = []
kd_skin = None
if os.environ.get("PATCH_FACES") and TRANSFER:
    from mathutils.kdtree import KDTree as _KDS
    sk = [f for f in cut_list if f.material_index in skin_ids]
    kd_skin = _KDS(max(1, len(sk)))
    for k, f in enumerate(sk):
        kd_skin.insert(f.calc_center_median(), k)
    kd_skin.balance()
    for f in cut_list:
        if f.material_index in vul_ids | an_ids:
            old_piece.append((f.material_index, np.array(tuple(f.calc_center_median())),
                              [(np.array(tuple(lp.vert.co)), {nm: tuple(lp[ly].uv) for nm, ly in uv_layers.items()})
                               for lp in f.loops]))
bmesh.ops.delete(bm, geom=cut_list, context="FACES_ONLY")
for e in [e for e in bm.edges if not e.link_faces]:
    bm.edges.remove(e)
ring_set = set(ring)
freed = [v for v in bm.verts if not v.link_faces and v not in ring_set]
if len(freed) < ni:
    fail(f"only {len(freed)} freed points for {ni} new ones")
# The freed points are reused in their own order (lowest index first), so a rerun is the same.
freed.sort(key=lambda v: v.index)
use = freed[:ni]
all_v = list(ring) + use
for k, v in enumerate(use):
    v.co = Vector(new_co[k])
    v[deform].clear()
    for gi in np.nonzero(new_w[k] > 1e-4)[0]:
        v[deform][int(gi)] = float(new_w[k, gi])
# Leftover freed points: no faces, inside the new skin (on the nearest new point, just under it).
spare = freed[ni:]
if spare:
    from mathutils.kdtree import KDTree
    kd = KDTree(ni)
    for k in range(ni):
        kd.insert(new_co[k], k)
    kd.balance()
    for v in spare:
        _, k, _ = kd.find(v.co)
        v.co = Vector(new_co[k] - normal * 0.002)
mat = names.index("T_smalls")
uv_fill = {name: np.concatenate([ring_uv[name], harmonic(ring_uv[name])]) for name in uv_layers}
made = 0
flips = 0
new_faces = []
# Which way round the new triangles go: one choice for all (so none faces against its neighbours), the one that
# runs each outline edge opposite to the kept face already on it.
vote = 0
ring_pos = {v: k for k, v in enumerate(ring)}
for t in tris[:4000]:
    for i in range(3):
        a_, b_ = t[i], t[(i + 1) % 3]
        if a_ < nr and b_ < nr:
            va, vb = all_v[a_], all_v[b_]
            e_ = bm.edges.get((va, vb))
            if e_ is None:
                continue
            for g in e_.link_faces:
                lp = [l for l in g.loops if l.vert is va][0]
                vote += 1 if lp.link_loop_next.vert is vb else -1   # kept face runs a->b, so ours must run b->a
FLIP_ALL = vote > 0
print(f"perineum_patch: winding vote {vote} -> {'flipped' if FLIP_ALL else 'as laid out'}")
for t in tris:
    if FLIP_ALL:
        t = [t[0], t[2], t[1]]
        flips += 1
    vs = [all_v[i] for i in t]
    try:
        f = bm.faces.new(vs)
    except ValueError:
        continue
    f.material_index = mat
    f.smooth = True
    for lp, i in zip(f.loops, t):
        for name, layer in uv_layers.items():
            lp[layer].uv = tuple(uv_fill[name][i])
    made += 1
    new_faces.append(f)
if made != len(tris):
    fail(f"only {made} of {len(tris)} new faces could be made")
if old_piece:
    # Each new face over where a piece face was cut takes that piece's material, and each of its corners the grid
    # place (UVs) of the nearest cut corner of that piece: the grids keep every cell, now lying on the new skin.
    from mathutils.kdtree import KDTree as _KDT
    allc = np.array([c for _, c, _ in old_piece])
    kd_all = _KDT(len(old_piece))
    for k, c in enumerate(allc):
        kd_all.insert(c, k)
    kd_all.balance()
    # the skin's cut faces too, so a new face takes a piece only where a piece was nearest
    corner_kd = {}
    corner_uv = {}
    for m_ in {m_ for m_, _, _ in old_piece}:
        cs = [(pos, uv) for m2, _, corners in old_piece if m2 == m_ for pos, uv in corners]
        kdm = _KDT(len(cs))
        for k, (pos, _) in enumerate(cs):
            kdm.insert(pos, k)
        kdm.balance()
        corner_kd[m_] = kdm
        corner_uv[m_] = [uv for _, uv in cs]
    took = 0
    for f in new_faces:
        c = np.array(tuple(f.calc_center_median()))
        _, k, d_piece = kd_all.find(c)
        _, _, d_skin = kd_skin.find(c) if kd_skin else (None, None, 1e9)
        if d_piece > d_skin:
            continue
        m_ = old_piece[k][0]
        f.material_index = m_
        for lp in f.loops:
            _, j, _ = corner_kd[m_].find(lp.vert.co)
            for nm, ly in uv_layers.items():
                lp[ly].uv = corner_uv[m_][j][nm]
        took += 1
    print(f"perineum_patch: {took} new faces took over the vulva and anus pieces' grid places")
    # Every cell the cut faces held must still be held: a cell no corner holds now goes to the new face nearest where
    # it was (that face takes the piece's material if it hadn't), on the corner nearest it.
    have = set()                      # held by the pieces' own faces that stay (not the new faces)
    new_set = set(new_faces)
    for f in bm.faces:
        if f.material_index in vul_ids | an_ids and f not in cut and f not in new_set:
            have |= cells_of(f)
    want = {}
    for m_, c_, corners in old_piece:
        for pos, uv in corners:
            u, v = uv["UVMap"]
            if m_ in vul_ids:
                cell = ("v", min(24, max(0, round(u * 24))), min(48, max(0, round((1 - v) * 48))))
            else:
                ring_ = min(12, max(0, round(u * 12)))
                cell = ("a", ring_, 0 if ring_ == 0 else round((1 - v) * 12) % 12)
            want.setdefault(cell, (m_, pos, uv))
    kd_new = _KDT(len(new_faces))
    for k, f in enumerate(new_faces):
        kd_new.insert(f.calc_center_median(), k)
    kd_new.balance()
    given = 0

    def cell_of_loop(f, lp):
        u, v = lp[uvl].uv
        if f.material_index in vul_ids:
            return ("v", min(24, max(0, round(u * 24))), min(48, max(0, round((1 - v) * 48))))
        if f.material_index in an_ids:
            ring_ = min(12, max(0, round(u * 12)))
            return ("a", ring_, 0 if ring_ == 0 else round((1 - v) * 12) % 12)
        return None
    for _round in range(12):
        # who holds what now; a corner that is a cell's only holder is never overwritten
        holders = {}
        for k, f in enumerate(new_faces):
            for i, lp in enumerate(f.loops):
                c_ = cell_of_loop(f, lp)
                if c_ is not None:
                    holders.setdefault(c_, []).append((k, i))
        locked = {hs[0] for c_, hs in holders.items() if len(hs) == 1 and c_ not in have}
        missing_now = sorted(set(want) - have - set(holders))
        if not missing_now:
            break
        for cell in missing_now:
            m_, pos, uv = want[cell]
            for _, k, _ in kd_new.find_n(pos, 600):
                f = new_faces[k]
                free_l = [i for i in range(len(f.loops)) if (k, i) not in locked]
                if not free_l:
                    continue
                if f.material_index != m_:
                    if f.material_index not in skin_ids or len(free_l) < len(f.loops):
                        continue            # only plain new skin changes material
                    f.material_index = m_
                    for lp in f.loops:
                        _, j, _ = corner_kd[m_].find(lp.vert.co)
                        for nm, ly in uv_layers.items():
                            lp[ly].uv = corner_uv[m_][j][nm]
                i = min(free_l, key=lambda i: (f.loops[i].vert.co - Vector(pos)).length)
                for nm, ly in uv_layers.items():
                    f.loops[i][ly].uv = uv[nm]
                locked.add((k, i))
                given += 1
                break
            else:
                print(f"perineum_patch:   no new face could take cell {cell}")
    print(f"perineum_patch: {given} grid cells handed to the new faces nearest where they were ({_round + 1} rounds)")
    have_end = set()
    for f in bm.faces:
        if f.material_index in vul_ids | an_ids and f not in cut:
            have_end |= cells_of(f)
    print(f"perineum_patch:   cells wanted {len(want)}, missing in the mesh now {len(set(want) - have_end)}, "
          f"missing that were held before but not by a cut face {len(cells_before - have_end - set(want))}")
    if os.environ.get("PATCH_DEBUG"):
        probe = ("v", 0, 0)
        print("perineum_patch: DEBUG", probe, "in want", probe in want, "in cells_before", probe in cells_before,
              "kept faces with it", sum(1 for f in bm.faces if f.material_index in vul_ids | an_ids and f not in cut and probe in cells_of(f)),
              "new faces with it", sum(1 for f in new_faces if probe in cells_of(f)),
              "cut faces with it", sum(1 for f in cut if f.is_valid and probe in cells_of(f)))

if os.environ.get("PATCH_FACES"):
    pre = set()
    for f in bm.faces:
        if f.is_valid and f.material_index in vul_ids | an_ids:
            pre |= cells_of(f)
    print(f"perineum_patch:   cells held by the faces just before saving: {len(pre)}; missing {sorted(cells_before - pre)[:8]}")
bm.verts.index_update()
ring_idx = np.array([v.index for v in ring])
use_idx = np.array([v.index for v in use])
bm.to_mesh(me)
bm.free()
me.update()
if os.environ.get("PATCH_FACES"):
    uvv = np.empty(len(me.loops) * 2)
    me.uv_layers["UVMap"].data.foreach_get("uv", uvv)
    uvv = uvv.reshape(-1, 2)
    cells_after = set()
    for poly in me.polygons:
        nm = names[poly.material_index]
        for li in range(poly.loop_start, poly.loop_start + poly.loop_total):
            u, v = uvv[li]
            if nm in ("T_labia", "T_vulva"):
                cells_after.add(("v", min(24, max(0, round(u * 24))), min(48, max(0, round((1 - v) * 48)))))
            elif nm in ("T_anus", "T_anus_skin"):
                ring = min(12, max(0, round(u * 12)))
                cells_after.add(("a", ring, 0 if ring == 0 else round((1 - v) * 12) % 12))
    missing = cells_before - cells_after
    print(f"perineum_patch: grid cells {len(cells_before)} before, {len(missing)} missing after")
    if missing:
        fail(f"{len(missing)} vulva/anus grid cells lost, e.g. {sorted(missing)[:5]}")
if len(me.vertices) != n_pts:
    fail("the point count changed")

# Point attributes of the reused points: the smoothest fill of the outline's.
for attr in me.attributes:
    if attr.domain != "POINT" or attr.data_type != "FLOAT_VECTOR" or attr.name == "position":
        continue
    vals = np.empty(n_pts * 3, np.float32)
    attr.data.foreach_get("vector", vals)
    vals = vals.reshape(-1, 3)
    vals[use_idx] = harmonic(vals[ring_idx])
    attr.data.foreach_set("vector", vals.ravel())
me.update()
# The join: her vulva, the new skin and her anus as one smooth surface. The new skin, the anus piece's outer skin in
# front of her anus (outside its rim, ring JOIN_RING and up: it was squeezed into a centimetre and crumpled, so its edge
# stood up as a rim) and the vulva piece's bottom edge (within JOIN_LABIA of the outline: it stood as a ridge with a
# lump at each corner) are solved together, points and weights, as the smoothest surface held by everything round them.
# The anus's opening and the vulva's inner parts never move; the anus and vulva grids keep every point (positions only).
JOIN = os.environ.get("PATCH_JOIN", "0") == "1"  # tried 2026-11-21: smoother middle, but a ridge under her vulva and a box edge
if JOIN:
    JOIN_RING = int(os.environ.get("PATCH_JOIN_RING", 9))
    JOIN_LABIA = float(os.environ.get("PATCH_JOIN_LABIA", 0.005))
    ANUS_LAST = 12
    cj = np.empty(n_pts * 3)
    me.vertices.foreach_get("co", cj)
    cj = cj.reshape(-1, 3)
    lvj = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get("vertex_index", lvj)
    uvj = np.empty(len(me.loops) * 2)
    me.uv_layers["UVMap"].data.foreach_get("uv", uvj)
    uvj = uvj.reshape(-1, 2)
    mat_of = {nm: i for i, nm in enumerate(names)}
    touch = {nm: np.zeros(n_pts, bool) for nm in names}
    ring_of = np.full(n_pts, -1)
    for poly in me.polygons:
        nm = names[poly.material_index]
        vs = list(poly.vertices)
        touch[nm][vs] = True
        if nm == "T_anus_skin":
            for li in range(poly.loop_start, poly.loop_start + poly.loop_total):
                ring_of[lvj[li]] = max(ring_of[lvj[li]], int(round(uvj[li, 0] * ANUS_LAST)))
    # only the side facing her vulva: in front of the anus's middle (its rim's) by JOIN_AHEAD
    rim_y = cj[ring_of == 4, 1].mean() if (ring_of == 4).any() else 0.02
    anus_front = (touch["T_anus_skin"] & ~touch.get("T_anus", np.zeros(n_pts, bool)) & (ring_of >= JOIN_RING)
                  & (cj[:, 1] > rim_y + float(os.environ.get("PATCH_JOIN_AHEAD", 0.003))))
    lab_ring = ring_idx[touch["T_labia"][ring_idx]]
    labia_edge = np.zeros(n_pts, bool)
    lab_fade = np.zeros(n_pts)
    if len(lab_ring):
        from mathutils.kdtree import KDTree as _KDJ
        kdj = _KDJ(len(lab_ring))
        for k, v in enumerate(lab_ring):
            kdj.insert(cj[v], k)
        kdj.balance()
        inner = touch["T_vulva"] | touch.get("T_canal", np.zeros(n_pts, bool)) | touch.get("T_hole", np.zeros(n_pts, bool))
        for v in np.nonzero(touch["T_labia"] & ~inner)[0]:
            d = kdj.find(cj[v])[2]
            if d < JOIN_LABIA:
                labia_edge[v] = True
                t_ = d / JOIN_LABIA
                lab_fade[v] = 1 - t_ * t_ * (3 - 2 * t_)
    region = np.zeros(n_pts, bool)
    region[use_idx] = True
    region |= anus_front | labia_edge
    # the outline's own points between the new skin and the joined pieces join too (else they pin a crease there)
    region[ring_idx] |= (touch["T_anus_skin"][ring_idx] & anus_front[ring_idx]) | labia_edge[ring_idx]
    ej = np.empty(len(me.edges) * 2, np.int32)
    me.edges.foreach_get("vertices", ej)
    ej = ej.reshape(-1, 2)
    real = np.zeros(len(me.edges), bool)
    le = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get("edge_index", le)
    pm = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", pm)
    lt = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("loop_total", lt)
    real[le[~np.isin(np.repeat(pm, lt), list(over_ids))]] = True
    ej = ej[real & (region[ej[:, 0]] | region[ej[:, 1]])]
    free = np.nonzero(region)[0]
    pos = {v: k for k, v in enumerate(free)}
    nf = len(free)
    a_i = np.array([pos.get(a, -1) for a in ej[:, 0]])
    b_i = np.array([pos.get(b, -1) for b in ej[:, 1]])
    degj = np.zeros(nf)
    np.add.at(degj, a_i[a_i >= 0], 1)
    np.add.at(degj, b_i[b_i >= 0], 1)

    def solve(vals):
        """Each free point the average of its neighbours; the rest held."""
        vals = np.asarray(vals, float)
        b = np.zeros((nf, vals.shape[1]))
        m1 = (a_i >= 0) & (b_i < 0)
        np.add.at(b, a_i[m1], vals[ej[m1, 1]])
        m2 = (b_i >= 0) & (a_i < 0)
        np.add.at(b, b_i[m2], vals[ej[m2, 0]])
        both = (a_i >= 0) & (b_i >= 0)

        def A(x):
            y = degj[:, None] * x
            np.subtract.at(y, a_i[both], x[b_i[both]])
            np.subtract.at(y, b_i[both], x[a_i[both]])
            return y
        x = vals[free].copy()
        r = b - A(x)
        p = r.copy()
        rs = (r * r).sum(0)
        for _ in range(6000):
            Ap = A(p)
            al = rs / np.maximum((p * Ap).sum(0), 1e-300)
            x += al * p
            r -= al * Ap
            rn = (r * r).sum(0)
            if np.sqrt(rn.max()) < 1e-13:
                break
            p = r + (rn / np.maximum(rs, 1e-300)) * p
            rs = rn
        return x
    blend = np.ones(nf)
    lab = labia_edge[free] & ~np.isin(free, use_idx)
    blend[lab] = lab_fade[free][lab]
    # the anus piece eases in ring by ring from JOIN_RING, so nothing near its opening jumps
    an = anus_front[free] & ~np.isin(free, use_idx)
    tr = np.clip((ring_of[free][an] - JOIN_RING + 1) / 3, 0, 1)
    blend[an] = tr * tr * (3 - 2 * tr)
    new_pos = solve(cj)
    cj2 = cj.copy()
    cj2[free] = cj[free] + (new_pos - cj[free]) * blend[:, None]
    me.vertices.foreach_set("co", cj2.ravel())
    Wj = np.zeros((n_pts, len(gname)))
    near_j = np.unique(ej)
    for v in near_j:
        for g in me.vertices[int(v)].groups:
            Wj[v, g.group] = g.weight
    new_wj = np.clip(solve(Wj), 0, 1)
    vgs = body.vertex_groups
    for k, v in enumerate(free):
        w = Wj[v] * (1 - blend[k]) + new_wj[k] * blend[k]
        for g in [g.group for g in me.vertices[int(v)].groups]:
            vgs[g].remove([int(v)])
        top = np.argsort(-w)[:4]
        top = top[w[top] > 1e-4]
        tot = w[top].sum() or 1
        for gi in top:
            vgs[int(gi)].add([int(v)], float(w[gi] / tot), "REPLACE")
    me.update()
    print(f"perineum_patch: joined as one surface: {len(use_idx)} new skin, {int(anus_front.sum())} anus piece front, "
          f"{int(labia_edge.sum())} vulva bottom edge points; most moved {np.linalg.norm(cj2 - cj, axis=1).max() * 1000:.1f} mm")

# The seam: the new skin and her skin within BAND of the outline are relaxed together (each point towards its
# neighbours' middle, fading out across the band), and their weights likewise, so the outline's zigzags and the step
# where the fill meets her skin smooth out. Points of the vulva and anus pieces never move.
BAND = float(os.environ.get("PATCH_BAND", 0.005))
PASSES = int(os.environ.get("PATCH_PASSES", 40))
if BAND > 0 and PASSES > 0:
    co2 = np.empty(n_pts * 3)
    me.vertices.foreach_get("co", co2)
    co2 = co2.reshape(-1, 3)
    fm2 = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", fm2)
    # The bottom edge of her vulva piece (T_labia) is smoothed with the seam, so it meets the new skin without a lip or
    # beads. Not the anus piece: smoothing its skin tore it (its front half is squeezed into a centimetre).
    soft_ids = {i for i, nm in enumerate(names) if nm in os.environ.get("PATCH_SOFT", "T_labia").split()}
    piece = np.zeros(n_pts, bool)
    skin_pt = np.zeros(n_pts, bool)
    for poly in me.polygons:
        if poly.material_index in skin_ids or poly.material_index in soft_ids:
            skin_pt[list(poly.vertices)] = True
        elif poly.material_index not in over_ids:
            piece[list(poly.vertices)] = True
    from mathutils.kdtree import KDTree as _KD
    kd2 = _KD(len(ring_idx))
    for k, v in enumerate(ring_idx):
        kd2.insert(co2[v], k)
    kd2.balance()
    near_ring = np.full(n_pts, np.inf)
    cand = np.nonzero(np.linalg.norm(co2 - co2[ring_idx].mean(0), axis=1) < 0.08)[0]
    for v in cand:
        near_ring[v] = kd2.find(co2[v])[2]
    t = np.clip(near_ring / BAND, 0, 1)
    amt = (1 - t * t * (3 - 2 * t))
    amt[use_idx] = 1
    amt *= skin_pt & ~piece
    ed = np.empty(len(me.edges) * 2, np.int32)
    me.edges.foreach_get("vertices", ed)
    ed = ed.reshape(-1, 2)
    live = (amt[ed[:, 0]] > 0) | (amt[ed[:, 1]] > 0)
    ed = ed[live]
    dg = np.zeros(n_pts)
    np.add.at(dg, ed[:, 0], 1)
    np.add.at(dg, ed[:, 1], 1)

    def relax(vals):
        for _ in range(PASSES):
            acc = np.zeros_like(vals)
            np.add.at(acc, ed[:, 0], vals[ed[:, 1]])
            np.add.at(acc, ed[:, 1], vals[ed[:, 0]])
            mid = acc / np.maximum(dg, 1)[:, None]
            vals = vals + (mid - vals) * (0.5 * amt * (dg > 0))[:, None]
        return vals
    co3 = relax(co2)
    me.vertices.foreach_set("co", co3.ravel())
    moving = np.nonzero(amt > 0)[0]
    Wm = np.zeros((n_pts, len(gname)))
    for v in moving:
        for g in me.vertices[int(v)].groups:
            Wm[v, g.group] = g.weight
    for v in np.unique(ed):
        if amt[v] == 0:
            for g in me.vertices[int(v)].groups:
                Wm[v, g.group] = g.weight
    Wm = relax(Wm)
    vgs = body.vertex_groups
    for v in moving:
        for g in [g.group for g in me.vertices[int(v)].groups]:
            vgs[g].remove([int(v)])
        top = np.argsort(-Wm[v])[:4]
        top = top[Wm[v, top] > 1e-4]
        tot = Wm[v, top].sum() or 1
        for gi in top:
            vgs[int(gi)].add([int(v)], float(Wm[v, gi] / tot), "REPLACE")
    me.update()
    print(f"perineum_patch: seam relaxed over {len(moving)} points, most moved "
          f"{np.linalg.norm(co3 - co2, axis=1).max() * 1000:.1f} mm")
# Smooth light across it all: the pieces kept their old fixed (custom) normals and the outline's edges were marked
# sharp, so the light broke along every seam (the dark line over her anus, the lumps under her vulva). Within
# NORMALS_REACH of the outline, sharp marks are cleared and every corner's normal is the smooth one of its point.
NORMALS_REACH = float(os.environ.get("PATCH_NORMALS", -1))  # beyond the new skin; her old normals hide small crumples
if NORMALS_REACH >= 0:
    cn = np.empty(n_pts * 3)
    me.vertices.foreach_get("co", cn)
    cn = cn.reshape(-1, 3)
    from mathutils.kdtree import KDTree as _KDN
    kdn = _KDN(len(ring_idx))
    for k, v in enumerate(ring_idx):
        kdn.insert(cn[v], k)
    kdn.balance()
    near_n = np.zeros(n_pts, bool)
    nfade = np.zeros(n_pts)
    for v in np.nonzero(np.linalg.norm(cn - cn[ring_idx].mean(0), axis=1) < 0.1)[0]:
        d = kdn.find(cn[v])[2]
        if d < NORMALS_REACH:
            near_n[v] = True
            t_ = d / NORMALS_REACH
            nfade[v] = 1 - t_ * t_ * (3 - 2 * t_)
    near_n[use_idx] = True
    nfade[use_idx] = 1
    near_n[ring_idx] = True
    nfade[ring_idx] = 1
    ov = np.zeros(n_pts, bool)
    for poly in me.polygons:
        if poly.material_index in over_ids:
            ov[list(poly.vertices)] = True
    near_n &= ~ov
    sh = me.attributes.get("sharp_edge")
    if sh is not None:
        ev = np.empty(len(me.edges) * 2, np.int32)
        me.edges.foreach_get("vertices", ev)
        ev = ev.reshape(-1, 2)
        vals = np.empty(len(me.edges), bool)
        sh.data.foreach_get("value", vals)
        cleared = int((vals & near_n[ev[:, 0]] & near_n[ev[:, 1]]).sum())
        vals[near_n[ev[:, 0]] & near_n[ev[:, 1]]] = False
        sh.data.foreach_set("value", vals)
    else:
        cleared = 0
    me.update()
    corner = np.array([tuple(c.vector) for c in me.corner_normals])
    lvn = np.empty(len(me.loops), np.int32)
    me.loops.foreach_get("vertex_index", lvn)
    pn = np.empty(len(me.polygons) * 3)
    me.polygons.foreach_get("normal", pn)
    pn = pn.reshape(-1, 3)
    pa = np.empty(len(me.polygons))
    me.polygons.foreach_get("area", pa)
    plt_ = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("loop_total", plt_)
    face_of = np.repeat(np.arange(len(me.polygons)), plt_)
    pmi = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", pmi)
    # each point's faces (not the overlays)
    keep_l = near_n[lvn] & ~np.isin(pmi[face_of], list(over_ids))
    vf = {}
    for li in np.nonzero(keep_l)[0]:
        vf.setdefault(int(lvn[li]), []).append(int(face_of[li]))
    pick = np.nonzero(keep_l)[0]
    for li in pick:
        own = pn[face_of[li]]
        fs = np.array(vf[int(lvn[li])])
        # only the faces round it that face its own way (folds left beside the cut face the other way)
        ok = pn[fs] @ own > 0.5
        nrm = (pn[fs[ok]] * pa[fs[ok], None]).sum(0)
        ln = np.linalg.norm(nrm)
        new = nrm / ln if ln > 1e-12 else own
        mix = corner[li] * (1 - nfade[lvn[li]]) + new * nfade[lvn[li]]
        corner[li] = mix / max(np.linalg.norm(mix), 1e-12)
    me.normals_split_custom_set([tuple(c) for c in corner])
    me.update()
    print(f"perineum_patch: smooth normals over {int(near_n.sum())} points ({len(pick)} corners), "
          f"{cleared} sharp edges cleared")
print(f"perineum_patch: {ni} freed points reused, {len(spare)} left without faces inside her; "
      f"most height off the plane {np.abs(height).max() * 1000:.1f} mm ({time.time() - t0:.0f} s)")

if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    stem = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
    shutil.copy2(bpy.data.filepath, os.path.join(backups, f"{stem}_{time.strftime('%Y%m%d_%H%M%S')}_before_perineum_patch.blend"))
print("perineum_patch: saved", core.save_blend(OUT))
