"""Gives her hand-sculpted vulva back the UV grid the game reads it by (vulva.ts readVulva; 2026-11-20).

The user remeshed and sculpted her vulva by hand. Its shape is theirs and stays exactly as it is, but the remesh
scrambled its UVs: only 355 of the grid's 1225 cells had a point, so the game didn't find her vulva and never shaped it
(arousal, opening). Each point of her T_vulva, T_labia and T_canal faces takes the UV of the matching spot on a swap
build's intact grid (the nearest point on the same material there, its UV between that face's corners).

  D:/blender/blender.exe -b <master>.blend --python tools/blender/tarven_bridge/vulva_uv.py -- <build.blend> <out.blend>
"""
import os
import sys

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
BUILD, OUT = argv[0], argv[1]
MATERIALS = ("T_vulva", "T_labia", "T_canal")

body = bpy.data.collections[core.MASTER_COLLECTION].all_objects["Female_Body"]
with bpy.data.libraries.load(BUILD, link=False) as (src, dst):
    dst.objects = ["Female_Body"]
built = dst.objects[0]


def plain(name):
    stem, _, tail = name.rpartition(".")
    return stem if stem and tail.isdigit() else name


bnames = [plain(s.material.name) if s.material else "" for s in built.material_slots]
names = [s.material.name if s.material else "" for s in body.material_slots]
bw, hw = built.matrix_world, body.matrix_world
buv = built.data.uv_layers["UVMap"].data
huv = body.data.uv_layers["UVMap"].data
bverts = [bw @ v.co for v in built.data.vertices]
report = {}
for mat in MATERIALS:
    faces = [p for p in built.data.polygons if bnames[p.material_index] == mat]
    if not faces:
        continue
    tris, tri_uv = [], []
    for p in faces:
        loops = list(p.loop_indices)
        for k in range(1, len(loops) - 1):
            ids = (loops[0], loops[k], loops[k + 1])
            tris.append([built.data.loops[i].vertex_index for i in ids])
            tri_uv.append([Vector((*buv[i].uv, 0.0)) for i in ids])
    tree = BVHTree.FromPolygons(bverts, tris)
    # Each of her points once (all its corners in these faces take the same UV, so no new splits inside the patch).
    target = {}
    for p in body.data.polygons:
        if names[p.material_index] != mat:
            continue
        for li in p.loop_indices:
            v = body.data.loops[li].vertex_index
            if v not in target:
                at = hw @ body.data.vertices[v].co
                loc, _n, t, _d = tree.find_nearest(at)
                if loc is None:
                    continue
                a, b, c = (bverts[i] for i in tris[t])
                ua, ub, uc = tri_uv[t]
                target[v] = barycentric_transform(loc, a, b, c, ua, ub, uc).xy
            huv[li].uv = target[v]
    report[mat] = len(target)
# Every cell of the grid gets a point of hers for certain (projection leaves the cells inside the folds unclaimed):
# for each cell, her nearest unclaimed vulva point to where the build has that cell takes the cell's exact UV.
from mathutils.kdtree import KDTree  # noqa: E402
COLS, ROWS = 25, 49
cells = {}
for p in built.data.polygons:
    if bnames[p.material_index] not in ("T_vulva", "T_labia"):
        continue
    for li in p.loop_indices:
        u, v = buv[li].uv
        g = (min(COLS - 1, max(0, round(u * (COLS - 1)))), min(ROWS - 1, max(0, round(v * (ROWS - 1)))))
        cells.setdefault(g, []).append(bverts[built.data.loops[li].vertex_index])
mine = {}
for p in body.data.polygons:
    if names[p.material_index] in ("T_vulva", "T_labia"):
        for li in p.loop_indices:
            mine.setdefault(body.data.loops[li].vertex_index, []).append(li)
ids = list(mine)
kd = KDTree(len(ids))
for k, v in enumerate(ids):
    kd.insert(hw @ body.data.vertices[v].co, k)
kd.balance()
claimed = set()
for (c, r), pts in sorted(cells.items()):
    centre = sum(pts, Vector()) / len(pts)
    for _co, k, _d in kd.find_n(centre, 1024):
        v = ids[k]
        if v not in claimed:
            claimed.add(v)
            for li in mine[v]:
                huv[li].uv = (c / (COLS - 1), r / (ROWS - 1))
            break
report["cells claimed"] = len(claimed)
report["cells"] = len(cells)
bpy.data.objects.remove(built, do_unlink=True)
bpy.ops.outliner.orphans_purge(do_recursive=True)
print("vulva_uv: points given the grid's UVs", report)
core.relink_textures()
bpy.ops.wm.save_as_mainfile(filepath=OUT, relative_remap=True)
print("saved", OUT)
