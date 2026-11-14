import { describe, expect, it } from "vitest";
import {
  earnsRegular,
  LASTING_NERVE_MAX,
  newMarks,
  nextName,
  readRegulars,
  REGULARS_PER_KIND,
  regularNerve,
  returnChance,
  settleNight,
  type Regular,
} from "../src/game/regulars";
import { ROLES } from "../src/game/guestroles";
import { Tavern, type Guest } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };

function regular(over: Partial<Regular> = {}): Regular {
  return {
    id: "r1",
    name: "Sergeant Brask",
    kind: "soldier",
    role: "warrior",
    female: false,
    look: 3,
    stats: structuredClone(ROLES.warrior),
    nerve: 0,
    slapped: false,
    nights: 0,
    lets: 0,
    adult: 0,
    beatHer: 0,
    lostToHer: 0,
    since: 0,
    last: "met",
    ...over,
  };
}

type Inside = { mark(g: Guest, change: (m: ReturnType<typeof newMarks>) => void): void; settleRegulars(): void; nerveOf(g: Guest): number };
const inside = (t: Tavern) => t as unknown as Inside;

/** Her tavern mid-service with a guest in. */
function serving(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.random = () => 0;
  t.playerBody = "Female";
  t.open();
  t.tick(0, idle);
  for (let i = 0; i < 600 && t.guests.length === 0; i++) t.tick(0.1, idle);
  return t;
}

describe("becoming a regular", () => {
  it("takes a first with her, or a brawl, not just a drink", () => {
    expect(earnsRegular(newMarks())).toBe(false);
    expect(earnsRegular({ ...newMarks(), lets: 2 })).toBe(false);
    expect(earnsRegular({ ...newMarks(), lets: 3 })).toBe(true);
    expect(earnsRegular({ ...newMarks(), adult: 1 })).toBe(true);
    expect(earnsRegular({ ...newMarks(), beatHer: true })).toBe(true);
    expect(earnsRegular({ ...newMarks(), lostToHer: true })).toBe(true);
  });

  it("names them, keeps their sheet and face, and tells her in the morning news", () => {
    const t = serving();
    const guest = t.guests[0];
    inside(t).mark(guest, (m) => (m.lets = 3));
    inside(t).settleRegulars();
    expect(t.regulars).toHaveLength(1);
    const r = t.regulars[0];
    expect(r.kind).toBe(guest.kind);
    expect(r.look).toBe(guest.look);
    expect(r.stats.nerve).toBe(guest.stats.nerve);
    expect(t.news.some((n) => n.includes(r.name))).toBe(true);
  });

  it("only so many of each kind", () => {
    const t = serving();
    const guest = t.guests[0];
    for (let i = 0; i < REGULARS_PER_KIND; i++) t.regulars.push(regular({ id: `x${i}`, kind: guest.kind, name: `N${i}` }));
    inside(t).mark(guest, (m) => (m.adult = 1));
    inside(t).settleRegulars();
    expect(t.regulars).toHaveLength(REGULARS_PER_KIND);
  });

  it("never gives two regulars the same name", () => {
    const first = nextName("bandit", new Set());
    expect(nextName("bandit", new Set([first]))).not.toBe(first);
  });
});

describe("a regular, night after night", () => {
  it("comes back bolder for every night she let them, up to the most", () => {
    let r = regular();
    for (let i = 0; i < 10; i++) r = settleNight(r, { ...newMarks(), lets: 1 });
    expect(r.nerve).toBe(LASTING_NERVE_MAX);
    expect(r.lets).toBe(10);
    expect(r.nights).toBe(10);
    expect(r.last).toBe("let");
  });

  it("is cooler after a slap, until she lets them again", () => {
    let r = settleNight(regular({ nerve: 1 }), { ...newMarks(), slapped: true });
    expect(regularNerve(r)).toBe(0);
    expect(r.last).toBe("slapped");
    r = settleNight(r, { ...newMarks(), lets: 1 });
    expect(regularNerve(r)).toBe(1.5);
  });

  it("comes back stronger each time she beats them", () => {
    const before = regular();
    const after = settleNight(before, { ...newMarks(), lostToHer: true });
    expect(after.stats.fight.stamina).toBeGreaterThan(before.stats.fight.stamina);
    expect(after.stats.nerve).toBeGreaterThan(before.stats.nerve);
    expect(after.last).toBe("lostToHer");
  });

  it("comes in more often the more she's let them", () => {
    expect(returnChance(regular({ lets: 5 }))).toBeGreaterThan(returnChance(regular()));
  });

  it("walks in as themselves: their name, their face, and the nerve they've built up", () => {
    const t = serving();
    const guest = t.guests[0];
    const plain = inside(t).nerveOf(guest);
    t.regulars.push(regular({ id: "r9", kind: guest.kind, role: guest.role, nerve: 2 }));
    guest.regular = "r9";
    expect(t.nameOf(guest)).toBe("Sergeant Brask");
    expect(inside(t).nerveOf(guest)).toBeCloseTo(Math.min(10, plain + 2));
  });

  it("walk in on a later night, with what they remember", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.random = () => 0;
    t.regulars.push(regular({ id: "r7", kind: "farmer", role: "farmer", last: "let" }));
    const said: string[] = [];
    t.open();
    t.tick(0, idle);
    for (let i = 0; i < 900 && !t.guests.some((g) => g.regular === "r7"); i++) {
      t.tick(0.1, idle);
      said.push(...t.takeMessages());
    }
    const back = t.guests.find((g) => g.regular === "r7");
    expect(back?.look).toBe(3);
    expect(said.some((line) => line.includes("Sergeant Brask"))).toBe(true);
  });

  it("are kept in a save", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.regulars.push(regular({ lets: 2, nerve: 1 }));
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(t.snapshot());
    expect(loaded.regulars).toEqual(t.regulars);
    expect(readRegulars([{ nonsense: true }, 3])).toEqual([]);
  });
});
