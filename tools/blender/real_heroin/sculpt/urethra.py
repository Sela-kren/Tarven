"""Give real_heroin a visible urethral opening on her vestibule floor (posed shape, carried back to rest exactly).
SRC=<in.blend> OUT=<out.blend> blender -b --python urethra.py     Tunables: env UR_<NAME> (mm unless noted).
Run after vulva_inner.py (needs the T_vulva floor).
 1. the spot: on the floor's middle, AT (0 = back of the slit .. 1 = front) of the way along the slit;
 2. the floor round it (posed radius SUB) is subdivided (CUTS cuts per edge) so the opening has verts to hold it;
    shape keys, UVs and bone weights are interpolated by the subdivision;
 3. a small slit along her slit (half length LEN/2, half width WID/2) sunk DEPTH into her, its lips raised RIM;
    the pit's faces get T_canal."""
import bpy, bmesh, numpy as np, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *

P = dict(AT=0.60, SUB=2.6, CUTS=2, LEN=2.2, WID=0.7, DEPTH=1.5, RIM=0.22, RIM_W=0.7)
for k in P:
    if os.environ.get("UR_" + k): P[k] = float(os.environ["UR_" + k])
mm = 0.001
log = lambda *a: print("UR", *a, flush=True)
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data

def setup():
    M = mesh_arrays(me); n = len(me.vertices)
    rest = np.zeros(n * 3); me.vertices.foreach_get("co", rest); rest = rest.reshape(-1, 3)
    return M, rest
M, rest = setup()
Pw = evaluated(ob)
c0, Rf = slit_frame(Pw, rest, M)
co = (Pw - c0) @ Rf.T
iV = M["mats"].index("T_vulva"); iC = M["mats"].index("T_canal")
vv = np.zeros(len(co), bool)
for fi in np.where(M["fm"] == iV)[0]: vv[M["faces"][fi]] = True
y_lo, y_hi = co[vv, 1].min(), co[vv, 1].max()
yu = y_lo + P["AT"] * (y_hi - y_lo)
row = vv & (np.abs(co[:, 1] - yu) < 0.0006)
xu = float((co[row, 0].min() + co[row, 0].max()) / 2)   # halfway between the vestibule's two walls
cand = np.where(row & (np.abs(co[:, 0] - xu) < 0.0005))[0]
if len(cand) == 0: cand = np.where(row)[0][np.argsort(np.abs(co[row, 0] - xu))[:3]]
vu = cand[np.argmin(co[cand, 2])]                         # the floor there (deepest of them)
Pu = Pw[vu].copy()
log("spot world", Pu.round(5).tolist(), "frame mm", (co[vu] * 1000).round(2), "slit floor y range", round(y_lo * 1000, 1), round(y_hi * 1000, 1))

# ---- 2. subdivide the floor round the spot
near = np.linalg.norm(Pw - Pu, axis=1) < P["SUB"] * mm
bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); bm.edges.ensure_lookup_table()
eds = [e for e in bm.edges if near[e.verts[0].index] and near[e.verts[1].index]
       and all(f.material_index == iV for f in e.link_faces)]
n0 = len(bm.verts)
bmesh.ops.subdivide_edges(bm, edges=eds, cuts=int(P["CUTS"]), use_grid_fill=True, smooth=0.0)
bm.to_mesh(me); bm.free(); me.update()
log("subdivided edges", len(eds), "new verts", len(me.vertices) - n0)

# ---- 3. the opening, in the posed shape
M, rest = setup()
Pw, A = skin_transforms(ob)
c0, Rf = slit_frame(Pw, rest, M)
co = (Pw - c0) @ Rf.T
cu = (Pu - c0) @ Rf.T
vn = vert_normals(co, M["faces"])
d = np.linalg.norm(co - cu, axis=1)
loc = np.where(d < (P["LEN"] / 2 + P["RIM_W"] + 0.6) * mm)[0]
vvn = np.zeros(len(co), bool)
for fi in np.where(M["fm"] == iV)[0]: vvn[M["faces"][fi]] = True
loc = loc[vvn[loc]]
nrm = vn[loc[d[loc] < 0.8 * mm]].mean(0); nrm /= np.linalg.norm(nrm)
ax_y = np.array([0, 1, 0]) - nrm[1] * nrm; ax_y /= np.linalg.norm(ax_y); ax_x = np.cross(ax_y, nrm)
new = co.copy()
pit = np.zeros(len(co), bool)
for v in loc:
    r = co[v] - cu
    a, b = r @ ax_x, r @ ax_y
    q = math.sqrt((a / (P["WID"] / 2 * mm)) ** 2 + (b / (P["LEN"] / 2 * mm)) ** 2)   # 1 on the lips
    dz = 0.0
    if q < 1:
        dz = -P["DEPTH"] * mm * math.sqrt(1 - q * q); pit[v] = q < 0.9
        # draw the walls in so it reads as a slit, not a bowl
        new[v] = cu + ax_x * a * (0.35 + 0.65 * q) + ax_y * b + nrm * (r @ nrm)
    w = (q - 1) / (P["RIM_W"] / (P["WID"] / 2))
    dz += P["RIM"] * mm * math.exp(-0.5 * ((q - 1.15) / 0.35) ** 2)
    new[v] = new[v] + nrm * dz
log("opening verts", len(loc), "pit verts", int(pit.sum()))
fm = M["fm"].copy()
for fi, f in enumerate(M["faces"]):
    if fm[fi] == iV and pit[f].sum() >= len(f) - 1: fm[fi] = iC
me.polygons.foreach_set("material_index", fm)
moved = write_posed_change(ob, Pw, c0 + new @ Rf, A)
chk = evaluated(ob)
log("moved", int(moved.sum()), "posed check err mm", round(float(np.abs(chk - (c0 + new @ Rf)).max() * 1000), 3))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
