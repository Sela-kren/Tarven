"""Packs a character GLB smaller, without changing what the game makes of it.

- Her per-cup keys (`_BUST_KEY_*`, `_BUST_FIX_*`, `_CLOTH_DRAPE_*`: full copies of a mesh's points, mostly zeros) become
  glTF sparse accessors: only the points that move are stored, the exact same numbers. The loader rebuilds the full
  attribute, so the game's code reads them as before.
- Normals go to 8 bits a component (normalized BYTE, padded to 4 bytes a point as glTF wants), and texture coordinates
  that stay within 0..1 to 16 bits (normalized UNSIGNED_SHORT; her paint layer UVs, past 1, stay as they are). Skin
  weights can go to 16 bits too ("weights"), but aren't by default (see DEFAULT). This is glTF's KHR_mesh_quantization.
  The game turns them back into ordinary floats as it loads (src/game/unpack.ts).

Checked 2026-11-22 (tools/bridge/glbpackcheck.preview.ts, every outfit at A/F/J/O, standing and posed): her points
exactly as before (0.0000 mm), her normals 0.14 deg off on average, 2.5 at most; 72.6 MB to 52.5 MB.
- Positions, joints, indices, morph targets, pictures and everything else are copied as they were: her face's shape
  keys find her points by exactly where they sit (src/game/facekeys.ts).

Packing a packed file changes nothing. Used by the Blender bridge's Send (tarven_bridge/core.py export_master).

  python tools/blender/glb_pack.py <in.glb> [out.glb]       (out defaults to in)
"""
import json
import os
import re
import struct
import sys

import numpy as np

FLOAT, BYTE, UBYTE, SHORT, USHORT, UINT = 5126, 5120, 5121, 5122, 5123, 5125
COMPONENTS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
DTYPE = {FLOAT: "<f4", BYTE: "i1", UBYTE: "u1", SHORT: "<i2", USHORT: "<u2", UINT: "<u4"}
ARRAY_BUFFER = 34962
#: Her per-cup keys, stored sparse.
SPARSE = re.compile(r"^_(BUST_KEY|BUST_FIX|CLOTH_DRAPE)_", re.I)
QUANT = "KHR_mesh_quantization"


def _read(path):
    data = open(path, "rb").read()
    magic, _version, _length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise ValueError(f"{path} is not a GLB")
    json_len, _ = struct.unpack_from("<II", data, 12)
    doc = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len
    bin_len = struct.unpack_from("<I", data, bin_start)[0]
    return doc, data[bin_start + 8:bin_start + 8 + bin_len]


def _write(path, doc, binary):
    text = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    text += b" " * (-len(text) % 4)
    binary += b"\0" * (-len(binary) % 4)
    total = 12 + 8 + len(text) + 8 + len(binary)
    tmp = path + ".packing"
    with open(tmp, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(text), 0x4E4F534A))
        f.write(text)
        f.write(struct.pack("<II", len(binary), 0x004E4942))
        f.write(binary)
    os.replace(tmp, path)


def _values(doc, binary, accessor):
    """An accessor's values as a (count, components) array (dense accessors with their own buffer view only)."""
    view = doc["bufferViews"][accessor["bufferView"]]
    n = COMPONENTS[accessor["type"]]
    dtype = np.dtype(DTYPE[accessor["componentType"]])
    stride = view.get("byteStride") or dtype.itemsize * n
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    rows = np.frombuffer(binary, np.uint8, accessor["count"] * stride, start).reshape(accessor["count"], stride)
    return rows[:, :dtype.itemsize * n].copy().view(dtype).reshape(accessor["count"], n)


#: What pack() does unless told otherwise. Not "weights": the game picks the four heaviest bones for each clothing
#: point from many (appearance.ts skinWeightsOnto), and where a 4th and 5th are near equal a 16-bit weight swaps them,
#: moving that point up to 1.6 mm (2026-11-22, tools/bridge/glbpackcheck.preview.ts). Kept at full precision.
DEFAULT = ("sparse", "normal", "uv")


