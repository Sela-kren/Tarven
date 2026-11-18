"""Render real_heroin's crotch as posed in the file (armature on, current frame): views aimed from the evaluated mesh.
PNG=<base.png> blender -b <file> --python posed_shot.py"""
import bpy, os, numpy as np
from mathutils import Vector
sc = bpy.context.scene
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
for o in sc.objects: o.hide_render = (o.name != ob.name)
mats = [m.name.split(".")[0] if m else "" for m in me.materials]
cols = {"T_labia": (0.86, 0.64, 0.62, 1), "T_anus": (0.78, 0.50, 0.50, 1), "T_anus_skin": (0.84, 0.70, 0.66, 1),
        "T_canal": (0.70, 0.30, 0.35, 1), "T_hole": (0.35, 0.10, 0.12, 1), "T_vulva": (0.80, 0.50, 0.50, 1)}
for m in me.materials:
    if m: m.diffuse_color = cols.get(m.name.split(".")[0], (0.86, 0.76, 0.70, 1))
sc.render.engine = "BLENDER_WORKBENCH"
sh = sc.display.shading
sh.light = "STUDIO"; sh.color_type = "MATERIAL"; sh.show_cavity = False; sh.show_specular_highlight = True
sc.render.resolution_x = sc.render.resolution_y = 800
dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); em = ev.to_mesh()
n = len(em.vertices); co = np.zeros(n * 3); em.vertices.foreach_get("co", co); co = co.reshape(-1, 3)
nr = np.zeros(n * 3); em.vertices.foreach_get("normal", nr); nr = nr.reshape(-1, 3)
mw = np.array(ob.matrix_world); co = co @ mw[:3, :3].T + mw[:3, 3]; nr = nr @ mw[:3, :3].T
fm = np.zeros(len(me.polygons), int); me.polygons.foreach_get("material_index", fm)
def centre(name):
    vs = set()
    for p in me.polygons:
        if p.material_index == mats.index(name): vs.update(p.vertices)
    vs = np.array(sorted(vs)); c = co[vs].mean(0)
    d = np.linalg.norm(co[vs] - c, axis=1); near = vs[d < np.percentile(d, 40)]
    nn = nr[near].mean(0); return Vector(c), Vector(nn).normalized()
cV, nV = centre("T_labia"); cA, nA = centre("T_anus_skin")
mid = (cV + cA) / 2; nM = (nV + nA).normalized()
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"
up = (cV - cA).normalized()
views = {"both": (mid, nM, 0.16), "vulva": (cV, nV, 0.085), "anus": (cA, nA, 0.06),
         "vside": (cV, (nV + (cV - cA).normalized().cross(nV) * 1.2).normalized(), 0.09),
         "persp": (mid, (nM * 1.0 + up * 0.6).normalized(), 0.15)}
only = os.environ.get("VIEWS")
for k, (t, d, o) in views.items():
    if only and k not in only.split(","): continue
    cam.data.ortho_scale = o; cam.location = t + d * 0.5; cam.data.clip_start = 0.5 - 0.08; cam.data.clip_end = 2
    q = (t - cam.location).to_track_quat("-Z", "Y")
    cam.rotation_euler = q.to_euler()
    # roll so the vulva is up the frame
    cam.rotation_mode = "QUATERNION"
    fwd = (t - cam.location).normalized(); u2 = (up - fwd * up.dot(fwd)).normalized()
    from mathutils import Matrix
    right = fwd.cross(u2); M = Matrix((right, u2, -fwd)).transposed(); cam.rotation_quaternion = M.to_quaternion()
    sc.render.filepath = os.environ["PNG"].replace(".png", f"_{k}.png"); bpy.ops.render.render(write_still=True)
ev.to_mesh_clear()
