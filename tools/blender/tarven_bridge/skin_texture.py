"""Her painted skin detail, baked from her sculpt itself: a 2K picture on her face and the same detail on her body's
points. Run on the master (headless) and Send it:

  blender -b art/female_master.blend --python tools/blender/tarven_bridge/skin_texture.py -- [out.blend] [--debug]

What it makes (none of it holds her colour, so her look's skin tones and blushes still recolour her):
  - A DETAIL picture, art/paint/P_Female_Body.png (2048), on her face and lips through her body's "Paint" UV map: RGB
    is a multiplier around 0.5 grey (x2 in the game), A its strength. The body is marked paint_mode = "overlay", which
    paint.send_pictures writes into the manifest, so the game multiplies her skin by it (paint.ts) instead of painting
    over it.
  - The same detail on each of her body's points, the attribute "_SKIN_DETAIL" (a plain vector, exported as a glTF
    custom attribute): (multiplier - 1) x strength / 2, so the game's multiplier is 1 + 2 x it and a mesh without it
    reads none. Not a colour attribute: the exporter would send that as COLOR_0 too, and the game would tint every
    material on her body by it.
The detail: soft painted shade (her own occlusion, a little violet/olive), warm red on her nose, cheeks, ears, chin,
knees, elbows, knuckles, fingertips, toes and under her breasts, yellowish light on her forehead, nose bridge and the
planes facing up and forward, thin ink at her tight creases (her lids against her eyes, nostrils, lip line, under her
breasts, navel), and faint painted planes and mottle. Its average is kept at 1 (no change to her tone overall).

Why her body's detail is on its points, not in the picture: the game UV map gives her skin's faces a few fixed corners
each (a flat-colour swatch), so the GLB already splits her points where those differ, and the faces round each point
share its few split points: a Paint UV seam anywhere on her body (even along the splits there are) would split more
points, and her clothes are fitted to her body's points (duplicates pulled them out of place). Her face has no splits
inside it at all (one point of the game UV), so it is unwrapped whole into the picture with no new points; checked
after: the count of her GLB points must not change. Her points (her body's are 5-9 mm apart, denser at her bust and
hips) carry the broad detail; the skin's own texture still gives the fine mottle there.

Saves the master to out.blend if given (to save over the master, pass its own path). --debug writes the bakes and the
detail's pieces to ref/_bridge/tex/debug.
"""
import os
import struct
import sys
import time
import zlib

import bpy
import numpy as np

try:
    from . import core, paint
except ImportError:  # run headless, as a plain module beside core.py
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import core
    import paint

OBJECT = "Female_Body"
ARMATURE = "Female_Armature"
# Her eyes and mouth are in the bake (the contact shade of her lids on her eyes); nothing else is.
BAKE_WITH = ("Female_BodyEye_L", "Female_BodyEye_R", "Female_BodyMouth")
# Patches over her skin, never baked as part of it (Baker moves them out of the way).
OVERLAY_MATERIALS = ("T_lingerie", "T_pubic", "T_areola")
SIZE = paint.SIZE
ATTRIBUTE = "_SKIN_DETAIL"
# Paint UVs off the picture (no paint in the game, whichever layer the body is sent as).
OFF = -100.0

# The faces in the picture: her face and lips (and any other face tone).
HEAD_PREFIX = "T_face_"
HEAD_ALSO = ("T_lip", "T_lip_lit")
# Skin-coloured pieces with their own painted detail (skindetail.ts): the detail fades out next to them.
FADE_NEAR = {"T_labia", "T_vulva", "T_canal", "T_hole", "T_anus"}
FADE_REACH = 0.015  # metres

FRONT = np.array([0.0, 1.0, 0.0])  # she faces +Y in Blender (the export turns her to face the game's way)
UP = np.array([0.0, 0.0, 1.0])

# How strong each part of the look is. Multipliers are on her skin's linear colour.
LOOK = {
    "shade_tint": (0.58, 0.50, 0.60),   # her deepest occlusion, a little violet
    "shade": 1.0,
    "shade_steps": 4,                  # the shade painted in soft steps (planes), not a smooth ramp
    "crease_tint": (0.80, 0.64, 0.64),  # soft reddish-brown in her creases
    "crease": 0.9,
    "ink_tint": (0.36, 0.22, 0.22),     # the thin dark lines
    "ink": 1.0,
    "warm_tint": (1.06, 0.74, 0.74),    # her red zones
    "light_tint": (1.11, 1.07, 0.93),   # yellowish light
    "light": 0.7,
    "olive": (0.96, 1.00, 0.92),        # the cool shade's two hues
    "violet": (0.97, 0.93, 1.05),
    "cool": 0.8,
    "planes": 0.06,                    # the painted planes' value jitter
    "plane_size": 0.024,                # metres
    "mottle": 0.04,
    "socket_tint": (0.84, 0.76, 0.82),  # the painted shade round her eyes, under her brow
    "socket": 0.8,
}


def log(*args):
    print("[skin_texture]", *args, flush=True)


def is_head(name):
    return name.startswith(HEAD_PREFIX) or name in HEAD_ALSO


# ---------------------------------------------------------------- her mesh

