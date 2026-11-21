"""Her default T-shirt, built as its own clean mesh with its own cup keys (2026-11-21, the make-clothes skill's way).

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/new_tee.py -- [out.blend] [--preview DIR]

The old tee was her skin's faces copied and lifted, cropped in the game by baked hem folds (_CLOTH_DRAPE_<cup>) and fitted
over each cup by the game's tricks (follow the skin, smooth, hang, shell). This one is a sheet of its own:

  * a grid round her torso (columns round her upright line, rows from the hem to the crew neck) with an armhole on each
    side, and a sleeve tube from each armhole down her upper arm;
  * skin-tight (the user, 2026-11-21: thinner, wrapped round each breast; on a big bust the hem crosses it and shows
    the underside, which is wanted): started on her outline at each height, then relaxed like a taut sheet while drawn
    onto her skin (WRAP), never nearer it than GAP; the hem stays at HEM_TOP at every cup;
  * hem, cuffs and neckline turned under (EDGE), weights copied from the skin under each point and blurred.

It is built again on her body at every cup A-O (the body's sculpted keys, _BUST_KEY_<cup>): the same points, each where
that cup's body puts it, and the change from the C cup is stored as the shirt's own "_BUST_KEY_<cup>", as the body's
are. The game blends them with the slider exactly as for her skin (appearance.ts cupKeyMove), so the shirt matches
this file at every cup. The tee's stains are moved onto the new shirt and get keys too.

The old tee's faces (material T_tee) in Female_ClothTee are replaced; her leggings stay. With no out.blend the master
is backed up to ref/_sculpt_backups and saved over (core.save_blend). --preview writes body + shirt OBJs per cup (y-up).
"""
import math
import os
import shutil
import sys
import time

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import convex_hull_2d
from mathutils.interpolate import poly_3d_calc

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
PREVIEW = argv[argv.index("--preview") + 1] if "--preview" in argv else None
rest = [a for i, a in enumerate(argv) if a != "--preview" and (i == 0 or argv[i - 1] != "--preview")]
OUT = rest[0] if rest else None

LETTERS = "ABCDEFGHIJKLMNO"
GAP = 0.003                     # cloth off her skin
WRAP = 0.5                      # each pass, cloth further off her skin than GAP is pulled this much of the way onto it
SLEEVE_EASE = 0.005             # more room in the sleeve by the cuff
HEM_TOP = 1.16                  # the crop, a hand above her navel
MID_Z = 1.26                    # rows below are spread from the hem to here, rows above sit at fixed heights
NECK = (1.415, 1.452)           # crew neck height at her front, at her back
PIT_Z, CAP_Z = 1.30, 1.40       # the armhole, from her armpit to the top of her shoulder
ARMHOLE = (102.0, 152.0)       # ...and round her, degrees from her front
COLS, ROWS_LOW, ROWS_UP = 96, 12, 18
SLEEVE_T, RINGS = 0.16, 8       # sleeve length down the arm from the shoulder joint, rings along it
PASSES, EASE = 25, 0.5          # taut-sheet relaxing
PUSH_STEP, COVER_PASSES = 0.003, 10
TENT_RINGS, TENT_FALL = 3, 0.6       # each push spreads this many rings out, by this much less each
SEAM_EASE = 0.5                 # the armhole seams eased along themselves as well
EDGE = (0.0015, 0.008)          # turned under: how deep, how wide
SLICE = 0.005                   # her outline is taken every 5 mm up her
STAIN_LIFT = 0.001
ROOT_T = 0.06
RAISE = 35.0                    # her arms are raised this far out from her sides while the shirt is made

t0 = time.time()
body = bpy.data.objects["Female_Body"]
tee = bpy.data.objects["Female_ClothTee"]
rig = bpy.data.objects["Female_Armature"]
for o in (body, tee, rig):
    assert np.allclose(np.array(o.matrix_world), np.eye(4)), f"{o.name} is not at the origin"

# ---------------------------------------------------------------- her body: points, triangles, weights, keys
bme = body.data
nb = len(bme.vertices)
base = np.empty(nb * 3)
bme.vertices.foreach_get("co", base)
base = base.reshape(-1, 3)
bme.calc_loop_triangles()
tris = np.empty(len(bme.loop_triangles) * 3, np.int32)
bme.loop_triangles.foreach_get("vertices", tris)
tris = tris.reshape(-1, 3)

gname = {g.index: g.name for g in body.vertex_groups}
skin_w = [[(gname[g.group], g.weight) for g in v.groups if g.weight > 0] for v in bme.vertices]


