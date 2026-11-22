# Blender bridge: her in Blender = her in the game

Her **master** is `art/female_master.blend`. You edit it in Blender, and **Send to game** puts exactly that in
the game. There is one copy of the shaping code: Blender never works a slider out itself. A small server runs
the game's own `Dresser` and `face.ts`, and shows Blender what the game would show.

## Setup (once)
- The add-on is `tools/blender/tarven_bridge`. A junction links it into Blender's add-on folder
  (`%APPDATA%\Blender Foundation\Blender\5.1\scripts\addons\tarven_bridge`), and it is enabled in the preferences.
- Open `art/female_master.blend`. The **Tarven** tab is in the 3D view's sidebar (N).
- The game's dev server (`npm run dev`) reloads the game by itself whenever a model or paint file changes
  (`vite.config.ts`). `devresume.ts` then puts the game back where it was.

## The panel
| Part | What it does |
|---|---|
| **Send to game** | Exports the `FemaleRig` collection with build_world's own `export_collection`, packs it smaller (`glb_pack.py`) and splits her outfits into files of their own (`glb_split.py`): `public/models/female.glb` (her body, hair, shoes, jewellery, stains, the tavern dress, skeleton) plus `public/models/female/<Outfit>.glb`. The paint layers go along too. Every piece goes out, hidden ones included. Takes about 20 s. Headless: `npm run send`. |
| **Game view** | **Start server** runs `npm run bridge` (or run it yourself). Every game slider, the outfit, hair, bust shape, posed/undressed, **Start look** (what the player sees first) and **As built**. The GameView meshes sit beside the master and are never exported or saved. **Master shows the same** hides the master's other outfits, hair and shoes, as the game does. |
| **Face** | Expression picks one of the game's expressions and the game view shows it: its brows, eyes and mouth are her face's **shape keys** (below), with the face's numbers over them (blink, lookX, lookY, pupil, blush, crease, wet, tears, heart, sweat), which the sliders change. **Reset** puts the expression's own numbers back. (Before 2026-11-21 this panel edited 30 face numbers in `face.ts`, with Save and Fit; those are gone with the face rig they drove.) |
| **Edit game view** | Sculpt or move points on the game view at any slider setting (e.g. J cup in the tee). **Apply edits to master** carries the moves onto the master, sends, re-shapes and refines (up to 3 passes, aiming for under 0.5 mm; the test came to 0.57 mm). |
| **Cloth (drape)** | Blender's cloth simulation, baked for the game. **Preview drape** simulates the garment she has on at the game view's cup and shows it there; nothing is stored. **Bake drape** Sends first, then simulates at each chosen cup (default A,C,F,J,M,Q,U,Z): the garment is welded and dropped over her game-shaped body as a collider, with the top of each piece and her sleeves pinned and her legwear left out. It stores the cloth's move from the game's own fit as `_CLOTH_DRAPE_<cup>` on the master garment, then Sends again. The game lays these on last, blended by the bust slider like the bust fixes, so at a baked cup it shows the simulated cloth exactly (checked: 0.000 mm at J). About 70 s per cup. **Clear drapes** removes them. |
| **Paint (2K)** | **Paint this object** gives the selected object (or her body) a second UV map, `Paint`, and a clear 2048 px picture `art/paint/P_<object>.png`, then opens Texture Paint. Clear pixels show the game's own colour, recolours included. Painted pixels show the paint. |
| **Game look** | Flat, diffuse Solid shading with her blocky textures, plus a `GameCamera` with the game's 32° view from (0, 10, 10). |
| **Game shot** | The open game page (`npm run dev`, in a browser) draws her from the scene's camera with its full screen pass and sends the frame back. It loads as the image `GameShot`. The relay is in `vite.config.ts` (`/__tarven/view`, `/__tarven/shot`) and the game side in `src/game/devview.ts`. |

## What's done where
- `tools/bridge/server.preview.ts` (`npm run bridge`, port 8765): `/schema`, `/shape`, `/rest`, `/reload`. It loads her
  face keys as the game does. Shaping takes about 1 s per change. The server reads the GLB's own textures
  (`tools/bridge/png.ts`), so the look's dyes and tones come out as in the game. Recoloured parts show in the game
  view as flat GV_ materials.
