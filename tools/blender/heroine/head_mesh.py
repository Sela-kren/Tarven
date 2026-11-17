"""
The heroine's head as a polygon model, built the way a game artist box-models a head:

1. a quad sphere (a subdivided cube) pushed onto the head's broad form (an own SDF: skull, face oval, jaw);
2. edge loops cut in with insets around each eye and the mouth, then placed on hand-drawn curves:
   the eye opening (a hole: the eyeball is a separate mesh), the lid, the crease, the orbit;
   the lip seal, the lips' fullest line, the lip border (cupid's bow), the ring round the mouth;
3. a nose raised from an inset patch; a neck extruded down from the base of the skull;
4. the free vertices relaxed over the broad form so the loops flow.

Head coordinates: origin on the eye line at the midline, y = 0 at the front of the eyes, z up, +y front.
Runs inside Blender (bmesh). No reference mesh is used: every curve below is drawn by hand.
"""
import math
import os
import numpy as np
import bmesh
from mathutils import Vector

import sdf
import head_form
from sdf import V, ellipsoid, cone, halfspace, loft, smax, rot, unit

EDGE_FACE, EDGE_NECK, EDGE_JAW = 0.66, 0.30, 0.45   # the face's and neck's edges against the scalp's (refs: ~5 / ~6.5 / ~8 mm)
N = 24                       # quad sphere: cuts per cube edge; graded afterwards (edge_size)
NECK_R = (0.038, 0.042)      # the neck's half width and half depth where it meets the body
NECK_Y = -0.103              # neck centre (y) under the skull base (z -0.06): the refs' neck sits ~31 mm behind the skull's centre
NECK_LEAN = 0.10             # y per z: the refs' neck is near-upright under the head, the nape easing back going down
NECK_VERTS = 24
NECK_JOIN_Z = 1.470 - (0.881 * 1.70 + 1.70) / 2   # head-local z of the ring the body joins (world 1.47)
NECK_RINGS = (-0.113, NECK_JOIN_Z)
MOUTH_REGION = (0.0300, 0.0135)
NECK_INFO = {}

# ---- proportions: the median of the measured references (head_table.json), in head coordinates
TABLE_PATH = os.environ.get("HEROINE_HEAD_TABLE", os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                              "head_table.json"))
TABLE = head_form.load_table(TABLE_PATH)
YS = 0.003                   # y of the midline front at the eye line
LM = head_form.landmarks(TABLE, YS)
EYE_FWD = 0.0010               # sphere fits to the refs' eyeballs (eyeball.py): r 15.3, front ~0.7 mm ahead of ours
LOWER_CORNEA = 0.2
CORNEA = (0.0017, 0.0085)      # the cornea's bulge in front of the sphere (refs' eye front ~3 mm past the sphere), radius
EYE = V(*LM["eyeball_centre"]) + V(0.0, EYE_FWD, 0.0)  # left eye; the right is mirrored
EYE_R = LM["eyeball_radius"]
EYE_IN = (LM["eye_inner"][0], LM["eye_inner"][2])
EYE_OUT = (LM["eye_outer"][0], LM["eye_outer"][2])
EYE_TOP = (LM["eye_top"][0], LM["eye_top"][2])
EYE_BOT = (LM["eye_bottom"][0], LM["eye_bottom"][2])
# stylisation over the measured median (the future eye-size and eye-tilt sliders start here):
# a slightly larger, rounder, flatter opening
EYE_OPEN = 1.06       # size
EYE_IN_DIP = 0.0004    # the inner corner sits this much lower (was 1.2 mm: with the halved tilt it drooped the outer corner)
EYE_ROUND = 1.0       # height over width
EYE_TILT = 1.0        # share of the measured outer-corner lift kept
_cx, _cz = (EYE_IN[0] + EYE_OUT[0]) / 2, (EYE_IN[1] + EYE_OUT[1]) / 2
_sc = lambda p, k=1.0: (_cx + (p[0] - _cx) * EYE_OPEN, _cz + (p[1] - _cz) * EYE_OPEN * k)
EYE_IN, EYE_OUT = _sc(EYE_IN), _sc(EYE_OUT)
_lift = (EYE_OUT[1] - EYE_IN[1]) * (1 - EYE_TILT) / 2
EYE_IN, EYE_OUT = (EYE_IN[0], EYE_IN[1] + _lift - EYE_IN_DIP), (EYE_OUT[0], EYE_OUT[1] - _lift)   # inner corner dips
EYE_TOP, EYE_BOT = _sc(EYE_TOP, EYE_ROUND), _sc(EYE_BOT, EYE_ROUND)
EYE_C = ((EYE_IN[0] + EYE_OUT[0]) / 2, (EYE_TOP[1] + EYE_BOT[1]) / 2)
EYE_REGION = ((EYE_OUT[0] - EYE_IN[0]) / 2 + 0.0085, (EYE_TOP[1] - EYE_BOT[1]) / 2 + 0.0090)
MOUTH_Z = LM["stomion"][2]
MOUTH_W = LM["mouth_corner"][0] * 1.0   # the refs' mouth width
ST_Y = LM["stomion"][1]
CORNER_Y = LM["mouth_corner"][1]
ULF, LLF = LM["upper_lip_front"], LM["lower_lip_front"]
SUBNASALE, MENTOLABIAL = LM["subnasale"], LM["mentolabial_fold"]


# ------------------------------------------------------------------------------------------------ broad form
BROW_K, SOCKET_K = 0.010, 0.016
SYM_KEEP = 'X'                          # which half bmesh.ops.symmetrize keeps
# the ear's loops, outside in: (half depth, share of half height, share of the stand-out, relief mm, shift to bowl). The relief across
# them is the ear: outer wall, the rim (helix) curling over, the groove inside it (scapha), the inner ridge
# (antihelix), and the bowl (concha) going down to the skin
EAR_RINGS = [(0.0082, 0.80, 0.00, 0.0, 0.00),   # root, on the skin
             (0.0112, 0.97, 0.55, 0.0, 0.00),   # outer wall
             (0.0130, 1.04, 0.95, 0.0, 0.00),   # rim, outside
             (0.0124, 1.02, 1.00, 2.6, 0.05),   # rim crest
             (0.0110, 0.94, 1.00, -1.2, 0.15),  # rim lip, curling in
             (0.0098, 0.86, 1.00, -5.6, 0.25),  # groove (scapha)
             (0.0086, 0.77, 1.00, -1.0, 0.40),  # inner ridge (antihelix)
             (0.0070, 0.62, 1.00, -6.5, 0.65),  # bowl's edge
             (0.0052, 0.46, 1.00, -12.0, 0.85)]  # down into the bowl (concha)
EAR_RINGS_MORE = 2                     # extra inner loops (height-map ear): the inner face's ridges need the samples
EAR_BOWL = (0.0045, -0.0035)         # the bowl sits forward and low in the ear, by the head
EAR_DEBUG = {}
EAR_RY_FRONT = [0.0132, 0.0126, 0.0120, 0.0115, 0.0110]   # the outer loops' front radius: nested, root outermost
EAR_W = 1.20                         # loop widths (y) x this: the refs' ears are ~35 mm wide in side view
EAR_SHIFT_Y = 0.002                 # and sit a little forward (sections at the ear, 99-108 deg)
EAR_LOBE_IN = 0.45                   # the lobe lies closer to the head than the rim
EAR_FRONT_FLAT = 0.85                # the outer loops at the front lie near the skin (no rim there)
EAR_FRONT_BOWL = -2.5                # relief (mm) of the inner loops at the front: the bowl opening to the ear hole
EAR_TRAGUS = (3.0, {1: 0.6, 2: 1.0, 3: 0.7}, -0.25, 0.40)   # bump mm, per loop, centre angle (rad, front), spread
EAR_OUT = 1.0                       # how far the back of the ear stands out (towards the refs' ear width)
# The ear's outer face as a height over the skin (mm), in the ear's own box: s = -1 back .. +1 front, t = -1 lobe .. +1 top
# (the box = the rim crest's extent). A tilted plate - attached at the front, standing out at the back - with the
# parts of the ear set into it: the bowl (concha) low and forward, split by the rim's root (crus) running in from the
# front; the flap in front of the ear hole (tragus) and its partner below-behind the bowl (antitragus); the inner
# ridge (antihelix) rising behind the bowl and forking at the top round a shallow pit (triangular fossa).
EAR_PLATE = (10.0, -6.9, -3.1, -1.9, 4.0)  # H = a + b s + c t + d s^2 + e t^2 (fit to the refs' ear outside the bowl, rms 1.9 mm)
EAR_CONCHA = ((0.62, -0.14, 0.34, 0.26, -1.2),  # bowl parts: centre s, t, radii s, t, floor height mm (lower: the cavum,
              (0.52, 0.22, 0.28, 0.12, 1.0))   # upper: the cymba); the skin the ear is measured from sits ~3 mm under ours
EAR_CONCHA_OUT = (0.55, -0.06, 0.43, 0.40)   # the bowl's outline (s, t centre; radii): the inner loops close onto it
EAR_RING_F = {5: (0.18, 1.14), 6: (0.37, 1.14), 7: (0.56, 1.14), 8: (0.75, 1.12), 9: (1.0, 0.96), 10: (1.0, 1.03)}
EAR_LIP = (9, 10)                          # the bowl's lip loop and the loop tucked under it (the wall's foot): an undercut
EAR_LIP_OPEN = (0.35, 0.75) 
EAR_LIP_PLAIN = (1.06, 0.90)               # the two loops' outline scales where the lip is open (lip outside, foot inside)
EAR_FRONT_CAP = (0.45, 0.85, 1.5)          # cos(angle) ramp, and the front's height cap (mm over the skin; plus the tragus)
               # ...but not across the bowl's front (cos of the angle round the bowl)   # per loop: share of the way from loop 4, outline scale