class Mesh:
    """Her body's points, loops and faces as numpy tables, at rest (the base mesh)."""

    def __init__(self, obj):
        me = obj.data
        self.obj, self.me = obj, me
        self.nV, self.nF, self.nL = len(me.vertices), len(me.polygons), len(me.loops)
        co = np.empty(self.nV * 3, np.float32)
        me.vertices.foreach_get("co", co)
        mw = np.array(obj.matrix_world, dtype=np.float64)
        self.co = co.reshape(-1, 3).astype(np.float64) @ mw[:3, :3].T + mw[:3, 3]
        no = np.empty(self.nV * 3, np.float32)
        me.vertex_normals.foreach_get("vector", no)
        no = no.reshape(-1, 3).astype(np.float64) @ mw[:3, :3].T
        self.normal = no / np.maximum(np.linalg.norm(no, axis=1, keepdims=True), 1e-12)
        self.lv = np.empty(self.nL, np.int32)
        me.loops.foreach_get("vertex_index", self.lv)
        self.mi = np.empty(self.nF, np.int32)
        me.polygons.foreach_get("material_index", self.mi)
        lt = np.empty(self.nF, np.int32)
        me.polygons.foreach_get("loop_total", lt)
        self.lf = np.repeat(np.arange(self.nF), lt)
        # The mesh's own materials, not the slots' (an edit file may show other materials linked to the object).
        self.mats = [mat.name if mat else "" for mat in me.materials]
        self.game_uv = self.uv(me.uv_layers[0].name)
        ev = np.empty(len(me.edges) * 2, np.int32)
        me.edges.foreach_get("vertices", ev)
        self.edges = ev.reshape(-1, 2)

    def uv(self, name):
        out = np.empty(self.nL * 2, np.float32)
        self.me.uv_layers[name].data.foreach_get("uv", out)
        return out.reshape(-1, 2)

    def points(self, extra=None):
        """How many points the GLB gives her: one per vertex, game UV and material (and `extra`, e.g. Paint UV)."""
        cols = [self.lv, np.round(self.game_uv * 1e5).astype(np.int64), self.mi[self.lf]]
        if extra is not None:
            cols.append(np.round(extra * 1e5).astype(np.int64))
        return len(np.unique(np.column_stack(cols), axis=0))

    def faces_with(self, test):
        slots = np.array([test(n) for n in self.mats])
        return slots[self.mi]

    def vertices_of(self, faces):
        out = np.zeros(self.nV, bool)
        out[self.lv[faces[self.lf]]] = True
        return out

    def smooth(self, values, times):
        """Averages a per-point value with its neighbours', `times` over."""
        a, b = self.edges[:, 0], self.edges[:, 1]
        deg = np.bincount(np.concatenate([a, b]), minlength=self.nV).astype(np.float64)
        v = values.astype(np.float64)
        for _ in range(times):
            s = np.zeros_like(v)
            np.add.at(s, a, v[b])
            np.add.at(s, b, v[a])
            v = 0.5 * v + 0.5 * s / np.maximum(deg, 1)[(...,) + (None,) * (v.ndim - 1)]
        return v

    def distance_from(self, start, reach):
        """Along her surface (her edges), how far each point is from the `start` points, up to `reach`."""
        a, b = self.edges[:, 0], self.edges[:, 1]
        length = np.linalg.norm(self.co[a] - self.co[b], axis=1)
        d = np.where(start, 0.0, np.inf)
        for _ in range(200):
            new = d.copy()
            np.minimum.at(new, a, d[b] + length)
            np.minimum.at(new, b, d[a] + length)
            if np.array_equal(np.minimum(new, reach), np.minimum(d, reach)):
                break
            d = new
        return np.minimum(d, reach)

    def curvature(self):
        """Per point: how much it bulges out (+) or dips in (-), smoothed, about -1..1."""
        a, b = self.edges[:, 0], self.edges[:, 1]
        deg = np.bincount(np.concatenate([a, b]), minlength=self.nV).astype(np.float64)
        s = np.zeros((self.nV, 3))
        np.add.at(s, a, self.co[b])
        np.add.at(s, b, self.co[a])
        lap = s / np.maximum(deg, 1)[:, None] - self.co
        elen = np.zeros(self.nV)
        length = np.linalg.norm(self.co[a] - self.co[b], axis=1)
        np.add.at(elen, a, length)
        np.add.at(elen, b, length)
        elen /= np.maximum(deg, 1)
        k = -np.einsum("ij,ij->i", lap, self.normal) / np.maximum(elen, 1e-5) ** 2 * 0.004
        k = self.smooth(k, 3)
        return np.tanh(k / max(np.percentile(np.abs(k), 95), 1e-9))


# ---------------------------------------------------------------- landmarks

class Landmarks:
    """Where her face, joints and hands are, at rest: from her face's own points, her eyes and her bones."""

    def __init__(self, m):
        arm = bpy.data.objects[ARMATURE]

        def head(name):
            return np.array(arm.matrix_world @ arm.data.bones[name].head_local)

        face = m.vertices_of(m.faces_with(lambda n: n == "T_face_skin"))
        fc = m.co[face]
        mid = fc[np.abs(fc[:, 0]) < 0.004]
        self.nose = mid[np.argmax(mid[:, 1] * FRONT[1])]
        self.head_bottom = fc[:, 2].min()
        deps = bpy.context.evaluated_depsgraph_get()
        eyes = []
        for name in ("Female_BodyEye_L", "Female_BodyEye_R"):
            obj = bpy.data.objects.get(name)
            if obj is not None:
                ev = obj.evaluated_get(deps)
                pts = np.array([ev.matrix_world @ v.co for v in ev.data.vertices])
                eyes.append(pts.mean(0))
        if len(eyes) != 2:  # no eyes: from her nose
            eyes = [self.nose + np.array([sx * 0.032, -0.04 * FRONT[1], 0.037]) for sx in (-1, 1)]
        self.eye = sorted(eyes, key=lambda e: e[0])
        eye_z = np.mean([e[2] for e in eyes])
        self.eye_z = eye_z
        band = fc[np.abs(fc[:, 2] - (eye_z - 0.01)) < 0.03]
        self.ears = [band[np.argmin(band[:, 0])], band[np.argmax(band[:, 0])]]
        chin = mid[mid[:, 2] < self.nose[2] - 0.04]
        self.chin = chin[np.argmax(chin[:, 1] * FRONT[1])] if len(chin) else self.nose - np.array([0, 0.03, 0.07])
        self.elbows, self.knees = [], []
        for s in "LR":
            elbow = head(f"Female_ForeArm_{s}")
            ring = m.co[(np.abs(m.co[:, 2] - elbow[2]) < 0.02) & (np.abs(m.co[:, 0] - elbow[0]) < 0.06)]
            # The point of her elbow: the back of her arm there.
            self.elbows.append(ring[np.argmin(ring[:, 1] * FRONT[1])] if len(ring) else elbow)
            knee = head(f"Female_Shin_{s}")
            ring = m.co[(np.abs(m.co[:, 2] - knee[2] - 0.015) < 0.02) & (np.abs(m.co[:, 0] - knee[0]) < 0.07)]
            self.knees.append(ring[np.argmax(ring[:, 1] * FRONT[1])] if len(ring) else knee)
        log("landmarks: nose", self.nose.round(3), "eyes", [e.round(3) for e in self.eye], "ears",
            [e.round(3) for e in self.ears], "chin", self.chin.round(3), "elbows", [e.round(3) for e in self.elbows],
            "knees", [k.round(3) for k in self.knees])


# ---------------------------------------------------------------- the Paint UV: her face, whole

def _importance(m, lm):
    """Room for each point of her face in the picture (the unwrap's weights): the front of her face most, the back
    of her head (under her hair) least."""
    back = (lm.nose[1] - m.co[:, 1]) * FRONT[1]  # how far behind her nose tip
    w = 1.0 - np.clip((back - 0.05) / 0.07, 0, 1) * 0.92
    w *= 1.0 - 0.4 * np.clip((lm.chin[2] - m.co[:, 2]) / 0.03, 0, 1)
    return np.clip(w, 0.06, 1.0)


