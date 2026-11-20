"""Makes a master with the user's hand-sculpted real_heroin as her skin (2026-11-20).

Run on a build made with heroic + real_heroin on (the swap, which carries the outfits, hair and the game's grids
onto real_heroin and moves the bones to hers), saved with TARVEN_SAVE_MASTER:

  D:/blender/blender.exe -b <swap build master>.blend --python tools/blender/tarven_bridge/swap_sculpt.py -- \
      <art/real_heroin_sculpt.blend> <out master.blend>

1. real_heroin_body (the hand sculpt, its Luna head welded on) and its eyes come in from the sculpt file.
2. It becomes Female_Body: its shape keys go (the Basis is her closed anus; the game shapes the anus itself), its
   materials are the master's own by plain name ("T_skin_f", never "T_skin_f.004"), its weights stay its own, and
   it is bound to the build's Female_Armature (the swap's bones are within a few millimetres of the sculpt's).
3. The sliders' rest data (_SLIDER_REST, slider_shift) goes from every mesh and bone, and the build's bust fixes
   (_BUST_FIX_*, sculpted on the old body) from her skin: the game shapes her as she is, about her own joints.
4. The eyes are bone-parented to Female_Head as in the sculpt (tools/blender/real_heroin/add_eyes.py turns them
   into Female_BodyEye_L/R, skinned, afterwards).
5. Her legwear is subdivided (it was made for plain legs), then the clothes and the stains on them are kept clear of
   the new skin (build_world.keep_clothes_clear, reaching further than the build does).
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
SCULPT, OUT = argv[0], argv[1]

bw = core.build_world()
rig = bpy.data.collections[core.MASTER_COLLECTION]
arm = rig.all_objects["Female_Armature"]
old = rig.all_objects["Female_Body"]

with bpy.data.libraries.load(SCULPT, link=False) as (src, dst):
    dst.objects = ["real_heroin_body", "real_heroin_eye.L", "real_heroin_eye.R"]
body, eye_l, eye_r = dst.objects
sculpt_arm = body.parent


def plain(name):
    stem, _, tail = name.rpartition(".")
    return stem if stem and tail.isdigit() else name


# 2. Her materials, the master's own by name.
for slot in body.material_slots:
    if slot.material is None:
        continue
    name = plain(slot.material.name)
    own = bpy.data.materials.get(name)
    if own is None or own == slot.material:
        slot.material.name = name
    else:
        slot.material = own
# Her Luna head came into the sculpt with no material (its slot is empty), which the game draws white: it takes her
# face's skin, which the game tones with her skin.
for slot in body.material_slots:
    if slot.material is None:
        slot.material = bpy.data.materials["T_face_skin"]
if body.data.shape_keys:
    body.shape_key_clear()
for name in [a.name for a in body.data.attributes if a.name in ("orig_co", "neck_hole")]:
    body.data.attributes.remove(body.data.attributes[name])

# 3. The sliders' rest data goes, from every mesh and bone: the swap joins her skin after the build recorded it, so
# her points kept an empty rest at the origin and the bust slider threw them to the floor (710 mm at a J cup). Without
# it the game shapes her as she is about her own joints, as it does the old body.
for obj in rig.all_objects:
    if obj.type == "MESH" and "_SLIDER_REST" in obj.data.attributes:
        obj.data.attributes.remove(obj.data.attributes["_SLIDER_REST"])
for bone in arm.data.bones:
    if "slider_shift" in bone:
        del bone["slider_shift"]
for name in [a.name for a in body.data.attributes if a.name.startswith(("_SLIDER_REST", "_BUST_FIX_"))]:
    body.data.attributes.remove(body.data.attributes[name])

# The build's skin goes; hers takes its name, its place in the rig and the build's bones.
for coll in list(body.users_collection):
    coll.objects.unlink(body)
for coll in list(old.users_collection):
    coll.objects.link(body)
old_mesh = old.data
bpy.data.objects.remove(old, do_unlink=True)
bpy.data.meshes.remove(old_mesh)
body.name = "Female_Body"
body.data.name = "Female_Body"
world = body.matrix_world.copy()
body.parent = arm
body.matrix_world = world
for mod in body.modifiers:
    if mod.type == "ARMATURE":
        mod.object = arm

# 4. Her eyes, on the build's head bone, where they were.
for eye in (eye_l, eye_r):
    world = eye.matrix_world.copy()
    rig.objects.link(eye)
    eye.parent = arm
    eye.parent_type = "BONE"
    eye.parent_bone = "Female_Head"
    eye.matrix_world = world

# The sculpt file's own armature and anything else that came along goes.
for obj in list(bpy.data.objects):
    if obj.users_collection == () or (obj.type == "ARMATURE" and obj != arm and obj.name not in rig.all_objects):
        if obj not in (body, eye_l, eye_r):
            bpy.data.objects.remove(obj, do_unlink=True)

# 5. The clothes and their stains kept clear of her new skin.
meshes = [o for o in rig.all_objects if o.type == "MESH"]
# Her hair too: it was fitted to the build's head, and her Luna head is fuller at the crown.
cloth = [o for o in meshes if o.name.startswith(("Female_Cloth", "Female_Hair"))]
stains = [o for o in meshes if "_CumOn" in o.name]
core.fit_clothes(body, cloth, stains)
# Her skin is the user's, not the build's: merge_build.py keeps it whatever a new build brings.
body["tarven_keep"] = True
# Her vulva is hand-sculpted: the game keeps it as it is and lays its arousal and opening over it (appearance.ts).
body["vulva_sculpted"] = True

bpy.ops.outliner.orphans_purge(do_recursive=True)
for block in list(bpy.data.materials) + list(bpy.data.meshes):
    if block.users and plain(block.name) != block.name and bpy.data.materials.get(plain(block.name)) is None:
        block.name = plain(block.name)
bad = [(o.name, s.material.name) for o in rig.all_objects for s in o.material_slots
       if s.material and plain(s.material.name) != s.material.name]
print("swap_sculpt: Female_Body", len(body.data.vertices), "points; eyes", eye_l.name, eye_r.name,
      "; materials with suffixes:", bad[:6])
core.relink_textures()
bpy.ops.wm.save_as_mainfile(filepath=OUT, relative_remap=True)
print("saved", OUT)