EAR_CONCHA_WALL = (0.84, 1.06)
EAR_CONCHA_DIP = (2.0, 0.66, -0.12, 0.30)   # the bowl deepens towards the ear hole: mm, centre s, t, radius (box units)              # the bowl's wall: from this share of its radii (floor) to this (rim)
EAR_CRUS = ([(0.45, 0.92), (0.78, 0.72), (0.88, 0.48)], 3.0, 2.2)   # the rim's front limb, down the
# front edge: path, height mm, half width mm
EAR_CRUS_IN = ((0.88, 0.48), (0.42, 0.26), 1.6, 0.3, 1.8)   # its root running into the bowl: from, to, height at the
# front, share left at the tip, half width mm
EAR_TRAGUS2 = ((1.00, -0.20), (1.6, 3.5), 1.2)     # centre, radii mm (y, z), height mm
EAR_ANTITRAGUS = ((0.30, -0.42), (3.0, 3.0), 1.8)
EAR_ANTIHELIX = ([(0.02, -0.42), (-0.05, -0.05), (-0.08, 0.18)],   # stem, then the upper and lower branches
                 [(-0.08, 0.18), (-0.18, 0.50), (-0.12, 0.74)],
                 [(-0.08, 0.18), (0.20, 0.40), (0.52, 0.50)], 3.0, 2.0)
EAR_FOSSA = ((0.10, 0.60), (3.0, 3.5), -2.5)
EAR_RIM = {3: 3.0, 4: 1.6, 5: -3.0}       # the rolled rim (helix) over the plate: crest, lip, the groove inside it
EAR_ROLL = 1.5                             # the rim's outer side sits this far (mm) below the crest
EAR_BOX = {}
EAR_REGION_FWD = 0.0                    # the ear's patch reaches this much further forward (room for the front ramp)
EAR_FRONT_RAMP = {1: 0.20, 2: 0.42, 3: 0.68, 4: 0.88}   # at the front, each outer loop's share of the ear's height
EAR_LEAN = 0.04                            # the upper half's lean back (y per z); the lower half (lobe forward) 0.20
EAR_BOX_FIX = (-0.09, 0.91)                # box centre shift (x half width) and width scale: crest extent -> raised-rim extent
EAR_HMAP = True                            # the ear's face from ear_height (False: the old per-loop relief)


def _seg_dist(p, a, b):
    ax, az = b[0] - a[0], b[1] - a[1]
    u = max(0.0, min(1.0, ((p[0] - a[0]) * ax + (p[1] - a[1]) * az) / max(ax * ax + az * az, 1e-12)))
    return math.hypot(p[0] - a[0] - u * ax, p[1] - a[1] - u * az)


def _smooth(e0, e1, x):
    q = min(max((x - e0) / (e1 - e0), 0.0), 1.0)
    return q * q * (3 - 2 * q)


def ear_lip_w(k, th):
    """The bowl weight forced on the lip loop (0: the plate's height) and the loop tucked under it (1: the floor),
    except across the bowl's front, where it opens to the ear hole (None: the bowl's own smooth wall)."""
    if k not in EAR_LIP or _smooth(EAR_LIP_OPEN[0], EAR_LIP_OPEN[1], math.cos(th)) > 0.5:
        return None
    return 0.0 if k == EAR_LIP[0] else 1.0


def _plateless(y, z, byc, bzc, bhw, bhh):
    """ear_height less the tragus (so the front cap keeps the tragus's bump)."""
    s, t = (y - byc) / bhw, (z - bzc) / bhh
    (cs, ct), r, h = EAR_TRAGUS2
    P = (s * bhw * 1000, t * bhh * 1000)
    return ear_height(s, t, bhw * 1000, bhh * 1000) - h * math.exp(-((P[0] - cs * bhw * 1000) / r[0]) ** 2 - ((P[1] - ct * bhh * 1000) / r[1]) ** 2)


def ear_height(s, t, hw, hh, bowl=None):
    """Height (mm) of the ear's outer face over the skin at box coords (s, t); hw, hh = the box's half sizes (mm)."""
    a, b, c, d, e = EAR_PLATE
    H = a + b * s + c * t + d * s * s + e * t * t
    mm = lambda p: (p[0] * hw, p[1] * hh)
    P = mm((s, t))
    def ridge(path, h, w):
        dd = min(_seg_dist(P, mm(path[i]), mm(path[i + 1])) for i in range(len(path) - 1))
        return h * math.exp(-(dd / w) ** 2)
    def bump(cen, r, h):
        cx, cz = mm(cen)
        return h * math.exp(-((P[0] - cx) / r[0]) ** 2 - ((P[1] - cz) / r[1]) ** 2)
    H += ridge(EAR_ANTIHELIX[0], EAR_ANTIHELIX[3], EAR_ANTIHELIX[4])
    H += max(ridge(EAR_ANTIHELIX[1], EAR_ANTIHELIX[3], EAR_ANTIHELIX[4]), ridge(EAR_ANTIHELIX[2], EAR_ANTIHELIX[3], EAR_ANTIHELIX[4]))
    H += bump(*EAR_FOSSA)
    H += bump(*EAR_ANTITRAGUS)
    cs, ct, rs, rt = EAR_CONCHA_OUT                  # the bowl: the plate sinks to the bowl's floor
    r = math.hypot((s - cs) / rs, (t - ct) / rt)
    w = 1.0 - _smooth(EAR_CONCHA_WALL[0], EAR_CONCHA_WALL[1], r) if bowl is None else bowl
    fl = EAR_CONCHA[0][4] + (EAR_CONCHA[1][4] - EAR_CONCHA[0][4]) * _smooth(0.05, 0.25, t)   # the upper part (cymba) is shallower
    dc = math.hypot(s - EAR_CONCHA_DIP[1], t - EAR_CONCHA_DIP[2]) / EAR_CONCHA_DIP[3]
    fl -= EAR_CONCHA_DIP[0] * max(1 - dc * dc, 0.0)
    H = H * (1 - w) + fl * w
    H += ridge(EAR_CRUS[0], EAR_CRUS[1], EAR_CRUS[2])
    a_, b_, h0, tip, wc = EAR_CRUS_IN                 # tapering from the front edge to its tip in the bowl
    A, B = mm(a_), mm(b_)
    ax, az = B[0] - A[0], B[1] - A[1]
    u = max(0.0, min(1.0, ((P[0] - A[0]) * ax + (P[1] - A[1]) * az) / (ax * ax + az * az)))
    H += h0 * (1 - (1 - tip) * u) * math.exp(-(_seg_dist(P, A, B) / wc) ** 2) * (1 - _smooth(0.85, 1.0, u))
    H += bump(*EAR_TRAGUS2)
    return H
NOSE_TIP = (0.0084, 0.0056, 0.0060)    # half sizes: the tip's bulb
NOSE_WING = (0.0062, 0.0060, 0.0050)   # each wing
NOSTRIL = (0.0022, 0.0030)              # nostril half width and length (on the underside)
NOSTRIL_AT = (0.0060, -0.0130, -0.0076)  # its centre from the nose tip (x out, y back, z down)
NOSTRIL_DEPTH = 0.0030
NOSTRIL_DENTS = False
BOW = (0.0016, 0.0012, 0.0050)   # the cupid's bow: peaks' rise, the middle's dip, the peaks' x
PHILTRUM_COLS = ((0.0026, 0.0040), (0.0020, 0.0022), 0.003)   # x at the top and at the bow; radii top, bottom; blend
NOSE_LIFT = 0.0023                      # the nose's underside (columella, tip) raised: the refs' drops off ~3 mm higher
WING_SHIFT = (0.0020, 0.0, 0.0022)      # the wings out and up (face-relative map: 1.3-2.9 mm short at x 10-14 mm)
NASION_DIP = (0.0045, -0.005, (0.010, 0.0045, 0.009), 0.006)   # centre y, z from the nasion mark; radii; blend
NOSTRILS_ON = True      # off until the nose's underside is dense enough for a clean hole (faces there are ~5 mm)
LID_UP, LID_DN = 0.0030, 0.0008    # lid thickness over the eyeball (upper, lower)   # blends of the brow ridge and the inner socket
SCM = ((-0.046, 110.0), (-0.088, 66.0), 0.0100, 0.0060, 0.010)   # was None; tried ((-0.050, 115.0), (-0.118, 28.0), 0.0060, 0.0025, 0.010): no visible change, widened the neck's sides   # top (z, angle round the neck from the front), foot, radius, stand-out, blend
THROAT = None   # tried an ellipsoid under the chin: it read as a lump; the neck's front leans instead (NECK_THROAT_FWD)
NECK_THROAT_FWD = 0.0            # the throat comes forward towards the chin (the refs' recedes ~13 mm over 1.495-1.46)
NECK_FRONT_TAPER = 0.0           # the front half's extra narrowing at the top (sections at 1.475-1.495, 45-90 deg)
NECK_TAPER = 0.10              # the neck's width under the head, less than at the shoulders' ring
NECK_FILLET = (0.005, 0.010)  # the neck's blend into the head: soft at the throat (under the chin), tight at the nape
INNER_BROW = (0.012, -0.0025, 0.0090)   # centre (head-local) of the fill above the inner eye corner
NOSE_RING_TOP = -0.012         # the nose loops stop below the inner eye corners (they tore the bridge)
UNDER_EDGE = 0.004            # the jaw's lower edge at the angle sits this far under the gonion mark
JAWLINE_ON = True
JAW_DBG = {}
JAWLINE = [(-12.5, -95.0), (-41.0, -84.5), (-57.0, -78.0), (-69.0, -70.0), (-73.5, -63.5), (-77.0, -54.5), (-81.0, -43.0)]   # (y, z) mm
JAW_STEP, JAW_BAND, JAW_K = 0.003, (0.010, 0.012), 0.008
JAW_RAMUS_STEP = 0.0025                    # behind the ramus: a shallower step (the refs' sections there are full)
JAW_XIN = 0.62                             # ...outside this share of the jaw's half width in plan
JAW_SLOPE = 1.6                            # under the body: the step deepens this much per metre below the line   # the step in under the line (m); full to 12 mm out, gone by 24; blend
NECK_REBLEND = 0.005          # the neck re-added over the jaw carves: the refs' neck flares into the head under the ear
UNDER_CUT = True              # the under-jaw carve (test: the loft alone under the jaw)


def neck_c(z):
    return V(0, NECK_Y + (z + 0.06) * NECK_LEAN, z)


NECK_TUCK = 0.009      # the nape comes forward under the skull: the neck's back half is this much shallower at the top


def neck_back_r(z):
    """The neck's back half-depth at height z: the body's at the join, tucked in under the occiput."""
    up = np.clip((np.asarray(z, float) - NECK_JOIN_Z) / (-0.07 - NECK_JOIN_Z), 0.0, 1.0)
    s = np.clip((up - 0.15) / 0.55, 0.0, 1.0)
    return NECK_R[1] - NECK_TUCK * s * s * (3 - 2 * s)