def pack(src, dst=None, only=None):
    """Packs src into dst (src by default). `only` picks from "sparse", "normal", "weights", "uv" (default DEFAULT)."""
    dst = dst or src
    do = set(only or DEFAULT)
    doc, binary = _read(src)
    accessors = doc["accessors"]
    # What each accessor is used as: only plain vertex attributes are changed.
    role = {}
    for mesh in doc.get("meshes", []):
        for prim in mesh["primitives"]:
            for name, index in prim["attributes"].items():
                role.setdefault(index, set()).add(name)
            for target in prim.get("targets", []):
                for index in target.values():
                    role.setdefault(index, set()).add("morph")
            if "indices" in prim:
                role.setdefault(prim["indices"], set()).add("indices")
    for skin in doc.get("skins", []):
        if "inverseBindMatrices" in skin:
            role.setdefault(skin["inverseBindMatrices"], set()).add("ibm")
    for anim in doc.get("animations", []):
        for sampler in anim["samplers"]:
            role.setdefault(sampler["input"], set()).add("anim")
            role.setdefault(sampler["output"], set()).add("anim")

    out = bytearray()
    views = []
    kept_views = {}
    stats = {"sparse": 0, "normal": 0, "weights": 0, "uv": 0}

    def add_view(data, stride=None, target=None):
        out.extend(b"\0" * (-len(out) % 4))
        view = {"buffer": 0, "byteOffset": len(out), "byteLength": len(data)}
        if stride:
            view["byteStride"] = stride
        if target:
            view["target"] = target
        out.extend(data)
        views.append(view)
        return len(views) - 1

    def keep_view(index):
        if index not in kept_views:
            old = doc["bufferViews"][index]
            start = old.get("byteOffset", 0)
            new = add_view(binary[start:start + old["byteLength"]], old.get("byteStride"), old.get("target"))
            for key in ("name", "extras", "extensions"):
                if key in old:
                    views[new][key] = old[key]
            kept_views[index] = new
        return kept_views[index]

    quantized = False
    for index, acc in enumerate(accessors):
        names = role.get(index, set())
        name = next(iter(names)) if len(names) == 1 else None
        dense_float = "bufferView" in acc and "sparse" not in acc and acc["componentType"] == FLOAT
        if "sparse" in do and name and dense_float and SPARSE.match(name) and acc["type"] == "VEC3":
            values = _values(doc, binary, acc)
            moving = np.nonzero(np.any(values != 0, axis=1))[0]
            del acc["bufferView"]
            acc.pop("byteOffset", None)
            if len(moving):
                small = acc["count"] <= 65536
                idx = moving.astype("<u2" if small else "<u4").tobytes()
                acc["sparse"] = {
                    "count": int(len(moving)),
                    "indices": {"bufferView": add_view(idx), "componentType": USHORT if small else UINT},
                    "values": {"bufferView": add_view(values[moving].astype("<f4").tobytes())},
                }
            stats["sparse"] += 1
            continue
        if "normal" in do and name == "NORMAL" and dense_float and acc["type"] == "VEC3":
            v = _values(doc, binary, acc)
            q = np.clip(np.round(v * 127), -127, 127).astype("i1")
            padded = np.zeros((len(q), 4), "i1")
            padded[:, :3] = q
            acc.update(bufferView=add_view(padded.tobytes(), stride=4, target=ARRAY_BUFFER), componentType=BYTE, normalized=True)
            acc.pop("byteOffset", None)
            acc.pop("min", None)
            acc.pop("max", None)
            stats["normal"] += 1
            quantized = True
            continue
        if "weights" in do and name == "WEIGHTS_0" and dense_float and acc["type"] == "VEC4":
            v = _values(doc, binary, acc).astype(np.float64)
            # Each weight rounded on its own, nothing evened out: a half stays a half or a hair over (32767.5 rounds
            # to even, 32768), so the game's "at least half on her arm" tests (appearance.ts) come out as before.
            # Making each point's four add up to exactly 1 took a unit off one of two halves and flipped those.
            q = np.round(np.clip(v, 0, 1) * 65535).astype(np.int64)
            acc.update(bufferView=add_view(q.astype("<u2").tobytes(), target=ARRAY_BUFFER), componentType=USHORT, normalized=True)
            acc.pop("byteOffset", None)
            acc.pop("min", None)
            acc.pop("max", None)
            stats["weights"] += 1
            continue
        if "uv" in do and name and name.startswith("TEXCOORD_") and dense_float and acc["type"] == "VEC2":
            v = _values(doc, binary, acc)
            if v.size and v.min() >= 0 and v.max() <= 1:
                q = np.round(v * 65535).astype("<u2")
                acc.update(bufferView=add_view(q.tobytes(), target=ARRAY_BUFFER), componentType=USHORT, normalized=True)
                acc.pop("byteOffset", None)
                acc.pop("min", None)
                acc.pop("max", None)
                stats["uv"] += 1
                quantized = True
                continue
        # Everything else as it was.
        if "bufferView" in acc:
            acc["bufferView"] = keep_view(acc["bufferView"])
        if "sparse" in acc:
            acc["sparse"]["indices"]["bufferView"] = keep_view(acc["sparse"]["indices"]["bufferView"])
            acc["sparse"]["values"]["bufferView"] = keep_view(acc["sparse"]["values"]["bufferView"])
    # Pictures (and anything else) keep their buffer views.
    for image in doc.get("images", []):
        if "bufferView" in image:
            image["bufferView"] = keep_view(image["bufferView"])
    if quantized:
        for key in ("extensionsUsed", "extensionsRequired"):
            if QUANT not in doc.setdefault(key, []):
                doc[key].append(QUANT)
    doc["bufferViews"] = views
    doc["buffers"] = [{"byteLength": len(out) + (-len(out) % 4)}]
    before = os.path.getsize(src)
    _write(dst, doc, bytes(out))
    stats.update(before_kb=before // 1024, after_kb=os.path.getsize(dst) // 1024)
    return stats


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    print(pack(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
