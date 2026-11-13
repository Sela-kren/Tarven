/**
 * Debuffs, the way Karryn's Prison does them: when things go badly (a brawl lost, the baron unpaid, the garrison
 * raiding the place), the game goes on, but she carries something for it for a while. Each has a level (the same
 * thing again makes it worse, up to its most) and lasts a number of nights, or until whatever caused it is put right.
 *
 * What they do is worked into her effects (passives.ts) along with her passives and titles.
 */
import type { Effects } from "./passives";

export type DebuffId = "bruised" | "inDebt" | "watched" | "overwhelmed";

export interface DebuffDef {
  id: DebuffId;
  name: string;
  /** Why she has it, for the journal and the toast. */
  cause: string;
  /** What it does at this level, in a line. */
  detail: (level: number) => string;
  /** How many nights it lasts, counting the one it starts in; 0 lasts until it's cleared. */
  nights: number;
  maxLevel: number;
  effect: (e: Effects, level: number) => void;
}

export interface Debuff {
  id: DebuffId;
  level: number;
  /** Nights left, this one included; 0 for one that lasts until it's cleared. */
  nights: number;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export const DEBUFFS: Record<DebuffId, DebuffDef> = {
  bruised: {
    id: "bruised",
    name: "Bruised",
    cause: "Knocked down in a brawl",
    detail: (level) =>
      `Saying no costs ${pct(0.25 * level)} more willpower · your hold is ${level} weaker (Consent off) · guests reach for you ${pct(0.15 * level)} more`,
    nights: 2,
    maxLevel: 2,
    effect: (e, level) => {
      e.refuseEase -= 0.25 * level;
      e.hold -= level;
      e.reach += 0.15 * level;
    },
  },
  inDebt: {
    id: "inDebt",
    name: "In the Baron's Debt",
    cause: "Couldn't pay the baron in full",
    detail: (level) => `Pay ${pct(0.1 * level)} less on every serve · guests wait ${pct(0.05 * level)} less: they know you're behind`,
    nights: 0,
    maxLevel: 3,
    effect: (e, level) => {
      e.payPct -= 0.1 * level;
      e.patience -= 0.05 * level;
    },
  },
  overwhelmed: {
    id: "overwhelmed",
    name: "Overwhelmed",
    cause: "Her willpower gave out in an after-hours game",
    detail: (level) => `Saying no costs ${pct(0.2 * level)} more willpower · guests reach for you ${pct(0.1 * level)} more: word's got round`,
    nights: 2,
    maxLevel: 3,
    effect: (e, level) => {
      e.refuseEase -= 0.2 * level;
      e.reach += 0.1 * level;
    },
  },
  watched: {
    id: "watched",
    name: "Under Watch",
    cause: "The garrison raided the tavern",
    detail: (level) => `Guests wait ${pct(0.15 * level)} less, eyeing the soldiers at the door · pay ${pct(0.05 * level)} less`,
    nights: 2,
    maxLevel: 2,
    effect: (e, level) => {
      e.patience -= 0.15 * level;
      e.payPct -= 0.05 * level;
    },
  },
};

export const DEBUFF_IDS = Object.keys(DEBUFFS) as DebuffId[];
