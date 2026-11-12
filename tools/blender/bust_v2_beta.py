"""
Bust v2 -- BETA DRAFT. Not used by the game: nothing in build_world.py or src/ reads this file.

What it tries: instead of stretching her small modelled breast up to Q (which keeps its pointy shape and its
narrow root, so big sizes read as a shelf, a log or a balloon on a neck), it cuts each breast out of the chest
and rebuilds it as low-poly rings round the nipple (a dartboard: RINGS rings of SPOKES points), then sculpts it
along each spoke with a curve from the chest to the nipple:

  * the base is the area anatomy gives (roughly the 2nd to 6th rib, the edge of the breastbone to the side of
    the chest), and the breast leaves the chest from a wider part of it as it grows;
  * the upper spokes run nearly straight (the upper slope), the lower ones swing forwards and down (the full
    lower curve), with the nipple at the tip, below the middle -- the usual 45:55 proportion;
  * "held" is the shape in clothes (lifted, nipple tipped up a little); "bare" lets it sink and pool.

The new faces take the skin's own texture, laid on to continue the chest's, and are about as big as the rest of
her body's faces, so the bust keeps her low-poly look.

Status (beta): the mesh is clean (no folds or flipped faces) but the look is not there yet --
  * from the side the bigger sizes still read as cones sticking out; the lower curve is too straight;
  * the root still shows where the breast leaves the chest (a crease round the base, small wrinkles towards
    the armpit), so at small sizes it looks stuck on rather than growing out of the chest;
  * from the front the big sizes look a little like lemons, pointing down and out; small bumps on the breastbone;
  * sizes are not yet measured against the cup letters, and nothing for the game exists yet (shaping code,
    held/bare switching, nipple discs, clothes fitting).
Next step being considered: sculpt a few key shapes by hand on this mesh (small, medium, big held, big bare) and
blend between them, rather than shaping by formula.

Run it in Blender's text editor, or headless:
  blender -b --factory-startup --python tools/blender/bust_v2_beta.py -- [--glb public/models/female.glb] [--render out.png]
It builds a scene "Bust v2 beta": four rows (held front, held side, bare front, bare side) from small to Q.
"""

import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.kdtree import KDTree

ROOT = os.environ.get("TARVEN_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCENE = "Bust v2 beta"

# Where each breast's base sits on the chest (Blender space: z up, +y her front), by its middle and reach.
BASE_X = 0.076
BASE_Z = 1.155
BASE_REACH = (0.072, 0.095, 0.075)  # sideways, upwards, downwards
# The loft's size for each cup letter, held, measured with the game's own rule: over-bust (a tape round the fullest
# part, arms left out) = 57 cm + 2.54 cm per letter (A = 1 inch, Q = 17). Bare uses the same size; it just hangs
# lower. Only true for SHAPE as it stands: re-measure after changing it.
CUP_SIZES = {
    "A": 0.0, "B": 0.1448, "C": 0.2334, "D": 0.3179, "E": 0.4066, "F": 0.4864, "G": 0.5747, "H": 0.6603,
    "I": 0.7445, "J": 0.8182, "K": 0.9, "L": 0.9796, "M": 1.0606, "N": 1.1416, "O": 1.2227, "P": 1.3025, "Q": 1.386,
}
RINGS = 7
SPOKES = 16

# The sculpt, as fractions of how far the breast stands out (H). See loft() for what each one does.
SHAPE = dict(
    H0=0.02, H1=0.15,      # stands out H0 + H1 * size
    r00=0.55, r01=0.45,    # leaves the chest this far out along the base, growing with size
    drop=0.22,             # the nipple sits this far below the middle of the base
    tilt=0.04,             # held: it tips up this much
    sink=0.35,             # bare: it sinks this much further
    splay=0.06,            # each points a little outwards
    inX=-0.05,             # and its tip sits a little towards the middle
    a0=0.6, a1=0.35,       # how far forward each spoke swings before turning to the tip (less at the top)
    b0=0.06, b1=0.08, b2=0.08, bIn=0.12,  # how far it bulges past its base (more below, outside and inside)
    slide=0.12,            # the top leaves the chest along it
    bareA=0.3, pool=0.45,  # bare: the top flattens, the bottom pools
    cap=0.3, cap2=0.22,    # how round the tip is
    ringBias=1.35,         # rings closer together towards the tip, so the front stays round
)


def import_body(glb):
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    for obj in list(scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    if bpy.context.window:
        bpy.context.window.scene = scene
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb)
    new = [o for o in bpy.data.objects if o not in before]
    body = next(o for o in new if o.type == "MESH" and o.name.startswith("Female_Body"))
    keep = {body, body.parent}
    for obj in new:
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)
    return scene, body


