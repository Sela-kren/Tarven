"""
Her hair, built the way the reference models build theirs (ref/_head_work/hair/HAIR_STUDY.md): layers of thin
ribbon cards, each one a clump of hair that roots on her scalp, lies along it and hangs off it, with a close cap
under them so no scalp shows between the cards.

What it makes, for each style in STYLES (the game's names, LOOK_OPTIONS.Female.hairstyles in appearance.ts):
  Female_Hair          the bob (her own style, the first in the list)
  Female_HairBraid     the braided bob: a deep side parting, a swept fringe, a braid along the parting
  Female_HairPixie     the pixie: short, layered, pointed ends, a side-swept fringe
  Female_HairLong      long hair to her shoulder blades, bangs, face-framing locks
  Female_HairPonytail  combed back to a tie at the back of her head, a full tail
  Female_HairBun       combed up to a bun on top
  Female_HairTail      the high tail: a tie high on her crown, the tail arcing back and down
Each object keeps its name (the game finds it by ^Female_Hair...), is parented to the armature as an OBJECT with an
Armature modifier, carries vertex groups (Female_Head 1.0 at the root, the hair springs further out, as
build_world.hair_spring_weights does), only plain material names (T_hair_f, T_hair_tie) and tarven_keep.

The cards (the refs' Hair_01): a lens cross-section 1.2-1.8 mm thick, 8-24 mm wide, bowed so the edges curl in, the
root narrow and sunk into the cap, the tip pointed or blunt (cut). Each card is draped: from its root it steps along
a heading, bends to gravity and the style's comb, and is kept off her skin (and well off her brows, lashes and eyes)
by its layer height. The UVs are laid as in the refs' strand atlas: every card spans the whole atlas height (root at
v 1, tip at v 0) in its own column, so a strand texture paints every card the same way, root to tip.

Headless:  blender -b <copy of female_master.blend> -P tools/blender/real_heroin/add_hair.py -- <out.blend> [styles]
           styles: comma list of keys (bob,braid,pixie,long,ponytail,bun,tail); all when left out.
Live: exec with BODY_NAME / ARM_NAME / STYLES in the globals. Safe to re-run: it replaces each object's mesh.
Never run it on art/female_master.blend while that file is open in Blender (BLENDER_BRIDGE.md).
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

_ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = _ARGS[0] if (_ARGS and bpy.app.background) else None
BODY_NAME = globals().get("BODY_NAME", "Female_Body")
ARM_NAME = globals().get("ARM_NAME", "Female_Armature")
PREFIX = globals().get("PREFIX", "Female")
HEAD_BONE = f"{PREFIX}_Head"
FACE_PARTS = globals().get("FACE_PARTS", [f"{PREFIX}_BodyBrows", f"{PREFIX}_BodyLash_L", f"{PREFIX}_BodyLash_R",
                                          f"{PREFIX}_BodyEye_L", f"{PREFIX}_BodyEye_R"])
_STYLE_ARG = _ARGS[1] if len(_ARGS) > 1 else os.environ.get("TARVEN_HAIR_STYLES", "")
STYLES = globals().get("STYLES") or ([s for s in _STYLE_ARG.split(",") if s] or
                                     ["bob", "braid", "pixie", "long", "ponytail", "bun", "tail"])
OBJECT_OF = {"bob": "Hair", "braid": "HairBraid", "pixie": "HairPixie", "long": "HairLong",
             "ponytail": "HairPonytail", "bun": "HairBun", "tail": "HairTail"}
MM = 0.001
SEED = 7

# --- her head (rest pose, world metres); +y is her front, +x her right-hand side as the bones name it (Strand_R) ----
HEAD_C = Vector(globals().get("HEAD_C", (0.0, 0.038, 1.600)))   # middle of her skull: scalp directions start here
CHIN_Z = globals().get("CHIN_Z", 1.478)
BROW_TOP = 1.622            # the top of her brows (Female_BodyBrows)
FACE_CLEAR = 4.0 * MM       # cards keep this far off her brows, lashes and eyes
# Her hairline: the cap covers her scalp above this height, by angle round her head (0 her front, 180 her back).
HAIRLINE = [(0, 1.671), (25, 1.667), (45, 1.652), (60, 1.628), (70, 1.600), (80, 1.585), (92, 1.618),
            (108, 1.618), (122, 1.585), (138, 1.540), (158, 1.505), (180, 1.494)]
EAR = dict(x=0.0705, z=(1.548, 1.640), y=(-0.035, 0.065))   # her ears stand out past this; the cap leaves them

# --- the cards -------------------------------------------------------------------------------------------------------
LAYER_H = [3.2 * MM, 6.4 * MM, 9.6 * MM]  # card heights over her skin by layer (refs: 3-6 layers in about 1-1.5 cm)
ROOT_H = 1.6 * MM          # roots sit inside the cap (refs: roots within +-3 mm of the scalp)
RISE = 0.024               # metres along a card over which it rises from its root to its layer
SEG = 0.012                # card row spacing (refs: 8-15 mm); 0.009 gave a third more points for the same shapes
THICK = 1.5 * MM           # lens thickness at its fullest
BOW = 0.12                 # how far a card's middle stands out over its edges, as a share of its width (refs 0.14-0.19)
ATLAS_COLS = 16            # strand-atlas columns a card can take (u)
CAP_H = (0.12 * MM, 2.2 * MM)  # cap height over her skin at the hairline (feathered to nothing) and further in
CAP_DECIMATE = 0.5         # the cap keeps this share of her scalp's faces (it is hidden; only its edge shows)
CAP_FEATHER = 0.016        # metres in from the hairline over which the cap rises


def lerp(a, b, t):
    return a + (b - a) * t


def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def table(points, x):
    """Piecewise-linear lookup in a sorted (x, y) table."""
    if x <= points[0][0]:
        return points[0][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x <= x1:
            return lerp(y0, y1, (x - x0) / (x1 - x0))
    return points[-1][1]


def direction(az, el):
    a, e = math.radians(az), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))


def angles(p):
    d = p - HEAD_C
    az = math.degrees(math.atan2(d.x, d.y))
    el = math.degrees(math.atan2(d.z, math.hypot(d.x, d.y)))
    return az, el


# --- scene ----------------------------------------------------------------------------------------------------------
BODY = bpy.data.objects[BODY_NAME]
ARM = bpy.data.objects[ARM_NAME]
TO_LOCAL = ARM.matrix_world.inverted()


def world_mesh(obj, zmin=None):
    """An object's rest-pose (basis) points and faces in world space, as a BVH; faces under zmin are left out."""
    mw = obj.matrix_world
    pts = [mw @ v.co for v in obj.data.vertices]
    faces = [list(p.vertices) for p in obj.data.polygons
             if zmin is None or max(pts[i].z for i in p.vertices) > zmin]
    return pts, faces, BVHTree.FromPolygons(pts, faces)


BODY_PTS, BODY_FACES, BODY_BVH = world_mesh(BODY, zmin=1.0)
FACE_BVHS = [world_mesh(bpy.data.objects[n])[2] for n in FACE_PARTS if n in bpy.data.objects]


def signed(bvh, p):
    loc, nrm, _, dist = bvh.find_nearest(p)
    if loc is None:
        return 1.0, None, None
    s = dist if (p - loc).dot(nrm) >= 0 else -dist
    return s, loc, nrm


