import { describe, expect, it } from "vitest";
import { Duel, type DuelistStats } from "../src/game/duel";
import { Fight, type FighterStats } from "../src/game/fight";
import { effectsOf, emptyMeters } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";
import {
  BASE_WILLPOWER,
  DRINK_WILL,
  HOLD_WILL,
  maxWillpower,
  NAP_RESTORE,
  refuseCost,
  STARE_WILL,
  STEEL_WILL,
  willLabel,
  WILLPOWER_PER_MIND,
} from "../src/game/willpower";

const FIGHTER: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const DUELIST: DuelistStats = { level: () => 1, sens: emptyMeters(), power: 0, resist: 0, stamina: 0, hold: 0, edge: 0, undress: 0 };

/** Reaches into the tavern for what only conversations do in play: a drink, and a new morning. */
const inner = (t: Tavern) => t as unknown as { takeDrink(): void; openDay(): void };

describe("willpower", () => {
  it("grows with Mind and passives", () => {
    expect(maxWillpower(1)).toBe(BASE_WILLPOWER);
    expect(maxWillpower(3)).toBe(BASE_WILLPOWER + 2 * WILLPOWER_PER_MIND);
    expect(maxWillpower(1, 10)).toBe(BASE_WILLPOWER + 10);
    expect(effectsOf(new Set(["ironWill"])).willMax).toBe(10);
  });

  it("costs nothing to say no when she isn't tempted, and more the more she wants it and the bolder it is", () => {
    expect(refuseCost(0, 9)).toBe(0);
    expect(refuseCost(1, 5)).toBe(6);
    expect(refuseCost(2, 5)).toBe(9);
    expect(refuseCost(1, 8)).toBeGreaterThan(refuseCost(1, 2));
  });

  it("reads as a word", () => {
    expect(willLabel(30, 30)).toBe("Steady");
    expect(willLabel(5, 30)).toBe("Fraying");
    expect(willLabel(0, 30)).toBe("Spent");
  });
});

describe("willpower in a brawl", () => {
  it("pays for staring them down, and can't once it's gone", () => {
    const fight = new Fight(-1, "farmer", false, { ...FIGHTER, will: STARE_WILL }, () => 0.99);
    expect(fight.choices().find((c) => c.move === "stare")?.disabled).toBe(false);
    fight.act("stare");
    expect(fight.will).toBe(0);
    expect(fight.choices().find((c) => c.move === "stare")?.disabled).toBe(true);
  });

  it("buys her breath back when she steels herself", () => {
    const fight = new Fight(-1, "soldier", false, FIGHTER, () => 0);
    fight.act("dodge");
    const hurt = fight.stamina;
    expect(hurt).toBeLessThan(fight.maxStamina);
    const will = fight.will;
    fight.act("steel");
    expect(fight.will).toBeLessThan(will - STEEL_WILL + 1);
    expect(fight.log.some((l) => l.includes("get your breath back"))).toBe(true);
  });

  it("wears down when a blow lands", () => {
    const fight = new Fight(-1, "soldier", false, FIGHTER, () => 0);
    fight.act("dodge");
    expect(fight.will).toBeLessThan(fight.maxWill);
  });
});

describe("willpower after hours", () => {
  it("pays for holding back, and with too little left only Stop is there to end it", () => {
    const duel = new Duel("farmer", new Set(), 10, { ...DUELIST, will: HOLD_WILL.calm }, () => 0.99);
    expect(duel.choices().find((c) => c.move === "hold")?.disabled).toBe(false);
    duel.act("hold");
    expect(duel.will).toBe(0);
    const hold = duel.choices().find((c) => c.move === "hold");
    expect(hold?.disabled).toBe(true);
    expect(hold?.label).toContain("no willpower left");
    expect(duel.choices().find((c) => c.move === "stop")?.disabled).toBe(false);
  });

  it("costs more to hold back the more worked up she is", () => {
    const duel = new Duel("farmer", new Set(), 10, DUELIST, () => 0.99);
    expect(duel.holdCost()).toBe(HOLD_WILL.calm);
    duel.pleasure = 85;
    expect(duel.holdCost()).toBe(HOLD_WILL.edge);
  });
});

describe("willpower in the tavern", () => {
  it("starts full, drains with drink, comes partly back with a nap and all back by morning", () => {
    const t = new Tavern(4);
    expect(t.willpower).toBe(t.maxWillpower);
    for (let i = 0; i < 4; i++) inner(t).takeDrink();
    expect(t.willpower).toBe(t.maxWillpower - 4 * DRINK_WILL);
    t.nap();
    expect(t.willpower).toBe(Math.min(t.maxWillpower, t.maxWillpower - 4 * DRINK_WILL + Math.round(t.maxWillpower * NAP_RESTORE)));
    for (let i = 0; i < 8; i++) inner(t).takeDrink();
    expect(t.willpower).toBeLessThan(t.maxWillpower);
    inner(t).openDay();
    expect(t.willpower).toBe(t.maxWillpower);
  });

  it("goes into a brawl, and she comes out of it with what's left", () => {
    const t = new Tavern(4);
    t.random = () => 0;
    t.startTestFight();
    expect(t.fight?.will).toBe(t.maxWillpower);
    for (let i = 0; i < 40 && t.fight; i++) t.fightMove(i === 0 ? "stare" : "strike");
    expect(t.fight).toBeNull();
    expect(t.willpower).toBeLessThanOrEqual(t.maxWillpower - STARE_WILL);
  });
});
