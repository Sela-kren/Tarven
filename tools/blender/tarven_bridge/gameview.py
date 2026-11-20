"""Game view: her as the game shapes her, in Blender, from the bridge server (tools/bridge/server.preview.ts).

The panel's sliders, outfits, hairstyles and expressions come from the server's /schema, so they are always the
game's own. Each change asks the server to shape her (debounced, off the main thread) and writes the points it sends
into the GameView collection's meshes, which are never exported. The face panel also writes an expression's numbers
back into src/game/face.ts.
"""
import base64
import json
import os
import re
import subprocess
import threading
import urllib.request

import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

from . import core

PORT = int(os.environ.get("BRIDGE_PORT", "8765"))
URL = f"http://127.0.0.1:{PORT}"
COLLECTION = "GameView"
ROOT_NAME = "GameView_Root"
DEBOUNCE = 0.25

_schema = None          # the server's /schema
_server = None          # the server process, when Blender started it
_pending = None         # the job waiting for its debounce
_busy = False
_result = None          # the last finished /shape, for the main thread to write
_error = None
_suspend = False        # while the panel sets many values at once (reset, expression load)


# ---------------------------------------------------------------- server

def _request(path, body=None, timeout=60):
    data = None if body is None else json.dumps(body).encode("utf8")
    req = urllib.request.Request(URL + path, data=data, method="POST" if body is not None else "GET",
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf8"))


def server_up():
    try:
        return bool(_request("/ping", timeout=1).get("ok"))
    except Exception:  # noqa: BLE001
        return False


def reload_server():
    try:
        _request("/reload", {}, timeout=120)
        schedule()
    except Exception as error:  # noqa: BLE001
        _set_status(f"Reload failed: {error}")


def _set_status(text):
    wm = bpy.context.window_manager if bpy.context else None
    if wm is not None:
        wm.tarven_gv_status = text
    for window in bpy.context.window_manager.windows if bpy.context and bpy.context.window_manager else []:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


# ---------------------------------------------------------------- the job

def _job(scene):
    gv = scene.tarven_gv
    sliders = {item.id: item.value for item in gv.sliders}
    face = {item.id: item.value for item in gv.face}
    job = {"sliders": sliders, "face": face, "nude": gv.nude, "posed": gv.posed}
    if gv.outfit:
        job["outfit"] = gv.outfit
    if gv.hairstyle:
        job["hairstyle"] = gv.hairstyle
    if gv.bust_shape:
        job["bustShape"] = gv.bust_shape
    coll = bpy.data.collections.get(COLLECTION)
    job["known"] = [o.get("tarven_key") for o in (coll.objects if coll else []) if o.get("tarven_key")]
    return job


def schedule(*_args):
    """Asks for her shape again after a short pause (slider drags send one job, not dozens)."""
    global _pending
    gv = bpy.context.scene.tarven_gv if bpy.context else None
    # While the game view is being edited, a reshape would throw the edits away.
    if _suspend or gv is None or not gv.live or gv.editable:
        return
    _pending = _job(bpy.context.scene)
    if not bpy.app.timers.is_registered(_kick):
        bpy.app.timers.register(_kick, first_interval=DEBOUNCE)


def _kick():
    global _pending, _busy
    if _busy:
        return 0.1
    if _pending is None:
        return None
    job, _pending = _pending, None
    _busy = True
    _set_status("Shaping…")
    threading.Thread(target=_work, args=(job,), daemon=True).start()
    bpy.app.timers.register(_collect, first_interval=0.1)
    return None


def _work(job):
    global _result, _error, _busy
    try:
        _result = _request("/shape", job)
    except Exception as error:  # noqa: BLE001
        _error = str(error)
    finally:
        _busy = False


def _collect():
    global _result, _error
    if _busy:
        return 0.1
    if _error:
        _set_status(f"Server: {_error[:120]}")
        _error = None
        return None
    if _result is not None:
        done, _result = _result, None
        if "error" in done:
            _set_status(done["error"].splitlines()[0][:160])
        else:
            write_meshes(done["meshes"])
            _set_status(f"Game view: {len(done['meshes'])} meshes, {done['ms']} ms")
    if _pending is not None and not bpy.app.timers.is_registered(_kick):
        bpy.app.timers.register(_kick, first_interval=0.01)
    return None


# ---------------------------------------------------------------- meshes

def _floats(text, width):
    return np.frombuffer(base64.b64decode(text), dtype="<f4").reshape(-1, width)


def _root_and_collection(scene):
    coll = bpy.data.collections.get(COLLECTION)
    if coll is None:
        coll = bpy.data.collections.new(COLLECTION)
        scene.collection.children.link(coll)
    root = bpy.data.objects.get(ROOT_NAME)
    if root is None:
        root = bpy.data.objects.new(ROOT_NAME, None)
        root.empty_display_size = 0.2
        coll.objects.link(root)
    root.location.x = scene.tarven_gv.side_offset if scene.tarven_gv.side_by_side else 0.0
    return root, coll


def _new_mesh_object(entry, coll, root):
    positions = _floats(entry["positions"], 3)
    tris = np.frombuffer(base64.b64decode(entry["indices"]), dtype="<u4").reshape(-1, 3)
    name = f"GV_{entry['name']}_{entry['material']}"[:60]
    mesh = bpy.data.meshes.new(name)
    mesh.vertices.add(len(positions))
    mesh.vertices.foreach_set("co", positions.ravel())
    mesh.loops.add(tris.size)
    mesh.loops.foreach_set("vertex_index", tris.ravel().astype(np.int32))
    mesh.polygons.add(len(tris))
    mesh.polygons.foreach_set("loop_start", np.arange(0, tris.size, 3, dtype=np.int32))
    mesh.polygons.foreach_set("use_smooth", np.ones(len(tris), dtype=bool))
    if entry.get("uvs"):
        uv = _floats(entry["uvs"], 2)
        layer = mesh.uv_layers.new(name="UVMap")
        layer.data.foreach_set("uv", uv[tris.ravel()].ravel())
    mesh.update()
    mesh.materials.append(material_for(entry))
    obj = bpy.data.objects.new(name, mesh)
    obj["tarven_key"] = entry["key"]
    obj.parent = root
    coll.objects.link(obj)
    # The game view can't be clicked into by mistake while sculpting the master next to it.
    obj.hide_select = True
    return obj


# What the server last shaped each game view mesh to, by key: an edit is the difference from it.
_last = {}


def material_for(entry):
    """The master's own material, or for a look's recolour a flat one in the colour the game shows: the game's
    recoloured clothes are flat, and its recoloured skin keeps a faint mottle averaging to the same colour."""
    own = bpy.data.materials.get(entry["material"])
    if not entry.get("tint"):
        return own
    r, g, b = entry["color"]
    name = f"GV_{entry['material']}_{int(min(r, 1) * 255):02x}{int(min(g, 1) * 255):02x}{int(min(b, 1) * 255):02x}"
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)
        material.use_fake_user = False
        material.diffuse_color = (r, g, b, 1.0)
        material.roughness = 1.0
        material.metallic = 0.0
        material.use_nodes = True
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf is not None:
            bsdf.inputs["Roughness"].default_value = 1.0
            # A small picture in the colour, not just a colour: Solid view's Texture colouring shows a material's
            # picture and draws one without any white.
            image = bpy.data.images.new(name, 4, 4, alpha=False, float_buffer=True)
            image.colorspace_settings.name = "Linear Rec.709"
            image.pixels.foreach_set(np.tile(np.array([r, g, b, 1.0], dtype=np.float32), 16))
            image.pack()
            node = material.node_tree.nodes.new("ShaderNodeTexImage")
            node.image = image
            node.interpolation = "Closest"
            material.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
            material.node_tree.nodes.active = node
    return material


