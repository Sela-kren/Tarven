# The Adventurers' Guild Hall

> **Rating: Adults only (18+).** Every adventurer, companion, hero and monster-hunter is an adult. The heroine follows the consent rule in `GAME_PATH.MD`.
> **Status: rules and placeholder menus built, art to come (2026-11-18, the user's idea).** Rules: `src/game/guild.ts` (tested in `tests/guild.test.ts`). Wired into `tavern.ts` (`joinGuild` at 300 fans, `guildQuests`, the party, `guildRun`, `guildPromote`, the guild master's counter, cut and hall days) and saved (`TavernSave.guild`), tested in `tests/guildwiring.test.ts`. Played from **Settings › Guild** for now. Not built: the hall's scene, the board and party panels, the expedition screens, fights as real brawls. Ties: `WORLD.md` §10 (the guild), §7c (heroes), §12 (monsters); `TOWN_DAY.md` §5 (guild work) and §6.1 (the Adventurer career); `STAFF.md` §11 (the friends who can join her party).

---

## 1. The hall, as a place in town

The guild's **branch office in Tarven** is a long hall off the high street, next to the garrison yard: a counter with a bored clerk, the **quest board**, a trophy wall (a slime in a jar, a troll's tooth), benches where parties sit waiting for work, and a back room where loot is weighed.

- **Before she joins** it's a place to look at. Adventurers drink at her bar and talk about it.
- **Kestrel Vey opens it** (`TOWN_DAY.md` §6.1): once the tavern has **300 fans** (`JOIN_FANS`), Kestrel brings her a guild card. Her C-rank party is the model of what she could become, and later a rival.
- **The tavern becomes the adventurers' hangout.** Some quests are **posted at her own bar** (`atBar` on a quest), parties celebrate a rank-up at her tables (big tips, big Lust) or come back hurt and broke. Later, **the guild counter moves into her tavern** (WORLD.md §10), which is one of the conditions for Guild master.
- **Time:** a quest costs day hours like any town job (`hours`, out of her nine). Big quests take **days** (`days` 2 or 3): she's away overnight, and the tavern only opens if her staff run it (`STAFF.md`).

---

## 2. Ranks

A guild card, F to S, with **Unranked** before she joins. One rank at a time (`promoteGuild`): points, quests done, brawl wins and fans, and a legend's deed for S.

| Rank | Points | Quests | Brawl wins | Fans | Companions | Career rung |
|---|---|---|---|---|---|---|
| Unranked | – | – | – | – | 0 | – |
| **F** | 0 | 0 | 0 | 300 (joining) | 1 | **Hired blade** |
| **E** | 100 | 3 | 0 | 300 | 2 | Hired blade |
| **D** | 300 | 8 | 3 | 400 | 3 | Hired blade |
| **C** | 700 | 15 | 8 | 500 | 3 | **Party leader** |
| **B** | 1,500 | 25 | 15 | 700 | 3 | Party leader |
| **A** | 3,000 | 40 | 25 | 1,000 | 3 | Party leader |
| **S** | 6,000 | 60 | 40 | 1,500 + a legend's deed | 3 | Party leader (a legend) |

**The TOWN_DAY ladder, mapped:** F to D she's a **Hired blade** (she tags along with fewer companions), C to A a **Party leader**, and **Guild master** is a post on top, not a rank (section 8). Brawl wins come from her tavern brawls: WORLD.md §10 says her rank is jobs and brawl wins on a card.

Each rank also sets the **check difficulty** of its quests (`RANK_DC`: F 9 up to S 21).

---

## 3. The quest board

