"""
Her painted skin: a fresh UV atlas over the skin of one or more mesh objects (her body and head share one) and a
small, PS1-crushed texture painted into it (T_skin_f), in the manner of the hero-shooter refs' skin (measured, never
copied: see SKIN_LOOK and the numbers below).

    import skin_paint
    # the heroine (build_body.py / build_head.py): every face of both, one shared atlas, eyes shading the sockets
    img = skin_paint.paint_skin([body_game, head_game], TEX_DIR, occluders=[eye_l, eye_r])
    # the old ring-built Female_Body: only the faces that wear her skin
    img = skin_paint.paint_skin(female_body, TEX_DIR, faces_of=skin_paint.SKIN_FACES)

What it does:
  1. Unwraps the chosen faces of every object into ONE shared, non-overlapping atlas: seams between body parts and
     down the sides of each part, angle-based unwrap, all objects' islands packed together with a margin. Done on
     throwaway copies, then copied back loop by loop: faces not chosen keep their UVs exactly. Each object's first UV
     layer is written (made, as "UVMap", if it has none).
  2. Rasterizes the atlas: each texel finds its triangle, and from it a 3D point and normal.
  3. Paints: base skin; warm cavity shading (occlusion from rays over all the objects, plus a fine cavity signal from
     `sample`, by default the heroine's SDF fields: heroine/sdf.py for the body, heroine/head_mesh.field for the
     head, counted only where the mesh lies on them); warmth where the refs put it (knee fronts, knuckles,
     fingertips, soles, toes, heels; nose; lips); slightly brighter cheeks; a faint top-light; pinker legs and
     yellower shoulders and neck.
  4. Pads the islands, crushes it to SIZE px with a reduced palette (like build_world.retro_crush), sets the average
     to the old flat skin colour (the game's skin-tone slider scales by the texture's average), saves
     <tex_dir>/<image_name>.png and points the material's image nodes at it (Closest), so the glTF export embeds it.
     Faces painted on an object with no material, or with faces_of None, are given the material.

Measured on the refs' Body_D / Head_D / Body_ORM (8 refs with skin bodies, 9 heads; numbers only): base skin hue
8-18 deg, sat 0.25-0.43; the darkest 5% hue -6..-19 deg (redder), sat x1.0-1.3, value x0.8-0.9 (deep creases on the
face to x0.55-0.7, sat x1.5, a crimson brown); painted AO in ORM median 0.84, p5 0.52, and the diffuse darkens with it
(corr +0.35); the reddest 5% sit on soles, knuckles, knee fronts and fingertips (hue -7, sat x1.19, value x0.97), not on
the chest or buttocks; legs a little pinker and darker (hue -4, value x0.94), shoulders and neck yellower (hue +5, sat
x0.93); highlights soft: the brightest 3% value x1.2, hue +5, sat x0.9. Face: the reddest 30% of the lips hue -13,
sat x1.5, value x0.83; of the nose hue -8, sat x1.24, value x0.92; cheeks brighter (value x1.18), not redder.
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
HEROINE = os.path.join(HERE, "heroine")

# The old Female_Body's faces painted from the atlas: her skin, and the faces that wear her skin when she is bare
# (appearance.ts gives the band, smallclothes and the skin under her openings skin.worn then).
SKIN_FACES = ("T_skin_f", "T_bra", "T_smalls", "T_hole")
# Faces that lie just over her skin (patches, copies): left out of the occlusion, or they would shade all of her.
NOT_OCCLUDERS = ("T_lingerie", "T_pubic", "T_hair_f", "T_cum")
SIZE = 256          # the texture as saved
SUPERSAMPLE = 2     # painted at SIZE * this, then crushed down
COLORS = 32         # palette after crushing
MARGIN = 4          # px between islands, at SIZE
TARGET = (0.86, 0.63, 0.5)   # sRGB average to keep: build_world's skin_f

# How the paint moves the base colour (sRGB HSV): hue in degrees, saturation and value as factors at full strength.
SKIN_LOOK = {
    "cavity": {"hue": -16.0, "sat": 1.35, "val": 0.6},      # deepest crease: crimson brown
    "warm": {"hue": -8.0, "sat": 1.22, "val": 0.95},        # knees, knuckles, fingertips, soles, nose
    "lips": {"hue": -13.0, "sat": 1.5, "val": 0.83},        # the lips' reddest
    "cheek": {"hue": -0.7, "sat": 1.04, "val": 1.12},       # cheeks: brighter, not redder
    "light": {"hue": 2.0, "sat": 0.96, "val": 1.04},        # top-light on upward forms
    "legs": {"hue": -4.0, "sat": 1.0, "val": 0.96},         # her legs a touch pinker and darker
    "shoulders": {"hue": 4.0, "sat": 0.94, "val": 1.02},    # neck, shoulders, upper back a touch yellower
}
# Warm spots: (strength, radius m).
WARM = {"knee": (0.6, 0.065), "elbow": (0.35, 0.04), "knuckle": (0.75, 0.016), "finger_joint": (0.45, 0.011),
        "fingertip": (0.8, 0.013), "hand": (0.3, None), "sole": (0.85, None), "toe": (0.7, None), "heel": (0.6, None),
        "glute_fold": (0.3, 0.05), "nose": (0.75, 0.012), "lips": (0.85, None), "cheek": (0.7, 0.02)}
# How the two occlusion signals become the cavity shading: AO below the floor is open skin; gains, softening passes
# (texels at SIZE * SUPERSAMPLE) and the final ease.
OCC = {"ao_floor": 0.05, "ao_gain": 1.3, "cav_gain": 0.8, "blur": 2, "gamma": 1.25}
# Mesh occlusion: rays per point, how far they look.
AO_RAYS, AO_REACH = 20, 0.2
# The default SDF cavity counts fully where the mesh is within the first distance of the field, not past the second.
SDF_NEAR = (0.005, 0.012)
# The fine cavity: (step out along the normal m, weight). Weighted to the broader steps, so tiny dents where the
# sculpt's parts meet don't ring her limbs.
CAVITY_TAPS = ((0.004, 0.12), (0.008, 0.2), (0.016, 0.26), (0.03, 0.24), (0.05, 0.18))
# Texels per metre on a head, as a multiple of the body's: her face gets the detail (the refs give it its own map).
HEAD_DENSITY = 2.2


# ---------------------------------------------------------------------------------------------------- colour
def srgb_to_lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def rgb_to_hsv(rgb):
    rgb = np.asarray(rgb, float)
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    safe = np.where(d > 1e-9, d, 1.0)
    h = np.where(mx == r, ((g - b) / safe) % 6, np.where(mx == g, (b - r) / safe + 2, (r - g) / safe + 4)) / 6.0
    h = np.where(d > 1e-9, h, 0.0)
    s = np.where(mx > 1e-9, d / np.where(mx > 1e-9, mx, 1.0), 0.0)
    return np.stack([h, s, mx], -1)


def hsv_to_rgb(hsv):
    h, s, v = hsv[..., 0] % 1.0, np.clip(hsv[..., 1], 0, 1), np.clip(hsv[..., 2], 0, 1)
    i = np.floor(h * 6).astype(int) % 6
    f = h * 6 - np.floor(h * 6)
    p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
    choices = [np.stack(x, -1) for x in ((v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q))]
    out = np.zeros(h.shape + (3,))
    for k in range(6):
        out[i == k] = choices[k][i == k]
    return out


def shift(hsv, look, amount):
    """Moves HSV colours toward a SKIN_LOOK entry by amount (0..1, per texel)."""
    a = np.clip(amount, 0, 1)
    out = hsv.copy()
    out[..., 0] = hsv[..., 0] + look["hue"] / 360.0 * a
    out[..., 1] = hsv[..., 1] * (1 + (look["sat"] - 1) * a)
    out[..., 2] = hsv[..., 2] * (1 + (look["val"] - 1) * a)
    return out


def quantize(img, k):
    """Median-cut colour reduction (as build_world.quantize)."""
    px = img.reshape(-1, 3)
    boxes = [np.arange(len(px))]
    while len(boxes) < k:
        best, best_score = -1, -1.0
        for i, b in enumerate(boxes):
            if len(b) < 2:
                continue
            score = float(np.ptp(px[b], axis=0).max()) * len(b)
            if score > best_score:
                best, best_score = i, score
        if best < 0 or best_score <= 0:
            break
        b = boxes.pop(best)
        channel = int(np.ptp(px[b], axis=0).argmax())
        order = b[np.argsort(px[b, channel], kind="stable")]
        mid = len(order) // 2
        boxes += [order[:mid], order[mid:]]
    out = px.copy()
    for b in boxes:
        out[b] = px[b].mean(axis=0)
    return out.reshape(img.shape)


def retro_crush(rgb, size, colors):
    """Shrink to retro resolution and reduce the palette (as build_world.retro_crush)."""
    factor = rgb.shape[0] // size
    h = rgb.shape[0] // factor
    small = rgb[:h * factor, :h * factor].reshape(h, factor, h, factor, 3).mean(axis=(1, 3))
    return quantize(small, colors)


# ---------------------------------------------------------------------------------------------------- helpers
def _np(seq, attr, n, width=1, dtype=np.float64):
    a = np.empty(n * width, dtype)
    seq.foreach_get(attr, a)
    return a.reshape(-1, width) if width > 1 else a


def _xf(M, P):
    M = np.asarray(M)
    return P @ M[:3, :3].T + M[:3, 3]


def _xn(M, N):
    N = N @ np.linalg.inv(np.asarray(M)[:3, :3])
    return N / (np.linalg.norm(N, axis=1, keepdims=True) + 1e-9)


def _root(obj):
    while obj.parent:
        obj = obj.parent
    return obj


def _seg(P, a, b):
    """Distance from points to segment a-b, and the parameter along it."""
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1), (P - a) @ ab / max(ab @ ab, 1e-12)


def _blob(P, c, r):
    return np.exp(-np.sum((P - c) ** 2, 1) / (2 * r * r))


def _heroine_modules():
    if HEROINE not in sys.path:
        sys.path.insert(0, HEROINE)
    import sdf  # noqa: E402
    return sdf


def _group_weights(obj, me):
    names = [g.name for g in obj.vertex_groups]
    W = np.zeros((len(me.vertices), max(1, len(names))), np.float32)
    for v in me.vertices:
        for g in v.groups:
            if g.group < len(names):
                W[v.index, g.group] = g.weight
    return W, names


def kind_of(obj):
    """How an object is laid out and painted: "bones" (the old Female_Body: Female_* groups on a rig), "head" (the
    heroine's head, head coordinates in its local space) or "heroine" (her body, built at the origin in sdf.py's
    space: z up, +y front, metres)."""
    if any(g.name.startswith("Female_") for g in obj.vertex_groups):
        return "bones"
    if "head" in obj.name.lower():
        return "head"
    return "heroine"


# ---------------------------------------------------------------------------------------------------- 1. islands
def _labels_bones(obj, me, cen, fn, chosen):
    """Old Female_Body: body part by dominant bone group, split front/back (feet top/sole, hands across)."""
    W, names = _group_weights(obj, me)
    part_names = {}
    for i, n in enumerate(names):
        side = "_L" if n.endswith("_L") else "_R" if n.endswith("_R") else ""
        key = n.split("_", 1)[-1].rsplit("_", 1)[0] if side else n.split("_", 1)[-1]
        part = {"UpperArm": "upperarm", "ForeArm": "forearm", "HandFingers": "hand", "HandTips": "hand",
                "HandThumb": "hand", "Thigh": "thigh", "ThighSoft": "thigh", "Shin": "shin", "Head": "head"}.get(key, "trunk")
        part_names[i] = part + side if part not in ("trunk", "head") else part
    labels = sorted(set(part_names.values()))
    vpart = np.array([labels.index(part_names[i]) for i in np.argmax(W, 1)])
    n_poly = len(me.polygons)
    tot = _np(me.polygons, "loop_total", n_poly, dtype=np.int64)
    lv = _np(me.loops, "vertex_index", len(me.loops), dtype=np.int64)
    votes = np.zeros((n_poly, len(labels)), int)
    np.add.at(votes, (np.repeat(np.arange(n_poly), tot), vpart[lv]), 1)
    fpart = votes.argmax(1)
    label = np.full(n_poly, -1)
    for k, pname in enumerate(labels):
        m = chosen & (fpart == k)
        if not m.any():
            continue
        if pname.startswith("shin"):
            foot = m & (cen[:, 2] < 0.085)
            sole = foot & (fn[:, 2] < -0.55)
            mid = np.median(cen[m, 1])
            label[m & ~foot & (cen[:, 1] >= mid)] = k * 4
            label[m & ~foot & (cen[:, 1] < mid)] = k * 4 + 1
            label[foot & ~sole] = k * 4 + 2
            label[sole] = k * 4 + 3
        elif pname.startswith("hand"):
            mid = np.median(cen[m, 0])
            label[m & (cen[:, 0] >= mid)] = k * 4
            label[m & (cen[:, 0] < mid)] = k * 4 + 1
        else:
            mid = np.median(cen[m, 1]) if pname != "trunk" else 0.0
            label[m & (cen[:, 1] >= mid)] = k * 4
            label[m & (cen[:, 1] < mid)] = k * 4 + 1
    return label


def _heroine_parts(P, J):
    """Part per point of her body (sdf space): 0 trunk, 1 upper arm, 2 forearm, 3 hand, 4 thigh, 5 shin, 6 foot."""
    Q = P.copy()
    Q[:, 0] = np.abs(Q[:, 0])
    S, E, Wr = J["shoulder"], J["elbow"], J["wrist"]
    d_up, t_up = _seg(Q, S, E)
    d_fo, t_fo = _seg(Q, E, Wr)
    along = (Q - Wr) @ ((Wr - E) / np.linalg.norm(Wr - E))
    part = np.zeros(len(P), int)
    hand = (along > -0.012) & (np.linalg.norm(Q - Wr, axis=1) < 0.25)
    fore = ~hand & (d_fo < 0.075) & (t_fo > -0.05)
    upper = ~hand & ~fore & (d_up < 0.08) & (t_up > 0.3)
    leg = ~(hand | fore | upper) & (Q[:, 2] < J["crotch"][2] - 0.035)
    part[upper], part[fore], part[hand] = 1, 2, 3
    part[leg & (Q[:, 2] >= J["knee"][2])] = 4
    part[leg & (Q[:, 2] < J["knee"][2])] = 5
    part[leg & (Q[:, 2] < 0.1)] = 6
    return part


def _labels_heroine(cen, fn, chosen, J):
    sdf = _heroine_modules()
    part = _heroine_parts(cen, J)
    side = (cen[:, 0] < 0).astype(int)
    Q = cen.copy()
    Q[:, 0] = np.abs(Q[:, 0])
    keys = np.array([k[:2] for k in sdf.TRUNK_KEYS])
    cy = np.interp(Q[:, 2], keys[:, 0], keys[:, 1])
    # the axis each part's front/back is measured from (y at that point's height)
    axis_y = cy.copy()
    for a, b, p in ((J["hip"], J["knee"], 4), (J["knee"], J["ankle"], 5), (J["shoulder"], J["elbow"], 1),
                    (J["elbow"], J["wrist"], 2)):
        m = part == p
        _, t = _seg(Q[m], a, b)
        axis_y[m] = a[1] + np.clip(t, 0, 1) * (b[1] - a[1])
    half = (Q[:, 1] < axis_y).astype(int)
    _, _, _, palm_n = sdf.hand_frame(J)
    m = part == 3
    half[m] = (((Q[m] - J["wrist"]) @ palm_n) > 0).astype(int)
    m = part == 6
    half[m] = (fn[m, 2] < -0.55).astype(int)
    label = part * 4 + side * 2 + half
    label[~chosen] = -1
    return label


def _labels_head(cen, chosen, LM):
    """Her head (head coordinates): the face as one island, the back of the head and ears split down the middle,
    the neck front and back."""
    split_y = LM["ear_front"][1] + 0.008
    front = cen[:, 1] >= split_y
    neck = cen[:, 2] < -0.10
    label = np.where(neck, np.where(cen[:, 1] >= -0.10, 4, 5), np.where(front, 0, np.where(cen[:, 0] >= 0, 1, 2)))
    label[~chosen] = -1
    return label


# ---------------------------------------------------------------------------------------------------- 2. unwrap
def _unwrap(objs, chosen, labels, margin_uv, density=None):
    """Unwraps the chosen faces of every object on throwaway copies (seams between labels), packs all of them into
    one atlas, and copies the UVs back. Returns each object's loop UVs."""
    temps = []
    try:
        for obj, ch, lab in zip(objs, chosen, labels):
            me = obj.data
            tmp_me = me.copy()
            tmp_me.name = "SkinPaint_tmp"
            tmp = bpy.data.objects.new("SkinPaint_tmp", tmp_me)
            bpy.context.scene.collection.objects.link(tmp)
            tmp.matrix_world = obj.matrix_world.copy()
            temps.append((tmp, tmp_me))
            if tmp_me.shape_keys:
                tmp.shape_key_clear()
            if not tmp_me.uv_layers:
                tmp_me.uv_layers.new(name="UVMap")
            for nm in ("sp_face", "sp_label", "sp_vert"):
                if nm in tmp_me.attributes:
                    tmp_me.attributes.remove(tmp_me.attributes[nm])
            n_poly, n_vert = len(me.polygons), len(me.vertices)
            tmp_me.attributes.new("sp_face", "INT", "FACE").data.foreach_set("value", np.arange(n_poly, dtype=np.int32))
            tmp_me.attributes.new("sp_label", "INT", "FACE").data.foreach_set("value", np.where(ch, lab, -1).astype(np.int32))
            tmp_me.attributes.new("sp_vert", "INT", "POINT").data.foreach_set("value", np.arange(n_vert, dtype=np.int32))
            bm = bmesh.new()
            bm.from_mesh(tmp_me)
            lay = bm.faces.layers.int["sp_label"]
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[lay] < 0], context="FACES")
            for e in bm.edges:
                lf = e.link_faces
                e.seam = len(lf) != 2 or lf[0][lay] != lf[1][lay]
            for f in bm.faces:
                f.select = True
            bm.to_mesh(tmp_me)
            bm.free()

        view_layer = bpy.context.view_layer
        prev_active = view_layer.objects.active
        prev_sel = [o for o in view_layer.objects if o.select_get()]
        for o in prev_sel:
            o.select_set(False)
        for tmp, _ in temps:
            tmp.select_set(True)
        view_layer.objects.active = temps[0][0]
        ts = bpy.context.scene.tool_settings
        prev_sync = ts.use_uv_select_sync
        ts.use_uv_select_sync = True
        try:
            bpy.ops.object.mode_set(mode="EDIT")       # every selected copy: one multi-object edit, one atlas
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.unwrap(method="ANGLE_BASED", margin=margin_uv)
            bpy.ops.uv.select_all(action="SELECT")
            bpy.ops.uv.average_islands_scale()
            if density and any(density.get(o.name, 1.0) != 1.0 for o in objs):
                # more texels for some (her face): grow their islands before packing, which keeps relative sizes
                bpy.ops.object.mode_set(mode="OBJECT")
                for obj, (tmp, tmp_me) in zip(objs, temps):
                    f = density.get(obj.name, 1.0)
                    if f != 1.0:
                        uv = _np(tmp_me.uv_layers[0].data, "uv", len(tmp_me.loops), 2)
                        tmp_me.uv_layers[0].data.foreach_set("uv", (uv * f).ravel())
                bpy.ops.object.mode_set(mode="EDIT")
                bpy.ops.mesh.select_all(action="SELECT")
                bpy.ops.uv.select_all(action="SELECT")
            bpy.ops.uv.pack_islands(rotate=True, margin=margin_uv)
            bpy.ops.object.mode_set(mode="OBJECT")
        finally:
            ts.use_uv_select_sync = prev_sync
            for tmp, _ in temps:
                tmp.select_set(False)
            for o in prev_sel:
                o.select_set(True)
            view_layer.objects.active = prev_active

        out = []
        for obj, (tmp, tmp_me) in zip(objs, temps):
            me = obj.data
            n_poly, n_vert = len(me.polygons), len(me.vertices)
            t_np = len(tmp_me.polygons)
            t_face = _np(tmp_me.attributes["sp_face"].data, "value", t_np, dtype=np.int64)
            t_vert = _np(tmp_me.attributes["sp_vert"].data, "value", len(tmp_me.vertices), dtype=np.int64)
            t_tot = _np(tmp_me.polygons, "loop_total", t_np, dtype=np.int64)
            t_lv = _np(tmp_me.loops, "vertex_index", len(tmp_me.loops), dtype=np.int64)
            t_uv = _np(tmp_me.uv_layers[0].data, "uv", len(tmp_me.loops), 2)
            t_key = np.repeat(t_face, t_tot) * n_vert + t_vert[t_lv]
            tot = _np(me.polygons, "loop_total", n_poly, dtype=np.int64)
            lv = _np(me.loops, "vertex_index", len(me.loops), dtype=np.int64)
            key = np.repeat(np.arange(n_poly), tot) * n_vert + lv
            order = np.argsort(key)
            pos = order[np.searchsorted(key[order], t_key)]
            assert np.all(key[pos] == t_key), "skin_paint: loop mapping failed"
            if not me.uv_layers:
                me.uv_layers.new(name="UVMap")
            layer = me.uv_layers[0]
            uv = _np(layer.data, "uv", len(me.loops), 2)
            uv[pos] = t_uv
            layer.data.foreach_set("uv", uv.ravel())
            me.update()
            out.append(uv)
        return out
    finally:
        for tmp, tmp_me in temps:
            bpy.data.objects.remove(tmp, do_unlink=True)
            bpy.data.meshes.remove(tmp_me)


