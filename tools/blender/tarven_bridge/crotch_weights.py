"""Blurs the skin weights across her crotch, so opening her legs stretches it evenly (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/crotch_weights.py -- [out.blend]

Run on the master (art/female_master.blend, then npm run send) and on the crotch sculpt file. Her vulva and anus were
joined onto her body with their own weights (her vulva 93% Hips, the skin round it about 70% legs), so where they meet,
between them, the weights jump, and with her legs apart all the stretch landed in that one band of tiny triangles,
which folded up. The tutorials' fix (blur the weights at the joints) by distance, not along the mesh (its triangles
there run from a tenth of a millimetre to centimetres): each point's weights are averaged with those within about
BLUR of it (a 3 mm grid, blurred), each side of her on its own (her left leg's weight never crosses the gap to her
right thigh), fully within FULL of her perineum and fading to her own weights by FADE. Pinning the middle strip to her
Hips was tried first and tore the skin either side of it. Backs the file up when saving over it.
"""
import os
import shutil
import sys
import time

import bpy
import numpy as np

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else None
CELL = 0.003                      # grid the weights are blurred on
BLUR = 3                          # box-blur half-width in cells, three times over (about 1 cm)
FULL, FADE = 0.05, 0.075          # from her perineum
OVERLAYS = {"T_lingerie", "T_pubic"}
VULVA, ANUS = {"T_vulva", "T_labia"}, {"T_anus", "T_anus_skin"}

body = bpy.data.objects["Female_Body"]
me = body.data
n = len(me.vertices)
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
mats = [m.name if m else "" for m in me.materials]
overlay = np.zeros(n, bool)
vul, an = set(), set()
for p in me.polygons:
    name = mats[p.material_index]
    if name in OVERLAYS:
        overlay[list(p.vertices)] = True
    elif name in VULVA:
        vul.update(p.vertices)
    elif name in ANUS:
        an.update(p.vertices)
centre = (co[list(vul)].mean(0) + co[list(an)].mean(0)) / 2
dist = np.linalg.norm(co - centre, axis=1)
t = np.clip((dist - FULL) / (FADE - FULL), 0, 1)
fade = (1 - t * t * (3 - 2 * t)) * ~overlay
region = np.nonzero(fade > 0)[0]

groups = {g.index: g.name for g in body.vertex_groups}
chan = {}
rows = []
for v in region:
    ws = {g.group: g.weight for g in me.vertices[v].groups if g.weight > 0}
    total = sum(ws.values()) or 1.0
    rows.append({k: w / total for k, w in ws.items()})
    for k in ws:
        chan.setdefault(k, len(chan))
W = np.zeros((len(region), len(chan)))
for i, ws in enumerate(rows):
    for k, w in ws.items():
        W[i, chan[k]] = w


def box_blur(grid, axis, r):
    pad = [(0, 0)] * grid.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(grid, pad), axis=axis)
    hi = np.take(c, np.arange(2 * r + 1, c.shape[axis]), axis=axis)
    lo = np.take(c, np.arange(0, c.shape[axis] - 2 * r - 1), axis=axis)
    return hi - lo


blurred = np.zeros_like(W)
P = co[region]
for side in (1, -1):
    src = P[:, 0] * side >= -0.003           # this side, and the middle
    dst = P[:, 0] * side >= 0 if side == 1 else P[:, 0] < 0
    lo = P[src].min(0) - CELL * (3 * BLUR + 2)
    idx = np.floor((P - lo) / CELL).astype(int)
    shape = tuple(idx[src].max(0) + 3 * BLUR + 3)
    sums = np.zeros(shape + (len(chan),))
    count = np.zeros(shape)
    np.add.at(sums, tuple(idx[src].T), W[src])
    np.add.at(count, tuple(idx[src].T), 1)
    for _ in range(3):
        for axis in range(3):
            sums = box_blur(sums, axis, BLUR)
            count = box_blur(count, axis, BLUR)
    at = tuple(np.clip(idx[dst], 0, np.array(shape) - 1).T)
    blurred[dst] = sums[at] / np.maximum(count[at], 1e-9)[:, None]

f = fade[region][:, None]
new = W * (1 - f) + blurred * f
top = np.argsort(-new, axis=1)[:, :4]
keys = list(chan)
for i, v in enumerate(region):
    ks = [k for k in top[i] if new[i, k] > 1e-4]
    total = sum(new[i, k] for k in ks)
    for g in [g.group for g in me.vertices[v].groups]:
        body.vertex_groups[g].remove([int(v)])
    for k in ks:
        body.vertex_groups[keys[k]].add([int(v)], float(new[i, k] / total), "REPLACE")
leg = [i for i, k in enumerate(keys) if any(s in groups[k] for s in ("Thigh", "Glute"))]
print(f"crotch_weights: {len(region)} points blurred round {np.round(centre, 3).tolist()}; "
      f"leg share in the vulva {W[np.isin(region, list(vul))][:, leg].sum(1).mean():.2f} -> "
      f"{new[np.isin(region, list(vul))][:, leg].sum(1).mean():.2f}")

if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    stem = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
    shutil.copy2(bpy.data.filepath, os.path.join(backups, f"{stem}_{time.strftime('%Y%m%d_%H%M%S')}_before_crotch_weights.blend"))
print("crotch_weights: saved", core.save_blend(OUT))
