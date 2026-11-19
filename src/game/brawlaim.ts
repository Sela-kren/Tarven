/**
 * Aimed strikes and the guard meter in a brawl (fight.ts), 2026-11-19.
 *
 * Karryn's Prison gives Karryn three attack types in a triangle: Slash beats Blunt, Blunt beats Pierce, Pierce beats
 * Slash, worth +25% damage and +15% to hit on the winning side (RemtairyBattler.js stanceDmgAdv). Tarven goes its
 * own way instead:
 *
 * - Her Strike is aimed: face, gut, below the belt or knees, and each does its own thing to them. Every foe has one
 *   weak spot that takes more. The tougher the foe, the harder it is to read: plain to see on a weak one, a choice
 *   of two on a middling one, hidden on a tough one until she finds it with her fist (or Eye of the Mind).
 * - When one of them swings at her, a needle sweeps back and forth across a meter: stop it in the dodge zone and the
 *   swing misses, in the block zone on either side and it glances off for half, anywhere else and it lands in full.
 *   The tougher the foe, the faster the needle and the narrower the zones.
 */

export type StrikeAim = "face" | "gut" | "low" | "knees";
export const STRIKE_AIMS: readonly StrikeAim[] = ["face", "gut", "low", "knees"];

/** What an aim is called, the chance it adds or takes off her strike, the share of damage it does, and what it does. */
export interface AimDef {
  name: string;
  hit: number;
  damage: number;
  does: string;
}

export const AIMS: Readonly<Record<StrikeAim, AimDef>> = {
  face: { name: "Face", hit: -0.1, damage: 1, does: "dizzy: their next swing is slower" },
  gut: { name: "Gut", hit: 0, damage: 1, does: "winded: their next blow hits half as hard" },
  low: { name: "Below the belt", hit: -0.05, damage: 1.5, does: "hurts most, but makes them furious" },
  knees: { name: "Knees", hit: 0.05, damage: 0.75, does: "wobbly: you can throw them out sooner" },
};

/** Their weak spot takes this much more. */
export const WEAK_DAMAGE = 1.5;
/** Below the belt on one who's erect (KP's Cock Kick: super effective): more again. */
export const LOW_ERECT = 1.3;
/** Below the belt makes them this much angrier (brawlai.ts anger, out of 100). */
export const LOW_ANGER = 25;
/** Wobbly on their knees: they can be thrown out with this much more of their stamina left. */
export const WOBBLY_THROW = 0.15;
/** Dizzy: how much slower the needle sweeps on their next swing (and how much worse their aim, when it's rolled). */
export const DIZZY_SLOW = 0.3;
export const DIZZY_AIM = 0.2;
/** A drunk's swing is easier to read: this much slower. */
export const DRUNK_SLOW = 0.15;

/** The weak spot each type leans to (more often than not); the rest of the time it's any of them. */
const WEAK_LEAN: Readonly<Record<string, StrikeAim>> = {
  farmer: "gut",
  soldier: "knees",
  smuggler: "face",
  stranger: "gut",
  archer: "gut",
  warrior: "knees",
  mage: "gut",
  cleric: "face",
  rogue: "low",
  brute: "knees",
  noble: "face",
  servant: "gut",
};
const LEAN_SHARE = 0.6;