# ---------------------------------------------------------------------------------------------------- 3. signals
def _mesh_ao(tree, P, N):
    """Occlusion (0 open .. 1 shut) at world points P with normals N, from rays over the objects' surfaces."""
    rng = np.random.default_rng(11)
    u1 = (np.arange(AO_RAYS) + 0.5) / AO_RAYS
    phi0 = 2 * math.pi * np.arange(AO_RAYS) * 0.618034
    r = np.sqrt(u1)
    ao = np.zeros(len(P))
    spin = rng.random(len(P)) * 2 * math.pi
    for i in range(len(P)):
        n = N[i]
        a = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
        t = np.cross(n, a); t /= np.linalg.norm(t); b = np.cross(n, t)
        phi = phi0 + spin[i]
        dirs = (r * np.cos(phi))[:, None] * t + (r * np.sin(phi))[:, None] * b + np.sqrt(1 - u1)[:, None] * n
        o = Vector(P[i] + n * 0.003)
        hit = 0.0
        for d in dirs:
            loc, _, _, dist = tree.ray_cast(o, Vector(d), AO_REACH)
            # hits right beside the start are the low-poly facets themselves, not something over the skin
            if loc is not None and dist > 0.006:
                hit += (1 - dist / AO_REACH) ** 1.5
        ao[i] = hit / AO_RAYS
    return ao


