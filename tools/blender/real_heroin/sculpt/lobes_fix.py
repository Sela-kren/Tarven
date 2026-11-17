"""Back ends of the lips taper flat into the perineum strip (no two round lumps), and the ridge where the strip meets
them smoothed. On the current mesh, topology untouched.
How: a membrane (smoothest surface) is fitted under the back of the vulva with everything round it held; each corner's
height above that membrane is then scaled: kept in full from the middle of the lips forward, down to KMIN at the back.
Headless OUT=<path>."""
import bpy, bmesh, os, math
from mathutils import Vector
from mathutils.kdtree import KDTree
E = lambda k, d: float(os.environ.get(k, d))
BACK_Y = 0.064
sm = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
b = bpy.data.objects["Female_Body"]; me = b.data
names = [x.name for x in me.materials]
SKN = {"T_skin_f", "T_smalls", "T_bra", "T_navel", "T_labia", "T_vulva"}
ANUS = {"T_anus", "T_anus_skin", "T_hole", "T_canal"}
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.normal_update()
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
AV = [v.co.copy() for f in bm.faces if names[f.material_index] in ANUS for v in f.verts]
ak = KDTree(max(1, len(AV))); [ak.insert(c, i) for i, c in enumerate(AV)]; ak.balance()
anus_d = lambda p: ak.find(p)[2] if AV else 1.0
S_MAX, D_MAX = E("S_MAX", 0.024), E("D_MAX", 0.020)
T_LO, T_HI = E("T_LO", -0.022), E("T_HI", 0.048)
reg = {}
for v in bm.verts:
    if not v.link_faces or v.is_boundary: continue
    if not all(names[f.material_index] in SKN for f in v.link_faces): continue
    if abs(v.co.x) > S_MAX or not (0.84 < v.co.z < 1.0) or not (-0.05 < v.co.y < 0.14): continue
    dm = dmid(v.co)
    if dm > D_MAX: continue
    s, t = st(v.co)
    if not (T_LO < t < T_HI) or anus_d(v.co) < 0.004: continue
    reg[v] = (s, t, dm)
# membrane under it (everything outside held)
B = {v: v.co.copy() for v in reg}
nb = {v: [e.other_vert(v) for e in v.link_edges] for v in reg}
for _ in range(int(E("MEM_IT", 400))):
    B = {v: sum(((B[u] if u in B else u.co) for u in ns), Vector()) / len(ns) for v, ns in nb.items()}
# heights scaled: full from T_KEEP forward, KMIN at the back
KMIN = E("KMIN", 0.25); T_BACK, T_KEEP = E("T_BACK", -0.004), E("T_KEEP", 0.036)
for v, (s, t, dm) in reg.items():
    k = KMIN + (1 - KMIN) * sm((t - T_BACK) / (T_KEEP - T_BACK))
    # fade the effect out toward the region's own edges, so no step there
    edge = sm((S_MAX - abs(s)) / 0.006) * sm((D_MAX - dm) / 0.005) * sm((t - T_LO) / 0.006) * sm((T_HI - t) / 0.008) \
        * sm((anus_d(v.co) - 0.004) / 0.006)
    k = 1 - (1 - k) * edge
    v.co = B[v] + (v.co - B[v]) * k
# fine wrinkles out (Taubin keeps the volume)
EW = {v: sm((S_MAX - abs(s)) / 0.006) * sm((D_MAX - dm) / 0.005) * sm((t - T_LO) / 0.006) * sm((T_HI - t) / 0.022)
      for v, (s, t, dm) in reg.items()}
for _ in range(int(E("TAUBIN", 0))):
    for lam in (0.5, -0.53):
        upd = {v: sum((u.co for u in nb[v]), Vector()) / len(nb[v]) for v in reg}
        for v, c in upd.items(): v.co = v.co + (c - v.co) * lam * EW[v]
# the ridge where the strip meets the lips' back ends, and the strip's front edge
W = {}
for v, (s, t, dm) in reg.items():
    w = math.exp(-((t - E("RIDGE_T", -0.010)) / 0.007) ** 2) * sm((0.016 - dm) / 0.005) * sm((anus_d(v.co) - 0.004) / 0.006)
    if w > 0.02: W[v] = w
for _ in range(int(E("RIDGE_IT", 30))):
    upd = {v: sum((u.co for u in nb[v]), Vector()) / len(nb[v]) for v in W}
    for v, c in upd.items(): v.co = v.co.lerp(c, 0.5 * W[v])
bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
print("LOBES region", len(reg), "ridge", len(W), "verts", len(me.vertices))
if os.environ.get("OUT"):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