def neck_prim():
    def f(P):
        cy = NECK_Y + (P[:, 2] + 0.06) * NECK_LEAN
        up = np.clip((P[:, 2] - NECK_JOIN_Z) / (-0.07 - NECK_JOIN_Z), 0.0, 1.0)
        rx = NECK_R[0] * (1.0 - NECK_TAPER * up)          # the refs' neck is a little narrower under the head
        # ...and its front half narrower still near the top (the throat's sides, under the jaw), so the jaw's
        # underside shows from the side as a shadowed band; nothing at the body's ring
        rx = rx * np.where(P[:, 1] > cy, 1.0 - NECK_FRONT_TAPER * np.clip((P[:, 1] - cy) / NECK_R[1], 0, 1) ** 0.5 * np.sqrt(up), 1.0)
        q_ = np.clip(up / 0.5, 0.0, 1.0)
        ry = np.where(P[:, 1] < cy, neck_back_r(P[:, 2]), NECK_R[1] + NECK_THROAT_FWD * q_ * q_ * (3 - 2 * q_))
        r = np.sqrt((P[:, 0] / rx) ** 2 + ((P[:, 1] - cy) / ry) ** 2)
        side = (r - 1.0) * min(NECK_R)
        return np.maximum(side, np.maximum(P[:, 2] + 0.03, (NECK_RINGS[0] - 0.004) - P[:, 2]))
    return f, (V(-0.06, -0.20, NECK_RINGS[0] - 0.01), V(0.06, 0.0, -0.02))



def base_field():
    """The head without eyes and lips: the measured broad form, and the nose on it."""
    head = sdf.Node("head", 0.0)
    form = head_form.outline_loft(TABLE, YS)
    # under the jaw: from the chin the underside rises to the jaw's angles (a V seen from the front)
    gx, gy, gz = LM["gonion"]
    chin_z = LM["menton"][2]
    k = 0.75 * (gz - chin_z) / (gx - 0.010)
    nrm = math.sqrt(1 + k * k)
    neck_back = LM["menton"][1] - 0.075

    def jaw(P, f=form):
        ax = np.maximum(np.abs(P[:, 0]) - 0.015, 0.0)              # the chin's own width stays flat
        under = (k * ax - (P[:, 2] - chin_z)) / nrm
        fade = np.clip((P[:, 1] - neck_back) / 0.02, 0, 1)        # not behind the neck
        return smax(f(P), np.where(fade > 0, under * fade - (1 - fade) * 0.05, -1.0), 0.040)
    # the neck is part of the head's skin: the throat curves up into the jaw's underside, the nape stays crisp
    ff, fb = form.prim()
    nf, nb = neck_prim()
    def form_neck(P):
        cy = NECK_Y + (P[:, 2] + 0.06) * NECK_LEAN
        t = np.clip((P[:, 1] - cy) / NECK_R[1] * 0.5 + 0.5, 0.0, 1.0)      # 0 at the nape .. 1 at the throat
        k = NECK_FILLET[1] + (NECK_FILLET[0] - NECK_FILLET[1]) * t
        a, b = ff(P), nf(P)
        h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
        return b + (a - b) * h - k * h * (1.0 - h)
    head.add((form_neck, (np.minimum(fb[0], nb[0]), np.maximum(fb[1], nb[1]))), 0.0)
    # under the jawbone: the space beside the throat is carved away below a border that rises from the chin to
    # the jaw's angle (fitted to the refs' widths at 1.505 and 1.52), sparing the neck and a chin pad
    my, mz = LM["menton"][1], LM["menton"][2]
    pad = ellipsoid(V(0, my - 0.012, mz + 0.010), (0.018, 0.018, 0.016))[0]
    XC, PW, UNDER_SLOPE = 0.012, 1.6, 0.2
    gx = gx + 0.007                                # the refs' jaw is ~49 mm wide at the angle's height
    # the jaw's lower edge in plan: from beside the chin to the angle; inside it (towards the throat) the
    # underside rises at UNDER_SLOPE, so the space under the jaw is a sloped V, not a shelf
    A2 = np.array([XC, my - 0.008]); B2 = np.array([gx, gy])
    tdir = (B2 - A2) / np.linalg.norm(B2 - A2)
    nin = np.array([tdir[1], -tdir[0]])                     # inward normal (towards the midline-back)
    if nin @ (np.array([0.0, gy]) - A2) < 0:
        nin = -nin
    def under_jaw(P):
        ax = np.clip((np.abs(P[:, 0]) - XC) / (gx - XC), 0.0, 1.0)
        q = np.stack([np.abs(P[:, 0]), P[:, 1]], 1) - A2
        inside = np.maximum(q @ nin - 0.010, 0.0)          # the underside runs level ~1 cm in from the edge, then rises
        # towards the jaw's angle the border sinks away under the head, so the carve fades out (no wall)
        fade = np.clip((P[:, 1] - (gy - 0.025)) / 0.040, 0.0, 1.0)
        fade = fade * fade * (3 - 2 * fade)
        border = mz + (gz - UNDER_EDGE - mz) * ax ** PW + UNDER_SLOPE * inside * fade - (1.0 - fade) * 0.05
        c1 = P[:, 2] - border                      # below the jaw's lower edge
        c2 = 0.002 - nf(P)                         # outside the neck
        c3 = -pad(P)                               # outside the chin
        return np.maximum(c1, np.maximum(c2, c3))
    if UNDER_CUT: head.cut((under_jaw, (V(-0.09, gy - 0.02, mz - 0.04), V(0.09, my + 0.03, gz + 0.01))), 0.004)
    head.add(ellipsoid(V(0, my, mz + 0.006), (0.017, 0.010, 0.009)), 0.010)   # the chin's base: full, square at the bottom front
    if JAWLINE_ON:
        # the jawline as the user drew it on the side view (2026-11-17): chin -> angle -> up the ramus to the lobe.
        # Below/behind it the skin steps in by JAW_STEP (a crisp edge), never into the neck, and only on the jaw's
        # outer side (the floor under the chin keeps its own V)
        J = np.array(JAWLINE) / 1000.0
        A2j = np.array([XC, my - 0.008]); B2j = np.array([gx, gy])
        def jaw_step(P):
            q = P[:, 1:3]
            best = np.full(len(P), 1e9); sgn = np.ones(len(P)); seg = np.zeros(len(P))
            for si, (a_, b_) in enumerate(zip(J[:-1], J[1:])):
                d_ = b_ - a_
                u = np.clip(((q - a_) @ d_) / (d_ @ d_), 0.0, 1.0)
                c_ = a_ + u[:, None] * d_
                dist = np.linalg.norm(q - c_, axis=1)
                cr = d_[0] * (q[:, 1] - a_[1]) - d_[1] * (q[:, 0] - a_[0])      # > 0: below / behind the line
                m = dist < best
                best = np.where(m, dist, best); sgn = np.where(m, np.sign(cr), sgn); seg = np.where(m, si, seg)
            sd = best * sgn                                                      # + outside the jaw
            # under the jaw's body the skin turns in towards the neck (an underside facing down); behind the ramus
            # only a band steps in (the skull behind the ear stays)
            wr = np.clip(seg - (len(J) - 4), 0.0, 1.0)                           # 0 body .. 1 ramus
            body = JAW_STEP + JAW_SLOPE * np.maximum(sd, 0.0)
            band = JAW_RAMUS_STEP * np.clip(1.0 - (sd - JAW_BAND[0]) / JAW_BAND[1], 0.0, 1.0)
            depth = body * (1 - wr) + band * wr
            # the jaw's lower edge in plan (from beside the chin to the angle): carve only its outer part (the floor
            # under the chin, nearer the midline, keeps its own V)
            t_ = np.clip((P[:, 1] - A2j[1]) / (B2j[1] - A2j[1]), 0.0, 1.0)
            x_in = JAW_XIN * (A2j[0] + t_ * (B2j[0] - A2j[0]))
            return np.maximum.reduce([-sd, -(ff(P) + depth), 0.002 - nf(P), x_in - np.abs(P[:, 0]),
                                      P[:, 2] - (J[-1][1] - 0.002), P[:, 1] - (J[0][0] + 0.004)])
        JAW_DBG.update(step=jaw_step, nf=nf, ff=ff, J=J)
        head.cut((jaw_step, (V(-0.09, J[-1][0] - 0.04, J[0][1] - 0.03), V(0.09, J[0][0] + 0.01, J[-1][1] + 0.005))), JAW_K)
    head.add((nf, nb), NECK_REBLEND)        # the neck again, blended over the carve: a soft corner where the jaw's underside meets it
    if THROAT:
        # the throat under the chin: the refs' sits ~7 mm further forward at 1.495 (midline), receding to the body's ring
        ty_, tz_, tr_, tk_ = THROAT
        head.add(ellipsoid(V(0, ty_, tz_), tr_), tk_)
    if SCM:
        # the neck's long muscle (sternocleidomastoid): a ridge from behind the ear down and forward to the throat's
        # base. In front of it, under the jaw, the neck falls back into a shadowed hollow (the refs' side views)
        (z0_, a0_), (z1_, a1_), r_, out_, k_ = SCM
        pts = []
        for t in np.linspace(0.0, 1.0, 5):
            z_ = z0_ + (z1_ - z0_) * t
            a_ = math.radians(a0_ + (a1_ - a0_) * t)
            cy_ = NECK_Y + (z_ + 0.06) * NECK_LEAN
            up_ = min(max((z_ - NECK_JOIN_Z) / (-0.07 - NECK_JOIN_Z), 0.0), 1.0)
            rx_ = NECK_R[0] * (1.0 - NECK_TAPER * up_)
            ry_ = NECK_R[1] if math.cos(a_) > 0 else float(neck_back_r(z_))
            px_, py_ = rx_ * math.sin(a_), cy_ + ry_ * math.cos(a_)
            nx_, ny_ = math.sin(a_) / rx_, math.cos(a_) / ry_
            nn_ = math.hypot(nx_, ny_)
            inset = r_ - out_ * (1 - 0.8 * t)          # standing out less towards its foot (the body's ring)
            pts.append(V(px_ - nx_ / nn_ * inset, py_ - ny_ / nn_ * inset, z_))
        for a_, b_ in zip(pts[:-1], pts[1:]):
            head.add(cone(a_, b_, r_, r_), k_)
            head.add(cone(a_ * V(-1, 1, 1), b_ * V(-1, 1, 1), r_, r_), k_)
    # the brow: a soft ridge over the eye, its front on the refs' brow line
    bx, by, bz = LM["brow_front"]
    head.add(ellipsoid(V(bx - 0.001, by - 0.0105, bz - 0.005), (0.019, 0.009, 0.0075), rot((0, 0, 1), -30)), BROW_K)   # turned to follow the face round
    # where the brow meets the bridge, above the inner eye corner: the refs are 2-3.5 mm fuller (front heatmap t141)
    head.add(ellipsoid(V(INNER_BROW[0], INNER_BROW[1], INNER_BROW[2]), (0.0065, 0.0055, 0.0060)), 0.007)
    # the inner corner of the socket, beside the nose bridge: a soft hollow (the loft can't hold a dip this narrow)
    ix, iy, iz = LM["eye_inner"]
    head.cut(ellipsoid(V(ix - 0.001, iy + 0.0115, iz - 0.003), (0.0065, 0.005, 0.0055)), SOCKET_K)
    _, ty, tz = LM["nose_tip"]
    _, ny, nz = LM["nasion"]
    head.add(cone(V(0, ny - 0.0140, nz - 0.014), V(0, ty - 0.0105, tz + 0.0010), 0.0062, 0.0057), 0.013)   # bridge: broad side planes into the cheeks
    # the nose, sized to the refs' nose: a rounded tip, the wings (alae) out at the measured nose width, the
    # columella between the nostrils, and the nostrils carved in from below
    head.add(ellipsoid(V(0, ty - 0.0082, tz - 0.0022), NOSE_TIP), 0.006)
    if NASION_DIP:      # the dip at the top of the bridge, between the eyes (the refs sit ~1.5 mm in from the brow-chin line)
        _, ny_, nz_ = LM["nasion"]
        head.cut(ellipsoid(V(0, ny_ + NASION_DIP[0], nz_ + NASION_DIP[1]), NASION_DIP[2]), NASION_DIP[3])
    wx, wy, wz = LM["nose_wing"]
    head.add(ellipsoid(V(wx - 0.0070 + WING_SHIFT[0], wy - 0.0025 + WING_SHIFT[1], wz - 0.0025 + WING_SHIFT[2]), NOSE_WING), 0.0060)   # fairly crisp: the groove round the wing shows
    head.add(ellipsoid(V(0, ty - 0.0095, tz - 0.0085 + NOSE_LIFT), (0.0034, 0.0060, 0.0030)), 0.003)       # columella
    if NOSTRIL_DENTS:
        # the nostrils: shallow dents in the underside either side of the columella (deep enough to shade, shallow
        # enough for the skin's projection to follow them)
        for sx in (1, -1):
            head.cut(ellipsoid(V(sx * 0.0058, ty - 0.0112, tz - 0.0082), (0.0024, 0.0040, 0.0021), rot((0, 0, 1), sx * 18)), 0.0012)
    # the philtrum: the upper lip's middle column, from under the nose down to the lip
    _, sy_, sz_ = LM["subnasale"]; _, uy_, uz_ = LM["upper_lip_front"]
    if PHILTRUM_COLS:
        # two ridges (philtral columns) from under the nose down to the bow's peaks, a shallow groove between them
        px_, pr_, pk_ = PHILTRUM_COLS
        for sx_ in (1, -1):
            a_ = V(sx_ * px_[0], sy_ - 0.0030, sz_ - 0.0015); b_ = V(sx_ * px_[1], uy_ - 0.0022, uz_ + 0.0012)
            head.add(cone(a_, b_, pr_[0], pr_[1]), pk_)
    else:
        head.add(ellipsoid(V(0, (sy_ + uy_) / 2 - 0.0035, (sz_ + uz_) / 2 + 0.001), (0.0055, 0.0035, 0.0055)), 0.006)
    return head


