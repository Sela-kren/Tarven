"""
Painted textures for the town kit (streetkit.glb), made the way the hero-shooter refs paint theirs (MODEL_STUDY.md:
technique only, nothing copied): a hand-painted colour layer with the shading baked in (big soft brush blotches, a
light painted edge on the top of every board, stone and tile, a dark painted line in every joint, as the refs' Line_M
masks draw), and a normal map from the same shapes so the light catches them in the game.

Each family is one tileable 512 px picture, near-white, so one picture serves many materials: the material's own
colour is its glTF baseColorFactor (build_street_kit.texture_materials). No retro shrink, no palette crush: the town
follows the ref look now (art direction, 2026-11-16), drawn smooth in the game (retro.ts, TK_ names).

    make_all(out_dir) -> {family: Family(image, normal, mean, scale)}

Run inside Blender (build_street_kit.py calls it). The pictures are saved to art/textures/town/TK_<family>[_N].png.
"""
import math
import os
from dataclasses import dataclass

import bpy
import numpy as np

N = 512
rng = np.random.default_rng(23)


# ------------------------------------------------------------------ helpers
def noise(fx, fy, octaves=4, persistence=0.55, n=N):
    """Tileable fractal value noise, 0..1 (fx, fy: cells across x and y at the first octave)."""
    out = np.zeros((n, n))
    amp = 1.0
    for o in range(octaves):
        cx, cy = max(1, int(fx * 2 ** o)), max(1, int(fy * 2 ** o))
        g = rng.random((cy, cx))
        x, y = np.arange(n) * cx / n, np.arange(n) * cy / n
        xi, yi = x.astype(int), y.astype(int)
        xf, yf = x - xi, y - yi
        xf, yf = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
        x0, x1, y0, y1 = xi % cx, (xi + 1) % cx, yi % cy, (yi + 1) % cy
        a, b = g[np.ix_(y0, x0)], g[np.ix_(y0, x1)]
        c, d = g[np.ix_(y1, x0)], g[np.ix_(y1, x1)]
        fxc, fyr = xf[None, :], yf[:, None]
        out += ((a * (1 - fxc) + b * fxc) * (1 - fyr) + (c * (1 - fxc) + d * fxc) * fyr) * amp
        amp *= persistence
    lo, hi = np.percentile(out, 1), np.percentile(out, 99)
    return np.clip((out - lo) / max(hi - lo, 1e-6), 0, 1)


def grid():
    """x, y in 0..1 across the tile; y = 0 is the TOP of the picture (up the wall / up the roof slope)."""
    yy, xx = np.mgrid[0:N, 0:N] / N
    return xx, yy


def voronoi(points):
    """distance to the nearest and second-nearest point (tiled), the nearest's index, and its offset vector"""
    xx, yy = grid()
    d1 = np.full((N, N), 9.0); d2 = np.full((N, N), 9.0)
    idx = np.zeros((N, N), int); vx = np.zeros((N, N)); vy = np.zeros((N, N))
    for i, (px, py) in enumerate(points):
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                dx = xx - (px + ox); dy = yy - (py + oy)
                d = np.sqrt(dx * dx + dy * dy)
                closer = d < d1
                d2 = np.where(closer, d1, np.minimum(d2, d))
                d1 = np.where(closer, d, d1)
                idx = np.where(closer, i, idx); vx = np.where(closer, dx, vx); vy = np.where(closer, dy, vy)
    return d1, d2, idx, vx, vy


def painted(v, warm=0.05):
    """a value picture to colour: lights a touch warmer, shadows a touch cooler (painted hue shift)"""
    v = np.clip(v, 0, 1.2)
    shift = (v - 0.85)[..., None] * np.array((warm, 0.0, -warm))
    return np.clip(v[..., None] + shift, 0, 1)


def normal_from(h, strength):
    """tangent-space normal (OpenGL, +y up the picture) from a height field, as 0..1 RGB"""
    gx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5
    gy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5  # down the picture
    nx, ny, nz = -gx * strength * N / 64, gy * strength * N / 64, np.ones_like(h)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.dstack([nx / length, ny / length, nz / length]) * 0.5 + 0.5


def save(name, rgb, out_dir, colour=True):
    h, w = rgb.shape[:2]
    rgba = np.dstack([np.clip(np.flipud(rgb), 0, 1), np.ones((h, w))]).astype(np.float32)
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=False, is_data=not colour)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(out_dir, name + ".png")
    img.file_format = "PNG"
    img.save()
    if not colour:
        img.colorspace_settings.name = "Non-Color"
    return img


