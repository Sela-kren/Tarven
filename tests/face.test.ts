import { describe, expect, it } from "vitest";
import {
  blendFace,
  easeFace,
  EXPRESSIONS,
  expressionFor,
  faceFor,
  faceMove,
  faceMoved,
  faceRig,
  REST_FACE,
  SULTRY_PAST,
  type FaceCause,
  type FacePart,
} from "../src/game/face";

const calm: FaceCause = { showing: null, reaction: null, arousal: 0, drunk: 0 };

/** A face drawn like hers: an eye dot either side, brows above, lips meeting at the corners of her mouth. */
const ring = (cx: number, cy: number) =>
  Array.from({ length: 12 }, (_, i) => [cx + 0.008 * Math.cos((i * Math.PI) / 6), cy + 0.008 * Math.sin((i * Math.PI) / 6), -0.07]);
const rig = faceRig(
  [...ring(-0.035, 1.487), ...ring(0.035, 1.487)],
  [[-0.012, 1.505, -0.08], [-0.055, 1.502, -0.06], [0.012, 1.505, -0.08], [0.055, 1.502, -0.06]],
  [[-0.016, 1.427, -0.08], [0, 1.428, -0.085], [0.016, 1.427, -0.08]],
)!;
const moved = (shape = REST_FACE, p: number[], part: FacePart = "skin") => {
  const out = [0, 0, 0];
  faceMove(rig, shape, p, part, out);
  return out;
};

describe("her face", () => {
  it("picks her expression from what she's going through", () => {
    expect(expressionFor(calm)).toBe("neutral");
    // Showing a guest something: shy, until she wants it well past what it takes.
    expect(expressionFor({ ...calm, showing: 0 })).toBe("shy");
    expect(expressionFor({ ...calm, showing: SULTRY_PAST })).toBe("sultry");
    // A touch's reaction comes first.
    expect(expressionFor({ ...calm, showing: 5, reaction: "jolt" })).toBe("surprised");
    expect(expressionFor({ ...calm, reaction: "melt" })).toBe("pleasure");
    expect(expressionFor({ ...calm, reaction: "recoil" })).toBe("annoyed");
  });

  it("goes heavy-lidded and flushed as she's aroused or drunk", () => {
    expect(faceFor(calm)).toEqual(REST_FACE);
    const aroused = faceFor({ ...calm, arousal: 1 });
    expect(aroused.lidUpper).toBeGreaterThan(0);
    expect(aroused.blush).toBeGreaterThan(0);
    expect(faceFor({ ...calm, drunk: 1 }).blush).toBeGreaterThan(0);
    // Never less than the expression's own.
    expect(faceFor({ ...calm, showing: 0, arousal: 0.1 }).blush).toBe(EXPRESSIONS.shy.blush);
  });

  it("eases from one expression to the next", () => {
    const half = blendFace(REST_FACE, EXPRESSIONS.smile, 0.5);
    expect(half.smile).toBeCloseTo(EXPRESSIONS.smile.smile / 2);
    const eased = easeFace(REST_FACE, EXPRESSIONS.smile, 0.05);
    expect(eased.smile).toBeGreaterThan(0);
    expect(eased.smile).toBeLessThan(EXPRESSIONS.smile.smile);
    expect(faceMoved(REST_FACE, REST_FACE)).toBe(false);
    expect(faceMoved(REST_FACE, eased)).toBe(true);
  });

  it("finds her eyes, brows and the corners of her mouth", () => {
    expect(rig.eyes[0].centre[0]).toBeCloseTo(-0.035);
    expect(rig.eyes[1].half[1]).toBeCloseTo(0.008);
    expect(rig.brows).toEqual([0.012, 0.055]);
    expect(rig.corners[0][0]).toBeCloseTo(-0.016);
    expect(rig.corners[1][0]).toBeCloseTo(0.016);
    expect(faceRig([], [], [])).toBeNull();
  });

  it("moves her face: lids close in, brows rise, mouth turns up, and nothing moves at rest", () => {
    const top = [0.035, 1.495, -0.07];
    expect(moved(REST_FACE, top)).toEqual(top);
    // Her upper lid down: the top of the dot comes down towards the middle, nearly to a line.
    expect(moved({ ...REST_FACE, lidUpper: 1 }, top)[1]).toBeCloseTo(1.487, 3);
    // Wide: further from the middle.
    expect(moved({ ...REST_FACE, wide: 1 }, top)[1]).toBeGreaterThan(1.495);
    // The inner end of a brow rises more than the outer, worried.
    const inner = moved({ ...REST_FACE, browInner: 1 }, [0.012, 1.505, -0.08], "brow")[1] - 1.505;
    const outer = moved({ ...REST_FACE, browInner: 1 }, [0.055, 1.502, -0.06], "brow")[1] - 1.502;
    expect(inner).toBeGreaterThan(outer);
    // Smiling, the corners of her mouth go up; a smirk lifts only her left.
    expect(moved({ ...REST_FACE, smile: 1 }, [0.016, 1.427, -0.08])[1]).toBeGreaterThan(1.427);
    expect(moved({ ...REST_FACE, smirk: 1 }, [0.016, 1.427, -0.08])[1]).toBeCloseTo(1.427);
    expect(moved({ ...REST_FACE, smirk: 1 }, [-0.016, 1.427, -0.08])[1]).toBeGreaterThan(1.427);
    // Her chin, well away from the corners, stays put.
    expect(moved({ ...REST_FACE, smile: 1 }, [0, 1.4, -0.08])).toEqual([0, 1.4, -0.08]);
  });

  it("opens her mouth: her lower lip and chin drop, her upper lip and teeth stay", () => {
    const open = { ...REST_FACE, open: 1 };
    expect(rig.line).toBeCloseTo(1.427);
    // Her upper lip's edge, on the mouth line, stays; her lower lip's, a hair below it, drops.
    expect(moved(open, [0, 1.427, -0.085])).toEqual([0, 1.427, -0.085]);
    expect(moved(open, [0, 1.4269, -0.085])[1]).toBeLessThan(1.42);
    // Her chin goes with it; the corners of her mouth hardly move.
    expect(moved(open, [0, 1.405, -0.08])[1]).toBeLessThan(1.4);
    expect(moved(open, [0.016, 1.4267, -0.08])[1]).toBeCloseTo(1.4267, 3);
    // Her upper teeth, even hanging below the line, stay with her skull.
    expect(moved(open, [0, 1.424, -0.083], "teeth")).toEqual([0, 1.424, -0.083]);
  });
});
