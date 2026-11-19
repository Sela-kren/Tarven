"""
Ref compare: a reference picture against her 3D model as the game shapes her, lined up and measured, in one sheet.
Made for an agent (and a person) to check the model against a picture quickly and exactly, instead of by eye.

    python tools/refcompare/compare.py <picture> [options]

It renders her with the game's own code (game.preview.ts, through vitest) from the picture's view, orthographic,
and shaded in Blender from the same camera; scales and places the picture so the same span lines up (top of her
head to her soles, or a part's span); then writes, in tools/refcompare/out/<tag>/:

    sheet.png    picture | game | Blender | overlay, with her height lines across all four  <- look at this first
    overlay.png  the overlay alone at full size: picture faded, her outline cyan, the picture's magenta,
                 red where only the picture has her, blue where only the model does
    report.txt   the numbers (also printed): widths at each height line, picture vs model, worst first
    report.json  the same, for scripts

The picture's outline is found by itself on a plain or transparent background. On a busy one (a scene, a photo),
or for a close-up of a part, mark the span with --box: run with --grid first, read the coordinates off grid.png.

Options:
    --view front|back|left|right|quarter|quarter_r   where the picture sees her from (default front; side = left)
    --part full|head|bust|torso|hips|legs            the span the picture shows (default full: head top to soles)
    --box X0,Y0,X1,Y1    the span in the picture's pixels: Y0 its top, Y1 its bottom, X0..X1 across her
    --flip               mirror the picture first (a side view facing the other way)
    --grid               just write grid.png (the picture with pixel coordinates) and stop
    --keep-holes         background-coloured patches inside her outline are her (a white top on a white page);
                         by default they're background (the gap between an arm and her side)
    --outfit ID          dress her in this outfit (tee, tavern, ... as appearance.ts names them)
    --cup LETTER         her cup size (A..Z)
    --slider ID=VALUE    any look slider, -1..1 (repeatable)
    --look FILE          a whole Look as JSON (appearance.ts); the options above go on top of it
    --posed              as the game stands her (the walk code standing still), not the model's rest pose
    --render both|game|blender   which renders to make (default both; game is ~3 s, Blender ~5 s more)
    --flat               flat preview colours instead of the look's own
    --tag NAME           the out folder's name (default the picture's name, view and part)
    --panel PX           the sheet's panel height (default 640)
    --no-cache           render again even if nothing changed

Renders are cached by everything they depend on (the job, the model file, src/game, these tools), so comparing
another picture, or the same one with another --box, takes about a second.
"""
import argparse
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
CACHE = OUT / ".cache"
BLENDER_PATHS = [
    os.environ.get("BLENDER", ""),
    r"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe",
    r"D:\blender\blender.exe",
]
BG = (40, 40, 48)
RENDER_H = 900
MAX_SHEET_W = 1800

# The spans a picture can show, between two of her height lines (see levels()), with a margin around them.
PARTS = {
    "full": ("top", "soles"),
    "head": ("top", "neck"),
    "bust": ("shoulders", "waist"),
    "torso": ("neck", "crotch"),
    "hips": ("waist", "thigh"),
    "legs": ("crotch", "soles"),
}
SIDE_VIEWS = {"left", "right", "side"}


# --- her renders ----------------------------------------------------------------------------------------------


def find_blender():
    for p in BLENDER_PATHS:
        if p and Path(p).is_file():
            return p
    return shutil.which("blender")


def source_stamp():
    """What a render depends on besides its job: the model, the game code and these tools, by size and time."""
    files = [ROOT / "public" / "models" / "female.glb", ROOT / "tools" / "posepreview" / "raster.ts"]
    files += sorted((ROOT / "src" / "game").rglob("*.ts"))
    files += [HERE / "game.preview.ts", HERE / "blender_render.py"]
    h = hashlib.sha1()
    for f in files:
        st = f.stat()
        h.update(f"{f.name}:{st.st_size}:{st.st_mtime_ns};".encode())
    return h.hexdigest()


def render(job, size, blender, use_cache, stamp):
    """Her render for this job at this size (w, h): the game picture, its info, and the Blender one if asked."""
    key = hashlib.sha1(json.dumps([job, size, blender, stamp], sort_keys=True).encode()).hexdigest()[:16]
    folder = CACHE / key
    done = folder / ("blender.png" if blender else "render.json")
    if not (use_cache and done.is_file() and (folder / "render.json").is_file()):
        folder.mkdir(parents=True, exist_ok=True)
        job = {**job, "out": str(folder), "obj": bool(blender)}
        (folder / "job.json").write_text(json.dumps(job))
        env = {**os.environ, "RC_JOB": str(folder / "job.json"), "PREVIEW_W": str(size[0]), "PREVIEW_H": str(size[1])}
        npx = shutil.which("npx.cmd") or shutil.which("npx") or "npx"
        r = subprocess.run(
            [npx, "vitest", "run", "--config", "tools/refcompare/vitest.config.ts"],
            cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf8", errors="replace",
        )
        if r.returncode != 0 or not (folder / "render.json").is_file():
            sys.exit("game render failed:\n" + (r.stdout + r.stderr)[-3000:])
        if blender:
            exe = find_blender()
            if not exe:
                print("note: Blender not found (set BLENDER=path); game render only")
            else:
                r = subprocess.run(
                    [exe, "-b", "--factory-startup", "-P", str(HERE / "blender_render.py"), "--",
                     str(folder / "model.obj"), str(folder / "render.json"), str(folder / "blender.png")],
                    capture_output=True, text=True, encoding="utf8", errors="replace",
                )
                if not (folder / "blender.png").is_file():
                    print("note: Blender render failed; game render only\n" + (r.stdout + r.stderr)[-1500:])
        (folder / "model.obj").unlink(missing_ok=True)
    info = json.loads((folder / "render.json").read_text())
    info["folder"] = str(folder)
    rgba = np.frombuffer((folder / "render.rgba").read_bytes(), np.uint8).reshape(info["h"], info["w"], 4)
    shaded = None
    if (folder / "blender.png").is_file():
        b = Image.open(folder / "blender.png").convert("RGBA")
        base = Image.new("RGBA", b.size, BG + (255,))
        base.alpha_composite(b)
        shaded = np.asarray(base.convert("RGB"))
    return np.ascontiguousarray(rgba[:, :, :3]), info, shaded


