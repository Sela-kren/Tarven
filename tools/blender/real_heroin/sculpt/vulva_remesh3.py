"""Clean local remesh of the vulva + perineum area of the sculpt file, shaped after the user's refs.
1. The area (round her midline, the slit's length plus margins, back to just short of the anus) taken as one disc of
   her skin: the closed slit's twin corners welded.
2. Flattened to a 2D disc (Tutte, conjugate gradients).
3. A fresh even triangulation laid over it (hex lattice + the area's boundary corners, constrained Delaunay), each new
   corner lifted back onto her surface through the old triangle it lands in; weights and orig_co carried the same way.
4. Old faces out, new ones in, sharing the boundary corners exactly.
5. Even out on her surface, smooth (Taubin), then DELTA mode (default): the change from the previous shape to the new
   one along the normal (her current lips already carry the old shape, so it is not added twice).
   New shape: lips rise gently out of the perineum (no round lobes at the back), slit ends ~12 mm before the lips'
   back end so the narrow ridge there reads as one smooth ridge, not two cheeks.
6. Perineum and the crease to the inner thighs smoothed (only skin close to her midline in 3D, never the thigh walls).
Headless: blender -b in.blend --python this.py with OUT=<path>."""
import bpy, bmesh, os, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
from mathutils.geometry import delaunay_2d_cdt, barycentric_transform
E = lambda k, d: float(os.environ.get(k, d))
L = E("VLEN", 0.070); BACK_Y = E("VBACK", 0.064)
RS = E("RS", 0.036)
RT0, RT1 = -E("RBACK", 0.028), L + E("RFRONT", 0.016)
H3 = E("STEP", 0.0009)
sm = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
g = lambda x, w: math.exp(-(x / w) ** 2)

def h_old(s, t):
    """the shape the first rebuild gave (MAJ 0.0066), already in her mesh"""
    a = abs(s); f = max(0.0, min(1.0, t / L))
    taper = 1 - 0.3 * sm((f - 0.6) / 0.4)
    env = sm((t + 0.010) / 0.018) * sm((L + 0.012 - t) / 0.02)
    full = 0.72 + 0.28 * math.sin(math.pi * f)
    side = 1 - sm((a - 0.036 * 0.55) / (0.036 * 0.35))
    maj = 0.0066 * env * full * side * (g(a - 0.0105 * taper, 0.0095 * taper) + 0.5 * g(a, 0.008))
    sl = sm(t / 0.007) * sm((L - t) / 0.004)
    front = sm((t - (L - 0.017)) / 0.017); w = 0.0017 + 0.0040 * front
    groove = -0.0036 * (1 - 0.45 * front) * sl * g(a, w)
    mspan = sm((f - 0.12) / 0.15) * (1 - sm((f - 0.93) / 0.07))
    mout = 0.0015 + 0.0015 * front
    mino = 0.0024 * sl * mspan * g(a - mout, 0.0009 + 0.0004 * front)
    tc = L - 0.0085
    clit = 0.0026 * g(t - tc, 0.0026) * g(a, 0.0021)
    hood = 0.0012 * g(t - (tc + 0.003), 0.004) * g(a, 0.0045)
    return maj + groove + mino + clit + hood

def h_new(s, t):
    a = abs(s); f = max(0.0, min(1.0, t / L))
    taper = 1 - 0.3 * sm((f - 0.6) / 0.4)
    env = sm((t - E("LIP0", 0.0)) / E("RISE", 0.034)) * sm((L + 0.012 - t) / 0.02)
    full = 0.55 + 0.45 * math.sin(math.pi * max(0.0, min(1.0, f * 0.85 + 0.1)))
    close = 0.65 + 0.35 * sm(t / 0.03)
    side = 1 - sm((a - RS * 0.55) / (RS * 0.35))
    cr = 0.0105 * taper * close; wd = 0.0095 * taper * close
    maj = E("MAJ", 0.0070) * env * full * side * (g(a - cr, wd) + 0.5 * g(a, 0.008 * close))
    s0 = E("SLIT0", 0.012)
    sl = sm((t - s0) / 0.010) * sm((L - t) / 0.004)
    front = sm((t - (L - 0.017)) / 0.017); w = 0.0015 + 0.0042 * front
    groove = -E("SLIT", 0.0036) * (1 - 0.45 * front) * sl * g(a, w)
    mspan = sm((f - 0.25) / 0.15) * (1 - sm((f - 0.93) / 0.07))
    mout = 0.0015 + 0.0016 * front
    mino = E("MINO", 0.0028) * sl * mspan * g(a - mout, 0.0009 + 0.0005 * front)
    tc = L - 0.0085
    clit = E("CLIT", 0.0030) * g(t - tc, 0.0026) * g(a, 0.0021)
    hood = 0.0015 * g(t - (tc + 0.003), 0.0042) * g(a, 0.0048)
    return maj + groove + mino + clit + hood

