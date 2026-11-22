"""Builds art/female_crotch_keys.blend: her hips and upper thighs from the master, legs open, with her vulva's and
anus's eight shape keys (crotch_keys.KEY_NAMES), each started from a first shape for the user to sculpt from:

  *_Open     the game's own opening (tools/bridge/crotchbake.preview.ts bakes it)
  *_SpreadL  half of Open on her left side only, plus her left side pulled out sideways (a hand's pull); R mirrored
  *_Close    drawn in: the vulva's lips pressed towards the middle, the anus's rim gathered in and sunk

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/crotch_keys_build.py -- <bake.json> [out.blend]

It never writes over an existing keys file (the user's sculpting) unless FORCE=1 is set, and then backs it up first.
Run on the master as the game has it: the GLB's points are where the keys file's Basis is.
"""
import base64
import heapq
import json
import math
import os
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Matrix
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402
import crotch_keys  # noqa: E402

#: What's kept of her (Blender metres, Z up, she faces +Y, her own right is +X): hips to mid thigh.
KEEP_Z = (0.72, 1.06)
KEEP_X = 0.24
#: Her pubic hair and the lingerie shells lie over the skin in Female_Body itself: not wanted here.
OVERLAYS = ("T_lingerie", "T_pubic")
#: Her thighs turned out (degrees about Y), as the vulva and anus review files had them, so both are in sight.
LEGS_OPEN = 25.0
#: Every first shape fades to nothing over this far (metres) in from the edge of the keys' area.
FADE = 0.004
#: A point of the game's opening this far (metres) off its neighbours' mean move is a shard, not kept.
SHARD = 0.0008
#: How far along her skin (metres) from her slit and canal, and from her anus's rim and canal, the keys reach: all
#: of it to the first, easing to nothing at the second. Her creases' folded skin lies further.
VULVA_NEAR = (0.006, 0.013)
ANUS_NEAR = (0.008, 0.016)
#: Spread: the share of Open each side takes (both together open her this much), and the side's sideways pull.
SPREAD_OPEN = 0.6
VULVA_PULL = 0.003
ANUS_PULL = 0.003
#: Close: how far her lips are pressed in (share of their distance from the middle), and the anus's rim gathered in
#: (share of its distance from the middle) and sunk.
VULVA_PRESS = 0.12
ANUS_GATHER = 0.25
ANUS_SINK = 0.0008
#: How near (metres) a point must sit to be the bake's: the exporter's sums move points by about 1e-7 m.
NEAR = 2e-6

README = """Her vulva's and anus's shape keys (Tarven), four each:

  Vulva_Close / Anus_Close      clenched shut, tighter than at rest
  Vulva_Open / Anus_Open        open round something in her. The game plays 1 as fully open and up to 2 stretched
  Vulva_SpreadL / Anus_SpreadL  her own LEFT side (-X) pulled open by a hand
  Vulva_SpreadR / Anus_SpreadR  her own RIGHT side (+X) pulled open by a hand. Both Spreads together = two hands.

The game mixes them: set values in Tarven tab > Crotch keys (or Shape Keys) to see a mix, e.g. both Spreads at 1.

- First shapes: Open is the game's old opening; each Spread is 0.6 of Open on its side plus a sideways pull; Close
  presses the lips in and gathers the anus's rim. They're starting points: sculpt them.
- To sculpt a key: Tarven tab > Crotch keys > the sculpt button next to it (pins it), then sculpt. Unpin to see mixes.
- Her legs are open by the armature (thighs turned out). The keys are made on her as built, so sculpt as she is here.
- Only the vulva's and anus's own faces can move (the game moves those meshes alone). The sculpt mask covers the rest:
  don't clear it. Moves outside are left out on Send (and counted).
- Don't sculpt Basis: the game finds her points by where they sit there.
- Tarven tab > Send crotch keys writes public/models/female_crotch.json; the game reloads.
"""


def _floats(text):
    return np.frombuffer(base64.b64decode(text), dtype="<f4")


