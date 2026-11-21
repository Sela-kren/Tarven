"""
Her soft bust bones: four on each breast, after 2AM's "4 bones" jiggle setup
(https://www.youtube.com/watch?v=jk8_7dqoTv8, studied 2026-11-21):

  BustOuter_<side>  the whole breast (the video's bone 1), a child of the Bust bone
  BustTip_<side>    the middle of it, round the nipple (bone 2), a child of BustOuter: it swings on top of it
  BustTop_<side>    a small patch on its upper slope (bone 3, a "jiggle enhancer"), a child of BustOuter
  BustSide_<side>   a small patch on its outer side (bone 4, likewise), a child of BustOuter

The video's enhancers are weighted without Auto Normalize, adding to the others; a glTF's weights always add up to
one, so here they take their share from BustOuter and hang from it, which comes to the same: they move with it and
then by themselves.

Every point keeps exactly the weight the Bust bone had on it, split among the Bust bone and these, so the game's
bust sliders, which shape her by that weight, shape her as before (appearance.ts counts the whole family as Bust).
The game springs each of them (SOFT_BUST in src/game/player.ts).

apply(rig, meshes) runs on a build (build_world.main) and on the master (tarven_bridge/bust_bones.py, merge_build):
it puts the weights back on the Bust bone first, so it can run again.
"""
import math

import bpy
from mathutils import Vector

SIDES = (("L", -1), ("R", 1))
PARTS = ("Outer", "Tip", "Top", "Side")
# Each part's patch of the breast, as a share of the breast's weight: the most it takes, how far it reaches (in breast
# radii), and where its middle is, (out, up) in radii from the nipple. The video's bone 2 is 0.7 to 0.9 at the nipple
# and the enhancers 0.45, in small round patches blurred in.
PATCHES = {
    "Tip": {"most": 0.8, "reach": 0.55, "at": None},
    "Top": {"most": 0.45, "reach": 0.5, "at": (0.0, 0.7)},
    "Side": {"most": 0.45, "reach": 0.5, "at": (0.75, 0.0)},
}
# Of the Bust bone's weight, how much the breasts take, by that weight as a share of its most: none at the edge of the
# bust's region (her chest round her breasts stays on the Bust bone), all of it on the breasts themselves.
CORE = (0.25, 0.75)
# Either side of her middle, in metres, the skin of her cleavage shades from one breast's bones to the other's.
MIDDLE = 0.012
BONE_LENGTH = 0.04
MOST_BONES = 4  # a glTF point takes at most four bones
LEAST = 1e-3


def bone_names(name):
    return [f"{name}_Bust{part}_{side}" for side, _ in SIDES for part in PARTS]


def _parent(bone, name):
    """The bone a family member's weight folds back into."""
    if bone == f"{name}_Bust":
        return None
    part, side = bone[len(name) + 5:].split("_")
    return f"{name}_Bust" if part == "Outer" else f"{name}_BustOuter_{side}"


def _ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def _fall(t):
    """1 at the middle of a patch, easing to 0 at its edge (t = 1)."""
    return 0.0 if t >= 1 else (1 - t * t) ** 2


def landmarks(name, body, meshes):
    """Each breast's nipple and size, in world space, from where the Bust bone's weight sits on her skin (and her
    nipple jewellery, when she has it, for the nipples)."""
    group = body.vertex_groups.get(f"{name}_Bust")
    if group is None:
        raise RuntimeError(f"{body.name} has no {name}_Bust weights")
    gi = group.index
    mw = body.matrix_world
    points = {side: [] for side, _ in SIDES}
    for v in body.data.vertices:
        w = next((g.weight for g in v.groups if g.group == gi), 0.0)
        if w > 0:
            p = mw @ v.co
            points["L" if p.x < 0 else "R"].append((p, w))
    # Her nipples are the areola discs on her skin (nipples.ts shapes them; nipple_move.py placed them).
    slots = [s.material.name if s.material else "" for s in body.material_slots]
    disc = {i for p in body.data.polygons if slots[p.material_index] == "T_areola" for i in p.vertices}
    jewel = next((o for o in meshes if o.name == f"{name}_JewelNipples"), None)
    out = {}
    for side, sx in SIDES:
        pts = points[side]
        most = max(w for _, w in pts)
        core = [p for p, w in pts if w >= 0.9 * most]
        ds = [mw @ body.data.vertices[i].co for i in disc]
        ds = [p for p in ds if (p.x < 0) == (sx < 0)]
        if ds:
            nipple = sum(ds, Vector()) / len(ds)
        elif jewel is not None:
            js = [jewel.matrix_world @ v.co for v in jewel.data.vertices]
            js = [p for p in js if (p.x < 0) == (sx < 0)]
            nipple = sum(js, Vector()) / len(js)
        else:
            front = max(p.y for p in core)
            tip = [p for p in core if p.y >= front - 0.003]
            nipple = sum(tip, Vector()) / len(tip)
        half = [p for p, w in pts if w >= 0.5 * most]
        rms = math.sqrt(sum((p.x - nipple.x) ** 2 + (p.z - nipple.z) ** 2 for p in half) / len(half))
        out[side] = {"nipple": nipple, "radius": rms * math.sqrt(2), "most": most, "sx": sx}
    return out


def _shares(p, marks):
    """How a breast's weight at world point p splits among its four bones: {part: share}, summing to 1."""
    n, r, sx = marks["nipple"], marks["radius"], marks["sx"]
    take = {}
    for part, patch in PATCHES.items():
        if patch["at"] is None:
            d = (p - n).length
        else:
            cx = n.x + sx * patch["at"][0] * r
            cz = n.z + patch["at"][1] * r
            d = math.hypot(p.x - cx, p.z - cz)
        take[part] = patch["most"] * _fall(d / (patch["reach"] * r))
    total = sum(take.values())
    if total > 0.9:
        take = {k: v * 0.9 / total for k, v in take.items()}
    take["Outer"] = 1.0 - sum(take.values())
    return take


