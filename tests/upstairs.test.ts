import { Vector3 } from "three";
import { describe, expect, it } from "vitest";
import type { Rect } from "../src/game/collision";
import { NavGrid } from "../src/game/path";
import { BATH_SPOT, BED_SPOT, BEDROOM_FROM_X, CLOSET_SPOT, DESK_SPOT, JOURNAL_SPOT } from "../src/game/furnishings";
import { HousePlan, STAIR_HALL_LOT } from "../src/game/house";
import {
  atTopOfStairs,
  atTopOfWell,
  floorHeightAt,
  GROUND_STAIRS,
  isUpstairs,
  LANDING,
  roomViewAt,
  STAIRS_AT,
  STAIRS_COLLIDERS,
  STAIRS_FOOT,
  UP_THE_STAIRS,
  UPSTAIRS_CAMERA_LIMITS,
  UPSTAIRS_ORIGIN as o,
  UPSTAIRS_ROOMS,
  upstairsWalls,
} from "../src/game/upstairs";
import { STAIRS_RISE } from "../src/game/upstairspieces";

const PLAYER_RADIUS = 0.3;
const gap = (x: number, z: number, r: Rect) =>
  Math.hypot(x - Math.min(Math.max(x, r.minX), r.maxX), z - Math.min(Math.max(z, r.minZ), r.maxZ));
const shift = (r: Rect): Rect => ({ minX: r.minX + o.x, maxX: r.maxX + o.x, minZ: r.minZ + o.z, maxZ: r.maxZ + o.z });
const walls = upstairsWalls().map((wall) => shift(wall.rect));
const blockers = [...walls, ...STAIRS_COLLIDERS];

describe("the stairs", () => {
  it("climb from the hall floor to the full rise, and the upper floor stands level", () => {
    expect(floorHeightAt(STAIRS_FOOT.x, STAIRS_FOOT.z)).toBe(0);
    // The foot is at the east end, by the doorway, and the top at the west.
    expect(floorHeightAt(GROUND_STAIRS.maxX - 0.01, STAIRS_AT.z)).toBeLessThan(0.5);
    expect(floorHeightAt(GROUND_STAIRS.minX + 0.05, STAIRS_AT.z)).toBeCloseTo(STAIRS_RISE);
    expect(floorHeightAt(LANDING.x, LANDING.z)).toBe(o.y);
  });

  it("take her up near the top of the flight, and down from the top of the well, never from where she arrives", () => {
    expect(atTopOfStairs({ x: GROUND_STAIRS.minX + 0.2, z: STAIRS_AT.z })).toBe(true);
    expect(atTopOfStairs({ x: STAIRS_AT.x, z: STAIRS_AT.z })).toBe(false);
    expect(atTopOfStairs(STAIRS_FOOT)).toBe(false);
    expect(atTopOfWell(LANDING)).toBe(false);
    expect(atTopOfWell({ x: STAIRS_AT.x - 1.8 + o.x, z: STAIRS_AT.z + o.z })).toBe(true);
    expect(isUpstairs(LANDING)).toBe(true);
    expect(isUpstairs(STAIRS_FOOT)).toBe(false);
  });

  it("leaves room to stand where she comes out at either end", () => {
    for (const r of blockers) expect(gap(LANDING.x, LANDING.z, r)).toBeGreaterThanOrEqual(PLAYER_RADIUS);
    for (const r of STAIRS_COLLIDERS) expect(gap(STAIRS_FOOT.x, STAIRS_FOOT.z, r)).toBeGreaterThanOrEqual(PLAYER_RADIUS);
  });

  it("walks a guest up the treads from by the stair hall's doorway, gone at the top", () => {
    const top = UP_THE_STAIRS[UP_THE_STAIRS.length - 1];
    // It starts in the taproom (west wall at -7) and goes in through the doorway's row.
    expect(UP_THE_STAIRS[0].x).toBeGreaterThan(-7);
    expect(UP_THE_STAIRS[1].z).toBeGreaterThan(STAIR_HALL_LOT.doorRow);
    expect(UP_THE_STAIRS[1].z).toBeLessThan(STAIR_HALL_LOT.doorRow + 1);
    expect(floorHeightAt(top.x, top.z)).toBeCloseTo(STAIRS_RISE);
  });

  it("stand west of the taproom, on ground the building plan keeps clear, with a gap in the west wall", () => {
    expect(GROUND_STAIRS.maxX).toBeLessThan(-7.4);
    expect(GROUND_STAIRS.minX).toBeGreaterThan(STAIR_HALL_LOT.minCol);
    expect(GROUND_STAIRS.minZ).toBeGreaterThanOrEqual(STAIR_HALL_LOT.minRow);
    const plan = new HousePlan({ tiles: [[-8, -4], [-8, 1]], walls: [], furniture: [], stored: [] });
    // An old save's floor where the hall now stands is taken back.
    expect(plan.layout.tiles).toEqual([[-8, 1]]);
    expect(plan.canBuyTile(-8, -5)).toBe(false);
    const westWall = plan.outerWalls().filter((w) => w.rect.maxX === -7 && w.rect.minZ >= -5 && w.rect.maxZ <= -2);
    expect(westWall.map((w) => w.rect.minZ).sort()).toEqual([-3, -5]);
  });
});