def build_paint_uv(m, lm):
    """Gives her body a fresh Paint UV map: her face (with her lips) unwrapped whole to fill the picture, the rest
    off it. Raises if it would add GLB points."""
    started = time.time()
    obj, me = m.obj, m.me
    if me.uv_layers.get(paint.UV_NAME) is not None:
        me.uv_layers.remove(me.uv_layers[paint.UV_NAME])
    me.uv_layers.active_index = 0
    before = m.points()
    head = m.faces_with(is_head)
    layer = me.uv_layers.new(name=paint.UV_NAME)
    layer.data.foreach_set("uv", np.full(m.nL * 2, OFF, np.float32))
    me.uv_layers.active = layer
    seams = np.zeros(len(me.edges), bool)
    me.edges.foreach_get("use_seam", seams)
    me.edges.foreach_set("use_seam", np.zeros(len(me.edges), bool))
    me.polygons.foreach_set("select", head)
    group = obj.vertex_groups.new(name="_paint_importance")
    imp = np.round(_importance(m, lm), 2)
    for value in np.unique(imp):
        group.add(np.nonzero(imp == value)[0].tolist(), float(value), "REPLACE")
    view_layer = bpy.context.view_layer
    previous = view_layer.objects.active
    hidden = (obj.hide_get(), obj.hide_viewport, obj.hide_select)
    obj.hide_viewport = False
    obj.hide_select = False
    obj.hide_set(False)
    view_layer.objects.active = obj
    tool = bpy.context.tool_settings
    tool.mesh_select_mode = (False, False, True)
    tool.use_uv_select_sync = False
    try:
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.unwrap(method="MINIMUM_STRETCH", fill_holes=True, iterations=40, margin=0.0,
                          use_weights=True, weight_group=group.name, weight_factor=1.0)
        bpy.ops.uv.select_all(action="SELECT")
        bpy.ops.uv.pack_islands(rotate=True, rotate_method="ANY", scale=True, margin_method="FRACTION",
                                margin=0.01, shape_method="CONCAVE")
        bpy.ops.object.mode_set(mode="OBJECT")
    finally:
        if obj.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        me.edges.foreach_set("use_seam", seams)
        me.polygons.foreach_set("select", np.zeros(m.nF, bool))
        obj.vertex_groups.remove(group)
        obj.hide_set(hidden[0])
        obj.hide_viewport = hidden[1]
        obj.hide_select = hidden[2]
        view_layer.objects.active = previous
    uv = m.uv(paint.UV_NAME)
    live = head[m.lf]
    uv[~live] = OFF
    # Clear of the picture's edges (u = 1 would read as the next layer in the game).
    lo, hi = uv[live].min(0), uv[live].max(0)
    fit = min(1.0, 0.98 / max(hi - lo))
    uv[live] = (uv[live] - (lo + hi) / 2) * fit + 0.5
    me.uv_layers[paint.UV_NAME].data.foreach_set("uv", uv.ravel())
    me.uv_layers.active_index = 0
    me.uv_layers[0].active_render = True
    after = m.points(m.uv(paint.UV_NAME))
    log(f"paint UV: {int(head.sum())} faces of her face in the picture; GLB points {before} -> {after} "
        f"({time.time() - started:.0f} s)")
    if after != before:
        raise RuntimeError(f"the Paint UV would add {after - before} GLB points to {obj.name}")
    return before


# ---------------------------------------------------------------- bakes (Cycles)

class Baker:
    """A copy of her body with one bake material, alone in the render with her eyes and mouth; everything put back
    after."""

    def __init__(self, m):
        self.m = m
        scene = bpy.context.scene
        self.scene = scene
        self.saved = {
            "engine": scene.render.engine,
            "samples": scene.cycles.samples,
            "device": scene.cycles.device,
            "world": scene.world,
            "hide_render": {o.name: o.hide_render for o in scene.objects},
        }
        scene.render.engine = "CYCLES"
        scene.cycles.device = "CPU"
        world = bpy.data.worlds.new("_skin_bake_world")
        scene.world = world
        self.world = world
        src = m.obj
        self.copy = src.copy()
        self.copy.data = src.data.copy()
        self.copy.name = "_skin_bake_body"
        scene.collection.objects.link(self.copy)
        for o in scene.objects:
            o.hide_render = o.name not in BAKE_WITH and o is not self.copy
        me = self.copy.data
        # The overlays joined into her skin (her underwear layer, pubic patch, nipple discs) lie just over it and
        # would shade it in the bake (a dark, jagged copy of the underwear layer all over her torso): in the copy
        # they are moved far away, which keeps every point's index.
        names = [mat.name if mat else "" for mat in src.data.materials]
        overlays = {i for i, n in enumerate(names) if n in OVERLAY_MATERIALS}
        far = {v for p in me.polygons if p.material_index in overlays for v in p.vertices}
        for v in far:
            me.vertices[v].co = (0.0, 0.0, -100.0)
        me.materials.clear()
        self.material = bpy.data.materials.new("_skin_bake")
        self.material.use_nodes = True
        me.materials.append(self.material)
        me.uv_layers.active = me.uv_layers[paint.UV_NAME]
        me.uv_layers[paint.UV_NAME].active_render = True
        nodes = self.material.node_tree.nodes
        nodes.clear()
        self.out = nodes.new("ShaderNodeOutputMaterial")
        self.emit = nodes.new("ShaderNodeEmission")
        self.tex = nodes.new("ShaderNodeTexImage")
        self.material.node_tree.links.new(self.emit.outputs[0], self.out.inputs[0])
        nodes.active = self.tex
        for o in bpy.context.view_layer.objects:
            o.select_set(False)
        self.copy.hide_set(False)
        self.copy.select_set(True)
        bpy.context.view_layer.objects.active = self.copy

    def close(self):
        scene = self.scene
        for name, hide in self.saved["hide_render"].items():
            o = scene.objects.get(name)
            if o is not None:
                o.hide_render = hide
        mesh = self.copy.data
        bpy.data.objects.remove(self.copy)
        bpy.data.meshes.remove(mesh)
        bpy.data.materials.remove(self.material)
        scene.world = self.saved["world"]
        bpy.data.worlds.remove(self.world)
        scene.render.engine = self.saved["engine"]
        scene.cycles.samples = self.saved["samples"]
        scene.cycles.device = self.saved["device"]

    def _emit_from(self, socket):
        links = self.material.node_tree.links
        for link in list(self.emit.inputs[0].links):
            links.remove(link)
        if socket is not None:
            links.new(socket, self.emit.inputs[0])

    def image(self, kind, size=SIZE, samples=1, distance=0.1, source=None):
        """Bakes into a float picture through the Paint UV and returns it as (size, size, 4) (row 0 at the bottom).
        kind: AO, NORMAL (object space) or EMIT (source: a node socket)."""
        image = bpy.data.images.new("_skin_bake_img", size, size, alpha=True, float_buffer=True)
        image.colorspace_settings.name = "Non-Color"
        self.tex.image = image
        self.scene.cycles.samples = samples
        self.world.light_settings.distance = distance
        self._emit_from(source)
        bpy.ops.object.bake(type=kind, normal_space="OBJECT", margin=24, margin_type="EXTEND", use_clear=True,
                            target="IMAGE_TEXTURES")
        px = np.empty(size * size * 4, np.float32)
        image.pixels.foreach_get(px)
        bpy.data.images.remove(image)
        return px.reshape(size, size, 4)

    def reach(self, size=SIZE):
        """The pixels her face covers, and the bakes' margin round them."""
        rgb = self.material.node_tree.nodes.new("ShaderNodeRGB")
        rgb.outputs[0].default_value = (1, 1, 1, 1)
        out = self.image("EMIT", size, source=rgb.outputs[0])[..., 0] > 0.5
        self.material.node_tree.nodes.remove(rgb)
        return out

    def points(self, kind, samples=64, distance=0.1):
        """Bakes onto her points (a colour attribute) and returns (nV, 4)."""
        me = self.copy.data
        attr = me.color_attributes.new("_skin_bake_pts", "FLOAT_COLOR", "POINT")
        me.color_attributes.active_color = attr
        self.scene.cycles.samples = samples
        self.world.light_settings.distance = distance
        bpy.ops.object.bake(type=kind, target="VERTEX_COLORS", use_clear=True)
        attr = me.color_attributes["_skin_bake_pts"]
        out = np.empty(len(me.vertices) * 4, np.float32)
        attr.data.foreach_get("color", out)
        me.color_attributes.remove(attr)
        return out.reshape(-1, 4)

    def attribute_socket(self, name, values):
        """A colour attribute on the copy holding `values` (nV, 3), as a node socket for EMIT bakes."""
        me = self.copy.data
        attr = me.color_attributes.new(name, "FLOAT_COLOR", "POINT")
        rgba = np.ones((len(me.vertices), 4), np.float32)
        rgba[:, :3] = values
        attr.data.foreach_set("color", rgba.ravel())
        node = self.material.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = name
        return node.outputs["Color"]

    def corner_socket(self, name, values):
        """A colour attribute per face corner on the copy holding `values` (nL, 3): crisp from face to face."""
        me = self.copy.data
        attr = me.color_attributes.new(name, "FLOAT_COLOR", "CORNER")
        rgba = np.ones((len(me.loops), 4), np.float32)
        rgba[:, :3] = values
        attr.data.foreach_set("color", rgba.ravel())
        node = self.material.node_tree.nodes.new("ShaderNodeVertexColor")
        node.layer_name = name
        return node.outputs["Color"]

    def position_socket(self, lo, hi):
        """Object position mapped from [lo, hi] to [0, 1]."""
        nodes = self.material.node_tree.nodes
        geo = nodes.new("ShaderNodeNewGeometry")
        mr = nodes.new("ShaderNodeMapRange")
        mr.data_type = "FLOAT_VECTOR"
        mr.clamp = False
        self.material.node_tree.links.new(geo.outputs["Position"], mr.inputs["Vector"])
        vec = [s for s in mr.inputs if s.type == "VECTOR" and s.enabled]
        # Vector, From Min, From Max, To Min, To Max (vector versions)
        _, from_min, from_max, to_min, to_max = vec[:5]
        from_min.default_value = tuple(lo)
        from_max.default_value = tuple(hi)
        to_min.default_value = (0, 0, 0)
        to_max.default_value = (1, 1, 1)
        return mr.outputs["Vector"]


