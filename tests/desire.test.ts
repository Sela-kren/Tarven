import { describe, expect, it } from "vitest";
import { desirePenalties, desireStep, horny, suppressCost, wet } from "../src/game/desire";
import { Fight, type FighterStats } from "../src/game/fight";
import { emptyMeters, type Meters } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
const fight = (desire: Partial<Meters> | null, extra: Partial<FighterStats> = {}, random = () => 0.99) =>
  new Fight(1, "farmer", false, { ...BASE, ...(desire ? { desire: meters(desire) } : {}), ...extra }, random);
const chance = (f: Fight, move: string) => f.choices().find((c) => c.move === move)?.chance ?? null;
const choice = (f: Fight, move: string) => f.choices().find((c) => c.move === move);

describe("desire rules", () => {
  it("steps up at 50 and again at 80 (horny)", () => {
    expect(desireStep(49)).toBe(0);
    expect(desireStep(50)).toBe(1);
    expect(desireStep(80)).toBe(2);
    expect(horny(meters({ butt: 80 }))).toBe(true);
    expect(horny(meters({ butt: 79 }))).toBe(false);
  });

  it("costs her something different for each desire", () => {
    const p = desirePenalties(meters({ mouth: 50, breasts: 80, pussy: 50, body: 80, butt: 50, cock: 80 }));
    expect(p.accuracy).toBeCloseTo(0.08);
    expect(p.dodge).toBeCloseTo(0.2);
    expect(p.voice).toBeCloseTo(0.08);
    expect(p.damage).toBe(2);
    expect(p.grapple).toBeCloseTo(0.1);
    expect(p.reach).toBeCloseTo(0.2);
  });

  it("needs less pleasure to be wet the higher her Pussy desire", () => {
    expect(wet(0, 49)).toBe(false);
    expect(wet(0, 50)).toBe(true);
    expect(wet(100, 25)).toBe(true);
    expect(wet(100, 24)).toBe(false);
  });

  it("makes suppressing dearer while horny, and Cock dearer than the rest", () => {
    expect(suppressCost(false, false)).toBe(4);
    expect(suppressCost(true, false)).toBe(6);
    expect(suppressCost(false, true)).toBe(6);
    expect(suppressCost(true, true)).toBe(9);
  });
});

describe("desire in a brawl", () => {
  it("plays no part in his brawls", () => {
    const f = fight(null);
    expect(f.desire).toBeNull();
    expect(choice(f, "suppress")).toBeUndefined();
    expect(choice(f, "hands")).toBeUndefined();
  });

  it("throws her aim off with Mouth desire, and her voice with Pussy desire", () => {
    const calm = fight({});
    const wanting = fight({ mouth: 80, pussy: 80 });
    expect(chance(wanting, "strike")!).toBeCloseTo(chance(calm, "strike")! - 0.16);
    expect(chance(wanting, "talk")!).toBeLessThan(chance(calm, "talk")!);
  });

  it("takes weight out of her blows with Body desire", () => {
    const calm = fight({}, {}, () => 0);
    const wanting = fight({ body: 80 }, {}, () => 0);
    calm.act("strike");
    wanting.act("strike");
    expect(calm.foeMax - calm.foeStamina).toBe(3);
    expect(wanting.foeMax - wanting.foeStamina).toBe(1);
  });

  it("lets their grapples stir the part their type goes for", () => {
    // Her strike misses (0.99), then their swing lands (0) as a grapple (0), a grab (0).
    const rolls = [0.99, 0, 0, 0];
    const f = fight({}, { prefers: "butt" }, () => rolls.shift() ?? 0.99);
    f.act("strike");
    expect(f.desire!.butt).toBe(5);
    expect(f.desire!.body).toBe(2);
    expect(f.log.some((line) => line.includes("Butt desire"))).toBe(true);
  });

  it("suppresses desire for willpower, Cock apart from the rest", () => {
    const f = fight({ mouth: 40, pussy: 30, cock: 40 });
    const will = f.will;
    f.act("suppress");
    expect(f.desire).toMatchObject({ mouth: 25, pussy: 15, cock: 40 });
    expect(f.will).toBeLessThanOrEqual(will - 4);
    f.act("suppressCock");
    expect(f.desire!.cock).toBe(25);
  });

  it("opens up her hands, mouth and riding them with Cock desire, and riding needs her wet", () => {
    expect(choice(fight({ cock: 39 }), "hands")?.disabled).toBe(true);
    expect(choice(fight({ cock: 40 }), "hands")?.disabled).toBe(false);
    expect(choice(fight({ cock: 60 }), "mouth")?.disabled).toBe(false);
    expect(choice(fight({ cock: 70, pussy: 0 }, { pleasure: 0 }), "ride")?.disabled).toBe(true);
    expect(choice(fight({ cock: 70, pussy: 100 }, { pleasure: 30 }), "ride")?.disabled).toBe(false);
  });

  it("can wear them out that way: a win, but a different kind", () => {
    const f = fight({ cock: 100, pussy: 100 }, { pleasure: 40 });
    for (let i = 0; i < 10 && !f.outcome; i++) f.act("ride");
    expect(f.outcome).toBe("won");
    expect(f.spent).toBe(true);
    expect(f.acts.ride).toBeGreaterThan(0);
    expect(f.pleasure).toBeLessThan(100);
  });
});

describe("desire between the tavern and a brawl", () => {
  it("goes in with her, and comes out with what the fight left", () => {
    const t = new Tavern(11);
    t.random = () => 0;
    t.playerBody = "Female";
    t.open();
    for (let i = 0; i < 40; i++) t.tick(0.1, { listeningTo: null, night: true });
    const guest = t.guests[0];
    t.guestArrived(guest.id);
    t.meters.cock = 100;
    t.meters.pussy = 100;
    t.pleasure = 40;
    t.startFight(guest.id);
    expect(t.fight?.desire?.cock).toBe(100);
    for (let i = 0; i < 10 && t.fight; i++) t.fightMove("ride");
    expect(t.fight).toBeNull();
    expect(t.takeFightResult()?.text).toMatch(/^Spent/);
    expect(t.records.acts.bed).toBeGreaterThan(0);
    expect(t.pleasure).toBeGreaterThan(40);
  });
});
