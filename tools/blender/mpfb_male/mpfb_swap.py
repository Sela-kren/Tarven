"""
The male's MPFB skin (art/male_mpfb.blend, made by build_mpfb_male.py) swapped in for his ring-built body, inside
build_world (MALE["mpfb_skin"]), once his rig exists.

The old skin is the carrier of everything the game was built round it: the outfits, shoes and hair styles. It is
carried onto the MPFB surface (each limb segment laid onto MPFB's, then pushed along its normals onto the surface,
smoothed, and filled where it found nothing), and every worn mesh rides along with it. Then:
- the bones move to MPFB's joints, each keeping its own direction and roll (the game's poses are rotations from it);
- the MPFB skin takes over Male_Body (its own bone weights, its eyes, lips and brows), with the smallclothes
  painted from the carrier under it;
- his penis and scrotum are laid on it again (build_world's add_penis, passed in);
- his physique keys (MPFB shape keys "<slider>_p" / "<slider>_n") are carried onto every worn mesh, each corner bound
  to the skin under it, so the clothes, shoes and hair follow the game's physique sliders.
The fitting helpers are real_heroin's (sculpt_fit.py, real_heroin_swap.py).
"""
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector, kdtree
from mathutils.bvhtree import BVHTree
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "real_heroin"))
import sculpt_fit as sf  # noqa: E402
from real_heroin_swap import project_onto, mesh_tree  # noqa: E402

SOURCE = os.path.join(HERE, "..", "..", "..", "art", "male_mpfb.blend")
SKIN_OBJECT = "MaleMPFB"
# His penis and scrotum, cut from the male reference by ref_genitals.py (a dev placeholder: NOT cleared for release,
# see CREDITS.md). Without the file, build_world's tube and sack are laid on as before.
GENITALS = os.path.join(HERE, "..", "..", "..", "art", "male_genitals.blend")
GENITALS_OBJECT = "RefGenitals"

SWAP = {
    "reach": 0.1,            # how far along its normal an old skin corner looks for the MPFB surface
    "facing": 0.2,           # the hit must face the same way as the corner
    "most": 0.1,
    "outlier": 0.025,
    "outlier_passes": 3,
    "smooth": 8,
    "normal_passes": 6,
    "fill_passes": 400,
    "limb_from": (-0.05, 0.25),   # an upper arm's / thigh's share of its segment's move, from its root
    "bind": (0.02, 0.05),         # riders: bound to the skin within the first, the corners' moves past the second
    "carry_k": 8,
    "paint": ("T_smalls",),       # the carrier's paint the MPFB skin takes from under it
    "paint_reach": 0.03,
    "penis": ("T_penis", "T_glans", "T_scrotum"),
    "key_least": 0.0002,          # a worn mesh only gets a key that moves it at least this far somewhere
    "head_above": 0.05,           # the heads are measured this far above the neck joint
    "head_ease": 0.06,            # and the old one's scaling eases in over this much above the joint
    # The hair styles laid close over the new scalp (hug_scalp); his spiky default keeps its spikes.
    # The cloth's faces kept off the skin (clear_faces): skin points within "near" under a face, "gap" kept,
    # a corner pushed at most "most" a pass.
    "clear_faces": {"near": 0.03, "inside": 0.002, "gap": 0.003, "most": 0.01, "share": 0.3, "passes": 5,
                    "facing": 0.6, "key_passes": 4},
    # The packed penis and sack (clear_faces): an ellipsoid this far from where his penis leaves his skin (the old
    # tube's: from PenisRoot), with these half sizes (genitals.ts packs the reference's into it).
    "bulge": {"offset": (0.0, 0.012, -0.045), "radii": (0.038, 0.03, 0.06)},
    "bulge_skin": {"offset": (0.0, 0.004, -0.05), "radii": (0.042, 0.045, 0.072)},
    # After subdividing, each cloth corner at least this far out of his skin (not over his head, hands or feet),
    # the push smoothed over its neighbours this many times.
    "cloth_out": {"gap": 0.004, "smooth": 3},
    # Spikes the face clearing leaves on the subdivided cloth (despike_cloth), eased back.
    "despike": {"share": 0.45, "least": 0.004, "ease": 0.7, "passes": 6},
    # His shoes made roomier below the ankle (puff_shoes), so his feet don't show through the subdivided uppers.
    "shoe_puff": {"puff": 0.009, "below": 0.0, "ease": 0.04, "toe": 0.014},
    # Holes in his clothes round his crotch closed (close_crotch): loops under "most" metres round, their middle
    # within "x" of his middle and "z" of his penis's root's height.
    "crotch_holes": {"most": 0.35, "x": 0.05, "z": 0.12},
    # The reference's penis and sack (lay_genitals): its root this far inside the skin in front of PenisRoot; its open
    # edge and the "band" rings of corners in from it drawn onto his skin, "seam_in" under it, so it grows out of him.
    "genitals": {"embed": 0.003, "band": 5, "seam_in": 0.0015, "texture": 1024},
    # His clothes and shoes subdivided this many times (Catmull-Clark) before they're kept off his skin, so the
    # low-poly panels made for the ring-built body read as cloth on the smooth MPFB one.
    "cloth_subdiv": 1,
    "hug": ("Male_HairBuzz", "Male_HairLong", "Male_HairPonytail"),
    "hug_shape": {"reach": 0.035, "least": 0.003, "edge": 0.0015, "tuck": 0.012, "passes": 12},
}


def log(*a):
    print("[mpfb_swap]", *a, flush=True)


def world(obj):
    mw = np.array(obj.matrix_world)
    co = np.zeros(len(obj.data.vertices) * 3)
    obj.data.vertices.foreach_get("co", co)
    return co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]


def set_world(obj, X):
    inv = np.linalg.inv(np.array(obj.matrix_world))
    obj.data.vertices.foreach_set("co", (X @ inv[:3, :3].T + inv[:3, 3]).ravel())
    obj.data.update()


