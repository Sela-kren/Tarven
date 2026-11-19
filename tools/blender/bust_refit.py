"""Brings her body as the game shapes it back to a cup the user sculpted (or approved) in an older review file, when
her mesh has changed since and bust_fixes.py can't read it back point for point (points were added: her vulva's
grid, her anus's disc...).

Each point of the game's mesh at that cup (a bustexport OBJ, in the review's axes) finds the review body's surface
straight out or in from it, and moves to it: only along the surface's normal, so nothing slides, and only within
REACH of it, on her torso (HEIGHTS), so parts the old body didn't have are left alone. The move is written as
`delta_<cup>` in a new art/sculpt_fixes/female_NN.npz, measured on that OBJ (its ref_co and ref_tris), for the
build's apply_sculpt_fixes, which counts what lies where the cup slider grows her as the cup's own fix and the rest
as her body at every size.

Run (Blender, the review file open):
  blender -b art/bust_review/<sculpted>.blend -P tools/blender/bust_refit.py -- <cup> <game bust_<cup>.obj> <growth.json>
"""
import glob
import hashlib
import json
import os
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = os.environ.get("TARVEN_ROOT", os.getcwd())
OUT = os.path.join(ROOT, "art", "sculpt_fixes")
REACH = 0.02  # metres: further from the old surface than this, a point isn't the same skin
HEIGHTS = (0.9, 1.45)  # her torso, from below her navel to her neck
NOISE = 0.0003


def read_obj(path):
    co, tris = [], []
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                co.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("f "):
                tris.append([int(x.split("/")[0]) - 1 for x in line.split()[1:4]])
    return np.array(co, dtype=np.float64), np.array(tris, dtype=np.int32)


def to_build(a):
    """The review's axes (she faces -Y, her left at +X) to the build's (she faces +Y)."""
    return np.stack([-a[:, 0], -a[:, 1], a[:, 2]], axis=1)


def main():
    cup, obj_path, growth_path = sys.argv[sys.argv.index("--") + 1:][:3]
    target = bpy.data.objects[f"Bust_{cup}"]
    tree = BVHTree.FromPolygons([v.co.copy() for v in target.data.vertices], [p.vertices[:] for p in target.data.polygons])
    co, tris = read_obj(obj_path)
    delta = np.zeros_like(co)
    for i, p in enumerate(co):
        if not HEIGHTS[0] < p[2] < HEIGHTS[1]:
            continue
        hit, normal, _, dist = tree.find_nearest(Vector(p), REACH)
        if hit is None:
            continue
        along = (hit - Vector(p)).dot(normal)
        if abs(along) >= NOISE:
            delta[i] = np.array(normal) * along
    moved = np.linalg.norm(delta, axis=1)
    source = hashlib.sha1(open(obj_path, "rb").read()).hexdigest()
    out = {"ref_co": to_build(co).astype(np.float32), "ref_tris": tris, "source": np.array(source),
           f"delta_{cup}": to_build(delta).astype(np.float32)}
    growth = json.load(open(growth_path))
    for name, values in growth.items():
        if len(values) == len(co):
            out[f"grown_{name}"] = np.array(values, dtype=np.float32)
    layers = sorted(glob.glob(os.path.join(OUT, "female_*.npz")))
    path = os.path.join(OUT, f"female_{len(layers) + 1:02d}.npz")
    np.savez_compressed(path, **out)
    print("REFIT", os.path.basename(path), cup, "points moved", int((moved > 0).sum()),
          "most mm", round(float(moved.max()) * 1000, 1), "grown", sorted(k for k in out if k.startswith("grown_")))


main()
