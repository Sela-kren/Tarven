"""Her anus at rest: centred on her midline in the cleft, small, nearly closed and nearly flat, one smooth surface with
her skin. Headless:  OUT=<path.blend> blender -b <file> --python anus_fix_final.py   (saves there)
Live:      run it in the open Blender's Text Editor (switches Female_Body to Object Mode for the edit, back to Sculpt).
Tunables: env A_<NAME> overrides any PRM / PRM_I value below (e.g. A_RIM=0.001, A_Y=0.015).

Works on Female_Body's rest coordinates (me.vertices[i].co). No vertices or faces are added or removed (UVs and
materials untouched). Nothing at y >= YMAX (the vulva is y 0.06-0.13) and no vulva / labia / vaginal-canal / pubic
corner is moved. No BMesh is used.

The anus faces (T_anus, T_anus_skin) carry each corner's ring in UV u (x12: 0 canal bottom .. 4 rim .. 7 end of the
pucker .. 12 the patch edge, welded to her skin) and its spoke in UV v. The patch was subdivided, so u and v are used as
continuous values (rim = u 4, pucker = u 4..7, canal = u < 4), never rounded to find rings or spokes. Steps:
  1. folded skin round the crotch (and the patch's outer rings) relaxed out: only where neighbouring faces fold back
     on each other (normals dot < -0.2);
  2. a zone round the old pocket (the patch and the skin round it) is laid out again over a plane facing out of her
     (s = x across her, t up the cleft, h out of her). Her skin over it: a thin-plate height field fitted to the skin
     round the zone (mirrored about x = 0, so the cleft's middle is on her midline), carried across the zone as a
     spline under a little tension, so the old pocket and the bulge in front of it go;
  3. the centre goes on that surface at x = 0, y = Y. The rim, the pucker and the first rings of skin are laid as
     concentric circles round it, each corner at its spoke's angle (from v); the hole is RIM in radius;
  4. every other corner in the zone is placed by a harmonic fill in (s, t) between those circles and the zone's edge
     (mean-value weights for her skin, spoke-led weights for the patch so its long rings don't pull over the hole),
     lifted onto the surface, the edge's own height carried in so there's no step where the zone meets her skin;
  5. the seams smoothed along the normals (Taubin), folds left round it relaxed, the crumpled perineum in front of it
     smoothed along the normals, and sliver triangles eased open (corners slid along the skin);
  6. a shallow dimple sunk round the hole, and the canal laid as a thin closed tube straight into her from the rim;
  7. (Blender) the zone's and canal's bone weights carried in harmonically from the skin round the zone, so the old
     pocket's corners, now on her skin, follow it when she's posed (each corner's weights stay >= 0 and sum to 1);
     sharp-edge flags cleared and custom normals reset (to the shape's own) on the corners that moved.
"""
import os, math
import numpy as np
try:
    import bpy
except ImportError:      # offline testing with plain numpy
    bpy = None

PRM = dict(
    RIM=0.0008,       # hole radius at rest (m)
    PUCKER=0.0045,    # radius of the pucker's outer ring (u = 7) (m)
    STEP=0.0016,      # past the pucker each ring (one u) this much further out ...
    U_CIRCLE=8.0,     # ... laid as circles up to this ring; the rest is filled in to the skin round it
    DIMPLE=0.0012,    # how far the rim sinks below her skin (m)
    DIMPLE_R=0.0060,  # radius over which the dimple fades out (m)
    CANAL=0.028,      # canal length (m)
    CANAL_R=0.55,     # canal radius at its deep end, relative to the rim's
    Y=0.0160,         # where along her (y) the centre sits; x is 0 (m)
    ZONE_S=0.0140,    # zone half-width across her (m) ...
    ZONE_SF=0.0100,   # ... narrowing to this towards its front end, between the creases of her thighs (m)
    ZONE_T0=-0.026,   # zone reaches this far forward of the old pucker's middle along t (m) ...
    ZONE_T1=0.022,    # ... and this far back up the cleft (m)
    LAM=2.0,          # smoothing of the height field (mm^2)
    TENSION=0.12,     # tension of the fill inside the zone (1/mm^2): higher is flatter
    TRIM=0.0010,      # old corners deeper than the fitted skin by more than this are the old pocket: not used (m)
    RELAX_R=0.045,    # folds are relaxed out of her skin within this distance of the crotch (m)
    YMAX=0.055,       # nothing at or past this y is moved (the vulva is from y = 0.06)
)
PRM_I = dict(SEAM_RINGS=4, SEAM_PASSES=30, SKIN_PASSES=15, SHRINK=0, REWEIGHT=1, RELAX_GROW=0, EASE_IT=30)
for k in list(PRM_I):
    if os.environ.get("A_" + k): PRM_I[k] = int(os.environ["A_" + k])
