"""Carries the user's sculpting at one cup on to bigger cups, scaled to each breast's size, in a bust review file.

Every cup is the same mesh grown, so a point means the same place on her at every size: the user's change at the
source cup (this file against `ref`, the file as it was before they sculpted it) is added to each target cup point
for point, scaled by how much bigger that cup's breasts are (their mean distance from their middle, past the C cup).
Saves the file, so the targets carry the user's direction for them to check; tools/blender/bust_fixes.py reads it
back as usual.

Run: D:\\blender\\blender.exe -b <sculpted review>.blend -P tools/blender/bust_extend.py -- <ref.blend> M Q,U,Z
"""
import sys

import bpy
import numpy as np

ref_path, source, targets = sys.argv[sys.argv.index("--") + 1:]
targets = targets.split(",")


def co_of(mesh):
    a = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def breast_size(co, base):
    """How big the breasts are: the mean distance of the grown points from their middle, both sides."""
    grown = np.linalg.norm(co - base, axis=1)
    mine = grown > 0.15 * grown.max()
    sizes = []
    for side in (-1, 1):
        m = mine & (np.sign(co[:, 0]) == side)
        sizes.append(np.linalg.norm(co[m] - co[m].mean(0), axis=1).mean())
    return float(np.mean(sizes))


with bpy.data.libraries.load(ref_path) as (src, dst):
    dst.meshes = [f"Bust_{source}"]
ref = co_of(dst.meshes[0])
base = co_of(bpy.data.objects["Bust_C"].data)
sculpted = co_of(bpy.data.objects[f"Bust_{source}"].data)
change = sculpted - ref
# Smoothed over the surface first: scaled up for a much bigger cup, a sharp step in the user's strokes (where the
# upper slope meets the chest) became a crease. SMOOTH passes, each point halfway to its neighbours' mean.
SMOOTH = 12
mesh = bpy.data.objects[f"Bust_{source}"].data
edges = np.empty(len(mesh.edges) * 2, dtype=np.int64)
mesh.edges.foreach_get("vertices", edges)
edges = edges.reshape(-1, 2)
degree = np.bincount(edges.ravel(), minlength=len(change)).astype(float)[:, None]
for _ in range(SMOOTH):
    total = np.zeros_like(change)
    np.add.at(total, edges[:, 0], change[edges[:, 1]])
    np.add.at(total, edges[:, 1], change[edges[:, 0]])
    change = 0.5 * change + 0.5 * total / np.maximum(degree, 1)
size = breast_size(ref, base)
for cup in targets:
    obj = bpy.data.objects[f"Bust_{cup}"]
    co = co_of(obj.data)
    k = breast_size(co, base) / size
    new = co + change * k
    obj.data.vertices.foreach_set("co", new.ravel())
    obj.data.update()
    print(f"extend {source} -> {cup}: x{k:.2f}, most {np.linalg.norm(change, axis=1).max() * k * 1000:.1f} mm")
bpy.ops.wm.save_mainfile()
