"""Slide real_heroin's anus forward along her crotch (closer to the vulva) and give its pucker radial folds,
working on her POSED shape (the pose saved in the file: the user sculpts her posed, so her rest mesh is only what
makes that pose look right). Each change made to the posed mesh is carried back to the rest mesh exactly through the
vertex's own skinning transform (linear blend skinning is affine per vertex), so bone weights are left as they are.
Headless: SRC=<in.blend> OUT=<out.blend> blender -b --python anus_move_posed.py   Tunables: env AM_<NAME>.
No verts/faces added or removed; UVs, weights untouched. Basis + Anus_Open updated.
Steps (posed space, in a frame on her: x across her, y from the anus toward the vulva, z into her):
 1. base surface B = posed mesh with the pucker faired (bi-harmonic, hole closed by a virtual centre);
 2. every vertex near the perineum/cleft: foot on B + offset in B's frame; foot slid toward the vulva along B by
    DELTA*g (g = 1 on the anus, eased to 0 at the back of the vulva and up the cleft); the anus moves rigidly;
 3. tangential relax + light Taubin on the squeezed/stretched skin; 4. radial folds on the pucker;
 5. posed -> rest through each vertex's skin transform; custom normals reset where verts moved."""
import os, math, bpy, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

P = dict(DELTA=0.022, CORE_F=0.008, CORE_B=0.010, BACK=0.055, STOP_GAP=0.003, X_IN=0.018, X_OUT=0.036,
         D_IN=0.010, D_OUT=0.026, FAIR_U=8.5, POST=30, FOLDS=11, FOLD_A=0.00028, RELAX=30, EPS=0.001)
for k in P:
    if os.environ.get("AM_" + k): P[k] = float(os.environ["AM_" + k])
log = lambda *a: print("AM", *a, flush=True)

bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
n = len(me.vertices); kb = me.shape_keys.key_blocks
def kget(name):
    a = np.zeros(n * 3); kb[name].data.foreach_get("co", a); return a.reshape(-1, 3)
rest = kget("Basis"); key_off = {k.name: kget(k.name) - rest for k in kb if k.name != "Basis"}

def posed(shift=None):
    if shift is not None:
        for k in kb:
            a = kget(k.name) + shift; k.data.foreach_set("co", a.ravel())
        me.vertices.foreach_set("co", (rest + shift).ravel()); me.update()
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    ev = ob.evaluated_get(dg); em = ev.to_mesh()
    a = np.zeros(n * 3); em.vertices.foreach_get("co", a); ev.to_mesh_clear()
    if shift is not None:
        for k in kb:
            a2 = kget(k.name) - shift; k.data.foreach_set("co", a2.ravel())
        me.vertices.foreach_set("co", rest.ravel()); me.update()
    return a.reshape(-1, 3)
Pw = posed()
Acol = [(posed(np.eye(3)[k] * P["EPS"]) - Pw) / P["EPS"] for k in range(3)]
Askin = np.stack(Acol, axis=2)            # n x 3 x 3 : d(posed)/d(rest)
log("skin transforms ok; det range", np.round(np.percentile(np.linalg.det(Askin), [0, 50, 100]), 3))

mats = [m.name.split(".")[0] if m else "" for m in me.materials]
np_ = len(me.polygons)
ls = np.zeros(np_, int); lt = ls.copy(); fm = ls.copy()
me.polygons.foreach_get("loop_start", ls); me.polygons.foreach_get("loop_total", lt); me.polygons.foreach_get("material_index", fm)
lv = np.zeros(len(me.loops), int); me.loops.foreach_get("vertex_index", lv)
uvl = np.zeros(len(me.loops) * 2); me.uv_layers["UVMap"].data.foreach_get("uv", uvl); uvl = uvl.reshape(-1, 2)
faces = [lv[s:s + t] for s, t in zip(ls, lt)]
ed = np.zeros(len(me.edges) * 2, int); me.edges.foreach_get("vertices", ed); ed = ed.reshape(-1, 2)
nb = [[] for _ in range(n)]
for a, b in ed: nb[a].append(b); nb[b].append(a)
iA, iS, iL = mats.index("T_anus"), mats.index("T_anus_skin"), mats.index("T_labia")
U = np.full(n, -1.0); V = np.full(n, -1.0)
for fi in np.where(np.isin(fm, [iA, iS]))[0]:
    for li in range(ls[fi], ls[fi] + lt[fi]):
        v = lv[li]
        if U[v] < 0: U[v] = uvl[li, 0] * 12; V[v] = uvl[li, 1]
