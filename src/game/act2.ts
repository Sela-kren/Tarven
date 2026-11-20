/**
 * Act 2: The Red Book (STORY.md section 11; 501 to 1,500 fans, after Chapter 1). Pure rules and words; tavern.ts keeps
 * the state and applies what comes out.
 *
 * - **The Pass Ledger** (section 7, "The pass rivals"): three houses on the pass, the Gilded Stag (the widow Hesk), the
 *   Velvet House (Sabine Marrow) and the Drowned Rat (Grig Tallow), each with fans of its own that grow a little every
 *   night (at most RIVAL_GROWTH_MAX). She arrives fourth. The house above her fights back some nights. One she pushes
 *   to the bottom of the Ledger comes to her at dawn: **buy** it (gold), **partner** with its boss (a share, and their
 *   regulars), or **ruin** it (corruption and heat; most of its fans come to her).
 * - **The red book** (sections 3 and 6): Wren split it among the people she trusted. In Act 2 three pieces are in reach,
 *   each heard of at a beat and won by day from whoever holds it, in the ways that fit them (trust, desire, coin or
 *   fists), shaped by what she did in Act 1: Oden's lock and key to the cover, Mara's pages on the Baron's silver, and
 *   Silas's toll routes. The last pages are Act 3's: taken from Father at the border, they're in the keep's cells
 *   (decided 20 Nov 2026: only his pages are there, not him).
 * - **The beats** (section 11), one a morning, by fans: New terms (600), The velvet card (700), The nightshirt (850),
 *   The first Ledger (1,000), The inspection (1,150), The turn (1,300) and the second Ledger (1,500), which ends the
 *   act. Each is a dawn card with her choices.
 *
 * Every character is an adult. Nothing here touches the consent rule (GAME_PATH.MD): the beats are talk, coin and
 * brawls. The Baron is leverage, never a client.
 */
import type { FanGroup } from "./chapter1";

// ---------------------------------------------------------------------------------------------------------------
// The Pass Ledger
// ---------------------------------------------------------------------------------------------------------------

export type RivalId = "stag" | "velvet" | "rat";
export const RIVAL_IDS: readonly RivalId[] = ["stag", "velvet", "rat"];
export type RivalFate = "bought" | "partner" | "ruin";

export interface PassRival {
  id: RivalId;
  name: string;
  boss: string;
  /** Where the fans start, the day the pass opens to her. */
  fans: number;
  /** Which of her fan groups its fans are (and the crown they'd make). */
  group: FanGroup;
  known: string;
  /** What buying it costs. */
  price: number;
  /** What its boss brings, partnered. */
  partner: string;
  /** What she hears from its boss, whichever way it goes. */
  clue: string;
  /** What its boss says at her door, the morning it falls. */
  arrives: string;
  /** How it fights back from above her, in a line. */
  fights: string;
}

export const PASS_RIVALS: Readonly<Record<RivalId, PassRival>> = {
  stag: {
    id: "stag",
    name: "the Gilded Stag",
    boss: "the widow Hesk",
    fans: 1200,
    group: "keeper",
    known: "the respectable inn in the valley: good food, clean beds, and the Baron's own sister-in-law at the door",
    price: 400,
    partner: "the widow's ties to the keep, and the valley trade",
    clue: "The widow Hesk folds her gloves. \"The Stag's strongroom has held the Baron's silver for twenty years. I never asked whose it was. I'm asking now.\"",
    arrives: "The widow Hesk stands in your doorway in grey silk, the Stag's books under her arm. \"You've emptied my dining room. I can count. What are your terms?\"",
    fights: "The Gilded Stag is serving a free supper to anyone who'll walk past your door to get it.",
  },
  velvet: {
    id: "velvet",
    name: "the Velvet House",
    boss: "Sabine Marrow",
    fans: 1000,
    group: "lantern",
    known: "the brothel that rose when Wren's lantern went out, run by one of Wren's own girls",
    price: 300,
    partner: "Sabine's girls and her clients, and what she knows about the night Wren died",
    clue: "Sabine lights a thin cigar and doesn't look at you. \"I told Pell where your grandmother slept. Not to hurt her. For money. I've had twenty years to be sorry, and I'm still not very good at it.\"",
    arrives: "Sabine Marrow sweeps in in velvet, takes the best stool, and orders Wren's old drink without asking the price. \"Well, little Wren. You've taken my girls' clients. Shall we talk like madams?\"",
    fights: "The Velvet House has sent a girl round your tables, whispering about better rooms up the road.",
  },
  rat: {
    id: "rat",
    name: "the Drowned Rat",
    boss: "Grig Tallow",
    fans: 800,
    group: "network",
    known: "the river dive where the fights are free and the ale isn't",
    price: 200,
    partner: "Grig's garrison contacts, and Silas's routes made whole",
    clue: "Grig spits on your floor, then wipes it with his sleeve, which is almost an apology. \"I've been telling the garrison who drinks where. You'll want to know who asked.\"",
    arrives: "Grig Tallow kicks your door open, sees it's already open, and looks embarrassed. \"Rat's empty. Lads all drink here now. So. What d'you want for 'em?\"",
    fights: "Grig's lads from the Drowned Rat are spoiling for a fight at your door.",
  },
};