describe("the floor upstairs", () => {
  it("has its rooms side by side west to east, inside the building", () => {
    UPSTAIRS_ROOMS.forEach((room, index) => {
      expect(room.maxX).toBeGreaterThan(room.minX);
      if (index > 0) expect(room.minX).toBeGreaterThan(UPSTAIRS_ROOMS[index - 1].maxX);
      if (room.door !== null) {
        expect(room.door).toBeGreaterThanOrEqual(room.minX);
        expect(room.door + 0.9).toBeLessThanOrEqual(room.maxX);
      }
    });
    // Four rooms, all east of the landing and the well.
    expect(UPSTAIRS_ROOMS.map((r) => r.name)).toEqual(["Lantern", "Guest_1", "Guest_2", "Guest_3"]);
    expect(UPSTAIRS_ROOMS[0].minX).toBeGreaterThan(STAIRS_AT.x + 2.1);
  });

  it("leaves her own rooms on the ground floor, behind the east door", () => {
    for (const spot of [BED_SPOT, DESK_SPOT, JOURNAL_SPOT, CLOSET_SPOT, BATH_SPOT]) {
      expect(isUpstairs(spot)).toBe(false);
      expect(spot.x).toBeGreaterThan(BEDROOM_FROM_X);
    }
  });

  it("lets her walk from the landing along the corridor and in at every door", () => {
    const nav = new NavGrid(blockers, PLAYER_RADIUS, shift({ minX: -13.8, maxX: 7.8, minZ: -5.4, maxZ: 5 }));
    for (const room of UPSTAIRS_ROOMS) {
      const inside = { x: room.door + 0.45 + o.x, z: 1.2 + o.z };
      const path = nav.findPath(LANDING, inside);
      expect(path, room.name).not.toBeNull();
      const end = path![path!.length - 1];
      expect(Math.hypot(end.x - inside.x, end.z - inside.z), room.name).toBeLessThan(0.3);
    }
  });

  it("holds the camera on the room she's in, follows her down the corridor, and on the stair hall below", () => {
    const out = new Vector3();
    const limits = UPSTAIRS_CAMERA_LIMITS;
    for (const room of UPSTAIRS_ROOMS) {
      const view = roomViewAt(new Vector3((room.minX + room.maxX) / 2 + o.x, 0, o.z), out)!;
      expect(view.x).toBeGreaterThanOrEqual(limits.minX);
      expect(view.x).toBeLessThanOrEqual(limits.maxX);
    }
    // The stair hall and her bedroom below hold the camera; the taproom doesn't.
    expect(roomViewAt(new Vector3(STAIRS_FOOT.x, 0, STAIRS_FOOT.z), out)).not.toBeNull();
    expect(roomViewAt(new Vector3(9, 0, 0), out)).not.toBeNull();
    expect(roomViewAt(new Vector3(0, 0, 0), out)).toBeNull();
    expect(roomViewAt(new Vector3(-6.5, 0, 0), out)).toBeNull();
  });
});