def summed(test):
    return np.array([sum(w for n, w in ws if test(n)) for ws in skin_w])


w_arm = summed(lambda n: any(k in n for k in ("UpperArm", "ForeArm", "Hand")))
w_upper = summed(lambda n: "UpperArm" in n)
w_hand = summed(lambda n: any(k in n for k in ("ForeArm", "Hand")))
w_bust = summed(lambda n: "Bust" in n)

keys = {}
for letter in LETTERS:
    attr = bme.attributes.get(f"_BUST_KEY_{letter}")
    if attr is None:
        keys[letter] = np.zeros_like(base)
        continue
    d = np.empty(nb * 3, np.float32)
    attr.data.foreach_get("vector", d)
    d = d.reshape(-1, 3)
    keys[letter] = np.stack([d[:, 0], -d[:, 2], d[:, 1]], axis=1)  # stored y-up (x, z, -y)

# Made with her arms raised out from her sides, as clothes are made on an A-pose: hanging down they press against
# her sides and no sleeve fits in her armpit. Each arm turns about its shoulder joint, her skin following by its own
# weights (as the game skins her); the finished shirt is put back down through its weights, the same way, so in the
# game it moves with her arm exactly as her skin does.
def arm_turn(side):
    h = np.array(rig.data.bones[f"Female_UpperArm_{side}"].head_local)
    a = math.radians(RAISE if side == "L" else -RAISE)  # about her front-back line, the arm out from her side
    R = np.array([[math.cos(a), 0, math.sin(a)], [0, 1, 0], [-math.sin(a), 0, math.cos(a)]])
    return h, R


TURNS = {side: arm_turn(side) for side in ("L", "R")}


def chain(side):
    return lambda n: n.endswith(f"_{side}") and any(k in n for k in ("UpperArm", "ForeArm", "Hand"))


def pose_parts(wl, wr):
    """Each point's blended turn: linear part (n, 3, 3) and shift (n, 3)."""
    lin = np.zeros((len(wl), 3, 3))
    shift = np.zeros((len(wl), 3))
    rest_w = 1 - wl - wr
    lin += rest_w[:, None, None] * np.eye(3)
    for side, w in (("L", wl), ("R", wr)):
        h, R = TURNS[side]
        lin += w[:, None, None] * R
        shift += w[:, None] * (h - R @ h)
    return lin, shift


total_w = np.maximum(summed(lambda n: True), 1e-9)
body_lin, body_shift = pose_parts(summed(chain("L")) / total_w, summed(chain("R")) / total_w)
rest_base, rest_keys = base, dict(keys)
base = np.einsum("nij,nj->ni", body_lin, rest_base) + body_shift
keys = {letter: np.einsum("nij,nj->ni", body_lin, k) for letter, k in rest_keys.items()}

# Her arm, for the torso cloth, is only the part hanging from her shoulder: the root of it (her deltoid, within
# ROOT_T of the shoulder joint down the arm) is her shoulder, which the torso cloth goes over. Left out, the cloth in
# front of the armhole ran inside her deltoid and folded over when pushed back out.
arm_down = np.zeros(nb)
for side in ("L", "R"):
    h = np.array(rig.data.bones[f"Female_UpperArm_{side}"].head_local)
    e = TURNS[side][1] @ (np.array(rig.data.bones[f"Female_ForeArm_{side}"].head_local) - h) + h
    a = (e - h) / np.linalg.norm(e - h)
    mine = summed(chain(side)) > 0.5
    arm_down[mine] = (base[mine] - h) @ a
arm_far = (w_arm >= 0.5) & (arm_down > ROOT_T)
# Her lingerie patch is a shell a little way off her skin, inside GAP (her breast band is painted on the skin); left in, the
# lingerie patch's edge spanning her armpit pushed the shirt into folds there. Her skin alone shapes the shirt.
OVERLAYS = {"T_lingerie"}
overlay = np.zeros(nb, bool)
tri_mat = np.empty(len(bme.loop_triangles), np.int32)
bme.loop_triangles.foreach_get("material_index", tri_mat)
for m, mat in enumerate(bme.materials):
    if mat and mat.name in OVERLAYS:
        overlay[tris[tri_mat == m].ravel()] = True
tri_hand = (w_hand[tris] >= 0.5).any(1) | overlay[tris].any(1)
tri_arm_low = arm_far[tris].any(1)
torso_tris = tris[~tri_hand & ~tri_arm_low].tolist()
# The sleeves keep off her upper arm only, the torso off her torso only: in the valley between her chest and arm
# the cloth spans across instead of jumping from one to the other.
sleeve_tris = tris[(w_upper[tris] >= 0.3).any(1) & ~tri_hand].tolist()
arm_tris = tris[(w_upper[tris] >= 0.5).all(1)].tolist()
full_tris = tris[~tri_hand].tolist()
hull_ok = ~arm_far & ~overlay & (w_hand < 0.5) & (base[:, 2] <= 1.48)

