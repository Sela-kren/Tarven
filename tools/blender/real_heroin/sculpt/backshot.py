import bpy, os
from mathutils import Vector
sc = bpy.context.scene
for o in list(sc.objects):
    if o.name != "Female_Body": o.hide_render = True
for m in bpy.data.objects["Female_Body"].data.materials: m.diffuse_color = (0.84, 0.74, 0.68, 1)
sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x, sc.render.resolution_y = 700, 700
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
for k, (d, t, o, cs) in {"under": ((0, 0.1, -1), (0, 0.03, 0.915), 0.13, 0.05), "back": ((0, -0.8, -1), (0, 0.01, 0.92), 0.13, 0.05),
                         "sidecut": ((1, 0, 0), (0, 0.03, 0.925), 0.16, 0.6)}.items():
    d = Vector(d).normalized(); t = Vector(t)
    cam.data.ortho_scale = o; cam.location = t + d * 0.6; cam.data.clip_start = cs
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.environ["PNG"].replace(".png", f"_{k}.png"); bpy.ops.render.render(write_still=True)
