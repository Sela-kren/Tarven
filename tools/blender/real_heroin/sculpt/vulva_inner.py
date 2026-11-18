"""Build real_heroin's inner vulva inside her slit, on her POSED shape (changes carried back to rest exactly).
SRC=<in.blend> OUT=<out.blend> blender -b --python vulva_inner.py     Tunables: env VI_<NAME> (mm unless noted).
Her outer lips and the inner-lip ridges she has are kept. The skin between the two inner-lip crests (the groove,
which today is a fold whose walls cross through each other at the back) is laid out again:
  - each groove vertex gets (y along the slit, u across: 0 at the left crest .. 1 at the right) from graph distances;
  - a new cross-section per y: the inner lips' inner faces going down into a vestibule (a little wider below, so the
    lips close over it), a floor, and over the back third the vaginal opening: a collapsed slot running into her,
    tilted toward her back; a rounded glans under the hood at the front; a small urethra dimple between;
  - each vertex goes to the point at its u along that cross-section (by arc length); seams eased, light smoothing;
  - faces: vestibule -> T_vulva, canal -> T_canal, its deep end -> T_hole. No verts/faces added; weights kept."""
import bpy, numpy as np, os, sys, heapq, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *

P = dict(FLOOR=4.5, FLOOR_FRONT=3.4, BULGE=0.8, CANAL=24.0, CANAL_W=1.1, CANAL_TILT=20.0, INTRO_A=0.20, INTRO_B=0.48,
         GLANS=1.7, GLANS_R=1.6, GLANS_AT=0.84, URETHRA=0.5, URETHRA_AT=0.6, RIM=0.35, SMOOTH=12, PROM=0.25, XWIN=3.0, BAR=0.4, GLANS_W=0.015, END_B=0.16, END_F=0.08)
for k in P:
    if os.environ.get("VI_" + k): P[k] = float(os.environ["VI_" + k])
mm = 0.001
log = lambda *a: print("VI", *a, flush=True)

bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
M = mesh_arrays(me); nb = M["nb"]; n = len(me.vertices); faces = M["faces"]; fm = M["fm"]
rest = np.zeros(n * 3); me.vertices.foreach_get("co", rest); rest = rest.reshape(-1, 3)
Pw, A = skin_transforms(ob)
c0, Rf = slit_frame(Pw, rest, M)
co = (Pw - c0) @ Rf.T
lab = np.zeros(n, bool)
for fi in np.where(fm == M["mats"].index("T_labia"))[0]: lab[faces[fi]] = True

# ---- crests of the inner lips per y (upper envelope, first local max out from the middle)
ys = np.arange(-0.040, 0.045, 0.001)
band = lab & (np.abs(co[:, 0]) < 0.009)
crest = {}
for y in ys:
    m = band & (np.abs(co[:, 1] - y) < 0.0007)
    if m.sum() < 20: continue
    x = co[m, 0]; z = co[m, 2]
    bins = np.arange(-0.009, 0.0091, 0.0003); env = np.full(len(bins), np.nan)
    for i, b in enumerate(bins):
        s = np.abs(x - b) < 0.00015
        if s.any(): env[i] = z[s].max()
    ok = ~np.isnan(env)
    if ok.sum() < 20: continue
    env = np.interp(bins, bins[ok], env[ok])
    env = np.convolve(env, np.ones(3) / 3, mode="same")
    i0 = int(np.argmin(np.abs(bins)))
    lo = i0 + int(np.argmin(env[i0 - 6:i0 + 7])) - 6          # bottom of the dip near the middle
    def first_max(direction):
        i = lo; best = i
        while 1 <= i < len(bins) - 1:
            i += direction
            if env[i] >= env[best]: best = i
            elif env[best] - env[i] > 0.0002: break
        return best
    L_, R_ = first_max(-1), first_max(+1)
    dip = min(env[L_], env[R_]) - env[lo]
    if dip > P["PROM"] * mm and bins[R_] - bins[L_] > 0.0012:
        crest[round(y, 4)] = (bins[L_], env[L_], bins[R_], env[R_], env[lo])
cy = np.array(sorted(crest)); log("slit with a groove from y mm", round(cy.min() * 1000, 1), "to", round(cy.max() * 1000, 1), len(cy))
# keep the longest run of consecutive y's
runs = np.split(cy, np.where(np.diff(cy) > 0.0015)[0] + 1); cy = max(runs, key=len)
y_b, y_f = cy.min(), cy.max()
C = np.array([crest[round(y, 4)] for y in cy])
for k in range(5):                                           # smooth the crest lines along y
    C[1:-1] = (C[:-2] + 2 * C[1:-1] + C[2:]) / 4
