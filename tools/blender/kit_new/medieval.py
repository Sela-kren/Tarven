"""
New medieval town pieces for Tarven's high street (streetkit.glb), made in the D:/planet kit style because the kits have
no fitting piece: low-poly solids merged into one mesh, flat colours, trim detail, real sizes, front facing -y, standing
on z=0, centred on x/y like homekit.finish().

The geometry helpers, materials and palette come from D:/planet/scripts/v3/homekit.py (imported, never written to).
Each builder returns one object named Kit_<id> at the world origin, with o["door"] = (x, y) of its door / front centre
relative to the origin (Blender axes: front is -y, so in the game that is z = -y).

    BUILDERS = {id: function}   (build_street_kit.py calls them after appending the kit pieces, so the kit materials
                                 are shared by name and the GLB stays small)
"""
import math
import random
import sys

for _p in ("D:/planet/scripts/v3", "D:/planet/scripts/v2"):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import homekit as hk  # noqa: E402
from homekit import km, beam, prism, put, window, MAT  # noqa: E402  (gable: our own below, with tile courses)
from kit import MB, PI, TAU  # noqa: E402

T = 0.15  # timber section (square), centred on the wall plane so it stands 7.5 cm proud


# ------------------------------------------------------------------ more detail (2026-11-20, the ref look)
# Round parts (posts, chimney pots, lantern caps, the well, the cross) drawn with 12 sides instead of the kit's 6-8,
# so they read round, not PS1. Only these new pieces are built here, so the kit's own pieces are untouched.
_kit_cyl = MB.cyl


def _round_cyl(self, r, h, loc, m, n=6, rot=(0, 0, 0), r2=None, base=True):
    if n in (6, 8) and max(r, r2 or 0.0) > 0.05:
        n = 12
    return _kit_cyl(self, r, h, loc, m, n, rot, r2, base)


MB.cyl = _round_cyl

COURSE = 0.32  # roof tile course spacing down the slope


def roof_courses(p, w, d, H, rh, roof, ov, t, y0):
    """
    A raised lip every COURSE down each slope of a gable roof (ridge along y), so tile and slate roofs step at the
    eaves and at the gable ends like laid courses instead of one flat board.
    """
    ridge = Vector((0.0, H + rh))
    for sx in (-1, 1):
        eave = Vector((sx * w / 2, H))
        s = (ridge - eave).normalized()
        a = eave - s * ov
        up = Vector((-s.y, s.x)) if sx < 0 else Vector((s.y, -s.x))
        if up.y < 0:
            up = -up
        length = (ridge - a).length
        k = 1
        while k * COURSE < length - 0.2:
            q = a + s * (k * COURSE) + up * (t + 0.01)
            beam(p, (q.x, y0 - ov, q.y), (q.x, y0 + d + ov, q.y), 0.05, roof, 0.035)
            k += 1


def gable(p, w, d, H, rh, wall, roof, ov=0.45, t=0.16, edge=None, y0=0.0):
    """homekit's gable roof, plus tile courses on anything but thatch"""
    hk.gable(p, w, d, H, rh, wall, roof, ov, t, edge, y0)
    if "thatch" not in roof.name:
        roof_courses(p, w, d, H, rh, roof, ov, t, y0)


# ------------------------------------------------------------------ palette (homekit's MAT plus the old-town colours)
def PAL():
    M = MAT()
    M.update(
        plaster=km("plaster", (0.93, 0.87, 0.74), vary=0.06),
        ochre=km("plaster_ochre", (0.9, 0.72, 0.42), vary=0.06),
        limewash=km("plaster_white", (0.92, 0.92, 0.88), vary=0.04),
        sage=km("plaster_sage", (0.7, 0.76, 0.62), vary=0.05),
        timber=km("timber", (0.27, 0.16, 0.09), vary=0.2),
        tblack=km("timber_black", (0.1, 0.085, 0.075), vary=0.1),
        rooftile=km("rooftile", (0.62, 0.28, 0.17), vary=0.15),
        thatch=km("thatch", (0.74, 0.6, 0.32), 0.95, vary=0.3),
        plum=km("roof_plum", (0.36, 0.17, 0.22), vary=0.12),
        fieldstone=km("fieldstone", (0.6, 0.57, 0.5), vary=0.3),
        darkstone=km("darkstone", (0.42, 0.41, 0.39), vary=0.25),
        keepstone=km("keepstone", (0.52, 0.5, 0.47), vary=0.3),
        copper=km("copper", (0.78, 0.43, 0.22), 0.35, metal=0.8),
        verdigris=km("verdigris", (0.24, 0.47, 0.40), 0.55, vary=0.12),
        bronze=km("bronze", (0.66, 0.46, 0.2), 0.3, metal=0.9),
        warmred=km("warm_red", (0.62, 0.13, 0.11), vary=0.06),
        lead=km("lead_came", (0.16, 0.17, 0.18), 0.5, metal=0.4),
        leaded=km("leaded_glass", (0.32, 0.4, 0.42), 0.1),
        stained=km("stained_glass", (0.32, 0.36, 0.7), 0.15, emit=(0.5, 0.45, 0.9), estr=0.0),  # lit at night by the game, like hk_win
        curtain=km("rose_curtain", (0.9, 0.48, 0.6), 0.9),
        roseglass=km("rose_glass", (0.75, 0.35, 0.5), 0.15),
        rosedoor=km("rose_door", (0.93, 0.45, 0.6), 0.45),
        pinkglow=km("pink_lantern", (1.0, 0.55, 0.75), 0.3, emit=(1.0, 0.4, 0.68), estr=1.0),
        relay=km("relay_stone", (0.3, 0.62, 1.0), 0.15, emit=(0.2, 0.55, 1.0), estr=1.3),
        banner=km("baron_banner", (0.36, 0.16, 0.45), 0.9),
        gold=km("banner_gold", (0.95, 0.75, 0.25), 0.5),
        sign=km("sign_green", (0.12, 0.3, 0.2), 0.6),
        ale=km("ale", (0.95, 0.68, 0.18), 0.4),
        foam=km("foam", (0.97, 0.95, 0.88), 0.9),
        canvas_r=km("awning_red", (0.78, 0.18, 0.15), 0.9),
        canvas_b=km("awning_blue", (0.2, 0.38, 0.7), 0.9),
        canvas_w=km("awning_cream", (0.96, 0.92, 0.8), 0.9),
        paper=km("paper", (0.95, 0.93, 0.85), 0.9),
        paper2=km("paper_old", (0.88, 0.82, 0.66), 0.9),
        poster=km("poster_magenta", (0.92, 0.2, 0.55), 0.6),
        cabbage=km("cabbage", (0.45, 0.68, 0.3), 0.8),
        cheese=km("cheese", (0.98, 0.8, 0.3), 0.7),
        bread=km("bread", (0.8, 0.52, 0.22), 0.7, vary=0.15),
        basket=km("basket", (0.65, 0.48, 0.25), vary=0.3),
        sack=km("sack", (0.78, 0.7, 0.52), 0.95, vary=0.15),
        doorwood=km("door_oak", (0.42, 0.24, 0.12), 0.6, vary=0.15),
    )
    return M


# ------------------------------------------------------------------ helpers
def done(p, piece_id, door=(0.0, 0.0)):
    """centre on x/y, bottom on z=0 (as homekit.finish), one object Kit_<id>; door = its builder-space front point"""
    xs = [v[0] for v in p.v]; ys = [v[1] for v in p.v]; zs = [v[2] for v in p.v]
    c = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs)))
    p.v = [(x - c.x, y - c.y, z - c.z) for x, y, z in p.v]
    name = "Kit_" + piece_id
    o = bpy.data.objects.new(name, p.mesh(name))
    bpy.context.scene.collection.objects.link(o)
    o["door"] = (round(door[0] - c.x, 3), round(door[1] - c.y, 3))
    return o


