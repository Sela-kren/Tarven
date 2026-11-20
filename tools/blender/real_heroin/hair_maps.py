"""
Her own strand maps for the card hair (add_hair.py), painted by code in the way the reference hair's maps work
(ref/_head_work/hair/HAIR_STUDY.md), never copied from them:

  T_hair_f_strand_D.png   colour (grey, so the game's hair dye tints it): a flat base, a darker root band, a lit band
                          across the middle broken up by strands, fine light and dark strand lines, the edges of each
                          clump a little darker (the refs' AN / clump shading)
  T_hair_f_strand_ID.png  a random colour per strand (the refs' Hair_ID): for per-strand tint or highlight jitter
  T_hair_f_strand_M.png   coverage: solid down the card, broken into strands over the last stretch to the tip

Layout (the refs' strand atlas): ATLAS_COLS columns side by side; every card takes one column and spans the whole
height, root at the top (v 1) and tip at the bottom (v 0).

Run with any Python that has numpy and Pillow:  python tools/blender/real_heroin/hair_maps.py [out_dir]
"""
import os, sys
import numpy as np
from PIL import Image

SIZE = 512
ATLAS_COLS = 16       # must match add_hair.ATLAS_COLS
SEED = 11
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "..", "art", "hair_maps")


def smooth(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def main():
    rng = np.random.default_rng(SEED)
    h = w = SIZE
    y = np.linspace(0.0, 1.0, h)[:, None]          # 0 at the root (top row), 1 at the tip
    col_w = w // ATLAS_COLS
    D = np.zeros((h, w))
    ID = np.zeros((h, w, 3))
    M = np.ones((h, w))
    for c in range(ATLAS_COLS):
        x0 = c * col_w
        u = (np.arange(col_w) + 0.5) / col_w        # across the clump
        base = 0.74 + rng.uniform(-0.04, 0.04)
        tone = np.full((h, col_w), base)
        tone -= 0.20 * (1 - smooth(y / 0.14))       # root band: darker where it leaves the scalp
        tone -= 0.10 * (np.abs(u - 0.5) * 2) ** 2   # clump edges darker, its middle fuller
        tone -= 0.06 * smooth((y - 0.75) / 0.25)    # tips a little darker
        # the lit band: a soft stripe across the upper middle, its lower edge broken by strands
        band_c = rng.uniform(0.28, 0.36)
        jag = rng.uniform(-0.04, 0.05, col_w)
        jag = np.convolve(jag, np.ones(3) / 3, mode="same")
        lit = np.exp(-(((y - band_c - jag[None, :] * (y > band_c)) / 0.06) ** 2))
        tone += 0.16 * lit
        # strands: thin vertical lines from the root down, each its own length, light or dark
        n = rng.integers(8, 13)
        ids = np.zeros((h, col_w, 3))
        for k in range(n):
            xs = rng.uniform(0.05, 0.95)
            width = rng.uniform(0.02, 0.06)
            start, end = rng.uniform(0.0, 0.25), rng.uniform(0.55, 1.0)
            line = np.exp(-(((u - xs) / width) ** 2))[None, :] * ((y >= start) & (y <= end))
            tone += rng.choice([-1, 1]) * rng.uniform(0.04, 0.10) * line
            ids += line[..., None] * rng.uniform(0.15, 1.0, 3)[None, None, :]
        # coverage: solid to 70 % down, then split into strands that end at their own heights
        cov = np.ones((h, col_w))
        splits = rng.integers(3, 6)
        edges = np.sort(rng.uniform(0.1, 0.9, splits))
        bounds = np.concatenate([[0.0], edges, [1.0]])
        for a, b in zip(bounds, bounds[1:]):
            mid, half = (a + b) / 2, (b - a) / 2
            end = rng.uniform(0.82, 1.0)
            taper = 1 - smooth((y - 0.7) / (end - 0.7))
            inside = np.abs(u - mid)[None, :] <= half * np.maximum(taper, 0.0) + 1e-6
            cov = np.where((u[None, :] >= a) & (u[None, :] <= b), inside.astype(float), cov)
        D[:, x0:x0 + col_w] = np.clip(tone, 0.0, 1.0)
        ID[:, x0:x0 + col_w] = np.clip(ids, 0.0, 1.0)
        M[:, x0:x0 + col_w] = cov
    os.makedirs(OUT, exist_ok=True)
    rgb = (np.repeat(D[..., None], 3, axis=2) * 255).astype(np.uint8)
    Image.fromarray(rgb).save(os.path.join(OUT, "T_hair_f_strand_D.png"))
    Image.fromarray((ID * 255).astype(np.uint8)).save(os.path.join(OUT, "T_hair_f_strand_ID.png"))
    Image.fromarray((M * 255).astype(np.uint8)).save(os.path.join(OUT, "T_hair_f_strand_M.png"))
    print("maps written to", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
