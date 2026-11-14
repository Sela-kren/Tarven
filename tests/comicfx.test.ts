import { describe, expect, it } from "vitest";
import { bubblePath, duelHeat, fxPlan, MOANS, touchHeat, type FxFacts } from "../src/game/comicfx";

const facts = (over: Partial<FxFacts>): FxFacts => ({ answer: "allow", region: "chest", heat: 0.5, brawl: false, hard: false, face: true, ...over });
const first = () => 0;

describe("the comic effects over the touch panel", () => {
  it("work her up more for leaning in than for letting it, and more for a bolder touch", () => {
    expect(touchHeat("lean", 5)).toBeGreaterThan(touchHeat("allow", 5));
    expect(touchHeat("allow", 9)).toBeGreaterThan(touchHeat("allow", 2));
    expect(touchHeat("slap", 10)).toBe(0);
    expect(touchHeat("lean", 10)).toBeLessThanOrEqual(1);
  });

  it("follow a duel's state from calm to the edge", () => {
    expect(duelHeat("calm")).toBeLessThan(duelHeat("aroused"));
    expect(duelHeat("edge")).toBe(1);
  });

  it("catch her out on a light touch: a startled word, no steam, no sweat", () => {
    const plan = fxPlan(facts({ heat: 0.25 }), first);
    expect(plan.moan?.text).toBe(MOANS.startled[0]);
    expect(plan.moan?.loud).toBe(false);
    expect(plan.steam).toBe(0);
    expect(plan.sweat).toBe(0);
    expect(plan.focus).toBe(false);
  });

  it("steam her breath and quiver once she's worked up, with a soft moan", () => {
    const plan = fxPlan(facts({ heat: 0.6 }), first);
    expect(plan.steam).toBeGreaterThan(0);
    expect(plan.quiver).toBe(true);
    expect(plan.sweat).toBe(1);
    expect(MOANS.soft).toContain(plan.moan?.text);
  });

  it("at the edge: thick steam off her mouth and skin, a loud moan, hearts, sweat and focus lines", () => {
    const plan = fxPlan(facts({ answer: "lean", heat: 1 }), first);
    expect(plan.steam).toBe(1);
    expect(plan.skinSteam).toBe(1);
    expect(plan.moan?.loud).toBe(true);
    expect(MOANS.loud).toContain(plan.moan?.text);
    expect(plan.hearts).toBeGreaterThan(0);
    expect(plan.sweat).toBe(3);
    expect(plan.focus).toBe(true);
  });

  it("only blush lines on a face the camera can see", () => {
    expect(fxPlan(facts({ heat: 0.6, face: false })).blushLines).toBe(false);
    expect(fxPlan(facts({ heat: 0.6, face: true })).blushLines).toBe(true);
  });

  it("give a slap a starburst and nothing lewd", () => {
    const plan = fxPlan(facts({ answer: "slap", heat: 0.9, hard: true }));
    expect(plan.burst).toBe(true);
    expect(plan.moan).toBeNull();
    expect(plan.steam + plan.hearts + plan.sweat).toBe(0);
  });

  it("keep a brawl to its hits and her sweat", () => {
    const hit = fxPlan(facts({ brawl: true, hard: true, heat: 1 }));
    expect(hit).toMatchObject({ burst: true, sweat: 1, steam: 0, hearts: 0, moan: null, focus: false, quiver: false });
    expect(fxPlan(facts({ brawl: true, answer: "pull", hard: false })).burst).toBe(false);
  });

  it("draw a bubble as a closed lumpy cloud", () => {
    const d = bubblePath(true, () => 0.5);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.endsWith(" Z")).toBe(true);
    expect(d.match(/Q /g)?.length).toBe(16);
    expect(bubblePath(false).match(/Q /g)?.length).toBe(11);
  });
});
