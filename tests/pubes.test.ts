import { describe, expect, it } from "vitest";
import { LOOK_OPTIONS, copyLook, newLook, randomLook, readLook } from "../src/game/appearance";
import { PUBIC_HEIGHT, PUBIC_STYLES, PUBIC_WIDTH, drawPubes, pubicStyle, pubicTexture, texelAt } from "../src/game/pubes";

/** How many texels a drawing covers. */
const covered = (data: Uint8Array) => {
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
  return n;
};
/** Whether hair grows at a point on her, measured from the top of her cleft. */
const hairAt = (data: Uint8Array, x: number, h: number) => {
  let best = 0, bestD = Infinity;
  for (let row = 0; row < PUBIC_HEIGHT; row++) {
    for (let column = 0; column < PUBIC_WIDTH; column++) {
      const at = texelAt(column, row);
      const d = Math.hypot(at.x - x, at.h - h);
      if (d < bestD) {
        bestD = d;
        best = data[(row * PUBIC_WIDTH + column) * 4 + 3];
      }
    }
  }
  return best > 0;
};

describe("pubic hair styles", () => {
  it("never grows over the slit, though a full bush covers the outer lips beside it", () => {
    const bush = drawPubes(pubicStyle("bush"));
    expect(hairAt(bush, 0, -0.012)).toBe(false);
    expect(hairAt(bush, 0.018, -0.012)).toBe(true);
    expect(hairAt(bush, 0, 0.02)).toBe(true);
  });

  it("has trimmed first and bare last, with a heart among them", () => {
    expect(PUBIC_STYLES[0].id).toBe("trimmed");
    expect(PUBIC_STYLES.at(-1)!.id).toBe("bare");
    expect(PUBIC_STYLES.map((s) => s.id)).toContain("heart");
    expect(pubicStyle(undefined).id).toBe("trimmed");
    expect(pubicStyle("nonsense").id).toBe("trimmed");
  });

  it("draws nothing for bare, and something for every other style", () => {
    for (const style of PUBIC_STYLES) {
      const n = covered(drawPubes(style));
      if (style.shape) expect(n).toBeGreaterThan(20);
      else expect(n).toBe(0);
    }
  });

  it("grows from a landing strip to trimmed, natural and a full bush", () => {
    const size = (id: string) => covered(drawPubes(pubicStyle(id)));
    expect(size("strip")).toBeLessThan(size("trimmed"));
    expect(size("trimmed")).toBeLessThan(size("natural"));
    expect(size("natural")).toBeLessThan(size("bush"));
  });

  it("draws a heart with two lobes over a point, and nothing in the notch between them", () => {
    const heart = drawPubes(pubicStyle("heart"));
    expect(hairAt(heart, -0.019, 0.06)).toBe(true);
    expect(hairAt(heart, 0.019, 0.06)).toBe(true);
    expect(hairAt(heart, 0, 0.078)).toBe(false);
    expect(hairAt(heart, 0, 0.02)).toBe(true);
    expect(hairAt(heart, 0.03, 0.015)).toBe(false);
  });

  it("is the same left and right for a shaved shape", () => {
    const diamond = drawPubes(pubicStyle("diamond"));
    for (let row = 0; row < PUBIC_HEIGHT; row++) {
      for (let column = 0; column < PUBIC_WIDTH / 2; column++) {
        const left = diamond[(row * PUBIC_WIDTH + column) * 4 + 3];
        const right = diamond[(row * PUBIC_WIDTH + PUBIC_WIDTH - 1 - column) * 4 + 3];
        expect(left).toBe(right);
      }
    }
  });

  it("grows and shrinks with its size", () => {
    const trimmed = pubicStyle("trimmed");
    expect(covered(drawPubes(trimmed, 1))).toBeGreaterThan(covered(drawPubes(trimmed, 0)));
    expect(covered(drawPubes(trimmed, -1))).toBeLessThan(covered(drawPubes(trimmed, 0)));
  });

  it("makes each style's texture once per size step", () => {
    const style = pubicStyle("heart");
    expect(pubicTexture(style, 0.31)).toBe(pubicTexture(style, 0.29));
    expect(pubicTexture(style, 0.5)).not.toBe(pubicTexture(style, 0));
  });
});

describe("pubic hair in the look", () => {
  it("is hers only, with a size, a style and a colour that follows her hair", () => {
    expect(LOOK_OPTIONS.Female.pubes).toBe(PUBIC_STYLES);
    expect(LOOK_OPTIONS.Male.pubes).toEqual([]);
    expect(LOOK_OPTIONS.Female.sliders.find((s) => s.id === "pubesSize")?.tab).toBe("body");
    const color = LOOK_OPTIONS.Female.colors.find((c) => c.id === "pubes")!;
    expect(color.follows).toBe("hair");
    expect(color.palette.length).toBeGreaterThan(9);
  });

  it("keeps its style through copying and storage, and drops an unknown or default one", () => {
    const look = newLook();
    look.pubes = "heart";
    expect(copyLook(look).pubes).toBe("heart");
    expect(readLook(JSON.parse(JSON.stringify(look)), "Female")?.pubes).toBe("heart");
    expect(readLook({ ...look, pubes: "spiral" }, "Female")?.pubes).toBeUndefined();
    expect(readLook({ ...look, pubes: "trimmed" }, "Female")?.pubes).toBeUndefined();
    expect(readLook(look, "Male")?.pubes).toBeUndefined();
  });

  it("rolls a style for a random look", () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const styles = new Set(Array.from({ length: 60 }, () => randomLook("Female", random).pubes ?? "trimmed"));
    expect(styles.size).toBeGreaterThan(4);
  });
});
