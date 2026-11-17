"""Small targeted fixes on the user's own cleaned mesh (no remesh, topology untouched):
A. the cleft running back from the slit (the 'second butt' look): filled in near her midline behind the slit's back
   part, so the lips' back ends meet as one smooth ridge (plain Laplacian = membrane over the crease);
B. the crumpled strip and the step in front of the anus: smoothed, only skin close to her midline (never the thigh
   walls) and not the anus disc.
Mask cleared. Headless OUT=<path>."""
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
skin = [v for v in bm.verts if v.link_faces and not v.is_boundary and abs(v.co.x) < 0.05 and 0.84 < v.co.z < 1.0
        and -0.09 < v.co.y < 0.17 and all(names[f.material_index] in SKN for f in v.link_faces)]
ST = {v: st(v.co) for v in skin}
def lap(W, iters, lam=0.5):
    nb = {v: [e.other_vert(v) for e in v.link_edges] for v in W}
    for _ in range(iters):
        upd = {v: sum((u.co for u in ns), Vector()) / len(ns) for v, ns in nb.items()}
        for v, c in upd.items(): v.co = v.co.lerp(c, lam * W[v])
# A. the cleft behind the slit
T1 = E("CLEFT_T1", 0.022)          # fill from here back (the slit stays in front of it)
WA = {}
for v in skin:
    s, t = ST[v]
    if dmid(v.co) > 0.012: continue
    w = (1 - sm((abs(s) - E("CLEFT_W", 0.005)) / 0.005)) * sm((T1 - t) / 0.010) * sm((t + 0.03) / 0.01)
    if w > 0.01: WA[v] = w
lap(WA, int(E("CLEFT_IT", 50)))
# B. the perineum strip in front of the anus
WB = {}
for v in skin:
    s, t = ST[v]; dm = dmid(v.co)
    if dm > E("PER_D", 0.018): continue
    w = sm((E("PER_T", -0.004) - t) / 0.010) * sm((E("PER_D", 0.018) - dm) / 0.006) * sm((anus_d(v.co) - 0.002) / 0.006)
    if w > 0.01: WB[v] = w
lap(WB, int(E("PER_IT", 40)))
bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
mask = me.attributes.get(".sculpt_mask")
if mask: me.attributes.remove(mask)
print("FIX4 cleft verts", len(WA), "perineum verts", len(WB), "verts", len(me.vertices))
if os.environ.get("OUT"):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
