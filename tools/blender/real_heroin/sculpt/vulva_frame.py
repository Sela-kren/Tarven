"""Shared helpers: real_heroin posed coords, skin transforms, and a frame on the vulva slit.
Frame: origin = middle of the slit, y = along the slit (back -> front), z = out of her (outward normal), x = across."""
import bpy, numpy as np
from mathutils import Vector

def mesh_arrays(me):
    n = len(me.vertices)
    ls = np.zeros(len(me.polygons), int); lt = ls.copy(); fm = ls.copy()
    me.polygons.foreach_get("loop_start", ls); me.polygons.foreach_get("loop_total", lt); me.polygons.foreach_get("material_index", fm)
    lv = np.zeros(len(me.loops), int); me.loops.foreach_get("vertex_index", lv)
    faces = [lv[s:s + t] for s, t in zip(ls, lt)]
    ed = np.zeros(len(me.edges) * 2, int); me.edges.foreach_get("vertices", ed); ed = ed.reshape(-1, 2)
    nb = [[] for _ in range(n)]
    for a, b in ed: nb[a].append(b); nb[b].append(a)
    mats = [m.name.split(".")[0] if m else "" for m in me.materials]
    return dict(ls=ls, lt=lt, fm=fm, lv=lv, faces=faces, ed=ed, nb=nb, mats=mats)

def evaluated(ob):
    n = len(ob.data.vertices)
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    ev = ob.evaluated_get(dg); em = ev.to_mesh()
    a = np.zeros(n * 3); em.vertices.foreach_get("co", a); ev.to_mesh_clear()
    return a.reshape(-1, 3)

def vert_normals(co, faces):
    vn = np.zeros_like(co)
    for f in faces:
        p = co[f]; vn[f] += np.cross(p[2] - p[0], p[-1] - p[1]) if len(f) == 4 else np.cross(p[1] - p[0], p[2] - p[0])
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-20)

def slit_frame(Pw, rest, M):
    """slit verts = labia verts on her rest midline; frame from their posed spread + the skin's normal round them"""
    me_lab = np.zeros(len(Pw), bool)
    iL = M["mats"].index("T_labia")
    for fi in np.where(M["fm"] == iL)[0]: me_lab[M["faces"][fi]] = True
    sl = np.where(me_lab & (np.abs(rest[:, 0]) < 0.0015))[0]
    c = Pw[sl].mean(0)
    u, s, vt = np.linalg.svd(Pw[sl] - c); Y = vt[0]
    vn = vert_normals(Pw, M["faces"])
    ring_ = np.where(me_lab & (np.abs(rest[:, 0]) > 0.006) & (np.abs(rest[:, 0]) < 0.014))[0]
    Z = vn[ring_].mean(0); Z -= (Z @ Y) * Y; Z /= np.linalg.norm(Z)
    X = np.cross(Y, Z)
    # y from back (anus side) to front
    iA = M["mats"].index("T_anus"); an = np.zeros(len(Pw), bool)
    for fi in np.where(M["fm"] == iA)[0]: an[M["faces"][fi]] = True
    if (Pw[an].mean(0) - c) @ Y > 0: Y = -Y; X = -X
    return c, np.array([X, Y, Z])

def skin_transforms(ob, eps=0.001):
    """d(posed)/d(rest) per vertex (n x 3 x 3), by moving every shape key by eps along each axis"""
    me = ob.data; n = len(me.vertices); kb = me.shape_keys.key_blocks
    def kget(k):
        a = np.zeros(n * 3); k.data.foreach_get("co", a); return a.reshape(-1, 3)
    base = {k.name: kget(k) for k in kb}
    P0 = evaluated(ob); cols = []
    for ax in range(3):
        sh = np.eye(3)[ax] * eps
        for k in kb: k.data.foreach_set("co", (base[k.name] + sh).ravel())
        me.vertices.foreach_set("co", (base["Basis"] + sh).ravel()); me.update()
        cols.append((evaluated(ob) - P0) / eps)
    for k in kb: k.data.foreach_set("co", base[k.name].ravel())
    me.vertices.foreach_set("co", base["Basis"].ravel()); me.update()
    return P0, np.stack(cols, axis=2)

def write_posed_change(ob, P_old, P_new, A, rot=None):
    """carry a posed-space change back to Basis (+ every other key, offsets turned by rot[v] if given)"""
    me = ob.data; n = len(me.vertices); kb = me.shape_keys.key_blocks
    def kget(k):
        a = np.zeros(n * 3); k.data.foreach_get("co", a); return a.reshape(-1, 3)
    rest = kget(kb["Basis"]); offs = {k.name: kget(k) - rest for k in kb if k.name != "Basis"}
    dP = P_new - P_old; moved = np.linalg.norm(dP, axis=1) > 2e-6
    Ainv = np.linalg.inv(A)
    rest2 = rest + np.einsum("nij,nj->ni", Ainv, dP) * moved[:, None]
    kb["Basis"].data.foreach_set("co", rest2.ravel()); me.vertices.foreach_set("co", rest2.ravel())
    for name, off in offs.items():
        o2 = off.copy()
        if rot:
            for v, Rw in rot.items(): o2[v] = Ainv[v] @ (Rw @ (A[v] @ off[v]))
        kb[name].data.foreach_set("co", (rest2 + o2).ravel())
    me.update()
    lv = np.zeros(len(me.loops), int); me.loops.foreach_get("vertex_index", lv)
    try:
        cn = np.zeros(len(me.loops) * 3); me.corner_normals.foreach_get("vector", cn); cn = cn.reshape(-1, 3)
        cn[moved[lv]] = 0; me.normals_split_custom_set(cn.tolist())
    except Exception as e:
        print("normals", e)
    me.update()
    return moved
