"""
The heroine's body (neck ring down, no head) as a quad cage, built the way a character artist retopologises a
sculpt: edge loops that follow the forms, laid out by hand, then dropped onto OUR OWN surface (heroine/sdf.py).

How it is built
1. Torso: a coarse quad cage drawn by hand (8 rings R0..R7 x 8 columns per side, the crotch gusset, the
   shoulder yoke, an inset patch round each breast and each glute). Every coarse edge carries a segment count;
   counts travel along chords (rows of opposite edges), so the cage subdivides into a clean structured grid.
   The coarse cage fixes where the poles go: 5-poles at the hole corners and the yoke, 3/5 pairs round the
   breast and glute insets (the concentric loops artists use there).
2. Limbs: rings (edge loops) along the bone axes from sdf.skeleton(), started from the torso's arm hole and leg
   opening and straightened over the first few rings; a ring sits on every joint with one either side.
3. Foot: the leg tube bends 90 degrees about the front of the ankle (the rings fan round the heel), runs along
   the foot to a ring at the toes' base (16 top/bottom pairs) from which five toes grow like fingers.
   Hand: a flat palm (7 faces across the back), four 4-sided
   fingers from the knuckle cap, a 6-sided thumb from the palm's side.
4. Placement: every vertex has a centre inside the body (bone axis, torso axis, breast/glute centre, ...);
   it is cast from that centre through its rough position to the first zero of the field. Then the quads are
   relaxed (Laplacian, re-cast), and the cage is pushed out so its Catmull-Clark LIMIT surface, not the cage,
   lies on the field (a cage sits outside the surface it makes).

Only the +x half is laid out; the -x half is its mirror. Units metres, z up, +y front, x to her left.
The neck is left open in a 24-vertex ring (NECK_*) that the head bridges to.
Pure numpy; build(bm) wraps it for Blender.
"""
import math
import numpy as np

import sdf
from sdf import V, unit

H = sdf.STATURE
BODY, GROUPS, J = sdf.build()
TORSO = GROUPS["torso"]
# The torso's last carve, the navel, is a pit about 14 mm across: finer than the cage. The cage fits the field
# without it; the game mesh gets a round patch of concentric rings there (build_body.py), snapped onto it.
_cuts = [i for i, part in enumerate(TORSO.parts) if part[0] == "cut"]
DETAIL_CUTS = [TORSO.parts[_cuts[-1]]]
del TORSO.parts[_cuts[-1]]
NAVEL_C = (0.0, 0.148, 1.103)     # the navel on the belly's surface (before its pit)
NAVEL_R = 0.0150                  # radius of the ringed patch round it, like the references'

# the contract with the head: the body ends in this open ring
NECK_Z = 1.470
NECK_CY = 0.004                  # the refs' neck sits ~42 mm behind the chest's centre at 1.30
NECK_R = (0.038, 0.042)          # x, y radii (the references' neck: thinner than the field's)
NECK_N = 24                      # vertex 0 at the front centre, then towards +x
NECK_BLEND = 4                   # the rings nearer the neck than this are a relaxed membrane (a clean taper)

FLIP = V(-1.0, 1.0, 1.0)


# ================================================================================================ the field
def field(P, node=None):
    """Distance at points (N, 3), evaluated at |x| in spatial chunks so the blend tree culls far parts."""
    node = BODY if node is None else node
    P = np.atleast_2d(np.asarray(P, dtype=np.float64)).copy()
    P[:, 0] = np.abs(P[:, 0])
    out = np.empty(len(P))
    cell = np.floor(P / 0.06).astype(np.int64)
    order = np.lexsort((cell[:, 0], cell[:, 1], cell[:, 2]))
    for i in range(0, len(P), 256):
        idx = order[i:i + 256]
        Q = P[idx]
        out[idx] = node.eval(Q, Q.min(0) - 0.002, Q.max(0) + 0.002)
    return out


def in_zone(P, zones):
    P = np.atleast_2d(np.asarray(P, dtype=np.float64))
    m = np.zeros(len(P), bool)
    for c, r in zones:
        m |= (((np.abs(P[:, 0]) - c[0]) / r[0]) ** 2 + ((P[:, 1] - c[1]) / r[1]) ** 2
              + ((P[:, 2] - c[2]) / r[2]) ** 2) < 1
    return m


def detail_field(P):
    """The field with the fine carves (navel, the line down the abs, sternum) the cage leaves out."""
    P = np.atleast_2d(np.asarray(P, dtype=np.float64)).copy()
    d = field(P)
    P[:, 0] = np.abs(P[:, 0])
    for _, prim, k in DETAIL_CUTS:
        d = sdf.smax(d, -prim[0](P), k)
    return d


def detail_snap(P, iters=6, h=0.0003):
    """Move points onto detail_field's zero along its gradient (they start within a few mm of it)."""
    P = np.array(P, dtype=np.float64)
    for _ in range(iters):
        d = detail_field(P)
        g = np.stack([(detail_field(P + e) - detail_field(P - e)) / (2 * h) for e in np.eye(3) * h], 1)
        g /= np.maximum(np.linalg.norm(g, axis=1), 1e-9)[:, None]
        P -= g * np.clip(d, -0.006, 0.006)[:, None]
    return P


# The back of the hips: the cleft, the sacrum's edges and the fold under the glutes are creases about 1 cm across,
# finer than the cage (13 mm). The game mesh keeps one more subdivision there (build_body.py), its points put back
# onto the field (subdivision rounds the creases off, ~half their depth in the cleft).
FINE_BACK = [((0.0, -0.050, 1.020), (0.034, 0.055, 0.105)),     # the cleft and the sacrum over it
             ((0.022, -0.020, 1.072), (0.042, 0.040, 0.036)),    # the sacrum's sides, up to the dimples
             ((0.058, -0.050, 0.910), (0.072, 0.060, 0.042))]    # the fold under the glutes and the ball's lower curve


def fine_zone(P):
    P = np.atleast_2d(np.asarray(P, dtype=np.float64))
    return in_zone(P, FINE_BACK) & (P[:, 1] < 0.0)


def fine_weight(P, soft=0.35):
    """1 well inside the fine zone, falling to 0 at its edge (over the outer `soft` of each ellipsoid's radius)."""
    P = np.atleast_2d(np.asarray(P, dtype=np.float64))
    w = np.zeros(len(P))
    for c, r in FINE_BACK:
        q = np.sqrt(((np.abs(P[:, 0]) - c[0]) / r[0]) ** 2 + ((P[:, 1] - c[1]) / r[1]) ** 2 + ((P[:, 2] - c[2]) / r[2]) ** 2)
        w = np.maximum(w, np.clip((1.0 - q) / soft, 0.0, 1.0))
    return w * (P[:, 1] < 0.0)


def field_normals(P, h=0.0003):
    """Unit gradient of the field: the sculpt's own normals."""
    P = np.atleast_2d(np.asarray(P, dtype=np.float64))
    g = np.stack([(field(P + e) - field(P - e)) / (2 * h) for e in np.eye(3) * h], 1)
    return g / np.maximum(np.linalg.norm(g, axis=1), 1e-12)[:, None]


def fine_snap(P, iters=6, h=0.0002, max_move=0.008):
    """Newton steps along the field's gradient onto its zero (the nearest skin). Points that would move further than
    max_move stay where they are. Returns (points, moved mm)."""
    P = np.array(P, dtype=np.float64)
    Q = P.copy()
    for _ in range(iters):
        d = field(Q)
        g = np.stack([(field(Q + e) - field(Q - e)) / (2 * h) for e in np.eye(3) * h], 1)
        Q = Q - (np.clip(d, -0.004, 0.004) / np.maximum((g * g).sum(1), 1e-12))[:, None] * g
    mv = np.linalg.norm(Q - P, axis=1)
    ok = mv < max_move
    return np.where(ok[:, None], Q, P), mv


