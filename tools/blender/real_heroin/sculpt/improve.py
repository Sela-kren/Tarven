"""Clean-up + improvement pass on real_heroin's vulva/anus, on her POSED shape (carried back to rest exactly).
SRC=<in.blend> OUT=<out.blend> blender -b --python improve.py      Tunables: env IM_<NAME>; stages by IM_STAGES.
Stages (in order):
  folds  - faces folded over each other round the crotch (posed; adjacent normals dot < FOLD_DOT) are relaxed
           (Laplacian, a few rings round them, feathered) until they open; the canal, urethra pit and anal canal
           are left out, and so is the clit (KEEP mm round it);
  edges  - the ragged lines along the slit's edges: the band where the inner lips meet the vestibule is smoothed
           (Taubin, keeps volume);
  lips   - fuller inner lips: that band (and the top of the vestibule walls under it) lifted out of her LIPS mm,
           most in the middle of the slit, with a slow wave along each lip (different on each side);
  rim    - the vaginal opening's rim and the first mm inside: Taubin smoothing so it reads as one clean ring;
  ridge  - the old crescent ridge in front of the anus softened.
Every stage reports what it did; folds are counted before/after."""
import bpy, numpy as np, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *

P = dict(FOLD_DOT=-0.2, RINGS=4, F_IT=40, KEEP=5.0, E_IT=16, E_BAND=1.6, LIPS=1.1, WAVE=0.3, R_IT=14, R_RAD=3.0,
         RIDGE_IT=20, N_RINGS=14, N_IT=80, RL_RINGS=7, RIDGE_OUT=5, CUFF_RINGS=8, CUFF_IT=40, F_T0=6.5, F_T1=21.0, F_XW=9.0, RF_U=8.6, RF_OUT=2, RF_ORDER=1, RF_MIX=0.85, U_ROUNDS=12, U_IT=4, P_T0=6.0, P_XW=11.0, P_IT=30, B_T0=14.0, B_T1=29.0, B_XW=16.0, B_IT=40, B_H=9.0, B_TAUBIN=1, B_E=2.5, B_ANS=0.0, NO_VULVA=0, L_T0=7.0, L_T1=31.0, L_XW=24.0, L_H=16.0, L_U=9.0, NS_T0=4.0, NS_T1=30.0, NS_XW=20.0, NS_H=13.0, NS_E=5.0, NS_U=7.8, NS_IT=120, CLIT="-0.00003,0.11944,0.91619")
for k in P:
    if os.environ.get("IM_" + k): P[k] = type(P[k])(os.environ["IM_" + k])
STAGES = os.environ.get("IM_STAGES", "folds,edges,lips,rim,ridge,folds").split(",")
mm = 0.001
log = lambda *a: print("IM", *a, flush=True)
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
M = mesh_arrays(me); faces = M["faces"]; fm = M["fm"]; nb = M["nb"]; n = len(me.vertices)
rest = np.zeros(n * 3); me.vertices.foreach_get("co", rest); rest = rest.reshape(-1, 3)
Pw, A = skin_transforms(ob)
c0, Rf = slit_frame(Pw, rest, M)
def vmask(*names):
    m = np.zeros(n, bool)
    for nm in names:
        if nm in M["mats"]:
            for fi in np.where(fm == M["mats"].index(nm))[0]: m[faces[fi]] = True
    return m
lab, vul, can, hol, anu, ans = (vmask(x) for x in ("T_labia", "T_vulva", "T_canal", "T_hole", "T_anus", "T_anus_skin"))
clit = np.array([float(x) for x in P["CLIT"].split(",")])
keep = np.linalg.norm(Pw - clit, axis=1) < P["KEEP"] * mm
cA = Pw[anu].mean(0); cV = Pw[lab].mean(0)
crotch = (np.linalg.norm(Pw - cV, axis=1) < 0.065) | (np.linalg.norm(Pw - cA, axis=1) < 0.06)
frozen = keep | can | hol | anu
new = Pw.copy()
q4 = np.array([[f[0], f[1], f[2], f[3] if len(f) == 4 else f[0]] for f in faces])
edge_faces = {}
for fi, f in enumerate(faces):
    for i in range(len(f)):
        a, b = f[i], f[(i + 1) % len(f)]; edge_faces.setdefault((min(a, b), max(a, b)), []).append(fi)
