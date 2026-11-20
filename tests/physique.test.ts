import { describe, expect, it } from "vitest";
import { SKIN_TONES } from "../src/game/appearance";
import { guestMan, ROLE_PHYSIQUE, rollHeritage } from "../src/game/physique";

describe("men's physique", () => {
  it("is the same man for the same look, and another for another", () => {
    expect(guestMan(42, "brute")).toEqual(guestMan(42, "brute"));
    expect(guestMan(42, "brute")).not.toEqual(guestMan(43, "brute"));
  });

  it("keeps each type in its own range: a brute is always heavier set than a mage", () => {
    for (let look = 1; look < 200; look++) {
      const brute = guestMan(look, "brute").sliders;
      const mage = guestMan(look, "mage").sliders;
      expect(brute.muscle).toBeGreaterThanOrEqual(ROLE_PHYSIQUE.brute.muscle![0]);
      expect(mage.muscle).toBeLessThanOrEqual(ROLE_PHYSIQUE.mage.muscle![1]);
      expect(brute.muscle).toBeGreaterThan(mage.muscle);
      // Age only goes older than the young adult he's built as.
      expect(brute.age).toBeGreaterThanOrEqual(0);
    }
  });

  it("rolls every heritage, mostly one people, and a skin tone to go with it", () => {
    const seen = new Set<string>();
    let r = 0.0;
    const next = () => (r = (r + 0.137) % 1);
    for (let i = 0; i < 100; i++) {
      const h = rollHeritage(next);
      const top = Object.entries(h).sort((a, b) => b[1] - a[1]);
      seen.add(top[0][0]);
      expect(top[0][1]).toBeGreaterThan(0.35);
    }
    expect(seen).toEqual(new Set(["african", "asian", "caucasian"]));
    for (let look = 1; look < 300; look++) {
      const man = guestMan(look);
      const tone = SKIN_TONES.indexOf(man.colors.skin);
      if (man.sliders.african >= 0.75) expect(tone).toBeGreaterThanOrEqual(4);
      if (man.sliders.caucasian >= 0.75) expect(tone).toBeLessThanOrEqual(3);
    }
  });
});
