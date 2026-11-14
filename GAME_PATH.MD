# Tarven – Karryn-inspired guest types, preferences & systems

## Consent rule (always — for any agent or implementation)
Normal service touches: player is asked first. All four answers stay available.
Pull away always works on later reaches. Too-drunk blocks yes.
Force / intensity bars are feedback only after a yes or after a Horny direct touch.

Horny / high-Nerve exception (Karryn-style challenge):
When a guest is Horny or has high Nerve, they may touch without the choice screen.
This is intentional difficulty. The player can still Slap or Pull away on the next reach.
See “Horny direct touch” below.

Brawl loss is a separate exception: a sexual scene may be offered after defeat, with a final continue/stop choice.

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
- Mid-brawl reaches are Karryn-style: bolder than at the table (+2 Nerve for what they go for), aimed at the part their type likes, and they can use brawl-only touches open to any kind: spank, hips hauled back, thumb across the lips, breath on the neck, a grope, a hand up the thigh, a squeeze under the breasts, a kiss mid-fight (`brawl: true` in `touchtalk.ts`). A touch can only land unasked (Consent off) when it is within their own Nerve, without the brawl's +2.
- A talked-down brawl can later lead to an After Hours invite, which the player can accept or refuse.

## Brawl loss (Karryn-style)
When she loses a brawl:
- The fight ends immediately.
- A sexual content scene is offered (18+ card or short scene).
- She gets a final choice at the start of the scene: continue or stop.
- If she continues, she picks where (7f): right where she fell, upstairs in her room, or out back in the yard; with the one who won, and their company (their party, or else whoever shares their table, never anyone roaring drunk, never the Baron). **Each of them asks**, and she ticks who comes up (all ticked to start). It plays as the After Hours game with all of them (`startDuel(..., crewIds)` in `tavern.ts`, `showDuelRules` in `fightpanels.ts`), and Stop ends it for everyone. Desire meters and records can rise, then the night ends.
- If she stops, the night still ends and she only loses the normal gold and respect.
- Gold and respect are lost either way.
- **She's Bruised** (a debuff, `src/game/debuffs.ts`) through the next night: saying no costs 25% more willpower, her hold is 1 weaker (Consent off), and guests reach for her 15% more. Losing again before it wears off makes it worse (level 2).
- Winning or talking them down does not trigger this.

---

*(Normal service touches require explicit player choice. Pull away always works on later reaches. Too-drunk blocks yes. Force bar is intensity feedback. Horny / high-Nerve guests may touch without asking as a challenge. Brawl loss may offer a sexual scene with a final continue/stop choice.)*

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

- Base nerve, and how nerve grows with lust, mood, drink and touches allowed, are **[built]**. Only the meter weighting is planned.
- Preferred meter gets +30–50% weight when picking a touch.
- Allowing a preferred-meter touch gives extra tip and a small extra rise to that meter.
- Force bar still shows the actual boldness of the chosen touch (1–10).

---

