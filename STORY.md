# Last Call at Tarven: Story

> The story design document. It replaces the story parts of GAME_CONCEPT.md (sections 1, 8.2, 9 and 11) once it is approved.
> **Draft 2.18, 14 Nov 2026.** See the changelog at the bottom.

**House rules stay in force.** Every character is an adult (18+), and the game says so. Every intimate beat is the player's choice. With **Consent on** (the default), every touch asks first. With **Consent off**, an impulsive guest's touch may land without the choice screen, but only a touch she could already say yes to (her desire is high enough, nobody is too drunk, it's within the boldness the player set, and never an invitation), and only when their push beats her hold (GAME_PATH.MD, 7b). Slap and Pull away always work on the next reach, and being too drunk blocks every yes. No text shows a touch landing after a refusal. A lost brawl may offer a scene, with a continue/stop choice at its start (GAME_PATH.MD, "Brawl loss"). The Force bar only shows how bold a touch was after a yes. Sexual scenes stay as non-graphic 18+ cards.

> **The main goal is popularity.** She starts with one cold tavern and a debt, and aims to make it **the most popular house on the pass**. She beats the rival taverns, buys them up, and decides whether to work with the bosses she beat, the Baron included. The red book is the story underneath. It explains why the Baron wants her tavern, and it is the leverage the top house gets to use.

> **Fans drive the story, nights don't.** Every story beat, from the first rumour to the final Last Call, fires on her **fan count**. Nights keep passing and bring small things (section 7, "What nights do"), but no night count ever forces a beat or ends the run. A player who wants the ending can push for fans and reach it fast. A player who wants to explore can stay, try the other choices, and replay to see what else happens.

> **Current scope: Chapter 1, Tarven.** Build and balance the village first: five houses to beat, Act 1 along the way, and the chapter ends when she is first in Tarven (section 7, "Tarven first"). The pass, Acts 2 and 3 and the Lantern come later.

---

## 1. Why the old story flops

| Problem | What it looks like in the game now |
|---|---|
| **The story ignores most of the game** | Corruption, lewdness, willpower, passives, brawls, after-hours duels and the brothel unlock have no meaning in the story. The endings only read gold, trust and heat. |
| **Nobody has a name** | Guests are "Farmer" and "Soldier". The Baron is a letter. The rest of the cast only exists in the concept doc. Betraying someone with no face costs the player nothing. |
| **Last call is the same choice three times** | Every night has the same numbers (+5 / −3 / −2, 0 / +2 / +1, +25 / −2 / −1). Selling always pays best, so it isn't a real dilemma. |
| **The rumours don't connect** | Salt under the chapel, a deserter and a meeting at the mill are three separate threads, and what you did never comes back. |
| **No origin** | The intro never says why she barely knew Wren, why the family left, or why the tavern goes to her and not to Father. |
| **The debt is the only goal** | "Pay 150 gold in 3 nights" is a timer, not a story. She has no question to answer about herself. |

What already works and should stay: the tavern, the Baron's debt, Wren, last call, rumours overheard at tables, and the dawn report with town talk.

---

## 2. The origin

Wren's book is what broke the heroine's family, two years before the game starts. Wren is **Father's mother**.

| When | What happened |
|---|---|
| ~40 years ago | **The Red Lantern.** Wren is the madam of the most famous pleasure house on the pass. Men talk in her rooms, and she writes it all in a **red book**. |
| ~30 years ago | She takes the lantern down, marries Grandfather and runs a "respectable house". Father grows up behind this bar. She keeps the book. |
| ~20 years ago | Baron Hesk starts keeping the crown's toll silver from the pass. Wren writes that down too. |
| ~16 years ago | Mother learns what the house used to be and takes the children down the mountain in the night. The heroine is 8. Mother never says why. |
| 2 years ago | The crown announces an audit of the pass tolls. Wren splits the book among the people she trusts and sends Father east with the last pages. His letters stop, then the money stops, then the marriage ends. |
| This autumn | A debt note in Wren's name turns up in the Baron's ledgers. Pell, the tax collector, visits, poisons her ale and searches the house. He finds nothing. |
| Night 1 | The heroine, 24, rides up to Tarven with one bag and the deed. |

### The intro, rewritten (`story.ts`)

The order is reversed: Father leaves first, and the split follows. Both parents stay. Lines marked **new** are new.

**Built** (`story.ts` `INTRO`, 14 Nov 2026), with three small changes: the line about her age stays in (*"You're twenty-four now, a grown adult"*), and the two sheltered lines from section 4b are in (*"She kept you close after that..."* after line 3, and *"...the bravest thing I've ever done is ride up this mountain"* after line 8). The old *"He collects in three nights, or the tavern is his"* is gone, because the game has no deadline now.

| # | Speaker | Line |
|---|---|---|
| 1 | Narrator | **new** Two winters ago, Father went east on an errand for Grandma Wren. He never said what it was. |
| 2 | Narrator | **new** His letters stopped by spring. The money stopped with them. By summer, so had the marriage. |
| 3 | Narrator | **new** Mother took in washing. She never said Wren's name again, and she never said why. |
| 4 | Narrator | Then a letter came from Tarven, up on the mountain road. Grandma Wren had passed away in her sleep. |
| 5 | Narrator | You buried her on the hill behind the village, where she could see the mountains. |
| 6 | Narrator | **new** She left the tavern to you. Not to Father. To you. |
| 7 | You | So this is it. Grandma's tavern. |
| 8 | You | **new** It's smaller than I remember. I was eight. Mother got us out in the night and never told me why. |
| 9 | You | There's a letter waiting on the bar. It has the baron's seal on it. |
| 10 | Narrator | Grandma owed the baron {debt} gold. Now you do. He'll send his man to collect once the tavern's on its feet. Until then, every night counts. |
| 11 | You | **new** Behind the bar there's a clean square in the dust, where a book used to stand. |
| 12 | You | **new** Grandma kept something here. Somebody's taken it. Or been looking for it. |
| 13 | You | **new** Mother can't help. Father can't be found. It's just me now. |
| 14 | You | Then I open tonight. And I keep my ears open. |

---

## 3. The spine

**On the surface (the goal the player chases):** climb from a cold, indebted tavern to the most popular house on the pass, then own the pass's houses. Section 7 covers how.

**Underneath (why it matters):**

- **The Baron doesn't want 150 gold. He wants the red book.** It proves twenty years of stolen toll silver, and the crown's auditor is coming this winter. The debt is only a lever to get into the tavern.
- **The debt is forged.** Pell wrote the note after Wren died. Later, her letters show the handwriting doesn't match, which becomes a clue.
- **Wren didn't die in her sleep.** Pell poisoned her while he searched for the book.
- **Wren split the book instead of sending it to the crown,** because half the village is in it too. Exposing the Baron would ruin them as well.

So the heroine's real question is not *"can I pay?"* It is **"whose granddaughter am I?"**:
- Wren the madam, who ruled the pass from a bed and a ledger,
- Wren the keeper, who protected the village,
- or someone Wren never was.

> **Why "top tavern" matters to the plot.** The crown's auditor arrives in Act 3 and lodges at **the best house on the pass**. Whoever hosts him decides what he hears. Being the top tavern is how the book reaches the crown, so the race for fans and the main plot become one goal.

---

## 4. Who she becomes

Three separate stats, each in the player's hands:

| Stat | What it measures | Comes from | Opens |
|---|---|---|---|
| **Lewdness** | Lust. How far her body and appetite have gone | Touches she allows, after hours, passives | Mind stages, flirting, the lantern |
| **Corruption** | Evil. What she has done to people | Selling people out, greed, cruelty, dirty tricks | Dark choices: poison, sabotage, blackmail |
| **Fans** | The tavern's fans. Who keeps coming back, and why | Guests leaving happy | Steady income, allies on the final night, the top-tavern crown |

Lewdness and corruption are separate, so there are four kinds of heroine instead of one track:

| | Low corruption | High corruption |
|---|---|---|
| **Low lewdness** | **The Keeper.** Wren as she ended up: protector of the village | **The Schemer.** An informant with a cold bed. Sells everyone, lets nobody touch her |
| **High lewdness** | **The Fair Madam.** She hangs the lantern and protects her girls and her guests. Her girls stay honest | **The Rotten Madam.** Rich, feared and alone. Her girls turn rotten with her, and they're one bad night from leaving |

---

## 4b. Her arc: sheltered to known

The systems already track how far she's come: the six desire meters, Lewdness, the records, the passives, the touch counts by guest kind and the Consent switch. The writing doesn't use them enough yet. This section turns those numbers into a slow personal arc in the style of Karryn's Prison. It starts with a sheltered woman who has never been kissed and ends with the keeper the whole pass talks about. **It adds no new core mechanic.** Every stage is read from data the game already saves.

### The four stages

The stage is a **writing layer** on top of the mind stage (`lewd.ts`). It reads **Lewdness only**, so section 15 fix 1 must land first. Corruption doesn't change her stage. It changes the stage's *tone* (see "Corruption colours the stage" below).

| Stage | Gate (reads existing data) | Slut Level | Mind stage | Typical firsts by now |
|---|---|---|---|---|
| **Sheltered** | Lewdness 0–19 | 0–1 | 0 | Hands, face, hair, shoulder. No kiss, nothing on her chest, nothing below the waist |
| **Curious** | Lewdness 20–53 | 2–5 | 1 (warming) | Her first kiss, first chest, first rear, first lap or thigh. The first invitation can come (Lewdness 25) |
| **Willing** | Lewdness 54–106, **or** 3 nights shared upstairs (*The Back Stairs*) | 5–10 | 2 (eager) | Upstairs, After Hours, a peek or a proper look, clothes lost |
| **Known** | Lewdness 107+ **and** touches let from 4 or more kinds of guest (`records.kinds`) | 10+ | 3 (filthy) | The taproom, *Open House*, the whole room knows her. With Lewdness 107+ but fewer kinds, she still reads as Willing |

The thresholds are the old mind-stage cut-offs (30 / 80 / 160 on `lewdness × 1.5`) with corruption taken out: Lewdness 20 / 54 / 107 (`MIND_AT` in `lewd.ts`). One helper, `arcStage()` in `lewd.ts`, returns the stage, and every writing pool below picks by it.

**Built (14 Nov 2026):** `mindStage()` reads Lewdness only, and `Tavern.arcStage` gives the stage. It shows next to the Force bar (where the mind stage name was). Built from this section so far:
- the written touch line is kept, with a Curious aside or a Known body line after it (`flavorLine`);
- the first-time thoughts for a first that lands with Consent off, and for one that comes late (`FIRSTS_UNASKED`, `FIRSTS_LATE`);
- her own dawn line the first morning of each stage (`ARC_DAWN`, saved as `story.arc`), and the town's line when her mind stage rises (`townTalk`);
- Pell at dawn (below), and the Act 1 beats 1, 2, 4 and 5 (below).

**Not yet:** the named regulars, early and late passive thoughts, stage pools in table talk and gossip, the journal's Private voice, and who reacts (Oden, Mara, Pike, the rivals) beyond Tansy and Pell.

**Stages only go up.** A night of refusals doesn't make her sheltered again. It shows up as willpower, records and Composure passives, and the text treats it as her *choosing* restraint ("I know exactly what I'd be saying yes to"), not innocence.

### What each stage feels like

| | **Sheltered** | **Curious** | **Willing** | **Known** |
|---|---|---|---|---|
| **Her inner voice** | Alarm and counting. Who saw? What would Mother say? No body words, only "there". Short, breathless thoughts | Questions to herself. "Why didn't I pull away?" She notices her own body and is embarrassed by it | Decisions and prices. She knows what she wants and names it, still non-graphic. The teasing *Confident* lines live here | Ownership. She thinks about the room, the coin and who's watching, as much as the touch. The crude body lines (`BODY_LINES`) belong here and nowhere earlier |
| **How guests treat her** | They test her. Small touches, a lot of "just being friendly". Farmers are protective, and soldiers place bets on who gets the first smile | They've heard she *might*. The bold ones push, the shy ones get shy. Rumours run ahead of the truth | They ask by name and they come back for her. Regulars expect their usual. Strangers have heard of her before they sit down | Her name sells ale. Some come *only* for her, and some stop coming because of her (farmers' wives, chapel folk). Guests' nerve is up (+1 at Lewdness 30, +2 at 60, as built) |
| **The room** | Watches her like a new barmaid. Quiet when a hand comes in | Whistles and nudges. A slap gets a cheer | Expects a show. A refusal gets groans, and saying no costs willpower | Plays along. A refusal surprises them, and she gets a line for it ("Not tonight, lads. Even I have nights off.") |
| **Story beats** | Tansy's hint about the Lantern shocks her. Pell treats her as a girl out of her depth | Wren's first madam's letter lands as a mirror: "The second time, I didn't." | The lantern (lewdness 50 gate) becomes a real temptation, not a rumour. Rhea starts watching her soldiers around her | The madam's last letter. Rivals treat her as Wren come back. Pell uses her name as leverage (see "One choice that changes", below) |

