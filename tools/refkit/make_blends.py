"""
Turn every ref model (FBX / GLB in ref/<name>/source/) into its own ref/<name>/<name>.blend, textures linked
(relative paths) from that ref's own folder. Study files only: ref/ is gitignored and nothing here ships.

  D:/blender/blender.exe -b --factory-startup --python tools/refkit/make_blends.py [-- name ...]
"""
import os
import re
import sys

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REF_DIR = os.path.join(ROOT, "ref")
IMG_EXT = (".png", ".jpg", ".jpeg", ".tga", ".dds", ".tif", ".tiff", ".bmp")


def model_of(folder):
    found = []
    for dp, _, files in os.walk(os.path.join(folder, "source")):
        for f in files:
            if f.lower().endswith((".fbx", ".glb", ".gltf")):
                found.append(os.path.join(dp, f))
    return sorted(found)


def image_index(folder):
    idx = {}
    for dp, _, files in os.walk(folder):
        for f in files:
            if f.lower().endswith(IMG_EXT):
                idx.setdefault(f.lower(), os.path.join(dp, f))
                idx.setdefault(os.path.splitext(f)[0].lower(), os.path.join(dp, f))
    return idx


def relink(idx):
    """Point every image at a file in this ref's folder; return (linked, missing names)."""
    linked, missing = 0, []
    for img in bpy.data.images:
        if img.source != "FILE" or img.packed_file:
            continue
        p = bpy.path.abspath(img.filepath)
        if p and os.path.isfile(p):
            linked += 1
            continue
        base = os.path.basename(p.replace("\\", "/")).lower() or img.name.lower()
        hit = idx.get(base) or idx.get(os.path.splitext(base)[0])
        if hit:
            img.filepath = hit
            img.reload()
            linked += 1
        else:
            missing.append(img.name)
    return linked, missing


def _norm(tokens):
    """'Equip_002' / 'Equip02' / 'Equip_2' -> 'equip2'."""
    out = []
    for t in re.findall(r"[a-z]+|\d+", "_".join(tokens).lower()):
        out.append(str(int(t)) if t.isdigit() else t)
    return "".join(out)


def texture_table(folder):
    """{(part, suffix): [(id, path), ...]} for every T_<id>_<part...>_<suffix>.png in the ref folder."""
    table = {}
    for dp, _, files in os.walk(folder):
        for f in files:
            stem, ext = os.path.splitext(f)
            tok = stem.split("_")
            if ext.lower() not in IMG_EXT or tok[0] != "T" or len(tok) < 4:
                continue
            table.setdefault((_norm(tok[2:-1]), tok[-1].upper()), []).append((tok[1], os.path.join(dp, f)))
    return table


def pick(table, mat_id, part_keys, suffix):
    for key in part_keys:
        hits = table.get((key, suffix))
        if hits:
            same = [p for i, p in hits if i == mat_id]
            return (same or [p for _, p in hits])[0]
    return None


def load(path, data=False):
    img = bpy.data.images.load(path, check_existing=True)
    if data:
        img.colorspace_settings.name = "Non-Color"
    return img