# Over her ears a style that covers them hangs past them in one smooth swell rather than a lump per ear fold: in
# the ears' band round her head a card keeps at least EAR_REACH (plus its height) out from her middle line,
# pushed straight out sideways. The band eases in and out in height and in angle.
EAR_REACH = 0.087
EAR_BAND_Z = (1.440, 1.480, 1.625, 1.668)   # starts, full, full, ends (metres): down past her jaw, so the
#                                              sides fall straight from the ears' swell instead of flaring
EAR_BAND_AZ = (62.0, 76.0, 118.0, 138.0)    # degrees round from her front
OVER_EARS = [False]


def ear_hull(p, h):
    az = abs(math.degrees(math.atan2(p.x, p.y - HEAD_C.y)))
    z0, z1, z2, z3 = EAR_BAND_Z
    a0, a1, a2, a3 = EAR_BAND_AZ
    wz = ease((p.z - z0) / (z1 - z0)) * (1 - ease((p.z - z2) / (z3 - z2)))
    wa = ease((az - a0) / (a1 - a0)) * (1 - ease((az - a2) / (a3 - a2)))
    need = EAR_REACH * wz * wa + h   # layers keep their order across the band's soft edges
    r = math.hypot(p.x, p.y - HEAD_C.y)
    if wz * wa <= 0 or r >= need or r < 1e-6:
        return p, False
    k = need / r
    return Vector((p.x * k, HEAD_C.y + (p.y - HEAD_C.y) * k, p.z)), True


def push_out(p, h, ears=True):
    """Moves p out until it is h off her skin and FACE_CLEAR off her brows, lashes and eyes."""
    for _ in range(4):
        moved = False
        if OVER_EARS[0] and ears:
            p, moved = ear_hull(p, h)
        s, loc, nrm = signed(BODY_BVH, p)
        if loc is not None and s < 0 and not inside_body(p):
            s = -s        # behind a thin part (her ear) the nearest face can face away: it is still outside
        if loc is not None and s < h:
            out = (p - loc).normalized() if s > 1e-5 else nrm
            p = loc + out * h
            moved = True
        for bvh in FACE_BVHS:
            s, loc, nrm = signed(bvh, p)
            if loc is not None and abs(s) < FACE_CLEAR:
                out = (p - loc).normalized() if s > 1e-5 else nrm
                if out.y < 0 and out.z < 0.3:     # always out in front of / above the face part
                    out = nrm if nrm.y > 0 else Vector((0, 0.6, 0.8))
                p = loc + out.normalized() * FACE_CLEAR
                moved = True
        if not moved:
            break
    return p


def scalp(az, el, h=0.0):
    """The point on her skin in this scalp direction (the outermost hit coming in), lifted h along its normal."""
    d = direction(az, el)
    hit, nrm, _, _ = BODY_BVH.ray_cast(HEAD_C + d * 0.35, -d, 0.4)
    if hit is None:
        return HEAD_C + d * 0.09, d
    return hit + nrm * h, nrm


def out_of(p):
    """Away from her skin at p (the nearest skin point's way out)."""
    s, loc, nrm = signed(BODY_BVH, p)
    if loc is None:
        return (p - HEAD_C).normalized()
    if s > 1e-4:
        return (p - loc).normalized()
    return nrm


def facing(p):
    """The way a card's face looks: out from the middle of her skull above it, straight out sideways from her middle
    line below it. A smooth field, so cards don't twist with the folds of her ear or jaw."""
    if p.z >= HEAD_C.z:
        d = p - HEAD_C
    else:
        d = Vector((p.x, p.y - HEAD_C.y, (p.z - HEAD_C.z) * 0.15))
    return d.normalized() if d.length > 1e-6 else Vector((0, 0, 1))


# --- a card ---------------------------------------------------------------------------------------------------------
class Card:
    """One hair card (a clump): where it roots, how it is combed, how long and wide, how it ends."""

    def __init__(self, root, heading, length, width, layer=1, tip="point", bend=30.0, comb=None, flick=0.0,
                 tilt=0.0, flare=0.0, cut=None, group=None, h=None, curl_in=0.0, attract=None, sink=True,
                 hug=0.0, root_w=0.6, root_h=None, taper=0.55, tip_end=0.12):
        self.tip_end = tip_end      # a pointed tip's width share at its very end (fuller points: 0.25-0.4)
        self.hug = hug              # how hard it is pulled onto her head (cards combed sideways lie on it, not off it)
        self.root_w = root_w        # width share at the root (thin roots for a combed-back hairline)
        self.root_h = ROOT_H if root_h is None else root_h
        self.taper = taper          # where along it a pointed tip starts to narrow
        self.root = root            # (az, el) on her scalp, or a world Vector
        self.heading = heading      # world vector it sets off along (projected onto her scalp)
        self.length, self.width, self.layer, self.tip = length, width, layer, tip
        self.bend = bend            # how fast it turns to gravity and the comb, per metre
        self.comb = comb or Vector((0, 0, -1))   # the pull it turns to (gravity plus a style's comb)
        self.flick, self.curl_in, self.tilt, self.flare = flick, curl_in, tilt, flare
        self.cut = cut              # a function (point) -> True where the hair is cut (a bob's hem)
        self.group = group          # extra weight group ("Strand_R", "Strand_L", "tail")
        self.h = h                  # its own height over her skin (else LAYER_H[layer])
        self.attract = attract      # a world point it is combed towards (a tie)
        self.sink = sink

    def path(self):
        h_layer = self.h if self.h is not None else LAYER_H[self.layer]
        if isinstance(self.root, Vector):
            start, nrm = self.root, out_of(self.root)
        else:
            start, nrm = scalp(*self.root, self.root_h if self.sink else h_layer)
        d = self.heading - nrm * self.heading.dot(nrm)
        d = d.normalized() if d.length > 1e-6 else Vector((0, 0, -1))
        pts = [start]
        n = max(2, int(math.ceil(self.length / SEG)))
        seg = self.length / n
        for i in range(1, n + 1):
            s = i * seg
            u = s / self.length
            pull = self.comb.copy()
            if self.attract is not None:
                to = self.attract - pts[-1]
                pull = to.normalized() * 1.0 + pull * 0.15
            d = (d + pull * self.bend * seg).normalized()
            if self.hug:
                d = (d - out_of(pts[-1]) * self.hug * seg).normalized()
            if self.flick and u > 0.62:
                d = (d + out_of(pts[-1]) * self.flick * seg * 30 * (u - 0.62) / 0.38).normalized()
            if self.curl_in and u > 0.75:
                d = (d - out_of(pts[-1]) * self.curl_in * seg * 30).normalized()
            p = pts[-1] + d * seg
            h = lerp(self.root_h if self.sink else h_layer, h_layer, ease(s / RISE)) + self.flare * max(0.0, u - 0.3) / 0.7
            p = push_out(p, h, ears=s > RISE)
            d = (d * 0.5 + (p - pts[-1]).normalized() * 0.5).normalized()   # a push turns it only halfway
            pts.append(p)
            if self.cut and self.cut(p):
                # end exactly on the cut, not up to a row past it: the hem is one smooth line, not steps
                lo, hi = pts[-2], p
                for _ in range(12):
                    mid = (lo + hi) * 0.5
                    if self.cut(mid):
                        hi = mid
                    else:
                        lo = mid
                pts[-1] = hi
                if (pts[-1] - pts[-2]).length < seg * 0.25 and len(pts) > 2:
                    pts.pop(-2)
                break
            if self.attract is not None and (p - self.attract).length < seg * 0.8:
                break
        return pts

    def profile(self, u):
        """Width share along the card (root to tip)."""
        w = lerp(self.root_w, 1.0, ease(u / 0.2))
        if self.tip == "point":
            w *= lerp(1.0, self.tip_end, ease((u - self.taper) / (1 - self.taper)))
        elif self.tip == "soft":
            w *= lerp(1.0, 0.38, ease((u - 0.6) / 0.4))
        elif self.tip == "round":   # a cut end with its corners rounded off (a bob's hem)
            w *= lerp(1.0, 0.55, ease((u - 0.84) / 0.16) ** 1.5)
        else:   # blunt: a cut end, a little narrower
            w *= lerp(1.0, 0.82, ease((u - 0.75) / 0.25))
        return w


