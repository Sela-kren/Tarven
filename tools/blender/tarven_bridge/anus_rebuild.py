"""Rebuilds her anus piece clean and mirror-symmetric (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/anus_rebuild.py -- [out.blend]

The anus piece (T_anus canal and rim, T_anus_skin disc) had been folded into itself by the sculpts since it was laid on
(build_world.py add_anus): its front half squeezed into a centimetre, its outline lopsided, its left and right leg
weights 22% apart, so with her legs open it drifted 2 mm sideways, and every scripted fix tore it. Here it is cut out
(with the skin mirroring it, so the hole is even both sides) and built again as the game reads it (anus.ts readAnus):

  * a disc on a polar grid round the opening, SPOKES directions (4 per game spoke) and 3 rows per game ring, the rim
    (ring RIM) at MOUTH round the opening out to her skin at ring LAST, each corner's ring and spoke in its UVs
    (u = ring / LAST, v = spoke / 12) exactly as add_anus lays them; the rim and PUCKER rings out from it wear T_anus,
    the rest T_anus_skin;
  * laid onto her old outer surface there (the first surface facing out along her skin's normal), its height eased;
  * made exactly mirror-symmetric (every corner's mirror partner is a corner too): place and weights, with left and
    right swapped for the partner;
  * a canal straight in from the opening (rings 0 to CANAL), weighted as the opening;
  * joined to her skin by a strip between the disc's last row and the hole's outline.

New points reuse the points the old piece freed, so she keeps exactly as many points in the same order. Backs the
file up when saving over it.
"""
import math
import os
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

sys.stdout.reconfigure(line_buffering=True)
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else None

GAME_SPOKES = 12
SUB = 4                       # grid directions per game spoke
SPOKES = GAME_SPOKES * SUB
CANAL = 3
RIM = CANAL + 1
RINGS = 8
LAST = RIM + RINGS            # 12
PUCKER = 3                    # rings out from the rim wearing T_anus (build_world.py ANUS_RIM)
ROWS = 3                      # grid rows per game ring
MOUTH = float(os.environ.get("ANUS_MOUTH", 0.003))  # the rim's radius as built (the game sets its own: anus.ts SHUT/OPEN)
DIP = float(os.environ.get("ANUS_DIP", 0.002))      # the opening this far below the skin round it (a shallow dish)
DEPTH = 0.03
LIFT = 0.0003
MIRROR_HIT = 0.0015           # skin whose mirror image lies this close to the old piece is cut too
SKIP = {"T_lingerie", "T_pubic"}
LEAVE = {"T_vulva", "T_labia", "T_canal", "T_hole"}


def fail(msg):
    print("anus_rebuild: STOPPED,", msg)
    sys.exit(1)


t0 = time.time()
body = bpy.data.objects["Female_Body"]
me = body.data
names = [m.name if m else "" for m in me.materials]
mat_id = {n: i for i, n in enumerate(names)}
n_pts = len(me.vertices)
gname = [g.name for g in body.vertex_groups]
gi = {g: i for i, g in enumerate(gname)}
swap = np.array([gi.get(g[:-2] + ("_R" if g.endswith("_L") else "_L"), i) if g.endswith(("_L", "_R")) else i
                 for i, g in enumerate(gname)])

bm = bmesh.new()
bm.from_mesh(me)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
uvl = {u.name: bm.loops.layers.uv[u.name] for u in me.uv_layers}
deform = bm.verts.layers.deform.active
piece_ids = {mat_id["T_anus"], mat_id["T_anus_skin"]}
skip_ids = {mat_id[n] for n in SKIP if n in mat_id}
leave_ids = {mat_id[n] for n in LEAVE if n in mat_id}

old_piece = [f for f in bm.faces if f.material_index in piece_ids]
if not old_piece:
    fail("no anus piece")


def ring_of(lp):
    return round(lp[uvl["UVMap"]].uv[0] * LAST)


