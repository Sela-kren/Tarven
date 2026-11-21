"""Bakes an outfit's cloth drapes at every cup, headless: the Cloth panel's "Bake drape" without opening Blender.

  (npm run bridge, on the game's current female.glb)
  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/bake_drapes.py -- <outfit> [A,B,...] [--no-send]

For each cup the bridge server shapes her as the game does in that outfit, drapes off (with the sculpted cup keys,
appearance.ts cupKeyMove), the cloth panel's simulation runs over her (its saved settings), and the move from the
game's fit is stored on the master garment as "_CLOTH_DRAPE_<cup>". Drapes at cups no longer on the slider go. The
master is backed up first, saved (core.save_blend) and sent.
"""
import os
import shutil
import sys
import time

import bpy

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import tarven_bridge  # noqa: E402

if not hasattr(bpy.types.Scene, "tarven_cloth"):
    tarven_bridge.register()
from tarven_bridge import cloth, core  # noqa: E402
from tarven_bridge import gameview as gv  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUTFIT = argv[0] if argv else "tee"
LETTERS = [c for c in (argv[1] if len(argv) > 1 and not argv[1].startswith("--") else ",".join(cloth.REVIEWED)).split(",") if c]
SEND = "--no-send" not in argv

gv._schema = gv._request("/schema", timeout=60)
cups = dict((label, value) for label, value in gv._schema.get("cups", []))
scene = bpy.context.scene

backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
os.makedirs(backups, exist_ok=True)
backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}_before_bake_{OUTFIT}.blend")
shutil.copy2(bpy.data.filepath, backup)
print("bake_drapes: backed up to", backup)

garments = set()
for letter in LETTERS:
    started = time.time()
    job = {"sliders": {"bust": cups[letter]}, "outfit": OUTFIT, "nude": False, "posed": False, "known": [], "noDrape": True}
    result = gv._request("/shape", job, timeout=600)
    moves = cloth.simulate(scene, result)
    written = cloth.store(letter, moves)
    garments.update(written)
    print(f"bake_drapes: {letter}: {', '.join(written)} ({time.time() - started:.0f} s)", flush=True)

# Drapes at cups the slider no longer has (Q, U, Z) on the garments just baked.
master = bpy.data.collections[core.MASTER_COLLECTION]
for name in garments:
    mesh = master.all_objects[name].data
    for attr in [a.name for a in mesh.attributes if a.name.startswith("_CLOTH_DRAPE_")]:
        if attr[-1] not in cloth.REVIEWED:
            mesh.attributes.remove(mesh.attributes[attr])
            print("bake_drapes: removed", name, attr)

core.save_blend()
print("bake_drapes: saved", bpy.data.filepath)
if SEND:
    print("bake_drapes: sent", core.export_master())
