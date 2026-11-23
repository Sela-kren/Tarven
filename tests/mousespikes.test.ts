import { describe, expect, it } from "vitest";
import { MouseSpikes } from "../src/game/viewmode";

describe("mouse look spike filter", () => {
  it("passes ordinary moves untouched", () => {
    const spikes = new MouseSpikes();
    for (let i = 0; i < 20; i++) expect(spikes.filter(12, -3, i * 8)).toEqual([12, -3]);
  });

  it("drops one wild jump in the middle of a turn (the view snapping back)", () => {
    const spikes = new MouseSpikes();
    for (let i = 0; i < 10; i++) spikes.filter(25, 0, i * 8);
    expect(spikes.filter(-900, 40, 80)).toEqual([0, 0]);
    expect(spikes.filter(25, 0, 88)).toEqual([25, 0]);
  });

  it("lets a real fast flick through, even one that starts big", () => {
    const spikes = new MouseSpikes();
    const passed = [180, 220, 260, 240, 200].map((dx, i) => spikes.filter(dx, 0, i * 8)[0]);
    // At most the very first move of the flick is held back.
    expect(passed.slice(1).every((dx) => dx > 0)).toBe(true);
    // A steadily fast flick goes through whole.
    const fast = new MouseSpikes();
    const ramp = [40, 90, 150, 220, 300, 320].map((dx, i) => fast.filter(dx, 0, i * 8)[0]);
    expect(ramp).toEqual([40, 90, 150, 220, 300, 320]);
  });
});
