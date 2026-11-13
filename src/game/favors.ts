/**
 * What comes of a favor, nights later. Two kinds:
 *
 * - A promise coming due: she said she'd do something, and now someone's here for it (the brother for his letter,
 *   the boy whose ewe is lambing, a soldier asking after a smuggler). She keeps her word, or doesn't.
 * - The favor returned: someone she helped comes back to pay her back (the slate settled, the seed grain repaid,
 *   the garrison buying a round for the song).
 *
 * A follow-up starts from an answer (`after`, a reply id): agreeing to a favor in banter.ts, or an answer to another
 * follow-up, so keeping a promise can lead to thanks a night or two later. It comes when she next serves a guest of
 * the right kind, at least `nights` after. Each one comes once.
 */
import type { Reply } from "./banter";
import type { GuestKind } from "./tavern";

export interface FollowUp {
  id: string;
  /** The answer that sets it up. */
  after: string;
  /** "promise": she has something to do. "return": they're paying her back. */
  kind: "promise" | "return";
  /** Who comes for it: the kind of guest who'll bring it. */
  kinds: GuestKind[];
  /** Who they are, for the name over their lines. */
  who: string;
  /** What's ahead, in a line, for the journal. */
  note: string;
  /** At least this many nights after the answer that set it up; 0 is later the same night. */
  nights: number;
  lines: string[];
  replies: Reply[];
}

const reply = (id: string, label: string, result: string, effects: Partial<Omit<Reply, "id" | "label" | "result">> = {}): Reply => ({
  id,
  label,
  result,
  gold: 0,
  trust: 0,
  heat: 0,
  ...effects,
});

