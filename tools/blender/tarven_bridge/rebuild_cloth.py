"""Rebuilds her start outfit (the tee and leggings, Female_ClothTee) on her own skin in the master, to the user's
reference (2026-11-20): a black boxy cropped tee (high crew neck, dropped shoulders, wide sleeves ending above the
elbow, hanging straight down from the bust, cropped a hand above the navel) over high-waisted ankle leggings (a
wide waistband up over the navel).

Built the way the hero-shooter references build cloth (ref/: measured 2026-11-20): the garment its own surface off
the skin (tight parts 1.5-3 mm, loose parts 9-17 mm and more at the hem), edges with thickness, a cloth's density
(edges ~6-15 mm), not the skin's.

  1. Her skin's faces in the garment's region are copied (weights and all), the game's grids and overlays left out
     and the holes they leave (her vulva, navel) filled; thinned to cloth density.
  2. Lifted off her along the normals, then relaxed as a taut sheet (each point to its neighbours' middle, never
     nearer her skin than the gap), so it bridges her creases instead of following them.
  3. Cut clean: hems straight (the crop, the ankles, the sleeves square to the arm), the crew neckline on a plane.
  4. The tee made boxy: each height round her the convex outline (bridging her cleavage and the dip under her bust),
     hanging straight down from her bust, and loose all round; the sleeves wide round the arm.
  5. Every hem turned under (a lip with depth), and the waistband's seam pressed in.
  6. Into Female_ClothTee in place of the old tee and legwear bands, the materials the game knows them by (the
     legwear bands by height, as before, so its legwear styles still work); the stains on them laid back on.

  D:/blender/blender.exe -b <master>.blend --python tools/blender/tarven_bridge/rebuild_cloth.py -- <out.blend>
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

OUT = sys.argv[sys.argv.index("--") + 1]

# The cut, measured on her (z up, metres; she faces +y). See the docstring for the reference.
CUT = {
    "neck_front": 1.425, "neck_back": 1.455,   # the crew neckline: a plane through these heights front and back
    "neck_y": (0.075, -0.045),                 # ...at these depths (her front, her back at the neck's base)
    "crop": 1.16,                              # the tee's hem as she wears it at small cups (hem_bake.py folds it up)
    "crop_long": 1.00,                         # ...and as built: long enough to hang past a big bust
    "sleeve": 0.68,                            # sleeve ends this far from shoulder to elbow (dropped shoulder: wide)
    "waist": 1.105,                            # the leggings' top, just over the navel
    "waistband": 0.055,                        # its band's depth (the seam under it)
    "ankle": 0.10,                             # the leggings' hems
}
FIT = {
    "leggings_gap": 0.002, "tee_gap": 0.008, "tee_loose": 0.006, "sleeve_loose": 0.014,
    "relax": 60, "density": 0.45,               # relax passes; share of points kept (cloth's density, not the skin's)
    "hang_slope": 0.12,                         # how far back the tee falls in per metre down below the bust
    "lip": (0.003, 0.006),                      # a hem turned under: this far in, this far up inside
}
SKIP = ("T_lingerie", "T_pubic", "T_areola", "T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin", "T_hole",
        "T_navel", "T_nail")

rig = bpy.data.collections[core.MASTER_COLLECTION]
body = rig.all_objects["Female_Body"]
arm = rig.all_objects["Female_Armature"]
outfit = rig.all_objects["Female_ClothTee"]
bones = {b.name: b for b in arm.data.bones}


def bone_line(name):
    b = bones[name]
    return arm.matrix_world @ b.head_local, arm.matrix_world @ b.tail_local


SHOULDER = {s: bone_line(f"Female_UpperArm_{s}")[0] for s in "LR"}
ELBOW = {s: bone_line(f"Female_ForeArm_{s}")[0] for s in "LR"}

world = body.matrix_world
skin_names = [s.material.name if s.material else "" for s in body.material_slots]
# What the cloth stays off: her skin and the game's grids on it (her vulva stands proud of the skin round it), not the
# overlays drawn over her (underwear, pubic hair, areolae).
OVERLAYS = ("T_lingerie", "T_pubic", "T_areola")
skin_tree = BVHTree.FromPolygons([world @ v.co for v in body.data.vertices],
                                 [p.vertices[:] for p in body.data.polygons if skin_names[p.material_index] not in OVERLAYS])


def arm_share(p, side):
    """How far along her upper arm (0 shoulder, 1 elbow) a point lies, and its distance off the arm's line."""
    a, b = SHOULDER[side], ELBOW[side]
    axis = b - a
    t = (p - a).dot(axis) / axis.length_squared
    return t, (p - (a + axis * t)).length


