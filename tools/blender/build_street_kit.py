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

The medieval pieces the kits don't have (her tavern, the Copper Bell, the chapel, the Warm House, three burgage
townhouses, the Baron's keep, the town gate, market stalls, the notice board, the market cross) are built here too,
in the kits' style, by tools/blender/kit_new/medieval.py (NEW below). They go in the same GLB.
A table of every piece's size and door point is written next to the GLB build log (streetkit_pieces.json in TEMP).

Textures and detail (2026-11-20, to match the painted players and NPCs): every material gets a painted texture family
from kit_tex.py (planks, stone, tile, thatch, plaster...) tinted by its own colour, plus that family's normal map, on
UVs laid out here in metres (world_uvs), so the texture is the same size on every piece. Every piece gets bevelled
edges that catch the light, and the round organic ones (trees, pumpkins, hay bales...) are subdivided and smoothed.
"""
import json
import math
import os
import re
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.environ.get("TARVEN_ROOT", os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
LIB = os.environ.get("PLANET_ASSETS", "D:/planet/assets")
OUT = os.path.join(ROOT, "public", "models", "streetkit.glb")
TEX_OUT = os.path.join(ROOT, "art", "textures", "town")

# Edge bevel on every piece: chamfers this wide on edges sharper than BEVEL_ANGLE, so they catch the light.
BEVEL_WIDTH = 0.025
BEVEL_ANGLE = math.radians(35)
BEVEL_MIN_LENGTH = 0.6
# Round organic pieces: subdivided once and shaded smooth (their low-poly facets read as PS1, not as the refs).
ORGANIC = {"roundTree", "appleTree", "pumpkins", "chicken", "hedge"}  # not the hay bales: their caps split apart

# Which painted texture family (kit_tex.FAMILIES) each kit material takes, first match wins. The rest take "paint".
FAMILY_OF = [
    (r"glass|^hk_win$|water", "glass"),
    (r"thatch|^hk_hay|straw", "thatch"),
    (r"rooftile|terracotta|redroof|roof_plum|greenroof", "rooftile"),
    (r"slate|shingle", "slate"),
    (r"brick", "brick"),
    (r"fieldstone|wellstone|soil|dirt", "fieldstone"),
    (r"stone|concrete", "ashlar"),
    (r"plaster|wall$|cream|^hk_white$|^hk_trim$|storeline|barnline", "plaster"),
    (r"door|timber|^hk_wood$|oak|walnut|pinewood|oldwood|logs|barnred|louvre|basket", "planks"),
    (r"bark|stem", "wood"),
    (r"iron|steel|galv|metal|brass|bronze|copper|verdigris|lead_came|wire|chrome", "metal"),
    (r"leaf|hedge|cabbage", "foliage"),
    (r"awning|awn$|blanket|plaid|linen|burlap|sack|denim|banner|curtain|rope|twine|feather|bistro", "cloth"),
]

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

# Built by kit_new/medieval.py (no fitting piece in the kits). Every id here must come out as Kit_<id>.
NEW = ["tavern", "copperBell", "chapel", "warmHouse", "houseA", "houseB", "houseC", "keep", "gatehouse",
       "stall", "stallB", "noticeBoard", "marketCross"]


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
    for o in objects:
        if o.type == "MESH":
            add_detail(o, piece_id)
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


def add_detail(o, piece_id):
    """a smooth subdivision on the round organic pieces' parts (the bevel comes later, on the joined piece)"""
    if piece_id in ORGANIC:
        sub = o.modifiers.new("Detail_Subsurf", "SUBSURF")
        sub.levels = sub.render_levels = 1
        for poly in o.data.polygons:
            poly.use_smooth = True


def bevel_edges(piece):
    """
    Chamfers the long sharp edges (walls, beams, posts, roof boards, ledges: at least BEVEL_MIN_LENGTH) so they catch
    the light. Short trim (window bars, lead cames, nails) stays sharp: bevelling every little box quadrupled the
    triangles for edges too small to see.
    """
    if piece.name[4:] in ORGANIC:
        return
    bm = bmesh.new()
    bm.from_mesh(piece.data)
    edges = [e for e in bm.edges
             if len(e.link_faces) == 2 and e.calc_length() >= BEVEL_MIN_LENGTH
             and e.calc_face_angle(0.0) >= BEVEL_ANGLE]
    if edges:
        bmesh.ops.bevel(bm, geom=edges, offset=BEVEL_WIDTH, offset_type="OFFSET", segments=1, profile=0.5,
                        affect="EDGES", clamp_overlap=True)
    bm.to_mesh(piece.data)
    bm.free()


def family_of(material):
    for pattern, family in FAMILY_OF:
        if re.search(pattern, material.name):
            return family
    return "paint"


def material_colour(m):
    """the colour the kit means the material to be (as flatten_colours: its viewport colour, unless that's unset)"""
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None) if m.use_nodes else None
    if bsdf is None:
        return tuple(m.diffuse_color)
    base = bsdf.inputs["Base Color"]
    if base.is_linked or tuple(base.default_value[:3]) == (0.8, 0.8, 0.8) or tuple(m.diffuse_color[:3]) != (0.8, 0.8, 0.8):
        return tuple(m.diffuse_color)
    return tuple(base.default_value)