def rail(p, x0, x1, z, y, m, t=T):
    p.box((x1 - x0, t, t), ((x0 + x1) / 2, y, z), m, base=True)


def post(p, x, z0, z1, y, m, t=T):
    p.box((t, t, z1 - z0), (x, y, z0), m, base=True)


def brace(p, a, b, y, m, t=T):
    beam(p, (a[0], y, a[1]), (b[0], y, b[1]), t, m)


def framed(p, tm, x0, x1, z0, z1, gaps=(), y=0.0, extra=()):
    """
    Timber framing on one storey of a wall facing -y at depth y: sill and head rails, corner posts, posts beside each
    opening (gaps = [(x, w)]), and braces in the empty bays (an X in a wide bay, a mid rail in a narrow one).
    """
    rail(p, x0, x1, z0, y, tm); rail(p, x0, x1, z1 - T, y, tm)
    xs = [x0 + T / 2, x1 - T / 2] + list(extra)
    for x, w in gaps:
        xs += [x - w / 2 - 0.14, x + w / 2 + 0.14]
    xs = sorted(xs)
    keep = [xs[0]]
    for x in xs[1:]:
        if x - keep[-1] > 0.3:
            keep.append(x)
    keep[-1] = x1 - T / 2
    for x in keep:
        post(p, x, z0, z1, y, tm)
    for a, b in zip(keep, keep[1:]):
        if any(a < gx < b for gx, _ in gaps) or b - a < 0.45:
            continue
        lo, hi = z0 + T, z1 - T
        if b - a > 1.1:
            brace(p, (a, lo), (b, hi), y, tm); brace(p, (b, lo), (a, hi), y, tm)
        else:
            rail(p, a, b, (lo + hi) / 2 - T / 2, y, tm)


def side_frames(p, tm, W, y0, y1, z0, z1, posts=3):
    """plain framing (posts + rails) on both side walls x = +-W/2 over y0..y1"""
    L = y1 - y0
    for sx in (-1, 1):
        q = MB()
        xs = [-L / 2 + k * L / (posts + 1) for k in range(1, posts + 1)]
        framed(q, tm, -L / 2, L / 2, z0, z1, extra=xs)
        put(p, q, sx * W / 2, (y0 + y1) / 2, 0, sx * PI / 2)


def gable_xy(p, w, y0, y1, H, rh, wall, roof, ov=0.45, t=0.16, edge=None):
    """gable roof with the ridge along x (eaves to the street), over x -w/2..w/2, y y0..y1"""
    q = MB(); gable(q, y1 - y0, w, H, rh, wall, roof, ov, t, edge)
    put(p, q, w / 2, (y0 + y1) / 2, 0, PI / 2)


def gable_frame(p, tm, W, H, rh, y, window_h=0.0):
    """king post, collar and struts on a front gable triangle"""
    zc = H + rh * 0.42; half = W / 2 * (1 - 0.42) - 0.1
    rail(p, -half, half, zc, y, tm)
    post(p, 0, max(H, zc + T if window_h else H), H + rh - 0.25, y, tm)
    for sx in (-1, 1):
        brace(p, (sx * W * 0.36, H + T), (sx * W * 0.36 * 0.45, zc), y, tm)
        brace(p, (sx * half * 0.9, zc + T), (sx * 0.1, H + rh * 0.78), y, tm)


def plank_door(M, w, h, col, frame, arch=False, iron=None):
    """medieval plank door facing -y (bottom at z=0): planks, iron straps, ring; a timber frame or a stone arch"""
    q = MB(); n = max(3, int(w / 0.2)); ir = iron or M["iron"]
    for k in range(n):
        q.box((w / n - 0.018, 0.08, h), (-w / 2 + (k + 0.5) * w / n, 0, 0), col, base=True)
    if arch:
        q.cyl(w / 2, 0.08, (0, 0, h), col, 12, rot=(PI / 2, 0, 0), base=False)
    for z in (0.22 * h, 0.72 * h):
        q.box((w * 0.86, 0.1, 0.07), (0, -0.02, z), ir, base=True)
    q.cyl(0.07, 0.03, (w * 0.3, -0.07, 0.48 * h), ir, 8, rot=(PI / 2, 0, 0), base=False)
    if arch:
        r = w / 2 + 0.13
        for k in range(9):
            a0, a1 = PI * k / 9, PI * (k + 1) / 9
            beam(q, (r * math.cos(a0), -0.03, h + r * math.sin(a0)), (r * math.cos(a1), -0.03, h + r * math.sin(a1)), 0.24, frame)
        for sx in (-1, 1):
            q.box((0.24, 0.24, h), (sx * r, -0.03, 0), frame, base=True)
    else:
        for sx in (-1, 1):
            q.box((0.16, 0.16, h + 0.12), (sx * (w / 2 + 0.08), -0.03, 0), frame, base=True)
        q.box((w + 0.5, 0.18, 0.18), (0, -0.04, h), frame, base=True)
    return q


def mwin(M, w, h, frame, glass=None, shutter=None, flowers=False, sill=True, curtain=None):
    """small-paned casement window: homekit's window with timber frame, lead cames, optional plank shutters"""
    q = window(M, w, h, frame=frame, glass=glass or M["leaded"], cross=True, sill=sill, flowers=flowers)
    for fx in (-0.25, 0.25):
        q.box((0.025, 0.07, h), (fx * w, -0.035, 0), M["lead"], base=True)
    for fz in (0.27, 0.8):
        q.box((w, 0.07, 0.025), (0, -0.035, fz * h), M["lead"])
    if curtain is not None:
        for sx in (-1, 1):
            q.box((w * 0.3, 0.02, h * 0.92), (sx * w * 0.33, 0.02, 0.02), curtain, base=True)
    if shutter is not None:
        for sx in (-1, 1):
            cx = sx * (w / 2 + 0.1 + w * 0.25)
            q.box((w * 0.5, 0.05, h + 0.08), (cx, -0.04, -0.04), shutter, base=True)
            for z in (0.15, 0.75):
                q.box((w * 0.5, 0.07, 0.07), (cx, -0.06, z * h), M["iron"], base=True)
    return q


def lantern(M, glow, s=1.0):
    """iron wall lantern on a bracket (bracket against the wall at y=0, lantern out at -y), bottom of lamp at z=0"""
    q = MB()
    beam(q, (0, 0, 0.55 * s), (0, -0.35 * s, 0.55 * s), 0.04 * s, M["iron"])
    beam(q, (0, 0, 0.2 * s), (0, -0.3 * s, 0.53 * s), 0.03 * s, M["iron"])
    q.box((0.22 * s, 0.22 * s, 0.32 * s), (0, -0.35 * s, 0.05 * s), glow, base=True)
    q.box((0.26 * s, 0.26 * s, 0.05 * s), (0, -0.35 * s, 0.0), M["iron"], base=True)
    q.cyl(0.19 * s, 0.14 * s, (0, -0.35 * s, 0.37 * s), M["iron"], 4, r2=0.02, rot=(0, 0, PI / 4))
    for sx in (-1, 1):
        for sy in (-1, 1):
            q.box((0.025 * s, 0.025 * s, 0.32 * s), (sx * 0.11 * s, -0.35 * s + sy * 0.11 * s, 0.05 * s), M["iron"], base=True)
    return q


def quoins(p, m, W, y0, y1, z0, z1, step=0.35):
    """dressed corner stones on the front corners"""
    for k in range(int((z1 - z0) / step)):
        long = k % 2 == 0
        for sx in (-1, 1):
            x = sx * (W / 2 - (0.3 if long else 0.2) + 0.02)
            p.box((0.6 if long else 0.4, 0.08, step - 0.04), (x, y0 - 0.02, z0 + k * step), m, base=True)
            p.box((0.08, 0.6 if long else 0.4, step - 0.04), (sx * (W / 2 + 0.02), y0 + (0.3 if long else 0.2), z0 + k * step), m, base=True)


