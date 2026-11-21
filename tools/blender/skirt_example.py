"""An example skirt on her, made the way the user's reference video makes one (2026-11-20, "Cloth simulation -
subdivision surface modifier in blender 4.4", YouTube short JZWs9lcx8hE), frame by frame:

  0-2 s   A low cone ("Cylinder.001", ~40 round) hanging from her waist, plus a separate waistband ring.
  3-4 s   Tab out, Shift+Left (back to frame 1), Ctrl+A.
  5-9 s   Cloth sim played: the cone falls onto her hips, but its folds are as coarse as its faces.
  10-15 s Add Modifier > Generate > Subdivision Surface (Catmull-Clark, viewport 1, render 2), then the trick:
          it is moved ABOVE the Cloth modifier, so the sim runs on the subdivided mesh.
  17-27 s Played again: many more, finer folds round her hips and a soft wavy hem.

Here: her body (as posed in the master) is the collider; the cone is fitted round her waist and flares to the hem
clear of her hips; its top row is pinned (the waistband holds it). Two copies are simulated: "before" (Cloth, then
Subdivision, as in the video's first try) and "after" (Subdivision, then Cloth, the video's fix). The after one is
also kept applied as Skirt_Draped, with Solidify for thickness.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/skirt_example.py -- <out.blend> <render dir>
"""
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else os.path.join(os.getcwd(), "art", "skirt_example.blend")
SHOTS = argv[1] if len(argv) > 1 else os.path.join(os.path.dirname(OUT), "skirt_example")

SKIRT = {
    "waist": 1.06,      # top of the skirt (just under her natural waist), m
    "band": 0.035,      # waistband height
    "hem": 0.72,        # hem height (mid-thigh)
    "round": 48,        # points round the cone (the video's is ~40)
    "rows": 12,         # rows down it
    "ease": 0.006,      # waist gap over her skin
    "flare": 0.07,      # how much wider than her hips the hem starts
    "frames": 70,
}
CLOTH = {"quality": 8, "mass": 0.2, "tension": 12.0, "bending": 0.3, "collision": 0.004, "self": 0.003}

scene = bpy.context.scene
rig = bpy.data.collections["FemaleRig"]
body = rig.all_objects["Female_Body"]
dg = bpy.context.evaluated_depsgraph_get()

# ---------------------------------------------------------------- her body as it stands, as a still collider
ev = body.evaluated_get(dg)
mesh = bpy.data.meshes.new_from_object(ev, depsgraph=dg)
mesh.transform(body.matrix_world)
names = [m.name if m else "" for m in mesh.materials]
bm = bmesh.new()
bm.from_mesh(mesh)
# Only her skin: the patches over it (underwear layer, pubic patch, nipple discs) would only add faces.
drop = [f for f in bm.faces if names[f.material_index] in ("T_lingerie", "T_pubic", "T_areola")]
bmesh.ops.delete(bm, geom=drop, context="FACES")
bm.to_mesh(mesh)
bm.free()
stand = bpy.data.objects.new("Her_Body", mesh)

# Her rig is only needed for the pose: the example keeps her standing body as a still mesh.
arm_groups = {g.index for g in body.vertex_groups if any(k in g.name for k in ("Arm", "Hand"))}
weights = [[(g.group, g.weight) for g in v.groups] for v in body.data.vertices]
for o in list(scene.objects):
    bpy.data.objects.remove(o, do_unlink=True)
scene.collection.objects.link(stand)

# A lighter copy for the collisions (the sim checks every face it is near, every step).
collider = bpy.data.objects.new("Her_Collider", mesh.copy())
scene.collection.objects.link(collider)
dec = collider.modifiers.new("Lighter", "DECIMATE")
dec.ratio = 0.25
col = collider.modifiers.new("Collision", "COLLISION")
collider.collision.thickness_outer = CLOTH["collision"]
collider.collision.thickness_inner = 0.01
collider.collision.cloth_friction = 8.0
collider.hide_render = True
collider.display_type = "WIRE"

