"""
The ref compare's shaded render (compare.py runs it): the OBJ game.preview.ts wrote (her as the game shapes her,
already in Blender's Z-up world) through the same orthographic camera as the game render, so the two line up pixel
for pixel. Workbench, studio light with cavity, smooth shaded, transparent background: quick, and shows the form.

Run: blender -b --factory-startup -P tools/refcompare/blender_render.py -- <model.obj> <render.json> <out.png>
"""
import json
import math
import sys

import bpy
from mathutils import Vector

obj_path, info_path, out_path = sys.argv[sys.argv.index("--") + 1 :][:3]
info = json.load(open(info_path))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=obj_path, forward_axis="Y", up_axis="Z")
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]


def colour_of(name):
    """The colour game.preview.ts put in the material's name, "<Part>_rrggbb", as linear RGBA."""
    hexpart = name.split(".")[0].rsplit("_", 1)[-1]
    try:
        srgb = [int(hexpart[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    except ValueError:
        srgb = [0.7, 0.7, 0.7]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
    return (*lin, 1.0)


for mat in bpy.data.materials:
    mat.diffuse_color = colour_of(mat.name)
for o in meshes:
    if not o.data.materials:
        o.color = colour_of(o.name)

# Smooth shaded, keeping hard creases.
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
if meshes:
    bpy.context.view_layer.objects.active = meshes[0]
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(50))
    except Exception:
        bpy.ops.object.shade_smooth()

scene = bpy.context.scene


def to_blender(p):
    """three's Y-up world to Blender's Z-up, as game.preview.ts wrote the OBJ."""
    return Vector((p[0], -p[2], p[1]))


cam_data = bpy.data.cameras.new("RefCam")
cam_data.type = "ORTHO"
cam_data.sensor_fit = "VERTICAL"
cam_data.ortho_scale = info["camera"]["halfH"] * 2
cam_data.clip_start = 0.1
cam_data.clip_end = 30
cam = bpy.data.objects.new("RefCam", cam_data)
scene.collection.objects.link(cam)
position = to_blender(info["camera"]["position"])
target = to_blender(info["camera"]["target"])
cam.location = position
cam.rotation_euler = (target - position).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

for engine in ("BLENDER_WORKBENCH", "WORKBENCH"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue
shading = scene.display.shading
shading.light = "STUDIO"
shading.color_type = "MATERIAL" if bpy.data.materials else "OBJECT"
shading.show_cavity = True
shading.cavity_type = "BOTH"
shading.show_specular_highlight = True
scene.display.render_aa = "8"
scene.render.film_transparent = True
scene.render.resolution_x = info["w"]
scene.render.resolution_y = info["h"]
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "Standard"
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("REFCOMPARE blender wrote", out_path)