pairs = np.array([fs for fs in edge_faces.values() if len(fs) == 2])
def folds(P_):
    nn = np.cross(P_[q4[:, 2]] - P_[q4[:, 0]], P_[q4[:, 3]] - P_[q4[:, 1]]); nn /= np.maximum(np.linalg.norm(nn, axis=1), 1e-20)[:, None]
    d = (nn[pairs[:, 0]] * nn[pairs[:, 1]]).sum(1)
    bad = pairs[d < P["FOLD_DOT"]]
    vs = np.zeros(n, bool)
    for a, b in bad:
        vs[faces[a]] = True; vs[faces[b]] = True
    vs = vs & crotch & ~frozen
    if P["NO_VULVA"]: vs &= ~NOVUL
    return vs
def grow(mask, k):
    m = mask.copy()
    for _ in range(k):
        m2 = m.copy()
        for v in np.where(m)[0]: m2[nb[v]] = True
        m = m2
    return m
def smooth(P_, verts, w, it, taubin=False):
    nbr = [np.array(nb[v]) for v in verts]
    for i in range(it):
        f = (0.5 if i % 2 == 0 else -0.53) if taubin else 0.5
        d = np.array([P_[k].mean(0) for k in nbr]) - P_[verts]
        P_[verts] += f * d * w[:, None]
    return P_
def ringw(core, k):
    """weight 1 on core, fading over k rings"""
    w = np.zeros(n); w[core] = 1.0; m = core.copy()
    for r in range(1, k + 1):
        m2 = grow(m, 1); w[m2 & ~m] = 1 - r / (k + 1); m = m2
    return m, w

NOVUL = np.zeros(n, bool)
if P["NO_VULVA"]:
    NOVUL = grow(lab | vul | can | hol, 3)
    frozen = frozen | NOVUL
