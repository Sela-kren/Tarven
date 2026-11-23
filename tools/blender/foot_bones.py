"""
Her feet's bones: an ankle and a ball-of-the-foot joint on each leg, so a heel can tip her foot up and her toes stay
flat on the floor (2026-11-23; before this her foot was welded to her shin).

  <name>_Foot_<side>   a child of the Shin bone, its joint in her ankle: the foot from the heel to the ball
  <name>_Toe_<side>    a child of the Foot bone, its joint under the ball of her foot: her toes

Every point that followed the Shin bone keeps exactly that weight, shared out between the Shin, Foot and Toe bones by
where it lies (weights() below), so the game's leg sliders, which shape her by the Shin bone's terms, move her feet
with the Foot bone's joint as before. Only points on or near her feet are touched: clothes that hang past them (a
robe's hem) stay on the Shin bone. Her shoes (<name>_Shoes*) are left alone: foot_shoes.py builds them.

apply(rig, meshes) runs on a build and on the master (tarven_bridge/foot_bones.py, merge_build): it folds the Foot
and Toe weights back onto the Shin bone first, so it can run again.
"""
import math

import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

SIDES = (("L", -1), ("R", 1))
BONE_LENGTH = 0.04
# The ankle joint's height above the floor, in her leg's middle there.
ANKLE_Z = 0.07
# The ball of her foot, as a share of her foot's length from the back of her heel, and its joint's height.
BALL_SHARE = 0.72
BALL_Z = 0.022
# A point's height, less half how far in front of her ankle it lies (so her instep, sloping up to her shin, counts as
# foot), shades from the Foot bone (at or below the first) to the Shin bone (at or above the second).
ANKLE_BLEND = (0.065, 0.12)
# How far past the ball of her foot (along her foot) her skin shades from the Foot bone to the Toe bone.
TOE_BLEND = (-0.008, 0.012)
# A point on anything but her skin is only shared out within this far of her foot's skin.
NEAR_FOOT = 0.03
LEAST = 1e-3


