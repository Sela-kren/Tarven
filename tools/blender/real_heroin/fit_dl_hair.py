"""
Fit downloaded hair meshes (FBX) onto her head as her hairstyles, skinned like the game wants.

For each style in STYLES:
  - import the FBX, keep its meshes (joined), turn it so its front faces +Y (hers);
  - scale and move it so the inside of its crown hugs her skull (OFF over it):
      "axes": per-axis scale from the crown's width and depth (a style with nothing behind the crown, the bob);
      "width": one scale from the crown's width, the crown's top centre over her skull's (a ponytail sticks out
      behind, so its depth can't be used);
  - push every point in or too near her skin back out (PUSH), and lift the hair over her ears in one smooth swell;
  - bake its strand texture (grey or coloured, plus alpha) tinted to her hair colour, so it shows her colour as it
    is and the game's dye re-tints it (PAINTED_MAPS in appearance.ts);
  - skin it: to her head bone, or with the weights of an old style of hers (nearest point), so a tail sways.
Old Female_Hair* objects not in STYLES are removed (REMOVE_OLD).

Run on a COPY of the master (or the master itself, once agreed):
blender -b copy.blend -P tools/blender/real_heroin/fit_dl_hair.py -- <downloads dir> [out.blend]
"""
import bpy, sys, os, math
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

A = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
DL = A[0] if A else globals()["DL"]
OUT = A[1] if len(A) > 1 else None
REMOVE_OLD = globals().get("REMOVE_OLD", True)

# fbx / textures are relative to DL (the folder the downloads were unpacked into).
STYLES = [
    dict(name="Swept", mat="swept", label="Swept bob", fbx="dl_bob/source/Short Hair.fbx", color="dl_bob/textures/Hair1_diff.png",
         turn=180, fit="axes", weights=None),
    dict(name="Ponytail", mat="ponytail", label="Long ponytail", fbx="dl_voluminous-long-ponytail-with-bones/source/Brown Ponytail.fbx",
         color="dl_voluminous-long-ponytail-with-bones/textures/Part1_diff.png",
         turn=180, fit="width", weights="Female_HairPonytail"),
    dict(name="Artemis", mat="artemis", label="Side-bang ponytail",
         fbx="dl_artemis_inner/Hair - Artemis (Free) by continuumreed/artemishair.fbx",
         color="dl_artemis_inner/Hair - Artemis (Free) by continuumreed/artemishair_diff_color2.png",
         alpha="dl_artemis_inner/Hair - Artemis (Free) by continuumreed/artemishair_diff_alpha.jpg",
         turn=None, fit="width", weights="Female_HairTail"),
    # her default (Female_Hair) since 2026-11-21. Its FBX holds the mesh with no object round it: Y up, facing -Z
    # (up="Y", turn 180). tilt (about X) picked by the user from renders (10); tipped further, the bangs cover her eyes.
    dict(name="", mat="wolf", label="Wolf cut", fbx="dl_wolf/source/CN_IP_MSP_M_HAIR_1.fbx",
         color="dl_wolf/textures/CN_IP_MSP_M_HAIR_1_Albedo.png", up="Y", tilt=10,
         # made for a bigger head: size and place found by a search of size, tilt, height and depth for the least of
         # it inside her head (0.70: 9 % inside before the push-out; 0.75: 4 %)
         turn=180, fit="search", s=0.72, dz=0.025, dy=0.015, weights=None),
]
STYLES = globals().get("STYLES_OVERRIDE", STYLES)
ONLY = globals().get("ONLY")        # fit just these names (others left as they are)
TWEAK = globals().get("TWEAK", {})  # name -> dict(scale=(x,y,z), y=.., z=..)

OFF = 0.010          # crown of the hair this far over her skull top (m)
CAP = 0.30           # "axes": top fraction of the hair's height used as its crown
CAP_W = 0.39         # "width": the crown is this much of the hair's width deep
SKULL_Z = 0.075      # her skull cap: this far down from the top of her head
PUSH = 0.003         # no hair point nearer her skin than this
SEARCH_INSIDE = 0.03 # "search" fit: grown until less than this share of its points is inside her head
TEX = 1024           # baked strand texture size
MAT = "T_hair_f_{}"  # material per style: T_hair_f_swept, T_hair_f_ponytail, ...

