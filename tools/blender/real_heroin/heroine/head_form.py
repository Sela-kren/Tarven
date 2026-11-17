"""
The head's broad form from a proportion table: a stack of cross-sections from chin to crown (a "star loft").

Each level is a closed outline in the (x, y) plane at one height, given as a radius for every angle round a
centre; between levels the radius is interpolated smoothly. The distance is approximate (good near the surface,
which is all the cage projection needs). The table holds MEDIAN proportions measured over several references
(head_table.json), normalised by head height, so the form is generic, not any one character's.

Head coordinates as head_mesh.py: origin on the eye line at the midline, y = 0 at the front of the eyes,
z up, +y front.
"""
import math
import numpy as np

import sdf

ANGLES = 72                     # samples round each outline


class StarLoft:
    def __init__(self, levels, cap_lo=None, cap_hi=None, smooth=True, up=0, raw_below=0):
        """levels: [(z, cy, radii[ANGLES])] from bottom to top; angle 0 = +y (front), increasing towards +x."""
        levels = sorted(levels, key=lambda l: l[0])
        self.z = np.array([l[0] for l in levels])
        self.cy = np.array([l[1] for l in levels])
        self.R = np.array([l[2] for l in levels])            # (L, ANGLES)
        raw = self.R
        self.R = smooth_radii(raw) if smooth else smooth_radii(raw, around=1, up=up)
        if raw_below:
            # the lowest levels change shape fast (chin, jaw, the V under it): keep them as built (smoothed round
            # only), fading to the smoothed levels over two more levels so there's no step
            built = smooth_radii(raw, around=1, up=0)
            for i in range(min(raw_below + 2, len(raw))):
                w = 1.0 if i < raw_below else (raw_below + 2 - i) / 3.0
                self.R[i] = w * built[i] + (1 - w) * self.R[i]
        # smoothing pulls the outline in at its extremes: scale it back to the measured front, sides and back
        A = np.arange(ANGLES) * 2 * np.pi / ANGLES
        for i in range(len(raw)):
            idx = [0, ANGLES // 4, ANGLES // 2, 3 * ANGLES // 4]
            ratio = [raw[i, j] / max(self.R[i, j], 1e-6) for j in idx]
            ang = np.array([0, np.pi / 2, np.pi, 1.5 * np.pi, 2 * np.pi])
            corr = np.interp(A, ang, ratio + [ratio[0]])
            self.R[i] *= corr
        self.cap_lo = self.z[0] if cap_lo is None else cap_lo
        self.cap_hi = self.z[-1] if cap_hi is None else cap_hi
        # Catmull-Rom over z for the centre and every angle's radius
        self.cy_f = sdf.spline(np.stack([self.z, self.cy], 1))
        self.R_f = sdf.spline(np.concatenate([self.z[:, None], self.R], 1))

    def radius(self, theta, z):
        """Outline radius at angle theta (radians, 0 = front) and height z."""
        Rz = self.R_f(z)                                      # (N, ANGLES)
        a = (np.mod(theta, 2 * np.pi) / (2 * np.pi)) * ANGLES
        i0 = np.floor(a).astype(int) % ANGLES
        i1 = (i0 + 1) % ANGLES
        f = a - np.floor(a)
        rows = np.arange(len(z))
        return Rz[rows, i0] * (1 - f) + Rz[rows, i1] * f

    def __call__(self, P):
        z = P[:, 2]
        cy = self.cy_f(z)[:, 0]
        dx, dy = P[:, 0], P[:, 1] - cy
        rho = np.hypot(dx, dy)
        theta = np.arctan2(dx, dy)
        side = (rho - self.radius(theta, z)) * 0.9
        ends = np.maximum(self.cap_lo - z, z - self.cap_hi)
        return sdf.smax(side, ends, 0.006)

    def bounds(self):
        r = self.R.max() + 0.01
        return sdf.V(-r, self.cy.min() - r, self.cap_lo - 0.01), sdf.V(r, self.cy.max() + r, self.cap_hi + 0.01)

    def prim(self):
        return self, self.bounds()


def smooth_radii(R, around=4, up=2):
    """Measured outlines are noisy: soften them round each outline (periodic) and a little between levels."""
    R = R.copy()
    k = np.array([1, 4, 6, 4, 1], float)
    k /= k.sum()
    for _ in range(around):
        R = sum(w * np.roll(R, j - 2, axis=1) for j, w in enumerate(k))
    for _ in range(up):
        inner = 0.25 * R[:-2] + 0.5 * R[1:-1] + 0.25 * R[2:]
        R[1:-1] = inner
    return R


def outline_from_points(pts, cy):
    """Radii round (0, cy) for a closed outline given as (x, y) points of its +x half (mirrored)."""
    pts = np.asarray(pts, float)
    full = np.concatenate([pts, pts[::-1] * [-1, 1]])
    ang = np.arctan2(full[:, 0], full[:, 1] - cy)
    rad = np.hypot(full[:, 0], full[:, 1] - cy)
    order = np.argsort(ang)
    ang, rad = ang[order], rad[order]
    want = np.linspace(-np.pi, np.pi, ANGLES, endpoint=False)
    # periodic interpolation
    ang_p = np.concatenate([ang - 2 * np.pi, ang, ang + 2 * np.pi])
    rad_p = np.concatenate([rad, rad, rad])
    r = np.interp(want, ang_p, rad_p)
    # reorder so index 0 is angle 0 (front), increasing towards +x
    shift = ANGLES // 2
    return np.roll(r, -shift)


def section(front_xy, half_width, y_side, back_y):
    """
    A level's +x half outline from measured numbers: the front curve (x, y) samples from the midline outward,
    the half width (reached at y_side), and the back of the head at the midline. Returns (points, centre y).
    """
    front_xy = sorted(front_xy)
    pts = list(front_xy)
    # round the corner from the last front sample to the widest point, then to the back
    x_last, y_last = pts[-1]
    pts.append((0.5 * (x_last + half_width) + 0.15 * (half_width - x_last), 0.5 * (y_last + y_side)))
    pts.append((half_width, y_side))
    for t in (0.35, 0.65, 0.88):
        a = t * math.pi / 2
        pts.append((half_width * math.cos(a), y_side + (back_y - y_side) * math.sin(a)))
    pts.append((0.0, back_y))
    cy = 0.5 * (front_xy[0][1] + back_y)
    return pts, cy


# ------------------------------------------------------------------------------------------------ from the table
def load_table(path):
    import json
    with open(path) as f:
        return json.load(f)


def local(t, y_shift):
    """Converters from the table's normalised numbers to head coordinates (metres, eye line at z = 0)."""
    m = t["median"]
    Hh = m["frame"]["Hh_m"]
    eye_z = m["frame"]["eye_line_z"]
    Z = lambda zn: (zn - eye_z) * Hh
    Y = lambda yn: yn * Hh + y_shift
    X = lambda xn: xn * Hh
    return Hh, X, Y, Z


def form_from_table(t, y_shift=0.003):
    """
    The broad form (no nose, no lips, no eye sockets) from the median tables: one outline per measured level.
    The midline through the nose and mouth is replaced by the smooth surface behind them (the nose and lips are
    built on top), and the eye holes in the measurements are bridged over.
    """
    Hh, X, Y, Z = local(t, y_shift)
    tab = t["median"]["tables"]
    fp = {float(k): list(v) for k, v in tab["front_plane"].items()}
    back = tab["back"]
    hw = tab["half_width_no_ears"]
    L = len(back)
    zn = [i / (L - 1) for i in range(L)]
    lm = t["median"]["landmarks"]
    # the midline under the nose and lips: a smooth arc from the chin to the brow
    mid = list(fp[0.0])
    smooth = {2: lm["mentolabial_fold"][1] + 0.004, 3: -0.026, 4: -0.011, 5: lm["subnasale"][1],
              6: 0.006, 7: 0.007, 8: 0.005, 9: 0.002}
    for i, v in smooth.items():
        mid[i] = v
    fp[0.0] = mid
    # eye holes (x 0.1-0.2 of Hh, levels 0.40-0.50): bridge them from the levels above and below
    for x in (0.1, 0.2):
        col = fp[x]
        for i in (8, 9, 10):
            a, b = col[7], col[11]
            if a is not None and b is not None:
                col[i] = a + (b - a) * (i - 7) / 4 + 0.012
    levels = []
    for i in range(L):
        front = []
        for x in (0.0, 0.1, 0.2, 0.3):
            y = fp[x][i] if x in fp else None
            if y is not None and x < hw[i] - 0.02:
                front.append((X(x), Y(y)))
        if not front:
            front = [(0.0, Y(fp[0.0][i]))]
        f0 = front[0][1]
        b = Y(back[i])
        y_side = b + 0.47 * (f0 - b)
        # the widest point must sit behind the last front sample
        y_side = min(y_side, front[-1][1] - 0.01)
        pts, cy = section(front, X(hw[i]), y_side, b)
        levels.append((Z(zn[i]), cy, outline_from_points(pts, cy)))
    return StarLoft(levels)


def landmarks(t, y_shift=0.003):
    """The median landmarks in head coordinates."""
    Hh, X, Y, Z = local(t, y_shift)
    out = {}
    for k, v in t["median"]["landmarks"].items():
        if isinstance(v, list) and len(v) == 3:
            out[k] = (X(v[0]), None if v[1] is None else Y(v[1]), Z(v[2]))
    out["eyeball_radius"] = t["median"]["frame"]["eyeball_radius_m"]
    return out


# ------------------------------------------------------------------------------------------------ fitted loft
class FaceLoft:
    """
    The broad form as a loft of superellipse sections, one per measured level, each with its own centre, half
    width, front and back depth, and front and back squareness; every parameter splined over z. Smooth by
    construction, and each parameter is a natural slider handle.
    keys: (z, cy, hw, fd, bd, nf, nb)
    """

    def __init__(self, keys, cap=0.008):
        keys = np.array(sorted(keys, key=lambda k: k[0]), float)
        self.keys = keys
        self.f = sdf.spline(keys)
        self.lo, self.hi = keys[0, 0], keys[-1, 0]
        self.cap = cap

    def params(self, z):
        return self.f(z).T                                  # cy, hw, fd, bd, nf, nb

    def __call__(self, P):
        z = P[:, 2]
        cy, hw, fd, bd, nf, nb = self.params(z)
        x = np.abs(P[:, 0])
        dy = P[:, 1] - cy
        front = dy > 0
        depth = np.where(front, fd, bd)
        n = np.where(front, nf, nb)
        u, v = x / hw, np.abs(dy) / depth
        r = np.power(np.power(u, n) + np.power(v, n), 1.0 / n)
        rho = np.sqrt(x * x + dy * dy)
        side = np.where(r < 1, (r - 1) * np.minimum(hw, depth), rho * (1.0 - 1.0 / np.maximum(r, 1e-6)))
        ends = np.maximum(self.lo - z, z - self.hi)
        return sdf.smax(side, ends, self.cap)

    def bounds(self):
        k = self.keys
        r = max(k[:, 2].max(), k[:, 3].max(), k[:, 4].max()) + 0.01
        return sdf.V(-r, k[:, 1].min() - r, self.lo - 0.01), sdf.V(r, k[:, 1].max() + r, self.hi + 0.01)

    def prim(self):
        return self, self.bounds()


def fit_keys(t, y_shift=0.003, centre_at=0.5, nb=2.2, smooth=1, jaw_extra=0.0045):
    """Fit one section per measured level to the median tables."""
    Hh, X, Y, Z = local(t, y_shift)
    tab = t["median"]["tables"]
    fp = {float(k): list(v) for k, v in tab["front_plane"].items()}
    back, hw = tab["back"], tab["half_width_no_ears"]
    lm = t["median"]["landmarks"]
    L = len(back)
    mid = list(fp[0.0])
    for i, v in {2: lm["mentolabial_fold"][1] + 0.004, 3: -0.026, 4: -0.011, 5: lm["subnasale"][1],
                 6: 0.003, 7: -0.006, 8: -0.007, 9: -0.002}.items():
        mid[i] = v
    keys = []
    for i in range(L):
        f0, b, w = Y(mid[i]), Y(back[i]), X(hw[i])
        zn = i / (L - 1)
        w += jaw_extra * math.exp(-((zn - 0.20) / 0.10) ** 2)     # the jaw below the ears reads wider
        cy = b + centre_at * (f0 - b)
        fd, bd = max(f0 - cy, 0.005), max(cy - b, 0.005)
        # front squareness: the n that best passes the off-midline front samples (eye holes skipped)
        samples = []
        for x in (0.1, 0.2, 0.3):
            y = fp[x][i] if x in fp else None
            if y is None or X(x) >= w - 0.004 or (8 <= i <= 10 and x <= 0.2):
                continue
            samples.append((X(x), Y(y)))
        # round the eyes the skin lies at the lids' depth (the eye holes in the measurements are skipped above)
        for name in ("eye_inner", "eye_outer", "eye_top", "eye_bottom"):
            ex, ey, ez = lm[name]
            if abs(ez - zn) < 0.026:
                samples.append((X(ex), Y(ey)))
        # the jaw: from the chin the outline runs back in a V to the jaw's angle
        if zn < 0.26:
            gx, gy, gz = lm["gonion"]
            cx_, cy_, cz_ = lm["chin_front"]
            k = min(1.0, max(0.0, zn / gz))
            samples.append((X(gx * (0.55 + 0.45 * k)), Y(cy_ + (gy - cy_) * (0.55 + 0.45 * k))))
        best = 2.2
        if samples:
            errs = []
            for n in np.linspace(1.0, 6.0, 51):
                e = 0.0
                for x, y in samples:
                    u = min(x / w, 0.999)
                    e += (cy + fd * (1 - u ** n) ** (1 / n) - y) ** 2
                errs.append((e, n))
            best = min(errs)[1]
        keys.append([(i / (L - 1) - t["median"]["frame"]["eye_line_z"]) * Hh, cy, w, fd, bd, best, nb])
    keys = np.array(keys)
    for _ in range(smooth):                                   # a light pass over z, ends kept
        keys[1:-1, 1:] = 0.25 * keys[:-2, 1:] + 0.5 * keys[1:-1, 1:] + 0.25 * keys[2:, 1:]
    return [tuple(k) for k in keys]


# ------------------------------------------------------------------------------------------------ outline loft
def closed_spline(pts, samples=360):
    """A closed Catmull-Rom curve through pts (in order)."""
    P = np.asarray(pts, float)
    n = len(P)
    out = []
    per = max(2, samples // n)
    for i in range(n):
        p0, p1, p2, p3 = P[(i - 1) % n], P[i], P[(i + 1) % n], P[(i + 2) % n]
        for t in np.linspace(0, 1, per, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return np.array(out)


def radii_round(curve, cy):
    """Radii round (0, cy) at the loft's angles for a closed curve given as (x, y) points."""
    ang = np.arctan2(curve[:, 0], curve[:, 1] - cy)
    rad = np.hypot(curve[:, 0], curve[:, 1] - cy)
    order = np.argsort(ang)
    ang, rad = ang[order], rad[order]
    ang_p = np.concatenate([ang - 2 * np.pi, ang, ang + 2 * np.pi])
    rad_p = np.concatenate([rad, rad, rad])
    want = np.arange(ANGLES) * 2 * np.pi / ANGLES
    want = np.where(want > np.pi, want - 2 * np.pi, want)
    return np.interp(want, ang_p, rad_p)


# where the front surface at x = 0.25 Hh sits between the 0.2 and 0.3 columns, per level (median of the 7 refs,
# measured on a 2 mm grid): the outer brow, temple and outer cheek are fuller than a spline through 0.2 / 0.3 gives
DEBUG_OUTLINES = {}
LOFT_UP = 2      # 1-2-1 passes between levels: outline points come and go from level to level; this keeps it from rippling
# the same at x = 0.15 Hh between the 0.1 and 0.2 columns: the chin and jaw are broader low down than 0.1 / 0.2 give
# the front at x = 0.05 Hh at the eye levels (table units, median of the refs): beside the narrow nose bridge the
# socket drops back steeply; without it the loft bulges from the midline to the 0.1 column
C05 = {8: -0.0268, 9: -0.0330, 10: -0.0068}
R15 = {1: 0.10, 2: 0.08, 3: 0.18, 4: 0.34, 5: 0.44, 6: 0.41, 7: 0.52, 8: 0.49}
R25 = {7: 0.14, 8: 0.21, 9: 0.31, 10: 0.21, 11: 0.20, 12: 0.20, 13: 0.26, 14: 0.29, 15: 0.32, 16: 0.33, 17: 0.35}


# the refs' occiput, measured in mm against the 7-ref median (depthmap BACK / HALF-WIDTH): broader behind the ears and
# a little deeper than the per-ref normalised side widths give
REAR_GAIN = {0.25: 0.04, 0.10: 0.13, 0.05: 0.16, 0.02: 0.16}
REAR_BACK = 0.003
CHEEK_FILL, CHEEK_Z, CHEEK_S = 0.010, 0.40, 0.16      # head units forward; level fraction centre and spread
# the jaw's sides behind the chin (levels 1-4, z ~1.51-1.54 world): the refs' jaw is ~4 mm wider there, so its
# underside slopes down lower towards the angle (depthmap UNDER / HALF-WIDTH)
# side widths gain per depth fraction u and level (sections vs the 7-ref median): the jaw's front corner (u 0.70)
# full at levels 2-3, the ramus behind it (u 0.55/0.40) only slightly; the cheek behind the mouth corner a little
# fuller at levels 4-6 (the ledge along the jaw and the jowl above it, t106)
JAW_GAIN = {0.70: {1: -0.13, 2: 0.06, 3: 0.06, 4: -0.01, 5: 0.04, 6: 0.02},
            0.55: {2: 0.15, 3: 0.07, 4: 0.03, 5: 0.03, 6: 0.02},     # level 2: the measured u 0.55 width notches in
            0.40: {2: -0.01, 3: -0.02, 4: -0.04, 5: -0.04, 6: -0.03},     # the silhouette in front view: no
            0.25: {3: -0.02, 4: -0.03, 5: -0.03, 6: -0.02}}                # corner at the jaw's angle
# an extra side point between u 0.55 and 0.40 (the masseter plane) at these levels, width = their mean * (1 + g):
# the spline sagged 1.5-2 mm there at mouth height (sections at ~81 deg)
MASSETER = {4: 0.06, 5: 0.08, 6: 0.07, 7: 0.03}
# per-column, per-level trims of the front (head units, + forward), from the front heatmap vs the median (t113):
# beside the nose and mouth (x 0.1, z ~1.55-1.59) and the chin we stood 1.5-2.4 mm proud
COL_ADJ = {0.0: {0: -0.006, 1: -0.008, 2: -0.006},
           0.1: {0: -0.006, 1: -0.009, 2: -0.007, 5: -0.008, 6: -0.010, 7: -0.010, 8: -0.007},
           0.2: {8: -0.004, 9: -0.012}}     # under the outer eye (z ~1.59): 2-3 mm proud (t136)
LOWER_CHEEK_TRIM = None  # was (0.0028, 60.0, 20.0, -0.068, 0.022) against the 7-ref median   # m, angle centre (deg from front), spread, head z centre, spread
CHEEK_POW = 4.0     # the cheek fill's rise from x 0 to 0.3: it spilled forward onto the front of the cheek


def outline_loft(t, y_shift=0.003, column_passes=2, side_at=0.47, cheek_fill=CHEEK_FILL, chin_half=0.15):
    """
    The broad form from the measured columns: at each level a closed smooth curve through the midline front,
    the front at 0.1, 0.2 and 0.3 of the head height out, the widest point and the back. Each column is first
    smoothed up the head; the eye holes are filled from the lid landmarks; the nose and lips are taken off the
    midline (they are built on top).
    """
    Hh, X, Y, Z = local(t, y_shift)
    # the loft's hand-fitted settings (below) were fitted against the 7-ref median; a table for one ref (Luna) carries
    # its own in "loft_tuning" (JSON: level keys as strings)
    tun = t.get("loft_tuning") or {}
    def _lv(d):
        return {int(k): v for k, v in d.items()}
    R15_ = _lv(tun["R15"]) if "R15" in tun else R15
    R25_ = _lv(tun["R25"]) if "R25" in tun else R25
    REAR_GAIN_ = {float(k): v for k, v in tun["REAR_GAIN"].items()} if "REAR_GAIN" in tun else REAR_GAIN
    REAR_BACK_ = tun.get("REAR_BACK", REAR_BACK)
    JAW_GAIN_ = {float(u): _lv(d) for u, d in tun["JAW_GAIN"].items()} if "JAW_GAIN" in tun else JAW_GAIN
    MASSETER_ = _lv(tun["MASSETER"]) if "MASSETER" in tun else MASSETER
    COL_ADJ_ = {float(x): _lv(d) for x, d in tun["COL_ADJ"].items()} if "COL_ADJ" in tun else COL_ADJ
    cheek_fill = tun.get("CHEEK_FILL", cheek_fill)
    tab = t["median"]["tables"]
    fp = {float(k): list(v) for k, v in tab["front_plane"].items() if k in ("0.0", "0.1", "0.2", "0.3", "0.4")}
    back, hw = np.array(tab["back"], float), np.array(tab["half_width_no_ears"], float)
    lm = t["median"]["landmarks"]
    L = len(back)
    zs = np.arange(L) / (L - 1)
    mid = np.array(fp[0.0], float)
    for i, v in {2: lm["mentolabial_fold"][1] + 0.004, 3: -0.012, 4: 0.000, 5: lm["subnasale"][1],
                 6: 0.003, 7: -0.006, 8: -0.007, 9: -0.002}.items():
        mid[i] = v
    cols = {0.0: mid}
    for x in (0.1, 0.2, 0.3):
        c = np.array([np.nan if v is None else v for v in fp[x]], float)
        cols[x] = c
    # eye holes: the lids' depth (x 0.1 and 0.2, levels 0.40-0.50)
    eye_pts = [lm[k] for k in ("eye_inner", "eye_bottom", "eye_top", "eye_outer")]
    for x in (0.1, 0.2):
        for i in (8, 9, 10):
            near = sorted(eye_pts, key=lambda p: abs(p[0] - x) + abs(p[2] - zs[i]))[:2]
            cols[x][i] = np.mean([p[1] for p in near]) + (0.010 if i >= 10 else (0.000 if x == 0.1 else 0.004))   # below the eye: the socket, deepest by the nose
    for arr in (back, hw):
        for _ in range(column_passes):
            arr[1:-1] = 0.25 * arr[:-2] + 0.5 * arr[1:-1] + 0.25 * arr[2:]
    for x, c in cols.items():
        ok = ~np.isnan(c)
        c[~ok] = np.interp(np.flatnonzero(~ok), np.flatnonzero(ok), c[ok]) if ok.any() else 0
        raw = c.copy()
        for _ in range(column_passes):
            c[1:-1] = 0.25 * c[:-2] + 0.5 * c[1:-1] + 0.25 * c[2:]
        c[1:3] = raw[1:3]           # the chin's front as measured: smoothing towards the underside row pulls it back
        cols[x] = c
    # the outer cheek below the cheekbone (x 0.2-0.3, z ~1.57 world): the refs' cheek is full there, ours dipped
    # 2.5-3.5 mm (heatmap); the 0.25 column is interpolated from these, so it fills too
    for x in (0.2, 0.3):
        cols[x] = cols[x] + cheek_fill * (x / 0.3) ** CHEEK_POW * np.exp(-((zs - CHEEK_Z) / CHEEK_S) ** 2)
    for x, adj in COL_ADJ_.items():
        for i, v in adj.items():
            cols[x][i] += v
    # below the jaw's angle the measured width is the neck behind the jaw: the jaw itself narrows to the chin
    gx, gz = lm["gonion"][0], lm["gonion"][2]
    for i in range(L):
        if zs[i] < gz:
            hw[i] = min(hw[i], chin_half + (gx - chin_half) * (zs[i] / gz) ** 0.75)
    # measured side widths (half width at depth fraction u), smoothed up the head like the columns
    SW_U = (0.85, 0.70, 0.55, 0.40, 0.25, 0.10, 0.05, 0.02)   # the last two: the occiput's squarish back quarter
    sw = None
    if "side_widths" in tab:
        sw = {}
        for u in SW_U:
            if "%.2f" % u not in tab["side_widths"]:
                continue
            c = np.array([np.nan if v is None else v for v in tab["side_widths"]["%.2f" % u]], float)
            ok = ~np.isnan(c)
            c[~ok] = np.interp(np.flatnonzero(~ok), np.flatnonzero(ok), c[ok])
            raw = c.copy()
            for _ in range(column_passes):
                c[1:-1] = 0.25 * c[:-2] + 0.5 * c[1:-1] + 0.25 * c[2:]
            for i_, w_ in ((2, 1.0), (3, 1.0), (4, 1.0), (5, 0.67), (6, 0.33)):   # the jaw's angle is a fast change: as measured, fading out
                c[i_] = w_ * raw[i_] + (1 - w_) * c[i_]
            sw[u] = c
    front_raw = np.array([np.nan if v is None else v for v in fp[0.0]], float)
    levels = []
    for i in range(L):
        w = X(hw[i])
        f0, b = Y(cols[0.0][i]), Y(back[i])
        occ = math.exp(-((i - 9) / 3.0) ** 2)          # the occiput's level (z ~1.59 world)
        b -= REAR_BACK_ * occ
        front = [(0.0, f0)]
        for x in (0.1, 0.15, 0.2, 0.25, 0.3):
            if x == 0.15:
                if i in R15_ and X(0.15) < w - 0.0035:
                    front.append((X(x), Y(cols[0.1][i] + R15_[i] * (cols[0.2][i] - cols[0.1][i]))))
                continue
            if x == 0.25:
                if i in R25_ and X(0.3) < w - 0.0035:
                    front.append((X(x), Y(cols[0.2][i] + R25_[i] * (cols[0.3][i] - cols[0.2][i]))))
                continue
            if X(x) < w - 0.0035:
                front.append((X(x), Y(cols[x][i])))
        if sw is None:
            sa = side_at if zs[i] >= gz else 0.30 + (side_at - 0.30) * (zs[i] / gz)   # below the jaw: widest over the neck
            y_side = min(b + sa * (f0 - b), front[-1][1] - (0.012 if front[-1][0] < w - 0.008 else 0.008))
            # the back quarter: a superellipse (n ~2.6), as broad behind the ears as the refs' occiput
            back_q = [(w * u, y_side + (b - y_side) * (1 - u ** 2.6) ** (1 / 2.6)) for u in (0.86, 0.68, 0.45)]
            right = front + [(w, y_side)] + back_q
        else:
            # the side as measured: half widths at depth fractions u of the midline depth (cheekbone, temple
            # hollow, parietal), each behind the last front sample
            fr = Y(front_raw[i])
            side = []
            for u in SW_U:
                if u not in sw:
                    continue
                wv = sw[u][i]
                y = b + u * (fr - b)
                wv = wv * (1.0 + (REAR_GAIN_.get(u, 0.0)) * occ + JAW_GAIN_.get(u, {}).get(i, 0.0))
                if np.isnan(wv) or y > front[-1][1] - 0.004 or (side and y > side[-1][1] - 0.003):
                    continue
                side.append((X(wv), y))
                if u == 0.40 and i in MASSETER_ and len(side) >= 2 and 0.55 in sw:
                    (x1, y1), (x0, y0) = side[-2], side[-1]
                    side.insert(-1, (0.5 * (x0 + x1) * (1 + MASSETER_[i]), 0.5 * (y0 + y1)))
            right = front + side
            DEBUG_OUTLINES[i] = (w, [(round(p[0] * 1000, 1), round(p[1] * 1000, 1)) for p in right], round(Y(back[i]) * 1000, 1))
        left = [(-x, y) for x, y in right[1:]][::-1]
        ring = right + [(0.0, b)] + [(-x, y) for x, y in right[1:][::-1]]
        curve = closed_spline(ring)
        cy = 0.5 * (f0 + b)
        levels.append((Z(zs[i]), cy, radii_round(curve, cy)))
    if LOWER_CHEEK_TRIM:
        # the lower cheek at ~60 deg round the face (beside the mouth, above the jawline): the refs taper to the
        # chin in a V, ours stood 2-3.5 mm proud there (ref/_head_work sections, 2026-11-17)
        amt, ac, asg, zc, zsg = LOWER_CHEEK_TRIM
        A = np.arange(ANGLES) * 2 * np.pi / ANGLES
        da = np.minimum(np.abs(A - math.radians(ac)), np.abs(A - (2 * np.pi - math.radians(ac))))
        wa = np.exp(-(da / math.radians(asg)) ** 2)
        levels = [(z_, cy_, R_ - amt * wa * math.exp(-((z_ - zc) / zsg) ** 2)) for z_, cy_, R_ in levels]
    return StarLoft(levels, smooth=False, up=LOFT_UP, raw_below=4)
