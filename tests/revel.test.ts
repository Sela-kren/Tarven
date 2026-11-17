import { describe, expect, it } from "vitest";
import { crowdFactor } from "../src/game/defeat";
import { GUEST_KIND_LIST } from "../src/game/guestroles";
import {
  CENTREPIECE_MAX,
  centrepieceCrowd,
  DOOR_FEE,
  GROUPS_EACH,
  REVEL_COUNT,
  REVEL_FAN_TAG,
  REVEL_HONOURS,
  REVEL_UNLOCK,
  revelDawn,
  revelGuests,
  revelHonourEarned,
  revelNight,
  revelUnlocked,
  type RevelFacts,
  type RevelSettings,
} from "../src/game/revel";

/** A small seeded roll, so a night plays the same each run. */
const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const ready: RevelFacts = { lewdness: 120, corruption: 0, tableScenes: 10, taproomPartners: 0, builds: ["revelHall"] };
const set = (who: RevelSettings["who"], herPart: RevelSettings["herPart"] = "host", door: RevelSettings["door"] = "open"): RevelSettings => ({
  who,
  herPart,
  door,
});
const noRecords = { revelNights: 0, revelPartnersMost: 0, mixedNights: 0 };

describe("revel unlock", () => {
  it("opens late, with the hall built and the table scene used", () => {
    expect(revelUnlocked(ready)).toBe(true);
    expect(revelUnlocked({ ...ready, lewdness: 0, corruption: REVEL_UNLOCK.corruption })).toBe(true);
    expect(revelUnlocked({ ...ready, tableScenes: 0, taproomPartners: REVEL_UNLOCK.partners })).toBe(true);
  });
  it("stays shut without each part", () => {
    expect(revelUnlocked({ ...ready, lewdness: 10, corruption: 10 })).toBe(false);
    expect(revelUnlocked({ ...ready, tableScenes: 3, taproomPartners: 5 })).toBe(false);
    expect(revelUnlocked({ ...ready, builds: [] })).toBe(false);
  });
});

describe("revel guests", () => {
  it("comes in the numbers the door draws, less those turned away", () => {
    for (const door of ["open", "invite", "paying"] as const) {
      for (let seed = 1; seed < 30; seed++) {
        const mix = revelGuests(set("mixed", "host", door), seeded(seed));
        const [least, most] = REVEL_COUNT[door];
        expect(mix.guests.length + mix.turnedAway).toBeGreaterThanOrEqual(least);
        expect(mix.guests.length + mix.turnedAway).toBeLessThanOrEqual(most);
        expect(mix.men + mix.women).toBe(mix.guests.length);
        for (const g of mix.guests) expect(GUEST_KIND_LIST).toContain(g.kind);
      }
    }
  });
  it("is all women on a women's night, mostly men on a men's night, about half on a mixed one", () => {
    let menShare = 0;
    let mixedShare = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const women = revelGuests(set("women"), seeded(seed));
      expect(women.men).toBe(0);
      expect(women.shareFemale).toBe(1);
      menShare += revelGuests(set("men"), seeded(seed)).shareFemale;
      mixedShare += revelGuests(set("mixed"), seeded(seed)).shareFemale;
    }
    expect(menShare / 40).toBeLessThan(0.25);
    expect(mixedShare / 40).toBeGreaterThan(0.35);
    expect(mixedShare / 40).toBeLessThan(0.65);
  });
});

describe("revel night", () => {
  it("forms groups of two to four, never the same guest twice at once nor past their limit", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = set("mixed", "join");
      const mix = revelGuests(s, seeded(seed));
      const night = revelNight(s, mix, seeded(seed + 100));
      expect(night.groups.length).toBeGreaterThan(0);
      const times = new Map<number, number>();
      for (const g of night.groups) {
        expect(g.members.length).toBeGreaterThanOrEqual(2);
        expect(g.members.length).toBeLessThanOrEqual(4);
        expect(g.men + g.women).toBe(g.members.length);
        expect(g.to).toBeGreaterThan(g.from);
        for (const m of g.members) times.set(m, (times.get(m) ?? 0) + 1);
        for (const h of night.groups) {
          if (h === g || h.from >= g.to || g.from >= h.to) continue;
          expect(h.members.some((m) => g.members.includes(m))).toBe(false);
        }
      }
      for (const n of times.values()) expect(n).toBeLessThanOrEqual(GROUPS_EACH);
      expect(night.heat).toBeGreaterThan(0);
      expect(night.heat).toBeLessThanOrEqual(100);
    }
  });
  it("mixes groups by the settings", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const w = set("women");
      const night = revelNight(w, revelGuests(w, seeded(seed)), seeded(seed + 7));
      for (const g of night.groups) expect(g.men).toBe(0);
      const m = set("men");
      const men = revelNight(m, revelGuests(m, seeded(seed)), seeded(seed + 7));
      for (const g of men.groups) expect(g.women).toBeLessThanOrEqual(1);
    }
  });
  it("sets more on her the bigger her part", () => {
    let host = 0;
    let centre = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const mix = revelGuests(set("mixed"), seeded(seed));
      const a = revelNight(set("mixed", "host"), mix, seeded(seed + 1)).wantHer;
      const b = revelNight(set("mixed", "centrepiece"), mix, seeded(seed + 1)).wantHer;
      host += a.men + a.women;
      centre += b.men + b.women;
    }
    expect(centre).toBeGreaterThan(host * 2);
  });
});

