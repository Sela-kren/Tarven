"""Cloth toolkit: dresses fitted to the Female body, built in detail before they go into the game.

Run inside Blender after build_world.py, in the same session, because it measures the "Female" rig:

  D:/blender/blender.exe -b --factory-startup --python tools/blender/build_world.py --python tools/blender/cloth_kit.py

It works in its own scene ("ClothKit") and rebuilds it from scratch on every run:

  - Ladies: copies of the Female rig, each wearing one dress, with the hair and shoes that go with it.
  - Kit: every piece of every dress laid out on a board with a label, ready to pick from.

Every piece is shaped from her own body: fitted parts from rays cast at her skin (so a cup follows a breast and a
collar follows her neck), hanging parts from the hull of her hips and legs (so a skirt falls past them). Pieces are
skinned to her bones: fitted parts take the weights of the skin under them, skirts hang on the game's Skirt bones
with the same weights build_world.py gives its skirts, so a dress can be ported into the game as it is.

The dresses come from the user's refs (WORLD.md section 2b, "the manhwa mature-lady look"):
  ref/outfits/dress_white_gown.png   the white gown
  ref/outfits/dress_black_slit.png   the black slit dress (and its red version for Veyra's priestesses)

This is a draft: plain colour materials, and nothing is exported yet. To add a lady, add an entry to LADIES; to add
a dress, write a builder and list it in DRESSES.
"""
import math

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

SCENE_NAME = "ClothKit"
RIG = "Female"
TAU = 2 * math.pi
FRONT = math.pi / 2  # angles go round her from her right side (+X) to her front (+Y)
BACK = -math.pi / 2

TRUNK = ("Hips", "Torso", "Bust", "Belly", "Glute_L", "Glute_R")
NECK = TRUNK + ("Head",)
LEGS = ("Hips", "Glute_L", "Glute_R", "Thigh_L", "Thigh_R", "ThighSoft_L", "ThighSoft_R", "Shin_L", "Shin_R")
SHOULDERS = TRUNK + ("UpperArm_L", "UpperArm_R")


def arm(side):
    return (f"UpperArm_{side}", f"ForeArm_{side}")


def hand(side):
    return (f"ForeArm_{side}", f"HandFingers_{side}", f"HandTips_{side}", f"HandThumb_{side}")


# The game's skirt rig (build_world.py): twelve panels round her hips, each bending at mid-thigh and the knee.
SKIRT_PANELS = 12
SKIRT_HANG = (0.9, 0.8)
SKIRT_FOLD = (0.72, 0.6)
SKIRT_BEND = (0.56, 0.4)

PALETTE = {
    # name: (colour, metallic, roughness)
    "satin_black": ((0.025, 0.024, 0.03), 0.0, 0.35),
    "lining_black": ((0.07, 0.065, 0.075), 0.0, 0.6),
    "satin_white": ((0.88, 0.87, 0.84), 0.0, 0.4),
    "lining_grey": ((0.5, 0.5, 0.53), 0.0, 0.7),
    "satin_red": ((0.5, 0.03, 0.05), 0.0, 0.35),
    "lining_red": ((0.22, 0.02, 0.03), 0.0, 0.6),
    "velvet_black": ((0.04, 0.04, 0.05), 0.0, 0.8),
    "glove_white": ((0.9, 0.89, 0.86), 0.0, 0.5),
    "piping": ((0.1, 0.1, 0.12), 0.0, 0.5),
    "gold": ((0.85, 0.64, 0.22), 0.0, 0.3),
    "silver": ((0.82, 0.83, 0.86), 0.0, 0.25),
    "shoe_black": ((0.03, 0.03, 0.035), 0.0, 0.3),
    "shoe_white": ((0.86, 0.85, 0.82), 0.0, 0.35),
    "enamel": ((0.1, 0.12, 0.16), 0.3, 0.3),
    "white": ((0.85, 0.84, 0.8), 0.0, 0.8),
}


# ---------------------------------------------------------------- materials

def material(key):
    name = "CK_" + key
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


# ---------------------------------------------------------------- small helpers

def table(rows, z):
    """Linear lookup in [(z, value), ...] (any order), held at the ends."""
    rows = sorted(rows)
    if z <= rows[0][0]:
        return rows[0][1]
    for (z0, v0), (z1, v1) in zip(rows, rows[1:]):
        if z <= z1:
            return v0 + (v1 - v0) * (z - z0) / (z1 - z0)
    return rows[-1][1]


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def deg(d):
    return math.radians(d)


