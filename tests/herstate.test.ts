import { describe, expect, it } from "vitest";
import { Fight, type FighterStats } from "../src/game/fight";
import { statsOf } from "../src/game/guestroles";
import {
  BASE_ENERGY,
  brawlFatigue,
  BREATHE,
  DEFENSIVE,
  duelFatigue,
  ENERGY_COST,
  FATIGUE_GAIN,
  fatigueLevel,
  maxEnergy,
  REVITALIZE_STAMINA,
} from "../src/game/herstate";
import { Tavern } from "../src/game/tavern";

const LEVELS = { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 };
const BASE: FighterStats = { levels: LEVELS, damage: 0, dodge: 0, talk: 0, stare: 0, energy: 30, maxEnergy: 30 };
const fight = (extra: Partial<FighterStats>, random: () => number) => new Fight(1, "farmer", false, { ...BASE, ...extra }, random);
/** Rolls one after another, then the last for good. */
const rolls = (...list: number[]) => {
  let n = 0;
  return () => list[Math.min(n++, list.length - 1)];
};

describe("her energy and fatigue, Karryn's Prison style", () => {
  it("energy from Mind and Endurance; fatigue levels at 25, 35, 45, 55 and 65", () => {
    expect(maxEnergy(LEVELS)).toBe(BASE_ENERGY);
    expect(maxEnergy({ ...LEVELS, mind: 3, endurance: 2 })).toBe(BASE_ENERGY + 6);
    expect([0, 24, 25, 35, 45, 55, 65, 100].map(fatigueLevel)).toEqual([0, 0, 1, 2, 3, 4, 5, 5]);
    expect(brawlFatigue(1, 0, 0)).toBe(FATIGUE_GAIN.brawl);
    expect(brawlFatigue(3, 8, 1)).toBe(FATIGUE_GAIN.brawl + 2 * FATIGUE_GAIN.perFoe + 2 + FATIGUE_GAIN.climax);
    expect(duelFatigue(1, 0)).toBe(FATIGUE_GAIN.duel);
  });

  it("Revitalize buys stamina with energy; Breathe gets a little energy back", () => {
    const f = fight({}, () => 0.99);
    f.stamina = 5;
    f.act("revitalize");
    expect(f.stamina).toBe(5 + REVITALIZE_STAMINA);
    expect(f.energy).toBe(30 - ENERGY_COST.revitalize);
    f.act("breathe");
    expect(f.energy).toBe(30 - ENERGY_COST.revitalize + BREATHE.energy);
  });

  it("no energy to her name, no energy skills", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, energy: undefined, maxEnergy: undefined }, () => 0.99);
    expect(f.choices().some((c) => c.move === "revitalize" || c.move === "cautious")).toBe(false);
  });

  it("a stance doesn't take her turn, and holds a few turns", () => {
    const f = fight({}, () => 0.99);
    const before = f.events.length;
    f.act("cautious");
    expect(f.stance).toBe("cautious");
    expect(f.events.slice(before).some((e) => e.startsWith("their:"))).toBe(false);
    expect(f.energy).toBe(30 - ENERGY_COST.cautious);
    for (let i = 0; i < 4; i++) f.act("dodge");
    expect(f.stance).toBeNull();
  });

  it("Cautious Stance throws their aim off", () => {
    const aim = statsOf("farmer").fight.accuracy;
    // Her move's roll (talking, which fails), then theirs: just under their aim, so it lands unless she's cautious; then a fist.
    const plain = fight({}, rolls(0.99, aim - 0.05, 0.99));
    plain.act("talk");
    expect(plain.events).toContain("their:hit");
    const careful = fight({}, rolls(0.99, aim - 0.05, 0.99));
    careful.act("cautious");
    careful.act("talk");
    expect(careful.events).toContain("their:miss");
  });

  it("Counter Stance: when they miss, she hits back", () => {
    const f = fight({}, () => 0.99);
    f.act("counter");
    const stamina = f.foeStamina;
    f.act("dodge");
    expect(f.events).toContain("counter");
    expect(f.foeStamina).toBeLessThan(stamina);
  });

  it("Defensive Stance: their blows take less out of her", () => {
    const plain = fight({}, rolls(0.5, 0, 0.99));
    plain.act("dodge");
    const careful = fight({}, rolls(0.5, 0, 0.99));
    careful.act("defensive");
    careful.act("dodge");
    expect(careful.stamina - plain.stamina).toBe(DEFENSIVE.damage);
  });

  it("down with no stamina left: a Second Wind, once, if she has the energy; else she's lost", () => {
    const f = fight({}, rolls(0.5, 0, 0.99));
    f.stamina = 1;
    f.act("dodge");
    expect(f.downed).toBe(true);
    expect(f.outcome).toBeNull();
    expect(f.choices().map((c) => c.move)).toEqual(["secondWind", "stayDown"]);
    f.act("secondWind");
    expect(f.stamina).toBe(Math.ceil(f.maxStamina / 2));
    expect(f.energy).toBe(30 - ENERGY_COST.secondWind);
    f.stamina = 1;
    (f as unknown as { random: () => number }).random = rolls(0.5, 0, 0.99);
    f.act("dodge");
    expect(f.outcome).toBe("lost");
    const g = fight({}, rolls(0.5, 0, 0.99));
    g.stamina = 1;
    g.act("dodge");
    g.act("stayDown");
    expect(g.outcome).toBe("lost");
  });

  it("fatigue takes something off what she can do (KP: 10% a level)", () => {
    const fresh = fight({}, () => 0.99);
    const tired = fight({ fatigue: 3 }, () => 0.99);
    const chance = (f: Fight) => f.choices().find((c) => c.move === "strike")!.chance!;
    expect(chance(fresh) - chance(tired)).toBeCloseTo(0.09);
    const hit = (f: Fight) => {
      const before = f.foeStamina;
      (f as unknown as { random: () => number }).random = rolls(0, 0.99, 0.99);
      f.act("strike");
      return before - f.foeStamina;
    };
    expect(hit(tired)).toBeLessThan(hit(fresh));
  });

  it("the tavern starts her full of energy, and reads her fatigue as a level", () => {
    const t = new Tavern(11);
    expect(t.energy).toBe(t.maxEnergy);
    t.fatigue = 40;
    expect(t.fatigueLevel).toBe(2);
  });
});
