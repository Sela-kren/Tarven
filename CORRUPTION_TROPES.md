# Corruption tropes: how each stage of the fall is written (plan)

**Status:** "When it's built" is built (18 Nov 2026). `tropes.ts` holds the `TropeId`s (one per trope in the table, with rationalisation and blackmail kept apart), the five beats and the `StageCard` type. Every stage change now has a story card tagged with its trope and beat, told once on the dawn report: her lewdness arc (`ARC_CARDS` in `lewd.ts`: her `ARC_DAWN` line kept first, then the trope's beat and a closing Consent-on or Consent-off line, plus the Aftermath card the morning after Known, fair or rotten by her corruption); her corruption tiers (`CORRUPTION_CARDS`, Shady, Crooked, Rotten, saved as `story.tier`); staff tier changes (`staffTierCard` in `staff.ts`, the trope picked by who's pushing: the madam, Sabine for Tamsin, the church for Wynn and devotees, the smugglers for Corvin); and the Lantern girls' tier changes. Her touch lines (`flavorLine`) keep every written line and add trope-voiced asides at Curious, Willing (half the time) and Known. Staff lewdness now sits on her four stages (`staffStage`), with each roster person's own line at every stage (`STAFF_STAGE_LINES`, by job for applicants), a stage card the first morning of each one, the stage on their dawn line and the Staff menu, and a per-stage look key (`staffLook`, no art yet). Cards are only words: they start nothing, so the consent rule holds unchanged. Staff lewdness rises in play from each one's own work (`lewdWork`, recorded at bedtime in `tavern.ts` `settleStaff`), so their stage cards fire, and staff have a Rotten tier (95+, `STAFF_ROTTEN`) with one card per pusher; both are under "Staff and the Lantern's girls" below. The open question is answered and built (18 Nov 2026): **Legend**, a lasting comic stage past Known, with a way back (below, "Legend"). Still not built: a way back from the lower stages and from corruption tiers. This is the rule for writing a corruption stage from now on. Whenever someone moves up a stage (the heroine, a staff member, a Lantern girl, a church recruit), the change is written with one of the manipulation tropes below. That's how corruption and mind-break manhwa do it: the fall happens because someone pushes, step by step. It doesn't just happen when a number goes up.

Every character is an adult (18+). The consent rule (GAME_PATH.MD) covers every trope here:
- **Consent on:** each step is a choice she (or the staff member) can turn down, and Stop always works.
- **Consent off:** it plays by the Consent-off rules.
- **Either way:** nothing happens while anyone's passed out, and nobody roaring drunk takes part.

The tone stays Tarven's: crude, absurd adult comedy (WORLD.md). The tropes are played for heat and laughs, not horror.

## Two meters, two directions

| Meter | What it measures | Who uses the tropes |
|---|---|---|
| **Lewdness** (her mind stage; arc Sheltered → Curious → Willing → Known, `lewd.ts`) | How far her body and appetite have gone | **Others use them on her**: the Baron, Pell, Sabine, the church, regulars |
| **Corruption** (Honest → Shady → Crooked → Rotten, STORY.md §8) | What she does to people | **She uses them on others**: staff, guests, rivals |

Staff and the Lantern's girls have both meters too (`staff.ts`). Their corruption drifts toward hers, and their lewdness comes from their own nights, so the tropes reach them both ways.

## The tropes

