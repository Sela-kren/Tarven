"""Painted 2K layers on her master objects, for the game (src/game/paint.ts).

Paint setup gives an object a second UV map, "Paint" (Smart UV Project, so it doesn't touch the game's own UVs,
which the game reads its patches from), and a 2048 px clear picture, art/paint/P_<object>.png, then opens Texture
Paint on it (Single Image mode). Unpainted pixels stay clear, and there the game shows the material's own colour
(recolours included); painted ones show the paint.

Send (core.export_master) takes the painted objects along: each object's Paint UVs go out moved right by 1 + its
layer (so the game knows which picture), and the pictures plus public/models/paint/female.json go beside the model.
"""
import json
import os
import shutil

import bpy
import numpy as np

try:
    from . import core
except ImportError:  # run headless, as a plain module beside core.py
    import core

UV_NAME = "Paint"
SIZE = 2048


def paint_dir():
    path = os.path.join(core.repo_root(), "art", "paint")
    os.makedirs(path, exist_ok=True)
    return path


def image_name(obj):
    return f"P_{obj.name}"


def image_path(obj):
    return os.path.join(paint_dir(), image_name(obj) + ".png")


def painted_objects():
    """Her objects with a Paint UV map and a picture on disk, in a fixed order (their layers)."""
    coll = bpy.data.collections.get(core.MASTER_COLLECTION)
    out = []
    for obj in sorted(coll.all_objects if coll else [], key=lambda o: o.name):
        if obj.type == "MESH" and obj.data.uv_layers.get(UV_NAME) and os.path.exists(image_path(obj)):
            out.append(obj)
    return out


def setup(obj):
    """Gives obj its Paint UV map and picture (once), and returns the picture."""
    mesh = obj.data
    if mesh.uv_layers.get(UV_NAME) is None:
        first = mesh.uv_layers.active_index
        game_uv = mesh.uv_layers[first]
        layer = mesh.uv_layers.new(name=UV_NAME)
        # Its islands are the game's own UV map's, only laid out without overlaps: cut along the same seams, so the
        # GLB gets no extra split points (the game fits her clothes to her body's points; duplicates would pull them).
        uv = np.empty(len(game_uv.data) * 2, dtype=np.float32)
        game_uv.data.foreach_get("uv", uv)
        layer.data.foreach_set("uv", uv)
        mesh.uv_layers.active = layer
        view_layer = bpy.context.view_layer
        previous = view_layer.objects.active
        hidden = obj.hide_get()
        obj.hide_set(False)
        view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.average_islands_scale()
        # A margin, so no island touches the picture's edge (u = 1 would read as the next layer in the game).
        bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
        bpy.ops.object.mode_set(mode="OBJECT")
        _join_corner_splits(mesh, game_uv, mesh.uv_layers[UV_NAME])
        mesh.uv_layers.active_index = first
        # The game's own UV map stays the one rendered and exported first.
        mesh.uv_layers[first].active_render = True
        obj.hide_set(hidden)
        view_layer.objects.active = previous
    image = bpy.data.images.get(image_name(obj))
    if image is None:
        path = image_path(obj)
        if os.path.exists(path):
            image = bpy.data.images.load(path)
            image.name = image_name(obj)
        else:
            image = bpy.data.images.new(image_name(obj), SIZE, SIZE, alpha=True)
            image.generated_color = (0, 0, 0, 0)
            image.filepath_raw = path
            image.file_format = "PNG"
            image.save()
        image.alpha_mode = "STRAIGHT"
    return image


def _join_corner_splits(mesh, game_uv, paint_uv):
    """Where islands of the game's UV map touch at a single corner, packing moves them apart and that point would be
    split in two in the GLB: such a point takes one Paint UV at all its corners (a tiny pinch in the picture)."""
    n = len(mesh.loops)
    verts = np.empty(n, dtype=np.int32)
    mesh.loops.foreach_get("vertex_index", verts)
    game = np.empty(n * 2, dtype=np.float32)
    game_uv.data.foreach_get("uv", game)
    paint = np.empty(n * 2, dtype=np.float32)
    paint_uv.data.foreach_get("uv", paint)
    game, paint = game.reshape(-1, 2), paint.reshape(-1, 2)
    first = {}
    for loop in range(n):
        key = (int(verts[loop]), round(float(game[loop, 0]), 6), round(float(game[loop, 1]), 6))
        if key in first:
            paint[loop] = paint[first[key]]
        else:
            first[key] = loop
    paint_uv.data.foreach_set("uv", paint.ravel())


