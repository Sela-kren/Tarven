# Corruption tropes: how each stage of the fall is written (plan)

**Status:** a plan only (18 Nov 2026). Nothing here is built yet. This is the rule for writing a corruption stage from now on. Whenever someone moves up a stage (the heroine, a staff member, a Lantern girl, a church recruit), the change is written with one of the manipulation tropes below. That's how corruption and mind-break manhwa do it: the fall happens because someone pushes, step by step. It doesn't just happen when a number goes up.

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
| **Mind break** | Her sense of self cracks and she wants the new role | Today only the "broken" voice at 0 willpower in a fight and the "lost" face. A lasting stage is still an open question (below) |

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
| Known → (top stage?) | Mind break, brainwashing | The church, the Baron | Open question: is there a stage past Known? |

## Her corruption tiers: what she does to others

| Tier | Tropes she can use | Example |
|---|---|---|
| **Honest** (0–39) | none | Her word is good |
| **Shady** (40–79) | Love bombing, rationalisation | Charms a regular dry; "everyone has a price" |
| **Crooked** (80–149) | Blackmail, isolation, conditioning | Blackmails a client (already in the Ledger); keeps a girl from the Velvet House; trains her staff with perks for "a bit more" |
| **Rotten** (150+) | Gaslighting, trauma bond, brainwashing | Feeds recruits to Veyra's church; rewrites a rival's story; staff who can't leave her |

Each use is a Ledger deed with a named victim, and **victims come back** (STORY.md §8).

## Staff and the Lantern's girls

- **Corruption tier changes** (honest → shady → crooked) each get a story card with a trope, chosen by who's pushing:
  - **The madam (her):** conditioning, isolation
  - **Sabine (the Velvet House):** love bombing → devaluation (this is how poaching works)
  - **The church:** brainwashing, rationalisation (CHURCH_RECRUITMENT.md stages)
  - **The smugglers:** blackmail (Corvin's debt)
- **Their lewdness** needs to change something. Today it's tracked (`staffLewdness`) but has no effect. Give it the heroine's stages (sheltered, curious, willing, known), with each person's lines and look changing at every stage, like the Lantern's mind stages already do.

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

With Consent on, she can refuse at every step.

## When it's built

1. Tag each stage-change story card with a trope id.
2. Write the dawn lines, touch lines and staff dawn lines in that trope's voice.
3. Put staff lewdness on her four stages, with lines and looks for each.

## Open questions

- **A mind-break top stage:** should there be a lasting stage past Known (her, and filthy-stage staff), and how does it stay comedy, not dark? Today "broken" is per-fight only.
