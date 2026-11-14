import { describe, expect, it } from "vitest";
import { CUP_TOP } from "../src/game/appearance";
import { BUILT_HEFT, heftedSpring, softHeft } from "../src/game/heft";

const SPRING = { frequency: 2.3, damping: 0.2, gain: 0.0038, axes: [0.35, 1, 0.3] as const, limit: 0.033 };

describe("how heavy her soft parts are", () => {
  it("is as built with the sliders at rest", () => {
    expect(softHeft({})).toEqual(BUILT_HEFT);
    expect(heftedSpring(SPRING, 1)).toBe(SPRING);
  });

  it("grows with the cup and the rear, and shrinks with them", () => {
    const full = softHeft({ bust: 1, rear: 1 });
    const small = softHeft({ bust: -1, rear: -1 });
    expect(full.bust).toBeGreaterThan(2);
    expect(full.rear).toBeGreaterThan(1.5);
    expect(small.bust).toBeLessThan(0.5);
    expect(small.rear).toBeLessThan(0.6);
    // The cup goes on past Q to Z, heavier still, and no further.
    const z = softHeft({ bust: CUP_TOP }).bust;
    expect(z).toBeGreaterThan(full.bust);
    expect(softHeft({ bust: 5 }).bust).toBeCloseTo(z);
    expect(softHeft({ rear: 5 }).rear).toBeCloseTo(full.rear);
  });

  it("makes a heavier part swing further and slower, and a lighter one tighter", () => {
    const heavy = heftedSpring(SPRING, 2);
    expect(heavy.gain).toBeGreaterThan(SPRING.gain);
    expect(heavy.limit).toBeGreaterThan(SPRING.limit);
    expect(heavy.frequency).toBeLessThan(SPRING.frequency);
    expect(heavy.frequency).toBeGreaterThan(SPRING.frequency * 0.8); // still keeps up with her steps
    const light = heftedSpring(SPRING, 0.5);
    expect(light.gain).toBeLessThan(SPRING.gain);
    expect(light.frequency).toBeGreaterThan(SPRING.frequency);
  });
});
