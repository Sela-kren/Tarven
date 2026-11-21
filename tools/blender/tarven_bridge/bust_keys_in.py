"""Brings the user's sculpted cup keys (art/female_bust_keys.blend: Bust_A, Bust_F, ...) into the game, as the cup fixes
the game already blends by the bust slider ("_BUST_FIX_<cup>" on her skin, appearance.ts cupFixAmount: all of it at
that cup, fading to none at the reviewed cups either side).

Each key was made from the game's own shaping at its cup (ref/_sculpt_work/bustkeys/make_bust_keys.py), and that
first state is kept in ref/_sculpt_work/bustkeys/keys_as_made.npz: the fix is the user's sculpt, key now - key as
made, point for point (the keys file is a copy of the master's body, same points). The overlay patches the keys file
hides from the brush (underwear and pubic patches, its "Hidden" slot) take the move of the skin round them, so they
stay on it.

  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/bust_keys_in.py -- [all|A,F] [out.blend]

With no out.blend it backs the master up to ref/_sculpt_backups and saves over it. Then Send (npm run send).
"""
import os
import shutil
import sys
import time

import bpy
import numpy as np
from mathutils.kdtree import KDTree

sys.path.insert(0, os.path.dirname(os.path.realpath(__file__)))
import core  # noqa: E402

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
# Which cups: as given ("A,F"), or "all" (the default): every Bust_<cup> key in the keys file.
CUPS_ARG = argv[0] if argv else "all"
OUT = argv[1] if len(argv) > 1 else None
ROOT = core.repo_root()
KEYS_FILE = os.path.join(ROOT, "art", "female_bust_keys.blend")
AS_MADE = os.path.join(ROOT, "ref", "_sculpt_work", "bustkeys", "keys_as_made.npz")
NEAREST = 4
# Moves worked out against the game's shaping as it is now (TARVEN_BUST_MOVES=<file.npz>, one world-space array per
# cup, per point of her skin): the game's shaping changes, and a fix measured against the shaping the keys were made
# from lands the cup somewhere else (2026-11-21: up to 25 mm at A). bust_keys_fit.py works these out.
MOVES = np.load(os.environ["TARVEN_BUST_MOVES"]) if os.environ.get("TARVEN_BUST_MOVES") else None
# "keys" (the default since 2026-11-21): each key goes in whole, as a blend shape, "_BUST_KEY_<cup>" = the key less
# the C cup it was made with (the keys file's Basis as made); the game makes her cup from these instead of its own
# cup code (appearance.ts cupKeyMove), so it shows exactly what was sculpted. "fix": the old per-cup corrections.
MODE = os.environ.get("TARVEN_BUST_MODE", "keys")
OVERLAYS = ("T_lingerie", "T_pubic")

body = bpy.data.collections[core.MASTER_COLLECTION].all_objects["Female_Body"]
n = len(body.data.vertices)

# The keys file's body, appended under another name and removed again afterwards.
with bpy.data.libraries.load(KEYS_FILE, link=False) as (src, dst):
    dst.meshes = ["Female_Body"]
keys_mesh = dst.meshes[0]
try:
    if len(keys_mesh.vertices) != n:
        raise SystemExit(f"keys file has {len(keys_mesh.vertices)} points, the master {n}: the keys no longer fit")
    # The overlay patches the keys file hides from the brush: her underwear and pubic patches.
    slots = [s.material.name if s.material else "" for s in body.material_slots]
    hidden = sorted({v for p in body.data.polygons if slots[p.material_index] in OVERLAYS for v in p.vertices})
    mw = np.array(body.matrix_world)
    made = np.load(AS_MADE)
    blocks = keys_mesh.shape_keys.key_blocks
    every = [k.name[5:] for k in blocks if k.name.startswith("Bust_") and len(k.name) == 6]
    CUPS = every if CUPS_ARG.lower() == "all" else [c.strip().upper() for c in CUPS_ARG.split(",") if c.strip()]
    if CUPS_ARG.lower() == "all":
        # Keys no longer in the file (Q and Z went when the slider stopped at O) go from the master too.
        for attr in [a.name for a in body.data.attributes if a.name.startswith(("_BUST_KEY_", "_BUST_FIX_"))]:
            if attr[-1] not in CUPS:
                body.data.attributes.remove(body.data.attributes[attr])
                print(f"bust_keys_in: removed {attr}")
    rot = mw[:3, :3]
    for cup in CUPS:
        name = f"Bust_{cup}"
        now = np.empty(n * 3)
        blocks[name].data.foreach_get("co", now)
        before = made["Basis"] if MODE == "keys" else made[name]
        move = MOVES[cup].copy() if MOVES is not None else (now.reshape(-1, 3) - before) @ rot.T  # world space
        # The hidden overlay points: the move of the nearest skin points, as the key was made.
        is_hidden = np.zeros(n, bool)
        is_hidden[hidden] = True
        world = before @ rot.T + mw[:3, 3]
        skin = np.nonzero(~is_hidden)[0]
        tree = KDTree(len(skin))
        for k, v in enumerate(skin):
            tree.insert(world[v], k)
        tree.balance()
        for v in hidden:
            found = tree.find_n(world[v], NEAREST)
            w = np.array([1.0 / max(d, 1e-5) for _, _, d in found])
            move[v] = (w[:, None] * move[skin[[i for _, i, _ in found]]]).sum(0) / w.sum()
        yup = np.stack([move[:, 0], move[:, 2], -move[:, 1]], axis=1).astype(np.float32)
        for old in (f"_BUST_FIX_{cup}", f"_BUST_KEY_{cup}"):
            attr = body.data.attributes.get(old)
            if attr is not None:
                body.data.attributes.remove(attr)
        attr = body.data.attributes.new(f"_BUST_{'KEY' if MODE == 'keys' else 'FIX'}_{cup}", "FLOAT_VECTOR", "POINT")
        attr.data.foreach_set("vector", yup.ravel())
        size = np.linalg.norm(move, axis=1)
        print(f"bust_keys_in: {cup}: {int((size > 1e-4).sum())} points move, most {size.max() * 1000:.1f} mm")
finally:
    bpy.data.meshes.remove(keys_mesh)
    bpy.ops.outliner.orphans_purge(do_recursive=True)

if OUT is None:
    backups = os.path.join(ROOT, "ref", "_sculpt_backups")
    os.makedirs(backups, exist_ok=True)
    backup = os.path.join(backups, f"female_master_{time.strftime('%Y%m%d_%H%M%S')}_before_bust_keys_in.blend")
    shutil.copy2(core.master_path(), backup)
    print("backed up to", backup)
    OUT = core.master_path()
core.save_blend(OUT)
print("saved", OUT)