# ---------------------------------------------------------------- where it sits
rim_pts = {lp.vert for f in old_piece for lp in f.loops if ring_of(lp) == RIM}
centre = Vector(np.mean([tuple(v.co) for v in rim_pts], axis=0))
centre.x = 0.0
# outward: the old disc's faces round the opening (area weighted), facing out of her
nrm = Vector()
for f in old_piece:
    if f.material_index == mat_id["T_anus_skin"] and (f.calc_center_median() - centre).length < 0.012:
        nrm += f.normal * f.calc_area()
inner = Vector((0.0, centre.y + 0.03, centre.z + 0.08))     # inside her pelvis
if nrm.length < 1e-9 or nrm.dot(centre - inner) < 0:
    nrm = -nrm if nrm.length > 1e-9 else (centre - inner)
nrm.x = 0.0
nrm.normalize()
across = Vector((1.0, 0.0, 0.0))
up = nrm.cross(across).normalized()
print(f"anus_rebuild: opening at {tuple(round(c, 4) for c in centre)}, facing {tuple(round(c, 3) for c in nrm)}")

# ---------------------------------------------------------------- the cut: the old piece, and the skin mirroring it
pc_tris, pc_vs = [], [tuple(v.co) for v in bm.verts]
for f in old_piece:
    vs = [v.index for v in f.verts]
    for k in range(1, len(vs) - 1):
        pc_tris.append((vs[0], vs[k], vs[k + 1]))
piece_tree = BVHTree.FromPolygons(pc_vs, pc_tris)
cut = set(old_piece)
for f in bm.faces:
    if f in cut or f.material_index in skip_ids | leave_ids:
        continue
    c = f.calc_center_median()
    if (c - centre).length > 0.06:
        continue
    m = Vector((-c.x, c.y, c.z))
    loc, _, _, d = piece_tree.find_nearest(m, MIRROR_HIT)
    if loc is not None:
        cut.add(f)
skin_ids = {i for i, n in enumerate(names) if n in ("T_smalls", "T_skin_f")}
# STRIP: the skin between it and the bottom of her vulva goes too (its folds made the join fold), so the new disc
# runs on to her vulva's edge
if os.environ.get("ANUS_STRIP", "0") == "1":   # tried: her strip is too folded for a clean outline
    lab_y = [v.co.y for f in bm.faces if f.material_index == mat_id.get("T_labia") for v in f.verts if abs(v.co.x) < 0.01]
    y_front = min(lab_y) if lab_y else centre.y + 0.02
    W_STRIP = float(os.environ.get("ANUS_STRIP_HALF", 0.012))
    added = 0
    for f in bm.faces:
        if f in cut or f.material_index not in skin_ids:
            continue
        c = f.calc_center_median()
        if abs(c.x) < W_STRIP and centre.y < c.y < y_front + 0.001 and 0.885 < c.z < 0.945:
            cut.add(f)
            added += 1
    print(f"anus_rebuild: and {added} faces of the strip up to her vulva (its edge at y {y_front:.4f})")


def real_faces(e):
    return [g for g in e.link_faces if g.material_index not in skip_ids]


def open_adj(cut):
    adj = {}
    for e in {e for f in cut for e in f.edges}:
        if sum(1 for g in real_faces(e) if g not in cut) == 1:
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


