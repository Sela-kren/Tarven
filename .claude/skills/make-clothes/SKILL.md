---
name: make-clothes
description: Make or fix clothing for Tarven's characters so it reads as real cloth, following two Blender clothing tutorials (Bunisu's VRChat clothing video and NonExternal 3D's "clothing in 5 minutes") mapped onto Tarven's own pipeline (tools/blender/build_world.py and src/game/appearance.ts). Use when the user asks for new clothes, a new outfit, clothes that look painted on or "don't have a cloth effect", folds or wrinkles, hem or cuff thickness, seams, clipping through the body, stiff or boxy clothes when she moves, or lines and creases that shouldn't be on a garment.
---

# Make clothes

How to make clothes in Blender, from two tutorials the user picked, and how each step maps onto how Tarven
actually builds its clothes. Tarven's clothes are made by code (`tools/blender/build_world.py`, run headless),
not by hand in the Blender UI, so every step below is something to write into the build, not to click.

## The two tutorials

### 1. Bunisu: "How to make, weightpaint, uv unwrap, and texture clothing for VRChat (Blender)"

<https://www.youtube.com/watch?v=r_5yK84VNew> (35 min, Dec 2022). The full workflow, for a baggy T-shirt
and then a skin-tight top.

**Baggy T-shirt (0:10 to 14:05)**
1. Add a plane in front of the chest. Modifiers in this order: **Mirror** (clipping on, mirror object = the
   body) then **Subdivision Surface**.
2. Extrude edges up the front to the collar, out over the shoulder and down the back. Use proportional
   editing (scroll to size it) to stretch it over the chest. Turn clipping off while working away from the middle.
3. Extrude the sleeve out from the armhole and build a cuff round the arm. Fill gaps with **F** (select 4
   vertices). Merge front and back edges with **M > At Center**. Add loops with **Ctrl+R**.
4. Triangles are fine under a Subdivision modifier, since applying it turns them into quads.
5. Keep enough loops that the shirt doesn't look boxy and pointy when the body bends. Raise subdivision by one more level.
6. Apply Mirror, apply Subdivision, then **M > Merge by Distance** to remove the doubled middle vertices.
   Remove loops you don't need, and slide the others into place.
7. Shade Smooth. Set Origin to Geometry (so sculpt symmetry works).

**Sculpting (14:05)**: sculpt mode, **Elastic Deform** (more forgiving than Grab), X symmetry on. Pull it in
at the waist and the armpits. Turn symmetry off for one-sided things like an off-the-shoulder top.

**Weight painting (15:29)**
1. Add a **Data Transfer** modifier. Source = the body. Turn on Vertex Data, choose Vertex Groups, set
   mapping to **Nearest Face Interpolated** (not Nearest Vertex), Generate Data Layers, then apply.
2. Add an **Armature** modifier with the body's armature.
3. **Fixing sharp weights (16:40)**: the copied weights make the shirt bend boxy. In Weight Paint mode,
   Ctrl+click each bone and lightly drag the **Blur** brush with a big radius over the joints (shoulders,
   arms, chest). Drag lightly: pressing hard gives wrong weights.

**UV mapping (18:13)**: mark seams where a real shirt has them: down the underside of each arm and down
both sides. Unwrap. Rotate the islands upright and scale them to fit. Smaller islands get less texture resolution.

**Texture painting (20:45)**: new material, base colour from a new image texture (2K in the video). Texture
paint mode. Use a hard-edged brush (Falloff set to a flat curve) for crisp pixel details, not a feathered one.
Blend modes (multiply, overlay and so on) darken, lighten or tint what's already there. Save the image
yourself, because Blender doesn't auto-save textures.

**Transparency (26:00)**: material Blend Mode = **Alpha Hashed**. Connect the image's Alpha to the
Principled BSDF's Alpha. Use Erase Alpha to cut holes.

**Skin-tight top (26:58)**: same start, but with a **Shrinkwrap** modifier. Target = the body,
**Offset 0.001** (sometimes 0.002), **Snap Mode: Outside Surface**, with Subdivision and Mirror (Mirror
first). Keep the mesh close to the body, because the further it starts, the more it warps. Where it clips
through between loops, it doesn't have enough loops: subdivide, or add a loop with Ctrl+R. Apply Mirror,
Shrinkwrap and Subdivision. Then sculpt with **Inflate** to push it off the skin, with symmetry on.

**Weird shading (34:37)**: if dark lines show after Shade Smooth, select all and **Mesh > Normals >
Recalculate Outside**, because some faces were flipped.

### 2. NonExternal 3D: "How to make clothing in blender in 5 Minutes"

<https://www.youtube.com/watch?v=HBCOxIH132M> (11 min, Oct 2023). Quick blockouts to refine later.