def _masked_blur(v, mask, passes=2):
    """Box-blurs a texel map within the painted texels only (no bleeding across island edges)."""
    m = mask.astype(float)
    v = v * m
    for _ in range(passes):
        acc, cnt = np.zeros_like(v), np.zeros_like(m)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                acc += np.roll(np.roll(v, dy, 0), dx, 1)
                cnt += np.roll(np.roll(m, dy, 0), dx, 1)
        v = np.where(mask, acc / np.maximum(cnt, 1e-9), 0)
    return v


def field_sampler(field, to_field):
    """A cavity sampler from a signed distance field: sample(points_world, normals_world) -> cavity 0..1.
    field(P) -> distances for (N, 3) points in the field's space; to_field: 4x4 world -> field space."""
    to_field = np.asarray(to_field)

    def f(P):
        out = np.empty(len(P))
        order = np.lexsort((P[:, 1], np.abs(P[:, 0]), P[:, 2]))
        for s in range(0, len(P), 768):
            idx = order[s:s + 768]
            out[idx] = field(P[idx])
        return out

    def sample(points, normals):
        P = _xf(to_field, points)
        d0 = f(P)
        e = 0.0015
        g = np.stack([f(P + [e, 0, 0]) - f(P - [e, 0, 0]), f(P + [0, e, 0]) - f(P - [0, e, 0]),
                      f(P + [0, 0, e]) - f(P - [0, 0, e])], 1)
        g /= np.linalg.norm(g, axis=1, keepdims=True) + 1e-9
        ps = P - g * d0[:, None]
        occ = np.zeros(len(P))
        for h, w in CAVITY_TAPS:
            occ += w * np.clip(h - f(ps + g * h), 0, None) / h
        # only where the mesh lies on the field, and faces the same way there (a fold of the field passing near a
        # different part of her is not hers)
        near = np.clip((SDF_NEAR[1] - np.abs(d0)) / (SDF_NEAR[1] - SDF_NEAR[0]), 0, 1)
        near *= np.clip((np.sum(_xn(np.linalg.inv(to_field), normals) * g, 1) - 0.6) / 0.25, 0, 1)
        sample.last_distance = d0
        return np.clip(occ * 1.4, 0, 1) * near
    sample.last_distance = None
    return sample


