/**
 * Karryn-style desire rules, shared by brawls, upstairs and the dev panel.
 *
 * - Desire gets in her way: each desire at 50+ costs her something in a brawl, twice as much at 80+ (horny).
 *   Mouth: her aim. Breasts: her dodge. Pussy: her voice (talking and staring them down). Body: the weight behind
 *   her blows. Butt: they grapple her more. Cock: a worked-up foe reaches for her more, and once it burns, any foe
 *   might.
 * - She can push it down: Suppress desire (everything but Cock) and Suppress Cock desire, paid in willpower, and
 *   dearer while she's horny.
 * - Cock desire gates what she does with her own hands and mouth: in a brawl, to wear them out; upstairs too.
 *   Riding them needs her wet as well: pleasure enough, sooner the higher her Pussy desire.
 * - A guest's type goes for one part of her (their `prefers`): their grapples raise that desire.
 */
import type { DuelArea } from "./duel";
import { METERS, type Meter, type Meters } from "./passives";

/** A desire this high starts to get in her way in a fight. */
export const DESIRE_STRONG = 50;
/** A desire this high and she's horny: its penalty doubles, and suppressing costs more. */
export const HORNY_AT = 80;

/** 0 under 50, 1 from 50, 2 from 80. */
export function desireStep(value: number): 0 | 1 | 2 {
  return value >= HORNY_AT ? 2 : value >= DESIRE_STRONG ? 1 : 0;
}

export function horny(desire: Readonly<Meters>): boolean {
  return METERS.some((m) => desire[m] >= HORNY_AT);
}

/** What her desire costs her in a brawl, all at once. */
export interface DesirePenalties {
  /** Off the chance of every attack she makes (Mouth). */
  accuracy: number;
  /** Off a dodge (Breasts). */
  dodge: number;
  /** Off talking or staring them down (Pussy). */
  voice: number;
  /** Off the damage of her blows (Body). */
  damage: number;
  /** On their chance to grapple rather than punch (Butt). */
  grapple: number;
  /** On a foe's chance to reach for her (Cock). */
  reach: number;
}

export function desirePenalties(desire: Readonly<Meters>): DesirePenalties {
  return {
    accuracy: 0.08 * desireStep(desire.mouth),
    dodge: 0.1 * desireStep(desire.breasts),
    voice: 0.08 * desireStep(desire.pussy),
    damage: desireStep(desire.body),
    grapple: 0.1 * desireStep(desire.butt),
    reach: 0.1 * desireStep(desire.cock),
  };
}

/** Pleasure she needs to be wet with no Pussy desire; every 4 points of it takes 1 off. */
export const WET_PLEASURE = 50;

/** Wet: pleasure enough, and the higher her Pussy desire, the less it takes (50 with none, 25 at 100). */
export function wet(pussy: number, pleasure: number): boolean {
  return pleasure >= WET_PLEASURE - pussy / 4;
}

/** Willpower to suppress: everything but Cock, or Cock alone; half as much again while horny. */
export const SUPPRESS_WILL = 4;
export const SUPPRESS_COCK_WILL = 6;
export function suppressCost(cock: boolean, isHorny: boolean): number {
  const base = cock ? SUPPRESS_COCK_WILL : SUPPRESS_WILL;
  return isHorny ? Math.ceil(base * 1.5) : base;
}

/** How far a suppress brings each desire down: more the cooler her head. */
export function suppressAmount(mind: number): number {
  return 15 + Math.max(0, mind - 1) * 3;
}

/** The meter for each part a guest's type goes for. */
export const METER_OF_AREA: Record<DuelArea, Meter> = { hands: "body", mouth: "mouth", breasts: "breasts", butt: "butt", pussy: "pussy" };

/** What she can do with them in a brawl, and the Cock desire each needs. */
export type IntimateMove = "hands" | "mouth" | "ride";
export const INTIMATE_MOVES: Record<
  IntimateMove,
  { label: string; cock: number; wet?: boolean; drain: number; pleasure: number; desire: Partial<Meters>; text: string }
> = {
  hands: {
    label: "Use your hands on them",
    cock: 40,
    drain: 5,
    pleasure: 4,
    desire: { cock: 6, body: 3 },
    text: "You slip a hand down the front of their breeches and work them till their knees shake.",
  },
  mouth: {
    label: "Use your mouth on them",
    cock: 60,
    drain: 8,
    pleasure: 6,
    desire: { cock: 8, mouth: 6 },
    text: "You drop to your knees right there among the benches. They forget all about fighting.",
  },
  ride: {
    label: "Ride them",
    cock: 70,
    wet: true,
    drain: 12,
    pleasure: 12,
    desire: { cock: 10, pussy: 10 },
    text: "You push them down onto a bench and climb on. The room goes very quiet.",
  },
};
