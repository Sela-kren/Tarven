/**
 * Willpower, the way Karryn's Prison has it: how much she has left in her to keep a cool head. It fills to the
 * top every morning, a nap gives some back, and the night wears it down.
 *
 * What it pays for:
 * - Turning a guest away when part of her wants the touch. Saying no when she isn't tempted costs nothing (it
 *   even steadies her); saying no when she is costs willpower, more the more she wants it and the bolder the touch.
 *   With too little left she can still say no, always, but it shows: she gets no respect for it.
 * - Staring a brawler down, and steeling herself to get her breath back mid-fight.
 * - Holding back in an after-hours game. With none left, she can't hold back any more (Stop still ends it).
 *
 * What wears it down: letting touches happen, leaning in more so; drinking; taking a blow in a brawl.
 * Mind raises how much she has; some composure passives raise it further.
 *
 * Kept apart from the rules that use it, so it can be tested.
 */

/** Willpower at Mind 1, and what each Mind level past it adds. */
export const BASE_WILLPOWER = 30;
export const WILLPOWER_PER_MIND = 5;

/** A nap gives back this share of her willpower. */
export const NAP_RESTORE = 0.5;
/** Each drink costs this much. */
export const DRINK_WILL = 3;
/** Letting a touch happen, and leaning into one. */
export const ALLOW_WILL = 1;
export const LEAN_WILL = 2;
/** Turning away a touch she didn't want steadies her by this much. */
export const STEADY_WILL = 1;

/** In a brawl: staring someone down, steeling yourself, and what a blow that lands takes. */
export const STARE_WILL = 4;
export const STEEL_WILL = 6;
export const HIT_WILL = 1;
/** Steeling yourself gives back this much stamina, plus one per Mind level past 1. */
export const STEEL_STAMINA = 4;

/** In an after-hours game: what holding back costs as she gets more worked up, and what a second wind gives back. */
export const HOLD_WILL = { calm: 4, aroused: 6, edge: 8 } as const;
export const SECOND_WIND_WILL = 5;
/** On the edge with nothing left to hold it back with, their moves do this much more to her. */
export const SPENT_EDGE = 0.1;

/** How much willpower she has at the top, for her Mind level and whatever her passives add. */
export function maxWillpower(mind: number, bonus = 0): number {
  return Math.max(1, BASE_WILLPOWER + Math.max(0, mind - 1) * WILLPOWER_PER_MIND + bonus);
}

/**
 * What saying no to a touch costs: nothing when she isn't tempted (tier 0), and when she is, three a step of
 * temptation (torn is 1, wanting it is 2) plus half the touch's boldness, rounded up.
 */
export function refuseCost(tier: number, boldness: number): number {
  if (tier <= 0) return 0;
  return tier * 3 + Math.ceil(boldness / 2);
}

/** What she can afford, as a word, for the HUD and the status boards. */
export function willLabel(now: number, max: number): string {
  const share = max > 0 ? now / max : 0;
  if (share <= 0) return "Spent";
  if (share < 0.25) return "Fraying";
  if (share < 0.6) return "Holding";
  return "Steady";
}
