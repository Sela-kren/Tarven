"""Her tee's hem follows her bust (the user, 2026-11-20): the tee is built long (rebuild_cloth.py CUT["crop_long"]),
and at each reviewed cup the length she doesn't need is folded up under the hem, so it ends just under her bust, and
never above the crop of the reference (CUT["crop"], a hand over the navel): cropped at small cups, hanging past a big
bust. Stored as that cup's "_CLOTH_DRAPE_<cup>" on Female_ClothTee, which the game lays on last and blends between
cups (appearance.ts MeshSlot.drapes), measured against the game's own fit at that cup (the bridge server).

  D:/blender/blender.exe -b <master>.blend --python tools/blender/tarven_bridge/hem_bake.py -- <out.blend> [server url]

The server must serve this master's export (Send, or BRIDGE_MODEL), so its points are this tee's.
"""
import base64
import sys

import bpy
import numpy as np

import addon_utils

addon_utils.enable("tarven_bridge", default_set=False)
import tarven_bridge.cloth as cloth  # noqa: E402
import tarven_bridge.gameview as gv  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
if len(argv) > 1:
    gv.URL = argv[1]

CROP = 1.16          # the reference's crop: the hem never sits higher than this
BELOW_BUST = 0.015   # how far under her bust's lowest point the hem hangs
TUCK = 0.003         # the folded-up length sits this far in under the cloth above it
FOLD = 0.04          # ...squeezed into this band above the hem


def floats(text, width):
    return np.frombuffer(base64.b64decode(text), dtype="<f4").reshape(-1, width)


def front_rows(result):
    """Her front's reach (y) by height, over her middle."""
    pts = np.concatenate([floats(m["positions"], 3) for m in result["meshes"]
                          if m.get("object") == "Female_Body" and m["material"] in ("T_skin_f", "T_bra", "T_smalls")])
    front = pts[(np.abs(pts[:, 0]) < 0.16) & (pts[:, 1] > 0.0)]
    rows = {}
    for z in np.arange(0.90, 1.42, 0.005):
        band = front[np.abs(front[:, 2] - z) < 0.004]
        if len(band):
            rows[round(float(z), 3)] = float(band[:, 1].max())
    return rows


def bust_bottom(rows, belly):
    """Her bust's lowest point at the front: down from its fullest, the last height her front still stands 1.5 cm
    proud of her belly (her belly's reach measured at a C cup, where her bust doesn't cover it)."""
    zs = sorted(rows)
    apex = max((z for z in zs if z > 1.15), key=lambda z: rows[z])
    bottom = apex
    for z in sorted((z for z in zs if z < apex), reverse=True):
        if rows[z] < belly + 0.015:
            break
        bottom = z
    return bottom


sc = bpy.context.scene
gv._schema = gv._request("/schema")
gv._fill(sc, gv._schema)
gv._to_start(sc)
sc.tarven_gv.outfit = "tee"
c_rows = front_rows(cloth._shape(sc, cloth._cup_value("C")))
belly = c_rows[min(c_rows, key=lambda z: abs(z - 1.10))]
LONGEST = 1.01        # the tee as built ends at 1.00: the hem never asks for more
for letter in cloth.REVIEWED:
    result = cloth._shape(sc, cloth._cup_value(letter))
    bottom = bust_bottom(front_rows(result), belly)
    hem = max(LONGEST, min(CROP, bottom - BELOW_BUST))
    moves = {}
    for m in result["meshes"]:
        if m.get("object") != "Female_ClothTee" or m["material"] != "T_tee":
            continue
        p = floats(m["positions"], 3)
        target = p.copy()
        low = p[:, 2] < hem
        if low.any():
            # Folded up under the hem: squeezed into a band just above it, each point under the cloth at the hem in
            # its own direction round her (a little in from it), not left as far out as the long tee hung there.
            centre = np.array([0.0, 0.03])
            depth = hem - p[low, 2]
            target[low, 2] = hem + FOLD * (1 - np.exp(-depth / 0.05))
            ring = p[(p[:, 2] >= hem) & (p[:, 2] < hem + 0.025)]
            rel = p[low, :2] - centre
            ang = np.arctan2(rel[:, 1], rel[:, 0])
            if len(ring):
                ring_rel = ring[:, :2] - centre
                ring_ang = np.arctan2(ring_rel[:, 1], ring_rel[:, 0])
                ring_r = np.hypot(ring_rel[:, 0], ring_rel[:, 1])
                diff = np.abs(((ang[:, None] - ring_ang[None, :]) + np.pi) % (2 * np.pi) - np.pi)
                r_hem = ring_r[np.argmin(diff, axis=1)]
            else:
                r_hem = np.hypot(rel[:, 0], rel[:, 1])
            r_new = np.maximum(r_hem - TUCK, 0.02)
            target[low, 0] = centre[0] + np.cos(ang) * r_new
            target[low, 1] = centre[1] + np.sin(ang) * r_new
        moves[m["key"]] = (target - p, m.get("object"))
    written = cloth.store(letter, moves)
    print(f"HEM {letter}: bust bottom {bottom:.3f}, hem at {hem:.3f}", written, flush=True)

bpy.ops.wm.save_as_mainfile(filepath=OUT, relative_remap=True)
print("SAVED", OUT)
