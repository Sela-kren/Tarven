import { describe, expect, it } from "vitest";
import type { Rect, Vec2 } from "../src/game/collision";
import { NavGrid } from "../src/game/path";

const room: Rect = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const wallWithGap: Rect = { minX: -1, maxX: 1, minZ: -5, maxZ: 3 };

function pathLength(path: Vec2[]): number {
  return path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.z - path[i].z), 0);
}

function inside(p: Vec2, r: Rect): boolean {
  return p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;
}

describe("NavGrid", () => {
  it("goes straight when nothing is in the way", () => {
    const path = new NavGrid([], 0.25, room).findPath({ x: -3, z: 0 }, { x: 3, z: 0 })!;
    expect(path).toHaveLength(2);
    expect(pathLength(path)).toBeCloseTo(6, 0);
  });

  it("walks around a wall without cutting through it", () => {
    const path = new NavGrid([wallWithGap], 0.25, room).findPath({ x: -3, z: -2 }, { x: 3, z: -2 })!;
    for (let i = 1; i < path.length; i++) {
      for (let t = 0; t <= 1; t += 0.02) {
        const p = {
          x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
          z: path[i - 1].z + (path[i].z - path[i - 1].z) * t,
        };
        expect(inside(p, wallWithGap)).toBe(false);
      }
    }
    expect(pathLength(path)).toBeGreaterThan(6);
  });

  it("moves a blocked destination to the nearest open spot", () => {
    const path = new NavGrid([wallWithGap], 0.25, room).findPath({ x: -3, z: 0 }, { x: 0, z: 0 })!;
    expect(inside(path[path.length - 1], wallWithGap)).toBe(false);
  });

  it("returns null when an area is sealed off", () => {
    const fullWall: Rect = { minX: -1, maxX: 1, minZ: -5, maxZ: 5 };
    expect(new NavGrid([fullWall], 0.25, room).findPath({ x: -3, z: 0 }, { x: 3, z: 0 })).toBeNull();
  });
});
