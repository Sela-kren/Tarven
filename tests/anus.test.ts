import { describe, expect, it } from "vitest";
import {
  ANUS_CANAL, ANUS_LAST, ANUS_RINGS, ANUS_SPOKES, ANUS_STRETCHED, ANUS_TYPES, anusRings, anusShape, readAnus, shapeAnus,
} from "../src/game/anus";

/** The disc's radius as built: ANUS_RADIUS in build_world.py. */
const RADIUS = 0.026;

const type = (id: string) => ANUS_TYPES.find((t) => t.id === id)!;

/**
 * A disc as the model builds it, flat on a plane facing back (+z here), its canal straight in: UVs carry the ring and
 * spoke, v upside down as glTF stores it. The rim's rings and canal in one mesh, the rest in another.
 */
function flatDisc() {
  const meshes: { uv: number[]; pos: number[] }[] = [{ uv: [], pos: [] }, { uv: [], pos: [] }];
  for (let i = 0; i <= ANUS_LAST; i++) {
    for (let k = 0; k < (i === 0 ? 1 : ANUS_SPOKES); k++) {
      const a = (2 * Math.PI * k) / ANUS_SPOKES;
      const j = i - (ANUS_CANAL + 1);
      const r = j <= 0 ? 0.0005 * (i === 0 ? 0 : 1) : (RADIUS * j) / ANUS_RINGS;
      const z = j >= 0 ? 0 : i === 0 ? -0.036 : (-0.03 * (ANUS_CANAL + 1 - i)) / ANUS_CANAL;
      const mesh = i <= ANUS_CANAL + 4 ? 0 : 1;
      meshes[mesh].uv.push(i / ANUS_LAST, 1 - k / ANUS_SPOKES);
      meshes[mesh].pos.push(Math.cos(a) * r, 0.8 + Math.sin(a) * r, z);
    }
  }
  const uvs = meshes.map(({ uv }) => ({ count: uv.length / 2, getX: (i: number) => uv[i * 2], getY: (i: number) => uv[i * 2 + 1] }));
  return { uvs, on: meshes.map(({ pos }) => Float32Array.from(pos)) };
}

describe("anus types", () => {
  it("has tight first, then puffy and relaxed", () => {
    expect(ANUS_TYPES.map((t) => t.id)).toEqual(["tight", "puffy", "relaxed"]);
  });

  it("opens its rim as it's opened, and sits a little open when relaxed", () => {
    const tight = (open: number) => anusShape(type("tight"), 0, open).mouth;
    expect(tight(1)).toBeGreaterThan(tight(0) * 8);
    expect(anusShape(type("relaxed"), 0, 0).mouth).toBeGreaterThan(tight(0));
  });

  it("stretches past fully open, wider and deeper, as wide whatever her size", () => {
    for (const t of ANUS_TYPES) {
      const open = anusShape(t, 0, 1);
      const stretched = anusShape(t, 0, ANUS_STRETCHED);
      expect(stretched.mouth).toBeGreaterThan(open.mouth * 1.6);
      expect(stretched.deep).toBeGreaterThan(open.deep);
      expect(anusShape(t, 0, 5).mouth).toBe(stretched.mouth);
      const extra = (size: number) => anusShape(t, size, ANUS_STRETCHED).mouth - anusShape(t, size, 1).mouth;
      expect(extra(-1)).toBeCloseTo(extra(1), 9);
    }
  });

  it("folds while closed and smooths out open, its rings always going outwards to the disc's edge", () => {
    const fold = (open: number) => {
      const ring = anusRings(anusShape(type("tight"), 0, open))[1];
      return ring.even - ring.odd;
    };
    expect(fold(0)).toBeGreaterThan(0.001);
    expect(fold(1)).toBeCloseTo(0, 6);
    for (const t of ANUS_TYPES) {
      for (const open of [0, 0.5, 1, 1.5, ANUS_STRETCHED]) {
        const rings = anusRings(anusShape(t, 1, open));
        for (let j = 1; j < rings.length; j++) expect(rings[j].r).toBeGreaterThan(rings[j - 1].r);
        expect(rings[ANUS_RINGS].r).toBeCloseTo(RADIUS, 6);
        expect(rings[ANUS_RINGS].even).toBeCloseTo(0, 6);
      }
    }
  });
});

describe("the anus's disc", () => {
  it("finds every ring and spoke across its two meshes", () => {
    expect(readAnus(flatDisc().uvs)).not.toBeNull();
  });

  it("opens a hole onto a canal going in, and closes it to a point", () => {
    const { uvs, on } = flatDisc();
    const patch = readAnus(uvs)!;
    const shaped = (open: number) => {
      const out = on.map((p) => new Float32Array(p.length));
      shapeAnus(patch, on, anusShape(type("tight"), 0, open), out);
      return out;
    };
    // The rim's corners, out from the middle.
    const rim = (out: Float32Array[]) => {
      let most = 0;
      patch.rings.forEach((rings, m) => {
        rings.forEach((ring, v) => {
          if (ring === ANUS_CANAL + 1) most = Math.max(most, Math.hypot(out[m][v * 3], out[m][v * 3 + 1] - 0.8));
        });
      });
      return most;
    };
    expect(rim(shaped(1))).toBeGreaterThan(0.005);
    expect(rim(shaped(0))).toBeLessThan(0.001);
    // The canal's bottom lies well inside her.
    const out = shaped(1);
    let deepest = 0;
    patch.rings.forEach((rings, m) => rings.forEach((ring, v) => ring === 0 && (deepest = Math.min(deepest, out[m][v * 3 + 2]))));
    expect(deepest).toBeLessThan(-0.02);
    // Stretched, it's wider still and goes deeper.
    expect(rim(shaped(ANUS_STRETCHED))).toBeGreaterThan(rim(shaped(1)) * 1.6);
    let deeper = 0;
    const stretched = shaped(ANUS_STRETCHED);
    patch.rings.forEach((rings, m) => rings.forEach((ring, v) => ring === 0 && (deeper = Math.min(deeper, stretched[m][v * 3 + 2]))));
    expect(deeper).toBeLessThan(deepest);
  });
});
