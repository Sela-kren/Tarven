import { cloneLayout, type HouseLayout } from "./house";
import { faceLine } from "./facetalk";
import { arrivalFeelings, arrivalMood, feltMood, MOOD_LABELS, moodAfterDrink, moodAfterReply, moodWhenServed, moodWhileWaiting, MOOD_BEHAVIOUR, type Mood } from "./mood";
import {
  complimentReplies,
  COMPLIMENTS,
  FAVORS,
  newPersona,
  OFFERS,
  pickLine,
  readPersona,
  REMARKS,
  shiftPersona,
  SPEAKERS,
  type BanterContext,
  type Persona,
  type PlayerBody,
  type Reply,
} from "./banter";

/**
 * The rules of the game, with no graphics. The view layer tells this class what
 * the player did and reads the state back, which keeps the rules unit-testable.
 */

export type Item = "ale" | "bread" | "stew" | "cask";
export type GuestKind = "farmer" | "smuggler" | "soldier" | "fugitive";
export type Station = "tap" | "bread" | "pot" | "barrel" | "bin" | "wash";
/** What food and drink are served on. The tavern owns a set number of each, and they have to be washed to be used again. */
export type Ware = "cup" | "dish";
/** What can be in your hands: something to serve, or a stack of dirty dishes on the way to the tub. */
export type Held = Item | "dirty";
/** A day: closed while it's light, "dusk" once the bell rings and the tavern waits for nightfall, then
 * the night's service and last call. "bedtime" is the closed tavern after last call, until you go to bed,
 * and "dawn" is the morning after. The world clock, not the tavern, decides when night falls. */
export type Phase = "day" | "dusk" | "service" | "lastcall" | "bedtime" | "dawn" | "ended";
export type GuestStatus = "arriving" | "waiting" | "eating" | "leaving";
export type PotState = "empty" | "cooking" | "ready" | "burnt";
export type Target =
  | { kind: "station"; station: Station }
  | { kind: "guest"; id: number }
  | { kind: "mess"; id: number }
  | { kind: "bell" }
  | { kind: "bed" }
  | { kind: "door" }
  | { kind: "desk" };
/** A sound the rules ask for. What each one actually sounds like is up to the audio layer. */
export type Cue =
  | "pour" | "aleReady" | "takeAle" | "takeBread" | "takeStew" | "takeCask" | "putDown" | "refill"
  | "stewStart" | "stewReady" | "stewBurnt" | "serve" | "tip" | "buy" | "drink" | "guestIn" | "walkOut"
  | "doorOpen" | "doorClose" | "smashTray" | "smashOne" | "drop" | "dishes" | "wipe" | "rumor";
const TAKE_CUES: Record<Item, Cue> = { ale: "takeAle", bread: "takeBread", stew: "takeStew", cask: "takeCask" };
/** What a night leaves behind: dirty dishes on the tables, ale on the floor, and dust tracked in. */
export type MessKind = "dishes" | "spill" | "dust";
export type UpgradeId = "quicktap" | "bigpot" | "cushions";
export type EndingId = "arrested" | "overthrow" | "kept" | "lost";

export const DEBT = 150;
export const TRUST_MAX = 15;
export const TRUST_TO_OVERTHROW = 13;
export const HEAT_MAX = 8;
export const UPGRADE_COST = 20;

const START_TRUST = 3;
const TAP_SIZE = 8;
const POUR_TIME = 1.5;
const QUICK_POUR_TIME = 0.8;
const STEW_TIME = 8;
/** How long ready stew keeps before it burns. Long enough for one person to serve a pot's worth. */
const BURN_TIME = 40;
const POT_BOWLS = 3;
const BIG_POT_BOWLS = 5;
/** How long someone on their own takes over their food or drink, in seconds: a random time in this range. */
const EAT_ALONE: readonly [number, number] = [18, 28];
/** A party takes longer, because they talk first: long enough for their chat and some table talk after it. */
const EAT_IN_PARTY: readonly [number, number] = [36, 50];
/** A guest with something to let slip lingers, so there's time to overhear it. */
const RUMOR_EXTRA_EAT = 6;
const LISTEN_TIME = 3;
// How popularity moves. Being served well spreads your name; people walking out, or selling them out, doesn't.
const FAME_SERVED = 1;
const FAME_TIPPED = 1;
const FAME_IDOLIZED = 1;
const FAME_WALKOUT = -2;
const FAME_DEEDS = [-6, 8, -3];
const RESPECT_DEEDS = [-2, 2, -1];
/** This drunk in front of the customers, and they stop taking you seriously. */
const SLOPPY_DRUNK = 0.6;
/** How often a guest full of lust flatters you rather than asking a favor. */
const LUSTY_COMPLIMENT_SHARE = 0.9;
const CUSHION_PATIENCE = 1.25;
// The morning after. Every guest leaves something to clean up, and a dirty room wears on the next night's guests.
/** Patches of dust the night's crowd always tracks in, plus one more for every few guests. */
const DUST_BASE = 3;
const GUESTS_PER_DUST = 3;
/** How much patience guests lose in a filthy room, and how many messes count as filthy. */
const MESS_PATIENCE_LOSS = 0.3;
const MESS_FOR_FULL_LOSS = 8;

// The washing up. Everything served goes out on a cup or a dish, and comes back dirty when the guest is done.
const START_CUPS = 6;
const START_DISHES = 6;
/** Seconds of scrubbing per cup or dish, standing at the tub with empty hands. */
const WASH_TIME = 1;
/** More can be bought in the morning, this many at a time, for this much. */
export const STOCK_PACK = 3;
export const STOCK_COST = 10;
export const WARE_NAMES: Record<Ware, string> = { cup: "cups", dish: "dishes" };
const WARE_OF: Record<Item, Ware | null> = { ale: "cup", bread: "dish", stew: "dish", cask: null };

/** Ale goes on a tray, which holds this many cups. Everything else is carried one at a time. */
export const TRAY_SIZE = 3;

// Drinking. Drunkenness runs from 0 (sober) to 1 (can barely stand).
export const DRUNK_MAX = 1;
/** How much one drink with a table adds. */
const DRINK_STRENGTH = 0.3;
/** How fast you sober up, per second. One drink wears off in about half a minute. */
const SOBER_RATE = 0.01;
/** How many drinks one table will pour for you. */
const DRINKS_PER_TABLE = 2;
/** Past this, nobody pours you another. */
const TOO_DRUNK = 0.85;
/** What each guest at a table pays towards a jug of ale. */
const JUG_PAY = 3;
/** How much slower ale pours when you're drunk: half as slow again at the worst. */
const DRUNK_FUMBLE = 0.5;
/** How often a guest you served well offers you a drink as their tip, and gets talking. */
const TIP_CHAT_CHANCE = 0.35;
/** Of those, how many pay you a compliment; the rest ask a favor. */
const COMPLIMENT_SHARE = 0.6;
/** What a guest adds when you drink the one they bought you. */
const TIP_DRINK_BONUS = 2;
/** How often a guest also brings up something they've heard about you, when there's something to bring up. */
const REMARK_CHANCE = 0.6;

