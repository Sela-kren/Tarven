"""Her vulva's and anus's shape keys (art/female_crotch_keys.blend) to the game.

The file holds her hips and upper thighs, cut from the master's Female_Body, posed with her legs open (the armature's
thighs turned out; the keys themselves are made on her as built), with eight shape keys, four each:

  Vulva_Close    clenched shut, tighter than at rest
  Vulva_Open     open round something in her (the game's opening: 1 fully open, up to 2 stretched)
  Vulva_SpreadL  her own left lip pulled open by a hand
  Vulva_SpreadR  her own right lip pulled open by a hand (both together: spread with two hands)
  Anus_Close, Anus_Open, Anus_SpreadL, Anus_SpreadR   the same for her anus

The game mixes them (src/game/crotchkeys.ts, appearance.ts): Open follows how open she is; Close and the Spreads come
from what's happening to her (Dresser.setHold; the customizer's Hold preview).

Only the vulva's and anus's own faces (KEY_MATERIALS) can move: the game moves those meshes alone, so a point on their
edge moved by a key tears them from her skin, and one past it can't move. The file's sculpt mask covers both; Send
leaves out (and counts) moves past the edge and counts moves on it.

  Sculpt a key: pick it in Shape Keys, Tarven tab > Crotch keys > "Sculpt <key>" (pins it), and sculpt.
  Send crotch keys: writes public/models/female_crotch.json (the dev server reloads the game). Headless:
    D:/blender/blender.exe -b art/female_crotch_keys.blend --python tools/blender/tarven_bridge/crotch_keys_out.py

Each key is written as its move from Basis, only for the points it moves. Don't sculpt Basis: the game finds her
points by where they sit there. If the master's crotch is reshaped, rebuild this file (crotch_keys_build.py).
"""
import base64
import json
import os
import re

import bpy
import numpy as np

try:
    from . import core
except ImportError:  # run headless as a plain script (crotch_keys_out.py)
    import core

KEY_NAMES = (
    "Vulva_Close", "Vulva_Open", "Vulva_SpreadL", "Vulva_SpreadR",
    "Anus_Close", "Anus_Open", "Anus_SpreadL", "Anus_SpreadR",
)
KEY_NAME = re.compile(r"^(Vulva|Anus)_(Close|Open|SpreadL|SpreadR)$")
#: The faces the keys may move: her vulva's grid (inner lips and slit, outer lips, canal) and her anus's disc.
KEY_MATERIALS = ("T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin")
#: Faces that don't hold a point still: the skin under the openings, which the game hides while they show (the canal's
#: mouth meets it), so a tear against it never shows.
HIDDEN_MATERIALS = ("T_hole",)
#: Moves smaller than this (metres) are left out.
TINY = 1e-6
#: The object the piece is in the master (and the GLB). Not face_keys' "tarven_object": that file's Send would take it.
SOURCE = "tarven_crotch_object"


def crotch_json_path():
    return os.path.join(core.repo_root(), "public", "models", "female_crotch.json")


def is_keys_file():
    return any(o.get(SOURCE) for o in bpy.data.objects)


def crotch_object():
    return next((o for o in bpy.data.objects if o.get(SOURCE) == "Female_Body"), None)


def _b64(array):
    return base64.b64encode(np.ascontiguousarray(array).tobytes()).decode("ascii")


def _yup(a):
    """Blender's Z-up to the GLB's Y-up: (x, z, -y)."""
    return np.stack([a[:, 0], a[:, 2], -a[:, 1]], axis=1).astype(np.float32)


def key_area(mesh, strict=True):
    """Which points the keys may move (bool per point): on KEY_MATERIALS' faces (the game moves those meshes' copies of
    them), and, `strict`, on no other face but hidden ones (so no tear can show; a few points deep in her vulva, where
    it meets skin faces inside, the game's own opening has always moved)."""
    n = len(mesh.vertices)
    wanted = np.array([bool(m) and m.name in KEY_MATERIALS for m in mesh.materials] or [False])
    hidden = np.array([bool(m) and m.name in HIDDEN_MATERIALS for m in mesh.materials] or [False])
    mat = np.empty(len(mesh.polygons), np.int32)
    mesh.polygons.foreach_get("material_index", mat)
    mat = np.clip(mat, 0, len(wanted) - 1)
    inside = wanted[mat]
    holds = ~inside & ~hidden[mat]
    loops = np.empty(len(mesh.loops), np.int32)
    mesh.loops.foreach_get("vertex_index", loops)
    sizes = np.empty(len(mesh.polygons), np.int32)
    mesh.polygons.foreach_get("loop_total", sizes)
    on_key = np.zeros(n, bool)
    on_other = np.zeros(n, bool)
    on_key[loops[np.repeat(inside, sizes)]] = True
    on_other[loops[np.repeat(holds, sizes)]] = True
    return on_key & ~on_other if strict else on_key


