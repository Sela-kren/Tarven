"""Brings a new build of her (build_world.py, after a code change) into the master .blend without losing what the
user changed in it.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/merge_build.py -- [--dry]
      [--build <new_build.blend>]   (skip the build: use one made already with TARVEN_SAVE_MASTER)
      [--master-out <path>]         (write somewhere else than the master, e.g. to check a merge)

Three files: the master (the user's), the baseline (art/female_master_baseline.blend: her as built when the master
was last made or merged) and the new build. For each of her objects:
  - the user didn't change it (master = baseline): the new build's object replaces it;
  - the user changed it and the build didn't (new = baseline): the master's is kept;
  - both changed: the new build's object, with the user's moves (master - baseline) put on it, point for point when
    the points are the same, else from the nearest point of the baseline;
  - new in the build: added;  gone from the build: kept if the user changed it, else removed.
Materials the user changed are kept; the rest follow the build. The armature follows the build. An object marked
"tarven_keep" (her hand-sculpted skin, swap_sculpt.py) is always the master's; clothes coming in from the build are
then fitted to it (core.fit_clothes).
Before writing, the master is backed up to ref/_sculpt_backups; the baseline becomes the new build.
If the master is open in Blender, revert it there afterwards (File > Revert) without saving it first.
"""
import os
import shutil
import subprocess
import sys
import time

import bpy
import numpy as np
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

COLL = core.MASTER_COLLECTION
TOL = 1e-6


def args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {"dry": "--dry" in argv, "build": None, "master_out": None}
    for flag, key in (("--build", "build"), ("--master-out", "master_out")):
        if flag in argv:
            out[key] = argv[argv.index(flag) + 1]
    return out


def build_now():
    """A fresh build of her into ref/_bridge/merge (the game's GLBs untouched), saved as a master-style .blend."""
    root = core.repo_root()
    out = os.path.join(core.scratch_dir(), "merge")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, "new_build.blend")
    env = {**os.environ, "TARVEN_ROOT": root, "TARVEN_OUT": out, "TARVEN_SAVE_MASTER": path}
    print("building (a few minutes)…")
    log = open(os.path.join(out, "build.log"), "w")
    subprocess.run([bpy.app.binary_path, "-b", "--factory-startup", "--python",
                    os.path.join(root, "tools", "blender", "build_world.py")], env=env, stdout=log,
                   stderr=subprocess.STDOUT, check=True)
    return path


def load_objects(path, tag):
    """Appends a file's rig objects (renamed with a tag, so they don't clash with the master's)."""
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.collections = [COLL]
    coll = dst.collections[0]
    coll.name = f"{tag}_{COLL}"
    objects = {}
    for obj in list(coll.all_objects):
        original = obj.name.rsplit(".", 1)[0] if obj.name.rsplit(".", 1)[-1].isdigit() else obj.name
        obj["merge_name"] = original
        objects[original] = obj
    return coll, objects


