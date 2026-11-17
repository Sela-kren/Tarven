"""
Her fingernails: a thin plate on the back of each finger's last bone, a separate piece lying on the skin, like the
references' (2026-11-17, measured on Luna's and Invisible Woman's bare hands, which model each nail as its own small
mesh): the nail starts ~42% of the way from the last joint to the fingertip, runs over the tip and stands ~2.5 mm
past it; ~0.88 of the finger's base radius wide (index/middle ~9 mm, little ~8 mm), ~0.7 mm above the skin, tucked
down to it at the cuticle and the side folds. The cuticle edge is an arc bowed toward the knuckle, the free edge an
arc bowed out.

Each plate is a closed thin shell: a top sheet following the finger's own curve (sampled from the field along rays
out from the bone line), a bottom sheet just under the skin, and a rim joining them.

nail_meshes(field, J) -> (P (N, 3), quads [(a, b, c, d)], tris []) for both hands. Pure numpy.
"""
import numpy as np

import sdf
from sdf import unit

# per finger (index, middle, ring, little), then the thumb: width (m), share of the last bone where the nail starts
WIDTH = [0.0090, 0.0093, 0.0088, 0.0076]
THUMB_WIDTH = 0.0105
THUMB_TURN = (0.85, 0.30)   # the thumb nail's facing: away from the index finger, and toward the back of the hand
START = 0.42            # of the distance from the last joint to the skin's tip
PAST_TIP = 0.0025       # the free edge stands this far past the skin's tip
LIFT = 0.0007           # top sheet above the skin
TUCK = 0.0002           # ... at the cuticle and the side folds
UNDER = 0.0003          # bottom sheet this far under the skin
CUTICLE_BOW = 0.22      # the cuticle's arc: its corners this share of the nail's length further out
TIP_BOW = 0.12          # the free edge's arc: its corners this share further in
COLS, ROWS = 7, 8


def _skin_radius(field, a, d, s, ray, r_max=0.02):
    """Distance from the bone line (point a + d s) out along `ray` to the skin (field = 0), by bisection."""
    o = a + d * s
    lo, hi = 0.0, r_max
    if field((o + ray * hi)[None])[0] < 0:
        return hi
    if field(o[None])[0] > 0:
        return None
    for _ in range(22):
        m = 0.5 * (lo + hi)
        if field((o + ray * m)[None])[0] < 0:
            lo = m
        else:
            hi = m
    return 0.5 * (lo + hi)


def _plate(field, j2, tip, dorsal, width):
    """One nail: grid of (top, bottom) points along the last bone j2 -> tip, centred on `dorsal`."""
    d = unit(tip - j2)
    dorsal = unit(dorsal - d * np.dot(dorsal, d))
    side = np.cross(d, dorsal)
    # the skin's tip along the bone line
    s_tip = _skin_radius(field, j2, d, 0.0, d, r_max=0.06)
    s0 = START * s_tip
    s1 = s_tip + PAST_TIP
    # past this the tip's round cap falls away under the nail: the plate runs on straight
    s_flat = s_tip - 0.0045
    L = s1 - s0
    top, bot = [], []
    for i in range(ROWS):
        v = i / (ROWS - 1)
        row_t, row_b = [], []
        for k in range(COLS):
            t = -1 + 2 * k / (COLS - 1)
            sb = s0 + CUTICLE_BOW * L * t * t
            se = s1 - TIP_BOW * L * t * t
            s = sb + v * (se - sb)
            sc = min(s, s_flat)
            # the arc across at this station: half the width round the skin
            r_mid = _skin_radius(field, j2, d, sc, dorsal)
            phi = (0.5 * width) / max(r_mid + LIFT, 1e-4) * t
            ray = dorsal * np.cos(phi) + side * np.sin(phi)
            r = _skin_radius(field, j2, d, sc, ray)
            edge = min(1.0, v / 0.25, (1 - abs(t)) / 0.3)       # tucked at the cuticle and the sides
            lift = TUCK + (LIFT - TUCK) * edge
            if s > s_flat:
                # a little curl down toward the free edge
                lift -= 0.0004 * ((s - s_flat) / max(s1 - s_flat, 1e-4)) ** 2
            base = j2 + d * s
            row_t.append(base + ray * (r + lift))
            row_b.append(base + ray * (r - UNDER if s <= s_flat else r + lift - 0.0005))
        top.append(row_t)
        bot.append(row_b)
    return np.array(top), np.array(bot)


def _shell(top, bot, P, quads):
    """Top and bottom sheets and the rim between their edges, as quads (outward-facing)."""
    R, C = top.shape[:2]
    i0 = len(P)
    P.extend(top.reshape(-1, 3))
    P.extend(bot.reshape(-1, 3))
    T = lambda i, k: i0 + i * C + k
    B = lambda i, k: i0 + R * C + i * C + k
    for i in range(R - 1):
        for k in range(C - 1):
            quads.append((T(i, k), T(i + 1, k), T(i + 1, k + 1), T(i, k + 1)))
            quads.append((B(i, k), B(i, k + 1), B(i + 1, k + 1), B(i + 1, k)))
    # the rim: walk the border of the grid
    border = [(0, k) for k in range(C)] + [(i, C - 1) for i in range(1, R)] + \
             [(R - 1, k) for k in range(C - 2, -1, -1)] + [(i, 0) for i in range(R - 2, 0, -1)]
    for a, b in zip(border, border[1:] + border[:1]):
        quads.append((T(*b), T(*a), B(*a), B(*b)))


def nail_meshes(field, J):
    wr, u, w, pn = sdf.hand_frame(J)
    chains, thumb = sdf.finger_chains(J)
    P, quads = [], []
    plates = []
    for ch, wd in zip(chains, WIDTH):
        plates.append(_plate(field, ch[2], ch[3], -pn, wd))
    # the thumb's nail faces away from its pad, and the pad faces the index finger: the thumb is turned ~90 deg
    # from the fingers, so its nail looks out sideways, a little toward the back of the hand
    t2, t3 = thumb[2], thumb[3]
    dt = unit(t3 - t2)
    toward_index = unit((chains[0][1] - t2) - dt * np.dot(chains[0][1] - t2, dt))
    back = unit(-toward_index * THUMB_TURN[0] - pn * THUMB_TURN[1])
    plates.append(_plate(field, t2, t3, back, THUMB_WIDTH))
    flip = np.array([-1.0, 1.0, 1.0])
    for top, bot in plates:
        _shell(top, bot, P, quads)
    n_one = len(P)
    # the other hand: the mirror (faces reversed to keep them facing out)
    for top, bot in plates:
        _shell(top * flip, bot * flip, P, quads)
    P = np.array(P)
    half = len(quads) // 2
    quads = quads[:half] + [q[::-1] for q in quads[half:]]
    return P, quads, n_one