def write_meshes(entries):
    scene = bpy.context.scene
    root, coll = _root_and_collection(scene)
    by_key = {o.get("tarven_key"): o for o in coll.objects if o.get("tarven_key")}
    shown = set()
    for entry in entries:
        obj = by_key.get(entry["key"])
        positions = _floats(entry["positions"], 3)
        if obj is None:
            if not entry.get("indices"):
                continue  # deleted by the user meanwhile: the next job asks for it again
            obj = by_key[entry["key"]] = _new_mesh_object(entry, coll, root)
        elif len(positions) == len(obj.data.vertices):
            obj.data.vertices.foreach_set("co", positions.ravel())
            obj.data.update()
        _last[entry["key"]] = (positions.copy(), entry.get("object"))
        obj.hide_select = not scene.tarven_gv.editable
        wanted = material_for(entry)
        if obj.data.materials and obj.data.materials[0] != wanted:
            obj.data.materials[0] = wanted
        obj.hide_viewport = False
        obj.hide_render = False
        shown.add(entry["key"])
    for key, obj in by_key.items():
        if key not in shown:
            obj.hide_viewport = True
            obj.hide_render = True
    layer = bpy.context.view_layer.layer_collection.children.get(COLLECTION)
    if layer is not None:
        layer.hide_viewport = not scene.tarven_gv.show
    if scene.tarven_gv.match_master:
        match_master({entry.get("object") for entry in entries})


def match_master(shown_objects):
    """Shows only what she has on in the game view on the master too (the rest of her outfits, hairstyles and shoes
    hidden, as the game hides them). Hidden pieces still go out with Send to game."""
    coll = bpy.data.collections.get(core.MASTER_COLLECTION)
    if coll is None:
        return
    for obj in coll.all_objects:
        if obj.type == "MESH":
            want_hidden = obj.name not in shown_objects
            if obj.hide_get() != want_hidden:
                obj.hide_set(want_hidden)


