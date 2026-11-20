# Tarven by Day: Going Outside

> **Rating: Adults only (18+).** All characters are adults. The heroine follows the consent rule in `GAME_PATH.MD`.
> **Status: design draft, 2026-11-17.** Built so far: build steps 1 and 2 (the high street, the market and flyers), see section 7, and **the town v1** (2026-11-18, below).

**Town v1 (built 2026-11-18, `townplaces.ts`, shown by `game.ts` `openTownPlace`).** Every place on the street has 2 to 4 things to do, each once a day, each costing hours (never past five). What they bring: gold, guests tonight and fans at dawn (shared with the flyers, at most 5 guests a night), her name (Respect, Fame, Flirt, Lust, Kindness), heat, trust, corruption, fatigue and tonight's desire. Hard work is refused at fatigue 5. The story shuts doors: Oden gone (`odenShut`), Mara taken (`maraArrested`), Silas crossed (`silasAngry`).

| Place | What she can do |
|---|---|
| **Notice board** | Find Gerald the goat (1 h, maybe 4 gold); sit for the painter Fennick (Curious, 2 h, 10 gold, Fame); model nude for his class (Willing, 2 h, 20 gold, desire, Respect −1); a "private delivery" (Known, 1 h, 25 gold) |
| **Chapel** | Talk to Oden (lines by her stage and corruption); light a candle for Wren (1 gold, rests her); confess (corruption 40+: −5 corruption, −1 Respect, +1 heat) |
| **Warm House** | A red ribbon and a service (Lust, a little desire); a blessing of Veyra (Curious, 2 gold, desire 15); a session with the priestesses (Willing, 2 h, desire 25, tiring) |
| **Copper Bell** | Scout the room (2 gold: a fan and a guest); whisper that Jory waters his ale (2 guests, +3 corruption) |
| **Bakehouse** | Help Tansy at the ovens (4 gold); buy pies for the bar (4 gold: a guest and a fan); the gossip at the long table (by her stage, and Tansy's Lantern callback) |
| **Cider Barn** | Help press apples (5 gold, farmers' trust); a cider with the farmers (trust) |
| **Garrison yard** | Spar with the soldiers (guests tonight, more once she's Willing); wash their laundry (5 gold); drink with Rhea (−1 heat) |
| **Mara's fields** | Help with the harvest (trust, kindness); talk with Mara (by her stage) |
| **Quarry road** | Haul stone (6 gold, a guest); carry a crate for Silas's crew (15 gold, +2 heat, +3 corruption) |

Not in v1: shrines (no spot on the street yet), invitations by day, being seen (step 5), the full Warm House recruits (step 6) and the day-job ladder's guild work (step 7).

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

She steps out of the tavern's front door onto **the high street**: one outdoor scene, a short walk end to end, with doors along it. The outdoor grass is the `build-grass` look, ported to the game in `grass.ts` (step 3). The sky and light run on the same world clock as the tavern (`time.ts`).

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
| **Adventurer** | Hired blade → Party leader → Guild master | Kestrel and the adventurers, once the Toll-Gate Inn falls (STORY.md 2.24) |
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

**Confirmed by the user, 2026-11-20, as written.** `GAME_PATH.MD` stays the source of the consent rule.

---

## 7. Build order (suggested)

| Step | What | Size |
|---|---|---|
| 1 | The front door goes outside: the high street scene, the world clock, the 5 PM deadline, walking back in. **Built 2026-11-17** (`street.ts`, town kit from D:/planet via `tools/blender/build_street_kit.py`, townsfolk walking the street in `townsfolk.ts`). The places only show a panel so far | Medium |
| 2 | Market (cheaper stock) and flyers (fans): two simple day errands so going out pays from day 1. **Built 2026-11-18** (`errands.ts`, the market panel in `game.ts` `openMarket`): cups and dishes for 7 gold a set (the cart's 10) and broken ones replaced for 1, +2 once Silas is crossed, half an hour each; flyers by the market cross once a day (3 gold, 1.5 hours: guests tonight by Flirt, Fame and how much she shows, fans at dawn, Respect lost for showing, less once she's Known); a post on the town feed once a day (1 gold, 15 minutes: a guest or two and a fan, +1 heat because Pell reads it). Errand guests (at most 5) join tonight's crowd. After five the stalls are shut | Small |
| 3 | The grass port to three.js (the `build-grass` skill), for the street verges and Mara's fields. **Built 2026-11-20** (`grass.ts`): about 70,000 camera-facing blades in 10 m tiles over the verges, gardens, her yard, the churchyard and the fields past the gate, bending in stepped wind and leaning away from her and the nearest townsfolk, with accents and flowers; the ground under them is painted in the same colour patches. Lit by the town's own sun and sky (no toon steps or cloud shadows, which nothing else in the town has) | Medium |
| 4 | Chapel and rival-house visits, using the plot and Ledger already written. **Built 2026-11-20.** *Oden's route* (`townplaces.ts` `ODEN_ROUTE`): each talk moves it a step once that step's moment has come: Wren's chin, the red lantern and the chapel brothers at the back door, the salt under his floor (after the salt night, told three ways by what she did: sent Pell to the quarry, sold it, or neither), his doubts about the Stone-Hearted, the spring he asked Wren to marry him, and at 250 fans a hint of what he saw the night she died (told at Act 2's midpoint); far gone (corruption 80+) he goes cold and the route waits. *The rival houses by day* (`rivalvisits.ts`): each of the five Ledger houses (the Cider Barn, the Bakehouse, the Watch Canteen in the garrison yard, the new Toll-Gate Inn spot at the west gate, the Copper Bell) can be scouted (its fans against hers), beaten fairly once scouted (STORY.md's fair idea: +4 fans, 2 guests) or dirty (STORY.md's dirty move, kept funny: +8 fans, 2 guests, corruption +5, kindness −1). Once it falls, the fight is gone: a partner's boss pours her a drink, a ruined house is shut (its own actions too). What she's done in town is remembered across days (`Records.town`) | Medium |
| 5 | Being seen: street reactions by arc stage, outfit and reputation. **Built 2026-11-20** (`beingseen.ts`, applied by `Tavern.beSeen`; the words were already in `towntalk.ts`). *What's done with a word* now counts: a photo spreads her name (+1 fan at dawn, and Fame and Lust when she's bare or in lingerie; 3 a day), a proposition she says yes to brings that person in tonight (3 a day), a hand that lands unasked (Consent off only) stirs the part it found and counts as a grab, a whistle stirs her once she's Curious. *What she wears outside*: each step further (a revealing outfit or a piece missing, her underthings or lingerie, bare on top or below, nothing on) is noticed once a day: Respect −1 to −3, Lust and Fame up, heat +1 when bare; a point less Respect once she's Known. *The walk of shame*: out before noon still messy or in last night's state of dress, a scene once a day, mortifying early (Respect −1, Fame +2), owned when Willing, a parade when Known (Fame +3, 2 guests tonight) | Small |
| 6 | The Warm House and the first recruits (`CHURCH_RECRUITMENT.md`). **Built 2026-11-20** (`recruits.ts`). Three named adult recruits, one per common type, each with their own face: **Hedda Cooper** (34, the cooper's wife, frustrated wife), **Tobin Marsh** (41, the miller's clerk, lonely single) and **Corporal Ilse Brandt** (27, garrison, overworked soldier). Each goes up the hill some days (more often the further along), 3 visits a stage, 0 untouched → 1 first visit (a red ribbon) → 2 opening → 3 committed. At the Warm House door she sees how far each has gone and can **put in a word** (they go tomorrow, counted double; Lust and Fame +1, Respect −1) or **warn them off** (Respect and Kindness +1; they go far less often until sent back). Committed recruits can't be warned off. With Oden's chapel shut, every visit counts double. Each stage is a dawn story card in the church's voice (rationalisation, conditioning, brainwashing; setup, erosion, break) and a line of gossip; one she helped all the way sends her 5 fans. From the second night they come in for a drink (more often further along), dressed by stage (everyday clothes; a red plunge dress, Veyra-red sportswear; the Priestess robes, a red babydoll), with a line at the bar per stage; from stage 2 they tip half again, stay longer and come in wanting it. **Not yet:** the men's church outfit (Tobin wears Veyra-red sportswear as a stand-in), recruits walking the street by day, and her own ranks in the church (`CHURCH_CONCEPT.md` section 7) | Large |
| 7 | Day jobs and careers. **Built 2026-11-20.** *The day-job ladder* (section 5) on the notice board, on top of v1's: honest (flour sacks for the mill, the Bakehouse's bread round), flirty at Curious (serving a noble's lunch; a shift behind the bar of the house above her on the Ledger, which counts as scouting it), lewd at Willing (attending at the bathhouse), and guild work (escorting travellers with a guild card, holding the gate once she's in the garrison; Silas's crates were already on the quarry road). *Careers* (`careers.ts`, section 6.1): the **Smuggler** at the quarry road (Silas opens it after two crates, one if she lied for him; shut once she's crossed him): Runner → Partner (5 runs, corruption 40, 150 fans; +5 gold a night) → Boss of the pass routes (12 jobs, corruption 80, 300 fans, heat under 8; +12 gold and +1 heat a night). The **Clergy** at the Warm House (`CHURCH_CONCEPT.md` sections 5 and 7, names by her body): Acolyte (Willing, 3 visits) → Deaconess (3 days' service, a recruit helped) → Priestess (6 days, Known; the robes and the toy in temple hours) → High Priestess (12 days, a recruit helped all the way) → Warm Mother (20 days, Fame 50) → Voice of Veyra (30 days, 400 fans, Fame 70), each rank with its own day job, nightly pay from Priestess up. Each step up is asked for and says what's missing. Her standing in the town's talk now follows her careers (`Tavern.herRole`): the garrison's ranks, Priestess, the Lantern's madam, the guild's adventurer, else the keeper. The Knight and Adventurer careers were already built (`knight.ts`, `guild.ts`) | Large |
| 8 | Reeve of Tarven and the Law board (late game, after Chapter 1). **Built 2026-11-20** (`townhall.ts`). The council meets on the **market cross** steps (a new spot in the square). First in Tarven gives her a seat; from then she can **canvass** each of the town's six blocs by day (farmers, merchants, soldiers, devotees, nobles, Oden's faithful: +8 mood a day, up to +40) and **stand for Reeve** once over half the town would vote for her. Each bloc's mood is read off what she's done (the farmers her trust and Hollin, the soldiers her garrison rank and Pike, the devotees her clergy rank and the recruits, the nobles her Respect and Fame, Oden's faithful his route and his chapel), plus her canvassing and her laws; the garrison isn't needed any more (a Commander still adds a tenth). The **Law board** (on the cross, and in the Knight menu) now changes the town: the ale tax (+3 / +6 gold a night) and the curfew (−4 / +4), the brothel law (a lit Lantern under a ban +1 heat a night, free +3 gold), the dress code (being seen bare costs double Respect when modest, nothing and no heat once bare is legal), Veyra as state faith (the recruits go twice as fast), and Free use and Public affection in the street's talk, exactly as 6.3 (confirmed): Consent On, they ask, and a no under Free use costs her with the devotees; Consent Off, hands land unasked. The Reeve is her standing in town above all others. **Not yet:** the Baron's fall (the other road to the chain, Act 3), the "Lady of the pass" rung, and the town's look changing with the laws (outfits in the street, couples in the grass) | Large |
