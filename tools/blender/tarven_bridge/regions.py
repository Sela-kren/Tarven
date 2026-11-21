"""Her skin's painted regions put right on her hand sculpt (2026-11-20), and her underwear layer kept under her
clothes.

- The game paints parts of her skin as her smallclothes: T_bra (her breast band) and T_smalls (her braies/briefs).
  On her (sculpt and swap build alike, the swap having spread them from the old body) those regions had grown to her
  collarbone, over her whole back and down her thighs, so her breast band was drawn up to her neck. They are redrawn
  by her shape: the band round her bust, the briefs round her hips and groin.
- Her underwear layer (T_lingerie, a decal the game draws her bra and briefs on) was laid at the build's height over
  her skin, more than her new leggings stand off it, so it showed through them: it is pressed down to LIFT over her.

  D:/blender/blender.exe -b <master>.blend --python tools/blender/tarven_bridge/regions.py -- <build.blend> <out.blend>
"""
import os
import sys

import bpy
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:]
BUILD, OUT = argv[0], argv[1]
REGIONS = ("T_skin_f", "T_bra", "T_smalls")
LIFT = 0.0006

body = bpy.data.collections[core.MASTER_COLLECTION].all_objects["Female_Body"]
with bpy.data.libraries.load(BUILD, link=False) as (src, dst):
    dst.objects = ["Female_Body"]
built = dst.objects[0]


def plain(name):
    stem, _, tail = name.rpartition(".")
    return stem if stem and tail.isdigit() else name


bnames = [plain(s.material.name) if s.material else "" for s in built.material_slots]
bw = built.matrix_world
faces = [p for p in built.data.polygons if bnames[p.material_index] in REGIONS]
tree = BVHTree.FromPolygons([bw @ v.co for v in built.data.vertices], [p.vertices[:] for p in faces])
region_of = [bnames[p.material_index] for p in faces]

names = [s.material.name if s.material else "" for s in body.material_slots]
slot = {n: names.index(n) for n in REGIONS if n in names}
hw = body.matrix_world
# The build's own regions are as overgrown (the swap spread them from the old body), so they are drawn by her shape:
# her breast band round her bust, just under it to just over it in front and a band behind; her briefs round her
# hips and groin, their leg openings rising from her crotch to her hip bones.
BAND = {"front": (1.195, 1.37), "back": (1.22, 1.31)}
BRIEFS = (0.84, 1.01)


def region(c):
    if c.z > 1.1:
        lo, hi = BAND["front"] if c.y > 0.04 else BAND["back"]
        return "T_bra" if lo <= c.z <= hi and abs(c.x) < 0.2 else "T_skin_f"
    lo, hi = BRIEFS
    if not lo <= c.z <= hi or abs(c.x) > 0.24:
        return "T_skin_f"
    # The leg openings: near her crotch only the middle; by her hip bones all the way round.
    return "T_smalls" if c.z > 0.93 or abs(c.x) < 0.05 + (c.z - lo) * 1.6 else "T_skin_f"


# Her arms and hands (by their bones' weights) are never under her smallclothes, however near they hang.
limb = {g.index for g in body.vertex_groups if any(k in g.name for k in ("Arm", "Hand"))}


def armish(poly):
    total = limbs = 0.0
    for v in poly.vertices:
        for g in body.data.vertices[v].groups:
            total += g.weight
            if g.group in limb:
                limbs += g.weight
    return total > 0 and limbs / total > 0.4


before = {n: 0 for n in REGIONS}
after = {n: 0 for n in REGIONS}
for p in body.data.polygons:
    name = names[p.material_index]
    if name not in REGIONS:
        continue
    before[name] += 1
    want = "T_skin_f" if armish(p) else region(hw @ p.center)
    if want in slot:
        p.material_index = slot[want]
        after[want] += 1

# Her underwear layer pressed down onto her skin.
lingerie = {i for i, n in enumerate(names) if n == "T_lingerie"}
skin_faces = [p.vertices[:] for p in body.data.polygons if names[p.material_index] in REGIONS]
skin = BVHTree.FromPolygons([hw @ v.co for v in body.data.vertices], skin_faces)
layer = {v for p in body.data.polygons if p.material_index in lingerie for v in p.vertices}
inv = hw.inverted()
pressed = 0
for v in layer:
    p = hw @ body.data.vertices[v].co
    loc, n, _i, _d = skin.find_nearest(p, 0.05)
    if loc is not None and (p - loc).dot(n) > LIFT:
        body.data.vertices[v].co = inv @ (loc + n * LIFT)
        pressed += 1
body.data.update()

# The old body's bust fixes, brought in with the overlays from the build: on her they'd shift the overlays at each
# cup (her points carry zeros). Gone.
for name in [a.name for a in body.data.attributes if a.name.startswith("_BUST_FIX_")]:
    body.data.attributes.remove(body.data.attributes[name])
bpy.data.objects.remove(built, do_unlink=True)
bpy.ops.outliner.orphans_purge(do_recursive=True)
print("regions: before", before, "after", after, "; underwear layer points pressed down:", pressed)
core.relink_textures()
bpy.ops.wm.save_as_mainfile(filepath=OUT, relative_remap=True)
print("saved", OUT)
