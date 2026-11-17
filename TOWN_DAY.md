# Tarven by Day: Going Outside

> **Rating: Adults only (18+).** All characters are adults. The heroine follows the consent rule in `GAME_PATH.MD`.
> **Status: design draft, 2026-11-17. Nothing here is built yet.**

---

## 1. The problem

Right now the day is spent inside the tavern. She cleans, builds in House Plans, naps, and rings the bell for dusk. The clock runs from morning to 5 PM (`AFTERNOON_HOLD_HOUR` in `game.ts`) and then waits for her. There's no reason to step outside, and the town in all the writing (the chapel, the five rival houses, Mara's farm, the garrison) is never seen.

**The goal:** the day becomes the time she spends **out in Tarven**, getting ready for the night. The night is still the main game (pillar 1: running the bar is the game). The day feeds it.

---

## 2. The core rule: hours are the currency

- She has from **8 AM to 5 PM**: nine hours.
- Every place and every errand costs time: walking to the farm takes an hour, a talk takes half an hour, a job takes two.
- At 5 PM she has to be back to ring the bell. If she's late, the doors open late: fewer guests, and the ones waiting are angry.
- Napping still works, but it costs the afternoon.

This makes every day a small plan: *buy cheap flour, or scout the Copper Bell, or help Mara and win the farmers?* She can't do all of it.

---

## 3. The high street (first scene)

She steps out of the tavern's front door onto **the high street**: one outdoor scene, a short walk end to end, with doors along it. The outdoor grass is the `build-grass` look (the three.js port is still to do, see `.claude/skills/build-grass/SKILL.md`). The sky and light run on the same world clock as the tavern (`time.ts`).

