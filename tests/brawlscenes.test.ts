import { describe, expect, it } from "vitest";
import {
  canStart,
  FOE_SCENE_LIST,
  FOE_SCENES,
  kickCounterChance,
  KIND_SCENES,
  pickFoeScene,
  sceneReady,
  upgradeScene,
  type HerReadiness,
} from "../src/game/brawlscenes";
import { Fight, type FighterStats } from "../src/game/fight";
import { emptyMeters, type Meters } from "../src/game/passives";
import { GUEST_KIND_LIST } from "../src/game/guestroles";

const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
/** Her, ready for anything. */
const ALL: HerReadiness = { desire: meters({ body: 100, mouth: 100, breasts: 100, butt: 100, pussy: 100, cock: 100 }), wet: true, exposure: 1, experience: { hands: 1, mouth: 1, breasts: 1, pussy: 1, butt: 1 } };
const NOTHING: HerReadiness = { desire: emptyMeters(), wet: false, exposure: 0 };
const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const READY = { desire: ALL.desire, pleasure: 30, exposure: 1, sexOk: true, workedUp: true, will: 100, maxWill: 100, experience: ALL.experience };

/** Karryn's Prison's battle sex poses, as Tarven's brawl scenes (GAME_PATH.MD 7i). */
describe("the brawl's scenes, Karryn's Prison style", () => {
  it("has all twenty-six: KP's thirteen, and Tarven's thirteen", () => {
    expect(FOE_SCENE_LIST.length).toBe(26);
    // Every kind has scenes of its own, and every KP scene but the kick counter is somebody's.
    for (const kind of GUEST_KIND_LIST) expect(KIND_SCENES[kind].length).toBeGreaterThan(0);
    const started = new Set(Object.values(KIND_SCENES).flat());
    for (const def of FOE_SCENE_LIST) if (!["hands", "mouth", "breasts", "pussy", "butt", "kickCounter"].includes(def.id)) expect(started.has(def.id)).toBe(true);
  });

  it("each needs her ready for it", () => {
    for (const def of FOE_SCENE_LIST) {
      expect(sceneReady(def.id, ALL)).toBe(true);
      expect(sceneReady(def.id, NOTHING)).toBe(false);
    }
    // In her takes her wet, as in KP.
    expect(sceneReady("gangbang", { ...ALL, wet: false })).toBe(false);
  });

  it("has a switch for rimjobs and footjobs, as KP does", () => {
    expect(sceneReady("rimjob", { ...ALL, rimjob: false })).toBe(false);
    expect(sceneReady("footjob", { ...ALL, footjob: false })).toBe(false);
    expect(sceneReady("rimjob", { ...ALL, footjob: false })).toBe(true);
  });

  it("each kind starts its KP counterpart's scenes", () => {
    expect(pickFoeScene("bandit", undefined, ALL, 0)).toBe("gangbang");
    expect(pickFoeScene("noble", undefined, ALL, 0)).toBe("footjob");
    expect(pickFoeScene("farmer", undefined, ALL, 0)).toBe("licked");
    // Nothing of his she's ready for: the part she's ready for, Tarven's way.
    const handsOnly: HerReadiness = { ...NOTHING, desire: meters({ cock: 45 }) };
    expect(pickFoeScene("bandit", undefined, handsOnly, 0)).toBe("hands");
    expect(pickFoeScene("bandit", undefined, NOTHING, 0)).toBeNull();
  });

  it("a fugitive won't go for her mouth, pussy or rear before she's done it (KP's prisoners)", () => {
    const fresh: HerReadiness = { ...ALL, experience: {} };
    expect(canStart("fugitive", "mouth", fresh)).toBe(false);
    expect(canStart("fugitive", "hands", fresh)).toBe(true);
    expect(canStart("fugitive", "mouth", ALL)).toBe(true);
    expect(canStart("bandit", "mouth", fresh)).toBe(true);
  });

  it("moves a scene on only to a bolder one of his", () => {
    const next = upgradeScene("soldier", undefined, "hands", ALL, 0.99);
    expect(next).not.toBeNull();
    expect(FOE_SCENES[next!].boldness).toBeGreaterThan(FOE_SCENES.hands.boldness);
    expect(upgradeScene("bandit", undefined, "gangbang", ALL, 0)).toBeNull();
    // KP's goblin: from his mouth on her to having her.
    expect(upgradeScene("farmer", undefined, "licked", ALL, 0.99)).not.toBeNull();
  });

  it("only a bandit or adventurer, erect, catches her kick", () => {
    const her = { ...ALL, horny: false };
    expect(kickCounterChance("bandit", { erect: true, horny: false, angry: false }, her)).toBeGreaterThan(0);
    expect(kickCounterChance("bandit", { erect: false, horny: false, angry: false }, her)).toBe(0);
    expect(kickCounterChance("noble", { erect: true, horny: true, angry: false }, her)).toBe(0);
    expect(kickCounterChance("bandit", { erect: true, horny: false, angry: true }, her)).toBe(0);
  });
});

describe("the scenes in a brawl", () => {
  it("a bandit catches her kick and puts it to her; a yes is the scene", () => {
    const f = new Fight(1, "bandit", false, { ...BASE, ...READY, prefers: "pussy" }, () => 0.01);
    f.foes[0].horny = true;
    f.act("kick");
    expect(f.offeringScene).toBe("kickCounter");
    f.answerOffer("yes");
    expect(f.taken?.scene).toBe("kickCounter");
    expect(f.taken?.area).toBe("pussy");
  });

  it("pulling away from a scene he'd move on gets her clear of it", () => {
    const f = new Fight(1, "soldier", false, { ...BASE, ...READY, prefers: "hands" }, () => 0.01);
    f.foes[0].horny = true;
    for (let i = 0; i < 4 && !f.offering; i++) f.act("dodge");
    expect(f.offering).not.toBeNull();
    f.answerOffer("yes");
    expect(f.taken).not.toBeNull();
    for (let i = 0; i < 8 && !f.offerUpgrade && f.taken && !f.outcome; i++) f.act("steel");
    expect(f.offerUpgrade).toBe(true);
    expect(FOE_SCENES[f.offeringScene!].boldness).toBeGreaterThan(FOE_SCENES[f.taken!.scene].boldness);
    f.answerOffer("pull");
    expect(f.taken).toBeNull();
  });
});
