import { describe, expect, it } from "vitest";
import type { Rect } from "../src/game/collision";
import { NavGrid } from "../src/game/path";
import { buildStreet } from "../src/game/street";

const inside = (x: number, z: number, rects: readonly Rect[]) =>
  rects.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ);

describe("the high street", () => {
  const street = buildStreet();

  it("lets her out of her door onto open ground", () => {
    expect(inside(street.spawn.x, street.spawn.z, street.colliders)).toBe(false);
  });

  it("has every place she can use standing in the open", () => {
    for (const spot of street.spots) {
      expect(inside(spot.at.x, spot.at.z, street.colliders), spot.place).toBe(false);
    }
  });

  it("lets the townsfolk walk from her door to everything they do and every door", () => {
    const nav = new NavGrid(street.colliders, 0.3, street.walkable);
    const from = { x: street.spawn.x, z: street.spawn.z };
    for (const activity of street.activities) {
      expect(inside(activity.at.x, activity.at.z, street.colliders)).toBe(false);
      expect(nav.findPath(from, activity.at), `activity at ${activity.at.x}, ${activity.at.z}`).not.toBeNull();
    }
    for (const door of street.doors) {
      expect(nav.findPath(from, door), `door at ${door.x}, ${door.z}`).not.toBeNull();
    }
  });
});
