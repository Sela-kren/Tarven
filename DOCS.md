# Tarven's design docs: what each one is

Updated 18 Nov 2026. Read this first to find the right doc. Every doc stays in the repo root, because code comments and Blender scripts point at them by name.

**Kinds:** **Rules** = the source of truth, so follow it. **Built** = the code does what it says (art may still be missing). **Plan** = not built yet. **Parked** = work on hold. **Old** = replaced by another doc and kept only for its history.

## Rules (follow these)

| Doc | What it decides |
|---|---|
| [GAME_PATH.MD](GAME_PATH.MD) | The consent rule (yours to set), guest types, their preferences and the systems. Every other doc defers to it on consent |
| [WORLD.md](WORLD.md) | The setting: a medieval adult comedy with modern things, its peoples, heroes, the King and Queen, titles |
| [STORY.md](STORY.md) | The story: the spine, her arc, the cast, popularity, the Ledger, the rival bosses (their stages, and the feature each one unlocks), Act 1, the Lantern, endings. Current scope: Chapter 1, Tarven |
| [CORRUPTION_TROPES.md](CORRUPTION_TROPES.md) | How every stage of a fall is written: the tropes and the five beats |

## Built (art still to come where noted)

| Doc | What's built | What's missing |
|---|---|---|
| [PASSIVES_DESIGN.md](PASSIVES_DESIGN.md) | Desire meters, Lewdness, Corruption, 83 passives, records. §9 is its roadmap | Later steps in §9 |
| [KP_COMPARE.md](KP_COMPARE.md) | Enemy prefixes, repeat foes, difficulty, her moves; defeats, trinkets, toys, side jobs, riot nights as rules | Start choices; glory hole and gym; the art |
| [STAFF.md](STAFF.md) | Staff roster, stats, nights, recruiting, perks | Models, outfits and portraits |
| [REVEL_HOUSE.md](REVEL_HOUSE.md) | Revel nights (`revel.ts`) | The Revel Hall set and group poses |
| [TOWN_DAY.md](TOWN_DAY.md) | The high street, market, flyers, town v1 (every place has things to do) | Steps 3 to 7: grass, rival visits, being seen, Warm House recruits, guild work |
| [FEED_STAR.md](FEED_STAR.md) | Her side job on the town feed, as rules (`feedstar.ts`) | Wiring into the game; the art |
| [EXPRESSION_STUDY.md](EXPRESSION_STUDY.md) | Her expressions (`face.ts`) against KP's face presets: how KP builds and picks faces, the part vocabulary, every preset | §5's proposals: stamina steps, pools, smaller mouths, eye art |
| [POSES_TODO.md](POSES_TODO.md) | The list of art still owed to the built systems above: poses, props, models | That's the list |
| [BLENDER_BRIDGE.md](BLENDER_BRIDGE.md) | Her master .blend ↔ the game 1:1: Send to game, the game view (game sliders, face and recolours run by the game's code), edits back, face fit from sculpt, game shots, merging code builds, 2K paint layers (room and close-ups) | Exact screen look only in Game shots |

## Plans (not built)

| Doc | What it is |
|---|---|
| [DEFEAT_SCENES.md](DEFEAT_SCENES.md) | Six KP-style defeat scenes in detail. The rules exist in `defeat.ts`; this is the full design |
| [CHURCH_CONCEPT.md](CHURCH_CONCEPT.md) | The Church of Veyra as a path: ranks, sessions, recruits |
| [CHURCH_RECRUITMENT.md](CHURCH_RECRUITMENT.md) | Story and dialogue pack for recruiting townspeople into the church |
| [GODS_LORE.md](GODS_LORE.md) | The gods of the pass (lore only) |

## Parked (the real_heroin model, on hold)

The game keeps the old Female body. These docs are for the rebuilt heroine model, real_heroin, which is on hold.

| Doc | What it is |
|---|---|
| [MODEL_REWORK.md](MODEL_REWORK.md) | The phased plan for a new heroine model |
| [MODEL_STUDY.md](MODEL_STUDY.md) | The reference models, measured in 3D |
| [SLIDERS.md](SLIDERS.md) | Body and face sliders for the new model |

## Old (kept for history)

| Doc | Replaced by |
|---|---|
| [GAME_CONCEPT.md](GAME_CONCEPT.md) | STORY.md for the story parts (§1, 8.2, 9, 11); WORLD.md for the setting. Still useful for the core loop |
| [STORY_PATH.MD](STORY_PATH.MD) | STORY.md (an older story draft, 14 Nov) |
| [STORY_DEIVENT.MD](STORY_DEIVENT.MD) | A work brief for an agent (her arc, 14 Nov), now built into STORY.md §4b |
