"""Cloth drape: Blender's cloth simulation on her garment, baked per cup size for the game.

At each chosen cup the bridge server shapes her as the game does (drapes off), the garment she has on is welded into
one cloth (glTF splits it at seams) and simulated over her game-shaped body as a collider, the top of it pinned
(neckline and shoulders, or a waistband). What the cloth did, less the game's own fit, is stored on the master
garment as "_CLOTH_DRAPE_<cup>", which the game lays on last, blended by the bust slider like the user's bust fixes
(appearance.ts, MeshSlot.drapes). At a baked cup the game then shows the simulated cloth exactly.

Preview runs it at the game view's own cup and shows the result there without baking, to tune the settings.
"""
import base64

import bpy
import numpy as np
from mathutils.kdtree import KDTree

from . import core
from . import gameview as gv

TEMP = "TarvenDrape"
# Fitted tops the game keeps further off a big bust (appearance.ts SMOOTH_TOPS): their collision gap is the game's.
FITTED = ("T_tee", "T_halter", "T_lace")
REVIEWED = tuple("ABCDEFGHIJKLMNO")  # every cup, A to O (the slider stops at O)


def _floats(text, width):
    return np.frombuffer(base64.b64decode(text), dtype="<f4").reshape(-1, width)


def _shape(scene, cup_value):
    job = gv._job(scene)
    job["sliders"] = {**job["sliders"], "bust": cup_value}
    job["known"] = []
    job["noDrape"] = True
    return gv._request("/shape", job, timeout=300)


def _merge(entries):
    """One mesh from many entries, welded where glTF split points (same place): positions, triangles, and for each
    entry the welded index of each of its points."""
    positions, tris, maps = [], [], []
    for e in entries:
        p = _floats(e["positions"], 3)
        t = np.frombuffer(base64.b64decode(e["indices"]), dtype="<u4").reshape(-1, 3)
        positions.append(p)
        tris.append(t + sum(len(x) for x in positions[:-1]))
    allp = np.concatenate(positions)
    key = np.round(allp / 1e-5).astype(np.int64)
    _, first, inverse = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inverse = inverse.ravel()
    welded = allp[first]
    faces = inverse[np.concatenate(tris)]
    faces = faces[(faces[:, 0] != faces[:, 1]) & (faces[:, 1] != faces[:, 2]) & (faces[:, 0] != faces[:, 2])]
    start = 0
    for p in positions:
        maps.append(inverse[start:start + len(p)])
        start += len(p)
    return welded, faces, maps


def _pieces(count, faces):
    """Which connected piece each point is in (union-find over the faces)."""
    parent = np.arange(count)

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for a, b, c in faces:
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra
        parent[rc] = ra
    roots = np.array([find(i) for i in range(count)])
    _, piece = np.unique(roots, return_inverse=True)
    return piece.ravel()


def _object(name, points, faces, coll):
    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(points))
    mesh.vertices.foreach_set("co", points.astype(np.float32).ravel())
    mesh.loops.add(faces.size)
    mesh.loops.foreach_set("vertex_index", faces.ravel().astype(np.int32))
    mesh.polygons.add(len(faces))
    mesh.polygons.foreach_set("loop_start", np.arange(0, faces.size, 3, dtype=np.int32))
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    coll.objects.link(obj)
    return obj


def _settings(scene):
    return scene.tarven_cloth