def _ease(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def bone_names(name):
    return [f"{name}_{part}_{side}" for side, _ in SIDES for part in ("Foot", "Toe")]


def landmarks(name, body):
    """Each foot's ankle, ball, direction and length, read off her skin."""
    mw = body.matrix_world
    points = [mw @ v.co for v in body.data.vertices]
    marks = {}
    for side, sx in SIDES:
        foot = [p for p in points if p.x * sx > 0.03 and p.z < 0.16]
        leg = [p for p in foot if 0.13 <= p.z <= 0.16]
        cx = sum(p.x for p in leg) / len(leg)
        cy = sum(p.y for p in leg) / len(leg)
        low = [p for p in foot if p.z < 0.05]
        back = min(p.y for p in low)
        tip = max(p.y for p in foot)
        front = [p for p in foot if p.y > tip - 0.03]
        fx = sum(p.x for p in front) / len(front)
        heel = [p for p in low if p.y < back + 0.02]
        hx = sum(p.x for p in heel) / len(heel)
        direction = Vector((fx - hx, tip - back, 0)).normalized()
        start = Vector((hx, back, 0))
        length = max((p - start).dot(direction) for p in foot)
        ball = start + direction * (length * BALL_SHARE)
        marks[side] = {
            "sx": sx,
            "ankle": Vector((cx, cy, ANKLE_Z)),
            "ball": Vector((ball.x, ball.y, BALL_Z)),
            "heel": Vector((hx, back, min(p.z for p in low))),
            "dir": direction,
            "length": length,
            "floor": min(p.z for p in foot),
        }
    return marks


def make_bones(rig, name, marks):
    """The four bones, pointing up as every other bone of hers does."""
    view = bpy.context.view_layer
    for obj in view.objects:
        obj.select_set(False)
    view.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bones = rig.data.edit_bones
    to_rig = rig.matrix_world.inverted()
    for bone in bone_names(name):
        if bone in bones:
            bones.remove(bones[bone])
    for side, _ in SIDES:
        m = marks[side]
        for part, at, parent in (("Foot", m["ankle"], f"{name}_Shin_{side}"), ("Toe", m["ball"], f"{name}_Foot_{side}")):
            bone = bones.new(f"{name}_{part}_{side}")
            head = to_rig @ at
            bone.head = head
            bone.tail = head + Vector((0, 0, BONE_LENGTH))
            bone.roll = 0.0
            bone.use_deform = True
            bone.parent = bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")


def weights(m, p):
    """(Foot share, Toe share of the Foot's) for a point p near foot m."""
    rel = p - m["ankle"]
    forward = rel.x * m["dir"].x + rel.y * m["dir"].y
    foot = 1.0 - _ease(ANKLE_BLEND[0], ANKLE_BLEND[1], p.z - 0.5 * max(0.0, forward))
    past_ball = (p.x - m["ball"].x) * m["dir"].x + (p.y - m["ball"].y) * m["dir"].y
    return foot, _ease(TOE_BLEND[0], TOE_BLEND[1], past_ball)


def _fold_back(obj, name):
    for side, _ in SIDES:
        shin = obj.vertex_groups.get(f"{name}_Shin_{side}")
        family = [obj.vertex_groups.get(f"{name}_{part}_{side}") for part in ("Foot", "Toe")]
        family = [g for g in family if g is not None]
        if shin is None or not family:
            continue
        ids = {g.index for g in family}
        for v in obj.data.vertices:
            extra = sum(g.weight for g in v.groups if g.group in ids)
            if extra <= 0:
                continue
            s = next((g.weight for g in v.groups if g.group == shin.index), 0.0)
            shin.add([v.index], s + extra, "REPLACE")
            for g in family:
                g.remove([v.index])


def split_weights(obj, name, marks, near):
    """Shares each foot's Shin weight on obj out to its Foot and Toe bones. Returns how many points moved."""
    mw = obj.matrix_world
    moved = 0
    for side, _ in SIDES:
        m = marks[side]
        shin = obj.vertex_groups.get(f"{name}_Shin_{side}")
        if shin is None:
            continue
        foot_g = obj.vertex_groups.get(f"{name}_Foot_{side}") or obj.vertex_groups.new(name=f"{name}_Foot_{side}")
        toe_g = obj.vertex_groups.get(f"{name}_Toe_{side}") or obj.vertex_groups.new(name=f"{name}_Toe_{side}")
        for v in obj.data.vertices:
            s = next((g.weight for g in v.groups if g.group == shin.index), 0.0)
            if s <= 0:
                continue
            p = mw @ v.co
            if p.z > 0.2:
                continue
            if near is not None and near[side].find(p)[2] > NEAR_FOOT:
                continue
            wf, wt = weights(m, p)
            if wf * s < LEAST:
                continue
            on_shin, on_foot, on_toe = s * (1 - wf), s * wf * (1 - wt), s * wf * wt
            for group, w in ((shin, on_shin), (foot_g, on_foot), (toe_g, on_toe)):
                if w >= LEAST:
                    group.add([v.index], w, "REPLACE")
                else:
                    group.remove([v.index])
            moved += 1
    return moved


def apply(rig, meshes, name="Female"):
    """Gives her the foot bones and shares the Shin bones' weight out to them. Returns a summary."""
    meshes = [o for o in meshes if o.type == "MESH" and not o.name.startswith(f"{name}_Shoes")]
    body = next(o for o in meshes if o.name == f"{name}_Body")
    for obj in meshes:
        _fold_back(obj, name)
    marks = landmarks(name, body)
    make_bones(rig, name, marks)
    # Her foot's skin, to keep the sharing to things on her feet.
    near = {}
    for side, sx in SIDES:
        pts = [body.matrix_world @ v.co for v in body.data.vertices]
        pts = [p for p in pts if p.x * sx > 0.03 and p.z < 0.16]
        tree = KDTree(len(pts))
        for i, p in enumerate(pts):
            tree.insert(p, i)
        tree.balance()
        near[side] = tree
    counts = {}
    for obj in meshes:
        moved = split_weights(obj, name, marks, None if obj is body else near)
        if moved:
            counts[obj.name] = moved
    return {
        "marks": {s: {k: (tuple(round(c, 4) for c in v) if isinstance(v, Vector) else round(v, 4))
                      for k, v in m.items() if k != "sx"} for s, m in marks.items()},
        "meshes": counts,
    }


def tip_axis(m):
    """The axis a foot tips about (world, horizontal, across the foot): a positive turn lifts the heel."""
    return Vector((0, 0, 1)).cross(m["dir"]).normalized()


def tip_angle(m, rise):
    """How far to tip foot m so its heel stands `rise` above the ball of its foot."""
    reach = (m["ball"] - m["heel"]).to_2d().length
    return math.asin(min(0.95, rise / reach)) if rise > 0 else 0.0
