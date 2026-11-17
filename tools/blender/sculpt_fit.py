"""
The game body brought onto the sculpt: her low-poly skin (the ring-built Female_Body, PS1 style, with the same
corners as before) pulled onto the surface of the heroine's signed distance field (tools/blender/heroine/sdf.py),
so she takes the sculpt's forms (bust, ribcage, abs, hips, glutes, thighs, knees, calves, shoulders, arms) without
gaining a single face. Everything joined to the skin or worn over it (lingerie and pubic patches, areolae, vulva
and anus grids, neck, head, fingers, clothes, feet, cum, jewellery, hair) rides on it, so it keeps fitting. The
bones stay where they are: the game's poses, paired scenes and sliders were tuned to them.

How:
1. The sculpt is built with her limbs at the game rig's angles (arm angle, leg stance).
2. Each skin corner is carried into the sculpt's space bone by bone. The trunk is shifted forward by height (the
   sculpt stands like the references, her trunk well forward over the knees; the game keeps its own posture), and
   each limb segment (shoulder -> elbow, hip -> knee, ...) is turned and stretched onto the sculpt's. A corner
   shared by bones blends their moves by its weights.
3. There it moves along its own normal to the nearest crossing of the sculpt's surface. Moves far from their
   neighbours' (the wrong surface: an arm for the side) are dropped, the rest smoothed a little, and carried back
   into the game's space.
4. The head and hands are faded out, and the grids the game shapes itself (vulva, anus, navel, the openings'
   skin) are left out. Every corner not fitted takes a smooth fill of its fitted neighbours' moves.
5. Every other point rides on the skin: bound to the nearest spot of the skin as it was, it keeps that place on
   that triangle as it moves, as far off it; points far from the skin follow the nearest corners' moves.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "heroine"))
import sdf  # noqa: E402

FIT = {
    "reach": 0.045,          # how far along its normal a corner looks for the sculpt's surface, metres
    "step": 0.0025,          # the search step along the normal
    "most": 0.04,            # the most a corner moves
    "outlier": 0.008,        # a corner whose move differs from its neighbours' average by more is dropped
    "outlier_passes": 3,
    "smooth": 8,             # passes averaging the moves with the neighbours' (halfway each time)
    "normal_passes": 6,      # passes averaging the skin's normals before they aim at the sculpt
    "fill_passes": 400,      # averaging passes spreading the fitted moves over the corners left out
    "neck": (1.405, 1.455),  # the fit fades out up the neck between these heights (the game keeps its own head)
    "wrist": (0.80, 0.97),   # and out along the forearm, as a share of elbow -> wrist (the game keeps its hands)
    "trunk": (0.95, 1.44),   # heights the trunk's forward offset is measured over (held beyond them)
    "trunk_smooth": 4,       # cm either side it is averaged over
    "bind": (0.02, 0.05),    # points this near the skin ride on its triangles; beyond the second, by distance
    "carry_k": 8,            # nearest skin corners a point far from the skin takes its move from
    # Faces the game shapes or draws itself: left out of the fit, filled from the skin round them.
    "keep": ("T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin", "T_hole", "T_navel"),
    # The sculpt's limbs at the game rig's angles: arms out from vertical (deg), legs' stance (0 = the knees
    # straight under the hips, 1 = the references' A stance).
    "limb_from": (-0.05, 0.25),  # a limb's first segment takes over from the trunk between these shares of its length
    "grid_fade": (0.012, 0.04),  # the fit fades in this far from the grids the game shapes
    "arm_angle": None,       # None: read off the rig
    "stance": None,
}


def _smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _rot_between(a, b):
    """The rotation turning a onto b, the shortest way."""
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    v = np.cross(a, b)
    c = float(a @ b)
    if np.linalg.norm(v) < 1e-9:
        return np.eye(3)
    vx = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + vx + vx @ vx * (1.0 / (1.0 + c))


class Segment:
    """A game bone segment a -> b laid onto the sculpt's A -> B: turned, and stretched along its length only."""

    def __init__(self, a, b, A, B):
        self.a, self.A = np.asarray(a, float), np.asarray(A, float)
        d, D = np.asarray(b, float) - self.a, np.asarray(B, float) - self.A
        self.u = d / np.linalg.norm(d)
        self.R = _rot_between(d, D)
        S = np.eye(3) + (np.linalg.norm(D) / np.linalg.norm(d) - 1.0) * np.outer(self.u, self.u)
        self.M = self.R @ S                    # game offset -> sculpt offset
        self.Minv = np.linalg.inv(self.M)      # and back (for moves)

    def to_sculpt(self, P):
        return self.A + (P - self.a) @ self.M.T

    def dirs_to_sculpt(self, N):
        return N @ self.R.T

    def back(self, D):
        return D @ self.Minv.T