def side_of(p):
    return "L" if p.x < 0 else "R"


def in_sleeve(p):
    # Past her shoulder joint outwards, along her upper arm and close round it (not her hips and legs below).
    t, off = arm_share(p, side_of(p))
    return p.z > 1.05 and abs(p.x) > abs(SHOULDER[side_of(p)].x) - 0.01 and 0.05 < t < 1.3 and off < 0.09


def neck_z(y):
    (yf, yb), zf, zb = CUT["neck_y"], CUT["neck_front"], CUT["neck_back"]
    return zb + (zf - zb) * (y - yb) / (yf - yb)


def in_tee(p):
    if in_sleeve(p):
        return arm_share(p, side_of(p))[0] <= CUT["sleeve"] + 0.12
    return CUT["crop_long"] - 0.04 <= p.z <= neck_z(p.y) + 0.04 and abs(p.x) < 0.25


def in_leggings(p):
    return CUT["ankle"] - 0.03 <= p.z <= CUT["waist"] + 0.04 and not in_sleeve(p) and abs(p.x) < 0.25 and \
        (p.z < 0.75 or abs(p.x) < 0.2)


# ---------------------------------------------------------------- 1. copy her skin in a region

def copy_region(name, keep):
    mesh = body.data.copy()
    obj = bpy.data.objects.new(name, mesh)
    rig.objects.link(obj)
    obj.matrix_world = world
    bm = bmesh.new()
    bm.from_mesh(mesh)
    gone = [f for f in bm.faces if skin_names[f.material_index] in SKIP or
            not all(keep(world @ v.co) for v in f.verts)]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    # Holes the grids left (her vulva, the navel): filled; the garment's own openings are much longer.
    bm.edges.ensure_lookup_table()
    loops = boundary_loops(bm)
    def grid_hole(loop):
        # The holes her grids left (vulva, anus, navel) sit on her middle between her navel and crotch; the
        # garment's own openings (waist, ankles, sleeves, neck) don't.
        centre = sum((world @ v.co for e in loop for v in e.verts), Vector()) / (2 * len(loop))
        return abs(centre.x) < 0.08 and 0.70 < centre.z < 1.15 and sum(e.calc_length() for e in loop) < 0.8
    small = [e for loop in loops if grid_hole(loop) for e in loop]
    if small:
        bmesh.ops.holes_fill(bm, edges=small, sides=0)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(mesh)
    bm.free()
    for key in [a.name for a in mesh.attributes if a.name.startswith("_") or a.name in ("orig_co", "crease_edge")]:
        mesh.attributes.remove(mesh.attributes[key])
    if mesh.shape_keys:
        obj.shape_key_clear()
    # Thinned to a cloth's density.
    mod = obj.modifiers.new("thin", "DECIMATE")
    mod.ratio = FIT["density"]
    mod.use_collapse_triangulate = True
    with bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj]):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def boundary_loops(bm):
    edges = [e for e in bm.edges if e.is_boundary]
    seen, loops = set(), []
    for start in edges:
        if start in seen:
            continue
        loop, stack = [], [start]
        while stack:
            e = stack.pop()
            if e in seen:
                continue
            seen.add(e)
            loop.append(e)
            for v in e.verts:
                stack.extend(x for x in v.link_edges if x.is_boundary and x not in seen)
        loops.append(loop)
    return loops


# ---------------------------------------------------------------- 2. lift and relax

def keep_off(co, gap, only=None):
    """Every point (or those in `only`) at least `gap` outside her skin (pushed out along the skin's normal)."""
    for i in (range(len(co)) if only is None else only):
        p = co[i]
        loc, n, _i, _d = skin_tree.find_nearest(Vector(p), 0.12)
        if loc is None:
            continue
        h = (Vector(p) - loc).dot(n)
        if h < gap:
            co[i] = np.array(loc + n * gap)


def neighbours(mesh):
    n = len(mesh.vertices)
    nb = [[] for _ in range(n)]
    for e in mesh.edges:
        a, b = e.vertices
        nb[a].append(b)
        nb[b].append(a)
    return nb