def default_sampler(obj, arm_angle=41.5):
    """The heroine's own fields: head_mesh.field for a "head" object (its local space), sdf.py's body for the rest
    (her root's space)."""
    sdf = _heroine_modules()
    to_space = np.array(_root(obj).matrix_world.inverted()) if kind_of(obj) != "head" else np.array(obj.matrix_world.inverted())
    if kind_of(obj) == "head":
        import head_mesh  # noqa: E402
        return field_sampler(head_mesh.field, to_space)
    root, _, _ = sdf.build(arm_angle=arm_angle)
    return field_sampler(lambda P: sdf.eval_points(root, P), to_space)


def _bones(obj):
    """Rest bone heads in her root space, by short name (UpperArm_L, Shin_R, ...), for the old Female_Body."""
    arm_obj = next((m.object for m in obj.modifiers if m.type == "ARMATURE" and m.object), obj.parent)
    out = {}
    if arm_obj and arm_obj.type == "ARMATURE":
        M = np.array(_root(obj).matrix_world.inverted()) @ np.array(arm_obj.matrix_world)
        for b in arm_obj.data.bones:
            out[b.name.split("_", 1)[-1]] = _xf(M, np.array(b.head_local)[None])[0]
    return out


def _tints_bones(P, N, W, names, bones):
    """Old Female_Body (root space): warmth, legs, shoulders from her bones and groups."""
    gi = {n.split("_", 1)[-1]: i for i, n in enumerate(names)}
    gsum = lambda keys: sum((W[:, gi[k]] for k in keys if k in gi), np.zeros(len(P)))
    w = np.zeros(len(P))
    for side in ("L", "R"):
        if f"Shin_{side}" in bones:
            s, r = WARM["knee"]
            w = np.maximum(w, s * _blob(P, bones[f"Shin_{side}"] + [0, 0.045, 0], r) * np.clip(N[:, 1] + 0.2, 0, 1))
        if f"ForeArm_{side}" in bones:
            s, r = WARM["elbow"]
            w = np.maximum(w, s * _blob(P, bones[f"ForeArm_{side}"] + [0, -0.03, 0], r) * np.clip(-N[:, 1] + 0.2, 0, 1))
        if f"HandFingers_{side}" in bones:
            w = np.maximum(w, WARM["knuckle"][0] * _blob(P, bones[f"HandFingers_{side}"], 0.028))
        if f"Glute_{side}" in bones:
            s, r = WARM["glute_fold"]
            fold = bones[f"Glute_{side}"] * [1, 1, 0] + [0, 0.03, 0.905]
            w = np.maximum(w, s * _blob(P, fold, r) * np.clip(-N[:, 1], 0, 1))
    w = np.maximum(w, WARM["fingertip"][0] * np.clip(gsum(["HandTips_L", "HandTips_R"]) * 1.2, 0, 1))
    w = np.maximum(w, WARM["hand"][0] * np.clip(gsum([f"Hand{k}_{s}" for k in ("Fingers", "Tips", "Thumb") for s in "LR"]), 0, 1))
    legs = np.clip(gsum(["Thigh_L", "Thigh_R", "Shin_L", "Shin_R", "ThighSoft_L", "ThighSoft_R"]), 0, 1)
    shoulders = np.clip((P[:, 2] - 1.38) / 0.1, 0, 1) * np.clip(1 - gsum(["ForeArm_L", "ForeArm_R", "HandFingers_L", "HandFingers_R"]), 0, 1)
    z = np.zeros(len(P))
    return {"warm": w, "legs": legs, "shoulders": shoulders, "lips": z, "cheek": z}