class Binding:
    """
    Points bound to a skin (P, its triangles): each to the nearest spot within fit["bind"][0] (that triangle, the
    same place on it, as far off it along its normal, the same sideways offset), past fit["bind"][1] to the moves of
    its nearest skin corners by inverse distance, blended between. Bound once; apply() for each new skin shape.
    sculpt_fit.Rider's rule, worked out once so it can be put to many shapes.
    """

    def __init__(self, P, tris, X, fit):
        self.P, self.tris = P, tris
        near, far = fit["bind"]
        tree = BVHTree.FromPolygons([Vector(p) for p in P], [tuple(int(i) for i in t) for t in tris])
        used = np.unique(tris)
        kd = kdtree.KDTree(len(used))
        for j, i in enumerate(used):
            kd.insert(Vector(P[i]), j)
        kd.balance()
        n = len(X)
        self.tri = np.zeros(n, int)
        self.bary = np.zeros((n, 3))
        self.height = np.zeros(n)
        self.side = np.zeros((n, 3))
        self.k = np.ones(n)          # 0 bound, 1 carried by the corners
        self.has = np.zeros(n, bool)
        k_n = fit["carry_k"]
        self.nn = np.zeros((n, k_n), int)
        self.nw = np.zeros((n, k_n))
        for i, x in enumerate(X):
            p = Vector(x)
            loc, normal, index, dist = tree.find_nearest(p, far)
            edge = 0.0
            if loc is not None:
                a, b, c = tris[index]
                w = poly_3d_calc([Vector(P[a]), Vector(P[b]), Vector(P[c])], loc)
                h = float((p - loc).dot(normal))
                self.tri[i], self.bary[i], self.height[i] = index, w, h
                self.side[i] = np.array(p - loc) - np.array(normal) * h
                self.has[i] = True
                edge = sf._smooth((np.linalg.norm(self.side[i]) - 0.003) / 0.01)
                if dist <= near and edge <= 0:
                    self.k[i] = 0.0
                    continue
            else:
                dist = far
            hits = kd.find_n(p, k_n)
            for j, hh in enumerate(hits):
                self.nn[i, j] = used[hh[1]]
                self.nw[i, j] = 1.0 / max(hh[2], 1e-4) ** 2
            self.nw[i] /= self.nw[i].sum()
            self.k[i] = 1.0 if loc is None else max(sf._smooth((dist - near) / (far - near)), edge)
        self.X = np.asarray(X, float)

    def apply(self, new):
        T = self.tris[self.tri]
        A, B, C = new[T[:, 0]], new[T[:, 1]], new[T[:, 2]]
        n2 = np.cross(B - A, C - A)
        ln = np.linalg.norm(n2, axis=1, keepdims=True)
        n2 = n2 / np.maximum(ln, 1e-12)
        # keep the normal on the side it faced as bound
        P = self.P
        oa, ob, oc = P[T[:, 0]], P[T[:, 1]], P[T[:, 2]]
        n1 = np.cross(ob - oa, oc - oa)
        n2 *= np.sign(np.sum(n1 * n2, axis=1, keepdims=True) + 1e-30)
        bound = (A * self.bary[:, :1] + B * self.bary[:, 1:2] + C * self.bary[:, 2:3]
                 + n2 * self.height[:, None] + self.side)
        moves = new - P
        carried = self.X + np.einsum("nk,nkd->nd", self.nw, moves[self.nn])
        k = self.k[:, None]
        out = np.where(self.has[:, None], bound * (1 - k) + carried * k, carried)
        return out


def hug_scalp(obj, S, tris, neck_z, swap):
    """
    A hair style laid close over the new scalp: within HUG["reach"] of it, each corner's height over the skin is
    smoothed over its neighbours' (the old pointed skull's peak rounds out) and kept at least HUG["least"]; its open
    edge (the hairline) is tucked down to HUG["edge"]. What hangs further off (a ponytail, long hair) is left.
    """
    hug = swap["hug_shape"]
    keep = S[:, 2] > neck_z
    head_tris = np.array([t for t in tris if keep[t].all()])
    tree = BVHTree.FromPolygons([Vector(p) for p in S], [tuple(int(i) for i in t) for t in head_tris])
    X = world(obj)
    n = len(X)
    loc = np.zeros((n, 3))
    nrm = np.zeros((n, 3))
    h = np.full(n, np.inf)
    for i, x in enumerate(X):
        hit = tree.find_nearest(Vector(x), hug["reach"] * 2)
        if hit[0] is None:
            continue
        loc[i], nrm[i] = hit[0], hit[1]
        h[i] = float((Vector(x) - hit[0]).dot(hit[1]))
    near = h < hug["reach"]
    edges = np.array([e.vertices[:] for e in obj.data.edges])
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    boundary = np.zeros(n, bool)
    for v in bm.verts:
        if v.is_boundary:
            boundary[v.index] = True
    bm.free()
    hs = np.where(near, np.maximum(h, hug["least"]), 0.0)
    tuck = near & boundary & (h < hug["tuck"])
    hs[tuck] = hug["edge"]
    for _ in range(hug["passes"]):
        mean = sf.neighbour_mean(hs[:, None], edges, near)[:, 0]
        hs = np.where(near & ~tuck, np.maximum(0.5 * hs + 0.5 * mean, hug["least"]), hs)
    w = (1 - sf._smooth((h - hug["reach"] * 0.7) / (hug["reach"] * 0.3)))[:, None] * near[:, None]
    Y = np.where(near[:, None], loc + nrm * hs[:, None], X)
    set_world(obj, X * (1 - w) + Y * w)
    log(f"{obj.name}: {int(near.sum())} corners hugged to the scalp, {int(tuck.sum())} at the hairline tucked in")


