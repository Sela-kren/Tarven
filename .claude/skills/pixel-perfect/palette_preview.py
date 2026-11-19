"""Preview Tarven's screen snapped to a colour palette, the way Red Giraffe's "Pixel Perfect" video does it.

Takes a game screenshot (or a raw low-res frame) and writes one sheet with the same picture five ways:
  as given | the game's current 63-level dither | nearest palette colour in RGB | in CIE Lab | in OKLab
so you can judge a palette and a colour space before anything goes into retro.ts.

  python -I .claude/skills/pixel-perfect/palette_preview.py shot.png --scale 2 --palette auto:32
  python -I .claude/skills/pixel-perfect/palette_preview.py shot.png --scale 2 --palette my.hex --dither 0.5

--palette: a .hex file (one RRGGBB per line), a GIMP .gpl file, another picture to take colours from
           (picture.png or picture.png:24), or auto:N to take N colours from the shot itself.
--scale:   game pixels are this many screen pixels in the shot (the game picks round(height / 720)).
--dither:  0 = none (the video), 1 = the same 4x4 Bayer pattern the game uses, spread over one palette step.
"""

import argparse
import os
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw

BAYER4 = np.array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], dtype=np.float64).reshape(4, 4)
GAME_LEVELS = 63  # retro.ts COLOR_LEVELS


def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def linear_to_lab(lin):
    """CIE L*a*b* (D65), the space the video uses."""
    m = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def linear_to_oklab(lin):
    """OKLab (Ottosson 2020): what the video's description names, cheaper than Lab and steadier in hue."""
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return np.cbrt(lin @ m1.T) @ m2.T


SPACES = {
    "RGB": lambda srgb: srgb,
    "CIE Lab": lambda srgb: linear_to_lab(srgb_to_linear(srgb)),
    "OKLab": lambda srgb: linear_to_oklab(srgb_to_linear(srgb)),
}


def load_palette(spec, shot):
    if spec.startswith("auto:"):
        return pick_colours(shot, int(spec[5:]))
    path, count = spec, 32
    if ":" in spec[2:]:  # picture.png:24 (skip a drive letter's colon)
        head, _, tail = spec.rpartition(":")
        if tail.isdigit():
            path, count = head, int(tail)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".hex", ".txt"):
        cols = [ln.strip().lstrip("#") for ln in open(path, encoding="utf-8") if ln.strip() and not ln.startswith(";")]
        return np.array([[int(c[i:i + 2], 16) for i in (0, 2, 4)] for c in cols], dtype=np.float64) / 255
    if ext == ".gpl":
        cols = []
        for ln in open(path, encoding="utf-8"):
            parts = ln.split()
            if len(parts) >= 3 and all(p.isdigit() for p in parts[:3]):
                cols.append([int(p) for p in parts[:3]])
        return np.array(cols, dtype=np.float64) / 255
    return pick_colours(np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255, count)


def oklab_to_srgb(lab):
    m2i = np.array([[1.0, 0.3963377774, 0.2158037573],
                    [1.0, -0.1055613458, -0.0638541728],
                    [1.0, -0.0894841775, -1.2914855480]])
    m1i = np.array([[4.0767416621, -3.3077115913, 0.2309699292],
                    [-1.2684380046, 2.6097574011, -0.3413193965],
                    [-0.0041960863, -0.7034186147, 1.7076147010]])
    lin = np.clip((lab @ m2i.T) ** 3 @ m1i.T, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)


def pick_colours(srgb, count, seed=7):
    """k-means in OKLab, so the colours are spread the way the eye sees them, not bunched in the darks."""
    rng = np.random.default_rng(seed)
    px = linear_to_oklab(srgb_to_linear(srgb.reshape(-1, 3)))
    px = px[rng.choice(len(px), min(len(px), 40000), replace=False)]
    centres = [px[rng.integers(len(px))]]
    for _ in range(count - 1):  # k-means++: start far apart
        d = np.min(((px[:, None] - np.array(centres)[None]) ** 2).sum(-1), 1)
        centres.append(px[rng.choice(len(px), p=d / d.sum())] if d.sum() > 0 else px[rng.integers(len(px))])
    centres = np.array(centres)
    for _ in range(20):
        lab = ((px[:, None] - centres[None]) ** 2).sum(-1).argmin(1)
        for k in range(count):
            if (lab == k).any():
                centres[k] = px[lab == k].mean(0)
    pal = np.unique((oklab_to_srgb(centres) * 255).round(), axis=0) / 255
    return pal[np.argsort(linear_to_oklab(srgb_to_linear(pal))[:, 0])]



