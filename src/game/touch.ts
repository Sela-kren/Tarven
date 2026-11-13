import type { Mood } from "./mood";
import { statsOf, type GuestRole, type RoleStats } from "./guestroles";
import type { GuestKind } from "./tavern";
import { CONFIDENT, FIRSTS, TOUCHES, type TouchDef, type TouchRegion } from "./touchtalk";

/**
 * Guests who reach for the innkeeper. Each touch has a boldness from 1 to 10 (`TouchDef.level`); each guest has a
 * nerve, how bold they'll be tonight, and only reaches for touches up to it. The innkeeper has a desire for each
 * part of her (see `passives.ts`), and can only let a touch happen once the desire it needs is high enough; here
 * that desire comes in on a scale of 0 to 10. Slapping the hand away and slipping out of reach are always there,
 * and only they are, when either of them has had far too much.
 *
 * Once her desire runs well past what a touch needs, "Give in" is offered as well: the player can choose to stop
 * holding back. It is only ever an extra button. Nothing here takes an answer away from her, and Pull away always
 * works (GAME_CONCEPT.md 7.1, GAME_PATH.MD). Wanting it shows instead in what saying no costs her (willpower.ts).
 */

export type { TouchDef, TouchRegion } from "./touchtalk";

export type TouchAnswer = "allow" | "lean" | "givein" | "slap" | "pull";

/** Whether the touch lands: she lets it, leans in, or gives in. A slap or a pull always stops it. */
export function touchLands(answer: TouchAnswer): boolean {
  return answer === "allow" || answer === "lean" || answer === "givein";
}

export const MAX_LEVEL = 10;
export const MAX_DESIRE = 10;

/** Nerve for each point of a guest's lust, out of 10. */
const NERVE_PER_LUST = 0.6;
const NERVE_FROM_MOOD: Partial<Record<Mood, number>> = { lust: 1.5, drunk: 1.5, angry: 0.5, scheming: 0.5, idolize: -1, gloomy: -1, scared: -2 };
/** A room that's stopped respecting you gets bolder, and one that respects you minds itself. */
const NERVE_DISRESPECTED = 1.5;
const NERVE_RESPECTED = -1.5;
/** Each touch you've let a guest have tonight makes them bolder; a slap knocks it right out of them. */
const NERVE_PER_ALLOWED = 1;
const NERVE_AFTER_SLAP = -3;

/** How likely a guest is to reach for you as you serve them: a little from anyone, more from the bold. */
const REACH_BASE = 0.08;
const REACH_PER_NERVE = 0.05;
const REACH_MAX = 0.55;

/** How strongly a guest goes for the boldest thing their nerve allows rather than something tamer. */
const BOLD_PULL = 0.6;
/** A touch already tried tonight is less likely to come round again. */
const SEEN_WEIGHT = 0.2;

/** How far past what a touch needs her desire has to be before she can lean into it. */
export const LEAN_MARGIN = 2;

/** How far past what a touch needs her desire has to be before "Give in" is offered too. */
export const GIVE_IN_MARGIN = 3;

/** How many times she has to have let something like it before she stops being shocked. */
const CONFIDENT_AFTER = 3;

export interface NerveFacts {
  kind: GuestKind;
  /** Their type in the group; how bold they start out comes from it. */
  role?: GuestRole;
  /** Their own rolled numbers, when known; these win over the type's. */
  stats?: RoleStats;
  /** The guest's lust, 0 to 10. */
  lust: number;
  mood: Mood;
  /** The innkeeper's respect, -10 to 10. */
  respect: number;
  lowRespect: number;
  highRespect: number;
  /** Touches you let this guest have tonight. */
  allowed: number;
  /** Whether you slapped this guest tonight. */
  slapped: boolean;
  /** Anything else on their nerve: her passives, and how lewd she's known to be. */
  bonus?: number;
  /** A slap stops them reaching for good tonight. */
  slapStops?: boolean;
}

