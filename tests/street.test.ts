import { describe, expect, it } from "vitest";
import type { Rect } from "../src/game/collision";
import { NavGrid } from "../src/game/path";
import { buildStreet, STREET_ORIGIN, type StreetPlace } from "../src/game/street";

const inside = (x: number, z: number, rects: readonly Rect[]) =>
  rects.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ);

/** How close to a wall or a stall a spot can stand and still be reached (the townsfolk's clearance). */
const CLEARANCE = 0.3;
const nearest = (x: number, z: number, rects: readonly Rect[]) =>
  Math.min(...rects.map((r) => Math.hypot(x - Math.min(Math.max(x, r.minX), r.maxX), z - Math.min(Math.max(z, r.minZ), r.maxZ))));

describe("the town", () => {
  const street = buildStreet();
  const nav = new NavGrid(street.colliders, CLEARANCE, street.walkable);
  const from = { x: street.spawn.x, z: street.spawn.z };

  it("lets her out of her door into her yard, on open ground, in the camera's frame", () => {
    expect(inside(street.spawn.x, street.spawn.z, street.colliders)).toBe(false);
    const { cameraLimits: c } = street;
    expect(street.spawn.x).toBeGreaterThanOrEqual(c.minX);
    expect(street.spawn.x).toBeLessThanOrEqual(c.maxX);
    expect(street.spawn.z).toBeGreaterThanOrEqual(c.minZ);
    expect(street.spawn.z).toBeLessThanOrEqual(c.maxZ);
    const home = street.spots.find((s) => s.place === "home")!;
    expect(Math.hypot(home.at.x - street.spawn.x, home.at.z - street.spawn.z)).toBeLessThan(home.range);
  });

  it("has every place she can walk up to, once each, standing in the open and reachable from her door", () => {
    const places: StreetPlace[] = [
      "home", "market", "board", "chapel", "warmhouse", "copperbell", "garrison", "fields", "quarry", "ciderbarn", "bakehouse", "tollgate", "townhall",
    ];
    expect(street.spots.map((s) => s.place).sort()).toEqual([...places].sort());
    for (const spot of street.spots) {
      expect(inside(spot.at.x, spot.at.z, street.colliders), spot.place).toBe(false);
      expect(nearest(spot.at.x, spot.at.z, street.colliders), spot.place).toBeGreaterThanOrEqual(CLEARANCE);
      expect(nav.findPath(from, { x: spot.at.x, z: spot.at.z }), spot.place).not.toBeNull();
    }
  });

  it("lets the townsfolk walk from her door to everything they do and every door", () => {
    expect(street.activities.length).toBeGreaterThanOrEqual(20);
    for (const activity of street.activities) {
      const where = `activity at ${activity.at.x - STREET_ORIGIN.x}, ${activity.at.z - STREET_ORIGIN.z}`;
      expect(inside(activity.at.x, activity.at.z, street.colliders), where).toBe(false);
      expect(nearest(activity.at.x, activity.at.z, street.colliders), where).toBeGreaterThanOrEqual(CLEARANCE);
      expect(nav.findPath(from, activity.at), where).not.toBeNull();
    }
    for (const door of street.doors) {
      expect(nav.findPath(from, door), `door at ${door.x - STREET_ORIGIN.x}, ${door.z - STREET_ORIGIN.z}`).not.toBeNull();
    }
  });

  it("pairs up the chats: each one's partner names it back, standing close by", () => {
    const chats = street.activities.filter((a) => a.pair !== undefined);
    expect(chats.length).toBeGreaterThanOrEqual(4);
    street.activities.forEach((a, i) => {
      if (a.pair === undefined) return;
      const other = street.activities[a.pair];
      expect(other.pair).toBe(i);
      expect(Math.hypot(other.at.x - a.at.x, other.at.z - a.at.z)).toBeLessThan(1.5);
    });
  });

  it("keeps the townsfolk out of her yard", () => {
    const home = street.spots.find((s) => s.place === "home")!;
    for (const activity of street.activities) {
      expect(Math.hypot(activity.at.x - home.at.x, activity.at.z - home.at.z)).toBeGreaterThan(6);
    }
    for (const door of street.doors) expect(Math.hypot(door.x - home.at.x, door.z - home.at.z)).toBeGreaterThan(6);
  });

  it("keeps her inside the town: no way out past its edges", () => {
    const { walkable: w } = street;
    for (const [x, z] of [[w.minX - 0.5, (w.minZ + w.maxZ) / 2], [w.maxX + 0.5, (w.minZ + w.maxZ) / 2], [(w.minX + w.maxX) / 2, w.minZ - 0.5], [(w.minX + w.maxX) / 2, w.maxZ + 0.5]]) {
      expect(inside(x, z, street.colliders)).toBe(true);
    }
  });
});
