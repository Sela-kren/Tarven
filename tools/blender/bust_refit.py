"""Brings her body as the game shapes it back onto the user's sculpts in a bust review file, every reviewed cup at
once, when her mesh has changed since the review and bust_fixes.py can't read it back point for point (points were
added: her vulva's grid, her anus's disc...).

For each cup, her skin as the game shapes it (a bustexport OBJ, in the review's axes) is fitted to the review's
Bust_<cup> surface by snapping and relaxing, a few rounds: each point goes to the sculpted surface nearest it, then
each is eased towards its neighbours' middle (so points that bunched into a fold of her skin, where the game's mesh
crinkled under her bust, spread out evenly), then snaps again. It ends on the sculpt, smooth as the sculpt is.
Only her skin's own materials (SKIN) are fitted, on her torso (HEIGHTS, faded in and out over FADE), and only within
REACH of the surface; what lies over her skin (her nipple discs, the lingerie and pubic patches...) takes the move of
the skin point nearest it, so the two never part.

The moves go into a new art/sculpt_fixes/female_NN.npz as `delta_<cup>`, on the C cup's surface (ref_co, ref_tris),
with the cup slider's growth (`grown_<cup>`), for the build's apply_sculpt_fixes, which counts what lies where the cup
slider grows her as that cup's own fix and the rest as her body at every size.

Export first (all cups, for the growth): ONLY=tools/posepreview/bustexport.preview.ts POSE_OUT=<dir> npx vitest run
--config tools/posepreview/vitest.config.ts
Run (Blender, the review file open):
  blender -b art/bust_review/<sculpted>.blend -P tools/blender/bust_refit.py -- <cups, e.g. A,C,F,J> <export dir> <female.glb>
"""
import glob
import hashlib
import json
import os
import struct
import sys

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

ROOT = os.environ.get("TARVEN_ROOT", os.getcwd())
OUT = os.path.join(ROOT, "art", "sculpt_fixes")
SKIN = ("T_skin_f", "T_bra", "T_smalls")  # her skin's materials, the parts of the body mesh that are fitted
REACH = 0.02  # metres: further from the sculpted surface than this, a point isn't the same skin
HEIGHTS = (0.9, 1.42)  # her torso and shoulders, from below her navel up her neck (its open edge isn't relaxed)
FADE = 0.03  # the fit fades in and out over this much at either end of HEIGHTS
ROUNDS = 6  # snap and relax, this many times, then a last snap
RELAX = (2, 0.5)  # passes of easing towards the neighbours' middle each round, and how far each goes
SHEET = 0.006  # metres: a point ending further than this from its first landing jumped across a crease
CREASE_FILL = 60  # passes filling such points' moves in from their neighbours'
NOISE = 0.0003


def read_obj(path):
    co, tris, parts = [], [], []
    with open(path) as f:
        for line in f:
            if line.startswith("o "):
                parts.append(len(co))
            elif line.startswith("v "):
                co.append([float(x) for x in line.split()[1:4]])
            elif line.startswith("f "):
                tris.append([int(x.split("/")[0]) - 1 for x in line.split()[1:4]])
    return np.array(co, dtype=np.float64), np.array(tris, dtype=np.int32), parts + [len(co)]


def body_materials(glb):
    """The body mesh's materials in primitive order, which is the order bustexport writes its parts in."""
    data = open(glb, "rb").read()
    length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + length])
    mesh = next(m for m in gltf["meshes"] if m["name"].endswith("_Body"))
    return [gltf["materials"][p["material"]]["name"] for p in mesh["primitives"]]


def to_build(a):
    """The review's axes (she faces -Y, her left at +X) to the build's (she faces +Y)."""
    return np.stack([-a[:, 0], -a[:, 1], a[:, 2]], axis=1)


def fade(z):
    lo = np.clip((z - HEIGHTS[0]) / FADE + 0.5, 0, 1)
    hi = np.clip((HEIGHTS[1] - z) / FADE + 0.5, 0, 1)
    t = np.minimum(lo, hi)
    return t * t * (3 - 2 * t)