def _ints(text):
    return np.frombuffer(base64.b64decode(text), dtype="<u4")


def _zup(a):
    """The GLB's Y-up back to Blender's Z-up: (x, -z, y)."""
    return np.stack([a[:, 0], -a[:, 2], a[:, 1]], axis=1)


def _smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def _piece(body):
    """Her hips and upper thighs as the GLB has them (no keys, none of the master's own attributes), without the
    overlays."""
    mesh = body.data.copy()
    if mesh.shape_keys:
        holder = bpy.data.objects.new("_ck_keys", mesh)
        holder.shape_key_clear()
        bpy.data.objects.remove(holder)
    # Her custom normals don't follow a key's moves (shading flaps a few cm off where it moves): sculpt on true
    # shading. The game works out her vulva's and anus's normals from their shape anyway.
    for attr in [a.name for a in mesh.attributes if a.name.startswith("_") or a.name == "custom_normal"]:
        mesh.attributes.remove(mesh.attributes[attr])
    over = {i for i, m in enumerate(mesh.materials) if m and m.name in OVERLAYS}
    bm = bmesh.new()
    bm.from_mesh(mesh)
    gone = [f for f in bm.faces if f.material_index in over
            or any(not (KEEP_Z[0] <= v.co.z <= KEEP_Z[1] and abs(v.co.x) <= KEEP_X) for v in f.verts)]
    bmesh.ops.delete(bm, geom=gone, context="FACES_ONLY")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return mesh


def _baked(entry, co):
    """The bake's moves for these points, per key: {key: (n, 3) array, Blender Z-up}; and how many baked points
    weren't found."""
    rest = _zup(_floats(entry["rest"]).reshape(-1, 3))
    tree = KDTree(len(rest))
    for i, p in enumerate(rest):
        tree.insert(p, i)
    tree.balance()
    of = np.full(len(co), -1)
    for v, p in enumerate(co):
        _co, i, dist = tree.find(p)
        if i is not None and dist <= NEAR:
            of[v] = i
    out = {}
    for name, key in entry["keys"].items():
        move = np.zeros((len(rest), 3), np.float32)
        move[_ints(key["points"])] = _zup(_floats(key["deltas"]).reshape(-1, 3))
        d = np.zeros((len(co), 3), np.float32)
        d[of >= 0] = move[of[of >= 0]]
        out[name] = d
    return out, len(rest) - len(set(of[of >= 0].tolist()))


def _edges(mesh):
    edges = np.empty(len(mesh.edges) * 2, np.int32)
    mesh.edges.foreach_get("vertices", edges)
    return edges.reshape(-1, 2)


def _along(mesh, co, sources, limit):
    """How far each point is from the nearest of `sources` along her skin (the mesh's edges), up to `limit`. Her
    creases' skin lies close to her slit in space but far from it along her skin."""
    n = len(co)
    e = _edges(mesh)
    lengths = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1)
    links = [[] for _ in range(n)]
    for (a, b), length in zip(e.tolist(), lengths.tolist()):
        links[a].append((b, length))
        links[b].append((a, length))
    dist = np.full(n, np.inf)
    heap = [(0.0, int(v)) for v in sources]
    for v in sources:
        dist[v] = 0.0
    heapq.heapify(heap)
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist[v] or d > limit:
            continue
        for w, length in links[v]:
            nd = d + length
            if nd < dist[w]:
                dist[w] = nd
                heapq.heappush(heap, (nd, w))
    return np.minimum(dist, limit)


