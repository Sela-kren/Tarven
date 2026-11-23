"""
Her shoes, built round her own feet (2026-11-23). The old shoes were built for the body before real_heroin, whose legs
ended at the ankle and whose foot was the shoe; her sculpted feet poked out of every pair.

Each style is built round her foot as built (flat), then bent exactly as her skin is bent when the game tips her foot
on its ankle and ball joints (foot_bones.py: the same weights, the same bone turns) so the heel stands
`heel - platform` above the ball of her foot and her toes lie flat. The heel is added after, straight down to the
floor. The shoe is skinned to the Shin bones only, so it keeps that shape; the game tips her foot the same way while
she wears it (the shoe object's `foot_tip` property, radians, carried to the game as glTF extras) and stands her on
the shoe's sole.

  last      slices across her foot along its length, each slice's outline (a convex hull, so the toes are boxed in
            together) stood off her skin by GAP and smoothed along the foot: the shoe's upper
  opening   the upper stops `collar` above the floor behind the `vamp` line (all along for a closed shoe); the top of
            it is left open there, and her own foot or leg shows
  sole      flat under the last, thickening under her toes by `platform`
  heel      from the sole under her heel down to the floor (HEEL_SHAPES), or a wedge under her arch
  straps    across the instep (shares of her foot from the back), round the ankle, and a T joining them
  shaft     a boot's leg: horizontal slices of her leg stood off by BOOT_GROW, from inside the shoe up to `shaft` (m)

build(rig, coll, name) replaces every <name>_Shoes<mesh> object in coll. Barefoot has no mesh: her own feet.
"""
import math

import bmesh
import bpy
from mathutils import Quaternion, Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

import foot_bones

SIDES = foot_bones.SIDES
GAP = 0.004  # the upper's stand-off from her skin
SOLE = 0.008  # the sole's thickness
WELT = 0.005  # the sole's edge stands this far up round the foot of the upper
SOLE_ROUND = 0.014  # how deep the sole's rounded ends are, at most
BOOT_GROW = 0.011  # a boot's shaft stands off her leg by this, clear of her legwear
BOOT_OVERLAP = 0.012  # a boot's shaft starts this far below the top of its foot (lower, its slices take in the foot and flare)
RING = 28  # points round a slice of the upper
STATIONS = 44  # slices along her foot
TOE_ROOM = 0.003  # extra room in the toe box
HEEL_ROOM = 0.007  # extra room round the back of the heel (fading out over HEEL_ROOM_TO from the back of her heel)
HEEL_ROOM_TO = 0.05
TUCK = 0.022  # the upper's points this near the floor go down onto the sole
PUSHES = 5  # rounds of pushing the upper clear of her skin and relaxing it
LEG_STEP = 0.02  # a boot shaft's slices, apart
SMOOTH = 4  # passes of smoothing along her foot
FACE_PUSH = 0.0025  # the most a face's corners are pushed out to clear a small round tip (a toe's) under its middle
HEEL_IN = 0.024  # the heel's middle, in from the back of her heel
# The heel cup: how much higher than the collar the upper comes round the back of her heel, and how far along her foot
# (a share of its length) it eases down to the collar.
COUNTER = (0.02, 0.32)
# The back of the heel rounded off: (share of width, share of height, how far behind the last slice).
# The last comes to a line down the middle, closing the back with no slit.
BACK = [(0.95, 1.0, 0.002), (0.85, 0.997, 0.0045), (0.7, 0.99, 0.007), (0.5, 0.98, 0.009), (0.28, 0.97, 0.0105), (0.0, 0.965, 0.0112)]
# An opening narrower than this (radians round the slice) is closed: the vamp ends in a blunt V, not a long slit.
SHUT_GAP = 0.5

