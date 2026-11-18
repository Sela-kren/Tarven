"""Even out real_heroin's mesh density on the strip from the anus to the vulva: edges longer than MAXLEN mm (posed)
in the strip are split, PASSES times, so the coarse anus patch matches the dense skin round it (no sliver stitch row).
Shape keys, UVs, weights interpolated; nothing moves. Run before smoothing that strip.
SRC=<in.blend> OUT=<out.blend> blender -b --python densify.py     Tunables: env DN_<NAME> (mm)."""
import bpy, bmesh, numpy as np, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *
P = dict(T0=-2.0, T1=31.0, XW=21.0, H=14.0, MAXLEN=0.55, PASSES=3)
for k in P:
    if os.environ.get("DN_" + k): P[k] = float(os.environ["DN_" + k])
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
for p in range(int(P["PASSES"])):
    M = mesh_arrays(me); n = len(me.vertices); Pw = evaluated(ob)
    def vm(nm):
        m = np.zeros(n, bool)
        for fi in np.where(M["fm"] == M["mats"].index(nm))[0]: m[M["faces"][fi]] = True
        return m
    an = vm("T_anus"); lab = vm("T_labia"); cA = Pw[an].mean(0); cV = Pw[lab].mean(0)
    vn = vert_normals(Pw, M["faces"]); mid = (cA + cV) / 2
    nA = vn[np.argsort(np.linalg.norm(Pw - mid, axis=1))[:300]].mean(0); nA /= np.linalg.norm(nA)
    fwd = cV - cA; fwd -= (fwd @ nA) * nA; fwd /= np.linalg.norm(fwd); lat = np.cross(nA, fwd)
    rel = Pw - cA; t = rel @ fwd * 1000; x = rel @ lat * 1000; h = rel @ nA * 1000
    inside = (t > P["T0"]) & (t < P["T1"]) & (np.abs(x) < P["XW"]) & (np.abs(h) < P["H"]) & ~an & ~lab
    bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
    eds = [e for e in bm.edges if inside[e.verts[0].index] and inside[e.verts[1].index]
           and np.linalg.norm(Pw[e.verts[0].index] - Pw[e.verts[1].index]) > P["MAXLEN"] / 1000]
    n0 = len(bm.verts)
    if eds: bmesh.ops.subdivide_edges(bm, edges=eds, cuts=1, use_grid_fill=True, smooth=0.0)
    bm.to_mesh(me); bm.free(); me.update()
    print("DN pass", p, "split edges", len(eds), "new verts", len(me.vertices) - n0)
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