def show_all_master():
    coll = bpy.data.collections.get(core.MASTER_COLLECTION)
    for obj in coll.all_objects if coll else []:
        obj.hide_set(False)


def edits_on_view():
    """The game view's points the user moved since the server shaped them: {key: (indices, deltas, object)}."""
    coll = bpy.data.collections.get(COLLECTION)
    out = {}
    for obj in coll.objects if coll else []:
        key = obj.get("tarven_key")
        if obj.type != "MESH" or key not in _last:
            continue
        shaped, master_name = _last[key]
        now = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
        obj.data.vertices.foreach_get("co", now)
        now = now.reshape(-1, 3)
        if now.shape != shaped.shape:
            continue
        delta = now - shaped
        moved = np.nonzero(np.abs(delta).max(axis=1) > 1e-6)[0]
        if len(moved):
            out[key] = (moved, delta[moved], master_name)
    return out


def apply_deltas(edits):
    """Moves the master's points by what the game view's moved: each moved game view point is found on the master
    by where it sits as built (the server's /rest, from the last sent model), and the master's point is moved by the
    same amount. Exact where the game moves a region as a whole; where a slider stretches it (a big cup) it is
    close, and refine_edits() takes it the rest of the way. Returns a summary."""
    if not edits:
        return {"moved": 0, "objects": [], "far": 0}
    rest = {m["key"]: m for m in _request("/rest", {"known": list(_last)}, timeout=180)["meshes"]}
    master = bpy.data.collections[core.MASTER_COLLECTION]
    per_object = {}
    for key, (moved, delta, name) in edits.items():
        if key not in rest:
            continue
        points = _floats(rest[key]["positions"], 3)[moved]
        per_object.setdefault(name or rest[key].get("object"), []).append((points, delta))
    summary = {"moved": 0, "objects": [], "far": 0}
    for name, pieces in per_object.items():
        obj = master.all_objects.get(name)
        if obj is None or obj.type != "MESH":
            continue
        mesh = obj.data
        if mesh.shape_keys:
            raise RuntimeError(f"{name} has shape keys: apply or remove them before carrying edits")
        world = obj.matrix_world
        inverse = world.inverted().to_3x3()
        tree = KDTree(len(mesh.vertices))
        for v in mesh.vertices:
            tree.insert(world @ v.co, v.index)
        tree.balance()
        sums, counts = {}, {}
        for points, delta in pieces:
            for p, d in zip(points, delta):
                _co, index, dist = tree.find(p)
                if dist > 0.001:
                    summary["far"] += 1  # the master changed there since the last Send
                    continue
                sums[index] = sums.get(index, np.zeros(3)) + d
                counts[index] = counts.get(index, 0) + 1
        for index, total in sums.items():
            # A point split at a seam in the GLB comes more than once: average its moves.
            mesh.vertices[index].co += inverse @ Vector(total / counts[index])
        mesh.update()
        summary["moved"] += len(sums)
        summary["objects"].append(name)
    return summary


def clear_meshes():
    coll = bpy.data.collections.get(COLLECTION)
    if coll is None:
        return
    for obj in list(coll.objects):
        data = obj.data
        bpy.data.objects.remove(obj, do_unlink=True)
        if data is not None and data.users == 0:
            bpy.data.meshes.remove(data)


# ---------------------------------------------------------------- face.ts write-back

def face_ts_path():
    return os.path.join(core.repo_root(), "src", "game", "face.ts")


def _fmt(value):
    text = f"{round(value, 2):.2f}".rstrip("0").rstrip(".")
    return "0" if text in ("-0", "") else text


def write_expression(name, values):
    """Rewrites one EXPRESSIONS entry in face.ts (`name: face({ ... }),`), keeping the order of the keys it had and
    the comments around it. Keys at 0 are left out, as the file writes them."""
    path = face_ts_path()
    text = open(path, encoding="utf8").read()
    block = re.search(r"export const EXPRESSIONS\b[^=]*=\s*\{(.*?)\n\};", text, re.S)
    if not block:
        raise RuntimeError("EXPRESSIONS not found in face.ts")
    entry = re.compile(r"(\n(\s*)" + re.escape(name) + r": face\(\{)(.*?)(\}\),)", re.S)
    found = entry.search(text, block.start(1), block.end(1))
    if not found:
        raise RuntimeError(f"expression {name} not found in face.ts")
    old = dict(re.findall(r"(\w+)\s*:\s*(-?[\d.]+)", found.group(3)))
    if all(abs(float(old.get(k, 0)) - v) < 0.005 for k, v in values.items()):
        return False  # unchanged: leave the file as it is
    old_keys = list(old)
    keys = [k for k in old_keys if k in values] + [k for k in values if k not in old_keys]
    parts = [f"{k}: {_fmt(values[k])}" for k in keys if abs(values[k]) >= 0.005]
    indent = found.group(2)
    one_line = f"{indent}{name}: face({{ {', '.join(parts)} }}),"
    was_one_line = "\n" not in found.group(3)
    if not parts:
        replacement = f"\n{indent}{name}: face({{}}),"
    elif was_one_line:
        # Kept on one line, as the file had it.
        replacement = "\n" + one_line
    else:
        lines, line = [], ""
        for part in parts:
            if line and len(indent) + 2 + len(line) + len(part) + 2 > 130:
                lines.append(line.rstrip())
                line = ""
            line += part + ", "
        lines.append(line.rstrip())
        inner = "\n".join(f"{indent}  {line}" for line in lines)
        replacement = f"\n{indent}{name}: face({{\n{inner}\n{indent}}}),"
    text = text[:found.start()] + replacement + text[found.end():]
    with open(path, "w", encoding="utf8", newline="") as out:
        out.write(text)
    return True


