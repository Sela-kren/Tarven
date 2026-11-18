# Defeat scenes, Karryn's Prison style (for later)

**Status (18 Nov 2026):** the rules are built; the art isn't. Built:
- **Which defeat, and how many** (`defeat.ts`): `defeatFor` picks one of the six by where she lost and who won; `crowdFactor` sets the total from her records; each has its opening and morning-after lines, and counts in her records and passives.
- **Played like KP's defeat battles** (`defeatPlay` in `defeat.ts`, `DuelDefeat` in `duel.ts`, tests in `tests/defeatplay.test.ts`). It's the After Hours game, with:
  - **Up to 4 on her at once** (KP's `Math.min(4, max)`); the rest of the total (the one who won, his company and the room's keenest, up to the crowd factor) wait in line. Each time one finishes, the next steps into the free spot ("The bandit 3 steps into the free spot. 2 still waiting."), until the total's done.
  - **The slots are the parts of her in play:** mouth, left and right (her hands), breasts, pussy and rear (her butt), each holding one. The "other 1–4" are men standing round her: with no part of her free, one works himself up watching and finishes on her. The taproom floor is her mouth and hands plus 4 round her; the yard, her pussy and rear plus 4 round her; and so on, by the table below. With Consent on it's only what she offered of those.
  - **Everyone's ready:** a man goes straight for a free part of her (no warming up with kisses).
  - **Too tired to act** (KP's `STATE_DISABLED`, when `hasNoStamina() && hasNoEnergy()`): each of their moves wears 1 off her stamina, and with no stamina and no willpower left she can only *Let them* (and *Stop*, with Consent on). It lifts as soon as either is above nothing (Let them gives a little stamina back; so does a second wind when one finishes). The duel panel shows it ("Too tired to act").
  - **The picture** holds the defeat's stand-in pose (`DEFEATS[id].standIn`) the whole way through, the first still in at its heart and the rest at its join spots (`DuelStage.start(…, defeatPose)`, `tavern.defeatPose`).
- **The consent rule:** Consent on, she's offered it, each of the crowd asks and she ticks who comes (they're the line), and Stop always works. Consent off, it starts where she fell with no Stop.
- **Still to come:** each defeat's own pose and props (POSES_TODO.md, the table at the end), the per-slot lines, and the respect / fame / heat afterwards listed below.

This file sets out the six defeat scenes, like Karryn's Prison, with the rules, the models and poses, and the lines each one needs. POSES_TODO.md covers the brawl scenes; this file covers defeats.

Every character is an adult (18+). The consent rule (GAME_PATH.MD) still applies to all six:

- **Consent on (the default):** she's offered the scene and can say no. If she says yes, Stop always works.
- **Consent off:** it plays like Karryn's Prison: no question and no Stop.
- **Either way:** nothing happens while she's passed out, and nobody roaring drunk takes part.

## How Karryn's Prison does it (from the game's code)

