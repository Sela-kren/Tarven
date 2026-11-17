# Brawl scene poses: still to make

The rules for every brawl scene are already in the game (`src/game/brawlscenes.ts`, GAME_PATH.MD §7i). This file lists the 3D poses that are still needed to show them.

Until a scene has its own pose, the big picture shows Tarven's nearest existing pose (`pose` in `FOE_SCENES`, from the scene names in `sexpose.ts`). To give a scene its own pose:

1. Add the pose name to `ScenePoseName` and build it in `sexpose.ts` / `scenestage`.
2. Set it as that scene's `pose` in `FOE_SCENES`.
3. Tick it off below.

The Karryn's Prison reference art for each pose is in the game's image folder: `D:\hh\Karryns.Prison.v1.2.7.2.Incl.ALL.DLC.Uncensored\…\www\img\karryn\<KP folder>`. The files are `.rpgmvp`, which are encrypted RPG Maker images. To view them, decrypt them first or look at them in the running game.

Joins are the places where another man can join the scene: her mouth (`mouth`) and her left and right hands (`left`, `right`). Every pose needs a spot for each of the joins its scene allows.

## Scenes that need a new pose

| Scene (`FoeSceneId`) | Who starts it | KP folder | Shown now as | What the pose needs | Joins |
|---|---|---|---|---|---|
| `footjob` | noble (KP's nerd) | `footj` | `stroke` | She's sat on a bench or the table edge, leaning back on her hands. He holds her ankles, with her soles on him. | mouth, left, right |
| `rimjob` | soldier, smuggler (KP's guard, rogue) | `rimming` | `kneel` | She's kneeling behind him. He's bent over a table, looking back at her. | left, right |
| `piledriver` | bandit (KP's slime) | `slime_piledriver` | `prone` | She's on her back with her legs folded over her head and her hips up. He's coming down on her from above. | mouth |
| `kickCounter` | bandit, adventurer, when she kicks (KP's thug, yeti) | `kick_counter` | `carry` | She's standing on one leg. He holds her kicking leg up high over his arm and stands facing her. | mouth |
| `standPaizuri` | farmer (KP's orc, yeti) | `orc_paizuri`, `yeti_paizuri` | `paizuri` | She's standing with her back to a post. He stands facing her, close, with both hands on her breasts. | mouth |
| `soldierGangbang` | soldier (KP's guard) | `guard_gb` | `gangbang` | A squad version of the gangbang: she's on her back on the floor, with him kneeling between her legs. It should look different from the bandit's gangbang. | mouth, left, right |

## Scenes using an existing pose that may want their own

These already look right, but KP gives each its own picture.

| Scene | Who starts it | KP folder | Shown now as | Notes |
|---|---|---|---|---|
| `licked` | farmer (KP's goblin) | `goblin_cl` | `licked` | Check that he's kneeling in front of her with one of her knees over his shoulder. |
| `gangbang` | bandit (KP's thug) | `thug_gb` | `gangbang` | Fine as it is. |
| `backPussy`, `backAnal` | adventurer (KP's werewolf) | `werewolf_back` | `doggy` | KP has her on all fours, with him leaning over her back. |
| `cowgirl` | adventurer (KP's lizardman) | `cowgirl_lizardman` | `cowgirl` | He's on his back on the floor. |
| `reverse` | smuggler (KP's homeless man) | `cowgirl_reverse` | `reverse` | Sitting on a bench, with her facing the room. |
| `carry` | adventurer (KP's yeti) | `yeti_carry` | `carry` | Fine as it is. |

Tarven's five original scenes (`hands`, `mouth`, `breasts`, `pussy`, `butt`) keep showing each guest type's own pose, as before.

## Tarven's eight extra scenes

These were added for variety, and each guest kind starts a couple of them.

| Scene | Who starts it | Shown now as | Needs its own pose? |
|---|---|---|---|
| `throat` | bandit, soldier | `throat` | No, it already has one. |
| `missionary` | farmer, noble | `missionary` | No, it already has one. |
| `tableLaid` | soldier, smuggler | `tableBack` | No (it's the table scene's pose). |
| `bentOverBar` | bandit, smuggler | `bentover` | Maybe: she should be at the bar counter, not a table. |
| `bentOverAnal` | noble | `bentover` | Same as above. |
| `againstWall` | soldier, fugitive | `bentover` | **Yes:** she's standing, pressed face-first to the wall, with him standing behind her. |
| `proneBone` | adventurer, fugitive | `prone` | No, it already has one. |
| `lapRide` | farmer, noble | `cowgirl` | **Yes:** he sits on a bench, and she's on his lap facing him with her knees either side. |

## Art for the systems that already work (18 Nov 2026)

These systems already work in the game, but nothing is drawn for them yet. Each one shows nothing (or a stand-in) until its art is made.

| System | Code | Art needed | Shown now |
|---|---|---|---|
| Defeats (6) | `defeat.ts`, `beginDefeat` in `tavern.ts` | One pose per defeat, with the men's spots and the props listed in DEFEAT_SCENES.md: kneeling in a ring, bent over the rain barrel, on her bed, bent over a cask, on the big table, on the floor in front of a squad | The After Hours game with its usual poses. Each defeat's stand-in is listed in `DEFEATS[id].standIn`. |
| Toys (3) | `TOYS` in `fight.ts` | A model for each toy (buzzing charm, carved toy, string of beads), a cut-in for each (KP's toy cut-ins, `cutin.ts`), and one showing on her while it's in | Log lines only (`toy:in:*` and `toy:work:*` events, which have no comic shot) |
| Trinkets (12) | `trinkets.ts` | A small mesh for each on her model (lip tint as a material, nail paint, ribbon, ankle bell, garter, rings, coin, choker), worn like jewellery (`appearance.ts` jewel meshes) | Numbers only, chosen in Settings › Trinkets |
| Dancing on the bar | `danceOnBar` in `tavern.ts`, `sidejobs.ts` | A dance loop for her standing on the bar counter, and the room watching | A Settings › Side work button and a log line |
| Renting rooms | `rentOutRooms` | A front desk with a key board, and a lodger's room upstairs for the visits later | A Settings › Side work button and a log line |
| Her hair growing | `hairNights`, `growthOf` | Five looks from `pubes.ts`, from bare to wild, chosen by `hairGrowth`, and a bathhouse to trim at | Text in Settings › Side work |
| Riot nights | `riot` in `tavern.ts` | Optional: a rowdier room (more guests standing, broken stools) | A line in the log and the menu |
| Staff (15 friends + random hires) | `staff.ts`, `staff` in `tavern.ts` | A model per friend (each one's look is in STAFF.md §11 and the roster's `look`), work outfits per job, portraits for the Staff page and the HUD staff bar, a cook at the hearth, a barmaid carrying trays, a doorman on his stool; generic bodies for random hires by people and job | Text in Settings › Staff |
| Revel nights | `revel.ts`, `holdRevel` in `tavern.ts` | The Revel Hall set (cushions, drapes, the big table), background group poses (2, 3 and 4 people, male and female), female partners at her slots, revel outfits, and the centrepiece | A house plans build and switch, Settings › Revel nights, and log lines |

## Karryn's Prison scenes outside brawls (later)

These aren't brawl scenes. They're listed so the full set is in one place:

- **Defeat scenes, 6 in KP:** `defeated_level1` to `defeated_level5`, plus `defeated_guard`. Tarven has one lost-brawl scene; KP's change by floor.
- **Waitress table:** `waitress_table`. Tarven already has this (`tableBack`, `tableBent`, `onTable`).
- **Receptionist:** `receptionist`.
- **Glory hole, 5 in KP:** `toilet_*`.
- **Stripper, 6 in KP:** `stripper_*`. The VIP room has 6 men at once.
- **Gym (DLC), 6 in KP:** `gym_*`.
- **Masturbation, 2 in KP:** `mas_couch`, `mas_inbattle`.

## Log lines

The log lines for the 13 KP scenes (`offer`, `taken` and `pose_` in `FOE_SCENES`) were written with Grok in the house voice. Each scene has 4 offer lines, 3 lines for the scene starting, and 4 for his turns in it.