if os.environ.get("HFILE"): exec(open(os.environ["HFILE"]).read())   # a different h_new
DELTA = E("DELTA", 1) > 0
b = bpy.data.objects["Female_Body"]; me = b.data
names = [x.name for x in me.materials]
SKN = {"T_skin_f", "T_smalls", "T_bra", "T_navel", "T_labia", "T_vulva"}
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
dl = bm.verts.layers.deform.active; ocl = bm.verts.layers.float_vector.get("orig_co")
fsl = bm.faces.layers.int.get(".sculpt_face_set")
# ---------------------------------------------------------------- her midline, (s, t)
cand = [v for v in bm.verts if abs(v.co.x) < 0.003 and 0.86 < v.co.z < 0.99 and -0.01 < v.co.y < 0.17
        and all(names[f.material_index] in SKN for f in v.link_faces)]
cen = Vector((0, 0.06, 1.0)); bins = {}
for v in cand:
    d = v.co - cen; k = int(math.atan2(d.y, -d.z) / 0.015)
    if k not in bins or d.length > (bins[k] - cen).length: bins[k] = v.co.copy()
mid = [bins[k] for k in sorted(bins)]
if mid[-1].y < mid[0].y: mid = mid[::-1]
for _ in range(20):
    mid = [mid[0]] + [(mid[i - 1] + mid[i] * 2 + mid[i + 1]) / 4 for i in range(1, len(mid) - 1)] + [mid[-1]]
for p_ in mid: p_.x = 0.0
dense = [mid[0]]
for i in range(1, len(mid)):
    seg = mid[i] - mid[i - 1]; n_ = max(1, int(seg.length / 0.001))
    for k in range(1, n_ + 1): dense.append(mid[i - 1] + seg * (k / n_))
mid = dense
cum = [0.0]
for i in range(1, len(mid)): cum.append(cum[-1] + (mid[i] - mid[i - 1]).length)
i0 = min(range(len(mid)), key=lambda i: abs(mid[i].y - BACK_Y)); base_t = cum[i0]
mk = KDTree(len(mid)); [mk.insert(p, i) for i, p in enumerate(mid)]; mk.balance()
def st(p):
    q = Vector((0, p.y, p.z)); _, i, _ = mk.find(q); best = None
    for a_, b2 in ((i - 1, i), (i, i + 1)):
        if a_ < 0 or b2 >= len(mid): continue
        seg = mid[b2] - mid[a_]
        u = max(0.0, min(1.0, (q - mid[a_]).dot(seg) / max(seg.length_squared, 1e-12)))
        d = (mid[a_] + seg * u - q).length
        if best is None or d < best[0]: best = (d, cum[a_] + u * (cum[b2] - cum[a_]))
    return p.x, best[1] - base_t
dmid = lambda p: mk.find(p)[2]
# ---------------------------------------------------------------- 1. the area as one disc
for f in [f for f in bm.faces if names[f.material_index] == "T_canal"]:
    bm.faces.remove(f)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
AV_ = [v for f in bm.faces if names[f.material_index] in ("T_anus", "T_anus_skin", "T_hole") for v in f.verts]
AVco = [v.co.copy() for v in AV_]
akd = KDTree(max(1, len(AVco))); [akd.insert(c, i) for i, c in enumerate(AVco)]; akd.balance()
def anus_d(p): return akd.find(p)[2] if AVco else 1.0
def in_area(p):
    if anus_d(p) < E("ANUS_GAP", 0.003): return False
    s, t = st(p)
    return abs(s) < RS and RT0 < t < RT1 and dmid(p) < RS * E("RD", 0.8)