for k in list(PRM):
    if os.environ.get("A_" + k): PRM[k] = float(os.environ["A_" + k])
RING_W = 0.05          # patch: ring edges' weight in the layout relative to spoke edges
PROTECT = ("T_vulva", "T_labia", "T_canal", "T_hole", "T_pubic")
ANUS = ("T_anus", "T_anus_skin")
DBG = {}


def log(*a):
    print("ANUSFIX", *a)


# ---------------------------------------------------------------- mesh helpers (numpy only)
class Mesh:
    def __init__(self, co, ls, lt, lv, fm, uv, names):
        self.co = co; self.names = list(names)
        self.faces = [lv[s:s + t] for s, t in zip(ls, lt)]
        n = len(co)
        nb = [set() for _ in range(n)]
        self.vf = [[] for _ in range(n)]
        for fi, f in enumerate(self.faces):
            k = len(f)
            for i in range(k):
                a, b = f[i], f[(i + 1) % k]
                nb[a].add(b); nb[b].add(a)
                self.vf[a].append(fi)
        self.nb = [sorted(s) for s in nb]
        ia = [self.names.index(m) for m in ANUS if m in self.names]
        ip = [self.names.index(m) for m in PROTECT if m in self.names]
        self.anus_face = np.isin(fm, ia)
        self.protect_v = np.zeros(n, bool)
        for fi in np.where(np.isin(fm, ip))[0]: self.protect_v[self.faces[fi]] = True
        self.U = np.full(n, -1.0); self.V = np.full(n, -1.0)       # ring (u x12) and spoke (v) per anus corner
        for fi in np.where(self.anus_face)[0]:
            for li in range(ls[fi], ls[fi] + lt[fi]):
                v = lv[li]
                if self.U[v] < 0: self.U[v] = uv[li, 0] * 12; self.V[v] = uv[li, 1]
        q = np.zeros((len(self.faces), 4), int)
        for fi, f in enumerate(self.faces):
            q[fi, :min(4, len(f))] = f[:4]
            if len(f) == 3: q[fi, 3] = f[0]
        self._quad = q

    def face_normals(self, co, fis=None):
        q = self._quad if fis is None else self._quad[fis]
        nn = np.cross(co[q[:, 2]] - co[q[:, 0]], co[q[:, 3]] - co[q[:, 1]])
        return nn / np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-20)


def mvc_rows(m, co, verts):
    """Mean-value weights (Floater) of each vertex over its neighbours, from the geometry `co`: always positive."""
    rows = {}
    for i in verts:
        w = {}
        for fi in m.vf[i]:
            f = list(m.faces[fi]); k = len(f); j = f.index(i)
            a, b = f[j - 1], f[(j + 1) % k]
            ea, eb = co[a] - co[i], co[b] - co[i]
            la, lb = np.linalg.norm(ea), np.linalg.norm(eb)
            if la < 1e-12 or lb < 1e-12: continue
            tn = math.tan(min(math.acos(max(-1.0, min(1.0, float(ea @ eb) / la / lb))), 3.0) / 2)
            w[a] = w.get(a, 0.0) + tn / la
            w[b] = w.get(b, 0.0) + tn / lb
        if not w: w = {j: 1.0 for j in m.nb[i]}
        s = sum(w.values())
        rows[i] = {j: x / s for j, x in w.items()}
    return rows


def harmonic(rows, free, fixed_val, dim):
    """x_i = sum_j w_ij x_j for i in free; the rest from fixed_val."""
    free = list(free); fi = {v: k for k, v in enumerate(free)}
    A = np.eye(len(free)); B = np.zeros((len(free), dim))
    for v in free:
        r = fi[v]
        for j, w in rows[v].items():
            if j in fi: A[r, fi[j]] -= w
            else: B[r] += w * fixed_val[j]
    X = np.linalg.solve(A, B)
    return {v: X[fi[v]] for v in free}