export const FOLLOW_UPS: readonly FollowUp[] = [
  // ---- Promises coming due ----
  {
    id: "fu.letter",
    note: "A farmer's brother will come for the letter behind the bar.",
    after: "f.letter.yes",
    kind: "promise",
    kinds: ["farmer"],
    who: "Farmer's brother",
    nights: 1,
    lines: ["\"My brother left a letter with you, I think. I've come for it.\" Their eyes flick to the soldiers' table."],
    replies: [
      reply("fu.letter.give", "Slip it to them under a cup", "They tuck it inside their coat without a glance at it. \"I won't forget this.\" (+1 trust)", {
        trust: 1,
        persona: { kindness: 1 },
      }),
      reply("fu.letter.sell", "Hand it to the soldiers instead", "The sergeant reads it and smiles. The brother doesn't come back. (-2 trust, -2 heat)", {
        say: "\"Sergeant! Here's someone come for a letter.\"",
        trust: -2,
        heat: -2,
        persona: { informed: 1, kindness: -1 },
      }),
    ],
  },
  {
    id: "fu.ewe",
    note: "A farmer's boy may come running about the ewe: send him to the mill.",
    after: "f.ewe.yes",
    kind: "promise",
    kinds: ["farmer"],
    who: "A farm boy",
    nights: 0,
    lines: ["The door bangs open. \"Is my da here? The ewe's lambing and it's going wrong!\""],
    replies: [
      reply("fu.ewe.send", "\"He's at the mill. Run!\"", "The boy's gone before you finish. Someone at the bar cheers him on. (+1 trust)", {
        trust: 1,
        persona: { kindness: 1 },
      }),
      reply("fu.ewe.forget", "\"Haven't seen him.\"", "The boy runs back out into the dark, near tears. (-1 trust)", { trust: -1 }),
    ],
  },
  {
    id: "fu.purse",
    note: "The stranger will come back for their purse.",
    after: "f.purse.yes",
    kind: "promise",
    kinds: ["fugitive"],
    who: "The stranger",
    nights: 1,
    lines: ["\"You kept it.\" They stare at the purse in your hand as if they never thought to see it again. \"May I have it?\""],
    replies: [
      reply("fu.purse.return", "Give it back, every coin", "They press three coins back into your palm and won't hear otherwise. (+3 gold, +2 trust)", {
        say: "\"Every coin. I counted.\"",
        gold: 3,
        trust: 2,
        persona: { kindness: 1 },
      }),
      reply("fu.purse.skim", "Give it back, a little lighter", "They weigh it in their hand, and say nothing at all. (+6 gold, -1 trust)", {
        say: "\"Here. Safe and sound.\"",
        gold: 6,
        trust: -1,
        persona: { greed: 2 },
      }),
    ],
  },
  {
    id: "fu.never",
    note: "If the garrison asks about the smuggler, you never saw them.",
    after: "f.never.yes",
    kind: "promise",
    kinds: ["soldier"],
    who: "Garrison soldier",
    nights: 1,
    lines: ["\"A smuggler drank here a night or two back. You'd remember. Think hard, innkeeper.\""],
    replies: [
      reply("fu.never.cover", "\"Never seen them.\"", "The soldier holds your eye a long while, then lets it go. (+1 heat)", { heat: 1 }),
      reply("fu.never.sell", "\"They went up the north road.\"", "The soldier grins and drops a coin on the bar. (+2 gold, -2 heat, -1 trust)", {
        gold: 2,
        heat: -2,
        trust: -1,
        persona: { informed: 1 },
      }),
    ],
  },
  {
    id: "fu.names",
    note: "The garrison expects names for the captain.",
    after: "f.names.yes",
    kind: "promise",
    kinds: ["soldier"],
    who: "Garrison soldier",
    nights: 1,
    lines: ["\"So. Any names for the captain? He pays for good ones.\""],
    replies: [
      reply("fu.names.give", "Give them a name", "Silver crosses the bar. Somebody in the village will get a knock on the door. (+5 gold, -1 heat, -2 trust)", {
        say: "\"The tanner's lad talks a lot, after a few.\"",
        gold: 5,
        heat: -1,
        trust: -2,
        persona: { informed: 1 },
      }),
      reply("fu.names.none", "\"Nobody worth naming.\"", "\"Pity,\" they say, and don't sound like they mean it. (+1 heat)", { heat: 1 }),
    ],
  },

  // ---- The favor returned ----
  {
    id: "fu.letterThanks",
    note: "The farmers owe you for the letter.",
    after: "fu.letter.give",
    kind: "return",
    kinds: ["farmer"],
    who: "Farmer",
    nights: 1,
    lines: ["\"The letter got where it was going. My brother sends this, and says you're one of us now.\""],
    replies: [reply("fu.letterThanks.ok", "\"Tell him he's welcome.\"", "A small purse, and a nod from every farmer in the room. (+4 gold, +1 trust)", { gold: 4, trust: 1 })],
  },
  {
    id: "fu.eweThanks",
    note: "The farmer owes you for sending the boy.",
    after: "fu.ewe.send",
    kind: "return",
    kinds: ["farmer"],
    who: "Farmer",
    nights: 1,
    lines: ["\"Twins! Both alive, and the ewe too. My boy says you sent him running. Here, for your pot.\""],
    replies: [reply("fu.eweThanks.ok", "\"Congratulations!\"", "A leg of mutton for the kitchen, and the farmer won't take a coin for it. (+4 gold, +1 trust)", { gold: 4, trust: 1 })],
  },
  {
    id: "fu.neverThanks",
    note: "The smuggler owes you for keeping quiet.",
    after: "fu.never.cover",
    kind: "return",
    kinds: ["smuggler"],
    who: "Smuggler",
    nights: 1,
    lines: ["\"Heard the garrison came sniffing, and you kept your mouth shut. My friends pay their debts.\""],
    replies: [reply("fu.neverThanks.ok", "\"I never saw you.\"", "A fat coin slides under your hand. (+6 gold)", { gold: 6, persona: { greed: 1 } })],
  },
  {
    id: "fu.slate",
    note: "A farmer owes you for the slate.",
    after: "f.slate.yes",
    kind: "return",
    kinds: ["farmer"],
    who: "Farmer",
    nights: 2,
    lines: ["\"Barley's sold! Here's what I owe on the slate, and a bit over for trusting me.\""],
    replies: [reply("fu.slate.ok", "\"Your word was good.\"", "They count it out proudly, and leave extra. (+4 gold, +1 trust)", { gold: 4, trust: 1 })],
  },
  {
    id: "fu.seed",
    note: "A farmer owes you the seed grain, at harvest.",
    after: "f.seed.yes",
    kind: "return",
    kinds: ["farmer"],
    who: "Farmer",
    nights: 2,
    lines: ["\"Harvest's in. A sack back for the one you gave me, and another besides. I said I'd pay you back.\""],
    replies: [reply("fu.seed.ok", "\"You didn't have to.\"", "Two sacks of barley for the cellar, worth good coin. (+8 gold, +1 trust)", { gold: 8, trust: 1 })],
  },
  {
    id: "fu.crate",
    note: "A smuggler will come for the crate, and the rest of your pay.",
    after: "f.crate.yes",
    kind: "return",
    kinds: ["smuggler"],
    who: "Smuggler",
    nights: 1,
    lines: ["\"Come for the crate. Nobody opened it? Good. Here's the rest of what you're owed.\""],
    replies: [
      reply("fu.crate.ok", "\"Take it and go.\"", "The crate leaves by the back. So does the heat on it. (+5 gold, -1 heat)", { gold: 5, heat: -1 }),
      reply("fu.crate.more", "\"Twenty, or it stays.\"", "They pay, with a look that says they'll remember it. (+10 gold, +1 heat)", {
        gold: 10,
        heat: 1,
        persona: { greed: 2 },
      }),
    ],
  },
  {
    id: "fu.vouch",
    note: "A farmer's boy is going to the meeting on your word.",
    after: "f.vouch.yes",
    kind: "return",
    kinds: ["farmer"],
    who: "Farmer",
    nights: 1,
    lines: ["\"My boy spoke up at the meeting. Folk listened, because you'd vouched for him.\""],
    replies: [reply("fu.vouch.ok", "\"Good for him.\"", "The village talks of you kindly. (+2 trust)", { trust: 2 })],
  },
  {
    id: "fu.song",
    note: "The garrison owes you for the song.",
    after: "f.song.yes",
    kind: "return",
    kinds: ["soldier"],
    who: "Soldier",
    nights: 1,
    lines: ["\"The lads haven't stopped humming that song of yours. This round's on the garrison.\""],
    replies: [reply("fu.song.ok", "\"I'll pour it, then.\"", "They pay for the whole table, and then some. (+5 gold, -1 heat)", { gold: 5, heat: -1 })],
  },
  {
    id: "fu.backway",
    note: "The stranger owes you for the way out.",
    after: "f.backway.yes",
    kind: "return",
    kinds: ["fugitive"],
    who: "The stranger",
    nights: 1,
    lines: ["\"That window of yours. I needed it, two nights back. I've not much, but take this.\""],
    replies: [reply("fu.backway.ok", "\"Keep safe.\"", "A worn coin and a long look of thanks. (+3 gold, +1 trust)", { gold: 3, trust: 1 })],
  },
  {
    id: "fu.feast",
    note: "The captain heard you said yes to the feast.",
    after: "f.feast.yes",
    kind: "return",
    kinds: ["soldier"],
    who: "Soldier",
    nights: 1,
    lines: ["\"The captain asked after the innkeeper who said yes to the feast. He sent this, with his compliments.\""],
    replies: [reply("fu.feast.ok", "\"Thank the captain for me.\"", "A ribbon and a purse. The garrison smiles on you. (+5 gold, -1 heat, +2 fame)", {
      gold: 5,
      heat: -1,
      persona: { fame: 2 },
    })],
  },
];

export const FOLLOW_UP_BY_ID: ReadonlyMap<string, FollowUp> = new Map(FOLLOW_UPS.map((f) => [f.id, f]));

/** The follow-ups an answer sets up. */
export function followUpsAfter(replyId: string): FollowUp[] {
  return FOLLOW_UPS.filter((f) => f.after === replyId);
}
