# The Knight Path: from nothing to the head of the garrison, then the town hall

**Tarven is an adult game (18+). Every character is an adult.** The consent rule at the top of `GAME_PATH.MD` holds for everything adult on this path (see §8).

*The user's idea:* she climbs from nothing to lead knight, and later becomes the town's mayor. This expands the Knight row of `TOWN_DAY.md` §6.1 and joins it to the Politics ladder (Council seat → **Reeve of Tarven** → Lady of the pass) and the Law board (§6.2).

The rules are in **`src/game/knight.ts`** (pure, no DOM, injected rng) with tests in `tests/knight.test.ts`.

> **Status: rules and placeholder menus built, art to come (2026-11-18).** Wired into `tavern.ts` (`joinGarrison`, `knightDrill`, `knightPatrolChoose`, `knightRaid`, `knightTourney`, `knightOath`, `knightPromote`, the Captain's duel and vote, the Commander's rules, Reeve and the Law board) and saved (`TavernSave.knight`), tested in `tests/knightwiring.test.ts`. Played from **Settings › Knight** for now (§10 lists what's left).

**The twist that makes it Tarven:** the garrison is the **Baron's** (`WORLD.md`, `STORY.md`). She climbs inside her enemy's army. The higher she goes the more power she has over raids, heat and the town, and the harder the Baron's men watch her double life.

---

## 1. The ladder

| # | Rank | How she earns it | What she does | What it gives |
|---|---|---|---|---|
| 0 | **Volunteer** | Rhea signs her on once the Watch Canteen falls: Pike vouches for her (STORY.md 2.24; built today: any day) | Errands for the garrison, the drill yard, market patrols | A badge, patrol XP. Nothing else yet: she's "the innkeeper with a stick" |
| 1 | **Squire** | **5 brawls won** + **pass the drill test** (score 60+) | Patrols, escorts, the tourney | **Sword bonus** in brawls (+1), heat −1 a night *while in favour*, respect +1 a week |
| 2 | **Knight** (Dame of Tarven) | **Win a tourney duel** + **swear the oath** + 5 patrols + the garrison's favour (30) | Harder patrols (smugglers' carts), leads a **squad of three** (Corporal Dunn, Grisha the orc, Wenna the fox) | +2 brawl damage, a **squad ally** in brawls (a loyal one), heat −1, respect +2 a week |
| 3 | **Knight-Captain** | **Fame 40, Respect 40**, 12 patrols, a **loyal squad** (3+, loyalty 60 on average) | **Raids**: the smugglers' cave, Sabine's Velvet House, the pass bandits | Raids, 2 squad allies, heat −2 a night |
| 4 | **Lead Knight (Commander)** | Act 2+, and **beat the old commander in a duel** or **win the squad's vote**; scandal under 20 | Sets the **garrison's rules** (fair / harsh / loose), picks every raid, and in the end **decides which side the garrison takes** | +3 brawl damage, 3 squad allies, heat −3 a night, +2 squad members, control over raids and heat |
| — | **Reeve (mayor) of Tarven** | Act 3, a council seat, then **the town vote** (over half, Respect 50) **or the Baron's fall** | The **Law board** (§6) | The town itself. Commander isn't needed, but it adds a tenth to the vote |

`canPromote(state, facts)` checks each step and lists what's missing in plain words ("Win 5 brawls (3/5)"), so the garrison board can show it.