def chimney(p, M, x, y, z0, z1, m=None):
    m = m or M["brick"]
    p.box((0.8, 0.8, z1 - z0), (x, y, z0), m, base=True)
    p.box((0.95, 0.95, 0.15), (x, y, z1 - 0.3), M["stone"], base=True)
    for dx in (-0.18, 0.18):
        p.cyl(0.11, 0.35, (x + dx, y, z1), M["terracotta"], 8)


def merlons(p, m, x0, x1, y, z, n, w=0.55, h=0.75, d=0.45, axis="x"):
    for k in range(n):
        t = x0 + (k + 0.5) * (x1 - x0) / n
        if axis == "x":
            p.box((w, d, h), (t, y, z), m, base=True)
        else:
            p.box((d, w, h), (y, t, z), m, base=True)


def slit(p, M, x, y, z, rot=0.0):
    q = MB(); q.box((0.14, 0.1, 1.0), (0, -0.02, 0), M["dark"], base=True); q.box((0.45, 0.1, 0.12), (0, -0.02, 0.5), M["dark"])
    q.box((0.34, 0.14, 0.1), (0, -0.03, -0.1), M["darkstone"], base=True)
    put(p, q, x, y, z, rot)


# ------------------------------------------------------------------ burgage townhouses
def burgage(piece_id, W, D, wall, wall_up, tm, roof, front="gable", g=2.9, U=2.6, J=0.45, rh=2.6, roof_t=0.16,
            thatch=False, door_x=-1.3, door_col=None, gwin=(), uwin=(), shutter=None, flowers=False, extra=None):
    """
    A narrow timber-framed house on a burgage plot: stone plinth, ground floor (door + shop/house window), the upper
    storey jettied out over the street on joists and brackets, a gable or eaves roof, a chimney at the back.
    """
    M = PAL(); p = MB(); P = 0.35; H = g + U
    p.box((W, D, g), (0, D / 2, 0), wall, base=True)
    p.box((W + 0.08, D + 0.08, P), (0, D / 2, 0), M["fieldstone"], base=True)
    p.box((W, D + J, U), (0, (D - J) / 2, g), wall_up, base=True)
    # ground floor: door and windows, framing
    dw, dh = 1.0, 2.15
    put(p, plank_door(M, dw, dh, door_col or M["doorwood"], tm), door_x, 0, P - 0.02)
    p.box((1.3, 0.5, 0.18), (door_x, -0.25, 0), M["stone"], base=True)
    for x, w, h in gwin:
        put(p, mwin(M, w, h, tm, shutter=shutter), x, 0, P + 0.65)
    framed(p, tm, -W / 2, W / 2, P, g, [(door_x, dw)] + [(x, w) for x, w, _ in gwin])
    # jetty: bressumer, joist ends, brackets
    p.box((W + 0.1, 0.22, 0.24), (0, -J + 0.04, g - 0.05), tm, base=True)
    for k in range(int(W / 0.5) + 1):
        p.box((0.12, J + 0.05, 0.13), (-W / 2 + 0.1 + k * (W - 0.2) / int(W / 0.5), -J / 2, g - 0.13), tm, base=True)
    for sx in (-1, 1):
        beam(p, (sx * (W / 2 - 0.1), -0.02, g - 0.85), (sx * (W / 2 - 0.1), -J + 0.12, g - 0.08), 0.13, tm)
    # upper floor
    for x, w, h in uwin:
        put(p, mwin(M, w, h, tm, shutter=shutter, flowers=flowers), x, -J, g + 0.75)
    framed(p, tm, -W / 2, W / 2, g + 0.19, H, [(x, w) for x, w, _ in uwin], y=-J)
    side_frames(p, tm, W, 0.0, D, P, g, posts=3)
    side_frames(p, tm, W, -J, D, g, H, posts=3)
    # roof
    if front == "gable":
        if thatch:  # thick thatch: no fascia board, deep overhang, a rolled ridge
            gable(p, W, D + J, H, rh, wall_up, roof, ov=0.6, t=roof_t, edge=None, y0=-J)
            p.cyl(0.18, D + J + 1.3, (0, (D - J) / 2, H + rh + roof_t + 0.1), roof, 8, rot=(PI / 2, 0, 0), base=False)
        else:
            gable(p, W, D + J, H, rh, wall_up, roof, ov=0.4, t=roof_t, edge=tm, y0=-J)
        gable_frame(p, tm, W, H, rh, -J, window_h=1.0)
        put(p, mwin(M, 0.6, 0.75, tm, sill=False), 0, -J, H + 0.3)
    else:
        gable_xy(p, W, -J, D, H, rh, wall_up, roof, ov=0.4, t=roof_t, edge=tm)
        rail(p, -W / 2, W / 2, H - T, -J, tm)
    chimney(p, M, W / 2 - 0.7, D * 0.72, H - 1.0, H + rh + 0.9 if front != "gable" else H + rh * 0.85 + 0.6)
    if extra:
        extra(p, M, H)
    return done(p, piece_id, (door_x, 0.0))


def houseA():
    """cream plaster, dark oak frame, red tile roof, gable to the street, door left, shop window right"""
    M = PAL()
    return burgage("houseA", 5.6, 8.0, M["plaster"], M["plaster"], M["timber"], M["rooftile"], "gable",
                   g=2.9, U=2.6, J=0.45, rh=2.5, door_x=-1.45, door_col=M["green"],
                   gwin=[(1.05, 1.5, 1.2)], uwin=[(-1.3, 0.9, 1.15), (1.3, 0.9, 1.15)], shutter=M["green"])


def houseB():
    """ochre plaster, eaves to the street, slate roof, shop board + a modern poster on the wall"""
    M = PAL()

    def extra(p, M, H):
        # a stall board under the shop window and a poster pasted on the timber wall (modern touch, WORLD.md)
        p.box((1.6, 0.55, 0.08), (0.9, -0.3, 1.0), M["oak"], base=True)
        for k in range(4):
            p.ico(0.1, (0.4 + k * 0.32, -0.3, 1.13), [M["apple"], M["cabbage"], M["orange"], M["apple"]][k], scale=(1, 1, 0.8))
        p.box((0.5, 0.03, 0.7), (-2.35, -0.08, 1.1), M["poster"], base=True)
        p.box((0.36, 0.035, 0.3), (-2.35, -0.09, 1.38), M["blue"], base=True)
        p.box((0.36, 0.035, 0.08), (-2.35, -0.09, 1.2), M["yellow"], base=True)
    return burgage("houseB", 6.4, 8.0, M["ochre"], M["ochre"], M["timber"], M["slate"], "eaves",
                   g=2.9, U=2.5, J=0.4, rh=2.3, door_x=-1.1, door_col=M["red"],
                   gwin=[(1.4, 1.6, 1.2)], uwin=[(-1.9, 0.9, 1.1), (0.0, 0.9, 1.1), (1.9, 0.9, 1.1)],
                   shutter=M["navy"], flowers=True, extra=extra)


def houseC():
    """limewashed, black Tudor frame, thatched roof, gable to the street"""
    M = PAL()
    return burgage("houseC", 6.0, 8.0, M["limewash"], M["limewash"], M["tblack"], M["thatch"], "gable",
                   g=2.8, U=2.6, J=0.5, rh=2.9, roof_t=0.5, thatch=True, door_x=1.4, door_col=M["doorwood"],
                   gwin=[(-1.2, 1.3, 1.2)], uwin=[(-1.4, 1.0, 1.15), (1.4, 1.0, 1.15)], shutter=None, flowers=True)


