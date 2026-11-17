"""
real_heroin into the game: her own meshes (build_body.py's Body_game, build_head.py's Head_game and eyes) become the
Female's skin, standing in her own posture, on the game's rig.

The old ring-built body (Female_Body as build_world makes it) stays the carrier of everything the game was built
round it: the 16 outfits, shoes, hair, cum layers, jewellery, and the patches and grids joined into it (lingerie,
pubic hair, areolae, vulva, canal, anus). Its skin is fitted onto hers, everything rides along on it, and then its
skin is swapped for hers.

1. Her meshes are loaded (built into a cache when missing or older than their sources).
2. Target joints: hers (tools/blender/heroine/sdf.py's skeleton), with her limbs turned to the game rig's rest
   angles (the game's poses are rotations from that rest), so her arms come down from the references' A-pose.
3. Her mesh is posed so: each limb segment turned about its joint, blended across the joints.
4. The old skin (body, neck, head) is carried over to her posture bone by bone (trunk shifted forward by height,
   limb segments turned onto hers), then pushed along its normals onto her surface. Corners left out (hands, the
   grids the game shapes) get a smooth fill; everything else rides on it (sculpt_fit.Rider).
5. The game bones move with it; her hands get finger bones from her own finger joints.
6. Her mesh takes the carrier's bone weights and its painted materials (smallclothes, breast band, the skin under
   her openings, the navel) from the nearest spot of the fitted carrier skin; then the old skin is deleted and
   hers joined into Female_Body.
"""
import math
import os
import subprocess
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "heroine"))
sys.path.insert(0, HERE)
import sdf  # noqa: E402
import sculpt_fit as sf  # noqa: E402

SWAP = {
    "reach": 0.06,           # how far along its normal an old skin corner looks for her surface
    "facing": 0.2,           # the surface hit must face the same way as the corner (not the far side of a limb)
    "most": 0.06,
    "outlier": 0.010,
    "outlier_passes": 3,
    "smooth": 8,
    "normal_passes": 6,
    "fill_passes": 400,
    "wrist": (0.80, 0.97),   # the old hands are not fitted (hers differ): faded out along the forearm
    "limb_from": (-0.05, 0.25),
    "bind": (0.02, 0.05),
    "carry_k": 8,
    "keep": ("T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin", "T_hole", "T_navel"),
    "grid_fade": (0.012, 0.04),
    # Old islands kept (they ride onto her): the game's patches and grids. Everything else of the old skin goes.
    "keep_islands": ("T_lingerie", "T_pubic", "T_areola", "T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin"),
    # Her faces take these of the carrier's materials from under them; anything else is her plain skin.
    "paint": ("T_smalls", "T_bra", "T_hole", "T_navel"),
    # Her pose blends: a limb's first segment from the trunk over these shares of its length; the next segment
    # from its parent over +-this share either side of the joint.
    "root_blend": (-0.06, 0.22),
    "joint_blend": 0.12,
    "pose_smooth": 12,       # passes smoothing each corner's share of a limb's turn over her skin
    # the grids the game shapes, seated on her skin group by group; corners nearer the old skin than this lay on it
    "grids": ("T_vulva", "T_labia", "T_canal", "T_anus", "T_anus_skin"),
    "grid_groups": (("T_vulva", "T_labia", "T_canal"), ("T_anus", "T_anus_skin")),
    "cut_reach": 0.025,      # her skin faces within this of a grid, and over it (not past its edge), are cut away
    "cut_edge": 0.001,       # (a nearest spot this near the grid's edge counts as past it)
    "cut_fill": 40,          # pieces of her skin smaller than this left enclosed by the cut go too
    "cap_smooth": 6,         # passes smoothing the cap inside its edge
    "weld": 0.0002,          # the cap's copy of a grid welded shut (its slit) within this
    "cover": ("T_vulva", "T_labia", "T_anus", "T_anus_skin"),   # what covers her skin (not the canal)
    "cover_reach": 0.008,
    "hole_margin": 0.004,    # her skin is only hidden this far inside a grid's edge
    "head_scale": 1.0,       # the game's head scaled to the size of hers, then by this
    "head_shift": (0.0, 0.0, 0.0),   # and moved by this from her head's place (metres)
    "neck_rings": 7,         # rings her neck runs on into the game's head with
}

ANUS_LAST = 12      # build_world's anus disc: its rings numbered 0 (canal bottom) .. 12 (edge) in UV u (x 12)
ANUS_RIM_RING = 4   # the rim, where the canal opens onto the disc (ANUS_CANAL + 1)
HEAD_FROM = 1.49   # the game's head: its pieces above this (face, ears, brows, teeth, tongue, lines); hers above it
NECK_Z = 1.47      # where build_body.py's body ends and build_head.py's head begins (the open 24-corner ring)

SOURCES = ["heroine/sdf.py", "heroine/body_mesh.py", "heroine/nails.py","heroine/head_mesh.py", "heroine/head_form.py",
           "heroine/head_table.json", "build_body.py", "build_head.py"]


# ---------------------------------------------------------------------------------------------------- her meshes
def load_meshes(cache):
    """Her game meshes (world transforms applied), built into the cache folder when missing or stale."""
    os.makedirs(cache, exist_ok=True)
    newest = max(os.path.getmtime(os.path.join(HERE, s)) for s in SOURCES if os.path.exists(os.path.join(HERE, s)))
    for blend, script in (("body.blend", "build_body.py"), ("head.blend", "build_head.py")):
        path = os.path.join(cache, blend)
        if not os.path.exists(path) or os.path.getmtime(path) < newest:
            print(f"real_heroin: building {blend} ...", flush=True)
            subprocess.run([bpy.app.binary_path, "-b", "--factory-startup", "--python", os.path.join(HERE, script),
                            "--", cache], check=True, stdout=subprocess.DEVNULL)
    got = {}
    for blend, names in (("body.blend", ["Body_game"]), ("head.blend", ["Head_game", "Eye.L", "Eye.R"])):
        with bpy.data.libraries.load(os.path.join(cache, blend)) as (src, dst):
            dst.objects = names
        for o in dst.objects:
            bpy.context.scene.collection.objects.link(o)
            o.data = o.data.copy()
            o.data.transform(o.matrix_basis)       # (matrix_world isn't evaluated yet on a freshly linked object)
            o.matrix_basis.identity()
            got[o.name.split(".")[0] if not o.name.startswith("Eye") else o.name[:5]] = o
    return got