# ---------------------------------------------------------------- properties

def _items(kind):
    def items(_self, _context):
        if not _schema:
            return [("", "(connect first)", "")]
        if kind == "expression":
            return [(e, e.capitalize(), "") for e in _schema["expressions"]]
        return [(o["id"], o["label"], "") for o in _schema[kind]]
    return items


def _value_update(self, _context):
    schedule()


def _set_editable(on):
    coll = bpy.data.collections.get(COLLECTION)
    for obj in coll.objects if coll else []:
        obj.hide_select = not on


class TarvenValue(bpy.types.PropertyGroup):
    id: bpy.props.StringProperty()
    label: bpy.props.StringProperty()
    group: bpy.props.StringProperty()
    tab: bpy.props.StringProperty()
    vmin: bpy.props.FloatProperty(default=-1)
    vmax: bpy.props.FloatProperty(default=1)
    value: bpy.props.FloatProperty(default=0.0, soft_min=-1.0, soft_max=1.7, min=-3.0, max=3.0, step=5,
                                   precision=2, update=_value_update)


class TarvenGameView(bpy.types.PropertyGroup):
    live: bpy.props.BoolProperty(name="Live", default=True, description="Reshape as the controls change")
    show: bpy.props.BoolProperty(name="Show game view", default=True, update=_value_update)
    side_by_side: bpy.props.BoolProperty(name="Side by side", default=True, update=_value_update)
    side_offset: bpy.props.FloatProperty(name="Offset", default=0.8, update=_value_update)
    editable: bpy.props.BoolProperty(
        name="Edit game view", default=False, update=lambda self, _c: _set_editable(self.editable),
        description="Let the game view be selected and edited; Apply carries the edits onto the master")
    match_master: bpy.props.BoolProperty(
        name="Master shows the same", default=True, update=lambda self, _c: (schedule() if self.match_master else show_all_master()),
        description="Hide the master's other outfits, hairstyles and shoes, as the game does (they are still sent)")
    posed: bpy.props.BoolProperty(name="Posed", default=False, update=_value_update,
                                  description="Stand her as the game does (arms hang, spread for her bust)")
    nude: bpy.props.BoolProperty(name="Undressed", default=False, update=_value_update)
    outfit: bpy.props.EnumProperty(name="Outfit", items=_items("outfits"), update=_value_update)
    hairstyle: bpy.props.EnumProperty(name="Hair", items=_items("hairstyles"), update=_value_update)
    bust_shape: bpy.props.EnumProperty(name="Bust shape", items=_items("bustShapes"), update=_value_update)
    expression: bpy.props.EnumProperty(name="Expression", items=_items("expression"))
    sliders: bpy.props.CollectionProperty(type=TarvenValue)
    face: bpy.props.CollectionProperty(type=TarvenValue)
    show_tab: bpy.props.EnumProperty(name="Tab", items=[("body", "Body", ""), ("face", "Face", ""), ("hair", "Hair", "")])


# ---------------------------------------------------------------- operators

def _fill(scene, schema):
    """The panel's controls from the server's schema, set to her start look."""
    global _suspend
    gv = scene.tarven_gv
    _suspend = True
    try:
        old = {item.id: item.value for item in gv.sliders}
        gv.sliders.clear()
        for s in schema["sliders"]:
            item = gv.sliders.add()
            item.id, item.label, item.tab, item.group = s["id"], s["label"], s["tab"], s["group"] or ""
            item.vmin, item.vmax = s["min"], s["max"]
            item.value = old.get(s["id"], 0.0)
        old_face = {item.id: item.value for item in gv.face}
        gv.face.clear()
        for key in schema["faceKeys"]:
            item = gv.face.add()
            item.id, item.label = key, key
            item.value = old_face.get(key, 0.0)
    finally:
        _suspend = False