def rebuild(body):
    """
    A copy of her body mesh with each breast cut out and filled with rings round the nipple, joined to the chest
    by a strip of triangles. Returns the mesh, the rings' vertex indices by side, and their rest positions.
    """
    source = body.data
    bm = bmesh.new()
    bm.from_mesh(source)
    mats = [m.name.split(".")[0] for m in source.materials]
    deform = bm.verts.layers.deform.active
    uvl = bm.loops.layers.uv.active
    skin = mats.index("T_skin_f")
    if "T_areola" in mats:
        disc = mats.index("T_areola")
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == disc], context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    # The exported model is split at its seams; weld it so the cut has one edge.
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.0002)
    built = {}
    for side in (-1, 1):
        cx = side * BASE_X
        rx, up, down = BASE_REACH

        def inside(p):
            dx = (p.x - cx) / rx
            dz = (p.z - BASE_Z) / (up if p.z > BASE_Z else down)
            return dx * dx + dz * dz < 1.0 and p.y > -0.01

        chosen = [f for f in bm.faces if f.normal.y > 0.0 and all(inside(v.co) for v in f.verts)]
        # Only the biggest connected piece, so the hole has one edge.
        pool, seen, cut = set(chosen), set(), []
        for f in chosen:
            if f in seen:
                continue
            piece, stack = [], [f]
            seen.add(f)
            while stack:
                g = stack.pop()
                piece.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h in pool and h not in seen:
                            seen.add(h)
                            stack.append(h)
            if len(piece) > len(cut):
                cut = piece
        cutset = set(cut)
        rim = [e for e in {e for f in cut for e in f.edges} if sum(1 for f in e.link_faces if f in cutset) == 1]
        nxt = {}
        for e in rim:
            a, b = e.verts
            nxt.setdefault(a, []).append(b)
            nxt.setdefault(b, []).append(a)
        start = next(iter(nxt))
        loop, prev, cur = [start], None, start
        while True:
            n = [v for v in nxt[cur] if v is not prev][0]
            if n is start:
                break
            loop.append(n)
            prev, cur = cur, n
        # The skin texture round the hole, (x, z) -> uv, so the new faces continue it.
        xs, us = [], []
        for v in loop:
            for corner in v.link_loops:
                if corner.face not in cutset:
                    xs.append((v.co.x, v.co.z, 1.0))
                    us.append(corner[uvl].uv[:])
        uvfit, *_ = np.linalg.lstsq(np.array(xs), np.array(us), rcond=None)
        uv_at = lambda p: tuple((np.array([p.x, p.z, 1.0]) @ uvfit).tolist())
        # Bone weights for new points, from the skin they replace.
        old = list({v for f in cut for v in f.verts})
        tree = KDTree(len(old))
        for i, v in enumerate(old):
            tree.insert(Vector((v.co.x, 0, v.co.z)), i)
        tree.balance()
        old_weights = [dict(v[deform]) for v in old]

        def weights_at(p):
            total, out = 0.0, {}
            for _, i, dist in tree.find_n(Vector((p.x, 0, p.z)), 4):
                w = 1 / (dist + 1e-4)
                total += w
                for g, val in old_weights[i].items():
                    out[g] = out.get(g, 0.0) + val * w
            return {g: val / total for g, val in out.items()}

        keep = set(loop)
        # The skin round the hole, two edges deep, for the chest's curve under the breast.
        inner = set(old) - keep
        around, front = set(loop), set(loop)
        for _ in range(2):
            front = {e.other_vert(v) for v in front for e in v.link_edges} - inner - around
            around |= front
        bmesh.ops.delete(bm, geom=cut, context="FACES_ONLY")
        bmesh.ops.delete(bm, geom=[v for v in old if v not in keep and not v.link_faces], context="VERTS")
        centre = Vector((cx, 0.0, BASE_Z))
        ang = np.array([math.atan2(v.co.x - centre.x, v.co.z - centre.z) for v in loop])
        if np.median(np.diff(np.unwrap(ang))) < 0:
            loop, ang = loop[::-1], ang[::-1]
        bx = np.array([v.co.x for v in loop])
        bz = np.array([v.co.z for v in loop])

        def by_angle(values, th):
            dd = (ang - th + math.pi) % (2 * math.pi) - math.pi
            i = np.argsort(np.abs(dd))[:3]
            w = 1 / (np.abs(dd[i]) + 1e-3)
            return float((values[i] * w).sum() / w.sum())

        spokes = np.arange(SPOKES) * 2 * math.pi / SPOKES - math.pi
        reach = np.array([by_angle(np.hypot(bx - centre.x, bz - centre.z), th) for th in spokes])
        for _ in range(2):
            reach = (np.roll(reach, 1) + 2 * reach + np.roll(reach, -1)) / 4
        # The chest under the breast, filled in from the hole's edge rather than guessed: a smooth bowl fitted to
        # the skin round the hole gives its curve, and whatever the edge does beyond the bowl is carried in across
        # it like a drum skin (each ripple fading towards the middle as a stretched membrane's does), so the fill
        # meets the edge exactly and never sinks below the skin round it.
        pts = np.array([v.co[:] for v in around])
        dx, dz = pts[:, 0] - cx, pts[:, 2] - BASE_Z
        bowl_c, *_ = np.linalg.lstsq(np.stack([np.ones_like(dx), dx, dz, dx * dx, dz * dz, dx * dz], 1), pts[:, 1], rcond=None)

        def bowl(x, z):
            a, b = x - cx, z - BASE_Z
            return float(bowl_c @ np.array([1.0, a, b, a * a, b * b, a * b]))

        edge = np.array([v.co.y - bowl(v.co.x, v.co.z) for v in loop])
        waves = 64
        start = -math.pi
        ripple = np.fft.rfft([by_angle(edge, start + 2 * math.pi * i / waves) for i in range(waves)]) / waves
        orders = np.arange(1, 9)

        def drum(th, rho):
            turn = np.exp(1j * orders * (th - start))
            return float(ripple[0].real + 2 * np.sum((ripple[orders] * turn).real * rho ** orders))

        centre.y = bowl(centre.x, centre.z) + drum(0.0, 0.0)
        middle = bm.verts.new(centre)
        for g, val in weights_at(centre).items():
            middle[deform][g] = val
        rings = []
        for k in range(1, RINGS):
            q = k / RINGS * 0.97
            row = []
            for j, th in enumerate(spokes):
                x = centre.x + math.sin(th) * reach[j] * q
                z = centre.z + math.cos(th) * reach[j] * q
                y = bowl(x, z) + drum(th, q)
                v = bm.verts.new(Vector((x, y, z)))
                for g, val in weights_at(v.co).items():
                    v[deform][g] = val
                row.append(v)
            rings.append(row)
        faces = []

        def face(corners):
            f = bm.faces.new(corners)
            f.material_index = skin
            f.smooth = True
            for corner in f.loops:
                corner[uvl].uv = uv_at(corner.vert.co)
            faces.append(f)

        for j in range(SPOKES):
            jn = (j + 1) % SPOKES
            face((middle, rings[0][j], rings[0][jn]))
            for k in range(RINGS - 2):
                face((rings[k][j], rings[k + 1][j], rings[k + 1][jn], rings[k][jn]))
        # The strip: each point of the hole's edge joins the spoke nearest it in angle.
        outer = rings[-1]
        nearest = [int(round(((a + math.pi) % (2 * math.pi)) / (2 * math.pi / SPOKES))) % SPOKES for a in ang]
        for jb in range(len(loop)):
            jn = (jb + 1) % len(loop)
            i0, i1 = nearest[jb], nearest[jn]
            face((outer[i0], loop[jb], loop[jn]))
            i, steps = i0, 0
            while i != i1 and steps < SPOKES:
                face((outer[i], loop[jn], outer[(i + 1) % SPOKES]))
                i, steps = (i + 1) % SPOKES, steps + 1
        bm.normal_update()
        for f in faces:
            if f.normal.y < 0:
                f.normal_flip()
        built[side] = (middle, rings)
    bm.normal_update()
    bm.verts.index_update()
    rings = {s: dict(centre=c.index, rings=[[v.index for v in row] for row in r]) for s, (c, r) in built.items()}
    mesh = bpy.data.meshes.new("Female_Body_bust_v2")
    bm.to_mesh(mesh)
    bm.free()
    for m in source.materials:
        mesh.materials.append(m)
    rest = np.array([v.co[:] for v in mesh.vertices])
    return mesh, rings, rest