def hull2d(points):
    """Convex hull of 2D points (tuples), counter-clockwise."""
    pts = sorted(set(points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def hull_radius(poly, a, centre=(0.0, 0.0)):
    """How far from the centre a ray at angle a leaves the convex polygon."""
    dx, dy = math.cos(a), math.sin(a)
    best = 0.0
    n = len(poly)
    for k in range(n):
        (x0, y0), (x1, y1) = poly[k], poly[(k + 1) % n]
        x0, y0, x1, y1 = x0 - centre[0], y0 - centre[1], x1 - centre[0], y1 - centre[1]
        ex, ey = x1 - x0, y1 - y0
        den = dx * ey - dy * ex
        if abs(den) < 1e-12:
            continue
        t = (x0 * ey - y0 * ex) / den
        u = (x0 * dy - y0 * dx) / den
        if t > 0 and -1e-9 <= u <= 1 + 1e-9:
            best = max(best, t)
    return best


def fill_ring(values):
    """Fills the gaps (None) in a closed ring of numbers by interpolating round it."""
    n = len(values)
    known = [k for k in range(n) if values[k] is not None]
    if not known:
        return [0.0] * n
    out = values[:]
    for k in range(n):
        if out[k] is None:
            d = next(d for d in range(1, n) if values[(k - d) % n] is not None)
            e = next(e for e in range(1, n) if values[(k + e) % n] is not None)
            out[k] = (values[(k - d) % n] * e + values[(k + e) % n] * d) / (d + e)
    return out


def hull_ring(values):
    """A ring of radii (evenly round) pushed out to its convex hull, so cloth bridges the dips (her cleavage)."""
    n = len(values)
    pts = [(math.cos(TAU * k / n) * r, math.sin(TAU * k / n) * r) for k, r in enumerate(values)]
    poly = hull2d(pts)
    return [max(values[k], hull_radius(poly, TAU * k / n)) for k in range(n)]


def skirt_weights(a, z):
    """build_world.skirt_weights: the skirt hangs from the hips, then from the two panels either side of it."""
    hang = ease((SKIRT_HANG[0] - z) / (SKIRT_HANG[0] - SKIRT_HANG[1]))
    fold = ease((SKIRT_FOLD[0] - z) / (SKIRT_FOLD[0] - SKIRT_FOLD[1]))
    bend = ease((SKIRT_BEND[0] - z) / (SKIRT_BEND[0] - SKIRT_BEND[1]))
    at = (a / TAU % 1) * SKIRT_PANELS
    first = int(at) % SKIRT_PANELS
    share = at - int(at)
    weights = {"Hips": 1 - hang}
    for panel, part in ((first, 1 - share), ((first + 1) % SKIRT_PANELS, share)):
        if part > 0:
            for bone, w in ((f"Skirt{panel}", 1 - fold), (f"SkirtMid{panel}", fold * (1 - bend)),
                            (f"SkirtHem{panel}", fold * bend)):
                if w > 0:
                    weights[bone] = weights.get(bone, 0) + hang * w * part
    return {bone: w for bone, w in weights.items() if w > 0}


# ---------------------------------------------------------------- her body

class Body:
    """Her rest-pose skin in the rig root's space: points, normals, weights, and lookups built on demand."""

    def __init__(self):
        root = bpy.data.objects[RIG]
        obj = bpy.data.objects[f"{RIG}_Body"]
        to_root = root.matrix_world.inverted() @ obj.matrix_world
        turn = to_root.to_3x3()
        names = {g.index: g.name[len(RIG) + 1:] for g in obj.vertex_groups}
        mesh = obj.data
        self.co = [to_root @ v.co for v in mesh.vertices]
        self.normal = [(turn @ v.normal).normalized() for v in mesh.vertices]
        self.weights = [{names[g.group]: g.weight for g in v.groups if g.weight > 0} for v in mesh.vertices]
        self.bone = [max(w, key=w.get) if w else "" for w in self.weights]
        self.polys = [tuple(p.vertices) for p in mesh.polygons]
        self._bvh, self._kd = {}, {}

    def bvh(self, groups):
        key = tuple(groups)
        if key not in self._bvh:
            keep = set(groups)
            polys = [p for p in self.polys if all(self.bone[i] in keep for i in p)]
            self._bvh[key] = BVHTree.FromPolygons(self.co, polys)
        return self._bvh[key]

    def kd(self, groups):
        key = tuple(groups)
        if key not in self._kd:
            keep = set(groups)
            index = [i for i, b in enumerate(self.bone) if b in keep]
            tree = KDTree(len(index))
            for j, i in enumerate(index):
                tree.insert(self.co[i], i)
            tree.balance()
            self._kd[key] = tree
        return self._kd[key]

    def blend(self, co, groups, n=4):
        """The skin weights under a point: the nearest few vertices of those bones, nearer counting more."""
        found = self.kd(groups).find_n(co, n)
        total, out = 0.0, {}
        for _, i, dist in found:
            share = 1.0 / max(dist, 1e-4)
            total += share
            for bone, w in self.weights[i].items():
                out[bone] = out.get(bone, 0.0) + w * share
        return {bone: w / total for bone, w in out.items()}

    def front_y(self, x, z, groups=TRUNK):
        """How far forward her skin is at (x, z), looking from the front."""
        hit = self.bvh(groups).ray_cast(Vector((x, 0.6, z)), Vector((0.0, -1.0, 0.0)), 1.2)[0]
        return hit.y if hit else None

    def points(self, groups):
        keep = set(groups)
        return [c for c, b in zip(self.co, self.bone) if b in keep]


class Section:
    """
    Her outline round a vertical axis through x = y = 0, as a radius by angle and height, filled in on a grid.
    "ray": rays cast in at her skin from outside, so it follows every curve (a breast, the small of the back).
    "hull": the convex hull of her vertices at each height, so it wraps both legs at once (for hanging skirts).
    bridge: push each ring out to its convex hull, so cloth spans her cleavage instead of dipping into it.
    drape: how steeply (metres in per metre down) cloth may come back in below a bulge; it can't tuck under one.
    """

    def __init__(self, body, groups, z0, z1, mode="ray", step=0.005, cols=180, bridge=False, drape=None, band=0.012,
                 smooth=0):
        self.z0, self.step, self.cols = z0, step, cols
        rows = int(round((z1 - z0) / step)) + 1
        self.rows = []
        if mode == "ray":
            bvh = body.bvh(groups)
        else:
            pool = body.points(groups)
        for i in range(rows):
            z = z0 + i * step
            if mode == "ray":
                ring = []
                for k in range(cols):
                    a = TAU * k / cols
                    d = Vector((math.cos(a), math.sin(a), 0.0))
                    hit = bvh.ray_cast(Vector((0.0, 0.0, z)) + d * 0.7, -d, 0.7)[0]
                    ring.append(math.hypot(hit.x, hit.y) if hit else None)
                ring = fill_ring(ring)
            else:
                near = [(p.x, p.y) for p in pool if abs(p.z - z) < band]
                if len(near) < 3:
                    ring = self.rows[-1][:] if self.rows else [0.05] * cols
                else:
                    poly = hull2d(near)
                    ring = [hull_radius(poly, TAU * k / cols) for k in range(cols)]
            if bridge:
                ring = hull_ring(ring)
            self.rows.append(ring)
        for _ in range(smooth):
            # Evens out the rows up and down (a hull row jumps where her low-poly legs have a ring of vertices).
            self.rows = [[(self.rows[max(i - 1, 0)][k] + 2 * self.rows[i][k] + self.rows[min(i + 1, rows - 1)][k]) / 4
                          for k in range(cols)] for i in range(rows)]
        if drape is not None:
            # From the top down: each row may come in from the row above by at most `drape` per metre.
            for i in range(rows - 2, -1, -1):
                above = self.rows[i + 1]
                self.rows[i] = [max(r, ra - drape * step) for r, ra in zip(self.rows[i], above)]

    def r(self, a, z):
        fi = min(max((z - self.z0) / self.step, 0.0), len(self.rows) - 1.0)
        i = min(int(fi), len(self.rows) - 2)
        ti = fi - i
        fk = (a % TAU) / TAU * self.cols
        k = int(fk) % self.cols
        tk = fk - int(fk)
        k1 = (k + 1) % self.cols
        lo = self.rows[i][k] * (1 - tk) + self.rows[i][k1] * tk
        hi = self.rows[i + 1][k] * (1 - tk) + self.rows[i + 1][k1] * tk
        return lo * (1 - ti) + hi * ti

    def point(self, a, z, pad=0.0):
        r = self.r(a, z) + pad
        return Vector((math.cos(a) * r, math.sin(a) * r, z))

    def angle_at_x(self, x, z):
        """The angle on her front-right quarter (0 to 90 degrees) where the outline is x out from the middle."""
        lo, hi = 0.0, FRONT
        for _ in range(40):
            mid = (lo + hi) / 2
            if math.cos(mid) * self.r(mid, z) > x:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2


class Limb:
    """Her outline round a straight axis (an arm), as a radius by angle and distance along it."""

    def mean(self, t):
        ring = self.rings[min(self.bins, max(0, int(round(t * self.bins))))]
        return sum(ring) / len(ring)

    def round_point(self, t, a, r):
        """A point `r` from the axis, ignoring her shape (for loose cloth)."""
        return self.p0 + self.w * (t * self.length) + (self.u * math.cos(a) + self.v * math.sin(a)) * r


    def __init__(self, body, groups, p0, p1, bins=24, cols=24, pad_ends=0.0):
        self.p0, self.p1 = Vector(p0), Vector(p1)
        axis = self.p1 - self.p0
        self.length = axis.length
        self.w = axis.normalized()
        up = Vector((0.0, 1.0, 0.0))
        self.u = self.w.cross(up).normalized()
        self.v = self.w.cross(self.u).normalized()
        self.bins, self.cols = bins, cols
        rings = [[None] * cols for _ in range(bins + 1)]
        for p in body.points(groups):
            d = p - self.p0
            t = d.dot(self.w) / self.length
            if not -0.05 <= t <= 1.05:
                continue
            i = min(bins, max(0, int(round(t * bins))))
            x, y = d.dot(self.u), d.dot(self.v)
            k = int(round((math.atan2(y, x) % TAU) / TAU * cols)) % cols
            r = math.hypot(x, y)
            if rings[i][k] is None or r > rings[i][k]:
                rings[i][k] = r
        filled = []
        for ring in rings:
            filled.append(hull_ring(fill_ring(ring)) if any(r is not None for r in ring) else None)
        for i in range(len(filled)):
            if filled[i] is None:
                near = min((j for j in range(len(filled)) if filled[j] is not None), key=lambda j: abs(j - i))
                filled[i] = filled[near][:]
        self.rings = filled

    def point(self, t, a, pad=0.0):
        fi = min(max(t, 0.0), 1.0) * self.bins
        i = min(int(fi), self.bins - 1)
        ti = fi - i
        fk = (a % TAU) / TAU * self.cols
        k = int(fk) % self.cols
        tk = fk - int(fk)
        k1 = (k + 1) % self.cols
        r0 = self.rings[i][k] * (1 - tk) + self.rings[i][k1] * tk
        r1 = self.rings[i + 1][k] * (1 - tk) + self.rings[i + 1][k1] * tk
        r = r0 * (1 - ti) + r1 * ti + pad
        return self.p0 + self.w * (t * self.length) + (self.u * math.cos(a) + self.v * math.sin(a)) * r


# ---------------------------------------------------------------- geometry

def grid(rows, closed=False):
    """Quads through rows of points (each row the same length); closed joins each row's last point to its first."""
    verts, faces = [], []
    n = len(rows[0])
    for row in rows:
        verts.extend(row)
    span = n if closed else n - 1
    for i in range(len(rows) - 1):
        for k in range(span):
            a, b = i * n + k, i * n + (k + 1) % n
            faces.append((a, b, b + n, a + n))
    return verts, faces


def mirror(geo):
    """The geometry and its mirror across her middle (x = 0), as one; the seam welds when the mesh is cleaned."""
    verts, faces = geo
    n = len(verts)
    flipped = [Vector((-v.x, v.y, v.z)) for v in verts]
    return verts + flipped, faces + [tuple(i + n for i in reversed(f)) for f in faces]


def merge(*geos):
    verts, faces = [], []
    for v, f in geos:
        offset = len(verts)
        verts.extend(v)
        faces.extend(tuple(i + offset for i in face) for face in f)
    return verts, faces


def slab(outline, origin, u, v, thickness):
    """A flat outline (u, v coordinates) given thickness: badges, charms."""
    normal = u.cross(v).normalized() * (thickness / 2)
    n = len(outline)
    front = [origin + u * a + v * b + normal for a, b in outline]
    back = [origin + u * a + v * b - normal for a, b in outline]
    faces = [tuple(range(n)), tuple(range(2 * n - 1, n - 1, -1))]
    faces += [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    return front + back, faces


def circle(radius, n=20):
    return [(math.cos(TAU * k / n) * radius, math.sin(TAU * k / n) * radius) for k in range(n)]


def diamond(half_w, half_h):
    return [(0.0, -half_h), (half_w, 0.0), (0.0, half_h), (-half_w, 0.0)]


def crescent(radius, bite, offset, n=40):
    """A crescent moon: a disc with a smaller disc bitten out of it, `offset` along +u from the middle."""
    outer = [(math.cos(TAU * k / n) * radius, math.sin(TAU * k / n) * radius) for k in range(n)]
    outer = [p for p in outer if math.hypot(p[0] - offset, p[1]) > bite]
    # Start the outline just after the bite, so the outer arc runs in one piece.
    angles = sorted(math.atan2(p[1], p[0]) % TAU for p in outer)
    gap = max(range(len(angles)), key=lambda j: (angles[(j + 1) % len(angles)] - angles[j]) % TAU)
    start = angles[(gap + 1) % len(angles)]
    outer = sorted(outer, key=lambda p: (math.atan2(p[1], p[0]) - start) % TAU)
    inner = [(offset + math.cos(TAU * k / n) * bite, math.sin(TAU * k / n) * bite) for k in range(n)]
    inner = [p for p in inner if math.hypot(p[0], p[1]) < radius]
    inner = sorted(inner, key=lambda p: (math.atan2(p[1], p[0] - offset)) % TAU, reverse=True)
    # The bite's arc runs from the end of the outer arc back to its start, the short way round.
    a_end = math.atan2(outer[-1][1], outer[-1][0] - offset)
    inner = sorted(inner, key=lambda p: (a_end - math.atan2(p[1], p[0] - offset)) % TAU)
    return outer + inner


def ribbon(path, width, out_dir):
    """A flat strip along a path of points, `width` wide, its face turned towards out_dir(point)."""
    rows = []
    for j, p in enumerate(path):
        q0 = path[max(0, j - 1)]
        q1 = path[min(len(path) - 1, j + 1)]
        tangent = (q1 - q0).normalized()
        side = tangent.cross(out_dir(p)).normalized() * (width / 2)
        rows.append([p - side, p + side])
    return grid(rows)


def tube(path, radius, n=8):
    rows = []
    for j, p in enumerate(path):
        q0 = path[max(0, j - 1)]
        q1 = path[min(len(path) - 1, j + 1)]
        w = (q1 - q0).normalized()
        up = Vector((0, 0, 1)) if abs(w.z) < 0.9 else Vector((1, 0, 0))
        u = w.cross(up).normalized()
        v = w.cross(u)
        rows.append([p + (u * math.cos(TAU * k / n) + v * math.sin(TAU * k / n)) * radius for k in range(n)])
    return grid(rows, closed=True)


def radial(p):
    """Straight out from her middle at that height."""
    d = Vector((p.x, p.y, 0.0))
    return d.normalized() if d.length > 1e-6 else Vector((0.0, 1.0, 0.0))


def smooth_path(points, steps=6):
    """A Catmull-Rom curve through the points, `steps` samples per span."""
    pts = [Vector(p) for p in points]
    out = []
    for j in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, j - 1)], pts[j], pts[j + 1], pts[min(len(pts) - 1, j + 2)]
        for s in range(steps):
            t = s / steps
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t))
    out.append(pts[-1])
    return out


