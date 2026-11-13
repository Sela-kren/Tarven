import { describe, expect, it } from "vitest";
import { nearestBody } from "../src/game/appearance";

const K = 4;

/** The old search: every body point checked for every point, ties to the lower index. */
function bruteNearest(points: Float32Array, body: Float32Array): Int32Array {
  const count = points.length / 3;
  const found = new Int32Array(count * K);
  const best = new Float64Array(K);
  const bestAt = new Int32Array(K);
  for (let v = 0; v < count; v++) {
    const x = points[v * 3], y = points[v * 3 + 1], z = points[v * 3 + 2];
    best.fill(Infinity);
    bestAt.fill(0);
    for (let b = 0; b < body.length / 3; b++) {
      const dx = body[b * 3] - x, dy = body[b * 3 + 1] - y, dz = body[b * 3 + 2] - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d >= best[K - 1]) continue;
      let k = K - 1;
      while (k > 0 && best[k - 1] > d) {
        best[k] = best[k - 1];
        bestAt[k] = bestAt[k - 1];
        k--;
      }
      best[k] = d;
      bestAt[k] = b;
    }
    found.set(bestAt, v * K);
  }
  return found;
}

/** A seeded random source, so a failure can be run again. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("following the nearest body points", () => {
  it("finds exactly the points checking every one would, on a body-sized cloud", () => {
    const random = seeded(7);
    // A body-ish spread: half a metre wide, 1.7 tall, 30 cm deep.
    const body = new Float32Array(3000 * 3).map((_, i) => (i % 3 === 0 ? random() * 0.5 : i % 3 === 1 ? random() * 1.7 : random() * 0.3));
    // Some put out of reach, like her nipple discs and pubic patch.
    body.fill(1e6, 300 * 3, 400 * 3);
    // Clothes: mostly near the body, some well outside it (a long skirt hem, a hat).
    const points = new Float32Array(2000 * 3).map((_, i) => (i % 3 === 0 ? random() * 0.9 - 0.2 : i % 3 === 1 ? random() * 2.4 - 0.3 : random() * 0.7 - 0.2));
    expect(Array.from(nearestBody(points, body).points)).toEqual(Array.from(bruteNearest(points, body)));
  });

  it("breaks ties the same way, to the lower index", () => {
    // A lattice: many body points at exactly the same distance from the lattice's own points and midpoints.
    const body: number[] = [];
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) for (let z = 0; z < 6; z++) body.push(x * 0.05, y * 0.05, z * 0.05);
    const points: number[] = [];
    for (let x = 0; x < 11; x++) for (let y = 0; y < 11; y++) for (let z = 0; z < 3; z++) points.push(x * 0.025, y * 0.025, z * 0.025);
    const b = Float32Array.from(body), p = Float32Array.from(points);
    expect(Array.from(nearestBody(p, b).points)).toEqual(Array.from(bruteNearest(p, b)));
  });

  it("still works with too few body points for a grid", () => {
    const body = Float32Array.from([0, 0, 0, 1, 0, 0, 0, 1, 0, 1e6, 1e6, 1e6]);
    const points = Float32Array.from([0.1, 0.1, 0, 2, 2, 2]);
    expect(Array.from(nearestBody(points, body).points)).toEqual(Array.from(bruteNearest(points, body)));
  });

  it("weights each point's nearest so they add up to one", () => {
    const random = seeded(3);
    const body = new Float32Array(500 * 3).map(() => random());
    const points = new Float32Array(50 * 3).map(() => random());
    const { weights } = nearestBody(points, body);
    for (let v = 0; v < 50; v++) {
      const sum = weights.slice(v * K, v * K + K).reduce((a, w) => a + w, 0);
      expect(sum).toBeCloseTo(1, 5);
    }
  });
});
