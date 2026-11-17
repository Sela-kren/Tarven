# real_heroin

real_heroin is the heroine built from scratch: a signed-distance-field sculpt meshed into a game body and head. It
replaces the old ring-built "Female" body. This folder holds every script that builds her, swaps her into the game rig,
paints her skin, or cleans up her hand sculpt. Nothing else in `tools/blender/` should hold real_heroin code.

## Layout

| Path | What it does |
|---|---|
| `heroine/` | Her shared code: `sdf.py` (skeleton and body field), `body_mesh.py`, `head_form.py`, `head_mesh.py`, `nails.py`, the head proportion tables, and `ref_specs/` (the measured reference heroines). |
| `build_body.py` | Builds her body (`Body_game`) and writes `<out>/body.blend`. |
| `build_head.py` | Builds her head (`Head_game` and eyes) and writes `<out>/head.blend`. |
| `build_heroine.py` | Older one-piece build: the whole SDF meshed with OpenVDB. Kept for comparison. |
| `real_heroin_swap.py` | Puts her into the game: her meshes become the Female rig's skin. Called by `build_world.py` when `"real_heroin": True` (currently off). |
| `sculpt_fit.py` | Superseded: pulls the old skin onto her forms. Called by `build_world.py` when `"sculpt_fit": True` (off). `real_heroin_swap.py` also uses it. |
| `skin_paint.py` | Her painted skin atlas, sampled from her SDF. It can also paint the old Female body. |
| `sculpt/` | Cleanup scripts for the hand sculpt in `art/real_heroin_sculpt.blend` (vulva remesh, mask lift, mask subdivide, anus fix) and render helpers to check them. |

## Running

All scripts run headless from the repo root, with Blender at `D:\blender`:

```
blender -b --factory-startup --python tools/blender/real_heroin/build_body.py -- <out dir> [subdivision levels]
blender -b --factory-startup --python tools/blender/real_heroin/build_head.py -- <out dir> [subdivision levels]
```

Each script finds `heroine/` next to itself, so the folder works from wherever it sits.

The `sculpt/` scripts take their settings from environment variables (see each file's docstring) and write a copy with
`OUT=<path>`. Without `OUT` they change the open Blender file. `outer_lips.py` needs `SELF=<its own path>` so it can find
`vulva_remesh3.py`.

## Rules, so sessions don't collide

- **Edit the code here, not a copy.** Agents keep test copies of the head scripts in `ref/_head_work/` (git-ignored). Those
  are stale snapshots, so a fix belongs in this folder.
- **Keep shared code in `tools/blender/`.** `build_world.py`, `knight_kit.py` and `build_grass.py` stay there, and
  `build_world.py` reaches into this folder only through the two optional imports above.
- **Name a new character's folder after it.** A new generated human gets its own folder, e.g. `tools/blender/<name>/`, with
  its own copy of `heroine/` or a shared package, so it never edits real_heroin's files.
- **Don't commit caches.** `__pycache__/` and `*.pyc` are git-ignored, because they change on every run.

## Art files

- `art/real_heroin_sculpt.blend`: the hand sculpt. The game doesn't read it until it is exported.
- `ref/_sculpt_backups/`: backups taken before each scripted change to the sculpt (git-ignored).
- `ref/_sculpt_work/`: scratch renders and test copies (git-ignored).