def _tints_heroine(P, N, J):
    """Her body (sdf space)."""
    sdf = _heroine_modules()
    Q = P.copy()
    Q[:, 0] = np.abs(Q[:, 0])
    Nq = N.copy()
    Nq[:, 0] = np.where(P[:, 0] < 0, -N[:, 0], N[:, 0])
    part = _heroine_parts(P, J)
    w = np.zeros(len(P))
    s, r = WARM["knee"]
    w = np.maximum(w, s * _blob(Q, J["knee"] + [0, 0.045, 0], r) * np.clip((Nq[:, 1] - 0.1) / 0.5, 0, 1))
    s, r = WARM["elbow"]
    w = np.maximum(w, s * _blob(Q, J["elbow"] + [0, -0.03, 0], r) * np.clip((-Nq[:, 1] - 0.1) / 0.5, 0, 1))
    fingers, thumb = sdf.finger_chains(J)
    for chain in fingers:
        w = np.maximum(w, WARM["knuckle"][0] * _blob(Q, chain[0], WARM["knuckle"][1]))
        for p in chain[1:-1]:
            w = np.maximum(w, WARM["finger_joint"][0] * _blob(Q, p, WARM["finger_joint"][1]))
        w = np.maximum(w, WARM["fingertip"][0] * _blob(Q, chain[-1], WARM["fingertip"][1]))
    w = np.maximum(w, WARM["fingertip"][0] * _blob(Q, thumb[-1], WARM["fingertip"][1]))
    wr, u, _, _ = sdf.hand_frame(J)
    w = np.maximum(w, WARM["hand"][0] * (part == 3) * np.clip(((Q - wr) @ u) / 0.07, 0, 1))
    o, R = sdf.foot_frame(J)
    F = (Q - o) @ R                                     # foot space: x across, y along (toes +), z up
    foot = part == 6
    w = np.maximum(w, WARM["sole"][0] * foot * np.clip((-Nq[:, 2] - 0.3) / 0.4, 0, 1))
    toe_y = np.percentile(F[foot, 1], 75) if foot.any() else 0.1
    heel_y = np.percentile(F[foot, 1], 12) if foot.any() else -0.05
    w = np.maximum(w, WARM["toe"][0] * foot * np.clip((F[:, 1] - toe_y) / 0.03, 0, 1))
    w = np.maximum(w, WARM["heel"][0] * foot * np.clip((heel_y - F[:, 1]) / 0.02 + 0.5, 0, 1) * np.clip((0.06 - Q[:, 2]) / 0.03, 0, 1))
    legs = np.clip((J["crotch"][2] - 0.02 - Q[:, 2]) / 0.06, 0, 1) * (part != 3)
    shoulders = np.clip((Q[:, 2] - 1.38) / 0.08, 0, 1) * np.isin(part, (0, 1))
    z = np.zeros(len(P))
    return {"warm": np.clip(w, 0, 1), "legs": legs, "shoulders": shoulders, "lips": z, "cheek": z}


