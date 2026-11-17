# Staff: the people who work for her (plan)

**Status:** the rules and the mechanics are **built, art to come** (18 Nov 2026): `staff.ts` (roster, stats, a night, passives, stories, recruitment, perks), wired into `tavern.ts` (`staff`, `staffStage`, hiring, wages, `settleStaff` at the night's end, the cook, barmaid and doorman hooks, perks through `refreshEffects`, saved as `TavernSave.staff`), with a placeholder Settings › Staff menu (`menus.ts` `showStaff`). Not built yet: the HUD staff bar, portraits and models, staff orders on a night, poaching, the church recruiting staff, staff in brawls (beyond Old Soldier's numbers), and full story cards for the arcs (they're one-line choices in the menu for now). The Lantern's girls are still kept by `lantern.ts` and don't count toward the cap.

**Timing:** staff come in during the **mid game**, and their full systems open in the **late game**. Night 1 stays her alone behind the bar, so the early game keeps its focus. Holding staff back leaves room for more content later: every act adds people, jobs and stories.

Every staff member is an adult (18+) with a name, a face and a body of their own (the character-variety rule). Each one chose the work, is paid for it, and can refuse anything or quit. The consent rule (GAME_PATH.MD) covers them exactly as it covers her: the madam's choices are about **money, hours and protection**, never consent (as with the Lantern's house rules).

## 1. When staff come in

| Stage | When | What opens |
|---|---|---|
| **Early (act 1)** | Nights 1–5 | No staff. She works alone, learns the bar, and meets the people who'll ask for work later (as regulars, in town, or in the story). |
| **Mid (act 2)** | After the Baron's first visit, or once she can pay wages (gold 150+) | **Hire 1 or 2:** a barmaid or a cook, then a doorman. They have their basic stats and wages, and their personal story opens. The Lantern's girls (Tamsin first) are in this stage too, once the lantern is hung. |
| **Late (act 3)** | Act 3, or fame 60+ | **Full staff:** up to 6. This adds staff fame and fans, staff passives and titles, staff rivalries and romances, poaching by the Velvet House, the church recruiting your staff, and staff taking sides on the last night. |

## 2. The jobs

| Job | What they do on a night | KP / Tarven basis | Opens |
|---|---|---|---|
| **Barmaid / barman** | Takes orders and serves one side of the room. She covers the rest. | KP waitress, done by someone else | Mid |
| **Cook** | Keeps the stew and bread going. Stew stops burning while they're on. | Tarven's stations | Mid |
| **Doorman** | Throws out rough guests before trouble starts, and can step into a brawl. | STORY.md doorman's stool | Mid |
| **Girl** (the Lantern) | Takes bookings upstairs. | Built (Tamsin), STORY.md §12 | Mid (lantern hung) |
| **Dancer** | Dances on the bar for coin, so she doesn't have to (or alongside her). | Side work (`sidejobs.ts`) | Late |
| **Devotee** (church) | Leads a night service in the taproom. Draws church guests. | CHURCH_CONCEPT.md §7 | Late (church path) |
| **Clerk** | Lets the rooms and keeps the books. Hears secrets. | Side work (rooms), the Ledger | Late |

## 3. Their stats (shared by every staff member)

They're the same stats as the Lantern's girls, so one system covers everyone:

| Stat | 0–10 unless noted | What it does |
|---|---|---|
| **Skill** | 0–10 | How well they do the job: serves a minute, stew quality, how often the doorman stops a fight, satisfaction upstairs |
| **Appeal** | 0–10 | How much guests want them: tips, bookings, guests reaching for them instead of her |
| **Charm** | 0–10 | How happy guests leave: tips, fans |
| **Stamina** | 0–10 | How many nights in a row before they need one off |
| **Loyalty** | 0–100 | Whether they stay, stand with her, or walk to the Velvet House |
| **Corruption** | 0–100 | Drifts toward hers (the Lantern rule): honest, shady, crooked, rotten |
| **Resolve** | 0–10 | How slowly their corruption drifts |
| **Lewdness** | 0+ | Their own slut level, from their own nights, on the heroine's stages (sheltered, curious, willing, known) |
| **Fame** | 0–100 | **Their own fame** (new): how well known they are on the pass. Rises with good nights, a dance, a famous booking, a fight won at the door. Famous staff draw their own fans. |
| **Wage** | gold a night | What they're paid. Pay less and loyalty drops. |