/** The most a rival's fans grow in a night, and how much more once the Baron's doubled the toll (The turn). */
export const RIVAL_GROWTH_MAX = 15;
export const DESPERATE_GROWTH = 5;

export interface PassRivalState {
  fans: number;
  fate: RivalFate | null;
  /** It fell (to the bottom of the Ledger) and its boss is waiting on her answer. */
  fallen: boolean;
}

export interface PassState {
  /** The pass is open to her (New terms, 600 fans). */
  open: boolean;
  /** The Baron's doubled the toll (The turn): every rival's desperate. */
  desperate: boolean;
  rivals: Record<RivalId, PassRivalState>;
}

export function newPass(): PassState {
  return {
    open: false,
    desperate: false,
    rivals: {
      stag: { fans: PASS_RIVALS.stag.fans, fate: null, fallen: false },
      velvet: { fans: PASS_RIVALS.velvet.fans, fate: null, fallen: false },
      rat: { fans: PASS_RIVALS.rat.fans, fate: null, fallen: false },
    },
  };
}

/** Rivals still standing against her on the pass (not bought, partnered or ruined). */
export function standing(p: PassState): RivalId[] {
  return RIVAL_IDS.filter((id) => p.rivals[id].fate === null);
}

/** Her place on the Pass Ledger: 1 plus every standing rival with more fans. */
export function passRank(p: PassState, fans: number): number {
  return 1 + standing(p).filter((id) => p.rivals[id].fans > fans).length;
}

/** The standing rival just above her on the Ledger (the fewest fans that still beat hers), or null at the top. */
export function rivalAbove(p: PassState, fans: number): RivalId | null {
  const above = standing(p).filter((id) => p.rivals[id].fans > fans);
  return above.sort((a, b) => p.rivals[a].fans - p.rivals[b].fans)[0] ?? null;
}

/** A night on the pass: each standing rival grows, more once they're desperate. Rolls in [0, 1). */
export function passNight(p: PassState, roll: () => number): PassState {
  const rivals = { ...p.rivals };
  for (const id of standing(p)) {
    const most = RIVAL_GROWTH_MAX + (p.desperate ? DESPERATE_GROWTH : 0);
    rivals[id] = { ...rivals[id], fans: rivals[id].fans + Math.floor(roll() * (most + 1)) };
  }
  return { ...p, rivals };
}

/**
 * The rival she's pushed to the bottom of the Pass Ledger: standing, under her, and the fewest fans of everyone on it.
 * Null when none (or one is already at her door).
 */
export function bottomRival(p: PassState, fans: number): RivalId | null {
  if (!p.open || RIVAL_IDS.some((id) => p.rivals[id].fallen)) return null;
  const left = standing(p);
  if (left.length === 0) return null;
  const lowest = left.sort((a, b) => p.rivals[a].fans - p.rivals[b].fans)[0];
  return p.rivals[lowest].fans < fans ? lowest : null;
}

/** What each answer to a fallen rival brings: a share of its fans, gold a night, corruption and heat. */
export const RIVAL_TERMS: Readonly<Record<RivalFate, { fans: number; nightly: number; corruption: number; heat: number }>> = {
  bought: { fans: 0.4, nightly: 0, corruption: 0, heat: 0 },
  partner: { fans: 0.3, nightly: 8, corruption: 0, heat: 0 },
  ruin: { fans: 0.5, nightly: 0, corruption: 15, heat: 2 },
};