def under_map(X, tris, idx, pts, nrms, skin_tree, cf):
    """
    Which skin points lie under which cloth face: for each kept point, the face's corners, its share of each, and
    its height over the face (outward; negative is clear of it). Each corner's outward direction is the skin's
    normal under it (the cloth's own winding varies). Kept: points within cf["near"] under the inside of a face,
    their skin facing the way the cloth over it does (the other leg's inner thigh beside a trouser leg, or the arm
    beside a sleeve, isn't under it).
    """
    tree = BVHTree.FromPolygons([Vector(p) for p in X], [tuple(int(i) for i in t) for t in tris])
    vn = np.zeros_like(X)
    for i, x in enumerate(X):
        hit = skin_tree.find_nearest(Vector(x), 0.2)
        if hit[0] is not None:
            vn[i] = hit[1]
    rows = []
    for k, s, ns in zip(idx, pts, nrms):
        loc, normal, f, dist = tree.find_nearest(Vector(s), cf["near"])
        if loc is None:
            continue
        d = np.array(s) - np.array(loc)
        h = float(d @ np.array(normal))
        if np.linalg.norm(d - np.array(normal) * h) > cf["inside"]:
            continue                      # past the face's edge (a cuff, a hem): not under it
        a, b, c = tris[f]
        n_out = vn[a] + vn[b] + vn[c]
        if not n_out.any() or float(ns @ n_out) < cf["facing"] * np.linalg.norm(n_out):
            continue
        if float(np.array(normal) @ n_out) < 0:
            h = -h
        w = poly_3d_calc([Vector(X[a]), Vector(X[b]), Vector(X[c])], loc)
        rows.append((k, a, b, c, w[0], w[1], w[2], h))
    if not rows:
        return None
    R = np.array(rows)
    return {"skin": R[:, 0].astype(int), "tri": R[:, 1:4].astype(int), "w": R[:, 4:7], "h": R[:, 7], "vn": vn}


def push_out(X, m, h, gap, cf, need=None):
    """The corners pushed out so every mapped point is `gap` under its face: each by its share of the point."""
    need = h + gap if need is None else need
    hit = need > 0
    if not hit.any():
        return X, 0.0
    push = np.zeros(len(X))
    for k in range(3):
        amount = np.minimum(need[hit] * (cf["share"] + m["w"][hit, k]), cf["most"])
        np.maximum.at(push, m["tri"][hit, k], amount)
    return X + m["vn"] * push[:, None], float(push.max())


def clear_faces(skin_pts, skin_nrm, skin_tree, layers, swap, under=None):
    """
    The clothes' faces kept off the skin, not just their corners: the old outfits are low, flat panels, and the
    smooth MPFB skin bulges up between a panel's corners. Every skin point under a cloth face (under_map) that
    stands through it or nearer than the gap pushes that face's corners out, by their share of it; a few passes.
    Returns each layer's last map, so the physique keys can be kept clear the same way (clear_key).
    """
    cf = swap["clear_faces"]
    maps = {}
    for obj in layers:
        X = world(obj)
        tris = []
        for p in obj.data.polygons:
            vs = p.vertices[:]
            for k in range(1, len(vs) - 1):
                tris.append((vs[0], vs[k], vs[k + 1]))
        tris = np.array(tris)
        if not len(tris):
            continue
        lo, hi = X.min(0) - cf["near"], X.max(0) + cf["near"]
        box = np.all((skin_pts >= lo) & (skin_pts <= hi), axis=1)
        if under is not None:
            box &= under(obj)
        idx = np.nonzero(box)[0]
        moved_total, m = 0.0, None
        for _ in range(cf["passes"]):
            m = under_map(X, tris, idx, skin_pts[idx], skin_nrm[idx], skin_tree, cf)
            if m is None:
                break
            X, moved = push_out(X, m, m["h"], cf["gap"], cf)
            if not moved:
                break
            moved_total += moved
        if moved_total:
            # measured again on the cloth as it ends up, for the keys (clear_key) to start from
            m = under_map(X, tris, idx, skin_pts[idx], skin_nrm[idx], skin_tree, cf)
        set_world(obj, X)
        if m is not None:
            maps[obj.name] = m
        if moved_total:
            log(f"{obj.name}: faces kept off the skin (pushed up to {moved_total * 1000:.1f} mm in all)")
    return maps


def clear_key(Y, X, m, skin_out, cf):
    """
    A physique key's cloth (Y, world) kept off its skin: each mapped point's height grows by how far the key moves
    the skin out there (`skin_out`, per skin point) less how far it moves the face's corners out, and the corners
    are pushed only where the key brings the skin nearer the cloth than it is as built (keys add up, so a push
    everywhere would bloat a man who has several).
    """
    # The clearance each point has as built; where the base never quite cleared, a key doesn't try to fix that (in
    # every key at once, it added up to balloons).
    keep = m["h"]
    for _ in range(cf["key_passes"]):
        out = np.einsum("nd,nd->n", Y - X, m["vn"])
        h = m["h"] + skin_out[m["skin"]] - np.einsum("nk,nk->n", m["w"], out[m["tri"]])
        Y2, moved = push_out(Y, m, h, 0.0, cf, need=h - keep)
        if not moved:
            break
        Y = Y2
    return Y


def body_weights(obj, group):
    """Each vertex's weight in one vertex group (0 where it has none)."""
    out = np.zeros(len(obj.data.vertices))
    g = obj.vertex_groups.get(group)
    if g is None:
        return out
    for v in obj.data.vertices:
        for e in v.groups:
            if e.group == g.index:
                out[v.index] = e.weight
    return out


def load_skin():
    """MaleMPFB and its joints from the cache, with their materials swapped for the build's own (same names)."""
    path = os.path.abspath(SOURCE)
    if not os.path.exists(path):
        raise RuntimeError(f"mpfb_swap: {path} is missing; build it with tools/blender/mpfb_male/build_mpfb_male.py")
    with bpy.data.libraries.load(path) as (src, dst):
        dst.objects = [nm for nm in src.objects if nm == SKIN_OBJECT or nm.startswith("joint:")]
    skin, joints = None, {}
    for o in dst.objects:
        if o.name.startswith("joint:"):
            joints[o.name[6:]] = np.array(o.location)
            bpy.data.objects.remove(o)
        else:
            skin = o
            bpy.context.scene.collection.objects.link(o)
    me = skin.data
    for k, mat in enumerate(me.materials):
        base = mat.name.split(".")[0]
        own = bpy.data.materials.get(base)
        if own is None:
            raise RuntimeError(f"mpfb_swap: the build has no material {base}")
        if own is not mat:
            me.materials[k] = own
            if mat.users == 0:
                bpy.data.materials.remove(mat)
    return skin, joints


