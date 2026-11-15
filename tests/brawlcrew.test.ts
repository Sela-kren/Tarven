import { describe, expect, it } from "vitest";
import { Fight, MAX_FOES, type FighterStats, type FoeSpec } from "../src/game/fight";
import { emptyMeters, type Meters } from "../src/game/passives";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
const mate = (guestId: number, extra: Partial<FoeSpec> = {}): FoeSpec => ({ guestId, kind: "bandit", drunk: false, ...extra });
/** Her, ready for him in her and for another at her mouth. */
const READY = { desire: meters({ pussy: 90, cock: 80, mouth: 85 }), pleasure: 30, exposure: 1, sexOk: true, prefers: "pussy" as const, workedUp: true, will: 100, maxWill: 100 };

describe("more of them in a brawl, Karryn's Prison style", () => {
  it("their table piles in, each with a name of their own, and says so", () => {
    const f = new Fight(1, "bandit", false, { ...BASE, joiners: [mate(2), mate(3)] }, () => 0);
    f.act("dodge");
    expect(f.foes.map((x) => x.name)).toEqual(["rogue", "rogue B"]);
    expect(f.events).toContain("join");
    expect(f.events).toContain("foe:say");
  });

  it(`never more than ${MAX_FOES} at once`, () => {
    const f = new Fight(1, "farmer", false, { ...BASE, will: 100, maxWill: 100, extraStamina: 500, joiners: [1, 2, 3, 4, 5].map((n) => mate(n + 1)) }, () => 0);
    for (let i = 0; i < 8 && !f.outcome; i++) f.act("dodge");
    expect(f.standing.length).toBeLessThanOrEqual(MAX_FOES);
  });

  it("each of them takes a turn", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, extraStamina: 100, joiners: [mate(2)] }, () => 0);
    f.act("dodge");
    const before = f.events.length;
    f.act("dodge");
    const theirs = f.events.slice(before).filter((e) => e.startsWith("their:") && e !== "their:wander");
    expect(theirs.length).toBe(2);
  });

  it("one down, the rest fight on, and she turns on the next; all down, she's won", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, damage: 99, extraStamina: 100, joiners: [mate(2)] }, () => 0);
    f.act("dodge");
    expect(f.foes.length).toBe(2);
    f.act("strike");
    expect(f.foes[0].out).toBe("knocked");
    expect(f.outcome).toBeNull();
    expect(f.target).toBe(1);
    f.act("strike");
    expect(f.outcome).toBe("won");
  });

  it("she picks who she goes for", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, extraStamina: 100, joiners: [mate(2)] }, () => 0);
    f.act("dodge");
    f.setTarget(1);
    expect(f.targeted.guestId).toBe(2);
    f.setTarget(5);
    expect(f.target).toBe(1);
  });

  it("while one has her, another joins in at her mouth, once she's let him; struggling free throws them both off", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, ...READY, joiners: [mate(2, { horny: true })] }, () => 0.2);
    f.act("dodge");
    expect(f.offering).toBe("pussy");
    f.answerOffer("yes");
    expect(f.taken?.foe).toBe(0);
    for (let i = 0; i < 6 && !f.offering && !f.outcome; i++) f.act("steel");
    expect(f.offering).toBe("mouth");
    f.answerOffer("yes");
    expect(f.joined).toEqual([{ foe: 1, slot: "mouth" }]);
    const before = f.foes[1].pleasure;
    f.act("steel");
    expect(f.foes[1].pleasure).toBeGreaterThan(before);
    f.act("struggle");
    expect(f.taken).toBeNull();
    expect(f.joined).toEqual([]);
  });

  it("one of them coming is him out of it; the brawl goes on with the rest", () => {
    const f = new Fight(1, "farmer", false, { ...BASE, ...READY, joiners: [mate(2)] }, () => 0.2);
    f.act("dodge");
    f.answerOffer("yes");
    for (let i = 0; i < 12 && !f.foes[0].out; i++) {
      if (f.offering) f.answerOffer("pull");
      f.act(f.taken ? "goAlong" : "dodge");
      if (f.reaching) f.afterReach("pull", f.will);
    }
    expect(f.foes[0].out).toBe("spent");
    if (f.foes.length > 1) expect(f.outcome).toBeNull();
  });
});