## 5. Named regulars & "Wanted" system [planned]
- 1–2 named guests per type can become permanent regulars if they take a "first" (first kiss, first intimate, first upstairs, etc.) or cause enough defeats in After Hours / brawls.
- A regular **keeps their rolled sheet** (section 3) from night to night, so they're always the same person.
- They reappear later nights with rising Nerve and a fixed preferred meter.
- Each time you beat them physically (brawl) or win an After Hours duel they grow stronger next time (higher Nerve, more brawl stamina and upstairs stamina, more aggressive weighting).
- They remember previous nights and comment on it.
- Optional: a "Wanted" journal tab that lists them, their type, their current stats and their preference.
- **The first three (STORY.md, section 4b):** Silas Crowe (smuggler), Mara Holt (farmer) and Captain Rhea Vance (soldier, off duty after the meeting beat). Each keeps +0.5 lasting nerve per night she let them touch her (at most +2, −1 after a slap until she lets them again), and opens the night with a line picked by what they remember and her arc stage. **Mara and Rhea are never impulsive**, so with Consent off they still ask.

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
- **Her face shows it too**, the way Karryn's Prison does it (`face.ts`, moved on her model by `Dresser.setExpression`). Her bearing comes from her Slut Level: *stern* (brows level and low, mouth set) at first, at ease by 2, *confident* (a knowing half smile, lids a touch low) by 5. Her state lies over it: *tired* (heavy lids, brows sagging up in the middle) as her willpower runs below half, *embarrassed* (brows high and worried, eyes away, red to the ears) as her clothes come off, less the lewder she is and not at all by Slut Level 6, *drunk* (heavy lids, a loose lopsided smile, flushed), and worked up as she's aroused. What she's in the middle of leads it: in an after-hours game *aroused* (lids low, lips parted) and deeper with her pleasure, then *on the edge* (eyes screwed shut, mouth wide open); showing a guest something *shy* until she wants it 2 past what it takes, then *sultry*; in a brawl *angry* (brows hard down and knitted, teeth showing). And for a moment, what just happened: a tip, a *smile*; a guest walking out on her, *annoyed*; saying no (a slap, a touch turned down, a look refused), *angry*; a touch she reacts to, *surprised*, *pleasure* or *annoyed*. Her brows move most of all: up, down close over her eyes, arched high, worried up in the middle and curving down at the ends, or knitted together. Jolted while she's worked up she's *overwhelmed* (eyes squeezed, mouth stretched on her teeth); on the edge with her pleasure near the top she's *lost* (eyes rolled up, mouth hanging open, tongue out). Showing a guest something she's *bashful* barely able to (less than 1 past what it takes: lips pressed thin into a line drawn across her face, a hint of her lower lip under it, brows sloping down to her nose with their tips flicked up, eyes down, red all over), then shy, then sultry, and far past it (4) *delighted* (a big open smile on her teeth, eyes crinkled from below). In an after-hours game, still proper (Slut Level under 2) she's *strained*, fighting it (mouth stretched wide on both rows of teeth, eyes squeezed shut); between, she's worked up and *panting* as her pleasure climbs (mouth open, tongue out over her lip); once she's confident she's delighted, melting towards *blissful* (a soft smile on parted lips, dreamy half shut eyes). Melting into a touch, she's blissful too once she's lewd. Frowning or straining, two short creases show between her brows, a third at the strongest; deep in a blush, red strokes show on her cheeks. Her mouth opens wide, the whole of it widening as it goes, lips, teeth, tongue and the inside of it together, so its corners stay clean; pressed small, it draws in the same way. Her tongue comes out over her lower teeth and hangs well down past her lower lip: all the way out panting and lost, partway on the edge. The red of her blush spreads: her cheeks, then her nose, then across the bridge of her nose and her brow, and at its deepest all over her face. Her face eases from one look to the next; in a talk it changes at once, and a moment holds till the talk is over, so her portrait has it. Her mouth opens on a jaw: her lower lip, chin, lower teeth and tongue drop, and the inside of her mouth and her upper teeth show (built in `build_world.py`'s `head_grid`). In development, `?face=shy` (any expression) holds one to look at.
- **It stirs them up:** her underwear leaves that guest +2 lust and as bold as if she'd let them touch her once more; a bare look +3 lust and twice. Her own desire for that part rises (+5 / +10).
- **Grabs and gropes stir them up too:** each touch she lets happen is +1 lust for that guest (and, as before, bolder); letting a guest who grabbed her hold her is +1 lust and +1 bold.
- **Records and passives:** peeks at her underwear, bare looks, times she said no (records). *Peep Show* (5 peeks: +1 gold a look, asked 25% more). *Flasher* (5 bare looks: +2 gold a look, asked 50% more).
- Tests: `tests/show.test.ts`; elsewhere the tests' setup turns asks off (`showDice.roll = null`).

## 7f. Adult play: upstairs, or the taproom [built]
Adult play (`region: "invite"`, boldness 10; the code still calls it the invitation) is told as a story, and when she says yes she chooses **where**: up the stairs with them, or right here in the taproom with them and whoever else in the room wants in. The rules for when it comes up are in `src/game/adultplay.ts`, the words in `src/game/invitetalk.ts`, the taproom rules in `src/game/taproom.ts`, the tavern's side in the "Adult play" section of `tavern.ts`, and the cards in `fightpanels.ts` (`showInvitation`, `playAutoAdult`).