# ---------------------------------------------------------------- building

class Build:
    """Collects one dress's pieces. With a rig, each piece is skinned to it."""

    def __init__(self, coll, prefix, body, colours, root=None, arm=None):
        self.coll, self.prefix, self.body, self.colours = coll, prefix, body, colours
        self.root, self.arm = root, arm
        self.objects = []

    def colour(self, key):
        return self.colours.get(key, key)

    def weights(self, rig, co):
        kind = rig[0]
        if kind == "bone":
            return {rig[1]: 1.0}
        if kind == "hang" and co.z < SKIRT_HANG[0]:
            return skirt_weights(math.atan2(co.y, co.x) % TAU, co.z)
        return self.body.blend(co, rig[1])

    def add(self, label, geo, mat, rig, thickness=0.0, inner=None, smooth=True):
        """A piece: geometry in rig space, its colour (a key in the dress's colours or the palette), how it's rigged
        ("fit", bones) / ("hang", bones) / ("bone", name), and how thick the cloth is (inner: its inside's colour)."""
        verts, faces = geo
        mesh = bpy.data.meshes.new(self.prefix + label)
        mesh.from_pydata([tuple(v) for v in verts], [], faces)
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-4)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_area() < 1e-9], context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        for poly in mesh.polygons:
            poly.use_smooth = smooth
        mesh.materials.append(material(self.colour(mat)))
        if inner:
            mesh.materials.append(material(self.colour(inner)))
        obj = bpy.data.objects.new(mesh.name, mesh)
        self.coll.objects.link(obj)
        if self.arm:
            obj.parent = self.arm
            obj.matrix_world = self.root.matrix_world.copy()
            groups = {}
            for v in mesh.vertices:
                for bone, w in self.weights(rig, v.co).items():
                    if bone not in groups:
                        groups[bone] = obj.vertex_groups.new(name=f"{RIG}_{bone}")
                    groups[bone].add([v.index], w, "REPLACE")
            mod = obj.modifiers.new("Armature", "ARMATURE")
            mod.object = self.arm
        if thickness:
            mod = obj.modifiers.new("Thickness", "SOLIDIFY")
            mod.thickness = thickness
            mod.offset = 1.0
            mod.use_even_offset = True
            if inner:
                mod.material_offset = 1
        self.objects.append(obj)
        return obj


