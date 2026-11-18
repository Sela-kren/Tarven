"""Clitoral glans at the TOP of real_heroin's slit: a round bead filling the groove where her inner lips meet the
hood (posed shape, carried back to rest exactly). Use this instead of glans.py (which puts it on the vestibule floor).
SRC=<in.blend> OUT=<out.blend> blender -b --python glans_hood.py     Tunables: env GH_<NAME> (mm).
 1. finds where the groove between her inner lips ends at the hood (last y with a dip >= DIP), places the bead's middle
    BACK mm behind that, on the groove's middle;
 2. subdivides the skin round it (posed radius SUB, CUTS cuts) so the bead is round;
 3. lifts the groove's skin onto a dome WID wide, LEN long, its top TOP mm under the lips' crest there (anything already
    above the dome is left alone, so the lips and hood keep their shape); faces under the dome -> T_vulva;
 4. image paths re-pointed to art/textures (so Material Preview isn't magenta)."""
import bpy, bmesh, numpy as np, os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *

P = dict(DIP=0.8, BACK=1.6, Y_FROM=20.0, Y_TO=30.0, SUB=3.6, CUTS=1, WID=2.1, LEN=2.8, TOP=0.25, SOFT=0.35)
for k in P:
    if os.environ.get("GH_" + k): P[k] = float(os.environ["GH_" + k])
mm = 0.001
log = lambda *a: print("GH", *a, flush=True)
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data

def setup():
    M = mesh_arrays(me); n = len(me.vertices)
    rest = np.zeros(n * 3); me.vertices.foreach_get("co", rest); rest = rest.reshape(-1, 3)
    return M, rest
def groove_at(co, y, half=0.0005):
    """(x of the groove's bottom, its z, crest z) at y: upper envelope across |x| < 3 mm"""
    m = (np.abs(co[:, 1] - y) < half) & (np.abs(co[:, 0]) < 0.003)
    if m.sum() < 8: return None
    x, z = co[m, 0], co[m, 2]
    bins = np.arange(-0.003, 0.00301, 0.0002); env = np.full(len(bins), np.nan)
    for i, b in enumerate(bins):
        s = np.abs(x - b) < 0.00012
        if s.any(): env[i] = z[s].max()
    ok = ~np.isnan(env)
    if ok.sum() < 10: return None
    env = np.interp(bins, bins[ok], env[ok])
    mid = (np.abs(bins) < 0.0012)
    i_lo = np.where(mid)[0][np.argmin(env[mid])]
    crest = min(env[:i_lo].max(), env[i_lo + 1:].max())
    return bins[i_lo], env[i_lo], crest

M, rest = setup()
Pw = evaluated(ob); c0, Rf = slit_frame(Pw, rest, M); co = (Pw - c0) @ Rf.T
lab = np.zeros(len(co), bool)
for fi in np.where(M["fm"] == M["mats"].index("T_labia"))[0]: lab[M["faces"][fi]] = True
y_end = None
for y in np.arange(P["Y_FROM"] * mm, P["Y_TO"] * mm, 0.0005):
    g = groove_at(co[lab], y)
    if g and g[2] - g[1] >= P["DIP"] * mm: y_end = y
yc = y_end - P["BACK"] * mm
xg, zg, zcr = groove_at(co[lab], yc)
cu = np.array([xg, yc, zg])
log("groove ends at y mm", round(y_end * 1000, 1), "bead at", (cu * 1000).round(2), "crest z", round(zcr * 1000, 2))
Pu = c0 + cu @ Rf
log("bead world", Pu.round(5).tolist())

near = np.linalg.norm(Pw - Pu, axis=1) < P["SUB"] * mm
bm = bmesh.new(); bm.from_mesh(me); bm.edges.ensure_lookup_table()
eds = [e for e in bm.edges if near[e.verts[0].index] and near[e.verts[1].index]]
n0 = len(bm.verts)
bmesh.ops.subdivide_edges(bm, edges=eds, cuts=int(P["CUTS"]), use_grid_fill=True, smooth=0.0)
bm.to_mesh(me); bm.free(); me.update()
log("subdivided edges", len(eds), "new verts", len(me.vertices) - n0)

M, rest = setup()
Pw, A = skin_transforms(ob); co = (Pw - c0) @ Rf.T          # same frame as before the subdivision
# "out" = the skin's own outward direction round the spot (the lips and hood there), not the frame's z
vn = vert_normals(co, M["faces"])
dd = np.linalg.norm(co - cu, axis=1)
ring_ = (dd < 2.5 * mm) & (dd > 1.0 * mm) & (co[:, 2] > zg + 0.8 * mm)
nrm = vn[ring_].mean(0); nrm /= np.linalg.norm(nrm)
ax_y = np.array([0, 1.0, 0]) - nrm[1] * nrm; ax_y /= np.linalg.norm(ax_y); ax_x = np.cross(ax_y, nrm)
rel = co - cu
a_ = (rel @ ax_x) / (P["WID"] / 2 * mm); b_ = (rel @ ax_y) / (P["LEN"] / 2 * mm); h = rel @ nrm
q = np.sqrt(a_ ** 2 + b_ ** 2)
crest_h = (np.array([xg, yc, zcr]) - cu) @ nrm
Ht = crest_h - P["TOP"] * mm                                   # height of the bead's top over the groove bottom
new = co.copy(); lifted = np.zeros(len(co), bool)
for v in np.where((q < 1.0) & (np.abs(h) < 0.006))[0]:
    hd = Ht * math.sqrt(max(0.0, 1 - q[v] ** 2)) ** 0.8          # rounded cap from the groove bottom up
    if h[v] < hd:
        w = min(1.0, (1 - q[v]) / P["SOFT"]); w = w * w * (3 - 2 * w)
        new[v] = co[v] + nrm * (hd - h[v]) * w
        lifted[v] = True
log("lifted verts", int(lifted.sum()), "bead height mm", round(Ht * 1000, 2), "out dir in frame", nrm.round(2))
fm = M["fm"].copy(); iV = M["mats"].index("T_vulva")
for fi, f in enumerate(M["faces"]):
    if lifted[f].sum() >= len(f) - 1 and q[f].max() < 0.95: fm[fi] = iV
me.polygons.foreach_set("material_index", fm)
moved = write_posed_change(ob, Pw, c0 + new @ Rf, A)
chk = evaluated(ob)
log("moved", int(moved.sum()), "posed check err mm", round(float(np.abs(chk - (c0 + new @ Rf)).max() * 1000), 3))
root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "art", "textures"))
for im in bpy.data.images:
    if im.filepath:
        p = os.path.join(root, os.path.basename(bpy.path.abspath(im.filepath)))
        if os.path.exists(p): im.filepath = p
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