def segment_of(bone):
    """Which limb segment a bone's weight follows, as (kind, side), or None for the trunk."""
    side = bone[-1] if bone[-2:] in ("_L", "_R") else None
    for key, kind in (("UpperArm", "upper"), ("ForeArm", "fore"), ("Hand", "fore"), ("ThighSoft", "thigh"),
                      ("Thigh", "thigh"), ("Shin", "shin")):
        if bone.startswith(key) and side:
            return kind, side
    return None


def rig_points(rig, P, name):
    """The game rig's joints in world space, plus the wrist and ankle (no bones of their own) read off it."""
    B = {b.name[len(name) + 1:]: np.array(rig.matrix_world @ b.head_local) for b in rig.data.bones}
    out = {}
    for side, sx in (("L", -1), ("R", 1)):
        el, kn = B[f"ForeArm_{side}"], B[f"HandFingers_{side}"]
        u = (kn - el) / np.linalg.norm(kn - el)
        leg = P[(P[:, 0] * sx > 0.04) & (P[:, 2] < 0.3)]
        low = leg[leg[:, 2] < leg[:, 2].min() + 0.02]
        out[side] = dict(shoulder=B[f"UpperArm_{side}"], elbow=el,
                         wrist=kn - u * 0.075,            # the knuckles sit ~75 mm past the wrist
                         hip=B[f"Thigh_{side}"], knee=B[f"Shin_{side}"],
                         ankle=low.mean(0))               # the middle of the leg's open end, where the foot joins
    return out


def sculpt_for(game, fit):
    """The sculpt built with its limbs at the game's angles, and its joints for both sides."""
    g = game["R"]
    if fit["arm_angle"] is None:
        d = g["elbow"] - g["shoulder"]
        arm_angle = math.degrees(math.atan2(d[0], -d[2]))
    else:
        arm_angle = fit["arm_angle"]
    if fit["stance"] is None:
        J0 = sdf.skeleton(arm_angle, 0.0)
        stance = float(np.clip((g["knee"][0] - J0["knee"][0]) / 0.064, 0.0, 1.0))
    else:
        stance = fit["stance"]
    root, _groups, J = sdf.build(arm_angle=arm_angle, stance=stance)
    mirror = np.array([-1.0, 1.0, 1.0])
    left = {k: (v * mirror if isinstance(v, np.ndarray) and v.shape == (3,) else v) for k, v in J.items()}
    return root, {"R": J, "L": left}, arm_angle, stance


def field(root, P, chunk=1500):
    """The sculpt's distance at points P (N, 3), in spatial chunks so each chunk only evaluates the parts near it."""
    out = np.empty(len(P))
    order = np.lexsort((P[:, 1], np.round(P[:, 0] * 12), np.round(P[:, 2] * 12)))
    for i in range(0, len(P), chunk):
        idx = order[i:i + chunk]
        out[idx] = sdf.eval_points(root, P[idx])
    return out


