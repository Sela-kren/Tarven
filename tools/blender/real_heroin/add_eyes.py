"""
Draft: proper eyeballs + lash lines for real_heroin's head (run on a COPY of art/real_heroin_sculpt.blend).
blender -b rh_copy.blend -P eyes_build.py -- <out.blend>
"""
import bpy, bmesh, math, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1]

# --- tunables (mm / radians) -------------------------------------------------------------------------------
IRIS_OF_OPENING = 0.50   # iris radius = this x the opening's height
PUPIL_OF_IRIS = 0.38     # pupil radius = this x the iris's
# the eye's controls (shape keys): name, pupil size x, iris size x
KEYS = [("Pupil_Big", 1.6, 1.0), ("Pupil_Small", 0.55, 1.0), ("Iris_Big", 1.0, 1.3), ("Iris_Small", 1.0, 0.75)]
LIMBUS = 0.55         # dark ring at the iris edge (mm)
DARK_TOP = 0.35       # iris above this share of its radius (up) is the darker top
AIM_UP = 1.5          # aim the iris this far (mm) above the opening's centre: its top tucks under the upper lid
SHINES = [(-0.55, 0.45, 0.20), (0.45, -0.5, 0.09)]   # (across toward her own left = -x, up, radius) in iris radii
LASH = (1.0, 2.6)    # upper lash thickness inner -> outer corner (mm)
WING = (4.5, 2.4)     # wing past the outer corner: out, up (mm)
LASH_LOW = (0.35, 0.45)   # lower lash: thickness, from this share along (inner 0 -> outer 1)
SLAB = 0.20           # lash slab thickness (mm)
UP_RING = 1
LOW_RING = 1
LIFT = 0.40           # lash lift off the skin (mm)

COLORS = {"T_eye_sclera": (0.96, 0.95, 0.93), "T_eye_iris": (0.45, 0.27, 0.17), "T_eye_iris_dark": (0.2, 0.11, 0.07),
          "T_eye_pupil": (0.07, 0.04, 0.03), "T_eye_shine": (1.0, 1.0, 1.0), "T_eye_lash": (0.08, 0.05, 0.05),
          "T_eye_lash_low": (0.18, 0.11, 0.1)}
MM = 0.001


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    c = COLORS[name]
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*c, 1)
        bsdf.inputs["Roughness"].default_value = 0.35
    return m


body = bpy.data.objects["real_heroin_body"]
bm = bmesh.new()
bm.from_mesh(body.data)
bm.transform(body.matrix_world)
bm.verts.ensure_lookup_table()
from mathutils.bvhtree import BVHTree
BVH = BVHTree.FromBMesh(bm)


def ordered_loop(side):
    """The eye hole's boundary on one side (x sign), as an ordered list of verts."""
    vs = {v for v in bm.verts if v.is_boundary and v.co.x * side > 0.012 and v.co.z > 1.58}
    start = min(vs, key=lambda v: abs(v.co.x))
    loop, prev = [start], None
    while True:
        cur = loop[-1]
        nxt = [e.other_vert(cur) for e in cur.link_edges if e.is_boundary and e.other_vert(cur) in vs and e.other_vert(cur) is not prev]
        if not nxt or nxt[0] is start:
            break
        prev = cur
        loop.append(nxt[0])
    return loop


def ring_out(v0, loopset, k=2):
    """The vertex k edges out from a boundary vertex, nearest it (k=2: the front of the lid, past its margin)."""
    dist = {v0: 0}
    front = [v0]
    for step in range(1, k + 1):
        nxt = []
        for v in front:
            for e in v.link_edges:
                w = e.other_vert(v)
                if w not in dist and w not in loopset:
                    dist[w] = step
                    nxt.append(w)
        front = nxt
    return min(front, key=lambda w: (w.co - v0.co).length) if front else None