# ------------------------------------------------------------------ her tavern
def tavern():
    """
    HER tavern: the biggest building on the street. Stone ground floor with quoins, jettied timber upper floor, a long
    tile roof with two dormers and two chimneys, a wide plank door in the middle under a hanging sign (a tankard).
    """
    M = PAL(); p = MB(); W, D, g, U, J, rh = 12.0, 8.0, 3.3, 2.8, 0.5, 2.9; H = g + U
    tm, wall, st = M["timber"], M["plaster"], M["fieldstone"]
    p.box((W, D, g), (0, D / 2, 0), st, base=True)
    p.box((W + 0.12, D + 0.12, 0.35), (0, D / 2, 0), M["darkstone"], base=True)
    quoins(p, M["stone"], W, 0.0, D, 0.35, g)
    p.box((W, D + J, U), (0, (D - J) / 2, g), wall, base=True)
    # ground floor: big door, step, lanterns, four windows with shutters
    put(p, plank_door(M, 1.2, 2.25, km("tavern_door", (0.38, 0.2, 0.1), 0.6, vary=0.15), M["stone"], arch=False), 0, 0, 0.33)
    for k in range(2):
        p.box((2.0 - k * 0.3, 0.7 - k * 0.3, 0.17), (0, -0.35 + k * 0.15, k * 0.17), M["stone"], base=True)
    for sx in (-1, 1):
        put(p, lantern(M, M["lamp"]), sx * 1.15, 0, 2.1)
        for x in (2.6, 4.6):
            put(p, mwin(M, 1.2, 1.3, tm, shutter=M["green"]), sx * x, 0, 1.0)
            p.box((1.5, 0.12, 0.2), (sx * x, -0.04, 2.38), M["stone"], base=True)  # stone lintel
    # jetty
    p.box((W + 0.12, 0.24, 0.26), (0, -J + 0.05, g - 0.06), tm, base=True)
    for k in range(25):
        p.box((0.13, J + 0.05, 0.14), (-W / 2 + 0.12 + k * (W - 0.24) / 24, -J / 2, g - 0.14), tm, base=True)
    for x in (-W / 2 + 0.12, -3.6, 3.6, W / 2 - 0.12):
        beam(p, (x, -0.02, g - 0.95), (x, -J + 0.12, g - 0.08), 0.14, tm)
    # upper floor: windows with flower boxes, framing, the sign in the middle bay
    wins = [(-4.5, 1.0), (-2.5, 1.0), (2.5, 1.0), (4.5, 1.0)]
    for x, w in wins:
        put(p, mwin(M, w, 1.2, tm, flowers=True), x, -J, g + 0.75)
    framed(p, tm, -W / 2, W / 2, g + 0.2, H, wins, y=-J, extra=(-0.9, 0.9))
    side_frames(p, tm, W, -J, D, g + 0.2, H, posts=3)
    # hanging sign: bracket out from the wall over the door, a big board facing the street with a tankard on it
    bz = g + 0.45
    beam(p, (0, -J, bz), (0, -2.1, bz), 0.11, M["iron"])
    beam(p, (0, -J, g + 1.5), (0, -1.6, bz + 0.05), 0.07, M["iron"])
    p.ico(0.07, (0, -2.1, bz + 0.05), M["iron"])
    for dx in (-0.55, 0.55):
        beam(p, (dx, -1.6, bz), (dx, -1.6, bz - 0.22), 0.025, M["iron"])
    beam(p, (-0.6, -1.6, bz), (0.6, -1.6, bz), 0.05, M["iron"])
    sb = MB(); BW, BH = 1.45, 1.0
    sb.box((BW, 0.08, BH), (0, 0, 0), km("sign_red", (0.5, 0.1, 0.08), 0.6), base=True)
    for z in (-0.03, BH - 0.05):
        sb.box((BW + 0.08, 0.11, 0.08), (0, 0, z), M["gold"], base=True)
    for sx in (-1, 1):
        sb.box((0.08, 0.11, BH + 0.08), (sx * BW / 2, 0, -0.03), M["gold"], base=True)
    for sy in (-1, 1):  # the tankard, on both faces
        sb.box((0.36, 0.04, 0.46), (-0.05, sy * 0.05, 0.18), M["ale"], base=True)
        for k in range(3):
            sb.box((0.36, 0.05, 0.04), (-0.05, sy * 0.055, 0.24 + k * 0.14), M["brass"], base=True)
        sb.ico(0.22, (-0.05, sy * 0.06, 0.66), M["foam"], scale=(1.0, 0.25, 0.5))
        sb.box((0.08, 0.04, 0.3), (0.24, sy * 0.05, 0.25), M["ale"], base=True)
        sb.box((0.14, 0.04, 0.07), (0.19, sy * 0.05, 0.52), M["ale"], base=True)
        sb.box((0.14, 0.04, 0.07), (0.19, sy * 0.05, 0.22), M["ale"], base=True)
    put(p, sb, 0, -1.6, bz - 0.22 - BH)
    # roof, dormers, chimneys
    gable_xy(p, W, -J, D, H, rh, wall, M["rooftile"], ov=0.5, t=0.18, edge=tm)
    rail(p, -W / 2, W / 2, H - T, -J, tm)
    run = (D + J) / 2
    for x in (-3.3, 3.3):
        y0 = -J + 0.55; zf = H + rh * (0.55 / run)
        q = MB()
        q.box((1.6, 1.6, 1.5), (0, 0.8, 0), wall, base=True)
        gable(q, 1.6, 1.6, 1.5, 0.75, wall, M["rooftile"], ov=0.15, t=0.12, edge=tm)
        put(q, mwin(M, 0.8, 0.85, tm, sill=False), 0, 0, 0.35)
        for sx in (-1, 1):
            q.box((T, T, 1.5), (sx * 0.73, 0, 0), tm, base=True)
        put(p, q, x, y0, zf - 0.35)
    for sx in (-1, 1):
        chimney(p, M, sx * (W / 2 - 0.55), D * 0.55, H - 0.5, H + rh * 0.62 + 1.2, M["fieldstone"])
    return done(p, "tavern", (0.0, 0.0))