def trunk_offset(root, P, edges, fit):
    """
    How far forward the sculpt's trunk stands of the game's, by height: the middle between front and back at her
    midline (where the skin's edges cross each height), sculpt minus game, smoothed.
    """
    zs = np.arange(fit["trunk"][0], fit["trunk"][1] + 1e-9, 0.01)
    ys = np.arange(-0.25, 0.30, 0.002)
    A, B = P[edges[:, 0]], P[edges[:, 1]]
    off = []
    for z in zs:
        c = (A[:, 2] - z) * (B[:, 2] - z) < 0
        t = (z - A[c, 2]) / (B[c, 2] - A[c, 2])
        g = A[c] + (B[c] - A[c]) * t[:, None]
        g = g[np.abs(g[:, 0]) < 0.02]
        S = np.stack([np.zeros_like(ys), ys, np.full_like(ys, z)], 1)
        inside = ys[field(root, S) < 0]
        if len(g) < 2 or g[:, 1].max() < 0 or g[:, 1].min() > 0 or len(inside) < 2:
            off.append(np.nan)
            continue
        off.append((inside.max() + inside.min()) / 2 - (g[:, 1].max() + g[:, 1].min()) / 2)
    off = np.array(off)
    ok = ~np.isnan(off)
    off = np.interp(zs, zs[ok], off[ok])
    k = fit["trunk_smooth"]
    pad = np.concatenate([np.full(k, off[0]), off, np.full(k, off[-1])])
    off = np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]
    return lambda z: np.interp(z, zs, off)


def build_segments(game, joints, off):
    """Each limb's first joint goes where the trunk takes it, so trunk and limb agree at the joint."""
    seg = {}
    lift = lambda p: p + np.array([0.0, float(off(p[2])), 0.0])
    for side in ("L", "R"):
        g, J = game[side], joints[side]
        seg[("upper", side)] = Segment(g["shoulder"], g["elbow"], lift(g["shoulder"]), J["elbow"])
        seg[("fore", side)] = Segment(g["elbow"], g["wrist"], J["elbow"], J["wrist"])
        seg[("thigh", side)] = Segment(g["hip"], g["knee"], lift(g["hip"]), J["knee"])
        seg[("shin", side)] = Segment(g["knee"], g["ankle"], J["knee"], J["ankle"])
    return seg


def surface_along(root, Q, N, reach, step):
    """
    For each point Q[i] with direction N[i]: the offset t along N to the sculpt's surface nearest to it within
    +-reach (a crossing from inside to outside going along N), or nan where there is none.
    """
    ts = np.arange(-reach, reach + 1e-9, step)
    n, m = len(Q), len(ts)
    S = (Q[:, None, :] + N[:, None, :] * ts[None, :, None]).reshape(-1, 3)
    F = field(root, S).reshape(n, m)
    best = np.full(n, np.nan)
    cross = (F[:, :-1] <= 0) & (F[:, 1:] > 0)       # inside -> outside going outwards: the skin facing N's way
    for i in np.nonzero(cross.any(1))[0]:
        ks = np.nonzero(cross[i])[0]
        f0, f1 = F[i, ks], F[i, ks + 1]
        t = ts[ks] + step * f0 / (f0 - f1)          # straight-line between the two samples
        best[i] = t[np.argmin(np.abs(t))]
    return best


def islands(n, edges):
    """Each corner's connected piece (union-find over the edges)."""
    parent = np.arange(n)

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    return np.array([find(i) for i in range(n)])


def neighbour_mean(X, edges, use, weight=None):
    """
    Each corner's average of its neighbours' X, counting only neighbours in use (its own where it has none);
    weighted per edge if given.
    """
    a, b = edges[:, 0], edges[:, 1]
    w = np.ones(len(edges)) if weight is None else weight
    acc = np.zeros_like(X)
    cnt = np.zeros(len(X))
    ua, ub = use[a], use[b]
    np.add.at(acc, a[ub], X[b[ub]] * w[ub, None])
    np.add.at(cnt, a[ub], w[ub])
    np.add.at(acc, b[ua], X[a[ua]] * w[ua, None])
    np.add.at(cnt, b[ua], w[ua])
    out = X.copy()
    has = cnt > 0
    out[has] = acc[has] / cnt[has, None]
    return out


def harmonic_fill(X, edges, fixed, region, passes):
    """X kept on the fixed corners and spread smoothly over the rest of the region (repeated averaging)."""
    Y = np.where(fixed[:, None], X, 0.0)
    known = fixed.copy()
    inner = region[edges[:, 0]] & region[edges[:, 1]]
    a, b = edges[inner, 0], edges[inner, 1]
    for _ in range(passes):
        acc = np.zeros_like(Y)
        cnt = np.zeros(len(Y))
        kb, ka = known[b], known[a]
        np.add.at(acc, a[kb], Y[b[kb]])
        np.add.at(cnt, a[kb], 1)
        np.add.at(acc, b[ka], Y[a[ka]])
        np.add.at(cnt, b[ka], 1)
        upd = region & ~fixed & (cnt > 0)
        Y[upd] = acc[upd] / cnt[upd, None]
        known = known | upd
    return Y


