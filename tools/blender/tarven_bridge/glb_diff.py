"""Compares two GLBs the way the game sees them: node, mesh, material, bone and attribute names, vertex counts, and
how far each primitive's vertices moved. Proves a master export is the same model as a code build.

  python tools/blender/tarven_bridge/glb_diff.py a.glb b.glb [--tol 1e-5]

Exit code 0 when they match (positions within --tol metres), 1 otherwise.
"""
import json
import struct
import sys

import numpy as np

COMPONENT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
WIDTH = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load(path):
    data = open(path, "rb").read()
    magic, _, _ = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, f"{path}: not a GLB"
    off, doc, binary = 12, None, b""
    while off < len(data):
        length, kind = struct.unpack_from("<II", data, off)
        chunk = data[off + 8: off + 8 + length]
        if kind == 0x4E4F534A:
            doc = json.loads(chunk)
        elif kind == 0x004E4942:
            binary = chunk
        off += 8 + length
    return doc, binary


def accessor(doc, binary, index):
    acc = doc["accessors"][index]
    view = doc["bufferViews"][acc["bufferView"]]
    dtype = np.dtype(COMPONENT[acc["componentType"]])
    width = WIDTH[acc["type"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride") or dtype.itemsize * width
    count = acc["count"]
    raw = np.frombuffer(binary, np.uint8, count=stride * (count - 1) + dtype.itemsize * width, offset=start)
    rows = np.lib.stride_tricks.as_strided(raw, (count, dtype.itemsize * width), (stride, 1))
    return np.ascontiguousarray(rows).view(dtype).reshape(count, width)


def summary(path):
    doc, binary = load(path)
    mats = [m.get("name", "") for m in doc.get("materials", [])]
    out = {"nodes": sorted(n.get("name", "") for n in doc.get("nodes", [])),
           "materials": sorted(mats),
           "joints": [[doc["nodes"][j].get("name", "") for j in s["joints"]] for s in doc.get("skins", [])],
           "images": len(doc.get("images", [])), "prims": {}}
    for mesh in doc.get("meshes", []):
        for i, prim in enumerate(mesh["primitives"]):
            key = f'{mesh.get("name", "")}/{mats[prim["material"]] if "material" in prim else "-"}/{i}'
            attrs = {name: accessor(doc, binary, idx) for name, idx in prim["attributes"].items()}
            out["prims"][key] = {"attrs": attrs, "targets": len(prim.get("targets", [])),
                                 "indices": accessor(doc, binary, prim["indices"]) if "indices" in prim else None}
    return out


def compare(a_path, b_path, tol=1e-5):
    a, b = summary(a_path), summary(b_path)
    problems = []
    for field in ("nodes", "materials", "joints"):
        if a[field] != b[field]:
            only_a = sorted(set(map(str, a[field])) - set(map(str, b[field])))[:10]
            only_b = sorted(set(map(str, b[field])) - set(map(str, a[field])))[:10]
            problems.append(f"{field} differ: only in A {only_a}, only in B {only_b}")
    if a["images"] != b["images"]:
        problems.append(f"images: {a['images']} vs {b['images']}")
    missing = sorted(set(a["prims"]) ^ set(b["prims"]))
    if missing:
        problems.append(f"{len(missing)} primitives only on one side, e.g. {missing[:6]}")
    worst = 0.0
    for key in sorted(set(a["prims"]) & set(b["prims"])):
        pa, pb = a["prims"][key], b["prims"][key]
        if sorted(pa["attrs"]) != sorted(pb["attrs"]):
            problems.append(f"{key}: attributes {sorted(pa['attrs'])} vs {sorted(pb['attrs'])}")
            continue
        if pa["targets"] != pb["targets"]:
            problems.append(f"{key}: morph targets {pa['targets']} vs {pb['targets']}")
        for name in pa["attrs"]:
            va, vb = pa["attrs"][name], pb["attrs"][name]
            if va.shape != vb.shape:
                problems.append(f"{key}: {name} {va.shape} vs {vb.shape}")
                continue
            if va.dtype.kind == "f":
                d = float(np.abs(va.astype(np.float64) - vb).max()) if len(va) else 0.0
                if name == "POSITION":
                    worst = max(worst, d)
                if d > (tol if name in ("POSITION",) or name.startswith("_") else 1e-3):
                    problems.append(f"{key}: {name} differs by up to {d:.2e}")
            elif not np.array_equal(va, vb):
                problems.append(f"{key}: {name} differs")
        ia, ib = pa["indices"], pb["indices"]
        if (ia is None) != (ib is None) or (ia is not None and not np.array_equal(ia.ravel(), ib.ravel())):
            problems.append(f"{key}: triangles differ")
    return problems, worst, len(a["prims"])


if __name__ == "__main__":
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    tol = float(sys.argv[sys.argv.index("--tol") + 1]) if "--tol" in sys.argv else 1e-5
    if "--tol" in sys.argv:
        args.remove(sys.argv[sys.argv.index("--tol") + 1])
    problems, worst, prims = compare(args[0], args[1], tol)
    print(f"{prims} primitives compared; worst position move {worst:.2e} m")
    for p in problems[:60]:
        print("  DIFF", p)
    print("MATCH" if not problems else f"{len(problems)} differences")
    sys.exit(0 if not problems else 1)
