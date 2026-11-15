import { describe, expect, it } from "vitest";
import { experienceTier, HER_COME_LINES, HER_LINES, herVoice } from "../src/game/brawlher";
import { CROWD_LINES } from "../src/game/brawllines";
import { VOICES } from "../src/game/brawlvoices";
import { Fight, type FighterStats } from "../src/game/fight";
import { emptyMeters, type Meters } from "../src/game/passives";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
const READY = { desire: meters({ pussy: 90, cock: 80 }), pleasure: 30, exposure: 1, sexOk: true, prefers: "pussy" as const, workedUp: true };

describe("the brawl log's voices, Karryn's Prison style", () => {
  it("every type has its own say on every part of her, and the rest", () => {
    for (const voice of Object.values(VOICES)) {
      for (const lines of Object.values(voice.talk)) expect(lines.length).toBeGreaterThan(0);
      for (const lines of [voice.offer, voice.pose, voice.come, voice.refused]) expect(lines.length).toBeGreaterThan(0);
    }
    expect(VOICES.noble.talk.breasts).not.toEqual(VOICES.farmer.talk.breasts);
  });

  it("she answers by her Slut Level; horny or broken, that's in her voice instead", () => {
    expect(herVoice("proper", false, 10)).toBe("proper");
    expect(herVoice("lewd", true, 10)).toBe("lewd");
    expect(herVoice("proper", true, 10)).toBe("horny");
    expect(herVoice("lewd", false, 0)).toBe("broken");
    for (const moment of Object.values(HER_LINES)) for (const lines of Object.values(moment)) expect(lines.length).toBeGreaterThan(0);
    for (const where of Object.values(HER_COME_LINES)) for (const lines of Object.values(where)) expect(lines.length).toBeGreaterThan(0);
  });

  it("in a scene she talks by how used she is to it: her first time is her first time (KP's experience levels)", () => {
    expect(experienceTier(0)).toBe("first");
    expect(experienceTier(1)).toBe("proper");
    expect(experienceTier(5)).toBe("easy");
    expect(experienceTier(15)).toBe("lewd");
    // Her first time, horny or not; only with no willpower left is she past even that.
    expect(herVoice("first", true, 10)).toBe("first");
    expect(herVoice("first", false, 0)).toBe("broken");
    const f = new Fight(1, "farmer", false, { ...BASE, ...READY, tier: "lewd" }, () => 0.5);
    f.act("dodge");
    f.answerOffer("yes");
    expect(f.log.some((l) => HER_LINES.taken.first.some((h) => l.includes(h)))).toBe(true);
  });

  it("he says his piece, and she answers in her own voice", () => {
    const f = new Fight(1, "noble", false, { ...BASE, ...READY, tier: "lewd", experience: { pussy: 20 } }, () => 0.5);
    f.act("dodge");
    f.answerOffer("yes");
    const said = f.log.filter((l) => l.startsWith("You: \""));
    expect(said.length).toBeGreaterThan(0);
    expect(said.some((l) => HER_LINES.taken.lewd.some((h) => l.includes(h)))).toBe(true);
    expect(f.log.some((l) => VOICES.noble.offer.some((v) => l.includes(v)))).toBe(true);
  });

  it("the room has its say, at most once a turn", () => {
    const f = new Fight(1, "bandit", false, { ...BASE, ...READY, crowd: ["The farmer at their table"] }, () => 0.5);
    f.act("dodge");
    f.answerOffer("yes");
    for (let i = 0; i < 12 && !f.outcome; i++) {
      const before = f.events.length;
      f.act("goAlong");
      expect(f.events.slice(before).filter((e) => e === "crowd").length).toBeLessThanOrEqual(1);
    }
    const shouted = f.log.filter((l) => l.startsWith("The farmer at their table "));
    expect(shouted.length).toBeGreaterThan(0);
    const all = Object.values(CROWD_LINES).flat().map((l) => l.replace("{Who} ", ""));
    expect(shouted.every((l) => all.some((c) => l.endsWith(c)))).toBe(true);
  });

  it("what's said never changes how the fight goes", () => {
    const run = (crowd: string[]) => {
      let n = 0;
      const f = new Fight(1, "farmer", false, { ...BASE, ...READY, crowd }, () => [0.3, 0.7, 0.1, 0.9][n++ % 4]);
      for (let i = 0; i < 8 && !f.outcome; i++) {
        if (f.offering) f.answerOffer("yes");
        f.act(f.taken ? "goAlong" : "dodge");
        if (f.reaching) f.afterReach("pull", f.will);
      }
      return f.events.filter((e) => e !== "crowd" && e !== "her:say");
    };
    expect(run(["A smuggler across the room"])).toEqual(run([]));
  });
});