def _tints_head(P, N, LM):
    """Her head (head coordinates, from head_mesh's landmarks): nose and lips warm, cheeks brighter, neck yellower."""
    Q = P.copy()
    Q[:, 0] = np.abs(Q[:, 0])
    L = {k: np.array(v, float) for k, v in LM.items() if isinstance(v, (list, tuple, np.ndarray)) and len(v) == 3}
    w = np.zeros(len(P))
    if "nose_tip" in L:
        w = np.maximum(w, WARM["nose"][0] * _blob(Q, L["nose_tip"], WARM["nose"][1]))
    lips = np.zeros(len(P))
    if "stomion" in L and "mouth_corner" in L:
        st, mc = L["stomion"], L["mouth_corner"]
        top = L.get("upper_lip_front", st + [0, 0, 0.007])[2]
        bot = L.get("lower_lip_front", st - [0, 0, 0.009])[2]
        zc, hz = (top + bot) / 2, max(abs(top - bot) / 2 + 0.0015, 0.005)
        across = (Q[:, 0] / max(mc[0], 1e-3)) ** 4
        lips = WARM["lips"][0] * np.exp(-(across + ((Q[:, 2] - zc) / hz) ** 4)) * (Q[:, 1] > st[1] - 0.012)
    cheek = np.zeros(len(P))
    if "eye_bottom" in L and "nose_wing" in L:
        c = np.array([L["eye_outer"][0] * 0.85 if "eye_outer" in L else 0.04, L["nose_wing"][1] - 0.012,
                      (L["eye_bottom"][2] + L["nose_wing"][2]) / 2])
        cheek = WARM["cheek"][0] * _blob(Q, c, WARM["cheek"][1]) * np.clip(N[:, 1], 0, 1)
    neck = np.clip((-0.08 - Q[:, 2]) / 0.03, 0, 1)
    z = np.zeros(len(P))
    return {"warm": np.clip(w, 0, 1), "legs": z, "shoulders": neck, "lips": np.clip(lips, 0, 1), "cheek": cheek}


# ---------------------------------------------------------------------------------------------------- 4. raster
def _rasterize(uv, tris, R):
    """Per texel of an R x R grid (row 0 = v 0): triangle index and barycentrics; -1 where none."""
    tri_of = np.full((R, R), -1, np.int64)
    bary = np.zeros((R, R, 3))
    T = uv[tris] * R
    for t in range(len(tris)):
        (x0, y0), (x1, y1), (x2, y2) = T[t]
        lo_x, hi_x = int(max(0, math.floor(min(x0, x1, x2)))), int(min(R - 1, math.ceil(max(x0, x1, x2))))
        lo_y, hi_y = int(max(0, math.floor(min(y0, y1, y2)))), int(min(R - 1, math.ceil(max(y0, y1, y2))))
        if hi_x < lo_x or hi_y < lo_y:
            continue
        det = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
        if abs(det) < 1e-12:
            continue
        xs, ys = np.meshgrid(np.arange(lo_x, hi_x + 1) + 0.5, np.arange(lo_y, hi_y + 1) + 0.5)
        a = ((y1 - y2) * (xs - x2) + (x2 - x1) * (ys - y2)) / det
        b = ((y2 - y0) * (xs - x2) + (x0 - x2) * (ys - y2)) / det
        c = 1 - a - b
        inside = (a >= -1e-6) & (b >= -1e-6) & (c >= -1e-6)
        if not inside.any():
            continue
        yy, xx = (ys[inside] - 0.5).astype(int), (xs[inside] - 0.5).astype(int)
        tri_of[yy, xx] = t
        bary[yy, xx] = np.stack([a[inside], b[inside], c[inside]], 1)
    return tri_of, bary


def _dilate(rgb, mask, steps):
    """Grows the painted texels outward `steps` px (average of painted neighbours), so islands never bleed."""
    rgb, mask = rgb.copy(), mask.copy()
    for _ in range(steps):
        acc = np.zeros_like(rgb); cnt = np.zeros(mask.shape)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
            m = np.roll(np.roll(mask, dy, 0), dx, 1)
            acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * m[..., None]
            cnt += m
        grow = (~mask) & (cnt > 0)
        rgb[grow] = acc[grow] / cnt[grow][:, None]
        mask = mask | grow
    return rgb, mask


def _material(material, image):
    """The material to paint: an existing one (by name or object) has its image nodes pointed at the image; a new
    one is made like build_world.material() (Principled, image node, Closest)."""
    if isinstance(material, bpy.types.Material):
        mat = material
    else:
        mat = bpy.data.materials.get(material)
        if mat is None:
            mat = bpy.data.materials.new(material)
            mat.use_nodes = True
            tree = mat.node_tree
            bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
            tex = tree.nodes.new("ShaderNodeTexImage")
            tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
            bsdf.inputs["Roughness"].default_value = 0.95
    if not mat.use_nodes:
        mat.use_nodes = True
    for n in mat.node_tree.nodes:
        if n.type == "TEX_IMAGE":
            n.image = image
            n.interpolation = "Closest"
    return mat


