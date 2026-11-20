"""
The face parts the game's expressions need on real_heroin's head (face.ts faceRig reads them by material, on meshes
named Female_Body*):
  - her lips: the faces round her mouth slit given T_lip (the lower lip's lit middle T_lip_lit), on the body mesh itself
    (materials only: its points and their order stay as they are);
  - her brows: two strokes lying on her brow (T_hair_f), object Female_BodyBrows;
  - inside her mouth: a pocket behind the slit (T_mouth), upper and lower teeth (T_teeth, T_teeth_low) and a tongue
    (T_tongue), object Female_BodyMouth.
The new objects are skinned to her head bone (Armature modifier, a "Female_Head" group) and marked tarven_keep.

Headless:  blender -b <file.blend> -P tools/blender/real_heroin/add_face_parts.py -- <out.blend>
Live: exec with BODY_NAME in the globals ("Female_Body" in the master). Safe to re-run.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv and bpy.app.background else None
BODY_NAME = globals().get("BODY_NAME", os.environ.get("TARVEN_FACE_BODY", "real_heroin_body"))
ARM_NAME = globals().get("ARM_NAME", "Female_Armature")
HEAD_BONE = "Female_Head"
MM = 0.001

# --- lips: rings of edges out from the mouth slit (the slit's own loop is ring 0) -----------------------------------
LIP_UPPER_RINGS = 8      # the upper lip's edge (vermilion border) is ring 8-9: its ridge, where the skin turns up
LIP_LOWER_RINGS = 10     # the lower lip's is ring 9-10
LIP_LIT = (4, 7, 0.0075)  # the lower lip's lit middle: rings from..to, and how far either side of the middle (m)
# --- brows: (x out from the middle, z) through the stroke's middle, mm; thickness along it (share, mm) ---------------
# The refs' brows (their Hair_Line masks, ref/_head_work): a brush stroke, blunt and full at the inner end, its line
# rising fairly straight to an angled peak about two thirds out, then a tail tapering to a sharp point.
BROW_LINE = [(13.0, 1612.6), (21.0, 1615.0), (30.0, 1617.6), (38.0, 1619.4), (42.5, 1619.9), (47.5, 1618.5),
             (52.0, 1616.0), (56.0, 1612.8)]
BROW_THICK = [(0.0, 3.0), (0.15, 3.4), (0.45, 3.1), (0.62, 2.6), (0.82, 1.3), (1.0, 0.12)]
BROW_SECTIONS = 22
BROW_LIFT = 0.40         # mm off her skin
BROW_SLAB = 0.25
# --- inside her mouth ----------------------------------------------------------------------------------------------
POCKET = [(2.0, 0.35, 1.0), (8.0, 0.80, 0.94), (18.0, 1.0, 0.80), (27.0, 0.75, 0.60)]   # back mm, open share, width share
POCKET_OPEN = 9.0        # mm up and down at the pocket's tallest
TEETH_FRONT = 3.2        # mm behind the slit's front
TEETH_HALF = 15.0        # mm out from the middle at the back of the arch
TEETH_BACK = 10.0        # mm the arch falls back by its ends
TEETH_UP = (0.5, 5.0)    # upper teeth: from, to (mm above the slit)
TEETH_DOWN = (0.6, 4.6)  # lower teeth: from, to (mm below)
TEETH_THICK = 1.8
TONGUE = (6.0, 24.0, 10.5, 2.8, 4.0)   # starts mm behind the slit, length, half width, top below slit (mm), thickness

COLORS = {"T_lip": (0.8, 0.44, 0.43), "T_lip_lit": (0.9, 0.6, 0.58), "T_hair_f": (0.075, 0.06, 0.06),
          "T_mouth": (0.3, 0.09, 0.1), "T_teeth": (0.93, 0.9, 0.84), "T_teeth_low": (0.9, 0.87, 0.8),
          "T_tongue": (0.78, 0.4, 0.42)}


def mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    c = COLORS[name]
    m.diffuse_color = (*c, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*c, 1)
        bsdf.inputs["Roughness"].default_value = 0.5
    return m


body = bpy.data.objects[BODY_NAME]
ARM = bpy.data.objects[ARM_NAME]
_pb = ARM.pose.bones[HEAD_BONE]
TO_REST = ARM.matrix_world.inverted() @ (ARM.matrix_world @ _pb.matrix @ _pb.bone.matrix_local.inverted() @ ARM.matrix_world.inverted()).inverted()
DG = bpy.context.evaluated_depsgraph_get()

# her skin as she stands now (posed, world): for finding the slit and laying things on her
bm = bmesh.new()
bm.from_object(body, DG)
bm.transform(body.matrix_world)
bm.verts.ensure_lookup_table()
bm.faces.ensure_lookup_table()
BVH = BVHTree.FromBMesh(bm)


def boundary_loops():
    seen, loops = set(), []
    for e in bm.edges:
        if not e.is_boundary or e in seen:
            continue
        stack, vs = [e], set()
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            vs.update(x.verts)
            for v in x.verts:
                stack += [y for y in v.link_edges if y.is_boundary and y not in seen]
        loops.append(vs)
    return loops


loops = boundary_loops()
eye_loops = [L for L in loops if abs(sum(v.co.x for v in L) / len(L)) > 0.02]
eye_z = min(sum(v.co.z for v in L) / len(L) for L in eye_loops) if eye_loops else 9.0
slit = max((L for L in loops if abs(sum(v.co.x for v in L) / len(L)) < 0.003 and sum(v.co.z for v in L) / len(L) < eye_z),
           key=lambda L: sum(v.co.z for v in L) / len(L))
SLIT_Z = sum(v.co.z for v in slit) / len(slit)
SLIT_FRONT = max(v.co.y for v in slit)
SLIT_HALF = max(abs(v.co.x) for v in slit)


def ordered(vs):
    start = min(vs, key=lambda v: (v.co.x, v.co.z))
    loop, prev = [start], None
    while True:
        cur = loop[-1]
        nxt = [e.other_vert(cur) for e in cur.link_edges if e.is_boundary and e.other_vert(cur) in vs and e.other_vert(cur) is not prev]
        if not nxt or nxt[0] is start:
            return loop
        prev = cur
        loop.append(nxt[0])


slit_loop = ordered(slit)

# --- lips ----------------------------------------------------------------------------------------------------------
ring = {v: 0 for v in slit}
front = list(slit)
for k in range(1, max(LIP_UPPER_RINGS, LIP_LOWER_RINGS) + 1):
    nxt = []
    for v in front:
        for e in v.link_edges:
            w = e.other_vert(v)
            if w not in ring:
                ring[w] = k
                nxt.append(w)
    front = nxt
me = body.data
names = [m.name if m else None for m in me.materials]


def slot(name):
    if name not in names:
        me.materials.append(mat(name))
        names.append(name)
    return names.index(name)


i_lip, i_lit = slot("T_lip"), slot("T_lip_lit")
i_skin = names.index("T_face_skin") if "T_face_skin" in names else None
lips = lit = 0
for f in bm.faces:
    if not all(v in ring for v in f.verts):
        continue
    r = max(ring[v] for v in f.verts)
    c = f.calc_center_median()
    upper = c.z > SLIT_Z
    if r > (LIP_UPPER_RINGS if upper else LIP_LOWER_RINGS):
        continue
    poly = me.polygons[f.index]
    lo, hi, half = LIP_LIT
    if not upper and lo <= min(ring[v] for v in f.verts) and r <= hi and abs(c.x) < half:
        poly.material_index = i_lit
        lit += 1
    else:
        poly.material_index = i_lip
        lips += 1


# --- the new objects -----------------------------------------------------------------------------------------------
def skin_object(name, bmesh_world, materials):
    """An object named `name` from a bmesh in world space (as she stands now), skinned to her head bone."""
    me2 = bpy.data.meshes.new(name + "_tmp")
    bmesh.ops.recalc_face_normals(bmesh_world, faces=bmesh_world.faces[:])
    bmesh_world.to_mesh(me2)
    bmesh_world.free()
    for n in materials:
        me2.materials.append(mat(n))
    me2.transform(TO_REST)
    obj = bpy.data.objects.get(name)
    if obj is None:
        obj = bpy.data.objects.new(name, me2)
        for c in body.users_collection:
            c.objects.link(obj)
    else:
        old = obj.data
        obj.data = me2
        if old.users == 0:
            bpy.data.meshes.remove(old)
    me2.name = name
    obj.parent = ARM
    obj.parent_type = "OBJECT"
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.matrix_basis = Matrix.Identity(4)
    obj.vertex_groups.clear()
    obj.vertex_groups.new(name=HEAD_BONE).add(range(len(me2.vertices)), 1.0, "REPLACE")
    mod = next((m for m in obj.modifiers if m.type == "ARMATURE"), None) or obj.modifiers.new("Armature", "ARMATURE")
    mod.object = ARM
    obj["tarven_keep"] = True
    for p in me2.polygons:
        p.use_smooth = True
    return obj


def snap(p):
    loc, nrm, _, _ = BVH.find_nearest(p)
    if loc is None:
        return p, Vector((0, 1, 0))
    if nrm.y < 0 and abs(nrm.y) > abs(nrm.x):
        nrm = -nrm
    return loc, nrm


def slab_strip(b, cols, matidx):
    """cols: per section, a list of (front point, back point) across the stroke; a closed slab."""
    vs = [[(b.verts.new(f), b.verts.new(k)) for f, k in col] for col in cols]
    rows = len(vs[0]) - 1
    for i in range(len(vs) - 1):
        for r in range(rows):
            a, c2, d, e = vs[i][r], vs[i + 1][r], vs[i + 1][r + 1], vs[i][r + 1]
            b.faces.new((a[0], c2[0], d[0], e[0])).material_index = matidx
            b.faces.new((e[1], d[1], c2[1], a[1])).material_index = matidx
        for r in (0, rows):
            a, c2 = vs[i][r], vs[i + 1][r]
            b.faces.new((a[0], a[1], c2[1], c2[0])).material_index = matidx
    for i in (0, len(vs) - 1):
        for r in range(rows):
            a, e = vs[i][r], vs[i][r + 1]
            b.faces.new((a[0], e[0], e[1], a[1])).material_index = matidx


# brows
def brow_mid(t):
    """The brow's middle line at share t (0 inner .. 1 outer), x and z in metres (a smooth curve through BROW_LINE)."""
    pts = BROW_LINE
    seg = t * (len(pts) - 1)
    i = min(int(seg), len(pts) - 2)
    u = seg - i
    p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, len(pts) - 1)]
    cr = lambda a, b_, c, d: 0.5 * ((2 * b_) + (-a + c) * u + (2 * a - 5 * b_ + 4 * c - d) * u * u + (-a + 3 * b_ - 3 * c + d) * u ** 3)
    return cr(p0[0], p1[0], p2[0], p3[0]) * MM, cr(p0[1], p1[1], p2[1], p3[1]) * MM


