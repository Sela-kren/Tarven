"""
Lines up every strip stage of both characters, side by side, to check how each looks with pieces taken off.

Mirrors the strip ladder in src/game/wardrobe.ts: the clothing layer's materials come off, never the shoes, and
last of all the smallclothes painted on the body are painted over in skin.

    blender --python tools/blender/strip_stages.py
"""
import os

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SPACING = 0.75

# The ladder from src/game/wardrobe.ts: (model, body, [(stage label, clothing materials off by then)]).
FEMALE_OFF = [("Apron", "T_apron"), ("Belt", "T_leather"), ("Bodice", "T_bodice"), ("Skirt", "T_skirt"),
              ("Stockings", "T_hose"), ("Chemise", "T_linen"), ("Smallclothes", "T_smalls")]
MALE_OFF = [("Tunic", "T_tunic"), ("Trousers", "T_trousers"), ("Smallclothes", "T_smalls")]
# The skin each body's smallclothes turn into once they're off.
SKIN = {"Female": "T_skin_f", "Male": "T_skin"}


def ladder(off):
    stages = [("Dressed", [])]
    for i, (name, _) in enumerate(off):
        stages.append((f"- {name}", [m for _, m in off[: i + 1]]))
    return stages


STAGES = [("female", "Female", ladder(FEMALE_OFF)), ("male", "Male", ladder(MALE_OFF))]
# Models from public/models, or from TARVEN_MODELS to look at a fresh build before it's copied in.
MODELS = os.environ.get("TARVEN_MODELS") or os.path.join(ROOT, "public", "models")


def base(name):
    return name.split(".")[0]


def import_copy(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def strip(objects, body, materials):
    for obj in objects:
        # Only the character's own hair and outfit show; the other styles and outfits and the stray cube are hidden.
        others = [prefix for prefix in (f"{body}_Hair", f"{body}_Cloth")
                  if base(obj.name).startswith(prefix) and base(obj.name) != prefix]
        if obj.type == "MESH" and (others or base(obj.name) == "Cube"):
            obj.hide_viewport = True
            obj.hide_render = True
        if obj.type == "MESH" and base(obj.name) == f"{body}_Body" and "T_smalls" in materials:
            slots = obj.data.materials
            skin = next(m for m in slots if m and base(m.name) == SKIN[body])
            for i, m in enumerate(slots):
                if m and base(m.name) == "T_smalls":
                    slots[i] = skin
        if obj.type != "MESH" or base(obj.name) != f"{body}_Cloth" or not materials:
            continue
        mesh = obj.data
        off = {i for i, m in enumerate(mesh.materials) if m and base(m.name) in materials}
        bpy.context.view_layer.objects.active = obj
        for o in bpy.context.selected_objects:
            o.select_set(False)
        obj.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        for poly in mesh.polygons:
            poly.select = poly.material_index in off
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.delete(type="FACE")
        bpy.ops.object.mode_set(mode="OBJECT")


def label(text, x):
    bpy.ops.object.text_add(location=(x, 0.3, 0.0), rotation=(1.5708, 0, 3.14159))
    obj = bpy.context.object
    obj.data.body = text
    obj.data.size = 0.07
    obj.data.align_x = "CENTER"
    obj.name = f"Label {text}"


def build():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj)
    x = 0.0
    for file, body, stages in STAGES:
        for name, materials in stages:
            objects = import_copy(os.path.join(MODELS, f"{file}.glb"))
            for obj in objects:
                if obj.parent is None:
                    obj.location.x += x
            strip(objects, body, materials)
            label(f"{body} {name}", x)
            x += SPACING
        x += SPACING * 0.5

    bpy.ops.object.light_add(type="SUN", location=(0, 3, 4), rotation=(-0.6, 0, 0))
    bpy.context.object.data.energy = 3
    world = bpy.data.worlds.new("World") if not bpy.context.scene.world else bpy.context.scene.world
    bpy.context.scene.world = world
    world.color = (0.35, 0.35, 0.38)
    for o in bpy.context.selected_objects:
        o.select_set(False)


def frame():
    """Once the window is up: material preview, looking at the row face on."""
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type != "VIEW_3D":
                continue
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.overlay.show_floor = False
            region = next(r for r in area.regions if r.type == "WINDOW")
            with bpy.context.temp_override(window=window, area=area, region=region):
                bpy.ops.view3d.view_axis(type="BACK")  # the characters face +Y
                bpy.ops.view3d.view_all()
    return None


build()
bpy.app.timers.register(frame, first_interval=0.5)
