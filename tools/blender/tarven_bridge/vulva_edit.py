"""A body-only copy of the master for sculpting her vulva (2026-11-21): art/female_vulva_edit.blend.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/vulva_edit.py

Only Female_Body is kept (no rig, clothes or other pieces), at rest. Every face further than RADIUS from her vulva is
hidden, so sculpting can't touch the rest of her, and the overlay shells (lingerie, pubic hair) are tucked out of sight too:
they follow her skin when the edit is read back (vulva_in.py). X mirror is on. Her points as made are kept in
ref/_sculpt_work/vulva/as_made.npy, so the read-back takes only what was sculpted since.
"""
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

RADIUS = 0.15  # her whole crotch: mons, vulva, groin, inner thighs, between her legs
VULVA = {"T_vulva", "T_labia", "T_canal", "T_hole"}
OVERLAYS = {"T_lingerie", "T_pubic"}
OUT = os.path.join(core.repo_root(), "art", "female_vulva_edit.blend")
WORK = os.path.join(core.repo_root(), "ref", "_sculpt_work", "vulva")

body = bpy.data.objects["Female_Body"]
for o in list(bpy.data.objects):
    if o is not body:
        bpy.data.objects.remove(o, do_unlink=True)
for m in list(body.modifiers):
    body.modifiers.remove(m)
body.parent = None
if body.name not in bpy.context.scene.collection.objects:
    bpy.context.scene.collection.objects.link(body)

me = body.data
co = np.empty(len(me.vertices) * 3)
me.vertices.foreach_get("co", co)
co = co.reshape(-1, 3)
names = [m.name if m else "" for m in me.materials]
mats = np.empty(len(me.polygons), np.int32)
me.polygons.foreach_get("material_index", mats)
vulva_mats = [i for i, n in enumerate(names) if n in VULVA]
vulva_pts = set()
for p in me.polygons:
    if p.material_index in vulva_mats:
        vulva_pts.update(p.vertices)
centre = co[list(vulva_pts)].mean(0)
near = np.linalg.norm(co - centre, axis=1) < RADIUS
hidden = 0
for p in me.polygons:
    hide = names[p.material_index] in OVERLAYS or not near[list(p.vertices)].all()
    p.hide = hide
    hidden += hide
for v in me.vertices:
    v.hide = not near[v.index]
for e in me.edges:
    e.hide = not (near[e.vertices[0]] and near[e.vertices[1]])
# The overlay shells (her lingerie patch, her pubic hair, standing up to 2 cm off her skin) out of sight in every mode:
# all their points pulled to one spot inside her pelvis. The read-back rebuilds them from the skin, never from here.
over = sorted({v for p in me.polygons if names[p.material_index] in OVERLAYS for v in p.vertices})
tucked = co.copy()
tucked[over] = (0.0, 0.03, 0.97)
me.vertices.foreach_set("co", tucked.ravel())
me.use_mirror_x = True
me.update()

os.makedirs(WORK, exist_ok=True)
np.save(os.path.join(WORK, "as_made.npy"), co)
np.save(os.path.join(WORK, "centre.npy"), centre)
print("vulva_edit: centre", centre.round(3).tolist(), "shown faces", len(me.polygons) - hidden)

bpy.context.view_layer.objects.active = body
body.select_set(True)
print("vulva_edit: saved", core.save_blend(OUT))