zs = np.arange(0.90, 1.4751, SLICE)
# Her upright line at each height: midway between her front and back down her middle, as built (the same for every cup).
yc = np.zeros(len(zs))
for s, z in enumerate(zs):
    m = hull_ok & (np.abs(base[:, 2] - z) < 0.004) & (np.abs(base[:, 0]) < 0.04)
    yc[s] = (base[m, 1].min() + base[m, 1].max()) / 2 if m.any() else np.nan
good = ~np.isnan(yc)
yc = np.interp(zs, zs[good], yc[good])
yc = np.convolve(np.pad(yc, 4, mode="edge"), np.ones(9) / 9, mode="valid")

theta = np.arange(COLS) * (2 * math.pi / COLS)  # 0 at her front, towards +x
dirs = np.stack([np.sin(theta), np.cos(theta)], axis=1)
deg = np.degrees(np.minimum(theta, 2 * math.pi - theta))  # 0 front .. 180 back, both sides


def ramp(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


neck_z = NECK[0] + (NECK[1] - NECK[0]) * (1 - np.cos(theta)) / 2


def ray_hull(poly):
    """How far out from her upright line each column's direction leaves this convex outline."""
    a = poly
    e = np.roll(poly, -1, 0) - a
    cross = lambda u, v: u[..., 0] * v[..., 1] - u[..., 1] * v[..., 0]  # noqa: E731
    d = dirs[:, None, :]
    den = cross(d, e[None])
    with np.errstate(divide="ignore", invalid="ignore"):
        t = cross(a[None], e[None]) / den
        s = cross(a[None], d) / den
    t = np.where((s >= -1e-9) & (s <= 1 + 1e-9) & (t > 0) & np.isfinite(t), t, -np.inf)
    out = t.max(1)
    return np.where(np.isfinite(out), out, np.linalg.norm(a, axis=1).max())


def outlines(pos):
    """Her outline's distance out at each slice and column: (slices, COLS)."""
    radii = np.zeros((len(zs), COLS))
    for s, z in enumerate(zs):
        m = hull_ok & (np.abs(pos[:, 2] - z) < 0.004)
        pts = pos[m][:, :2] - np.array([0.0, yc[s]])
        if len(pts) < 3:
            radii[s] = radii[s - 1] if s else 0.05
            continue
        hull = convex_hull_2d([Vector(p) for p in pts])
        radii[s] = ray_hull(pts[hull])
    return radii


# ---------------------------------------------------------------- the shirt's points and faces (the same for every cup)
NR = ROWS_LOW + ROWS_UP + 1
mid_deg = (ARMHOLE[0] + ARMHOLE[1]) / 2
up_step = (NECK[0] + (NECK[1] - NECK[0]) * (1 - math.cos(math.radians(mid_deg))) / 2 - MID_Z) / ROWS_UP
RA = ROWS_LOW + round((PIT_Z - MID_Z) / up_step)
RB = ROWS_LOW + round((CAP_Z - MID_Z) / up_step)
c0, c1 = round(ARMHOLE[0] / 360 * COLS), round(ARMHOLE[1] / 360 * COLS)
HOLES = {"R": (c0, c1), "L": (COLS - c1, COLS - c0)}  # +x is her right


def in_hole(c, j, strict):
    for ca, cb in HOLES.values():
        if strict and ca < c < cb and RA < j < RB:
            return True
        if not strict and ca <= c < cb and RA <= j < RB:
            return True
    return False


grid = {}
kind = []  # "torso" / "sleeve" per point
for c in range(COLS):
    for j in range(NR):
        if not in_hole(c, j, True):
            grid[(c, j)] = len(kind)
            kind.append("torso")
faces = []
for c in range(COLS):
    for j in range(NR - 1):
        if in_hole(c, j, False):
            continue
        n = (c + 1) % COLS
        faces.append((grid[(c, j)], grid[(c, j + 1)], grid[(n, j + 1)], grid[(n, j)]))
torso_faces = len(faces)

loops = {}
for side, (ca, cb) in HOLES.items():
    loop = [(c, RA) for c in range(ca, cb + 1)] + [(cb, j) for j in range(RA + 1, RB + 1)]
    loop += [(c, RB) for c in range(cb - 1, ca - 1, -1)] + [(ca, j) for j in range(RB - 1, RA, -1)]
    loops[side] = [grid[k] for k in loop]
sleeves = {}
for side, loop in loops.items():
    rings = [loop]
    for k in range(1, RINGS + 1):
        rings.append(list(range(len(kind), len(kind) + len(loop))))
        kind.extend(["sleeve"] * len(loop))
    sleeves[side] = rings
    first = len(faces)
    for k in range(RINGS):
        a, b = rings[k], rings[k + 1]
        for i in range(len(loop)):
            n = (i + 1) % len(loop)
            faces.append((a[i], a[n], b[n], b[i]))
    sleeves[side + "_faces"] = (first, len(faces))
NV = len(kind)
seam_loops = [np.array(loops[side]) for side in ("L", "R")]
# Round the armholes and on the sleeves the cloth is shrinkwrapped (pulled onto her skin, GAP off it, more ease down
# the sleeve), as a T-shirt sits snug at the shoulder; elsewhere it is only kept out, so it spans her hollows. The
# pull fades out over a few rows of the torso round each armhole.
zone = np.zeros(NV)
offset = np.full(NV, GAP)
on_arm = np.zeros(NV, bool)
for (c, j), v in grid.items():
    near = 99
    for ca, cb in HOLES.values():
        dc = max(ca - c, 0, c - cb)
        dr = max(RA - j, 0, j - RB)
        near = min(near, max(dc, dr))
    zone[v] = 1 - ramp(near, 2, 5)
for side in ("L", "R"):
    for k, ring in enumerate(sleeves[side][1:], start=1):
        zone[ring] = 1
        offset[ring] = GAP + SLEEVE_EASE * k / RINGS
        on_arm[ring] = k >= 2  # down the sleeve, wrapped round her arm only: its underside was pulled onto her side
face_side = [None] * len(faces)
face_ring = [0] * len(faces)
for side in ("L", "R"):
    lo_, hi_ = sleeves[side + "_faces"]
    face_side[lo_:hi_] = [side] * (hi_ - lo_)
    face_ring[lo_:hi_] = [(f - lo_) // len(loops[side]) for f in range(lo_, hi_)]
torso_mask = np.array([k == "torso" for k in kind])

# Neighbours, and which points lie on an open edge (hem, neck, cuffs): those ease along that edge only.
edge_faces = {}
for f in faces:
    for a, b in zip(f, f[1:] + f[:1]):
        edge_faces[(min(a, b), max(a, b))] = edge_faces.get((min(a, b), max(a, b)), 0) + 1
open_edge = {e for e, n in edge_faces.items() if n == 1}
on_open = np.zeros(NV, bool)
for a, b in open_edge:
    on_open[a] = on_open[b] = True
nbrs = [[] for _ in range(NV)]
for (a, b) in edge_faces:
    if not on_open[a] or (a, b) in open_edge:
        nbrs[a].append(b)
    if not on_open[b] or (a, b) in open_edge:
        nbrs[b].append(a)
deg_max = max(len(n) for n in nbrs)
nb_idx = np.full((NV, deg_max), -1)
for i, n in enumerate(nbrs):
    nb_idx[i, :len(n)] = n
nb_ok = nb_idx >= 0
nb_idx[~nb_ok] = 0

hem_loop = [grid[(c, 0)] for c in range(COLS)]
neck_loop = [grid[(c, NR - 1)] for c in range(COLS)]
hem_in = [grid[(c, 1)] for c in range(COLS)]
neck_in = [grid[(c, NR - 2)] for c in range(COLS)]


def arm_frame(side):
    bones = rig.data.bones
    h = np.array(bones[f"Female_UpperArm_{side}"].head_local)
    e = np.array(bones[f"Female_ForeArm_{side}"].head_local)
    e = TURNS[side][1] @ (e - h) + h  # raised
    a = (e - h) / np.linalg.norm(e - h)
    u = np.cross(a, [0.0, 1.0, 0.0])
    u /= np.linalg.norm(u)
    w = np.cross(a, u)
    return h, a, u, w


FRAMES = {s: arm_frame(s) for s in ("L", "R")}
arm_tree = BVHTree.FromPolygons([Vector(p) for p in base], arm_tris)


def face_normals(P, fs):
    f = np.array(fs)
    a, b, c, d = (P[f[:, k]] for k in range(4))
    n = np.cross(c - a, d - b)
    return n


def point_normals(P, fs):
    n = face_normals(P, fs)
    out = np.zeros_like(P)
    f = np.array(fs)
    for k in range(4):
        np.add.at(out, f[:, k], n)
    return out / np.maximum(np.linalg.norm(out, axis=1, keepdims=True), 1e-12)


def build(pos):
    """The shirt on her body with its points at `pos`: (NV, 3), in the file's (z-up) space."""
    torso_tree = BVHTree.FromPolygons([Vector(p) for p in pos], torso_tris)
    full_tree = BVHTree.FromPolygons([Vector(p) for p in pos], full_tris)
    sleeve_tree = BVHTree.FromPolygons([Vector(p) for p in pos], sleeve_tris)
    radii = outlines(pos)
    P = np.zeros((NV, 3))
    for c in range(COLS):
        z = np.concatenate([np.linspace(HEM_TOP, MID_Z, ROWS_LOW, endpoint=False), np.linspace(MID_Z, neck_z[c], ROWS_UP + 1)])
        r = np.interp(z, zs, radii[:, c])
        r = r + GAP
        y0 = np.interp(z, zs, yc)
        for j in range(NR):
            if (c, j) in grid:
                P[grid[(c, j)]] = (r[j] * dirs[c, 0], y0[j] + r[j] * dirs[c, 1], z[j])
    for side in ("L", "R"):
        h, a, u, w = FRAMES[side]
        rings = sleeves[side]
        # Round the arm, the armhole's points are bunched (14 along the narrow strip under her arm); down the sleeve
        # they spread out evenly, all even by the cuff, or the sleeve folded back on itself below the armhole's corners.
        rel0 = P[rings[0]] - h
        ts = rel0 @ a
        phis = np.unwrap(np.arctan2(rel0 @ w, rel0 @ u))
        n = len(phis)
        turn = np.sign(phis[-1] - phis[0]) * 2 * math.pi
        steps = np.arange(n) * turn / n
        even = steps + np.mean(phis - steps)
        for i, v in enumerate(rings[0]):
            for k in range(1, RINGS + 1):
                s = k / RINGS
                ease = s * s * (3 - 2 * s)
                phi = phis[i] + (even[i] - phis[i]) * ease
                radial = math.cos(phi) * u + math.sin(phi) * w
                centre = h + a * (ts[i] + (SLEEVE_T - ts[i]) * s)
                hit = arm_tree.ray_cast(Vector(centre), Vector(radial), 0.15)
                rr = (hit[0] - Vector(centre)).length if hit[0] is not None else 0.04
                target = centre + radial * (rr + GAP + SLEEVE_EASE * s)
                P[rings[k][i]] = P[v] + (target - P[v]) * ease

    def collide():
        for i in range(NV):
            if zone[i] < 1 and torso_mask[i]:
                loc, nrm, _, _ = torso_tree.find_nearest(Vector(P[i]), 0.2)
                if loc is not None:
                    d = (Vector(P[i]) - loc).dot(nrm)
                    if d < GAP:
                        P[i] = loc + nrm * GAP
                    elif not on_open[i]:  # skin-tight: drawn onto her, spanning only what the easing between points spans
                        # (not the hem and neckline: pulled onto every bump they went wavy, and tucked under her bust)
                        P[i] -= np.array(nrm) * (d - GAP) * WRAP * (1 - zone[i])
            if zone[i] > 0:
                tree = sleeve_tree if on_arm[i] else full_tree
                loc, nrm, _, _ = tree.find_nearest(Vector(P[i]), 0.2)
                if loc is not None:
                    P[i] += zone[i] * (np.array(loc + nrm * offset[i]) - P[i])

    def smooth():
        avg = (P[nb_idx] * nb_ok[..., None]).sum(1) / np.maximum(nb_ok.sum(1, keepdims=True), 1)
        P[:] += EASE * (avg - P)
        # The armhole seam eased along itself too, so the grid's square corners round off into a sewn curve.
        for loop in seam_loops:
            P[loop] += SEAM_EASE * ((P[np.roll(loop, 1)] + P[np.roll(loop, -1)]) / 2 - P[loop])

    def cover(step=PUSH_STEP):
        """Her skin's sharp bits (nipples, shoulder blades, the shoulder caps by the armholes) poked out between the
        points: each skin point out past the cloth, or nearer it than half the gap, pushes the face over it out. Out
        is away from her upright line on the torso, away from the arm's line on a sleeve."""
        tf = np.array(faces)
        tree = BVHTree.FromPolygons([Vector(p) for p in P], tf.tolist())
        lo = P[torso_mask][:, 2].min() - 0.01
        push = np.zeros(NV)
        skin = (hull_ok | (w_upper >= 0.3)) & ~overlay & (w_hand < 0.5) & (pos[:, 2] > lo) & (pos[:, 2] < 1.47)
        for s in np.nonzero(skin)[0]:
            q, n, fi, _ = tree.find_nearest(Vector(pos[s]), 0.03)
            if q is None:
                continue
            q, n = np.array(q), np.array(n)
            side = face_side[fi]
            if side and w_upper[s] < 0.3 and face_ring[fi] >= 2:
                continue  # the sleeves are kept off her arm only, but where they start off her chest too
            if side:
                h, a, _, _ = FRAMES[side]
                rel = q - h
                away = rel - (rel @ a) * a
            else:
                away = np.array([q[0], q[1] - np.interp(q[2], zs, yc), 0.0])
            if n @ away < 0:
                n = -n
            d = min((pos[s] - q) @ n + GAP * 0.5, step)  # a little at a time: one big push kinked a face over
            if d > 0:
                for v in tf[fi]:
                    if zone[v] < 0.5 and d > push[v]:
                        push[v] = d
        # A tent, not a kink: each push spreads to the points round it, a little less each ring out, along the
        # cloth's own smooth normal (a sharp nipple pushed one face out into a crease).
        for _ in range(TENT_RINGS):
            push = np.maximum(push, TENT_FALL * (push[nb_idx] * nb_ok).max(1) * (zone < 0.5))
        out = point_normals(P, faces)
        away = np.zeros((NV, 3))
        away[:, 0] = P[:, 0]
        away[:, 1] = P[:, 1] - np.interp(P[:, 2], zs, yc)
        out *= np.where(np.einsum("ij,ij->i", out, away) < 0, -1.0, 1.0)[:, None]
        P[:] += out * push[:, None]
        return int((push > 0).sum())

    for _ in range(PASSES):
        smooth()
        collide()
    for _ in range(COVER_PASSES):
        cover()
        smooth()
        collide()
    pushed = cover(0.02)  # the last one whole: the cloth has settled round it by now
    collide()
    return P, pushed


def turned(P):
    """The hem, neckline and cuffs turned under: a strip inside each, EDGE deep and wide. Points and faces."""
    nrm = point_normals(P, faces)
    pts, fs = [], []
    edges = [(hem_loop, hem_in, True), (neck_loop, neck_in, True)]
    for side in ("L", "R"):
        rings = sleeves[side]
        edges.append((rings[-1], rings[-2], True))
    for loop, inner, closed in edges:
        start = NV + len(pts)
        for b, q in zip(loop, inner):
            d = P[q] - P[b]
            d /= max(np.linalg.norm(d), 1e-9)
            pts.append(P[b] + d * EDGE[1] - nrm[b] * EDGE[0])
        n = len(loop)
        for i in range(n if closed else n - 1):
            k = (i + 1) % n
            fs.append((loop[i], start + i, start + k, loop[k]))
    return np.array(pts), fs


def shirt_at(letter):
    started = time.time()
    P, pushed = build(base + keys[letter])
    extra, extra_faces = turned(P)
    print(f"new_tee: {letter} built, {pushed} points still pushed out by skin at the end ({time.time() - started:.0f} s)", flush=True)
    return np.concatenate([P, extra]), extra_faces


shapes = {}
for letter in ["C"] + [x for x in LETTERS if x != "C"]:
    shapes[letter], strip_faces = shirt_at(letter)
all_faces = faces + strip_faces
C = shapes["C"]

# Facing out: the torso was laid out facing out; each sleeve and each turned strip is turned to match.
nC = face_normals(C, all_faces)
centres = np.array([C[list(f)].mean(0) for f in all_faces])
flip = np.zeros(len(all_faces), bool)
for side in ("L", "R"):
    h, a, _, _ = FRAMES[side]
    lo, hi = sleeves[side + "_faces"]
    rel = centres[lo:hi] - h
    rel -= np.outer(rel @ a, a)
    if (np.einsum("ij,ij->i", nC[lo:hi], rel) < 0).mean() > 0.5:
        flip[lo:hi] = True
pn = point_normals(C, faces)
lo = len(faces)
for start in range(lo, len(all_faces), 1):
    f = all_faces[start]
    outer = pn[f[0]]
    # A turned strip faces in, towards her.
    flip[start] = nC[start] @ outer > 0
all_faces = [tuple(reversed(f)) if fl else f for f, fl in zip(all_faces, flip)]
front = [i for i in range(torso_faces) if centres[i][1] > 0.12 and abs(centres[i][0]) < 0.03 and 1.2 < centres[i][2] < 1.35]
assert front and np.mean([face_normals(C, [all_faces[i]])[0][1] > 0 for i in front]) > 0.9, "the shirt faces in"

# ---------------------------------------------------------------- weights: the skin's, from the triangle under each point
torso_tree_c = BVHTree.FromPolygons([Vector(p) for p in base], torso_tris)
full_tree_c = BVHTree.FromPolygons([Vector(p) for p in base], full_tris)
torso_list, full_list = torso_tris, full_tris
NA = len(C)
weights = [dict() for _ in range(NA)]
# The turned strips take the weights of the point they turn under from.
strip_from = []
for loop in [hem_loop, neck_loop, sleeves["L"][-1], sleeves["R"][-1]]:
    strip_from.extend(loop)
for i in range(NV):
    tree, tl = (torso_tree_c, torso_list) if torso_mask[i] else (full_tree_c, full_list)
    loc, _, ti, _ = tree.find_nearest(Vector(C[i]), 0.3)
    tri = tl[ti]
    bary = poly_3d_calc([Vector(base[v]) for v in tri], loc)
    for v, b in zip(tri, bary):
        for n, w in skin_w[v]:
            weights[i][n] = weights[i].get(n, 0.0) + w * b
names = sorted({n for ws in weights[:NV] for n in ws})
W = np.zeros((NV, len(names)))
col = {n: k for k, n in enumerate(names)}
for i, ws in enumerate(weights[:NV]):
    for n, w in ws.items():
        W[i, col[n]] = w
for _ in range(3):  # blurred, so the shirt bends smoothly at her shoulders and sides
    avg = (W[nb_idx] * nb_ok[..., None]).sum(1) / np.maximum(nb_ok.sum(1, keepdims=True), 1)
    W = 0.5 * W + 0.5 * avg
W = np.concatenate([W, W[strip_from]])
top = np.argsort(-W, axis=1)[:, :4]
final = []
for i in range(NA):
    ks = [k for k in top[i] if W[i, k] > 1e-4]
    total = sum(W[i, k] for k in ks)
    final.append({names[k]: W[i, k] / total for k in ks})

# ---------------------------------------------------------------- her arms back down: the shirt through its own weights
wl = np.array([sum(w for n, w in ws.items() if chain("L")(n)) for ws in final])
wr = np.array([sum(w for n, w in ws.items() if chain("R")(n)) for ws in final])
lin, shift = pose_parts(wl, wr)
raised = {letter: shapes[letter].copy() for letter in "CJ"}
for letter in LETTERS:
    shapes[letter] = np.linalg.solve(lin, (shapes[letter] - shift)[..., None])[..., 0]
C = shapes["C"]

# ---------------------------------------------------------------- the stains on the tee, moved onto the new shirt
old_me = tee.data
tee_mat = next(i for i, m in enumerate(old_me.materials) if m and m.name == "T_tee")
old_co = np.empty(len(old_me.vertices) * 3)
old_me.vertices.foreach_get("co", old_co)
old_co = old_co.reshape(-1, 3)
old_faces = [list(p.vertices) for p in old_me.polygons if p.material_index == tee_mat]
old_tree = BVHTree.FromPolygons([Vector(p) for p in old_co], old_faces)
tri_faces = [t for f in all_faces for t in ([f[0], f[1], f[2]], [f[0], f[2], f[3]])]
new_tree = BVHTree.FromPolygons([Vector(p) for p in C], tri_faces)
stains = {}
for o in bpy.data.objects:
    if o.type != "MESH" or not o.name.startswith("Female_CumOnTee_T_tee_"):
        continue
    co = np.empty(len(o.data.vertices) * 3)
    o.data.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    binds = []
    for p in co:
        q_old, n_old, _, _ = old_tree.find_nearest(Vector(p), 0.3)
        lift = max((Vector(p) - q_old).dot(n_old), STAIN_LIFT) if q_old is not None else STAIN_LIFT
        q, _, ti, _ = new_tree.find_nearest(q_old if q_old is not None else Vector(p), 0.3)
        tri = tri_faces[ti]
        binds.append((tri, poly_3d_calc([Vector(C[v]) for v in tri], q), lift))
    stains[o] = binds


def stain_at(binds, P):
    out = []
    for tri, bary, lift in binds:
        a, b, c = (P[v] for v in tri)
        n = np.cross(b - a, c - a)
        n /= max(np.linalg.norm(n), 1e-12)
        out.append(sum(P[v] * w for v, w in zip(tri, bary)) + n * lift)
    return np.array(out)


# ---------------------------------------------------------------- into the master: the old tee out, the new one in
print("new_tee: replacing the tee", flush=True)
for attr in [a.name for a in old_me.attributes if a.name.startswith("_CLOTH_DRAPE_") or a.name.startswith("_BUST_KEY_")]:
    old_me.attributes.remove(old_me.attributes[attr])
bm = bmesh.new()
bm.from_mesh(old_me)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == tee_mat], context="FACES")
loose = [v for v in bm.verts if not v.link_faces]
bmesh.ops.delete(bm, geom=loose, context="VERTS")
bm.verts.ensure_lookup_table()
dl = bm.verts.layers.deform.verify()
for n in names:
    if n not in tee.vertex_groups:
        tee.vertex_groups.new(name=n)