# Rays against her skin (arms and hands left out, so the skirt is fitted to her hips, not to her hanging hands).
def armish(poly):
    total = limbs = 0.0
    for v in poly.vertices:
        if v >= len(weights):
            continue
        for g, wt in weights[v]:
            total += wt
            limbs += wt if g in arm_groups else 0.0
    return total > 0 and limbs / total > 0.3


torso_faces = [p.vertices[:] for p in mesh.polygons if not armish(p)]
torso = BVHTree.FromPolygons([v.co.copy() for v in mesh.vertices], torso_faces)


def centre_at(z):
    pts = [v.co for v in mesh.vertices if abs(v.co.z - z) < 0.004 and abs(v.co.x) < 0.21]
    return Vector((0.0, (min(p.y for p in pts) + max(p.y for p in pts)) / 2, z))


def reach(z, angle, centre):
    """How far out her skin is from the centre, at height z, round by angle (0 = her front, +y)."""
    d = Vector((math.sin(angle), math.cos(angle), 0.0))
    hit, *_ = torso.ray_cast(centre + d * 0.6, -d, 0.6)
    return (hit - centre).length if hit else 0.0


# ---------------------------------------------------------------- the cone, as in the video
S = SKIRT
mid = centre_at(S["waist"])
angles = [2 * math.pi * i / S["round"] for i in range(S["round"])]
heights = [S["waist"] + (S["hem"] - S["waist"]) * r / S["rows"] for r in range(S["rows"] + 1)]
widest = {a: max(reach(z, a, Vector((0, mid.y, z))) for z in heights) for a in angles}
waist = {a: reach(S["waist"], a, mid) + S["ease"] for a in angles}

bm = bmesh.new()
rows = []
for r, z in enumerate(heights):
    t = r / S["rows"]
    ring = []
    for a in angles:
        # A straight A-line from her waist out to the hem, kept off her hips all the way down.
        rad = waist[a] + (widest[a] + S["flare"] - waist[a]) * t
        rad = max(rad, reach(z, a, Vector((0, mid.y, z))) + 0.008)
        ring.append(bm.verts.new((math.sin(a) * rad, mid.y + math.cos(a) * rad, z)))
    rows.append(ring)
for r in range(S["rows"]):
    for i in range(S["round"]):
        j = (i + 1) % S["round"]
        bm.faces.new((rows[r][i], rows[r][j], rows[r + 1][j], rows[r + 1][i]))
bm.normal_update()
cone = bpy.data.meshes.new("Skirt")
bm.to_mesh(cone)
bm.free()
for p in cone.polygons:
    p.use_smooth = True

# The waistband: a still ring round her waist, over the cone's pinned top.
bm = bmesh.new()
top, low = [], []
for a in angles:
    rad = waist[a] + 0.002
    low.append(bm.verts.new((math.sin(a) * rad, mid.y + math.cos(a) * rad, S["waist"] - 0.008)))
    rad = reach(S["waist"] + S["band"], a, Vector((0, mid.y, S["waist"] + S["band"]))) + S["ease"] + 0.002
    top.append(bm.verts.new((math.sin(a) * rad, mid.y + math.cos(a) * rad, S["waist"] + S["band"])))
for i in range(S["round"]):
    j = (i + 1) % S["round"]
    bm.faces.new((low[i], low[j], top[j], top[i]))
band_mesh = bpy.data.meshes.new("Waistband")
bm.to_mesh(band_mesh)
bm.free()
band = bpy.data.objects.new("Waistband", band_mesh)
scene.collection.objects.link(band)
band.modifiers.new("Thickness", "SOLIDIFY").thickness = 0.004
band.modifiers.new("Smooth", "SUBSURF").levels = 2


