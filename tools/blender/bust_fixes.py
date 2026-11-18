"""Reads the user's sculpting in the bust review file back as fixes for the build (build_world.apply_sculpt_fixes).

Open the sculpted art/bust_review/bust_review.blend and run this: each Bust_<cup> is compared with the same cup
rebuilt from its OBJ (bust_review.load_size, so the points line up one for one), and how far each point of the
game's mesh was moved is written, in the build's axes, to art/sculpt_fixes/female_NN.npz together with the C cup's
surface (her as built) for the build to find its own points on.

The fixes stack: each review is exported from a build that already wears the earlier ones, so each file holds only
what changed since. Re-running on the same review (the same OBJs) replaces its file instead of adding another.

Run: D:\\blender\\blender.exe -b art/bust_review/bust_review.blend -P tools/blender/bust_fixes.py
"""
import glob
import hashlib
import json
import os
import sys

import bpy
import numpy as np
from mathutils import kdtree

ROOT = os.environ.get("TARVEN_ROOT", os.getcwd())
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bust_review  # noqa: E402

REVIEW = os.path.join(ROOT, "art", "bust_review")
OUT = os.path.join(ROOT, "art", "sculpt_fixes")
# Smaller moves than this are left out of a cup's fix (welding and float noise).
NOISE = 0.0003


def read_obj(path):
    """The OBJ's points and triangles, in its own order (the game's mesh order)."""
    co, tris = [], []
    with open(path) as f:
        for line in f:
            if line.startswith("v "):
                co.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("f "):
                tris.append([int(x.split("/")[0]) - 1 for x in line.split()[1:4]])
    return np.array(co, dtype=np.float64), np.array(tris, dtype=np.int32)


def to_build(a):
    """The review file's axes (she faces -Y, her left at +X) to the build's (she faces +Y)."""
    return np.stack([-a[:, 0], -a[:, 1], a[:, 2]], axis=1)


def mesh_co(mesh):
    a = np.empty(len(mesh.vertices) * 3)
    mesh.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def main():
    index = json.load(open(os.path.join(REVIEW, "index.json")))
    only = sys.argv[sys.argv.index("--") + 1].split(",") if "--" in sys.argv else None
    ref_co, ref_tris = read_obj(os.path.join(REVIEW, "bust_C.obj"))
    source = hashlib.sha1(open(os.path.join(REVIEW, "bust_C.obj"), "rb").read()).hexdigest()
    out = {"ref_co": to_build(ref_co).astype(np.float32), "ref_tris": ref_tris, "source": np.array(source)}
    report = {}
    # How far the cup slider itself moves each point at every reviewed cup, from the C cup: the build counts what the
    # user moved where the slider moves her as that cup's (the breast's), and the rest as her body's, at every size.
    # The slider's own growth, without the fixes already in (growth.json, from the export); measured from the OBJs
    # instead, a cup's own fix counted as its growth, and each re-reading moved the line between breast and body.
    growth_path = os.path.join(REVIEW, "growth.json")
    growth = json.load(open(growth_path)) if os.path.exists(growth_path) else {}
    for entry in index:
        if entry["cup"] in growth:
            out[f"grown_{entry['cup']}"] = np.array(growth[entry["cup"]], dtype=np.float32)
        else:
            grown_co, _ = read_obj(os.path.join(REVIEW, entry["file"]))
            out[f"grown_{entry['cup']}"] = np.linalg.norm(grown_co - ref_co, axis=1).astype(np.float32)
    for entry in index:
        cup = entry["cup"]
        sculpt = bpy.data.objects.get(f"Bust_{cup}")
        if sculpt is None or (only and cup not in only):
            continue
        ref = bust_review.load_size(os.path.join(REVIEW, entry["file"]), f"Ref_{cup}")
        if len(ref.data.vertices) != len(sculpt.data.vertices):
            raise SystemExit(f"Bust_{cup}: {len(sculpt.data.vertices)} points, the review had "
                             f"{len(ref.data.vertices)}: points were added or removed, so it can't be read back")
        moved = mesh_co(sculpt.data) - mesh_co(ref.data)
        game_co, _ = read_obj(os.path.join(REVIEW, entry["file"]))
        kd = kdtree.KDTree(len(ref.data.vertices))
        for i, v in enumerate(ref.data.vertices):
            kd.insert(v.co, i)
        kd.balance()
        at = np.array([kd.find(p)[1] for p in game_co])
        delta = moved[at]
        delta[np.linalg.norm(delta, axis=1) < NOISE] = 0
        bpy.data.objects.remove(ref)
        if not delta.any():
            continue
        out[f"delta_{cup}"] = to_build(delta).astype(np.float32)
        report[cup] = {"points": int((np.linalg.norm(delta, axis=1) > 0).sum()),
                       "most_mm": round(float(np.linalg.norm(delta, axis=1).max()) * 1000, 1)}
    os.makedirs(OUT, exist_ok=True)
    layers = sorted(glob.glob(os.path.join(OUT, "female_*.npz")))
    path = None
    if layers and str(np.load(layers[-1])["source"]) == source:
        path = layers[-1]
    if path is None:
        path = os.path.join(OUT, f"female_{len(layers) + 1:02d}.npz")
    np.savez_compressed(path, **out)
    print("FIXES", os.path.basename(path), json.dumps(report))


main()
