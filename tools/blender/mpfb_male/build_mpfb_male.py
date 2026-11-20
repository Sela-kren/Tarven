"""
The male's skin from MPFB (MakeHuman's base mesh, targets and default skin weights, all CC0), as the cache
art/male_mpfb.blend that build_world swaps in for his ring-built body (tools/blender/mpfb_male/mpfb_swap.py).

Run with the user's Blender profile (MPFB is an extension, so not --factory-startup):
    D:/blender/blender.exe -b --python tools/blender/mpfb_male/build_mpfb_male.py [-- --renders <folder>]

What it makes (object "MaleMPFB", facing +Y, feet on the ground, metres):
- One man: BASE's macros (a fit young adult whose joints sit where his rig's do).
- A shape key pair per physique slider, "<id>_p" (slider +1) and "<id>_n" (slider -1), from the macros' extremes
  and MPFB's detail targets (PHYSIQUE). The game sets them as glTF morph weights.
- Posed to his rig's rest: the arms turned down to MALE["splay"] (MPFB stands in an A-pose); every key posed too.
- Vertex groups for his 17 bones, summed from MPFB's default rig weights (WEIGHTS).
- Eyeballs (T_eye_m, irises T_iris_m) where MPFB's helper eyes are, moved by the keys with them; lips painted
  T_lip_m, brows T_hair_m, the rest T_skin.
- Empties "joint:<Bone>" at the joints his 17 bones take (JOINTS).
The keys are held still round his penis's root (the game works its root out on the CPU, where morphs don't reach).
"""
import gzip
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("TARVEN_ROOT", os.path.abspath(os.path.join(HERE, "..", "..", "..")))
OUT = os.path.join(ROOT, "art", "male_mpfb.blend")
MPFB = os.path.dirname(os.path.dirname(sys.modules[HumanService.__module__].__file__))
TARGETS = os.path.join(MPFB, "data", "targets")

RACE = {"asian": 0.2, "caucasian": 0.6, "african": 0.2}
# height 0.6 with proportions 0.8 puts his hips at 1.01 (rig 1.0), shoulders 1.5 (1.46), neck 1.61 (1.6).
BASE = dict(gender=1.0, age=0.5, muscle=0.6, weight=0.5, proportions=0.8, height=0.6, cupsize=0.5, firmness=0.5)
SPLAY = 0.257  # MALE["splay"]: his arms hang this far out from straight down, radians