# ------------------------------------------------------------------ the Copper Bell
def copperBell():
    """the rival tavern: brick ground floor, ochre timbered upper floor, verdigris copper roof, a bronze bell over the door"""
    M = PAL(); p = MB(); W, D, g, U, J, rh = 10.0, 7.0, 3.1, 2.7, 0.3, 2.6; H = g + U
    tm, wall = M["walnut"], M["ochre"]
    p.box((W, D, g), (0, D / 2, 0), M["brick"], base=True)
    p.box((W + 0.1, D + 0.1, 0.35), (0, D / 2, 0), M["darkstone"], base=True)
    quoins(p, M["stone"], W, 0.0, D, 0.35, g, step=0.3)
    p.box((W, D + J, U), (0, (D - J) / 2, g), wall, base=True)
    put(p, plank_door(M, 1.2, 2.35, km("copperbell_door", (0.15, 0.32, 0.28), 0.5), M["stone"], arch=True), 0, 0, 0.33)
    for k in range(2):
        p.box((2.2 - k * 0.3, 0.7 - k * 0.3, 0.17), (0, -0.35 + k * 0.15, k * 0.17), M["stone"], base=True)
    for sx in (-1, 1):
        put(p, lantern(M, M["lamp"]), sx * 1.25, 0, 2.15)
        for x in (2.5, 4.0):
            put(p, mwin(M, 1.0, 1.4, M["copper"], shutter=None), sx * x, 0, 0.95)
            p.box((1.3, 0.14, 0.12), (sx * x, -0.04, 2.45), M["stone"], base=True)
    p.box((W + 0.1, 0.2, 0.22), (0, -J + 0.04, g - 0.04), tm, base=True)
    wins = [(-3.6, 1.0), (-1.6, 1.0), (1.6, 1.0), (3.6, 1.0)]
    for x, w in wins:
        put(p, mwin(M, w, 1.2, tm, shutter=M["verdigris"]), x, -J, g + 0.7)
    framed(p, tm, -W / 2, W / 2, g + 0.18, H, wins, y=-J)
    side_frames(p, tm, W, -J, D, g + 0.18, H, posts=3)
    # the bell over the door, hung from an iron bracket on a copper-capped beam
    bz = g + 0.35
    beam(p, (0, -J, bz), (0, -1.6, bz), 0.14, tm)
    p.box((0.2, 0.2, 0.1), (0, -1.55, bz + 0.07), M["copper"], base=True)
    beam(p, (0, -J, g + 1.1), (0, -1.3, bz + 0.07), 0.07, M["iron"])
    beam(p, (0, -1.4, bz), (0, -1.4, bz - 0.12), 0.05, M["iron"])
    p.cyl(0.1, 0.08, (0, -1.4, bz - 0.2), M["bronze"], 10, r2=0.06)
    p.cyl(0.24, 0.46, (0, -1.4, bz - 0.66), M["bronze"], 14, r2=0.13)
    p.cyl(0.38, 0.13, (0, -1.4, bz - 0.79), M["bronze"], 14, r2=0.25)
    p.ico(0.08, (0, -1.4, bz - 0.84), M["iron"])
    beam(p, (0, -1.4, bz - 0.84), (0.06, -1.4, bz - 1.25), 0.02, km("rope", (0.75, 0.62, 0.4)))
    # copper roof with copper trim, a weathervane
    gable_xy(p, W, -J, D, H, rh, wall, M["verdigris"], ov=0.45, t=0.14, edge=M["copper"])
    rail(p, -W / 2, W / 2, H - T, -J, tm)
    cy = (D - J) / 2
    beam(p, (0, cy, H + rh), (0, cy, H + rh + 1.3), 0.04, M["copper"])
    p.cyl(0.14, 0.2, (0, cy, H + rh + 0.8), M["bronze"], 10, r2=0.09)
    beam(p, (-0.4, cy, H + rh + 1.2), (0.4, cy, H + rh + 1.2), 0.03, M["copper"])
    for sx in (-1, 1):
        chimney(p, M, sx * (W / 2 - 0.6), D * 0.6, H - 0.5, H + rh * 0.55 + 1.1)
    return done(p, "copperBell", (0.0, 0.0))


# ------------------------------------------------------------------ Oden's chapel
def lancet(M, w, h, glass, frame):
    q = MB()
    q.box((w, 0.08, h), (0, 0, 0), glass, base=True)
    prism(q, [(-w / 2, h), (w / 2, h), (0, h + w * 0.75)], -0.04, 0.04, glass)
    q.box((w + 0.3, 0.16, 0.12), (0, -0.04, -0.12), frame, base=True)
    for sx in (-1, 1):
        q.box((0.13, 0.13, h), (sx * (w / 2 + 0.065), -0.03, 0), frame, base=True)
        beam(q, (sx * (w / 2 + 0.065), -0.03, h), (0, -0.03, h + w * 0.75 + 0.1), 0.13, frame)
    q.box((0.03, 0.06, h), (0, -0.03, 0), M["lead"], base=True)
    return q


def chapel():
    """small stone chapel (Oden, the Stone-Hearted): nave with buttresses and lancets, square bell tower at the front"""
    M = PAL(); p = MB(); W, D, H, rh = 6.2, 8.6, 5.0, 3.3
    st, dk = M["fieldstone"], M["darkstone"]
    p.box((W, D, H), (0, D / 2, 0), st, base=True)
    p.box((W + 0.14, D + 0.14, 0.45), (0, D / 2, 0), dk, base=True)
    gable(p, W, D, H, rh, st, M["slate"], ov=0.3, t=0.2, edge=dk)
    for yy in (0.25, 2.95, 5.65, 8.35):
        for sx in (-1, 1):
            p.box((0.5, 0.55, 3.4), (sx * (W / 2 + 0.25), yy, 0), dk, base=True)
            prism(p, [(sx * W / 2, 3.4), (sx * (W / 2 + 0.5), 3.4), (sx * W / 2, 4.2)], yy - 0.275, yy + 0.275, dk)
    for yy in (1.6, 4.3, 7.0):
        for sx in (-1, 1):
            put(p, lancet(M, 0.7, 2.0, M["stained"], M["stone"]), sx * W / 2, yy, 1.5, sx * PI / 2)
    # tower in front, a little forward of the nave
    TW, TD, TH, ty0 = 3.3, 3.3, 9.4, -2.5
    tc = ty0 + TD / 2
    p.box((TW, TD, TH), (0, tc, 0), st, base=True)
    p.box((TW + 0.16, TD + 0.16, 0.5), (0, tc, 0), dk, base=True)
    for z in (4.4, 7.0):
        p.box((TW + 0.12, TD + 0.12, 0.16), (0, tc, z), M["stone"], base=True)
    quoins(p, M["stone"], TW, ty0, ty0 + TD, 0.5, TH, step=0.4)
    put(p, plank_door(M, 1.3, 2.1, km("chapel_door", (0.35, 0.2, 0.1), 0.6, vary=0.15), M["stone"], arch=True), 0, ty0, 0.45)
    for k in range(2):
        p.box((2.2 - k * 0.4, 0.8 - k * 0.3, 0.2), (0, ty0 - 0.4 + k * 0.15, k * 0.2), M["stone"], base=True)
    p.cyl(0.42, 0.1, (0, ty0 - 0.02, 5.4), M["stained"], 12, rot=(PI / 2, 0, 0), base=False)
    p.cyl(0.55, 0.08, (0, ty0 + 0.0, 5.4), M["stone"], 12, rot=(PI / 2, 0, 0), base=False)
    # belfry: louvred openings on the three faces the street sees, the bell inside
    for face in ("front", "left", "right"):
        q = MB()
        q.box((0.8, 0.1, 1.3), (0, 0, 0), M["dark"], base=True)
        prism(q, [(-0.4, 1.3), (0.4, 1.3), (0, 1.75)], -0.05, 0.05, M["dark"])
        for k in range(5):
            q.box((0.8, 0.08, 0.05), (0, -0.06, 0.15 + k * 0.24), M["oldwood"], rot=(0.5, 0, 0))
        q.box((1.1, 0.16, 0.12), (0, -0.04, -0.12), M["stone"], base=True)
        if face == "front":
            put(p, q, 0, ty0, 7.4)
        else:
            sx = -1 if face == "left" else 1
            put(p, q, sx * TW / 2, tc, 7.4, sx * PI / 2)
    p.box((TW + 0.3, TD + 0.3, 0.2), (0, tc, TH), M["stone"], base=True)
    for sx in (-1, 1):
        for sy in (-1, 1):
            p.cyl(0.18, 0.9, (sx * (TW / 2 - 0.05), tc + sy * (TD / 2 - 0.05), TH + 0.2), M["stone"], 4, r2=0.0, rot=(0, 0, PI / 4))
    p.cyl(TW * 0.62, 2.0, (0, tc, TH + 0.2), M["slate"], 4, r2=0.0, rot=(0, 0, PI / 4))
    p.box((0.08, 0.08, 0.7), (0, tc, TH + 2.1), M["iron"], base=True)
    p.box((0.4, 0.08, 0.08), (0, tc, TH + 2.55), M["iron"], base=True)
    # a small bell-cote cross at the east end
    p.box((0.12, 0.12, 0.6), (0, D, H + rh), M["stone"], base=True); p.box((0.4, 0.12, 0.12), (0, D, H + rh + 0.38), M["stone"], base=True)
    return done(p, "chapel", (0.0, ty0))


