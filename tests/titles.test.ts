import { describe, expect, it } from "vitest";
import { noEffects, type Effects } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";
import { START_TITLE, TITLES, TITLE_BY_ID, titleEarned, TWO_SLOTS_FAME } from "../src/game/titles";

const SEATS = 11;

function bedtime(t: Tavern): void {
  t.phase = "bedtime";
  t.sleep();
}

describe("the titles", () => {
  it("each do something when worn, and each can be worked toward from nothing", () => {
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(TITLES.length);
    const none = JSON.stringify(noEffects());
    const facts = new Tavern(SEATS).passiveFacts();
    for (const def of TITLES) {
      const e: Effects = noEffects();
      def.wear(e);
      expect(JSON.stringify(e), `${def.id} does nothing`).not.toBe(none);
      const [have, need] = def.progress(facts);
      expect(need, def.id).toBeGreaterThan(0);
      if (def.id !== START_TITLE) expect(have, def.id).toBeLessThan(need);
    }
  });

  it("starts her with the innkeeper's title, worn", () => {
    const t = new Tavern(SEATS);
    expect(t.titles.has(START_TITLE)).toBe(true);
    expect(t.worn).toEqual([START_TITLE]);
    expect(t.titleSlots).toBe(1);
  });

  it("is earned at bedtime with its bonus once, and shown", () => {
    const t = new Tavern(SEATS);
    t.records.pulled = 50;
    const respect = t.persona.respect;
    bedtime(t);
    expect(t.titles.has("untouchable")).toBe(true);
    expect(t.persona.respect).toBeGreaterThanOrEqual(respect + 2);
    expect(t.takeGains()).toContainEqual({ kind: "title", id: "untouchable" });
    // Once only.
    const after = t.persona.respect;
    bedtime(t);
    expect(t.persona.respect).toBe(after);
  });

  it("takes effect while worn, only outside service, one slot until she's famous", () => {
    const t = new Tavern(SEATS);
    t.titles.add("untouchable");
    t.titles.add("barmaid");
    expect(t.wearTitle("untouchable")).toBe(true);
    // One slot: the new one takes the old one's place.
    expect(t.worn).toEqual(["untouchable"]);
    expect(t.effects.reach).toBe(-0.5);
    expect(t.takeOffTitle("untouchable")).toBe(true);
    expect(t.effects.reach).toBe(0);
    // Not one she hasn't earned.
    expect(t.wearTitle("brawlQueen")).toBe(false);
    // Two slots once she's famous.
    t.persona.fame = TWO_SLOTS_FAME;
    t.wearTitle("untouchable");
    t.wearTitle("barmaid");
    expect(t.worn).toEqual(["untouchable", "barmaid"]);
    // Never in the middle of service.
    t.phase = "service";
    expect(t.takeOffTitle("barmaid")).toBe(false);
  });

  it("are kept in a save, worn ones too", () => {
    const t = new Tavern(SEATS);
    t.titles.add("barmaid");
    t.wearTitle("barmaid");
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.titles.has("barmaid")).toBe(true);
    expect(loaded.worn).toEqual(["barmaid"]);
    expect(loaded.effects.payPct).toBeCloseTo(0.1);
  });

  it("checks the whole requirement", () => {
    const facts = new Tavern(SEATS).passiveFacts();
    facts.records.stewsCooked = 20;
    const hearth = TITLE_BY_ID.get("hearthKeeper")!;
    expect(titleEarned(hearth, facts)).toBe(false);
    facts.records.messesCleaned = 60;
    expect(titleEarned(hearth, facts)).toBe(true);
  });
});

describe("her Level and Slut Level", () => {
  const gain = (t: Tavern, id: string, n: number) => (t as unknown as { gainXp: (id: string, n: number) => void }).gainXp(id, n);

  it("Level rises one for every 3 levels her stats and skills gain, and gives willpower", () => {
    const t = new Tavern(SEATS);
    expect(t.herLevel).toBe(1);
    const will = t.maxWillpower;
    gain(t, "charm", 25); // Charm 3: 2 gained
    expect(t.herLevel).toBe(1);
    gain(t, "hands", 10); // Hands 2: 3 gained
    expect(t.herLevel).toBe(2);
    expect(t.maxWillpower).toBeGreaterThan(will);
    expect(t.takeGains()).toContainEqual({ kind: "rank", which: "level", level: 2 });
  });

  it("Slut Level is her lewdness by tens, and shown when it rises", () => {
    const t = new Tavern(SEATS);
    t.takeGains();
    expect(t.slutLevel).toBe(0);
    t.records.overwhelmed = 5; // +10 lewdness
    expect(t.slutLevel).toBe(1);
    expect(t.takeGains()).toContainEqual(expect.objectContaining({ kind: "rank", which: "slut", level: 1 }));
  });

  it("isn't announced again after a load", () => {
    const t = new Tavern(SEATS);
    t.records.overwhelmed = 10;
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.takeGains().filter((g) => g.kind === "rank")).toEqual([]);
  });
});

describe("bar work and saying no", () => {
  it("counts smooth and busy nights at bedtime", () => {
    const t = new Tavern(SEATS);
    t.served = 15;
    t.walkouts = 0;
    bedtime(t);
    expect(t.records.smoothNights).toBe(1);
    expect(t.records.busyNights).toBe(1);
  });

  it("makes saying no cheaper with Firm No", () => {
    const t = new Tavern(SEATS);
    const refuse = (tavern: Tavern) => (tavern as unknown as { refuseWill: (tier: number, level: number) => number }).refuseWill(2, 7);
    const before = refuse(t);
    t.passives.add("firmNo");
    (t as unknown as { refreshEffects: () => void }).refreshEffects();
    expect(refuse(t)).toBeLessThan(before);
  });
});
