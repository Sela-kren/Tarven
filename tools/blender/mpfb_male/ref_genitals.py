"""
His penis and scrotum cut out of the male reference (ref/rigged-naked-male-for-nsfw.zip, RiggedMale.blend: the
"MaleGenitals" faces of its Body, as built: hard, standing straight out) into art/male_genitals.blend, for
mpfb_swap.py to lay on his MPFB skin in place of the old tube and sack.

NOT CLEARED FOR RELEASE: the reference is a smutba.se repost with no licence (see CREDITS.md). It's a dev
placeholder, like the downloaded hair; it has to be replaced by our own before the game ships.

In the file, object "RefGenitals", in our frame: metres, its root (the reference's Gen1 joint) at the origin, standing
out along +y, up +z, scaled from the reference's height to his. Its faces wear three materials:
  T_penis (the shaft), T_glans (the glans, past the sulcus), T_scrotum (the sack),
all three painted with the reference's own texture (UV map "UVMap"). A second UV map, "Rig", carries what the game
bends it by (penis.ts): u how far along the shaft a corner is, as a share of its length (0 at the root, 1 at the tip,
less than 0 behind the root), v for the sack how far down it a corner hangs (0 at its top, 1 at its bottom), and for
the shaft 0. The vertex group "Seam" holds the corners on its open edge, where it meets his skin.

Run: D:/blender/blender.exe -b --factory-startup --disable-autoexec <RiggedMale.blend> --python ref_genitals.py
     -- <out.blend> <his height in metres>
"""
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
HEIGHT = float(argv[1]) if len(argv) > 1 else 1.87
# How far behind the root (metres, at his size) the sack ends and the perineum strip starts.
BACK = -0.05
# Behind this far in front of the root, what stands above FLAP_Z, or out to the side past WING_X above WING_Z, is
# the reference's own pubic skin round the root.
ROOT_SKIN = 0.012
FLAP_Z = 0.024
WING_X = 0.03
WING_Z = -0.022

body = bpy.data.objects["Body"]
rig = bpy.data.objects["Male_Rig"]
for m in body.modifiers:
    if m.type != "ARMATURE":
        m.show_viewport = False
dg = bpy.context.evaluated_depsgraph_get()
ev = body.evaluated_get(dg)
me = ev.to_mesh()
mw = body.matrix_world.copy()

zs = [(mw @ v.co).z for v in me.vertices]
ref_h = max(zs) - min(zs)
k = HEIGHT / ref_h
root_w = rig.matrix_world @ rig.data.bones["Gen1"].head_local
tip_w = rig.matrix_world @ rig.data.bones["Gen6"].tail_local
print(f"ref height {ref_h:.3f}, scale {k:.5f}, chain {((tip_w - root_w).length * k) * 100:.1f} cm")
# The reference faces -y; ours +y: half a turn round z, about the root.
to_ours = Matrix.Scale(k, 4) @ Matrix.Rotation(np.pi, 4, "Z") @ Matrix.Translation(-root_w) @ mw

gen = [i for i, mat in enumerate(body.data.materials) if mat and mat.name == "MaleGenitals"][0]
groups = {g.index: g.name for g in body.vertex_groups}
sack_g = {"Testes", "lTeste", "rTeste"}
shaft_g = {f"Gen{i}" for i in range(1, 7)}

bm = bmesh.new()
bm.from_mesh(me)
ev.to_mesh_clear()
bm.faces.ensure_lookup_table()
bm.verts.ensure_lookup_table()
deform = bm.verts.layers.deform.active
drop = [f for f in bm.faces if f.material_index != gen]
bmesh.ops.delete(bm, geom=drop, context="FACES")
bm.transform(to_ours)
# Not the strip of perineum running back from behind the sack towards the anus, nor the flap of pubic skin above the
# root or the wings at either side of it: his own skin has those.
def skin_bit(c):
    return c.y < BACK or (c.y < ROOT_SKIN and (c.z > FLAP_Z or (abs(c.x) > WING_X and c.z > WING_Z)))


drop = [f for f in bm.faces if skin_bit(f.calc_center_median())]
bmesh.ops.delete(bm, geom=drop, context="FACES")
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context="VERTS")
# and whatever that leaves cut off from the rest
bm.verts.ensure_lookup_table()
seen = set()
pieces = []
for v in bm.verts:
    if v in seen:
        continue
    piece, todo = [], [v]
    seen.add(v)
    while todo:
        a = todo.pop()
        piece.append(a)
        for e in a.link_edges:
            b = e.other_vert(a)
            if b not in seen:
                seen.add(b)
                todo.append(b)
    pieces.append(piece)
pieces.sort(key=len, reverse=True)
for piece in pieces[1:]:
    bmesh.ops.delete(bm, geom=piece, context="VERTS")


def share(v, names):
    return sum(w for g, w in v[deform].items() if groups.get(g) in names)


