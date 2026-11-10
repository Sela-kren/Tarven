import { describe, expect, it } from "vitest";
import { moveVector, resolveCircle, type Rect } from "../src/game/collision";

const wall: Rect = { minX: 0, maxX: 2, minZ: -5, maxZ: 5 };
const RADIUS = 0.3;

describe("resolveCircle", () => {
  it("leaves a circle alone when nothing overlaps", () => {
    expect(resolveCircle({ x: -1, z: 0 }, RADIUS, [wall])).toEqual({ x: -1, z: 0 });
  });

  it("pushes a circle out of a wall", () => {
    const out = resolveCircle({ x: -0.1, z: 0 }, RADIUS, [wall]);
    expect(out.x).toBeCloseTo(-RADIUS);
    expect(out.z).toBeCloseTo(0);
  });

  it("keeps movement along the wall so the player slides", () => {
    const out = resolveCircle({ x: -0.1, z: 1.7 }, RADIUS, [wall]);
    expect(out.z).toBeCloseTo(1.7);
  });

  it("rounds outside corners", () => {
    const out = resolveCircle({ x: -0.1, z: -5.1 }, RADIUS, [wall]);
    expect(Math.hypot(out.x, out.z + 5)).toBeCloseTo(RADIUS);
  });

  it("exits through the nearest side when the centre is inside", () => {
    const out = resolveCircle({ x: 1.9, z: 0 }, RADIUS, [wall]);
    expect(out.x).toBeCloseTo(2 + RADIUS);
  });

  it("settles clear of two rectangles forming a corner", () => {
    const other: Rect = { minX: -5, maxX: 2, minZ: 0, maxZ: 2 };
    const upper: Rect = { minX: 0, maxX: 2, minZ: -5, maxZ: 0 };
    const out = resolveCircle({ x: -0.1, z: -0.1 }, RADIUS, [other, upper]);
    expect(out.x).toBeCloseTo(-RADIUS);
    expect(out.z).toBeCloseTo(-RADIUS);
  });
});

describe("moveVector", () => {
  it("is zero with no input or opposite keys", () => {
    expect(moveVector(false, false, false, false)).toEqual({ x: 0, z: 0 });
    expect(moveVector(true, true, false, false)).toEqual({ x: 0, z: 0 });
  });

  it("points up the screen for W", () => {
    expect(moveVector(false, false, true, false)).toEqual({ x: 0, z: -1 });
  });

  it("does not make diagonals faster", () => {
    const v = moveVector(false, true, false, true);
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(1);
  });
});