| Trope | What it is | Tarven's version |
|---|---|---|
| **Corruption** | Innocence wears away until she takes on the pusher's wants | The whole arc: the shy granddaughter becomes the pass's most notorious hostess |
| **Conditioning / training** | Rewards and punishments repeated until the behaviour is automatic | Tips, cheers and fans for every bit more she shows; regulars "training" her like a house rule; the passives that make the next time easier |
| **Love bombing → devaluation** | Lavish praise first, then it's pulled away to keep her chasing it | Sabine courting a staff member, then dropping her; a rich regular who adores her, then goes cold until she does more |
| **Rationalisation / blackmail** | Outside pressure plus "this is what you really wanted" | Photos as leverage (WORLD.md); Pell reading her messages; the debt; "you asked for this, remember?" |
| **Gaslighting** | Making her doubt her own memory or judgement | Pell's version of last night beats hers; the whole room insists she offered |
| **Isolation** | Cutting off friends and ways out, so the pusher is all she has | Respectable people stop coming (the Tansy callback); Wren's letters stop; a staff member's family disowns her (Lysa) |
| **Trauma bond** | Attached to the one who is both the trouble and the comfort | A regular who starts the brawl and then patches her up; the Baron as cruel patron |
| **Brainwashing / mind control** | Beliefs and wants rewritten outright | The Church of Veyra's recruitment stages (CHURCH_RECRUITMENT.md); later, a literal charm or potion |
| **Mind break** | Her sense of self cracks and she wants the new role | **Legend**, the lasting stage past Known, played for laughs: cheerfully shameless, the room chanting her name. Plus the "broken" voice at 0 willpower in a fight and the "lost" face |

## How a fall plays out: five beats

Every arc built with these tropes (hers, a staff member's, a recruit's) runs through the same five beats. A stage change is where one beat ends and the next begins.

| Beat | What happens | Tarven's version | The game mechanic behind it |
|---|---|---|---|
| **1. Setup** | She's put somewhere she can't easily leave | Grandma's debt, Pell's collections, the Baron's toll, a photo, a staff member's own trouble (Corvin's debt, Ash's false name) | The debt and heat already in the game |
| **2. Erosion** | Small compromises; rewards for going along, costs for saying no | Tips, fans and cheers for going along; walkouts and lost fans for saying no | Gold, fans, desire and the passives that lower the bar next time |
| **3. Internalisation** | She starts to expect what they want, feels shame for saying no, calls it her own choice | Curious and Willing lines: *"(I shouldn't want this.)"*, *"(I didn't hate any of it.)"* | Arc stage lines (`ARC_DAWN`, `flavorLine`), her face going from strained to pleased |
| **4. Break** | Her old self gives way: "I was always like this" | Known: *"(They'll be back tonight. They always are.)"*; a staff member's honest → crooked card | Known / filthy stage; staff tier change |
| **5. Aftermath** | Full acceptance, a relapse, or (rarely) getting free or getting even | Acceptance (new titles and passives), a relapse (nights off, then she slips again), or a way back / revenge (below) | Endings, the way back, victims coming back |

**The concepts behind the beats, and where they live in the game:**

- **Operant conditioning** (rewards and punishments shape behaviour): gold, fans and passives as rewards, walkouts and debuffs as punishments. It drives the Erosion beat.
- **Cognitive dissonance** (the mind invents reasons to ease the conflict): her inner lines justifying it ("full purse", "respectable, I believed it"). It's the voice of the Internalisation beat.
- **Learned helplessness**: saying no costs more each time (the Overwhelmed debuff, the debt piling up), so she stops trying. It sits between Internalisation and Break.
- **Identity foreclosure** (the old self is dropped): her old lines stop appearing, her look and title change, and the Tansy callback ("I told Tansy that. I believed it."). This is the Break beat.

These are storytelling tools for the fiction, not real psychology.

## Her fall (lewdness), stage by stage

Each step up gets one story card, her dawn line (`ARC_DAWN`) and her touch lines (`flavorLine`) in that trope's voice.

| Step | Trope that drives it | Who | How it reads |
|---|---|---|---|
| Sheltered → Curious | Conditioning, love bombing | Regulars, the room | Every slip pays; a regular can't stop praising her. *"(I keep thinking about last night. I shouldn't.)"* |
| Curious → Willing | Rationalisation, blackmail | Pell, a photo | A photo turns up. "You wanted it, everyone saw." She starts to believe it. |
| Willing → Known | Isolation, trauma bond | The town, one regular | The respectable crowd goes, the wild one stays, and he's the one who looks after her |
| Known → Legend | Mind break, brainwashing (Aftermath beat) | The room, its chant | Three wild nights and the taproom chants her name; there's a song, a second verse and a drum. *"(Shame? Never heard of her. Did she work here?)"* She can come back (below) |

