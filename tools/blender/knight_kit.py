"""Knight toolkit: modular armour fitted to the Male body, and ten knights-to-soldiers built from it.

Run inside Blender after build_world.py, in the same session, because it measures the "Male" rig.
It works in its own scene ("KnightKit") and rebuilds it from scratch on every run:

  - Knights: ten copies of the male rig, from a big plate knight down to a levy recruit.
  - Kit: every part laid out on a board with a label, ready to pick from.

Each part is shaped from the body's own cross-sections (plus padding), so it fits the male mesh.
Parts are rigid and parented to a bone, the same way the game moves the body.

This is a draft: plain colour materials, no retro textures, and nothing is exported yet.
To add a knight, add an entry to KNIGHTS; to add a part, write a builder and list it in BUILDERS.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

SCENE_NAME = "KnightKit"
RIG = "Male"
N = 16  # sides on round armour
TAU = 2 * math.pi
HEAD = ("Head", "Hair")
TORSO = ("Torso",)
HIPS = ("Hips",)
SIDES = (("L", -1), ("R", 1))

# Everyone serves one house: these colours and this badge go on every tabard, cape and shield.
FACTION = dict(cloth="red", accent="yellow", emblem="cross", under="wine")
HELMET_PARTS = {"great_helm", "bascinet", "sallet", "kettle_hat", "nasal_helm", "coif", "leather_cap"}
SHOW_HELMETS = False  # each knight's helmet is in its own collection; switch it on with the eye in the outliner

PALETTE = {
    # name: (colour, metallic, roughness)
    "steel": ((0.62, 0.63, 0.66), 0.9, 0.35),
    "dark_steel": ((0.1, 0.1, 0.11), 0.85, 0.4),
    "gold": ((0.83, 0.62, 0.2), 1.0, 0.3),
    "bronze": ((0.55, 0.36, 0.16), 1.0, 0.45),
    "mail": ((0.36, 0.37, 0.39), 0.8, 0.65),
    "leather": ((0.3, 0.17, 0.08), 0.0, 0.7),
    "dark_leather": ((0.13, 0.08, 0.05), 0.0, 0.7),
    "wood": ((0.38, 0.24, 0.12), 0.0, 0.8),
    "gambeson": ((0.7, 0.62, 0.46), 0.0, 0.9),
    "ochre": ((0.55, 0.4, 0.18), 0.0, 0.9),
    "red": ((0.5, 0.06, 0.06), 0.0, 0.8),
    "wine": ((0.24, 0.05, 0.06), 0.0, 0.85),
    "blue": ((0.08, 0.15, 0.45), 0.0, 0.8),
    "white": ((0.85, 0.84, 0.8), 0.0, 0.8),
    "green": ((0.12, 0.28, 0.13), 0.0, 0.8),
    "black": ((0.03, 0.03, 0.035), 0.0, 0.8),
    "yellow": ((0.8, 0.6, 0.1), 0.0, 0.8),
    "ivory": ((0.85, 0.8, 0.68), 0.0, 0.6),
    "slit": ((0.01, 0.01, 0.01), 0.0, 1.0),
}

PTS = {}  # bone group -> body points in rig space, filled by measure()
HAND = {}  # side -> centre of that hand in rig space


# ---------------------------------------------------------------- materials

def material(key):
    name = "KK_" + key
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    colour, metallic, roughness = PALETTE[key]
    mat.diffuse_color = (*colour, 1.0)
    mat.metallic = metallic
    mat.roughness = roughness
    try:
        mat.use_nodes = True
    except AttributeError:
        pass
    tree = getattr(mat, "node_tree", None)
    bsdf = tree.nodes.get("Principled BSDF") if tree else None
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*colour, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
    return mat


# ---------------------------------------------------------------- measuring the body

def measure():
    """Reads every body vertex into PTS by its strongest bone, in the rig root's space."""
    PTS.clear()
    root = bpy.data.objects[RIG]
    inv = root.matrix_world.inverted()
    for suffix in ("Body", "Hair", "Shoes"):
        obj = bpy.data.objects[f"{RIG}_{suffix}"]
        names = {g.index: g.name[len(RIG) + 1:] for g in obj.vertex_groups}
        to_root = inv @ obj.matrix_world
        for v in obj.data.vertices:
            if not v.groups:
                continue
            label = names[max(v.groups, key=lambda g: g.weight).group]
            if suffix == "Hair":
                label = "Hair"
            elif suffix == "Shoes":
                label = "Shoe" + label[-2:]
            PTS.setdefault(label, []).append(to_root @ v.co)
    for side, _ in SIDES:
        hand = [p for p in PTS[f"ForeArm_{side}"] if p.z < 0.95]
        HAND[side] = sum(hand, Vector()) / len(hand)


def profile(groups, z, band=0.025, n=N):
    """The body's outline at height z: a centre and one radius per direction (0 = +X, quarter = +Y front)."""
    pool = [p for g in groups for p in PTS[g]]
    near = []
    while band < 0.4:
        near = [p for p in pool if abs(p.z - z) < band]
        if len(near) >= 8:
            break
        band *= 1.5
    cx = sum(p.x for p in near) / len(near)
    cy = sum(p.y for p in near) / len(near)
    rad = [0.0] * n
    for p in near:
        dx, dy = p.x - cx, p.y - cy
        k = int(round((math.atan2(dy, dx) % TAU) / TAU * n)) % n
        rad[k] = max(rad[k], math.hypot(dx, dy))
    filled = rad[:]
    for k in range(n):
        if rad[k] == 0.0:
            d = next(d for d in range(1, n) if rad[(k - d) % n] > 0)
            e = next(e for e in range(1, n) if rad[(k + e) % n] > 0)
            filled[k] = (rad[(k - d) % n] * e + rad[(k + e) % n] * d) / (d + e)
    smooth = [max(filled[k], 0.25 * filled[k - 1] + 0.5 * filled[k] + 0.25 * filled[(k + 1) % n]) for k in range(n)]
    return (cx, cy), smooth


def ring(groups, sample_z, pad, scale=(1.0, 1.0), roundness=0.0, z=None, n=N):
    """A loop around the body at sample_z, pushed out by pad and placed at z (default sample_z)."""
    (cx, cy), rad = profile(groups, sample_z, n=n)
    mean = sum(rad) / n
    z = sample_z if z is None else z
    out = []
    for k in range(n):
        a = TAU * k / n
        r = rad[k] + (mean - rad[k]) * roundness
        out.append(Vector((cx + math.cos(a) * (r * scale[0] + pad), cy + math.sin(a) * (r * scale[1] + pad), z)))
    return out