def cast(C, D, node=None, tmax=0.45):
    """First exit of the field along rays from C (inside) in unit directions D. Returns (points, t, bad)."""
    C = np.asarray(C, dtype=np.float64)
    D = np.asarray(D, dtype=np.float64)
    n = len(C)
    t = np.zeros(n)
    lo = np.zeros(n)
    hi = np.full(n, tmax)
    d = field(C, node)
    bad = d >= 0
    done = np.zeros(n, bool)
    for _ in range(300):
        act = np.flatnonzero(~done)
        if len(act) == 0:
            break
        tn = t[act] + np.maximum(0.6 * np.abs(d[act]), 0.0012)
        dn = field(C[act] + D[act] * tn[:, None], node)
        out = (dn > 0) | (tn > tmax)
        lo[act] = t[act]
        hi[act] = tn
        t[act] = tn
        d[act] = dn
        done[act[out]] = True
    for _ in range(18):
        mid = (lo + hi) / 2
        ins = field(C + D * mid[:, None], node) < 0
        lo = np.where(ins, mid, lo)
        hi = np.where(ins, hi, mid)
    t = (lo + hi) / 2
    return C + D * t[:, None], t, bad


def cast_near(C, D, t0, w=0.008):
    """cast() when the answer is known to be near t0 (re-projection after a small move)."""
    lo, hi = np.maximum(t0 - w, 0.0), t0 + w
    ok = (field(C + D * lo[:, None]) < 0) & (field(C + D * hi[:, None]) > 0)
    t = t0.copy()
    if ok.any():
        a, b = lo[ok], hi[ok]
        Cc, Dc = C[ok], D[ok]
        for _ in range(14):
            mid = (a + b) / 2
            ins = field(Cc + Dc * mid[:, None]) < 0
            a = np.where(ins, mid, a)
            b = np.where(ins, b, mid)
        t[ok] = (a + b) / 2
    if (~ok).any():
        _, t[~ok], _ = cast(C[~ok], D[~ok])
    return C + D * t[:, None], t


def snap(P, iters=4, h=0.0004, max_step=0.012):
    """Move points to the nearest zero of the field (Newton steps along the gradient)."""
    P = np.asarray(P, dtype=np.float64).copy()
    off = [V(h, 0, 0), V(0, h, 0), V(0, 0, h)]
    for _ in range(iters):
        d = field(P)
        g = np.stack([(field(P + o) - field(P - o)) / (2 * h) for o in off], 1)
        g2 = np.maximum(np.einsum("ij,ij->i", g, g), 1e-6)
        step = (d / g2)[:, None] * g
        n = np.linalg.norm(step, axis=1)
        step *= np.minimum(1.0, max_step / np.maximum(n, 1e-12))[:, None]
        P -= step
    return P


def normals(P, h=0.0004):
    off = [V(h, 0, 0), V(0, h, 0), V(0, 0, h)]
    g = np.stack([(field(P + o) - field(P - o)) / (2 * h) for o in off], 1)
    return g / np.maximum(np.linalg.norm(g, axis=1), 1e-12)[:, None]


def dirs(P, C):
    D = P - C
    return D / np.maximum(np.linalg.norm(D, axis=1), 1e-12)[:, None]


# ================================================================================================ the mesh
class Mesh:
    def __init__(self):
        self.P, self.C, self.F, self.part = [], [], [], []
        self.lerp = []           # (vertex, from, to, t): transition rings, placed between two cast rings

    def add(self, p, c, part):
        self.P.append(np.asarray(p, dtype=np.float64))
        self.C.append(np.asarray(c, dtype=np.float64))
        self.part.append(part)
        return len(self.P) - 1

    def face(self, *idx):
        self.F.append(tuple(int(i) for i in idx))

    def strip(self, a, b, closed=True):
        """Quads between two rings of the same length (lists of vertex indices)."""
        n = len(a)
        for k in range(n if closed else n - 1):
            k1 = (k + 1) % n
            self.face(a[k], a[k1], b[k1], b[k])

    def arrays(self):
        return np.array(self.P), np.array(self.C)


# ================================================================================================ the coarse cage
class Cage:
    """A hand-drawn coarse quad cage, +x half named, -x half mirrored (names get a ')."""

    def __init__(self):
        self.p, self.c, self.idx, self.mid = [], [], {}, set()
        self.quads, self.counts = [], {}

    def _add(self, name, p, c):
        self.idx[name] = len(self.p)
        self.p.append(p)
        self.c.append(c)

    def v(self, name, p, c):
        p, c = np.asarray(p, float), np.asarray(c, float)
        if abs(p[0]) < 1e-9:
            p = p * V(0, 1, 1)
            c = c * V(0, 1, 1)
            self.mid.add(name)
            self._add(name, p, c)
        else:
            self._add(name, p, c)
            self._add(name + "'", p * FLIP, c * FLIP)

    def m(self, name):
        return name if name in self.mid else name + "'"

    def quad(self, *names):
        self.quads.append([self.idx[n] for n in names])
        mirrored = [self.idx[self.m(n)] for n in names]
        if mirrored != self.quads[-1]:
            self.quads.append(mirrored)

    def count(self, a, b, n):
        for x, y in ((a, b), (self.m(a), self.m(b))):
            self.counts[frozenset((self.idx[x], self.idx[y]))] = n

    def subdivide(self, mesh):
        """Structured subdivision into mesh. Returns the final index of every coarse vertex (same as coarse)."""
        parent = {}

        def find(e):
            parent.setdefault(e, e)
            while parent[e] != e:
                parent[e] = parent[parent[e]]
                e = parent[e]
            return e

        def union(a, b):
            parent[find(a)] = find(b)

        E = lambda a, b: frozenset((a, b))
        for a, b, c, d in self.quads:
            union(E(a, b), E(d, c))
            union(E(b, c), E(a, d))
        chord = {}
        for e, n in self.counts.items():
            r = find(e)
            if chord.get(r, n) != n:
                raise ValueError(f"conflicting counts on a chord: {chord[r]} vs {n}")
            chord[r] = n

        def cnt(a, b):
            r = find(E(a, b))
            if r not in chord:
                inv = {v: k for k, v in self.idx.items()}
                raise ValueError(f"no count for chord through {inv[a]}-{inv[b]}")
            return chord[r]

        P, C = np.array(self.p), np.array(self.c)
        for i in range(len(P)):
            mesh.add(P[i], C[i], "torso")
        edge_pts = {}

        def side(a, b):
            n = cnt(a, b)
            key = (min(a, b), max(a, b))
            if key not in edge_pts:
                u, w = key
                ids = [u]
                for k in range(1, n):
                    s = k / n
                    ids.append(mesh.add(P[u] + (P[w] - P[u]) * s, C[u] + (C[w] - C[u]) * s, "torso"))
                ids.append(w)
                edge_pts[key] = ids
            ids = edge_pts[key]
            return ids if a == key[0] else ids[::-1]

        for a, b, c, d in self.quads:
            n, m = cnt(a, b), cnt(b, c)
            ab, dc, ad, bc = side(a, b), side(d, c), side(a, d), side(b, c)
            g = [[None] * (m + 1) for _ in range(n + 1)]
            for i in range(n + 1):
                g[i][0], g[i][m] = ab[i], dc[i]
            for j in range(m + 1):
                g[0][j], g[n][j] = ad[j], bc[j]
            for i in range(1, n):
                for j in range(1, m):
                    u, w = i / n, j / m
                    pp, cc = [], []
                    for arr in (mesh.P, mesh.C):
                        S = lambda q: arr[q]
                        val = ((1 - w) * S(ab[i]) + w * S(dc[i]) + (1 - u) * S(ad[j]) + u * S(bc[j])
                               - ((1 - u) * (1 - w) * S(a) + u * (1 - w) * S(b) + u * w * S(c) + (1 - u) * w * S(d)))
                        (pp if arr is mesh.P else cc).append(val)
                    g[i][j] = mesh.add(pp[0], cc[0], "torso")
            for i in range(n):
                for j in range(m):
                    mesh.face(g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1])