## Legend: the stage past Known (built)

The answer to the open question: **yes, a lasting top stage, and it's comedy.** The mind break here isn't her breaking down, it's her shame wandering off and never coming back: she's cheerfully shameless, the whole taproom chants her name, there's a song with a filthy second verse and a drum, and she takes a bow with nothing on to bow in. The chant is the brainwashing (the room tells her who she is, loudly, in rhyme). It sits on the **Aftermath** beat: full acceptance, but one she can still walk back from.

| | Her | Staff | A Lantern girl |
|---|---|---|---|
| **Needs** | Known, Lewdness 160+ (`LEGEND_AT`) | Known, lewdness 140+ (`STAFF_LEGEND_AT`) | Same as staff, on her own lewdness |
| **Rises after** | 3 wild nights in a row (6+ touches let) | 4 nights worked in a row | 4 lit nights in a row with 2+ bookings |
| **Comes back after** | 3 quiet nights in a row (willpower kept above half, at most 1 touch let); a chapel day counts one more | 2 nights off in a row | 2 nights off in a row |
| **Cards** | *The chant* (first rise), *By popular demand* (each rise after), *Even legends have nights off* (coming back) | *Name: Legend*, *Name: nights off* | the same as staff |

- **The way back is the doc's own:** conditioning is broken by nights off, brainwashing by the chapel. Coming back is written as remembering it's a choice, not as shame returning, and she can rise again.
- **What it changes:** words and flavour only. Her touch asides, her dawn cards and consent lines, town talk, a few town places, the stage name (Force bar, journal), staff and girls' lines and look key (`house_legend`), and three passives (*Tarven's Legend*, *By Popular Demand*, *Even Legends Rest*). It changes no check: Consent on still asks, Stop always works, too drunk still blocks every yes, and nothing happens to anyone passed out.
- **Where it lives:** `legendStep`, `herLegendNight`, `LEGEND_*`, `ARC_CARDS.legend`, `LEGEND_ENCORE`, `LEGEND_BACK` in `lewd.ts`; `Tavern.legendDawn` (saved as `story.legend`; older saves load as never a Legend); `staffLegendStep`, `staffLegendBackCard` in `staff.ts`; the Lantern's `endNight`. Tests: `tests/legend.test.ts`.

## Her corruption tiers: what she does to others

| Tier | Tropes she can use | Example |
|---|---|---|
| **Honest** (0–39) | none | Her word is good |
| **Shady** (40–79) | Love bombing, rationalisation | Charms a regular dry; "everyone has a price" |
| **Crooked** (80–149) | Blackmail, isolation, conditioning | Blackmails a client (already in the Ledger); keeps a girl from the Velvet House; trains her staff with perks for "a bit more" |
| **Rotten** (150+) | Gaslighting, trauma bond, brainwashing | Feeds recruits to Veyra's church; rewrites a rival's story; staff who can't leave her |

Each use is a Ledger deed with a named victim, and **victims come back** (STORY.md §8).

## Staff and the Lantern's girls