class Builder:
    """Collects cards and other pieces into one mesh with UVs and weight tags."""

    def __init__(self):
        self.verts, self.faces, self.uvs, self.mats, self.tags = [], [], [], [], []
        self.rng = random.Random(SEED)

    def add_vert(self, p, tag):
        self.verts.append(p)
        self.tags.append(tag)
        return len(self.verts) - 1

    def ribbon(self, pts, widths, thick, normals=None, tip="point", tag=None, col=None, tilt=0.0, mat=0, bow=BOW):
        """A lens-section ribbon along pts. Rings of 6 points: edge, top, top, edge, bottom, bottom."""
        n = len(pts)
        if n < 2:
            return
        col = self.rng.randrange(ATLAS_COLS) if col is None else col
        frames = []
        prev_n = None
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            o = normals[i] if normals else facing(p)
            if prev_n is not None:
                o = (o * 0.5 + prev_n * 0.5)
            o = (o - t * o.dot(t)).normalized()
            prev_n = o
            s = t.cross(o).normalized()
            if tilt:
                a = tilt * i / (n - 1)
                s, o = (s * math.cos(a) + o * math.sin(a)), (o * math.cos(a) - s * math.sin(a))
            frames.append((t, o, s))
        js = (-1.0, -1 / 3, 1 / 3, 1.0)
        rings = []
        length = sum((pts[i + 1] - pts[i]).length for i in range(n - 1))
        acc = 0.0
        for i, p in enumerate(pts):
            if i:
                acc += (pts[i] - pts[i - 1]).length
            v = 1.0 - acc / max(length, 1e-6)
            t, o, s = frames[i]
            w = widths[i]
            th = thick * (0.45 + 0.55 * min(1.0, w / max(widths) * 1.6)) if max(widths) > 0 else thick
            last = i == n - 1 and tip == "point"
            if last:
                rings.append([self.add_vert(p, tag)])
                self.vuv[rings[-1][0]] = ((col + 0.5) / ATLAS_COLS, 0.0)
                continue
            ring = []
            for j in js:
                bowed = o * (bow * w * (1 - j * j) - bow * w * 0.5)
                ring.append((p + s * (w / 2 * j) + bowed + o * (th / 2 * math.sqrt(max(0.0, 1 - j * j))), j, v))
            for j in (1 / 3, -1 / 3):
                bowed = o * (bow * w * (1 - j * j) - bow * w * 0.5)
                ring.append((p + s * (w / 2 * j) + bowed - o * (th / 2 * math.sqrt(1 - j * j)), j, v))
            idx = []
            for q, j, vv in ring:
                idx.append(self.add_vert(q, tag))
            rings.append(idx)
            # remember uv per ring vertex
            self._ring_uv(idx, ring, col)
        # faces between rings; the lens's two side edges are sharp, so each face of the card shades flat across
        for a, b in zip(rings, rings[1:]):
            if len(a) == 6 and len(b) == 6:
                self.sharp.extend([(a[0], b[0]), (a[3], b[3])])
            if len(b) == 1:
                for k in range(len(a)):
                    self.faces.append([a[k], a[(k + 1) % len(a)], b[0]])
                    self.mats.append(mat)
            else:
                for k in range(len(a)):
                    self.faces.append([a[k], a[(k + 1) % len(a)], b[(k + 1) % len(b)], b[k]])
                    self.mats.append(mat)
        self.faces.append(list(reversed(rings[0])))
        self.mats.append(mat)
        if len(rings[-1]) > 1:
            self.faces.append(list(rings[-1]))
            self.mats.append(mat)

    def _ring_uv(self, idx, ring, col):
        for k, (q, j, v) in zip(idx, ring):
            u = (col + (j + 1) / 2 * 0.9 + 0.05) / ATLAS_COLS
            self.vuv[k] = (u, v)

    @property
    def sharp(self):
        if not hasattr(self, "_sharp"):
            self._sharp = []
        return self._sharp

    @property
    def vuv(self):
        if not hasattr(self, "_vuv"):
            self._vuv = {}
        return self._vuv

    def card(self, c):
        pts = c.path()
        if len(pts) < 3:
            return
        n = len(pts)
        acc = [0.0]
        for i in range(1, n):
            acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
        L = acc[-1]
        widths = [c.width * c.profile(a / L) for a in acc]
        self.ribbon(pts, widths, THICK, tip="point" if c.tip == "point" and c.tip_end <= 0.15 else "blunt",
                    tag=(c.group, c.layer),
                    tilt=c.tilt)

    def tube_cards(self, axis, radius, count, width, layer_r=(1.0, 0.62), tip="point", tag=None, jitter=0.15,
                   twist=0.0, lengths=(0.8, 1.0)):
        """Cards laid round a tube (a tail or a bun's twist): each runs along the axis at its own angle."""
        n = len(axis)
        acc = [0.0]
        for i in range(1, n):
            acc.append(acc[-1] + (axis[i] - axis[i - 1]).length)
        L = acc[-1]
        frames = []
        ref = Vector((0, 0, 1))
        for i in range(n):
            t = (axis[min(i + 1, n - 1)] - axis[max(i - 1, 0)]).normalized()
            a = ref - t * ref.dot(t)
            if a.length < 1e-4:
                a = Vector((1, 0, 0)) - t * t.x
            a.normalize()
            b = t.cross(a)
            frames.append((t, a, b))
            ref = a
        for li, share in enumerate(layer_r):
            k = count if li == 0 else max(4, int(count * 0.6))
            for c in range(k):
                ang = 2 * math.pi * (c + 0.5 * li) / k + self.rng.uniform(-jitter, jitter)
                ln = self.rng.uniform(*lengths)
                pts, nrms, widths = [], [], []
                for i in range(n):
                    if acc[i] > ln * L + 1e-6:
                        break
                    u = acc[i] / L
                    t, a, b = frames[i]
                    angle = ang + twist * u
                    r = radius(u) * share
                    radial = a * math.cos(angle) + b * math.sin(angle)
                    pts.append(axis[i] + radial * r)
                    nrms.append(radial)
                    widths.append(width * min(1.0, 2 * math.pi * radius(u) * share / k * 1.7 / width))
                if len(pts) < 3:
                    continue
                m = len(pts)
                prof = [lerp(1.0, 0.06 if tip == "point" else 0.8, ease((i / (m - 1) - 0.6) / 0.4)) for i in range(m)]
                widths = [w * f for w, f in zip(widths, prof)]
                self.ribbon(pts, widths, THICK, normals=nrms, tip=tip, tag=tag or ("tail", 1))

    def ring(self, centre, axis, radius, tube_r, mat=0, tag=None, segs=20, sides=6):
        """A closed ring (a hair tie) round an axis."""
        axis = axis.normalized()
        a = Vector((0, 0, 1)) - axis * axis.z
        if a.length < 1e-3:
            a = Vector((1, 0, 0)) - axis * axis.x
        a.normalize()
        b = axis.cross(a)
        rings = []
        for i in range(segs):
            th = 2 * math.pi * i / segs
            r = a * math.cos(th) + b * math.sin(th)
            idx = []
            for k in range(sides):
                ph = 2 * math.pi * k / sides
                p = centre + r * (radius + tube_r * math.cos(ph)) + axis * (tube_r * 1.6 * math.sin(ph))
                idx.append(self.add_vert(p, tag))
                self.vuv[idx[-1]] = (0.97, 0.03)
            rings.append(idx)
        for i in range(segs):
            A, B = rings[i], rings[(i + 1) % segs]
            for k in range(sides):
                self.faces.append([A[k], B[k], B[(k + 1) % sides], A[(k + 1) % sides]])
                self.mats.append(mat)

    def braid(self, path, width, tag=None, lumps=None):
        """A three-strand braid lying along path: three lens ribbons crossing over one another."""
        n = len(path)
        acc = [0.0]
        for i in range(1, n):
            acc.append(acc[-1] + (path[i] - path[i - 1]).length)
        L = acc[-1]
        period = width * 2.2
        for k in range(3):
            pts, nrms, widths = [], [], []
            for i in range(n):
                t = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
                o = out_of(path[i])
                o = (o - t * o.dot(t)).normalized()
                s = t.cross(o)
                ph = 2 * math.pi * acc[i] / period + 2 * math.pi * k / 3
                taper = lerp(0.55, 1.0, ease(acc[i] / 0.02)) * lerp(1.0, 0.5, ease((acc[i] / L - 0.8) / 0.2))
                pts.append(path[i] + s * (math.sin(ph) * width * 0.32 * taper) + o * ((math.cos(ph) + 1) * width * 0.16))
                nrms.append(o)
                widths.append(width * 0.46 * taper)
            # resample finely so the crossing reads
            self.ribbon(pts, widths, THICK * 1.6, normals=nrms, tip="blunt", tag=tag, bow=0.05)

    def settle(self, clear=0.5 * MM):
        """Last pass: any card point that ended inside or on her skin (a card's edge dipping into her cheek) is put
        just outside it. The cap is left as built."""
        moved = 0
        for i, (p, tag) in enumerate(zip(self.verts, self.tags)):
            if tag and tag[0] == "cap":
                continue
            s, loc, nrm = signed(BODY_BVH, p)
            if loc is None or abs(s) > 0.012:
                continue
            if s < 0 and not inside_body(p):
                s = -s
            if s < clear:
                out = (p - loc).normalized() if s > 1e-5 else nrm
                self.verts[i] = loc + out * clear
                moved += 1
        return moved

    def to_object(self, name, materials, weights):
        me = bpy.data.meshes.new(name + "_tmp")
        me.from_pydata([TO_LOCAL @ p for p in self.verts], [], self.faces)
        me.validate(clean_customdata=False)
        bm = bmesh.new()
        bm.from_mesh(me)
        cap = {i for i, t in enumerate(self.tags) if t and t[0] == "cap"}
        bmesh.ops.recalc_face_normals(bm, faces=[f for f in bm.faces if f.verts[0].index not in cap])
        bm.to_mesh(me)
        bm.free()
        sharp = {(min(a, c), max(a, c)) for a, c in self.sharp}
        attr = me.attributes.get("sharp_edge") or me.attributes.new("sharp_edge", "BOOLEAN", "EDGE")
        for e in me.edges:
            if tuple(sorted(e.vertices)) in sharp:
                attr.data[e.index].value = True
        uvl = me.uv_layers.new(name="UVMap")
        for poly in me.polygons:
            poly.use_smooth = True
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index
                uvl.data[li].uv = self.vuv.get(vi, (0.0, 0.0))
        for i, poly in enumerate(me.polygons):
            poly.material_index = self.mats[i] if i < len(self.mats) else 0
        for mname in materials:
            me.materials.append(material(mname))
        obj = bpy.data.objects.get(name)
        if obj is None:
            obj = bpy.data.objects.new(name, me)
            for c in BODY.users_collection:
                c.objects.link(obj)
        else:
            old = obj.data
            obj.data = me
            if old.users == 0:
                bpy.data.meshes.remove(old)
        me.name = name
        obj.parent = ARM
        obj.parent_type = "OBJECT"
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.matrix_basis = Matrix.Identity(4)
        obj.vertex_groups.clear()
        weights(obj, self)
        mod = next((m for m in obj.modifiers if m.type == "ARMATURE"), None) or obj.modifiers.new("Armature", "ARMATURE")
        mod.object = ARM
        obj["tarven_keep"] = True
        return obj