def edge_bands(fx, fy, gap, bevel):
    """inside a cell (fx, fy in 0..1): joint mask, top/left light band, bottom/right shadow band, and height"""
    e = np.minimum(np.minimum(fx, 1 - fx), np.minimum(fy, 1 - fy))
    joint = e < gap
    top = (fy >= gap) & (fy < gap + bevel)
    left = (fx >= gap) & (fx < gap + bevel * 0.7)
    bottom = (fy <= 1 - gap) & (fy > 1 - gap - bevel)
    right = (fx <= 1 - gap) & (fx > 1 - gap - bevel * 0.7)
    h = np.clip((e - gap) / bevel, 0, 1) ** 0.6
    return joint, top | left, bottom | right, h


# ------------------------------------------------------------------ families
def planks(rows=4):
    """boards across the tile, staggered butt joints, long grain, a lit top edge and a dark line under each board"""
    xx, yy = grid()
    grain = noise(2, 44, 4)
    blotch = noise(3, 3, 3)
    row = np.floor(yy * rows).astype(int)
    t = yy * rows - row
    offs = rng.random(rows); tone = rng.uniform(-0.06, 0.06, rows)
    shift = (rng.random(rows) * N).astype(int)
    g = np.zeros((N, N))
    for r in range(rows):
        g[row == r] = np.roll(grain, shift[r], axis=1)[row == r]
    fx = (xx - offs[row]) % 1.0
    joint_x = np.minimum(fx, 1 - fx) < 0.004
    v = 0.84 + 0.12 * (blotch - 0.5) + 0.16 * (g - 0.5) + tone[row]
    v -= 0.18 * np.clip((g - 0.78) * 5, 0, 1)  # dark grain strokes
    gap = 0.012
    v = np.where((t < 0.05) & (t >= gap), v + 0.1, v)  # lit top edge of the board
    v = np.where(t > 0.93, v - 0.1 * (t - 0.93) / 0.07, v)  # rolls into shadow at its foot
    line = (t < gap) | joint_x
    v = np.where(line, 0.32, v)
    h = np.clip(np.minimum(t - gap, 1 - t) / 0.05, 0, 1) ** 0.5 * 0.85 + 0.15 * g
    h = np.where(line, 0, h)
    return v, h, 1.6


def wood():
    """a beam's long grain with a few cracks: no joints (beams are short, the frame draws their edges)"""
    xx, yy = grid()
    grain = noise(2, 40, 4); blotch = noise(3, 2, 3)
    v = 0.84 + 0.12 * (blotch - 0.5) + 0.18 * (grain - 0.5)
    v -= 0.2 * np.clip((grain - 0.8) * 5, 0, 1)
    cracks = np.zeros((N, N), bool)
    for _ in range(5):
        y0 = rng.random(); x0 = rng.random(); length = rng.uniform(0.2, 0.5)
        along = (xx - x0) % 1.0 < length
        cracks |= along & (np.abs(((yy - y0 + 0.5) % 1.0) - 0.5 - 0.004 * np.sin(xx * 40)) < 0.0035)
    v = np.where(cracks, 0.4, v)
    h = grain * 0.5 + 0.5 - cracks * 0.6
    return v, h, 1.2


def blocks(rows, cols, gap=0.035, bevel=0.09, chip=0.25, scale=3.0, tone_spread=0.08):
    """ashlar / brick: running bond, each block its own tone, chamfered, mortar a dark recessed line"""
    xx, yy = grid()
    fine = noise(16, 16, 3); blotch = noise(3, 3, 3); chips = noise(10, 10, 2)
    row = np.floor(yy * rows).astype(int)
    xs = (xx * cols + (row % 2) * 0.5) % cols
    col = np.floor(xs).astype(int)
    fx, fy = xs - col, yy * rows - row
    joint, lit, shade, h = edge_bands(fx, fy, gap, bevel)
    tone = rng.uniform(-tone_spread, tone_spread, (rows, cols))[row % rows, col % cols]
    v = 0.86 + tone + 0.1 * (blotch - 0.5) + 0.06 * (fine - 0.5)
    v = np.where(lit, v + 0.09, v)
    v = np.where(shade, v - 0.1, v)
    pits = (chips > 0.9) & ~joint
    v = np.where(pits, v - 0.04, v)
    v = np.where(joint, 0.42 + 0.06 * fine, v)
    h = h * (0.85 + 0.15 * fine) - pits * chip
    return v, h, scale


def ashlar():
    return blocks(5, 3, scale=3.0)


def brick():
    return blocks(12, 4, gap=0.06, bevel=0.14, scale=2.0, tone_spread=0.1)