def simulate(scene, result):
    """Runs the cloth on the garment she has on in `result` (a /shape answer). Returns {key: per-point move (Blender
    space)} for the garment's entries, or raises."""
    s = _settings(scene)
    skip = tuple(x.strip() for x in s.skip.split(",") if x.strip())
    garment = [e for e in result["meshes"] if e.get("object", "").startswith("Female_Cloth")
               and not (skip and e["material"].startswith(skip))]
    if not garment:
        raise RuntimeError("She has no garment on (pick an outfit in the game view)")
    body = [e for e in result["meshes"] if e.get("object") == "Female_Body"
            and not gv.DRAWN_PATCHES.search(e["key"])]
    coll = bpy.data.collections.get(TEMP) or bpy.data.collections.new(TEMP)
    if coll.name not in scene.collection.children:
        scene.collection.children.link(coll)
    try:
        bpts, bfaces, _ = _merge(body)
        # Only her body round the garment collides (the whole of her made each step several times slower).
        every = np.concatenate([_floats(e["positions"], 3) for e in garment])
        low, high = every.min(axis=0) - 0.06, every.max(axis=0) + 0.06
        near = np.all((bpts >= low) & (bpts <= high), axis=1)
        bfaces = bfaces[near[bfaces].all(axis=1)]
        collider = _object("DrapeBody", bpts, bfaces, coll)
        collider.modifiers.new("Collision", "COLLISION")
        col = collider.collision
        gap = result["gaps"]["top"] if any(e["material"] in FITTED for e in garment) else result["gaps"]["cloth"]
        col.thickness_outer = max(gap, 0.001)
        col.thickness_inner = 0.004
        col.cloth_friction = s.friction

        gpts, gfaces, maps = _merge(garment)
        cloth_obj = _object("DrapeCloth", gpts, gfaces, coll)
        # The top of each piece holds it up: its points within `pin` of that piece's highest.
        piece = _pieces(len(gpts), gfaces)
        tops = np.full(piece.max() + 1, -np.inf)
        np.maximum.at(tops, piece, gpts[:, 2])
        pin = cloth_obj.vertex_groups.new(name="pin")
        hold = gpts[:, 2] > tops[piece] - s.pin
        if s.pin_side > 0:
            # Her sleeves (and anything else out past her shoulders) held as the game fits them: a sleeve left free
            # crumples, as it did in every drape tried on the tee.
            hold |= np.abs(gpts[:, 0]) > s.pin_side
        held = np.nonzero(hold)[0].tolist()
        if held:
            pin.add(held, 1.0, "REPLACE")
        mod = cloth_obj.modifiers.new("Cloth", "CLOTH")
        c = mod.settings
        c.quality = s.quality
        c.mass = s.mass
        c.tension_stiffness = c.compression_stiffness = s.stiffness
        c.shear_stiffness = s.stiffness / 3
        c.bending_stiffness = s.bending
        c.air_damping = 1.0
        c.shrink_min = s.shrink
        c.effector_weights.gravity = s.gravity
        c.vertex_group_mass = "pin"
        cs = mod.collision_settings
        cs.use_collision = True
        cs.distance_min = max(gap, 0.001)
        cs.collision_quality = 2
        cs.use_self_collision = s.self_collision
        mod.point_cache.frame_start = 1
        mod.point_cache.frame_end = s.frames
        old = scene.frame_current
        for frame in range(1, s.frames + 1):
            scene.frame_set(frame)
        evaluated = cloth_obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh()
        done = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
        mesh.vertices.foreach_get("co", done)
        evaluated.to_mesh_clear()
        scene.frame_set(old)
        move = done.reshape(-1, 3) - gpts
        return {e["key"]: (move[m], e.get("object")) for e, m in zip(garment, maps)}
    finally:
        for obj in list(coll.objects):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if data is not None and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(coll)


def store(cup_letter, moves):
    """Writes a cup's moves onto the master garment as "_CLOTH_DRAPE_<cup>" (glTF's Y-up, as the game reads it),
    each master point found by where it sits as built (the server's /rest) and its glTF copies averaged."""
    rest = {m["key"]: m for m in gv._request("/rest", {"known": list(moves)}, timeout=300)["meshes"]}
    master = bpy.data.collections[core.MASTER_COLLECTION]
    by_object = {}
    for key, (move, name) in moves.items():
        if key in rest:
            by_object.setdefault(name, []).append((_floats(rest[key]["positions"], 3), move))
    written = []
    for name, pieces in by_object.items():
        obj = master.all_objects.get(name)
        if obj is None or obj.type != "MESH":
            continue
        mesh = obj.data
        world = obj.matrix_world
        tree = KDTree(len(mesh.vertices))
        for v in mesh.vertices:
            tree.insert(world @ v.co, v.index)
        tree.balance()
        total = np.zeros((len(mesh.vertices), 3))
        count = np.zeros(len(mesh.vertices))
        for points, move in pieces:
            for p, d in zip(points, move):
                _co, index, dist = tree.find(p)
                if dist < 0.001:
                    total[index] += d
                    count[index] += 1
        delta = total / np.maximum(count, 1)[:, None]
        # Blender's (x, y, z) is glTF's (x, z, -y).
        gltf = np.stack([delta[:, 0], delta[:, 2], -delta[:, 1]], axis=1).astype(np.float32)
        attr_name = f"_CLOTH_DRAPE_{cup_letter}"
        if attr_name in mesh.attributes:
            mesh.attributes.remove(mesh.attributes[attr_name])
        attr = mesh.attributes.new(attr_name, "FLOAT_VECTOR", "POINT")
        attr.data.foreach_set("vector", gltf.ravel())
        written.append(name)
    return written


