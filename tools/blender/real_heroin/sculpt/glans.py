"""Give real_heroin a clitoral glans: a small rounded bead on the vestibule floor, tucked under the front of her hood
(posed shape, carried back to rest exactly). Run after vulva_inner.py.
SRC=<in.blend> OUT=<out.blend> blender -b --python glans.py     Tunables: env GL_<NAME> (mm).
 1. the spot: Y_AT mm along the slit frame (vulva_frame.slit_frame), in the middle of the floor there;
 2. the floor round it (posed radius SUB) is subdivided (CUTS cuts per edge);
 3. a dome WID wide, LEN long, HEIGHT tall along the floor's normal, a little fuller toward its tip, with a shallow
    groove NECK round its base so it reads as a bead and not a bump. Faces keep T_vulva."""
import bpy, bmesh, numpy as np, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *

P = dict(Y_AT=16.5, SUB=3.4, CUTS=2, WID=2.2, LEN=3.0, HEIGHT=1.7, NECK=0.15, FWD=0.3, ROUND=0.5)
for k in P:
    if os.environ.get("GL_" + k): P[k] = float(os.environ["GL_" + k])
mm = 0.001
log = lambda *a: print("GL", *a, flush=True)
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data

def setup():
    M = mesh_arrays(me); n = len(me.vertices)
    rest = np.zeros(n * 3); me.vertices.foreach_get("co", rest); rest = rest.reshape(-1, 3)
    return M, rest
M, rest = setup()
Pw = evaluated(ob); c0, Rf = slit_frame(Pw, rest, M); co = (Pw - c0) @ Rf.T
iV = M["mats"].index("T_vulva")
vv = np.zeros(len(co), bool)
for fi in np.where(M["fm"] == iV)[0]: vv[M["faces"][fi]] = True
yu = P["Y_AT"] * mm
row = vv & (np.abs(co[:, 1] - yu) < 0.0006)
xu = float((co[row, 0].min() + co[row, 0].max()) / 2)
cand = np.where(row & (np.abs(co[:, 0] - xu) < 0.0006))[0]
vu = cand[np.argmin(co[cand, 2])]
Pu = Pw[vu].copy()
log("spot frame mm", (co[vu] * 1000).round(2), "vestibule width there mm", round(float(co[row, 0].max() - co[row, 0].min()) * 1000, 2))

near = (np.linalg.norm(Pw - Pu, axis=1) < P["SUB"] * mm) & vv
bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
eds = [e for e in bm.edges if near[e.verts[0].index] and near[e.verts[1].index]]
n0 = len(bm.verts)
bmesh.ops.subdivide_edges(bm, edges=eds, cuts=int(P["CUTS"]), use_grid_fill=True, smooth=0.0)
bm.to_mesh(me); bm.free(); me.update()
log("subdivided edges", len(eds), "new verts", len(me.vertices) - n0)

M, rest = setup()
Pw, A = skin_transforms(ob); c0, Rf = slit_frame(Pw, rest, M); co = (Pw - c0) @ Rf.T
cu = (Pu - c0) @ Rf.T
vn = vert_normals(co, M["faces"])
vv = np.zeros(len(co), bool)
for fi in np.where(M["fm"] == iV)[0]: vv[M["faces"][fi]] = True
d = np.linalg.norm(co - cu, axis=1)
loc = np.where((d < (max(P["WID"], P["LEN"]) / 2 + 1.0) * mm) & vv)[0]
nrm = vn[loc[d[loc] < 1.0 * mm]].mean(0); nrm /= np.linalg.norm(nrm)
ax_y = np.array([0, 1, 0]) - nrm[1] * nrm; ax_y /= np.linalg.norm(ax_y); ax_x = np.cross(ax_y, nrm)
new = co.copy(); n_up = 0
for v in loc:
    r = co[v] - cu; a, b = r @ ax_x, r @ ax_y
    q = math.sqrt((a / (P["WID"] / 2 * mm)) ** 2 + (b / (P["LEN"] / 2 * mm)) ** 2)
    h = 0.0
    if q < 1:
        full = 1 + P["FWD"] * (b / (P["LEN"] / 2 * mm))            # fuller toward the hood end
        h = P["HEIGHT"] * mm * (1 - q * q) ** P["ROUND"] * max(0.4, full) / (1 + P["FWD"]); n_up += 1
    h -= P["NECK"] * mm * math.exp(-0.5 * ((q - 1.08) / 0.12) ** 2)
    new[v] = co[v] + nrm * h
log("bead verts", n_up, "touched", len(loc))
moved = write_posed_change(ob, Pw, c0 + new @ Rf, A)
chk = evaluated(ob)
log("moved", int(moved.sum()), "posed check err mm", round(float(np.abs(chk - (c0 + new @ Rf)).max() * 1000), 3))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