R = [f for f in bm.faces if names[f.material_index] in SKN and in_area(f.calc_center_median())]
RV = list({v for f in R for v in f.verts})
bmesh.ops.remove_doubles(bm, verts=RV, dist=0.00025)
R = [f for f in bm.faces if f.is_valid and names[f.material_index] in SKN and in_area(f.calc_center_median())]
left = set(R); pieces = []
while left:
    f0 = left.pop(); st_ = [f0]; pc = [f0]
    while st_:
        f = st_.pop()
        for e in f.edges:
            for h in e.link_faces:
                if h in left: left.remove(h); st_.append(h); pc.append(h)
    pieces.append(pc)
R = max(pieces, key=len); RSet = set(R)
def rloops():
    es = [e for f in R for e in f.edges if sum(h in RSet for h in e.link_faces) == 1]
    nx = {}
    for e in es:
        a, c = e.verts; nx.setdefault(a, []).append(c); nx.setdefault(c, []).append(a)
    seen = set(); out = []
    for s0 in nx:
        if s0 in seen: continue
        lp = [s0]; seen.add(s0); prev = None; cur = s0
        while True:
            cs = [x for x in nx[cur] if x is not prev and x not in seen]
            if not cs: break
            prev, cur = cur, cs[0]; seen.add(cur); lp.append(cur)
        out.append(lp)
    return out
loops = rloops()
outer = max(loops, key=lambda lp: sum((lp[i].co - lp[i - 1].co).length for i in range(len(lp))))
OS = set(outer)
RVs = {v for f in R for v in f.verts}
interior = [v for v in RVs if v not in OS]
print("REMESH area faces", len(R), "outer loop", len(outer), "other loops", len(loops) - 1, "interior corners", len(interior))
# ---------------------------------------------------------------- 2. flatten (Tutte)
alen = [0.0]
for i in range(1, len(outer)): alen.append(alen[-1] + (outer[i].co - outer[i - 1].co).length)
tot = alen[-1] + (outer[0].co - outer[-1].co).length
uv = {v: Vector((math.cos(2 * math.pi * a / tot), math.sin(2 * math.pi * a / tot))) for v, a in zip(outer, alen)}
ii = {v: k for k, v in enumerate(interior)}
rows, cols = [], []
bx = np.zeros(len(interior)); by = np.zeros(len(interior)); deg = np.zeros(len(interior))
for v in interior:
    k = ii[v]
    for e in v.link_edges:
        u = e.other_vert(v)
        if u not in RVs: continue
        if not any(h in RSet for h in e.link_faces): continue
        deg[k] += 1
        if u in ii: rows.append(k); cols.append(ii[u])
        elif u in uv: bx[k] += uv[u].x; by[k] += uv[u].y
rows = np.array(rows); cols = np.array(cols)
def matvec(x):
    y = deg * x
    np.subtract.at(y, rows, x[cols])
    return y
def cg(bv):
    x = np.zeros_like(bv); r = bv - matvec(x); p = r.copy(); rs = r @ r
    for _ in range(3000):
        Ap = matvec(p); al = rs / max(p @ Ap, 1e-30); x += al * p; r -= al * Ap
        rn = r @ r
        if rn < 1e-20: break
        p = r + (rn / rs) * p; rs = rn
    return x
ux = cg(bx); uy = cg(by)
for v in interior: uv[v] = Vector((ux[ii[v]], uy[ii[v]]))
# ---------------------------------------------------------------- old triangles in 2D, with 3D and data
tris = []
for f in R:
    vs = f.verts
    for k in range(1, len(vs) - 1):
        tris.append((vs[0], vs[k], vs[k + 1]))
t2 = BVHTree.FromPolygons([Vector((uv[a].x, uv[a].y, 0)) for tr in tris for a in tr], [(3 * k, 3 * k + 1, 3 * k + 2) for k in range(len(tris))])
oldsurf = BVHTree.FromPolygons([x.co.copy() for tr in tris for x in tr], [(3 * k, 3 * k + 1, 3 * k + 2) for k in range(len(tris))])
A3 = sum(f.calc_area() for f in R)
A2 = sum(abs((uv[tr[1]] - uv[tr[0]]).cross(uv[tr[2]] - uv[tr[0]])) / 2 for tr in tris)
h2 = H3 * math.sqrt(A2 / A3)
# ---------------------------------------------------------------- 3. new even triangulation of the disc
pts = [uv[v] for v in outer]
dy = h2 * math.sqrt(3) / 2
j = 0; yv = -1.0
while yv <= 1.0:
    xo = (h2 / 2) if j % 2 else 0.0
    xv = -1.0 + xo
    while xv <= 1.0:
        p = Vector((xv, yv))
        if p.length < 1 - 0.6 * h2:
            pts.append(p)
        xv += h2
    yv += dy; j += 1
