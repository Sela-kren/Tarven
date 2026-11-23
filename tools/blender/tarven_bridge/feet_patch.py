"""Patches her feet from a master export into the game's female.glb, leaving everything else in it as it is.

Used when the game's GLB holds work the master doesn't (2026-11-23: the game's crotch), so a full Send would undo it.
From the master export (B) into the game GLB (A):
  - the foot and toe bones (Female_Foot_L/R under the Shin, Female_Toe_L/R under the Foot), added to the skin;
  - the feet's weights on every skinned piece both share (her skin, legwear...), point by point by position: a point
    B weights to a foot or toe bone takes B's joints and weights;
  - every shoe mesh replaced by B's (geometry, materials by name, and the node's `foot_tip`); a shoe B no longer has
    (Barefoot: her own foot now) is taken out of the scene.

  python tools/blender/tarven_bridge/feet_patch.py <game.glb> <master_export.glb> <out.glb>
"""
import json
import struct
import sys

import numpy as np

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from glb_diff import COMPONENT, WIDTH, load  # noqa: E402

FEET = ("Female_Foot_L", "Female_Foot_R", "Female_Toe_L", "Female_Toe_R")
SHOE = "Female_Shoes"
TOL = 1e-5


def read(doc, binary, index):
    acc = doc["accessors"][index]
    assert "sparse" not in acc, "sparse accessors aren't handled"
    view = doc["bufferViews"][acc["bufferView"]]
    dtype = np.dtype(COMPONENT[acc["componentType"]])
    width = WIDTH[acc["type"]]
    start = view.get("byteOffset", 0) + acc.get("byteOffset", 0)
    stride = view.get("byteStride") or dtype.itemsize * width
    if stride == dtype.itemsize * width:
        out = np.frombuffer(binary, dtype, acc["count"] * width, start).reshape(acc["count"], width)
    else:
        rows = [np.frombuffer(binary, dtype, width, start + i * stride) for i in range(acc["count"])]
        out = np.stack(rows)
    return out.copy()


class Writer:
    """Appends new data to A's binary chunk as new buffer views and accessors."""

    def __init__(self, doc, binary):
        self.doc, self.chunks, self.size = doc, [binary], len(binary)

    def add(self, array, src_acc, target=None):
        pad = (-self.size) % 4
        if pad:
            self.chunks.append(b"\0" * pad)
            self.size += pad
        data = np.ascontiguousarray(array).tobytes()
        view = {"buffer": 0, "byteOffset": self.size, "byteLength": len(data)}
        if target:
            view["target"] = target
        self.doc["bufferViews"].append(view)
        self.chunks.append(data)
        self.size += len(data)
        acc = {k: v for k, v in src_acc.items() if k not in ("bufferView", "byteOffset", "sparse")}
        acc["bufferView"] = len(self.doc["bufferViews"]) - 1
        acc["count"] = int(array.shape[0])
        if "min" in acc and src_acc["type"] in ("VEC3", "VEC2", "SCALAR") and array.dtype == np.float32:
            acc["min"], acc["max"] = array.min(axis=0).tolist(), array.max(axis=0).tolist()
        self.doc["accessors"].append(acc)
        return len(self.doc["accessors"]) - 1

    def binary(self):
        out = b"".join(self.chunks)
        return out + b"\0" * ((-len(out)) % 4)


def save(path, doc, binary):
    doc["buffers"][0]["byteLength"] = len(binary)
    text = json.dumps(doc, separators=(",", ":")).encode("utf-8")
    text += b" " * ((-len(text)) % 4)
    total = 12 + 8 + len(text) + 8 + len(binary)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(text), 0x4E4F534A) + text)
        f.write(struct.pack("<II", len(binary), 0x004E4942) + binary)


