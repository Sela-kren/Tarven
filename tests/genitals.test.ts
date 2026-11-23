import { describe, expect, it } from "vitest";
import { genitalFrame, readGenitals, shapeGenitals } from "../src/game/genitals";
import { PENIS_TYPES, penisShape } from "../src/game/penis";

/**
 * A mesh as lay_genitals builds it, in the model's space (y up, out of him -z): a shaft standing straight out from
 * a root at (0, 1, -0.06), split at the sulcus into the shaft's and the glans' meshes, and a sack under the root.
 * The rig rides in the second UVs: u along the shaft, v (upside down) down the sack.
 */
function built(length = 0.166, radius = 0.022) {
  const root = [0, 1, -0.06];
  const shaft = { pos: [] as number[], uv: [] as number[] };
  const glans = { pos: [] as number[], uv: [] as number[] };
  const sack = { pos: [] as number[], uv: [] as number[] };
  for (let i = -2; i <= 40; i++) {
    const t = i / 40;
    for (let k = 0; k < 16; k++) {
      const a = (2 * Math.PI * k) / 16;
      const to = t > 0.78 ? glans : shaft;
      to.pos.push(root[0] + Math.cos(a) * radius, root[1] + Math.sin(a) * radius, root[2] - t * length);
      to.uv.push(t, 1);
    }
  }
  for (let j = 0; j <= 12; j++) {
    const h = j / 12;
    for (let k = 0; k < 16; k++) {
      const a = (2 * Math.PI * k) / 16;
      const r = 0.03 * Math.sin(Math.PI * (0.2 + 0.8 * h));
      sack.pos.push(Math.cos(a) * r, root[1] - 0.02 - 0.06 * h, root[2] + 0.02 + Math.sin(a) * r * 0.8);
      sack.uv.push(0, 1 - h);
    }
  }
  const meshes = [shaft, glans, sack];
  const uv = (m: { uv: number[] }) => ({ count: m.uv.length / 2, getX: (v: number) => m.uv[v * 2], getY: (v: number) => m.uv[v * 2 + 1] });
  const on = meshes.map((m) => Float32Array.from(m.pos));
  const rig = readGenitals(meshes.map(uv), [false, false, true], on)!;
  return { rig, on };
}

const cut = PENIS_TYPES.find((t) => t.id === "cut")!;
const shapeAt = (arousal: number, packed = 0) => penisShape(cut, 0, 0, 0, 0, 0, 0, arousal, packed);

function tipOf(rig: ReturnType<typeof built>["rig"], out: Float32Array[]) {
  let best = -1;
  let at = [0, 0, 0];
  rig.along.forEach((a, m) => {
    if (rig.sack[m]) return;
    a.forEach((t, v) => {
      if (t > best) {
        best = t;
        at = [out[m][v * 3], out[m][v * 3 + 1], out[m][v * 3 + 2]];
      }
    });
  });
  return at;
}

describe("the reference's genitals, shaped", () => {
  it("finds its frame: the root, out of him (-z) and its length", () => {
    const { rig, on } = built();
    const f = genitalFrame(rig, on);
    expect(f.root[1]).toBeCloseTo(1, 3);
    expect(f.root[2]).toBeCloseTo(-0.06, 3);
    expect(f.out[2]).toBeCloseTo(-1, 3);
    expect(f.length).toBeCloseTo(0.166, 3);
    expect(rig.sulcus).toBeGreaterThan(0.75);
  });

  it("stands up and out hard, and hangs down soft, shorter", () => {
    const { rig, on } = built();
    const hard = on.map((p) => new Float32Array(p.length));
    const soft = on.map((p) => new Float32Array(p.length));
    shapeGenitals(rig, on, shapeAt(1), hard);
    shapeGenitals(rig, on, shapeAt(0), soft);
    const h = tipOf(rig, hard);
    const s = tipOf(rig, soft);
    // Hard: well out in front of him and above the root.
    expect(h[2]).toBeLessThan(-0.06 - 0.12);
    expect(h[1]).toBeGreaterThan(1.02);
    // Soft: below the root, nowhere near as far out.
    expect(s[1]).toBeLessThan(1 - 0.05);
    expect(s[2]).toBeGreaterThan(h[2] + 0.06);
  });

  it("leaves the corners behind its root where they were", () => {
    const { rig, on } = built();
    const out = on.map((p) => new Float32Array(p.length));
    shapeGenitals(rig, on, shapeAt(0), out);
    rig.along[0].forEach((t, v) => {
      if (t > 0) return;
      for (let i = 0; i < 3; i++) expect(out[0][v * 3 + i]).toBeCloseTo(on[0][v * 3 + i], 6);
    });
  });

  it("packed in his clothes, stands out of him less", () => {
    const { rig, on } = built();
    const free = on.map((p) => new Float32Array(p.length));
    const held = on.map((p) => new Float32Array(p.length));
    shapeGenitals(rig, on, shapeAt(0), free);
    shapeGenitals(rig, on, shapeAt(0, 1), held);
    expect(tipOf(rig, held)[2]).toBeGreaterThan(tipOf(rig, free)[2]);
  });
});
