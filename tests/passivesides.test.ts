import { describe, expect, it } from "vitest";
import { Fight, type FighterStats } from "../src/game/fight";
import { earned, effectsOf, LEVEL_UPS, noEffects, PASSIVE_BY_ID, PASSIVES, readProgress } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";
import { impulseCheck, type ImpulseFacts } from "../src/game/touchsettings";

const SEATS = 11;
const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const facts = () => new Tavern(SEATS).passiveFacts();
const has = (id: string, f: ReturnType<typeof facts>) => earned(PASSIVE_BY_ID.get(id)!, f);

describe("every passive", () => {
  it("changes something about her: an effect, or a skill level given outright", () => {
    const none = JSON.stringify(noEffects());
    for (const p of PASSIVES) {
      const changes = JSON.stringify(effectsOf(new Set([p.id]))) !== none || LEVEL_UPS[p.id] !== undefined;
      expect(changes, `${p.id} does nothing`).toBe(true);
    }
  });

  it("can be worked toward from nothing: none is already done, and none needs nothing", () => {
    const f = facts();
    for (const p of PASSIVES) {
      const [have, need] = p.progress(f);
      expect(need, p.id).toBeGreaterThan(0);
      expect(have, p.id).toBeLessThan(need);
    }
  });
});

describe("her two sides", () => {
  it("only counts the side that runs ahead of the other", () => {
    const f = facts();
    f.records.rough = 6;
    f.records.subWins = 6;
    expect(has("softTouch", f)).toBe(true);
    // As many slaps and faced-down guests, and she's even again: neither side is ahead.
    f.records.slapped = 12;
    expect(has("softTouch", f)).toBe(false);
    expect(has("sternKeeper", f)).toBe(false);
    f.records.domWins = 10;
    expect(has("sternKeeper", f)).toBe(true);
  });

  it("weakens her hold on the sub side and strengthens it on the dom side", () => {
    expect(effectsOf(new Set(["softTouch"])).hold).toBe(-1);
    expect(effectsOf(new Set(["softTouch", "easyPrey"])).hold).toBe(-3);
    expect(effectsOf(new Set(["sternKeeper", "rulesTheRoom"])).hold).toBe(3);
    expect(effectsOf(new Set(["easyPrey"])).touchGold.lips).toBe(1);
  });
});

describe("her hold, part by part", () => {
  const base: ImpulseFacts = { level: 5, desire: 0, exposed: 0, exhibition: 0, passives: 0, lets: 0, skill: 1, nerve: 6, prefers: false };

  it("moves the Consent-off check by what her passives add", () => {
    expect(impulseCheck({ ...base, passiveHold: -2 }).hold).toBe(impulseCheck(base).hold - 2);
    expect(impulseCheck({ ...base, passiveHold: 3 }).passives).toBe(3);
  });

  it("only touches the part it's for, and every one has a benefit that works with Consent on too", () => {
    const e = effectsOf(new Set(["boldBehind"]));
    expect(e.holdOf.rear).toBe(-1);
    expect(e.holdOf.lips).toBeUndefined();
    expect(e.start.butt).toBe(5);
    expect(effectsOf(new Set(["buttonedUp"])).holdOf.clothes).toBe(2);
  });

  it("goes into the tavern's check for that touch", () => {
    const t = new Tavern(SEATS);
    t.passives.add("boldBehind");
    t.passives.add("guarded");
    // As at bedtime, when they're earned: her effects are worked out again.
    t.effects = effectsOf(t.passives);
    const guest = { kind: "soldier", stats: { prefers: "butt" } } as unknown as Parameters<Tavern["impulseFacts"]>[0];
    const rear = { level: 4, region: "rear" } as Parameters<Tavern["impulseFacts"]>[2];
    expect(t.impulseFacts(guest, 5, rear).passiveHold).toBe(0);
    const lips = { level: 4, region: "lips" } as Parameters<Tavern["impulseFacts"]>[2];
    expect(t.impulseFacts(guest, 5, lips).passiveHold).toBe(1);
  });

  it("counts a garment she kept on, and is kept in a save", () => {
    const f = facts();
    f.records.clothesKept = 15;
    expect(has("buttonedUp", f)).toBe(true);
    const saved = readProgress({ records: { clothesKept: 4, grapplesLanded: 3, brawlLets: 2 } });
    expect(saved.records.clothesKept).toBe(4);
    expect(saved.records.grapplesLanded).toBe(3);
    expect(saved.records.brawlLets).toBe(2);
  });
});