### Corruption colours the stage

Lewdness says how far she's gone. Corruption says what she does with it. The four kinds of heroine (section 4) are the far corners. The stage picks the line pool, and the corruption tier (section 8) picks its edge:

| Stage | Honest / Shady | Crooked / Rotten |
|---|---|---|
| **Sheltered** | Shy and decent. Her refusals are kind | Cold. She says no like she's counting coin. Guests call her "the Baron's ice" |
| **Curious** | Flustered and warm | Calculating. She lets a touch happen and notes what it bought her |
| **Willing** | Generous. The regulars love her | Transactional. "That'll cost you" is no longer a joke |
| **Known** | **The Fair Madam's** voice: the room is hers and she looks after it | **The Rotten Madam's** voice: the room is hers and she uses it |

### Wren is the mirror

Wren walked this road forty years ago, and her letters (section 10) already split into the madam's and the keeper's. They line up with the stages, so each step the heroine takes is answered by Wren having taken it first:

| Stage | Madam's letter that lands here | Keeper's letter that answers it |
|---|---|---|
| Sheltered → Curious | First touch she lets happen: *"The second time, I didn't."* | First tempted touch she refuses: *"Wanting it and saying no anyway is the strongest thing you'll ever do behind this bar."* |
| Curious | Mind stage 1: how the room changes when they know you might say yes | A brawl won: the night Wren threw the Baron's father out |
| Willing | Mind stage 2 and the first After Hours duel: the Lantern's best years, and why she started writing it all down | Trust at half: why she took the lantern down |
| Known | Mind stage 3: where the red lantern is hidden | Willpower above half for 5 nights: Grandfather, and why she chose him |

**The rule for both sets:** Wren never tells her which road is right. Each letter ends on a cost Wren paid. The madam's letters cost her the chapel and her son, and the keeper's cost her the Lantern's money and a quieter life. That keeps "no set is the wrong one" true.

**Open question 6 (proposed answer):** move the madam's last letter (the lantern's hiding place) to **Willing**. Willing starts at Lewdness 54, just past the lantern's lewdness-50 gate, so the letter and the gate land together.

### Who reacts, and how

| Who | Sheltered / Curious | Willing / Known, low corruption | Willing / Known, high corruption |
|---|---|---|---|
| **Village talk** (`townTalk`) | "The new keeper blushes like a novice." | "She's Wren's granddaughter, all right. Loud in the room, quiet with a secret." | "They say she'd sell you her own bed and charge you for the sheets." |
| **Oden** | Gentle, fatherly. He sees Wren's chin, not her trade | Sad, not cold. He stops coming in on lit nights, but still talks to her at the chapel | Stops trusting her. Confessing (section 8) costs more respect |
| **Mara** | Wary: "My husband ran errands for this house. I know what it was." | Warms up: a keeper who's open about herself can be trusted with secrets | Withdraws. Her meeting (beat 3) is harder to learn about at the table |
| **Tansy** (the Bakehouse, 201 fans) | Her Lantern hint is a shock. The heroine denies it: "Grandma kept a respectable house." | "You've her walk now. She'd have laughed to see it." | "You've her walk, and her eyes for coin. Be careful which half of her you turn into." |
| **Pike and his soldiers** | Bets on the first smile. The brawl night is about her nerve | "My lads drink here for you, not your ale." Their fans come more easily | "My lads drink here for you, and I don't like what it does to them." |
| **Rivals** (Jory Bell, later Sabine) | Underestimate her: "A girl with a dead woman's deed." | Treat her as competition, and an equal | Sabine, later: "You're doing it better than she did. That's not a compliment." |
| **Pell / the Baron** | Patronising. He thinks she'll fold | Wary. A keeper the village likes is harder to move | Sees a business partner. The partnership (section 7) is easier to get and costs her more with the village |

**One line that doesn't move:** the Baron's interest is the book and the pass, never her. Her stage changes how he *reads* her, never what he wants from her.

### One choice that changes: Pell at dawn (250 fans)

The Act 1 finale (section 9) is the main plot choice inside Chapter 1, so it's the one that reads her stage and her corruption. Pell's opening line changes, and two choices are gated:

| She is | Pell opens with | Extra choice |
|---|---|---|
| Sheltered / Curious, Honest | *"You've your grandmother's chin. Not her nerve, I think."* | **"Get out of my house."** (Trust at half or more): the debt doubles anyway, Heat +2, Trust +2, sets `defiedPell`. By noon the village knows she threw the Baron's man out |
| Sheltered / Curious, Shady or worse | *"You count like she did. Good. Then you can count to three hundred."* | none |
| Willing / Known, Honest | *"Half the garrison has had a hand on you. Who'd take your word over the Baron's?"* | none. Her word counts for less, so in Act 3 the Known keeper needs the book itself as proof, not her testimony (a hook for later) |
| Willing / Known, Shady or worse | *"Wren sold what men told her in bed. I hear you've the same ear."* | **"The room talks to me. You could have that instead."**: the debt stays at 150 and doesn't double, Corruption +10, Trust −1, and sets `pellsEar`. From then on, each collection is 50 gold and a name from her room (Corruption +3 and Informed +1 a name). A Ledger entry (victim: "the room") comes with the Ledger of her deeds (section 8) |

Both gated choices use what's already there: debt, heat, trust, corruption and story flags. The four-way split makes the same night read as defiance, fear, shame or a deal, depending on who she's become.

**Built** (`ledger.ts` `pellOpening`, `Tavern.pellChoices`, `answerPell`, `tests/arc.test.ts`). "Early" is Sheltered or Curious, "late" is Willing or Known, and "shady" is Corruption 40+.

### Named guests carry the build-up

Three of the cast become **named regulars** (GAME_PATH.MD, section 5): they keep their rolled sheet and remember every night with her. Each is the face of one kind of build-up.

| Regular | Kind | Comes in | What they remember | How it shows |
|---|---|---|---|---|
| **Silas Crowe** (38) | Smuggler | From the salt beat (night 1) | Every touch she let him have, by part, and whether she leaned in | Starts with level 1–2 touches, and climbs one level for each night she let him have something, up to his nerve. Smugglers go for the thigh and the lap |
| **Mara Holt** (29) | Farmer | From the salt beat, at the farmers' table | Whether she was kind, whether she ever refused her, and how she refused | Slow. Mara never reaches first while the heroine is Sheltered. She's the gentle touch (a hand on hers, hair behind the ear) that shows the arc from the other side |
| **Captain Rhea Vance** (34) | Soldier | Off duty on side nights after the meeting beat (150 fans) | Every answer she gave, slaps included | **Rhea always asks.** She is never impulsive, even with Consent off and her nerve high. She's the soldier who respects the rule, set against her own men, who don't |

**How memory works** (a small add to the planned regulars system, using records the game already keeps per guest):
- **Nerve carries over a little.** +0.5 lasting nerve for each night she let them touch her (at most +2). A slap sets it back by 1 until she lets them again.
- **Their first line of the night** picks from their memory (what they did last, how she answered) and her stage.
- **They notice her stage changing.** The first night she's a new stage, each regular has a one-off line about it.

**Example memory lines** (non-graphic):

| Regular | Early (Sheltered / Curious) | Later (Willing / Known) | After a slap | After Consent off let one land |
|---|---|---|---|---|
| **Silas** | *"Same table, same ale. And I'll keep my hands to myself tonight. Mostly."* | *"You remember where my hand goes. Don't pretend you don't."* | *"I still feel that slap, love. Worth it."* | *"Last night you didn't pull away. I've been thinking about it all day."* |
| **Mara** | *"You went red as a beet when that soldier took your hand. I liked you for it."* | *"You've changed. Wren changed too, they say. She was still kind."* | *"Fair enough. I'll ask next time."* | Mara never reaches impulsively, so she never has one. She says instead: *"The room's bolder with you lately. Are you all right with that?"* |
| **Rhea** | *"Captain's orders: my lads keep their hands to themselves. Mine too, unless you say otherwise."* | *"I'm asking, which is more than they do. Yes or no?"* | *"Understood. I won't ask again tonight."* | Rhea never reaches impulsively. She says: *"I saw Corporal Dunn's hand last night. Tell me if he needs reminding."* |

### Putting the systems in the writing

#### The same touch at each stage, Consent on and off

**Consent on** text is deliberate. The thought shows her deciding, and the player's pick is what decides it. **Consent off** text never describes her being overpowered or a touch after a no. The check only covers touches her desire is already ready for, so the writing is about her body getting there **before her mind finished deciding**. Her want outran her resolve.

*Hand on her thigh* (boldness 5, Pussy desire 40 to let it happen):