def clear_drapes():
    master = bpy.data.collections.get(core.MASTER_COLLECTION)
    removed = 0
    for obj in master.all_objects if master else []:
        if obj.type != "MESH":
            continue
        for name in [a.name for a in obj.data.attributes if a.name.startswith("_CLOTH_DRAPE_")]:
            obj.data.attributes.remove(obj.data.attributes[name])
            removed += 1
    return removed


def _cup_value(letter):
    for label, value in (gv._schema or {}).get("cups", []):
        if label == letter:
            return value
    raise RuntimeError(f"no cup {letter}")


# ---------------------------------------------------------------- settings, operators, panel

class TarvenCloth(bpy.types.PropertyGroup):
    frames: bpy.props.IntProperty(name="Frames", default=40, min=5, max=400,
                                  description="How long the cloth falls and settles (24 a second)")
    quality: bpy.props.IntProperty(name="Quality", default=8, min=2, max=40,
                                   description="Steps per frame: rows under a big bust are 1-2 mm apart")
    mass: bpy.props.FloatProperty(name="Mass", default=0.3, min=0.01, max=5)
    stiffness: bpy.props.FloatProperty(name="Stiffness", default=15, min=1, max=200,
                                       description="Stretch: low is jersey, high is canvas")
    bending: bpy.props.FloatProperty(name="Bending", default=0.5, min=0, max=50,
                                     description="Low makes soft folds, high keeps it smooth")
    gravity: bpy.props.FloatProperty(name="Gravity", default=1.0, min=0, max=2)
    shrink: bpy.props.FloatProperty(name="Shrink", default=0.0, min=-0.2, max=0.2,
                                    description="Pulls it tighter (+) or looser (-). Shrink crumpled the tee's hem before")
    friction: bpy.props.FloatProperty(name="Friction", default=5, min=0, max=80)
    pin: bpy.props.FloatProperty(name="Pin top", default=0.03, min=0, max=0.3, unit="LENGTH",
                                 description="The garment's points this close below its highest are held (neckline "
                                             "and shoulders, a waistband)")
    pin_side: bpy.props.FloatProperty(name="Pin sleeves past", default=0.14, min=0, max=0.5, unit="LENGTH",
                                      description="Points further than this from her middle (left or right) are held: "
                                                  "her sleeves. 0 lets them hang free")
    self_collision: bpy.props.BoolProperty(name="Self collision", default=False)
    cups: bpy.props.StringProperty(name="Cups", default="A,B,C,D,E,F,G,H,I,J,K,L,M,N,O",
                                   description="The cup sizes to bake at; the game blends between them")
    send: bpy.props.BoolProperty(name="Send when baked", default=True)
    skip: bpy.props.StringProperty(name="Leave out", default="T_hose",
                                   description="Materials (by name start, comma separated) not simulated: her legwear "
                                               "bands follow her legs as they are")


