# Passives, desire and lewdness: design draft

A design document: the plan, what's built, and what comes next. Section 9 is the roadmap.

**Built (step 1):**
- the five desire meters, Pleasure and Overwhelmed
- Lewdness, Corruption and the records
- 83 passives in 22 groups, including Cock, Masturbation, Sadism and Masochism
- the intimate touch area
- invitations upstairs, and easing the ache at bedtime, both with 18+ placeholder cards
- the journal's Passives and Records tabs
- new passives listed on the morning report

`src/game/passives.ts` is now the source of truth for the exact list and numbers.

Changed from this draft:
- The "new action" benefits ("Kiss them first", "Sit on their lap", "Lean over the table", "Serve in less") were swapped for gold, desire and nerve effects. Those actions can come back once she can start things herself.
- "Talk of the Pass" gives tips instead of more guests.

Titles, House Rules and endings are still to come.

It follows how Karryn's Prison works, adapted to the tavern:
- every passive has a requirement you earn and a benefit of its own
- many passives also have a cost
- passives are announced when she goes to bed

Hard lines stay in force:
- Everyone is 18+.
- Every count only rises when **she says yes**, and pulling away always works.
- When she is far too drunk, she can't say yes.
- There is no graphic prose. Sexual scenes are shown as an **18+ card**: a wallpaper image, an 18+ badge, one short non-graphic line, and Continue.

---

## 1. The meters

### Five desire meters (tonight only, 0–100)

Karryn's Prison gives each body area its own desire meter. Ours are:

| Meter | Touch areas it covers |
|---|---|
| **Body** | hand, hair, shoulder, neck, waist, clothes |
| **Mouth** | face, lips |
| **Breasts** | chest |
| **Butt** | rear |
| **Pussy** | thigh, lap, intimate (new) |

How the meters work:
- **Requirement:** a touch of boldness L needs its meter at `(L − 1) × 10` or more. Leaning into it needs 20 more.
- **Start of night:** each meter starts at the sum of the passives' "Start +N" bonuses, so 0 for a new character.
- **Raising them:**
  - A touch she allows raises its own meter by about `8 × sensitivity`, and every other meter by a third of that.
  - A drink raises every meter by 6. Drink passives raise this further.
- **Night's end:** there's no decay during the night, and every meter resets at dawn.
- **Invitation:** an invitation (boldness 10) needs Pussy 90. Guests only start asking once Lewdness reaches 25, or once she holds Upstairs Curious.

### Lewdness (lasting, 0–100+)

Like Karryn's slut level, it isn't raised directly. It's **worked out** from:
- the lewd points of every passive she holds
- 1 for every 5 touches she has allowed
- 2 for every guest she has taken upstairs
- 2 for every time she has been Overwhelmed

Guests notice it: higher Lewdness gives guests more nerve (+1 at 30, +2 at 60). That is the main cost of growing bolder. She can still turn anyone away.

### Corruption (lasting, 0–100+)

How far she's sold out. It rises from:
- selling secrets (+10)
- informing to the baron's men (+8)
- greedy choices (+4)
- cold choices (+3)
- Corruption passives
- later, House Rules (section 6)

### Pleasure (tonight, 0–100): built

Rises from touches she allows. At 100 she's **Overwhelmed**:
1. An 18+ card shows.
2. Every meter goes up by 20.
3. Pleasure resets.
4. The "overwhelmed" record goes up.

This is the Karryn's Prison climax mechanic, kept non-graphic.

### Removed or folded in

| Old stat | What happens to it |
|---|---|
| "Grown into" desire | becomes Lewdness |
| "Warm tonight" | the meters replace it |
| Flirt | folded into Lewdness |
| Greed | folded into Corruption |
| Kindness | folded into Corruption |
| The dead "lust" / "desires" persona fields | removed |

Respect and Fame stay.

---

## 2. Records (what passives count)

Like Karryn's Prison's record list, these are shown on a Records page in the journal.

**Per touch area:**
- times allowed
- times leaned into
- which guest kinds have done it (farmer, smuggler, soldier, fugitive)
- the first night it happened

**General:**
- touches allowed, leaned into, turned away (pulled away, slapped)
- each meter maxed (nights)
- clothes lost, and nights ended in underwear
- invitations accepted, nights shared upstairs
- times Overwhelmed
- drinks with guests, orders served, bottles poured, cups washed
- secrets kept, sold, told
- nights with no touch allowed

---

## 3. How passives are gained