def fit(cup, co, tris, skin):
    """The moves fitting the skin points (`skin`, a mask) of `co` onto Bust_<cup>."""
    target = bpy.data.objects[f"Bust_{cup}"]
    tree = BVHTree.FromPolygons([v.co.copy() for v in target.data.vertices], [p.vertices[:] for p in target.data.polygons])
    # Skin points welded where they share a spot, and each one's neighbours along the skin's triangles.
    keys = {}
    node = np.array([keys.setdefault(tuple(np.round(p, 5)), len(keys)) for p in co])
    nodes = len(keys)
    at = np.zeros((nodes, 3))
    at[node] = co
    on_skin = np.zeros(nodes, bool)
    on_skin[node[skin]] = True
    around = [set() for _ in range(nodes)]
    edge_count = {}
    for a, b, c in tris:
        if not (skin[a] and skin[b] and skin[c]):
            continue
        for u, v in ((a, b), (b, c), (c, a)):
            if node[u] != node[v]:
                around[node[u]].add(node[v])
                around[node[v]].add(node[u])
                key = (min(node[u], node[v]), max(node[u], node[v]))
                edge_count[key] = edge_count.get(key, 0) + 1
    # Points on an open edge of her skin (her neck's, where the skin meets another material) aren't relaxed: easing
    # pulls an open edge in on itself.
    border = np.zeros(nodes, bool)
    for (u, v), count in edge_count.items():
        if count == 1:
            border[u] = border[v] = True
    weight = fade(at[:, 2]) * on_skin
    start = at.copy()

    # Every move is straight in or out along the sculpted surface's normal, never along it: points sliding over her
    # skin would carry her nipples, navel and the clothes' anchors off their places.
    normal = np.zeros((nodes, 3))

    def snap():
        """Each point in or out onto the surface; returns which found it within REACH (and their normals)."""
        found = np.zeros(nodes, bool)
        for n in np.nonzero(weight > 0)[0]:
            hit, nrm, _, _ = tree.find_nearest(Vector(at[n]), REACH)
            if hit is not None:
                normal[n] = nrm
                at[n] += normal[n] * (np.array(hit) - at[n]).dot(normal[n]) * weight[n]
                found[n] = True
        return found

    first = at.copy()
    snap()
    first_on = at.copy()  # where each point first lands on the sculpt
    at[:] = first
    for _ in range(ROUNDS):
        relax = weight * (snap() & ~border)
        for _ in range(RELAX[0]):
            mean = at.copy()
            for n in np.nonzero(relax > 0)[0]:
                if around[n]:
                    mean[n] = at[list(around[n])].mean(axis=0)
            along = ((mean - at) * normal).sum(axis=1)
            at += normal * (along * RELAX[1] * relax)[:, None]
    snap()
    # In the tight crease under her bust, easing carried some points across it and they landed on its other side (the
    # breast's underside instead of her chest); and where it first landed may be the wrong side too (a lump under her
    # bust). Any point ending further than SHEET from its first landing isn't snapped at all: its move is filled in
    # from its neighbours', smoothly across the crease.
    jumped = (np.linalg.norm(at - first_on, axis=1) > SHEET) & (weight > 0)
    moved = at - start
    for _ in range(CREASE_FILL):
        for n in np.nonzero(jumped)[0]:
            if around[n]:
                moved[n] = moved[list(around[n])].mean(axis=0) * weight[n]
    print("  crease points filled from their neighbours:", int(jumped.sum()))
    size = np.linalg.norm(moved, axis=1)
    moved[(size < NOISE) | (size > REACH)] = 0
    delta = moved[node]
    # What lies over her skin rides with the skin point nearest it.
    kd = KDTree(int(skin.sum()))
    skin_index = np.nonzero(skin)[0]
    for k, i in enumerate(skin_index):
        kd.insert(co[i], k)
    kd.balance()
    for i in np.nonzero(~skin)[0]:
        _, k, dist = kd.find(co[i])
        if dist < REACH:
            delta[i] = delta[skin_index[k]]
    return delta


def main():
    cups, folder, glb = sys.argv[sys.argv.index("--") + 1:][:3]
    materials = body_materials(glb)
    # The surface the build finds her points on: her body as built, no cup fixes (bustexport's bust_bare.obj). Each of
    # her points then lands exactly on its own spot; on the C cup, which wears its own fix, points in the crease
    # under her bust and in her armpit found the skin across the crease and took its move, as crinkles.
    ref_path = os.path.join(folder, "bust_bare.obj")
    if not os.path.exists(ref_path):
        raise SystemExit(f"{ref_path} is missing: export again with the current bustexport.preview.ts")
    ref_co, ref_tris, _ = read_obj(ref_path)
    out = {"ref_co": to_build(ref_co).astype(np.float32), "ref_tris": ref_tris,
           "source": np.array(hashlib.sha1(open(ref_path, "rb").read()).hexdigest())}
    growth = json.load(open(os.path.join(folder, "growth.json")))
    for name, values in growth.items():
        if len(values) == len(ref_co):
            out[f"grown_{name}"] = np.array(values, dtype=np.float32)
    for cup in cups.split(","):
        co, tris, parts = read_obj(os.path.join(folder, f"bust_{cup}.obj"))
        if len(co) != len(ref_co) or len(parts) - 1 != len(materials):
            raise SystemExit(f"bust_{cup}.obj doesn't line up with bust_C.obj and {glb}")
        skin = np.zeros(len(co), bool)
        for k, name in enumerate(materials):
            if name in SKIN:
                skin[parts[k]:parts[k + 1]] = True
        delta = fit(cup, co, tris, skin)
        out[f"delta_{cup}"] = to_build(delta).astype(np.float32)
        size = np.linalg.norm(delta, axis=1)
        print("REFIT", cup, "points moved", int((size > 0).sum()), "most mm", round(float(size.max()) * 1000, 1))
    layers = sorted(glob.glob(os.path.join(OUT, "female_*.npz")))
    path = os.path.join(OUT, f"female_{len(layers) + 1:02d}.npz")
    np.savez_compressed(path, **out)
    print("REFIT wrote", os.path.basename(path))


main()