# --- outlines and her height lines --------------------------------------------------------------------------


def model_mask(rgb):
    return np.any(rgb != np.array(BG, np.uint8), axis=2)


def picture_mask(img, keep_holes=False):
    """The figure's mask in the picture and how sure it is: from transparency, or a plain background; else None."""
    a = np.asarray(img.convert("RGBA"))
    alpha = a[:, :, 3]
    if (alpha < 250).mean() > 0.05:
        return alpha > 128, "transparent background"
    rgb = a[:, :, :3].astype(np.int16)
    h, w = alpha.shape
    b = max(2, min(h, w) // 100)
    # Each edge on its own: a close-up runs off one or two (her body below her head), so only the plain edges count,
    # and they have to agree on the background's colour.
    edges = {"top": rgb[:b].reshape(-1, 3), "bottom": rgb[-b:].reshape(-1, 3),
             "left": rgb[:, :b].reshape(-1, 3), "right": rgb[:, -b:].reshape(-1, 3)}
    plain = {}
    for name, px in edges.items():
        c = np.median(px, axis=0)
        sp = np.percentile(np.abs(px - c).max(axis=1), 90)
        if sp <= 24:
            plain[name] = (c, sp, px)
    if len(plain) < 2:
        worst = max(np.percentile(np.abs(px - np.median(px, axis=0)).max(axis=1), 90) for px in edges.values())
        return None, f"busy background (its edges vary by up to {worst:.0f})"
    colours = np.array([c for c, _, _ in plain.values()])
    if np.abs(colours - np.median(colours, axis=0)).max() > 30:
        return None, "busy background (its edges don't agree on a colour)"
    border = np.concatenate([px for _, _, px in plain.values()])
    colour = np.median(border, axis=0)
    spread = np.percentile(np.abs(border - colour).max(axis=1), 90)
    dist = np.abs(rgb - colour).max(axis=2)
    # A soft edge pixel (part figure, part background) is hers only if it's at least half as far from the
    # background as the figure next to it: the outline at half coverage, as the model's is.
    local = np.asarray(Image.fromarray(dist.clip(0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)))
    far = dist > max(22, spread * 2.5)
    rim = far & (np.asarray(Image.fromarray(far.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))) == 0)
    far = far & ~(rim & (dist < local * 0.5))
    # Background is what's like the border and joined to it: fill it from the plain edges; holes in her stay hers.
    # (.copy(): Pillow 12 shares a numpy array's memory and drawing on it then does nothing.)
    flood = Image.fromarray(np.where(far, 0, 255).astype(np.uint8)).copy()
    seeds = {"top": [(x, 0) for x in range(0, w, 7)], "bottom": [(x, h - 1) for x in range(0, w, 7)],
             "left": [(0, y) for y in range(0, h, 7)], "right": [(w - 1, y) for y in range(0, h, 7)]}
    for x, y in (xy for name in plain for xy in seeds[name]):
        if flood.getpixel((x, y)) == 255:
            ImageDraw.floodfill(flood, (x, y), 128)
    mask = np.asarray(flood) != 128
    if not keep_holes:
        # Background closed in by her (between an arm and her side, a hand on her hip) is background too; only
        # specks of the background's colour inside her stay hers.
        solid = Image.fromarray((mask & far).astype(np.uint8) * 255)
        mask = mask & (np.asarray(solid.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))) > 0)
    mask = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    share = mask.mean()
    if not 0.02 < share < 0.9:
        return None, f"plain background but the figure is {share:.0%} of it"
    # A figure is one piece: keep the piece through her torso, and if that isn't nearly all of it, the background
    # isn't really plain (a texture, a gradient, a scene) and the outline can't be trusted.
    ys, xs = np.nonzero(mask)
    row = int(np.percentile(ys, 40))
    cols = np.nonzero(mask[row])[0]
    seed = (int(cols[np.argmin(np.abs(cols - np.median(xs)))]), row)
    piece = Image.fromarray(mask.astype(np.uint8) * 255).copy()
    ImageDraw.floodfill(piece, seed, 128)
    piece = np.asarray(piece) == 128
    whole = piece.sum() / mask.sum()
    if whole < 0.9:
        return None, f"busy background (the outline breaks into pieces; the main one is {whole:.0%})"
    return piece, f"plain background ({', '.join(plain)} edges, varying by {spread:.0f})"


def span_of(mask):
    """The rows and columns the figure fills, ignoring specks: rows with at least 1.5% of its widest row."""
    rows = mask.sum(axis=1)
    keep = np.nonzero(rows >= max(2, rows.max() * 0.015))[0]
    cols = np.nonzero(mask[keep[0] : keep[-1] + 1].any(axis=0))[0]
    return int(keep[0]), int(keep[-1]), int(cols[0]), int(cols[-1])


def centre_of(mask, top, bottom):
    """Her middle across: the mean column of her torso rows (30% to 55% down), so arms and a cocked hip count less."""
    a, b = top + int((bottom - top) * 0.3), top + int((bottom - top) * 0.55)
    ys, xs = np.nonzero(mask[a : b + 1])
    return float(xs.mean()) if len(xs) else mask.shape[1] / 2


