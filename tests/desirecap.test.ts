import { describe, expect, it } from "vitest";
import { DESIRE_CAPS, DESIRE_CAP_UNLOCK, desireCap, effectsOf, newlyEarned, noEffects, PASSIVE_BY_ID } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";

/** Karryn's Prison's max desire (passives.ts desireCap): low at first, lifted by reaching it. */
describe("desire caps", () => {
  it("start low, and two passives per meter lift them", () => {
    expect(desireCap(noEffects(), "mouth")).toBe(DESIRE_CAPS[0]);
    expect(desireCap(effectsOf(new Set(["cap1_mouth"])), "mouth")).toBe(DESIRE_CAPS[1]);
    expect(desireCap(effectsOf(new Set(["cap1_mouth", "cap2_mouth"])), "mouth")).toBe(DESIRE_CAPS[2]);
    // Each meter has its own.
    expect(desireCap(effectsOf(new Set(["cap1_mouth", "cap2_mouth"])), "pussy")).toBe(DESIRE_CAPS[0]);
  });

  it("keep the boldest scenes out of reach until they're lifted", () => {
    // The 80s a foe needs for her mouth, breasts, pussy or rear (brawlai.ts SCENE_NEEDS) are past the first two caps.
    expect(DESIRE_CAPS[0]).toBeLessThan(80);
    expect(DESIRE_CAPS[1]).toBeLessThan(80);
    expect(DESIRE_CAPS[2]).toBeGreaterThanOrEqual(80);
  });

  it("hold a meter down in the tavern", () => {
    const t = new Tavern(4);
    t.playerBody = "Female";
    t.open();
    (t as unknown as { raise(m: string, n: number): void }).raise("mouth", 200);
    expect(t.meters.mouth).toBe(DESIRE_CAPS[0]);
  });

  it("are lifted by reaching them on a night, from the next one", () => {
    expect(PASSIVE_BY_ID.get("cap1_pussy")).toBeDefined();
    const t = new Tavern(4);
    t.records.best.pussy = DESIRE_CAP_UNLOCK[0];
    const earned = newlyEarned(new Set(), {
      records: t.records,
      lets: {},
      drinks: 0,
      sold: 0,
      informed: 0,
      protected: 0,
      fame: 0,
      trust: 0,
      trustMax: 10,
      lewdness: 0,
      corruption: 0,
      levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 },
      herLevel: 1,
      slutLevel: 0,
    }).map((p) => p.id);
    expect(earned).toContain("cap1_pussy");
    expect(earned).not.toContain("cap2_pussy");
  });
});
