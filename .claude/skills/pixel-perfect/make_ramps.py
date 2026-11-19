"""Make a pixel-art palette of hue-shifted ramps from a place's own colours.

A palette taken straight from a shot (palette_preview.py --palette auto:N) only re-states the colours the place already
has, so the picture hardly changes. Pixel artists build each colour as a ramp instead: darker steps turn cooler (toward
blue/purple) and a little more saturated, lighter steps turn warmer (toward yellow) and paler. This takes the place's
main colours (k-means in OKLab, as palette_preview does) and builds such a ramp from each.

  python -I .claude/skills/pixel-perfect/make_ramps.py shot1.png [shot2.png ...] --bases 12 --steps 4 --out town.hex

Then preview it:  python -I .claude/skills/pixel-perfect/palette_preview.py shot1.png --palette town.hex
"""

import argparse
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from palette_preview import linear_to_oklab, oklab_to_srgb, pick_colours, srgb_to_linear  # noqa: E402


def ramp(base_lab, steps, spread, shift):
    """Steps from dark to light around one base colour, in OKLab (L, a, b)."""
    L, a, b = base_lab
    C, h = np.hypot(a, b), np.arctan2(b, a)
    cool, warm = np.deg2rad(265.0), np.deg2rad(95.0)  # OKLab hue of a blue-violet and of a yellow
    out = []
    for i in range(steps):
        t = (i / (steps - 1)) * 2 - 1 if steps > 1 else 0.0  # -1 darkest .. +1 lightest
        Li = np.clip(L + t * spread, 0.08, 0.97)
        target = cool if t < 0 else warm
        dh = np.angle(np.exp(1j * (target - h)))  # shortest way round to the target hue
        hi = h + dh * abs(t) * shift * (1.0 if C > 0.02 else 0.0)
        Ci = C * (1 + 0.25 * max(-t, 0)) * (1 - 0.35 * max(t, 0)) + (0.015 * abs(t) if C <= 0.02 else 0)
        if C <= 0.02:  # greys: tint the shadows cool and the lights warm, slightly
            hi = target
        out.append([Li, Ci * np.cos(hi), Ci * np.sin(hi)])
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("shots", nargs="+")
    ap.add_argument("--bases", type=int, default=12, help="main colours to take from the shots")
    ap.add_argument("--steps", type=int, default=4, help="colours per ramp")
    ap.add_argument("--spread", type=float, default=0.13, help="OKLab lightness from the base to each end of a ramp")
    ap.add_argument("--shift", type=float, default=0.18, help="how far the ends turn toward cool/warm (0..1)")
    ap.add_argument("--merge", type=float, default=0.03, help="drop a colour this close (OKLab) to one already in")
    ap.add_argument("--scale", type=int, default=1)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    pix = []
    for s in a.shots:
        arr = np.asarray(Image.open(s).convert("RGB"), dtype=np.float64) / 255
        if a.scale > 1:
            arr = arr[a.scale // 2::a.scale, a.scale // 2::a.scale]
        pix.append(arr.reshape(-1, 3))
    bases = pick_colours(np.concatenate(pix)[None], a.bases)
    labs = []
    for base in linear_to_oklab(srgb_to_linear(bases)):
        labs += ramp(base, a.steps, a.spread, a.shift)
    kept = []
    for lab in sorted(labs, key=lambda v: v[0]):
        if all(np.linalg.norm(np.array(lab) - k) > a.merge for k in kept):
            kept.append(np.array(lab))
    srgb = oklab_to_srgb(np.array(kept))
    hexes = ["%02x%02x%02x" % tuple(c) for c in (srgb * 255).round().astype(int)]
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(f"; {len(hexes)} colours: {a.bases} bases x {a.steps} steps, spread {a.spread}, shift {a.shift}\n")
        f.write("\n".join(hexes) + "\n")
    print(f"{len(hexes)} colours -> {os.path.abspath(a.out)}")
    print(" ".join(hexes))


if __name__ == "__main__":
    sys.exit(main())