# ---------------------------------------------------------------- shared pieces

NECK_TOP = 1.372  # above this a ray at her front meets her chin, not her neck


def stand_collar(b, s, label, mat, z0, z1, pad, taper=0.9, trim=None, rows=5, cols=48):
    """
    A collar standing up round her neck: each row her neck's outline at its height (no higher than NECK_TOP, so it
    clears her chin), a little off it; `taper` below 1 lets the bottom stand off the slope of her shoulders less.
    """
    out = []
    for i in range(rows + 1):
        t = i / rows
        z = z0 + (z1 - z0) * t
        ring = [s.r(TAU * k / cols, min(max(z, z0 + 0.012), NECK_TOP)) for k in range(cols)]
        if i == 0:
            ring = [r * taper + (1 - taper) * min(ring) for r in ring]
        out.append([Vector((math.cos(TAU * k / cols) * (ring[k] + pad),
                            math.sin(TAU * k / cols) * (ring[k] + pad), z)) for k in range(cols)])
    b.add(label, grid(out, closed=True), mat, ("fit", NECK), thickness=0.0025)
    if trim:
        edge = [Vector((p.x * 1.03, p.y * 1.03, p.z)) for p in out[-1]]
        b.add(label + "Trim", tube(edge + [edge[0]], 0.0018, n=6), trim, ("fit", NECK))
    return out


def medallion(b, label, centre, normal, radius, rim, face):
    """A round badge: a metal rim with an enamel face, lying on the cloth facing `normal`."""
    normal = normal.normalized()
    up = Vector((0, 0, 1)) if abs(normal.z) < 0.9 else Vector((0, 1, 0))
    u = up.cross(normal).normalized()
    v = normal.cross(u)
    rig = ("fit", SHOULDERS)
    b.add(label, slab(circle(radius), centre + normal * 0.002, u, v, 0.004), rim, rig)
    b.add(label + "Face", slab(circle(radius * 0.68), centre + normal * 0.0045, u, v, 0.002), face, rig)


def gloves(b, label, mat, top_z, trim=None):
    """Long gloves: her own hand and forearm skin up to top_z, lifted just off it, so every finger is fitted."""
    body = b.body
    for side, sx in (("L", -1), ("R", 1)):
        keep = set(hand(side))
        index = {}
        verts, faces = [], []
        for poly in body.polys:
            if not all(body.bone[i] in keep for i in poly):
                continue
            if max(body.co[i].z for i in poly) > top_z:
                continue
            face = []
            for i in poly:
                if i not in index:
                    index[i] = len(verts)
                    verts.append(body.co[i] + body.normal[i] * 0.0016)
                face.append(index[i])
            faces.append(tuple(face))
        b.add(f"{label}_{side}", (verts, faces), mat, ("fit", hand(side)))
        if trim:
            # A gold band round the glove's top: the forearm's outline there.
            limb = Limb(body, (f"ForeArm_{side}",), (sx * 0.177, -0.124, 1.05), (sx * 0.251, -0.136, 0.791))
            t = (1.05 - top_z) / (1.05 - 0.791)
            rows = [[limb.point(tt, TAU * k / 24, 0.0035) for k in range(24)] for tt in (t, t + 0.05)]
            b.add(f"{label}Cuff_{side}", grid(rows, closed=True), trim, ("fit", hand(side)), thickness=0.0015)
            # A small gold diamond on the back of the wrist band.
            p = limb.point(t + 0.025, -math.pi / 2, 0.006)
            n = (p - (limb.p0 + limb.w * ((t + 0.025) * limb.length))).normalized()
            b.add(f"{label}Gem_{side}", slab(diamond(0.006, 0.009), p, limb.w.cross(n).normalized(), -limb.w, 0.003),
                  trim, ("fit", hand(side)))