# Each slider: (id, plus, minus). A side is {"macro": {name: value}} (the macro set there instead of BASE's) or
# {"targets": [(folder/name, weight), ...]} (MPFB detail targets on top of him), or None (the slider only goes one
# way). Age only goes older: younger than the base man (MakeHuman's 25) shrinks him towards a youth, never wanted.
PHYSIQUE = [
    ("muscle", {"macro": {"muscle": 1.0}}, {"macro": {"muscle": 0.0}}),
    ("fat", {"macro": {"weight": 1.0}}, {"macro": {"weight": 0.0}}),
    ("age", {"macro": {"age": 0.92}}, None),
    ("proportions", {"macro": {"proportions": 1.0}}, {"macro": {"proportions": 0.3}}),
    ("belly", {"targets": [("stomach/stomach-pregnant-incr", 0.8)]},
     {"targets": [("stomach/stomach-pregnant-decr", 1.0)]}),
    ("pecs", {"targets": [("torso/torso-muscle-pectoral-incr", 1.0)]},
     {"targets": [("torso/torso-muscle-pectoral-decr", 1.0)]}),
    ("shoulderWidth", {"targets": [("torso/measure-shoulder-dist-incr", 1.0)]},
     {"targets": [("torso/measure-shoulder-dist-decr", 1.0)]}),
    ("jaw", {"targets": [("chin/chin-width-incr", 1.0), ("chin/chin-bones-incr", 1.0)]},
     {"targets": [("chin/chin-width-decr", 1.0), ("chin/chin-bones-decr", 1.0)]}),
    ("chin", {"targets": [("chin/chin-prominent-incr", 1.0)]}, {"targets": [("chin/chin-prominent-decr", 1.0)]}),
    ("noseSize", {"targets": [("nose/nose-scale-horiz-incr", 1.0), ("nose/nose-scale-vert-incr", 1.0),
                              ("nose/nose-scale-depth-incr", 1.0)]},
     {"targets": [("nose/nose-scale-horiz-decr", 1.0), ("nose/nose-scale-vert-decr", 1.0),
                  ("nose/nose-scale-depth-decr", 1.0)]}),
    ("noseShape", {"targets": [("nose/nose-hump-incr", 1.0)]}, {"targets": [("nose/nose-hump-decr", 1.0)]}),
    ("brow", {"targets": [("forehead/forehead-trans-forward", 1.0), ("eyebrows/eyebrows-trans-down", 1.0)]},
     {"targets": [("forehead/forehead-trans-backward", 1.0), ("eyebrows/eyebrows-trans-up", 1.0)]}),
    ("cheeks", {"targets": [("cheek/l-cheek-bones-incr", 1.0), ("cheek/r-cheek-bones-incr", 1.0)]},
     {"targets": [("cheek/l-cheek-bones-decr", 1.0), ("cheek/r-cheek-bones-decr", 1.0)]}),
    ("headShape", {"targets": [("head/head-square", 1.0)]}, {"targets": [("head/head-oval", 1.0)]}),
    ("neck", {"targets": [("neck/measure-neck-circ-incr", 1.0)]}, {"targets": [("neck/measure-neck-circ-decr", 1.0)]}),
    # Heritage: MPFB's race blends, each all the way to one people from the base man's mix (RACE). The game picks a
    # skin tone to go with it.
    ("african", {"macro": {"race": {"african": 1.0, "asian": 0.0, "caucasian": 0.0}}}, None),
    ("asian", {"macro": {"race": {"african": 0.0, "asian": 1.0, "caucasian": 0.0}}}, None),
    ("caucasian", {"macro": {"race": {"african": 0.0, "asian": 0.0, "caucasian": 1.0}}}, None),
]
# The keys that reach his groin are held still within MASK[0] of his penis's root, fading back in by MASK[1].
MASK = (0.025, 0.075)
ROOT_DROP = 0.01
LIP = {"up": 0.0088, "low": 0.0105, "corner": 0.97}  # the lips' paint (see the lips in build())
# His brows: a strip laid on the skin over each eye, from BROW["inner"] (towards his middle, from the eye's middle)
# out to BROW["outer"], BROW["lift"] above the eye's middle (and "arch" more at its peak), "width" tall at the
# inner end tapering to "taper" of that at the outer, "off" proud of the skin.
BROW = {"inner": 0.016, "outer": 0.03, "lift": 0.017, "arch": 0.004, "fall": 0.004, "width": 0.0065,
        "taper": 0.45, "off": 0.0012, "steps": 10}

# MPFB default-rig bones -> his bones (first match of the name's start wins); anything left is Head (the face).
WEIGHTS = [
    (("root", "spine05", "spine04", "pelvis"), "Hips"),
    (("spine03", "spine02", "spine01", "clavicle", "breast"), "Torso"),
    (("shoulder01",), ("Torso", "UpperArm")),  # the deltoid's top: half each
    (("upperarm",), "UpperArm"),
    (("lowerarm", "wrist", "metacarpal", "finger1-1"), "ForeArm"),
    (("finger1",), "HandThumb"),
    (("finger2-1", "finger3-1", "finger4-1", "finger5-1"), "HandFingers"),
    (("finger",), "HandTips"),
    (("upperleg",), "Thigh"),
    (("lowerleg", "foot", "toe"), "Shin"),
]
SIDED = {"UpperArm", "ForeArm", "HandThumb", "HandFingers", "HandTips", "Thigh", "Shin"}

EYE = {"rings": 12, "segments": 20, "iris": 0.42}  # iris: its edge's angle off the eye's front, radians


def log(*a):
    print("[mpfb_male]", *a, flush=True)


def coords(obj):
    """The object's evaluated vertex positions (shape keys and modifiers in)."""
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = obj.evaluated_get(dg).data
    out = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", out)
    return out.reshape(-1, 3)