def make_bones(rig, name, marks):
    """The eight bones, under the Bust bone, pointing up as every other bone of hers does (so the game's springs move
    them along the same axes as the Bust bone's)."""
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
        n, r, sx = m["nipple"], m["radius"], m["sx"]
        heads = {
            # In the breast, behind the nipple: where it hangs from.
            "Outer": n + Vector((0, -0.6 * r, 0)),
            "Tip": n,
            "Top": n + Vector((sx * PATCHES["Top"]["at"][0] * r, -0.3 * r, PATCHES["Top"]["at"][1] * r)),
            "Side": n + Vector((sx * PATCHES["Side"]["at"][0] * r, -0.3 * r, PATCHES["Side"]["at"][1] * r)),
        }
        for part in PARTS:
            bone = bones.new(f"{name}_Bust{part}_{side}")
            head = to_rig @ heads[part]
            bone.head = head
            bone.tail = head + Vector((0, 0, BONE_LENGTH))
            bone.roll = 0.0
            bone.use_deform = True
            bone.parent = bones[f"{name}_Bust"] if part == "Outer" else bones[f"{name}_BustOuter_{side}"]
    bpy.ops.object.mode_set(mode="OBJECT")


def split_weights(obj, name, marks):
    """Puts the Bust family's weight on obj back on the Bust bone, then shares it out again. Returns how many points
    took the breasts' bones."""
    bust = obj.vertex_groups.get(f"{name}_Bust")
    if bust is None:
        return 0
    family = [bust.name] + bone_names(name)
    groups = {n: (obj.vertex_groups.get(n) or obj.vertex_groups.new(name=n)) for n in family}
    by_index = {g.index: n for n, g in groups.items()}
    most = max(m["most"] for m in marks.values())
    mw = obj.matrix_world
    moved = 0
    plan = []
    for v in obj.data.vertices:
        mine = {by_index[g.group]: g.weight for g in v.groups if g.group in by_index}
        b = sum(mine.values())
        if b <= 0:
            continue
        others = {g.group: g.weight for g in v.groups if g.group not in by_index and g.weight > 1e-6}
        p = mw @ v.co
        share = b * _ease((min(1.0, b / most) - CORE[0]) / (CORE[1] - CORE[0]))
        new = {bust.name: b - share}
        if share > 0:
            left = _ease((MIDDLE - p.x) / (2 * MIDDLE))
            for side, s in (("L", left), ("R", 1 - left)):
                if s <= 0:
                    continue
                for part, k in _shares(p, marks[side]).items():
                    new[f"{name}_Bust{part}_{side}"] = new.get(f"{name}_Bust{part}_{side}", 0) + share * s * k
            moved += 1
        # Too small to keep: onto the bone it hangs from.
        for bone in sorted(new, key=lambda n: -len(n)):
            if bone != bust.name and new[bone] < LEAST:
                up = _parent(bone, name)
                new[up] = new.get(up, 0) + new.pop(bone)
        # At most four bones a point, counting hers that aren't the bust's: the smallest of the family folds into the
        # bone it hangs from (the Bust bone, when it's the smallest, into the bigger breast's), the family's sum kept.
        while len([w for w in new.values() if w > 0]) + len(others) > MOST_BONES:
            live = [n for n, w in new.items() if w > 0]
            if len(live) <= 1:
                break
            small = min(live, key=lambda n: new[n])
            up = _parent(small, name) or max((n for n in live if n != small), key=lambda n: new[n])
            new[up] = new.get(up, 0) + new.pop(small)
        plan.append((v.index, list(mine), new))
    for index, had, new in plan:
        for n in had:
            groups[n].remove([index])
        for n, w in new.items():
            if w > 0:
                groups[n].add([index], w, "REPLACE")
    return moved


def apply(rig, meshes, name="Female"):
    """Gives her the soft bust bones and shares the Bust bone's weight out to them on every mesh. Returns a summary."""
    meshes = [o for o in meshes if o.type == "MESH"]
    body = next(o for o in meshes if o.name == f"{name}_Body")
    # The landmarks from her skin as the Bust bone alone weighted it.
    for obj in meshes:
        _fold_back(obj, name)
    marks = landmarks(name, body, meshes)
    make_bones(rig, name, marks)
    counts = {}
    for obj in meshes:
        moved = split_weights(obj, name, marks)
        if moved:
            counts[obj.name] = moved
    return {
        "marks": {s: {"nipple": tuple(round(c, 4) for c in m["nipple"]), "radius": round(m["radius"], 4)}
                  for s, m in marks.items()},
        "meshes": len(counts), "points": sum(counts.values()),
    }


def _fold_back(obj, name):
    """Every soft bust bone's weight back onto the Bust bone (for running apply again)."""
    bust = obj.vertex_groups.get(f"{name}_Bust")
    family = [obj.vertex_groups.get(n) for n in bone_names(name)]
    family = [g for g in family if g is not None]
    if bust is None or not family:
        return
    ids = {g.index for g in family}
    for v in obj.data.vertices:
        extra = sum(g.weight for g in v.groups if g.group in ids)
        if extra <= 0:
            continue
        b = next((g.weight for g in v.groups if g.group == bust.index), 0.0)
        bust.add([v.index], b + extra, "REPLACE")
        for g in family:
            g.remove([v.index])
