## Consent rule (always — for any agent or implementation)
Player is asked first. All four answers stay available.
Pull away always works. Too-drunk blocks yes.
No text or code may show a touch landing after a refusal
or remove the player’s ability to stop.
Force / intensity bars are feedback only after a yes.
A yes given in advance counts as asking first: the "Eager guests" setting (section 7b) is offered once, does nothing until the player agrees, and can be switched off any time.

## Horny direct touch (optional random)

When a guest is in the Horny state and their Nerve is high:
- There is a small random chance (example: 15–25 %) that they skip the choice screen and the touch lands immediately.
- This only happens on touches at or below their current Nerve.
- After it lands, the player can still Slap or Pull away on the next reach.
- The Force bar appears and fills faster during these direct touches.
- The text should show the guest acting on impulse, not the player being unable to refuse forever.

All other touches still freeze and show the four choices.
Pull away still works on every later reach.

# Tarven – Karryn-inspired guest types, preferences & systems
*(Hard lines remain: all intimate acts require explicit player choice. Pull away always works. Too-drunk blocks yes. Force bar is intensity feedback only.)*

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

- **Dirt b/thers them:** how much a messy room cuts their patience. 0 doesn't notice, 2.5 can barely sit down.
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

---

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

## 7b. Eager guests: touching without asking [built]
A lustful guest with the nerve for it (Nerve 5+) is **impulsive**. Some of the time, their touch lands without the choice screen, because the player has said yes to that in advance.

| Setting (Settings › Eager guests) | Default | Meaning |
|---|---|---|
| Touch without asking | On, but **ask me the first time** | Nothing lands without asking until the player agrees |
| Up to boldness | 5 | The boldest touch it covers (1–9) |
| How often | 20% | The chance an impulsive guest's touch skips the question. Not every time |

- **The first time** an impulsive guest reaches, the touch freezes as usual with two extra answers on top: *"Let it happen, and let eager guests skip asking (20% of the time)"* and *"Always ask me first"*. Every usual answer stays, Slap and Pull away included. Switching it on in Settings also counts as agreeing.
- **It only covers touches she could already say yes to:** her desire is high enough for *Let it happen*, nobody is too drunk, the touch is within the boldness chosen, it's not a garment, and it's not the invitation upstairs.
- **When it lands:** the guest's reach, an impulse line (the guest acting on impulse, her letting it be), the touch's own *Let it happen* line, and *Get back to work*. It counts as *Let it happen* for pay, desire and records. The comic panel plays, and the Force bar rushes up (`fast`).
- **Every other reach still asks**, and Pull away works on every one of them.
- The settings live in the browser (`tarven.touch`), not in a save. The code is in `src/game/touchsettings.ts`, `tavern.ts` (`maybeReach`, `touchOptions`), `menus.ts` and the lines in `touchtalk-givein.ts` (`IMPULSE_LINES`). The tests are in `tests/touchsettings.test.ts`.

## 8. Player side (already present, reinforced)
- Five desire meters (Body, Mouth, Breasts, Butt, Pussy) work exactly as designed.
- Pussy meter is the direct analogue of Karryn's genital desire.
- Passives for each meter stay; preferred-guest interactions can count toward the relevant group faster.
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