| Place | What she does there | What it feeds at night |
|---|---|---|
| **Market square** | Buy flour, meat and casks cheaper than having them delivered. Prices shift with the night's rumours (salt is dear if Silas is crossed) | Stock for bread, stew and ale. Gold |
| **Hand out flyers** (in the square) | Talk up tonight's menu, a show or a Lantern night. Her outfit and Flirt decide who listens. Or post on the town feed from her phone (`WORLD.md`): faster and cheaper, but Pell reads everything on the Baron's relay | New faces tonight, a few **fans** |
| **Notice board** | Day jobs for gold: carry sacks, wash the garrison's laundry, sit for the painter. Later, lewder ones (section 5) | Gold, and a way to pay the debt that isn't the bar |
| **The rival houses** (Village Ledger) | Scout one: see its fans, its menu, who drinks there. Beat it fairly (steal the idea) or dirty (spoil the flour, a word to Pell) | The Ledger fight in STORY.md, by day instead of only in text |
| **The chapel** | Talk to Oden. Wren's past, the salt under the floor, his doubts | Plot beats, Respect, Oden's route |
| **The Warm House** (Church of Veyra) | Visit, watch recruits change, take sessions and later ranks (see `CHURCH_CONCEPT.md`) | Lust, Fame, devotee guests, church passives |
| **Mara's fields** (out past the gate, in the grass) | Help with the harvest, buy produce cheap, talk about the rising | Farmers' trust, cheaper food, Mara's route |
| **The garrison yard** | Spar with soldiers: brawl practice that trains her (the `fight.ts` rules with no stakes), or drink with Rhea off duty | Brawl skill, Rhea's route, lower Heat |
| **Shrines** (one per god, `GODS_LORE.md`) | A drop for Veyra, dice for Bram, milk for the Mother, a sip for the Cold One. A small daily blessing for the night (say Bram's: more dice and dares tonight) |
| **The quarry road** | Meet Silas's crew, hide Ash, pick up contraband | Secrets, gold, Heat |

**Invitations:** anyone she talks to by day can be asked to come in tonight (`invitetalk.ts` already handles asking guests). A named guest she invited arrives in a better mood. Regulars she has a number for can be invited by message instead, without the walk.

**The setting:** the town is medieval with modern things in it (`WORLD.md`): mana-lamps, posters, people on their phones, modern clothes next to armour.

---

## 4. Being seen

The town has been talking about her at night (gossip). By day she **hears it to her face**:

- People react on the street to who she's become: her arc stage, Respect, Lust and Fame. Sheltered: polite nods. Known: whistles, offers, a hand on her as she passes.
- **Photos:** passers-by photograph her (`WORLD.md`). A photo spreads her name on the feed, for better or worse.
- **What she wears outside counts.** Walking to market in last night's torn clothes, or in her Lantern dress, is noticed: Respect down, Lust and Fame up. Morning after a rough night? The walk of shame is a scene.
- **Touches in the street** use the same touch rules as the taproom. With Consent On, they ask first; with Consent Off, a Horny or high-Nerve passer-by may just reach (the `GAME_PATH.MD` exception, out of doors).

---

## 5. Day jobs (ladder)

The notice board grows with her name. Every job is a short scene or minigame, and costs hours.

| Tier | Example jobs | Opens at |
|---|---|---|
| **Honest work** | Carry sacks, laundry, help at the Bakehouse, deliveries | From day 1 |
| **Flirty work** | Barmaid at another house for a day (scouting it), sit for the painter, serve at a noble's lunch | Curious |
| **Lewd work** | Nude model, bath attendant, the Warm House's paid sessions, "private deliveries" | Willing |
| **Guild work** | Jobs from a faction: escort travellers (adventurers), hold the gate (garrison), carry a crate and ask nothing (smugglers) | A faction's trust |

---

## 6. Late game: she runs the town

*From the user's concept: she can explore more, take any job (knight and the rest), become mayor, and make the country into whatever she likes, with laws such as free use and sex anywhere.*

### 6.1 Careers

Past Chapter 1 she isn't only an innkeeper. Each career is a ladder with its own day jobs, outfits and passives, and she can climb several:

| Career | Ladder | Who opens it |
|---|---|---|
| **Knight** | Squire → Knight → Knight-Captain | Rhea and the garrison (the knight kit already exists: one faction, shared colours and badge) |
| **Adventurer** | Hired blade → Party leader → Guild master | Kestrel and the adventurers (300 fans) |
| **Smuggler** | Runner → Partner → Boss of the pass routes | Silas |
| **Clergy** | Acolyte → … → Voice of Veyra | The Warm House |
| **Madam** | The Lantern's stages | The Lantern arc (built in part) |
| **Politics** | Council seat → **Reeve (mayor) of Tarven** → Lady of the pass | First in Tarven (end of Chapter 1), then the Baron's fall (Hesk, Varn or the crown) |

### 6.2 Reeve of Tarven: making the laws

Once she's mayor, the town hall has a **Law board**. She passes laws by day (each costs gold and favours, and the council must be won). Each law changes the whole town: how people dress, how they talk, what happens on the street, who comes into the tavern, and which factions love or hate her.

| Law | Levels (tame → wild) | What changes |
|---|---|---|
| **Ale tax** | High / Fair / None | Her prices against the rivals, the farmers' mood |
| **Curfew** | Dusk / Midnight / None | How long the night's service can run |
| **Dress code** | Modest / Relaxed / Bare is legal | Townsfolk outfits on the street and in the taproom. Bare: nudity in public is legal |
| **Public affection** | Kept private / Touching allowed / **Sex anywhere** | What NPCs do in the streets and the grass by day, and what guests do in the taproom without hiding it |
| **Free use** | Off / Devotees only / **Everyone** | Anyone may ask anyone in town for sex, anywhere. Townsfolk who live by the law (devotees, the willing) say yes. For her, see 6.3 |
| **State faith** | The Stone-Hearted / All gods / Veyra | Oden's chapel is protected or shut. The Warm House becomes the town's church (gods in `GODS_LORE.md`) |
| **Brothels** | Banned / Licensed / Free | The Lantern's licence (L2) solved by her own law |

**The town answers back:**
- Every law moves factions: soldiers and devotees love the wild ones, Oden and the nobles hate them, and the farmers split. A faction that hates her laws enough sends fewer guests, leaves the town, or rises against her (a late-game event like the brawls).
- Wild laws bring Fame and Lust guests from all over the pass (fans), and an outside enemy: the crown's auditor, or Baroness Varn, who wants an excuse to take the keep.
- The town **looks** different: outfits on the street change with the dress code, couples in the grass with public affection, devotees in red on every corner under Veyra.

### 6.3 Her own consent under her own laws (the user decides)

Free use and sex anywhere apply to the whole town, her included. How they treat her should follow the consent switch:
- **Consent On:** under free use, she's asked everywhere she goes. The law makes saying no cost something (Respect with devotees, popularity), but her answer still counts, and being too drunk still blocks yes.
- **Consent Off:** the Karryn's Prison rules move out of doors: hands land unasked in the street, as in a brawl.
- Never while she's passed out. The Baron is never a client, whatever the law says (STORY.md).

**This is a proposal. `GAME_PATH.MD` is yours to set, so please confirm or change 6.3 before anything is built.**

---

## 7. Build order (suggested)

| Step | What | Size |
|---|---|---|
| 1 | The front door goes outside: the high street scene, the world clock, the 5 PM deadline, walking back in. **Built 2026-11-17** (`street.ts`, town kit from D:/planet via `tools/blender/build_street_kit.py`, townsfolk walking the street in `townsfolk.ts`). The places only show a panel so far | Medium |
| 2 | Market (cheaper stock) and flyers (fans): two simple day errands so going out pays from day 1 | Small |
| 3 | The grass port to three.js (the `build-grass` skill), for the street verges and Mara's fields | Medium |
| 4 | Chapel and rival-house visits, using the plot and Ledger already written | Medium |
| 5 | Being seen: street reactions by arc stage, outfit and reputation | Small |
| 6 | The Warm House and the first recruits (`CHURCH_RECRUITMENT.md`) | Large |
| 7 | Day jobs and careers | Large |
| 8 | Reeve of Tarven and the Law board (late game, after Chapter 1) | Large |