# ---------------------------------------------------------------- the black slit dress

# A halter dress: a slim high collar with a silver crescent moon, two cups from it over her breasts with a deep V
# between them down to her navel, two straps crossed over her cleavage, and an open back down to the waist. Below the
# waist it's cut like a leotard: the leg line runs from her hip bone at each side down to her crotch, so the sides of
# her hips and legs are bare, a string across each hip. From there a front panel and a wide back panel hang to
# jagged, pointed hems: the front's to her ankles at the middle, the back's to her heels, its sides showing beside her
# legs. Worn with black stilettos.
SLIT = {
    "collar": (1.34, 1.383),
    # The cups' inner edge (the V) and outer edge, as angles (degrees, 90 = her front middle) by height.
    "inner": [(0.955, 90), (0.99, 84), (1.03, 78), (1.07, 73.5), (1.10, 72), (1.15, 73.5), (1.20, 72.5),
              (1.26, 67), (1.30, 62), (1.345, 60)],
    "outer": [(1.0, -90), (1.03, -63), (1.06, -38), (1.09, -14), (1.12, 4), (1.16, 20), (1.20, 33), (1.25, 42),
              (1.30, 46), (1.345, 46)],
    "waist": 0.955,  # the leg line starts here, on her hip bone at each side
    # The panels' edges (degrees) by height: the front one between its edges, the back one behind its edges. The
    # front's is the leg line from her hip bone in to her crotch, then out again as the panel widens to its hem.
    "front_edge": [(0.955, 4), (0.935, 24), (0.905, 40), (0.87, 53), (0.83, 62), (0.79, 64), (0.72, 59),
                   (0.55, 46), (0.35, 36), (0.0, 28)],
    "back_edge": [(0.955, -4), (0.93, -13), (0.88, -19), (0.8, -17), (0.6, -6), (0.35, 8), (0.0, 18)],
    # The hems: height by how far across the panel (0 at its edge, 1 at its middle), pointed like a handkerchief.
    "front_hem": [(0.0, 0.44), (0.2, 0.3), (0.42, 0.4), (0.7, 0.2), (1.0, 0.1)],
    "back_hem": [(0.0, 0.24), (0.16, 0.05), (0.38, 0.18), (0.62, 0.035), (0.84, 0.13), (1.0, 0.06)],
    # The string across each hip, from the front panel's edge round to the back panel's: (degrees, height).
    "string": [(40, 0.905), (26, 0.912), (10, 0.916), (-6, 0.915), (-15, 0.91)],
}


def slit_dress(b):
    body = b.body
    s = Section(body, NECK, 0.84, 1.40, drape=2.5)
    pad = 0.0035
    joint = 0.86  # below this the panels hang free of her

    # The bodice (her right half, mirrored): from the waist up, between the V and the open back, up to the collar.
    zs = [SLIT["waist"] + (SLIT["collar"][0] + 0.004 - SLIT["waist"]) * i / 70 for i in range(71)]
    cols = 30
    rows = []
    for z in zs:
        lo = deg(-90) if z <= 1.0 else deg(table(SLIT["outer"], z))
        hi = deg(90) if z <= 0.955 else deg(table(SLIT["inner"], z))
        rows.append([s.point(lo + (hi - lo) * k / cols, z, pad) for k in range(cols + 1)])
    b.add("Bodice", mirror(grid(rows)), "main", ("fit", TRUNK), thickness=0.0022, inner="lining")

    # The collar, and the crescent moon hanging at its front.
    c0, c1 = SLIT["collar"]
    stand_collar(b, s, "Collar", "main", c0, c1, 0.003, taper=0.8)
    # A little ring at the collar's lower front edge, and the moon hanging from it on her breastbone, horns up-right.
    front = s.point(FRONT, c0 + 0.004, 0.004)
    ring = [front + Vector((math.cos(TAU * k / 12) * 0.0045, 0.003, -0.004 + math.sin(TAU * k / 12) * 0.0045))
            for k in range(13)]
    b.add("MoonRing", tube(ring, 0.0011, n=6), "metal", ("fit", NECK))
    centre = Vector((0.0, (body.front_y(0.0, c0 - 0.03, NECK) or front.y) + 0.009, c0 - 0.03))
    turn = deg(40)
    moon = slab(crescent(0.019, 0.016, 0.009), centre,
                Vector((math.cos(turn), 0, math.sin(turn))), Vector((-math.sin(turn), 0, math.cos(turn))), 0.0035)
    b.add("Moon", moon, "metal", ("fit", NECK))

    # Two straps crossed over her cleavage: from either side of the moon down to the other cup's inner edge.
    for side, sx in (("L", -1), ("R", 1)):
        top = Vector((-sx * 0.02, 0.0, c0 - 0.004))
        z_end = 1.12
        a_end = deg(table(SLIT["inner"], z_end))
        end = s.point(a_end, z_end, pad)
        end = Vector((sx * abs(end.x), end.y, end.z))
        path = []
        for j in range(25):
            t = j / 24
            x, z = top.x + (end.x - top.x) * t, top.z + (end.z - top.z) * t
            y_skin = body.front_y(x, z, NECK) or 0.0
            y_chord = (s.point(FRONT, top.z, pad).y) * (1 - t) + end.y * t
            # Taut across her cleavage, but lying on her chest above it.
            path.append(Vector((x, max(y_skin + 0.0045, y_chord - 0.012), z)))
        b.add(f"CrossStrap_{side}", ribbon(path, 0.0065, lambda p: Vector((0, 1, 0))), "main", ("fit", TRUNK),
              thickness=0.0015)

    # The front panel and the back panel (her right halves, mirrored).
    hang = Section(body, LEGS + TRUNK, 0.0, 0.94, mode="hull", step=0.01, cols=180, drape=0.12, band=0.025, smooth=4)

    def panel_r(a, z, flare, folds, wave):
        fit = s.r(a, max(z, joint)) + pad
        if z >= joint:
            return fit
        t = (joint - z) / joint
        r = max(hang.r(a, z) + 0.012, fit - 0.12 * (joint - z))
        return r + flare * t ** 1.4 + folds * t ** 1.2 * math.sin(wave * a)

    def panel(label, edge, hem, middle, flare, folds, wave, inner):
        n_rows, n_cols = 40, 22
        rows = []
        for i in range(n_rows + 1):
            row = []
            for k in range(n_cols + 1):
                t = k / n_cols  # 0 at the panel's edge, 1 at its middle
                z_top = SLIT["waist"] + 0.002
                z_hem = table(hem, t)
                z = z_top - (z_top - z_hem) * (i / n_rows) ** 0.92
                a_edge = deg(table(edge, z))
                a = a_edge + (middle - a_edge) * t
                r = panel_r(a, z, flare, folds, wave)
                row.append(Vector((math.cos(a) * r, math.sin(a) * r, z)))
            rows.append(row)
        b.add(label, mirror(grid(rows)), "main", ("hang", TRUNK), thickness=0.002, inner=inner)

    panel("FrontPanel", SLIT["front_edge"], SLIT["front_hem"], FRONT, 0.05, 0.007, 9, "lining")
    panel("BackPanel", SLIT["back_edge"], SLIT["back_hem"], BACK, 0.1, 0.012, 11, "lining")

    # A string across each hip, from the front panel's edge round to the back panel's.
    path = smooth_path([s.point(deg(a), z, pad + 0.001) for a, z in SLIT["string"]], 6)
    strap = ribbon(path, 0.006, radial)
    b.add("HipString", mirror(strap), "main", ("fit", TRUNK), thickness=0.0015)


