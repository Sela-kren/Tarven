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
  faceSurface,
  REST_FACE,
  SULTRY_PAST,
  BASHFUL_BELOW,
  DELIGHTED_PAST,
  BEARING,
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
  [[0, 1.4245, -0.081], [0.006, 1.4235, -0.07], [-0.006, 1.4235, -0.07]],
)!;
const moved = (shape = REST_FACE, p: number[], part: FacePart = "skin") => {
  const out = [0, 0, 0];
  faceMove(rig, shape, p, part, out);
  return out;
};

describe("her face", () => {
  it("picks her expression from what she's going through", () => {
    // Her bearing, from her Slut Level: stern, at ease, confident.
    expect(expressionFor(calm)).toBe("stern");
    expect(expressionFor({ ...calm, slut: BEARING.easy })).toBe("neutral");
    expect(expressionFor({ ...calm, slut: BEARING.confident })).toBe("confident");
    // Showing a guest something: shy, until she wants it well past what it takes.
    // Showing a guest something: bashful barely able to, shy, sultry, then delighted the more she wants it.
    expect(expressionFor({ ...calm, showing: 0 })).toBe("bashful");
    expect(expressionFor({ ...calm, showing: BASHFUL_BELOW })).toBe("shy");
    expect(expressionFor({ ...calm, showing: DELIGHTED_PAST })).toBe("delighted");
    expect(expressionFor({ ...calm, showing: SULTRY_PAST })).toBe("sultry");
    // A touch's reaction comes first.
    expect(expressionFor({ ...calm, showing: 5, reaction: "jolt" })).toBe("surprised");
    expect(expressionFor({ ...calm, reaction: "melt" })).toBe("pleasure");
    expect(expressionFor({ ...calm, reaction: "recoil" })).toBe("annoyed");
    // What she's in the middle of: an after-hours game, a brawl.
    // In an after-hours game: still proper she strains against it, worked up between, lewd enough she loves it.
    expect(expressionFor({ ...calm, duel: { state: "aroused", pleasure: 0.3 } })).toBe("strained");
    expect(expressionFor({ ...calm, slut: BEARING.easy, duel: { state: "aroused", pleasure: 0.3 } })).toBe("aroused");
    expect(expressionFor({ ...calm, slut: BEARING.confident, duel: { state: "aroused", pleasure: 0.3 } })).toBe("delighted");
    // Melting into a touch: pleasure while she's proper, blissful once she's lewd.
    expect(expressionFor({ ...calm, slut: BEARING.confident, reaction: "melt" })).toBe("blissful");
    expect(expressionFor({ ...calm, duel: { state: "edge", pleasure: 0.9 } })).toBe("edge");
    expect(expressionFor({ ...calm, duel: { state: "calm", pleasure: 0 } })).toBe("stern");
    expect(expressionFor({ ...calm, fighting: true })).toBe("angry");
    // What just happened, for a moment; a touch still comes first.
    expect(expressionFor({ ...calm, moment: "tipped" })).toBe("smile");
    expect(expressionFor({ ...calm, moment: "walkedOut" })).toBe("annoyed");
    expect(expressionFor({ ...calm, moment: "refused", showing: 0 })).toBe("angry");
    expect(expressionFor({ ...calm, moment: "tipped", reaction: "jolt" })).toBe("surprised");
    // Jolted while she's worked up, she's overwhelmed; on the edge with her pleasure past it, she loses herself.
    expect(expressionFor({ ...calm, reaction: "jolt", arousal: 0.8 })).toBe("overwhelmed");
    const edge = (pleasure: number) => faceFor({ ...calm, duel: { state: "edge", pleasure } });
    expect(edge(1).tongue).toBeGreaterThan(0.9);
    expect(edge(0.5).tongue).toBe(EXPRESSIONS.edge.tongue);
  });

  it("wears her state over her bearing: tired, embarrassed, drunk", () => {
    const at = (cause: Partial<FaceCause>) => faceFor({ ...calm, slut: BEARING.easy, ...cause });
    const rest = at({});
    // Worn down, her lids get heavy and her brows sag up in the middle.
    expect(at({ will: 0 }).lidUpper).toBeGreaterThan(rest.lidUpper + 0.3);
    expect(at({ will: 0 }).browInner).toBeGreaterThan(0.3);
    expect(at({ will: 0.8 })).toEqual(rest);
    // Her clothes off, she's red and looks away; less so the lewder she is, not at all once she's shameless.
    expect(at({ exposed: 1 }).blush).toBeGreaterThan(0.6);
    expect(at({ exposed: 1, slut: BEARING.shameless }).blush).toBe(faceFor({ ...calm, slut: BEARING.shameless }).blush);
    // Drunk, she's flushed and smiling loosely.
    expect(at({ drunk: 1 }).smile).toBeGreaterThan(rest.smile);
    // Deep in an after-hours game, her pleasure takes her further.
    // Worked up in an after-hours game, she pants as her pleasure climbs, tongue and all.
    const game = (pleasure: number) => faceFor({ ...calm, slut: BEARING.easy, duel: { state: "aroused", pleasure } });
    expect(game(1).lidUpper).toBeGreaterThan(game(0).lidUpper);
    expect(game(1).tongue).toBeGreaterThan(0.5);
  });

  it("goes heavy-lidded and flushed as she's aroused or drunk", () => {
    expect(faceFor(calm)).toEqual(EXPRESSIONS.stern);
    const aroused = faceFor({ ...calm, arousal: 1 });
    expect(aroused.lidUpper).toBeGreaterThan(0);
    expect(aroused.blush).toBeGreaterThan(0);
    expect(faceFor({ ...calm, drunk: 1 }).blush).toBeGreaterThan(0);
    // Never less than the expression's own.
    expect(faceFor({ ...calm, showing: BASHFUL_BELOW, arousal: 0.1 }).blush).toBe(EXPRESSIONS.shy.blush);
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
    expect(rig.tongue).toEqual([-0.081, -0.07]);
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
    // Cross, they come down and knit in towards each other, and forwards so they stay on her brow.
    const cross = moved({ ...REST_FACE, browInner: -1 }, [0.012, 1.505, -0.08], "brow");
    expect(cross[0]).toBeLessThan(0.012);
    expect(cross[1]).toBeLessThan(1.505);
    expect(cross[2]).toBeLessThan(-0.08);
    // Arched, the middle of a brow rises most; curving down, its outer end drops.
    const middle = [0.033, 1.506, -0.07];
    const arched = moved({ ...REST_FACE, browArch: 1 }, middle, "brow")[1] - 1.506;
    expect(arched).toBeGreaterThan(moved({ ...REST_FACE, browArch: 1 }, [0.055, 1.502, -0.06], "brow")[1] - 1.502);
    expect(moved({ ...REST_FACE, browOuter: -1 }, [0.055, 1.502, -0.06], "brow")[1]).toBeLessThan(1.502);
    expect(moved({ ...REST_FACE, browOuter: -1 }, [0.012, 1.505, -0.08], "brow")[1]).toBeCloseTo(1.505, 4);
    // Drawn close over her eyes, her brows come down further than lowered ever takes them.
    const lowest = moved({ ...REST_FACE, brow: -1, browInner: -1 }, [0.033, 1.506, -0.07], "brow")[1];
    expect(moved({ ...REST_FACE, brow: -1, browNear: 1 }, [0.033, 1.506, -0.07], "brow")[1]).toBeLessThan(lowest - 0.008);
    // Flicked, only the very tips of her brows by her nose lift.
    expect(moved({ ...REST_FACE, browTip: 1 }, [0.012, 1.505, -0.08], "brow")[1]).toBeGreaterThan(1.507);
    expect(moved({ ...REST_FACE, browTip: 1 }, [0.033, 1.506, -0.07], "brow")[1]).toBe(1.506);
    // Her tongue comes out forwards, its tip furthest, hanging down over her lower lip; its root less, and lifted.
    const tip = moved({ ...REST_FACE, tongue: 1 }, [0, 1.4245, -0.081], "tongue");
    const root = moved({ ...REST_FACE, tongue: 1 }, [0.006, 1.4235, -0.07], "tongue");
    expect(tip[2]).toBeLessThan(-0.095);
    expect(tip[1]).toBeLessThan(1.4245);
    expect(root[2] - -0.07).toBeGreaterThan(tip[2] - -0.081);
    expect(root[1]).toBeGreaterThan(1.4235);
    expect(root[0]).toBeGreaterThan(0.006);
    // Smiling, the corners of her mouth go up; a smirk lifts only her left.
    expect(moved({ ...REST_FACE, smile: 1 }, [0.016, 1.427, -0.08])[1]).toBeGreaterThan(1.427);
    expect(moved({ ...REST_FACE, smirk: 1 }, [0.016, 1.427, -0.08])[1]).toBeCloseTo(1.427);
    expect(moved({ ...REST_FACE, smirk: 1 }, [-0.016, 1.427, -0.08])[1]).toBeGreaterThan(1.427);
    // Pressed small, the corners of her mouth draw in.
    expect(moved({ ...REST_FACE, purse: 1 }, [0.016, 1.427, -0.08])[0]).toBeLessThan(0.016);
    // Pressed thin into a line, her lips close in on her mouth line from above and below, and widen a touch.
    const pressed = { ...REST_FACE, press: 1 };
    expect(moved(pressed, [0, 1.431, -0.085])[1]).toBeLessThan(1.429);
    expect(moved(pressed, [0, 1.4228, -0.085])[1]).toBeGreaterThan(1.425);
    expect(moved(pressed, [0.016, 1.427, -0.08])[0]).toBeGreaterThan(0.016);
    expect(moved(pressed, [0, 1.405, -0.08])).toEqual([0, 1.405, -0.08]);
    // Her chin, well away from the corners, stays put.
    expect(moved({ ...REST_FACE, smile: 1 }, [0, 1.4, -0.08])).toEqual([0, 1.4, -0.08]);
  });

  it("finds the front of her face, for her brows to lie on", () => {
    // A slope leaning back as it goes up, and behind it a plane further back that never counts.
    const surface = faceSurface([
      [0, 0, -0.08, 0.1, 0, -0.08, 0, 0.1, -0.07],
      [0, 0, -0.02, 0.1, 0, -0.02, 0, 0.1, -0.02],
    ]);
    expect(surface(0.02, 0.05)).toBeCloseTo(-0.075);
    expect(surface(0.5, 0.5)).toBeNull();
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
    // Her upper teeth, even hanging below the line, stay with her skull, only spreading as her mouth widens.
    expect(moved(open, [0, 1.424, -0.083], "teeth")).toEqual([0, 1.424, -0.083]);
    const tooth = moved(open, [0.009, 1.424, -0.08], "teeth");
    expect(tooth[0]).toBeGreaterThan(0.009);
    expect(tooth[1]).toBe(1.424);
    // Her whole mouth widens as one, inside and all: halfway to the corner, half as far as the corner goes.
    const corner = moved(open, [0.016, 1.428, -0.08])[0] - 0.016;
    expect(moved(open, [0.008, 1.428, -0.07])[0] - 0.008).toBeCloseTo(corner / 2, 5);
    // Well out on her cheek, nothing.
    expect(moved(open, [0.04, 1.428, -0.07])[0]).toBe(0.04);
  });

  it("shapes her open mouth by its rig: rounded in a U, or bared wide and flat on both rows of teeth", () => {
    const open = { ...REST_FACE, open: 1 };
    const round = { ...open, round: 1 };
    const bare = { ...open, bare: 1 };
    // How far her lower lip's edge drops, and her upper lip's rises, at x.
    const drop = (shape: typeof open, x: number) => 1.4269 - moved(shape, [x, 1.4269, -0.085])[1];
    const rise = (shape: typeof open, x: number) => moved(shape, [x, 1.427, -0.085])[1] - 1.427;
    const nearCorner = 0.0135;
    // Plain, her lower lip hardly drops near her corners: a wedge. Rounded, it drops well down there, but less than
    // in the middle: a U. Bared, nearly as far as in the middle: square at the ends.
    expect(drop(round, nearCorner)).toBeGreaterThan(drop(open, nearCorner) * 2);
    expect(drop(round, nearCorner)).toBeLessThan(drop(round, 0) * 0.8);
    expect(drop(bare, nearCorner)).toBeGreaterThan(drop(bare, 0) * 0.9);
    // Her upper lip: arched up in the middle when rounded, drawn up flat across off her teeth when bared, and her
    // corners not lifted either way.
    expect(rise(open, 0)).toBe(0);
    expect(rise(round, 0)).toBeGreaterThan(rise(round, 0.01));
    expect(rise(bare, 0.01)).toBeCloseTo(rise(bare, 0), 6);
    expect(rise(bare, 0)).toBeGreaterThan(0.001);
    expect(rise(bare, 0.016)).toBeCloseTo(0, 5);
    // Bared, her lower lip draws down off her lower teeth.
    const lowerTeeth = moved(bare, [0, 1.4255, -0.083], "lowerTeeth")[1];
    expect(moved(bare, [0, 1.4255, -0.083])[1]).toBeLessThan(lowerTeeth - 0.0005);
    // Her corners stretched out bared, drawn a little in rounded.
    const cornerX = (shape: typeof open) => moved(shape, [0.016, 1.427, -0.08])[0];
    expect(cornerX(bare)).toBeGreaterThan(cornerX(open) + 0.003);
    expect(cornerX(round)).toBeLessThan(cornerX(open));
  });
});
