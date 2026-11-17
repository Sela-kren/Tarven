"""Finer mesh inside the user's mask only: every edge with both ends masked is cut in two (no smoothing, so the shape
stays exactly), faces filled as a grid, leftovers triangulated. Weights, shape keys, UVs and mask interpolate with the
cut. Custom normals on touched corners reset to the shape's own. Live (no OUT) or headless OUT=<path>."""
import bpy, bmesh, os
from mathutils import Vector
TH = float(os.environ.get("MTH", 0.5))
b = bpy.data.objects["Female_Body"]; me = b.data
bm = bmesh.new(); bm.from_mesh(me)
ml = bm.verts.layers.float.get(".sculpt_mask")
edges = [e for e in bm.edges if e.verts[0][ml] > TH and e.verts[1][ml] > TH]
before = len(bm.verts)
res = bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True, smooth=0.0)
newv = {x for x in res["geom_inner"] if isinstance(x, bmesh.types.BMVert)}
touched_faces = {f for v in newv for f in v.link_faces}
ng = [f for f in touched_faces if len(f.verts) > 4]
if ng: bmesh.ops.triangulate(bm, faces=ng)
touched = {v for f in bm.faces if any(u in newv for u in f.verts) for v in f.verts}
bm.verts.index_update()
tidx = {v.index for v in touched}
sh = bm.edges.layers.bool.get("sharp_edge")
if sh:
    for e in bm.edges:
        if e.verts[0] in touched or e.verts[1] in touched: e[sh] = False
bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
if me.has_custom_normals:
    vn = [v.normal.copy() for v in me.vertices]
    out = [vn[l.vertex_index] if l.vertex_index in tidx else Vector(me.corner_normals[i].vector) for i, l in enumerate(me.loops)]
    me.normals_split_custom_set(out); me.update()
bad = sum(1 for v in me.vertices if abs(sum(g.weight for g in v.groups) - 1) > 0.05)
print("SUBDIV edges cut", len(edges), "verts", before, "->", len(me.vertices), "weights off", bad)
if os.environ.get("OUT"):
    bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