# ================================================================================================ helpers
def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


TRUNK_CY = np.array([(0.80, sdf.TRUNK_KEYS[0][1])] + [(k[0], k[1]) for k in sdf.TRUNK_KEYS if k[0] <= 1.40]
                    + [(1.5, 0.008)])


def axis_c(z):
    """The torso's axis at height z (the loft's centre line)."""
    return V(0.0, float(np.interp(z, TRUNK_CY[:, 0], TRUNK_CY[:, 1])), z)


def contour_point(z, frac, node=TORSO):
    """The point at arc fraction frac (0 front centre .. 1 back centre) round the +x half of the torso's
    horizontal section at z, seen from the torso axis."""
    c = axis_c(z)
    th = np.radians(np.linspace(0, 180, 181))
    D = np.stack([np.sin(th), np.cos(th), 0 * th], 1)
    pts, _, _ = cast(np.repeat(c[None], len(th), 0), D, node)
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])
    s = frac * L[-1]
    return V(*[np.interp(s, L, pts[:, k]) for k in range(3)])


class Axis:
    """A bone chain as a polyline with arc-length parameter, smoothed tangents and twist-free frames."""

    def __init__(self, pts, e1_hint, smooth=0.03, pre=0.15, post=0.15):
        self.pts = np.array(pts, dtype=np.float64)
        seg = np.diff(self.pts, axis=0)
        self.len = np.linalg.norm(seg, axis=1)
        self.cum = np.concatenate([[0], np.cumsum(self.len)])
        self.dirs = seg / self.len[:, None]
        self.smooth = smooth
        self.grid = np.arange(-pre, self.cum[-1] + post, 0.001)
        T = np.array([self._tan(s) for s in self.grid])
        e1 = np.asarray(e1_hint, float)
        E1 = []
        for t in T:
            e1 = unit(e1 - t * np.dot(e1, t))
            E1.append(e1)
        self.T = T
        self.E1 = np.array(E1)
        self.E2 = np.cross(self.T, self.E1)

    def at(self, s):
        s = np.atleast_1d(np.asarray(s, float))
        i = np.clip(np.searchsorted(self.cum, s, side="right") - 1, 0, len(self.len) - 1)
        return self.pts[i] + self.dirs[i] * (s - self.cum[i])[:, None]

    def _tan(self, s):
        acc = V(0, 0, 0)
        for k in np.linspace(-1, 1, 9):
            i = int(np.clip(np.searchsorted(self.cum, s + k * self.smooth, side="right") - 1, 0, len(self.len) - 1))
            acc = acc + self.dirs[i] * (1 - abs(k) * 0.5)
        return unit(acc)

    def frame(self, s):
        s = np.atleast_1d(np.asarray(s, float))
        i = np.clip(np.round((s - self.grid[0]) / 0.001).astype(int), 0, len(self.grid) - 1)
        return self.T[i], self.E1[i], self.E2[i]

    def project(self, P):
        """Arc-length parameter of the closest point on the chain (first segment extended backwards)."""
        best = np.full(len(P), np.inf)
        S = np.zeros(len(P))
        for i in range(len(self.len)):
            q = (P - self.pts[i]) @ self.dirs[i]
            q = np.clip(q, -1.0 if i == 0 else 0.0, self.len[i] + (1.0 if i == len(self.len) - 1 else 0.0))
            d = np.linalg.norm(self.pts[i] + self.dirs[i] * q[:, None] - P, axis=1)
            better = d < best
            best = np.where(better, d, best)
            S = np.where(better, self.cum[i] + q, S)
        return S


def ring_angles(axis, P, s):
    T, E1, E2 = axis.frame(s)
    R = P - axis.at(s)
    return np.arctan2(np.einsum("ij,ij->i", R, E2), np.einsum("ij,ij->i", R, E1))


def uniform_like(phi):
    """phi unwrapped into a monotonic run, and evenly spaced angles running the same way, best aligned with it.
    Blending the two (without wrapping) keeps every ring's vertex order: no vertex can cross a neighbour."""
    n = len(phi)
    pu = np.unwrap(phi)
    sig = 1.0 if pu[-1] > pu[0] else -1.0
    base = sig * 2 * np.pi * np.arange(n) / n
    off = float(np.mean(pu - base))
    return pu, off + base, sig


def tube(mesh, loop, axis, stations, m, part, m_phi=None, phi_end=None, end_rings=0, ell=(1.0, 1.0),
         ell_start=0):
    """
    Rings along an axis from an existing loop. stations: nominal arc positions of the new rings; the first m
    rings move each vertex linearly from its own start to stations[m-1] (so a tilted opening straightens).
    Angles go from the loop's own to evenly spaced over m_phi rings, then to phi_end over the last end_rings.
    ell: the section's (e1, e2) aspect for the cast directions, eased in from ring ell_start to the end.
    Returns the list of rings (vertex index lists), the loop first.
    """
    P0 = np.array([mesh.P[i] for i in loop])
    s0 = axis.project(P0)
    # angles of the opening round its own centre, in the frame of the first full ring: an opening tilted
    # against the bone (the arm hole) need not enclose the bone's axis, but it always encloses its centre
    _, F1, F2 = [a[0] for a in axis.frame(np.array([stations[m - 1]]))]
    R0 = P0 - P0.mean(0)
    phi0, phiu, sig = uniform_like(np.arctan2(R0 @ F2, R0 @ F1))
    m_phi = m_phi or m
    rings = [list(loop)]
    N = len(stations)
    for j in range(1, N + 1):
        S = stations[j - 1]
        if j <= m:
            s = s0 + (stations[m - 1] - s0) * (j / m)
        else:
            s = np.full(len(loop), S)
        phi = phi0 + (phiu - phi0) * smoothstep(j / m_phi)
        if phi_end is not None and end_rings:
            k = smoothstep((j - (N - end_rings)) / end_rings)
            phi = phi + (phiu + wrap(phi_end - phiu) - phi) * k
        T, E1, E2 = axis.frame(s)
        A = axis.at(s)
        ke = smoothstep((j - ell_start) / max(N - ell_start, 1)) if ell != (1.0, 1.0) else 0
        ea = 1 + (ell[0] - 1) * ke
        eb = 1 + (ell[1] - 1) * ke
        Dd = ea * np.cos(phi)[:, None] * E1 + eb * np.sin(phi)[:, None] * E2
        Dd /= np.linalg.norm(Dd, axis=1)[:, None]
        ring = [mesh.add(A[k] + Dd[k] * 0.05, A[k], part) for k in range(len(loop))]
        mesh.strip(rings[-1], ring)
        rings.append(ring)
    # the transition rings are placed between the opening and the first full ring, then snapped: rays from
    # the bone axis are unreliable where the limb meets the body (armpit, groin)
    if m > 1 and len(rings) > m:
        for j in range(1, m):
            for k in range(len(loop)):
                mesh.lerp.append((rings[j][k], rings[0][k], rings[m][k], j / m))
    return rings, sig


