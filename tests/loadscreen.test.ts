import { describe, expect, it } from "vitest";
import { DownloadTally, LOAD_SHARES, progressAt } from "../src/game/loadscreen";

describe("the loading bar", () => {
  it("fills step by step, and reaches the end", () => {
    expect(progressAt("download", 0)).toBe(0);
    expect(progressAt("download", 1)).toBeCloseTo(LOAD_SHARES.download);
    expect(progressAt("world", 0)).toBeCloseTo(LOAD_SHARES.download);
    expect(progressAt("shaders", 1)).toBeCloseTo(1);
    // Never past a step's own share, never backwards.
    expect(progressAt("download", 5)).toBeCloseTo(LOAD_SHARES.download);
    expect(progressAt("game", -1)).toBeCloseTo(LOAD_SHARES.download + LOAD_SHARES.world);
    expect(Object.values(LOAD_SHARES).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("counts the downloads by their bytes, once their sizes are known", () => {
    const tally = new DownloadTally(["big", "small"]);
    expect(tally.fraction).toBe(0);
    expect(tally.megabytes).toBeNull();
    tally.update("big", 0, 9_000_000);
    tally.update("small", 500_000, 1_000_000);
    expect(tally.fraction).toBeCloseTo(0.05);
    tally.done("small");
    tally.update("big", 4_500_000, 9_000_000);
    expect(tally.fraction).toBeCloseTo(0.55);
    expect(tally.megabytes).toBe("5.2 of 9.5 MB");
    tally.done("big");
    expect(tally.fraction).toBe(1);
  });
});