MERGED = 0
for step in range(200):
    adj = open_adj(cut)
    pinch = [v for v in adj if len(adj[v]) != 2]
    if pinch:
        grow = {f for v in pinch for f in v.link_faces if f not in cut and f.material_index in skin_ids | piece_ids}
        if not grow:
            fail(f"the outline pinches at {len(pinch)} points of other pieces")
        cut |= grow
        continue
    loops = loops_of(adj)
    if len(loops) == 1:
        break
    # small bits of skin cut off by the cut go too
    for loop in sorted(loops, key=len)[:-1]:
        start = [f for f in loop[0].link_faces if f not in cut and f.material_index in skin_ids]
        comp, stack = set(), list(start)
        while stack and len(comp) <= 3000:
            f = stack.pop()
            if f in comp:
                continue
            comp.add(f)
            for e in f.edges:
                stack.extend(g for g in real_faces(e) if g not in cut and g not in comp and g.material_index in skin_ids)
        if len(comp) <= 3000:
            cut |= comp
        elif MERGED < 60:
            # skin the cut went round, joined to her elsewhere by folds under it: the cut takes it, row by row from
            # this outline, until the two outlines meet
            cut |= {f for v in loop for f in v.link_faces if f not in cut and f.material_index in skin_ids | piece_ids}
            MERGED += 1
            break
        else:
            import collections as _c
            P_ = np.array([tuple(v.co) for v in loop])
            nb_ = _c.Counter(names[f.material_index] for v in loop for f in v.link_faces if f not in cut)
            print("anus_rebuild:   second outline round", P_.mean(0).round(4).tolist(), "span mm",
                  ((P_.max(0) - P_.min(0)) * 1000).round(1).tolist(), dict(nb_), "from the opening mm",
                  round((Vector(P_.mean(0)) - centre).length * 1000, 1))
            fail(f"a {len(loop)}-point second outline round the cut")
else:
    fail("the outline never came clean")
outline = loops[0]
print(f"anus_rebuild: cutting {len(cut)} faces ({len(old_piece)} of them the old piece); outline {len(outline)} points")


def plane(p):
    d = Vector(p) - centre
    return d.dot(across), d.dot(up), d.dot(nrm)


ang = np.array([math.atan2(plane(v.co)[1], plane(v.co)[0]) for v in outline])
unwrapped = np.unwrap(ang)
if unwrapped[-1] < unwrapped[0]:
    outline = outline[::-1]
    ang = ang[::-1]
    unwrapped = np.unwrap(ang)
backs = int((np.diff(unwrapped) < 0).sum())
print(f"anus_rebuild: the outline goes once round ({math.degrees(unwrapped[-1] - unwrapped[0]):.0f} deg), "
      f"{backs} small steps back")
rad = np.array([math.hypot(*plane(v.co)[:2]) for v in outline])
# the hole's reach in each direction, made even both sides (direction a and its mirror pi - a)
bins = np.linspace(-math.pi, math.pi, 73)


def reach(a):
    a = (a + math.pi) % (2 * math.pi) - math.pi
    d = np.abs(np.angle(np.exp(1j * (ang - a))))
    w = np.exp(-(d / 0.12) ** 2)
    return float((rad * w).sum() / max(w.sum(), 1e-9))


def reach_sym(a):
    return 0.5 * (reach(a) + reach(math.pi - a))


# ---------------------------------------------------------------- the old surface and weights, before cutting
near_faces = [f for f in bm.faces if f.material_index not in skip_ids | leave_ids
              and (f.calc_center_median() - centre).length < 0.07]
ns_tris, ns_owner = [], []
for f in near_faces:
    vs = [v.index for v in f.verts]
    for k in range(1, len(vs) - 1):
        ns_tris.append((vs[0], vs[k], vs[k + 1]))
        ns_owner.append(f)
old_tree = BVHTree.FromPolygons(pc_vs, ns_tris)
old_w = np.zeros((len(bm.verts), len(gname)))
for v in bm.verts:
    for g, w in v[deform].items():
        old_w[v.index, g] = w


def onto_old(p, n_dir, reach_=0.025):
    """The first old surface facing out along n_dir, searched from outside in; its point and weights."""
    start = Vector(p) + n_dir * reach_
    travelled = 0.0
    while travelled < 2 * reach_:
        h = old_tree.ray_cast(start, -n_dir, 2 * reach_ - travelled)
        if h[0] is None:
            return None, None
        if h[1].dot(n_dir) > 0.2:
            tri = ns_tris[h[2]]
            bary = poly_3d_calc([Vector(pc_vs[i]) for i in tri], h[0])
            return h[0], sum(old_w[i] * b for i, b in zip(tri, bary))
        travelled += (h[0] - start).length + 1e-5
        start = h[0] - n_dir * 1e-5
    return None, None


