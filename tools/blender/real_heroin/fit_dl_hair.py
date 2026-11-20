"""
Fit a downloaded hair mesh (FBX) onto her head as a Female_Hair<Name> style, skinned to her head bone.

Per axis it scales and moves the hair so the inside of its crown hugs her skull (OFF over it), then pushes any
hair point that ends up in or too near her skin back out (PUSH). Run on a COPY of the master:
blender -b copy.blend -P tools/blender/real_heroin/fit_dl_hair.py -- <hair.fbx> <diffuse.png> <Name> [out.blend]
"""
import bpy, sys, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

A = sys.argv[sys.argv.index("--") + 1:]
FBX, TEX, NAME = A[0], A[1], A[2]
OUT = A[3] if len(A) > 3 else None
FRONT_IS_NEG_Y = True      # the download faces -Y; she faces +Y
OFF = globals().get("OFF", 0.010)        # crown of the hair this far over her skull top (m)
CAP = 0.30                 # top fraction of the hair's height used to match its crown to her skull
SKULL_Z = 0.075            # her skull cap: this far down from the top of her head
PUSH = globals().get("PUSH", 0.003)      # no hair point nearer her skin than this
SCALE_ADJ = globals().get("SCALE_ADJ", (1.0, 1.0, 1.0))
Y_SHIFT = globals().get("Y_SHIFT", 0.0)
Z_SHIFT = globals().get("Z_SHIFT", 0.0)

ARM = bpy.data.objects["Female_Armature"]
BODY = bpy.data.objects["Female_Body"]
HEAD_BONE = "Female_Head"
_pb = ARM.pose.bones[HEAD_BONE]
TO_REST = ARM.matrix_world.inverted() @ (ARM.matrix_world @ _pb.matrix @ _pb.bone.matrix_local.inverted() @ ARM.matrix_world.inverted()).inverted()

dg = bpy.context.evaluated_depsgraph_get()
bme = BODY.evaluated_get(dg).to_mesh()
bw = BODY.matrix_world
BV = [bw @ v.co for v in bme.vertices]
BT = BVHTree.FromPolygons(BV, [tuple(p.vertices) for p in bme.polygons])
top = max(p.z for p in BV)
cap = [p for p in BV if p.z > top - SKULL_Z]
sk_lo = Vector((min(p.x for p in cap), min(p.y for p in cap), top - SKULL_Z))
sk_hi = Vector((max(p.x for p in cap), max(p.y for p in cap), top))

# --- import
before = set(bpy.data.objects)
bpy.ops.import_scene.fbx(filepath=FBX)
new = set(bpy.data.objects) - before
src = next(o for o in new if o.type == "MESH")
me = src.data.copy()
me.transform(src.matrix_world)
if FRONT_IS_NEG_Y:
    me.transform(Matrix.Rotation(math.pi, 4, "Z"))
for o in new:
    bpy.data.objects.remove(o, do_unlink=True)
V = [v.co for v in me.vertices]
hz0, hz1 = min(p.z for p in V), max(p.z for p in V)
hcap = [p for p in V if p.z > hz1 - (hz1 - hz0) * CAP]
h_lo = Vector((min(p.x for p in hcap), min(p.y for p in hcap)))
h_hi = Vector((max(p.x for p in hcap), max(p.y for p in hcap)))
# crown of the hair = skull cap grown by OFF all round
sx = (sk_hi.x - sk_lo.x + 2 * OFF) / (h_hi.x - h_lo.x) * SCALE_ADJ[0]
sy = (sk_hi.y - sk_lo.y + 2 * OFF) / (h_hi.y - h_lo.y) * SCALE_ADJ[1]
sz = (sx + sy) / 2 * SCALE_ADJ[2]
hc = (h_lo + h_hi) / 2
sc = (sk_lo + sk_hi) / 2
for v in me.vertices:
    p = v.co
    v.co = Vector((sc.x + (p.x - hc.x) * sx, sc.y + Y_SHIFT + (p.y - hc.y) * sy, top + OFF + Z_SHIFT + (p.z - hz1) * sz))

# --- push out of her skin
pushed = 0
for v in me.vertices:
    loc, n, i, d = BT.find_nearest(v.co)
    if loc is None:
        continue
    s = (v.co - loc).dot(n)
    if s < PUSH and d < 0.03:
        v.co = loc + n * PUSH + (v.co - loc - n * s)
        pushed += 1

# --- material: the download's grey strands, tinted to her hair colour, alpha cut
old_hair = bpy.data.materials.get("T_hair_f")
tint = tuple(old_hair.diffuse_color[:3]) if old_hair else (0.25, 0.12, 0.06)
mat = bpy.data.materials.get(f"T_hair_{NAME.lower()}") or bpy.data.materials.new(f"T_hair_{NAME.lower()}")
mat.use_nodes = True
nt = mat.node_tree
nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
bs = nt.nodes.new("ShaderNodeBsdfPrincipled")
tx = nt.nodes.new("ShaderNodeTexImage")
img = bpy.data.images.load(TEX, check_existing=True)
img.name = f"T_hair_{NAME.lower()}"
img.pack()
tx.image = img
mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
mix.inputs["Factor"].default_value = 1.0
mix.inputs["B"].default_value = (*[min(1, c * 1.5) for c in tint], 1)
nt.links.new(tx.outputs["Color"], mix.inputs["A"])
nt.links.new(mix.outputs["Result"], bs.inputs["Base Color"])
nt.links.new(tx.outputs["Alpha"], bs.inputs["Alpha"])
bs.inputs["Roughness"].default_value = 0.55
nt.links.new(bs.outputs[0], out.inputs[0])
mat.diffuse_color = (*tint, 1)
try:
    mat.surface_render_method = "DITHERED"
except Exception:
    mat.blend_method = "HASHED"
mat.use_backface_culling = False
me.materials.clear()
me.materials.append(mat)

# --- object, skinned like the game wants
oname = f"Female_Hair{NAME}"
obj = bpy.data.objects.get(oname)
if obj is None:
    obj = bpy.data.objects.new(oname, me)
    (ARM.users_collection[0] if ARM.users_collection else bpy.context.scene.collection).objects.link(obj)
else:
    obj.data = me
me.name = oname
me.transform(TO_REST)
obj.parent = ARM; obj.parent_type = "OBJECT"; obj.parent_bone = ""
obj.matrix_parent_inverse = Matrix.Identity(4); obj.matrix_basis = Matrix.Identity(4)
obj.vertex_groups.clear()
obj.vertex_groups.new(name=HEAD_BONE).add(range(len(me.vertices)), 1.0, "REPLACE")
mod = next((m for m in obj.modifiers if m.type == "ARMATURE"), None) or obj.modifiers.new("Armature", "ARMATURE")
mod.object = ARM
obj["tarven_keep"] = True
for m in me.polygons:
    m.use_smooth = True
print("FIT", dict(sx=round(sx, 4), sy=round(sy, 4), sz=round(sz, 4), verts=len(me.vertices), pushed=pushed,
                  skull=[tuple(round(c, 3) for c in sk_lo), tuple(round(c, 3) for c in sk_hi)]))
if OUT:
    bpy.ops.wm.save_as_mainfile(filepath=OUT, copy=True)