out = delaunay_2d_cdt(pts, [], [list(range(len(outer)))], 1, 1e-9)
overts, oedges, ofaces, orig_v = out[0], out[1], out[2], out[3]
src = [(o[0] if o else None) for o in orig_v]
def lift(p2):
    loc, n, idx, d = t2.find_nearest(Vector((p2.x, p2.y, 0)))
    tr = tris[idx]
    a2 = [Vector((uv[x].x, uv[x].y, 0)) for x in tr]
    a3 = [x.co for x in tr]
    p3 = barycentric_transform(loc, a2[0], a2[1], a2[2], a3[0], a3[1], a3[2])
    w = barycentric_transform(loc, a2[0], a2[1], a2[2], Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    return p3, tr, w
dw = {v: dict(v[dl].items()) for v in RVs}
oc = {v: Vector(v[ocl]) for v in RVs} if ocl else {}
mat_lab = names.index("T_labia") if "T_labia" in names else 0
mat_sm = names.index("T_smalls") if "T_smalls" in names else 0
newverts = []; pending = []
for k, ov in enumerate(overts):
    s_ = src[k]
    if s_ is not None and s_ < len(outer):
        newverts.append(outer[s_]); continue
    p3, tr, w = lift(Vector((ov[0], ov[1])))
    pending.append((k, p3, tr, w)); newverts.append(None)
# ---------------------------------------------------------------- 4. old faces out, new in
bmesh.ops.delete(bm, geom=R, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in interior if v.is_valid and not v.link_faces], context="VERTS")
for k, p3, tr, w in pending:
    v = bm.verts.new(p3)
    wd = {}
    for x, wi in zip(tr, w):
        for gk, gw in dw[x].items(): wd[gk] = wd.get(gk, 0) + gw * max(0.0, wi)
    s_ = sum(wd.values()) or 1.0
    for gk, gw in wd.items(): v[dl][gk] = gw / s_
    if ocl: v[ocl] = sum((oc[x] * max(0.0, wi) for x, wi in zip(tr, w)), Vector())
    newverts[k] = v
made = 0
for fc in ofaces:
    vs = [newverts[i] for i in fc]
    if len(set(vs)) < 3: continue
    try:
        f = bm.faces.new(vs); f.smooth = True; made += 1
    except ValueError:
        continue
lone = [v for v in newverts if v is not None and v not in OS and v.is_valid and not v.link_faces]
bmesh.ops.delete(bm, geom=lone, context="VERTS")
newset = {v for v in newverts if v is not None and v not in OS and v.is_valid and v.link_faces}
NF = [f for f in bm.faces if any(v in newset for v in f.verts)]
bm.normal_update()
NFs = set(NF)
done = set(f for f in bm.faces if f not in NFs)
todo = set(NF)
frontier = [f for f in NF if any(h in done for e in f.edges for h in e.link_faces if h is not f)]
while todo:
    if not frontier:
        frontier = [next(iter(todo))]
    nxt_ = []
    for f in frontier:
        if f not in todo: continue
        ref = None
        for e in f.edges:
            for h in e.link_faces:
                if h is not f and h in done:
                    ref = (e, h); break
            if ref: break
        if ref:
            e, h = ref
            lf = next(l for l in f.loops if l.edge is e); lh = next(l for l in h.loops if l.edge is e)
            if lf.vert is lh.vert: f.normal_flip()
        todo.discard(f); done.add(f)
        for e in f.edges:
            for h in e.link_faces:
                if h in todo: nxt_.append(h)
    frontier = nxt_
# ---------------------------------------------------------------- 5. even out, smooth, shape
bm.normal_update()
inner_new = list(newset)
for rnd in range(int(E("RELAX", 60))):
    upd = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in inner_new if v.link_edges}
    for v, p in upd.items():
        q = oldsurf.find_nearest(v.co.lerp(p, 0.6))[0]
        if q is not None: v.co = q