# the opening's weights: the old rim's, even left and right
rim_w = np.mean([old_w[v.index] for v in rim_pts], axis=0)
rim_w = (rim_w + rim_w[swap]) / 2

# ---------------------------------------------------------------- the new disc
qs = [RIM + r / ROWS for r in range((LAST - RIM) * ROWS)]          # 4, 4.33, ... 11.67 (the outline is 12)
# The disc's height (along her normal) and weights: the smoothest blend (in grid rows and directions) between the
# opening (held: its weights even left and right) and her skin at the hole's edge (sampled round it by direction and
# made even both sides). No rays: deep in her cleft they caught the other cheek.
cN = np.array(tuple(centre))
nN = np.array(tuple(nrm))
o_P = np.array([tuple(v.co) for v in outline])
o_h = (o_P - cN) @ nN
o_W = np.array([old_w[v.index] for v in outline])


def at_angle(vals, a):
    d = np.abs(np.angle(np.exp(1j * (ang - a))))
    w = np.exp(-(d / 0.10) ** 2)
    return (vals * w[:, None] if vals.ndim > 1 else vals * w).sum(0) / max(w.sum(), 1e-9)


dirs = 2 * math.pi * np.arange(SPOKES) / SPOKES
edge_h = np.array([0.5 * (at_angle(o_h, a) + at_angle(o_h, math.pi - a)) for a in dirs])
edge_w = np.array([0.5 * (at_angle(o_W, a) + at_angle(o_W, math.pi - a)[swap]) for a in dirs])
# the opening: a shallow dish, DIP below the skin round it, not wherever the old one had been pushed
lift_by = float(edge_h.mean()) - DIP
centre = centre + nrm * lift_by
cN = np.array(tuple(centre))
edge_h = edge_h - lift_by
print(f"anus_rebuild: opening raised {lift_by * 1000:.1f} mm, to {DIP * 1000:.1f} mm below the skin round it")
nrow = len(qs) + 1                              # the grid rows and, last, the edge (ring LAST)
H = np.zeros((nrow, SPOKES)); H[0] = LIFT; H[-1] = edge_h
Wg = np.zeros((nrow, SPOKES, len(gname))); Wg[0] = rim_w; Wg[-1] = edge_w
# start linear in the row, then relax (rows spaced by ring, directions round)
f_row = np.array([(q - RIM) / (LAST - RIM) for q in qs] + [1.0])
R_mean = float(np.mean([reach_sym(a) for a in dirs]))


def radius_at(q, R_):
    # even in log radius from the rim (MOUTH) to the edge: faces about as long as they are wide
    f = (q - RIM) / (LAST - RIM)
    return MOUTH * (R_ / MOUTH) ** f
H[1:-1] = (LIFT + (edge_h[None] - LIFT) * f_row[1:-1, None])
Wg[1:-1] = rim_w[None, None] + (edge_w[None] - rim_w[None, None]) * f_row[1:-1, None, None]
for _ in range(int(os.environ.get("ANUS_RELAX", 300))):
    H[1:-1] = 0.5 * H[1:-1] + 0.125 * (H[:-2] + H[2:] + np.roll(H, 1, 1)[1:-1] + np.roll(H, -1, 1)[1:-1])
    Wg[1:-1] = 0.5 * Wg[1:-1] + 0.125 * (Wg[:-2] + Wg[2:] + np.roll(Wg, 1, 1)[1:-1] + np.roll(Wg, -1, 1)[1:-1])
grid = np.zeros((len(qs), SPOKES, 3))
gw = Wg[:-1].copy()
for s_ in range(SPOKES):
    d_ = np.array(tuple(across * math.cos(dirs[s_]) + up * math.sin(dirs[s_])))
    R_ = reach_sym(dirs[s_])
    for i, q in enumerate(qs):
        r_ = radius_at(q, R_)
        grid[i, s_] = cN + d_ * r_ + nN * H[i, s_]
