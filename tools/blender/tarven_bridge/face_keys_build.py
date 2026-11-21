"""Builds art/female_face_keys.blend: her head and face pieces from the master, with every face shape key (face.ts
FACE_KEY_NAMES), each started from the old face rig's bake (tools/bridge/facebake.preview.ts). See face_keys.py.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/face_keys_build.py -- <bake.json> [out.blend]

It never writes over an existing keys file (the user's sculpting) unless FORCE=1 is set, and then backs it up first.
Run on the master as the game has it: the GLB's points are where the keys file's Basis is.
"""
import base64
import json
import os
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

#: Her head is cut from her body at this height (metres): her neck and all above it.
HEAD_FROM = 1.40
#: The master's pieces, and what each is called in the keys file. "Face" (her head) drives the others' keys.
PIECES = {
    "Female_Body": "Face",
    "Female_BodyBrows": "Brows",
    "Female_BodyMouth": "Mouth",
    "Female_BodyEye_L": "Eye_L",
    "Female_BodyEye_R": "Eye_R",
    "Female_BodyLash_L": "Lash_L",
    "Female_BodyLash_R": "Lash_R",
}
CONTROL = "Face"
COLLECTION = "FaceKeys"
#: Her eyes: how far each Look key turns the whole eyeball about its centre (degrees), as far as the old rig slid the
#: iris (lookX 1: about 6 mm on her 22 mm ball). She faces +Y; her own right is +X.
LOOK_DEGREES = 16.0
EYES = ("Female_BodyEye_L", "Female_BodyEye_R")
#: The master's own keys on her eyes, used as the game's (the exporter never sent them, so the game hadn't had them).
OWN_KEYS = ("Pupil_Big", "Pupil_Small")

README = """Her face's shape keys (Tarven). KP's way: a face is one expression's brows, eyes and mouth.

Keys: Brow_<expression>, Eye_<expression>, Mouth_<expression> (24 expressions; neutral is Basis),
Blink (lids shut), Look_Left/Right/Up/Down (her own left/right), Pupil_Big/Small.

- Every piece (Face, Brows, Mouth, Eye_L/R, Lash_L/R) has the same keys. Their values follow Face's (drivers):
  set a value on Face, or use Tarven tab > Face keys > Show, to see a whole expression.
- To sculpt a key: select the piece, pick the key, then "Sculpt <key> on all pieces" (pins it), and sculpt.
- The first shapes came from the game's old face rig (brows, mouths). Look_* turn each eyeball about its centre;
  Pupil_Big/Small are the master eyes' own keys. The Eye_* keys and Blink are EMPTY: the old rig couldn't close her
  lids (they're her face skin). Sculpt them.
- Don't sculpt Basis: the game finds her points by where they sit in Basis.
- Tarven tab > Send face keys writes public/models/female_face.json; the game reloads.
"""


def _floats(text):
    return np.frombuffer(base64.b64decode(text), dtype="<f4")


def _ints(text):
    return np.frombuffer(base64.b64decode(text), dtype="<u4")


#: How near (metres) a point must sit to be the bake's: the exporter's sums move points by about 1e-7 m.
NEAR = 2e-6


def _zup(a):
    """The GLB's Y-up back to Blender's Z-up: (x, -z, y)."""
    return np.stack([a[:, 0], -a[:, 2], a[:, 1]], axis=1)


def _mesh_as_exported(obj):
    """The piece's mesh as the GLB has it: its points as they are (the exporter, applying modifiers, writes a mesh's
    Basis and none of its shape keys: her eyes' own Pupil/Iris keys don't go out), with no keys left."""
    mesh = obj.data.copy()
    if mesh.shape_keys:
        holder = bpy.data.objects.new("_fk_keys", mesh)
        holder.shape_key_clear()
        bpy.data.objects.remove(holder)
    # The master's own attributes (bust keys, skin detail) aren't wanted here, and are most of its size.
    for attr in [a.name for a in mesh.attributes if a.name.startswith("_")]:
        mesh.attributes.remove(mesh.attributes[attr])
    return mesh


