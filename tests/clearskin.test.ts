import { describe, expect, it } from "vitest";
import { clearGrid, clearOfSkin } from "../src/game/appearance";

/** A flat patch of skin at chest height facing forwards (-z), 1 cm apart, 0.1 m in front of her middle. */
function patch(): { points: Float32Array; tris: Int32Array; verts: Int32Array } {
  const n = 9;
  const points = new Float32Array(n * n * 3);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) points.set([(i - 4) * 0.01, 1.1 + (j - 4) * 0.01, -0.1], (j * n + i) * 3);
  }
  const tris: number[] = [];
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      // Wound to face -z, out of her.
      tris.push(a, c, b, b, c, d);
    }
  }
  return { points, tris: Int32Array.from(tris), verts: Int32Array.from({ length: n * n }, (_, v) => v) };
}

describe("tops kept out of her skin", () => {
  it("puts cloth inside her skin out over it, and leaves cloth outside alone", () => {
    const skin = patch();
    const grid = clearGrid([{ slot: 0, verts: skin.verts, tris: skin.tris, arm: new Uint8Array(81) }], [skin.points]);
    // One point a centimetre inside, one a centimetre out.
    const bind = Float32Array.from([0, 1.1, -0.09, 0.01, 1.1, -0.11]);
    const moves = new Float32Array(6);
    const moved = clearOfSkin(grid, Int32Array.from([0, 1]), bind, moves);
    expect(Array.from(moved)).toEqual([0]);
    expect(bind[2] + moves[2]).toBeCloseTo(-0.102, 5);
    expect(moves[0]).toBeCloseTo(0, 6);
    expect(moves[1]).toBeCloseTo(0, 6);
    expect(Array.from(moves.subarray(3))).toEqual([0, 0, 0]);
  });

  it("leaves points too deep inside to tell which way is out", () => {
    const skin = patch();
    const grid = clearGrid([{ slot: 0, verts: skin.verts, tris: skin.tris, arm: new Uint8Array(81) }], [skin.points]);
    const bind = Float32Array.from([0, 1.1, 0.0]);
    const moves = new Float32Array(3);
    expect(clearOfSkin(grid, Int32Array.from([0]), bind, moves).length).toBe(0);
    expect(Array.from(moves)).toEqual([0, 0, 0]);
  });
});
