"""Builds the Tarven test room and player in Blender and exports them as GLB.

Run inside Blender. It works in its own scene ("TarvenWorld") and rebuilds that
scene from scratch each time, so it is safe to re-run after editing.

Textures are made in two steps: a detailed 512px source, then retro_crush()
shrinks it and reduces its colours. When real photo references are available,
load them as the source and pass them through retro_crush() the same way.
"""
import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

# TARVEN_ROOT sends the build somewhere else, such as a scratch folder to compare it with the game's models.
ROOT = os.environ.get("TARVEN_ROOT") or r"C:\Game\Tarven"
TEX_DIR = os.path.join(ROOT, "art", "textures")
OUT_DIR = os.path.join(ROOT, "public", "models")
SCENE_NAME = "TarvenWorld"
HI = 512

rng = np.random.default_rng(7)


# ---------------------------------------------------------------- textures

def noise(n, fx, fy, octaves=4, persistence=0.55):
    """Tileable fractal value noise, normalised to 0..1, shape (n, n)."""
    out = np.zeros((n, n))
    amp = 1.0
    for o in range(octaves):
        cx, cy = max(1, int(fx * 2 ** o)), max(1, int(fy * 2 ** o))
        grid = rng.random((cy, cx))
        x, y = np.arange(n) * cx / n, np.arange(n) * cy / n
        xi, yi = x.astype(int), y.astype(int)
        xf, yf = x - xi, y - yi
        xf, yf = xf * xf * (3 - 2 * xf), yf * yf * (3 - 2 * yf)
        x0, x1, y0, y1 = xi % cx, (xi + 1) % cx, yi % cy, (yi + 1) % cy
        a, b = grid[np.ix_(y0, x0)], grid[np.ix_(y0, x1)]
        c, d = grid[np.ix_(y1, x0)], grid[np.ix_(y1, x1)]
        fx_col, fy_row = xf[None, :], yf[:, None]
        out += ((a * (1 - fx_col) + b * fx_col) * (1 - fy_row)
                + (c * (1 - fx_col) + d * fx_col) * fy_row) * amp
        amp *= persistence
    lo, hi = np.percentile(out, 1), np.percentile(out, 99)
    return np.clip((out - lo) / max(hi - lo, 1e-6), 0, 1)


def ramp(v, c0, c1):
    c0, c1 = np.array(c0, float), np.array(c1, float)
    return c0 + (c1 - c0) * np.clip(v, 0, 1)[..., None]


def quantize(img, k):
    """Median-cut colour reduction."""
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


def retro_crush(rgb, size=128, colors=32):
    """Shrink a detailed source to retro resolution and reduce its palette."""
    factor = rgb.shape[0] // size
    h = rgb.shape[0] // factor
    small = rgb[:h * factor, :h * factor].reshape(h, factor, h, factor, 3).mean(axis=(1, 3))
    return quantize(small, colors)


def save_tex(name, rgb):
    h, w = rgb.shape[:2]
    rgba = np.dstack([np.clip(np.flipud(rgb), 0, 1), np.ones((h, w))]).astype(np.float32)
    old = bpy.data.images.get(name)
    if old:
        bpy.data.images.remove(old)
    img = bpy.data.images.new(name, w, h, alpha=False)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = os.path.join(TEX_DIR, name + ".png")
    img.file_format = "PNG"
    img.save()
    return img


def tex_planks(name, dark, light, planks=6, size=128):
    n = HI
    grain, blotch = noise(n, 3, 48), noise(n, 4, 4)
    v = np.zeros((n, n))
    gap = max(2, n // 128)
    edges = [p * n // planks for p in range(planks + 1)]
    for p in range(planks):
        y0, y1 = edges[p], edges[p + 1]
        v[y0:y1] = np.roll(grain, int(rng.integers(n)), axis=1)[y0:y1] + rng.uniform(-0.2, 0.2)
    rgb = ramp(np.clip(v * 0.72 + blotch * 0.28, 0, 1), dark, light)
    for p in range(planks):
        y0, y1 = edges[p], edges[p + 1]
        joint = int(rng.integers(n))
        rgb[y0:y1, np.arange(joint, joint + gap) % n] *= 0.3
        rgb[y0:y0 + gap] *= 0.25
        rgb[y0 + gap:y0 + 2 * gap] *= 1.15
    return save_tex(name, retro_crush(rgb, size))


def tex_stone(name, c0, c1, mortar, rows=6, cols=4, size=128):
    n = HI
    fine, big = noise(n, 24, 24), noise(n, 5, 5)
    rh, bw, m = n / rows, n / cols, n / 85
    yy, xx0 = np.mgrid[0:n, 0:n]
    row = (yy / rh).astype(int)
    xx = (xx0 + (row % 2) * bw / 2) % n
    col = (xx / bw).astype(int)
    tone = rng.random((rows, cols))[row, col]
    edge = np.minimum(np.minimum(xx % bw, bw - xx % bw), np.minimum(yy % rh, rh - yy % rh))
    rgb = ramp(np.clip(0.15 + 0.4 * tone + 0.3 * fine + 0.2 * big, 0, 1), c0, c1)
    rgb *= (0.5 + 0.5 * np.clip(edge / (m * 2.4), 0, 1) ** 0.6)[..., None]
    joint = edge < m
    rgb[joint] = np.array(mortar) * (0.7 + 0.6 * fine[joint])[..., None]
    return save_tex(name, retro_crush(rgb, size))


def tex_flat(name, c, variation=0.12, freq=24, size=32, colors=12):
    v = noise(HI, freq, freq)
    rgb = np.array(c, float) * (1 + variation * (v[..., None] - 0.5) * 2)
    return save_tex(name, retro_crush(rgb, size, colors))


def tex_barrel(name, size=64):
    n = HI
    grain, staves = noise(n, 48, 3), 12
    sw = n // staves
    v = grain.copy()
    for s in range(staves):
        v[:, s * sw:(s + 1) * sw] += rng.uniform(-0.2, 0.2)
    rgb = ramp(v, (0.16, 0.09, 0.05), (0.56, 0.36, 0.2))
    rgb[:, np.arange(staves) * sw] *= 0.25
    for lo, hi in ((0.16, 0.24), (0.76, 0.84)):
        band = (np.arange(n) >= lo * n) & (np.arange(n) < hi * n)
        rgb[band] = ramp(noise(n, 30, 30)[band], (0.1, 0.1, 0.11), (0.33, 0.32, 0.33))
    return save_tex(name, retro_crush(rgb, size))


def tex_rug(name, size=128):
    n = HI
    yy, xx = np.mgrid[0:n, 0:n] / (n - 1)
    edge = np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy))
    diamond = np.abs(xx - 0.5) + np.abs(yy - 0.5)
    rgb = np.zeros((n, n, 3)) + np.array((0.42, 0.08, 0.07))
    rgb[(diamond < 0.30) & (diamond > 0.24)] = (0.72, 0.56, 0.3)
    rgb[diamond < 0.16] = (0.12, 0.13, 0.26)
    rgb[edge < 0.11] = (0.12, 0.13, 0.26)
    rgb[edge < 0.08] = (0.72, 0.56, 0.3)
    rgb[edge < 0.05] = (0.3, 0.05, 0.05)
    rgb *= (0.65 + 0.6 * noise(n, 90, 90, 2))[..., None]
    return save_tex(name, retro_crush(rgb, size, 24))


def tex_window(name, size=64):
    n = HI
    yy, xx = np.mgrid[0:n, 0:n] / (n - 1)
    rgb = ramp(yy * 0.8 + noise(n, 6, 6) * 0.2, (0.42, 0.56, 0.78), (0.1, 0.17, 0.36))
    bars = (np.abs((xx * 2) % 1 - 0.5) > 0.46) | (np.abs((yy * 3) % 1 - 0.5) > 0.46)
    rgb[bars] = (0.05, 0.04, 0.04)
    return save_tex(name, retro_crush(rgb, size, 16))


def tex_flame(name, size=32):
    n = HI
    v = np.clip(np.arange(n)[:, None] / n * 0.75 + noise(n, 8, 5) * 0.4, 0, 1)
    rgb = ramp(v, (1.0, 0.86, 0.36), (0.95, 0.28, 0.03))
    return save_tex(name, retro_crush(rgb, size, 8))


def material(name, image, emissive=False):
    old = bpy.data.materials.get(name)
    if old:
        bpy.data.materials.remove(old)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    tree = mat.node_tree
    bsdf = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
    tex = tree.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Closest"
    tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.95
    if emissive:
        tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
        bsdf.inputs["Emission Strength"].default_value = 1.0
    return mat


# ------------------------------------------------------------ mesh builder

class Part:
    """One Blender object assembled from boxes and lathed shapes."""

    def __init__(self, coll, name, **props):
        self.coll, self.name, self.props = coll, name, props
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.mats = []

    def _slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def box(self, cx, cy, z0, sx, sy, sz, mat, rz=0.0, tile=1.0, fit=False, swap=False):
        bm, slot = self.bm, self._slot(mat)
        c, s = math.cos(rz), math.sin(rz)
        corners = [(-sx / 2, -sy / 2), (sx / 2, -sy / 2), (sx / 2, sy / 2), (-sx / 2, sy / 2)]
        ring = [(cx + c * x - s * y, cy + s * x + c * y) for x, y in corners]
        bot = [bm.verts.new((x, y, z0)) for x, y in ring]
        top = [bm.verts.new((x, y, z0 + sz)) for x, y in ring]
        faces = [bm.faces.new(list(reversed(bot))), bm.faces.new(top)]
        for i in range(4):
            j = (i + 1) % 4
            faces.append(bm.faces.new((bot[i], bot[j], top[j], top[i])))
        off_u, off_v = (0.0, 0.0) if fit else (float(rng.random()), float(rng.random()))
        for face in faces:
            face.material_index = slot
            face.normal_update()
            nx, ny, nz = (abs(a) for a in face.normal)
            for loop in face.loops:
                x, y, z = loop.vert.co
                if fit:
                    x, y, z = (x - cx + sx / 2) / sx, (y - cy + sy / 2) / sy, (z - z0) / sz
                    scale = 1.0
                else:
                    scale = tile
                if nz >= nx and nz >= ny:
                    u, v = x, y
                elif nx >= ny:
                    u, v = y, z
                else:
                    u, v = x, z
                if swap:
                    u, v = v, u
                loop[self.uv].uv = (u * scale + off_u, v * scale + off_v)
        return self

    def lathe(self, cx, cy, z0, profile, segs, side, cap=None, tile=1.0):
        bm, side_slot = self.bm, self._slot(side)
        cap_slot = self._slot(cap or side)
        rings = []
        for r, dz in profile:
            rings.append([bm.verts.new((cx + r * math.cos(2 * math.pi * i / segs),
                                        cy + r * math.sin(2 * math.pi * i / segs),
                                        z0 + dz)) for i in range(segs)])
        height = (profile[-1][1] - profile[0][1]) or 1.0
        vs = [(dz - profile[0][1]) / height for _, dz in profile]
        for j in range(len(rings) - 1):
            low, high = rings[j], rings[j + 1]
            for i in range(segs):
                k = (i + 1) % segs
                face = bm.faces.new((low[i], low[k], high[k], high[i]))
                face.material_index = side_slot
                u0, u1 = i / segs, (i + 1) / segs
                uvs = ((u0, vs[j]), (u1, vs[j]), (u1, vs[j + 1]), (u0, vs[j + 1]))
                for loop, uv in zip(face.loops, uvs):
                    loop[self.uv].uv = uv
        for ring in (list(reversed(rings[0])), rings[-1]):
            face = bm.faces.new(ring)
            face.material_index = cap_slot
            for loop in face.loops:
                loop[self.uv].uv = (loop.vert.co.x * tile, loop.vert.co.y * tile)
        return self

    def done(self, loc=(0, 0, 0), rz=0.0, parent=None):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mat in self.mats:
            mesh.materials.append(mat)
        obj = bpy.data.objects.new(self.name, mesh)
        self.coll.objects.link(obj)
        obj.location = loc
        obj.rotation_euler[2] = rz
        obj.parent = parent
        for key, value in self.props.items():
            obj[key] = value
        return obj


def empty(coll, name, loc, parent=None, **props):
    obj = bpy.data.objects.new(name, None)
    coll.objects.link(obj)
    obj.location = loc
    obj.parent = parent
    for key, value in props.items():
        obj[key] = value
    return obj


# ------------------------------------------------------------------- build

def reset_scene():
    old = bpy.data.scenes.get(SCENE_NAME)
    if old:
        for obj in list(old.objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        for coll in list(old.collection.children):
            bpy.data.collections.remove(coll)
        bpy.data.scenes.remove(old)
    scene = bpy.data.scenes.new(SCENE_NAME)
    bpy.context.window.scene = scene
    return scene


def make_materials():
    m = {}
    def add(key, image, emissive=False):
        m[key] = material("T_" + key, image, emissive)
    add("floor", tex_planks("T_floor", (0.2, 0.12, 0.07), (0.58, 0.4, 0.24)))
    add("wood", tex_planks("T_wood", (0.11, 0.065, 0.04), (0.42, 0.27, 0.16), planks=4))
    add("crate", tex_planks("T_crate", (0.25, 0.17, 0.09), (0.66, 0.5, 0.3), planks=3, size=64))
    add("tabletop", tex_planks("T_tabletop", (0.42, 0.3, 0.17), (0.9, 0.74, 0.5), planks=4, size=64))
    add("stone", tex_stone("T_stone", (0.22, 0.21, 0.2), (0.6, 0.57, 0.52), (0.13, 0.12, 0.11)))
    add("hearth", tex_stone("T_hearth", (0.24, 0.12, 0.09), (0.56, 0.31, 0.23), (0.1, 0.08, 0.07), rows=8, cols=5))
    add("barrel", tex_barrel("T_barrel"))
    add("rug", tex_rug("T_rug"))
    add("window", tex_window("T_window"), emissive=True)
    add("flame", tex_flame("T_flame"), emissive=True)
    flats = {
        "iron": (0.19, 0.19, 0.21), "soot": (0.04, 0.035, 0.03), "wax": (0.86, 0.8, 0.62),
        "bark": (0.2, 0.13, 0.08), "ceramic": (0.68, 0.64, 0.55), "pewter": (0.5, 0.5, 0.52),
        "glass_green": (0.12, 0.34, 0.17), "glass_amber": (0.5, 0.26, 0.07), "glass_wine": (0.3, 0.05, 0.1),
        "tunic": (0.2, 0.32, 0.27), "trousers": (0.3, 0.24, 0.17), "leather": (0.24, 0.14, 0.08),
        "skin": (0.72, 0.51, 0.39), "hair": (0.16, 0.1, 0.06),
    }
    for key, colour in flats.items():
        add(key, tex_flat("T_" + key, colour))
    return m


def build_room(c, m):
    w, d, h = 7.0, 5.0, 3.2
    Part(c, "Floor").box(0, 0, -0.2, 2 * w, 2 * d, 0.2, m["floor"], tile=0.5).done()
    Part(c, "Wall_N", collide=1).box(0, d + 0.2, 0, 2 * w + 0.8, 0.4, h, m["stone"], tile=0.5).done()
    Part(c, "Wall_W", collide=1).box(-w - 0.2, 0, 0, 0.4, 2 * d, h, m["stone"], tile=0.5).done()
    Part(c, "Wall_E", collide=1).box(w + 0.2, 0, 0, 0.4, 2 * d, h, m["stone"], tile=0.5).done()
    # The south wall is a low sill so it never hides the player from the camera.
    Part(c, "Wall_S", collide=1).box(0, -d - 0.2, 0, 2 * w + 0.8, 0.4, 0.35, m["stone"], tile=0.5).done()

    beams = Part(c, "Beams")
    for x in (-6.8, -3.2, 0.4, 6.8):
        beams.box(x, d - 0.08, 0, 0.26, 0.16, h, m["wood"], swap=True)
    for y in (-4.8, -1.6, 1.6, 4.8):
        beams.box(-w + 0.08, y, 0, 0.16, 0.26, h, m["wood"], swap=True)
        beams.box(w - 0.08, y, 0, 0.16, 0.26, h, m["wood"], swap=True)
    beams.box(0, d - 0.1, h - 0.28, 2 * w, 0.2, 0.28, m["wood"])
    beams.box(-w + 0.1, 0, h - 0.28, 0.2, 2 * d, 0.28, m["wood"])
    beams.box(w - 0.1, 0, h - 0.28, 0.2, 2 * d, 0.28, m["wood"])
    beams.done()

    door = Part(c, "Door", collide=1)
    door.box(-1.5, d - 0.03, 0, 1.3, 0.1, 2.25, m["wood"], tile=0.9, swap=True)
    door.box(-1.5, d - 0.1, 0.45, 1.3, 0.05, 0.12, m["iron"])
    door.box(-1.5, d - 0.1, 1.7, 1.3, 0.05, 0.12, m["iron"])
    door.done()

    window = Part(c, "Window")
    window.box(-4.6, d - 0.02, 1.15, 1.25, 0.04, 1.3, m["window"], fit=True)
    window.box(-4.6, d - 0.06, 2.45, 1.45, 0.14, 0.12, m["wood"])
    window.box(-4.6, d - 0.06, 1.03, 1.45, 0.18, 0.12, m["wood"])
    window.done()

    rug = Part(c, "Rug")
    rug.box(-1.8, -2.6, 0, 3.8, 2.8, 0.02, m["rug"], fit=True)
    rug.done()


def build_fireplace(c, m):
    y0, depth_x = 0.5, -6.45
    fp = Part(c, "Fireplace", collide=1)
    stone = m["hearth"]
    fp.box(depth_x, y0 - 1.0, 0, 1.1, 0.6, 1.25, stone, tile=0.7)
    fp.box(depth_x, y0 + 1.0, 0, 1.1, 0.6, 1.25, stone, tile=0.7)
    fp.box(depth_x, y0, 1.25, 1.1, 2.6, 0.95, stone, tile=0.7)
    fp.box(-6.95, y0, 0, 0.1, 1.4, 1.25, m["soot"])
    fp.box(depth_x, y0, 0, 1.1, 1.4, 0.04, m["soot"])
    fp.box(-5.82, y0, 1.55, 0.34, 2.9, 0.13, m["wood"])
    fp.box(-6.6, y0, 2.2, 0.8, 1.6, 1.0, stone, tile=0.7)
    fp.done()

    fire = Part(c, "Fire")
    for offset, angle in ((-0.2, 0.25), (0.2, -0.3), (0.0, 1.35)):
        fire.box(-6.4, y0 + offset, 0.04, 0.8, 0.16, 0.15, m["bark"], rz=math.pi / 2 + angle)
    for dx, dy, r, tall in ((0, 0, 0.22, 0.75), (0.08, 0.28, 0.14, 0.5), (0.05, -0.27, 0.15, 0.55)):
        fire.lathe(-6.4 + dx, y0 + dy, 0.14,
                   [(r, 0), (r * 1.1, tall * 0.3), (r * 0.5, tall * 0.7), (0.01, tall)], 5, m["flame"])
    fire.done()
    empty(c, "Light_Fire", (-5.45, y0, 0.9), light="fire")


def build_bar(c, m):
    bar = Part(c, "BarCounter", collide=1)
    bar.box(3.2, 2.9, 0, 4.4, 0.62, 1.02, m["wood"], tile=0.8, swap=True)
    bar.box(3.2, 2.9, 1.02, 4.75, 0.86, 0.08, m["floor"], tile=0.7)
    bar.box(3.2, 2.56, 0.1, 4.45, 0.05, 0.08, m["iron"])
    bar.done()

    shelf = Part(c, "BackShelf", collide=1)
    shelf.box(3.4, 4.7, 0, 5.4, 0.55, 0.9, m["wood"], tile=0.8, swap=True)
    shelf.box(3.4, 4.7, 0.9, 5.6, 0.62, 0.06, m["floor"], tile=0.7)
    for x in (0.75, 3.4, 6.05):
        shelf.box(x, 4.86, 0.96, 0.1, 0.24, 1.5, m["wood"], swap=True)
    for z in (1.55, 2.2):
        shelf.box(3.4, 4.84, z, 5.5, 0.3, 0.06, m["wood"])
    shelf.done()

    bottles = Part(c, "Bottles")
    kinds = ("glass_green", "glass_amber", "glass_wine")
    profile = [(0.05, 0), (0.055, 0.17), (0.02, 0.24), (0.02, 0.32)]
    for z in (0.96, 1.61, 2.26):
        for x in np.arange(1.0, 5.9, 0.34):
            if rng.random() < 0.8:
                bottles.lathe(float(x) + float(rng.uniform(-0.05, 0.05)), 4.84 + float(rng.uniform(-0.06, 0.06)),
                              z, profile, 6, m[kinds[int(rng.integers(3))]])
    bottles.done()

    lantern = Part(c, "BarLantern")
    lantern.lathe(1.5, 2.9, 1.1, [(0.11, 0), (0.1, 0.03)], 6, m["iron"])
    lantern.lathe(1.5, 2.9, 1.13, [(0.075, 0), (0.09, 0.14), (0.06, 0.24)], 6, m["flame"])
    lantern.lathe(1.5, 2.9, 1.37, [(0.1, 0), (0.02, 0.11)], 6, m["iron"])
    lantern.done()
    empty(c, "Light_Bar", (1.5, 2.45, 1.9), light="lantern")

    for i, x in enumerate((2.5, 3.1, 4.2)):
        mug(c, m, f"Mug_Bar{i}", x, 2.85 + 0.12 * (i % 2), 1.1)


def mug(c, m, name, x, y, z):
    Part(c, name).lathe(x, y, z, [(0.05, 0), (0.055, 0.11)], 6, m["pewter"]).done()


def candle(c, m, name, x, y, z):
    part = Part(c, name)
    part.lathe(x, y, z, [(0.07, 0), (0.07, 0.015)], 6, m["iron"])
    part.lathe(x, y, z + 0.015, [(0.03, 0), (0.03, 0.13)], 5, m["wax"])
    part.lathe(x, y, z + 0.15, [(0.018, 0), (0.024, 0.03), (0.003, 0.09)], 4, m["flame"])
    part.done()
    empty(c, "Light_" + name, (x, y, z + 0.55), light="candle")


def stool(c, m, name, x, y):
    part = Part(c, name, collide=1)
    part.lathe(0, 0, 0.56, [(0.17, 0), (0.17, 0.05)], 8, m["crate"], m["floor"])
    for i in range(3):
        a = i * 2 * math.pi / 3
        part.box(0.11 * math.cos(a), 0.11 * math.sin(a), 0, 0.05, 0.05, 0.56, m["wood"], swap=True)
    part.done((x, y, 0))


def chair(c, m, name, x, y, rz):
    part = Part(c, name, collide=1)
    part.box(0, 0, 0.45, 0.44, 0.42, 0.05, m["floor"])
    for sx, sy in ((-0.18, -0.17), (0.18, -0.17), (-0.18, 0.17), (0.18, 0.17)):
        part.box(sx, sy, 0, 0.055, 0.055, 0.45, m["wood"], swap=True)
    for sx in (-0.18, 0.18):
        part.box(sx, -0.19, 0.5, 0.055, 0.05, 0.5, m["wood"], swap=True)
    part.box(0, -0.19, 0.84, 0.42, 0.04, 0.14, m["wood"])
    part.done((x, y, 0), rz)


def rect_table(c, m, key, x, y):
    table = Part(c, "Table_" + key, collide=1)
    table.box(0, 0, 0.72, 1.7, 0.95, 0.07, m["tabletop"], tile=0.7)
    for sx, sy in ((-0.72, -0.36), (0.72, -0.36), (-0.72, 0.36), (0.72, 0.36)):
        table.box(sx, sy, 0, 0.1, 0.1, 0.72, m["wood"], swap=True)
    table.done((x, y, 0))
    chair(c, m, f"Chair_{key}_N", x - 0.35, y + 0.82, math.pi)
    chair(c, m, f"Chair_{key}_S", x + 0.35, y - 0.82, 0)
    Part(c, f"Plate_{key}").lathe(x - 0.35, y + 0.2, 0.79, [(0.11, 0), (0.14, 0.02)], 8, m["ceramic"]).done()
    mug(c, m, f"Mug_{key}", x + 0.42, y - 0.18, 0.79)
    candle(c, m, f"Candle_{key}", x, y, 0.79)


def build_furniture(c, m):
    rect_table(c, m, "A", -2.8, 2.2)
    rect_table(c, m, "B", -1.8, -2.6)

    round_table = Part(c, "Table_C", collide=1)
    round_table.lathe(0, 0, 0.72, [(0.72, 0), (0.72, 0.07)], 10, m["wood"], m["tabletop"], tile=0.7)
    round_table.lathe(0, 0, 0, [(0.34, 0), (0.09, 0.14), (0.08, 0.72)], 6, m["wood"])
    round_table.done((3.0, -1.4, 0))
    candle(c, m, "Candle_C", 3.0, -1.4, 0.79)
    mug(c, m, "Mug_C", 3.3, -1.25, 0.79)
    stool(c, m, "Stool_C1", 3.0, -2.45)
    stool(c, m, "Stool_C2", 4.0, -0.85)
    stool(c, m, "Stool_C3", 2.0, -0.85)
    for i, x in enumerate((2.3, 3.2, 4.1, 5.0)):
        stool(c, m, f"Stool_Bar{i}", x, 2.1)

    profile = [(0.3, 0), (0.37, 0.25), (0.4, 0.45), (0.37, 0.65), (0.3, 0.9)]
    for i, (x, y) in enumerate(((6.3, -4.3), (5.45, -4.35), (6.35, -3.45))):
        Part(c, f"Barrel_{i}", collide=1).lathe(0, 0, 0, profile, 10, m["barrel"], m["wood"]).done((x, y, 0))

    for i, (x, y, s) in enumerate(((-6.2, -4.2, 1.0), (-5.15, -4.3, 0.8), (-6.25, -3.2, 0.75))):
        crate = Part(c, f"Crate_{i}", collide=1)
        crate.box(0, 0, 0, s, s, s, m["crate"], tile=0.9)
        for sx, sy in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
            crate.box(sx * (s / 2 - 0.03), sy * (s / 2 - 0.03), 0, 0.08, 0.08, s + 0.01, m["wood"], swap=True)
        crate.done((x, y, 0))


# ------------------------------------------------------- faceted characters
#
# Bodies follow the low-poly reference sheets: stacked cross-sections joined by
# hard-edged triangles. Each moving body part is its own object with its origin
# on the joint, so the game can animate them without skinning. Rings are written
# in model space with the character standing at the origin, facing +Y, arms
# hanging straight down; the arm splay is applied as a rest rotation.

# Head layout, from the chin up: (height above the chin, half outline running from the
# centre of the face round to the centre of the back of the head). The rings are mirrored.
HEAD_RINGS = [
    (0.0, [(0, 0.082), (0.025, 0.08), (0.035, 0.06), (0.03, 0.02), (0.018, -0.01), (0.01, -0.02), (0, -0.025)]),
    (0.037, [(0, 0.09), (0.032, 0.087), (0.058, 0.06), (0.066, 0.015), (0.058, -0.025), (0.03, -0.05), (0, -0.055)]),
    (0.069, [(0, 0.095), (0.035, 0.09), (0.064, 0.062), (0.074, 0.01), (0.068, -0.04), (0.04, -0.07), (0, -0.075)]),
    (0.094, [(0, 0.094), (0.04, 0.092), (0.07, 0.06), (0.078, 0.008), (0.074, -0.05), (0.045, -0.08), (0, -0.085)]),
    (0.106, [(0, 0.092), (0.02, 0.08), (0.055, 0.08), (0.076, 0.045), (0.078, -0.01), (0.048, -0.085), (0, -0.09)]),
    (0.124, [(0, 0.098), (0.026, 0.1), (0.058, 0.088), (0.078, 0.05), (0.08, -0.03), (0.05, -0.085), (0, -0.09)]),
    (0.159, [(0, 0.088), (0.03, 0.086), (0.06, 0.07), (0.074, 0.03), (0.075, -0.04), (0.045, -0.08), (0, -0.085)]),
    (0.204, [(0, 0.055), (0.02, 0.052), (0.04, 0.04), (0.05, 0.015), (0.05, -0.03), (0.03, -0.055), (0, -0.06)]),
]
# Short hair with an overhanging front edge. Low rings stay inside the skull at the front so the face shows.
HAIR_SHORT = [
    (0.084, [(0, 0.02), (0.03, 0.02), (0.06, 0.02), (0.085, 0.005), (0.086, -0.045), (0.056, -0.09), (0, -0.097)]),
    (0.125, [(0, 0.04), (0.03, 0.04), (0.07, 0.045), (0.089, 0.02), (0.089, -0.05), (0.056, -0.095), (0, -0.1)]),
    (0.151, [(0, 0.06), (0.035, 0.06), (0.072, 0.05), (0.09, 0.02), (0.087, -0.055), (0.052, -0.095), (0, -0.098)]),
    (0.164, [(0, 0.104), (0.035, 0.104), (0.076, 0.082), (0.09, 0.022), (0.085, -0.055), (0.05, -0.094), (0, -0.096)]),
    (0.189, [(0, 0.106), (0.04, 0.102), (0.075, 0.07), (0.084, 0.02), (0.08, -0.05), (0.045, -0.085), (0, -0.088)]),
    (0.214, [(0, 0.07), (0.03, 0.068), (0.055, 0.045), (0.062, 0.01), (0.058, -0.03), (0.035, -0.055), (0, -0.058)]),
]

MALE = {
    "name": "Male", "tunic": "tunic", "hair": "hair", "splay": 0.257, "leg_splay": 0.08, "arm_sides": 10, "cuff_bands": 1,
    "hips_z": 1.06, "torso_z": 1.16, "neck_z": 1.6,
    # Smallclothes painted on the bare body: braies from this height down to this one on the thighs.
    "braies": (1.14, 0.9),
    "hip_x": 0.1, "shoulder": (0.187, 1.46), "elbow_z": 1.284, "wrist_z": 0.985,
    "knee_z": 0.58, "hand_scale": 1.0, "foot_scale": 1.1,
    # (z, half width, front depth, back depth[, forward shift])
    "hips": [(0.86, 0.09, 0.07, 0.08), (0.92, 0.19, 0.105, 0.125), (0.98, 0.182, 0.105, 0.125),
             (1.05, 0.162, 0.105, 0.112), (1.11, 0.155, 0.1, 0.105)],
    "torso": [(1.05, 0.16, 0.095, 0.1), (1.13, 0.15, 0.098, 0.1), (1.2, 0.128, 0.096, 0.095),
              (1.26, 0.122, 0.105, 0.1), (1.33, 0.15, 0.14, 0.12), (1.4, 0.185, 0.15, 0.13),
              (1.47, 0.205, 0.13, 0.125), (1.535, 0.17, 0.095, 0.105), (1.585, 0.152, 0.082, 0.09),
              (1.618, 0.124, 0.072, 0.08)],
    # Arm rings add: forward shift, shift away from the body, slope of the ring (outer edge lower).
    "upper_arm": [(1.22, 0.048, 0.054, 0.052, 0.0, 0.0, 0.0), (1.27, 0.05, 0.056, 0.056, 0.0, 0.0, 0.0),
                  (1.33, 0.055, 0.074, 0.064, 0.005, 0.003, 0.0), (1.375, 0.058, 0.074, 0.066, 0.0, 0.006, 0.0),
                  (1.41, 0.072, 0.08, 0.076, 0.0, 0.012, 0.0), (1.46, 0.06, 0.082, 0.08, 0.0, 0.0, 0.1),
                  (1.515, 0.05, 0.078, 0.074, 0.0, -0.01, 0.35), (1.555, 0.028, 0.05, 0.05, 0.0, -0.03, 0.5)],
    "forearm": [(0.98, 0.032, 0.036, 0.036, 0.0, 0.0, 0.0), (1.01, 0.036, 0.04, 0.04, 0.0, 0.0, 0.0),
                (1.08, 0.046, 0.054, 0.05, 0.0, 0.004, 0.0), (1.16, 0.06, 0.068, 0.06, 0.0, 0.008, 0.0),
                (1.22, 0.064, 0.072, 0.062, 0.0, 0.006, 0.0), (1.27, 0.05, 0.055, 0.055, 0.0, 0.0, 0.0)],
    "thigh": [(0.48, 0.06, 0.07, 0.068), (0.6, 0.062, 0.075, 0.074), (0.68, 0.068, 0.08, 0.08),
              (0.8, 0.086, 0.1, 0.1), (0.9, 0.086, 0.106, 0.11), (0.97, 0.056, 0.08, 0.085)],
    "shin": [(0.09, 0.036, 0.046, 0.048), (0.15, 0.037, 0.048, 0.05), (0.22, 0.04, 0.052, 0.056),
             (0.3, 0.048, 0.06, 0.066), (0.37, 0.062, 0.068, 0.082), (0.44, 0.077, 0.08, 0.082),
             (0.49, 0.068, 0.088, 0.07), (0.56, 0.064, 0.075, 0.062)],
    # Neck: (z, half width, front depth, back depth, forward shift, collar pit depth).
    "neck": [(1.58, 0.1, 0.066, 0.076, -0.006, 0.012), (1.62, 0.074, 0.055, 0.07, -0.008, 0.014),
             (1.645, 0.058, 0.046, 0.06, -0.01, 0.01), (1.69, 0.043, 0.04, 0.05, -0.012, 0.0),
             (1.725, 0.04, 0.036, 0.05, -0.012, 0.0)],
    "chin_z": 1.655, "head_scale": (0.85, 0.95, 1.0), "jaw": 1.0, "angular_head": True,
    "hat_z": 1.8,  # where a hat's crown sits, just above the brow
    "hair_outlines": HAIR_SHORT,
    "penis": True,  # a tube and a sack at his groin the game shapes into his penis and scrotum
    "skinned": True, "quads": True, "plated": True, "skin": "skin", "pants": "trousers", "belt": "leather",
    "sleeve_rows": 7, "leg_drop": {}, "trunk_blend": (1.1, 0.08),
    "bare_profile": [(0.89, 0.173, 0.1, 0.125), (0.976, 0.16, 0.1, 0.13), (1.04, 0.14, 0.1, 0.12), (1.125, 0.13, 0.095, 0.1),
                     (1.215, 0.116, 0.095, 0.09), (1.3, 0.13, 0.1, 0.1), (1.37, 0.15, 0.125, 0.12), (1.433, 0.16, 0.15, 0.125),
                     (1.496, 0.16, 0.135, 0.125), (1.554, 0.15, 0.095, 0.105), (1.582, 0.125, 0.08, 0.1), (1.618, 0.075, 0.06, 0.07)],
    "bare_arm": [(1.438, 0.046, 0.07), (1.4, 0.052, 0.07), (1.33, 0.045, 0.06), (1.295, 0.036, 0.05), (1.275, 0.04, 0.055),
                 (1.225, 0.052, 0.06), (1.12, 0.043, 0.05), (1.0, 0.025, 0.032)],
    "skin_leg": [(0.698, 0.057, 0.075, 0.072), (0.6426, 0.05, 0.072, 0.065), (0.6, 0.06, 0.09, 0.062), (0.535, 0.05, 0.075, 0.06),
                 (0.469, 0.07, 0.062, 0.09), (0.3, 0.05, 0.05, 0.06), (0.178, 0.026, 0.04, 0.04), (0.09, 0.036, 0.046, 0.048)],
    "shoulder_points": {"SHf": (0.205, 0.055, 1.51), "SHb": (0.205, -0.06, 1.51), "SHm": (0.224, -0.005, 1.513),
                        "T": (0.12, -0.01, 1.58)},
}

# A rounder face with full cheeks and a small chin.
HEAD_CUTE = [
    (0.0, [(0, 0.075), (0.016, 0.072), (0.024, 0.055), (0.022, 0.02), (0.014, -0.01), (0.008, -0.02), (0, -0.025)]),
    (0.035, [(0, 0.088), (0.03, 0.085), (0.054, 0.06), (0.062, 0.015), (0.054, -0.025), (0.03, -0.05), (0, -0.055)]),
    (0.07, [(0, 0.095), (0.04, 0.094), (0.07, 0.068), (0.08, 0.012), (0.072, -0.04), (0.04, -0.07), (0, -0.075)]),
    (0.1, [(0, 0.093), (0.04, 0.094), (0.072, 0.066), (0.082, 0.01), (0.076, -0.05), (0.045, -0.08), (0, -0.085)]),
    (0.112, [(0, 0.092), (0.02, 0.086), (0.055, 0.086), (0.078, 0.05), (0.08, -0.01), (0.05, -0.085), (0, -0.09)]),
    (0.13, [(0, 0.094), (0.026, 0.094), (0.058, 0.085), (0.08, 0.05), (0.082, -0.03), (0.05, -0.085), (0, -0.09)]),
    (0.165, [(0, 0.088), (0.03, 0.086), (0.06, 0.07), (0.076, 0.03), (0.077, -0.04), (0.045, -0.08), (0, -0.085)]),
    (0.21, [(0, 0.055), (0.02, 0.052), (0.04, 0.04), (0.05, 0.015), (0.05, -0.03), (0.03, -0.055), (0, -0.06)]),
]
# Hair pulled up and back, leaving the face clear.
HAIR_UPDO = [
    (0.09, [(0, 0.01), (0.03, 0.01), (0.06, 0.015), (0.075, 0.0), (0.08, -0.05), (0.055, -0.09), (0, -0.097)]),
    (0.135, [(0, 0.05), (0.03, 0.05), (0.065, 0.05), (0.083, 0.03), (0.085, -0.05), (0.056, -0.095), (0, -0.1)]),
    (0.16, [(0, 0.085), (0.035, 0.088), (0.068, 0.072), (0.085, 0.03), (0.085, -0.055), (0.052, -0.095), (0, -0.098)]),
    (0.19, [(0, 0.085), (0.04, 0.082), (0.072, 0.06), (0.082, 0.02), (0.078, -0.05), (0.045, -0.085), (0, -0.088)]),
    (0.225, [(0, 0.05), (0.03, 0.048), (0.05, 0.03), (0.058, 0.008), (0.055, -0.03), (0.033, -0.055), (0, -0.058)]),
]

FEMALE = {
    # "medieval": chemise, laced bodice, long skirt, apron and leather shoes.
    # "modern": the original white tee, red track pants and white sneakers, kept for later.
    "outfit": "medieval",
    "jiggle": True,  # spring bones for the bust, belly, glutes and skirt hem
    "shoe_styles": True,  # her other shoes, heels and boots (SHOE_STYLES), each its own mesh
    "nipples": True,  # discs the game shapes into her areolae and nipples
    "pubes": True,  # a patch over her mound the game draws her pubic hair's style on
    "lingerie": True,  # a patch over her trunk the game draws her underwear styles on
    "navel": 0.962,  # the height of her navel, a small pit pressed into the bare belly
    "vulva": True,  # a grid over her groin the game shapes into her vulva, opening onto her canal
    "anus": True,  # a disc in the cleft of her rear the game shapes into her anus, opening onto its canal
    "name": "Female", "tunic": "tee_white", "hair": "hair_f", "skin": "skin_f", "pants": "pants_red",
    "belt": "waistband", "shoe": "shoe_w", "sole": "sole_w", "splay": 0.28, "leg_splay": 0.05,
    "arm_sides": 8, "cuff_bands": 0, "midriff_bands": 2, "bare_arm_bands": 2, "bare_forearm": True,
    "fold": 0.0, "quads": True, "skinned": True, "stripes": True, "drawstring": True, "necklace": True, "sneakers": True, "cute_face": True,
    "hips_z": 0.86, "torso_z": 0.98, "neck_z": 1.37,
    # Smallclothes painted on the bare body: braies from this height down to this one on the thighs, and a
    # band over the bust between these two.
    "braies": (0.93, 0.72), "breast_band": (1.065, 1.205),
    "hip_x": 0.098, "shoulder": (0.105, 1.3), "shoulder_y": -0.03, "arm_lean": (0.36, 0.06), "elbow_z": 1.04, "wrist_z": 0.85,
    "knee_z": 0.47, "hand_scale": 0.76, "foot_scale": 0.9,
    "back_seam": 0.015,
    # One outline for the whole trunk of the skinned body: (height, half width, front, back).
    "skin_profile": [(0.76, 0.17, 0.07, 0.095), (0.841, 0.172, 0.073, 0.112), (0.898, 0.148, 0.076, 0.095),
                     (0.93, 0.128, 0.078, 0.075), (0.974, 0.106, 0.08, 0.055), (1.005, 0.095, 0.083, 0.042),
                     (1.055, 0.09, 0.083, 0.04), (1.056, 0.082, 0.08, 0.033), (1.0705, 0.083, 0.08, 0.034),
                     (1.0715, 0.093, 0.09, 0.044), (1.108, 0.095, 0.09, 0.045), (1.152, 0.106, 0.122, 0.05),
                     (1.19, 0.114, 0.105, 0.052), (1.235, 0.124, 0.082, 0.056), (1.321, 0.128, 0.055, 0.06),
                     (1.335, 0.068, 0.05, 0.05)],
    # The body under the clothes: no hems, waistband or sleeves.
    "bare_profile": [(0.76, 0.17, 0.07, 0.095), (0.841, 0.17, 0.072, 0.11), (0.898, 0.146, 0.075, 0.093),
                     (0.93, 0.126, 0.077, 0.073), (0.974, 0.104, 0.079, 0.054), (1.005, 0.09, 0.08, 0.04),
                     (1.062, 0.082, 0.08, 0.034), (1.108, 0.092, 0.088, 0.043), (1.152, 0.106, 0.12, 0.048),
                     (1.19, 0.112, 0.103, 0.05), (1.235, 0.122, 0.08, 0.054), (1.321, 0.126, 0.054, 0.058),
                     (1.335, 0.066, 0.049, 0.049)],
    "bare_arm": [(1.219, 0.034, 0.05), (1.1815, 0.029, 0.04), (1.134, 0.027, 0.035), (1.0765, 0.025, 0.03),
                 (1.0465, 0.024, 0.03), (1.0165, 0.026, 0.03), (0.9665, 0.026, 0.028), (0.868, 0.017, 0.021)],
    # Arm loops from shoulder to wrist: (height, half width, half depth).
    "skin_arm": [(1.219, 0.034, 0.05), (1.1815, 0.033, 0.045), (1.18, 0.026, 0.036), (1.134, 0.027, 0.035),
                 (1.0765, 0.025, 0.03), (1.0465, 0.024, 0.03), (1.0165, 0.026, 0.03), (0.9665, 0.026, 0.028),
                 (0.868, 0.017, 0.021)],
    # Leg loops from upper thigh to ankle: (height, half width, front, back).
    "skin_leg": [(0.681, 0.089, 0.074, 0.079), (0.582, 0.076, 0.064, 0.072), (0.484, 0.057, 0.038, 0.057),
                 (0.412, 0.046, 0.038, 0.06), (0.34, 0.053, 0.032, 0.072), (0.264, 0.044, 0.02, 0.057),
                 (0.204, 0.035, 0.016, 0.05), (0.1, 0.033, 0.014, 0.046)],
    "hips": [(0.71, 0.085, 0.06, 0.075), (0.765, 0.17, 0.07, 0.095), (0.841, 0.172, 0.073, 0.112),
             (0.898, 0.148, 0.076, 0.095), (0.966, 0.12, 0.08, 0.055), (1.005, 0.122, 0.085, 0.04),
             (1.055, 0.118, 0.085, 0.04)],
    "torso": [(1.0, 0.1, 0.078, 0.034), (1.057, 0.095, 0.08, 0.033), (1.07, 0.095, 0.08, 0.034),
              (1.072, 0.105, 0.09, 0.044), (1.108, 0.104, 0.09, 0.045), (1.152, 0.112, 0.122, 0.05),
              (1.19, 0.118, 0.105, 0.052), (1.235, 0.124, 0.082, 0.056), (1.321, 0.128, 0.055, 0.06),
              (1.36, 0.075, 0.05, 0.05)],
    "upper_arm": [(1.06, 0.033, 0.036, 0.036, 0.0, 0.0, 0.0), (1.12, 0.036, 0.038, 0.038, 0.0, 0.0, 0.0),
                  (1.2, 0.04, 0.042, 0.042, 0.0, 0.0, 0.0), (1.215, 0.058, 0.06, 0.06, 0.0, 0.003, 0.0),
                  (1.27, 0.062, 0.066, 0.064, 0.0, 0.005, 0.0), (1.32, 0.06, 0.066, 0.064, 0.0, 0.0, 0.25),
                  (1.36, 0.03, 0.04, 0.04, 0.0, -0.02, 0.5)],
    "forearm": [(0.85, 0.024, 0.028, 0.028, 0.0, 0.0, 0.0), (0.92, 0.028, 0.032, 0.032, 0.0, 0.0, 0.0),
                (1.0, 0.034, 0.038, 0.037, 0.0, 0.0, 0.0), (1.07, 0.035, 0.038, 0.037, 0.0, 0.0, 0.0),
                (1.1, 0.03, 0.034, 0.034, 0.0, 0.0, 0.0)],
    # Loose through the hip and thigh, then tapering in to a slim knee.
    "thigh": [(0.44, 0.05, 0.034, 0.055), (0.484, 0.057, 0.038, 0.057), (0.582, 0.076, 0.064, 0.072),
              (0.681, 0.089, 0.074, 0.079), (0.765, 0.094, 0.075, 0.083), (0.85, 0.075, 0.06, 0.065)],
    # Slim below the knee: a slight calf curve down to a narrow ankle.
    "shin": [(0.1, 0.033, 0.014, 0.046), (0.204, 0.035, 0.016, 0.05), (0.264, 0.044, 0.02, 0.057),
             (0.34, 0.053, 0.032, 0.072), (0.412, 0.046, 0.038, 0.06), (0.46, 0.05, 0.038, 0.058),
             (0.51, 0.05, 0.036, 0.056)],
    "neck": [(1.335, 0.06, 0.042, 0.05, -0.002, 0.008), (1.37, 0.04, 0.034, 0.04, -0.004, 0.004),
             (1.395, 0.033, 0.03, 0.034, -0.006, 0.0), (1.45, 0.03, 0.03, 0.034, -0.006, 0.0)],
    "chin_z": 1.4, "head_scale": (0.86, 0.9, 1.0), "jaw": 1.0, "ears": True, "head_grid": True,
    "hat_z": 1.545,
    "head_rings": HEAD_CUTE, "hair_outlines": HAIR_UPDO,
    "bob": True, "strands": [],
}


def ring(z, w, f, b, cy=0.0, cx=0.0, n=8):
    """A faceted cross-section. Point 0 is on +X and the points run towards the front (+Y)."""
    points = []
    for i in range(n):
        angle = 2 * math.pi * i / n
        c, s = math.cos(angle), math.sin(angle)
        points.append((cx + w * math.copysign(abs(c) ** 0.8, c),
                       cy + (f if s >= 0 else b) * math.copysign(abs(s) ** 0.8, s),
                       z))
    return points


# Shoe cross-sections from heel to toe, at a foot_scale of 1.
# Sole: (y, half width, height of the underside, raised under the arch).
SHOE_SOLE = [(-0.088, 0.042, 0.0), (-0.07, 0.058, 0.0), (-0.02, 0.056, 0.0), (0.015, 0.05, 0.012), (0.06, 0.05, 0.012),
             (0.09, 0.06, 0.0), (0.15, 0.06, 0.0), (0.185, 0.05, 0.0), (0.2, 0.034, 0.0)]
# Upper: (y, half width, height of the top).
SHOE_UPPER = [(-0.082, 0.042, 0.085), (-0.062, 0.053, 0.12), (-0.018, 0.05, 0.135), (0.03, 0.05, 0.125),
              (0.08, 0.056, 0.08), (0.13, 0.058, 0.058), (0.175, 0.048, 0.045), (0.192, 0.032, 0.035)]
SOLE_TOP = 0.026
TOE_OUT = 0.12


def sole_ring(y, w, lift, cx, scale):
    y, w, lift, top = y * scale, w * scale, lift * scale, SOLE_TOP * scale
    mid = lift + (top - lift) * 0.6
    return [(cx - w * 0.92, y, lift), (cx + w * 0.92, y, lift), (cx + w, y, mid),
            (cx + w * 0.98, y, top), (cx - w * 0.98, y, top), (cx - w, y, mid)]


def upper_ring(y, w, top, cx, scale):
    """A shoe section with a slight ridge along the top of the foot."""
    y, w, top, base = y * scale, w * scale, top * scale, (SOLE_TOP - 0.002) * scale
    mid = base + (top - base) * 0.5
    return [(cx - w, y, base), (cx + w, y, base), (cx + w * 1.05, y, mid), (cx + w * 0.75, y, top),
            (cx, y, top + 0.008 * scale), (cx - w * 0.75, y, top), (cx - w * 1.05, y, mid)]


# ---------------------------------------------------------------- her other shoes
#
# Each style is its own mesh, "<Body>_Shoes<mesh>", which the game shows instead of her own shoes. Nothing is under
# a shoe, so a heel is built downwards: the ankle stays where it is, the foot pitches forwards and down from just in
# front of it, and the toes and the heel's tip reach `heel` below her own shoes' floor. The game lifts her by as much
# (it keeps the lowest point of what she has on on the floor), so heels make her taller and never sink.
#
#   heel      how far the heel's tip, and the toes, reach below her own shoes (metres)
#   platform  how much of that is a thick sole under the toes rather than the foot tipping down
#   kind      the heel's shape, from HEEL_SHAPES, or "wedge" to fill in under the arch
#   toe       round, almond, pointed or square
#   cut       "low" shows the top and upper sides of her foot from the ankle to `vamp` (in her skin, or her stockings
#             where they reach the ankle); "closed" covers it
#   straps    across the instep, at these places along the foot; `ankle` round the ankle; `tstrap` from the instep
#             strap up to the ankle strap
#   shaft     a boot's height: the leg covered from inside the shoe up to here (world height); `laces` up its front
SHOE_STYLES = [
    {"mesh": "Barefoot", "bare": True},
    {"mesh": "Ballet", "toe": "round", "cut": "low", "vamp": 0.08},
    {"mesh": "Loafer", "heel": 0.02, "kind": "block", "toe": "square", "straps": [0.07]},
    {"mesh": "Kitten", "heel": 0.035, "kind": "kitten", "toe": "pointed", "cut": "low", "vamp": 0.08},
    {"mesh": "Pump", "heel": 0.07, "kind": "taper", "toe": "almond", "cut": "low", "vamp": 0.08},
    {"mesh": "Stiletto", "heel": 0.095, "kind": "stiletto", "toe": "pointed", "cut": "low", "vamp": 0.08},
    {"mesh": "Block", "heel": 0.06, "kind": "block", "toe": "round", "cut": "low", "vamp": 0.08},
    {"mesh": "Cone", "heel": 0.075, "kind": "cone", "toe": "almond", "cut": "low", "vamp": 0.08},
    {"mesh": "Spool", "heel": 0.065, "kind": "spool", "toe": "round", "cut": "low", "vamp": 0.08},
    {"mesh": "Wedge", "heel": 0.07, "kind": "wedge", "toe": "round", "cut": "low", "vamp": 0.08},
    {"mesh": "Platform", "heel": 0.12, "platform": 0.035, "kind": "chunky", "toe": "round", "cut": "low", "vamp": 0.08},
    {"mesh": "Maryjane", "heel": 0.05, "kind": "block", "toe": "round", "cut": "low", "vamp": 0.08, "straps": [0.02]},
    {"mesh": "Doublestrap", "heel": 0.08, "kind": "stiletto", "toe": "almond", "cut": "low", "vamp": 0.08,
     "straps": [0.0, 0.05]},
    {"mesh": "Anklestrap", "heel": 0.09, "kind": "stiletto", "toe": "pointed", "cut": "low", "vamp": 0.08, "ankle": True},
    {"mesh": "Tstrap", "heel": 0.065, "kind": "taper", "toe": "round", "cut": "low", "vamp": 0.08, "ankle": True,
     "tstrap": True},
    {"mesh": "Bootie", "heel": 0.05, "kind": "chunky", "toe": "round", "shaft": 0.2},
    {"mesh": "Laceup", "heel": 0.085, "kind": "stiletto", "toe": "pointed", "shaft": 0.24, "laces": True},
    {"mesh": "Riding", "heel": 0.025, "kind": "block", "toe": "round", "shaft": 0.42},
    {"mesh": "Kneeboot", "heel": 0.08, "kind": "taper", "toe": "almond", "shaft": 0.42},
    {"mesh": "Thighboot", "heel": 0.09, "kind": "stiletto", "toe": "pointed", "shaft": 0.64},
]
# The foot tips down between these places along it (as SHOE_SOLE's y): flat behind, all the way down in front.
BALL_FROM, BALL_TO = -0.01, 0.115
# Where a low cut starts showing her foot, just in front of the ankle.
OPEN_FROM = -0.02
# Heel shapes as cross-sections from the top (0) to the tip (1): (share of the way down, centre along the foot as
# SHOE_SOLE's y, half width, half depth). Widths are in metres at a foot_scale of 1.
HEEL_SHAPES = {
    "taper": [(0, -0.062, 0.026, 0.024), (1, -0.07, 0.01, 0.01)],
    "stiletto": [(0, -0.06, 0.024, 0.026), (0.35, -0.068, 0.012, 0.012), (1, -0.072, 0.0055, 0.0055)],
    "kitten": [(0, -0.058, 0.022, 0.024), (0.6, -0.058, 0.01, 0.01), (1, -0.052, 0.008, 0.008)],
    "block": [(0, -0.058, 0.03, 0.028), (1, -0.06, 0.027, 0.025)],
    "chunky": [(0, -0.055, 0.036, 0.034), (1, -0.058, 0.032, 0.03)],
    "cone": [(0, -0.058, 0.03, 0.03), (1, -0.064, 0.007, 0.007)],
    "spool": [(0, -0.058, 0.028, 0.028), (0.25, -0.059, 0.016, 0.016), (0.5, -0.06, 0.011, 0.011),
              (0.75, -0.061, 0.015, 0.015), (1, -0.062, 0.024, 0.024)],
}
# Her bare foot, heel to toe, as SHOE_UPPER: (y, half width, height of the top). Its ankle rises up inside the leg,
# so the leg's open end is never seen; the sole is flat on her own shoes' floor, so she isn't lifted.
FOOT = [(-0.085, 0.026, 0.05), (-0.07, 0.036, 0.1), (-0.05, 0.044, 0.15), (-0.02, 0.045, 0.16), (0.01, 0.045, 0.15),
        (0.04, 0.044, 0.1), (0.08, 0.046, 0.065), (0.12, 0.048, 0.042), (0.155, 0.046, 0.032), (0.18, 0.038, 0.026),
        (0.198, 0.022, 0.018)]
STRAP_WIDTH = 0.007  # half the width of a strap along the foot
ANKLE_STRAP = (0.124, 0.138)  # bottom and top of the ankle strap
BOOT_GROW = 0.011  # how far a boot's shaft stands off the leg, clear of her legwear


def shoe_tables(toe):
    """(sole, upper) cross-sections for a toe shape: SHOE_SOLE and SHOE_UPPER with their toe ends changed."""
    sole, upper = list(SHOE_SOLE[:-2]), list(SHOE_UPPER[:-2])
    if toe == "pointed":
        return (sole + [(0.175, 0.045, 0.0), (0.205, 0.026, 0.0), (0.232, 0.008, 0.0)],
                upper + [(0.17, 0.044, 0.046), (0.2, 0.024, 0.032), (0.226, 0.006, 0.022)])
    if toe == "almond":
        return (sole + [(0.18, 0.048, 0.0), (0.212, 0.022, 0.0)],
                upper + [(0.175, 0.045, 0.045), (0.206, 0.02, 0.03)])
    if toe == "square":
        return (sole + [(0.185, 0.054, 0.0), (0.2, 0.05, 0.0)],
                upper + [(0.178, 0.052, 0.045), (0.194, 0.048, 0.038)])
    return list(SHOE_SOLE), list(SHOE_UPPER)


def table_at(table, y):
    """A cross-section table's (width, height) at y, in between its rows."""
    if y <= table[0][0]:
        return table[0][1:]
    for (y0, *a), (y1, *b) in zip(table, table[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            return tuple(p + (q - p) * t for p, q in zip(a, b))
    return table[-1][1:]


def grown(points, cx, by):
    """A ring's points pushed out from its middle (at x = cx) by `by`, in its own plane."""
    cz = sum(p[2] for p in points) / len(points)
    out = []
    for x, y, z in points:
        dx, dz = x - cx, z - cz
        length = math.hypot(dx, dz) or 1.0
        out.append((x + dx / length * by, y, z + dz / length * by))
    return out


def shin_at(spec, z):
    """(half width, front, back) of the shin at height z, from the spec's shin loops."""
    rows = spec["shin"]
    if z <= rows[0][0]:
        return rows[0][1:]
    for (z0, *a), (z1, *b) in zip(rows, rows[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0)
            return tuple(p + (q - p) * t for p, q in zip(a, b))
    return rows[-1][1:]


def build_shoe_style(part, style, leg_x, sx, scale, m, spec):
    """One shoe of a style, on the leg at leg_x, in the same place and space as her own shoe."""
    if style.get("bare"):
        # All in the instep's material, so the game shows it in her skin, or in her stockings where they reach.
        rings = []
        for y, w, top in FOOT:
            cx, ys, ws, top = leg_x + sx * y * TOE_OUT, y * scale, w * scale, top * scale
            mid = top * 0.45
            rings.append([(cx - ws * 0.9, ys, 0.0), (cx + ws * 0.9, ys, 0.0), (cx + ws, ys, mid), (cx + ws * 0.7, ys, top),
                          (cx, ys, top + 0.004), (cx - ws * 0.7, ys, top), (cx - ws, ys, mid)])
        part.loft(rings, m["instep"])
        return
    sole_rows, upper_rows = shoe_tables(style.get("toe", "round"))
    heel = style.get("heel", 0.0)
    platform = style.get("platform", 0.0)
    tip_down = heel - platform

    def tipped(y):
        """How far along the foot's tip down this place is, from 0 behind the ball to 1 in front of it."""
        t = min(1.0, max(0.0, (y - BALL_FROM) / (BALL_TO - BALL_FROM)))
        return t * t * (3 - 2 * t) if heel > 0 else 0.0

    drop = lambda y: tip_down * tipped(y)
    centre = lambda y: leg_x + sx * y * TOE_OUT
    lower = lambda points, by: [(x, y, z - by) for x, y, z in points]
    leather, sole, instep = m["leather"], m["sole_dark"], m["instep"]

    # The sole, tipping down with the foot, and thickening into the platform under the toes.
    rings = []
    for y, w, lift in sole_rows:
        t = tipped(y)
        top = SOLE_TOP * scale - drop(y)
        bottom = lift * scale * (1 - t) - drop(y) - platform * t
        mid = bottom + (top - bottom) * 0.6
        cx, ys, ws = centre(y), y * scale, w * scale
        rings.append([(cx - ws * 0.92, ys, bottom), (cx + ws * 0.92, ys, bottom), (cx + ws, ys, mid),
                      (cx + ws * 0.98, ys, top), (cx - ws * 0.98, ys, top), (cx - ws, ys, mid)])
    part.loft(rings, sole)

    # The upper. A low cut shows her foot over the top and the upper sides, between the ankle and the vamp.
    rings = [lower(upper_ring(y, w, top, centre(y), scale), drop(y)) for y, w, top in upper_rows]
    low, vamp = style.get("cut") == "low", style.get("vamp", 0.08)

    def upper_mat(j, i):
        y0, y1 = upper_rows[j][0], upper_rows[j + 1][0]
        if low and y0 >= OPEN_FROM and y1 <= vamp + 1e-6 and i in (2, 3, 4, 5):
            return instep
        return leather

    part.loft(rings, upper_mat)

    # The heel, from inside the sole down to the floor.
    kind = style.get("kind")
    if kind == "wedge":
        rings = []
        for y in (-0.084, -0.06, -0.02, 0.02, 0.06, 0.09, 0.105):
            w = table_at(sole_rows, y)[0] * scale * 0.94
            cx, ys, top = centre(y), y * scale, 0.004 - drop(y)
            rings.append([(cx - w, ys, -heel), (cx + w, ys, -heel), (cx + w, ys, top), (cx - w, ys, top)])
        part.loft(rings, sole)
    elif kind and heel > 0:
        top = 0.006
        part.loft([ring(top - share * (heel + top), hx * scale, hy * scale, hy * scale, y * scale, centre(y))
                   for share, y, hx, hy in HEEL_SHAPES[kind]], sole)

    # Straps over the instep, round the ankle, and one joining them.
    for y in style.get("straps", []):
        straps = []
        for along in (y - STRAP_WIDTH, y + STRAP_WIDTH):
            w, top = table_at(upper_rows, along)
            points = lower(upper_ring(along, w, top, centre(along), scale), drop(along))
            straps.append(grown(points, centre(along), 0.003))
        part.loft(straps, leather)
    if style.get("ankle"):
        part.loft([ring(z, *(a + 0.007 for a in shin_at(spec, z)), cx=leg_x) for z in ANKLE_STRAP], leather)
    if style.get("tstrap"):
        start = style["straps"][0] if style.get("straps") else 0.03
        path = []
        for y in (0.07, 0.05, start + 0.005):
            w, top = table_at(upper_rows, y)
            path.append((centre(y), y * scale, (top + 0.008 + 0.004) * scale - drop(y)))
        front = shin_at(spec, ANKLE_STRAP[1])[1] + 0.008
        path.append((leg_x, front, ANKLE_STRAP[1]))
        part.loft([[(x - 0.005, y, z - 0.002), (x + 0.005, y, z - 0.002), (x + 0.005, y, z + 0.002),
                    (x - 0.005, y, z + 0.002)] for x, y, z in path], leather)


def boot_shaft(extra, spec, style, m):
    """A boot's shaft round each leg, from inside the shoe up to its top, bending at the knee with the skin, and
    crossed laces up its front for a laced style. Added to `extra`, a Skin, in world space."""
    top = style["shaft"]
    leather, laces = m["leather"], m["sole_dark"]
    rows = [z for z in (0.07, 0.1, 0.15, 0.204, 0.264, 0.34, 0.412, 0.45, 0.484, 0.52, 0.582) if z < top - 0.02]
    heights = rows + [top]
    for side, sx in (("L", -1), ("R", 1)):
        weights = lambda co, side=side: leg_weights(spec, co[2], side)
        # Tucked into the shoe at the bottom, standing off the leg above it, flaring a touch at the top.
        grow = lambda z: (0.005 if z < 0.09 else BOOT_GROW) + (0.003 if z >= top else 0.0)
        outside = [leg_ring(spec, z, grow(z), sx) for z in heights]
        inside = [leg_ring(spec, z, grow(z) - 0.004, sx) for z in reversed(heights)]
        add_band(extra, f"shaft{side}", outside + inside, weights, leather)
        if not style.get("laces"):
            continue
        z = 0.12
        k = 0
        while z + 0.024 < top - 0.012:
            ring_points = leg_ring(spec, z + 0.012, BOOT_GROW, sx)
            front = max(p[1] for p in ring_points) + 0.0015
            fronts = sorted(ring_points, key=lambda p: -p[1])[:2]
            x = (fronts[0][0] + fronts[1][0]) / 2
            for d in (-1, 1):
                corners = [(x - 0.011 * d, front, z), (x - 0.011 * d, front, z + 0.004),
                           (x + 0.011 * d, front, z + 0.024), (x + 0.011 * d, front, z + 0.02)]
                add_slab(extra, f"lace{side}{k}_{d}", corners, (0.0, 0.003, 0.0), weights, laces)
            z += 0.024
            k += 1


class Facet(Part):
    """A body part with its origin on a joint, drawn with hard-edged triangles."""

    def __init__(self, coll, name, pivot):
        super().__init__(coll, name)
        self.pivot = pivot
        self.keep_quads = False

    def loft(self, rings, mats):
        """Bands between rings, capped at both ends. `mats` is one material, one per band, or a function of
        (band, side) giving each face its own."""
        bands = len(rings) - 1
        if callable(mats):
            face_slot = lambda j, i: self._slot(mats(j, i))
            caps = (self._slot(mats(0, 0)), self._slot(mats(bands - 1, 0)))
        else:
            slots = [self._slot(mat) for mat in (mats if isinstance(mats, list) else [mats] * bands)]
            face_slot = lambda j, i: slots[j]
            caps = (slots[0], slots[-1])
        px, py, pz = self.pivot
        loops = [[self.bm.verts.new((x - px, y - py, z - pz)) for x, y, z in r] for r in rings]
        for j in range(bands):
            low, high = loops[j], loops[j + 1]
            for i in range(len(low)):
                k = (i + 1) % len(low)
                self.bm.faces.new((low[i], low[k], high[k], high[i])).material_index = face_slot(j, i)
        self.bm.faces.new(loops[0]).material_index = caps[0]
        self.bm.faces.new(loops[-1]).material_index = caps[1]
        return self

    def solid(self, points, faces, mat):
        """A small closed shape from explicit corners, for details such as the nose and ears."""
        mats = mat if isinstance(mat, list) else [mat] * len(faces)
        px, py, pz = self.pivot
        verts = [self.bm.verts.new((x - px, y - py, z - pz)) for x, y, z in points]
        for face, face_mat in zip(faces, mats):
            self.bm.faces.new([verts[i] for i in face]).material_index = self._slot(face_mat)
        return self

    def finish(self, parent, parent_pivot, tile=2.0):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        if not self.keep_quads:
            bmesh.ops.triangulate(self.bm, faces=self.bm.faces, quad_method="SHORT_EDGE", ngon_method="BEAUTY")
        for face in self.bm.faces:
            face.normal_update()
            nx, ny, nz = (abs(a) for a in face.normal)
            for loop in face.loops:
                x, y, z = loop.vert.co
                u, v = (x, y) if nz >= nx and nz >= ny else (y, z) if nx >= ny else (x, z)
                loop[self.uv].uv = (u * tile, v * tile)
        return self.done(tuple(a - b for a, b in zip(self.pivot, parent_pivot)), parent=parent)


def add_strand(part, points, mat):
    """A thin tapered piece following (x, y, z, half thickness) points: hair, cords, chains."""
    part.loft([ring(z, w, w, w, y, x, n=4) for x, y, z, w in points], mat)


def add_stripes(part, stack, cx, sx, mat, spacing, half_width, curve):
    """Two thin track-pants stripes down the outer side of a leg. Curve follows the ring's facet."""
    def on_side(r, offset):
        y = (r[2] - r[3]) / 2 + offset
        return y, r[1] * (1 - curve * abs(y) / (r[2] if y > 0 else r[3])) + 0.006

    for offset in (-spacing, spacing):
        part.loft([ring(r[0], 0.002, half_width, half_width, on_side(r, offset)[0],
                        cx + sx * on_side(r, offset)[1], n=4) for r in stack], mat)


def arm_rings(stack, cx, sx, n, y_at=lambda z: 0.0):
    """Arm cross-sections, shifted away from the body and sloped to run into the shoulder."""
    rings = []
    for z, w, f, b, cy, out, slope in stack:
        centre = cx + sx * out
        rings.append([(x, y, pz - slope * sx * (x - centre)) for x, y, pz in ring(z, w, f, b, cy + y_at(z), centre, n)])
    return rings


def add_hand(part, cx, wrist_z, sx, scale, skin, y0=0.0):
    """A broad back of the hand, two-joint fingers and a thumb. The palm faces the body."""
    def section(depth, w, f, b, n=8, cy=0.0, out=0.0):
        return ring(wrist_z - depth * scale, w * scale, f * scale, b * scale,
                    y0 + cy * scale, cx + sx * out * scale, n)

    part.loft([section(-0.015, 0.028, 0.034, 0.034), section(0.03, 0.036, 0.058, 0.054),
               section(0.09, 0.036, 0.066, 0.062), section(0.118, 0.024, 0.06, 0.056)], skin)
    for y, first, second in ((-0.045, 0.04, 0.042), (-0.016, 0.052, 0.054), (0.013, 0.056, 0.058), (0.042, 0.048, 0.05)):
        part.loft([section(0.105, 0.0125, 0.0145, 0.0145, 6, y, 0.0),
                   section(0.105 + first, 0.0105, 0.012, 0.012, 6, y * 1.08, -0.01),
                   section(0.105 + first + second, 0.0075, 0.0085, 0.0085, 6, y * 1.14, -0.034)], skin)
    part.loft([section(0.015, 0.015, 0.02, 0.02, 6, 0.046, -0.006),
               section(0.075, 0.0125, 0.015, 0.015, 6, 0.09, -0.02),
               section(0.122, 0.0085, 0.01, 0.01, 6, 0.104, -0.034)], skin)


# The face and skull as drawn in the head reference. Face columns run from the centre out to the temple.
# Each row: depth of the face at the centre, then (x, height above the chin) for each face column.
HEAD_FACE_COLUMNS = ("C", "A", "B", "D", "E")
HEAD_FACE_ROWS = [
    (0.0, [(0.0, 0.0), (0.0085, 0.0), (0.0249, 0.0086), (0.0412, 0.0196), (0.0569, 0.0293)]),  # chin and jaw
    # Between the jaw and the brow only the edge of the face is a grid point; FACE_POINTS holds the rest.
    (0.0, [None, None, None, None, (0.0619, 0.0397)]),
    (0.0, [None, None, None, None, (0.0683, 0.055)]),
    (0.0, [None, None, None, None, (0.0747, 0.0733)]),
    (0.0, [None, None, None, None, (0.0803, 0.0917)]),
    (0.0, [None, None, None, None, (0.0818, 0.1008)]),
    (0.0, [(0.0, 0.1051), (0.0292, 0.1051), (0.0462, 0.1021), (0.0647, 0.0978), (0.0825, 0.1161)]),  # brow
    (0.082, [(0.0, 0.1528), (0.0299, 0.1528), (0.0483, 0.1442), (0.0675, 0.1363), (0.0747, 0.157)]),  # forehead
    (0.05, [(0.0, 0.1835), (0.03, 0.183), (0.05, 0.179), (0.057, 0.175), (0.062, 0.172)]),        # upper forehead
    (0.012, [(0.0, 0.195), (0.018, 0.1945), (0.03, 0.192), (0.036, 0.189), (0.04, 0.187)]),       # crown
]
# The same rows carried around the back: height, the x of three columns, and how far back they reach.
HEAD_BACK_ROWS = [(0.049, 0.06, 0.056, 0.036, 0.7), (0.058, 0.068, 0.066, 0.044, 0.85), (0.07, 0.075, 0.074, 0.052, 0.95),
                  (0.09, 0.081, 0.079, 0.058, 1.0), (0.105, 0.0825, 0.08, 0.06, 1.0), (0.122, 0.082, 0.079, 0.058, 0.98),
                  (0.14, 0.0785, 0.075, 0.055, 0.93), (0.165, 0.066, 0.063, 0.046, 0.78), (0.18, 0.052, 0.048, 0.034, 0.62),
                  (0.19, 0.034, 0.03, 0.018, 0.25)]
HEAD_BACK_DEPTHS = (0.0, -0.045, -0.075)
HEAD_BACK_CENTRE = -0.098
# How far forward the jaw, the brow and the edge of the face sit, so the face turns away towards the ears.
HEAD_EDGE_DEPTH = {("C", 0): 0.081, ("A", 0): 0.081, ("B", 0): 0.065, ("D", 0): 0.046, ("E", 0): 0.02, ("E", 1): 0.02,
                   ("E", 2): 0.025, ("E", 3): 0.03, ("E", 4): 0.035, ("E", 5): 0.04, ("C", 6): 0.098, ("A", 6): 0.084,
                   ("B", 6): 0.0751, ("D", 6): 0.0653, ("E", 6): 0.03,
                   # The forehead panel ends at a corner, behind which the skull turns away to the side.
                   ("A", 7): 0.075, ("B", 7): 0.064, ("D", 7): 0.052, ("E", 7): 0.021,
                   ("C", 8): 0.05, ("A", 8): 0.048, ("B", 8): 0.042, ("D", 8): 0.034, ("E", 8): 0.018,
                   ("C", 9): 0.012, ("A", 9): 0.011, ("B", 9): 0.009, ("D", 9): 0.007, ("E", 9): 0.004}
# The face follows the head-planes reference. Points are given in the reference's pixels, measured sideways
# from the centre line and up from the chin, and these convert them to head units.
FACE_TRACE_X, FACE_TRACE_UP = 0.000711, 0.000611
FACE_TRACED_ROWS = 6
# One half of the face: name -> (pixels sideways, pixels up, how far forward).
FACE_POINTS = {
    "j0": (0, 10, 0.085), "j1": (13, 10, 0.084), "j2": (38, 28, 0.0764), "j3": (60, 50, 0.0713), "j4": (78, 75, 0.0704),
    "j5": (90, 100, 0.065), "mu": (0, 28, 0.0854), "ub": (20, 28, 0.085),
    "lb0": (0, 36, 0.0924), "lb1": (11, 37, 0.089), "ll0": (0, 43, 0.0854), "l1": (12, 43, 0.085), "lc": (24, 43, 0.083),
    # The mouth line is level, so the game can open her mouth below it (face.ts). The lower lip has its own points
    # along it, a hair below the upper lip's, so the lips can part.
    "ll0d": (0, 42.85, 0.0854), "l1d": (12, 42.85, 0.085),
    # Inside her mouth, a pocket behind the lips: its roof, its back down her throat, and its floor.
    "r0": (0, 46, 0.074), "r1": (11, 46, 0.075), "k0": (0, 40, 0.066), "k1": (10, 40, 0.068),
    "f0": (0, 37, 0.074), "f1": (11, 37.5, 0.075),
    "lt0": (0, 48, 0.0955), "lt1": (10, 51, 0.092),
    "nb0": (0, 64, 0.096), "nb1": (10, 65, 0.092), "nb2": (11, 80, 0.093), "tip": (0, 84, 0.11), "t2": (0, 98, 0.102), "t3": (9, 96, 0.094),
    "s1": (9, 120, 0.092), "br1": (0, 120, 0.092), "s2": (14, 145, 0.093), "br2": (0, 145, 0.095), "s3": (26, 160, 0.09),
    "gl": (0, 160, 0.098), "ein": (18, 132, 0.0914), "un1": (27, 113, 0.0877), "sd": (94, 113, 0.063),
}
# Each plane of the face and its tone. A pair of tones gives the two sides different light.
# Capital names are grid points: column, then row.
FACE_PLANES = [
    (("C0", "A0", "j1", "j0"), "face_mid"), (("A0", "B0", "j2", "j1"), "face_mid"), (("B0", "D0", "j3", "j2"), "face_mid"),
    (("D0", "E0", "j4", "j3"), "face_mid"), (("E0", "E1", "j5", "j4"), "face_mid"), (("E1", "E2", "sd", "j5"), "face_mid"),
    (("E2", "E3", "sd"), "face_mid"), (("E3", "E4", "D6", "sd"), "face_mid"), (("E4", "E5", "E6", "D6"), "face_mid"),
    (("j0", "j1", "ub", "mu"), "face_skin"), (("j1", "j2", "ub"), "face_skin"), (("mu", "ub", "lb1", "lb0"), "face_skin"),
    (("lb0", "lb1", "l1d", "ll0d"), "lip_lit"), (("lb1", "lc", "l1d"), "lip"), (("ll0", "l1", "lt1", "lt0"), "lip"), (("l1", "lc", "lt1"), "lip"),
    (("lt0", "lt1", "nb1", "nb0"), "face_skin"), (("lt1", "lc", "nb1"), "face_skin"), (("lc", "j2", "ub", "lb1"), "face_skin"),
    (("un1", "sd", "j5", "j4", "nb2"), "face_blush"), (("nb2", "j4", "j3", "j2", "lc", "nb1"), "face_skin"),
    (("t3", "s1", "un1", "nb2"), "face_skin"), (("s1", "un1", "ein", "s2"), "face_skin"), (("s2", "ein", "A6", "s3"), "face_skin"),
    (("nb0", "nb1", "nb2", "tip"), "face_pink"), (("tip", "nb2", "t3", "t2"), "face_pink"), (("t2", "t3", "s1"), ("face_white", "face_cool")),
    (("t2", "s1", "br1"), ("face_lit", "face_cool")), (("br1", "s1", "s2", "br2"), "face_lit"), (("br2", "s2", "s3", "gl"), "face_lit"),
    (("gl", "s3", "A6", "C6"), "face_lit"),
    # The pocket of her mouth, closed off behind her lips: shut, it doesn't show.
    (("ll0", "r0", "r1", "l1"), "mouth"), (("l1", "r1", "lc"), "mouth"),
    (("r0", "k0", "k1", "r1"), "mouth"), (("r1", "k1", "lc"), "mouth"),
    (("k0", "f0", "f1", "k1"), "mouth"), (("k1", "f1", "lc"), "mouth"),
    (("f0", "ll0d", "l1d", "f1"), "mouth"), (("f1", "l1d", "lc"), "mouth"),
]
# Her teeth and tongue, each a thin slab inside her mouth, out of sight until it opens. Teeth: from the middle out,
# (pixels sideways, how far forward); their top and bottom (pixels up); and how thick. Her upper teeth hang just below
# her mouth line, her lower teeth stand just below it; her tongue lies on the floor of her mouth.
MOUTH_TEETH = [(0, 0.0835), (6, 0.0818), (10, 0.079), (13, 0.0768)]
MOUTH_UPPER_TEETH = (46, 40.5)
MOUTH_LOWER_TEETH = (42.2, 38.5)
MOUTH_TEETH_THICK = 0.0012
# Her tongue, rounded at the tip: rows from its tip back, each its middle (how far forward, pixels up) and its edge
# (pixels sideways, how far forward, pixels up).
MOUTH_TONGUE = [((0.081, 41.7), (5, 0.0798, 41.6)), ((0.0785, 41.5), (8.5, 0.0772, 41.2)),
                ((0.0745, 41.0), (10, 0.074, 40.7)), ((0.069, 40.4), (9.5, 0.069, 40.2))]
MOUTH_TONGUE_THICK = 0.0015
# The lines an expression can draw on her face, each a thin dark slab just in front of it, hidden till the game shows
# it (face.ts): the creases between her brows as she frowns or strains, two at the sides and a third in the middle;
# and the strokes of a deep blush on her cheeks. Each stroke: from and to (x, height above the chin), all in metres.
FACE_CREASE_SIDE = [((0.0042, 0.1015), (0.0062, 0.1095))]
FACE_CREASE_MID = ((0.0, 0.1005), (0.0, 0.1085))
FACE_CREASE_WIDTH = 0.00045
FACE_HATCH = [((0.026 + 0.0045 * i, 0.0565), (0.030 + 0.0045 * i, 0.0635)) for i in range(4)]
FACE_HATCH_WIDTH = 0.00045
# How far the strokes stand in front of her face, and how thick they are.
FACE_LINE_LIFT = 0.0007
FACE_LINE_THICK = 0.0005
# The face just between her brows, and her cheek under the blush, as planes: forward = a + b * x + c * height.
FACE_CREASE_PLANE_POINTS = [(0.0, 0.1051, 0.098), (0.0292, 0.1051, 0.084), (0.0, 0.1528, 0.082)]
FACE_HATCH_PLANE_POINTS = ["un1", "sd", "j5", "j4", "nb2"]
# The socket around the eye, starting from the corner nearest the nose, and the round dot of the eye inside it:
# centre, half width and half height in reference pixels. The dot has two points for each side of the socket.
FACE_EYE_SOCKET = ("ein", "un1", "sd", "D6", "B6", "A6")
FACE_EYE_DOT = (56, 143, 12, 13)
# The plane of the socket: forward = a + b * pixels sideways + c * pixels up.
FACE_EYE_PLANE = (0.09471, -0.000368, 0.00002545)
# The ear: a ring where it meets the skull and the ring of its rim, as (x, y, height above the chin).
FACE_EAR = [[(0.07, 0.0105, 0.0855), (0.07, -0.002, 0.0947), (0.07, -0.0147, 0.0935), (0.07, -0.0266, 0.0764), (0.07, -0.016, 0.058), (0.07, -0.0056, 0.0489)],
            [(0.086, 0.0105, 0.0855), (0.093, -0.002, 0.0947), (0.095, -0.0147, 0.0935), (0.093, -0.0266, 0.0764), (0.088, -0.016, 0.058), (0.082, -0.0056, 0.0489)]]
# The eyebrow from the nose outwards: x, bottom edge, top edge, how far forward.
HEAD_BROW = [(0.0156, 0.1065, 0.1125, 0.092), (0.0398, 0.1095, 0.1149, 0.079), (0.064, 0.1008, 0.1035, 0.067)]
# One half of the bob from the crown to the neck. Each ring runs around the outside from the front
# edge to the centre of the back, then returns along the inside: (x, y, height above the chin).
BOB_RINGS = [
    [(0.0, -0.02, 0.212), (0.03, -0.03, 0.212), (0.02, -0.05, 0.212), (0.0, -0.058, 0.212),
     (0.0, -0.045, 0.212), (0.0, -0.04, 0.212), (0.0, -0.033, 0.212), (0.0, -0.027, 0.212)],
    [(0.065, -0.02, 0.192), (0.08, -0.04, 0.192), (0.06, -0.085, 0.192), (0.0, -0.1, 0.192),
     (0.0, -0.06, 0.165), (0.03, -0.05, 0.165), (0.05, -0.03, 0.165), (0.04, -0.025, 0.165)],
    [(0.103, 0.03, 0.09), (0.12, -0.025, 0.09), (0.088, -0.1, 0.09), (0.0, -0.115, 0.09),
     (0.0, -0.075, 0.09), (0.045, -0.07, 0.09), (0.072, -0.04, 0.09), (0.078, 0.022, 0.09)],
    [(0.1, 0.05, 0.04), (0.13, -0.025, 0.04), (0.095, -0.105, 0.04), (0.0, -0.12, 0.04),
     (0.0, -0.085, 0.04), (0.055, -0.078, 0.04), (0.08, -0.03, 0.04), (0.078, 0.04, 0.04)],
    [(0.082, 0.082, -0.005), (0.118, -0.015, 0.0), (0.085, -0.1, 0.0), (0.0, -0.112, 0.0),
     (0.0, -0.085, 0.0), (0.052, -0.075, 0.0), (0.074, -0.025, 0.0), (0.066, 0.065, -0.002)],
    [(0.064, 0.05, -0.03), (0.09, -0.035, -0.033), (0.066, -0.088, -0.033), (0.0, -0.095, -0.033),
     (0.0, -0.075, -0.033), (0.042, -0.068, -0.033), (0.062, -0.035, -0.033), (0.056, 0.04, -0.03)],
    [(0.058, 0.0, -0.045), (0.072, -0.05, -0.047), (0.052, -0.075, -0.047), (0.0, -0.082, -0.047),
     (0.0, -0.07, -0.047), (0.04, -0.062, -0.047), (0.06, -0.05, -0.047), (0.056, -0.005, -0.045)],
]
# The side-swept fringe, from the parting across to the far temple. Each station: back of the crown,
# the raised ridge, the lower edge on the forehead, and a point inside the skull.
BOB_FRINGE = [
    [(-0.1, -0.055, 0.14), (-0.1, 0.0, 0.115), (-0.095, 0.03, 0.09), (-0.06, 0.0, 0.105)],
    [(-0.098, -0.045, 0.165), (-0.097, 0.05, 0.155), (-0.092, 0.05, 0.118), (-0.06, -0.03, 0.125)],
    [(-0.055, -0.035, 0.195), (-0.066, 0.066, 0.18), (-0.064, 0.085, 0.135), (-0.04, -0.03, 0.145)],
    [(-0.008, -0.035, 0.212), (-0.012, 0.075, 0.185), (-0.012, 0.096, 0.133), (-0.008, -0.03, 0.145)],
    [(0.035, -0.035, 0.21), (0.04, 0.078, 0.185), (0.04, 0.095, 0.122), (0.03, -0.03, 0.135)],
    [(0.078, -0.04, 0.197), (0.09, 0.065, 0.16), (0.088, 0.072, 0.1), (0.06, -0.03, 0.115)],
    [(0.1, -0.045, 0.145), (0.105, 0.035, 0.118), (0.102, 0.04, 0.105), (0.08, 0.01, 0.105)],
    [(0.1, -0.055, 0.118), (0.105, -0.01, 0.112), (0.1, 0.015, 0.1), (0.075, -0.01, 0.1)],
]
HEAD_AROUND = ("C", "A", "B", "D", "E", "H1", "H2", "H3", "P")


# The male head, drawn from his faceted head reference: a long tapering jaw, a wedge of a nose,
# eyes set deep under a heavy brow. Columns run from the centre of the face round to the centre
# of the back; each corner is (x, depth, height above the chin).
MALE_HEAD_AROUND = ("C", "N", "I", "O", "K", "S", "B1", "B2", "P")
MALE_HEAD_ROWS = [
    [(0.0, 0.077, 0.0), (0.017, 0.075, 0.0), (0.032, 0.062, 0.012), (0.048, 0.046, 0.028), (0.063, 0.024, 0.046),
     (0.067, 0.0, 0.058), (0.058, -0.04, 0.06), (0.036, -0.064, 0.058), (0.0, -0.072, 0.056)],      # chin and jaw line
    [(0.0, 0.089, 0.03), (0.016, 0.087, 0.03), (0.027, 0.082, 0.041), (0.053, 0.066, 0.05), (0.069, 0.04, 0.065),
     (0.075, 0.004, 0.082), (0.07, -0.05, 0.084), (0.043, -0.08, 0.082), (0.0, -0.088, 0.08)],      # under the lip, mouth corner
    [(0.0, 0.097, 0.056), (0.021, 0.093, 0.056), (0.04, 0.085, 0.063), (0.06, 0.073, 0.07), (0.075, 0.047, 0.084),
     (0.08, 0.006, 0.106), (0.075, -0.056, 0.108), (0.047, -0.09, 0.106), (0.0, -0.098, 0.104)],    # base of the nose
    [(0.0, 0.124, 0.07), (0.021, 0.101, 0.068), (0.042, 0.089, 0.077), (0.064, 0.077, 0.083), (0.078, 0.051, 0.096),
     (0.081, 0.006, 0.12), (0.077, -0.06, 0.122), (0.049, -0.094, 0.12), (0.0, -0.102, 0.118)],     # tip of the nose
    [(0.0, 0.108, 0.096), (0.012, 0.098, 0.094), (0.037, 0.09, 0.092), (0.066, 0.078, 0.094), (0.079, 0.052, 0.106),
     (0.082, 0.006, 0.136), (0.078, -0.06, 0.138), (0.05, -0.095, 0.136), (0.0, -0.104, 0.134)],    # under the eye
    [(0.0, 0.099, 0.122), (0.014, 0.1, 0.122), (0.036, 0.102, 0.126), (0.066, 0.09, 0.124), (0.08, 0.054, 0.122),
     (0.082, 0.006, 0.152), (0.078, -0.058, 0.154), (0.05, -0.093, 0.152), (0.0, -0.102, 0.15)],    # brow ridge
    [(0.0, 0.098, 0.15), (0.018, 0.098, 0.15), (0.04, 0.095, 0.152), (0.064, 0.082, 0.15), (0.077, 0.052, 0.148),
     (0.08, 0.004, 0.172), (0.075, -0.054, 0.174), (0.048, -0.087, 0.172), (0.0, -0.095, 0.17)],    # forehead
    [(0.0, 0.072, 0.186), (0.02, 0.07, 0.186), (0.04, 0.066, 0.184), (0.057, 0.056, 0.18), (0.068, 0.035, 0.175),
     (0.07, 0.0, 0.196), (0.063, -0.045, 0.196), (0.04, -0.072, 0.196), (0.0, -0.078, 0.194)],      # under the hair
    [(0.0, 0.03, 0.21), (0.018, 0.03, 0.21), (0.032, 0.028, 0.208), (0.04, 0.02, 0.206), (0.045, 0.01, 0.204),
     (0.046, -0.008, 0.21), (0.042, -0.03, 0.21), (0.026, -0.045, 0.21), (0.0, -0.05, 0.21)],       # crown
]
# The eye, from the outside in: inner corner, lower inner, lower outer, outer corner, upper outer, upper inner.
# Narrow and level, with the iris filling the height of the opening.
MALE_EYE_RIM = [(0.021, 0.092, 0.1035), (0.032, 0.086, 0.0975), (0.05, 0.081, 0.0975),
                (0.063, 0.073, 0.1075), (0.05, 0.085, 0.118), (0.032, 0.09, 0.117)]
MALE_EYE_OPENING = [(0.025, 0.087, 0.104), (0.034, 0.082, 0.1005), (0.049, 0.078, 0.1005),
                    (0.059, 0.071, 0.107), (0.049, 0.079, 0.1115), (0.034, 0.084, 0.1105)]
MALE_IRIS = [(0.0335, 0.083, 0.1055), (0.037, 0.0825, 0.1015), (0.0455, 0.081, 0.1015),
             (0.049, 0.08, 0.1055), (0.0455, 0.081, 0.1105), (0.037, 0.0825, 0.1105)]
# The brow from the nose outwards: (x, depth, height of the bottom edge, height of the top edge).
MALE_BROW = [(0.015, 0.106, 0.12, 0.128), (0.042, 0.108, 0.124, 0.135), (0.068, 0.08, 0.121, 0.1235)]
# Lips: top edge, the two sides of the dark mouth line and bottom edge, at the centre and towards the corner.
MALE_LIPS = [("top", [(0.0, 0.047, 0.095), (0.013, 0.047, 0.093)]), ("up", [(0.0, 0.0425, 0.091), (0.014, 0.043, 0.089)]),
             ("low", [(0.0, 0.0405, 0.091), (0.014, 0.041, 0.089)]), ("bottom", [(0.0, 0.036, 0.093), (0.014, 0.037, 0.09)])]
# Painted planes, as in the reference. Keys are (column, row) of the quad's lower inner corner.
MALE_FACE_PAINT = {("C", 2): "skin_deep", ("N", 2): "skin_shade", ("N", 3): "skin_shade", ("C", 3): "skin_lit", ("C", 4): "skin_lit",
                   ("I", 3): "skin_lit", ("C", 0): "skin_lit", ("N", 0): "skin_lit"}
# Quads split along the other diagonal, so that a plane breaks where the reference breaks it.
MALE_FACE_FLIP = {("C", 2), ("I", 1), ("I", 3)}
# The edge of the hair, starting at one sideburn and running across the fringe and round the back.
MALE_HAIR_EDGE = [(0.086, 0.03, 0.118), (0.083, 0.062, 0.152), (0.073, 0.09, 0.134), (0.06, 0.097, 0.163), (0.04, 0.112, 0.141),
                  (0.022, 0.108, 0.17), (-0.006, 0.114, 0.146), (-0.024, 0.106, 0.172), (-0.045, 0.108, 0.152), (-0.06, 0.094, 0.168),
                  (-0.073, 0.09, 0.138), (-0.083, 0.062, 0.156), (-0.086, 0.03, 0.118), (-0.09, -0.012, 0.142), (-0.093, -0.052, 0.118),
                  (-0.072, -0.098, 0.1), (-0.036, -0.118, 0.082), (0.0, -0.122, 0.092), (0.036, -0.118, 0.08), (0.072, -0.098, 0.1),
                  (0.093, -0.052, 0.118), (0.09, -0.012, 0.142)]
# The rings of hair above that edge: height, half width, front, back, how far the strands have swept round.
MALE_HAIR_RINGS = [(0.188, 0.09, 0.092, 0.114, 0.1), (0.222, 0.062, 0.06, 0.078, 0.2)]
MALE_HAIR_RIDGE = 0.006  # strands from each point of the fringe stand proud of those from the gaps between them
MALE_HAIR_TOP = (0.012, -0.018, 0.24)


def angular_head(at, m, skin):
    """The male skull and face as one closed surface, with the eyes, brows and lips set into it."""
    head = HeadMesh(at)
    for row, columns in enumerate(MALE_HEAD_ROWS):
        for key, (x, y, up) in zip(MALE_HEAD_AROUND, columns):
            head.add((key, row), x, y, up)
    for name, eye_ring in (("rim", MALE_EYE_RIM), ("open", MALE_EYE_OPENING), ("iris", MALE_IRIS)):
        for i, (x, y, up) in enumerate(eye_ring):
            head.add((name, i), x, y, up)
    for name, lip_ring in MALE_LIPS:
        for i, (x, up, y) in enumerate(lip_ring):
            head.add((name, i), x, y, up)

    def quad(a, b, c, d, mat, flip=False):
        for tri in ((a, b, d), (b, c, d)) if flip else ((a, b, c), (a, c, d)):
            head.face(tri, mat)

    deep, shade = m["skin_deep"], m["skin_shade"]
    skipped = {("C", 1), ("N", 1), ("N", 4), ("I", 4)}  # the mouth and the eye are filled in below
    for row in range(len(MALE_HEAD_ROWS) - 1):
        for one, two in zip(MALE_HEAD_AROUND, MALE_HEAD_AROUND[1:]):
            if (one, row) not in skipped:
                quad((one, row), (two, row), (two, row + 1), (one, row + 1),
                     m[MALE_FACE_PAINT[(one, row)]] if (one, row) in MALE_FACE_PAINT else skin, (one, row) in MALE_FACE_FLIP)

    # The eye. The top of the socket is the darkest part of the face, under the brow.
    outside = [("N", 5), ("N", 4), ("I", 4), ("O", 4), ("O", 5), ("I", 5)]
    for i in range(6):
        j = (i + 1) % 6
        upper = i in (3, 4, 5)
        quad(outside[i], outside[j], ("rim", j), ("rim", i), deep if upper else shade)
        quad(("rim", i), ("rim", j), ("open", j), ("open", i), m["eye_line"] if upper else skin)
        quad(("open", i), ("open", j), ("iris", j), ("iris", i), m["eye_m"])
    head.face([("iris", i) for i in range(6)], m["iris_m"])

    # The brow, a dark wedge lying on the ridge.
    hair = m["hair_m"]
    for i, (x, y, low, high) in enumerate(MALE_BROW):
        head.add(("brow_lf", i), x, y, low)
        head.add(("brow_hf", i), x, y, high)
        head.add(("brow_lb", i), x, y - 0.016, low)
        head.add(("brow_hb", i), x, y - 0.016, high)
    for i in range(len(MALE_BROW) - 1):
        j = i + 1
        for one, two in (("lf", "hf"), ("hf", "hb"), ("hb", "lb"), ("lb", "lf")):
            head.face(((f"brow_{one}", i), (f"brow_{one}", j), (f"brow_{two}", j), (f"brow_{two}", i)), hair)
    for i in (0, len(MALE_BROW) - 1):
        head.face((("brow_lf", i), ("brow_hf", i), ("brow_hb", i), ("brow_lb", i)), hair)

    # The lips, and the skin around them.
    corner = ("I", 1)
    lip, line = m["lip_m"], m["skin_deep"]
    quad(("top", 0), ("top", 1), ("N", 2), ("C", 2), skin)
    quad(("top", 1), corner, ("I", 2), ("N", 2), skin)
    quad(("up", 0), ("up", 1), ("top", 1), ("top", 0), lip)
    head.face((("up", 1), corner, ("top", 1)), lip)
    quad(("low", 0), ("low", 1), ("up", 1), ("up", 0), line)
    head.face((("low", 1), corner, ("up", 1)), line)
    quad(("bottom", 0), ("bottom", 1), ("low", 1), ("low", 0), lip)
    head.face((("bottom", 1), corner, ("low", 1)), lip)
    quad(("C", 1), ("N", 1), ("bottom", 1), ("bottom", 0), skin)
    head.face((("N", 1), corner, ("bottom", 1)), skin)

    head.cap(0, skin, MALE_HEAD_AROUND)
    head.cap(len(MALE_HEAD_ROWS) - 1, skin, MALE_HEAD_AROUND)
    return head.points, head.faces, head.mats


def angular_hair(at, m):
    """Short, chunky hair swept to one side. Its fringe comes to points, and strands rise from them to the crown."""
    dark, warm = m["hair_m"], m["hair_m_warm"]
    edge = MALE_HAIR_EDGE
    count = len(edge)
    inner = [(x * 0.72, y * 0.72, up + 0.015) for x, y, up in edge]  # buried in the skull: the underside of the hair

    def swept(i, height, width, front, back, sweep):
        angle = math.atan2(edge[i][1], edge[i][0]) + sweep
        c, s = math.cos(angle), math.sin(angle)
        proud = 1 + (MALE_HAIR_RIDGE / width if i % 2 == 0 else -MALE_HAIR_RIDGE / width)
        return (width * proud * math.copysign(abs(c) ** 0.75, c),
                (front if s >= 0 else back) * proud * math.copysign(abs(s) ** 0.75, s),
                height + (MALE_HAIR_RIDGE if i % 2 == 0 else -MALE_HAIR_RIDGE))

    rings = [inner, edge] + [[swept(i, *spec) for i in range(count)] for spec in MALE_HAIR_RINGS]
    points = [p for r in rings for p in r] + [MALE_HAIR_TOP, (0.0, 0.0, 0.13)]
    top, centre = len(points) - 2, len(points) - 1
    faces, mats = [], []

    def add(face):
        # One side of the head catches warm light in the reference and the other stays dark.
        faces.append(face)
        mats.append(warm if sum(points[i][0] for i in face) < 0 else dark)

    for band in range(len(rings) - 1):
        for i in range(count):
            j = (i + 1) % count
            low_i, low_j = band * count + i, band * count + j
            high_i, high_j = (band + 1) * count + i, (band + 1) * count + j
            add((low_i, low_j, high_j))
            add((low_i, high_j, high_i))
    last = (len(rings) - 1) * count
    for i in range(count):
        j = (i + 1) % count
        add((last + i, last + j, top))
        add((j, i, centre))
    return [at(*p) for p in points], faces, mats


def head_face_depth(centre, x):
    return centre * max(0.0, 1 - (x / 0.085) ** 4) ** 0.5


def head_corners():
    """One side of the skull: {(column, row): (x, y, height)}."""
    corners = {}
    for row, (centre, columns) in enumerate(HEAD_FACE_ROWS):
        for key, corner in zip(HEAD_FACE_COLUMNS, columns):
            if corner:
                x, up = corner
                corners[(key, row)] = (x, HEAD_EDGE_DEPTH.get((key, row), head_face_depth(centre, x)), up)
        up, h1, h2, h3, factor = HEAD_BACK_ROWS[row]
        corners[("H1", row)] = (h1, HEAD_BACK_DEPTHS[0] * factor, up)
        corners[("H2", row)] = (h2, HEAD_BACK_DEPTHS[1] * factor, up)
        corners[("H3", row)] = (h3, HEAD_BACK_DEPTHS[2] * factor, up)
        corners[("P", row)] = (0.0, HEAD_BACK_CENTRE * factor, up)
    return corners


class HeadMesh:
    """Corners placed by name and mirrored, shared along the centre line."""

    def __init__(self, at):
        self.at, self.points, self.index, self.faces, self.mats = at, [], {}, [], []

    def add(self, key, x, y, up):
        for sx in ((0,) if x == 0 else (-1, 1)):
            self.index[(key, sx)] = len(self.points)
            self.points.append(self.at(sx * x if sx else 0.0, y, up))

    def find(self, key, sx):
        return self.index[(key, sx)] if (key, sx) in self.index else self.index[(key, 0)]

    def face(self, keys, mat, sides=(-1, 1)):
        for sx in sides:
            self.faces.append([self.find(key, sx) for key in keys])
            self.mats.append(mat)

    def cap(self, row, mat, around=HEAD_AROUND):
        half = [(key, row) for key in around[1:-1]]
        self.faces.append([self.find((around[0], row), 0)] + [self.find(k, 1) for k in half]
                          + [self.find((around[-1], row), 0)] + [self.find(k, -1) for k in reversed(half)])
        self.mats.append(mat)


def head_grid(at, m):
    """The head as one closed surface: the skull in loops, and the face traced plane by plane."""
    head = HeadMesh(at)
    skin = m["face_skin"]
    for key, (x, y, up) in head_corners().items():
        head.add(key, x, y, up)
    for name, (x, up, y) in FACE_POINTS.items():
        head.add(name, x * FACE_TRACE_X, y, up * FACE_TRACE_UP)
    centre_x, centre_up, half_x, half_up = FACE_EYE_DOT
    for i in range(12):
        angle = math.pi + i * math.pi / 6
        x, up = centre_x + half_x * math.cos(angle), centre_up + half_up * math.sin(angle)
        a, b, c = FACE_EYE_PLANE
        head.add(("dot", i), x * FACE_TRACE_X, a + b * x + c * up, up * FACE_TRACE_UP)

    def named(point):
        return (point[0], int(point[1])) if point[0].isupper() else point

    edge = HEAD_AROUND.index("E")
    last = len(HEAD_FACE_ROWS) - 1
    for row in range(last):
        for column, (one, two) in enumerate(zip(HEAD_AROUND, HEAD_AROUND[1:])):
            if row >= FACE_TRACED_ROWS or column >= edge:
                head.face(((one, row), (two, row), (two, row + 1), (one, row + 1)), skin)
    for points, tone in FACE_PLANES:
        keys = [named(point) for point in points]
        if isinstance(tone, str):
            head.face(keys, m[tone])
        else:
            for sx, side_tone in zip((-1, 1), tone):
                head.face(keys, m[side_tone], sides=(sx,))

    # Her teeth, upper and lower, and her tongue: slabs with a front and a back face, closed at the ends.
    for name, (top, bottom), tone in (("ut", MOUTH_UPPER_TEETH, "teeth"), ("lt", MOUTH_LOWER_TEETH, "teeth_low")):
        for c, (x, forward) in enumerate(MOUTH_TEETH):
            for h, up in enumerate((top, bottom)):
                head.add((name, c, h, 0), x * FACE_TRACE_X, forward, up * FACE_TRACE_UP)
                head.add((name, c, h, 1), x * FACE_TRACE_X, forward - MOUTH_TEETH_THICK, up * FACE_TRACE_UP)
        last_column = len(MOUTH_TEETH) - 1
        for c in range(last_column):
            for side in (0, 1):
                head.face(((name, c, 0, side), (name, c + 1, 0, side), (name, c + 1, 1, side), (name, c, 1, side)), m[tone])
            for h in (0, 1):
                head.face(((name, c, h, 0), (name, c + 1, h, 0), (name, c + 1, h, 1), (name, c, h, 1)), m[tone])
        head.face(((name, last_column, 0, 0), (name, last_column, 1, 0), (name, last_column, 1, 1), (name, last_column, 0, 1)), m[tone])
    for i, ((forward, up), (x, edge_forward, edge_up)) in enumerate(MOUTH_TONGUE):
        for layer in (0, 1):
            low = MOUTH_TONGUE_THICK * layer
            head.add(("tongue", i, "mid", layer), 0, forward, up * FACE_TRACE_UP - low)
            head.add(("tongue", i, "edge", layer), x * FACE_TRACE_X, edge_forward, edge_up * FACE_TRACE_UP - low)
    for i in range(len(MOUTH_TONGUE) - 1):
        for layer in (0, 1):
            head.face((("tongue", i, "mid", layer), ("tongue", i, "edge", layer), ("tongue", i + 1, "edge", layer),
                       ("tongue", i + 1, "mid", layer)), m["tongue"])
        head.face((("tongue", i, "edge", 0), ("tongue", i + 1, "edge", 0), ("tongue", i + 1, "edge", 1),
                   ("tongue", i, "edge", 1)), m["tongue"])
    head.face((("tongue", 0, "mid", 0), ("tongue", 0, "mid", 1), ("tongue", 0, "edge", 1), ("tongue", 0, "edge", 0)), m["tongue"])

    # The lines an expression draws on her face: creases between her brows, and a blush's strokes on her cheeks.
    def plane_through(points):
        a = np.array([[1.0, x, up] for x, up, _ in points])
        coef, *_ = np.linalg.lstsq(a, np.array([f for _, _, f in points]), rcond=None)
        return lambda x, up: coef[0] + coef[1] * x + coef[2] * up

    crease_front = plane_through(FACE_CREASE_PLANE_POINTS)
    hatch_front = plane_through([(FACE_POINTS[k][0] * FACE_TRACE_X, FACE_POINTS[k][1] * FACE_TRACE_UP, FACE_POINTS[k][2])
                                 for k in FACE_HATCH_PLANE_POINTS])

    def stroke(name, start, end, half, front, mat, centre=False):
        (x0, u0), (x1, u1) = start, end
        length = math.hypot(x1 - x0, u1 - u0)
        nx, nu = -(u1 - u0) / length * half, (x1 - x0) / length * half
        corners = [(x0 + nx, u0 + nu), (x1 + nx, u1 + nu), (x1 - nx, u1 - nu), (x0 - nx, u0 - nu)]
        if centre:
            # Straddling the middle: its corners either side of it are each other's mirrors.
            corners = [(half, u0), (half, u1)]
        for i, (x, up) in enumerate(corners):
            surface = front(x, up)
            head.add((name, i, 0), x, surface + FACE_LINE_LIFT, up)
            head.add((name, i, 1), x, surface + FACE_LINE_LIFT - FACE_LINE_THICK, up)
        if centre:
            def at(i, layer, side):
                return head.find((name, i, layer), side)
            quads = [[(0, 0, -1), (1, 0, -1), (1, 0, 1), (0, 0, 1)], [(0, 1, 1), (1, 1, 1), (1, 1, -1), (0, 1, -1)],
                     [(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)], [(0, 1, -1), (1, 1, -1), (1, 0, -1), (0, 0, -1)],
                     [(1, 0, -1), (1, 1, -1), (1, 1, 1), (1, 0, 1)], [(0, 0, 1), (0, 1, 1), (0, 1, -1), (0, 0, -1)]]
            for quad in quads:
                head.faces.append([at(i, layer, side) for i, layer, side in quad])
                head.mats.append(mat)
            return
        for layer in (0, 1):
            head.face(((name, 0, layer), (name, 1, layer), (name, 2, layer), (name, 3, layer)), mat)
        for a, b in ((0, 1), (1, 2), (2, 3), (3, 0)):
            head.face(((name, a, 0), (name, b, 0), (name, b, 1), (name, a, 1)), mat)

    for i, (start, end) in enumerate(FACE_CREASE_SIDE):
        stroke(("crease", i), start, end, FACE_CREASE_WIDTH, crease_front, m["crease"])
    stroke("crease_mid", FACE_CREASE_MID[0], FACE_CREASE_MID[1], FACE_CREASE_WIDTH, crease_front, m["crease_mid"], centre=True)
    for i, (start, end) in enumerate(FACE_HATCH):
        stroke(("hatch", i), start, end, FACE_HATCH_WIDTH, hatch_front, m["hatch"])

    for i in range(6):
        j = (i + 1) % 6
        head.face((named(FACE_EYE_SOCKET[i]), named(FACE_EYE_SOCKET[j]), ("dot", 2 * j), ("dot", 2 * i + 1), ("dot", 2 * i)), skin)
    head.face([("dot", i) for i in range(12)], m["soot"])

    head.cap(0, skin)
    head.cap(last, skin)
    return head.points, head.faces, head.mats


def add_bob(at, hair, hair_parts):
    """A side-parted bob. Each half hangs from its own bone so the ends can swing."""
    for sx in (-1, 1):
        hair_parts[sx].loft([[at(sx * x, y, up) for x, y, up in station] for station in BOB_RINGS], hair)
    hair_parts["hair"].loft([[at(x, y, up) for x, y, up in station] for station in BOB_FRINGE], hair)


def add_head(part, spec, m, hair_parts=None):
    """The neck, faceted skull, face details, ears and hair."""
    skin = m[spec.get("skin", "skin")]
    hair = m[spec["hair"]]
    chin = spec["chin_z"]
    kx, ky, kz = spec["head_scale"]

    def at(x, y, up):
        return (x * kx, y * ky, chin + up * kz)

    def outline(up, half):
        return [at(x, y, up) for x, y in half + [(-x, y) for x, y in reversed(half[1:-1])]]

    def neck_ring(z, w, f, b, cy, pit):
        points = ring(z, w, f, b, cy, n=12)
        x, y, pz = points[3]  # the point at the centre of the front
        points[3] = (x, y - pit, pz)
        return points

    def detail_box(x, y, up, width, depth, height, mat, target=None):
        cx, cy, z0 = at(x, y, up)
        (target or part).box(cx - part.pivot[0], cy - part.pivot[1], z0 - part.pivot[2],
                             width * kx, depth * ky, height * kz, mat, fit=True)

    part.loft([neck_ring(*r) for r in spec["neck"]], skin)
    jaw = spec["jaw"]
    if spec.get("angular_head"):
        points, faces, mats = angular_head(at, m, skin)
        part.solid(points, faces, mats)
    elif spec.get("head_grid"):
        points, faces, mats = head_grid(at, m)
        part.solid(points, faces, mats)
    else:
        part.loft([outline(up, [(x * (jaw if i < 2 else 1.0), y) for x, y in half])
                   for i, (up, half) in enumerate(spec.get("head_rings", HEAD_RINGS))], skin)

    nose = [(0, 1, 2), (0, 3, 1), (1, 4, 2), (1, 3, 4), (0, 2, 4), (0, 4, 3)]
    if spec.get("angular_head"):
        pass  # the nose, eyes and mouth are part of the head itself
    elif spec.get("cute_face"):
        for sx in (-1, 1):
            brow =[[at(sx * x, y, top), at(sx * x, y, low), at(sx * x, y - 0.006, low), at(sx * x, y - 0.006, top)]
                    for x, low, top, y in HEAD_BROW]
            part.loft(brow, hair)
    else:
        part.solid([at(0, 0.096, 0.122), at(0, 0.124, 0.072), at(0.021, 0.096, 0.066),
                    at(-0.021, 0.096, 0.066), at(0, 0.093, 0.06)], nose, skin)
        detail_box(0, 0.09, 0.035, 0.05, 0.012, 0.004, m["soot"])
        for sx in (-1, 1):
            detail_box(sx * 0.037, 0.085, 0.098, 0.03, 0.012, 0.014, m["soot"])

    if spec.get("ears", True):
        ear = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (0, 2, 1), (0, 3, 2)]
        for sx in (-1, 1):
            if spec.get("head_grid"):
                part.loft([[at(sx * x, y, up) for x, y, up in rim] for rim in FACE_EAR], skin)
            else:
                part.solid([at(sx * 0.078, -0.002, 0.132), at(sx * 0.106, -0.018, 0.125), at(sx * 0.102, -0.016, 0.09),
                            at(sx * 0.076, -0.006, 0.088), at(sx * 0.08, -0.036, 0.11)], ear, skin)

    scalp = hair_parts["hair"] if hair_parts else part
    bun = hair_parts.get("bun", part) if hair_parts else part
    if spec.get("angular_head"):
        points, faces, mats = angular_hair(at, m)
        scalp.solid(points, faces, mats)
    elif spec.get("bob"):
        add_bob(at, hair, hair_parts)
    else:
        scalp.loft([outline(up, half) for up, half in spec["hair_outlines"]], hair)
    for offset, lump in spec.get("buns", []):
        bun.loft([ring(chin + up * kz, w * kx, f * ky, b * ky, cy * ky, offset * kx) for up, w, f, b, cy in lump], hair)
    if "buns" in spec:
        detail_box(-0.092, -0.1, 0.2, 0.012, 0.05, 0.012, m["pewter"], bun)
    for chain in spec.get("strands", []):
        lock = hair_parts[1 if chain[0][0] > 0 else -1] if hair_parts else part
        add_strand(lock, [(*at(x, y, up), w * kx) for x, y, up, w in chain], hair)


# ---------------------------------------------------------------- hairstyles
# Each character has its usual hair (the bob, the short crop) and a few more styles the game can switch
# to. Every style is its own mesh, named "<Name>_Hair<Style>", so the game shows only the chosen one.
# Shapes are in head units: x to the side, y forwards, height above the chin, before the head's scale.

# The skull under the hair, from the head rows: (height above the chin, half width, front, back).
SKULL = {
    "Female": [(0.04, 0.066, 0.07, 0.07), (0.07, 0.075, 0.08, 0.093), (0.09, 0.081, 0.082, 0.098), (0.122, 0.082, 0.085, 0.096),
               (0.14, 0.0785, 0.084, 0.091), (0.165, 0.066, 0.07, 0.076), (0.18, 0.052, 0.05, 0.061), (0.19, 0.036, 0.03, 0.04),
               (0.2, 0.025, 0.02, 0.025), (0.208, 0.008, 0.006, 0.008)],
    "Male": [(0.06, 0.067, 0.07, 0.072), (0.08, 0.075, 0.085, 0.088), (0.105, 0.08, 0.095, 0.098), (0.135, 0.082, 0.1, 0.104),
             (0.15, 0.082, 0.098, 0.102), (0.172, 0.08, 0.09, 0.095), (0.186, 0.074, 0.072, 0.086), (0.196, 0.07, 0.06, 0.078),
             (0.21, 0.046, 0.03, 0.05), (0.222, 0.032, 0.022, 0.034), (0.23, 0.01, 0.008, 0.01)],
}
CAP_SIDES = 16
# How square each skull is round its corners: 1 is an ellipse; lower is boxier. His angular head has corners
# at the back that an ellipse would cut through.
SKULL_SQUARE = {"Female": 0.9, "Male": 0.72}


def skull_at(skull, up):
    """(half width, front, back) of the skull at a height, held at the ends of the table."""
    if up <= skull[0][0]:
        return skull[0][1:]
    for (u0, *low), (u1, *high) in zip(skull, skull[1:]):
        if up <= u1:
            t = (up - u0) / (u1 - u0)
            return tuple(a + (b - a) * t for a, b in zip(low, high))
    return skull[-1][1:]


def fitted_cap(skull, front, side, back, gap, bands=5, square=1.0, hairline_at=None, edge_gap=None):
    """A shell over the skull from the crown down to the hairline: high on the forehead, low at the nape.

    `hairline_at`, if given, sets the hairline instead of front, side and back: (degrees round from the middle
    of the forehead, height) pairs from 0 (the forehead) to 180 (the nape), the same on both sides. `edge_gap`
    lets the shell close in towards the head at the hairline, so its edge lies on the skin instead of standing
    off it like the brim of a cap."""
    crown = skull[-1][0] + gap

    def hairline(a):
        if hairline_at:
            # Round from the forehead, whichever side of the head.
            theta = math.degrees(math.atan2(abs(math.cos(a)), math.sin(a)))
            for (t0, h0), (t1, h1) in zip(hairline_at, hairline_at[1:]):
                if theta <= t1:
                    return h0 + (h1 - h0) * (theta - t0) / (t1 - t0)
            return hairline_at[-1][1]
        s = math.sin(a)
        forwards, backwards = max(0.0, s) ** 1.5, max(0.0, -s) ** 1.2
        return side + (front - side) * forwards + (back - side) * backwards

    rings = []
    # A small, nearly level ring right at the crown first: the cap's top face spans its first ring, and a ring
    # already sloping down to the nape would cut under the back of the skull.
    for t in [0.06] + [(k / bands) ** 0.85 for k in range(1, bands + 1)]:
        lift = gap if edge_gap is None else gap + (edge_gap - gap) * t ** 2
        ring_points = []
        for i in range(CAP_SIDES):
            a = 2 * math.pi * i / CAP_SIDES
            up = crown - (crown - hairline(a)) * t
            w, f, b = skull_at(skull, up)
            c, s = math.cos(a), math.sin(a)
            x = math.copysign(abs(c) ** square, c) * (w + lift)
            y = math.copysign(abs(s) ** square, s) * ((f if s > 0 else b) + lift)
            ring_points.append((x, y, up))
        rings.append(ring_points)
    return rings


# The female head as it really is low down, measured off the built model: wider than SKULL at ear height, to
# clear the ears (they reach 0.095 out, from 0.045 up to 0.095), and deeper at the back, where the skull bulges
# over the nape. Above that it is SKULL. For the styles whose hair comes down over the ears.
OVER_EARS_SKULL = [(0.04, 0.068, 0.07, 0.1), (0.05, 0.087, 0.073, 0.11), (0.06, 0.092, 0.078, 0.104),
               (0.07, 0.095, 0.08, 0.097), (0.08, 0.097, 0.081, 0.097), (0.09, 0.099, 0.082, 0.098),
               (0.1, 0.089, 0.083, 0.098), (0.11, 0.083, 0.084, 0.097)] + SKULL["Female"][3:]
# Where hair over the ears stops, round from the forehead to the nape: high in the middle of the forehead under
# the fringe, dipping at the temples to a sideburn in front of the ear, down over the ears to the lobes, and
# tapering down the back of the head to the nape.
OVER_EARS_HAIRLINE = [(0, 0.168), (22.5, 0.16), (45, 0.124), (67.5, 0.048), (90, 0.04), (112.5, 0.042),
                  (135, 0.055), (157.5, 0.048), (180, 0.045)]


def hair_curtain(levels, points=6):
    """A thick sheet of hair hanging down the back. Each level: height, half width, how far back the middle
    hangs, how far forwards the edges wrap, and thickness."""
    rings = []
    for up, half, back, wrap, thick in levels:
        outer = []
        for j in range(points + 1):
            x = -half + 2 * half * j / points
            outer.append((x, back + wrap * (x / half) ** 2, up))
        inner = [(x, y + thick, z) for x, y, z in reversed(outer)]
        rings.append(outer + inner)
    return rings


def hair_tube(path, sides=8):
    """A rounded length of hair, such as a ponytail or a bun, along (x, y, height, radius) stations."""
    return [ring(up, r, r, r, y, x, n=sides) for x, y, up, r in path]


def hair_lock(path):
    """A flat lock along (x, y, height, half width, half thickness) stations, wider across than through."""
    return [ring(up, t, w, w, y, x, n=6) for x, y, up, w, t in path]


def hair_styles(spec):
    """The extra styles for a character: {style: [rings, ...]}, each ring list lofted into one closed piece."""
    skull = SKULL[spec["name"]]
    square = SKULL_SQUARE[spec["name"]]

    def hair_cap(skull, front, side, back, gap):
        return fitted_cap(skull, front, side, back, gap, square=square)

    def over_ears_cap(gap):
        """Her hair close over the head, down over the ears and tapered into the nape."""
        return fitted_cap(OVER_EARS_SKULL, 0.168, 0.1, 0.05, gap, bands=6, square=square,
                          hairline_at=OVER_EARS_HAIRLINE, edge_gap=0.005)

    if spec["name"] == "Female":
        fringe = [list(station) for station in BOB_FRINGE]
        return {
            # Short and close, with her side-swept fringe: down over the tops of her ears, a sideburn in front
            # of each, and tapered into the nape.
            "Pixie": [over_ears_cap(0.016), fringe],
            # Long and straight down her back, with a lock either side of the face. The hair comes down over
            # her ears, the curtain wraps round the sides of her head, and each lock is wide enough to meet it,
            # so no skin shows between them.
            "Long": [
                over_ears_cap(0.016), fringe,
                hair_curtain([(0.16, 0.07, -0.085, 0.03, 0.02), (0.1, 0.098, -0.112, 0.07, 0.025),
                              (0.04, 0.104, -0.116, 0.09, 0.025), (-0.03, 0.104, -0.104, 0.08, 0.022),
                              (-0.1, 0.104, -0.098, 0.045, 0.02), (-0.2, 0.1, -0.092, 0.03, 0.018),
                              (-0.3, 0.09, -0.088, 0.02, 0.014), (-0.36, 0.07, -0.085, 0.01, 0.008)]),
                *[hair_lock([(sx * 0.086, 0.02, 0.15, 0.014, 0.006), (sx * 0.098, 0.01, 0.07, 0.028, 0.008),
                             (sx * 0.104, 0.005, 0.0, 0.032, 0.01), (sx * 0.098, 0.0, -0.07, 0.026, 0.008),
                             (sx * 0.092, -0.005, -0.13, 0.014, 0.005)])
                  for sx in (-1, 1)],
            ],
            # Tied high at the back of the head, hanging to the nape, with the hair down over her ears.
            "Ponytail": [
                over_ears_cap(0.012), fringe,
                hair_tube([(0.0, -0.09, 0.155, 0.018), (0.0, -0.118, 0.14, 0.026), (0.0, -0.138, 0.08, 0.03),
                           (0.0, -0.136, 0.0, 0.027), (0.0, -0.126, -0.08, 0.02), (0.0, -0.116, -0.15, 0.007)]),
            ],
            # Pulled up into a long tail tied high on the crown, with the fringe and a lock either side of the face,
            # and the hair down over her ears.
            "Tail": [
                over_ears_cap(0.012), fringe,
                hair_tube([(0.0, -0.05, 0.19, 0.02), (0.0, -0.08, 0.222, 0.024), (0.0, -0.105, 0.236, 0.02),
                           (0.0, -0.13, 0.238, 0.034), (0.0, -0.16, 0.215, 0.04), (0.0, -0.175, 0.15, 0.04),
                           (0.0, -0.175, 0.06, 0.037), (0.0, -0.165, -0.04, 0.031), (0.0, -0.152, -0.14, 0.024),
                           (0.0, -0.14, -0.23, 0.014), (0.0, -0.132, -0.29, 0.004)], sides=10),
                *[hair_lock([(sx * 0.088, 0.02, 0.15, 0.012, 0.007), (sx * 0.098, 0.032, 0.08, 0.014, 0.007),
                             (sx * 0.096, 0.036, 0.02, 0.012, 0.006), (sx * 0.088, 0.03, -0.035, 0.006, 0.003)])
                  for sx in (-1, 1)],
            ],
            # Gathered into a round bun on the crown, with the hair down over her ears.
            "Bun": [
                over_ears_cap(0.012), fringe,
                hair_tube([(0.0, -0.065, 0.17, 0.028), (0.0, -0.068, 0.192, 0.05), (0.0, -0.07, 0.222, 0.056),
                           (0.0, -0.07, 0.252, 0.045), (0.0, -0.068, 0.268, 0.018)]),
            ],
        }
    return {
        # Clipped close all over.
        "Buzz": [hair_cap(skull, 0.178, 0.13, 0.06, 0.008)],
        # Loose to the shoulders, covering the ears.
        "Long": [
            hair_cap(skull, 0.18, 0.12, 0.05, 0.014),
            hair_curtain([(0.18, 0.07, -0.08, 0.02, 0.02), (0.12, 0.096, -0.115, 0.06, 0.025),
                          (0.06, 0.098, -0.118, 0.075, 0.025), (0.0, 0.096, -0.108, 0.075, 0.022),
                          (-0.07, 0.1, -0.1, 0.06, 0.02), (-0.13, 0.095, -0.095, 0.05, 0.012)], points=8),
        ],
        # Pulled back and tied low at the nape.
        "Ponytail": [
            hair_cap(skull, 0.18, 0.125, 0.05, 0.013),
            hair_tube([(0.0, -0.1, 0.07, 0.016), (0.0, -0.118, 0.05, 0.022), (0.0, -0.122, -0.02, 0.022),
                       (0.0, -0.115, -0.1, 0.016), (0.0, -0.108, -0.16, 0.006)]),
        ],
    }


def build_character(c, m, spec):
    name = spec["name"]
    tunic, trousers, leather = m[spec["tunic"]], m[spec.get("pants", "trousers")], m["leather"]
    skin = m[spec.get("skin", "skin")]
    root = empty(c, name, (0, 0, 0))
    fold_amount = spec.get("fold", 0.0)
    fold_rng = np.random.default_rng(23)
    skinned = spec.get("skinned", False)
    stripes = spec.get("stripes", False) and not skinned

    def body(facet, *rings_and_mats):
        """Adds a limb shell, unless one continuous skin will cover this part instead."""
        return facet if skinned else facet.loft(*rings_and_mats)

    def part(label, pivot):
        facet = Facet(c, f"{name}_{label}", pivot)
        facet.keep_quads = spec.get("quads", False)
        return facet

    def stack(key, n=8, cx=0.0):
        return [ring(*r, cx=cx, n=n) for r in spec[key]]

    def folded(key, n, cx=0.0, keep_top=0):
        """Rings nudged at random, so cloth catches the light in uneven planes like folded paper."""
        rings = stack(key, n, cx)
        if fold_amount:
            for r in rings[:len(rings) - keep_top]:
                r[:] = [(x + fold_rng.uniform(-fold_amount, fold_amount),
                         y + fold_rng.uniform(-fold_amount, fold_amount), z) for x, y, z in r]
        return rings

    hips_at = (0, 0, spec["hips_z"])
    bands = len(spec["hips"]) - 1
    hip_rings = folded("hips", 12, keep_top=2)
    if "back_seam" in spec:
        for r in hip_rings[1:-2]:
            x, y, z = r[9]  # the point at the centre of the back
            r[9] = (x, y + spec["back_seam"], z)
    hips = body(part("Hips", hips_at), hip_rings, [trousers] * (bands - 1) + [m[spec.get("belt", "leather")]])
    if stripes:
        for sx in (-1, 1):
            add_stripes(hips, spec["hips"][2:-1], 0.0, sx, m["stripe"], 0.01, 0.004, 0.19)
    if spec.get("drawstring"):
        for sx in (-1, 1):
            add_strand(hips, [(sx * 0.01, 0.088, 1.04, 0.004), (sx * 0.035, 0.09, 0.99, 0.004),
                              (sx * 0.02, 0.085, 0.95, 0.004), (sx * 0.032, 0.08, 0.9, 0.004)], m["waistband"])
    hips_obj = hips.finish(root, (0, 0, 0))

    torso_at = (0, 0, spec["torso_z"])
    midriff = spec.get("midriff_bands", 0)
    torso = body(part("Torso", torso_at), stack("torso", 12),
                 [skin] * midriff + [tunic] * (len(spec["torso"]) - 1 - midriff))
    if spec.get("necklace") and not skinned:
        # A skinned body gets hers laid on the finished skin instead (build_necklace).
        for sx in (-1, 1):
            add_strand(torso, [(sx * 0.055, 0.035, 1.355, 0.003), (sx * 0.03, 0.065, 1.31, 0.003),
                               (0, 0.08, 1.265, 0.003)], m["pewter"])
        torso.loft([ring(1.24, 0.008, 0.004, 0.004, 0.09, n=4), ring(1.265, 0.003, 0.003, 0.003, 0.084, n=4)], m["pewter"])
    torso_obj = torso.finish(hips_obj, hips_at)

    neck_at = (0, 0, spec["neck_z"])
    head = part("Head", neck_at)
    hair_parts = None
    if skinned:
        hair_parts = {"hair": part("Hair", neck_at)}
        if "buns" in spec:
            hair_parts["bun"] = part("Bun", neck_at)
        if "strands" in spec:
            hair_parts.update({1: part("Strand_R", neck_at), -1: part("Strand_L", neck_at)})
    add_head(head, spec, m, hair_parts)
    head_obj = head.finish(torso_obj, torso_at)
    for facet in (hair_parts or {}).values():
        facet.finish(head_obj, neck_at)
    if skinned:
        kx, ky, kz = spec["head_scale"]
        chin = spec["chin_z"]
        # The male's own hair is drawn in his two hair tones; the styles take the darker one.
        hair_mat = m["hair_m"] if spec.get("angular_head") else m[spec["hair"]]
        for style, pieces in hair_styles(spec).items():
            facet = part(f"Hair{style}", neck_at)
            for rings in pieces:
                facet.loft([[(x * kx, y * ky, chin + up * kz) for x, y, up in r] for r in rings], hair_mat)
            facet.finish(head_obj, neck_at)

    shoulder_x, shoulder_z = spec["shoulder"]
    for side, sx in (("L", -1), ("R", 1)):
        cx = sx * shoulder_x
        shoulder_y = spec.get("shoulder_y", 0.0)
        upper_lean, fore_lean = spec.get("arm_lean", (0.0, 0.0))
        elbow_z = spec["elbow_z"]
        elbow_y = shoulder_y - upper_lean * (shoulder_z - elbow_z)

        def upper_y(z):
            return shoulder_y - upper_lean * (shoulder_z - z)

        def fore_y(z):
            return elbow_y - fore_lean * (elbow_z - z)

        shoulder_at = (cx, shoulder_y, shoulder_z)
        sides = spec["arm_sides"]
        bare = spec.get("bare_arm_bands", 0)
        sleeve_top = [skin] * bare + [tunic] * (len(spec["upper_arm"]) - 1 - bare)
        upper = body(part(f"UpperArm_{side}", shoulder_at), arm_rings(spec["upper_arm"], cx, sx, sides, upper_y), sleeve_top)
        upper_obj = upper.finish(torso_obj, torso_at)
        upper_obj.rotation_euler[1] = -sx * spec["splay"]

        elbow_at = (cx, elbow_y, elbow_z)
        forearm_bands = len(spec["forearm"]) - 1
        cuff = spec["cuff_bands"]
        sleeve = [skin] * forearm_bands if spec.get("bare_forearm") else [leather] * cuff + [tunic] * (forearm_bands - cuff)
        fore = body(part(f"ForeArm_{side}", elbow_at), arm_rings(spec["forearm"], cx, sx, sides, fore_y), sleeve)
        add_hand(fore, cx, spec["wrist_z"], sx, spec["hand_scale"], skin, fore_y(spec["wrist_z"]))
        fore.finish(upper_obj, shoulder_at)

        leg_x = sx * spec["hip_x"]
        hip_at = (leg_x, 0, spec["hips_z"] - 0.06)
        thigh = body(part(f"Thigh_{side}", hip_at), folded("thigh", 8, leg_x), trousers)
        if stripes:
            add_stripes(thigh, spec["thigh"], leg_x, sx, m["stripe"], 0.01, 0.004, 0.316)
        thigh_obj = thigh.finish(hips_obj, hips_at)
        thigh_obj.rotation_euler[1] = -sx * spec["leg_splay"]

        knee_at = (leg_x, 0, spec["knee_z"])
        knee_z = spec["knee_z"]
        shin = body(part(f"Shin_{side}", knee_at), stack("shin", 8, leg_x), trousers)
        if stripes:
            add_stripes(shin, spec["shin"], leg_x, sx, m["stripe"], 0.01, 0.004, 0.316)
        scale = spec["foot_scale"]
        shin.loft([sole_ring(y, w, lift, leg_x + sx * y * TOE_OUT, scale) for y, w, lift in SHOE_SOLE],
                  m[spec.get("sole", "iron")])
        shin.loft([upper_ring(y, w, top, leg_x + sx * y * TOE_OUT, scale) for y, w, top in SHOE_UPPER],
                  m[spec.get("shoe", "leather")])
        if spec.get("sneakers"):
            for y, top in ((0.06, 0.098), (0.085, 0.079), (0.11, 0.068)):
                shin.box(sx * y * TOE_OUT, y * scale, (top + 0.006) * scale - knee_z,
                         0.05 * scale, 0.012 * scale, 0.006 * scale, m["sole_w"], fit=True)
            shin.box(sx * (0.058 * scale + 0.002 + 0.095 * TOE_OUT), 0.095 * scale, 0.045 * scale - knee_z,
                     0.006, 0.024 * scale, 0.024 * scale, m["pants_red"], fit=True)
        # Cancels the thigh's outward angle so the feet stay flat on the floor.
        shin.finish(thigh_obj, hip_at).rotation_euler[1] = sx * spec["leg_splay"]
        # Her other shoes, each placed just as her own are.
        for style in SHOE_STYLES if spec.get("shoe_styles") else []:
            shoe = part(f"Shoes{style['mesh']}_{side}", knee_at)
            build_shoe_style(shoe, style, leg_x, sx, scale, m, spec)
            shoe.finish(thigh_obj, hip_at).rotation_euler[1] = sx * spec["leg_splay"]
    if skinned:
        skin_character(c, m, spec, root)
    return root


class Skin:
    """One continuous body, written as named corners on one side and mirrored to the other."""

    def __init__(self):
        self.points, self.weights, self.faces = [], [], []
        self.ids = {}

    def add(self, key, sx, co, weights):
        self.ids[(key, sx)] = len(self.points)
        self.points.append(co)
        self.weights.append(weights)

    def has(self, key, sx):
        return (key, sx) in self.ids or (key, 0) in self.ids

    def at(self, key, sx):
        return self.ids[(key, sx)] if (key, sx) in self.ids else self.ids[(key, 0)]

    def face(self, keys, sx, mat):
        self.faces.append(([self.at(key, sx) for key in keys], mat))

    def mesh(self, name, faces, place=None):
        """A mesh of just these faces. Returns it with the original index of each of its corners."""
        kept = sorted({i for f, _ in faces for i in f})
        renumbered = {old: new for new, old in enumerate(kept)}
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata([place(i) if place else self.points[i] for i in kept], [],
                         [[renumbered[i] for i in f] for f, _ in faces])
        materials = list(dict.fromkeys(mat for _, mat in faces))
        for mat in materials:
            mesh.materials.append(mat)
        for polygon, (_, mat) in zip(mesh.polygons, faces):
            polygon.material_index = materials.index(mat)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        uv = bm.loops.layers.uv.new("UVMap")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for face in bm.faces:
            nx, ny, nz = (abs(a) for a in face.normal)
            for loop in face.loops:
                x, y, z = loop.vert.co
                u, v = (x, y) if nz >= nx and nz >= ny else (y, z) if nx >= ny else (x, z)
                loop[uv].uv = (u * 2.0, v * 2.0)
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()
        return mesh, kept

    def link(self, coll, mesh, kept, character, object_name):
        """An object for this mesh, with one vertex group per bone."""
        obj = bpy.data.objects.new(object_name, mesh)
        coll.objects.link(obj)
        groups = {}
        for new, old in enumerate(kept):
            for label, weight in self.weights[old].items():
                bone = f"{character}_{label}"
                if bone not in groups:
                    groups[bone] = obj.vertex_groups.new(name=bone)
                groups[bone].add([new], weight, "REPLACE")
        return obj


# Where each trunk column crosses each loop: "name": (height, x) per column, read off the
# reference wireframe. A missing x means the default for that column.
# Columns run around one side: centre front, front, side, back, beside the spine, spine.
TRUNK_COLUMNS = ("C", "F", "S", "B", "N", "P")
TRUNK_LOOPS = [
    ("a", {"C": (0.977, 0), "F": (0.965, 0.07), "S": (0.972, None), "B": (0.974, 0.075), "N": (0.974, 0.0125), "P": (0.969, 0)}),
    ("belt0", {"C": (1.005, 0), "F": (1.005, 0.065), "S": (1.005, None), "B": (1.005, 0.068), "N": (1.005, 0.0115), "P": (1.005, 0)}),
    ("belt1", {"C": (1.055, 0), "F": (1.055, 0.06), "S": (1.055, None), "B": (1.055, 0.0625), "N": (1.055, 0.0115), "P": (1.055, 0)}),
    ("skin0", {"C": (1.057, 0), "F": (1.057, 0.0575), "S": (1.057, None), "B": (1.057, 0.06), "N": (1.057, 0.0115), "P": (1.057, 0)}),
    ("skin1", {"C": (1.07, 0), "F": (1.07, 0.0575), "S": (1.07, None), "B": (1.07, 0.06), "N": (1.07, 0.0115), "P": (1.07, 0)}),
    ("hem", {"C": (1.072, 0), "F": (1.072, 0.0625), "S": (1.072, None), "B": (1.072, 0.066), "N": (1.072, 0.0115), "P": (1.072, 0)}),
    ("crease", {"C": (1.108, 0), "F": (1.086, 0.07), "S": (1.083, 0.094), "B": (1.086, 0.066), "N": (1.086, 0.0115), "P": (1.086, 0)}),
    ("under", {"C": (1.126, 0), "F": (1.103, 0.065), "S": (1.092, 0.095), "B": (1.1, 0.069), "N": (1.1, 0.0115), "P": (1.1, 0)}),
    ("low", {"C": (1.14, 0), "F": (1.128, 0.078), "S": (1.12, 0.103), "B": (1.119, 0.071), "N": (1.119, 0.013), "P": (1.119, 0)}),
    ("bust", {"C": (1.1536, 0), "F": (1.1536, 0.08), "S": (1.149, 0.108), "B": (1.138, 0.0725), "N": (1.138, 0.015), "P": (1.138, 0)}),
    ("high", {"C": (1.173, 0), "F": (1.174, 0.082), "S": (1.161, 0.107), "B": (1.152, 0.078), "N": (1.152, 0.0175), "P": (1.152, 0)}),
    ("chest", {"C": (1.193, 0), "F": (1.193, 0.0815), "S": (1.172, 0.105), "B": (1.1665, 0.0825), "N": (1.1665, 0.02), "P": (1.1665, 0)}),
]
# The bare body has only the loops the reference has, with no clothing edges.
BARE_LOOPS = [
    TRUNK_LOOPS[0],
    ("w0", {"C": (1.009, 0), "F": (1.009, 0.064), "S": (1.009, None), "B": (1.02, 0.0625), "N": (1.02, 0.0115), "P": (1.02, 0)}),
    ("w1", {"C": (1.062, 0), "F": (1.062, 0.0575), "S": (1.062, None), "B": (1.06, 0.0625), "N": (1.06, 0.0115), "P": (1.06, 0)}),
] + TRUNK_LOOPS[6:]
# How far the front pushes forward at the bust, as a multiple of the plain outline. The outline swells at the bust
# all the way across; these take that back out, so the rings make a plain chest wall and the breasts are laid on
# it afterwards, each its own round dome (BREAST_DOME). Pushed out ring by ring, the breasts came out as one shelf
# across the chest with a flat, upright front, and the light drew two curves under each breast instead of one.
BUST = {"crease": {"C": 1.0, "F": 1.0}, "under": {"C": 0.86, "F": 1.0}, "low": {"C": 0.775, "F": 0.85},
        "bust": {"C": 0.715, "F": 0.715}, "high": {"C": 0.76, "F": 0.76}, "chest": {"C": 0.81, "F": 0.81}}
# Each breast, laid on the chest wall once the soft parts have their extra faces: a dome over (x, height), standing
# `out` forwards at its middle. It reaches `inner` and `outer` across, `up` and `down` (metres). How it meets the
# chest at its edge, as a power of (1 - distance squared): under 0.5 it turns in sharply, the fold beneath; above 1
# it runs on smoothly, the slope down from the collarbone. In between round the sides. `lean`: how far the outer
# half moves outwards as well as forwards, at its edge (1 is as far out as forwards). Each sits 6 cm from the
# middle: further out, a full bust left a broad flat V of chest between them at the top of the cleavage.
BREAST_DOME = {"x": 0.06, "z": 1.14, "out": 0.05, "inner": 0.06, "outer": 0.045, "up": 0.078, "down": 0.05,
               "fold": 0.45, "flank": 0.85, "slope": 1.6, "lean": 0.8}
# Through the bust each loop has two more columns: M between the centre and front columns, G between the front
# and side. They give the bust a round underside and enough corners to grow much larger in the game.
BUST_ZONE = ("crease", "under", "low", "bust", "high")
BUST_EXTRA = {("C", "F"): "M", ("F", "S"): "G"}
# How much rounder than a flat facet the extra columns stand: forwards for M, forwards and out for G.
BUST_ROUND = {"M": (1.0, 1.04), "G": (1.02, 1.06)}
LEG_FRONT_OUT, LEG_FRONT_IN, LEG_BACK_OUT, LEG_BACK_IN = 0.65, -0.45, 0.6, -0.5
# Below the knee the loops run downhill towards the outside of the leg.
LEG_SIDE_DROP = {3: 0.026, 4: 0.026, 5: 0.026, 6: 0.015}
ARM_DEPTH_SIN, ARM_WIDTH_COS = 0.5, 0.866
BONE_LENGTH = 0.08
COLLAR_Z = 1.335
CLOTH_GAP = 0.003
CLOTH_EASE = 0.006
# Heights above the chin where a loose strand starts to hang free, and how far until it is fully free.
STRAND_ROOT, STRAND_LENGTH = 0.13, 0.2


# The male trunk as drawn in his reference: chest plates, the large diamond across the back, and a belt.
# Weight kinds: t follows height, h is hips, b mostly hips, l joins hips to the thigh.
# Centre line: name, height, front or back, weight kind, depth multiplier.
PLATE_MIDLINE = [("Cn", 1.618, "f", "t", 1.0), ("C0", 1.554, "f", "t", 1.0), ("C1", 1.496, "f", "t", 0.96), ("C2", 1.433, "f", "t", 0.95),
                 ("C3", 1.385, "f", "t", 1.0), ("C4", 1.299, "f", "t", 1.0), ("C5", 1.234, "f", "t", 1.0), ("C6", 1.139, "f", "t", 1.0),
                 ("C7", 1.088, "f", "t", 1.0), ("P0", 1.618, "b", "t", 1.0), ("P1", 1.582, "b", "t", 1.0), ("P2", 1.501, "b", "t", 1.0),
                 ("P3", 1.389, "b", "t", 0.96), ("P4", 1.253, "b", "t", 1.0), ("P5", 1.215, "b", "t", 1.0), ("P6", 1.129, "b", "t", 1.0),
                 ("P7", 1.112, "b", "t", 1.0), ("P8", 1.071, "b", "h", 1.0), ("P9", 1.038, "b", "h", 0.9), ("P10", 0.986, "b", "h", 0.75),
                 ("X_b", 0.93, "b", "h", 0.7)]
# One side: name, x (None for the full width), height, front/back/side, weight kind, depth multiplier.
PLATE_POINTS = [("Fn", 0.05, 1.618, "f", "t", 1.0), ("Sn", 0.07, 1.618, "s", "t", 1.0), ("K1", 0.051, 1.618, "b", "t", 1.0),
                ("K2", 0.075, 1.582, "b", "t", 1.0), ("K4", 0.153, 1.512, "b", "t", 1.0), ("K5", 0.0476, 1.482, "b", "t", 1.0),
                ("K7", 0.085, 1.379, "b", "t", 1.0), ("K8", 0.119, 1.35, "b", "t", 1.0), ("K10", 0.09, 1.215, "b", "t", 1.0),
                ("K12", 0.092, 1.125, "b", "t", 1.0), ("K13", 0.09, 1.112, "b", "t", 1.0), ("K14", 0.082, 1.071, "b", "h", 1.0),
                ("K15", 0.054, 0.993, "b", "b", 1.05), ("K18", 0.015, 0.923, "b", "h", 0.75), ("G_o", 0.133, 0.976, "b", "b", 1.0),
                ("G_L", 0.16, 0.925, "b", "b", 1.0), ("SA", None, 1.4, "s", "t", 1.0), ("SB", None, 1.3, "s", "t", 1.0),
                ("SC", None, 1.215, "s", "t", 1.0), ("SD", None, 1.125, "s", "t", 1.0), ("Sb1", None, 1.112, "s", "t", 1.0),
                ("Sb0", None, 1.071, "s", "h", 1.0), ("Sh", None, 0.976, "s", "b", 1.0), ("F3", 0.125, 1.555, "f", "t", 1.0),
                ("F4", 0.15, 1.496, "f", "t", 1.0), ("F5", 0.09, 1.407, "f", "t", 1.05), ("F6", 0.155, 1.45, "f", "t", 1.0),
                ("F7", 0.085, 1.37, "f", "t", 1.0), ("F8", 0.13, 1.367, "f", "t", 1.0), ("F9", 0.075, 1.299, "f", "t", 1.0),
                ("F10", 0.115, 1.299, "f", "t", 1.0), ("F11", 0.07, 1.234, "f", "t", 1.0), ("F12", 0.1, 1.234, "f", "t", 1.0),
                ("F13", 0.07, 1.139, "f", "t", 1.0), ("F14", 0.11, 1.139, "f", "t", 1.0), ("F15", 0.08, 1.09, "f", "t", 1.0),
                ("F16", 0.125, 1.09, "f", "t", 1.0), ("F17", 0.135, 1.03, "f", "b", 1.0), ("S_t", 0.173, 0.93, "s", "l", 1.0),
                ("FO_t", 0.12, 0.93, "f", "l", 1.0), ("FI_t", 0.03, 0.99, "f", "l", 1.0), ("BO_t", 0.133, 0.891, "b", "l", 1.0),
                ("BI_t", 0.03, 0.891, "b", "l", 1.0)]
# Faces of one side, by what covers them: t shirt, b belt, p trousers.
PLATE_FACES = {
    "t": [("Cn", "Fn", "F3", "C0"), ("Fn", "Sn", "K3", "F3"), ("C0", "F3", "F4", "C1"), ("F3", "K3", "F4"),
          ("C1", "F4", "F5", "C2"), ("F4", "F6", "F5"), ("F4", "a0_5", "F6"), ("C2", "F5", "F7", "C3"), ("F5", "F6", "F8", "F7"),
          ("F6", "a0_5", "SA", "F8"), ("a0_5", "a0_4", "SA"), ("C3", "F7", "F9", "C4"), ("F7", "F8", "F10", "F9"),
          ("F8", "SA", "SB", "F10"), ("C4", "F9", "F11", "C5"), ("F9", "F10", "F12", "F11"), ("F10", "SB", "SC", "F12"),
          ("C5", "F11", "F13", "C6"), ("F11", "F12", "F14", "F13"), ("F12", "SC", "SD", "F14"), ("F14", "SD", "Sb1", "F16"),
          ("K3", "F4", "SHf", "SHm"), ("K3", "SHm", "SHb", "K4"), ("F4", "SHf", "a0_5"), ("K4", "a0_4", "SHb"),
          ("SHf", "a0_5", "a0_0", "a0_1"), ("SHf", "a0_1", "a0_2", "SHm"), ("SHm", "a0_2", "SHb"), ("SHb", "a0_2", "a0_3", "a0_4"),
          ("P0", "K1", "K2", "P1"), ("K1", "Sn", "K3", "K2"), ("P1", "K2", "K5", "P2"), ("K2", "K3", "K4", "K5"), ("K5", "K4", "a0_4"),
          ("P2", "K5", "K7"), ("K5", "a0_4", "K8", "K7"), ("P2", "K7", "P3"), ("P3", "K7", "K8", "P4"), ("P4", "K8", "K10", "P5"),
          ("a0_4", "SA", "SB", "K8"), ("K8", "SB", "SC", "K10"), ("P5", "K10", "P6"), ("K10", "K12", "P6"), ("K10", "SC", "SD", "K12"),
          ("P6", "K12", "K13", "P7"), ("K12", "SD", "Sb1", "K13")],
    "b": [("C6", "F13", "F15", "C7"), ("F13", "F14", "F16", "F15"), ("F16", "Sb1", "Sb0", "F17"), ("P7", "K13", "K14", "P8"),
          ("K13", "Sb1", "Sb0", "K14")],
    "p": [("C7", "F15", "FI_t", "C_v"), ("F15", "F16", "F17"), ("F15", "F17", "FO_t", "FI_t"), ("F17", "Sb0", "Sh", "FO_t"),
          ("FO_t", "Sh", "S_t"), ("P8", "K14", "K15", "P9"), ("P9", "K15", "P10"), ("K14", "Sb0", "Sh", "G_o"), ("K14", "G_o", "K15"),
          ("K15", "G_o", "G_L", "K18"), ("P10", "K15", "K18", "X_b"), ("G_o", "Sh", "S_t", "G_L"), ("G_L", "S_t", "BO_t"),
          ("K18", "G_L", "BO_t", "BI_t"), ("X_b", "K18", "BI_t", "X")],
}


def build_skin(spec, m, worn=True):
    """The body as one mesh of four-sided polygons, laid out like the reference wireframe."""
    skin = Skin()
    profile = spec["bare_profile"]
    arm_rows = spec["bare_arm"]
    loops = BARE_LOOPS
    tee, bare, pants, belt, stripe = (m[spec["tunic"]], m[spec["skin"]], m[spec["pants"]], m[spec["belt"]], m["stripe"])
    if worn:
        loops = TRUNK_LOOPS
        profile = spec.get("skin_profile") or [(z, w + CLOTH_EASE, f + CLOTH_EASE, b + CLOTH_EASE) for z, w, f, b in profile]
        arm_rows = spec.get("skin_arm") or [(z, w + CLOTH_EASE, d + CLOTH_EASE) for z, w, d in arm_rows]
    else:
        tee = pants = belt = bare
    bust_table = spec.get("bust", BUST)
    layout_heights = spec.get("layout_z")
    plated = spec.get("plated", False)
    blend_start, blend_span = spec.get("trunk_blend", (0.985, 0.05))
    leg_drop = spec.get("leg_drop", LEG_SIDE_DROP)
    shoulder_x, shoulder_z = spec["shoulder"]
    hip_z = spec["hips_z"] - 0.06
    leg_splay, arm_splay = spec["leg_splay"], spec["splay"]
    upper_lean, fore_lean = spec.get("arm_lean", (0.0, 0.0))
    elbow_rest = spec["elbow_z"]

    def outline(z):
        for (z0, *low), (z1, *high) in zip(profile, profile[1:]):
            if z <= z1:
                t = max(0.0, (z - z0) / (z1 - z0))
                return [a + (b - a) * t for a, b in zip(low, high)]
        return profile[-1][1:]

    def outline_of(table, z):
        for (z0, *low), (z1, *high) in zip(table, table[1:]):
            if z <= z1:
                t = max(0.0, (z - z0) / (z1 - z0))
                return [a + (b - a) * t for a, b in zip(low, high)]
        return table[-1][1:]

    def height(z):
        """Where a height in the shared layout falls on this character."""
        if not layout_heights:
            return z
        for (a0, b0), (a1, b1) in zip(layout_heights, layout_heights[1:]):
            if z <= a1:
                return b0 + (b1 - b0) * (z - a0) / (a1 - a0)
        return layout_heights[-1][1]

    def fit(x, z):
        """Moves a point of the shared layout onto this character's outline."""
        target = height(z)
        if plated:
            return x, target
        return x * outline(target)[0] / outline_of(FEMALE["bare_profile"], z)[0], target

    def on_raw(x, y, z):
        scale = outline(height(z))[1] / outline_of(FEMALE["bare_profile"], z)[1]
        x, target = fit(x, z)
        return (x, y * scale, target)

    def on_body(x, z, front, depth=1.0):
        """The (x, y, z) of a trunk point, taking y from the measured outline at that height."""
        x, z = fit(x, z)
        w, f, b = outline(z)
        c = min(x / w, 0.995) ** 1.25
        return (x, (f if front else -b) * (1 - c * c) ** 0.4 * depth, z)

    def on_side(x, z):
        if x is not None:
            x, z = fit(x, z)
        else:
            z = height(z)
        w, f, b = outline(z)
        return ((w if x is None else min(x, w)), (f - b) / 2, z)

    def trunk_weights(z):
        t = min(1.0, max(0.0, (z - blend_start) / blend_span))
        return {"Hips": 1 - t, "Torso": t}

    def mirrored(sx, co):
        return (sx * co[0], co[1], co[2])

    def midline(key, co, weights):
        skin.add(key, 0, co, weights)

    # Centre-line points are shared by both sides.
    if not plated:
        for name, loop in loops:
            z, _ = loop["C"]
            midline(f"C_{name}", on_body(0.0, z, True, bust_table.get(name, {}).get("C", 1.0)), trunk_weights(z))
            z, _ = loop["P"]
            midline(f"P_{name}", on_body(0.0, z, False), trunk_weights(z))
    torso = {"Torso": 1.0}
    hips_only = {"Hips": 1.0}
    if plated:
        for key, z, kind, weight, depth in PLATE_MIDLINE:
            midline(key, on_body(0.0, z, kind == "f", depth), hips_only if weight == "h" else trunk_weights(z))
        midline("C_v", (0.0, 0.06, 0.992), hips_only)
        midline("X", (0.0, -0.02, 0.955), hips_only)
    if not plated:
        midline("C_top", on_body(0.0, 1.297, True), torso)
        midline("P_top", on_body(0.0, 1.284, False), torso)
        midline("C_neck", on_body(0.0, COLLAR_Z, True), torso)
        midline("P_neck", on_body(0.0, COLLAR_Z, False), torso)
        midline("C_chest2", on_body(0.0, 1.218, True), torso)
        midline("P_chest2", on_body(0.0, 1.19, False), torso)
        # Front of the hips down to the point of the V, and the spine down between the glutes.
        midline("C_b", on_body(0.0, 0.89, True), hips_only)
        midline("C_c", on_body(0.0, 0.826, True), hips_only)
        midline("C_v", on_raw(0.0, 0.055, 0.7635), hips_only)
        midline("P_b", on_body(0.0, 0.914, False, 0.86), hips_only)
        midline("P_c", on_body(0.0, 0.879, False, 0.8), hips_only)
        midline("P_g", on_body(0.0, 0.804, False, 0.72), hips_only)
        midline("X", on_raw(0.0, -0.02, 0.76), hips_only)

    leg_rows = spec["skin_leg"]
    shoulder_points = spec.get("shoulder_points", {"SHf": (0.124, 0.022, 1.3), "SHb": (0.1275, -0.05, 1.3),
                                                   "SHm": (0.1265, -0.014, 1.308), "T": (0.0725, -0.012, 1.322)})

    for side, sx in (("L", -1), ("R", 1)):
        thigh, shin, upper, fore = f"Thigh_{side}", f"Shin_{side}", f"UpperArm_{side}", f"ForeArm_{side}"

        def add(key, co, weights):
            skin.add(key, sx, mirrored(sx, co), weights)

        if not plated:
            for name, loop in loops:
                bust = bust_table.get(name, {}).get("F", 1.0)
                z, x = loop["F"]
                add(f"F_{name}", on_body(x, z, True, bust), trunk_weights(z))
                if name in BUST_ZONE:
                    # Halfway between the columns either side, then pushed out so the facets round over.
                    zc, _ = loop["C"]
                    centre = on_body(0.0, zc, True, bust_table.get(name, {}).get("C", 1.0))
                    front = on_body(x, z, True, bust)
                    zs, xs = loop["S"]
                    side = on_side(xs, zs)
                    for key, (a, b) in (("M", (centre, front)), ("G", (front, side))):
                        out, forwards = BUST_ROUND[key]
                        mx, my, mz = ((u + v) / 2 for u, v in zip(a, b))
                        add(f"{key}_{name}", (mx * out, my * forwards, mz), trunk_weights(mz))
                z, x = loop["S"]
                add(f"S_{name}", on_side(x, z), trunk_weights(z))
                z, x = loop["B"]
                add(f"B_{name}", on_body(x, z, False), trunk_weights(z))
                z, x = loop["N"]
                add(f"N_{name}", on_body(x, z, False), trunk_weights(z))

            # Shoulders and collar.
            add("F_top", on_body(0.064, 1.297, True), torso)
            add("B_top", on_body(0.08, 1.284, False), torso)
            add("N_top", on_body(0.035, 1.284, False), torso)
            add("F_neck", on_body(0.045, COLLAR_Z, True), torso)
            add("B_neck", on_body(0.05, COLLAR_Z, False), torso)
            add("N_neck", on_body(0.02, COLLAR_Z, False), torso)
            add("F_chest2", on_body(0.0765, 1.229, True), torso)
            add("B_chest2", on_body(0.0825, 1.19, False), torso)
            add("N_chest2", on_body(0.0325, 1.19, False), torso)
        half_blend = {"Torso": 0.5, upper: 0.5}
        add("SHf", shoulder_points["SHf"], half_blend)
        add("SHb", shoulder_points["SHb"], half_blend)
        add("SHm", shoulder_points["SHm"], half_blend)
        if plated:
            add("K3", (0.15, -0.005, 1.557), torso)
        else:
            add("T", shoulder_points["T"], torso)
            add("M_neck", on_raw(0.066, 0.0, COLLAR_Z), torso)

        # Arm: hexagonal loops with a corner at the front and back.
        cos_splay, sin_splay = math.cos(arm_splay), math.sin(arm_splay)
        shoulder_y = spec.get("shoulder_y", 0.0)
        elbow_y = shoulder_y - upper_lean * (shoulder_z - elbow_rest)

        def arm_centre(z):
            length = (shoulder_z - z) / cos_splay
            rest_z = shoulder_z - length
            y = shoulder_y - upper_lean * length if rest_z >= elbow_rest else elbow_y - fore_lean * (elbow_rest - rest_z)
            return shoulder_x + length * sin_splay, y

        elbow_world_z = shoulder_z - (shoulder_z - elbow_rest) * cos_splay
        for row, (z, w, d) in enumerate(arm_rows):
            cx, cy = arm_centre(z)
            offset = z - elbow_world_z
            bend = min(1.0, max(0.0, 0.5 - offset / 0.06))
            weights = {upper: 1 - bend, fore: bend}
            if bend in (0.0, 1.0):
                weights = {fore if bend else upper: 1.0}
            if row == 0:
                weights = {upper: 0.85, "Torso": 0.15}
            corners = [(cx, cy + d), (cx + w * ARM_WIDTH_COS, cy + d * ARM_DEPTH_SIN),
                       (cx + w * ARM_WIDTH_COS, cy - d * ARM_DEPTH_SIN), (cx, cy - d),
                       (cx - w * ARM_WIDTH_COS, cy - d * ARM_DEPTH_SIN), (cx - w * ARM_WIDTH_COS, cy + d * ARM_DEPTH_SIN)]
            for i, (x, y) in enumerate(corners):
                inner = row == 0 and i in (4, 5)
                add(f"a{row}_{i}", (x, y, z), half_blend if inner else weights)

        # Hips: the V at the front, loops around each glute at the back.
        hip_blend = {"Hips": 0.85, thigh: 0.15}
        leg_top = {"Hips": 0.4, thigh: 0.6}
        if plated:
            for key, x, z, kind, weight, depth in PLATE_POINTS:
                weights = {"t": trunk_weights(z), "h": hips_only, "b": hip_blend, "l": leg_top}[weight]
                add(key, on_side(x, z) if kind == "s" else on_body(x, z, kind == "f", depth), weights)
        if not plated:
            add("F_b", on_body(0.0835, 0.905, True), hips_only)
            add("S_b", on_side(None, 0.925), hips_only)
            add("B_b", on_body(0.09, 0.93, False), hips_only)
            add("N_b", on_body(0.0375, 0.93, False), hips_only)
            add("F_c", on_body(0.099, 0.848, True), hip_blend)
            add("S_c", on_side(None, 0.87), hip_blend)
            add("B_c", on_body(0.111, 0.894, False), hips_only)
            add("N_c", on_body(0.0265, 0.894, False), hips_only)
            add("W1", on_body(0.13, 0.814, True), hip_blend)
            add("W2", on_body(0.06, 0.784, True), hip_blend)
            add("W3", on_body(0.045, 0.778, True, 0.92), hip_blend)
            add("S_w", on_side(0.16, 0.836), hip_blend)
            add("B_d", on_body(0.13, 0.8565, False), hip_blend)
            add("G_d", on_body(0.0825, 0.8565, False, 1.08), hip_blend)
            add("G_e", on_body(0.071, 0.8265, False, 1.08), hip_blend)
            add("G_b", on_body(0.004, 0.804, False, 0.72), hips_only)

            # Upper end of the leg.
            add("S_t", on_side(0.18, 0.761), leg_top)
            add("FO_t", on_body(0.1525, 0.766, True), leg_top)
            add("FI_t", on_body(0.044, 0.755, True), leg_top)
            add("BO_t", on_body(0.1425, 0.7615, False), leg_top)
            add("BI_t", on_body(0.056, 0.7615, False), leg_top)

        # Leg: six columns, with the side column dropping lower below the knee.
        knee_z = spec["knee_z"]
        columns = (("S", 1.0, None), ("FO", LEG_FRONT_OUT, True), ("FI", LEG_FRONT_IN, True), ("I", -1.0, None),
                   ("BI", LEG_BACK_IN, False), ("BO", LEG_BACK_OUT, False))
        for row, (z, w, f, b) in enumerate(leg_rows):
            leg_x = spec["hip_x"] + (hip_z - max(z, knee_z)) * math.sin(leg_splay)
            bend = min(1.0, max(0.0, (0.5 - (z - knee_z) / 0.09)))
            weights = {thigh: 1 - bend, shin: bend}
            if bend in (0.0, 1.0):
                weights = {shin if bend else thigh: 1.0}
            for key, out, front in columns:
                if front is None:
                    y = (f - b) / 2
                else:
                    c = abs(out) ** 1.25
                    y = (f if front else -b) * (1 - c * c) ** 0.4
                dz = -leg_drop.get(row, 0.0) if key == "S" else 0.0
                add(f"{key}{row}", (leg_x + out * w, y, z + dz), weights)

    for sx in (-1, 1):
        def quad(keys, mat):
            skin.face(keys, sx, mat)

        if plated:
            covers = {"t": tee, "b": belt, "p": pants}
            for zone, faces in PLATE_FACES.items():
                for keys in faces:
                    skin.face(keys, sx, covers[zone])

        if not plated:
            # Regular loops up the trunk.
            midriff = bare if spec.get("midriff", True) else tee
            fabric = {"a": pants, "belt0": belt, "belt1": belt, "skin0": midriff, "skin1": tee, "hem": tee, "crease": tee,
                      "under": tee, "low": tee, "bust": tee, "high": tee, "w0": bare, "w1": bare}
            def extra(loop, one, two):
                key = BUST_EXTRA.get((one, two))
                return f"{key}_{loop}" if key and loop in BUST_ZONE else None

            for (low, _), (high, _) in zip(loops, loops[1:]):
                for one, two in zip(TRUNK_COLUMNS, TRUNK_COLUMNS[1:]):
                    a0, b0, a1, b1 = f"{one}_{low}", f"{two}_{low}", f"{one}_{high}", f"{two}_{high}"
                    x0, x1 = extra(low, one, two), extra(high, one, two)
                    mat = fabric[low]
                    if x0 and x1:
                        quad((a0, x0, x1, a1), mat)
                        quad((x0, b0, b1, x1), mat)
                    elif x1:
                        quad((a0, b0, b1, x1), mat)
                        skin.face((a0, x1, a1), sx, mat)
                    elif x0:
                        skin.face((x0, b0, b1), sx, mat)
                        quad((a0, x0, b1, a1), mat)
                    else:
                        quad((a0, b0, b1, a1), mat)

            # Chest to collar, opening out into the arm.
            for one, two in (("C", "F"), ("B", "N"), ("N", "P")):
                quad((f"{one}_chest", f"{two}_chest", f"{two}_chest2", f"{one}_chest2"), tee)
                quad((f"{one}_chest2", f"{two}_chest2", f"{two}_top", f"{one}_top"), tee)
                quad((f"{one}_top", f"{two}_top", f"{two}_neck", f"{one}_neck"), tee)
            quad(("F_top", "T", "M_neck", "F_neck"), tee)
            quad(("T", "B_top", "B_neck", "M_neck"), tee)
            quad(("F_chest", "S_chest", "a0_5", "F_chest2"), tee)
            quad(("S_chest", "B_chest", "B_chest2", "a0_4"), tee)
            skin.face(("S_chest", "a0_4", "a0_5"), sx, tee)  # hidden in the armpit
            quad(("F_chest2", "a0_5", "SHf", "F_top"), tee)
            quad(("SHf", "a0_5", "a0_0", "a0_1"), tee)
            quad(("B_chest2", "B_top", "SHb", "a0_4"), tee)
            quad(("SHb", "a0_2", "a0_3", "a0_4"), tee)
            quad(("SHf", "a0_1", "a0_2", "SHm"), tee)
            skin.face(("SHm", "a0_2", "SHb"), sx, tee)
            quad(("F_top", "SHf", "SHm", "T"), tee)
            quad(("T", "SHm", "SHb", "B_top"), tee)

        # Down the arm.
        for row in range(len(arm_rows) - 1):
            mat = tee if row < spec.get("sleeve_rows", 2) else bare
            if spec["cuff_bands"] and worn and row == len(arm_rows) - 2:
                mat = m["leather"]
            for i in range(6):
                j = (i + 1) % 6
                quad((f"a{row}_{i}", f"a{row}_{j}", f"a{row + 1}_{j}", f"a{row + 1}_{i}"), mat)
        last = len(arm_rows) - 1
        skin.face([f"a{last}_{i}" for i in range(6)], sx, bare)

        if not plated:
            # Hips, as drawn in the reference.
            quad(("C_b", "F_b", "F_a", "C_a"), pants)
            quad(("F_b", "S_b", "S_a", "F_a"), pants)
            quad(("S_b", "B_b", "B_a", "S_a"), pants)
            quad(("B_b", "N_b", "N_a", "B_a"), pants)
            quad(("N_b", "P_b", "P_a", "N_a"), pants)
            quad(("C_c", "F_c", "F_b", "C_b"), pants)
            quad(("F_c", "S_c", "S_b", "F_b"), pants)
            quad(("S_c", "B_c", "B_b", "S_b"), pants)
            quad(("B_c", "N_c", "N_b", "B_b"), pants)
            quad(("N_c", "P_c", "P_b", "N_b"), pants)
            quad(("C_v", "W3", "F_c", "C_c"), pants)      # the V at the front
            quad(("W3", "W2", "W1", "F_c"), pants)
            quad(("W1", "S_w", "S_c", "F_c"), pants)
            quad(("FO_t", "S_t", "S_w", "W1"), pants)
            quad(("FI_t", "FO_t", "W1", "W2"), pants)
            quad(("C_v", "FI_t", "W2", "W3"), pants)
            quad(("S_w", "B_d", "B_c", "S_c"), pants)
            quad(("N_c", "B_c", "B_d", "G_d"), pants)     # above the glute
            quad(("N_c", "G_d", "G_e", "G_b"), pants)     # the glute
            quad(("P_c", "N_c", "G_b", "P_g"), pants)     # between the glutes
            quad(("G_e", "G_d", "B_d", "BO_t"), pants)
            quad(("G_b", "G_e", "BO_t", "BI_t"), pants)
            quad(("P_g", "G_b", "BI_t", "X"), pants)
            quad(("S_w", "S_t", "BO_t", "B_d"), pants)

        # Thigh top into the first full leg loop; the crotch closes around one small triangle.
        quad(("S_t", "FO_t", "FO0", "S0"), pants)
        quad(("FO_t", "FI_t", "FI0", "FO0"), pants)
        quad(("FI_t", "C_v", "I0", "FI0"), pants)
        skin.face(("C_v", "X", "I0"), sx, pants)
        quad(("X", "BI_t", "BI0", "I0"), pants)
        quad(("BI_t", "BO_t", "BO0", "BI0"), pants)
        quad(("BO_t", "S_t", "S0", "BO0"), pants)

        ring_order = ("S", "FO", "FI", "I", "BI", "BO")
        for row in range(len(leg_rows) - 1):
            for one, two in zip(ring_order, ring_order[1:] + ring_order[:1]):
                quad((f"{one}{row}", f"{two}{row}", f"{two}{row + 1}", f"{one}{row + 1}"), pants)
        skin.face([f"{key}{len(leg_rows) - 1}" for key in ring_order], sx, pants)

    # Collar cap, hidden inside the neck.
    ring_keys = [("C_neck", 1), ("F_neck", 1), ("M_neck", 1), ("B_neck", 1), ("N_neck", 1), ("P_neck", 1),
                 ("N_neck", -1), ("B_neck", -1), ("M_neck", -1), ("F_neck", -1)]
    if plated:
        ring_keys = [("Cn", 1), ("Fn", 1), ("Sn", 1), ("K1", 1), ("P0", 1), ("K1", -1), ("Sn", -1), ("Fn", -1)]
    skin.faces.append(([skin.at(key, sx) for key, sx in ring_keys], tee))

    if not (worn and spec.get("stripes")):
        return skin

    # Track-pants stripes: two thin raised bands lying on the facets either side of the side column.
    leg_path = [(f"S{row}", f"FO{row}", f"BO{row}") for row in range(len(leg_rows))]
    path = [("S_b", "F_b", "B_b"), ("S_c", "F_c", "B_c"), ("S_w", "W1", "B_d"), ("S_t", "FO_t", "BO_t")] + leg_path
    for sx in (-1, 1):
        for offset_index, offset in enumerate((-0.01, 0.01)):
            names = []
            for step, (key, front, back) in enumerate(path):
                source = skin.at(key, sx)
                sx0, sy0, sz0 = skin.points[source]
                nx0, ny0, nz0 = skin.points[skin.at(front if offset > 0 else back, sx)]
                name = f"st{offset_index}_{step}"
                corners = ((0.005, -0.004), (0.005, 0.004), (0.007, 0.004), (0.007, -0.004))
                for c, (out, along) in enumerate(corners):
                    t = abs(offset + along) / abs(ny0 - sy0)
                    skin.add(f"{name}_{c}", sx, (sx0 + (nx0 - sx0) * t + sx * out, sy0 + offset + along,
                                                 sz0 + (nz0 - sz0) * t), skin.weights[source])
                names.append(name)
            for low, high in zip(names, names[1:]):
                for c in range(4):
                    d = (c + 1) % 4
                    skin.face((f"{low}_{c}", f"{low}_{d}", f"{high}_{d}", f"{high}_{c}"), sx, stripe)
            for name in (names[0], names[-1]):
                skin.face([f"{name}_{c}" for c in range(4)], sx, stripe)
    return skin


def character_joints(spec):
    """Each bone's parent and head position. Limb angles are baked into the skin, so bones stay upright."""
    name = spec["name"]
    joints = {
        "Hips": (None, (0.0, 0.0, spec["hips_z"])),
        "Torso": ("Hips", (0.0, 0.0, spec["torso_z"])),
        "Head": ("Torso", (0.0, 0.0, spec["neck_z"])),
    }
    shoulder_x, shoulder_z = spec["shoulder"]
    shoulder_y = spec.get("shoulder_y", 0.0)
    upper_lean = spec.get("arm_lean", (0.0, 0.0))[0]
    elbow_z = spec["elbow_z"]
    elbow_y = shoulder_y - upper_lean * (shoulder_z - elbow_z)
    length = shoulder_z - elbow_z
    hip_z = spec["hips_z"] - 0.06
    knee_x = spec["hip_x"] + (hip_z - spec["knee_z"]) * math.sin(spec["leg_splay"])
    for side, sx in (("L", -1), ("R", 1)):
        joints[f"UpperArm_{side}"] = ("Torso", (sx * shoulder_x, shoulder_y, shoulder_z))
        joints[f"ForeArm_{side}"] = (f"UpperArm_{side}", (sx * (shoulder_x + length * math.sin(spec["splay"])), elbow_y,
                                                         shoulder_z - length * math.cos(spec["splay"])))
        joints[f"Thigh_{side}"] = ("Hips", (sx * spec["hip_x"], 0.0, hip_z))
        joints[f"Shin_{side}"] = (f"Thigh_{side}", (sx * knee_x, 0.0, spec["knee_z"]))
    kx, ky, kz = spec["head_scale"]
    chin = spec["chin_z"]
    if "buns" in spec:
        joints["Bun"] = ("Head", (0.0, -0.095 * ky, chin + 0.17 * kz))
    if "strands" in spec:
        for side, sx in (("L", -1), ("R", 1)):
            joints[f"Strand_{side}"] = ("Head", (sx * 0.085 * kx, 0.02 * ky, chin + 0.12 * kz))
    if spec.get("jiggle"):
        for label, (parent, head, *_rest) in JIGGLE_REGIONS.items():
            joints[label] = (parent, head)
        # Her hair's springs sit on the joints of the bones they hang from, so whatever reshapes those reshapes
        # the hair on the springs alike (see hair_spring_weights).
        joints["HairSoft"] = ("Head", (0.0, 0.0, spec["neck_z"]))
        joints["HairTail"] = ("Torso", (0.0, 0.0, spec["torso_z"]))
    if spec.get("outfit") == "medieval":
        # The long skirt hangs from panels round the hips, each one jointed at mid-thigh and at the knee. The game
        # swings them out of the legs' way, so the legs never pass through the cloth, keeping the mid-thigh joint
        # straight; it bends only when she gathers the skirt up in her hands, folding the cloth over on itself.
        for i in range(SKIRT_PANELS):
            joints[f"Skirt{i}"] = ("Hips", skirt_rim(spec, i, SKIRT_PIVOT))
            joints[f"SkirtMid{i}"] = (f"Skirt{i}", skirt_rim(spec, i, SKIRT_MID))
            joints[f"SkirtHem{i}"] = (f"SkirtMid{i}", skirt_rim(spec, i, SKIRT_KNEE))
    return {f"{name}_{label}": (f"{name}_{parent}" if parent else None, head) for label, (parent, head) in joints.items()}


# ---------------------------------------------------------------- secondary motion

# Soft parts the game moves on springs. Each bone takes part of the weight of the skin and cloth around it:
# bone: (parent, centre, radii of the region, most weight it takes, side: 1 front only, -1 back only, 0 all round).
JIGGLE_REGIONS = {
    "Bust": ("Torso", (0.0, 0.075, 1.15), (0.14, 0.1, 0.095), 1.0, 1),
    "Belly": ("Hips", (0.0, 0.06, 0.99), (0.11, 0.09, 0.08), 0.75, 1),
    "Glute_L": ("Hips", (-0.065, -0.08, 0.83), (0.09, 0.09, 0.11), 0.9, -1),
    "Glute_R": ("Hips", (0.065, -0.08, 0.83), (0.09, 0.09, 0.11), 0.9, -1),
    # The flesh of each thigh, all round, on the thigh's own line halfway to the knee. It takes only part of the
    # weight, so the leg keeps its shape and the softness rides on it. All round, the region is a cylinder: any
    # point within 10 cm of the line, so the other thigh and the crotch between them are left out, weighted by
    # height alone, full halfway down and fading out towards the hip and the knee.
    "ThighSoft_L": ("Thigh_L", (-0.105, 0.0, 0.65), (0.1, 0.1, 0.17), 0.45, 0),
    "ThighSoft_R": ("Thigh_R", (0.105, 0.0, 0.65), (0.1, 0.1, 0.17), 0.45, 0),
}


# Regions made of more than one lobe: the weight is taken from the nearest. Each breast is its own lobe, so
# growing the bust grows the breasts themselves; the crease under them takes only a little, so it holds the fold.
JIGGLE_LOBES = {
    "Bust": ([(-0.072, 0.085, 1.145), (0.072, 0.085, 1.145)], (0.09, 0.075, 0.075)),
}
# How quickly a region's weight rises from its edge: weight is the smooth curve times this, up to the most.
# The breasts rise slowly, over the whole region: the game grows them to a Q cup, and a weight that drops
# sharply at the crease would fold the skin there over itself and pull the bodice into a tent. The glutes too:
# the game grows the rear a long way, and a weight flat through the middle and steep at the edge grows it into a
# shelf at the top and a point at the bottom instead of a rounder curve.
JIGGLE_RISE = {"Bust": 1.0, "Glute_L": 1.0, "Glute_R": 1.0}
# The bust's weight follows each breast's own outline (bust_weight): `most` all over the middle of the breast, out
# to `full` of the way to its edge, then easing to nothing at `spread` times the breast's size, a little onto the
# chest so its root widens with it. Round the sides of the trunk (by how far forwards, `front`, in metres) it eases
# off to nothing a centimetre behind her side, so the breast's outer side grows round into her side under the arm
# (stopping further forwards, it left a hard edge there seen from behind) and her back stays put. `most` keeps
# each cup size as the game measured them
# (appearance.ts): at Q the front of the breast stands 28 cm out, as it did with the old weights. Towards the
# middle it reaches further, `cleavage` times, so the skin between the breasts comes forwards with them and a full
# bust presses together in one line down the middle; easing out there as on the other sides, the cleavage stayed
# back as they grew and opened into a flat V between them, as if they were held apart. Below each breast it reaches
# `below` times as far, over the fold, so a big bust's underside drops and rounds with the rest and hangs heavy over
# the fold; easing out as on the other sides, the underside stayed put as the breast grew and dropped, and set into a
# flat slope from the chest to the nipple. Much further and the skin under the fold creases as it's pulled down.
# Round the outer side it reaches `outside` times as far, so the whole outer side of the breast grows alike: easing
# out over the breast itself, its outer side grew less than its front and stood off her side in a hard edge.
BUST_WEIGHT = {"Bust": {"most": 0.58, "full": 0.5, "spread": 1.3, "cleavage": 2.4, "below": 1.8, "outside": 1.8, "front": (-0.01, 0.045)}}


# Where the soft parts get extra faces: (lobe centres, radii, side: 1 front, -1 back, 0 both). A little larger
# than their weight regions, so the faces round off where the weight fades. The breasts' reach round her sides,
# under the arms, where a big bust's outer side grows out over her ribs: with few faces there it turned into one
# flat panel or a ragged edge seen from behind.
REFINE_REGIONS = [
    ([(-0.072, 0.085, 1.14), (0.072, 0.085, 1.14)], (0.12, 0.135, 0.1), 0),
    ([(-0.065, -0.08, 0.83), (0.065, -0.08, 0.83)], (0.1, 0.1, 0.12), -1),
]
# The breasts are split once more: the game grows them up to a Q cup, four times the size they are built,
# and they need the extra corners to stay round. A little inside the first region, so the crease keeps its edge.
# The glutes as well: grown, a rear with only four rows of corners top to bottom stands out as a polygon.
REFINE_AGAIN = [
    ([(-0.072, 0.085, 1.14), (0.072, 0.085, 1.14)], (0.11, 0.125, 0.09), 0),
    ([(-0.065, -0.08, 0.83), (0.065, -0.08, 0.83)], (0.09, 0.09, 0.11), -1),
]
# Her upper trunk, front and back, from above the breasts up to the collarbone and out into the armpits: built with
# only two rings there and a few broad panels running from the shoulder down into the armpit, it read as a box from
# the side. round_ribs splits it once, flat, then eases each corner towards its neighbours, the edge held still, so
# the corners round off like a rib cage's instead of swelling.
RIBS = {"centre": (0.0, -0.005, 1.25), "radii": (0.17, 0.16, 0.1), "ease": 0.5, "passes": 4, "arm": 0.6,
        "shoulder": 0.3, "neck": 1.32}
# How far the new corners move towards a smooth surface, from 0 (flat on the old faces) to 1.
REFINE_SMOOTH = 0.6
# Long hair blends from the head onto the back over this height below the neck.
HAIR_ONTO_BACK = 0.08
# Her hair's springs. What hangs from the head, from about the tops of her ears down to the ends of a bob or a
# tail, rides partly on the head's spring (HairSoft): none at the crown, the most where it ends. Long hair on her
# back rides on the torso's (HairTail), more of it the further down her back it falls.
HAIR_SOFT = {"from": 0.09, "over": 0.1, "most": 0.55}   # above the chin, metres; the most share it takes
HAIR_TAIL = {"from": 0.03, "over": 0.15, "most": 0.7}   # below the neck
# How far the head's spring can swing, as SOFT_PARTS.HairSoft.limit in player.ts says: keep the two the same. The
# locks hanging by her face swing every way with it, so each point rides it only as far as it stands clear of her
# skin and clothes, less this much; a lock lying on her cheek stays put. (The tail's spring never swings forwards
# into her back, which player.ts sees to, so the long hair lying on it still swings away freely.)
HAIR_SOFT_REACH = 0.025
HAIR_CLEAR = 0.002


def hair_spring_weights(spec, name, hairs, clear_of=()):
    """
    Hands part of each hair point's weight to the hair's springs, by how far it hangs (see HAIR_SOFT), and on the
    head's spring no more than it can swing without going into what's under it (`clear_of`, meshes in world space).
    """
    def ease(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)

    trees = []
    for obj in clear_of:
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bm.transform(obj.matrix_world)
        trees.append((bm, BVHTree.FromBMesh(bm)))

    def clearance(point):
        """How far out of the nearest skin or cloth a point is: negative inside it."""
        best = None
        for _, tree in trees:
            loc, normal, _, distance = tree.find_nearest(point)
            if loc is None:
                continue
            signed = distance if (point - loc).dot(normal) >= 0 else -distance
            best = signed if best is None or abs(signed) < abs(best) else best
        return 1.0 if best is None else best

    soft_top = spec["chin_z"] + HAIR_SOFT["from"]
    tail_top = spec["neck_z"] - HAIR_TAIL["from"]
    for obj in hairs:
        for v in obj.data.vertices:
            z = v.co.z
            if z > spec["neck_z"] - 0.01:
                share = HAIR_SOFT["most"] * ease((soft_top - z) / HAIR_SOFT["over"])
                if share > 0 and trees:
                    room = clearance(obj.matrix_world @ v.co) - HAIR_CLEAR
                    share = min(share, max(0.0, room) / HAIR_SOFT_REACH)
                move_weight(obj, v.index, f"{name}_HairSoft", share)
            else:
                move_weight(obj, v.index, f"{name}_HairTail", HAIR_TAIL["most"] * ease((tail_top - z) / HAIR_TAIL["over"]))
    for bm, _ in trees:
        bm.free()


def refine_soft_parts(obj, name, regions=REFINE_REGIONS, smooth=None, touching=False, arm_share=0.2):
    """Splits each face in these regions into four, leaving the arms alone. Weights follow the new corners. The new
    corners round the surface out by `smooth` (REFINE_SMOOTH unless given); 0 leaves it exactly as it was. A face is
    in a region if its middle is, or, `touching`, if any corner is: long faces reaching into it are split too. A
    region's side is 1 for the front, -1 the back, 0 both. A face with a corner the arm holds more than `arm_share` of
    is the arm's, and stays as it is."""
    arms = {g.index for g in obj.vertex_groups if g.name.startswith((f"{name}_UpperArm", f"{name}_ForeArm"))}
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    deform = bm.verts.layers.deform.active

    def inside(co):
        for centres, (rx, ry, rz), side in regions:
            if side and side * co.y <= 0.0:
                continue
            for cx, cy, cz in centres:
                if ((co.x - cx) / rx) ** 2 + ((co.y - cy) / ry) ** 2 + ((co.z - cz) / rz) ** 2 < 1:
                    return True
        return False

    def on_arm(vert):
        return deform is not None and any(group in arms and w > arm_share for group, w in vert[deform].items())

    def chosen(f):
        return any(inside(v.co) for v in f.verts) if touching else inside(f.calc_center_median())

    faces = [f for f in bm.faces if chosen(f) and not any(on_arm(v) for v in f.verts)]
    edges = list({e for f in faces for e in f.edges})
    if edges:
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True,
                                  smooth=REFINE_SMOOTH if smooth is None else smooth)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def round_ribs(obj, name, ribs=RIBS):
    """Rounds off her upper trunk (see RIBS): split once, flat, then each corner inside eased towards its neighbours."""
    arms = {g.index for g in obj.vertex_groups if g.name.startswith((f"{name}_UpperArm", f"{name}_ForeArm"))}
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    deform = bm.verts.layers.deform.active
    (cx, cy, cz), (rx, ry, rz) = ribs["centre"], ribs["radii"]

    def inside(co):
        return ((co.x - cx) / rx) ** 2 + ((co.y - cy) / ry) ** 2 + ((co.z - cz) / rz) ** 2 < 1

    def arm(vert):
        return deform is not None and sum(w for group, w in vert[deform].items() if group in arms) > ribs["arm"]

    faces = [f for f in bm.faces if inside(f.calc_center_median()) and not all(arm(v) for v in f.verts)]
    edges = list({e for f in faces for e in f.edges})
    if edges:
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True, smooth=0.0)
    chosen = {f for f in bm.faces if inside(f.calc_center_median()) and not all(arm(v) for v in f.verts)}
    # Only corners wholly inside the region move, so its edge stays where it is and meets the rest without a seam;
    # nor the ring at the base of the neck, which the head's own mesh meets, nor any corner next to the arm, which
    # would pull in under it and leave its top standing out.
    def shared(v):
        return deform is not None and sum(w for group, w in v[deform].items() if group in arms) > ribs["shoulder"]

    def held(v):
        return v.co.z > ribs["neck"] or shared(v) or any(arm(e.other_vert(v)) for e in v.link_edges)

    inner = [v for v in {v for f in chosen for v in f.verts} if all(f in chosen for f in v.link_faces) and not held(v)]
    for _ in range(ribs["passes"]):
        bmesh.ops.smooth_vert(bm, verts=inner, factor=ribs["ease"], use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def breast_rise(x, z, dome=BREAST_DOME):
    """How far forward the breast stands over the chest wall at this point (either side), from BREAST_DOME."""
    dx, dz = abs(x) - dome["x"], z - dome["z"]
    a = dx / (dome["inner"] if dx < 0 else dome["outer"])
    b = dz / (dome["up"] if dz > 0 else dome["down"])
    reach = a * a + b * b
    if reach >= 1.0:
        return 0.0
    upward = b / math.sqrt(reach) if reach > 1e-12 else 0.0
    edge = dome["flank"] + (dome["slope"] - dome["flank"]) * upward if upward > 0 else \
        dome["flank"] + (dome["fold"] - dome["flank"]) * -upward
    return dome["out"] * (1.0 - reach) ** edge


def round_breasts(body, layers):
    """
    Lays each breast on the plain chest the rings make: every corner over the bust moves forwards by the breast's
    rise at the nearest point of the skin, so the clothes keep their place over it. Past the middle of the breast
    it moves outwards too, so the outer side rounds off towards the arm. Where the skin faces sideways it eases
    off, by the skin's smoothed normal there, so the sides of the trunk stay where they are.
    """
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.normal_update()
    bm.faces.ensure_lookup_table()
    tree = BVHTree.FromBMesh(bm)
    dome = BREAST_DOME
    reach_x = dome["x"] + dome["outer"]
    low, high = dome["z"] - dome["down"], dome["z"] + dome["up"]

    def smoothed_normal(face, spot):
        """The skin's normal at a point on a face, blended from its corners' normals."""
        weights = [1.0 / max(1e-6, (spot - corner.co).length) for corner in face.verts]
        total = sum(weights)
        return sum((corner.normal * w for corner, w in zip(face.verts, weights)), Vector()) / total

    moves = []
    for obj in (body, *layers):
        shift = {}
        for v in obj.data.vertices:
            co = v.co
            if co.y <= 0.0 or abs(co.x) >= reach_x or not low < co.z < high:
                continue
            spot, _, index, _ = tree.find_nearest(co)
            if spot is None:
                continue
            rise = breast_rise(spot.x, spot.z)
            if rise <= 0.0:
                continue
            facing = min(1.0, max(0.0, smoothed_normal(bm.faces[index], spot).y / 0.5))
            rise *= facing * facing * (3 - 2 * facing)
            outwards = min(1.0, max(0.0, (abs(spot.x) - dome["x"]) / dome["outer"]))
            side = 1.0 if co.x >= 0 else -1.0
            shift[v.index] = Vector((side * outwards * dome["lean"], 1.0, 0.0)).normalized() * rise
        moves.append((obj, shift))
    bm.free()
    for obj, shift in moves:
        for index, move in shift.items():
            obj.data.vertices[index].co += move
        obj.data.update()


# ---------------------------------------------------------------- nipples

# Each breast gets a flat disc of rings and spokes lying just over the skin, in its own material. The game shapes
# it into the areola and nipple from her look and how aroused she is (nippleProfile in appearance.ts), on the skin
# as the breast is at that moment, so it keeps its size whatever the cup. Each corner's ring and spoke ride in its
# UVs, as the material is one flat colour: u is the ring, 0 at the tip to 1 at the edge, and v the spoke around.
NIPPLE_RINGS = 5
NIPPLE_SPOKES = 12
# The disc as built: as wide as the widest areola the game makes (wide, at full size), so it always lays the
# areola on skin the disc has measured. The game sets the areola's own size, and measures it against this.
NIPPLE_RADIUS = 0.026
# How far over the skin it lies, so the skin never shows through it; well inside the clothes' gap.
NIPPLE_LIFT = 0.0008
# Where each nipple is found: looking out from inside the breast, a little outwards and down. From just outside the
# middle of each breast (BREAST_DOME's x), so the nipple sits a little past its fullest point.
NIPPLE_AIM = [((side * 0.064, 0.03, 1.15), (side * 0.12, 1.0, -0.06)) for side in (-1, 1)]


def add_nipples(m, name, body_obj):
    """Lays the two discs on the finished body, weighted like the skin under them."""
    mesh = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    # The skin's faces as they are before the discs go on; the rays only ever meet these.
    skin_faces = list(bm.faces)
    tree = BVHTree.FromBMesh(bm)
    deform = bm.verts.layers.deform.active
    uv = bm.loops.layers.uv.active
    if "T_areola" not in [mat.name for mat in mesh.materials]:
        mesh.materials.append(m["areola"])
    slot = [mat.name for mat in mesh.materials].index("T_areola")

    def on_skin(origin, direction):
        """The skin a ray meets, with the weights there, taken from the corners of the face it lands on."""
        hit, normal, index, _ = tree.ray_cast(origin, direction)
        face = skin_faces[index]
        near = [(1 / max(1e-5, (v.co - hit).length), v) for v in face.verts]
        total = sum(w for w, _ in near)
        weights = {}
        for w, v in near:
            for group, share in v[deform].items():
                weights[group] = weights.get(group, 0.0) + share * w / total
        smooth = sum((v.normal for v in face.verts), Vector()).normalized()
        return hit, smooth, weights

    for start, aim in NIPPLE_AIM:
        centre, normal, _ = on_skin(Vector(start), Vector(aim).normalized())
        across = Vector((0, 0, 1)).cross(normal).normalized()
        up = normal.cross(across)
        rings = []
        for ring in range(NIPPLE_RINGS + 1):
            spokes = 1 if ring == 0 else NIPPLE_SPOKES
            corners = []
            for spoke in range(spokes):
                angle = 2 * math.pi * spoke / NIPPLE_SPOKES
                radius = NIPPLE_RADIUS * ring / NIPPLE_RINGS
                over = centre + (across * math.cos(angle) + up * math.sin(angle)) * radius + normal * 0.02
                point, under, weights = on_skin(over, -normal)
                vert = bm.verts.new(point + under * NIPPLE_LIFT)
                for group, share in weights.items():
                    vert[deform][group] = share
                corners.append((vert, ring, spoke))
            rings.append(corners)

        def face(corners):
            f = bm.faces.new([c[0] for c in corners])
            f.material_index = slot
            f.smooth = False
            for loop, (_, ring, spoke) in zip(f.loops, corners):
                loop[uv].uv = (ring / NIPPLE_RINGS, spoke / NIPPLE_SPOKES)

        for spoke in range(NIPPLE_SPOKES):
            nxt = (spoke + 1) % NIPPLE_SPOKES
            face([rings[0][0], rings[1][spoke], rings[1][nxt]])
            for ring in range(1, NIPPLE_RINGS):
                face([rings[ring][spoke], rings[ring + 1][spoke], rings[ring + 1][nxt], rings[ring][nxt]])
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- navel

# Her navel is a small upright oval pit pressed into the skin of her belly, so the light shades it whatever her
# skin tone and it moves with her belly. The belly is built in faces several centimetres across, so the skin
# around it is split finer first, on every layer at once so the clothes over it keep their place; each pass
# splits a smaller patch. Only the bare body is pressed in: the clothes and the coat lie smooth over it.
NAVEL_REFINE = [0.05, 0.03, 0.018, 0.011]  # each pass's reach around the navel, metres
NAVEL_SIZE = (0.0065, 0.0105)  # half its width and height
NAVEL_DEPTH = 0.0065
# The upper rim folds over a little (a hood), so the pit's deepest point sits below its middle.
NAVEL_LOW = 0.003
# The faces this deep into the pit, as a share of its depth, wear the navel's darker skin (T_navel), which the
# game tones along with her skin; the light alone is too soft to show so small a pit at the game's resolution.
NAVEL_SHADE = 0.3


def navel_regions(spec, reach):
    return [([(0.0, 0.08, spec["navel"])], (reach, reach, reach), 1)]


def press_navel(spec, m, body_obj):
    """Presses the pit into the bare skin where a ray from inside her meets her belly, its inside darker."""
    mesh = body_obj.data
    if "T_navel" not in [mat.name for mat in mesh.materials]:
        mesh.materials.append(m["navel"])
    slot = [mat.name for mat in mesh.materials].index("T_navel")
    bm = bmesh.new()
    bm.from_mesh(mesh)
    tree = BVHTree.FromBMesh(bm)
    hit, normal, _, _ = tree.ray_cast(Vector((0.0, 0.0, spec["navel"])), Vector((0.0, 1.0, 0.0)))
    if normal.y < 0:
        normal = -normal
    across = Vector((1.0, 0.0, 0.0))
    up = normal.cross(across).normalized()
    if up.z < 0:
        up = -up
    centre = hit - up * NAVEL_LOW
    rx, rz = NAVEL_SIZE
    depth = {}
    for v in bm.verts:
        offset = v.co - hit
        if offset.dot(normal) < -0.02 or offset.length > 0.03:
            continue
        u = offset.dot(across) / rx
        # Measured from the low point below and from the middle above, so the top edge stays where it is.
        w = (v.co - centre).dot(up)
        w = w / (rz + NAVEL_LOW) if w > 0 else w / (rz - NAVEL_LOW)
        e = u * u + w * w
        if e < 1:
            depth[v] = (1 - e) ** 2
            v.co -= normal * NAVEL_DEPTH * depth[v]
    for f in bm.faces:
        if all(v in depth for v in f.verts) and sum(depth[v] for v in f.verts) / len(f.verts) > NAVEL_SHADE:
            f.material_index = slot
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- vulva

# A grid lying just over the skin of her groin, from the bottom of her mound down and back between her legs, which
# the game shapes into her vulva from her look and how aroused she is (vulva.ts): the outer lips, the slit with the
# inner lips in it, and the hood. Its middle faces, the slit, wear their own material (T_vulva); the rest wear her
# skin's (T_labia), which the game tones with her skin. Each corner's column and row ride in its UVs, as both
# materials are flat colours: u is the column, 0 at -x to 1 at +x, and v the row, 0 at the top to 1 at the bottom.
# The groin is built in a few large faces meeting in a point, so its skin is split finer first, on every layer at
# once so the clothes over it keep their place, and the grid lies on a rounded surface.
VULVA_COLUMNS = (-1.0, -0.72, -0.5, -0.34, -0.2, -0.09, 0.0, 0.09, 0.2, 0.34, 0.5, 0.72, 1.0)  # across, finer inside
VULVA_ROWS = 13  # evenly spaced along her
# The grid as built, as big as the game ever makes it (Size at 1); at smaller sizes the shape fills less of it.
VULVA_HALF = 0.034  # its half width
# Its length over the skin: from the front of her mound down to where her groin turns under. Past that her trunk
# is only a narrow ridge between her thighs, which close over anything laid there and push it out as they move.
VULVA_LENGTH = 0.085
VULVA_TOP = 0.812  # the height of its top row, on the front of her mound
# Her middle is found by rays from inside her groin at (y, z), turning from a little above forwards round to back
# between her legs.
VULVA_CORE = (0.012, 0.8)
# Off her middle her groin dips into a notch between the fronts of her thighs. Each row is aimed as a gentle curve
# across, drawing back this far at its ends, and as narrow as this share of the width where it faces down; each
# point then lies on the skin it looks in on from outside her, so it takes that skin's weights and moves with her
# thighs exactly as the skin does. Nothing spans a hollow, which a moving thigh would push through, but the narrow
# crease her skin has down her middle is filled up to this deep.
VULVA_WRAP = 0.008
VULVA_NARROW = 0.45
VULVA_TAPER = 0.35  # how much narrower its last row is
VULVA_FILL = 0.01
VULVA_LIFT = 0.0008
# The faces that wear T_vulva: those this close to the middle across, and along (a share of the length): the
# slit. isInner in vulva.ts.
VULVA_INNER = (0.2, 0.36 * 0.92)
# The skin it lies on.
VULVA_SKINS = ("T_skin_f", "T_smalls", "T_hole")
# Each pass of splitting the groin's skin, as a share of the reach around it.
VULVA_REFINE = [1.0, 0.75]
# And once more under her slit and round her anus, so the skin hidden under her openings (VULVA_HOLE, ANUS_HOLE)
# follows their shapes closely. Only split, the surface left exactly as it was, so the grid and the disc lie on
# the skin as they did.
OPENING_REFINE = [([(0.0, 0.042, 0.742), (0.0, 0.06, 0.775)], (0.021, 0.02, 0.024), 1),
                  ([(0.0, -0.026, 0.765)], (0.026, 0.022, 0.026), -1)]
# Her opening: between these two rows the grid is cut down its middle, and the two sides of the cut open onto her
# canal (T_canal), a pocket going into her. Closed, the sides meet and it lies flat between them; the game parts
# them (vulva.ts). Each side of the cut has its own corners: u a quarter column to the left or right of the middle.
# The canal's corners carry their place across it in u, 0 on the left side of the cut to 1 on the right, and their
# row in v; this many lie between the two sides, down into her and back up.
VULVA_CUT = (5, 10)
VULVA_CANAL = 5
VULVA_CANAL_DEPTH = 0.03  # how deep it is as built, at the middle of the cut; the game sets its own
# The skin under her opening is hidden while it shows (T_hole), so it never stands in front of her canal: the faces
# whose middles lie within this far either side of the line of the cut, stretched as wide as the game opens it, and
# this far past its top, as much longer as it grows, and a little past its bottom (it grows no longer there). No
# further, so the grid covers it at every size: its bottom row never comes up past BOTTOM in vulva.ts. While she's
# covered it wears her smallclothes, as the skin around it does.
VULVA_HOLE = 0.017
VULVA_HOLE_ENDS = (0.008, 0.0)
# The skin's many-sided faces this near her slit are split into triangles first (SkinProbe.split): a point and how
# far from it.
VULVA_SPLIT = ((0.0, 0.05, 0.758), 0.05)


def smooth01(t):
    """0 below 0, 1 above 1, and an S-curve between."""
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def vulva_regions(share):
    """The groin, front and back of its lowest point: (centres, radii, side) as refine_soft_parts takes them."""
    return [([(0.0, 0.035, 0.785)], (0.065 * share, 0.06 * share, 0.06 * share), 1),
            ([(0.0, 0.0, 0.77)], (0.06 * share, 0.05 * share, 0.045 * share), -1)]


class SkinProbe:
    """The bare skin of a body in a bmesh, to find points on it with rays and read its weights there."""

    def __init__(self, bm, mesh, m, materials, skins=VULVA_SKINS):
        bm.verts.index_update()
        self.bm = bm
        self.deform = bm.verts.layers.deform.active
        self.uv = bm.loops.layers.uv.active
        names = [mat.name if mat else "" for mat in mesh.materials]
        self.slots = {}
        for key, material_name in materials:
            if material_name not in names:
                mesh.materials.append(m[key])
                names.append(material_name)
            self.slots[key] = names.index(material_name)
        self.names = names
        # Only the skin's faces: the rays never meet the pubic patch or anything else lying over it.
        skins = {i for i, n in enumerate(names) if n in skins}
        self.faces = [f for f in bm.faces if f.material_index in skins]
        self.tree = BVHTree.FromPolygons([v.co.copy() for v in bm.verts], [[v.index for v in f.verts] for f in self.faces])

    def ray(self, origin, direction, reach=1e6):
        return self.tree.ray_cast(origin, direction, reach)[0]

    def nearest(self, point):
        return self.tree.find_nearest(point)[0]

    def weights(self, point):
        """The skin's weights at a point on it, from the corners of the face nearest it."""
        _, _, index, _ = self.tree.find_nearest(point)
        face = self.faces[index]
        near = [(1 / max(1e-5, (v.co - point).length), v) for v in face.verts]
        total = sum(w for w, _ in near)
        weights = {}
        for w, v in near:
            for group, share in v[self.deform].items():
                weights[group] = weights.get(group, 0.0) + share * w / total
        return weights

    def vert(self, co, weights):
        vert = self.bm.verts.new(co)
        for group, share in weights.items():
            vert[self.deform][group] = share
        return vert

    def face(self, verts, slot, uvs, outwards=None):
        """A face on these corners in this material, its UVs given per corner; turned to face `outwards` if given."""
        if outwards is not None:
            a, b, c = (v.co for v in verts[:3])
            if (b - a).cross(c - a).dot(outwards) < 0:
                verts, uvs = verts[::-1], uvs[::-1]
        f = self.bm.faces.new(verts)
        f.material_index = self.slots[slot]
        f.smooth = False
        for loop, coord in zip(f.loops, uvs):
            loop[self.uv].uv = coord
        return f

    def split(self, near):
        """Splits the skin's many-sided faces with a corner for which near(corner) is true into triangles, as the game
        draws them anyway: so a long face reaching in under an opening leaves only its part there to be hidden. Not
        its quads, which would fold the other way and move the skin."""
        faces = [f for f in self.faces if len(f.verts) > 4 and any(near(v.co) for v in f.verts)]
        if faces:
            made = bmesh.ops.triangulate(self.bm, faces=faces, quad_method="BEAUTY", ngon_method="BEAUTY")["faces"]
            self.faces = [f for f in self.faces if f.is_valid] + list(made)
            # What's laid on the skin from here on lies on it as it's split.
            self.bm.verts.index_update()
            self.tree = BVHTree.FromPolygons([v.co.copy() for v in self.bm.verts],
                                             [[v.index for v in f.verts] for f in self.faces])

    def hole(self, near, under=None):
        """Puts the smallclothes' faces of the skin for which near(centre) is true into T_hole: only those wholly
        under(corner), if given, so none reaches out from under what covers it while it's hidden."""
        smalls = self.names.index("T_smalls")
        count = 0
        for f in self.faces:
            if (f.material_index == smalls and near(f.calc_center_median())
                    and (under is None or all(under(v.co) for v in f.verts))):
                f.material_index = self.slots["hole"]
                count += 1
        return count


def add_vulva(m, name, body_obj):
    """Lays the grid on the finished body, weighted like the skin under it, with her canal behind its cut."""
    mesh = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    probe = SkinProbe(bm, mesh, m, (("vulva", "T_vulva"), ("labia", "T_labia"), ("canal", "T_canal"), ("hole", "T_hole")))
    probe.split(lambda p: (p - Vector(VULVA_SPLIT[0])).length < VULVA_SPLIT[1])
    tree = probe.tree

    # Her middle, from the front of her mound round to between her legs.
    core = Vector((0.0, *VULVA_CORE))
    line = []
    for i in range(361):
        a = math.radians(-25 + 185 * i / 360)
        point = tree.ray_cast(core, Vector((0.0, math.cos(a), -math.sin(a))))[0]
        if point is None:
            raise RuntimeError("add_vulva: a ray from inside her groin met no skin")
        if line or point.z <= VULVA_TOP:
            line.append(point)
    lengths = [0.0]
    for a, b in zip(line, line[1:]):
        lengths.append(lengths[-1] + (b - a).length)

    def along(d):
        """The point this far along her middle from the top."""
        for k in range(1, len(line)):
            if lengths[k] >= d:
                f = (d - lengths[k - 1]) / max(1e-9, lengths[k] - lengths[k - 1])
                return line[k - 1].lerp(line[k], f)
        raise RuntimeError("add_vulva: her middle ends before the grid does")

    step = VULVA_LENGTH / (VULVA_ROWS - 1)
    grid = {}
    normals = []
    for r in range(VULVA_ROWS):
        middle = along(r * step + step)
        tangent = (along(r * step + step * 1.5) - along(r * step + step * 0.5)).normalized()
        normal = Vector((0.0, -tangent.z, tangent.y))  # out of her, square to her middle
        # Narrower where it faces down, and narrower again in its last rows, which reach into the notch where her
        # thighs meet; there her trunk's skin runs inside her thighs.
        width = VULVA_HALF * (VULVA_NARROW + (1 - VULVA_NARROW) * max(0.0, normal.y))
        width *= 1 - VULVA_TAPER * smooth01((r / (VULVA_ROWS - 1) - 0.65) / 0.35)
        points = []
        for s in VULVA_COLUMNS:
            planned = middle + Vector((s * width, 0.0, 0.0)) - normal * VULVA_WRAP * s * s
            # The skin under the aim, looking in from outside her; failing that, the skin nearest it.
            point = tree.ray_cast(planned + normal * 0.04, -normal, 0.08)[0]
            if point is None:
                point = tree.find_nearest(planned)[0]
            points.append(point)
        # The crease down her middle, filled: no point lies further in than its neighbours, so the crease's walls
        # never stand in front of the slit. Only so far, so the notch between her thighs stays as it is.
        depths = [(p - middle).dot(normal) for p in points]
        filled = list(depths)
        for _ in range(VULVA_ROWS):
            for c in range(1, len(filled) - 1):
                filled[c] = max(filled[c], min(depths[c] + VULVA_FILL, (filled[c - 1] + filled[c + 1]) / 2))
        for c, (point, depth, fill) in enumerate(zip(points, depths, filled)):
            grid[c, r] = probe.vert(point + normal * (fill - depth + VULVA_LIFT), probe.weights(point))
        normals.append(normal)

    # The cut down the middle column: each side of it gets its own corners, at the same place while she's closed.
    columns = len(VULVA_COLUMNS)
    middle_column = columns // 2
    top, bottom = VULVA_CUT
    sides = {}
    for r in range(top + 1, bottom):
        shared = grid[middle_column, r]
        sides[r] = (shared, probe.vert(shared.co.copy(), dict(shared[probe.deform].items())))  # (left, right)

    def corner(c, r, column_side):
        """The corner at (c, r) for a face on this side of the middle column, and its UV."""
        u = c / (columns - 1)
        if c == middle_column and r in sides:
            return sides[r][0 if column_side < 0 else 1], (u + column_side * 0.25 / (columns - 1), r / (VULVA_ROWS - 1))
        return grid[c, r], (u, r / (VULVA_ROWS - 1))

    half, slit = VULVA_INNER
    for r in range(VULVA_ROWS - 1):
        for c in range(columns - 1):
            column_side = -1 if c < middle_column else 1
            corners = [corner(cc, rr, column_side) for cc, rr in ((c, r), (c + 1, r), (c + 1, r + 1), (c, r + 1))]
            s = (VULVA_COLUMNS[c] + VULVA_COLUMNS[c + 1]) / 2
            t = (r + 0.5) / (VULVA_ROWS - 1)
            slot = "vulva" if abs(s) < half and abs(t - 0.5) < slit else "labia"
            probe.face([v for v, _ in corners], slot, [coord for _, coord in corners])

    # Her canal: across each row of the cut, from its left side down into her and back up to its right side, a
    # little open as built so its faces have a way to face. Deepest at the middle of the cut; at its ends, where
    # the cut's sides meet, it closes into a wall.
    canal = {}
    across = Vector((1.0, 0.0, 0.0))
    for r in range(top, bottom + 1):
        if r in sides:
            left, right = sides[r]
        else:
            left = right = grid[middle_column, r]
        weights = dict(left[probe.deform].items())
        depth = VULVA_CANAL_DEPTH * (0.25 + 0.75 * math.sin(math.pi * (r - top) / (bottom - top)))
        canal[0, r], canal[VULVA_CANAL + 1, r] = left, right
        for k in range(1, VULVA_CANAL + 1):
            a = math.pi * k / (VULVA_CANAL + 1)
            co = left.co - across * math.cos(a) * 0.003 - normals[r] * math.sin(a) * depth
            canal[k, r] = probe.vert(co, weights)
    # The canal's edges are its own corners, as they're another material's; at the same places as the cut's sides.
    for r in range(top, bottom + 1):
        for k in (0, VULVA_CANAL + 1):
            canal[k, r] = probe.vert(canal[k, r].co.copy(), dict(canal[k, r][probe.deform].items()))
    for r in range(top, bottom):
        for k in range(VULVA_CANAL + 1):
            corners = [(k, r), (k + 1, r), (k + 1, r + 1), (k, r + 1)]
            verts = [canal[key] for key in corners]
            # Facing in, towards the opening above it.
            centre = sum((v.co for v in verts), Vector()) / 4
            opening = (grid[middle_column, r].co + grid[middle_column, r + 1].co) / 2
            uvs = [(kk / (VULVA_CANAL + 1), rr / (VULVA_ROWS - 1)) for kk, rr in corners]
            probe.face(verts, "canal", uvs, outwards=opening - centre)

    # The skin under the opening, within reach of the line of the cut.
    line = [grid[middle_column, r].co.copy() for r in range(top, bottom + 1)]

    def near_cut(point):
        for i, (a, b) in enumerate(zip(line, line[1:])):
            ab = b - a
            t = (point - a).dot(ab) / ab.length_squared
            # Past the cut's ends only off its first and last stretches, and only so far.
            low = -VULVA_HOLE_ENDS[0] / ab.length if i == 0 else 0.0
            high = 1.0 + (VULVA_HOLE_ENDS[1] / ab.length if i == len(line) - 2 else 0.0)
            if low <= t <= high and (a + ab * t - point).length < VULVA_HOLE:
                return True
        return False

    print(f"add_vulva: {probe.hole(near_cut)} faces of skin under her opening")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- anus

# A disc of rings and spokes lying over the skin in the cleft of her rear, like the nipple discs, with a short canal
# going into her from its middle. The game shapes it from her look and how open it is (anus.ts): the rim puckered
# in folds while it's closed, and the canal shown as it opens. Each corner's ring and spoke ride in its UVs: u the
# ring, 0 at the bottom of the canal through the rim to 1 at the disc's edge on her skin, and v the spoke. The rim's
# rings and the canal wear T_anus; the rest of the disc her skin (T_anus_skin), which the game tones with her skin.
ANUS_SPOKES = 12
ANUS_RINGS = 8  # out from the rim to the edge
ANUS_CANAL = 3  # rings down the canal, besides its bottom
ANUS_RIM = 3  # the rings out from the rim that wear T_anus
ANUS_RADIUS = 0.026  # the disc's edge, out past the rim stretched as wide as the game makes it
ANUS_DEPTH = 0.03  # the canal's depth as built
ANUS_MOUTH = 0.0005  # the rim's radius as built: closed
ANUS_LIFT = 0.0008
# Where it's found: looking out from inside her, back and down into the cleft of her rear.
ANUS_AIM = ((0.0, 0.0, 0.8), (0.0, -0.6, -0.8))
# The skin under it hidden while it shows, as under her vulva's opening: this far from its middle. The cleft's walls
# close in around it, so well out past the rim stretched, while still under the disc.
ANUS_HOLE = 0.022


def add_anus(m, name, body_obj):
    """Lays the disc and its canal on the finished body, weighted like the skin under it."""
    mesh = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    probe = SkinProbe(bm, mesh, m, (("anus", "T_anus"), ("anus_skin", "T_anus_skin"), ("hole", "T_hole")))
    start, aim = (Vector(v) for v in ANUS_AIM)
    centre = probe.ray(start, aim.normalized())
    probe.split(lambda p: (p - centre).length < ANUS_RADIUS)
    centre = probe.ray(start, aim.normalized())
    # Square to the line of her cleft, from two more rays either side.
    turn = lambda a: Matrix.Rotation(a, 3, "X") @ aim.normalized()
    before, after = probe.ray(start, turn(-0.08)), probe.ray(start, turn(0.08))
    tangent = (after - before).normalized()
    normal = Vector((0.0, -tangent.z, tangent.y))
    if normal.dot(aim) < 0:
        normal = -normal
    across = Vector((1.0, 0.0, 0.0))
    up = normal.cross(across).normalized()
    weights = probe.weights(centre)
    last = ANUS_CANAL + 1 + ANUS_RINGS
    rings = {0: [probe.vert(centre - normal * ANUS_DEPTH * 1.2, weights)]}
    for i in range(1, ANUS_CANAL + 1):
        depth = ANUS_DEPTH * (ANUS_CANAL + 1 - i) / ANUS_CANAL
        rings[i] = [probe.vert(centre - normal * depth + (across * math.cos(a) + up * math.sin(a)) * ANUS_MOUTH, weights)
                    for a in (2 * math.pi * k / ANUS_SPOKES for k in range(ANUS_SPOKES))]
    rings[ANUS_CANAL + 1] = [probe.vert(centre + normal * ANUS_LIFT + (across * math.cos(a) + up * math.sin(a)) * ANUS_MOUTH, weights)
                             for a in (2 * math.pi * k / ANUS_SPOKES for k in range(ANUS_SPOKES))]
    for j in range(1, ANUS_RINGS + 1):
        ring = []
        for k in range(ANUS_SPOKES):
            a = 2 * math.pi * k / ANUS_SPOKES
            aimed = centre + (across * math.cos(a) + up * math.sin(a)) * ANUS_RADIUS * j / ANUS_RINGS
            point = probe.ray(aimed + normal * 0.03, -normal, 0.06)
            if point is None:
                point = probe.nearest(aimed)
            ring.append(probe.vert(point + normal * ANUS_LIFT, probe.weights(point)))
        rings[ANUS_CANAL + 1 + j] = ring
    uv = lambda i, k: (i / last, k / ANUS_SPOKES)
    for i in range(last):
        slot = "anus" if i + 1 <= ANUS_CANAL + 1 + ANUS_RIM else "anus_skin"
        for k in range(ANUS_SPOKES):
            k1 = (k + 1) % ANUS_SPOKES
            if i == 0:
                verts, uvs = [rings[0][0], rings[1][k], rings[1][k1]], [uv(0, k), uv(1, k), uv(1, k + 1)]
            else:
                verts = [rings[i][k], rings[i + 1][k], rings[i + 1][k1], rings[i][k1]]
                uvs = [uv(i, k), uv(i + 1, k), uv(i + 1, k + 1), uv(i, k + 1)]
            # The disc faces out of her; the canal faces in, towards its middle.
            if i >= ANUS_CANAL + 1:
                outwards = normal
            else:
                face_centre = sum((v.co for v in verts), Vector()) / len(verts)
                axis = centre + normal * (face_centre - centre).dot(normal)
                outwards = axis - face_centre if i > 0 else normal
            probe.face(verts, slot, uvs, outwards=outwards)
    hidden = probe.hole(lambda p: (p - centre).length < ANUS_HOLE, lambda p: (p - centre).length < ANUS_RADIUS - 0.002)
    print(f"add_anus: {hidden} faces of skin under it")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- penis

# A tube standing straight out of the skin of his groin, and a sack below it with its mouth lying on his skin, which
# the game shapes into his penis and scrotum from his look and how aroused he is (penis.ts): soft, hanging in front
# of the sack with the foreskin over the glans; hard, standing up and out with it drawn back. The tube's rings run
# from its root, a little inside him, through the shaft, the outer foreskin, its lip and the inner foreskin folding
# back, to the sulcus and over the glans to a single corner at the tip; the sack's from its mouth down to a single
# corner at its bottom. Each corner's ring rides in u and its spoke in v. Up to the lip the tube wears T_penis and
# from it on T_glans; the sack wears T_scrotum. The game sets every corner itself, so as built they only need to lie
# where it finds them: the root's ring and the sack's mouth on his skin, the tube standing straight out of him.
PENIS_SPOKES = 12
PENIS_SHAFT = 8
PENIS_OUTER = 3
PENIS_INNER = 2
PENIS_GLANS = 4
PENIS_LIP = PENIS_SHAFT + PENIS_OUTER
PENIS_TIP = PENIS_LIP + PENIS_INNER + 1 + PENIS_GLANS + 1
SCROTUM_RINGS = 8  # from the mouth, besides the corner at the bottom
PENIS_LENGTH = 0.14  # as built, standing straight out
PENIS_RADIUS = 0.016
# Where it leaves him: at this height, found by a ray from inside him forwards, just off his middle so it never
# runs along the seam down it.
PENIS_ROOT = (0.0005, 0.0, 1.005)
# The sack's mouth, below the root on his skin, and its half width and height.
SCROTUM_MOUTH = (0.0005, 0.0, 0.982)
SCROTUM_MOUTH_SIZE = (0.017, 0.009)
# The skin they're found on.
PENIS_SKINS = ("T_skin", "T_smalls")


def add_penis(m, name, body_obj):
    """Lays the tube and the sack on the finished body, weighted like the skin where they leave it."""
    mesh = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    probe = SkinProbe(bm, mesh, m, (("penis", "T_penis"), ("glans", "T_glans"), ("scrotum", "T_scrotum")), PENIS_SKINS)
    forward = Vector((0.0, 1.0, 0.0))
    across = Vector((1.0, 0.0, 0.0))
    up = Vector((0.0, 0.0, 1.0))
    root = probe.ray(Vector(PENIS_ROOT), forward)
    if root is None:
        raise RuntimeError("add_penis: a ray from inside his groin met no skin")
    root = Vector((0.0, root.y, root.z))
    weights = probe.weights(root)

    def spoke(k):
        a = 2 * math.pi * k / PENIS_SPOKES
        return across * math.cos(a) + up * math.sin(a)

    rings = []
    for i in range(PENIS_TIP):
        s = PENIS_LENGTH * (i - 0.3) / PENIS_TIP
        rings.append([probe.vert(root + forward * s + spoke(k) * PENIS_RADIUS, weights) for k in range(PENIS_SPOKES)])
    tip = probe.vert(root + forward * PENIS_LENGTH, weights)
    uv = lambda i, k: (i / PENIS_TIP, k / PENIS_SPOKES)
    for i in range(PENIS_TIP):
        slot = "penis" if i < PENIS_LIP else "glans"
        for k in range(PENIS_SPOKES):
            k1 = (k + 1) % PENIS_SPOKES
            if i == PENIS_TIP - 1:
                verts, uvs = [rings[i][k], rings[i][k1], tip], [uv(i, k), uv(i, k + 1), uv(PENIS_TIP, k)]
                outwards = forward
            else:
                verts = [rings[i][k], rings[i + 1][k], rings[i + 1][k1], rings[i][k1]]
                uvs = [uv(i, k), uv(i + 1, k), uv(i + 1, k + 1), uv(i, k + 1)]
                outwards = spoke(k + 0.5)
            probe.face(verts, slot, uvs, outwards=outwards)

    # The sack: its mouth on his skin, looking in from in front of him, then hanging down to its bottom.
    centre = probe.ray(Vector(SCROTUM_MOUTH), forward)
    if centre is None:
        raise RuntimeError("add_penis: a ray from inside his groin met no skin below the root")
    centre = Vector((0.0, centre.y, centre.z))
    width, height = SCROTUM_MOUTH_SIZE
    mouth = []
    for k in range(PENIS_SPOKES):
        aimed = centre + across * math.cos(2 * math.pi * k / PENIS_SPOKES) * width + up * math.sin(2 * math.pi * k / PENIS_SPOKES) * height
        point = probe.ray(aimed + forward * 0.04, -forward, 0.08)
        if point is None:
            point = probe.nearest(aimed)
        mouth.append(probe.vert(point, probe.weights(point)))
    axis = lambda t: centre + forward * 0.02 - up * 0.065 * t
    sack = [mouth]
    for j in range(1, SCROTUM_RINGS):
        t = j / SCROTUM_RINGS
        r = 0.022 * math.sin(math.pi * (0.15 + 0.85 * t))
        ring = []
        for k in range(PENIS_SPOKES):
            a = 2 * math.pi * k / PENIS_SPOKES
            # Across him and, the sack hanging, out of him: the way up turns to the way out as it hangs.
            ring.append(probe.vert(axis(t) + (across * math.cos(a) + forward * math.sin(a)) * r, weights))
        sack.append(ring)
    bottom = probe.vert(axis(1.0), weights)
    suv = lambda j, k: (j / SCROTUM_RINGS, k / PENIS_SPOKES)
    for j in range(SCROTUM_RINGS):
        for k in range(PENIS_SPOKES):
            k1 = (k + 1) % PENIS_SPOKES
            if j == SCROTUM_RINGS - 1:
                verts, uvs = [sack[j][k], sack[j][k1], bottom], [suv(j, k), suv(j, k + 1), suv(SCROTUM_RINGS, k)]
            else:
                verts = [sack[j][k], sack[j + 1][k], sack[j + 1][k1], sack[j][k1]]
                uvs = [suv(j, k), suv(j + 1, k), suv(j + 1, k + 1), suv(j, k + 1)]
            # Facing out from the sack's middle line, as the game shapes it the same way round.
            face_centre = sum((v.co for v in verts), Vector()) / len(verts)
            probe.face(verts, "scrotum", uvs, outwards=face_centre - axis((j + 0.5) / SCROTUM_RINGS))
    print(f"add_penis: root at {tuple(round(c, 3) for c in root)}, sack's mouth at {tuple(round(c, 3) for c in centre)}")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- pubic hair

# The skin over her mound, copied a hair's breadth out into its own material. The game draws the hair's style on it
# as a cut-out (pubes.ts), so a heart or a strip keeps its shape whatever the mesh under it. Its UVs are a flat frame
# seen from the front, which the game's drawing uses as well: u across her from -PUBES_HALF to PUBES_HALF, v up her
# from PUBES_BOTTOM to PUBES_TOP. The faces are the skin's own, untouched, so the patch bends exactly as she does.
PUBES_HALF = 0.11
PUBES_BOTTOM = 0.68
PUBES_TOP = 0.96
# Over the skin by less than the coat (COAT_LIFT), and well inside the smallclothes, which hide it.
PUBES_LIFT = 0.0009


def add_pubes(m, name, body_obj):
    """Lays the patch on the finished body: every front face in the frame, copied out along the skin's normals."""
    mesh = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    deform = bm.verts.layers.deform.active
    uv = bm.loops.layers.uv.active
    if "T_pubic" not in [mat.name for mat in mesh.materials]:
        mesh.materials.append(m["pubic"])
    slot = [mat.name for mat in mesh.materials].index("T_pubic")
    faces = []
    for f in bm.faces:
        c = f.calc_center_median()
        if (f.normal.y > 0.25 and c.y > 0.02 and abs(c.x) < PUBES_HALF - 0.01
                and PUBES_BOTTOM + 0.01 < c.z < PUBES_TOP - 0.01):
            faces.append(f)
    copies = {}
    for f in faces:
        for v in f.verts:
            if v in copies:
                continue
            out = bm.verts.new(v.co + v.normal * PUBES_LIFT)
            for group, share in v[deform].items():
                out[deform][group] = share
            copies[v] = out
    for f in faces:
        new = bm.faces.new([copies[v] for v in f.verts])
        new.material_index = slot
        new.smooth = f.smooth
        for loop in new.loops:
            co = loop.vert.co
            loop[uv].uv = (0.5 + co.x / (2 * PUBES_HALF), (co.z - PUBES_BOTTOM) / (PUBES_TOP - PUBES_BOTTOM))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


# ---------------------------------------------------------------- underwear styles

# Her trunk's skin, from the tops of her thighs to her shoulders, copied a little way out into its own material. The
# game draws the underwear style she has on over it as a cut-out (lingerie.ts): bras, briefs and one-pieces, from a
# thong's string to a bodysuit, without a mesh of their own. Its UVs are two flat frames, the front seen from the
# front in the left half and the back seen from behind in the right: u across her from -LINGERIE_HALF to
# LINGERIE_HALF (her own x, as the front sees it), v up her from LINGERIE_BOTTOM to LINGERIE_TOP. Each face goes in
# the frame its middle faces. The faces are the skin's own, so the patch bends exactly as she does.
LINGERIE_HALF = 0.208
LINGERIE_BOTTOM = 0.6
LINGERIE_TOP = 1.4
# Over the pubic patch (PUBES_LIFT), under the coat (COAT_LIFT), so what lands on her lies over her underwear too.
LINGERIE_LIFT = 0.0012
# The skin materials it copies, and the bones whose skin it leaves out: her arms, hands and head.
LINGERIE_SKINS = ("T_skin_f", "T_bra", "T_smalls", "T_navel", "T_hole")
LINGERIE_SKIPS = ("UpperArm", "ForeArm", "Hand", "Head")


def add_lingerie(m, name, body_obj):
    """Lays the patch on the finished body: every trunk face in the frame, copied out along the skin's normals."""
    mesh = body_obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    deform = bm.verts.layers.deform.active
    uv = bm.loops.layers.uv.active
    names = [mat.name if mat else "" for mat in mesh.materials]
    if "T_lingerie" not in names:
        mesh.materials.append(m["lingerie"])
        names.append("T_lingerie")
    slot = names.index("T_lingerie")
    skins = {i for i, n in enumerate(names) if n in LINGERIE_SKINS}
    skipped = {g.index for g in body_obj.vertex_groups if any(f"{name}_{s}" in g.name for s in LINGERIE_SKIPS)}

    def limb(v):
        return sum(w for g, w in v[deform].items() if g in skipped) > 0.5

    faces = [f for f in bm.faces if f.material_index in skins
             and LINGERIE_BOTTOM < f.calc_center_median().z < LINGERIE_TOP and not any(limb(v) for v in f.verts)]
    copies = {}
    for f in faces:
        for v in f.verts:
            if v in copies:
                continue
            out = bm.verts.new(v.co + v.normal * LINGERIE_LIFT)
            for group, share in v[deform].items():
                out[deform][group] = share
            copies[v] = out
    for f in faces:
        back = f.calc_center_median().y < 0
        new = bm.faces.new([copies[v] for v in f.verts])
        new.material_index = slot
        new.smooth = f.smooth
        for loop in new.loops:
            co = loop.vert.co
            u = 0.5 + co.x / (2 * LINGERIE_HALF)
            loop[uv].uv = ((u + (1 if back else 0)) / 2, (co.z - LINGERIE_BOTTOM) / (LINGERIE_TOP - LINGERIE_BOTTOM))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def move_weight(obj, index, bone, share):
    """Hands this share of a vertex's weight to bone, taking it evenly from the bones it already has."""
    if share <= 0:
        return
    # Read the weights first: writing them while looping over the vertex's groups skips and repeats some.
    current = [(g.group, g.weight) for g in obj.data.vertices[index].groups]
    total = sum(w for _, w in current)
    target = obj.vertex_groups.get(bone) or obj.vertex_groups.new(name=bone)
    kept = 0.0
    for group, weight in current:
        if group == target.index:
            kept = weight
        else:
            obj.vertex_groups[group].add([index], weight * (1 - share), "REPLACE")
    target.add([index], kept + (total - kept) * share, "REPLACE")


def add_jiggle_weights(name, layers):
    for obj in layers:
        for v in obj.data.vertices:
            x, y, z = v.co
            for label, (_, centre, radii, most, side) in JIGGLE_REGIONS.items():
                # The bust eases off round her sides by itself (bust_weight's `front`).
                if side and side * y <= 0.02 and label not in BUST_WEIGHT:
                    continue
                centres, (rx, ry, rz) = JIGGLE_LOBES.get(label, ([centre], radii))
                if not side:
                    # All round: a cylinder up the limb, weighted by height alone.
                    cx, cy, cz = centre
                    d2 = ((z - cz) / rz) ** 2 if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1 else 1.0
                else:
                    d2 = min(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 for cx, cy, cz in centres)
                if label in BUST_WEIGHT:
                    share = bust_weight(x, y, z)
                    if share > 0:
                        move_weight(obj, v.index, f"{name}_{label}", share)
                    continue
                if d2 < 1:
                    # Full weight through the middle of the mass, fading smoothly to nothing at its edge.
                    t = 1 - math.sqrt(d2)
                    rise = JIGGLE_RISE.get(label, 1.6)
                    move_weight(obj, v.index, f"{name}_{label}", most * min(1.0, t * t * (3 - 2 * t) * rise))


def bust_weight(x, y, z, spec=None):
    """
    The bust's weight at a point: even over each breast, as BREAST_DOME lays it, so the game grows the whole breast
    alike and it keeps its round shape at any cup; easing out past its edge, and on to nothing towards the sides of
    the trunk. Weighted by distance from one middle point instead, the inner, lower side of each breast took a
    quarter of the front's weight, and a large cup grew round it, leaving it a flat diagonal under the cleavage.
    """
    spec = spec or BUST_WEIGHT["Bust"]
    dome = BREAST_DOME
    dx, dz = abs(x) - dome["x"], z - dome["z"]
    a = dx / (dome["inner"] * spec["cleavage"] if dx < 0 else dome["outer"] * spec["outside"])
    b = dz / (dome["up"] * spec["spread"] if dz > 0 else dome["down"] * spec["below"])
    reach = math.sqrt(a * a + b * b)
    if reach >= 1.0:
        return 0.0

    def ease(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)

    return spec["most"] * ease((1.0 - reach) / (1.0 - spec["full"])) * ease((y - spec["front"][0]) / (spec["front"][1] - spec["front"][0]))


# ---------------------------------------------------------------- the medieval outfit

MEDIEVAL_COLOURS = (("linen", (0.86, 0.8, 0.68)), ("bodice", (0.36, 0.08, 0.09)), ("skirt", (0.17, 0.24, 0.14)),
                    ("apron", (0.9, 0.87, 0.8)), ("hose", (0.2, 0.15, 0.13)), ("sole_dark", (0.16, 0.1, 0.07)),
                    ("smalls", (0.74, 0.68, 0.58)),
                    # The dirndl's arm ribbons and laces, and the priestess's set. Gems are shared.
                    ("ribbon", (0.12, 0.3, 0.17)), ("top", (0.62, 0.45, 0.16)), ("sheer", (0.93, 0.88, 0.72)),
                    ("girdle", (0.66, 0.48, 0.17)), ("drape", (0.92, 0.87, 0.74)), ("jewel", (0.8, 0.62, 0.22)),
                    ("gem", (0.15, 0.55, 0.75)),
                    # The rest of the legwear: the bands of the legs below the seat, the leg warmers and the garter belt.
                    ("hose_thigh", (0.2, 0.15, 0.13)), ("hose_over", (0.2, 0.15, 0.13)), ("hose_knee", (0.2, 0.15, 0.13)),
                    ("hose_calf", (0.2, 0.15, 0.13)), ("hose_shin", (0.2, 0.15, 0.13)), ("hose_low", (0.2, 0.15, 0.13)),
                    ("hose_ankle", (0.2, 0.15, 0.13)), ("warmer", (0.2, 0.15, 0.13)), ("garter", (0.2, 0.15, 0.13)),
                    # Her breast band, its own piece over the smallclothes' braies, in the same cloth. Last in the list,
                    # so the textures before it keep their grain.
                    ("bra", (0.74, 0.68, 0.58)),
                    # The top of her foot where a low-cut shoe shows it. The game paints it in her skin, or in her
                    # stockings where they reach the ankle. Last, likewise.
                    ("instep", (0.2, 0.15, 0.13)))
BODICE = (0.955, 1.17)  # bottom and top of the laced bodice
# A tavern wench's chemise: a wide neckline worn off the shoulders, sleeves pushed up to the elbow.
NECKLINE = (1.21, 1.25)  # where the chemise stops at the front and at the back
SLEEVE_END = 0.05  # below the elbow
SLEEVE_PUFF = 0.012
SKIRT_TOP, SKIRT_HEM, SKIRT_SIDES = 0.99, 0.2, 16
# The skirt's panels: how many round the body, where they hang from (just above the hip joints) and
# where each bends (about knee height). The skirt fades onto the panels between these heights.
SKIRT_PANELS, SKIRT_PIVOT, SKIRT_MID, SKIRT_KNEE = 12, 0.84, 0.66, 0.48
SKIRT_HANG = (0.9, 0.8)  # from the hips onto the panels
SKIRT_FOLD = (0.72, 0.6)  # from the upper panels onto their mid-thigh parts, which fold when she gathers it up
SKIRT_BEND = (0.56, 0.4)  # from those onto the lower ones


def profile_at(spec, z):
    """(half width, front, back) of the worn trunk at height z, held at the ends of the table."""
    table = spec.get("skin_profile") or [(z0, w + CLOTH_EASE, f + CLOTH_EASE, b + CLOTH_EASE) for z0, w, f, b in spec["bare_profile"]]
    if z <= table[0][0]:
        return table[0][1:]
    for (z0, *low), (z1, *high) in zip(table, table[1:]):
        if z <= z1:
            t = (z - z0) / (z1 - z0)
            return tuple(a + (b - a) * t for a, b in zip(low, high))
    return table[-1][1:]


def smallclothes(spec, skin):
    """
    Which faces of the bare body the smallclothes cover, painted on: braies from below the navel to the tops of the
    thighs, and for her a band over the bust, as two sets, so the band is its own piece that comes off by itself.
    """
    top, leg = spec["braies"]
    band = spec.get("breast_band")
    covered, banded = set(), set()
    for index, (f, _) in enumerate(skin.faces):
        weights = {}
        for i in f:
            for bone, w in skin.weights[i].items():
                weights[bone] = weights.get(bone, 0.0) + w
        bone = max(weights, key=weights.get)
        cz = sum(skin.points[i][2] for i in f) / len(f)
        if bone.startswith("Thigh") and cz > leg:
            covered.add(index)
        elif bone in ("Hips", "Torso") and cz < top:
            covered.add(index)
        elif band and bone in ("Hips", "Torso") and band[0] < cz < band[1]:
            banded.add(index)
    return covered, banded


def medieval_cloth(spec, m, skin):
    """The worn skin's faces the medieval outfit covers: chemise sleeves and yoke, bodice, and hose."""
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"]:
            continue
        weights = {}
        for i in f:
            for bone, w in skin.weights[i].items():
                weights[bone] = weights.get(bone, 0.0) + w
        bone = max(weights, key=weights.get)
        cy = sum(skin.points[i][1] for i in f) / len(f)
        cz = sum(skin.points[i][2] for i in f) / len(f)
        if bone.startswith("UpperArm"):
            faces.append((f, m["linen"]))
        elif bone.startswith("ForeArm"):
            if cz > spec["elbow_z"] - SLEEVE_END:
                faces.append((f, m["linen"]))
        elif bone.startswith(("Thigh", "Shin")):
            faces.append((f, legwear_band(m, bone, cz)))
        elif bone in ("Hips", "Torso"):
            if cz < BODICE[0]:
                faces.append((f, legwear_band(m, bone, cz)))  # under the skirt
            elif cz < BODICE[1]:
                faces.append((f, m["bodice"]))
            elif cz < (NECKLINE[0] if cy > 0 else NECKLINE[1]):
                faces.append((f, m["linen"]))
    return faces


# ---------------------------------------------------------------- her legwear
# Her stockings come in lengths, from tights to no-show socks. Every dress has them on the legs as bands, each its
# own material, and the game shows the bands the chosen style reaches (appearance.ts, LEGWEAR). From the top: the
# seat (hips and the tops of the thighs, for tights and leggings), then down the leg. A face goes in the first band
# whose cut its centre is above. The cuts fall between her leg's rings: the knee is at 0.47, the ankle at 0.1.
LEGWEAR_BANDS = (("hose", 0.7), ("hose_thigh", 0.582), ("hose_over", 0.484), ("hose_knee", 0.412), ("hose_calf", 0.34),
                 ("hose_shin", 0.264), ("hose_low", 0.189), ("hose_ankle", -1.0))
# Leg warmers: a thick tube bunched round the shin, from the ankle up to here, thickest at the bottom.
WARMER_TOP, WARMER_LIFT = 0.36, (0.011, 0.006)
# A garter belt low on the hips, below the priestess's girdle, with straps down the front, side and back of each
# thigh to the top of the stockings.
GARTER_BELT, GARTER_STRAP_END = (0.816, 0.848), 0.668
GARTER_STRAP_WIDTH, GARTER_LIFT, GARTER_THICKNESS = 0.016, 0.002, 0.0015  # lift: off the stockings


def legwear_band(m, bone, cz):
    """The legwear band a worn face of the hips or legs is in, by its height."""
    if bone in ("Hips", "Torso"):
        return m["hose"]
    return next(m[key] for key, cut in LEGWEAR_BANDS if cz > cut)


def is_legwear(bone, cz):
    """True for a worn face the legwear covers: the legs, and the hips under the bodice."""
    return bone.startswith(("Thigh", "Shin")) or (bone in ("Hips", "Torso") and cz < BODICE[0])


def hose_surface(dress, name):
    """
    A BVH of a finished dress's legwear bands, to lay the garter on, and the bone weights at any point on it
    (bone labels without the character's name, springs included).
    """
    bm = bmesh.new()
    bm.from_mesh(dress.data)
    hose = {i for i, mat in enumerate(dress.data.materials) if mat and mat.name.startswith("T_hose")}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index not in hose], context="FACES")
    bm.faces.ensure_lookup_table()
    deform = bm.verts.layers.deform.active
    groups = [g.name[len(name) + 1:] for g in dress.vertex_groups]
    tree = BVHTree.FromBMesh(bm)

    def weights(point, index):
        total, out = 0.0, {}
        for vert in bm.faces[index].verts:
            share = 1.0 / ((vert.co - point).length + 1e-4)
            total += share
            for group, w in vert[deform].items():
                out[groups[group]] = out.get(groups[group], 0.0) + w * share
        return {bone: w / total for bone, w in out.items() if w / total > 0.001}

    return tree, weights, bm


def lay_ribbon(extra, key, rows, mat, closed=False):
    """
    A thin closed ribbon lying on the skin: rows of (point, outwards, across, weights) along it, `across` its half
    width. The back face sits GARTER_THICKNESS in. A closed ribbon runs on from its last row back to its first.
    """
    for r, (co, out, across, weights) in enumerate(rows):
        for k, u in enumerate((-1, 1)):
            outer = co + across * u
            extra.add(f"{key}o{r}_{k}", 0, tuple(outer), weights)
            extra.add(f"{key}i{r}_{k}", 0, tuple(outer - out * GARTER_THICKNESS), weights)
    count = len(rows)
    for r in range(count if closed else count - 1):
        s = (r + 1) % count
        extra.face((f"{key}o{r}_0", f"{key}o{s}_0", f"{key}o{s}_1", f"{key}o{r}_1"), 0, mat)
        extra.face((f"{key}i{r}_1", f"{key}i{s}_1", f"{key}i{s}_0", f"{key}i{r}_0"), 0, mat)
        for k in (0, 1):
            extra.face((f"{key}o{r}_{k}", f"{key}i{r}_{k}", f"{key}i{s}_{k}", f"{key}o{s}_{k}")[:: 1 if k else -1], 0, mat)
    if not closed:
        for r in (0, count - 1):
            extra.face((f"{key}o{r}_0", f"{key}o{r}_1", f"{key}i{r}_1", f"{key}i{r}_0")[:: 1 if r else -1], 0, mat)


def build_garter(c, m, name, dress):
    """
    The garter belt round the hips and its six straps, laid just outside the dress's own stockings. Made on the
    finished dress, after the soft parts are refined and sprung, so it lies on the rear as the game shows it.
    """
    extra = Skin()
    tree, weights_at, bm = hose_surface(dress, name)

    def land(origin, direction):
        hit, normal, index, _ = tree.ray_cast(Vector(origin), Vector(direction).normalized())
        if hit is None:
            return None
        if normal.dot(Vector(direction)) > 0:
            normal = -normal
        return hit + normal * GARTER_LIFT, normal, weights_at(hit, index)

    # The belt: a closed ribbon round the hips, cast in from outside.
    sides = 24
    z = sum(GARTER_BELT) / 2
    half = Vector((0, 0, (GARTER_BELT[1] - GARTER_BELT[0]) / 2))
    rows = []
    for k in range(sides):
        a = 2 * math.pi * k / sides
        co, out, weights = land((math.cos(a) * 0.6, math.sin(a) * 0.6, z), (-math.cos(a), -math.sin(a), 0))
        rows.append((co, out, half, weights))
    lay_ribbon(extra, "belt", rows, m["garter"], closed=True)

    # The straps: from the belt down to just over the stocking tops, cast in from the front, the side and the back.
    steps = 8
    for sx in (-1, 1):
        for side, origin, direction in (("front", lambda z: (sx * 0.1, 0.6, z), (0, -1, 0)),
                                        ("side", lambda z: (sx * 0.6, -0.005, z), (-sx, 0, 0)),
                                        ("back", lambda z: (sx * 0.1, -0.6, z), (0, 1, 0))):
            rows = []
            for i in range(steps + 1):
                z = GARTER_BELT[0] + 0.004 - (GARTER_BELT[0] + 0.004 - GARTER_STRAP_END) * i / steps
                landed = land(origin(z), direction)
                if landed is None:
                    continue
                co, out, weights = landed
                across = out.cross(Vector((0, 0, 1)))
                across = across.normalized() * (GARTER_STRAP_WIDTH / 2) if across.length > 1e-4 else Vector((GARTER_STRAP_WIDTH / 2, 0, 0))
                rows.append((co, out, across, weights))
            if len(rows) > 1:
                lay_ribbon(extra, f"strap{side}{sx}", rows, m["garter"])
    bm.free()
    mesh, kept = extra.mesh(f"{name}_Garter", extra.faces)
    return extra.link(c, mesh, kept, name, f"{name}_Garter")


def build_warmers(c, m, name, skin, normals):
    """The leg warmers, as an object to join into a dress."""
    def bunched(index):
        normal = normals.get(index)
        if not normal:
            return skin.points[index]
        z = skin.points[index][2]
        t = min(1.0, max(0.0, (z - 0.1) / (WARMER_TOP - 0.1)))  # 0 at the ankle, 1 at the top
        lift = CLOTH_GAP + WARMER_LIFT[0] + (WARMER_LIFT[1] - WARMER_LIFT[0]) * t
        return tuple(a + b * lift for a, b in zip(skin.points[index], normal))

    warm = []
    for f, mat in skin.faces:
        bone, (_, _, cz) = face_bone(skin, f)
        if bone.startswith("Shin") and cz < WARMER_TOP and len(f) <= 4:
            warm.append((f, m["warmer"]))
    mesh, kept = skin.mesh(f"{name}_Warmers", warm, bunched)
    return skin.link(c, mesh, kept, name, f"{name}_Warmers")


def skirt_outline(spec, z):
    """(half width, front, back) of the long skirt: close at the waist, flaring from the hips to the hem."""
    if z >= 0.841:
        w, f, b = profile_at(spec, z)
        return w + 0.014, f + 0.02, b + 0.03
    w, f, b = profile_at(spec, 0.841)
    t = (0.841 - z) / (0.841 - SKIRT_HEM)
    return w + 0.014 + 0.1 * t, f + 0.02 + 0.14 * t, b + 0.03 + 0.1 * t


def skirt_point(spec, a, z):
    """The point of the skirt at angle a round the body (0 at the right side, a quarter turn at the front)."""
    w, f, b = skirt_outline(spec, z)
    return math.cos(a) * w, math.sin(a) * (f if math.sin(a) > 0 else b), z


def skirt_rim(spec, panel, z):
    return skirt_point(spec, 2 * math.pi * panel / SKIRT_PANELS, z)


def skirt_weights(a, z):
    """The skirt hangs from the hips, then from the two panels either side of it, bending at mid-thigh and the knee."""
    def ease(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)

    hang = ease((SKIRT_HANG[0] - z) / (SKIRT_HANG[0] - SKIRT_HANG[1]))
    fold = ease((SKIRT_FOLD[0] - z) / (SKIRT_FOLD[0] - SKIRT_FOLD[1]))
    bend = ease((SKIRT_BEND[0] - z) / (SKIRT_BEND[0] - SKIRT_BEND[1]))
    at = (a / (2 * math.pi) % 1) * SKIRT_PANELS
    first = int(at) % SKIRT_PANELS
    share = at - int(at)
    weights = {"Hips": 1 - hang}
    for panel, part in ((first, 1 - share), ((first + 1) % SKIRT_PANELS, share)):
        if part > 0:
            for bone, w in ((f"Skirt{panel}", 1 - fold), (f"SkirtMid{panel}", fold * (1 - bend)), (f"SkirtHem{panel}", fold * bend)):
                if w > 0:
                    weights[bone] = weights.get(bone, 0) + hang * w * part
    return {bone: w for bone, w in weights.items() if w > 0}


def build_skirt(spec, m):
    """Skirt, apron, waist belt and bodice laces, as one more skinned layer."""
    extra = Skin()
    sides = SKIRT_SIDES
    # Rows close together round the mid-thigh and knee joints, so the cloth folds cleanly there when gathered up.
    zs = [SKIRT_TOP, 0.94, 0.88, 0.82, 0.76, 0.7, 0.66, 0.62, 0.56, 0.5, 0.46, 0.42, 0.34, 0.26, SKIRT_HEM]
    for r, z in enumerate(zs):
        for k in range(sides):
            a = 2 * math.pi * k / sides
            extra.add(f"skirt{r}_{k}", 0, skirt_point(spec, a, z), skirt_weights(a, z))
    for r in range(len(zs) - 1):
        for k in range(sides):
            extra.face((f"skirt{r}_{k}", f"skirt{r + 1}_{k}", f"skirt{r + 1}_{(k + 1) % sides}", f"skirt{r}_{(k + 1) % sides}"),
                       0, m["skirt"])

    # The apron is the skirt's front panel moved out a little, with the very same weights, so the two
    # always bend together and the skirt never shows through.
    apron_rows = zs.index(0.46) + 1
    apron_columns = range(sides // 8, sides * 3 // 8 + 1)  # 45 to 135 degrees round the front
    for r in range(apron_rows):
        for k in apron_columns:
            x, y, z = extra.points[extra.at(f"skirt{r}_{k}", 0)]
            reach = 0.012 / math.hypot(x, y)
            extra.add(f"apron{r}_{k}", 0, (x * (1 + reach), y * (1 + reach), z), skirt_weights(2 * math.pi * k / sides, z))
    for r in range(apron_rows - 1):
        for k in list(apron_columns)[:-1]:
            extra.face((f"apron{r}_{k}", f"apron{r + 1}_{k}", f"apron{r + 1}_{k + 1}", f"apron{r}_{k + 1}"), 0, m["apron"])

    # A leather belt over the top of the skirt and apron.
    for r, z in enumerate((0.962, 1.0)):
        w, f, b = profile_at(spec, z)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            reach = 0.026
            x, y = math.cos(a) * (w + reach), math.sin(a) * ((f if math.sin(a) > 0 else b) + reach)
            extra.add(f"belt{r}_{k}", 0, (x, y, z), {"Hips": 1.0})
    for k in range(sides):
        extra.face((f"belt1_{k}", f"belt0_{k}", f"belt0_{(k + 1) % sides}", f"belt1_{(k + 1) % sides}"), 0, m["leather"])

    # Laces up the front of the bodice: a dark seam with short crossing ties.
    blend_start, blend_span = spec.get("trunk_blend", (0.985, 0.05))

    def trunk(z):
        t = min(1.0, max(0.0, (z - blend_start) / blend_span))
        return {"Hips": 1 - t, "Torso": t}

    def lace_box(key, cx, cz, half_w, half_h):
        y = profile_at(spec, cz)[1] + CLOTH_GAP + 0.004
        corners = [(-half_w, -half_h), (-half_w, half_h), (half_w, half_h), (half_w, -half_h)]  # facing forwards
        for i, (dx, dz) in enumerate(corners):
            extra.add(f"{key}_{i}", 0, (cx + dx, y, cz + dz), trunk(cz + dz))
        extra.face([f"{key}_{i}" for i in range(4)], 0, m["leather"])

    lace_box("seam", 0.0, 1.06, 0.004, 0.085)
    for i, z in enumerate((0.99, 1.025, 1.06, 1.095, 1.13)):
        lace_box(f"tie{i}", 0.0, z, 0.018, 0.0035)
    return extra


# ---------------------------------------------------------------- the other outfits
# Each is a mesh of its own, "<name>_Cloth<Outfit>", on the same bones as the tavern dress; the game shows one
# at a time. Garments that share a colour id with the tavern dress share its material name, so recolouring and
# the strip ladder treat them alike. Every outfit leaves the painted smallclothes as the last layer.

# A dirndl: puffed chemise sleeves tied with ribbons, a laced bodice, a knee-length skirt and a bowed apron.
DIRNDL_PUFF = 0.024  # how far the upper sleeves stand out
DIRNDL_RIBBON = (1.045, 1.075)  # the ribbon round each arm, just above the elbow
DIRNDL_SKIRT = [SKIRT_TOP, 0.94, 0.88, 0.82, 0.74, 0.66, 0.58, 0.52]  # hem just above the knee
DIRNDL_BOW = math.pi / 2 - 0.55  # the apron's bow, at the front a little to her right

# A priestess's set: a gold top over the bust, sheer sleeves with gold bands, a gold girdle low on the hips with
# long drapes hanging front and back, a choker and a band round one thigh.
PRIESTESS_TOP = (1.06, 1.215)  # covers the painted breast band (1.065 to 1.205) with room to spare
PRIESTESS_GIRDLE = (0.85, 0.925)
PRIESTESS_ARMLET = (1.19, 1.215)  # a band at the top of each sleeve
PRIESTESS_THIGH = (0.6, 0.65)
PRIESTESS_DRAPE = [0.88, 0.82, 0.7, 0.58, 0.46, 0.34, 0.24, 0.15]
PRIESTESS_DRAPE_WIDTH = 0.5  # radians either side of the front and the back


def face_bone(skin, f):
    """The bone a face mostly follows, and its centre."""
    weights = {}
    for i in f:
        for bone, w in skin.weights[i].items():
            weights[bone] = weights.get(bone, 0.0) + w
    bone = max(weights, key=weights.get)
    n = len(f)
    return bone, tuple(sum(skin.points[i][k] for i in f) / n for k in range(3))


def dirndl_cloth(spec, m, skin):
    """The worn skin's faces the dirndl covers: chemise sleeves and yoke with arm ribbons, and the bodice."""
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"]:
            continue
        bone, (_, cy, cz) = face_bone(skin, f)
        if bone.startswith(("UpperArm", "ForeArm")) and DIRNDL_RIBBON[0] < cz < DIRNDL_RIBBON[1]:
            faces.append((f, m["ribbon"]))
        elif bone.startswith("UpperArm"):
            faces.append((f, m["linen"]))
        elif bone.startswith("ForeArm"):
            if cz > spec["elbow_z"] - SLEEVE_END:
                faces.append((f, m["linen"]))
        elif bone in ("Hips", "Torso") and BODICE[0] <= cz:
            if cz < BODICE[1]:
                faces.append((f, m["bodice"]))
            elif cz < (NECKLINE[0] if cy > 0 else NECKLINE[1]):
                faces.append((f, m["linen"]))
        elif is_legwear(bone, cz):
            faces.append((f, legwear_band(m, bone, cz)))
    return faces


def priestess_cloth(spec, m, skin):
    """The worn skin's faces the priestess's set covers: the gold top, sleeves and their bands, girdle, thigh band."""
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"]:
            continue
        bone, (cx, _, cz) = face_bone(skin, f)
        if bone.startswith("UpperArm"):
            if PRIESTESS_ARMLET[0] <= cz < PRIESTESS_ARMLET[1]:
                faces.append((f, m["jewel"]))
            elif cz < PRIESTESS_ARMLET[0]:
                faces.append((f, m["sheer"]))
        elif bone.startswith("ForeArm"):
            faces.append((f, m["sheer"]))
        elif bone == "Thigh_R" and PRIESTESS_THIGH[0] < cz < PRIESTESS_THIGH[1]:
            faces.append((f, m["jewel"]))
        elif bone in ("Hips", "Torso") and PRIESTESS_TOP[0] <= cz < PRIESTESS_TOP[1]:
            faces.append((f, m["top"]))
        elif bone in ("Hips", "Torso") and PRIESTESS_GIRDLE[0] <= cz < PRIESTESS_GIRDLE[1]:
            faces.append((f, m["girdle"]))
        elif is_legwear(bone, cz):
            faces.append((f, legwear_band(m, bone, cz)))
    return faces


def add_slab(extra, key, corners, depth, weights, mat):
    """A thin closed plate from four corners, `depth` thick towards (dx, dy, dz), so it shows from both sides."""
    dx, dy, dz = depth
    for i, co in enumerate(corners):
        extra.add(f"{key}_o{i}", 0, co, weights(co))
        back = (co[0] - dx, co[1] - dy, co[2] - dz)
        extra.add(f"{key}_i{i}", 0, back, weights(back))
    o = [f"{key}_o{i}" for i in range(4)]
    b = [f"{key}_i{i}" for i in range(4)]
    extra.face(o, 0, mat)
    extra.face(list(reversed(b)), 0, mat)
    for i in range(4):
        j = (i + 1) % 4
        extra.face((o[j], o[i], b[i], b[j]), 0, mat)


def add_sheet(extra, key, point, rows, columns, mat, thickness=0.005):
    """A closed hanging sheet over a grid: point(r, k) gives (co, weights); the back face sits `thickness` in."""
    for r in range(rows):
        for k in range(columns):
            co, weights = point(r, k)
            x, y, z = co
            inwards = thickness / max(1e-6, math.hypot(x, y))
            extra.add(f"{key}o{r}_{k}", 0, co, weights)
            extra.add(f"{key}i{r}_{k}", 0, (x * (1 - inwards), y * (1 - inwards), z), weights)
    for r in range(rows - 1):
        for k in range(columns - 1):
            extra.face((f"{key}o{r}_{k}", f"{key}o{r + 1}_{k}", f"{key}o{r + 1}_{k + 1}", f"{key}o{r}_{k + 1}"), 0, mat)
            extra.face((f"{key}i{r}_{k + 1}", f"{key}i{r + 1}_{k + 1}", f"{key}i{r + 1}_{k}", f"{key}i{r}_{k}"), 0, mat)
    edges = ([(r, 0) for r in range(rows)], [(r, columns - 1) for r in range(rows)],
             [(0, k) for k in range(columns)], [(rows - 1, k) for k in range(columns)])
    for edge in edges:
        for (r0, k0), (r1, k1) in zip(edge, edge[1:]):
            extra.face((f"{key}o{r0}_{k0}", f"{key}o{r1}_{k1}", f"{key}i{r1}_{k1}", f"{key}i{r0}_{k0}"), 0, mat)


def waist_band(extra, spec, key, zs, reach, mat, sides=SKIRT_SIDES):
    """A band round the waist between two heights, standing `reach` out from the worn trunk."""
    for r, z in enumerate(zs):
        w, f, b = profile_at(spec, z)
        for k in range(sides):
            a = 2 * math.pi * k / sides
            x, y = math.cos(a) * (w + reach), math.sin(a) * ((f if math.sin(a) > 0 else b) + reach)
            extra.add(f"{key}{r}_{k}", 0, (x, y, z), {"Hips": 1.0})
    for k in range(sides):
        extra.face((f"{key}1_{k}", f"{key}0_{k}", f"{key}0_{(k + 1) % sides}", f"{key}1_{(k + 1) % sides}"), 0, mat)


def neck_band(extra, spec, key, zs, gap, mat, sides=10):
    """A choker round the neck between two heights, on the head bone that carries the neck."""
    table = spec["neck"]

    def at(z):
        for (z0, *low), (z1, *high) in zip(table, table[1:]):
            if z <= z1:
                t = max(0.0, (z - z0) / (z1 - z0))
                return [a + (b - a) * t for a, b in zip(low, high)]
        return list(table[-1][1:])

    for r, z in enumerate(zs):
        w, f, b, cy = at(z)[:4]
        for k, (x, y, _) in enumerate(ring(z, w + gap, f + gap, b + gap, cy, n=sides)):
            extra.add(f"{key}{r}_{k}", 0, (x, y, z), {"Head": 1.0})
    for k in range(sides):
        extra.face((f"{key}1_{k}", f"{key}0_{k}", f"{key}0_{(k + 1) % sides}", f"{key}1_{(k + 1) % sides}"), 0, mat)
    return at


def facing(extra, key, centre, size, out, weights, mat, depth=0.004):
    """A small plate facing outwards along `out` (x, y), such as a gem or a knot."""
    ox, oy = out
    tx, ty = -oy, ox
    cx, cy, cz = centre
    hw, hh = size
    corners = [(cx + tx * u, cy + ty * u, cz + v) for u, v in ((-hw, -hh), (hw, -hh), (hw, hh), (-hw, hh))]
    add_slab(extra, key, corners, (ox * depth, oy * depth, 0.0), weights, mat)


def build_dirndl_extra(spec, m):
    """The dirndl's skirt, apron with its waistband and bow, the bodice laces and a gem on the necklace."""
    extra = Skin()
    sides = SKIRT_SIDES
    zs = DIRNDL_SKIRT
    for r, z in enumerate(zs):
        for k in range(sides):
            a = 2 * math.pi * k / sides
            x, y, _ = skirt_point(spec, a, z)
            full = 1.0 + 0.12 * (r / (len(zs) - 1))  # fuller towards the hem than the long skirt
            extra.add(f"skirt{r}_{k}", 0, (x * full, y * full, z), skirt_weights(a, z))
    for r in range(len(zs) - 1):
        for k in range(sides):
            extra.face((f"skirt{r}_{k}", f"skirt{r + 1}_{k}", f"skirt{r + 1}_{(k + 1) % sides}", f"skirt{r}_{(k + 1) % sides}"),
                       0, m["skirt"])

    # The apron covers most of the front, nearly to the hem, moved out a little with the skirt's own weights.
    apron_rows = len(zs) - 1
    apron_columns = range(sides // 8, sides * 3 // 8 + 1)
    for r in range(apron_rows):
        for k in apron_columns:
            x, y, z = extra.points[extra.at(f"skirt{r}_{k}", 0)]
            reach = 0.012 / math.hypot(x, y)
            extra.add(f"apron{r}_{k}", 0, (x * (1 + reach), y * (1 + reach), z), skirt_weights(2 * math.pi * k / sides, z))
    for r in range(apron_rows - 1):
        for k in list(apron_columns)[:-1]:
            extra.face((f"apron{r}_{k}", f"apron{r + 1}_{k}", f"apron{r + 1}_{k + 1}", f"apron{r}_{k + 1}"), 0, m["apron"])
    waist_band(extra, spec, "band", (0.962, 0.992), 0.024, m["apron"])

    # The bow: two loops and a knot on the waistband, and two tails hanging down over the skirt.
    a = DIRNDL_BOW
    w, f, _ = profile_at(spec, 0.977)
    out = (math.cos(a), math.sin(a))
    bx, by = math.cos(a) * (w + 0.03), math.sin(a) * (f + 0.03)
    tx, ty = -out[1], out[0]
    hips = lambda co: {"Hips": 1.0}
    for i, sx in enumerate((-1, 1)):
        inner, outer = sx * 0.008, sx * 0.05
        along = lambda u, z: (bx + tx * u, by + ty * u, z)
        corners = [along(outer, 0.951), along(inner, 0.971), along(inner, 0.983), along(outer, 1.003)]
        add_slab(extra, f"loop{i}", corners, (out[0] * 0.006, out[1] * 0.006, 0.0), hips, m["apron"])
    facing(extra, "knot", (bx + out[0] * 0.003, by + out[1] * 0.003, 0.977), (0.01, 0.012), out, hips, m["apron"])
    for i, (top, bottom, drop) in enumerate(((-0.006, -0.024, 0.2), (0.006, 0.02, 0.17))):
        z1 = 0.965 - drop
        hang = lambda co: skirt_weights(a, co[2])
        corners = [(bx + tx * (top - 0.008), by + ty * (top - 0.008), 0.968), (bx + tx * (top + 0.008), by + ty * (top + 0.008), 0.968),
                   (bx + tx * (bottom + 0.01) + out[0] * 0.012, by + ty * (bottom + 0.01) + out[1] * 0.012, z1),
                   (bx + tx * (bottom - 0.01) + out[0] * 0.012, by + ty * (bottom - 0.01) + out[1] * 0.012, z1)]
        add_slab(extra, f"tail{i}", corners, (out[0] * 0.004, out[1] * 0.004, 0.0), hang, m["apron"])

    # Laces up the front of the bodice, in the ribbons' colour.
    blend_start, blend_span = spec.get("trunk_blend", (0.985, 0.05))

    def trunk(co):
        t = min(1.0, max(0.0, (co[2] - blend_start) / blend_span))
        return {"Hips": 1 - t, "Torso": t}

    for i, z in enumerate((1.0, 1.035, 1.07, 1.105)):
        y = profile_at(spec, z)[1] + CLOTH_GAP + 0.004
        for j, sx in enumerate((-1, 1)):
            corners = [(sx * 0.022, y, z - 0.004), (sx * 0.022, y, z + 0.002), (-sx * 0.022, y, z + 0.022), (-sx * 0.022, y, z + 0.016)]
            add_slab(extra, f"lace{i}_{j}", corners, (0.0, 0.003, 0.0), trunk, m["ribbon"])

    # The green gem on her necklace's pendant is set into the necklace itself (build_necklace).
    return extra


def build_priestess_extra(spec, m):
    """The priestess's drapes front and back, the choker and the gems on it and on the girdle."""
    extra = Skin()
    zs = PRIESTESS_DRAPE
    columns = 6
    for key, middle in (("front", math.pi / 2), ("back", -math.pi / 2)):
        def point(r, k, middle=middle):
            a = middle - PRIESTESS_DRAPE_WIDTH + 2 * PRIESTESS_DRAPE_WIDTH * k / (columns - 1)
            x, y, z = skirt_point(spec, a, zs[r])
            return (x * 1.02, y * 1.02, z), skirt_weights(a % (2 * math.pi), zs[r])
        add_sheet(extra, key, point, len(zs), columns, m["drape"])

    at = neck_band(extra, spec, "choker", (1.343, 1.362), 0.006, m["jewel"])
    w, f, b, cy = at(1.35)[:4]
    facing(extra, "chokergem", (0.0, cy + f + 0.012, 1.346), (0.009, 0.011), (0.0, 1.0), lambda co: {"Head": 1.0}, m["gem"])
    gz = sum(PRIESTESS_GIRDLE) / 2
    facing(extra, "girdlegem", (0.0, profile_at(spec, gz)[1] + 0.024, gz - 0.006), (0.012, 0.014), (0.0, 1.0),
           lambda co: {"Hips": 1.0}, m["gem"])
    return extra


# ---------------------------------------------------------------- the pirate's rig
# For both bodies: a loose shirt with full sleeves, breeches tucked into tall bucket-topped boots, a sash round the
# waist knotted at the left hip with its ends hanging, and a cocked hat trimmed with braid. He wears a waistcoat
# over the shirt, open at the neck; she wears a corset under the bust, a belt slung low on the hips and a feather
# in her hat. For now only guests wear it.
PIRATE_COLOURS = (("waistcoat", (0.14, 0.18, 0.3)), ("sash", (0.55, 0.1, 0.1)), ("breeches", (0.24, 0.18, 0.13)),
                  ("boot", (0.12, 0.085, 0.065)), ("hat", (0.09, 0.08, 0.08)), ("braid", (0.78, 0.6, 0.22)),
                  ("plume", (0.92, 0.9, 0.86)))
PIRATE_BOOT = 0.07  # how far above the knee the boots reach
PIRATE_BUCKET = (0.035, 0.03)  # the boot tops: how far below and above the top of the leg they reach
PIRATE_CORSET = (0.93, 1.16)  # her corset, from the sash up to under the bust
PIRATE_SASH = {"Female": (0.912, 0.962), "Male": (1.068, 1.13)}
PIRATE_BELT = (0.855, 0.878)  # her belt, low on the hips below the sash
PIRATE_KNOT = math.pi - 0.5  # where the sash is knotted: the left hip, a little to the front
HAT_SIDES = 18


def face_leans(skin, f, prefix):
    """True if the face's corners are, on average, at least 40% weighted to bones whose names start with prefix."""
    share = sum(w for i in f for bone, w in skin.weights[i].items() if bone.startswith(prefix))
    return share >= 0.4 * len(f)


def pirate_cloth(spec, m, skin):
    """
    The worn skin's faces a pirate's rig covers: the shirt, his waistcoat or her corset, a sash on his belt line,
    breeches and boots. Faces with more than four corners close the wrists, ankles and collar, and are left out.
    """
    male = spec.get("plated", False)
    boot_top = spec["knee_z"] + PIRATE_BOOT
    tee, belt = m[spec["tunic"]], m[spec["belt"]]
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, cy, cz) = face_bone(skin, f)
        if bone.startswith(("UpperArm", "ForeArm")):
            faces.append((f, m["linen"]))
        elif bone.startswith(("Thigh", "Shin")):
            faces.append((f, m["boot"] if cz < boot_top else m["breeches"]))
        elif bone not in ("Hips", "Torso"):
            continue
        elif face_leans(skin, f, "UpperArm"):
            faces.append((f, m["linen"]))  # the shirt shows at the shoulders
        elif male:
            if mat is belt:
                faces.append((f, m["sash"]))
            elif mat is not tee:
                faces.append((f, m["breeches"]))
            elif cy > 0 and cz > 1.49 and abs(cx) < 0.05:
                continue  # the shirt hangs open at the neck
            elif cy > 0 and cz > 1.3 and abs(cx) < 0.02 + 0.3 * (cz - 1.3):
                faces.append((f, m["linen"]))  # the waistcoat opens over the shirt
            else:
                faces.append((f, m["waistcoat"]))
        elif cz < PIRATE_CORSET[0]:
            faces.append((f, m["breeches"]))
        elif cz < PIRATE_CORSET[1]:
            faces.append((f, m["bodice"]))
        elif cy > 0 and cz > 1.2 and abs(cx) < 0.012 + 0.5 * (cz - 1.2):
            continue  # a deep V at the neck
        else:
            faces.append((f, m["linen"]))
    return faces


def pirate_lift(spec):
    """How far each part of the rig stands out from the worn skin: billowing sleeves, boots wider than the leg."""
    boot_top = spec["knee_z"] + PIRATE_BOOT
    wrist = spec["wrist_z"] + 0.035
    # Her shoulders are as broad as her worn skin there, so the shirt stands further off them.
    shoulders = None if spec.get("plated") else spec["shoulder"][1] - 0.1

    def lift(bone, z):
        if bone.startswith("UpperArm"):
            return 0.036 if shoulders and z > shoulders - 0.02 else 0.018
        if bone.startswith("ForeArm"):
            return 0.008 if z < wrist else 0.016  # gathered at the cuff
        if bone.startswith(("Thigh", "Shin")):
            return 0.011 if z < boot_top else 0.005
        if shoulders and z > shoulders:
            return 0.024
        return 0.004
    return lift


def leg_ring(spec, z, grow, sx):
    """Six points round one leg at height z, laid out as the skin's leg loops are, grown out by `grow`."""
    rows = spec["skin_leg"]  # from the top of the thigh down
    w, f, b = rows[0][1:] if z > rows[0][0] else rows[-1][1:]
    for (z0, *low), (z1, *high) in zip(rows, rows[1:]):
        if z1 <= z <= z0:
            t = (z0 - z) / (z0 - z1)
            w, f, b = (a + (c - a) * t for a, c in zip(low, high))
            break
    hip_z = spec["hips_z"] - 0.06
    leg_x = spec["hip_x"] + (hip_z - max(z, spec["knee_z"])) * math.sin(spec["leg_splay"])
    points = []
    for out, front in ((1.0, None), (LEG_FRONT_OUT, True), (LEG_FRONT_IN, True), (-1.0, None),
                       (LEG_BACK_IN, False), (LEG_BACK_OUT, False)):
        if front is None:
            y = (f - b) / 2
        else:
            c = abs(out) ** 1.25
            y = (f + grow if front else -(b + grow)) * (1 - c * c) ** 0.4
        points.append((sx * (leg_x + out * (w + grow)), y, z))
    return points


def leg_weights(spec, z, side):
    bend = min(1.0, max(0.0, 0.5 - (z - spec["knee_z"]) / 0.09))
    weights = {f"Thigh_{side}": 1 - bend, f"Shin_{side}": bend}
    return {bone: w for bone, w in weights.items() if w > 0}


def add_band(extra, key, rings, weights, mat):
    """A closed band from rings of points: outside bottom, outside top, inside top, inside bottom."""
    for r, ring_points in enumerate(rings):
        for k, co in enumerate(ring_points):
            extra.add(f"{key}{r}_{k}", 0, co, weights(co))
    n = len(rings[0])
    for r in range(len(rings)):
        r1 = (r + 1) % len(rings)
        for k in range(n):
            k1 = (k + 1) % n
            extra.face((f"{key}{r}_{k}", f"{key}{r}_{k1}", f"{key}{r1}_{k1}", f"{key}{r1}_{k}"), 0, mat)


def hat_fit(spec, objects):
    """(crown height, centre y, half width, front, back, top) of an ellipse round the head and hair above the brow."""
    base = spec["hat_z"]
    points = [v.co for obj in objects for v in obj.data.vertices if v.co.z >= base - 0.005]
    cy = (max(p.y for p in points) + min(p.y for p in points)) / 2
    rx = max(abs(p.x) for p in points)
    rf = max(p.y - cy for p in points)
    rb = max(cy - p.y for p in points)
    # Grown until every point is inside it, then given a little room.
    scale = max(math.hypot(p.x / rx, (p.y - cy) / (rf if p.y > cy else rb)) for p in points)
    room = 0.008
    return base, cy, rx * scale + room, rf * scale + room, rb * scale + room, max(p.z for p in points) + 0.012


def add_ribbon(extra, key, stations, across, mat, thickness=0.004):
    """A thin closed strip through (centre, half width) stations, as wide as across(tangent) says, thick along x."""
    for i, (centre, half) in enumerate(stations):
        before = stations[max(0, i - 1)][0]
        after = stations[min(len(stations) - 1, i + 1)][0]
        direction = across([b - a for a, b in zip(before, after)])
        for j, sign in enumerate((-1, 1)):
            co = tuple(c + sign * half * u for c, u in zip(centre, direction))
            extra.add(f"{key}o{i}_{j}", 0, co, {"Head": 1.0})
            extra.add(f"{key}i{i}_{j}", 0, (co[0] + thickness, co[1], co[2]), {"Head": 1.0})
    for i in range(len(stations) - 1):
        o0, o1, i0, i1 = f"{key}o{i}_", f"{key}o{i + 1}_", f"{key}i{i}_", f"{key}i{i + 1}_"
        extra.face((o0 + "0", o1 + "0", o1 + "1", o0 + "1"), 0, mat)
        extra.face((i0 + "1", i1 + "1", i1 + "0", i0 + "0"), 0, mat)
        extra.face((o0 + "1", o1 + "1", i1 + "1", i0 + "1"), 0, mat)
        extra.face((i0 + "0", i1 + "0", o1 + "0", o0 + "0"), 0, mat)


def build_hat(extra, fit, m, feather):
    """A cocked hat: a round crown over the hair, and a brim turned up on three sides into points front and back."""
    base, cy, rx, rf, rb, top = fit
    n = HAT_SIDES

    def at(a, grow, z):
        return math.cos(a) * (rx + grow), cy + math.sin(a) * ((rf if math.sin(a) > 0 else rb) + grow), z

    angles = [2 * math.pi * k / n for k in range(n)]
    height = top - base
    rings = [(0.0, base), (0.003, base + 0.55 * height), (-0.022, top)]
    for r, (grow, z) in enumerate(rings):
        for k, a in enumerate(angles):
            extra.add(f"crown{r}_{k}", 0, at(a, grow, z), {"Head": 1.0})
    extra.add("crowntop", 0, (0.0, cy, top + 0.008), {"Head": 1.0})
    for r in range(len(rings) - 1):
        for k in range(n):
            k1 = (k + 1) % n
            extra.face((f"crown{r + 1}_{k}", f"crown{r}_{k}", f"crown{r}_{k1}", f"crown{r + 1}_{k1}"), 0, m["hat"])
    last = len(rings) - 1
    for k in range(n):
        extra.face((f"crown{last}_{k}", f"crown{last}_{(k + 1) % n}", "crowntop"), 0, m["hat"])

    # The brim's cross-section at each angle, as (out, up) from the foot of the crown. One point faces forwards.
    wide = 0.034
    turn = 0.62 * height
    mats = [m["hat"], m["braid"], m["braid"], m["hat"], m["hat"]]
    for k, a in enumerate(angles):
        corner = ((1 + math.cos(3 * (a - math.pi / 2))) / 2) ** 1.5
        width, up = wide + 0.04 * corner, turn * (1 - corner) - 0.008 * corner
        length = math.hypot(width, up)
        nx, nz = -up / length * 0.005, width / length * 0.005  # the brim's thickness, square to its slope
        section = [(0.0, 0.0), (0.8 * width, 0.8 * up), (width, up), (width + nx, up - nz), (nx, -nz)]
        for p, (out, rise) in enumerate(section):
            extra.add(f"brim{p}_{k}", 0, at(a, out, base + rise), {"Head": 1.0})
    for p in range(len(mats)):
        p1 = (p + 1) % len(mats)
        for k in range(n):
            k1 = (k + 1) % n
            extra.face((f"brim{p}_{k}", f"brim{p1}_{k}", f"brim{p1}_{k1}", f"brim{p}_{k1}"), 0, mats[p])

    if feather:
        # Tucked in at the left of the crown, sweeping up and back over the brim.
        x0, y0, z0 = at(math.pi + 0.45, 0.004, base + 0.03)
        path = [((0.0, 0.0, 0.0), 0.006), ((-0.014, -0.025, 0.05), 0.02), ((-0.016, -0.07, 0.09), 0.028),
                ((-0.008, -0.13, 0.105), 0.024), ((0.004, -0.185, 0.085), 0.012), ((0.012, -0.21, 0.06), 0.003)]

        def across(tangent):
            _, ty, tz = tangent
            # Square to the path in the y-z plane, so the feather lies flat along the side of the crown.
            length = math.hypot(ty, tz) or 1.0
            return 0.0, -tz / length, ty / length

        add_ribbon(extra, "plume", [((x0 + dx, y0 + dy, z0 + dz), half) for (dx, dy, dz), half in path], across, m["plume"])


def build_pirate_extra(spec, m, fit):
    """The sash with its knot and hanging ends, her belt and corset laces, the boot tops and the hat."""
    extra = Skin()
    female = not spec.get("plated", False)
    sash = PIRATE_SASH[spec["name"]]
    hips = lambda co: {"Hips": 1.0}
    if female:
        waist_band(extra, spec, "sash", sash, 0.018, m["sash"])
        waist_band(extra, spec, "belt", PIRATE_BELT, 0.012, m["leather"])
        # Laces up the front of the corset.
        blend_start, blend_span = spec.get("trunk_blend", (0.985, 0.05))

        def trunk(co):
            t = min(1.0, max(0.0, (co[2] - blend_start) / blend_span))
            return {"Hips": 1 - t, "Torso": t}

        for i, z in enumerate((0.985, 1.02, 1.055, 1.09, 1.125)):
            y = profile_at(spec, z)[1] + CLOTH_GAP + 0.006
            for j, sx in enumerate((-1, 1)):
                corners = [(sx * 0.02, y, z - 0.004), (sx * 0.02, y, z + 0.002), (-sx * 0.02, y, z + 0.02), (-sx * 0.02, y, z + 0.014)]
                add_slab(extra, f"lace{i}_{j}", corners, (0.0, 0.003, 0.0), trunk, m["leather"])

    # The knot at the left hip, and the two ends hanging from it, following the left thigh lower down.
    a = PIRATE_KNOT
    mid = sum(sash) / 2
    w, f, _ = profile_at(spec, mid)
    reach = 0.028 if female else 0.034
    out = (math.cos(a), math.sin(a))
    kx, ky = math.cos(a) * (w + reach), math.sin(a) * (f + reach)
    tx, ty = -out[1], out[0]
    facing(extra, "knot", (kx, ky, mid), (0.022, 0.026), out, hips, m["sash"], depth=0.012)
    drop = 0.24 if female else 0.27

    def hang(co):
        t = min(1.0, max(0.0, (sash[0] - co[2]) / drop)) * 0.7
        return {"Hips": 1 - t, "Thigh_L": t} if t > 0 else {"Hips": 1.0}

    flare = 0.022  # the ends hang a little away from the thigh
    for i, (side, length, splay) in enumerate(((-1, 1.0, -0.012), (1, 0.82, 0.016))):
        z1 = mid - drop * length
        along = lambda u, z, away=0.0: (kx + tx * u + out[0] * away, ky + ty * u + out[1] * away, z)
        corners = [along(side * 0.008 - 0.02, mid - 0.01), along(side * 0.008 + 0.02, mid - 0.01),
                   along(side * 0.016 + splay + 0.026, z1, flare), along(side * 0.016 + splay - 0.026, z1, flare)]
        add_slab(extra, f"end{i}", corners, (out[0] * 0.005, out[1] * 0.005, 0.0), hang, m["sash"])

    # Bucket tops on the boots, flaring out over the top of the leg.
    boot_top = spec["knee_z"] + PIRATE_BOOT
    below, above = PIRATE_BUCKET
    for side, sx in (("L", -1), ("R", 1)):
        z0, z1 = boot_top - below, boot_top + above
        flare = 0.03 if spec.get("plated") else 0.024
        rings = [leg_ring(spec, z0, 0.015, sx), leg_ring(spec, z1, flare, sx),
                 leg_ring(spec, z1, flare - 0.005, sx), leg_ring(spec, z0, 0.011, sx)]
        add_band(extra, f"bucket{side}", rings, lambda co, side=side: leg_weights(spec, co[2], side), m["boot"])

    build_hat(extra, fit, m, feather=female)
    return extra


# ---------------------------------------------------------------- the adventurer's kit and the noble's clothes
# The two guest factions that come once her name starts to travel (STORY.md, section 5). Both bodies have both, and
# for now only guests wear them, like the pirate's rig.
#
# The adventurers come as a party, each in the kit of their calling:
#   the archer: a leather jerkin over a linen shirt with its sleeves pushed up, leather bracers, breeches tucked into
#     knee boots with turned-down tops, a belt with a pouch, a hooded mantle, and a quiver of arrows on the back on a
#     strap across the chest;
#   the warrior, the party's shield: mail from neck to knee, a tabard over it, plate on the shoulders, forearms and
#     shins, a round shield on the back and a sword at the left hip;
#   the mage: a robe with wide bell sleeves, a sash, an amulet, a tall pointed hat and a staff across the back;
#   the cleric, the healer: a robe under a tabard with a sun on the chest, a hood worn down, and a mace at the hip.
# Her robes are long skirts on her skirt panels; his hang front and back from the waist, following both legs.
# The noble: he wears a velvet doublet with a short flared skirt edged in gold braid, puffed sleeves, a linen ruff
# and cuffs, breeches and tall boots, a gold chain of office, a short cape over his left shoulder and a flat cap
# with a feather. She wears a velvet gown with a square neckline edged in braid, long sleeves ending in linen
# ruffles and a skirt to the floor, a gold girdle with a chain hanging from it, and a circlet.
GUEST_COLOURS = (("jerkin", (0.42, 0.28, 0.16)), ("bracer", (0.2, 0.12, 0.07)), ("cloak", (0.2, 0.26, 0.17)),
                 ("doublet", (0.3, 0.06, 0.12)),
                 # The adventuring party's: the warrior's mail, plate and tabard, and the mage's and cleric's robes.
                 ("mail", (0.4, 0.41, 0.43)), ("plate", (0.6, 0.61, 0.64)), ("tabard", (0.17, 0.23, 0.42)),
                 ("robe", (0.27, 0.15, 0.37)))
ADVENTURER_BOOT = -0.04  # the boots reach just below the knee
ADVENTURER_CUFF = (0.012, 0.04)  # the boots' turned-down tops: how far below and above the top of the leg
ADVENTURER_BELT = {"Female": (0.872, 0.9), "Male": (1.075, 1.108)}
ADVENTURER_JERKIN = 1.24  # her jerkin's top at the front, over the painted breast band (to 1.205)
ADVENTURER_BRACER = 0.07  # how far the bracers stop below the elbow
NOBLE_BOOT = 0.06  # his boots reach above the knee
NOBLE_NECKLINE = (1.225, 1.27)  # her gown's square neckline, at the front and at the back
NOBLE_SQUARE = 0.085  # how wide the neckline is either side of the middle
NOBLE_SKIRT = [SKIRT_TOP, 0.94, 0.88, 0.8, 0.7, 0.58, 0.46, 0.34, 0.22, 0.1]  # down to the floor
NOBLE_GIRDLE = (0.958, 0.982)
NOBLE_PEPLUM = (1.11, 0.99)  # his doublet's skirt, from the belt line down over the hips


def shell(extra, key, skin, normals, faces, lift, mat):
    """
    A layer over these worn skin faces, `lift(index)` further out than the clothes, with the skin's own weights, so
    it bends exactly as the clothes under it do. For pieces worn over the rest: a mantle, a cape, a strap, a chain.
    """
    for f in faces:
        for i in f:
            if not extra.has(f"{key}{i}", 0):
                normal = normals.get(i) or (0.0, 0.0, 0.0)
                co = tuple(a + b * (CLOTH_GAP + lift(i)) for a, b in zip(skin.points[i], normal))
                extra.add(f"{key}{i}", 0, co, dict(skin.weights[i]))
        extra.face([f"{key}{i}" for i in f], 0, mat)


class ClothSurface:
    """
    An outfit's trunk as worn, to lay thin pieces on: straps, braid, a chain. A point is found by casting at the
    trunk from in front or behind, and takes the weights of the corners round it.
    """

    def __init__(self, skin, faces, place):
        trunk = [f for f, _ in faces if face_bone(skin, f)[0] in ("Hips", "Torso")]
        self.kept = sorted({i for f in trunk for i in f})
        renumbered = {old: new for new, old in enumerate(self.kept)}
        self.points = [Vector(place(i)) for i in self.kept]
        self.polys = [[renumbered[i] for i in f] for f in trunk]
        self.skin = skin
        self.tree = BVHTree.FromPolygons(self.points, self.polys)

    def hit(self, x, z, front=True):
        """(point, outward normal, weights) where the trunk is at (x, z), on its front or its back."""
        sign = 1.0 if front else -1.0
        loc, normal, index, _ = self.tree.ray_cast(Vector((x, sign * 1.0, z)), Vector((0.0, -sign, 0.0)))
        if loc is None:
            return None
        if normal.y * sign < 0:
            normal = -normal
        weights = {}
        corners = self.polys[index]
        shares = [1.0 / max(1e-4, (self.points[c] - loc).length) for c in corners]
        for c, share in zip(corners, shares):
            for bone, w in self.skin.weights[self.kept[c]].items():
                weights[bone] = weights.get(bone, 0.0) + w * share / sum(shares)
        return loc, normal.normalized(), weights


def lay_strap(extra, key, surface, path, half, lift, mat, front=True, thickness=0.003):
    """A flat strap along a path of (x, z) points on the front or back of the trunk, `lift` off the cloth."""
    hits = [h for h in (surface.hit(x, z, front) for x, z in path) if h]
    if len(hits) < 2:
        return
    for i, (loc, normal, weights) in enumerate(hits):
        along = hits[min(i + 1, len(hits) - 1)][0] - hits[max(i - 1, 0)][0]
        side = along.cross(normal).normalized()
        for j, sign in enumerate((-1, 1)):
            co = loc + normal * lift + side * sign * half
            extra.add(f"{key}o{i}_{j}", 0, tuple(co), weights)
            extra.add(f"{key}i{i}_{j}", 0, tuple(co - normal * thickness), weights)
    for i in range(len(hits) - 1):
        o0, o1, i0, i1 = f"{key}o{i}_", f"{key}o{i + 1}_", f"{key}i{i}_", f"{key}i{i + 1}_"
        extra.face((o0 + "0", o1 + "0", o1 + "1", o0 + "1"), 0, mat)
        extra.face((i0 + "1", i1 + "1", i1 + "0", i0 + "0"), 0, mat)
        extra.face((o0 + "1", o1 + "1", i1 + "1", i0 + "1"), 0, mat)
        extra.face((i0 + "0", i1 + "0", o1 + "0", o0 + "0"), 0, mat)


def lay_patch(extra, key, surface, rows, lift, mat, front=True, thickness=0.004):
    """A closed patch on the trunk: rows of (z, left x, right x) from top to bottom, `lift` off the cloth."""
    columns = 5
    grid = []
    for z, x0, x1 in rows:
        grid.append([surface.hit(x0 + (x1 - x0) * k / (columns - 1), z, front) for k in range(columns)])
    if any(h is None for row in grid for h in row):
        return

    def point(r, k):
        loc, normal, weights = grid[r][k]
        return tuple(loc + normal * lift), weights
    # add_sheet thickens towards the body's axis, which is right for a patch lying on the trunk.
    add_sheet(extra, key, point, len(rows), columns, mat, thickness)


def shoulder_faces(spec, m, skin, front, back, side=0):
    """
    The worn skin's faces over the shoulders, from `front` below the top of them at the front to `back` below at the
    back. `side` -1 keeps only the left (x < 0), 1 only the right.
    """
    top = spec["shoulder"][1]
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, cy, cz) = face_bone(skin, f)
        if side and cx * side < -0.015:
            continue
        on_arm = bone.startswith("UpperArm") and cz > top - 0.06
        if bone in ("Hips", "Torso") or on_arm:
            if cz > top - (back if cy < 0 else front):
                faces.append(f)
    return faces


def cowl(extra, spec, key, mat, gap=0.022):
    """A hood worn down: a loose roll of cloth round the base of the neck, lying lower and fuller at the back."""
    z0, w0, f0, b0, cy0 = spec["neck"][0][:5]
    sides = 12
    rows = ((z0 - 0.03, gap + 0.012, 0.0), (z0, gap + 0.01, -0.012), (z0 + 0.03, gap, -0.03))
    for r, (z, grow, sag) in enumerate(rows):
        for k, (x, y, _) in enumerate(ring(z, w0 + grow, f0 + grow, b0 + grow * 1.6, cy0, n=sides)):
            back = max(0.0, -(y - cy0) / (b0 + grow * 1.6))
            extra.add(f"{key}{r}_{k}", 0, (x, y, z + sag * back - 0.012 * back), {"Torso": 1.0})
    for r in range(len(rows) - 1):
        for k in range(sides):
            k1 = (k + 1) % sides
            extra.face((f"{key}{r + 1}_{k}", f"{key}{r}_{k}", f"{key}{r}_{k1}", f"{key}{r + 1}_{k1}"), 0, mat)


def boot_cuff(extra, spec, key, top, size, m):
    """A boot's top turned down over itself, round both legs."""
    below, above = size
    for side, sx in (("L", -1), ("R", 1)):
        z0, z1 = top - below, top + above * 0.3
        rings = [leg_ring(spec, z0, 0.014, sx), leg_ring(spec, z1, 0.019, sx),
                 leg_ring(spec, z1, 0.013, sx), leg_ring(spec, z0, 0.01, sx)]
        add_band(extra, f"{key}{side}", rings, lambda co, side=side: leg_weights(spec, co[2], side), m["boot"])


def adventurer_cloth(spec, m, skin):
    """
    The worn skin's faces the adventurer's kit covers: the shirt's sleeves, pushed up, with bracers below them, the
    jerkin over the trunk, breeches and knee boots.
    """
    male = spec.get("plated", False)
    boot_top = spec["knee_z"] + ADVENTURER_BOOT
    bracer_top = spec["elbow_z"] - ADVENTURER_BRACER
    tee, belt = m[spec["tunic"]], m[spec["belt"]]
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, cy, cz) = face_bone(skin, f)
        if bone.startswith("UpperArm"):
            faces.append((f, m["linen"]))
        elif bone.startswith("ForeArm"):
            faces.append((f, m["bracer"] if cz < bracer_top else m["linen"]))
        elif bone.startswith(("Thigh", "Shin")):
            faces.append((f, m["boot"] if cz < boot_top else m["breeches"]))
        elif bone not in ("Hips", "Torso"):
            continue
        elif face_leans(skin, f, "UpperArm"):
            faces.append((f, m["linen"]))
        elif male:
            if mat is belt:
                faces.append((f, m["leather"]))
            elif mat is not tee:
                faces.append((f, m["breeches"]))
            elif cy > 0 and cz > 1.47 and abs(cx) < 0.018 + 0.35 * (cz - 1.47):
                faces.append((f, m["linen"]))  # the shirt shows in the jerkin's open neck
            else:
                faces.append((f, m["jerkin"]))
        elif cz < spec["hips_z"]:
            faces.append((f, m["breeches"]))
        elif cz < (ADVENTURER_JERKIN if cy > 0 else ADVENTURER_JERKIN + 0.03):
            faces.append((f, m["jerkin"]))
        elif cy > 0 and cz > 1.25 and abs(cx) < 0.012 + 0.45 * (cz - 1.25):
            continue  # the shirt's open neck
        else:
            faces.append((f, m["linen"]))
    return faces


def adventurer_lift(spec):
    """How far each part stands out from the worn skin: a loose shirt, bracers and boots over the limbs."""
    boot_top = spec["knee_z"] + ADVENTURER_BOOT
    bracer_top = spec["elbow_z"] - ADVENTURER_BRACER
    shoulders = None if spec.get("plated") else spec["shoulder"][1] - 0.1

    def lift(bone, z):
        if bone.startswith("UpperArm"):
            return 0.022 if shoulders and z > shoulders - 0.02 else 0.012
        if bone.startswith("ForeArm"):
            return 0.007 if z < bracer_top else 0.016  # the sleeve rolled up above the bracer
        if bone.startswith(("Thigh", "Shin")):
            return 0.01 if z < boot_top else 0.005
        if shoulders and z > shoulders:
            return 0.016
        return 0.006
    return lift


def build_adventurer_extra(spec, m, skin, normals, surface, quiver=False):
    """
    The mantle and its hood, the strap across the chest, the belt and pouch, the jerkin's laces and the boot tops,
    and the archer's quiver.
    """
    extra = Skin()
    female = not spec.get("plated", False)
    top = spec["shoulder"][1]
    shoulders = None if not female else top - 0.1

    def over(amount):
        def lift(i):
            weights = skin.weights[i]
            bone = max(weights, key=weights.get)
            z = skin.points[i][2]
            base = 0.022 if shoulders and z > shoulders - 0.02 and (bone.startswith("UpperArm") or z > shoulders) else 0.012
            return base + amount
        return lift

    # The mantle: to the top of the chest at the front, halfway down the back behind.
    front, back = (0.07, 0.2) if female else (0.0, 0.2)
    shell(extra, "mantle", skin, normals, shoulder_faces(spec, m, skin, front, back), over(0.014), m["cloak"])
    cowl(extra, spec, "hood", m["cloak"])
    # The hood's point, lying down the back over the mantle.
    neck = spec["neck"][0][0]
    hood = [(neck - 0.02 - d, -w, w) for d, w in ((0.0, 0.075), (0.05, 0.065), (0.1, 0.045), (0.15, 0.02), (0.18, 0.004))]
    if not female:
        hood = [(z - 0.03, x0 * 1.25, x1 * 1.25) for z, x0, x1 in hood]
    lay_patch(extra, "hoodback", surface, hood, 0.045 if female else 0.05, m["cloak"], front=False)

    # The strap, from the right shoulder across the chest to the left hip, and the same way across the back.
    belt = ADVENTURER_BELT[spec["name"]]
    x0, z0, x1, z1 = (0.1, top - 0.02, -0.15, belt[1]) if female else (0.13, top + 0.02, -0.18, belt[1])
    path = [(x0 + (x1 - x0) * t / 12, z0 + (z1 - z0) * t / 12) for t in range(13)]
    for front_side in (True, False):
        lay_strap(extra, "strap" + ("f" if front_side else "b"), surface, path, 0.014 if female else 0.018,
                  0.01, m["leather"], front=front_side)

    # The belt, with a pouch on the right hip and its buckle at the front.
    waist_band(extra, spec, "belt", belt, 0.014 if female else 0.02, m["leather"])
    mid = sum(belt) / 2
    w, f, _ = profile_at(spec, mid)
    hips = lambda co: {"Hips": 1.0}
    a = 0.35  # the right hip, a little to the front
    out = (math.cos(a), math.sin(a))
    reach = 0.034 if female else 0.04
    facing(extra, "pouch", (math.cos(a) * (w + reach), math.sin(a) * (f + reach), mid - 0.03), (0.03, 0.04), out, hips,
           m["leather"], depth=0.022)
    facing(extra, "flap", (math.cos(a) * (w + reach + 0.004), math.sin(a) * (f + reach + 0.004), mid - 0.004), (0.031, 0.014),
           out, hips, m["bracer"], depth=0.004)
    facing(extra, "buckle", (0.0, f + (0.02 if female else 0.026), mid), (0.014, 0.014), (0.0, 1.0), hips, m["pewter"])

    # Laces up the front of the jerkin.
    blend_start, blend_span = spec.get("trunk_blend", (0.985, 0.05))

    def trunk(co):
        t = min(1.0, max(0.0, (co[2] - blend_start) / blend_span))
        return {"Hips": 1 - t, "Torso": t}

    laces = (0.94, 0.98, 1.02, 1.06) if female else (1.17, 1.23, 1.29, 1.35, 1.41)
    for i, z in enumerate(laces):
        y = profile_at(spec, z)[1] + CLOTH_GAP + (0.01 if female else 0.012)
        for j, sx in enumerate((-1, 1)):
            corners = [(sx * 0.018, y, z - 0.004), (sx * 0.018, y, z + 0.002), (-sx * 0.018, y, z + 0.02), (-sx * 0.018, y, z + 0.014)]
            add_slab(extra, f"lace{i}_{j}", corners, (0.0, 0.003, 0.0), trunk, m["bracer"])

    boot_cuff(extra, spec, "cuff", spec["knee_z"] + ADVENTURER_BOOT, ADVENTURER_CUFF, m)
    if quiver:
        build_quiver(extra, spec, surface, m)
    return extra


def noble_cloth(spec, m, skin):
    """
    The worn skin's faces a noble's clothes cover. His: the doublet with puffed sleeves and linen cuffs, breeches
    and tall boots. Hers: the gown's bodice and long sleeves with linen ruffles, and legwear under the skirt.
    """
    male = spec.get("plated", False)
    boot_top = spec["knee_z"] + NOBLE_BOOT
    cuff = spec["wrist_z"] + 0.03
    tee, belt = m[spec["tunic"]], m[spec["belt"]]
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, cy, cz) = face_bone(skin, f)
        cloth = m["doublet"] if male else m["bodice"]
        if bone.startswith("UpperArm"):
            faces.append((f, cloth))
        elif bone.startswith("ForeArm"):
            faces.append((f, m["linen"] if cz < cuff else cloth))
        elif male and bone.startswith(("Thigh", "Shin")):
            faces.append((f, m["boot"] if cz < boot_top else m["breeches"]))
        elif male and bone in ("Hips", "Torso"):
            faces.append((f, cloth if mat in (tee, belt) or face_leans(skin, f, "UpperArm") else m["breeches"]))
        elif male:
            continue
        elif is_legwear(bone, cz):
            faces.append((f, legwear_band(m, bone, cz)))
        elif bone not in ("Hips", "Torso"):
            continue
        elif face_leans(skin, f, "UpperArm"):
            faces.append((f, cloth))
        elif cz < (NOBLE_NECKLINE[0] if cy > 0 else NOBLE_NECKLINE[1]):
            faces.append((f, cloth))
        elif cy > 0 and abs(cx) < NOBLE_SQUARE:
            continue  # the square neckline
        elif cz < NOBLE_NECKLINE[1] + 0.03:
            faces.append((f, cloth))  # the shoulders either side of it
    return faces


def noble_lift(spec):
    """His sleeves and breeches puff out; her gown fits close, with a ruffle at each wrist."""
    male = spec.get("plated", False)
    cuff = spec["wrist_z"] + 0.03
    thigh_top = spec["hips_z"] - 0.06
    shoulders = None if male else spec["shoulder"][1] - 0.1

    def lift(bone, z):
        if bone.startswith("UpperArm"):
            if male:
                return 0.028
            return 0.014 if shoulders and z > shoulders - 0.02 else 0.006
        if bone.startswith("ForeArm"):
            return (0.018 if male else 0.022) if z < cuff else (0.008 if male else 0.005)
        if male and bone.startswith("Thigh"):
            return 0.022 if z > thigh_top - 0.18 else 0.01  # puffed at the top, tucked into the boots
        if male and bone.startswith("Shin"):
            return 0.01
        if bone.startswith(("Thigh", "Shin")):
            return 0.0
        if shoulders and z > shoulders:
            return 0.01
        return 0.008 if male else 0.003
    return lift


def build_cap(extra, fit, m):
    """A flat cap: a soft crown spreading wider than the head, tipped to his right, with a feather at the left."""
    base, cy, rx, rf, rb, top = fit
    n = HAT_SIDES

    def at(a, grow, z):
        tip = 0.014 * math.cos(a)  # lower on his right
        return math.cos(a) * (rx + grow), cy + math.sin(a) * ((rf if math.sin(a) > 0 else rb) + grow), z - tip

    angles = [2 * math.pi * k / n for k in range(n)]
    rings = [(0.0, base + 0.005), (0.004, base + 0.02), (0.034, base + 0.045), (0.03, base + 0.062), (0.0, base + 0.072)]
    for r, (grow, z) in enumerate(rings):
        for k, a in enumerate(angles):
            extra.add(f"cap{r}_{k}", 0, at(a, grow, z), {"Head": 1.0})
    extra.add("captop", 0, (0.0, cy, base + 0.074), {"Head": 1.0})
    for r in range(len(rings) - 1):
        for k in range(n):
            k1 = (k + 1) % n
            mat = m["braid"] if r == 0 else m["hat"]
            extra.face((f"cap{r + 1}_{k}", f"cap{r}_{k}", f"cap{r}_{k1}", f"cap{r + 1}_{k1}"), 0, mat)
    last = len(rings) - 1
    for k in range(n):
        extra.face((f"cap{last}_{k}", f"cap{last}_{(k + 1) % n}", "captop"), 0, m["hat"])

    # The feather, tucked in at the left and lying back along the crown.
    x0, y0, z0 = at(math.pi + 0.3, 0.03, base + 0.05)
    path = [((0.0, 0.0, 0.0), 0.005), ((-0.006, -0.03, 0.03), 0.016), ((-0.006, -0.075, 0.05), 0.02),
            ((0.0, -0.125, 0.045), 0.014), ((0.006, -0.155, 0.03), 0.003)]

    def across(tangent):
        _, ty, tz = tangent
        length = math.hypot(ty, tz) or 1.0
        return 0.0, -tz / length, ty / length

    add_ribbon(extra, "plume", [((x0 + dx, y0 + dy, z0 + dz), half) for (dx, dy, dz), half in path], across, m["plume"])


def build_noble_extra(spec, m, skin, normals, fit, surface):
    """
    His: the doublet's skirt and its braid, buttons, the ruff, the chain of office, the cape and the cap.
    Hers: the gown's skirt, braid round the neckline, the girdle and its chain, and a circlet.
    """
    extra = Skin()
    male = spec.get("plated", False)
    top = spec["shoulder"][1]
    blend_start, blend_span = spec.get("trunk_blend", (0.985, 0.05))

    def trunk(co):
        t = min(1.0, max(0.0, (co[2] - blend_start) / blend_span))
        return {"Hips": 1 - t, "Torso": t}

    if male:
        # The doublet's short skirt, flaring over the hips, its lower edge following the thighs a little.
        sides = SKIRT_SIDES
        z0, z1 = NOBLE_PEPLUM
        for r, (z, reach) in enumerate(((z0, 0.012), (z1 + 0.04, 0.03), (z1, 0.042))):
            w, f, b = profile_at(spec, z)
            for k in range(sides):
                a = 2 * math.pi * k / sides
                x, y = math.cos(a) * (w + reach), math.sin(a) * ((f if math.sin(a) > 0 else b) + reach)
                share = 0.4 * r / 2 * min(1.0, abs(x) / 0.06)
                side = "L" if x < 0 else "R"
                weights = {"Hips": 1 - share, f"Thigh_{side}": share} if share > 0 else {"Hips": 1.0}
                extra.add(f"peplum{r}_{k}", 0, (x, y, z), weights)
        for r in range(2):
            for k in range(sides):
                k1 = (k + 1) % sides
                mat = m["braid"] if r == 1 else m["doublet"]
                extra.face((f"peplum{r}_{k}", f"peplum{r + 1}_{k}", f"peplum{r + 1}_{k1}", f"peplum{r}_{k1}"), 0, mat)

        # Gold buttons down the front.
        for i, z in enumerate((1.16, 1.22, 1.28, 1.34, 1.4, 1.46)):
            y = profile_at(spec, z)[1] + CLOTH_GAP + 0.012
            facing(extra, f"button{i}", (0.0, y, z), (0.007, 0.007), (0.0, 1.0), trunk, m["jewel"], depth=0.005)

        # A linen ruff round the neck.
        z0 = spec["neck"][0][0]
        neck_band(extra, spec, "ruff", (z0 + 0.026, z0 + 0.052), 0.024, m["linen"], sides=14)
        neck_band(extra, spec, "ruffin", (z0 + 0.052, z0 + 0.026), 0.012, m["linen"], sides=14)

        # The chain of office, hanging low on the chest from the tops of the shoulders, with a medallion.
        path = [(x / 100, 1.355 + 7.5 * (x / 100) ** 2) for x in range(-14, 15, 2)]
        lay_strap(extra, "chain", surface, path, 0.007, 0.012, m["jewel"])
        facing(extra, "medal", (0.0, profile_at(spec, 1.34)[1] + CLOTH_GAP + 0.024, 1.34), (0.02, 0.022), (0.0, 1.0),
               lambda co: {"Torso": 1.0}, m["jewel"], depth=0.006)
        facing(extra, "medalgem", (0.0, profile_at(spec, 1.34)[1] + CLOTH_GAP + 0.031, 1.34), (0.009, 0.01), (0.0, 1.0),
               lambda co: {"Torso": 1.0}, m["gem"], depth=0.003)

        # A short cape over the left shoulder, to the waist behind.
        def cape(i):
            weights = skin.weights[i]
            bone = max(weights, key=weights.get)
            return 0.05 if bone.startswith("UpperArm") else 0.036
        shell(extra, "cape", skin, normals, shoulder_faces(spec, m, skin, 0.04, 0.36, side=-1), cape, m["cloak"])

        build_cap(extra, fit, m)
        boot_cuff(extra, spec, "cuff", spec["knee_z"] + NOBLE_BOOT, (0.014, 0.05), m)
        return extra

    # Her gown's skirt, full, down to the floor.
    long_skirt(extra, spec, "skirt", NOBLE_SKIRT, 0.1, m["skirt"])

    # Braid along the bottom of the square neckline and up each side of it.
    low, edge = NOBLE_NECKLINE[0] - 0.008, NOBLE_SQUARE + 0.006
    path = ([(-edge, low + 0.06 - 0.015 * t) for t in range(4)] + [(-edge + 2 * edge * t / 8, low) for t in range(9)]
            + [(edge, low + 0.015 * t) for t in range(1, 5)])
    lay_strap(extra, "braid", surface, path, 0.008, 0.005, m["braid"])

    # The girdle, low on the waist, with a chain hanging down the front to a gem.
    waist_band(extra, spec, "girdle", NOBLE_GIRDLE, 0.03, m["girdle"])
    gz = sum(NOBLE_GIRDLE) / 2
    a = math.pi / 2
    x, y, _ = skirt_point(spec, a, 0.62)
    front = profile_at(spec, gz)[1] + 0.034
    hang = lambda co: skirt_weights(a, co[2])
    corners = [(-0.008, front, gz), (0.008, front, gz), (0.008, y * 1.07 + 0.006, 0.62), (-0.008, y * 1.07 + 0.006, 0.62)]
    add_slab(extra, "chain", corners, (0.0, 0.004, 0.0), hang, m["girdle"])
    facing(extra, "chaingem", (0.0, y * 1.07 + 0.012, 0.61), (0.013, 0.016), (0.0, 1.0), hang, m["gem"], depth=0.006)

    # A thin circlet round her brow, a gem at the front.
    base, cy, rx, rf, rb, _ = fit
    n = HAT_SIDES
    for r, z in enumerate((base - 0.008, base + 0.006)):
        for k in range(n):
            ang = 2 * math.pi * k / n
            extra.add(f"circlet{r}_{k}", 0, (math.cos(ang) * (rx - 0.004),
                                             cy + math.sin(ang) * ((rf if math.sin(ang) > 0 else rb) - 0.004), z), {"Head": 1.0})
    for k in range(n):
        k1 = (k + 1) % n
        extra.face((f"circlet1_{k}", f"circlet0_{k}", f"circlet0_{k1}", f"circlet1_{k1}"), 0, m["jewel"])
    facing(extra, "circletgem", (0.0, cy + rf + 0.0, base - 0.001), (0.007, 0.009), (0.0, 1.0), lambda co: {"Head": 1.0}, m["gem"])
    return extra


# ---------------------------------------------------------------- the adventuring party
WARRIOR_TABARD = {"Female": (0.085, 0.6), "Male": (0.11, 0.72)}  # the tabard's half width, and where it ends
WARRIOR_SHIELD = {"Female": (0.15, 1.1), "Male": (0.18, 1.28)}  # the shield's radius, and the height of its middle
ROBE_SKIRT = NOBLE_SKIRT
ROBE_BELT = {"Female": (0.955, 0.985), "Male": ADVENTURER_BELT["Male"]}  # her robes are belted above the skirt
CHEST = {"Female": 1.24, "Male": 1.38}  # where a badge or a pendant sits on the chest


def skirt_grow(zs, full, z):
    """How much wider a long skirt over zs, `full` wider at the hem, is at height z than its outline."""
    for r in range(len(zs) - 1):
        if zs[r + 1] <= z <= zs[r]:
            t = (zs[r] - z) / (zs[r] - zs[r + 1])
            return 1.0 + full * (r + t) / (len(zs) - 1)
    return 1.0 + (full if z < zs[-1] else 0.0)


def long_skirt(extra, spec, key, zs, full, mat):
    """A full skirt on her skirt panels, from the hips down through zs, `full` wider at the hem than at the top."""
    sides = SKIRT_SIDES
    for r, z in enumerate(zs):
        for k in range(sides):
            a = 2 * math.pi * k / sides
            x, y, _ = skirt_point(spec, a, z)
            grow = 1.0 + full * (r / (len(zs) - 1))
            extra.add(f"{key}{r}_{k}", 0, (x * grow, y * grow, z), skirt_weights(a, z))
    for r in range(len(zs) - 1):
        for k in range(sides):
            extra.face((f"{key}{r}_{k}", f"{key}{r + 1}_{k}", f"{key}{r + 1}_{(k + 1) % sides}", f"{key}{r}_{(k + 1) % sides}"),
                       0, mat)


def body_depth(spec, z, front):
    """How far the worn body reaches forwards (or backwards) at height z: the trunk, or the further of the legs."""
    reach = 0.0
    if z >= spec["hips_z"] - 0.14:
        _, f, b = profile_at(spec, z)
        reach = f if front else b
    if z <= spec["hips_z"] - 0.02:
        for sx in (-1, 1):
            for _, y, _ in leg_ring(spec, z, CLOTH_GAP, sx):
                reach = max(reach, y if front else -y)
    return reach


def legs_weights(spec, z):
    """From the hips onto both thighs, then both shins, half each: a panel hanging between the legs."""
    def ease(t):
        t = min(1.0, max(0.0, t))
        return t * t * (3 - 2 * t)

    t1 = ease((spec["hips_z"] - 0.02 - z) / 0.16)
    t2 = ease((spec["knee_z"] + 0.04 - z) / 0.16)
    weights = {"Hips": 1 - t1}
    for side in "LR":
        weights[f"Thigh_{side}"] = t1 * (1 - t2) / 2
        weights[f"Shin_{side}"] = t1 * t2 / 2
    return {bone: w for bone, w in weights.items() if w > 1e-4}


def robe_panel(extra, spec, key, z_top, z_bottom, half, flare, lift, mat, front=True, skirt=None, rows=7):
    """
    A panel hanging from the waist in front of (or behind) the legs, a robe's or a tabard's, `half` wide either side
    of the middle and `flare` wider at the hem. On his legs it follows both legs at once, so it stays between them
    as he walks and lies over his lap seated. Over her long skirt (`skirt` its heights and how full it is) it
    moves with the skirt.
    """
    sign = 1.0 if front else -1.0
    columns = 4
    zs = [z_top + (z_bottom - z_top) * r / (rows - 1) for r in range(rows)]
    # Cloth hangs from the furthest the body reaches above it, so the panel never cuts into the legs.
    reach = []
    for z in zs:
        reach.append(max([body_depth(spec, z, front)] + reach[-1:]))

    def point(r, k):
        t = r / (rows - 1)
        w = half * (1 + flare * t)
        x, z = -w + 2 * w * k / (columns - 1), zs[r]
        if skirt is not None:
            _, sy, _ = skirt_point(spec, math.pi / 2 if front else -math.pi / 2, z)
            y = sy * skirt_grow(*skirt, z) + sign * lift
            return (x, y, z), skirt_weights(math.atan2(y, x) % (2 * math.pi), z)
        return (x, sign * (reach[r] + lift + 0.012 * t), z), legs_weights(spec, z)
    add_sheet(extra, key, point, rows, columns, mat, 0.005)


def rod(extra, key, p0, p1, r0, r1, weights, mat, cap=None, sides=6):
    """
    A closed tube from p0 to p1, r0 thick at p0 and r1 at p1, such as a staff, a quiver, a scabbard or, short and
    wide, a shield. `weights` is a dict, or a function of the point.
    """
    a, b = Vector(p0), Vector(p1)
    axis = (b - a).normalized()
    u = axis.cross(Vector((0.0, 0.0, 1.0)))
    if u.length < 1e-4:
        u = axis.cross(Vector((1.0, 0.0, 0.0)))
    u.normalize()
    v = axis.cross(u)
    weigh = weights if callable(weights) else (lambda co: dict(weights))
    for e, (p, r) in enumerate(((a, r0), (b, r1))):
        for k in range(sides):
            t = 2 * math.pi * k / sides
            co = p + (u * math.cos(t) + v * math.sin(t)) * r
            extra.add(f"{key}{e}_{k}", 0, tuple(co), weigh(tuple(co)))
        extra.add(f"{key}c{e}", 0, tuple(p), weigh(tuple(p)))
    for k in range(sides):
        k1 = (k + 1) % sides
        extra.face((f"{key}0_{k}", f"{key}0_{k1}", f"{key}1_{k1}", f"{key}1_{k}"), 0, mat)
        extra.face((f"{key}0_{k1}", f"{key}0_{k}", f"{key}c0"), 0, cap or mat)
        extra.face((f"{key}1_{k}", f"{key}1_{k1}", f"{key}c1"), 0, cap or mat)


def behind(surface, path, gap):
    """How far back a straight piece along path, (x, z) points, must lie to clear the back by gap."""
    hits = [h for h in (surface.hit(x, z, front=False) for x, z in path) if h]
    return min(loc.y for loc, _, _ in hits) - gap


def hip_weights(spec, side):
    """For a piece hanging at one hip: on the hips at the belt, onto that thigh lower down."""
    def weights(co):
        t = min(1.0, max(0.0, (spec["hips_z"] - 0.02 - co[2]) / 0.25)) * 0.6
        return {"Hips": 1 - t, f"Thigh_{side}": t} if t > 0 else {"Hips": 1.0}
    return weights


def shoulder_plates(spec, m, skin):
    """The worn skin's faces a pauldron covers: the top of each shoulder, as (upper plate, lower plate)."""
    top = spec["shoulder"][1]
    upper, lower = [], []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (_, _, cz) = face_bone(skin, f)
        on_arm = bone.startswith("UpperArm") or (bone in ("Hips", "Torso") and face_leans(skin, f, "UpperArm"))
        if on_arm and cz > top - 0.1:
            upper.append(f)
        elif bone.startswith("UpperArm") and cz > top - 0.16:
            lower.append(f)
    return upper, lower


def tabard_faces(spec, m, skin, half, bottom, top):
    """The worn trunk's faces a tabard covers, front and back: `half` either side of the middle, from bottom to top."""
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, _, cz) = face_bone(skin, f)
        if bone in ("Hips", "Torso") and abs(cx) < half and bottom < cz < top and not face_leans(skin, f, "UpperArm"):
            faces.append(f)
    return faces


def badge(extra, key, surface, z, size, lift, mat, gem=None, gem_size=None):
    """A badge facing out from the chest at height z, `lift` off the cloth, with a gem set in it."""
    hit = surface.hit(0.0, z)
    if not hit:
        return
    loc, normal, weights = hit
    out = Vector((normal.x, normal.y, 0.0)).normalized()
    at = loc + normal * lift
    facing(extra, key, tuple(at), size, (out.x, out.y), lambda co: dict(weights), mat, depth=0.005)
    if gem:
        at = at + normal * 0.006
        facing(extra, key + "gem", tuple(at), gem_size, (out.x, out.y), lambda co: dict(weights), gem, depth=0.004)


def build_quiver(extra, spec, surface, m):
    """A quiver slung across the back from the right shoulder, with the fletched ends of four arrows."""
    top = spec["shoulder"][1]
    male = spec.get("plated", False)
    (x0, z0), (x1, z1) = ((0.11, top + 0.1), (-0.04, top - 0.36)) if male else ((0.09, top + 0.07), (-0.03, top - 0.3))
    y = behind(surface, [(x0 + (x1 - x0) * t / 6, z0 + (z1 - z0) * t / 6) for t in range(7)], 0.075)
    a, b = Vector((x0, y, z0)), Vector((x1, y, z1))
    torso = {"Torso": 1.0}
    rod(extra, "quiver", b, a, 0.034, 0.04, torso, m["leather"], m["bracer"], sides=8)
    up = (a - b).normalized()
    side = up.cross(Vector((0.0, 1.0, 0.0))).normalized()
    for i, (du, dv) in enumerate(((-0.014, -0.008), (0.012, -0.01), (-0.004, 0.012), (0.016, 0.01))):
        start = a + side * du + Vector((0.0, dv, 0.0)) - up * 0.02
        tip = start + up * (0.1 + 0.012 * i)
        rod(extra, f"arrow{i}", start, tip, 0.004, 0.004, torso, m["wood"], sides=4)
        rod(extra, f"fletch{i}", tip - up * 0.045, tip, 0.012, 0.008, torso, m["plume"], sides=3)


def build_wizard_hat(extra, fit, m):
    """A tall pointed hat with a wide drooping brim and a band, its tip bending back."""
    base, cy, rx, rf, rb, top = fit
    n = HAT_SIDES

    def at(a, grow, z, dy=0.0, scale=1.0):
        return (math.cos(a) * (rx + grow) * scale,
                cy + dy + math.sin(a) * ((rf if math.sin(a) > 0 else rb) + grow) * scale, z)

    angles = [2 * math.pi * k / n for k in range(n)]
    # The brim's cross-section: from the crown out to its drooping edge and back underneath.
    brim = [(0.0, base), (0.085, base - 0.02), (0.085, base - 0.026), (0.0, base - 0.006)]
    for p, (grow, z) in enumerate(brim):
        for k, a in enumerate(angles):
            extra.add(f"brim{p}_{k}", 0, at(a, grow, z), {"Head": 1.0})
    for p in range(len(brim)):
        p1 = (p + 1) % len(brim)
        for k in range(n):
            k1 = (k + 1) % n
            extra.face((f"brim{p}_{k}", f"brim{p1}_{k}", f"brim{p1}_{k1}", f"brim{p}_{k1}"), 0, m["hat"])
    height = top - base
    cone = [(0.004, base, 0.0, 1.0), (0.004, base + 0.03, 0.0, 1.0), (0.0, base + 0.6 * height, -0.004, 0.92),
            (0.0, top + 0.02, -0.02, 0.62), (0.0, top + 0.1, -0.05, 0.34), (0.0, top + 0.16, -0.1, 0.16)]
    for r, (grow, z, dy, scale) in enumerate(cone):
        for k, a in enumerate(angles):
            extra.add(f"cone{r}_{k}", 0, at(a, grow, z, dy, scale), {"Head": 1.0})
    extra.add("conetip", 0, (0.0, cy - 0.17, top + 0.17), {"Head": 1.0})
    for r in range(len(cone) - 1):
        for k in range(n):
            k1 = (k + 1) % n
            extra.face((f"cone{r + 1}_{k}", f"cone{r}_{k}", f"cone{r}_{k1}", f"cone{r + 1}_{k1}"), 0,
                       m["braid"] if r == 0 else m["hat"])
    last = len(cone) - 1
    for k in range(n):
        extra.face((f"cone{last}_{k}", f"cone{last}_{(k + 1) % n}", "conetip"), 0, m["hat"])


def warrior_cloth(spec, m, skin):
    """The worn skin's faces the warrior's kit covers: mail everywhere, plate vambraces and greaves."""
    male = spec.get("plated", False)
    belt = m[spec["belt"]]
    vambrace = spec["elbow_z"] - 0.04
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (_, _, cz) = face_bone(skin, f)
        if bone.startswith("ForeArm"):
            faces.append((f, m["plate"] if cz < vambrace else m["mail"]))
        elif bone.startswith("Shin"):
            faces.append((f, m["plate"]))
        elif bone.startswith(("UpperArm", "Thigh")):
            faces.append((f, m["mail"]))
        elif bone not in ("Hips", "Torso"):
            continue
        elif male and mat is belt:
            faces.append((f, m["leather"]))
        else:
            faces.append((f, m["mail"]))
    return faces


def warrior_lift(spec):
    """Mail sits a little off the body; the plate stands further off it."""
    vambrace = spec["elbow_z"] - 0.04
    shoulders = None if spec.get("plated") else spec["shoulder"][1] - 0.1

    def lift(bone, z):
        if bone.startswith("UpperArm"):
            return 0.02 if shoulders and z > shoulders - 0.02 else 0.01
        if bone.startswith("ForeArm"):
            return 0.014 if z < vambrace else 0.01
        if bone.startswith("Shin"):
            return 0.016
        if bone.startswith("Thigh"):
            return 0.008
        if shoulders and z > shoulders:
            return 0.016
        return 0.008
    return lift


def build_warrior_extra(spec, m, skin, normals, surface):
    """The tabard and its badge, the belt, pauldrons, a round shield on the back and a sword at the left hip."""
    extra = Skin()
    female = not spec.get("plated", False)
    name = spec["name"]
    top = spec["shoulder"][1]
    belt = ADVENTURER_BELT[name]
    mid = sum(belt) / 2
    half, end = WARRIOR_TABARD[name]

    shell(extra, "tabard", skin, normals, tabard_faces(spec, m, skin, half, belt[0], top - 0.01), lambda i: 0.02, m["tabard"])
    for front in (True, False):
        robe_panel(extra, spec, "skirt" + ("f" if front else "b"), mid, end, half, 0.12, 0.03, m["tabard"], front=front)
    badge(extra, "badge", surface, CHEST[name], (0.026, 0.03), 0.016, m["gem"])
    waist_band(extra, spec, "belt", belt, 0.03 if female else 0.036, m["leather"])
    w, f, _ = profile_at(spec, mid)
    facing(extra, "buckle", (0.0, f + (0.036 if female else 0.042), mid), (0.016, 0.016), (0.0, 1.0),
           lambda co: {"Hips": 1.0}, m["iron"])

    upper, lower = shoulder_plates(spec, m, skin)
    shell(extra, "pauldron", skin, normals, upper, lambda i: 0.034 if female else 0.04, m["plate"])
    shell(extra, "lame", skin, normals, lower, lambda i: 0.026 if female else 0.03, m["plate"])

    # The round shield, slung on the back: a face in the tabard's colour, an iron rim and boss.
    radius, height = WARRIOR_SHIELD[name]
    hit = surface.hit(0.0, height, front=False)
    if hit:
        loc, normal, _ = hit
        out = Vector((0.0, normal.y, 0.0)).normalized()
        centre = loc + out * 0.055
        torso = {"Torso": 1.0}
        rod(extra, "shield", centre - out * 0.012, centre + out * 0.012, radius, radius, torso, m["iron"], m["tabard"], sides=14)
        rod(extra, "boss", centre + out * 0.012, centre + out * 0.032, 0.045, 0.018, torso, m["iron"], sides=8)

    # The sword in its scabbard at the left hip, sloping back, the hilt forwards above the belt.
    x = -(w + (0.03 if female else 0.038))
    mouth = Vector((x, 0.03, mid))
    down = Vector((-0.02, -0.25, -1.0)).normalized()
    length = 0.5 if female else 0.6
    hang = hip_weights(spec, "L")
    rod(extra, "scabbard", mouth, mouth + down * length, 0.022, 0.014, hang, m["leather"], sides=4)
    rod(extra, "grip", mouth, mouth - down * 0.15, 0.01, 0.01, hang, m["leather"], sides=4)
    guard = Vector((0.0, -down.z, down.y)).normalized()
    rod(extra, "guard", mouth - guard * 0.05, mouth + guard * 0.05, 0.008, 0.008, hang, m["iron"], sides=4)
    rod(extra, "pommel", mouth - down * 0.15, mouth - down * 0.17, 0.014, 0.01, hang, m["iron"], sides=6)
    return extra


def robe_cloth(spec, m, skin):
    """The worn skin's faces a robe covers: sleeves and trunk, his breeches and boots, and her legwear under it."""
    male = spec.get("plated", False)
    boot_top = spec["knee_z"] + ADVENTURER_BOOT
    tee, belt = m[spec["tunic"]], m[spec["belt"]]
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, cy, cz) = face_bone(skin, f)
        if bone.startswith(("UpperArm", "ForeArm")):
            faces.append((f, m["robe"]))
        elif male and bone.startswith(("Thigh", "Shin")):
            faces.append((f, m["boot"] if cz < boot_top else m["breeches"]))
        elif male and bone in ("Hips", "Torso"):
            faces.append((f, m["robe"] if mat in (tee, belt) or face_leans(skin, f, "UpperArm") else m["breeches"]))
        elif male:
            continue
        elif is_legwear(bone, cz):
            faces.append((f, legwear_band(m, bone, cz)))
        elif bone not in ("Hips", "Torso"):
            continue
        elif cy > 0 and cz > 1.255 and abs(cx) < 0.03 + 0.4 * (cz - 1.255):
            continue  # a small neckline
        else:
            faces.append((f, m["robe"]))
    return faces


def robe_lift(spec, bell):
    """A loose robe; the mage's sleeves widen into bells at the wrist."""
    male = spec.get("plated", False)
    elbow, wrist = spec["elbow_z"], spec["wrist_z"]
    shoulders = None if male else spec["shoulder"][1] - 0.1

    def lift(bone, z):
        if bone.startswith("UpperArm"):
            return 0.018 if shoulders and z > shoulders - 0.02 else 0.01
        if bone.startswith("ForeArm"):
            if not bell:
                return 0.008
            t = min(1.0, max(0.0, (elbow - z) / (elbow - wrist)))
            return 0.008 + 0.05 * t ** 1.5
        if bone.startswith(("Thigh", "Shin")):
            return (0.008 if bone.startswith("Thigh") else 0.012) if male else 0.0
        if shoulders and z > shoulders:
            return 0.012
        return 0.006
    return lift


def build_robe_extra(spec, m, skin, normals, surface, fit, calling):
    """
    The robe's skirt (hers) or panels (his), and the calling's own pieces. The mage: a sash, an amulet, the pointed
    hat and a staff on the back. The cleric: a tabard with a sun on the chest, a belt, a hood and a mace.
    """
    extra = Skin()
    female = not spec.get("plated", False)
    name = spec["name"]
    top = spec["shoulder"][1]
    belt = ROBE_BELT[name]
    mid = sum(belt) / 2
    skirt = (ROBE_SKIRT, 0.12) if female else None
    if female:
        long_skirt(extra, spec, "robe", *skirt, m["robe"])
    else:
        for front in (True, False):
            robe_panel(extra, spec, "robe" + ("f" if front else "b"), mid, 0.2, 0.13, 0.35, 0.012, m["robe"], front=front)
    reach = 0.032 if female else 0.022
    w, f, _ = profile_at(spec, mid)

    if calling == "mage":
        waist_band(extra, spec, "sash", belt, reach, m["sash"])
        badge(extra, "amulet", surface, CHEST[name] + 0.02, (0.018, 0.022), 0.008, m["jewel"], m["gem"], (0.01, 0.012))
        build_wizard_hat(extra, fit, m)
        # The staff, across the back from behind the right shoulder, with a gem at its head.
        (x0, z0), (x1, z1) = ((0.17, top + 0.38), (-0.15, top - 0.62)) if not female else ((0.13, top + 0.3), (-0.11, top - 0.52))
        path = [(x0 + (x1 - x0) * t / 10, z0 + (z1 - z0) * t / 10) for t in range(11)]
        y = behind(surface, path, 0.06)
        torso = {"Torso": 1.0}
        head, foot = Vector((x0, y, z0)), Vector((x1, y, z1))
        rod(extra, "staff", foot, head, 0.011, 0.014, torso, m["wood"], sides=6)
        up = (head - foot).normalized()
        rod(extra, "orb", head - up * 0.005, head + up * 0.05, 0.026, 0.012, torso, m["gem"], sides=6)
        return extra

    # The cleric.
    half = WARRIOR_TABARD[name][0] * 0.9
    shell(extra, "tabard", skin, normals, tabard_faces(spec, m, skin, half, belt[0], top - 0.01), lambda i: 0.016, m["tabard"])
    for front in (True, False):
        robe_panel(extra, spec, "skirt" + ("f" if front else "b"), mid, 0.36 if female else 0.42, half, 0.1,
                   0.012 if female else 0.026, m["tabard"], front=front, skirt=skirt)
    badge(extra, "sun", surface, CHEST[name], (0.032, 0.032), 0.012, m["jewel"], m["gem"], (0.012, 0.012))
    waist_band(extra, spec, "belt", belt, reach + 0.008, m["leather"])
    cowl(extra, spec, "hood", m["robe"])
    # The mace, hanging head down through a loop at the right hip.
    x = w + reach + 0.02
    hang = hip_weights(spec, "R")
    grip, neck = Vector((x, 0.04, mid + 0.06)), Vector((x + 0.006, 0.0, mid - 0.24))
    rod(extra, "haft", grip, neck, 0.01, 0.01, hang, m["wood"], sides=5)
    down = (neck - grip).normalized()
    rod(extra, "mace", neck, neck + down * 0.09, 0.036, 0.03, hang, m["iron"], sides=6)
    return extra


# ---------------------------------------------------------------- the bandits and the nobles' servants
# The bandits are one gang, and every one of them wears its red: a scarf over the face or a bandana, in the sash's
# colour. Two kinds, so they aren't one body over and over:
#   the rogue: a dark hooded mantle, the red scarf over nose and mouth, a leather vest over a shirt, wrapped
#     forearms, a dagger at the right hip and another across the back of the belt, and a coin pouch;
#   the brute: a sleeveless studded vest with the arms bare, a fur mantle, the red bandana knotted at the back,
#     wrapped forearms and an axe at the left hip.
# The nobles' servant: she is the maid, in a black dress to mid-calf with white collar and cuffs, a white apron
# with a bib, and a frilled white cap; he is the footman, in the house's livery: a coat with tails, edged in braid
# with gold buttons, over a waistcoat, a white cravat, breeches and white stockings.
# The guest factions' outfits, which only guests wear (STORY.md, section 5).
FACTION_OUTFITS = ("Archer", "Warrior", "Mage", "Cleric", "Noble", "Servant", "Rogue", "Brute")
MAID_SKIRT = [SKIRT_TOP, 0.94, 0.88, 0.8, 0.7, 0.58, 0.46, 0.36, 0.27]  # to mid-calf
FOOTMAN_COAT = 1.1  # where his coat opens over the waistcoat, widening up to the cravat
MAID_COLLAR = 1.29


def face_scarf(extra, spec, fit, mat):
    """A scarf tied over the nose and mouth: in front of the face from ear to ear, hanging in a point below the chin."""
    cy = fit[1]
    chin = spec["chin_z"]
    points = spec["face_points"]
    angles = [math.radians(d) for d in range(5, 176, 17)]
    zs = [chin + 0.055, chin + 0.03, chin + 0.005, chin - 0.02]
    reach = []
    for r, z in enumerate(zs):
        row = []
        for k, a in enumerate(angles):
            best = 0.0
            for x, y, pz in points:
                if abs(pz - z) < 0.018 and abs(math.atan2(y - cy, x) - a) < 0.22:
                    best = max(best, x * math.cos(a) + (y - cy) * math.sin(a))
            if r:
                best = max(best, reach[-1][k])  # cloth falls straight from the face above
            row.append(best or 0.06)
        reach.append(row)

    def point(r, k):
        a = angles[k]
        out = reach[r][k] + 0.008
        z = zs[r] - (0.035 * math.sin(a) ** 2 if r == len(zs) - 1 else 0.0)
        return (math.cos(a) * out, cy + math.sin(a) * out, z), {"Head": 1.0}
    add_sheet(extra, "scarf", point, len(zs), len(angles), mat, 0.003)


def headband(extra, fit, key, mat, tails=True):
    """A cloth band round the brow, over the hair, knotted at the back with two tails hanging from the knot."""
    base, cy, rx, rf, rb, _ = fit
    n = HAT_SIDES
    for r, z in enumerate((base - 0.022, base + 0.004)):
        for k in range(n):
            a = 2 * math.pi * k / n
            extra.add(f"{key}{r}_{k}", 0, (math.cos(a) * (rx + 0.003), cy + math.sin(a) * ((rf if math.sin(a) > 0 else rb) + 0.003), z),
                      {"Head": 1.0})
    for k in range(n):
        k1 = (k + 1) % n
        extra.face((f"{key}1_{k}", f"{key}0_{k}", f"{key}0_{k1}", f"{key}1_{k1}"), 0, mat)
    if tails:
        y, z = cy - rb - 0.008, base - 0.01
        head = lambda co: {"Head": 1.0}
        facing(extra, f"{key}knot", (0.0, y, z), (0.014, 0.014), (0.0, -1.0), head, mat, depth=0.01)
        for i, sx in enumerate((-1, 1)):
            corners = [(sx * 0.004, y - 0.006, z), (sx * 0.02, y - 0.006, z), (sx * 0.04, y - 0.03, z - 0.12), (sx * 0.018, y - 0.03, z - 0.12)]
            add_slab(extra, f"{key}tail{i}", corners, (0.0, 0.003, 0.0), head, mat)


def bandit_cloth(spec, m, skin, sleeves):
    """The worn skin's faces a bandit's clothes cover: the archer's cut, and for the brute, no shirt under the vest."""
    faces = adventurer_cloth(spec, m, skin)
    return faces if sleeves else [(f, mat) for f, mat in faces if mat is not m["linen"]]


def build_bandit_extra(spec, m, skin, normals, surface, fit, calling):
    """The gang's red, the belt and boot tops, and each kind's own pieces."""
    extra = Skin()
    female = not spec.get("plated", False)
    name = spec["name"]
    belt = ADVENTURER_BELT[name]
    mid = sum(belt) / 2
    w, f, b = profile_at(spec, mid)
    reach = 0.014 if female else 0.02
    hips = lambda co: {"Hips": 1.0}
    waist_band(extra, spec, "belt", belt, reach, m["leather"])
    boot_cuff(extra, spec, "cuff", spec["knee_z"] + ADVENTURER_BOOT, ADVENTURER_CUFF, m)

    if calling == "rogue":
        front, back = (0.07, 0.2) if female else (0.0, 0.2)
        shell(extra, "mantle", skin, normals, shoulder_faces(spec, m, skin, front, back), lambda i: 0.036 if female else 0.026,
              m["cloak"])
        cowl(extra, spec, "hood", m["cloak"])
        face_scarf(extra, spec, fit, m["sash"])
        # A dagger at the right hip, sloping forwards, and another across the back of the belt.
        x = w + reach + 0.016
        hang = hip_weights(spec, "R")
        mouth = Vector((x, 0.04, mid))
        down = Vector((0.02, 0.15, -1.0)).normalized()
        rod(extra, "sheath", mouth, mouth + down * 0.2, 0.013, 0.007, hang, m["leather"], sides=4)
        rod(extra, "grip", mouth, mouth - down * 0.08, 0.008, 0.008, hang, m["bracer"], sides=4)
        rod(extra, "guard", mouth + Vector((0.0, -0.03, 0.0)), mouth + Vector((0.0, 0.03, 0.0)), 0.005, 0.005, hang, m["iron"], sides=4)
        yb = -(b + reach + 0.012)
        rod(extra, "backsheath", (-0.12, yb, mid - 0.005), (0.06, yb, mid + 0.025), 0.007, 0.013, hips, m["leather"], sides=4)
        rod(extra, "backgrip", (0.06, yb, mid + 0.025), (0.14, yb, mid + 0.04), 0.008, 0.008, hips, m["bracer"], sides=4)
        a = math.pi - 0.45  # the coin pouch, at the left hip a little to the front
        out = (math.cos(a), math.sin(a))
        facing(extra, "pouch", (math.cos(a) * (w + reach + 0.02), math.sin(a) * (f + reach + 0.02), mid - 0.035), (0.026, 0.032),
               out, hips, m["leather"], depth=0.02)
        return extra

    # The brute.
    front, back = (0.05, 0.16) if female else (0.02, 0.18)
    shell(extra, "mantle", skin, normals, shoulder_faces(spec, m, skin, front, back), lambda i: 0.034 if female else 0.04,
          m["cloak"])
    cowl(extra, spec, "fur", m["cloak"], gap=0.03)
    headband(extra, fit, "bandana", m["sash"])
    # Iron studs on the vest's front.
    rows = (0.93, 0.98, 1.03) if female else (1.17, 1.23, 1.29, 1.35, 1.41)
    for i, z in enumerate(rows):
        for j, x in enumerate((-0.07, -0.025, 0.025, 0.07)):
            hit = surface.hit(x, z)
            if hit:
                loc, normal, weights = hit
                at = loc + normal * 0.008
                facing(extra, f"stud{i}_{j}", tuple(at), (0.006, 0.006), (normal.x, normal.y), lambda co, w=weights: dict(w),
                       m["iron"], depth=0.004)
    facing(extra, "buckle", (0.0, f + reach + 0.004, mid), (0.024, 0.02), (0.0, 1.0), hips, m["iron"], depth=0.006)
    # The axe, hung through the belt at the left hip, its head forwards by the belt.
    x = -(w + reach + 0.02)
    hang = hip_weights(spec, "L")
    top, foot = Vector((x, 0.03, mid + 0.1)), Vector((x - 0.01, -0.03, mid - 0.4))
    rod(extra, "haft", foot, top, 0.012, 0.012, hang, m["wood"], sides=5)
    blade = [(x, 0.03, mid + 0.125), (x, 0.03, mid + 0.065), (x, 0.115, mid + 0.03), (x, 0.125, mid + 0.16)]
    add_slab(extra, "axehead", blade, (0.008, 0.0, 0.0), hang, m["iron"])
    return extra


def servant_cloth(spec, m, skin):
    """
    The worn skin's faces a servant's clothes cover. Hers: the maid's black dress with white collar and cuffs, and
    legwear under the skirt. His: the footman's coat over a waistcoat and cravat, breeches and white stockings.
    """
    male = spec.get("plated", False)
    cuff = spec["wrist_z"] + 0.03
    tee, belt = m[spec["tunic"]], m[spec["belt"]]
    dress = m["doublet"] if male else m["bodice"]
    faces = []
    for f, mat in skin.faces:
        if mat is m["stripe"] or len(f) > 4:
            continue
        bone, (cx, cy, cz) = face_bone(skin, f)
        if bone.startswith("UpperArm"):
            faces.append((f, dress))
        elif bone.startswith("ForeArm"):
            faces.append((f, m["linen"] if cz < cuff else dress))
        elif male and bone.startswith("Thigh"):
            faces.append((f, m["breeches"]))
        elif male and bone.startswith("Shin"):
            faces.append((f, m["linen"]))  # white stockings
        elif male and bone in ("Hips", "Torso"):
            if not (mat in (tee, belt) or face_leans(skin, f, "UpperArm")):
                faces.append((f, m["breeches"]))
            elif cy > 0 and cz > 1.5 and abs(cx) < 0.06:
                faces.append((f, m["linen"]))  # the cravat's fall
            elif cy > 0 and cz > FOOTMAN_COAT and abs(cx) < 0.04 + 0.12 * (cz - FOOTMAN_COAT):
                faces.append((f, m["waistcoat"]))
            else:
                faces.append((f, dress))
        elif male:
            continue
        elif is_legwear(bone, cz):
            faces.append((f, legwear_band(m, bone, cz)))
        elif bone in ("Hips", "Torso"):
            faces.append((f, m["linen"] if cz > MAID_COLLAR else dress))
    return faces


def servant_lift(spec):
    """Neat, close-fitting clothes; her cuffs and his stand out a little at the wrist."""
    male = spec.get("plated", False)
    cuff = spec["wrist_z"] + 0.03
    shoulders = None if male else spec["shoulder"][1] - 0.1

    def lift(bone, z):
        if bone.startswith("UpperArm"):
            return 0.012 if male else (0.014 if shoulders and z > shoulders - 0.02 else 0.006)
        if bone.startswith("ForeArm"):
            return 0.014 if z < cuff else (0.01 if male else 0.005)
        if bone.startswith("Thigh"):
            return 0.008 if male else 0.0
        if bone.startswith("Shin"):
            return 0.003 if male else 0.0
        if shoulders and z > shoulders:
            return 0.01
        return 0.008 if male else 0.003
    return lift


def build_servant_extra(spec, m, skin, normals, surface, fit):
    """Her skirt, apron with its bib and band, and cap; his coat's tails, braid and buttons, and the cravat."""
    extra = Skin()
    male = spec.get("plated", False)
    name = spec["name"]
    if male:
        mid = sum(ADVENTURER_BELT[name]) / 2
        robe_panel(extra, spec, "tails", mid, spec["knee_z"] + 0.05, 0.13, 0.2, 0.014, m["doublet"], front=False)
        for sx in (-1, 1):
            path = [(sx * (0.04 + 0.12 * (z / 100 - FOOTMAN_COAT) + 0.004), z / 100) for z in range(110, 151, 4)]
            lay_strap(extra, f"edge{sx}", surface, path, 0.006, 0.005, m["braid"])
            for i, z in enumerate((1.16, 1.24, 1.32, 1.4)):
                x = sx * (0.04 + 0.12 * (z - FOOTMAN_COAT) + 0.022)
                hit = surface.hit(x, z)
                if hit:
                    loc, normal, weights = hit
                    facing(extra, f"button{sx}_{i}", tuple(loc + normal * 0.008), (0.007, 0.007), (normal.x, normal.y),
                           lambda co, w=weights: dict(w), m["braid"], depth=0.005)
        z0 = spec["neck"][0][0]
        neck_band(extra, spec, "cravat", (z0 - 0.005, z0 + 0.03), 0.014, m["linen"], sides=12)
        badge(extra, "knot", surface, 1.53, (0.022, 0.016), 0.014, m["linen"])
        return extra

    skirt = (MAID_SKIRT, 0.12)
    long_skirt(extra, spec, "skirt", *skirt, m["skirt"])
    robe_panel(extra, spec, "apron", 0.975, 0.4, 0.12, 0.15, 0.008, m["apron"], skirt=skirt)
    waist_band(extra, spec, "band", (0.962, 0.99), 0.03, m["apron"])
    bib = [fc for fc in tabard_faces(spec, m, skin, 0.07, 0.96, 1.2) if face_bone(skin, fc)[1][1] > 0]
    shell(extra, "bib", skin, normals, bib, lambda i: 0.008, m["apron"])
    # The frilled cap, standing up across the top of the head from ear to ear, both sides showing.
    base, cy, rx, _, _, top = fit
    angles = [math.pi * k / 10 for k in range(11)]
    for r, grow in enumerate((0.004, 0.03)):
        for k, t in enumerate(angles):
            extra.add(f"cap{r}_{k}", 0, (math.cos(t) * (rx + grow), cy + 0.012 - 0.012 * r, base + (top - base + grow) * math.sin(t)),
                      {"Head": 1.0})
    for k in range(len(angles) - 1):
        quad = (f"cap0_{k}", f"cap0_{k + 1}", f"cap1_{k + 1}", f"cap1_{k}")
        extra.face(quad, 0, m["linen"])
        extra.face(tuple(reversed(quad)), 0, m["linen"])
    return extra


def more_outfits(spec, m, skin, normals, fit):
    """
    {outfit: (worn skin faces, where each corner sits, extra pieces)} for the outfits after the character's own:
    her dirndl and priestess's set, and the pirate's rig, the adventurer's kit and the noble's clothes for both.
    `fit` is where a hat goes on the head.
    """
    def lifted(amount):
        def place(index):
            normal = normals.get(index)
            if not normal:
                return skin.points[index]
            weights = skin.weights[index]
            bone = max(weights, key=weights.get)
            return tuple(a + b * (CLOTH_GAP + amount(bone, skin.points[index][2])) for a, b in zip(skin.points[index], normal))
        return place

    def dirndl_puff(bone, z):
        if bone.startswith("UpperArm"):
            return 0.008 if z < DIRNDL_RIBBON[1] else DIRNDL_PUFF
        if bone.startswith("ForeArm"):
            return 0.01  # the cuff flares a little below the ribbon
        return 0.0

    def priestess_lift(bone, z):
        if bone.startswith(("UpperArm", "ForeArm")):
            return 0.006 if PRIESTESS_ARMLET[0] <= z else 0.004
        return 0.002

    archer = (adventurer_cloth(spec, m, skin), lifted(adventurer_lift(spec)))
    warrior = (warrior_cloth(spec, m, skin), lifted(warrior_lift(spec)))
    mage = (robe_cloth(spec, m, skin), lifted(robe_lift(spec, bell=True)))
    cleric = (robe_cloth(spec, m, skin), lifted(robe_lift(spec, bell=False)))
    noble = (noble_cloth(spec, m, skin), lifted(noble_lift(spec)))
    rogue = (bandit_cloth(spec, m, skin, sleeves=True), lifted(adventurer_lift(spec)))
    brute = (bandit_cloth(spec, m, skin, sleeves=False), lifted(adventurer_lift(spec)))
    servant = (servant_cloth(spec, m, skin), lifted(servant_lift(spec)))
    guests = {
        "Pirate": (pirate_cloth(spec, m, skin), lifted(pirate_lift(spec)), build_pirate_extra(spec, m, fit)),
        "Archer": (*archer, build_adventurer_extra(spec, m, skin, normals, ClothSurface(skin, *archer), quiver=True)),
        "Warrior": (*warrior, build_warrior_extra(spec, m, skin, normals, ClothSurface(skin, *warrior))),
        "Mage": (*mage, build_robe_extra(spec, m, skin, normals, ClothSurface(skin, *mage), fit, "mage")),
        "Cleric": (*cleric, build_robe_extra(spec, m, skin, normals, ClothSurface(skin, *cleric), fit, "cleric")),
        "Noble": (*noble, build_noble_extra(spec, m, skin, normals, fit, ClothSurface(skin, *noble))),
        "Servant": (*servant, build_servant_extra(spec, m, skin, normals, ClothSurface(skin, *servant), fit)),
        "Rogue": (*rogue, build_bandit_extra(spec, m, skin, normals, ClothSurface(skin, *rogue), fit, "rogue")),
        "Brute": (*brute, build_bandit_extra(spec, m, skin, normals, ClothSurface(skin, *brute), fit, "brute")),
    }
    if spec.get("outfit") != "medieval":
        return guests
    return {
        "Dirndl": (dirndl_cloth(spec, m, skin), lifted(dirndl_puff), build_dirndl_extra(spec, m)),
        "Priestess": (priestess_cloth(spec, m, skin), lifted(priestess_lift), build_priestess_extra(spec, m)),
        **guests,
    }


# ---------------------------------------------------------------- what men leave on her

# Splats and drips lying on her skin, one mesh per part of her and stage: "<Name>_Cum<Section><Stage>". Each stage
# adds to the ones before it, so the game shows stages 1 to n together. The sections match the spots the game
# counts loads in (cum.ts): Face, Breasts, Body (her belly), Pussy (and her inner thighs), Ass, and Back (her lower
# back and spine, where a man behind her finishes when he pulls out), Arms and Hands.
# Off the skin by less than the clothes are (CLOTH_GAP), so a garment still covers what is under it.
COAT_LIFT = 0.0014
COAT_BULGE = 0.0012
# The body's splats come out this much bigger than written, so they still read from the game's camera at its low
# resolution; the face's stay as written.
COAT_BODY_SCALE = 1.4
# Splats as (side, x, height, radius, drips, drip length), by section and stage. Side 1 is her front, -1 her back.
# The face's are measured from the middle of her mouth; the arms' and hands' name a bone and how far down it, from 0
# at its top to 1 at its bottom (her hands are the bottom of the forearms); the rest are heights on the body.
COAT_SPLATS = {
    # Cheeks, nose and brow; her lips and chin are the Mouth's.
    "Face": [
        [(1, 0.03, 0.022, 0.011, 1, 0.03)],
        [(1, -0.032, 0.03, 0.01, 1, 0.03), (1, 0.002, 0.04, 0.006, 1, 0.025)],
        [(1, -0.012, 0.085, 0.013, 2, 0.04), (1, 0.022, 0.06, 0.008, 1, 0.05), (1, 0.03, 0.002, 0.009, 1, 0.04)],
    ],
    "Breasts": [
        [(1, 0.06, 1.17, 0.02, 1, 0.04)],
        [(1, -0.065, 1.16, 0.022, 2, 0.045), (1, 0.0, 1.13, 0.014, 1, 0.05)],
        [(1, 0.088, 1.13, 0.02, 1, 0.035), (1, -0.085, 1.12, 0.02, 1, 0.04), (1, 0.02, 1.22, 0.018, 2, 0.06),
         (1, -0.03, 1.08, 0.016, 2, 0.06)],
    ],
    "Body": [
        [(1, 0.01, 1.0, 0.022, 1, 0.04)],
        [(1, -0.045, 1.04, 0.018, 1, 0.04), (1, 0.045, 0.96, 0.016, 1, 0.05)],
        [(1, 0.0, 1.07, 0.02, 2, 0.05), (1, -0.025, 0.93, 0.02, 2, 0.07), (1, 0.05, 1.02, 0.016, 1, 0.06)],
    ],
    "Pussy": [
        [(1, 0.012, 0.8, 0.012, 1, 0.04)],
        [(1, 0.05, 0.74, 0.01, 1, 0.07), (1, -0.016, 0.79, 0.012, 1, 0.05)],
        [(1, -0.05, 0.72, 0.012, 2, 0.1), (1, 0.055, 0.68, 0.01, 1, 0.1), (1, 0.0, 0.82, 0.01, 1, 0.03),
         (1, 0.035, 0.76, 0.012, 1, 0.08)],
    ],
    "Ass": [
        [(-1, 0.05, 0.84, 0.024, 1, 0.05)],
        [(-1, -0.06, 0.82, 0.024, 2, 0.06), (-1, 0.0, 0.81, 0.016, 1, 0.06), (-1, 0.075, 0.79, 0.016, 1, 0.05)],
        [(-1, 0.065, 0.74, 0.016, 2, 0.1), (-1, -0.06, 0.73, 0.016, 2, 0.1), (-1, 0.03, 0.8, 0.014, 1, 0.06),
         (-1, -0.08, 0.86, 0.018, 1, 0.06), (-1, 0.02, 0.88, 0.018, 1, 0.05)],
    ],
    "Back": [
        [(-1, 0.0, 0.95, 0.022, 1, 0.05)],
        [(-1, -0.04, 1.0, 0.02, 1, 0.05), (-1, 0.02, 1.05, 0.016, 1, 0.06)],
        [(-1, 0.045, 1.1, 0.02, 2, 0.06), (-1, -0.03, 1.18, 0.018, 1, 0.07), (-1, 0.0, 0.9, 0.012, 1, 0.06)],
    ],
    "Arms": [
        [(1, "ForeArm_R", 0.45, 0.02, 1, 0.06)],
        [(1, "ForeArm_L", 0.4, 0.02, 1, 0.06), (1, "UpperArm_R", 0.45, 0.02, 1, 0.06)],
        [(1, "UpperArm_L", 0.5, 0.02, 2, 0.07), (1, "ForeArm_R", 0.15, 0.016, 1, 0.05), (-1, "ForeArm_L", 0.7, 0.016, 1, 0.05)],
    ],
    "Hands": [
        [(1, "ForeArm_R", 0.9, 0.016, 1, 0.03)],
        [(1, "ForeArm_L", 0.9, 0.016, 1, 0.03), (-1, "ForeArm_R", 0.92, 0.014, 1, 0.03)],
        [(-1, "ForeArm_L", 0.92, 0.014, 1, 0.03), (1, "ForeArm_R", 0.97, 0.012, 1, 0.025),
         (1, "ForeArm_L", 0.97, 0.012, 1, 0.025)],
    ],
    # What spills from her mouth: a drop on her lower lip, then her mouth's corners running, then down her chin.
    # Like the Face, places are from the middle of her lips. Last, so the sections above keep their shapes.
    "Mouth": [
        [(1, 0.003, -0.004, 0.006, 1, 0.022)],
        [(1, -0.014, -0.002, 0.0045, 1, 0.03), (1, 0.006, 0.004, 0.005, 0, 0.0)],
        [(1, 0.015, -0.003, 0.0045, 2, 0.045), (1, -0.004, -0.028, 0.008, 1, 0.05), (1, -0.006, -0.003, 0.006, 0, 0.0)],
    ],
}
COAT_ON_LIPS = ("Face", "Mouth")


# How far out from her skin a piece of clothing may lie and still take a splat that landed there.
STAIN_REACH = 0.15
# Lifted a little more off cloth than off skin: cloth is drawn pulled forward to cover her, and the stain with it.
STAIN_LIFT = 0.0018
# The parts of her no clothing covers.
STAIN_SKIPS = ("Face", "Mouth")


class CoatSurface:
    """Something a splat can lie on: the body, or one material's faces of a cloth mesh, with its skin weights."""

    def __init__(self, obj, material=None):
        self.bm = bmesh.new()
        self.bm.from_mesh(obj.data)
        if material is not None:
            others = [f for f in self.bm.faces if f.material_index != material]
            bmesh.ops.delete(self.bm, geom=others, context="FACES")
        self.bm.faces.ensure_lookup_table()
        self.deform = self.bm.verts.layers.deform.active
        self.tree = BVHTree.FromBMesh(self.bm)
        self.groups = [g.name for g in obj.vertex_groups]

    def nearest(self, point):
        loc, normal, _, _ = self.tree.find_nearest(point)
        return loc, normal

    def landed(self, side, x, z):
        loc, normal, _, _ = self.tree.ray_cast(Vector((x, side * 1.0, z)), Vector((0, -side, 0)))
        return loc, normal

    def weights_at(self, point):
        """The bone weights at a point, by group name, blended from the face under it."""
        _, _, index, _ = self.tree.find_nearest(point)
        total, out = 0.0, {}
        for vert in self.bm.faces[index].verts:
            share = 1.0 / ((vert.co - point).length + 1e-4)
            total += share
            for group, weight in vert[self.deform].items():
                out[group] = out.get(group, 0.0) + weight * share
        return {self.groups[g]: w / total for g, w in out.items() if w / total > 0.001}


# Her necklace: a cord all the way round the base of her neck, dipping to a V at the front, with a drop pendant at
# its point. Guides on one side from the back to the front, (x, y, z); each is moved onto her skin, so the cord
# lies on it rather than standing off it.
NECKLACE_PATH = [(0.0, -0.056, 1.35), (0.034, -0.048, 1.348), (0.056, -0.022, 1.344), (0.062, 0.008, 1.338),
                 (0.054, 0.034, 1.326), (0.04, 0.052, 1.31), (0.025, 0.064, 1.292), (0.011, 0.072, 1.277),
                 (0.0, 0.075, 1.268)]
NECKLACE_CORD = 0.0028  # half the cord's thickness
NECKLACE_LIFT = 0.0006  # clear of the skin under it
# The pendant: (height, half width, half depth) at its tip and where the cord holds it.
NECKLACE_PENDANT = [(1.24, 0.008, 0.004), (1.265, 0.003, 0.003)]


def build_necklace(c, m, name, body_obj, surface=None):
    """
    The necklace on the finished body, each point weighted as the skin under it, so it moves with her neck, chest
    and bust and never lifts off. Its own mesh, "<name>_JewelNecklace", so the game can take it off and put it on
    like any other piece of jewellery, with a green gem set into the front of its pendant.
    """
    surface = surface or CoatSurface(body_obj)
    piece = Skin()

    def weights(point):
        return {g[len(name) + 1:]: w for g, w in surface.weights_at(point).items()}

    # The loop: front, round her right to the back, round her left to the front again. Each stretch is cut in
    # three, so the cord follows the skin between the guides too.
    front_to_back = list(reversed(NECKLACE_PATH))
    guides = [Vector(p) for p in front_to_back + [(-x, y, z) for x, y, z in NECKLACE_PATH[1:-1]]]
    points = []
    for i, a in enumerate(guides):
        b = guides[(i + 1) % len(guides)]
        points += [a.lerp(b, t / 3) for t in range(3)]
    lying = []
    for p in points:
        loc, normal = surface.nearest(p)
        lying.append((loc + normal * (NECKLACE_CORD + NECKLACE_LIFT), normal))

    # A four-sided cord, one side always against the skin.
    count = len(lying)
    for i, (p, normal) in enumerate(lying):
        along = (lying[(i + 1) % count][0] - lying[i - 1][0]).normalized()
        out = (normal - along * normal.dot(along)).normalized()
        side = along.cross(out)
        for k, d in enumerate((out, side, -out, -side)):
            co = p + d * NECKLACE_CORD
            piece.add(f"cord{i}_{k}", 0, tuple(co), weights(co))
    for i in range(count):
        j = (i + 1) % count
        for k in range(4):
            q = (k + 1) % 4
            piece.face((f"cord{i}_{k}", f"cord{j}_{k}", f"cord{j}_{q}", f"cord{i}_{q}"), 0, m["pewter"])

    # The pendant hangs flat against her breastbone from the cord's point.
    rings = []
    for z, w, d in NECKLACE_PENDANT:
        loc, _ = surface.landed(1, 0.0, z)
        rings.append(ring(z, w, d, d, loc.y + d + NECKLACE_LIFT, n=4))
    for r, points_of_ring in enumerate(rings):
        for k, co in enumerate(points_of_ring):
            piece.add(f"pendant{r}_{k}", 0, co, weights(Vector(co)))
    for k in range(4):
        q = (k + 1) % 4
        piece.face((f"pendant0_{k}", f"pendant0_{q}", f"pendant1_{q}", f"pendant1_{k}"), 0, m["pewter"])
    for r in range(2):
        piece.face([f"pendant{r}_{k}" for k in range(4)], 0, m["pewter"])
    front = max(co[1] for co in rings[0])
    # The gem, set into the pendant's front (it used to be sewn on the dirndl, and floated there without the necklace).
    gem_at = Vector((0.0, front + 0.003, 1.245))
    facing(piece, "gem", tuple(gem_at), (0.008, 0.01), (0.0, 1.0), lambda co: weights(gem_at), m["gem"])

    mesh, kept = piece.mesh(f"{name}_JewelNecklace", piece.faces)
    return piece.link(c, mesh, kept, name, f"{name}_JewelNecklace")


# Her piercings, each its own mesh the game shows only once she's chosen it and nothing covers it: rings through her
# nipples, a bar through her navel and a ring through her clitoral hood. Each lies on the finished skin, weighted as
# the skin under it. The game moves the nipple rings out with her nipples as they stand, and the hood ring with her
# vulva as it shapes (appearance.ts), so they're built on the flat discs and the flat grid.
PIERCING_RING = {"Nipples": (0.0085, 0.0009), "Hood": (0.0055, 0.0008)}  # (radius, half the wire's thickness)
PIERCING_BEAD = {"Nipples": 0.0022, "Hood": 0.0019}
NAVEL_BAR = {"top": 0.0024, "gem": 0.0042}  # the ball above its rim and the gem in the pit, their radii
# Where along her vulva's grid (a row, from the top) the hood is as built: the shape's hood (vulvaAt in vulva.ts)
# at the default size, 0.5 + (0.5 - 0.85 * 0.36 - 0.5) * 0.84 of the way down, of 12 rows.
HOOD_ROW = 12 * (0.5 - 0.85 * 0.36 * 0.84)


def add_torus(piece, key, centre, a, b, radius, wire, weights, mat, n=16, k=6):
    """A closed ring in the plane of a and b (unit, square to each other) about centre."""
    normal = a.cross(b)
    for i in range(n):
        t = 2 * math.pi * i / n
        out = a * math.cos(t) + b * math.sin(t)
        for j in range(k):
            s = 2 * math.pi * j / k
            co = centre + out * radius + (out * math.cos(s) + normal * math.sin(s)) * wire
            piece.add(f"{key}{i}_{j}", 0, tuple(co), weights(co))
    for i in range(n):
        for j in range(k):
            i2, j2 = (i + 1) % n, (j + 1) % k
            piece.face((f"{key}{i}_{j}", f"{key}{i2}_{j}", f"{key}{i2}_{j2}", f"{key}{i}_{j2}"), 0, mat)


def add_ball(piece, key, centre, radius, weights, mat, n=8, rings=5):
    """A small closed ball about centre."""
    piece.add(f"{key}_s", 0, tuple(centre - Vector((0, 0, radius))), weights(centre))
    piece.add(f"{key}_n", 0, tuple(centre + Vector((0, 0, radius))), weights(centre))
    for r in range(1, rings):
        lat = math.pi * r / rings - math.pi / 2
        for i in range(n):
            lon = 2 * math.pi * i / n
            co = centre + Vector((math.cos(lat) * math.cos(lon), math.cos(lat) * math.sin(lon), math.sin(lat))) * radius
            piece.add(f"{key}{r}_{i}", 0, tuple(co), weights(centre))
    for i in range(n):
        i2 = (i + 1) % n
        piece.face((f"{key}_s", f"{key}1_{i2}", f"{key}1_{i}"), 0, mat)
        piece.face((f"{key}_n", f"{key}{rings - 1}_{i}", f"{key}{rings - 1}_{i2}"), 0, mat)
        for r in range(1, rings - 1):
            piece.face((f"{key}{r}_{i}", f"{key}{r}_{i2}", f"{key}{r + 1}_{i2}", f"{key}{r + 1}_{i}"), 0, mat)


def build_piercings(c, m, name, spec, body_obj, surface):
    """Her piercings, each its own "<name>_Jewel<Kind>" mesh. Returns the objects."""
    built = []

    def weights_near(point):
        return {g[len(name) + 1:]: w for g, w in surface.weights_at(point).items()}

    def finish(piece, kind):
        mesh, kept = piece.mesh(f"{name}_Jewel{kind}", piece.faces)
        built.append(piece.link(c, mesh, kept, name, f"{name}_Jewel{kind}"))

    if spec.get("nipples"):
        # A ring through each nipple from side to side, hanging down flat in front of the areola, a bead at its foot.
        piece = Skin()
        radius, wire = PIERCING_RING["Nipples"]
        for side, (start, aim) in zip("RL", NIPPLE_AIM):
            tip, normal, _, _ = surface.tree.ray_cast(Vector(start), Vector(aim).normalized())
            if normal.dot(Vector(aim)) < 0:
                normal = -normal
            across = Vector((0, 0, 1)).cross(normal).normalized()
            up = normal.cross(across).normalized()
            # Each point weighted like the skin at the nipple, so the ring moves as one with it.
            held = weights_near(tip)
            ring_at = tip - up * radius
            add_torus(piece, f"ring{side}", ring_at, across, up, radius, wire, lambda co: held, m["silver"])
            add_ball(piece, f"bead{side}", ring_at - up * radius, PIERCING_BEAD["Nipples"], lambda co: held, m["silver"])
        finish(piece, "Nipples")

    if spec.get("navel"):
        # A bar through the skin over her navel: a ball above its rim and a gem sitting in the pit.
        piece = Skin()
        hit, normal, _, _ = surface.tree.ray_cast(Vector((0.0, 0.0, spec["navel"] + NAVEL_SIZE[1] + 0.006)), Vector((0.0, 1.0, 0.0)))
        if normal.y < 0:
            normal = -normal
        held = weights_near(hit)
        top = hit + normal * (NAVEL_BAR["top"] * 0.7)
        gem = Vector((0.0, hit.y, spec["navel"] - NAVEL_LOW)) + normal * (NAVEL_BAR["gem"] * 0.35)
        add_ball(piece, "top", top, NAVEL_BAR["top"], lambda co: held, m["silver"])
        # The bar between them runs under the skin, into the pit under its upper rim.
        add_ball(piece, "gem", gem, NAVEL_BAR["gem"], lambda co: held, m["gem"], n=10, rings=6)
        finish(piece, "Navel")

    if spec.get("vulva"):
        # A ring through her hood from top to bottom, standing out from her in her middle, a bead resting below it.
        names = [mat.name for mat in body_obj.data.materials]
        grid = {names.index(n) for n in ("T_labia", "T_vulva") if n in names}
        if grid:
            mesh = body_obj.data
            uv = mesh.uv_layers.active.data
            rows = {}
            for poly in mesh.polygons:
                if poly.material_index not in grid:
                    continue
                for li in poly.loop_indices:
                    u, v = uv[li].uv
                    if abs(u - 0.5) < 1e-4:
                        rows[round(v * 12)] = mesh.vertices[mesh.loops[li].vertex_index].co.copy()
            low = int(HOOD_ROW)
            if low in rows and low + 1 in rows:
                f = HOOD_ROW - low
                hood = rows[low].lerp(rows[low + 1], f)
                down = (rows[low + 1] - rows[low]).normalized()  # along her slit, down and back
                across = Vector((1.0, 0.0, 0.0))
                normal = across.cross(down).normalized()
                if normal.y < 0:
                    normal = -normal
                radius, wire = PIERCING_RING["Hood"]
                held = weights_near(hood)
                # Through the hood at its back, the rest of the ring out in front of her, the bead at its foot.
                ring_at = hood + normal * (radius * 0.7) + down * (radius * 0.35)
                piece = Skin()
                add_torus(piece, "ring", ring_at, normal, down, radius, wire, lambda co: held, m["silver"])
                add_ball(piece, "bead", ring_at + down * radius, PIERCING_BEAD["Hood"], lambda co: held, m["silver"])
                finish(piece, "Hood")
    return built


def build_coat(c, m, name, body_obj, clothes=()):
    """
    Builds every section's stages on the finished body, weighted like the skin under them, and the same splats on
    each piece of clothing they land on, "<name>_CumOn<Outfit>_<material>_<Section><Stage>", for when she has it on.
    """
    body = CoatSurface(body_obj)
    deform, groups, bm_body = body.deform, body.groups, body.bm
    lips = {i for i, mat in enumerate(body_obj.data.materials) if mat and mat.name.startswith("T_lip")}
    lip_faces = [f for f in bm_body.faces if f.material_index in lips]
    mouth = sum((f.calc_center_median() for f in lip_faces), Vector()) / max(1, len(lip_faces))
    # Its own random numbers, so the rest of the build comes out as it always has; the clothes' have their own too,
    # so the splats on her skin stay as they were.
    rand = random.Random(11)
    cloth_rand = random.Random(23)

    # Each piece of each outfit, by outfit ("" for her own) and material.
    pieces = []
    for obj in clothes:
        outfit = obj.name[len(f"{name}_Cloth"):]
        for index in sorted({p.material_index for p in obj.data.polygons}):
            mat = obj.data.materials[index] if index < len(obj.data.materials) else None
            if mat and "." not in mat.name:
                pieces.append((outfit, mat.name, CoatSurface(obj, index)))

    def along_bone(label, share):
        """A point down the middle of a limb, from the skin it carries most of."""
        index = groups.index(f"{name}_{label}")
        points = [v.co for v in bm_body.verts if v[deform].get(index, 0.0) > 0.6]
        top, bottom = max(p.z for p in points), min(p.z for p in points)
        z = top + (bottom - top) * share
        near = [p for p in points if abs(p.z - z) < 0.02] or points
        return sum(p.x for p in near) / len(near), z

    def splat(bm, on, rnd, center, normal, radius, sides=12, bulge=COAT_BULGE, squash=1.0, lift=COAT_LIFT):
        """An uneven puddle, domed a little in the middle, lying on the skin (or cloth)."""
        across = normal.cross(Vector((0, 0, 1)))
        across = across.normalized() if across.length > 1e-4 else Vector((1, 0, 0))
        up = across.cross(normal).normalized()
        middle = bm.verts.new(center + normal * (lift + bulge))
        ring = []
        for i in range(sides):
            a = 2 * math.pi * i / sides
            r = radius * rnd.uniform(0.65, 1.2)
            loc, n = on.nearest(center + across * math.cos(a) * r + up * math.sin(a) * r * squash)
            ring.append(bm.verts.new(loc + n * lift))
        for i in range(sides):
            bm.faces.new((middle, ring[i], ring[(i + 1) % sides]))

    def drip(bm, on, rnd, start, length, width, lift=COAT_LIFT):
        """A runnel down the skin (or cloth), thinning as it goes, with a bead at its end."""
        points, at = [], start.copy()
        steps = max(3, int(length / 0.01))
        for _ in range(steps):
            loc, n = on.nearest(at)
            points.append((loc, n))
            at = loc + n * 0.002 + Vector((rnd.uniform(-0.0015, 0.0015), 0, -length / steps))
        rows = []
        for i, (loc, n) in enumerate(points):
            down = (points[min(i + 1, steps - 1)][0] - points[max(i - 1, 0)][0]).normalized()
            side = down.cross(n).normalized()
            w = width * (1 - 0.4 * i / steps)
            rows.append((bm.verts.new(loc + side * w + n * lift),
                         bm.verts.new(loc + n * (lift + COAT_BULGE)),
                         bm.verts.new(loc - side * w + n * lift)))
        for a, b in zip(rows, rows[1:]):
            bm.faces.new((a[0], b[0], b[1], a[1]))
            bm.faces.new((a[1], b[1], b[2], a[2]))
        splat(bm, on, rnd, points[-1][0], points[-1][1], width * 1.4, sides=8, bulge=COAT_BULGE * 0.8, lift=lift)

    def layer(label, bm, on):
        mesh = bpy.data.meshes.new(label)
        bm.to_mesh(mesh)
        bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = True
        mesh.materials.append(m["cum"])
        obj = bpy.data.objects.new(label, mesh)
        c.objects.link(obj)
        for vertex in mesh.vertices:
            for group, weight in on.weights_at(vertex.co).items():
                target = obj.vertex_groups.get(group) or obj.vertex_groups.new(name=group)
                target.add([vertex.index], weight, "REPLACE")
        return obj

    layers = []
    for section, stages in COAT_SPLATS.items():
        for stage, splats in enumerate(stages, 1):
            bm = bmesh.new()
            stains = {}
            for side, x, z, radius, drips, length in splats:
                if section in COAT_ON_LIPS:
                    x, z = mouth.x + x, mouth.z + z
                elif isinstance(x, str):
                    x, z = along_bone(x, z)
                if section not in COAT_ON_LIPS:
                    radius *= COAT_BODY_SCALE
                loc, normal = body.landed(side, x, z)
                if loc is None:
                    print(f"{name} {section}{stage}: nothing at x={x:.3f} z={z:.3f}")
                    continue
                splat(bm, body, rand, loc, normal, radius, sides=14, squash=0.75 if section in COAT_ON_LIPS else 1.0)
                for _ in range(drips):
                    off = Vector((rand.uniform(-0.6, 0.6) * radius, 0, -radius * 0.45))
                    drip(bm, body, rand, loc + off, length * rand.uniform(0.8, 1.2), max(0.0025, radius * 0.25))
                if section in STAIN_SKIPS:
                    continue
                # The same splat on whatever she wears over that spot: cloth outside her skin, not far from it.
                for outfit, material, on in pieces:
                    at, n = on.landed(side, x, z)
                    if at is None or (at - loc).length > STAIN_REACH or (at.y - loc.y) * side < -0.002:
                        continue
                    if (outfit, material) not in stains:
                        stains[(outfit, material)] = (bmesh.new(), on)
                    sbm = stains[(outfit, material)][0]
                    splat(sbm, on, cloth_rand, at, n, radius, sides=14, lift=STAIN_LIFT)
                    for _ in range(drips):
                        off = Vector((cloth_rand.uniform(-0.6, 0.6) * radius, 0, -radius * 0.45))
                        drip(sbm, on, cloth_rand, at + off, length * cloth_rand.uniform(0.8, 1.2),
                             max(0.0025, radius * 0.25), lift=STAIN_LIFT)
            layers.append(layer(f"{name}_Cum{section}{stage}", bm, body))
            for (outfit, material), (sbm, on) in stains.items():
                layers.append(layer(f"{name}_CumOn{outfit}_{material}_{section}{stage}", sbm, on))
    for _, _, on in pieces:
        on.bm.free()
    bm_body.free()
    return layers


def skin_character(c, m, spec, root):
    """Rebuilds a character as body, cloth, shoe and hair layers, all driven by one set of bones."""
    name = spec["name"]
    bare_skin = build_skin(spec, m, worn=False)
    skin = build_skin(spec, m, worn=True)
    stripe, bare = m["stripe"], m[spec["skin"]]

    # Hands, feet, head and small details are already modelled; bring them into world space.
    bpy.context.view_layer.update()
    parts = {o.name: o for o in c.objects if o.type == "MESH"}
    matrices = {key: o.matrix_world.copy() for key, o in parts.items()}
    for key, obj in parts.items():
        obj.parent = None
        obj.data.transform(matrices[key])
        obj.matrix_world = Matrix.Identity(4)
    # Measured now, before the head is joined into the body: a hat has to clear the head and the character's own hair.
    fit = hat_fit(spec, [parts[f"{name}_Head"], parts[f"{name}_Hair"]])
    # And the lower face, for a scarf tied over it.
    chin = spec["chin_z"]
    spec["face_points"] = [tuple(v.co) for v in parts[f"{name}_Head"].data.vertices if chin - 0.05 < v.co.z < chin + 0.09]

    # The whole body in skin, so clothes can come off or change without leaving holes; only the smallclothes stay.
    smalls, band = smallclothes(spec, bare_skin)
    painted = [(f, m["smalls"] if i in smalls else m["bra"] if i in band else bare) for i, (f, _) in enumerate(bare_skin.faces)]
    body, kept = bare_skin.mesh(f"{name}_Body", painted)
    body_obj = bare_skin.link(c, body, kept, name, f"{name}_Body")

    # The clothes are pushed out along the normals of their own closed surface.
    surface, surface_kept = skin.mesh(f"{name}_ClothSurface", [(f, bare) for f, mat in skin.faces if mat is not stripe])
    normals = {old: surface.vertices[new].normal.copy() for new, old in enumerate(surface_kept)}
    bpy.data.meshes.remove(surface)

    # Clothes sit just outside the skin and share its weights, so the two can never separate.
    def outwards(index):
        normal = normals.get(index)
        return tuple(a + b * CLOTH_GAP for a, b in zip(skin.points[index], normal)) if normal else skin.points[index]

    medieval = spec.get("outfit") == "medieval"
    worn = medieval_cloth(spec, m, skin) if medieval else [(f, mat) for f, mat in skin.faces if mat is not bare]

    def puffed(index):
        """The chemise's sleeves stand out from the arm."""
        weights = skin.weights[index]
        normal = normals.get(index)
        if not normal or not max(weights, key=weights.get).startswith("UpperArm"):
            return outwards(index)
        return tuple(a + b * (CLOTH_GAP + SLEEVE_PUFF) for a, b in zip(skin.points[index], normal))

    cloth, cloth_kept = skin.mesh(f"{name}_Cloth", worn, puffed if medieval else outwards)
    cloth_obj = skin.link(c, cloth, cloth_kept, name, f"{name}_Cloth")

    def bind(obj, group, indices=None):
        target = obj.vertex_groups.get(group) or obj.vertex_groups.new(name=group)
        target.add(list(range(len(obj.data.vertices))) if indices is None else indices, 1.0, "REPLACE")

    def join(target, others):
        filled = [obj for obj in others if obj.data.vertices]
        for obj in others:
            if not obj.data.vertices:  # Blender refuses to join only empty meshes and would leave them behind
                bpy.data.objects.remove(obj)
        if not filled:
            return target
        others = filled
        for obj in bpy.context.view_layer.objects:
            obj.select_set(False)
        for obj in others:
            obj.select_set(True)
        target.select_set(True)
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.join()
        return target

    label = lambda part: f"{name}_{part}"
    for key in ("Head", "Torso"):
        bind(parts[label(key)], label(key))
    limbs = [f"{part}_{side}" for part in ("UpperArm", "ForeArm", "Thigh") for side in "LR"]
    for key in limbs:
        bind(parts[label(key)], label(key))
    join(body_obj, [parts[label(key)] for key in ["Head", "Torso"] + limbs])
    if medieval:
        # The track pants' drawstring goes; the skirt, apron, belt and laces take its place.
        bpy.data.objects.remove(parts[label("Hips")])
        extra = build_skirt(spec, m)
        skirt, skirt_kept = extra.mesh(f"{name}_Skirt", extra.faces)
        join(cloth_obj, [extra.link(c, skirt, skirt_kept, name, f"{name}_Skirt")])
    else:
        bind(parts[label("Hips")], label("Hips"))
        join(cloth_obj, [parts[label("Hips")]])

    # The other outfits, each its own mesh, which the game shows one at a time instead of the character's own.
    outfits = []
    for outfit, (worn_faces, place, pieces) in more_outfits(spec, m, skin, normals, fit).items():
        mesh, kept = skin.mesh(f"{name}_Cloth{outfit}", worn_faces, place)
        obj = skin.link(c, mesh, kept, name, f"{name}_Cloth{outfit}")
        more, more_kept = pieces.mesh(f"{name}_Cloth{outfit}Pieces", pieces.faces)
        outfits.append(join(obj, [pieces.link(c, more, more_kept, name, f"{name}_Cloth{outfit}Pieces")]))
    # Every dress she can wear has the leg warmers and garter belt too, for the legwear styles that show them.
    # Not the outfits whose breeches or mail cover her legs.
    covered = {label(f"Cloth{outfit}") for outfit in ("Pirate", "Archer", "Warrior", "Rogue", "Brute")}
    dresses = [cloth_obj] + [obj for obj in outfits if obj.name not in covered] if medieval else []
    for dress in dresses:
        join(dress, [build_warmers(c, m, name, skin, normals)])

    shoes = parts[label("Shin_R")]
    shoes.name = shoes.data.name = f"{name}_Shoes"
    bind(shoes, label("Shin_R"))
    bind(parts[label("Shin_L")], label("Shin_L"))
    join(shoes, [parts[label("Shin_L")]])
    if medieval:
        # The same shoe shape, in leather, with the sock cuff in the stockings' colour.
        swap = {"T_shoe_w": m["leather"], "T_sole_w": m["sole_dark"], "T_pants_red": m["hose"]}
        for i, mat in enumerate(shoes.data.materials):
            if mat and mat.name in swap:
                shoes.data.materials[i] = swap[mat.name]

    # Her other shoes: both feet of each style as one mesh on the shins, and a boot's shaft on the legs above.
    shoe_styles = []
    for style in SHOE_STYLES if spec.get("shoe_styles") else []:
        key = f"Shoes{style['mesh']}"
        obj = parts[label(f"{key}_R")]
        obj.name = obj.data.name = label(key)
        bind(obj, label("Shin_R"))
        bind(parts[label(f"{key}_L")], label("Shin_L"))
        pieces = [parts[label(f"{key}_L")]]
        if style.get("shaft"):
            extra = Skin()
            boot_shaft(extra, spec, style, m)
            mesh, kept = extra.mesh(label(f"{key}Shaft"), extra.faces)
            pieces.append(extra.link(c, mesh, kept, name, label(f"{key}Shaft")))
        shoe_styles.append(join(obj, pieces))

    # Loose strands stay fixed at the root and hang more freely towards the tips.
    locks = [parts[label(f"Strand_{side}")] for side in "LR" if label(f"Strand_{side}") in parts]
    for strand, side in zip(locks, "LR"):
        head_group = strand.vertex_groups.new(name=label("Head"))
        tip_group = strand.vertex_groups.new(name=label(f"Strand_{side}"))
        for vertex in strand.data.vertices:
            t = min(1.0, max(0.0, (spec["chin_z"] + STRAND_ROOT - vertex.co.z) / STRAND_LENGTH))
            head_group.add([vertex.index], 1 - t, "REPLACE")
            tip_group.add([vertex.index], t, "REPLACE")
    hair = parts[label("Hair")]
    bind(hair, label("Head"))
    others = list(locks)
    if label("Bun") in parts:
        bind(parts[label("Bun")], label("Bun"))
        others.append(parts[label("Bun")])
    if others:
        join(hair, others)

    # The other hairstyles: on the head, and on the back below the neck so long hair lies on it.
    styles = [obj for key, obj in parts.items() if key.startswith(label("Hair")) and key != label("Hair")]
    for style in styles:
        head_group = style.vertex_groups.new(name=label("Head"))
        torso_group = style.vertex_groups.new(name=label("Torso"))
        for vertex in style.data.vertices:
            t = min(1.0, max(0.0, (spec["neck_z"] - 0.01 - vertex.co.z) / HAIR_ONTO_BACK))
            if t < 1:
                head_group.add([vertex.index], 1 - t, "REPLACE")
            if t > 0:
                torso_group.add([vertex.index], t, "REPLACE")
    if spec.get("jiggle"):
        hair_spring_weights(spec, name, [hair, *styles], (body_obj, cloth_obj, *outfits))

    if spec.get("jiggle"):
        # The soft parts get more faces, so the game can grow and drop them and they stay round.
        for layer in (body_obj, cloth_obj, *outfits):
            round_ribs(layer, name)
            refine_soft_parts(layer, name)
            refine_soft_parts(layer, name, REFINE_AGAIN)
            if spec.get("navel"):
                for reach in NAVEL_REFINE:
                    refine_soft_parts(layer, name, navel_regions(spec, reach))
            if spec.get("vulva"):
                for share in VULVA_REFINE:
                    refine_soft_parts(layer, name, vulva_regions(share))
                refine_soft_parts(layer, name, OPENING_REFINE, smooth=0.0, touching=True)
        # On the refined faces, so each breast is one round dome however finely it's cut.
        round_breasts(body_obj, (cloth_obj, *outfits))
        add_jiggle_weights(name, (body_obj, cloth_obj, *outfits))
    for dress in dresses:
        join(dress, [build_garter(c, m, name, dress)])
    if spec.get("jiggle"):
        # Built on the finished body, so it lies on the refined bust and takes the springs' weights too. Not on the
        # factions' outfits, which only guests wear, and guests never show what's on them.
        worn = [obj for obj in outfits if obj.name not in {label(f"Cloth{o}") for o in FACTION_OUTFITS}]
        coat = build_coat(c, m, name, body_obj, (cloth_obj, *worn))
    else:
        coat = []
    if spec.get("nipples"):
        # After the coat, so what lands on her breasts lies over them instead of copying them.
        add_nipples(m, name, body_obj)
    if spec.get("navel"):
        # Before the pubic patch, which copies the skin it lies over as it is.
        press_navel(spec, m, body_obj)
    if spec.get("pubes"):
        add_pubes(m, name, body_obj)
    if spec.get("vulva"):
        # After the pubic patch, which copies every front face over her mound and would copy the grid too.
        add_vulva(m, name, body_obj)
    if spec.get("anus"):
        add_anus(m, name, body_obj)
    if spec.get("penis"):
        add_penis(m, name, body_obj)
    if spec.get("lingerie"):
        # Last, so it copies only the finished skin, never the pubic patch or the nipple discs.
        add_lingerie(m, name, body_obj)
    # Her jewellery, each piece its own mesh on the finished skin, so the game can put it on and take it off.
    jewels = []
    if spec.get("necklace"):
        surface = CoatSurface(body_obj)
        jewels.append(build_necklace(c, m, name, body_obj, surface))
        jewels += build_piercings(c, m, name, spec, body_obj, surface)

    armature = bpy.data.armatures.new(f"{name}_Bones")
    rig = bpy.data.objects.new(f"{name}_Armature", armature)
    c.objects.link(rig)
    rig.parent = root
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    joints = character_joints(spec)
    for bone_name, (_, head) in joints.items():
        bone = armature.edit_bones.new(bone_name)
        bone.head = head
        bone.tail = (head[0], head[1], head[2] + BONE_LENGTH)
        bone.roll = 0.0
    for bone_name, (parent, _) in joints.items():
        if parent:
            armature.edit_bones[bone_name].parent = armature.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")

    for layer in (body_obj, cloth_obj, *outfits, shoes, *shoe_styles, hair, *styles, *coat, *jewels):
        layer.parent = rig
        layer.modifiers.new("Bones", "ARMATURE").object = rig


def export_collection(coll, path):
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in coll.objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True,
                              export_extras=True, export_yup=True, export_cameras=False,
                              export_lights=False, export_apply=True)
    tris = sum(len(p.vertices) - 2 for o in coll.objects if o.type == "MESH" for p in o.data.polygons)
    print(f"{os.path.basename(path)}: {len(coll.objects)} objects, {tris} triangles, "
          f"{os.path.getsize(path) / 1024:.0f} KB")


def build_props(c, m):
    """Gameplay models. Item_* sit at the origin to be carried; Station_* and Spot_* are placed in the room."""
    ale = Part(c, "Item_Ale")
    ale.lathe(0, 0, 0, [(0.055, 0), (0.062, 0.12)], 8, m["pewter"], m["foam"])
    ale.lathe(0, 0, 0.12, [(0.062, 0), (0.05, 0.03)], 8, m["foam"])
    ale.box(0.078, 0, 0.03, 0.035, 0.02, 0.07, m["pewter"])
    ale.done()

    bread = Part(c, "Item_Bread")
    bread.lathe(0, 0, 0, [(0.11, 0), (0.15, 0.025)], 8, m["ceramic"])
    bread.lathe(0, 0, 0.025, [(0.07, 0), (0.1, 0.04), (0.06, 0.08), (0.012, 0.095)], 8, m["bread"])
    bread.done()

    stew = Part(c, "Item_Stew")
    stew.lathe(0, 0, 0, [(0.07, 0), (0.12, 0.08)], 8, m["ceramic"], m["stew"])
    stew.done()

    Part(c, "Item_Cask").lathe(0, 0, 0, [(0.12, 0), (0.16, 0.13), (0.12, 0.27)], 8, m["barrel"], m["wood"]).done()

    tap = Part(c, "Station_Tap")
    tap.lathe(1.1, 2.9, 1.1, [(0.16, 0), (0.2, 0.18), (0.16, 0.36)], 10, m["barrel"], m["wood"])
    tap.box(1.1, 2.68, 1.22, 0.05, 0.16, 0.05, m["iron"])
    tap.box(1.1, 2.64, 1.26, 0.04, 0.04, 0.13, m["iron"])
    tap.done()

    pot = Part(c, "Station_Pot")
    pot.lathe(-6.0, 0.5, 0.22, [(0.16, 0), (0.28, 0.12), (0.3, 0.28), (0.25, 0.42)], 8, m["iron"], m["soot"])
    for i in range(3):
        a = i * 2 * math.pi / 3 + 0.5
        pot.box(-6.0 + 0.22 * math.cos(a), 0.5 + 0.22 * math.sin(a), 0, 0.05, 0.05, 0.3, m["iron"], swap=True)
    pot.done()
    # Separate so the game can show or recolour what is in the pot.
    Part(c, "Station_PotStew").lathe(-6.0, 0.5, 0.63, [(0.24, 0), (0.24, 0.015)], 8, m["stew"]).done()

    basket = Part(c, "Station_Bread")
    basket.lathe(-5.15, -4.3, 0.8, [(0.2, 0), (0.3, 0.14)], 8, m["crate"], m["soot"])
    for dx, dy in ((-0.1, 0.05), (0.1, 0.07), (0.0, -0.1)):
        basket.lathe(-5.15 + dx, -4.3 + dy, 0.9, [(0.07, 0), (0.1, 0.05), (0.06, 0.1), (0.012, 0.12)], 7, m["bread"])
    basket.done()

    for name, x, y in (("Tap", 1.1, 2.75), ("Pot", -5.7, 0.5), ("Bread", -5.15, -3.9), ("Barrel", 6.0, -3.6)):
        empty(c, "Spot_" + name, (x, y, 0))


def main():
    os.makedirs(TEX_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    scene = reset_scene()
    world = bpy.data.collections.new("World")
    scene.collection.children.link(world)

    mats = make_materials()
    build_room(world, mats)
    build_fireplace(world, mats)
    build_bar(world, mats)
    build_furniture(world, mats)
    empty(world, "PlayerSpawn", (0.6, 0.2, 0))
    export_collection(world, os.path.join(OUT_DIR, "world.glb"))

    # Made after the room so that new character colours never shift the room's random numbers.
    for key, colour in (("tee_white", (0.85, 0.84, 0.8)), ("hair_f", (0.075, 0.06, 0.06)), ("skin_f", (0.86, 0.63, 0.5)),
                        ("pants_red", (0.62, 0.09, 0.11)), ("waistband", (0.5, 0.07, 0.09)),
                        ("stripe", (0.88, 0.86, 0.82)), ("shoe_w", (0.88, 0.87, 0.85)), ("sole_w", (0.74, 0.72, 0.7)),
                        ("eye_white", (0.92, 0.92, 0.9)), ("blush", (0.85, 0.585, 0.47)), ("lip", (0.8, 0.44, 0.43))):
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour))
    # The female face tones are nearly flat, so its planes read as clean shapes. They also leave the random numbers as they were.
    random_state = rng.bit_generator.state
    for key, colour in (("face_lit", (0.92, 0.71, 0.58)), ("face_skin", (0.86, 0.63, 0.5)), ("face_mid", (0.8, 0.58, 0.47)),
                        ("face_blush", (0.87, 0.6, 0.52)), ("face_pink", (0.92, 0.55, 0.52)), ("face_white", (0.98, 0.9, 0.84)),
                        ("face_cool", (0.8, 0.59, 0.5)), ("lip_lit", (0.9, 0.6, 0.58)),
                        # Inside her mouth.
                        ("mouth", (0.3, 0.09, 0.1)), ("teeth", (0.93, 0.9, 0.84)), ("teeth_low", (0.9, 0.87, 0.8)),
                        ("tongue", (0.78, 0.4, 0.42)),
                        # The lines an expression draws on her face.
                        ("crease", (0.36, 0.16, 0.14)), ("crease_mid", (0.36, 0.16, 0.14)), ("hatch", (0.78, 0.2, 0.25))):
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour, variation=0.03))
    rng.bit_generator.state = random_state
    # The male face colours put the random numbers back afterwards, so the textures made after them stay the same.
    random_state = rng.bit_generator.state
    for key, colour in (("skin_lit", (0.8, 0.59, 0.46)), ("skin_shade", (0.62, 0.42, 0.33)), ("skin_deep", (0.3, 0.17, 0.14)),
                        ("lip_m", (0.62, 0.4, 0.33)), ("eye_line", (0.07, 0.05, 0.05)), ("iris_m", (0.1, 0.13, 0.15)),
                        ("eye_m", (0.78, 0.74, 0.68)),
                        ("hair_m", (0.055, 0.07, 0.08)), ("hair_m_warm", (0.13, 0.09, 0.075))):
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour))
    rng.bit_generator.state = random_state
    # The female's medieval outfit, likewise without moving the random numbers.
    random_state = rng.bit_generator.state
    for key, colour in MEDIEVAL_COLOURS:
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour))
    rng.bit_generator.state = random_state
    # The pirate's rig, the same way.
    random_state = rng.bit_generator.state
    for key, colour in PIRATE_COLOURS:
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour))
    rng.bit_generator.state = random_state
    # The adventurer's kit and the noble's clothes, the same way.
    random_state = rng.bit_generator.state
    for key, colour in GUEST_COLOURS:
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour))
    rng.bit_generator.state = random_state
    # What men leave on her, likewise.
    random_state = rng.bit_generator.state
    mats["cum"] = material("T_cum", tex_flat("T_cum", (0.93, 0.92, 0.87)))
    rng.bit_generator.state = random_state
    # Her areolae, likewise. One flat colour: the game tints it with her skin and flushes it as she's aroused.
    random_state = rng.bit_generator.state
    mats["areola"] = material("T_areola", tex_flat("T_areola", (0.74, 0.47, 0.42), variation=0.02))
    rng.bit_generator.state = random_state
    # Her pubic hair, likewise: one flat colour, her hair's own, so it follows her hair's dye. The game draws its style.
    random_state = rng.bit_generator.state
    mats["pubic"] = material("T_pubic", tex_flat("T_pubic", (0.075, 0.06, 0.06), variation=0.02))
    rng.bit_generator.state = random_state
    # The inside of her navel, likewise: her skin (skin_f) in shadow. The game tones it along with her skin.
    random_state = rng.bit_generator.state
    mats["navel"] = material("T_navel", tex_flat("T_navel", (0.52, 0.33, 0.26), variation=0.02))
    rng.bit_generator.state = random_state
    # Her vulva, likewise: the slit and inner lips one flat pink the game tints with her skin and flushes as she's
    # aroused, and the outer lips her skin (skin_f), which the game tones along with it.
    random_state = rng.bit_generator.state
    mats["vulva"] = material("T_vulva", tex_flat("T_vulva", (0.76, 0.44, 0.43), variation=0.02))
    # Nearly flat: its UVs carry the grid, so the skin's mottling would come out much finer on it than on her.
    mats["labia"] = material("T_labia", tex_flat("T_labia", (0.86, 0.63, 0.5), variation=0.03))
    # Her canal, a deeper pink, which the game dyes along with the slit.
    mats["canal"] = material("T_canal", tex_flat("T_canal", (0.6, 0.26, 0.29), variation=0.02))
    # Her anus: its rim and canal a darker, browner pink, and the rest of its disc her skin.
    mats["anus"] = material("T_anus", tex_flat("T_anus", (0.62, 0.38, 0.35), variation=0.02))
    mats["anus_skin"] = material("T_anus_skin", tex_flat("T_anus_skin", (0.86, 0.63, 0.5), variation=0.03))
    # The skin under her openings, hidden while they show and otherwise in her smallclothes, as around it.
    mats["hole"] = material("T_hole", tex_flat("T_hole", (0.74, 0.68, 0.58)))
    rng.bit_generator.state = random_state
    # His penis and scrotum, likewise: the shaft and sack his skin (skin) a little darker, which the game tones with
    # his skin, and the glans one flat pink it tints with his skin and flushes as he's aroused. Nearly flat, as their
    # UVs carry their rings and spokes.
    random_state = rng.bit_generator.state
    mats["penis"] = material("T_penis", tex_flat("T_penis", (0.68, 0.46, 0.36), variation=0.03))
    mats["glans"] = material("T_glans", tex_flat("T_glans", (0.72, 0.42, 0.4), variation=0.02))
    mats["scrotum"] = material("T_scrotum", tex_flat("T_scrotum", (0.62, 0.41, 0.33), variation=0.03))
    rng.bit_generator.state = random_state
    # Her underwear styles' patch, likewise: plain white, which the game draws each style on in its own colours.
    random_state = rng.bit_generator.state
    mats["lingerie"] = material("T_lingerie", tex_flat("T_lingerie", (1.0, 1.0, 1.0), variation=0.0))
    rng.bit_generator.state = random_state
    # Her piercings' bright metal, likewise.
    random_state = rng.bit_generator.state
    mats["silver"] = material("T_silver", tex_flat("T_silver", (0.82, 0.82, 0.86), variation=0.0))
    rng.bit_generator.state = random_state
    for spec, blender_x in ((MALE, -0.6), (FEMALE, 0.6)):
        coll = bpy.data.collections.new(spec["name"] + "Rig")
        scene.collection.children.link(coll)
        root = build_character(coll, mats, spec)
        export_collection(coll, os.path.join(OUT_DIR, spec["name"].lower() + ".glb"))
        # Exported at the origin; moved afterwards so they don't overlap in Blender.
        root.location.x = blender_x

    for key, colour in (("foam", (0.88, 0.8, 0.6)), ("stew", (0.46, 0.24, 0.1)), ("bread", (0.74, 0.48, 0.2))):
        mats[key] = material("T_" + key, tex_flat("T_" + key, colour))
    props = bpy.data.collections.new("Props")
    scene.collection.children.link(props)
    build_props(props, mats)
    export_collection(props, os.path.join(OUT_DIR, "props.glb"))


main()