1. **Blockout (0:31)**: start from a plane, not a cube. Mirror (clipping on) plus Subdivision. Extrude
   loops to sketch the garment fast, then refine in sculpting. On a sculpted body, skip the mirror and keep
   the loops level.
2. **Shrinkwrap leotard/swimsuit (2:15)**: Mirror plus **Shrinkwrap** onto the body. Snap mode
   **Above Surface** or **Outside Surface**, not On Surface with zero offset. **Put Subdivision before the
   Shrinkwrap**: after it, the Shrinkwrap has no extra geometry to work with. Then add **Solidify** (gives the
   cloth thickness and hides clipping) and another **Subdivision** after it to round it off.
3. **Vertex groups control the Shrinkwrap (4:57)**: select the loops that should not hug the body (so they
   don't cave in), Ctrl+G to assign a new vertex group, pick it in the Shrinkwrap modifier and press
   **Invert**. Only the rest wraps.
4. **Smooth the group (5:45)**: the edge of the group makes a step. In Vertex Paint (weight) mode, lightly
   tap the **Blur** brush at low strength along it, with the wireframe on to watch it.
5. **Combine techniques (6:29)**: for example, a jacket with puffy sleeves that hug the forearm only at the cuff:
   cuff loop in a vertex group, Shrinkwrap to the arm on that group, Above Surface, moved out a little,
   then Solidify and Subdivision.
6. **Detail with Multiresolution (7:52)**: keep a Shift+D duplicate as a backup. Apply the Mirror, one
   Subdivision and the Shrinkwrap, but keep Solidify unapplied (it's only thickness). Add **Multiresolution** and sculpt the
   folds. Get all the main shapes and loops in first, because changing the geometry later breaks
   Multires. Multires has problems with shape keys, so take care if the garment is animated. For symmetric
   sculpting: Origin to Geometry, then **Mesh > Symmetrize** (+X to -X).

## What both agree on

- Build the garment as its own mesh, slightly off the body (Shrinkwrap with an offset, outside surface).
- Give it **thickness** (Solidify): an edge with depth is what makes cloth read as cloth, not paint.
- Shape **folds** by sculpting (Elastic Deform, Inflate, Multires) where cloth gathers: waist, armpits,
  under the bust, the elbows.
- **Copy the body's weights, then blur them** at the joints so it bends smoothly.
- **Seams where a real garment has them** (UVs), and **painted detail** (hems, stitching, fold shading) in the texture.
- **Normals facing out and smooth.** Stray shading lines come from bad normals.

## How Tarven does it now (and where it falls short)

Tarven's clothes are built by `tools/blender/build_world.py` (headless Blender), and the game reshapes
them live with the body sliders (`src/game/appearance.ts`, the `Dresser` class).

| Tutorial step | Tarven today | Gap |
|---|---|---|
| Plane plus Shrinkwrap with offset | Clothes are **her skin's faces copied and lifted** off it (`lifted(...)`, `CLOTH_GAP`, e.g. `tee_cloth` / `tee_lift`) | The cloth copies every crease of her skin. `smooth_tops` eases the tee over it, but only a few rows |
| Solidify (thickness) | Single-sided surfaces. The tee's edges are now turned under (`finish_tee`) | **Every other outfit's edges still look painted on** |
| Sculpt folds | The tee has a few soft folds (`TEE_FOLDS`) | **Every other outfit has no folds**: reuse `finish_tee` with that outfit's own fold lines |
| Data Transfer weights plus blur | Copied from the skin; `ease_shoulder_weights` blurs the shoulders | Fine |
| UV seams plus painted texture | `tex_flat`: a 32 px flat noisy colour per material | **No seams, stitching or fold shading** |
| Recalculate normals | — | Hard edges in the export made a line across the tee (see below) |

## Fixes already made (keep them)

- **The tee finished as cloth in the build** (`finish_tee` in build_world.py, after `smooth_tops`):
  1. *Untangled* (`TEE_UNTANGLE`): copied from her skin, the cloth folded flat on itself where her skin does
     (164 faces across the front at 1.06 m turned in towards her, more on her shoulder blades), and the
     top of the hem band was a corner sharper than the export's 55° split. Both showed as a hard line
     across the tee. Round each such face, and any inner edge sharper than 40°, the cloth is eased out flat
     and kept over her skin.
  2. *Folds* (`TEE_FOLDS`): soft ridges by (turn round her, height), mirrored: drag lines from the bust up
     to the armpits and gathers round the waist's sides. Depths 1 to 2 mm, widths 6 to 9 mm. They're subtle at
     the game's resolution, so raise `depth` to make them read more.
  3. *Edges* (`TEE_EDGE`): hem, sleeve ends and neckline turned under 2.5 mm, with a 0.7 mm bead. This is
     the code version of the tutorials' Solidify.
- **Hard lines from split normals**: the export splits a point's normal at any corner over 55°. The game
  averages, per spot, only the normals that lean within 60° of each other (`weldNormals`, `WELD_NORMALS`
  in appearance.ts, for `SMOOTH_TOPS` materials). So gentle splits merge, but turned-under edges (about 90°)
  stay crisp, and opposite normals (cloth folded flat) are never averaged into nothing. Check a garment
  with this skill's script: `python .claude/skills/make-clothes/check_split_normals.py public/models/female.glb Female_ClothTee T_tee`
  (the mesh name and its material). Splits at the edges are the turned-under strips, as meant. Any inside
  the garment are faults: find them with a face-facing check (a face whose normal points against the
  nearest skin normal is folded in).
- **Folds and tearing when the bust slider changes size**: each cloth point copied the move of the nearest
  skin points, so neighbours moved apart. The game now eases the tee's moves together after the reshape
  (`smoothMoves`, `SMOOTH_TOPS`, 100 passes, fading out from an F cup to a J cup). Add new fitted tops'
  materials to `SMOOTH_TOPS`.

## When the body under the clothes isn't the user's sculpt

Clothes ride on her body, so a body that drifted from what the user sculpted shows on every outfit. The user's
sculpts live in `art/bust_review/*.blend` (one `Bust_<cup>` body per cup) and reach the game as
`art/sculpt_fixes/female_NN.npz`, which `apply_sculpt_fixes` stacks in order. To check, export her body as the
game shapes it (`tools/posepreview/bustexport.preview.ts`, POSE_OUT and CUPS) and measure each point's
distance to the sculpted surface (nearest point on `Bust_<cup>`). On 2026-11-19 the default C cup sat 9 to 15 mm
outside `sculpted_03_with_extension.blend` under the bust at her sides (later changes had moved it, and no fix
held a C cup). `tools/blender/bust_refit.py` wrote `female_04.npz` to bring it back:

```powershell
blender -b art/bust_review/sculpted_03_with_extension.blend -P tools/blender/bust_refit.py -- C <bustexport>/bust_C.obj <bustexport>/growth.json
```

Export every cup (no CUPS) for the growth file, so the build tells the breasts from her body as it does for
the other fixes. bust_fixes.py can't be used once points have been added to her mesh since the review. Then
rebuild, export again and measure: after the refit, 95% of points were within 0.2 mm.

## Lessons from trying it here

- **A plain cloth simulation does not work on these clothes as they are.** Running Blender's cloth sim
  on the built tee (shrink 0.02, gravity on, her body as a collider with inner thickness 0.02, 30 frames)
  made the shirt slide off and collapse into a band round her waist. If you try it again:
  pin the neckline and shoulders (vertex group in Pin), turn gravity down or off, keep the collision's
  inner thickness small, raise quality, and use shrink only for tension. Run it *before* the game's
  tables are built (in the build, after `smooth_tops`).
- **Baked drape in the build (2026-11-19)**: `drape_cloth` / `TEE_DRAPE` in build_world.py runs Blender's cloth
  sim on the tee between untangling and the turned-under edges. It's off unless `TARVEN_DRAPE` is set
  (`'{}'` for the defaults, or JSON overrides such as `'{"bend": 2.0, "self": 1}'`). What we found:
  shrink or gravity crumples the narrow hem band (it fights the collision), so use none. Use quality 12, since rows under the
  bust are 1–2 mm apart. The turned-under edges must come *after* it. It takes about 40 s (77 s with self-collision).
  The chest drapes naturally (soft bridging under and between the breasts). But **it can't fix the tee's mesh**:
  copied from her skin, the tee carries her skin's under-bust crease as a pleat (a line across the top of the hem
  band, also visible in the game), and the sleeves go puffy and ragged. Neither stiffer cloth nor self-collision helped.
  The real fix is the tutorials' way: build the tee as its own clean mesh (plane → extrude → shrinkwrap), then drape.
- **The clean tee (2026-11-19, now the default)**: `clean_tee` / `TEE_CLEAN` keeps the tee's connections but
  relaxes it like a taut sheet (200 passes: each point eased to its neighbours' middle, never closer than 3 mm
  to her skin, or 4 mm on the sleeves; edges fixed). That's the code version of plane + Shrinkwrap. It removed the
  pleat line, bridges the under-bust crease, and evens the point spacing, all in about 12 s. Then
  `copy_skin_weights` (Data Transfer: weights from the skin face under each point) and the stains carried along
  (`anchor_stains` / `replace_stains`). The cloth sim on top of it crumpled the hem band and sleeves again, so the
  drape stays off. `TARVEN_CLEAN=0` gives back the copied-skin tee.
- **Skin poking through after the build's later steps** (specks at the back of the sleeves, after the neck
  root moved her): `cover_skin` / `TEE_COVER` runs last, before the armature. Wherever a skin point lies outside the
  tee, it pushes the tee face over it out. It only counts skin the tee covers: the spot on the tee must be 15 mm
  from the tee's edges, measured from that spot, because measured from the skin it pushed the hem and neckline out
  into flaps. Pushes are capped at 8 mm in all.