# ---------------------------------------------------------------- the detail

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def soft_steps(x, steps, softness=0.35):
    """x (0..1) painted in `steps` flat planes with soft edges between them."""
    s = x * steps
    base = np.floor(s)
    f = smoothstep(0.5 - softness / 2, 0.5 + softness / 2, s - base)
    return np.clip((base + f) / steps, 0, 1)


def _hash3(i, j, k, seed):
    h = (i * 73856093) ^ (j * 19349663) ^ (k * 83492791) ^ (seed * 2654435761)
    h = (h ^ (h >> 13)) * 1274126177
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(np.float64) / float(0xFFFFFF)


def value_noise(p, scale, seed):
    """Smooth 3D value noise (-1..1) at points p (n, 3), cells `scale` metres."""
    q = p / scale
    i = np.floor(q).astype(np.int64)
    f = q - i
    f = f * f * (3 - 2 * f)
    out = np.zeros(len(p))
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[:, 0] if dx else 1 - f[:, 0]) * (f[:, 1] if dy else 1 - f[:, 1]) * (f[:, 2] if dz else 1 - f[:, 2])
                out += w * _hash3(i[:, 0] + dx, i[:, 1] + dy, i[:, 2] + dz, seed)
    return out * 2 - 1


def planes(p, size, seed):
    """Painted planes: soft-edged 3D cells, each with its own random value (-1..1) and hue pick (0..1)."""
    q = p / size
    base = np.floor(q).astype(np.int64)
    best = np.full(len(p), np.inf)
    second = np.full(len(p), np.inf)
    cell = np.zeros((len(p), 3), np.int64)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                c = base + np.array([dx, dy, dz])
                jitter = np.stack([_hash3(c[:, 0], c[:, 1], c[:, 2], seed + k) for k in range(3)], 1)
                d = np.sum((c + jitter - q) ** 2, axis=1)
                closer = d < best
                second = np.where(closer, best, np.minimum(second, d))
                best = np.where(closer, d, best)
                cell[closer] = c[closer]
    value = _hash3(cell[:, 0], cell[:, 1], cell[:, 2], seed + 7) * 2 - 1
    hue = _hash3(cell[:, 0], cell[:, 1], cell[:, 2], seed + 11)
    edge = smoothstep(0.0, 0.25, np.sqrt(second) - np.sqrt(best))  # 0 at a cell's edge
    return value * (0.4 + 0.6 * edge), hue


def ellipsoid(p, centre, radius):
    d = (p - centre) / np.asarray(radius)
    return np.exp(-np.sum(d * d, axis=1))


def capsule(p, a, b, radius):
    d = b - a
    t = np.clip(((p - a) @ d) / (d @ d), 0, 1)
    q = a + t[:, None] * d
    r = np.linalg.norm(p - q, axis=1) / radius
    return np.exp(-r * r)


