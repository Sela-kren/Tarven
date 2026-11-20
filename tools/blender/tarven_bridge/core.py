"""The Blender bridge's shared steps, used by the add-on (__init__.py) and the headless scripts beside it.

Her master file is art/female_master.blend: her rig as build_world.py builds it (TARVEN_SAVE_MASTER), which the user
edits. Sending it exports the "FemaleRig" collection with build_world's own export_collection, so the GLB the game
loads comes out exactly as a build's would.
"""
import os
import sys
import time

import bpy

MASTER_COLLECTION = "FemaleRig"


def repo_root():
    """The Tarven repo: TARVEN_ROOT if set, else found from this file (realpath, so an add-on junction still works)."""
    env = os.environ.get("TARVEN_ROOT")
    if env:
        return env
    here = os.path.dirname(os.path.realpath(__file__))
    return os.path.normpath(os.path.join(here, "..", "..", ".."))


def master_path():
    return os.path.join(repo_root(), "art", "female_master.blend")


def baseline_path():
    """Her rig exactly as last built, beside the master: what the merge (merge_build.py) compares the user's edits to."""
    return os.path.join(repo_root(), "art", "female_master_baseline.blend")


def game_glb_path():
    return os.path.join(repo_root(), "public", "models", "female.glb")


def scratch_dir():
    """Git-ignored working space (under ref/, never the C: temp, which gets cleared)."""
    path = os.path.join(repo_root(), "ref", "_bridge")
    os.makedirs(path, exist_ok=True)
    return path


def build_world():
    """build_world.py as a module (its main() only runs as a script), for its export settings and helpers."""
    tools = os.path.join(repo_root(), "tools", "blender")
    if tools not in sys.path:
        sys.path.insert(0, tools)
    import build_world as bw
    return bw


def master_collection():
    coll = bpy.data.collections.get(MASTER_COLLECTION)
    if coll is None:
        raise RuntimeError(f'no "{MASTER_COLLECTION}" collection: is the master file (art/female_master.blend) open?')
    return coll


def export_master(out_path=None):
    """Exports the master rig to the game's female.glb (or out_path). Written to a scratch file first and moved into
    place in one step, so the game's reload never reads a half-written model. Returns a short summary dict."""
    out_path = out_path or game_glb_path()
    coll = master_collection()
    context = bpy.context
    # The exporter needs object mode; put back what the user had afterwards.
    active = context.view_layer.objects.active
    mode = context.mode
    if active is not None and mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    selected = [o for o in context.view_layer.objects if o.select_get()]
    # Every piece goes out, whatever the panel hides for the outfit shown (a hidden object can't be selected).
    hidden = [(o, o.hide_get(), o.hide_viewport, o.hide_select) for o in coll.all_objects]
    for o, *_ in hidden:
        o.hide_viewport = False
        o.hide_select = False
        o.hide_set(False)
    started = time.time()
    tmp = os.path.join(scratch_dir(), "sending_female.glb")
    paint = _paint()
    try:
        # Her painted layers go along: their strokes saved, their UVs moved to their layers while exporting.
        paint.save_all()
        with paint.shifted_for_export():
            build_world().export_collection(coll, tmp)
        os.replace(tmp, out_path)
        painted = paint.send_pictures(out_path)
    finally:
        for o, was_hidden, was_off, was_locked in hidden:
            o.hide_set(was_hidden)
            o.hide_viewport = was_off
            o.hide_select = was_locked
        for o in context.view_layer.objects:
            o.select_set(o in selected)
        context.view_layer.objects.active = active
        if active is not None and mode != "OBJECT":
            try:
                bpy.ops.object.mode_set(mode=_MODE_FOR.get(mode, "OBJECT"))
            except RuntimeError:
                pass
    return {"path": out_path, "seconds": round(time.time() - started, 1),
            "kb": round(os.path.getsize(out_path) / 1024), "painted": painted}


def _paint():
    try:
        from . import paint
    except ImportError:  # run headless, as a plain module
        import paint
    return paint


# context.mode names back to mode_set's.
_MODE_FOR = {"EDIT_MESH": "EDIT", "SCULPT": "SCULPT", "PAINT_TEXTURE": "TEXTURE_PAINT", "PAINT_VERTEX": "VERTEX_PAINT",
             "PAINT_WEIGHT": "WEIGHT_PAINT", "POSE": "POSE", "EDIT_ARMATURE": "EDIT"}
