import { describe, expect, it } from "vitest";
import { Fight, type FighterStats } from "../src/game/fight";
import { statsOf } from "../src/game/guestroles";
import {
  guardAt,
  guardMeter,
  needleAt,
  readOf,
  rollWeakSpot,
  STRIKE_AIMS,
  strikeAt,
  strikeMeter,
  toughness,
  weakSpotSeen,
  type GuardInput,
} from "../src/game/brawlaim";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const GUARD: GuardInput = { toughness: 20, accuracy: 0.6, agility: 1, endurance: 1, dodgeBonus: 0, blockBonus: 0, slow: 0, center: 0.5 };

/** Dice that give these rolls in turn, then 0.5 for ever. */
function dice(...rolls: number[]): () => number {
  let i = 0;
  return () => (i < rolls.length ? rolls[i++] : 0.5);
}

describe("weak spots", () => {
  it("are fixed for a foe, one of the four, with a different spot as the decoy", () => {
    for (let seed = 0; seed < 200; seed++) {
      const a = rollWeakSpot(seed, "Brute");
      expect(rollWeakSpot(seed, "Brute")).toEqual(a);
      expect(STRIKE_AIMS).toContain(a.weak);
      expect(a.decoy).not.toBe(a.weak);
    }
  });

  it("lean the way their type does, more often than not", () => {
    let knees = 0;
    for (let seed = 0; seed < 400; seed++) if (rollWeakSpot(seed, "Warrior").weak === "knees") knees++;
    expect(knees / 400).toBeGreaterThan(0.55);
  });

  it("are harder to read the tougher the foe: plain, one of two, then hidden", () => {
    const noble = statsOf("noble").fight;
    const brute = statsOf("bandit", "brute").fight;
    const soldier = statsOf("soldier").fight;
    expect(readOf(toughness({ max: noble.stamina, attack: noble.attack, drunk: false }))).toBe("plain");
    expect(readOf(toughness({ max: soldier.stamina, attack: soldier.attack, drunk: false }))).toBe("hint");
    expect(readOf(toughness({ max: brute.stamina, attack: brute.attack, drunk: false }))).toBe("hidden");
    const tough = { weak: "gut" as const, decoy: "face" as const, found: false, max: 34, attack: 8, drunk: false };
    expect(weakSpotSeen(tough)).toEqual([]);
    expect(weakSpotSeen({ ...tough, max: 20, attack: 5 })).toEqual(["face", "gut"]);
    expect(weakSpotSeen({ ...tough, found: true })).toEqual(["gut"]);
  });
});

describe("the guard meter", () => {
  it("has the dodge zone inside the block zone, on the bar", () => {
    for (const center of [0, 0.3, 0.7, 1]) {
      const m = guardMeter(0, { ...GUARD, center });
      expect(m.block[0]).toBeGreaterThanOrEqual(0);
      expect(m.block[1]).toBeLessThanOrEqual(1);
      expect(m.dodge[0]).toBeGreaterThan(m.block[0]);
      expect(m.dodge[1]).toBeLessThan(m.block[1]);
      expect(guardAt(m, (m.dodge[0] + m.dodge[1]) / 2)).toBe("dodge");
      expect(guardAt(m, (m.block[0] + m.dodge[0]) / 2)).toBe("block");
      expect(guardAt(m, -1)).toBe("full");
    }
  });

  it("is faster and narrower against a tougher foe", () => {
    const weak = guardMeter(0, { ...GUARD, toughness: 16 });
    const tough = guardMeter(0, { ...GUARD, toughness: 50 });
    expect(tough.speed).toBeGreaterThan(weak.speed);
    expect(tough.dodge[1] - tough.dodge[0]).toBeLessThan(weak.dodge[1] - weak.dodge[0]);
    expect(tough.block[1] - tough.block[0]).toBeLessThan(weak.block[1] - weak.block[0]);
    // Dizzy or drunk, their swing is slower.
    expect(guardMeter(0, { ...GUARD, toughness: 50, slow: 0.3 }).speed).toBeLessThan(tough.speed);
  });

  it("sweeps the needle across and back", () => {
    expect(needleAt(1, 0)).toBe(0);
    expect(needleAt(1, 0.5)).toBeCloseTo(0.5);
    expect(needleAt(1, 1)).toBeCloseTo(1);
    expect(needleAt(1, 1.25)).toBeCloseTo(0.75);
    expect(needleAt(1, 2)).toBeCloseTo(0);
  });
});