- **Corruption tier changes** (honest → shady → crooked → rotten) each get a story card with a trope, chosen by who's pushing:
  - **The madam (her):** conditioning, isolation
  - **Sabine (the Velvet House):** love bombing → devaluation (this is how poaching works)
  - **The church:** brainwashing, rationalisation (CHURCH_RECRUITMENT.md stages)
  - **The smugglers:** blackmail (Corvin's debt)
- **Rotten (staff: 95 and up, `STAFF_ROTTEN`).** Their corruption is 0 to 100, so their rotten comes sooner than hers (150). It drifts a tenth of the gap toward the madam's a night, so it only gets past 95 under a madam above 95 (well into her crooked, or rotten herself), or with greedy rules adding 3 a night each: under a madam of 120 a crooked barmaid (resolve 5) is rotten in about a week; under a madam of 80 with fair rules, never. The card is the Aftermath beat, on her own Rotten tropes, played for laughs: they've learned the house's tricks and play them on her. A Lantern girl gets the same card at her own rotten (150).

  | Pusher | Tropes | Card | What they do |
  |---|---|---|---|
  | The madam | Trauma bond, gaslighting | *You said I could* | Takes the candlesticks home ("You said I could. Tuesday."), sells the stew recipe to the Copper Bell, then cries on her shoulder till she says sorry |
  | Sabine | Trauma bond, gaslighting | *Sabine's little bird* | Sabine writes back; they sell Sabine the guest list and swear she never kept one |
  | The church | Brainwashing, gaslighting | *Veyra's bookkeeping* | Tithes the till, recounts the takings till she agrees there was less, and purges the Copper Bell's keeper with a laxative |
  | The smugglers | Gaslighting, trauma bond | *There were always fifteen* | Broken finger, then a pie; runs the smugglers' casks through her cellar and insists the extra barrels were always there |

- **Their lewdness** sits on the heroine's stages (sheltered, curious, willing, known), with each person's lines and look changing at every stage. It's worked out from their records (`staffLewdness`): 1 for every 3 bookings, 1 for every 5 dances, 1 for every 3 gropes (hands on them at work, `records.gropes`), and 1 for every revel night worked (`records.revels`). Each night worked, the tavern adds their job's lewd work (`lewdWork`, rates in `JOB_LEWD_WORK`): a set number of gropes, one more for every few hands that reached for the keeper tonight (a handsy room is handsy with everyone), and the dancer's dances. On a revel night everyone on gets a revel, and the dancer dances 2 more. Older saves load the new records as 0.

  | Job | Gropes a night | +1 per hands on her | Dances | A handsy night (4 hands): lewdness |
  |---|---|---|---|---|
  | Girl (working the floor; her bookings are the Lantern's to count) | 3 | 2 | 0 | 1.7 |
  | Dancer | 1 | 4 | 3 | 1.3 |
  | Barmaid | 1 | 2 | 0 | 1 |
  | Doorman | 0 | 3 | 0 | 0.3 |
  | Devotee | 1 | never | 0 | 0.3 |
  | Cook | 0 | 6 | 0 | 0 (0.3 in a wild room of 6) |
  | Clerk | 0 | 6 | 0 | 0 (0.3 in a wild room of 6) |

  That's in line with the Lantern's girls (STORY.md §12): a girl on 2 bookings a night makes about two thirds of a point, more when she enjoys them. A groped barmaid is Curious (20) in about 20 handsy nights; the cook may never get there.

## Who uses which trope

| Character | Tropes |
|---|---|
| **Baron Hesk / Pell** | Blackmail, coercion, gaslighting (Pell reads every phone message) |
| **Sabine** | Love bombing → devaluation, isolation |
| **The Church of Veyra** | Conditioning, brainwashing, rationalisation ("Veyra only asks what you need") |
| **Regulars** | Conditioning, trauma bond |
| **Her** | Any of them, once Shady or worse |

## The way back

Like corruption (STORY.md §8), every trope can be broken, at a cost:
- **Isolation:** broken by a friend getting through (Wren's letter, Oden, Tansy).
- **Blackmail:** broken by getting the photo or the book back.
- **Conditioning:** broken by nights off.
- **Brainwashing:** broken by the chapel.
- **Legend** (mind break): broken by quiet nights, and the chapel helps (built; see "Legend" above).

With Consent on, she can refuse at every step.

## When it's built

1. Tag each stage-change story card with a trope id.
2. Write the dawn lines, touch lines and staff dawn lines in that trope's voice.
3. Put staff lewdness on her four stages, with lines and looks for each.

## Open questions

- ~~**A mind-break top stage:**~~ Decided 18 Nov 2026: yes, **Legend**, a lasting comic stage past Known for her, staff and Lantern girls, that can be come back from. Built (see "Legend" above).