# ---------------------------------------------------------------------------------------------------- joints
def her_joints():
    J = sdf.skeleton()
    mirror = np.array([-1.0, 1.0, 1.0])
    out = {}
    for side, m in (("R", np.ones(3)), ("L", mirror)):
        fingers, thumb = sdf.finger_chains(J)
        out[side] = dict(shoulder=J["shoulder"] * m, elbow=J["elbow"] * m, wrist=J["wrist"] * m,
                         hip=J["hip"] * m, knee=J["knee"] * m, ankle=J["ankle"] * m,
                         fingers=[[p * m for p in ch] for ch in fingers], thumb=[p * m for p in thumb])
    out["spine"] = [J["crotch"], J["pelvis"], J["spine3"], J["neck"], J["head"], J["head"] + np.array([0, 0, 0.16])]
    return out


def target_joints(her, game):
    """Her joints, each limb turned at its root to the game rig's rest direction (her own lengths kept)."""
    out = {}
    for side in ("L", "R"):
        h, g = her[side], game[side]
        u = lambda a, b: (b - a) / np.linalg.norm(b - a)
        t = dict(shoulder=h["shoulder"], hip=h["hip"])
        t["elbow"] = t["shoulder"] + np.linalg.norm(h["elbow"] - h["shoulder"]) * u(g["shoulder"], g["elbow"])
        t["wrist"] = t["elbow"] + np.linalg.norm(h["wrist"] - h["elbow"]) * u(g["elbow"], g["wrist"])
        t["knee"] = t["hip"] + np.linalg.norm(h["knee"] - h["hip"]) * u(g["hip"], g["knee"])
        t["ankle"] = t["knee"] + np.linalg.norm(h["ankle"] - h["knee"]) * u(g["knee"], g["ankle"])
        out[side] = t
    return out


class Turn:
    """A rigid turn of a segment a -> b onto A -> B (same length): p -> A + R (p - a)."""

    def __init__(self, a, b, A, B):
        self.a, self.A = np.asarray(a, float), np.asarray(A, float)
        self.R = sf._rot_between(np.asarray(b) - self.a, np.asarray(B) - self.A)

    def __call__(self, P):
        return self.A + (P - self.a) @ self.R.T


def _seg_param(P, a, b):
    d = b - a
    t = ((P - a) @ d) / (d @ d)
    q = a + np.clip(t, 0, 1)[:, None] * d
    return t, np.linalg.norm(P - q, axis=1)


def _axis_angle(a, b):
    """The axis and angle turning direction a onto b."""
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    ax = np.cross(a, b)
    s = np.linalg.norm(ax)
    if s < 1e-9:
        return np.array([1.0, 0.0, 0.0]), 0.0
    return ax / s, math.atan2(s, float(a @ b))


def _rotate(P, pivot, axis, angles):
    """Each point turned about the axis through pivot by its own angle (Rodrigues)."""
    v = P - pivot
    c, s = np.cos(angles)[:, None], np.sin(angles)[:, None]
    return pivot + v * c + np.cross(axis, v) * s + axis * (v @ axis)[:, None] * (1 - c)


def pose_her(P, her, tgt, swap, edges):
    """
    Her mesh's corners turned into the target posture. Each limb turns about its root joint by a share of the whole
    turn that rises from 0 at the root to 1 a little way down the limb (so the chest, breasts and hips beside it do
    not move), and the lower limb about its joint likewise. The shares are smoothed over her skin, so nothing shears.
    """
    r0, r1 = swap["root_blend"]
    jb = swap["joint_blend"]
    sm = sf._smooth
    spine = her["spine"]
    dist = {"spine": np.min([_seg_param(P, spine[i], spine[i + 1])[1] for i in range(len(spine) - 1)], axis=0)}
    for side in ("L", "R"):
        h = her[side]
        hand_end = h["wrist"] + (h["wrist"] - h["elbow"]) / np.linalg.norm(h["wrist"] - h["elbow"]) * 0.2
        toe = h["ankle"] + np.array([0, 0.2, -h["ankle"][2]])
        dist["arm" + side] = np.min([_seg_param(P, a, b)[1] for a, b in
                                     ((h["shoulder"], h["elbow"]), (h["elbow"], h["wrist"]), (h["wrist"], hand_end))], axis=0)
        dist["leg" + side] = np.min([_seg_param(P, a, b)[1] for a, b in
                                     ((h["hip"], h["knee"]), (h["knee"], h["ankle"]), (h["ankle"], toe))], axis=0)
    names = list(dist)
    nearest = np.array(names)[np.argmin(np.stack([dist[k] for k in names]), axis=0)]
    every = np.ones(len(P), bool)
    out = P.copy()
    for side in ("L", "R"):
        h, t = her[side], tgt[side]
        for limb, (j0, j1, j2) in (("arm", ("shoulder", "elbow", "wrist")), ("leg", ("hip", "knee", "ankle"))):
            on = nearest == limb + side
            s1, _ = _seg_param(P, h[j0], h[j1])
            s2, _ = _seg_param(P, h[j1], h[j2])
            L1, L2 = np.linalg.norm(h[j1] - h[j0]), np.linalg.norm(h[j2] - h[j1])
            a = np.where(on, sm((s1 - r0) / (r1 - r0)), 0.0)
            along = np.where(s2 > 0, s2 * L2, (s1 - 1) * L1)
            b = np.where(on, sm((along / (L1 + L2) * 2 + jb) / (2 * jb)), 0.0)
            for _ in range(swap["pose_smooth"]):
                a = 0.5 * a + 0.5 * sf.neighbour_mean(a[:, None], edges, every)[:, 0]
                b = 0.5 * b + 0.5 * sf.neighbour_mean(b[:, None], edges, every)[:, 0]
            move = (a > 1e-4) | (b > 1e-4)
            if not move.any():
                continue
            ax1, th1 = _axis_angle(h[j1] - h[j0], t[j1] - t[j0])
            Q = _rotate(P[move], h[j0], ax1, a[move] * th1)
            # the lower limb: where the turned upper limb leaves it, on to its own target
            j1_now = _rotate(h[j1][None], h[j0], ax1, np.array([th1]))[0]
            j2_now = _rotate(h[j2][None], h[j0], ax1, np.array([th1]))[0]
            ax2, th2 = _axis_angle(j2_now - j1_now, t[j2] - t[j1])
            Q = _rotate(Q, j1_now, ax2, b[move] * th2)
            out[move] = Q
    return out


