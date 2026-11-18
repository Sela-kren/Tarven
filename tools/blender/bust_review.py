"""Lays her body out in Blender at each cup size, side by side, for sculpting fixes on the bust and body.

Reads the OBJ files tools/posepreview/bustexport.preview.ts writes to art/bust_review (her body as the game shapes
it at each cup), joins each into one mesh with its material seams welded (so a sculpt doesn't tear at the areola),
X-mirror on (one side's strokes land on the other), and saves art/bust_review/bust_review_NN.blend (NN the round). Each object is
named Bust_<cup>. tools/blender/bust_fixes.py reads the sculpted file back (it rebuilds the same meshes with
`load_size` to compare against, so the welding must stay the same).

Run: D:\\blender\\blender.exe -b -P tools/blender/bust_review.py   (TARVEN_ROOT may point at the project)
"""
import glob
import json
import os

import bpy

ROOT = os.environ.get("TARVEN_ROOT", os.getcwd())
FOLDER = os.path.join(ROOT, "art", "bust_review")
SPACING = 0.75
WELD = 0.00005


def load_size(path, name):
    """One cup's OBJ as a single welded mesh object called `name`, as the review file holds it."""
    before = set(bpy.data.objects)
    bpy.ops.wm.obj_import(filepath=path, forward_axis="Y", up_axis="Z")
    parts = [o for o in bpy.data.objects if o not in before]
    bpy.ops.object.select_all(action="DESELECT")
    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = body.data.name = name
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.remove_doubles(threshold=WELD)
    bpy.ops.object.mode_set(mode="OBJECT")
    return body


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    skin = bpy.data.materials.new("Skin")
    skin.diffuse_color = (0.93, 0.76, 0.66, 1)
    index = json.load(open(os.path.join(FOLDER, "index.json")))
    for n, entry in enumerate(index):
        body = load_size(os.path.join(FOLDER, entry["file"]), f"Bust_{entry['cup']}")
        bpy.ops.object.shade_smooth()
        body.data.materials.clear()
        body.data.materials.append(skin)
        body.data.use_mirror_x = True
        body.location.x = n * SPACING
        body["cup"] = entry["cup"]
        body["slider"] = entry["value"]
        # A label on the floor in front of each.
        bpy.ops.object.text_add(location=(n * SPACING - 0.08, -0.35, 0))
        label = bpy.context.object
        label.data.body = entry["cup"]
        label.data.size = 0.15
        label.name = f"Label_{entry['cup']}"
        label.hide_select = True
    bpy.context.scene.unit_settings.system = "METRIC"
    # One file per round of sculpting, numbered after the fix files already read back (art/sculpt_fixes), so an old
    # round still open in Blender can't save over the new one.
    done = len(glob.glob(os.path.join(ROOT, "art", "sculpt_fixes", "female_*.npz")))
    path = os.path.join(FOLDER, f"bust_review_{done + 1:02d}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=path)
    print("SAVED", len(index), "sizes", path)


if __name__ == "__main__":
    main()
