/**
 * Chapter 1, Tarven (STORY.md section 7): the Village Ledger, fans, and the beats they bring.
 *
 * Fans are the guests who keep coming back. She earns them each night (counted at dawn) and the story moves on
 * them, never on the night count: a beat fires on the first morning after she reaches its fan count, in order, at
 * most one a morning. Tarven has five houses with fixed fans; she opens 6th of 6 and passes them one by one, and
 * when she passes the Copper Bell she's first in Tarven.
 *
 * Nothing here ends the run. Missing Pell's collections or maxing the heat brings debuffs (debuffs.ts), not an
 * ending.
 */
import type { LastCall } from "./tavern";

// ---- Fans ----

/** Fans for each guest, as they leave: happy, delighted (served fast, clean room, a good mood), or walked out. */
export const FANS_HAPPY = 5;
export const FANS_DELIGHTED = 10;
export const FANS_WALKOUT = -5;
/** Fans lost for a filthy room at closing. */
export const FANS_FILTHY = -15;
/** A room this messy at closing counts as filthy. */
export const FILTHY_AT = 4;

// ---- The Village Ledger ----

export type HouseId = "cider" | "bakehouse" | "canteen" | "tollgate" | "copperBell";

export interface HouseDef {
  id: HouseId;
  name: string;
  /** Who runs it, as she knows them. */
  boss: string;
  /** Its fans: fixed in the village. She passes it when hers go past. */
  fans: number;
  /** What it's known for, and what it takes from her. */
  known: string;
  /** What its boss gives up when they come in, whichever way she beats them. */
  clue: string;
  /** What its boss says, coming in the morning after it falls. */
  arrives: string;
}

/** Tarven's five houses, from the smallest (5th) to the biggest (1st). */
export const HOUSES: readonly HouseDef[] = [
  {
    id: "cider",
    name: "Hollin's Cider Barn",
    boss: "Hollin",
    fans: 100,
    known: "Farmers drink on credit in his barn",
    clue: "His credit book: half the farmers owe Hollin, and Hollin owes the Baron.",
    arrives: "Hollin stands in your doorway turning his hat in his hands. \"Half my regulars drink at yours now. So. What's it to be between us?\"",
  },
  {
    id: "bakehouse",
    name: "The Bakehouse",
    boss: "Goodwife Tansy",
    fans: 200,
    known: "Pies and gossip at one long table",
    clue: "Tansy knew Wren in the old days, when the house had a lantern in the window. She won't say more. Not yet.",
    arrives: "Goodwife Tansy sets a pie on your bar like a flag of truce. \"Your stew's better than my pies, they're saying. Your grandmother would've laughed.\"",
  },
  {
    id: "canteen",
    name: "The Watch Canteen",
    boss: "Sergeant Pike",
    fans: 300,
    known: "The garrison's drinking room",
    clue: "Pike's soldiers talk about the silver wagons: the toll silver goes up the keep road, and not all of it comes down.",
    arrives: "Sergeant Pike leans on your bar, scar and all. \"My lads won't drink anywhere else now. Fine. Let's talk terms, innkeeper.\"",
  },
  {
    id: "tollgate",
    name: "The Toll-Gate Inn",
    boss: "Agnes Crale",
    fans: 400,
    known: "Beds for travellers at the village gate",
    clue: "Agnes writes down every traveller for Pell. He has eyes at every door in Tarven.",
    arrives: "Agnes Crale looks your room over through her spectacles, the way she looks at every traveller. \"Well. You've taken my guests. What now?\"",
  },
  {
    id: "copperBell",
    name: "The Copper Bell",
    boss: "Jory Bell",
    fans: 500,
    known: "The big tavern on the square",
    clue: "In Jory's back room: Pell's drafts of Wren's debt note. The handwriting is Pell's. The debt is forged.",
    arrives: "Jory Bell taps the copper bell pin on his waistcoat. \"First in Tarven. Who'd have thought it, from Wren's little granddaughter. Shall we be friends?\"",
  },
];

export const HOUSE_BY_ID: ReadonlyMap<HouseId, HouseDef> = new Map(HOUSES.map((h) => [h.id, h]));

/** How a fallen house went: partnered (it sends her fans and a little gold), or ruined (closed, half its fans hers). */
export type HouseFate = "partner" | "ruin";

/** A partner house sends this much gold, and these fans, every night. */
export const PARTNER_GOLD = 3;
export const PARTNER_FANS = 5;
/** Ruining a house: the corruption and heat it costs. Half its fans come to her. */
export const RUIN_CORRUPTION = 10;
export const RUIN_HEAT = 1;

/** Her rank in the village: 6th with none beaten, 1st with all five. */
export function rankOf(beaten: number): number {
  return HOUSES.length + 1 - beaten;
}

export function ordinal(n: number): string {
  return ["", "1st", "2nd", "3rd", "4th", "5th", "6th"][n] ?? `${n}th`;
}

