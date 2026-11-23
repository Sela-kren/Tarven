"""An expression check file: every expression of hers keyframed one after the other, to scrub through in Blender.

Opens art/female_face_keys.blend, keys the Face object's shape keys (the other pieces follow it by drivers) so each
expression holds for HOLD frames: its Brow_/Eye_/Mouth_ keys at 1, plus the look and pupil keys face.ts OVER gives it
(the drawn extras, blush, creases, tears, sweat, are the game's and don't show here). A timeline marker names each one,
and a camera looks at her face. Saved as art/female_face_check.blend, so the keys file itself never carries the
animation; sculpt fixes in female_face_keys.blend as usual.

  D:/blender/blender.exe -b art/female_face_keys.blend --python tools/blender/tarven_bridge/face_keys_check.py
"""
import os
import re

import bpy
from mathutils import Vector

HOLD = 24
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(ROOT, "art", "female_face_check.blend")
PAIRS = {"lookX": ("Look_Left", "Look_Right"), "lookY": ("Look_Down", "Look_Up"), "pupil": ("Pupil_Small", "Pupil_Big")}


def read_face_ts():
    """The expression list and each one's OVER numbers, read from src/game/face.ts."""
    src = open(os.path.join(ROOT, "src", "game", "face.ts"), encoding="utf-8").read()
    names = re.findall(r'"([a-z]+)"', re.search(r"EXPRESSIONS_LIST[^=]*=\s*\[(.*?)\];", src, re.S).group(1))
    over_block = re.search(r"const OVER[^=]*=\s*\{(.*?)\n\};", src, re.S).group(1)
    over = {}
    for name, body in re.findall(r"^\s*([a-z]+):\s*\{([^}]*)\}", over_block, re.M):
        over[name] = {k: float(v) for k, v in re.findall(r"(\w+):\s*(-?[\d.]+)", body)}
    return names, over


def main():
    names, over = read_face_ts()
    face = next(o for o in bpy.data.objects if o.get("tarven_object") == "Female_Body")
    key = face.data.shape_keys
    blocks = [b for b in key.key_blocks[1:]]
    key.animation_data_clear()
    scene = bpy.context.scene
    scene.timeline_markers.clear()
    for i, expr in enumerate(names):
        frame = 1 + i * HOLD
        want = {f"{p}_{expr}": 1.0 for p in ("Brow", "Eye", "Mouth")}
        for number, value in over.get(expr, {}).items():
            if number in PAIRS and value:
                want[PAIRS[number][1 if value > 0 else 0]] = min(1.0, abs(value))
        for b in blocks:
            b.value = want.get(b.name, 0.0)
            b.keyframe_insert("value", frame=frame)
        scene.timeline_markers.new(f"{i + 1:02d} {expr}", frame=frame)
    for fc in key.animation_data.action.fcurves if hasattr(key.animation_data.action, "fcurves") else []:
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT"
    # Blender 5 layered actions: the curves live in the action's channelbags.
    action = key.animation_data.action
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "CONSTANT"
    scene.frame_start, scene.frame_end = 1, len(names) * HOLD
    scene.frame_set(1)

    # A camera square on her face.
    corners = [face.matrix_world @ Vector(c) for c in face.bound_box]
    top = max(c.z for c in corners)
    centre = Vector((sum(c.x for c in corners) / 8, max(c.y for c in corners), top - 0.12))
    cam_data = bpy.data.cameras.get("FaceCheck") or bpy.data.cameras.new("FaceCheck")
    cam_data.lens = 85
    cam = bpy.data.objects.get("FaceCheck") or bpy.data.objects.new("FaceCheck", cam_data)
    if cam.name not in scene.collection.objects:
        scene.collection.objects.link(cam)
    cam.location = centre + Vector((0, 0.75, 0))
    cam.rotation_euler = (1.5708, 0, 3.14159)  # she faces +Y
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 1080, 1080
    bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=False)
    print(f"FACE CHECK: {len(names)} expressions, {HOLD} frames each -> {OUT}")


main()