# ---------------------------------------------------------------------------------------------------- fitting
def mesh_tree(P, tris):
    return BVHTree.FromPolygons([Vector(p) for p in P], [tuple(int(i) for i in t) for t in tris])


def project_onto(tree, Q, N, reach, facing):
    """Offset along N to the surface (nearest hit either way, facing the same way), nan where none."""
    out = np.full(len(Q), np.nan)
    for i, (q, n) in enumerate(zip(Q, N)):
        best = None
        for sgn in (1.0, -1.0):
            d = Vector(n * sgn)
            hit = tree.ray_cast(Vector(q), d, reach)
            if hit[0] is not None and hit[1].dot(Vector(n)) > facing:
                t = hit[3] * sgn
                if best is None or abs(t) < abs(best):
                    best = t
        if best is not None:
            out[i] = best
    return out


def midline_offset(tree, P, edges, zs):
    """How far forward her trunk's middle (front to back at x = 0) stands of the old skin's, by height."""
    A, B = P[edges[:, 0]], P[edges[:, 1]]
    off = []
    for z in zs:
        c = (A[:, 2] - z) * (B[:, 2] - z) < 0
        t = (z - A[c, 2]) / (B[c, 2] - A[c, 2])
        g = A[c] + (B[c] - A[c]) * t[:, None]
        g = g[np.abs(g[:, 0]) < 0.02]
        f = tree.ray_cast(Vector((0, 1.0, z)), Vector((0, -1, 0)), 2.0)
        b = tree.ray_cast(Vector((0, -1.0, z)), Vector((0, 1, 0)), 2.0)
        if len(g) < 2 or f[0] is None or b[0] is None or g[:, 1].max() < 0 or g[:, 1].min() > 0:
            off.append(np.nan)
            continue
        off.append((f[0].y + b[0].y) / 2 - (g[:, 1].max() + g[:, 1].min()) / 2)
    off = np.array(off)
    ok = ~np.isnan(off)
    off = np.interp(zs, zs[ok], off[ok])
    k = 4
    pad = np.concatenate([np.full(k, off[0]), off, np.full(k, off[-1])])
    off = np.convolve(pad, np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]
    return lambda z: np.interp(z, zs, off)


def bone_weights(obj, name):
    """(n, groups) weights and the group names (without the character's prefix)."""
    names = [g.name for g in obj.vertex_groups]
    W = np.zeros((len(obj.data.vertices), len(names)))
    for i, v in enumerate(obj.data.vertices):
        for g in v.groups:
            W[i, g.group] = g.weight
    return W, names


# ---------------------------------------------------------------------------------------------------- the grids
def _bm_islands(faces):
    """Connected groups of the given faces (sharing edges)."""
    left = set(faces)
    out = []
    while left:
        f0 = left.pop()
        stack, group = [f0], [f0]
        while stack:
            f = stack.pop()
            for e in f.edges:
                for g in e.link_faces:
                    if g in left:
                        left.remove(g)
                        stack.append(g)
                        group.append(g)
        out.append(group)
    return out


def _boundary_loops(faces):
    """The closed loops of edges the faces have on one side only, each as an ordered list of verts."""
    fs = set(faces)
    edges = list({e for f in faces for e in f.edges if sum(g in fs for g in e.link_faces) == 1})
    nxt = {}
    for e in edges:
        a, b = e.verts
        nxt.setdefault(a, []).append(b)
        nxt.setdefault(b, []).append(a)
    loops, seen = [], set()
    for start in nxt:
        if start in seen:
            continue
        loop, prev, cur = [start], None, start
        seen.add(start)
        while True:
            cands = [v for v in nxt[cur] if v is not prev and v not in seen]
            if not cands:
                break
            prev, cur = cur, cands[0]
            seen.add(cur)
            loop.append(cur)
        loops.append(loop)
    return loops


def _loop_length(loop):
    return sum((loop[i].co - loop[(i + 1) % len(loop)].co).length for i in range(len(loop)))


def _ring_params(ring):
    """Cumulative shares of length round a closed loop, and a function giving any point's share at its nearest spot."""
    pts = [v.co.copy() for v in ring]
    seg = [(pts[k], pts[(k + 1) % len(pts)]) for k in range(len(pts))]
    lens = [(b - a).length for a, b in seg]
    total = sum(lens)
    cum = [0.0]
    for L in lens:
        cum.append(cum[-1] + L)

    def at(p):
        best = None
        for k, (a, b) in enumerate(seg):
            ab = b - a
            t = 0.0 if ab.length_squared < 1e-14 else max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
            d = (a + ab * t - p).length
            if best is None or d < best[0]:
                best = (d, (cum[k] + t * lens[k]) / total)
        return best[1]
    return [c / total for c in cum[:-1]], at


def _zipper(bm, A, B, tb, at, mat, toward):
    """
    Triangles joining loop A (her cut edge) to loop B (the grid's edge, its shares round itself tb), each corner of
    A placed by its nearest spot on B (`at`), so the two are walked together in step; each triangle faces away from
    `toward` (a point inside her).
    """
    ta = [at(v.co) for v in A]
    # A the same way round as B: its shares mostly rising
    rise = sum(((ta[(i + 1) % len(ta)] - ta[i] + 0.5) % 1.0) - 0.5 for i in range(len(ta)))
    if rise < 0:
        A, ta = A[::-1], ta[::-1]
    i0 = min(range(len(A)), key=lambda i: ta[i])
    A, ta = A[i0:] + A[:i0], ta[i0:] + ta[:i0]
    base = ta[0]
    fa = [(t - base) % 1.0 for t in ta]
    for i in range(1, len(fa)):                # never going back
        fa[i] = max(fa[i], fa[i - 1])
    fb_all = [(t - base) % 1.0 for t in tb]
    j0 = min(range(len(B)), key=lambda j: fb_all[j])
    B, fb = B[j0:] + B[:j0], fb_all[j0:] + fb_all[:j0]
    fa.append(1.0)
    fb.append(1.0)
    i = j = 0
    made = []
    while i < len(A) or j < len(B):
        a0, b0 = A[i % len(A)], B[j % len(B)]
        if j >= len(B) or (i < len(A) and fa[i + 1] <= fb[j + 1]):
            tri = (a0, A[(i + 1) % len(A)], b0)
            i += 1
        else:
            tri = (a0, B[(j + 1) % len(B)], b0)
            j += 1
        if len(set(tri)) < 3:
            continue
        try:
            f = bm.faces.new(tri)
        except ValueError:
            continue
        f.material_index = mat
        f.smooth = True
        f.normal_update()
        c = (tri[0].co + tri[1].co + tri[2].co) / 3
        if f.normal.dot(c - toward) < 0:
            f.normal_flip()
        made.append(f)
    return made


