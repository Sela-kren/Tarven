"""Gives the master her foot bones (tools/blender/foot_bones.py: an ankle and a ball-of-the-foot joint on each leg) and
builds her shoes round her own feet (tools/blender/foot_shoes.py). Safe to run again.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/foot_rig.py -- [out.blend]

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
import foot_bones  # noqa: E402
import foot_shoes  # noqa: E402
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out = argv[0] if argv else None

coll = bpy.data.collections[core.MASTER_COLLECTION]
rig = next(o for o in coll.all_objects if o.type == "ARMATURE")
print("foot_bones:", json.dumps(foot_bones.apply(rig, list(coll.all_objects))))
print("foot_shoes:", json.dumps(foot_shoes.build(rig, coll)))
bpy.ops.outliner.orphans_purge(do_recursive=True)

if out is None:
    master = bpy.data.filepath
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}_before_foot_rig.blend")
    shutil.copy2(master, backup)
    print("backed up to", backup)
    out = master
core.save_blend(out)
print("saved", out)