def wire_textures(folder):
    """FBX rips carry no texture links: give each MI_<id>_<Part> material its T_*_<Part>_D/N/ORM/E images."""
    table = texture_table(folder)
    wired = 0
    for m in bpy.data.materials:
        tok = m.name.split("_")
        if tok[0] != "MI" or len(tok) < 3:
            continue
        mat_id, part = tok[1], _norm(tok[2:])
        keys = [part, re.sub(r"\d+$", "", part)]          # Hair_01 -> hair1, then hair
        if part == "eyes1":                               # the eyeball itself: any eye texture beats none
            keys += ["eyes2", "eyes"]
        if part.startswith("tooth"):
            keys.append("tooth")
        if part.startswith("hair"):
            keys += ["hairline", "hair1"]
        if "shadow" in part:
            keys.append("eyeshadow")          # T_Common_EyeShadow_2.png
        m.use_nodes = True
        nt = m.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if bsdf is None:
            continue
        x = bsdf.location.x - 700
        d = pick(table, mat_id, keys, "D") or ("shadow" in part and pick(table, mat_id, keys, "2"))
        if not d and not part.startswith("eyes"):
            # nothing at all for it (glasses lenses, fx shells): tinted see-through, not solid white
            bsdf.inputs["Base Color"].default_value = (0.05, 0.06, 0.08, 1)
            bsdf.inputs["Roughness"].default_value = 0.05
            bsdf.inputs["Alpha"].default_value = 0.35
            m.surface_render_method = "DITHERED"
            continue
        if not d and part.startswith("eyes") and part != "eyes1":
            # an untextured eye shell (wet layer / highlight / shadow) would sit grey over the eye: hide it
            bsdf.inputs["Alpha"].default_value = 0.0
            m.surface_render_method = "DITHERED"
            continue
        if d:
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image, tex.location = load(d), (x, 300)
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
            mask = part.startswith("hair") and pick(table, mat_id, keys, "M")
            if mask:                                          # UE hair cards: opacity in the mask's red
                mt = nt.nodes.new("ShaderNodeTexImage")
                mt.image, mt.location = load(mask, True), (x, 600)
                ms = nt.nodes.new("ShaderNodeSeparateColor"); ms.location = (x + 300, 600)
                nt.links.new(mt.outputs["Color"], ms.inputs["Color"])
                nt.links.new(ms.outputs["Red"], bsdf.inputs["Alpha"])
                m.surface_render_method = "DITHERED"
            elif part.startswith(("hair", "lash")) or "shadow" in part:
                nt.links.new(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
                m.surface_render_method = "DITHERED"
            wired += 1
        n = pick(table, mat_id, keys, "N")
        if n:
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image, tex.location = load(n, True), (x - 600, -300)
            sep = nt.nodes.new("ShaderNodeSeparateColor"); sep.location = (x - 300, -300)
            inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.location = (x - 150, -380)
            inv.inputs[0].default_value = 1.0
            comb = nt.nodes.new("ShaderNodeCombineColor"); comb.location = (x, -300)
            nm = nt.nodes.new("ShaderNodeNormalMap"); nm.location = (x + 200, -300)
            nt.links.new(tex.outputs["Color"], sep.inputs["Color"])
            nt.links.new(sep.outputs["Red"], comb.inputs["Red"])
            nt.links.new(sep.outputs["Green"], inv.inputs[1])       # UE normals are DirectX: flip green
            nt.links.new(inv.outputs["Value"], comb.inputs["Green"])
            nt.links.new(sep.outputs["Blue"], comb.inputs["Blue"])
            nt.links.new(comb.outputs["Color"], nm.inputs["Color"])
            nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        orm = pick(table, mat_id, keys, "ORM")
        if orm:
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image, tex.location = load(orm, True), (x, 0)
            sep = nt.nodes.new("ShaderNodeSeparateColor"); sep.location = (x + 300, 0)
            nt.links.new(tex.outputs["Color"], sep.inputs["Color"])
            nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
            nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
        e = pick(table, mat_id, keys, "E")
        if e:
            tex = nt.nodes.new("ShaderNodeTexImage")
            tex.image, tex.location = load(e), (x, -650)
            nt.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = 1.0
    return wired


def material_view():
    for scr in bpy.data.screens:
        for area in scr.areas:
            if area.type == "VIEW_3D":
                for sp in area.spaces:
                    if sp.type == "VIEW_3D":
                        sp.shading.type = "MATERIAL"


def textureless_materials():
    out = []
    for m in bpy.data.materials:
        if not m.use_nodes or not any(n.type == "TEX_IMAGE" and n.image for n in m.node_tree.nodes):
            out.append(m.name)
    return out


def convert(name):
    folder = os.path.join(REF_DIR, name)
    models = model_of(folder)
    if not models:
        return f"{name}: no model file"
    bpy.ops.wm.read_factory_settings(use_empty=True)
    src = models[0]
    if src.lower().endswith(".fbx"):
        bpy.ops.import_scene.fbx(filepath=src)
    else:
        bpy.ops.import_scene.gltf(filepath=src)
    linked, missing = relink(image_index(folder))
    wire_textures(folder)
    material_view()
    out = os.path.join(folder, name + ".blend")
    bpy.ops.wm.save_as_mainfile(filepath=out, relative_remap=True, compress=True)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    verts = sum(len(o.data.vertices) for o in meshes)
    arm = [o.name for o in bpy.data.objects if o.type == "ARMATURE"]
    bare = textureless_materials()
    return (f"{name}: {os.path.basename(src)} -> {os.path.relpath(out, ROOT)} | {len(meshes)} meshes, {verts} verts, "
            f"armature {arm or 'none'} | images ok {linked}, missing {missing or 0} | "
            f"materials w/o texture {bare or 0}")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    names = argv or sorted(d for d in os.listdir(REF_DIR)
                           if os.path.isdir(os.path.join(REF_DIR, d)) and not d.startswith("_"))
    report = [convert(n) for n in names]
    print("\n==== make_blends ====")
    print("\n".join(report))


main()