def boundary_loops(F):
    """Ordered boundary loops of a quad list."""
    cnt = {}
    for f in F:
        for k in range(len(f)):
            e = (f[k], f[(k + 1) % len(f)])
            key = (min(e), max(e))
            cnt[key] = cnt.get(key, 0) + 1
    nb = {}
    for (a, b), c in cnt.items():
        if c == 1:
            nb.setdefault(a, []).append(b)
            nb.setdefault(b, []).append(a)
    loops, seen = [], set()
    for v0 in nb:
        if v0 in seen:
            continue
        loop, prev, v = [v0], None, v0
        seen.add(v0)
        while True:
            nxt = [w for w in nb[v] if w != prev]
            w = nxt[0]
            if w == v0:
                break
            loop.append(w)
            seen.add(w)
            prev, v = v, w
        loops.append(loop)
    return loops


def loop_from(loop, start, toward):
    """Rotate/reverse a closed loop so it starts at start and goes next to toward."""
    i = loop.index(start)
    L = loop[i:] + loop[:i]
    if L[1] != toward:
        L = [L[0]] + L[1:][::-1]
    assert L[1] == toward
    return L


# ================================================================================================ the torso
COLS = ["F", "F1", "F2", "FC", "BC", "B2", "B1", "B"]
#           a   b   c   d   e1  e2  a      (segments between the columns; half ring = 24, full = 48)
COL_N = [2, 8, 2, 4, 2, 8, 2]
#      R0-0b 0b-1 R1-2 R2-3 R3-4 R4-5 R5-6   (rings between the coarse rings)
BAND_N = [2, 5, 6, 7, 4, 11, 4]
GUSSET_N = (4, 4)        # front, back along the crotch: the leg ring = 20 + 8 = 28
YOKE_V = 2               # rings between the yoke and the neck ring
INSET_N = 3              # concentric loops round the breast and the glute
YOKE_C = V(0.0, -0.005, 1.31)
BEND_R = 0.060           # the ankle's bend: its axis lies this far in front of the leg's axis ...
BEND_UP = 0.015          # ... and this far up it, clear of the tendon-filled crease at the front of the ankle
# extra cast centres for coarse vertices, by (ring, column)
ARMPIT_C = {}
RELAX = 10               # relaxation passes
FIT = 8                  # cage-to-limit fitting passes
PELVIS_C = V(0.0, 0.040, 1.000)

# The coarse rings. Each column: (z, arc fraction round the half section) or an explicit 3D point.
# R0 is the leg opening, R0b the glute fold. R4 rises to a point at the sternum: the ribcage edge.
# R5 runs under the breasts, R6 over them and through the armpits, R7 over the shoulders.
RINGS = [
    # R0: leg opening (explicit points, cast from the pelvis)
    [V(0, 0.100, 0.957), V(0.028, 0.100, 0.950), V(0.085, 0.105, 0.960), V(0.145, 0.060, 0.962),
     V(0.150, -0.025, 0.945), V(0.115, -0.085, 0.897), V(0.032, -0.070, 0.894), V(0, -0.060, 0.906)],
    # R0b: just above it, the glute fold at the back (the glute inset sits on it)
    [V(0, 0.104, 0.975), V(0.029, 0.104, 0.970), V(0.088, 0.108, 0.980), V(0.148, 0.060, 0.985),
     V(0.155, -0.027, 0.972), V(0.120, -0.090, 0.925), V(0.034, -0.078, 0.924), V(0, -0.068, 0.932)],
    [(1.000, 0.0), (1.000, 0.083), (1.008, 0.32), (1.025, 0.43), (1.030, 0.57), (1.030, 0.66), (1.028, 0.91),
     (1.028, 1.0)],
    [(1.075, 0.0), (1.075, 0.083), (1.078, 0.32), (1.088, 0.43), (1.090, 0.57), (1.090, 0.66), (1.090, 0.91),
     (1.090, 1.0)],
    [(1.195, 0.0), (1.190, 0.083), (1.168, 0.30), (1.145, 0.42), (1.145, 0.57), (1.150, 0.66), (1.160, 0.91),
     (1.160, 1.0)],
    [(1.232, 0.0), (1.232, 0.075), (1.215, 0.36), (1.205, 0.44), (1.205, 0.57), (1.210, 0.66), (1.212, 0.91),
     (1.212, 1.0)],
    [(1.362, 0.0), (1.362, 0.080), (1.350, 0.34), V(0.130, 0.050, 1.295), V(0.126, -0.044, 1.295),
     (1.335, 0.66), (1.342, 0.91), (1.342, 1.0)],
    [V(0, 0.072, 1.408), V(0.026, 0.072, 1.408), V(0.100, 0.070, 1.405), V(0.152, 0.040, 1.425),
     V(0.152, -0.045, 1.425), V(0.100, -0.062, 1.425), V(0.026, -0.062, 1.430), V(0, -0.062, 1.430)],
]


def neck_point(k):
    a = 2 * np.pi * k / NECK_N
    return V(NECK_R[0] * math.sin(a), NECK_CY + NECK_R[1] * math.cos(a), NECK_Z)


def surface_from(c, p):
    pts, _, bad = cast(c[None], unit(p - c)[None])
    return pts[0]


def coarse_torso():
    cg = Cage()
    for k, ring in enumerate(RINGS):
        for j, spec in enumerate(ring):
            name = f"{COLS[j]}_{k}"
            if isinstance(spec, tuple):
                z, fr = spec
                c = axis_c(z)
                p = contour_point(z, fr)
            else:
                p = spec
                c = PELVIS_C if k <= 1 else (YOKE_C if k == 7 else axis_c(p[2]))
                if (k, j) in ARMPIT_C:
                    c = ARMPIT_C[(k, j)]
            if j in (0, 7):
                p = p * V(0, 1, 1)
            cg.v(name, p, c)
    # crotch gusset: the front and back centre columns run on under the crotch
    cg.v("Cm", V(0, 0.040, 0.912), PELVIS_C)
    # cast from inside the thigh top, across the crotch corner (a ray from the pelvis would run down the thigh)
    cg.v("G1", V(0.026, 0.036, 0.916), V(0.075, 0.038, 0.975))
    # yoke over the shoulder and the neck ring
    cg.v("M1", V(0.072, 0.012, 1.455), YOKE_C)
    cg.v("M2", V(0.072, -0.048, 1.455), YOKE_C)
    for name, k in (("N0", 0), ("NP", 2), ("K1", 4), ("K2", 8), ("NQ", 10), ("N3", 12)):
        cg.v(name, neck_point(k), YOKE_C)

    # ---- torso quads, ring by ring
    holes = {(3, 6)}                       # the arm hole: side column, armpit to shoulder top
    insets = {(1, 5): "breast", (5, 1): "glute"}
    for k in range(len(RINGS) - 1):
        for j in range(7):
            q = [f"{COLS[j]}_{k}", f"{COLS[j + 1]}_{k}", f"{COLS[j + 1]}_{k + 1}", f"{COLS[j]}_{k + 1}"]
            if (j, k) in holes:
                continue
            if (j, k) in insets:
                inset(cg, q, insets[(j, k)])
                continue
            cg.quad(*q)
    for j in range(7):
        cg.count(f"{COLS[j]}_0", f"{COLS[j + 1]}_0", COL_N[j])
    for k in range(len(RINGS) - 1):
        cg.count(f"F_{k}", f"F_{k + 1}", BAND_N[k])
        cg.count(f"B_{k}", f"B_{k + 1}", BAND_N[k])      # the arm hole splits the R5-R6 band in two

    cg.quad("F1_0", "F_0", "Cm", "G1")
    cg.quad("G1", "Cm", "B_0", "B1_0")
    cg.count("F_0", "Cm", GUSSET_N[0])
    cg.count("Cm", "B_0", GUSSET_N[1])

    cg.quad("F_7", "F1_7", "NP", "N0")
    cg.quad("F1_7", "F2_7", "FC_7", "M1")
    cg.quad("M1", "FC_7", "BC_7", "M2")
    cg.quad("M2", "BC_7", "B2_7", "B1_7")
    cg.quad("F1_7", "M1", "K1", "NP")
    cg.quad("M1", "M2", "K2", "K1")
    cg.quad("M2", "B1_7", "NQ", "K2")
    cg.quad("B1_7", "B_7", "N3", "NQ")
    cg.count("F1_7", "NP", YOKE_V)
    cg.count("FC_7", "BC_7", COL_N[3])                 # the arm's top lines run on to the neck
    return cg


