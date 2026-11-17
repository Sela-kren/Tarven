---
name: build-place
description: Build a place or scene concept for Tarven (the town, the high street, a market square, Mara's farm, the chapel, the garrison, a district, any outdoor or building set) by running two helper agents side by side, a Toolkit agent (picks and exports the D:\planet kit pieces, or makes new ones in the kit's style when none fit) and a Layout agent (places them, the walk spots, colliders and camera). A third Style Check agent judges every piece on style and detail (does it fit Tarven, is it consistent with the rest) and sends back PASS, FIX or REPLACE; new pieces are built from the ones that passed (kit_new/medieval.py). Then the work is merged and checked in the game. Use when the user asks to build, lay out, block out or rework a place, town, street, area or set, or says "/build-place".
---

# Build a place (two agents)

For a place concept (the town in `TOWN_DAY.md`, a farm, a square, a church yard...), always split the work
across **two agents started in the same message** so they run at once:

| Agent | Owns (only it edits these) | Delivers |
|---|---|---|
| **Toolkit** | `tools/blender/build_<place>_kit.py` (or `build_street_kit.py` for the high street) and the `public/models/<place>kit.glb` it exports | Every piece on the wishlist as `Kit_<id>`, plus each piece's real footprint (width × depth × height in metres, from its bounding box) |
| **Layout** | The place's game module, e.g. `src/game/street.ts` (or a new `src/game/<place>.ts`) | Where every piece stands, the walk-up spots, colliders, spawn, camera limits and townsfolk doors |

You (the main thread) do steps 1, 3 and 4. Don't do the agents' work yourself while they run; wait for both.

## 1. Write the shared brief first

Before spawning, read the concept doc (`TOWN_DAY.md`, `WORLD.md`, or whatever the user names) and the
existing code for the place. Then write one brief that **both** agents get word for word:

- **The place and its goal**, one paragraph, from the concept doc.
- **The places list**: each spot she can use (market, board, chapel...) and what it needs to look like.
- **The piece wishlist**: game ids → what the piece is (e.g. `well` → stone well with a roof). Reuse ids that
  already exist in `build_street_kit.py`'s `PIECES`. This list is the contract between the two agents: the
  Toolkit agent makes exactly these ids, and the Layout agent places only these ids.
- **The rules** below.

## 2. Spawn both agents in one message

Use the Agent tool twice in a **single** message (`general-purpose`), each with the shared brief plus its own part:

**Toolkit agent:**
- The kits are Blender asset libraries in `D:\planet\assets\kit_*.blend` (town, country, home, vehicles,
  megacity). Each asset is a collection facing -y, standing on z=0, at real size. Preview sheets:
  `D:\planet\review\kit\<pack>\_sheet.png` (open them with Read to pick by look). `D:\planet\ASSETS.md` and
  `SCENERY.md` explain them.
- Follow the pattern in `tools/blender/build_street_kit.py`: append, join each to one `Kit_<id>` mesh at
  the origin, export the GLB. Copy each material's `diffuse_color` into the base colour first, or noise-tinted
  wood, stone, hay and leaves export as white.
- Blender 5.1: `D:/blender/blender.exe -b --factory-startup --python <script>` (set `TARVEN_ROOT` if needed).
- **If D:\planet has no piece that fits, or a kit piece fails the Tarven check (step 2b), make a new one.**
  Base it on the pieces that already passed: `tools/blender/kit_new/medieval.py` is the reference (tavern,
  Copper Bell, chapel, Warm House, burgage houses, keep, gatehouse, stalls, notice board, market cross). Reuse
  its helpers (`burgage`, `framed`, `mwin`, `plank_door`, `lantern`, `merlons`...) and its `PAL()` palette, which
  sit on top of `D:\planet\scripts\v3\homekit.py`. Match their low-poly density, real-world size, flat colours
  and trim detail, facing -y and standing on z=0. Add the builder to `medieval.py`'s `BUILDERS` (or a sibling
  module in `kit_new/` for a new theme, such as a farm), add the id to `NEW` in the kit script, and never write
  into D:\planet unless the user asks. Mark the id as **NEW** in the report. Never leave an id out silently.