def relax(obj, gap, passes, fixed=frozenset(), project=None):
    """A taut sheet: each point eased to its neighbours' middle, kept off her skin; `project` puts the hem points
    back on their cut each pass."""
    mesh = obj.data
    co = np.array([world @ v.co for v in mesh.vertices])
    nb = neighbours(mesh)
    bm = bmesh.new()
    bm.from_mesh(mesh)
    boundary = {v.index for v in bm.verts if v.is_boundary}
    bm.free()
    for k in range(passes):
        mid = np.array([co[n].mean(axis=0) if n else co[i] for i, n in enumerate(nb)])
        step = mid - co
        for i in boundary:
            # Along the hem only: its own neighbours on the hem.
            ring = [j for j in nb[i] if j in boundary]
            step[i] = (co[ring].mean(axis=0) - co[i]) if len(ring) >= 2 else 0.0
        step[list(fixed)] = 0.0
        co += 0.6 * step
        if project is not None:
            project(co, boundary)
        if k % 5 == 4 or k == passes - 1:
            keep_off(co, gap)
            # Pushing off her skin moves a hem point off its cut: back onto it, so the hem stays a clean line.
            if project is not None:
                project(co, boundary)
    inv = world.inverted()
    mesh.vertices.foreach_set("co", np.array([inv @ Vector(p) for p in co]).ravel())
    mesh.update()
    return co


def lift(obj, by):
    mesh = obj.data
    mesh.update()
    for v in mesh.vertices:
        v.co += v.normal * by
    mesh.update()


def smooth_crotch(obj, gap=0.004, radius=0.07, passes=150):
    """Leggings pass smoothly over her vulva and anus, as real ones do, not into the slit or round her lips: round
    them the cloth is smoothed much further than elsewhere (fading out by `radius`), kept `gap` off whatever is
    under it."""
    centres = []
    for name in ("T_vulva", "T_anus"):
        idx = {i for i, n in enumerate(skin_names) if n == name}
        pts = [world @ p.center for p in body.data.polygons if p.material_index in idx]
        if pts:
            centres.append(sum(pts, Vector()) / len(pts))
    if not centres:
        return
    mesh = obj.data
    co = np.array([world @ v.co for v in mesh.vertices])
    dist = np.min([np.linalg.norm(co - np.array(c), axis=1) for c in centres], axis=0)
    w = np.clip((radius - dist) / (radius * 0.4), 0.0, 1.0)
    near = np.nonzero(w > 0)[0]
    nb = neighbours(mesh)
    for k in range(passes):
        mid = np.array([co[nb[i]].mean(axis=0) if nb[i] else co[i] for i in near])
        co[near] += 0.6 * w[near, None] * (mid - co[near])
        if k % 5 == 4 or k == passes - 1:
            keep_off(co, gap, only=near)
    inv = world.inverted()
    mesh.vertices.foreach_set("co", np.array([inv @ Vector(p) for p in co]).ravel())
    mesh.update()


# ---------------------------------------------------------------- 3. hems

def hem_projector(kind):
    def project(co, boundary):
        for i in boundary:
            p = Vector(co[i])
            if kind == "tee":
                if in_sleeve(p) and arm_share(p, side_of(p))[0] > CUT["sleeve"] - 0.08:
                    s = side_of(p)
                    a, b = SHOULDER[s], ELBOW[s]
                    axis = (b - a)
                    t = (p - a).dot(axis) / axis.length_squared
                    p = p + axis * (CUT["sleeve"] - t)
                elif p.z < CUT["crop"] + 0.04:
                    p.z = CUT["crop"]
                elif p.z > CUT["neck_front"] - 0.05:
                    p.z = neck_z(p.y)
            else:
                if p.z > CUT["waist"] - 0.04:
                    p.z = CUT["waist"]
                elif p.z < CUT["ankle"] + 0.04:
                    p.z = CUT["ankle"]
            co[i] = np.array(p)
    return project


def cut(obj, kind):
    """Slices the garment exactly on its cut lines (it was built a little past them), so every hem is a clean
    straight edge: planes for the crop, the neckline, the waistband and the ankles; for each sleeve a plane square to
    the arm, through the sleeve's own faces only."""
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.transform(world)

    def slice_(geom, co, no, drop_above):
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, clear_outer=drop_above,
                                     clear_inner=not drop_above)
        return res

    def all_geom():
        return list(bm.verts) + list(bm.edges) + list(bm.faces)

    if kind == "tee":
        (yf, yb), zf, zb = CUT["neck_y"], CUT["neck_front"], CUT["neck_back"]
        slope = (zf - zb) / (yf - yb)
        slice_(all_geom(), Vector((0, yb, zb)), Vector((0, -slope, 1)).normalized(), True)
        torso_faces = [f for f in bm.faces if not in_sleeve(f.calc_center_median())]
        geom = torso_faces + list({e for f in torso_faces for e in f.edges}) + list({v for f in torso_faces for v in f.verts})
        slice_(geom, Vector((0, 0, CUT["crop_long"])), Vector((0, 0, 1)), False)
        for s in "LR":
            a, b = SHOULDER[s], ELBOW[s]
            axis = (b - a).normalized()
            faces = [f for f in bm.faces if in_sleeve(f.calc_center_median()) and side_of(f.calc_center_median()) == s]
            geom = faces + list({e for f in faces for e in f.edges}) + list({v for f in faces for v in f.verts})
            slice_(geom, a + (b - a) * CUT["sleeve"], axis, True)
    else:
        slice_(all_geom(), Vector((0, 0, CUT["waist"])), Vector((0, 0, 1)), True)
        slice_(all_geom(), Vector((0, 0, CUT["ankle"])), Vector((0, 0, 1)), False)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.transform(world.inverted())
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- 4. boxy tee