def _to_start(scene):
    global _suspend
    gv = scene.tarven_gv
    start = _schema["startLook"]
    _suspend = True
    try:
        for item in gv.sliders:
            item.value = start["sliders"].get(item.id, 0.0)
        for item in gv.face:
            item.value = 0.0
        gv.outfit = start.get("outfit") or _schema["outfits"][0]["id"]
        gv.hairstyle = start.get("hairstyle") or _schema["hairstyles"][0]["id"]
        gv.bust_shape = start.get("bustShape") or _schema["bustShapes"][0]["id"]
        gv.nude = False
        gv.posed = False
    finally:
        _suspend = False


class TARVEN_OT_server(bpy.types.Operator):
    """Start or stop the bridge server (npm run bridge) that shapes her with the game's code"""
    bl_idname = "tarven.server"
    bl_label = "Bridge server"
    action: bpy.props.EnumProperty(items=[("START", "Start", ""), ("STOP", "Stop", "")])

    def execute(self, context):
        global _server
        if self.action == "START":
            if server_up():
                self.report({"INFO"}, "Server already running")
                return {"FINISHED"}
            log = open(os.path.join(core.scratch_dir(), "server.log"), "w")
            _server = subprocess.Popen("npm run bridge", cwd=core.repo_root(), shell=True, stdout=log,
                                       stderr=subprocess.STDOUT,
                                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            context.window_manager.tarven_gv_status = "Starting server (about 10 s)…"
            bpy.app.timers.register(_wait_for_server, first_interval=2)
        else:
            if _server is not None:
                subprocess.run(f"taskkill /PID {_server.pid} /T /F", shell=True, capture_output=True)
                _server = None
                context.window_manager.tarven_gv_status = "Server stopped"
            else:
                self.report({"WARNING"}, "This Blender didn't start the server: stop it where it runs (Ctrl+C)")
        return {"FINISHED"}


def _wait_for_server():
    if server_up():
        bpy.ops.tarven.connect()
        return None
    if _server is not None and _server.poll() is not None:
        _set_status(f"Server exited ({_server.returncode}); see ref/_bridge/server.log")
        return None
    return 1.0


class TARVEN_OT_connect(bpy.types.Operator):
    """Read the game's sliders and options from the server and show her as the game does"""
    bl_idname = "tarven.connect"
    bl_label = "Connect"

    def execute(self, context):
        global _schema
        try:
            first = _schema is None or not context.scene.tarven_gv.sliders
            _schema = _request("/schema", timeout=30)
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, f"No bridge server at {URL}: {error}")
            return {"CANCELLED"}
        _fill(context.scene, _schema)
        if first:
            _to_start(context.scene)
        context.window_manager.tarven_gv_status = "Connected"
        schedule()
        return {"FINISHED"}


class TARVEN_OT_start_look(bpy.types.Operator):
    """Set every control to her look as the player starts (what the game shows first)"""
    bl_idname = "tarven.start_look"
    bl_label = "Start look"

    def execute(self, context):
        if not _schema:
            return {"CANCELLED"}
        _to_start(context.scene)
        schedule()
        return {"FINISHED"}


class TARVEN_OT_built(bpy.types.Operator):
    """Every slider to 0 and the face neutral: the master as built, as the game shapes it"""
    bl_idname = "tarven.as_built"
    bl_label = "As built"

    def execute(self, context):
        global _suspend
        _suspend = True
        try:
            for item in list(context.scene.tarven_gv.sliders) + list(context.scene.tarven_gv.face):
                item.value = 0.0
        finally:
            _suspend = False
        schedule()
        return {"FINISHED"}


class TARVEN_OT_load_expression(bpy.types.Operator):
    """Set the face sliders to the chosen expression, as face.ts has it"""
    bl_idname = "tarven.load_expression"
    bl_label = "Load"

    def execute(self, context):
        global _suspend
        gv = context.scene.tarven_gv
        shape = _schema["expressions"].get(gv.expression, {}) if _schema else {}
        _suspend = True
        try:
            for item in gv.face:
                item.value = float(shape.get(item.id, 0.0))
        finally:
            _suspend = False
        schedule()
        return {"FINISHED"}


class TARVEN_OT_save_expression(bpy.types.Operator):
    """Write the face sliders into face.ts as the chosen expression (the game reloads with it)"""
    bl_idname = "tarven.save_expression"
    bl_label = "Save to game"

    def invoke(self, context, event):
        return context.window_manager.invoke_confirm(self, event, title=f"Save as '{context.scene.tarven_gv.expression}' in face.ts?")

    def execute(self, context):
        gv = context.scene.tarven_gv
        values = {item.id: item.value for item in gv.face}
        try:
            write_expression(gv.expression, values)
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        # The server is sent the face's numbers with every job, so it needs no reload; the game's dev server
        # picks the file up by itself.
        if _schema:
            _schema["expressions"][gv.expression] = values
        self.report({"INFO"}, f"Saved '{gv.expression}' to src/game/face.ts")
        return {"FINISHED"}


