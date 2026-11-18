# Brawl scene poses: still to make

The rules for every brawl scene are already in the game (`src/game/brawlscenes.ts`, GAME_PATH.MD §7i). This file lists the 3D poses that are still needed to show them.

Until a scene has its own pose, the big picture shows Tarven's nearest existing pose (`pose` in `FOE_SCENES`, from the scene names in `sexpose.ts`). To give a scene its own pose:

1. Add the pose name to `ScenePoseName` and build it in `sexpose.ts` (the stage that draws it is `battleview.ts`). A pose can
   stand on props (`table`, or `props`: a post, a wall, a bench, the bar) and crop its camera the way KP frames the pose
   (`view.focus` and `view.zoom`; `view.distance` keeps the crop the same however many join in, and `view.fov` widens
   the lens for a shot from someone's eyes, as `footjob` does).
2. Set it as that scene's `pose` in `FOE_SCENES`, and give it a spot in `SCENE_JOINS` for every join the scene allows.
3. Tick it off below.

To check a pose in the game itself: `window.__game.testScenePose('<pose>', 'soldier', <joins true/false>)` in the dev
build's console (or the dev panel's scene pose tester) shows it in the big picture, bare and barefoot as the scenes show
her; `\` takes it down. Judge it at that size: hands on skin, tips at her mouth and hands, nothing through the floor.

To check a pose by eye off screen: `npx vitest run --config tools/posepreview/vitest.config.ts` (with `SCENES=` to pick).

The Karryn's Prison reference art for each pose is in the game's image folder: `D:\hh\Karryns.Prison.v1.2.7.2.Incl.ALL.DLC.Uncensored\…\www\img\karryn\<KP folder>`. The files are `.rpgmvp`, which are encrypted RPG Maker images; decrypted copies are in `…\Decrypted\karryn\<KP folder>`.

Joins are the places where another man can join the scene: her mouth (`mouth`) and her left and right hands (`left`, `right`). Every pose needs a spot for each of the joins its scene allows.

## Scenes that need a new pose

| Scene (`FoeSceneId`) | Who starts it | KP folder | Shown now as | What the pose needs | Joins |
|---|---|---|---|---|---|
| ~~`footjob`~~ | noble (KP's nerd) | `footj` | **`footjob`, done** | As KP draws it: she's sat on the floor, leaning back on her hands, knees up and out, soles together round him. He's sat facing her, legs spread round hers, leaning back on his hands (not holding her ankles: on this rig his hands can't reach them from there). | mouth, left, right |
| ~~`rimjob`~~ | soldier, smuggler (KP's guard, rogue) | `rimming` | **`rimjob`, done** | He's bent over a table on his hands, looking back. She's bent at the waist behind him (standing, as in KP's picture, not kneeling), face to his rear, hands on it. | left, right |
| ~~`piledriver`~~ | bandit (KP's slime) | `slime_piledriver` | **`piledriver`, done** | She's on her shoulders, hips up, legs folded over towards her head. He's kneeling up behind her raised rear, leaning over it, hands on her thighs. The mouth man lies on his side by her face. | mouth |
| ~~`kickCounter`~~ | bandit, adventurer, when she kicks (KP's thug, yeti) | `kick_counter` | **`kickCounter`, done** | She's standing on one leg, the kicking knee up over his forearm. He stands facing her, knees bent to her height, his other arm round her back. The mouth man stands on a bench behind them. | mouth |
| ~~`standPaizuri`~~ | farmer (KP's orc, yeti) | `orc_paizuri`, `yeti_paizuri` | **`standPaizuri`, done** | Her back to a post, slid down it to his height, knees out. He stands close, both hands squeezing her breasts round him. | mouth |
| ~~`soldierGangbang`~~ | soldier (KP's guard) | `guard_gb` | **`soldierGangbang`, done** | As KP's picture: he's on his back on the floor, she's astride him leaning forward on her hands, looking back; seen from low behind her. The squad kneels at her mouth and both hands. | mouth, left, right |

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
| ~~`againstWall`~~ | soldier, fugitive | **`againstWall`, done** | She's standing, pressed face-first to the wall (a wall prop), hands up on it, with him standing behind her. |
| `proneBone` | adventurer, fugitive | `prone` | No, it already has one. |
| ~~`lapRide`~~ | farmer, noble | **`lapRide`, done** | He sits on a bench (a bench prop), and she's on his lap facing him, her knees on the seat either side of him. |

## Art for the systems that already work (18 Nov 2026)

These systems already work in the game, but nothing is drawn for them yet. Each one shows nothing (or a stand-in) until its art is made.

| System | Code | Art needed | Shown now |
|---|---|---|---|
| Defeats (6) | `defeat.ts` (`defeatPlay`), `beginDefeat` in `tavern.ts`, `DuelStage.start(…, defeatPose)` | Still to make: one pose per defeat, with a spot for every slot (her mouth, hands, breasts, pussy, rear, and up to 4 men standing round her) and the props listed in DEFEAT_SCENES.md: kneeling in a ring, bent over the rain barrel, on her bed, bent over a cask, on the big table, on the floor in front of a squad | Stand-ins in use: the big picture holds `DEFEATS[id].standIn` (gangbang, bentover or missionary) for the whole defeat, the first still in at its heart and the rest at its join spots. The stand-ins have only 2 join spots, so with 4 on her some aren't drawn. |
| Toys (3) | `TOYS` in `fight.ts` | A model for each toy (buzzing charm, carved toy, string of beads), a cut-in for each (KP's toy cut-ins, `cutin.ts`), and one showing on her while it's in | Log lines only (`toy:in:*` and `toy:work:*` events, which have no comic shot) |
| Trinkets (12) | `trinkets.ts` | A small mesh for each on her model (lip tint as a material, nail paint, ribbon, ankle bell, garter, rings, coin, choker), worn like jewellery (`appearance.ts` jewel meshes) | Numbers only, chosen in Settings › Trinkets |
| Dancing on the bar | `danceOnBar` in `tavern.ts`, `sidejobs.ts` | A dance loop for her standing on the bar counter, and the room watching | A Settings › Side work button and a log line |
| Renting rooms | `rentOutRooms` | A front desk with a key board, and a lodger's room upstairs for the visits later | A Settings › Side work button and a log line |
| Her hair growing | `hairNights`, `growthOf` | Five looks from `pubes.ts`, from bare to wild, chosen by `hairGrowth`, and a bathhouse to trim at | Text in Settings › Side work |
| Riot nights | `riot` in `tavern.ts` | Optional: a rowdier room (more guests standing, broken stools) | A line in the log and the menu |
| Staff (15 friends + random hires) | `staff.ts`, `staff` in `tavern.ts` | A model per friend (each one's look is in STAFF.md §11 and the roster's `look`), work outfits per job, portraits for the Staff page and the HUD staff bar, a cook at the hearth, a barmaid carrying trays, a doorman on his stool; generic bodies for random hires by people and job | Text in Settings › Staff |
| Revel nights | `revel.ts`, `holdRevel` in `tavern.ts` | The Revel Hall set (cushions, drapes, the big table), background group poses (2, 3 and 4 people, male and female), female partners at her slots, revel outfits, and the centrepiece | A house plans build and switch, Settings › Revel nights, and log lines |
| Feed Star | `feedstar.ts`, `feedPost` and the rest in `tavern.ts` | A phone screen (feed, her page, likes, DMs, a camera view); a photo pose per post kind (over the stew, the pour, a mirror pose, leaning on the bar, lace by candle, the apron) and the four camera angles; a scrying crystal prop and a stream overlay (chat bubbles with timers, the hype meter); the trend rhythm screen and three trend dances; six Watched passive icons (FEED_STAR.md §8) | Settings › Feed, menus and log lines |
| The Knight path | `knight.ts`, `joinGarrison` and the rest in `tavern.ts` | Her knight kits per rank (armband, half-plate, full kit, Captain's cloak, Commander's plume); the drill yard and a beat-bar UI; the tourney lists; Commander Harlan Voss and the squad; raid scenes; the town hall and the Law board panel; rank badges, patrol, raid and scandal icons (KNIGHT_PATH.md §9) | Settings › Knight, menus and log lines; tourney and patrol fights use the usual brawl screen |
| The Guild | `guild.ts`, `joinGuild` / `guildRun` in `tavern.ts` | The guild hall (outside and in), quest board cards and the guild card, her adventurer outfit per rung, companions in adventuring kit, monsters, Kestrel Vey and the rival party, the ruins and the pass, injury looks (ADVENTURERS_GUILD.md §9) | Settings › Guild, menus and log lines |

## Karryn's Prison scenes outside brawls (later)

These aren't brawl scenes. They're listed so the full set is in one place:

- **Defeat scenes, 6 in KP:** `defeated_level1` to `defeated_level5`, plus `defeated_guard`. Tarven has all six as rules (`defeat.ts`), shown with stand-in poses until their own are made (the Defeats row above).
- **Waitress table:** `waitress_table`. Tarven already has this (`tableBack`, `tableBent`, `onTable`).
- **Receptionist:** `receptionist`.
- **Glory hole, 5 in KP:** `toilet_*`.
- **Stripper, 6 in KP:** `stripper_*`. The VIP room has 6 men at once.
- **Gym (DLC), 6 in KP:** `gym_*`.
- **Masturbation, 2 in KP:** `mas_couch`, `mas_inbattle`.

## Log lines

The log lines for the 13 KP scenes (`offer`, `taken` and `pose_` in `FOE_SCENES`) were written with Grok in the house voice. Each scene has 4 offer lines, 3 lines for the scene starting, and 4 for his turns in it.