/** How bold a guest will be, from 0 to 10. */
export function nerve(f: NerveFacts): number {
  let n = (f.stats ?? statsOf(f.kind, f.role)).nerve + f.lust * NERVE_PER_LUST + (NERVE_FROM_MOOD[f.mood] ?? 0) + f.allowed * NERVE_PER_ALLOWED;
  if (f.respect <= f.lowRespect) n += NERVE_DISRESPECTED;
  if (f.respect >= f.highRespect) n += NERVE_RESPECTED;
  if (f.slapped) n += NERVE_AFTER_SLAP;
  if (f.slapped && f.slapStops) return 0;
  n += f.bonus ?? 0;
  return Math.min(MAX_LEVEL, Math.max(0, n));
}

/** How likely a guest with this much nerve is to reach for you as you serve them. */
export function reachChance(guestNerve: number): number {
  if (guestNerve < 1) return 0;
  return Math.min(REACH_MAX, REACH_BASE + guestNerve * REACH_PER_NERVE);
}

export interface PickOptions {
  /** Whether there's any clothing left that guests would take. */
  canStrip: boolean;
  /** Touches already tried tonight. */
  seen: ReadonlySet<string>;
  /** Whether guests will ask her upstairs yet. */
  invites?: boolean;
  /** How much more often guests go for each kind of touch, as a fraction. */
  pull?: Partial<Record<TouchRegion, number>>;
  /** A foe reaching mid-brawl: the scuffle's own touches open up, and come up more often than the room's. */
  brawl?: boolean;
}

/** How much likelier a brawl's own touches are than the room's, mid-fight. */
const BRAWL_TOUCH_WEIGHT = 3;

/**
 * The touches a guest of this kind with this much nerve might go for. Invitations only once she's ready for them;
 * the scuffle's own touches only in a brawl.
 */
export function touchesFor(kind: GuestKind, guestNerve: number, options: PickOptions): TouchDef[] {
  return TOUCHES.filter(
    (t) =>
      (!t.romance || options.invites === true) &&
      (!t.brawl || options.brawl === true) &&
      t.level <= guestNerve &&
      (t.kinds.length === 0 || t.kinds.includes(kind)) &&
      (!t.strip || options.canStrip),
  );
}

/**
 * Which touch a guest reaches for: one of the boldest they've the nerve for, more often than not, and less
 * often one they've tried already tonight. Null if their nerve won't stretch to anything.
 */
export function pickTouch(kind: GuestKind, guestNerve: number, random: () => number, options: PickOptions): TouchDef | null {
  const choices = touchesFor(kind, guestNerve, options);
  if (choices.length === 0) return null;
  const weights = choices.map(
    (t) =>
      Math.exp(-BOLD_PULL * (guestNerve - t.level)) *
      (options.seen.has(t.id) ? SEEN_WEIGHT : 1) *
      (1 + (options.pull?.[t.region] ?? 0)) *
      (t.brawl ? BRAWL_TOUCH_WEIGHT : 1),
  );
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) {
    roll -= weights[i];
    if (roll < 0) return choices[i];
  }
  return choices[choices.length - 1];
}

/** How much desire it takes to let a touch of this boldness happen. */
export function desireNeeded(level: number): number {
  return level - 1;
}

/** Which of her three thoughts fits: 0 not ready, 1 torn, 2 wanting it. */
export function thoughtTier(touch: TouchDef, desire: number, leanMargin = LEAN_MARGIN): 0 | 1 | 2 {
  const need = desireNeeded(touch.level);
  if (desire < need) return 0;
  return desire < need + leanMargin ? 1 : 2;
}

export interface AnswerFacts {
  /** Her desire for this touch in the moment, 0 to 10. */
  desire: number;
  /** How far past what it needs she has to be to lean in; less with passives. */
  leanMargin?: number;
  /** She's had far too much to say yes to anything. */
  sloppy: boolean;
  /** So has the guest. */
  guestSloppy: boolean;
}

/**
 * What she can answer, in the order shown. Slap and Pull away are always there, at every desire. The yeses come
 * only as her desire allows, and not at all when either of them has had far too much. "Give in" joins them once
 * her desire runs well past the touch; it never replaces anything.
 */
