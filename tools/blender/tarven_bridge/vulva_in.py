"""Reads the user's crotch sculpt (art/female_vulva_edit.blend, made by vulva_edit.py) back into the master.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/vulva_in.py
  then: npm run send

Each skin point's move since the edit file was made (ref/_sculpt_work/vulva/as_made.npy) goes onto the master's
Female_Body. The overlay shells (lingerie, pubic hair), hidden while sculpting, follow the skin under them (the
average move of their 4 nearest skin points). The master is backed up first and saved with core.save_blend.
"""
import os
import shutil
import sys
import time

import bpy
import numpy as np
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

ROOT = core.repo_root()
EDIT = os.path.join(ROOT, "art", "female_vulva_edit.blend")
AS_MADE = os.path.join(ROOT, "ref", "_sculpt_work", "vulva", "as_made.npy")
OVERLAYS = {"T_lingerie", "T_pubic"}
NEAREST = 4

body = bpy.data.objects["Female_Body"]
me = body.data
n = len(me.vertices)
made = np.load(AS_MADE)
assert made.shape == (n, 3), "the master's body no longer has the points the edit file was made from"

with bpy.data.libraries.load(EDIT) as (src, dst):
    dst.meshes = [m for m in src.meshes if m == "Female_Body"]
edit_mesh = dst.meshes[0]
try:
    assert len(edit_mesh.vertices) == n, "the edit file's body has a different point count (remeshed?)"
    now = np.empty(n * 3)
    edit_mesh.vertices.foreach_get("co", now)
    move = now.reshape(-1, 3) - made
finally:
    bpy.data.meshes.remove(edit_mesh)

names = [m.name if m else "" for m in me.materials]
overlay = np.zeros(n, bool)
for p in me.polygons:
    if names[p.material_index] in OVERLAYS:
        overlay[list(p.vertices)] = True
co = np.empty(n * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
skin = np.nonzero(~overlay)[0]
moved_skin = skin[np.linalg.norm(move[skin], axis=1) > 1e-6]
print(f"vulva_in: {len(moved_skin)} skin points moved, most {np.linalg.norm(move, axis=1).max() * 1000:.1f} mm")
if len(moved_skin):
    tree = KDTree(len(skin))
    for k, v in enumerate(skin):
        tree.insert(co[v], k)
    tree.balance()
    for v in np.nonzero(overlay)[0]:
        found = tree.find_n(co[v], NEAREST)
        w = np.array([1.0 / max(d, 1e-5) for _, _, d in found])
        move[v] = (w[:, None] * move[skin[[i for _, i, _ in found]]]).sum(0) / w.sum()

    backups = os.path.join(ROOT, "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}_before_vulva_in.blend")
    shutil.copy2(bpy.data.filepath, backup)
    print("vulva_in: backed up to", backup)
    me.vertices.foreach_set("co", (co + move).ravel())
    me.update()
    print("vulva_in: saved", core.save_blend())
