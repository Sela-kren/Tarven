"""Gives the master her soft bust bones (tools/blender/bust_soft.py): four on each breast, sharing the Bust bone's
weight on her skin and on everything she wears. Safe to run again.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/bust_bones.py -- [out.blend]

With no out.blend it backs the master up to ref/_sculpt_backups and saves over it (close it in Blender first, or
revert there afterwards without saving).
"""
import json
import os
import shutil
import sys
import time

import bpy

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))
import bust_soft  # noqa: E402
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = argv[0] if argv else None

coll = bpy.data.collections[core.MASTER_COLLECTION]
rig = next(o for o in coll.all_objects if o.type == "ARMATURE")
summary = bust_soft.apply(rig, list(coll.all_objects))
print("bust_bones:", json.dumps(summary))

if out is None:
    master = bpy.data.filepath
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}_before_bust_bones.blend")
    shutil.copy2(master, backup)
    print("backed up to", backup)
    out = master
bpy.ops.wm.save_as_mainfile(filepath=out, copy=out != bpy.data.filepath)
print("saved", out)