MATERIAL_COLOURS = {"T_hair_f": (0.075, 0.06, 0.06), "T_hair_tie": (0.45, 0.08, 0.1)}


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    c = MATERIAL_COLOURS[name]
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    bsdf = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*c, 1)
        bsdf.inputs["Roughness"].default_value = 0.95
    return m


# --- the cap under the cards ----------------------------------------------------------------------------------------
def hairline_z(az):
    return table(HAIRLINE, abs(az))


def in_hair(p):
    az, el = angles(p)
    if p.z < hairline_z(az):
        return False
    if abs(p.x) > EAR["x"] and EAR["z"][0] < p.z < EAR["z"][1] and EAR["y"][0] < p.y < EAR["y"][1]:
        return False
    return p.z > 1.45


def add_cap(b, hairline=None, lift=0.0, inset=0.0):
    """A thin sheet over her scalp, inside the hairline: the refs' dark scalp / hairline piece. Its edge is cut
    exactly along the hairline curve (not along her skin's faces, which left a stepped edge) and feathers from
    CAP_H[0] there to CAP_H[1] further in, so it meets her skin as one soft line. It is a single sheet, thinned to
    CAP_DECIMATE of her scalp's faces: it lies under the cards and only its edge is ever seen."""
    base = hairline or hairline_z
    line = lambda az: base(az) + inset

    def level(p):
        """Above the hairline (> 0) or below it (< 0), metres."""
        if abs(p.x) > EAR["x"] and EAR["z"][0] < p.z < EAR["z"][1] and EAR["y"][0] < p.y < EAR["y"][1]:
            return -0.01
        return p.z - line(angles(p)[0])

    polys = [poly for poly in BODY.data.polygons if all(BODY_PTS[i].z > 1.45 for i in poly.vertices)]
    lev = {}
    keep = []
    for poly in polys:
        vals = [lev.setdefault(i, level(BODY_PTS[i])) for i in poly.vertices]
        if max(vals) > 0:
            keep.append(list(poly.vertices))
    if not keep:
        return
    # the outside corners of the kept faces slide onto the hairline, towards the inside corners they share faces with
    pos = {}
    neighbours = {}
    for vs in keep:
        for i in vs:
            neighbours.setdefault(i, set()).update(vs)
    for i, nb in neighbours.items():
        p = BODY_PTS[i]
        if lev[i] > 0:
            pos[i] = p.copy()
            continue
        hits = []
        for j in nb:
            if lev[j] > 0:
                t = lev[j] / (lev[j] - lev[i])
                hits.append(BODY_PTS[j].lerp(p, t))
        pos[i] = sum(hits, Vector()) / len(hits) if hits else p.copy()
    ids = sorted(pos)
    index = {i: k for k, i in enumerate(ids)}
    me = bpy.data.meshes.new("_hair_cap_tmp")
    me.from_pydata([pos[i] for i in ids], [], [[index[i] for i in vs] for vs in keep])
    me.validate()
    tmp = bpy.data.objects.new("_hair_cap_tmp", me)
    bpy.context.scene.collection.objects.link(tmp)
    dec = tmp.modifiers.new("dec", "DECIMATE")
    dec.ratio = CAP_DECIMATE
    dec.use_collapse_triangulate = False
    dg = bpy.context.evaluated_depsgraph_get()
    bm = bmesh.new()
    bm.from_object(tmp, dg)
    bpy.data.objects.remove(tmp)
    bpy.data.meshes.remove(me)
    bm.verts.ensure_lookup_table()
    border = [v.co.copy() for v in bm.verts if v.is_boundary]
    kd = KDTree(max(1, len(border)))
    for k, co in enumerate(border):
        kd.insert(co, k)
    kd.balance()
    idx = {}
    for v in bm.verts:
        loc, nrm, _, _ = BODY_BVH.find_nearest(v.co)
        loc = loc if loc is not None else v.co
        nrm = nrm if nrm is not None else (v.co - HEAD_C).normalized()
        _, _, dist = kd.find(v.co)
        h = lerp(CAP_H[0], CAP_H[1] + lift, ease(dist / CAP_FEATHER))
        idx[v.index] = b.add_vert(loc + nrm * h, ("cap", 0))
        b.vuv[idx[v.index]] = (0.985, 0.98)
    for f in bm.faces:
        vs = [idx[v.index] for v in f.verts]
        c = f.calc_center_median()
        if f.normal.dot(c - HEAD_C) < 0:
            vs.reverse()
        b.faces.append(vs)
        b.mats.append(0)
    bm.free()