class TARVEN_OT_drape_preview(bpy.types.Operator):
    """Simulate the garment she has on at the game view's cup and show it on the game view (nothing is stored)"""
    bl_idname = "tarven.drape_preview"
    bl_label = "Preview drape"

    def execute(self, context):
        scene = context.scene
        bust = next((i.value for i in scene.tarven_gv.sliders if i.id == "bust"), 0.0)
        try:
            result = _shape(scene, bust)
            moves = simulate(scene, result)
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        gv.write_meshes(result["meshes"])
        coll = bpy.data.collections.get(gv.COLLECTION)
        by_key = {o.get("tarven_key"): o for o in coll.objects}
        biggest = 0.0
        for key, (move, _name) in moves.items():
            obj = by_key.get(key)
            if obj is None:
                continue
            co = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
            obj.data.vertices.foreach_get("co", co)
            obj.data.vertices.foreach_set("co", (co.reshape(-1, 3) + move).ravel())
            obj.data.update()
            biggest = max(biggest, float(np.linalg.norm(move, axis=1).max()))
        note = f"Drape preview: the cloth moved up to {biggest * 1000:.0f} mm from the game's fit (not stored)"
        context.window_manager.tarven_gv_status = note
        self.report({"INFO"}, note)
        return {"FINISHED"}


class TARVEN_OT_drape_bake(bpy.types.Operator):
    """Simulate the garment she has on at each chosen cup and store the drapes on the master (then Send)"""
    bl_idname = "tarven.drape_bake"
    bl_label = "Bake drape"

    def execute(self, context):
        scene = context.scene
        s = _settings(scene)
        letters = [c.strip().upper() for c in s.cups.split(",") if c.strip()]
        done = []
        # The drape is measured against the game's fit of the model the server has: send the master first, so that is
        # this master (an older model's points don't line up with it).
        context.window_manager.tarven_gv_status = "Sending the master first…"
        if bpy.ops.tarven.send() != {"FINISHED"}:
            self.report({"ERROR"}, "Send failed, so nothing was baked")
            return {"CANCELLED"}
        try:
            for letter in letters:
                context.window_manager.tarven_gv_status = f"Draping at {letter} cup…"
                result = _shape(scene, _cup_value(letter))
                moves = simulate(scene, result)
                written = store(letter, moves)
                done.append(f"{letter}: {', '.join(written)}")
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, f"{error} (baked so far: {'; '.join(done) or 'none'})")
            return {"CANCELLED"}
        note = f"Baked drapes at {', '.join(letters)}"
        if s.send:
            bpy.ops.tarven.send()
            note += "; sent"
        context.window_manager.tarven_gv_status = note
        self.report({"INFO"}, note)
        gv.schedule()
        return {"FINISHED"}


class TARVEN_OT_drape_clear(bpy.types.Operator):
    """Remove every baked drape from the master (Send to take them out of the game)"""
    bl_idname = "tarven.drape_clear"
    bl_label = "Clear drapes"

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event)

    def execute(self, context):
        self.report({"INFO"}, f"Removed {clear_drapes()} drape layer(s); Send to update the game")
        return {"FINISHED"}


class TARVEN_PT_cloth(bpy.types.Panel):
    bl_label = "Cloth (drape)"
    bl_idname = "TARVEN_PT_cloth"
    bl_parent_id = "TARVEN_PT_gameview"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"
    bl_options = {"DEFAULT_CLOSED"}

    @classmethod
    def poll(cls, context):
        return bool(gv._schema)

    def draw(self, context):
        layout = self.layout
        s = context.scene.tarven_cloth
        layout.label(text=f"Garment: the {context.scene.tarven_gv.outfit} outfit she has on")
        column = layout.column(align=True)
        for prop in ("frames", "quality", "mass", "stiffness", "bending", "gravity", "shrink", "friction", "pin", "pin_side"):
            column.prop(s, prop)
        layout.prop(s, "self_collision")
        layout.prop(s, "cups")
        layout.prop(s, "skip")
        layout.prop(s, "send")
        row = layout.row(align=True)
        row.operator("tarven.drape_preview", icon="MOD_CLOTH")
        row.operator("tarven.drape_bake", icon="CHECKMARK")
        layout.operator("tarven.drape_clear", icon="TRASH")


_classes = (TarvenCloth, TARVEN_OT_drape_preview, TARVEN_OT_drape_bake, TARVEN_OT_drape_clear, TARVEN_PT_cloth)


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.tarven_cloth = bpy.props.PointerProperty(type=TarvenCloth)


def unregister():
    del bpy.types.Scene.tarven_cloth
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