anus_v = np.zeros(n, bool); zone_v = np.zeros(n, bool); labia_v = np.zeros(n, bool)
for fi in np.where(fm == iA)[0]: anus_v[faces[fi]] = True
for fi in np.where(np.isin(fm, [iA, iS]))[0]: zone_v[faces[fi]] = True
for fi in np.where(fm == iL)[0]: labia_v[faces[fi]] = True
canal_v = anus_v & (U < 3.95); rim = (U > 3.9) & (U < 4.1)
def ring(mask):
    m = mask.copy()
    for v in np.where(mask)[0]: m[nb[v]] = True
    return m

# ---- frame on her (posed): x across (hips bone x), y anus->vulva, z into her
arm = ob.modifiers["Bones"].object
hx = np.array((arm.matrix_world @ arm.pose.bones["Female_Hips"].matrix).to_3x3() @ Vector((1, 0, 0)))
cA_w = Pw[rim].mean(0)
lab_mid = labia_v & (np.abs(rest[:, 0]) < 0.01)
cV_w = Pw[lab_mid].mean(0)
X = hx / np.linalg.norm(hx)
Y = cV_w - cA_w; Y -= (Y @ X) * X; Y /= np.linalg.norm(Y)
Z = np.cross(X, Y)
# z must point into her: the skin's outward normal at the perineum is -z
mid = (cA_w + cV_w) / 2
per = np.where((np.linalg.norm(Pw - mid, axis=1) < 0.01) & ~anus_v & ~labia_v)[0]
fn_ = np.zeros(3)
for fi in np.where(np.isin(fm, [fm[0]]) | True)[0][:0]: pass
vnp = np.zeros((n, 3))
for f in faces:
    p = Pw[f]; vnp[f] += np.cross(p[2] - p[0], p[-1] - p[1]) if len(f) == 4 else np.cross(p[1] - p[0], p[2] - p[0])
outn = vnp[per].sum(0)
if outn @ Z > 0: Z = -Z; X = -X
Rf = np.array([X, Y, Z])
co = (Pw - cA_w) @ Rf.T                   # posed, in her frame
log("vulva centre in frame mm", ((cV_w - cA_w) @ Rf.T * 1000).round(1))
y_stop = np.percentile(co[labia_v & (np.abs(co[:, 0]) < 0.006), 1], 1) + P["STOP_GAP"]
log("y_stop mm", round(y_stop * 1000, 1))

# ---- 1. base surface B: fair the pucker (hole closed by a virtual centre)
free = zone_v & ~canal_v & (U <= P["FAIR_U"])
for fi in range(np_):
    if fm[fi] not in (iA, iS): free[faces[fi]] = False
S = ring(ring(free)) & ~canal_v; fixed = S & ~free
rim_e = [(a_, b_) for a_, b_ in ed if rim[a_] and rim[b_]]
idx = np.concatenate([np.where(S)[0], [n]]); loc = -np.ones(n + 1, int); loc[idx] = np.arange(len(idx))
nbx = {v: [w for w in nb[v] if loc[w] >= 0] + ([n] if rim[v] else []) for v in idx[:-1]}; nbx[n] = list(np.where(rim)[0])
m = len(idx); L = np.zeros((m, m))
for i, v in enumerate(idx):
    L[i, i] = -1.0
    for j in nbx[v]: L[i, loc[j]] += 1.0 / len(nbx[v])
L2 = L @ L
co1 = np.vstack([co, co[rim].mean(0)])
fr = loc[np.concatenate([np.where(free & S)[0], [n]])]; fx = loc[np.where(fixed)[0]]
Xs = co1[idx].copy(); Xs[fr] = np.linalg.solve(L2[np.ix_(fr, fr)], -L2[np.ix_(fr, fx)] @ Xs[fx])
base = co1.copy(); base[idx] = Xs
log("faired", len(fr), "pucker stands out of the skin by mm", round(float((base[n] - co1[n])[2] * 1000), 2))
keepf = [list(faces[fi]) for fi in range(np_) if not canal_v[faces[fi]].any()] + [[a_, b_, n] for a_, b_ in rim_e]
bvh = BVHTree.FromPolygons([Vector(p) for p in base], keepf)
vn = np.zeros((n + 1, 3))
for f in keepf:
    p = base[f]; vn[f] += np.cross(p[2] - p[0], p[-1] - p[1]) if len(f) == 4 else np.cross(p[1] - p[0], p[2] - p[0])
vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)
def nearest(p):
    loc_, nrm, fi, d = bvh.find_nearest(Vector(p))
    f = keepf[fi]; q = np.array(loc_)
    w = 1.0 / np.maximum(np.linalg.norm(base[f] - q, axis=1), 1e-7) ** 2
    nn = (vn[f] * w[:, None]).sum(0); nn /= np.linalg.norm(nn)
    if nn @ np.array(nrm) < 0: nn = np.array(nrm)
    return q, nn

# ---- midline curve of B (x = 0): lowest hit going into her (+z), z as a function of y
ys = np.arange(-0.075, y_stop + 0.02, 0.001); zs = []
for y in ys:
    r = bvh.ray_cast(Vector((0, y, -0.12)), Vector((0, 0, 1)))
    zs.append(r[0].z if r[0] else np.nan)
zs = np.array(zs); ok = ~np.isnan(zs); zs = np.interp(ys, ys[ok], zs[ok])
for _ in range(3): zs[1:-1] = (zs[:-2] + 2 * zs[1:-1] + zs[2:]) / 4
arc = np.concatenate([[0], np.cumsum(np.hypot(np.diff(ys), np.diff(zs)))])
s_of_y = lambda y: np.interp(y, ys, arc); z_of_y = lambda y: np.interp(y, ys, zs)
def tan_at(y):
    i = int(np.clip(np.searchsorted(ys, y), 1, len(ys) - 1))
    t = np.array([0, ys[i] - ys[i - 1], zs[i] - zs[i - 1]]); return t / np.linalg.norm(t)
cA = co[rim].mean(0); sA = s_of_y(cA[1]); sV = s_of_y(y_stop)
log("arc anus -> vulva back mm", round((sV - sA) * 1000, 1), "after the move", round((sV - sA - P["DELTA"]) * 1000, 1))

# ---- 2. slide
def ramp(x, a, b, e=0.22):
    t = np.clip((x - a) / (b - a), 0, 1); k = 1 / (1 - e)
    return np.where(t < e, k * t * t / (2 * e), np.where(t > 1 - e, 1 - k * (1 - t) ** 2 / (2 * e), k * (t - e / 2)))
yc = np.clip(co[:, 1], ys[0], ys[-1]); s_v = s_of_y(yc)
gs = np.where(s_v >= sA, 1 - ramp(s_v, sA + P["CORE_F"], sV), ramp(s_v, sA - P["CORE_B"] - P["BACK"], sA - P["CORE_B"]))
gs[s_v >= sV] = 0
gx = 1 - ramp(np.abs(co[:, 0]), P["X_IN"], P["X_OUT"])
gd = 1 - ramp(np.abs(co[:, 2] - z_of_y(yc)), P["D_IN"], P["D_OUT"])
g = gs * gx * gd
g[zone_v] = np.maximum(g[zone_v], gs[zone_v])
g[ring(ring(labia_v))] = 0
g[(co[:, 1] > y_stop) | (np.abs(co[:, 0]) > 0.06) | (np.abs(co[:, 2]) > 0.09) | (co[:, 1] < -0.15)] = 0
mv = np.where((g > 1e-4) & ~anus_v)[0]
log("sliding verts", len(mv))
XK = 1.0
def slide(q, nrm, dist):
    steps = max(1, int(abs(dist) / 0.001) + 1); h = dist / steps
    for _ in range(steps):
        t = tan_at(q[1]); t = t - (t @ nrm) * nrm; t[0] *= XK; t /= np.linalg.norm(t)
        q, nrm = nearest(q + h * t)
    return q, nrm
def frame(nrm, y):
    t = tan_at(y); t = t - (t @ nrm) * nrm; t /= np.linalg.norm(t); return np.array([nrm, t, np.cross(nrm, t)])
new = co.copy(); Rv = {}
for v in mv:
    q, nr = nearest(co[v]); F0 = frame(nr, q[1]); d = F0 @ (co[v] - q)
    q2, nr2 = slide(q, nr, P["DELTA"] * g[v]); F1 = frame(nr2, q2[1])
    new[v] = q2 + F1.T @ d; Rv[v] = F1.T @ F0
