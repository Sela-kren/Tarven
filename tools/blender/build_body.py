"""
Build the heroine's polygon body (heroine/body_mesh.py) and save it for review.

blender -b --factory-startup --python tools/blender/build_body.py -- <out dir> [subdivision levels]

Writes <out dir>/body.blend: the object "Body", the quad cage with a Subdivision modifier (levels 2 by default),
and "Body_game", the game mesh laid out like the references': triangles at the cage's spacing and a ringed
patch at the navel, snapped onto its pit.
The body ends at the neck in an open 24-vertex ring (body_mesh.NECK_*) that the head bridges to.
"""
import bpy, bmesh, sys, os, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "heroine"))
import body_mesh  # noqa: E402

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = args[0] if args else os.path.abspath("heroine_out")
LEVELS = int(args[1]) if len(args) > 1 else 2
FIELD_NORMALS = os.environ.get("FIELD_NORMALS", "1") == "1"   # custom normals from the field in body_mesh.fine_zone
os.makedirs(OUT, exist_ok=True)
T0 = time.time()


def log(msg):
    print(f"[{time.time() - T0:6.1f}s] {msg}", flush=True)


def make_body(collection):
    bm = bmesh.new()
    info = body_mesh.build(bm, log)
    nq = sum(len(f.verts) == 4 for f in bm.faces)
    poles = {}
    for v in bm.verts:
        if not v.is_boundary and len(v.link_edges) != 4:
            poles[len(v.link_edges)] = poles.get(len(v.link_edges), 0) + 1
    log(f"cage: {len(bm.verts)} verts, {len(bm.faces)} faces ({len(bm.faces) - nq} not quads), "
        f"poles by valence {dict(sorted(poles.items()))}, "
        f"open edges {sum(e.is_boundary for e in bm.edges)} (the neck ring), "
        f"non-manifold edges {sum(not e.is_manifold and not e.is_boundary for e in bm.edges)}")
    me = bpy.data.meshes.new("Body")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Body", me)
    collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    ring = ob.vertex_groups.new(name="neck_ring")
    ring.add([int(i) for i in info["neck"]], 1.0, "REPLACE")
    hand = ob.vertex_groups.new(name="hand")
    hand.add([i for i, p in enumerate(info["parts"]) if p == "hand"], 1.0, "REPLACE")
    m = ob.modifiers.new("Subdivision", "SUBSURF")
    m.levels = m.render_levels = LEVELS
    return ob