- `tools/blender/tarven_bridge/`:
  - `core.py`: paths and the export.
  - `gameview.py`: the game view and edits back.
  - `face_keys.py`, `face_keys_build.py`, `face_keys_out.py`: her face's shape keys (below).
  - `paint.py`: the paint layers.
  - `merge_build.py`: merging a new build into the master.
  - `glb_diff.py`: compares two GLBs.
  - `export_master.py`: headless Send.
  - `bust_bones.py`: gives the master her soft bust bones (`tools/blender/bust_soft.py`: four on each breast under
    `Female_Bust`, sharing its weight on every mesh; build_world and merge_build run it too). Safe to run again.
- `tools/blender/build_world.py`: `TARVEN_SAVE_MASTER=<path.blend>` saves her rig as a master. `TARVEN_OUT` sends
  the GLBs to a scratch folder. `main()` now only runs as a script, so the bridge can import its export.
- `src/game/paint.ts` and `retro.ts`: the paint layers are one texture array shared by every retro material. A
  mesh's `uv1` u value says which layer it uses (1 + layer); a mesh without `uv1` isn't painted.

## Her model's files (2026-11-22)
Send writes her model smaller and in pieces. The game shows exactly the same thing: every outfit at four cups, standing
and posed, matches to 0.0000 mm (`tools/bridge/dressersnap.preview.ts`, `glbpackcheck.preview.ts`).

- **Packed** (`tools/blender/glb_pack.py`): her per-cup keys (`_BUST_KEY_*`, `_BUST_FIX_*`, `_CLOTH_DRAPE_*`) are stored
  sparse, only the points that move. Normals are 8-bit and 0–1 UVs 16-bit (KHR_mesh_quantization); the game turns them
  back into floats as it loads (`src/game/unpack.ts`). Positions and skin weights are left exact: the face keys find
  points by position, and 16-bit weights moved some cloth up to 1.6 mm (the "four heaviest bones" pick in
  `skinWeightsOnto`). The model went from 72.6 MB to 52.5 MB.
- **Split** (`tools/blender/glb_split.py`): the base `female.glb` is 23 MB, and each of the 21 outfits is 0.6–2.7 MB in
  `public/models/female/`. The base lists them in `asset.extras.tarvenOutfits`.
  - The game (`src/game/outfitfiles.ts`) loads the base and her start outfit, and fetches the rest one by one 3 s after
    the game starts.
  - Putting on an outfit that isn't in yet keeps what she had on until it arrives (`game.ts` lookToShow). Guests wear
    their plain clothes until theirs is in.
  - An arriving outfit is bound onto her bones by name (`attachOutfit`), fitted by her Dresser (`Dresser.addMeshes`,
    which does the same setup the constructor does), and outlined.
- **The tools** see the whole model as before: `stripImages` (`tools/posepreview/raster.ts`) merges the outfit files
  back in (`glbmerge.ts`), and `python tools/blender/glb_split.py merge <base> <out>` does the same in Python.
- A code build that writes a single full `female.glb` still works: without the outfit list, the game just has every
  outfit already.

## Her face's shape keys (2026-11-21)
Her expressions are shape keys, the way Karryn's Prison layers a face: one expression's brows, another's eyes, a third's
mouth. The game plays them as morph targets (`src/game/face.ts`, `facekeys.ts`); nothing in code moves her face's points
any more.

