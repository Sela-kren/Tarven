import { describe, expect, it } from "vitest";
import {
  VULVA_COLUMNS,
  VULVA_GRID,
  VULVA_ROWS,
  VULVA_STRETCHED,
  VULVA_TYPES,
  VULVA_CANAL,
  VULVA_CUT,
  cutShare,
  easeOpening,
  gridOf,
  isInner,
  readVulva,
  rideVulva,
  shapeVulva,
  vulvaAt,
  vulvaRiders,
  vulvaShape,
} from "../src/game/vulva";

const COLS = VULVA_COLUMNS.length;
const type = (id: string) => VULVA_TYPES.find((t) => t.id === id)!;
const shape = (id: string, arousal = 0, lips = 0) => vulvaShape(type(id), 0, 0, lips, arousal);
/** The outer lips' crest and the inner lips' ridge, halfway down the slit. */
const outerAt = (id: string, arousal = 0) => vulvaAt(shape(id, arousal), type(id).crest, 0.5).h;
const innerAt = (id: string, arousal = 0, lips = 0) => vulvaAt(shape(id, arousal, lips), 0.08, 0.5).h;

/**
 * A grid as the model builds it, flat on a plane facing forwards (-z) in the model's space, split into its two
 * meshes as the materials split it: UVs carry the column and row, v upside down as glTF stores it.
 */
function flatPatch() {
  const meshes: { uv: number[]; pos: number[] }[] = [{ uv: [], pos: [] }, { uv: [], pos: [] }];
  for (let r = 0; r < VULVA_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const mesh = Math.abs(VULVA_COLUMNS[c]) < 0.2 ? 0 : 1;
      meshes[mesh].uv.push(c / (COLS - 1), 1 - r / (VULVA_ROWS - 1));
      meshes[mesh].pos.push(VULVA_COLUMNS[c] * 0.03, 0.8 - r * 0.009, 0.06);
    }
  }
  const uvs = meshes.map(({ uv }) => ({ count: uv.length / 2, getX: (i: number) => uv[i * 2], getY: (i: number) => uv[i * 2 + 1] }));
  return { uvs, on: meshes.map(({ pos }) => Float32Array.from(pos)) };
}