- Report: the id → kit asset table, each piece's footprint, the NEW pieces, and the export's size.
  Render one contact-sheet PNG of all pieces to the scratchpad and give its full path. For each NEW piece, also
  render it on its own next to 2–3 real kit pieces of the same kind (same camera, light and scale), and give those paths.

**Layout agent:**
- Read the existing place module (`src/game/street.ts` shows the pattern: origin, `StreetSpot`s, colliders,
  `cameraLimits`, `activities`) and `src/game/collision.ts`, `townsfolk.ts`.
- The camera looks north from the south; buildings face the camera; nothing tall goes between the camera and her.
- Use footprints from `D:\planet\ASSETS.md` until the real ones arrive. Leave walk paths at least 2 m wide and
  give every building a door spot.
- Draw the plan as a small ASCII map (north up, metres marked) at the top of its report, then make the code
  changes. Run `npx tsc --noEmit` and fix its errors before reporting.
- Report: the ASCII map, every id and where it stands, the spots, and anything it guessed.

## 2b. Style check: every piece (a third agent)

When the Toolkit agent reports, start a **Style Check agent** (`general-purpose`, a fresh one, not the Toolkit
agent checking its own work). It checks **every piece in the export**, kit pieces and NEW ones alike. Give it
only the files, not your opinion:
- the contact sheet and side-by-side renders, the piece table (sizes and triangles), the kit preview sheets in
  `D:\planet\review\kit\<pack>\_sheet.png`, `WORLD.md`, and the pieces that already passed (`kit_new/medieval.py`
  and its renders) as the style reference.

It judges each piece on **style and detail only**, with two questions:
1. **Does it fit Tarven?** Tarven is a medieval town with some modern things in it (`WORLD.md`). Modern *small*
   things are fine (mana-lamps, posters, a phone stand). A whole building or big landmark in a clearly
   non-medieval style is not: no Wild West false fronts, American barns, Georgian brick rows or modern shop
   fronts.
2. **Is it consistent with the rest?** Compare it with the reference pieces:
   - triangle density, against pieces of the same kind (a prop with far more detail than its neighbours fails)
   - shape: bevels, roof slope, trim, how chunky it is
   - palette and materials: flat colours, the same wood, stone and plaster tones
   - scale: doors about 2.1 m
   - facing -y, standing on z=0

Its output, per piece: **PASS**, **FIX** (exact changes, e.g. "roof too smooth: 32 segments, the rest use 8",
"plaster too white: use PAL plaster"), or **REPLACE** (doesn't fit Tarven: rebuild it as NEW in the reference
style, e.g. "store → a timber-framed general store"). It does not edit files.

Send the FIX and REPLACE lists to the Toolkit agent (SendMessage). It fixes or rebuilds, re-renders and
re-exports, and the Style Check agent checks again (SendMessage to the same one). Repeat until every piece
passes, at most 3 rounds. If a REPLACE changes an id's footprint, tell the Layout agent. Then show the user the
final contact sheet, and say which pieces are new or rebuilt. The Layout agent can keep working
during this, because ids and rough footprints don't change.

## 3. Merge

When both are back (and every piece has passed the style check):
- Check the Toolkit agent's real footprints against the Layout agent's guesses. Move anything that now overlaps
  a path, a spot or another piece.
- Make sure every id the layout uses exists in the GLB, and nothing in the GLB is unused.
- Run `npx tsc --noEmit`.

## 4. Check it in the game

Use the `run` skill (or the dev server + Claude in Chrome) to walk the place: screenshot the overview and each
spot. Look for floating or sunk pieces, white materials, blocked doors, pieces hiding her from the camera.
Show the user the screenshots and the ASCII map, and ask what to change. Send small fixes to the agent that
owns that file (SendMessage) instead of starting a new one.

## Rules for both agents

- **The world** is medieval with modern things (`WORLD.md`): mana-lamps, posters, phones and modern clothes are
  fine. **No cars**: no tractors, traffic lights, bus stops, stop signs, hydrants or garages.
- **The look** is the hero-shooter refs' painted toon look. No pixel-art or dither looks.
- **Blend files:** don't write to a .blend the user has open. Their Blender overwrites it on close.
- **Git:** never commit or push unless the user asks.
- Stay in your own files. If you need a change in the other agent's file, say so in your report.