FIELD = base_field()
CENTRE = V(0.0, -0.075, -0.010)
_ACTIVE = [FIELD]


def field(P):
    P = np.atleast_2d(P).copy()
    P[:, 0] = np.abs(P[:, 0])
    return _ACTIVE[0].eval(P, P.min(0) - 0.01, P.max(0) + 0.01)


NECK_PROJ = (-0.080, -0.100)     # between these heights the rays' start slides from the head's centre to the neck's axis


def proj_origin(P):
    """Where a point's projection ray starts: the head's centre, or low down the neck's own axis just above it, so
    the neck's skin lands on its wall (a ray from the head's centre would reach its flat end)."""
    z = np.maximum(P[:, 2], NECK_RINGS[0] + 0.0015)
    w = np.clip((NECK_PROJ[0] - z) / (NECK_PROJ[0] - NECK_PROJ[1]), 0.0, 1.0)
    w = w * np.clip((-0.045 - P[:, 1]) / 0.020, 0.0, 1.0)     # not under the jaw: that skin keeps the centre's rays
    w = w * w * (3 - 2 * w)
    zc = np.minimum(z + 0.006, NECK_PROJ[0])
    ax = np.stack([np.zeros_like(zc), NECK_Y + (zc + 0.06) * NECK_LEAN, zc], 1)
    return CENTRE + (ax - CENTRE) * w[:, None], z


def project_radial(P, steps=40):
    """Move points along the ray from the head's centre (the neck's axis, low down) onto the broad form."""
    O, z = proj_origin(P)
    P = np.concatenate([P[:, :2], z[:, None]], 1)
    d = P - O
    d /= np.linalg.norm(d, axis=1)[:, None]
    lo = np.full(len(P), 0.005)
    hi = np.full(len(P), 0.30)
    for _ in range(steps):
        mid = (lo + hi) / 2
        inside = field(O + d * mid[:, None]) < 0
        lo = np.where(inside, mid, lo)
        hi = np.where(inside, hi, mid)
    return O + d * ((lo + hi) / 2)[:, None]


def surface_y(x, z):
    """The broad form's front surface at (x, z): scan in from the front."""
    x, z = np.atleast_1d(x).astype(float), np.atleast_1d(z).astype(float)
    lo = np.full(len(x), -0.12)   # inside
    hi = np.full(len(x), 0.08)    # outside
    for _ in range(40):
        mid = (lo + hi) / 2
        inside = field(np.stack([x, mid, z], 1)) < 0
        lo = np.where(inside, mid, lo)
        hi = np.where(inside, hi, mid)
    return (lo + hi) / 2


# ------------------------------------------------------------------------------------------------ curves
def hump(s, peak):
    """0 at s = 0 and 1, 1 at s = peak: the lift of a lid or lip along its length."""
    g = math.log(0.5) / math.log(peak)
    return np.sin(np.pi * np.clip(s, 0, 1) ** g)


def cornea_bump(dx, dz):
    """The cornea's rise over the eyeball sphere at (dx, dz) off the eye's axis."""
    q = np.clip(1.0 - (np.asarray(dx) ** 2 + np.asarray(dz) ** 2) / CORNEA[1] ** 2, 0.0, 1.0)
    return CORNEA[0] * q * q


def on_eyeball(u, z, rr, cw=1.0):
    """y on a sphere of radius rr round the eyeball (u is |x|), with the cornea's bulge: the lids drape over it."""
    q = rr * rr - (u - EYE[0]) ** 2 - (z - EYE[2]) ** 2
    return EYE[1] + np.sqrt(np.maximum(q, 0.0)) + cw * cornea_bump(u - EYE[0], z - EYE[2])


def eye_arcs(grow_up, grow_down, grow_in, grow_out, depth, samples=200):
    """
    The eye opening grown outward: (top arc, bottom arc), each from the outer corner to the inner corner,
    as (u, y, z) points. depth: radius above the eyeball, or None to lie on the broad form.
    """
    outer = np.array([EYE_OUT[0] + grow_out, EYE_OUT[1] + grow_out * 0.25])
    inner = np.array([EYE_IN[0] - grow_in, EYE_IN[1]])
    span = EYE_OUT[0] - EYE_IN[0]
    s_top = (EYE_OUT[0] - EYE_TOP[0]) / span
    s_bot = (EYE_OUT[0] - EYE_BOT[0]) / span
    up = EYE_TOP[1] - (EYE_OUT[1] + (EYE_IN[1] - EYE_OUT[1]) * s_top)
    down = (EYE_OUT[1] + (EYE_IN[1] - EYE_OUT[1]) * s_bot) - EYE_BOT[1]
    s = np.linspace(0, 1, samples)
    u = outer[0] + (inner[0] - outer[0]) * s
    mid = outer[1] + (inner[1] - outer[1]) * s
    top = mid + (up + grow_up) * hump(s, s_top)
    bot = mid - (down + grow_down) * hump(s, s_bot)
    arcs = []
    for k, z in enumerate((top, bot)):
        d = depth[k] if isinstance(depth, tuple) else depth
        # folds and lid thickness fade out towards the corners, where the loops converge
        taper = 0.25 + 0.75 * hump(s, s_top if k == 0 else s_bot) ** 0.6
        cw = 1.0 if k == 0 else LOWER_CORNEA      # the lower lid sits below the cornea, on the sphere
        if d is None:
            y = surface_y(u, z)
        elif isinstance(d, str):
            # "s<mm>": that far under the skin (the broad form), never inside the eyeball
            y = np.maximum(surface_y(u, z) - float(d[1:]) / 1000 * taper, on_eyeball(u, z, EYE_R + 0.0006, cw))
        else:
            # on the eyeball; where the eyeball falls away (the inner corner) the lid follows the skin instead
            dd = d if d <= 0.0006 else 0.0006 + (d - 0.0006) * taper      # only the lid's extra thickness tapers
            y = np.maximum(on_eyeball(u, z, EYE_R + dd, cw), surface_y(u, z) - 0.0035) if d > 0.0006 else on_eyeball(u, z, EYE_R + d, cw)
        arcs.append(np.stack([u, y, z], 1))
    return arcs


UPPER_LIP_H = 0.0020   # the upper lip's red part, taller than the landmark gives (the refs' is ~5-6 mm at the middle)
SEAL_FWD = 0.0022     # the lips press together: their meeting line sits this far in front of the refs' stomion mark


def seal_y(x):
    t = np.clip(1 - (np.asarray(x) / MOUTH_W) ** 2, 0, 1)
    return ST_Y - (ST_Y - CORNER_Y) / MOUTH_W ** 2 * x * x + SEAL_FWD * t