# ------------------------------------------------------------------ the Warm House (Veyra)
def warmHouse():
    """Veyra's church: a red-plastered 2-storey house, black frame, plum roof, rose door, two pink lantern globes"""
    M = PAL(); p = MB(); W, D, g, U, J, rh = 7.0, 7.0, 3.0, 2.7, 0.4, 2.8; P = 0.35; H = g + U
    tm, wall = M["tblack"], M["warmred"]
    p.box((W, D, g), (0, D / 2, 0), wall, base=True)
    p.box((W + 0.08, D + 0.08, P), (0, D / 2, 0), M["darkstone"], base=True)
    p.box((W, D + J, U), (0, (D - J) / 2, g), wall, base=True)
    put(p, plank_door(M, 1.2, 2.3, M["rosedoor"], tm, arch=True), 0, 0, P - 0.02)
    p.box((1.8, 0.6, 0.2), (0, -0.3, 0), M["stone"], base=True)
    for sx in (-1, 1):
        q = MB()
        beam(q, (0, 0, 0.6), (0, -0.4, 0.6), 0.04, M["iron"]); beam(q, (0, 0, 0.25), (0, -0.35, 0.58), 0.03, M["iron"])
        beam(q, (0, -0.4, 0.6), (0, -0.4, 0.45), 0.02, M["brass"])
        q.ico(0.22, (0, -0.4, 0.24), M["pinkglow"], scale=(1, 1, 1.1))
        q.cyl(0.1, 0.06, (0, -0.4, 0.42), M["brass"], 8); q.cyl(0.07, 0.05, (0, -0.4, 0.0), M["brass"], 8)
        put(p, q, sx * 1.05, 0, 1.75)
        put(p, mwin(M, 1.1, 1.3, tm, curtain=M["curtain"], shutter=None, flowers=True), sx * 2.3, 0, P + 0.65)
    framed(p, tm, -W / 2, W / 2, P, g, [(0, 1.5), (-2.3, 1.1), (2.3, 1.1)])
    p.box((W + 0.1, 0.22, 0.24), (0, -J + 0.04, g - 0.05), tm, base=True)
    for k in range(15):
        p.box((0.12, J + 0.05, 0.13), (-W / 2 + 0.1 + k * (W - 0.2) / 14, -J / 2, g - 0.13), tm, base=True)
    wins = [(-2.1, 1.0), (0.0, 1.0), (2.1, 1.0)]
    for x, w in wins:
        put(p, mwin(M, w, 1.2, tm, curtain=M["curtain"]), x, -J, g + 0.75)
    framed(p, tm, -W / 2, W / 2, g + 0.19, H, wins, y=-J)
    side_frames(p, tm, W, 0.0, D, P, g, posts=3)
    side_frames(p, tm, W, -J, D, g, H, posts=3)
    gable(p, W, D + J, H, rh, wall, M["plum"], ov=0.4, t=0.16, edge=tm, y0=-J)
    gable_frame(p, tm, W, H, rh, -J, window_h=1.0)
    p.cyl(0.42, 0.1, (0, -J - 0.02, H + 0.75), M["roseglass"], 12, rot=(PI / 2, 0, 0), base=False)
    p.cyl(0.52, 0.08, (0, -J, H + 0.75), tm, 12, rot=(PI / 2, 0, 0), base=False)
    for k in range(7):  # a string of little pink lanterns along the jetty
        x = -W / 2 + 0.5 + k * (W - 1.0) / 6
        p.ico(0.09, (x, -J - 0.1, g - 0.35 - 0.12 * math.sin(PI * ((k % 3) / 2.0))), M["pinkglow"])
    beam(p, (-W / 2 + 0.3, -J - 0.1, g - 0.2), (W / 2 - 0.3, -J - 0.1, g - 0.2), 0.015, M["iron"])
    chimney(p, M, W / 2 - 0.7, D * 0.7, H - 1.0, H + rh * 0.85 + 0.6)
    return done(p, "warmHouse", (0.0, 0.0))


# ------------------------------------------------------------------ the Baron's keep
def keep():
    """a square stone keep with a battered base, corbelled battlements, a stair turret and the glowing relay stone"""
    M = PAL(); p = MB(); S, Hk = 7.0, 13.4; st, dk = M["keepstone"], M["darkstone"]
    p.box((S, S, Hk), (0, S / 2, 0), st, base=True)
    p.cyl((S + 0.7) / math.sqrt(2), 1.6, (0, S / 2, 0), dk, 4, r2=S / math.sqrt(2) + 0.02, rot=(0, 0, PI / 4))
    for z in (5.0, 9.6):
        p.box((S + 0.16, S + 0.16, 0.2), (0, S / 2, z), M["stone"], base=True)
    quoins(p, M["stone"], S, 0.0, S, 1.6, Hk, step=0.45)
    # corbelled parapet with merlons
    for k in range(9):
        t = -S / 2 + (k + 0.5) * S / 9
        for (x, y) in ((t, -0.15), (t, S + 0.15), (-S / 2 - 0.15, t + S / 2), (S / 2 + 0.15, t + S / 2)):
            p.box((0.3, 0.3, 0.35), (x, y, Hk - 0.35), dk, base=True)
    p.box((S + 0.6, S + 0.6, 0.6), (0, S / 2, Hk), st, base=True)
    for side in (-1, 1):
        merlons(p, st, -S / 2 - 0.3, S / 2 + 0.3, S / 2 + side * (S / 2 + 0.1), Hk + 0.6, 6, w=0.65, h=0.75, d=0.4)
        merlons(p, st, -0.3, S + 0.3, side * (S / 2 + 0.1), Hk + 0.6, 6, w=0.65, h=0.75, d=0.4, axis="y")
    # stair turret at the back-right corner, with a pennant
    tx, ty = S / 2 - 0.4, S - 0.4
    p.cyl(1.05, Hk + 1.9, (tx, ty, 0), st, 8)
    p.cyl(1.2, 1.6, (tx, ty, Hk + 1.9), M["slate"], 8, r2=0.0)
    beam(p, (tx, ty, Hk + 3.4), (tx, ty, Hk + 4.6), 0.05, M["iron"])
    p.add([(tx, ty, Hk + 4.55), (tx - 0.9, ty, Hk + 4.35), (tx, ty, Hk + 4.1)], [(0, 1, 2)], M["banner"])
    # the relay stone on the roof: a plinth, iron claws, a glowing blue crystal
    cy = S / 2 - 0.3
    p.cyl(0.65, 0.55, (0, cy, Hk + 0.6), M["stone"], 8, r2=0.5)
    p.cyl(0.42, 0.25, (0, cy, Hk + 1.15), dk, 8, r2=0.3)
    p.cyl(0.42, 0.55, (0, cy, Hk + 1.4), M["relay"], 6, r2=0.0, rot=(PI, 0, 0), base=False)
    p.cyl(0.42, 1.25, (0, cy, Hk + 1.67), M["relay"], 6, r2=0.0)
    for k in range(3):
        a = k / 3 * TAU + 0.3
        beam(p, (0.32 * math.cos(a), cy + 0.32 * math.sin(a), Hk + 1.3), (0.5 * math.cos(a), cy + 0.5 * math.sin(a), Hk + 2.2), 0.05, M["iron"])
    for k in range(3):
        a = k / 3 * TAU + 1.2
        p.ico(0.09, (0.75 * math.cos(a), cy + 0.75 * math.sin(a), Hk + 2.0 + 0.2 * k), M["relay"], scale=(0.6, 0.6, 1.4))
    # front: a big arched door with steps, slits, two windows, the Baron's banner
    put(p, plank_door(M, 1.7, 2.4, km("keep_door", (0.3, 0.18, 0.1), 0.6, vary=0.15), M["stone"], arch=True), 0, -0.4, 0.6)
    p.box((2.6, 0.5, 3.6), (0, -0.2, 0), st, base=True)
    for k in range(3):
        p.box((3.0 - k * 0.3, 1.2 - k * 0.35, 0.2), (0, -0.85 + k * 0.17, k * 0.2), M["stone"], base=True)
    for x in (-2.2, 2.2):
        slit(p, M, x, 0, 3.0)
        q = MB(); q.box((0.6, 0.1, 1.0), (0, 0, 0), M["dark"], base=True)
        q.cyl(0.3, 0.1, (0, 0, 1.0), M["dark"], 8, rot=(PI / 2, 0, 0), base=False)
        q.box((0.9, 0.16, 0.12), (0, -0.04, -0.12), M["stone"], base=True)
        put(p, q, x, 0, 7.0)
    for sx in (-1, 1):
        for z in (3.0, 7.0, 11.0):
            slit(p, M, sx * S / 2, S / 2, z, sx * PI / 2)
    p.box((1.3, 0.05, 3.0), (0, -0.04, Hk - 3.0), M["banner"], base=True)
    p.box((0.22, 0.06, 3.0), (0, -0.07, Hk - 3.0), M["gold"], base=True)
    p.add([(-0.65, -0.04, Hk - 3.0), (0.65, -0.04, Hk - 3.0), (0, -0.04, Hk - 3.5)], [(0, 1, 2)], M["banner"])
    beam(p, (-0.8, -0.1, Hk - 0.05), (0.8, -0.1, Hk - 0.05), 0.06, M["oldwood"])
    return done(p, "keep", (0.0, -0.85))