/** A fixed scramble of a number, so a foe's weak spot is their own without touching the fight's dice. */
function scramble(n: number): number {
  let h = (n | 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * A foe's weak spot, from who they are (`seed`) and their type (`label`, as RoleStats has it); and the other spot a
 * middling foe shows alongside it, so she has two to choose from.
 */
export function rollWeakSpot(seed: number, label: string): { weak: StrikeAim; decoy: StrikeAim } {
  const h = scramble(seed);
  const lean = WEAK_LEAN[label.toLowerCase()];
  const weak = lean && h % 100 < LEAN_SHARE * 100 ? lean : STRIKE_AIMS[(h >>> 8) % STRIKE_AIMS.length];
  const i = STRIKE_AIMS.indexOf(weak);
  const decoy = STRIKE_AIMS[(i + 1 + ((h >>> 16) % 3)) % STRIKE_AIMS.length];
  return { weak, decoy };
}

/** How tough a foe is to read: their stamina and twice their punch. A drunk gives more away. */
export function toughness(foe: { max: number; attack: number; drunk: boolean }): number {
  return foe.max + foe.attack * 2 - (foe.drunk ? 6 : 0);
}

/** Under this toughness their weak spot is plain to see; under the next, she can tell it's one of two. */
export const READ_PLAIN = 24;
export const READ_HINT = 40;

export type WeakRead = "plain" | "hint" | "hidden";

export function readOf(tough: number): WeakRead {
  return tough < READ_PLAIN ? "plain" : tough < READ_HINT ? "hint" : "hidden";
}

/** What she can see of a foe's weak spot: the one spot, two it's one of, or nothing yet. Found, it's plain. */
export function weakSpotSeen(foe: { weak: StrikeAim; decoy: StrikeAim; found: boolean; max: number; attack: number; drunk: boolean }): StrikeAim[] {
  if (foe.found) return [foe.weak];
  const read = readOf(toughness(foe));
  if (read === "plain") return [foe.weak];
  if (read === "hint") return STRIKE_AIMS.filter((a) => a === foe.weak || a === foe.decoy);
  return [];
}

/** One of them swinging at her, waiting on her timing: whose swing (a foes index), the needle's speed, and the zones (0 to 1 across the meter). */
export interface GuardMeter {
  foe: number;
  /** How many times a second the needle crosses the meter. */
  speed: number;
  dodge: readonly [number, number];
  /** The block zone, the dodge zone sitting in its middle. */
  block: readonly [number, number];
}

export type GuardResult = "dodge" | "block" | "full";

export interface GuardInput {
  toughness: number;
  /** Their aim (Foe.accuracy, 0 to 1). */
  accuracy: number;
  /** Her Agility and Endurance levels. */
  agility: number;
  endurance: number;
  /** Extra width on the dodge zone (her Dodge move, Cautious Stance, her hold on their arm; less tired or wanting it). */
  dodgeBonus: number;
  /** Extra width on the block zone (Defensive Stance). */
  blockBonus: number;
  /** A share off the needle's speed (they're dizzy, or drunk). */
  slow: number;
  /** Where the zones sit, 0 to 1 (rolled each swing). */
  center: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** The meter for one swing of theirs. */
export function guardMeter(foe: number, g: GuardInput): GuardMeter {
  const t = clamp((g.toughness - 14) / 36, 0, 1);
  const speed = (0.8 + t * 1.2) * (1 - clamp(g.slow, 0, 0.7));
  const dodge = clamp(0.14 - t * 0.07 - (g.accuracy - 0.6) * 0.1 + (g.agility - 1) * 0.01 + g.dodgeBonus, 0.03, 0.3);
  const block = clamp(0.14 - t * 0.05 + (g.endurance - 1) * 0.01 + g.blockBonus, 0.04, 0.25);
  const half = dodge / 2;
  const c = clamp(g.center, half + block, 1 - half - block);
  return { foe, speed, dodge: [c - half, c + half], block: [c - half - block, c + half + block] };
}

/** Where she stopped the needle, and what that makes of their swing. */
export function guardAt(m: GuardMeter, pos: number): GuardResult {
  if (pos >= m.dodge[0] && pos <= m.dodge[1]) return "dodge";
  if (pos >= m.block[0] && pos <= m.block[1]) return "block";
  return "full";
}

/** Where the needle is `seconds` after the meter opens: from the left, across and back, over and over. */
export function needleAt(speed: number, seconds: number): number {
  const x = (Math.max(0, seconds) * speed) % 2;
  return x <= 1 ? x : 2 - x;
}

/** Left alone this many crossings, the swing lands. */
export const GUARD_SWEEPS = 4;
