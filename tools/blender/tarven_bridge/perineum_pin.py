"""Makes the folded skin between her vulva and anus move as one with her hips (2026-11-21).

  D:/blender/blender.exe -b <file.blend> --python tools/blender/tarven_bridge/perineum_pin.py -- [out.blend]

Her perineum is a knot of skin folded over itself (see perineum_patch.py / perineum_press.py: it can't be cut out or
pressed flat cleanly). Its folds carried different weights, so with her legs apart they moved apart and poked out as
specks and tears. Here only weights change: every point in the knot (the box CORE) goes wholly to her Hips, so all
its folds move as one rigid piece and can never come apart, and her weights blend back to her own over FADE out from
it, across single-layer skin, so the stretch of her legs opening is spread evenly there (a pin with a short fade was
tried earlier and tore the skin at its edge). Her shape and points are untouched. Backs the file up when saving over it.
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
env = lambda k, d: [float(v) for v in os.environ.get(k, d).split()]  # noqa: E731
CORE = env("PIN_CORE", "-0.012 0.012 0.020 0.050 0.885 0.94")   # x, y, z ranges of the knot
FADE, = env("PIN_FADE", "0.015")
PIN = os.environ.get("PIN_BONE", "Female_Hips")
SKIP = {"T_lingerie", "T_pubic"}

body = bpy.data.objects["Female_Body"]
me = body.data
names = [m.name if m else "" for m in me.materials]
n = len(me.vertices)
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
skip = np.zeros(n, bool)
for p in me.polygons:
    if names[p.material_index] in SKIP:
        skip[list(p.vertices)] = True
lo = np.array(CORE[0::2])
hi = np.array(CORE[1::2])
out = np.linalg.norm(np.maximum(lo - co, 0) + np.maximum(co - hi, 0), axis=1)   # distance outside the box
t = np.clip(1 - out / FADE, 0, 1)
pin = t * t * (3 - 2 * t) * ~skip
gi = body.vertex_groups[PIN].index
groups = body.vertex_groups
touched = np.nonzero(pin > 0)[0]
for v in touched:
    own = {g.group: g.weight for g in me.vertices[int(v)].groups}
    total = sum(own.values()) or 1
    new = {k: w / total * (1 - pin[v]) for k, w in own.items()}
    new[gi] = new.get(gi, 0) + pin[v]
    top = sorted(new.items(), key=lambda kv: -kv[1])[:4]
    s = sum(w for _, w in top) or 1
    for k in own:
        groups[k].remove([int(v)])
    for k, w in top:
        if w > 1e-4:
            groups[k].add([int(v)], float(w / s), "REPLACE")
print(f"perineum_pin: {int((pin >= 0.999).sum())} points wholly on {PIN}, {len(touched)} in all with the fade")

if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    stem = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
    shutil.copy2(bpy.data.filepath, os.path.join(backups, f"{stem}_{time.strftime('%Y%m%d_%H%M%S')}_before_perineum_pin.blend"))
print("perineum_pin: saved", core.save_blend(OUT))