describe("the centrepiece", () => {
  const records = { taproomPartners: 40, fightsLost: 3 };
  it("goes by the defeat crowd rule, more for the centrepiece, never more than want her", () => {
    const want = { men: 20, women: 0 };
    expect(centrepieceCrowd(records, set("men", "host"), want).total).toBe(crowdFactor(records, "taproom"));
    expect(centrepieceCrowd(records, set("men", "centrepiece"), want).total).toBe(Math.min(CENTREPIECE_MAX, crowdFactor(records, "taproom") + 4));
    expect(centrepieceCrowd(records, set("men", "centrepiece"), { men: 2, women: 1 }).total).toBe(3);
    expect(centrepieceCrowd(records, set("men"), { men: 0, women: 0 }).total).toBe(0);
  });
  it("gives the women who want her their share on a mixed night", () => {
    const c = centrepieceCrowd(records, set("mixed", "centrepiece"), { men: 10, women: 10 });
    expect(c.women).toBeGreaterThan(0);
    expect(c.men + c.women).toBe(c.total);
  });
});

describe("revel dawn", () => {
  const night = (s: RevelSettings, seed = 3) => {
    const mix = revelGuests(s, seeded(seed));
    return { mix, night: revelNight(s, mix, seeded(seed + 1)) };
  };
  it("takes the door fee only on a paying night", () => {
    const paying = set("mixed", "host", "paying");
    const p = night(paying);
    const d = revelDawn({ settings: paying, ...p, herPartners: 2, records: noRecords });
    expect(d.doorGold).toBe(p.mix.guests.length * DOOR_FEE);
    expect(d.gold).toBe(d.doorGold + d.drinkGold);
    const open = set("mixed");
    expect(revelDawn({ settings: open, ...night(open), herPartners: 2, records: noRecords }).doorGold).toBe(0);
  });
  it("raises fame and heat, lowers respect, and tags its fans", () => {
    const s = set("mixed", "centrepiece");
    const d = revelDawn({ settings: s, ...night(s), herPartners: 9, records: noRecords });
    expect(d.fame).toBeGreaterThan(0);
    expect(d.respect).toBeLessThan(0);
    expect(d.heat).toBeGreaterThan(0);
    expect(d.fans.tag).toBe(REVEL_FAN_TAG);
    expect(d.fans.count).toBeGreaterThan(0);
  });
  it("has no heat with the Baron's cut", () => {
    const s = set("men");
    expect(revelDawn({ settings: s, ...night(s), herPartners: 0, records: noRecords, baronCut: true }).heat).toBe(0);
  });
  it("adds to her records", () => {
    const s = set("mixed");
    const d = revelDawn({ settings: s, ...night(s), herPartners: 6, records: { revelNights: 2, revelPartnersMost: 10, mixedNights: 1 } });
    expect(d.records).toEqual({ revelNights: 3, revelPartnersMost: 10, mixedNights: 2 });
    const m = set("men");
    const e = revelDawn({ settings: m, ...night(m), herPartners: 14, records: noRecords });
    expect(e.records).toEqual({ revelNights: 1, revelPartnersMost: 14, mixedNights: 0 });
  });
  it("earns Queen of the Revel at ten nights", () => {
    const queen = REVEL_HONOURS.find((h) => h.name === "Queen of the Revel")!;
    expect(revelHonourEarned(queen, { ...noRecords, revelNights: 9 })).toBe(false);
    expect(revelHonourEarned(queen, { ...noRecords, revelNights: 10 })).toBe(true);
  });
});