def profile(mask, xc, top, bottom):
    """Per row from top to bottom: the width of the run through her middle; where her middle is empty (between her
    legs), across both legs, and one leg's width. In pixels."""
    xc = int(round(xc))
    n = bottom - top + 1
    body, legs, leg = np.zeros(n), np.zeros(n), np.zeros(n)
    w = mask.shape[1]
    reach = int((bottom - top) * 0.2)
    for i, r in enumerate(range(top, bottom + 1)):
        row = mask[r]
        if row[xc]:
            left = xc
            while left > 0 and row[left - 1]:
                left -= 1
            right = xc
            while right < w - 1 and row[right + 1]:
                right += 1
            body[i] = legs[i] = right - left + 1
            continue
        l_in = next((x for x in range(xc - 1, max(-1, xc - reach), -1) if row[x]), None)
        r_in = next((x for x in range(xc + 1, min(w, xc + reach)) if row[x]), None)
        if l_in is not None and r_in is not None:
            l_out = l_in
            while l_out > 0 and row[l_out - 1]:
                l_out -= 1
            r_out = r_in
            while r_out < w - 1 and row[r_out + 1]:
                r_out += 1
            legs[i] = r_out - l_out + 1
            leg[i] = l_in - l_out + 1
    return body, legs, leg


def smooth(a, k=5):
    return np.convolve(a, np.ones(k) / k, mode="same") if len(a) > k else a


def levels(mask, xc, top, bottom, view):
    """Her height lines on a whole-body mask, as rows: top, neck, shoulders, chest, waist, hips, crotch, thigh, knee,
    soles. Found the same way on the picture and the model, so they mean the same thing on both."""
    body, legs, leg = profile(mask, xc, top, bottom)
    body, legs, leg = smooth(body), smooth(legs), smooth(leg)
    n = bottom - top + 1

    def at(t):
        return int(np.clip(round(t * (n - 1)), 0, n - 1))

    def arg(fn, a, b, data):
        a, b = at(a), max(at(a) + 1, at(b))
        return a + int(fn(data[a:b]))

    side = view in SIDE_VIEWS or view.startswith("quarter")
    out = {"top": 0, "soles": n - 1}
    out["neck"] = arg(np.argmin, 0.08, 0.2, body)
    out["shoulders"] = arg(np.argmax, out["neck"] / n + 0.02, 0.24, body)
    out["waist"] = arg(np.argmin, 0.33, 0.47, body)
    if side:
        # Seen from the side her bust is the deepest point of her chest.
        out["chest"] = arg(np.argmax, max(0.2, out["shoulders"] / n + 0.03), out["waist"] / n - 0.02, body)
    else:
        # From the front her bust doesn't show in the outline, and her arms join it under the shoulders: a fixed
        # share of the way from her shoulders to her waist, at her bust.
        out["chest"] = out["shoulders"] + int(0.42 * (out["waist"] - out["shoulders"]))
    gap = [i for i in range(at(0.4), at(0.75)) if body[i] == 0 and legs[i] > 0]
    out["crotch"] = gap[0] if (gap and not side) else at(0.48)
    out["hips"] = arg(np.argmax, out["waist"] / n + 0.03, min(0.58, out["crotch"] / n - 0.015), body)
    out["thigh"] = min(n - 1, out["crotch"] + at(0.05))
    knee_data = leg if not side and leg[at(0.68) : at(0.8)].max() > 0 else body
    out["knee"] = arg(np.argmin, 0.68, 0.8, np.where(knee_data > 0, knee_data, 1e9))
    return {k: top + v for k, v in out.items()}


# --- lining the picture up -----------------------------------------------------------------------------------


def place(img, mask, box, model_box, size):
    """The picture (and its mask) scaled and moved onto the model's frame so its box lands on the model's."""
    (x0, y0, x1, y1), (mx, my0, my1) = box, model_box
    s = (my1 - my0) / max(1, (y1 - y0))
    cx = (x0 + x1) / 2
    # Model pixel (u, v) <- picture pixel ((u - mx) / s + cx, (v - my0) / s + y0).
    coeffs = (1 / s, 0, cx - mx / s, 0, 1 / s, y0 - my0 / s)
    rgb = img.convert("RGB").transform(size, Image.AFFINE, coeffs, Image.BICUBIC, fillcolor=(90, 90, 96))
    m = None
    if mask is not None:
        m = np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).transform(size, Image.AFFINE, coeffs, Image.BILINEAR)) > 127
    return np.asarray(rgb), m, s


