import { cloneLayout, type HouseLayout } from "./house";
import { bodyLine, flavorLine, mindStage, wildSensitivity } from "./lewd";
import { faceLine } from "./facetalk";
import { arrivalFeelings, arrivalMood, feltMood, HIGH_RESPECT, LOW_RESPECT, MOOD_LABELS, STRONG_LUST, moodAfterDrink, moodAfterReply, moodWhenServed, moodWhileWaiting, MOOD_BEHAVIOUR, type Mood } from "./mood";
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
  stripPiece,
  stripReplies,
  type BanterContext,
  type Persona,
  type PlayerBody,
  type Reply,
  type StripPiece,
} from "./banter";
import { piecesOff, stripLadder } from "./wardrobe";
import {
  afterLine,
  answerLabel,
  fillPiece,
  LEAN_MARGIN,
  nerve,
  newTouchMemory,
  pickTouch,
  reachChance,
  readTouchMemory,
  thoughtTier,
  intensityBonus,
  touchAnswers,
  touchLands,
  touchOutcome,
  type TouchAnswer,
  type TouchDef,
  type TouchMemory,
  type TouchRegion,
} from "./touch";
import { GUEST_TOO_DRUNK, PULLS, SLAPS, TOO_DRUNK_TO_ALLOW, WAVERED, WORN_THIN } from "./touchtalk";
import { GIVE_IN_TEXTS, IMPULSE_LINES } from "./touchtalk-givein";
import { KINK_TALK, kinkOf, type Kink } from "./kinktalk";
import { START_TITLE, TITLE_BY_ID, TITLES, titleEarned, TWO_SLOTS_FAME } from "./titles";

/** One line of a set, by a roll from 0 to 1. */
function oneOf(lines: readonly string[], roll: number): string {
  return lines[Math.floor(roll * lines.length) % lines.length];
}
import { DESIRE_STRONG, HORNY_AT, wet } from "./desire";
import {
  autoTouchFits,
  defaultTouchSettings,
  GROUPS_OF_REGION,
  impulseCheck,
  impulsive,
  type ImpulseCheck,
  type ImpulseFacts,
  type TouchSettings,
} from "./touchsettings";
import { Fight, TROUBLE_SHOUTS, type FighterStats, type FightMove, type FightOutcome } from "./fight";
import { ROLE_PLAYS, type RolePlay } from "./duellines";
import { coatStages, loadOf, type CoatSection, type CumSpot } from "./cum";

/** Where the guest finishes after each thing she does upstairs; a kiss and a cuddle leaves none. */
const UPSTAIRS_CUM: Record<UpstairsAct, CumSpot | null> = { kiss: null, hands: "body", mouth: "mouth", bed: "pussy", behind: "ass" };
const CUM_WHERE: Record<CumSpot, string> = {
  mouth: "in your mouth, and you swallow",
  face: "on your face",
  breasts: "on your tits",
  pussy: "inside you",
  ass: "deep in your ass",
  body: "all over your belly",
};
import { Duel, DUEL_AREAS, type DuelArea, type DuelistStats, type DuelMove, type DuelOutcome, type DuelTest, type Partner } from "./duel";
import {
  ACT_SKILL_OF,
  ACT_SKILLS,
  actSkillBonus,
  BODY_SKILLS,
  bodySkillBonus,
  charmBonus,
  levelOf,
  mindBonus,
  nameOfSkill,
  readExperience,
  SKILL_OF_REGION,
  STATS,
  type Experience,
  type SkillId,
  type StatId,
} from "./skills";
import {
  effectsOf,
  emptyMeters,
  lewdnessOf,
  lewdWord,
  METER_MAX,
  METER_NAMES,
  INTIMATE_REGIONS,
  METER_OF,
  METERS,
  newlyEarned,
  PASSIVE_BY_ID,
  newRecords,
  noEffects,
  readProgress,
  ROUGH_TOUCHES,
  UPSTAIRS,
  UPSTAIRS_ACTS,
  type Effects,
  type Meter,
  type Meters,
  type PassiveDef,
  type PassiveFacts,
  type ProgressSave,
  type Records,
  type UpstairsAct,
} from "./passives";
import { guestFemale, GUEST_KIND_LIST, ROLES, ROLES_OF, roleLabel, rollStats, type GuestRole, type RoleStats } from "./guestroles";
import { ALLOW_WILL, DRINK_WILL, LEAN_WILL, maxWillpower, NAP_RESTORE, refuseCost, STEADY_WILL } from "./willpower";

/**
 * The rules of the game, with no graphics. The view layer tells this class what
 * the player did and reads the state back, which keeps the rules unit-testable.
 */

/** The drinks bought by the bottle and poured at the shelf behind the bar, on top of the ale on tap. */
export type Bottle = "wine" | "mead" | "vodka";
export type Item = "ale" | Bottle | "bread" | "stew" | "cask";
export type GuestKind = "farmer" | "smuggler" | "soldier" | "fugitive" | "adventurer" | "bandit" | "noble";
export type Station = "tap" | "shelf" | "bread" | "pot" | "barrel" | "bin" | "wash";
/** What food and drink are served on. The tavern owns a set number of each, and they have to be washed to be used again. */
export type Ware = "cup" | "dish";
/** What can be in your hands: something to serve, or a stack of dirty dishes on the way to the tub. */
export type Held = Item | "dirty";
/** A day: closed while it's light, "dusk" once the bell rings and the tavern waits for nightfall, then
 * the night's service and last call. "bedtime" is the closed tavern after last call, until you go to bed,
 * and "dawn" is the morning after. The world clock, not the tavern, decides when night falls. */
export type Phase = "day" | "dusk" | "service" | "lastcall" | "bedtime" | "dawn" | "ended";
/** Something she gained, for the game to show as it happens: a stat or skill level, or her kink changing. */
export type Gain =
  | { kind: "level"; id: StatId | SkillId; name: string; level: number }
  | { kind: "kink"; from: Kink; to: Kink }
  /** Her Level or her Slut Level went up (with the word for how far she's come, for the Slut Level). */
  | { kind: "rank"; which: "level" | "slut"; level: number; word?: string }
  /** She earned a title. */
  | { kind: "title"; id: string };
export type GuestStatus = "arriving" | "waiting" | "eating" | "leaving";
export type PotState = "empty" | "cooking" | "ready" | "burnt";
export type Target =
  | { kind: "station"; station: Station }
  | { kind: "guest"; id: number }
  | { kind: "mess"; id: number }
  | { kind: "bell" }
  | { kind: "bed" }
  | { kind: "door" }
  | { kind: "desk" }
  | { kind: "book" }
  | { kind: "bath" };
/** A sound the rules ask for. What each one actually sounds like is up to the audio layer. */
export type Cue =
  | "pour" | "aleReady" | "takeAle" | "takeBread" | "takeStew" | "takeCask" | "putDown" | "refill"
  | "stewStart" | "stewReady" | "stewBurnt" | "serve" | "tip" | "buy" | "drink" | "guestIn" | "walkOut"
  | "doorOpen" | "doorClose" | "smashTray" | "smashOne" | "drop" | "dishes" | "wipe" | "rumor";
const TAKE_CUES: Record<Item, Cue> = {
  ale: "takeAle",
  wine: "takeAle",
  mead: "takeAle",
  vodka: "takeAle",
  bread: "takeBread",
  stew: "takeStew",
  cask: "takeCask",
};
/**
 * What a night leaves behind: dirty dishes on the tables, ale on the floor, and dust tracked in. Cobwebs hang
 * high on the walls: the shut-up tavern is full of them on the first day, and spiders move back in after a
 * night opened dirty.
 */
export type MessKind = "dishes" | "spill" | "dust" | "cobweb";
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
/** Bar work: served this many with nobody walking out is a smooth night; this many at all, a busy one. */
const SMOOTH_NIGHT_SERVED = 8;
const BUSY_NIGHT_SERVED = 15;
/**
 * Her Level, Karryn-style: one for every few levels her stats and skills have grown in all. Each one past the
 * first gives her more willpower, more stamina in a brawl, and a little more on everything she's paid.
 */
const LEVELS_PER_LEVEL = 3;
const LEVEL_WILL = 2;
const LEVEL_STAMINA = 1;
const LEVEL_PAY = 0.02;
/** Her Slut Level is her lewdness by tens; every this many pays a gold more on each touch she lets happen. */
const LEWDNESS_PER_SLUT_LEVEL = 10;
const SLUT_LEVELS_PER_GOLD = 2;
/**
 * A foe reaching mid-brawl is bolder than they'd be at the table, Karryn-style: this much more nerve for what they
 * go for (never for whether it lands unasked: that still goes by their own nerve).
 */
const BRAWL_BOLDER = 2;
/** Mid-brawl, a foe's hands go for the part of her their type likes: these parts, this much more often. */
const BRAWL_PREFER_PULL = 2;
const REGIONS_OF_AREA: Record<DuelArea, readonly TouchRegion[]> = {
  hands: ["hand", "waist"],
  mouth: ["lips", "neck", "face"],
  breasts: ["chest"],
  butt: ["rear"],
  pussy: ["thigh", "intimate"],
};
/** How often a guest full of lust flatters you rather than asking a favor. */
const LUSTY_COMPLIMENT_SHARE = 0.9;
const CUSHION_PATIENCE = 1.25;
// The morning after. Every guest leaves something to clean up, and a dirty room wears on the next night's guests.
/** Patches of dust the night's crowd always tracks in, plus one more for every few guests. */
const DUST_BASE = 3;
const GUESTS_PER_DUST = 3;
/** The first morning: nobody has opened the place since Grandma Wren died, so it's thick with cobwebs and dust. */
const FIRST_DAY_COBWEBS = 5;
const FIRST_DAY_DUST = 6;
/** A night opened with mess still about lets a spider back in. It never gets more webs up than this. */
const MOST_COBWEBS = 4;
/** How much patience guests lose in a filthy room, and how many messes count as filthy. */
const MESS_PATIENCE_LOSS = 0.3;
const MESS_FOR_FULL_LOSS = 8;

// The washing up. Everything served goes out on a cup or a dish, and comes back dirty when the guest is done.
const START_CUPS = 6;
const START_DISHES = 6;
/** Seconds of scrubbing per cup or dish, standing at the tub with empty hands. */
const WASH_TIME = 1;
/** More can be bought from the house plans, this many at a time, for this much, up to what the shelves hold. */
export const STOCK_PACK = 3;
export const STOCK_COST = 10;
export const MAX_WARE: Record<Ware, number> = { cup: 12, dish: 12 };
export const WARE_NAMES: Record<Ware, string> = { cup: "cups", dish: "dishes" };
const WARE_OF: Record<Item, Ware | null> = {
  ale: "cup",
  wine: "cup",
  mead: "cup",
  vodka: "cup",
  bread: "dish",
  stew: "dish",
  cask: null,
};

// The good stuff. Each drink is bought once from the house plans and stays on the shelf behind the bar for good,
// poured a cup at a time. Once it's in, guests who'd have had ale sometimes ask for their favourite, and pay more.
export const BOTTLE_KINDS: readonly Bottle[] = ["wine", "mead", "vodka"];
export const BOTTLES: Record<Bottle, { name: string; cost: number; extraPay: number; detail: string }> = {
  wine: { name: "Wine", cost: 35, extraPay: 5, detail: "Smugglers ask for it. 5 gold more a cup than ale." },
  mead: {
    name: "Mead",
    cost: 25,
    extraPay: 3,
    detail: "Farmers ask for it. 3 gold more a cup, and the honey warms them up to you.",
  },
  vodka: {
    name: "Vodka",
    cost: 30,
    extraPay: 4,
    detail: "Soldiers and fugitives ask for it. 4 gold more a cup, and it gets them drunk.",
  },
};
/** How often a guest who'd have had ale asks for their favourite instead, when there's some on the shelf. */
const ASKS_FOR_BOTTLE = 0.5;
/** Mead warms a guest's lust by this much; vodka gets a guest drunk this often. */
const MEAD_LUST = 2;
const VODKA_DRUNK_CHANCE = 0.6;
const isBottle = (item: Item | "dirty" | null): item is Bottle => item === "wine" || item === "mead" || item === "vodka";

/** Ale goes on a tray, which holds this many cups. Everything else is carried one at a time. */
export const TRAY_SIZE = 3;

// Drinking. Drunkenness runs from 0 (sober) to 1 (can barely stand).
export const DRUNK_MAX = 1;
/** How much one drink with a table adds. */
const DRINK_STRENGTH = 0.3;

// ---- Desire, pleasure and corruption (see passives.ts) ----
/** What a touch she lets happen adds to its own meter; the rest of her gets a third. Leaning in, half again. */
const TOUCH_DESIRE = 8;
const LEAN_DESIRE = 1.5;
/** What a drink adds to every meter. */
const DRINK_DESIRE = 6;
/** Pleasure for each step of a touch's boldness; at the top she's overwhelmed, which lifts every meter. */
const PLEASURE_PER_LEVEL = 2.5;
const PLEASURE_MAX = 100;
const OVERWHELM_DESIRE = 20;
/** A meter this high at bedtime, and she can't sleep until she's eased the ache. */
const RESTLESS_AT = 50;
/** Every meter this high on one night counts toward "Always Wanting". */
const ALL_HIGH = 60;
/** Respect this high at bedtime counts toward "Iron Will". */
const HIGH_RESPECT_NIGHT = 8;
/** Guests start asking her upstairs once she's this lewd. */
const INVITES_AT = 25;
/** The house can become a brothel once she's this lewd, or this corrupt. Either one is enough. */
const BROTHEL_AT_LEWDNESS = 50;
const BROTHEL_AT_CORRUPTION = 50;
/** A test partner's starting pleasure and stamina, from the test panel; null stamina is full. */
export function applyTestPartner(partner: Partner, setup: { pleasure: number; stamina: number | null } | undefined): void {
  if (!setup) return;
  partner.pleasure = Math.max(0, Math.min(99, Math.round(setup.pleasure)));
  partner.stamina = setup.stamina === null ? partner.maxStamina : Math.max(0, Math.min(partner.maxStamina, Math.round(setup.stamina)));
}

/** How often, in seconds, passives are checked during the night. */
const PASSIVE_CHECK_SECONDS = 0.5;
/** How much of their patience everyone waiting loses while she's upstairs. */
const UPSTAIRS_PATIENCE = 0.35;
/** The stakes she can play an after-hours game for. */
const DUEL_STAKES = [0, 5, 10, 20];
/** Experience for each time she does something upstairs. */
const UPSTAIRS_XP = 5;
/** How likely an angry or roaring drunk guest is to start a brawl, each second; at most this many a night. */
const TROUBLE_PER_SECOND = 0.012;
const MAX_FIGHTS = 2;
/** How long trouble brews at their table (the icon over their head, the shouting) before they come for her. */
const TROUBLE_BREWING = 4.5;
/** How long they have to reach her once they're up; if they can't get to her by then, it starts anyway. */
const TROUBLE_COMING = 10;
/** What a guest who knocks her down takes from the till, plus a little more each night. */
const LOST_FIGHT_GOLD = 6;
/** Corruption for each point of greed, each secret sold, each time she informs, and each cold choice. */
const CORRUPT_PER_GREED = 4;
const CORRUPT_PER_SOLD = 10;
const CORRUPT_PER_INFORM = 8;
const CORRUPT_PER_COLD = 3;
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
/**
 * How likely a guest who's drinking with you is to go for your clothes: a little to begin with, more the drunker
 * you are, more again from a lusty or drunk guest, a known flirt, or an innkeeper the room no longer respects.
 */
