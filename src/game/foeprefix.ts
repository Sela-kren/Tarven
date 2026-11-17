/**
 * Prefixes on the ones she fights, after Karryn's Prison's enemy prefixes (RemtairyEnemy.js ENEMY_PREFIX_*): now and
 * then a guest who squares up to her is "a big rogue", "a virgin farmhand" or "a talker", and fights like it.
 *
 * - Some make them harder or easier to put down (big, elite, strong, enduring; weak, slow, inept).
 * - Some change what they want from her (horny, virgin, sensitive, hungry) or how they go about it (talker, starer).
 * - Some come more than once (KP's ejaculation stock): big, elite and hungry have more in them, a virgin less.
 *
 * Which one a guest has is fixed by who they are (their id), so the same guest is always the same. Pure rules.
 */
export type FoePrefixId =
  | "big"
  | "elite"
  | "strong"
  | "enduring"
  | "agile"
  | "weak"
  | "slow"
  | "inept"
  | "horny"
  | "virgin"
  | "sensitive"
  | "hungry"
  | "talker"
  | "starer";

export interface FoePrefixDef {
  /** The word in front of their name in the log ("big rogue"). */
  word: string;
  /** What it does, for the fight panel. */
  note: string;
  /** Stamina (as a share), attack and accuracy. */
  stamina?: number;
  attack?: number;
  accuracy?: number;
  /** How fast their pleasure rises, as a share (1.5 is half as fast again). */
  rate?: number;
  /** Times they can come before they're spent (KP's ejaculation stock): added to the usual one. */
  stock?: number;
  /** Starts horny. */
  horny?: boolean;
  /** How much likelier they are to talk lewd at her, or stare, instead of groping (0 to 1). */
  talk?: number;
  sight?: number;
}

export const FOE_PREFIXES: Readonly<Record<FoePrefixId, FoePrefixDef>> = {
  big: { word: "big", note: "Big: more stamina, more in him", stamina: 0.4, attack: 1, rate: 0.85, stock: 1 },
  elite: { word: "hardened", note: "Hardened: tougher all round", stamina: 0.5, attack: 2, accuracy: 0.05, stock: 1 },
  strong: { word: "strong", note: "Strong: hits harder", attack: 2 },
  enduring: { word: "tireless", note: "Tireless: more stamina", stamina: 0.35 },
  agile: { word: "quick", note: "Quick: harder to dodge", accuracy: 0.1 },
  weak: { word: "scrawny", note: "Scrawny: easy to put down", stamina: -0.3, attack: -1 },
  slow: { word: "sluggish", note: "Sluggish: swings wide", accuracy: -0.12 },
  inept: { word: "clumsy", note: "Clumsy: weak and wild", attack: -1, accuracy: -0.08 },
  horny: { word: "randy", note: "Randy: wants her from the start", horny: true, rate: 1.15 },
  virgin: { word: "virgin", note: "Virgin: eager, and done fast", horny: true, rate: 1.8 },
  sensitive: { word: "twitchy", note: "Twitchy: worked up fast", rate: 1.4 },
  hungry: { word: "greedy", note: "Greedy: comes back for more", stock: 2 },
  talker: { word: "mouthy", note: "Mouthy: all talk", talk: 0.4 },
  starer: { word: "leering", note: "Leering: can't stop looking", sight: 0.4 },
};

const IDS = Object.keys(FOE_PREFIXES) as FoePrefixId[];

/** The share of guests who have one (KP: ENEMY_PREFIX_BASE_ATTACH_CHANCE). */
export const PREFIX_CHANCE = 0.35;

/** A number from 0 to 1 fixed by `n`, well spread. */
function spread(n: number, salt: number): number {
  const x = Math.sin((n + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** The prefix a guest has, fixed by their id, or none. */
export function foePrefixFor(guestId: number): FoePrefixId | undefined {
  if (spread(guestId, 1) >= PREFIX_CHANCE) return undefined;
  return IDS[Math.floor(spread(guestId, 2) * IDS.length) % IDS.length];
}

/** How their pleasure falls back after coming, while they've more in them: what's left of their rate (KP's arousal point rising). */
export const AFTER_COME_RATE = 0.75;