- **The adult play stack (in percent, on her status card under Pleasure):** fills through the night (`adultplay.ts`, `STACK_GAIN`): +0.12% per point of desire she gains (+0.25% per point of Cock desire), **+8% a drink** (drink loosens her; sloppy drunk still blocks every yes), +3% (+0.5% per boldness) a touch she lets land, +6% a piece of clothing off, +3% a peek / +6% a proper look, +20% overwhelmed. It starts each night at **half her lewdness, at most 40%**. Saying no to adult play knocks it back 15%; adult play played out (upstairs, the taproom, or after a brawl) empties it.
- **When (Karryn-style):** only once the stack is **full (100%)**, and only an **aroused** guest (lust 6+, not drunk). Then, each time such a guest reaches for her, there's a chance they go for adult play instead (`adultPlayChance`): 10% to start, plus her Cock desire (up to +12%), horny (+6%), wet (+4%), the guest's lust past 5 (up to +8%), a guest in the lust mood (+3%), her lewdness (up to +12%), clothes off her (+2% a piece, up to +6%), nights gone by (up to +4%) and her passives' pull; halved when the room respects her; never past 50%. Never in a brawl, never by a guest who has hold of her, never on the first reach of the run.
- **Her yes needs her ready:** Cock desire 90, less 1 for every 5 lewdness (up to 20) and her passives (*The Back Stairs* 10); or **horny and wet** at once, whatever her Cock desire. Too drunk on either side blocks the yes.
- **The ask:** what they say, in their own kind's words (farmer, soldier, smuggler, fugitive, adventurer, bandit, noble), then their reach, then the room going quiet to hear her answer, then her thought. With **Consent on** it's always asked, every usual answer there.
- **Consent off (Karryn's Prison): her state decides.** If she's ready (a yes is there) and the guest is **aroused** (lust 6+, not drunk), it happens without the question: her sub talk and their crowing, then where and what are **matched to her state** (`autoAdultPlay`): down in the taproom with everyone who wants in, if the taproom's open to her (not her first time, someone else wants in) and she's already on show (clothes off, or *Open House* / *The Whole Room*); else upstairs, doing what her strongest desire wants (ties to the bolder act; a kiss at least). The taproom still has Stop. If her state isn't there, she's asked as usual.
- **Her yes:** her words, and the room's reaction (a cheer, the room pretending not to watch). Then the **Adult play card**: *Upstairs, in your room*, *Down here, in the taproom (18+)*, or *Not tonight*.
- **After a lost brawl:** the winner's ask is adult play too, and she picks **where** (`brawlPlaces`): *Right here, where you fell* (the room watches: the pass talks like the taproom, fame up, respect down, +1 heat; never her first time), *Upstairs, in your room* (as before), or *Out back, in the yard* (half private: fame +1, someone in the lane saw). Same rules screen, same Stop.
- **Upstairs:** the walk up in their kind's way, and her room under the eaves (new the first time, familiar after). Then what happens there, hers to choose as before (`goUpstairs`). When she goes to bed: a **morning-after** line, by kind (wildflowers on the pillow, a folded scarf, a twist of salt...).
- **The taproom (a group scene):** played as the After Hours game (`duel.ts`) with several partners: the one who asked, and the guests she picks from those who want in.
  - **Who wants in:** guests sat in the room whose lust shows (6+), never drunk, angry, scared or gloomy, never the Baron; keenest first, and **no cap**: everyone willing can be in it. **Six are on her at once** (as many as her body holds: two hands, mouth, breasts, butt, pussy); the rest **wait in line** and step in as each one gives in, so it piles up until the last of them is done (like Karryn's Prison). **Every one asks** (their kind's line by their name), and she ticks who joins. Nobody is pulled in.
  - **The room left open** (her choice before it starts, on by default): watching stirs the room (+1 lust every 3 of her moves, +2 each time one gives in), and anyone who then wants in (the same rules: lust 6+, never drunk, angry, scared or gloomy) joins the end of the line. Kept closed, they only watch. Stop ends it for everyone, line and all.
  - **Her rules:** what's in play (only parts she's warm enough for; a kiss always), and the role-play. **No stake**: they tip if it's played to the end. **Stop** (and Esc) ends it at once, as in every After Hours game.
  - **Not on offer at all** when she's too drunk, or the one who asked is. **There but shut** (with the reason) on her first invitation ("your first time should be behind a closed door": the writing has her a sheltered woman, and her first time is private), or when nobody else wants in.
  - **The room, as it starts:** most stay to watch and cheer; the cold (lust under 3), the scared, gloomy or angry, and nobles not warmed up themselves (lust under 6) get up and leave.
  - **Played to the end** (won or lost): fame +2 + 1 per partner, respect −2 − 1 per two partners, flirt +2, **heat +1** (the keep hears), **trust −1** if any farmer or stranger walked out on it, everyone who stayed to watch +3 lust. Each partner leaves spent and idolizing, and tips 4 + their own tip (×1 + her invitation gold bonus). The game's own After Hours bookkeeping applies too (duels won/lost, moves, cum, her desire spent), and it settles through `finishDuel`, so main's per-partner fans count it. A morning-after line at bedtime. **The night goes on**: back to the bar.
  - **Stopped:** they step back at once and go back to their seats, calm. Fame +1, respect −1, watchers +1 lust, no gold, no heat.
  - It counts as tonight's After Hours game: nobody lingers at bedtime to ask for another.