def texture_materials(families):
    """
    Every material: its family's painted picture times its own colour (a Multiply mix, which glTF exports as the
    baseColorTexture and baseColorFactor), and the family's normal map. Emission and roughness stay as they were.
    """
    for m in bpy.data.materials:
        if not m.use_nodes:
            m.use_nodes = True
        tree = m.node_tree
        bsdf = next((n for n in tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        family = families[family_of(m)]
        colour = material_colour(m)
        for socket in (bsdf.inputs["Base Color"], bsdf.inputs["Normal"]):
            for link in list(socket.links):
                tree.links.remove(link)
        for node in list(tree.nodes):
            if node.type in {"TEX_NOISE", "VALTORGB", "TEX_COORD"}:
                tree.nodes.remove(node)
        image = tree.nodes.new("ShaderNodeTexImage")
        image.image = family.image
        image.interpolation = "Linear"
        mix = tree.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        # Divided by the picture's average so the material keeps its colour on average.
        mix.inputs["B"].default_value = (*[min(1.0, c / family.mean) for c in colour[:3]], 1.0)
        tree.links.new(image.outputs["Color"], mix.inputs["A"])
        tree.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        normal_image = tree.nodes.new("ShaderNodeTexImage")
        normal_image.image = family.normal
        normal_image.interpolation = "Linear"
        normal_map = tree.nodes.new("ShaderNodeNormalMap")
        tree.links.new(normal_image.outputs["Color"], normal_map.inputs["Color"])
        tree.links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
        m.diffuse_color = (*colour[:3], 1.0)


def world_uvs(piece, families):
    """
    UVs in metres: each face projected in its own frame (u along the ground, v up the wall or up the roof slope, so
    tile courses run along the eaves), tops and bottoms flat in x/y, divided by the face's family's tile size.
    """
    me = piece.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    bm = bmesh.new()
    bm.from_mesh(me)
    uv = bm.loops.layers.uv.new("UVMap")
    scales = [families[family_of(m)].scale if m else 2.0 for m in me.materials] or [2.0]
    for face in bm.faces:
        n = face.normal
        scale = scales[face.material_index] if face.material_index < len(scales) else 2.0
        if abs(n.z) > 0.7:
            u_axis, v_axis = Vector((1, 0, 0)), Vector((0, 1 if n.z > 0 else -1, 0))
        else:
            u_axis = Vector((-n.y, n.x, 0)).normalized()
            v_axis = n.cross(u_axis).normalized()
        for loop in face.loops:
            p = loop.vert.co
            loop[uv].uv = (p.dot(u_axis) / scale, p.dot(v_axis) / scale)
    bm.to_mesh(me)
    bm.free()


def dedupe_materials():
    """
    The two kit files both carry homekit's materials, so appending gives copies like hk_stone.003. Point every user of
    a copy at the base material (when it exists) and drop the copy, so the GLB carries each colour once.
    """
    import re
    for m in list(bpy.data.materials):
        hit = re.fullmatch(r"(.+)\.\d{3}", m.name)
        base = bpy.data.materials.get(hit.group(1)) if hit else None
        if base is not None and base is not m:
            m.user_remap(base)
            bpy.data.materials.remove(m)


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


def build_new():
    """the NEW pieces, after the kit ones so they share the kit's materials by name"""
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)
    from kit_new import medieval
    out = []
    for piece_id in NEW:
        if piece_id not in medieval.BUILDERS:
            raise SystemExit(f"build_street_kit: no builder for NEW piece {piece_id!r}")
        out.append(medieval.BUILDERS[piece_id]())
    return out


def measure(p):
    """size (x, y, z), and the door: its centre if it has a door material, else the front centre (Blender axes)"""
    me = p.data
    xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    if "door" in p.keys():
        door = list(p["door"])
    else:
        dv = [me.vertices[i].co for poly in me.polygons
              if me.materials[poly.material_index] and "door" in me.materials[poly.material_index].name.lower()
              for i in poly.vertices]
        door = [round((min(v.x for v in dv) + max(v.x for v in dv)) / 2, 2), round(min(v.y for v in dv), 2)] if dv             else [0.0, round(min(ys), 2)]
    return dict(id=p.name[4:], new=p.name[4:] in NEW, size=[round(max(a) - min(a), 2) for a in (xs, ys, zs)],
                min=[round(min(a), 2) for a in (xs, ys, zs)], max=[round(max(a), 2) for a in (xs, ys, zs)],
                door=[round(d, 2) for d in door], tris=sum(len(poly.vertices) - 2 for poly in me.polygons))


def main():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    pieces = []
    for piece_id, (blend, name) in PIECES.items():
        pieces.append(realise(append(blend, name), piece_id))
    pieces += build_new()
    dedupe_materials()
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)
    import kit_tex
    families = kit_tex.make_all(TEX_OUT)
    texture_materials(families)
    for p in pieces:
        bevel_edges(p)
        world_uvs(p, families)
    bpy.ops.object.select_all(action="DESELECT")
    for p in pieces:
        p.select_set(True)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=True, export_yup=True,
                              export_image_format="WEBP", export_vertex_color="NONE")
    tris = sum(sum(len(poly.vertices) - 2 for poly in p.data.polygons) for p in pieces)
    print(f"streetkit.glb: {len(pieces)} pieces, {tris} triangles, {os.path.getsize(OUT) // 1024} KB")
    table = [measure(p) for p in pieces]
    path = os.path.join(os.environ.get("TEMP", "."), "streetkit_pieces.json")
    with open(path, "w") as f:
        json.dump(table, f, indent=1)
    print(f"piece table: {path}")


if __name__ == "__main__":
    main()