def tps_fit(P, h, lam):
    n = len(P)
    d = np.linalg.norm(P[:, None] - P[None], axis=2)
    K = np.where(d > 0, d * d * np.log(np.maximum(d, 1e-12)), 0.0)
    A = np.zeros((n + 3, n + 3)); A[:n, :n] = K + lam * np.eye(n)
    A[:n, n] = 1; A[:n, n + 1:] = P; A[n, :n] = 1; A[n + 1:, :n] = P.T
    rhs = np.zeros(n + 3); rhs[:n] = h
    return P, np.linalg.solve(A, rhs)


def tps_eval(model, Q):
    P, c = model; n = len(P)
    d = np.linalg.norm(Q[:, None] - P[None], axis=2)
    K = np.where(d > 0, d * d * np.log(np.maximum(d, 1e-12)), 0.0)
    return K @ c[:n] + c[n] + Q @ c[n + 1:]


def tension_fill(H, mask, g, kappa, iters=20000):
    """Fill H where mask is True minimising sum (laplacian H)^2 + kappa * sum |grad H|^2, the rest held (conjugate
    gradients on a grid of step g mm; H in metres)."""
    def lap(X):
        Y = np.zeros_like(X)
        Y[1:-1, 1:-1] = (X[:-2, 1:-1] + X[2:, 1:-1] + X[1:-1, :-2] + X[1:-1, 2:] - 4 * X[1:-1, 1:-1]) / (g * g)
        return Y

    def glap(X):
        Y = np.zeros_like(X)
        Y[:-1] += X[1:] - X[:-1]; Y[1:] += X[:-1] - X[1:]
        Y[:, :-1] += X[:, 1:] - X[:, :-1]; Y[:, 1:] += X[:, :-1] - X[:, 1:]
        return Y / (g * g)
    A = lambda X: lap(lap(X)) - kappa * glap(X)
    S = H * 1000.0
    b = -A(np.where(mask, 0.0, S)) * mask
    x = np.zeros_like(S); r = b.copy(); p = r.copy(); rr = (r * r).sum(); bb = max(1.0, (b * b).sum())
    for it in range(iters):
        Ap = A(p) * mask
        al = rr / max((p * Ap).sum(), 1e-30)
        x += al * p; r -= al * Ap
        rn = (r * r).sum()
        if rn < 1e-14 * bb: break
        p = r + (rn / rr) * p; rr = rn
    return np.where(mask, x, S) / 1000.0


def taubin_normal(m, co, verts, passes, lam=0.5, mu=-0.53, wt=None):
    """Taubin smoothing of `verts`, each step taken along the vertex normal only (corners don't slide); `wt` (per
    vertex, 0..1) fades it out."""
    co = co.copy(); verts = np.array(sorted(verts))
    wv = np.ones(len(verts)) if wt is None else wt[verts]
    if len(verts) == 0 or passes <= 0: return co
    fis = np.array(sorted(set(fi for v in verts for fi in m.vf[v])))
    loc = {fi: k for k, fi in enumerate(fis)}
    vfl = [[loc[fi] for fi in m.vf[v]] for v in verts]
    nbl = [np.array(m.nb[v]) for v in verts]
    for _ in range(passes):
        for f in (lam, mu):
            fn = m.face_normals(co, fis)
            vn = np.array([fn[l].sum(0) for l in vfl]); vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)
            d = np.array([co[nb].mean(0) for nb in nbl]) - co[verts]
            co[verts] += (f * wv)[:, None] * (d * vn).sum(1, keepdims=True) * vn
    return co


def min_angles(m, co, fis):
    out = np.zeros(len(fis))
    for k, fi in enumerate(fis):
        f = m.faces[fi]; p = co[f]; n = len(f); a = 180.0
        for i in range(n):
            u_, w_ = p[i - 1] - p[i], p[(i + 1) % n] - p[i]
            lu, lw = np.linalg.norm(u_), np.linalg.norm(w_)
            if lu < 1e-12 or lw < 1e-12: a = 0.0; break
            a = min(a, math.degrees(math.acos(max(-1.0, min(1.0, float(u_ @ w_) / lu / lw)))))
        out[k] = a
    return out