export function touchAnswers(touch: TouchDef, f: AnswerFacts): TouchAnswer[] {
  const answers: TouchAnswer[] = [];
  if (!f.sloppy && !f.guestSloppy) {
    const tier = thoughtTier(touch, f.desire, f.leanMargin);
    if (tier >= 1) answers.push("allow");
    if (tier >= 2) answers.push("lean");
    if (f.desire >= desireNeeded(touch.level) + GIVE_IN_MARGIN) answers.push("givein");
  }
  answers.push("slap", "pull");
  return answers;
}

/**
 * What the intensity (Force) bar adds once a touch she said yes to has landed: a bolder touch tips a little more
 * and warms her a little more. Never shown, and never anything, before she has answered.
 */
export function intensityBonus(level: number): { gold: number; meter: number } {
  if (level >= 9) return { gold: 2, meter: 0.5 };
  if (level >= 6) return { gold: 1, meter: 0.25 };
  return { gold: 0, meter: 0 };
}

/** What an answer does: to her reputation, her purse, her own feelings, and the guest. */
export interface TouchOutcome {
  gold: number;
  respect: number;
  fame: number;
  flirt: number;
  /** The guest's mood after, or null to leave it. */
  mood: Mood | null;
}

export function touchOutcome(touch: TouchDef, answer: TouchAnswer): TouchOutcome {
  const level = touch.level;
  switch (answer) {
    case "allow":
      return {
        gold: level,
        respect: -Math.floor(level / 3),
        fame: level >= 4 ? 1 : 0,
        flirt: level >= 5 ? 1 : 0,
        mood: "lust",
      };
    case "lean":
      return {
        gold: level * 2 + 1,
        respect: -Math.floor(level / 3) - 1,
        fame: 2,
        flirt: 1,
        mood: "lust",
      };
    case "givein":
      // Between letting it and leaning in: she stopped holding back, and the room saw her choose to.
      return {
        gold: level + 1,
        respect: -Math.floor(level / 3),
        fame: level >= 4 ? 1 : 0,
        flirt: 1,
        mood: "lust",
      };
    case "slap":
      return { gold: 0, respect: level >= 6 ? 2 : level >= 3 ? 1 : 0, fame: 0, flirt: 0, mood: "angry" };
    case "pull":
      return { gold: 0, respect: level >= 5 ? 1 : 0, fame: 0, flirt: 0, mood: null };
  }
}

/** The button for an answer. */
export function answerLabel(touch: TouchDef, answer: TouchAnswer): string {
  switch (answer) {
    case "allow":
      return touch.strip ? "Let them take it" : "Let it happen";
    case "lean":
      return touch.strip ? "Help them with it" : "Lean into it";
    case "givein":
      return touch.strip ? "Give in and let it go" : "Give in";
    case "slap":
      return "Slap them";
    case "pull":
      return "Pull away";
  }
}

/** What she thinks, or says, after letting it: shocked the first time, teasing once she's used to it. */
export function afterLine(region: TouchRegion, timesBefore: number): { thought: boolean; text: string } | null {
  if (timesBefore === 0) return { thought: true, text: FIRSTS[region] };
  if (timesBefore >= CONFIDENT_AFTER) return { thought: false, text: CONFIDENT[region] };
  return null;
}

/** Fills in the garment a touch is after. */
export function fillPiece(text: string, piece: string | null): string {
  return text.replaceAll("{piece}", piece ?? "clothes");
}

/** What carries between nights: how many times she's let each kind of touch happen. */
export interface TouchMemory {
  lets: Partial<Record<TouchRegion, number>>;
}

export function newTouchMemory(): TouchMemory {
  return { lets: {} };
}

/** A touch memory from a save, with anything broken put back to its start. */
export function readTouchMemory(raw: unknown): TouchMemory {
  const memory = newTouchMemory();
  if (!raw || typeof raw !== "object") return memory;
  // Older saves also kept a lasting desire; that's now worked out from passives, so it's let go.
  const fields = raw as { lets?: unknown };
  if (fields.lets && typeof fields.lets === "object") {
    for (const [region, count] of Object.entries(fields.lets as Record<string, unknown>)) {
      if (region in FIRSTS && typeof count === "number" && Number.isFinite(count) && count > 0) {
        memory.lets[region as TouchRegion] = Math.floor(count);
      }
    }
  }
  return memory;
}