def carry_edits(job, out_path=None, passes=3, good=0.0005):
    """Carries the game view's edits onto the master until the game shapes her to them: the moved points' places
    are kept as targets; each pass moves the master by what is still off, sends it (to out_path, else the game),
    has the server shape her again and measures. Returns a summary with the leftover in millimetres."""
    edits = edits_on_view()
    targets = {key: (moved, _last[key][0][moved] + delta, name) for key, (moved, delta, name) in edits.items()}
    summary = {"moved": 0, "objects": set(), "far": 0, "passes": 0, "left_mm": None}
    pending = edits
    for _ in range(passes):
        done = apply_deltas(pending)
        summary["moved"] = max(summary["moved"], done["moved"])
        summary["objects"].update(done["objects"])
        summary["far"] += done["far"]
        summary["passes"] += 1
        core.export_master(out_path)
        _request("/reload", {}, timeout=180)
        result = _request("/shape", {**job, "known": list(_last)}, timeout=180)
        write_meshes(result["meshes"])
        pending, worst = {}, 0.0
        for key, (moved, target, name) in targets.items():
            if key not in _last:
                continue
            off = target - _last[key][0][moved]
            worst = max(worst, float(np.linalg.norm(off, axis=1).max()))
            pending[key] = (moved, off, name)
        summary["left_mm"] = round(worst * 1000, 2)
        if worst <= good:
            break
    summary["objects"] = sorted(summary["objects"])
    return summary


class TARVEN_OT_apply_edits(bpy.types.Operator):
    """Carry what you moved on the game view onto the master and send it, refining until the game matches"""
    bl_idname = "tarven.apply_edits"
    bl_label = "Apply edits to master"

    def execute(self, context):
        if context.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        if not edits_on_view():
            self.report({"WARNING"}, "Nothing moved on the game view")
            return {"CANCELLED"}
        gv = context.scene.tarven_gv
        job = _job(context.scene)
        gv.editable = False
        try:
            done = carry_edits(job)
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        note = (f"{done['moved']} master points moved ({', '.join(done['objects'])}); sent; "
                f"{done['passes']} pass(es), {done['left_mm']} mm left")
        if done["far"]:
            note += f"; {done['far']} not found: Send the master first, then edit the view"
        context.window_manager.tarven_gv_status = note
        self.report({"INFO"}, note)
        return {"FINISHED"}


class TARVEN_OT_game_look(bpy.types.Operator):
    """Light the viewport roughly as the game does (flat diffuse, no shine, her blocky textures) and add a camera
    with the game's field of view and angle (main.ts: 32 degrees, from 10 m up and 10 m back)"""
    bl_idname = "tarven.game_look"
    bl_label = "Game look"

    def execute(self, context):
        import math
        for area in context.screen.areas:
            if area.type != "VIEW_3D":
                continue
            shading = area.spaces[0].shading
            shading.type = "SOLID"
            shading.light = "STUDIO"
            shading.color_type = "TEXTURE"
            shading.show_specular_highlight = False
            shading.show_cavity = False
            shading.show_shadows = False
        cam_data = bpy.data.cameras.get("GameCamera") or bpy.data.cameras.new("GameCamera")
        cam_data.sensor_fit = "VERTICAL"
        cam_data.angle_y = math.radians(32)
        cam = bpy.data.objects.get("GameCamera") or bpy.data.objects.new("GameCamera", cam_data)
        if cam.name not in context.scene.collection.objects:
            context.scene.collection.objects.link(cam)
        # The game's camera sits (0, 10, 10) from her in three's Y-up world: (0, -10, 10) here, looking at her chest.
        target = (0.0, 0.0, 1.0)
        cam.location = (target[0], target[1] - 10.0, target[2] + 10.0 - 1.0)
        direction = Vector(target) - cam.location
        cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
        context.scene.camera = cam
        context.scene.render.resolution_x, context.scene.render.resolution_y = 1280, 720
        self.report({"INFO"}, "Game look on; Numpad 0 looks through the game's camera")
        return {"FINISHED"}


# How much an unmoved face point counts in a face fit, against 1 for one you moved.
ANCHOR = 0.02
FACE_MATERIALS = re.compile(r"^T_(face_|lip|hair_f$|mouth|teeth|tongue|eye_)")


