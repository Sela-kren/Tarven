"""
Builds art/face_expressions.blend: her expressions as shape keys, for editing by hand (EXPRESSION_STUDY.md). Run headless
after exporting the expressions (expressions.preview.ts writes <dir>/shapes.json):

    D:/blender/blender.exe -b --factory-startup --python tools/facepreview/build_face_blend.py -- <export dir> <female.glb> <out.blend>

What it makes, in the collection Face_ShapeKeys:
- Face_Expressions: her head and face, "Basis (neutral)" plus a key per expression. Pieces that only show in some
  expressions (creases, a blush's strokes) are shrunk to a point where they don't show.
- Eye_L / Eye_R: each eye's pieces (white, iris, pupil, shines, eyelids, lash lines) as their own object, with the same
  keys, each driven by the head's key of the same name: one slider on the head moves the face and both eyes.
- Face_Hair: her hair, no keys.
Vertex groups: Brow_L, Brow_R, Mouth on the head; Iris, Pupil, Lid_Upper, Lid_Lower, Lash on each eye.
Materials are the game model's own (its textures packed into the file).
"""
import json
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
export_dir, glb, out = argv[0], argv[1], argv[2]
data = json.load(open(os.path.join(export_dir, "shapes.json")))
pieces, frames = data["pieces"], data["frames"]
names = list(frames)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb)
materials = {m.name: m for m in bpy.data.materials if m.name.startswith("T_")}
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

scene = bpy.context.scene
coll = bpy.data.collections.new("Face_ShapeKeys")
scene.collection.children.link(coll)


def collapsed(co):
    n = len(co) // 3
    centre = [sum(co[k::3]) / n for k in range(3)]
    return centre * n


def points_of(expression, keep):
    """Every kept piece's points for an expression, flat: hidden pieces shrunk to their middle."""
    out = []
    for i, triangles in keep:
        frame = frames[expression][i]
        co = frame["co"] if frame["shown"] else collapsed(frame["co"])
        used = sorted({v for t in triangles for v in t})
        for v in used:
            out += co[v * 3:v * 3 + 3]
    return out


def build(name, keep, groups):
    """A mesh of the kept pieces (piece index, its triangles), with a shape key per expression."""
    verts, faces, mats, index = [], [], [], {}
    base = points_of("neutral", keep)
    slots = []
    for i, triangles in keep:
        used = sorted({v for t in triangles for v in t})
        for v in used:
            index[(i, v)] = len(index)
        mat = materials.get(pieces[i]["name"])
        if mat not in slots:
            slots.append(mat)
        for t in triangles:
            faces.append([index[(i, v)] for v in t])
            mats.append(slots.index(mat))
    verts = [tuple(base[k * 3:k * 3 + 3]) for k in range(len(index))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    for mat in slots:
        mesh.materials.append(mat)
    mesh.polygons.foreach_set("material_index", mats)
    mesh.polygons.foreach_set("use_smooth", [True] * len(faces))
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    obj.shape_key_add(name="Basis (neutral)", from_mix=False)
    for expression in names:
        if expression == "neutral":
            continue
        key = obj.shape_key_add(name=expression, from_mix=False)
        key.data.foreach_set("co", points_of(expression, keep))
        key.value = 0.0
    for group, (test) in groups.items():
        vs = [index[(i, v)] for i, triangles in keep for v in sorted({v for t in triangles for v in t}) if test(i, verts[index[(i, v)]])]
        if vs:
            obj.vertex_groups.new(name=group).add(vs, 1.0, "REPLACE")
    return obj


def side_triangles(i, side):
    """A piece's triangles on one side of her face (an eye's pieces are both eyes'), by their points' x."""
    co = frames["neutral"][i]["co"]
    tris = pieces[i]["tris"]
    return [tris[k:k + 3] for k in range(0, len(tris), 3) if (co[tris[k] * 3] > 0) == (side > 0)]


def piece(name):
    return [i for i, p in enumerate(pieces) if p["name"] == name]


eye_pieces = [i for i, p in enumerate(pieces) if p["name"].startswith("T_eye_")]
head_keep = [(i, [p["tris"][k:k + 3] for k in range(0, len(p["tris"]), 3)]) for i, p in enumerate(pieces) if i not in eye_pieces]
named = lambda *ns: (lambda i, co: pieces[i]["name"] in ns)
mouth = ("T_lip", "T_lip_lit", "T_mouth", "T_teeth", "T_teeth_low", "T_tongue")
head = build("Face_Expressions", head_keep, {
    "Brow_L": lambda i, co: pieces[i]["name"] == "T_hair_f" and co[0] < 0,
    "Brow_R": lambda i, co: pieces[i]["name"] == "T_hair_f" and co[0] > 0,
    "Mouth": named(*mouth),
})
eyes = {}
for side, label in ((-1, "L"), (1, "R")):
    keep = [(i, side_triangles(i, side)) for i in eye_pieces]
    eyes[label] = build(f"Eye_{label}", [(i, t) for i, t in keep if t], {
        "Iris": named("T_eye_iris", "T_eye_iris_dark", "T_eye_shine", "T_eye_pupil"),
        "Pupil": named("T_eye_pupil"),
        "Lid_Upper": named("T_eye_lid", "T_eye_lash"),
        "Lid_Lower": named("T_eye_lid_low", "T_eye_lash_low"),
        "Lash": named("T_eye_lash", "T_eye_lash_low"),
    })

# Her eyes follow the head's sliders, and sit on it.
keys = head.data.shape_keys
for eye in eyes.values():
    eye.parent = head
    for block in eye.data.shape_keys.key_blocks[1:]:
        curve = block.driver_add("value")
        var = curve.driver.variables.new()
        var.name, var.type = "v", "SINGLE_PROP"
        var.targets[0].id_type, var.targets[0].id = "KEY", keys
        var.targets[0].data_path = f'key_blocks["{block.name}"].value'
        curve.driver.type = "AVERAGE"

# Her hair, from the neutral export, without keys.
hair_obj = os.path.join(export_dir, "neutral.obj")
before = set(bpy.data.objects)
bpy.ops.wm.obj_import(filepath=hair_obj, forward_axis="Y", up_axis="Z")
for obj in [o for o in bpy.data.objects if o not in before]:
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    if obj.name.startswith("Hair_"):
        obj.name = "Face_Hair"
        obj.data.materials.clear()
        obj.data.materials.append(materials["T_hair_f"])
        coll.objects.link(obj)
        obj.parent = head
    else:
        bpy.data.objects.remove(obj, do_unlink=True)

# Facing the front view (Blender's front looks along +Y; she faces +Y as exported), at the origin.
head.rotation_euler = (0, 0, math.pi)
head.location = (0, 0, -1.33)
# The model import's own collections, empty now.
for c in list(bpy.data.collections):
    if c is not coll and not c.all_objects:
        bpy.data.collections.remove(c)
bpy.ops.file.pack_all()
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("saved", out, "keys", len(keys.key_blocks), "eyes", {k: len(v.data.vertices) for k, v in eyes.items()})