She sees **quests of her rank and below, and one rank above** (the isekai rule: you may reach, the guild won't stop you). Five at a time, shuffled each day (`questBoard`). The bar's own board only shows quests the adventurers post there.

| Type | What it is | Examples (`QUEST_TEMPLATES`) |
|---|---|---|
| **Gather** | Fetch something from somewhere unpleasant | Moonwort for the chapel (F), slime jelly for the Warm House (E) |
| **Hunt** | Kill a monster | Rats in the Copper Bell's cellar (F), boars below the quarry (E), frost wolves (D), the snow troll (A) |
| **Escort** | Get a merchant or an envoy over the pass | Mara's turnips (F), a goblin merchant (D), Baroness Varn's envoy (B) |
| **Dungeon** | Clear a floor of the north road ruins | Floor one for Kestrel (C), floor three (B), the deep vault (S, a legend's deed) |
| **Bounty** | Bandits and smugglers | Smugglers on the quarry road (D, garrison), Corran Black's outriders (C) |
| **Odd jobs** (comedy) | The guild's least proud postings | Find Gerald the goat again (F), Kevin's lost holy sword (E), a monster for Zane's feed (C) |

Seventeen quests in all, at least one of every rank. Gold, points and loot grow with rank. Some quests have **dirty options** (take a cut and look away, grab it back by force) that pay in gold and **corruption** and cost points.

---

## 4. Her party

She can take **up to 3 companions** (fewer at F and E). Each has a **role**, a **power** for fights, a **skill** (1 to 5) for their role's checks, and **loyalty**.

| Role | What it does |
|---|---|
| **Fighter** | Full power in every fight |
| **Healer** | Stamina back after each fight, fewer injuries, and a day off every injury on the road home |
| **Scout** | The path, the traps, and the first move in fights (+2 power) |
| **Mage** | Mind checks; twice the power against things weak to magic, half in the ruins (spells sputter there, WORLD.md §11) |

**Her friends** (`FRIEND_COMPANIONS`, from the staff roster):

| Friend | Role | Their trick |
|---|---|---|
| **Hikari** (summoned hero) | Fighter | *Hero's Luck*: the party's first failed roll is tried again |
| **Grukka** (orc) | Fighter | The strongest arm she can get for free |
| **Ash** | Fighter | *Deserter*: won't touch garrison postings |
| **Sylvie Ashleaf** (elf) | Healer | Her tonics |
| **Mirri** (cat-folk) | Scout | *Nine Lives*: never injured |
| **Snik Brassvoice** (goblin) | Mage (a bard's songs) | *Tavern Songs*: films the quest, +5 fans |

**Hired adventurers** (`hireAdventurer`): any role, off the guild's bench, stats and fee by rank. The fee is paid win or lose.

**Loyalty:** a success +4, a partial +1, a failure −3, hurt on her watch −2 more. Under 15 they leave her party (staff friends stay at the tavern; the party is a separate question). Companions are friends or paid professionals: her choices about them are money, risk and care, never their consent.

---

## 5. Expeditions

A quest is a **short chain of encounters**, played in order (`runExpedition`):

- **Fights.** Auto-resolved for now (party power against the foe's), and flagged **`useBrawl: true`** with a `brawlKind` for people, so the game can later play them as a real brawl in `fight.ts` and feed the result back. Fights cost her stamina; at nothing she **collapses** and the quest fails.
- **Checks.** Her stat level, plus twice the skill of her best companion of the right role, plus a d10, against the quest rank's difficulty. **Roles matter**: a herb check she'd fail alone, Sylvie passes easily.
- **Choices.** The player picks an option (some are checks, some are fights, some just happen with gold, points, fans or corruption).
- **Rival parties.** On E and above, now and then (15%) a rival party (the *Silver Spurs*, working name) cuts in before the last encounter: talk them into splitting it (Charm), race them (Agility), or settle it with fists.

**Outcome:** win the last encounter (the boss) with at most one failure along the way: **success** (full gold, points, loot). Win it with more failures: **partial** (half). Lose it, or collapse: **fail** (no gold, and a quarter of the quest's points off her card). Fights won drop their own loot (monster parts for the market and the menu, WORLD.md §12).

**Fame:** successes bring **fans** (adventurers who heard about it) and **guests tonight**: the party drinks at her bar.

---

## 6. Dangers

- **Injuries** (`INJURIES`): bruised (Strength −1), a twisted ankle (Agility −1), a cracked rib (Endurance −2), a black eye (Charm −1: every guest asks), a rung bell (Mind −2). They last 1 to 3 days, as debuffs on her levels (and her companions'). A healer cuts the chance and the days.
- **Losing to people** (bandits, smugglers, a rival party, the Baron's men): she can be **taken** (`captured`). This is handled **exactly like a lost brawl** under `GAME_PATH.MD`: Consent on, it's offered, with a final continue / stop choice; Consent off, it's KP's defeat. Never while she's passed out. Her party or the guild gets her out by morning, and the loot is gone.
- **Losing to monsters** never ends that way: she's dragged home hurt.
- **Rival parties** take her quests, her fans, and sometimes swing first.

---

## 7. Ties to the rest of the game

- **Kestrel Vey** opens the guild, posts the first ruins quest, and decides whether she can be Guild master (her word with the lowland hall). Later a friend, a rival, or a route.
- **The heroes** (WORLD.md §7c) post the comedy: Kevin's lost sword, Zane's monster video. Hikari, a hero summoned for a war that ended without her, fights at her side. A guild master can sponsor a Hero.
- **The tavern** is the adventurers' hangout: quests at her bar, celebrations, the counter.
- **The Knight path** (`knight.ts`, being built): the garrison posts bounties at the guild, so a knight and a guild member can be the same woman, or rivals. Ash won't go on garrison work. Which way it leans (alliance or rivalry) is the user's call.
- **Silas** and the smugglers: a bounty on the quarry road can be taken in, or looked away from for a cut (corruption, and Silas hears she was reasonable).
- **Baroness Varn and Corran Black**: the outriders and the envoy feed the Act 3 plot.
- **Adult flavour** stays under the consent rule: celebrations at her bar, companions' routes (all adults), Zane's feed, being taken after a loss (the brawl-loss rule).

---

## 8. Guild master (late game)

`guildMasterEligible`: **A rank or higher, 4,000 points, 50 quests, the guild counter in her tavern, and Kestrel's word.** S rank isn't needed: they pick a master to run things.

As master she runs the hall by day:
- **The quest cut** (`QUEST_CUTS`): low (5%, adventurers love her hall), fair (10%), steep (20%, gold in the chest and grumbling at the board).
- **Recruiting** (`RECRUIT_DRIVES`): free drinks at her bar, riding out on the ruins road, poaching a rival party (they won't forget), or sponsoring a Hero (Kevin will sign anything with a free lunch in it).
- `hallDay` gives the day's take, the adventurers' mood and the recruits.

---

## 9. To do

**Code:**
- Done: joining at 300 fans; the board (one quest a day, by day); her party (staff friends at their staff loyalty, hired hands for one quest); expeditions with the tavern's dice; gold, points, fans at dawn and adventurers tonight, corruption, loyalty to staff friends, who leaves; her injuries taking levels off a stat for their days (companions' are recorded only); promotion; the guild master (a counter at her bar, 100 gold at A rank, then the cut and hall days). Saved as `TavernSave.guild`; records `questsDone`, `questsFailed`, `guildRankBest`, `captures`.
- Still to do: choices on the road (they take their first option); the day-hours cost and overnight quests; a captured ending is a log line, a bruise and the `captures` record, not yet the brawl-loss offer; loot into the market and menu.
- The hall scene on the high street and its counter; the board and party panels; the expedition screen (encounter by encounter, with choices).
- Wire fights with `useBrawl` to `fight.ts` (`new Fight(guestId, brawlKind, false, stats, random, rolled)` for people; monsters need their own foe kinds or a stand-in).
- Apply results: gold, points, loot (market and menu), injuries as debuffs (`debuffs.ts`), loyalty to staff, fans and guests tonight, the `captured` defeat through the brawl-loss rule.
- Save the guild card (rank, points, quests, deed) and companions' injuries.
- A hall for the guild master; a rival hall.

**Art needed:**
- The guild hall: exterior on the high street, interior (counter, board, benches, trophy wall).
- Quest board cards, one per type; the guild card itself (F to S).
- Her adventurer outfit (modern-and-armour, WORLD.md), one per career rung.
- Companions in their adventuring kit: Hikari, Grukka, Ash, Sylvie, Mirri, Snik; hired adventurer looks per role.
- Monsters: cellar rats and the rat king, giant spider, boars and Old Tusker, slimes, pass and frost wolves and the white wolf, ghouls, old guardians, the Warden, the snow troll, the vault's guardian.
- Kestrel Vey and her party; the Silver Spurs; the guild clerk.
- Places: the ruins (floors one and three, the vault), the pass, the quarry woods and road.
- Injury looks (black eye, bandages, limp).