ARM = bpy.data.objects["Female_Armature"]
BODY = bpy.data.objects["Female_Body"]
HEAD_BONE = "Female_Head"
_pb = ARM.pose.bones[HEAD_BONE]
TO_REST = ARM.matrix_world.inverted() @ (ARM.matrix_world @ _pb.matrix @ _pb.bone.matrix_local.inverted() @ ARM.matrix_world.inverted()).inverted()

dg = bpy.context.evaluated_depsgraph_get()
bme = BODY.evaluated_get(dg).to_mesh()
bw = BODY.matrix_world
BV = [bw @ v.co for v in bme.vertices]
BT = BVHTree.FromPolygons(BV, [tuple(p.vertices) for p in bme.polygons])
TOP = max(p.z for p in BV)
_cap = [p for p in BV if p.z > TOP - SKULL_Z]
SK_LO = Vector((min(p.x for p in _cap), min(p.y for p in _cap), TOP - SKULL_Z))
SK_HI = Vector((max(p.x for p in _cap), max(p.y for p in _cap), TOP))
_crown = [p for p in BV if p.z > TOP - 0.012]
SK_CROWN_Y = sum(p.y for p in _crown) / len(_crown)


def hair_tint():
    """Her hair colour as it is (as stored, sRGB): the mean of art/textures/T_hair_f.png."""
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    path = os.path.join(root, "art", "textures", "T_hair_f.png")
    if not os.path.exists(path):
        return np.array([0.075, 0.059, 0.059])
    im = bpy.data.images.load(path, check_existing=False)
    px = np.array(im.pixels[:]).reshape(-1, 4)
    bpy.data.images.remove(im)
    return px[:, :3].mean(axis=0)


TINT = hair_tint()


def bake_texture(style):
    """The style's strands as one RGBA image: their brightness (from its colour map) times her hair colour, scaled so
    the strands average her colour; alpha from the colour map's own, or a separate alpha map."""
    col = bpy.data.images.load(os.path.join(DL, style["color"]), check_existing=False)
    col.scale(TEX, TEX)
    px = np.array(col.pixels[:]).reshape(-1, 4)
    bpy.data.images.remove(col)
    if style.get("alpha"):
        al = bpy.data.images.load(os.path.join(DL, style["alpha"]), check_existing=False)
        al.scale(TEX, TEX)
        a = np.array(al.pixels[:]).reshape(-1, 4)[:, :3].mean(axis=1)
        bpy.data.images.remove(al)
    else:
        a = px[:, 3]
    lum = px[:, :3] @ np.array([0.2126, 0.7152, 0.0722])
    seen = a > 0.5
    mean = lum[seen].mean() if seen.any() else lum.mean()
    rgb = np.clip(lum[:, None] / max(mean, 1e-4) * TINT[None, :], 0, 1)
    name = MAT.format(style["mat"])
    img = bpy.data.images.get(name)
    if img is None or tuple(img.size) != (TEX, TEX):
        if img:
            bpy.data.images.remove(img)
        img = bpy.data.images.new(name, TEX, TEX, alpha=True)
    img.colorspace_settings.name = "sRGB"
    # byte images' pixels are their stored (sRGB) values, the maps' and her colour's alike, so no conversion
    out = np.concatenate([rgb, a[:, None]], axis=1)
    img.pixels.foreach_set(out.ravel().astype(np.float32))
    img.update()
    img.pack()
    return img


def material(style, img):
    """Strand texture, cut out at alpha 0.5 (glTF MASK), both sides drawn."""
    name = MAT.format(style["mat"])
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tx = nt.nodes.new("ShaderNodeTexImage")
    tx.image = img
    # glTF exporter reads Round(alpha) as alpha clip at 0.5
    rnd = nt.nodes.new("ShaderNodeMath"); rnd.operation = "ROUND"
    nt.links.new(tx.outputs["Color"], bs.inputs["Base Color"])
    nt.links.new(tx.outputs["Alpha"], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], bs.inputs["Alpha"])
    bs.inputs["Roughness"].default_value = 0.6
    nt.links.new(bs.outputs[0], out.inputs[0])
    mat.diffuse_color = (*[c ** 2.2 for c in TINT], 1)
    try:
        mat.surface_render_method = "DITHERED"
    except Exception:
        mat.blend_method = "CLIP"
    mat.use_backface_culling = False
    return mat