def _in(p, line):
    az, el = angles(p)
    if p.z < line(az):
        return False
    if abs(p.x) > EAR["x"] and EAR["z"][0] < p.z < EAR["z"][1] and EAR["y"][0] < p.y < EAR["y"][1]:
        return False
    return True


# --- weights --------------------------------------------------------------------------------------------------------
NECK_Z = ARM.data.bones[HEAD_BONE].head_local.z if HEAD_BONE in ARM.data.bones else 1.466
HAIR_SOFT = {"from": 0.09, "over": 0.1, "most": 0.55}   # as build_world.HAIR_SOFT: metres above the chin
HAIR_TAIL = {"from": 0.03, "over": 0.15, "most": 0.7}   # below the neck
HAIR_ONTO_BACK = 0.08
HAIR_SOFT_REACH, HAIR_CLEAR = 0.025, 0.002
STRAND_ROOT, STRAND_LENGTH = 0.13, 0.2


def weigh(obj, b):
    """Head 1.0 where it rides the head; the head's spring (HairSoft) for what hangs, the torso and its spring
    (HairTail) for what lies on her back, the side strands for a bob's face-framing locks (build_world's rules)."""
    groups = {}

    def g(name):
        full = f"{PREFIX}_{name}"
        if full not in groups:
            groups[full] = obj.vertex_groups.get(full) or obj.vertex_groups.new(name=full)
        return groups[full]

    soft_top = CHIN_Z + HAIR_SOFT["from"]
    tail_top = NECK_Z - HAIR_TAIL["from"]
    for i, p in enumerate(b.verts):
        tag = b.tags[i] or (None, 0)
        z = p.z
        w = {}
        t = min(1.0, max(0.0, (NECK_Z - 0.01 - z) / HAIR_ONTO_BACK))
        if t < 1:
            w["Head"] = 1 - t
        if t > 0:
            w["Torso"] = t
        if tag[0] in ("Strand_R", "Strand_L"):
            s = min(1.0, max(0.0, (CHIN_Z + STRAND_ROOT - z) / STRAND_LENGTH)) * 0.8
            w = {k: v * (1 - s) for k, v in w.items()}
            w[tag[0]] = s
        elif tag[0] != "cap":
            if z > NECK_Z - 0.01:
                share = HAIR_SOFT["most"] * ease((soft_top - z) / HAIR_SOFT["over"])
                if share > 0:
                    room = signed(BODY_BVH, p)[0] - HAIR_CLEAR
                    share = min(share, max(0.0, room) / HAIR_SOFT_REACH)
                    w = {k: v * (1 - share) for k, v in w.items()}
                    w["HairSoft"] = share
            else:
                share = HAIR_TAIL["most"] * ease((tail_top - z) / HAIR_TAIL["over"])
                w = {k: v * (1 - share) for k, v in w.items()}
                w["HairTail"] = share
        for k, v in w.items():
            if v > 1e-4:
                g(k).add([i], v, "REPLACE")
    g("Head")


# --- styles ---------------------------------------------------------------------------------------------------------
def jit(rng, a):
    return rng.uniform(-a, a)


def cut_below(zfun):
    return lambda p: p.z < zfun(p)


def parting_points(front_az, back_az, n, el_front=58.0, el_back=56.0, side=0.0):
    """Points along a parting from her front hairline over the top to the crown, as (az, el)."""
    pts = []
    for i in range(n):
        t = i / (n - 1)
        if t < 0.5:
            el = lerp(el_front, 90.0, t / 0.5)
            az = front_az
        else:
            el = lerp(90.0, el_back, (t - 0.5) / 0.5)
            az = back_az
        pts.append((az, min(el, 89.0)))
    return pts


def side_heading(az, sx):
    """Down and away from a midline parting, on side sx (+1 her right/+x)."""
    return Vector((sx * 1.0, 0.0, -0.35))


def fringe_cards(b, cards, rng, span=(-62, 62), n=11, el=(60, 66), cut_z=1.633, width=(16, 22), layer=2,
                 tip="point", sweep=0.0, length=0.11, h=None):
    """Bangs, as the refs cut them: cards rooted on her front top, combed forward and down and cut above her brows,
    in two staggered rows so neighbours overlap (no even row of triangle gaps). Each card's drop below the hairline
    varies by about a quarter either way, and never comes below cut_z (about 1.3 cm over her brows); the tips are
    wide soft points or blunt cut ends, mixed."""
    drop = hairline_z(0) - cut_z
    for row in (0, 1):
        k = n if row == 0 else n - 1
        for i in range(k):
            t = (i + 0.5 * row) / (n - 1)
            az = lerp(span[0], span[1], t) + jit(rng, 2.5)
            e = rng.uniform(*el) + (2.5 if row else 0.0)
            head = Vector((math.sin(math.radians(az)) * 0.35 + sweep, 1.0, -0.1))
            # the drop: full in the middle, shorter towards the temples, each card +-20-35 % of it shorter or longer,
            # clamped so the longest stay at cut_z
            short = drop * rng.uniform(0.0, 0.55) + 0.012 * (abs(az) / 62) ** 2
            zc = cut_z + short + (0.003 if row else 0.0)
            kind = rng.random()
            tip_kind, tip_end, taper = ("point", 0.3, 0.45) if kind < 0.6 else (("soft", 0.38, 0.6) if kind < 0.85
                                                                                 else ("round", 0.55, 0.8))
            w = rng.uniform(*width) * MM * (1.0 if row == 0 else 0.85)
            cards.append(Card((az, e), head, length + jit(rng, 0.01), w, layer=layer, tip=tip_kind, bend=26,
                              comb=Vector((sweep * 0.6, 0.25, -1)), tip_end=tip_end, taper=taper,
                              cut=(lambda zc: lambda p: p.z < zc and p.y > 0.06)(zc), tilt=jit(rng, 0.25),
                              h=(h if h is not None else LAYER_H[layer]) - (1.2 * MM if row else 0.0)))