def fieldstone():
    """rubble wall: irregular rounded stones (voronoi) in dark mortar, lit from above"""
    pts = [(rng.random(), rng.random()) for _ in range(30)]
    d1, d2, idx, vx, vy = voronoi(pts)
    e = d2 - d1
    fine = noise(16, 16, 3); blotch = noise(3, 3, 3)
    tone = rng.uniform(-0.1, 0.1, len(pts))[idx]
    gap, bevel = 0.012, 0.05
    joint = e < gap
    h = np.clip((e - gap) / bevel, 0, 1) ** 0.5
    # the rim facing up (pixel above its stone's centre: vy < 0) catches the light, the lower rim falls in shade
    rim = (e < gap + bevel)
    v = 0.78 + tone + 0.1 * (blotch - 0.5) + 0.06 * (fine - 0.5)
    v = np.where(rim & (vy < 0), v + 0.08, v)
    v = np.where(rim & (vy > 0), v - 0.1, v)
    v = np.where(joint, 0.4 + 0.05 * fine, v)
    return v, h * (0.9 + 0.1 * fine), 2.5


def tiles(rows=8, cols=6, barrel=0.35, scale=2.0, tone_spread=0.07):
    """roof courses: each tile overlaps the one below it, a lit lip, a dark shadow line under each course"""
    xx, yy = grid()
    fine = noise(16, 16, 3); blotch = noise(2, 3, 3)
    row = np.floor(yy * rows).astype(int)
    t = yy * rows - row  # 0 top of the course (tucked under the course above) .. 1 its lip
    xs = (xx * cols + (row % 2) * 0.5) % cols
    col = np.floor(xs).astype(int); fx = xs - col
    tone = rng.uniform(-tone_spread, tone_spread, (rows, cols))[row % rows, col % cols]
    across = np.sin(np.pi * fx)  # a barrel tile rounds across its width
    v = 0.76 + tone + 0.1 * (blotch - 0.5) + 0.05 * (fine - 0.5) + barrel * 0.18 * (across - 0.6)
    v += 0.1 * t  # lighter towards its lip, where it stands out of the course above's shadow
    shadow = t < 0.12
    v = np.where(shadow, v - 0.28 * (1 - t / 0.12), v)
    lip = (t > 0.86) & (t < 0.95)
    v = np.where(lip, v + 0.08, v)
    side = np.minimum(fx, 1 - fx) < 0.02
    v = np.where(side, v - 0.22, v)
    h = 0.3 + 0.6 * t + barrel * 0.5 * across + 0.05 * fine
    h = np.where(t > 0.95, h - (t - 0.95) / 0.05 * 0.6, h)
    h = np.where(side, h - 0.25, h)
    return v, h, scale


def rooftile():
    return tiles()


def slate():
    return tiles(rows=11, cols=5, barrel=0.0, scale=2.2, tone_spread=0.1)


def thatch():
    """straw laid down the slope in layered courses, each course's ragged foot shading the one below"""
    xx, yy = grid()
    straw = noise(70, 3, 3); clumps = noise(10, 2, 3); blotch = noise(2, 2, 3); rag = noise(24, 1, 2)
    rows = 5
    yr = yy * rows + 0.12 * (rag - 0.5)
    row = np.floor(yr).astype(int); t = yr - row
    v = 0.86 + 0.12 * (blotch - 0.5) + 0.12 * (clumps - 0.5) + 0.14 * (straw - 0.5)
    v -= 0.22 * np.clip((straw - 0.8) * 5, 0, 1)
    v += 0.06 * t
    v = np.where(t < 0.14, v - 0.3 * (1 - t / 0.14), v)
    h = 0.4 + 0.5 * t + 0.25 * straw + 0.1 * clumps
    return v, h, 2.0


def plaster():
    """lime plaster: big soft patches, faint trowel sweeps, a few hairline cracks"""
    xx, yy = grid()
    blotch = noise(2, 2, 4); sweep = noise(6, 2, 3); fine = noise(32, 32, 2)
    v = 0.9 + 0.08 * (blotch - 0.5) + 0.05 * (sweep - 0.5) + 0.02 * (fine - 0.5)
    crack = np.abs(noise(5, 5, 3) - 0.5) < 0.006
    crack &= blotch > 0.85
    v = np.where(crack, v - 0.08, v)
    h = 0.5 + 0.3 * sweep + 0.2 * fine - crack * 0.2
    return v, h, 3.0