def lay_genitals(body, mats, J, swap):
    """
    The reference's penis and sack (art/male_genitals.blend) added to `body`'s mesh: its root on his skin in front of
    PenisRoot, its open edge drawn in under his skin, every corner weighted like the skin it leaves (the open edge's
    band like the skin under it, the rest like the root). Its faces wear `mats` (T_penis, T_glans, T_scrotum), which
    take its texture; its "Rig" UV map comes along for the game (penis.ts). Returns False without the file.
    """
    g = swap["genitals"]
    path = os.path.abspath(GENITALS)
    if not os.path.exists(path):
        return False
    with bpy.data.libraries.load(path) as (src, dst):
        dst.objects = [GENITALS_OBJECT]
    ref = dst.objects[0]
    rme = ref.data
    image = None
    for mat in rme.materials:
        for node in mat.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image is not None:
                image = node.image
    if image is None:
        raise RuntimeError("lay_genitals: the reference's genitals have no texture")
    image.name = "T_genitals_ref"
    if image.size[0] > g["texture"]:
        image.scale(g["texture"], g["texture"])
    image.pack()
    for mat in mats:
        tex = next(n for n in mat.node_tree.nodes if n.type == "TEX_IMAGE")
        tex.image = image
        tex.interpolation = "Linear"
    ref_mats = list(rme.materials)

    # Where it goes: the root on his skin straight in front of PenisRoot, a little in.
    S = world(body)
    btris = sf.triangles(body, np.ones(len(S), bool))
    stree = BVHTree.FromPolygons([Vector(p) for p in S], [tuple(int(k) for k in t) for t in btris])
    pr = Vector(J["PenisRoot"])
    fwd = Vector((0.0, 1.0, 0.0))
    # (from behind him, the last skin met going forward is his front)
    hit, at = None, Vector((0.0, pr.y - 0.15, pr.z))
    while True:
        loc, _n, _i, _d = stree.ray_cast(at, fwd, 0.4)
        if loc is None:
            break
        hit, at = loc, loc + fwd * 1e-4
    if hit is None:
        raise RuntimeError("lay_genitals: no skin in front of PenisRoot")
    root = np.array([0.0, hit.y - g["embed"], hit.z])
    R = np.array([v.co[:] for v in rme.vertices]) + root

    # The open edge and the band in from it, by rings.
    nv = len(R)
    ring = np.full(nv, 1 << 20)
    seam_g = ref.vertex_groups["Seam"].index
    for v in rme.vertices:
        if any(e.group == seam_g for e in v.groups):
            ring[v.index] = 0
    E = np.array([e.vertices[:] for e in rme.edges])
    for r in range(1, g["band"] + 1):
        near = np.zeros(nv, bool)
        near[E[:, 0][ring[E[:, 1]] == r - 1]] = True
        near[E[:, 1][ring[E[:, 0]] == r - 1]] = True
        ring[near & (ring > r)] = r
    w_band = np.where(ring <= g["band"], 1.0 - ring / (g["band"] + 1.0), 0.0)
    w_band = w_band * w_band * (3 - 2 * w_band)
    tri_of = np.zeros(nv, int)
    drawn = 0
    for i in range(nv):
        loc, n, ti, _d = stree.find_nearest(Vector(R[i]))
        tri_of[i] = ti
        if w_band[i] <= 0:
            continue
        loc, n = np.array(loc), np.array(n)
        if np.dot(R[i] - loc, n) > -g["seam_in"]:
            R[i] = R[i] + (loc - n * g["seam_in"] - R[i]) * w_band[i]
            drawn += 1
    # each corner's nearest skin corner, for its weights
    nearest = np.array([btris[tri_of[i]][np.argmin(np.linalg.norm(S[btris[tri_of[i]]] - R[i], axis=1))]
                        for i in range(nv)])
    t = btris[stree.find_nearest(Vector(root))[2]]
    root_v = int(t[np.argmin(np.linalg.norm(S[t] - root, axis=1))])

    # Into his mesh.
    me = body.data
    names = [m.name if m else "" for m in me.materials]
    slot = []
    for mat in mats:
        if mat.name not in names:
            me.materials.append(mat)
            names.append(mat.name)
        slot.append(names.index(mat.name))
    vw = [{e.group: e.weight for e in v.groups} for v in me.vertices]
    inv = np.linalg.inv(np.array(body.matrix_world))
    bm = bmesh.new()
    bm.from_mesh(me)
    deform = bm.verts.layers.deform.verify()
    uv0 = bm.loops.layers.uv[0]
    rig_uv = bm.loops.layers.uv.get("Rig") or bm.loops.layers.uv.new("Rig")
    new_v = []
    for i in range(nv):
        v = bm.verts.new(Vector(R[i] @ inv[:3, :3].T + inv[:3, 3]))
        a, b = vw[root_v], vw[int(nearest[i])]
        mix = {k: a.get(k, 0.0) * (1 - w_band[i]) + b.get(k, 0.0) * w_band[i] for k in set(a) | set(b)}
        total = sum(mix.values()) or 1.0
        for k, wt in mix.items():
            if wt > 1e-4:
                v[deform][k] = wt / total
        new_v.append(v)
    ruv0 = rme.uv_layers["UVMap"].data
    rrig = rme.uv_layers["Rig"].data
    for poly in rme.polygons:
        f = bm.faces.new([new_v[k] for k in poly.vertices])
        f.material_index = slot[poly.material_index]
        f.smooth = True
        for loop, li in zip(f.loops, poly.loop_indices):
            loop[uv0].uv = ruv0[li].uv
            loop[rig_uv].uv = rrig[li].uv
    bm.to_mesh(me)
    bm.free()
    me.update()
    bpy.data.objects.remove(ref)
    bpy.data.meshes.remove(rme)
    for mat in ref_mats:
        if mat.users == 0:
            bpy.data.materials.remove(mat)
    log(f"genitals laid on: {nv} corners, root {np.round(root, 3)} (PenisRoot {np.round(np.array(J['PenisRoot']), 3)}), "
        f"{drawn} of the open edge's band drawn in; uv maps {[u.name for u in me.uv_layers]}")
    return root


