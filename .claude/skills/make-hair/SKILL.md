---
name: make-hair
description: Make or improve hairstyles for Tarven's characters so they read as hair (locks, flow, pointed ends) instead of a smooth helmet, following YanSculpts' "Easiest Way To Create Hair in Blender" (curve hair: a path curve bevelled by a shape curve) mapped onto Tarven's pipeline (tools/blender/build_world.py's hair_strand / bob_locks / hair_styles and src/game/appearance.ts's hairstyle list). Use when the user asks for a new hairstyle or one from a picture, says the hair looks flat, like a helmet, a box or a visor, wants bangs/fringe, layers, strands, flicks, a braid, or the hair to follow a drawing; or when hair shows skin through it or sits wrong on her head.
---

# Make hair

How to make hair from the tutorial the user picked, and how each step maps onto Tarven. Tarven's hair is made by
code (`tools/blender/build_world.py`, run headless), not by hand, so every step is something to write into the build.

## The tutorial

YanSculpts, "Easiest Way To Create Hair in Blender - 5 Minute Tutorial" (6:39, March 2020),
<https://www.youtube.com/watch?v=BqWYgrXw7Jk>. Read from its captions and every frame (one each 3 s).

**The method (0:36 to 4:48)**
1. Two curves (Shift+A > Curve): a **Path** (the lock's length, 0:40) and a **Circle** (its cross-section, 0:47).
   Scale both down, then Ctrl+A > Apply Scale (1:12).
2. On the path: Object Data > Geometry > Bevel > **Object** = the circle (1:30). The path is now a tube.
3. Edit the circle into the lock's cross-section (2:00 to 2:57): flatten it, then pull its points into a shape. His
   chart (0:42, 1:27) shows: a flat-bottomed dome, an ellipse, a lens, a peaked "tent", a very flat strip, and
   two- or three-bump "clumps" (several strands stuck together). Under each one is the lock it makes: leaf-shaped,
   pointed at both ends. A clump gives a lock with grooves down it. Scale the whole shape flat on X (2:51).
4. On the path's points: **Alt+S** sets the size at each point, so the lock starts small at the root, swells and
   comes to a point at the tip (3:18 to 3:33). **Ctrl+T** twists (tilts) a point (3:36).
5. Give it the hair material. Ctrl+L > Link Materials copies it to the other locks (3:45 to 3:57).
6. Keep the two control curves in their own collection ("hair control", 4:06). **Shift+D** duplicates the lock,
   then move, rotate and groom each copy's points over the head (4:21 to 4:48). The head is covered lock by lock.

**His tips (4:51 to 6:12)**
- **Look at reference.** Pay attention to how hair works.
- **Hair flow.** Hair grows from the crown and parting and moves the same way all over the head. Follow it.
- **Harmony vs chaos.** Mostly harmony, plus a few strands crossing to the other side or breaking out of the outline.
  Don't overdo it, or the look breaks.
- **Shape variation.** Big, medium and small locks mixed, as in sculpting. Never all small or all big.

## How Tarven does it

Her hair is built in **head units**: x to her side, y forward, height above her chin (`at()` in `add_head`, the
style loft in `build_character`). Both pass heights through `head_up(spec, up)`, so her raised cranium
(`"cranium"` in FEMALE) stretches hair and skull alike. Write hair in head units and never in metres.

| Tutorial | Tarven (`build_world.py`) |
|---|---|
| Circle curve (cross-section) | `HAIR_PROFILES`: dome, lens, tent, flat, clump. Each is a closed outline, x across (-1 to 1), y out from her head, flat side down. |
| Path curve with Bevel > Object | `hair_strand(path, profile, width, thick, tilt)`: sweeps the profile along the path, flat side towards `HAIR_CENTRE` (the middle of her skull). |
| Alt+S on the path's points | the 4th value of each path point (`size`); `LOCK_SIZES` is the usual root-to-tip run (small, full, to a point). |
| Ctrl+T | `tilt` (radians, about the lock's length). |
| Shift+D and groom each copy | rows in `BOB_LOCKS` (over the bob) and `FRINGE_LOCKS` (over its fringe). `bob_locks(rings, fringe)` lays each one on the hair's surface. |
| Lay locks on the hair, not in it | `lock_path`: each point 3 mm out (`lift`), the root 3 mm in (`root`), so the lock grows out of the hair. |

Other helpers: `hair_rope` (any cross-section along any path, set square to it), `hair_braid` (a braid along a path),
`hair_flick` (an end turned out), `hair_lock` / `hair_tube` / `hair_curtain` / `fitted_cap` (the older level-ring
pieces, which suit only hair hanging straight down).

**Where styles live**
- Her default **bob** is built in `add_bob`: the shell `BOB_RINGS` (one half, mirrored), the fringe `BOB_FRINGE`, and
  the locks from `bob_locks`. Each half hangs on its own strand bone (`hair_parts[1]` / `[-1]`), the fringe on the
  head (`hair_parts["hair"]`). Put a half's locks on that half's bone.
- **Other styles** are `hair_styles(spec)` entries: `{name: [ring lists...]}`. Each ring list is lofted into one closed
  piece, as the mesh `Female_Hair<Name>`. The "Braid" entry (the Braided bob) is the example to copy: the bob's
  shell, a longer fringe, a braid, locks, strands and flicks.
- **In the game**, add `{ id, label, mesh: "<Name>" }` to `LOOK_OPTIONS.Female.hairstyles` in `src/game/appearance.ts`.
  The chosen style is saved with her look (`tarven.looks` in the browser), so the player's choice is remembered.

## A style: steps

1. **Read the reference** (the user's picture or drawing): length, parting, fringe, where the volume sits, the
   silhouette from the side, and anything special (braid, flicks, a clip).
2. **The shell first**: a closed surface about **1 to 1.5 cm over her skull** (`SKULL` for the skull's size; add
   1.2 cm for her raised cranium above the brow). It hides her scalp, so the locks never need to cover it fully.
3. **The fringe** as stations (back of the crown, a point over the top, the ridge, the lower edge, a point inside).
   Keep the point over the top: without it, the face from the ridge back to the crown cuts through her skull.
4. **The locks**: 10 to 14 per side over the shell, plus 8 or 9 over the fringe. Mix sizes (`width` 0.014 to 0.024
   head units) and profiles. Give each a little `drift` round her head (flow) and a little `tilt`. Add one or two
   out of line (chaos). Let the tips hang past the shell's edge by different amounts, so the ends are pointed and
   uneven.
5. **Build, render, look** (below). Fix, and repeat.

## Rules learned on her (keep them)

- **Not a helmet**: 4 to 5 cm of hair standing off her skull read as a box and her face looked small. Keep 1 to 2 cm.
- **No visor**: a fringe 2.5 cm off her forehead stood out like a cap's brim from the side. Keep about 1 cm.
- **The top's highest point is over her crown**, not behind it ("the back pokes higher than the head", the user).
- **No skin through the hair**: her forehead's corner points (`HEAD_EDGE_DEPTH`, rows 6 to 8: B7, D7) and the
  middle of the upper forehead (C7, 0.082 forward) poked through when the fringe passed under 3 mm from them.
  Check a straight line between two fringe points against them, then look.
- **Roots sunk, tips pointed**: roots standing on the hair made a spiky crest round the crown.
- **A braid lies on the hair along the parting.** Placed off the shell it stuck out like a stick of beads.
- **Ends turned out**: a flared edge, or a few wide flicks. A row of thin hanging flicks looked like teeth.
- **The user draws over a render** to say what they want (side view especially). Follow the drawing's outline.

## Checking it

Build to a scratch folder (a wrapper that execs `build_world.py` with `OUT_DIR` and `TEX_DIR` redirected; see
[[shared-build-rules]] in memory), then render her head with the ref-compare game preview:

```powershell
# a job file, written WITHOUT a BOM ([IO.File]::WriteAllText): PowerShell's utf8 adds one and the JSON fails
{"out": ".../gp/x", "view": "front", "frame": {"cy": 1.3, "height": 0.5}, "look": null, "posed": true,
 "obj": true, "colours": "game", "hairstyle": "braid", "model": ".../build/models/female.glb"}
$env:RC_JOB = "<job>"; npx vitest run --config tools/refcompare/vitest.config.ts
```

That writes `model.obj` as the game shapes her. Render it in Blender, orthographic and centred on her head
(about 0,-0.01,1.47, width 0.34 m), from: front, side, three-quarter front from slightly above (the game's camera,
direction about (0.25, 1, 0.35)), the other three-quarter, back three-quarter and back. Put old and new side by side.
Look for skin showing through, a visor, a box, a crest at the crown, and lock tips cutting into her face or neck.

Then run the tests from PowerShell (`npx vitest run`; they fail from Git Bash). Before copying `female.glb` into
`public/models`, check that the build log lists sculpt fixes `female_01` to `female_05`, and message the other
sessions working in the tree.
