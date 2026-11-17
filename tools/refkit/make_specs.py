"""
Turn the raw ref measurements (ref/_measure/*.json, made by measure_body.py and measure_head.py) into one small,
readable Python file per ref in tools/blender/heroine/ref_specs/, plus the list of refs in _refs.py.

    python tools/refkit/make_specs.py

Plain Python, no Blender. The spec files hold measurements only: shares of stature, joint places, silhouettes and
face landmarks. No ref geometry, texture or UV is written, so they are safe to commit.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refs import REFS, TIGHT, PROFILE_BANDS, CACHE, SPECS, ANKLE  # noqa: E402

GRID = [round(0.30 + 0.01 * i, 2) for i in range(66)]          # 0.30 .. 0.95 of stature


def r4(v):
    return None if v is None else round(float(v), 4)


def interp(x, xs, ys):
    if x < xs[0] or x > xs[-1]:
        return None
    for i in range(1, len(xs)):
        if xs[i] >= x:
            t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]) if xs[i] != xs[i - 1] else 0.0
            return ys[i - 1] + (ys[i] - ys[i - 1]) * t
    return ys[-1]


def body_spec(folder, key):
    d = json.load(open(os.path.join(CACHE, f"m_{folder}.json")))
    H, L, J, A = d["H"], d["landmarks"], d["joints"], d["arm"]
    za = J["ankle"]["z"]
    Hb = (H - za) / (1 - ANKLE)                      # barefoot stature
    zb = lambda z: None if z is None else (z - za + ANKLE * Hb) / Hb
    s = lambda v: None if v is None else v / Hb
    lm = lambda k, f: s(L[k][f]) if L.get(k) else None
    ky = J["knee"]["y"]

    meta = {
        "folder": folder, "key": key, "file": d["file"],
        "stature_barefoot_m": r4(Hb), "heel_lift_cm": round((za - ANKLE * Hb) * 100, 1),
        "heads_tall": r4(Hb / d["head_h"]), "tris": d["tris"], "verts": d["verts"],
        "bones": (d.get("bones") or {}).get("total"),
        "skin_edge_median_mm": (d.get("skin_edge") or {}).get("median_mm"),
        "texture_maps": sorted({os.path.splitext(t)[0].rsplit("_", 1)[-1] for t in d.get("textures", {})}),
    }
    heights = {
        "chin": zb(L["chin"]), "nose_tip": zb(L.get("nose_tip")),
        "nipple": zb(L["bust"]["z"]) if L.get("bust") else None,
        "underbust": zb(L["underbust"]["z"]) if L.get("underbust") else None,
        "waist": zb(L["waist"]["z"]) if L.get("waist") else None,
        "hip_fullest": zb(L["hip"]["z"]) if L.get("hip") else None,
        "crotch": zb(L.get("crotch")),
        "neck_base_joint": zb(J["neck"]["z"]), "shoulder_joint": zb(J["shoulder"]["z"]),
        "hip_joint": zb(J["hip_joint"]["z"]), "knee_joint": zb(J["knee"]["z"]),
    }
    sizes = {
        "head_height": s(d["head_h"]), "head_width": s(L.get("head_w")), "head_depth": s(L.get("head_d")),
        "bust_girth": lm("bust", "girth"), "bust_depth": lm("bust", "d"),
        "underbust_girth": lm("underbust", "girth"),
        "waist_girth": lm("waist", "girth"), "waist_width": lm("waist", "w"), "waist_depth": lm("waist", "d"),
        "hip_girth": lm("hip", "girth"), "hip_width": lm("hip", "w"), "hip_depth": lm("hip", "d"),
        "thigh_girth": lm("thigh", "girth"), "knee_girth": lm("knee", "girth"), "calf_girth": lm("calf", "girth"),
        "ankle_girth": lm("ankle", "girth"), "foot_length": s(L.get("foot_len")),
        "neck_girth": lm("neck", "girth"),
        "upperarm_girth": s(A.get("upperarm_girth_mid")), "forearm_girth": s(A.get("forearm_girth_max")),
        "wrist_girth": s(A.get("wrist_girth")),
        "upperarm_length": s(A.get("upperarm_len")), "forearm_length": s(A.get("forearm_len")),
        "shoulder_joint_span": 2 * s(J["shoulder"]["x"]), "hip_joint_span": 2 * s(J["hip_joint"]["x"]),
        "shoulder_width_max": s(L["bideltoid_max_0.76_0.86"][0]) if L.get("bideltoid_max_0.76_0.86") else None,
    }
    # heights and sizes the ref may not vote on (clothes over that part)
    skip = sorted(k for k in list(heights) + list(sizes) if k in TIGHT and key not in TIGHT[k])
    joints = {k: (r4(s(j["x"])), r4(s(j["y"] - ky)), r4(zb(j["z"]))) for k, j in J.items()}
    joints["arm_angle_deg"] = round(A["arm_down_angle_deg"], 1) if "arm_down_angle_deg" in A else None

    P = d.get("profile") or []                     # [z, front y, back y, half width], every 0.5% of heeled H
    zs = [zb(p[0]) for p in P]
    prof = []
    for g in (GRID if P else []):
        f, b, h = (interp(g, zs, [p[i] for p in P]) for i in (1, 2, 3))
        if f is not None:
            prof.append((g, r4(s(f - ky)), r4(s(b - ky)), r4(s(h))))
    band = PROFILE_BANDS.get(key)
    return meta, {k: r4(v) for k, v in heights.items()}, {k: r4(v) for k, v in sizes.items()}, skip, joints, \
        prof, band


HEAD_FRAME = ("width_max", "width_max_no_ears", "depth_max", "eye_line_z", "eyeball_radius", "width_max_z",
              "depth_front_z", "depth_back_z")


def head_spec(key, heads):
    h = heads.get(key)
    if not h:
        return None
    fr = {k: r4(h["frame"][k]) for k in HEAD_FRAME if h["frame"].get(k) is not None}
    lms = {k: tuple(r4(x) for x in v) for k, v in h["landmarks"].items() if isinstance(v, list)}
    tab = {k: [r4(x) for x in h["tables"][k]] for k in ("front", "back", "half_width", "half_width_no_ears")}
    return fr, lms, tab


def fmt_dict(name, d, comment=None):
    out = [f"# {comment}"] if comment else []
    out.append(f"{name} = {{")
    for k, v in d.items():
        out.append(f"    {k!r}: {v!r},")
    out.append("}")
    return "\n".join(out)


def write(folder, key, mod, heads):
    meta, heights, sizes, skip, joints, prof, band = body_spec(folder, key)
    head = head_spec(key, heads)
    parts = [f'"""\n{key}: {folder}. Generated by tools/refkit/make_specs.py -- do not edit by hand.\n\n'
             "Measurements only (no ref geometry). Units: shares of BAREFOOT stature (heels taken out), heights\n"
             "from the floor; y is front (+) / back (-) measured from the knee joint; x is half the body width.\n"
             '"""',
             fmt_dict("META", meta),
             fmt_dict("HEIGHTS", heights, "heights of landmarks from the floor"),
             fmt_dict("SIZES", sizes, "girths (tape measure), widths, depths and lengths"),
             f"# heights and sizes this ref does NOT vote on: clothes cover that part\nSKIP = {skip!r}",
             fmt_dict("JOINTS", joints, "skeleton joints: (x, y, z); the refs stand in an A-pose, so elbow and wrist "
                                        "heights are not targets"),
             f"# silhouette without arms, every 1% of height: (height, front y, back y, half width)\n"
             f"# PROFILE_BAND: the heights where this ref's suit is tight enough to vote (None: never)\n"
             f"PROFILE_BAND = {band!r}\nPROFILE = [\n" + "\n".join(f"    {p!r}," for p in prof) + "\n]"]
    if head:
        fr, lms, tab = head
        parts += ["# ---- head and face: normalised by head height Hh (chin to crown)\n"
                  "# x = |x| from the midline, y = from the front of the face at the eye line (+ forward),"
                  " z = up from the chin",
                  fmt_dict("HEAD", fr),
                  fmt_dict("FACE", lms),
                  "# the head by level, 0 (chin) to 1 (crown) every 0.05 of Hh\n" + fmt_dict("HEAD_TABLES", tab)]
    else:
        parts.append("HEAD = None\nFACE = None\nHEAD_TABLES = None")
    with open(os.path.join(SPECS, mod + ".py"), "w", encoding="utf-8") as f:
        f.write("\n\n".join(parts) + "\n")


def main():
    os.makedirs(SPECS, exist_ok=True)
    hp = os.path.join(CACHE, "head_perref.json")
    heads = json.load(open(hp)) if os.path.exists(hp) else {}
    done = []
    for folder, (key, mod) in REFS.items():
        if not os.path.exists(os.path.join(CACHE, f"m_{folder}.json")):
            print("missing measurement, skipped:", folder)
            continue
        write(folder, key, mod, heads)
        done.append(mod)
        print("wrote", mod + ".py", "(with head)" if key in heads else "(no head measurement)")
    with open(os.path.join(SPECS, "_refs.py"), "w", encoding="utf-8") as f:
        f.write('"""Generated by tools/refkit/make_specs.py: the ref spec modules to load."""\n'
                f"MODULES = {done!r}\n")


if __name__ == "__main__":
    main()