gi = {g.name: g.index for g in tee.vertex_groups}
tag = bm.verts.layers.int.new("_new_tee")  # which shirt point each is: writing the mesh back reorders its points
new_verts = []
for i, p in enumerate(C):
    v = bm.verts.new(Vector(p))
    v[tag] = i + 1
    for n, w in final[i].items():
        v[dl][gi[n]] = w
    new_verts.append(v)
uv = bm.loops.layers.uv.verify()
for f in all_faces:
    face = bm.faces.new([new_verts[i] for i in f])
    face.material_index = tee_mat
    face.smooth = True
    for loop in face.loops:
        p = loop.vert.co
        loop[uv].uv = (0.5 + math.atan2(p[0], p[1] - 0.05) / (2 * math.pi), (p[2] - 0.9) / 0.6)
bm.to_mesh(old_me)
bm.free()
old_me.update()
nt = len(old_me.vertices)
tags = np.empty(nt, np.int32)
old_me.attributes["_new_tee"].data.foreach_get("value", tags)
old_me.attributes.remove(old_me.attributes["_new_tee"])
at = np.nonzero(tags)[0]
order = tags[at] - 1
assert len(at) == NA and sorted(order) == list(range(NA))
for letter in LETTERS:
    move = np.zeros((nt, 3))
    move[at] = (shapes[letter] - C)[order]
    yup = np.stack([move[:, 0], move[:, 2], -move[:, 1]], axis=1).astype(np.float32)
    old_me.attributes.new(f"_BUST_KEY_{letter}", "FLOAT_VECTOR", "POINT").data.foreach_set("vector", yup.ravel())
    size = np.linalg.norm(move, axis=1)
    print(f"new_tee: {letter}: most {size.max() * 1000:.0f} mm", flush=True)
