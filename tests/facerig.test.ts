import { describe, expect, it } from "vitest";
import {
  bakeRecipes,
  EXPRESSION_CONTROLS,
  EYE_OPENING,
  eyeDome,
  eyeOpening,
  FACE_REACH,
  faceMove,
  faceRig,
  faceSurface,
  PART_CONTROLS,
  REST_CONTROLS,
  type FacePart,
} from "../src/game/facerig";
import { FACE_KEY_NAMES } from "../src/game/face";

// Her old face rig: no longer how the game moves her face (shape keys do, face.ts), but what her shape keys were first
// baked from (tools/bridge/facebake.preview.ts), so it's kept working.

/** A face drawn like hers: an eye dot either side, brows above, lips meeting at the corners of her mouth. */
const ring = (cx: number, cy: number) =>
  Array.from({ length: 12 }, (_, i) => [cx + 0.008 * Math.cos((i * Math.PI) / 6), cy + 0.008 * Math.sin((i * Math.PI) / 6), -0.07]);
const rig = faceRig(
  [...ring(-0.035, 1.487), ...ring(0.035, 1.487)],
  [[-0.012, 1.505, -0.08], [-0.055, 1.502, -0.06], [0.012, 1.505, -0.08], [0.055, 1.502, -0.06]],
  [[-0.016, 1.427, -0.08], [0, 1.428, -0.085], [0.016, 1.427, -0.08]],
  [[0, 1.4245, -0.081], [0.006, 1.4235, -0.07], [-0.006, 1.4235, -0.07]],
)!;
const moved = (shape = REST_CONTROLS, p: number[], part: FacePart = "skin") => {
  const out = [0, 0, 0];
  faceMove(rig, shape, p, part, out);
  return out;
};