# ------------------------------------------------------------------ the town gate
def gatehouse():
    """a stone gate: two square towers, a round arch (4.4 m clear, walkable), battlements, a portcullis, open leaves"""
    M = PAL(); p = MB(); st, dk = M["keepstone"], M["darkstone"]
    O, TW, TD, Th, Dm, R, zs = 2.2, 2.3, 4.4, 6.3, 3.8, 2.2, 3.0
    top = zs + R + 0.55
    for sx in (-1, 1):
        cx = sx * (O + TW / 2)
        p.box((TW, TD, Th), (cx, 0, 0), st, base=True)
        p.box((TW + 0.14, TD + 0.14, 0.5), (cx, 0, 0), dk, base=True)
        p.box((TW + 0.3, TD + 0.3, 0.2), (cx, 0, Th), M["stone"], base=True)
        merlons(p, st, cx - TW / 2 - 0.15, cx + TW / 2 + 0.15, -TD / 2 - 0.05, Th + 0.2, 3, w=0.55, h=0.7, d=0.4)
        merlons(p, st, cx - TW / 2 - 0.15, cx + TW / 2 + 0.15, TD / 2 + 0.05, Th + 0.2, 3, w=0.55, h=0.7, d=0.4)
        merlons(p, st, -TD / 2 + 0.2, TD / 2 - 0.2, cx + sx * (TW / 2 + 0.05), Th + 0.2, 4, w=0.55, h=0.7, d=0.4, axis="y")
        slit(p, M, cx, -TD / 2, 2.0); slit(p, M, cx, -TD / 2, 4.3)
        slit(p, M, cx + sx * TW / 2, 0, 3.2, sx * PI / 2)
        put(p, lantern(M, M["lamp"]), sx * (O + 0.3), -TD / 2, 2.5)
        # the open gate leaves against the passage walls
        p.box((0.12, 2.1, zs + 0.9), (sx * (O - 0.06), 0.6, 0), M["oldwood"], base=True)
        for z in (0.5, 2.6):
            p.box((0.16, 2.1, 0.12), (sx * (O - 0.06), 0.6, z), M["iron"], base=True)
    # the arch: spandrel wall over a semicircle, voussoir rings front and back
    n = 12
    pts = [(R * math.cos(PI - PI * k / n), zs + R * math.sin(PI - PI * k / n)) for k in range(n + 1)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        prism(p, [(x0, z0), (x1, z1), (x1, top), (x0, top)], -Dm / 2, Dm / 2, st)
    for sy in (-1, 1):
        for k, ((x0, z0), (x1, z1)) in enumerate(zip(pts, pts[1:])):
            sc = (R + 0.2) / R
            beam(p, (x0 * sc, sy * (Dm / 2 + 0.04), zs + (z0 - zs) * sc), (x1 * sc, sy * (Dm / 2 + 0.04), zs + (z1 - zs) * sc), 0.36,
                 M["stone"] if k % 2 else dk)
    p.box(((O + 0.3) * 2, Dm + 0.3, 0.2), (0, 0, top), M["stone"], base=True)
    merlons(p, st, -O - 0.3, O + 0.3, -Dm / 2 - 0.05, top + 0.2, 4, w=0.6, h=0.7, d=0.4)
    merlons(p, st, -O - 0.3, O + 0.3, Dm / 2 + 0.05, top + 0.2, 4, w=0.6, h=0.7, d=0.4)
    # the portcullis teeth showing under the arch, and the town's shield on the keystone
    for k in range(9):
        x = -1.8 + k * 0.45
        zc = zs + math.sqrt(max(0.0, R * R - x * x))
        p.box((0.08, 0.08, 0.55), (x, -0.4, zc - 0.5), M["iron"], base=True)
        p.cyl(0.05, 0.12, (x, -0.4, zc - 0.62), M["iron"], 4, r2=0.0)
    p.box((3.9, 0.08, 0.08), (0, -0.4, zs + 1.6), M["iron"], base=True)
    sh = MB()
    sh.box((0.6, 0.08, 0.45), (0, 0, 0.25), M["banner"], base=True)
    sh.cyl(0.3, 0.08, (0, 0, 0.25), M["banner"], 3, rot=(PI / 2, 0, PI / 2), base=False)
    sh.box((0.12, 0.1, 0.5), (0, -0.01, 0.12), M["gold"], base=True)
    put(p, sh, 0, -Dm / 2 - 0.25, zs + R + 0.05)
    return done(p, "gatehouse", (0.0, -TD / 2))


# ------------------------------------------------------------------ market things
def stall_build(piece_id, awn, goods):
    """a market stall: plank counter with goods, posts, a striped canvas awning with a scalloped valance"""
    M = PAL(); p = MB(); W = 2.4
    p.box((2.3, 0.75, 0.86), (0, -0.4, 0), M["oak"], base=True)
    for k in range(4):
        p.box((2.32, 0.77, 0.02), (0, -0.4, 0.12 + k * 0.2), M["walnut"], base=True)
    p.box((2.45, 0.9, 0.06), (0, -0.42, 0.86), M["pine"], base=True)
    for sx in (-1, 1):
        p.box((0.09, 0.09, 2.4), (sx * 1.15, -0.78, 0), M["oldwood"], base=True)
        p.box((0.09, 0.09, 2.75), (sx * 1.15, 0.72, 0), M["oldwood"], base=True)
        beam(p, (sx * 1.15, 0.72, 2.7), (sx * 1.15, -0.95, 2.3), 0.07, M["oldwood"])
    p.box((2.0, 0.5, 0.05), (0, 0.55, 0.75), M["oak"], base=True)  # back shelf
    for sx in (-1, 1):
        p.box((0.06, 0.45, 0.75), (sx * 0.95, 0.55, 0), M["oak"], base=True)
    n = 8
    for k in range(n):
        x = -W / 2 + (k + 0.5) * W / n; m = awn if k % 2 == 0 else M["canvas_w"]
        p.add([(x - W / n / 2, 0.85, 2.77), (x + W / n / 2, 0.85, 2.77), (x - W / n / 2, -1.05, 2.37), (x + W / n / 2, -1.05, 2.37),
               (x - W / n / 2, 0.85, 2.81), (x + W / n / 2, 0.85, 2.81), (x - W / n / 2, -1.05, 2.41), (x + W / n / 2, -1.05, 2.41)],
              [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)], m)
        p.box((W / n, 0.03, 0.2), (x, -1.06, 2.19), m, base=True)
        p.cyl(W / n / 2, 0.03, (x, -1.06, 2.19), m, 6, rot=(PI / 2, 0, 0), base=False)
    goods(p, M)
    return done(p, piece_id, (0.0, -0.85))