def bob_hem(a, layer):
    """A bob's hem: one smooth curve round her, a little longer at the front, each inner layer 2.5 mm shorter."""
    return 1.4925 - 0.011 * ease((180.0 - abs(a)) / 130.0) + 0.0025 * (2 - layer)


def style_bob(b, rng):
    """The bob (Emma's construction): three layers of wide cards, blunt ends cut level at her jaw and slightly
    longer at the front, tucked a little under, a fringe of a few wide soft-ended clumps above her brows."""
    cards = []
    rows = [(38, 8, (18, 24), 56, 150), (52, 12, (17, 23), 50, 180), (64, 13, (19, 26), 50, 180),
            (76, 14, (22, 30), 50, 180)]
    for r, (el, step, wid, az0, az1) in enumerate(rows):
        layer = max(0, r - 1)
        for sx in (-1, 1):
            az = az0
            while az <= az1 + 1e-6:
                a = sx * (az + jit(rng, 2.5))
                e = el + jit(rng, 3) + (8 if abs(a) < 70 and r else 0)
                head = Vector((math.sin(math.radians(a)) * 0.6, math.cos(math.radians(a)) * 0.6, -1))
                hem_z = bob_hem(a, layer) + jit(rng, 0.001)
                cut = (lambda hz: lambda p: p.z < hz)(hem_z)
                group = None
                if 50 <= abs(a) <= 85 and layer == 2:
                    group = "Strand_R" if a > 0 else "Strand_L"
                cards.append(Card((a, e), head, 0.24, rng.uniform(*wid) * MM, layer=layer, tip="round", bend=22,
                                  comb=Vector((0, -0.05, -1)), cut=cut, flare=1.0 * MM, curl_in=0.5,
                                  tilt=jit(rng, 0.2), group=group))
                az += step
    # the parting's top: cards from the midline down each side, over the inner ones
    for i, (az, el) in enumerate(parting_points(0, 180, 9, el_front=70, el_back=60)):
        if i in (0, 8):
            continue
        for sx in (-1, 1):
            a = az + sx * 2
            head = Vector((sx, -0.15 if az > 90 else 0.15, -0.3))
            hem_z = bob_hem(a, 2) + jit(rng, 0.001)
            cards.append(Card((a, el), head, 0.24, rng.uniform(22, 30) * MM, layer=2, tip="round", bend=24,
                              comb=Vector((sx * 0.1, 0, -1)), cut=(lambda hz: lambda p: p.z < hz)(hem_z),
                              flare=1.0 * MM, curl_in=0.5, tilt=jit(rng, 0.15)))
    fringe_cards(b, cards, rng, span=(-52, 52), n=8, el=(66, 72), cut_z=1.635, width=(24, 32), layer=1,
                 h=5.5 * MM)
    return cards


def style_braid(b, rng):
    """The braided bob: a deep side parting on her left (-x), the hair swept from it across her forehead and down past
    her right brow, the other side combed back behind her ear, a braid lying along the parting; the bob's back."""
    cards = []
    part_az = -38.0
    for layer, (el, step, wid) in enumerate([(50, 11, (17, 22)), (62, 12, (18, 24)), (74, 13, (20, 27))]):
        for sx in (-1, 1):
            az = 100.0 if sx < 0 else 72.0
            while az <= 180.0:
                a = sx * (az + jit(rng, 2.5))
                e = el + jit(rng, 3)
                head = Vector((math.sin(math.radians(a)) * 0.5, math.cos(math.radians(a)) * 0.5, -1))
                hem_z = bob_hem(a, layer) + jit(rng, 0.001)
                cards.append(Card((a, e), head, 0.24, rng.uniform(*wid) * MM, layer=layer, tip="round", bend=22,
                                  comb=Vector((0, -0.08, -1)), cut=(lambda hz: lambda p: p.z < hz)(hem_z),
                                  flare=1.0 * MM, flick=0.35, tilt=jit(rng, 0.2)))
                az += step
    # the swoop: from the parting across the forehead, lying on it, and down past her right (+x) temple and cheek
    for i in range(11):
        el = lerp(58, 84, i / 10) + jit(rng, 2)
        a = part_az + 5 + jit(rng, 3)
        head = Vector((1.0, 0.55, -0.35))
        cards.append(Card((a, el), head, 0.19 + 0.008 * i, rng.uniform(20, 27) * MM, layer=2, tip="point", bend=16,
                          comb=Vector((0.25, 0.05, -1)), hug=28, tilt=jit(rng, 0.25), taper=0.6,
                          cut=lambda p: p.z < 1.50 or (p.y > 0.07 and abs(p.x) < 0.058 and p.z < 1.634),
                          flick=0.2, group="Strand_R" if i > 6 else None))
    # the combed-back side (her left, -x): from the parting back over and behind the ear
    for i in range(9):
        el = lerp(46, 76, i / 8)
        a = part_az - 4 - jit(rng, 3)
        head = Vector((-0.6, -0.9, -0.3))
        cards.append(Card((a, el), head, 0.2, rng.uniform(17, 22) * MM, layer=1 + (i % 2), tip="point", bend=18,
                          comb=Vector((-0.1, -0.6, -1)), hug=25, tilt=jit(rng, 0.2), cut=lambda p: p.z < 1.50))
    # the hairline on her left, combed back: thin roots right at the hairline
    for i in range(6):
        a = lerp(-40, -75, i / 5) + jit(rng, 2)
        e = math.degrees(math.atan2(hairline_z(a) + 0.006 - HEAD_C.z, 0.085))
        cards.append(Card((a, e), Vector((-0.5, -1, 0.1)), 0.14, rng.uniform(14, 18) * MM, layer=0, tip="point",
                          bend=18, comb=Vector((-0.1, -0.7, -1)), hug=30, root_w=0.15, root_h=0.4 * MM,
                          cut=lambda p: p.z < 1.50))
    # under the swoop at the temples: short inner cards so no skin shows
    for i in range(7):
        a = lerp(-30, 80, i / 6)
        cards.append(Card((a, 62 + jit(rng, 2)), Vector((0.6, 0.6, -0.4)), 0.08, 20 * MM, layer=0, tip="point",
                          bend=25, hug=25, comb=Vector((0.3, 0, -1)), cut=lambda p: p.z < 1.645 and p.y > 0.05))
    # the braid: along the parting from her front hairline back over the top towards the crown
    path = []
    for k in range(16):
        t = k / 15
        az = lerp(part_az + 2, -150.0, ease(t * 1.1) if t < 0.9 else 1.0)
        el = lerp(57, 80, ease(t / 0.4)) if t < 0.4 else lerp(80, 62, (t - 0.4) / 0.6)
        path.append(scalp(az, el, LAYER_H[2] + 3.0 * MM)[0])
    b.extra_paths.append(("braid", path))
    return cards