def hull_push(co, idx, centre):
    """Pushes the points `idx` (one row round her) out to that row's convex outline, seen from above."""
    pts = co[idx][:, :2] - centre
    ang = np.arctan2(pts[:, 1], pts[:, 0])
    r = np.hypot(pts[:, 0], pts[:, 1])
    # The outline's reach in each direction: the max over the row of each point's projection onto it.
    dirs = np.stack([np.cos(ang), np.sin(ang)], axis=1)
    reach = (pts @ dirs.T).max(axis=0)
    grow = np.maximum(reach - r, 0.0)
    co[idx, 0] += np.cos(ang) * grow
    co[idx, 1] += np.sin(ang) * grow


def make_boxy(co, sleeve_mask, bust_z):
    torso = np.nonzero(~sleeve_mask)[0]
    centre = np.array([0.0, 0.03])
    rows = np.round(co[torso, 2] / 0.012).astype(int)
    for r in np.unique(rows):
        idx = torso[rows == r]
        if len(idx) > 6:
            hull_push(co, idx, centre)
    # Hanging: below her bust, the front never comes in faster than the slope, by direction round her.
    rel = co[torso, :2] - centre
    ang = np.degrees(np.arctan2(rel[:, 1], rel[:, 0]))       # 90 = straight in front
    rad = np.hypot(rel[:, 0], rel[:, 1])
    bins = np.round(ang / 6).astype(int)
    order = np.argsort(-co[torso, 2])
    best = {}
    for k in order:
        i, b, z = torso[k], bins[k], co[torso[k], 2]
        front = max(0.0, min(1.0, (80 - abs(ang[k] - 90)) / 30))
        if b in best and z < bust_z and front > 0:
            zb, rb = best[b]
            need = rb - FIT["hang_slope"] * (zb - z)
            if need > rad[k]:
                grow = (need - rad[k]) * front
                co[i, 0] += math.cos(math.radians(ang[k])) * grow
                co[i, 1] += math.sin(math.radians(ang[k])) * grow
                rad[k] += grow
        if b not in best or rad[k] > best[b][1] - FIT["hang_slope"] * (best[b][0] - z):
            best[b] = (z, rad[k])
    # Looser all round.
    rel = co[torso, :2] - centre
    norm = rel / np.maximum(np.linalg.norm(rel, axis=1, keepdims=True), 1e-6)
    co[torso, :2] += norm * FIT["tee_loose"]
    # Sleeves: wide round the arm.
    for i in np.nonzero(sleeve_mask)[0]:
        p = Vector(co[i])
        s = side_of(p)
        a, b = SHOULDER[s], ELBOW[s]
        axis = (b - a).normalized()
        foot = a + axis * (p - a).dot(axis)
        out = (p - foot)
        if out.length > 1e-6:
            co[i] = np.array(p + out.normalized() * FIT["sleeve_loose"])


# ---------------------------------------------------------------- 5. edges with depth

def turn_hems(obj):
    """Every open edge turned under: a strip from the hem back up inside the garment, so the edge has depth."""
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.normal_update()
    edges = [e for e in bm.edges if e.is_boundary]
    normals = {v: v.normal.copy() for e in edges for v in e.verts}
    inward = {}
    for v in normals:
        inside = [x for x in v.link_edges if not x.is_boundary]
        d = Vector()
        for x in inside:
            d += (x.other_vert(v).co - v.co).normalized()
        inward[v] = d.normalized() if d.length > 1e-6 else Vector()
    ret = bmesh.ops.extrude_edge_only(bm, edges=edges)
    made = [g for g in ret["geom"] if isinstance(g, bmesh.types.BMVert)]
    depth, up = FIT["lip"]
    # Each new point sits where its source was: moved under and in.
    kd = KDTree(len(normals))
    keys = list(normals)
    for i, v in enumerate(keys):
        kd.insert(v.co, i)
    kd.balance()
    for v in made:
        _c, i, _d = kd.find(v.co)
        s = keys[i]
        v.co = s.co - normals[s] * depth + inward[s] * up
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- build