def _goods_produce(p, M):
    """apples and cabbages in crates, loaves in a basket, a sack and a jug behind"""
    rng = random.Random(3)
    for cx, fruit in ((-0.75, M["apple"]), (0.0, M["cabbage"])):
        p.box((0.6, 0.45, 0.16), (cx, -0.45, 0.92), M["pine"], base=True)
        for k in range(7):
            r = 0.07 if fruit is M["apple"] else 0.1
            p.ico(r, (cx + rng.uniform(-0.22, 0.22), -0.45 + rng.uniform(-0.15, 0.15), 1.1 + rng.uniform(0, 0.05)), fruit)
    p.cyl(0.26, 0.14, (0.72, -0.45, 0.92), M["basket"], 10, r2=0.3)
    for k in range(4):
        p.ico(0.1, (0.62 + (k % 2) * 0.18, -0.5 + (k // 2) * 0.12, 1.1), M["bread"], scale=(1.5, 0.8, 0.7), rot=(0, 0, k))
    p.ico(0.3, (-0.6, 0.55, 1.05), M["sack"], scale=(1, 0.9, 1.1))
    p.cyl(0.1, 0.28, (0.5, 0.55, 0.8), M["terracotta"], 8, r2=0.06)
    p.cyl(0.12, 0.05, (0.5, 0.55, 1.08), M["terracotta"], 8, r2=0.07)


def _goods_dairy(p, M):
    """cheese wheels, a crate of oranges, jugs and folded cloth, a phone-charm rack (modern touch)"""
    rng = random.Random(5)
    for k in range(3):
        p.cyl(0.17, 0.12, (-0.8 + k * 0.32, -0.45, 0.92), M["cheese"], 10)
    p.cyl(0.17, 0.12, (-0.64, -0.45, 1.04), M["cheese"], 10)
    p.box((0.55, 0.42, 0.16), (0.25, -0.45, 0.92), M["pine"], base=True)
    for k in range(7):
        p.ico(0.07, (0.25 + rng.uniform(-0.2, 0.2), -0.45 + rng.uniform(-0.14, 0.14), 1.1), M["orange"])
    for k, col in enumerate((M["blanket"], M["plaid"], M["linen"])):
        p.box((0.4, 0.35, 0.07), (0.85, -0.45, 0.92 + k * 0.07), col, base=True)
    for k in range(3):
        p.cyl(0.09, 0.25, (-0.5 + k * 0.3, 0.55, 0.8), M["porcelain"] if k % 2 else M["terracotta"], 8, r2=0.05)
    beam(p, (0.6, 0.55, 0.8), (0.6, 0.55, 1.6), 0.03, M["iron"]); beam(p, (0.35, 0.55, 1.55), (0.85, 0.55, 1.55), 0.02, M["iron"])
    for k, col in enumerate((M["pink"], M["teal"], M["yellow"], M["purple"])):
        p.box((0.06, 0.02, 0.11), (0.4 + k * 0.13, 0.53, 1.38), col, base=True)


def stall():
    M = PAL(); return stall_build("stall", M["canvas_r"], _goods_produce)


def stallB():
    M = PAL(); return stall_build("stallB", M["canvas_b"], _goods_dairy)


def noticeBoard():
    """the guild / town notice board: two posts, a little shingle roof, paper notices and one bright modern poster"""
    M = PAL(); p = MB(); rng = random.Random(11)
    for sx in (-1, 1):
        p.box((0.25, 0.25, 0.15), (sx * 0.78, 0, 0), M["stone"], base=True)
        p.box((0.11, 0.11, 2.45), (sx * 0.78, 0, 0), M["oldwood"], base=True)
    p.box((1.6, 0.06, 1.05), (0, 0, 1.0), M["oak"], base=True)
    for z in (0.97, 2.05):
        p.box((1.7, 0.1, 0.08), (0, -0.01, z), M["walnut"], base=True)
    q = MB(); hk.roofline(q, [(-0.95, 2.35), (0, 2.6), (0.95, 2.35)], -0.2, 0.2, M["shingle"], t=0.06, ov=0.1)
    put(p, q, 0, 0)
    beam(p, (-0.9, 0, 2.38), (0.9, 0, 2.38), 0.08, M["walnut"])
    spots = [(-0.6, 1.62, 0.28, 0.36), (-0.25, 1.7, 0.24, 0.3), (-0.6, 1.2, 0.3, 0.3), (-0.22, 1.25, 0.22, 0.32),
             (0.62, 1.68, 0.26, 0.34), (0.6, 1.22, 0.28, 0.3)]
    for k, (x, z, w, h) in enumerate(spots):
        p.box((w, 0.02, h), (x, -0.04, z - h / 2), M["paper"] if k % 2 else M["paper2"], rot=(0, rng.uniform(-0.12, 0.12), 0), base=True)
        p.ico(0.02, (x, -0.06, z + h / 2 - 0.04), M["red"])
        for j in range(3):
            p.box((w * 0.7, 0.025, 0.015), (x, -0.05, z - 0.08 - j * 0.06), M["dark"], base=True)
    p.box((0.42, 0.03, 0.62), (0.2, -0.05, 1.18), M["poster"], base=True)
    p.box((0.32, 0.035, 0.24), (0.2, -0.06, 1.48), M["blue"], base=True)
    p.ico(0.06, (0.2, -0.075, 1.6), M["yellow"])
    p.box((0.32, 0.035, 0.06), (0.2, -0.06, 1.34), M["yellow"], base=True)
    p.box((0.24, 0.035, 0.04), (0.2, -0.06, 1.25), M["white"], base=True)
    return done(p, "noticeBoard", (0.0, -0.05))


def marketCross():
    """a stone market cross: three octagonal steps, a socket stone, a tapering shaft, a capital and a cross"""
    M = PAL(); p = MB(); st, dk = M["stone"], M["darkstone"]
    z = 0.0
    for k, r in enumerate((0.8, 0.6, 0.42)):
        p.cyl(r, 0.22, (0, 0, z), dk if k == 0 else st, 8, rot=(0, 0, PI / 8)); z += 0.22
    p.box((0.5, 0.5, 0.42), (0, 0, z), st, base=True); z += 0.42
    p.box((0.56, 0.56, 0.06), (0, 0, z - 0.06), dk, base=True)
    p.cyl(0.13, 1.85, (0, 0, z), st, 8, r2=0.1); z += 1.85
    p.box((0.3, 0.3, 0.14), (0, 0, z), dk, base=True); z += 0.14
    p.box((0.13, 0.13, 0.62), (0, 0, z), st, base=True)
    p.box((0.6, 0.13, 0.13), (0, 0, z + 0.36), st, base=True)
    p.cyl(0.2, 0.06, (0, 0, z + 0.42), st, 12, rot=(PI / 2, 0, 0), base=False)
    return done(p, "marketCross", (0.0, -0.8))


BUILDERS = {
    "tavern": tavern,
    "copperBell": copperBell,
    "chapel": chapel,
    "warmHouse": warmHouse,
    "houseA": houseA,
    "houseB": houseB,
    "houseC": houseC,
    "keep": keep,
    "gatehouse": gatehouse,
    "stall": stall,
    "stallB": stallB,
    "noticeBoard": noticeBoard,
    "marketCross": marketCross,
}