def human(macros):
    d = dict(BASE)
    d.update({k: v for k, v in macros.items() if k != "race"})
    d["race"] = dict(macros.get("race", RACE))
    return HumanService.create_human(mask_helpers=False, detailed_helpers=True, extra_vertex_groups=True,
                                     feet_on_ground=True, scale=0.1, macro_detail_dict=d)


def remove(obj):
    data = obj.data
    bpy.data.objects.remove(obj)
    if data is not None and data.users == 0 and isinstance(data, bpy.types.Mesh):
        bpy.data.meshes.remove(data)


def target_vertices(name):
    """The base-mesh vertex indices an MPFB target moves."""
    with gzip.open(os.path.join(TARGETS, name + ".target.gz"), "rt") as f:
        return {int(line.split()[0]) for line in f if line.strip() and not line.startswith("#")}


def side_coords(base_obj, base, side):
    """His vertex positions with one side of a slider put in."""
    if "macro" in side:
        h = human(side["macro"])
        try:
            X = coords(h)
        finally:
            remove(h)
        # create_human stands each man on the ground; keep the macros' changes about his own feet.
        return X
    names = []
    for name, weight in side["targets"]:
        key_name = "tmp_" + name.replace("/", "_")
        TargetService.load_target(base_obj, os.path.join(TARGETS, name + ".target.gz"), weight=weight, name=key_name)
        names.append(key_name)
    X = coords(base_obj)
    keys = base_obj.data.shape_keys.key_blocks
    for key_name in names:
        base_obj.shape_key_remove(keys[key_name])
    return X


def group_members(obj, name):
    gi = obj.vertex_groups[name].index
    return np.array([v.index for v in obj.data.vertices if any(g.group == gi and g.weight > 0 for g in v.groups)])


def pose_arms(rig):
    """Turns each arm down from MPFB's A-pose to hang SPLAY out from straight down, upper arm then forearm."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for side, sx in (("L", 1), ("R", -1)):  # MPFB's left is +x (he faces -Y)
        target = Vector((sx * math.sin(SPLAY), 0.0, -math.cos(SPLAY)))
        for bone, tip in ((f"upperarm01.{side}", f"lowerarm01.{side}"), (f"lowerarm01.{side}", f"wrist.{side}")):
            bpy.context.view_layer.update()
            pb, pt = rig.pose.bones[bone], rig.pose.bones[tip]
            head, end = pb.head.copy(), pt.head.copy()
            turn = (end - head).normalized().rotation_difference(target).to_matrix().to_4x4()
            pivot = Matrix.Translation(head)
            pb.matrix = pivot @ turn @ pivot.inverted() @ pb.matrix
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")


def our_bone(mpfb_name):
    stem, _, side = mpfb_name.partition(".")
    for starts, ours in WEIGHTS:
        if stem.startswith(starts):
            break
    else:
        ours = "Head"
    ours = ours if isinstance(ours, tuple) else (ours,)
    return [(f"{b}_{side}" if b in SIDED and side else b, 1.0 / len(ours)) for b in ours]


def eyeball(name, centre, radius, materials):
    """A UV sphere looking along +Y, the cap round its front the iris."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=EYE["segments"], v_segments=EYE["rings"], radius=radius)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, "X"))  # poles on Y
    for f in bm.faces:
        c = f.calc_center_median()
        f.material_index = 1 if c.normalized().y > math.cos(EYE["iris"]) else 0
        f.smooth = True
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(centre))
    bm.to_mesh(me)
    bm.free()
    for mat in materials:
        me.materials.append(mat)
    return me