| Stage | Consent on (she's asked) | Consent off (it lands; only possible once her desire allows it) |
|---|---|---|
| **Sheltered** | *(His hand's on my leg. On my leg. Everyone can see. Say something. Say no. Or... don't?)* | Doesn't happen: her Pussy desire won't be at 40 yet, so the check can't cover it and she's asked as normal. The first time an impulsive guest reaches with Consent on, the two extra answers appear (GAME_PATH.MD 7b). That's the Sheltered moment for the switch |
| **Curious** | *(I've been waiting all night to find out if I'd let someone. Apparently I would.)* | *(I'd told myself I'd decide when it came. It came, and I'd already decided.)* |
| **Willing** | *"Higher costs more."* (her Confident line) | *(No asking. Fine. I'd have said yes anyway, and he knows it.)* |
| **Known** | *(The whole table's watching his hand, not mine. Good. That's what they're paying for.)* | *(They don't ask any more. They know the answer. Half the pass knows the answer.)* |

*Kisses her* (boldness 7, Mouth desire 60; above the switch's default cap of 5, so Consent off only covers it if the player raised the cap):

| Stage | Consent on | Consent off |
|---|---|---|
| **Sheltered** | Not offered as a yes yet (desire too low). Her not-ready thought: *(No. Not here, not like this, not my first.)* | Doesn't happen |
| **Curious** | First time: *(My first kiss. In a tavern. With the whole room watching.)* Later: *(Again. I want to know if it's always like that.)* | First time: *(My first kiss. I'd been deciding all night whether to let someone. My body decided first.)* |
| **Willing** | *"Mm. You'll want to pay for that."* | *(They didn't ask. I didn't mind. I stopped minding a while ago.)* |
| **Known** | *(Silas kisses better. This one tips better.)* | *(Another one who couldn't wait. They never can, with me.)* |

#### First times and passives

- **Firsts carry the arc.** `FIRSTS` in `touchtalk.ts` is one line per part, written for a Sheltered woman. Keep that line, and add two variants: one for a first that lands with Consent off (above), and one for a first that comes late (she's already Willing when it happens: *"Funny. I'd let them do everything else before anyone ever did this."*).
- **A first with a named regular** gets their name in it: *(Silas. Of all people. My first kiss was a smuggler.)*
- **Passive thoughts get an early and a late voice.** Each passive's `thought` becomes two: the one used when it's earned at Sheltered or Curious (alarm, surprise) and the one at Willing or Known (ownership). For example:
  - *Stolen Kiss*, early: *(My first kiss. I keep touching my lips.)* Late: *(I'd forgotten I'd never been kissed. That was a long time ago now.)*
  - *Cheeky*, early: *(Someone grabbed my... and I let them. I let them.)* Late: *(They all go for it. I've started walking so they can.)*
  - *Upstairs Curious*, early: *(I went up those stairs. I can't take it back. I don't want to.)* Late: *(Upstairs is just another room now. My room.)*
  - *Untouchable* (keeper side), early: *(Thirty hands, thirty times no. I'm getting good at it.)* Late: *(They know I could say yes. That's what makes the no count.)*

#### Morning reports, journal and table talk

| Where | Sheltered | Curious | Willing | Known |
|---|---|---|---|---|
| **Dawn report** (her own line, above town talk) | *"(Grandma did this every night? How?)"* | *"(I keep thinking about last night. I shouldn't.)"* | *"(Good night. Sore feet, full purse, and I didn't hate any of it.)"* | *"(They'll be back tonight. They always are.)"* |
| **Town talk** (`townTalk`, one stage line in the pool, weight 2) | "The new keeper blushes like a novice." | "They say the keeper's warming up." | "Ask for the keeper by name, they say." | "Travellers on the road ask the way to *her* tavern." |
| **Journal, Private tab** | A diary voice: short, guilty entries | Questions she can't answer yet | Lists: who, what, what it paid | A madam's ledger voice, matched to her corruption |
| **Table talk** (`gossip.ts`, `tabletalk.ts`) | "Bet you a copper she slaps the first one." | "Saw her let the smuggler hold her hand. *Hold her hand.*" | "Ask her nice and she might." | "Don't waste your coin on the stew, lad." |

### Act 1 beats to rewrite for more resistance

These five beats come early, while most players are Sheltered. Each one should show her holding back, so the later stages read as change:

1. **The intro** (`story.ts` `INTRO`, section 2). Add two lines after line 3 that make her sheltered on purpose, and explain why the firsts are firsts: *"Mother kept us close after that. Chapel on Sundays, washing on Mondays, and no boys at the door."* and *"I'm twenty-four, and the bravest thing I've ever done is ride up this mountain."*
2. **The first reach on night 1.** The first touch of the run is always level 1–2 (fingers on the cup, a hand on hers), whatever the guest's nerve, and its not-ready thought is written as the first moment: *(Is that... allowed? Is that what people do here?)*. Her first refusal gets a one-off room reaction from the farmers' table: *"Good lass. Wren would've done the same."* That makes saying no a story moment, not just an absence.
3. **The deserter (50 fans).** Ash, frightened, reaches for her hand (the fugitive's *Holds her hand*, level 2). It's written as the first time someone has touched her out of **need** rather than appetite, set against the soldiers at the next table. Even Sheltered, she can let it happen, and the scene shows how different that feels.
4. **Tansy at the Bakehouse (201 fans).** The first hint of what the house was. Sheltered or Curious, she **denies it** (*"Grandma kept a respectable house."*). The line comes back at Willing in her own head: *(Respectable. I told Tansy that. I believed it.)*
5. **Her first invitation.** It's already shut to the taproom ("behind a closed door"). Add one beat of hesitation before the card even if her desire is ready: *(I've never... with anyone. Ask me again in a minute. No, ask me now, before I lose my nerve.)* The card and all its choices stay the same. Only the line before it is new.

**Built:** beats 1 (the intro), 2 (the first reach of the run is held to boldness 2 or less while her Lewdness is 0, with its thought, and the farmers' line after her first refusal ever), 4 (Tansy: denied while early, which sets `deniedLantern` and comes back on her first Willing morning; late, Tansy's line by her corruption) and 5 (the line before her first invitation's answer). **Not yet:** beat 3, Ash's hand on the deserter night.

### Writing rules for this arc

- **Every line stays non-graphic.** Body words stay vague until Known, and scenes stay on 18+ cards.
- **Never write a touch after a no.** Consent off writing is her body getting there before her head, never being overpowered.
- **Too drunk is always a no,** at every stage, in every voice (`TOO_DRUNK_TO_ALLOW`).
- **A refusal is never "backsliding".** At Willing and Known, saying no is written as confidence, not innocence returning.
- **Stages are earned by the player's yeses.** Nothing in the story pushes her stage up. The story only reacts to where she is.

---

## 5. The cast

| Character | Age | Side | Wants | Hides | Book piece |
|---|---|---|---|---|---|
| **The heroine** | 24 | You | Keep Grandma's tavern | She doesn't know who Wren was | |
| **Silas Crowe** | 38 | Smugglers | A partner, not a fence | His salt pays for the village's plans | The toll routes |
| **Brother Oden** | 45 | Chapel | Keep the chapel open | Hides Silas's salt. Loved Wren once. Saw the night she died | The lock and key to the cover |
| **Ash** | 31 | Fugitives | Cross the border alive | A deserter who met Father in the east | Knows where the last pages went |
| **Mara Holt** | 29 | Farmers | Her farm, and the Baron gone | She's organising the village. Her late husband was Wren's runner | The Baron's silver |
| **Captain Rhea Vance** | 34 | Garrison | Something worth serving | Already suspects the Baron | None. She decides which side the garrison takes |
| **Pell** | 52 | Baron | The book, then retirement | Killed Wren and forged the debt | |
| **Baron Hesk** | 56 | The keep | The book, and the pass | The stolen toll silver | |
| **Father** | 50 | Off-screen | To come home | Carried the last pages east | The last pages (Act 3) |
| **Widow Hesk** (rival) | 48 | The Gilded Stag | Respectability | The Baron's sister-in-law. Her inn launders his silver | |
| **Sabine Marrow** (rival) | 46 | The Velvet House | To be what Wren was | One of Wren's girls. She told Pell where Wren slept | |
| **Grig Tallow** (rival) | 50 | The Drowned Rat | Silas's routes | Informs for the garrison | |

| **Kestrel Vey** | 33 | Adventurers | The ruins on the north road, and the gold under them | Has been east, and has heard of a prisoner with the heroine's surname | |
| **Corran Black** | 41 | Bandits | The road, and a cut of everything on it | His gang robs the toll wagons on the Baron's orders, so the Baron can blame bandits for the missing silver | Witness to the silver |
| **Baroness Isolde Varn** | 36 | Nobles | The pass toll rights for her own lowland house | She'd see Hesk hang and take his keep | |

### Guest factions

The four first factions are in the game now. Three more arrive as the tavern climbs, so popularity changes **who** comes in as well as how many.

| Faction | Arrives | Usual mood | Wants | Pays in | Fan tags | Story hook |
|---|---|---|---|---|---|---|
| **Farmers** | From night 1 | Gloomy, Happy | Cheap food, someone to complain to | Small coin, village trust | Food, Safety | Mara's rising |
| **Soldiers / knights** | From night 1 | Drunk, Angry, Lustful | Ale, a fight, attention | Good coin, lower heat | Ale, Fights | Rhea and the garrison |
| **Smugglers** | From night 1 | Scheming | Discretion, a back room | Big tips, secrets | Secrets | Silas's salt |
| **Fugitives** | From night 1 | Scared | Hiding, food without questions | Gratitude, rare info | Safety, Secrets | Ash and Father |
| **Adventurers** (new) | 300 fans, once her name starts to travel | Happy, Drunk, Lustful | Ale, a map, a bed, a story to tell | Treasure coin, odd loot | Ale, Fights, Her | They can be hired: an escort, a break-in, or the road east to Father |
| **Bandits** (new) | 500 fans, once her takings are worth robbing | Scheming, Angry | Protection money, a fence, a place to hide | Stolen goods, threats | Fights, Secrets | They rob the toll wagons for the Baron. Corran is a witness to the silver |
| **Nobles** (new) | When she's 2nd or better on the Pass Ledger | Calm, Idolizing, Lustful | The best room, the best food, discretion | Big coin, favours, influence | Food, Safety, Her, Secrets | Baroness Varn's ambitions. The crown's auditor travels as one of them |

**How the new factions play:**
- **Adventurers** are loud, spend fast and leave for the ruins. A happy party comes back richer and spreads her name (fame). Hiring them costs gold, and they won't do anything dirty.
- **Bandits** offer protection: pay them and nobody breaks her windows. She can refuse and win brawls instead, or hire them against a rival, which is dirty work and goes in the Ledger. Making Corran talk about the toll wagons gives her proof that doesn't come from the book.
- **Nobles** only come to the top houses, and they leave if the room is filthy or rough. They're the richest fans and the best partners. A noble guest can bring an offer to back a house, or a seat at the table against Hesk.

**The second baron.** Baroness Varn rules the lowlands below the pass. She's the other side of "working with the boss": if Hesk falls, someone takes the keep, and she wants it to be her. The heroine can **partner with Hesk**, **back Varn against him**, or **give the book to the crown and back neither**. Backing Varn is a cleaner win than partnering with Hesk, but Varn will want the book too once she's in the keep.

Minor named characters: **Garrick Thorne** (bounty hunter, the deserter beat), **Wenna** (27, Ash's sister), and the Lantern's girls **Tamsin** (26), **Odile** (31) and **Bryn** (23).

The three rumours already in the game become one plot: Silas's salt (beat 1) pays for Mara's meeting (beat 3), and Ash (beat 2) knows the garrison. Each betrayal at last call takes one piece off the board.

The widow Hesk already exists in table talk (`tabletalk.ts`), where a farmer courts her with turnips. That fits: she's the Baron's respectable face in the valley.

---

## 6. How each system carries the story

| System | What it means in the story |
|---|---|
| **Gold and the debt** | Paid when Pell comes to collect at a fan beat, never by date. After Act 1 the Baron doubles it, unless she promises him the book |
| **Last call** | The main story choice of each night. Each night has its own trade-offs, and each choice sets a **story flag** that comes back later |
| **Rumours** | Clues to the book and the cast. Hearing them needs her near the right table, so story and service pull on each other |
| **Trust / Heat** | Whether the village stands with her, and how close the Baron is to kicking in the door |
| **Respect** | Whether the fans confide in her. At low respect they still talk in front of her, as if she were furniture |
| **Fame** | How far her name travels. Brings new faces |
| **Fans** | The tavern's fans, fought over with the rivals. Decides the top-tavern crown (section 7) |
| **Lewdness, mind stage** | The heroine becoming Wren the madam. Sets her arc stage (section 4b), which picks how she thinks and how the cast treats her. Unlocks the madam's letters and, at mind stage 2, the lantern |
| **Corruption** | How evil she becomes. Recorded in the Ledger, and its victims come back (section 8) |
| **Willpower** | Refusing to become the madam. Refusing tempted touches and holding back after hours unlock the keeper's letters |
| **The brothel** | The lantern. Gated by lust and the madam's last letter, then shaped by corruption (section 11) |
| **Brawls** | The garrison respects a keeper who can hold her own. Brawls won raise Rhea's soldiers' loyalty and beat the Drowned Rat |
| **After-hours duels and romance** | Lovers are one way to win a piece of the book. Using what they said in bed betrays them |
| **House plans** | The cellar hideout holds Ash. The upstairs rooms are where lovers meet and the Lantern opens |
| **Journal** | Gets a **Letters** tab, a **Book** page showing which pieces she holds, and the **Ledger** |

**Each piece of the book can be won four ways**, so every play style can finish the story:

| Way | Stats it uses | Price |
|---|---|---|
| **Trust** (protect them, keep their secrets) | Trust, Kindness, Protected | Heat goes up |
| **Desire** (become their lover) | Affection, Lewdness | Respect, and a betrayal if she uses what they said in bed |
| **Coin** (buy it) | Gold, Greed | Gold she needed for the debt, and corruption |
| **Fists** (win their faction's respect in a brawl) | Brawl wins, Body | Injuries, the room's mood |

---

## 7. Popularity: the main goal

**Fame** (already built) is how far her name travels, and it brings new faces. **Fans** are the guests who keep coming back to her tavern. **Popularity** is her place on the Pass Ledger, ranked by fans. She competes with the rivals for fans, not fame.

### The story moves by fans, not by nights

The whole story, **Act 1 included**, is **measured in fans**. A beat fires at the start of the first night after she reaches its fan count. Beats fire in order, at most one a night, and each fires only once. So the fastest a player can go is one beat a night, and there is no slowest.

| Stage | Fans | Goal |
|---|---|---|
| **Chapter 1: Tarven** (Act 1 inside it) | 0 → 501 | **The current scope.** Beat the five houses in Tarven and become the first house in the village. Act 1 (the salt, the deserter, the meeting, Pell's price) plays along the way. See "Tarven first" below |
| *Later:* **Climb the pass** (Act 2) | 501 → 1,500 | Win a name on the pass, collect the book, face the pass rivals |
| **Top of the pass** (Act 3) | 1,500 → top house | Beat the rivals on the Ledger. The Baron and the auditor come to the top house |
| **Expand** | After Last Call | Buy the beaten houses and run the pass's taverns (see "Winning" below) |

**The debt is paid at beats, not by date.** Pell collects when a beat brings him to the bar (section 9 finale, then the Act 2 beats), so a slow player is never foreclosed just for taking their time.

### What nights do (small, never the driver)

Nights between beats are free service nights. They keep the tavern alive without pushing the plot:

| Each night brings | Example |
|---|---|
| A **side rumour** from a shuffled pool | Who's courting the widow, a lost goat, a minor smuggling run. Selling or keeping it moves trust, heat and gold a little, never a story flag |
| **Table talk and gossip** about who she has become | The existing gossip and banter, keyed to her stats |
| A **minor visitor** now and then | Wenna, Garrick, Kestrel's party, a chapel brother. Small favours, no main flags |
| **Slow rival growth** (on the pass, later) | Each pass rival gains at most +15 fans a night, so stalling slips her a little on the Ledger but never loses the game |
| **Seasons and weather** | Snow on the pass thins the farmers and brings more fugitives. Flavour and guest mix only |
| **Letters, building, the Lantern** | Letters unlock by milestones (section 10), and House Plans and Lantern nights run every night |

**Nothing ends the run in failure.** No night count, no maxed heat, no missed payment. Going badly brings **debuffs** instead, Karryn's Prison style (`src/game/debuffs.ts`, built):

| What went badly | Debuff | What it does | Lasts |
|---|---|---|---|
| Pell's collection paid short | **In the Baron's Debt** (worse each time, up to 3) | Pay −10% and patience −5% a level | Until she's caught up |
| Heat maxed: the garrison raids in the night (a 20 gold fine, heat back to 4) | **Under Watch** | Patience −15%, pay −5% | 2 nights |
| Willpower gone in an after-hours game (it plays on to the end) | **Overwhelmed** (up to 3) | Saying no costs 20% more willpower, guests reach 10% more, per level | 2 nights |
| A brawl lost (the night still ends) | **Bruised** (up to 2) | Saying no costs 25% more willpower, hold −1, guests reach 15% more | Through the next night |

The only endings are the story's own.

### Replay

The story is short when pushed and wide when explored, so a second run should feel different:
- **Choices branch:** each last call sets flags that change who comes back, which pieces of the book are on offer and which endings are open.
- **Side nights shuffle:** side rumours, minor visitors and table talk are drawn from pools, so no two runs have the same in-between nights.
- **The journal remembers across runs:** endings found, letters read and Ledger victims are kept in a **"What happened"** page, with blanks for the ones not seen yet. This tells the player there's more to find.
- **Four kinds of heroine** (section 4) and three crowns (below) give each run a different shape.

### Every fan has a reason to come

A guest who leaves happy may become a fan. Each one is tagged with what pleased them most that night.

**How fans are earned** (per night, counted at dawn):

| What happened | Fans |
|---|---|
| A guest leaves happy (they bring their household and friends) | +5 |
| A guest leaves delighted (served fast, clean room, a good mood or better) | +10 |
| A guest walks out | −5 |
| The room was filthy at closing | −15 |
| A Lantern guest comes down grinning / satisfied / sour | +10 / +5 / 0 |
| Her own night upstairs, played out: they gave in first / she did (each partner; called off gives nothing; never a brawl winner) | +10 / +5 |

Sex satisfies like a good meal does: a guest who went upstairs happy brings their friends the same way.

A quiet early night gives about 25 fans, and a good busy night 40 to 75. The deserter beat (50 fans) can come as early as night 2.

| Tag | Group |
|---|---|
| Food, Ale, Safety | Keeper |
| Her, Girls | Lantern |
| Secrets, Fights | Network |

- **What they give:** they arrive every night, which gives steady income. They take her side in brawls and stand in the room on the final night.
- **Losing them:** walkouts, a filthy room, and rivals beating her on their tag.
- **Fear-fans:** at crooked corruption or above, new fans come out of fear. They tip more but desert her on the final night.

### Tarven first: the Village Ledger (Chapter 1, the current scope)

Before the pass, she has to win her own village. Tarven has **five houses** that already have their fans. She opens as the **6th of 6**, and beats them one by one, from the smallest to the biggest. When she passes the Copper Bell she is **first in Tarven**, and the chapter ends.

Kept small on purpose, so it's easy to build and balance:
- **The village houses don't grow.** Their fan counts are fixed, so each one is a clear target. Rival growth starts on the pass, later.
- **A house falls when her fans pass its count.** Its boss comes in the next night, and that is the beat.
- **Two choices per fallen house, no buying yet.** Buying and managing houses comes later with the pass.

| # | House | Boss | Fans | Steals | Beat it fairly | Beat it dirty | What its boss gives up |
|---|---|---|---|---|---|---|---|
| 5th | **Hollin's Cider Barn** (farmers drink on credit in his barn) | **Hollin** (55), the seed lender | 100 | Ale | Cheaper ale, and let farmers run a tab | Tell Pell his cider is untaxed | His credit book: half the farmers owe him, and he owes the Baron |
| 4th | **The Bakehouse** (pies and gossip at one long table) | **Goodwife Tansy** (44) | 200 | Food | Better bread and stew, a clean room | Spoil her flour | She knew Wren in the Lantern days: the first hint of what the house used to be |
| 3rd | **The Watch Canteen** (the garrison's drinking room) | **Sergeant Pike** (42) | 300 | Fights, Ale | Win the brawl night against his soldiers | Tell Rhea that Pike sells the garrison's ale | His soldiers talk about the silver wagons (sets `heardSilver` if she missed it) |
| 2nd | **The Toll-Gate Inn** (beds for travellers at the village gate) | **Agnes Crale** (58) | 400 | Safety | Keep travellers and fugitives safe | Tell her guests she reports them, and empty her rooms | She writes down every traveller for Pell. Proof that Pell has eyes everywhere |
| 1st | **The Copper Bell** (the big tavern on the square) | **Jory Bell** (39), the Baron's friend | 500 | Secrets, Ale | Keep secrets better than he does, and win Silas's crew | Expose Pell's office in his back room | Pell's drafts of Wren's debt note: the first proof the debt is forged |

### The five innkeepers (they need models)

Each boss is a named character who stands behind their own bar on the Village Ledger card, and walks into her tavern when their house falls. Each one is a **preset look on the existing bodies** (`male.glb` / `female.glb`): sliders for build and age, a hairstyle, colours, plus **one signature outfit** of their own. They must read as five different people, not one body recoloured (the character-variety rule).

| Innkeeper | Body | Build and age | Hair and face | Signature outfit | New pieces needed |
|---|---|---|---|---|---|
| **Hollin** (55) | Male | Heavy-set, a little stooped, short | Grey, thinning on top, full grey beard | Farmer's smock over a brown waistcoat, a credit book and pencil on a cord at his belt | Full beard, stoop posture, the smock outfit |
| **Goodwife Tansy** (44) | Female | Round and strong, broad arms | Brown bun under a kerchief, rosy cheeks | Rolled sleeves, a flour-dusted apron over a russet dress | Kerchief, flour dusting on the apron, the baker outfit |
| **Sergeant Pike** (42) | Male | Broad and tall, thick neck | Buzz cut, heavy moustache, a scar on one cheek | The garrison's colours and badge (knight kit faction, no helmet), sergeant's sash | Moustache, scar decal. Outfit from `knight_kit.py` |
| **Agnes Crale** (58) | Female | Tall and thin, straight-backed | Iron-grey hair in a tight bun, spectacles | High-collared dark dress, a ring of keys and a traveller's register at her hip | Spectacles, the keys and register, the dress outfit |
| **Jory Bell** (39) | Male | Slim, polished | Dark hair slicked back into a short tail, trimmed goatee | Burgundy waistcoat with a copper bell pin, white shirt, rings | Goatee, the bell pin, the waistcoat outfit |

**Shared new pieces** (built once, reused by guests later too): beards and moustaches (full, moustache, goatee) as male hair meshes, spectacles, a kerchief, and a stoop posture. New outfits go in `tools/blender/build_world.py` as guest-only, like the faction outfits. Each innkeeper outfit only needs the body they use.

**When a house falls,** its boss comes to her the next night:

| Choice | What she gets | Price | The boss |
|---|---|---|---|
| **Partner** | A little gold every night, and the house sends her fans of its tag. She gets the clue above | Trust +1 | Stays friendly, and may help her later |
| **Ruin** | The house closes, and half its fans come to her. She gets the clue above | Corruption, heat, and a Ledger entry with the boss as the victim | Holds a grudge, and may come back |

### Chapter 1, beat by beat

Every beat fires on fans, at most one a night, in this order:

| Fans | Beat | Rank after |
|---|---|---|
| 0 | **The salt** (section 9) | 6th |
| 50 | **The deserter** | 6th |
| 101 | **Hollin's Cider Barn falls.** Hollin comes in | 5th |
| 150 | **The meeting** | 5th |
| 201 | **The Bakehouse falls.** Tansy comes in | 4th |
| 250 | **Pell at dawn** (the Act 1 finale). The debt doubles to 300 unless she promises the book | 4th |
| 301 | **The Watch Canteen falls.** A brawl night with Pike's soldiers. Pell collects the **first 100** | 3rd |
| 401 | **The Toll-Gate Inn falls.** Agnes comes in. Pell collects the **second 100** | 2nd |
| 501 | **The Copper Bell falls: first in Tarven.** Jory comes in. Pell collects the **last 100** and asks for the book again. Riders from the Gilded Stag hand out cards at the door: the pass has noticed her | 1st |

If she promised Pell the book, he doesn't collect. He asks where it is instead, and his patience gets shorter each time.

**How Chapter 1 ends (the current build):** at 501 fans, a **"First in Tarven"** card is read at dawn. It changes with her biggest fan group (Keeper or Network) and her Act 1 flags (Mara free, Ash hidden, Oden's chapel open). Then comes a "To be continued: the pass" teaser, and the nights go on. Nothing ends the run early: missed collections and maxed heat bring debuffs (section 7, "What nights do").

**Built (Chapter 1 core, `src/game/ledger.ts`):** fans counted at dawn (+5 happy, +10 delighted, −5 walkout, −15 filthy room); the Village Ledger with the five houses; beats by fans, one a morning, in order (the three written nights as beats, side nights between them with a pool of side rumours); a fallen house's boss at the door in the morning with Partner (+1 trust; +3 gold and +5 fans a night) or Ruin (+10 corruption, +1 heat, half its fans), and their clue either way; the house above her fighting back on some nights (poaching two walk-ins, talk in the square, a hired troublemaker); Pell at dawn at 250 (promise the book, or the debt doubles to 300) and his collections of 100 at 301, 401 and 501 (shortfalls carried over), then every 7 nights while anything's owed; the First in Tarven card at 501. The journal's Ledger page shows it all. **Also built:** Act 1's story flags and the card's lines for them (section 9). **Not yet:** fan tags and the biggest-group variants of the card, Wren's letters beyond the first, the innkeepers' models (they're cards for now), and bosses walking in at night rather than at the morning card.

### The pass rivals (later, after Tarven)

| Rival | Steals | Starting fans | Beat it fairly | Beat it dirty |
|---|---|---|---|---|
| **The Gilded Stag** (respectable inn in the valley) | Food, Safety | 1,200 | Respect, good food, protecting guests | Poison its ale, expose its silver early |
| **The Velvet House** (the brothel that rose when the Lantern closed) | Her, Girls | 1,000 | Better terms, girls who choose to move | Burn it, blackmail its clients |
| **The Drowned Rat** (river dive) | Fights, Ale | 800 | Win brawls, win Silas's crew | Inform on Grig to the garrison |

All three start above the 501 fans that end Chapter 1, so she arrives on the pass in 4th place. Dirty tactics win fans faster, but each one raises corruption and heat and goes in the Ledger.

### The Pass Ledger

The journal always shows the live ranking. A **Ledger card** is also read at dawn at three moments: when she reaches **1,000 fans**, when she reaches **1,500 fans** (end of Act 2), and after **Last Call** (final). On the final card, her largest group of fans decides which crown she wears:

- **Keeper's crown:** mostly Food, Ale and Safety fans.
- **Lantern crown:** mostly Her and Girls fans.
- **Network crown:** mostly Secrets and Fights fans.

### Winning a rival: buy, partner or ruin

A rival is beaten when it falls to the bottom of the Pass Ledger, or loses its showdown (the rival night, Act 3). Its boss then comes to her. She has three choices:

| Choice | Price | What she gets | The boss |
|---|---|---|---|
| **Buy it out** | Gold | The house and its fans. She puts a manager in | Leaves the pass |
| **Partner** | A share of the takings | The house, its fans and its boss's skills, as a partner | Stays on as the manager, loyal while she's fair |
| **Ruin it** | Corruption and heat (Ledger entry) | Its fans scatter, and most go to her | Becomes an enemy who may come back |

Each house she owns keeps its own speciality and adds its fans to her count:

| House | Speciality once she owns it | Partnered boss brings |
|---|---|---|
| **The Gilded Stag** | Food and Safety fans, respectability, the valley trade | The widow Hesk's ties to the keep, and what she knows about the silver |
| **The Velvet House** | Her and Girls fans, a second Lantern | Sabine's girls and clients, and the truth about the night Wren died |
| **The Drowned Rat** | Fights and Ale fans, the river and its smuggling | Grig's garrison contacts, and Silas's routes made whole |

A partnered boss can still betray a rotten owner. The way she treats partners follows the same corruption rules as her girls.

### Working with the Baron

Once she is the top house and holds enough of the book, she has a choice the old story never gave: **beat the Baron, or work with him.**

- **Partnership:** she keeps the book shut, and the Baron backs her houses. He grants licences, lowers her tolls and keeps the garrison off her doors. She owns the pass's taverns, and he keeps his keep.
- **The price:** someone has to answer for Wren. Pell is handed over, or the partnership is built on her grandmother's murder (a Ledger entry). The village and Rhea see it as a betrayal unless she uses the partnership to protect them.
- **The leverage stays hers.** She never gives up the book, which is the difference from Bought and Sold. And the house rule still holds: he is a partner, never a client.

### More taverns later

After Last Call the game can go on in an **Expand** mode. More houses open down the road (a ferry inn, a mountain lodge, a bathhouse), each one with a boss to beat, buy or partner with. Her name, fans and partners carry over. This is the long-term game once the story is over.

---

## 8. Corruption and the Ledger

Corruption measures how evil she has become, and the player is answerable for it. Wren's red book recorded other people's sins. The heroine's journal keeps a **Ledger** of hers: every corrupt act, with a named victim. **Victims come back.**

| Tier | Corruption | What changes |
|---|---|---|
| **Honest** | 0–39 | Guests trust her word |
| **Shady** | 40–79 | Smugglers wink, farmers wonder |
| **Crooked** | 80–149 | Dark choices open. Fear-fans start |
| **Rotten** | 150+ | Wren's warning letter. The New Baron ending is in reach |

"Crooked" at 80 and "rotten" at 150 already appear in `tavern.ts`. This only adds the two lower tiers.

### What comes back

| Deed | Victim | What comes back |
|---|---|---|
| Sold the salt (beat 1) | Silas | He starts a brawl the next night. His crew's bottle prices go up |
| Gave up Ash | Ash | His sister Wenna comes in at the midpoint (The poison) and asks whether you knew him |
| Mara arrested | The farmers | A boycott: her Food fans move to the Stag |
| Turned a beggar out into the snow | A stranger | Oden buries him and stops trusting her |
| Poisoned the Stag's ale | Three guests | If the auditor lodges at the Stag, he hears about it |
| Kept her girls' share | The Lantern's girls | One walks to the Velvet House and talks |
| Blackmailed a client | A named fan | He becomes a fear-fan and turns on her at the end |

### Coming back from it

Corruption only goes down through acts that cost something. Never for free:
- **Confess to Oden:** corruption down, at a cost in respect and heat.
- **Free someone she sold:** costs gold for the bribe, and heat.
- **Pay a victim back:** costs gold she needed for the debt.

---

## 9. Act 1: The Inheritance (0 → 250 fans, inside Chapter 1)

Act 1 keeps the three built nights as its first three **beats**. Speakers get names, each last call gets its own trade-offs, and the act ends on a twist instead of a plain ending.

| Fans | Beat |
|---|---|
| 0 (the first night) | The salt |
| 50 | The deserter |
| 150 | The meeting |
| 250 | Act 1 finale: Pell at dawn |

These are woven into Chapter 1 with the first two village houses (section 7, "Chapter 1, beat by beat"). A player who earns fans fast plays them on nights 1 to 6. A slower player gets side nights in between. "Next night" below means the next beat night.

**Built** (`tavern.ts` `NIGHTS`, `src/game/plot.ts`, `tests/plot.test.ts`, 14 Nov 2026):
- **Named last calls:** Pell, Garrick Thorne and Captain Rhea Vance, with the numbers in the tables below. Selling no longer lowers heat; only telling the truth does.
- **Story flags**, saved with the story (`TavernSave.story.flags`; older saves start with none): `odenShut`, `silasOwes`, `silasAngry` (and `silasCame` once he has), `ashCaught`, `ashHidden`, `maraArrested`, `rheaDoubts`, `heardSilver`. Each is set by its choice, and the dawn report says what came of it. Side nights never set one.
- **The two new choices:** *Hide him in the cellar* (heat +2, trust +2) is offered when she lied for Silas at the salt beat or her Kindness is 2+. *Tell her where the baron's silver goes* (heat +1) is offered when she has `heardSilver`: from drinking with the soldiers on the deserter night (their gossip is the clue), or from beating the Watch Canteen. Both count as protecting someone. Each choice now carries its deed (inform, protect, sell), so passives read the deed, not the button's place.
- **What comes back:** the night after she sells the salt, Silas walks in angry and starts a brawl (once). Lying for him leaves a crate of salt: every stew pays +1. Crossing his crew (selling, or giving up Oden's floor) puts bottles up by 5 gold. The meeting night opens with talk of Ash (to hang, or quiet in the cellar) and of Oden's dark chapel. The First in Tarven card says whether Mara's free, Ash is hidden or hanged, Oden's bell rings, and Rhea has her doubts.

**Not yet:** the guests at the tables aren't named (the speech bubbles show their type). That needs guests with names of their own, which comes with the named regulars (section 15, 10f). Mara arrested closes The Village Rises only as a flag for now, because no ending is played yet. The "Lie: send him down the valley" choice sets no flag, so Ash's return in Act 2 is still to write.

### Beat 1: The salt

- **Who's in:** Mara Holt and a neighbour (the farmer table), Silas Crowe (the rumour guest), a soldier.
- **Rumour:** Silas tells Mara the salt is safe *"under Oden's floor"*.
- **Last call:** **Pell**, the tax collector. He looks around the bar a little too long. *"Wren and I were old friends."*

| Choice | Effect | What it changes later |
|---|---|---|
| Tell the truth: the chapel floor | +5 gold, Heat −2, Trust −3 | Oden is fined and the chapel is shut. He stops coming in. Silas's prices for bottles go up |
| Lie: send him to the quarry | Heat +1, Trust +2 | Silas leaves a crate of salt: stew sells for more from the next night |
| Sell it | +25 gold, Trust −2 | Only three people knew. On the next night Silas works out who talked and starts a **brawl** |
| (didn't hear) Say nothing / make something up | as now | |

### Beat 2: The deserter (50 fans)

- **Who's in:** Ash and Silas at one table, two of Rhea's soldiers at another ("the Baron's short of silver" stays: it is the first clue).
- **Rumour:** Ash whispers he deserted and crosses the border at dawn.
- **Last call:** a bounty hunter, **Garrick Thorne**.

| Choice | Effect | What it changes later |
|---|---|---|
| Tell the truth: the border, at dawn | +10 gold (the bounty), Heat −2, Trust −2 | Ash is caught. At the meeting Rhea mentions he'll hang. The father thread goes through the cells instead |
| Lie: send him down the valley | Heat +1, Trust +1 | Ash gets away. He may return in Act 2 |
| **New: hide him in the cellar** (only if she protected someone at the salt beat, or Kindness ≥ 2) | Heat +2, Trust +2 | Ash stays in the cellar. At dawn he tells her he knew a man in the east with her face |
| Sell it | +25 gold, Trust −2 | Ash is caught |

### Beat 3: The meeting (150 fans)

- **Who's in:** Mara with an old farmer and Silas (if he's still friendly), and Rhea's soldiers ("half the garrison wouldn't lift a sword" stays).
- **Rumour:** Mara is gathering the village at the mill the night after the debt falls due.
- **Last call:** **Captain Rhea Vance** herself, not a nameless captain. She asks, but she half hopes she won't get an answer.

| Choice | Effect | What it changes later |
|---|---|---|
| Tell the truth: the old mill | Heat −3, Trust −3 | Mara is arrested. **The Village Rises ending is closed for good** |
| Lie: the north road ruins | Heat +2, Trust +2 | The garrison marches into the snow |
| **New: tell Rhea where the Baron's silver goes** (only if she heard the soldiers' gossip at the deserter beat) | Heat +1 | Rhea doesn't march. She leaves shaken. Rhea's route and the garrison's doubts begin |
| Sell it | +25 gold, Trust −2 | Mara is arrested |

### Act 1 finale: Pell at dawn (250 fans)

The debt falls due here, at 250 fans, not on a set night. Pell comes in at dawn to collect, and names the real price:

> *"Keep your hundred and fifty. The Baron wants the book your grandmother kept. Bring it to him and the debt is forgotten. Hide it, and the debt doubles."*

| She has | What happens |
|---|---|
| 150 gold or more | She can pay, and the Baron still wants the book. The debt doubles to 300 anyway unless she promises it |
| Less than 150 | She promises the book (debt "forgotten" for now), or takes the doubled debt in instalments |

Then she finds **Wren's first letter**, hidden in the hollow leg of the bar stool Wren always sat on:

> *"If Pell is asking you about my book, then I'm already dead, and it wasn't my heart. Don't drink anything he pours."*

**In the current build:** Pell comes at dawn at 250 fans with this choice, and she finds Wren's first letter after. Nothing ends the run: the debt is collected at the chapter's later beats, and short payments bring the debt debuff (section 7).

---

## 10. Wren's letters

Letters are the story's reward for playing the systems. Each one unlocks at a milestone and appears at dawn, found somewhere in the tavern. **No set is the wrong one.**

**The madam's letters** (lewdness):

| Unlocks at | Wren writes about |
|---|---|
| First touch she lets happen | The first man who put his hand on her hip at this bar. She slapped him. *"The second time, I didn't."* |
| Mind stage 1 (warming) | How the room changes when they know you might say yes |
| First after-hours duel | What men say afterwards, and why she started writing it down |
| Mind stage 2 (eager) | The Red Lantern's best years, and what it cost her with the chapel |
| Mind stage 3 (filthy) | Where the red lantern is hidden in the cellar. *"Hang it, and they'll know what this house is again."* |

**The keeper's letters** (willpower, trust and respect):

| Unlocks at | Wren writes about |
|---|---|
| First tempted touch she refuses | *"Wanting it and saying no anyway is the strongest thing you'll ever do behind this bar."* |
| A brawl won | The night she threw the Baron's father out into the snow |
| Trust reaches half | Why she took the lantern down |
| Protecting someone at last call three times | The names she never wrote in the book |
| Willpower kept above half for 5 nights in a row | Grandfather, and why she chose him |

**The warning letter** (corruption reaches rotten): what the book turned Wren into, and what it cost Father. *"I kept the secrets so long I forgot whose they were."*

**Story letters** (fixed beats): Act 1 finale (Pell), the midpoint (the poison and the forged debt), and Father's letter in Act 3.

**Open:** the madam's last letter unlocks at mind stage 3, but the lantern gate in section 11 is mind stage 2. Either move that letter to stage 2, or make the gate stage 3. **Proposed** (section 4b, "Wren is the mirror"): move it to Willing, which starts at Lewdness 54, next to the lantern's lewdness-50 gate. Section 4b also lines each letter up with the stage it answers.

---

## 11. Act 2: The Red Book (later, after Tarven: 501 → 1,500 fans)

> **Later.** Not part of the current scope. Act 2 starts after Chapter 1 ends at 501 fans. The fan numbers below are from before the Tarven chapter and will be redone when we get there. Some of its beats may move into Tarven (Sabine's visit, Oden and the poison).

The debt is 300, paid in three instalments of 100 that Pell collects in Chapter 1 (at the Watch Canteen, the Toll-Gate Inn and the Copper Bell), or "forgotten" if she promises Pell the book. Missing one carries the shortfall into the next instalment and puts her in the Baron's debt (a debuff); it never ends the run. The rivals open their doors. Each beat carries a rumour about one piece of the book, won one of the four ways (section 6). Upstairs rooms open in House Plans. Nights between beats are free service nights, with the usual rumours and table talk.

| Fans | Beat | What happens |
|---|---|---|
| 600 | New terms | Pell's visit sets the terms. A runner from the Gilded Stag hands out cards for cheaper ale: the rivals arrive, and Fans appear on the HUD. Rumour: Oden's lock and key |
| 700 | The velvet card | Sabine Marrow drinks at the bar and sizes her up. She offers to buy the tavern, or a partnership. She knew Wren, and it shows. Rumour: Mara's pages |
| 850 | The poison | **Midpoint.** Oden tells her what he saw the night Wren died (Silas tells it if Oden was betrayed). New last-call choice: **pour Pell a drink of her own**. It removes Pell for good, the Baron comes sooner (heat jumps), and it goes in the Ledger |
| 1,000 | The first Ledger | Grig's men come to break her furniture: a brawl night. Silas's piece is on offer to whoever holds the room. At dawn, the first Pass Ledger card |
| 1,150 | The inspection | The widow Hesk inspects the tavern "on behalf of the innkeepers' guild". A clean, respectable house wins Food and Safety fans from the Stag |
| 1,300 | The turn | Ash comes back, or a letter from the east arrives: Father is alive in the keep's cells. The Baron doubles the road toll, guests thin out everywhere, and every rival gets desperate |

**The lantern isn't on the fan track.** It is offered on the first night after its gate is met (mind stage 2 and the madam's last letter), at any point from Act 2 on. See section 12.

At **1,500 fans**, Act 2 ends with the second Ledger card.

**Story flags from Act 1 come back:** a shut chapel means Oden's piece must be bought from the Baron's men. A caught Ash means Father's trail runs through the keep's cells, reached through Rhea's route.

---

## 12. The Lantern arc (the brothel path)

> **Stage I is built** (the unlock, the lantern, lit or dark nights, one room, Tamsin, the booking card, house rules, corruption drift and the dawn line). Stages II to IV and beats L1, L2, L4 and L5 are **later**. See "What's built now" below.

**The gate changes** from "corruption 100" to **lewdness 50 or corruption 50**, whichever comes first. Lust or greed can open the path, and corruption decides what kind of madam she is. (Done in `tavern.ts` `unlockBrothel()`. Finding the lantern is still to add as the story moment that hangs it.)

| Beat | What happens |
|---|---|
| **L1. The lantern goes up** | Oden stops coming in, and her Food and Safety fans wobble. Soldiers and smugglers flood in. Her and Girls fans grow fast |
| **L2. The licence** | Pell offers the Baron's licence: he'd rather tax a brothel than fight one. The price is a cut, or the book. A crooked madam can pay in other people's secrets |
| **L3. The girls** | Three adult women ask for work, each by choice and with her own reason: Tamsin (26), unpaid at the Velvet House; Odile (31), a widow with a debt of her own; Bryn (23), a farmer's daughter who wants out of the valley. A fair madam pays their share and throws rough guests out. A rotten one keeps the share and looks away |
| **L4. The Velvet war** | Sabine fights back with poached girls, rumours and a rough crew. Fair: better terms, so her girls choose to move. Dirty: fire or blackmail. Deal: a partnership, sharing the pass |
| **L5. Who keeps the lantern** | She takes the Velvet House, merges with it, or burns it. A rotten madam's girls can turn on her instead, the way Sabine turned on Wren |

One line that doesn't move: **the Baron is leverage, never a client.** She doesn't sleep with him to win.

### How the Lantern runs (the brothel setup)

**What's built now (Stage I, "A lamp in the window"):** the unlock flag (`houseMode` in `tavern.ts`), the "[Brothel]" label on the HUD, and Stage I of the Lantern in `src/game/lantern.ts` (rules) and `src/game/lanternplans.ts` (House Plans rows):
- **Builds:** the lantern (30 gold, once the brothel is open) and the plain upstairs room (15 gold). Tamsin asks for work as the lantern is hung (beat L3, Stage I part). Finding the lantern as a story moment is still to add.
- **Lit or dark:** a switch on House Plans, set by day, which stays as she left it. A lit night costs 1 respect and adds 1 heat (no licence yet), and about half the farmers walking in alone stay away, with soldiers, smugglers and adventurers coming in their place (parties and the rumour carrier come as planned). Fame comes from happy bookings. Farmers' trust and chapel standing aren't touched yet, and there's no fans count to tag.
- **Tamsin (26):** appeal 6, charm 6, stamina 4, loyalty 55, knack soldiers, corruption 45 (shady), resolve 5. Her lewdness is 1 per 3 bookings plus 2 per booking she enjoyed (8+ satisfaction with a soldier), with the heroine's mind-stage thresholds. No girl passives yet.
- **A Lantern night:** a lustful guest she's just served may ask for company. The booking card shows the girl (knack, stamina left), the room and the price (10 + half her appeal: 13 gold). The madam sends them up or turns them away; **then Tamsin decides**, and her no ends it (no option to press her). The booking runs off screen for 25 seconds with the room busy; the guest comes down and pays, with a tip above 6 satisfaction (charm + room + 2 for her knack, less tiredness, rough or drunk). Last call waits for the room. The heroine is never part of a booking, and her own invitations are unchanged. The Baron is excluded as a client (`NEVER_CLIENTS`).
- **House rules:** the cut (half or a quarter to her), rough guests (angry guests and brutes shown the door, or kept: she's likelier to refuse, loyalty -4), rest (a night off once her stamina's spent, or worked tired: -2 satisfaction, -2 loyalty, a 25% chance she's ill the next night), drunk guests (turned away from the stairs, or let up: they ask sooner, and may draw 1 heat). Greedy rules also cost loyalty each lit night and add 1 to the madam's corruption each. At loyalty 0 she quits for the Velvet House.
- **Corruption drift:** each lit night, a tenth of the gap to the madam's, times (1 − resolve × 0.05), half speed falling, plus 3 per greedy rule in force.
- **Dawn line:** bookings, room takings, the girls' cut, each girl's mood (happy, steady, worn out, resentful, ill, gone) with loyalty and tier, and any trouble.
- **Saves:** `TavernSave.lantern` (optional; older saves load with no lantern).

**Not built yet:** the doorman (a rough guest is seen out by the madam herself, with no brawl), the licence, Lantern trouble events beyond a drunk's noise, girl tier behaviours (purse-lifting, secrets, skimming), girl passives, more rooms and girls, and the Lantern's own fans tags.

#### Lit or dark

Once the lantern is hung, she chooses each evening in House Plans whether **the lantern is lit**:

| | Dark (tavern night) | Lit (Lantern night) |
|---|---|---|
| Who comes | The normal mix | More soldiers, adventurers, smugglers and nobles. Fewer farmers, and no chapel folk |
| Gold | Food and drink | Food and drink, plus room bookings |
| Respect, chapel standing | Unchanged | Down a little each lit night |
| Heat | Unchanged | Up, unless she holds the Baron's licence |
| Fans | Food, Ale, Safety tags | Her, Girls tags |

This keeps the keeper path open after the lantern is hung. She can run both kinds of night and balance them.

#### The house (House Plans)

| Build | Unlocks | What it does |
|---|---|---|
| **The lantern** | Story (the madam's last letter) | Lets her light the house |
| **Upstairs room** (plain) | Lantern hung | One booking at a time. Cheap |
| **Parlour** | 2 rooms | Sofas where guests wait for a room. Without it, waiting guests lose patience |
| **Good room** | Gold | Higher price, happier guests |
| **The Red Room** (Wren's old room) | Lantern stage 3 | The best room. Nobles only ask for this one |
| **Bathhouse** | Gold, late | Raises every room's satisfaction. Stamina recovers faster |
| **Doorman's stool** | A hired doorman, or her own brawl wins | Throws out rough guests before trouble starts |

#### The girls

The girls are adult workers who chose the work (section 12, L3). More ask to join as the Lantern's fame grows, or when a rival house falls. Each girl has:

| Stat | Meaning |
|---|---|
| **Appeal** | How many guests ask for her |
| **Charm** | How happy guests come down. Satisfaction, tips, Girls fans |
| **Stamina** | How many bookings she can take before she needs a night off |
| **Loyalty** | Whether she stays, defends the house, or walks to the Velvet House |
| **Knack** | The guest faction she's best with (soldiers, nobles, adventurers and so on) |
| **Corruption** | How crooked she has become. It drifts toward the madam's (see "Corruption spreads" below) |
| **Resolve** | How slowly her corruption drifts. Stubborn girls hold out longer |
| **Lewdness** | Her own slut level, worked out from her own nights the way the heroine's is (see "Her lewdness" below) |

**Fixed and not negotiable:** any girl can refuse any guest, and can quit. The madam's choices are about **money and protection**, never consent:

| House rule she sets | Fair choice | Greedy choice |
|---|---|---|
| **The cut** | Half to the girl | Most to the house. More gold, loyalty down, corruption up |
| **Rough guests** | Thrown out (needs a doorman or a brawl) | Kept for the coin. Loyalty down, corruption up |
| **Rest** | A night off when stamina runs out | Worked tired. Charm down, a girl may fall ill |
| **Drunk guests** | Turned away from the stairs | Let up. More bookings, more trouble |

A fair house earns less early on but keeps its girls, and loyal girls stand with her in the Velvet war and on the final night. A greedy house earns more and loses them, which leads toward The Lantern Burns.

#### Corruption spreads

The madam sets the tone of the house. **As her corruption rises, her girls' corruption rises with it.**

- **The drift:** every lit night, each girl's corruption moves toward the madam's. It closes about a tenth of the gap, slowed by her Resolve. Rising is easy and falling is slow: when the madam is cleaner than a girl, the girl's corruption falls at half speed.
- **Greedy house rules push harder:** each lit night with a greedy rule (a big cut, rough guests kept, tired girls worked) adds corruption to every girl directly, on top of the drift.
- **Starting points:** Tamsin starts shady (she learned at the Velvet House), Odile honest, and Bryn honest but with low Resolve.

A girl uses the same four tiers as the madam (section 8), and each tier changes what she does:

| Her tier | What she does | Good for the madam | Bad for the madam |
|---|---|---|---|
| **Honest** | Works fair, refuses dirty jobs | Loyal, and guests trust her | If the madam is crooked or worse, she may quit |
| **Shady** | Upsells drinks, hears more than she says | Tips up, a few Secrets fans | Little yet |
| **Crooked** | Lifts purses from drunk guests and sells clients' secrets to the madam. Takes dirty jobs against rivals | Gold, information (Informed), a ready hand for sabotage | Heat up, robbed guests leave as fans of a rival, and each job goes in the Ledger with her name beside the madam's |
| **Rotten** | Skims from the house, and sells the madam's secrets to Pell or Sabine | Ruthless and fearless | She may walk out to start her own house and take fans with her, the way Sabine left Wren |

**It reaches the other houses too.** Managers and partner bosses in the houses she owns (section 7) drift toward her corruption the same way. A rotten owner ends up running a rotten chain.

**Turning a house around** is slow. She has to bring her own corruption down (section 8) and switch to fair house rules, and then the girls follow at half speed. She can also let a rotten girl go, which costs her fans and risks a grudge.

**Endings:** a rotten house that turns on its madam is **The Lantern Burns**. A rotten house that stays loyal out of fear is part of **The New Baron**.

#### Her lewdness (each girl's slut level)

Each girl has her own **Lewdness**, built like the heroine's (PASSIVES_DESIGN.md, "Lewdness"). It isn't raised directly. It's **worked out from her own records**:
- 1 for every 3 bookings she has taken,
- 2 for every booking she enjoyed (a booking with high satisfaction and a guest of her knack),
- the lewd points of her own passives (a small set for the girls, earned from her own records, such as *Garrison Favourite* or *Red Room Regular*).

Her mind stage uses the same thresholds as the heroine's (warming, eager, filthy), and it changes how she works:

| Her stage | What changes |
|---|---|
| **0 (new)** | Takes plain bookings only. Shy with rough or drunk guests |
| **1 (warming)** | Appeal up. Flirts at the tables and brings in bookings herself |
| **2 (eager)** | Takes bolder bookings at higher prices. Asks to work dark nights too |
| **3 (filthy)** | The house's star, and the most-asked-for girl. Stamina drains faster, and Sabine will pay a lot to poach her |

**How the madam's house shapes it, without forcing it:**
- **The house's tone:** the madam's own mind stage sets how bold the Lantern is. A bolder house draws bolder guests and pays more, so girls gain experience faster, if they choose to take the bookings.
- **Who applies:** a famous Lantern attracts girls who start with higher lewdness. A quiet one attracts beginners.
- **Never forced:** at any lewdness, a girl can still refuse any guest and can quit. The madam can't raise a girl's lewdness with an order, only offer her the work.

**Lewdness and corruption together** give four kinds of girl, the same way they do for the heroine:

| | Low corruption | High corruption |
|---|---|---|
| **Low lewdness** | **The quiet one.** Honest, shy, loyal. Steady but small takings | **The spy.** Takes few bookings, hears everything, sells it |
| **High lewdness** | **The house favourite.** Honest and bold. The best fans come for her | **The next Sabine.** Bold, rotten, ambitious. The biggest earner, and the most likely to leave and start her own house |

#### A Lantern night

1. Service runs as normal. She still pours, cooks and cleans.
2. A lustful guest asks for company. A **booking card** opens: which girl (her knack and stamina), which room, and the price.
3. The room's door lamp lights while it's busy. Bookings happen off screen, with a timer and no scenes.
4. The guest comes down and pays. Satisfaction depends on the girl's charm and the room. A happy guest may become a **Girls** fan.
5. **Trouble** can break out: a rough guest (doorman or brawl), a jealous fan, Oden at the door, Sabine's runner poaching, or an unlicensed raid when heat is high.
6. **Her own invitations** work as they do now (the upstairs invitations in PASSIVES_DESIGN.md). Being the madam doesn't oblige her to anything. *Mistress of the Upstairs Room* and *The Back Stairs* still count only her own nights.

At dawn, the report adds a Lantern line: bookings, room takings, the girls' cut, each girl's mood, and any trouble.

#### Growing the Lantern

| Stage | Rooms | Girls | Opens |
|---|---|---|---|
| **I. A lamp in the window** **[built]** | 1 | 1 | Lantern nights, the booking card |
| **II. The parlour** | 3 | 3 | Parlour, good rooms, the licence offer (L2) |
| **III. The Red Lantern** | 4 + the Red Room | 5 | Nobles, the bathhouse, the Velvet war (L4) |
| **IV. Two lanterns** | — | — | Owning the Velvet House as a second Lantern (section 7) |

#### What it does to her stats

- **Gold, fame:** up on lit nights.
- **Respect, chapel and farmers' trust:** down a little each lit night.
- **Heat:** up on lit nights, unless she holds the licence.
- **Corruption:** running the Lantern doesn't raise it on its own. Only the greedy choices do. A fair madam can stay honest.
- **Lewdness:** unchanged by the girls' bookings. Only her own choices move it.

---

## 13. Act 3: Last Call (later: 1,500 fans → top house)

| Fans | Beat | What happens |
|---|---|---|
| 1,500 | Father's trail | Getting the last pages means reaching Father in the cells. That needs Rhea's route, Silas's tunnels, Kestrel's adventurers (hired), or Pell's price |
| 1,750 | The rival night | The showdown with whichever rival is closest to her on the Ledger: expose the Stag, take the Velvet House, or break the Rat |
| 2,000 | The auditor | The crown's auditor arrives, travelling as a minor noble, and lodges at the top house. Baroness Varn arrives the same night to court him. If that isn't her tavern, she has to get him through her door some other way |
| next night | The last offer | The Baron's final terms, through Pell if he's alive. If he isn't, the widow Hesk brings them. If she is the top house and holds enough of the book, the offer is a **partnership** instead of a threat (section 7) |
| next night | Last call | A normal service night with Baron Hesk at the back table. Every guest in the room is someone her choices sent there: fans, Rhea's soldiers, Silas's crew, Mara's farmers, her girls. At last call the Baron asks for the book. The final Pass Ledger is read at dawn |

---

## 14. Endings

| Ending | Needs | Epilogue |
|---|---|---|
| **The Village Rises** | Keeper's crown, Mara free, Trust high, the book to the auditor | The Baron hangs. The tavern becomes the village's meeting hall |
| **The Red Lantern** | Lantern crown, corruption crooked or lower, the book kept | The pass's most famous house, and the Baron can't touch it |
| **Wren's Heir** | Network crown, Informed high, the book kept | Spymaster of the pass, exactly like Grandma |
| **The New Baron** | Top tavern, rotten corruption | She wins the pass and becomes what she fought. The auditor dines with her |
| **Master of the Pass** | Top house at the final Ledger, and owns at least two rival houses (bought or partnered) | Every tavern on the pass answers to her. This opens Expand mode |
| **The Baron's Partner** | Top house, the book kept, the partnership accepted | She runs the pass's houses under his protection. If she shielded the village, it's an uneasy peace. If she didn't, it's the start of a new tyranny |
| **The Baroness's House** | Top house, the book used to put Baroness Varn in Hesk's keep | Hesk hangs, Varn rules the pass, and the heroine is her favoured house. Varn starts asking about the book |
| **Bought and Sold** | The book given to the Baron | Debt forgiven, tavern kept, and everyone she protected pays |
| **The Lantern Burns** | Lantern hung, rotten, her girls turned | Sabine's story, told again with her name on it |
| **Lovers' endings** (one per route) | A lover's route finished | Their faction stands with her at the climax |
| **Paid in Full** | Gold ≥ debt, no book | The tavern is hers, and the Baron is still watching |
| **Lost to the Night** | Mind stage 3, low respect, gold and fans, no lantern | A cautionary epilogue: the room owns her name, not her |
| ~~Foreclosed~~ | Removed (2.12): missed collections bring the In the Baron's Debt debuff instead | |
| ~~Arrested~~ | Removed (2.12): maxed heat brings a raid and the Under Watch debuff instead | |

---

## 15. Changes in code

**Fixes to existing code:**
1. ~~**Mind stage reads lewdness only.**~~ Done: `mindStage()` in `lewd.ts` reads Lewdness alone (20 / 54 / 107), for the heroine and the Lantern's girls.
2. **The brothel gate.** Done: `tavern.ts` `unlockBrothel()` opens the brothel at lewdness 50 or corruption 50, checked as corruption shifts and as passives are earned.
3. ~~**The intro.**~~ Done: the rewritten script from section 2 is in `story.ts` `INTRO`.
4. **Names and clashes.** Done: the last-call visitors are named in `NIGHTS` (the meeting's captain is Rhea), and the "forty years" gossip line in `gossip.ts` now hints at the Lantern. Still to do: name the guests at the tables (Silas, Mara, Ash), which needs the named-regulars work (10f).

**New for Act 1:**

5. **`src/game/plot.ts`:** Done for the story flags (saved in the story part of the save). Still to do: Wren's letters with their unlock checks.
6. ~~**`NIGHTS`:**~~ Done: the rewritten rumours, a last call per night with its own numbers, the two new conditional choices, and the flag each choice sets.
7. ~~**Flags change the next night:**~~ Done: Silas's brawl, Ash in the cellar, the meeting night's talk, bottle and stew prices. Oden isn't a guest yet, so "Oden gone" is the dawn line and the dark chapel.
8. **`story.ts`:** the Act 1 finale scene with Pell and Wren's first letter.
9. **Dawn and journal:** a found letter shows on the morning card. The journal gets Letters and Ledger tabs.
10. **Endings:** The Village Rises needs Mara free. Kept, Lost and Overthrow end on the "To be continued" teaser.

**Her arc (section 4b):**

10a. ~~**`arcStage()` in `lewd.ts`:**~~ Done. Sheltered / Curious / Willing / Known from Lewdness (after fix 1), *The Back Stairs* and `records.kinds`. Every writing pool below picks by it.
10b. ~~**Stop the stage-2 line swap.**~~ Done. At mind stage 2+, `tavern.ts` (around line 4017) replaces the touch's own line with a generic `bodyLine`. Keep the authored line and add the body line after it, and only at Known.
10c. **Stage-aware writing:** done: the `FIRSTS` variants, the `townTalk` stage line and her dawn line. Still to do: each passive's `thought` gets an early and a late voice (`passives.ts`), and stage pools in table talk (`gossip.ts`, `tabletalk.ts`).
10d. **Act 1 resistance beats:** done except Ash's hand. the two intro lines, the first reach of the run held to level 1–2, the farmers' line after her first refusal, Ash's hand, Tansy's denial, and the line before her first invitation card.
10e. ~~**Pell at dawn by stage and corruption**~~ Done: (`ledger.ts`): four opening lines and the two gated choices (`defiedPell`, `pellsEar`).
10f. **Named regulars** (GAME_PATH.MD, section 5): Silas, Mara and Rhea keep their sheet and their memory of her (lasting nerve, their opening line by memory and stage, a one-off line when her stage changes). Mara and Rhea are never impulsive.

**New for Act 2 and later:**

11. **The Ledger:** corruption tiers, and each corrupt act stored with a victim id.
12. **Fans and rivals:** a fans count with tags, rival counts that grow a little every night on the pass (at most +15), the Pass Ledger card at 1,000 fans, 1,500 fans and after Last Call, and **every** story beat, Act 1 included, triggered by fan count instead of night number (a beat queue in `plot.ts`). `NIGHTS` becomes the beat nights, and side nights draw from a shuffled pool. The run no longer ends on "last night". It ends at an ending.
12a. **Chapter 1 first (the current scope):** the five innkeeper models (preset looks plus their outfits and the shared beards, spectacles, kerchief and stoop, section 7), the Village Ledger with the five Tarven houses at fixed fan counts (100 / 200 / 300 / 400 / 500), the Chapter 1 beat list (section 7), the partner-or-ruin card when a house falls, Pell's three collections, and the "First in Tarven" card plus teaser as the end of the build. Build this before anything on the pass.
12b. **Replay:** a cross-run "What happened" journal page (endings found, letters read, victims) saved outside the run slots.
13. **Owned houses:** a list of houses she owns, each with a manager (bought) or a partner boss (with loyalty), whose fans add to hers.
14. **The Baron partnership:** a last-call choice on The last offer, plus the Master of the Pass and Baron's Partner endings.
15. **Expand mode (later):** play continues after Last Call with new houses to win.
16. **The Lantern (brothel setup):** Stage I is done (`lantern.ts`, `lanternplans.ts`; see section 12, "What's built now"). For the later stages: extend `houseMode` with a lit/dark choice each evening, and add Lantern builds to House Plans (rooms, parlour, Red Room, bathhouse, doorman). Also: a staff list in `save.ts` (appeal, charm, stamina, loyalty, knack, corruption, resolve, records), each girl's lewdness worked out from her own records (reuse `lewdnessOf` and `mindStage` from `passives.ts` and `lewd.ts`), a small set of girl passives, the nightly corruption drift toward the madam's (managers and partner bosses too), tier behaviours for the girls (purse-lifting, selling secrets, skimming, walking out), house rules, a booking card, a door-lamp timer per room, Lantern trouble events, and a Lantern line on the dawn report.
17. **New guest factions:** add `adventurer`, `bandit` and `noble` to the guest kinds, each with its own looks (see the character-variety rule), moods, orders and table talk. They unlock by fans or by Ledger rank (section 5).

---

## 16. Open questions

1. Are the fan milestones right (501 to finish Tarven, 1,500 to finish Act 2, about 2,000 for the top house)? They set how long the game runs, and need playtesting against the rivals' growth.
1b. ~~Should Act 1 also move by fans?~~ **Decided: yes.** Fans drive every beat, and nights are never the driver.
1c. How fast do fans come? The rule in section 7 ("How fans are earned") gives about 40 to 75 on a good night, so Tarven takes about 8 to 12 good nights. Needs playtesting.
2. Is Father alive in the cells, or is it only his pages that are?
3. Should the player see the corruption number, or only the tier word?
4. Three rivals, or two to keep the scope down?
5. ~~Force vs. "pulling away always works"?~~ **Decided: pulling away always works** (GAME_PATH.MD, consent rule). Force became **Give in**: an extra yes, offered beside the other answers once her desire runs well past the touch, never replacing Slap or Pull away. Its lines are in `touchtalk-givein.ts`. The Force bar is feedback only, after a yes.
6. The lantern gate is mind stage 2, but the letter that reveals the lantern unlocks at mind stage 3 (section 10). Which one moves? **Proposed:** the letter moves to Willing (section 4b).
9. Should Rhea and Mara be romanceable with the brother too, or are the named regulars only for the sister for now (touches only reach the sister today)?
7. Does she run owned houses herself (walk to another map), or only through managers on a menu?
8. Can she partner with the Baron and still get The Village Rises, if she uses the partnership to protect the village?

---

## Changelog

| Date | Draft | Changes |
|---|---|---|
| 14 Nov 2026 | 2.18 | Her arc built in part: the mind stage reads Lewdness only, `arcStage` (shown by the Force bar), the written touch line kept with a stage layer, the Consent-off and late first-time thoughts, her dawn line and the town's line as her stage rises, Pell at dawn by stage and corruption (defy, or her ear: half the gold and a name), and Act 1 beats 2, 4 and 5. The defy choice's effect corrected: the meeting comes before Pell, so it can't open earlier |
| 14 Nov 2026 | 2.17 | Act 1's story flags built (`plot.ts`): every written last call sets a flag, two conditional choices (hide Ash, tell Rhea about the silver), and what comes back (Silas's brawl, the salt crate, dearer bottles, the meeting night's talk, the First in Tarven card) |
| 14 Nov 2026 | 2.16 | Story path brought up to date with the build. The intro rewrite is built (old three-night deadline removed). Act 1's three last calls have named visitors (Pell, Garrick, Rhea) and section 9's numbers. Section 15 fixes 3 and 4 done; flags and conditional choices are still to do |
| 14 Nov 2026 | 2.15 | New section 4b, her arc: four stages (Sheltered, Curious, Willing, Known) read from Lewdness and records, with corruption as the tone. Wren's letters lined up with the stages. Who reacts and how. Pell at dawn changes with stage and corruption, with two gated choices. Silas, Mara and Rhea as named regulars who remember her. Example thoughts for the same touch at each stage, Consent on and off. Five Act 1 beats rewritten to show more resistance. House rules line updated for the Consent switch and brawl loss. Code tasks 10a–10f |
| 13 Nov 2026 | 2.14 | Satisfaction through sex: Lantern bookings and her own played-out nights upstairs earn fans like a happy or delighted guest |
| 13 Nov 2026 | 2.13 | Lantern Stage I built: the lantern and plain room on House Plans, lit or dark nights, Tamsin, the booking card (she can refuse any guest), the four house rules, corruption drift and the Lantern dawn line |
| 13 Nov 2026 | 2.12 | No fail endings: Arrested and Foreclosed become debuffs (Under Watch after a raid, In the Baron's Debt, Bruised after a lost brawl). Chapter 1's core built: fans, the Village Ledger, beats by fans, partner or ruin, Pell's dawn and collections, side nights, First in Tarven |
| 13 Nov 2026 | 2.11 | Each Tarven innkeeper gets a model: preset looks on the existing bodies, one signature outfit each, and shared new pieces (beards, moustache, goatee, spectacles, kerchief, stoop) |
| 13 Nov 2026 | 2.10 | Village counted in hundreds: Tarven houses at 100 / 200 / 300 / 400 / 500, Chapter 1 ends at 501. Act 1 beats at 0 / 50 / 150 / 250. Fans earned ×5 (+5 happy, +10 delighted, −5 walkout, −15 filthy). Later stages scaled to match: pass rivals 1,200 / 1,000 / 800, Act 2 to 1,500, Act 3 to about 2,000 |
| 13 Nov 2026 | 2.9 | Fan targets raised about 5×. Tarven houses at 20 / 40 / 60 / 90 / 125, so Chapter 1 ends at 126. Act 1 beats at 0 / 10 / 30 / 50. Pass rivals at 275 / 225 / 175, Act 2 to 300, Act 3 to about 400. Added "How fans are earned" (+1 happy, +2 delighted, −1 walkout, −3 filthy room) |
| 13 Nov 2026 | 2.8 | **Chapter 1: Tarven** is now the current scope. Five village houses (Hollin's Cider Barn, the Bakehouse, the Watch Canteen, the Toll-Gate Inn, the Copper Bell) with fixed fans 4 / 8 / 12 / 18 / 25. She starts 6th, beats them one by one, and the chapter ends first in Tarven at 26 fans. Partner or ruin when a house falls. Pell's three 100-gold collections moved into the chapter. Pass rivals now start at 55 / 45 / 35. Acts 2 and 3 and the Lantern arc are marked later |
| 13 Nov 2026 | 2.7 | Fans drive the whole story, Act 1 included (beats at 0 / 3 / 6 / 10 fans). Nights only bring small things: side rumours, minor visitors, slow rival growth, weather. The debt is collected at fan beats, never by date. Added a Replay section and a cross-run "What happened" journal page |
| 13 Nov 2026 | 2.6 | Each girl has her own lewdness (slut level), worked out from her own records like the heroine's, with mind stages and a small set of girl passives. The madam's house tone shapes it without forcing it. Four kinds of girl from lewdness × corruption |
| 13 Nov 2026 | 2.5 | Corruption spreads: each girl has her own corruption and resolve, drifting toward the madam's every lit night. Greedy rules push it faster. Girls act by tier (honest to rotten), and managers and partner bosses in owned houses drift too |
| 13 Nov 2026 | 2.4 | Renamed Regulars to **Fans**. Acts 2 and 3 now move by fan milestones instead of night numbers (beats at 10–50 fans, Act 3 from 60). Ledger cards at 40, 60 and after Last Call. Rivals grow every night and the debt is paid in instalments, so waiting still costs her. New factions unlock by fans |
| 13 Nov 2026 | 2.3 | Added the brothel setup ("How the Lantern runs"): lit and dark nights, Lantern builds in House Plans, the girls' stats and house rules (consent fixed, money and protection are the madam's choices), a Lantern night step by step, four growth stages and stat effects |
| 13 Nov 2026 | 2.2 | Added three guest factions (adventurers, bandits, nobles) that unlock as popularity grows, with named leaders Kestrel Vey, Corran Black and Baroness Isolde Varn. Varn is a second baron to back against Hesk. Added The Baroness's House ending |
| 13 Nov 2026 | 2.1 | Popularity is now the main goal (Survive → Climb → Expand). Beaten rivals can be bought, partnered or ruined. Added working with the Baron, Expand mode, and two endings (Master of the Pass, The Baron's Partner) |
| 13 Nov 2026 | 2 | Added the origin and the rewritten intro, the forged debt and the auditor, lewdness / corruption / regulars as three separate axes, the rival taverns and the Pass Ledger, corruption tiers and the Ledger, Acts 2 and 3 night by night, the Lantern arc, the warning letter, new endings (The New Baron, The Lantern Burns), code changes and open questions |
| Nov 2026 | 1 | First story draft: the Red Lantern spine, the named cast, Act 1 rewritten, Wren's letters, endings |
