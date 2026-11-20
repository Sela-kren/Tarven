import { describe, expect, it } from "vitest";
import { REVEL_HALL_COST, Tavern } from "../src/game/tavern";
import { PASSIVE_BY_ID, readProgress } from "../src/game/passives";
import { revelSupplies } from "../src/game/lanternplans";

/** A seeded roll (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In Act 3 (Act 2 done), by day. */
function act3(): Tavern {
  const t = new Tavern(11);
  t.act2.flags.push("act2Done");
  return t;
}

/** An Act 3 heroine far enough along, by day, with gold for the hall. */
function late(): Tavern {
  const t = act3();
  t.random = seeded(5);
  t.playerBody = "Female";
  t.persona.fame = 60;
  t.corruption = 80;
  t.records.taproomScenes = 10;
  t.records.taproomPartners = 30;
  t.gold = 300;
  return t;
}

/** Built, and tonight's a revel. */
function revelReady(): Tavern {
  const t = late();
  expect(t.buildRevelHall()).toBe(true);
  expect(t.setRevelTonight(true)).toBe(true);
  return t;
}

describe("opening the Revel House", () => {
  it("needs Act 3, the hall and her history", () => {
    const t = new Tavern(11);
    expect(t.revelOpen).toBe(false);
    expect(t.setRevelTonight(true)).toBe(false);
    expect(t.revelMissing().length).toBe(4);
    const l = late();
    expect(l.revelOpen).toBe(false);
    expect(l.revelMissing()).toEqual([expect.stringContaining("Revel Hall")]);
    expect(l.buildRevelHall()).toBe(true);
    expect(l.gold).toBe(300 - REVEL_HALL_COST);
    expect(l.revelOpen).toBe(true);
  });

  it("keeps the Hall hidden from the house plans till Act 3", () => {
    // Late game and far enough along, but still in Act 2: nothing shows.
    const t = late();
    t.act2.flags = [];
    expect(t.storyAct).toBeLessThan(3);
    expect(t.revelReady).toBe(false);
    expect(revelSupplies(t)).toEqual([]);
    expect(t.buildRevelHall()).toBe(false);
    expect(t.revelMissing()).toEqual([expect.stringContaining("Act 3"), expect.stringContaining("Revel Hall")]);
  });

  it("shows the Hall greyed out in Act 3, with what's still needed, till she's ready", () => {
    const t = act3();
    t.gold = 300;
    const [hall] = revelSupplies(t);
    expect(hall.name).toBe("The Revel Hall");
    expect(hall.canBuy).toBe(false);
    expect(hall.detail).toContain("Still needed: lewdness");
    expect(hall.detail).toContain("table scenes");
    expect(hall.detail).not.toContain("Revel Hall (house plans");
    expect(t.buildRevelHall()).toBe(false);
    // Ready: the Hall is there to build, and built, tonight's switch comes with it.
    const l = late();
    expect(l.revelReady).toBe(true);
    expect(revelSupplies(l).map((r) => r.name)).toEqual(["The Revel Hall"]);
    expect(revelSupplies(l)[0].canBuy).toBe(true);
    expect(revelSupplies(l)[0].detail).not.toContain("Still needed");
    l.buildRevelHall();
    expect(revelSupplies(l).map((r) => r.name)).toEqual(["The Revel Hall", "No revel tonight"]);
  });

  it("cycles the settings by day only", () => {
    const t = revelReady();
    t.cycleRevel("who");
    expect(t.revelSettings.who).toBe("women");
    t.cycleRevel("herPart");
    expect(t.revelSettings.herPart).toBe("join");
    t.phase = "service";
    expect(t.cycleRevel("door")).toBe(false);
  });
});

describe("a revel night", () => {
  it("applies the night at dawn: gold, fame, respect, heat and records", () => {
    const t = revelReady();
    const before = { gold: t.gold, fame: t.persona.fame, respect: t.persona.respect, heat: t.heat };
    t.phase = "bedtime";
    expect(t.holdRevel(true)).toBe(true);
    expect(t.holdRevel(true)).toBe(false);
    expect(t.gold).toBeGreaterThan(before.gold);
    expect(t.persona.fame).toBeGreaterThan(before.fame);
    expect(t.persona.respect).toBeLessThan(before.respect);
    expect(t.heat).toBeGreaterThan(before.heat);
    expect(t.records.revelNights).toBe(1);
    expect(t.records.mixedNights).toBe(1);
    // Hosting: no scene of her own.
    expect(t.duelOfferFrom).toBeNull();
  });

  it("asks her, with Consent on, when she's the centrepiece", () => {
    const t = revelReady();
    t.revelSettings.herPart = "centrepiece";
    t.phase = "bedtime";
    t.holdRevel(true);
    expect(t.duelOfferFrom).toBe("revel");
    expect(t.duel).toBeNull();
    // Sent home: no defeat is counted, and the offer goes.
    t.sleep();
    expect(Object.keys(t.records.defeats)).toEqual([]);
    expect(t.duelOffer()).toBeNull();
  });

  it("follows the Consent-off rules with Consent off", () => {
    const t = revelReady();
    t.touchSettings = { ...t.touchSettings, autoTouch: true, agreed: true };
    t.revelSettings.herPart = "centrepiece";
    t.phase = "bedtime";
    t.holdRevel(true);
    expect(t.duel).not.toBeNull();
    expect(t.records.revelPartnersMost).toBeGreaterThan(0);
  });

  it("is held at bedtime without her scene if she goes straight to bed", () => {
    const t = revelReady();
    t.revelSettings.herPart = "centrepiece";
    t.phase = "bedtime";
    t.sleep();
    expect(t.records.revelNights).toBe(1);
    expect(t.duel).toBeNull();
  });

  it("saves the hall, the settings and tonight's switch", () => {
    const t = revelReady();
    t.cycleRevel("door");
    const back = new Tavern(11);
    back.restore(JSON.parse(JSON.stringify(t.snapshot())));
    expect(back.revelHall).toBe(true);
    expect(back.revelSettings).toEqual(t.revelSettings);
    expect(back.revelTonight).toBe(true);
  });
});

describe("revel records and passives", () => {
  it("reads the revel records back from a save", () => {
    const t = revelReady();
    t.phase = "bedtime";
    t.holdRevel(true);
    const p = readProgress(JSON.parse(JSON.stringify(t.snapshot().progress)));
    expect(p.records.revelNights).toBe(1);
    expect(p.records.mixedNights).toBe(1);
  });

  it("has the honours' passives, earned from the revel records", () => {
    const open = PASSIVE_BY_ID.get("openHall")!;
    expect(open.progress({ records: { revelNights: 3 } } as never)).toEqual([3, 3]);
    expect(PASSIVE_BY_ID.has("roomForEveryone")).toBe(true);
    expect(PASSIVE_BY_ID.has("theWholePass")).toBe(true);
  });
});