bm.normal_update()
inner_new = [v for v in inner_new if v.is_valid and v.link_edges]
STc = {v: st(v.co) for v in inner_new}
wsm = {v: sm((RS - abs(STc[v][0])) / 0.008) * sm((STc[v][1] - RT0) / 0.008) * sm((RT1 - STc[v][1]) / 0.008) for v in inner_new}
for it in range(int(E("SMOOTH", 30))):
    for lam in (0.5, -0.53):
        upd = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in inner_new}
        for v, c in upd.items(): v.co = v.co + (c - v.co) * lam * wsm[v]
# the old slit's groove filled in near the midline (so the new slit is the only one)
CWt = {v: (1 - sm((abs(STc[v][0]) - E("CEN_W", 0.003)) / 0.003)) * wsm[v] for v in inner_new}
for it in range(int(E("CENTER", 0))):
    upd = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in inner_new if CWt[v] > 0.01}
    for v, c in upd.items(): v.co = v.co.lerp(c, 0.6 * CWt[v])
for it in range(int(E("MEMBRANE", 0))):
    upd = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in inner_new}
    for v, c in upd.items(): v.co = v.co.lerp(c, 0.6)
bm.normal_update()
OUTN = Vector((0, 0.3, -1))
def nrm(v):
    n = v.normal.copy()
    for e in v.link_edges:
        u = e.other_vert(v); n += u.normal
        for e2 in u.link_edges: n += e2.other_vert(u).normal * 0.5
    n.normalize()
    return n if n.dot(OUTN) > 0 else -n
moves = {}
for v in inner_new:
    s_, t_ = STc[v]
    dh = h_new(s_, t_) - (h_old(s_, t_) if DELTA else 0.0)
    moves[v] = nrm(v) * dh * wsm[v]
for v, m in moves.items(): v.co += m
for it in range(int(E("POST", 3))):
    upd = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in inner_new}
    for v, c in upd.items(): v.co = v.co.lerp(c, 0.25 * wsm[v])
# the seam: a band either side of the old edge smoothed back onto her old surface
band = set(v for v in OS if v.is_valid)
for _ in range(3):
    band |= {e.other_vert(v) for v in list(band) for e in v.link_edges}
band = [v for v in band if not v.is_boundary]
for _ in range(int(E("SEAM", 12))):
    upd = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in band if v.link_edges}
    for v, c in upd.items():
        q = oldsurf.find_nearest(v.co.lerp(c, 0.5))[0]
        if v in newset:
            if q is not None: v.co = q
        elif v in OS: v.co = v.co.lerp(c, 0.3)
# ---------------------------------------------------------------- 6. perineum and its crease to the thighs
# skin behind the lips, close to her midline in 3D (never the thigh walls), not the anus itself
PW = {}
for v in bm.verts:
    if v.is_boundary or not v.link_faces: continue
    if not all(names[f.material_index] in SKN for f in v.link_faces): continue
    if abs(v.co.x) > 0.05 or not (0.84 < v.co.z < 1.0) or not (-0.09 < v.co.y < 0.12): continue
    dm = dmid(v.co)
    if dm > E("PER_D", 0.026): continue
    s_, t_ = st(v.co)
    w = sm((E("PER_T", 0.012) - t_) / 0.012) * sm((E("PER_D", 0.026) - dm) / 0.008) * sm((anus_d(v.co) - 0.002) / 0.006)
    if w > 0.01: PW[v] = w
pnb = {v: [e.other_vert(v) for e in v.link_edges] for v in PW}
for it in range(int(E("PSMOOTH", 40))):
    for lam in (0.5, -0.53):
        upd = {v: sum((u.co for u in ns), Vector()) / len(ns) for v, ns in pnb.items()}
        for v, c in upd.items(): v.co = v.co + (c - v.co) * lam * PW[v]
for f in NF:
    if not f.is_valid: continue
    s_, t_ = st(f.calc_center_median())
    lab = abs(s_) < 0.022 and -0.004 < t_ < L + 0.006
    f.material_index = mat_lab if lab else mat_sm
    if fsl: f[fsl] = 4 if lab else 1
bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
mask = me.attributes.get(".sculpt_mask")
if mask and E("KEEPMASK", 0) == 0: me.attributes.remove(mask)
bad = sum(1 for v in me.vertices if abs(sum(gg.weight for gg in v.groups) - 1) > 0.05)
print("REMESH made faces", made, "new corners", len(newset), "h2", round(h2, 4), "perineum smoothed", len(PW), "verts", len(me.vertices), "weights off", bad)
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