describe("vulva types", () => {
  it("has tucked first, then puffy, peeking, long lips and a prominent hood", () => {
    expect(VULVA_TYPES.map((t) => t.id)).toEqual(["tucked", "puffy", "peeking", "long", "hooded"]);
  });

  it("hides the inner lips between the outer ones when tucked or puffy, and shows them otherwise", () => {
    for (const id of ["tucked", "puffy"]) expect(innerAt(id)).toBeLessThan(outerAt(id));
    for (const id of ["peeking", "long"]) expect(innerAt(id)).toBeGreaterThan(outerAt(id));
  });

  it("gives puffy the fullest outer lips and long the longest inner ones", () => {
    for (const t of VULVA_TYPES) if (t.id !== "puffy") expect(outerAt("puffy")).toBeGreaterThan(outerAt(t.id));
    const low = (id: string) => vulvaAt(shape(id), 0.08, 0.78).h;
    for (const t of VULVA_TYPES) if (t.id !== "long") expect(low("long")).toBeGreaterThan(low(t.id));
  });

  it("stands the hood highest on the hooded type", () => {
    const hood = (id: string) => vulvaAt(shape(id), 0, 0.5 - 0.85 * 0.36).h;
    for (const t of VULVA_TYPES) if (t.id !== "hooded") expect(hood("hooded")).toBeGreaterThan(hood(t.id));
  });

  it("swells and parts as she's aroused, the inner lips most", () => {
    for (const t of VULVA_TYPES) {
      expect(innerAt(t.id, 1)).toBeGreaterThan(innerAt(t.id, 0) * 1.3);
      expect(outerAt(t.id, 1)).toBeGreaterThan(outerAt(t.id, 0));
      expect(vulvaAt(shape(t.id, 1), 0.34, 0.5).lat).toBeGreaterThan(vulvaAt(shape(t.id, 0), 0.34, 0.5).lat);
    }
  });

  it("grows the inner lips with their slider, and sizes the whole with Size", () => {
    expect(innerAt("peeking", 0, 1)).toBeGreaterThan(innerAt("peeking", 0, 0));
    expect(innerAt("peeking", 0, -1)).toBeLessThan(innerAt("peeking", 0, 0));
    const at = (size: number) => vulvaShape(type("tucked"), size, 0, 0, 0).scale;
    expect(at(1)).toBeGreaterThan(at(0));
    expect(at(1)).toBeLessThan(1);
    expect(at(-1)).toBeLessThan(at(0));
  });

  it("lies flat on the skin at the edges of the patch, all round", () => {
    for (const t of VULVA_TYPES) {
      const s = vulvaShape(t, 1, 1, 1, 1);
      for (let k = 0; k <= 10; k++) {
        const along = k / 10;
        expect(vulvaAt(s, 1, along).h).toBeCloseTo(0, 6);
        expect(vulvaAt(s, -1, along).h).toBeCloseTo(0, 6);
        expect(vulvaAt(s, along * 2 - 1, 0).h).toBeCloseTo(0, 4);
        expect(vulvaAt(s, along * 2 - 1, 1).h).toBeCloseTo(0, 4);
      }
    }
  });

  it("is the same on both sides", () => {
    const s = shape("long", 0.5);
    for (const x of [0.09, 0.2, 0.5]) expect(vulvaAt(s, -x, 0.6)).toEqual(vulvaAt(s, x, 0.6));
  });

  it("wears the slit's material only in the middle of the grid", () => {
    expect(isInner(5, 6)).toBe(true);
    expect(isInner(6, 6)).toBe(true);
    expect(isInner(3, 6)).toBe(false);
    expect(isInner(6, 0)).toBe(false);
    expect(isInner(6, VULVA_ROWS - 2)).toBe(false);
  });
});

describe("the vulva's grid", () => {
  it("finds every point of the grid across its two meshes", () => {
    const { uvs } = flatPatch();
    const patch = readVulva(uvs)!;
    expect(patch).not.toBeNull();
    expect(patch.pick.length).toBe(VULVA_GRID * 2);
    expect(patch.points[0].length + patch.points[1].length).toBe(VULVA_GRID);
  });

  it("gives up on a grid with points missing", () => {
    const { uvs } = flatPatch();
    expect(readVulva([uvs[0]])).toBeNull();
  });

  it("stands out of the skin forwards, and lies flat when hidden", () => {
    const { uvs, on } = flatPatch();
    const patch = readVulva(uvs)!;
    const out = on.map((p) => new Float32Array(p.length));
    shapeVulva(patch, on, shape("puffy"), out);
    let most = 0;
    out.forEach((p, m) => {
      for (let i = 2; i < p.length; i += 3) {
        // Forwards is -z: nothing goes behind the skin.
        expect(p[i]).toBeLessThanOrEqual(on[m][i] + 1e-6);
        most = Math.max(most, on[m][i] - p[i]);
      }
    });
    expect(most).toBeGreaterThan(0.006);
    shapeVulva(patch, on, null, out);
    out.forEach((p, m) => {
      for (let i = 2; i < p.length; i += 3) expect(on[m][i] - p[i]).toBeLessThan(0.0005);
    });
  });

  it("lifts what lies over it as high as it stands, and nothing when hidden", () => {
    const { uvs, on } = flatPatch();
    const patch = readVulva(uvs)!;
    const grid = gridOf(patch, on);
    // A point over the outer lip's crest, a hair off the skin, and one far away.
    const crest = type("puffy").crest * vulvaShape(type("puffy"), 0, 0, 0, 0).scale;
    const coat = Float32Array.from([crest * 0.03, 0.8 - 6 * 0.009, 0.0586, 0.5, 0.5, 0.5]);
    const riders = vulvaRiders(coat, grid)!;
    expect(Array.from(riders.verts)).toEqual([0]);
    const frame = shapeVulva(patch, on, shape("puffy"), on.map((p) => new Float32Array(p.length)));
    const rise = rideVulva(riders, frame, shape("puffy"));
    expect(-rise[2]).toBeGreaterThan(0.6 * outerAt("puffy"));
    expect(Array.from(rideVulva(riders, frame, null))).toEqual([0, 0, 0]);
    // As she stretches open, it moves out with the lip under it.
    const wide = vulvaShape(type("puffy"), 0, 0, 0, 0, VULVA_STRETCHED);
    const out = on.map((p) => new Float32Array(p.length));
    expect(rideVulva(riders, shapeVulva(patch, on, wide, out), wide)[0]).toBeGreaterThan(0.003);
  });
});