/** The houses she owns on the pass (bought or partnered): Master of the Pass needs two (STORY.md 14). */
export function housesOwned(p: PassState): RivalId[] {
  return RIVAL_IDS.filter((id) => p.rivals[id].fate === "bought" || p.rivals[id].fate === "partner");
}

/** The Pass Ledger as lines, highest first, with her in her place. */
export function ledgerLines(p: PassState, fans: number): string[] {
  const rows = [
    ...standing(p).map((id) => ({ name: PASS_RIVALS[id].name, boss: PASS_RIVALS[id].boss, fans: p.rivals[id].fans, her: false })),
    { name: "your tavern", boss: "you", fans, her: true },
  ].sort((a, b) => b.fans - a.fans);
  const ord = ["1st", "2nd", "3rd", "4th"];
  return rows.map((r, i) => `${ord[i]}: ${r.her ? "Your tavern" : `${r.name[0].toUpperCase()}${r.name.slice(1)} (${r.boss})`}, ${r.fans} fans`);
}

// ---------------------------------------------------------------------------------------------------------------
// The red book
// ---------------------------------------------------------------------------------------------------------------

export type PieceId = "cover" | "silver" | "routes";
export const PIECE_IDS: readonly PieceId[] = ["cover", "silver", "routes"];
export type PieceStatus = "unknown" | "heard" | "held";
export type Way = "trust" | "desire" | "coin" | "fists";

/** What a piece's ways read off her (the tavern fills it). */
export interface BookFacts {
  trust: number;
  gold: number;
  arc: "sheltered" | "curious" | "willing" | "known" | "legend";
  brawlsWon: number;
  flags: ReadonlySet<string>;
  /** How far Oden's route has gone (townplaces.ts), and her talks with Mara. */
  odenRoute: number;
  maraTalks: number;
  /** Her smuggler rank (careers.ts), -1 if she never ran for Silas. */
  smugglerRank: number;
}

export interface PieceWay {
  way: Way;
  label: string;
  /** What she still lacks, or null when she can. */
  needs: (f: BookFacts) => string | null;
  /** Gold it costs, and what it does to her. */
  gold?: number;
  heat?: number;
  corruption?: number;
  respect?: number;
  fatigue?: number;
  line: string;
}

export interface Piece {
  id: PieceId;
  name: string;
  holder: string;
  /** Where in town she wins it. */
  place: "chapel" | "fields" | "quarry";
  /** What she's heard, once it's on offer. */
  rumour: string;
  ways: readonly PieceWay[];
}

const lateArc = (f: BookFacts) => f.arc === "willing" || f.arc === "known" || f.arc === "legend";

