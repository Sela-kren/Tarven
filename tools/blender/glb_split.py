"""Splits a character GLB into a base file and one file per outfit, so the game downloads an outfit only when it's
worn (src/game/outfitfiles.ts), and merges them back into one.

- The base (`female.glb`): everything but the outfits: her body, hair, shoes, jewellery, stains, the plain tavern
  dress (`Female_Cloth`, worn while an outfit is still coming) and her skeleton. Its `asset.extras.tarvenOutfits` lists
  the outfit files: {"Tee": "female/Tee.glb", ...}, relative to the base file's folder.
- Each outfit (`female/<Outfit>.glb`, the `Female_Cloth<Outfit>` object): its meshes, their materials and pictures, and
  the same skeleton (bones only, the same skin), so it binds onto her bones by name.

Both halves keep every accessor exactly as it was (packed or not, see glb_pack.py). merge() puts the outfits back
under her armature on the base's skin: the same model as before the split, for the tools.

  python tools/blender/glb_split.py split <full.glb> <base.glb>      (outfits to <base folder>/<base name>/)
  python tools/blender/glb_split.py merge <base.glb> <out.glb>
"""
import copy
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glb_pack import _read, _write  # noqa: E402

TEXTURE_KEY = re.compile(r"Texture$")


def _outfit_of(name, body):
    found = re.match(rf"^{body}_Cloth([A-Z][a-z]+)", name or "")
    return found.group(1) if found else None


