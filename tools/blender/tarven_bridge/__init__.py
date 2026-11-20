"""Tarven Bridge: edit her in Blender, see the same thing in the game.

The sidebar tab "Tarven" (N panel in the 3D view):
  Send to game  exports the master (art/female_master.blend) to public/models/female.glb; the dev server reloads the
                game by itself (vite.config.ts), and devresume.ts puts it back where it was.
  Game view     her as the game shapes her: the game's own code (Dresser, face.ts) run by the bridge server
                (npm run bridge) over the last sent model, with the game's sliders, outfits and expressions.

Installed as a junction in Blender's add-on folder (see install.py), so edits here show after a Blender restart.
"""
bl_info = {
    "name": "Tarven Bridge",
    "author": "Tarven",
    "version": (0, 1, 0),
    "blender": (4, 2, 0),
    "location": "3D View > Sidebar > Tarven",
    "description": "Her master .blend to the game 1:1, and the game's shaping shown back in Blender",
    "category": "Import-Export",
}

import importlib
import os

import bpy

from . import core

_modules = ["gameview", "paint", "cloth"]


def _sub(name):
    return importlib.import_module(f"{__name__}.{name}")


class TARVEN_OT_send(bpy.types.Operator):
    """Export the master rig to the game's female.glb (the dev server reloads the game)"""
    bl_idname = "tarven.send"
    bl_label = "Send to game"

    def execute(self, context):
        try:
            done = core.export_master()
        except Exception as error:  # noqa: BLE001 - shown to the user as is
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        context.window_manager.tarven_status = f"Sent in {done['seconds']} s ({done['kb'] // 1024} MB)"
        self.report({"INFO"}, context.window_manager.tarven_status)
        # Let the game view know the server should reload the new model.
        gv = _sub("gameview")
        if gv.server_up():
            gv.reload_server()
        return {"FINISHED"}


class TARVEN_OT_open_master(bpy.types.Operator):
    """Open her master file (art/female_master.blend)"""
    bl_idname = "tarven.open_master"
    bl_label = "Open master"

    def execute(self, context):
        if bpy.data.is_dirty:
            self.report({"WARNING"}, "Save or discard the open file first")
            return {"CANCELLED"}
        bpy.ops.wm.open_mainfile(filepath=core.master_path())
        return {"FINISHED"}


class TARVEN_PT_main(bpy.types.Panel):
    bl_label = "Tarven Bridge"
    bl_idname = "TARVEN_PT_main"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"

    def draw(self, context):
        layout = self.layout
        is_master = bpy.data.collections.get(core.MASTER_COLLECTION) is not None
        if not is_master:
            layout.label(text="Not her master file", icon="INFO")
            layout.operator("tarven.open_master", icon="FILE_FOLDER")
            return
        row = layout.row()
        row.scale_y = 1.4
        row.operator("tarven.send", icon="EXPORT")
        status = context.window_manager.tarven_status
        if status:
            layout.label(text=status)
        layout.label(text=os.path.relpath(core.game_glb_path(), core.repo_root()), icon="FILE_3D")


_classes = (TARVEN_OT_send, TARVEN_OT_open_master, TARVEN_PT_main)


def register():
    bpy.types.WindowManager.tarven_status = bpy.props.StringProperty()
    for cls in _classes:
        bpy.utils.register_class(cls)
    for name in _modules:
        _sub(name).register()


def unregister():
    for name in reversed(_modules):
        _sub(name).unregister()
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.WindowManager.tarven_status