# Which part each face is: the sack where the testes' bones weigh more than the shaft's.
part = {}
for f in bm.faces:
    s = sum(share(v, sack_g) for v in f.verts)
    p = sum(share(v, shaft_g) for v in f.verts)
    c = f.calc_center_median()
    part[f] = "sack" if (s > p or (s == p and c.z < -0.02)) else "shaft"

new = bpy.data.meshes.new("RefGenitals")
bm.to_mesh(new)
bm.free()
obj = bpy.data.objects.new("RefGenitals", new)
bpy.context.scene.collection.objects.link(obj)
mats = []
img = bpy.data.images["MaleGenitals 2.png.000"]
img.name = "male_genitals"
for name in ("T_penis", "T_glans", "T_scrotum"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    mats.append(mat)
new.materials.clear()
for mat in mats:
    new.materials.append(mat)
# (bm faces map one to one onto the new mesh's polygons, in order)
parts = list(part.values())
for poly in new.polygons:
    poly.material_index = 2 if parts[poly.index] == "sack" else 0
# Only the UV map the genitals' texture uses.
uv_names = [u.name for u in new.uv_layers]
print("uv maps", uv_names)
while len(new.uv_layers) > 1:
    new.uv_layers.remove(new.uv_layers[-1])
new.uv_layers[0].name = "UVMap"

# Smoother: one level of subdivision, applied.
bpy.context.view_layer.objects.active = obj
mod = obj.modifiers.new("sub", "SUBSURF")
mod.levels = 1
mod.uv_smooth = "PRESERVE_BOUNDARIES"
bpy.ops.object.modifier_apply(modifier=mod.name)
new = obj.data

P = np.array([v.co[:] for v in new.vertices])
mat_of = np.array([p.material_index for p in new.polygons])
shaft_v = np.zeros(len(P), bool)
sack_v = np.zeros(len(P), bool)
for poly in new.polygons:
    (sack_v if poly.material_index == 2 else shaft_v)[list(poly.vertices)] = True

# Along the shaft: +y from the root.
d = P[:, 1]
length = float(d[shaft_v].max())
# The glans: past the sulcus, the narrowest the shaft gets just behind the crown (the widest it gets near the tip),
# each slice's radius measured round its own middle.
edges_y = np.linspace(0.5 * length, 0.98 * length, 49)
mids = (edges_y[:-1] + edges_y[1:]) / 2
prof = np.full(len(mids), np.nan)
for j, (a, b) in enumerate(zip(edges_y[:-1], edges_y[1:])):
    sel = shaft_v & (d >= a) & (d < b)
    if sel.sum() > 8:
        c = P[sel][:, [0, 2]].mean(0)
        prof[j] = np.linalg.norm(P[sel][:, [0, 2]] - c, axis=1).mean()
crown = int(np.nanargmax(np.where(mids > 0.75 * length, prof, np.nan)))
sulcus = float(mids[int(np.nanargmin(np.where(mids > 0.6 * length, prof, np.nan)[:crown + 1]))])
print("radius profile (share, mm):", " ".join(f"{m / length:.2f}:{x * 1000:.1f}" for m, x in zip(mids, prof)))
for poly in new.polygons:
    if poly.material_index == 0 and d[list(poly.vertices)].mean() > sulcus:
        poly.material_index = 1
print(f"shaft {length * 100:.1f} cm, sulcus at {sulcus / length:.2f} of it")

top = P[sack_v, 2].max()
bot = P[sack_v, 2].min()
rig_uv = new.uv_layers.new(name="Rig")
for poly in new.polygons:
    for li in poly.loop_indices:
        vi = new.loops[li].vertex_index
        if poly.material_index == 2:
            rig_uv.data[li].uv = (0.0, float((top - P[vi, 2]) / (top - bot)))
        else:
            rig_uv.data[li].uv = (float(d[vi] / length), 0.0)

# The open edge, where it meets his skin.
bm = bmesh.new()
bm.from_mesh(new)
seam = [v.index for v in bm.verts if v.is_boundary]
bm.free()
g = obj.vertex_groups.new(name="Seam")
g.add(seam, 1.0, "REPLACE")
# Only Seam: the reference's bone groups mean nothing on him.
for vg in list(obj.vertex_groups):
    if vg.name != "Seam":
        obj.vertex_groups.remove(vg)
for poly in new.polygons:
    poly.use_smooth = True
obj["penis_length"] = length
obj["sulcus"] = sulcus
print(f"RefGenitals: {len(new.vertices)} corners, {len(new.polygons)} faces, seam {len(seam)}, "
      f"sack {int(sack_v.sum())} corners, bbox {np.round(P.min(0), 3)} {np.round(P.max(0), 3)}")

# Only it (and what it uses) in the file.
img.pack()
bpy.data.libraries.write(OUT, {obj}, fake_user=True, compress=True)
print("wrote", OUT)