export const PIECES: Readonly<Record<PieceId, Piece>> = {
  cover: {
    id: "cover",
    name: "the lock and key to the red book's cover",
    holder: "Brother Oden",
    place: "chapel",
    rumour: "Wren had the red book bound in iron, and gave the key to someone who'd never open it: Oden.",
    ways: [
      {
        way: "trust",
        label: "Ask Oden for Wren's key, as her granddaughter",
        needs: (f) => (f.flags.has("odenShut") ? "Oden's gone" : f.odenRoute < 4 ? "Oden doesn't trust you that far yet (talk with him)" : f.trust < 8 ? "the village's trust (8)" : null),
        heat: 1,
        line: "Oden takes a small iron key from round his neck and holds it a long time. \"She said you'd come for it one day. She said I'd know if you were the right one.\" He puts it in your hand. The Baron's men will hear you were at the chapel.",
      },
      {
        way: "coin",
        label: "Buy Oden's key back from the Baron's men (60 gold)",
        needs: (f) => (!f.flags.has("odenShut") ? "Oden still has it" : f.gold < 60 ? "60 gold" : null),
        gold: 60,
        corruption: 5,
        line: "When they shut the chapel, the Baron's men took everything that shone. A corporal sells you a small iron key from a sack of candlesticks for sixty gold, and doesn't know what it opens.",
      },
    ],
  },
  silver: {
    id: "silver",
    name: "Mara's pages on the Baron's silver",
    holder: "Mara Holt",
    place: "fields",
    rumour: "Mara's late husband ran Wren's errands. Before he died he hid pages in the farm: every silver wagon the Baron ever robbed.",
    ways: [
      {
        way: "trust",
        label: "Ask Mara for her husband's pages",
        needs: (f) => (f.flags.has("maraArrested") ? "Mara's been taken" : f.trust < 10 ? "the village's trust (10)" : null),
        heat: 1,
        line: "Mara takes you to the old apple tree and digs up a tin box with her bare hands. \"He said they'd hang the Baron one day. Don't make him a liar.\"",
      },
      {
        way: "desire",
        label: "Spend the night at Mara's farm",
        needs: (f) => (f.flags.has("maraArrested") ? "Mara's been taken" : !lateArc(f) ? "Willing" : f.maraTalks < 4 ? "Mara knows you better (talk with her)" : null),
        respect: -1,
        line: "A long night at the farm, and Mara is nothing like as stern as she looks. In the morning, half asleep, she tells you where the pages are. You'll have to live with how you got them.",
      },
      {
        way: "coin",
        label: "Buy the pages from the garrison's clerk (70 gold)",
        needs: (f) => (!f.flags.has("maraArrested") ? "Mara still has them" : f.gold < 70 ? "70 gold" : null),
        gold: 70,
        corruption: 5,
        line: "They took everything from Mara's farm when they took her. The garrison clerk sells you a tin box of \"old tallies\" for seventy gold, and goes back to his lunch.",
      },
      {
        way: "fists",
        label: "Run the Baron's collectors off Mara's fields",
        needs: (f) => (f.flags.has("maraArrested") ? "Mara's been taken" : f.brawlsWon < 10 ? `10 brawls won (${f.brawlsWon})` : null),
        fatigue: 3,
        line: "Three of the Baron's collectors come for Mara's harvest. You put two in the ditch and the third runs. Mara wipes her scythe and hands you a tin box. \"Earned.\"",
      },
    ],
  },
  routes: {
    id: "routes",
    name: "Silas's map of the toll routes",
    holder: "Silas Crowe",
    place: "quarry",
    rumour: "Silas has a map of every road the silver wagons took, drawn by Wren's own hand. It's on offer to whoever holds the room.",
    ways: [
      {
        way: "trust",
        label: "Ask Silas for the map, as his partner",
        needs: (f) => (f.flags.has("silasAngry") ? "Silas won't deal with you" : f.flags.has("silasOwes") || f.smugglerRank >= 1 ? null : "Silas owing you, or a partner's share in his crew"),
        heat: 1,
        line: "Silas unrolls a map on a crate. Wren's hand, every toll road, every wagon. \"She drew it for me. I'm lending it to you. Don't make me regret it.\"",
      },
      {
        way: "desire",
        label: "Make Silas an offer he won't say no to",
        needs: (f) => (f.flags.has("silasAngry") ? "Silas won't deal with you" : f.arc !== "known" && f.arc !== "legend" ? "Known" : f.smugglerRank < 0 ? "run for his crew first" : null),
        respect: -1,
        line: "A long afternoon in the back of Silas's wagon. He hands you the map after, still buttoning his shirt. \"You're your grandmother's. Gods help the pass.\"",
      },
      {
        way: "coin",
        label: "Buy Silas's map (100 gold)",
        needs: (f) => (f.flags.has("silasAngry") ? "Silas won't deal with you" : f.gold < 100 ? "100 gold" : null),
        gold: 100,
        corruption: 5,
        line: "Silas counts the hundred twice, then a third time out of habit. The map is yours. \"Business,\" he says. \"Nothing personal. She'd have charged more.\"",
      },
      {
        way: "fists",
        label: "Claim the map: you held the room against Grig's men",
        needs: (f) => (f.flags.has("heldTheRoom") ? null : "hold your room on the first Ledger's brawl night"),
        line: "\"Whoever holds the room,\" Silas said, and you held it. He hands over the map with a bow. \"Never seen Grig's lads run so fast.\"",
      },
    ],
  },
};

// ---------------------------------------------------------------------------------------------------------------
// The beats
// ---------------------------------------------------------------------------------------------------------------