def write(path=None):
    """Writes the piece's keys to the game's crotch keys file. Returns a summary."""
    path = path or crotch_json_path()
    names = []
    objects = {}
    summary = []
    dropped = 0
    edged = 0
    for obj in bpy.data.objects:
        source = obj.get(SOURCE)
        if obj.type != "MESH" or not source or not obj.data.shape_keys:
            continue
        blocks = obj.data.shape_keys.key_blocks
        n = len(obj.data.vertices)
        area = key_area(obj.data, strict=False)
        edge = area & ~key_area(obj.data)
        basis = np.empty(n * 3, np.float32)
        blocks[0].data.foreach_get("co", basis)
        basis = basis.reshape(-1, 3)
        moves = {}
        for block in blocks[1:]:
            if not KEY_NAME.match(block.name):
                continue
            if block.name not in names:
                names.append(block.name)
            co = np.empty(n * 3, np.float32)
            block.data.foreach_get("co", co)
            delta = co.reshape(-1, 3) - basis
            moving = np.abs(delta).max(axis=1) > TINY
            dropped += int((moving & ~area).sum())
            edged += int((moving & edge).sum())
            moved = np.nonzero(moving & area)[0]
            if len(moved):
                moves[block.name] = (moved, delta[moved])
        if not moves:
            continue
        points = np.unique(np.concatenate([m for m, _ in moves.values()]))
        keys = {}
        for name, (moved, delta) in moves.items():
            keys[name] = {"points": _b64(np.searchsorted(points, moved).astype(np.uint32)), "deltas": _b64(_yup(delta))}
        objects[source] = {"rest": _b64(_yup(basis[points])), "keys": keys}
        summary.append(f"{source}: {len(keys)} keys, {len(points)} points")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"version": 1, "names": names, "objects": objects}, f)
    if dropped:
        summary.append(f"{dropped} moves outside the vulva/anus left out")
    if edged:
        summary.append(f"{edged} moves on the vulva/anus's edge (can tear from her skin)")
    return {"path": path, "objects": summary, "kb": os.path.getsize(path) // 1024, "dropped": dropped}


class TARVEN_OT_send_crotch_keys(bpy.types.Operator):
    """Write her vulva's and anus's shape keys to the game (public/models/female_crotch.json)"""
    bl_idname = "tarven.send_crotch_keys"
    bl_label = "Send crotch keys"

    def execute(self, context):
        # Sculpt and Edit Mode keep their strokes to themselves until they're left: leave, write, and go back.
        mode = context.mode
        if mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        try:
            done = write()
        except Exception as error:  # noqa: BLE001 - shown to the user as is
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        finally:
            if mode != "OBJECT":
                try:
                    bpy.ops.object.mode_set(mode=core._MODE_FOR.get(mode, "OBJECT"))
                except RuntimeError:
                    pass
        context.window_manager.tarven_status = f"Crotch keys sent ({done['kb']} KB): " + "; ".join(done["objects"])
        self.report({"WARNING"} if done["dropped"] else {"INFO"}, context.window_manager.tarven_status)
        try:
            from . import gameview
            if gameview.server_up():
                gameview.reload_server()
        except Exception:  # noqa: BLE001 - the game view is optional here
            pass
        return {"FINISHED"}


class TARVEN_OT_edit_crotch_key(bpy.types.Operator):
    """Sculpt this key alone (pinned): the others don't show while it's pinned"""
    bl_idname = "tarven.edit_crotch_key"
    bl_label = "Sculpt this key"
    key: bpy.props.StringProperty()

    def execute(self, context):
        obj = crotch_object()
        if obj is None or not obj.data.shape_keys:
            return {"CANCELLED"}
        index = obj.data.shape_keys.key_blocks.find(self.key)
        if index < 0:
            return {"CANCELLED"}
        obj.active_shape_key_index = index
        obj.show_only_shape_key = True
        obj.use_shape_key_edit_mode = True
        return {"FINISHED"}


class TARVEN_OT_crotch_keys_all(bpy.types.Operator):
    """Show the keys mixed by their values again (no key pinned)"""
    bl_idname = "tarven.crotch_keys_all"
    bl_label = "Unpin"

    def execute(self, context):
        obj = crotch_object()
        if obj is not None:
            obj.show_only_shape_key = False
        return {"FINISHED"}


class TARVEN_PT_crotch_keys(bpy.types.Panel):
    bl_label = "Crotch keys"
    bl_idname = "TARVEN_PT_crotch_keys"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"

    @classmethod
    def poll(cls, context):
        return is_keys_file()

    def draw(self, context):
        layout = self.layout
        row = layout.row()
        row.scale_y = 1.4
        row.operator("tarven.send_crotch_keys", icon="EXPORT")
        status = context.window_manager.tarven_status
        if status:
            layout.label(text=status[:90])
        obj = crotch_object()
        if obj and obj.data.shape_keys:
            blocks = obj.data.shape_keys.key_blocks
            col = layout.column(align=True)
            for name in KEY_NAMES:
                if name in blocks:
                    row = col.row(align=True)
                    row.prop(blocks[name], "value", text=name, slider=True)
                    row.operator("tarven.edit_crotch_key", text="", icon="SCULPTMODE_HLT").key = name
            if obj.show_only_shape_key:
                layout.operator("tarven.crotch_keys_all", text=f"Unpin {obj.active_shape_key.name}", icon="UNPINNED")
        layout.label(text=os.path.relpath(crotch_json_path(), core.repo_root()), icon="FILE")


_classes = (TARVEN_OT_send_crotch_keys, TARVEN_OT_edit_crotch_key, TARVEN_OT_crotch_keys_all, TARVEN_PT_crotch_keys)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
