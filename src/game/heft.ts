import { CUP_TOP } from "./appearance";
import type { SpringSettings } from "./jiggle";

/**
 * How heavy her soft parts are, from her look: 1 as built (a C cup, the rear as made), more for a fuller bust or
 * rear. A heavier part swings further and a little slower, like more weight on the same spring.
 */
export interface SoftHeft {
  bust: number;
  rear: number;
}

export const BUILT_HEFT: SoftHeft = { bust: 1, rear: 1 };

/**
 * How much heavier each part gets at the end of its slider: the cup at Q (+1) or A (-1), the rear's size at its
 * ends. A Q cup swings about twice as far as the C she's built with, a Z nearly three times; an A, under half.
 */
const BUST_HEFT = { more: 1.1, less: 0.55 };
const REAR_HEFT = { more: 0.7, less: 0.45 };

const heftAt = (value: number | undefined, ends: { more: number; less: number }, top = 1) => {
  const v = Math.min(top, Math.max(-1, value ?? 0));
  return v >= 0 ? 1 + ends.more * v : 1 + ends.less * v;
};

/**
 * The heft of her bust and rear for these slider settings (the "bust" and "rear" sliders, -1 to 1; the cup goes on
 * past 1 to Z, and grows heavier by as much again for each cup).
 */
export function softHeft(sliders: Readonly<Record<string, number | undefined>>): SoftHeft {
  return { bust: heftAt(sliders.bust, BUST_HEFT, CUP_TOP), rear: heftAt(sliders.rear, REAR_HEFT) };
}

/**
 * A spring as it is under a heavier or lighter part: it lags further (gain) and may swing further (limit), and it
 * bounces slower, as a weight on a spring does (by the fourth root here, so a large bust still keeps up with
 * her steps instead of wallowing).
 */
export function heftedSpring(base: SpringSettings, heft: number): SpringSettings {
  if (heft === 1) return base;
  return {
    ...base,
    frequency: base.frequency / heft ** 0.25,
    gain: base.gain * heft,
    limit: base.limit * heft ** 0.75,
  };
}