export type Act2BeatId = "newTerms" | "velvetCard" | "nightshirt" | "firstLedger" | "inspection" | "theTurn" | "secondLedger";

/** Act 2's beats, in order, with the fans that bring each (STORY.md section 11). */
export const ACT2_BEATS: readonly { id: Act2BeatId; fans: number }[] = [
  { id: "newTerms", fans: 600 },
  { id: "velvetCard", fans: 700 },
  { id: "nightshirt", fans: 850 },
  { id: "firstLedger", fans: 1000 },
  { id: "inspection", fans: 1150 },
  { id: "theTurn", fans: 1300 },
  { id: "secondLedger", fans: 1500 },
];

/** What a beat's choice does: words, and the numbers and flags the tavern applies. */
export interface BeatEffect {
  lines: string[];
  gold?: number;
  trust?: number;
  heat?: number;
  corruption?: number;
  respect?: number;
  fame?: number;
  kindness?: number;
  /** Fans to her (and to which group), and to a rival (minus: taken from it). */
  fans?: number;
  group?: FanGroup;
  rival?: { id: RivalId; fans: number };
  flags?: string[];
  /** A piece of the book she's now heard of. */
  heard?: PieceId;
  /** Opens the pass; doubles the toll; a brawl tonight against Grig's men. */
  openPass?: boolean;
  desperate?: boolean;
  brawlNight?: boolean;
}

export interface BeatChoice {
  id: string;
  label: string;
  /** Why it isn't offered, or null. */
  hidden?: (f: BeatFacts) => boolean;
  run: (f: BeatFacts) => BeatEffect;
}

/** What the beats read off her. */
export interface BeatFacts {
  gold: number;
  trust: number;
  respect: number;
  messes: number;
  flags: ReadonlySet<string>;
  /** The Pass Ledger, and her fans on it. */
  ledger: string[];
}

export interface BeatCard {
  title: string;
  lines: (f: BeatFacts) => string[];
  choices: readonly BeatChoice[];
}

const plainChoice = (label: string, effect: (f: BeatFacts) => BeatEffect): BeatChoice[] => [{ id: "go", label, run: effect }];