def close_crotch(obj, crotch_z, cfg):
    """
    Fills the small holes in `obj` round his crotch (open boundary loops under cfg["most"] metres round, their middle
    within cfg["x"] of his middle and cfg["z"] of `crotch_z`): where a front flap and two trouser legs made for the
    ring-built body don't meet, and his skin would show between them. The new faces take their neighbours' material
    and UVs.
    """
    me = obj.data
    mw = obj.matrix_world
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.active
    bnd = {e for e in bm.edges if e.is_boundary}
    loops = []
    while bnd:
        e = bnd.pop()
        loop = [e]
        ends = list(e.verts)
        grown = True
        while grown:
            grown = False
            for f in list(bnd):
                if f.verts[0] in ends or f.verts[1] in ends:
                    bnd.discard(f)
                    loop.append(f)
                    for v in f.verts:
                        if v in ends:
                            ends.remove(v)
                        else:
                            ends.append(v)
                    grown = True
        loops.append(loop)
    filled = 0
    for loop in loops:
        vs = {v for e in loop for v in e.verts}
        pts = [mw @ v.co for v in vs]
        c = sum(pts, Vector()) / len(pts)
        perim = sum((mw @ e.verts[0].co - mw @ e.verts[1].co).length for e in loop)
        if perim > cfg["most"] or abs(c.x) > cfg["x"] or abs(c.z - crotch_z) > cfg["z"]:
            continue
        res = bmesh.ops.holes_fill(bm, edges=loop, sides=0)
        for f in res["faces"]:
            nb = [g for e in f.edges for g in e.link_faces if g is not f]
            if nb:
                f.material_index = nb[0].material_index
                f.smooth = True
            for lp in f.loops:
                other = [l2 for l2 in lp.vert.link_loops if l2.face is not f]
                if other and uvl is not None:
                    lp[uvl].uv = other[0][uvl].uv
        bmesh.ops.recalc_face_normals(bm, faces=res["faces"])
        filled += 1
    bm.to_mesh(me)
    bm.free()
    me.update()
    if filled:
        log(f"{obj.name}: {filled} holes at the crotch closed")


def subdivide_cloth(objs, levels):
    """Each of `objs` subdivided `levels` times (Catmull-Clark), its UVs and weights carried; not one with keys."""
    done = 0
    for obj in objs:
        if obj.data.shape_keys is not None:
            log(f"{obj.name} has shape keys: not subdivided")
            continue
        mod = obj.modifiers.new("cloth_subdiv", "SUBSURF")
        mod.levels = levels
        mod.render_levels = levels
        mod.uv_smooth = "PRESERVE_BOUNDARIES"
        mod.boundary_smooth = "PRESERVE_CORNERS"
        with bpy.context.temp_override(object=obj, active_object=obj):
            # (before every other modifier, the armature included)
            bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
            bpy.ops.object.modifier_apply(modifier=mod.name)
        for poly in obj.data.polygons:
            poly.use_smooth = True
        done += 1
    log(f"{done} cloth meshes subdivided x{levels}")


def push_cloth_out(objs, body, before, under, cfg):
    """
    Every corner of `objs` at least cfg["gap"] out of `body`'s skin (its first `before` corners, those `under(obj)`
    allows under it): pushed out along the nearest skin's normal, the push smoothed over its neighbours so the
    cloth moves as a piece rather than corner by corner.
    """
    S = world(body)[:before]
    tris = sf.triangles(body, np.r_[np.ones(before, bool), np.zeros(len(body.data.vertices) - before, bool)])
    for obj in objs:
        allowed = under(obj)
        ok_tri = allowed[tris].all(1)
        t = tris[ok_tri]
        if not len(t):
            continue
        tree = BVHTree.FromPolygons([Vector(p) for p in S], [tuple(int(k) for k in f) for f in t])
        X = world(obj)
        push = np.zeros_like(X)
        for i, p in enumerate(X):
            loc, n, _ti, dist = tree.find_nearest(Vector(p), 0.06)
            if loc is None:
                continue
            h = float(np.dot(p - np.array(loc), np.array(n)))
            if h < cfg["gap"]:
                push[i] = np.array(n) * (cfg["gap"] - h)
        moved = np.linalg.norm(push, axis=1) > 0
        edges = np.array([e.vertices[:] for e in obj.data.edges])
        if len(edges):
            for _ in range(cfg["smooth"]):
                push = np.where(moved[:, None], push, 0.5 * sf.neighbour_mean(push, edges, np.ones(len(X), bool)))
        set_world(obj, X + push)
        log(f"{obj.name}: {int(moved.sum())} of {len(X)} corners pushed out of the skin, "
            f"up to {np.linalg.norm(push, axis=1).max() * 1000:.1f} mm")


def despike_cloth(objs, cfg, only=None):
    """
    Corners standing out of the cloth around them like spikes (further than cfg["share"] of their edges' length from
    their neighbours' middle, and at least cfg["least"] metres), eased back towards it, cfg["passes"] times. The open
    edges (hems, cuffs, collars) along their own edges, so they keep their line rather than curling in. `only(obj, X)`,
    if given, says which corners may be eased.
    """
    for obj in objs:
        me = obj.data
        if not len(me.edges):
            continue
        X = world(obj)
        bm = bmesh.new()
        bm.from_mesh(me)
        rim = np.array([v.is_boundary for v in bm.verts]) if len(bm.verts) == len(X) else np.zeros(len(X), bool)
        rim_e = np.array([e.is_boundary for e in bm.edges]) if len(bm.edges) == len(me.edges) else np.zeros(len(me.edges), bool)
        bm.free()
        E = np.array([e.vertices[:] for e in me.edges])
        everyone = np.ones(len(X), bool)
        fixed = 0
        for _ in range(cfg["passes"]):
            inner = sf.neighbour_mean(X, E, everyone)
            along = sf.neighbour_mean(X, E[rim_e], everyone) if rim_e.any() else inner
            M = np.where(rim[:, None], along, inner)
            length = np.zeros(len(X))
            count = np.zeros(len(X))
            el = np.linalg.norm(X[E[:, 0]] - X[E[:, 1]], axis=1)
            np.add.at(length, E[:, 0], el)
            np.add.at(length, E[:, 1], el)
            np.add.at(count, E[:, 0], 1)
            np.add.at(count, E[:, 1], 1)
            length /= np.maximum(count, 1)
            d = np.linalg.norm(X - M, axis=1)
            spike = (d > cfg["share"] * length) & (d > cfg["least"])
            if only is not None:
                spike &= only(obj, X)
            if not spike.any():
                break
            fixed += int(spike.sum())
            X[spike] += (M[spike] - X[spike]) * cfg["ease"]
        set_world(obj, X)
        if fixed:
            log(f"{obj.name}: {fixed} spikes eased")