def navel_patch(bm):
    """Replace the faces round the navel by a round patch: two rings and a centre, like the references'
    navels, then snap its new points onto the navel's pit (body_mesh.detail_snap)."""
    import math
    import numpy as np
    cx, cy, cz = body_mesh.NAVEL_C
    R = body_mesh.NAVEL_R
    near = lambda co, r: co.y > 0.05 and math.hypot(co.x - cx, co.z - cz) < r
    # faces centred inside the patch, and any with a corner over the pit (it left a rim point 5.6 mm in, 2 mm up)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if near(f.calc_center_median(), R)
                               or any(near(v.co, 0.0105) for v in f.verts)], context="FACES")
    hole = [e for e in bm.edges if e.is_boundary and all(v.co.y > 0.05 and math.hypot(v.co.x - cx, v.co.z - cz) < 2.5 * R
                                                        for v in e.verts)]
    if len(hole) < 10:      # the references' navels have 10-12 spokes
        bmesh.ops.subdivide_edges(bm, edges=hole, cuts=1)
    rim = [v for v in bm.verts if v.is_boundary and v.co.y > 0.05 and math.hypot(v.co.x - cx, v.co.z - cz) < 2.5 * R]
    rim.sort(key=lambda v: math.atan2(v.co.z - cz, v.co.x - cx))
    n = len(rim)
    c = np.array([cx, np.mean([v.co.y for v in rim]), cz])
    B = np.array([tuple(v.co) for v in rim])

    def drop(P):
        """Drop points straight back onto the pit along the belly's normal (-y). Snapping along the gradient
        slid them sideways up the bowl's wall, so both rings bunched on its lip round a spike."""
        P = np.array(P, float)
        P[:, 1] = c[1] + 0.03
        for _ in range(300):
            d = body_mesh.detail_field(P)
            if np.all(d < 5e-5):
                break
            P[:, 1] -= np.clip(d * 0.8, 0.0, 0.002) * (d > 5e-5)
        return P

    for v, p in zip(rim, drop(B)):  # the rim onto the surface too (it may hang over the pit's lip)
        if p[1] < v.co.y:
            v.co = tuple(p)
    B = np.array([tuple(v.co) for v in rim])
    ang = np.arctan2(B[:, 2] - cz, B[:, 0] - cx)
    rb = np.hypot(B[:, 0] - cx, B[:, 2] - cz)
    rings = []
    oval = lambda a, b: 1 / np.sqrt((np.cos(ang) / a) ** 2 + (np.sin(ang) / b) ** 2)   # the pit is a tall slit
    for r in (np.minimum(oval(0.0070, 0.0100), 0.75 * rb), oval(0.0035, 0.0058)):   # on the lip, halfway down
        P = np.stack([cx + r * np.cos(ang), np.zeros(n), cz + r * np.sin(ang)], 1)
        rings.append([bm.verts.new(tuple(p)) for p in drop(P)])
    mid = bm.verts.new(tuple(drop(c[None])[0]))
    loops = [rim] + rings
    new = []
    for a_, b_ in zip(loops[:-1], loops[1:]):
        for i in range(n):
            j = (i + 1) % n
            new.append(bm.faces.new((a_[i], a_[j], b_[j], b_[i])))
    for i in range(n):
        new.append(bm.faces.new((rings[-1][i], rings[-1][(i + 1) % n], mid)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return n, float(c[1] - mid.co.y)


def add_nails(bm):
    """Her fingernails (heroine/nails.py): a separate thin plate on each fingertip, its faces marked in the face
    attribute 'nail' (the swap paints them T_nail). Returns the number of faces added."""
    import nails
    P, quads, _ = nails.nail_meshes(body_mesh.field, body_mesh.J)
    layer = bm.faces.layers.int.get("nail") or bm.faces.layers.int.new("nail")
    vs = [bm.verts.new(tuple(p)) for p in P]
    faces = []
    for q in quads:
        f = bm.faces.new([vs[i] for i in q])
        f[layer] = 1
        f.smooth = True
        faces.append(f)
    bmesh.ops.recalc_face_normals(bm, faces=faces)
    return len(faces)


def make_game_mesh(cage, collection):
    """The game mesh, laid out like the references': the cage's own spacing (its corners at their smoothed
    places), a ringed patch at the navel, all triangles. The hands keep one level more (the references' hands
    are about twice as dense as their arms, ~5 mm edges; a 4-sided finger tube is too coarse to hold its
    round), snapped onto the field."""
    tmp = bpy.data.objects.new("tmp", cage.data)
    collection.objects.link(tmp)
    sub = tmp.modifiers.new("sub", "SUBSURF")
    sub.levels = 1
    dg = bpy.context.evaluated_depsgraph_get()
    smooth = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bm = bmesh.new()
    bm.from_mesh(smooth)
    dl = bm.verts.layers.deform.active
    gi = cage.vertex_groups["hand"].index
    hand = [v for v in bm.verts if dl is not None and v[dl].get(gi, 0.0) > 0.4]
    hand_set = set(hand)
    import numpy as np
    # the back of the hips keeps the extra subdivision too, its points back on the field (body_mesh.fine_zone):
    # the cleft and the fold under the glutes are narrower than the cage's spacing
    bm.verts.ensure_lookup_table()
    P = np.array([tuple(v.co) for v in bm.verts])
    fz = body_mesh.fine_zone(P)
    Q, mv = body_mesh.fine_snap(P[fz])
    for i, q in zip(np.flatnonzero(fz), Q):
        bm.verts[int(i)].co = tuple(q)
    log(f"fine zone: {int(fz.sum())} points snapped, moved mean {mv.mean() * 1000:.2f} mm, max {mv.max() * 1000:.1f} mm")
    keep = hand_set | {bm.verts[int(i)] for i in np.flatnonzero(fz)}
    bmesh.ops.unsubdivide(bm, verts=[v for v in bm.verts if v not in keep], iterations=2)
    hand = [v for v in bm.verts if v in hand_set]
    P = body_mesh.snap(np.array([tuple(v.co) for v in hand]), iters=6)
    for v, p in zip(hand, P):
        v.co = p
    n, depth = navel_patch(bm)
    n_nail = add_nails(bm)
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method="BEAUTY", ngon_method="BEAUTY")
    me = bpy.data.meshes.new("Body_game")
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new("Body_game", me)
    collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    if FIELD_NORMALS:
        # the back of the hips shades with the sculpt's own normals (the field's gradient), as the refs carry their
        # sculpts' normals: the creases read crisp at the game mesh's spacing. Blended into the mesh's own outside.
        P = np.array([tuple(v.co) for v in me.vertices])
        w = body_mesh.fine_weight(P)
        Nm = np.array([tuple(n.vector) for n in me.vertex_normals])
        k = np.flatnonzero(w > 0)
        Nm[k] = Nm[k] * (1 - w[k, None]) + body_mesh.field_normals(P[k]) * w[k, None]
        Nm /= np.linalg.norm(Nm, axis=1)[:, None]
        me.normals_split_custom_set_from_vertices([tuple(n) for n in Nm])
        log(f"field normals on {len(k)} verts")
    log(f"game mesh: {len(me.vertices)} verts, {len(me.polygons)} triangles; navel patch {n} round, "
        f"{depth * 1000:.1f} mm deep; nails {n_nail} faces (face attribute 'nail')")
    return ob


if __name__ == "__main__":
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # "real_heroin": the new SDF-sculpted heroine (this body + build_head.py's face), not the old "Female" rig.
    # The objects keep their names (Body, Body_game): the compare/measure scripts load them by name.
    col = bpy.data.collections.new("real_heroin")
    bpy.context.scene.collection.children.link(col)
    body = make_body(col)
    make_game_mesh(body, col)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "body.blend"))
    log("saved")