def metal():
    """worked iron / brass: soft painted sheen streaks, a few dents and scratches"""
    xx, yy = grid()
    streak = noise(1, 24, 3); blotch = noise(3, 3, 3); dents = noise(8, 8, 2)
    v = 0.86 + 0.1 * (blotch - 0.5) + 0.1 * (streak - 0.5)
    scratch = np.abs(noise(3, 40, 2) - 0.5) < 0.004
    v = np.where(scratch, v + 0.12, v)
    h = 0.5 + 0.3 * dents + 0.1 * streak
    return v, h, 1.0


def cloth():
    """canvas, wool, sacking: a fine weave and soft hanging folds"""
    xx, yy = grid()
    weave = 0.5 + 0.25 * np.sin(2 * np.pi * xx * 96) * np.sin(2 * np.pi * yy * 96)
    folds = noise(5, 1, 3); blotch = noise(2, 2, 3)
    v = 0.86 + 0.12 * (folds - 0.5) + 0.06 * (blotch - 0.5) + 0.05 * (weave - 0.5)
    h = 0.6 * folds + 0.15 * weave
    return v, h, 1.5


def foliage():
    """toon leaf clumps: rounded, ragged-edged clumps overlapping like scales, each lit from the top left with a dark
    rim along its foot, painted lower ones over the ones above them"""
    xx, yy = grid()
    fine = noise(24, 24, 2); edge_n = noise(40, 40, 2)
    v = np.full((N, N), 0.5); h = np.zeros((N, N))
    rows, cols, r = 9, 7, 0.1
    for row in range(rows):
        for c in range(cols):
            cx = (c + 0.5 * (row % 2) + rng.uniform(-0.2, 0.2)) / cols
            cy = (row + rng.uniform(-0.2, 0.2)) / rows
            tone = rng.uniform(-0.07, 0.07)
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    dx = xx - (cx + ox); dy = yy - (cy + oy)
                    d = np.sqrt(dx * dx + dy * dy)
                    rr = r * (0.85 + 0.3 * edge_n)
                    inside = d < rr
                    if not inside.any():
                        continue
                    k = d / rr
                    light = np.clip(0.5 - (dx + dy) / (2 * rr), 0, 1)
                    shade = 0.52 + tone + 0.34 * light + 0.04 * (fine - 0.5)
                    shade = np.where((k > 0.82) & (dy > 0), shade - 0.16, shade)  # its foot
                    v = np.where(inside, shade, v)
                    h = np.where(inside, np.sqrt(np.clip(1 - k * k, 0, 1)), h)
    return v, h, 1.5


def glass():
    """leaded / window glass: a soft sky gradient and two painted shine strokes on the diagonal"""
    xx, yy = grid()
    s = ((xx + yy) * 2) % 1.0
    v = 0.82 + 0.08 * np.cos(2 * np.pi * yy) + 0.05 * (noise(2, 2, 2) - 0.5)
    v = np.where((s > 0.08) & (s < 0.15), v + 0.18, v)
    v = np.where((s > 0.2) & (s < 0.225), v + 0.12, v)
    return v, np.full((N, N), 0.5), 1.0


def paint():
    """painted wood, bread, fruit and other small things: a near-flat soft blotch"""
    blotch = noise(2, 2, 4); fine = noise(24, 24, 2)
    v = 0.9 + 0.07 * (blotch - 0.5) + 0.03 * (fine - 0.5)
    return v, 0.5 + 0.3 * blotch, 2.0


FAMILIES = {
    "planks": (planks, 1.6), "wood": (wood, 1.4), "ashlar": (ashlar, 1.6), "brick": (brick, 1.8),
    "fieldstone": (fieldstone, 1.8), "rooftile": (rooftile, 2.2), "slate": (slate, 1.6), "thatch": (thatch, 1.8),
    "plaster": (plaster, 0.8), "metal": (metal, 0.6), "cloth": (cloth, 0.8), "foliage": (foliage, 1.6),
    "glass": (glass, 0.0), "paint": (paint, 0.4),
}


@dataclass
class Family:
    image: "bpy.types.Image"
    normal: "bpy.types.Image"
    mean: float   # the picture's average value: the material's colour is divided by it so its average stays put
    scale: float  # metres one tile covers


def make_all(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for name, (fn, strength) in FAMILIES.items():
        v, h, scale = fn()
        rgb = painted(v)
        img = save(f"TK_{name}", rgb, out_dir)
        nrm = save(f"TK_{name}_N", normal_from(h, strength), out_dir, colour=False)
        out[name] = Family(img, nrm, float(rgb.mean()), scale)
        print(f"kit_tex: TK_{name} mean {rgb.mean():.2f}, {scale} m")
    return out
