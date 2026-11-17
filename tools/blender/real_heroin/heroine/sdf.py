"""
The heroine's body as a signed distance field: built from scratch, part by part, like clay.

Pure numpy (runs in Blender's Python and in plain Python), so the shape can be measured without Blender.
Units are metres, z up, +y front, x to her left; she stands barefoot at STATURE.
Proportions and joint places come from the reference study (MODEL_STUDY.md: the median of nine stylised
heroines, heels taken out). No reference mesh is used: every part below is a primitive placed by hand.

Only the +x half is authored. Every point is evaluated at |x|, so she is symmetric.
"""
import math
import numpy as np

STATURE = 1.70


# ---------------------------------------------------------------------------------------------------- vectors
def V(*a):
    return np.array(a, dtype=np.float64)


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


def lerp(a, b, t):
    return a + (b - a) * t


def frame(axis, hint):
    """An orthonormal frame (columns u, v, w) with u along axis and v as near hint as possible."""
    u = unit(axis)
    v = np.asarray(hint, dtype=np.float64) - u * np.dot(hint, u)
    v = unit(v)
    w = np.cross(u, v)
    return np.stack([u, v, w], axis=1)


def rot(axis, deg):
    """Rotation matrix about an axis."""
    a = unit(axis)
    t = math.radians(deg)
    c, s = math.cos(t), math.sin(t)
    x, y, z = a
    return np.array([[c + x * x * (1 - c), x * y * (1 - c) - z * s, x * z * (1 - c) + y * s],
                     [y * x * (1 - c) + z * s, c + y * y * (1 - c), y * z * (1 - c) - x * s],
                     [z * x * (1 - c) - y * s, z * y * (1 - c) + x * s, c + z * z * (1 - c)]])


# ---------------------------------------------------------------------------------------------------- primitives
# Every primitive returns (distance function of an (N, 3) array, bounding box (lo, hi)).

def sphere(c, r):
    c = V(*c)
    return (lambda P: np.linalg.norm(P - c, axis=1) - r), (c - r, c + r)


def ellipsoid(c, r, R=None):
    """An ellipsoid with radii r along the columns of R (world axes if R is None). Approximate distance."""
    c, r = V(*c), V(*r)
    R = np.eye(3) if R is None else R

    def f(P):
        q = (P - c) @ R
        k0 = np.linalg.norm(q / r, axis=1)
        k1 = np.linalg.norm(q / (r * r), axis=1)
        return np.where(k1 > 1e-12, k0 * (k0 - 1.0) / np.maximum(k1, 1e-12), -r.min())
    ext = np.abs(R) @ r
    return f, (c - ext, c + ext)


def cone(a, b, ra, rb):
    """A round cone: a capsule from a to b whose radius goes from ra to rb (exact distance)."""
    a, b = V(*a), V(*b)
    ba = b - a
    l2 = float(ba @ ba)
    rr = ra - rb
    a2 = l2 - rr * rr
    il2 = 1.0 / l2

    def f(P):
        pa = P - a
        y = pa @ ba
        z = y - l2
        x2v = pa * l2 - y[:, None] * ba
        x2 = np.einsum("ij,ij->i", x2v, x2v)
        y2 = y * y * l2
        z2 = z * z * l2
        k = math.copysign(1.0, rr) * rr * rr * x2
        d_mid = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - ra
        d_b = np.sqrt(x2 + z2) * il2 - rb
        d_a = np.sqrt(x2 + y2) * il2 - ra
        return np.where(np.sign(z) * a2 * z2 > k, d_b, np.where(np.sign(y) * a2 * y2 < k, d_a, d_mid))
    m = max(ra, rb)
    return f, (np.minimum(a, b) - m, np.maximum(a, b) + m)


def chain(points, radii):
    """Round cones joined end to end (a limb or a finger)."""
    return [cone(points[i], points[i + 1], radii[i], radii[i + 1]) for i in range(len(points) - 1)]


def chain_s(points, radii, s):
    """Round cones joined end to end, squashed: the cross-section is an ellipse (radius times s per axis).
    The axis still runs through the given points. Approximate distance (scaled by the smallest factor)."""
    s = V(*s)
    c = np.mean(points, axis=0)
    out = []
    for (f, (lo, hi)) in chain([c + (p - c) / s for p in points], radii):
        out.append(((lambda P, f=f: f(c + (P - c) / s) * s.min()), (c + (lo - c) * s, c + (hi - c) * s)))
    return out


def line_shape(points, radii):
    """A chain of round cones as one shape (hard union), so a carve along it has no beads at the joints."""
    cs = chain(points, radii)
    lo = np.min([c[1][0] for c in cs], 0); hi = np.max([c[1][1] for c in cs], 0)
    return (lambda P: np.minimum.reduce([c[0](P) for c in cs])), (lo, hi)


def sacrum(z0, slope, back, top, bend=0.0):
    """The sacrum's flat plate: an inverted triangle on the back's midline, its point at z0 (the top of the cleft),
    its sides |x| = slope (z - z0) (the glutes' upper inner borders, the 'V'), up to z = top. Its back face is the
    surface y = back[0] + back[1] (z - back[2]) + bend (z - back[2])^2 above back[2] (it sinks into the back at its top,
    so it fades out instead of ending in a step). A convex solid (max of planes), approximate distance."""
    y0, ty, zr = back
    nb = math.sqrt(1 + ty * ty)
    ne = math.sqrt(1 + slope * slope)

    def f(P):
        x, y, z = np.abs(P[:, 0]), P[:, 1], P[:, 2]
        d_back = ((y0 + ty * (z - zr) + bend * np.maximum(z - zr, 0.0) ** 2) - y) / nb
        d_edge = (x - slope * (z - z0)) / ne
        return np.maximum(np.maximum(d_back, d_edge), np.maximum(z - top, y - 0.03))
    w = slope * (top - z0) + 0.01
    return f, (V(-w, y0 - 0.03, z0 - 0.01), V(w, 0.03, top + 0.01))


def halfspace(point, normal):
    """Everything on the negative side of a plane (distance is positive along normal)."""
    p, n = V(*point), unit(normal)
    return (lambda P: (P - p) @ n), (V(-9, -9, -9), V(9, 9, 9))


# ---------------------------------------------------------------------------------------------------- smooth tables
def spline(keys):
    """A smooth curve through (t, value...) keys: Catmull-Rom with clamped ends, evaluated vectorised."""
    keys = np.array(keys, dtype=np.float64)
    t = keys[:, 0]
    vals = keys[:, 1:]
    n = len(t)
    slope = np.zeros_like(vals)
    for i in range(n):
        a, b = max(0, i - 1), min(n - 1, i + 1)
        slope[i] = (vals[b] - vals[a]) / (t[b] - t[a])
    # ends flat so the curve doesn't overshoot past the last key
    slope[0] = 0
    slope[-1] = 0

    def f(x):
        x = np.clip(np.asarray(x, dtype=np.float64), t[0], t[-1])
        i = np.clip(np.searchsorted(t, x, side="right") - 1, 0, n - 2)
        h = t[i + 1] - t[i]
        s = ((x - t[i]) / h)[:, None]
        h00 = 2 * s ** 3 - 3 * s ** 2 + 1
        h10 = s ** 3 - 2 * s ** 2 + s
        h01 = -2 * s ** 3 + 3 * s ** 2
        h11 = s ** 3 - s ** 2
        return h00 * vals[i] + h10 * h[:, None] * slope[i] + h01 * vals[i + 1] + h11 * h[:, None] * slope[i + 1]
    return f