print(f"anus_rebuild: disc of {len(qs)} rows x {SPOKES} directions blended from the opening to her skin, mirror-even")

# the canal, straight in from the opening
canal = [[tuple(centre - nrm * DEPTH * 1.2)]]
for i in range(1, CANAL + 1):
    depth = DEPTH * (CANAL + 1 - i) / CANAL
    canal.append([tuple(centre - nrm * depth + (across * math.cos(2 * math.pi * s / SPOKES) + up * math.sin(2 * math.pi * s / SPOKES)) * MOUTH)
                  for s in range(SPOKES)])

# ---------------------------------------------------------------- into her mesh
# what the old points carried, for the new ones (nearest old corner of the same piece material)
old_corners = {}
for f in cut:
    for lp in f.loops:
        old_corners.setdefault(f.material_index, []).append((tuple(lp.vert.co), {n: tuple(lp[l].uv) for n, l in uvl.items()}))
kd_corner = {}
for m_, cs in old_corners.items():
    kd_ = KDTree(len(cs))
    for k, (p, _) in enumerate(cs):
        kd_.insert(p, k)
    kd_.balance()
    kd_corner[m_] = kd_
outline_set = set(outline)
bmesh.ops.delete(bm, geom=list(cut), context="FACES_ONLY")
for e in [e for e in bm.edges if not e.link_faces]:
    bm.edges.remove(e)
freed = sorted([v for v in bm.verts if not v.link_faces and v not in outline_set], key=lambda v: v.index)
need = 1 + CANAL * SPOKES + len(qs) * SPOKES
if len(freed) < need:
    fail(f"only {len(freed)} freed points for {need}")
it = iter(freed)


def place(p, w):
    v = next(it)
    v.co = Vector(p)
    v[deform].clear()
    for g in np.nonzero(w > 1e-4)[0]:
        v[deform][int(g)] = float(w[g])
    return v


V_canal = [[place(canal[0][0], rim_w)]] + [[place(p, rim_w) for p in ring] for ring in canal[1:]]
V_grid = [[place(grid[i, s], gw[i, s]) for s in range(SPOKES)] for i in range(len(qs))]
used = set(v for r in V_canal for v in r) | set(v for r in V_grid for v in r)
spare = [v for v in freed if v not in used]
for v in spare:
    v.co = Vector(tuple(centre - nrm * 0.01))
# rows by game ring (u), canal rings 0..3 then the grid rows 4 .. 11.67
rows = [(0.0, V_canal[0])] + [(float(i), V_canal[i]) for i in range(1, CANAL + 1)] + [(q, V_grid[i]) for i, q in enumerate(qs)]
mat_anus, mat_skin = mat_id["T_anus"], mat_id["T_anus_skin"]
new_faces = []


def set_uv(f, uvs, mat):
    f.material_index = mat
    f.smooth = True
    for lp, (u, v) in zip(f.loops, uvs):
        lp[uvl["UVMap"]].uv = (u, v)
        if "Paint" in uvl:
            kd_ = kd_corner.get(mat) or next(iter(kd_corner.values()))
            cs = old_corners.get(mat) or next(iter(old_corners.values()))
            _, k, _ = kd_.find(lp.vert.co)
            lp[uvl["Paint"]].uv = cs[k][1]["Paint"]


for r in range(len(rows) - 1):
    qa, ra = rows[r]
    qb, rb = rows[r + 1]
    mat = mat_anus if qb <= RIM + PUCKER else mat_skin
    for s in range(SPOKES):
        s1 = (s + 1) % SPOKES
        va, vb = s / SPOKES, (s + 1) / SPOKES
        if len(ra) == 1:
            verts, uvs = [ra[0], rb[s], rb[s1]], [(qa / LAST, va), (qb / LAST, va), (qb / LAST, vb)]
        else:
            verts = [ra[s], rb[s], rb[s1], ra[s1]]
            uvs = [(qa / LAST, va), (qb / LAST, va), (qb / LAST, vb), (qa / LAST, vb)]
        f = bm.faces.new(verts)
        set_uv(f, uvs, mat)
        new_faces.append(f)