def puff_shoes(objs, ankle_z, cfg):
    """
    Shoes made a little roomier below the ankle: each corner more than cfg["below"] under it moved out along the
    shoe's own normal by cfg["puff"] metres (easing in over cfg["ease"] above that), so the foot's edges, which the
    subdivided upper rounds in over, stay inside.
    """
    for obj in objs:
        me = obj.data
        me.update()
        X = world(obj)
        mw3 = np.array(obj.matrix_world.to_3x3())
        N = np.array([mw3 @ v.normal for v in me.vertices])
        N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
        w = np.clip((ankle_z - cfg["below"] - X[:, 2]) / cfg["ease"], 0.0, 1.0)
        w = w * w * (3 - 2 * w)
        X = X + N * (cfg["puff"] * w)[:, None]
        # and a little longer at the toe, each shoe (each side of his middle) from its middle forward
        for side in (X[:, 0] < 0, X[:, 0] >= 0):
            if not side.any():
                continue
            y0, y1 = X[side, 1].mean(), X[side, 1].max()
            f = np.clip((X[:, 1] - y0) / max(1e-6, y1 - y0), 0.0, 1.0) * side
            X[:, 1] += cfg["toe"] * f * f
        set_world(obj, X)
        log(f"{obj.name}: {int((w > 0).sum())} corners puffed out up to {cfg['puff'] * 1000:.0f} mm, "
            f"toes {cfg['toe'] * 1000:.0f} mm longer")


