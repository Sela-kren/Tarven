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
# the face follows Luna alone (user, 2026-11-17: the refs' faces are too different to average); head_table.json is
# the 7-ref median, kept for comparison (HEROINE_HEAD_TABLE=.../head_table.json)
TABLE_PATH = os.environ.get("HEROINE_HEAD_TABLE") or os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                                  "head_table_luna.json")
TABLE = head_form.load_table(TABLE_PATH)
YS = 0.003                   # y of the midline front at the eye line
LM = head_form.landmarks(TABLE, YS)
EYE_FWD = 0.0010               # sphere fits to the refs' eyeballs (eyeball.py): r 15.3, front ~0.7 mm ahead of ours
LOWER_CORNEA = 0.2
CORNEA = (0.0, 0.0085)         # the cornea's bulge in front of the sphere, radius: Luna's eye is a plain sphere (eyetrue, 2026-11-17)
EYE = V(*LM["eyeball_centre"]) + V(0.0, EYE_FWD, 0.0)  # left eye; the right is mirrored
EYE_R = LM["eyeball_radius"] - 0.00045   # Luna's eyeball mesh: r 22.1 (the table's 22.6 sat ~0.5 mm proud)
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
BROW_K, SOCKET_K = 0.014, 0.016   # brow blend was 0.010 (and the ridge 1 mm further forward): its top read as a crest line across the forehead (Luna: one broad curve)
SYM_KEEP = 'X'                          # which half bmesh.ops.symmetrize keeps
# the ear's loops, outside in: (half depth, share of half height, share of the stand-out, relief mm, shift to bowl). The relief across
# them is the ear: outer wall, the rim (helix) curling over, the groove inside it (scapha), the inner ridge
# (antihelix), and the bowl (concha) going down to the skin
EAR_RINGS = [(0.0055, 0.80, 0.00, 0.0, 0.00),   # root, on the skin: well inside the rim at the back (the flap overhangs)
             (0.0092, 0.97, 0.55, 0.0, 0.00),   # outer wall: the flap's back face, sloping out to the rim
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
EAR_RY_FRONT = [0.0124, 0.0122, 0.0120, 0.0115, 0.0110]   # the outer loops' front radius: nested, root outermost
EAR_W = 1.20                         # loop widths (y) x this: the refs' ears are ~35 mm wide in side view
EAR_SHIFT_Y = -0.0004               # Luna's ear: front -39.8, back -69.8 mm (eye-centred)
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
EAR_PLATE = (6.9, -8.5, -7.3, 2.4, 5.5)  # H = a + b s + c t + d s^2 + e t^2 (Luna: low at the front and top, out at the back and lobe; held to her back-view outline)
EAR_CONCHA = ((0.62, -0.14, 0.34, 0.26, -2.8),  # bowl parts: centre s, t, radii s, t, floor height mm (lower: the cavum,
              (0.52, 0.22, 0.28, 0.12, -1.5))   # upper: the cymba); the skin the ear is measured from sits ~3 mm under ours
EAR_CONCHA_OUT = (0.37, -0.03, 0.50, 0.36)   # the bowl's outline (s, t centre; radii): the inner loops close onto it
EAR_CONCHA_SHEAR = 0.20                     # the bowl leans: its top (the cymba) further forward than its bottom (the cavum)
EAR_BOWL_CLAMP = 0.85                       # the bowl's outline reaches at most this share of the way out to the rim's inner loop
EAR_BOWL_ROOT = 0.90                        # ...and at most this share of the way out to the root (the floor never reaches over the flap's back)
EAR_LOBE_FWD = (-0.0025, -1.05, 0.45)       # the lobe's front reaches forward to its attachment on the cheek (same form as the notch)
EAR_FRONT_NOTCH = (0.0025, 0.20, 0.30)       # the front edge dips in between the crus and the tragus: m, centre angle, half width (rad)
EAR_UNDERCUT = (1.75, 0.9, 0.96, 1.12)      # the cave under the crus: centre angle, half width (rad), lip and foot outline scales
EAR_ROOT_FRONT_Z = 0.86                     # the root's height share across the front (0.80 behind: the top and back overhang)
EAR_RING_F = {5: (0.18, 1.14), 6: (0.37, 1.14), 7: (0.56, 1.14), 8: (0.75, 1.12), 9: (1.0, 1.0), 10: (1.0, 0.72)}
EAR_LIP = ()                          # the bowl's lip loop and the loop tucked under it (the wall's foot): an undercut
EAR_LIP_OPEN = (0.35, 0.75) 
EAR_LIP_PLAIN = (1.06, 0.90)               # the two loops' outline scales where the lip is open (lip outside, foot inside)
EAR_FRONT_CAP = (0.45, 0.85, 1.5)          # cos(angle) ramp, and the front's height cap (mm over the skin; plus the tragus)
               # ...but not across the bowl's front (cos of the angle round the bowl)   # per loop: share of the way from loop 4, outline scale
EAR_CONCHA_WALL = (0.88, 1.03)
EAR_CONCHA_DIP = (1.5, 0.25, -0.15, 0.32)   # the bowl deepens towards the ear hole: mm, centre s, t, radius (box units)              # the bowl's wall: from this share of its radii (floor) to this (rim)
EAR_CRUS = ([(0.45, 0.95), (0.78, 0.78), (0.80, 0.50), (0.60, 0.42)], 3.0, 2.2)   # the rim's front limb, down the
# front edge: path, height mm, half width mm
EAR_CRUS_IN = ((0.66, 0.38), (0.0, 0.10), 8.0, 0.8, 1.8)   # its root running into the bowl: from, to, height at the
# front, share left at the tip, half width mm
EAR_TRAGUS2 = ((0.86, -0.17), (1.7, 5.0), 6.0)     # centre, radii mm (y, z), height mm
EAR_ANTITRAGUS = ((0.14, -0.33), (3.0, 2.5), 3.5)
EAR_ANTIHELIX = ([(-0.20, -0.55), (-0.38, -0.10), (-0.30, 0.30)],   # stem, then the upper and lower branches
                 [(-0.30, 0.30), (-0.36, 0.55), (-0.26, 0.72)],
                 [(-0.30, 0.30), (0.05, 0.42), (0.40, 0.45)], 3.5, 3.2)
EAR_FOSSA = ((0.07, 0.79), (4.0, 3.0), -5.0)
EAR_CRUS_INF = ([(-0.46, 0.55), (0.0, 0.47), (0.28, 0.44)], 5.0, 3.0)   # the antihelix's lower branch stands higher (the cymba's roof)
EAR_LOBE = ((0.15, -0.85), (7.0, 4.0), -0.5)    # the lobe: a fleshy pad hanging out from the head
EAR_RIM = {3: 3.0, 4: 1.0, 5: -1.0}       # the rolled rim (helix) over the plate: crest, lip, the groove inside it
EAR_SCAPHA = (-12.0, 2.3, 0.35)              # the groove inside the rim (loop 5), deepest round the upper back: mm, centre angle, half width (rad)
EAR_RIM_UP = (1.0, 2.3, 0.8)               # the rim stands taller round the upper back: mm, centre angle, half width (rad)
EAR_FLAP_MIN = 1.5                         # the face over the free flap stays this far (mm) out from the skin (clear of its back)
EAR_ROLL = 1.5                             # the rim's outer side sits this far (mm) below the crest
EAR_BOX = {}
EAR_REGION_FWD = 0.002                    # the ear's patch reaches this much further forward (room for the front ramp)
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


def ear_undercut_w(th):
    """How much of the bowl's undercut (the cave under the crus) the lip/foot loops take at angle th."""
    da = math.atan2(math.sin(th - EAR_UNDERCUT[0]), math.cos(th - EAR_UNDERCUT[0]))
    return _smooth(0.0, 1.0, max(1 - (da / EAR_UNDERCUT[1]) ** 2, 0.0))


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
    H += bump(*EAR_LOBE)
    H += ridge(*EAR_CRUS_INF)
    cs, ct, rs, rt = EAR_CONCHA_OUT                  # the bowl: the plate sinks to the bowl's floor
    r = math.hypot((s - cs - EAR_CONCHA_SHEAR * (t - ct)) / rs, (t - ct) / rt)
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
# the nose's lower part, set from Luna's plane sections (ref/_head_work/w_nose/nsec.py, 2026-11-17): a broad round
# tip (plan radius ~6-9 mm), wings reaching 13.5 mm out and well forward, the nostrils under them
NOSE_TIP = (0.0080, 0.0068, 0.0065)    # half sizes: the tip's bulb (x, y, z)
NOSE_TIP_AT = (-0.0085, 0.0)           # its centre from the nose_tip mark (y, z)
NOSE_TIP_K = 0.006
NOSE_WING = (0.0042, 0.0075, 0.0045)   # each wing: half sizes across, along (pointing forward-in), up-down
WING_AT = (-0.0047, 0.0062, 0.0010)    # its centre from the nose_wing mark (the alar crease)
WING_TURN = 25.0                       # degrees: the wing's long axis turned in towards the tip
WING_K = 0.003                         # fairly crisp: the groove round the wing shows
NOSTRIL = (0.0032, 0.0055)              # nostril half width and length (on the underside)
NOSTRIL_AT = (0.0047, -0.0112, -0.0055)  # its centre from the nose tip (x out, y back, z down)
NOSTRIL_DEPTH = 0.0030
NOSTRIL_SHAPE = (0.0038, 0.0060, 22.0, 0.88)   # the opening's oval: half width, half length, turned in at the front (deg), the inside's scale
NOSTRIL_DENTS = False
NOSTRIL_WALL = (0.95, 0.0015)    # the loop just inside the rim: its oval's scale, how far up
NOSTRIL_FACES = 2                # the patch cut for each opening: the nearest face and its nearest neighbour (a 6-vert loop
                                 # whatever the faces there; 4 tangled it, nN9; cutting the face into a grid broke the build, nN11)
NOSE_SIDE = None   # ((x, y from the tip, z from the tip), radii, blend): a fill on the side wall above the wing; tried ((0.0085, -0.0243, 0.0100), (0.0045, 0.005, 0.009), 0.008): +1.4 mm too much at x 8-10 and a lump in 3q (nN14)
BOW = (0.0017, 0.0010, 0.0055)   # the cupid's bow: peaks' rise, the middle's dip, the peaks' x
PHILTRUM_FILL = (0.0022, -0.0490, (0.0130, 0.0040, 0.0035), 0.004)   # Luna: the skin under the nose runs forward to the lip (y, z centre; radii; blend)
PHILTRUM_GROOVE = ((0.0, 0.0072, -0.0500), (0.0025, 0.0015, 0.0040), 0.0015)   # the shallow groove between the columns (centre, radii, blend)
MENTO_FOLD = (-0.0750, -0.0012, (0.011, 0.0030, 0.0035), 0.003)   # the fold under the lower lip: z centre, its back's y over the mentolabial mark, radii, blend
PHILTRUM_COLS = ((0.0026, 0.0040), (0.0020, 0.0022), 0.003)   # x at the top and at the bow; radii top, bottom; blend
PHIL_COL_Y = (0.0018, 0.0016)   # the columns' axis behind the subnasale / upper-lip marks (was 3.0, 2.2 mm: under Luna's fuller lip skin they vanished)
NOSE_LIFT = 0.0033                      # the nose's underside (columella, tip) raised: the refs' drops off ~3 mm higher
NASION_DIP = None   # Luna: no dip, the bridge runs straight from the brow; was (0.0045, -0.005, (0.010, 0.0045, 0.009), 0.006)   # centre y, z from the nasion mark; radii; blend
NOSTRILS_ON = True      # off until the nose's underside is dense enough for a clean hole (faces there are ~5 mm)
LID_UP, LID_DN = 0.0030, 0.0008    # lid thickness over the eyeball (upper, lower)   # blends of the brow ridge and the inner socket
SCM = ((-0.046, 110.0), (-0.088, 66.0), 0.0100, 0.0060, 0.010)   # was None; tried ((-0.050, 115.0), (-0.118, 28.0), 0.0060, 0.0025, 0.010): no visible change, widened the neck's sides   # top (z, angle round the neck from the front), foot, radius, stand-out, blend
THROAT = None   # tried an ellipsoid under the chin: it read as a lump; the neck's front leans instead (NECK_THROAT_FWD)
NECK_THROAT_FWD = 0.0            # the throat comes forward towards the chin (the refs' recedes ~13 mm over 1.495-1.46)
NECK_FRONT_TAPER = 0.0           # the front half's extra narrowing at the top (sections at 1.475-1.495, 45-90 deg)
NECK_TAPER = 0.10              # the neck's width under the head, less than at the shoulders' ring
NECK_FILLET = (0.005, 0.010)  # the neck's blend into the head: soft at the throat (under the chin), tight at the nape
OUTER_SOCKET = (0.0020, (0.0235, -0.0065), 0.0070, 0.003)   # depth along the skin normal, (x, z) from the eye centre, ball radius, blend
OUTER_SOCKET2 = None   # tried (0.0006-0.0016, (0.0195, -0.0075..-0.008), 0.005, 0.003): a dent under the outer corner; the lower lid's sink does it
INNER_SOCKET = (0.0009, (-0.0140, 0.0000), 0.0060, 0.004)   # the same, over the inner corner beside the bridge
OUTER_FOLD = (0.0004, (0.0210, 0.0055), 0.0060, 0.004)   # amount out along the skin normal, (x, z) from the eye centre, ball radius, blend
UNDER_EYE = (-0.0016, (-0.001, -0.017, 0.0187), (0.016, 0.008, 0.007), 0.008, -12)   # amount, (x, z, skin y) from the eye centre, radii, blend
# the orbit as a whole vs Luna (ref/_head_work w_sock sockmap/sockcmp, front depth on a 0.5 mm grid, 2026-11-17):
# (amount mm, + out / - in along the skin normal; (x, z) mm from the eyes' midpoint; radii mm (across, along the
# normal, up)); applied as a soft displacement of the finished field (Displaced)
SOCKET_SCULPT = [
    (+1.0, (26.0, 31.0), (34.0, 10.0, 14.0)),    # the forehead over the brows: Luna's runs on full into the brow
    (+0.6, (38.0, 23.0), (12.0, 8.0, 7.0)),      # the brow's outer half
    (+0.4, (50.0, 30.0), (9.0, 8.0, 11.0)),      # the brow's tail, by the temple
    (+1.0, (0.0, 10.0), (10.0, 8.0, 9.0)),       # between the brows, over the bridge (glabella)
    (+0.8, (8.0, 18.0), (8.0, 8.0, 16.0)),       # the inner brow over the inner corner
    (-1.4, (28.0, 10.0), (14.0, 8.0, 6.0)),      # the hollow under the brow
    (-1.0, (24.0, 6.5), (5.0, 8.0, 4.0)),        # ...deepest over the lid's inner half
    (-0.6, (38.0, 12.0), (8.0, 8.0, 4.0)),       # ...and under the brow's outer half
    (+0.5, (24.0, 16.5), (8.0, 8.0, 5.0)),       # the brow's lower edge over the inner half
    (+0.6, (31.0, -30.0), (14.0, 10.0, 10.0)),   # the top of the cheek under the eye
    (-1.8, (47.0, 14.0), (9.0, 8.0, 7.0)),       # the outer orbit under the brow's tail
    (-1.2, (12.0, -11.0), (5.0, 8.0, 8.0)),      # the socket's inner wall beside the bridge
    (-1.0, (48.5, -1.5), (3.5, 6.0, 4.0)),       # just outside the outer corner
    (-1.6, (53.5, 13.0), (5.0, 8.0, 9.0)),       # the orbit's outer rim under the brow's tail: Luna's face turns to the side further out
    (-0.8, (52.0, 24.0), (4.0, 8.0, 12.0)),      # ...the same corner up past the brow's tail (its turn is broader, ~3 mm further out)
    (+0.7, (47.0, 30.0), (6.0, 8.0, 8.0)),       # the forehead just inside that corner
    (+1.2, (53.5, -4.0), (4.5, 8.0, 6.0)),       # ...and the rim beside the outer corner is fuller
    (+1.2, (50.0, 35.0), (8.0, 8.0, 7.0)),       # the forehead's outer corner, over the brow's tail
    (+1.8, (13.0, -30.0), (12.0, 10.0, 14.0)),   # the top of the cheek beside the nose (broad: the lower face's smoothing irons out small bumps)
    (+1.0, (32.0, -36.0), (32.0, 10.0, 15.0)),   # the top of the cheek, all along under the orbit
    (+1.9, (51.0, -27.0), (13.0, 10.0, 16.0)),   # the top of the cheek under the outer orbit, towards the temple
]
INNER_BROW = (0.012, 0.0025, 0.0185)   # centre (head-local) of the fill above the inner eye corner
BRIDGE_R = (0.0062, 0.0075)   # the bridge cone's radii at the top and the tip (its front line stays): Luna's nose sides are fuller above the wings
BRIDGE_UP = (0.0090, 0.0055)  # the bridge cone forward at its top and at the tip: Luna's dorsum runs straight from the brow (midline, 2026-11-17)
# Luna's lower face (side half widths vs Luna, ref/_head_work sidegrid.py, 2026-11-17): (amount m, surface point (x, y, z)
# head-local m, radii, blend). Her cheek is one smooth slope from the cheekbone to a soft jaw; ours had a hollow
# mid-cheek and another above the jawline (the ridge between them read as a lump), and a jaw
# underside 5-9 mm wider than hers
FACE_SCULPT = [
    (+0.0013, (0.0572, -0.0587, -0.0389), (0.010, 0.013, 0.011), 0.008),   # mid-cheek hollow
    # (+0.0012, (0.0389, -0.0537, -0.0719), (0.009, 0.014, 0.008), 0.008),   # above the jawline: now JAW_BAR (it stood as a ridge over a groove)
    (+0.0005, (0.0440, -0.0457, -0.0689), (0.006, 0.012, 0.005), 0.005),   # the loft's crease at its level 3 (eye z -74, y -20..-15): a faint line across the lower cheek
    # (-0.0050, (0.0176, -0.0537, -0.0899), (0.012, 0.014, 0.008), 0.006),   # the jaw's underside: now SUBMENTAL's V floor (it notched the jaw's side 4-6 mm at z -90)
]
JAW_BAR = ([(33.5, -40, -61.5), (32.6, -35, -65.3), (32.5, -25, -71.0), (27.0, -15, -77.0), (16.8, -5, -84.3)], [7.0, 8.5, 10.0, 10.0, 10.0], 0.006)    # ([(x, y, z) eye-centred mm of the bar's axis], radius mm (or one per point), blend m)
CHIN_PAD = (-0.0010, (0.0, -94.0), (11.0, 5.0, 8.0), 0.004)    # (the ellipsoid's front over the skin m - its blend adds ~1 mm more, (x, z) eye-centred mm, radii (x, y, z) mm, blend m)
CHIN_SIDE = [(0.002, (26.0, -88.0), 10.0, 0.006)]    # [(depth m, (x, z) eye-centred mm, ball radius mm, blend m)]
NOSE_RING_TOP = -0.012         # the nose loops stop below the inner eye corners (they tore the bridge)
UNDER_EDGE = 0.004            # the jaw's lower edge at the angle sits this far under the gonion mark
JAWLINE_ON = True
JAW_DBG = {}
JAWLINE = [(-12.5, -95.0), (-41.0, -84.5), (-57.0, -78.0), (-69.0, -70.0), (-73.5, -63.5), (-77.0, -54.5), (-81.0, -43.0)]   # (y, z) mm
JAW_STEP, JAW_BAND, JAW_K = 0.003, (0.010, 0.012), 0.008
JAW_RAMUS_STEP = 0.0025                    # behind the ramus: a shallower step (the refs' sections there are full)
JAW_XIN = 0.62                             # ...outside this share of the jaw's half width in plan
JAW_RAMUS_FROM = 3                         # the line's segments from this one on are the ramus (a band, not the body's slope)
# the user's line kept, its treatment softened (2026-11-17): the old JAW_STEP carve (a 3 mm step in below the line, smooth-
# subtracted with JAW_K) left a dark groove along the line and the jaw's edge jutting below it. JAW_SOFT instead pushes the
# skin in by a depth that grows smoothly from the line (a displacement, no blend): None = the old step
JAW_SOFT = (0.004, 1.0, 0.003)             # (corner width m, depth per m below the line, max depth m)
JAW_CHIN_FADE = (-0.006, 0.014)            # the soft turn fades out towards the chin: zero ahead of J[0] + a, full w behind that
JAW_XIN_SOFT = 0.008                       # JAW_SOFT: the turn fades in over this width outside x_in (no wall where it starts)
JAW_SLOPE = 1.6                            # under the body: the step deepens this much per metre below the line   # the step in under the line (m); full to 12 mm out, gone by 24; blend
THROAT_LEAN = (0.005, (-119.0, -108.0, -104.0, -97.0), 24.0)   # (push out m, (z from, full at, full to, gone by) eye mm, half width mm)
NECK_REBLEND = 0.005          # the neck re-added over the jaw carves: the refs' neck flares into the head under the ear
UNDER_CUT = True              # the under-jaw carve (test: the loft alone under the jaw)
# the floor under the chin (submentum), eye-centred mm: Luna's (under map, 2026-11-17) sits at z -104.3 under the
# menton and rises ~0.25 mm per mm back to -96.5 at y -20 before the throat; ours was the loft's flat cap (-104 .. -105.8
# all the way back) with a 5 mm keel down the middle: a V chin from the front. The floor: (z under the menton, y of the
# menton, rise per mm back, rise length mm, front curl (mm per mm^2 ahead of the menton), half width mm, blend m)
SUBMENTAL = (-104.4, 15.0, 0.25, 31.0, 0.075, 50.0, 0.004)
SUBMENTAL_THROAT = (-24.0, 0.3, 16.0)   # (and the half width mm it fades over) behind this y (eye mm) the floor curls down into the throat (mm per mm^2): Luna's corner is round
SUBMENTAL_X = (0.008, 0.018, (-10.0, -25.0), 36.0, 0.2)   # across: rise mm per mm^2 out from the midline under the chin, at the throat, (between these y), x mm where it stops, fall-away mm per mm^2 beyond


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



def _skin_point(node, x, z, grad=False):
    """The front skin point of a field node at (x, z) (scanned in along y), and its outward normal (and the
    field's gradient length there: the blended field is not a true distance)."""
    ev = lambda P: node.eval(P, P.min(0) - 0.01, P.max(0) + 0.01)
    lo, hi = -0.12, 0.08
    for _ in range(40):
        m = (lo + hi) / 2
        if ev(np.array([[x, m, z]]))[0] < 0:
            lo = m
        else:
            hi = m
    p = np.array([x, (lo + hi) / 2, z])
    h = 1e-4
    g = np.array([(ev(np.array([p + e]))[0] - ev(np.array([p - e]))[0]) / (2 * h) for e in np.eye(3) * h])
    return (p, g / np.linalg.norm(g), np.linalg.norm(g)) if grad else (p, g / np.linalg.norm(g))


class Displaced:
    """A field with the skin pushed out (+) or in (-) along its normal in soft patches, like a sculpt brush: each
    patch (amount mm, (x, z) mm from the eyes' midpoint, radii mm (across, along the normal, up)) subtracts
    amount * w from the distance, w a compact smooth bump round the skin point (1 there, 0 at the radii)."""

    def __init__(self, node, patches):
        self.node = node
        self.patches = []
        for amt, (sx, sz), rr in patches:
            p, n, gl = _skin_point(node, sx / 1000, EYE[2] + sz / 1000, grad=True)
            amt = amt * gl                   # so the skin moves by amt where the field is steeper than a distance
            t1 = np.cross(n, np.array([0.0, 0.0, 1.0]))
            t1 = t1 / max(np.linalg.norm(t1), 1e-9)
            t2 = np.cross(t1, n)
            self.patches.append((amt / 1000, p, np.stack([t1, n, t2], 1), np.array(rr) / 1000))

    def bounds(self):
        return self.node.bounds()

    def eval(self, P, lo, hi, far=1.0):
        d = self.node.eval(P, lo, hi, far)
        Pm = np.atleast_2d(P).copy()
        Pm[:, 0] = np.abs(Pm[:, 0])          # both sides
        for amt, p, R, rr in self.patches:
            q = (((Pm - p) @ R) / rr) ** 2
            q = q.sum(1)
            w = np.clip(1.0 - q, 0.0, 1.0) ** 2
            d = d - amt * w
        return d


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
    if SUBMENTAL:
        # the floor under the chin: carved up to a surface rising back from the menton to the throat (and curling up
        # ahead of it into the chin's front), outside the neck
        fz0, fy0, fs, fl, fc, fw, fk = SUBMENTAL
        def submental(P):
            ye = P[:, 1] * 1000 + 28.69                       # eye-centred mm
            sp = lambda u: 3.0 * np.logaddexp(0.0, u / 3.0)   # soft ramp (3 mm corners)
            fl_ = fz0 + fs * (sp(fy0 - ye) - sp(fy0 - fl - ye)) + fc * np.maximum(ye - fy0, 0.0) ** 2
            xe = np.abs(P[:, 0]) * 1000
            thr = np.clip(1.0 - (xe / SUBMENTAL_THROAT[2]) ** 2, 0.0, 1.0)       # the throat is narrow: the curl only near the midline
            fl_ = fl_ - SUBMENTAL_THROAT[1] * thr * np.maximum(SUBMENTAL_THROAT[0] - ye, 0.0) ** 2
            if SUBMENTAL_X:      # across: the floor rises out to the jaw's edge, then falls away; Luna's rises
                # ~0.008 mm per mm^2 under the chin and twice that towards the throat (a V between the jaw's sides)
                c0, c1, (yb0, yb1), xend, fall = SUBMENTAL_X
                cy = c0 + (c1 - c0) * np.clip((yb0 - ye) / (yb0 - yb1), 0.0, 1.0)
                fl_ = fl_ + cy * xe ** 2 - fall * np.maximum(xe - xend, 0.0) ** 2
            floor = (fl_ + 6.06) / 1000                       # head-local m
            return np.maximum.reduce([P[:, 2] - floor, 0.002 - nf(P), np.abs(P[:, 0]) - fw / 1000])
        head.cut((submental, (V(-0.04, -0.07, -0.13), V(0.04, 0.0, -0.08))), fk)
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
            wr = np.clip(seg - JAW_RAMUS_FROM, 0.0, 1.0)                         # 0 body .. 1 ramus
            body = JAW_STEP + JAW_SLOPE * np.maximum(sd, 0.0)
            band = JAW_RAMUS_STEP * np.clip(1.0 - (sd - JAW_BAND[0]) / JAW_BAND[1], 0.0, 1.0)
            depth = body * (1 - wr) + band * wr
            # the jaw's lower edge in plan (from beside the chin to the angle): carve only its outer part (the floor
            # under the chin, nearer the midline, keeps its own V)
            t_ = np.clip((P[:, 1] - A2j[1]) / (B2j[1] - A2j[1]), 0.0, 1.0)
            x_in = JAW_XIN * (A2j[0] + t_ * (B2j[0] - A2j[0]))
            return np.maximum.reduce([-sd, -(ff(P) + depth), 0.002 - nf(P), x_in - np.abs(P[:, 0]),
                                      P[:, 2] - (J[-1][1] - 0.002), P[:, 1] - (J[0][0] + 0.004)])
        def jaw_soft(P):
            # the same line, as a soft turn (2026-11-17): below/behind it the skin is pushed in by a depth that grows
            # smoothly from zero at the line (a rounded corner, no step, no blend groove along the line)
            q = P[:, 1:3]
            best = np.full(len(P), 1e9); sgn = np.ones(len(P)); seg = np.zeros(len(P))
            for si, (a_, b_) in enumerate(zip(J[:-1], J[1:])):
                d_ = b_ - a_
                u = np.clip(((q - a_) @ d_) / (d_ @ d_), 0.0, 1.0)
                c_ = a_ + u[:, None] * d_
                dist = np.linalg.norm(q - c_, axis=1)
                cr = d_[0] * (q[:, 1] - a_[1]) - d_[1] * (q[:, 0] - a_[0])
                m = dist < best
                best = np.where(m, dist, best); sgn = np.where(m, np.sign(cr), sgn); seg = np.where(m, si + u, seg)
            sd = best * sgn
            w_, slope_, dmax_ = JAW_SOFT
            depth = slope_ * w_ * np.logaddexp(0.0, sd / w_)          # soft max(sd, 0) * slope: slope*w*ln2 in at the line
            wc_ = 0.3 * dmax_
            depth = -wc_ * np.logaddexp(-depth / wc_, -dmax_ / wc_)     # soft min(depth, dmax)
            # the ramus (the line's upper segments): fades out (the refs' are full behind the ramus)
            wr = np.clip(seg - JAW_RAMUS_FROM, 0.0, 1.0)
            wr = wr * wr * (3 - 2 * wr)
            depth = depth * (1.0 - wr)
            # only the jaw's outer side (the floor under the chin keeps its own shape), faded in from x_in
            t_ = np.clip((P[:, 1] - A2j[1]) / (B2j[1] - A2j[1]), 0.0, 1.0)
            x_in = JAW_XIN * (A2j[0] + t_ * (B2j[0] - A2j[0]))
            u_ = np.clip((np.abs(P[:, 0]) - x_in) / JAW_XIN_SOFT, 0.0, 1.0)
            depth = depth * u_ * u_ * (3 - 2 * u_)
            # not the neck (it is re-added after anyway), not ahead of the chin
            n_ = np.clip((nf(P) - 0.002) / 0.006, 0.0, 1.0)
            f_ = np.clip(((J[0][0] + JAW_CHIN_FADE[0]) - P[:, 1]) / JAW_CHIN_FADE[1], 0.0, 1.0)
            f_ = f_ * f_ * (3 - 2 * f_)
            return depth * n_ * f_
        JAW_DBG.update(step=jaw_step, nf=nf, ff=ff, J=J)
        if JAW_SOFT:
            head.offset((jaw_soft, (V(-0.09, J[-1][0] - 0.04, J[0][1] - 0.03), V(0.09, J[0][0] + 0.01, J[-1][1] + 0.005))))
        else:
            head.cut((jaw_step, (V(-0.09, J[-1][0] - 0.04, J[0][1] - 0.03), V(0.09, J[0][0] + 0.01, J[-1][1] + 0.005))), JAW_K)
    if THROAT_LEAN:
        # the throat's top leans forward into the jaw's underside (Luna's neck front is 3-5 mm ahead of ours at z
        # -104..-112 at the midline): the skin there pushed out, nothing at the body's ring (eye-centred mm)
        tl_amt, (tl_z0, tl_z1, tl_z2, tl_z3), tl_hw = THROAT_LEAN
        def throat_lean(P):
            ze = P[:, 2] * 1000 - 6.06
            def ss(t):
                t = np.clip(t, 0.0, 1.0); return t * t * (3 - 2 * t)
            wz = ss((ze - tl_z0) / (tl_z1 - tl_z0)) * (1.0 - ss((ze - tl_z2) / (tl_z3 - tl_z2)))
            cy = NECK_Y + (P[:, 2] + 0.06) * NECK_LEAN
            wf = np.clip((P[:, 1] - cy) / NECK_R[1], 0.0, 1.0) ** 2
            wx = np.exp(-(P[:, 0] * 1000 / tl_hw) ** 2)
            wn = np.clip(1.0 - np.abs(nf(P)) / 0.008, 0.0, 1.0)      # only the neck's own skin (not the chin ahead of it)
            return -tl_amt * wz * wf * wx * wn
        head.offset((throat_lean, (V(-0.06, -0.12, (tl_z0 + 6.06) / 1000), V(0.06, 0.0, (tl_z3 + 6.06) / 1000))))
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
    head.add(ellipsoid(V(bx - 0.001, by - 0.0125, bz - 0.005), (0.019, 0.009, 0.0095), rot((0, 0, 1), -30)), BROW_K)   # turned to follow the face round
    # where the brow meets the bridge, above the inner eye corner: the refs are 2-3.5 mm fuller (front heatmap t141)
    head.add(ellipsoid(V(INNER_BROW[0], INNER_BROW[1], INNER_BROW[2]), (0.0080, 0.0055, 0.0070)), 0.007)
    # the inner corner of the socket, beside the nose bridge: a soft hollow (the loft can't hold a dip this narrow)
    ix, iy, iz = LM["eye_inner"]
    head.cut(ellipsoid(V(ix - 0.001, iy + 0.0115, iz - 0.003), (0.0065, 0.005, 0.0055)), SOCKET_K)
    if OUTER_SOCKET:
        # beside the outer corner Luna's face falls back towards the temple (eyetrue sections: a hollow ~2.4 mm deeper
        # than ours at x 21-25, z -5..-8 from the eye centre): a ball pressed in along the skin's normal there
        amt, (ox, oz), R, kk = OUTER_SOCKET
        p, n = _skin_point(head, EYE[0] + ox, EYE[2] + oz)
        head.cut(ellipsoid(V(*(p + n * (R - amt))), (R, R, R)), kk)
        if OUTER_SOCKET2:
            amt, (ox, oz), R, kk = OUTER_SOCKET2      # ...and in under the lower lid's outer end
            p, n = _skin_point(head, EYE[0] + ox, EYE[2] + oz)
            head.cut(ellipsoid(V(*(p + n * (R - amt))), (R, R, R)), kk)
    if INNER_SOCKET:
        # over the inner corner, beside the bridge, Luna's socket is deeper (1-2 mm at x -16..-12, z -4..+2)
        amt, (ox, oz), R, kk = INNER_SOCKET
        p, n = _skin_point(head, EYE[0] + ox, EYE[2] + oz)
        head.cut(ellipsoid(V(*(p + n * (R - amt))), (R, R, R)), kk)
    if OUTER_FOLD:
        # over the outer corner, under the brow's tail, Luna's upper lid fold is fuller (1-2 mm, x 15-25, z 2-8)
        amt, (ox, oz), R, kk = OUTER_FOLD
        p, n = _skin_point(head, EYE[0] + ox, EYE[2] + oz)
        head.add(ellipsoid(V(*(p + n * (amt - R))), (R, R, R)), kk)
    if UNDER_EYE:
        # under the eye: Luna's lower lid runs flat down into the cheek, ~1 mm fuller than our socket (eyetrue sections)
        amt, (ux, uz, uy), rr, kk, ang = UNDER_EYE      # turned (deg about z) to follow the face round
        head.add(ellipsoid(V(EYE[0] + ux, EYE[1] + uy + amt - rr[1], EYE[2] + uz), rr, rot((0, 0, 1), ang)), kk)
    _, ty, tz = LM["nose_tip"]
    _, ny, nz = LM["nasion"]
    head.add(cone(V(0, ny - 0.0140 + BRIDGE_UP[0] + 0.0062 - BRIDGE_R[0], nz - 0.014),
                  V(0, ty - 0.0105 + BRIDGE_UP[1] + 0.0057 - BRIDGE_R[1], tz + 0.0010), BRIDGE_R[0], BRIDGE_R[1]), 0.013)   # bridge: broad side planes into the cheeks
    # the nose, sized to the refs' nose: a rounded tip, the wings (alae) out at the measured nose width, the
    # columella between the nostrils, and the nostrils carved in from below
    head.add(ellipsoid(V(0, ty + NOSE_TIP_AT[0], tz + NOSE_TIP_AT[1]), NOSE_TIP), NOSE_TIP_K)
    if NASION_DIP:      # the dip at the top of the bridge, between the eyes (the refs sit ~1.5 mm in from the brow-chin line)
        _, ny_, nz_ = LM["nasion"]
        head.cut(ellipsoid(V(0, ny_ + NASION_DIP[0], nz_ + NASION_DIP[1]), NASION_DIP[2]), NASION_DIP[3])
    wx, wy, wz = LM["nose_wing"]
    # the wing (ala): a long ellipsoid turned to point forward-in at the tip, its back edge on the alar crease
    # (the nose_wing mark); Luna's wing reaches 13.5 mm out and 44 mm forward at x 9 (plane sections, 2026-11-17)
    head.add(ellipsoid(V(wx + WING_AT[0], wy + WING_AT[1], wz + WING_AT[2]), NOSE_WING, rot((0, 0, 1), WING_TURN)), WING_K)
    if NOSE_SIDE:       # the nose's side wall above the wing, where it meets the cheek: Luna's is fuller there
        (sx_, sy_, sz_), sr_, sk_ = NOSE_SIDE
        head.add(ellipsoid(V(sx_, ty + sy_, tz + sz_), sr_), sk_)
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
            a_ = V(sx_ * px_[0], sy_ - PHIL_COL_Y[0], sz_ - 0.0015); b_ = V(sx_ * px_[1], uy_ - PHIL_COL_Y[1], uz_ + 0.0012)
            head.add(cone(a_, b_, pr_[0], pr_[1]), pk_)
    else:
        head.add(ellipsoid(V(0, (sy_ + uy_) / 2 - 0.0035, (sz_ + uz_) / 2 + 0.001), (0.0055, 0.0035, 0.0055)), 0.006)
    if PHILTRUM_FILL:
        fy_, fz_, fr_, fk_ = PHILTRUM_FILL
        head.add(ellipsoid(V(0, fy_, fz_), fr_), fk_)
    if PHILTRUM_GROOVE:
        head.cut(ellipsoid(V(*PHILTRUM_GROOVE[0]), PHILTRUM_GROOVE[1]), PHILTRUM_GROOVE[2])
    if MENTO_FOLD:
        # Luna's lower lip tucks in to a fold before the chin: a soft horizontal groove under the lip
        mz_, md_, mr_, mk_ = MENTO_FOLD
        head.cut(ellipsoid(V(0, LM["mentolabial_fold"][1] + md_ + mr_[1], mz_), mr_), mk_)
    if JAW_BAR:
        # the jaw's lower border (the mandible under the skin): a rounded bar from the angle to beside the chin, so
        # the side turns under in one full curve (Luna's jaw edge, side maps 2026-11-17); our loft rolled in early
        # there (3-10 mm short in the side map along the edge)
        pts_, r_, k_ = JAW_BAR
        Q = [V(x_ / 1000, (y_ - 28.69) / 1000, (z_ + 6.06) / 1000) for x_, y_, z_ in pts_]
        rr_ = r_ if isinstance(r_, (list, tuple)) else [r_] * len(Q)
        for i_ in range(len(Q) - 1):
            head.add(cone(Q[i_], Q[i_ + 1], rr_[i_] / 1000, rr_[i_ + 1] / 1000), k_)
    for amt, (ox, oz), R, kk in CHIN_SIDE:
        # the chin's front corners: Luna's front falls back sooner beside the chin (front map: ours 1.5-3 mm proud at
        # x 18-30, z -85..-90): a ball pressed in along the skin's normal ((x, z) eye-centred mm)
        p, n = _skin_point(head, ox / 1000, (oz + 6.06) / 1000)
        head.cut(ellipsoid(V(*(p + n * (R / 1000 - amt))), (R / 1000,) * 3), kk)
    if CHIN_PAD:
        # the chin's pad (mentalis): Luna's front bulges ~1.3 mm more at the midline than beside it (x 12-24) at
        # z -85..-100: a flat ellipsoid set out along the skin's normal at the midline ((x, z) eye mm, radii mm)
        amt, (ox, oz), rr, kk = CHIN_PAD
        p, n = _skin_point(head, ox / 1000, (oz + 6.06) / 1000)
        head.add(ellipsoid(V(*(p + n * (amt - rr[1] / 1000))), tuple(r / 1000 for r in rr)), kk)
    for amt, (xs, ys, zs), rr, kk in FACE_SCULPT:
        # each moves the side surface at (xs, ys, zs) out (+) or in (-) by amt (the field is mirrored in x)
        cx = xs - rr[0] + amt if amt > 0 else xs + rr[0] + amt
        (head.add if amt > 0 else head.cut)(ellipsoid(V(cx, ys, zs), rr), kk)
    return Displaced(head, SOCKET_SCULPT) if SOCKET_SCULPT else head


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


#   x (mm from the eyeball's centre, + out), and the lift (mm) of the top and bottom arcs there
EYE_FIX_X = [-9.7, -8.0, -6.0, -4.0, -2.0, 0.0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0, 20.3]
EYE_TOP_FIX = [0.25, 2.64, 2.59, 1.9, 1.54, 0.87, 0.32, -0.09, 0.05, 0.04, 0.04, 0.11, 0.21, 0.16, 0.0]
EYE_BOT_FIX = [0.65, 1.15, 1.56, 1.54, 1.45, 0.87, 0.31, -0.35, -0.77, -1.24, -1.61, -1.86, -2.04, -1.82, 0.0]


LOWER_SINK_X = (6.0, 15.0, 15.0, 20.0, 0.0010)   # mm from the eye centre: the lower lid sinks in (EYE_LOOPS sink) over the first span; all the lower loops by the last (m) over the second
OUTER_THIN = (17.0, 21.0, 0.35)   # mm from the eye centre: the upper loops' thickness over the eyeball falls to this share over that span
CORNER_CLAMP = (0.0005, 0.15, 0.0035)    # at the corners the lid loops sit at most this far under the skin; share of the width it ramps over; at the outer corner only loops grown out this far (the lid itself there follows the eye: Luna's is thin above the outer corner)
# the eye's loops, outside in: (grow up, down, in, out, depth); depth None = on the broad form, "s<mm>" = that far
# under it, a number = that far over the eyeball sphere (or a (top, bottom) pair of those)
EYE_LOOPS = [   # ..., depth, sink (m; the lower lid's outer half)
    (0.0125, 0.0115, 0.0100, 0.0100, None),                       # orbit
    (0.0075, 0.0080, 0.0070, 0.0075, ("s0.8", "s0.3")),           # between the orbit and the fold / the cheek
    (0.0030, 0.0055, 0.0040, 0.0055, (0.0063, "s0.5")),           # above: the fold over the crease; below: the lid's foot
    (0.0022, 0.0038, 0.0030, 0.0038, (0.0030, "s0.2"), 0.0005),   # the crease; below: the lid's soft roll
    (0.0013, 0.0020, 0.0020, 0.0026, (0.0038, "s-0.3"), 0.0013),  # the lid's front, below the crease
    (0.0005, 0.0007, 0.0008, 0.0009, (0.0033, "s0.0"), 0.0024),   # the lid's edge: Luna's lids are thick right at the opening
    (0.0, 0.0, -0.0001, -0.0001, (0.0022, 0.0003)),               # margin: the opening (the upper lid's underside)
    (-0.0004, -0.0003, -0.0003, -0.0004, 0.0002),                 # margin turned in
]


def eye_arcs(grow_up, grow_down, grow_in, grow_out, depth, sink=0.0, samples=200):
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
    # Luna's opening (ref/_head_work eyeoutline.py, TARGET=Luna): the upper lid stays high over the inner
    # half and drops steeply at the tear duct; the lower lid sits higher. Full on the lid's loops, fading out
    # towards the orbit
    xr = (u - EYE[0]) * 1000
    w = float(np.interp(grow_up, [0.0062, 0.0125], [1.0, 0.3]))
    top = top + w * np.interp(xr, EYE_FIX_X, EYE_TOP_FIX) / 1000
    bot = bot + w * np.interp(xr, EYE_FIX_X, EYE_BOT_FIX) / 1000
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
            # (the lower lid's outer half sinks towards the eyeball by `sink`: Luna's lower lid there follows the eye)
            # (and every lower loop sinks a little more under the outer corner, where Luna's skin falls back to the eye)
            out = np.clip((xr - LOWER_SINK_X[0]) / (LOWER_SINK_X[1] - LOWER_SINK_X[0]), 0, 1) if k == 1 else 0.0
            out2 = np.clip((xr - LOWER_SINK_X[2]) / (LOWER_SINK_X[3] - LOWER_SINK_X[2]), 0, 1) if k == 1 else 0.0
            y = np.maximum(surface_y(u, z) - float(d[1:]) / 1000 * taper - sink * out - LOWER_SINK_X[4] * out2,
                           on_eyeball(u, z, EYE_R + 0.0006, cw))
        else:
            # on the eyeball; where the eyeball falls away (the inner corner) the lid follows the skin instead
            dd = d if d <= 0.0006 else 0.0006 + (d - 0.0006) * taper      # only the lid's extra thickness tapers
            if k == 0 and d > 0.0006:      # over the outer corner the fold fades out (Luna's lid is thin there)
                dd = 0.0006 + (dd - 0.0006) * (1 - (1 - OUTER_THIN[2]) * np.clip((xr - OUTER_THIN[0]) / (OUTER_THIN[1] - OUTER_THIN[0]), 0, 1))
            # past the eyeball (the corners) the lid hugs the skin: Luna's corners are sharp points, not grooves
            # running on into the skin
            # (at the outer corner only the loops outside the margin: there the lids meet flat, with no pocket)
            near = np.clip((1 - s) / CORNER_CLAMP[1], 0, 1)
            if grow_out >= CORNER_CLAMP[2]:
                near = np.minimum(near, np.clip(s / CORNER_CLAMP[1], 0, 1))
            clamp = CORNER_CLAMP[0] + (0.0035 - CORNER_CLAMP[0]) * near
            y = np.maximum(on_eyeball(u, z, EYE_R + dd, cw), surface_y(u, z) - clamp) if d > 0.0006 else on_eyeball(u, z, EYE_R + d, cw)
        arcs.append(np.stack([u, y, z], 1))
    return arcs


UPPER_LIP_H = 0.0010   # the upper lip's red part, taller than the landmark gives (the refs' is ~5-6 mm at the middle)
SEAL_FWD = 0.0022     # the lips press together: their meeting line sits this far in front of the refs' stomion mark
# Luna's lips (ref/_head_work/w_lips lipmeas, 2026-11-17): the upper lip's border is its most forward point (~9 mm in
# front of the eyes' front, 7 mm ahead of the seal), the lower lip's fullest 4-7 mm under the seal, rolling back
# under itself into a fold 1.5-2 mm deep before the chin. Offsets over the landmarks (border, fullest line):
UL_FWD = (0.0012, -0.0012)     # upper lip: y over the upper_lip_front mark
LL_FWD = (0.0008, 0.0010)     # lower lip: y over the lower_lip_front mark
LL_DROP = (1.97, 1.35)        # lower lip: z depth below the seal, in units of the lower_lip_front mark's
LL_ROLL = (0.0032, 0.0015)    # the lower lip's under-edge: back, down from its border
SKIN_FOLD = (0.0038, 0.0014)  # the fold's top under the lower lip: back, down from the lip's under-edge
LL_SIDE = 0.0005              # the lower lip's under-edge fuller part way out (Luna's is round in plan, not a wedge)
UL_EDGE = (0.0019, 0.0007)    # the skin just over the upper lip's border: back, up from it (close: a crisp border)
CURL_FWD = (0.0008, 0.0003)   # the lips' roll next to the seal pushed forward (upper, lower)
PHIL_ARC = (0.0045, 0.0020, 0.0009, 0.0006)   # over the border: the columns' x, width, stand-out, the groove's depth
CORNER_FWD = 0.0005   # Luna's mouth corners sit ~0.5 mm further forward than the corner mark (the skin round them fuller)
CORNER_OUT = 0.5      # past the corners the lip curves (border, edge loops) fall back at this share of the seal's slope


def seal_y(x):
    x = np.abs(np.asarray(x, float))
    t = np.clip(1 - (x / MOUTH_W) ** 2, 0, 1)
    k = (ST_Y - CORNER_Y - CORNER_FWD) / MOUTH_W ** 2
    xc = np.minimum(x, MOUTH_W)
    return ST_Y - k * xc * xc - CORNER_OUT * 2 * k * MOUTH_W * np.maximum(x - MOUTH_W, 0) + SEAL_FWD * t


def mouth_arcs(kind, samples=200):
    """The mouth's loops, (top, bottom), each from the +x corner to the -x corner."""
    if kind == "skin":
        # between the ring round the mouth and the lip's edge; under the lower lip it is the fold's top: the lip rolls
        # back into it in a couple of millimetres (Luna)
        a, b = mouth_arcs("around", samples), mouth_arcs("edge", samples)
        bot = b[1].copy()
        t = np.clip(1 - (bot[:, 0] / (MOUTH_W + 0.0016)) ** 2, 0, 1)
        bot += np.stack([np.zeros_like(t), -SKIN_FOLD[0] * t ** 3, -SKIN_FOLD[1] * t ** 0.5], 1)
        w = t ** 2
        bot = bot * w[:, None] + 0.5 * (a[1] + b[1]) * (1 - w[:, None])
        return [0.5 * (a[0] + b[0]), bot]
    if kind == "curl":
        # the lips rolling in from their fullest line to where they meet (kept close to the seal so smoothing
        # doesn't pull the lips apart)
        a, b = mouth_arcs("full", samples), mouth_arcs("seal", samples)
        m = [0.35 * a[0] + 0.65 * b[0], 0.35 * a[1] + 0.65 * b[1]]
        for arc, k in zip(m, CURL_FWD):
            arc[:, 1] += k * np.clip(1 - (arc[:, 0] / MOUTH_W) ** 2, 0, 1)
        return m
    if kind == "edge":
        # just outside the lip border and a step back: the crisp edge where lip meets skin
        top, bot = mouth_arcs("border", samples)
        w = MOUTH_W + 0.0016
        t = np.clip(1 - (top[:, 0] / w) ** 2, 0, 1)
        top = top + np.stack([np.sign(top[:, 0]) * 0.0010 * (1 - t), -UL_EDGE[0] * t, UL_EDGE[1] * t ** 0.5], 1)
        # the philtrum's two columns land on the bow's peaks, its groove between them (Luna: both read clearly)
        cx_, cw_, ch_, gh_ = PHIL_ARC
        top[:, 1] += ch_ * np.exp(-((np.abs(top[:, 0]) - cx_) / cw_) ** 2) - gh_ * np.exp(-(top[:, 0] / cw_) ** 2)
        bot = bot + np.stack([np.sign(bot[:, 0]) * 0.0010 * (1 - t), -LL_ROLL[0] * t ** 3, -LL_ROLL[1] * t], 1)
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
        top = np.stack([x, seal_y(x) - SEAL_FWD * t + (ULF[1] - ST_Y + UL_FWD[1]) * t ** 0.5, MOUTH_Z + (ULF[2] - MOUTH_Z + UPPER_LIP_H) * 0.58 * t ** 0.7], 1)
        bot = np.stack([x, seal_y(x) - SEAL_FWD * t + (LLF[1] - ST_Y + LL_FWD[1]) * t ** 0.5, MOUTH_Z + (LLF[2] - MOUTH_Z) * LL_DROP[1] * t ** 0.7], 1)
    elif kind == "border":
        bow = BOW[0] * np.exp(-((np.abs(x) - BOW[2]) / 0.003) ** 2) - BOW[1] * np.exp(-(x / 0.0025) ** 2)   # cupid's bow
        top = np.stack([x, seal_y(x) - SEAL_FWD * t + (ULF[1] - ST_Y + UL_FWD[0]) * t ** 0.6,
                        MOUTH_Z + (ULF[2] - MOUTH_Z + UPPER_LIP_H) * t ** 0.8 + bow * t], 1)
        bot = np.stack([x, seal_y(x) - SEAL_FWD * t + (LLF[1] - ST_Y + LL_FWD[0]) * t ** 0.6 + LL_SIDE * 6.75 * t * t * (1 - t), MOUTH_Z + (LLF[2] - MOUTH_Z) * LL_DROP[0] * t ** 0.95], 1)
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
        nl = len(EYE_LOOPS) - 2
        rings, region, border = inset_rings(bm, region, nl, 0.0008)
        bmesh.ops.delete(bm, geom=region, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        mset = set(rings[nl])
        edges = [e for e in bm.edges if e.is_boundary and all(v in mset for v in e.verts)]
        res = bmesh.ops.extrude_edge_only(bm, edges=edges)
        back = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
        chains = chain_rings(rings + [back], border)
        place_rings(chains, EYE_C, [eye_arcs(*a) for a in EYE_LOOPS], side)
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
                dz = math.sin(th) * hz * (rzs + (EAR_ROOT_FRONT_Z - rzs) * _smooth(0.2, 0.75, math.cos(th)) * (k_ == 0))   # the root reaches up the front
                fr = max(math.cos(th), 0.0) ** 2
                frk = _smooth(0.2, 0.75, math.cos(th)) if k_ == 0 else fr     # the root swings out early: attached all across the front
                ry_ = (ry + frk * (EAR_RY_FRONT[k_] - ry) if k_ < len(EAR_RY_FRONT) else ry) * EAR_W   # at the front the root is outermost
                if k_ <= 4:
                    dn = math.atan2(math.sin(th - EAR_FRONT_NOTCH[1]), math.cos(th - EAR_FRONT_NOTCH[1]))
                    ry_ -= EAR_FRONT_NOTCH[0] * max(1 - (dn / EAR_FRONT_NOTCH[2]) ** 2, 0.0) / max(math.cos(th), 0.3)
                    dl = math.atan2(math.sin(th - EAR_LOBE_FWD[1]), math.cos(th - EAR_LOBE_FWD[1]))
                    ry_ -= EAR_LOBE_FWD[0] * max(1 - (dl / EAR_LOBE_FWD[2]) ** 2, 0.0) / max(math.cos(th), 0.3)
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
            Cy0, Cz0 = byc + cs * bhw, bzc + ct * bhh
            rim4 = sorted((th, y - Cy0, z - Cz0) for k_, v, th, y, z in pos if k_ == 4)
            root0 = sorted((th, y - Cy0, z - Cz0) for k_, v, th, y, z in pos if k_ == 0)

            def ray_hit(poly, dy, dz):
                """distance along the unit ray (dy, dz) from the bowl's centre to the closed loop poly"""
                best = 1e9
                for i in range(len(poly)):
                    _, ay, az = poly[i]
                    _, by_, bz = poly[(i + 1) % len(poly)]
                    ey_, ez_ = by_ - ay, bz - az
                    den = dy * ez_ - dz * ey_
                    if abs(den) < 1e-12:
                        continue
                    t_ = (ay * ez_ - az * ey_) / den          # along the ray
                    u_ = (ay * dz - az * dy) / den            # along the segment
                    if t_ > 0 and -1e-9 <= u_ <= 1 + 1e-9:
                        best = min(best, t_)
                return best

            def bowl_pt(th, sc):
                """the bowl's outline at angle th (scale sc), kept inside the rim's inner loop (4) by EAR_BOWL_CLAMP
                (except across the front, where the bowl opens to the ear hole) and inside the root (the ear's
                attachment: the bowl's floor must not reach over the flap's back)"""
                ty = (sc * rs * math.cos(th) + EAR_CONCHA_SHEAR * sc * rt * math.sin(th)) * bhw
                tz = sc * rt * math.sin(th) * bhh
                d = math.hypot(ty, tz)
                if d < 1e-9:
                    return Cy0, Cz0
                uy, uz = ty / d, tz / d
                lim = EAR_BOWL_CLAMP + (1.0 - EAR_BOWL_CLAMP) * _smooth(0.80, 0.97, uy)
                cap = min(lim * ray_hit(rim4, uy, uz), EAR_BOWL_ROOT * ray_hit(root0, uy, uz))
                if d > cap:
                    ty, tz = ty * cap / d, tz * cap / d
                return Cy0 + ty, Cz0 + tz
            pos2 = []
            for k_, v, th, y, z in pos:
                if k_ >= 5 and round(th, 6) in by_th:
                    f, sc = EAR_RING_F[k_]
                    if k_ in EAR_LIP and ear_lip_w(k_, th) is None:      # where the bowl opens: no undercut, plain order
                        sc = EAR_LIP_PLAIN[EAR_LIP.index(k_)]
                    if k_ in (9, 10):      # under the crus the wall's foot tucks in behind the lip: the cave
                        sc += ear_undercut_w(th) * (EAR_UNDERCUT[2 if k_ == 9 else 3] - sc)
                    cy2, cz2 = bowl_pt(th, sc)
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
                uw = ear_undercut_w(th) if k_ in (9, 10) else 0.0
                if uw > 0:          # the lip keeps the crus's height, the tucked foot the floor's
                    Hf = ear_height((y - byc) / bhw, (z - bzc) / bhh, bhw * 1000, bhh * 1000, bowl=0.0 if k_ == 9 else 1.0)
                    Hh += uw * (Hf - Hh)
                if k_ >= 3:
                    rim = EAR_RIM.get(k_, 0.0)
                    if k_ in (3, 4):
                        du = math.atan2(math.sin(th - EAR_RIM_UP[1]), math.cos(th - EAR_RIM_UP[1]))
                        rim += EAR_RIM_UP[0] * max(1 - (du / EAR_RIM_UP[2]) ** 2, 0.0) * (1.0 if k_ == 3 else 0.6)
                    if k_ == 5:
                        da = math.atan2(math.sin(th - EAR_SCAPHA[1]), math.cos(th - EAR_SCAPHA[1]))
                        rim += EAR_SCAPHA[0] * max(1 - (da / EAR_SCAPHA[2]) ** 2, 0.0)
                    x = sx + (Hh + rim * (1 - fr) * (1 - 0.8 * lobe)) / 1000
                    if k_ <= 8:
                        x = max(x, sx + EAR_FLAP_MIN * (1 - fr) / 1000)
                elif k_ >= 1:
                    x = sx + (0.55 if k_ == 1 else 1.0) * max(Hh - EAR_ROLL, 0.0) / 1000 * (1 - EAR_FRONT_FLAT * fr)
                else:
                    x = sx
                if 1 <= k_ <= 8 and EAR_FRONT_CAP:   # across the front the ear stays low: the bowl opens to the cheek
                    ff = _smooth(EAR_FRONT_CAP[0], EAR_FRONT_CAP[1], math.cos(th))
                    x = x + ff * (min(x, sx + EAR_FRONT_CAP[2] / 1000 + (Hh - _plateless(y, z, byc, bzc, bhw, bhh)) / 1000) - x)
                if k_ in EAR_FRONT_RAMP:     # the front: the ear rises out of the cheek over the outer loops
                    x = x + fr * (sx + Hh * EAR_FRONT_RAMP[k_] / 1000 - x)
                if 1 <= k_ <= 4:      # the outer loops never sink under the skin (they would cut through the root)
                    x = max(x, sx + 0.0006 * k_)
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
                rho = min(math.hypot(u, w), 1.0)
                by_, bz_ = bowl_pt(math.atan2(w, u), sc)
                y, z = byc + cs * bhw + rho * (by_ - byc - cs * bhw), bzc + ct * bhh + rho * (bz_ - bzc - ct * bhh)
                s_, t_ = (y - byc) / bhw, (z - bzc) / bhh
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
            if NOSTRIL_FACES:
                # grow from the nearest face: each step adds the down-facing neighbour nearest the centre (a
                # compact patch; its border becomes the opening's loop, more faces = a rounder opening)
                dset, region = set(down), [best]
                while len(region) < NOSTRIL_FACES:
                    nb = {g for f in region for e in f.edges for g in e.link_faces if g in dset and g not in region}
                    if not nb:
                        break
                    region.append(min(nb, key=lambda f: (f.calc_center_median() - target).length))
            else:
                region = [f for f in down if ((f.calc_center_median().x - cx_) / NOSTRIL[0]) ** 2
                          + ((f.calc_center_median().y - cy_) / NOSTRIL[1]) ** 2 < 1.0] or [best]
        NECK_INFO["nostrils"].append(len(region))
        near = sorted(bm.faces, key=lambda f: (f.calc_center_median() - target).length)[:8]
        NECK_INFO.setdefault("nostril_dbg", []).append([(round((f.calc_center_median() - target).length * 1000, 1),
                                                        round(f.normal.z, 2), tuple(round(c * 1000, 1) for c in f.calc_center_median())) for f in near])
        if not region:
            continue
        rings, region, border = inset_rings(bm, region, 2 if NOSTRIL_SHAPE else 1, 0.0005)
        inner = {v for f in region for v in f.verts}
        if NOSTRIL_SHAPE:
            # the opening's rim laid on an oval (Luna's nostrils from below: ovals turned in at the front), on the
            # underside's skin; a second loop just inside it holds the rim's edge through the subdivision; the
            # inside a smaller oval pushed up into the nose. The verts of each loop go round their oval evenly,
            # in the order they already have (the faces stay as they are)
            a_, b_, turn_, in_ = NOSTRIL_SHAPE
            ct, st = math.cos(math.radians(turn_)), -math.sin(math.radians(turn_))   # front end in towards the columella
            def ang(v):
                dx, dy = side * (v.co.x - cx_), v.co.y - cy_
                return math.atan2((dx * st + dy * ct) / b_, (dx * ct - dy * st) / a_)
            def oval(th, scale):
                u, w = a_ * scale * math.cos(th), b_ * scale * math.sin(th)
                return cx_ + side * (u * ct + w * st), cy_ + (-u * st + w * ct)
            def under_z(x, y):
                lo, hi = cz_ - 0.008, cz_ + 0.005        # below the nose (outside) .. inside it
                for _ in range(30):
                    m = (lo + hi) / 2
                    if field(np.array([[x, y, m]]))[0] < 0:
                        hi = m
                    else:
                        lo = m
                return (lo + hi) / 2
            def lay(verts, scale, up, back=0.0):
                vs = sorted(verts, key=ang)
                th0 = ang(vs[0])
                for i, v in enumerate(vs):
                    x, y = oval(th0 + 2 * math.pi * i / len(vs), scale)
                    v.co = Vector((x, y - back, under_z(x, y) + up))
                    fixed.add(v)
            lay(rings[0], 1.0, 0.0)
            lay(rings[1], NOSTRIL_WALL[0], NOSTRIL_WALL[1])
            rset = set(region)
            edge_in = {v for f in region for e in f.edges if sum(g in rset for g in e.link_faces) == 1 for v in e.verts}
            lay(edge_in, in_, NOSTRIL_DEPTH, 0.0005)
            if inner - edge_in:
                lay(inner - edge_in, 0.45 * in_, NOSTRIL_DEPTH + 0.0006, 0.0005)
            NECK_INFO.setdefault("nostril_loops", []).append((len(rings[0]), len(rings[1]), len(inner)))
        else:
            for v in inner:
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
