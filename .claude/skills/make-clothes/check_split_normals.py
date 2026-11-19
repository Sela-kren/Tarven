"""
Finds hard shading edges inside a garment: points at one spot with different normals, which the game draws as a
sharp line across the cloth. Reads a GLB directly (no Blender needed).

    python check_split_normals.py public/models/female.glb Female_ClothTee T_tee

Prints how many such points there are, by height (glTF y, metres) and front or back (z sign).
"""
import json
import struct
import sys
from collections import Counter, defaultdict


def accessor(gltf, data, bin_start, index):
    a = gltf["accessors"][index]
    view = gltf["bufferViews"][a["bufferView"]]
    offset = bin_start + view.get("byteOffset", 0) + a.get("byteOffset", 0)
    n = {"VEC3": 3, "VEC2": 2, "SCALAR": 1}[a["type"]]
    fmt = {5126: "f", 5123: "H", 5125: "I"}[a["componentType"]]
    size = struct.calcsize(fmt)
    stride = view.get("byteStride", n * size)
    return [struct.unpack_from("<" + fmt * n, data, offset + k * stride) for k in range(a["count"])]


def main(path, mesh_name, material):
    data = open(path, "rb").read()
    json_length = struct.unpack_from("<I", data, 12)[0]
    gltf = json.loads(data[20:20 + json_length])
    bin_start = 20 + json_length + 8
    mesh = next(m for m in gltf["meshes"] if m["name"] == mesh_name)
    total = 0
    for prim in mesh["primitives"]:
        if gltf["materials"][prim["material"]]["name"] != material:
            continue
        positions = accessor(gltf, data, bin_start, prim["attributes"]["POSITION"])
        normals = accessor(gltf, data, bin_start, prim["attributes"]["NORMAL"])
        spots = defaultdict(list)
        for p, n in zip(positions, normals):
            spots[tuple(round(c, 5) for c in p)].append(n)
        found = Counter()
        for p, ns in spots.items():
            if len(ns) > 1 and min(sum(a * b for a, b in zip(ns[0], m)) for m in ns[1:]) < 0.98:
                found[(round(p[1], 2), "front" if p[2] < 0 else "back")] += 1
        total += sum(found.values())
        for (height, side), count in sorted(found.items()):
            print(f"{material}: {count} split points at height {height} m, {side}")
    print(f"{total} split points in all")


if __name__ == "__main__":
    main(*sys.argv[1:4])