export const ACT2_CARDS: Readonly<Record<Act2BeatId, BeatCard>> = {
  newTerms: {
    title: "New terms",
    lines: () => [
      "Pell is at your bar at dawn again, a little greyer. \"First in Tarven. Congratulations. Tarven is small.\" He slides a card across: the Gilded Stag, cheaper ale, \"for the discerning traveller\".",
      "\"The pass is bigger, keeper. Three houses up there have been here longer than you've been alive, and the Baron likes all three.\" He taps the card. \"You're fourth.\"",
      "As he goes, he stops at the door. \"Your grandmother had the book bound in iron, you know. Someone has the key.\"",
    ],
    choices: plainChoice("Pin the Stag's card behind the bar", () => ({
      lines: ["The Pass Ledger opens to you: the Gilded Stag, the Velvet House and the Drowned Rat, and you, fourth. Every night they'll grow, and the one above you will fight back."],
      openPass: true,
      heard: "cover",
    })),
  },
  velvetCard: {
    title: "The velvet card",
    lines: () => [
      "A woman in black velvet takes the best stool at your bar and orders Wren's old drink without asking the price. Sabine Marrow, of the Velvet House. She looks at you the way a jeweller looks at a ring.",
      "\"I could buy this place,\" she says. \"Or we could be partners, little Wren. Two lanterns on one pass. Your grandmother and I did very well, once.\"",
      "On her way out she mentions, as if it's nothing, that Mara Holt's husband ran Wren's errands, and hid something at the farm before he died.",
    ],
    choices: [
      {
        id: "hear",
        label: "Hear her out, and say no",
        run: () => ({ lines: ["\"Pity,\" Sabine says, and means it. \"You'll come round. They all do.\" She leaves a velvet card on the bar."], respect: 1, heard: "silver" }),
      },
      {
        id: "wren",
        label: "Ask her about Wren",
        run: () => ({
          lines: ["Sabine's smile goes thin. \"I was her best girl. Then I wasn't.\" She finishes the drink. \"Ask me again when you've taken my house. You'll want to know by then.\""],
          flags: ["sabineAsked"],
          heard: "silver",
        }),
      },
      {
        id: "out",
        label: "Throw her out",
        run: () => ({
          lines: ["You tell Sabine to drink somewhere she owns. She laughs all the way to the door. The Velvet House pours cheap that night, out of spite, and half the pass hears you did it."],
          fame: 1,
          rival: { id: "velvet", fans: 30 },
          flags: ["sabineSpurned"],
          heard: "silver",
        }),
      },
    ],
  },
  nightshirt: {
    title: "The nightshirt",
    lines: (f) => [
      ...(f.flags.has("odenShut")
        ? ["Silas sits down across from you with two cups and no smile. \"Oden told me before they shut his chapel. Someone should tell you.\""]
        : ["Oden comes to your back door after dark, which he's never done. He won't come in. He talks to the doorframe."]),
      "\"The night your grandmother died, I was up with a sick lamb. I saw Pell climb out of her window in his nightshirt. She was already gone, smiling. He didn't hurt her. He was looking for the book.\"",
      "\"And the next week, there was a debt.\"",
    ],
    choices: [
      {
        id: "expose",
        label: "Get Pell drunk enough to confess, on Zane's feed",
        run: () => ({
          lines: [
            "You keep Pell's cup full all night and Zane's phone propped against the salt cellar. By the third bottle Pell is crying about Wren's window, and the nightshirt, and the debt he wrote himself.",
            "The feed has it by morning. Pell is finished. The Baron will come for you sooner now.",
          ],
          heat: 4,
          corruption: 5,
          fame: 3,
          flags: ["pellExposed", "nightshirtKnown"],
        }),
      },
      {
        id: "rhea",
        label: "Take it to Captain Rhea",
        hidden: (f) => !f.flags.has("rheaDoubts"),
        run: () => ({
          lines: ["Rhea listens to all of it with her jaw tight. \"A forged debt. On the Baron's paper.\" She doesn't say what she'll do. She doesn't have to."],
          trust: 1,
          flags: ["nightshirtKnown", "rheaKnows"],
        }),
      },
      {
        id: "keep",
        label: "Keep it to yourself, for now",
        run: () => ({ lines: ["You fold it away with the rest of what you know. Pell, at least, doesn't know that you know."], flags: ["nightshirtKnown"] }),
      },
    ],
  },
  firstLedger: {
    title: "The first Ledger",
    lines: (f) => [
      "The first Pass Ledger is read in every tavern on the pass this morning:",
      ...f.ledger,
      "And Silas sends word: Grig's men from the Drowned Rat are coming to break your furniture tonight. The map of the toll routes goes to whoever holds the room.",
    ],
    choices: [
      {
        id: "hold",
        label: "Hold the room tonight (a brawl)",
        run: () => ({ lines: ["You move the good tankards behind the bar and roll up your sleeves. Let them come."], brawlNight: true, heard: "routes" }),
      },
      {
        id: "pay",
        label: "Pay Grig's men to drink somewhere else (30 gold)",
        hidden: (f) => f.gold < 30,
        run: () => ({ lines: ["Thirty gold to Grig's sergeant and the Rat's lads drink at the Rat. Your furniture lives. Silas shrugs: the map's still on offer, just not for nothing."], gold: -30, heard: "routes" }),
      },
    ],
  },
  inspection: {
    title: "The inspection",
    lines: () => [
      "The widow Hesk arrives at noon \"on behalf of the innkeepers' guild\", in grey silk with a notebook. She runs a gloved finger along your bar and looks at it for a long time.",
    ],
    choices: [
      {
        id: "show",
        label: "Show her round",
        run: (f) =>
          f.messes <= 1 && f.respect >= 0
            ? {
                lines: ["The widow finds nothing. She looks almost disappointed. By evening the valley's heard that the new keeper runs a clean, respectable house, and the Stag's quieter diners start walking up the hill."],
                fans: 40,
                group: "keeper",
                rival: { id: "stag", fans: -60 },
              }
            : {
                lines: ["The widow writes a great deal in her notebook. By evening the valley's heard about your floor, and the Stag's dining room is full."],
                rival: { id: "stag", fans: 30 },
              },
      },
      {
        id: "bribe",
        label: "Slip the guild's report a purse (40 gold)",
        hidden: (f) => f.gold < 40,
        run: () => ({
          lines: ["Forty gold, folded into the guild's notebook. The report says your kitchen is \"exemplary\". The widow knows exactly what happened, and smiles at you like a fellow professional."],
          gold: -40,
          corruption: 5,
          fans: 40,
          group: "keeper",
          rival: { id: "stag", fans: -60 },
        }),
      },
    ],
  },
  theTurn: {
    title: "The turn",
    lines: (f) => [
      ...(f.flags.has("ashHidden")
        ? ["Ash comes up from your cellar with a letter he's carried for months. \"I should have given you this the first night. I was scared.\""]
        : ["A letter comes up the pass with a pedlar, stained with a long road. The hand is your father's."]),
      "\"I'm alive. I'm married, to an orc chieftain's daughter, in the Khanate of Grask. She's wonderful. I am very, very sorry.\"",
      "\"Your grandmother gave me the last pages of her book. The Baron's riders took them off me at the border. They'll be in his keep, in the cells, where he keeps everything he steals. Don't come east. Go there.\"",
      "The same morning the Baron doubles the road toll. Guests thin out everywhere, and every house on the pass gets desperate.",
    ],
    choices: [
      {
        id: "write",
        label: "Write back to him",
        run: () => ({ lines: ["You write three letters and burn two. The third says: \"Come home for the wedding feast. Bring her.\""], kindness: 1, desperate: true, flags: ["fatherLetter"] }),
      },
      {
        id: "fold",
        label: "Fold it away",
        run: () => ({ lines: ["You fold the letter into the till, under the coins. The last pages are in the keep. That's all that matters now."], desperate: true, flags: ["fatherLetter"] }),
      },
    ],
  },
  secondLedger: {
    title: "The second Ledger",
    lines: (f) => [
      "The second Pass Ledger is read up and down the pass:",
      ...f.ledger,
      "Fifteen hundred fans. The Baron's riders stop at your door to look at it, and ride on without a word. Up at the keep, they say, the cells have a new lock.",
      "(Act 2: The Red Book ends here. Act 3: Last Call is next.)",
    ],
    choices: plainChoice("Go on", () => ({ lines: [], flags: ["act2Done"] })),
  },
};