report = {}
for side, tag in ((1, "L"), (-1, "R")):
    eye = bpy.data.objects[f"real_heroin_eye.{tag}"]
    C = eye.matrix_world.translation.copy()
    R = max(eye.dimensions) / 2
    loop = ordered_loop(side)
    loopset = set(loop)
    oc = sum((v.co for v in loop), Vector()) / len(loop)
    aim = (oc + Vector((0, 0, AIM_UP * MM)) - C).normalized()
    # a frame about the aim: up (world z made perpendicular), across (toward her own left = -x on both eyes)
    up = (Vector((0, 0, 1)) - aim * aim.z).normalized()
    across = aim.cross(up).normalized()
    if across.x > 0:
        across = -across
    hh = (max(v.co.z for v in loop) - min(v.co.z for v in loop)) / MM      # opening height (mm)
    iris_r = IRIS_OF_OPENING * hh
    pupil_r = PUPIL_OF_IRIS * iris_r
    th_p, th_i = math.asin(pupil_r / (R / MM)), math.asin(iris_r / (R / MM))
    th_l = math.asin((iris_r - LIMBUS) / (R / MM))
    thetas = [0.0]
    thetas += [th_p * k / 3 for k in (1, 2, 3)]
    thetas += [th_p + (th_l - th_p) * k / 4 for k in (1, 2, 3, 4)]
    thetas += [th_i]
    i_iris = len(thetas) - 1
    thetas += [th_i + (math.pi - th_i) * (k / 12) ** 1.3 for k in range(1, 12)]
    thetas.append(math.pi)
    N = 32

    def remap(t, pupil_s, iris_s):
        """A ring's angle with the pupil and the iris grown (shape keys): piecewise linear, the white past the iris
        squeezed or stretched to meet it."""
        ti = th_i * iris_s
        anchors = [(0.0, 0.0), (th_p, th_p * iris_s * pupil_s), (th_l, th_l * iris_s), (th_i, ti),
                   (thetas[i_iris + 3], thetas[i_iris + 3]), (math.pi, math.pi)]
        for (x0, y0), (x1, y1) in zip(anchors, anchors[1:]):
            if t <= x1:
                return y0 + (y1 - y0) * (t - x0) / (x1 - x0) if x1 > x0 else y1
        return t

    def positions(pupil_s=1.0, iris_s=1.0):
        out = []
        for t in thetas:
            tt = remap(t, pupil_s, iris_s)
            if t in (0.0, math.pi):
                out.append(aim * R * math.cos(tt))
                continue
            for j in range(N):
                phi = 2 * math.pi * j / N
                out.append((aim * math.cos(tt) + (up * math.cos(phi) + across * math.sin(phi)) * math.sin(tt)) * R)
        # shines: thin discs just in front of the ball, on the same side on both eyes, riding the iris
        for sx, su, r in SHINES:
            d = (aim + (across * sx + up * su) * math.sin(th_i * iris_s)).normalized()
            u2 = (up - d * d.dot(up)).normalized()
            a2 = d.cross(u2)
            for j in range(12):
                q = 2 * math.pi * j / 12
                out.append(d * (R + 0.08 * MM) + (u2 * math.cos(q) + a2 * math.sin(q)) * r * iris_r * iris_s * MM)
        return out

    base = positions()
    em = bmesh.new()
    verts = [em.verts.new(p) for p in base]
    rows, k0 = [], 0
    for t in thetas:
        n_ = 1 if t in (0.0, math.pi) else N
        rows.append(verts[k0:k0 + n_])
        k0 += n_
    mats = ["T_eye_sclera", "T_eye_iris", "T_eye_iris_dark", "T_eye_pupil", "T_eye_shine"]

    def pick(t_mid, phi_mid):
        if t_mid < th_p:
            return "T_eye_pupil"
        if t_mid < th_l:
            upness = math.sin(t_mid) * math.cos(phi_mid) / math.sin(th_i)
            return "T_eye_iris_dark" if upness > DARK_TOP else "T_eye_iris"
        if t_mid < th_i:
            return "T_eye_iris_dark"
        return "T_eye_sclera"

    for k in range(len(rows) - 1):
        a, b = rows[k], rows[k + 1]
        tm = (thetas[k] + thetas[k + 1]) / 2
        for j in range(N):
            phi = 2 * math.pi * (j + 0.5) / N
            if len(a) == 1:
                f = em.faces.new((a[0], b[j], b[(j + 1) % N]))
            elif len(b) == 1:
                f = em.faces.new((a[(j + 1) % N], a[j], b[0]))
            else:
                f = em.faces.new((a[j], a[(j + 1) % N], b[(j + 1) % N], b[j]))
            f.material_index = mats.index(pick(tm, phi))
    for s_i in range(len(SHINES)):
        ring = verts[k0 + 12 * s_i:k0 + 12 * (s_i + 1)]
        f = em.faces.new(ring)
        f.normal_update()
        if f.normal.dot(ring[0].co) < 0:
            f.normal_flip()
        f.material_index = mats.index("T_eye_shine")
    bmesh.ops.recalc_face_normals(em, faces=[f for f in em.faces if f.material_index != mats.index("T_eye_shine")])
    me = bpy.data.meshes.new(f"real_heroin_eye.{tag}")
    em.to_mesh(me)
    em.free()
    for n in mats:
        me.materials.append(mat(n))
    for p in me.polygons:
        p.use_smooth = True
    old = eye.data
    eye.data = me
    eye.matrix_world = Matrix.Translation(C)
    if old.users == 0:
        bpy.data.meshes.remove(old)
    # the controls: shape-key sliders for the pupil's and the iris's size (the pupil grows with the iris too)
    eye.shape_key_add(name="Basis", from_mix=False)
    for name, ps, is_ in KEYS:
        key = eye.shape_key_add(name=name, from_mix=False)
        for kv, p in zip(key.data, positions(ps, is_)):
            kv.co = p
        key.slider_min, key.slider_max = 0.0, 1.0

    # --- lash lines -------------------------------------------------------------------------------------------
    inner = min(range(len(loop)), key=lambda i: abs(loop[i].co.x))
    outer = max(range(len(loop)), key=lambda i: abs(loop[i].co.x))
    n = len(loop)

    def walk(a, b, step):
        out, i = [], a
        while True:
            out.append(loop[i])
            if i == b:
                return out
            i = (i + step) % n

    p1, p2 = walk(inner, outer, 1), walk(inner, outer, -1)
    upper, lower = (p1, p2) if sum(v.co.z for v in p1) / len(p1) > sum(v.co.z for v in p2) / len(p2) else (p2, p1)
    lm = bmesh.new()

    def snap(pos):
        loc, nrm, _, _ = BVH.find_nearest(pos)
        if loc is None:
            return pos, (pos - C).normalized()
        if nrm.dot(loc - C) < 0:
            nrm = -nrm
        return loc, nrm

    def strip(points, thick, upward, matidx, rows=3):
        """A slab band along points (each (pos, normal, upward dir)), thick[i] wide, every vertex laid on her skin."""
        grid = []   # grid[i][r] = (front vert, back vert)
        for (p, nrm, u), w in zip(points, thick):
            col = []
            for r in range(rows + 1):
                q, n = snap(p + u * w * MM * upward * (r / rows))
                col.append((lm.verts.new(q + n * LIFT * MM), lm.verts.new(q + n * (LIFT - SLAB) * MM)))
            grid.append(col)
        faces = []
        for i in range(len(grid) - 1):
            for r in range(rows):
                a, b, c, d = grid[i][r], grid[i + 1][r], grid[i + 1][r + 1], grid[i][r + 1]
                faces.append(lm.faces.new((a[0], b[0], c[0], d[0])))
                faces.append(lm.faces.new((d[1], c[1], b[1], a[1])))
            for r0, r1 in ((0, 0), (rows, rows)):
                a, b = grid[i][r0], grid[i + 1][r0]
                faces.append(lm.faces.new((a[0], a[1], b[1], b[0])))
        for end in (0, len(grid) - 1):
            for r in range(rows):
                a, d = grid[end][r], grid[end][r + 1]
                faces.append(lm.faces.new((a[0], d[0], d[1], a[1])))
        for f in faces:
            f.material_index = matidx

    def margin(path, k):
        pts = []
        for v in path:
            w = ring_out(v, loopset, k) or v
            nrm = (w.co - C).normalized()
            u = Vector((0, 0, 1)) - nrm * nrm.z
            pts.append((w.co.copy(), nrm, u.normalized()))
        return pts

    up_pts = margin(upper, UP_RING)
    # wing past the outer corner, out and up, tapering
    lastp, lastn, lastu = up_pts[-1]
    outdir = Vector((side, -0.35, 0)).normalized()
    for k in (1, 2, 3):
        s = k / 3
        p = lastp + outdir * WING[0] * MM * s + Vector((0, 0, WING[1] * MM * s * s))
        up_pts.append((p, lastn, lastu))
    nu = len(upper)
    thick = [LASH[0] + (LASH[1] - LASH[0]) * (i / (nu - 1)) ** 1.4 for i in range(nu)] + [LASH[1] * (1 - k / 3.4) for k in (1, 2, 3)]
    strip(up_pts, thick, 1, 0)
    lo = lower[int(len(lower) * LASH_LOW[1]):]
    lo_pts = margin(lo, LOW_RING)
    tl = [LASH_LOW[0] * math.sin(math.pi * min(1.0, 0.15 + 0.85 * i / max(1, len(lo) - 1))) + 0.05 for i in range(len(lo))]
    strip(lo_pts, tl, -1, 1)
    lme = bpy.data.meshes.new(f"real_heroin_lash.{tag}")
    bmesh.ops.recalc_face_normals(lm, faces=lm.faces[:])
    lm.normal_update()
    lm.to_mesh(lme)
    lm.free()
    lme.materials.append(mat("T_eye_lash"))
    lme.materials.append(mat("T_eye_lash_low"))
    lob = bpy.data.objects.get(f"real_heroin_lash.{tag}") or bpy.data.objects.new(f"real_heroin_lash.{tag}", lme)
    lob.data = lme
    for c in eye.users_collection:
        if lob.name not in c.objects:
            c.objects.link(lob)
    # ride the head bone like the eyes (world coords baked: parent keeps its current world matrix)
    lob.parent = eye.parent
    lob.parent_type = eye.parent_type
    lob.parent_bone = eye.parent_bone
    lob.matrix_world = Matrix.Identity(4)
    report[tag] = dict(C=[round(x * 1000, 2) for x in C], R=round(R * 1000, 2), aim=[round(x, 3) for x in aim],
                       upper=len(upper), lower=len(lower))
print("REPORT", report)
bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
