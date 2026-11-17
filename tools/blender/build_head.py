"""
Build the heroine's polygon head (heroine/head_mesh.py) and save it for review.

blender -b --factory-startup --python tools/blender/build_head.py -- <out dir> [subdivision levels]

Writes <out dir>/head.blend: the head (cage + subdivision modifier) and the eyeballs, placed on her body.
"""
import bpy, bmesh, sys, os, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "heroine"))
import sdf  # noqa: E402
import head_mesh  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = args[0] if args else os.path.abspath("heroine_out")
LEVELS = int(args[1]) if len(args) > 1 else 2
os.makedirs(OUT, exist_ok=True)
T0 = time.time()

H = sdf.STATURE
ZC = (0.881 * H + H) / 2
# head-local y of the neck ring the body joins is neck_c(NECK_JOIN_Z); put it on the body's ring (body_mesh.NECK_CY)
Y0 = 0.004 - (head_mesh.NECK_Y + (head_mesh.NECK_JOIN_Z + 0.06) * head_mesh.NECK_LEAN)


GAME_VERTS = 7000


SNAP_INFO = {}
SNAP = False


def snap_to_field(P, cage_P, off_tol=0.0004, keep_r=0.003, max_move=0.003):
    """Move points onto the head's field along its gradient, except within keep_r of cage verts that sit off the
    field (the features placed by hand)."""
    import numpy as np
    from mathutils.kdtree import KDTree
    f = head_mesh.field
    off = cage_P[np.abs(f(cage_P)) > off_tol]
    kd = KDTree(len(off))
    for i, q in enumerate(off):
        kd.insert(q, i)
    kd.balance()
    free = np.array([kd.find(tuple(p))[2] > keep_r if len(off) else True for p in P])
    Q = P[free].copy()
    Q0 = Q.copy()
    h = 1e-4
    for _ in range(4):
        d = f(Q)
        g = np.stack([(f(Q + e) - f(Q - e)) / (2 * h) for e in np.eye(3) * h], 1)
        Q = Q - (d / np.maximum((g * g).sum(1), 1e-12))[:, None] * g
    mv = np.linalg.norm(Q - Q0, axis=1)
    ok = mv < max_move
    out = P.copy()
    idx = np.flatnonzero(free)
    out[idx[ok]] = Q[ok]
    SNAP_INFO.update(snapped=int(ok.sum()), kept=int((~free).sum()), too_far=int((~ok).sum()),
                     mean_mm=round(float(mv[ok].mean() * 1000), 2), max_mm=round(float(mv[ok].max() * 1000), 2))
    return out


def make_game_mesh(cage, collection, fine=0.50):
    """
    The game mesh, laid out like the references': the quad cage as it is on the scalp and the face planes, the
    eyes, nose, mouth and ears subdivided once more (where edge_size asks for fine edges), then all triangles.
    """
    import numpy as np
    # the smooth surface (subdivided once), then back to the cage's spacing outside the fine zones (mouth, nose):
    # the cage's own verts come back at their smoothed places
    tmp = bpy.data.objects.new("tmp", cage.data)
    collection.objects.link(tmp)
    sub = tmp.modifiers.new("sub", "SUBSURF")
    sub.levels = 1
    dg = bpy.context.evaluated_depsgraph_get()
    smooth = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bm = bmesh.new()
    bm.from_mesh(smooth)
    P = np.array([tuple(v.co) for v in bm.verts])
    bm.verts.ensure_lookup_table()
    # subdivision rounds every corner off (the nose's underside, the jaw's edge lose millimetres): verts on the
    # broad form go back onto it; those near the features placed off it (lips, lids, ears) keep their place
    if SNAP:      # off: the lower face's smoothing moves the cage off the raw field on purpose
        P = snap_to_field(P, np.array([tuple(v.co) for v in cage.data.vertices]))
        for v, p in zip(bm.verts, P):
            v.co = p
    coarse = [bm.verts[i] for i in np.flatnonzero(~head_mesh.fine_zone(P))]
    bmesh.ops.unsubdivide(bm, verts=coarse, iterations=2)
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method="BEAUTY", ngon_method="BEAUTY")
    me = bpy.data.meshes.new("Head_game")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Head_game", me)
    collection.objects.link(ob)
    ob.location = cage.location
    for p in me.polygons:
        p.use_smooth = True
    cage.hide_render = True
    print(f"game mesh: {len(me.vertices)} verts, {len(me.polygons)} triangles, snap {SNAP_INFO}")
    return ob


def make_head(collection):
    bm = bmesh.new()
    eyes, r = head_mesh.build(bm)
    me = bpy.data.meshes.new("Head")
    bm.to_mesh(me)
    print(f"cage: {len(bm.verts)} verts, {len(bm.faces)} faces, neck {head_mesh.NECK_INFO}, ear {head_mesh.EAR_DEBUG} box {[[round(c * 1000, 1) for c in b] for b in head_mesh.EAR_BOX.values()]}, "
          f"{sum(len(f.verts) != 4 for f in bm.faces)} not quads")
    bm.free()
    ob = bpy.data.objects.new("Head", me)
    collection.objects.link(ob)
    ob.location = (0, Y0, ZC)
    for p in me.polygons:
        p.use_smooth = True
    m = ob.modifiers.new("Subdivision", "SUBSURF")
    m.levels = m.render_levels = LEVELS
    make_game_mesh(ob, collection)
    for i, c in enumerate(eyes):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=24, radius=r,
                                             location=(c[0], Y0 + c[1], ZC + c[2]))
        e = bpy.context.active_object
        for v in e.data.vertices:                  # the cornea bulging in front
            if v.co.y > 0:
                v.co.y += float(head_mesh.cornea_bump(v.co.x, v.co.z))
        e.name = f"Eye.{'L' if c[0] > 0 else 'R'}"
        bpy.ops.object.shade_smooth()
        for col in e.users_collection:
            col.objects.unlink(e)
        collection.objects.link(e)
    return ob


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    make_head(bpy.context.scene.collection)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "head.blend"))
    print(f"saved in {time.time() - T0:.1f}s")
