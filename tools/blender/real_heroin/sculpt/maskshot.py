import bpy, os
from mathutils import Vector
sc = bpy.context.scene
for o in list(sc.objects):
    if o.name != "Female_Body": o.hide_render = True
b = bpy.data.objects["Female_Body"]; me = b.data
att = me.attributes.get(".sculpt_mask")
col = me.color_attributes.new("maskvis", "FLOAT_COLOR", "POINT")
for i, d in enumerate(att.data):
    m = d.value; col.data[i].color = (0.85, 0.75 - 0.5 * m, 0.7 - 0.5 * m, 1)
me.color_attributes.active_color = col
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "VERTEX"
sc.render.resolution_x, sc.render.resolution_y = 800, 800
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
for k, (d, t, o) in {"side": ((1, 0, 0), (0, 0.03, 0.93), 0.30), "sidecut": ((1, 0, 0), (0, 0.05, 0.92), 0.18),
                     "front": ((0, 1, -0.1), (0, 0.05, 0.93), 0.30), "under": ((0, 0.2, -1), (0, 0.05, 0.915), 0.18)}.items():
    d = Vector(d).normalized(); t = Vector(t)
    cam.data.ortho_scale = o; cam.location = t + d * 0.6
    cam.data.clip_start = 0.6 if k == "sidecut" else 0.05
    cam.rotation_euler = (t - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.environ["PNG"].replace(".png", f"_{k}.png"); bpy.ops.render.render(write_still=True)