def style_pixie(b, rng):
    """The pixie (Black Widow's construction, cut short): wide short cards with pointed ends layered all over, a
    side-swept fringe, the nape and the hair over her ears cut short."""
    cards = []

    def hem(p):
        az, _ = angles(p)
        return p.z < table([(0, 1.62), (60, 1.615), (85, 1.615), (110, 1.58), (135, 1.53), (160, 1.50), (180, 1.495)],
                           abs(az))
    for r, (el, step, wid, ln) in enumerate([(30, 10, (16, 21), 0.10), (48, 11, (16, 21), 0.12),
                                             (62, 12, (17, 23), 0.13), (76, 13, (18, 24), 0.14)]):
        layer = min(r, 2)
        for sx in (-1, 1):
            az = 55.0 if el > 40 else 100.0
            while az <= 180.0:
                a = sx * (az + jit(rng, 3))
                e = el + jit(rng, 3)
                head = Vector((math.sin(math.radians(a)) * 0.8, math.cos(math.radians(a)) * 0.8 + 0.25, -0.7))
                cards.append(Card((a, e), head, ln + jit(rng, 0.012), rng.uniform(*wid) * MM, layer=layer,
                                  tip="point", bend=20, comb=Vector((0, 0.1, -1)), cut=hem, flick=0.5, hug=8,
                                  flare=1.0 * MM, tilt=jit(rng, 0.35)))
                az += step
    # crown: short cards whorled round the crown
    for i in range(8):
        a = 150 + 360 * i / 8
        a = ((a + 180) % 360) - 180
        cards.append(Card((a, 80), direction(a, 0) + Vector((0, 0, -0.5)), 0.07, 20 * MM, layer=2, tip="point",
                          bend=18, flick=0.5, tilt=jit(rng, 0.3), cut=hem))
    # the side-swept fringe: from her left part over to her right, lying on her forehead
    for i in range(10):
        a = lerp(-48, 30, i / 9) + jit(rng, 3)
        cards.append(Card((a, 70 + jit(rng, 3)), Vector((0.75, 1.0, -0.2)), 0.11 + jit(rng, 0.01),
                          rng.uniform(17, 23) * MM, layer=2, tip="point", bend=18, comb=Vector((0.5, 0.2, -1)),
                          hug=20, cut=(lambda p: p.z < 1.640 and p.y > 0.06), tilt=jit(rng, 0.3), flick=0.3))
    # her left temple: short cards combed down and forward so the hairline there isn't bare
    for i in range(4):
        a = lerp(-50, -72, i / 3)
        cards.append(Card((a, 52 + jit(rng, 2)), Vector((-0.2, 0.6, -1)), 0.06, 17 * MM, layer=1, tip="point",
                          bend=20, hug=20, cut=hem, flick=0.3))
    return cards


def style_long(b, rng):
    """Long hair (Luna and Psylocke): a middle parting, bangs, wide long cards to her shoulder blades behind with
    volume over the crown, a pair of face-framing locks falling in front of her shoulders, layered pointed ends that
    flick out."""
    cards = []
    def back_cut_at(z):
        return lambda p: p.z < z
    back_cut = None
    rows = [(40, 9, (20, 26), 75, 150), (52, 10, (20, 27), 70, 180), (64, 11, (22, 29), 70, 180),
            (76, 12, (24, 32), 70, 180)]
    for r, (el, step, wid, az0, az1) in enumerate(rows):
        layer = max(0, r - 1)
        for sx in (-1, 1):
            az = az0
            while az <= az1:
                a = sx * (az + jit(rng, 2.5))
                e = el + jit(rng, 3)
                head = Vector((math.sin(math.radians(a)) * 0.5, math.cos(math.radians(a)) * 0.5 - 0.2, -1))
                ln = 0.44 + jit(rng, 0.05) - layer * 0.03
                cut = back_cut_at(1.20 + layer * 0.03 + rng.uniform(-0.02, 0.03))
                cards.append(Card((a, e), head, ln, rng.uniform(*wid) * MM, layer=layer, tip="point", bend=16,
                                  comb=Vector((sx * 0.03, -0.3, -1)), cut=cut, flare=7 * MM, flick=0.2,
                                  tilt=jit(rng, 0.25), taper=0.5))
                az += step
    for i, (az, el) in enumerate(parting_points(0, 180, 9, el_front=70, el_back=60)):
        if i in (0, 8):
            continue
        for sx in (-1, 1):
            head = Vector((sx, -0.25 if az > 90 else 0.1, -0.3))
            cards.append(Card((az + sx * 2, el), head, 0.42 + jit(rng, 0.04), rng.uniform(24, 32) * MM, layer=2,
                              tip="point", taper=0.5, bend=16, comb=Vector((0, -0.35, -1)),
                              cut=back_cut_at(1.25 + rng.uniform(-0.02, 0.04)), flare=6 * MM,
                              flick=0.2, tilt=jit(rng, 0.15)))
    # face-framing locks: in front of her ears, down over her collarbones
    for sx in (-1, 1):
        for k in range(4):
            a = sx * (50 + 6 * k + jit(rng, 2))
            group = "Strand_R" if sx > 0 else "Strand_L"
            cards.append(Card((a, 64 + jit(rng, 3)), Vector((sx * 0.5, 0.4, -1)), 0.30 - 0.025 * k,
                              rng.uniform(20, 26) * MM, layer=2, tip="point", bend=18,
                              comb=Vector((sx * 0.05, 0.2, -1)), flick=0.25, tilt=jit(rng, 0.2), group=group,
                              cut=lambda p: p.z < 1.30, taper=0.65))
    fringe_cards(b, cards, rng, span=(-46, 46), n=8, el=(66, 72), cut_z=1.632, width=(22, 30), layer=1,
                 tip="point", h=5.5 * MM)
    return cards


def combed_to(b, rng, tie, rows=((44, 12), (58, 13), (72, 15)), width=(18, 24), skip=lambda a: False):
    """Hair combed from all round her hairline to a tie (Invisible Woman Azure's slicked-back top): rows of cards
    rooted over her scalp, and a row with thin roots right on the hairline, so the edge reads as hair pulled back."""
    cards = []
    for layer, (el, step) in enumerate(rows):
        az = -180.0
        while az < 180.0:
            a = az + jit(rng, 2)
            if not skip(a):
                e = el + jit(rng, 2)
                start, _ = scalp(a, e)
                head = tie - start
                cards.append(Card((a, e), head, 0.3, rng.uniform(*width) * MM, layer=layer, tip="soft", bend=60,
                                  attract=tie, comb=Vector((0, 0, 0)), tilt=jit(rng, 0.15), root_w=0.3))
            az += step
    az = -180.0
    while az < 180.0:
        a = az + jit(rng, 1.5)
        e = math.degrees(math.atan2(hairline_z(a) + 0.004 - HEAD_C.z, 0.085))
        start, _ = scalp(a, e)
        if start.z > hairline_z(a) - 0.006:
            cards.append(Card((a, e), tie - start, 0.3, rng.uniform(11, 14) * MM, layer=0, tip="soft", bend=60,
                              attract=tie, comb=Vector((0, 0, 0)), h=2.0 * MM, root_w=0.3, root_h=0.3 * MM))
        az += 5
    return cards


def tail_axis(start, d0, length, bend, comb=Vector((0, -0.25, -1)), h=0.03):
    """A tail's middle line: draped like a card from the tie, kept clear of her head and back by h."""
    pts = [start]
    d = d0.normalized()
    n = int(math.ceil(length / SEG))
    seg = length / n
    for i in range(n):
        d = (d + comb * bend * seg).normalized()
        p = push_out(pts[-1] + d * seg, h)
        d = (p - pts[-1]).normalized()
        pts.append(p)
    return pts