co = (new - c0) @ Rf.T                                         # slit frame (x across, y along, z out)
for st in STAGES:
    if st == "folds":
        fv = folds(new); log("folds: verts on folded faces", int(fv.sum()))
        for rnd in range(3):
            if not fv.any(): break
            reg, w = ringw(fv, int(P["RINGS"])); reg &= ~frozen
            vs = np.where(reg)[0]; new = smooth(new, vs, w[vs], int(P["F_IT"]))
            fv = folds(new); log("  round", rnd, "relaxed", len(vs), "-> folded verts left", int(fv.sum()))
    elif st == "notch":
        # the crease in the bum cleft behind the anus: a bigger, softer relax round whatever is folded there
        back = (cA - cV) / np.linalg.norm(cA - cV)
        behind = ((new - cA) @ back > 0.02) & (np.linalg.norm(new - cA, axis=1) < 0.08)
        fv = folds(new) & behind
        log("notch: folded verts behind the anus", int(fv.sum()))
        for rnd in range(3):
            if not fv.any(): break
            reg, w = ringw(fv, int(P["N_RINGS"])); reg &= ~frozen
            vs = np.where(reg)[0]; new = smooth(new, vs, w[vs], int(P["N_IT"]))
            fv = folds(new) & behind; log("  round", rnd, "relaxed", len(vs), "-> left", int(fv.sum()))
    elif st == "relay":
        # pleats (skin folded flat back on itself) can't be smoothed open: lay the patch round each one out again.
        # Patch = RL_RINGS rings round the folded verts; its rim is kept; inside: a Tutte (fold-free) layout on the plane
        # of the rim, heights filled bi-harmonically from the rim's two outer rings.
        fv = folds(new) & ~(lab | vul | keep)
        log("relay: folded verts outside the vulva", int(fv.sum()))
        done = np.zeros(n, bool)
        for seed in np.where(fv)[0]:
            if done[seed]: continue
            core = np.zeros(n, bool); core[seed] = True
            # this pleat's cluster
            st_ = [seed]
            while st_:
                v = st_.pop()
                for w_ in nb[v]:
                    if fv[w_] and not core[w_]: core[w_] = True; st_.append(w_)
            done |= core
            R = grow(core, int(P["RL_RINGS"])) & ~frozen
            rim1 = R & ~grow(core, int(P["RL_RINGS"]) - 1); rim2 = R & ~grow(core, int(P["RL_RINGS"]) - 2)
            inner = R & ~rim2
            idx = np.where(R)[0]; loc = -np.ones(n, int); loc[idx] = np.arange(len(idx))
            pts = new[idx]; c_ = new[np.where(rim2)[0]].mean(0)
            u_, s_, vt_ = np.linalg.svd(new[np.where(rim2)[0]] - c_); ex, ey, nz = vt_[0], vt_[1], vt_[2]
            uv = np.stack([(pts - c_) @ ex, (pts - c_) @ ey], 1); h = (pts - c_) @ nz
            m_ = len(idx); L = np.zeros((m_, m_))
            for i, v in enumerate(idx):
                ns = [loc[w_] for w_ in nb[v] if loc[w_] >= 0]
                L[i, i] = -1.0
                for j in ns: L[i, j] += 1.0 / len(ns)
            fr = loc[np.where(inner)[0]]; fx = loc[np.where(rim2)[0]]
            if len(fr) == 0: continue
            uv[fr] = np.linalg.solve(L[np.ix_(fr, fr)], -L[np.ix_(fr, fx)] @ uv[fx])          # Tutte
            L2 = L @ L
            h[fr] = np.linalg.solve(L2[np.ix_(fr, fr)], -L2[np.ix_(fr, fx)] @ h[fx])          # bi-harmonic heights
            new[idx[fr]] = c_ + np.outer(uv[fr, 0], ex) + np.outer(uv[fr, 1], ey) + np.outer(h[fr], nz)
            log("  pleat of", int(core.sum()), "verts: patch", len(idx), "laid out", len(fr), "at mm", (new[seed] * 1000).round(1).tolist())
        log("  folded verts outside the vulva now", int((folds(new) & ~(lab | vul | keep)).sum()))
    elif st == "cuff":
        # the step where the vulva's skin patch meets the perineum behind it: smooth a band either side of that seam
        back = (cA - cV) / np.linalg.norm(cA - cV)
        seam = np.zeros(n, bool)
        for v in np.where(lab)[0]:
            if any(not lab[w_] for w_ in nb[v]): seam[v] = True
        cvy = (new - cV) @ back
        seam &= cvy > 0.012                                      # only its back part (toward the anus)
        reg, w = ringw(seam, int(P["CUFF_RINGS"]))
        reg &= ~frozen & ~grow(vul, 6)
        vs = np.where(reg)[0]
        new = smooth(new, vs, w[vs], int(P["CUFF_IT"]), taubin=True)
        log("cuff: seam verts", int(seam.sum()), "smoothed", len(vs))
    elif st == "fill":
        # the ridge in front of the anus: refill the skin strip between the pucker and the perineum with a smooth
        # (bi-harmonic) surface; only heights along the skin's normal change
        vn_ = vert_normals(new, faces)
        mid = (cA + cV) / 2
        nA = vn_[np.argsort(np.linalg.norm(new - mid, axis=1))[:300]].mean(0); nA /= np.linalg.norm(nA)
        fwd = cV - cA; fwd -= (fwd @ nA) * nA; fwd /= np.linalg.norm(fwd); lat = np.cross(nA, fwd)
        rel = new - cA; t_ = rel @ fwd; x_ = rel @ lat; h_ = rel @ nA
        reg = (t_ > P["F_T0"] * mm) & (t_ < P["F_T1"] * mm) & (np.abs(x_) < P["F_XW"] * mm) & (np.abs(h_) < 0.012) & ~frozen
        # keep only the sheet connected to the perineum's middle
        seed = np.where(reg)[0][np.argmin(np.abs(x_[reg]) + np.abs(t_[reg] - (P["F_T0"] + P["F_T1"]) / 2 * mm))]
        comp = np.zeros(n, bool); comp[seed] = True; st_ = [seed]
        while st_:
            v = st_.pop()
            for w_ in nb[v]:
                if reg[w_] and not comp[w_]: comp[w_] = True; st_.append(w_)
        inner = comp & ~grow(~comp, 2)
        allv = np.where(grow(comp, 0))[0]
        idx = allv; loc = -np.ones(n, int); loc[idx] = np.arange(len(idx))
        m_ = len(idx); L = np.zeros((m_, m_))
        for i, v in enumerate(idx):
            ns = [loc[w_] for w_ in nb[v] if loc[w_] >= 0]
            L[i, i] = -1.0
            for j in ns: L[i, j] += 1.0 / len(ns)
        fr = loc[np.where(inner)[0]]; fx = loc[np.where(comp & ~inner)[0]]
        hh = h_[idx].copy(); L2 = L @ L
        hh[fr] = np.linalg.solve(L2[np.ix_(fr, fr)], -L2[np.ix_(fr, fx)] @ hh[fx])
        new[idx[fr]] += np.outer(hh[fr] - h_[idx[fr]], nA)
        log("fill: strip verts", len(idx), "refilled", len(fr), "max change mm", round(float(np.abs(hh[fr] - h_[idx[fr]]).max() * 1000), 2))
    elif st == "ringfill":
        # the anus patch's coarse outer rings (and one ring of skin past them) refilled bi-harmonically between the
        # pucker (inside) and her skin (outside), both held
        ls_, lt_ = M["ls"], M["lt"]
        uvl = np.zeros(len(me.loops) * 2); me.uv_layers["UVMap"].data.foreach_get("uv", uvl); uvl = uvl.reshape(-1, 2)
        U = np.full(n, -1.0); iS = M["mats"].index("T_anus_skin")
        for fi in np.where(fm == iS)[0]:
            for li in range(ls_[fi], ls_[fi] + lt_[fi]):
                if U[M["lv"][li]] < 0: U[M["lv"][li]] = uvl[li, 0] * 12
        free = grow(ans & (U > P["RF_U"]), int(P["RF_OUT"])) & ~frozen & ~(ans & (U <= P["RF_U"])) & ~grow(lab, 3)
        S = grow(free, 2)
        idx = np.where(S)[0]; loc = -np.ones(n, int); loc[idx] = np.arange(len(idx))
        m_ = len(idx); L = np.zeros((m_, m_))
        for i, v in enumerate(idx):
            ns = [loc[w_] for w_ in nb[v] if loc[w_] >= 0]
            L[i, i] = -1.0
            for j in ns: L[i, j] += 1.0 / len(ns)
        fr = loc[np.where(free)[0]]; fx = loc[np.where(S & ~free)[0]]
        X = new[idx].copy(); L2 = L @ L if P["RF_ORDER"] == 2 else L
        X[fr] = np.linalg.solve(L2[np.ix_(fr, fr)], -L2[np.ix_(fr, fx)] @ X[fx])
        if P["RF_ORDER"] != 2:
            X[fr] = new[idx[fr]] * (1 - P["RF_MIX"]) + X[fr] * P["RF_MIX"]
        ch = np.linalg.norm(X[fr] - new[idx[fr]], axis=1)
        new[idx[fr]] = X[fr]
        log("ringfill: refilled", len(fr), "max change mm", round(float(ch.max() * 1000), 2), "mean", round(float(ch.mean() * 1000), 2))
    elif st == "untangle":
        # faces passing through each other round the vulva: relax just those (and a ring round them) until they clear
        from mathutils import Vector as _V
        from mathutils.bvhtree import BVHTree as _B
        fsel = [i for i, f in enumerate(faces) if crotch[f].all()]
        tris, own = [], []
        for i in fsel:
            f = faces[i]
            for k in range(1, len(f) - 1): tris.append((f[0], f[k], f[k + 1])); own.append(i)
        def crossing(P_):
            bv = _B.FromPolygons([_V(p) for p in P_], tris)
            vs = np.zeros(n, bool)
            for a, b in bv.overlap(bv):
                if set(tris[a]) & set(tris[b]): continue
                vs[faces[own[a]]] = True; vs[faces[own[b]]] = True
            return vs
        cv = crossing(new) & ~(can | hol | anu); log("untangle: verts on crossing faces", int(cv.sum()))
        for rnd in range(int(P["U_ROUNDS"])):
            if not cv.any(): break
            reg, w = ringw(cv, 1); reg &= ~(can | hol | anu)
            vs = np.where(reg)[0]; new = smooth(new, vs, w[vs], int(P["U_IT"]))
            cv = crossing(new) & ~(can | hol | anu)
            log("  round", rnd, "relaxed", len(vs), "-> crossing verts left", int(cv.sum()))
    elif st == "perineum":
        # the strip from the vulva's back to the anus: plain Laplacian (it's nearly flat, so no shrink to speak of)
        mid = (cA + cV) / 2; vn_ = vert_normals(new, faces)
        nA = vn_[np.argsort(np.linalg.norm(new - mid, axis=1))[:300]].mean(0); nA /= np.linalg.norm(nA)
        fwd = cV - cA; fwd -= (fwd @ nA) * nA; fwd /= np.linalg.norm(fwd); lat = np.cross(nA, fwd)
        rel = new - cA; t_ = rel @ fwd * 1000; x_ = rel @ lat * 1000; h_ = rel @ nA * 1000
        cvx = (new - cV) @ fwd * 1000
        reg = (t_ > P["P_T0"]) & (np.abs(x_) < P["P_XW"]) & (np.abs(h_) < 10) & ~frozen & ~grow(lab, 3)
        w = np.clip((t_ - P["P_T0"]) / 3, 0, 1) * np.clip((P["P_XW"] - np.abs(x_)) / 4, 0, 1)
        w *= np.clip((np.min([np.full(n, 99.0), -cvx - 8], axis=0)) / 4, 0, 1)   # fade out before the vulva
        vs = np.where(reg & (w > 0))[0]
        new = smooth(new, vs, w[vs], int(P["P_IT"]))
        log("perineum: smoothed", len(vs))
    elif st == "band":
        # the crumpled band across the perineum (B_T0..B_T1 mm in front of the anus): Taubin, feathered at its edges
        mid = (cA + cV) / 2; vn_ = vert_normals(new, faces)
        nA = vn_[np.argsort(np.linalg.norm(new - mid, axis=1))[:300]].mean(0); nA /= np.linalg.norm(nA)
        fwd = cV - cA; fwd -= (fwd @ nA) * nA; fwd /= np.linalg.norm(fwd); lat = np.cross(nA, fwd)
        rel = new - cA; t_ = rel @ fwd * 1000; x_ = rel @ lat * 1000; h_ = rel @ nA * 1000
        e = P["B_E"]
        w = (np.clip((t_ - P["B_T0"]) / e, 0, 1) * np.clip((P["B_T1"] - t_) / e, 0, 1) * np.clip((P["B_XW"] - np.abs(x_)) / e, 0, 1)
             * (np.abs(h_) < P["B_H"]))
        if P["B_ANS"] > 0:
            ls_, lt_ = M["ls"], M["lt"]
            uvl = np.zeros(len(me.loops) * 2); me.uv_layers["UVMap"].data.foreach_get("uv", uvl); uvl = uvl.reshape(-1, 2)
            U = np.full(n, -1.0); iS = M["mats"].index("T_anus_skin")
            for fi in np.where(fm == iS)[0]:
                for li in range(ls_[fi], ls_[fi] + lt_[fi]):
                    if U[M["lv"][li]] < 0: U[M["lv"][li]] = uvl[li, 0] * 12
            w[ans] *= np.clip((U[ans] - P["B_ANS"]) / 2.0, 0, 1)      # the patch's outer rings join in, the pucker doesn't
            w[frozen | grow(lab, 1)] = 0
        else:
            w[frozen | grow(lab, 2) | ans] = 0
        vs = np.where(w > 0)[0]
        new = smooth(new, vs, w[vs], int(P["B_IT"]), taubin=bool(P["B_TAUBIN"]))
        log("band: smoothed", len(vs))
    elif st == "loft":
        # the pinched "neck" between the vulva's back and the anus area: refill it with the smoothest (bi-harmonic)
        # surface that meets the vulva, the anus area and her thighs round it, so it reads as one piece of body
        mid = (cA + cV) / 2; vn_ = vert_normals(new, faces)
        nA = vn_[np.argsort(np.linalg.norm(new - mid, axis=1))[:300]].mean(0); nA /= np.linalg.norm(nA)
        fwd = cV - cA; fwd -= (fwd @ nA) * nA; fwd /= np.linalg.norm(fwd); lat = np.cross(nA, fwd)
        rel = new - cA; t_ = rel @ fwd * 1000; x_ = rel @ lat * 1000; h_ = rel @ nA * 1000
        ls_, lt_ = M["ls"], M["lt"]
        uvl = np.zeros(len(me.loops) * 2); me.uv_layers["UVMap"].data.foreach_get("uv", uvl); uvl = uvl.reshape(-1, 2)
        U = np.full(n, -1.0); iS = M["mats"].index("T_anus_skin")
        for fi in np.where(fm == iS)[0]:
            for li in range(ls_[fi], ls_[fi] + lt_[fi]):
                if U[M["lv"][li]] < 0: U[M["lv"][li]] = uvl[li, 0] * 12
        reg = ((t_ > P["L_T0"]) & (t_ < P["L_T1"]) & (np.abs(x_) < P["L_XW"]) & (np.abs(h_) < P["L_H"])
               & ~frozen & ~grow(lab, 2) & ~(ans & (U < P["L_U"])))
        seed = np.where(reg)[0][np.argmin(np.abs(x_[reg]) + np.abs(t_[reg] - (P["L_T0"] + P["L_T1"]) / 2))]
        comp = np.zeros(n, bool); comp[seed] = True; st_ = [seed]
        while st_:
            v = st_.pop()
            for w_ in nb[v]:
                if reg[w_] and not comp[w_]: comp[w_] = True; st_.append(w_)
        free = comp & ~grow(~comp, 1)
        S = grow(free, 2)
        idx = np.where(S)[0]; loc = -np.ones(n, int); loc[idx] = np.arange(len(idx))
        m_ = len(idx); L = np.zeros((m_, m_))
        for i, v in enumerate(idx):
            ns = [loc[w_] for w_ in nb[v] if loc[w_] >= 0]
            L[i, i] = -1.0
            for j in ns: L[i, loc[j] if False else j] += 0
            for j in ns: L[i, j] += 1.0 / len(ns)
        L2 = L @ L
        fr = loc[np.where(free)[0]]; fx = loc[np.where(S & ~free)[0]]
        X = new[idx].copy()
        X[fr] = np.linalg.solve(L2[np.ix_(fr, fr)], -L2[np.ix_(fr, fx)] @ X[fx])
        ch = np.linalg.norm(X[fr] - new[idx[fr]], axis=1)
        new[idx[fr]] = X[fr]
        log("loft: region", int(comp.sum()), "refilled", len(fr), "max change mm", round(float(ch.max() * 1000), 2), "mean", round(float(ch.mean() * 1000), 2))
    elif st == "nsmooth":
        # the collar where the coarse anus patch meets the dense skin: smoothing that only moves points in/out along
        # the surface (no sliding), neighbours weighted 1/edge length so the coarse and dense meshes blend evenly
        mid = (cA + cV) / 2; vn_ = vert_normals(new, faces)
        nA = vn_[np.argsort(np.linalg.norm(new - mid, axis=1))[:300]].mean(0); nA /= np.linalg.norm(nA)
        fwd = cV - cA; fwd -= (fwd @ nA) * nA; fwd /= np.linalg.norm(fwd); lat = np.cross(nA, fwd)
        rel = new - cA; t_ = rel @ fwd * 1000; x_ = rel @ lat * 1000; h_ = rel @ nA * 1000
        ls_, lt_ = M["ls"], M["lt"]
        uvl = np.zeros(len(me.loops) * 2); me.uv_layers["UVMap"].data.foreach_get("uv", uvl); uvl = uvl.reshape(-1, 2)
        U = np.full(n, -1.0); iS = M["mats"].index("T_anus_skin")
        for fi in np.where(fm == iS)[0]:
            for li in range(ls_[fi], ls_[fi] + lt_[fi]):
                if U[M["lv"][li]] < 0: U[M["lv"][li]] = uvl[li, 0] * 12
        e = P["NS_E"]
        w = (np.clip((t_ - P["NS_T0"]) / e, 0, 1) * np.clip((P["NS_T1"] - t_) / e, 0, 1) * np.clip((P["NS_XW"] - np.abs(x_)) / e, 0, 1)
             * (np.abs(h_) < P["NS_H"]))
        w[ans] *= np.clip((U[ans] - P["NS_U"]) / 1.5, 0, 1)
        w[frozen | grow(lab, 1)] = 0
        vs = np.where(w > 0)[0]; ww = w[vs]
        nbr = [np.array(nb[v]) for v in vs]
        for it in range(int(P["NS_IT"])):
            vn_ = vert_normals(new, faces) if it % 10 == 0 else vn_
            d = np.zeros((len(vs), 3))
            for k, v in enumerate(vs):
                q = new[nbr[k]] - new[v]; il = 1.0 / np.maximum(np.linalg.norm(q, axis=1), 1e-6)
                d[k] = (q * il[:, None]).sum(0) / il.sum()
            dn = (d * vn_[vs]).sum(1)
            new[vs] += vn_[vs] * (dn * ww * 0.5)[:, None]
        log("nsmooth: verts", len(vs))
    elif st == "edges":
        co = (new - c0) @ Rf.T
        d_v = np.full(n, 1.0)
        from mathutils.kdtree import KDTree
        kd = KDTree(int(vul.sum())); [kd.insert(new[v], i) for i, v in enumerate(np.where(vul)[0])]; kd.balance()
        for v in np.where(lab & crotch)[0]: d_v[v] = kd.find(new[v])[2]
        band = lab & (d_v < P["E_BAND"] * mm) & ~frozen
        band |= vul & grow(band, 2) & ~frozen
        vs = np.where(band)[0]; w = np.clip(1 - d_v[vs] / (P["E_BAND"] * mm), 0.2, 1)
        lap0 = np.linalg.norm(np.array([new[nb[v]].mean(0) for v in vs]) - new[vs], axis=1).mean()
        new = smooth(new, vs, w, int(P["E_IT"]), taubin=True)
        lap1 = np.linalg.norm(np.array([new[nb[v]].mean(0) for v in vs]) - new[vs], axis=1).mean()
        log("edges: band verts", len(vs), "roughness um", round(lap0 * 1e6, 1), "->", round(lap1 * 1e6, 1))
        EDGE_D = d_v
    elif st == "lips":
        co = (new - c0) @ Rf.T
        ys = co[vul, 1]; y0, y1 = np.percentile(ys, 2), np.percentile(ys, 98)
        yb = np.arange(y0, y1 + 1e-9, 0.001); xm = []
        for y in yb:
            m = vul & (np.abs(co[:, 1] - y) < 0.0006)
            xm.append(co[m, 0].mean() if m.any() else np.nan)
        xm = np.array(xm); ok = ~np.isnan(xm); xm = np.interp(yb, yb[ok], xm[ok])
        d_v = EDGE_D if "EDGE_D" in dir() else None
        lipband = lab & (d_v < 2.2 * mm) & ~keep & (co[:, 1] > y0) & (co[:, 1] < y1)
        # vestibule walls just under the crest come along (fading with depth)
        crestz = {}
        moved = 0
        for v in np.where(lipband | (vul & grow(lipband, 3)))[0]:
            if keep[v] or can[v] or hol[v]: continue
            s = (co[v, 1] - y0) / (y1 - y0)
            side = 1 if co[v, 0] > np.interp(co[v, 1], yb, xm) else -1
            amp = P["LIPS"] * mm * math.sin(math.pi * min(1, max(0, s))) ** 0.8
            amp *= 1 + P["WAVE"] * math.sin(2 * math.pi * (2.5 * s) + (0.0 if side > 0 else 1.7))
            if lab[v]: fall = max(0.0, 1 - d_v[v] / (2.2 * mm)) ** 1.2
            else: fall = 0.55
            new[v] += Rf[2] * amp * fall; moved += 1
        reg = np.where(grow(lipband, 2) & ~frozen)[0]
        new = smooth(new, reg, np.full(len(reg), 0.5), 6, taubin=True)
        log("lips: lifted verts", moved, "peak mm", P["LIPS"])
    elif st == "rim":
        co = (new - c0) @ Rf.T
        # the opening = vestibule verts touching canal faces
        rimv = vul & grow(can & (co[:, 1] < np.percentile(co[vul, 1], 60)), 1)
        reg, w = ringw(rimv, int(P["R_RAD"] / 0.6))
        reg &= (vul | can) & ~keep & ~hol
        vs = np.where(reg)[0]
        new = smooth(new, vs, w[vs], int(P["R_IT"]), taubin=True)
        log("rim: smoothed verts", len(vs))
    elif st == "ridge":
        ls_, lt_ = M["ls"], M["lt"]
        uvl = np.zeros(len(me.loops) * 2); me.uv_layers["UVMap"].data.foreach_get("uv", uvl); uvl = uvl.reshape(-1, 2)
        U = np.full(n, -1.0)
        iS = M["mats"].index("T_anus_skin")
        for fi in np.where(fm == iS)[0]:
            for li in range(ls_[fi], ls_[fi] + lt_[fi]):
                if U[M["lv"][li]] < 0: U[M["lv"][li]] = uvl[li, 0] * 12
        band = ans & (U > 8.0)
        reg, w_out = ringw(band, int(P["RIDGE_OUT"]))          # the patch's outer rings + a few rings of skin past its edge
        reg &= ~frozen & ~grow(lab, 2)
        vs = np.where(reg)[0]
        w = np.where(ans[vs] & (U[vs] > 0), np.clip((U[vs] - 8.0) / 1.5, 0, 1), w_out[vs])
        new = smooth(new, vs, w, int(P["RIDGE_IT"]), taubin=True)
        log("ridge: smoothed verts", len(vs))
log("folded verts at the end", int(folds(new).sum()))
moved = write_posed_change(ob, Pw, new, A)
chk = evaluated(ob)
log("moved", int(moved.sum()), "posed check err mm", round(float(np.abs(chk - new).max() * 1000), 3))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