def detail(f, lm, fine=True):
    """The detail at samples (points or pixels): f holds p (n, 3), n (n, 3) normals, ao (1 open .. 0 shut), crease
    (0 open .. 1 tight), convex, concave, lip, fingers, tips, bust, fade (0 = no detail .. 1). Returns (multiplier
    (n, 3), strength (n,), pieces for debugging)."""
    p, n = f["p"], f["n"]
    count = len(p)
    one = np.ones((count, 3))
    mult = one.copy()
    pieces = {}

    def tint(colour, amount):
        return one + (np.asarray(colour)[None, :] - 1) * np.clip(amount, 0, 1)[:, None]

    facing = n @ FRONT
    up = n @ UP
    # Shade: her own occlusion, in soft painted steps, a little violet.
    shade = 1 - soft_steps(np.clip(f["ao"], 0, 1) ** 0.9, LOOK["shade_steps"])
    pieces["shade"] = shade
    mult *= tint(LOOK["shade_tint"], shade * LOOK["shade"])
    # Cool hues in the shade and on the planes turned down and away: olive or violet, by painted plane.
    plane_value, plane_hue = planes(p, LOOK["plane_size"], 3)
    cool = np.clip(shade * 1.4 + np.clip(-up, 0, 1) * 0.5 + np.clip(-facing, 0, 1) * 0.2, 0, 1) * LOOK["cool"]
    pieces["cool"] = cool
    olive = plane_hue < 0.5
    mult *= np.where(olive[:, None], tint(LOOK["olive"], cool), tint(LOOK["violet"], cool))
    # Creases: soft reddish-brown where her skin folds in.
    crease = np.clip(f["crease"] * 1.2, 0, 1) ** 1.2
    mult *= tint(LOOK["crease_tint"], np.clip(crease + f["concave"] * 0.35, 0, 1) * LOOK["crease"])
    # The planes round her eyes, under her brow: a cool painted shade (her lids' own shade is in the creases).
    socket = np.zeros(count)
    for e in lm.eye:
        socket += ellipsoid(p, e + np.array([0, 0.012 * FRONT[1], 0.006]), (0.026, 0.03, 0.02))
    socket = np.clip(socket, 0, 1) * (1 - f["lip"])
    pieces["socket"] = socket
    mult *= tint(LOOK["socket_tint"], socket * LOOK["socket"])
    # Red zones.
    eye_mid = (lm.eye[0] + lm.eye[1]) / 2
    warm = np.zeros(count)
    for e in lm.eye:
        side = np.sign(e[0])
        cheek = e + np.array([side * 0.012, 0.010 * FRONT[1], -0.030])
        warm += 0.9 * ellipsoid(p, cheek, (0.022, 0.03, 0.018)) * np.clip(facing + 0.3, 0, 1)
    warm += 0.85 * ellipsoid(p, lm.nose + np.array([0, -0.004 * FRONT[1], -0.002]), (0.013, 0.012, 0.012))
    for ear in lm.ears:
        warm += 0.7 * ellipsoid(p, ear, (0.02, 0.028, 0.03))
    warm += 0.4 * ellipsoid(p, lm.chin, (0.016, 0.014, 0.012))
    for k in lm.knees:
        warm += 0.6 * ellipsoid(p, k, (0.045, 0.04, 0.05))
    for e in lm.elbows:
        warm += 0.55 * ellipsoid(p, e, (0.035, 0.035, 0.04))
    warm += f["fingers"] * (0.25 + 0.35 * np.clip(f["convex"], 0, 1)) + f["tips"] * 0.35
    warm += f["bust"] * np.clip(-up * 1.5, 0, 1) * 0.5
    warm += 0.35 * smoothstep(0.12, 0.03, p[:, 2])  # toes and heels
    warm *= 1 - f["lip"]
    warm = np.clip(warm, 0, 1)
    pieces["warm"] = warm
    mult *= tint(LOOK["warm_tint"], warm)
    # Yellowish light: her forehead and nose bridge, and the planes facing up and forward (in steps).
    key_dir = FRONT * 0.55 + UP * 0.8
    key = np.clip(n @ (key_dir / np.linalg.norm(key_dir)), 0, 1)
    light = soft_steps(key, 3) * 0.45 * (1 - shade)
    light += 0.7 * smoothstep(lm.eye_z + 0.012, lm.eye_z + 0.03, p[:, 2]) * smoothstep(0.2, 0.7, facing) \
        * ellipsoid(p, eye_mid + np.array([0, 0, 0.045]), (0.06, 0.09, 0.05))
    bridge_top = eye_mid + np.array([0, 0.035 * FRONT[1], 0.006])
    light += 0.8 * capsule(p, bridge_top, lm.nose + np.array([0, 0, 0.008]), 0.006) * smoothstep(0.3, 0.8, facing)
    light *= 1 - 0.7 * f["lip"]
    light = np.clip(light, 0, 1) * LOOK["light"]
    pieces["light"] = light
    mult *= tint(LOOK["light_tint"], light)
    # Ink: thin dark lines in her tightest creases.
    ink = smoothstep(0.42, 0.8, f["crease"]) * (1 - 0.5 * f["lip"])
    pieces["ink"] = ink
    mult *= tint(LOOK["ink_tint"], ink * LOOK["ink"])
    # Painted planes and mottle.
    jitter = plane_value * LOOK["planes"]
    mottle = value_noise(p, 0.03, 21) * 0.6
    if fine:
        mottle = mottle + value_noise(p, 0.009, 22) * 0.4
    mottle *= LOOK["mottle"]
    redder = value_noise(p, 0.05, 23) * 0.02
    mult *= (1 + jitter + mottle)[:, None]
    mult *= np.stack([1 + redder, 1 - redder * 0.5, 1 - redder * 0.5], 1)
    return mult, np.clip(f["fade"], 0, 1), pieces


# ---------------------------------------------------------------- pictures

def write_png(path, rgba):
    """An 8-bit RGBA PNG with no colour chunks (the game reads its bytes as they are), rows top to bottom."""
    h, w, _ = rgba.shape
    raw = np.clip(rgba, 0, 255).astype(np.uint8)
    sub = raw.astype(np.int16).reshape(h, w * 4)
    sub[:, 4:] -= raw.reshape(h, w * 4)[:, :-4]
    rows = np.concatenate([np.ones((h, 1), np.uint8), (sub % 256).astype(np.uint8)], 1)
    data = zlib.compress(rows.tobytes(), 9)

    def chunk(kind, body):
        return struct.pack(">I", len(body)) + kind + body + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF)

    with open(path, "wb") as out:
        out.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
                  + chunk(b"IDAT", data) + chunk(b"IEND", b""))


def fill_outside(rgb, inside, levels=12):
    """Fills the pixels outside `inside` from the nearest inside (push-pull), so mipmaps never mix in empty pixels."""
    img = np.where(inside[..., None], rgb, 0.0)
    w = inside.astype(np.float64)
    pyramid = [(img, w)]
    for _ in range(levels):
        img, w = pyramid[-1]
        if img.shape[0] < 2:
            break
        h2, w2 = img.shape[0] // 2, img.shape[1] // 2
        si = (img * w[..., None])[: h2 * 2, : w2 * 2].reshape(h2, 2, w2, 2, -1).sum((1, 3))
        sw = w[: h2 * 2, : w2 * 2].reshape(h2, 2, w2, 2).sum((1, 3))
        pyramid.append((si / np.maximum(sw, 1e-9)[..., None], np.minimum(sw, 1)))
    img, _ = pyramid[-1]
    for level in range(len(pyramid) - 2, -1, -1):
        fine, fw = pyramid[level]
        up = np.repeat(np.repeat(img, 2, 0), 2, 1)[: fine.shape[0], : fine.shape[1]]
        img = fine * fw[..., None] + up * (1 - fw[..., None])
    return np.where(inside[..., None], rgb, img)