qA, nA = nearest(base[n]); nA = nA.copy(); nA[0] = 0; nA /= np.linalg.norm(nA); F0 = frame(nA, qA[1])
XK = 0.0; qA2, nA2 = slide(qA, nA, P["DELTA"]); XK = 1.0
hit = bvh.ray_cast(Vector((qA[0], qA2[1], qA2[2] - 0.03)), Vector((0, 0, 1)))
if hit[0]: qA2, nA2 = nearest(np.array(hit[0]))
nA2 = nA2.copy(); nA2[0] = 0; nA2 /= np.linalg.norm(nA2)
F1 = frame(nA2, qA2[1]); R = F1.T @ F0
log("anus centre moved by mm", ((qA2 - qA) * 1000).round(1))
for v in np.where(anus_v)[0]:
    new[v] = qA2 + R @ (co[v] - qA); Rv[v] = R
for v in np.where(zone_v & ~anus_v & (U < 9))[0]:
    w = np.clip((U[v] - 7) / 2, 0, 1); w = w * w * (3 - 2 * w)
    new[v] = (qA2 + R @ (co[v] - qA)) * (1 - w) + new[v] * w

# ---- 3. tangential relax + light Taubin of the moved skin (not the pucker, not the vulva)
rel = np.where((g > 0.02) & ~anus_v & ~(zone_v & (U < 9)) & ~ring(ring(labia_v)))[0]
relw = np.clip(np.minimum(g[rel], 1 - g[rel]) * 4, 0, 1) * 0.45 + 0.15
nbr = [np.array(nb[v]) for v in rel]
for it in range(int(P["RELAX"])):
    upd = []
    for k, v in enumerate(rel):
        d = new[nbr[k]].mean(0) - new[v]; q, nr = nearest(new[v]); off = new[v] - q
        upd.append((v, q, off, (d - (d @ nr) * nr) * relw[k]))
    for v, q, off, d in upd:
        q2, nr2 = nearest(q + d); new[v] = q2 + nr2 * (off @ nr2)
tw = np.clip(g[rel] * 3, 0, 1)
for it in range(int(P["POST"])):
    f = 0.5 if it % 2 == 0 else -0.53
    d = np.array([new[nbr[k]].mean(0) - new[v] for k, v in enumerate(rel)])
    new[rel] += f * d * tw[:, None]
log("relaxed", len(rel))

# ---- 4. radial folds on the pucker
K = int(P["FOLDS"]); ph = np.random.default_rng(7).uniform(0, 2 * np.pi, 3)
vn2 = np.zeros((n, 3))
for f in faces:
    p = new[f]; vn2[f] += np.cross(p[2] - p[0], p[-1] - p[1]) if len(f) == 4 else np.cross(p[1] - p[0], p[2] - p[0])
vn2 /= np.maximum(np.linalg.norm(vn2, axis=1, keepdims=True), 1e-20)
for v in np.where(anus_v & (U >= 3.95) & (U <= 7.5))[0]:
    t = (U[v] - 4) / 3.0
    env = math.sin(math.pi / 2 * min(1, max(0, (U[v] - 3.95) / 0.5))) * max(0, 1 - t) ** 1.1
    th = 2 * math.pi * V[v]
    mod = 1 + 0.35 * math.cos(3 * th + ph[0]) + 0.2 * math.cos(5 * th + ph[1])
    fo = math.cos(K * th + 0.6 * math.sin(2 * th + ph[2]))
    new[v] += vn2[v] * (-P["FOLD_A"] * env * mod * (0.5 - 0.5 * fo))

# ---- 5. posed -> rest
dP_w = (new - co) @ Rf                    # posed change, back in object space
Ainv = np.linalg.inv(Askin)
d_rest = np.einsum("nij,nj->ni", Ainv, dP_w)
moved = np.linalg.norm(dP_w, axis=1) > 2e-6
rest_new = rest + d_rest * moved[:, None]
kb["Basis"].data.foreach_set("co", rest_new.ravel()); me.vertices.foreach_set("co", rest_new.ravel())
for name, off in key_off.items():
    o2 = off.copy()
    for v, Rm in Rv.items():                       # turn the key's offsets with the skin they sit on
        Rw = Rf.T @ Rm @ Rf
        o2[v] = Ainv[v] @ (Rw @ (Askin[v] @ off[v]))
    kb[name].data.foreach_set("co", (rest_new + o2).ravel())
me.update()
try:
    cn = np.zeros(len(me.loops) * 3); me.corner_normals.foreach_get("vector", cn); cn = cn.reshape(-1, 3)
    cn[moved[lv]] = 0; me.normals_split_custom_set(cn.tolist())
except Exception as e:
    log("normals", e)
me.update()
chk = posed()
log("moved verts", int(moved.sum()), "posed check err mm", round(float(np.abs(chk - (cA_w + new @ Rf)).max() * 1000), 3))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
