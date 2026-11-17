import bpy, os
from mathutils import Vector
sc = bpy.context.scene
if os.environ.get("KEY"): bpy.data.objects["Female_Body"].data.shape_keys.key_blocks[os.environ["KEY"]].value = float(os.environ.get("KV", 1))
for o in list(sc.objects):
    if o.name != "Female_Body": o.hide_render = True
b = bpy.data.objects["Female_Body"]; me = b.data
plain = os.environ.get("PLAIN")
cols = {"T_labia": (0.95, 0.55, 0.55, 1), "T_anus": (0.3, 0.4, 1, 1), "T_anus_skin": (0.5, 0.8, 1, 1)}
for m in me.materials:
    m.diffuse_color = (0.84, 0.74, 0.68, 1) if plain else cols.get(m.name.split('.')[0], (0.84, 0.82, 0.78, 1))
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
sc.display.shading.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 640, 640
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = float(os.environ.get("ORTHO", 0.16))
tgt = Vector((0, float(os.environ.get("TY", 0.06)), float(os.environ.get("TZ", 0.91))))
for k, d in {"under": Vector((0, 0.15, -1)), "front": Vector((0, 1, -0.5)), "back": Vector((0, -0.6, -1)), "view": Vector((0, 0.565, -0.825))}.items():
    cam.location = tgt + d.normalized() * 0.6; cam.data.clip_start = 0.6 - 0.08
    cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.environ["PNG"].replace(".png", f"_{k}.png"); bpy.ops.render.render(write_still=True)