def positions(obj):
    co = np.empty(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def same_mesh(a, b):
    if a.type != b.type:
        return False
    if a.type != "MESH":
        return True
    if len(a.data.vertices) != len(b.data.vertices) or len(a.data.polygons) != len(b.data.polygons):
        return False
    return np.abs(positions(a) - positions(b)).max(initial=0) <= TOL


def material_key(mat):
    """What the user would change on a material: its colour inputs and the image it shows."""
    if mat is None:
        return None
    key = [tuple(mat.diffuse_color)]
    if mat.node_tree:
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                where = os.path.normcase(os.path.normpath(bpy.path.abspath(node.image.filepath, library=node.image.library)))
                key.append(("img", where, node.image.packed_file is not None))
            if node.type == "BSDF_PRINCIPLED":
                key.append(("base", tuple(node.inputs["Base Color"].default_value)))
    return tuple(key)


def user_moves(mine, base):
    """The user's moves on an object, per baseline point (master - baseline), or None if its points changed."""
    if len(mine.data.vertices) != len(base.data.vertices):
        return None
    return positions(mine) - positions(base)


def put_moves(target, base, moves):
    """Puts the user's moves on the new build's object: by index when it has the baseline's points, else each new
    point takes the move of the nearest baseline point."""
    co = positions(target)
    if len(co) == len(base.data.vertices):
        co += moves
        how = "by point"
    else:
        base_co = positions(base)
        tree = KDTree(len(base_co))
        for i, p in enumerate(base_co):
            tree.insert(p, i)
        tree.balance()
        moved = np.abs(moves).max(axis=1) > TOL
        for i, p in enumerate(co):
            _c, j, dist = tree.find(p)
            if moved[j] and dist < 0.01:
                co[i] += moves[j]
        how = "by nearest point"
    target.data.vertices.foreach_set("co", co.ravel())
    target.data.update()
    return how


def main():
    opts = args()
    master = bpy.data.collections.get(COLL)
    if master is None:
        raise SystemExit("run this on the master file (art/female_master.blend)")
    if not os.path.exists(core.baseline_path()):
        raise SystemExit("no baseline (art/female_master_baseline.blend): can't tell the user's edits from the build's")
    new_path = opts["build"] or build_now()
    base_coll, base = load_objects(core.baseline_path(), "BASE")
    new_coll, new = load_objects(new_path, "NEW")
    mine = {o.name: o for o in master.all_objects}
    report = {"replaced": [], "kept": [], "merged": [], "added": [], "removed": [], "kept_gone": [], "materials_kept": []}

    # Materials the user changed (master's differs from the baseline's): kept, and used by the new objects too.
    base_mats = {s.material.name.rsplit(".", 1)[0]: s.material for o in base.values() for s in o.material_slots if s.material}
    kept_mats = set()
    for o in mine.values():
        for slot in o.material_slots:
            m = slot.material
            if m and m.name in base_mats and material_key(m) != material_key(base_mats[m.name]):
                kept_mats.add(m.name)
    report["materials_kept"] = sorted(kept_mats)

    new_arm = next((o for o in new.values() if o.type == "ARMATURE"), None)
    my_arm = next((o for o in mine.values() if o.type == "ARMATURE"), None)

    swaps = []  # (master object or None, new object)
    for name, n in new.items():
        if n.type != "MESH":
            continue
        m, b = mine.get(name), base.get(name)
        if m is not None and m.get("tarven_keep"):
            # The user's own (her hand-sculpted skin): never taken from the build.
            report["kept"].append(f"{name} (yours, marked to keep)")
            continue
        if m is None:
            swaps.append((None, n))
            report["added"].append(name)
        elif b is None or same_mesh(m, b):
            swaps.append((m, n))
            report["replaced"].append(name)
        elif same_mesh(n, b):
            report["kept"].append(name)
        else:
            moves = user_moves(m, b)
            if moves is None:
                # The user remade it (points added or removed): theirs is kept, and the build's change is not.
                report["kept"].append(f"{name} (remade by you: the build's change to it was NOT taken)")
            else:
                how = put_moves(n, b, moves)
                swaps.append((m, n))
                report["merged"].append(f"{name} ({how})")
    for name, m in mine.items():
        if m.type == "MESH" and name not in new:
            b = base.get(name)
            if b is not None and same_mesh(m, b):
                report["removed"].append(name)
                swaps.append((m, None))
            else:
                report["kept_gone"].append(name)

    print("merge:")
    for key, items in report.items():
        if items:
            print(f"  {key}: {len(items)}" + (f"  {items[:12]}" if key != "replaced" else ""))
    if opts["dry"]:
        print("dry run: nothing written")
        return

    # The build's armature replaces the master's (bones are code's), keeping its name and place.
    if new_arm is not None and my_arm is not None:
        my_arm.data = new_arm.data
        my_arm.data.name = my_arm.name
    for m, n in swaps:
        if n is not None:
            hidden = m.hide_get() if m is not None else True
            for coll in list(n.users_collection):
                coll.objects.unlink(n)
            for coll in (m.users_collection if m is not None else [master]):
                coll.objects.link(n)
            n.parent = my_arm if n.parent == new_arm else (mine.get(n.parent["merge_name"]) if n.parent else None)
            for mod in n.modifiers:
                if mod.type == "ARMATURE" and mod.object == new_arm:
                    mod.object = my_arm
            for slot in n.material_slots:
                name = slot.material.name.rsplit(".", 1)[0] if slot.material else None
                if name in kept_mats:
                    slot.material = bpy.data.materials[name]
            del n["merge_name"]
            if m is not None:
                bpy.data.objects.remove(m, do_unlink=True)
            n.name = n.name.rsplit(".", 1)[0] if n.name.rsplit(".", 1)[-1].isdigit() else n.name
            n.hide_set(hidden)
        elif m is not None:
            bpy.data.objects.remove(m, do_unlink=True)
    # Clothes and stains that came in from the build fitted to her skin as it is in the master (her own, fuller).
    skin = master.all_objects.get("Female_Body")
    fresh = [n for _m, n in swaps if n is not None and n.type == "MESH"]
    if skin is not None and skin.get("tarven_keep") and fresh:
        core.fit_clothes(skin, [o for o in fresh if o.name.startswith(("Female_Cloth", "Female_Hair"))],
                         [o for o in fresh if "_CumOn" in o.name])
    # The rest of the appended files goes.
    for coll in (base_coll, new_coll):
        for obj in list(coll.all_objects):
            if obj.name not in master.all_objects:
                bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(coll)
    # The master's replaced meshes and the appended files' leftovers go first, so their materials are unused...
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    # ...then the new materials take the plain names the game finds them by ("T_skin_f", never "T_skin_f.002").
    for mat in list(bpy.data.materials):
        stem = mat.name.rsplit(".", 1)[0] if mat.name.rsplit(".", 1)[-1].isdigit() else mat.name
        if stem == mat.name:
            continue
        old = bpy.data.materials.get(stem)
        if old is not None and old.users == 0:
            bpy.data.materials.remove(old)
        if bpy.data.materials.get(stem) is None:
            mat.name = stem
    # Mesh and armature data likewise: glTF names its meshes after them, and three names her parts from those.
    for collection in (bpy.data.meshes, bpy.data.armatures, bpy.data.images):
        for block in list(collection):
            stem = block.name.rsplit(".", 1)[0] if block.name.rsplit(".", 1)[-1].isdigit() else block.name
            if stem != block.name:
                old = collection.get(stem)
                if old is not None and old.users == 0:
                    collection.remove(old)
                if collection.get(stem) is None:
                    block.name = stem
    for obj in master.all_objects:
        if obj.data is not None and obj.data.name.rsplit(".", 1)[-1].isdigit():
            raise SystemExit(f"{obj.name}'s data is {obj.data.name}: the game needs plain names")
        for slot in obj.material_slots:
            if slot.material and slot.material.name.rsplit(".", 1)[-1].isdigit():
                raise SystemExit(f"{obj.name} still has {slot.material.name}: the game needs plain material names")
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    # Her soft bust bones (bust_soft.py) shared out again over everything, her kept skin and the build's new pieces
    # alike, on the build's armature.
    rig = next((o for o in master.all_objects if o.type == "ARMATURE"), None)
    if rig is not None and "Female_Bust" in rig.data.bones:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
        import bust_soft
        print("bust_soft:", bust_soft.apply(rig, list(master.all_objects)))

    out = opts["master_out"] or core.master_path()
    if not opts["master_out"]:
        backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
        os.makedirs(backups, exist_ok=True)
        backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}.blend")
        shutil.copy2(core.master_path(), backup)
        print("backup:", backup)
    bpy.ops.wm.save_as_mainfile(filepath=out, relative_remap=True)
    if not opts["master_out"]:
        # Saved by Blender, not copied, so its texture paths are remapped to art/.
        subprocess.run([bpy.app.binary_path, "-b", new_path, "--python-expr",
                        f"import bpy; bpy.ops.wm.save_as_mainfile(filepath={core.baseline_path()!r}, relative_remap=True)"],
                       check=True, capture_output=True)
    print("merged into", out, f"({time.ctime(os.path.getmtime(out))})")


main()