- When Karryn loses a battle, the game starts a **defeat battle** in place of the next one. Which of the six it is depends on where she lost (`setupDefeatedLevelOneBattle` to `…FiveBattle`, plus `setupDefeatedGuardBattle`, in RemtairyEnemyTroop.js).
- Each defeat has its own **pose**, with a fixed set of **slots**. Each slot is a place on her a man can take: her mouth, her hands, her breasts, her pussy, her rear, plus "other 1 to 4", for the men standing round her.
- **How many men** come depends on a **factor** worked out from her records: the matching passives (for example, number of blowbangs, number of partners, each enemy type she's been with) and her edicts. Up to 4 start, and more come in as slots free up, until that night's total is reached (`_maxBlowbangParticipants`).
- Every man starts **already aroused**. Each one comes and leaves, and the scene ends when the last is done or she gives in. Every defeat counts toward her passives and titles.

| KP defeat | Where | Her pose | Slots |
|---|---|---|---|
| Level 1 (blowbang) | Floor 1 | Kneeling, a ring of men round her | mouth, left hand, right hand, other 1–4 |
| Level 2 (bathroom) | Floor 2 | Bent over in the toilets | pussy, rear, other 1–4 |
| Level 3 (solo cell) | Floor 3 | On the cell bed | pussy, rear, mouth, breasts, other 1–2 |
| Level 4 | Floor 4 | Held bent at the waist | pussy, rear, mouth, other 1–4 |
| Level 5 (captain) | Floor 5 | The full set | pussy, rear, mouth, both hands, breasts, other 1–4 |
| Guard defeat | Guards, anywhere | On the floor among the guards | pussy, rear, mouth, breasts |

## Tarven's six defeats

Which one plays depends on **where** she lost and **who** beat her, the way KP uses the floor. Each one has a picture of its own.

### 1. The taproom floor (KP level 1)
- **When:** she loses a brawl in the taproom with 3 or more people at the table that started it, or she's lost there before.
- **Who:** the winner, plus that table and anyone in the room whose lust is 6 or more. 3 at the start, then more up to her **crowd factor** (below).
- **Pose for the model:** she kneels on the sawdust in the middle of the room, sitting back on her heels, hands raised to her sides. The men stand round her in a ring, one in front at her mouth, one each side at her hands, and up to 4 more behind them. Props: an upturned bench, spilled tankards. Camera: three-quarter from above, so the ring reads clearly.
- **Slots:** mouth, left, right, other 1–4.

### 2. Out back in the yard (KP level 2)
- **When:** she loses in the yard, or she's thrown out of the door and the brawl carries on outside (with the yard built, `TOWN_DAY.md`).
- **Who:** the winner and his party. 2 at the start, then more up to the factor.
- **Pose:** she's bent at the waist over the rain barrel, hands braced on its rim, in the snow and mud. One man behind her, the others queued along the wall. Props: barrel, woodpile, lantern on the wall. Camera: side-on.
- **Slots:** pussy, rear, other 1–4.

### 3. Her own room (KP level 3)
- **When:** a night invasion she loses (`invasion.ts`), or a lost brawl where the winner carries her upstairs.
- **Who:** the one who won, plus up to 2 more if more came in.
- **Pose:** she's on her back across her bed, with him kneeling between her legs. Room for one at her mouth from the bedhead and one at her side. Props: her bed, candle, clothes on the floor. Camera: from the foot of the bed.
- **Slots:** pussy, rear, mouth, breasts, other 1–2.

### 4. The storeroom (KP level 4)
- **When:** she loses near the cellar or storeroom door (a new place), or she loses while carrying a cask.
- **Who:** the winner and anyone who followed them in. 2 at the start, then up to the factor.
- **Pose:** she's bent over a big ale cask, with her hips over the barrel's curve. One man behind her and one in front at her mouth; the others wait among the shelves. Props: casks, hanging hams, a single lantern. Camera: low, side-on.
- **Slots:** pussy, rear, mouth, other 1–4.

### 5. The Baron's men (KP level 5, the captain)
- **When:** a late-game defeat against the Baron's captain, or his men when the debt is called in. This is the story's big defeat, and it should only ever happen once per run, or once per act.
- **Who:** the captain, plus his men up to the factor.
- **Pose:** she's on the big table at the middle of the taproom, which the captain has cleared, with men at every slot. This is the busiest scene in the game. Props: the Baron's banner, a writ nailed to the table. Camera: wide, then close-ups in cut-ins.
- **Slots:** pussy, rear, mouth, left, right, breasts, other 1–4.

### 6. The garrison (KP's guard defeat)
- **When:** she loses to soldiers: a soldier table in the taproom, or a raid (`raids` in her records).
- **Who:** the soldier who won, plus his squad. They "take turns in order", the way KP's guards do.
- **Pose:** she's on her back on the floorboards with the squad round her in a neat line. The man in charge kneels between her legs, and the others stand to attention, waiting. Props: helmets set down in a row, a spear rack. Camera: from the head of the line.
- **Slots:** pussy, rear, mouth, breasts.

## The rules to build

- **Crowd factor (KP's `getDefeatedLv…Factor`):** how many men the defeat holds in all. Base 2, plus:
  - +1 for every 10 partners she's had (`taproomPartners`)
  - +1 or +2 for each passive that matches the place (for example *The Whole Room* for the taproom)
  - +1 with high fame
  - +1 if the tavern rule *The Back Room* is in force

  Cap it at 8 (KP lets the VIP room go to 6, and defeats go higher).
- **Joining as slots free up:** up to 4 at the start. Each one who comes leaves, and the next takes his slot. This is like KP's `onTurnEndSpecial_defeated…`, and like the table scene's queue (`taproom.ts`), which already has a line waiting.
- **Everyone is ready at the start:** every man starts erect (KP's `setAllEnemiesToAroused`).
- **Her side:** it plays as the After Hours game (`duel.ts`). She can do *Let them*, use her willpower skills, or (with Consent on) *Stop*. A lost game gives the **Overwhelmed** debuff as now.
- **Afterwards:** a morning-after line by place. Then:
  - respect −2, plus −1 for every 2 men
  - fame +2, plus +1 for each man
  - heat +1 if it was the garrison or the Baron's men
  - records: `defeats` by place, and the most men in one defeat
- **Passives and titles to add:** one per place, earned after 3 defeats there (KP's per-defeat passives), and a title for 10 defeats in all.

### Code plan
- `src/game/defeat.ts`: `DefeatId`, `DEFEATS` (place, slots, pose, KP basis), `defeatFor(place, winner)`, `crowdFactor(records, passives, rules)`. Pure rules, with tests in `tests/defeat.test.ts`.
- `tavern.ts`: `forceBrawlDuel` and the lost-brawl offer pick a defeat with `defeatFor`, and pass its slots and crowd to `startDuel`.
- `sexpose.ts`: six new `ScenePoseName`s (`defeatRing`, `defeatBarrel`, `defeatBed`, `defeatCask`, `defeatTable`, `defeatSquad`), each with a spot for every slot.
- `duelstage.ts`: room for up to 4 "others" standing round her (KP's other 1–4).

## What each defeat needs from the art side

| Defeat | New pose for her | Men's spots | New props |
|---|---|---|---|
| Taproom floor | kneeling, sitting back, hands raised | front, left, right, 4 round | upturned bench |
| Yard | bent over a barrel | behind, 4 queued | rain barrel, woodpile (yard set) |
| Her room | on her back across the bed | between her legs, bedhead, side | her bed (exists?) |
| Storeroom | bent over a cask | behind, front, 4 among the shelves | cask, shelves, hams (storeroom set) |
| Baron's men | on the big table | every slot, plus 4 | banner, writ |
| Garrison | on her back on the floor | between her legs, plus a line of 3 | helmets, spear rack |

## Lines each defeat needs (get them from Grok, as for the brawl scenes)

For each of the six:
- 4 **start** lines (the room as it begins)
- 3 lines for **each man taking a slot**, one set per slot type
- 4 lines for **his turns**
- 3 lines for **him finishing and leaving**
- 2 **morning-after** lines

Her own lines come from `brawlher.ts` by her stage, as now. Use the same Grok prompt as before, with these settings and slots.