def bezier(p0, p1, p2, p3, t):
    t = t[:, None]
    u = 1 - t
    return u ** 3 * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t ** 3 * p3


def loft(rest, rings, size, bare, shape=SHAPE):
    """Her points with both breasts sculpted at this size (0 is an A cup; CUP_SIZES gives each letter), held in clothes or bare."""
    s = shape
    out = rest.copy()
    height = s["H0"] + s["H1"] * size
    attach = max(2, min(RINGS - 1, int(round((s["r00"] + s["r01"] * size) * (RINGS - 1)))))
    drop = s["drop"] * height + (s["sink"] * height if bare else -s["tilt"] * height)
    for side, info in rings.items():
        centre = rest[info["centre"]]
        rows = [np.array([centre] * SPOKES)] + [rest[np.array(r)] for r in info["rings"]]
        out_dir = rows[-1] - centre
        out_dir[:, 1] = 0
        out_dir /= np.linalg.norm(out_dir, axis=1, keepdims=True)
        upness = out_dir[:, 2]
        outness = side * out_dir[:, 0]
        forward = np.array([side * s["splay"], 1.0, 0.0])
        forward /= np.linalg.norm(forward)
        tip = centre + forward * height + np.array([side * s["inX"] * height, 0, -drop])
        p0 = rows[attach]
        swing = s["a0"] - s["a1"] * upness
        bulge = s["b0"] - s["b1"] * upness + s["b2"] * outness + s["bIn"] * np.clip(-outness, 0, 1)
        slide = s["slide"] * np.clip(upness, 0, 1)
        if bare:
            swing = swing - s["bareA"] * np.clip(upness, 0, 1)
            bulge = bulge + s["pool"] * np.clip(-upness, 0, 1)
        p1 = p0 + forward[None, :] * (swing * height)[:, None] + out_dir * ((bulge - slide) * height)[:, None]
        p2 = tip[None, :] + out_dir * (s["cap"] * height) - forward[None, :] * (s["cap2"] * height)
        for k in range(attach):
            if k == 0:
                out[info["centre"]] = tip
                continue
            t = np.full(SPOKES, 1 - (k / attach) ** s["ringBias"])
            out[np.array(info["rings"][k - 1])] = bezier(p0, p1, p2, np.array([tip] * SPOKES), t)
    return out


