# Tarven – Karryn-inspired guest types, preferences & systems

**Tarven is an adult game, written raw and hard, as explicit as Karryn's Prison** (STORY.md, house rules). Every character is an adult (18+). What she can do and what's done to her follows the consent rule below.

## Consent rule (always — for any agent or implementation)
Normal service touches: player is asked first. All four answers stay available.
Pull away always works on later reaches. Too-drunk blocks yes.
Force / intensity bars are feedback only after a yes or after a Horny direct touch.

Horny / high-Nerve exception (Karryn-style challenge):
When a guest is Horny or has high Nerve, they may touch without the choice screen.
This is intentional difficulty. The player can still Slap or Pull away on the next reach.
See “Horny direct touch” below.

Brawl loss is a separate exception: a sexual scene may be offered after defeat, with a final continue/stop choice.
Brawl battle (7i, Karryn-style): mid-brawl, a foe may start or join a scene only once her desire is ready for it (its requirement). Consent on asks first; Pull away always works; too-drunk blocks it.

**Consent off is Karryn's Prison** (the player's choice, in Settings › Consent; On is the default and keeps every rule above):
- **In a brawl, it just happens.** A foe's hands land with no question (no Slap, no Pull away); a foe starts or joins a scene she's ready for without asking (KP's desire requirements still hold). She can still Struggle free of a scene.
- **Clothes are torn off by attacks** (7l): a foe going for her clothes tears them off, and their grapples can tear the next piece too (30%).
- **The table even when dead drunk** (7f, KP's waitress sex): at drink 8 (Hammered) it stays open, and an aroused guest has her on it whether she's ready or not. **Passed out (the 9th drink), nothing happens to her**: KP doesn't do that either, and the night is over.
- **Defeat just happens** (Brawl loss below): no offer, no continue / stop choice and **no Stop**: the one who won and all their company take her right where she fell. Never by a guest roaring drunk.
- **Night invasion** (KP's, `src/game/invasion.ts`): easing the ache herself at bedtime makes noise, and it can draw back someone who left tonight wanting her (lust 6+, sober, a man, never the Baron). 15% to start, +up to 25% the more worked up she was, +3% a Slut Level, +up to 10% with fame, never past 60%; nobody left wanting her, nobody comes. One comes in, up to 3 the louder she was. It's a brawl in her room with every brawl rule (Consent off): she's still worked up (her desire stays), just came (reeling: they get the first move, KP's sneak attack), bare on her bed, and nobody's watching. Win or talk them down: they're out, the door's barred, and it's bed. Lose: KP's defeat right there on her bed, all of them who aren't spent, no Stop. Records: invaded, threw them out. Never with Consent on.

## Horny direct touch (Karryn-style challenge)
When a guest is in the Horny state or has high Nerve (example: Nerve 5+):
- They may skip the choice screen and the touch lands immediately.
- This only happens on touches at or below their current Nerve.
- Chance can be fixed or scale with how Horny / high Nerve they are (example: 25–50 %).
- After it lands, the player can still Slap or Pull away on the next reach.
- The Force bar appears and fills faster during these direct touches.
- The text should show the guest acting on impulse. The player is challenged to manage the situation, not locked forever.

All other (non-Horny, lower-Nerve) touches still freeze and show the four choices.
Pull away still works on every later reach.
Too-drunk still blocks yes from either side.

## Brawl notes
- Non-sexual grapples (grabs, headlocks, hair-pulls, tackles, bear hugs, arm twists, pins against the wall, leg sweeps, collar hauls) are combat actions and do not need a yes/no prompt. Each guest kind has favourite grapples (bandits crush and pin, smugglers trip and twist, nobles haul by the collar). Code: `FOE_GRAPPLES` in `src/game/fight.ts`.
- Mid-brawl sexual reaches go through the normal four-choice touch screen (Let / Lean / Slap / Pull away). Pull away always works.
- A foe going for her clothes mid-brawl (7l) is a reach like any other with Consent on: asked on the touch screen, Pull away always there. Consent off (KP), it's torn off her.
- **[planned] Karryn's battle (7i):** foes may also start sex mid-brawl, join a scene she's in, grope, talk and stare, the way Karryn's Prison enemies do. Consent on, it asks like a reach; Consent off, it plays out only once her desire is ready for it. Pull away always works.
- Mid-brawl reaches are Karryn-style: bolder than at the table (+2 Nerve for what they go for), aimed at the part their type likes, and they can use brawl-only touches open to any kind: spank, hips hauled back, thumb across the lips, breath on the neck, a grope, a hand up the thigh, a squeeze under the breasts, a kiss mid-fight (`brawl: true` in `touchtalk.ts`). A touch can only land unasked (Consent off) when it is within their own Nerve, without the brawl's +2.
- A talked-down brawl can later lead to an After Hours invite, which the player can accept or refuse.

## Brawl loss (Karryn-style)
**Consent off** (KP's defeat): none of the asking below. It starts at once, right where she fell (the room watching), with the one who won and all their company, every part of her she's warm enough for (a kiss always), no stake and **no Stop** (Esc does nothing); it ends when they're all spent or she gives in, and the night with it (`forceBrawlDuel` in `tavern.ts`, `Duel.forced`). Not with a winner roaring drunk: then it's the usual offer, which is blocked anyway.

When she loses a brawl (Consent on):
- The fight ends immediately.
- A sexual content scene is offered (18+ card or short scene).
- She gets a final choice at the start of the scene: continue or stop.
- If she continues, she picks where (7f): right where she fell, upstairs in her room, or out back in the yard; with the one who won, and their company (their party, or else whoever shares their table, never anyone roaring drunk, never the Baron). **Each of them asks**, and she ticks who comes up (all ticked to start). It plays as the After Hours game with all of them (`startDuel(..., crewIds)` in `tavern.ts`, `showDuelRules` in `fightpanels.ts`), and Stop ends it for everyone. Desire meters and records can rise, then the night ends.
- If she stops, the night still ends and she only loses the normal gold and respect.
- Gold and respect are lost either way.
- **She's Bruised** (a debuff, `src/game/debuffs.ts`) through the next night: saying no costs 25% more willpower, her hold is 1 weaker (Consent off), and guests reach for her 15% more. Losing again before it wears off makes it worse (level 2).
- Winning or talking them down does not trigger this.

---

*(Consent on: normal service touches require explicit player choice. Pull away always works on later reaches. Too-drunk blocks yes. Force bar is intensity feedback. Horny / high-Nerve guests may touch without asking as a challenge. Brawl loss may offer a sexual scene with a final continue/stop choice. Consent off: Karryn's Prison, see the consent rule at the top.)*

Status tags: **[built]** is in the game now, **[planned]** is design only.

---

## 1. Groups and types [built]
Guests come in **groups** (who they are and how they talk) and **types** inside each group (their numbers). A farmer and a soldier differ, and so do an archer and a mage, even though both are adventurers. Every type has its own stat sheet (section 2), and every guest rolls their own numbers inside that type's range (section 3).

| Group | Types | Outfit | Arrives |
|---|---|---|---|
| Farmers | Farmer | plain clothes | from night 1 |
| Soldiers | Soldier | plain clothes | from night 1 |
| Smugglers | Smuggler | pirate rig | from night 1 |
| Fugitives | Stranger | plain clothes | from night 1 |
| **Adventurers** | Archer, Warrior, Mage, Cleric | their class outfits | night 2 (a party of four) |
| **Bandits** | Rogue, Brute | red-scarf outfits | night 3 (a pair) |
| **Nobles** | Noble, Servant (Maid on her body, Footman on his) | noble / servant outfits | night 3 (noble with servant) |
| Knights *(sub-group of soldiers)* | — | knight toolkit | [planned] |

- A party gets one of each type before anyone doubles up (archer, warrior, mage, cleric). Guests who come in alone take turns through their group's types.
- Once there's a fans system, the new groups should arrive at fan milestones (STORY.md, section 5: adventurers at 300 fans, bandits at 500, nobles at Pass Ledger rank 2). For now they're fixed into nights 2 and 3.

---

## 2. Each type's stats [built]
These are each type's own numbers, before the random roll. The code is in `src/game/guestroles.ts` (`ROLES`).

### Service
| Type | Patience (s) | Pay | Tip | Favourite | Stays | Dirt bothers them | Fame if happy | Heat if they walk out |
|---|---|---|---|---|---|---|---|---|
| Farmer | 55 | 4 | 2 | Mead | 1.0× | 1.0 | 0 | 0 |
| Soldier | 30 | 6 | 1 | Vodka | 1.0× | 0.6 | 0 | 2 |
| Smuggler | 40 | 9 | 4 | Wine | 1.0× | 1.0 | 0 | 0 |
| Stranger | 45 | 5 | 3 | Vodka | 0.9× | 0.5 | 0 | 0 |
| Archer | 35 | 7 | 3 | Mead | 1.0× | 0.8 | +1 | 0 |
| Warrior | 30 | 8 | 2 | Vodka | 1.25× | 0.4 | +1 | 1 |
| Mage | 50 | 10 | 4 | Wine | 1.3× | 1.3 | +2 | 0 |
| Cleric | 65 | 6 | 5 | Mead | 1.1× | 1.1 | +1 | 0 |
| Rogue | 35 | 7 | 3 | Wine | 0.9× | 0.5 | 0 | 1 |
| Brute | 25 | 6 | 1 | Vodka | 1.1× | 0 | 0 | 3 |
| Noble | 40 | 16 | 8 | Wine | 1.2× | 2.5 | +3 | 1 |
| Servant | 70 | 3 | 2 | Mead | 0.8× | 1.5 | 0 | 0 |

- **Dirt bothers them:** how much a messy room cuts their patience. 0 doesn't notice, 2.5 can barely sit down.
- **Fame if happy:** extra fame when they're served in time and tip, because they talk about the place on the road.
- **Trust:** farmers and strangers give +1 village trust when served, the servant +1, the cleric +2.

### Temper and drink
| Type | Nerve | Lust limit | Longing limit | Vodka gets them drunk | Usual moods (walking in) |
|---|---|---|---|---|---|
| Farmer | 1 | 4 | 8 | 1.0× | Gloomy, Happy |
| Soldier | 3 | 7 | 7 | 1.0× | Drunk, Angry |
| Smuggler | 2 | 6 | 9 | 0.9× | Scheming |
| Stranger | 1 | 3 | 10 | 1.1× | Scared, Gloomy |
| Archer | 2 | 6 | 7 | 0.9× | Happy, Drunk, Lustful |
| Warrior | 3 | 7 | 6 | 0.5× (holds it) | Drunk, Happy, Angry |
| Mage | 1 | 4 | 9 | 1.4× (lightweight) | Happy, Scheming, Gloomy |
| Cleric | 0 | 2 | 8 | 1.0× | Happy |
| Rogue | 4 | 6 | 7 | 0.8× | Scheming, Lustful, Angry |
| Brute | 5 | 8 | 5 | 0.6× | Angry, Drunk |
| Noble | 2 | 5 | 9 | 1.2× | Scheming, Lustful, Angry |
| Servant | 0 | 3 | 9 | 1.1× | Gloomy, Scared |

### Brawls
| Type | Stamina | Attack | Accuracy | Notes |
|---|---|---|---|---|
| Farmer | 14 | 3 | 55% | |
| Soldier | 24 | 6 | 70% | |
| Smuggler | 18 | 4 | 65% | |
| Stranger | 16 | 4 | 60% | |
| Archer | 18 | 5 | 85% | rarely misses |
| Warrior | 32 | 6 | 60% | the tank: hard to wear down |
| Mage | 12 | 7 | 75% | hits hard, goes down fast |
| Cleric | 22 | 2 | 50% | soaks hits, barely hits back |
| Rogue | 16 | 5 | 85% | quick and accurate |
| Brute | 34 | 8 | 55% | the strongest fighter in the game |
| Noble | 10 | 2 | 45% | |
| Servant | 12 | 2 | 50% | |

### Upstairs and after hours

**Winning and losing (Karryn's way).** She **wins** when every partner (the line included) has given in. A climax doesn't end it: she comes, it costs **10 willpower**, and her pleasure drops to 50. She **loses** when her **willpower hits 0**: she takes the **Overwhelmed** debuff (up to 3, for the next 2 nights: saying no costs 20% more willpower and guests reach 10% more, per level), but **it plays on to the end**, until the last of them is done. Lost, she can **Let them** (a turn with no move, +4 stamina), and they get there faster (+5 to their pleasure a move instead of +2). Every climax counts toward her lewdness (+1 each), and a lost game still pays the stake. **Stop always works**, lost or not: stopping after she's lost ends it, and she keeps the debuff.

| Type | Goes for first | Lasts (stamina) | Hard to push over | Skill | Load (ml) |
|---|---|---|---|---|---|
| Farmer | Hands | 22 | 1.15 | 0.85 | 9 |
| Soldier | Pussy | 30 | 0.8 | 1.25 | 12 |
| Smuggler | Butt | 25 | 0.9 | 1.1 | 8 |
| Stranger | Mouth | 24 | 1.0 | 1.0 | 7 |
| Archer | Butt | 24 | 1.0 | 1.15 | 9 |
| Warrior | Pussy | 34 | 0.8 | 1.15 | 12 |
| Mage | Mouth | 18 | 1.2 | 1.0 | 7 |
| Cleric | Hands | 26 | 1.3 | 0.9 | 8 |
| Rogue | Butt | 22 | 0.9 | 1.3 | 8 |
| Brute | Pussy | 32 | 0.75 | 1.2 | 14 |
| Noble | Mouth | 20 | 1.25 | 1.0 | 7 |
| Servant | Hands | 22 | 1.1 | 0.9 | 8 |

---

## 3. Random within a range [built]
Like enemies, no two guests of a type are the same. Each guest rolls their own sheet as they walk in (`rollStats`), somewhere around their type's numbers:

| Stat | Range |
|---|---|
| Patience | ±20% |
| Pay | ±25% |
| Tip, Nerve, Lust limit, Longing limit, Brawl attack | ±1 |
| How long they stay | ±15% |
| How easily drink gets them | ±25% |
| How much dirt bothers them | ±20% |
| Brawl stamina | ±20% |
| Brawl accuracy | ±8 points (kept between 30% and 95%) |
| Upstairs stamina / resist / skill | ±10% |
| Load | ±20% (and each load varies again on top) |

- What they **are** never rolls: group, type, outfit, favourite drink, what they go for first, usual moods.
- The ranges keep the types in order: the best mage still has less brawl stamina than the worst brute.
- The rolls use their own random source, so they don't change any other chances in the game.

**Who they look like [built].** Each guest also rolls their body (male or female) and a look: skin tone, hair and eye colour, and which colouring of their outfit (or, for farmers, soldiers and strangers, which plain clothes). Before, both came from the order they walked in, which starts over each night, so the first farmer was the same man every night.

**Who comes tonight [built].** Each night's list (NIGHTS) is the night's story, and the road changes around it (`rollArrivals`):
- Parties and whoever carries the rumor always come, as written.
- Anyone walking in alone may be another of the night's kinds (30%), comes up to 8s late, and after the first night may stay home (15%).
- More walk in on top, between ⌊draw/3⌋ and 1 + ⌈draw × 0.6⌉ (at most 6). **Draw** = each upgrade + each set of cups or dishes bought + each bottle on the shelf, so a kitted-out tavern (draw 10) gets 3 to 6 more every night.
- A busier or quieter night says so in the log as it begins.
- Tests run the nights as written (`crowdDice.roll = null` in tests/setup.ts).

---

## 4. Preferred touch meters [planned]
Each type has a base Nerve (section 2) and a preferred desire meter. When they reach, the touch is weighted toward their preference (still gated by Nerve and the player's matching Desire).

| Type | Base Nerve | Preferred meter | Flavour notes | Typical boldness range |
|---|---|---|---|---|
| Farmer | 1 | Body / Mouth | Gentle, lap, hand, hair, cheek | 1–5 |
| Stranger | 1 | Body | Cautious, secretive, hair, neck, waist | 1–6 |
| Smuggler | 2 | Pussy | Under-table, thigh, lap, intimate | 3–8 |
| Soldier | 3 | Butt / Breasts | Physical, rear, chest, pins, carries | 4–9 |
| Knight *(sub)* | 3 | Butt / Breasts | Same as soldiers, more formal | 4–9 |
| Archer | 2 | Butt | Playful, a pinch on the way past, cheeky | 2–8 |
| Warrior | 3 | Breasts / Butt | Big hands, lifts and carries, loud about it | 4–9 |
| Mage | 1 | Mouth | Wordy, a finger to the lips, a whisper in the ear | 1–6 |
| Cleric | 0 | Body | Shy, a hand on the shoulder, a blessing that lingers | 0–4 |
| Rogue | 4 | Pussy | Sly, under the table, quick fingers | 4–9 |
| Brute | 5 | Breasts / Butt | Crude, grabs, pulls onto a lap | 5–10 |
| Noble | 2 | Mouth / Body | Expects it, a gloved hand, a chin lifted to look | 2–8 |
| Servant | 0 | Body | Nervous, apologetic, only once someone else has | 0–5 |

- Base nerve, and how nerve grows with lust, mood, drink and touches allowed, are **[built]**.
- **[built]** Preferred meter gets +40% weight when picking a touch at the table (`PREFER_PULL` in `tavern.ts`; +200% mid-brawl).
- **[built] Breasts and behind, Karryn-style.** Every kind of guest has chest and rear touches (a pinch, a swat, a brush, a cup, a grope, both hands; plus their own: the adventurer's pat for luck, the bandit's smack and grab, the farmer's clumsy pat, the noble's gloved hand, the stranger's hand over her heart). They only go for them as far as she's **open** to it: openness = her desire for that part (0–10) + her Slut Level. A chest or rear touch needs their nerve as ever, **and** openness ≥ its boldness − 3, so at 0 only the pinch (3); each point of openness opens one more step. Every point also makes them go for that part 10% more often. Her answer is still hers: openness only decides what they try (`openness`, `LEWD_REGIONS` in `src/game/touch.ts`). A brawl isn't held to it.
- Allowing a preferred-meter touch gives extra tip and a small extra rise to that meter.
- Force bar still shows the actual boldness of the chosen touch (1–10).

---

## 5. Named regulars & "Wanted" system [built]
The rules are in `src/game/regulars.ts`; the tavern marks what happens with each guest through the night and settles it at the end (`mark`, `settleRegulars`, `regularsTonight` in `tavern.ts`). Tests: `tests/regulars.test.ts`.
- **Becoming one:** a guest who takes a **first** with her (adult play, or three touches she let land in one night) or **settles a brawl** with her (either way) becomes a named regular, at most **2 per kind**. They get a name of their kind (no two alike), and the morning news says so.
- **Always the same person:** they keep the sheet, body and look they had that night (section 3), from then on.
- **Coming back:** each night every regular has a chance to walk in (50%, +5% per night she's let them, at most 85%), at most 3 a night. They walk in with a line in the log by what they remember most (`REGULAR_RETURNS`): she let them, slapped them, adult play, they beat her, she beat them. Their name shows when they speak.
- **Bolder:** +0.5 lasting nerve per night she let them touch her (at most +2); **−1 after a slap** until she lets them again.
- **Stronger:** each time she beats them in a brawl, they come back with +0.5 nerve, +2 brawl stamina, +1 attack and +1 after-hours stamina.
- **Wanted** (journal, last tab): every regular, with their kind, nerve (theirs and what she's built up), the part they go for, what they remember, their history with her, and their brawl and after-hours numbers.
- Saved with the tavern. Not yet: regulars after After Hours duels, and the first three (Silas, Mara, Rhea) as regulars from the story (they're still story characters only).

---

## 5b. Taking orders [built]
A guest who sits down doesn't say what they want until she asks (`takeOrder` in `tavern.ts`).
- **Calling her over:** a raised hand over their head, the patience bar under it, a line in the log ("A farmer at table B is calling you over") and a call out loud that never names the order ("Over here, love!"). Left too long, they complain nobody's asked.
- **Take their order** (E on them, tray or no tray): they say it out loud, the log notes it ("...wants an ale"), and only now does the order icon show and can she serve them. Bringing the right thing before she's asked does nothing.
- Leaning in to listen is another chance to be grabbed (7d).
- Patience runs from the moment they sit, so a guest left calling can still walk out.
- The tests' setup has guests order as they sit (`tableService.takeOrders = false`); `tests/orders.test.ts` covers taking orders.

## 6. Guest states

### Moods [built]
Every guest walks in with a mood from their type's usual moods (section 2), your reputation and how dirty the room is. It changes as you treat them.

| Mood | Patience drains | Tips | Extra tip | Stays | Other |
|---|---|---|---|---|---|
| Calm | 1.0× | yes | — | 1.0× | |
| Happy | 0.85× | yes | +1 | 1.1× | |
| Angry | 1.25× | no | — | 0.8× | may start a brawl |
| Lustful | 0.75× | yes | +3 | 1.25× | bolder hands |
| Idolizing | 0.6× | yes | +4 | 1.35× | comes with fame |
| Drunk | 1.0× | yes | +2 | 1.3× | spills, may start a brawl |
| Gloomy | 0.9× | yes | — | 1.2× | |
| Scared | 1.15× | yes | — | 0.7× | heat makes it worse |
| Scheming | 0.95× | yes | +2 | 1.0× | |

A type's mood numbers multiply on top of their own. For example, a lustful cleric still waits longer than a lustful brute.

### Extra states [planned]
States can stack with mood and affect Nerve or touch choice:

| State | Effect |
|---|---|
| Horny | +1.5 Nerve, strongly prefers their type's meter, higher Force visuals |
| Eager | Extra tip if player Leans in; slightly higher chance to reach |
| Shy | –1 Nerve until player allows at least one touch (default for Cleric and Servant) |
| Erect | (flavour) slight penalty to their "critical" resistance in After Hours |
| Drunk | Existing rules: too-drunk blocks yes from either side |

Name prefixes (Great, Bold, Fat, Quiet, etc.) can apply small buffs/debuffs **on top of the rolled sheet**, for example "Bold" +1 Nerve, "Fat" +20% brawl stamina and −10% patience, "Quiet" −1 Nerve and +10% patience.

### Showing stats [planned]
- A guest card when you look at a guest: their type, mood, and a few key stats (patience, purse, nerve, fists), so the player can see a strong brute coming.

---

## 7. Force bar and "Give in" [built]
**Her answers to a touch.** Slap and Pull away are offered at every desire level and always work. Let it happen and Lean into it appear as her desire allows. Too drunk on either side means no yes of any kind.
- **High desire doesn't remove any choices.** It makes saying no cost willpower (`refuseCost`). With no willpower left, the no still works, but the room sees her waver.
- **"Give in"** is an extra button that appears once her desire is 3 or more past what the touch needs (`GIVE_IN_MARGIN`). The player has to pick it. It pays between Let it happen and Lean into it (level + 1 gold). Its lines are her choosing not to resist (`touchtalk-givein.ts`), never her being held or a touch landing after a no.

**The Force bar** is the intensity of a touch she has already said yes to.
- It appears only **after** Let it happen, Lean into it or Give in, never while she's still choosing, and never after a slap or a pull.
- It shows the touch's boldness (1–10) and her mind stage. It turns red at 6+ and deep red at 9+.
- **Bonus once a yes lands:** level 6+ gives +1 gold and +25% extra rise on that body part's meter. Level 9+ gives +2 gold and +50% (`intensityBonus`).
- [planned] When a guest is Horny or touches their preferred meter, the bar can flash or show a small icon.

## 7b. Consent switch: touching without asking [built]
A lustful guest with the nerve for it (Nerve 5+) is **impulsive**; so is a worked-up foe who reaches mid-brawl. With Consent switched off, a check decides whether their touch plays out without the choice screen.

| Setting (Settings › Consent) | Default | Meaning |
|---|---|---|
| Consent | **On** (always ask me) | On: every touch asks, at the bar and in a brawl. Off: impulsive guests' touches go to the check below |
| Up to boldness | 5 | The boldest touch the check covers (1–9) |

**The check (Consent off): their push against her hold** (`impulseCheck`, `src/game/touchsettings.ts`):

| Their push (enemy) | Her hold (player) |
|---|---|
| their Nerve | 6 + the touch's boldness |
| +2 if their type goes for that part (`prefers`) | − desire for that part ÷ 20 (0–5) |
| +1 per piece of clothing off her | − her passives for that part (up to 3) |
| +2 if they have hold of her (a grab at the table, 7d) | − times she's let that part be touched ÷ 5 (up to 3) |
| | − body skill practice (up to 3) |
| | − Exhibition passives, once something's off (up to 2) |

- **Push at or past her hold:** it plays out as *Let it happen*: the guest's reach, an impulse line, the touch's own line, and *Get back to work* (or *Back to the fight*). The comic panel plays, and the Force bar rushes up (`fast`).
- **Her hold stands:** she's asked like any other time.
- **The first time** an impulsive guest reaches with Consent still on, the touch freezes as usual with two extra answers on top: *"Let it happen, and let eager guests skip asking (Consent off)"* and *"Always ask me first"*. Every usual answer stays.
- **It only covers touches she could already say yes to:** desire high enough for *Let it happen*, nobody too drunk, within the boldness chosen. Adult play isn't weighed by push and hold: her state decides it (7f). A garment counts, but she holds on to her clothes harder (+2 to her hold). Pull away still works on the next reach.
- The dev panel (**]**, dev builds only) shows both sides of the last check and why it played out or asked.
- The settings live in the browser (`tarven.touch`), not in a save. The code is in `src/game/touchsettings.ts`, `tavern.ts` (`maybeReach`, `impulseFacts`, `touchOptions`), `menus.ts` (`showSettingsMenu`, `showDevPanel`) and `touchtalk-givein.ts` (`IMPULSE_LINES`). The tests are in `tests/touchsettings.test.ts`.

## 7d. Grabbed at the table [built]
As she leans in to take a guest's order, or sets down what they ordered, they may take hold of her: a wrist, her waist, her apron strings (`src/game/grab.ts`, `maybeGrab` in `tavern.ts`). A grab isn't a touch in itself; it's what comes before one. A guest with hold of her goes for her clothes.

- **How often:** 8% to start, +2.5% per point of nerve past 3, ×1.5 if they're drunk or lusting, by kind (bandits ×1.6, soldiers and smugglers ×1.2, strangers ×0.5), never past 40%. Passives move it (Slippery −30%, Held Fast +25%).
- **It's talked through:** what they do, what they say (each kind has its own lines), what she thinks, and what's said back after she answers.
- **Consent on:** she answers the grab.
  - *Twist free:* always works, like Pull away. Nothing comes off.
  - *Slap their hand away:* always works, +1 respect; about a third take it badly and turn angry.
  - *Let them hold you:* +1 fame. Only now do they go for her clothes, with the held strip tries (any kind: hand-in-the-piece tug L3, a fist in it L5, peeled off slow L7). That reach **asks like any other**, Pull away included.
- **Consent off:** the grab just happens, with no answer to it ("You don't get the chance to pull away"). They go straight for her clothes, through the push-vs-hold check, with their grip adding +2 to their push. If her hold stands, she's asked as usual. A guest who isn't impulsive still asks.
- Nothing left to take, and they let go with a wink.
- **Records and passives:** grabbed, broke their hold, let them hold you (journal, Records). *Slippery* (break 8 holds: grabbed 30% less). *Held Fast* (let 6 hold you: +2 gold each time; grabbed 25% more).
- The tests are in `tests/grab.test.ts`; elsewhere the tests' setup turns grabs off (`grabDice.roll = null`).

## 7e. "Give us a look" [built]
A bold guest may offer coin for a look at her as she serves them (`src/game/show.ts`, `maybeAskToSee` in `tavern.ts`). **Always asked, always her doing**: nothing here happens unless she picks it, and no is always there.

- **What they ask to see:** one thing, the part their type likes (breasts, behind, pussy) if they've the nerve for it (her band needs nerve 2, her breasts, smallclothes or behind 3, her pussy 5); short of it, the boldest thing on the way they've the nerve for (her smallclothes, then her breasts, then her band). Asked as she takes their order or serves them. Chance: 12% + 3% per nerve past 2, by kind, ×1.5 lusting or drunk, at most 40%.
- **Her answers: each thing on its own,** whatever they asked for, so she picks how far she goes (the one they asked for marked, and +2 gold):
  - *Show them your breast band* (or her bra style's name): 2 gold.
  - *Show them your breasts*: bare, 5 gold. Both, or just the one: which is picked at random each time, both, her left or her right (`SHOW_SIDES` in `show.ts`), each as likely.
  - *Show them your smallclothes* (or her briefs style's name): 3 gold.
  - *Show them your pussy*: bare, 8 gold.
  - *Show them your behind*: bare, 5 gold.
  - *"Not a chance."*
  Bare looks are +2 fame, −1 respect, and the whole room gets an eyeful: every other guest +1 lust. Underwear she's lost tonight (or has none of) is greyed out "(you've nothing on there)".
- **How far she'll go** depends on that part's desire meter (÷10): her band 0, her smallclothes 2 (her pussy's meter), her breasts or behind 3, her pussy 5. Each exhibition passive takes 1 off (up to 2). Not ready, and the answer is greyed out with "(you're not ready for that)".
- **Too drunk** on either side, and no yes is there.
- **She acts it out, nothing just vanishes** (`ShowPose` in `player.ts`, shown in her dialogue portrait too, face to face):
  - *Her band or her breasts:* both hands drag her top down under her breasts, and the cloth goes with them (`Dresser.setPull` in `appearance.ts`): her chemise, bodice and its laces roll down into a band under her breasts at the front, slanting off round her sides, her back and sleeves staying put; then she presents them, elbows open out to her sides, each palm turned up right under a breast, holding it up. A top that can't come down (the priestess's gold top) is lifted up over them instead, rolled on her chest above, her hands holding it there (`TOP_PULL` / `topPull` in `wardrobe.ts`). For her breasts her breast band goes too (it's painted on her). Baring just the one, her top comes off that breast only, fading out across the middle of her chest (`side` on the pull), that hand holds it up (or holds her top lifted over it), her other hand rests on her hip, and she turns that breast a little towards them (`chestDownL`/`chestDownR`, `chestUpL`/`chestUpR`). The cloth follows her hands as the pose eases off after.
  - *Her smallclothes or her pussy:* both hands at her waist hold the front of her long skirt gathered up, apron and all, bunched in a short roll at her waist (`Skirt.setLift`, the skirt panels' mid-thigh joints from `build_world.py`; the cloth below her hips shrinks along as it's gathered, `GATHER` in `skirt.ts`, and the panels either side of the front come up all the way too, so the front's open), so she's seen from the front. The rest of the skirt is hitched up to her knees with it, so no long tail trails beside the bunch. For her pussy her smallclothes come off as well.
  - *Her behind:* she turns round, looks back over her shoulder, and both hands hold her skirt gathered up behind at her waist; her smallclothes off. The skirt panels hang from about the middle of her behind, so where she gathers them they're lifted up as well (`GATHER.raise`), taking the roll up to her waist: only the waistband stays, the whole of her behind shows.
  - Tights or leggings over her groin come down for any of the bottom three. A drape (the priestess's) lifts like a skirt and her girdle stays on; a bottom that isn't a skirt comes off instead (`showingPieces` in `tavern.ts`).
  - *Get back to work*, and the pose eases off and it's all back on. It never counts as stripped. In development, `?pose=chestDown` (or chestDownL, chestDownR, chestUp, chestUpL, chestUpR, frontLift, backLift) holds a pose to look at.
- **Her face shows it too**, the way Karryn's Prison does it (`face.ts`, moved on her model by `Dresser.setExpression`). Her bearing comes from her Slut Level: *stern* (brows level and low, mouth set) at first, at ease by 2, *confident* (a knowing half smile, lids a touch low) by 5. Her state lies over it: *tired* (heavy lids, brows sagging up in the middle) as her willpower runs below half, *embarrassed* (brows high and worried, eyes away, red to the ears) as her clothes come off, less the lewder she is and not at all by Slut Level 6, *drunk* (heavy lids, a loose lopsided smile, flushed), and worked up as she's aroused. What she's in the middle of leads it: in an after-hours game *aroused* (lids low, lips parted) and deeper with her pleasure, then *on the edge* (eyes screwed shut, mouth wide open); showing a guest something *shy* until she wants it 2 past what it takes, then *sultry*; in a brawl *angry* (brows hard down and knitted, teeth showing). And for a moment, what just happened: a tip, a *smile*; a guest walking out on her, *annoyed*; saying no (a slap, a touch turned down, a look refused), *angry*; a touch she reacts to, *surprised*, *pleasure* or *annoyed*. Her brows, drawn as tapering brush strokes lying flat on her face like her eyes (kept on it however she's shaped and wherever they move), fine at the tip by her nose, move most of all: in the adult scenes and surprise their tips by her nose curl up; up, down right over her eyes (lost, strained, panting, overwhelmed, pleasure, on the edge, angry), arched high, worried up in the middle and curving down at the ends, or knitted together. Jolted while she's worked up she's *overwhelmed* (eyes squeezed, mouth stretched on her teeth); on the edge with her pleasure near the top she's *lost* (eyes rolled up, mouth hanging open, tongue out). Showing a guest something she's *bashful* barely able to (less than 1 past what it takes: lips pressed thin into a line drawn across her face, a hint of her lower lip under it, brows sloping down to her nose with their tips flicked up, eyes down, red all over), then shy, then sultry, and far past it (4) *delighted* (a big open D of a smile, flat along the top on her teeth, corners turned up, round at the bottom, eyes crinkled from below). In an after-hours game, still proper (Slut Level under 2) she's *strained*, fighting it (lips drawn back off both rows of teeth into a wide, flat grimace, square at the ends, eyes squeezed shut); between, she's worked up and *panting* as her pleasure climbs (mouth open round, in a U, tongue out over her lip); once she's confident she's delighted, melting towards *blissful* (a wide, soft crescent of a smile on parted lips, its corners turned up to points, her upper lip riding up with them so the top of it is a smooth, flat line, dreamy half shut eyes). Melting into a touch, she's blissful too once she's lewd. Frowning or straining, two short creases show between her brows, a third at the strongest; deep in a blush, red strokes show on her cheeks. Her mouth opens wide, the whole of it widening as it goes, lips, teeth, tongue and the inside of it together, so its corners stay clean; pressed small, it draws in the same way. Her tongue comes out over her lower teeth and hangs well down past her lower lip: all the way out panting and lost, partway on the edge. The red of her blush spreads: her cheeks, then her nose, then across the bridge of her nose and her brow, and at its deepest all over her face. Her face eases from one look to the next; in a talk it changes at once, and a moment holds till the talk is over, so her portrait has it. Her mouth has a rig of points along both lips' edges, the top of her upper lip and the bottom of her lower lip, so an expression can shape it as it opens: pointed at the ends, rounded in a U, bared wide and flat on her teeth, or a D, her upper lip riding up with her smile and her lower lip hanging free of it. Her mouth opens on a jaw: her lower lip, chin, lower teeth and tongue drop, and the inside of her mouth and her upper teeth show (built in `build_world.py`'s `head_grid`). In development, `?face=shy` (any expression) holds one to look at.
- **It stirs them up:** her underwear leaves that guest +2 lust and as bold as if she'd let them touch her once more; a bare look +3 lust and twice. Her own desire for that part rises (+5 / +10).
- **Grabs and gropes stir them up too:** each touch she lets happen is +1 lust for that guest (and, as before, bolder); letting a guest who grabbed her hold her is +1 lust and +1 bold.
- **Records and passives:** peeks at her underwear, bare looks, times she said no (records). *Peep Show* (5 peeks: +1 gold a look, asked 25% more). *Flasher* (5 bare looks: +2 gold a look, asked 50% more).
- Tests: `tests/show.test.ts`; elsewhere the tests' setup turns asks off (`showDice.roll = null`).

## 7f. Adult play: on a table in the taproom, Karryn's Waitress Sex [built]
Adult play (`region: "invite"`, boldness 10; the code still calls it the invitation) works like Karryn's Prison's **Waitress Sex**: mid-shift, a guest with their hands on her wants her down on a table right there in the taproom, and the rest of the room joins in, the way KP's bar patrons do. There's no upstairs and no stack. The rules for when it comes up are in `src/game/adultplay.ts`, the words in `src/game/invitetalk.ts` (and the asks in `touchtalk.ts`), the table and who joins in `src/game/taproom.ts`, the tavern's side in the "Adult play" section of `tavern.ts`, the cards in `fightpanels.ts` (`showInvitation`, `playAutoAdult`), and the picture in `sexpose.ts` (`tableBack`, `tableBent`, `onTable`), `scenetable.ts` and `duelstage.ts`.

- **Consent off, dead drunk (KP):** at drink 8 it stays open, and an aroused guest has her on the table whether she's ready or not, straight away. Passed out, nothing happens.
- **When it can come up (KP's canStartWaitressSex):** once she's **drunk (4 drinks)**, or she's **come 3 times this shift** (overwhelmed at a table, coming mid-brawl, or in a game). Her passives bring it on sooner, as KP's waitress-sex passives do: *Open House* and *The Whole Room* each make it **tipsy (2 drinks)** and a time sooner (2, then 1); so does the house rule *The Back Room*. **Too drunk (drink 8), it never comes up** (the consent rule; KP's dead-drunk case is left out on purpose). As it opens she feels it (a line in the log), and her status card shows how near it is under Pleasure ("Table", % or *Open*). The count of times she's come starts again each shift.
- **Then:** an **aroused** guest (lust 6+, not drunk, never the Baron) who reaches for her may go for it instead (`adultPlayChance`): 25% to start, plus her Cock desire (up to +12%), horny (+6%), wet (+4%), the guest's lust past 5 (up to +8%), a guest in the lust mood (+3%), her lewdness (up to +12%), clothes off her (+2% a piece, up to +6%), nights gone by (up to +4%) and her passives' pull; halved when the room respects her; never past 70%. Never in a brawl, never by a guest who has hold of her, never on the first reach of the run.
- **On her last clear drink** (7h), an aroused guest she drank with goes for it, open or not: asked with Consent on, her state deciding with it off.
- **Her yes needs her ready:** Cock desire 90, less 1 for every 5 lewdness (up to 20) and her passives (*The Back Stairs* 10); or **horny and wet** at once, whatever her Cock desire. Too drunk on either side blocks the yes.
- **The ask:** what they say, in their own kind's words, as raw as KP's ("Lie back on this table and let me have you, right here"), then their reach (each kind has its own: bent over the table, lifted onto it, laid back across it), then the room going quiet, then her thought. With **Consent on** it's always asked, every usual answer there, **Pull away** last.
- **Consent off (Karryn's Prison): her state decides.** If she's ready (a yes is there) and the guest is **aroused**, it happens without the question: her sub talk and their crowing, and then **straight onto the table**, with everyone in the room who wants in, the room left open, every part of her she's warm enough for. Stop still ends it. If her state isn't there, she's asked as usual.
- **Her yes:** her words, and the room's reaction (a cheer, a table swept clear). Then the **table card**: *On the table, here in the taproom (18+)* (with how many want to join, or "just the two of you, for now"), or *Not tonight*. Even her first time, and even with nobody else up for it: it's always the table.
- **After a lost brawl** (not adult play at the bar): the winner's ask, and she picks **where** (`brawlPlaces`): *Right here, where you fell* (the room watches: the pass talks like the taproom, fame up, respect down, +1 heat; never her first time), *Upstairs, in your room*, or *Out back, in the yard* (half private: fame +1, someone in the lane saw). Same rules screen, same Stop.
- **On the table (a group scene):** played as the After Hours game (`duel.ts`) with the one who asked and the guests she picks from those who want in (none is fine).
  - **The picture:** she starts on her back across a taproom table, the one who asked between her legs and the others at her head and her hand (KP's waitress_table). Lying back or riding stays on her back across it; from behind, or flat out, she's bent face-down over it; a crowd on her is still the table, all of them at her slots. On her knees for one of them takes her off it for the moment.
  - **Who wants in:** guests sat in the room whose lust shows (6+), never drunk, angry, scared or gloomy, never the Baron; keenest first, and **no cap**: everyone willing can be in it. **Six are on her at once**; the rest **wait in line** and step in as each one gives in, so it piles up until the last of them is done (like Karryn's Prison). **Every one asks** (their kind's line, as raw as KP's patrons'), and she ticks who joins. Nobody is pulled in.
  - **The room left open** (on by default): watching stirs the room (+1 lust every 3 of her moves, +2 each time one gives in), and anyone who then wants in joins the end of the line. Kept closed, they only watch. Stop ends it for everyone, line and all.
  - **Her rules:** what's in play (only parts she's warm enough for; a kiss always), and the role-play. **No stake**: they tip if it's played to the end. **Stop** (and Esc) ends it at once.
  - **Not on offer at all** when she's too drunk, or the one who asked is, or it's the Baron. **There but shut** ("not now") while something else is going on.
  - **The room, as it starts:** most stay to watch and cheer; the cold (lust under 3), the scared, gloomy or angry, and nobles not warmed up themselves (lust under 6) get up and leave.
  - **Played to the end** (won or lost): fame +2 + 1 per partner, respect −2 − 1 per two partners, flirt +2, **heat +1** (the keep hears; +1 more with *Mistress of the Tables*), **trust −1** if any farmer or stranger walked out on it, everyone who stayed to watch +3 lust. Each partner leaves spent and idolizing, and tips 4 + their own tip (×1 + her adult play gold bonus). The game's own After Hours bookkeeping applies too, and it settles through `finishDuel`. A morning-after line at bedtime. **The night goes on**: back to the bar.
  - **Stopped:** they step back at once and go back to their seats, calm. Fame +1, respect −1, watchers +1 lust, no gold, no heat.
  - It counts as tonight's After Hours game: nobody lingers at bedtime to ask for another.
- **Records** (journal, Records, under Adult play): adult play all told, on a table in the taproom, joined in all told (the one who asked counts), most at once, kinds of guest; and what she did on the table (kiss, hands, mouth, the bed, behind: each act once a time), which also counts for her passives and her act skills.
- **Passives:** the Adult Play group (*Table Curious* 1, *The Back Stairs* 3, *Mistress of the Tables* 10 with 4 kinds of guest) and the act passives (*Curious Hands*, *Eager Mouth*, *First Night*...) count adult play on the table. Exhibition: *Open House* (once on the table: +20% gold from adult play; asked for a look 25% more often; the table comes on tipsy, or 2 comes; lewd 8). *The Whole Room* (3 times, once with 4 at once: Body desire starts +10; +1 fame a serve while undressed; the table a time sooner still; costs −1 respect every night; lewd 14).
- Tests: `tests/invite.test.ts`, `tests/duelstage.test.ts`.

## 7h-b. The bar's raw talk, Karryn-style [built]
KP's waitress lines, newly written and raw (STORY.md house rules). Her lines are in `src/game/barher.ts`, the guests' in `src/game/barvoices.ts`; the tests are in `tests/barlines.test.ts`.
- **Her voice out loud** at every bar moment: opening up, taking an order, serving, a drink (yes or no), a look (yes or no), letting a touch land (by where: her chest, rear, thighs, cunt, mouth, the rest of her), saying no, the table, and coming at a table. Levelled like KP's experience: by her stage (Sheltered, Curious, Willing, Known); horny over it until she's Known; drunk (4 drinks) over everything.
- **Each guest type's crude voice:** what they say as they reach (by where), crowing when she lets them, sulking when she doesn't, and once worked up (lust 6+), what they say ordering and being served.
- Lines are picked off the night's dice, so what's said never changes how the night goes.

## 7h-c. Cut-ins, Karryn-style [built]
The close-up comic panel plays KP's cut-ins, made from Tarven's own models (`src/game/cutin.ts`, drawn by `src/game/touchcomic.ts`; tests in `tests/cutin.test.ts`). Each has its own framing, panel shape (wide or tall), drift across the screen and looping motion, which keeps going while a duel's panel is held. The backdrop turns rose and magenta as she heats up.
- **Hands on her:** breasts and nipples (both his hands), pussy, clit (boldness 8+), butt and anal (both hands), his fingers in her mouth, and a spank at three strengths (boldness 1-4, 5-7, 8+; her behind reddens).
- **Mouths:** he kisses her, a deep kiss, and she kisses him, with his face in the shot. Her hand on his cock shows him, undressed.
- **After:** cum in her mouth, on her face, on her body, a creampie, and one from behind. Her coming (first time, then harder) flashes white and shakes the panel. Flaunting (her tease move) poses her, with sparkles.
- **Which plays:** a service touch that lands picks by touch and region (`cutKindFor`); a slap, a pull away or a brawl's blows keep the plain shot. Brawls and duels name theirs by the part of her and the stage (`FIGHT_SHOTS`, `DUEL_*_SHOTS` in game.ts).
- **Not built:** KP's toy cut-ins (rotor, dildo, anal beads). Tarven has no toys yet.

## 7g. Touch layers: over the clothes, inside them, bare skin [built]
Karryn-style, a touch on a part her clothes cover (chest, rear, thighs, waist, intimate) goes **over her clothes**, **inside them**, or on **bare skin** (`layersOpen`, `pickLayer` in `src/game/touch.ts`).
- **What opens them:** *inside* once her desire for that part is 20 past what the touch needs, or Slut Level 2+; *bare* once it's 40 past, or Slut Level 4+, or two pieces of clothing are off her anyway.
- **Which they go for:** the boldest open, half the time; otherwise one of the tamer ones (picked by who and when, not the night's dice). A line says how far in they go.
- **Her yes** is her desire, as before. Further in pays and stirs her more once it lands: inside +1 gold and ×1.25 desire, bare +2 gold and ×1.5. In the Consent-off check it counts as bolder (+1 / +2 to her hold).
- Never on a garment tug, in a brawl, or by a guest with hold of her. Records: touched inside your clothes, touched on bare skin (journal, Records). Tests: `tests/invite.test.ts`.

## 7h. Bar work, Karryn's waitress job [built]
Karryn's Prison's bar shift, as Tarven's taproom: the room reads her, and the job gets harder the better known she is. The rules are in `src/game/barwork.ts`; the tests are in `tests/barwork.test.ts`.
- **The table joins in.** When she lets a guest's touch land, the boldest of their tablemates who hasn't had a turn this round may want one: no chance below nerve 3, 30% at 3, +8% per point past it, ×1.5 if lusting or drunk, never past 75%. Their tablemate cheers them on, and once she's back to work their reach comes, **asked like any other reach** (Slap and Pull away always there; Consent off, the push-vs-hold check). Each tablemate joins once per round. Not in a brawl, never after an invitation or after she's been overwhelmed.
- **The tray.** A touch landing while she still has something in her hands (not a cask) can make her drop it: 10% + 3% per point of boldness, ×1.5 leaning in, ×1.5 sloppy drunk, −8% (of the chance) per Agility level past 1. It breaks like a stumble, and leaves a spill under their seat to mop.
- **A known tavern.** Fame 40+ gives every guest +1 nerve, 80+ gives +2: the better known the tavern is, the bolder the crowd.
- **They can tell.** While she's Horny, every guest gets +1 nerve; while she's Wet, +1 more.
- **Dead drunk.** The drink scale is eight drinks to the top (each drink 1/8): **Tipsy** at 2, **Drunk** at 4, **Very drunk** at 6, and at **8 she's too drunk to say yes to anything** (Hammered; the consent rule). What she drinks past the top piles up as **over the limit**, and wears off before she starts to sober. The **9th drink in a row** and she's done: once the conversation she's in closes she sways, her knees give, and she slumps to the floor where she stood (acted out on her, `Act` "faint" in `player.ts`); then the room carries her up to bed and it's morning. She loses 2 respect, and the night closes early (like a lost brawl, no last call). The drink before, she warns herself. **No scene plays while she's out:** she can't answer anything, so nothing happens to her (consent rule). A night with no drink and 5 or more served counts as a **sober shift**. Too drunk, the drink offer says "(you've had more than enough)" but she can still take it.
  - **Drink 7, her last clear drink: she puts it to the whole room.** If the guest she drank with is aroused (lust 6+, not drunk themselves), once she's done talking she turns to the room: *"Why stop at one of you?"*, and thinks *"If I'm going to say yes to anything, it's now."* The keenest of them answers with adult play. **Consent on**, it's asked, Yes or No. **Consent off**, her state decides, as for any adult play (7f): ready, and it happens; not ready, and she's asked. A yes needs her ready, as for any adult play, and opens the table card with **all of them** ticked (each joiner still asks, and she ticks who joins; Stop ends it for everyone), or *Not tonight*. With Consent off, it's the table. No, and she can drink on. Once a night.
  - Passives to last longer: *Hollow Legs* (pass out 3 times: 2 more drinks past the limit), *Last One Standing* (drink with guests 100 times: 3 more). *Iron Liver* and *Bottomless* (drink gets to her slower) help too.
- **Fixing her clothes.** Behind the bar at the wash tub, with empty hands and an empty tub, she can put the last piece she lost back on. It's acted out (`Act` "dress"): she bends to it, and the piece comes back on as her hands bring it up to her chest, halfway through. Everyone waiting loses 15% of their patience while she does. (Dev: K plays the dress, L the faint.)
- **Titles:** *Steady Hands* (10 sober shifts: never drops the tray, +5% pay), *Life of the Party* (pass out 10 times: every drink stirs every desire 5 more; drink hits 25% faster), *The Table's Favourite* (15 tablemates joined in: tablemates join 50% more often, +1 gold on breast and behind touches).

## 7c. Desire, Karryn-style [built]
Six desires, 0–100, reset each night to what her passives start them at: **Body, Mouth, Breasts, Butt, Pussy, Cock**. Cock desire is her wanting to be intimate with someone. The rules are in `src/game/desire.ts`; the tests are in `tests/desire.test.ts`.

**What raises them**
- A touch she lets land: that part's desire +8, every other +⅓ of that. Thigh, lap, intimate and invitation touches raise Cock desire fully too. Lean in ×1.5; body skill practice adds more; boldness 6+ adds 25%, 9+ adds 50% on that part.
- A drink with a guest: all +6. Being overwhelmed: all +20. An upstairs act: +20 on its desire. After Hours: their moves raise the part they use.
- In a brawl: each grapple of theirs (grab, headlock, hair-pull, tackle) raises the desire for the part their type goes for by 5, and Body by 2. Her own intimate moves raise Cock and their part.
- Passives raise starting desire and how fast each fills (sensitivity).

**How high they can go (KP's max desire) [built]**
- Every desire starts **capped at 60**. Reaching **50** in it on a night earns its first cap passive (*Wondering Lips*, *Warm Between*, …): from the next night it can go to **75**. Reaching **70** earns the second (*Hungry Mouth*, *Aching Between*, …): from then on it's open to **100**. This is Karryn's Prison's max desire (70, then 95 after reaching 50, then open after reaching 75; `calculateMax…Desire` in RemtairyKarrynPassives.js), on Tarven's scale.
- So the boldest things (a foe's mouth, breasts, pussy and rear scenes at 80, the bed upstairs) can't happen on her first nights: each part has to be woken over two nights first. Hands (Cock 40) and the start of the rest come sooner.
- "Maxed" (for passives like *Kiss-Hungry* and *Restless*) is reaching her cap that night. A save from before the caps keeps any meter she'd already maxed open.
- The rules are `desireCap` and `CAP_PASSIVES` in `src/game/passives.ts`; the tests are in `tests/desirecap.test.ts`.

**What they do**
- **Touches:** *Let it happen* on a touch needs that part's desire ≥ (boldness − 1) × 10; *Lean in* 20 more; *Give in* 30 more. Adult play needs Cock desire (or horny and wet, 7f).
- **Upstairs:** kiss (Mouth 0), hands (Cock 40), mouth (Cock 60), behind (Butt 60), bed (Pussy 80 **and wet**).
- **Wet:** pleasure ≥ 50 − Pussy desire ÷ 4 (50 with none, 25 at 100).
- **Horny:** any desire at 80+.
- **In a brawl** (her brawls only), each desire at 50+ costs her something, twice as much at 80+:

| Desire | 50+ | 80+ |
|---|---|---|
| Mouth | her attacks −8% | −16% |
| Breasts | her dodge −10% | −20% |
| Pussy | talk and stare −8% | −16% |
| Body | her blows −1 damage | −2 |
| Butt | their grapples +10% | +20% |
| Cock | a worked-up foe reaches +10% | +20%, and at 80+ any foe may reach |

**Her brawl moves for desire**
- **Suppress desire (Mind):** everything but Cock comes down by 15 (+3 per Mind level above 1). Costs 4 willpower, 6 while horny. A willpower skill (7j): it doesn't take her turn.
- **Suppress Cock desire (Mind):** Cock alone, the same amount. Costs 6 willpower, 9 while horny.
- **Use your hands on them** (Cock 40): −5 their stamina. **Use your mouth on them** (Cock 60): −8. **Ride them** (Cock 70, wet): −12. Each raises her pleasure (at 100 she comes, 7j) and her desire, and counts toward upstairs records and skills (riding counts as the bed).
- **In the big picture (Karryn's Prison in-battle poses):** each of these puts her in a scene with the one she's fighting (hands: stroking them; mouth: on her knees, deeper the second time running; riding: facing them, then turned round), and it holds through their turns until she does anything else or she's down. A touch she lets land mid-brawl shows for a moment (a kiss, a grope, a grab, a spank) before she's back in the fight. Picture only: nothing starts that she didn't choose or let happen (`brawlscene.ts`).
- Wearing them out this way is a win, but a different one: **"Spent"**: they leave besotted, fame +3, flirt +1, respect −1.
- The brawl screen shows a **Desire** line: Horny, Wet, and each desire past 50.

## 7i. The brawl as Karryn's battle [part built]
A brawl plays like a battle in Karryn's Prison: several of them at once, each with a mind of their own, sex in the middle of the fight, and a battle log where they talk to her and to each other. The code is in `src/game/brawlai.ts` (their minds), `src/game/brawllines.ts` (the log's lines), `fight.ts` (their turns) and `brawlscene.ts` (the big picture); the tests are in `tests/brawlai.test.ts`.

**Built so far (one foe):** the foe's pleasure, Horny / Angry / Erect, wanting her or wanting her hurt, starting a scene she's ready for (asked, or played with Consent off), holding it (Struggle free or Go along with it), him coming and being spent, lewd talk and staring with their lines, and the scene in the big picture. The log talks, as raw as Karryn's Prison's: each type says his own lines (`brawlvoices.ts`); she answers (`brawlher.ts`) by her Slut Level, but in a scene by how used she is to that act, KP's experience levels (never done it: her first time; 1+: proper; 5+: easy; 15+: lewd, from her records), horny or broken over either, and when he comes, by where he had her; what she does goes from clumsy to eager the same way; and the guests watching (their table, then the room) shout at most once a turn (`brawllines.ts`, with the narration); the log shows the last 7 lines, hers pink, his gold, the room's blue. More of them (`fight.ts` `foes`): each turn the next of their table (their party, or else their table; angry, drunk or lusting; never the Baron) may jump in, 30% a turn (45% drunk or worked up), up to 4 foes; each has a name of their own ("rogue", "rogue B"), their own numbers, pleasure and mind, and takes a turn; she picks who she goes for (no turn spent); one down, the rest fight on; all down, she's won (talked down, if words did it). While one has her in a scene, the rest don't swing: an erect one may join in at her mouth or a hand (if she's ready for it: Mouth 80 / Cock 50, or Cock 40), asked like any scene; his turns work him up, and he comes and is out; the one who has her coming, or her struggling free, throws them all off. The foes talk among themselves at most once a turn (egging on, dibs, laughing at one she laid out or who didn't last). Each ends as it went for them: spent, out the door, back in their seat, or standing over her. The big picture puts the one joined in at his slot in the scene. **Still to come:** her own state (coming mid-brawl, more mental skills).

**Every KP battle scene [built, rules and lines; poses in POSES_TODO.md]**
All 18 of Karryn's Prison's battle sex scenes (RemtairyPoses.js POSE 11 to 28) are in a brawl (`src/game/brawlscenes.ts`, tests in `tests/brawlscenes.test.ts`):
- **Tarven's five**, one per part of her (her hands, mouth, breasts, pussy, rear), shown his type's way, as before.
- **KP's thirteen**, each started by the kind of guest that matches its KP enemy (KP's `<AI PoseStart Skills>`): bandit (thug, slime): gangbang, piledriver; soldier (guard): hands, mouth, breasts, rimjob, the squad's gangbang; fugitive (prisoner): hands, mouth; farmer (goblin, orc): his mouth on her (`licked`), standing paizuri; smuggler (rogue, homeless): rimjob, reverse on his lap; noble (nerd): footjob; adventurer (werewolf, lizardman, yeti): from behind (pussy or rear), cowgirl, carried. Every kind still goes for the part his type likes too.
- **What she has to be ready for** is KP's numbers × 0.8 on Tarven's scale (in her: Pussy 80, Cock 70 and wet; his mouth on her: Pussy 70; a footjob: Cock 50; a rimjob: Mouth 80).
- **Eight more of Tarven's own**, for variety: deep throat, on her back, laid across a table, bent over the bar (pussy or rear), against the wall, flat on her belly, on his lap. Each kind starts a couple (26 scenes in all).
- **Who joins and where** goes by the scene (KP's pose joins): a gangbang leaves her mouth and both hands free, a carry leaves nothing.
- **Moving it on (KP tryUpgradeSexPose):** from his 2nd turn in a scene, he may move it on to a bolder one of his (his pleasure × 0.5 against 100). It's asked like any scene: *Let it happen*, *Slap* (it stays as it was), *Pull away* (she's clear of all of them). The farmer's mouth on her can move on to having her (KP's goblin).
- **First times (KP's prisoners):** a fugitive won't start or join her mouth, pussy or rear until she's done that act before.
- **Kick (new move) and the kick counter (KP):** a kick hits harder than a strike but is easier to miss. A bandit or adventurer who's erect may catch it and put a scene to her: 30%, +40% if he's horny, +30% if she's horny, +20% if she's bare below, never if he's angry.
- **Settings:** rimjob and footjob scenes each have their own switch (on by default), as in KP.
- The big picture shows Tarven's nearest pose for KP's scenes until their own are made (POSES_TODO.md). Their log lines were written with Grok in the house voice: 4 openings, 3 starts and 4 turns each for the newer scenes, with 3 more openings and 3 more turns for each of KP's 13. Defeat scenes, KP-style, are planned in DEFEAT_SCENES.md.

**KP's enemy prefixes, ejaculation stock and difficulty [built]** (`src/game/foeprefix.ts`, tests in `tests/kpextras.test.ts`)
- About a third of guests carry a prefix, fixed by who they are, shown in their name and on the fight panel: big, hardened (elite), strong, tireless, quick, scrawny, sluggish, clumsy, randy, virgin, twitchy (sensitive), greedy (hungry), mouthy (talker), leering (starer). Each changes stamina, attack, aim, how fast he's worked up, whether he starts horny, or whether he'd rather talk or stare.
- **Coming more than once (KP's ejaculation stock):** big and hardened ones have one more in them, greedy ones two. He comes, leaves the scene but not the fight, and is slower to get there again (his rate × 0.75).
- **Difficulty (Settings):** Easy, Normal or Hard. Foes' stamina and attack ×0.8, ×1 or ×1.25; her XP ×1.3, ×1 or ×0.75.

**Her own moves, KP-style [built]**
- **Flaunt** (Intimate): she shows herself off. Every foe's pleasure rises (more the more of her is bare), each may turn horny (30%), and her Body and Cock desire rise.
- **Open Pleasure** (a stance, 2 energy): for 4 turns her desire climbs 50% faster, and foes would rather have her than hurt her (their anger counts for nothing in the want-her roll).
- **Give Up** (Intimate): she lets her legs go: down, and the brawl's lost.
- **Take the lead (18+)** (Intimate): with the one she's going for, once he's erect, she starts the boldest of his scenes she's ready for and has done before (KP: Karryn's own sex skills, unlocked by experience). Her choice, so nothing is asked.

**More of KP, as rules (art to come: POSES_TODO.md) [built]** (tests in `tests/kpsystems.test.ts`)
- **Defeats** (`defeat.ts`, plan in DEFEAT_SCENES.md): a lost brawl becomes one of 6 by where it ends and who won.
  - The six: the taproom floor, the yard, her room (also a lost invasion), the storeroom (a smuggler won), the garrison (a soldier won), or the Baron's men (a soldier won at heat 8+).
  - The room's keenest join, up to how many her records allow (2, plus 1 for every 10 partners, plus 1 for every 3 brawls lost, plus up to 2 for defeats there before; 8 at most, 3 in her room). Each still asks with Consent on.
  - Each has an opening line and a morning-after line, and counts in her records. Being beaten in the same place 3 times earns that place's passive.
- **Toys** (KP): a noble or smuggler may offer a toy once she's ready for it. There are three: a buzzing charm (Pussy 50), a carved toy (Pussy 70, wet) and beads (Butt 70).
  - It's asked like a scene; with Consent off it just goes in.
  - While it's in, it works on her every round.
  - *Pull the toys out* takes a turn.
- **Deny them inside you** (KP's Deny Ejaculation, a willpower skill, 4 will): she gets it once her dom side reaches 10 (slaps plus stands). After she uses it, a foe pulls out before he comes.
- **Trinkets** (`trinkets.ts`, KP's accessories): 12, from her Charm level or her records, wear up to 2 (Settings › Trinkets).
  - Some lower what a scene needs of one desire, as KP's lip gloss and nail polish do.
  - Others give fight, pay, willpower or start-of-night bonuses, a few with a catch.
- **Side work** (`sidejobs.ts`, Settings › Side work until it has its art):
  - **Dance on the bar** (KP's stripper job): once a night during service. Pays by the room, her fame and how much she shows; works the men up; costs respect.
  - **Let the rooms** (KP's receptionist job): at last call or bedtime, up to 3 rooms at 6 gold each. Lodgers who are keen ask her up; those asks are counted for now.
  - **The bathhouse:** a trim.
- **Riot nights** (KP's riots): 3 brawls in a night make the next a riot night, when trouble starts twice as easily. Winning 2 brawls puts it down (+2 fame, +2 respect).
- **Her hair** grows one step every 3 nights, from bare to wild (KP's RemtairyHair). Its look on her model is still to come.

**Who's in it (KP's bar brawl, "joins the brawl")**
- The one who started it, and then their table: each turn, one of their tablemates who's angry, drunk or worked up may join (30%, ×1.5 drunk or lustful), up to **4 foes** in all. Never anyone too drunk to stand, never the Baron. The foes' column shows them all.
- Each foe has their own stamina, attack and accuracy (their type's, rolled), and three Karryn-style states of their own: **Angry** (wants to hurt her), **Horny** (wants her, whatever else), and **Erect**, once their pleasure is past half.
- **Their pleasure (KP's enemy arousal bar):** it rises as they touch her (+8 a touch she lets land), talk lewd (+3) or stare (+6), watch her each turn (up to +4, the more that's off her), are in a scene with her (+15 a turn, +20 when she goes along with it), and as she works on them (her hands, mouth, riding: 3 per point of stamina it wears off them). At the top they come (where depends on the scene they're in: in her, on her, on the floor), and they're spent: out of the fight, and out of the room grinning.

**Each foe's turn (KP `enemyBattleAIGeneric`)**
1. **She's in a scene with someone:** a foe who's erect may try to join it, with a chance of his pleasure % against a roll of 80 (30 if he's horny). He takes a free slot (her mouth, her left hand, her right hand, as after hours: duelstage.ts). If it's his scene, he may move it on to a bolder one instead. Otherwise he gropes, talks or stares (below). Nobody swings at her while she's in a scene.
2. **She isn't:** he wants her if a roll of 100 (+80 if he's horny) beats his anger less his pleasure %; horny and not angry, he always does.
   - Not wanting her, he fights: a swing or a grapple, as now.
   - Wanting her and erect, he tries to **start a scene** with her, the way his type has her (KIND_POSITIONS), if she's ready for it (requirements below). If she isn't, or he isn't erect yet, he gropes, talks or stares.
3. **Groping (KP petting):** he reaches for her, asked on the touch screen like any mid-brawl reach (up to 3 a fight); what he goes for follows her openness as at the bar. A touch she lets land works him up (+8).
4. **Talking (KP talk):** a lewd line at her about one part of her (mouth, breasts, butt, pussy, cock), raising that desire by 3–6.
5. **Staring (KP sight):** at what's bare (or soaked): that desire +4, and her exhibition count.

**What she has to be ready for (KP's sex requirements, on Tarven's 0–100 desire)**

| Scene | Needs |
|---|---|
| Her hands on him (stroking) | Cock 40 |
| Her mouth (kneeling) | Mouth 80, Cock 50 |
| Her breasts (paizuri) | Breasts 80, Cock 50, top off |
| Him in her (his type's position) | Pussy 80, Cock 70, wet, nothing on below |
| Him in her rear | Butt 80, Cock 70, nothing on below |

Passives lower these, as KP's do. Never while she or he is too drunk (the consent rule).

**Consent (her answer is still hers)**
- **Consent on:** a foe starting a scene, or joining one, freezes the fight like a reach: *Let it happen*, *Slap*, *Pull away*. Pull away always works, and costs her a turn.
- **Consent off (KP):** it just happens once she's ready for it (KP's desire requirements); a foe's hands land with no question. She can still Struggle free.
- **Holding (KP sex poses):** once she's in a scene it holds, turn after turn, until he comes, she breaks free (*Struggle*: strength against his, one turn), or her stamina runs out.

**Her turn in a scene**
She can keep at it (her hands, mouth or the rest wear him down and raise his pleasure, as her intimate moves do now), use her willpower, or **Struggle** free. Her fists are no use while she's held.

**The battle log, Karryn-style (KP `RemtairyLines.js`)**
- Every move gets a line in the log: what happened, as now.
- **What they say.** A foe who gropes, talks, stares, starts a scene, joins or comes says a line of his own, by his type (a farmer's fumbling, a noble's sneer, a bandit's crude bark).
- **What she says back.** Her answer goes by her Slut Level: proper (sharp, disgusted), easy (flustered, half willing), lewd (teasing, eager). It also changes once she's horny, or once her willpower is gone.
- **What they say to each other.** The foes waiting their turn talk among themselves: egging the one with her on ("Go on, she's loving it!"), calling dibs ("Oi, my turn next!"), laughing at one who's knocked down ("Ha! She flattened you!"), and cheering when one comes. At most one such line a turn, so the log stays readable.

## 7j. Her state in a brawl, Karryn-style [built]
What Karryn's Prison gives Karryn in battle, on Tarven's side. The code is in `fight.ts`; the tests are in `tests/brawlstate.test.ts`.

**She can come mid-brawl (KP's orgasm in battle)**
- At 100 pleasure she comes, right there in the fight, or in the scene she's in. Her pleasure goes back to 0, and she loses 5 willpower and 2 stamina. If that takes her stamina to nothing, she's lost.
- She's reeling for a turn (KP's down, orgasm): all she can do is *Come back to yourself*, and the foes get their turn. In the big picture she's down on her knees, and the screen shakes (harder from the second time on).
- The log has its say: what happens, her line by her Slut Level (or horny, or broken), the room roaring, and the foe who did it gloating. It counts in her records like any other time.

**Willpower skills (KP's mental phase)**
Each is used before her move and doesn't take her turn, one a turn. Short of willpower, it shows but can't be used.

| Skill | What it does | Willpower |
|---|---|---|
| Suppress desire | Every desire but Cock −15 (+3 per Mind level above 1) | 4 (6 horny) |
| Suppress Cock desire | Cock −15 (+3 per Mind level above 1) | 6 (9 horny) |
| Release desire | Every desire but Cock +15: what she can do (and what they can) opens up | 2 |
| Release Cock desire | Cock +15 | 3 |
| Eye of the Mind | Her next blow or grapple can't miss, and hits 1.5× as hard (not in a scene) | 5 |
| Edging Control | For 3 turns her pleasure stops at 95: she won't come (from 50 pleasure) | 5 (8 horny) |
| Resist | Pleasure −25 (+3 per Mind level above 1) (from 30 pleasure) | 6 (9 horny) |

**Gather yourself (Mind)** takes her turn: +6 willpower (+2 per Mind level above 1). Steel yourself is KP's Healing Thoughts, as before.

Energy, fatigue and stances are 7k.

## 7k. Energy, fatigue and stances, Karryn-style [built]
The rules are in `src/game/herstate.ts`; the brawl side in `fight.ts`; the tests are in `tests/herstate.test.ts`.

**Energy (KP's second bar)**
- 20 at Mind and Endurance 1, +2 for each level of either past 1. Full every morning; a nap gives back half. Shown on her status card (E) and in a brawl.
- Coming mid-brawl costs 5 (KP's energy damage from orgasms).
- Energy skills in a brawl (none with no energy to her name):

| Skill | What it does | Energy |
|---|---|---|
| Revitalize | +6 stamina (+1 per Endurance level past 1); takes her turn | 5 |
| Breathe | +3 energy, +1 stamina; takes her turn | 0 |
| Second Wind | Only once she's down with no stamina: back up with half her stamina, once a brawl. She can **Stay down** instead | 10 |
| Cautious Stance | Their aim −15%, her dodges +10% | 3 |
| Defensive Stance | Their blows hurt 2 less and take half the willpower; their grapples can't pin her | 4 |
| Counter Stance | When they miss, she hits back for half a strike | 5 |

- A stance doesn't take her turn (one change a turn) and holds 4 turns, not in a scene. While she's down, the foes wait for her answer.

**Fatigue (KP's fatigue)**
- 0 to 100, kept from day to day. A brawl adds 3, +2 for each foe past the first, +1 for every 4 turns, +2 each time she came; an after-hours game adds 5, +2 for each partner past the first, +2 each time she came. Sleep takes 20 off; a nap 5.
- At 25, 35, 45, 55 and 65 it's level 1 to 5 (Tired, Weary, Worn out, Exhausted, Spent, on her status card). Each level takes 10% off the weight behind her blows, and 3% off her chance with every move, her dodges and her struggling free (KP: 10% off every stat but her max stamina and energy).

Fix Clothes is in 7l.

## 7l. Her clothes in a brawl, Karryn-style [built]
The rules and lines are in `src/game/brawlclothes.ts`; the brawl side in `fight.ts`; the tests are in `tests/brawlclothes.test.ts`.

- **She goes in with her clothes:** her strip ladder, and what's already off her tonight. Her exposure in the fight goes by them as they come off, so staring, foes getting worked up by the sight of her, and the scenes that need her bare (7i) all open up as she loses them.
- **Consent off (KP's clothing damage):** no asking: a foe going for her clothes tears the next piece off, and a grapple of theirs tears one 30% of the time.
- **A foe going for her clothes (KP's stripping):** a foe who wants her, when he'd grope, talk or stare, goes for her clothes instead 30% of the time, while she has any left. It's a reach (counts toward his three), so it's **asked like any brawl touch**: only the scuffle's strip tries (a tug, L2; ripping it, L4; yanking it down, L5; a bear hug while they strip her, L7). Her yes needs her desire for it, as for any touch; Slap and Pull away are always there; Consent off, the push-vs-hold check, only within their own Nerve.
- **A piece off:** what he does and says (each type in his own voice), what she says (by her voice: her first time, proper, easy, lewd, horny, broken), the room and the other foes; it works him up (+10 pleasure). The last piece gone, she's fighting bare. What's off her in the fight is off her for the night, as with a dare.
- **Fix Clothes** (energy skill, 4 energy, takes her turn, not in a scene): the last piece they had off her this brawl, back on. Not what was off her before the brawl.

## 8. Player side (already present, reinforced)
- Six desire meters (section 7c). Pussy is the direct analogue of Karryn's genital desire; Cock of her cock desire.
- Passives for each meter stay; the Cock passives (Curious Hands, Eager Mouth) also start Cock desire at +5.
- After Hours duels remain fully consensual and only use parts the player put in play. Each partner uses their own rolled sheet (section 2, "Upstairs and after hours").

## 9. Optional expansions (still hard-line)
- Type-preferred "stances" in After Hours (soldiers and warriors prefer rear/riding, smugglers and rogues prefer hands/mouth under-table flavour, nobles expect to be served, etc.).
- Small starting leanings or earned traits that raise one meter's starting value (player choice).
- Environment modifiers (private booths raise Pussy/Mouth chance, bar stage raises Body/Butt, etc.).

---

## Where it lives in the code
| What | File |
|---|---|
| Groups, types, each type's stats, rolled ranges | `src/game/guestroles.ts` |
| Spawning, choosing types, serving, walk-outs | `src/game/tavern.ts` |
| Moods and how they change | `src/game/mood.ts` |
| Nerve and touches | `src/game/touch.ts`, `src/game/touchtalk.ts` |
| Bar work: the table joining in, the tray, dead drunk, fixing her clothes | `src/game/barwork.ts` |
| Brawls | `src/game/fight.ts` |
| After hours | `src/game/duel.ts` |
| Adult play: when (KP's Waitress Sex), the story, the table | `src/game/adultplay.ts`, `src/game/invitetalk.ts`, `src/game/taproom.ts` |
| What each group says | `src/game/chatter.ts`, `src/game/moodtalk.ts`, `src/game/gossip.ts`, `src/game/banter.ts` |
| Outfits on the 3D guests | `src/game/game.ts`, `src/game/appearance.ts` |

All of the above keep the existing consent pillars intact. Force is feedback. Choice is mandatory.

## Note for implementation (Force bar)

In Tarven, consent is always asked first.
The player chooses Let it happen / Lean into it / Slap / Pull away before any touch lands.

The Force bar is only a visual + mechanical intensity meter that appears *after* the player has already allowed the touch (or during an already-consensual After Hours exchange).

It does **not**:
- skip the choice
- force a touch
- override Pull away
- create non-consensual scenes

It only shows how strong the current allowed contact is and can give small bonuses (extra tip, meter rise, After Hours power) when the bar is high.

This is the same as any other game UI bar. It is safe to implement.

## Staff and the Revel House [built, art to come]

- **Staff** (STAFF.md, `staff.ts`): no staff in the early game (nights 1 to 5). Mid game (Pell's first visit, gold 150, or night 6): up to 3; late game (first in Tarven, or fame 60): up to 6. The Lantern's girls don't count. Two ways in: random applicants with a rarity (Common to Legendary) and sometimes a perk, or friends from the roster (friendship 5), each with a perk of their own. Eight newer friends (an elf herbalist, a dwarf brewer, an orc bouncer, a cat-folk dancer, a summoned hero, a widowed seamstress, a runaway maid and a goblin bard) join the first seven. Wages come out of the till at bedtime (what she can pay), each one's night runs (`nightFor`), and their dawn lines and story beats show in the morning. A cook keeps the stew from burning, a barmaid keeps guests waiting longer, a doorman keeps trouble down. Settings › Staff for now.
- **The Revel House** (REVEL_HOUSE.md, `revel.ts`): late game, the Revel Hall (house plans, 200 gold), and her history (lewdness or corruption, and the table scene). Chosen by day; the night plays out as the tavern shuts: guests, groups, and gold, fame, respect and heat at dawn. Her part, if she joins in or is the centrepiece, is an After Hours game: asked with Consent on, the Consent-off rules with it off. Settings › Revel nights for now.
- The consent rule applies to all of it: staff choose their work and can quit; revel guests came for it and anyone can stop or walk out.
