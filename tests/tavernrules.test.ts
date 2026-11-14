import { describe, expect, it } from "vitest";
import { noEffects } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";
import { TAVERN_RULES, TAVERN_RULE_BY_ID } from "../src/game/tavernrules";

const SEATS = 11;

describe("tavern rules", () => {
  it("each do something while they're on, each with its own id", () => {
    expect(new Set(TAVERN_RULES.map((r) => r.id)).size).toBe(TAVERN_RULES.length);
    const none = JSON.stringify(noEffects());
    for (const rule of TAVERN_RULES) {
      const e = noEffects();
      rule.effect(e);
      expect(JSON.stringify(e), rule.id).not.toBe(none);
    }
  });

  it("cost gold, and any corruption, once to adopt; after that they switch on and off for free", () => {
    const t = new Tavern(SEATS);
    t.gold = 100;
    const corruption = t.corruption;
    t.setRule("sergeant", true);
    expect(t.rules.has("sergeant")).toBe(true);
    expect(t.gold).toBe(100 - TAVERN_RULE_BY_ID.get("sergeant")!.cost);
    expect(t.corruption).toBe(corruption + 10);
    t.setRule("sergeant", false);
    t.setRule("sergeant", true);
    expect(t.gold).toBe(100 - TAVERN_RULE_BY_ID.get("sergeant")!.cost);
    expect(t.corruption).toBe(corruption + 10);
  });

  it("can't be adopted without the gold, or changed during service", () => {
    const t = new Tavern(SEATS);
    t.gold = 0;
    expect(t.canSetRule("backRoom")).toBe(false);
    t.gold = 100;
    t.phase = "service";
    expect(t.canSetRule("backRoom")).toBe(false);
  });

  it("take effect while on: Hands Off makes guests reach less, the Shorter Apron makes her lewder", () => {
    const t = new Tavern(SEATS);
    t.gold = 100;
    const lewd = t.lewdness;
    t.setRule("handsOff", true);
    expect(t.effects.reach).toBeCloseTo(-0.3);
    t.setRule("handsOff", false);
    expect(t.effects.reach).toBe(0);
    t.setRule("shorterApron", true);
    expect(t.lewdness).toBe(lewd + 5);
  });

  it("charge their upkeep every night", () => {
    const t = new Tavern(SEATS);
    t.gold = 100;
    t.setRule("bouncer", true);
    const gold = t.gold;
    t.phase = "bedtime";
    t.sleep();
    expect(t.gold).toBe(gold - 4);
  });

  it("are kept in a save, adopted and on", () => {
    const t = new Tavern(SEATS);
    t.gold = 100;
    t.setRule("waterAle", true);
    t.setRule("bouncer", true);
    t.setRule("bouncer", false);
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect([...loaded.rules]).toEqual(["waterAle"]);
    expect(loaded.rulesAdopted.has("bouncer")).toBe(true);
    expect(loaded.effects.payPct).toBeCloseTo(0.1);
  });
});