def ease_slivers(m, co, movable, what, ang=12.0, iters=None):
    """Sliver faces (a corner under `ang` degrees) eased open: their corners slid along her skin (tangentially only)
    towards the middle of their neighbours, so the shape stays and the triangles even out."""
    co = co.copy()
    iters = PRM_I["EASE_IT"] if iters is None else iters
    mv = np.where(movable)[0]
    fset = np.array(sorted(set(fi for v in mv for fi in m.vf[v])))
    if len(fset) == 0: return co
    first = None
    for it in range(iters):
        a = min_angles(m, co, fset)
        bad = fset[a < ang]
        if first is None: first = len(bad)
        if len(bad) == 0: break
        S = sorted(set(v for fi in bad for v in m.faces[fi] if movable[v]))
        fn = m.face_normals(co)
        for v in S:
            nn = fn[m.vf[v]].sum(0); nn /= max(np.linalg.norm(nn), 1e-20)
            d = co[m.nb[v]].mean(0) - co[v]
            co[v] += 0.5 * (d - (d @ nn) * nn)
    log("slivers %s: faces with a corner under %d deg %d -> %d" % (what, ang, first, len(bad)))
    return co


def fold_pairs(m, fset):
    loc = {fi: k for k, fi in enumerate(fset)}
    ef = {}
    for fi in fset:
        f = m.faces[fi]; k = len(f)
        for i in range(k):
            a, b = f[i], f[(i + 1) % k]
            ef.setdefault((a, b) if a < b else (b, a), []).append(loc[fi])
    return np.array([fs for fs in ef.values() if len(fs) == 2])