def cloth_skirt(name, subdivide_first, offset):
    obj = bpy.data.objects.new(name, cone.copy())
    scene.collection.objects.link(obj)
    pin = obj.vertex_groups.new(name="Pin")
    pin.add(list(range(S["round"])), 1.0, "REPLACE")  # the top row: held by the waistband
    if subdivide_first:
        sub = obj.modifiers.new("Subdivision", "SUBSURF")
        sub.levels = sub.render_levels = 2
    cloth = obj.modifiers.new("Cloth", "CLOTH")
    if not subdivide_first:
        sub = obj.modifiers.new("Subdivision", "SUBSURF")
        sub.levels = sub.render_levels = 2
    st = cloth.settings
    st.quality = CLOTH["quality"]
    st.mass = CLOTH["mass"]
    st.tension_stiffness = st.compression_stiffness = st.shear_stiffness = CLOTH["tension"]
    st.bending_stiffness = CLOTH["bending"]
    st.vertex_group_mass = "Pin"
    cs = cloth.collision_settings
    cs.distance_min = CLOTH["collision"]
    cs.collision_quality = 4
    cs.use_self_collision = True
    cs.self_distance_min = CLOTH["self"]
    cloth.point_cache.frame_start = 1
    cloth.point_cache.frame_end = S["frames"]
    return obj


before = cloth_skirt("Skirt_Before", False, 0.0)
after = cloth_skirt("Skirt_After", True, 0.0)
scene.frame_start, scene.frame_end = 1, S["frames"]
for f in range(1, S["frames"] + 1):
    scene.frame_set(f)
print("skirt: simulated", S["frames"], "frames")

# The after one, applied at the last frame and given thickness: the example skirt itself.
dg = bpy.context.evaluated_depsgraph_get()
draped_mesh = bpy.data.meshes.new_from_object(after.evaluated_get(dg), depsgraph=dg)
draped_mesh.name = "Skirt_Draped"
draped = bpy.data.objects.new("Skirt_Draped", draped_mesh)
scene.collection.objects.link(draped)
for p in draped_mesh.polygons:
    p.use_smooth = True
draped.modifiers.new("Thickness", "SOLIDIFY").thickness = 0.0015

# ---------------------------------------------------------------- materials and renders
def material(name, colour):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color = colour
    return m


skin = material("Example_Skin", (0.80, 0.62, 0.52, 1))
cloth_mat = material("Example_Skirt", (0.13, 0.13, 0.16, 1))
band_mat = material("Example_Band", (0.06, 0.06, 0.07, 1))
stand.data.materials.clear()
stand.data.materials.append(skin)
for o in (before, after, draped):
    o.data.materials.clear()
    o.data.materials.append(cloth_mat)
band.data.materials.append(band_mat)

scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light = "STUDIO"
shading.color_type = "MATERIAL"
shading.show_cavity = True
shading.cavity_type = "BOTH"
shading.show_shadows = False
scene.render.resolution_x, scene.render.resolution_y = 900, 1100
scene.render.film_transparent = False
scene.world = scene.world or bpy.data.worlds.new("SkirtWorld")
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
scene.collection.objects.link(cam)
scene.camera = cam
cam.data.lens = 70
os.makedirs(SHOTS, exist_ok=True)


def shoot(file, eye, look, show):
    for o in scene.objects:
        if o.type == "MESH":
            o.hide_render = o.name not in show
    cam.location = eye
    cam.rotation_euler = (look - eye).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(SHOTS, file)
    bpy.ops.render.render(write_still=True)


look = Vector((0, mid.y, 0.9))
views = {"front": Vector((0, 2.6, 1.0)), "side": Vector((2.6, mid.y, 1.0)), "back": Vector((0, -2.4, 1.0)),
         "three_quarter": Vector((1.8, 1.9, 1.15))}
for view, eye in views.items():
    shoot(f"after_{view}.png", eye, look, {"Her_Body", "Skirt_Draped", "Waistband"})
for view in ("front", "side"):
    shoot(f"before_{view}.png", views[view], look, {"Her_Body", "Skirt_Before", "Waistband"})

# Saved with the sims kept live (scrub the timeline to watch them fall, as in the video).
for o in scene.objects:
    o.hide_render = False
before.hide_viewport = after.hide_viewport = True
collider.hide_render = True
before.location.x = after.location.x = 0.0
scene.frame_set(1)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("saved", OUT)