BREAST_C = V(0.064, 0.092, 1.293)
BREAST_N = unit(V(0.14, 1.0, -0.04))
GLUTE_C = V(0.060, -0.010, 0.975)
GLUTE_N = unit(V(0.30, -1.0, -0.10))


def inset(cg, q, kind):
    """Inset one coarse face: a small quad on the form's apex and four trapezoids round it."""
    if kind == "breast":
        c, n, half = BREAST_C, BREAST_N, (0.022 * sdf.BUST_SCALE, 0.022 * sdf.BUST_SCALE)
        out = unit(np.cross(n, V(0, 0, 1)))       # across, towards +x (outer)
        if out[0] < 0:
            out = -out
        # q = inner-lower, outer-lower, outer-upper, inner-upper
        offs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    else:
        c, n, half = GLUTE_C, GLUTE_N, (0.030, 0.032)
        out = unit(np.cross(V(0, 0, 1), n))
        if out[0] < 0:
            out = -out
        # q = outer-lower (B2_0), inner-lower (B1_0), inner-upper (B1_1), outer-upper (B2_1)
        offs = [(1, -1), (-1, -1), (-1, 1), (1, 1)]
    apex = surface_from(c, c + n)
    up = unit(np.cross(out, n))
    if up[2] < 0:
        up = -up
    names = []
    for i, (a, b) in enumerate(offs):
        name = f"{kind}{i}"
        p = apex + out * a * half[0] + up * b * half[1]
        cg.v(name, p, c)
        names.append(name)
    cg.quad(*names)
    for i in range(4):
        i1 = (i + 1) % 4
        cg.quad(q[i], q[i1], names[i1], names[i])
    cg.count(q[0], names[0], INSET_N)


# ================================================================================================ limbs
def leg(mesh, loop):
    hip, knee, ankle = J["hip"], J["knee"], J["ankle"]
    ax = Axis([hip, knee, ankle + (ankle - knee) * 0.0], V(0, 1, 0), smooth=0.05)
    s_knee, s_ankle = ax.cum[1], ax.cum[2]
    s_a = float(ax.project(np.array([mesh.P[i] for i in loop])).mean())
    s_end = s_ankle - 0.012                      # the last horizontal ring, above the ankle bones
    n1 = int(round((s_knee - s_a) / 0.016))
    stations = list(np.linspace(s_a, s_knee, n1 + 1)[1:])
    stations += list(np.linspace(s_knee, s_end, 30)[1:])
    rings, sig = tube(mesh, loop, ax, stations, m=9, part="leg", m_phi=14)
    foot(mesh, rings[-1], ax, s_end, sig)
    return rings


# the toe-base ring: 16 places across the foot (foot frame, mm), each with a vertex on top and one underneath
# (the leg's 32-vertex ring). The big toe on columns 0-2 (an 8-sided loop), the others on two columns each
# (6-sided): 4-5, 7-8, 10-11, 13-14; webs on 3, 6, 9, 12.
TOE_SLOTS = [-26.4, -18.0, -9.8, -1.6, 0.6, 7.3, 14.0, 17.0, 23.3, 29.6, 32.1, 37.2, 42.3, 44.8, 49.4, 54.1]
TOE_COLS = [(0, 3), (4, 6), (7, 9), (10, 12), (13, 15)]      # (first, last) slot of each toe, big toe first
WEB_COLS = [3, 6, 9, 12]
TOE_WEB_Y = (151.0, -0.20)        # the ring's y along the foot: y = 151 - 0.2 x (mm), just behind the clefts


def foot(mesh, last, ax, s_end, sig):
    """The leg bends forward about the front of the ankle into the foot; rings along the foot end in a ring at
    the toes' base whose vertices sit in 16 top/bottom pairs; five toes grow out of it like fingers."""
    o, Rf = sdf.foot_frame(J)
    fwd = Rf @ V(0, 1, 0)
    L = lambda x, y, z: o + Rf @ (V(x, y, z) / 1000.0)
    T, E1, E2 = [a[0] for a in ax.frame(s_end)]
    A = ax.at(s_end)[0]
    fwd_p = unit(fwd - T * np.dot(fwd, T))
    pax = unit(np.cross(T, fwd))
    P_last = np.array([mesh.P[i] for i in last])
    phi = np.arctan2((P_last - A) @ E2, (P_last - A) @ E1)
    n = len(last)
    assert n == 2 * len(TOE_SLOTS), n
    rings = [list(last)]
    # bend: the ring centres sweep a quarter circle whose axis lies in front of the ankle, outside the body,
    # so every ring plane turns about that outside line: the rings fan round the heel and close up (without
    # crossing) in the crease at the front of the ankle
    O = A + fwd_p * BEND_R - T * BEND_UP
    nb = 10
    for j in range(1, nb + 1):
        R = sdf.rot(pax, 90.0 * j / nb)
        c = O + R @ (A - O)
        e1, e2 = R @ E1, R @ E2
        D = np.cos(phi)[:, None] * e1 + np.sin(phi)[:, None] * e2
        ring = [mesh.add(c + D[k] * 0.05, c, "foot") for k in range(n)]
        mesh.strip(rings[-1], ring)
        rings.append(ring)
    R = sdf.rot(pax, 90.0)
    e1, e2 = R @ E1, R @ E2
    c0 = mesh.C[rings[-1][0]]
    y0 = float(np.dot(c0 - o, fwd)) * 1000
    # the toe-base ring: slots in loop order (top inner -> outer, then underneath outer -> inner)
    yw = lambda b: TOE_WEB_Y[0] + TOE_WEB_Y[1] * b
    slots = [(b, 1) for b in TOE_SLOTS] + [(b, -1) for b in TOE_SLOTS[::-1]]
    S_nom = np.array([L(b, yw(b), 40.0 if t > 0 else -5.0) for b, t in slots])
    cm = L(12.0, TOE_WEB_Y[0], 16.0)
    ang = np.arctan2((S_nom - cm) @ e2, (S_nom - cm) @ e1)
    # each slot is cast from its own toe's bone line: the toe's edge slots towards its upper / lower corners
    S_c, S_pt = [], []
    for b, t in slots:
        ti = [i for i, (s0, s1) in enumerate(TOE_COLS) if TOE_SLOTS[s0] <= b <= TOE_SLOTS[s1]][0]
        s0, s1 = TOE_COLS[ti]
        mid, hw = (TOE_SLOTS[s0] + TOE_SLOTS[s1]) / 2, (TOE_SLOTS[s1] - TOE_SLOTS[s0]) / 2
        pts = sdf.TOES[ti][1]
        xa = float(np.interp(yw(b), [q[1] for q in pts], [q[0] for q in pts]))
        za = float(np.interp(yw(b), [q[1] for q in pts], [q[2] for q in pts]))
        u = (b - mid) / hw
        S_c.append(L(xa, yw(b), za))
        S_pt.append(L(xa + 15.0 * u, yw(b), za + 15.0 * t))
    S_c, S_pt = np.array(S_c), np.array(S_pt)
    # ring vertex i -> slot: the cyclic shift (either way round) that best matches the ring's own angles
    best = None
    for order in (list(range(n)), list(range(n))[::-1]):
        for k in range(n):
            so = np.roll(np.array(order), k)
            e = float(np.sum(wrap(ang[so] - phi) ** 2))
            if best is None or e < best[0]:
                best = (e, so)
    slot_of = best[1]
    # along the foot: rings across it, the centre sinking towards the toes; the last few turn their vertices
    # towards their slots (direction and y)
    NR = max(4, int(round((140.0 - y0) / 9.0)))
    ys = np.linspace(y0, 140.0, NR + 1)[1:]
    zc = lambda y: float(np.interp(y, [y0, 80.0, 120.0, 145.0], [c0[2] * 1000, 36.0, 24.0, 18.0]))
    xc = lambda y: float(np.interp(y, [y0, 80.0, 120.0, 145.0], [0.0, 4.0, 8.0, 10.0]))
    NT = 5
    for j, y in enumerate(ys, 1):
        k = smoothstep((j - (NR - NT)) / NT)
        f = smoothstep((y - y0) / 60.0)
        ring = []
        for i in range(n):
            b, t = slots[slot_of[i]]
            yv = y + k * (yw(b) - TOE_WEB_Y[0]) * (y / 140.0)
            c = L(xc(yv), yv, zc(yv))
            D = np.cos(phi[i]) * e1 + np.sin(phi[i]) * e2
            D = D - 0.45 * f * D[2] * V(0, 0, 1)
            Ds = L(b, yv, 40.0 if t > 0 else -5.0) - c
            D = unit((1 - k) * unit(D) + k * unit(Ds))
            ring.append(mesh.add(c + D * 0.05, c, "foot"))
        mesh.strip(rings[-1], ring)
        rings.append(ring)
    ring = [mesh.add(S_pt[slot_of[i]], S_c[slot_of[i]], "foot") for i in range(n)]
    mesh.strip(rings[-1], ring)
    rings.append(ring)
    vid = {slots[slot_of[i]]: ring[i] for i in range(n)}
    top = lambda s: vid[(TOE_SLOTS[s], 1)]
    bot = lambda s: vid[(TOE_SLOTS[s], -1)]
    for c in WEB_COLS:
        mesh.face(top(c), top(c + 1), bot(c + 1), bot(c))
    for (s0, s1), (pts, radii, sx) in zip(TOE_COLS, sdf.toe_chains(J)):
        loop = [top(s) for s in range(s0, s1 + 1)] + [bot(s) for s in range(s1, s0 - 1, -1)]
        toe(mesh, loop, pts, radii)
    return rings


