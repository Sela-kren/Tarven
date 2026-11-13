/**
 * The player's say over impulsive guests: whether a guest who can't keep their hands to themselves may touch her
 * without the choice coming up first, how bold a touch that covers, and how often it happens.
 *
 * Consent rule (GAME_PATH.MD): the player is asked first. So the setting starts switched on but not yet agreed to.
 * Nothing lands without asking until the player has said yes to it, either the first time an impulsive guest
 * reaches (the offer on that touch) or by switching it on in Settings. Only touches she could already say yes to
 * are covered: never when either of them is too drunk, never past her desire, never a garment and never the
 * invitation upstairs. Slap and Pull away are there on every reach that asks.
 */
import type { Mood } from "./mood";
import type { TouchAnswer, TouchDef } from "./touch";

export interface TouchSettings {
  /** Impulsive guests may touch without asking. On by default, but it does nothing until `agreed`. */
  autoTouch: boolean;
  /** The player has said yes to it: on the offer, or by switching it on in Settings. */
  agreed: boolean;
  /** The boldest touch it covers, 1 to AUTO_TOUCH_MAX. */
  upTo: number;
  /** How often an impulsive guest's touch skips the question, 0 to 1. Not every time. */
  chance: number;
}

export const AUTO_TOUCH_MAX = 9;
/** A lustful guest with at least this much nerve is impulsive enough to reach without waiting. */
export const IMPULSE_NERVE = 5;

export function defaultTouchSettings(): TouchSettings {
  return { autoTouch: true, agreed: false, upTo: 5, chance: 0.2 };
}

/** A guest acting on impulse: lustful, and bold enough to just do it. */
export function impulsive(mood: Mood, nerve: number): boolean {
  return mood === "lust" && nerve >= IMPULSE_NERVE;
}

/** Whether a touch is one the setting can cover: one she could say yes to anyway, within the boldness chosen. */
export function autoTouchFits(settings: TouchSettings, touch: TouchDef, answers: readonly TouchAnswer[]): boolean {
  return touch.level <= settings.upTo && !touch.strip && touch.region !== "invite" && answers.includes("allow");
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
      if (typeof r.chance === "number") settings.chance = Math.min(1, Math.max(0, r.chance));
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