const DARE_BASE = 0.08;
const DARE_PER_DRUNK = 0.3;
const DARE_LUSTY = 0.25;
const DARE_DRUNK_GUEST = 0.1;
const DARE_FLIRT = 0.1;
const DARE_DISRESPECTED = 0.15;
const DARE_RESPECTED = -0.06;
const DARE_MAX = 0.6;

/** How a party's evening with you is going: drinks shared, a jug on the table, and a guest going for your clothes. */
interface PartyState {
  drinks: number;
  jug: boolean;
  dare: StripPiece | null;
}

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
  /** Their type in the group; left out, the group's types take turns (a party gets one of each). */
  role?: GuestRole;
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

const arrive = (at: number, kind: GuestKind, order: Item, rumor = false, party?: number, role?: GuestRole): Arrival => ({
  at,
  kind,
  order,
  rumor,
  party,
  role,
});

export const NIGHTS: NightPlan[] = [
  {
    intro: "Night 1. Ale is at the bar, bread is in the basket by the oven. Take dirty cups and dishes to the wash tub by the barrels. Press E to act.",
    guests: [
      // A gentle first night: five guests, one every 15 seconds or so, so she can learn the tap, the bread and the tub.
      arrive(5, "farmer", "ale"),
      arrive(20, "farmer", "bread", false, 0),
      arrive(20, "farmer", "ale", false, 0),
      arrive(40, "smuggler", "ale", true),
      arrive(60, "soldier", "bread"),
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
      // Ten guests over 70 seconds: the two tables first, and the adventurers' party of four last, once the room has cleared.
      arrive(5, "farmer", "stew"),
      arrive(18, "fugitive", "stew", true, 0),
      arrive(18, "smuggler", "ale", false, 0),
      arrive(35, "soldier", "ale", false, 1),
      arrive(35, "soldier", "bread", false, 1),
      arrive(52, "farmer", "ale"),
      arrive(70, "adventurer", "ale", false, 2),
      arrive(70, "adventurer", "stew", false, 2),
      arrive(70, "adventurer", "bread", false, 2),
      arrive(70, "adventurer", "ale", false, 2),
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
      {
        chat: [
          "Warrior: \"Four ales! No, three ales and whatever the mage drinks!\"",
          "Mage: \"Stew. And a table that isn't moving, if you have one.\"",
          "Archer: \"Ruins on the north road by noon tomorrow. Kestrel says so.\"",
          "Cleric: \"Innkeeper, sit with us. You look like you've been fighting all night.\"",
        ],
        overheard: [
          "Archer: \"How many steps down did Kestrel say?\"",
          "Warrior: \"A hundred. Or a thousand. She was drunk.\"",
          "Mage: \"The map says forty. The map was drawn by a man who died there.\"",
          "Cleric: \"Then we go down thirty-nine and see how we feel.\"",
          "Warrior: \"I'll go first. I always go first.\"",
          "Archer: \"You always go first because you can't read the map.\"",
          "Mage: \"Nobody can read the map. That's why the gold is still there.\"",
          "Cleric: \"Drink up. Tomorrow we're rich, or we're a song.\"",
        ],
        offer: "The warrior thumps a cup down in front of you. \"To the gold under the hill, and whoever's mad enough to fetch it!\"",
        gossip: "\"Kestrel's been east, you know. Says there's a prisoner in the salt mines out there who swears he's from Tarven.\"",
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
      // The busiest night, but still breathing room: thirteen guests over 105 seconds, a table every 15 or so.
      arrive(5, "soldier", "ale"),
      arrive(15, "farmer", "bread", true, 0),
      arrive(15, "farmer", "ale", false, 0),
      arrive(15, "smuggler", "stew", false, 0),
      arrive(32, "fugitive", "ale"),
      arrive(45, "bandit", "ale", false, 2),
      arrive(45, "bandit", "ale", false, 2),
      arrive(60, "soldier", "bread", false, 1),
      arrive(60, "soldier", "ale", false, 1),
      arrive(75, "smuggler", "stew"),
      arrive(90, "noble", "stew", false, 3),
      arrive(90, "noble", "bread", false, 3),
      arrive(105, "farmer", "ale"),
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
      {
        chat: [
          "Brute: \"Two ales. Big ones.\"",
          "Rogue: \"Nice place. Be a shame if it caught a chill.\"",
          "Brute: \"Corran says hello. Corran says a lot of things.\"",
          "Rogue: \"Sit down, innkeeper. We're friends here. Aren't we friends?\"",
        ],
        overheard: [
          "Rogue: \"The wagon was light. Lighter than they said.\"",
          "Brute: \"Corran'll want to know why.\"",
          "Rogue: \"Corran knows why. Somebody up at the keep skimmed it first.\"",
          "Brute: \"Then who are we robbing?\"",
          "Rogue: \"Whoever we're told to, and we keep our mouths shut.\"",
          "Brute: \"I like this ale. We should protect this place.\"",
          "Rogue: \"We should charge it for the privilege.\"",
        ],
        offer: "The rogue pushes a cup at you, red scarf loose at the throat. \"Drink with us. Friends drink together.\"",
        gossip: "\"Funny thing about the toll wagons. We take them, and the baron never sends anyone after us. Never once.\"",
      },
      {
        chat: [
          "Noble: \"The table is sticky. Have it wiped, and bring the stew.\"",
          "Servant: \"Bread for me, please. Only if it's no trouble.\"",
          "Noble: \"The Baroness sends her regards. She hears your name even in the lowlands.\"",
          "Noble: \"Do sit, innkeeper. I want to know what a pass tavern hears.\"",
        ],
        overheard: [
          "Noble: \"Hesk's road is a disgrace. Ruts like graves.\"",
          "Servant: \"Yes, my lord.\"",
          "Noble: \"When the Baroness holds the keep, the toll will mean something.\"",
          "Servant: \"And if he won't give it up?\"",
          "Noble: \"Men like Hesk always give it up. It's only a question of the price.\"",
          "Servant: \"The stew's good, my lord.\"",
          "Noble: \"It's adequate. Don't tell them. They'll put the price up.\"",
        ],
        offer: "The noble's servant pours for you, and the noble lifts a cup a finger's width. \"To better roads.\"",
        gossip: "\"The crown has an auditor on the road this season. Hesk's books won't survive a careful reader.\"",
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
  /** Their group, which decides how they talk. */
  kind: GuestKind;
  /** Their type in the group, which decides their numbers: patience, purse, drink, nerve, fists (guestroles.ts). */
  role: GuestRole;
  /** Their own numbers, rolled in their type's range as they walk in, so no two are quite alike. */
  stats: RoleStats;
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

/**
 * A guest working up to a brawl. First it brews at their table: an angry mark over their head, and something
 * hateful said out loud (serve them now and they may settle). Then they get up and come for her, and the brawl
 * starts once they reach her, or when they've been on their way too long.
 */
export interface Trouble {
  guestId: number;
  stage: "brewing" | "coming";
  /** Seconds left in this stage. */
  timer: number;
  /** What they shout as it brews. */
  shout: string;
  /** Whether they've reached her (the game says so). */
  arrived: boolean;
  /** Whether they were still waiting for their order when it started: serving it then can settle them. */
  waiting: boolean;
}

/** Something to clean up. */
export interface Mess {
  id: number;
  kind: MessKind;
  /**
   * Dishes: the seats at one table that were eaten at. A spill: the one seat it's under. Dust: which of
   * the room's dust spots it lies on, and a cobweb which of its cobweb spots (the game decides where those are).
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
  /** The bottled drinks bought for the shelf. */
  bottles?: Bottle[];
  /** The name written in the journal, or none yet. */
  name?: string;
  /** What was left in the wash tub. */
  tub?: Ware[];
  /** How far guests' touches have brought the innkeeper along. Older saves start from nothing. */
  touch?: TouchMemory;
  /** Her records, passives and corruption. Older saves start from nothing. */
  progress?: ProgressSave;
}

/** A moment that wants an 18+ card: a guest she's agreed to take upstairs, or being overwhelmed. */
export type AdultScene = { kind: "upstairs"; guestId: number; guestKind: GuestKind; guestStats?: RoleStats } | { kind: "overwhelmed" };

/** The last Consent-off check: who reached, for what, both sides' numbers, and what came of it. */
export interface ImpulseRecord {
  guest: string;
  kind: GuestKind;
  prefers: DuelArea;
  touch: string;
  region: TouchRegion;
  brawl: boolean;
  /** Impulsive (lustful and bold), or a worked-up brawler. */
  eager: boolean;
  /** A touch the switch can cover: she could say yes, within the boldness, not clothes or upstairs. */
  covered: boolean;
  consentOff: boolean;
  facts: ImpulseFacts;
  check: ImpulseCheck;
  /** It played out without asking. */
  landed: boolean;
}

/** A guest reaching for you as you serve them, waiting on your answer. */
interface TouchChat {
  guestId: number;
  touch: TouchDef;
  lines: TalkLine[];
  answers: TouchAnswer[];
  answered: boolean;
  /** What she answered, once she has: the intensity bar shows only after a yes. */
  answer: TouchAnswer | null;
  /** How tempted she was when the hand came in: 0 not ready, 1 torn, 2 wanting it. Saying no costs willpower past 0. */
  tier: number;
  /** What was just said, after their lines. */
  reply: TalkLine[];
  /** An impulsive guest, and the player hasn't said yet whether they may touch without asking: she's asked here. */
  offerAuto: boolean;
  /** It landed without the question, because the player said impulsive guests may: the Force bar fills fast. */
  impulse: boolean;
  /**
   * A reach in the middle of a brawl: never a garment or an invitation, and the fight picks up after. Asked like any
   * other reach, unless Consent is switched off in Settings: then it may land on its own.
   */
  brawl?: boolean;
}

/**
 * After she's lost a brawl, the one who won asks her (GAME_PATH.MD, "Brawl loss"). Hers to answer: going on takes
 * her to the After Hours rules (her parts, her stop), and stopping costs nothing past the loss itself. Either way
 * the night ends.
 */
export interface BrawlOffer {
  kind: GuestKind;
  stats: RoleStats;
  /** They were roaring drunk: too drunk to say yes to. */
  drunk: boolean;
}

/** A touch that's just been answered, for the game to play out on screen. */
export interface TouchMoment {
  id: string;
  region: TouchRegion;
  level: number;
  answer: TouchAnswer;
  /** Who reached for you. */
  kind: GuestKind;
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
  cobweb: "Brush down the cobweb",
};
const MESS_DONE: Record<Exclude<MessKind, "dishes">, string> = {
  spill: "Floor mopped.",
  dust: "Swept.",
  cobweb: "Cobweb down.",
};

/** "1 cobweb", "3 patches of dust": what's left of one kind of mess, in words. */
const MESS_COUNT_WORDS: Record<MessKind, [string, string]> = {
  dishes: ["pile of dishes", "piles of dishes"],
  spill: ["puddle of ale", "puddles of ale"],
  dust: ["patch of dust", "patches of dust"],
  cobweb: ["cobweb", "cobwebs"],
};

/** "2 cobwebs and 1 patch of dust", for the messes given, cobwebs first. */
function messesLeftWords(messes: readonly Mess[]): string {
  const parts = (["cobweb", "dust", "spill", "dishes"] as const).flatMap((kind) => {
    const n = messes.filter((m) => m.kind === kind).length;
    return n === 0 ? [] : [`${n} ${MESS_COUNT_WORDS[kind][n === 1 ? 0 : 1]}`];
  });
  return parts.length <= 1 ? (parts[0] ?? "nothing") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

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
const STATION_OF_ITEM: Record<Item, Station> = {
  ale: "tap",
  wine: "shelf",
  mead: "shelf",
  vodka: "shelf",
  bread: "bread",
  stew: "pot",
  cask: "barrel",
};

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
  /** The bottled drinks on the shelf, bought once and kept for good. */
  readonly bottles = new Set<Bottle>();
  /** The innkeeper's name, as written in the journal; empty until the player writes one. */
  name = "";
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
  /** A guest reaching for you, waiting on your answer, or null. */
  private touchChat: TouchChat | null = null;
  /** The last Consent-off check, whether or not it counted, for the dev panel (the ] key). */
  lastImpulse: ImpulseRecord | null = null;
  /**
   * The touch she has just said yes to, for the intensity (Force) bar: its boldness and her answer. Null before she
   * answers, and after a slap or a pull, so the bar never shows while she's still choosing.
   */
  get landedTouch(): { level: number; answer: TouchAnswer; impulse: boolean } | null {
    const chat = this.touchChat;
    if (!chat?.answered || !chat.answer || !touchLands(chat.answer)) return null;
    return { level: chat.touch.level, answer: chat.answer, impulse: chat.impulse };
  }
  /** How far guests' touches have brought you, which lasts from night to night. */
  touchMemory: TouchMemory = newTouchMemory();
  /** Touches tried tonight, so the same one doesn't keep coming round. */
  private readonly touchSeen = new Set<string>();
  /** How each guest's reaching has gone tonight: touches you let them have, and whether you slapped them. */
  private readonly touchHistory = new Map<number, { allowed: number; slapped: boolean }>();
  /** The touch just answered, until the game takes it to show. */
  private touchMoment: TouchMoment | null = null;
  /** Her desire tonight, a meter for each part of her from 0 to 100. Starts where her passives put it; gone by morning. */
  readonly meters: Meters = emptyMeters();
  /** The highest each meter got tonight, for records that count maxed nights. */
  private readonly peak: Meters = emptyMeters();
  /** Pleasure tonight, 0 to 100. At the top, she's overwhelmed. */
  pleasure = 0;
  /** Willpower she's spent since she last slept (see willpower.ts). Kept as what's spent, so it's right whatever her Mind does. */
  private willSpent = 0;
  /** How far she's sold out, from 0 up. Lasts. */
  corruption = 0;
  /**
   * The player's say over impulsive guests touching without asking. Not part of a save: the game loads it from the
   * browser and keeps it there, like the sound settings.
   */
  touchSettings: TouchSettings = defaultTouchSettings();
  /** Play-mode cache: tavern now, brothel (and more) later. */
  houseMode: { current: "tavern" | "brothel"; unlocked: Set<string>; brothel: number } = {
    current: "tavern",
    unlocked: new Set(["tavern"]),
    brothel: 0,
  };
  /** Everything counted about her, for passives. Lasts. */
  records: Records = newRecords();
  /** The passives she holds, by id. */
  readonly passives = new Set<string>();
  /** What her passives add up to. */
  effects: Effects = noEffects();
  /** Passives earned as she went to bed last, for the morning to show. */
  newPassives: PassiveDef[] = [];
  /** Titles she's earned, and the ones she's wearing (titles.ts): one slot, two once she's famous enough. */
  titles = new Set<string>([START_TITLE]);
  worn: string[] = [START_TITLE];
  /** She eased the ache herself before sleeping last night. */
  eased = false;
  /** A moment waiting for its 18+ card, until the game takes it. */
  private adultScene: AdultScene | null = null;
  /** Experience in every stat and skill. Lasts. */
  xp: Experience = {};
  /** A guest working up to a brawl, before it starts: see `Trouble`. */
  trouble: Trouble | null = null;
  /** A brawl in progress, or null. While set, the game shows the fight and the night waits. */
  fight: Fight | null = null;
  /** How the last brawl ended, for the game to show once. */
  lastFight: { outcome: FightOutcome; text: string } | null = null;
  /** What the winner of a brawl she lost is asking, until she answers. */
  brawlOffer: BrawlOffer | null = null;
  /** An after-hours game in progress, or null; and how the last one ended, for the game to show once. */
  duel: Duel | null = null;
  lastDuel: { outcome: DuelOutcome; text: string; line: string; gold: number; test?: boolean; brawl?: boolean } | null = null;
  /** Whether the duel going on is a test one, which counts for nothing. */
  private testDuel = false;
  /** Whether the duel going on is the one she agreed to after losing a brawl: the night ends after it. */
  private brawlDuel = false;
  /** Guests she let touch her tonight who weren't drunk: one of them might linger after closing. */
  private admirers: { kind: GuestKind; stats: RoleStats }[] = [];
  /** Sober guests she talked out of a brawl tonight: one of them might linger after closing too. */
  private peacemade: { kind: GuestKind; stats: RoleStats }[] = [];
  /** Whose turn it is in each group's roster, so a group's types take turns through the door. */
  private roleTurn: Partial<Record<GuestKind, number>> = {};
  private duelTonight = false;
  /** Brawls tonight, and drinks she's had tonight. */
  private fightsTonight = 0;
  private drinksTonight = 0;
  /** Tonight's touches, for the journal: how many guests reached, how many you let, how many you turned away. */
  readonly touchesTonight = { reached: 0, allowed: 0, refused: 0, boldest: 0 };
  /** Who the player is, so what guests say fits them. The game sets it. */
  playerBody: PlayerBody = "Male";
  /** The outfit the player has on, by id; missing means their own. Guests go for its pieces in its own order. */
  playerOutfit: string | undefined = undefined;
  /** The style of legwear she has on, by id; the outfit's own when undefined. */
  playerLegwear: string | undefined = undefined;
  /** Her bra (or one-piece) and briefs, by style id; her band and braies when unset. */
  playerUnder: { bra?: string; briefs?: string } = {};
  /** Where chance comes from: which guests offer a drink, and what they say. Tests replace it. */
  random: () => number = Math.random;
  /**
   * Where each guest's own numbers are rolled from, in their type's range, as they walk in. Kept apart from
   * `random` so the rolls don't shift what else chance decides. Tests pin it at 0.5, which gives the type's own.
   */
  rollRandom: () => number = Math.random;
  /** The player's reputation, which changes what guests say. It lasts from night to night. */
  persona: Persona = newPersona();
  /** Lines guests have already said, so they say something new next time. */
  private readonly saidLines = new Set<string>();
  /** How far down the wardrobe's strip ladder guests have got you tonight: 0 is fully dressed. Back on by morning. */
  stripped = 0;
  /** What men have left on her tonight, in ml by spot. She washes before the next night. */
  private coated: Partial<Record<CumSpot, number>> = {};
  /** How far she undressed herself in tonight's duel, kept until morning: 0, down to her shift, or bare. */
  private undressedTonight = 0;
  /** A test duel just over, still shown on her until its result is taken; it counts for nothing else. */
  private endedTest: Duel | null = null;
  /** Favors guests have already asked. Each is asked once, so nobody keeps pressing the same letter on you. */
  private readonly askedFavors = new Set<string>();
  /** What a party was saying as you sat down with them. */
  private talkOpening: TalkLine[] = [];
  /** How each party has treated you tonight: drinks poured, and whether you sold them a jug. */
  private readonly partyState = new Map<number, PartyState>();

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
  /** Someone is at the tub scrubbing right now, for the tub's animation. */
  scrubbing = false;
  /** When the last dish came out clean (performance.now()), for the tub's sparkle. */
  washedAt = -Infinity;
  /** Seats where ale went on the floor tonight. */
  private readonly spiltAt = new Set<number>();
  private readonly messages: string[] = [];
  private readonly unlocks: PassiveDef[] = [];
  /** Level ups and a change in her kink, for the game to show as they happen (see takeGains). */
  private readonly gains: Gain[] = [];
  /** Her Level and Slut Level as last shown, so a rise is shown once (and a loaded game doesn't announce itself). */
  private shownLevel = 1;
  private shownSlut = 0;
  /** Seconds until passives are checked again during the night. */
  private passiveCheck = 0;
  private readonly cues: Cue[] = [];

  /** The night was opened with mess still about, which lets a spider back in by morning. */
  private openedDirty = false;

  /** `seatTables` names the table each seat is at, so a party can sit together. "Bar" stools are not a table. */
  /** `dustSpots` is how many places in the room dust can settle; with none, nights leave no dust. */
  /** `cobwebSpots` is how many places up on the walls a cobweb can hang; with none, there are never any. */
  constructor(
    private seatCount: number,
    private seatTables: readonly string[] = [],
    private readonly dustSpots = 0,
    private readonly cobwebSpots = 0,
  ) {
    this.openDay();
  }

  /**
   * A new game's first morning: the tavern has stood shut since Grandma Wren died, so there are cobwebs up in
   * the corners and dust all over the floor. Cleaning them is how she learns to clean, and the bell won't ring
   * until it's done. Only on the first day, and only once.
   */
  settleIn(): void {
    if (this.nightIndex !== 0 || this.phase !== "day" || this.messes.length > 0) return;
    const add = (kind: MessKind, spots: number[]) => this.messes.push({ id: this.nextMessId++, kind, spots });
    for (const spot of shuffled(this.cobwebSpots, 17).slice(0, FIRST_DAY_COBWEBS)) add("cobweb", [spot]);
    for (const spot of shuffled(this.dustSpots, 29).slice(0, FIRST_DAY_DUST)) add("dust", [spot]);
    if (this.messes.length === 0) return;
    // This morning's usual "the tavern is closed" line gives way to the one that says what to do.
    this.messages.length = 0;
    this.say(
      "Day 1. Nobody has opened the place since Grandma died. Cobwebs hang high on the walls, and dust lies all over the floor.",
    );
    this.say(
      "Clean it before you open. Walk up to a cobweb and press E to brush it down, then sweep the dust the same way. The bell on the bar rings once it's all done.",
    );
  }

  /** The first morning's cleaning still isn't done: the bell waits for it. */
  get settlingIn(): boolean {
    return this.nightIndex === 0 && this.phase === "day" && this.messes.some((m) => m.kind === "cobweb" || m.kind === "dust");
  }

  /** Replaces the seats, after furniture has moved. Only safe with no guests in the room. */
  setSeats(tables: readonly string[]): void {
    this.seatCount = tables.length;
    this.seatTables = tables;
  }

  /** Rings the bell to open for the night. The night's guests start coming once night has fallen. */
  open(): void {
    if (this.phase !== "day" || this.settlingIn) return;
    this.phase = "dusk";
    this.openedDirty = this.messes.length > 0;
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
    this.endOfNight();
  }

  /**
   * As she goes to bed: the night's records are counted, her passives have their nightly say, and anything
   * she's earned is hers from tomorrow.
   */
  private endOfNight(): void {
    const r = this.records;
    for (const m of METERS) if (this.peak[m] >= METER_MAX) r.maxed[m] = (r.maxed[m] ?? 0) + 1;
    if (METERS.every((m) => this.peak[m] >= ALL_HIGH)) r.allHigh++;
    if (this.playerBody === "Female") {
      const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder).length;
      r.clothesLost += this.stripped;
      if (ladder > 0 && this.stripped >= ladder) r.bareNights++;
      if (this.touchesTonight.reached > 0 && this.touchesTonight.allowed === 0) r.chasteNights++;
    }
    // Bar work: a night nobody walked out of, and a busy one.
    if (this.walkouts === 0 && this.served >= SMOOTH_NIGHT_SERVED) r.smoothNights++;
    if (this.served >= BUSY_NIGHT_SERVED) r.busyNights++;
    if (this.persona.respect >= HIGH_RESPECT_NIGHT) r.respectNights++;
    // A night without a drink keeps her head clear.
    if (this.drinksTonight === 0) this.gainXp("mind", 3);
    const nightly = this.effects.perNight;
    this.adjust(0, nightly.trust, nightly.heat);
    if (nightly.respect) this.shift({ respect: nightly.respect });
    this.awardPassives();
  }

  /**
   * Gives her any passive she's earned, the moment she's earned it: checked through the night and once more at
   * bedtime, once the night's records are in. Each goes in tonight's list for the bedtime summary, and in the
   * queue for the game's log.
   */
  private awardPassives(): void {
    const earned = newlyEarned(this.passives, this.passiveFacts());
    const kinkBefore = this.kink;
    for (const def of earned) {
      this.passives.add(def.id);
      this.corruption += def.corruption ?? 0;
      this.newPassives.push(def);
      this.unlocks.push(def);
    }
    // Titles she's earned: the bonus once, now, and shown to her; she puts them on in the journal.
    const facts = this.passiveFacts();
    for (const def of TITLES) {
      if (this.titles.has(def.id) || !titleEarned(def, facts)) continue;
      this.titles.add(def.id);
      const { gold = 0, trust = 0, respect = 0, fame = 0 } = def.bonus;
      this.adjust(gold, trust, 0);
      if (respect || fame) this.shift({ respect, fame });
      this.gains.push({ kind: "title", id: def.id });
    }
    if (earned.length > 0) this.refreshEffects();
    // Her new passives can tip her kink over to another: how she talks after the Consent check changes with it.
    if (this.kink !== kinkBefore) this.gains.push({ kind: "kink", from: kinkBefore, to: this.kink });
    // Tonight's records count toward her lewdness even when no new passive came with them.
    this.unlockBrothel();
  }

  /** Passives earned since the game last asked, for the log. Reading them empties the queue. */
  takeUnlocks(): PassiveDef[] {
    return this.unlocks.splice(0);
  }

  /** Naps through the rest of the day while closed. Only once a day; the clock is moved on by the game. */
  nap(): void {
    if (this.phase !== "day" || this.napped) return;
    this.napped = true;
    this.drunk = 0;
    this.restoreWill(Math.round(this.maxWillpower * NAP_RESTORE));
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
      const { kind, rumor, party } = next;
      const role = next.role ?? this.nextRole(kind, party);
      const stats = rollStats(role, this.rollRandom);
      const order = this.chooseOrder(role, next.order);
      const maxPatience =
        stats.patience *
        (this.upgrades.has("cushions") ? CUSHION_PATIENCE : 1) *
        this.messPatienceFor(stats.fussy) *
        (1 + this.effects.patience + charmBonus(this.level("charm")).patience);
      const context = this.banterContext(kind, undefined, role, stats);
      const { lust, desires } = arrivalFeelings(context, this.random);
      const filth = Math.min(1, this.messes.length / MESS_FOR_FULL_LOSS);
      this.guests.push({
        id: this.nextGuestId++,
        kind,
        role,
        stats,
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

  /**
   * The type a guest of this group comes as: a party gets one of each before any doubles up (archer, warrior,
   * mage, cleric), and guests on their own take turns through the roster.
   */
  private nextRole(kind: GuestKind, party?: number): GuestRole {
    const roster = ROLES_OF[kind];
    if (party !== undefined) {
      const taken = new Set(this.guests.filter((g) => g.party === party && g.kind === kind).map((g) => g.role));
      const open = roster.find((r) => !taken.has(r));
      if (open) return open;
    }
    const turn = this.roleTurn[kind] ?? 0;
    this.roleTurn[kind] = turn + 1;
    return roster[turn % roster.length];
  }

  /**
   * What a guest asks for. Ale drinkers sometimes want their favourite bottle instead, if it's on the shelf.
   */
  private chooseOrder(role: GuestRole, planned: Item): Item {
    if (planned !== "ale") return planned;
    const favourite = ROLES[role].favourite;
    if (!this.bottles.has(favourite)) return planned;
    return this.random() < ASKS_FOR_BOTTLE + this.effects.bottleAsk ? favourite : planned;
  }

  private startPour(): void {
    // The tap never runs dry: pouring only takes a clean cup.
    this.cleanWare.cup--;
    this.cue("pour");
    // Drunk hands fumble the tap.
    this.pourLeft = (this.upgrades.has("quicktap") ? QUICK_POUR_TIME : POUR_TIME) * (1 + DRUNK_FUMBLE * this.drunk);
  }

  /**
   * The bottle shelf pours whatever a waiting guest has asked for, the longest-waiting first, leaving out what
   * someone is already carrying to them.
   */
  private shelfAction(take: (item: Item) => void): Action | null {
    const carried = [...this.carrying];
    const wanted: Bottle[] = [];
    for (const guest of this.guests) {
      if (guest.status !== "waiting" && guest.status !== "arriving") continue;
      if (!isBottle(guest.order)) continue;
      const already = carried.indexOf(guest.order);
      if (already >= 0) carried.splice(already, 1);
      else wanted.push(guest.order);
    }
    if (wanted.length === 0) {
      if (this.bottles.size === 0) return this.phase === "day" ? { label: "The shelf is bare. Buy drinks on the house plans" } : null;
      return { label: "Nobody has asked for the good stuff" };
    }
    const pour = wanted[0];
    if (this.cleanWare.cup === 0) return { label: "No clean cups. Wash some at the tub" };
    return {
      label: `Pour a cup of ${pour}`,
      run: () => {
        this.cleanWare.cup--;
        take(pour);
        this.cue("pour");
      },
    };
  }

  private startStew(): void {
    this.potState = "cooking";
    // Stew Keeper: it cooks faster.
    this.potTimer = STEW_TIME * Math.max(0.2, 1 - this.effects.cookSpeed);
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
        this.potTimer = this.burnTime;
        this.records.stewsCooked++;
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
      // Someone spoiling for a fight has better things to do than wait or eat.
      if (this.trouble?.guestId === guest.id) continue;
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
        guest.listened += dt * (1 + mindBonus(this.level("mind")).listen);
        if (guest.listened >= LISTEN_TIME) {
          this.heardRumor = true;
          this.records.rumors++;
          this.gainXp("mind", 3);
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
          this.cue("rumor");
        }
      }

      // Someone who's angry or roaring drunk might start trouble, now and then.
      const rowdy = guest.mood === "angry" || guest.mood === "drunk";
      if (
        seated &&
        rowdy &&
        this.phase === "service" &&
        !this.fight &&
        !this.trouble &&
        !this.inConversation &&
        this.fightsTonight < MAX_FIGHTS &&
        this.random() < TROUBLE_PER_SECOND * dt * Math.max(0, 1 - this.effects.trouble)
      ) {
        this.brewTrouble(guest);
      }
    }
  }

  /** Whether a guest can get up: a party stays and talks until everyone still at the table has finished. */
  private tableFinished(guest: Guest): boolean {
    return guest.party === null || this.partyGuests(guest.party).every((g) => g.status === "eating" && g.eatLeft <= 0);
  }

  /**
   * A guest leaves in the middle of things (thrown out, or off with the till after knocking her down): whatever they
   * were eating or drinking from stays on the table, so no cup or dish goes missing with them.
   */
  private sendOff(guest: Guest): void {
    if (guest.status === "eating") this.leaveDirty(guest);
    guest.status = "leaving";
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
    this.scrubbing = this.tub.length > 0 && scrubber !== null && this.carrying[scrubber] === null;
    if (!this.scrubbing) return;
    this.washLeft -= (dt * (1 + this.effects.washSpeed)) / (1 + DRUNK_FUMBLE * this.drunk);
    if (this.washLeft > 0) return;
    this.washLeft = WASH_TIME;
    this.cleanWare[this.tub.shift() as Ware]++;
    this.washedAt = performance.now();
    this.records.washed++;
    this.cue("wipe");
    if (this.tub.length === 0) this.say(this.messes.length === 0 && this.phase !== "service" ? "The tavern is spotless." : "All washed up.");
  }

  private walkOut(guest: Guest): void {
    guest.status = "leaving";
    this.walkouts++;
    this.shift({ fame: FAME_WALKOUT });
    // They knock their cup over on the way out.
    this.spiltAt.add(guest.seat);
    this.adjust(0, -1, guest.stats.walkoutHeat);
    this.say(`A ${this.nameOf(guest).toLowerCase()} walked out without paying.`);
    this.cue("walkOut");
  }

  tick(dt: number, context: TickContext): void {
    this.drunk = Math.max(0, this.drunk - SOBER_RATE * dt);
    this.passiveCheck -= dt;
    if (this.passiveCheck <= 0) {
      this.passiveCheck = PASSIVE_CHECK_SECONDS;
      this.awardPassives();
    }
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
    this.updateTrouble(dt);

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
    const rules = guest.stats;
    const left = guest.patience / guest.maxPatience;
    const behaviour = MOOD_BEHAVIOUR[guest.mood];
    const tipped = left > TIP_THRESHOLD && behaviour.tips;
    const bottle = isBottle(guest.order) ? guest.order : null;
    const e = this.effects;
    const base =
      rules.pay +
      (bottle ? BOTTLES[bottle].extraPay + e.bottleGold : 0) +
      (tipped ? rules.tip + behaviour.tipBonus + e.serveTip + charmBonus(this.level("charm")).tip : 0) +
      (this.stripped > 0 ? e.strippedGold : 0);
    // Her Level: a little more on everything, the more she's grown.
    const amount = Math.round(base * (1 + e.payPct + (this.herLevel - 1) * LEVEL_PAY));
    this.records.served++;
    if (bottle) this.records.poured++;
    this.gainXp("agility", 0.5);
    if (tipped) this.gainXp("charm", 1);
    if (this.stripped > 0 && e.strippedFame > 0) this.shift({ fame: e.strippedFame });
    const idolized = guest.mood === "idolize";
    guest.mood = moodWhenServed(guest.mood, left);
    if (bottle === "mead") guest.lust = Math.min(10, guest.lust + MEAD_LUST);
    if (bottle === "vodka" && this.random() < VODKA_DRUNK_CHANCE * rules.lightweight) guest.mood = "drunk";
    this.shift({ fame: FAME_SERVED + (tipped ? FAME_TIPPED + rules.fame : 0) + (idolized ? FAME_IDOLIZED : 0) });
    this.takeOne(sibling);
    guest.status = "eating";
    this.served++;
    this.earned += amount;
    this.adjust(amount, rules.trust, 0);
    this.say(tipped ? `+${amount} gold, with a tip.` : `+${amount} gold.`);
    this.cue(tipped ? "tip" : "serve");
    if (tipped && this.random() < TIP_CHAT_CHANCE) this.startTipChat(guest);
    if (!this.tipChat) this.maybeReach(guest);
    const [least, most] = guest.party === null ? EAT_ALONE : EAT_IN_PARTY;
    guest.eatLeft = (least + this.random() * (most - least)) * behaviour.stay * rules.stay + (guest.rumor ? RUMOR_EXTRA_EAT : 0);
  }

  /** A pleased guest buys you a drink, and with the drink in them, flatters you or asks a favor. */
  private startTipChat(guest: Guest): void {
    const context = this.banterContext(guest.kind, guest);
    const pick = <T extends { id: string; when?: (c: BanterContext) => boolean }>(lines: readonly T[]) =>
      pickLine(lines, context, this.saidLines, this.random);
    // The conversation shows what state they're in.
    const label = MOOD_LABELS[feltMood(guest)];
    const speaker = label ? `${this.nameOf(guest)} (${label})` : this.nameOf(guest);
    const line = (text: string): TalkLine => ({ speaker, text, guestId: guest.id });

    const lines = [line(pick(OFFERS)?.text ?? "\"Have one on me!\"")];
    const face = faceLine(feltMood(guest), context, this.saidLines, this.random);
    if (face) lines.push(line(face));
    const remark = pick(REMARKS);
    if (remark && this.random() < REMARK_CHANCE) lines.push(line(remark.text));

    let replies: Reply[];
    const dare = this.dare(guest);
    // Only favors nobody has asked yet; picked without marking, since a compliment may win instead.
    const favor = pickLine(
      FAVORS.filter((f) => f.kinds.includes(guest.kind) && !this.askedFavors.has(f.id)),
      context,
      new Set(),
      this.random,
    );
    const compliment = pick(COMPLIMENTS);
    const lusty = feltMood(guest) === "lust";
    if (dare) {
      lines.push(line(dare.dare));
      replies = stripReplies(dare, this.stripped);
    } else if (compliment && (this.random() < (lusty ? LUSTY_COMPLIMENT_SHARE : COMPLIMENT_SHARE) || !favor)) {
      lines.push(line(compliment.text));
      replies = complimentReplies(context);
    } else if (favor) {
      this.askedFavors.add(favor.id);
      lines.push(line(favor.ask));
      replies = [favor.agree, favor.refuse];
    } else {
      return;
    }
    this.talkingTo = null;
    this.tipChat = { speaker, guestId: guest.id, lines, replies, drank: false, answered: false, reply: [] };
  }

  /** The next piece of clothing guests would go for, or null once there's nothing left you'd lose. */
  get nextStripPiece(): StripPiece | null {
    const garment = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped];
    return garment ? stripPiece(garment) : null;
  }

  /** The ids of the clothes guests have got off you tonight, for the game to take off the model. */
  get strippedPieces(): string[] {
    return piecesOff(this.playerBody, this.stripped, this.playerOutfit, this.playerLegwear, this.playerUnder);
  }

  /**
   * What's off her as she's seen: tonight's dares, and in a duel, what she's taken off herself (down to her
   * shift, then everything). The dares are what count for anything else.
   */
  get shownPieces(): string[] {
    const off = this.strippedPieces;
    const undressed = Math.max(this.duel?.undressed ?? 0, this.endedTest?.undressed ?? 0, this.undressedTonight);
    if (undressed === 0) return off;
    const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder);
    const more = undressed >= 2 ? ladder : ladder.filter((g) => g.layer !== "under" && g.layer !== "smallclothes");
    return [...new Set([...off, ...more.map((g) => g.id)])];
  }

  /**
   * Whether a guest drinking with you goes for your clothes, and if so, which piece. Rolls high rather than
   * low, so the commonest rolls still bring the usual talk.
   */
  private dare(guest: Guest): StripPiece | null {
    const piece = this.nextStripPiece;
    if (!piece) return null;
    const mood = feltMood(guest);
    let chance = DARE_BASE + this.drunk * DARE_PER_DRUNK;
    if (mood === "lust") chance += DARE_LUSTY;
    if (mood === "drunk") chance += DARE_DRUNK_GUEST;
    if (this.persona.flirt >= 4) chance += DARE_FLIRT;
    if (this.persona.respect <= LOW_RESPECT) chance += DARE_DISRESPECTED;
    if (this.persona.respect >= HIGH_RESPECT) chance += DARE_RESPECTED;
    return this.random() >= 1 - Math.min(DARE_MAX, Math.max(0, chance)) ? piece : null;
  }

  /** You let a guest have a piece of your clothing. */
  private loseClothing(): void {
    this.stripped++;
    this.cue("tip");
  }

  /** What guests can know and notice about the player, for choosing what they say. */
  banterContext(kind: GuestKind, guest?: Guest, role?: GuestRole, stats?: RoleStats): BanterContext {
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
      role: guest?.role ?? role,
      stats: guest?.stats ?? stats,
      mood: guest && feltMood(guest),
      lust: guest?.lust,
      desires: guest?.desires,
      stripped: this.stripped,
    };
  }

  /** You took a drink with a guest. */
  private takeDrink(): void {
    this.drunk = Math.min(DRUNK_MAX, this.drunk + DRINK_STRENGTH * (1 - Math.min(0.9, this.effects.drunkRate)));
    this.shift({ drinks: 1, fame: 1, respect: this.drunk >= SLOPPY_DRUNK ? -1 : 0 });
    this.raiseAll(DRINK_DESIRE + this.effects.drinkMeters);
    this.spendWill(DRINK_WILL);
    this.drinksTonight++;
    this.cue("drink");
  }

  /** Whether a conversation is open: with a party at their table, or with a guest who tipped you a drink. */
  get inConversation(): boolean {
    return this.talkingTo !== null || this.tipChat !== null || this.touchChat !== null;
  }

  /** Her lewdness: worked out from her passives and records, never raised directly. */
  get lewdness(): number {
    const total = Object.values(this.touchMemory.lets).reduce((sum, n) => sum + (n ?? 0), 0);
    return lewdnessOf(this.passives, total, this.records);
  }

  /** Her desire for a kind of touch in the moment, 0 to 10: its meter, and whatever her passives take off. */
  desireFor(region: TouchRegion): number {
    const skill = bodySkillBonus(this.level(SKILL_OF_REGION[region])).ease;
    return Math.min(10, (this.meters[METER_OF[region]] + (this.effects.ease[region] ?? 0) + skill) / 10);
  }

  /** Whether she's restless enough at bedtime to ease the ache herself. */
  get restless(): boolean {
    return this.phase === "bedtime" && this.playerBody === "Female" && Math.max(...METERS.map((m) => this.meters[m])) >= RESTLESS_AT;
  }

  /** The 18+ moment waiting to be shown, once. */
  takeAdultScene(): AdultScene | null {
    const scene = this.adultScene;
    this.adultScene = null;
    return scene;
  }

  /** What she can do upstairs: everything she's warm enough for. A kiss is always there. */
  upstairsChoices(): { act: UpstairsAct; label: string; ready: boolean }[] {
    return UPSTAIRS_ACTS.map((act) => ({
      act,
      label: UPSTAIRS[act].label,
      ready: this.meters[UPSTAIRS[act].meter] >= UPSTAIRS[act].need && (!UPSTAIRS[act].wet || this.wet),
    }));
  }

  /** Wet: pleasure enough, sooner the higher her Pussy desire (desire.ts). */
  get wet(): boolean {
    return wet(this.meters.pussy, this.pleasure);
  }

  /**
   * She takes the guest upstairs. The bar runs on without her meanwhile, and everyone still waiting gets
   * shorter of patience; the guest pays well, and goes back down besotted.
   */
  goUpstairs(scene: Extract<AdultScene, { kind: "upstairs" }>, act: UpstairsAct): string {
    const def = UPSTAIRS[act];
    const r = this.records;
    r.invitations++;
    r.acts[act] = (r.acts[act] ?? 0) + 1;
    if (!r.upstairsKinds.includes(scene.guestKind)) r.upstairsKinds.push(scene.guestKind);
    const gold = Math.round(def.gold * (1 + this.effects.upstairsGold + actSkillBonus(this.level(ACT_SKILL_OF[act]))));
    this.gainXp(ACT_SKILL_OF[act], UPSTAIRS_XP);
    this.gainXp("charm", 3);
    this.adjust(gold, 0, this.effects.upstairsHeat);
    this.earned += gold;
    this.shift({ fame: 2, respect: -1, flirt: 1 });
    this.raise(def.meter, 20);
    for (const guest of this.guests) {
      if (guest.id === scene.guestId) guest.mood = "idolize";
      else if (guest.status === "waiting" || guest.status === "arriving") guest.patience = Math.max(1, guest.patience - guest.maxPatience * UPSTAIRS_PATIENCE);
    }
    this.say(`+${gold} gold. The bar waited for you, not happily.`);
    const where = UPSTAIRS_CUM[act];
    if (where) {
      const ml = loadOf(scene.guestKind, this.random, scene.guestStats);
      this.addCum({ [where]: ml }, 1);
      this.say(`The ${(scene.guestStats?.label ?? scene.guestKind).toLowerCase()} finishes ${CUM_WHERE[where]}. +${ml} ml.`);
    }
    this.cue("tip");
    return def.line;
  }

  /** Loads into her records, by where they landed. */
  private addCum(cum: Partial<Record<CumSpot, number>>, loads: number): void {
    const r = this.records;
    for (const [spot, ml] of Object.entries(cum)) {
      r.cum[spot as CumSpot] = (r.cum[spot as CumSpot] ?? 0) + (ml ?? 0);
      this.coated[spot as CumSpot] = (this.coated[spot as CumSpot] ?? 0) + (ml ?? 0);
    }
    r.loads += loads;
  }

  /** Whether anything men left is still on her. */
  get messy(): boolean {
    return Object.values(this.coatStages).some((stage) => stage > 0);
  }

  /**
   * She climbs into the bath in her room and scrubs it all off. Her records keep every load; only what shows on
   * her goes. Morning washes it off too, if she never gets to the bath.
   */
  bathe(): void {
    this.coated = {};
    this.endedTest = null;
    this.cue("refill");
    this.say("You sink into the hot bath and scrub yourself clean, then dry off and dress again.");
  }

  /** How much shows on each part of her tonight, by stage: 0 is clean. A duel going on shows as it happens. */
  get coatStages(): Record<CoatSection, number> {
    const duel = (this.duel ?? this.endedTest)?.cum;
    if (!duel) return coatStages(this.coated);
    const both: Partial<Record<CumSpot, number>> = { ...this.coated };
    for (const [spot, ml] of Object.entries(duel)) both[spot as CumSpot] = (both[spot as CumSpot] ?? 0) + (ml ?? 0);
    return coatStages(both);
  }

  /** She eases the ache herself before she sleeps. Her meters settle, and she sleeps easy. */
  easeAche(): void {
    if (!this.restless) return;
    this.records.alone++;
    this.eased = true;
    Object.assign(this.meters, emptyMeters());
    this.pleasure = 0;
  }

  /** Tonight's desire goes up on one meter, faster with passives that make it so. */
  private raise(meter: Meter, n: number): void {
    const gain = n > 0 ? n * (1 + this.effects.sens[meter]) : n;
    const prev = this.meters[meter];
    this.meters[meter] = clamp(this.meters[meter] + gain, 0, METER_MAX);
    this.peak[meter] = Math.max(this.peak[meter], this.meters[meter]);
    const delta = this.meters[meter] - prev;
    if (delta >= 1) {
      const name = METER_NAMES[meter];
      this.say(wildSensitivity(name, delta, this.corruption, this.lewdness, this.houseMode.current === "brothel"));
      // Both true now (desire.ts): from 50 it gets in her way in a brawl, from 80 twice as much.
      if (this.meters[meter] >= DESIRE_STRONG && prev < DESIRE_STRONG)
        this.say(`${name} desire is getting strong: bolder touches there are on the table, and it'll get in your way in a brawl`);
      if (this.meters[meter] >= HORNY_AT && prev < HORNY_AT) this.say(`${name} desire is burning. You're horny.`);
    }
  }

  private raiseAll(n: number): void {
    if (n === 0) return;
    for (const meter of METERS) this.raise(meter, n);
  }

  /** Changes her reputation, and with greed, cold choices and secrets sold or told, her corruption. */
  private shift(change: Partial<Persona> = {}): void {
    shiftPersona(this.persona, change);
    const gain =
      Math.max(0, change.greed ?? 0) * CORRUPT_PER_GREED +
      Math.max(0, change.sold ?? 0) * CORRUPT_PER_SOLD +
      Math.max(0, change.informed ?? 0) * CORRUPT_PER_INFORM +
      Math.max(0, -(change.kindness ?? 0)) * CORRUPT_PER_COLD;
    this.corruption = Math.min(1000, this.corruption + gain);
    if (gain > 0) {
      const tag = this.corruption >= 150 ? " (rotten)" : this.corruption >= 80 ? " (crooked)" : "";
      this.say(`Corruption +${Math.round(gain)}${tag}`);
    }
    this.unlockBrothel();
  }

  /**
   * Opens the brothel once she's lewd enough or corrupt enough. Checked whenever either can rise: as corruption
   * shifts, and as passives are earned (her lewdness is worked out from her passives and records). Quiet when a
   * save is loaded, so she isn't told again.
   */
  private unlockBrothel(quiet = false): void {
    if (this.houseMode.unlocked.has("brothel")) return;
    if (this.lewdness < BROTHEL_AT_LEWDNESS && this.corruption < BROTHEL_AT_CORRUPTION) return;
    this.houseMode.unlocked.add("brothel");
    this.houseMode.brothel = 1;
    if (!quiet) this.say("The house can now become a brothel.");
  }

  /** What passives read about her right now. */
  passiveFacts(): PassiveFacts {
    return {
      records: this.records,
      lets: this.touchMemory.lets,
      drinks: this.persona.drinks,
      sold: this.persona.sold,
      informed: this.persona.informed,
      protected: this.persona.protected,
      fame: this.persona.fame,
      trust: this.trust,
      trustMax: TRUST_MAX,
      lewdness: this.lewdness,
      corruption: this.corruption,
      levels: this.statLevels(),
      herLevel: this.herLevel,
      slutLevel: this.slutLevel,
    };
  }

  /** A stat's or skill's level: what experience has reached, and what passives add. */
  level(id: StatId | SkillId): number {
    return levelOf(this.xp[id] ?? 0) + (this.effects.skill[id] ?? 0);
  }

  statLevels(): Record<StatId, number> {
    return Object.fromEntries(STATS.map((s) => [s.id, this.level(s.id)])) as Record<StatId, number>;
  }

  /** Her willpower at the top: from Mind, and composure passives. */
  get maxWillpower(): number {
    return maxWillpower(this.level("mind"), this.effects.willMax + (this.herLevel - 1) * LEVEL_WILL);
  }

  /** Her willpower now, 0 up to the top. Full every morning. */
  get willpower(): number {
    const max = this.maxWillpower;
    return Math.max(0, Math.min(max, max - this.willSpent));
  }

  /** Spends willpower, never below none. */
  private spendWill(n: number): void {
    this.willSpent = Math.min(this.maxWillpower, this.willSpent + Math.max(0, n));
  }

  /** Gives willpower back, never past the top. */
  private restoreWill(n: number): void {
    this.willSpent = Math.max(0, this.willSpent - Math.max(0, n));
  }

  /** After a brawl or a duel: she has what it left her with. */
  private settleWill(left: number): void {
    this.willSpent = Math.max(0, this.maxWillpower - left);
  }

  private gainXp(id: StatId | SkillId, n: number): void {
    if (n <= 0) return;
    const before = levelOf(this.xp[id] ?? 0);
    this.xp[id] = (this.xp[id] ?? 0) + n;
    const after = levelOf(this.xp[id]);
    // A new level: the game shows it, so the player knows what practice has done for her.
    if (after > before) this.gains.push({ kind: "level", id, name: nameOfSkill(id), level: this.level(id) });
  }

  /**
   * Level ups, kink changes, and her Level or Slut Level going up, since the game last asked. Reading them empties
   * the queue.
   */
  takeGains(): Gain[] {
    const level = this.herLevel;
    if (level > this.shownLevel) this.gains.push({ kind: "rank", which: "level", level });
    const slut = this.slutLevel;
    if (slut > this.shownSlut) this.gains.push({ kind: "rank", which: "slut", level: slut, word: lewdWord(this.lewdness) });
    this.shownLevel = level;
    this.shownSlut = slut;
    return this.gains.splice(0);
  }

  /** What her passives add up to, with the titles she's wearing on top. */
  private refreshEffects(): void {
    const e = effectsOf(this.passives);
    for (const id of this.worn) TITLE_BY_ID.get(id)?.wear(e);
    this.effects = e;
  }

  /** How many titles she can wear at once. */
  get titleSlots(): number {
    return this.persona.fame >= TWO_SLOTS_FAME ? 2 : 1;
  }

  /** Titles are changed while the tavern's shut, never in the middle of a night's service. */
  get canChangeTitles(): boolean {
    return this.phase !== "service" && this.phase !== "lastcall" && this.fight === null;
  }

  /** Puts a title on: into a free slot, or in place of the one worn longest if every slot's taken. */
  wearTitle(id: string): boolean {
    if (!this.canChangeTitles || !this.titles.has(id) || this.worn.includes(id)) return false;
    if (this.worn.length >= this.titleSlots) this.worn.shift();
    this.worn.push(id);
    this.refreshEffects();
    return true;
  }

  /** Takes a title off, leaving the slot empty. */
  takeOffTitle(id: string): boolean {
    if (!this.canChangeTitles || !this.worn.includes(id)) return false;
    this.worn = this.worn.filter((w) => w !== id);
    this.refreshEffects();
    return true;
  }

  /** Her Level: 1, and one more for every few levels her stats and skills have gained between them. */
  get herLevel(): number {
    const ids = [...STATS.map((s) => s.id), ...BODY_SKILLS.map((s) => s.id), ...ACT_SKILLS.map((s) => s.id)];
    const gained = ids.reduce((sum, id) => sum + (this.level(id) - 1), 0);
    return 1 + Math.floor(gained / LEVELS_PER_LEVEL);
  }

  /** Her Slut Level, Karryn's: her lewdness by tens. */
  get slutLevel(): number {
    return Math.floor(this.lewdness / LEWDNESS_PER_SLUT_LEVEL);
  }

  /** What her Level adds to her stamina in a brawl. */
  get levelStamina(): number {
    return (this.herLevel - 1) * LEVEL_STAMINA;
  }

  /** How long a ready stew keeps before it burns: longer with Never Burns. */
  private get burnTime(): number {
    return BURN_TIME * (1 + this.effects.burnGrace);
  }

  /** Willpower it costs to say no to a touch part of her wants: less with Firm No and Ice Queen. */
  private refuseWill(tier: number, boldness: number): number {
    const cost = refuseCost(tier, boldness);
    return cost === 0 ? 0 : Math.max(1, Math.round(cost * Math.max(0, 1 - this.effects.refuseEase)));
  }

  /** A brawl with nobody in the room, from the B key in development, to try the fight screen. */
  startTestFight(): void {
    if (this.fight) return;
    const kind = GUEST_KIND_LIST[Math.floor(this.random() * GUEST_KIND_LIST.length) % GUEST_KIND_LIST.length];
    const roster = ROLES_OF[kind];
    this.fight = new Fight(-1, kind, false, this.fighterStats(), this.random, rollStats(roster[Math.floor(this.random() * roster.length) % roster.length], this.rollRandom));
  }

  /** Trouble starts brewing at a guest's table: they shout something hateful, and the room hears it. */
  private brewTrouble(guest: Guest): void {
    const drunk = guest.mood === "drunk";
    const shouts = TROUBLE_SHOUTS[drunk ? "drunk" : "angry"];
    const shout = shouts[Math.floor(this.random() * shouts.length) % shouts.length];
    this.trouble = { guestId: guest.id, stage: "brewing", timer: TROUBLE_BREWING, shout, arrived: false, waiting: guest.status === "waiting" };
    const name = this.nameOf(guest).toLowerCase();
    this.say(drunk ? `The ${name} knocks a cup flying and starts shouting at you.` : `The ${name} slams a fist on the table and glares at you.`);
    this.say(`${this.nameOf(guest)}: "${shout}"`);
    this.cue("smashOne");
  }

  /** The game says the guest coming for her has reached her. */
  troubleArrived(guestId: number): void {
    if (this.trouble?.guestId === guestId && this.trouble.stage === "coming") this.trouble.arrived = true;
  }

  /**
   * Trouble boiling over: it brews, then they come for her, then the brawl. Serving them while it brews can
   * settle them; it all blows over if they leave, or the night ends first. She's never pulled out of a
   * conversation for it: they wait until she's done.
   */
  private updateTrouble(dt: number): void {
    const trouble = this.trouble;
    if (!trouble) return;
    const guest = this.guests.find((g) => g.id === trouble.guestId);
    if (!guest || guest.status === "leaving" || guest.status === "arriving" || this.phase !== "service" || this.fight) {
      this.trouble = null;
      return;
    }
    const name = this.nameOf(guest).toLowerCase();
    if (trouble.stage === "brewing") {
      if (trouble.waiting && guest.status === "eating") {
        this.trouble = null;
        guest.mood = "calm";
        this.say(`The ${name} grumbles, but takes the ${guest.order} and stays put.`);
        return;
      }
      trouble.timer -= dt;
      if (trouble.timer <= 0) {
        trouble.stage = "coming";
        trouble.timer = TROUBLE_COMING;
        this.say(`The ${name} kicks the chair back and comes for you!`);
        this.cue("drop");
      }
      return;
    }
    trouble.timer -= dt;
    if ((trouble.arrived || trouble.timer <= 0) && !this.inConversation) this.startFight(guest.id);
  }

  /** Starts a brawl with a guest. Whoever's playing deals with it. */
  startFight(guestId: number): void {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest || this.fight) return;
    this.trouble = null;
    // Came in worked up: now and then they'll reach for her mid-fight, and she's asked on the touch screen.
    const female = this.playerBody === "Female";
    const workedUp = female && guest.lust >= STRONG_LUST;
    // Her desire comes into the fight with her (desire.ts): it gets in her way, their grapples stir it, and her
    // Cock desire opens up what she can do with her hands and mouth.
    const desire = female ? { desire: { ...this.meters }, sens: { ...this.effects.sens }, pleasure: this.pleasure, prefers: guest.stats.prefers } : {};
    this.fight = new Fight(guest.id, guest.kind, guest.mood === "drunk", { ...this.fighterStats(), workedUp, ...desire }, this.random, guest.stats);
    this.fightsTonight++;
    this.say(`Brawl! The ${this.nameOf(guest).toLowerCase()} is right in your face.`);
    this.cue("walkOut");
  }

  /** Her side of a brawl: her levels, what her passives add, and the willpower she has left. */
  private fighterStats(): FighterStats {
    const e = this.effects;
    return {
      levels: this.statLevels(),
      damage: e.fightDamage,
      dodge: e.fightDodge,
      talk: e.fightTalk,
      stare: e.fightStare,
      will: this.willpower,
      maxWill: this.maxWillpower,
      grappleHit: e.grappleHit,
      grappleGuard: e.grappleGuard,
      heldEase: e.heldEase,
      brawlSlap: e.brawlSlap,
      brawlReach: e.brawlReach,
      fightDesire: e.fightDesire,
      extraStamina: this.levelStamina,
    };
  }

  /** She makes a move in the brawl; when it's over, the room sees how it went. */
  fightMove(move: FightMove): void {
    const fight = this.fight;
    if (!fight) return;
    fight.act(move);
    if (fight.reaching) this.brawlReach(fight);
    if (fight.outcome) this.finishFight(fight);
  }

  /**
   * A worked-up foe reaches for her mid-brawl: the fight waits, and she's asked on the usual touch screen, every
   * answer there (Pull away included). If there's nothing to ask about, she just twists clear.
   */
  private brawlReach(fight: Fight): void {
    const guest = this.guests.find((g) => g.id === fight.guestId);
    // What she has left after the blows so far is what she answers with.
    this.settleWill(fight.will);
    this.settleDesire(fight);
    if (!guest || !this.maybeReach(guest, true)) fight.afterReach("pull", this.willpower);
  }

  /** She comes out of the fight (or into the touch screen mid-fight) with the desire and pleasure it left her. */
  private settleDesire(fight: Fight): void {
    if (!fight.desire) return;
    for (const m of METERS) {
      this.meters[m] = clamp(fight.desire[m], 0, METER_MAX);
      this.peak[m] = Math.max(this.peak[m], this.meters[m]);
    }
    this.pleasure = fight.pleasure;
  }

  private finishFight(fight: Fight): void {
    this.settleWill(fight.will);
    this.settleDesire(fight);
    // What she did with her hands and mouth counts like it would upstairs (riding them, like the bed).
    for (const [move, n] of Object.entries(fight.acts)) {
      const act: UpstairsAct = move === "ride" ? "bed" : (move as UpstairsAct);
      this.records.acts[act] = (this.records.acts[act] ?? 0) + (n ?? 0);
      if (fight.desire) this.gainXp(ACT_SKILL_OF[act], UPSTAIRS_XP * (n ?? 0));
    }
    for (const [stat, n] of Object.entries(fight.xp)) this.gainXp(stat as StatId, n ?? 0);
    this.gainXp("endurance", 3);
    const r = this.records;
    r.dodges += fight.dodges;
    r.grapplesLanded += fight.grapplesLanded;
    r.grapplesTaken += fight.grapplesTaken;
    r.timesHeld += fight.timesHeld;
    const guest = this.guests.find((g) => g.id === fight.guestId);
    let text: string;
    if (fight.outcome === "won" && fight.spent) {
      // Worn out by her hands, mouth or the rest: the room talks about it, if not with respect.
      r.fightsWon++;
      if (guest) {
        guest.mood = "idolize";
        this.sendOff(guest);
      }
      this.shift({ fame: 3, flirt: 1, respect: -1 });
      text = "Spent. They stagger out grinning, and the room won't stop talking about it.";
    } else if (fight.outcome === "won") {
      r.fightsWon++;
      if (guest) this.sendOff(guest);
      this.shift({ respect: 2, fame: 3 });
      // Throwing out one of the baron's men gets back to him.
      this.adjust(0, 0, fight.kind === "soldier" ? 1 : 0);
      text = fight.kind === "soldier" ? "Thrown out. The room cheers, but the baron will hear of it. (+1 heat)" : "Thrown out. The room cheers.";
    } else if (fight.outcome === "talked") {
      r.talkedDown++;
      if (guest) guest.mood = "calm";
      // Sober, and talked round rather than beaten: they might linger after closing and ask for a game.
      if (guest && !fight.drunk) this.peacemade.push({ kind: guest.kind, stats: guest.stats });
      this.shift({ respect: 1 });
      this.adjust(0, 1, 0);
      text = "Talked down. They're back in their seat, and the village likes a peacemaker. (+1 trust)";
    } else {
      r.fightsLost++;
      const taken = Math.min(this.gold, LOST_FIGHT_GOLD + this.nightIndex * 2);
      this.adjust(-taken, 0, 0);
      if (guest) this.sendOff(guest);
      this.shift({ respect: -2 });
      text = `Knocked down. They grab ${taken} gold from the till.`;
      // The one who won asks her. Hers to answer; the night ends either way (see BrawlOffer).
      if (guest && this.playerBody === "Female") this.brawlOffer = { kind: guest.kind, stats: guest.stats, drunk: fight.drunk };
    }
    this.lastFight = { outcome: fight.outcome!, text };
    this.say(text);
    this.fight = null;
  }

  /** How the last brawl ended, once. */
  takeFightResult(): { outcome: FightOutcome; text: string } | null {
    const result = this.lastFight;
    this.lastFight = null;
    return result;
  }

  // ---------- After hours ----------

  /**
   * After closing, a guest she warmed to tonight might linger and ask for an after-hours game: only if she's let
   * someone sober touch her tonight, she's lewd enough to be asked, and she hasn't played tonight already.
   */
  duelOffer(): GuestKind | null {
    if (this.duel) return null;
    // The winner of a brawl she lost asks at once, whatever the hour.
    if (this.brawlOffer) return this.brawlOffer.kind;
    if (this.phase !== "bedtime" || this.playerBody !== "Female" || this.duelTonight) return null;
    if (this.lewdness < INVITES_AT && !this.passives.has("upstairsCurious")) return null;
    return this.duelPartner()?.kind ?? null;
  }

  /** Who's asking at bedtime: someone she let touch her tonight, or else someone she talked out of a brawl. */
  private duelPartner(): { kind: GuestKind; stats: RoleStats } | null {
    return this.admirers[this.admirers.length - 1] ?? this.peacemade[this.peacemade.length - 1] ?? null;
  }

  /** Why tonight's offer is being made: "brawl" after a loss, "talked" by someone she talked down, else "admirer". */
  get duelOfferFrom(): "brawl" | "talked" | "admirer" | null {
    if (!this.duelOffer()) return null;
    if (this.brawlOffer) return "brawl";
    return this.admirers.length === 0 && this.peacemade.length > 0 ? "talked" : "admirer";
  }

  /** Why she can't say yes tonight, if she can't: too much to drink, on her side or theirs. */
  get duelBlocked(): string | null {
    if (this.drunk >= SLOPPY_DRUNK) return "You've had too much to drink to play tonight.";
    if (this.brawlOffer?.drunk) return "They're too drunk to know what they're doing.";
    return null;
  }

  /**
   * She says no to the brawl winner. That's the end of it: they go, and so does the night, with nothing lost
   * past what the fight already cost.
   */
  declineBrawlOffer(): void {
    if (!this.brawlOffer) return;
    this.brawlOffer = null;
    this.say("You send them off. Nothing more comes of it.");
    this.closeEarly();
  }

  /**
   * After a brawl she lost, the night is over: everyone goes, nobody else comes in, and it's straight to bed (no
   * last call). `sleep` works from here.
   */
  private closeEarly(): void {
    if (this.phase !== "service") return;
    for (const guest of this.guests) if (guest.status !== "leaving") this.sendOff(guest);
    this.trouble = null;
    this.talkingTo = null;
    this.tipChat = null;
    this.touchChat = null;
    this.nextArrival = this.plan.guests.length;
    this.phase = "bedtime";
    this.eased = false;
    this.say("The room empties out early. You bar the door and call it a night.");
  }

  /** Each part of her she could put in play, and whether she's warm enough there tonight. */
  duelAreas(): { id: DuelArea; name: string; ready: boolean; have: number; need: number; meter: string }[] {
    return DUEL_AREAS.map((a) => ({ id: a.id, name: a.name, ready: this.meters[a.meter] >= a.need, have: Math.floor(this.meters[a.meter]), need: a.need, meter: METER_NAMES[a.meter] }));
  }

  /** The stakes she can choose from: what she can afford. */
  duelStakes(): number[] {
    return DUEL_STAKES.filter((n) => n <= this.gold);
  }

  /** She says yes, on her rules: only parts she's warm enough for, and a stake she can pay. */
  startDuel(areas: readonly DuelArea[], stake: number, scene: RolePlay = "plain"): boolean {
    const kind = this.duelOffer();
    if (!kind || this.duelBlocked) return false;
    const ready = new Set(this.duelAreas().filter((a) => a.ready).map((a) => a.id));
    if (areas.some((a) => !ready.has(a)) || stake < 0 || stake > this.gold) return false;
    if (!this.rolePlays().some((p) => p.id === scene && p.ready)) return false;
    this.duelTonight = true;
    const stats = this.brawlOffer?.stats ?? this.duelPartner()?.stats;
    this.brawlDuel = this.brawlOffer !== null;
    this.brawlOffer = null;
    this.duel = new Duel(kind, new Set(areas), stake, this.duelistStats(), this.random, [{ kind, female: false, stats }], scene);
    return true;
  }

  /** The role-plays she could choose, and whether she's ready for each: the bolder ones need a passive first. */
  rolePlays(): { id: RolePlay; name: string; about: string; ready: boolean; needs: string | null }[] {
    return ROLE_PLAYS.map((p) => ({
      id: p.id,
      name: p.name,
      about: p.about,
      ready: !p.needs || this.passives.has(p.needs),
      needs: p.needs ? (PASSIVE_BY_ID.get(p.needs)?.name ?? p.needs) : null,
    }));
  }

  /** Her side of a duel: her levels, and what her passives add. */
  private duelistStats(): DuelistStats {
    const e = this.effects;
    return {
      level: (id) => this.level(id),
      sens: e.sens,
      power: e.duelPower,
      resist: e.duelResist,
      stamina: e.duelStamina,
      hold: e.duelHold,
      edge: e.duelEdge,
      undress: e.duelUndress,
      will: this.willpower,
      maxWill: this.maxWillpower,
    };
  }

  /**
   * For testing (the P key, in development only): starts an after-hours game at once, any time, with whoever and
   * whatever's in play, and both sides starting where the test says. No checks, and nothing is counted or paid.
   */
  startTestDuel(test: DuelTest): void {
    const partners = test.partners.length > 0 ? test.partners : [{ kind: "fugitive" as GuestKind, female: false, pleasure: 0, stamina: null }];
    const duel = new Duel(partners[0].kind, new Set(test.areas), test.stake, this.duelistStats(), this.random, partners, test.scene);
    duel.partners.forEach((p, i) => applyTestPartner(p, partners[i]));
    const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));
    duel.pleasure = clamp(test.pleasure, 99);
    duel.stamina = test.stamina === null ? duel.maxStamina : clamp(test.stamina, duel.maxStamina);
    duel.undressed = clamp(test.undressed, 2);
    duel.note("(Test fight: nothing here counts.)");
    this.duel = duel;
    this.testDuel = true;
  }

  /** Whether the duel going on is a test one. */
  get testing(): boolean {
    return this.testDuel && this.duel !== null;
  }

  /** She makes a move; when it's over, it's settled. */
  duelMove(move: DuelMove, target?: number): void {
    const duel = this.duel;
    if (!duel) return;
    duel.act(move, target);
    if (duel.outcome) this.finishDuel(duel);
  }

  private finishDuel(duel: Duel): void {
    if (this.testDuel) {
      this.testDuel = false;
      const how = duel.outcome === "won" ? "You won" : duel.outcome === "lost" ? "You lost" : "You called it off";
      this.endedTest = duel;
      this.lastDuel = { outcome: duel.outcome!, text: `${how}. (Test fight: nothing counted.)`, line: "", gold: 0, test: true };
      this.duel = null;
      return;
    }
    this.settleWill(duel.will);
    const r = this.records;
    for (const [id, n] of Object.entries(duel.xp)) this.gainXp(id as StatId | SkillId, n ?? 0);
    for (const [move, n] of Object.entries(duel.used)) r.duelMoves[move as DuelMove] = (r.duelMoves[move as DuelMove] ?? 0) + (n ?? 0);
    r.heldBack += duel.heldBack;
    r.undressed += duel.undressed;
    this.undressedTonight = Math.max(this.undressedTonight, duel.undressed);
    this.addCum(duel.cum, duel.loads);
    for (const [meter, n] of Object.entries(duel.meterGains)) this.raise(meter as Meter, n ?? 0);
    let text: string;
    let line: string;
    let change = 0;
    if (duel.outcome === "won") {
      r.duelsWon++;
      if (duel.wonOnEdge) r.edgeWins++;
      if (duel.heldBack === 0) r.boldWins++;
      const gold = Math.round(duel.stake * (1 + this.effects.duelGold));
      change = gold;
      this.adjust(gold, 0, 0);
      this.earned += gold;
      this.shift({ fame: 2, flirt: 1 });
      text = `You won the game. +${gold} gold.`;
      line = "They give in first. You win, and the candle burns down on the two of you.";
    } else if (duel.outcome === "lost") {
      r.duelsLost++;
      r.overwhelmed++;
      const paid = Math.min(this.gold, duel.stake);
      change = -paid;
      this.adjust(-paid, 0, 0);
      this.shift({ fame: 1, flirt: 1 });
      text = `You lost the game. -${paid} gold.`;
      line = "It's too much, and you go first. Neither of you minds losing much.";
    } else {
      r.duelsStopped++;
      text = "You called it off. Nothing lost; they kiss your hand goodnight and go.";
      line = "";
    }
    // Played to the end, she's spent, and sleeps easy.
    if (duel.outcome !== "stopped") {
      Object.assign(this.meters, emptyMeters());
      this.pleasure = 0;
    }
    const ml = Object.values(duel.cum).reduce((n, v) => n + (v ?? 0), 0);
    if (ml > 0) text += ` ${duel.loads === 1 ? "One load" : `${duel.loads} loads`}, ${ml} ml of cum.`;
    const brawl = this.brawlDuel;
    this.lastDuel = { outcome: duel.outcome!, text, line, gold: change, brawl };
    this.say(text);
    this.duel = null;
    // The game after a lost brawl: played out or called off, the night ends with it.
    if (brawl) {
      this.brawlDuel = false;
      this.closeEarly();
    }
  }

  /** How the last after-hours game ended, once. */
  takeDuelResult(): { outcome: DuelOutcome; text: string; line: string; gold: number; test?: boolean; brawl?: boolean } | null {
    const result = this.lastDuel;
    this.lastDuel = null;
    this.endedTest = null;
    return result;
  }

  /** The nerve her passives and her name give every guest: the lewder she's known to be, the bolder they get. */
  private get nerveBonus(): number {
    const lewd = this.lewdness;
    return this.effects.nerve + (lewd >= 60 ? 2 : lewd >= 30 ? 1 : 0) + mindBonus(this.level("mind")).nerve;
  }

  /** The touch just answered, once: the game plays it out in a comic panel. */
  takeTouchMoment(): TouchMoment | null {
    const moment = this.touchMoment;
    this.touchMoment = null;
    return moment;
  }

  /**
   * Whether the guest you've just served reaches for you, and if so, for what. Their nerve decides how bold
   * they'll be; your desire decides what you can let them do. Only the innkeeper sister is reached for, for now.
   */
  /**
   * `brawl`: a foe reaching mid-fight. The fight has already decided they reach, so there's no roll; it's never a
   * garment or an invitation upstairs, and it's always asked (the Eager guests setting doesn't cover a fight).
   * Returns whether there's a touch to answer.
   */
  private maybeReach(guest: Guest, brawl = false): boolean {
    if (this.playerBody !== "Female" || this.inConversation) return false;
    const history = this.touchHistory.get(guest.id) ?? { allowed: 0, slapped: false };
    const guestNerve = nerve({
      kind: guest.kind,
      stats: guest.stats,
      lust: guest.lust,
      mood: feltMood(guest),
      respect: this.persona.respect,
      lowRespect: LOW_RESPECT,
      highRespect: HIGH_RESPECT,
      ...history,
      bonus: this.nerveBonus,
      slapStops: this.effects.slapStops,
    });
    if (!brawl && this.random() >= reachChance(guestNerve) * Math.max(0, 1 + this.effects.reach)) return false;
    const piece = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped]?.label ?? null;
    // Mid-brawl, their hands go bolder, and for the part of her their type likes.
    const pull = { ...this.effects.pull };
    if (brawl) for (const region of REGIONS_OF_AREA[guest.stats.prefers] ?? []) pull[region] = (pull[region] ?? 0) + BRAWL_PREFER_PULL;
    const touch = pickTouch(guest.kind, brawl ? Math.min(10, guestNerve + BRAWL_BOLDER) : guestNerve, this.random, {
      canStrip: !brawl && piece !== null,
      seen: this.touchSeen,
      invites: !brawl && (this.lewdness >= INVITES_AT || this.passives.has("upstairsCurious")),
      pull,
      brawl,
    });
    if (!touch) return false;
    this.touchSeen.add(touch.id);

    const sloppy = this.drunk >= SLOPPY_DRUNK;
    const guestSloppy = guest.mood === "drunk";
    const desire = this.desireFor(touch.region);
    const leanMargin = Math.max(0, LEAN_MARGIN - this.effects.leanMargin / 10);
    const fill = (text: string) => fillPiece(text, piece);
    const tempted = thoughtTier(touch, desire, leanMargin);
    let thought = fill(touch.thoughts[tempted]);
    // Past "warming", flavorLine swaps in a body-specific line outright.
    thought = flavorLine(thought, this.corruption, this.lewdness, touch.region, true);
    if (sloppy) thought = TOO_DRUNK_TO_ALLOW;
    else if (guestSloppy) thought = GUEST_TOO_DRUNK;
    // Too drunk on either side, and it can't happen anyway: saying no takes nothing out of her.
    const tier = sloppy || guestSloppy ? 0 : tempted;
    const lines: TalkLine[] = [{ ...narrate(fill(touch.reach)), guestId: guest.id }, you(thought)];
    if (tier > 0 && this.willpower < this.refuseWill(tier, touch.level)) lines.push(narrate(WORN_THIN));
    const answers = touchAnswers(touch, { desire, sloppy, guestSloppy, leanMargin });
    // An impulsive guest, on a touch she could say yes to anyway: covered by the player's setting, or asked about.
    const s = this.touchSettings;
    // The same Consent switch covers a brawl: a foe who reaches mid-fight came in worked up, so counts as impulsive.
    const eager = brawl || impulsive(feltMood(guest), guestNerve);
    // Only ever a touch within their own nerve (GAME_PATH.MD), not the bolder reach a brawl stirs up.
    const covered = s.autoTouch && eager && touch.level <= guestNerve && autoTouchFits(s, touch, answers);
    // Consent off: weigh them against her. Worked out every time, so the dev panel can show it either way.
    const facts = this.impulseFacts(guest, guestNerve, touch);
    const check = impulseCheck(facts);
    this.lastImpulse = {
      guest: guest.stats.label ?? guest.kind,
      kind: guest.kind,
      prefers: guest.stats.prefers,
      touch: touch.id,
      region: touch.region,
      brawl,
      eager,
      covered,
      consentOff: s.autoTouch && s.agreed,
      facts,
      check,
      landed: false,
    };
    const chat: TouchChat = {
      guestId: guest.id,
      touch,
      lines,
      answers,
      answered: false,
      answer: null,
      tier,
      reply: [],
      offerAuto: covered && !s.agreed,
      impulse: false,
      brawl,
    };
    this.touchChat = chat;
    // Consent off, and they push past her hold: it lands without the question, as a yes she gave in advance.
    // If her hold stands, she's asked like any other time.
    const who = (guest.stats.label ?? guest.kind).toLowerCase();
    const talk = KINK_TALK[this.kink];
    if (covered && s.agreed && check.lands) {
      chat.lines = [{ ...narrate(fill(touch.reach)), guestId: guest.id }];
      chat.impulse = true;
      this.lastImpulse.landed = true;
      // Her sub side: giving in counts toward masochism, and her talk follows her kink from there.
      this.records.subWins++;
      this.answerTouch(chat, "allow");
      // The guest crows about it, then her sub talk: she gives in, in her own voice. Both in the log too, and both
      // in the style of her kink (kinktalk.ts).
      const crow = oneOf(talk.guestWin, this.random()).replaceAll("{guest}", who);
      const sub = oneOf(talk.sub, this.random()).replaceAll("{guest}", who);
      chat.reply.unshift(narrate(oneOf(IMPULSE_LINES, this.random())), this.guestSays(guest, crow), you(sub));
      this.say(`${this.nameOf(guest)}: "${crow}" You: ${sub} (push ${check.push} vs hold ${check.hold})`);
    } else if (covered && s.agreed) {
      // Dom talk: consent off, but their push fell short of her hold. She mocks them for trying, they're left
      // sheepish, and they have to ask after all. Both in the log too. Her dom side: it counts toward sadism.
      this.records.domWins++;
      const mock = oneOf(talk.dom, this.random()).replaceAll("{guest}", who);
      const sulk = oneOf(talk.guestFail, this.random()).replaceAll("{guest}", who);
      chat.lines.splice(1, 0, narrate(mock), this.guestSays(guest, sulk));
      this.say(`${mock} ${this.nameOf(guest)}: "${sulk}" (push ${check.push} vs hold ${check.hold})`);
    }
    return true;
  }

  /** Her kink, from her passives: how she (and the guest) talk after the Consent-off check (kinktalk.ts). */
  get kink(): Kink {
    return kinkOf(this.passives);
  }

  /** A guest saying something out loud in a conversation, under their own name, so the game shows them. */
  private guestSays(guest: Guest, text: string): TalkLine {
    return { speaker: this.nameOf(guest), text: `"${text}"`, guestId: guest.id };
  }

  /** Both sides of the Consent-off check for a touch: her desire, exposure, passives and practice; their nerve and taste. */
  impulseFacts(guest: Guest, guestNerve: number, touch: TouchDef): ImpulseFacts {
    const groups = GROUPS_OF_REGION[touch.region];
    const owned = [...this.passives].map((id) => PASSIVE_BY_ID.get(id)?.group);
    const preferred = DUEL_AREAS.find((a) => a.id === guest.stats.prefers)?.meter;
    return {
      level: touch.level,
      desire: Math.floor(this.meters[METER_OF[touch.region]]),
      exposed: this.strippedPieces.length,
      exhibition: owned.filter((g) => g === "exhibition").length,
      passives: owned.filter((g) => g !== undefined && groups.includes(g)).length,
      lets: this.touchMemory.lets[touch.region] ?? 0,
      skill: this.level(SKILL_OF_REGION[touch.region]),
      nerve: guestNerve,
      prefers: preferred === METER_OF[touch.region],
      strip: touch.strip === true,
      passiveHold: this.effects.hold + (this.effects.holdOf[touch.region] ?? 0),
    };
  }

  /** You answer a guest who reached for you. */
  private answerTouch(chat: TouchChat, answer: TouchAnswer): void {
    const { touch } = chat;
    const out = touchOutcome(touch, answer);
    const piece = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped]?.label ?? null;
    const fill = (text: string) => fillPiece(text, piece);
    chat.answered = true;
    chat.answer = answer;
    const guest = this.guests.find((g) => g.id === chat.guestId);
    const e = this.effects;
    // Letting it, leaning in or giving in: all three are her yes.
    const took = touchLands(answer);
    const r = this.records;
    // A reach mid-brawl, slapped away or let happen; a garment she kept on. Her answers, counted for her passives.
    if (chat.brawl && took) r.brawlLets++;
    if (chat.brawl && answer === "slap") r.brawlSlaps++;
    if (touch.strip && !took) r.clothesKept++;
    let gold = out.gold;
    let respect = out.respect;
    let fame = out.fame;
    let mood = out.mood;
    // Willpower: giving in wears it down; saying no costs it when part of her wanted it, and steadies her when not.
    const refusing = answer === "slap" || answer === "pull";
    const willCost = refusing ? this.refuseWill(chat.tier, touch.level) : 0;
    const shaky = refusing && willCost > 0 && this.willpower < willCost;
    if (took) this.spendWill(answer === "lean" ? LEAN_WILL : ALLOW_WILL);
    else if (refusing && willCost === 0) this.restoreWill(STEADY_WILL);
    else if (shaky) this.spendWill(this.willpower);
    else if (refusing) {
      this.spendWill(willCost);
      this.gainXp("mind", 1);
    }
    if (took) {
      const skill = SKILL_OF_REGION[touch.region];
      const practised = bodySkillBonus(this.level(skill));
      // Her Slut Level: guests pay more for what they've heard she'll allow.
      gold += (e.touchGold[touch.region] ?? 0) + (answer === "lean" ? e.leanGold : 0) + practised.gold + Math.floor(this.slutLevel / SLUT_LEVELS_PER_GOLD);
      this.gainXp(skill, answer === "lean" ? 3 : 2);
      this.gainXp("charm", 1);
      // Tonight's desire: the meter for where it landed most, the rest of her a little; more the more practised.
      const own = TOUCH_DESIRE * (answer === "lean" ? LEAN_DESIRE : 1) * (1 + practised.sens);
      const meter = METER_OF[touch.region];
      // A lap, a hand between her thighs, an invitation: she wants to be intimate too, as much as the part touched.
      const intimate = INTIMATE_REGIONS.has(touch.region);
      for (const m of METERS) this.raise(m, m === meter || (intimate && m === "cock") ? own : own / 3);
      // The intensity bar: a bold touch she said yes to tips a little more and warms her a little more.
      const intensity = intensityBonus(touch.level);
      gold += intensity.gold;
      this.raise(meter, own * intensity.meter);
      this.raiseAll(e.spill + (answer === "lean" ? e.leanMeters : 0));
      this.raise("pussy", e.spillPussy);
      if (ROUGH_TOUCHES.has(touch.id)) {
        r.rough++;
        this.raiseAll(e.roughMeters);
      }
      if (answer === "lean") r.leans++;
      const kinds = (r.kinds[touch.region] ??= []);
      if (guest && !kinds.includes(guest.kind)) kinds.push(guest.kind);
      this.pleasure += touch.level * PLEASURE_PER_LEVEL * (answer === "lean" ? LEAN_DESIRE : 1) * (1 + e.pleasure);
      if (this.pleasure >= 70 && this.pleasure < PLEASURE_MAX) this.say("You're getting close...");
      else if (this.pleasure >= PLEASURE_MAX - 10) this.say("So close—");
    } else if (answer === "slap") {
      r.slapped++;
      this.gainXp("mind", 1);
      this.gainXp("strength", 1);
      respect += e.slapRespect;
      fame += e.slapFame;
      this.raise("body", e.slapMeters);
      if (e.slapCalm) mood = null;
    } else {
      r.pulled++;
      this.gainXp("mind", 2);
      respect += e.pullRespect;
    }
    // Said no with nothing left to say it with: it's still no, but the room saw her waver.
    if (shaky) respect = Math.min(respect, 0);
    this.adjust(gold, 0, 0);
    this.earned += gold;
    this.shift({ respect, fame, flirt: out.flirt });
    if (guest && mood) guest.mood = mood;
    const history = this.touchHistory.get(chat.guestId) ?? { allowed: 0, slapped: false };

    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    this.touchesTonight.reached++;
    if (took) {
      history.allowed++;
      this.touchesTonight.allowed++;
      if (guest && guest.mood !== "drunk") this.admirers.push({ kind: guest.kind, stats: guest.stats });
      this.touchesTonight.boldest = Math.max(this.touchesTonight.boldest, touch.level);
      const before = this.touchMemory.lets[touch.region] ?? 0;
      this.touchMemory.lets[touch.region] = before + 1;
      const tip = gold > 0 ? ` (+${gold} gold)` : "";
      // Giving in has several lines per touch: one of them, picked at random.
      const givenInLines = answer === "givein" ? GIVE_IN_TEXTS[touch.id] : undefined;
      const givenIn = givenInLines?.length ? pick(givenInLines) : undefined;
      let line = fill(answer === "lean" ? touch.lean : givenIn ?? touch.allow);
      // Her giving in is its own beat, so its line stays; otherwise a far-gone mind speaks in the body's words.
      if (!givenIn) {
        line = mindStage(this.corruption, this.lewdness) >= 2
          ? bodyLine(touch.region, mindStage(this.corruption, this.lewdness), false)
          : flavorLine(line, this.corruption, this.lewdness, touch.region, false);
      }
      chat.reply = [narrate(line + tip)];
      const after = afterLine(touch.region, before);
      if (after) chat.reply.push(you(after.text));
      if (touch.strip) {
        this.loseClothing();
        this.say(this.stripped >= 2 ? "More clothes gone. You're really exposed." : "A piece comes off.");
      }
      else this.cue("tip");
      if (touch.region === "invite" && guest) {
        this.adultScene = { kind: "upstairs", guestId: guest.id, guestKind: guest.kind, guestStats: guest.stats };
      } else if (this.pleasure >= PLEASURE_MAX && !chat.brawl) {
        this.pleasure = 0;
        r.overwhelmed++;
        this.raiseAll(OVERWHELM_DESIRE + e.overwhelmBoost);
        chat.reply.push(narrate("It all comes over you at once, right there at the table. Your knees give. (18+)"));
        this.adultScene = { kind: "overwhelmed" };
      }
    } else {
      this.touchesTonight.refused++;
      if (answer === "slap") history.slapped = true;
      const { say, result } = pick(answer === "slap" ? SLAPS : PULLS);
      chat.reply = [you(say), narrate(result)];
      if (shaky) chat.reply.push(narrate(WAVERED));
    }
    this.touchHistory.set(chat.guestId, history);
    this.touchMoment = { id: touch.id, region: touch.region, level: touch.level, answer, kind: guest?.kind ?? "farmer" };
    // A reach mid-brawl: her answer goes back to the fight, with the willpower she has left after it.
    const fight = this.fight;
    if (chat.brawl && fight?.reaching) {
      // And the desire and pleasure the touch left her with.
      fight.setDesire(this.meters, this.pleasure);
      fight.afterReach(took ? "yes" : answer === "slap" ? "slap" : "pull", this.willpower);
      chat.reply.push(narrate(fight.log[fight.log.length - 1]));
      if (fight.outcome) this.finishFight(fight);
    }
  }

  /** Your answers to a guest reaching for you, then getting back to work once you've given one. */
  private touchOptions(chat: TouchChat): (TalkChoice & { run: () => void })[] {
    if (chat.answered) {
      const label = !chat.brawl ? "Get back to work" : this.fight ? "Back to the fight" : "See how it ended";
      return [{ label, disabled: false, run: () => (this.touchChat = null) }];
    }
    const cost = this.refuseWill(chat.tier, chat.touch.level);
    const willNote = (answer: TouchAnswer): string => {
      if ((answer !== "slap" && answer !== "pull") || cost === 0) return "";
      return this.willpower >= cost ? ` · ${cost} will` : " (no willpower left: it'll show)";
    };
    const options: (TalkChoice & { run: () => void })[] = chat.answers.map((answer) => ({
      label: answerLabel(chat.touch, answer) + willNote(answer),
      disabled: false,
      run: () => this.answerTouch(chat, answer),
    }));
    // The first impulsive guest: she's asked once whether guests like this may touch without asking from now on.
    // Every usual answer stays, Slap and Pull away included, and "Always ask me" keeps things as they are.
    if (chat.offerAuto) {
      const s = this.touchSettings;
      options.unshift(
        {
          label: `${answerLabel(chat.touch, "allow")}, and let eager guests skip asking (Consent off)`,
          disabled: false,
          run: () => {
            s.agreed = true;
            this.answerTouch(chat, "allow");
          },
        },
        {
          label: "Always ask me first",
          disabled: false,
          run: () => {
            s.autoTouch = false;
            chat.offerAuto = false;
            chat.reply = [narrate("Every guest will wait for your answer. (You can change this in Settings.)")];
          },
        },
      );
    }
    return options;
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
            this.shift(reply.persona);
            if ((reply.persona?.kindness ?? 0) > 0) this.shift({ respect: 1 });
            this.changeMood(chat.guestId, (mood) => moodAfterReply(mood, reply.persona?.flirt ?? 0, reply.persona?.kindness ?? 0));
            if (reply.strip) this.loseClothing();
            // You say your answer first, then what comes of it.
            const spoken = reply.say ?? (reply.label.startsWith("\"") ? reply.label : null);
            chat.reply = spoken ? [you(spoken), narrate(reply.result)] : [narrate(reply.result)];
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
              this.potTimer = this.burnTime;
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

    if (station === "shelf") return this.shelfAction(take);

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
      if (this.settlingIn) return { label: `Clean up before you open: ${messesLeftWords(this.messes)} left` };
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
    if (target.kind === "book") return { label: "Read your journal", run: () => undefined };
    if (target.kind === "bath") {
      if (this.duel) return null;
      return this.messy ? { label: "Bathe and wash yourself clean", run: () => this.bathe() } : { label: "You're clean" };
    }
    if (target.kind === "desk") {
      if (this.phase !== "day") return this.phase === "dusk" ? { label: "No time for plans now" } : null;
      // Dirty dishes and spills are tied to the seats they're at, so those have to go first.
      if (this.messes.some((mess) => mess.kind === "dishes" || mess.kind === "spill")) {
        return { label: "Clear the dishes and spills before changing the room" };
      }
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

  private stateOf(party: number): PartyState {
    let state = this.partyState.get(party);
    if (!state) {
      state = { drinks: 0, jug: false, dare: null };
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
        // By their type first ("Archer"), then their group ("Farmer").
        const byType = unmatched.findIndex((g) => lower.includes(this.nameOf(g).toLowerCase()));
        const index = Math.max(0, byType >= 0 ? byType : unmatched.findIndex((g) => lower.includes(SPEAKERS[g.kind].toLowerCase())));
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
      const name = opening.find((l) => l.guestId === moody.id)?.speaker ?? this.nameOf(moody);
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
    if (this.touchChat) return [...this.touchChat.lines, ...this.touchChat.reply];
    if (this.tipChat) return [...this.tipChat.lines, ...this.tipChat.reply];
    if (this.talkingTo === null) return [];
    return [...this.talkOpening, ...this.talkReply];
  }

  /** The guests in the conversation, so the game can show who's talking. */
  get talkGuests(): Guest[] {
    if (this.touchChat) {
      const id = this.touchChat.guestId;
      return this.guests.filter((g) => g.id === id);
    }
    if (this.tipChat) {
      const id = this.tipChat.guestId;
      return this.guests.filter((g) => g.id === id);
    }
    return this.talkingTo === null ? [] : this.partyGuests(this.talkingTo);
  }

  /** Just the latest reply, which is all that needs showing after you pick an option. */
  get talkReplyLines(): TalkLine[] {
    if (this.touchChat) return this.touchChat.reply;
    if (this.tipChat) return this.tipChat.reply;
    return this.talkReply;
  }

  get talkChoices(): TalkChoice[] {
    if (this.touchChat) return this.touchOptions(this.touchChat).map(({ label, disabled }) => ({ label, disabled }));
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

    const choices = [
      { label: drink, disabled: pouredOut || tooDrunk },
      { label: jug, disabled: state.jug || this.tapLeft === 0 },
    ];
    // Someone at the table is going for your clothes.
    if (state.dare) choices.push(...stripReplies(state.dare, this.stripped).map(({ label }) => ({ label, disabled: false })));
    choices.push({ label: "Get back to work", disabled: false });
    return choices;
  }

  /**
   * Picks an option in the conversation: 0 drinks with them, 1 sells them a jug, then, if someone's going for
   * your clothes, 2 lets them and 3 slaps their hand away. The last leaves the table.
   */
  chooseTalk(index: number): void {
    if (this.touchChat) {
      const option = this.touchOptions(this.touchChat)[index];
      if (option && !option.disabled) option.run();
      return;
    }
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
        if (members.some((g) => g.stats.trust > 0)) {
          this.adjust(0, 1, 0);
          this.talkReply.push(narrate("They like an innkeeper who drinks with them. (+1 trust)"));
        }
        if (members.some((g) => g.kind === "soldier")) {
          this.adjust(0, 0, -1);
          this.talkReply.push(narrate("The garrison will hear you're a friend. (-1 heat)"));
        }
        if (!this.heardRumor && members.some((g) => g.rumor)) {
          this.heardRumor = true;
          this.records.rumors++;
          this.gainXp("mind", 3);
          this.talkReply.push(narrate(`They let slip: ${this.plan.lastCall.rumor}`));
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
          this.cue("rumor");
        }
      } else {
        this.talkReply = [you("\"One more!\""), narrate("Another cup goes down, and the table cheers. The room has started to tilt.")];
      }
      // With drink in them, someone may go for your clothes: the boldest of them, if anyone's feeling it.
      const bold = members.find((g) => feltMood(g) === "lust") ?? members.find((g) => feltMood(g) === "drunk") ?? members[0];
      const dare = !state.dare && bold ? this.dare(bold) : null;
      if (dare) {
        state.dare = dare;
        this.talkReply.push(this.partySays(dare.dare));
      }
    } else if (index === 1) {
      const pay = JUG_PAY * members.length;
      state.jug = true;
      // A shared jug never goes round without some of it ending up on the floor.
      if (members[0]) this.spiltAt.add(members[0].seat);
      this.gold += pay;
      this.earned += pay;
      // A jug on the table keeps them happy while they wait for their food.
      for (const guest of members) {
        guest.patience = guest.maxPatience;
        guest.mood = "drunk";
      }
      this.talkReply = [you("\"A jug for the table? It'll keep you going till the food comes.\""), narrate(`You set a jug on the table. They pay ${pay} gold and stop watching the kitchen.`)];
      this.say(`+${pay} gold for a jug of ale.`);
    } else if (state.dare && (index === 2 || index === 3)) {
      const reply = stripReplies(state.dare, this.stripped)[index - 2];
      state.dare = null;
      this.adjust(reply.gold, reply.trust, reply.heat);
      this.earned += reply.gold;
      this.shift(reply.persona);
      for (const guest of members) guest.mood = moodAfterReply(guest.mood, reply.persona?.flirt ?? 0, 0);
      if (reply.strip) this.loseClothing();
      this.talkReply = [you(reply.say ?? reply.label), narrate(reply.result)];
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
      // Passives that pay off for informing, keeping secrets and selling them.
      const e = this.effects;
      if (index === 0) this.adjust(0, -e.informTrust, -e.informHeat);
      if (index === 1) this.adjust(0, e.protectTrust, e.protectHeat);
      if (index === 2) {
        this.adjust(e.secretGold, 0, 0);
        this.earned += e.secretGold;
      }
      const deeds: Partial<Persona>[] = [{ informed: 1, kindness: -1 }, { protected: 1, kindness: 1 }, { sold: 1, greed: 2 }];
      this.shift({ ...deeds[index], fame: FAME_DEEDS[index], respect: RESPECT_DEEDS[index] });
    } else if (index === 1) {
      this.shift({ greed: 1 });
    }
    this.lastResult = choice.result;
    this.phase = "bedtime";
    this.eased = false;
    this.say("The tavern is shut for the night. Your bed is through the door in the east wall.");
  }

  /** Upgrades and wares are bought from the house plans, during the day while the tavern is shut. */
  canBuy(id: UpgradeId): boolean {
    return this.phase === "day" && !this.upgrades.has(id) && this.gold >= UPGRADE_COST;
  }

  buy(id: UpgradeId): void {
    if (!this.canBuy(id)) return;
    this.gold -= UPGRADE_COST;
    this.upgrades.add(id);
    this.cue("buy");
  }

  /** Cups and dishes can be bought again and again, until the shelves are full. */
  canBuyStock(ware: Ware): boolean {
    return this.phase === "day" && this.gold >= STOCK_COST && this.stock[ware] + STOCK_PACK <= MAX_WARE[ware];
  }

  /** Buys another set of cups or dishes. */
  buyStock(ware: Ware): void {
    if (!this.canBuyStock(ware)) return;
    this.gold -= STOCK_COST;
    this.stock[ware] += STOCK_PACK;
    this.cleanWare[ware] += STOCK_PACK;
    this.cue("buy");
  }

  /** A new drink for the shelf, bought once. */
  canBuyBottle(bottle: Bottle): boolean {
    return this.phase === "day" && !this.bottles.has(bottle) && this.gold >= BOTTLES[bottle].cost;
  }

  buyBottle(bottle: Bottle): void {
    if (!this.canBuyBottle(bottle)) return;
    this.gold -= BOTTLES[bottle].cost;
    this.bottles.add(bottle);
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
    return this.messPatienceFor(1);
  }

  /** The same for someone who minds dirt this much: 1 is usual, 0 doesn't notice, 2 and up can barely sit down. */
  messPatienceFor(fussy: number): number {
    return Math.max(0.2, 1 - MESS_PATIENCE_LOSS * fussy * Math.max(0, 1 - this.effects.tidy) * Math.min(1, this.messes.length / MESS_FOR_FULL_LOSS));
  }

  /** What a guest is called: their type (a maid or footman for a servant, by body). */
  nameOf(guest: Guest): string {
    return roleLabel(guest.role, guestFemale(guest.id));
  }

  /** Mops or sweeps up one mess on the floor. */
  private clean(id: number, kind: Exclude<MessKind, "dishes">): void {
    const firstMorning = this.settlingIn;
    this.messes.splice(this.messes.findIndex((m) => m.id === id), 1);
    this.records.messesCleaned++;
    this.cue("wipe");
    if (firstMorning) {
      // The first morning walks her through it: what's left, and the bell once it's done.
      if (!this.settlingIn) this.say("The tavern is spotless, the way it was in Grandma's day. Ring the bell on the bar when you're ready to open.");
      else this.say(`${MESS_DONE[kind]} ${messesLeftWords(this.messes)} left.`);
      return;
    }
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

    // Opening with mess still about lets a spider back in, up in one of the corners.
    const webs = messes.filter((m) => m.kind === "cobweb").length;
    if (this.openedDirty && this.cobwebSpots > 0 && webs < MOST_COBWEBS) {
      const free = shuffled(this.cobwebSpots, this.nightIndex * 4513 + 11).filter((spot) => !has("cobweb", spot));
      if (free.length > 0) add("cobweb", [free[0]]);
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
      bottles: [...this.bottles],
      name: this.name,
      tub: [...this.tub],
      touch: { lets: { ...this.touchMemory.lets } },
      progress: {
        corruption: this.corruption,
        records: structuredClone(this.records),
        passives: [...this.passives],
        eased: this.eased,
        xp: { ...this.xp } as Record<string, number>,
        titles: [...this.titles],
        worn: [...this.worn],
      },
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
    // The tap no longer runs dry, so an old save's empty tap comes back full.
    this.tapLeft = TAP_SIZE;
    this.persona = readPersona(save.persona);
    this.touchMemory = readTouchMemory(save.touch);
    const progress = readProgress(save.progress);
    this.corruption = progress.corruption;
    this.records = progress.records;
    this.passives.clear();
    for (const id of progress.passives) this.passives.add(id);
    // Titles: only ones that exist, the first one always; worn only if earned, and no more than she has slots for.
    this.titles = new Set([START_TITLE, ...(progress.titles ?? []).filter((id) => TITLE_BY_ID.has(id))]);
    this.worn = (progress.worn ?? [START_TITLE]).filter((id, i, all) => this.titles.has(id) && all.indexOf(id) === i);
    // The brothel isn't saved: it opens again from what she's become.
    this.houseMode = { current: "tavern", unlocked: new Set(["tavern"]), brothel: 0 };
    this.unlockBrothel(true);
    this.eased = progress.eased ?? false;
    this.xp = readExperience(progress.xp);
    this.worn = this.worn.slice(0, this.titleSlots);
    this.refreshEffects();
    // Where she stands now isn't news: only a rise from here is shown.
    this.shownLevel = this.herLevel;
    this.shownSlut = this.slutLevel;
    this.fight = null;
    this.lastFight = null;
    this.brawlOffer = null;
    this.brawlDuel = false;
    this.duel = null;
    this.lastDuel = null;
    this.testDuel = false;
    this.newPassives = [];
    this.adultScene = null;
    this.layout = save.layout ? cloneLayout(save.layout) : null;
    this.stock.cup = save.stock?.cup ?? START_CUPS;
    this.stock.dish = save.stock?.dish ?? START_DISHES;
    this.bottles.clear();
    for (const bottle of save.bottles ?? []) this.bottles.add(bottle);
    this.name = save.name ?? "";
    this.tub.splice(0, this.tub.length, ...(save.tub ?? []));
    this.dirtyHeld[0].length = this.dirtyHeld[1].length = 0;
    this.guests.length = 0;
    this.nextGuestId = 1;
    this.messages.length = 0;
    this.unlocks.length = 0;
    this.cues.length = 0;
    this.lastResult = "";
    this.ending = null;
    this.openDay((save.messes ?? []).map(copyMess));
  }

  /** Starts a new day with the tavern closed, clearing everything that only lasts one night. */
  private openDay(messes: Mess[] = []): void {
    this.phase = "day";
    // The bedtime summary has shown last night's passives; tonight's start fresh.
    this.newPassives = [];
    this.messes.splice(0, this.messes.length, ...messes);
    this.nextMessId = Math.max(0, ...messes.map((m) => m.id)) + 1;
    this.openedDirty = false;
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
    this.stripped = 0;
    this.undressedTonight = 0;
    this.coated = {};
    this.talkingTo = null;
    this.talkReply = [];
    this.tipChat = null;
    this.touchChat = null;
    this.touchMoment = null;
    this.touchSeen.clear();
    this.touchHistory.clear();
    Object.assign(this.touchesTonight, { reached: 0, allowed: 0, refused: 0, boldest: 0 });
    // Tonight's desire is gone by morning. It starts again where her passives put it.
    const start = this.eased ? this.effects.aloneStart : 0;
    for (const m of METERS) this.meters[m] = this.peak[m] = Math.min(METER_MAX, this.effects.start[m] + start);
    this.pleasure = 0;
    // A night's sleep, and she has all her willpower back.
    this.willSpent = 0;
    this.adultScene = null;
    this.fight = null;
    this.trouble = null;
    this.fightsTonight = 0;
    this.drinksTonight = 0;
    this.duel = null;
    this.lastDuel = null;
    this.testDuel = false;
    this.admirers = [];
    this.peacemade = [];
    this.brawlOffer = null;
    this.brawlDuel = false;
    this.duelTonight = false;
    this.partyState.clear();
    this.say(
      messes.length > 0
        ? `Day ${this.nightIndex + 1}. Last night left a mess: dirty dishes, spilt ale and dust. Clean up and get ready, then ring the bell on the bar.`
        : `Day ${this.nightIndex + 1}. The tavern is closed. Get ready, then ring the bell on the bar when you want the night to begin.`,
    );
    if (messes.some((m) => m.kind === "cobweb")) {
      this.say("Up on the wall, a spider has been busy. Mess left about overnight draws them back in.");
    }
  }
}