# the strip from the last row to the outline (ring LAST), zipped round by angle
last_row = V_grid[-1]
q_last = qs[-1]
oa = np.unwrap(np.array([math.atan2(plane(v.co)[1], plane(v.co)[0]) for v in outline]))
start = int(np.argmin(np.mod(oa, 2 * math.pi)))
outline = outline[start:] + outline[:start]
oa = np.unwrap(np.array([math.atan2(plane(v.co)[1], plane(v.co)[0]) for v in outline]))
oa = oa - 2 * math.pi * math.floor(oa[0] / (2 * math.pi))      # starts in [0, 2 pi) and runs once round
oa = np.maximum.accumulate(oa)                                  # its small steps back ignored for the zip
ga = 2 * math.pi * np.arange(SPOKES + 1) / SPOKES
i_o, i_g, made = 0, 0, 0
No = len(outline)
while i_o < No or i_g < SPOKES:
    o0, o1 = outline[i_o % No], outline[(i_o + 1) % No]
    g0, g1 = last_row[i_g % SPOKES], last_row[(i_g + 1) % SPOKES]
    a_o = oa[i_o + 1] if i_o + 1 < No else oa[0] + 2 * math.pi
    a_g = ga[i_g + 1] if i_g < SPOKES else math.inf
    vg0, vg1 = i_g / SPOKES, (i_g + 1) / SPOKES
    vo0 = min(max(oa[i_o] / (2 * math.pi), 0.0), 1.0)
    vo1 = min(max(a_o / (2 * math.pi), 0.0), 1.0)
    if (a_o <= a_g and i_o < No) or i_g >= SPOKES:
        verts, uvs = [g0, o0, o1], [(q_last / LAST, vg0), (1.0, vo0), (1.0, vo1)]
        i_o += 1
    else:
        verts, uvs = [g0, o0, g1], [(q_last / LAST, vg0), (1.0, vo0), (q_last / LAST, vg1)]
        i_g += 1
    if len({*verts}) < 3:
        continue
    try:
        f = bm.faces.new(verts)
    except ValueError:
        continue
    set_uv(f, uvs, mat_skin)
    new_faces.append(f)
    made += 1
# one way round for all: the disc faces out of her
bm.normal_update()
outward = sum((f.normal.dot(nrm) for f in new_faces if f.material_index == mat_skin), 0.0)
if outward < 0:
    for f in new_faces:
        f.normal_flip()
print(f"anus_rebuild: {len(new_faces)} new faces ({made} joining it to her skin); {len(spare)} freed points left without faces")

# every cell of the game's grid
cells = set()
for f in new_faces:
    for lp in f.loops:
        u, v = lp[uvl["UVMap"]].uv
        ring = min(LAST, max(0, round(u * LAST)))
        cells.add((ring, 0 if ring == 0 else round((1 - v) * GAME_SPOKES) % GAME_SPOKES))
want = {(0, 0)} | {(r, k) for r in range(1, LAST + 1) for k in range(GAME_SPOKES)}
if want - cells:
    fail(f"grid cells missing: {sorted(want - cells)[:8]}")
bm.verts.index_update()
idx_new = np.array([v.index for v in used])
outline_index = [v.index for v in outline]
inner_idx = np.array([v.index for r in V_canal for v in r] + [v.index for r in V_grid[:len(V_grid) - 6] for v in r])
outer_idx = np.array([v.index for r in V_grid[len(V_grid) - 6:] for v in r])
bm.to_mesh(me)
bm.free()
me.update()
if len(me.vertices) != n_pts:
    fail("the point count changed")