def _subset(doc, binary, keep_nodes):
    """A copy of the document with only these nodes (and their parents), and only what they use."""
    nodes = doc["nodes"]
    parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    keep = set()
    for i in keep_nodes:
        while i is not None and i not in keep:
            keep.add(i)
            i = parent.get(i)
    order = sorted(keep)
    node_map = {old: new for new, old in enumerate(order)}
    out = {k: copy.deepcopy(v) for k, v in doc.items() if k not in ("nodes", "meshes", "accessors", "bufferViews", "buffers",
                                                                    "materials", "textures", "images", "samplers", "skins",
                                                                    "animations", "scenes")}
    mesh_map, skin_map, acc_map, mat_map, tex_map, img_map, smp_map = {}, {}, {}, {}, {}, {}, {}
    meshes, skins, accessors, materials, textures, images, samplers, views = [], [], [], [], [], [], [], []
    blob = bytearray()

    def view(index):
        old = doc["bufferViews"][index]
        start = old.get("byteOffset", 0)
        blob.extend(b"\0" * (-len(blob) % 4))
        new = {k: v for k, v in old.items() if k not in ("byteOffset", "buffer")}
        new.update(buffer=0, byteOffset=len(blob))
        blob.extend(binary[start:start + old["byteLength"]])
        views.append(new)
        return len(views) - 1

    view_map = {}

    def view_of(index):
        if index not in view_map:
            view_map[index] = view(index)
        return view_map[index]

    def acc(index):
        if index not in acc_map:
            a = copy.deepcopy(doc["accessors"][index])
            if "bufferView" in a:
                a["bufferView"] = view_of(a["bufferView"])
            if "sparse" in a:
                a["sparse"]["indices"]["bufferView"] = view_of(a["sparse"]["indices"]["bufferView"])
                a["sparse"]["values"]["bufferView"] = view_of(a["sparse"]["values"]["bufferView"])
            accessors.append(a)
            acc_map[index] = len(accessors) - 1
        return acc_map[index]

    def image(index):
        if index not in img_map:
            im = copy.deepcopy(doc["images"][index])
            if "bufferView" in im:
                im["bufferView"] = view_of(im["bufferView"])
            images.append(im)
            img_map[index] = len(images) - 1
        return img_map[index]

    def sampler(index):
        if index not in smp_map:
            samplers.append(copy.deepcopy(doc["samplers"][index]))
            smp_map[index] = len(samplers) - 1
        return smp_map[index]

    def texture(index):
        if index not in tex_map:
            t = copy.deepcopy(doc["textures"][index])
            if "source" in t:
                t["source"] = image(t["source"])
            if "sampler" in t:
                t["sampler"] = sampler(t["sampler"])
            for ext in t.get("extensions", {}).values():
                if isinstance(ext, dict) and "source" in ext:
                    ext["source"] = image(ext["source"])
            textures.append(t)
            tex_map[index] = len(textures) - 1
        return tex_map[index]

    def remap_textures(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if TEXTURE_KEY.search(k) and isinstance(v, dict) and "index" in v:
                    v["index"] = texture(v["index"])
                remap_textures(v)
        elif isinstance(obj, list):
            for v in obj:
                remap_textures(v)

    def material(index):
        if index not in mat_map:
            m = copy.deepcopy(doc["materials"][index])
            remap_textures(m)
            materials.append(m)
            mat_map[index] = len(materials) - 1
        return mat_map[index]

    def mesh(index):
        if index not in mesh_map:
            m = copy.deepcopy(doc["meshes"][index])
            for p in m["primitives"]:
                p["attributes"] = {k: acc(v) for k, v in p["attributes"].items()}
                if "indices" in p:
                    p["indices"] = acc(p["indices"])
                if "material" in p:
                    p["material"] = material(p["material"])
                for t in p.get("targets", []):
                    for k in list(t):
                        t[k] = acc(t[k])
            meshes.append(m)
            mesh_map[index] = len(meshes) - 1
        return mesh_map[index]

    def skin(index):
        if index not in skin_map:
            s = copy.deepcopy(doc["skins"][index])
            s["joints"] = [node_map[j] for j in s["joints"]]
            if "skeleton" in s and s["skeleton"] in node_map:
                s["skeleton"] = node_map[s["skeleton"]]
            if "inverseBindMatrices" in s:
                s["inverseBindMatrices"] = acc(s["inverseBindMatrices"])
            skins.append(s)
            skin_map[index] = len(skins) - 1
        return skin_map[index]

    new_nodes = []
    for old in order:
        n = copy.deepcopy(nodes[old])
        if "children" in n:
            n["children"] = [node_map[c] for c in n["children"] if c in node_map]
            if not n["children"]:
                del n["children"]
        new_nodes.append(n)
    for new, old in enumerate(order):
        n = new_nodes[new]
        if "mesh" in n:
            n["mesh"] = mesh(n["mesh"])
        if "skin" in n:
            n["skin"] = skin(n["skin"])
    out["nodes"] = new_nodes
    out["scenes"] = []
    for sc in doc["scenes"]:
        s = copy.deepcopy(sc)
        s["nodes"] = [node_map[i] for i in sc["nodes"] if i in node_map]
        out["scenes"].append(s)
    for key, value in (("meshes", meshes), ("skins", skins), ("accessors", accessors), ("materials", materials),
                       ("textures", textures), ("images", images), ("samplers", samplers)):
        if value:
            out[key] = value
    out["bufferViews"] = views
    out["buffers"] = [{"byteLength": len(blob) + (-len(blob) % 4)}]
    return out, bytes(blob)


def split(full, base_out, body="Female"):
    """Writes the base and one file per outfit; returns {outfit: (relative path, KB)}."""
    doc, binary = _read(full)
    nodes = doc["nodes"]
    joints = {j for s in doc.get("skins", []) for j in s["joints"]}
    outfits = {}
    for i, n in enumerate(nodes):
        name = _outfit_of(n.get("name"), body) if "mesh" in n else None
        if name:
            outfits.setdefault(name, []).append(i)
    folder = os.path.splitext(os.path.basename(base_out))[0]
    out_dir = os.path.join(os.path.dirname(os.path.abspath(base_out)), folder)
    os.makedirs(out_dir, exist_ok=True)
    listed = {}
    for name, ids in sorted(outfits.items()):
        part_doc, part_bin = _subset(doc, binary, set(ids) | joints)
        path = os.path.join(out_dir, f"{name}.glb")
        _write(path, part_doc, part_bin)
        listed[name] = (f"{folder}/{name}.glb", os.path.getsize(path) // 1024)
    # Old outfit files no longer in the model go.
    for old in os.listdir(out_dir):
        if old.endswith(".glb") and old[:-4] not in outfits:
            os.remove(os.path.join(out_dir, old))
    dropped = {i for ids in outfits.values() for i in ids}
    base_doc, base_bin = _subset(doc, binary, {i for i in range(len(nodes)) if i not in dropped})
    extras = base_doc.setdefault("asset", {}).setdefault("extras", {})
    extras["tarvenOutfits"] = {name: path for name, (path, _kb) in listed.items()}
    _write(base_out, base_doc, base_bin)
    return {"base_kb": os.path.getsize(base_out) // 1024, "outfits": listed}


def merge(base, out):
    """The base with its outfit files put back (under her armature, on the base's skin)."""
    doc, binary = _read(base)
    listed = doc.get("asset", {}).get("extras", {}).pop("tarvenOutfits", None)
    if not listed:
        _write(out, doc, binary)
        return 0
    folder = os.path.dirname(os.path.abspath(base))
    blob = bytearray(binary)
    by_name = {n.get("name"): i for i, n in enumerate(doc["nodes"])}
    for name, rel in listed.items():
        part, part_bin = _read(os.path.join(folder, rel))
        shift = {k: len(doc.get(k, [])) for k in ("accessors", "bufferViews", "materials", "textures", "images", "samplers", "meshes")}
        blob.extend(b"\0" * (-len(blob) % 4))
        offset = len(blob)
        blob.extend(part_bin)
        for v in part["bufferViews"]:
            v["byteOffset"] = v.get("byteOffset", 0) + offset
        for a in part.get("accessors", []):
            if "bufferView" in a:
                a["bufferView"] += shift["bufferViews"]
            if "sparse" in a:
                a["sparse"]["indices"]["bufferView"] += shift["bufferViews"]
                a["sparse"]["values"]["bufferView"] += shift["bufferViews"]
        for im in part.get("images", []):
            if "bufferView" in im:
                im["bufferView"] += shift["bufferViews"]
        for t in part.get("textures", []):
            if "source" in t:
                t["source"] += shift["images"]
            if "sampler" in t:
                t["sampler"] += shift["samplers"]

        def bump(obj):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if TEXTURE_KEY.search(k) and isinstance(v, dict) and "index" in v:
                        v["index"] += shift["textures"]
                    bump(v)
            elif isinstance(obj, list):
                for v in obj:
                    bump(v)
        for m in part.get("materials", []):
            bump(m)
        for m in part.get("meshes", []):
            for p in m["primitives"]:
                p["attributes"] = {k: v + shift["accessors"] for k, v in p["attributes"].items()}
                if "indices" in p:
                    p["indices"] += shift["accessors"]
                if "material" in p:
                    p["material"] += shift["materials"]
                for t in p.get("targets", []):
                    for k in list(t):
                        t[k] += shift["accessors"]
        for key in ("accessors", "bufferViews", "materials", "textures", "images", "samplers", "meshes"):
            doc.setdefault(key, []).extend(part.get(key, []))
        # The outfit's objects, under the same parent as in its file, on the base's skin (the same bones).
        part_parent = {c: i for i, n in enumerate(part["nodes"]) for c in n.get("children", [])}
        for i, n in enumerate(part["nodes"]):
            if "mesh" not in n:
                continue
            new = copy.deepcopy(n)
            new["mesh"] += shift["meshes"]
            if "skin" in new:
                new["skin"] = 0
            new.pop("children", None)
            doc["nodes"].append(new)
            at = len(doc["nodes"]) - 1
            holder = by_name.get(part["nodes"][part_parent[i]]["name"]) if i in part_parent else None
            if holder is None:
                doc["scenes"][doc.get("scene", 0)]["nodes"].append(at)
            else:
                doc["nodes"][holder].setdefault("children", []).append(at)
    doc["buffers"] = [{"byteLength": len(blob) + (-len(blob) % 4)}]
    _write(out, doc, bytes(blob))
    return len(listed)


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("split", "merge"):
        raise SystemExit(__doc__)
    print((split if sys.argv[1] == "split" else merge)(sys.argv[2], sys.argv[3]))
