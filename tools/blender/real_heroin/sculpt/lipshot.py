import bpy, os
from mathutils import Vector
sc = bpy.context.scene
for o in list(sc.objects):
    if o.name != "Female_Body": o.hide_render = True
me = bpy.data.objects["Female_Body"].data
for m in me.materials: m.diffuse_color = (0.84, 0.74, 0.68, 1)
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x, sc.render.resolution_y = 700, 700
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
views = {"under": ((0, 0.2, -1), (0, 0.075, 0.915), 0.09), "front": ((0, 1, -0.35), (0, 0.10, 0.93), 0.09),
         "side": ((1, 0.25, -0.35), (0, 0.075, 0.925), 0.10), "low": ((0, 0.75, -1), (0, 0.08, 0.915), 0.09)}
for k, (d, t, o) in views.items():
    d = Vector(d).normalized(); t = Vector(t)
    cam.data.ortho_scale = o; cam.location = t + d * 0.6; cam.data.clip_start = 0.6 - 0.07
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.environ["PNG"].replace(".png", f"_{k}.png"); bpy.ops.render.render(write_still=True)
