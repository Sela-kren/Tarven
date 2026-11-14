import { describe, expect, it } from "vitest";
import { readLook, underOf } from "../src/game/appearance";
import { stripPiece } from "../src/game/banter";
import {
  BRIEF_STYLES, LINGERIE_HEIGHT, LINGERIE_WIDTH, NIPPLE, TOP_STYLES, WHOLE_STYLES, coversNipples, drawLingerie, texelAt,
} from "../src/game/lingerie";
import { stripLadder } from "../src/game/wardrobe";

const RED = [1, 0, 0] as const;
const BLUE = [0, 0, 1] as const;

/** How many texels a drawing covers on each side. */
function covered(data: Uint8Array) {
  const count = { front: 0, back: 0 };
  for (let row = 0; row < LINGERIE_HEIGHT; row++) {
    for (let column = 0; column < LINGERIE_WIDTH; column++) {
      if (data[(row * LINGERIE_WIDTH + column) * 4 + 3]) count[texelAt(column, row).side]++;
    }
  }
  return count;
}

describe("her underwear styles", () => {
  it("keeps her band and braies first, painted on her, drawing nothing", () => {
    expect(TOP_STYLES[0].id).toBe("band");
    expect(BRIEF_STYLES[0].id).toBe("braies");
    expect(covered(drawLingerie(TOP_STYLES[0], BRIEF_STYLES[0], RED, BLUE))).toEqual({ front: 0, back: 0 });
  });

  it("draws every other style on her front", () => {
    for (const style of [...TOP_STYLES.slice(1), ...BRIEF_STYLES.slice(1)]) {
      const top = style.kind === "bottom" ? null : style;
      const bottom = style.kind === "bottom" ? style : null;
      expect(covered(drawLingerie(top, bottom, RED, BLUE)).front, style.id).toBeGreaterThan(20);
    }
    // Forty-odd full drawings: slow while every other test file runs alongside.
  }, 30_000);

  it("covers her between the legs in every pair of briefs and every one-piece", () => {
    // The heart pasty is only stuck on her front.
    for (const style of [...BRIEF_STYLES.slice(1).filter((s) => s.id !== "heart"), ...WHOLE_STYLES]) {
      expect(style.front!(0, 0.755), style.id).toBeGreaterThan(0);
      expect(style.back!(0, 0.755), style.id).toBeGreaterThan(0);
    }
  });

  it("sticks the heart pasty over her pussy, point down, and leaves her bare behind and beside it", () => {
    const heart = BRIEF_STYLES.find((s) => s.id === "heart")!;
    expect(heart.front!(0, 0.755)).toBeGreaterThan(0);
    expect(heart.front!(0, 0.8)).toBeGreaterThan(0);
    expect(heart.front!(0.03, 0.81)).toBeGreaterThan(0);
    expect(heart.front!(0.035, 0.76)).toBeLessThan(0); // beside its point
    expect(heart.front!(0, 0.9)).toBeLessThan(0);
    expect(heart.back!(0, 0.79)).toBeLessThan(0);
  });

  it("bares her cheeks in a thong and covers them in full briefs", () => {
    const cheek = [0.07, 0.79] as const;
    expect(BRIEF_STYLES.find((s) => s.id === "thong")!.back!(...cheek)).toBeLessThan(0);
    expect(BRIEF_STYLES.find((s) => s.id === "hiphugger")!.back!(...cheek)).toBeGreaterThan(0);
  });

  it("covers her nipples in a full cup and pasties, but not a shelf or a harness", () => {
    const top = (id: string) => TOP_STYLES.find((s) => s.id === id)!;
    expect(coversNipples(top("fullcup"))).toBe(true);
    expect(coversNipples(top("pasties"))).toBe(true);
    expect(coversNipples(top("hearts"))).toBe(true);
    // The heart's lobes are above the nipple and its point below it.
    expect(top("hearts").front!(NIPPLE.x - 0.012, NIPPLE.z + 0.015)).toBeGreaterThan(0);
    expect(top("hearts").front!(NIPPLE.x, NIPPLE.z - 0.02)).toBeGreaterThan(0);
    expect(top("hearts").front!(NIPPLE.x + 0.02, NIPPLE.z - 0.018)).toBeLessThan(0);
    expect(coversNipples(top("shelf"))).toBe(false);
    expect(coversNipples(top("harness"))).toBe(false);
    expect(top("harness").front!(NIPPLE.x, NIPPLE.z)).toBeLessThan(0);
  });

  it("colours the top and the briefs each in their own colour", () => {
    const data = drawLingerie(TOP_STYLES.find((s) => s.id === "fullcup")!, BRIEF_STYLES.find((s) => s.id === "bikini")!, RED, BLUE);
    let red = 0, blue = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue;
      if (data[i] > data[i + 2]) red++;
      else blue++;
    }
    expect(red).toBeGreaterThan(50);
    expect(blue).toBeGreaterThan(50);
  });

  it("wears a one-piece instead of her briefs", () => {
    expect(underOf("Female", { bra: "bodysuit", briefs: "thong" })).toEqual({ top: WHOLE_STYLES[0], bottom: null });
    expect(underOf("Female", { briefs: "thong" })?.bottom?.id).toBe("thong");
    expect(underOf("Male", { bra: "bodysuit" })).toBeNull();
  });

  it("keeps her styles in a saved look and drops unknown ones", () => {
    expect(readLook({ bra: "plunge", briefs: "thong" }, "Female")).toMatchObject({ bra: "plunge", briefs: "thong" });
    const odd = readLook({ bra: "chainmail", briefs: "band" }, "Female")!;
    expect(odd.bra).toBeUndefined();
    expect(odd.briefs).toBeUndefined();
  });
});

describe("taking her underwear off", () => {
  it("names her bra and briefs by their styles, with lines that fit them", () => {
    const ladder = stripLadder("Female", undefined, undefined, { bra: "pasties", briefs: "thong" });
    expect(ladder.slice(-2).map((g) => g.label)).toEqual(["pasties", "thong"]);
    expect(stripPiece(ladder[ladder.length - 1]).accept).toContain("thong");
    expect(stripPiece(ladder[ladder.length - 2]).dare).not.toContain("band");
  });

  it("takes a one-piece off in one go, with nothing left after it", () => {
    const ladder = stripLadder("Female", undefined, undefined, { bra: "bodysuit", briefs: "thong" });
    expect(ladder.map((g) => g.id)).not.toContain("smalls");
    expect(ladder[ladder.length - 1]).toMatchObject({ id: "bra", label: "bodysuit" });
  });

  it("keeps her band and braies as they were", () => {
    expect(stripLadder("Female", undefined, undefined, {})).toEqual(stripLadder("Female"));
  });
});