def style_ponytail(b, rng):
    """A ponytail at the back of her head: everything combed to the tie, a tie, and the tail (the refs' long cards,
    laid round the tail in two rings) hanging to her shoulder blades."""
    tie = scalp(180, 2, 0.012)[0]
    cards = combed_to(b, rng, tie)
    # a couple of loose wisps by her face
    for sx in (-1, 1):
        cards.append(Card((sx * 58, 60), Vector((sx * 0.3, 0.3, -1)), 0.13, 9 * MM, layer=2, tip="point", bend=20,
                          comb=Vector((0, 0.1, -1)), tilt=0.3, flick=0.4))
    axis = tail_axis(tie + Vector((0, -0.012, 0)), Vector((0, -0.7, -0.6)), 0.28, 18, h=0.022)
    b.tubes.append(dict(axis=axis, radius=lambda u: lerp(0.011, 0.022, ease(u / 0.25)) * lerp(1.0, 0.45, ease((u - 0.55) / 0.45)),
                        count=11, width=18 * MM, twist=0.5))
    b.ties.append((tie + Vector((0, -0.006, 0)), axis[1] - axis[0], 0.012))
    return cards


def style_bun(b, rng):
    """A bun on top: everything combed up to it; the bun itself is cards wound round a ball."""
    centre = scalp(170, 62, 0.026)[0]
    tie = scalp(170, 62, 0.004)[0]
    cards = combed_to(b, rng, tie, rows=((40, 12), (54, 13), (68, 15)))
    for sx in (-1, 1):
        cards.append(Card((sx * 58, 60), Vector((sx * 0.3, 0.3, -1)), 0.12, 9 * MM, layer=2, tip="point", bend=20,
                          comb=Vector((0, 0.1, -1)), tilt=0.3, flick=0.4))
    b.buns.append((centre, 0.03, (centre - HEAD_C).normalized()))
    b.ties.append((tie + (centre - tie) * 0.25, centre - tie, 0.011))
    return cards


def style_tail(b, rng):
    """The high tail: a tie high on her crown, the tail arcing up and back then falling to her shoulder blades."""
    tie = scalp(176, 58, 0.012)[0]
    cards = combed_to(b, rng, tie, rows=((40, 12), (54, 13), (66, 15)))
    for sx in (-1, 1):
        for k in range(2):
            cards.append(Card((sx * (52 + 8 * k), 62), Vector((sx * 0.3, 0.3, -1)), 0.22 - 0.05 * k, 11 * MM, layer=2,
                              tip="point", bend=20, comb=Vector((0, 0.1, -1)), tilt=0.3, flick=0.4,
                              group="Strand_R" if sx > 0 else "Strand_L"))
    axis = tail_axis(tie, Vector((0, -0.75, 0.6)), 0.40, 16, comb=Vector((0, -0.2, -1)), h=0.03)
    b.tubes.append(dict(axis=axis, radius=lambda u: lerp(0.012, 0.026, ease(u / 0.3)) * lerp(1.0, 0.4, ease((u - 0.55) / 0.45)),
                        count=12, width=20 * MM, twist=0.6))
    b.ties.append((tie, axis[1] - axis[0], 0.013))
    return cards


STYLE_FUNS = {"bob": style_bob, "braid": style_braid, "pixie": style_pixie, "long": style_long,
              "ponytail": style_ponytail, "bun": style_bun, "tail": style_tail}


def bun_cards(b, centre, r, up):
    """Cards wound round a ball, each a loop at its own tilt (a twisted bun)."""
    up = up.normalized()
    a = Vector((1, 0, 0)) - up * up.x
    a.normalize()
    c = up.cross(a)
    n_loops = 9
    for k in range(n_loops):
        tilt = math.pi * k / n_loops
        ax = a * math.cos(tilt) + c * math.sin(tilt)    # the loop's plane holds ax and a direction round up
        bx = up.cross(ax).normalized()
        for layer, rr in enumerate((r, r * 0.8)):
            pts, nrms = [], []
            steps = 22
            off = b.rng.uniform(0, 2 * math.pi)
            for i in range(steps + 1):
                th = off + 2 * math.pi * 0.85 * i / steps
                dirv = (bx * math.cos(th) + (up * 0.75 + ax * 0.25).normalized() * math.sin(th)).normalized()
                pts.append(centre + dirv * rr)
                nrms.append(dirv)
            widths = [0.022 * lerp(0.5, 1.0, ease(i / 4)) * lerp(1.0, 0.1, ease((i - steps + 5) / 5)) for i in range(steps + 1)]
            b.ribbon(pts, widths, THICK, normals=nrms, tip="point", tag=("bun", 1))


def inside_body(p):
    """Inside her skin: an odd number of crossings on a ray out sideways from her middle line."""
    d = Vector((p.x, p.y - HEAD_C.y, 0.0))
    d = d.normalized() if d.length > 1e-6 else Vector((1, 0, 0))
    n, q = 0, p.copy()
    for _ in range(20):
        hit = BODY_BVH.ray_cast(q, d, 1.0)[0]
        if hit is None:
            break
        n += 1
        q = hit + d * 1e-5
    return n % 2 == 1


def clearance_report(name, b):
    """How close the hair (not its cap) comes to her skin, and to her brows, lashes and eyes."""
    inside = near = 0
    worst = 1.0
    face = 1.0
    for p, tag in zip(b.verts, b.tags):
        if tag and tag[0] == "cap":
            continue
        d = abs(signed(BODY_BVH, p)[0])
        if inside_body(p):
            d = -d
        worst = min(worst, d)
        inside += d < 0
        near += d < 0.001
        for bvh in FACE_BVHS:
            face = min(face, abs(signed(bvh, p)[0]))
    print(f"CLEAR {name}: skin min {worst * 1000:.2f} mm, {inside} points inside, {near} under 1 mm; "
          f"brows/lashes/eyes min {face * 1000:.2f} mm")


COVERS_EARS = {"bob", "braid", "long"}
# How far inside her hairline the cap stops: combed-back styles show the hairline, where thin card roots (not the
# cap's stepped edge, which follows her skin's faces) should make the edge.
CAP_INSET = {"ponytail": 0.009, "bun": 0.009, "tail": 0.009, "pixie": 0.025}


def build_style(key):
    OVER_EARS[0] = key in COVERS_EARS
    b = Builder()
    b.rng = random.Random(SEED + list(STYLE_FUNS).index(key))
    b.extra_paths, b.tubes, b.ties, b.buns = [], [], [], []
    add_cap(b, inset=CAP_INSET.get(key, 0.003))
    cards = STYLE_FUNS[key](b, b.rng)
    for c in cards:
        b.card(c)
    for kind, path in b.extra_paths:
        if kind == "braid":
            b.braid(path, 0.026, tag=("braid", 2))
    for t in b.tubes:
        b.tube_cards(t["axis"], t["radius"], t["count"], t["width"], twist=t["twist"], tag=("tail", 1))
    for centre, r, up in b.buns:
        bun_cards(b, centre, r, up)
    has_tie = bool(b.ties)
    for centre, axis, r in b.ties:
        b.ring(centre, axis, r, 0.0028, mat=1, tag=("tie", 1))
    b.settle()
    name = f"{PREFIX}_{OBJECT_OF[key]}"
    mats = ["T_hair_f", "T_hair_tie"] if has_tie else ["T_hair_f"]
    obj = b.to_object(name, mats, weigh)
    print(f"HAIR {name}: {len(b.verts)} verts, {len(b.faces)} faces, {len(cards)} cards")
    clearance_report(name, b)
    return obj


# Runs on load, headless or exec'd in a live Blender (as add_face_parts.py does).
built = [build_style(k) for k in STYLES]
if OUT:
    bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
