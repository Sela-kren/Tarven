"""
Put the fitted downloaded hairstyles (art/female_hair_dl_draft.blend, made by fit_dl_hair.py) into the master as
her only hairstyles: every Female_Hair* mesh there is removed, the draft's are appended and hung on the master's
armature. Run in the Blender that has the master open (reload it from disk first), then save and Send:

    exec(open(r"tools/blender/real_heroin/install_dl_hair.py").read())
"""
import bpy

DRAFT = globals().get("DRAFT", r"D:\game dev\game_making\Tarven\art\female_hair_dl_draft.blend")
NAMES = globals().get("NAMES", ["Female_Hair", "Female_HairSwept", "Female_HairPonytail", "Female_HairArtemis"])

ARM = bpy.data.objects["Female_Armature"]
coll = ARM.users_collection[0]
removed = []
for o in list(bpy.data.objects):
    if o.type == "MESH" and o.name.startswith("Female_Hair"):
        me = o.data
        removed.append(o.name)
        bpy.data.objects.remove(o, do_unlink=True)
        if me.users == 0:
            bpy.data.meshes.remove(me)
before = set(bpy.data.objects)
with bpy.data.libraries.load(DRAFT, link=False) as (src, dst):
    dst.objects = [n for n in NAMES if n in src.objects]
added = []
for o in dst.objects:
    if o is None:
        continue
    coll.objects.link(o)
    o.parent = ARM
    o.parent_type = "OBJECT"
    o.matrix_parent_inverse.identity()
    for m in o.modifiers:
        if m.type == "ARMATURE":
            m.object = ARM
    added.append(o.name)
# the draft's armature (dragged in as the parent) goes
for o in set(bpy.data.objects) - before:
    if o.name not in added:
        bpy.data.objects.remove(o, do_unlink=True)
for a in [a for a in bpy.data.armatures if a.users == 0]:
    bpy.data.armatures.remove(a)
for o in bpy.data.objects:
    if o.name in added and o.name != "Female_Hair":
        o.hide_set(True)
print("INSTALL_DL_HAIR", dict(removed=removed, added=added))