def triangles(body, keep):
    """The faces whose corners are all kept, as triangles (corner indices)."""
    tris = []
    for poly in body.data.polygons:
        vs = poly.vertices[:]
        if not all(keep[v] for v in vs):
            continue
        for k in range(1, len(vs) - 1):
            tris.append((vs[0], vs[k], vs[k + 1]))
    return np.array(tris)


class Rider:
    """
    Points carried by the skin's move: each bound to the nearest spot on the skin as it was (that triangle, the
    same place on it, as far off it along its normal) within fit["bind"][0]; beyond fit["bind"][1], the moves of the
    nearest skin corners by inverse distance; between the two, blended.
    """

    def __init__(self, P, new, tris, fit):
        from mathutils import Vector, kdtree
        from mathutils.bvhtree import BVHTree
        self.P, self.new, self.tris, self.fit = P, new, tris, fit
        self.tree = BVHTree.FromPolygons([Vector(p) for p in P], [tuple(int(i) for i in t) for t in tris])
        self.used = np.unique(tris)
        self.kd = kdtree.KDTree(len(self.used))
        for j, i in enumerate(self.used):
            self.kd.insert(Vector(P[i]), j)
        self.kd.balance()

    def __call__(self, X):
        from mathutils import Vector as V
        from mathutils.interpolate import poly_3d_calc
        P, new, tris, used = self.P, self.new, self.tris, self.used
        near, far = self.fit["bind"]
        out = np.empty_like(X)
        for i, x in enumerate(X):
            p = V(x)
            loc, normal, index, dist = self.tree.find_nearest(p, far)
            bound, edge = None, 0.0
            if loc is not None:
                a, b, c = tris[index]
                w = poly_3d_calc([V(P[a]), V(P[b]), V(P[c])], loc)
                height = float((p - loc).dot(normal))
                n2 = np.cross(new[b] - new[a], new[c] - new[a])
                ln = np.linalg.norm(n2)
                n2 = n2 / ln if ln > 1e-12 else np.array(normal)
                if n2 @ np.array(normal) < 0:
                    n2 = -n2
                bound = new[a] * w[0] + new[b] * w[1] + new[c] * w[2] + n2 * height
                # what lies along the skin (not out over it) keeps its own offset across the triangle as well
                side = np.array(p - loc) - np.array(normal) * height
                bound = bound + side
                # off the triangle's edge (past the end of the skin: a foot under the leg's open end), the binding
                # means little: hand over to the corners' moves
                edge = _smooth((np.linalg.norm(side) - 0.003) / 0.01)
                if dist <= near and edge <= 0:
                    out[i] = bound
                    continue
            else:
                dist = far
            hits = self.kd.find_n(p, self.fit["carry_k"])
            w = np.array([1.0 / max(h[2], 1e-4) ** 2 for h in hits])
            m = np.array([new[used[h[1]]] - P[used[h[1]]] for h in hits])
            carried = x + (m * w[:, None]).sum(0) / w.sum()
            if bound is None:
                out[i] = carried
            else:
                k = max(_smooth((dist - near) / (far - near)), edge)
                out[i] = bound * (1 - k) + carried * k
        return out


