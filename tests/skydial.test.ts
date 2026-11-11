import { describe, expect, it } from "vitest";
import { moonAt, sunAt } from "../src/game/skydial";

describe("the sky clock", () => {
  it("rises the sun on the left at 6 AM, peaks at noon, and sets on the right at 6 PM", () => {
    const rise = sunAt(6);
    const noon = sunAt(12);
    const set = sunAt(18);
    expect(rise.up).toBeCloseTo(0);
    expect(set.up).toBeCloseTo(0);
    expect(rise.x).toBeLessThan(noon.x);
    expect(set.x).toBeGreaterThan(noon.x);
    expect(noon.up).toBeCloseTo(1);
    expect(noon.y).toBeLessThan(rise.y);
  });

  it("has the sun down at night and the moon up, and the other way round by day", () => {
    expect(sunAt(0).up).toBeLessThan(0);
    expect(moonAt(0).up).toBeCloseTo(1);
    expect(moonAt(12).up).toBeLessThan(0);
  });
});