1. The requirement is checked as things happen.
2. The passive is awarded **when she goes to bed**. As in Karryn's Prison, the bedtime screen lists "New passives", each with her thought about it.
3. Its effects start the next night.

In the journal **Passives** tab:
- Earned passives show their icon, name and benefit.
- Locked ones are greyed with progress, like "Lips allowed 6/10".
- Hidden ones show "???" until their group's tier I is earned.

---

## 4. The passive list (draft, ~75)

Key:
- **Start +N:** that meter starts each night N higher.
- **Ease −N:** those touches need N less desire.
- **Sens +X%:** those touches raise desire X% more.
- **Lewd:** lewd points toward Lewdness.

### Hands (hand)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Warm Hands | allow 3 hand touches | Body Start +5 | none | 2 |
| Hand in Hand | allow 10, from 3 kinds of guest | hand Ease −10, Sens +25% | none | 4 |
| Fond of Being Held | allow 25 | new action **Take their hand** when serving (+2 tip, +fame) | guests reach for her hands more | 6 |

### Mouth (face, lips)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Soft Cheeks | allow 3 face touches | Mouth Start +5 | none | 2 |
| Stolen Kiss | allow the first lips touch | lips Ease −10 | none | 4 |
| Sweet Lips | allow 10 lips | Mouth Sens +25%, +2 gold per kiss | none | 6 |
| Kiss-Hungry | 25 lips, and Mouth maxed on 3 nights | Mouth Start +15; new action **Kiss them first** | guests reach for her mouth more | 10 |

### Neck & Hair (neck, hair, shoulder)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Easy Shoulders | allow 5 shoulder | Body Start +5 | none | 2 |
| Weak at the Neck | allow 5 neck | neck Ease −10, Body Sens +20% | none | 4 |
| Melts at a Touch | 30 in the group | every touch she allows adds +2 to all meters | none | 6 |

### Breasts (chest)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Flushed | allow the first chest touch | Breasts Start +5 | none | 3 |
| Proud Chest | allow 8 | chest Ease −10, +3 gold each | none | 6 |
| Shameless Bust | allow 20, from all 4 kinds | Breasts Start +15; new serve option **Lean over the table** (+tips, guest lust up) | −1 Respect per night | 10 |

### Hips (waist)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Easy Waist | allow 5 waist | Body Start +5 | none | 2 |
| Swaying Hips | allow 15 | waist Ease −10; guests she walks past gain lust (bigger tips) | none | 4 |
| Hips That Ask | allow 35 | Body Sens +30% | guests' nerve +1 | 6 |

### Butt (rear)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Cheeky | allow the first rear touch | Butt Start +5 | none | 3 |
| Pinchable | allow 8 | rear Ease −10, +2 gold each | none | 6 |
| Admired From Behind | allow 20 | Butt Start +15; soldiers tip +2 | guests reach for her rear more | 10 |

### Thighs & Lap (thigh, lap)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Perched | allow the first lap touch | Pussy Start +5 | none | 3 |
| Lap Warmer | allow 8 in the group | lap and thigh Ease −10, Pussy Sens +20% | none | 6 |
| Wandering Hands Welcome | allow 20 | new action **Sit on their lap** (she offers it: big tip) | −1 Respect each time | 10 |

### Pussy (new touch area, "intimate", boldness 8–9)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Curious Heat | Pussy meter reaches 50 once | Pussy Start +5 | none | 3 |
| Under the Table | allow the first intimate touch | intimate Ease −10 | none | 8 |
| Aching | allow 10 intimate | Pussy Sens +30%; every touch she allows adds +2 Pussy | none | 10 |
| Unashamed Heat | 25 intimate, and Pussy maxed on 5 nights | Pussy Start +20 | guests' nerve +1 | 14 |

### Exhibition (clothes)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Bare Shoulders | lose 1 piece | +1 gold per serve while a piece is off | none | 2 |
| Show-Off | lose 10 pieces in all | clothes Ease −10; +1 fame per serve while undressed | none | 5 |
| Exhibitionist | end 3 nights in underwear | Body Start +10; new day option **Serve in less** (start the night with a piece off: +tips) | −Respect, +1 Heat per night | 10 |

### Invitations (invite)

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Upstairs Curious | accept 1 invitation | all meters Start +3 | none | 6 |
| The Back Stairs | share 3 nights upstairs | invite Ease −10; guests she's been upstairs with come back as regulars and tip more | none | 10 |
| Mistress of the Upstairs Room | share 10 nights, with all 4 kinds | +50% gold from invitations | +1 Heat each time (the baron hears) | 15 |

