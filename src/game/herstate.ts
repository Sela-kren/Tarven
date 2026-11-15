/**
 * Her energy and fatigue, the way Karryn's Prison has them (GAME_PATH.MD 7k):
 *
 * - **Energy** is KP's second bar (Karryn's MP). It fills to the top when she sleeps (half with a nap) and pays for her
 *   energy skills in a brawl: Revitalize, Second Wind once she's down, and her stances. Breathing gets a little back;
 *   coming mid-brawl takes some (KP's energy damage from orgasms).
 * - **Fatigue** builds day after day (KP's fatigue): each brawl and each after-hours game adds to it, and a night's
 *   sleep takes some of it away. At 25, 35, 45, 55 and 65 it reaches levels 1 to 5, and each level takes 10% off what
 *   she can do in a brawl (KP: off every stat but her max stamina and energy).
 *
 * Pure rules, kept apart from tavern.ts and fight.ts so they can be tested.
 */
import type { StatId } from "./skills";

/** Energy at Mind and Endurance 1, and what each level past it adds. */
export const BASE_ENERGY = 20;
export const ENERGY_PER_LEVEL = { mind: 2, endurance: 2 } as const;

/** Her energy at the top, from her levels. */
export function maxEnergy(levels: Readonly<Record<StatId, number>>): number {
  return BASE_ENERGY + (levels.mind - 1) * ENERGY_PER_LEVEL.mind + (levels.endurance - 1) * ENERGY_PER_LEVEL.endurance;
}

/** What her energy skills cost. */
export const ENERGY_COST = { revitalize: 5, secondWind: 10, cautious: 3, defensive: 4, counter: 5 } as const;
/** Revitalize: stamina back, plus one per Endurance level past 1. */
export const REVITALIZE_STAMINA = 6;
/** Breathe: a little energy back, and a breath of stamina. */
export const BREATHE = { energy: 3, stamina: 1 } as const;
/** Second Wind: back on her feet with this share of her stamina. */
export const SECOND_WIND_SHARE = 0.5;
/** A stance holds this many turns. */
export const STANCE_TURNS = 4;
/** Coming mid-brawl takes this much energy (KP's energy damage from orgasms). */
export const CLIMAX_ENERGY = 5;
/** A nap gives back this share of her energy. */
export const NAP_ENERGY = 0.5;

/**
 * KP's stances: Cautious (their aim off, her dodges better), Defensive (their blows and grapples take less out of her,
 * and can't pin her), Counter (when they miss, she hits back).
 */
export type Stance = "cautious" | "defensive" | "counter";
export const STANCE_NAMES: Readonly<Record<Stance, string>> = { cautious: "Cautious Stance", defensive: "Defensive Stance", counter: "Counter Stance" };
export const CAUTIOUS = { theirAim: 0.15, dodge: 0.1 } as const;
export const DEFENSIVE = { damage: 2 } as const;
/** Counter Stance: her answer to a miss hits for this share of a strike. */
export const COUNTER_SHARE = 0.5;

/** Fatigue at which she reaches each level, 1 to 5 (KP's getFatigueLevel). */
export const FATIGUE_LEVELS = [25, 35, 45, 55, 65] as const;
export const FATIGUE_MAX = 100;
/** What each level of it takes off what she can do in a brawl. */
export const FATIGUE_PER_LEVEL = 0.1;

/** Her fatigue level, 0 to 5. */
export function fatigueLevel(fatigue: number): number {
  return FATIGUE_LEVELS.filter((at) => fatigue >= at).length;
}

/** What wears her out: a brawl (more for each foe past the first, and its length), coming, an after-hours game. */
export const FATIGUE_GAIN = { brawl: 3, perFoe: 2, turnsPerPoint: 4, climax: 2, duel: 5, perPartner: 2 } as const;
/** What rest takes off it. */
export const FATIGUE_REST = { sleep: 20, nap: 5 } as const;

/** The fatigue a brawl leaves her with. */
export function brawlFatigue(foes: number, turns: number, climaxes: number): number {
  return FATIGUE_GAIN.brawl + Math.max(0, foes - 1) * FATIGUE_GAIN.perFoe + Math.floor(turns / FATIGUE_GAIN.turnsPerPoint) + climaxes * FATIGUE_GAIN.climax;
}

/** The fatigue an after-hours game leaves her with. */
export function duelFatigue(partners: number, climaxes: number): number {
  return FATIGUE_GAIN.duel + Math.max(0, partners - 1) * FATIGUE_GAIN.perPartner + climaxes * FATIGUE_GAIN.climax;
}

/** How she feels it, in a word, for her status card. */
export const FATIGUE_LABELS = ["", "Tired", "Weary", "Worn out", "Exhausted", "Spent"] as const;