def _harmonic(mesh, free, known):
    """Fills the `free` points' moves smoothly between the rest (`known`, (n, 3)): each the mean of its neighbours'
    (a Laplace solve, by conjugate gradients). Points not free keep theirs."""
    e = _edges(mesh)
    n = len(known)
    a = np.concatenate([e[:, 0], e[:, 1]])
    b = np.concatenate([e[:, 1], e[:, 0]])
    deg = np.bincount(a, minlength=n).astype(np.float64)
    inner = free[a] & free[b]
    ai, bi = a[inner], b[inner]
    rhs = np.zeros((n, 3))
    edge_in = free[a] & ~free[b]
    np.add.at(rhs, a[edge_in], known[b[edge_in]])

    def apply(x):
        y = deg[:, None] * x
        np.subtract.at(y, ai, x[bi])
        y[~free] = 0
        return y

    x = np.zeros((n, 3))
    r = rhs.copy()
    r[~free] = 0
    p = r.copy()
    rr = (r * r).sum(axis=0)
    for _ in range(4000):
        ap = apply(p)
        alpha = rr / np.maximum((p * ap).sum(axis=0), 1e-30)
        x += p * alpha
        r -= ap * alpha
        new = (r * r).sum(axis=0)
        if new.max() < 1e-22:
            break
        p = r + p * (new / np.maximum(rr, 1e-30))
        rr = new
    out = known.astype(np.float64).copy()
    out[free] = x[free]
    return out


def _tree(points):
    tree = KDTree(len(points))
    for i, p in enumerate(points):
        tree.insert(p, i)
    tree.balance()
    return tree


def _fade(co, area):
    """0 outside the area, rising to 1 FADE away from the nearest point outside it, measured straight (not along the
    mesh): layers of her skin folded together in her creases lie at one spot and must move as one."""
    fixed = np.nonzero(~area)[0]
    tree = _tree(co[fixed])
    out = np.zeros(len(co))
    for v in np.nonzero(area)[0]:
        out[v] = tree.find(co[v])[2]
    return _smooth(0.0, FADE, np.minimum(out, FADE)) * area


def _unshard(co, trusted, moves):
    """The `trusted` points less those whose move goes off from the trusted points round them (the game's shards)."""
    trusted = trusted.copy()
    for _ in range(3):
        idx = np.nonzero(trusted)[0]
        tree = _tree(co[idx])
        odd = []
        for v in idx:
            near = [idx[j] for _c, j, _d in tree.find_range(co[v], 0.0015)]
            if len(near) < 4 or np.linalg.norm(moves[v] - np.median(moves[near], axis=0)) > SHARD:
                odd.append(v)
        if not odd:
            break
        trusted[odd] = False
    return trusted


def _material_points(mesh, names):
    wanted = {i for i, m in enumerate(mesh.materials) if m and m.name in names}
    return np.array(sorted({v for p in mesh.polygons if p.material_index in wanted for v in p.vertices}), int)