def toe(mesh, loop, pts, radii):
    """A toe from its base loop along its bone line (root to tip), closed at the tip by a ladder of quads."""
    ax = Axis(pts, V(0, 0, 1), smooth=0.006, pre=0.05, post=0.05)
    P0 = np.array([mesh.P[i] for i in loop])
    start = float(ax.project(P0).max()) + 0.004
    rt = radii[-1]
    end = float(ax.cum[-1]) + 0.40 * rt
    k = max(2, int(round((end - start) / 0.0068)))
    st = list(np.linspace(start, end, k + 1)) + [end + 0.45 * rt]
    rings, _ = tube(mesh, loop, ax, st, m=2, part="foot", m_phi=3)
    last = rings[-1]
    m = len(last)
    for i in range(m // 2 - 1):
        mesh.face(last[i], last[i + 1], last[m - 2 - i], last[m - 1 - i])
    return rings


def cap(mesh, ring, centre, normal, upv, part, wide, dome=0.01):
    """Close a ring with a grid (wide x (n/2 - wide)). The grid's long sides face upv."""
    n = len(ring)
    tall = n // 2 - wide
    P = np.array([mesh.P[i] for i in ring])
    c = P.mean(0)
    lat = unit(np.cross(normal, upv))
    ang = np.arctan2((P - c) @ upv, (P - c) @ lat)          # 90 deg = top centre
    # choose the start so the top side (wide edges) is centred on the top
    best, k0 = 1e9, 0
    for k in range(n):
        mid = [(k + i) % n for i in range(wide + 1)]
        score = abs(wrap(np.angle(np.mean(np.exp(1j * ang[mid]))) - np.pi / 2))
        if score < best:
            best, k0 = score, k
    order = [ring[(k0 + i) % n] for i in range(n)]
    top = order[:wide + 1]
    rside = order[wide:wide + tall + 1]
    bot = order[wide + tall:wide + tall + wide + 1][::-1]
    lside = order[wide + tall + wide:] + order[:1]
    g = [[None] * (tall + 1) for _ in range(wide + 1)]
    for i in range(wide + 1):
        g[i][tall], g[i][0] = top[i], bot[i]
    for j in range(tall + 1):
        g[0][j], g[wide][j] = lside[j], rside[tall - j]
    Pm = lambda q: mesh.P[q]
    for i in range(1, wide):
        for j in range(1, tall):
            u, w = i / wide, j / tall
            p = ((1 - w) * Pm(g[i][0]) + w * Pm(g[i][tall]) + (1 - u) * Pm(g[0][j]) + u * Pm(g[wide][j])
                 - ((1 - u) * (1 - w) * Pm(g[0][0]) + u * (1 - w) * Pm(g[wide][0]) + u * w * Pm(g[wide][tall])
                    + (1 - u) * w * Pm(g[0][tall])))
            g[i][j] = mesh.add(p + normal * dome * math.sin(math.pi * u) * math.sin(math.pi * w) ** 0.5,
                               centre - normal * 0.02, part)
    for i in range(wide):
        for j in range(tall):
            mesh.face(g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1])


def hand_frame():
    return sdf.hand_frame(J)


# the knuckle line: dorsal vertices across the hand (thumb side first), fingers on faces 0, 2, 4, 6
KNUCKLE_B = sdf.KNUCKLE_B
FINGERS = sdf.FINGERS


def rect_slots(B, T, sig_pos=True):
    """The palm section's 16 slots as (b, t): dorsal (t<0) thumb side to little finger, then palmar back."""
    bs = np.array(B) if np.ndim(B) else B * (1 - 2 * np.arange(8) / 7)
    top = [(b, -T) for b in bs]
    bot = [(b, T) for b in bs[::-1]]
    return top + bot


def arm(mesh, loop):
    sh, el, wr = J["shoulder"], J["elbow"], J["wrist"]
    _, u, w, pn = hand_frame()
    ax = Axis([sh, el, wr, wr + u * 0.20], V(0, 1, 0), smooth=0.04)
    s_el, s_wr = ax.cum[1], ax.cum[2]
    s_a = float(ax.project(np.array([mesh.P[i] for i in loop])).mean())
    n1 = int(round((s_el - s_a) / 0.011))            # rings ~11 mm apart, like the refs' arms
    stations = list(np.linspace(s_a, s_el, n1 + 1)[1:]) + list(np.linspace(s_el, s_wr, 23)[1:])
    # angles at the wrist: the palm's 16 slots
    T, E1, E2 = [a[0] for a in ax.frame(s_wr)]
    slots = rect_slots(0.026, 0.016)
    sl = np.array([np.arctan2(np.dot(b * w + t * pn, E2), np.dot(b * w + t * pn, E1)) for b, t in slots])
    P0 = np.array([mesh.P[i] for i in loop])
    s0 = ax.project(P0)
    _, phiu, sig = uniform_like(ring_angles(ax, P0, s0))
    if np.mean(wrap(np.diff(np.concatenate([sl, sl[:1]])))) * sig < 0:
        sl_order = list(range(16))[::-1]
    else:
        sl_order = list(range(16))
    sls = sl[sl_order]
    best, off = 1e9, 0
    for k in range(16):
        e = np.sum(wrap(np.roll(sls, k) - phiu) ** 2)
        if e < best:
            best, off = e, k
    slot_of = np.roll(np.array(sl_order), off)          # ring vertex i -> palm slot
    phi_end = sl[slot_of]
    rings, _ = tube(mesh, loop, ax, stations, m=4, part="arm", m_phi=7, phi_end=phi_end, end_rings=8,
                    ell=(1.0, 1.0))
    wrist = rings[-1]
    by_slot = [None] * 16
    for i, s in enumerate(slot_of):
        by_slot[s] = wrist[i]
    hand(mesh, by_slot)
    return rings