# ---------------------------------------------------------------- the whole job

def point_fields(m):
    """What the detail needs at each of her points that isn't baked: curvature, her lips, hands, bust, the fade."""
    curv = m.curvature()
    lip = m.vertices_of(m.faces_with(lambda n: n in HEAD_ALSO)).astype(np.float64)
    lip = np.clip(m.smooth(lip, 2) * 1.5, 0, 1)
    groups = {g.name: g.index for g in m.obj.vertex_groups}

    def weight(*names):
        out = np.zeros(m.nV)
        idx = {groups[n] for n in names if n in groups}
        for v in m.obj.data.vertices:
            for g in v.groups:
                if g.group in idx:
                    out[v.index] += g.weight
        return np.clip(out, 0, 1)

    fingers = weight(*(f"Female_Hand{p}_{s}" for p in ("Fingers", "Tips", "Thumb") for s in "LR"))
    tips = weight("Female_HandTips_L", "Female_HandTips_R")
    bust = m.smooth(weight("Female_Bust"), 2)
    near = m.vertices_of(m.faces_with(lambda n: n in FADE_NEAR))
    fade = smoothstep(0.0, FADE_REACH, m.distance_from(near, FADE_REACH)) if near.any() else np.ones(m.nV)
    return {"convex": np.clip(curv, 0, 1), "concave": np.clip(-curv, 0, 1), "lip": lip, "fingers": fingers,
            "tips": tips, "bust": np.clip(bust, 0, 1), "fade": fade}


# ---------------------------------------------------------------- her lips: the refs' soft, sprayed lip paint
# (2026-11-21, the user: the refs' lips are blurred, sprayed colour; hers were hard flat swatches.) Self-contained:
# lip_point_fields() at her points, lip_multiplier() on her points and her face's picture, applied after detail().
# Measured on Luna's and Invisible Woman's painted mouths: deepest and richest along the line between the lips,
# lighter toward the lips' border, no hard edge (the colour sprays out into the skin, most at the corners and under
# the lower lip, tightest along the upper lip's top), a faint light line on the cupid's bow, no flat highlight block.
LIP_MATS = ("T_lip", "T_lip_lit")
LIP_LOOK = {
    "deep": (0.66, 0.44, 0.50),        # x her lip colour, along the line between her lips (richer, darker)
    "mid": (0.95, 0.88, 0.90),            # her lip colour itself, halfway across
    "edge": (1.05, 1.30, 1.11),        # x her lip colour, at the lips' border: halfway to her skin (no hard edge)
    "halo_tint": (0.97, 0.89, 0.93),   # x her skin colour, just outside the border: halfway to her lips
    "halo": 1.0,                       # how much of halo_tint at the border (it fades out from there)
    "halo_tight": 0.0010,              # metres: how far it reaches along the upper lip's top
    "halo_wide": 0.0026,               # at the corners and under the lower lip
    "bow": 1.10,                       # the light line on the cupid's bow (x her skin)
    "upper": (0.90, 0.84, 0.86),       # the upper lip deeper than the lower (the refs')
    "lower": (1.06, 1.10, 1.07),       # the lower lip lighter
    "sheen": (1.10, 1.15, 1.12),       # a broad soft glow across the lower lip's middle (no hard highlight)
    "brush": 0.15,                     # soft brush streaks along her lips (+- of her colour)
    "brush_size": (0.011, 0.004, 0.0016),  # metres (across her mouth, depth, up): long, thin, along the lips
}


def _material_rgb(name):
    """A material's average colour (its picture's, or its base colour), linear."""
    mat = bpy.data.materials.get(name)
    if mat is None:
        return None
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image is not None and node.image.size[0]:
                px = np.empty(node.image.size[0] * node.image.size[1] * 4, np.float32)
                node.image.pixels.foreach_get(px)
                return px.reshape(-1, 4)[:, :3].mean(0).astype(np.float64)
        for node in mat.node_tree.nodes:
            if node.type == "BSDF_PRINCIPLED":
                return np.array(node.inputs["Base Color"].default_value[:3], np.float64)
    return np.array(mat.diffuse_color[:3], np.float64)


def lip_point_fields(m):
    """Per point: (where it sits across her lips: 0 on the line between them .. 1 at their border; the halo's
    strength outside; the cupid's-bow line) and (on the lit block, on her lips, 0)."""
    lip_f = m.faces_with(lambda n: n in LIP_MATS)
    lit_f = m.faces_with(lambda n: n == "T_lip_lit")
    lips = m.vertices_of(lip_f)
    others = m.vertices_of(~lip_f)
    border = lips & others
    # the line between her lips: edges of lip faces used by one face only
    from collections import Counter
    count = Counter()
    starts = np.r_[0, np.cumsum(np.bincount(m.lf, minlength=m.nF))[:-1]]
    totals = np.bincount(m.lf, minlength=m.nF)
    for f in np.nonzero(lip_f)[0]:
        vs = m.lv[starts[f]:starts[f] + totals[f]]
        for a, b in zip(vs, np.roll(vs, -1)):
            count[(min(a, b), max(a, b))] += 1
    inner = np.zeros(m.nV, bool)
    for (a, b), c in count.items():
        if c == 1 and not (border[a] and border[b]):
            inner[a] = inner[b] = True
    d_border = m.distance_from(border, 0.012)
    d_inner = m.distance_from(inner, 0.012)
    # across her lips as seen from the front (x, z): the line between her lips seen from the front is where they meet;
    # measured along the skin it would sit deep in her mouth and leave the whole visible lip "at the border"
    xz = m.co[:, [0, 2]]
    li = np.nonzero(lips)[0]
    d_in2 = np.sqrt(((xz[li, None, :] - xz[None, inner, :]) ** 2).sum(-1)).min(1)
    d_bo2 = np.sqrt(((xz[li, None, :] - xz[None, border, :]) ** 2).sum(-1)).min(1)
    across = np.zeros(m.nV)
    across[li] = np.clip(d_in2 / np.maximum(d_in2 + d_bo2, 1e-6), 0, 1)
    mouth = m.co[inner].mean(0) if inner.any() else m.co[lips].mean(0)
    half_w = max(np.abs(m.co[lips, 0] - mouth[0]).max(), 1e-6)
    above = m.co[:, 2] > mouth[2]
    side = np.clip(np.abs(m.co[:, 0] - mouth[0]) / half_w, 0, 1.3)
    sigma = np.where(above, LIP_LOOK["halo_tight"] + (LIP_LOOK["halo_wide"] - LIP_LOOK["halo_tight"])
                     * np.clip((side - 0.6) / 0.4, 0, 1), LIP_LOOK["halo_wide"])
    halo = np.where(lips, 0.0, LIP_LOOK["halo"] * np.exp(-(d_border / sigma) ** 2))
    bow = (~lips) & above & (side < 0.35) & (d_border > 0.0002) & (d_border < 0.0009)
    lit = m.vertices_of(lit_f) & ~m.vertices_of(lip_f & ~lit_f)
    log(f"lips: {int(lips.sum())} points, border {int(border.sum())}, line {int(inner.sum())}, halo "
        f"{int((halo > 0.02).sum())}, bow {int(bow.sum())}")
    on_lip_corner = lip_f[m.lf].astype(np.float64)
    # upper or lower lip: above or below where they meet (the line between them, seen from the front)
    order = np.argsort(m.co[inner, 0])
    line_z = np.interp(m.co[:, 0], m.co[inner, 0][order], m.co[inner, 2][order])
    upper = (m.co[:, 2] > line_z).astype(np.float64)
    return (np.stack([across, halo, bow.astype(np.float64)], 1),
            np.stack([np.clip(side, 0, 1), lips.astype(np.float64), upper], 1),
            np.stack([on_lip_corner, np.zeros(m.nL), np.zeros(m.nL)], 1))


