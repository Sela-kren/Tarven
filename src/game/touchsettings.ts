/**
 * The player's say over impulsive guests: the Consent switch, and how bold a touch it covers.
 *
 * Consent On (the start): every touch stops and asks. Consent Off is the player saying yes in advance: when an
 * impulsive guest reaches, a check weighs them against her (`impulseCheck`), and if they push past her it plays
 * out on its own. If they don't, she's asked like any other time. Only touches she could already say yes to are
 * covered: never when either of them is too drunk, never past her desire, and never the invitation upstairs. A
 * garment goes through the same check, with her hold the stronger for it (STRIP_HOLD). Slap and Pull away are there
 * on every reach that asks.
 */
import type { Mood } from "./mood";
import type { TouchAnswer, TouchDef } from "./touch";
import type { TouchRegion } from "./touchtalk";
import type { PassiveGroup } from "./passives";

export interface TouchSettings {
  /** Impulsive guests may touch without asking. On by default, but it does nothing until `agreed`. */
  autoTouch: boolean;
  /** The player has said yes to it: on the offer, or by switching Consent off in Settings. */
  agreed: boolean;
  /** The boldest touch it covers, 1 to AUTO_TOUCH_MAX. */
  upTo: number;
}

export const AUTO_TOUCH_MAX = 9;
/** A lustful guest with at least this much nerve is impulsive enough to reach without waiting. */
export const IMPULSE_NERVE = 5;

export function defaultTouchSettings(): TouchSettings {
  return { autoTouch: true, agreed: false, upTo: 5 };
}

/** A guest acting on impulse: lustful, and bold enough to just do it. */
export function impulsive(mood: Mood, nerve: number): boolean {
  return mood === "lust" && nerve >= IMPULSE_NERVE;
}

/**
 * Whether a touch is one the setting can cover: one she could say yes to anyway, within the boldness chosen. A
 * garment counts too, weighed harder in the check (STRIP_HOLD); the invitation upstairs never does.
 */
export function autoTouchFits(settings: TouchSettings, touch: TouchDef, answers: readonly TouchAnswer[]): boolean {
  return touch.level <= settings.upTo && touch.region !== "invite" && answers.includes("allow");
}

/** Her passive groups that count toward each part of her being touched. */
export const GROUPS_OF_REGION: Record<TouchRegion, readonly PassiveGroup[]> = {
  hand: ["hands"],
  hair: ["neck"],
  neck: ["neck"],
  shoulder: ["neck"],
  waist: ["hips"],
  clothes: ["hips", "exhibition"],
  face: ["mouth"],
  lips: ["mouth"],
  chest: ["breasts"],
  rear: ["butt"],
  thigh: ["thighs"],
  lap: ["thighs", "cock"],
  intimate: ["pussy", "cock"],
  invite: ["invitations"],
};

/** Everything the check weighs: her side, then theirs. */
export interface ImpulseFacts {
  /** How bold the touch is, 1 to 10. */
  level: number;
  /** Her desire meter for that part tonight, 0 to 100. */
  desire: number;
  /** Pieces of clothing off her. */
  exposed: number;
  /** Her Exhibition passives: being on show eggs her on, not just them. */
  exhibition: number;
  /** Her passives for that part. */
  passives: number;
  /** Times she has let that part be touched, ever. */
  lets: number;
  /** Her body skill level for that part, from 1. */
  skill: number;
  /** The guest's nerve, 1 to 10. */
  nerve: number;
  /** Their type goes for that part of her (their `prefers`). */
  prefers: boolean;
  /** They're after a piece of her clothing: her hold is the stronger for it. */
  strip?: boolean;
  /** What her passives add to her hold for this touch (Karryn's resistances): negative is weaker. */
  passiveHold?: number;
}

/** The check's result: each side's number, what made up hers, and whether the touch lands on its own. */
export interface ImpulseCheck {
  /** Their push: nerve, their type's taste, and how much of her is on show. */
  push: number;
  /** Her hold: a steady base plus the touch's boldness, worn down by how much she wants it. */
  hold: number;
  /** What wore her hold down, part by part. */
  want: { desire: number; passives: number; experience: number; skill: number; exhibition: number };
  /** What a garment adds to her hold: 0 for anything else. */
  clothing: number;
  /** What her passives add to her hold (negative takes away). */
  passives: number;
  lands: boolean;
}

/** Her hold before the touch's boldness and her wanting it come in. */
export const HOLD_BASE = 6;
/** A garment on the line: she holds on to her clothes harder than she holds still for a hand. */
export const STRIP_HOLD = 2;
/** What a guest's taste for that part adds to their push. */
export const PREFER_PUSH = 2;

/**
 * Consent off: does this impulsive guest's touch play out without asking? Their push (nerve, their type's taste,
 * her exposure) against her hold (the touch's boldness, less her desire for that part, her passives for it, how
 * often she's let it happen, and her practice). Push at or past her hold, and it lands; otherwise she's asked.
 */
export function impulseCheck(f: ImpulseFacts): ImpulseCheck {
  const want = {
    desire: f.desire / 20,
    passives: Math.min(3, f.passives),
    experience: Math.min(3, f.lets / 5),
    skill: Math.min(3, Math.max(0, f.skill - 1)),
    // On show and the kind who likes it: it counts against her hold too, but only once something's off.
    exhibition: f.exposed > 0 ? Math.min(2, f.exhibition) : 0,
  };
  const wanting = want.desire + want.passives + want.experience + want.skill + want.exhibition;
  const clothing = f.strip ? STRIP_HOLD : 0;
  const passives = f.passiveHold ?? 0;
  const push = round1(f.nerve + (f.prefers ? PREFER_PUSH : 0) + f.exposed);
  const hold = round1(Math.max(0, HOLD_BASE + f.level + clothing + passives - wanting));
  return { push, hold, want, clothing, passives, lands: push >= hold };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const SETTINGS_KEY = "tarven.touch";

/** The saved touch settings. Anything missing or broken falls back to its default. */
export function readTouchSettings(): TouchSettings {
  const settings = defaultTouchSettings();
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const r = raw as Partial<Record<keyof TouchSettings, unknown>>;
      if (typeof r.autoTouch === "boolean") settings.autoTouch = r.autoTouch;
      if (typeof r.agreed === "boolean") settings.agreed = r.agreed;
      if (typeof r.upTo === "number") settings.upTo = Math.min(AUTO_TOUCH_MAX, Math.max(1, Math.round(r.upTo)));
    }
  } catch {
    // Blocked or broken storage: the defaults stand.
  }
  return settings;
}

export function writeTouchSettings(settings: TouchSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // The settings just won't be remembered.
  }
}