def swap_in(rig, body, meshes, name, add_penis, clear=None, swap=None, genital_mats=None):
    """`add_penis(body)` lays his penis and sack on the new skin; `clear()` keeps the clothes off it (before the
    physique keys are carried onto them, which keep each corner's height over the skin as it then is)."""
    swap = dict(SWAP, **(swap or {}))
    skin, J = load_skin()
    S0 = world(skin)
    stris = sf.triangles(skin, np.ones(len(S0), bool))
    tree = mesh_tree(S0, stris)

    P = world(body)
    n = len(P)
    edges = np.array([e.vertices[:] for e in body.data.edges])
    game = sf.rig_points(rig, P, name)

    # --- the carrier: every piece of the old skin but his penis and sack (they're laid on again after)
    names_m = [m.name if m else "" for m in body.data.materials]
    island = sf.islands(n, edges)
    penis = np.zeros(n, bool)
    for poly in body.data.polygons:
        if names_m[poly.material_index] in swap["penis"]:
            penis[list(poly.vertices)] = True
    penis = np.isin(island, np.unique(island[penis]))
    carrier = ~penis

    # Each corner carried by its limb segment (old joints -> MPFB's), the trunk as it is.
    new_j = {side: dict(shoulder=J[f"UpperArm_{side}"], elbow=J[f"ForeArm_{side}"], wrist=J[f"Wrist_{side}"],
                        hip=J[f"Thigh_{side}"], knee=J[f"Shin_{side}"], ankle=J[f"Ankle_{side}"]) for side in ("L", "R")}
    seg = {}
    for side in ("L", "R"):
        g, t = game[side], new_j[side]
        seg[("upper", side)] = sf.Segment(g["shoulder"], g["elbow"], t["shoulder"], t["elbow"])
        seg[("fore", side)] = sf.Segment(g["elbow"], g["wrist"], t["elbow"], t["wrist"])
        seg[("thigh", side)] = sf.Segment(g["hip"], g["knee"], t["hip"], t["knee"])
        seg[("shin", side)] = sf.Segment(g["knee"], g["ankle"], t["knee"], t["ankle"])
    keys = list(seg)
    gname = {gr.index: gr.name[len(name) + 1:] for gr in body.vertex_groups}
    W = np.zeros((n, len(keys) + 1))
    for i, v in enumerate(body.data.vertices):
        for gr in v.groups:
            s = sf.segment_of(gname.get(gr.group, ""))
            W[i, keys.index(s) if s in seg else -1] += gr.weight
    W[W.sum(1) <= 0, -1] = 1.0
    W /= W.sum(1, keepdims=True)
    t0, t1 = swap["limb_from"]
    for k, (kind, side) in enumerate(keys):
        if kind in ("upper", "thigh"):
            sg = seg[(kind, side)]
            far_end = game[side]["elbow" if kind == "upper" else "knee"]
            d = (P - sg.a) @ sg.u / np.linalg.norm(far_end - sg.a)
            share = sf._smooth((d - t0) / (t1 - t0))
            W[:, -1] += W[:, k] * (1 - share)
            W[:, k] *= share
    mw3 = np.array(body.matrix_world.to_3x3())
    Nrm = np.array([mw3 @ v.normal for v in body.data.vertices])
    Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-9)
    every = np.ones(n, bool)
    for _ in range(swap["normal_passes"]):
        Nrm = 0.5 * Nrm + 0.5 * sf.neighbour_mean(Nrm, edges, every)
        Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-9)
    Q = P * W[:, -1:]
    NQ = Nrm * W[:, -1:]
    for k, key in enumerate(keys):
        w = W[:, k:k + 1]
        if w.any():
            Q = Q + seg[key].to_sculpt(P) * w
            NQ = NQ + seg[key].dirs_to_sculpt(Nrm) * w
    NQ /= np.maximum(np.linalg.norm(NQ, axis=1, keepdims=True), 1e-9)

    # His old head (a faceted one, a different shape) first scaled as a whole onto the MPFB head's box above the neck,
    # easing in from the neck joint, so it lies close over it and its hair styles sit on the new scalp.
    hz_old = float((rig.matrix_world @ rig.data.bones[f"{name}_Head"].head_local).z)
    hz_new = float(J["Head"][2])
    above = swap["head_above"]
    old_h = carrier & (P[:, 2] > hz_old + above)
    new_h = S0[:, 2] > hz_new + above
    lo_o, hi_o = P[old_h].min(0), P[old_h].max(0)
    lo_n, hi_n = S0[new_h].min(0), S0[new_h].max(0)
    k_head = (hi_n - lo_n) / (hi_o - lo_o)
    c_o, c_n = (lo_o + hi_o) / 2, (lo_n + hi_n) / 2
    c_o[0] = c_n[0] = 0.0
    w_head = (sf._smooth((P[:, 2] - hz_old) / swap["head_ease"]) * carrier)[:, None]
    Q = Q * (1 - w_head) + (c_n + (P - c_o) * k_head) * w_head
    log(f"old head scaled x{np.round(k_head, 3)} (w, d, h), centre moved {np.round((c_n - c_o) * 1000).astype(int)} mm")

    # ... then onto the MPFB surface.
    todo = np.nonzero(carrier)[0]
    tt = project_onto(tree, Q[todo], NQ[todo], swap["reach"], swap["facing"])
    ok = ~np.isnan(tt)
    found = np.zeros(n, bool)
    found[todo[ok]] = True
    D = np.zeros((n, 3))
    D[todo[ok]] = NQ[todo[ok]] * tt[ok, None]
    D *= np.minimum(1.0, swap["most"] / np.maximum(np.linalg.norm(D, axis=1), 1e-9))[:, None]
    aimed = int(found.sum())
    for _ in range(swap["outlier_passes"]):
        mean = sf.neighbour_mean(D, edges, found)
        found &= ~(np.linalg.norm(D - mean, axis=1) > swap["outlier"])
    length = np.linalg.norm(P[edges[:, 0]] - P[edges[:, 1]], axis=1)
    close = 1.0 / np.maximum(length, 1e-3) ** 2
    for _ in range(swap["smooth"]):
        D = np.where(found[:, None], 0.5 * D + 0.5 * sf.neighbour_mean(D, edges, found, close), D)
    move_fit = Q + D - P
    fill = sf.harmonic_fill(move_fit, edges, found, carrier, swap["fill_passes"])
    move = np.where(found[:, None], move_fit, fill)
    unreached = carrier & ~found & (np.linalg.norm(fill, axis=1) == 0)
    move[unreached] = (Q - P)[unreached]
    move[penis] = 0.0
    new = P + move
    log(f"old skin {int(carrier.sum())} corners, {aimed} hit the MPFB surface, {int(found.sum())} kept; "
        f"moved mean {np.linalg.norm(move[carrier], axis=1).mean() * 1000:.1f} mm")

    # --- everything worn rides on the carrier skin
    ctris = sf.triangles(body, carrier)
    worn = [o for o in meshes if o.type == "MESH" and o is not body and o is not skin and len(o.data.vertices)]
    for obj in worn:
        X = world(obj)
        set_world(obj, Binding(P, ctris, X, swap).apply(new))
    log(f"{len(worn)} worn meshes carried")
    for obj in worn:
        if obj.name.split(".")[0] in swap["hug"]:
            hug_scalp(obj, S0, stris, float(J["Head"][2]), swap)

    # --- the bones onto MPFB's joints, each keeping its direction and roll
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    rinv = rig.matrix_world.inverted()
    moved = []
    for eb in rig.data.edit_bones:
        label = eb.name[len(name) + 1:]
        if label not in J:
            continue
        tail_off = eb.tail - eb.head
        roll = eb.roll
        eb.head = rinv @ Vector(J[label])
        eb.tail = eb.head + tail_off
        eb.roll = roll
        moved.append(label)
    bpy.ops.object.mode_set(mode="OBJECT")
    log(f"bones moved: {len(moved)}")

    # --- the smallclothes' paint, from the fitted carrier under the MPFB skin
    ftree = mesh_tree(new, ctris)
    tri_face = []
    for poly in body.data.polygons:
        vs = poly.vertices[:]
        if all(carrier[v] for v in vs):
            tri_face += [poly.index] * (len(vs) - 2)
    tri_face = np.array(tri_face)
    face_mat = np.array([p.material_index for p in body.data.polygons])
    smat = {m.name: k for k, m in enumerate(skin.data.materials)}
    for want in swap["paint"]:
        if want not in smat:
            skin.data.materials.append(bpy.data.materials[want])
            smat[want] = len(skin.data.materials) - 1
    skin_slot = smat["T_skin"]
    painted = 0
    for poly in skin.data.polygons:
        if poly.material_index != skin_slot:
            continue
        loc, nrm, idx, dist = ftree.find_nearest(Vector(poly.center), swap["paint_reach"])
        if idx is None:
            continue
        mname = names_m[face_mat[tri_face[idx]]]
        if mname in swap["paint"]:
            poly.material_index = smat[mname]
            painted += 1
    log(f"{painted} faces painted from the carrier")

    # --- the swap: the MPFB skin becomes Male_Body (same object: its name, parent and armature stay)
    old_me = body.data
    me = skin.data
    group_names = [g.name for g in skin.vertex_groups]
    body.vertex_groups.clear()   # (on the old mesh: clearing them strips the weights of whatever mesh it has)
    body.data = me
    for g in group_names:
        body.vertex_groups.new(name=g)
    for g in [g.name for g in rig.data.bones]:
        if g not in body.vertex_groups:
            body.vertex_groups.new(name=g)   # every bone a group, as before (empty ones cost nothing)
    me.name = old_me.name
    bpy.data.objects.remove(skin)
    bpy.data.meshes.remove(old_me)
    body.data.update()

    # --- his penis and sack, laid on the new skin; they take no physique keys (the game shapes them itself)
    before = len(body.data.vertices)
    skin_root = lay_genitals(body, genital_mats, J, swap) if genital_mats is not None else False
    if skin_root is False:
        add_penis(body)
    base_co = np.zeros(len(body.data.vertices) * 3)
    body.data.vertices.foreach_get("co", base_co)
    base_co = base_co.reshape(-1, 3)
    for kb in body.data.shape_keys.key_blocks[1:]:
        co = np.zeros(len(body.data.vertices) * 3)
        kb.data.foreach_get("co", co)
        co = co.reshape(-1, 3)
        co[before:] = base_co[before:]
        kb.data.foreach_set("co", co.ravel())
    log(f"penis and sack laid on: {len(body.data.vertices) - before} corners")

    cloth = [o for o in worn if o.name.split(".")[0].startswith(("Male_Cloth", "Male_Shoes"))]
    mw3 = np.array(body.matrix_world.to_3x3())
    Sb_nrm = np.array([mw3 @ v.normal for v in body.data.vertices])[:before]
    Sb_nrm /= np.maximum(np.linalg.norm(Sb_nrm, axis=1, keepdims=True), 1e-9)
    # What can be under each: never his head, hands or feet under clothes (a chin by the collar, fingertips by a
    # trouser leg, toes by a hem); only his feet and ankles under his shoes.
    Sb_pts = world(body)[:before]
    head_w = body_weights(body, f"{name}_Head")[:before]
    hand_w = sum(body_weights(body, f"{name}_{b}_{s}") for b in ("HandFingers", "HandTips", "HandThumb")
                 for s in ("L", "R"))[:before]
    wrists = [J["Wrist_L"], J["Wrist_R"]]
    near_wrist = np.min([np.linalg.norm(Sb_pts - w, axis=1) for w in wrists], axis=0)
    hand = (hand_w > 0.05) | ((near_wrist < 0.12) & (Sb_pts[:, 2] < min(w[2] for w in wrists) + 0.01))
    head = (head_w > 0.5) & (Sb_pts[:, 2] > J["Head"][2] + 0.02)
    ankle_z = max(J["Ankle_L"][2], J["Ankle_R"][2])
    foot = Sb_pts[:, 2] < ankle_z + 0.02
    def under(obj):
        if obj.name.split(".")[0].startswith("Male_Shoes"):
            return Sb_pts[:, 2] < ankle_z + 0.12
        return ~(head | hand | foot)
    for obj in cloth:
        if obj.data.shape_keys is None:
            close_crotch(obj, float(J["PenisRoot"][2]), swap["crotch_holes"])
    if swap["cloth_subdiv"]:
        subdivide_cloth(cloth, swap["cloth_subdiv"])
        push_cloth_out(cloth, body, before, under, swap["cloth_out"])
    if clear is not None:
        clear()
    # His penis and sack as the game packs them inside his clothes (penis.ts PACKED_PRESS): a bulge in front of his
    # groin the cloth over it has to clear as well as the skin.
    if skin_root is False:
        bc = np.array(J["PenisRoot"]) + np.array(swap["bulge"]["offset"])
        radii = np.array(swap["bulge"]["radii"])
    else:
        bc = np.array(skin_root) + np.array(swap["bulge_skin"]["offset"])
        radii = np.array(swap["bulge_skin"]["radii"])
    u, v = np.meshgrid(np.linspace(0, np.pi, 14), np.linspace(-np.pi / 2, np.pi / 2, 14))
    dirs = np.stack([np.cos(u) * np.cos(v), np.sin(u) * np.cos(v), np.sin(v)], -1).reshape(-1, 3)  # front half (+y)
    if skin_root is not False:
        # the reference's sack hangs under and behind the root too: the lower back quarter as well, so the cloth's
        # crotch passes under it
        u2, v2 = np.meshgrid(np.linspace(np.pi, 2 * np.pi, 10), np.linspace(-np.pi / 2, 0, 8))
        dirs = np.vstack([dirs, np.stack([np.cos(u2) * np.cos(v2), np.sin(u2) * np.cos(v2), np.sin(v2)], -1).reshape(-1, 3)])
    bulge_pts = bc + dirs * radii
    bulge_nrm = dirs / radii
    bulge_nrm /= np.linalg.norm(bulge_nrm, axis=1, keepdims=True)
    groin = np.zeros(len(bulge_pts), bool)
    Sb_pts = np.vstack([Sb_pts, bulge_pts])
    Sb_nrm = np.vstack([Sb_nrm, bulge_nrm])
    head, hand, foot = (np.r_[m, groin] for m in (head, hand, foot))
    cloth_maps = clear_faces(Sb_pts, Sb_nrm, mesh_tree(Sb_pts, sf.triangles(body, np.r_[np.ones(before, bool), np.zeros(len(body.data.vertices) - before, bool)])), cloth, swap, under)
    if swap["cloth_subdiv"]:
        despike_cloth(cloth, swap["despike"])
        push_cloth_out(cloth, body, before, under, swap["cloth_out"])
        puff_shoes([o for o in cloth if o.name.split(".")[0].startswith("Male_Shoes")], ankle_z, swap["shoe_puff"])

    # --- his physique keys carried onto everything worn
    kb = body.data.shape_keys.key_blocks
    Sb = world(body)[:before]
    btris = sf.triangles(body, np.r_[np.ones(before, bool), np.zeros(len(body.data.vertices) - before, bool)])
    mw = np.array(body.matrix_world)
    key_pos = {}
    for k in kb[1:]:
        co = np.zeros(len(body.data.vertices) * 3)
        k.data.foreach_get("co", co)
        key_pos[k.name] = (co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3])[:before]
    total = 0
    for obj in worn:
        X = world(obj)
        bind = Binding(Sb, btris, X, swap)
        inv = np.linalg.inv(np.array(obj.matrix_world))
        if obj.data.shape_keys is None:
            obj.shape_key_add(name="Basis")
        cmap = cloth_maps.get(obj.name)
        for kname, Sk in key_pos.items():
            Y = bind.apply(Sk)
            if cmap is not None:
                # how far the key moves each skin point out (the penis bulge points don't move)
                out = np.zeros(len(Sb_pts))
                out[:before] = np.einsum("nd,nd->n", Sk - Sb, Sb_nrm[:before])
                Y = clear_key(Y, X, cmap, out, swap["clear_faces"])
            if np.abs(Y - X).max() < swap["key_least"]:
                continue
            key = obj.shape_key_add(name=kname, from_mix=False)
            key.data.foreach_set("co", (Y @ inv[:3, :3].T + inv[:3, 3]).ravel())
            key.value = 0.0
            total += 1
        if len(obj.data.shape_keys.key_blocks) == 1:
            obj.shape_key_clear()
    log(f"physique keys carried onto worn meshes: {total}")
    return J