# ---------------------------------------------------------------- the white gown

# A long, fitted white gown: a stand collar, princess seams piped dark from her shoulders over her bust and down to
# gold diamonds on her hips, a skirt tight to the knee then falling to the floor with a short train, slit up the front
# of her right thigh, and an open overskirt over it from the diamonds round the back. Over her shoulders a short stiff
# white cape lined black with gold medallions; full black sleeves under it, gathered into long white gloves with gold
# cuffs; a gold vine worked up the hem beside the slit. Worn with the hair up and pumps.
GOWN = {
    "collar": (1.335, 1.385),
    "slit": 72.0,  # where the slit is (degrees, her right front)
    "slit_top": 0.75,
    "slit_open": 18.0,  # half its opening at the hem (degrees)
    "over_open": [(0.905, 30.0), (0.6, 34.0), (0.0, 40.0)],  # half the overskirt's front opening (degrees)
    # The princess seams: how far out from her middle (m), by height, then down the overskirt's edge.
    "seam": [(1.335, 0.032), (1.27, 0.05), (1.2, 0.072), (1.145, 0.082), (1.09, 0.068), (1.04, 0.05), (0.97, 0.052),
             (0.905, 0.06)],
    "badge": (0.06, 0.887),
    "sleeve_end": 0.5,  # how far down her forearm the sleeves reach (0 elbow, 1 wrist)
    "glove_top": 0.94,
}