def _cut_head(mesh):
    """Her head: every face with all its points above HEAD_FROM. Each point keeps its master index (_master_index)."""
    index = mesh.attributes.new("_master_index", "INT", "POINT")
    index.data.foreach_set("value", np.arange(len(mesh.vertices), dtype=np.int32))
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z <= HEAD_FROM], context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def _key_moves(entry, mesh):
    """The bake's moves for this mesh's points, per key: {key: (indices, deltas in Blender's Z-up)}."""
    rest = _zup(_floats(entry["rest"]).reshape(-1, 3))
    tree = KDTree(len(rest))
    for i, p in enumerate(rest):
        tree.insert(p, i)
    tree.balance()
    co = np.empty(len(mesh.vertices) * 3, np.float32)
    mesh.vertices.foreach_get("co", co)
    of = np.full(len(mesh.vertices), -1)
    for v, p in enumerate(co.reshape(-1, 3)):
        _co, i, dist = tree.find(p)
        if i is not None and dist <= NEAR:
            of[v] = i
    found = set(of[of >= 0].tolist())
    out = {}
    for name, key in entry["keys"].items():
        points = _ints(key["points"])
        deltas = _zup(_floats(key["deltas"]).reshape(-1, 3))
        move = np.zeros((len(rest), 3), np.float32)
        move[points] = deltas
        verts = np.nonzero(of >= 0)[0]
        d = move[of[verts]]
        keep = np.abs(d).max(axis=1) > 0
        out[name] = (verts[keep], d[keep])
    return out, len(rest) - len(found)


def _sphere_centre(points):
    """The centre of the sphere through these points, by least squares."""
    a = np.hstack([2 * points, np.ones((len(points), 1))])
    b = (points ** 2).sum(axis=1)
    x = np.linalg.lstsq(a, b, rcond=None)[0]
    return x[:3]


def _eye_keys(obj):
    """Her eye's own keys (OWN_KEYS, as moves from Basis) and its Look keys (the eyeball turned about its centre)."""
    mesh = obj.data
    blocks = mesh.shape_keys.key_blocks if mesh.shape_keys else None
    n = len(mesh.vertices)
    base = np.empty(n * 3, np.float32)
    (blocks[0].data if blocks else mesh.vertices).foreach_get("co", base)
    base = base.reshape(-1, 3)
    out = {}
    for name in OWN_KEYS:
        if blocks and name in blocks:
            co = np.empty(n * 3, np.float32)
            blocks[name].data.foreach_get("co", co)
            out[name] = co.reshape(-1, 3) - base
    white = [i for i, m in enumerate(mesh.materials) if m and m.name == "T_eye_sclera"]
    on_white = sorted({v for p in mesh.polygons if p.material_index in white for v in p.vertices}) or range(n)
    centre = _sphere_centre(base[list(on_white)].astype(np.float64))
    a = np.radians(LOOK_DEGREES)
    c, s = np.cos(a), np.sin(a)
    turns = {
        # About Z: +Y (her gaze) towards +X, her own right; and back.
        "Look_Right": np.array([[c, s, 0], [-s, c, 0], [0, 0, 1]]),
        "Look_Left": np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]]),
        # About X: +Y towards +Z, up; and down.
        "Look_Up": np.array([[1, 0, 0], [0, c, -s], [0, s, c]]),
        "Look_Down": np.array([[1, 0, 0], [0, c, s], [0, -s, c]]),
    }
    rel = base - centre
    for name, turn in turns.items():
        out[name] = (rel @ turn.T + centre - base).astype(np.float32)
    return out