def import_mesh(style):
    before = set(bpy.data.objects)
    before_me = set(bpy.data.meshes)
    bpy.ops.import_scene.fbx(filepath=os.path.join(DL, style["fbx"]))
    new = set(bpy.data.objects) - before
    meshes = [(o.data, o.matrix_world) for o in new if o.type == "MESH"]
    if not meshes:
        # some FBX files hold the mesh with no object round it: take the mesh as it is
        meshes = [(m, Matrix.Identity(4)) for m in set(bpy.data.meshes) - before_me]
    joined = bpy.data.meshes.new("dl_hair")
    import bmesh
    bm = bmesh.new()
    for data, mw in meshes:
        me = data.copy()
        me.transform(mw)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    bm.to_mesh(joined)
    bm.free()
    for o in new:
        bpy.data.objects.remove(o, do_unlink=True)
    for m in set(bpy.data.meshes) - before_me:
        if m is not joined and m.users == 0:
            bpy.data.meshes.remove(m)
    if style.get("up") == "Y":
        joined.transform(Matrix.Rotation(math.radians(90 + style.get("tilt", 0)), 4, "X"))
    turn = style["turn"]
    if turn is None:
        # the tail hangs at the back: turn so the lowest points are behind her (-Y)
        V = np.array([tuple(v.co) for v in joined.vertices])
        low = V[V[:, 2] < np.quantile(V[:, 2], 0.2)]
        turn = 180 if low[:, 1].mean() > V[:, 1].mean() else 0
    if turn:
        joined.transform(Matrix.Rotation(math.radians(turn), 4, "Z"))
    return joined