### The oath (Knight)
Sworn as a squire with a tourney win behind her. Two ways:
- **To the Baron** (the garrison's lord): favour +10, and his men watch her a little less. Pell writes it down.
- **To the town** (Rhea's quiet way, only once `rheaDoubts` is set): no favour, Rhea's respect, and the Baron watches her harder.

### The old commander (new character, proposed)
**Commander Harlan Voss**, the Baron's man over Rhea's head: fifty, heavy, good with a sword and better with the Baron's purse. Rhea is the Captain the soldiers respect; Voss is the one the Baron pays. To take his place she either **beats him in a duel** in the yard (a brawl Fight one on one; only a real win counts, not a talk-down) or **calls the squad's vote**: each member votes for her at loyalty 50+, and **Rhea votes with her once she has her doubts**; she needs a majority and three votes. *If the user would rather Rhea be the one she replaces, swap the name: the rules don't change.*

---

## 2. What she does (the minigames)

| Minigame | Rules (`knight.ts`) | Reuses |
|---|---|---|
| **The drill** (timing) | A beat plays; she presses on it. Each press is graded by how far off it is: perfect (±50 ms, 10 pts), good (±120, 6), ok (±220, 3), miss. Score 0–100; **60 passes**. XP = score/10 + 1 a perfect + 5 for a pass. **Hikari** on staff (the summoned hero) widens every window by 20%. A passed drill with her squad: their loyalty +2 | New small UI (beat bar) |
| **Tourney duels** | One on one, played as the **brawl Fight**; only `"won"` counts. Win: XP 15, fame +3, favour +5 | `fight.ts` Fight |
| **Patrols** | Short day events, a choice each; rolled with the injected rng (+5% a rank), or, for a fight choice, taken from the brawl's outcome | `fight.ts` for fight choices |
| **Squad orders** | Before a raid: **Charge** (+10%, loyalty +8 / −12), **Flank** (even, +5 / −6), **Hold and press** (−10%, +3 / −2) | — |
| **Town votes** | Each bloc's mood toward her (−100…100) makes its share: farmers 30, merchants 20, soldiers 20, devotees 10, nobles 10, Oden's flock 10 | Faction moods (to build) |

### Patrols (day events, an hour or two each)
| Event | Opens at | Choices |
|---|---|---|
| **Stop, thief!** (a phone snatched off a goblin's stall) | Volunteer | Run him down / Tackle him (fight) / Let him go with a warning |
| **Break up a fight** (outside the Drowned Rat, being filmed) | Volunteer | Wade in (fight) / Talk them down |
| **One of their own** (a drunk soldier won't take no from a farm girl) | Volunteer | Order him off / Report him to Rhea / Knock him down (fight). The garrison's favour drops either way; the town's respect rises |
| **Escort a merchant** (a dwarf's cart of mana-stones) | Squire | The high road (safe) / The quarry road (fight, dead signal, pays double) |
| **A smugglers' cart** (false-bottomed barrels, Silas's name) | Knight | Seize it (fight, heat −1, squad loyalty +3) / Take a cut (gold, scandal +5) |

### Raids (Captain and up; a day each)
| Target | Strength | Win | Notes |
|---|---|---|---|
| **The smugglers' cave** | 3 | Gold 20, favour +6, heat −2 | Sets `silasAngry`: Silas will hear of it |
| **Sabine's Velvet House** | 4 | Fame, respect, favour; Sabine's girls free to walk (some ask for the Lantern) | Lost: scandal +5 |
| **The pass bandits** | 5 | Gold 25, respect +4 | "Somebody texted" (the relay) when it fails |
| **The Baron's toll house** (the silver) | 6, Commander only | Gold 50, `baronSilverTaken`, favour −20, heat +5 | The point of no return: the garrison turns on the Baron |

Odds: 50% + 12% a point of squad power over the target's strength (each member 0.5 + loyalty/100), plus the order; between 5% and 95%.

### The garrison's rules (Commander)
| Rules | Each day | Trouble |
|---|---|---|
| **Fair** | Squad loyalty +1, respect +1 | — |
| **Harsh** | Loyalty −1, favour +2 (the Baron approves), heat −1, respect −1 | −10% |
| **Loose** | Loyalty +2, favour −1, respect −1 | +15% (soldiers drunk in the taproom) |

---

## 3. What it gives (as plain data)

`effectsOf(state)` gives the rank's **brawlDamage**, **heatPerNight** (only while favour ≥ 30), **respectPerWeek**, **squadAllies** (only loyal members, loyalty 50+), **baronWatch** (0–4, ±1 by the oath), and whether she can **raid** and set **rules**. Every event's effect is a `KnightEffects` record: `xp, favour, scandal, loyalty, respect, fame, heat, gold, flag`. Favour, scandal and loyalty are the career's (`applyEffects`); the game applies the rest to her and the tavern.

---

## 4. Her double life

She's a knight by day and an innkeeper (and maybe a Lantern madam, a feed star, a Warm House devotee) by night. If she's caught (`caughtChance`: each kind's base × (1 + ¼ × the Baron's watch)), `scandal(state, kind)`:

| Caught at | Points | Only talk from |
|---|---|---|
| A bold post on the feed | 10 | Knight |
| A night at the Lantern | 15 | Captain |
| A fling in the barracks | 5 | Squire |
| Seen taken after a lost brawl | 10 | Commander |
| Hiding a deserter (Ash) | 30 | Never |

Below the safe rank the points add up; at **30** she loses a rank, 10 favour, and the talk starts over. At or above it they only grin (half the points, no demotion). Talk fades by 2 a day. **The Baron watches her harder at every rank**, so climbing makes getting caught likelier while making it matter less, until the one thing he never forgives: hiding Ash.

---

## 5. Ties to the story

- **Rhea** opens the ladder, gives the squad, votes with her once she has her doubts, and is the one who takes her badge on a demotion. Rhea always asks (STORY.md): she's the rule's soldier.
- **Ash** (STAFF.md: the deserter at her door, under a false name). As a soldier she can **hunt him** (favour +15, heat −2, `ashCaught`: he's gone), **hide him** (`ashHidden`: a standing scandal risk that's never safe), or, as **Captain with Rhea's doubts**, **clear his name** (`ashCleared`, respect +5, favour −5). This is a third road next to STAFF.md's hidden / given up.
- **Hikari** (STAFF.md: the summoned hero, broke, very good with a sword): on staff she teaches the drill (wider windows). Later a natural squad member or tourney rival.
- **Silas** (raiding his cave angers him), **Sabine** (the Velvet House raid ties into STAFF.md's poaching war), **Pell** (writes down her oath; reads her texts), **Sergeant Pike** (the Watch Canteen rival: his soldiers become hers).
- **The Baron:** the garrison is his. As Commander she picks the side: the toll-house raid takes his silver, and the garrison follows her into Act 3 (STORY.md: "she decides which side the garrison takes" moves from Rhea to her, with Rhea beside her).

---

## 6. Reeve of Tarven

`mayorEligible(state, facts)`: late game (act 3), a council seat (First in Tarven, end of Chapter 1), and then either **the Baron has fallen** (the town chooses its own Reeve) or she **wins the town vote** (over half, Respect 50; Commander adds a tenth). `becomeReeve` sets it. **Lady of the pass** (the Politics ladder's top) is for later.

### The Law board (first version)
All seven laws of `TOWN_DAY.md` §6.2, three levels each (0 tame → 2 wild). She inherits the **Baron's laws**: Ale tax High, Curfew Midnight, Dress code Relaxed, Public affection Kept private, Free use Off, State faith the Stone-Hearted, Brothels Licensed.

`passLaw(state, law, level, councilSupport)`: the council's support (0–100) must reach **50 + 10 a step (+10 to go fully wild)**; it costs **40 gold a step (+20 wild)** and a council favour a step, paid only when it passes. Every law moves the factions per step toward wild (e.g. Free use: devotees +20, soldiers +10, Oden −25, nobles −15, farmers −5); stepping back reverses it.

---

## 7. Build order (suggested)

1. Rhea's offer and the Volunteer badge; the drill UI (beat bar) and drill yard on the street; patrols as day panels. *(small)*
2. Tourney day (reuse the brawl Fight in the lists), the oath scene, the squad in the Staff-style menu. *(medium)*
3. Squad allies in brawls (they join on her side like the brawl crew), the sword bonus. *(medium)*
4. Raids with orders; scandal hooks from the feed, Lantern and defeat. *(medium)*
5. Voss's duel, the vote, garrison rules; the toll-house raid into Act 3. *(large)*
6. Reeve: town vote, the Law board UI, the town looking different under its laws. *(large; `TOWN_DAY.md` step 8)*

---

## 8. Consent

The rule at the top of `GAME_PATH.MD` holds:
- **Barracks flirting** (soldiers, her squad, Rhea) uses the normal touch rules: asked first with Consent on, all four answers, Pull away always works, too-drunk blocks yes. **Rhea always asks**, even with Consent off. A fling only becomes *scandal* after she said yes to it.
- A lost tourney duel or patrol fight is a brawl loss: the brawl-loss exception applies only as `GAME_PATH.MD` sets it (offer and continue/stop with Consent on).
- Laws like **Free use** and **Sex anywhere** follow the Consent switch for her (`TOWN_DAY.md` §6.3, still the user's to confirm): never while passed out, and the Baron is never a client.

---

## 9. Art needed (to do)

- **Her knight kits** per rank: volunteer's armband and padded jack; squire's half-plate; knight's full kit in the garrison's colours and badge (the knight kit exists: recolour and badge per rank); Captain's cloak; Commander's plume and cloak. Modern touches (a hoodie under the gambeson).
- **The drill yard** on the street (posts, targets, a beat-bar UI, Rhea's stand).
- **The tourney lists** (sand ring, banners, the crowd filming).
- **NPCs:** Commander Harlan Voss; the squad (Corporal Dunn, Grisha the orc, Wenna the fox beastfolk, Old Tobin, Sela Marsh) as garrison-kit variants.
- **Raid scenes:** the smugglers' cave, the Velvet House's door, the bandit camp in snow, the toll house.
- **The town hall** and the Law board panel; street variants per law (dress code, couples in the grass, devotees in red).
- **Icons:** rank badges (5), patrol and raid icons, scandal meter, squad order icons.

---

## 10. Not done yet

**Built:** signing up (by day, Settings › Knight); the drill as three menu choices (steady, rushed, sloppy) standing in for the beat bar; a patrol a day, its fight choices played as a real brawl (`startSideFight`: no till taken, no offer after); raids from Captain; the tourney once a week as a real one-on-one brawl; the oath; promotion with what's missing; the Captain's duel with the old commander (a brawl) and the squad's vote; the Commander's garrison rules (each day); rank effects (`brawlDamage` on her brawl damage, `heatPerNight` at bedtime while in favour, `respectPerWeek` each week); scandal fading by day; scandal rolls (`caughtChance`) on bold feed posts and streams, lit Lantern nights, and revel nights she does more than host; Reeve and the Law board (laws kept on her state). Saved as `TavernSave.knight`; records `knightRankBest`, `drillsPassed`, `knightPatrols`, `knightRaids`, `tourneyWins`, `scandalsCaught`.

**Not done yet:** the day-hours cost; squad allies inside `Fight`; the town faction moods and the town vote (`townVote` is 0, so Reeve needs the Baron to fall); act 3 (the ladder sees act 2 once Chapter 1's done); Rhea's doubts (the oath to the town and the vote's extra voice wait for them); Ash (`ashChoice`); what the laws do to the town; the `barracksFling` and `defeatSeen` scandals. The numbers are first guesses for balancing.
