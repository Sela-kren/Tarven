"""Opens her legs in the crotch sculpt file (art/female_vulva_edit.blend) so her vulva is easy to see and reach.

  D:/blender/blender.exe -b art/female_vulva_edit.blend --python tools/blender/tarven_bridge/vulva_pose.py -- [degrees]

Brings her rig in from the master and turns each thigh out by `degrees` (25 by default) through an Armature modifier:
strokes land on her rest shape (what vulva_in.py reads back), the pose is only how she's shown. Also clears the mask,
shows all of her, and keeps the overlay shells out of sight: their points, tucked inside her pelvis by vulva_edit.py,
leave every bone group so the pose doesn't spread them back out, and their faces stay hidden.
"""
import math
import os
import sys

import bpy
from mathutils import Matrix

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ANGLE = float(argv[0]) if argv else 25.0
OVERLAYS = {"T_lingerie", "T_pubic"}

body = bpy.data.objects["Female_Body"]
me = body.data
mask = me.attributes.get(".sculpt_mask")
if mask is not None:
    me.attributes.remove(mask)

names = [m.name if m else "" for m in me.materials]
over_faces = [p.index for p in me.polygons if names[p.material_index] in OVERLAYS]
over = sorted({v for i in over_faces for v in me.polygons[i].vertices})
for g in body.vertex_groups:
    g.remove(over)
for p in me.polygons:
    p.hide = names[p.material_index] in OVERLAYS
for e in me.edges:
    e.hide = False
for v in me.vertices:
    v.hide = False
me.update()

rig = bpy.data.objects.get("Female_Armature")
if rig is None:
    with bpy.data.libraries.load(core.master_path(), link=False) as (src, dst):
        dst.objects = ["Female_Armature"]
    rig = dst.objects[0]
    body.users_collection[0].objects.link(rig)
mod = next((m for m in body.modifiers if m.type == "ARMATURE"), None) or body.modifiers.new("Armature", "ARMATURE")
mod.object = rig
for side, sign in (("L", 1), ("R", -1)):
    pb = rig.pose.bones[f"Female_Thigh_{side}"]
    head = pb.bone.head_local
    turn = Matrix.Translation(head) @ Matrix.Rotation(math.radians(ANGLE * sign), 4, "Y") @ Matrix.Translation(-head)
    pb.rotation_mode = "QUATERNION"
    pb.matrix = turn @ pb.bone.matrix_local
rig.hide_set(True)
bpy.context.view_layer.update()
print(f"vulva_pose: thighs out {ANGLE} degrees, {len(over)} overlay points unbound")
print("vulva_pose: saved", core.save_blend())
