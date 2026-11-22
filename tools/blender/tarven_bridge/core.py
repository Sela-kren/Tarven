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


def relink_textures():
    """Points any texture whose file isn't where the master says at art/textures/<its file>, where the build keeps
    them (a texture brought in from another .blend resolves its relative path against the wrong folder)."""
    fixed = 0
    folder = os.path.join(repo_root(), "art", "textures")
    for image in bpy.data.images:
        if image.source != "FILE" or image.packed_file or os.path.exists(bpy.path.abspath(image.filepath)):
            continue
        candidate = os.path.join(folder, os.path.basename(bpy.path.abspath(image.filepath)))
        if os.path.exists(candidate):
            image.filepath = bpy.path.relpath(candidate) if bpy.data.filepath else candidate
            image.reload()
            fixed += 1
    return fixed


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
    relink_textures()
    missing = [i.name for i in bpy.data.images if i.source == "FILE" and not i.packed_file and i.users
               and not os.path.exists(bpy.path.abspath(i.filepath))]
    if missing:
        # An export with them missing drops them from the GLB: the game would show her untextured.
        raise RuntimeError(f"{len(missing)} textures not found (e.g. {missing[:3]}): fix their paths before sending")
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
        # Smaller, the same to the game: her cup keys sparse, normals and UVs packed (glb_pack.py).
        glb_pack().pack(tmp)
        # Her outfits in files of their own, fetched as she wears them (glb_split.py): split next to the scratch copy,
        # the outfit files put in place first, her base last (the game reloads on it, with every outfit there).
        split = _split_outfits(tmp, out_path)
        _put_in_place(split, out_path)
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


def glb_pack():
    """tools/blender/glb_pack.py as a module."""
    tools = os.path.join(repo_root(), "tools", "blender")
    if tools not in sys.path:
        sys.path.insert(0, tools)
    import glb_pack as gp
    return gp


def _split_outfits(full, out_path):
    """Splits the sent model (glb_split.py) and puts its outfit files beside out_path (<name>/<Outfit>.glb), old ones
    gone; returns the base, still in the scratch folder."""
    import shutil
    glb_pack()  # puts tools/blender on the path
    import glb_split
    name = os.path.splitext(os.path.basename(out_path))[0]
    work = os.path.join(scratch_dir(), "sending_split")
    shutil.rmtree(work, ignore_errors=True)
    os.makedirs(work)
    base = os.path.join(work, f"{name}.glb")
    glb_split.split(full, base)
    os.remove(full)
    made = os.path.join(work, name)
    target = os.path.join(os.path.dirname(os.path.abspath(out_path)), name)
    os.makedirs(target, exist_ok=True)
    for old in os.listdir(target):
        if old.endswith(".glb") and not os.path.exists(os.path.join(made, old)):
            os.remove(os.path.join(target, old))
    for new in os.listdir(made):
        _put_in_place(os.path.join(made, new), os.path.join(target, new))
    return base


def _put_in_place(tmp, out_path):
    """Moves the finished export over the old file in one step; Windows refuses that while something has the old file
    open (the dev server serving it), so it tries again and then copies over it instead."""
    import shutil
    for _ in range(10):
        try:
            os.replace(tmp, out_path)
            return
        except PermissionError:
            time.sleep(0.5)
    shutil.copyfile(tmp, out_path)
    os.remove(tmp)


def _paint():
    try:
        from . import paint
    except ImportError:  # run headless, as a plain module
        import paint
    return paint


# context.mode names back to mode_set's.
_MODE_FOR = {"EDIT_MESH": "EDIT", "SCULPT": "SCULPT", "PAINT_TEXTURE": "TEXTURE_PAINT", "PAINT_VERTEX": "VERTEX_PAINT",
             "PAINT_WEIGHT": "WEIGHT_PAINT", "POSE": "POSE", "EDIT_ARMATURE": "EDIT"}


def fit_clothes(body, cloth, stains=()):
    """Her clothes made to sit on her skin as it is in the master (her hand sculpt is fuller than the build's skin
    they were fitted to): her legwear split three ways each way (a band was two rings of 12 points, and her sculpted
    thighs, knees and calves bulged out between them), then every corner inside her skin or nearer it than the gap
    put back out, reaching further than the build does (6 cm, up to 5 cm out), twice."""
    import bmesh
    bw = build_world()
    for obj in cloth:
        names = [s.material.name if s.material else "" for s in obj.material_slots]
        # Her hair is as coarse (a few hundred points), and her head as much fuller: all of it is split too.
        hair = obj.name.startswith("Female_Hair")
        legwear = {i for i, n in enumerate(names) if hair or n.startswith("T_hose")}
        if not legwear:
            continue
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        edges = {e for f in bm.faces if f.material_index in legwear for e in f.edges}
        bmesh.ops.subdivide_edges(bm, edges=list(edges), cuts=2, use_grid_fill=True)
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()
    deep = dict(bw.CLEAR, near=0.06, most=0.05)
    for _ in range(2):
        bw.keep_clothes_clear(body, list(cloth), deep)
    if stains:
        bw.keep_clothes_clear(body, list(stains), dict(deep, gap=bw.CLEAR["gap"] + bw.STAIN_LIFT))


def save_blend(path=None):
    """Saves the open file (or a copy at path) and makes sure it lands. On this machine Blender's last step, renaming
    the "<file>@" it wrote over the real file, sometimes fails ("Cannot change old file", 2026-11-21: twice on the
    master, which then went missing): the finished "@" file is moved into place here, retrying while whatever holds
    it lets go."""
    import bpy
    target = os.path.abspath(path or bpy.data.filepath)
    same = os.path.normcase(target) == os.path.normcase(os.path.abspath(bpy.data.filepath))
    try:
        if same:
            bpy.ops.wm.save_mainfile()
        else:
            bpy.ops.wm.save_as_mainfile(filepath=target, copy=True)
    except RuntimeError as error:
        written = target + "@"
        if "Cannot change old file" not in str(error) or not os.path.exists(written):
            raise
        for _ in range(60):
            try:
                os.replace(written, target)
                break
            except OSError:
                time.sleep(0.5)
        else:
            raise RuntimeError(f"saved to {written} but couldn't move it over {target}") from error
    if not os.path.exists(target):
        raise RuntimeError(f"{target} is missing after saving")
    return target
