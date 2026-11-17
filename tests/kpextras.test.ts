import { describe, expect, it } from "vitest";
import { Fight, type FighterStats } from "../src/game/fight";
import { FOE_PREFIXES, foePrefixFor, PREFIX_CHANCE } from "../src/game/foeprefix";
import { emptyMeters, type Meters } from "../src/game/passives";
import { DIFFICULTIES } from "../src/game/touchsettings";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
const READY = { desire: meters({ mouth: 100, breasts: 100, butt: 100, pussy: 100, cock: 100 }), pleasure: 30, exposure: 1, sexOk: true, will: 100, maxWill: 100, extraStamina: 200 };

/** KP's enemy prefixes (foeprefix.ts). */
describe("prefixes on the ones she fights", () => {
  it("about a third of guests have one, fixed by who they are", () => {
    const ids = Array.from({ length: 600 }, (_, i) => i);
    const share = ids.filter((id) => foePrefixFor(id)).length / ids.length;
    expect(share).toBeGreaterThan(PREFIX_CHANCE - 0.1);
    expect(share).toBeLessThan(PREFIX_CHANCE + 0.1);
    expect(foePrefixFor(42)).toBe(foePrefixFor(42));
  });

  it("shows in their name, and changes how they fight", () => {
    const plain = new Fight(1, "bandit", false, BASE, () => 0.5);
    const big = new Fight(1, "bandit", false, { ...BASE, prefixOf: () => "big" }, () => 0.5);
    expect(big.foes[0].name).toBe(`${FOE_PREFIXES.big.word} ${plain.foes[0].name}`);
    expect(big.foes[0].max).toBeGreaterThan(plain.foes[0].max);
    expect(big.foes[0].stock).toBe(2);
  });

  it("a greedy one comes more than once (KP's ejaculation stock), and stays in the fight", () => {
    const f = new Fight(1, "bandit", false, { ...BASE, ...READY, prefixOf: () => "hungry" }, () => 0.99);
    const foe = f.foes[0];
    expect(foe.stock).toBe(3);
    foe.pleasure = 99;
    f.act("flaunt");
    expect(f.comes).toBe(1);
    expect(foe.out).toBeNull();
    expect(foe.stock).toBe(2);
    expect(foe.rate).toBeLessThan(1);
  });
});

describe("the difficulty (KP's Easy, Normal and Hard)", () => {
  it("makes the ones she fights softer or tougher", () => {
    const easy = new Fight(1, "bandit", false, { ...BASE, foeScale: DIFFICULTIES.easy.foes }, () => 0.5);
    const hard = new Fight(1, "bandit", false, { ...BASE, foeScale: DIFFICULTIES.hard.foes }, () => 0.5);
    expect(hard.foes[0].max).toBeGreaterThan(easy.foes[0].max);
    expect(DIFFICULTIES.easy.growth).toBeGreaterThan(DIFFICULTIES.hard.growth);
  });
});

describe("her own moves (KP's Flaunt, Open Pleasure, Give Up, and starting a scene herself)", () => {
  it("Flaunt works them all up", () => {
    const f = new Fight(1, "bandit", false, { ...BASE, ...READY }, () => 0.99);
    const before = f.foes[0].pleasure;
    f.act("flaunt");
    expect(f.events).toContain("flaunt");
    expect(f.foes[0].pleasure).toBeGreaterThan(before);
  });

  it("Give Up takes her down", () => {
    const f = new Fight(1, "bandit", false, { ...BASE, ...READY }, () => 0.99);
    f.act("giveUp");
    expect(f.outcome).toBe("lost");
  });

  it("she can take the lead, in a scene she's done before, with one who's erect", () => {
    const f = new Fight(1, "adventurer", false, { ...BASE, ...READY, experience: { pussy: 2 } }, () => 0.99);
    expect(f.choices().some((c) => c.move === "lead")).toBe(false);
    f.foes[0].pleasure = 60;
    expect(f.choices().some((c) => c.move === "lead")).toBe(true);
    f.act("lead");
    expect(f.taken?.foe).toBe(0);
    expect(f.taken?.area).toBe("pussy");
  });

  it("not in one she's never done", () => {
    const f = new Fight(1, "adventurer", false, { ...BASE, ...READY, experience: {} }, () => 0.99);
    f.foes[0].pleasure = 60;
    expect(f.choices().some((c) => c.move === "lead")).toBe(false);
  });
});