### Desire

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Restless | any meter reaches 100 | all meters Start +5 | none | 3 |
| Daydreamer | Lewdness 25 | Sens +10% everywhere | none | 0 |
| Always Wanting | all 5 meters at 60+ in one night | all meters Start +10 | guests' nerve +1 | 8 |
| Insatiable | Overwhelmed 5 times (only if Pleasure is in) | after Overwhelmed, meters only drop to 50 | none | 12 |

### Leaning in

| Passive | Requirement | Benefit | Cost | Lewd |
|---|---|---|---|---|
| Leans In | lean in 5 times | +1 gold per lean | none | 2 |
| Eager | lean in 15 times | leaning needs only +10 over the requirement instead of +20 | none | 4 |
| Wants It More | lean in 40 times | leaning adds +5 to every meter | none | 6 |

### Drink

| Passive | Requirement | Benefit | Cost |
|---|---|---|---|
| Social Drinker | 5 drinks with guests | each drink +2 more to every meter | none |
| Light-Headed | 15 drinks | each drink +3 more to every meter | none |
| Iron Liver | 30 drinks | gets drunk 25% slower | none |
| Bottomless | 60 drinks | guests buy her drinks more often (more tip chats) | none |

### Bar work

| Passive | Requirement | Benefit | Cost |
|---|---|---|---|
| Steady Tray | serve 25 orders | guests wait 10% longer | none |
| Quick Hands | serve 75 | carry and pour faster | none |
| Regulars' Favourite | serve 150 | +1 tip on every tipped serve | none |
| Barmaid of the Pass | serve 300 | +10% on all pay | none |
| Good Stuff | pour 10 bottles | +1 gold per bottle | none |
| Sommelier | pour 40 bottles | guests ask for bottles more | none |
| Clean Hands | wash 50 cups or dishes | wash 20% faster | none |

### Composure (saying no: Karryn's Prison's Sadism, without the cruelty)

| Passive | Requirement | Benefit | Cost |
|---|---|---|---|
| Cold Shoulder | turn away 5 | pulling away never sours a guest | none |
| Firm Hand | slap 5 | a slapped guest won't reach again that night; +1 Respect | none |
| Untouchable | turn away 30 | guests reach for her 30% less often | fewer touch tips |
| Lady of the House | 3 nights with no touch allowed | +1 Trust each night; guests mind themselves | none |
| Iron Will | Respect +8 for 3 nights | bold guests' nerve −1 | none |

### Corruption

| Passive | Requirement | Benefit | Cost |
|---|---|---|---|
| Loose Lips | sell 1 secret | +3 gold per secret sold | Corruption +5 |
| Secret Broker | sell 4 | +5 more | Corruption +10 |
| Baron's Ear | inform 2 times | Heat −1 each time you inform | Trust −1 each time |
| Baron's Pet | inform 5 times | Heat −1 every night | Trust −1 every night |
| Cold Heart | Corruption 50 | +1 gold per serve | kind choices give no Trust |

### Village

| Passive | Requirement | Benefit | Cost |
|---|---|---|---|
| Keeper of Secrets | keep 1 secret | +1 Trust each time you keep one | none |
| Safe Harbour | keep 4 | fugitives tip +2 and never walk out angry | Heat +1 when keeping one |
| Heart of the Village | Trust 12+ | villagers' patience +20% | none |

### Fame

| Passive | Requirement | Benefit | Cost |
|---|---|---|---|
| Known Face | Fame 20 | guests wait 5% longer | none |
| Local Favourite | Fame 50 | +1 tip on tipped serves | none |
| Talk of the Pass | Fame 80 | more guests each night | a busier, harder night |

---

## 5. Titles (Karryn's Prison style: a bonus when earned, an effect while worn)

- **Slots:** wear 1 title. Fame 50 opens a second slot.
- **Changing:** titles are changed in the journal, during the day.