def relax_folds(m, co, movable, what, iters=100, steps=4):
    """Wherever neighbouring faces fold back on each other (normals dot < -0.2), those corners and the ones round them
    are relaxed towards their neighbours, again until none are left (a wider patch where a fold won't go)."""
    co = co.copy()
    mv = np.where(movable)[0]
    if len(mv) == 0: return co
    fset = np.array(sorted(set(fi for v in mv for fi in m.vf[v])))
    pa = fold_pairs(m, fset)
    nbm = {v: np.array(m.nb[v]) for v in mv}
    first = None; bad = []
    for it in range(iters):
        fn = m.face_normals(co, fset)
        bad = pa[(fn[pa[:, 0]] * fn[pa[:, 1]]).sum(1) < -0.2]
        if first is None: first = len(bad)
        if len(bad) == 0: break
        S = set()
        for fl in bad.ravel(): S.update(m.faces[fset[fl]])
        for _ in range(1 + min(it // 20, PRM_I["RELAX_GROW"])):
            S |= set(w for v in list(S) for w in m.nb[v])
        S = [v for v in S if movable[v]]
        for _ in range(steps):
            avg = np.array([co[nbm[v]].mean(0) for v in S])
            co[S] += 0.5 * (avg - co[S])
    log("relax %s: folded edges %d -> %d" % (what, first, len(bad)))
    return co


# ---------------------------------------------------------------- the fix
def fix(m):
    co0 = m.co.copy(); n = len(co0)
    U, V = m.U, m.V
    av = np.where(U >= 0)[0]
    rim = av[np.abs(U[av] - 4) < 1e-3]
    canal = av[U[av] < 4 - 1e-3]
    pucker = av[(U[av] > 4 - 1e-3) & (U[av] <= 7 + 1e-3)]
    edge = av[U[av] >= 12 - 1e-4]
    if len(rim) < 6 or len(edge) < 6:
        raise RuntimeError("anus patch not found (T_anus / T_anus_skin with ring u in UVs)")
    log("anus corners", len(av), "rim", len(rim), "pucker", len(pucker), "canal", len(canal), "edge", len(edge))
    is_canal = lambda v: 0 <= U[v] < 4 - 1e-3
    rc0 = co0[rim].mean(0)

    # 1. crumpled skin round it relaxed (never the vulva, nor the old pucker/canal, rebuilt below)
    relax_zone = ((~m.protect_v) & (co0[:, 1] < PRM["YMAX"])
                  & (np.linalg.norm(co0 - np.array([0.0, 0.03, 0.915]), axis=1) < PRM["RELAX_R"])
                  & ~((U >= 0) & (U <= 7 + 1e-3)))
    co0 = relax_folds(m, co0, relax_zone, "before")

    # 2. plane facing out of her over the patch, symmetric (no x in its normal)
    fnrm = m.face_normals(co0)
    band = set(int(v) for v in edge); fr = set(band)
    for _ in range(4):
        fr = set(w for v in fr for w in m.nb[v] if U[w] < 0 and w not in band); band |= fr
    N = sum(fnrm[fi] for fi in set(fi for v in band for fi in m.vf[v]) if not m.anus_face[fi]); N[0] = 0
    N /= np.linalg.norm(N)
    Ex = np.array([1.0, 0, 0]); Ey = np.cross(N, Ex)
    O = co0[edge].mean(0); O[0] = 0.0
    to_sth = lambda p: np.stack([(p - O) @ Ex, (p - O) @ Ey, (p - O) @ N], -1)
    from_sth = lambda s: O + s[..., 0:1] * Ex + s[..., 1:2] * Ey + s[..., 2:3] * N
    STH = to_sth(co0)

    # the zone: grown from the rim through corners inside an egg round the old pucker's middle
    t_z = STH[pucker, 1].mean()
    zs, zf, z0, z1 = PRM["ZONE_S"], PRM["ZONE_SF"], PRM["ZONE_T0"], PRM["ZONE_T1"]

    def in_egg(s, t):
        if t >= 0: return (s / zs) ** 2 + (t / z1) ** 2 < 1.0
        f = t / z0
        return (s / (zs + (zf - zs) * f)) ** 2 + f ** 2 < 1.0

    def in_zone(v):
        if m.protect_v[v] or co0[v, 1] >= PRM["YMAX"] or is_canal(v): return False
        return in_egg(STH[v, 0], STH[v, 1] - t_z)
    zone = set(int(v) for v in rim); fr = list(zone)
    while fr:
        nf = []
        for v in fr:
            for w in m.nb[v]:
                if w not in zone and in_zone(w): zone.add(w); nf.append(w)
        fr = nf
    zone_l = sorted(zone)
    bnd = sorted(set(w for v in zone for w in m.nb[v] if w not in zone and not is_canal(w)))
    log("zone corners", len(zone), "edge corners", len(bnd), "y %.1f..%.1f mm" % (co0[zone_l, 1].min() * 1000, co0[zone_l, 1].max() * 1000))

    # her skin there: thin plate fitted to the skin round the zone and the old outer surface in it, shrink-wrapped
    ring = set(bnd); fr = set(bnd)
    for _ in range(5):
        fr = set(w for v in fr for w in m.nb[v] if w not in zone and w not in ring and not is_canal(w)); ring |= fr
    vnrm = np.zeros((n, 3))
    for v in ring | zone: vnrm[v] = sum(fnrm[fi] for fi in m.vf[v])
    facing = lambda v: (vnrm[v] @ N) > 0.15 * np.linalg.norm(vnrm[v])
    bset = set(bnd)
    data = [v for v in ring if v in bset or facing(v)]
    extra = [v for v in zone_l if (U[v] < 0 or U[v] >= 7.5) and facing(v)]

    def fit(vs):
        P_ = STH[vs, :2] * 1000; H_ = STH[vs, 2] * 1000
        mir = np.abs(P_[:, 0]) > 0.3                       # mirrored: symmetric about her midline
        P_ = np.concatenate([P_, P_[mir] * [-1, 1]]); H_ = np.concatenate([H_, H_[mir]])
        mdl = tps_fit(P_, H_, PRM["LAM"])
        return lambda st2: tps_eval(mdl, np.atleast_2d(st2) * 1000) / 1000
    if PRM_I["SHRINK"]:
        keep = list(extra)
        for _ in range(5):
            hf = fit(data + keep)
            if not extra: break
            res = STH[extra, 2] - hf(STH[extra, :2])
            nk = [v for v, x in zip(extra, res) if x > -PRM["TRIM"]]
            if len(nk) == len(keep): break
            keep = nk
        log("shrink-wrap: %d of %d old corners inside the zone kept as her skin" % (len(keep), len(extra)))
    else:
        # only the skin round the zone; inside, a spline under tension on a fine grid (no bulge carried in)
        hout = fit(data)
        g = 0.0005
        zst = STH[zone_l, :2]
        lo = zst.min(0) - 0.005; hi = zst.max(0) + 0.005
        gs_ = np.arange(lo[0], hi[0] + g, g); gt_ = np.arange(lo[1], hi[1] + g, g)
        GS, GT = np.meshgrid(gs_, gt_)
        inside = np.vectorize(lambda s_, t_: in_egg(s_, t_ - t_z))(GS, GT)
        Hg = hout(np.stack([GS.ravel(), GT.ravel()], -1)).reshape(GS.shape)
        Hg = tension_fill(Hg, inside, g * 1000, PRM["TENSION"])

        def hf(st2):
            st2 = np.atleast_2d(st2)
            fx = (st2[:, 0] - gs_[0]) / g; fy = (st2[:, 1] - gt_[0]) / g
            ok_ = (fx >= 0) & (fy >= 0) & (fx < len(gs_) - 1) & (fy < len(gt_) - 1)
            out = hout(st2)
            if ok_.any():
                ix = np.floor(fx[ok_]).astype(int); iy = np.floor(fy[ok_]).astype(int)
                ax_ = fx[ok_] - ix; ay_ = fy[ok_] - iy
                out[ok_] = (Hg[iy, ix] * (1 - ax_) * (1 - ay_) + Hg[iy, ix + 1] * ax_ * (1 - ay_)
                            + Hg[iy + 1, ix] * (1 - ax_) * ay_ + Hg[iy + 1, ix + 1] * ax_ * ay_)
            return out
    DBG.update(hf=hf, STH=STH, zone=zone_l, bnd=bnd, N=N, O=O)

    def surf_normal(st2, e=2e-4):
        st2 = np.atleast_2d(st2)
        gs = (hf(st2 + [e, 0]) - hf(st2 - [e, 0])) / (2 * e)
        gt = (hf(st2 + [0, e]) - hf(st2 - [0, e])) / (2 * e)
        nn = -gs[:, None] * Ex - gt[:, None] * Ey + N
        return nn / np.linalg.norm(nn, axis=1, keepdims=True)

    # 3. the centre on that surface at x = 0, y = Y
    tc = t_z
    for _ in range(30):
        p = from_sth(np.array([0.0, tc, hf([0.0, tc])[0]]))
        tc += (PRM["Y"] - p[1]) / Ey[1] * 0.7
    c_st = np.array([0.0, tc]); c = from_sth(np.array([0.0, tc, hf(c_st)[0]]))
    nC = surf_normal(c_st)[0]; nC[0] = 0.0; nC /= np.linalg.norm(nC)
    e1 = Ex - nC * (Ex @ nC); e1 /= np.linalg.norm(e1); e2 = np.cross(nC, e1)
    log("centre mm", np.round(c * 1000, 2), "skin normal", np.round(nC, 3))

    # spoke angle from v, oriented like the old rim's own angle round its middle
    rn0 = np.linalg.svd(co0[rim] - rc0)[2][2]
    if rn0 @ N < 0: rn0 = -rn0
    a1 = Ex - rn0 * (Ex @ rn0); a1 /= np.linalg.norm(a1); a2 = np.cross(rn0, a1)
    geo = np.arctan2((co0[rim] - rc0) @ a2, (co0[rim] - rc0) @ a1)
    best = None
    for sgn in (1, -1):
        th = sgn * 2 * np.pi * V[rim]
        off = np.angle(np.exp(1j * (geo - th)).mean())
        err = np.abs(np.angle(np.exp(1j * (geo - th - off)))).mean()
        if best is None or err < best[0]: best = (err, sgn, off)
    _, sgn, off = best
    theta = lambda vs: sgn * 2 * np.pi * V[vs] + off

    def ring_r(u):
        f = np.clip((u - 4) / 3, 0, 1)
        return PRM["RIM"] + (PRM["PUCKER"] - PRM["RIM"]) * (f ** 1.15) + np.maximum(0, u - 7) * PRM["STEP"]
    circ = np.array([v for v in av if 4 - 1e-3 < U[v] <= PRM["U_CIRCLE"] + 1e-3 and (v in zone or U[v] <= 7 + 1e-3)])
    th = theta(circ); r = ring_r(U[circ])
    flat = c + r[:, None] * (np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2)
    sth = to_sth(flat); sth[:, 2] = hf(sth[:, :2])
    newpos = {int(v): p for v, p in zip(circ, from_sth(sth))}
    out_r = max(np.linalg.norm(STH[bnd, :2] - c_st, axis=1).min(), 1e-9)
    log("rings as circles out to %.1f mm; nearest zone edge %.1f mm" % (ring_r(PRM["U_CIRCLE"]) * 1000, out_r * 1000))

    # 4. the rest of the zone: harmonic fill in (s, t), then onto her skin
    free = [v for v in zone_l if v not in newpos]
    rows = mvc_rows(m, co0, free)
    for v in free:
        if U[v] >= 0:
            w = {j: (RING_W if abs(U[j] - U[v]) < 1e-3 else 1.0) for j in m.nb[v]}
            s_ = sum(w.values()); rows[v] = {j: x / s_ for j, x in w.items()}
    fixed = {v: STH[v, :2] for v in bnd}
    for v, p in newpos.items(): fixed[v] = to_sth(p)[:2]
    ST = harmonic(rows, free, fixed, 2)
    fixed_r = {v: np.array([STH[v, 2] - hf(STH[v, :2])[0]]) for v in bnd}   # the edge's own height carried in
    for v in newpos: fixed_r[v] = np.array([0.0])
    R = harmonic(rows, free, fixed_r, 1)
    fst = np.array([ST[v] for v in free])
    fh = hf(fst) + np.array([R[v][0] for v in free])
    co = co0.copy()
    for v, s2, h in zip(free, fst, fh): co[v] = from_sth(np.array([s2[0], s2[1], h]))
    for v, p in newpos.items(): co[v] = p

    # 5. seams smoothed along the normals; folds left round it relaxed (outside the zone)
    near = set(zone_l); fr = set(zone_l)
    for _ in range(PRM_I["SEAM_RINGS"]):
        fr = set(w for v in fr for w in m.nb[v] if w not in near and relax_zone[w]); near |= fr
    co = taubin_normal(m, co, [v for v in near if (relax_zone[v] or v in zone) and not (0 <= U[v] < 4 + 1e-3)], PRM_I["SEAM_PASSES"])
    zmask = np.zeros(n, bool); zmask[zone_l] = True
    far = np.linalg.norm(co - c, axis=1) > ring_r(PRM["U_CIRCLE"]) + 0.003
    outer = relax_zone & (~zmask | far) & ~((U >= 0) & (U <= PRM["U_CIRCLE"] + 1e-3))
    co = relax_folds(m, co, outer, "after")
    # the crumpled skin of the perineum in front of it smoothed along the normals, fading out towards the vulva; then
    # sliver triangles round it eased open
    dC = np.linalg.norm(co - np.array([0.0, 0.03, 0.915]), axis=1)
    sm = lambda x: np.clip(x, 0, 1) ** 2 * (3 - 2 * np.clip(x, 0, 1))
    wt = sm((PRM["YMAX"] - co[:, 1]) / 0.008) * sm((PRM["RELAX_R"] - dC) / 0.010)
    peri = outer & ~zmask & (np.abs(co[:, 0]) < 0.013) & (co[:, 1] > 0.02)     # the perineum strip in front of it
    co = taubin_normal(m, co, np.where(peri)[0], PRM_I["SKIN_PASSES"], wt=wt)
    co = ease_slivers(m, co, outer, "round it")

    # 6. dimple round the hole, fading out smoothly; then the canal straight into her
    for v in zone_l:
        x = min(1.0, np.linalg.norm(co[v] - c) / PRM["DIMPLE_R"])
        if x < 1: co[v] = co[v] - nC * PRM["DIMPLE"] * (1 - x * x * (3 - 2 * x))
    for v in pucker:                       # the pucker's own corners (any outside the zone too)
        if v not in zone:
            x = min(1.0, np.linalg.norm(co[v] - c) / PRM["DIMPLE_R"])
            co[v] = co[v] - nC * PRM["DIMPLE"] * (1 - x * x * (3 - 2 * x))
    rcen = co[rim].mean(0)
    if len(canal):
        dep = (4 - U[canal]) / 4 * PRM["CANAL"]
        rr = PRM["RIM"] * (PRM["CANAL_R"] + (1 - PRM["CANAL_R"]) * np.clip(U[canal] / 4, 0, 1))
        rr = np.where(U[canal] < 1e-3, 0.0, rr)
        th = theta(canal)
        co[canal] = rcen - dep[:, None] * nC + rr[:, None] * (np.cos(th)[:, None] * e1 + np.sin(th)[:, None] * e2)
    m.co = co
    return dict(N=N, O=O, c=c, nC=nC, zone=zone_l, bnd=bnd, rcen=rcen, rim=[int(v) for v in rim],
                canal=[int(v) for v in canal])


def rezone_weights(m, info, W):
    """Bone weights for the rebuilt zone, carried in smoothly from the skin round it (harmonic, so each corner's
    weights stay >= 0 and sum to 1): the old pocket's corners, now on her skin, move with it when she's posed. The
    canal takes the rim's. W: {vertex: weight vector} for the zone's edge corners; returns the same for the zone and
    the canal."""
    canal = set(info["canal"])
    rows = mvc_rows(m, m.co, info["zone"])
    for v, r in rows.items():
        r = {j: w for j, w in r.items() if j not in canal}
        s = sum(r.values()); rows[v] = {j: w / s for j, w in r.items()}
    Wz = harmonic(rows, info["zone"], W, len(next(iter(W.values()))))
    rimw = np.mean([Wz[v] for v in info["rim"]], axis=0)
    for v in canal: Wz[v] = rimw.copy()
    for v in Wz:
        x = np.clip(Wz[v], 0, None); x[x < 1e-4] = 0; Wz[v] = x / x.sum()
    return Wz


# ---------------------------------------------------------------- Blender side
def run_blender():
    b = bpy.data.objects["Female_Body"]; me = b.data
    live = not os.environ.get("OUT")
    win = area = reg = None
    if live:
        win = bpy.context.window
        if win is None or not any(a.type == "VIEW_3D" for a in win.screen.areas):
            win = next((w for w in bpy.context.window_manager.windows if any(a.type == "VIEW_3D" for a in w.screen.areas)), None)
        if win is None:
            raise RuntimeError("no 3D View to work in: run headless with OUT=<path.blend>")
        area = next(a for a in win.screen.areas if a.type == "VIEW_3D")
        reg = next(r for r in area.regions if r.type == "WINDOW")
        if b.mode != "OBJECT":
            with bpy.context.temp_override(window=win, area=area, region=reg, active_object=b, object=b):
                bpy.ops.object.mode_set(mode="OBJECT")
    elif b.mode != "OBJECT":
        bpy.context.view_layer.objects.active = b
        try: bpy.ops.object.mode_set(mode="OBJECT")
        except RuntimeError: pass
    n = len(me.vertices)
    co = np.zeros(n * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
    npl = len(me.polygons)
    ls = np.zeros(npl, int); me.polygons.foreach_get("loop_start", ls)
    lt = np.zeros(npl, int); me.polygons.foreach_get("loop_total", lt)
    fm = np.zeros(npl, int); me.polygons.foreach_get("material_index", fm)
    lv = np.zeros(len(me.loops), int); me.loops.foreach_get("vertex_index", lv)
    uv = np.zeros(len(me.loops) * 2); me.uv_layers.active.data.foreach_get("uv", uv); uv = uv.reshape(-1, 2)
    m = Mesh(co.copy(), ls, lt, lv, fm, uv, [x.name for x in me.materials])
    try:
        info = fix(m)
        me.vertices.foreach_set("co", m.co.ravel())
        me.update()
        # the rebuilt zone's bone weights carried in from the skin round it (see rezone_weights)
        if PRM_I["REWEIGHT"] and len(b.vertex_groups):
            G = len(b.vertex_groups)
            def wvec(v):
                x = np.zeros(G)
                for g in me.vertices[v].groups: x[g.group] = g.weight
                return x
            Wn = rezone_weights(m, info, {v: wvec(v) for v in info["bnd"]})
            for v, x in Wn.items():
                old_g = {g.group for g in me.vertices[int(v)].groups}
                for gi in range(G):
                    if x[gi] > 0: b.vertex_groups[gi].add([int(v)], float(x[gi]), "REPLACE")
                    elif gi in old_g: b.vertex_groups[gi].remove([int(v)])
            log("bone weights carried in for", len(Wn), "corners (zone and canal)")
        # where corners moved, her skin is now one smooth surface: no sharp edges, and normals from the shape
        moved = np.linalg.norm(m.co - co, axis=1) > 1e-7
        sa = me.attributes.get("sharp_edge")
        if sa is not None and sa.domain == "EDGE":
            ev = np.zeros(len(me.edges) * 2, int); me.edges.foreach_get("vertices", ev); ev = ev.reshape(-1, 2)
            val = np.zeros(len(me.edges), bool); sa.data.foreach_get("value", val)
            hit = val & (moved[ev[:, 0]] | moved[ev[:, 1]])
            val[hit] = False; sa.data.foreach_set("value", val)
            log("sharp edges cleared", int(hit.sum()))
        if me.has_custom_normals:
            cn = np.zeros(len(me.loops) * 3); me.corner_normals.foreach_get("vector", cn); cn = cn.reshape(-1, 3)
            cn[moved[lv]] = 0.0                     # zero = use the shape's own normal
            me.normals_split_custom_set([tuple(x) for x in cn])
            log("custom normals reset on", int(moved[lv].sum()), "corners")
        me.update()
        log("moved", int((np.linalg.norm(m.co - co, axis=1) > 1e-7).sum()), "corners; rim centre mm",
            np.round(info["rcen"] * 1000, 2))
    finally:
        if live:
            with bpy.context.temp_override(window=win, area=area, region=reg, active_object=b, object=b):
                bpy.ops.object.mode_set(mode="SCULPT")
    if not live:
        bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)


if bpy is not None and __name__ == "__main__":
    run_blender()
