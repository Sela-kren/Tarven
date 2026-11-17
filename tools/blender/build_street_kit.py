"""
The town's set pieces for Tarven's high street (src/game/street.ts), taken from the Polyvive kits in D:/planet
(kit_town.blend, kit_country.blend: low-poly, PS1/PS2 look, real sizes, each piece facing -y and standing on z=0).

Each kit asset is a collection of parts. This appends the ones the street uses, makes each one a single mesh named
"Kit_<id>" standing at the origin, and exports them all to public/models/streetkit.glb. The game clones them by name
and places them along the street; where they stand is decided in street.ts, not here.

Run headless (about 10 s):
    D:/blender/blender.exe -b --factory-startup --python tools/blender/build_street_kit.py
Set PLANET_ASSETS if the kits live somewhere else, and TARVEN_ROOT to write into another checkout.

What's left out on purpose (WORLD.md: no cars): the tractor, traffic light, bus stop, stop sign, hydrant, garage.
"""
import os

import bpy

ROOT = os.environ.get("TARVEN_ROOT", os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
LIB = os.environ.get("PLANET_ASSETS", "D:/planet/assets")
OUT = os.path.join(ROOT, "public", "models", "streetkit.glb")

# id in the game: (kit file, asset collection name)
PIECES = {
    # The village square and the street
    "fountain": ("kit_town", "Town fountain"),
    "bakery": ("kit_town", "Bakery (bread cart)"),
    "cafe": ("kit_town", "Cafe (with tables)"),
    "cafeTable": ("kit_town", "Cafe table + chairs + parasol"),
    "planter": ("kit_town", "Flower planter"),
    "hedge": ("kit_town", "Hedge (3 m)"),
    "bench": ("kit_town", "Park bench"),
    "lamp": ("kit_town", "Street lamp"),
    "roundTree": ("kit_town", "Round tree"),
    "picket": ("kit_town", "Picket fence (3 m)"),
    "townhouses": ("kit_town", "Townhouse row"),
    # Market goods and farm things
    "well": ("kit_country", "Stone well (roof + bucket)"),
    "crates": ("kit_country", "Crates (apples, oranges)"),
    "hayStack": ("kit_country", "Hay bale stack"),
    "hayBales": ("kit_country", "Round hay bales (2)"),
    "hayWagon": ("kit_country", "Hay wagon"),
    "wheelbarrow": ("kit_country", "Wheelbarrow"),
    "milkCans": ("kit_country", "Milk cans (3)"),
    "pumpkins": ("kit_country", "Pumpkins (3)"),
    "trough": ("kit_country", "Water trough"),
    "railFence": ("kit_country", "Split-rail fence (3 m)"),
    "gate": ("kit_country", "Farm gate (5 bar)"),
    "scarecrow": ("kit_country", "Scarecrow (+ crow)"),
    "chicken": ("kit_country", "Chicken"),
    "coop": ("kit_country", "Chicken coop + run"),
    "appleTree": ("kit_country", "Apple tree"),
    "pineTree": ("kit_country", "Pine tree"),
    "store": ("kit_country", "General store (false front)"),
    "cabin": ("kit_country", "Log cabin"),
    "barn": ("kit_country", "Red barn (gambrel)"),
    "outhouse": ("kit_country", "Outhouse (moon door)"),
}


def append(blend, name):
    path = os.path.join(LIB, blend + ".blend")
    with bpy.data.libraries.load(path, link=False, assets_only=True) as (src, dst):
        if name not in src.collections:
            raise SystemExit(f"build_street_kit: no asset {name!r} in {path}")
        dst.collections = [name]
    return dst.collections[0]


def realise(coll, piece_id):
    """The collection's parts (its children's too) as one mesh, its origin where the piece stands."""
    scene = bpy.context.scene
    scene.collection.children.link(coll)
    bpy.context.view_layer.update()
    objects = [o for o in coll.all_objects]
    bpy.ops.object.select_all(action="DESELECT")
    # Text, curves and instanced parts become plain meshes first, with their modifiers applied.
    for o in objects:
        o.hide_set(False)
        o.hide_viewport = False
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.duplicates_make_real()
    bpy.ops.object.select_all(action="DESELECT")
    objects = [o for o in coll.all_objects]
    for o in list(scene.objects):
        if o.type in {"CURVE", "FONT", "SURFACE", "META"} or (o.type == "MESH" and o.modifiers):
            if o in objects:
                o.select_set(True)
    if bpy.context.selected_objects:
        bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]
        bpy.ops.object.convert(target="MESH")
    meshes = [o for o in coll.all_objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    # Parents and children both keep their world placement once joined.
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.join()
    piece = bpy.context.view_layer.objects.active
    piece.name = piece.data.name = f"Kit_{piece_id}"
    # The origin at the world origin, where the kit piece stands.
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in list(coll.all_objects):
        if o is not piece:
            bpy.data.objects.remove(o)
    return piece


def flatten_colours():
    """
    The kit tints wood, stone, leaves and hay with a noise texture into the base colour, which glTF can't carry (it
    exported them white). Each kit material keeps its real colour as its viewport colour, so that goes in instead.
    """
    for m in bpy.data.materials:
        if not m.use_nodes:
            continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        base = bsdf.inputs["Base Color"]
        for link in list(base.links):
            m.node_tree.links.remove(link)
        if base.default_value[:3] == (0.8, 0.8, 0.8) or m.diffuse_color[:3] != (0.8, 0.8, 0.8):
            base.default_value = m.diffuse_color


def main():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    pieces = []
    for piece_id, (blend, name) in PIECES.items():
        pieces.append(realise(append(blend, name), piece_id))
    flatten_colours()
    bpy.ops.object.select_all(action="DESELECT")
    for p in pieces:
        p.select_set(True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=True, export_yup=True)
    tris = sum(sum(len(poly.vertices) - 2 for poly in p.data.polygons) for p in pieces)
    print(f"streetkit.glb: {len(pieces)} pieces, {tris} triangles, {os.path.getsize(OUT) // 1024} KB")


if __name__ == "__main__":
    main()