def gown(b):
    body = b.body
    s = Section(body, NECK, 0.84, 1.40, bridge=True, drape=1.3)
    pad = 0.0035
    joint = 0.86

    # The bodice: all round her, from the hips up to the collar.
    zs = [joint + (GOWN["collar"][0] + 0.004 - joint) * i / 56 for i in range(57)]
    cols = 72
    rows = [[s.point(TAU * k / cols, z, pad) for k in range(cols)] for z in zs]
    b.add("Bodice", grid(rows, closed=True), "main", ("fit", TRUNK), thickness=0.0025, inner="lining")
    stand_collar(b, s, "Collar", "main", GOWN["collar"][0], GOWN["collar"][1], 0.005, taper=0.9, trim="metal")

    # The skirt: tight to the knee, then out to the floor, a short train behind; open up the slit.
    hang = Section(body, LEGS + TRUNK, 0.0, 0.94, mode="hull", step=0.01, cols=180, drape=0.3, band=0.03, smooth=5)

    def skirt_r(a, z, out=0.0):
        fit = s.r(a, max(z, joint)) + pad
        if z >= joint:
            return fit + out
        r = max(hang.r(a, z) + 0.01, fit - 0.3 * (joint - z))
        below = max(0.0, (0.6 - z) / 0.6)  # from mid-thigh down it opens out to the floor
        r += 0.06 * below ** 1.4
        behind = max(0.0, -math.sin(a))
        r += 0.07 * behind ** 2 * max(0.0, (0.15 - z) / 0.15) ** 2  # a short train
        r += 0.005 * below ** 1.2 * math.sin(12 * a)
        return r + out

    def hem_z(a):
        return 0.012 if math.sin(a) >= 0 else 0.004

    slit = deg(GOWN["slit"])
    n_rows, n_cols = 44, 120
    rows = []
    for i in range(n_rows + 1):
        u = i / n_rows
        row = []
        for k in range(n_cols + 1):
            t = k / n_cols
            open_half = deg(GOWN["slit_open"]) * ease((GOWN["slit_top"] - (joint - (joint - 0.01) * u)) / 0.25)
            a = slit + open_half + (TAU - 2 * open_half) * t
            z = joint - (joint - hem_z(a)) * u
            row.append(Vector((math.cos(a) * skirt_r(a, z), math.sin(a) * skirt_r(a, z), z)))
        rows.append(row)
    b.add("Skirt", grid(rows), "main", ("hang", TRUNK), thickness=0.0025, inner="lining")

    # The overskirt: from the hip diamonds round the back, a little out over the skirt, open at the front.
    z_top = 0.905
    n_rows, n_cols = 46, 96
    rows = []
    for i in range(n_rows + 1):
        u = i / n_rows
        row = []
        for k in range(n_cols + 1):
            z = z_top - (z_top - 0.006) * u
            half = deg(table(GOWN["over_open"], z))
            a = FRONT + half + (TAU - 2 * half) * k / n_cols
            z = z_top - (z_top - hem_z(a) + 0.002) * u
            out = 0.0015 + 0.012 * u + 0.09 * u * u  # flat on her hips, opening out to the floor
            row.append(Vector((math.cos(a) * skirt_r(a, z, out), math.sin(a) * skirt_r(a, z, out), z)))
        rows.append(row)
    b.add("Overskirt", grid(rows), "main", ("hang", TRUNK), thickness=0.0025, inner="lining")

    # The princess seams, piped dark, from her shoulders to the diamonds and on down the overskirt's edges.
    path = []
    for z, x in GOWN["seam"]:
        path.append(s.point(s.angle_at_x(x, z), z, pad + 0.0045))
    seam = smooth_path(path, 6)
    for i in range(1, 15):
        z = z_top - (z_top - 0.02) * i / 14
        a = FRONT - deg(table(GOWN["over_open"], z))
        u = (z_top - z) / (z_top - 0.006)
        out = 0.0015 + 0.012 * u + 0.09 * u * u + 0.0045
        seam.append(Vector((math.cos(a) * skirt_r(a, z, out), math.sin(a) * skirt_r(a, z, out), z)))
    b.add("Seam", mirror(ribbon(seam, 0.0035, radial)), "piping", ("hang", TRUNK), thickness=0.0015)
    # The overskirt's top edge, piped the same, from one diamond round her back to the other.
    top_half = deg(table(GOWN["over_open"], z_top))
    edge = [s.point(FRONT + top_half + (TAU - 2 * top_half) * k / 60, z_top, pad + 0.0045) for k in range(61)]
    b.add("WaistSeam", ribbon(edge, 0.004, radial), "piping", ("fit", TRUNK), thickness=0.0015)

    # The gold diamonds on her hips, where the seams meet the overskirt.
    for side, sx in (("L", -1), ("R", 1)):
        x, z = GOWN["badge"]
        a = s.angle_at_x(x, z)
        p = s.point(a, z, pad + 0.006)
        p.x *= sx
        n = radial(p)
        u = Vector((0, 0, 1)).cross(n).normalized()
        b.add(f"HipDiamond_{side}", slab(diamond(0.011, 0.018), p, u, Vector((0, 0, 1)), 0.003), "metal", ("fit", TRUNK))
        b.add(f"HipDiamondFace_{side}", slab(diamond(0.0065, 0.011), p + n * 0.0022, u, Vector((0, 0, 1)), 0.0015),
              "enamel", ("fit", TRUNK))

    # The gold vine up the hem beside the slit: a stem with curling shoots, on the skirt's surface.
    a0 = slit + deg(GOWN["slit_open"]) + deg(4)
    stem = [(a0 + deg(1.5 * math.sin(z * 30)), z) for z in [0.03 + 0.28 * j / 12 for j in range(13)]]

    def on_skirt(a, z):
        r = skirt_r(a, z, 0.0035)
        return Vector((math.cos(a) * r, math.sin(a) * r, z))
    b.add("Vine", ribbon([on_skirt(a, z) for a, z in stem], 0.0025, radial), "metal", ("hang", TRUNK))
    for j, (z, sign) in enumerate(((0.07, 1), (0.13, -1), (0.19, 1), (0.25, -1), (0.29, 1))):
        curl = []
        for q in range(14):
            t = q / 13
            ang = t * 4.2
            rad = 0.022 * (1 - 0.75 * t)
            da = sign * (0.02 + rad * math.sin(ang)) / 0.2
            curl.append(on_skirt(a0 + da, z + rad * (1 - math.cos(ang)) * 0.8))
        b.add(f"VineCurl{j}", ribbon(curl, 0.0018, radial), "metal", ("hang", TRUNK))

    # The cape: a short stiff cape over her shoulders and the tops of her arms, open wide at the front so her bust
    # shows between its edges; it stands out in a ridge at each shoulder, where a medallion sits.
    cape_s = Section(body, SHOULDERS, 1.06, 1.36, mode="hull", step=0.01, cols=120, band=0.02, smooth=2, drape=0.15)
    n_cols = 72
    half = deg(54)
    rows = []
    shape = ((1.35, 0.012, 0.0), (1.337, 0.018, 0.003), (1.315, 0.024, 0.006), (1.28, 0.028, 0.004),
             (1.23, 0.03, 0.0), (1.17, 0.033, 0.0), (1.11, 0.036, 0.0))
    for i, (z_base, out, lift) in enumerate(shape):
        row = []
        for k in range(n_cols + 1):
            a = FRONT + half + (TAU - 2 * half) * k / n_cols
            side = abs(math.cos(a)) ** 4  # the ridges at her shoulders
            z = z_base + lift * side
            if i == 0:
                p = s.point(a, min(z_base, NECK_TOP), out)
            else:
                r = cape_s.r(a, min(z_base, 1.33)) + out + 0.012 * side * (i / len(shape))
                p = Vector((math.cos(a) * r, math.sin(a) * r, z))
            # Its hem: lower over her arms and back, cut up towards its front edges.
            if i == len(shape) - 1:
                p.z += -0.02 * side + 0.07 * max(0.0, math.sin(a)) ** 1.5
            row.append(p)
        rows.append(row)
    b.add("Cape", grid(rows), "main", ("fit", SHOULDERS), thickness=0.003, inner="cape_lining")
    for side, sx in (("L", -1), ("R", 1)):
        a = 0.0 if sx > 0 else math.pi
        r = cape_s.r(a, 1.315) + 0.024 + 0.012 * 2 / len(shape) + 0.004
        p = Vector((math.cos(a) * r, -0.004, 1.315 + 0.006 + 0.004))
        medallion(b, f"ShoulderMedallion_{side}", p, Vector((sx * 0.55, 0.45, 0.7)), 0.015, "metal", "enamel")
    clasp = s.point(FRONT, GOWN["collar"][0] - 0.004, 0.009)
    medallion(b, "Clasp", clasp, Vector((0, 1, 0.1)), 0.011, "metal", "enamel")

    # The sleeves: loose black sleeves from under the cape, full at the elbow and opening into a bell halfway down her
    # forearms, with the gloves coming out of them.
    for side, sx in (("L", -1), ("R", 1)):
        upper = Limb(body, arm(side), (sx * 0.125, -0.04, 1.32), (sx * 0.177, -0.124, 1.05))
        lower = Limb(body, arm(side), (sx * 0.177, -0.124, 1.05), (sx * 0.251, -0.136, 0.791))
        rows = []
        n = 28

        def folds(a, depth):
            return depth * math.sin(7 * a + 0.6 * math.sin(3 * a))
        for i in range(11):
            t = 0.16 + 0.84 * i / 10  # from just below her shoulder, under the cape
            r = upper.mean(t) + 0.004 + 0.02 * (i / 10) ** 0.8
            rows.append([upper.round_point(t, TAU * k / n, r + folds(TAU * k / n, 0.002 + 0.003 * t)) for k in range(n)])
        end = GOWN["sleeve_end"]
        for i in range(1, 9):
            t = end * i / 8
            r = lower.mean(t) + 0.024 + 0.014 * (i / 8) ** 1.5
            rows.append([lower.round_point(t, TAU * k / n, r + folds(TAU * k / n, 0.005 + 0.003 * i / 8)) for k in range(n)])
        b.add(f"Sleeve_{side}", grid(rows, closed=True), "sleeve", ("fit", arm(side) + ("Torso",)), thickness=0.002,
              inner="cape_lining")

    gloves(b, "Glove", "glove", GOWN["glove_top"], trim="metal")


# ---------------------------------------------------------------- the ladies

DRESSES = {"slit": slit_dress, "gown": gown}