def brow_thick(t):
    for (t0, w0), (t1, w1) in zip(BROW_THICK, BROW_THICK[1:]):
        if t <= t1:
            return (w0 + (w1 - w0) * (t - t0) / (t1 - t0)) * MM
    return BROW_THICK[-1][1] * MM


bb = bmesh.new()
for side in (1, -1):
    cols = []
    for s in range(BROW_SECTIONS + 1):
        t = (s / BROW_SECTIONS) ** 1.15
        x, z = brow_mid(t)
        w = brow_thick(t)
        col = []
        for k in range(4):                     # 4 points across the stroke (bottom to top), laid on her
            dz = (k / 3 - 0.5) * w
            # straight in from the front onto her brow (her temple turns away: the outer end lands on its side)
            hit = BVH.ray_cast(Vector((side * x, 0.4, z + dz)), Vector((0, -1, 0)))
            if hit[0] is not None:
                q, n = hit[0], (hit[1] if hit[1].y > 0 else -hit[1])
            else:
                q, n = snap(Vector((side * x, SLIT_FRONT, z + dz)))
            col.append((q + n * BROW_LIFT * MM, q + n * (BROW_LIFT - BROW_SLAB) * MM))
        cols.append(col)
    slab_strip(bb, cols, 0)
brows = skin_object("Female_BodyBrows", bb, ["T_hair_f"])