def lip_face_mask(m, size=None):
    """Her lip faces drawn into the picture from her Paint UV map (1 on them, 0 off; edge pixels by coverage, 3x3)."""
    size = size or SIZE
    uv = m.uv("Paint").astype(np.float64)
    lip_f = m.faces_with(lambda n: n in LIP_MATS)
    starts = np.r_[0, np.cumsum(np.bincount(m.lf, minlength=m.nF))[:-1]]
    totals = np.bincount(m.lf, minlength=m.nF)
    acc = np.zeros((size, size))
    offs = [(-1 / 3, -1 / 3), (0, -1 / 3), (1 / 3, -1 / 3), (-1 / 3, 0), (0, 0), (1 / 3, 0), (-1 / 3, 1 / 3), (0, 1 / 3), (1 / 3, 1 / 3)]
    for f in np.nonzero(lip_f)[0]:
        q = uv[starts[f]:starts[f] + totals[f]] * size - 0.5          # pixel centres at integers; row = v
        for k in range(1, len(q) - 1):
            a, b, c = q[0], q[k], q[k + 1]
            x0, x1 = int(np.floor(min(a[0], b[0], c[0]))), int(np.ceil(max(a[0], b[0], c[0])))
            y0, y1 = int(np.floor(min(a[1], b[1], c[1]))), int(np.ceil(max(a[1], b[1], c[1])))
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, size - 1), min(y1, size - 1)
            if x1 < x0 or y1 < y0: continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
            den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(den) < 1e-12: continue
            cover = np.zeros(gx.shape)
            for ox, oy in offs:
                px, py = gx + ox, gy + oy
                l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / den
                l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / den
                cover += (l1 >= 0) & (l2 >= 0) & (1 - l1 - l2 >= 0)
            sub = acc[y0:y1 + 1, x0:x1 + 1]
            np.maximum(sub, cover / len(offs), out=sub)
    return acc


def lip_multiplier(c, d, p):
    """The lip paint's multiplier (N x 3) from lip_point_fields' two triples and the positions p (N x 3), at points or
    picture pixels."""
    across, halo, bow = c[:, 0], c[:, 1], c[:, 2]
    side, inside, upper = np.clip(d[:, 0], 0, 1), np.clip(d[:, 1], 0, 1), np.clip(d[:, 2], 0, 1)
    raw_across = across.copy()
    # richest in the middle of her mouth, easing toward the soft edge colour at the corners (the refs')
    across = np.maximum(across, smoothstep(0.55, 1.0, side) * 0.85)
    deep, mid, edge = (np.array(LIP_LOOK[k]) for k in ("deep", "mid", "edge"))
    lip_rgb, skin_rgb = _material_rgb("T_lip"), _material_rgb("T_face_skin")
    if lip_rgb is not None and skin_rgb is not None:
        # at the border her lip shows exactly what the skin just outside shows (skin x halo_tint): no line at all
        edge = skin_rgb * np.array(LIP_LOOK["halo_tint"]) / np.maximum(lip_rgb, 1e-4)
    a1 = np.clip(across * 2, 0, 1)[:, None]; a2 = np.clip(across * 2 - 1, 0, 1)[:, None]
    in_mult = np.where(across[:, None] < 0.5, deep[None] * (1 - a1) + mid[None] * a1, mid[None] * (1 - a2) + edge[None] * a2)
    # (the lit block: its material is given her lip's colour in the master instead; shared edge points can't fade it)
    # the upper lip deeper, the lower lighter, with a broad soft glow across the lower lip's middle
    up_c, lo_c = np.array(LIP_LOOK["upper"]), np.array(LIP_LOOK["lower"])
    in_mult *= lo_c[None] * (1 - upper[:, None]) + up_c[None] * upper[:, None]
    sheen = (1 - upper) * np.exp(-((raw_across - 0.45) / 0.28) ** 2) * np.exp(-(side / 0.45) ** 2)
    in_mult *= 1 + (np.array(LIP_LOOK["sheen"])[None] - 1) * sheen[:, None]
    # soft brush streaks along her lips (and a little in the spray just outside)
    q = p / np.array(LIP_LOOK["brush_size"])[None]
    brush = 0.65 * value_noise(q, 1.0, 71) + 0.35 * value_noise(q * 2.3, 1.0, 72)
    in_mult *= (1 + LIP_LOOK["brush"] * brush)[:, None]
    out_mult = 1 + (np.array(LIP_LOOK["halo_tint"])[None] - 1) * np.clip(halo, 0, 1)[:, None]
    out_mult *= 1 + (LIP_LOOK["bow"] - 1) * np.clip(bow, 0, 1)[:, None]
    out_mult *= (1 + 0.5 * LIP_LOOK["brush"] * brush * np.clip(halo, 0, 1))[:, None]
    return out_mult * (1 - inside[:, None]) + in_mult * inside[:, None]


def _point_areas(m):
    """Each point's share of her surface (a third of each triangle round it)."""
    me = m.me
    me.calc_loop_triangles()
    tri = np.empty(len(me.loop_triangles) * 3, np.int32)
    me.loop_triangles.foreach_get("vertices", tri)
    tri = tri.reshape(-1, 3)
    p = m.co[tri]
    area = 0.5 * np.linalg.norm(np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]), axis=1)
    out = np.zeros(m.nV)
    for k in range(3):
        np.add.at(out, tri[:, k], area / 3)
    return out


def _gray_png(path, values):
    gray = np.round(np.clip(values, 0, 1) * 255)
    rgba = np.stack([gray, gray, gray, np.full_like(gray, 255)], -1)
    write_png(path, rgba)