// ---- Beats ----

/**
 * The beats of Chapter 1, in order, with the fans that bring each (STORY.md "Chapter 1, beat by beat"). A night
 * beat plays one of the written nights; a house beat brings its boss in; Pell comes at dawn, and collects.
 */
export type Beat =
  | { id: string; fans: number; kind: "night"; night: number }
  | { id: string; fans: number; kind: "house"; house: HouseId; collect?: boolean }
  | { id: string; fans: number; kind: "pell" };

export const BEATS: readonly Beat[] = [
  { id: "salt", fans: 0, kind: "night", night: 0 },
  { id: "deserter", fans: 50, kind: "night", night: 1 },
  { id: "cider", fans: 101, kind: "house", house: "cider" },
  { id: "meeting", fans: 150, kind: "night", night: 2 },
  { id: "bakehouse", fans: 201, kind: "house", house: "bakehouse" },
  { id: "pell", fans: 250, kind: "pell" },
  { id: "canteen", fans: 301, kind: "house", house: "canteen", collect: true },
  { id: "tollgate", fans: 401, kind: "house", house: "tollgate", collect: true },
  { id: "copperBell", fans: 501, kind: "house", house: "copperBell", collect: true },
];

// ---- Pell and the debt ----

/** What Pell names at dawn: the debt doubles, unless she promises the book. Collected in three parts. */
export const DOUBLED_DEBT = 300;
export const COLLECTION = 100;
/** After the chapter's last collection, anything still owed is collected every this many nights. */
export const LATE_EVERY = 7;

export const PELL_AT_DAWN = [
  "Pell is sitting at your bar when you come down, as if he's always been there.",
  "\"Keep your hundred and fifty. The Baron wants the book your grandmother kept. Bring it to him and the debt is forgotten. Hide it, and the debt doubles.\"",
];
export const PELL_PROMISE = "Promise him the book";
export const PELL_REFUSE = "\"There is no book.\" (the debt doubles)";

/**
 * Pell reads who she's become (STORY.md section 4b, "One choice that changes"): her arc stage (early is Sheltered or
 * Curious, late is Willing or Known) and whether she's honest or shady and worse. His opening line changes, and two
 * answers are only there for some of her.
 */
export type PellAnswer = "promise" | "refuse" | "defy" | "ear";

/** Corruption from which she counts as shady (STORY.md section 8). */
export const SHADY_AT = 40;

export function pellOpening(late: boolean, shady: boolean): string {
  if (!late && !shady) return "\"You've your grandmother's chin. Not her nerve, I think.\"";
  if (!late) return "\"You count like she did. Good. Then you can count to three hundred.\"";
  if (!shady) return "\"Half the garrison has had a hand on you. Who'd take your word over the Baron's?\"";
  return "\"Wren sold what men told her in bed. I hear you've the same ear.\"";
}

/** Early and honest, with the village behind her (trust at half or more): she throws him out. */
export const PELL_DEFY = "\"Get out of my house.\" (the debt doubles; heat +2, trust +2)";
export const DEFY_HEAT = 2;
export const DEFY_TRUST = 2;
export const PELL_DEFIED =
  "You tell Pell to get out of your house, loud enough for the street. He goes. By noon the whole village knows the new keeper threw the Baron's man out, and the farmers are buying each other drinks over it.";

/** Late and shady: she offers him what the room tells her, instead of the book. */
export const PELL_EAR = "\"The room talks to me. You could have that instead.\" (the debt stays; corruption)";
export const EAR_CORRUPTION = 10;
export const EAR_TRUST = -1;
export const PELL_EARS =
  "Pell smiles for the first time. \"Names, then. A name at every collection, and the Baron will take half the gold.\" The debt stays as it was.";
/** With his ear, each collection is this much gold, and a name. */
export const EAR_COLLECTION = 50;
/** Each name she gives him: informing, and it costs her. */
export const NAME_CORRUPTION = 3;
export const WREN_FIRST_LETTER =
  "Later, in the hollow leg of the stool Grandma always sat on, you find a letter in her hand: \"If Pell is asking you about my book, then I'm already dead, and it wasn't my heart. Don't drink anything he pours.\"";

// ---- The house above fights back ----

export type RivalMove = "poach" | "rumor" | "thug";
export const RIVAL_MOVE_CHANCE = 0.4;
export const POACHED = 2;

export function rivalMoveLine(move: RivalMove, house: HouseDef): string {
  if (move === "poach") return `${house.name} is pouring cheap tonight. Fewer folk will come your way.`;
  if (move === "rumor") return `Someone from ${house.name} has been talking about you in the square.`;
  return `${house.boss} has paid someone to start trouble in your room tonight.`;
}

// ---- Side nights ----

/** How a night between beats opens. */
export const SIDE_INTROS: readonly string[] = [
  "A quiet night on the pass. The road brings who it brings.",
  "Rain on the shutters. The ones who come in tonight will want something hot.",
  "Market day in the valley: folk heading home with coin in their purses.",
  "A cold, clear night. The garrison's changed its watch, and the new lot are thirsty.",
];