def material_slot(obj, name):
    mat = bpy.data.materials[name]
    for i, s in enumerate(obj.material_slots):
        if s.material == mat:
            return i
    obj.data.materials.append(mat)
    return len(obj.data.materials) - 1


def recolour(obj, pick):
    """Sets each face's material: pick(face centre) -> material name."""
    mesh = obj.data
    for p in mesh.polygons:
        p.material_index = material_slot(obj, pick(world @ p.center))


bust_z = (arm.matrix_world @ bones["Female_Bust"].head_local).z

# The old legwear bands, to give the new leggings their materials by height (the game's legwear styles).
old_names = [s.material.name if s.material else "" for s in outfit.material_slots]
band_faces = [(outfit.matrix_world @ p.center, old_names[p.material_index]) for p in outfit.data.polygons
              if old_names[p.material_index].startswith("T_hose")]
band_tree = KDTree(len(band_faces))
for i, (c, _n) in enumerate(band_faces):
    band_tree.insert(c, i)
band_tree.balance()

tee = copy_region("NewTee", in_tee)
lift(tee, FIT["tee_gap"])
co = relax(tee, FIT["tee_gap"], FIT["relax"])
sleeve_mask = np.array([in_sleeve(Vector(p)) for p in co])
make_boxy(co, sleeve_mask, bust_z)
inv = world.inverted()
tee.data.vertices.foreach_set("co", np.array([inv @ Vector(p) for p in co]).ravel())
tee.data.update()
relax(tee, FIT["tee_gap"], 12)
cut(tee, "tee")
turn_hems(tee)
recolour(tee, lambda c: "T_tee")

legs = copy_region("NewLeggings", in_leggings)
lift(legs, FIT["leggings_gap"])
relax(legs, FIT["leggings_gap"], FIT["relax"])
smooth_crotch(legs)
cut(legs, "legs")
# The waistband's seam: a row pressed in a little under the band.
for v in legs.data.vertices:
    p = world @ v.co
    d = abs(p.z - (CUT["waist"] - CUT["waistband"]))
    if d < 0.004:
        v.co -= v.normal * 0.0008 * (1 - d / 0.004)
turn_hems(legs)
recolour(legs, lambda c: band_faces[band_tree.find(c)[1]][1])

# 6. Into the outfit, in place of the old tee and bands.
bm = bmesh.new()
bm.from_mesh(outfit.data)
gone = [f for f in bm.faces if old_names[f.material_index] == "T_tee" or old_names[f.material_index].startswith("T_hose")]
bmesh.ops.delete(bm, geom=gone, context="FACES")
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
bm.to_mesh(outfit.data)
bm.free()
for obj in (tee, legs):
    for mod in list(obj.modifiers):
        obj.modifiers.remove(mod)
with bpy.context.temp_override(active_object=outfit, object=outfit, selected_objects=[outfit, tee, legs],
                               selected_editable_objects=[outfit, tee, legs]):
    bpy.ops.object.join()
for poly in outfit.data.polygons:
    poly.use_smooth = True
# Last, as the build does: any corner still inside her skin (her grids and the overlays aside) put back out.
bw0 = core.build_world()
deep = dict(bw0.CLEAR, near=0.06, most=0.05, skip=OVERLAYS)
for _ in range(2):
    bw0.keep_clothes_clear(body, [outfit], deep)

# The stains on the tee and leggings laid back on their new surface.
cloth_tree = BVHTree.FromObject(outfit, bpy.context.evaluated_depsgraph_get())
bw = core.build_world()
for stain in [o for o in rig.all_objects if o.type == "MESH" and o.name.startswith("Female_CumOnTee")]:
    m = stain.matrix_world
    mi = m.inverted()
    for v in stain.data.vertices:
        p = m @ v.co
        loc, n, _i, d = cloth_tree.find_nearest(p, 0.08)
        if loc is not None:
            v.co = mi @ (loc + n * bw.STAIN_LIFT)
    stain.data.update()

print("rebuild_cloth: outfit now", len(outfit.data.vertices), "points")
bpy.ops.wm.save_as_mainfile(filepath=OUT, relative_remap=True)
print("saved", OUT)