# inside her mouth: a pocket hung off the slit, teeth, tongue
mb = bmesh.new()
loop_pts = [v.co.copy() for v in slit_loop]
rings = [[mb.verts.new(p) for p in loop_pts]]
for back, open_share, width in POCKET:
    row = []
    for p in loop_pts:
        across = max(0.0, 1 - (p.x / SLIT_HALF) ** 2) if SLIT_HALF > 0 else 0
        up = 1 if p.z >= SLIT_Z else -1
        q = Vector((p.x * width, SLIT_FRONT - back * MM - (SLIT_FRONT - p.y) * width,
                    SLIT_Z + up * POCKET_OPEN * MM * open_share * across ** 0.5))
        row.append(mb.verts.new(q))
    rings.append(row)
n = len(loop_pts)
for a, b2 in zip(rings, rings[1:]):
    for i in range(n):
        j = (i + 1) % n
        mb.faces.new((a[i], a[j], b2[j], b2[i])).material_index = 0
cap = mb.verts.new(Vector((0, SLIT_FRONT - (POCKET[-1][0] + 4) * MM, SLIT_Z)))
for i in range(n):
    mb.faces.new((rings[-1][i], rings[-1][(i + 1) % n], cap)).material_index = 0
# the pocket is seen from inside: its faces point in (recalc in skin_object would turn them out; flip after)
pocket_faces = set(mb.faces)


