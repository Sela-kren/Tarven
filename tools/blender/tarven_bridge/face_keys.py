"""Her face's shape keys (art/female_face_keys.blend) to the game.

The file holds her head (cut from the master's Female_Body at the neck) and her face's own pieces (brows, mouth, eyes,
lash lines), each with the same shape keys, KP's way (EXPRESSION_STUDY.md): one per expression for her brows, her eyes
and her mouth ("Brow_angry", "Eye_angry", "Mouth_angry"...), and Blink, Look_Left/Right/Up/Down, Pupil_Big/Small. The
game mixes them as morph targets (src/game/face.ts, facekeys.ts): one expression's brows with another's mouth, a blink
over any eyes.

  Sculpt a key: pick the object, pick the key in Shape Keys, turn on its pin (Shape Key Lock) and sculpt. Every piece's
  keys follow the Face object's values (drivers), so setting a value on Face shows the whole face.
  Send face keys: writes public/models/female_face.json (the dev server reloads the game). Headless:
    D:/blender/blender.exe -b art/female_face_keys.blend --python tools/blender/tarven_bridge/face_keys_out.py

Each key is written as its move from Basis, only for the points it moves. The Basis is her face as the master was
when this file was made: the game finds the points by where they sit there, so if the master's face is reshaped,
rebuild this file's Basis (face_keys_build.py REBASE) and Send to game first.
"""
import base64
import json
import os
import re

import bpy
import numpy as np

try:
    from . import core
except ImportError:  # run headless as a plain script (face_keys_out.py)
    import core

KEY_NAME = re.compile(r"^(Brow|Eye|Mouth)_[a-z]+$|^(Blink|Look_Left|Look_Right|Look_Up|Look_Down|Pupil_Big|Pupil_Small)$")
#: Moves smaller than this (metres) are left out.
TINY = 1e-6
#: The object each piece is in the master (and the GLB).
SOURCE = "tarven_object"


def face_json_path():
    return os.path.join(core.repo_root(), "public", "models", "female_face.json")


def is_keys_file():
    return any(o.get(SOURCE) for o in bpy.data.objects)


def _b64(array):
    return base64.b64encode(np.ascontiguousarray(array).tobytes()).decode("ascii")


def _yup(a):
    """Blender's Z-up to the GLB's Y-up: (x, z, -y)."""
    return np.stack([a[:, 0], a[:, 2], -a[:, 1]], axis=1).astype(np.float32)


def write(path=None):
    """Writes every piece's keys to the game's face keys file. Returns a summary."""
    path = path or face_json_path()
    names = []
    objects = {}
    summary = []
    for obj in bpy.data.objects:
        source = obj.get(SOURCE)
        if obj.type != "MESH" or not source or not obj.data.shape_keys:
            continue
        blocks = obj.data.shape_keys.key_blocks
        n = len(obj.data.vertices)
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
            moved = np.nonzero(np.abs(delta).max(axis=1) > TINY)[0]
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
    return {"path": path, "objects": summary, "kb": os.path.getsize(path) // 1024}


def face_object():
    return next((o for o in bpy.data.objects if o.get(SOURCE) == "Female_Body"), None)


class TARVEN_OT_send_face_keys(bpy.types.Operator):
    """Write her face's shape keys to the game (public/models/female_face.json)"""
    bl_idname = "tarven.send_face_keys"
    bl_label = "Send face keys"

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
        context.window_manager.tarven_status = f"Face keys sent ({done['kb']} KB): " + "; ".join(done["objects"])
        self.report({"INFO"}, context.window_manager.tarven_status)
        # The bridge server's game view reads them too.
        try:
            from . import gameview
            if gameview.server_up():
                gameview.reload_server()
        except Exception:  # noqa: BLE001 - the game view is optional here
            pass
        return {"FINISHED"}


_ITEMS = []


def _expressions(_self, _context):
    # Kept in a module list: Blender needs a dynamic enum's strings to outlive the call.
    face = face_object()
    found = []
    if face and face.data.shape_keys:
        for block in face.data.shape_keys.key_blocks:
            m = re.match(r"^(Brow|Eye|Mouth)_([a-z]+)$", block.name)
            if m and m.group(2) not in found:
                found.append(m.group(2))
    _ITEMS[:] = [("neutral", "neutral", "")] + [(e, e, "") for e in found]
    return _ITEMS


def _show(self, context):
    """Sets the Face's keys to one expression's brows, eyes and mouth (the rest to 0)."""
    face = face_object()
    if not face or not face.data.shape_keys:
        return
    want = {f"{p}_{self.face_expression}" for p in ("Brow", "Eye", "Mouth")}
    for block in face.data.shape_keys.key_blocks[1:]:
        if KEY_NAME.match(block.name):
            block.value = 1.0 if block.name in want else 0.0


class TARVEN_OT_edit_face_key(bpy.types.Operator):
    """Make this key the one sculpted on every face piece (each piece's active key, pinned)"""
    bl_idname = "tarven.edit_face_key"
    bl_label = "Sculpt this key"
    key: bpy.props.StringProperty()

    def execute(self, context):
        for obj in bpy.data.objects:
            if obj.type != "MESH" or not obj.get(SOURCE) or not obj.data.shape_keys:
                continue
            index = obj.data.shape_keys.key_blocks.find(self.key)
            if index >= 0:
                obj.active_shape_key_index = index
                obj.show_only_shape_key = True
                obj.use_shape_key_edit_mode = True
        return {"FINISHED"}


class TARVEN_OT_face_keys_all(bpy.types.Operator):
    """Show the mixed face again (no key pinned)"""
    bl_idname = "tarven.face_keys_all"
    bl_label = "Unpin"

    def execute(self, context):
        for obj in bpy.data.objects:
            if obj.type == "MESH" and obj.get(SOURCE):
                obj.show_only_shape_key = False
        return {"FINISHED"}


class TARVEN_PT_face_keys(bpy.types.Panel):
    bl_label = "Face keys"
    bl_idname = "TARVEN_PT_face_keys"
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
        row.operator("tarven.send_face_keys", icon="EXPORT")
        status = context.window_manager.tarven_status
        if status:
            layout.label(text=status[:90])
        layout.prop(context.scene, "face_expression", text="Show")
        obj = context.active_object
        if obj and obj.get(SOURCE) and obj.data.shape_keys:
            key = obj.active_shape_key
            if key is not None and key.name != obj.data.shape_keys.key_blocks[0].name:
                row = layout.row(align=True)
                row.operator("tarven.edit_face_key", text=f"Sculpt {key.name} on all pieces", icon="SCULPTMODE_HLT").key = key.name
                row.operator("tarven.face_keys_all", text="", icon="UNPINNED")
        layout.label(text=os.path.relpath(face_json_path(), core.repo_root()), icon="FILE")


_classes = (TARVEN_OT_send_face_keys, TARVEN_OT_edit_face_key, TARVEN_OT_face_keys_all, TARVEN_PT_face_keys)


def register():
    bpy.types.Scene.face_expression = bpy.props.EnumProperty(name="Expression", items=_expressions, update=_show)
    for cls in _classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.face_expression