- **Big cups (J and up), in the game** (appearance.ts): fitted tops (`SMOOTH_TOPS`) now
  1. follow 12 skin points with soft weights (`TOP_FOLLOW`), not 4;
  2. skip the cleavage span, whose line cut across the lower inner breast and folded the cloth into flaps;
  3. are smoothed plainly up to F, blending into Taubin smoothing by J (`smoothTopSteps`), then put on the shell
     again;
  4. are kept 2 mm off the skin up to F, rising to 8 mm by M (`smoothTopGap`). Stretched faces on a big breast
     dip into it between their corners, so skin showed through in patches.

  No crack, tear or skin windows at J, M or Q. At M and up the tee hangs from the breasts' fronts with a flat panel
  under the middle. Diagnose such things by switching one game step off at a time (follow, span, smoothing, shell,
  clear, nipple riders) and rendering the cups as the game shapes them.
- **The tee hangs from a big bust** (`HANG`, `hangField`/`hangTop` in appearance.ts, `HANG_TOPS` = the tee only):
  a real shirt falls straight down from the front of the breasts to its hem, it doesn't tuck back under them to
  the ribs. Round her upright line, each way round and each height, the cloth comes out at least as far as the
  cloth above it, less a slope (0.2 m back per m down). Fades in from C (none) to G (all), and only over her front
  (full to 55°, none past 80°, so her sides and sleeves keep their shape). Two things to keep:
  1. the push is eased into the cloth round it but never made *smaller* (easing it down left the crease under
     the breast as a line above a roll);
  2. the hem's turned-under strip moves with the fold above it (`turnedPartners`), or the edge loses its depth.

  2026-11-19, the user's call: a towel over her bust, no folds. `HANG.depth` is 0 (the fold ridges were "unnecessary
  folds"), `ways` is [75, 95] so her sides hang straight down too, and each height spans the dip between her
  breasts (`bridgeBands`: the convex outline seen from above, over ±`bridgeBands` bands so it doesn't stripe). The
  cloth under a span hangs from the span, not from the dip, or it fell back in under it in an X crease and a V at
  the hem.

  Check it with `tools/posepreview/teeexport.preview.ts` (body + tee OBJ per cup; `HANG='{"cups":["Y","Z"]}'`
  turns it off for a before/after) and side views.
- **Folds made in the build survive the game's reshaping**: `smoothMoves` eases the *moves*, not the shape,
  so a built fold rides along as the bust changes.
- **Rebuilding is safe and quick**: an unchanged `build_world.py` reproduces `public/models/female.glb`
  (to within 16 bytes of JSON) in about 40 seconds. Build into a scratch root first, as below, and
  copy back only the GLBs that should change.

## Run the build

```powershell
# Scratch root: the build reads art/sculpt_fixes from TARVEN_ROOT and writes public/models and art/textures there.
$r = "<scratchpad>\root"
New-Item -ItemType Directory -Force "$r\art" | Out-Null
Copy-Item -Recurse -Force C:\Game\Tarven\art\sculpt_fixes "$r\art\sculpt_fixes"
$env:TARVEN_ROOT = $r
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" --background --python C:\Game\Tarven\tools\blender\build_world.py
```

Blender's path differs between PCs (the build-grass skill uses `D:\blender\blender.exe`). Find it before running.

To check a garment without the game, import the GLB in headless Blender, hide everything but the body
and the garment, and render front, three-quarter and low views with the Workbench engine (studio light).
To see it as the game shapes it, export the body and garment from a vitest preview (the `Dresser` applied
with a look) as OBJ, and render that the same way. In the game, open her closet from the dev console with
`window.__game.openCloset()` (dev build only) for a close-up. Reload instead of pressing Done, so the
save isn't touched.

## Order of work for a new or improved garment

1. Shape: copied skin faces lifted off the skin (as now), or a Shrinkwrap-style surface with an offset.
2. Thickness: turn the open edges (hem, cuffs, neckline) back under by a few millimetres, like Solidify on
   just those rows, so each edge has depth.
3. Folds: a few deliberate ones where cloth gathers (waist, armpits, under the bust, inside the elbow), by
   moving rows along the skin normal (sculpting by code), or a pinned cloth sim.
4. Weights: copied from the skin, blurred at the shoulders (`ease_shoulder_weights`).
5. Texture: hem and seam lines and fold shading painted into the garment's texture in the retro palette.
   Keep it small and crushed (`retro_crush`) like the rest.
6. Check: split normals (none inside the garment), renders from three views, the bust slider at A, C, F and
   J, and her closet in the game.