**Growth:** each stat rises with use, like hers (`skills.ts`): a barmaid's Skill rises as she serves, the doorman's as he throws people out. Their fame rises with the stories told about them (gossip).

**Their own records and passives (late):** each staff member counts what they do (serves, bookings, fights, dances), and earns a few passives of their own, like KP's for Karryn. Examples: "Quick Hands" for a barmaid at 200 serves, or "Wall of the Door" for a doorman at 20 throw-outs. This is where a lot of late-game content can go.

## 4. Fame and fans

- **Staff fame** is shown on their card and in the dawn line. Famous staff bring in guests who come **for them**: the Girls fans tag for the Lantern, plus new tags such as **Food** for a famous cook, **Show** for a dancer, and **Safety** for a doorman.
- **Her fame and theirs:** a famous house lifts its staff a little each night, and famous staff lift the house. If a famous one quits, the house loses those fans to wherever they went (the Velvet House or the church).
- **Rivals poach** (late): the Velvet House offers more to staff with fame 50+ and loyalty under 50.

## 5. Their own struggles (each one's story)

Every staff member has a **personal arc of 3 or 4 beats**. Each beat is triggered by nights worked, loyalty, or a stat line, and played as story cards (`daystory.ts`, `plot.ts` beats), the way Tansy's and Wren's are. Each arc ends in one of two or three outcomes that change the staff member and the house. This is the content well: each new hire is a new story.

Ideas to start with (names and details are placeholders; fit them to WORLD.md):