def hand(mesh, wrist_slots):
    """Palm rings from the wrist (16 slots), the thumb from the side, the fingers from the knuckle cap."""
    wr, u, w, pn = hand_frame()
    p = lambda a, b, c: wr + u * a + w * b + pn * c
    sc = sdf.HAND_BASE / 0.094              # the palm rings run from the wrist to the knuckles
    stations = [x * sc for x in (0.014, 0.028, 0.042, 0.055, 0.068, 0.080)]
    rings = [list(wrist_slots)]
    for j, a in enumerate(stations):
        k = smoothstep((a - 0.035 * sc) / (0.045 * sc))
        B = (1 - k) * 0.034 * (1 - 2 * np.arange(8) / 7) + k * np.array(KNUCKLE_B)
        T = 0.012 - 0.002 * k
        c = p(a, -0.002, 0.0)
        ring = []
        for b, t in rect_slots(B, T):
            q = p(a, b, t)
            cc = p(a, b * 0.55, 0.0)
            ring.append(mesh.add(q, cc, "hand"))
        rings.append(ring)
    # faces between palm rings, leaving out two side faces (rings 1..3) for the thumb
    thumb_faces = {(1, 15), (2, 15)}
    for j in range(len(rings) - 1):
        a, b = rings[j], rings[j + 1]
        for k in range(16):
            if (j, k) in thumb_faces:
                continue
            k1 = (k + 1) % 16
            mesh.face(a[k], a[k1], b[k1], b[k])
    # knuckle cap: webs on faces 1, 3, 5; fingers on 0, 2, 4, 6
    kn = rings[-1]
    D = kn[:8]
    Pp = kn[8:][::-1]                     # palmar, thumb side first
    for f in (1, 3, 5):
        mesh.face(D[f], D[f + 1], Pp[f + 1], Pp[f])
    chains, thumb = sdf.finger_chains(J)
    for i, ((b, lens, r, back), pts) in enumerate(zip(FINGERS, chains)):
        f = 2 * i
        loop = [D[f], D[f + 1], Pp[f + 1], Pp[f]]
        finger(mesh, loop, [pts[0] - u * 0.012] + pts, pn, r, r_tip=r * 0.60)
    # thumb from the side hole
    side = [rings[1][15], rings[1][0], rings[2][0], rings[3][0], rings[3][15], rings[2][15]]
    t0, t1, t2, t3 = thumb
    finger(mesh, side, [t0 - unit(t1 - t0) * 0.01, t0, t1, t2, t3], pn, 0.014, thumb=True, r_tip=0.0080)


def finger(mesh, loop, pts, pn, r, thumb=False, r_tip=None):
    ax = Axis(pts, pn, smooth=0.006, pre=0.05, post=0.05)
    P0 = np.array([mesh.P[i] for i in loop])
    s0 = ax.project(P0)
    joints = list(ax.cum[1:])
    st = []
    start = max(s0.max(), ax.cum[1] * 0.3) + 0.004
    seg = [start] + [j for j in joints if j > start + 0.004]
    # the tip ring sits out on the tip's round cap (past the last joint), so the cap closes round, not square
    rt = r_tip if r_tip else r * 0.62
    seg[-1] += 0.40 * rt
    for a, b in zip(seg[:-1], seg[1:]):
        n = max(2, int(round((b - a) / 0.0065)))
        st += list(np.linspace(a, b, n + 1)[1:] if st else np.linspace(a, b, n + 1))
    st.append(seg[-1] + 0.45 * rt)         # a small last ring near the very tip: the cap quad closes small
    rings, _ = tube(mesh, loop, ax, st, m=2, part="hand", m_phi=3)
    last = rings[-1]
    if len(last) == 4:
        mesh.face(*last)
    else:
        mesh.face(last[0], last[1], last[2], last[3])
        mesh.face(last[3], last[4], last[5], last[0])
    # the tip cap's vertices are cast from a point inside the tip
    return rings


# ================================================================================================ fitting
def topology(F, n):
    E = set()
    diag = []
    for f in F:
        for k in range(4):
            a, b = f[k], f[(k + 1) % 4]
            E.add((min(a, b), max(a, b)))
            diag.append((f[k], f[(k + 2) % 4]))
    E = np.array(sorted(E))
    diag = np.array(diag)
    return E, diag


def laplacian(P, E, n):
    acc = np.zeros_like(P)
    cnt = np.zeros(n)
    np.add.at(acc, E[:, 0], P[E[:, 1]])
    np.add.at(acc, E[:, 1], P[E[:, 0]])
    np.add.at(cnt, E[:, 0], 1)
    np.add.at(cnt, E[:, 1], 1)
    return acc / np.maximum(cnt, 1)[:, None], cnt


def folded(P, F, tol=0.2):
    """Quads whose two triangles (split either way) face apart: folds and bow-ties."""
    a, b, c, d = (P[F[:, k]] for k in range(4))
    out = np.zeros(len(F), bool)
    for (p, q, r), (u, v, w) in (((a, b, d), (c, d, b)), ((a, b, c), (a, c, d))):
        n1 = np.cross(q - p, r - p)
        n2 = np.cross(v - u, w - u)
        cs = np.einsum("ij,ij->i", n1, n2) / np.maximum(np.linalg.norm(n1, axis=1) * np.linalg.norm(n2, axis=1), 1e-18)
        out |= cs < tol
    return out


def ring_of(F, E, faces, n):
    v = np.zeros(n, bool)
    v[F[faces].ravel()] = True
    grow = v.copy()
    grow[E[:, 0][v[E[:, 1]]]] = True
    grow[E[:, 1][v[E[:, 0]]]] = True
    return grow


def limit(P, E, diag, n):
    """Catmull-Clark limit positions of a closed-ish quad cage: (n^2 v + 4 sum e + sum f) / (n (n + 5))."""
    acc_e = np.zeros_like(P)
    val = np.zeros(n)
    np.add.at(acc_e, E[:, 0], P[E[:, 1]])
    np.add.at(acc_e, E[:, 1], P[E[:, 0]])
    np.add.at(val, E[:, 0], 1)
    np.add.at(val, E[:, 1], 1)
    acc_f = np.zeros_like(P)
    np.add.at(acc_f, diag[:, 0], P[diag[:, 1]])
    v = val[:, None]
    return (v * v * P + 4 * acc_e + acc_f) / (v * (v + 5))