def limb(a, b, keys, s_lo, s_hi, cap, out_hint):
    """
    A limb section lofted along the bone a -> b: at each key (s along the bone, 0..1) the radius from the bone line
    at 8 angles: front, front-outer, outer, back-outer, back, back-inner, inner, front-inner (front = +y made
    perpendicular to the bone, outer = away from the body, given by out_hint). Smooth in both directions: a spline
    along the bone, a trigonometric curve through the 8 radii round it.
    """
    a, b = V(*a), V(*b)
    L = float(np.linalg.norm(b - a))
    u = (b - a) / L
    f = V(0, 1, 0) - u * u[1]
    f = f / np.linalg.norm(f)
    o = np.cross(f, u)
    if o @ out_hint < 0:
        o = -o
    rad = spline(keys)
    th = np.radians(np.arange(8) * 45.0)
    # radii (8) -> trig coefficients: r(t) = c0 + sum_n (an cos nt + bn sin nt), n 1..3, + a4 cos 4t (exact at 8)
    M = np.zeros((8, 8))
    M[:, 0] = 1
    for n in (1, 2, 3):
        M[:, 2 * n - 1] = np.cos(n * th)
        M[:, 2 * n] = np.sin(n * th)
    M[:, 7] = np.cos(4 * th)
    Minv = np.linalg.inv(M)

    def d(P):
        q = P - a
        s = (q @ u) / L
        x = q @ f
        y = q @ o
        rho = np.sqrt(x * x + y * y)
        t = np.arctan2(y, x)
        C = rad(s) @ Minv.T / 1000.0
        B = np.stack([np.ones_like(t), np.cos(t), np.sin(t), np.cos(2 * t), np.sin(2 * t), np.cos(3 * t), np.sin(3 * t),
                      np.cos(4 * t)], 1)
        R = np.einsum("ij,ij->i", C, B)
        side = (rho - R) * 0.9
        ends = np.maximum((s_lo - s) * L, (s - s_hi) * L)
        return smax(side, ends, cap)
    m = max(max(k[1:]) for k in keys) / 1000.0 + 0.01
    p0, p1 = a + u * s_lo * L, a + u * s_hi * L
    return d, (np.minimum(p0, p1) - m, np.maximum(p0, p1) + m)


def loft(keys, z_lo, z_hi, cap):
    """
    The trunk: a stack of cross-sections, each a superellipse with its own front and back depth.
    keys: (z, centre y, half width, front depth, back depth, squareness[, back squareness]); squareness 2 is an
    ellipse. The back's squareness defaults to the front's.
    """
    keys = [tuple(k) + ((k[5],) if len(k) == 6 else ()) for k in keys]
    f = spline(keys)

    def d(P):
        z = P[:, 2]
        cy, a, fd, bd, nf, nb = f(z).T
        x = np.abs(P[:, 0])
        dy = P[:, 1] - cy
        depth = np.where(dy > 0, fd, bd)
        n = np.where(dy > 0, nf, nb)
        u, v = x / a, np.abs(dy) / depth
        r = np.power(np.power(u, n) + np.power(v, n), 1.0 / n)
        rho = np.sqrt(x * x + dy * dy)
        side = rho * (1.0 - 1.0 / np.maximum(r, 1e-6))
        # inside, distance to the nearest wall is roughly (r - 1) times the smaller radius
        side = np.where(r < 1, (r - 1) * np.minimum(a, depth), side)
        ends = np.maximum(z_lo - z, z - z_hi)
        return smax(side, ends, cap)
    zs = np.array([k[0] for k in keys])
    w = max(max(k[2], k[3], k[4]) for k in keys) + 0.05
    return d, (V(-w, -w - 0.2, z_lo - 0.01), V(w, w + 0.2, z_hi + 0.01))