describe("a brawl with the guard meter", () => {
  it("waits on her guard when they swing, and a dodge costs her nothing", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, guard: true }, dice(0.99));
    f.act("strike");
    const m = f.incoming!;
    expect(m).not.toBeNull();
    const stamina = f.stamina;
    // Nothing else goes while it's up.
    f.act("strike");
    expect(f.incoming).toBe(m);
    f.guard((m.dodge[0] + m.dodge[1]) / 2);
    expect(f.incoming).toBeNull();
    expect(f.stamina).toBe(stamina);
    expect(f.dodges).toBe(1);
  });

  it("takes half on a block, and the full blow when she misses the zones", () => {
    const blocked = new Fight(1, "bandit", false, { ...BASE, guard: true }, dice(0.99), statsOf("bandit", "brute"));
    blocked.act("strike");
    const m = blocked.incoming!;
    blocked.guard((m.block[0] + m.dodge[0]) / 2);
    const half = blocked.maxStamina - blocked.stamina;
    const full = new Fight(1, "bandit", false, { ...BASE, guard: true }, dice(0.99, 0.99), statsOf("bandit", "brute"));
    full.act("strike");
    full.guard(-1);
    expect(half).toBeGreaterThan(0);
    expect(full.maxStamina - full.stamina).toBeGreaterThan(half);
  });
});

describe("an aimed strike", () => {
  it("does its own thing: gut winds them, knees let her throw them out sooner", () => {
    const f = new Fight(1, "farmer", false, BASE, dice(0, 0.99, 0, 0.99));
    f.act("strike", "gut");
    expect(f.log.some((l) => l.includes("Strike · Gut"))).toBe(true);
    f.act("strike", "knees");
    expect(f.lead.wobbly).toBe(true);
  });

  it("hits their weak spot harder, and finding it shows it", () => {
    const hits = (aim: (typeof STRIKE_AIMS)[number], weak: boolean) => {
      const f = new Fight(1, "bandit", false, BASE, dice(0, 0.99), statsOf("bandit", "brute"));
      const foe = f.lead;
      // Pick the spot to test against: their own, or one that isn't.
      if (weak) foe.weak = aim;
      else foe.weak = STRIKE_AIMS.find((a) => a !== aim)!;
      foe.found = false;
      const before = foe.stamina;
      f.act("strike", aim);
      return { dealt: before - foe.stamina, found: foe.found, seen: f.weakSeen(foe) };
    };
    const onIt = hits("face", true);
    const off = hits("face", false);
    expect(onIt.dealt).toBeGreaterThan(off.dealt);
    expect(onIt.found).toBe(true);
    expect(onIt.seen).toEqual(["face"]);
    expect(off.seen).toEqual([]);
  });

  it("is harder to land on the face than the knees", () => {
    const f = new Fight(1, "farmer", false, BASE, dice());
    expect(f.aimChance("face")).toBeLessThan(f.aimChance("knees"));
  });
});

describe("the strike meter", () => {
  const STRIKE = { toughness: 20, chance: 0.7, agility: 1, center: 0.5 };

  it("has the crit zone inside the hit zone, on the bar", () => {
    for (const center of [0, 0.3, 0.7, 1]) {
      const m = strikeMeter("gut", { ...STRIKE, center });
      expect(m.hit[0]).toBeGreaterThanOrEqual(0);
      expect(m.hit[1]).toBeLessThanOrEqual(1);
      expect(m.crit[0]).toBeGreaterThanOrEqual(m.hit[0]);
      expect(m.crit[1]).toBeLessThanOrEqual(m.hit[1]);
      expect(strikeAt(m, (m.crit[0] + m.crit[1]) / 2)).toBe("crit");
      expect(strikeAt(m, (m.hit[0] + m.crit[0]) / 2)).toBe("hit");
      expect(strikeAt(m, -1)).toBe("miss");
    }
  });

  it("has a wider hit zone the better her chance, and a faster needle on a tougher foe", () => {
    const easy = strikeMeter("knees", { ...STRIKE, chance: 0.9 });
    const hard = strikeMeter("face", { ...STRIKE, chance: 0.4 });
    expect(easy.hit[1] - easy.hit[0]).toBeGreaterThan(hard.hit[1] - hard.hit[0]);
    expect(strikeMeter("gut", { ...STRIKE, toughness: 50 }).speed).toBeGreaterThan(strikeMeter("gut", STRIKE).speed);
  });

  it("decides her strike by timing: a crit hits harder than a hit, a miss does nothing", () => {
    const dealt = (timed: "crit" | "hit" | "miss") => {
      const f = new Fight(1, "bandit", false, BASE, dice(0.99, 0.99), statsOf("bandit", "brute"));
      f.lead.weak = "knees";
      const before = f.lead.stamina;
      // The roll says miss (0.99): the timing overrides it.
      f.act("strike", "gut", timed);
      return before - f.lead.stamina;
    };
    expect(dealt("miss")).toBe(0);
    expect(dealt("hit")).toBeGreaterThan(0);
    expect(dealt("crit")).toBeGreaterThan(dealt("hit"));
  });
});