def stitch_grids(body, swap, log):
    """
    The game's vulva and anus grids built into her skin instead of lying over it. For each: its outer edge goes onto
    her skin (the rest of it following smoothly, so it keeps its own shape and the game's UV layout); her skin under
    it is cut away; a strip of her own skin joins her cut edge to a copy of the grid's edge; and a closed cap of the
    skin under her openings (T_hole) fills that edge for when the grid isn't shown. Grid and cap share the edge, so
    either way she is one surface. (The game finds the grids' corners by their UVs, so nothing else may wear their
    materials: the strip is her own skin.)
    """
    from mathutils.bvhtree import BVHTree
    me = body.data
    names = [m.name if m else "" for m in me.materials]
    if "T_hole" not in names:
        me.materials.append(bpy.data.materials["T_hole"])
        names.append("T_hole")
    idx = {n: i for i, n in enumerate(names)}
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    groups = _bm_islands(list(bm.faces))
    skin_mats = {idx[n] for n in ("T_skin_f", "T_smalls", "T_bra", "T_hole", "T_navel") if n in idx}
    her = max((g for g in groups if sum(f.material_index in skin_mats for f in g) > 0.9 * len(g)), key=len)
    done = []
    for label, mats, canal_mats in (("vulva", ("T_labia", "T_vulva"), ("T_canal",)),
                                    ("anus", ("T_anus_skin", "T_anus"), ())):
        ids = {idx[n] for n in mats if n in idx}
        grid = [g for g in groups if g[0].material_index in ids and all(f.is_valid for f in g)]
        if not grid:
            continue
        gfaces = [f for g in grid for f in g]
        gverts = list({v for f in gfaces for v in f.verts})
        cids = {idx[n] for n in canal_mats if n in idx}
        canal = [f for g in groups if g[0].material_index in cids for f in g]
        cverts = list({v for f in canal for v in f.verts} - set(gverts))
        ring = max(_boundary_loops(gfaces), key=_loop_length)
        ringset = set(ring)

        # her skin as it is now
        verts_l, polys = [], []
        for f in her:
            k = len(verts_l)
            verts_l += [v.co.copy() for v in f.verts]
            polys.append(tuple(range(k, k + len(f.verts))))
        tree = BVHTree.FromPolygons(verts_l, polys)
        # the grid's edge onto her skin; the rest of it (and its canal) follows smoothly
        known = {}
        for v in ring:
            loc = tree.find_nearest(v.co)[0]
            known[v] = (loc - v.co) if loc is not None else Vector()
        inner = [v for v in gverts if v not in ringset]
        for _ in range(swap["fill_passes"]):
            new_known = {}
            for v in inner:
                ns = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in known]
                if ns:
                    new_known[v] = sum((known[u] for u in ns), Vector()) / len(ns)
            if not new_known:
                break
            known.update(new_known)
        for v in gverts:
            v.co += known.get(v, Vector())
        for v in cverts:
            near = sorted(gverts, key=lambda u: (u.co - v.co).length)[:6]
            w = [1.0 / max((u.co - v.co).length, 1e-4) ** 2 for u in near]
            v.co += sum((known.get(u, Vector()) * wi for u, wi in zip(near, w)), Vector()) / sum(w)
        centre = sum((v.co for v in ring), Vector()) / len(ring)
        out_n = sum((f.normal for f in gfaces), Vector()).normalized()

        # her skin under it cut away, as one solid piece: the faces whose nearest spot on the grid lies inside its
        # edge (not on it) and near, grown out from the one nearest the grid's middle, with any gaps filled in
        gidx = {v: k for k, v in enumerate(gverts)}
        gtree = BVHTree.FromPolygons([v.co.copy() for v in gverts], [tuple(gidx[v] for v in f.verts) for f in gfaces])
        edge_pts = [v.co.copy() for v in ring]

        def edge_dist(p):
            best = 1e9
            for k in range(len(edge_pts)):
                a_, b_ = edge_pts[k], edge_pts[(k + 1) % len(edge_pts)]
                ab = b_ - a_
                t = 0.0 if ab.length_squared < 1e-14 else max(0.0, min(1.0, (p - a_).dot(ab) / ab.length_squared))
                best = min(best, (a_ + ab * t - p).length)
            return best
        inside = set()
        for f in her:
            c = f.calc_center_median()
            q, _, _, d = gtree.find_nearest(c, swap["cut_reach"])
            if q is not None and edge_dist(q) > swap["cut_edge"]:
                inside.add(f)
        cut = set()
        if inside:
            seed = min(inside, key=lambda f: (f.calc_center_median() - centre).length)
            stack, cut = [seed], {seed}
            while stack:
                f = stack.pop()
                for e in f.edges:
                    for g in e.link_faces:
                        if g in inside and g not in cut:
                            cut.add(g)
                            stack.append(g)
            # gaps: small pieces of her skin left enclosed by the cut
            rest = [f for f in her if f not in cut]
            for piece in _bm_islands(rest):
                if len(piece) < swap["cut_fill"]:
                    cut.update(piece)
        her = [f for f in her if f not in cut]
        bmesh.ops.delete(bm, geom=list(cut), context="FACES_ONLY")
        bmesh.ops.delete(bm, geom=[e for e in bm.edges if not e.link_faces], context="EDGES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        her = [f for f in her if f.is_valid]

        # the cap of skin under the opening: a copy of the grid's outer parts, welded shut, in T_hole
        cap_src = gfaces
        if label == "anus":   # only the disc (rings from the rim out), not the canal going down into her
            uvl = bm.loops.layers.uv.active
            cap_src = [f for f in gfaces if all(l[uvl].uv.x * ANUS_LAST >= ANUS_RIM_RING - 0.5 for l in f.loops)]
        dup = bmesh.ops.duplicate(bm, geom=cap_src)
        vmap = dup["vert_map"]
        cap_faces = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMFace)]
        cap_verts = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMVert)]
        for f in cap_faces:
            f.material_index = idx["T_hole"]
        cap_ring = [vmap[v] for v in ring if v in vmap]
        keep = set(cap_ring)
        bmesh.ops.remove_doubles(bm, verts=[v for v in cap_verts if v not in keep] + cap_ring, dist=swap["weld"])
        cap_ring = [v for v in cap_ring if v.is_valid]
        cap_faces = [f for f in cap_faces if f.is_valid]
        for lp in _boundary_loops(cap_faces):     # any hole left in it (the anus's rim) closed
            if len(lp) >= 3 and _loop_length(lp) < 0.5 * _loop_length(cap_ring):
                try:
                    f = bm.faces.new(lp)
                    f.material_index = idx["T_hole"]
                    bmesh.ops.triangulate(bm, faces=[f])
                except ValueError:
                    pass
        # her cut edge joined to the cap's edge (where the grid's edge lies) by her own skin
        her_loops = [lp for lp in _boundary_loops(her) if len(lp) > 2]
        her_ring = min(her_loops, key=lambda lp: (sum((v.co for v in lp), Vector()) / len(lp) - centre).length)
        log(f"  {label}: grid edge {len(cap_ring)} corners {_loop_length(cap_ring) * 1000:.0f} mm; her cut edge "
            f"{len(her_ring)} corners {_loop_length(her_ring) * 1000:.0f} mm; her loops near: "
            f"{sorted((len(lp), round((sum((v.co for v in lp), Vector()) / len(lp) - centre).length * 1000)) for lp in her_loops)[:6]}")
        mat = her_ring[0].link_faces[0].material_index if her_ring[0].link_faces else idx["T_skin_f"]
        # her cut edge laid onto the grid's edge (each corner to its nearest spot on it), so the strip joining
        # them lies flat in the seam and her skin meets the grid edge to edge; the corners next in from it eased
        # along half as far so the faces between don't pinch
        ring_pts = [v.co.copy() for v in cap_ring]

        def onto_ring(p):
            best = None
            for k in range(len(ring_pts)):
                a, b = ring_pts[k], ring_pts[(k + 1) % len(ring_pts)]
                ab = b - a
                t = 0.0 if ab.length_squared < 1e-14 else max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
                q = a + ab * t
                if best is None or (q - p).length < (best - p).length:
                    best = q
            return best
        moves = {v: onto_ring(v.co) - v.co for v in her_ring}
        nexts = {}
        for v, m in moves.items():
            for e in v.link_edges:
                u = e.other_vert(v)
                if u not in moves:
                    nexts.setdefault(u, []).append(m)
        for v, m in moves.items():
            v.co += m
        for u, ms in nexts.items():
            u.co += sum(ms, Vector()) / len(ms) * 0.5
        tb, at = _ring_params(cap_ring)
        strip = _zipper(bm, her_ring, cap_ring, tb, at, mat, centre - out_n * 0.05)
        # the cap smoothed inside its edge (the welded slit leaves a kink)
        cap_v = list({v for f in cap_faces if f.is_valid for v in f.verts} - set(cap_ring))
        for _ in range(swap["cap_smooth"]):
            for v in cap_v:
                ns = [e.other_vert(v) for e in v.link_edges]
                if ns:
                    v.co = v.co * 0.5 + sum((u.co for u in ns), Vector()) / len(ns) * 0.5
        done.append(f"{label}: cut {len(cut)} faces, strip {len(strip)}, cap {len(cap_faces)}")
    bm.to_mesh(me)
    bm.free()
    me.update()
    log("real_heroin: grids built into her skin: " + "; ".join(done))