def bayer(shape):
    h, w = shape
    tile = BAYER4 / 16 - 0.46875
    return np.tile(tile, (h // 4 + 1, w // 4 + 1))[:h, :w]


def game_levels(srgb):
    """What retro.ts does today: per-channel steps with a faint Bayer dither."""
    t = bayer(srgb.shape[:2])[..., None] / GAME_LEVELS
    return np.clip(np.floor((srgb + t) * GAME_LEVELS + 0.5) / GAME_LEVELS, 0, 1)


def snap(srgb, palette, space, dither):
    if dither > 0:
        # Spread the dither over about one palette step: the average gap between colours along each channel.
        step = 1 / max(1.0, len(palette) ** (1 / 3))
        srgb = np.clip(srgb + bayer(srgb.shape[:2])[..., None] * step * dither, 0, 1)
    to = SPACES[space]
    px = to(srgb).reshape(-1, 3)
    pal = to(palette)
    best = np.empty(len(px), dtype=np.int64)
    for i in range(0, len(px), 65536):
        d = ((px[i:i + 65536, None, :] - pal[None, :, :]) ** 2).sum(-1)
        best[i:i + 65536] = d.argmin(1)
    return palette[best].reshape(srgb.shape), np.bincount(best, minlength=len(palette))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("shot")
    ap.add_argument("--palette", default="auto:32")
    ap.add_argument("--scale", type=int, default=1, help="screen pixels per game pixel in the shot")
    ap.add_argument("--dither", type=float, default=0.0)
    ap.add_argument("--zoom", type=int, default=0, help="enlarge each panel by this much (default: fit ~640 wide)")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()

    img = Image.open(a.shot).convert("RGB")
    if a.scale > 1:
        # Take the middle of each game pixel, as texelFetch does: no blending.
        w, h = img.width // a.scale, img.height // a.scale
        arr = np.asarray(img)[a.scale // 2::a.scale, a.scale // 2::a.scale][:h, :w]
        img = Image.fromarray(np.ascontiguousarray(arr))
    shot = np.asarray(img, dtype=np.float64) / 255
    palette = load_palette(a.palette, shot)
    print(f"game frame {shot.shape[1]}x{shot.shape[0]}, palette {len(palette)} colours")

    panels = [("as given", shot), (f"game now ({GAME_LEVELS} levels)", game_levels(shot))]
    for space in SPACES:
        out, used = snap(shot, palette, space, a.dither)
        err = np.sqrt(((linear_to_oklab(srgb_to_linear(out)) - linear_to_oklab(srgb_to_linear(shot))) ** 2).sum(-1))
        print(f"{space:8s} colours used {int((used > 0).sum()):3d}/{len(palette)}   mean OKLab error {err.mean():.4f}")
        panels.append((space, out))

    # Three across, two down: the five pictures, then the palette in the last cell.
    zoom = a.zoom or max(1, 640 // shot.shape[1])
    pw, ph = shot.shape[1] * zoom, shot.shape[0] * zoom
    cw, chh = pw, ph + 22
    sheet = Image.new("RGB", (cw * 3, chh * 2), (24, 22, 20))
    draw = ImageDraw.Draw(sheet)
    for i, (label, arr) in enumerate(panels):
        x0, y0 = (i % 3) * cw, (i // 3) * chh
        p = Image.fromarray((np.clip(arr, 0, 1) * 255).round().astype(np.uint8)).resize((pw, ph), Image.NEAREST)
        sheet.paste(p, (x0, y0 + 22))
        draw.text((x0 + 6, y0 + 5), label, fill=(235, 225, 210))
    x0, y0 = 2 * cw, chh
    draw.text((x0 + 6, y0 + 5), f"palette ({len(palette)})", fill=(235, 225, 210))
    per_row = max(1, int(np.ceil(np.sqrt(len(palette) * pw / ph))))
    swatch = max(4, min(pw // per_row, ph // int(np.ceil(len(palette) / per_row))))
    for j, c in enumerate((palette * 255).round().astype(int)):
        x, y = x0 + (j % per_row) * swatch, y0 + 22 + (j // per_row) * swatch
        draw.rectangle([x, y, x + swatch - 2, y + swatch - 2], fill=tuple(c))

    out = a.out or os.path.join(tempfile.gettempdir(), "tarven-pixel",
                                os.path.splitext(os.path.basename(a.shot))[0] + "_palette.png")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    sheet.save(out)
    hexes = " ".join("%02x%02x%02x" % tuple(c) for c in (palette * 255).round().astype(int))
    print(f"palette: {hexes}")
    print(f"sheet: {os.path.abspath(out)}")


if __name__ == "__main__":
    sys.exit(main())