def _first_shapes(mesh, co, area, fade, baked):
    """Every key's first shape, (n, 3) moves in Blender's space, inside the area only."""
    n = len(co)
    x = co[:, 0]
    keys = {name: np.zeros((n, 3), np.float32) for name in crotch_keys.KEY_NAMES}
    movable = crotch_keys.key_area(mesh, strict=False)
    vulva = np.zeros(n, bool)
    vulva[_material_points(mesh, ("T_vulva", "T_labia", "T_canal"))] = True
    # The game's own opening on her inner lips, slit and canal (its grid). Her outer lips' skin follows them smoothly,
    # out to the vulva's edge, which stays: the game's own opening shreds the skin there (the skin filled in behind her
    # vulva in 2026-11 has texture places that don't follow its grid).
    slit_points = _material_points(mesh, ("T_vulva", "T_canal"))
    near_v = 1 - _smooth(VULVA_NEAR[0], VULVA_NEAR[1], _along(mesh, co, slit_points, VULVA_NEAR[1]))
    near_a = 1 - _smooth(ANUS_NEAR[0], ANUS_NEAR[1], _along(mesh, co, _material_points(mesh, ("T_anus",)), ANUS_NEAR[1]))
    if "Vulva_Open" in baked:
        moves = baked["Vulva_Open"].astype(np.float64)
        trusted = np.zeros(n, bool)
        trusted[slit_points] = True
        trusted = _unshard(co, trusted, moves)
        # Free: inside the area (and the few points deep in her where it meets skin faces, which the game has always
        # moved), within reach of the slit; from the game's own moves on the slit to nothing at the reach's end.
        inner = movable & (np.linalg.norm(moves, axis=1) > 0.001)
        free = vulva & (area | inner) & ~trusted & (near_v > 0)
        filled = _harmonic(mesh, free, np.where(trusted[:, None], moves, 0.0))
        keys["Vulva_Open"] = (filled * np.where(trusted | inner, 1.0, near_v * fade)[:, None]).astype(np.float32)
        print(f"crotch_keys_build: Vulva_Open: {int((slit_points.size - trusted.sum()))} of the slit's points' moves "
              "left out as shards")
    if "Anus_Open" in baked:
        keys["Anus_Open"] = baked["Anus_Open"].copy()
    # Which side each point is on: 1 on her left (-X), 0 on her right, a half on the middle line.
    left = _smooth(0.002, -0.002, x)

    # Her vulva: its slit's middle and its run (the inner lips' points' longest spread), its half length along it.
    slit = co[_material_points(mesh, ("T_vulva",))]
    middle = slit.mean(axis=0)
    spread = slit - middle
    spread[:, 0] = 0  # its run is along her, in the middle plane
    run = np.linalg.svd(spread, full_matrices=False)[2][0]
    along = (co - middle) @ run
    half = np.abs(spread @ run).max()
    lengthwise = 1 - _smooth(0.7, 1.15, np.abs(along) / half)
    for name, side, sign in (("Vulva_SpreadL", left, -1.0), ("Vulva_SpreadR", 1 - left, 1.0)):
        out = sign * x  # how far out on this side
        pull = _smooth(0.0, 0.005, out) * (1 - _smooth(0.009, 0.016, out)) * lengthwise * near_v * fade * vulva
        move = SPREAD_OPEN * keys["Vulva_Open"] * side[:, None]
        move[:, 0] += sign * VULVA_PULL * pull
        keys[name] = move
    press = (1 - _smooth(0.008, 0.016, np.abs(x))) * lengthwise * near_v * fade * vulva
    keys["Vulva_Close"][:, 0] = -x * VULVA_PRESS * press

    # Her anus: its middle (on her skin, x on the middle line) and the way it faces (its disc's faces, on average).
    anus = np.zeros(n, bool)
    anus[_material_points(mesh, ("T_anus", "T_anus_skin"))] = True
    rim = [i for i, m in enumerate(mesh.materials) if m and m.name == "T_anus_skin"]
    normal = np.zeros(3)
    for p in mesh.polygons:
        if p.material_index in rim:
            normal += np.array(p.normal) * p.area
    normal[0] = 0
    normal /= np.linalg.norm(normal)
    disc = co[_material_points(mesh, ("T_anus_skin",))]
    centre = disc.mean(axis=0)
    centre[0] = 0
    rel = co - centre
    flat = rel - np.outer(rel @ normal, normal)
    r = np.linalg.norm(flat, axis=1)
    sideways = np.array([1.0, 0, 0]) - normal[0] * normal
    sideways /= np.linalg.norm(sideways)
    for name, side, sign in (("Anus_SpreadL", left, -1.0), ("Anus_SpreadR", 1 - left, 1.0)):
        out = sign * x
        pull = _smooth(0.0, 0.004, out) * (1 - _smooth(0.012, 0.024, r)) * near_a * fade * anus
        move = SPREAD_OPEN * keys["Anus_Open"] * side[:, None]
        move += np.outer(sign * ANUS_PULL * pull, sideways)
        keys[name] = move
    gather = _smooth(0.0, 0.003, r) * (1 - _smooth(0.006, 0.018, r)) * near_a * fade * anus
    sink = (1 - _smooth(0.002, 0.015, r)) * near_a * fade * anus
    keys["Anus_Close"] = (-flat * (ANUS_GATHER * gather)[:, None] - np.outer(ANUS_SINK * sink, normal)).astype(np.float32)

    for name in keys:
        keys[name][~movable] = 0
    return keys


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("usage: crotch_keys_build.py -- <bake.json> [out.blend]")
    with open(argv[0], encoding="utf-8") as f:
        bake = json.load(f)
    out = os.path.abspath(argv[1] if len(argv) > 1 else os.path.join(core.repo_root(), "art", "female_crotch_keys.blend"))
    if os.path.exists(out):
        if os.environ.get("FORCE") != "1":
            raise SystemExit(f"{out} exists (the user's sculpting): set FORCE=1 to replace it (it's backed up first)")
        backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
        os.makedirs(backups, exist_ok=True)
        shutil.copy2(out, os.path.join(backups, f"female_crotch_keys_{time.strftime('%Y%m%d_%H%M%S')}.blend"))

    body = bpy.data.objects["Female_Body"]
    rig = bpy.data.objects["Female_Armature"]
    mesh = _piece(body)
    piece = bpy.data.objects.new("Crotch", mesh)
    piece.matrix_world = body.matrix_world.copy()
    piece[crotch_keys.SOURCE] = "Female_Body"

    # Everything else goes but her rig: the file is only her crotch.
    for obj in list(bpy.data.objects):
        if obj not in (piece, rig):
            bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    scene = bpy.context.scene
    for other in list(bpy.data.scenes):
        if other != scene:
            bpy.data.scenes.remove(other)
    coll = bpy.data.collections.new("CrotchKeys")
    scene.collection.children.link(coll)
    coll.objects.link(piece)
    coll.objects.link(rig)
    rig.hide_set(True)
    mesh.name = "Crotch"
    bpy.ops.outliner.orphans_purge(do_recursive=True)

    # Her legs open: the armature's thighs turned out.
    arm = piece.modifiers.new("Armature", "ARMATURE")
    arm.object = rig
    for side, sign in (("L", 1), ("R", -1)):
        pb = rig.pose.bones[f"Female_Thigh_{side}"]
        head = pb.bone.head_local
        pb.rotation_mode = "QUATERNION"
        pb.matrix = (Matrix.Translation(head) @ Matrix.Rotation(math.radians(LEGS_OPEN * sign), 4, "Y")
                     @ Matrix.Translation(-head) @ pb.bone.matrix_local)
    bpy.context.view_layer.update()

    n = len(mesh.vertices)
    co = np.empty(n * 3, np.float32)
    mesh.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3).astype(np.float64)
    area = crotch_keys.key_area(mesh)
    fade = _fade(co, area)
    entry = bake["objects"].get("Female_Body")
    baked, missing = _baked(entry, co) if entry else ({}, 0)
    if missing:
        print(f"crotch_keys_build: {missing} baked points not found (master changed since the bake?)")
    for name, d in baked.items():
        print(f"crotch_keys_build: {name} baked, {int((np.linalg.norm(d, axis=1) > 1e-6).sum())} points")
    keys = _first_shapes(mesh, co, area, fade, baked)

    piece.shape_key_add(name="Basis", from_mix=False)
    report = []
    for name in crotch_keys.KEY_NAMES:
        block = piece.shape_key_add(name=name, from_mix=False)
        block.slider_min = 0.0
        block.slider_max = 2.0 if name.endswith("_Open") else 1.0
        block.data.foreach_set("co", (co + keys[name]).astype(np.float32).ravel())
        moved = np.linalg.norm(keys[name], axis=1)
        report.append(f"{name}: {int((moved > 1e-6).sum())} points, largest {moved.max() * 1000:.1f} mm")

    # The sculpt mask covers everything the keys can't move.
    mask = mesh.attributes.get(".sculpt_mask") or mesh.attributes.new(".sculpt_mask", "FLOAT", "POINT")
    mask.data.foreach_set("value", (~area).astype(np.float32))
    report.append(f"area: {int(area.sum())} of {n} points can move")

    text = bpy.data.texts.get("README") or bpy.data.texts.new("README")
    text.from_string(README)
    bpy.context.view_layer.objects.active = piece
    piece.select_set(True)
    core.save_blend(out)
    print("crotch_keys_build:", out)
    for line in report:
        print("  ", line)


main()
