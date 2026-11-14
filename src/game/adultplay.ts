/**
 * Adult play, Karryn-style (GAME_PATH.MD 7f). Through the night her **adult play stack** fills, in percent (0 to
 * 100%): every point of desire she gains, every drink, every touch she lets land, every piece of clothing off, every
 * look she gives. It starts each night at a head start from her lewdness. Only once it's full can an aroused guest
 * (lust 6+, sober) go for adult play when they reach for her, and then by a chance that grows the more she and they
 * are worked up (her Cock desire, being horny or wet, their lust, how lewd she's known to be, how much of her is on
 * show, how many nights in, her passives). A respected innkeeper is asked half as often. Saying no knocks the stack
 * back; adult play played out empties it.
 *
 * Saying yes still needs her ready for it: Cock desire for the boldest touch there is, less what her lewdness and
 * passives take off, or else horny and wet at once. Too drunk on either side, and it's never a yes.
 *
 * With Consent off, it's her state that decides (Karryn's Prison): if she's ready and they're aroused, it plays
 * out without the question, and where and what are matched to how she is right then (`matchAct`, `matchWhere`).
 */
import type { Meter } from "./passives";

export interface AdultPlayFacts {
  /** Her Cock desire, 0 to 100: wanting to be intimate with someone. */
  cock: number;
  /** Any desire at 80+. */
  horny: boolean;
  wet: boolean;
  /** The guest's lust, 0 to 10. */
  lust: number;
  /** The guest's mood is lust. */
  lusting: boolean;
  /** How lewd she's known to be. */
  lewdness: number;
  /** Pieces of clothing off her. */
  exposed: number;
  /** Nights gone by, from 0. */
  night: number;
  /** Her passives' pull toward it, as a fraction. */
  pull: number;
  /** The room respects her: they think twice. */
  respected: boolean;
  /** Her adult play stack, in percent. Under 100%, nobody goes for it. */
  stack: number;
}

/** The stack is full at 100%: adult play can happen. */
export const STACK_FULL = 100;
/** What fills the stack, in percentage points. */
export const STACK_GAIN = {
  /** For each point of desire she gains (Cock desire counts double and a bit). */
  desire: 0.12,
  cock: 0.25,
  /** A drink with a guest: it loosens her (too drunk still blocks every yes). */
  drink: 8,
  /** A touch she lets land, and more for a bolder one. */
  touch: 3,
  touchPerLevel: 0.5,
  /** A piece of clothing off her. */
  piece: 6,
  /** A peek, and a proper look. */
  peek: 3,
  bare: 6,
  /** Overwhelmed at the table. */
  overwhelmed: 20,
} as const;
/** Saying no to adult play knocks this much off the stack. */
export const STACK_REFUSED = 15;

/** Where the stack starts each night: half her lewdness, at most 40%. */
export function stackStart(lewdness: number): number {
  return Math.min(40, Math.max(0, lewdness) / 2);
}

/** The stack after a gain (or a loss), kept between 0 and 100%. */
export function addStack(stack: number, gain: number): number {
  return Math.min(STACK_FULL, Math.max(0, stack + gain));
}

/** The least chance there is, once the stack is full, on a first night with nobody worked up. */
export const ADULT_BASE = 0.1;
/** Never more likely than this, however worked up everyone is. */
export const ADULT_MAX = 0.5;
/** A guest this lustful (or more) is aroused: lust past it adds to the chance, and Consent off needs it. */
export const ADULT_LUST = 6;

/**
 * How likely a guest who reaches for her goes for adult play instead of a touch: nothing until her stack is full
 * and they're aroused, then small at the start and bigger with every part of the moment that's worked up.
 */
export function adultPlayChance(f: AdultPlayFacts): number {
  if (f.stack < STACK_FULL || f.lust < ADULT_LUST) return 0;
  let chance =
    ADULT_BASE +
    (f.cock / 100) * 0.12 +
    (f.horny ? 0.06 : 0) +
    (f.wet ? 0.04 : 0) +
    (Math.max(0, f.lust - (ADULT_LUST - 1)) / (11 - ADULT_LUST)) * 0.08 +
    (f.lusting ? 0.03 : 0) +
    Math.min(0.12, f.lewdness * 0.003) +
    Math.min(0.06, f.exposed * 0.02) +
    Math.min(0.04, f.night * 0.004);
  chance *= 1 + f.pull;
  if (f.respected) chance *= 0.5;
  return Math.min(ADULT_MAX, Math.max(0, chance));
}

/** What her lewdness takes off the Cock desire adult play needs: 1 for every 5, at most 20. */
export function lewdnessEase(lewdness: number): number {
  return Math.min(20, Math.max(0, lewdness) / 5);
}

/** The guest is aroused enough for adult play to happen without asking (Consent off): lust that shows, sober. */
export function aroused(lust: number, drunk: boolean): boolean {
  return lust >= ADULT_LUST && !drunk;
}

/**
 * Consent off: what happens upstairs, matched to her state. Of everything she's ready for, the act her strongest
 * desire wants; on a tie, the bolder one (later in the list). A kiss is always there.
 */
export function matchAct<A extends string>(choices: readonly { act: A; ready: boolean; meter: Meter }[], meters: Readonly<Record<Meter, number>>): A | null {
  let best: { act: A; meter: Meter } | null = null;
  for (const c of choices) if (c.ready && (!best || meters[c.meter] >= meters[best.meter])) best = c;
  return best?.act ?? null;
}

/**
 * Consent off: where, matched to her state. Down in the taproom when it's open to her (not her first time, others
 * want in, nobody too drunk) and she's already on show: clothes off, or the room is what she likes. Else upstairs.
 */
export function matchWhere(taproomOpen: boolean, exposed: number, showsOff: boolean): "upstairs" | "taproom" {
  return taproomOpen && (exposed > 0 || showsOff) ? "taproom" : "upstairs";
}