describe("her old face rig", () => {
  it("gives each of her shape keys its recipe: an expression's brows, eyes or mouth on their own, and the rest", () => {
    const recipes = bakeRecipes(FACE_KEY_NAMES);
    expect(Object.keys(recipes).sort()).toEqual([...FACE_KEY_NAMES].sort());
    expect(recipes.Brow_angry).toEqual(Object.fromEntries(PART_CONTROLS.brows.map((k) => [k, EXPRESSION_CONTROLS.angry[k]]).filter(([, v]) => v !== 0)));
    expect(recipes.Mouth_angry.mouthUp).toBe(EXPRESSION_CONTROLS.angry.mouthUp);
    expect(recipes.Mouth_angry.browInner).toBeUndefined();
    expect(recipes.Eye_tired).toEqual({ lidUpper: 0.55, lidLower: 0.1 });
    expect(recipes.Blink).toEqual({ lidUpper: 1, lidLower: 0.25 });
    expect(recipes.Look_Left).toEqual({ lookX: -1 });
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

  it("closes her anime eyes with their lids, looks about behind them, and grows her pupils", () => {
    // The test rig's eye: a white 8 mm about (0.035, 1.487). Its opening at the middle (u = 0), and her lid's edge there.
    const [hx, hy] = rig.eyes[1].half;
    const opening = eyeOpening(0);
    const edge = [0.035, 1.487 + opening.top * hy, -0.071];
    // At rest nothing moves.
    expect(moved(REST_CONTROLS, edge, "lid")).toEqual(edge);
    // Shut, her upper lid's edge and her lash line come down to where her lids meet, a little below the middle.
    const meet = 1.487 + opening.meet * hy;
    expect(moved({ ...REST_CONTROLS, lidUpper: 1 }, edge, "lid")[1]).toBeCloseTo(meet, 6);
    expect(moved({ ...REST_CONTROLS, lidUpper: 1 }, edge, "lash")[1]).toBeCloseTo(meet, 6);
    // Her lower lid comes up to the same line.
    const low = [edge[0], 1.487 + opening.bottom * hy, -0.071];
    expect(moved({ ...REST_CONTROLS, lidLower: 1 }, low, "lidLow")[1]).toBeCloseTo(meet, 6);
    // The far side of her lid, out past the white, stays: the lid stretches over her eye.
    const far = [edge[0], edge[1] + hy * 0.45, -0.071];
    expect(moved({ ...REST_CONTROLS, lidUpper: 1 }, far, "lid")).toEqual(far);
    // Her corners never move.
    const corner = [0.035 + hx * EYE_OPENING.half, 1.487 + eyeOpening(1).top * hy, -0.071];
    expect(moved({ ...REST_CONTROLS, lidUpper: 1 }, corner, "lid")[1]).toBeCloseTo(corner[1], 9);
    // Wide, her upper lid goes up and her lower lid down.
    expect(moved({ ...REST_CONTROLS, wide: 1 }, edge, "lid")[1]).toBeGreaterThan(edge[1]);
    expect(moved({ ...REST_CONTROLS, wide: 1 }, low, "lidLow")[1]).toBeLessThan(low[1]);
    // Her iris looks about behind her lids; the white stays.
    const iris = [0.035, 1.487, -0.0706];
    expect(moved({ ...REST_CONTROLS, lookX: 1 }, iris, "iris")[0]).toBeGreaterThan(0.035);
    expect(moved({ ...REST_CONTROLS, lookY: -1 }, iris, "iris")[1]).toBeLessThan(1.487);
    expect(moved({ ...REST_CONTROLS, lookX: 1 }, iris, "eyeWhite")).toEqual(iris);
    // Her pupil grows about its middle (the white's here, the rig having no pupils).
    const rim = [0.035 + 0.002, 1.487, -0.0702];
    expect(moved({ ...REST_CONTROLS, pupil: 1 }, rim, "pupil")[0]).toBeCloseTo(0.035 + 0.002 * (1 + FACE_REACH.pupil), 6);
    expect(moved({ ...REST_CONTROLS, pupil: -1 }, rim, "pupil")[0]).toBeLessThan(0.037);
  });

  it("keeps her iris on her eye's plane as it looks, however steeply her socket turns back", () => {
    // Her eyes turn back towards her temples (forwards is -z): z rises 0.5 per metre out from each eye's middle.
    const plane = (x: number, y: number) => -0.07 + 0.5 * (Math.abs(x) - 0.035) + 0.04 * (y - 1.487);
    const tilted = (cx: number) => ring(cx, 1.487).map(([x, y]) => [x, y, plane(x, y)]);
    const sloped = faceRig(
      [...tilted(-0.035), ...tilted(0.035)],
      [[-0.012, 1.505, -0.08], [-0.055, 1.502, -0.06], [0.012, 1.505, -0.08], [0.055, 1.502, -0.06]],
      [[-0.016, 1.427, -0.08], [0, 1.428, -0.085], [0.016, 1.427, -0.08]],
    )!;
    expect(sloped.eyes[1].slope[0]).toBeCloseTo(0.5, 6);
    // Her iris 0.2 mm in front of the eyeball (the plane and its dome, EYE_DOME) looks towards her nose and down: still
    // 0.2 mm in front of it, the dome lower where it's gone (forwards is -z).
    const [hx, hy] = sloped.eyes[1].half;
    const ball = (x: number, y: number) => plane(x, y) - eyeDome((x - 0.035) / hx, (y - 1.487) / hy) * hx;
    const iris = [0.035, 1.487, ball(0.035, 1.487) - 0.0002];
    const out = [0, 0, 0];
    faceMove(sloped, { ...REST_CONTROLS, lookX: -1, lookY: -1 }, iris, "iris", out);
    expect(out[0]).toBeLessThan(0.035);
    expect(out[2] - ball(out[0], out[1])).toBeCloseTo(-0.0002, 7);
    expect(out[2]).toBeGreaterThan(iris[2] + (out[0] - 0.035) * 0.5);
  });

  it("moves her face: brows rise, mouth turns up, and nothing moves at rest", () => {
    const top = [0.035, 1.495, -0.07];
    expect(moved(REST_CONTROLS, top)).toEqual(top);
    // The inner end of a brow rises more than the outer, worried.
    const inner = moved({ ...REST_CONTROLS, browInner: 1 }, [0.012, 1.505, -0.08], "brow")[1] - 1.505;
    const outer = moved({ ...REST_CONTROLS, browInner: 1 }, [0.055, 1.502, -0.06], "brow")[1] - 1.502;
    expect(inner).toBeGreaterThan(outer);
    // Cross, they come down and knit in towards each other, and forwards so they stay on her brow.
    const cross = moved({ ...REST_CONTROLS, browInner: -1 }, [0.012, 1.505, -0.08], "brow");
    expect(cross[0]).toBeLessThan(0.012);
    expect(cross[1]).toBeLessThan(1.505);
    expect(cross[2]).toBeLessThan(-0.08);
    // Arched, the middle of a brow rises most; curving down, its outer end drops.
    const middle = [0.033, 1.506, -0.07];
    const arched = moved({ ...REST_CONTROLS, browArch: 1 }, middle, "brow")[1] - 1.506;
    expect(arched).toBeGreaterThan(moved({ ...REST_CONTROLS, browArch: 1 }, [0.055, 1.502, -0.06], "brow")[1] - 1.502);
    expect(moved({ ...REST_CONTROLS, browOuter: -1 }, [0.055, 1.502, -0.06], "brow")[1]).toBeLessThan(1.502);
    expect(moved({ ...REST_CONTROLS, browOuter: -1 }, [0.012, 1.505, -0.08], "brow")[1]).toBeCloseTo(1.505, 4);
    // Drawn close over her eyes, her brows come down further than lowered ever takes them.
    const lowest = moved({ ...REST_CONTROLS, brow: -1, browInner: -1 }, [0.033, 1.506, -0.07], "brow")[1];
    expect(moved({ ...REST_CONTROLS, brow: -1, browNear: 1 }, [0.033, 1.506, -0.07], "brow")[1]).toBeLessThan(lowest - 0.008);
    // Flicked, only the very tips of her brows by her nose lift.
    expect(moved({ ...REST_CONTROLS, browTip: 1 }, [0.012, 1.505, -0.08], "brow")[1]).toBeGreaterThan(1.507);
    expect(moved({ ...REST_CONTROLS, browTip: 1 }, [0.033, 1.506, -0.07], "brow")[1]).toBe(1.506);
    // Her tongue comes out forwards, its tip furthest, hanging down over her lower lip; its root less, and lifted.
    const tip = moved({ ...REST_CONTROLS, tongue: 1 }, [0, 1.4245, -0.081], "tongue");
    const root = moved({ ...REST_CONTROLS, tongue: 1 }, [0.006, 1.4235, -0.07], "tongue");
    expect(tip[2]).toBeLessThan(-0.095);
    expect(tip[1]).toBeLessThan(1.4245);
    expect(root[2] - -0.07).toBeGreaterThan(tip[2] - -0.081);
    expect(root[1]).toBeGreaterThan(1.4235);
    expect(root[0]).toBeGreaterThan(0.006);
    // Smiling, the corners of her mouth go up; a smirk lifts only her left.
    expect(moved({ ...REST_CONTROLS, smile: 1 }, [0.016, 1.427, -0.08])[1]).toBeGreaterThan(1.427);
    expect(moved({ ...REST_CONTROLS, smirk: 1 }, [0.016, 1.427, -0.08])[1]).toBeCloseTo(1.427);
    expect(moved({ ...REST_CONTROLS, smirk: 1 }, [-0.016, 1.427, -0.08])[1]).toBeGreaterThan(1.427);
    // Pressed small, the corners of her mouth draw in.
    expect(moved({ ...REST_CONTROLS, purse: 1 }, [0.016, 1.427, -0.08])[0]).toBeLessThan(0.016);
    // Pressed thin into a line, her lips close in on her mouth line from above and below, and widen a touch.
    const pressed = { ...REST_CONTROLS, press: 1 };
    expect(moved(pressed, [0, 1.431, -0.085])[1]).toBeLessThan(1.429);
    expect(moved(pressed, [0, 1.4228, -0.085])[1]).toBeGreaterThan(1.425);
    expect(moved(pressed, [0.016, 1.427, -0.08])[0]).toBeGreaterThan(0.016);
    expect(moved(pressed, [0, 1.405, -0.08])).toEqual([0, 1.405, -0.08]);
    // Her chin, well away from the corners, stays put.
    expect(moved({ ...REST_CONTROLS, smile: 1 }, [0, 1.4, -0.08])).toEqual([0, 1.4, -0.08]);
  });

  it("opens her mouth inside her face: her lower lip drops, her chin hardly at all", () => {
    const open = { ...REST_CONTROLS, open: 1 };
    const lip = 1.4228 - moved(open, [0, 1.4228, -0.085])[1];
    const chin = 1.4 - moved(open, [0, 1.4, -0.08])[1];
    expect(lip).toBeGreaterThan(0.015);
    expect(chin).toBeGreaterThan(0);
    expect(chin).toBeLessThan(lip * 0.35);
  });

  it("spreads her brows' outer ends out to her temples, and raises her whole mouth", () => {
    // Spread, a brow's outer end goes out, its inner end by her nose stays where it was, and neither goes up or down.
    const spread = { ...REST_CONTROLS, browSpread: 1 };
    const outerEnd = moved(spread, [0.055, 1.502, -0.06], "brow");
    expect(outerEnd[0]).toBeGreaterThan(0.059);
    expect(outerEnd[1]).toBe(1.502);
    expect(moved(spread, [-0.055, 1.502, -0.06], "brow")[0]).toBeLessThan(-0.059);
    expect(moved(spread, [0.012, 1.505, -0.08], "brow")[0]).toBeCloseTo(0.012, 6);
    // Raised, her lips, teeth and tongue all go up together; her brows and her chin well below stay put.
    const up = { ...REST_CONTROLS, mouthUp: 1 };
    expect(moved(up, [0, 1.428, -0.085])[1]).toBeCloseTo(1.431, 4);
    expect(moved(up, [0.006, 1.4235, -0.07], "teeth")[1]).toBeCloseTo(1.4265, 4);
    expect(moved(up, [0, 1.4245, -0.081], "tongue")[1]).toBeCloseTo(1.4275, 4);
    expect(moved(up, [0, 1.4, -0.08])).toEqual([0, 1.4, -0.08]);
    expect(moved(up, [0.033, 1.506, -0.07], "brow")).toEqual([0.033, 1.506, -0.07]);
    // Lowered, it goes down.
    expect(moved({ ...REST_CONTROLS, mouthUp: -1 }, [0, 1.428, -0.085])[1]).toBeCloseTo(1.425, 4);
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

  it("finds the front of her face as fast as it's asked, with the same answers as testing every triangle", () => {
    // A bumpy grid of triangles with a second layer behind it, against the plain test of each one.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const triangles: number[][] = [];
    const n = 40;
    const at = (i: number, j: number, back: number) => [i / n * 0.1 - 0.05, 1.45 + j / n * 0.08, -0.08 + 0.01 * Math.sin(i + j) + back];
    for (const back of [0, 0.03])
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          triangles.push([...at(i, j, back), ...at(i + 1, j, back), ...at(i, j + 1, back)]);
          triangles.push([...at(i + 1, j, back), ...at(i + 1, j + 1, back), ...at(i, j + 1, back)]);
        }
    const brute = (x: number, y: number) => {
      let front: number | null = null;
      for (const [ax, ay, az, bx, by, bz, cx, cy, cz] of triangles) {
        const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
        const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
        const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
        if (u < -1e-6 || v < -1e-6 || 1 - u - v < -1e-6) continue;
        const z = u * az + v * bz + (1 - u - v) * cz;
        if (front === null || z < front) front = z;
      }
      return front;
    };
    const surface = faceSurface(triangles);
    for (let k = 0; k < 2000; k++) {
      const x = -0.06 + rand() * 0.12;
      const y = 1.44 + rand() * 0.1;
      expect(surface(x, y)).toBe(brute(x, y));
    }
    // Brute force over every triangle is slow: under a full parallel run it needs longer than the default 5 s.
  }, 20000);

  it("opens her mouth: her lower lip and chin drop, her upper lip and teeth stay", () => {
    const open = { ...REST_CONTROLS, open: 1 };
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
    const open = { ...REST_CONTROLS, open: 1 };
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

  it("hangs her lower lip free of her smile, so her open smile is a D, round at the bottom right out to her corners", () => {
    const smile = { ...REST_CONTROLS, smile: 1, open: 0.8, round: 1 };
    const cupped = { ...smile, cup: 1 };
    // Her lower lip's edge just inside her corner: lifted with it plain, a wedge; hanging well down cupped.
    const nearCorner = [0.0138, 1.4269, -0.0752];
    expect(moved(smile, nearCorner)[1]).toBeGreaterThan(1.4269 - 0.002);
    expect(moved(cupped, nearCorner)[1]).toBeLessThan(1.4269 - 0.005);
    // Still drawn out with her corner, so the side of her mouth stays under it.
    expect(moved(cupped, nearCorner)[0]).toBeGreaterThan(moved({ ...cupped, smile: 0 }, nearCorner)[0] + 0.002);
    // Her corners themselves, and her cheek beside them, lift just the same.
    expect(moved(cupped, [0.016, 1.427, -0.075])[1]).toBeCloseTo(moved(smile, [0.016, 1.427, -0.075])[1], 6);
    expect(moved(cupped, [0.02, 1.42, -0.074])[1]).toBeCloseTo(moved(smile, [0.02, 1.42, -0.074])[1], 6);
  });

  it("lifts her upper lip with her smile, so the top of her open mouth stays flat instead of dipping in the middle", () => {
    const smile = { ...REST_CONTROLS, smile: 1, open: 0.3 };
    const lifted = { ...smile, lift: 1 };
    const rise = (shape: typeof smile, x: number) => moved(shape, [x, 1.427, -0.085])[1] - 1.427;
    // Plain, her corners go up and the middle of her upper lip hardly at all: a V.
    expect(rise(smile, 0)).toBeLessThan(rise(smile, 0.016) * 0.1);
    // Lifted, it rides up with them, flat across.
    expect(rise(lifted, 0)).toBeCloseTo(rise(lifted, 0.016), 4);
    expect(rise(lifted, 0.008)).toBeCloseTo(rise(lifted, 0.016), 4);
    // Her nose stays put.
    expect(moved(lifted, [0, 1.427 + 0.014, -0.085])[1]).toBeCloseTo(1.427 + 0.014, 6);
    // No smile, no lift.
    expect(rise({ ...REST_CONTROLS, open: 0.3, lift: 1 }, 0)).toBe(0);
    // Her upper teeth ride up under it as one, straight, as far as the middle of her lip.
    const teeth = (x: number, y: number) => moved(lifted, [x, y, -0.08], "teeth")[1] - y;
    expect(teeth(0, 1.4265)).toBeLessThanOrEqual(rise(lifted, 0));
    expect(teeth(0, 1.4265)).toBeGreaterThan(rise(lifted, 0) * 0.95);
    expect(teeth(0.01, 1.4275)).toBeCloseTo(teeth(0, 1.4265), 6);
    expect(moved(smile, [0, 1.4265, -0.08], "teeth")[1]).toBeCloseTo(1.4265, 6);
  });
});
