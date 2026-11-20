"""Gives her hand-sculpted skin back the overlay patches the game draws on (2026-11-20): her nipple and areola
discs (T_areola, which the nipple and areola sliders shape, read by their UVs in nipples.ts), the underwear layer
(T_lingerie, which lingerie.ts draws her bra and briefs on) and the pubic patch (T_pubic). The sculpt file had split
them off and dropped them, so on her the sliders did nothing and her smallclothes and pubic hair weren't drawn.

They are copied from a swap build's Female_Body (where they ride on real_heroin as built) and laid onto her sculpt:
each point keeps its height over the skin under it, found again on her surface. UVs stay as they are (the game
reads them); weights come from her nearest point.

  D:/blender/blender.exe -b <master>.blend --python tools/blender/tarven_bridge/overlays.py -- <build.blend> <out.blend>
"""
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

argv = sys.argv[sys.argv.index("--") + 1:]
BUILD, OUT = argv[0], argv[1]
OVERLAYS = ("T_areola", "T_lingerie", "T_pubic")
GRIDS = ("T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin", "T_hole")

rig = bpy.data.collections[core.MASTER_COLLECTION]
body = rig.all_objects["Female_Body"]
names = [s.material.name if s.material else "" for s in body.material_slots]
present = {names[p.material_index] for p in body.data.polygons}
wanted = [n for n in OVERLAYS if n not in present]
if not wanted:
    print("overlays: all present, nothing to do")
else:
    with bpy.data.libraries.load(BUILD, link=False) as (src, dst):
        dst.objects = ["Female_Body"]
    built = dst.objects[0]
    bnames = [s.material.name.split(".")[0] if s.material else "" for s in built.material_slots]

    def tree(obj, skip):
        mats = [s.material.name.split(".")[0] if s.material else "" for s in obj.material_slots]
        w = obj.matrix_world
        return BVHTree.FromPolygons([w @ v.co for v in obj.data.vertices],
                                    [p.vertices[:] for p in obj.data.polygons if mats[p.material_index] not in skip])

    built_skin = tree(built, OVERLAYS + GRIDS)
    her_skin = tree(body, OVERLAYS + GRIDS)

    # The overlay faces of the build, as a piece of their own.
    bm = bmesh.new()
    bm.from_mesh(built.data)
    keep_idx = {i for i, n in enumerate(bnames) if n in wanted}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index not in keep_idx], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bw = built.matrix_world
    moved = 0
    for v in bm.verts:
        p = bw @ v.co
        loc, n, _i, _d = built_skin.find_nearest(p)
        if loc is None:
            continue
        height = (p - loc).dot(n)
        hloc, hn, _i2, _d2 = her_skin.find_nearest(loc)
        if hloc is None:
            continue
        v.co = body.matrix_world.inverted() @ (hloc + hn * max(height, 0.0005))
        moved += 1
    piece = bpy.data.meshes.new("overlays")
    # Each face's material, kept: writing into a mesh with no materials yet sets them all to the first.
    face_mats = [f.material_index for f in bm.faces]
    bm.to_mesh(piece)
    bm.free()
    # Its materials: hers by name, added to her slots.
    slot_of = {}
    for i, n in enumerate(bnames):
        if n in wanted:
            mat = bpy.data.materials.get(n) or built.material_slots[i].material
            mat.name = n
            if mat.name not in [m.name for m in body.data.materials if m]:
                body.data.materials.append(mat)
            slot_of[i] = [m.name if m else "" for m in body.data.materials].index(n)
    obj = bpy.data.objects.new("overlays", piece)
    rig.objects.link(obj)
    obj.matrix_world = body.matrix_world
    piece.polygons.foreach_set("material_index", np.array([slot_of.get(m, 0) for m in face_mats], dtype=np.int32))
    # Its weights: her nearest point's.
    co = [body.matrix_world @ v.co for v in body.data.vertices]
    kd = KDTree(len(co))
    for i, p in enumerate(co):
        kd.insert(p, i)
    kd.balance()
    groups = {g.index: g.name for g in body.vertex_groups}
    for name in groups.values():
        obj.vertex_groups.new(name=name)
    for v in piece.vertices:
        _c, j, _d = kd.find(obj.matrix_world @ v.co)
        for g in body.data.vertices[j].groups:
            obj.vertex_groups[groups[g.group]].add([v.index], g.weight, "REPLACE")
    # Into her skin (her slot order kept, so its material indices stay right).
    indices = np.empty(len(piece.polygons), dtype=np.int32)
    piece.polygons.foreach_get("material_index", indices)
    obj.data.materials.clear()
    for m in body.data.materials:
        obj.data.materials.append(m)
    piece.polygons.foreach_set("material_index", indices)
    with bpy.context.temp_override(active_object=body, object=body, selected_objects=[body, obj],
                                   selected_editable_objects=[body, obj]):
        bpy.ops.object.join()
    bpy.data.objects.remove(built, do_unlink=True)
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    counts = {n: 0 for n in wanted}
    final = [s.material.name if s.material else "" for s in body.material_slots]
    for p in body.data.polygons:
        if final[p.material_index] in counts:
            counts[final[p.material_index]] += 1
    print("overlays: laid on", moved, "points;", counts)

core.relink_textures()
bpy.ops.wm.save_as_mainfile(filepath=OUT, relative_remap=True)
print("saved", OUT)