| Title | Requirement | Bonus when earned | While worn |
|---|---|---|---|
| Innkeeper of Tarven | start | none | none |
| Barmaid of the Pass | serve 200 | +10 gold | +10% tips |
| The Untouchable | turn away 50 | +2 Respect | guests reach 50% less; −20% touch gold |
| Garrison Sweetheart | soldiers' touches allowed 20 times | none | soldiers never cause Heat when walking out; +Butt Start 10 |
| Smugglers' Darling | smugglers' touches allowed 20 times | none | smugglers tip +3; +1 Heat per night |
| Unashamed | Lewdness 80 | none | +20% tips; −2 Respect per night |
| The Baron's Creature | Corruption 80 | none | Heat −1 per night; Trust −1 per night |
| Heart of the Village | Trust max | +2 Trust | Trust +1 per night |
| Iron Liver | 100 drinks | none | never gets sloppy drunk (still can't say yes when too drunk) |

---

## 6. House Rules (Karryn's Prison's Edicts): later

Rules bought at the plans table. Some raise Corruption or Lewdness:
- **Shorter Apron:** +tips, guests' lust up, Lewdness +5.
- **Back Room:** unlocks invitations during service.
- **Water the Ale:** +gold, Corruption +5, guests' mood down.
- **Pay the Baron's Sergeant:** Heat −1 per night, Corruption +10.

---

## 7. Invitations and 18+ scenes

When she accepts an invitation, she takes the guest upstairs:
1. An 18+ card shows: a wallpaper image, the 18+ badge, and one short non-graphic line.
2. Service time skips forward, and every waiting guest loses patience. That's the trade-off.
3. She gets gold (with Invitations passives), the "nights shared" record, and the guest's affection.

Other 18+ cards:
- the Overwhelmed card, if Pleasure is in
- the final epilogue

A setting can hide all 18+ cards.

---

## 8. Endings (later)

Her private epilogue comes from Lewdness × Corruption and is shown next to the baron outcome:

| | Corruption under 40 | Corruption 40 or more |
|---|---|---|
| **Lewdness under 40** | Still Her Own | The Baron's Creature |
| **Lewdness 40 or more** | The Tavern's Darling | Queen of the Pass |

---

## 9. Roadmap

### Done

- [x] **Step 1: the core.**
  - five desire meters, Pleasure and Overwhelmed
  - Lewdness, Corruption and the records
  - 83 passives in 22 groups, with pixel icons
  - new passives earned at bedtime and listed on the morning report
  - journal tabs: Ledger, Private, Passives, Records
- [x] **Step 2: the intimate touch area.** Four touches at boldness 8–9 feed the Pussy meter and group.
- [x] **Step 3: invitations upstairs and 18+ cards.**
  - She picks what happens upstairs: kiss, hands, mouth, bed, from behind. Each needs its meter high enough.
  - She can always change her mind.
  - The bar loses patience while she's away.
  - Easing the ache at bedtime, and being Overwhelmed, also show cards.
  - All cards use placeholder wallpaper.

- [x] **Stats, skills and brawls.**
  - Five stats with levels: Strength, Agility, Endurance, Charm and Mind. They grow from what she does, like Karryn's.
  - Body skills (Hands, Kissing, Breasts and the rest) and upstairs skills grow with use. Some passives give a level outright, like Karryn's "Kiss level up".
  - Brawls: an angry or roaring-drunk guest can start a fight, at most 2 a night. It's turn-based: Strike, Shove, Dodge, Talk them down (Charm), Stare them down (Mind), and Throw them out.
  - Winning throws them out, with respect and fame. Talking them down earns trust. Losing costs gold and respect, and nothing else.
  - New passive groups: Brawler, Charm and Mind. There's a Skills tab in the journal, and brawls show in the Records.

- [x] **After Hours: pleasure duels she agrees to** (Karryn's sex combat, made consensual).
  - At bedtime, a sober guest she let touch her tonight may linger and ask for a game. She can say yes or no. It's offered at Lewdness 25+ (or with Upstairs Curious), once a night, and never when she's had too much to drink.
  - Before it starts she sets her rules: which parts are in play (Hands, Mouth, Breasts, Butt, Pussy), each only if that desire meter is warm enough tonight, and the stake (0, 5, 10 or 20 gold). A kiss is always in play.
  - Turn-based: her pleasure and stamina against theirs. Her moves are Kiss, Caress, Tease (Charm), Undress (twice), Use your hands, Use your mouth, Ride them, Hold back (Mind), and Stop. Bolder moves cost more stamina; their moves only ever land on what she put in play.
  - States: Calm, Aroused (50+: her moves hit 25% harder, holding back is weaker) and On the Edge (80+: 50% harder, holding back much weaker).
  - Win: they give in first, and she takes the stake plus fame. Lose: she goes first and pays the stake. Stop (or Esc) always ends it at once, and costs nothing.
  - Win or lose, an 18+ placeholder card with one line, then sleep. Every move has one short, non-graphic line.
  - New passive group, After Hours: Night Owl, Good Sport, House Champion, Queen of the Night, Never Holds Back, Cool as Ice, Edge Walker, Bare and Bold, Clever Fingers, Sweet Tooth, Born Rider.
  - Brawls never turn into a duel: the two are separate.

- [x] **Her two sides, her hold, and brawl passives** (Karryn's Softcore/Hardcore Masochist and Sadist, resistances, and combat passives). 20 new passives.
  - **Rule for every passive:** it must change something about her (an effect or a skill level), and its count must be reachable in play. `tests/passivesides.test.ts` checks both for the whole list.
  - **Two sides:** her sub side is rough touches let + times she gave in (Consent off); her dom side is slaps + times she faced them down. Soft Touch / Easy Prey need the sub side 10 / 25 ahead; Stern Keeper / Rules the Room need the dom side 10 / 25 ahead. Sub weakens her hold, dom strengthens it.
  - **Her hold, part by part:** the Consent-off check's hold now takes passives into account (`hold`, `holdOf`). One passive per body group at 40–60 lets weakens the hold on that part by 1, and each also has a benefit that works with Consent on. Loose Laces (clothes, −1), Buttoned Up (clothes kept 15 times, +2) and Guarded (60 turned away, +1 everywhere).
  - **Brawl:** Wrestler (land 15 grapples), Hold Breaker (held 15 times), Thick Skin (take 20 grapples), Stinging Reply (slap 5 reaches mid-brawl), Scrapper's Blush (let 5 reaches mid-brawl, her choice).
  - New records: clothesKept, grapplesLanded, grapplesTaken, timesHeld, brawlSlaps, brawlLets.

### Next

**4. Titles** (Karryn's Prison style)
- One title worn at a time; Fame 50 opens a second slot.
- Each title has a bonus when earned and an effect while worn (see section 5).
- Changed in the journal during the day, on a new Titles tab.
- Guests mention the title she's wearing in their chatter.

**5. House Rules** (Karryn's Prison's Edicts)
- Rules bought at the plans table: a new "Rules" group in the build tray.
- Some raise Corruption or Lewdness (see section 6).
- Some are needed before other things open, like the Back Room before invitations during service.

**6. Endings**
- Her private epilogue comes from Lewdness × Corruption (see section 8).
- It's shown next to the baron outcome on the final screen, with its own 18+ card.

**7. Actions she starts herself**

The "new action" benefits held back from step 1 come back here as passive unlocks:

| Action | Unlocked by | What it does |
|---|---|---|
| Take their hand | Fond of Being Held | a small flirt while serving: +tip, +fame |
| Kiss them first | Kiss-Hungry | she starts the kiss: big tip, Mouth desire up |
| Sit on their lap | Wandering Hands Welcome | she offers it: big tip, Respect down |
| Lean over the table | Shameless Bust | a serve option: +tips, guest's lust up |
| Serve in less | Exhibitionist | a day choice to start the night with a piece off: +tips, −Respect, +Heat |

They'd appear as a choice after serving a guest, only for passives she holds.

**8. Art**
- Replace the placeholder wallpapers (door, candle, bed) with your own art. The cards already have a slot for each scene.
- Add one wallpaper per upstairs choice, plus Overwhelmed, Alone, and each ending.
- Comic-panel framing for the intimate touches may need tuning once the art is in.

**9. Settings and comfort**
- A setting to hide all 18+ cards (skip straight to the result line). This was planned in section 7 and isn't built yet.
- A setting for how fast desire builds (an "intensity" slider) for players who want slower or faster nights.

**10. Balance pass**

After a few full playthroughs:
- how many nights to reach each tier
- how often invitations come
- whether Untouchable and Composure feel as good to play as the lewd groups
- whether gold from passives breaks the baron's debt

**11. More fighting** (the first brawls are in)

Brawls in the tavern, throwing out troublemakers, the baron's men. This is where Karryn's Prison-style combat would sit.

- Fighting can add its own passives: Strength, Agility, Brawler, Bouncer.
- **Hard line:** losing a fight never leads to sexual content, and never counts toward any sexual record or passive. Sexual records only rise from what she chooses.

**12. The brother**

Decide whether guests reach for the brother too. If so, he needs:
- his own touch lines
- the same passive system: the meters and groups would mostly carry over

**13. More content in every group**
- More touches per area and per guest kind, so every group has 4–5 tiers like Karryn's lists.
- Records per guest kind, for passives like "Garrison Sweetheart" (soldiers) and "Smugglers' Darling" (smugglers).

**14. New Game+** (maybe)

Like Karryn's Prison: after an ending, keep some passives and titles into a new run.