def brow(body, side, eye, skin, deltas, mat):
    """One brow strip over the eye at `eye` (his left is -x), laid on the skin and joined into `body`."""
    from mathutils.bvhtree import BVHTree
    from mathutils import kdtree
    me = body.data
    n = len(skin)
    tree = BVHTree.FromPolygons([Vector(p) for p in skin], [tuple(p.vertices) for p in me.polygons
                                                             if max(p.vertices) < n])
    out = -1.0 if side == "L" else 1.0
    pts = []
    for i in range(BROW["steps"] + 1):
        t = i / BROW["steps"]
        x = eye[0] + out * (-BROW["inner"] + (BROW["inner"] + BROW["outer"]) * t)
        z = eye[2] + BROW["lift"] + BROW["arch"] * math.sin(math.pi * min(1.0, t * 1.4)) - BROW["fall"] * t * t
        half = BROW["width"] * (1 - (1 - BROW["taper"]) * t) / 2
        row = []
        for dz in (half, -half):
            hit = tree.ray_cast(Vector((x, eye[1] + 0.2, z + dz)), Vector((0, -1, 0)))
            loc, normal = hit[0], hit[1]
            row.append(np.array(loc + normal * BROW["off"]))
        pts.append(row)
    verts = [p for row in pts for p in row]
    faces = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(BROW["steps"])]
    if side == "L":  # face out (+Y) on both sides
        faces = [f[::-1] for f in faces]
    bme = bpy.data.meshes.new(f"Brow_{side}")
    bme.from_pydata([tuple(v) for v in verts], [], faces)
    bme.materials.append(mat)
    for p in bme.polygons:
        p.use_smooth = True
    bo = bpy.data.objects.new(f"Brow_{side}", bme)
    bpy.context.scene.collection.objects.link(bo)
    kd = kdtree.KDTree(len(skin))
    for i, p in enumerate(skin):
        kd.insert(Vector(p), i)
    kd.balance()
    nearest = [kd.find(Vector(v))[1] for v in verts]
    bo.shape_key_add(name="Basis")
    V = np.array(verts)
    for name, d in deltas.items():
        k = bo.shape_key_add(name=name, from_mix=False)
        k.data.foreach_set("co", (V + d[nearest]).ravel())
    g = bo.vertex_groups.new(name="Male_Head")
    g.add(list(range(len(verts))), 1.0, "REPLACE")
    bpy.ops.object.select_all(action="DESELECT")
    bo.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()


def material(name, colour):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1.0)
    return mat