def lineup(scene, mesh, rings, rest):
    """Held front, held side, bare front and bare side, from small (left) to Q (right), every other letter."""
    letters = ["A", "C", "E", "G", "I", "K", "M", "O", "Q"]
    sizes = [CUP_SIZES[letter] for letter in letters]
    mats = [m.name.split(".")[0] for m in mesh.materials]
    skin = mesh.materials[mats.index("T_skin_f")]
    ink = bpy.data.materials.get("Bust v2 label") or bpy.data.materials.new("Bust v2 label")
    ink.diffuse_color = (0.02, 0.02, 0.02, 1)
    rows = [(False, "front", 0.0), (False, "side", -1.75), (True, "front", -3.6), (True, "side", -5.35)]
    for i, (letter, size) in enumerate(zip(letters, sizes)):
        x = -(i - 4) * 0.6
        for bare, view, z in rows:
            m = mesh.copy()
            m.vertices.foreach_set("co", np.asarray(loft(rest, rings, size, bare), dtype=np.float32).ravel())
            m.update()
            # Bare skin: no smallclothes, and no pubic hair patch (its cut-out only draws in the game).
            for name in ("T_smalls", "T_pubic"):
                if name in mats:
                    m.materials[mats.index(name)] = skin
            obj = bpy.data.objects.new(f"Bust v2 {letter} {'bare' if bare else 'held'} {view}", m)
            scene.collection.objects.link(obj)
            obj.rotation_euler = (0, 0, 0 if view == "front" else -math.pi / 2)
            obj.location = (x, 0, z)
        for z in (0.0, -3.6):
            text = bpy.data.curves.new(f"Bust v2 label {letter}", "FONT")
            text.body = letter
            text.size = 0.16
            text.align_x = "CENTER"
            label = bpy.data.objects.new(text.name, text)
            label.data.materials.append(ink)
            label.location = (x, 0.3, 1.75 + z)
            label.rotation_euler = (math.pi / 2, 0, math.pi)
            scene.collection.objects.link(label)
    for name, energy, rot in (("Bust v2 sun", 3.0, (1.0, 0.3, 2.6)), ("Bust v2 fill", 2.0, (1.2, 0, math.pi * 0.9))):
        light = bpy.data.lights.new(name, "SUN")
        light.energy = energy
        obj = bpy.data.objects.new(name, light)
        obj.rotation_euler = rot
        scene.collection.objects.link(obj)
    cam = bpy.data.cameras.new("Bust v2 camera")
    cam.type = "ORTHO"
    cam.ortho_scale = 7.6
    cam_obj = bpy.data.objects.new(cam.name, cam)
    cam_obj.location = (0, 5, -2.45)
    cam_obj.rotation_euler = (math.pi / 2, 0, math.pi)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    glb = os.path.join(ROOT, "public", "models", "female.glb")
    render = None
    for i, arg in enumerate(args):
        if arg == "--glb":
            glb = args[i + 1]
        if arg == "--render":
            render = args[i + 1]
    scene, body = import_body(glb)
    mesh, rings, rest = rebuild(body)
    body.hide_viewport = body.hide_render = True
    lineup(scene, mesh, rings, rest)
    if render:
        scene.render.engine = "BLENDER_EEVEE"
        scene.render.resolution_x, scene.render.resolution_y = 1800, 2600
        scene.render.filepath = render
        bpy.ops.render.render(write_still=True, scene=scene.name)


if __name__ == "__main__":
    main()