def surface_y(z, side, pad):
    """How far forwards (side 1) or back (side -1) the body reaches at height z, plus pad."""
    (cx, cy), rad = profile(TORSO if z >= 1.2 else HIPS, min(max(z, 0.95), 1.6))
    return cy + side * (rad[N // 4 if side > 0 else 3 * N // 4] + pad)


def front_of(points):
    return max(p.y for p in points)


# ---------------------------------------------------------------- geometry

def loft(rings, closed=True, cap_bottom=False, cap_top=False):
    verts, faces = [], []
    n = len(rings[0])
    for r in rings:
        verts.extend(r)
    span = n if closed else n - 1
    for i in range(len(rings) - 1):
        for k in range(span):
            a, b = i * n + k, i * n + (k + 1) % n
            faces.append((a, b, b + n, a + n))
    for cap, index in ((cap_bottom, 0), (cap_top, len(rings) - 1)):
        if cap:
            verts.append(sum(rings[index], Vector()) / n)
            centre = len(verts) - 1
            faces.extend((index * n + k, index * n + (k + 1) % n, centre) for k in range(n))
    return verts, faces


def arc(points, keep):
    """The run of a ring's points whose direction passes keep(angle), in order, for open shells."""
    n = len(points)
    flags = [keep(TAU * k / n) for k in range(n)]
    if all(flags):
        return points
    start = next(k for k in range(n) if flags[k] and not flags[k - 1])
    out = []
    while flags[(start + len(out)) % n] and len(out) < n:
        out.append(points[(start + len(out)) % n])
    return out


def merge(*geos):
    verts, faces = [], []
    for v, f in geos:
        offset = len(verts)
        verts.extend(v)
        faces.extend(tuple(i + offset for i in face) for face in f)
    return verts, faces


def cut(geo, drop):
    verts, faces = geo
    return verts, [f for f in faces if not drop(sum((verts[i] for i in f), Vector()) / len(f))]


def axes(direction):
    w = direction.normalized()
    up = Vector((0, 0, 1)) if abs(w.z) < 0.9 else Vector((1, 0, 0))
    u = w.cross(up).normalized()
    return u, w.cross(u), w


def tube(p0, p1, r0, r1=None, n=8, caps=True):
    r1 = r0 if r1 is None else r1
    u, v, _ = axes(p1 - p0)
    rings = [[p + (u * math.cos(TAU * k / n) + v * math.sin(TAU * k / n)) * r for k in range(n)]
             for p, r in ((p0, r0), (p1, r1))]
    return loft(rings, cap_bottom=caps, cap_top=caps)


def ellipsoid(c, rx, ry, rz, n=10, m=6, lo=-90.0, hi=90.0):
    rings = []
    for j in range(m + 1):
        t = math.radians(lo + (hi - lo) * j / m)
        rings.append([Vector((c.x + rx * math.cos(t) * math.cos(TAU * k / n),
                              c.y + ry * math.cos(t) * math.sin(TAU * k / n),
                              c.z + rz * math.sin(t))) for k in range(n)])
    return loft(rings)


def box(c, size, rot=None):
    rot = rot or Matrix.Identity(3)
    hx, hy, hz = (s / 2 for s in size)
    corners = [Vector((x, y, z)) for z in (-hz, hz) for y in (-hy, hy) for x in (-hx, hx)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return [c + rot @ p for p in corners], faces


def slab(points, origin, u, v, thickness):
    """A flat outline (in u, v coordinates) given thickness, for blades and shields."""
    normal = u.cross(v).normalized() * (thickness / 2)
    n = len(points)
    front = [origin + u * a + v * b + normal for a, b in points]
    back = [origin + u * a + v * b - normal for a, b in points]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    faces += [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    return front + back, faces


def sheet(rows):
    """An open surface through rows of points; given thickness by a Solidify modifier."""
    return loft(rows, closed=False)


# ---------------------------------------------------------------- building

class Build:
    """Collects one knight's (or the kit's) parts. With a rig, each part is parented to a bone."""

    def __init__(self, coll, prefix, metal="steel", trim="gold", root=None, arm=None):
        self.coll, self.prefix, self.metal, self.trim = coll, prefix, metal, trim
        self.root, self.arm = root, arm
        self.objects = []

    def add(self, label, geo, mat, bone, thickness=0.0):
        verts, faces = geo
        mesh = bpy.data.meshes.new(self.prefix + label)
        mesh.from_pydata([tuple(v) for v in verts], [], faces)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = False
        mesh.materials.append(material(mat))
        obj = bpy.data.objects.new(mesh.name, mesh)
        self.coll.objects.link(obj)
        if thickness:
            mod = obj.modifiers.new("Thickness", "SOLIDIFY")
            mod.thickness = thickness
            mod.offset = 0.0
        if self.arm:
            # The geometry is in rig space, so the part sits where the rig's root puts it.
            obj.parent = self.arm
            obj.parent_type = "BONE"
            obj.parent_bone = f"{RIG}_{bone}"
            obj.matrix_world = self.root.matrix_world.copy()
        self.objects.append(obj)
        return obj


# Helmets (all on the head) ---------------------------------------------------------

def great_helm(b, plume=None, horns=False, cross=True):
    rings = [ring(HEAD, z, 0.04, roundness=0.55) for z in (1.57, 1.63, 1.70, 1.77, 1.84, 1.90)]
    rings.append(ring(HEAD, 1.88, 0.03, scale=(0.82, 0.82), roundness=0.7, z=1.95))
    b.add("GreatHelm", loft(rings, cap_top=True), b.metal, "Head")
    front = max(front_of(r) for r in rings[2:5])
    b.add("GreatHelm_Slit", merge(box(Vector((0, front + 0.002, 1.775)), (0.18, 0.014, 0.016)),
                                  box(Vector((0.05, front - 0.004, 1.69)), (0.05, 0.014, 0.012)),
                                  box(Vector((0.05, front - 0.006, 1.665)), (0.05, 0.014, 0.012))), "slit", "Head")
    if cross:
        b.add("GreatHelm_Cross", merge(box(Vector((0, front + 0.006, 1.74)), (0.03, 0.012, 0.32)),
                                       box(Vector((0, front + 0.006, 1.805)), (0.2, 0.012, 0.022))), b.trim, "Head")
    if horns:
        geos = []
        for _, s in SIDES:
            a, m, tip = Vector((s * 0.12, 0, 1.87)), Vector((s * 0.25, 0.02, 1.93)), Vector((s * 0.3, 0.06, 2.08))
            geos += [tube(a, m, 0.038, 0.028), tube(m, tip, 0.028, 0.002)]
        b.add("GreatHelm_Horns", merge(*geos), "ivory", "Head")
    if plume:
        b.add("Plume", merge(ellipsoid(Vector((0, -0.02, 2.0)), 0.03, 0.15, 0.075), tube(Vector((0, 0, 1.94)), Vector((0, 0, 1.98)), 0.012)),
              plume, "Head")


def bascinet(b, visor=True, plume=None, aventail=True):
    shape = [(1.70, 1.0), (1.77, 1.0), (1.84, 0.97), (1.90, 0.82), (1.95, 0.55), (1.99, 0.18)]
    dome = loft([ring(HEAD, min(z, 1.88), 0.035, scale=(s, s), roundness=0.4, z=z) for z, s in shape], cap_top=True)
    # The sides and back come down to the neck; the face stays open.
    open_face = lambda a: math.sin(a) <= 0.45
    skirt = loft([arc(ring(HEAD, z, 0.035, roundness=0.4), open_face) for z in (1.62, 1.66, 1.70)], closed=False)
    b.add("Bascinet", merge(dome, skirt), b.metal, "Head")
    front = front_of(ring(HEAD, 1.74, 0.035, roundness=0.4))
    if visor:
        y0, c = front - 0.04, 1.725
        base = [Vector((0.105 * math.cos(TAU * k / 10), y0, c + 0.12 * math.sin(TAU * k / 10))) for k in range(10)]
        mid = [Vector((p.x * 0.6, y0 + 0.09, c - 0.01 + (p.z - c) * 0.6)) for p in base]
        b.add("Bascinet_Visor", loft([base, mid, [Vector((0, y0 + 0.15, c - 0.02))] * 10]), b.metal, "Head")
        b.add("Bascinet_Slits", merge(*(box(Vector((s * 0.045, y0 + 0.055, 1.775)), (0.06, 0.03, 0.012)) for _, s in SIDES)),
              "slit", "Head")
    if aventail:
        rings = [ring(("Head",), 1.62, 0.05, z=1.66), ring(TORSO, 1.6, 0.035, scale=(0.72, 0.85), z=1.56),
                 ring(TORSO, 1.52, 0.045, scale=(0.98, 1.0), z=1.48)]
        b.add("Aventail", loft(rings), "mail", "Torso")
    if plume:
        b.add("Plume", merge(ellipsoid(Vector((0, -0.08, 2.0)), 0.035, 0.07, 0.12), tube(Vector((0, -0.03, 1.95)), Vector((0, -0.07, 1.98)), 0.012)),
              plume, "Head")


def sallet(b, bevor=True):
    shape = [(1.72, 1.08), (1.79, 1.03), (1.86, 0.98), (1.92, 0.8), (1.965, 0.45), (1.985, 0.12)]
    dome = loft([ring(HEAD, min(z, 1.88), 0.03, scale=(s, s), roundness=0.4, z=z) for z, s in shape], cap_top=True)
    back = lambda a: math.sin(a) <= 0.05
    tail = loft([arc(ring(HEAD, 1.72, 0.03, scale=(1.08, 1.08), roundness=0.4), back),
                 arc(ring(HEAD, 1.70, 0.06, scale=(1.2, 1.28), roundness=0.4, z=1.64), back)], closed=False)
    b.add("Sallet", merge(dome, tail), b.metal, "Head")
    front = front_of(ring(HEAD, 1.775, 0.03, scale=(1.05, 1.05), roundness=0.4))
    b.add("Sallet_Slit", box(Vector((0, front + 0.002, 1.775)), (0.17, 0.014, 0.016)), "slit", "Head")
    if bevor:
        chin = lambda a: math.sin(a) >= -0.15
        b.add("Bevor", loft([arc(ring(HEAD, z, 0.045 + 0.01 * i, roundness=0.3, z=z), chin)
                             for i, z in enumerate((1.74, 1.68, 1.61))] +
                            [arc(ring(TORSO, 1.58, 0.06, scale=(0.75, 0.9), z=1.55), chin)], closed=False), b.metal, "Head")


def kettle_hat(b):
    shape = [(1.79, 1.04), (1.85, 1.0), (1.91, 0.86), (1.95, 0.6), (1.975, 0.2)]
    rings = [ring(HEAD, min(z, 1.88), 0.03, scale=(s, s), roundness=0.6, z=z) for z, s in shape]
    brim = loft([rings[0], ring(HEAD, 1.79, 0.15, roundness=1.0, z=1.755)])
    b.add("KettleHat", merge(loft(rings, cap_top=True), brim), b.metal, "Head")


def nasal_helm(b, nasal=True):
    shape = [(1.775, 1.03), (1.84, 0.98), (1.9, 0.8), (1.95, 0.5), (2.0, 0.06)]
    b.add("NasalHelm", loft([ring(HEAD, min(z, 1.88), 0.028, scale=(s, s), roundness=0.5, z=z) for z, s in shape], cap_top=True),
          b.metal, "Head")
    band = [ring(HEAD, 1.775, 0.038, roundness=0.5, z=1.765), ring(HEAD, 1.80, 0.038, roundness=0.5, z=1.805)]
    b.add("NasalHelm_Band", loft(band), b.trim, "Head")
    if nasal:
        b.add("NasalHelm_Nasal", box(Vector((0, front_of(band[0]) - 0.002, 1.71)), (0.03, 0.014, 0.13)), b.metal, "Head")


def coif(b, mantle=True):
    rings = [ring(HEAD, z, 0.025, roundness=0.35) for z in (1.57, 1.63, 1.70, 1.77, 1.84, 1.89)]
    rings.append(ring(HEAD, 1.88, 0.02, scale=(0.7, 0.7), roundness=0.5, z=1.935))
    (cx, cy), _ = profile(HEAD, 1.72)
    face = lambda c: c.y > cy + 0.03 and 1.635 < c.z < 1.83 and abs(c.x) < 0.09
    b.add("Coif", cut(loft(rings, cap_top=True), face), "mail", "Head")
    if mantle:
        b.add("Coif_Mantle", loft([rings[0], ring(TORSO, 1.54, 0.035, scale=(0.9, 0.95), z=1.5),
                                   ring(TORSO, 1.45, 0.05, scale=(1.02, 1.05), z=1.42)]), "mail", "Torso")


def leather_cap(b):
    shape = [(1.80, 1.05), (1.86, 1.0), (1.91, 0.85), (1.95, 0.55), (1.97, 0.15)]
    b.add("LeatherCap", loft([ring(HEAD, min(z, 1.88), 0.022, scale=(s, s), roundness=0.5, z=z) for z, s in shape], cap_top=True),
          "leather", "Head")
    b.add("LeatherCap_Roll", loft([ring(HEAD, 1.80, 0.034, roundness=0.5, z=1.788), ring(HEAD, 1.80, 0.034, roundness=0.5, z=1.818)]),
          "dark_leather", "Head")


# Body -------------------------------------------------------------------------------

def cuirass(b):
    plan = [(HIPS, 1.10, 1.10, 0.045, (1, 1)), (TORSO, 1.23, 1.18, 0.045, (1, 1)), (TORSO, 1.27, 1.27, 0.045, (1, 1)),
            (TORSO, 1.36, 1.36, 0.045, (1, 1.05)), (TORSO, 1.45, 1.45, 0.04, (1, 1)), (TORSO, 1.53, 1.53, 0.035, (0.97, 0.97)),
            (TORSO, 1.57, 1.585, 0.02, (0.72, 0.85))]
    b.add("Cuirass", loft([ring(g, s, pad, scale=sc, z=z) for g, s, z, pad, sc in plan]), b.metal, "Torso")
    b.add("Gorget", loft([ring(TORSO, 1.57, 0.03, scale=(0.6, 0.75), z=1.575), ring(("Head",), 1.6, 0.035, z=1.65)]),
          b.metal, "Torso")


def fauld(b, lames=3, tassets=False):
    geos = []
    for i in range(lames):
        z0 = 1.12 - i * 0.075
        s0, s1 = 1.0 + 0.06 * i, 1.06 + 0.06 * i
        geos.append(loft([ring(HIPS, max(z0, 0.95), 0.05 + 0.01 * i, scale=(s0, s0), z=z0),
                          ring(HIPS, max(z0 - 0.085, 0.95), 0.06 + 0.01 * i, scale=(s1, s1), z=z0 - 0.085)]))
    b.add("Fauld", merge(*geos), b.metal, "Hips")
    if tassets:
        y = surface_y(0.95, 1, 0.07 + 0.01 * lames)
        tilt = Matrix.Rotation(-0.15, 3, "X")
        b.add("Tassets", merge(*(box(Vector((s * 0.085, y + 0.01, 0.84)), (0.14, 0.012, 0.17), tilt) for _, s in SIDES)),
              b.metal, "Hips")


def body_layer(b, label, mat, pad, skirt_to, sleeves="upper", collar=False):
    """Mail, padding or leather from the shoulders down past the hips, with sleeves."""
    upper = [(TORSO, 1.57, 1.585, (0.72, 0.85)), (TORSO, 1.53, 1.53, (1, 1)), (TORSO, 1.45, 1.45, (1, 1)),
             (TORSO, 1.36, 1.36, (1, 1)), (TORSO, 1.27, 1.27, (1, 1)), (TORSO, 1.23, 1.18, (1, 1))]
    b.add(label, loft([ring(g, s, pad, scale=sc, z=z) for g, s, z, sc in upper]), mat, "Torso")
    lower = [ring(HIPS, 1.12, pad, z=1.18), ring(HIPS, 1.06, pad), ring(HIPS, 0.95, pad + 0.005)]
    z, grow = 0.95, 1.0
    while z - 0.09 > skirt_to:
        z -= 0.09
        grow += 0.06
        lower.append(ring(HIPS, 0.95, pad + 0.01, scale=(grow, grow), z=z))
    lower.append(ring(HIPS, 0.95, pad + 0.01, scale=(grow + 0.05, grow + 0.05), z=skirt_to))
    b.add(label + "_Skirt", loft(lower), mat, "Hips")
    for side, _ in SIDES:
        if sleeves in ("upper", "full"):
            b.add(f"{label}_Sleeve_{side}", loft([ring((f"UpperArm_{side}",), z, pad * 0.9) for z in (1.30, 1.37, 1.44)]),
                  mat, f"UpperArm_{side}")
        if sleeves == "full":
            b.add(f"{label}_Cuff_{side}", loft([ring((f"ForeArm_{side}",), z, pad * 0.8) for z in (1.02, 1.12, 1.22, 1.29)]),
                  mat, f"ForeArm_{side}")
    if collar:
        b.add(label + "_Collar", loft([ring(TORSO, 1.57, pad, scale=(0.62, 0.78), z=1.58), ring(("Head",), 1.6, pad, z=1.64)]),
              mat, "Torso")


def hauberk(b, skirt_to=0.78):
    body_layer(b, "Hauberk", "mail", 0.022, skirt_to)


def gambeson(b, colour="gambeson"):
    body_layer(b, "Gambeson", colour, 0.04, 0.8, sleeves="full", collar=True)


def jerkin(b):
    body_layer(b, "Jerkin", "leather", 0.03, 0.95, sleeves="none")
    y = surface_y(1.35, 1, 0.032)
    b.add("Jerkin_Laces", box(Vector((0, y, 1.33)), (0.012, 0.01, 0.4)), "dark_leather", "Torso")


def brigandine(b, colour=FACTION["cloth"]):
    plan = [(HIPS, 1.06, 1.06, (1, 1)), (HIPS, 1.12, 1.16, (1, 1)), (TORSO, 1.27, 1.27, (1, 1)),
            (TORSO, 1.36, 1.36, (1, 1.05)), (TORSO, 1.45, 1.45, (1, 1)), (TORSO, 1.53, 1.53, (0.97, 0.97)),
            (TORSO, 1.57, 1.585, (0.72, 0.85))]
    b.add("Brigandine", loft([ring(g, s, 0.05, scale=sc, z=z) for g, s, z, sc in plan]), colour, "Torso")
    rivets = []
    for z in (1.18, 1.27, 1.36, 1.45):
        y = surface_y(z, 1, 0.052)
        for x in (-0.13, -0.065, 0.0, 0.065, 0.13):
            rivets.append(box(Vector((x, y - x * x / 0.44, z)), (0.016, 0.012, 0.016)))
    b.add("Brigandine_Rivets", merge(*rivets), "gold", "Torso")


def tabard(b, colour=FACTION["cloth"], emblem=FACTION["emblem"], emblem_colour=FACTION["accent"], length=0.62, over=0.075):
    def rows(zs, widths, side, extra=0.0):
        out = []
        for z, w in zip(zs, widths):
            if z > 1.6:
                y = (surface_y(1.57, 1, over) + surface_y(1.57, -1, over)) / 2
            elif z >= 0.95:
                y = surface_y(z, side, over + extra)
            else:
                y = surface_y(0.95, side, over + extra) + side * 0.06 * (0.95 - z)
            out.append([Vector((x, y - side * x * x / 0.44, z)) for x in (-w, -w / 2, 0.0, w / 2, w)])
        return out

    upper_z, upper_w = (1.615, 1.57, 1.45, 1.3, 1.15, 1.02), (0.11, 0.13, 0.17, 0.17, 0.17, 0.18)
    lower_z = (1.04, 0.9, length)
    lower_w = (0.18, 0.19, 0.2)
    for side, name in ((1, "Front"), (-1, "Back")):
        b.add(f"Tabard_{name}", sheet(rows(upper_z, upper_w, side)), colour, "Torso", thickness=0.01)
        b.add(f"Tabard_{name}Skirt", sheet(rows(lower_z, lower_w, side)), colour, "Hips", thickness=0.01)
    if emblem == "cross":
        b.add("Tabard_Cross", merge(sheet(rows((1.5, 1.38, 1.26, 1.12), (0.03,) * 4, 1, 0.012)),
                                    sheet(rows((1.4, 1.33), (0.13, 0.13), 1, 0.013))), emblem_colour, "Torso", thickness=0.006)
    elif emblem == "stripe":
        b.add("Tabard_Stripe", sheet(rows((1.57, 1.45, 1.3, 1.15, 1.02), (0.035,) * 5, 1, 0.012)), emblem_colour, "Torso",
              thickness=0.006)
        b.add("Tabard_StripeSkirt", sheet(rows(lower_z, (0.035,) * 3, 1, 0.012)), emblem_colour, "Hips", thickness=0.006)


def cape(b, colour=FACTION["cloth"], length=0.22, over=0.06):
    zs = (1.6, 1.5, 1.35, 1.15, 0.9, 0.6, length)
    widths = (0.15, 0.24, 0.26, 0.28, 0.3, 0.32, 0.33)
    top_y = (surface_y(1.57, 1, 0) + surface_y(1.57, -1, 0)) / 2
    hang = surface_y(1.25, -1, over)
    rows = []
    for z, w in zip(zs, widths):
        if z >= 1.59:
            y = top_y
        elif z >= 1.25:
            y = surface_y(z, -1, over)
        else:
            y = hang - 0.09 * (1.25 - z)
        rows.append([Vector((x, y + x * x / 0.7, z)) for x in (-w, -w * 0.6, -w * 0.25, 0.0, w * 0.25, w * 0.6, w)])
    b.add("Cape", sheet(rows), colour, "Torso", thickness=0.012)


def belt(b):
    rings = [ring(HIPS, 1.1, 0.058, z=1.09), ring(HIPS, 1.12, 0.058, z=1.135)]
    b.add("Belt", loft(rings), "leather", "Hips")
    b.add("Belt_Buckle", box(Vector((0, front_of(rings[0]) + 0.004, 1.112)), (0.05, 0.012, 0.05)), "gold", "Hips")


# Arms -------------------------------------------------------------------------------

def pauldrons(b, size=1.0, lames=2, haute=False):
    for side, s in SIDES:
        c = Vector((s * 0.2, 0.0, 1.47))
        rx, ry, rz = 0.105 * size, 0.115 * size, 0.085 * size
        geos = [ellipsoid(c, rx, ry, rz, n=N, lo=-15)]
        outer = lambda a, s=s: math.cos(a) * s > -0.35
        for i in range(lames):
            top, bottom = c.z - 0.03 - 0.05 * i, c.z - 0.085 - 0.05 * i
            band = []
            for z, grow in ((top, 1.0 + 0.04 * i), (bottom, 1.06 + 0.04 * i)):
                band.append([Vector((c.x + s * 0.01 * i + rx * grow * math.cos(TAU * k / N), ry * grow * math.sin(TAU * k / N), z))
                             for k in range(N)])
            geos.append(loft([arc(r, outer) for r in band], closed=False))
        if haute:
            geos.append(box(Vector((s * 0.13, 0, 1.56)), (0.012, 0.17, 0.08)))
        b.add(f"Pauldron_{side}", merge(*geos), b.metal, f"UpperArm_{side}")


def rerebraces(b):
    for side, _ in SIDES:
        b.add(f"Rerebrace_{side}", loft([ring((f"UpperArm_{side}",), z, 0.03) for z in (1.30, 1.36, 1.43)]), b.metal, f"UpperArm_{side}")


def couters(b):
    for side, s in SIDES:
        b.add(f"Couter_{side}", ellipsoid(Vector((s * 0.235, -0.045, 1.29)), 0.05, 0.04, 0.055), b.metal, f"ForeArm_{side}")


def vambraces(b, mat=None):
    for side, _ in SIDES:
        b.add(f"Vambrace_{side}", loft([ring((f"ForeArm_{side}",), z, 0.024) for z in (1.02, 1.1, 1.18, 1.25)]),
              mat or b.metal, f"ForeArm_{side}")


def armband(b):
    """The house colours for those with no tabard."""
    b.add("Armband", loft([ring(("UpperArm_L",), z, 0.018) for z in (1.33, 1.39)]), FACTION["cloth"], "UpperArm_L")


def bracers(b):
    for side, _ in SIDES:
        b.add(f"Bracer_{side}", loft([ring((f"ForeArm_{side}",), z, 0.02) for z in (1.0, 1.1, 1.19)]), "leather", f"ForeArm_{side}")


def gauntlets(b):
    for side, _ in SIDES:
        group = (f"ForeArm_{side}",)
        hand = [ring(group, z, 0.016) for z in (0.80, 0.86, 0.92, 0.98)]
        cuff = loft([ring(group, 0.98, 0.022), ring(group, 0.98, 0.045, scale=(1.15, 1.15), z=1.07)])
        b.add(f"Gauntlet_{side}", merge(loft(hand, cap_bottom=True), cuff), b.metal, f"ForeArm_{side}")


# Legs -------------------------------------------------------------------------------

def cuisses(b):
    for side, _ in SIDES:
        b.add(f"Cuisse_{side}", loft([ring((f"Thigh_{side}",), z, 0.03) for z in (0.66, 0.76, 0.86, 0.95)]), b.metal, f"Thigh_{side}")


def poleyns(b):
    for side, s in SIDES:
        (cx, cy), rad = profile((f"Shin_{side}", f"Thigh_{side}"), 0.585)
        front = cy + rad[N // 4]
        cop = ellipsoid(Vector((cx, front + 0.01, 0.585)), 0.062, 0.035, 0.058)
        wing = ellipsoid(Vector((cx + s * 0.06, front - 0.03, 0.585)), 0.012, 0.045, 0.045)
        b.add(f"Poleyn_{side}", merge(cop, wing), b.metal, f"Shin_{side}")


def greaves(b):
    for side, _ in SIDES:
        b.add(f"Greave_{side}", loft([ring((f"Shin_{side}",), z, 0.024) for z in (0.17, 0.27, 0.37, 0.47, 0.53)]), b.metal, f"Shin_{side}")


def sabatons(b):
    for side, _ in SIDES:
        b.add(f"Sabaton_{side}", loft([ring((f"Shoe_{side}",), z, 0.013) for z in (0.006, 0.05, 0.1, 0.15)], cap_top=True),
              b.metal, f"Shin_{side}")


def boots(b, mat="leather"):
    for side, _ in SIDES:
        leg = loft([ring((f"Shin_{side}",), z, 0.02) for z in (0.14, 0.26, 0.38)] +
                   [ring((f"Shin_{side}",), 0.38, 0.035, scale=(1.12, 1.12), z=0.44)])
        foot = loft([ring((f"Shoe_{side}",), z, 0.011) for z in (0.006, 0.06, 0.12)])
        b.add(f"Boot_{side}", merge(leg, foot), mat, f"Shin_{side}")


# Weapons and shields ----------------------------------------------------------------

def longsword(b, held=True):
    if held:
        h = HAND["R"]
        y_axis, z_axis = Vector((0, 1, 0)), Vector((0, 0, 1))
        hilt = merge(ellipsoid(h + Vector((0, 0, 0.1)), 0.025, 0.025, 0.025, n=8, m=4),
                     box(h + Vector((0, 0, -0.075)), (0.024, 0.2, 0.024)))
        b.add("Longsword_Hilt", hilt, b.metal, "ForeArm_R")
        b.add("Longsword_Grip", tube(h + Vector((0, 0, 0.08)), h + Vector((0, 0, -0.065)), 0.015), "dark_leather", "ForeArm_R")
        blade = [(-0.024, 0), (0.024, 0), (0.024, -0.68), (0, -0.75), (-0.024, -0.68)]
        b.add("Longsword_Blade", slab(blade, h + Vector((0, 0, -0.085)), y_axis, z_axis, 0.008), "steel", "ForeArm_R")
        return
    start, end = Vector((-0.215, 0.04, 1.03)), Vector((-0.26, -0.2, 0.33))
    d = (end - start).normalized()
    b.add("Scabbard", tube(start, end, 0.026, 0.02, n=6), "dark_leather", "Hips")
    b.add("Scabbard_Hilt", merge(tube(start - Vector((0, 0.1, 0)), start + Vector((0, 0.1, 0)), 0.012, n=6),
                                 ellipsoid(start - d * 0.19, 0.024, 0.024, 0.024, n=8, m=4)), b.metal, "Hips")
    b.add("Scabbard_Grip", tube(start - d * 0.01, start - d * 0.17, 0.015), "dark_leather", "Hips")


def greatsword_back(b):
    y = surface_y(1.35, -1, 0.1)
    top, tip = Vector((0.2, y, 1.86)), Vector((-0.28, y, 0.6))
    d = (tip - top).normalized()
    across = Vector((-d.z, 0, d.x)).normalized()
    guard = top + d * 0.3
    b.add("Greatsword_Hilt", merge(ellipsoid(top, 0.03, 0.03, 0.03, n=8, m=4), tube(guard - across * 0.19, guard + across * 0.19, 0.014, n=6)),
          b.metal, "Torso")
    b.add("Greatsword_Grip", tube(top + d * 0.02, guard, 0.017), "dark_leather", "Torso")
    length = (tip - guard).length
    blade = [(-0.032, 0.0), (0.032, 0.0), (0.032, length - 0.13), (0.0, length), (-0.032, length - 0.13)]
    b.add("Greatsword_Blade", slab(blade, guard, across, d, 0.01), "steel", "Torso")
    b.add("Greatsword_Strap", tube(Vector((-0.2, y + 0.04, 1.55)), Vector((0.2, y + 0.06, 1.05)), 0.012, n=4), "dark_leather", "Torso")


def mace(b):
    h = HAND["R"]
    head = h + Vector((0, 0, -0.45))
    b.add("Mace_Haft", tube(h + Vector((0, 0, 0.09)), head, 0.016), "wood", "ForeArm_R")
    flanges = [box(head + Matrix.Rotation(TAU * i / 6, 3, "Z") @ Vector((0.04, 0, 0)), (0.05, 0.01, 0.11),
                   Matrix.Rotation(TAU * i / 6, 3, "Z")) for i in range(6)]
    b.add("Mace_Head", merge(ellipsoid(head, 0.035, 0.035, 0.05, n=8, m=4), *flanges), b.metal, "ForeArm_R")


def pole(b, label, length):
    h = HAND["R"]
    b.add(label + "_Shaft", tube(Vector((h.x, h.y, 0.02)), Vector((h.x, h.y, length)), 0.017, n=6), "wood", "ForeArm_R")
    return h


def spear(b, length=2.15):
    h = pole(b, "Spear", length)
    leaf = [(0, 0), (0.038, 0.08), (0, 0.27), (-0.038, 0.08)]
    b.add("Spear_Head", merge(slab(leaf, Vector((h.x, h.y, length)), Vector((0, 1, 0)), Vector((0, 0, 1)), 0.012),
                              tube(Vector((h.x, h.y, length - 0.06)), Vector((h.x, h.y, length + 0.02)), 0.02, n=6)), "steel", "ForeArm_R")


def halberd(b, length=2.05):
    h = pole(b, "Halberd", length)
    up, fwd = Vector((0, 0, 1)), Vector((0, 1, 0))
    spike = slab([(0, 0), (0.025, 0.05), (0, 0.24), (-0.025, 0.05)], Vector((h.x, h.y, length)), fwd, up, 0.012)
    axe = slab([(0.0, -0.05), (0.17, -0.13), (0.22, 0.0), (0.18, 0.12), (0.0, 0.06)], Vector((h.x, h.y + 0.01, length - 0.16)), fwd, up, 0.012)
    fluke = slab([(0, -0.02), (-0.15, -0.07), (0, 0.03)], Vector((h.x, h.y - 0.01, length - 0.13)), fwd, up, 0.012)
    b.add("Halberd_Head", merge(spike, axe, fluke), "steel", "ForeArm_R")


def pitchfork(b, length=1.85):
    h = pole(b, "Pitchfork", length)
    tines = [tube(Vector((h.x, h.y + dy, length)), Vector((h.x, h.y + dy, length + 0.26)), 0.006, 0.002, n=4) for dy in (-0.07, 0.0, 0.07)]
    b.add("Pitchfork_Tines", merge(box(Vector((h.x, h.y, length)), (0.02, 0.16, 0.02)), *tines), "dark_steel", "ForeArm_R")


def crossbow(b):
    h = HAND["R"]
    nut, front = h + Vector((0, 0.02, -0.2)), h + Vector((0, 0.02, -0.46))
    b.add("Crossbow_Stock", box(h + Vector((0, 0.02, -0.2)), (0.04, 0.05, 0.56)), "wood", "ForeArm_R")
    tips = [front + Vector((0, s * 0.3, 0.06)) for s in (-1, 1)]
    prod = merge(*(tube(front, t, 0.012, 0.007, n=4) for t in tips))
    string = merge(*(tube(t, nut, 0.003, n=3) for t in tips))
    b.add("Crossbow_Prod", merge(prod, string), "dark_steel", "ForeArm_R")


def quiver(b):
    bottom, top = Vector((0.17, -0.13, 0.76)), Vector((0.2, -0.17, 1.12))
    b.add("Quiver", tube(bottom, top, 0.045, n=8), "leather", "Hips")
    b.add("Quiver_Bolts", merge(*(box(top + Vector((dx, dy, 0.05)), (0.012, 0.03, 0.08)) for dx, dy in ((-0.02, 0), (0.02, 0.01), (0, -0.02)))),
          "white", "Hips")


def dagger(b):
    y = surface_y(1.0, 1, 0.07)
    b.add("Dagger_Sheath", tube(Vector((-0.1, y, 1.07)), Vector((-0.12, y + 0.02, 0.88)), 0.016, 0.01, n=6), "dark_leather", "Hips")
    b.add("Dagger_Hilt", merge(tube(Vector((-0.1, y, 1.07)), Vector((-0.095, y - 0.01, 1.16)), 0.012, n=6),
                               box(Vector((-0.1, y, 1.075)), (0.09, 0.016, 0.016))), b.metal, "Hips")


SHIELDS = {
    "kite": [(-0.2, 0.3), (-0.15, 0.39), (0, 0.42), (0.15, 0.39), (0.2, 0.3), (0.17, 0.0), (0.09, -0.3), (0, -0.5),
             (-0.09, -0.3), (-0.17, 0.0)],
    "heater": [(-0.24, 0.3), (0.24, 0.3), (0.23, 0.05), (0.17, -0.15), (0.08, -0.28), (0, -0.34), (-0.08, -0.28),
               (-0.17, -0.15), (-0.23, 0.05)],
    "round": [(0.3 * math.cos(TAU * k / 16), 0.3 * math.sin(TAU * k / 16)) for k in range(16)],
}


def shield(b, kind="heater", colour=FACTION["cloth"], emblem=FACTION["emblem"], emblem_colour=FACTION["accent"]):
    # Strapped to the outside of the left forearm, turned to face forwards and out.
    x = min(p.x for p in PTS["ForeArm_L"]) - 0.05
    centre = Vector((x, 0.12, 1.06))
    outwards = Vector((-0.6, 0.8, 0))
    u, v = Vector((0.8, 0.6, 0)), Vector((0, 0, 1))
    b.add("Shield", slab(SHIELDS[kind], centre, u, v, 0.03), colour, "ForeArm_L")
    face = centre + outwards * 0.017
    marks = []
    if emblem == "cross":
        marks = [slab([(-0.03, -0.26), (0.03, -0.26), (0.03, 0.26), (-0.03, 0.26)], face, u, v, 0.004),
                 slab([(-0.18, 0.06), (0.18, 0.06), (0.18, 0.12), (-0.18, 0.12)], face, u, v, 0.004)]
    elif emblem == "stripe":
        marks = [slab([(-0.04, -0.3), (0.04, -0.3), (0.04, 0.36), (-0.04, 0.36)], face, u, v, 0.004)]
    elif emblem == "bend":
        marks = [slab([(-0.2, 0.22), (-0.13, 0.3), (0.17, -0.06), (0.1, -0.14)], face, u, v, 0.004)]
    if marks:
        b.add("Shield_Emblem", merge(*marks), emblem_colour, "ForeArm_L")
    if kind == "round":
        boss = ellipsoid(Vector((0, 0, 0)), 0.075, 0.035, 0.075, n=10, m=4)
        turn = Matrix.Rotation(math.atan2(outwards.y, outwards.x) - math.pi / 2, 3, "Z")
        b.add("Shield_Boss", ([centre + outwards * 0.02 + turn @ p for p in boss[0]], boss[1]), "steel", "ForeArm_L")


BUILDERS = {
    "great_helm": great_helm, "bascinet": bascinet, "sallet": sallet, "kettle_hat": kettle_hat, "nasal_helm": nasal_helm,
    "coif": coif, "leather_cap": leather_cap,
    "cuirass": cuirass, "fauld": fauld, "hauberk": hauberk, "gambeson": gambeson, "jerkin": jerkin, "brigandine": brigandine,
    "tabard": tabard, "cape": cape, "belt": belt,
    "pauldrons": pauldrons, "rerebraces": rerebraces, "couters": couters, "vambraces": vambraces, "bracers": bracers, "armband": armband,
    "gauntlets": gauntlets,
    "cuisses": cuisses, "poleyns": poleyns, "greaves": greaves, "sabatons": sabatons, "boots": boots,
    "longsword": longsword, "greatsword_back": greatsword_back, "mace": mace, "spear": spear, "halberd": halberd,
    "pitchfork": pitchfork, "crossbow": crossbow, "quiver": quiver, "dagger": dagger, "shield": shield,
}

PLATE_ARMS = [("rerebraces", {}), ("couters", {}), ("vambraces", {}), ("gauntlets", {})]
PLATE_LEGS = [("cuisses", {}), ("poleyns", {}), ("greaves", {}), ("sabatons", {})]

# From the biggest knight to the smallest soldier. Scale is the body's (width, depth, height).
KNIGHTS = [
    dict(name="Lord Marshal", scale=(1.18, 1.15, 1.1), metal="steel", trim="gold", parts=[
        ("great_helm", dict(plume=FACTION["cloth"])), ("cuirass", {}), ("fauld", dict(lames=3, tassets=True)),
        ("pauldrons", dict(size=1.45, lames=3, haute=True)), *PLATE_ARMS, *PLATE_LEGS,
        ("cape", {}), ("belt", {}), ("greatsword_back", {})]),
    dict(name="Champion", scale=(1.14, 1.12, 1.08), metal="steel", trim="gold", parts=[
        ("great_helm", dict(cross=True)), ("cuirass", {}), ("fauld", dict(lames=3, tassets=True)),
        ("pauldrons", dict(size=1.3, lames=3)), *PLATE_ARMS, *PLATE_LEGS, ("cape", {}), ("belt", {}),
        ("mace", {}), ("shield", dict(kind="heater"))]),
    dict(name="Knight Captain", scale=(1.1, 1.08, 1.06), metal="steel", trim="gold", parts=[
        ("bascinet", dict(visor=True, plume=FACTION["cloth"])), ("hauberk", dict(skirt_to=0.7)), ("cuirass", {}),
        ("tabard", {}), ("pauldrons", dict(size=1.15, lames=2)),
        *PLATE_ARMS, *PLATE_LEGS, ("cape", dict(over=0.09)), ("belt", {}), ("longsword", {})]),
    dict(name="Knight", scale=(1.08, 1.06, 1.05), metal="steel", trim="gold", parts=[
        ("bascinet", dict(visor=True)), ("cuirass", {}), ("fauld", dict(lames=2)),
        ("tabard", dict(length=0.7)), ("pauldrons", dict(size=1.1, lames=2)),
        *PLATE_ARMS, *PLATE_LEGS, ("belt", {}), ("longsword", dict(held=False)), ("shield", dict(kind="heater"))]),
    dict(name="Squire", scale=(1.05, 1.04, 1.04), metal="steel", trim="gold", parts=[
        ("coif", {}), ("bascinet", dict(visor=False, aventail=False)), ("hauberk", dict(skirt_to=0.68)), ("cuirass", {}),
        ("tabard", dict(over=0.075, length=0.68)), ("pauldrons", dict(size=0.9, lames=1)), ("vambraces", {}), ("gauntlets", {}),
        ("cuisses", {}), ("greaves", {}), ("boots", dict(mat="dark_leather")), ("belt", {}), ("longsword", {}),
        ("shield", dict(kind="kite"))]),
    dict(name="Man-at-Arms", scale=(1.03, 1.02, 1.02), metal="steel", trim="gold", parts=[
        ("sallet", dict(bevor=True)), ("hauberk", dict(skirt_to=0.76)), ("brigandine", {}),
        ("pauldrons", dict(size=0.85, lames=1)), ("vambraces", {}), ("gauntlets", {}), ("greaves", {}), ("boots", {}),
        ("belt", {}), ("halberd", {})]),
    dict(name="Sergeant", scale=(1.01, 1.0, 1.01), metal="steel", trim="gold", parts=[
        ("coif", {}), ("nasal_helm", {}), ("hauberk", dict(skirt_to=0.74)), ("tabard", dict(over=0.045, length=0.66)),
        ("bracers", {}), ("boots", {}), ("belt", {}), ("longsword", {}), ("shield", dict(kind="kite"))]),
    dict(name="Crossbowman", scale=(1.0, 1.0, 1.0), metal="steel", trim="gold", parts=[
        ("kettle_hat", {}), ("gambeson", {}), ("tabard", dict(over=0.06, length=0.8, emblem=None)), ("bracers", {}),
        ("boots", {}), ("belt", {}), ("quiver", {}), ("crossbow", {}), ("dagger", {})]),
    dict(name="Spearman", scale=(0.99, 0.99, 0.99), metal="steel", trim="gold", parts=[
        ("nasal_helm", dict(nasal=False)), ("gambeson", {}), ("tabard", dict(over=0.06, length=0.8, emblem=None)),
        ("boots", {}), ("belt", {}), ("spear", {}), ("shield", dict(kind="round"))]),
    dict(name="Levy", scale=(0.95, 0.95, 0.98), metal="steel", trim="gold", parts=[
        ("leather_cap", {}), ("jerkin", {}), ("armband", {}), ("belt", {}), ("pitchfork", {})]),
]

# The kit board: one example of every part, row by row from the floor up.
KIT_ROWS = [
    ("Weapons & shields", 0.0, [("longsword", {}), ("longsword", dict(held=False)), ("greatsword_back", {}), ("mace", {}),
                                 ("spear", {}), ("halberd", {}), ("pitchfork", {}), ("crossbow", {}), ("quiver", {}),
                                 ("dagger", {}), ("shield", dict(kind="kite")), ("shield", dict(kind="heater")),
                                 ("shield", dict(kind="round"))]),
    ("Capes & tabards", 2.6, [("cape", {}), ("tabard", {}), ("tabard", dict(emblem="stripe")), ("tabard", dict(emblem=None))]),
    ("Body", 4.2, [("cuirass", {}), ("fauld", dict(tassets=True)), ("hauberk", {}), ("gambeson", {}), ("brigandine", {}),
                   ("jerkin", {}), ("belt", {})]),
    ("Arms", 5.6, [("pauldrons", dict(size=1.45, lames=3, haute=True)), ("pauldrons", dict(size=0.9, lames=1)),
                   ("rerebraces", {}), ("couters", {}), ("vambraces", {}), ("gauntlets", {}), ("bracers", {}), ("armband", {})]),
    ("Legs", 6.5, [("cuisses", {}), ("poleyns", {}), ("greaves", {}), ("sabatons", {}), ("boots", {})]),
    ("Helmets", 7.4, [("great_helm", dict(plume=FACTION["cloth"])), ("great_helm", dict(horns=True, cross=False)),
                      ("bascinet", dict(plume=FACTION["cloth"])), ("bascinet", dict(visor=False)), ("sallet", {}), ("kettle_hat", {}),
                      ("nasal_helm", {}), ("coif", {}), ("leather_cap", {})]),
]

SPACING = 1.5
KIT_START_X = -9.5  # the camera looks along -Y, so -X is to the right of the knights


# ---------------------------------------------------------------- scene

def reset_scene():
    old = bpy.data.scenes.get(SCENE_NAME)
    if old:
        for obj in list(old.collection.all_objects):
            if not any(s is not old and obj.name in s.collection.all_objects for s in bpy.data.scenes):
                bpy.data.objects.remove(obj)
        for coll in list(old.collection.children_recursive):
            bpy.data.collections.remove(coll)
        bpy.data.scenes.remove(old)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0 and item.name.startswith(("K0", "K1", "Kit_", "KK_")):
                block.remove(item)
    scene = bpy.data.scenes.new(SCENE_NAME)
    scene.unit_settings.system = "METRIC"
    return scene


def new_collection(scene, name, parent=None):
    coll = bpy.data.collections.new(name)
    (parent or scene.collection).children.link(coll)
    return coll


def label(coll, name, text, location, size=0.09):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.size = size
    curve.align_x = "CENTER"
    obj = bpy.data.objects.new(name, curve)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0, math.pi)  # upright, reading left to right from the front (+Y)
    obj.data.materials.append(material("white"))
    coll.objects.link(obj)
    return obj


def copy_rig(coll, prefix, location, scale):
    root = bpy.data.objects[RIG].copy()
    root.name = prefix + "Root"
    coll.objects.link(root)
    root.parent = None
    root.location = location
    root.rotation_euler = (0, 0, 0)
    root.scale = scale
    arm = bpy.data.objects[f"{RIG}_Armature"].copy()
    arm.name = prefix + "Armature"
    coll.objects.link(arm)
    arm.parent = root
    for suffix in ("Body", "Cloth", "Shoes", "Hair"):
        obj = bpy.data.objects[f"{RIG}_{suffix}"].copy()
        obj.name = prefix + suffix
        coll.objects.link(obj)
        obj.parent = arm
        for mod in obj.modifiers:
            if mod.type == "ARMATURE":
                mod.object = arm
        if suffix == "Cloth":
            # The tunic under the armour is dyed in the house's colour; the shared mesh is left alone.
            for slot in obj.material_slots:
                if slot.material and slot.material.name == "T_tunic":
                    slot.link = "OBJECT"
                    slot.material = material(FACTION["under"])
        if suffix == "Hair":
            obj.hide_viewport = obj.hide_render = SHOW_HELMETS
    return root, arm


def layer_collection(layer, coll):
    if layer.collection == coll:
        return layer
    for child in layer.children:
        found = layer_collection(child, coll)
        if found:
            return found
    return None


def build_knights(scene, coll):
    for i, spec in enumerate(KNIGHTS):
        prefix = f"K{i + 1:02d}_"
        sub = new_collection(scene, f"{i + 1:02d} {spec['name']}", coll)
        x = (len(KNIGHTS) - 1) / 2 * SPACING - i * SPACING
        root, arm = copy_rig(sub, prefix, (x, 0, 0), spec["scale"])
        scene.view_layers[0].update()
        helmets = new_collection(scene, f"{i + 1:02d} {spec['name']} Helmet", sub)
        body = Build(sub, prefix, spec["metal"], spec["trim"], root, arm)
        helmet = Build(helmets, prefix, spec["metal"], spec["trim"], root, arm)
        for part, opts in spec["parts"]:
            BUILDERS[part](helmet if part in HELMET_PARTS else body, **opts)
        helmets.hide_render = not SHOW_HELMETS
        layer_collection(scene.view_layers[0].layer_collection, helmets).hide_viewport = not SHOW_HELMETS
        label(sub, prefix + "Label", spec["name"], (x, 0.6, -0.16), size=0.11)


def build_kit(scene, coll):
    x0 = KIT_START_X
    for row_name, baseline, parts in KIT_ROWS:
        label(coll, f"Kit_Row_{row_name}", row_name, (x0 + 0.4, 0, baseline + 0.25), size=0.12).data.align_x = "RIGHT"
        x = x0
        for j, (part, opts) in enumerate(parts):
            b = Build(coll, f"Kit_{row_name[:4]}{j:02d}_")
            BUILDERS[part](b, **opts)
            corners = [o.matrix_world @ Vector(c) for o in b.objects for c in o.bound_box]
            lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
            hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
            width = hi.x - lo.x
            shift = Vector((x - width / 2 - hi.x, -(lo.y + hi.y) / 2, baseline - lo.z))
            for o in b.objects:
                o.location += shift
            name = part.replace("_", " ") + ("" if not opts else " (" + ", ".join(f"{k}={v}" for k, v in opts.items()) + ")")
            label(coll, f"Kit_{row_name[:4]}{j:02d}_Label", name, (x - width / 2, 0, baseline - 0.1), size=0.045)
            x -= width + 0.35


def add_cameras(scene, kit_coll):
    def camera(name, location, scale):
        data = bpy.data.cameras.new("KK_" + name)
        data.type = "ORTHO"
        data.ortho_scale = scale
        obj = bpy.data.objects.new("KK_" + name, data)
        obj.location = location
        obj.rotation_euler = (math.pi / 2, 0, math.pi)  # looking along -Y at the knights' fronts
        scene.collection.objects.link(obj)
        return obj

    knights = camera("Cam_Knights", (0, 12, 1.15), SPACING * len(KNIGHTS) + 0.6)
    # The kit camera frames the whole board, at 4:3.
    scene.view_layers[0].update()  # the kit parts were moved onto the board after they were made
    kit = list(kit_coll.objects)
    corners = [o.matrix_world @ Vector(c) for o in kit for c in o.bound_box]
    lo_x, hi_x = min(c.x for c in corners) - 0.3, max(c.x for c in corners) + 0.3
    lo_z, hi_z = min(c.z for c in corners) - 0.3, max(c.z for c in corners) + 0.3
    camera("Cam_Kit", ((lo_x + hi_x) / 2, 12, (lo_z + hi_z) / 2), max(hi_x - lo_x, (hi_z - lo_z) * 4 / 3))
    scene.camera = knights
    sun = bpy.data.objects.new("KK_Sun", bpy.data.lights.new("KK_Sun", "SUN"))
    sun.rotation_euler = (math.radians(50), 0, math.radians(160))
    scene.collection.objects.link(sun)
    scene.render.resolution_x, scene.render.resolution_y = 2400, 640
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"  # the body's colours are textures; the armour's are plain colours


def main():
    measure()
    scene = reset_scene()
    try:
        bpy.context.window.scene = scene
    except AttributeError:
        pass
    build_knights(scene, new_collection(scene, "Knights"))
    kit = new_collection(scene, "Kit")
    build_kit(scene, kit)
    add_cameras(scene, kit)
    return scene


if __name__ == "__main__":
    main()