| Who | Job | Their struggle | How it can end |
|---|---|---|---|
| **Tamsin** (built) | Girl | Came from the Velvet House, owes Sabine. Shady. | Stays and helps bring the Velvet House down; goes back to Sabine; or buys out her own debt and leaves free |
| **Maud** | Barmaid | Saving to buy back her family's farm from the Baron's tax man. Sends her wages home. | The farm saved (she leaves on good terms and sends farmers your way); lost (she stays, harder); or the heroine pays it off (loyalty for life) |
| **Corvin** | Cook | A gambling debt to the smugglers, who start leaning on the tavern. | Debt paid; Corvin skims the till to pay it (corruption); or the smugglers burn the kitchen (a brawl night) |
| **Ash** | Doorman | A deserter from the garrison, under a false name. The soldiers start to look at him. | Hidden for good; given up to the Baron (heat down, respect down, loyalty of the rest down); or he stands at the door on the last night |
| **Lysa** | Dancer | A runaway lord's daughter. Her family sends men to bring her home. | She goes home; she stays and is disowned; or her family pays the tavern to look after her (gold, and a noble patron) |
| **Brother Wynn** | Devotee | Torn between Oden's chapel and Veyra's church. | Back to the chapel (Oden's ally); deep into the church (a priest who recruits from your bar); or he leaves town |
| **Pip** | Clerk | Writes everything down, including other people's secrets, and sells some. | Your best informant; caught by the Ledger's enemies; or turned honest |

Each arc should also touch the core systems: wages, loyalty, heat, fans, gossip and secrets, so it's part of play rather than a side story.

## 6. Staff on a night

- **The card:** a staff bar on the HUD (`hud.ts`) with each one's portrait, job, stamina, mood (happy, steady, worn out, resentful) and fame.
- **Orders she can give** (mid): their station; "take a break"; "cover the door". In the late game they'll also take "handle that guest" and "keep an eye on that table" (secrets).
- **Guests and staff:** guests can reach for staff as well as her, and staff answer for themselves (a staff no ends it, the same as Tamsin). A staff member who's reached for may call her or the doorman, which can start a brawl the heroine joins.
- **In brawls (late):** a loyal doorman or barman can join on her side, KP-style, as an ally with a turn of their own.
- **Dawn line:** each one's takings, mood, loyalty, fame change, and any beat of their story that's due.

## 7. How staff tie into the brothel and the church

- **The Lantern:** the girls are staff with the job "Girl". Everything in STORY.md §12 still applies: the house rules (the cut, rough guests, rest, drunks), the corruption drift, the tiers, and the Velvet House. This plan only adds fame, a story arc and the shared card.
- **The church:** a late-game staff source, and a threat to her staff. Devotees can be hired to lead night services. Her own staff can be **recruited by the church** over a few visits, each one choosing every step (CHURCH_RECRUITMENT.md stages 1–3). A recruited staff member's look and lines change, and their loyalty splits between her and the church.
- **One staff system for all three paths** (keeper, Lantern, church): the paths just open different jobs.

## 8. Code plan (when it's time)

1. **`staff.ts` (pure rules):**
   - `StaffMember` holds the stats above, plus `job`, `arc` (the beat reached), `records` and `passives`.
   - `STAFF_ROSTER`: the people who can be hired, with their starting stats and arcs.
   - Functions: `hire`, `wage`, `nightFor(member, night)`, `drift`.
   - Move Tamsin's numbers in from `lantern.ts` so both use the same type.
2. **`tavern.ts`:** `staff: StaffMember[]`, saved as `TavernSave.staff`, with older saves loading with none. Give each job its own hook: a barmaid takes orders from her side of the room (`guests` with `servedBy`), the cook keeps the stew from burning, the doorman checks each rough guest before trouble starts.
3. **`staffarcs.ts`:** each arc's beats, as story cards.
4. **UI:** a "Staff" page in the journal (hire, wages, orders, each one's story so far) and a staff bar on the HUD.
5. **Art (later, POSES_TODO.md):** a model per staff member (the character-variety rule), work outfits per job, and their portraits.
6. **Tests:** `tests/staff.test.ts`.

## 9. The brothel and church plans, checked

**The Lantern (brothel):**
- **Built:** Stage I is built and consistent: the lantern, one room, Tamsin, the house rules, the corruption drift and the dawn line.
- **Already listed in STORY.md as not built:** the doorman, the licence, more rooms and girls, girl passives, and tier behaviours.
- **Covered by this plan:** the doorman (a staff job), more girls (the roster), and girl passives and fame (§3–4).

**The church (CHURCH_CONCEPT.md, CHURCH_RECRUITMENT.md, GODS_LORE.md):**
- **Status:** lore and plan, not built.
- **Fits:** it sits well beside the Lantern as a sister path, and its recruit stages (0–3) can reuse the staff stats: a recruit is a townsperson with stage, lewdness and corruption.
- **One thing to fix before building it:** CHURCH_CONCEPT.md's pitch says devotees become "always available", and §8 says high-rank devotees "live by the church's rules (outfits, toys, availability)". That clashes with the rule the Lantern and this plan use: anyone can refuse anything, and can leave. Write "availability" as **the church's expectation and their choice to meet it**, with refusing still possible (and costing them standing in the church), so all three paths follow one rule.
- **Missing:** a "chapel standing" stat (GODS_LORE.md notes it isn't one yet), and the Warm House as a place in town (TOWN_DAY.md). Both are needed before church staff can come in.

## 10. Recruitment [built]

Two ways in (`staff.ts`, wired in `tavern.ts`, shown in Settings › Staff):

1. **Random applicants.** From the mid game, a notice brings 3 applicants (`rollApplicants`), fresh every 3 nights, or now for a 5 gold posting fee (`postForWork`). Each is an adult (18 to 45) with a made-up name, a job open at the stage (never "girl": the Lantern takes its own), and a **rarity**: Common 60%, Uncommon 25%, Rare 10%, Epic 4%, Legendary 1% (`RARITY_ODDS`). Rarity sets the stat range (`RARITY_STATS`, 2-5 up to 6-9) and the perk: Common none, Uncommon a 20% chance of a small one, Rare one good one, Epic one strong one, Legendary a legendary one (`rollPerk`, `STAFF_PERKS`).
2. **Friends.** The named roster only works for a friend: friendship 5 (`FRIEND_AT`). For now it's raised in the Staff menu ("Spend time with...", +1, once a day each); story contact and regulars' visits should raise it later. Each friend has a rarity (mostly Epic or Legendary) and a **perk of their own** (`FRIEND_PERK`): Tamsin Velvet Know-how, Maud Farm Friends, Corvin Smugglers' Prices, Ash Old Soldier, Lysa Noble Patrons, Brother Wynn Two Faiths, Pip The Ledger, and the newer friends' below.

Perks act while that person is working (stamina left): through `Effects` in `refreshEffects`, or nightly (house fame and fans) in `settleStaff`. The cap still applies to both ways in, and the Lantern's girls stay off it.

## 11. The newer friends [built, art to come]

Eight more friends, mostly women, from the peoples of WORLD.md §7. Each has a 3-beat story in `STAFF_ARCS`.

| Who | Job | Opens | Rarity | Their perk | About |
|---|---|---|---|---|---|
| **Sylvie Ashleaf** (112, woman, elf) | cook | late | Epic | Herbal Tonics | An elf herbalist who left the Sylvaran courts for a kitchen. Brews tonics for the bar and won't say why she needed to leave. |
| **Brunhild Copperkeg** (46, woman, dwarf) | barmaid | mid | Legendary | Deephold Cask | A dwarf brewer with her own cask recipe and a grudge against every brewery in the Deephold that turned her down. |
| **Grukka** (31, woman, orc) | doorman | mid | Epic | Tusked Welcome | An orc woman from the Khanate of Grask, done with selling her sword in the east. Blunt, loud, and very good at the door. |
| **Mirri** (24, woman, beastfolk (cat)) | dancer | late | Epic | Nine Lives | A cat-folk dancer from a Wildmarches river town. Proud, quick, and dancing her way across the kingdoms for coin. |
| **Hikari** (22, woman, human (summoned hero)) | doorman | late | Legendary | Hero's Luck | A hero summoned from another kingdom for a war that ended without her. Broke, a long way from home, and still very good with a sword. |
| **Edda Thornwick** (39, woman, human) | clerk | late | Rare | Needle and Thread | A seamstress widowed by the war in the east. Keeps neat books, mends everything, and makes outfits that sell. |
| **Clara Vane** (21, woman, human) | barmaid | mid | Rare | Service Manners | A lady's maid who ran from a noble house with nothing but her manners. Those manners are worth a lot behind a bar. |
| **Snik Brassvoice** (30, man, goblin) | dancer | late | Epic | Tavern Songs | A goblin bard with a voice far bigger than he is and a phone full of songs. Plays for the room; everything's a deal. |

**Looks, for the art (POSES_TODO.md):**

- **Sylvie Ashleaf** (elf): Tall and willowy, long pale-gold hair in a loose braid, pointed ears, a leaf-green apron over a modern linen shirt, sprigs of herbs at her belt.
- **Brunhild Copperkeg** (dwarf): Short and very broad, adult and strong, copper hair in two thick braids, freckles, rolled sleeves over brawny arms, a leather brewer's apron.
- **Grukka** (orc): Big and heavily muscled, grey-green skin, small tusks, a shaved side to her black hair, a sleeveless studded jerkin and a scar across one arm.
- **Mirri** (beastfolk (cat)): Lithe, black cat ears and a long black tail, short dark bob, gold anklets and a cropped dancer's top with a wrap skirt.
- **Hikari** (human (summoned hero)): Athletic, short silver-white hair, bright blue eyes, a battered hero's coat over a modern hoodie, a sword she can't afford to sharpen.
- **Edda Thornwick** (human): Soft and curvy, chestnut hair pinned up with needles, reading glasses on a chain, a black dress with a measuring tape round her neck.
- **Clara Vane** (human): Petite and neat, strawberry-blonde hair in a tidy bun, a black maid's dress she's cut shorter, white cuffs and collar.
- **Snik Brassvoice** (goblin): Short and wiry but plainly grown, green skin, big ears with brass rings, a sharp grin and stubble, a patched waistcoat and a lute covered in stickers.
