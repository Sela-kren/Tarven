import { describe, expect, it } from "vitest";
import { erect, lewdTurn, pickScene, readyFor, wantsHer } from "../src/game/brawlai";
import { Fight, type FighterStats } from "../src/game/fight";
import { emptyMeters, type Meters } from "../src/game/passives";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
/** Her ready for him in her: wet, and nothing on below. */
const READY = { desire: meters({ pussy: 90, cock: 80, mouth: 85 }), pleasure: 30, exposure: 1, sexOk: true, prefers: "pussy" as const };
const fight = (extra: Partial<FighterStats>, random = () => 0.5, drunk = false) => new Fight(1, "farmer", drunk, { ...BASE, ...extra }, random);

describe("a foe's mind, Karryn's Prison style", () => {
  it("a scene only once she's ready for it", () => {
    const her = { desire: meters({ cock: 40 }), wet: false, exposure: 0 };
    expect(readyFor("hands", her)).toBe(true);
    expect(readyFor("mouth", her)).toBe(false);
    expect(readyFor("pussy", { desire: meters({ pussy: 90, cock: 80 }), wet: false, exposure: 1 })).toBe(false);
    expect(readyFor("pussy", { desire: meters({ pussy: 90, cock: 80 }), wet: true, exposure: 0.2 })).toBe(false);
    expect(readyFor("pussy", { desire: meters({ pussy: 90, cock: 80 }), wet: true, exposure: 1 })).toBe(true);
  });

  it("the part his type goes for, if she's ready for it; else the boldest she is", () => {
    const her = { desire: meters({ cock: 60, mouth: 85 }), wet: false, exposure: 0 };
    expect(pickScene("pussy", her)).toBe("mouth");
    expect(pickScene("hands", her)).toBe("hands");
    expect(pickScene("pussy", { desire: meters({}), wet: false, exposure: 0 })).toBeNull();
  });

  it("wants her or wants her hurt: horny and not angry, always her", () => {
    expect(wantsHer({ horny: true, angry: false, anger: 30, pleasure: 0 }, 0)).toBe(true);
    expect(wantsHer({ horny: false, angry: true, anger: 80, pleasure: 0 }, 0.5)).toBe(false);
    expect(wantsHer({ horny: false, angry: true, anger: 80, pleasure: 0 }, 0.9)).toBe(true);
    // The more worked up he gets, the less his anger holds him back.
    expect(wantsHer({ horny: false, angry: true, anger: 80, pleasure: 60 }, 0.5)).toBe(true);
    expect(erect({ horny: false, pleasure: 49 })).toBe(false);
    expect(erect({ horny: false, pleasure: 50 })).toBe(true);
  });

  it("no scene to be had: a grope, lewd talk, or a stare at what's bare", () => {
    expect(lewdTurn("breasts", 0, true, 0.1, 0)).toEqual({ kind: "grope" });
    expect(lewdTurn("breasts", 0, false, 0.1, 0)).toEqual({ kind: "talk", part: "breasts" });
    expect(lewdTurn("breasts", 1, false, 0.5, 0)).toEqual({ kind: "sight", part: "breasts" });
  });
});

describe("in a brawl", () => {
  it("a worked-up foe starts a scene she's ready for; she's asked, and it holds", () => {
    const f = fight({ ...READY, workedUp: true });
    f.act("dodge");
    expect(f.offering).toBe("pussy");
    expect(f.choices()).toEqual([]);
    f.answerOffer("yes");
    expect(f.taken?.area).toBe("pussy");
    // Her fists are no use while he has her.
    expect(f.choices().map((c) => c.move)).not.toContain("strike");
    f.act("strike");
    expect(f.taken?.turns).toBe(0);
    for (let i = 0; i < 20 && !f.outcome; i++) f.act("goAlong");
    expect(f.outcome).toBe("won");
    expect(f.spent).toBe(true);
    expect(f.events).toContain("their:come");
  });

  it("pulling away always gets her clear", () => {
    const f = fight({ ...READY, workedUp: true });
    f.act("dodge");
    f.answerOffer("pull");
    expect(f.taken).toBeNull();
    expect(f.outcome).toBeNull();
    expect(f.events).toContain("reach:pull");
  });

  it("struggling free of him", () => {
    const f = fight({ ...READY, workedUp: true }, () => 0);
    f.act("dodge");
    f.answerOffer("yes");
    f.act("struggle");
    expect(f.taken).toBeNull();
    expect(f.events).toContain("struggle:free");
  });

  it("never with her too drunk, or him roaring drunk (the consent rule)", () => {
    const tipsy = fight({ ...READY, workedUp: true, sexOk: false });
    for (let i = 0; i < 6 && !tipsy.outcome; i++) {
      tipsy.act("dodge");
      if (tipsy.reaching) tipsy.afterReach("pull", tipsy.will);
    }
    expect(tipsy.events.some((e) => e.startsWith("their:offer"))).toBe(false);
    const drunk = fight({ ...READY, workedUp: true }, () => 0.5, true);
    for (let i = 0; i < 6 && !drunk.outcome; i++) {
      drunk.act("dodge");
      if (drunk.reaching) drunk.afterReach("pull", drunk.will);
    }
    expect(drunk.events.some((e) => e.startsWith("their:offer"))).toBe(false);
  });

  it("not ready for him yet, he talks lewd at her and works himself up", () => {
    const f = fight({ desire: meters({}), exposure: 0, sexOk: true, workedUp: true }, () => 0.6);
    f.act("dodge");
    expect(f.offering).toBeNull();
    expect(f.events.some((e) => e.startsWith("their:talk:"))).toBe(true);
    expect(f.foePleasure).toBeGreaterThan(0);
  });
});