- **Records** (journal, Records, under Upstairs): stayed down in the taproom, joined in all told (the one who asked counts), most at once. Saved with the rest of her records.
- **Passives** (Exhibition): *Open House* (stay down once: +20% gold from adult play, upstairs or down; asked for a look 25% more often; lewd 8). *The Whole Room* (stay down 3 times, once with 4 at once: Body desire starts +10; +1 fame a serve while undressed; costs −1 respect every night; lewd 14).
- Tests: `tests/invite.test.ts`.

## 7g. Touch layers: over the clothes, inside them, bare skin [built]
Karryn-style, a touch on a part her clothes cover (chest, rear, thighs, waist, intimate) goes **over her clothes**, **inside them**, or on **bare skin** (`layersOpen`, `pickLayer` in `src/game/touch.ts`).
- **What opens them:** *inside* once her desire for that part is 20 past what the touch needs, or Slut Level 2+; *bare* once it's 40 past, or Slut Level 4+, or two pieces of clothing are off her anyway.
- **Which they go for:** the boldest open, half the time; otherwise one of the tamer ones (picked by who and when, not the night's dice). A line says how far in they go.
- **Her yes** is her desire, as before. Further in pays and stirs her more once it lands: inside +1 gold and ×1.25 desire, bare +2 gold and ×1.5. In the Consent-off check it counts as bolder (+1 / +2 to her hold).
- Never on a garment tug, in a brawl, or by a guest with hold of her. Records: touched inside your clothes, touched on bare skin (journal, Records). Tests: `tests/invite.test.ts`.

## 7c. Desire, Karryn-style [built]
Six desires, 0–100, reset each night to what her passives start them at: **Body, Mouth, Breasts, Butt, Pussy, Cock**. Cock desire is her wanting to be intimate with someone. The rules are in `src/game/desire.ts`; the tests are in `tests/desire.test.ts`.

**What raises them**
- A touch she lets land: that part's desire +8, every other +⅓ of that. Thigh, lap, intimate and invitation touches raise Cock desire fully too. Lean in ×1.5; body skill practice adds more; boldness 6+ adds 25%, 9+ adds 50% on that part.
- A drink with a guest: all +6. Being overwhelmed: all +20. An upstairs act: +20 on its desire. After Hours: their moves raise the part they use.
- In a brawl: each grapple of theirs (grab, headlock, hair-pull, tackle) raises the desire for the part their type goes for by 5, and Body by 2. Her own intimate moves raise Cock and their part.
- Passives raise starting desire and how fast each fills (sensitivity).

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
- **Suppress desire (Mind):** everything but Cock comes down by 15 (+3 per Mind level above 1). Costs 4 willpower, 6 while horny.
- **Suppress Cock desire (Mind):** Cock alone, the same amount. Costs 6 willpower, 9 while horny.
- **Use your hands on them** (Cock 40): −5 their stamina. **Use your mouth on them** (Cock 60): −8. **Ride them** (Cock 70, wet): −12. Each raises her pleasure (never to 100 mid-fight) and her desire, and counts toward upstairs records and skills (riding counts as the bed).
- Wearing them out this way is a win, but a different one: **"Spent"**: they leave besotted, fame +3, flirt +1, respect −1.
- The brawl screen shows a **Desire** line: Horny, Wet, and each desire past 50.

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
| Brawls | `src/game/fight.ts` |
| After hours | `src/game/duel.ts` |
| Adult play: when, the story, upstairs or the taproom | `src/game/adultplay.ts`, `src/game/invitetalk.ts`, `src/game/taproom.ts` |
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