def mouth_arcs(kind, samples=200):
    """The mouth's loops, (top, bottom), each from the +x corner to the -x corner."""
    if kind == "skin":
        # between the ring round the mouth and the lip's edge
        a, b = mouth_arcs("around", samples), mouth_arcs("edge", samples)
        return [0.5 * (a[0] + b[0]), 0.5 * (a[1] + b[1])]
    if kind == "curl":
        # the lips rolling in from their fullest line to where they meet (kept close to the seal so smoothing
        # doesn't pull the lips apart)
        a, b = mouth_arcs("full", samples), mouth_arcs("seal", samples)
        m = [0.35 * a[0] + 0.65 * b[0], 0.35 * a[1] + 0.65 * b[1]]
        for arc in m:
            arc[:, 1] += 0.0010 * np.clip(1 - (arc[:, 0] / MOUTH_W) ** 2, 0, 1)
        return m
    if kind == "edge":
        # just outside the lip border and a step back: the crisp edge where lip meets skin
        top, bot = mouth_arcs("border", samples)
        w = MOUTH_W + 0.0016
        t = np.clip(1 - (top[:, 0] / w) ** 2, 0, 1)
        top = top + np.stack([np.sign(top[:, 0]) * 0.0010 * (1 - t), -0.0017 * t, 0.0010 * t ** 0.5], 1)
        bot = bot + np.stack([np.sign(bot[:, 0]) * 0.0010 * (1 - t), -0.0016 * t, -0.0011 * t ** 0.5], 1)
        return [top, bot]
    if kind == "around":
        w = 0.0300
    elif kind == "border":
        w = MOUTH_W + 0.0016
    else:
        w = MOUTH_W
    x = np.linspace(w, -w, samples)
    t = np.clip(1 - (x / w) ** 2, 0, 1)
    # where the lips meet: a gull wing, the upper lip's middle bead dipping, rising a little to each side
    gull = 0.0004 * t ** 0.5 - 0.0009 * np.exp(-(x / 0.0045) ** 2)
    if kind == "seal":
        top = np.stack([x, seal_y(x), MOUTH_Z + 0.0001 + gull], 1)
        bot = np.stack([x, seal_y(x) - 0.0003, MOUTH_Z - 0.0001 + gull], 1)
    elif kind == "bag":
        top = np.stack([x * 0.97, seal_y(x) - 0.004, MOUTH_Z + 0.0002 * t + gull], 1)
        bot = np.stack([x * 0.97, seal_y(x) - 0.004, MOUTH_Z - 0.0002 * t + gull], 1)
    elif kind == "full":
        top = np.stack([x, seal_y(x) - SEAL_FWD * t + (ULF[1] - ST_Y - 0.0026) * t ** 0.5, MOUTH_Z + (ULF[2] - MOUTH_Z + UPPER_LIP_H) * 0.62 * t ** 0.7], 1)
        bot = np.stack([x, seal_y(x) - SEAL_FWD * t + (LLF[1] - ST_Y + 0.0002) * t ** 0.5, MOUTH_Z + (LLF[2] - MOUTH_Z) * t ** 0.7], 1)
    elif kind == "border":
        bow = BOW[0] * np.exp(-((np.abs(x) - BOW[2]) / 0.003) ** 2) - BOW[1] * np.exp(-(x / 0.0025) ** 2)   # cupid's bow
        top = np.stack([x, seal_y(x) - SEAL_FWD * t + (ULF[1] - ST_Y - 0.0020) * t ** 0.6,
                        MOUTH_Z + (ULF[2] - MOUTH_Z + UPPER_LIP_H) * t ** 0.5 + bow * t], 1)
        bot = np.stack([x, seal_y(x) - SEAL_FWD * t + (LLF[1] - ST_Y) * 0.5 * t ** 0.6, MOUTH_Z + (LLF[2] - MOUTH_Z) * 2.0 * t ** 0.6], 1)
    else:  # around: the philtrum's foot above, the fold under the lower lip below; on the broad form
        zt = MOUTH_Z + (SUBNASALE[2] - MOUTH_Z) * 0.85 * t ** 0.5
        zb = MOUTH_Z + (MENTOLABIAL[2] - MOUTH_Z) * t ** 0.5
        top = np.stack([x, surface_y(x, zt), zt], 1)
        bot = np.stack([x, surface_y(x, zb), zb], 1)
    return [top, bot]


def resample(arc, n):
    """n points spread evenly by length along a polyline, ends excluded."""
    seg = np.linalg.norm(np.diff(arc, axis=0), axis=1)
    L = np.concatenate([[0], np.cumsum(seg)])
    want = L[-1] * (np.arange(1, n + 1) / (n + 1))
    return np.stack([np.interp(want, L, arc[:, k]) for k in range(3)], 1)


def walk_loop(edges, quiet=False):
    """The verts of a closed loop of edges, in walking order."""
    adj = {}
    for e in edges:
        a, b = e.verts
        adj.setdefault(a, []).append(b)
        adj.setdefault(b, []).append(a)
    start = min(adj, key=lambda v: (v.co.z, v.co.x))
    order, seen, cur = [start], {start}, start
    while True:
        nxt = [w for w in adj[cur] if w not in seen]
        if not nxt:
            break
        cur = nxt[0]
        seen.add(cur)
        order.append(cur)
    if len(order) != len(adj) and not quiet:
        print(f"walk_loop: walked {len(order)} of {len(adj)} verts (the loop touches itself)")
    return order


def region_border(region):
    rset = set(region)
    return [e for e in {e for f in region for e in f.edges} if sum(g in rset for g in e.link_faces) == 1]


def chain_rings(rings, outer_edges=None, outer_order=None):
    """
    Order nested loops (outermost first) so that vertex i of every loop is joined to vertex i of the next:
    the edges running across the loops then stay straight when the loops are placed.
    """
    chains = [list(outer_order) if outer_order is not None else walk_loop(outer_edges)]
    for inner in rings[1:]:
        ins = set(inner)
        nxt = []
        for v in chains[-1]:
            if v is None:
                nxt.append(None)
                continue
            cand = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in ins]
            nxt.append(min(cand, key=lambda w: (w.co - v.co).length) if cand else None)
        if any(w is None for w in nxt) or len({w for w in nxt}) != len(nxt):
            print(f"chain_rings: loop of {len(chains[-1])} -> {len(inner)}, {sum(w is None for w in nxt)} unmatched, "
                  f"{len(nxt) - len(set(nxt))} doubled")
        chains.append(nxt)
    return chains


def place_rings(chains, centre_xz, arcs_list, mirror):
    """
    Put nested loops on their curves. Each curve is (top arc, bottom arc) from the corner at angle 0 to the
    corner at angle pi; vertex i of every loop gets the same place along its own curve.
    mirror = -1 for the right eye (curves are drawn for |x|).
    """
    outer = chains[0]
    n = len(outer)
    co = np.array([tuple(v.co) for v in outer])
    u = co[:, 0] * mirror
    ang = np.arctan2(co[:, 2] - centre_xz[1], u - centre_xz[0])
    # walk counter-clockwise (angle increasing) in the (u, z) plane
    area = np.sum(u * np.roll(co[:, 2], -1) - np.roll(u, -1) * co[:, 2])
    idx = list(range(n)) if area > 0 else list(range(n))[::-1]
    c0 = int(np.argmin(np.abs(ang)))
    k0 = idx.index(c0)
    idx = idx[k0:] + idx[:k0]                    # starts at the corner at angle 0
    cpi_pos = int(np.argmin([abs(abs(ang[i]) - np.pi) for i in idx]))
    top_pos = list(range(1, cpi_pos))
    bot_pos = list(range(cpi_pos + 1, n))[::-1]  # bottom also runs from angle 0 to pi
    for chain, arcs in zip(chains, arcs_list):
        top, bot = arcs
        pts = {}
        pts[idx[0]] = top[0]
        pts[idx[cpi_pos]] = top[-1]
        for pos_list, arc in ((top_pos, top), (bot_pos, bot)):
            if pos_list:
                for p, q in zip(pos_list, resample(arc, len(pos_list))):
                    pts[idx[p]] = q
        for i, q in pts.items():
            v = chain[i]
            if v is not None:
                v.co = Vector((q[0] * mirror, q[1], q[2]))


# ------------------------------------------------------------------------------------------------ mesh ops
def quad_sphere(bm):
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=N - 1, use_grid_fill=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    for v in bm.verts:
        c = np.array(v.co)
        c = c / np.abs(c).max()
        c = np.tan(c * math.pi / 4)           # equal-angle cube map: even quads over the sphere
        v.co = Vector(c / np.linalg.norm(c))


def coords(bm):
    return np.array([tuple(v.co) for v in bm.verts])


def set_coords(bm, P, mask=None):
    for i, v in enumerate(bm.verts):
        if mask is None or mask[i]:
            v.co = Vector(P[i])


def face_centres(faces):
    return np.array([tuple(f.calc_center_median()) for f in faces])


def inset_rings(bm, region, count, thickness, boundary=True):
    """
    Inset a face region count times. Returns the loops from outside in (count + 1 of them), the region (its
    faces keep their verts, which end up innermost), and the outermost loop's edges.
    Blender's inset keeps the region's own verts on the inside and makes new verts where the border was.
    """
    region = list(region)
    rverts = lambda: {v for f in region for v in f.verts}
    rings, outer_edges = [], None
    for k in range(count):
        res = bmesh.ops.inset_region(bm, faces=region, thickness=thickness, depth=0.0,
                                     use_even_offset=True, use_boundary=boundary)
        inner = rverts()
        strip_v = {v for f in res["faces"] for v in f.verts}
        outer = strip_v - inner
        rings.append(list(outer))
        if k == 0:
            outer_edges = [e for f in res["faces"] for e in f.edges if all(v in outer for v in e.verts)]
            outer_edges = list(set(outer_edges))
    rings.append(list({v for e in region_border(region) for v in e.verts}))
    return rings, region, outer_edges


