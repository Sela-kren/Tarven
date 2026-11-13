import { describe, expect, it } from "vitest";
import { Tavern } from "../src/game/tavern";

describe("scrubbing at the tub", () => {
  const idle = { listeningTo: null, night: false };

  it("shows she's scrubbing only while she's at the tub with empty hands and something in it", () => {
    const t = new Tavern(11);
    t.tick(0.1, { ...idle, scrubber: 0 });
    expect(t.scrubbing).toBe(false);
    t.tub.push("dish");
    t.tick(0.1, idle);
    expect(t.scrubbing).toBe(false);
    t.tick(0.1, { ...idle, scrubber: 0 });
    expect(t.scrubbing).toBe(true);
  });

  it("marks each dish as it comes out clean, for the sparkle", () => {
    const t = new Tavern(11);
    t.tub.push("dish");
    const clean = t.cleanWare.dish;
    expect(t.washedAt).toBe(-Infinity);
    for (let i = 0; i < 15; i++) t.tick(0.1, { ...idle, scrubber: 0 });
    expect(t.cleanWare.dish).toBe(clean + 1);
    expect(t.washedAt).toBeGreaterThan(-Infinity);
    expect(t.scrubbing).toBe(false);
  });
});