# ---------------------------------------------------------------------------------------------------- the swap
def swap_in(rig, body, meshes, mats, cache, name="Female", swap=None, log=print):
    swap = dict(SWAP, **(swap or {}))
    her_obj = load_meshes(cache)
    her = her_joints()
    mw = body.matrix_world
    verts = body.data.vertices
    n = len(verts)
    P = np.array([mw @ v.co for v in verts])
    edges = np.array([e.vertices[:] for e in body.data.edges])
    game = sf.rig_points(rig, P, name)
    tgt = target_joints(her, game)

    # --- her body (neck down), posed. Her head is only measured: the game keeps its own head (the face its
    # expressions are drawn on), scaled to hers and set where hers is.
    skin = her_obj["Body_game"]
    HH = np.array([tuple(v.co) for v in her_obj["Head_game"].data.vertices])
    her_head = HH[HH[:, 2] > HEAD_FROM]
    for key in ("Head_game", "Eye.L", "Eye.R"):
        bpy.data.objects.remove(her_obj[key], do_unlink=True)
    HP = np.array([v.co for v in skin.data.vertices])
    hedges = np.array([e.vertices[:] for e in skin.data.edges])
    HP2 = pose_her(HP, her, tgt, swap, hedges)
    skin.data.vertices.foreach_set("co", HP2.ravel())
    skin.data.update()
    her_tris = sf.triangles(skin, np.ones(len(HP2), bool))
    tree = mesh_tree(HP2, her_tris)
    log(f"real_heroin: {len(HP2)} corners, {len(her_tris)} triangles; arms turned "
        f"{math.degrees(math.acos(np.clip(np.dot(sf.Segment(her['R']['shoulder'], her['R']['elbow'], tgt['R']['shoulder'], tgt['R']['elbow']).u, (tgt['R']['elbow'] - tgt['R']['shoulder']) / np.linalg.norm(tgt['R']['elbow'] - tgt['R']['shoulder'])), -1, 1))):.0f} deg")

    # --- the old skin carried over to her posture, then onto her surface
    island = sf.islands(n, edges)
    names_m = [m.name if m else "" for m in body.data.materials]
    face_mat = np.array([p.material_index for p in body.data.polygons])
    isl_mats = {}
    for poly in body.data.polygons:
        isl_mats.setdefault(island[poly.vertices[0]], set()).add(names_m[poly.material_index])
    keep_isl = {k for k, ms in isl_mats.items() if ms & set(swap["keep_islands"])}
    lowest = {k: P[island == k, 2].min() for k in isl_mats}
    head_isl = {k for k in isl_mats if k not in keep_isl and lowest[k] > HEAD_FROM}
    fitted_isl = {k for k in isl_mats if k not in keep_isl and k not in head_isl}
    carrier = np.isin(island, list(fitted_isl))
    head = np.isin(island, list(head_isl))

    # The game's head, scaled as a whole (so it keeps its look) to the size of hers and centred where hers is.
    OH = P[head]
    size_old = np.ptp(OH, axis=0)
    size_her = np.ptp(her_head, axis=0)
    k_head = float(np.mean(size_her / size_old)) * swap["head_scale"]
    c_old = (OH.min(0) + OH.max(0)) / 2
    c_her = (her_head.min(0) + her_head.max(0)) / 2 + np.array(swap["head_shift"])
    c_old[0] = c_her[0] = 0.0
    S = lambda X: c_her + (X - c_old) * k_head
    log(f"real_heroin: game head {np.round(size_old * 1000).astype(int)} mm, hers {np.round(size_her * 1000).astype(int)} mm "
        f"(w, d, h): scaled x{k_head:.3f}, centre moved {np.round((c_her - c_old) * 1000).astype(int)} mm")
    main = island == np.bincount(island).argmax()

    rot3 = np.array(mw.to_3x3())
    Nrm = np.array([rot3 @ v.normal for v in verts])
    Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-9)
    every = np.ones(n, bool)
    for _ in range(swap["normal_passes"]):
        Nrm = 0.5 * Nrm + 0.5 * sf.neighbour_mean(Nrm, edges, every)
        Nrm /= np.maximum(np.linalg.norm(Nrm, axis=1, keepdims=True), 1e-9)

    off = midline_offset(tree, P, edges, np.arange(0.95, 1.441, 0.01))
    lift = lambda p: p + np.array([0.0, float(off(p[2])), 0.0])
    seg = {}
    for side in ("L", "R"):
        g, t = game[side], tgt[side]
        seg[("upper", side)] = sf.Segment(g["shoulder"], g["elbow"], t["shoulder"], t["elbow"])
        seg[("fore", side)] = sf.Segment(g["elbow"], g["wrist"], t["elbow"], t["wrist"])
        seg[("thigh", side)] = sf.Segment(g["hip"], g["knee"], lift(g["hip"]), t["knee"])
        seg[("shin", side)] = sf.Segment(g["knee"], g["ankle"], t["knee"], t["ankle"])
    keys = list(seg)
    gname = {gr.index: gr.name[len(name) + 1:] for gr in body.vertex_groups}
    W = np.zeros((n, len(keys) + 1))
    for i, v in enumerate(verts):
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
    T = P.copy()
    T[:, 1] += off(P[:, 2])
    Q = T * W[:, -1:]
    NQ = Nrm * W[:, -1:]
    for k, key in enumerate(keys):
        w = W[:, k:k + 1]
        if w.any():
            Q = Q + seg[key].to_sculpt(P) * w
            NQ = NQ + seg[key].dirs_to_sculpt(Nrm) * w
    NQ /= np.maximum(np.linalg.norm(NQ, axis=1, keepdims=True), 1e-9)

    wfit = carrier.astype(float)
    for side, sx in (("L", -1), ("R", 1)):
        g = game[side]
        d = g["wrist"] - g["elbow"]
        tt = ((P - g["elbow"]) @ d) / (d @ d)
        a, b = swap["wrist"]
        wfit = np.where(P[:, 0] * sx > 0.12, wfit * (1.0 - sf._smooth((tt - a) / (b - a))), wfit)
    kept = np.zeros(n, bool)
    keep_m = {i for i, nm in enumerate(names_m) if nm in swap["keep"]}
    for poly in body.data.polygons:
        if poly.material_index in keep_m:
            kept[list(poly.vertices)] = True
    if kept.any():
        from mathutils import kdtree
        src = np.nonzero(kept)[0]
        kd = kdtree.KDTree(len(src))
        for j, i in enumerate(src):
            kd.insert(Vector(P[i]), j)
        kd.balance()
        near = np.array([kd.find(Vector(p))[2] for p in P])
        a, b = swap["grid_fade"]
        wfit *= sf._smooth((near - a) / (b - a))

    todo = np.nonzero(wfit > 1e-3)[0]
    tt = project_onto(tree, Q[todo], NQ[todo], swap["reach"], swap["facing"])
    ok = ~np.isnan(tt)
    found = np.zeros(n, bool)
    found[todo[ok]] = True
    D = np.zeros((n, 3))
    D[todo[ok]] = NQ[todo[ok]] * tt[ok, None]
    D *= np.minimum(1.0, swap["most"] / np.maximum(np.linalg.norm(D, axis=1), 1e-9))[:, None]
    aimed = found.sum()
    for _ in range(swap["outlier_passes"]):
        mean = sf.neighbour_mean(D, edges, found)
        found &= ~(np.linalg.norm(D - mean, axis=1) > swap["outlier"])
    length = np.linalg.norm(P[edges[:, 0]] - P[edges[:, 1]], axis=1)
    close = 1.0 / np.maximum(length, 1e-3) ** 2
    for _ in range(swap["smooth"]):
        D = np.where(found[:, None], 0.5 * D + 0.5 * sf.neighbour_mean(D, edges, found, close), D)
    wfit[~found] = 0.0
    fixed = found & (wfit > 0.999)
    # the move is (Q + D) - P: carried to her posture, then onto her surface; filled smoothly where not fitted
    move_fit = Q + D - P
    fill = sf.harmonic_fill(move_fit, edges, fixed, carrier, swap["fill_passes"])
    move = move_fit * wfit[:, None] + fill * (1.0 - wfit[:, None])
    move[head] = S(P[head]) - P[head]
    # islands of the carrier no fitted corner reaches (fingers, brows, teeth...) move as their posture carries them
    unreached = carrier & ~fixed & (np.linalg.norm(fill, axis=1) == 0)
    move[unreached] = (Q - P)[unreached]
    new = P + move
    log(f"real_heroin: old skin {carrier.sum()} corners, {len(todo)} aimed, {aimed} hit her surface, "
        f"{fixed.sum()} fitted; moved mean {np.linalg.norm(move[carrier], axis=1).mean() * 1000:.1f} mm")

    # --- everything else rides on the carrier skin
    ride = sf.Rider(P, new, sf.triangles(body, carrier | head), swap)
    others = np.nonzero(~carrier & ~head)[0]
    if len(others):
        new[others] = ride(P[others])

    inv = np.array(mw.inverted())
    body.data.vertices.foreach_set("co", (new @ inv[:3, :3].T + inv[:3, 3]).ravel())
    body.data.update()
    for obj in meshes:
        if obj is body or obj.type != "MESH" or not len(obj.data.vertices) or obj is skin:
            continue
        ow = np.array(obj.matrix_world)
        L = np.zeros(len(obj.data.vertices) * 3)
        obj.data.vertices.foreach_get("co", L)
        Wp = L.reshape(-1, 3) @ ow[:3, :3].T + ow[:3, 3]
        oi = np.linalg.inv(ow)
        obj.data.vertices.foreach_set("co", (ride(Wp) @ oi[:3, :3].T + oi[:3, 3]).ravel())
        obj.data.update()

    # --- the old bare feet: she has her own now; the game's "Barefoot" mesh is folded away inside her ankles
    for obj in meshes:
        if obj.type == "MESH" and obj.name.endswith("ShoesBarefoot"):
            ow = np.array(obj.matrix_world)
            oi = np.linalg.inv(ow)
            L = np.zeros(len(obj.data.vertices) * 3)
            obj.data.vertices.foreach_get("co", L)
            Wp = L.reshape(-1, 3) @ ow[:3, :3].T + ow[:3, 3]
            at = np.where(Wp[:, :1] < 0, tgt["L"]["ankle"], tgt["R"]["ankle"])
            obj.data.vertices.foreach_set("co", (at @ oi[:3, :3].T + oi[:3, 3]).ravel())
            obj.data.update()

    # --- the bones: limbs onto her joints (turned), the rest carried like the skin round them
    hand = {}
    for side in ("L", "R"):
        h = her[side]
        fturn = Turn(h["elbow"], h["wrist"], tgt[side]["elbow"], tgt[side]["wrist"])
        knuckles = np.array([fturn(np.array([ch[0]]))[0] for ch in h["fingers"]])
        mids = np.array([fturn(np.array([ch[1]]))[0] for ch in h["fingers"]])
        hand[side] = dict(HandFingers=knuckles.mean(0), HandTips=mids.mean(0), HandThumb=fturn(np.array([h["thumb"][1]]))[0],
                          fturn=fturn)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    rinv = rig.matrix_world.inverted()
    from mathutils import kdtree
    kd = kdtree.KDTree(int(carrier.sum()))
    cidx = np.nonzero(carrier)[0]
    for j, i in enumerate(cidx):
        kd.insert(Vector(P[i]), j)
    kd.balance()

    def carried(p):
        hits = kd.find_n(Vector(p), 16)
        w = np.array([1.0 / max(hh[2], 1e-3) ** 2 for hh in hits])
        m = np.array([move[cidx[hh[1]]] for hh in hits])
        return p + (m * w[:, None]).sum(0) / w.sum()

    for eb in rig.data.edit_bones:
        label = eb.name[len(name) + 1:]
        p = np.array(rig.matrix_world @ eb.head)
        side = label[-1] if label[-2:] in ("_L", "_R") else None
        t = tgt.get(side) if side else None
        if label.startswith("UpperArm"):
            q = t["shoulder"]
        elif label.startswith("ForeArm"):
            q = t["elbow"]
        elif label.startswith("Hand") and label.split("_")[0] in hand[side]:
            q = hand[side][label.split("_")[0]]
        elif label.startswith("Thigh_") or label.startswith("ThighSoft"):
            q = seg[("thigh", side)].to_sculpt(p[None])[0] if label.startswith("ThighSoft") else t["hip"]
        elif label.startswith("Shin"):
            q = t["knee"]
        elif label.split("_")[0] in ("Head", "HairSoft", "Strand", "Bun"):
            q = S(p)
        else:
            q = carried(p)
        eb.head = rinv @ Vector(q)
        eb.tail = eb.head + Vector((0, 0, 0.08))
    bpy.ops.object.mode_set(mode="OBJECT")

    # --- her weights and painted materials, from the fitted carrier skin under her
    Wc, gnames = bone_weights(body, name)
    ctris = sf.triangles(body, carrier)
    ctree = mesh_tree(new, ctris)
    tri_face = []
    for poly in body.data.polygons:
        vs = poly.vertices[:]
        if all(carrier[v] for v in vs):
            tri_face += [poly.index] * (len(vs) - 2)
    tri_face = np.array(tri_face)
    from mathutils.interpolate import poly_3d_calc
    HW = np.zeros((len(HP2), len(gnames)))
    for i, p in enumerate(HP2):
        loc, nrm, idx, dist = ctree.find_nearest(Vector(p))
        a, b, c = ctris[idx]
        w = poly_3d_calc([Vector(new[a]), Vector(new[b]), Vector(new[c])], loc)
        HW[i] = Wc[a] * w[0] + Wc[b] * w[1] + Wc[c] * w[2]
    # her hands: forearm, then her own fingers and thumb
    gi = {g: k for k, g in enumerate(gnames)}
    links = [[] for _ in range(len(HP2))]
    for e in skin.data.edges:
        a, b = e.vertices
        links[a].append(b)
        links[b].append(a)
    for side in ("L", "R"):
        h, ft = her[side], hand[side]["fturn"]
        chains = [np.array([ft(np.array([q]))[0] for q in ch]) for ch in h["fingers"]]
        thumb = np.array([ft(np.array([q]))[0] for q in h["thumb"]])
        wr = tgt[side]["wrist"]
        near_hand = np.linalg.norm(HP2 - wr, axis=1) < 0.2
        idx = np.nonzero(near_hand)[0]
        if not len(idx):
            continue
        Qh = HP2[idx]

        def chain_dist(ch, lo, hi):
            return np.min([_seg_param(Qh, ch[k], ch[k + 1])[1] for k in range(lo, hi)], axis=0)
        d_prox = np.min([chain_dist(ch, 0, 1) for ch in chains], axis=0)
        d_dist = np.min([chain_dist(ch, 1, len(ch) - 1) for ch in chains], axis=0)
        d_thumb = chain_dist(thumb, 0, len(thumb) - 1)
        palm_u = (tgt[side]["wrist"] - tgt[side]["elbow"])
        palm_u /= np.linalg.norm(palm_u)
        past = (Qh - wr) @ palm_u
        # the hand is the skin past her wrist that joins on to her fingers: grown out along her mesh from her
        # fingertips, so the hip and thigh beside it (as near, but not joined to it) keep their own weights
        beyond = past > -0.01
        local = {int(i): j for j, i in enumerate(idx) if beyond[j]}
        hand_part = np.zeros(len(idx), bool)
        stack = [int(idx[j]) for j in range(len(idx)) if beyond[j] and min(d_dist[j], d_thumb[j]) < 0.012]
        for i in stack:
            hand_part[local[i]] = True
        while stack:
            i = stack.pop()
            for u in links[i]:
                if u in local and not hand_part[local[u]]:
                    hand_part[local[u]] = True
                    stack.append(u)
        for j, i in enumerate(idx):
            if not hand_part[j]:
                continue
            r = {"ForeArm": 1.0}
            best = min((d_prox[j], "HandFingers"), (d_dist[j], "HandTips"), (d_thumb[j], "HandThumb"))
            if best[0] < 0.016:
                r = {best[1]: 1.0}
            HW[i] = 0
            for bn, wv in r.items():
                full = f"{name}_{bn}_{side}"
                if full in gi:
                    HW[i, gi[full]] = wv
    HW /= np.maximum(HW.sum(1, keepdims=True), 1e-9)
    paint = {}
    pnames = [m.name if m else "" for m in body.data.materials]
    nail_attr = skin.data.attributes.get("nail")
    is_nail = np.zeros(len(skin.data.polygons), np.int32)
    if nail_attr is not None:
        nail_attr.data.foreach_get("value", is_nail)
    for poly in skin.data.polygons:
        if is_nail[poly.index]:
            paint[poly.index] = "T_nail"        # her fingernails (build_body.add_nails)
            continue
        loc, nrm, idx, dist = ctree.find_nearest(Vector(HP2[poly.vertices[0]] * 0 + np.array(poly.center)))
        mname = pnames[face_mat[tri_face[idx]]]
        paint[poly.index] = mname if (mname in swap["paint"] and dist < 0.02) else "T_skin_f"

    # --- her neck run on up into the game's head: rings from her neck's open end, easing into the shape and place
    # of the game's own neck (scaled with the head) where it goes in under the jaw; weighted from her neck's
    # weights over to the head's.
    neck_isl = [k for k in fitted_isl if 1.3 < lowest[k] <= HEAD_FROM]
    ON = S(P[np.isin(island, neck_isl)]) if neck_isl else np.zeros((0, 3))
    nfaces0 = len(skin.data.polygons)
    bm = bmesh.new()
    bm.from_mesh(skin.data)
    bm.verts.ensure_lookup_table()
    ring = [v for v in bm.verts if v.is_boundary and abs(v.co.z - NECK_Z) < 0.003]
    R0 = np.array([tuple(v.co) for v in ring])
    c0 = R0.mean(0)
    order = np.argsort(np.arctan2(R0[:, 1] - c0[1], R0[:, 0] - c0[0]))
    ring = [ring[i] for i in order]
    R0 = R0[order]
    w0, d0 = np.ptp(R0[:, 0]), np.ptp(R0[:, 1])
    z_top = min(ON[:, 2].max(), c_her[2]) if len(ON) else NECK_Z + 0.06
    K = swap["neck_rings"]
    prev, added = ring, []
    for k in range(1, K + 1):
        t = k / K
        z = NECK_Z + t * (z_top - NECK_Z)
        sec = ON[np.abs(ON[:, 2] - z) < 0.008]
        if len(sec) >= 4:
            cz = np.array([(sec[:, 0].min() + sec[:, 0].max()) / 2, (sec[:, 1].min() + sec[:, 1].max()) / 2])
            w, d = np.ptp(sec[:, 0]), np.ptp(sec[:, 1])
        else:
            cz, w, d = c0[:2], w0, d0
        e = t * t * (3 - 2 * t)
        c = c0[:2] * (1 - e) + cz * e
        sx, sy = 1 + (w / w0 - 1) * e, 1 + (d / d0 - 1) * e
        cur = [bm.verts.new((c[0] + (q[0] - c0[0]) * sx, c[1] + (q[1] - c0[1]) * sy, z)) for q in R0]
        for j in range(len(cur)):
            a, b, cc, dd = prev[j], prev[(j + 1) % len(cur)], cur[(j + 1) % len(cur)], cur[j]
            f = bm.faces.new((a, b, cc, dd))
            f.smooth = True
            mid = (a.co + b.co + cc.co + dd.co) / 4
            f.normal_update()
            if f.normal.dot(mid - Vector((c[0], c[1], mid.z))) < 0:
                f.normal_flip()
        added.append((t, cur))
        prev = cur
    bm.verts.index_update()
    ring_idx = [v.index for v in ring]
    new_rows = []
    for t, cur in added:
        for j, v in enumerate(cur):
            new_rows.append((v.index, ring_idx[j], t))
    bm.to_mesh(skin.data)
    bm.free()
    head_col = gi.get(f"{name}_Head")
    HW = np.vstack([HW, np.zeros((len(new_rows), HW.shape[1]))])
    for vi, ri, t in new_rows:
        HW[vi] = HW[ri] * (1 - t)
        if head_col is not None:
            HW[vi, head_col] += t
    for poly in skin.data.polygons[nfaces0:]:
        paint[poly.index] = "T_skin_f"
    log(f"real_heroin: neck run up {(z_top - NECK_Z) * 1000:.0f} mm into the head in {K} rings")

    # --- the swap: the old skin out, hers in
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.nonzero(carrier)[0]], context="VERTS")
    bm.to_mesh(body.data)
    bm.free()
    # her mesh comes with weights left over from her own build ("neck_ring", "hand") but no group names: dropped,
    # or the game's groups made below would take those slots over (her hands would all wear Torso, her neck Hips)
    bm = bmesh.new()
    bm.from_mesh(skin.data)
    for layer in list(bm.verts.layers.deform.values()):
        bm.verts.layers.deform.remove(layer)
    bm.to_mesh(skin.data)
    bm.free()
    skin.vertex_groups.clear()
    for g in gnames:
        if g not in skin.vertex_groups:
            skin.vertex_groups.new(name=g)
    for k, g in enumerate(gnames):
        vg = skin.vertex_groups[g]
        nz = np.nonzero(HW[:, k] > 1e-4)[0]
        for i in nz:
            vg.add([int(i)], float(HW[i, k]), "REPLACE")
    # her materials, by name from the body's own slots (adding any missing)
    for mname in set(paint.values()):
        if mname not in [m.name for m in skin.data.materials]:
            skin.data.materials.append(bpy.data.materials[mname])
    slot = {m.name: k for k, m in enumerate(skin.data.materials)}
    for poly in skin.data.polygons:
        poly.material_index = slot[paint[poly.index]]
    if not skin.data.uv_layers:
        skin.data.uv_layers.new(name="UVMap")
    with bpy.context.temp_override(active_object=body, selected_editable_objects=[body, skin]):
        bpy.ops.object.join()
    body.data.update()
    stitch_grids(body, swap, log)
    log(f"real_heroin: Female_Body now {len(body.data.vertices)} corners ({len(HP2)} hers)")
    return dict(tgt=tgt, her=her)