xl = lambda y: np.interp(y, cy, C[:, 0]); zl = lambda y: np.interp(y, cy, C[:, 1])
xr = lambda y: np.interp(y, cy, C[:, 2]); zr = lambda y: np.interp(y, cy, C[:, 3])
log("slit y mm", round(y_b * 1000, 1), round(y_f * 1000, 1), "mid crest gap mm", round(float(np.median(C[:, 2] - C[:, 0])) * 1000, 2))

# ---- groove region G: between the crests, below them, connected to her midline
yv = co[:, 1]; inY = (yv > y_b) & (yv < y_f)
yc = np.clip(yv, y_b, y_f)
halfgap = (xr(yc) - xl(yc)) / 2; xmid_ = (xl(yc) + xr(yc)) / 2
cand = lab & inY & (np.abs(co[:, 0] - xmid_) < halfgap + P["XWIN"] * mm) & (co[:, 2] < np.minimum(zl(yc), zr(yc)) - P["BAR"] * mm)
# the crest lines themselves are the barrier: anything at/over them, or outside them and not deeper than 1 mm under them, stays out
outside = (co[:, 0] < xl(yc) - 0.0001) | (co[:, 0] > xr(yc) + 0.0001)
cand &= ~(outside & (co[:, 2] > np.minimum(zl(yc), zr(yc)) - 0.001))
seed = np.where(cand & (np.abs(rest[:, 0]) < 0.0006))[0]
G = np.zeros(n, bool); G[seed] = True; st = list(seed)
while st:
    v = st.pop()
    for w in nb[v]:
        if cand[w] and not G[w]: G[w] = True; st.append(w)
Gi = np.where(G)[0]; log("groove verts", len(Gi))
if os.environ.get("DUMP"):
    import json; json.dump(dict(g=co[G].tolist(), a=co[lab & (np.abs(co[:, 0]) < 0.012) & (np.abs(co[:, 1]) < 0.045)].tolist()), open(os.environ["DUMP"], "w"))

# ---- u across: graph distances from the left and right borders of G
bd = [v for v in Gi if any(not G[w] for w in nb[v])]
xm = (xl(yc) + xr(yc)) / 2
left_src = [v for v in bd if co[v, 0] < xm[v]]; right_src = [v for v in bd if co[v, 0] >= xm[v]]
def dij(src):
    d = np.full(n, np.inf); h = []
    for v in src: d[v] = 0; h.append((0.0, v))
    heapq.heapify(h)
    while h:
        dv, v = heapq.heappop(h)
        if dv > d[v]: continue
        for w in nb[v]:
            if not G[w]: continue
            nd = dv + np.linalg.norm(Pw[w] - Pw[v])
            if nd < d[w]: d[w] = nd; heapq.heappush(h, (nd, w))
    return d
dL, dR = dij(left_src), dij(right_src)
u = np.full(n, np.nan); u[Gi] = dL[Gi] / np.maximum(dL[Gi] + dR[Gi], 1e-9)
u[left_src] = 0.0; u[right_src] = 1.0
bad = np.isnan(u[Gi]) | np.isinf(dL[Gi]) | np.isinf(dR[Gi])
log("u ok", int((~bad).sum()), "unreached", int(bad.sum()))
G[Gi[bad]] = False; Gi = np.where(G)[0]

# ---- the new cross-section at each y, as a polyline in (x, y-offset, z)
def bell(t, c, w): return np.exp(-0.5 * ((t - c) / w) ** 2)
def section(y):
    s = (y - y_b) / (y_f - y_b)                                    # 0 back .. 1 front
    end = math.sin(math.pi * min(1, max(0, s)) ) ** 0.6           # depth fades at both commissures
    xL, zL, xR, zR = float(xl(y)), float(zl(y)), float(xr(y)), float(zr(y))
    floor = (P["FLOOR"] * (1 - s) + P["FLOOR_FRONT"] * s) * mm * end
    intro = 0.0
    if P["INTRO_A"] < s < P["INTRO_B"]:
        t = (s - P["INTRO_A"]) / (P["INTRO_B"] - P["INTRO_A"]); intro = math.sin(math.pi * t) ** 0.7
    N = 120; th = np.linspace(-math.pi / 2, math.pi / 2, N)
    w = (xR - xL) / 2; xmid = (xL + xR) / 2
    x = xmid + w * np.sin(th) * (1 + P["BULGE"] * np.cos(th) ** 2)
    ztop = zL * (0.5 - th / math.pi) + zR * (0.5 + th / math.pi)
    z = ztop - floor * np.cos(th) ** 0.7
    yo = np.zeros(N)
    # glans: a bead on the floor's middle near the front
    g = P["GLANS"] * mm * bell(s, P["GLANS_AT"], P["GLANS_W"]) * np.cos(th) ** 6
    z += g
    # urethra: a small dimple
    z -= P["URETHRA"] * mm * bell(s, P["URETHRA_AT"], 0.025) * bell(th, 0, 0.12)
    if intro > 0:
        # the opening: a collapsed slot down the middle of the floor, its rim raised a little
        cw = P["CANAL_W"] * mm / max(w, 1e-4)                      # slot half-width as a fraction of the opening
        a = np.clip(np.abs(np.sin(th)) / max(cw, 1e-3), 0, 1)       # 0 in the slot's middle .. 1 at its lips
        dep = P["CANAL"] * mm * intro * (1 - a ** 2) ** 0.5
        z += P["RIM"] * mm * intro * bell(a, 1.0, 0.25)
        tilt = math.radians(P["CANAL_TILT"])
        z -= dep * math.cos(tilt); yo -= dep * math.sin(tilt)
        # squeeze the slot's walls together as it goes in (a collapsed canal)
        x = xmid + (x - xmid) * (1 - 0.75 * (1 - a) * intro)
    pts = np.stack([x, yo, z], 1)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1); arc = np.concatenate([[0], np.cumsum(seg)]); arc /= arc[-1]
    return pts, arc