describe("brawl passives", () => {
  it("count her grapples, theirs, and being held", () => {
    // Her grab lands; their swing lands as a grab of theirs (a hold).
    const rolls = [0, 0, 0, 0];
    let i = 0;
    const f = new Fight(1, "soldier", false, BASE, () => rolls[i++] ?? 0.99);
    f.act("grab");
    expect(f.grapplesLanded).toBe(1);
    expect(f.grapplesTaken).toBe(1);
    expect(f.timesHeld).toBe(1);
  });

  it("Wrestler lands grapples more; Hold Breaker shrugs off half of being held", () => {
    const chance = (stats: FighterStats, move: string) => new Fight(1, "farmer", false, stats, () => 0).choices().find((c) => c.move === move)!.chance!;
    expect(chance({ ...BASE, grappleHit: 0.1 }, "tackle")).toBeCloseTo(chance(BASE, "tackle") + 0.1);
    const held = (stats: FighterStats) => {
      const f = new Fight(1, "farmer", false, stats, () => 0);
      (f as unknown as { held: boolean }).held = true;
      return f.choices().find((c) => c.move === "strike")!.chance!;
    };
    expect(BASE_STRIKE() - held(BASE)).toBeCloseTo(2 * (BASE_STRIKE() - held({ ...BASE, heldEase: 0.5 })));
  });

  it("Thick Skin takes the edge off their grapples", () => {
    const hurt = (stats: FighterStats) => {
      // Her strike misses (0.99), theirs lands (0), as a grapple (0), a grab (0).
      const rolls = [0.99, 0, 0, 0];
      let i = 0;
      const f = new Fight(1, "bandit", false, stats, () => rolls[i++] ?? 0.99);
      f.act("strike");
      return f.maxStamina - f.stamina;
    };
    expect(hurt({ ...BASE, grappleGuard: 1 })).toBe(Math.max(1, hurt(BASE) - 1));
  });

  it("Stinging Reply hits harder on a slap mid-brawl; Scrapper's Blush takes the sting out of desire", () => {
    const f = new Fight(1, "soldier", false, { ...BASE, workedUp: true, brawlSlap: 2 }, () => 0);
    f.act("dodge");
    expect(f.reaching).toBe(true);
    const before = f.foeStamina;
    f.afterReach("slap", f.will);
    expect(before - f.foeStamina).toBe(4);
    const hot = { body: 90, mouth: 90, breasts: 90, butt: 90, pussy: 90, cock: 90 } as FighterStats["desire"];
    const plain = new Fight(1, "soldier", false, { ...BASE, desire: hot }, () => 0).penalties;
    const blush = new Fight(1, "soldier", false, { ...BASE, desire: hot, fightDesire: 0.25 }, () => 0).penalties;
    expect(blush.accuracy).toBeCloseTo(plain.accuracy * 0.75);
  });

  it("are earned from what happens in brawls", () => {
    const f = facts();
    f.records.grapplesLanded = 15;
    f.records.timesHeld = 15;
    f.records.grapplesTaken = 20;
    f.records.brawlSlaps = 5;
    f.records.brawlLets = 5;
    for (const id of ["wrestler", "holdBreaker", "thickSkin", "stingingReply", "scrappersBlush"]) expect(has(id, f), id).toBe(true);
  });
});

describe("showing what she gains, as it happens", () => {
  it("queues a level up once, when experience crosses into the next level", () => {
    const t = new Tavern(SEATS);
    const gain = (id: string, n: number) => (t as unknown as { gainXp: (id: string, n: number) => void }).gainXp(id, n);
    gain("charm", 5);
    expect(t.takeGains()).toEqual([]);
    gain("charm", 5);
    expect(t.takeGains()).toEqual([{ kind: "level", id: "charm", name: "Charm", level: 2 }]);
    // Read once: the queue is empty again.
    expect(t.takeGains()).toEqual([]);
  });

  it("queues her kink changing when a new passive tips it, alongside the passive itself", () => {
    const t = new Tavern(SEATS);
    t.playerBody = "Female";
    t.records.rough = 3;
    expect(t.kink).toBe("plain");
    t.phase = "bedtime";
    t.sleep();
    expect(t.takeUnlocks().map((p) => p.id)).toContain("stingingCheeks");
    expect(t.takeGains()).toContainEqual({ kind: "kink", from: "plain", to: "masochism" });
  });
});

function BASE_STRIKE(): number {
  return new Fight(1, "farmer", false, BASE, () => 0).choices().find((c) => c.move === "strike")!.chance!;
}