/** The next Act 2 beat she hasn't had, and whether her fans have reached it; null once the act's done. */
export function nextAct2Beat(done: ReadonlySet<string>): { id: Act2BeatId; fans: number } | null {
  return ACT2_BEATS.find((b) => !done.has(b.id)) ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// Saves
// ---------------------------------------------------------------------------------------------------------------

export interface Act2Save {
  pass: PassState;
  book: Record<PieceId, PieceStatus>;
  /** How she won each piece she holds. */
  won: Partial<Record<PieceId, Way>>;
  flags: string[];
}

export function newBook(): Record<PieceId, PieceStatus> {
  return { cover: "unknown", silver: "unknown", routes: "unknown" };
}

export function readAct2(raw: unknown): Act2Save {
  const out: Act2Save = { pass: newPass(), book: newBook(), won: {}, flags: [] };
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  const pass = src.pass as Record<string, unknown> | undefined;
  if (pass && typeof pass === "object") {
    out.pass.open = pass.open === true;
    out.pass.desperate = pass.desperate === true;
    const rivals = pass.rivals as Record<string, Record<string, unknown>> | undefined;
    for (const id of RIVAL_IDS) {
      const r = rivals?.[id];
      if (!r) continue;
      const fate = r.fate === "bought" || r.fate === "partner" || r.fate === "ruin" ? r.fate : null;
      out.pass.rivals[id] = {
        fans: typeof r.fans === "number" && Number.isFinite(r.fans) ? Math.max(0, Math.floor(r.fans)) : PASS_RIVALS[id].fans,
        fate,
        fallen: r.fallen === true && fate === null,
      };
    }
  }
  const book = src.book as Record<string, unknown> | undefined;
  for (const id of PIECE_IDS) {
    const v = book?.[id];
    if (v === "heard" || v === "held") out.book[id] = v;
    const w = (src.won as Record<string, unknown> | undefined)?.[id];
    if (w === "trust" || w === "desire" || w === "coin" || w === "fists") out.won[id] = w;
  }
  if (Array.isArray(src.flags)) out.flags = src.flags.filter((f): f is string => typeof f === "string");
  return out;
}