def _drive(key_block, control_key, name):
    fcurve = key_block.driver_add("value")
    driver = fcurve.driver
    driver.type = "AVERAGE"
    var = driver.variables.new()
    var.name = "v"
    var.type = "SINGLE_PROP"
    var.targets[0].id_type = "KEY"
    var.targets[0].id = control_key
    var.targets[0].data_path = f'key_blocks["{name}"].value'


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if not argv:
        raise SystemExit("usage: face_keys_build.py -- <bake.json> [out.blend]")
    with open(argv[0], encoding="utf-8") as f:
        bake = json.load(f)
    out = os.path.abspath(argv[1] if len(argv) > 1 else os.path.join(core.repo_root(), "art", "female_face_keys.blend"))
    if os.path.exists(out):
        if os.environ.get("FORCE") != "1":
            raise SystemExit(f"{out} exists (the user's sculpting): set FORCE=1 to replace it (it's backed up first)")
        backups = os.path.join(core.repo_root(), "art", "_backups")
        os.makedirs(backups, exist_ok=True)
        shutil.copy2(out, os.path.join(backups, f"female_face_keys_{time.strftime('%Y%m%d_%H%M%S')}.blend"))
    names = bake.get("names") or sorted({k for e in bake["objects"].values() for k in e["keys"]})

    made = {}
    for source, name in PIECES.items():
        obj = bpy.data.objects.get(source)
        if obj is None or obj.type != "MESH":
            print(f"face_keys_build: no {source} in the master, left out")
            continue
        mesh = _mesh_as_exported(obj)
        if source == "Female_Body":
            _cut_head(mesh)
        eye = _eye_keys(obj) if source in EYES else {}
        piece = bpy.data.objects.new(f"_fk_{name}", mesh)
        piece.matrix_world = obj.matrix_world.copy()
        piece[face_keys_source()] = source
        made[name] = (piece, source, eye)

    # Everything else goes: the file is only her face.
    keep = {piece for piece, _, _ in made.values()}
    for obj in list(bpy.data.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    for coll in list(bpy.data.collections):
        bpy.data.collections.remove(coll)
    scene = bpy.context.scene
    for other in list(bpy.data.scenes):
        if other != scene:
            bpy.data.scenes.remove(other)
    coll = bpy.data.collections.new(COLLECTION)
    scene.collection.children.link(coll)
    for piece in keep:
        coll.objects.link(piece)
    for name, (piece, _source, _eye) in made.items():
        piece.name = name
        piece.data.name = name
    bpy.ops.outliner.orphans_purge(do_recursive=True)

    # The keys, on every piece, each started from the bake.
    report = []
    for name, (piece, source, eye) in made.items():
        piece.shape_key_add(name="Basis", from_mix=False)
        entry = bake["objects"].get(source)
        moves, missing = _key_moves(entry, piece.data) if entry else ({}, 0)
        # Her eyes' own: whole-eyeball moves, every point.
        for key, delta in eye.items():
            moves[key] = (np.arange(len(delta)), delta)
        if missing:
            print(f"face_keys_build: {missing} baked points of {source} not found (master changed since the bake?)")
        moved = 0
        for key in names:
            block = piece.shape_key_add(name=key, from_mix=False)
            block.slider_min = 0.0
            block.slider_max = 1.0
            if key in moves and len(moves[key][0]):
                verts, deltas = moves[key]
                co = np.empty(len(piece.data.vertices) * 3, np.float32)
                block.data.foreach_get("co", co)
                co = co.reshape(-1, 3)
                co[verts] += deltas
                block.data.foreach_set("co", co.ravel())
                moved += 1
        report.append(f"{name}: {len(piece.data.vertices)} points, {moved} of {len(names)} keys baked")
    # Every piece's key values follow Face's.
    control = made[CONTROL][0].data.shape_keys
    for name, (piece, _source, _eye) in made.items():
        if name == CONTROL:
            continue
        for key in names:
            _drive(piece.data.shape_keys.key_blocks[key], control, key)

    text = bpy.data.texts.get("README") or bpy.data.texts.new("README")
    text.from_string(README)
    bpy.context.view_layer.objects.active = made[CONTROL][0]
    core.save_blend(out)
    print("face_keys_build:", out)
    for line in report:
        print("  ", line)


def face_keys_source():
    return "tarven_object"


main()