def relax(bm, fixed, iters=12, project=True, weight=0.6):
    """Even out the free vertices (Laplacian), keeping them on the broad form."""
    bm.verts.index_update()
    E = np.array([(e.verts[0].index, e.verts[1].index) for e in bm.edges])
    n = len(bm.verts)
    P = coords(bm)
    free = ~fixed
    for _ in range(iters):
        acc = np.zeros_like(P)
        cnt = np.zeros(n)
        np.add.at(acc, E[:, 0], P[E[:, 1]])
        np.add.at(acc, E[:, 1], P[E[:, 0]])
        np.add.at(cnt, E[:, 0], 1)
        np.add.at(cnt, E[:, 1], 1)
        avg = acc / np.maximum(cnt, 1)[:, None]
        Q = P + (avg - P) * weight
        if project:
            Q[free] = project_radial(Q[free])
        P[free] = Q[free]
    set_coords(bm, P)


def edge_size(P):
    """
    Wanted edge length (relative) over the head, after the references' pattern: the scalp sparse (~8 mm), the face
    front about half that, the eyes, nose, mouth and ears densest.
    """
    d = P - CENTRE
    dn = d / np.linalg.norm(d, axis=1)[:, None]
    fw = np.clip((dn[:, 1] - 0.15) / 0.45, 0, 1) * np.clip(1 - ((P[:, 2] + 0.035) / 0.115) ** 2, 0, 1)
    h = 1.0 - EDGE_FACE * fw
    h *= 1 - EDGE_NECK * np.clip((-0.085 - P[:, 2]) / 0.02, 0, 1)      # the neck: finer than the scalp
    jz = LM["gonion"][2]
    h *= 1 - EDGE_JAW * np.exp(-((P[:, 2] - jz + 0.006) / 0.016) ** 2) * np.clip((dn[:, 1] + 0.3) / 0.5, 0, 1)   # along the jaw
    front = np.clip((dn[:, 1] - 0.2) / 0.3, 0, 1)
    for cx, cz, sig, k in ((EYE_C[0], EYE_C[1], 0.017, 0.40), (-EYE_C[0], EYE_C[1], 0.017, 0.40),
                           (0.0, MOUTH_Z, 0.018, 0.40), (0.0, -0.030, 0.014, 0.35)):
        g = np.exp(-((P[:, 0] - cx) ** 2 + (P[:, 2] - cz) ** 2) / sig ** 2) * front
        h *= 1 - k * g
    side = np.clip((np.abs(dn[:, 0]) - 0.6) / 0.3, 0, 1)
    ez = (LM["ear_top"][2] + LM["ear_bottom"][2]) / 2
    ey = (LM["ear_front"][1] + LM["ear_back"][1]) / 2
    h *= 1 - 0.30 * side * np.exp(-((P[:, 1] - ey) ** 2 + (P[:, 2] - ez) ** 2) / 0.022 ** 2)
    return h


def fine_zone(P):
    """Where the game mesh keeps the extra subdivision: the mouth, the nose and the ears (the refs' densest
    parts). The eyes' loops are already close; forehead, cheeks and scalp stay at the cage's spacing."""
    d = P - CENTRE
    dn = d / np.linalg.norm(d, axis=1)[:, None]
    front = dn[:, 1] > 0.25
    mouth = ((P[:, 0] / (MOUTH_W + 0.008)) ** 2 + ((P[:, 2] - MOUTH_Z) / 0.012) ** 2 < 1.0) & front
    _, ty, tz = LM["nose_tip"]
    nose = (np.abs(P[:, 0]) < 0.019) & (P[:, 2] > tz - 0.014) & (P[:, 2] < tz + 0.022) & front & (P[:, 1] > ty - 0.030)
    ez = (LM["ear_top"][2] + LM["ear_bottom"][2]) / 2
    ey = (LM["ear_front"][1] + LM["ear_back"][1]) / 2
    ear = (np.abs(P[:, 0]) > 0.05) & (((P[:, 1] - ey) / 0.020) ** 2 + ((P[:, 2] - ez) / 0.033) ** 2 < 1.0)
    return mouth | nose


def nose_zone(P):
    """The nose's tip, wings and underside, where rays from the head's centre meet the skin at a graze."""
    _, ty, tz = LM["nose_tip"]
    return (np.abs(P[:, 0]) < 0.016) & (P[:, 2] > tz - 0.016) & (P[:, 2] < tz + 0.010) & (P[:, 1] > ty - 0.026)


def project_closest(P, iters=4, max_move=0.004):
    """Newton steps along the field's gradient onto its zero surface (the nearest skin, not along a ray)."""
    Q = P.copy()
    h = 1e-4
    for _ in range(iters):
        d = field(Q)
        g = np.stack([(field(Q + e) - field(Q - e)) / (2 * h) for e in np.eye(3) * h], 1)
        step = (d / np.maximum((g * g).sum(1), 1e-12))[:, None] * g
        Q = Q - step
    mv = np.linalg.norm(Q - P, axis=1)
    Q[mv > max_move] = P[mv > max_move]
    return Q


def relax_sized(bm, fixed, iters=40, step=0.3, smooth=0.12):
    """
    Slide the free vertices over the broad form so each edge takes its wanted length (edge_size): springs along the
    edges plus a little smoothing, re-projected every step. The topology stays; only the spacing grades.
    """
    bm.verts.index_update()
    E = np.array([(e.verts[0].index, e.verts[1].index) for e in bm.edges])
    n = len(bm.verts)
    P = coords(bm)
    free = ~fixed
    cnt = np.zeros(n)
    np.add.at(cnt, E[:, 0], 1)
    np.add.at(cnt, E[:, 1], 1)
    for _ in range(iters):
        h = edge_size(P)
        D = P[E[:, 1]] - P[E[:, 0]]
        L = np.linalg.norm(D, axis=1) + 1e-9
        tgt = 0.5 * (h[E[:, 0]] + h[E[:, 1]])
        tgt *= L.mean() / tgt.mean()
        f = ((L - tgt) / L)[:, None] * D
        acc = np.zeros_like(P)
        np.add.at(acc, E[:, 0], f)
        np.add.at(acc, E[:, 1], -f)
        lap = np.zeros_like(P)
        np.add.at(lap, E[:, 0], P[E[:, 1]])
        np.add.at(lap, E[:, 1], P[E[:, 0]])
        lap = lap / np.maximum(cnt, 1)[:, None] - P
        Q = P + (acc / np.maximum(cnt, 1)[:, None]) * step + lap * smooth
        Q[free] = project_radial(Q[free], steps=22)
        nz = free & nose_zone(Q)
        if nz.any():
            Q[nz] = project_closest(Q[nz])      # under the nose the centre's rays graze: go to the nearest skin
        P[free] = Q[free]
    set_coords(bm, P)


# ------------------------------------------------------------------------------------------------ the head
def lift_off_cap(bm, keep):
    """Skin that slid onto the neck's flat end (below or level with the rim) goes back out onto the neck's wall,
    just above the rim; the neck's own rings (keep) stay."""
    z_up = NECK_RINGS[0] + 0.003
    for v in bm.verts:
        if v not in keep and v.co.z < z_up:
            c = neck_c(z_up)
            a = math.atan2(v.co.x, v.co.y - c[1])
            up = min(max((z_up - NECK_JOIN_Z) / (-0.07 - NECK_JOIN_Z), 0.0), 1.0)
            rx = NECK_R[0] * (1.0 - NECK_TAPER * up)
            v.co = Vector((rx * math.sin(a), c[1] + NECK_R[1] * math.cos(a), z_up + min(z_up - v.co.z, 0.01) * 0.3))


SMOOTH_ITERS = 30
SMOOTH_Z = (-0.012, 0.004)       # head-local z: full smoothing below the first, none above the second


def taubin(bm, fixed, iters=12, lam=0.5, mu=-0.53):
    """Taubin (lambda/mu) smoothing over the lower face: removes ripples without shrinking the form. The features'
    own loops (fixed) stay, and the smoothing fades in over three edge rings away from them."""
    bm.verts.index_update()
    n = len(bm.verts)
    E = np.array([(e.verts[0].index, e.verts[1].index) for e in bm.edges])
    P = coords(bm)
    fx = np.array([v in fixed for v in bm.verts])
    # edge-ring distance from the fixed loops
    dist = np.where(fx, 0, 99)
    for k in range(1, 4):
        near = np.zeros(n, bool)
        near[E[:, 0][dist[E[:, 1]] == k - 1]] = True
        near[E[:, 1][dist[E[:, 0]] == k - 1]] = True
        dist = np.where(near & (dist > k), k, dist)
    w = np.clip(dist / 3.0, 0.0, 1.0)
    zt = np.clip((SMOOTH_Z[1] - P[:, 2]) / (SMOOTH_Z[1] - SMOOTH_Z[0]), 0.0, 1.0)
    w = w * zt * zt * (3 - 2 * zt)
    w[P[:, 2] < NECK_RINGS[0] + 0.004] = 0.0          # the neck's rim stays on its ring
    _, ty, tz = LM["nose_tip"]
    dn = np.sqrt((np.maximum(np.abs(P[:, 0]) - 0.012, 0) / 0.006) ** 2 + ((P[:, 2] - (tz - 0.004)) / 0.016) ** 2)
    w = w * np.clip(dn - 0.6, 0.0, 1.0) ** 2 * np.where(P[:, 1] > ty - 0.03, 1.0, 1.0)   # not the nose: its corners stay crisp
    cnt = np.zeros(n)
    np.add.at(cnt, E[:, 0], 1)
    np.add.at(cnt, E[:, 1], 1)
    cnt = np.maximum(cnt, 1)[:, None]
    def lap(P):
        L = np.zeros_like(P)
        np.add.at(L, E[:, 0], P[E[:, 1]])
        np.add.at(L, E[:, 1], P[E[:, 0]])
        return L / cnt - P
    P0 = P.copy()
    for _ in range(iters):
        P = P + lam * w[:, None] * lap(P)
        P = P + mu * w[:, None] * lap(P)
    set_coords(bm, P)
    return float(np.abs(P - P0).max() * 1000)


def untangle(bm, iters=30, region=lambda c: 0.006 < abs(c.x) < 0.028 and -0.018 < c.z < 0.012 and c.y > -0.035):
    """Relax the verts of inside-out faces (normal against the head's radial direction) in a region."""
    C = Vector(CENTRE)
    moved = 0
    for _ in range(iters):
        bad = [f for f in bm.faces if region(f.calc_center_median())
               and f.normal_update() is None and f.normal.dot((f.calc_center_median() - C).normalized()) < 0.05]
        if not bad:
            break
        vs = {v for f in bad for v in f.verts}
        new = {v: sum((e.other_vert(v).co for e in v.link_edges), Vector()) / len(v.link_edges) for v in vs}
        for v, p in new.items():
            v.co = v.co.lerp(p, 0.5)
        moved += len(vs)
    return moved