def place(me, style):
    V = [v.co for v in me.vertices]
    hz0, hz1 = min(p.z for p in V), max(p.z for p in V)
    tw = TWEAK.get(style["name"], {})
    if style["fit"] == "axes":
        hcap = [p for p in V if p.z > hz1 - (hz1 - hz0) * CAP]
        h_lo = Vector((min(p.x for p in hcap), min(p.y for p in hcap)))
        h_hi = Vector((max(p.x for p in hcap), max(p.y for p in hcap)))
        sx = (SK_HI.x - SK_LO.x + 2 * OFF) / (h_hi.x - h_lo.x)
        sy = (SK_HI.y - SK_LO.y + 2 * OFF) / (h_hi.y - h_lo.y)
        sz = (sx + sy) / 2
        hcy = (h_lo.y + h_hi.y) / 2
        ty = (SK_LO.y + SK_HI.y) / 2
    else:
        width = max(p.x for p in V) - min(p.x for p in V)
        hcap = [p for p in V if p.z > hz1 - width * CAP_W]
        sx = (SK_HI.x - SK_LO.x + 2 * OFF) / (max(p.x for p in hcap) - min(p.x for p in hcap))
        sy = sz = sx
        crown = [p for p in V if p.z > hz1 - width * 0.06]
        hcy = sum(p.y for p in crown) / len(crown)
        ty = SK_CROWN_Y
    hcx = (max(p.x for p in V) + min(p.x for p in V)) / 2
    if style["fit"] == "search":
        # shaggy hair: flicks stick out past its scalp, so its outline says nothing of its size. Its top is where
        # most of it ends (not the highest flick), and it is grown from the "width" guess until next to none of it
        # is inside her head.
        hz1 = float(np.quantile([p.z for p in V], 0.995))
        crown = [p for p in V if p.z > hz1 - (hz1 - hz0) * 0.05]
        hcy = sum(p.y for p in crown) / len(crown)
        ty = SK_CROWN_Y
        sample = V[:: max(1, len(V) // 2000)]
        base = sx
        for f in ([style["s"] / base] if style.get("s") else np.linspace(0.8, 2.6, 37)):
            s = base * f
            inside = 0
            for p in sample:
                q = Vector(((p.x - hcx) * s, ty + (p.y - hcy) * s, TOP + OFF + (p.z - hz1) * s))
                loc, n, i, d = BT.find_nearest(q)
                if loc is not None and (q - loc).dot(n) < 0 and d < 0.05:
                    inside += 1
            if inside / len(sample) < SEARCH_INSIDE:
                break
        sx = sy = sz = s
    k = tw.get("scale", (1, 1, 1))
    sx, sy, sz = sx * k[0], sy * k[1], sz * k[2]
    for v in me.vertices:
        p = v.co
        v.co = Vector(((p.x - hcx) * sx, ty + tw.get("y", style.get("dy", 0)) + (p.y - hcy) * sy,
                       TOP + OFF + tw.get("z", style.get("dz", 0)) + (p.z - hz1) * sz))
    return dict(sx=round(sx, 4), sy=round(sy, 4), sz=round(sz, 4))


def push_out(me):
    pushed = 0
    for v in me.vertices:
        loc, n, i, d = BT.find_nearest(v.co)
        if loc is None:
            continue
        s = (v.co - loc).dot(n)
        if s < PUSH and d < 0.03:
            v.co = loc + n * PUSH + (v.co - loc - n * s)
            pushed += 1
    return pushed


# --- lift the hair over her ears: per side, a height map of how far her head stands out sideways (|x| per y,z),
# grown by EAR_GROW and blurred so the hair rises over the ear in one smooth swell, then every side point of the
# hair under that height (+ EAR_GAP) is moved out to it. Faces bigger than the ear can't cut through it this way.
EAR_BOX = ((-0.06, 0.10), (1.50, 1.70))   # y, z (m, posed world) round her ears
EAR_CELL, EAR_GROW, EAR_BLUR, EAR_GAP = 0.002, 4, 4, 0.004
EAR_SIDE = 0.040                           # only hair points further out than this to the side
_P = np.array([tuple(p) for p in BV])
_ny = int((EAR_BOX[0][1] - EAR_BOX[0][0]) / EAR_CELL) + 1
_nz = int((EAR_BOX[1][1] - EAR_BOX[1][0]) / EAR_CELL) + 1


def _blur(a, r):
    for ax in (0, 1):
        c = np.cumsum(np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(2)], mode="edge"), axis=ax)
        a = (np.take(c, range(2 * r + 1, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - 2 * r - 1), axis=ax)) / (2 * r + 1)
    return a


EAR_MAP = {}
for _side in (1, -1):
    H = np.zeros((_ny, _nz))
    q = _P[(_P[:, 0] * _side > 0.03) & (_P[:, 1] > EAR_BOX[0][0]) & (_P[:, 1] < EAR_BOX[0][1]) & (_P[:, 2] > EAR_BOX[1][0]) & (_P[:, 2] < EAR_BOX[1][1])]
    iy = ((q[:, 1] - EAR_BOX[0][0]) / EAR_CELL).astype(int); iz = ((q[:, 2] - EAR_BOX[1][0]) / EAR_CELL).astype(int)
    np.maximum.at(H, (iy, iz), q[:, 0] * _side)
    G = H.copy()
    for dy in range(-EAR_GROW, EAR_GROW + 1):
        for dz in range(-EAR_GROW, EAR_GROW + 1):
            G = np.maximum(G, np.roll(np.roll(H, dy, 0), dz, 1))
    EAR_MAP[_side] = np.maximum(_blur(G, EAR_BLUR), H)


def ear_lift(me):
    lifted = 0
    for side in (1, -1):
        G = EAR_MAP[side]
        for v in me.vertices:
            x = v.co.x * side
            if x < EAR_SIDE:
                continue
            fy = (v.co.y - EAR_BOX[0][0]) / EAR_CELL; fz = (v.co.z - EAR_BOX[1][0]) / EAR_CELL
            if not (0 <= fy < _ny - 1 and 0 <= fz < _nz - 1):
                continue
            w = min(1.0, min(fy, _ny - 1 - fy) / 6, min(fz, _nz - 1 - fz) / 6)
            need = G[int(round(fy)), int(round(fz))] + EAR_GAP
            if x < need:
                v.co.x += side * (need - x) * w
                lifted += 1
    return lifted