LADIES = [
    {"name": "White Gown", "dress": "gown", "hair": "HairBun", "shoes": "Pump", "shoe_colour": "shoe_white",
     "colours": {"main": "satin_white", "lining": "lining_grey", "cape_lining": "satin_black", "sleeve": "velvet_black",
                 "glove": "glove_white", "piping": "piping", "metal": "gold", "enamel": "enamel"}},
    {"name": "Black Slit Dress", "dress": "slit", "hair": "HairLong", "shoes": "Stiletto", "shoe_colour": "shoe_black",
     "colours": {"main": "satin_black", "lining": "lining_black", "metal": "silver"}},
    {"name": "Veyra Red", "dress": "slit", "hair": "HairPonytail", "shoes": "Stiletto", "shoe_colour": "shoe_black",
     "colours": {"main": "satin_red", "lining": "lining_red", "metal": "gold"}},
]

# The painted underwear on her skin comes off under the dresses (the slit dress leaves her hips bare).
SKIN_OVER = {"T_bra", "T_smalls", "T_lingerie"}
SPACING = 0.9
KIT_START_X = -2.2  # the camera looks along -Y, so -X is to the right of the ladies


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
            if item.users == 0 and item.name.startswith(("L0", "L1", "Kit_", "CK_")):
                block.remove(item)
    scene = bpy.data.scenes.new(SCENE_NAME)
    scene.unit_settings.system = "METRIC"
    return scene


def new_collection(scene, name, parent=None):
    coll = bpy.data.collections.new(name)
    (parent or scene.collection).children.link(coll)
    return coll


def label(coll, name, text, location, size=0.06):
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


def copy_rig(coll, prefix, location, lady):
    root = bpy.data.objects[RIG].copy()
    root.name = prefix + "Root"
    coll.objects.link(root)
    root.parent = None
    root.location = location
    root.rotation_euler = (0, 0, 0)
    arm = bpy.data.objects[f"{RIG}_Armature"].copy()
    arm.name = prefix + "Armature"
    coll.objects.link(arm)
    arm.parent = root
    for suffix in ("Body", lady["hair"], "Shoes" + lady["shoes"]):
        obj = bpy.data.objects[f"{RIG}_{suffix}"].copy()
        obj.name = prefix + suffix
        coll.objects.link(obj)
        obj.parent = arm
        obj.hide_viewport = obj.hide_render = False
        for mod in obj.modifiers:
            if mod.type == "ARMATURE":
                mod.object = arm
        if suffix.startswith("Shoes") and lady.get("shoe_colour"):
            for slot in obj.material_slots:
                slot.link = "OBJECT"
                slot.material = material(lady["shoe_colour"])
        if suffix == "Body":
            skin = bpy.data.materials.get("T_skin_f")
            for slot in obj.material_slots:
                if slot.material and slot.material.name in SKIN_OVER and skin:
                    slot.link = "OBJECT"
                    slot.material = skin
    return root, arm


def build_ladies(scene, coll, body):
    for i, lady in enumerate(LADIES):
        prefix = f"L{i + 1:02d}_"
        sub = new_collection(scene, f"{i + 1:02d} {lady['name']}", coll)
        x = (len(LADIES) - 1) / 2 * SPACING - i * SPACING
        root, arm = copy_rig(sub, prefix, (x, 0, 0), lady)
        scene.view_layers[0].update()
        DRESSES[lady["dress"]](Build(sub, prefix, body, lady["colours"], root, arm))
        label(sub, prefix + "Label", lady["name"], (x, 0.4, -0.1))


def build_kit(scene, coll, body):
    """Each dress's pieces laid out in a row, unrigged, with their names."""
    x0 = KIT_START_X
    seen = set()
    for row, lady in enumerate(LADIES):
        if lady["dress"] in seen:
            continue
        seen.add(lady["dress"])
        baseline = -2.0 * len(seen) + 2.0
        b = Build(coll, f"Kit_{lady['dress']}_", body, lady["colours"])
        DRESSES[lady["dress"]](b)
        label(coll, f"Kit_{lady['dress']}_Row", lady["name"], (x0 + 0.5, 0, baseline + 0.9), size=0.08).data.align_x = "RIGHT"
        x = x0
        for obj in b.objects:
            corners = [Vector(c) for c in obj.bound_box]
            lo = Vector((min(c.x for c in corners), min(c.y for c in corners), min(c.z for c in corners)))
            hi = Vector((max(c.x for c in corners), max(c.y for c in corners), max(c.z for c in corners)))
            width = max(hi.x - lo.x, 0.11)  # room for its label
            obj.location = Vector((x - width / 2 - (lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, baseline - lo.z))
            label(coll, obj.name + "_Label", obj.name[len(b.prefix):], (x - width / 2, 0, baseline - 0.06), size=0.025)
            x -= width + 0.12


def add_cameras(scene, kit_coll):
    def camera(name, location, scale, rotation=(math.pi / 2, 0, math.pi)):
        data = bpy.data.cameras.new("CK_" + name)
        data.type = "ORTHO"
        data.ortho_scale = scale
        obj = bpy.data.objects.new("CK_" + name, data)
        obj.location = location
        obj.rotation_euler = rotation  # looking along -Y at the ladies' fronts
        scene.collection.objects.link(obj)
        return obj

    ladies = camera("Cam_Ladies", (0, 10, 0.85), SPACING * len(LADIES) + 0.4)
    scene.view_layers[0].update()
    kit = list(kit_coll.objects)
    corners = [o.matrix_world @ Vector(c) for o in kit for c in o.bound_box]
    lo_x, hi_x = min(c.x for c in corners) - 0.2, max(c.x for c in corners) + 0.2
    lo_z, hi_z = min(c.z for c in corners) - 0.2, max(c.z for c in corners) + 0.2
    camera("Cam_Kit", ((lo_x + hi_x) / 2, 10, (lo_z + hi_z) / 2), max(hi_x - lo_x, (hi_z - lo_z) * 16 / 9))
    scene.camera = ladies
    sun = bpy.data.objects.new("CK_Sun", bpy.data.lights.new("CK_Sun", "SUN"))
    sun.rotation_euler = (math.radians(50), 0, math.radians(160))
    scene.collection.objects.link(sun)
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1200
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.display.shading.show_cavity = True


def main():
    body = Body()
    scene = reset_scene()
    try:
        bpy.context.window.scene = scene
    except AttributeError:
        pass
    build_ladies(scene, new_collection(scene, "Ladies"), body)
    kit = new_collection(scene, "Kit")
    build_kit(scene, kit, body)
    add_cameras(scene, kit)
    return scene


if __name__ == "__main__":
    main()