def save_all():
    """Saves every painted picture that has unsaved strokes."""
    for obj in painted_objects():
        image = bpy.data.images.get(image_name(obj))
        if image is not None and image.is_dirty:
            image.save()


class _ShiftedPaintUVs:
    """While exporting: each painted object's Paint UVs moved right by 1 + its layer, put back afterwards."""

    def __init__(self, objects):
        self.objects = objects

    def __enter__(self):
        for layer, obj in enumerate(self.objects):
            self._shift(obj, 1 + layer)
        return self

    def __exit__(self, *_exc):
        for layer, obj in enumerate(self.objects):
            self._shift(obj, -(1 + layer))

    @staticmethod
    def _shift(obj, by):
        uv = obj.data.uv_layers[UV_NAME].data

        co = np.empty(len(uv) * 2, dtype=np.float32)
        uv.foreach_get("uv", co)
        co[0::2] += by
        uv.foreach_set("uv", co)


def shifted_for_export():
    return _ShiftedPaintUVs(painted_objects())


def send_pictures(glb_path, body="female"):
    """Copies the painted pictures beside the sent model, with the manifest the game reads (or removes it when
    nothing is painted)."""
    folder = os.path.join(os.path.dirname(glb_path), "paint")
    objects = painted_objects()
    manifest = os.path.join(folder, f"{body}.json")
    if not objects:
        if os.path.exists(manifest):
            os.remove(manifest)
        return 0
    os.makedirs(folder, exist_ok=True)
    layers = []
    for obj in objects:
        file = f"{body}_{obj.name}.png"
        shutil.copy2(image_path(obj), os.path.join(folder, file))
        layers.append({"object": obj.name, "file": file})
    with open(manifest, "w", encoding="utf8") as out:
        json.dump({"size": SIZE, "layers": layers}, out, indent=1)
    return len(layers)


# ---------------------------------------------------------------- operators and panel

class TARVEN_OT_paint_setup(bpy.types.Operator):
    """Give the selected object (or her body) a Paint UV map and a 2K picture, and start painting it"""
    bl_idname = "tarven.paint_setup"
    bl_label = "Paint this object"

    def execute(self, context):
        coll = bpy.data.collections.get(core.MASTER_COLLECTION)
        obj = context.active_object
        if obj is None or obj.type != "MESH" or coll is None or obj.name not in coll.all_objects:
            obj = bpy.data.objects.get("Female_Body")
        if obj is None:
            self.report({"ERROR"}, "Select one of her meshes in the master")
            return {"CANCELLED"}
        if context.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        image = setup(obj)
        for o in context.view_layer.objects:
            o.select_set(False)
        obj.hide_set(False)
        obj.select_set(True)
        context.view_layer.objects.active = obj
        obj.data.uv_layers.active = obj.data.uv_layers[UV_NAME]
        bpy.ops.object.mode_set(mode="TEXTURE_PAINT")
        paint = context.scene.tool_settings.image_paint
        paint.mode = "IMAGE"
        paint.canvas = image
        for area in context.screen.areas:
            if area.type == "VIEW_3D":
                area.spaces[0].shading.type = "SOLID"
                area.spaces[0].shading.color_type = "TEXTURE"
        self.report({"INFO"}, f"Painting {image.name} (clear = the game's own colour). Save paint, then Send.")
        return {"FINISHED"}


class TARVEN_OT_paint_save(bpy.types.Operator):
    """Save the painted pictures (Send does this too)"""
    bl_idname = "tarven.paint_save"
    bl_label = "Save paint"

    def execute(self, context):
        save_all()
        self.report({"INFO"}, f"Saved {len(painted_objects())} painted picture(s) in art/paint")
        return {"FINISHED"}


class TARVEN_PT_paint(bpy.types.Panel):
    bl_label = "Paint (2K)"
    bl_idname = "TARVEN_PT_paint"
    bl_parent_id = "TARVEN_PT_main"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"
    bl_options = {"DEFAULT_CLOSED"}

    @classmethod
    def poll(cls, context):
        return bpy.data.collections.get(core.MASTER_COLLECTION) is not None

    def draw(self, context):
        layout = self.layout
        row = layout.row(align=True)
        row.operator("tarven.paint_setup", icon="BRUSH_DATA")
        row.operator("tarven.paint_save", icon="FILE_TICK")
        objects = painted_objects()
        if objects:
            layout.label(text="Painted: " + ", ".join(o.name.replace("Female_", "") for o in objects))


_classes = (TARVEN_OT_paint_setup, TARVEN_OT_paint_save, TARVEN_PT_paint)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