/** "Name: \"Words\"" becomes the name and the words; anything else is narration. */
function splitSpeaker(text: string): TalkLine {
  const match = /^([A-Z][A-Za-z ]{0,24}): (".*)$/.exec(text);
  return match ? { speaker: match[1], text: match[2] } : { speaker: null, text };
}

const narrate = (text: string): TalkLine => ({ speaker: null, text });
/** The player's own words. */
const you = (text: string): TalkLine => ({ speaker: "You", text });

/** A word for how drunk the player is, or "" when sober. */
export function drunkLabel(level: number): string {
  if (level >= 0.75) return "Hammered";
  if (level >= 0.45) return "Drunk";
  if (level >= 0.15) return "Tipsy";
  return "";
}
/** Serving with more than this share of patience left earns the tip. */
const TIP_THRESHOLD = 0.5;

interface KindRules {
  patience: number;
  pay: number;
  tip: number;
  trust: number;
  walkoutHeat: number;
}

export const GUEST_KINDS: Record<GuestKind, KindRules> = {
  farmer: { patience: 55, pay: 4, tip: 2, trust: 1, walkoutHeat: 0 },
  smuggler: { patience: 40, pay: 9, tip: 4, trust: 0, walkoutHeat: 0 },
  soldier: { patience: 30, pay: 6, tip: 1, trust: 0, walkoutHeat: 2 },
  fugitive: { patience: 45, pay: 5, tip: 3, trust: 1, walkoutHeat: 0 },
};

export const UPGRADES: Record<UpgradeId, { name: string; detail: string }> = {
  quicktap: { name: "Better tap", detail: "Ale pours almost twice as fast." },
  bigpot: { name: "Bigger pot", detail: "Each pot makes 5 bowls instead of 3." },
  cushions: { name: "Cushions", detail: "Guests wait 25% longer." },
};

export interface Choice {
  label: string;
  result: string;
  gold: number;
  trust: number;
  heat: number;
}

export interface LastCall {
  visitor: string;
  question: string;
  rumor: string;
  heard: Choice[];
  unheard: Choice[];
}

interface Arrival {
  at: number;
  kind: GuestKind;
  order: Item;
  rumor?: boolean;
  /** Guests with the same party come in together, sit at one table, and talk. An index into the night's parties. */
  party?: number;
}

/** A group of guests who come in together and talk over a table. */
export interface PartyPlan {
  /** What they're saying as you walk up, one line per speaker. */
  chat: string[];
  /** What they go on to say among themselves, in the same form. */
  overheard?: string[];
  /** What they say as they pour you one. */
  offer: string;
  /** What a drink loosens out of them. If the night's rumor is at this table, it comes out too. */
  gossip: string;
}

export interface NightPlan {
  intro: string;
  guests: Arrival[];
  parties: PartyPlan[];
  lastCall: LastCall;
}

const arrive = (at: number, kind: GuestKind, order: Item, rumor = false, party?: number): Arrival => ({
  at,
  kind,
  order,
  rumor,
  party,
});

export const NIGHTS: NightPlan[] = [
  {
    intro: "Night 1. Ale is at the bar, bread is in the basket on the crates. Take dirty cups and dishes to the wash tub by the barrels. Press E to act.",
    guests: [
      arrive(3, "farmer", "ale"),
      arrive(10, "soldier", "ale"),
      arrive(17, "farmer", "bread", false, 0),
      arrive(17, "farmer", "ale", false, 0),
      arrive(25, "smuggler", "ale", true),
      arrive(33, "fugitive", "bread"),
      arrive(42, "soldier", "bread"),
    ],
    parties: [
      {
        chat: [
          "Farmer: \"Snow's coming early to the pass this year. I can smell it.\"",
          "Other farmer: \"Snow or no snow, the baron's men will still want their toll.\"",
          "Farmer: \"Innkeeper! Sit with us a moment, you look like you need it.\"",
        ],
        overheard: [
          "Farmer: \"Did you pay Hollin back for the seed?\"",
          "Other farmer: \"With what? I paid him in promises.\"",
          "Farmer: \"He's got a barn full of those.\"",
          "Other farmer: \"Then he can plant them. They'll come up as well as the barley did.\"",
          "Farmer: \"It wasn't always like this. Remember the year of the plums?\"",
          "Other farmer: \"I remember the toll they put on plums.\"",
          "Farmer: \"They can't tax a thing if we eat it first.\"",
          "Other farmer: \"Don't say that too loud. They'll start charging by the mouthful.\"",
        ],
        offer: "The farmer slides a cup across. \"To the harvest, what's left of it.\"",
        gossip: "\"Between us, half the valley's behind on what they owe. The baron can't foreclose on all of us.\"",
      },
    ],
    lastCall: {
      visitor: "The baron's tax collector",
      question: "Someone is running untaxed salt over this pass. Who have you heard talking?",
      rumor: "The smuggler muttered that the salt is hidden under the chapel floor.",
      heard: [
        { label: "Tell the truth: the chapel floor", result: "He smiles and writes it down. By morning the village knows who talked.", gold: 5, trust: -3, heat: -2 },
        { label: "Lie: send him to the empty quarry", result: "He leaves for the quarry. The smugglers quietly leave you a thank-you.", gold: 0, trust: 2, heat: 1 },
        { label: "Sell it: name your price", result: "He pays well and despises you for it.", gold: 25, trust: -2, heat: -1 },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "He doesn't believe you, and he makes a note of your name.", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays for your story. He will be back when it proves false.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
  {
    intro: "Night 2. Stew is on the menu. Start the pot at the fire early, and serve it before it burns.",
    guests: [
      arrive(2, "farmer", "stew"),
      arrive(7, "soldier", "ale"),
      arrive(12, "smuggler", "stew"),
      arrive(17, "farmer", "bread"),
      arrive(23, "fugitive", "stew", true, 0),
      arrive(23, "smuggler", "ale", false, 0),
      arrive(29, "soldier", "ale", false, 1),
      arrive(29, "soldier", "bread", false, 1),
      arrive(35, "farmer", "ale"),
      arrive(41, "smuggler", "bread"),
      arrive(48, "soldier", "stew"),
    ],
    parties: [
      {
        chat: [
          "Smuggler: \"Keep your voice down. Half this room drinks with the garrison.\"",
          "Pale stranger: \"I know. I know. I just need to get over the ridge.\"",
          "Smuggler: \"Innkeeper. Join us. A friendly face makes a quiet table.\"",
        ],
        overheard: [
          "Pale stranger: \"That one by the fire keeps looking over.\"",
          "Smuggler: \"They're looking at the fire. Laugh at something.\"",
          "Pale stranger: \"I can't remember how.\"",
          "Smuggler: \"Then cough. Anything. You look like someone at their own hanging.\"",
          "Pale stranger: \"How do you stand it? Every night, like this?\"",
          "Smuggler: \"You get used to it. Or you get caught. It settles itself.\"",
          "Pale stranger: \"You're not a comfort.\"",
          "Smuggler: \"I'm not paid to be. Eat your stew.\"",
        ],
        offer: "The smuggler pours without asking. \"Drink. Nobody listens to a table that's laughing.\"",
        gossip: "The stranger's hands stop shaking after a second cup, and they lean in close.",
      },
      {
        chat: [
          "Soldier: \"Three weeks on this road and not one decent bed.\"",
          "Other soldier: \"Shut it. The sergeant's got ears in every tavern on the pass.\"",
          "Soldier: \"Innkeeper! Drink with the baron's finest, eh?\"",
        ],
        overheard: [
          "Other soldier: \"Pike says we're to double the watch on the ridge.\"",
          "Soldier: \"With who? Half the fort's got the flux.\"",
          "Other soldier: \"Then the other half's on double watch.\"",
          "Soldier: \"Who's even coming over the ridge in this?\"",
          "Other soldier: \"Somebody's got the captain in a sweat.\"",
          "Soldier: \"The captain sweats if you hand him a spoon.\"",
          "Other soldier: \"Keep that to yourself.\"",
          "Soldier: \"I keep everything to myself. It's all I've been paid in.\"",
        ],
        offer: "The soldier bangs a cup down in front of you. \"To the baron! May he choke on it.\"",
        gossip: "\"Word is the baron's short of silver himself. That's why he's squeezing every inn on the road.\"",
      },
    ],
    lastCall: {
      visitor: "A bounty hunter",
      question: "I'm tracking a deserter from the baron's army. Did one come through tonight?",
      rumor: "The pale stranger whispered that they deserted and are heading for the border at dawn.",
      heard: [
        { label: "Tell the truth: the border, at dawn", result: "He rides out at once. Nobody speaks to you at the well the next day.", gold: 5, trust: -3, heat: -2 },
        { label: "Lie: point him back down the valley", result: "He rides the wrong way. Someone leaves flowers on your step.", gold: 0, trust: 2, heat: 1 },
        { label: "Sell it: name your price", result: "He counts the coins onto the bar without looking at you.", gold: 25, trust: -2, heat: -1 },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "He shrugs and tells you the baron hates a blind innkeeper.", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays you for it. He does not look like a forgiving man.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
  {
    intro: "Night 3. The last night before the baron collects. The road is busy, so keep moving.",
    guests: [
      arrive(2, "soldier", "ale"),
      arrive(6, "farmer", "stew"),
      arrive(10, "smuggler", "ale"),
      arrive(15, "farmer", "bread", true, 0),
      arrive(15, "farmer", "ale", false, 0),
      arrive(15, "smuggler", "stew", false, 0),
      arrive(20, "soldier", "stew"),
      arrive(24, "fugitive", "ale"),
      arrive(29, "smuggler", "stew"),
      arrive(34, "farmer", "ale"),
      arrive(38, "soldier", "bread", false, 1),
      arrive(38, "soldier", "ale", false, 1),
      arrive(43, "fugitive", "stew"),
      arrive(48, "farmer", "bread"),
      arrive(54, "smuggler", "ale"),
    ],
    parties: [
      {
        chat: [
          "Old farmer: \"Tomorrow the debt falls due, and then we'll see who owns this valley.\"",
          "Young farmer: \"Hush, grandfather. Not here.\"",
          "Stranger: \"Let the innkeeper sit. Whose side are you on, friend?\"",
        ],
        overheard: [
          "Young farmer: \"You're too loud, grandfather. You always are after two cups.\"",
          "Old farmer: \"At my age you say it while you can.\"",
          "Stranger: \"They're right about the cups, old man.\"",
          "Old farmer: \"I buried a wife and three harvests on that hill. I'll be as loud as I like.\"",
          "Young farmer: \"And if they come for you?\"",
          "Old farmer: \"Then they'll have to carry me. I'm not walking anywhere for that man.\"",
          "Stranger: \"I'd like to have known you when you were young.\"",
          "Old farmer: \"You'd have owed me money.\"",
        ],
        offer: "The old farmer fills your cup to the brim. \"Drink, and then tell me we can trust you.\"",
        gossip: "\"Every family on the pass is in it now. All they need is one night and one place.\"",
      },
      {
        chat: [
          "Soldier: \"The captain wants names by morning. Names, or it's our hides.\"",
          "Other soldier: \"Then let's drink till we've forgotten our own.\"",
          "Soldier: \"Innkeeper! You hear everything. Have one on the baron.\"",
        ],
        overheard: [
          "Other soldier: \"What do we give him, then? For names?\"",
          "Soldier: \"Yours, if you don't drink up.\"",
          "Other soldier: \"I grew up with half these people.\"",
          "Soldier: \"I know you did.\"",
          "Other soldier: \"My aunt keeps geese out by the bridge.\"",
          "Soldier: \"Then don't say her name, and don't think about it.\"",
          "Other soldier: \"Is that an order?\"",
          "Soldier: \"It's the only good advice you'll get in this uniform.\"",
        ],
        offer: "\"Go on, it's the baron's coin.\" The soldier tops your cup up twice.",
        gossip: "\"Half the garrison wouldn't lift a sword if the village came for the baron. Don't tell the captain I said so.\"",
      },
    ],
    lastCall: {
      visitor: "The baron's captain",
      question: "The villagers are meeting in secret against my lord. Where?",
      rumor: "An old farmer said the village meets at the mill, the night after the debt falls due.",
      heard: [
        { label: "Tell the truth: the old mill", result: "Soldiers march for the mill before sunrise.", gold: 5, trust: -3, heat: -2 },
        { label: "Lie: the ruins on the north road", result: "The captain marches his men into the snow, away from the mill.", gold: 0, trust: 2, heat: 1 },
        { label: "Sell it: name your price", result: "He pays in the baron's own silver. It feels heavier than it should.", gold: 25, trust: -2, heat: -1 },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "\"Tomorrow,\" he says, \"you'll wish you had.\"", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays you and sends a rider to check.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
];

export const ENDINGS: Record<EndingId, { title: string; text: string }> = {
  arrested: {
    title: "Arrested",
    text: "The baron has heard enough about the tavern on the pass. Soldiers break down the door, and you are marched away in irons.",
  },
  overthrow: {
    title: "The Village Rises",
    text: "When the baron comes to collect, the whole village is waiting at your door. He rides away with nothing, and the debt dies with his power on the pass.",
  },
  kept: {
    title: "Paid in Full",
    text: "You count the coins onto the bar and the baron takes them without a word. The tavern is yours. For now.",
  },
  lost: {
    title: "Foreclosed",
    text: "The money isn't there. The baron's men nail the door shut, and you walk down the mountain with what you can carry.",
  },
};

export interface Guest {
  id: number;
  kind: GuestKind;
  order: Item;
  seat: number;
  status: GuestStatus;
  patience: number;
  maxPatience: number;
  eatLeft: number;
  rumor: boolean;
  listened: number;
  /** The party this guest came in with, as an index into the night's parties, or null for someone alone. */
  party: number | null;
  /** Hidden from the player for now: nothing shows these and nothing changes them yet. 0 to 10. */
  lust: number;
  desires: number;
  /** The state they're in, which changes how they talk and behave. */
  mood: Mood;
}

/** Something to clean up. */
export interface Mess {
  id: number;
  kind: MessKind;
  /**
   * Dishes: the seats at one table that were eaten at. A spill: the one seat it's under. Dust: which of
   * the room's dust spots it lies on (the game decides where those are).
   */
  spots: number[];
  /** Dishes only: what was left at each of the spots, in the same order. Older saves have none. */
  wares?: Ware[];
}

/** The cups and dishes in a pile. A pile from an older save counts as one dish per seat. */
export function messWares(mess: Mess): Ware[] {
  if (mess.kind !== "dishes") return [];
  return mess.wares ?? mess.spots.map(() => "dish");
}

/** "the dirty cup", "the dirty dish", or "the 3 dirty dishes". */
function dirtyWords(wares: readonly Ware[]): string {
  return wares.length === 1 ? `the dirty ${wares[0]}` : `the ${wares.length} dirty dishes`;
}

const copyMess = (mess: Mess): Mess => ({
  ...mess,
  spots: [...mess.spots],
  ...(mess.wares ? { wares: [...mess.wares] } : {}),
});

/** One option in a conversation at a table. */
export interface TalkChoice {
  label: string;
  disabled: boolean;
}

/** One thing said in a conversation: who says it ("You" for the player, null for narration) and what. */
export interface TalkLine {
  speaker: string | null;
  text: string;
  /** The guest speaking, so the game can show them. */
  guestId?: number;
}

/** A guest who has tipped you with a drink, and has something to say while you're there. */
interface TipChat {
  speaker: string;
  guestId: number;
  lines: TalkLine[];
  replies: Reply[];
  drank: boolean;
  answered: boolean;
  /** What was just said, after their lines. */
  reply: TalkLine[];
}

/** The state that lasts between nights. */
export interface TavernSave {
  nightIndex: number;
  gold: number;
  trust: number;
  heat: number;
  upgrades: UpgradeId[];
  tapLeft: number;
  /** What last night left to clean up. Older saves have none. */
  messes?: Mess[];
  /** Who the player has become. Older saves start from nothing. */
  persona?: Persona;
  /** The building as you've changed it. Older saves, and an untouched building, have none. */
  layout?: HouseLayout;
  /** How many cups and dishes the tavern owns. Older saves start with the usual set. */
  stock?: Record<Ware, number>;
  /** What was left in the wash tub. */
  tub?: Ware[];
}

export interface TickContext {
  /** Guest the player is close enough to overhear. */
  listeningTo: number | null;
  /** Whether night has fallen, from the world clock. Once the doors are open, it starts the night. */
  night: boolean;
  /** The sibling standing at the wash tub, if any. With empty hands, they scrub what's in it. */
  scrubber?: number | null;
}

export interface Prompt {
  label: string;
  actionable: boolean;
}

interface Action {
  label: string;
  run?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MESS_LABELS: Record<Exclude<MessKind, "dishes">, string> = {
  spill: "Mop up the spilt ale",
  dust: "Sweep up the dust",
};
const MESS_DONE: Record<Exclude<MessKind, "dishes">, string> = {
  spill: "Floor mopped.",
  dust: "Swept.",
};

/** The numbers 0 to count - 1 in an order that looks random but is always the same for a seed. */
function shuffled(count: number, seed: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  let state = seed >>> 0 || 1;
  for (let i = count - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const STATION_OF_ITEM: Record<Item, Station> = { ale: "tap", bread: "bread", stew: "pot", cask: "barrel" };

export class Tavern {
  phase: Phase = "day";
  nightIndex = 0;
  gold = 0;
  trust = START_TRUST;
  heat = 0;
  clock = 0;

  readonly guests: Guest[] = [];
  /** What each sibling has in their hands. */
  readonly carrying: [Held | null, Held | null] = [null, null];
  /** How many of it: up to TRAY_SIZE cups of ale on a tray, a stack of dirty dishes, otherwise 1. 0 with empty hands. */
  readonly carryCount: [number, number] = [0, 0];
  readonly upgrades = new Set<UpgradeId>();
  /** What's still to be cleaned up. Left alone, it carries on into the next day. */
  readonly messes: Mess[] = [];
  /** How many cups and dishes the tavern owns, clean or not. */
  readonly stock: Record<Ware, number> = { cup: START_CUPS, dish: START_DISHES };
  /** How many are clean and ready to use. */
  readonly cleanWare: Record<Ware, number> = { cup: START_CUPS, dish: START_DISHES };
  /** What's waiting to be scrubbed, next one first. */
  readonly tub: Ware[] = [];

  tapLeft = TAP_SIZE;
  aleReady = 0;
  pourLeft: number | null = null;
  potState: PotState = "empty";
  potTimer = 0;
  potBowls = 0;

  /** The building as you've changed it, or null while it's as it started. Only changes during the day. */
  layout: HouseLayout | null = null;
  /** The bedroom door. It stays however you left it, night to night. */
  doorOpen = false;
  /** Whether you've napped today. */
  napped = false;
  /** How drunk you are, from 0 to DRUNK_MAX. Wears off with time, and sleep clears it. */
  drunk = 0;
  /** The party you're talking with, or null. While set, the game shows the conversation. */
  talkingTo: number | null = null;
  /** What was just said at the table, after the opening chat. */
  private talkReply: TalkLine[] = [];
  /** A guest talking to you over the drink they tipped you, or null. */
  private tipChat: TipChat | null = null;
  /** Who the player is, so what guests say fits them. The game sets it. */
  playerBody: PlayerBody = "Male";
  /** Where chance comes from: which guests offer a drink, and what they say. Tests replace it. */
  random: () => number = Math.random;
  /** The player's reputation, which changes what guests say. It lasts from night to night. */
  persona: Persona = newPersona();
  /** Lines guests have already said, so they say something new next time. */
  private readonly saidLines = new Set<string>();
  /** What a party was saying as you sat down with them. */
  private talkOpening: TalkLine[] = [];
  /** How each party has treated you tonight: drinks poured, and whether you sold them a jug. */
  private readonly partyState = new Map<number, { drinks: number; jug: boolean }>();

  heardRumor = false;
  served = 0;
  walkouts = 0;
  earned = 0;
  lastResult = "";
  ending: EndingId | null = null;

  private nextArrival = 0;
  private nextGuestId = 1;
  private nextMessId = 1;
  /** The dirty cups and dishes in each sibling's hands. */
  private readonly dirtyHeld: [Ware[], Ware[]] = [[], []];
  /** Scrubbing left on the one at the front of the tub. */
  private washLeft = WASH_TIME;
  /** Seats where ale went on the floor tonight. */
  private readonly spiltAt = new Set<number>();
  private readonly messages: string[] = [];
  private readonly cues: Cue[] = [];

  /** `seatTables` names the table each seat is at, so a party can sit together. "Bar" stools are not a table. */
  /** `dustSpots` is how many places in the room dust can settle; with none, nights leave no dust. */
  constructor(
    private seatCount: number,
    private seatTables: readonly string[] = [],
    private readonly dustSpots = 0,
  ) {
    this.openDay();
  }

  /** Replaces the seats, after furniture has moved. Only safe with no guests in the room. */
  setSeats(tables: readonly string[]): void {
    this.seatCount = tables.length;
    this.seatTables = tables;
  }

  /** Rings the bell to open for the night. The night's guests start coming once night has fallen. */
  open(): void {
    if (this.phase !== "day") return;
    this.phase = "dusk";
    this.say(
      this.messes.length > 0
        ? "You ring the bell and open up, mess and all. Guests won't wait as long in a dirty room."
        : "You ring the bell and open up. The sun goes down over Tarven.",
    );
  }

  /** Goes to bed after last call and sleeps until morning. */
  sleep(): void {
    if (this.phase !== "bedtime") return;
    this.phase = "dawn";
    this.drunk = 0;
  }

  /** Naps through the rest of the day while closed. Only once a day; the clock is moved on by the game. */
  nap(): void {
    if (this.phase !== "day" || this.napped) return;
    this.napped = true;
    this.drunk = 0;
    this.say("You wake up in the late afternoon. Ring the bell when you're ready.");
  }

  get plan(): NightPlan {
    return NIGHTS[this.nightIndex];
  }

  get isLastNight(): boolean {
    return this.nightIndex === NIGHTS.length - 1;
  }

  get lastCallChoices(): Choice[] {
    return this.heardRumor ? this.plan.lastCall.heard : this.plan.lastCall.unheard;
  }

  /** Text waiting to be shown to the player. Reading it empties the queue. */
  takeMessages(): string[] {
    return this.messages.splice(0);
  }

  /** Sounds waiting to be played. Reading them empties the queue. */
  takeCues(): Cue[] {
    return this.cues.splice(0);
  }

  private say(text: string): void {
    this.messages.push(text);
  }

  private cue(sound: Cue): void {
    this.cues.push(sound);
  }

  private adjust(gold: number, trust: number, heat: number): void {
    this.gold = Math.max(0, this.gold + gold);
    this.trust = clamp(this.trust + trust, 0, TRUST_MAX);
    this.heat = clamp(this.heat + heat, 0, HEAT_MAX);
  }

  private takenSeats(): Set<number> {
    return new Set(this.guests.filter((g) => g.status !== "leaving").map((g) => g.seat));
  }

  /** Seats with someone's dirty dishes still in front of them. Guests take these only when nothing else is free. */
  private dirtySeats(): Set<number> {
    return new Set(this.messes.flatMap((mess) => (mess.kind === "dishes" ? mess.spots : [])));
  }

  private freeSeat(): number | null {
    const taken = this.takenSeats();
    for (const avoid of [this.dirtySeats(), new Set<number>()]) {
      // Stepping by 5 spreads guests around the room instead of filling it in order.
      for (let i = 0; i < this.seatCount; i++) {
        const seat = (this.nextGuestId * 5 + i) % this.seatCount;
        if (!taken.has(seat) && !avoid.has(seat)) return seat;
      }
    }
    return null;
  }

  /**
   * A seat for someone in a party, beside the rest of the party if one of them is already in. Otherwise the
   * smallest table that fits them all, then side by side at the bar, then wherever most of them fit together.
   */
  private partySeat(party: number): number | null {
    const taken = this.takenSeats();
    const dirty = this.dirtySeats();
    const free = (table: string, allowDirty: boolean) =>
      this.seatTables.flatMap((name, seat) =>
        name === table && !taken.has(seat) && (allowDirty || !dirty.has(seat)) ? [seat] : [],
      );
    const friend = this.guests.find((g) => g.party === party && g.status !== "leaving");
    const friendTable = friend && this.seatTables[friend.seat];
    if (friendTable) return free(friendTable, false)[0] ?? free(friendTable, true)[0] ?? this.freeSeat();

    const size = this.plan.guests.filter((a) => a.party === party).length;
    const rank = ({ name, seats }: { name: string; seats: number[] }) =>
      seats.length >= size ? (name === "Bar" ? 1000 : 0) + seats.length : 2000 - seats.length;
    const best = (allowDirty: boolean) =>
      [...new Set(this.seatTables)]
        .map((name) => ({ name, seats: free(name, allowDirty) }))
        .filter(({ seats }) => seats.length > 0)
        .sort((a, b) => rank(a) - rank(b))[0];
    return best(false)?.seats[0] ?? best(true)?.seats[0] ?? this.freeSeat();
  }

  private spawnArrivals(): void {
    const arrivals = this.plan.guests;
    while (this.nextArrival < arrivals.length && arrivals[this.nextArrival].at <= this.clock) {
      const next = arrivals[this.nextArrival];
      const seat = next.party === undefined ? this.freeSeat() : this.partySeat(next.party);
      if (seat === null) return; // Tries again next tick, once someone leaves.
      this.nextArrival++;
      const { kind, order, rumor, party } = next;
      const maxPatience =
        GUEST_KINDS[kind].patience * (this.upgrades.has("cushions") ? CUSHION_PATIENCE : 1) * this.messPatience;
      const context = this.banterContext(kind);
      const { lust, desires } = arrivalFeelings(context, this.random);
      const filth = Math.min(1, this.messes.length / MESS_FOR_FULL_LOSS);
      this.guests.push({
        id: this.nextGuestId++,
        kind,
        order,
        seat,
        status: "arriving",
        patience: maxPatience,
        maxPatience,
        eatLeft: 0, // Decided when they're served.
        rumor: Boolean(rumor),
        listened: 0,
        party: party ?? null,
        lust,
        desires,
        mood: arrivalMood(context, filth, this.random, lust),
      });
      this.cue("guestIn");
    }
  }

  private startPour(): void {
    this.tapLeft--;
    this.cleanWare.cup--;
    this.cue("pour");
    // Drunk hands fumble the tap.
    this.pourLeft = (this.upgrades.has("quicktap") ? QUICK_POUR_TIME : POUR_TIME) * (1 + DRUNK_FUMBLE * this.drunk);
  }

  private startStew(): void {
    this.potState = "cooking";
    this.potTimer = STEW_TIME;
    this.cue("stewStart");
  }

  private updateTap(dt: number): void {
    if (this.pourLeft === null) return;
    this.pourLeft -= dt;
    if (this.pourLeft <= 0) {
      this.pourLeft = null;
      this.aleReady++;
      this.cue("aleReady");
    }
  }

  private updatePot(dt: number): void {
    if (this.potState === "cooking") {
      this.potTimer -= dt;
      if (this.potTimer <= 0) {
        this.potState = "ready";
        this.potTimer = BURN_TIME;
        this.potBowls = this.upgrades.has("bigpot") ? BIG_POT_BOWLS : POT_BOWLS;
        this.say("The stew is ready.");
        this.cue("stewReady");
      }
    } else if (this.potState === "ready") {
      this.potTimer -= dt;
      if (this.potTimer <= 0) {
        this.potState = "burnt";
        this.potBowls = 0;
        this.say("The stew has burnt!");
        this.cue("stewBurnt");
      }
    }
  }

  private updateGuests(dt: number, listeningTo: number | null): void {
    for (const guest of this.guests) {
      const behaviour = MOOD_BEHAVIOUR[guest.mood];
      if (guest.status === "waiting") {
        guest.patience -= dt * behaviour.patienceDrain;
        guest.mood = moodWhileWaiting(guest.mood, guest.patience / guest.maxPatience);
        if (guest.patience <= 0) this.walkOut(guest);
      } else if (guest.status === "eating") {
        guest.eatLeft -= dt;
        if (guest.eatLeft <= 0 && this.tableFinished(guest)) {
          guest.status = "leaving";
          this.leaveDirty(guest);
          if (behaviour.spills) this.spiltAt.add(guest.seat);
        }
      }

      const seated = guest.status === "waiting" || guest.status === "eating";
      if (seated && guest.rumor && !this.heardRumor && guest.id === listeningTo) {
        guest.listened += dt;
        if (guest.listened >= LISTEN_TIME) {
          this.heardRumor = true;
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
          this.cue("rumor");
        }
      }
    }
  }

  /** Whether a guest can get up: a party stays and talks until everyone still at the table has finished. */
  private tableFinished(guest: Guest): boolean {
    return guest.party === null || this.partyGuests(guest.party).every((g) => g.status === "eating" && g.eatLeft <= 0);
  }

  /** A guest has finished: what they ate from stays on the table, in that table's pile. */
  private leaveDirty(guest: Guest): void {
    const ware = WARE_OF[guest.order];
    if (!ware) return;
    const table = this.tableOf(guest.seat);
    const pile = this.messes.find((m) => m.kind === "dishes" && this.tableOf(m.spots[0]) === table);
    if (pile) {
      pile.wares = [...messWares(pile), ware];
      pile.spots.push(guest.seat);
    } else {
      this.messes.push({ id: this.nextMessId++, kind: "dishes", spots: [guest.seat], wares: [ware] });
    }
  }

  /** Whoever is at the tub with empty hands scrubs what's in it, one at a time, slower when drunk. */
  private updateWash(dt: number, scrubber: number | null): void {
    if (this.tub.length === 0 || scrubber === null || this.carrying[scrubber] !== null) return;
    this.washLeft -= dt / (1 + DRUNK_FUMBLE * this.drunk);
    if (this.washLeft > 0) return;
    this.washLeft = WASH_TIME;
    this.cleanWare[this.tub.shift() as Ware]++;
    this.cue("wipe");
    if (this.tub.length === 0) this.say(this.messes.length === 0 && this.phase !== "service" ? "The tavern is spotless." : "All washed up.");
  }

  private walkOut(guest: Guest): void {
    guest.status = "leaving";
    this.walkouts++;
    shiftPersona(this.persona, { fame: FAME_WALKOUT });
    // They knock their cup over on the way out.
    this.spiltAt.add(guest.seat);
    this.adjust(0, -1, GUEST_KINDS[guest.kind].walkoutHeat);
    this.say(`A ${guest.kind} walked out without paying.`);
    this.cue("walkOut");
  }

  tick(dt: number, context: TickContext): void {
    this.drunk = Math.max(0, this.drunk - SOBER_RATE * dt);
    this.updateWash(dt, context.scrubber ?? null);
    if (this.phase === "day" || this.phase === "dusk") {
      // Closed, but the tap and the pot still work, so you can get ready.
      this.updateTap(dt);
      this.updatePot(dt);
      if (this.phase === "dusk" && context.night) {
        this.phase = "service";
        this.say(this.plan.intro);
      }
      return;
    }
    if (this.phase !== "service") return;
    this.clock += dt;
    this.spawnArrivals();
    this.updateTap(dt);
    this.updatePot(dt);
    this.updateGuests(dt, context.listeningTo);

    if (this.nextArrival === this.plan.guests.length && this.guests.length === 0) {
      this.phase = "lastcall";
    }
  }

  guestArrived(id: number): void {
    const guest = this.guests.find((g) => g.id === id);
    if (guest?.status === "arriving") guest.status = "waiting";
  }

  guestLeft(id: number): void {
    const index = this.guests.findIndex((g) => g.id === id);
    if (index >= 0) this.guests.splice(index, 1);
  }

  private serve(guest: Guest, sibling: number): void {
    const rules = GUEST_KINDS[guest.kind];
    const left = guest.patience / guest.maxPatience;
    const behaviour = MOOD_BEHAVIOUR[guest.mood];
    const tipped = left > TIP_THRESHOLD && behaviour.tips;
    const amount = rules.pay + (tipped ? rules.tip + behaviour.tipBonus : 0);
    const idolized = guest.mood === "idolize";
    guest.mood = moodWhenServed(guest.mood, left);
    shiftPersona(this.persona, { fame: FAME_SERVED + (tipped ? FAME_TIPPED : 0) + (idolized ? FAME_IDOLIZED : 0) });
    this.takeOne(sibling);
    guest.status = "eating";
    this.served++;
    this.earned += amount;
    this.adjust(amount, rules.trust, 0);
    this.say(tipped ? `+${amount} gold, with a tip.` : `+${amount} gold.`);
    this.cue(tipped ? "tip" : "serve");
    if (tipped && this.random() < TIP_CHAT_CHANCE) this.startTipChat(guest);
    const [least, most] = guest.party === null ? EAT_ALONE : EAT_IN_PARTY;
    guest.eatLeft = (least + this.random() * (most - least)) * behaviour.stay + (guest.rumor ? RUMOR_EXTRA_EAT : 0);
  }

  /** A pleased guest buys you a drink, and with the drink in them, flatters you or asks a favor. */
  private startTipChat(guest: Guest): void {
    const context = this.banterContext(guest.kind, guest);
    const pick = <T extends { id: string; when?: (c: BanterContext) => boolean }>(lines: readonly T[]) =>
      pickLine(lines, context, this.saidLines, this.random);
    // The conversation shows what state they're in.
    const label = MOOD_LABELS[feltMood(guest)];
    const speaker = label ? `${SPEAKERS[guest.kind]} (${label})` : SPEAKERS[guest.kind];
    const line = (text: string): TalkLine => ({ speaker, text, guestId: guest.id });

    const lines = [line(pick(OFFERS)?.text ?? "\"Have one on me!\"")];
    const face = faceLine(feltMood(guest), context, this.saidLines, this.random);
    if (face) lines.push(line(face));
    const remark = pick(REMARKS);
    if (remark && this.random() < REMARK_CHANCE) lines.push(line(remark.text));

    let replies: Reply[];
    const favor = pick(FAVORS.filter((f) => f.kinds.includes(guest.kind)));
    const compliment = pick(COMPLIMENTS);
    const lusty = feltMood(guest) === "lust";
    if (compliment && (this.random() < (lusty ? LUSTY_COMPLIMENT_SHARE : COMPLIMENT_SHARE) || !favor)) {
      lines.push(line(compliment.text));
      replies = complimentReplies(context);
    } else if (favor) {
      lines.push(line(favor.ask));
      replies = [favor.agree, favor.refuse];
    } else {
      return;
    }
    this.talkingTo = null;
    this.tipChat = { speaker, guestId: guest.id, lines, replies, drank: false, answered: false, reply: [] };
  }

  /** What guests can know and notice about the player, for choosing what they say. */
  banterContext(kind: GuestKind, guest?: Guest): BanterContext {
    return {
      body: this.playerBody,
      persona: this.persona,
      trust: this.trust,
      heat: this.heat,
      gold: this.gold,
      debt: DEBT,
      night: this.nightIndex,
      drunk: this.drunk,
      kind,
      mood: guest && feltMood(guest),
      lust: guest?.lust,
      desires: guest?.desires,
    };
  }

  /** You took a drink with a guest. */
  private takeDrink(): void {
    this.drunk = Math.min(DRUNK_MAX, this.drunk + DRINK_STRENGTH);
    shiftPersona(this.persona, { drinks: 1, fame: 1, respect: this.drunk >= SLOPPY_DRUNK ? -1 : 0 });
    this.cue("drink");
  }

  /** Whether a conversation is open: with a party at their table, or with a guest who tipped you a drink. */
  get inConversation(): boolean {
    return this.talkingTo !== null || this.tipChat !== null;
  }

  /** The options with a tipping guest: drink what they bought you, answer them, and get back to work. */
  private tipOptions(chat: TipChat): (TalkChoice & { run: () => void })[] {
    const options: (TalkChoice & { run: () => void })[] = [];
    if (!chat.drank) {
      const tooDrunk = this.drunk >= TOO_DRUNK;
      options.push({
        label: tooDrunk ? "Drink it (you've had more than enough)" : "Drink it, on them",
        disabled: tooDrunk,
        run: () => {
          chat.drank = true;
          this.takeDrink();
          this.gold += TIP_DRINK_BONUS;
          this.earned += TIP_DRINK_BONUS;
          this.changeMood(chat.guestId, (mood) => moodAfterDrink(mood, 1));
          chat.reply = [
            you("\"Cheers!\""),
            narrate(`You drink with them. They're delighted, and add a coin for luck. (+${TIP_DRINK_BONUS} gold)`),
          ];
        },
      });
    }
    if (!chat.answered) {
      for (const reply of chat.replies) {
        options.push({
          label: reply.label,
          disabled: false,
          run: () => {
            chat.answered = true;
            this.adjust(reply.gold, reply.trust, reply.heat);
            this.earned += Math.max(0, reply.gold);
            shiftPersona(this.persona, reply.persona);
            if ((reply.persona?.kindness ?? 0) > 0) shiftPersona(this.persona, { respect: 1 });
            this.changeMood(chat.guestId, (mood) => moodAfterReply(mood, reply.persona?.flirt ?? 0, reply.persona?.kindness ?? 0));
            // Spoken answers are said aloud; the others are things you do.
            chat.reply = reply.label.startsWith("\"") ? [you(reply.label), narrate(reply.result)] : [narrate(reply.result)];
          },
        });
      }
    }
    options.push({ label: "Get back to work", disabled: false, run: () => (this.tipChat = null) });
    return options;
  }

  private changeMood(guestId: number, change: (mood: Mood) => Mood): void {
    const guest = this.guests.find((g) => g.id === guestId);
    if (guest) guest.mood = change(guest.mood);
  }

  /** Takes one thing out of a sibling's hands: one cup off the tray, or the whole of anything else. */
  private takeOne(sibling: number): void {
    this.carryCount[sibling] = Math.max(0, this.carryCount[sibling] - 1);
    if (this.carryCount[sibling] === 0) this.carrying[sibling] = null;
  }

  private emptyHands(sibling: number): void {
    this.carrying[sibling] = null;
    this.carryCount[sibling] = 0;
    this.dirtyHeld[sibling].length = 0;
  }

  /** What's in a sibling's hands goes back where it came from, so its cup or dish is free again. */
  private freeHeldWare(sibling: number): void {
    const held = this.carrying[sibling];
    const ware = held && held !== "dirty" ? WARE_OF[held] : null;
    if (ware) this.cleanWare[ware] += this.carryCount[sibling];
  }

  /** Picks up the dirty dishes from a table, on top of any already in your hands. */
  private collectDishes(mess: Mess, sibling: number): void {
    const wares = messWares(mess);
    this.messes.splice(this.messes.indexOf(mess), 1);
    this.dirtyHeld[sibling].push(...wares);
    this.carrying[sibling] = "dirty";
    this.carryCount[sibling] = this.dirtyHeld[sibling].length;
    this.cue("dishes");
    this.say("Take them to the wash tub.");
  }

  private fillTub(sibling: number): void {
    this.tub.push(...this.dirtyHeld[sibling]);
    this.emptyHands(sibling);
    this.cue("dishes");
    this.say("Stay at the tub with empty hands to scrub them.");
  }

  private stationAction(station: Station, sibling: number): Action | null {
    const held = this.carrying[sibling];
    const count = this.carryCount[sibling];
    const take = (item: Item) => {
      this.carrying[sibling] = item;
      this.carryCount[sibling] = 1;
      this.cue(TAKE_CUES[item]);
    };
    const drop = () => {
      this.emptyHands(sibling);
      this.cue("putDown");
    };

    // Dirty dishes only go one place. With empty hands, the tub shows how the scrubbing is going.
    if (held === "dirty") {
      if (station !== "wash") return null;
      return { label: `Put ${dirtyWords(this.dirtyHeld[sibling])} in the wash tub`, run: () => this.fillTub(sibling) };
    }
    if (station === "wash") return !held && this.tub.length > 0 ? { label: `Scrubbing... (${this.tub.length} left)` } : null;

    // The bin takes anything you picked up by mistake, except a cask, which goes back on the barrels.
    if (station === "bin") {
      if (!held) return null;
      if (held === "cask") return { label: "A cask won't fit in the bin. Put it back on the barrels" };
      return {
        label: count > 1 ? `Throw away the ${count} ales` : `Throw away the ${held}`,
        run: () => {
          this.freeHeldWare(sibling);
          drop();
        },
      };
    }

    // With room on the tray, the tap fills it: put a poured cup on, or pour another.
    // Once it's full, or there's nothing to pour, a cup goes back instead.
    if (station === "tap" && held === "ale") {
      if (count < TRAY_SIZE && this.aleReady > 0) {
        return {
          label: `Put another ale on the tray (${count + 1}/${TRAY_SIZE})`,
          run: () => {
            this.aleReady--;
            this.carryCount[sibling]++;
            this.cue("takeAle");
          },
        };
      }
      if (count < TRAY_SIZE && this.pourLeft !== null) return { label: "Pouring..." };
      if (count < TRAY_SIZE && this.tapLeft > 0 && this.cleanWare.cup > 0) {
        return { label: "Pour another ale", run: () => this.startPour() };
      }
      return {
        label: count > 1 ? "Put an ale back" : "Put ale back",
        run: () => {
          this.takeOne(sibling);
          this.aleReady++;
          this.cue("putDown");
        },
      };
    }

    if (held && STATION_OF_ITEM[held] === station) {
      return {
        label: `Put ${held} back`,
        run: () => {
          this.freeHeldWare(sibling);
          drop();
          if (held === "ale") this.aleReady++;
          if (held === "stew") {
            this.potBowls++;
            if (this.potState !== "ready") {
              this.potState = "ready";
              this.potTimer = BURN_TIME;
            }
          }
        },
      };
    }

    if (station === "tap") {
      if (held === "cask") {
        return { label: "Refill the tap", run: () => { this.emptyHands(sibling); this.cue("refill"); this.tapLeft = TAP_SIZE; } };
      }
      if (held) return null;
      if (this.aleReady > 0) return { label: "Take ale", run: () => { this.aleReady--; take("ale"); } };
      if (this.pourLeft !== null) return { label: "Pouring..." };
      if (this.tapLeft === 0) return { label: "Tap is empty. Bring a cask from the barrels" };
      if (this.cleanWare.cup === 0) return { label: "No clean cups. Wash some at the tub" };
      return { label: "Pour ale", run: () => this.startPour() };
    }

    if (held) return null;

    const noDishes = { label: "No clean dishes. Wash some at the tub" };
    if (station === "bread") {
      if (this.cleanWare.dish === 0) return noDishes;
      return { label: "Take bread", run: () => { this.cleanWare.dish--; take("bread"); } };
    }
    if (station === "barrel") return { label: "Take a cask", run: () => take("cask") };

    switch (this.potState) {
      case "empty":
        return { label: "Start the stew", run: () => this.startStew() };
      case "cooking":
        // Started by mistake, or not needed after all: tip it out and the pot is free again.
        return { label: "Stop cooking and tip out the stew", run: () => { this.potState = "empty"; this.potTimer = 0; this.cue("stewStart"); } };
      case "burnt":
        return { label: "Scrape out the burnt pot", run: () => { this.potState = "empty"; this.cue("stewStart"); } };
      case "ready":
        if (this.cleanWare.dish === 0) return noDishes;
        return {
          label: `Take stew (${this.potBowls} left)`,
          run: () => {
            this.cleanWare.dish--;
            take("stew");
            this.potBowls--;
            if (this.potBowls === 0) this.potState = "empty";
          },
        };
    }
  }

  private action(sibling: number, target: Target): Action | null {
    if (target.kind === "bell") {
      if (this.phase === "day") return { label: "Ring the bell to open for the night", run: () => this.open() };
      return this.phase === "dusk" ? { label: "The sun is going down..." } : null;
    }
    if (target.kind === "door") {
      return {
        label: this.doorOpen ? "Close the door" : "Open the door",
        run: () => {
          this.doorOpen = !this.doorOpen;
          this.cue(this.doorOpen ? "doorOpen" : "doorClose");
        },
      };
    }
    if (target.kind === "desk") {
      if (this.phase !== "day") return this.phase === "dusk" ? { label: "No time for plans now" } : null;
      // Dirty dishes and spills are tied to the seats they're at, so those have to go first.
      if (this.messes.some((mess) => mess.kind !== "dust")) return { label: "Clear the dishes and spills before changing the room" };
      return { label: "Open the house plans", run: () => undefined };
    }
    if (target.kind === "bed") {
      if (this.phase === "bedtime") return { label: "Sleep until morning", run: () => this.sleep() };
      if (this.phase === "day") {
        return this.napped ? { label: "You've already rested today" } : { label: "Nap until evening", run: () => this.nap() };
      }
      return this.phase === "dusk" ? { label: "Too early for bed" } : null;
    }
    if (target.kind === "mess") {
      const mess = this.messes.find((m) => m.id === target.id);
      if (!mess || this.phase === "lastcall") return null;
      const held = this.carrying[sibling];
      if (mess.kind === "dishes") {
        if (held && held !== "dirty") return { label: "Put down what you're carrying to clean" };
        return {
          label: `${held ? "Stack up" : "Clear"} ${dirtyWords(messWares(mess))}`,
          run: () => this.collectDishes(mess, sibling),
        };
      }
      if (held) return { label: "Put down what you're carrying to clean" };
      const { kind } = mess;
      return { label: MESS_LABELS[kind], run: () => this.clean(mess.id, kind) };
    }
    const open = this.phase === "service";
    if (target.kind === "station") {
      // The washing up can still be done once the tavern has shut for the night.
      const usable = open || this.phase === "day" || this.phase === "dusk" || (this.phase === "bedtime" && target.station === "wash");
      return usable ? this.stationAction(target.station, sibling) : null;
    }
    if (!open) return null;

    const guest = this.guests.find((g) => g.id === target.id);
    if (!guest) return null;
    if (guest.status === "waiting" && this.carrying[sibling] === guest.order) {
      return { label: `Serve ${guest.order}`, run: () => this.serve(guest, sibling) };
    }
    // A party at their table will talk to you, if your hands are free.
    const { party } = guest;
    if (party !== null && this.carrying[sibling] === null && this.partyChatting(party)) {
      return { label: "Join their conversation", run: () => this.talk(party) };
    }
    return null;
  }

  /** The name of the table at a seat. */
  tableOf(seat: number): string {
    return this.seatTables[seat] ?? `seat ${seat}`;
  }

  /** The members of a party who are sitting at their table. */
  partyGuests(party: number): Guest[] {
    return this.guests.filter((g) => g.party === party && (g.status === "waiting" || g.status === "eating"));
  }

  /** Whether a party is sitting together and talking: at least two of them at the table. */
  partyChatting(party: number): boolean {
    return this.partyGuests(party).length >= 2;
  }

  private stateOf(party: number): { drinks: number; jug: boolean } {
    let state = this.partyState.get(party);
    if (!state) {
      state = { drinks: 0, jug: false };
      this.partyState.set(party, state);
    }
    return state;
  }

  /** Sits down with a party. The game holds time still while you talk. */
  talk(party: number): void {
    if (this.phase !== "service" || !this.partyChatting(party)) return;
    this.tipChat = null;
    this.talkingTo = party;
    this.talkReply = [];

    // Each speaker in the scripted chat is one of the party, matched by what they're called where possible.
    const members = this.partyGuests(party);
    const unmatched = [...members];
    const speakers = new Map<string, number>();
    const guestFor = (name: string): number => {
      let id = speakers.get(name);
      if (id === undefined) {
        const lower = name.toLowerCase();
        const index = Math.max(0, unmatched.findIndex((g) => lower.includes(SPEAKERS[g.kind].toLowerCase())));
        id = (unmatched.splice(index, 1)[0] ?? members[0]).id;
        speakers.set(name, id);
      }
      return id;
    };
    const opening = this.plan.parties[party].chat.map(splitSpeaker);
    for (const line of opening) if (line.speaker) line.guestId = guestFor(line.speaker);

    // Then something they've heard about you, before they ask you to sit.
    const first = opening[0];
    const remark = pickLine(REMARKS, this.banterContext(members[0].kind), this.saidLines, this.random);
    if (remark && this.random() < REMARK_CHANCE) {
      opening.splice(opening.length - 1, 0, { speaker: first.speaker, text: remark.text, guestId: first.guestId });
    }
    // Whoever's in the strongest mood says something to your face, before they ask you to sit.
    const moody = members.find((g) => feltMood(g) !== "calm") ?? members[0];
    const face = faceLine(feltMood(moody), this.banterContext(moody.kind, moody), this.saidLines, this.random);
    if (face) {
      const name = opening.find((l) => l.guestId === moody.id)?.speaker ?? SPEAKERS[moody.kind];
      opening.splice(opening.length - 1, 0, { speaker: name, text: face, guestId: moody.id });
    }
    this.talkOpening = opening;
  }

  /** A party member's words, said by whoever spoke first at the table; anything not in quotes is narration. */
  private partySays(text: string): TalkLine {
    const first = this.talkOpening[0];
    return text.startsWith("\"") && first ? { speaker: first.speaker, text, guestId: first.guestId } : narrate(text);
  }

  /** The conversation so far: what was said when it opened, then the latest reply. */
  get talkLines(): TalkLine[] {
    if (this.tipChat) return [...this.tipChat.lines, ...this.tipChat.reply];
    if (this.talkingTo === null) return [];
    return [...this.talkOpening, ...this.talkReply];
  }

  /** The guests in the conversation, so the game can show who's talking. */
  get talkGuests(): Guest[] {
    if (this.tipChat) {
      const id = this.tipChat.guestId;
      return this.guests.filter((g) => g.id === id);
    }
    return this.talkingTo === null ? [] : this.partyGuests(this.talkingTo);
  }

  /** Just the latest reply, which is all that needs showing after you pick an option. */
  get talkReplyLines(): TalkLine[] {
    if (this.tipChat) return this.tipChat.reply;
    return this.talkReply;
  }

  get talkChoices(): TalkChoice[] {
    if (this.tipChat) return this.tipOptions(this.tipChat).map(({ label, disabled }) => ({ label, disabled }));
    if (this.talkingTo === null) return [];
    const state = this.stateOf(this.talkingTo);
    const members = this.partyGuests(this.talkingTo).length;

    const pouredOut = state.drinks >= DRINKS_PER_TABLE;
    const tooDrunk = this.drunk >= TOO_DRUNK;
    let drink = state.drinks === 0 ? "Drink with them" : "Have another";
    if (tooDrunk) drink = "Drink with them (you've had more than enough)";
    else if (pouredOut) drink = "They've stopped pouring for you";

    let jug = `Sell them a jug of ale (+${JUG_PAY * members} gold, uses the tap)`;
    if (state.jug) jug = "They already have a jug";
    else if (this.tapLeft === 0) jug = "Sell them a jug (the tap is empty)";

    return [
      { label: drink, disabled: pouredOut || tooDrunk },
      { label: jug, disabled: state.jug || this.tapLeft === 0 },
      { label: "Get back to work", disabled: false },
    ];
  }

  /** Picks an option in the conversation: 0 drinks with them, 1 sells them a jug, 2 leaves the table. */
  chooseTalk(index: number): void {
    if (this.tipChat) {
      const option = this.tipOptions(this.tipChat)[index];
      if (option && !option.disabled) option.run();
      return;
    }
    const party = this.talkingTo;
    if (party === null) return;
    const choice = this.talkChoices[index];
    if (!choice || choice.disabled) return;
    const state = this.stateOf(party);
    const plan = this.plan.parties[party];
    const members = this.partyGuests(party);

    if (index === 0) {
      state.drinks++;
      this.takeDrink();
      for (const guest of members) guest.mood = moodAfterDrink(guest.mood, state.drinks);
      if (state.drinks === 1) {
        // Drinking with people loosens their tongues. Village folk trust you more for it,
        // and soldiers who've drunk with you speak well of you to the garrison.
        this.talkReply = [you("\"Don't mind if I do.\""), this.partySays(plan.offer), this.partySays(plan.gossip)];
        if (members.some((g) => GUEST_KINDS[g.kind].trust > 0)) {
          this.adjust(0, 1, 0);
          this.talkReply.push(narrate("They like an innkeeper who drinks with them. (+1 trust)"));
        }
        if (members.some((g) => g.kind === "soldier")) {
          this.adjust(0, 0, -1);
          this.talkReply.push(narrate("The garrison will hear you're a friend. (-1 heat)"));
        }
        if (!this.heardRumor && members.some((g) => g.rumor)) {
          this.heardRumor = true;
          this.talkReply.push(narrate(`They let slip: ${this.plan.lastCall.rumor}`));
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
          this.cue("rumor");
        }
      } else {
        this.talkReply = [you("\"One more!\""), narrate("Another cup goes down, and the table cheers. The room has started to tilt.")];
      }
    } else if (index === 1) {
      const pay = JUG_PAY * members.length;
      state.jug = true;
      this.tapLeft--;
      // A shared jug never goes round without some of it ending up on the floor.
      if (members[0]) this.spiltAt.add(members[0].seat);
      this.gold += pay;
      this.earned += pay;
      // A jug on the table keeps them happy while they wait for their food.
      for (const guest of members) {
        guest.patience = guest.maxPatience;
        guest.mood = "drunk";
      }
      this.talkReply = [narrate(`You set a jug on the table. They pay ${pay} gold and stop watching the kitchen.`)];
      this.say(`+${pay} gold for a jug of ale.`);
    } else {
      this.talkingTo = null;
      this.talkReply = [];
    }
  }

  /** You stumbled. What you were carrying hits the floor, and the cups and dishes it was on are broken for good. A cask you hang on to. */
  stumble(sibling: number): void {
    const held = this.carrying[sibling];
    if (held && held !== "cask") {
      const count = this.carryCount[sibling];
      const broken = held === "dirty" ? [...this.dirtyHeld[sibling]] : Array.from({ length: count }, () => WARE_OF[held] as Ware);
      for (const ware of broken) this.stock[ware] = Math.max(0, this.stock[ware] - 1);
      this.emptyHands(sibling);
      const what = held === "dirty" ? "the dirty dishes" : held === "ale" && count > 1 ? "the whole tray" : `the ${held}`;
      this.say(`You stumble and drop ${what}!`);
      this.cue(count > 1 ? "smashTray" : "smashOne");
    } else {
      this.say("You stumble and nearly go over.");
      this.cue("drop");
    }
  }

  prompt(sibling: number, target: Target): Prompt | null {
    const action = this.action(sibling, target);
    return action && { label: action.label, actionable: Boolean(action.run) };
  }

  interact(sibling: number, target: Target): void {
    this.action(sibling, target)?.run?.();
  }

  chooseLastCall(index: number): void {
    if (this.phase !== "lastcall") return;
    const choice = this.lastCallChoices[index];
    if (!choice) return;
    this.adjust(choice.gold, choice.trust, choice.heat);
    // What you did gets round, and changes how people talk to you.
    if (this.heardRumor) {
      const deeds: Partial<Persona>[] = [{ informed: 1, kindness: -1 }, { protected: 1, kindness: 1 }, { sold: 1, greed: 2 }];
      shiftPersona(this.persona, { ...deeds[index], fame: FAME_DEEDS[index], respect: RESPECT_DEEDS[index] });
    } else if (index === 1) {
      shiftPersona(this.persona, { greed: 1 });
    }
    this.lastResult = choice.result;
    this.phase = "bedtime";
    this.say("The tavern is shut for the night. Your bed is through the door in the east wall.");
  }

  canBuy(id: UpgradeId): boolean {
    return this.phase === "dawn" && !this.upgrades.has(id) && this.gold >= UPGRADE_COST;
  }

  buy(id: UpgradeId): void {
    if (!this.canBuy(id)) return;
    this.gold -= UPGRADE_COST;
    this.upgrades.add(id);
    this.cue("buy");
  }

  canBuyStock(): boolean {
    return this.phase === "dawn" && this.gold >= STOCK_COST;
  }

  /** Buys another set of cups or dishes. Unlike the upgrades, you can keep buying these. */
  buyStock(ware: Ware): void {
    if (!this.canBuyStock()) return;
    this.gold -= STOCK_COST;
    this.stock[ware] += STOCK_PACK;
    this.cleanWare[ware] += STOCK_PACK;
    this.cue("buy");
  }

  private decideEnding(): EndingId {
    if (this.heat >= HEAT_MAX) return "arrested";
    if (this.trust >= TRUST_TO_OVERTHROW) return "overthrow";
    return this.gold >= DEBT ? "kept" : "lost";
  }

  nextNight(): void {
    if (this.phase !== "dawn") return;
    if (this.isLastNight) {
      this.ending = this.decideEnding();
      this.phase = "ended";
      return;
    }
    const messes = this.leftovers();
    this.nightIndex++;
    this.openDay(messes);
  }

  /** How long guests will wait, as a share of usual, given how dirty the room is. */
  get messPatience(): number {
    return 1 - MESS_PATIENCE_LOSS * Math.min(1, this.messes.length / MESS_FOR_FULL_LOSS);
  }

  /** Mops or sweeps up one mess on the floor. */
  private clean(id: number, kind: Exclude<MessKind, "dishes">): void {
    this.messes.splice(this.messes.findIndex((m) => m.id === id), 1);
    this.cue("wipe");
    if (this.messes.length === 0 && this.tub.length === 0) this.say("The tavern is spotless.");
    else this.say(`${MESS_DONE[kind]} ${this.messes.length} more to clean.`);
  }

  /**
   * Everything still to clean after tonight: what was left from before, any dishes nobody cleared, ale
   * wherever it was spilt, and dust the crowd tracked in. Messes in the same place join up.
   */
  private leftovers(): Mess[] {
    const messes = this.messes.map(copyMess);
    const add = (kind: MessKind, spots: number[]) => messes.push({ id: this.nextMessId++, kind, spots });
    const has = (kind: MessKind, spot: number) => messes.some((m) => m.kind === kind && m.spots.includes(spot));

    for (const seat of this.spiltAt) if (!has("spill", seat)) add("spill", [seat]);

    const crowd = this.served + this.walkouts;
    if (crowd > 0 && this.dustSpots > 0) {
      const want = DUST_BASE + Math.floor(crowd / GUESTS_PER_DUST) - messes.filter((m) => m.kind === "dust").length;
      const free = shuffled(this.dustSpots, this.nightIndex * 7919 + crowd).filter((spot) => !has("dust", spot));
      for (const spot of free.slice(0, Math.max(0, want))) add("dust", [spot]);
    }
    return messes;
  }

  /** What carries from one night to the next, taken as a night opens. A save holds this. */
  snapshot(): TavernSave {
    return {
      nightIndex: this.nightIndex,
      gold: this.gold,
      trust: this.trust,
      heat: this.heat,
      upgrades: [...this.upgrades],
      tapLeft: this.tapLeft,
      messes: this.messes.map(copyMess),
      persona: { ...this.persona },
      stock: { ...this.stock },
      tub: [...this.tub],
      ...(this.layout ? { layout: cloneLayout(this.layout) } : {}),
    };
  }

  /** Puts the tavern back at the start of a saved night, with no guests yet. */
  restore(save: TavernSave): void {
    this.nightIndex = save.nightIndex;
    this.gold = save.gold;
    this.trust = save.trust;
    this.heat = save.heat;
    this.upgrades.clear();
    for (const id of save.upgrades) this.upgrades.add(id);
    this.tapLeft = save.tapLeft;
    this.persona = readPersona(save.persona);
    this.layout = save.layout ? cloneLayout(save.layout) : null;
    this.stock.cup = save.stock?.cup ?? START_CUPS;
    this.stock.dish = save.stock?.dish ?? START_DISHES;
    this.tub.splice(0, this.tub.length, ...(save.tub ?? []));
    this.dirtyHeld[0].length = this.dirtyHeld[1].length = 0;
    this.guests.length = 0;
    this.nextGuestId = 1;
    this.messages.length = 0;
    this.cues.length = 0;
    this.lastResult = "";
    this.ending = null;
    this.openDay((save.messes ?? []).map(copyMess));
  }

  /** Starts a new day with the tavern closed, clearing everything that only lasts one night. */
  private openDay(messes: Mess[] = []): void {
    this.phase = "day";
    this.messes.splice(0, this.messes.length, ...messes);
    this.nextMessId = Math.max(0, ...messes.map((m) => m.id)) + 1;
    this.spiltAt.clear();
    // Dirty dishes still in hand get left in the tub overnight. Anything else not dirty is back on the shelf.
    for (const held of this.dirtyHeld) this.tub.push(...held.splice(0));
    this.washLeft = WASH_TIME;
    const dirty = [...this.tub, ...this.messes.flatMap(messWares)];
    for (const ware of ["cup", "dish"] as const) {
      this.cleanWare[ware] = Math.max(0, this.stock[ware] - dirty.filter((w) => w === ware).length);
    }
    this.clock = 0;
    this.nextArrival = 0;
    this.carrying[0] = this.carrying[1] = null;
    this.carryCount[0] = this.carryCount[1] = 0;
    this.aleReady = 0;
    this.pourLeft = null;
    this.potState = "empty";
    this.potBowls = 0;
    this.heardRumor = false;
    this.served = 0;
    this.walkouts = 0;
    this.earned = 0;
    this.napped = false;
    this.drunk = 0;
    this.talkingTo = null;
    this.talkReply = [];
    this.tipChat = null;
    this.partyState.clear();
    this.say(
      messes.length > 0
        ? `Day ${this.nightIndex + 1}. Last night left a mess: dirty dishes, spilt ale and dust. Clean up and get ready, then ring the bell on the bar.`
        : `Day ${this.nightIndex + 1}. The tavern is closed. Get ready, then ring the bell on the bar when you want the night to begin.`,
    );
  }
}