- **The file:** `art/female_face_keys.blend`. It holds her head (the master's `Female_Body` cut at the neck, z > 1.40 m) and
  her face's pieces: `Brows`, `Mouth`, `Eye_L`, `Eye_R`, `Lash_L`, `Lash_R`. The master itself has no face keys.
- **The keys (79), the same on every piece:**
  - `Brow_<expression>`, `Eye_<expression>`, `Mouth_<expression>` for the 24 expressions. `neutral` is Basis.
  - `Blink` (lids shut), `Look_Left/Right/Up/Down` (her own left/right; she faces +Y, her right is +X), and
    `Pupil_Big/Small`.
  - Every piece's key values follow `Face`'s (drivers). Tarven tab > **Face keys** > **Show** sets a whole expression.
  - **Sculpt <key> on all pieces** pins that key on every piece for sculpting.
- **To the game:** **Send face keys** writes `public/models/female_face.json` (only the points each key moves). The dev
  server reloads the game, and the bridge server reloads. Headless:
  `D:/blender/blender.exe -b art/female_face_keys.blend --python tools/blender/tarven_bridge/face_keys_out.py`.
- **How the game finds the points:** by where they sit in Basis (to 0.002 mm), so the file doesn't depend on the GLB's
  vertex order. Don't sculpt Basis. If the master's face is reshaped, the keys file has to be rebuilt on it, and the
  game warns in the console about points it can't find.
- **Where the first shapes came from:**
  - Brows and mouths were baked from the old face rig (`src/game/facerig.ts`, `tools/bridge/facebake.preview.ts`); they
    match what the game showed before to 0.001 mm.
  - `Look_*` turn each eyeball 16° about its fitted centre.
  - `Pupil_Big/Small` are the master eyes' own keys. The exporter never sent the master's eye keys (it writes Basis), so
    the game hadn't had them before.
  - **The `Eye_*` keys and `Blink` are empty.** The old rig closed the old face's separate lid pieces; her new lids are
    her face skin, which it never moved. Sculpt them.
- **Building it again:** `face_keys_build.py` never writes over an existing keys file unless `FORCE=1`, and backs it up
  to `art/_backups` first. Rebuilding throws away sculpted keys. It is built from a bake of a GLB exported from the
  current master:
  ```
  $env:FACEBAKE_MODEL="<that glb>"; $env:FACEBAKE_OUT="ref/_bridge/face_baked.json"; npx vitest run -c tools/bridge/facebake.config.ts
  D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/face_keys_build.py -- ref/_bridge/face_baked.json
  ```
- **Checking:** `npx vitest run -c tools/bridge/facekeyscheck.config.ts` loads the model and keys as the game does. It
  reports how far each expression has moved from the old rig.

## When the build code changes (keeping your edits)
```
D:/blender/blender.exe -b art/female_master.blend --python tools/blender/tarven_bridge/merge_build.py -- [--dry]
```
- It builds her fresh and compares three versions of each object: your master, the baseline
  (`art/female_master_baseline.blend`, her as last built) and the new build.
- An object you didn't touch takes the new build.
- An object only you changed keeps your version.
- An object both changed takes the new build plus your moves.
- Materials you changed are kept. Names stay plain (`T_skin_f`, never `T_skin_f.001`).
- It backs the master up to `ref/_sculpt_backups` first. If the master is open in Blender, revert it there
  afterwards, without saving first.

## Checked (2026-11-20)
- **Export:** an unedited master exports the same GLB as a code build (0 m difference; only build_world's
  factory cube is gone). Sending from the open Blender gives the identical model.
- **Merge:** a hip edit plus a simulated build change merge to exactly base + yours + build's. The hair takes the
  build's version, and your tee colour is kept.
- **Paint:**
  - The Paint UV reuses her own UV seams (repacked islands, corner splits joined), so the GLB keeps all 36,102
    body points.
  - Every outfit and slider shapes to 0.000 mm of the unpainted model. Smart UV had added 4,836 points and moved
    the tee by 9 mm.
  - In the browser, a test mark shows on her face exactly where it was painted.

## Cloth drape notes (2026-11-20)
- Free sleeves crumple, as in every drape tried on this tee. That's why **Pin sleeves past** (0.14 m from her middle)
  is on by default.
- Shrink and strong gravity bunch the turned-under hem.
- The defaults (quality 8, 40 frames, stiffness 15, bending 0.5) settle the tee over a J cup with a straight front.
- Other sliders (hips, waist) and poses still move the cloth the game's way, with the baked drape riding on top.
- A drape is a still shape that follows the bust slider. Cloth that sways while she walks would be a separate,
  in-game feature.

## Known gaps
- The Game look is close, not exact. The game's vertex snap, dither and skin glow only show in a **Game shot**.
- In the game view, recoloured skin shows flat, without the faint mottle the game keeps. The underwear and pubic
  patches are hidden there: the game draws pictures on them, and shown flat they covered her like a white sheet.
- Recoloured materials (2026-11-20): dirndl colours checked against its preset.
- Stopping the server from a terminal can leave its vitest worker running on the port; the panel's **Stop** kills
  the whole tree.
- A dev server started before `vite.config.ts` existed has neither the auto reload nor the Game shot relay: restart
  `npm run dev` once.
