import { describe, expect, it } from "vitest";
import { MAX_EXTRA_GUESTS, NIGHTS, Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };

/** A tavern on `night`, with `setup` done in the day, rung open and into service: tonight's crowd is rolled. */
function tonight(roll: () => number, night = 0, setup: (t: Tavern) => void = () => {}): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = roll;
  t.nightIndex = night;
  setup(t);
  t.open();
  t.tick(0, idle);
  return t;
}
/** Rolls that go round the same few numbers, as a stand-in for chance. */
const cycle = (...rolls: number[]) => {
  let i = 0;
  return () => rolls[i++ % rolls.length];
};
const buyAll = (t: Tavern) => {
  t.upgrades.add("quicktap").add("bigpot").add("cushions");
  t.stock.cup = 12;
  t.stock.dish = 12;
  t.bottles.add("wine").add("mead").add("vodka");
};

describe("the night's crowd", () => {
  it("is the night as written without anything to roll it", () => {
    const plain = new Tavern(TABLES.length, TABLES);
    plain.crowdRandom = null;
    plain.open();
    plain.tick(0, idle);
    expect(plain.tonight.map((a) => [a.at, a.kind])).toEqual(NIGHTS[0].guests.map((a) => [a.at, a.kind]));
  });

  it("always keeps the night's parties and whoever brings the rumor", () => {
    for (const roll of [0, 0.5, 0.99]) {
      const t = tonight(() => roll, 1);
      for (const a of NIGHTS[1].guests.filter((g) => g.party !== undefined || g.rumor)) {
        expect(t.tonight.some((g) => g.kind === a.kind && g.party === a.party && g.at === a.at && g.rumor === a.rumor)).toBe(true);
      }
    }
  });

  it("isn't the same twice: guests on their own come as other kinds, later, or not at all", () => {
    const one = tonight(cycle(0.1, 0.9, 0.6, 0.3), 1).tonight.map((a) => `${a.kind}@${a.at.toFixed(1)}`);
    const two = tonight(cycle(0.7, 0.2, 0.95, 0.5), 1).tonight.map((a) => `${a.kind}@${a.at.toFixed(1)}`);
    expect(one).not.toEqual(two);
    // A roll at the top: everyone alone stays home, after the first night.
    const solo = NIGHTS[1].guests.filter((g) => g.party === undefined && !g.rumor).length;
    expect(tonight(() => 0.99, 1).tonight.length).toBeLessThan(NIGHTS[1].guests.length - solo + 2);
  });

  it("nobody stays home on the first night", () => {
    expect(tonight(() => 0.99, 0).tonight.length).toBeGreaterThanOrEqual(NIGHTS[0].guests.length);
  });

  it("comes in in order, the guests on top among the night's own kinds", () => {
    const t = tonight(cycle(0.2, 0.8, 0.5), 1, buyAll);
    const at = t.tonight.map((a) => a.at);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    const kinds = new Set(NIGHTS[1].guests.map((a) => a.kind));
    for (const a of t.tonight) expect(kinds.has(a.kind)).toBe(true);
  });
});

describe("what she's bought", () => {
  it("draws more in: each upgrade, each set of cups or dishes, each bottle", () => {
    const t = new Tavern(TABLES.length, TABLES);
    expect(t.crowdDraw).toBe(0);
    t.upgrades.add("quicktap");
    t.stock.cup += 3;
    t.bottles.add("wine");
    expect(t.crowdDraw).toBe(3);
    buyAll(t);
    expect(t.crowdDraw).toBe(10);
    expect(t.extraGuests.most).toBe(MAX_EXTRA_GUESTS);
  });

  it("brings a busier night than a bare tavern, rolling the same", () => {
    for (const roll of [0, 0.5, 0.99]) {
      const bare = tonight(() => roll, 2).tonight.length;
      const kitted = tonight(() => roll, 2, buyAll).tonight.length;
      expect(kitted, `roll ${roll}`).toBeGreaterThan(bare);
    }
    // At the least, a kitted-out tavern still gets some on top.
    const least = tonight(() => 0, 0, buyAll);
    expect(least.tonight.length).toBe(NIGHTS[0].guests.length + 3);
    expect(least.takeMessages().join(" ")).toContain("3 more than usual");
  });
});

describe("each guest", () => {
  it("rolls who they are to look at as they walk in, not by when they came", () => {
    const t = new Tavern(TABLES.length, TABLES);
    const rolls = cycle(0.1, 0.8, 0.4, 0.6, 0.9, 0.2, 0.7);
    t.rollRandom = rolls;
    t.open();
    t.tick(0, idle);
    for (let i = 0; i < 600; i++) t.tick(0.1, idle);
    const looks = new Set(t.guests.map((g) => g.look));
    expect(t.guests.length).toBeGreaterThan(1);
    expect(looks.size).toBeGreaterThan(1);
    for (const g of t.guests) expect(g.look).toBeGreaterThan(0);
  });
});