# point attributes of the new points: the nearest old point's (bust keys there are none; skin detail carried)
for attr in me.attributes:
    if attr.domain != "POINT" or attr.data_type != "FLOAT_VECTOR" or attr.name == "position":
        continue
    vals = np.empty(n_pts * 3, np.float32)
    attr.data.foreach_get("vector", vals)
    vals = vals.reshape(-1, 3)
    vals[idx_new] = 0 if attr.name.startswith("_BUST_KEY_") else vals[idx_new]
    attr.data.foreach_set("vector", vals.ravel())
me.update()
# The join: the disc's outer rows, the strip joining it to her skin and her skin within JOIN_BAND of it are relaxed
# together (each point towards its neighbours' middle, fading out), so the join irons out the folds of the skin it
# meets. The opening, the canal and her vulva never move.
JOIN_BAND = float(os.environ.get("ANUS_JOIN_BAND", 0.006))
JOIN_PASSES = int(os.environ.get("ANUS_JOIN_PASSES", 40))
if JOIN_BAND > 0 and JOIN_PASSES > 0:
    co_ = np.empty(n_pts * 3)
    me.vertices.foreach_get("co", co_)
    co_ = co_.reshape(-1, 3)
    outline_idx = np.array([v for v in outline_index])
    kd_o = KDTree(len(outline_idx))
    for k, v in enumerate(outline_idx):
        kd_o.insert(co_[v], k)
    kd_o.balance()
    fixed = np.zeros(n_pts, bool)
    for poly in me.polygons:
        if poly.material_index in leave_ids | skip_ids:
            fixed[list(poly.vertices)] = True
    fixed[inner_idx] = True                      # the opening, the canal and the disc's inner rows
    amt = np.zeros(n_pts)
    near_ = np.nonzero(np.linalg.norm(co_ - np.array(tuple(centre)), axis=1) < 0.07)[0]
    for v in near_:
        d = kd_o.find(co_[v])[2]
        if d < JOIN_BAND:
            t_ = d / JOIN_BAND
            amt[v] = 1 - t_ * t_ * (3 - 2 * t_)
    amt[outer_idx] = np.maximum(amt[outer_idx], float(os.environ.get('ANUS_JOIN_OUTER', 0.35)))
    amt[fixed] = 0
    ed = np.empty(len(me.edges) * 2, np.int32)
    me.edges.foreach_get("vertices", ed)
    ed = ed.reshape(-1, 2)
    ed = ed[(amt[ed[:, 0]] > 0) | (amt[ed[:, 1]] > 0)]
    dg = np.zeros(n_pts)
    np.add.at(dg, ed[:, 0], 1)
    np.add.at(dg, ed[:, 1], 1)
    p_ = co_.copy()
    for k_ in range(2 * JOIN_PASSES):
        # Taubin: a smoothing step, then a slightly larger step back, so the surface irons out without shrinking
        lam = 0.5 if k_ % 2 == 0 else -0.53
        acc = np.zeros_like(p_)
        np.add.at(acc, ed[:, 0], p_[ed[:, 1]])
        np.add.at(acc, ed[:, 1], p_[ed[:, 0]])
        mid = acc / np.maximum(dg, 1)[:, None]
        p_ += (mid - p_) * (lam * amt * (dg > 0))[:, None]
    me.vertices.foreach_set("co", p_.ravel())
    me.update()
    print(f"anus_rebuild: the join relaxed over {int((amt > 0).sum())} points, most moved {np.linalg.norm(p_ - co_, axis=1).max() * 1000:.1f} mm")
print(f"anus_rebuild: done in {time.time() - t0:.0f} s")
if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    stem = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
    shutil.copy2(bpy.data.filepath, os.path.join(backups, f"{stem}_{time.strftime('%Y%m%d_%H%M%S')}_before_anus_rebuild.blend"))
print("anus_rebuild: saved", core.save_blend(OUT))
