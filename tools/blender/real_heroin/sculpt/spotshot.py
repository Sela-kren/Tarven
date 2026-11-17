import bpy, os
from mathutils import Vector
sc = bpy.context.scene
for o in list(sc.objects):
    if o.name != "Female_Body": o.hide_render = True
for m in bpy.data.objects["Female_Body"].data.materials: m.diffuse_color = (0.84, 0.74, 0.68, 1)
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x, sc.render.resolution_y = 600, 600
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
for k, (d, t, o) in {"cleft": ((0, -0.5, -1), (0.004, -0.031, 0.946), 0.04), "anus": ((0, -0.3, -1), (0.002, 0.003, 0.93), 0.04),
                     "wide": ((0, -0.4, -1), (0, -0.01, 0.935), 0.11)}.items():
    d = Vector(d).normalized(); t = Vector(t)
    cam.data.ortho_scale = o; cam.location = t + d * 0.6; cam.data.clip_start = 0.45
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.environ["PNG"].replace(".png", f"_{k}.png"); bpy.ops.render.render(write_still=True)