def run(obj, debug_dir=None):
    started = time.time()
    m = Mesh(obj)
    lm = Landmarks(m)
    build_paint_uv(m, lm)
    pts = point_fields(m)
    lip_c, lip_d, lip_e = lip_point_fields(m)
    bake = Baker(m)
    try:
        # Her points: occlusion (soft, far) and creases (tight, near).
        ao_pts = bake.points("AO", samples=96, distance=0.12)[:, 0]
        crease_pts = 1 - bake.points("AO", samples=96, distance=0.008)[:, 0]
        log(f"baked her points ({time.time() - started:.0f} s)")
        # The picture: her face.
        reach = bake.reach()
        ao_img = bake.image("AO", samples=128, distance=0.12)[..., 0]
        crease_img = 1 - bake.image("AO", samples=128, distance=0.006)[..., 0]
        normal_img = bake.image("NORMAL", samples=4)[..., :3] * 2 - 1
        lo, hi = m.co.min(0) - 0.01, m.co.max(0) + 0.01
        pos_img = bake.image("EMIT", samples=4, source=bake.position_socket(lo, hi))[..., :3] * (hi - lo) + lo
        a = bake.image("EMIT", source=bake.attribute_socket(
            "_a", np.stack([pts["convex"], pts["concave"], pts["lip"]], 1)))[..., :3]
        b = bake.image("EMIT", source=bake.attribute_socket(
            "_b", np.stack([pts["fingers"], pts["bust"], pts["fade"]], 1)))[..., :3]
        lip_c_img = bake.image("EMIT", source=bake.attribute_socket("_lip_c", lip_c))[..., :3]
        lip_d_img = bake.image("EMIT", source=bake.attribute_socket("_lip_d", lip_d))[..., :3]
        lip_d_img[..., 1] = lip_face_mask(m)                # on her lips or not: per face, crisp at their border
        log(f"baked her face's picture ({time.time() - started:.0f} s)")
    finally:
        bake.close()

    # Her points' detail.
    fields = dict(pts, p=m.co, n=m.normal, ao=ao_pts, crease=crease_pts)
    mult_pts, strength_pts, pieces_pts = detail(fields, lm, fine=False)
    # Her face's picture, where the bakes reached (her face's pixels and their margin).
    sel = reach.reshape(-1)
    n_img = normal_img.reshape(-1, 3)[sel].astype(np.float64)
    n_img /= np.maximum(np.linalg.norm(n_img, axis=1, keepdims=True), 1e-9)
    flat = lambda img, k=None: (img.reshape(-1, img.shape[-1])[sel, k] if k is not None else img.reshape(-1)[sel])
    img_fields = {
        "p": pos_img.reshape(-1, 3)[sel].astype(np.float64), "n": n_img,
        "ao": flat(ao_img), "crease": flat(crease_img),
        "convex": flat(a, 0), "concave": flat(a, 1), "lip": flat(a, 2),
        "fingers": flat(b, 0), "bust": flat(b, 1), "fade": flat(b, 2), "tips": np.zeros(int(sel.sum())),
    }
    mult_img, _, pieces_img = detail(img_fields, lm, fine=True)
    # Her lips' soft paint, on top of the detail (lip_point_fields / lip_multiplier).
    mult_pts = mult_pts * lip_multiplier(lip_c, lip_d, m.co)
    mult_img = mult_img * lip_multiplier(lip_c_img.reshape(-1, 3)[sel].astype(np.float64),
                                         lip_d_img.reshape(-1, 3)[sel].astype(np.float64), img_fields["p"])
    # Keep her tone: the detail averages 1 over her body's skin (by area), each channel; her face's by the same.
    skin = m.vertices_of(m.faces_with(lambda n: n in ("T_skin_f", "T_bra", "T_smalls")))
    w = _point_areas(m) * skin
    norm = (mult_pts * w[:, None]).sum(0) / w.sum()
    log("detail average before keeping her tone:", norm.round(3))
    mult_pts /= norm
    mult_img /= norm

    # Her points: the attribute (0 = no change).
    offset = (np.clip(mult_pts, 0, 2) - 1) * strength_pts[:, None] / 2
    me = obj.data
    if me.attributes.get(ATTRIBUTE) is not None:
        me.attributes.remove(me.attributes[ATTRIBUTE])
    attr = me.attributes.new(ATTRIBUTE, "FLOAT_VECTOR", "POINT")
    attr.data.foreach_set("vector", offset.astype(np.float32).ravel())
    # Her face's picture.
    full = np.full((SIZE * SIZE, 3), 0.5)
    full[sel] = np.clip(mult_img / 2, 0, 1)
    full = fill_outside(full.reshape(SIZE, SIZE, 3), reach)
    picture = np.concatenate([full, np.ones((SIZE, SIZE, 1))], 2)[::-1]  # rows top to bottom
    path = paint.image_path(obj)
    write_png(path, np.round(picture * 255))
    image = bpy.data.images.get(paint.image_name(obj))
    if image is not None:
        bpy.data.images.remove(image)
    image = bpy.data.images.load(path)
    image.name = paint.image_name(obj)
    image.alpha_mode = "STRAIGHT"
    obj["paint_mode"] = "overlay"
    log(f"wrote {path} and {ATTRIBUTE} on {m.nV} points ({time.time() - started:.0f} s)")

    if debug_dir:
        os.makedirs(debug_dir, exist_ok=True)
        for name, values in pieces_img.items():
            img = np.zeros(SIZE * SIZE)
            img[sel] = values
            _gray_png(os.path.join(debug_dir, f"face_{name}.png"), img.reshape(SIZE, SIZE)[::-1])
        _gray_png(os.path.join(debug_dir, "bake_ao.png"), ao_img[::-1])
        _gray_png(os.path.join(debug_dir, "bake_crease.png"), crease_img[::-1])
        np.savez(os.path.join(debug_dir, "points.npz"), co=m.co, mult=mult_pts, strength=strength_pts,
                 ao=ao_pts, crease=crease_pts, **{f"piece_{k}": v for k, v in pieces_pts.items()})
    return m


def args_after_dashes():
    argv = sys.argv
    return argv[argv.index("--") + 1:] if "--" in argv else []


def main():
    args = args_after_dashes()
    obj = bpy.data.objects[OBJECT]
    arm = bpy.data.objects[ARMATURE]
    pose = arm.data.pose_position
    arm.data.pose_position = "REST"
    bpy.context.view_layer.update()
    debug = os.path.join(core.scratch_dir(), "tex", "debug") if "--debug" in args else None
    try:
        run(obj, debug)
    finally:
        arm.data.pose_position = pose
        bpy.context.view_layer.update()
    out = next((a for a in args if a.endswith(".blend")), None)
    if out:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(out), copy=False)
        log("saved", out)


if __name__ == "__main__":
    main()