def rest_points(obj):
    """An old style's points as it stands at rest (its mesh), with each point's weights."""
    gi = {g.index: g.name for g in obj.vertex_groups}
    pts, ws = [], []
    for v in obj.data.vertices:
        pts.append(v.co.copy())
        ws.append({gi[g.group]: g.weight for g in v.groups if g.weight > 1e-4})
    return pts, ws


def skin(obj, me, weights_from):
    me.transform(TO_REST)
    obj.data = me
    obj.parent = ARM; obj.parent_type = "OBJECT"; obj.parent_bone = ""
    obj.matrix_parent_inverse = Matrix.Identity(4); obj.matrix_basis = Matrix.Identity(4)
    obj.vertex_groups.clear()
    if weights_from is None:
        obj.vertex_groups.new(name=HEAD_BONE).add(range(len(me.vertices)), 1.0, "REPLACE")
    else:
        pts, ws = weights_from
        kd = KDTree(len(pts))
        for i, p in enumerate(pts):
            kd.insert(p, i)
        kd.balance()
        groups = {}
        for v in me.vertices:
            # the 4 nearest old points, by inverse distance: no seams where the nearest one changes
            near = kd.find_n(v.co, 4)
            acc, tot = {}, 0.0
            for co, i, d in near:
                f = 1.0 / max(d, 1e-4)
                tot += f
                for g, w in ws[i].items():
                    acc[g] = acc.get(g, 0) + w * f
            s = sum(acc.values()) or 1
            for g, w in acc.items():
                if w / s > 0.01:
                    if g not in groups:
                        groups[g] = obj.vertex_groups.get(g) or obj.vertex_groups.new(name=g)
                    groups[g].add([v.index], w / s, "REPLACE")
    mod = next((m for m in obj.modifiers if m.type == "ARMATURE"), None) or obj.modifiers.new("Armature", "ARMATURE")
    mod.object = ARM
    obj["tarven_keep"] = True


report = {}
old_weights = {}
for st in STYLES:
    if st.get("weights") and st["weights"] in bpy.data.objects and not bpy.data.objects[st["weights"]].get("tarven_dl"):
        old_weights[st["name"]] = rest_points(bpy.data.objects[st["weights"]])
    elif st.get("weights"):
        old_weights[st["name"]] = globals().get("SAVED_WEIGHTS", {}).get(st["name"])

coll = ARM.users_collection[0] if ARM.users_collection else bpy.context.scene.collection
if REMOVE_OLD:
    keep = {f"Female_Hair{s['name']}" for s in STYLES}
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.name.startswith("Female_Hair") and (o.name not in keep or not o.get("tarven_dl")):
            report.setdefault("removed", []).append(o.name)
            bpy.data.objects.remove(o, do_unlink=True)

for st in STYLES:
    if ONLY and st["name"] not in ONLY:
        continue
    me = import_mesh(st)
    info = place(me, st)
    info["pushed"] = push_out(me)
    info["lifted"] = ear_lift(me)
    img = bake_texture(st)
    mat = material(st, img)
    me.materials.clear()
    me.materials.append(mat)
    for p in me.polygons:
        p.material_index = 0
        p.use_smooth = True
    oname = f"Female_Hair{st['name']}"
    obj = bpy.data.objects.get(oname)
    if obj is None:
        obj = bpy.data.objects.new(oname, me)
        coll.objects.link(obj)
    old = obj.data
    me.name = oname
    w = old_weights.get(st["name"])
    if st.get("weights") and w is None:
        print("WARN no weights source for", oname, "- head only")
    skin(obj, me, w)
    if old is not me and old.users == 0:
        bpy.data.meshes.remove(old)
    obj["tarven_dl"] = st["label"]
    obj.hide_render = obj.hide_viewport = False
    obj.hide_set(st["name"] != "")
    info["verts"] = len(me.vertices)
    info["groups"] = [g.name for g in obj.vertex_groups]
    report[oname] = info
print("FIT", report)
if OUT:
    bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