for o, binds in stains.items():
    me = o.data if o.data.users == 1 else o.data.copy()
    o.data = me
    at = {letter: stain_at(binds, shapes[letter]) for letter in LETTERS}
    me.vertices.foreach_set("co", at["C"].ravel())
    for attr in [a.name for a in me.attributes if a.name.startswith("_BUST_KEY_")]:
        me.attributes.remove(me.attributes[attr])
    for letter in LETTERS:
        move = at[letter] - at["C"]
        yup = np.stack([move[:, 0], move[:, 2], -move[:, 1]], axis=1).astype(np.float32)
        me.attributes.new(f"_BUST_KEY_{letter}", "FLOAT_VECTOR", "POINT").data.foreach_set("vector", yup.ravel())
    me.update()
print(f"new_tee: {NA} points, {len(all_faces)} faces, {len(stains)} stains moved ({time.time() - t0:.0f} s)", flush=True)

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    bf = [list(t) for t in tris]
    sets = [(letter, rest_base + rest_keys[letter], shapes[letter]) for letter in "ACFJMO"]
    sets += [("P" + letter, base + keys[letter], raised[letter]) for letter in "CJ"]  # as made, arms raised
    for name, body_pts, cloth_pts in sets:
        for what, pts, fs in (("body", body_pts, bf), ("cloth", cloth_pts, all_faces)):
            with open(os.path.join(PREVIEW, f"{name}_{what}.obj"), "w") as fh:
                fh.write("".join(f"v {p[0]:.5f} {p[2]:.5f} {-p[1]:.5f}\n" for p in pts))
                fh.write("".join("f " + " ".join(str(v + 1) for v in f) + "\n" for f in fs))
    import json
    with open(os.path.join(PREVIEW, "meta.json"), "w") as fh:
        json.dump({"torso_faces": torso_faces, "faces": len(faces), "all": len(all_faces), "w_arm": w_arm.round(2).tolist(), "w_bust": w_bust.round(2).tolist()}, fh)
    print("new_tee: preview in", PREVIEW)

if OUT is None:
    backups = os.path.join(core.repo_root(), "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}_before_new_tee.blend")
    shutil.copy2(bpy.data.filepath, backup)
    print("new_tee: backed up to", backup)
print("new_tee: saved", core.save_blend(OUT), flush=True)