# ---------------------------------------------------------------------------------------------------- blending
def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b + (a - b) * h - k * h * (1.0 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def blend(forms):
    """One form from several: [(prim, k)], each smooth-unioned onto the ones before it with its own k."""
    def f(P):
        d = forms[0][0][0](P)
        for (g, _), k in forms[1:]:
            d = smin(d, g(P), k)
        return d
    lo = np.min([p[1][0] - k for p, k in forms], 0); hi = np.max([p[1][1] + k for p, k in forms], 0)
    return f, (lo, hi)


class Node:
    """A blend tree: union of children with smoothing k, then optional carves (smooth subtract)."""

    def __init__(self, name, k=0.0):
        self.name, self.k = name, k
        self.parts = []   # (kind, item, k): kind "add" (union), "cut" (subtract), "node"

    def add(self, prim, k=None):
        self.parts.append(("add", prim, self.k if k is None else k))
        return self

    def adds(self, prims, k=None):
        for p in prims:
            self.add(p, k)
        return self

    def cut(self, prim, k):
        self.parts.append(("cut", prim, k))
        return self

    def sub(self, node, k=None):
        self.parts.append(("node", node, self.k if k is None else k))
        return node

    def bounds(self):
        lo, hi = V(9, 9, 9), V(-9, -9, -9)
        for kind, item, k in self.parts:
            if kind == "cut":
                continue
            b = item.bounds() if kind == "node" else item[1]
            lo, hi = np.minimum(lo, b[0] - k), np.maximum(hi, b[1] + k)
        return lo, hi

    def eval(self, P, lo, hi, far=1.0):
        """Distance at P (all points inside the box lo..hi); parts whose box misses it are skipped."""
        d = None
        for kind, item, k in self.parts:
            b = item.bounds() if kind == "node" else item[1]
            if kind != "cut" and (np.any(b[0] - k - 0.02 > hi) or np.any(b[1] + k + 0.02 < lo)):
                continue
            if kind == "cut":
                if d is None or np.any(b[0] - k > hi) or np.any(b[1] + k < lo):
                    continue
                d = smax(d, -item[0](P), k)
                continue
            v = item.eval(P, lo, hi, far) if kind == "node" else item[0](P)
            d = v if d is None else smin(d, v, k)
        return np.full(len(P), far) if d is None else d


# ---------------------------------------------------------------------------------------------------- the skeleton
def skeleton(arm_angle=41.5, stance=1.0):
    """
    Joint places in metres (the +x side), from the study's median heroine at 1.70 m barefoot.
    arm_angle: arms out from vertical in degrees (the refs stand at ~41.5).
    """
    H = STATURE
    J = {}
    J["crotch"] = V(0, 0.040, 0.526 * H)
    J["pelvis"] = V(0, 0.040, 0.6045 * H)
    J["hip"] = V(0.0534 * H, 0.036, 0.5816 * H)
    J["knee"] = V(0.0534 * H + 0.064 * stance, 0.000, 0.3273 * H)     # refs: knee line y = 0
    J["ankle"] = V(0.0534 * H + 0.112 * stance, -0.055, 0.045 * H)   # the shin slants back (refs -0.054..-0.083)
    J["spine3"] = V(0, 0.066, 0.698 * H)
    J["neck"] = V(0, -0.002, 0.8485 * H)
    J["head"] = V(0, 0.016, 0.911 * H)
    J["chin"] = V(0, 0.082, 0.881 * H)
    J["shoulder"] = V(0.0737 * H, -0.012, 0.8172 * H)
    J["clavicle"] = V(0.0194 * H, 0.030, 0.8287 * H)
    a = math.radians(arm_angle)
    down = V(math.sin(a), 0.0, -math.cos(a))
    J["elbow"] = J["shoulder"] + 0.142 * H * unit(down + V(0, -0.03, 0))
    J["wrist"] = J["elbow"] + 0.1476 * H * unit(down + V(0, 0.22, 0))
    J["arm_down"] = down
    J["hand_len"] = 0.1063 * H
    return J


# ---------------------------------------------------------------------------------------------------- the body
# The trunk loft: pelvis to neck, in her own barefoot posture (pelvis tipped forward, the lumbar arched in, the
# ribcage up). Measured against the refs' torsos relative to each one's spine line (hip centre to neck base).
#        z      cy     half   front  back   square
BUST_SCALE = 1.24     # breast size: 1.0 = the references' (~520 ml each, about a C/D); 1.24 = ~945 ml, an F cup (her default)
# the breast's forms at the references' size (grown by BUST_SCALE in build): centre, radii (forward, up, across),
# axis, nipple, blend into the chest
BUST = dict(c=(0.0720, 0.1440, 1.2880), r=(0.0435, 0.048, 0.0475), axis=(0.14, 1.0, -0.04), nip_d=-0.0030, k=0.020,
            extra=[
                # the inner side: fills the slot between them so it slopes down to the cleavage (refs)
                dict(c=(0.0460, 0.1300, 1.2920), r=(0.0300, 0.0240, 0.0400), k=0.025),
                # the cleavage's floor: one soft form across the midline (no crease down the middle)
                dict(c=(0.0, 0.1230, 1.2840), r=(0.0300, 0.0200, 0.0300), k=0.025, mid=True),
                # the tail: the outer side runs on up into the front of the armpit (no notch against the chest)
                dict(c=(0.1039, 0.1100, 1.3102), axis=(0.2, -0.25, 1.0), r=(0.0444, 0.0194, 0.0137), k=0.020),
                # the fold: the underside curves into the chest instead of a shelf over a crease
                dict(c=(0.0676, 0.1245, 1.2465), r=(0.0274, 0.0161, 0.0113), k=0.020),
                # the upper outer corner: the tail runs on into the pectoral without a bay
                dict(c=(0.1063, 0.1197, 1.3271), r=(0.0113, 0.0177, 0.0210), k=0.015),
            ])

TRUNK_KEYS = [
        (0.930, 0.035, 0.118, 0.072, 0.075, 2.2),
        (0.980, 0.049, 0.122, 0.081, 0.076, 2.3),
        (1.030, 0.065, 0.124, 0.083, 0.085, 2.3),
        (1.080, 0.072, 0.124, 0.076, 0.082, 2.2, 2.5),
        (1.120, 0.077, 0.103, 0.068, 0.071, 1.85, 2.7),
        (1.160, 0.080, 0.085, 0.066, 0.073, 1.85, 2.8),
        (1.200, 0.076, 0.092, 0.079, 0.078, 2.0, 3.2),
        (1.250, 0.064, 0.110, 0.090, 0.082, 2.1, 2.8),
        (1.300, 0.046, 0.126, 0.095, 0.080, 2.4, 3.1),
        (1.340, 0.032, 0.136, 0.097, 0.079, 2.3, 3.1),
        (1.370, 0.020, 0.142, 0.090, 0.077, 2.2, 2.7),
        (1.400, 0.008, 0.124, 0.074, 0.066, 2.3, 2.7),
        (1.425, 0.008, 0.074, 0.056, 0.054, 2.3),
        (1.450, 0.008, 0.052, 0.048, 0.050, 2.1),
        (1.480, 0.012, 0.045, 0.045, 0.046, 2.0),
        (1.520, 0.020, 0.044, 0.045, 0.045, 2.0),
]


def build(arm_angle=41.5, stance=1.0):
    """The whole body as a blend tree. Returns (root node, groups by name for measuring)."""
    J = skeleton(arm_angle, stance)
    H = STATURE
    body = Node("body", 0.0)

    # --- trunk: pelvis to neck, one loft, in her own barefoot posture: pelvis tipped forward, the lumbar
    # arched in, the ribcage up. Breasts, glutes, hips and thigh tops are added on top of it.
    #        z      cy     half   front  back   square
    trunk = loft(TRUNK_KEYS, 0.965, 1.53, 0.045)
    torso = body.sub(Node("torso", 0.03))
    torso.add(trunk)
    # pelvis: the bowl the thighs hang from
    torso.add(ellipsoid(V(0, 0.040, 0.990), (0.108, 0.078, 0.058)), 0.04)

    # breasts: a full lower pole, the upper pole sloping into the chest
    # The forms are drawn at the references' size (~520 ml each) and grown by BUST_SCALE about a point on the
    # chest wall. Shaped like the refs' (measured, Luna -> IW -> Emma -> Rogue): apex at ~1.30, a full round lower
    # pole over a crisp fold at ~1.24, the nipple turned ~17 deg out, and an upper pole that slopes straight into
    # the chest (fuller as she grows, like Rogue's) instead of a round cap with a shelf above it.
    k = BUST_SCALE
    base = V(0.066, 0.110, 1.290)                                  # on the chest wall, behind the breast
    grow = lambda p: base + (p - base) * k
    ks = k ** 0.6                                                  # sideways grows less
    B = BUST
    Rb = frame(V(*B["axis"]), V(0, 0, 1))
    c_ = grow(V(*B["c"])); r_ = (k * B["r"][0], k ** 0.8 * B["r"][1], ks * B["r"][2])
    forms = [(ellipsoid(c_, r_, Rb), 0.0)]
    for e in B.get("extra", []):                 # more forms blended into the mound (cleavage, lower pole, tail)
        Re = frame(V(*e["axis"]), V(0, 0, 1)) if "axis" in e else None
        ce = grow(V(*e["c"])) * (V(0, 1, 1) if e.get("mid") else 1)      # "mid": stays on the midline
        forms.append((ellipsoid(ce, tuple(np.array(e["r"]) * k ** e.get("p", 1.0)), Re), e["k"]))
    torso.add(blend(forms), B["k"])
    # the nipple: on the skin where the mound's axis comes out (found on the chest built so far), nip_d under it
    ts = np.arange(0.0, 0.12, 0.0005)
    ray = c_[None] + ts[:, None] * Rb[:, 0][None]
    t_out = ts[np.argmax(torso.eval(ray, ray.min(0) - 0.01, ray.max(0) + 0.01) > 0)]
    nip = c_ + Rb[:, 0] * (t_out + B["nip_d"])
    # the upper pole: a flat slab from the breast's upper front (grows with it) to the upper chest (stays), so
    # the breast slopes into the chest in a nearly straight line, the way the refs' do, with no shelf on top
    lo_, hi_ = grow(V(0.0740, 0.1749, 1.3223)), V(0.058, 0.112 + 0.030 * (k - 1.24), 1.392)
    d_ = unit(hi_ - lo_); n_ = unit(np.cross(d_, V(1, 0, 0)))
    half_ = 0.5 * np.linalg.norm(hi_ - lo_)
    torso.add(ellipsoid(0.5 * (lo_ + hi_) - 0.020 * n_, (1.15 * half_, 0.0220 * k, ks * 0.042), frame(d_, n_)), 0.025)
    torso.add(sphere(nip, 0.0048), 0.006)                                                 # nipple
    # pectorals and the front of the armpit
    torso.add(ellipsoid(V(0.078, 0.080, 1.366), (0.060, 0.026, 0.040), rot(V(0, 1, 0), -18)), 0.03)
    # clavicles
    torso.adds(chain([V(0.018, 0.066, 1.420), V(0.075, 0.056, 1.424), V(0.128, 0.022, 1.418)],
                     [0.0075, 0.0075, 0.009]), 0.014)
    # trapezius: neck to the shoulder's top, a low slope
    torso.add(cone(V(0.030, -0.018, 1.446), V(0.116, -0.014, 1.414), 0.025, 0.021), 0.030)
    # scapulae: broad, thin and tipped (the lower tip sinks in), so the upper back reads as one smooth plane with a
    # soft blade either side of the spine, no rim. No separate lat form: the side line from the armpit to the waist
    # is the trunk's own taper (refs: one smooth line), and the trunk's back is squarer at 1.20-1.34 to carry it.
    torso.add(ellipsoid(V(0.068, -0.020, 1.320), (0.044, 0.018, 0.064), rot(V(1, 0, 0), 22)), 0.05)
    # the back of the shoulder where it meets the back: a small fill along the arm, inboard of the arm's own section
    A_ = unit(V(math.sin(math.radians(41.5)), 0.0, -math.cos(math.radians(41.5))))
    torso.add(ellipsoid(V(0.126, -0.030, 1.382), (0.030, 0.018, 0.028), frame(A_, V(0, 1, 0))), 0.03)
    # the front-outer corner of the hips over the hip bone (the refs' hips are square there, not round)
    torso.add(ellipsoid(V(0.096, 0.062, 1.020), (0.038, 0.050, 0.065), rot(V(1, 0, 0), 10)), 0.03)
    # the hip bone's crest: from its front point (ASIS) up and back along the flank, so the side plane meets the belly
    # on a slant (the refs' oblique ridge rises ~25 deg round the body from z 1.00 to 1.10)
    torso.add(ellipsoid(V(0.0974, 0.1039, 1.043), (0.054, 0.020, 0.022), frame(V(0.024, -0.043, 0.095), V(0.56, 0.80, 0.21))), 0.025)
    torso.add(ellipsoid(V(0.108, 0.098, 1.014), (0.022, 0.016, 0.036), rot(V(0, 0, 1), 30)), 0.03)   # ASIS: the crest's front point
    # the top of the glutes' outer side (gluteus medius) under the hip crest
    torso.add(ellipsoid(V(0.077, 0.006, 1.054), (0.040, 0.018, 0.040)), 0.03)
    # the hip line: one tilted form from the waist out to the thigh top (the refs' side widens ~4 mm per cm here)
    torso.add(ellipsoid(V(0.119, 0.012, 0.998), (0.090, 0.056, 0.030), frame(V(0.39, 0, -0.92), V(0, 1, 0))), 0.03)
    # glutes: round and set back, upright (not tipped back) so the top slopes in and the lower half stays full
    Rg = rot(V(1, 0, 0), 0) @ rot(V(0, 0, 1), -12)
    torso.add(ellipsoid(V(0.068, -0.012, 0.983), (0.073, 0.068, 0.082), Rg), 0.020)
    # the glutes' upper slope: fills the step from the lumbar into the glute tops (refs: no shelf there)
    torso.add(ellipsoid(V(0.066, -0.004, 1.046), (0.040, 0.026, 0.022)), 0.03)
    # mons and the lower belly
    torso.add(ellipsoid(V(0.0, 0.097, 0.965), (0.030, 0.018, 0.022)), 0.03)
    # ribcage edge and obliques: a soft step from the ribs to the waist
    torso.add(ellipsoid(V(0.050, 0.084, 1.212), (0.036, 0.032, 0.044), rot(V(0, 1, 0), -25)), 0.045)
    torso.add(ellipsoid(V(0.068, 0.084, 1.208), (0.022, 0.022, 0.030)), 0.035)   # the ribcage's front-side corner
    # the long muscles either side of the lower spine (the groove between them is carved below)
    torso.add(ellipsoid(V(0.028, 0.019, 1.135), (0.016, 0.018, 0.090), rot(V(1, 0, 0), 8)), 0.022)
    # the sacrum: a flat inverted triangle between the glutes' tops, its point in the top of the cleft (the refs'
    # 'V': flat across x 0-2 cm at z 1.07, the glutes rising from its sides, not a round bowl)
    torso.add(sacrum(1.044, 0.90, (-0.0138, 0.32, 1.070), 1.115, 6.7), 0.004)
    # the lower belly: a soft rounded pad below the navel, between the V lines
    torso.add(ellipsoid(V(0, 0.116, 1.072), (0.060, 0.030, 0.048)), 0.02)
    # the upper abs: two soft panels either side of the centre line, under the ribcage's arch
    torso.add(ellipsoid(V(0.026, 0.126, 1.176), (0.024, 0.024, 0.056)), 0.02)
    # carves: the spine's groove (along the lumbar curve, ~3 mm outside the back; wider and running up to the neck
    # base above the waist, like the refs'), the cleft between the glutes,
    # then the navel (it stays last: body_mesh drops it from the cage and puts it back on the game mesh)
    groove = [V(0, -0.016, 1.095), V(0, -0.010, 1.12), V(0, -0.008, 1.18), V(0, -0.030, 1.25), V(0, -0.059, 1.31), V(0, -0.077, 1.37), V(0, -0.078, 1.44)]
    gr = [0.011, 0.011, 0.013, 0.019, 0.024, 0.025, 0.025]          # its radius at each point
    for g0, g1, r0, r1 in zip(groove[:-1], groove[1:], gr[:-1], gr[1:]):
        torso.cut(cone(g0, g1, r0, r1), 0.010)
    torso.cut(ellipsoid(V(0, -0.078, 0.992), (0.0035, 0.050, 0.074), rot(V(1, 0, 0), 24)), 0.005)
    torso.cut(ellipsoid(V(0, -0.064, 1.028), (0.006, 0.030, 0.034)), 0.006)   # the cleft's top, under the sacrum
    # the line down the abs (linea alba): a soft groove from under the sternum through the navel, fading below it
    LA = [(1.200, 0.1551, 0.0000), (1.170, 0.1495, 0.0004), (1.140, 0.1463, 0.0010), (1.120, 0.1455, 0.0014),
          (1.090, 0.1495, 0.0010), (1.060, 0.1524, 0.0004)]
    torso.cut(line_shape([V(0, y + 0.010 - dd, z) for z, y, dd in LA], [0.010] * len(LA)), 0.006)
    # (no separate V-line groove: the refs show one line from the hip point to the groin, the groin crease below)
    # a tall slit ~9.5 mm deep, like the refs' (they rise steeply sideways and slowly up and down)
    torso.cut(ellipsoid(V(0, 0.1526, 1.1026), (0.0042, 0.0151, 0.0125)), 0.007)

    # --- neck and head
    head = body.sub(Node("head", 0.02), 0.03)
    head.add(cone(V(0, -0.012, 1.43), V(0, -0.044, 1.560), 0.040, 0.036))
    # sternocleidomastoid: behind the ear to the collarbone's inner end
    head.add(cone(V(0.050, -0.016, 1.580), V(0.016, 0.058, 1.430), 0.009, 0.008), 0.025)
    add_head(head, J)

    # --- legs
    legs = body.sub(Node("legs", 0.02), 0.030)
    add_leg(legs, J)

    # --- arms
    arms = body.sub(Node("arms", 0.02), 0.025)
    add_arm(arms, J)
    # the fold under the glutes: carved across the joined body, as the thigh tops otherwise fill it (refs: the
    # back steps in ~40 mm at x 2-4 cm and ~22 mm at x 8 cm between z 0.94 and 0.90: clear inside, fading out)
    # the fold under the glutes: one crease from the gap outward, deepest inside, rising a little and fading out
    for c in chain_s([V(0.025, -0.0201, 0.903), V(0.050, -0.0536, 0.904), V(0.075, -0.0669, 0.907), V(0.100, -0.0720, 0.914)],
                     [0.008, 0.010, 0.011, 0.008], (1.0, 1.4, 1.0)):
        body.cut(c, 0.008)
    # below it the thigh's top eases back into the fold (a long shallow ramp, not a step)
    for c in chain_s([V(0.025, -0.0326, 0.889), V(0.050, -0.0546, 0.891), V(0.075, -0.0696, 0.897), V(0.100, -0.0780, 0.903)],
                     [0.014, 0.014, 0.014, 0.012], (1.0, 1.4, 1.3)):
        body.cut(c, 0.016)
    body.cut(cone(V(0.008, -0.016, 0.894), V(0.024, -0.026, 0.890), 0.022, 0.012), 0.010)  # the gap under the buttocks: deepest inside, running out into the fold
    body.cut(cone(V(0.086, 0.133, 0.994), V(0.031, 0.105, 0.939), 0.005, 0.006), 0.014)  # the groin crease, hip bone to crotch
    body.cut(ellipsoid(V(0.0, -0.030, 0.922), (0.016, 0.034, 0.026)), 0.010)  # the cleft opening down into the perineum
    body.cut(ellipsoid(V(0, -0.056, 0.945), (0.005, 0.040, 0.022)), 0.006)  # the cleft's lower end, opening between the glutes' undersides
    return body, {"torso": torso, "head": head, "legs": legs, "arms": arms}, J


def eyelids(c, r, half_w, open_up, open_down, tilt, thick=0.0016):
    """Lids: a thin shell over the eyeball with an almond opening (wider at the middle, outer corner up)."""
    c = V(*c)

    def f(P):
        q = P - c
        shell = np.linalg.norm(q, axis=1) - (r + thick)
        u = np.clip(q[:, 0] / half_w, -1.0, 1.0)            # -1 inner corner .. +1 outer corner
        shape = np.sqrt(np.clip(1.0 - u * u, 0.0, 1.0))
        mid = tilt * u * half_w
        top = mid + open_up * shape
        bot = mid - open_down * shape
        opening = np.minimum(q[:, 2] - bot, top - q[:, 2])  # > 0 inside the opening
        opening = np.where(np.abs(q[:, 0]) < half_w, opening, -0.01)
        return smax(shell, np.where(q[:, 1] > 0, opening, -0.01), 0.0008)
    return f, (c - r - 0.003, c + r + 0.003)


def add_head(head, J):
    """
    Skull, jaw, face. Chin at 0.881 of stature, crown at 1.0: the head 0.119 tall, 0.096 wide, 0.108 deep.
    Head coordinates: origin on the eye line at the midline, y = 0 at the front of the eyes.
    The stylised heroine face: an oval narrowing to a small pointed chin, high cheekbones, large almond eyes
    under a soft brow, a small straight nose, full lips.
    """
    H = STATURE
    chin, crown = 0.881 * H, H
    zc = (chin + crown) / 2
    Y0 = 0.080
    Q = lambda x, y, z: V(x, Y0 + y, zc + z)
    head.add(ellipsoid(Q(0, -0.085, 0.016), (0.064, 0.082, 0.080)), 0.03)
    head.add(ellipsoid(Q(0, -0.078, 0.032), (0.070, 0.074, 0.065)), 0.03)                  # temples, wide crown                  # cranium
    # the face: a loft from chin to brow; front depth makes the profile, half width the oval
    #     z       cy      half   front  back  square
    keys = [(-0.101, -0.031, 0.011, 0.024, 0.020, 2.0),
            (-0.093, -0.036, 0.020, 0.037, 0.035, 2.1),
            (-0.080, -0.041, 0.024, 0.039, 0.045, 2.2),
            (-0.068, -0.044, 0.037, 0.043, 0.052, 2.2),
            (-0.052, -0.045, 0.045, 0.043, 0.056, 2.3),
            (-0.038, -0.046, 0.050, 0.046, 0.060, 2.3),
            (-0.020, -0.046, 0.050, 0.040, 0.062, 2.3),
            (0.000, -0.050, 0.053, 0.036, 0.066, 2.3),
            (0.018, -0.055, 0.055, 0.052, 0.068, 2.3),
            (0.030, -0.060, 0.053, 0.056, 0.068, 2.3)]
    # the profile strip: the loft at a third of its width carries the midline (brow, philtrum, chin)
    keys = [(k[0], k[1], k[2] * 0.45, k[3], k[4], k[5]) for k in keys]
    face = loft([(zc + k[0], Y0 + k[1], *k[2:]) for k in keys], zc - 0.101, zc + 0.030, 0.025)
    # the egg of the lower face: full cheeks, rounding into the jaw
    head.add(ellipsoid(Q(0, -0.050, -0.040), (0.050, 0.046, 0.056)), 0.030)
    jaw_under = halfspace(Q(0, 0.0, -0.097), V(0, -0.47, -0.88))
    head.add(((lambda P, f=face[0], j=jaw_under[0]: smax(f(P), j(P), 0.010)), face[1]), 0.026)
    # jaw angle under the ear
    head.add(cone(Q(0.054, -0.082, -0.020), Q(0.042, -0.064, -0.058), 0.009, 0.008), 0.025)
    head.add(ellipsoid(Q(0, -0.005, -0.086), (0.013, 0.011, 0.011)), 0.010)                 # chin point
    head.add(ellipsoid(Q(0.040, -0.016, -0.016), (0.016, 0.012, 0.011), rot(V(0, 1, 0), -15)), 0.025)  # cheekbone
    head.add(ellipsoid(Q(0.028, -0.007, 0.020), (0.020, 0.007, 0.006), rot(V(0, 1, 0), 8)), 0.012)    # brow
    # eyes: socket, eyeball, lids
    e = Q(0.033, -0.0128, 0.0)
    J["eye"], J["eye_r"] = e, 0.0124            # for ref_check.py
    head.cut(ellipsoid(e + V(0.001, 0.011, 0.001), (0.0165, 0.011, 0.0125), rot(V(0, 1, 0), -7)), 0.005)
    head.cut(ellipsoid(e + V(0.002, 0.008, 0.012), (0.016, 0.008, 0.005), rot(V(0, 1, 0), -7)), 0.010)
    head.add(sphere(e, 0.0124), 0.0)
    head.add(eyelids(e, 0.0124, 0.0175, 0.0084, 0.0060, 0.16), 0.004)
    # nose
    head.add(cone(Q(0, -0.006, -0.004), Q(0, 0.009, -0.026), 0.0036, 0.0055), 0.014)
    head.add(sphere(Q(0, 0.010, -0.030), 0.0064), 0.005)
    head.add(sphere(Q(0.0072, -0.002, -0.034), 0.0050), 0.006)                                # wing
    head.cut(sphere(Q(0.0042, 0.001, -0.0410), 0.0016), 0.0012)                              # nostril
    # mouth
    head.cut(cone(Q(0, 0.005, -0.043), Q(0, 0.006, -0.051), 0.0020, 0.0024), 0.003)          # philtrum
    # lips: arcs that wrap round the teeth, fullest in the middle; the upper with a bow
    up = [(0.000, 0.0, 0.0040), (0.004, 0.0010, 0.0043), (0.008, 0.0006, 0.0040), (0.012, -0.0006, 0.0034),
          (0.016, -0.0018, 0.0026), (0.0205, -0.0034, 0.0016)]
    head.adds(chain([Q(x, 0.0045 - 22 * x * x, -0.0560 + dz) for x, dz, r in up], [r for x, dz, r in up]), 0.003)
    lo = [(0.000, 0.0, 0.0056), (0.005, 0.0002, 0.0054), (0.010, 0.0010, 0.0047), (0.015, 0.0024, 0.0034),
          (0.019, 0.0040, 0.0020)]
    head.adds(chain([Q(x, 0.0015 - 22 * x * x, -0.0668 + dz) for x, dz, r in lo], [r for x, dz, r in lo]), 0.003)
    head.cut(ellipsoid(Q(0, 0.008, -0.0603), (0.0205, 0.0110, 0.0009)), 0.0014)              # the line
    head.cut(ellipsoid(Q(0, 0.002, -0.077), (0.011, 0.005, 0.0035)), 0.006)                  # under the lip
    # ears
    head.add(ellipsoid(Q(0.068, -0.084, -0.020), (0.0062, 0.018, 0.032), rot(V(0, 0, 1), 20)), 0.008)
    head.cut(ellipsoid(Q(0.072, -0.080, -0.020), (0.004, 0.010, 0.019), rot(V(0, 0, 1), 14)), 0.003)


def add_leg(legs, J):
    hip, knee, ankle = J["hip"], J["knee"], J["ankle"]
    ax = unit(knee - hip)
    F = frame(ax, V(0, 1, 0))                      # radii below are (along the leg, front-back, side to side)
    # thigh: full at the top (it makes the hip line with the glutes), tapering to a slim knee
    legs.adds(chain([hip + V(0.012, 0.005, -0.095), knee + V(0.004, 0.006, 0.03)], [0.086, 0.050]), 0.03)
    t = lambda s: hip + (knee - hip) * s
    legs.add(ellipsoid(t(0.40) + V(0.026, 0.014, 0), (0.150, 0.058, 0.058), F), 0.03)       # outer hip / trochanter
    legs.add(ellipsoid(t(0.45) + V(0.012, 0.035, 0), (0.190, 0.053, 0.054), F), 0.03)       # quads, front
    legs.add(ellipsoid(t(0.24) + V(0.018, 0.054, 0), (0.135, 0.048, 0.050), F), 0.03)       # the quads' full top
    legs.add(ellipsoid(t(0.32) + V(-0.026, 0.012, 0), (0.130, 0.044, 0.034), F), 0.03)
    legs.add(ellipsoid(t(0.30) + V(-0.040, 0.010, 0), (0.080, 0.034, 0.024), F), 0.03)
    legs.add(ellipsoid(t(0.32) + V(-0.050, -0.012, 0), (0.075, 0.026, 0.020), F), 0.03)      # adductors, inner
    legs.add(ellipsoid(t(0.74) + V(-0.016, 0.022, 0.0), (0.080, 0.030, 0.028), F), 0.025)   # vastus medialis, inner front
    legs.add(ellipsoid(t(0.40) + V(0.006, -0.032, 0), (0.150, 0.046, 0.056), F), 0.03)       # hamstrings
    # knee
    legs.add(ellipsoid(knee + V(0.014, 0.033, 0.000), (0.034, 0.015, 0.023), F), 0.040)        # kneecap
    # shin and calf
    # the shin: the bone line runs near its front and inner face, the mass sits behind it
    legs.adds(chain([knee + V(0.010, -0.010, 0), knee + (ankle - knee) * 0.6 + V(0.016, -0.018, 0), ankle + V(0.004, 0.002, 0.0)],
                     [0.040, 0.023, 0.025]), 0.03)
    s = lambda u: knee + (ankle - knee) * u
    A = unit(ankle - knee)
    Fs = frame(A, V(0, 1, 0))
    legs.add(ellipsoid(s(0.31) + V(0.016, -0.048, 0), (0.125, 0.045, 0.040), Fs), 0.03)     # calf belly
    legs.add(cone(knee + V(0.004, 0.016, -0.028), s(0.62) + V(0.006, -0.002, 0), 0.011, 0.009), 0.025)  # the tendon under the kneecap running on as the shin's front edge
    legs.add(ellipsoid(s(0.26) + V(0.036, -0.034, 0), (0.120, 0.044, 0.040), Fs), 0.03)     # calf, outer head
    legs.add(ellipsoid(s(0.32) + V(-0.004, -0.036, 0), (0.100, 0.032, 0.024), Fs), 0.03)    # calf, inner head
    legs.add(ellipsoid(s(0.50) + V(0.014, -0.034, 0), (0.140, 0.034, 0.026), Fs), 0.03)     # soleus, the lower calf
    legs.add(ellipsoid(s(0.30) + V(0.022, 0.004, 0), (0.120, 0.014, 0.016), Fs), 0.025)    # tibialis, beside the shin's edge
    legs.add(cone(s(0.62) + V(0, -0.028, 0), ankle + V(0, -0.033, -0.025), 0.017, 0.011), 0.025)  # achilles
    # ankle bones: the inner one higher and further forward than the outer (barefoot ref: ~9 mm higher, ~15 mm ahead)
    legs.add(sphere(ankle + V(0.021, -0.004, -0.007), 0.0115), 0.012)                       # outer ankle bone
    legs.add(sphere(ankle + V(-0.017, 0.009, 0.004), 0.012), 0.012)                         # inner ankle bone
    # the knee's outer side: the upper shin's outer front (tibial condyle) full, the hollow beside the kneecap above it
    legs.add(ellipsoid(knee + V(0.020, 0.012, -0.040), (0.040, 0.016, 0.016), Fs), 0.025)
    legs.add(ellipsoid(knee + V(0.009, -0.038, -0.030), (0.035, 0.020, 0.020), Fs), 0.025)   # the calf's top under the back of the knee
    legs.cut(ellipsoid(knee + V(0.064, 0.030, 0.022), (0.030, 0.010, 0.022), frame(ax, V(0.906, 0.423, 0))), 0.028)
    add_foot(legs, J)


# The foot, measured against the barefoot reference (Invisible Woman; the others wear shoes) in the foot's own frame:
# origin under the ankle joint on the floor, +y along the foot (toes out 8 degrees), +x to the outer side. mm.
FOOT_OUT = -8.0
# foot body sections along y: y, inner edge x, outer edge x, crest x, top z, sole z at the crest, sole drop per mm
# towards the outer side (the lateral column is the low side of the arch), top squareness inside / outside, sole
# squareness. A high, clear arch: heel and ball touch, the midfoot sole is 12-14 mm up at the centre.
FOOT_KEYS = [(-30, -29, 30, 0, 46, 0, 0.00, 2.2, 2.2, 2.6),
             (-10, -32, 34, 0, 52, 0, 0.00, 2.2, 2.2, 2.6),
             (10, -32, 36, -2, 66, 2, 0.00, 2.2, 2.0, 2.6),
             (30, -28, 38, -3, 80, 8, 0.02, 2.2, 1.8, 2.6),
             (50, -25, 40, -4, 78, 14, 0.06, 2.2, 1.7, 2.6),
             (70, -27, 44, -5, 72, 15, 0.10, 2.2, 1.6, 2.6),
             (90, -31, 49, -5, 65, 12, 0.14, 2.2, 1.6, 2.6),
             (110, -34, 52, -6, 57, 5, 0.12, 2.2, 1.6, 2.6),
             (125, -34, 53, -6, 51, 1, 0.04, 2.2, 1.6, 2.6),
             (140, -31, 53, -7, 43, 2, 0.00, 2.2, 1.6, 2.6),
             (155, -27, 52, -7, 36, 7, 0.00, 2.2, 1.6, 2.6)]
FOOT_END = (154.0, -0.20)        # the body's front end (the toes' web line): y = 154 - 0.2 x
# toes: (lateral squash, [(x, y, z, r), ...] root to tip); five separate toes, ~2 mm apart, joined at the web
TOES = [(1.10, [(-14.0, 135, 22.0, 11.5), (-14.0, 160, 21.0, 11.5), (-13.6, 178, 14.0, 11.0), (-13.2, 193, 13.0, 9.0)]),
        (1.00, [(7.3, 140, 22.0, 7.0), (7.3, 165, 24.0, 6.3), (7.6, 183, 15.0, 6.4), (8.0, 194, 11.5, 5.6)]),
        (1.00, [(23.3, 136, 18.0, 6.6), (23.3, 165, 18.0, 5.9), (23.8, 182, 10.5, 5.6)]),
        (1.00, [(37.2, 133, 15.0, 5.4), (37.2, 160, 12.5, 4.8), (37.6, 173, 8.0, 4.7)]),
        (1.00, [(49.3, 130, 12.0, 5.0), (49.5, 150, 10.0, 4.4), (50.0, 161, 6.8, 4.2)])]


def foot_frame(J):
    """(origin on the floor under the ankle, rotation local -> world)."""
    return J["ankle"] * V(1, 1, 0), rot(V(0, 0, 1), FOOT_OUT)


def foot_point(J, x, y, z):
    o, R = foot_frame(J)
    return o + R @ (V(x, y, z) / 1000.0)


def foot_loft(J, keys, y_lo, end, cap):
    """The foot's body: sections along the foot (FOOT_KEYS), each a lopsided dome over a flat-ish sole."""
    o, R = foot_frame(J)
    f = spline([[k[0] / 1000.0] + [v / 1000.0 for v in k[1:6]] + list(k[6:]) for k in keys])

    def d(P):
        q = (P - o) @ R
        x, y, z = q[:, 0], q[:, 1], q[:, 2]
        xi, xo, xc, zt, zb, lin, nti, nto, nb = f(y).T
        a = np.where(x < xc, xc - xi, xo - xc)
        zbe = zb - lin * (x - xc)
        zm = zbe + 0.35 * (zt - zbe)
        ht, hb = zt - zm, np.maximum(zm - zbe, 1e-3)
        up = z > zm
        u = np.abs(x - xc) / a
        v = np.where(up, (z - zm) / ht, (zm - z) / hb)
        n = np.where(up, np.where(x < xc, nti, nto), nb)
        r = np.power(np.power(u, n) + np.power(v, n), 1.0 / n)
        rho = np.sqrt((x - xc) ** 2 + (z - zm) ** 2)
        side = np.where(r < 1, (r - 1) * np.minimum(a, np.where(up, ht, hb)), rho * (1.0 - 1.0 / np.maximum(r, 1e-6)))
        ends = np.maximum(y_lo / 1000.0 - y, y - (end[0] / 1000.0 + end[1] * x))
        return smax(side, ends, cap)
    lo = o + V(-0.15, -0.15, -0.01)
    return d, (lo, o + V(0.15, 0.25, 0.12))


def toe_cone(J, a, b, ra, rb, sx):
    """A round cone in the foot frame, squashed sideways by sx (> 1: wider than tall)."""
    o, R = foot_frame(J)
    a, b = V(*a) / 1000.0, V(*b) / 1000.0
    s = V(1.0 / sx, 1, 1)
    f, (lo, hi) = cone(a * s, b * s, ra / 1000.0, rb / 1000.0)

    def d(P):
        return f(((P - o) @ R) * s)
    m = max(ra, rb) / 1000.0 * max(sx, 1) + 0.002
    c = [o + R @ p for p in (a, b)]
    return d, (np.minimum(*c) - m, np.maximum(*c) + m)


def toe_chains(J):
    """Each toe's bone line in world space (root to tip) with its radii and squash (for the cage)."""
    return [([foot_point(J, x, y, z) for x, y, z, r in pts], [r / 1000.0 for x, y, z, r in pts], sx)
            for sx, pts in TOES]


def add_foot(legs, J):
    foot = Node("foot", 0.012)
    p = lambda x, y, z: foot_point(J, x, y, z)
    foot.add(ellipsoid(p(0, -13, 32), (0.034, 0.038, 0.032)))                                # heel
    foot.add(foot_loft(J, FOOT_KEYS, -34, FOOT_END, 0.010), 0.012)                            # the foot's body
    # the inner arch: the sole lifts along the inner edge between the heel and the ball
    foot.cut(ellipsoid(p(-34, 50, 0), (0.020, 0.045, 0.029), rot(V(0, 0, 1), FOOT_OUT)), 0.010)
    tz = Node("toes", 0.0)
    for sx, pts in TOES:
        for (x0, y0, z0, r0), (x1, y1, z1, r1) in zip(pts[:-1], pts[1:]):
            tz.add(toe_cone(J, (x0, y0, z0), (x1, y1, z1), r0, r1, sx), 0.002)
    # the toe pads: each tip a little fuller (wider than the toe's neck) and rounder underneath
    for sx, pts in TOES:
        x, y, z, r = pts[-1]
        tz.add(ellipsoid(p(x, y - 0.25 * r, z - 0.35 * r), (r * sx * 0.00108, r * 0.00095, r * 0.00072), rot(V(0, 0, 1), FOOT_OUT)), 0.003)
    foot.sub(tz, 0.006)
    # the tendon down the front of the ankle onto the instep: fills the crease between shin and foot
    foot.adds(chain([p(-6, 18, 122), p(-5, 45, 82), p(-4, 95, 54)], [0.0080, 0.0068, 0.0040]), 0.022)
    legs.sub(foot, 0.02)
    legs.cut(halfspace(V(0, 0, 0.0), V(0, 0, 1)), 0.004)        # flat on the floor


# The arm's sections: radius in mm from the bone line at 8 angles, measured against the bare-armed (skin-tight)
# references round each one's own bones (the bone runs near the arm's outer back; the mass sits to the front and
# inside). s: 0 at the joint above, 1 at the joint below.
#            s     front f-out outer b-out back  b-in  inner f-in
UPPER_ARM = [(0.00, 44, 38, 34, 31, 34, 41, 43, 45),
             (0.20, 47, 38, 33, 29, 33, 41, 42, 47),
             (0.30, 47, 34, 30, 30, 34, 41, 41, 50),
             (0.40, 47, 31, 29, 30, 34, 41, 43, 50),
             (0.50, 48, 31, 29, 30, 33, 40, 42, 49),
             (0.60, 49, 34, 30, 31, 34, 38, 42, 48),
             (0.70, 48, 33, 29, 30, 32, 36, 39, 47),
             (0.80, 45, 33, 27, 28, 32, 35, 37, 43),
             (0.90, 38, 34, 29, 29, 32, 36, 36, 36),
             (1.00, 32, 34, 28, 25, 28, 34, 32, 32)]
# 2026-11-17 (ref/_sculpt_work/armchk): matched to the 6 skin-tight refs' median DIAMETERS (depth, width, diagonals;
# their bones sit too differently inside the arm for per-angle radii to compare). The upper arm's lower half was
# 3-6 mm shallow; the elbow rows are pulled in because the two pieces' smooth union there added 4-7 mm (a ring
# across the back of the elbow); the mid-forearm was 5-6 mm too wide seen from the front.
FOREARM = [(0.00, 32, 36, 29, 23, 29, 33, 32, 33),
           (0.05, 35, 41, 33, 26, 30, 36, 38, 36),
           (0.15, 39, 47, 42, 32, 36, 41, 44, 39),
           (0.25, 39, 46, 43, 35, 37, 41, 42, 38),
           (0.35, 37, 42, 40, 35, 36, 38, 37, 34),
           (0.45, 33, 39, 38, 36, 34, 33, 29, 27),
           (0.55, 29, 35, 34, 34, 31, 29, 24, 24),
           (0.65, 27, 33, 32, 32, 28, 24, 19, 19),
           (0.75, 27, 30, 30, 32, 29, 21, 15, 17),
           (0.85, 27, 29, 27, 30, 27, 19, 16, 17),
           (0.95, 28, 26, 23, 26, 27, 20, 17, 20),
           (1.00, 28, 25, 22, 25, 27, 20, 17, 20)]


def add_arm(arms, J):
    sh, el, wr, down = J["shoulder"], J["elbow"], J["wrist"], J["arm_down"]
    out = V(1, 0, 0)
    arms.add(sphere(sh + V(0.010, 0.0, -0.004), 0.033), 0.02)                       # shoulder cap, into the torso
    arms.add(limb(sh, el, UPPER_ARM, -0.02, 1.04, 0.012, out), 0.02)
    arms.add(limb(el, wr, FOREARM, -0.04, 1.02, 0.010, out), 0.018)
    add_hand(arms, J)


# The hand, in its own frame (u along the forearm, w across the palm to the thumb side, n out of the palm), measured
# against the references' hands: palm (wrist to middle knuckle) ~87 mm, knuckle span (index to little) ~66 mm,
# fingers (3 bones) index 113, middle 117, ring 113, little 94, thumb 109.
HAND_BASE = 0.087                       # wrist to the middle knuckle, along u
#          across, length of 3 bones,        base radius, knuckle set back
FINGERS = [(0.032, (0.039, 0.030, 0.023), 0.0102, 0.003),
           (0.011, (0.044, 0.032, 0.0255), 0.0106, 0.000),
           (-0.010, (0.041, 0.031, 0.024), 0.0102, 0.003),
           (-0.030, (0.034, 0.021, 0.019), 0.0089, 0.008)]
# The fingertips taper to a narrow point like the references' (radius ~4 mm at 90% of the last bone, 2026-11-17):
# the tip's radius as a share of the finger's base radius, and the thumb's own tip radius.
TIP = 0.44
TIP_MID = 0.58                           # radius at 70% of the last bone
THUMB_TIP = 0.0062
# The relaxed pose, from the references' finger bones (median of 6, in each hand's own frame; 2026-11-17):
#   arch: knuckle set toward the palm (the middle knuckle is the highest); bends: each bone's angle toward the
#   palm from the hand's line (absolute, deg); splays: bone 1 and bones 2-3 toward the thumb side (deg, our frame,
#   whose u runs ~7 deg to the little-finger side of the wrist-to-middle-knuckle line the refs were measured in).
#   The last bone bends only ~7 deg past the middle one (the refs' j2->tip line; their tip bones are rig leftovers).
FINGER_POSE = [(0.004, (5, 26, 33), (11, 9)),
               (0.000, (7, 29, 36), (1, 0)),
               (0.001, (11, 32, 39), (-7, -7)),
               (0.004, (15, 34, 41), (-10, -9))]
# the thumb: base, and each bone's (length, bend toward the palm, splay toward the thumb side) in the same sense
THUMB = ((0.018, 0.028, 0.013), [(0.037, 24, 42), (0.031, 27, 25), (0.0265, 30, 15)])
# the knuckle line for the mesh: dorsal vertices across the hand (thumb side first), fingers on faces 0, 2, 4, 6
KNUCKLE_B = [0.0400, 0.0240, 0.0190, 0.0030, -0.0020, -0.0180, -0.0225, -0.0375]
PALM_HALF = 0.041                       # half width at the knuckles


def hand_frame(J):
    wr, el = J["wrist"], J["elbow"]
    u = unit(wr - el)                                       # along the hand
    palm_n = unit(np.cross(u, V(0, 1, 0)))                  # the palm faces the thigh
    if palm_n[0] > 0:
        palm_n = -palm_n
    w = unit(np.cross(palm_n, u))                           # across the palm, thumb side
    if w[1] < 0:
        w = -w
    return wr, u, w, palm_n


def finger_chains(J):
    """Joint points of the four fingers (knuckle, 2 joints, tip) and the thumb (base, 2 joints, tip)."""
    wr, u, w, pn = hand_frame(J)
    R = np.stack([u, w, pn], axis=1)
    p = lambda a, b, c: wr + R @ V(a, b, c)
    def d(bend, splay):
        b_, s_ = math.radians(bend), math.radians(splay)
        return R @ V(math.cos(b_) * math.cos(s_), math.cos(b_) * math.sin(s_), math.sin(b_))
    out = []
    for (b, lens, r, back), (arch, bends, splays) in zip(FINGERS, FINGER_POSE):
        pts = [p(HAND_BASE - back, b, arch)]
        for k, ln in enumerate(lens):
            pts.append(pts[-1] + d(bends[k], splays[min(k, 1)]) * ln)
        out.append(pts)
    tb = [p(*THUMB[0])]
    for ln, bend, splay in THUMB[1]:
        tb.append(tb[-1] + d(bend, splay) * ln)
    return out, tb


def add_hand(arms, J):
    wr, u, w, palm_n = hand_frame(J)
    R = np.stack([u, w, palm_n], axis=1)
    p = lambda a, b, c: wr + R @ V(a, b, c)
    hand = Node("hand", 0.010)
    hand.add(ellipsoid(p(0.050, 0.000, 0.002), (0.056, PALM_HALF, 0.0190), R))               # palm
    hand.add(ellipsoid(p(0.030, 0.030, 0.015), (0.032, 0.017, 0.016), R), 0.012)             # thumb pad (thenar)
    hand.add(ellipsoid(p(0.032, -0.025, 0.009), (0.034, 0.013, 0.011), R), 0.010)            # outer palm pad
    fingers = Node("fingers", 0.0)
    chains, thumb = finger_chains(J)
    for pts, (b, lens, r, back) in zip(chains, FINGERS):
        # the last bone stays full to ~70% of its length, then narrows to the tip (the refs' nail point)
        fingers.adds(chain(pts[:3] + [pts[2] + 0.7 * (pts[3] - pts[2]), pts[3]],
                           [r, r * 0.86, r * 0.74, r * TIP_MID, r * TIP]), 0.004)
    fingers.adds(chain(thumb[:3] + [thumb[2] + 0.7 * (thumb[3] - thumb[2]), thumb[3]],
                       [0.014, 0.0108, 0.0098, 0.0080, THUMB_TIP]), 0.004)
    J["fingers"], J["thumb"] = chains, thumb
    hand.sub(fingers, 0.006)
    arms.sub(hand, 0.012)


# ---------------------------------------------------------------------------------------------------- measuring
def eval_points(node, P):
    Q = P.copy()
    Q[:, 0] = np.abs(Q[:, 0])
    return node.eval(Q, Q.min(0), Q.max(0))


def slice_inside(node, z, half=0.30, depth=(-0.25, 0.30), step=0.002):
    xs = np.arange(0, half, step)
    ys = np.arange(depth[0], depth[1], step)
    X, Y = np.meshgrid(xs, ys, indexing="ij")
    P = np.stack([X.ravel(), Y.ravel(), np.full(X.size, z)], axis=1)
    d = eval_points(node, P)
    return P[d < 0]


def hull_girth(pts2):
    """Perimeter of the convex hull of 2D points (a tape measure)."""
    p = np.unique(np.round(pts2, 5), axis=0)
    if len(p) < 3:
        return 0.0
    p = p[np.lexsort((p[:, 1], p[:, 0]))]

    def half(points):
        h = []
        for q in points:
            while len(h) >= 2 and np.cross(h[-1] - h[-2], q - h[-2]) <= 0:
                h.pop()
            h.append(q)
        return h
    lower, upper = half(p), half(p[::-1])
    hull = np.array(lower[:-1] + upper[:-1])
    return float(np.sum(np.linalg.norm(hull - np.roll(hull, 1, axis=0), axis=1)))


def profile(trunk_node, grid):
    """Front, back (y) and half width (x) of the trunk-and-legs by height, arms left out."""
    out = []
    for g in grid:
        pts = slice_inside(trunk_node, g * STATURE)
        out.append((g, pts[:, 1].max(), pts[:, 1].min(), pts[:, 0].max()) if len(pts) else (g, 0, 0, 0))
    return out