class TARVEN_OT_fit_face(bpy.types.Operator):
    """Find the face numbers that make the game shape her face as you sculpted it on the game view (Edit game
    view first), and set the face sliders to them; Save to game then keeps them as the chosen expression"""
    bl_idname = "tarven.fit_face"
    bl_label = "Fit face to my sculpt"

    def execute(self, context):
        global _suspend
        if context.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        edits = {k: (list(map(int, moved)), d, n) for k, (moved, d, n) in edits_on_view().items()}
        if not edits:
            self.report({"WARNING"}, "Sculpt her face on the game view first (Edit game view)")
            return {"CANCELLED"}
        coll = bpy.data.collections.get(COLLECTION)
        targets = []
        for obj in coll.objects:
            key = obj.get("tarven_key") or ""
            if obj.type != "MESH" or obj.hide_viewport or not key.startswith("Female_Body"):
                continue
            if not FACE_MATERIALS.match(key.split("|")[1] if "|" in key else ""):
                continue
            co = np.empty(len(obj.data.vertices) * 3, dtype=np.float32)
            obj.data.vertices.foreach_get("co", co)
            # Every point of her face: the moved ones where you put them, the rest where they are, so the fit moves
            # what you moved and holds what you didn't.
            moved = set(edits.get(key, ((), None, None))[0])
            # The moved points are what you asked for; the rest only hold still, lightly.
            targets += [{"key": key, "index": i, "co": co[i * 3:i * 3 + 3].tolist(), "weight": 1.0 if i in moved else ANCHOR}
                        for i in range(len(co) // 3)]
        job = _job(context.scene)
        job.pop("known", None)
        job["targets"] = targets
        context.window_manager.tarven_gv_status = "Fitting her face…"
        try:
            done = _request("/fit", job, timeout=600)
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}
        if "error" in done:
            self.report({"ERROR"}, done["error"].splitlines()[0])
            return {"CANCELLED"}
        gv = context.scene.tarven_gv
        _suspend = True
        try:
            for item in gv.face:
                item.value = float(done["face"].get(item.id, item.value))
        finally:
            _suspend = False
        gv.editable = False
        note = (f"Face fit: {done['before']['meanMm']} -> {done['after']['meanMm']} mm off on average "
                f"(worst {done['after']['maxMm']} mm), {done['points']} points, {done['ms'] / 1000:.1f} s")
        context.window_manager.tarven_gv_status = note
        self.report({"INFO"}, note)
        schedule()
        return {"FINISHED"}


GAME_URL = os.environ.get("TARVEN_DEV_URL", "http://localhost:5173")


class TARVEN_OT_game_shot(bpy.types.Operator):
    """Take the game's own picture of her from this scene's camera (the open game page draws her from there, with its
    screen pass, and sends the frame back), loaded here as the image "GameShot" to set beside Blender's"""
    bl_idname = "tarven.game_shot"
    bl_label = "Game shot from camera"

    def execute(self, context):
        import math
        scene = context.scene
        if scene.camera is None:
            bpy.ops.tarven.game_look()
        cam = scene.camera
        world = cam.matrix_world
        eye = world.translation
        forward = (world.to_3x3() @ Vector((0.0, 0.0, -1.0))).normalized()
        # The game's fov is vertical: from the camera's own frame, so any sensor fit gives the same picture height.
        frame = cam.data.view_frame(scene=scene)
        half_height = max(abs(p.y) for p in frame)
        depth = abs(frame[0].z)
        fov = math.degrees(2 * math.atan2(half_height, depth))
        view = {"eye": list(eye), "target": list(eye + forward), "fov": fov, "shot": True}
        data = json.dumps(view).encode("utf8")
        req = urllib.request.Request(GAME_URL + "/__tarven/view", data=data, method="POST",
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                done = json.loads(res.read().decode("utf8"))
        except Exception as error:  # noqa: BLE001
            self.report({"ERROR"}, f"No game dev server at {GAME_URL} ({error}): run npm run dev and open the game")
            return {"CANCELLED"}
        if "error" in done:
            self.report({"ERROR"}, done["error"])
            return {"CANCELLED"}
        image = bpy.data.images.get("GameShot")
        if image is None:
            image = bpy.data.images.load(done["path"])
            image.name = "GameShot"
        else:
            image.filepath = done["path"]
            image.reload()
        for area in context.screen.areas:
            if area.type == "IMAGE_EDITOR":
                area.spaces[0].image = image
        self.report({"INFO"}, "Game shot loaded as image 'GameShot' (open it in an Image Editor)")
        return {"FINISHED"}


class TARVEN_OT_clear_view(bpy.types.Operator):
    """Remove the Game view meshes (they are made again on the next change)"""
    bl_idname = "tarven.clear_view"
    bl_label = "Clear game view"

    def execute(self, context):
        clear_meshes()
        schedule()
        return {"FINISHED"}


# ---------------------------------------------------------------- panels

class TARVEN_PT_gameview(bpy.types.Panel):
    bl_label = "Game view"
    bl_idname = "TARVEN_PT_gameview"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"

    def draw(self, context):
        layout = self.layout
        gv = context.scene.tarven_gv
        row = layout.row(align=True)
        row.operator("tarven.server", text="Start server", icon="PLAY").action = "START"
        row.operator("tarven.server", text="Stop", icon="PAUSE").action = "STOP"
        row.operator("tarven.connect", text="", icon="FILE_REFRESH")
        status = context.window_manager.tarven_gv_status
        if status:
            layout.label(text=status)
        if not _schema:
            layout.label(text="Start the server, or Connect if it runs", icon="INFO")
            return
        row = layout.row(align=True)
        row.prop(gv, "live", toggle=True)
        row.prop(gv, "show", text="Show", toggle=True)
        row.prop(gv, "side_by_side", toggle=True)
        row = layout.row(align=True)
        row.prop(gv, "posed", toggle=True)
        row.prop(gv, "nude", toggle=True)
        layout.prop(gv, "match_master")
        box = layout.box()
        box.prop(gv, "editable", toggle=True, icon="SCULPTMODE_HLT")
        if gv.editable:
            box.label(text="Live is paused: edit, then Apply", icon="INFO")
            box.operator("tarven.apply_edits", icon="CHECKMARK")
        layout.prop(gv, "outfit")
        layout.prop(gv, "hairstyle")
        layout.prop(gv, "bust_shape")
        row = layout.row(align=True)
        row.operator("tarven.start_look", icon="USER")
        row.operator("tarven.as_built", icon="LOOP_BACK")
        row = layout.row(align=True)
        row.operator("tarven.game_look", icon="SHADING_SOLID")
        row.operator("tarven.game_shot", text="Game shot", icon="IMAGE_DATA")
        row.operator("tarven.clear_view", icon="TRASH")


class TARVEN_PT_sliders(bpy.types.Panel):
    bl_label = "Sliders"
    bl_idname = "TARVEN_PT_sliders"
    bl_parent_id = "TARVEN_PT_gameview"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"

    @classmethod
    def poll(cls, context):
        return bool(_schema)

    def draw(self, context):
        layout = self.layout
        gv = context.scene.tarven_gv
        layout.prop(gv, "show_tab", expand=True)
        cups = _schema.get("cups") or []
        column = layout.column(align=True)
        heading = ""
        for item in gv.sliders:
            if item.tab != gv.show_tab:
                continue
            if item.group and item.group != heading:
                column.separator()
                column.label(text=item.group)
            heading = item.group or heading
            row = column.row(align=True)
            row.prop(item, "value", text=item.label, slider=True)
            if item.id == "bust" and cups:
                letter = min(cups, key=lambda c: abs(c[1] - item.value))[0]
                row.label(text=f"{letter} cup")


class TARVEN_PT_face(bpy.types.Panel):
    bl_label = "Face"
    bl_idname = "TARVEN_PT_face"
    bl_parent_id = "TARVEN_PT_gameview"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Tarven"
    bl_options = {"DEFAULT_CLOSED"}

    @classmethod
    def poll(cls, context):
        return bool(_schema)

    def draw(self, context):
        layout = self.layout
        gv = context.scene.tarven_gv
        row = layout.row(align=True)
        row.prop(gv, "expression", text="")
        row.operator("tarven.load_expression")
        row.operator("tarven.save_expression", icon="FILE_TICK")
        layout.operator("tarven.fit_face", icon="SHAPEKEY_DATA")
        column = layout.column(align=True)
        for item in gv.face:
            column.prop(item, "value", text=item.label, slider=True)


_classes = (TarvenValue, TarvenGameView, TARVEN_OT_server, TARVEN_OT_connect, TARVEN_OT_start_look, TARVEN_OT_built,
            TARVEN_OT_load_expression, TARVEN_OT_save_expression, TARVEN_OT_apply_edits, TARVEN_OT_fit_face, TARVEN_OT_game_look, TARVEN_OT_game_shot, TARVEN_OT_clear_view,
            TARVEN_PT_gameview, TARVEN_PT_sliders, TARVEN_PT_face)


@bpy.app.handlers.persistent
def _before_save(*_args):
    """The game view isn't saved into the master (it is made again from the server in a second)."""
    clear_meshes()
    coll = bpy.data.collections.get(COLLECTION)
    if coll is not None:
        for obj in list(coll.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(coll)


@bpy.app.handlers.persistent
def _after_save(*_args):
    if _schema:
        schedule()


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.tarven_gv = bpy.props.PointerProperty(type=TarvenGameView)
    bpy.types.WindowManager.tarven_gv_status = bpy.props.StringProperty()
    bpy.app.handlers.save_pre.append(_before_save)
    bpy.app.handlers.save_post.append(_after_save)


def unregister():
    for handler, handlers in ((_before_save, bpy.app.handlers.save_pre), (_after_save, bpy.app.handlers.save_post)):
        if handler in handlers:
            handlers.remove(handler)
    for timer in (_kick, _collect, _wait_for_server):
        if bpy.app.timers.is_registered(timer):
            bpy.app.timers.unregister(timer)
    del bpy.types.WindowManager.tarven_gv_status
    del bpy.types.Scene.tarven_gv
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