/**
 * Small rumours for nights between beats, from a shuffled pool (STORY.md "What nights do"). Selling or keeping one
 * moves trust, heat and gold a little, never a story flag. Same shape as the beats' last calls: tell, protect, sell.
 */
export const SIDE_RUMORS: readonly LastCall[] = [
  {
    visitor: "A red-faced farmer",
    question: "Somebody's been at my goat. You hear everything in here. Who took her?",
    rumor: "The farmers laughed that the miller's boys walked off with old Bram's goat for a dare.",
    heard: [
      { label: "Tell him: the miller's boys", result: "He storms off to the mill. There's shouting by morning.", gold: 0, trust: -1, heat: 0 },
      { label: "\"Maybe she wandered off.\"", result: "He grumbles and goes. The miller's boys buy you a drink next night.", gold: 0, trust: 1, heat: 0 },
      { label: "Sell it: a coin for a name", result: "He pays, and the whole village hears who told.", gold: 6, trust: -1, heat: 0 },
    ],
    unheard: [
      { label: "Say you heard nothing", result: "He leaves to ask the next tavern.", gold: 0, trust: 0, heat: 0 },
      { label: "Guess at someone", result: "He thanks you, and goes off to accuse the wrong man.", gold: 0, trust: -1, heat: 0 },
    ],
  },
  {
    visitor: "The widow Hesk's footman",
    question: "My mistress hears a farmer has been courting her with turnips. Which farmer?",
    rumor: "The farmers teased old Dell about the turnips he leaves on the widow Hesk's step.",
    heard: [
      { label: "Tell him: old Dell", result: "The footman writes it down. Dell won't get past the widow's gate again.", gold: 2, trust: -1, heat: 0 },
      { label: "\"I wouldn't know.\"", result: "Dell hears you kept his secret, and leaves you a sack of turnips.", gold: 0, trust: 1, heat: 0 },
      { label: "Sell it", result: "The footman pays from the widow's purse. The valley knows by noon.", gold: 8, trust: -1, heat: 0 },
    ],
    unheard: [
      { label: "Say you heard nothing", result: "He sniffs and leaves.", gold: 0, trust: 0, heat: 0 },
      { label: "Make something up", result: "He goes away pleased. The widow will be confused.", gold: 2, trust: 0, heat: 0 },
    ],
  },
  {
    visitor: "A garrison corporal",
    question: "A cask of the garrison's brandy went missing off a cart. Anyone been boasting?",
    rumor: "A smuggler bragged about a cask of army brandy, tucked away in the ruined chapel tower.",
    heard: [
      { label: "Tell him: the chapel tower", result: "The garrison gets its brandy back. The smugglers don't forget.", gold: 3, trust: -1, heat: -1 },
      { label: "\"Not in my room.\"", result: "The corporal shrugs. A cup of very good brandy turns up behind your bar.", gold: 0, trust: 1, heat: 1 },
      { label: "Sell it", result: "He pays you from his own pocket and looks at you differently.", gold: 10, trust: -1, heat: 0 },
    ],
    unheard: [
      { label: "Say you heard nothing", result: "He drinks up and goes.", gold: 0, trust: 0, heat: 0 },
      { label: "Make something up", result: "He goes off searching the wrong barn.", gold: 2, trust: 0, heat: 1 },
    ],
  },
  {
    visitor: "A chapel brother",
    question: "Brother Oden's poor box was lighter this morning. Has anyone been spending chapel coin?",
    rumor: "A soldier laughed that Corporal Fenn has been paying for his drinks in chapel pennies.",
    heard: [
      { label: "Tell him: Corporal Fenn", result: "The brother thanks you. Fenn is on latrine duty for a month.", gold: 0, trust: 1, heat: 1 },
      { label: "\"I couldn't say, brother.\"", result: "He blesses you anyway. Fenn tips well tonight.", gold: 2, trust: 0, heat: 0 },
      { label: "Sell it to the corporal instead", result: "Fenn pays you to forget. The brother looks at you sadly as he goes.", gold: 6, trust: -1, heat: 0 },
    ],
    unheard: [
      { label: "Say you heard nothing", result: "The brother sighs and goes.", gold: 0, trust: 0, heat: 0 },
      { label: "Promise to keep an eye out", result: "He thanks you, and means it.", gold: 0, trust: 1, heat: 0 },
    ],
  },
];

/** The card at 501 fans: the end of Chapter 1, and what comes next. */
export const FIRST_IN_TARVEN = [
  "Every table in Tarven is talking about your house tonight. Not the Copper Bell. Yours.",
  "First in Tarven. Grandma Wren would have poured herself something strong and said nothing at all.",
  "At the door, riders in the Gilded Stag's colours are handing out cards. The pass has noticed you. (To be continued: the pass.)",
];