# ---------------------------------------------------------------------------------------------------- main
def paint_skin(objects, tex_dir, material="T_skin_f", faces_of=None, sample=None, occluders=(), size=SIZE,
               colors=COLORS, image_name="T_skin_f", arm_angle=41.5, kinds=None, density=None, debug=None):
    """
    Unwraps the skin of one or more mesh objects into ONE shared atlas and paints <image_name> into it.

    objects    a mesh object, or a list of them (her Body_game and Head_game together: one atlas, one texture)
    tex_dir    where <image_name>.png is saved (build_world's TEX_DIR)
    material   the skin Material, or its name (made if missing). Its image nodes are pointed at the new image.
               With faces_of None every face of each object is set to it; otherwise the chosen faces keep the
               materials they have (the old Female_Body's T_skin_f / T_bra / T_smalls / T_hole).
    faces_of   None: all faces. A material name or a tuple of names: only the faces wearing one of them (on every
               object). Every other face keeps its UVs exactly.
    sample     None: the heroine's own fields (default_sampler: sdf.py for a body, head_mesh.field for a head).
               A callable sample(points_world (N,3), normals_world (N,3)) -> (N,) cavity 0 (open) .. 1 (deep crease)
               for every object, or a dict {object name: callable}.
    occluders  more mesh objects that shade the skin but aren't painted (her eyeballs)
    arm_angle  her arms' angle from vertical (degrees), for the heroine skeleton (sdf.skeleton)
    kinds      optional {object name: "heroine" | "head" | "bones"}; default kind_of(obj)
    density    optional {object name: texel density factor}; default HEAD_DENSITY for a head, 1 for the rest
    debug      optional dict, filled with intermediate maps and numbers for tests
    Returns the new bpy Image.
    """
    objs = list(objects) if isinstance(objects, (list, tuple)) else [objects]
    sdf = _heroine_modules()
    J = sdf.skeleton(arm_angle=arm_angle)
    kinds = {o.name: (kinds or {}).get(o.name) or kind_of(o) for o in objs}
    LM = None
    if "head" in kinds.values():
        import head_mesh  # noqa: E402
        LM = head_mesh.LM

    # ---- choose the faces and lay out the islands, per object
    picked = None if faces_of is None else ((faces_of,) if isinstance(faces_of, str) else tuple(faces_of))
    chosen, labels, data = [], [], []
    for obj in objs:
        me = obj.data
        n_poly, n_vert = len(me.polygons), len(me.vertices)
        mat_names = [m.name if m else "" for m in me.materials]
        pmat = _np(me.polygons, "material_index", n_poly, dtype=np.int64)
        ch = np.ones(n_poly, bool) if picked is None else np.isin(pmat, [i for i, n in enumerate(mat_names) if n in picked])
        co = _np(me.vertices, "co", n_vert, 3)
        nor = _np(me.vertices, "normal", n_vert, 3)
        kind = kinds[obj.name]
        space = np.array(obj.matrix_world) if kind == "head" else np.array(_root(obj).matrix_world.inverted()) @ np.array(obj.matrix_world)
        if kind == "head":
            space = np.eye(4)          # head coordinates are its local space
        co_s, nor_s = _xf(space, co), _xn(space, nor)
        tot = _np(me.polygons, "loop_total", n_poly, dtype=np.int64)
        lv = _np(me.loops, "vertex_index", len(me.loops), dtype=np.int64)
        lp = np.repeat(np.arange(n_poly), tot)
        cen = np.zeros((n_poly, 3)); np.add.at(cen, lp, co_s[lv]); cen /= tot[:, None]
        fn = np.zeros((n_poly, 3)); np.add.at(fn, lp, nor_s[lv])
        fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-9
        if kind == "bones":
            lab = _labels_bones(obj, me, cen, fn, ch)
        elif kind == "head":
            lab = _labels_head(cen, ch, LM)
        else:
            lab = _labels_heroine(cen, fn, ch, J)
        lab[ch & (lab < 0)] = 999
        chosen.append(ch); labels.append(lab)
        data.append(dict(me=me, co=co, nor=nor, co_s=co_s, nor_s=nor_s, pmat=pmat, mat_names=mat_names, lv=lv, kind=kind))
    if not any(c.any() for c in chosen):
        raise ValueError("skin_paint: no faces to paint")

    # ---- 1. one atlas over all of them
    dens = {o.name: (density or {}).get(o.name, HEAD_DENSITY if kinds[o.name] == "head" else 1.0) for o in objs}
    uvs = _unwrap(objs, chosen, labels, MARGIN / size, dens)

    # ---- 2. rasterize every object's chosen triangles into it
    R = size * SUPERSAMPLE
    all_uv, all_tri, all_obj = [], [], []
    vbase = lbase = 0
    Pw_v, Nw_v, Ps_v, Ns_v = [], [], [], []
    for k, (obj, d, ch) in enumerate(zip(objs, data, chosen)):
        me = d["me"]
        me.calc_loop_triangles()
        n_tri = len(me.loop_triangles)
        t_poly = _np(me.loop_triangles, "polygon_index", n_tri, dtype=np.int64)
        t_loops = _np(me.loop_triangles, "loops", n_tri, 3, dtype=np.int64)[ch[t_poly]]
        all_uv.append(uvs[k])
        all_tri.append(t_loops + lbase)
        all_obj.append(np.full(len(t_loops), k))
        mw = np.array(obj.matrix_world)
        Pw_v.append(_xf(mw, d["co"])); Nw_v.append(_xn(mw, d["nor"]))
        Ps_v.append(d["co_s"]); Ns_v.append(d["nor_s"])
        d["lbase"], d["vbase"] = lbase, vbase
        lbase += len(me.loops); vbase += len(me.vertices)
    loop_vert = np.concatenate([d["lv"] + d["vbase"] for d in data])
    uv_all = np.concatenate(all_uv); tris = np.concatenate(all_tri); tri_obj = np.concatenate(all_obj)
    Pw_v, Nw_v, Ps_v, Ns_v = map(np.concatenate, (Pw_v, Nw_v, Ps_v, Ns_v))
    tri_of, bary = _rasterize(uv_all, tris, R)
    mask = tri_of >= 0
    tt = tri_of[mask]
    bb = bary[mask]
    tv = loop_vert[tris[tt]]
    tex_obj = tri_obj[tt]
    interp = lambda a: np.einsum("nk,nkd->nd", bb, a[tv])
    unit = lambda a: a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-9)
    Pw, Nw, Ps, Ns = interp(Pw_v), unit(interp(Nw_v)), interp(Ps_v), unit(interp(Ns_v))

    # ---- 3. signals
    # occlusion: rays over every object (and the extra occluders), on every SUPERSAMPLE-th texel
    verts, polys = [], []
    for obj in objs + list(occluders):
        me = obj.data
        mw = np.array(obj.matrix_world)
        names = [m.name if m else "" for m in me.materials]
        base = len(verts)
        verts += [Vector(p) for p in _xf(mw, _np(me.vertices, "co", len(me.vertices), 3))]
        polys += [[base + i for i in p.vertices] for p in me.polygons
                  if not (names and p.material_index < len(names) and names[p.material_index] in NOT_OCCLUDERS)]
    tree = BVHTree.FromPolygons(verts, polys)
    ss = SUPERSAMPLE
    ys, xs = np.nonzero(mask)
    at = np.full(mask.shape, -1, np.int64)
    at[mask] = np.arange(len(ys))
    anchor = at[ys // ss * ss, xs // ss * ss]
    own = (anchor < 0) | ((ys % ss == 0) & (xs % ss == 0))
    anchor[own] = np.nonzero(own)[0]
    ao = np.zeros(len(ys))
    ao[own] = _mesh_ao(tree, Pw[own], Nw[own])
    ao = ao[anchor]

    cav = np.zeros(len(ys))
    dist = np.full(len(ys), np.nan)
    tints = {k: np.zeros(len(ys)) for k in ("warm", "legs", "shoulders", "lips", "cheek")}
    for k, obj in enumerate(objs):
        m = tex_obj == k
        if not m.any():
            continue
        s = sample.get(obj.name) if isinstance(sample, dict) else sample
        if s is None:
            s = default_sampler(obj, arm_angle)
        cav[m] = np.clip(np.asarray(s(Pw[m], Nw[m]), float).reshape(-1), 0, 1)
        if getattr(s, "last_distance", None) is not None:
            dist[m] = s.last_distance
        kind = data[k]["kind"]
        if kind == "bones":
            W, names = _group_weights(obj, data[k]["me"])
            vb = data[k]["vbase"]
            Wt = np.einsum("nk,nkg->ng", bb[m], W[tv[m] - vb])
            t = _tints_bones(Ps[m], Ns[m], Wt, names, _bones(obj))
        elif kind == "head":
            t = _tints_head(Ps[m], Ns[m], LM)
        else:
            t = _tints_heroine(Ps[m], Ns[m], J)
        for key in tints:
            tints[key][m] = t[key]
    light = np.clip((Ns @ (np.array([0, 0.35, 1.0]) / np.linalg.norm([0, 0.35, 1.0])) - 0.5) / 0.45, 0, 1) ** 1.5

    # occlusion: the mesh's broad shading and the fields' creases, combined without doubling up, softened a little
    # within the islands, then eased so most of her is open and only creases go deep (refs: median value x0.95-1,
    # darkest 5% x0.8-0.9, deepest creases x0.6-0.7)
    def soften(v, passes):
        full = np.zeros(mask.shape)
        full[mask] = v
        return _masked_blur(full, mask, passes)[mask]
    broad = np.clip((ao - OCC["ao_floor"]) * OCC["ao_gain"], 0, 1)
    occ = 1 - (1 - broad) * (1 - cav * OCC["cav_gain"])
    occ = np.clip(soften(occ, OCC["blur"]), 0, 1) ** OCC["gamma"]
    light = soften(light * np.clip(1 - occ * 3, 0, 1), 8)
    for key in ("warm", "cheek"):
        tints[key] = soften(tints[key], 4)
    tints["lips"] = soften(tints["lips"], 1)

    # ---- 4. paint (sRGB HSV, from the measured shifts)
    hsv = np.repeat(rgb_to_hsv(np.array(TARGET))[None], len(ys), 0)
    hsv = shift(hsv, SKIN_LOOK["legs"], tints["legs"])
    hsv = shift(hsv, SKIN_LOOK["shoulders"], tints["shoulders"])
    hsv = shift(hsv, SKIN_LOOK["cheek"], tints["cheek"])
    hsv = shift(hsv, SKIN_LOOK["warm"], tints["warm"])
    hsv = shift(hsv, SKIN_LOOK["lips"], tints["lips"])
    hsv = shift(hsv, SKIN_LOOK["light"], light)
    hsv = shift(hsv, SKIN_LOOK["cavity"], occ)
    col = hsv_to_rgb(hsv)

    img = np.zeros((R, R, 3))
    img[mask] = col
    img, grown = _dilate(img, mask, MARGIN * SUPERSAMPLE)
    # The rest of the image is never seen: filled so the whole texture averages (linear, as the game reads it) to
    # the old flat skin colour, while her unshaded skin stays that colour too.
    tgt = srgb_to_lin(TARGET)
    filled = ~grown
    if filled.any():
        fill = (tgt * R * R - srgb_to_lin(img[grown]).sum(0)) / filled.sum()
        img[filled] = lin_to_srgb(np.clip(fill, 0, 1))
    small = retro_crush(img, size, colors)
    lin = srgb_to_lin(small)
    lin *= tgt / np.maximum(lin.reshape(-1, 3).mean(0), 1e-6)     # exact average after the palette
    small = lin_to_srgb(lin)

    # ---- 5. save and hook up
    old = bpy.data.images.get(image_name)
    if old:
        old.name = image_name + "_old"
    image = bpy.data.images.new(image_name, size, size, alpha=False)
    image.pixels.foreach_set(np.dstack([small, np.ones((size, size))]).astype(np.float32).ravel())
    os.makedirs(tex_dir, exist_ok=True)
    image.filepath_raw = os.path.join(tex_dir, image_name + ".png")
    image.file_format = "PNG"
    image.save()
    mat = _material(material, image)
    if picked is None:
        for obj, d, ch in zip(objs, data, chosen):
            me = d["me"]
            if mat.name not in [m.name if m else "" for m in me.materials]:
                me.materials.append(mat)
            slot = [m.name if m else "" for m in me.materials].index(mat.name)
            me.polygons.foreach_set("material_index", np.full(len(me.polygons), slot, np.int32))
    if old and old.users == 0:
        bpy.data.images.remove(old)

    if debug is not None:
        debug.update({"R": R, "mask": mask, "occ": occ, "cav": cav, "ao": ao, "light": light, "image": small,
                      "uvs": uvs, "chosen": chosen, "labels": labels, "tex_obj": tex_obj, "distance": dist,
                      "coverage": float(mask.mean()), **{"t_" + k: v for k, v in tints.items()}})
    return image