def build(bm):
    """Fill bm with the head. Returns the eyeball centres and radius."""
    quad_sphere(bm)
    # the neck opens out of the bottom cube face: its centre 6 x 6 cells (a 24-vert border, the body's ring);
    # the sphere is turned so that face looks down the neck
    hole_l = bm.faces.layers.int.new("neck_hole")
    for f in bm.faces:
        c = f.calc_center_median()
        lim = math.tan(math.pi / 4 * 6 / N)        # the centre 6 x 6 cells at any N: a 24-vert border
        f[hole_l] = int(c.z < 0 and abs(c.x / c.z) < lim and abs(c.y / c.z) < lim)
    rot = Vector((0, 0, -1)).rotation_difference(Vector(unit(neck_c(NECK_RINGS[0]) - CENTRE))).to_matrix()
    for v in bm.verts:
        v.co = rot @ v.co
    P = coords(bm) * 0.10 + CENTRE
    set_coords(bm, project_radial(P))
    relax(bm, np.zeros(len(bm.verts), bool), iters=6)
    relax_sized(bm, np.zeros(len(bm.verts), bool), iters=60)

    fixed = set()

    # ---- neck: open the bottom, put the rim on the neck at the first ring's height, and one more ring down at
    # the level the body joins (24 verts, same order as the body's ring)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[hole_l]], context="FACES")
    rim = walk_loop([e for e in bm.edges if e.is_boundary])
    NECK_INFO["rim"] = len(rim)
    c = neck_c(-0.08)
    ang = np.array([math.atan2(v.co.x, v.co.y - c[1]) for v in rim])
    k0 = int(np.argmin(np.abs(ang)))
    rim = rim[k0:] + rim[:k0]
    if math.atan2(rim[1].co.x, rim[1].co.y - c[1]) < 0:
        rim = [rim[0]] + rim[1:][::-1]
    def neck_ring(ring, z):
        c = neck_c(z)
        up = min(max((z - NECK_JOIN_Z) / (-0.07 - NECK_JOIN_Z), 0.0), 1.0)
        rx = NECK_R[0] * (1.0 - NECK_TAPER * up)          # the same taper as the neck's form
        for i, v in enumerate(ring):
            t = 2 * math.pi * i / len(ring)
            ry = NECK_R[1] if math.cos(t) >= 0 else float(neck_back_r(z))
            v.co = Vector((c[0] + rx * math.sin(t), c[1] + ry * math.cos(t), z))
            fixed.add(v)
    neck_ring(rim, NECK_RINGS[0])
    rimset = set(rim)
    prev = rim
    for z in NECK_RINGS[1:]:
        edges = [e for e in bm.edges if e.is_boundary]
        res = bmesh.ops.extrude_edge_only(bm, edges=edges)
        nv = set(g for g in res["geom"] if isinstance(g, bmesh.types.BMVert))
        ring = chain_rings([prev, nv], outer_order=prev)[1]
        neck_ring(ring, z)
        prev = ring
    # the neck's skin above the rim settles before the features go in
    bm.verts.index_update()
    relax_sized(bm, np.array([v in fixed for v in bm.verts]), iters=20)

    # ---- eyes: four loops each, then the opening cut and the lid's margin turned in
    eyes = []
    for side in (1, -1):
        bm.faces.ensure_lookup_table()
        fc = face_centres(bm.faces)
        cx, cz = EYE_C[0] * side, EYE_C[1]
        region = [f for f, c in zip(bm.faces, fc)
                  if c[1] > -0.06 and ((c[0] - cx) / EYE_REGION[0]) ** 2 + ((c[2] - cz) / EYE_REGION[1]) ** 2 < 1.0]
        rings, region, border = inset_rings(bm, region, 5, 0.0008)
        bmesh.ops.delete(bm, geom=region, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        mset = set(rings[5])
        edges = [e for e in bm.edges if e.is_boundary and all(v in mset for v in e.verts)]
        res = bmesh.ops.extrude_edge_only(bm, edges=edges)
        back = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
        chains = chain_rings(rings + [back], border)
        place_rings(chains, EYE_C, [
            eye_arcs(0.0125, 0.0115, 0.0100, 0.0100, None),          # orbit
            eye_arcs(0.0094, 0.0078, 0.0072, 0.0072, ("s0.3", "s0.3")),  # between orbit and crease
            eye_arcs(0.0062, 0.0042, 0.0048, 0.0045, ("s0.8", "s0.6")),  # crease: the fold line sinks in above the lid
            eye_arcs(0.0040, 0.0027, 0.0028, 0.0030, (LID_UP + 0.0012, LID_DN + 0.0002)),  # the lid's body, standing on the eyeball
            eye_arcs(0.0020, 0.0013, 0.0016, 0.0018, (LID_UP - 0.0002, LID_DN)),  # the lid's rim: its thickness shows
            eye_arcs(0.0, 0.0, 0.0, 0.0, 0.0006),                    # margin: the opening
            eye_arcs(-0.0004, -0.0003, -0.0003, -0.0004, 0.0002),    # margin turned in
        ], side)
        fixed.update(v for ch in chains[1:] for v in ch if v is not None)
        eyes.append(V(EYE[0] * side, EYE[1], EYE[2]))

    # ---- mouth: four loops, the seal opened into a small mouth bag
    bm.faces.ensure_lookup_table()
    fc = face_centres(bm.faces)
    region = [f for f, c in zip(bm.faces, fc)
              if c[1] > -0.04 and (c[0] / MOUTH_REGION[0]) ** 2 + ((c[2] - MOUTH_Z) / MOUTH_REGION[1]) ** 2 < 1.0]
    rings, region, border = inset_rings(bm, region, 6, 0.0007)
    bmesh.ops.delete(bm, geom=region, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    sset = set(rings[6])
    edges = [e for e in bm.edges if e.is_boundary and all(v in sset for v in e.verts)]
    res = bmesh.ops.extrude_edge_only(bm, edges=edges)
    bag = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    chains = chain_rings(rings + [bag], border)
    place_rings(chains, (0.0, MOUTH_Z), [mouth_arcs(k) for k in ("around", "skin", "edge", "border", "full", "curl", "seal", "bag")], 1)
    fixed.update(v for ch in chains[1:] for v in ch if v is not None)

    # ---- flow: the loops an artist lays round a face. The mask loop circles eyes, nose, mouth and chin; the muzzle
    # loop runs from beside the nose wings round the mouth corners and under the lower lip (the smile line).
    for (rx, cz, rz, front) in ((0.066, -0.024, 0.090, -0.055), (0.031, -0.054, 0.031, -0.040)):
        bm.faces.ensure_lookup_table()
        fc = face_centres(bm.faces)
        region = [f for f, c in zip(bm.faces, fc)
                  if c[1] > front and (c[0] / rx) ** 2 + ((c[2] - cz) / rz) ** 2 < 1.0]
        if region:
            inset_rings(bm, region, 1, 0.0008, boundary=False)   # not along the eye and mouth openings

    # ---- ears: nested loops on the side of the head, placed on tilted ovals: the root on the skin, the outer
    # wall standing out, the rim (helix) and the bowl (concha); the inside is the bowl's floor
    et, eb, ef, el = LM["ear_top"], LM["ear_bottom"], LM["ear_front"], LM["ear_lateral"]
    ez = (et[2] + eb[2]) / 2
    ey = (ef[1] + LM["ear_back"][1]) / 2 + 0.002 + EAR_SHIFT_Y
    hz = (et[2] - eb[2]) / 2
    lat = el[0]
    for side in (1, -1):
        bm.faces.ensure_lookup_table()
        fc = face_centres(bm.faces)
        region = [f for f, c in zip(bm.faces, fc)
                  if c[0] * side > 0.04 and ((c[1] - ey) / (0.0125 * EAR_W + (EAR_REGION_FWD if c[1] > ey else 0.0))) ** 2
                  + ((c[2] - ez) / (hz * 0.95)) ** 2 < 1.0]
        if not region:
            continue
        rings, region, border = inset_rings(bm, region, len(EAR_RINGS) - 1 + (EAR_RINGS_MORE if EAR_HMAP else 0), 0.0006)
        chains = chain_rings(rings, border)
        outer = chains[0]
        n = len(outer)
        ang = [math.atan2(v.co.z - ez, v.co.y - ey) for v in outer]
        k0 = int(np.argmin(np.abs(ang)))
        order = list(range(k0, n)) + list(range(0, k0))
        if math.atan2(outer[order[1]].co.z - ez, outer[order[1]].co.y - ey) < ang[k0]:
            order = [order[0]] + order[1:][::-1]
        def skin_x(y, z):
            lo_, hi_ = 0.02, 0.12
            for _ in range(30):
                m = (lo_ + hi_) / 2
                if field(V(m, y, z))[0] < 0:
                    lo_ = m
                else:
                    hi_ = m
            return hi_

        pos = []
        rings_ = EAR_RINGS + [EAR_RINGS[-1]] * (EAR_RINGS_MORE if EAR_HMAP else 0)
        for k_, (chain, (ry, rzs, plate, relief0, shift)) in enumerate(zip(chains, rings_)):
            cy_, cz_ = ey + shift * EAR_BOWL[0], ez + shift * EAR_BOWL[1]     # inner loops close on the bowl
            for j, i in enumerate(order):
                v = chain[i]
                if v is None:
                    continue
                th = 2 * math.pi * j / n
                dz = math.sin(th) * hz * rzs
                fr = max(math.cos(th), 0.0) ** 2
                ry_ = (ry + fr * (EAR_RY_FRONT[k_] - ry) if k_ < len(EAR_RY_FRONT) else ry) * EAR_W   # at the front the root is outermost
                dy = math.cos(th) * ry_ * (1 + 0.15 * dz / hz) - dz * (EAR_LEAN if dz > 0 else 0.20)     # egg-shaped, leaning back
                pos.append((k_, v, th, cy_ + dy, cz_ + dz))
        # the ear's box: the rim crest's extent
        cr = [(y, z) for k_, v, th, y, z in pos if k_ == 3]
        y0, y1 = min(p[0] for p in cr), max(p[0] for p in cr)
        z0, z1 = min(p[1] for p in cr), max(p[1] for p in cr)
        byc, bzc, bhw, bhh = (y0 + y1) / 2, (z0 + z1) / 2, (y1 - y0) / 2, (z1 - z0) / 2
        byc, bhw = byc + EAR_BOX_FIX[0] * bhw, bhw * EAR_BOX_FIX[1]     # the box the measuring uses (the rim's raised part)
        EAR_BOX[side] = (byc, bzc, bhw, bhh)
        if EAR_HMAP:
            # the inner loops run from the rim's inner loop (4) in to the bowl's outline: the last two are the bowl's
            # lip and the foot of its wall, so the wall is an edge loop (a crisp bowl), not smeared across faces
            cs, ct, rs, rt = EAR_CONCHA_OUT
            r4 = {j: (y, z) for (k_, v, th, y, z), j in zip(pos, range(len(pos))) if k_ == 4}
            by_th = {round(th, 6): (y, z) for k_, v, th, y, z in pos if k_ == 4}
            pos2 = []
            for k_, v, th, y, z in pos:
                if k_ >= 5 and round(th, 6) in by_th:
                    f, sc = EAR_RING_F[k_]
                    if k_ in EAR_LIP and ear_lip_w(k_, th) is None:      # where the bowl opens: no undercut, plain order
                        sc = EAR_LIP_PLAIN[EAR_LIP.index(k_)]
                    cy2 = byc + (cs + sc * rs * math.cos(th)) * bhw
                    cz2 = bzc + (ct + sc * rt * math.sin(th)) * bhh
                    oy, oz = by_th[round(th, 6)]
                    y, z = oy + f * (cy2 - oy), oz + f * (cz2 - oz)
                pos2.append((k_, v, th, y, z))
            pos = pos2
        for k_, v, th, y, z in pos:
            sx = skin_x(y, z)
            if EAR_HMAP:
                fr = max(math.cos(th), 0.0) ** 2
                lobe = max(-math.sin(th), 0.0) ** 2
                Hh = ear_height((y - byc) / bhw, (z - bzc) / bhh, bhw * 1000, bhh * 1000,
                                bowl=ear_lip_w(k_, th))
                if k_ >= 3:
                    x = sx + (Hh + EAR_RIM.get(k_, 0.0) * (1 - fr) * (1 - 0.8 * lobe)) / 1000
                elif k_ >= 1:
                    x = sx + (0.55 if k_ == 1 else 1.0) * max(Hh - EAR_ROLL, 0.0) / 1000 * (1 - EAR_FRONT_FLAT * fr)
                else:
                    x = sx
                if 1 <= k_ <= 8 and EAR_FRONT_CAP:   # across the front the ear stays low: the bowl opens to the cheek
                    ff = _smooth(EAR_FRONT_CAP[0], EAR_FRONT_CAP[1], math.cos(th))
                    x = x + ff * (min(x, sx + EAR_FRONT_CAP[2] / 1000 + (Hh - _plateless(y, z, byc, bzc, bhw, bhh)) / 1000) - x)
                if k_ in EAR_FRONT_RAMP:     # the front: the ear rises out of the cheek over the outer loops
                    x = x + fr * (sx + Hh * EAR_FRONT_RAMP[k_] / 1000 - x)
                v.co = Vector((side * max(x, sx - 0.004), y, z))
                fixed.add(v)
                continue
            if True:
                ry, rzs, plate, relief0, shift = rings_[k_]
                n_ = n
                # attached along the front, flaring out at the back; at the bottom the ridges soften into the lobe
                flare = (0.55 - 0.45 * math.cos(th)) * (0.85 + 0.15 * math.sin(th))
                lobe = max(-math.sin(th), 0.0) ** 2
                # the front (th 0, towards the face): no rim there; the groove and ridge drop into the bowl, which
                # opens forward to the ear hole; the tragus, a small flap, stands in front of it
                fr = max(math.cos(th), 0.0) ** 2
                relief = relief0
                if 2 <= k_ <= 4:
                    relief = relief0 * (1 - fr)
                elif k_ >= 5:
                    relief = relief0 + fr * (EAR_FRONT_BOWL - relief0) * 0.8
                ths = math.atan2(math.sin(th), math.cos(th))
                relief += EAR_TRAGUS[1].get(k_, 0.0) * EAR_TRAGUS[0] * math.exp(-((ths - EAR_TRAGUS[2]) / EAR_TRAGUS[3]) ** 2)
                out = min(max(lat - sx, 0.004) * max(flare, 0.12) * EAR_OUT, max(lat - sx, 0.004)) * (1 - EAR_LOBE_IN * lobe)
                x = sx + out * plate * (1 - EAR_FRONT_FLAT * fr * (k_ <= 4)) + relief / 1000 * (1 - 0.8 * lobe)
                floor = sx - 0.0040 if relief < -5 else sx + 0.0008      # the bowl sinks into the head
                v.co = Vector((side * max(x, floor), y, z))
                if side == 1:
                    for a_ in (0, 90, 180, 270):
                        if abs(math.degrees(th) - a_) < 180.0 / n:
                            EAR_DEBUG.setdefault(a_, {})[k_] = round((max(x, floor) - sx) * 1000, 1)
                fixed.add(v)
        # the bowl's floor: the region's own verts, gathered into the bowl
        rv = {v for f in region for v in f.verts} - set(chains[-1])
        if EAR_HMAP:      # the bowl's floor: the region's verts spread over the bowl's outline (inside the wall's foot)
            cs, ct, rs, rt = EAR_CONCHA_OUT
            sc = EAR_RING_F[max(EAR_RING_F)][1] * 0.92
            ext = max(max(math.hypot((v.co.y - ey) / (0.0125 * EAR_W), (v.co.z - ez) / (hz * 0.95)) for v in rv), 1e-6)
            for v in rv:
                u, w = (v.co.y - ey) / (0.0125 * EAR_W) / ext, (v.co.z - ez) / (hz * 0.95) / ext
                s_, t_ = cs + sc * rs * u, ct + sc * rt * w
                y, z = byc + s_ * bhw, bzc + t_ * bhh
                sx = skin_x(y, z)
                v.co = Vector((side * (sx + ear_height(s_, t_, bhw * 1000, bhh * 1000) / 1000), y, z))
                fixed.add(v)
            rv = set()
        for v in rv:
            dy, dz = (v.co.y - ey) * 0.30 * EAR_W + EAR_BOWL[0], (v.co.z - ez) * 0.32 + EAR_BOWL[1]
            sx = skin_x(ey + dy, ez + dz)
            if EAR_HMAP:
                Hh = ear_height(dy / bhw + (ey - byc) / bhw, dz / bhh + (ez - bzc) / bhh, bhw * 1000, bhh * 1000)
                v.co = Vector((side * (sx + Hh / 1000), ey + dy, ez + dz))
            else:
                v.co = Vector((side * (sx - 0.0025), ey + dy, ez + dz))
            fixed.add(v)

    # ---- nose: two loops round it for density; its shape comes from the broad form as everything relaxes
    bm.faces.ensure_lookup_table()
    fc = face_centres(bm.faces)
    region = [f for f, c in zip(bm.faces, fc) if c[1] > -0.04 and abs(c[0]) < 0.0175 and -0.042 < c[2] < NOSE_RING_TOP]
    inset_rings(bm, region, 3, 0.0015)

    # ---- nostrils: on the nose's underside, a rim inset and the inside pushed up into the nose
    _, tyn, tzn = LM["nose_tip"]
    NECK_INFO["nostrils"] = []
    for side in ((1, -1) if NOSTRILS_ON else ()):
        bm.faces.ensure_lookup_table()
        for f in bm.faces:
            f.normal_update()
        cx_, cy_, cz_ = side * NOSTRIL_AT[0], tyn + NOSTRIL_AT[1], tzn + NOSTRIL_AT[2]
        target = Vector((cx_, cy_, cz_))
        down = [f for f in bm.faces if f.normal.z < -0.25 and (f.calc_center_median() - target).length < 0.007
                and side * f.calc_center_median().x > 0.0030 and all(side * v.co.x > 0.0005 for v in f.verts)]   # clear of the columella
        region = []
        if down:
            best = min(down, key=lambda f: (f.calc_center_median() - target).length)
            c0 = best.calc_center_median()
            region = [f for f in down if abs(f.calc_center_median().x - c0.x) < NOSTRIL[0]
                      and abs(f.calc_center_median().y - c0.y) < NOSTRIL[1]]
        NECK_INFO["nostrils"].append(len(region))
        near = sorted(bm.faces, key=lambda f: (f.calc_center_median() - target).length)[:4]
        NECK_INFO.setdefault("nostril_dbg", []).append([(round((f.calc_center_median() - target).length * 1000, 1),
                                                        round(f.normal.z, 2), tuple(round(c * 1000, 1) for c in f.calc_center_median())) for f in near])
        if not region:
            continue
        rings, region, border = inset_rings(bm, region, 1, 0.0005)
        for v in {v for f in region for v in f.verts}:
            v.co = Vector((v.co.x - side * 0.0006, v.co.y - 0.0008, v.co.z + NOSTRIL_DEPTH))
            fixed.add(v)

    # ---- flow: relax everything else over the broad form
    bm.verts.index_update()
    mask = np.array([v in fixed for v in bm.verts])
    relax_sized(bm, mask, iters=25)
    # the lower face's broad planes (cheeks, jaw, under the jaw): the loft's levels and the blended primitives leave
    # 1-3 mm ripples a cm or two across that shading turns into lumps; a non-shrinking smooth irons them out
    NECK_INFO["smoothed"] = taubin(bm, fixed, iters=SMOOTH_ITERS)

    # untangle: faces turned inside-out where many loops meet in a small space (the eyes' inner corners) are
    # relaxed towards their neighbours until they face out again (a relax brush, only where needed)
    NECK_INFO["untangled"] = untangle(bm)
    # model one half, mirror it: the +x half is kept and mirrored, so both sides are the same (no one-sided folds)
    bmesh.ops.symmetrize(bm, input=bm.verts[:] + bm.edges[:] + bm.faces[:], direction=SYM_KEEP, dist=1e-5)
    rim_n = sum(1 for e in bm.edges if e.is_boundary and min(v.co.z for v in e.verts) < NECK_RINGS[-1] + 1e-4)
    NECK_INFO["after_mirror"] = rim_n
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return eyes, EYE_R
