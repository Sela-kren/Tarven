"""(MODE=slide: move the whole vulva back/under by SLIDE mm, same length; the perineum behind takes it up over
BACK_RAMP mm.)  Shorten real_heroin's vulva from the top: the back corner of the slit stays, everything up to the top of the hood is
pulled toward it (scale K along the slit), the mound above stretches to make up for it. Posed shape, carried back to
rest exactly; weights kept; nothing added or removed.
SRC=<in.blend> OUT=<out.blend> blender -b --python shorten.py     Tunables: env SH_<NAME> (mm unless noted).
How: base surface B = the vulva region smoothed flat (a mound with no slit). Each vertex = foot on B + offset in B's
frame; the foot slides along B toward the back by D(y) = (1-K)*(y - y_back) inside the slit (all of it beyond the top,
fading over RAMP mm up the mound; fading across her over X0..X1 mm), offset put back in the new frame."""
import bpy, numpy as np, os, sys, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vulva_frame import *

P = dict(MODE="shorten", SLIDE=10.0, BACK_RAMP=20.0, K=0.80, RAMP=28.0, X0=22.0, X1=42.0, TOP_PAST_CLIT=6.0, BACK_PAD=1.0, SMOOTH=250, REGION=70.0,
         CLIT="-0.00003,0.11944,0.91619")
for k in P:
    if os.environ.get("SH_" + k): P[k] = type(P[k])(os.environ["SH_" + k])
mm = 0.001
log = lambda *a: print("SH", *a, flush=True)
bpy.ops.wm.open_mainfile(filepath=os.environ["SRC"])
ob = bpy.data.objects["real_heroin_body"]; me = ob.data
M = mesh_arrays(me); faces = M["faces"]; nb = M["nb"]; n = len(me.vertices)
rest = np.zeros(n * 3); me.vertices.foreach_get("co", rest); rest = rest.reshape(-1, 3)
Pw, A = skin_transforms(ob)
c0, Rf = slit_frame(Pw, rest, M)
co = (Pw - c0) @ Rf.T
def vmask(nm):
    m = np.zeros(n, bool)
    for fi in np.where(M["fm"] == M["mats"].index(nm))[0]: m[faces[fi]] = True
    return m
vul = vmask("T_vulva"); anu = vmask("T_anus")
clit = (np.array([float(x) for x in P["CLIT"].split(",")]) - c0) @ Rf.T
y_back = np.percentile(co[vul, 1], 0.5) - P["BACK_PAD"] * mm
y_top = clit[1] + P["TOP_PAST_CLIT"] * mm
log("slit in frame: back %.1f mm, clit %.1f mm, top %.1f mm -> length %.1f mm, will be %.1f mm" % (
    y_back * 1000, clit[1] * 1000, y_top * 1000, (y_top - y_back) * 1000, (y_top - y_back) * P["K"] * 1000))

# ---- base surface B: the region smoothed into a plain mound
reg = (np.linalg.norm(co, axis=1) < P["REGION"] * mm) & ~anu
inner = reg.copy()
for v in np.where(reg)[0]:
    if not all(reg[w] for w in nb[v]): inner[v] = False
base = co.copy(); iv = np.where(inner)[0]; nbr = [np.array(nb[v]) for v in iv]
for it in range(int(P["SMOOTH"])):
    base[iv] = np.array([base[k].mean(0) for k in nbr]) * 0.6 + base[iv] * 0.4
bvh = BVHTree.FromPolygons([Vector(p) for p in base], [list(f) for f in faces])
vn = vert_normals(base, faces)
def nearest(p):
    loc_, nrm, fi, d = bvh.find_nearest(Vector(p))
    f = faces[fi]; q = np.array(loc_)
    w = 1.0 / np.maximum(np.linalg.norm(base[f] - q, axis=1), 1e-7) ** 2
    nn = (vn[f] * w[:, None]).sum(0); nn /= np.linalg.norm(nn)
    if nn @ np.array(nrm) < 0: nn = np.array(nrm)
    return q, nn
def frame(nrm):
    t = np.array([0, 1.0, 0]) - nrm[1] * nrm; t /= np.linalg.norm(t); return np.array([nrm, t, np.cross(nrm, t)])
def slide(q, nrm, dist):
    steps = max(1, int(abs(dist) / 0.0008) + 1); h = dist / steps
    for _ in range(steps):
        t = np.array([0, 1.0, 0]) - nrm[1] * nrm; t[0] = 0; t /= np.linalg.norm(t)
        q, nrm = nearest(q + h * t)
    return q, nrm

def ease(t): t = min(1.0, max(0.0, t)); return t * t * (3 - 2 * t)
L = y_top - y_back; Dmax = (1 - P["K"]) * L
new = co.copy(); moved = 0
for v in np.where(reg)[0]:
    y, x = co[v, 1], co[v, 0]
    if y <= y_back and P["MODE"] != "slide": continue
    if P["MODE"] == "slide":                                      # whole vulva moved back/under, same length
        Dmax = P["SLIDE"] * mm
        if y > y_top: D = Dmax * (1 - ease((y - y_top) / (P["RAMP"] * mm)))
        elif y >= y_back: D = Dmax
        else: D = Dmax * (1 - ease((y_back - y) / (P["BACK_RAMP"] * mm)))
    else:
        D = (1 - P["K"]) * (y - y_back) if y <= y_top else Dmax * (1 - ease((y - y_top) / (P["RAMP"] * mm)))
    D *= 1 - ease((abs(x) - P["X0"] * mm) / ((P["X1"] - P["X0"]) * mm))
    if D < 2e-5: continue
    q, nr = nearest(co[v]); F0 = frame(nr); d = F0 @ (co[v] - q)
    q2, nr2 = slide(q, nr, -D); F1 = frame(nr2)
    new[v] = q2 + F1.T @ d; moved += 1
log("slid verts", moved, "top moved back by mm", round(Dmax * 1000, 1))
Pn = c0 + new @ Rf
mv = write_posed_change(ob, Pw, Pn, A)
chk = evaluated(ob)
log("moved", int(mv.sum()), "posed check err mm", round(float(np.abs(chk - Pn).max() * 1000), 3))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"])
