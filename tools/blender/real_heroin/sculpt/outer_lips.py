"""Outer lips only (closed state): add fullness. Each lip puffs out along her normal, crest CREST mm off the midline,
fullest a little behind the middle, tapering into the mons at the front and the perineum at the back. The slit line
itself (|s| < 1.5 mm) is held so it stays one closed line. Nothing else changes. Headless OUT=<path>."""
import bpy, os, math
from mathutils import Vector
SRC = os.path.join(os.path.dirname(os.environ["SELF"]), "vulva_remesh3.py")
exec(open(SRC).read().split("# ---------------------------------------------------------------- 1. the area")[0].split("DELTA = E(")[0])
src = open(SRC).read()
exec(src[src.index("b = bpy.data.objects"):src.index("# ---------------------------------------------------------------- 1. the area")])
A = E("PUFF", 0.0030); CREST = E("CREST", 0.008); WID = E("WID", 0.0060)
def puff(s, t):
    a = abs(s); f = max(0.0, min(1.0, t / L))
    along = sm((t + 0.006) / 0.020) * sm((L + 0.008 - t) / 0.022) * (0.75 + 0.25 * math.sin(math.pi * f))
    across = g(a - CREST, WID) if a > CREST else g(a - CREST, CREST * 0.85)
    keep_slit = sm((a - 0.0008) / 0.0022)
    reach = 1 - sm((a - 0.018) / 0.006)
    lips = A * along * across * keep_slit * reach
    # the slit carried on to the lips' back end (it was only ~1 mm deep behind t = 25 mm): a closed groove
    t_end = E("SLIT_END", -0.008)
    back = sm((t - t_end) / 0.008) * (1 - sm((t - 0.022) / 0.012))
    groove = -E("SLIT_D", 0.0026) * back * g(a, E("SLIT_W", 0.0013))
    return lips + groove
def nrm(v):
    n = v.normal.copy()
    ring = {e.other_vert(v) for e in v.link_edges}
    for u in ring | {e.other_vert(u) for u in ring for e in u.link_edges}: n += u.normal
    n.normalize()
    return n if n.dot(Vector((0, 0.3, -1))) > 0 else -n
# clean the crumpled spot where the old slit ended (twisted thin faces): smooth it flat before the new groove
CL = {}
for v in bm.verts:
    if not v.link_faces or v.is_boundary or abs(v.co.x) > 0.010: continue
    if not all(names[f.material_index] in SKN for f in v.link_faces): continue
    if dmid(v.co) > 0.016: continue
    s, t = st(v.co)
    w = (1 - sm((abs(s) - 0.003) / 0.003)) * sm((t - 0.0) / 0.006) * (1 - sm((t - 0.030) / 0.008))
    if w > 0.01: CL[v] = w
def frame(t):
    t = t + base_t
    for i in range(1, len(cum)):
        if cum[i] >= t: break
    tan = (mid[i] - mid[i - 1]).normalized(); n = Vector((0, -tan.z, tan.y))
    if n.dot(Vector((0, 0.3, -1))) < 0: n = -n
    u = (t - cum[i - 1]) / max(1e-9, cum[i] - cum[i - 1]); return mid[i - 1].lerp(mid[i], u), n
# the pit (old opening, ~6 mm deep) lifted: nothing below the closed slit's floor
lifted = 0
for v in list(CL):
    s, t = st(v.co); p0, n = frame(t); h = (v.co - p0).dot(n)
    floor = -E("SLIT_D", 0.0026) * g(abs(s), 0.0016) - 0.0012
    if h < floor:
        v.co += n * (floor - h) * CL[v]; lifted += 1
print("OUTER pit corners lifted", lifted)
nbc = {v: [e.other_vert(v) for e in v.link_edges] for v in CL}
for _ in range(int(E("CLEAN_IT", 60))):
    upd = {v: sum((u.co for u in ns), Vector()) / len(ns) for v, ns in nbc.items()}
    for v, c in upd.items(): v.co = v.co.lerp(c, 0.5 * CL[v])
bm.normal_update()
moves = {}
for v in bm.verts:
    if not v.link_faces or v.is_boundary or abs(v.co.x) > 0.026: continue
    if not all(names[f.material_index] in SKN for f in v.link_faces): continue
    if dmid(v.co) > 0.026: continue
    s, t = st(v.co)
    h = puff(s, t)
    if abs(h) > 1e-6: moves[v] = nrm(v) * h
for v, m in moves.items(): v.co += m
bm.normal_update(); bm.to_mesh(me); bm.free(); me.update()
print("OUTER moved", len(moves))
bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT"], compress=True)