def make(log=print):
    """The whole cage. Returns (P (N,3), faces (M,4), info dict)."""
    mesh = Mesh()
    cg = coarse_torso()
    cg.subdivide(mesh)
    nt = len(mesh.P)
    P, C = mesh.arrays()
    # symmetric pairs in the torso (it was laid out symmetrically)
    key = {tuple(np.round(p, 7)): i for i, p in enumerate(P)}
    mirror = np.array([key[tuple(np.round(p * FLIP, 7))] for p in P])
    log(f"torso grid: {nt} verts, {len(mesh.F)} faces")

    loops = boundary_loops(mesh.F)
    idx = cg.idx
    neck = [l for l in loops if idx["N0"] in l][0]
    i = neck.index(idx["N0"])
    neck = neck[i:] + neck[:i]
    if P[neck[1]][0] < 0:
        neck = [neck[0]] + neck[1:][::-1]
    assert len(neck) == NECK_N, len(neck)
    arm_hole = [l for l in loops if idx["FC_6"] in l][0]
    leg_hole = [l for l in loops if idx["G1"] in l][0]
    log(f"neck {len(neck)}, arm hole {len(arm_hole)}, leg opening {len(leg_hole)}")

    # the torso onto the field first (limbs start from where its openings land)
    fixed = np.zeros(nt, bool)
    fixed[neck] = True
    for k, v in enumerate(neck):
        P[v] = neck_point(k)
    hop = ring_distance(mesh.F, neck, nt)
    wgt = (hop >= NECK_BLEND).astype(float)
    P0 = P.copy()
    D = dirs(P, C)
    Q, _, bad = cast(C, D)
    P = np.where(fixed[:, None], P, P + (Q - P) * wgt[:, None])
    # the arm hole is snapped, not cast: round the armpit every ray grazes the underside of the arm
    holes = np.array(arm_hole + [int(mirror[v]) for v in arm_hole])
    P[holes] = snap(P0[holes], iters=8)
    log(f"torso cast, centres outside: {int(bad.sum())}")
    mesh.P = list(P)

    leg(mesh, leg_hole)
    arm(mesh, arm_hole)

    # mirror the limbs
    n1 = len(mesh.P)
    P, C = mesh.arrays()
    mir = np.concatenate([mirror, np.arange(nt, n1) + (n1 - nt)])
    P = np.concatenate([P, P[nt:] * FLIP])
    C = np.concatenate([C, C[nt:] * FLIP])
    F = list(mesh.F)
    F += [tuple(int(mir[i]) for i in f) for f in mesh.F if any(i >= nt for i in f)]
    full_mirror = np.concatenate([mir[:n1], np.arange(nt, n1)])
    parts = mesh.part + mesh.part[nt:]
    F = np.array(F)
    n = len(P)
    log(f"cage: {n} verts, {len(F)} quads")

    fixed = np.zeros(n, bool)
    fixed[neck] = True
    hop = ring_distance(F, neck, n)
    lim = np.arange(n) >= nt
    D = dirs(P, C)
    Q, T, bad = cast(C, D)
    log(f"limb cast, centres outside: {int(bad[lim].sum())} "
        f"{sorted(set(parts[i] for i in np.flatnonzero(bad & lim)))}")
    P[lim] = Q[lim]
    rec = mesh.lerp + [(int(mir[v]), int(mir[a_]), int(mir[b_]), t) for v, a_, b_, t in mesh.lerp]
    if rec:
        v_, a_, b_, t_ = [np.array(x) for x in zip(*rec)]
        P[v_] = P[a_] + (P[b_] - P[a_]) * t_[:, None]
        P[v_] = snap(P[v_])
    P = symmetrise(P, full_mirror)

    E, diag = topology(F, n)
    # ---- relax: even quads, kept on the surface
    blend = (hop >= NECK_BLEND).astype(float)
    for it in range(RELAX):
        avg, _ = laplacian(P, E, n)
        Pn = P + (avg - P) * 0.5
        Q = snap(Pn, iters=2)
        Pn = Pn + (Q - Pn) * blend[:, None]
        P = np.where(fixed[:, None], P, Pn)
        P = symmetrise(P, full_mirror)
    P = np.where((blend[:, None] >= 1) & ~fixed[:, None], snap(P), P)
    # untangle what relaxation left folded (finger webs, the back of the armpit): smooth just there
    for it in range(12):
        bad = folded(P, F)
        if not bad.any():
            break
        m = ring_of(F, E, np.flatnonzero(bad), n) & ~fixed
        avg, _ = laplacian(P, E, n)
        Pn = P + (avg - P) * 0.7
        Pn = Pn + (snap(Pn, iters=2) - Pn) * blend[:, None]
        P = np.where(m[:, None], Pn, P)
        P = symmetrise(P, full_mirror)
    log(f"relaxed, folded quads left: {int(folded(P, F).sum())}")
    surf = P.copy()

    # ---- push the cage out so its limit surface lies on the field (smoothed, clamped offsets)
    Pc = P.copy()
    Nrm = normals(surf)
    for it in range(FIT):
        L = limit(Pc, E, diag, n)
        delta = snap(L, iters=3) - L
        for _ in range(2):
            avg, _ = laplacian(delta, E, n)
            delta = 0.5 * delta + 0.5 * avg
        nd = np.linalg.norm(delta, axis=1)
        delta *= np.minimum(1.0, 0.003 / np.maximum(nd, 1e-12))[:, None]
        Pc = np.where(fixed[:, None], Pc, Pc + delta * blend[:, None])
        # the cage may sit up to 12 mm outside the surface (convex forms) but only 2 mm inside (creases):
        # narrow grooves finer than the cage (navel, the line down the abs) must not be dug in
        off = Pc - surf
        on = np.einsum("ij,ij->i", off, Nrm)
        tang = off - on[:, None] * Nrm
        on = np.clip(on, -0.002, 0.012)
        Pc = surf + tang * 0.5 + on[:, None] * Nrm
        Pc = symmetrise(Pc, full_mirror)
        log(f"fit {it}: max {nd.max() * 1000:.1f} mm, mean {nd.mean() * 1000:.2f} mm")
    # where pushing the cage out folded a quad (toe cap, fingers), take the push back by halves
    for it in range(8):
        bad = folded(Pc, F)
        if not bad.any():
            break
        m = ring_of(F, E, np.flatnonzero(bad), n)
        Pc = np.where(m[:, None], surf + (Pc - surf) * 0.5, Pc)
    log(f"cage folded quads: {int(folded(Pc, F).sum())}")
    L = limit(Pc, E, diag, n)
    err = np.abs(field(L))
    log(f"limit surface off the field: mean {err.mean() * 1000:.2f} mm, 99% {np.percentile(err, 99) * 1000:.2f} mm, "
        f"max {err.max() * 1000:.1f} mm")
    return Pc, F, dict(neck=neck, mirror=full_mirror, parts=parts, surface=surf, ntorso=nt)


def ring_distance(F, start, n):
    """Edge hops from a set of vertices."""
    nb = [[] for _ in range(n)]
    for f in F:
        for k in range(4):
            a, b = f[k], f[(k + 1) % 4]
            nb[a].append(b)
            nb[b].append(a)
    d = np.full(n, 10 ** 6)
    frontier = list(start)
    for v in frontier:
        d[v] = 0
    while frontier:
        nxt = []
        for v in frontier:
            for w in nb[v]:
                if d[w] > d[v] + 1:
                    d[w] = d[v] + 1
                    nxt.append(w)
        frontier = nxt
    return d.astype(float)


def symmetrise(P, mirror):
    Q = (P + P[mirror] * FLIP) / 2
    Q[mirror == np.arange(len(P)), 0] = 0.0
    return Q


# ================================================================================================ Blender
def build(bm, log=print):
    """Fill bm with the body cage. Returns the info dict (neck ring indices etc.)."""
    import bmesh
    from mathutils import Vector
    P, F, info = make(log)
    vs = [bm.verts.new(Vector(p)) for p in P]
    for f in F:
        bm.faces.new([vs[i] for i in f])
    bm.verts.index_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return info