def grid_image(img, path):
    """The picture with a labelled pixel grid, to read a --box off."""
    g = img.convert("RGB").copy()
    w, h = g.size
    d = ImageDraw.Draw(g)
    step = max(10, int(round(max(w, h) / 20 / 10) * 10))
    font = ImageFont.load_default(size=max(11, step // 4))
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=(255, 0, 255) if x % (step * 5) == 0 else (0, 220, 255), width=1)
        d.text((x + 2, 2), str(x), fill=(255, 255, 0), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=(255, 0, 255) if y % (step * 5) == 0 else (0, 220, 255), width=1)
        d.text((2, y + 2), str(y), fill=(255, 255, 0), font=font, stroke_width=2, stroke_fill=(0, 0, 0))
    g.save(path)
    return step


# --- the sheet ------------------------------------------------------------------------------------------------


def outline(mask):
    m = Image.fromarray(mask.astype(np.uint8) * 255)
    return np.asarray(m.filter(ImageFilter.MaxFilter(3))) != np.asarray(m.filter(ImageFilter.MinFilter(3)))


def overlay_image(ref_rgb, ref_mask, her_mask):
    grey = ref_rgb.mean(axis=2, keepdims=True)
    o = (grey * 0.55 + 255 * 0.3).repeat(3, axis=2)
    if ref_mask is not None:
        only_ref, only_her = ref_mask & ~her_mask, her_mask & ~ref_mask
        o[only_ref] = o[only_ref] * 0.5 + np.array([230, 40, 40]) * 0.5
        o[only_her] = o[only_her] * 0.5 + np.array([40, 90, 240]) * 0.5
        o[outline(ref_mask)] = (230, 0, 200)
    o[outline(her_mask)] = (0, 230, 255)
    return o.clip(0, 255).astype(np.uint8)


def sheet(panels, lines, title, footer, panel_h):
    """Panels side by side at one height, her height lines across them, labelled on the left."""
    h0, w0 = panels[0][1].shape[:2]
    # At most MAX_SHEET_W wide: small enough to read in one look, cheap for an agent to take in.
    panel_h = min(panel_h, int((MAX_SHEET_W - 74 - 4 * (len(panels) - 1)) / len(panels) * h0 / w0))
    k = panel_h / h0
    pw = int(round(w0 * k))
    margin, head, foot = 74, 26, 18 * len(footer) + 10
    W = margin + pw * len(panels) + 4 * (len(panels) - 1)
    out = Image.new("RGB", (W, head + panel_h + foot), (24, 24, 28))
    d = ImageDraw.Draw(out)
    font = ImageFont.load_default(size=13)
    small = ImageFont.load_default(size=11)
    for i, (name, arr) in enumerate(panels):
        x = margin + i * (pw + 4)
        out.paste(Image.fromarray(arr).resize((pw, panel_h), Image.LANCZOS), (x, head))
        d.text((x + 4, 6), name, fill=(235, 235, 235), font=font)
    last_label = -100
    for name, row, note in sorted(lines, key=lambda l: l[1]):
        y = head + int(round((row + 0.5) * k))
        if not head <= y < head + panel_h:
            continue
        for i in range(len(panels)):
            x = margin + i * (pw + 4)
            for dx in range(0, pw, 6):
                d.line([(x + dx, y), (x + min(dx + 3, pw), y)], fill=(255, 210, 0), width=1)
        # Labels pushed apart where lines sit close; each line's diff on the overlay's right edge.
        ly = max(y - 7, last_label + 13)
        last_label = ly
        d.text((4, ly), name, fill=(255, 210, 0), font=small)
        if note:
            d.text((W - 6, y - 15), note, fill=(255, 230, 120), font=font, anchor="ra", stroke_width=2, stroke_fill=(0, 0, 0))
    d.text((W - 6, 6), title, fill=(160, 160, 170), font=small, anchor="ra")
    for i, line in enumerate(footer):
        d.text((8, head + panel_h + 6 + 18 * i), line, fill=(220, 220, 220), font=font)
    return out


# --- main -----------------------------------------------------------------------------------------------------


# --- cross-sections: how deep she is, and how far her clothes stand off her -------------------------------------
#
# A front picture only shows widths. The model is known in 3D, so at each of her height lines it is cut across (as
# the game shapes and dresses her, game.preview.ts writes the cuts) and measured: her body's width and depth, her
# clothes' width and depth, how far the clothes stand off her skin at the front, sides and back, and whether any of
# them dips inside her. With a side picture as well (--side), the picture's width and depth at each line are drawn
# over the cut as an ellipse, so the depth of a section can be checked against the picture, not just its width.

SECTION_LINES = ("neck", "shoulders", "chest", "waist", "hips", "thigh", "knee", "calf")
SECTION_COLOURS = [(0, 220, 255), (255, 90, 200), (120, 255, 120), (255, 170, 40), (170, 140, 255)]


def section_at(slices, step, y):
    """The cut nearest height y: {"Part|material": segments (n, 2, 2)} in metres, x across her, z back (+) to front (-)."""
    i = max(0, min(len(slices) - 1, int(round(y / step))))
    return {k: np.array(v, float).reshape(-1, 2, 2) for k, v in slices[i].items()}


def rings(segs):
    """The segments grouped into the closed rings they make (shared ends), as lists of indices."""
    parent = list(range(len(segs)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    owner = {}
    for i, seg in enumerate(segs):
        for end in seg:
            key = (round(end[0], 4), round(end[1], 4))
            if key in owner:
                parent[find(i)] = find(owner[key])
            else:
                owner[key] = i
    groups = {}
    for i in range(len(segs)):
        groups.setdefault(find(i), []).append(i)
    return list(groups.values())


def seg_distance(points, segs):
    """Each point's distance to the nearest segment, and which segment that is."""
    a, b = segs[:, 0], segs[:, 1]
    ab = b - a
    rel = points[:, None, :] - a[None]
    t = np.clip((rel * ab[None]).sum(-1) / np.maximum((ab * ab).sum(-1), 1e-12)[None], 0, 1)
    d = np.linalg.norm(rel - t[..., None] * ab[None], axis=-1)
    return d.min(axis=1), d.argmin(axis=1)


def inside(points, segs):
    """Whether each point is inside the closed outline the segments make (even-odd rule)."""
    a, b = segs[:, 0][None], segs[:, 1][None]
    px, pz = points[:, 0:1], points[:, 1:2]
    crosses = (a[..., 1] > pz) != (b[..., 1] > pz)
    dz = b[..., 1] - a[..., 1]
    xs = a[..., 0] + (pz - a[..., 1]) * (b[..., 0] - a[..., 0]) / np.where(dz == 0, 1e-12, dz)
    return ((crosses & (px < xs)).sum(axis=1) % 2) == 1


def measure_section(cut, below_crotch):
    """Her body and clothes at one cut: what's hers (the trunk, or both legs, not her arms), sizes and gaps."""
    body = np.concatenate([v for k, v in cut.items() if k.startswith("Body|")] or [np.zeros((0, 2, 2))])
    if not len(body):
        return None
    groups = rings(body)
    centres = [body[g].reshape(-1, 2).mean(axis=0) for g in groups]
    lengths = [np.linalg.norm(body[g, 1] - body[g, 0], axis=1).sum() for g in groups]
    if below_crotch:
        # Both legs: the rings near her middle (her hands hang further out).
        kept = [i for i, c in enumerate(centres) if abs(c[0]) < 0.16 and lengths[i] > 0.05]
    else:
        kept = [int(np.argmax(lengths))]
    mine = np.concatenate([body[groups[i]] for i in kept])
    lo, hi = mine.reshape(-1, 2).min(axis=0), mine.reshape(-1, 2).max(axis=0)
    centre = (lo + hi) / 2
    out = {"body_w": hi[0] - lo[0], "body_d": hi[1] - lo[1], "centre": centre, "kept": mine, "all": body, "cloth": {}}

    cloth = {k.split("|", 1)[1]: v for k, v in cut.items() if k.startswith("Cloth|")}
    if not cloth:
        return out
    pts = np.concatenate([v.mean(axis=1) for v in cloth.values()])
    owner_segs = np.concatenate([np.full(len(v), name, dtype=object) for name, v in cloth.items()])
    # Only the cloth round her trunk or legs (not sleeves round her arms): what's nearer her than her arms.
    d_all, nearest = seg_distance(pts, body)
    kept_idx = np.concatenate([np.array(groups[i]) for i in kept])
    on_mine = np.isin(nearest, kept_idx)
    if not on_mine.any():
        return out
    pts, owner_segs = pts[on_mine], owner_segs[on_mine]
    gap, _ = seg_distance(pts, mine)
    # Inside her trunk, or inside either leg (two outlines: the even-odd rule counts each).
    dips = inside(pts, mine)
    rel = pts - centre
    front, back = (rel[:, 1] < 0) & (np.abs(rel[:, 1]) > np.abs(rel[:, 0])), (rel[:, 1] > 0) & (np.abs(rel[:, 1]) > np.abs(rel[:, 0]))
    sides = ~(front | back)
    clo, chi = pts.min(axis=0), pts.max(axis=0)

    def med(mask):
        ok = mask & ~dips
        return float(np.median(gap[ok])) if ok.any() else None

    out.update({
        "cloth_w": chi[0] - clo[0], "cloth_d": chi[1] - clo[1],
        "gap_front": med(front), "gap_sides": med(sides), "gap_back": med(back),
        "gap_max": float(gap[~dips].max()) if (~dips).any() else 0.0,
        "inside": float(dips.mean()), "inside_depth": float(gap[dips].max()) if dips.any() else 0.0,
        "materials": sorted(set(owner_segs)),
    })
    out["cloth"] = cloth
    return out


def picture_size(run, line, stature):
    """The picture's width (or depth, from a side view) at one of her lines, in metres, if it was measured there."""
    if not run:
        return None
    for r in run["rows"]:
        if r["line"] == line and r["measure"] in ("width", "depth") and not r["unsure"]:
            return r["picture"] * stature
    return None


def sections_report(main_run, side_run, path):
    """Cuts across her at her lines, drawn from above and measured. Writes the picture; returns report lines."""
    data = json.loads(Path(main_run["sections"]).read_text())
    step, slices = data["step"], data["slices"]
    world = dict(main_run["lines_world"])
    world["calf"] = world["knee"] * 0.62
    stature = main_run["stature"]
    front_run = main_run if main_run["view"] in ("front", "back") else None
    side = side_run if side_run and side_run["view"] in SIDE_VIEWS else (main_run if main_run["view"] in SIDE_VIEWS else None)

    found = []
    for name in SECTION_LINES:
        if name not in world:
            continue
        m = measure_section(section_at(slices, step, world[name]), world[name] < world.get("crotch", 0))
        if m:
            found.append((name, m))

    lines = ["sections (from above; cm across x front-to-back; cloth gap off her skin, front / sides / back, mm):"]
    cm = lambda v: f"{v * 100:.1f}"
    mm = lambda v: "-" if v is None else f"{v * 1000:.0f}"
    for name, m in found:
        txt = f"{name:<10}body {cm(m['body_w'])}x{cm(m['body_d'])}"
        if "cloth_w" in m:
            txt += (f"  cloth {cm(m['cloth_w'])}x{cm(m['cloth_d'])}  gap {mm(m['gap_front'])}/{mm(m['gap_sides'])}/"
                    f"{mm(m['gap_back'])} (max {mm(m['gap_max'])})")
            if m["inside"] > 0.02:
                txt += f"  INSIDE HER: {m['inside']:.0%} of it, up to {mm(m['inside_depth'])} mm deep"
        pw, pd = picture_size(front_run, name, stature), picture_size(side, name, stature)
        if pw or pd:
            outer_w, outer_d = m.get("cloth_w", m["body_w"]), m.get("cloth_d", m["body_d"])
            parts = []
            if pw:
                parts.append(f"width {cm(pw)} ({outer_w / pw - 1:+.0%})")
            if pd:
                parts.append(f"depth {cm(pd)} ({outer_d / pd - 1:+.0%})")
            txt += "  | picture " + ", ".join(parts)
            m["picture"] = (pw, pd)
        lines.append(txt)
    # Clipping between the lines too: every 2 cm from just above her ankles to her shoulders, where her clothes dip
    # inside her (a leg through a skirt shows between two lines as easily as on one).
    low, high = world["knee"] * 0.45, world.get("shoulders", world.get("waist", world["hips"]))
    clips = []
    for y in np.arange(low, high, 0.02):
        m = measure_section(section_at(slices, step, y), y < world.get("crotch", 0))
        if m and m.get("inside", 0) > 0.01:
            clips.append((y, m["inside"], m["inside_depth"]))
    if clips:
        worst = max(clips, key=lambda c: c[1] * c[2])
        span = f"{min(c[0] for c in clips):.2f}-{max(c[0] for c in clips):.2f} m"
        lines.append(f"CLIPPING: her clothes dip inside her at {len(clips)} heights ({span}); worst at {worst[0]:.2f} m "
                     f"({worst[1]:.0%} of the cut, up to {worst[2] * 1000:.0f} mm deep)")
    else:
        lines.append("clipping: none (checked every 2 cm from her ankles to her shoulders)")
    if not side:
        lines.append("(no side picture: depths are the model's only; add --side PICTURE to check them)")

    # The drawing: one cut per line, all at one scale, her front at the bottom, her right on the left (as seen
    # from above, matching the front view).
    size, pad = 230, 6
    reach = max(max(m.get("cloth_w", m["body_w"]), m.get("cloth_d", m["body_d"])) for _, m in found) * 1.25
    scale = (size - 2 * pad) / max(reach, 0.05)
    font = ImageFont.load_default(size=12)
    small = ImageFont.load_default(size=11)
    cols = min(4, len(found))
    rows_n = (len(found) + cols - 1) // cols
    cell_h = size + 46
    img = Image.new("RGB", (cols * (size + 8) + 8, rows_n * cell_h + 30), (24, 24, 28))
    d = ImageDraw.Draw(img)
    d.text((8, 8), "cuts across her, from above: her front at the bottom, grid 5 cm; tan her, colours her clothes,"
           " yellow the picture's width x depth", fill=(200, 200, 205), font=small)
    materials = sorted({mat for _, m in found for mat in m["cloth"]})
    colour_of = {mat: SECTION_COLOURS[i % len(SECTION_COLOURS)] for i, mat in enumerate(materials)}
    for n, (name, m) in enumerate(found):
        ox, oy = 8 + (n % cols) * (size + 8), 30 + (n // cols) * cell_h
        d.rectangle([ox, oy, ox + size, oy + size], fill=(34, 34, 40))
        c = m["centre"]
        to = lambda p: (ox + size / 2 - (p[0] - c[0]) * scale, oy + size / 2 - (p[1] - c[1]) * scale)
        for g in np.arange(-reach, reach, 0.05):
            x = ox + size / 2 + g * scale
            y = oy + size / 2 + g * scale
            if ox <= x <= ox + size:
                d.line([(x, oy), (x, oy + size)], fill=(48, 48, 56))
            if oy <= y <= oy + size:
                d.line([(ox, y), (ox + size, y)], fill=(48, 48, 56))
        for seg in m["all"]:
            d.line([to(seg[0]), to(seg[1])], fill=(110, 90, 80), width=1)
        for seg in m["kept"]:
            d.line([to(seg[0]), to(seg[1])], fill=(235, 190, 160), width=2)
        for mat, segs in m["cloth"].items():
            for seg in segs:
                d.line([to(seg[0]), to(seg[1])], fill=colour_of[mat], width=1)
        if m.get("picture"):
            pw, pd = m["picture"]
            hw = (pw or m.get("cloth_w", m["body_w"])) / 2 * scale
            hd = (pd or m.get("cloth_d", m["body_d"])) / 2 * scale
            cx, cy = ox + size / 2, oy + size / 2
            pts = [(cx + hw * math.cos(t), cy + hd * math.sin(t)) for t in np.linspace(0, 2 * math.pi, 49)]
            for k in range(0, 48, 2):
                d.line([pts[k], pts[k + 1]], fill=(255, 220, 0), width=2)
        d.text((ox + 4, oy + 4), name, fill=(255, 220, 0), font=font)
        d.text((ox + size - 4, oy + size - 14), "front", fill=(150, 150, 160), font=small, anchor="ra")
        info = f"body {cm(m['body_w'])}x{cm(m['body_d'])} cm"
        info2 = ""
        if "cloth_w" in m:
            info += f"  cloth {cm(m['cloth_w'])}x{cm(m['cloth_d'])}"
            info2 = f"gap f/s/b {mm(m['gap_front'])}/{mm(m['gap_sides'])}/{mm(m['gap_back'])} mm, max {mm(m['gap_max'])}"
            if m["inside"] > 0.02:
                info2 += f"  IN {m['inside']:.0%}"
        d.text((ox + 2, oy + size + 4), info, fill=(220, 220, 220), font=small)
        d.text((ox + 2, oy + size + 20), info2, fill=(220, 220, 220), font=small)
    legend_x = 8
    for mat, col in colour_of.items():
        d.text((legend_x, img.height - 16), mat, fill=col, font=small)
        legend_x += 9 * len(mat) + 16
    img.save(path)
    lines.append(f"sections: {path}")
    return lines


def compare_view(a, pic_path, view, box_arg, flip, job, stamp, out, sections=False):
    """One picture against her from one view: lines it up, measures it, writes its sheet into `out`. Returns what
    the report, the sections and the depth check need, or None after --grid."""
    out.mkdir(parents=True, exist_ok=True)
    img = ImageOps.exif_transpose(Image.open(pic_path))
    if flip:
        img = ImageOps.mirror(img)
    if a.grid:
        step = grid_image(img, out / "grid.png")
        print(f"grid: {out / 'grid.png'}  ({img.width}x{img.height}, lines every {step} px)")
        return None

    want_blender = a.render in ("both", "blender")
    job = {**job, "view": view, "frame": None, "sections": sections}

    # Her whole body first: her height lines come from it, and it's the picture's frame for --part full.
    full_size = (int(RENDER_H * 0.6), RENDER_H)
    rgb, info, shaded = render(job, full_size, want_blender and a.part == "full", not a.no_cache, stamp)
    full_info = info
    her = model_mask(rgb)
    top, bottom, _, _ = span_of(her)
    xc = centre_of(her, top, bottom)
    lv = levels(her, xc, top, bottom, view)
    mpp, cy, hh = info["mpp"], info["frame"]["cy"], info["h"] / 2
    to_y = lambda r: cy + (hh - r - 0.5) * mpp
    # Her lines in the world (metres up from the floor), and her height: what the sections are cut at and scaled by.
    lv_world = {name: to_y(r) for name, r in lv.items()}
    stature = (bottom - top) * mpp

    if a.part != "full":
        # Her part's span from the whole-body lines, rendered again framed on it, closer.
        r0, r1 = lv[PARTS[a.part][0]], lv[PARTS[a.part][1]]
        y0, y1 = to_y(r0), to_y(r1)
        span = y0 - y1
        body, _, _ = profile(her, xc, r0, r1)
        across = max(body.max(), 1) * mpp * 1.25
        height = span * 1.3
        aspect = float(np.clip(across / height, 0.5, 1.6))
        size = (int(RENDER_H * aspect), RENDER_H)
        x_off = (xc - info["w"] / 2) * mpp
        pjob = {**job, "frame": {"cy": (y0 + y1) / 2, "height": height, "cx": x_off}, "sections": False}
        rgb, pinfo, shaded = render(pjob, size, want_blender, not a.no_cache, stamp)
        # The whole-body lines carried into the close-up's rows.
        to_row = lambda y: (pinfo["frame"]["cy"] - y) / pinfo["mpp"] + pinfo["h"] / 2 - 0.5
        lv = {name: int(round(to_row(to_y(r)))) for name, r in lv.items()}
        her = model_mask(rgb)
        top, bottom = lv[PARTS[a.part][0]], lv[PARTS[a.part][1]]
        xc = pinfo["w"] / 2
        info = pinfo

    # The picture's outline and its span.
    pmask, how = picture_mask(img, a.keep_holes)
    if box_arg:
        x0, y0, x1, y1 = (float(v) for v in box_arg.split(","))
        box, aligned_by = (x0, y0, x1, y1), f"box {box_arg}"
    elif pmask is not None and a.part == "full":
        t, b, l, r = span_of(pmask)
        pc = centre_of(pmask, t, b)
        half = max(pc - l, r - pc)
        box, aligned_by = (pc - half, t, pc + half, b), f"its own outline ({how})"
    else:
        grid_image(img, out / "grid.png")
        why = how if a.part == "full" else f"--part {a.part} needs the span marked"
        sys.exit(
            f"can't line {pic_path.name} up by itself: {why}.\n"
            f"Read the span off {out / 'grid.png'} and run again with a box X0,Y0,X1,Y1 for it\n"
            f"(Y0 = {PARTS[a.part][0]}, Y1 = {PARTS[a.part][1]}; X0..X1 across her, centred on her middle)."
        )

    ref_rgb, ref_mask, scale = place(img, pmask, box, (xc, top, bottom), (info["w"], info["h"]))

    # Widths at her lines, and along the whole span, picture vs model, as a share of the span's height.
    span_px = bottom - top
    hb, hl, hg = profile(her, xc, top, bottom)
    rows = []
    measure = "depth" if view in SIDE_VIEWS else "width"
    if ref_mask is not None:
        rb, rl, rg = profile(ref_mask, xc, top, bottom)
        # Her lines inside the span (not on its edges, where a hand-marked box is least exact); a close-up's few
        # lines are joined by rows every 10% down it.
        targets = [(name, r) for name, r in lv.items() if 0.03 * span_px <= r - top <= 0.97 * span_px]
        if a.part != "full":
            targets += [(f"{p}%", top + int(span_px * p / 100)) for p in range(10, 100, 10)]
        for name, r in sorted(targets, key=lambda kv: kv[1]):
            i = r - top
            use_leg = name == "knee" and hg[i] > 0 and rg[i] > 0 and view not in SIDE_VIEWS
            ref_w, her_w = (rg[i], hg[i]) if use_leg else ((rb[i] or rl[i]), (hb[i] or hl[i]))
            if not ref_w or not her_w:
                continue
            # A reading that jumps between the rows just above and below is an arm or hand joining the outline
            # there (or a gap closing), not her shape: kept, but marked and left out of "biggest".
            near = []
            step = max(2, span_px // 80)
            for j in (i - 2 * step, i - step, i + step, i + 2 * step):
                if 0 <= j <= span_px:
                    rw, hw = (rg[j], hg[j]) if use_leg else ((rb[j] or rl[j]), (hb[j] or hl[j]))
                    if rw and hw:
                        near.append(hw / rw - 1)
            unsure = bool(sum(abs(d - (her_w / ref_w - 1)) > 0.08 for d in near) >= 3)
            rows.append({
                "unsure": unsure, "line": name, "at": round(i / span_px, 3),
                "measure": "one leg" if use_leg else measure,
                "picture": round(ref_w / span_px, 4), "model": round(her_w / span_px, 4),
                "diff": round(her_w / ref_w - 1, 3),
            })
        iou = float((ref_mask & her).sum() / max(1, (ref_mask | her).sum()))
        # The picture's own lines, where it has a whole body: proportions, not just widths.
        own = None
        if a.part == "full":
            pt, pb, _, _ = span_of(ref_mask)
            own = levels(ref_mask, xc, pt, pb, view)
            own = {k: round((v - pt) / max(1, pb - pt), 3) for k, v in own.items()}
    else:
        iou, own = None, None

    worst = sorted((r for r in rows if not r["unsure"]), key=lambda r: -abs(r["diff"]))
    lines_txt = [f"refcompare  {pic_path.name}  view={view}  part={a.part}  outfit={info.get('outfit')}  aligned by {aligned_by}"]
    if rows:
        lines_txt.append(f"outline overlap (IoU) {iou:.2f}   (1.00 = same outline)")
        lines_txt.append(f"{'line':<10}{'at':>6}{'picture':>9}{'model':>8}{'diff':>8}   ({rows[0]['measure']}, share of the span's height)")
        for r in rows:
            flag = "  <-- model wider" if r["diff"] > 0.05 else ("  <-- model narrower" if r["diff"] < -0.05 else "")
            if r["unsure"]:
                flag += "  (unsure: arm/hand/gap at this line, check the overlay)"
            lines_txt.append(f"{r['line']:<10}{r['at']:>6.0%}{r['picture']:>9.3f}{r['model']:>8.3f}{r['diff']:>+8.0%}{flag}")
        if own:
            ours = {k: round((v - top) / max(1, span_px), 3) for k, v in lv.items()}
            moved = [f"{k} {ours[k]:.0%} vs {own[k]:.0%}" for k in ("neck", "shoulders", "waist", "hips", "crotch", "knee")
                     if abs(ours[k] - own[k]) >= 0.015]
            lines_txt.append("height lines (model vs picture, down from the top): " + (", ".join(moved) if moved else "all within 1.5%"))
        big = [f"{r['line']} {r['diff']:+.0%}" for r in worst[:3] if abs(r["diff"]) >= 0.02]
        lines_txt.append("biggest: " + (", ".join(big) if big else "none over 2%"))
    else:
        lines_txt.append(f"no numbers: the picture's outline isn't known ({how}); compare the overlay by eye")

    ov = overlay_image(ref_rgb, ref_mask, her)
    panels = [("picture", ref_rgb), ("game", rgb)]
    if shaded is not None and a.render != "game":
        panels.append(("blender", shaded))
    if a.render == "blender" and shaded is not None:
        panels = [p for p in panels if p[0] != "game"]
    panels.append(("overlay: cyan model, magenta picture", ov))
    diffs = {r["line"]: f"{r['diff']:+.0%}{'?' if r['unsure'] else ''}" for r in rows}
    named = [(k, v, diffs.get(k, "")) for k, v in lv.items()]
    named += [(r["line"], top + int(round(r["at"] * span_px)), diffs[r["line"]]) for r in rows if r["line"] not in lv]
    table = {r["line"] for r in rows}
    footer = [lines_txt[0]] + [l for l in lines_txt[1:] if not l.startswith("line ") and l.split()[0] not in table]
    sheet(panels, named, f"{view} {a.part}  scale x{scale:.2f}", footer[:5], a.panel).save(out / "sheet.png")
    Image.fromarray(ov).save(out / "overlay.png")
    Image.fromarray(ref_rgb).save(out / "picture_aligned.png")
    Image.fromarray(rgb).save(out / "game.png")
    if shaded is not None:
        Image.fromarray(shaded).save(out / "blender.png")
    lines_txt.append(f"sheet: {out / 'sheet.png'}")
    return {
        "picture": str(pic_path), "view": view, "part": a.part, "aligned_by": aligned_by, "box": box,
        "iou": iou, "rows": rows, "picture_lines": own,
        "model_lines": {k: round((v - top) / max(1, span_px), 3) for k, v in lv.items()},
        "lines_world": {k: round(v, 4) for k, v in lv_world.items()}, "stature": round(stature, 4),
        "sections": str(Path(full_info["folder"]) / "sections.json") if sections else None,
        "text": lines_txt, "out": str(out),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("picture")
    ap.add_argument("--view", default="front")
    ap.add_argument("--part", default="full", choices=list(PARTS))
    ap.add_argument("--box")
    ap.add_argument("--flip", action="store_true")
    ap.add_argument("--side")
    ap.add_argument("--side-view", default="left")
    ap.add_argument("--side-box")
    ap.add_argument("--side-flip", action="store_true")
    ap.add_argument("--no-sections", action="store_true")
    ap.add_argument("--grid", action="store_true")
    ap.add_argument("--keep-holes", action="store_true")
    ap.add_argument("--outfit")
    ap.add_argument("--cup")
    ap.add_argument("--slider", action="append", default=[])
    ap.add_argument("--look")
    ap.add_argument("--model")
    ap.add_argument("--posed", action="store_true")
    ap.add_argument("--render", default="both", choices=["both", "game", "blender"])
    ap.add_argument("--flat", action="store_true")
    ap.add_argument("--tag")
    ap.add_argument("--panel", type=int, default=640)
    ap.add_argument("--no-cache", action="store_true")
    a = ap.parse_args()
    view = "left" if a.view == "side" else a.view
    side_view = "left" if a.side_view == "side" else a.side_view

    pic_path = Path(a.picture)
    tag = a.tag or f"{pic_path.stem}_{view}_{a.part}"
    out = OUT / tag

    # Her look: the player's start (or a --look file), the outfit put on as the game does (wearOutfit: its colours
    # and underwear), and any sliders over it.
    sliders = {}
    if a.cup:
        # appearance.ts CUPS and stopValue: A at -1, C at 0, Q at 1, on past it to Z by the same step.
        i = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".index(a.cup.upper())
        sliders["bust"] = (i - 2) / 14 if i >= 2 else (i - 2) / 2
    for s in a.slider:
        k, v = s.split("=")
        sliders[k] = float(v)
    job = {
        "look": json.loads(Path(a.look).read_text()) if a.look else None, "outfit": a.outfit, "sliders": sliders,
        "posed": a.posed, "colours": "flat" if a.flat else "game",
    }
    if a.model:
        # Another build of her (a scratch build, checked before it's installed); its time keys the cache.
        job["model"] = str(Path(a.model).resolve())
        job["model_time"] = Path(a.model).stat().st_mtime_ns
    stamp = source_stamp()
    want_sections = not a.no_sections and a.part == "full"

    main_run = compare_view(a, pic_path, view, a.box, a.flip, job, stamp, out, sections=want_sections)
    if main_run is None:
        if a.side:
            compare_view(a, Path(a.side), side_view, None, a.side_flip, job, stamp, out / "side")
        return
    side_run = None
    if a.side:
        side_run = compare_view(a, Path(a.side), side_view, a.side_box, a.side_flip, job, stamp, out / "side")

    text = list(main_run["text"])
    if side_run:
        text += [""] + side_run["text"]
    if want_sections:
        text += [""] + sections_report(main_run, side_run, out / "sections.png")
    report = {"main": {k: v for k, v in main_run.items() if k != "text"}, "look": job,
              "side": {k: v for k, v in side_run.items() if k != "text"} if side_run else None}
    (out / "report.json").write_text(json.dumps(report, indent=1))
    (out / "report.txt").write_text("\n".join(text) + "\n", encoding="utf8")
    print("\n".join(text))


if __name__ == "__main__":
    main()