def arch(sign, z0, z1, matidx):
    cols = []
    for s in range(13):
        x = (s / 12 * 2 - 1) * TEETH_HALF * MM
        y = SLIT_FRONT - TEETH_FRONT * MM - TEETH_BACK * MM * (x / (TEETH_HALF * MM)) ** 2
        col = []
        for z in (z0, z1):
            zz = SLIT_Z + sign * z * MM
            col.append((Vector((x, y, zz)), Vector((x, y - TEETH_THICK * MM, zz))))
        cols.append(col)
    slab_strip(mb, cols, matidx)


arch(1, *TEETH_UP, 1)
arch(-1, *TEETH_DOWN, 2)
start, length, half, below, thick = TONGUE
cols = []
for s in range(9):
    t = s / 8
    y = SLIT_FRONT - (start + length * t) * MM
    w = half * MM * (0.75 + 0.25 * math.sin(min(1.0, t * 2.5) * math.pi / 2))
    col = []
    for k in range(5):
        u = k / 4 * 2 - 1
        x = u * w
        top = SLIT_Z - below * MM - (u * u) * 1.2 * MM
        col.append((Vector((x, y, top)), Vector((x, y, top - thick * MM))))
    cols.append(col)
slab_strip(mb, cols, 3)
mbm = mb
bmesh.ops.recalc_face_normals(mbm, faces=[f for f in mbm.faces if f not in pocket_faces])
mouth_tmp = bpy.data.meshes.new("mouth_tmp")
mbm.to_mesh(mouth_tmp)
mbm.free()
for p in mouth_tmp.polygons:
    if p.material_index == 0:
        c = Vector(p.center)
        # pocket faces point into the mouth (towards its middle line)
        mid = Vector((0, c.y, SLIT_Z))
        if Vector(p.normal).dot(mid - c) < 0:
            p.flip()
mb2 = bmesh.new()
mb2.from_mesh(mouth_tmp)
bpy.data.meshes.remove(mouth_tmp)
_recalc = bmesh.ops.recalc_face_normals
bmesh.ops.recalc_face_normals = lambda b, faces: None      # keep the pocket's inward faces as set
try:
    mouth = skin_object("Female_BodyMouth", mb2, ["T_mouth", "T_teeth", "T_teeth_low", "T_tongue"])
finally:
    bmesh.ops.recalc_face_normals = _recalc
bm.free()
print("FACEPARTS", dict(lips=lips, lit=lit, slit=(len(slit), round(SLIT_Z * 1000, 2), round(SLIT_FRONT * 1000, 2), round(SLIT_HALF * 1000, 2)),
                         brows=len(brows.data.vertices), mouth=len(mouth.data.vertices)))
if OUT:
    bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