describe("her opening", () => {
  /** The flat grid with its cut: the middle column split on the cut's inner rows, and the canal between its sides. */
  function cutPatch() {
    const [top, bottom] = VULVA_CUT;
    const middle = (COLS - 1) / 2;
    const meshes: { uv: number[]; pos: number[] }[] = [{ uv: [], pos: [] }, { uv: [], pos: [] }, { uv: [], pos: [] }];
    const at = (c: number, r: number) => [VULVA_COLUMNS[c] * 0.03, 0.8 - r * 0.009, 0.06];
    for (let r = 0; r < VULVA_ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sides = c === middle && r > top && r < bottom ? [-0.25, 0.25] : [0];
        for (const side of sides) {
          meshes[Math.abs(VULVA_COLUMNS[c]) < 0.2 ? 0 : 1].uv.push((c + side) / (COLS - 1), 1 - r / (VULVA_ROWS - 1));
          meshes[Math.abs(VULVA_COLUMNS[c]) < 0.2 ? 0 : 1].pos.push(...at(c, r));
        }
      }
    }
    for (let r = top; r <= bottom; r++) {
      for (let k = 0; k <= VULVA_CANAL + 1; k++) {
        meshes[2].uv.push(k / (VULVA_CANAL + 1), 1 - r / (VULVA_ROWS - 1));
        meshes[2].pos.push(...at(middle, r));
      }
    }
    const uvs = meshes.map(({ uv }) => ({ count: uv.length / 2, getX: (i: number) => uv[i * 2], getY: (i: number) => uv[i * 2 + 1] }));
    return { uvs, on: meshes.map(({ pos }) => Float32Array.from(pos)) };
  }

  const shaped = (open: number) => {
    const { uvs, on } = cutPatch();
    const patch = readVulva([uvs[0], uvs[1]], uvs[2])!;
    const out = on.map((p) => new Float32Array(p.length));
    shapeVulva(patch, on, vulvaShape(type("tucked"), 0, 0, 0, 0, open), out);
    return { patch, out };
  };
  /** How far apart the cut's sides are at a row, shaped. */
  const gapAt = (open: number, row: number) => {
    const { patch, out } = shaped(open);
    let left = 0, right = 0;
    patch.sides[0].forEach((side, v) => {
      if (Math.floor(patch.points[0][v] / COLS) !== row) return;
      if (side < 0) left = out[0][v * 3];
      if (side > 0) right = out[0][v * 3];
    });
    return right - left;
  };

  it("parts the cut's two sides as it opens, most at its middle, and keeps them together closed", () => {
    const gap = (open: number) => gapAt(open, 7);
    expect(gap(0)).toBeCloseTo(0, 6);
    expect(gap(1)).toBeGreaterThan(0.008);
    expect(cutShare(VULVA_CUT[0])).toBe(0);
    expect(cutShare(VULVA_CUT[1])).toBe(0);
  });

  it("opens onto a canal going into her, which lies flat while she's closed", () => {
    const width = (open: number) => {
      const { out } = shaped(open);
      const xs = Array.from({ length: out[2].length / 3 }, (_, v) => out[2][v * 3]);
      const zs = Array.from({ length: out[2].length / 3 }, (_, v) => out[2][v * 3 + 2]);
      return { wide: Math.max(...xs) - Math.min(...xs), deep: Math.max(...zs) - 0.06 };
    };
    expect(width(0).wide).toBeCloseTo(0, 6);
    expect(width(1).wide).toBeGreaterThan(0.008);
    // Forwards is -z here, so into her is +z.
    expect(width(1).deep).toBeGreaterThan(0.02);
  });

  it("stretches past fully open: wider and rounder, longer at its top, its canal deeper", () => {
    expect(gapAt(VULVA_STRETCHED, 7)).toBeGreaterThan(gapAt(1, 7) * 1.8);
    // Rounder: the rows near its ends open nearly as wide as its middle.
    expect(gapAt(VULVA_STRETCHED, 6) / gapAt(VULVA_STRETCHED, 7)).toBeGreaterThan(gapAt(1, 6) / gapAt(1, 7));
    const middleOf = (open: number, row: number) => {
      const { patch, out } = shaped(open);
      const g = patch.pick[((COLS - 1) / 2 + row * COLS) * 2 + 1];
      return out[patch.pick[((COLS - 1) / 2 + row * COLS) * 2]][g * 3 + 1];
    };
    // Up is +y: the cut's top moves up, its bottom stays where it was.
    expect(middleOf(VULVA_STRETCHED, VULVA_CUT[0])).toBeGreaterThan(middleOf(1, VULVA_CUT[0]) + 0.002);
    expect(middleOf(VULVA_STRETCHED, VULVA_CUT[1])).toBeCloseTo(middleOf(1, VULVA_CUT[1]), 6);
    const deepest = (open: number) => Math.max(...shaped(open).out[2].filter((_, i) => i % 3 === 2));
    expect(deepest(VULVA_STRETCHED)).toBeGreaterThan(deepest(1) + 0.01);
  });

  it("never lets a column of the grid pass the one beside it, however far it stretches", () => {
    for (const open of [0.5, 1, 1.5, VULVA_STRETCHED]) {
      const { patch, out } = shaped(open);
      for (let row = 0; row < VULVA_ROWS; row++) {
        const xs: number[] = [];
        patch.points.forEach((points, m) => points.forEach((g, v) => {
          if (Math.floor(g / COLS) === row) xs.push((g % COLS) * 4 + patch.sides[m][v], out[m][v * 3]);
        }));
        const pairs = [];
        for (let i = 0; i < xs.length; i += 2) pairs.push([xs[i], xs[i + 1]]);
        pairs.sort((a, b) => a[0] - b[0]);
        for (let i = 1; i < pairs.length; i++) expect(pairs[i][1]).toBeGreaterThanOrEqual(pairs[i - 1][1] - 1e-9);
      }
    }
  });

  it("stretches as wide whatever her size, as it's what's in her that stretches her", () => {
    const extra = (size: number) =>
      vulvaShape(type("tucked"), size, 0, 0, 0, VULVA_STRETCHED).open - vulvaShape(type("tucked"), size, 0, 0, 0, 1).open;
    expect(extra(-1)).toBeCloseTo(extra(1), 9);
    expect(vulvaShape(type("tucked"), 0, 0, 0, 0, 9).open).toBe(vulvaShape(type("tucked"), 0, 0, 0, 0, VULVA_STRETCHED).open);
  });
});

describe("how open she shows", () => {
  it("opens and stretches quickly, and closes back slowly, slowest while still stretched", () => {
    expect(easeOpening(0, VULVA_STRETCHED, 1)).toBe(VULVA_STRETCHED);
    expect(easeOpening(0, 1, 0.1)).toBeCloseTo(0.25, 9);
    const stretchedBack = VULVA_STRETCHED - easeOpening(VULVA_STRETCHED, 0, 1);
    const openBack = 1 - easeOpening(1, 0, 1);
    expect(stretchedBack).toBeGreaterThan(openBack);
    expect(stretchedBack).toBeLessThan(0.5);
    expect(easeOpening(0.3, 0.3, 1)).toBe(0.3);
  });
});