def fit_to_sculpt(rig, body, meshes, name="Female", fit=None, log=print):
    """Her skin onto the sculpt, and every other mesh moved with it. Bones untouched. Returns the numbers."""
    from mathutils import Vector
    fit = dict(FIT, **(fit or {}))
    mw = body.matrix_world
    rot3 = np.array(mw.to_3x3())
    verts = body.data.vertices
    n = len(verts)
    P = np.array([mw @ v.co for v in verts])
    Nrm = np.array([rot3 @ v.normal for v in verts])
    Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-9)
    edges = np.array([e.vertices[:] for e in body.data.edges])
    # The normals smoothed over the skin, so close rows of corners (the bust's rings run round her back) are
    # aimed alike and don't cross over each other on the way to the sculpt.
    every = np.ones(n, bool)
    for _ in range(fit["normal_passes"]):
        Nrm = 0.5 * Nrm + 0.5 * neighbour_mean(Nrm, edges, every)
        Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-9)

    game = rig_points(rig, P, name)
    root, joints, arm_angle, stance = sculpt_for(game, fit)
    off = trunk_offset(root, P, edges, fit)
    seg = build_segments(game, joints, off)
    log(f"sculpt fit: sculpt built with arms at {arm_angle:.1f} deg, stance {stance:.2f}; trunk forward "
        + " / ".join(f"{off(z) * 1000:.0f}" for z in (0.95, 1.05, 1.2, 1.4)) + " mm at z 0.95 / 1.05 / 1.2 / 1.4")

    # Each corner's weights per segment (last column: the trunk).
    gname = {g.index: g.name[len(name) + 1:] for g in body.vertex_groups}
    keys = list(seg)
    W = np.zeros((n, len(keys) + 1))
    for i, v in enumerate(verts):
        for g in v.groups:
            s = segment_of(gname.get(g.group, ""))
            W[i, keys.index(s) if s in seg else -1] += g.weight
    W[W.sum(1) <= 0, -1] = 1.0
    W /= W.sum(1, keepdims=True)
    # A limb's first segment takes over only out along the limb: the back and the glutes carry some of the upper
    # arm's and thigh's weight, and turning them with the limb would ripple them row by row.
    t0, t1 = fit["limb_from"]
    for k, (kind, side) in enumerate(keys):
        if kind in ("upper", "thigh"):
            sg = seg[(kind, side)]
            d = (P - sg.a) @ sg.u / np.linalg.norm(game[side]["elbow" if kind == "upper" else "knee"] - sg.a)
            share = _smooth((d - t0) / (t1 - t0))
            W[:, -1] += W[:, k] * (1 - share)
            W[:, k] *= share

    # Into the sculpt's space.
    T = P.copy()
    T[:, 1] += off(P[:, 2])
    Q = T * W[:, -1:]
    NQ = Nrm * W[:, -1:]
    for k, key in enumerate(keys):
        w = W[:, k:k + 1]
        if w.any():
            Q = Q + seg[key].to_sculpt(P) * w
            NQ = NQ + seg[key].dirs_to_sculpt(Nrm) * w
    NQ /= np.maximum(np.linalg.norm(NQ, axis=1, keepdims=True), 1e-9)

    # Her skin is the biggest island; everything else joined into the body rides on it.
    island = islands(n, edges)
    main = island == np.bincount(island).argmax()

    # How much each corner is fitted: not the head, not the hands, not the grids the game shapes.
    wfit = 1.0 - _smooth((P[:, 2] - fit["neck"][0]) / (fit["neck"][1] - fit["neck"][0]))
    for side, sx in (("L", -1), ("R", 1)):
        g = game[side]
        d = g["wrist"] - g["elbow"]
        t = ((P - g["elbow"]) @ d) / (d @ d)
        a, b = fit["wrist"]
        wfit = np.where(P[:, 0] * sx > 0.12, wfit * (1.0 - _smooth((t - a) / (b - a))), wfit)
    names = [m.name if m else "" for m in body.data.materials]
    keep = {i for i, nm in enumerate(names) if nm in fit["keep"]}
    kept = np.zeros(n, bool)
    for poly in body.data.polygons:
        if poly.material_index in keep:
            kept[list(poly.vertices)] = True
    # ... and the skin round them fades in from them, so the grids (the vulva's and anus's islands among them)
    # ride on a smooth fill.
    near_kept = np.full(n, np.inf)
    from mathutils import kdtree
    src = np.nonzero(kept)[0]
    if len(src):
        kd = kdtree.KDTree(len(src))
        for j, i in enumerate(src):
            kd.insert(Vector(P[i]), j)
        kd.balance()
        for i in np.nonzero(main)[0]:
            near_kept[i] = kd.find(Vector(P[i]))[2]
    a, b = fit["grid_fade"]
    wfit *= _smooth((near_kept - a) / (b - a))
    wfit[~main] = 0.0

    # Onto the surface, along each corner's normal.
    todo = np.nonzero(wfit > 1e-3)[0]
    t = surface_along(root, Q[todo], NQ[todo], fit["reach"], fit["step"])
    ok = ~np.isnan(t)
    found = np.zeros(n, bool)
    found[todo[ok]] = True
    D = np.zeros((n, 3))
    D[todo[ok]] = NQ[todo[ok]] * t[ok, None]
    D *= np.minimum(1.0, fit["most"] / np.maximum(np.linalg.norm(D, axis=1), 1e-9))[:, None]

    # Back into the game's space: each segment's move undone by its weight.
    Dg = D * W[:, -1:]
    for k, key in enumerate(keys):
        w = W[:, k:k + 1]
        if w.any():
            Dg = Dg + seg[key].back(D) * w

    # Outliers dropped, the rest smoothed a little among themselves.
    aimed = found.sum()
    for _ in range(fit["outlier_passes"]):
        mean = neighbour_mean(Dg, edges, found)
        found &= ~(np.linalg.norm(Dg - mean, axis=1) > fit["outlier"])
    # Weighted by closeness: rows of corners a millimetre or two apart (the bust's rings round her back) must move
    # alike or they fold over each other; corners a centimetre apart keep the sculpt's detail.
    length = np.linalg.norm(P[edges[:, 0]] - P[edges[:, 1]], axis=1)
    close = 1.0 / np.maximum(length, 1e-3) ** 2
    for _ in range(fit["smooth"]):
        Dg = np.where(found[:, None], 0.5 * Dg + 0.5 * neighbour_mean(Dg, edges, found, close), Dg)
    wfit[~found] = 0.0

    # The rest of the skin island takes a smooth fill of its fitted neighbours' moves, over the skin's edges.
    fixed = found & (wfit > 0.999)
    fill = harmonic_fill(Dg, edges, fixed, main, fit["fill_passes"])
    move = Dg * wfit[:, None] + fill * (1.0 - wfit[:, None])
    move[~main] = 0.0
    new = P + move

    # Everything else rides on the skin island.
    ride = Rider(P, new, triangles(body, main), fit)
    other = np.nonzero(~main)[0]
    if len(other):
        new[other] = ride(P[other])
    inv = mw.inverted()
    for v, p in zip(verts, new):
        v.co = inv @ Vector(p)
    body.data.update()

    for obj in meshes:
        if obj is body or obj.type != "MESH" or not len(obj.data.vertices):
            continue
        ow = np.array(obj.matrix_world)
        L = np.zeros(len(obj.data.vertices) * 3)
        obj.data.vertices.foreach_get("co", L)
        L = L.reshape(-1, 3)
        Wp = L @ ow[:3, :3].T + ow[:3, 3]
        oi = np.linalg.inv(ow)
        L2 = ride(Wp) @ oi[:3, :3].T + oi[:3, 3]
        obj.data.vertices.foreach_set("co", L2.ravel())
        obj.data.update()

    # How far the skin ended up from the sculpt (in the sculpt's space), for checking.
    Tn = new.copy()
    Tn[:, 1] += off(new[:, 2])
    Qn = Tn * W[:, -1:]
    for k, key in enumerate(keys):
        w = W[:, k:k + 1]
        if w.any():
            Qn = Qn + seg[key].to_sculpt(new) * w
    resid = np.full(n, np.nan)
    resid[main] = field(root, Qn[main])

    moved = np.linalg.norm(new - P, axis=1)
    fitted = wfit > 1e-3
    log(f"sculpt fit: {len(todo)} skin corners aimed, {aimed} found the sculpt, {fitted.sum()} kept after outliers; "
        f"moved mean {moved[fitted].mean() * 1000:.1f} mm, 95% {np.percentile(moved[fitted], 95) * 1000:.1f} mm, "
        f"max {moved.max() * 1000:.1f} mm")
    return dict(P=P, new=new, wfit=wfit, main=main, resid=resid, Q=Qn, Nrm=Nrm)
