import { describe, expect, it } from "vitest";
import { Tavern } from "../src/game/tavern";

describe("washing at the tub", () => {
  it("is one press with empty hands: the whole tub, and a sparkle", () => {
    const t = new Tavern(11);
    t.tub.push("dish", "cup", "dish");
    const clean = { ...t.cleanWare };
    expect(t.washedAt).toBe(-Infinity);
    expect(t.prompt(0, { kind: "station", station: "wash" })?.label).toBe("Wash the 3 dirty dishes");
    t.interact(0, { kind: "station", station: "wash" });
    expect(t.tub).toHaveLength(0);
    expect(t.cleanWare).toEqual({ cup: clean.cup + 1, dish: clean.dish + 2 });
    expect(t.washedAt).toBeGreaterThan(-Infinity);
    expect(t.prompt(0, { kind: "station", station: "wash" })).toBeNull();
  });
});