# The styles, after build_world.SHOE_STYLES, with heights in metres:
#   heel      the heel's height at the back, platform included; rise = heel - platform tips her foot
#   kind      the heel's shape (HEEL_SHAPES), "wedge" under the arch, or none
#   toe       round, almond, pointed or square: how far the toe box runs past her toes, and how it narrows (TOES)
#   vamp      how far back from her toes the upper covers the top of her foot, or "closed"
#   collar    how high the upper comes up her foot behind the vamp, above the floor
#   straps    straps over the instep, at these shares of her foot's length from the back of her heel
#   ankle     a strap round the ankle; tstrap one from the first instep strap up to it
#   shaft     a boot's height (world)
STYLES = [
    {"mesh": "", "heel": 0.018, "kind": "block", "toe": "round", "vamp": "closed", "collar": 0.065},
    {"mesh": "Barefoot", "bare": True},
    {"mesh": "Ballet", "toe": "round", "vamp": 0.11, "collar": 0.045},
    {"mesh": "Loafer", "heel": 0.02, "kind": "block", "toe": "square", "vamp": 0.15, "collar": 0.055, "straps": [0.6]},
    {"mesh": "Kitten", "heel": 0.035, "kind": "kitten", "toe": "pointed", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Pump", "heel": 0.07, "kind": "taper", "toe": "almond", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Stiletto", "heel": 0.095, "kind": "stiletto", "toe": "pointed", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Block", "heel": 0.06, "kind": "block", "toe": "round", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Cone", "heel": 0.075, "kind": "cone", "toe": "almond", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Spool", "heel": 0.065, "kind": "spool", "toe": "round", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Wedge", "heel": 0.07, "kind": "wedge", "toe": "round", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Platform", "heel": 0.12, "platform": 0.035, "kind": "chunky", "toe": "round", "vamp": 0.1, "collar": 0.05},
    {"mesh": "Maryjane", "heel": 0.05, "kind": "block", "toe": "round", "vamp": 0.1, "collar": 0.048, "straps": [0.55]},
    {"mesh": "Doublestrap", "heel": 0.08, "kind": "stiletto", "toe": "almond", "vamp": 0.08, "collar": 0.048,
     "straps": [0.45, 0.6]},
    {"mesh": "Anklestrap", "heel": 0.09, "kind": "stiletto", "toe": "pointed", "vamp": 0.1, "collar": 0.048, "ankle": True},
    {"mesh": "Tstrap", "heel": 0.065, "kind": "taper", "toe": "round", "vamp": 0.1, "collar": 0.048, "ankle": True,
     "tstrap": True, "straps": [0.55]},
    {"mesh": "Bootie", "heel": 0.05, "kind": "chunky", "toe": "round", "vamp": "closed", "collar": 0.09, "shaft": 0.2},
    {"mesh": "Laceup", "heel": 0.085, "kind": "stiletto", "toe": "pointed", "vamp": "closed", "collar": 0.09, "shaft": 0.24},
    {"mesh": "Riding", "heel": 0.025, "kind": "block", "toe": "round", "vamp": "closed", "collar": 0.09, "shaft": 0.42},
    {"mesh": "Kneeboot", "heel": 0.08, "kind": "taper", "toe": "almond", "vamp": "closed", "collar": 0.09, "shaft": 0.42},
    {"mesh": "Thighboot", "heel": 0.09, "kind": "stiletto", "toe": "pointed", "vamp": "closed", "collar": 0.09, "shaft": 0.64},
]
# Heel shapes, top (0) to tip (1): (share of the way down, how far back of the top's middle (m, along her foot), half
# width, half depth).
HEEL_SHAPES = {
    "taper": [(0, 0, 0.026, 0.024), (1, 0.008, 0.01, 0.01)],
    "stiletto": [(0, 0, 0.024, 0.026), (0.35, 0.008, 0.012, 0.012), (1, 0.012, 0.0055, 0.0055)],
    "kitten": [(0, 0, 0.022, 0.024), (0.6, 0, 0.01, 0.01), (1, -0.006, 0.008, 0.008)],
    "block": [(0, 0, 0.03, 0.028), (1, 0.002, 0.027, 0.025)],
    "chunky": [(0, 0, 0.036, 0.034), (1, 0.003, 0.032, 0.03)],
    "cone": [(0, 0, 0.03, 0.03), (1, 0.006, 0.007, 0.007)],
    "spool": [(0, 0, 0.028, 0.028), (0.25, 0.001, 0.016, 0.016), (0.5, 0.002, 0.011, 0.011),
              (0.75, 0.003, 0.015, 0.015), (1, 0.004, 0.024, 0.024)],
}
# How far the toe box runs past her toes, and how its last slices narrow (share of width, share of height) to the end.
TOES = {
    "round": (0.012, [(0.85, 0.85), (0.55, 0.6)]),
    "almond": (0.022, [(0.8, 0.88), (0.5, 0.65), (0.18, 0.4)]),
    "pointed": (0.038, [(0.78, 0.88), (0.52, 0.7), (0.26, 0.5), (0.06, 0.3)]),
    "square": (0.014, [(0.95, 0.85), (0.9, 0.6)]),
}


def _hull(points):
    """Convex hull (counter-clockwise) of 2D points."""
    pts = sorted(set((round(p[0], 6), round(p[1], 6)) for p in points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def _ray_hull(hull, c, d):
    """How far from c along d the hull's edge lies."""
    best = None
    for i in range(len(hull)):
        a, b = Vector(hull[i]), Vector(hull[(i + 1) % len(hull)])
        e = b - a
        den = d.x * e.y - d.y * e.x
        if abs(den) < 1e-12:
            continue
        ac = a - c
        t = (ac.x * e.y - ac.y * e.x) / den
        s = (ac.x * d.y - ac.y * d.x) / den
        if t > 0 and -1e-6 <= s <= 1 + 1e-6:
            best = t if best is None else min(best, t)
    return best or 0.0


def _ring(hull, c, grow, count=RING):
    """Points round a 2D hull from its middle c, at even angles from straight down, grown outwards."""
    out = []
    for k in range(count):
        a = -math.pi / 2 + 2 * math.pi * k / count
        d = Vector((math.cos(a), math.sin(a)))
        out.append(c + d * (_ray_hull(hull, c, d) + grow))
    return out


def _smooth_rings(rings, passes):
    for _ in range(passes):
        rings = [rings[0]] + [[a * 0.25 + b * 0.5 + c * 0.25 for a, b, c in zip(rings[i - 1], rings[i], rings[i + 1])]
                              for i in range(1, len(rings) - 1)] + [rings[-1]]
    return rings


class Builder:
    """Points and faces of one shoe object, with each point's weights (taken where the point is built, before it's
    bent by `deform`)."""

    def __init__(self):
        self.verts, self.faces, self.mats, self.uvs, self.weights = [], [], [], [], []
        self.deform = None

    def add(self, p, w):
        p = Vector(p)
        self.weights.append(w(p))
        self.verts.append(tuple(self.deform(p) if self.deform else p))
        return len(self.verts) - 1

    def loft(self, rings, mat, w, closed=True, skip=None, cap_start=False, cap_end=False, cap_open=(None, None)):
        ids = [[self.add(p, w) for p in ring] for ring in rings]
        n = len(rings[0])
        for i in range(len(rings) - 1):
            for k in range(n if closed else n - 1):
                k2 = (k + 1) % n
                if skip and skip(i, k, k2):
                    continue
                self.faces.append((ids[i][k], ids[i][k2], ids[i + 1][k2], ids[i + 1][k]))
                self.mats.append(mat)
                self.uvs.append(((k / n, i / len(rings)), (k2 / n, i / len(rings)), (k2 / n, (i + 1) / len(rings)),
                                 (k / n, (i + 1) / len(rings))))
        for at, cap, gaps in ((0, cap_start, cap_open[0]), (len(rings) - 1, cap_end, cap_open[1])):
            if not cap:
                continue
            ring = rings[at]
            if cap == "flat":
                # One face over the whole end (a concave outline, which a fan from its middle would fold).
                face = list(ids[at]) if at else list(reversed(ids[at]))
                self.faces.append(tuple(face))
                self.mats.append(mat)
                self.uvs.append(tuple((0.5, 0.5) for _ in face))
                continue
            mid = sum((Vector(p) for p in ring), Vector()) / n
            c = self.add(mid, w)
            for k in range(n if closed else n - 1):
                if gaps and gaps[k] and gaps[(k + 1) % n]:
                    continue
                a, b = ids[at][k], ids[at][(k + 1) % n]
                self.faces.append((a, b, c) if at else (b, a, c))
                self.mats.append(mat)
                self.uvs.append(((0, 0), (1, 0), (0.5, 1)))


def _frame(m):
    """Her foot's frame: along it (u), across it (l), up (z); from the back of her heel on the floor."""
    u = m["dir"]
    l = Vector((u.y, -u.x, 0))
    origin = Vector((m["heel"].x, m["heel"].y, 0))
    return origin, u, l


def _to_world(origin, u, l, along, across, up):
    return origin + u * along + l * across + Vector((0, 0, up))


def clear_of_skin(rings, skin, lowest, pinned=None, gaps=None):
    """The upper's points pushed out to GAP off her skin wherever they're closer (or inside), relaxed in between so
    the push leaves no dents; never below `lowest`. `pinned[i][k]` points (the bottom, down on the sole) keep their
    place. The opening's edge is relaxed along its length, so it runs in a clean line; where a ring meets itself (over
    her toes) it's relaxed across the join, so no crease runs down the toe box."""
    pinned = pinned or [[False] * len(r) for r in rings]
    gaps = gaps or [GAP] * len(rings)
    shut = [(r[0] - r[-1]).length < 1e-5 for r in rings]

    def push(rings):
        out = []
        for i, ring in enumerate(rings):
            row = []
            for k, p in enumerate(ring):
                if not pinned[i][k]:
                    loc, normal, _, _ = skin.find_nearest(p)
                    if loc is not None:
                        away = p - loc
                        d = away.dot(normal)
                        if d < gaps[i]:
                            # Straight out from the nearest skin (her sculpt's small bumps tilt its face normals, and
                            # pushing along those leaves the upper lumpy).
                            out_dir = away.normalized() if d > 1e-4 else normal
                            p = loc + out_dir * gaps[i]
                row.append(Vector((p.x, p.y, max(p.z, lowest))))
            out.append(row)
        return out

    def relax(rings):
        out = [list(r) for r in rings]
        for i in range(1, len(rings) - 1):
            n = len(rings[i])
            for k in range(n):
                if pinned[i][k]:
                    continue
                if 0 < k < n - 1:
                    across = rings[i][k - 1] + rings[i][k + 1]
                elif shut[i]:
                    across = rings[i][n - 2] + rings[i][1]
                else:
                    # The opening's edge: along her foot only.
                    across = rings[i][k] * 2
                avg = (rings[i - 1][k] + rings[i + 1][k] + across) / 4
                out[i][k] = rings[i][k] * 0.5 + avg * 0.5
            if shut[i]:
                out[i][n - 1] = out[i][0]
        return out

    for _ in range(PUSHES):
        rings = relax(push(rings))
    rings = push(rings)
    # A last few rounds that only let a point move where it stays clear of her skin: the lumps the push leaves smooth
    # out wherever there's room.
    for _ in range(PUSHES * 2):
        soft = relax(rings)
        for i, ring in enumerate(soft):
            for k, p in enumerate(ring):
                loc, normal, _, _ = skin.find_nearest(p)
                if loc is None or (p - loc).dot(normal) >= gaps[i]:
                    rings[i][k] = Vector((p.x, p.y, max(p.z, lowest)))
            if shut[i]:
                rings[i][-1] = rings[i][0]
    # And clear of her skin once more (a toe's knuckle the smoothing came near), the faces too: a small round toe
    # tip can come through the middle of a face whose corners are all clear.
    rings = push(rings)
    for _ in range(3):
        moves = {}
        for i in range(len(rings) - 1):
            for k in range(len(rings[i]) - 1):
                corners = ((i, k), (i, k + 1), (i + 1, k), (i + 1, k + 1))
                c = sum((rings[a][b] for a, b in corners), Vector()) / 4
                loc, normal, _, _ = skin.find_nearest(c)
                if loc is None:
                    continue
                d = (c - loc).dot(normal)
                if d < gaps[i] * 0.75:
                    # A few millimetres at most: a face across the hollow under her ankle bone has its middle deep in
                    # her skin, and pushed all the way its corners flew out as flaps along the collar.
                    step = normal * min(gaps[i] * 0.75 - d, FACE_PUSH)
                    for a, b in corners:
                        if not pinned[a][b] and step.length > moves.get((a, b), Vector()).length:
                            moves[(a, b)] = step
        if not moves:
            break
        for (a, b), step in moves.items():
            rings[a][b] = rings[a][b] + step
        for i in range(len(rings)):
            if shut[i]:
                rings[i][-1] = rings[i][0]
    return rings


def build_side(b, m, side, foot_pts, leg_pts, style, deform, near_weights, skin):
    """One shoe round her foot as built (`foot_pts`, her foot's skin, world), bent by `deform` as her skin is bent on
    her tipped foot; the heel is built after, straight down to the floor. Returns the floor's height."""
    origin, u, l = _frame(m)
    loc = [((p - origin).dot(u), (p - origin).dot(l), p.z) for p in foot_pts]
    first, last = min(a for a, _, _ in loc), max(a for a, _, _ in loc)
    ground = m["floor"]
    step = (last - first) / (STATIONS - 1)
    stations = [first + 0.004 + i * (last - first - 0.008) / (STATIONS - 1) for i in range(STATIONS)]
    vamp = style.get("vamp", 0.1)
    cut_at = ground + style.get("collar", 0.04)
    length = last - first

    def collar_at(s):
        """The top of the upper at s: up to COUNTER higher round the back of her heel, easing down to the collar."""
        t = min(1.0, max(0.0, (s - first) / (length * COUNTER[1])))
        # A boot's shaft covers the back of her heel instead.
        return cut_at + (0.0 if style.get("shaft") else COUNTER[0]) * (1 - t * t * (3 - 2 * t))

    # Each slice's upper is an arc round her foot from the left edge of its opening, under her foot, to the right edge
    # (angles from the slice's middle); where it's closed over the top, the arc meets itself at the top.
    slices = []
    for s in stations:
        near = [(a, c, z) for a, c, z in loc if abs(a - s) <= step * 0.75]
        # A closed shoe stops at the collar all along, round her leg; a low one is closed over her toes.
        behind = vamp == "closed" or s < last - vamp
        cut = collar_at(s) if behind else math.inf
        kept = [(c, z) for _, c, z in near if z <= cut]
        hull = _hull(kept)
        cs = [p[0] for p in hull]
        zs = [p[1] for p in hull]
        mid = Vector(((min(cs) + max(cs)) / 2, (min(zs) + max(zs)) / 2))
        start, end = math.pi / 2, math.pi / 2 + 2 * math.pi
        band = [c for c, z in kept if z > cut - 0.008]
        if max(zs) > cut - 0.01 and band:
            # Cut: the opening runs between her skin's outermost points just under the cut, either side.
            left, right = Vector((min(band), cut)), Vector((max(band), cut))
            start = math.atan2(left.y - mid.y, left.x - mid.x) % (2 * math.pi)
            end = math.atan2(right.y - mid.y, right.x - mid.x) % (2 * math.pi) + 2 * math.pi
        foot_print = [c for c, z in kept if z < ground + 0.012] or cs
        slices.append({"s": s, "hull": hull, "mid": mid, "span": [start, end],
                       "width": (min(foot_print), max(foot_print)),
                       # Her widest near the floor here (the toes spread fast near the front; smoothing narrows it).
                       "raw_width": (min([c for _, c, z in near if z < ground + TUCK] or [min(foot_print)]),
                                     max([c for _, c, z in near if z < ground + TUCK] or [max(foot_print)]))})

    # The opening's edges smoothed along her foot, so the vamp comes round in a curve.
    spans = _smooth_rings([[Vector((sl["span"][0], sl["span"][1]))] for sl in slices], SMOOTH * 3)
    for sl, (span,) in zip(slices, spans):
        if span.y - span.x > 2 * math.pi - SHUT_GAP:
            gap_mid = (span.x + span.y - 2 * math.pi) / 2
            span = Vector((gap_mid, gap_mid + 2 * math.pi))
        sl["ring"] = []
        for j in range(RING + 1):
            a = span.x + (span.y - span.x) * j / RING
            d = Vector((math.cos(a), math.sin(a)))
            sl["ring"].append(sl["mid"] + d * (_ray_hull(sl["hull"], sl["mid"], d) + GAP))

    # Smoothed along her foot, so the hulls' steps from slice to slice don't show, then pushed back out wherever
    # that took the upper inside her skin, and down to the sole underneath.
    smoothed = _smooth_rings([sl["ring"] for sl in slices], SMOOTH)
    # Her footprint's width, the widest of each slice's neighbours (her toes spread fast near the front), smoothed.
    wide = []
    for i in range(len(slices)):
        near_i = slices[max(0, i - 2):i + 3]
        wide.append((min(min(x["width"][0], x["raw_width"][0]) for x in near_i),
                     max(max(x["width"][1], x["raw_width"][1]) for x in near_i)))
    widths = _smooth_rings([[Vector((lo, 0)), Vector((hi, 0))] for lo, hi in wide], SMOOTH)
    sole_z = ground - GAP - 0.002
    for sl, ring, width in zip(slices, smoothed, widths):
        out, under_at = [], []
        for q in ring:
            d = q - sl["mid"]
            if d.length > 1e-6:
                # More room over her toes, whose small round tips the faces between points would cut.
                roomy = TOE_ROOM if sl["s"] > (m["ball"] - origin).dot(u) else 0.0
                least = _ray_hull(sl["hull"], sl["mid"], d.normalized()) + GAP * 0.7 + roomy
                if d.length < least:
                    q = sl["mid"] + d.normalized() * least
            # The bottom of the upper down on the sole, under her arch and the edges of her toes too, so no skin
            # shows between them.
            under = d.length > 1e-6 and d.y < -0.7 * d.length
            lo = min(width[0].x, sl["raw_width"][0]) - GAP
            hi = max(width[1].x, sl["raw_width"][1]) + GAP
            if under and q.y < sl["mid"].y:
                # Under her foot: flat on the sole (spread out to its edges below, in order, so it never folds).
                q = Vector((q.x, sole_z))
                under_at.append(len(out))
            elif q.y < sl["mid"].y and lo < q.x < hi:
                # The wall out to the full width of her footprint, so it comes straight down outside her toes' sides
                # and her arch onto the sole's welt: all the way near the floor, eased in above it.
                wide_x = lo if q.x < (lo + hi) / 2 else hi
                t = min(1.0, max(0.0, (sl["mid"].y - q.y) / max(1e-6, sl["mid"].y - (ground + TUCK))))
                q = Vector((q.x + (wide_x - q.x) * t * t * (3 - 2 * t), q.y))
                if q.y < ground + TUCK * 0.35:
                    q = Vector((q.x, sole_z))
            out.append(q)
        if under_at:
            xs = [out[k].x for k in under_at]
            a, b_ = min(xs), max(xs)
            if b_ - a > 1e-6:
                for k in under_at:
                    out[k] = Vector((lo + (out[k].x - a) / (b_ - a) * (hi - lo), out[k].y))
        sl["ring"] = out
        # The sole as wide as the wall comes down (out to her toes' sides).
        sl["width"] = (min(width[0].x, sl["raw_width"][0]), max(width[1].x, sl["raw_width"][1]))

    # The back of the heel, rounded off.
    count = RING + 1
    back = slices[0]
    bmid = sum(back["ring"], Vector((0.0, 0.0))) / count
    blow = min(q.y for q in back["ring"])
    for sw, sh, by in BACK:
        ring = [Vector((bmid.x + (q.x - bmid.x) * sw, blow + (q.y - blow) * sh)) for q in back["ring"]]
        if sw == 0.0:
            # The line the back closes on: each point and its mirror on the other side of her heel at one height, so
            # they weld into a seam (at different heights they zigzagged past each other and left pinholes).
            for k in range(count // 2):
                y = (ring[k].y + ring[count - 1 - k].y) / 2
                ring[k] = Vector((ring[k].x, y))
                ring[count - 1 - k] = Vector((ring[count - 1 - k].x, y))
        slices.insert(0, {"s": back["s"] - by, "ring": ring, "sole_skip": True, "back": True, "seam": sw == 0.0,
                          "width": (bmid.x - (bmid.x - back["width"][0]) * sw, bmid.x + (back["width"][1] - bmid.x) * sw)})

    # The toe box past her toes: first as wide as her toes, just clear of the longest, then narrowing.
    reach, narrow = TOES[style.get("toe", "round")]
    slices.append(dict(slices[-1], s=last + GAP))
    end = slices[-1]
    endmid = sum(end["ring"], Vector((0.0, 0.0))) / count
    lowest = min(q.y for q in end["ring"])
    for j, (sw, sh) in enumerate(narrow):
        ring = [Vector((endmid.x + (q.x - endmid.x) * sw, lowest + (q.y - lowest) * sh)) for q in end["ring"]]
        slices.append({"s": end["s"] + reach * (j + 1) / len(narrow), "ring": ring,
                       "width": (endmid.x - (endmid.x - end["width"][0]) * sw, endmid.x + (end["width"][1] - endmid.x) * sw)})

    w = lambda p: near_weights(p, side)
    to_w = lambda s, q: _to_world(origin, u, l, s, q.x, q.y)
    b.deform = deform
    # Its bottom edge tucked into the sole.
    # The bottom on the sole stays put; so does the top edge round the back of the heel, which stands clear behind her
    # (pushed off her Achilles' hollow, its points flicked up into spikes).
    # The seam down the back is held whole: pushed off her skin each side on its own, its two halves came apart.
    pinned = [[q.y <= sole_z + 1e-6 or sl.get("seam", False) or (sl.get("back") and k in (0, len(sl["ring"]) - 1))
               for k, q in enumerate(sl["ring"])] for sl in slices]
    # The bottom edge's line on the sole smoothed along her foot, so it has no teeth where a slice's points step in
    # or out.
    for _ in range(SMOOTH):
        xs = [[q.x for q in sl["ring"]] for sl in slices]
        for i in range(1, len(slices) - 1):
            for k, q in enumerate(slices[i]["ring"]):
                if pinned[i][k] and pinned[i - 1][k] and pinned[i + 1][k]:
                    q.x = (xs[i - 1][k] + 2 * xs[i][k] + xs[i + 1][k]) / 4
    # More room round the back of her heel: standing, her heel's skin (part on the shin) swings back a few millimetres.
    gaps = [GAP + HEEL_ROOM * min(1.0, max(0.0, (first + HEEL_ROOM_TO - sl["s"]) / (HEEL_ROOM_TO * 0.5)))
            for sl in slices]
    rings = clear_of_skin([[to_w(sl["s"], q) for q in sl["ring"]] for sl in slices], skin, sole_z, pinned, gaps)
    b.loft(rings, "leather", w, closed=False, cap_end=True)

    # The sole, flat under her foot as built, thickening under her toes for a platform; bent with her foot.
    platform = style.get("platform", 0.0)
    ball_s = (m["ball"] - origin).dot(u)
    top = ground - GAP * 0.6
    rows = []
    for sl in slices:
        # The upper's rows round the back of the heel and past her toes are bunched up; the sole rounds its own ends.
        if sl.get("sole_skip"):
            continue
        thick = SOLE + platform * min(1.0, max(0.0, (sl["s"] - (ball_s - 0.06)) / 0.04))
        lo, hi = sl["width"]
        rows.append((sl["s"], lo - GAP - 0.003, hi + GAP + 0.003, thick))
    bottoms = [(s, (lo + hi) / 2, top - thick, lo, hi) for s, lo, hi, thick in rows]
    _sole(b, w, rows, top, to_w)

    # Straps over her instep: the whole slice's outline there, over the top of her foot, grown.
    for share in style.get("straps", []):
        s0 = first + (last - first) * share
        rings = []
        for along in (s0 - 0.007, s0 + 0.007):
            near = [(c, z) for a, c, z in loc if abs(a - along) <= step]
            hull = _hull(near)
            cs = [p[0] for p in hull]
            zs = [p[1] for p in hull]
            mid = Vector(((min(cs) + max(cs)) / 2, (min(zs) + max(zs)) / 2))
            rings.append([to_w(along, Vector((q.x, max(q.y, ground)))) for q in _ring(hull, mid, GAP + 0.0025, 16)])
        b.loft(rings, "leather", w)

    # Round her ankle, and the T up to it.
    if style.get("ankle"):
        ankle = []
        for z in (0.125, 0.137):
            band = [(p.x, p.y) for p in leg_pts if abs(p.z - z) < 0.006]
            hull = _hull(band)
            c = Vector((sum(p[0] for p in hull) / len(hull), sum(p[1] for p in hull) / len(hull)))
            # Out over her legwear where it reaches the ankle (at 5 mm it went through her leggings).
            ankle.append([Vector((q.x, q.y, z)) for q in _ring(hull, c, 0.009, 16)])
        b.loft(ankle, "leather", w)
        if style.get("tstrap"):
            s0 = first + (last - first) * style["straps"][0]
            near = [(c, z) for a, c, z in loc if abs(a - s0) <= step]
            top_z = max(z for _, z in near) + GAP + 0.003
            front = max(ankle[0], key=lambda p: (p - origin).dot(u))
            start = _to_world(origin, u, l, s0, sum(c for c, _ in near) / len(near), top_z)
            rings = []
            for t in (0, 0.33, 0.66, 1):
                p = start.lerp(front + Vector((0, 0, 0.004)), t) + Vector((0, 0, 0.01 * math.sin(math.pi * t)))
                # Lying on her instep, not across the hollow of her ankle's front.
                near_skin, n_skin, _, _ = skin.find_nearest(p)
                if near_skin is not None:
                    p = near_skin + n_skin * (GAP + 0.002)
                rings.append([p + l * 0.005 + Vector((0, 0, -0.002)), p - l * 0.005 + Vector((0, 0, -0.002)),
                              p - l * 0.005 + Vector((0, 0, 0.002)), p + l * 0.005 + Vector((0, 0, 0.002))])
            b.loft(rings, "leather", w)

    # A boot's shaft, up her leg from inside the shoe.
    if style.get("shaft"):
        top_z = style["shaft"]
        start = cut_at - BOOT_OVERLAP
        zs = [start + LEG_STEP * i for i in range(int((top_z - start) / LEG_STEP) + 1)]
        if zs[-1] < top_z - 0.005:
            zs.append(top_z)
        rings = []
        for z in zs:
            band = [(p.x, p.y) for p in leg_pts if abs(p.z - z) < 0.006]
            if len(band) < 6:
                continue
            hull = _hull(band)
            c = Vector((sum(p[0] for p in hull) / len(hull), sum(p[1] for p in hull) / len(hull)))
            rings.append([Vector((q.x, q.y, z)) for q in _ring(hull, c, BOOT_GROW, 24)])
        if len(rings) > 1:
            b.loft(_smooth_rings(rings, 2), "leather", w)

    # Now in the shape she stands in: the floor under her toes, and the heel down to it.
    b.deform = None
    bent = [(deform(_to_world(origin, u, l, s, c, z)), lo, hi, s) for s, c, z, lo, hi in bottoms]
    floor = min(p.z for p, _, _, _ in bent)
    kind = style.get("kind")
    if kind == "wedge":
        rings = []
        for p, lo, hi, s in bent:
            if s > ball_s - 0.01:
                break
            half = (hi - lo) / 2 * 0.94
            rings.append([Vector((q.x, q.y, z)) for q, z in ((p - l * half, floor), (p + l * half, floor),
                                                              (p + l * half, p.z + 0.003), (p - l * half, p.z + 0.003))])
        if len(rings) > 1:
            b.loft(rings, "sole", w, cap_start=True, cap_end=True)
    elif kind and style.get("heel", 0) > 0:
        heel_s = slices[0]["s"] + HEEL_IN
        centre = min(bent, key=lambda e: abs(e[3] - heel_s))[0]
        heel_top = centre.z + 0.004
        rings = []
        for share, back_by, hx, hy in HEEL_SHAPES[kind]:
            z = heel_top + (floor - heel_top) * share
            c = centre - u * back_by
            rings.append([Vector((c.x, c.y, z)) + u * (hy * math.sin(a)) + l * (hx * math.cos(a))
                          for a in (2 * math.pi * k / 12 for k in range(12))])
        b.loft(rings, "sole", w, cap_start=True, cap_end=True)
    return floor


def _sole(b, w, rows, top, to_w):
    """The sole: her footprint's outline (each row's (s, lo, hi, thickness), heel to toe) with both ends rounded off,
    and loops stepped in from it, bottom edge, side, the welt's ridge, its inner slope and the insole, so the welt runs
    round it all in one clean line."""
    def end_cap(row, sign):
        s, lo, hi, thick = row
        midx, half = (lo + hi) / 2, (hi - lo) / 2
        depth = min(half * 0.8, SOLE_ROUND)
        return [(s + sign * depth * t, midx - half * math.sqrt(1 - t * t), midx + half * math.sqrt(1 - t * t), thick)
                for t in (0.3, 0.55, 0.75, 0.9, 0.98)]
    rows = list(reversed(end_cap(rows[0], -1))) + rows + end_cap(rows[-1], 1)
    # The outline, round: down the left edge heel to toe, back up the right; each point with its row's width and
    # thickness.
    outline = [(Vector((s, lo)), hi - lo, t) for s, lo, hi, t in rows] +               [(Vector((s, hi)), hi - lo, t) for s, lo, hi, t in reversed(rows)]
    n = len(outline)
    inward = []
    for k in range(n):
        a, c = outline[k - 1][0], outline[(k + 1) % n][0]
        tangent = (c - a).normalized()
        inward.append(Vector((-tangent.y, tangent.x)))
    # Which way is in: towards the middle of the outline.
    centre = sum((p for p, _, _ in outline), Vector((0.0, 0.0))) / n
    if sum((centre - p).dot(d) for (p, _, _), d in zip(outline, inward)) < 0:
        inward = [-d for d in inward]
    # (inset, height): height "bottom", "mid", or measured up from the insole.
    loops = [(0.004, "bottom"), (0.0, "mid"), (0.0005, WELT), (0.0035, WELT * 0.6), (0.006, 0.0)]
    ids = []
    for inset, height in loops:
        ring = []
        for (p, width, thick), d in zip(outline, inward):
            q = p + d * min(inset, width * 0.3)
            bottom = top - thick
            z = bottom if height == "bottom" else bottom + thick * 0.55 if height == "mid" else top + height
            ring.append(b.add(to_w(q.x, Vector((q.y, z))), w))
        ids.append(ring)
    for i in range(len(ids) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            b.faces.append((ids[i][k], ids[i][k2], ids[i + 1][k2], ids[i + 1][k]))
            b.mats.append("sole")
            b.uvs.append(((k / n, i / 4), (k2 / n, i / 4), (k2 / n, (i + 1) / 4), (k / n, (i + 1) / 4)))
    for ring, flip in ((ids[0], True), (ids[-1], False)):
        face = tuple(reversed(ring)) if flip else tuple(ring)
        b.faces.append(face)
        b.mats.append("sole")
        b.uvs.append(tuple((0.5, 0.5) for _ in face))


def game_tip_axis(rig, name, side):
    """The axis the game tips her foot about (appearance.ts tipFeet): level, across the line from her ankle joint to
    the ball of her foot (the Foot and Toe bones' heads). The shoe must be bent about the very same axis, or her foot
    in the game turns a little sideways inside it and her toes and heel graze through."""
    foot = rig.matrix_world @ rig.data.bones[f"{name}_Foot_{side}"].head_local
    toe = rig.matrix_world @ rig.data.bones[f"{name}_Toe_{side}"].head_local
    along = toe - foot
    along.z = 0
    return Vector((0, 0, 1)).cross(along.normalized()).normalized()


def tip(rig, marks, angle, name):
    """Tips both her feet by `angle` (radians) on the ankle, and her toes back level."""
    for side, _ in SIDES:
        axis = game_tip_axis(rig, name, side)
        for part, a in (("Foot", angle), ("Toe", -angle)):
            pb = rig.pose.bones[f"{name}_{part}_{side}"]
            pb.rotation_mode = "QUATERNION"
            rest = (rig.matrix_world @ pb.bone.matrix_local).to_quaternion()
            pb.rotation_quaternion = Quaternion(rest.inverted() @ axis, a)
    bpy.context.view_layer.update()


def deformer(rig, m, side, name):
    """Bends a point as her skin is bent on her tipped foot (foot_bones.weights, the bones' pose)."""
    mats = {}
    for part in ("Foot", "Toe"):
        pb = rig.pose.bones[f"{name}_{part}_{side}"]
        mats[part] = rig.matrix_world @ pb.matrix @ pb.bone.matrix_local.inverted() @ rig.matrix_world.inverted()

    def bend(p):
        wf, wt = foot_bones.weights(m, p)
        if wf <= 0:
            return p.copy()
        moved = (mats["Foot"] @ p) * (1 - wt) + (mats["Toe"] @ p) * wt
        return p * (1 - wf) + moved * wf

    return bend


def build(rig, coll, name="Female", only=None):
    """Replaces her shoe objects in coll with ones built round her feet. Returns {mesh: (foot tip in degrees, floor)}."""
    body = bpy.data.objects[f"{name}_Body"]
    marks = foot_bones.landmarks(name, body)
    rest_pts = [body.matrix_world @ v.co for v in body.data.vertices]
    mats = {"leather": bpy.data.materials["T_leather"], "sole": bpy.data.materials["T_sole_dark"]}
    groups = {g.index: g.name for g in body.vertex_groups}
    skin = BVHTree.FromPolygons(rest_pts, [p.vertices[:] for p in body.data.polygons])
    kd = KDTree(len(rest_pts))
    for i, p in enumerate(rest_pts):
        kd.insert(p, i)
    kd.balance()

    def near_weights(p, side):
        """Her skin's weights nearest p, Foot and Toe folded into the Shin (a shoe holds its shape)."""
        if p.z < 0.2:
            return {f"{name}_Shin_{side}": 1.0}
        _, i, _ = kd.find(p)
        out = {}
        for g in body.data.vertices[i].groups:
            if g.weight > 1e-3:
                n = groups[g.group].replace("_Foot_", "_Shin_").replace("_Toe_", "_Shin_")
                out[n] = out.get(n, 0) + g.weight
        return out or {f"{name}_Shin_{side}": 1.0}

    results = {}
    for style in STYLES:
        if only is not None and style["mesh"] not in only:
            continue
        obj_name = f"{name}_Shoes{style['mesh']}"
        old = bpy.data.objects.get(obj_name)
        hidden = old.hide_get() if old else bool(style["mesh"])
        if old:
            bpy.data.objects.remove(old)
        old_mesh = bpy.data.meshes.get(obj_name)
        if old_mesh and old_mesh.users == 0:
            bpy.data.meshes.remove(old_mesh)
        if style.get("bare"):
            results[style["mesh"]] = (0.0, None)
            continue
        rise = style.get("heel", 0.0) - style.get("platform", 0.0)
        angle = foot_bones.tip_angle(marks["L"], rise)
        tip(rig, marks, angle, name)
        b = Builder()
        floors = []
        for side, sx in SIDES:
            foot = [p for p in rest_pts if p.x * sx > 0.03 and p.z < 0.16]
            leg = [p for p in rest_pts if p.x * sx > 0.01 and 0.05 < p.z < 0.75]
            floors.append(build_side(b, marks[side], side, foot, leg, style, deformer(rig, marks[side], side, name),
                                     near_weights, skin))
        tip(rig, marks, 0.0, name)

        mesh = bpy.data.meshes.new(obj_name)
        mesh.from_pydata(b.verts, [], b.faces)
        order = ["sole", "leather"]
        for key in order:
            mesh.materials.append(mats[key])
        for poly, mat in zip(mesh.polygons, b.mats):
            poly.material_index = order.index(mat)
        uv = mesh.uv_layers.new(name="UVMap")
        for poly, corners in zip(mesh.polygons, b.uvs):
            for li, c in zip(poly.loop_indices, corners):
                uv.data[li].uv = c
        obj = bpy.data.objects.new(obj_name, mesh)
        coll.objects.link(obj)
        obj.parent = rig
        # The weights go on while each point is still at the place in the list it was built at. Merging the doubles
        # below shifts every point after a merged one; set afterwards by the builder's numbering (as it once was), the
        # weights slid out of step with the points, and the end of one shoe took the other shoe's leg: the leather
        # stretched across to the other foot as she walked (2026-11-23). Merging keeps each kept point's groups.
        for i, ws in enumerate(b.weights):
            for g, wt in ws.items():
                vg = obj.vertex_groups.get(g) or obj.vertex_groups.new(name=g)
                vg.add([i], wt, "REPLACE")
        bm = bmesh.new()
        bm.from_mesh(mesh)
        # An arc that meets itself over her toes meets at one point.
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = True
        mod = obj.modifiers.new("Bones", "ARMATURE")
        mod.object = rig
        obj["foot_tip"] = round(angle, 5)
        obj.hide_set(hidden)
        results[style["mesh"]] = (round(math.degrees(angle), 1), round(min(floors), 4))
    return results
