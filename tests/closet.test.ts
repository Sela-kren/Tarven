import { describe, expect, it } from "vitest";
import { Tavern } from "../src/game/tavern";

describe("her closet", () => {
  it("lets her change by day, but not while the tavern's open", () => {
    const t = new Tavern(11);
    t.phase = "day";
    expect(t.prompt(0, { kind: "closet" })).toEqual({ label: "Change your clothes", actionable: true });
    t.phase = "service";
    expect(t.prompt(0, { kind: "closet" })).toEqual({ label: "No time to change now", actionable: false });
  });

  it("puts her in the new clothes, all of them on", () => {
    const t = new Tavern(11);
    t.stripped = 2;
    t.changeClothes("tavern", undefined, { bra: "fullcup", briefs: "hipster" });
    expect(t.playerOutfit).toBe("tavern");
    expect(t.playerLegwear).toBeUndefined();
    expect(t.playerUnder).toEqual({ bra: "fullcup", briefs: "hipster" });
    expect(t.stripped).toBe(0);
  });
});