def build(renders=None):
    bpy.ops.wm.read_homefile(use_empty=True)
    log("base man", BASE)
    b = human({})
    n = len(b.data.vertices)
    base = coords(b)

    # The sliders' sides, unposed: positions with each side in.
    sides = {}
    body_v = group_members(b, "body")
    tall = float(base[body_v, 2].max())
    for sid, plus, minus in PHYSIQUE:
        for suffix, side in (("_p", plus), ("_n", minus)):
            if side is None:
                continue
            X = side_coords(b, base, side)
            assert X.shape == base.shape, (sid, X.shape)
            if "macro" in side:
                # The macros change his height too (age, the peoples); his height is the game's own slider, and
                # his bones don't follow a morph: scaled back to the base man's height about his feet.
                X = X * (tall / float(X[body_v, 2].max()))
            sides[sid + suffix] = X
            log("key", sid + suffix, "moves up to", round(float(np.abs(X - base).max()), 4))

    # Rig him at the base shape, then freeze that shape: his own keys go on top.
    rig = HumanService.add_builtin_rig(b, "default", import_weights=True)
    for o in (b,):
        if o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:
                k.value = 0.0
            o.shape_key_clear()
    b.data.vertices.foreach_set("co", base.ravel())
    b.data.update()
    b.shape_key_add(name="Basis")
    for name, X in sides.items():
        k = b.shape_key_add(name=name)
        k.data.foreach_set("co", X.ravel())
        k.value = 0.0

    # His penis's root: the front of his skin at the middle, at the height of his hip joints less ROOT_DROP (the
    # old body's root sat 5 mm above its hip joints, at the top of the pubis; MPFB's pubis is lower on him).
    skin = group_members(b, "body")
    S = base[skin]
    hip_z = float(np.mean([rig.data.bones[f"upperleg01.{s}"].head_local.z for s in ("L", "R")]))
    near = S[(np.abs(S[:, 0]) < 0.012) & (np.abs(S[:, 2] - (hip_z - ROOT_DROP)) < 0.012)]
    root = near[np.argmin(near[:, 1])]  # MPFB faces -Y
    d = np.linalg.norm(base - root, axis=1)
    t = np.clip((d - MASK[0]) / (MASK[1] - MASK[0]), 0, 1)
    hold = t * t * (3 - 2 * t)
    face = {sid for sid, plus, _ in PHYSIQUE if "targets" in plus and plus["targets"][0][0].split("/")[0]
            in ("chin", "nose", "forehead", "eyebrows", "cheek", "head", "neck")}

    # Pose: arms down. Then every key posed alone.
    pose_arms(rig)
    keys = b.data.shape_keys.key_blocks
    posed_base = coords(b)
    posed = {}
    for name in sides:
        keys[name].value = 1.0
        delta = coords(b) - posed_base
        keys[name].value = 0.0
        if name.rsplit("_", 1)[0] not in face:
            delta *= hold[:, None]
        posed[name] = delta
    # Joints from the posed rig (MPFB names), in its own space.
    bpy.context.view_layer.update()
    pj = {pb.name: rig.matrix_world @ pb.head for pb in rig.pose.bones}

    # The kept surface: the body, and the helper eyes for the eyeballs.
    body_idx = group_members(b, "body")
    eyes = {side: group_members(b, f"helper-{side.lower()}-eye") for side in ("L", "R")}
    # Weights per vertex from MPFB's bone groups, summed into his bones.
    names = {g.index: g.name for g in b.vertex_groups}
    rig_bones = set(rig.data.bones.keys())
    ours = {}
    for v in b.data.vertices:
        w = {}
        for g in v.groups:
            gname = names[g.group]
            if gname in rig_bones and g.weight > 0:
                for bone, share in our_bone(gname):
                    w[bone] = w.get(bone, 0.0) + g.weight * share
        ours[v.index] = w

    flip = np.array([-1.0, -1.0, 1.0])  # turn him round to face +Y (and his left to -x, as the game's _L)

    def turned(p):
        return np.asarray(p) * flip

    # Build the kept mesh.
    keep = np.zeros(n, bool)
    keep[body_idx] = True
    src = b.data
    old_to_new = -np.ones(n, int)
    old_to_new[np.nonzero(keep)[0]] = np.arange(keep.sum())
    faces, face_src = [], []
    for p in src.polygons:
        vs = list(p.vertices)
        if all(keep[i] for i in vs):
            faces.append([int(old_to_new[i]) for i in vs])
            face_src.append(p.index)
    kept = np.nonzero(keep)[0]
    me = bpy.data.meshes.new("MaleMPFB")
    me.from_pydata([tuple(turned(posed_base[i])) for i in kept], [], faces)
    me.update()
    # UVs from MPFB's map.
    uv_src = src.uv_layers.active
    uv = me.uv_layers.new(name="UVMap")
    li = 0
    for fi, p in zip(face_src, me.polygons):
        sp = src.polygons[fi]
        for k in range(sp.loop_total):
            uv.data[p.loop_start + k].uv = uv_src.data[sp.loop_start + k].uv
    obj = bpy.data.objects.new("MaleMPFB", me)
    bpy.context.scene.collection.objects.link(obj)

    # Materials: skin, lips, brows; eyes come as their own mesh joined below.
    mats = {nm: material(nm, c) for nm, c in (
        ("T_skin", (0.78, 0.58, 0.46)), ("T_lip_m", (0.62, 0.36, 0.33)), ("T_hair_m", (0.2, 0.13, 0.08)),
        ("T_eye_m", (0.95, 0.95, 0.93)), ("T_iris_m", (0.25, 0.4, 0.55)))}
    for nm in ("T_skin", "T_lip_m", "T_hair_m", "T_eye_m", "T_iris_m"):
        me.materials.append(mats[nm])
    # The lips: the two lip targets reach well past them (into the mouth, down the chin), so only a band either
    # side of the mouth's line where they meet, LIP["up"] tall over it and LIP["low"] under, narrowing to the corners.
    low_v = target_vertices("mouth/mouth-lowerlip-volume-incr")
    up_v = target_vertices("mouth/mouth-upperlip-volume-incr")
    lip_v = low_v | up_v
    meet = np.array(sorted(low_v & up_v))
    M = posed_base[meet]
    corner = float(np.abs(M[:, 0]).max()) * LIP["corner"]
    order = np.argsort(M[:, 0])
    line = lambda x: np.interp(x, M[order, 0], M[order, 2])
    for fi, p in zip(face_src, me.polygons):
        p.use_smooth = True
        vs = src.polygons[fi].vertices
        if not all(i in lip_v for i in vs):
            continue
        cx, cz = (float(c) for c in np.mean([posed_base[i] for i in vs], axis=0)[[0, 2]])
        u = abs(cx) / corner
        if u >= 1:
            continue
        env = (1 - u * u) ** 0.5
        dz = cz - float(line(cx))
        if (dz >= 0 and dz <= LIP["up"] * env ** 0.7) or (dz < 0 and -dz <= LIP["low"] * env ** 0.8):
            p.material_index = 1

    # Shape keys on the kept mesh.
    obj.shape_key_add(name="Basis")
    for name, delta in posed.items():
        k = obj.shape_key_add(name=name, from_mix=False)
        k.data.foreach_set("co", np.array([turned(posed_base[i] + delta[i]) for i in kept]).ravel())
        k.value = 0.0

    # Weights.
    groups = {}
    for i_new, i_old in enumerate(kept):
        w = ours[i_old]
        total = sum(w.values())
        if total <= 0:
            w, total = {"Hips": 1.0}, 1.0
        for bone, weight in w.items():
            g = groups.get(bone) or obj.vertex_groups.new(name=f"Male_{bone}")
            groups[bone] = g
            g.add([i_new], weight / total, "REPLACE")

    # Brows: strips laid on his skin, each corner moved by the keys as the nearest skin corner is.
    skin_now = np.array([turned(posed_base[i]) for i in kept])
    skin_delta = {name: np.array([turned(delta[i]) for i in kept]) for name, delta in posed.items()}
    for side, idx in eyes.items():
        brow(obj, side, turned(posed_base[idx].mean(0)), skin_now, skin_delta, mats["T_hair_m"])

    # Eyeballs, moved by the keys with the helper eyes' middles (and scaled with their size).
    for side, idx in eyes.items():
        P = posed_base[idx]
        centre = P.mean(0)
        radius = float(np.linalg.norm(P - centre, axis=1).mean())
        eme = eyeball(f"Eye_{side}", turned(centre), radius, [mats["T_eye_m"], mats["T_iris_m"]])
        eo = bpy.data.objects.new(f"Eye_{side}", eme)
        bpy.context.scene.collection.objects.link(eo)
        local = np.array([v.co[:] for v in eme.vertices]) - turned(centre)
        eo.shape_key_add(name="Basis")
        for name, delta in posed.items():
            Q = P + delta[idx]
            c2 = Q.mean(0)
            r2 = float(np.linalg.norm(Q - c2, axis=1).mean())
            k = eo.shape_key_add(name=name, from_mix=False)
            k.data.foreach_set("co", (local * (r2 / radius) + turned(c2)).ravel())
        g = eo.vertex_groups.new(name="Male_Head")
        g.add(list(range(len(eme.vertices))), 1.0, "REPLACE")
        bpy.ops.object.select_all(action="DESELECT")
        eo.select_set(True)
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.join()

    # His joints, as the game's bones take them.
    def mean(*names):
        return turned(np.mean([np.array(pj[x]) for x in names], axis=0))

    joints = {}
    hip_z = float(np.mean([pj["upperleg01.L"].z, pj["upperleg01.R"].z]))
    joints["Hips"] = (0.0, float(turned(pj["upperleg01.L"])[1]), hip_z + 0.06)
    joints["Torso"] = tuple(mean("spine03"))
    joints["Head"] = tuple(mean("neck01"))
    for side in ("L", "R"):
        s = side
        joints[f"UpperArm_{side}"] = tuple(mean(f"upperarm01.{s}"))
        joints[f"ForeArm_{side}"] = tuple(mean(f"lowerarm01.{s}"))
        joints[f"HandFingers_{side}"] = tuple(mean(*[f"finger{f}-1.{s}" for f in (2, 3, 4, 5)]))
        joints[f"HandTips_{side}"] = tuple(mean(*[f"finger{f}-2.{s}" for f in (2, 3, 4, 5)]))
        joints[f"HandThumb_{side}"] = tuple(mean(f"finger1-2.{s}"))
        joints[f"Thigh_{side}"] = tuple(mean(f"upperleg01.{s}"))
        joints[f"Shin_{side}"] = tuple(mean(f"lowerleg01.{s}"))
        # No bones of the game's own, but the fit lays his limbs' segments on them.
        joints[f"Wrist_{side}"] = tuple(mean(f"wrist.{s}"))
        joints[f"Ankle_{side}"] = tuple(mean(f"foot.{s}"))
    for bone, p in joints.items():
        e = bpy.data.objects.new(f"joint:{bone}", None)
        e.location = p
        e.empty_display_size = 0.02
        bpy.context.scene.collection.objects.link(e)
    root_t = turned(root)
    e = bpy.data.objects.new("joint:PenisRoot", None)
    e.location = tuple(root_t)
    bpy.context.scene.collection.objects.link(e)
    log("joints", {k: tuple(round(c, 3) for c in v) for k, v in joints.items()})
    log("penis root", tuple(round(float(c), 3) for c in root_t))

    # Clean up MPFB's own objects; keep only ours.
    for o in list(bpy.data.objects):
        if o is not obj and not o.name.startswith("joint:"):
            remove(o)
    obj["mpfb_base"] = str(BASE)
    obj["physique"] = ",".join(sid for sid, _, _ in PHYSIQUE)
    log("verts", len(obj.data.vertices), "faces", len(obj.data.polygons), "keys", len(obj.data.shape_keys.key_blocks) - 1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
    log("saved", OUT)
    if renders:
        render_sheets(obj, renders)


def render_sheets(obj, folder):
    """Front/side/back of the base man, then a strip per slider: -1, 0, +1."""
    os.makedirs(folder, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "MATERIAL"
    sc.display.shading.show_cavity = True
    sc.world = sc.world or bpy.data.worlds.new("w")
    cd = bpy.data.cameras.new("cam")
    cd.type = "ORTHO"
    cam = bpy.data.objects.new("cam", cd)
    sc.collection.objects.link(cam)
    sc.camera = cam
    keys = obj.data.shape_keys.key_blocks

    def shoot(path, centre, scale, angle, res=(700, 1000)):
        sc.render.resolution_x, sc.render.resolution_y = res
        cd.ortho_scale = scale
        a = math.radians(angle)
        d = Vector((math.sin(a), math.cos(a), 0.0))  # angle 0: the camera in front (+Y), looking back at him
        cam.location = Vector(centre) + d * 6
        cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = path
        bpy.ops.render.render(write_still=True)

    for nm, ang in (("front", 0), ("side", 90), ("back", 180)):
        shoot(os.path.join(folder, f"base_{nm}.png"), (0, 0, 0.93), 2.0, ang)
    copies = []
    for sid in obj["physique"].split(","):
        is_face = sid in ("jaw", "chin", "noseSize", "noseShape", "brow", "cheeks", "headShape", "neck", "african", "asian", "caucasian")
        for i, v in enumerate((-1, 0, 1)):
            for k in keys[1:]:
                k.value = 0.0
            key = keys.get(f"{sid}_{'p' if v > 0 else 'n'}") if v else None
            if key:
                key.value = 1.0
            ang = 30 if is_face else 0
            centre = (0, 0, 1.7) if is_face else (0, 0, 0.93)
            shoot(os.path.join(folder, f"slider_{sid}_{i}.png"), centre, 0.38 if is_face else 2.0, ang,
                  (500, 500) if is_face else (500, 1000))
    for k in keys[1:]:
        k.value = 0.0


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    renders = argv[argv.index("--renders") + 1] if "--renders" in argv else None
    build(renders)