sec_y = np.arange(y_b, y_f + 1e-9, 0.0005); secs = [section(y) for y in sec_y]
def place(v):
    y = co[v, 1]; i = int(np.clip(np.searchsorted(sec_y, y) - 1, 0, len(sec_y) - 2)); t = (y - sec_y[i]) / (sec_y[i + 1] - sec_y[i])
    p = []
    for j in (i, i + 1):
        pts, arc = secs[j]; p.append(np.array([np.interp(u[v], arc, pts[:, k]) for k in range(3)]))
    q = p[0] * (1 - t) + p[1] * t
    return np.array([q[0], y + q[1], q[2]])
new = co.copy()
for v in Gi: new[v] = place(v)
# ease: verts right by the border keep some of their old place; then light smoothing inside G
edge = np.minimum(u, 1 - u)
wgt = np.clip(edge[Gi] / 0.08, 0, 1); wgt = wgt * wgt * (3 - 2 * wgt)
sG = (co[Gi, 1] - y_b) / (y_f - y_b)                     # keep her own shape at both ends of the slit
we = np.clip(np.minimum(sG / P["END_B"], (1 - sG) / P["END_F"]), 0, 1); we = we * we * (3 - 2 * we)
wgt *= we
new[Gi] = co[Gi] * (1 - wgt[:, None]) + new[Gi] * wgt[:, None]
inner = np.array([v for v in Gi if all(G[w] for w in nb[v])]); nbr = [np.array(nb[v]) for v in inner]
for it in range(int(P["SMOOTH"])):
    f = 0.5 if it % 2 == 0 else -0.52
    new[inner] += f * (np.array([new[k].mean(0) for k in nbr]) - new[inner])
log("placed")

# ---- materials for the new faces
names = [m.name if m else "" for m in me.materials]
def mi(base): return [i for i, nm in enumerate(names) if nm.split(".")[0] == base][0]
iV, iC, iH = mi("T_vulva"), mi("T_canal"), mi("T_hole")
ztop_v = np.minimum(zl(np.clip(new[:, 1], y_b, y_f)), zr(np.clip(new[:, 1], y_b, y_f)))
depth = ztop_v - new[:, 2]
fmn = fm.copy(); cnt = {"vulva": 0, "canal": 0, "hole": 0}
floor_d = lambda y: ((P["FLOOR"] * (1 - (y - y_b) / (y_f - y_b)) + P["FLOOR_FRONT"] * (y - y_b) / (y_f - y_b)) * mm)
for fi in range(len(faces)):
    f = faces[fi]
    if not G[f].all(): continue
    d = depth[f].mean(); fd = floor_d(np.clip(co[f, 1].mean(), y_b, y_f))
    if d > fd + 0.55 * P["CANAL"] * mm: fmn[fi] = iH; cnt["hole"] += 1
    elif d > fd + 1.2 * mm: fmn[fi] = iC; cnt["canal"] += 1
    elif d > 0.8 * mm: fmn[fi] = iV; cnt["vulva"] += 1
me.polygons.foreach_set("material_index", fmn)
log("faces", cnt)

moved = write_posed_change(ob, Pw, c0 + new @ Rf, A)
chk = evaluated(ob)
log("moved", int(moved.sum()), "posed check err mm", round(float(np.abs(chk - (c0 + new @ Rf)).max() * 1000), 3))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