def main(a_path, b_path, out_path):
    A, abin = load(a_path)
    B, bbin = load(b_path)
    w = Writer(A, abin)
    an = {n.get("name"): i for i, n in enumerate(A["nodes"])}
    bn = {n.get("name"): i for i, n in enumerate(B["nodes"])}
    assert not any(f in an for f in FEET), "the game GLB already has foot bones"
    askin, bskin = A["skins"][0], B["skins"][0]
    a_ibm = read(A, abin, askin["inverseBindMatrices"])
    b_ibm = read(B, bbin, bskin["inverseBindMatrices"])
    b_joint_names = [B["nodes"][j]["name"] for j in bskin["joints"]]

    # 1. The bones: new nodes under A's shins, appended to the skin.
    for name in FEET:
        node = {k: v for k, v in B["nodes"][bn[name]].items() if k != "children"}
        A["nodes"].append(node)
        an[name] = len(A["nodes"]) - 1
    for name in FEET:
        parent = next(B["nodes"][i]["name"] for i, n in enumerate(B["nodes"]) if bn[name] in n.get("children", []))
        A["nodes"][an[parent]].setdefault("children", []).append(an[name])
    new_ibm = [b_ibm[b_joint_names.index(name)] for name in FEET]
    askin["joints"] = askin["joints"] + [an[name] for name in FEET]
    askin["inverseBindMatrices"] = w.add(np.vstack([a_ibm] + new_ibm).astype(np.float32),
                                         A["accessors"][askin["inverseBindMatrices"]])
    a_joint_index = {A["nodes"][j]["name"]: i for i, j in enumerate(askin["joints"])}
    # B's joint index -> A's.
    remap = np.array([a_joint_index[n] for n in b_joint_names], np.uint16)
    feet_b = [b_joint_names.index(n) for n in FEET]

    a_mat = {m["name"]: i for i, m in enumerate(A["materials"])}

    def mat_name(doc, prim):
        return doc["materials"][prim["material"]]["name"] if "material" in prim else None

    report = []
    # 2. The shoes: B's meshes in place of A's.
    for name, bi in bn.items():
        if not name or not name.startswith(SHOE) or "mesh" not in B["nodes"][bi]:
            continue
        bnode, anode = B["nodes"][bi], A["nodes"][an[name]]
        bmesh = B["meshes"][bnode["mesh"]]
        prims = []
        for bp in bmesh["primitives"]:
            m = mat_name(B, bp)
            assert m in a_mat, f"{name}: material {m} isn't in the game GLB"
            ap = {"attributes": {}, "material": a_mat[m]}
            if "mode" in bp:
                ap["mode"] = bp["mode"]
            for attr, idx in bp["attributes"].items():
                data = read(B, bbin, idx)
                if attr.startswith("JOINTS"):
                    data = remap[data.astype(np.int64)].astype(data.dtype)
                ap["attributes"][attr] = w.add(data, B["accessors"][idx], 34962)
            ap["indices"] = w.add(read(B, bbin, bp["indices"]).ravel(), B["accessors"][bp["indices"]], 34963)
            prims.append(ap)
        A["meshes"][anode["mesh"]] = {"name": bmesh["name"], "primitives": prims}
        if "extras" in bnode:
            anode["extras"] = bnode["extras"]
        report.append(f"{name}: {len(prims)} parts")
    # A shoe B no longer has: out of the scene (and its armature).
    for name, ai in an.items():
        if name and name.startswith(SHOE) and name not in bn:
            for n in A["nodes"]:
                if ai in n.get("children", []):
                    n["children"].remove(ai)
            for s in A["scenes"]:
                if ai in s["nodes"]:
                    s["nodes"].remove(ai)
            report.append(f"{name}: taken out")

    # 3. The feet's weights on every other skinned piece.
    for name, bi in bn.items():
        if not name or name.startswith(SHOE) or "mesh" not in B["nodes"][bi] or name not in an:
            continue
        if "mesh" not in A["nodes"][an[name]]:
            continue
        bmesh, amesh = B["meshes"][B["nodes"][bi]["mesh"]], A["meshes"][A["nodes"][an[name]]["mesh"]]
        a_by_mat = {mat_name(A, p): p for p in amesh["primitives"]}
        for bp in bmesh["primitives"]:
            if "JOINTS_0" not in bp["attributes"]:
                continue
            bj = read(B, bbin, bp["attributes"]["JOINTS_0"]).astype(np.int64)
            bw = read(B, bbin, bp["attributes"]["WEIGHTS_0"])
            on_feet = np.nonzero((np.isin(bj, feet_b) & (bw > 0)).any(axis=1))[0]
            if not len(on_feet):
                continue
            ap = a_by_mat.get(mat_name(B, bp))
            assert ap is not None, f"{name}/{mat_name(B, bp)} has feet weights in B but isn't in A"
            apos = read(A, abin, ap["attributes"]["POSITION"])
            bpos = read(B, bbin, bp["attributes"]["POSITION"])[on_feet]
            aj = read(A, abin, ap["attributes"]["JOINTS_0"])
            aw = read(A, abin, ap["attributes"]["WEIGHTS_0"])
            assert aw.dtype == np.float32, "the game's weights must be floats"
            # Every A point at a B foot point's place (a seam has several at one place).
            keys = {}
            for i, p in enumerate(np.round(apos / TOL).astype(np.int64)):
                keys.setdefault(tuple(p), []).append(i)
            hits, missing = 0, 0
            for k, p in zip(on_feet, np.round(bpos / TOL).astype(np.int64)):
                found = keys.get(tuple(p))
                if not found:
                    missing += 1
                    continue
                for i in found:
                    aj[i] = remap[bj[k]].astype(aj.dtype)
                    aw[i] = bw[k]
                    hits += 1
            ap["attributes"]["JOINTS_0"] = w.add(aj, A["accessors"][ap["attributes"]["JOINTS_0"]], 34962)
            ap["attributes"]["WEIGHTS_0"] = w.add(aw, A["accessors"][ap["attributes"]["WEIGHTS_0"]], 34962)
            report.append(f"{name}/{mat_name(B, bp)}: {hits} points to the feet, {missing} not found")
    save(out_path, A, w.binary())
    print("\n".join(report))


if __name__ == "__main__":
    main(*sys.argv[1:4])
