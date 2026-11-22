import { describe, expect, it } from "vitest";
import { Matrix4 } from "three";
import { addCrotchMoves, clampHold, crotchMovesFor, crotchWeights } from "../src/game/crotchkeys";
import type { FaceKeyObject } from "../src/game/facekeys";

const b64 = (a: Float32Array | Uint32Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");

describe("crotch keys", () => {
  // Two key points, in the mesh's own space; the mesh is scaled 2x and shifted into the model's.
  const entry: FaceKeyObject = {
    rest: b64(Float32Array.from([0.1, 0.9, 0.05, -0.1, 0.9, 0.05])),
    keys: {
      Vulva_Open: { points: b64(Uint32Array.from([0])), deltas: b64(Float32Array.from([0.001, 0, 0])) },
      Vulva_SpreadL: { points: b64(Uint32Array.from([1])), deltas: b64(Float32Array.from([0, 0.002, 0])) },
    },
  };
  const bindMatrix = new Matrix4().makeScale(2, 2, 2).setPosition(0.5, 0, 0);
  // The mesh's points in the model's space: the second key point twice (split at a seam), and one that isn't a key's.
  const local = [[0.1, 0.9, 0.05], [-0.1, 0.9, 0.05], [-0.1, 0.9, 0.05], [0.3, 0.3, 0.3]];
  const bind = Float32Array.from(local.flatMap(([x, y, z]) => [2 * x + 0.5, 2 * y, 2 * z]));

  it("finds its points by where they sit as built, every copy, and turns the moves into the model's space", () => {
    const seen = new Uint8Array(2);
    const moves = crotchMovesFor(bind, bindMatrix, entry, seen);
    expect([...seen]).toEqual([1, 1]);
    const open = moves.get("Vulva_Open")!;
    expect(open[0]).toBeCloseTo(0.002);
    expect([...open.subarray(3)].every((v) => v === 0)).toBe(true);
    const left = moves.get("Vulva_SpreadL")!;
    expect(left[4]).toBeCloseTo(0.004);
    expect(left[7]).toBeCloseTo(0.004);
    expect(left[10]).toBe(0);
  });

  it("adds each key at its weight: Open by how open, the rest by the hold", () => {
    const moves = crotchMovesFor(bind, bindMatrix, entry);
    const total = new Float32Array(bind.length);
    addCrotchMoves(total, moves, crotchWeights("Vulva", 2, clampHold({ left: 0.5 })));
    expect(total[0]).toBeCloseTo(0.004);
    expect(total[4]).toBeCloseTo(0.002);
    // The anus's keys don't touch the vulva's.
    const none = new Float32Array(bind.length);
    addCrotchMoves(none, moves, crotchWeights("Anus", 1, clampHold({ left: 1, right: 1, close: 1 })));
    expect(none.every((v) => v === 0)).toBe(true);
  });

  it("clamps a hold to 0..1", () => {
    expect(clampHold({ close: 3, left: -1 })).toEqual({ close: 1, left: 0, right: 0 });
  });
});
