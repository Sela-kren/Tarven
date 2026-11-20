/**
 * The tavern's upper floor, and the stair hall on the ground floor that climbs to it.
 *
 * The stair hall stands west of the taproom, north of the chimney, through a doorway in the taproom's west wall
 * (house.ts keeps its ground off the building plan). Its staircase climbs west along the north wall. Her own bedroom
 * and bathroom stay on the ground floor, behind the east door (furnishings.ts).
 *
 * Upstairs is its own area in the same world, built far off to the east at `UPSTAIRS_ORIGIN` where the taproom camera
 * never sees it (the way the high street stands at STREET_ORIGIN): reach the top of the stairs and the screen fades to
 * the landing up there; step back onto the top of the stairs and it fades back down to their foot.
 *
 * Upstairs, the landing is at the west end, over the stair hall, with the stair well along its north wall. A corridor
 * runs east from it along the south side with the four rooms north of it, their fronts low sills so the camera sees
 * in. West to east: the Lantern's room, then three guest rooms.
 *
 *            x: -13.4      -7.6 -7.2      -3.7 -3.5      0.0 0.2       3.7 3.9       7.4
 *   z -5.0   +--------------+
 *            |:::::well:::::|
 *   z -3.8   |  <-top   foot|
 *   z -2.4   | landing      +---------+----------+----------+----------+
 *            |              | Lantern | guest 1  | guest 2  | guest 3  |
 *   z  2.4   |              +--door*--+--door----+--door----+--door----+
 *   z  2.6   |                              corridor                   |
 *   z  4.6   +-------------------------------(low sill)----------------+
 *
 * Positions are given in the building's own frame (the same x and z as the ground floor) and moved up by the origin.
 */
import { Box3, Group, Mesh, Object3D, PointLight, Vector3 } from "three";
import type { Rect, Vec2 } from "./collision";
import {
  BATHROOM_FROM_X,
  BATHROOM_VIEW,
  BEDROOM_FROM_X,
  BEDROOM_SOUTH_Z,
  BEDROOM_VIEW,
  box,
  candle,
  Piece,
  roomMaterials,
} from "./furnishings";
import { STAIR_HALL_LOT } from "./house";
import {
  buildBedLantern,
  buildBedPlain,
  buildChest,
  buildCrates,
  buildDoorFrame,
  buildDoorLamp,
  buildDoorPlain,
  buildNightstand,
  buildStairsUp,
  buildStairWell,
  buildWashstand,
  setDoorLampLit,
  stairsHeightAt,
  STAIRS_RUN,
  STAIRS_WIDTH,
} from "./upstairspieces";

/** Where the upper floor stands in the world: far enough east that neither the taproom's nor the street's camera sees it. */
export const UPSTAIRS_ORIGIN = new Vector3(60, 0, 0);
const o = UPSTAIRS_ORIGIN;
/** A floor point upstairs, from the building's frame. */
const up = (x: number, z: number) => new Vector3(x + o.x, o.y, z + o.z);
/** A rectangle upstairs, from the building's frame. */
const upRect = (r: Rect): Rect => ({ minX: r.minX + o.x, maxX: r.maxX + o.x, minZ: r.minZ + o.z, maxZ: r.maxZ + o.z });

const WALL_HEIGHT = 3.2;
const WALL = 0.4;
/** Walls between the rooms upstairs, and the low fronts they show the corridor. */
const PARTITION = 0.2;
/** Walls facing the camera stay low, as the tavern's south wall does, so they never hide anyone. */
const SILL_HEIGHT = 0.35;
const DOOR_WIDTH = 0.9;
/** The open doors upstairs swing in against the room's side, out of the way; turned this far they're open. */
const DOOR_OPEN_TURN = Math.PI / 2;

// ---------------------------------------------------------------------------------------------- the stairs

/**
 * The middle of the staircase in the stair hall, and of the stair well right over it upstairs. The pieces are built
 * climbing north (upstairspieces.ts); turned this far they climb west, with the open side and its rail to the south.
 */
export const STAIRS_AT: Vec2 = { x: -10.4, z: -4.4 };
const STAIRS_TURN = Math.PI / 2;
const HALF = STAIRS_WIDTH / 2;
/** The treads of the ground floor's stairs, foot to the east, top to the west. */
export const GROUND_STAIRS: Rect = {
  minX: STAIRS_AT.x - STAIRS_RUN / 2, maxX: STAIRS_AT.x + STAIRS_RUN / 2, minZ: STAIRS_AT.z - HALF, maxZ: STAIRS_AT.z + HALF,
};
/** Climbing past here, she's at the top: the screen fades and she comes out on the landing upstairs. */
const CLIMB_TOP_X = STAIRS_AT.x - 1.4;
/** Where she stands after coming down, just inside the hall's doorway, facing the taproom; and where she comes out upstairs. */
export const STAIRS_FOOT = new Vector3(-7.9, 0, -3.45);
export const STAIRS_FOOT_HEADING = -Math.PI / 2;
export const LANDING = up(-12.9, -3.2);
export const LANDING_HEADING = Math.PI;
/**
 * The top of the stairs seen from upstairs: the floor at the west end of the well and the first tread down. Step on
 * it and she goes down. The banister closes the well's south side and east end; the way on is from the west.
 */
const WELL_TOP: Rect = { minX: STAIRS_AT.x - 1.85, maxX: STAIRS_AT.x - 1.3, minZ: STAIRS_AT.z - 0.55, maxZ: STAIRS_AT.z + 0.55 };
/** The well's banister: along its south side from the top tread's lip, and across its east end. */
const WELL_RAIL_SIDE: Rect = { minX: STAIRS_AT.x - 1.75, maxX: STAIRS_AT.x + 2.1, minZ: STAIRS_AT.z + 0.6, maxZ: STAIRS_AT.z + 0.7 };
const WELL_RAIL_END: Rect = { minX: STAIRS_AT.x + 2.0, maxX: STAIRS_AT.x + 2.1, minZ: STAIRS_AT.z - 0.6, maxZ: STAIRS_AT.z + 0.7 };

/** Inside of the stair hall: west of the taproom's west wall, north of the chimney (house.ts STAIR_HALL_LOT). */
const HALL = { minX: STAIR_HALL_LOT.minCol + WALL, maxX: -7.4, minZ: STAIR_HALL_LOT.minRow, maxZ: STAIR_HALL_LOT.maxRow + 1 - WALL };
/** The handrail down the ground stairs' open south side, leaving the bottom steps open to step on from the side. */
const STAIRS_RAIL: Rect = { minX: HALL.minX, maxX: STAIRS_AT.x + 1.6, minZ: STAIRS_AT.z + HALF - 0.02, maxZ: STAIRS_AT.z + HALF + 0.08 };

/** How high the floor under her is: the tread she's on in the stair hall, the floor upstairs, or the ground. */
export function floorHeightAt(x: number, z: number): number {
  if (isUpstairs({ x, z })) return o.y;
  const s = GROUND_STAIRS;
  if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) return 0;
  // Turned to climb west, the pieces' own z (foot at +z) runs along the world's x.
  return stairsHeightAt(x - STAIRS_AT.x);
}

/** Up here she's on the upper floor: anywhere this far east, which nothing else in the world reaches. */
export function isUpstairs(p: Vec2): boolean {
  return p.x > o.x - 15 && p.x < o.x + 20 && Math.abs(p.z - o.z) < 15;
}

const inside = (p: Vec2, r: Rect) => p.x >= r.minX && p.x <= r.maxX && p.z >= r.minZ && p.z <= r.maxZ;

/** She's climbed to the top of the stairs in the stair hall. */
export function atTopOfStairs(p: Vec2): boolean {
  return !isUpstairs(p) && inside(p, GROUND_STAIRS) && p.x < CLIMB_TOP_X;
}

/** She's stepped onto the top of the stairs from the landing upstairs. */
export function atTopOfWell(p: Vec2): boolean {
  return isUpstairs(p) && inside(p, upRect(WELL_TOP));
}

/**
 * The way a guest goes up to a room: from by the stair hall's doorway, through it, round to the foot of the stairs and
 * up them; they're gone at the top. Coming down is the same way backwards.
 */
export const UP_THE_STAIRS: readonly Vec2[] = [
  { x: -6.5, z: -3.45 },
  { x: -7.3, z: -3.45 },
  { x: -7.95, z: -3.6 },
  { x: -7.95, z: STAIRS_AT.z },
  { x: STAIRS_AT.x - 1.8, z: STAIRS_AT.z },
];

// ---------------------------------------------------------------------------------------------- the stair hall

/** Where the camera looks in the stair hall; it rises a little with her as she climbs. */
const STAIR_HALL_VIEW = new Vector3(-9.8, 0.8, -3.7);
const CLIMB_VIEW_RISE = 0.5;
/** The doorway through the taproom's west wall into the hall, north to south (one plan row: house.ts leaves it open). */
const DOORWAY_Z: [number, number] = [STAIR_HALL_LOT.doorRow, STAIR_HALL_LOT.doorRow + 1];
const WEST_WALL: [number, number] = [-7.4, -7.0];
const DOOR_HEIGHT = 2.3;

/** Builds the stair hall west of the taproom, with the stairs up, and trims the doorway into it. */
export function addStairHall(root: Object3D): void {
  const m = roomMaterials(root);
  const stone = { tile: 0.5 };
  const { minX, maxX, minZ, maxZ } = HALL;
  const [x0, x1] = WEST_WALL;
  const [d0, d1] = DOORWAY_Z;

  // The doorway: the building plan draws the west wall either side of it (house.ts); this is its lintel and posts.
  new Piece("Stair_Doorway")
    .add(box([x0, DOOR_HEIGHT, d0], [x1, WALL_HEIGHT, d1], stone), m("T_stone"))
    .add(box([x0 - 0.05, 0, d0 - 0.12], [x1 + 0.05, DOOR_HEIGHT, d0], { swap: true }), m("T_wood"))
    .add(box([x0 - 0.05, 0, d1], [x1 + 0.05, DOOR_HEIGHT, d1 + 0.12], { swap: true }), m("T_wood"))
    .add(box([x0 - 0.05, DOOR_HEIGHT, d0 - 0.12], [x1 + 0.05, DOOR_HEIGHT + 0.14, d1 + 0.12]), m("T_wood"))
    .into(root);

  // The hall: plank floor, a solid north and west wall, the low sill to the south, and a beam.
  new Piece("Hall_Floor").add(box([minX - WALL, -0.2, minZ - WALL], [x1, 0, maxZ + WALL], stone), m("T_floor")).into(root);
  new Piece("Hall_Wall_N", true)
    .add(box([minX - WALL, 0, minZ - WALL], [maxX, WALL_HEIGHT, minZ], stone), m("T_stone"))
    .into(root);
  new Piece("Hall_Wall_W", true)
    .add(box([minX - WALL, 0, minZ], [minX, WALL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
    .into(root);
  new Piece("Hall_Wall_S", true)
    .add(box([minX, 0, maxZ], [maxX, SILL_HEIGHT, maxZ + WALL], stone), m("T_stone"))
    .into(root);
  new Piece("Hall_Beams")
    .add(box([minX, WALL_HEIGHT - 0.28, minZ], [maxX, WALL_HEIGHT, minZ + 0.2]), m("T_wood"))
    .into(root);
  // A mat inside the doorway, before the foot of the stairs.
  new Piece("Hall_Rug").add(box([-8.35, 0, -3.75], [-7.45, 0.02, -2.55], { fit: true }), m("T_rug")).into(root);

  // The stairs along the north wall, climbing west to the floor above.
  const stairs = buildStairsUp(m);
  stairs.position.set(STAIRS_AT.x, 0, STAIRS_AT.z);
  stairs.rotation.y = STAIRS_TURN;
  root.add(withIndices(stairs));

  // A candle on a shelf on the west wall, over the way along beside the stairs.
  new Piece("Hall_Shelf").add(box([minX, 1.4, -3.3], [minX + 0.2, 1.45, -2.8]), m("T_tabletop")).into(root);
  candle(root, "Candle_Hall", new Vector3(minX + 0.1, 1.45, -3.05), m);
}

// ---------------------------------------------------------------------------------------------- upstairs

/** Inside of the upper floor's rooms, north of the corridor. */
const ROOMS_MIN_Z = -2.4;
const ROOMS_MAX_Z = 2.4;
/** The corridor along the south side, and the building's outer walls. */
const CORRIDOR = { minZ: ROOMS_MAX_Z + PARTITION, maxZ: 4.6 };
const OUTER = { minX: -13.8, maxX: 7.8, minZ: -2.8, maxZ: 5.0 };
/** Inside of the landing at the west end, over the stair hall: it reaches as far north as the hall, for the well. */
const LANDING_HALL = { minX: OUTER.minX + WALL, maxX: -7.6, minZ: HALL.minZ };
/** The wall between the landing and the first room. */
const LANDING_WALL: [number, number] = [LANDING_HALL.maxX, LANDING_HALL.maxX + WALL];

export interface UpstairsRoom {
  name: string;
  /** Inside the room, in the building's frame. */
  minX: number;
  maxX: number;
  /** Where the doorway in its front starts (its hinge). */
  door: number;
}

/** The rooms off the corridor, west to east (building frame): the Lantern's next to the landing, then three to let. */
export const UPSTAIRS_ROOMS: readonly UpstairsRoom[] = [
  { name: "Lantern", minX: -7.2, maxX: -3.7, door: -5.5 },
  { name: "Guest_1", minX: -3.5, maxX: 0.0, door: -2.8 },
  { name: "Guest_2", minX: 0.2, maxX: 3.7, door: 2.1 },
  { name: "Guest_3", minX: 3.9, maxX: 7.4, door: 4.6 },
];
const LANTERN_ROOM = UPSTAIRS_ROOMS[0];

/** Where the camera may look upstairs: the building's width, less what the shot shows either side of her. */
const CAMERA_INSET_X = 6.5;
export const UPSTAIRS_CAMERA_LIMITS: Rect = upRect({
  minX: OUTER.minX + CAMERA_INSET_X, maxX: OUTER.maxX - CAMERA_INSET_X, minZ: 0.5, maxZ: 1.0,
});
/** On the landing the camera comes north with her, as far as it needs to show the top of the stairs. */
const LANDING_VIEW_MIN_Z = -2.6;

/**
 * Where the camera looks for her here: upstairs, in a room it holds on that room; in the corridor it follows her
 * along; on the landing it comes north with her. On the ground floor it holds on the stair hall (rising a little as
 * she climbs), her bedroom or her bathroom. Anywhere else (the taproom) it's null, and the taproom's own follow
 * camera takes over.
 */
export function roomViewAt(p: Vector3, out: Vector3): Vector3 | null {
  if (isUpstairs(p)) {
    const local = { x: p.x - o.x, z: p.z - o.z };
    const limits = UPSTAIRS_CAMERA_LIMITS;
    if (local.x < LANDING_HALL.maxX) {
      return out.set(limits.minX, o.y + 0.8, Math.min(limits.maxZ, Math.max(LANDING_VIEW_MIN_Z + o.z, p.z)));
    }
    const room = local.z < ROOMS_MAX_Z ? UPSTAIRS_ROOMS.find((r) => local.x >= r.minX && local.x <= r.maxX) : undefined;
    const x = room ? (room.minX + room.maxX) / 2 + o.x : p.x;
    out.set(Math.min(limits.maxX, Math.max(limits.minX, x)), o.y + 0.8, room ? limits.minZ : limits.maxZ);
    return out;
  }
  if (p.x < HALL.maxX && p.z < HALL.maxZ + WALL) {
    return out.copy(STAIR_HALL_VIEW).setY(STAIR_HALL_VIEW.y + p.y * CLIMB_VIEW_RISE);
  }
  // Her bedroom and the bathroom past it are off the side of the main room's shot, so the camera moves over.
  if (p.x > BEDROOM_FROM_X && p.z < BEDROOM_SOUTH_Z) return out.copy(p.x > BATHROOM_FROM_X ? BATHROOM_VIEW : BEDROOM_VIEW);
  return null;
}

/** The Lantern's room as bought and as not: the furnished room (with the door lamp) and the crates it holds till then. */
const LANTERN_FURNISHED = "Lantern_Furnished";
const LANTERN_STORAGE = "Lantern_Storage";
/** The Lantern room's door, which shuts while a booking is upstairs. */
const LANTERN_DOOR = "Lantern_Door";
const DOOR_LAMP = "Door_Lamp";
/** The upstairs objects the game shows, hides or swings, which the room must keep whole. */
export const UPSTAIRS_WHOLE = [LANTERN_FURNISHED, LANTERN_STORAGE, LANTERN_DOOR];

/** A door's leaf swung open into the room, against the side of the doorway, as a rectangle (building frame). */
const openLeaf = (hinge: number): Rect => ({ minX: hinge - 0.05, maxX: hinge + 0.05, minZ: ROOMS_MAX_Z - DOOR_WIDTH + 0.1, maxZ: ROOMS_MAX_Z + 0.1 });
const shutLeaf = (hinge: number): Rect => ({ minX: hinge, maxX: hinge + DOOR_WIDTH, minZ: ROOMS_MAX_Z + 0.05, maxZ: ROOMS_MAX_Z + 0.15 });

/**
 * What blocks walking in the stair hall and upstairs that isn't a solid piece of the room: the stairs' handrail,
 * the well's banister, and the open doors upstairs. The Lantern room's door and furniture change, so they're in
 * Upstairs.blockers instead.
 */
export const STAIRS_COLLIDERS: readonly Rect[] = [
  STAIRS_RAIL,
  upRect(WELL_RAIL_SIDE),
  upRect(WELL_RAIL_END),
  ...UPSTAIRS_ROOMS.filter((r) => r !== LANTERN_ROOM).map((r) => upRect(openLeaf(r.door))),
];

/** The walls upstairs, as rectangles in the building's frame with their heights. */
export function upstairsWalls(): { name: string; rect: Rect; height: number }[] {
  const walls: { name: string; rect: Rect; height: number }[] = [];
  const add = (name: string, rect: Rect, height = WALL_HEIGHT) => walls.push({ name, rect, height });
  const [landingEast0, landingEast1] = LANDING_WALL;
  add("Upstairs_Wall_W", { minX: OUTER.minX, maxX: LANDING_HALL.minX, minZ: LANDING_HALL.minZ - WALL, maxZ: OUTER.maxZ });
  add("Landing_Wall_N", { minX: LANDING_HALL.minX, maxX: landingEast1, minZ: LANDING_HALL.minZ - WALL, maxZ: LANDING_HALL.minZ });
  add("Landing_Wall_E", { minX: landingEast0, maxX: landingEast1, minZ: LANDING_HALL.minZ, maxZ: CORRIDOR.minZ });
  add("Upstairs_Wall_N", { minX: landingEast0, maxX: OUTER.maxX, minZ: OUTER.minZ, maxZ: ROOMS_MIN_Z });
  add("Upstairs_Wall_E", { minX: OUTER.maxX - WALL, maxX: OUTER.maxX, minZ: OUTER.minZ, maxZ: OUTER.maxZ });
  add("Upstairs_Wall_S", { minX: LANDING_HALL.minX, maxX: OUTER.maxX - WALL, minZ: CORRIDOR.maxZ, maxZ: OUTER.maxZ }, SILL_HEIGHT);
  // The partitions between the rooms.
  UPSTAIRS_ROOMS.slice(1).forEach((room, i) => {
    add(`Partition_${i + 1}`, { minX: UPSTAIRS_ROOMS[i].maxX, maxX: room.minX, minZ: ROOMS_MIN_Z, maxZ: CORRIDOR.minZ });
  });
  // The rooms' low fronts on the corridor, broken by each doorway.
  for (const room of UPSTAIRS_ROOMS) {
    const front = (minX: number, maxX: number, part: string) =>
      add(`${room.name}_Front_${part}`, { minX, maxX, minZ: ROOMS_MAX_Z, maxZ: CORRIDOR.minZ }, SILL_HEIGHT);
    front(room.minX, room.door, "W");
    front(room.door + DOOR_WIDTH, room.maxX, "E");
  }
  return walls;
}

/** Builds the whole upper floor at UPSTAIRS_ORIGIN, the Lantern's room included. */
export function addUpstairs(root: Object3D): void {
  const m = roomMaterials(root);
  const floor = new Group();
  floor.name = "Upstairs";
  floor.position.copy(o);
  root.add(floor);
  const stone = { tile: 0.5 };

  // The floorboards, with a hole for the stair well (whose own boards fill the rest of its footprint).
  const well = { minX: STAIRS_AT.x - 2.1, maxX: STAIRS_AT.x + 2.1, minZ: STAIRS_AT.z - 0.6, maxZ: STAIRS_AT.z + 0.6 };
  const north = LANDING_HALL.minZ - WALL;
  new Piece("Upstairs_Floor")
    .add(box([OUTER.minX, -0.2, north], [well.minX, 0, OUTER.maxZ], stone), m("T_floor"))
    .add(box([well.maxX, -0.2, north], [LANDING_WALL[1], 0, OUTER.maxZ], stone), m("T_floor"))
    .add(box([well.minX, -0.2, well.maxZ], [well.maxX, 0, OUTER.maxZ], stone), m("T_floor"))
    .add(box([well.minX, -0.2, north], [well.maxX, 0, well.minZ], stone), m("T_floor"))
    .add(box([LANDING_WALL[1], -0.2, OUTER.minZ], [OUTER.maxX, 0, OUTER.maxZ], stone), m("T_floor"))
    .into(floor);
  for (const wall of upstairsWalls()) {
    const { minX, maxX, minZ, maxZ } = wall.rect;
    new Piece(wall.name, true).add(box([minX, 0, minZ], [maxX, wall.height, maxZ], stone), m("T_stone")).into(floor);
  }
  // Beams along the north walls, and a window in each room.
  new Piece("Upstairs_Beams")
    .add(box([LANDING_WALL[1], WALL_HEIGHT - 0.28, ROOMS_MIN_Z], [OUTER.maxX - WALL, WALL_HEIGHT, ROOMS_MIN_Z + 0.2]), m("T_wood"))
    .add(box([LANDING_HALL.minX, WALL_HEIGHT - 0.28, LANDING_HALL.minZ], [LANDING_HALL.maxX, WALL_HEIGHT, LANDING_HALL.minZ + 0.2]), m("T_wood"))
    .into(floor);
  for (const room of UPSTAIRS_ROOMS) {
    const mid = (room.minX + room.maxX) / 2;
    new Piece(`Upstairs_Window_${room.name}`)
      .add(box([mid - 0.5, 1.15, ROOMS_MIN_Z - 0.02], [mid + 0.5, 2.35, ROOMS_MIN_Z + 0.02], { fit: true }), m("T_window"))
      .add(box([mid - 0.6, 2.35, ROOMS_MIN_Z - 0.06], [mid + 0.6, 2.47, ROOMS_MIN_Z + 0.08]), m("T_wood"))
      .add(box([mid - 0.6, 1.03, ROOMS_MIN_Z - 0.06], [mid + 0.6, 1.15, ROOMS_MIN_Z + 0.12]), m("T_wood"))
      .into(floor);
  }
  // A runner from the landing down the corridor.
  new Piece("Upstairs_Rug").add(box([-12.8, 0, 3.25], [7.0, 0.02, 3.95], { tile: 0.6 }), m("T_rug")).into(floor);
  // Candles on little shelves: on the partitions' corridor ends, and on the landing's west wall.
  for (const room of UPSTAIRS_ROOMS.slice(1)) {
    const x = room.minX - PARTITION / 2;
    new Piece("Corridor_Shelf").add(box([x - 0.12, 1.45, CORRIDOR.minZ], [x + 0.12, 1.5, CORRIDOR.minZ + 0.18]), m("T_tabletop")).into(floor);
    candle(floor, "Candle_Corridor", new Vector3(x, 1.5, CORRIDOR.minZ + 0.09), m);
  }
  const wallX = LANDING_HALL.minX;
  new Piece("Landing_Shelf").add(box([wallX, 1.45, -2.0], [wallX + 0.2, 1.5, -1.5]), m("T_tabletop")).into(floor);
  candle(floor, "Candle_Landing", new Vector3(wallX + 0.1, 1.5, -1.75), m);

  // The top of the stairs, over the stairs in the hall below.
  const top = buildStairWell(m);
  top.position.set(STAIRS_AT.x, 0, STAIRS_AT.z);
  top.rotation.y = STAIRS_TURN;
  floor.add(top);

  // The doorways: a frame in each front, and the door swung open against the room's side (the Lantern's swings).
  for (const room of UPSTAIRS_ROOMS) {
    const frame = buildDoorFrame(m);
    frame.position.set(room.door + DOOR_WIDTH / 2, 0, ROOMS_MAX_Z + PARTITION / 2);
    floor.add(frame);
    const door = buildDoorPlain(m);
    door.position.set(room.door, 0, ROOMS_MAX_Z + PARTITION / 2);
    door.rotation.y = DOOR_OPEN_TURN;
    if (room === LANTERN_ROOM) door.name = LANTERN_DOOR;
    floor.add(door);
  }

  const place = (parent: Object3D, piece: Object3D, x: number, z: number, turn = 0) => {
    piece.position.set(x, 0, z);
    piece.rotation.y = turn;
    parent.add(piece);
    return piece;
  };

  // The guest rooms: a plain bed with a chest at its foot, a candle by it and a washstand on the side wall. The
  // middle room has its bed on the east side, so the three don't look stamped out of one mould.
  for (const room of UPSTAIRS_ROOMS.slice(1)) {
    const east = room.name === "Guest_2";
    const side = (inset: number) => (east ? room.maxX - inset : room.minX + inset);
    place(floor, buildBedPlain(m), side(0.6), -1.35);
    place(floor, buildNightstand(m), side(1.45), -2.12);
    place(floor, buildChest(m), side(0.6), 0.05);
    place(floor, buildWashstand(m), east ? room.minX + 0.245 : room.maxX - 0.245, -1.4, east ? Math.PI / 2 : -Math.PI / 2);
  }

  // The Lantern's room: crates in storage until it's furnished, then the wide red bed, washstand, candle, chest,
  // and the red lamp by its door. Both are kept whole and shown one at a time; what they block is Upstairs.blockers.
  const lantern = LANTERN_ROOM;
  const storage = new Group();
  storage.name = LANTERN_STORAGE;
  place(storage, buildCrates(m), lantern.maxX - 0.9, -1.8);
  place(storage, buildCrates(m), lantern.minX + 0.55, -0.4, Math.PI / 2);
  const furnished = new Group();
  furnished.name = LANTERN_FURNISHED;
  place(furnished, buildBedLantern(m), lantern.maxX - 0.9, -1.35);
  place(furnished, buildNightstand(m), lantern.maxX - 2.15, -2.12);
  place(furnished, buildWashstand(m), lantern.minX + 0.245, -0.9, Math.PI / 2);
  place(furnished, buildChest(m), lantern.maxX - 0.9, 0.07);
  const lamp = place(furnished, buildDoorLamp(m), lantern.door + DOOR_WIDTH + 0.05, ROOMS_MAX_Z + PARTITION / 2 + 0.12);
  lamp.name = DOOR_LAMP;
  // The lamp's light is the game's own (Upstairs), red and without shadows, so the room doesn't hang one of its own.
  lamp.traverse((object) => delete object.userData.light);
  for (const set of [storage, furnished]) {
    set.traverse((object) => {
      if (!object.userData.collide) return;
      delete object.userData.collide;
      object.userData.blocks = 1;
    });
    floor.add(set);
  }
  withIndices(floor);
}

/**
 * Gives every shape an index list, as the room's own shapes have: the room is merged into one mesh per material
 * (world.ts), and a shape without one (an extruded stringer or rail) can't be merged with those that have one.
 */
function withIndices(root: Object3D): Object3D {
  root.traverse((object) => {
    if (!(object instanceof Mesh) || object.geometry.index) return;
    const count = object.geometry.getAttribute("position").count;
    object.geometry.setIndex(Array.from({ length: count }, (_, i) => i));
  });
  return root;
}

// ---------------------------------------------------------------------------------------------- at play

/** The door lamp's own light: red, low and without shadows, so lighting it doesn't rebuild the room's shaders. */
const LAMP_LIGHT = { color: 0xff3a24, intensity: 5, distance: 5, flicker: 0.12 };
/** How fast the Lantern room's door swings, per second, eased. */
const DOOR_SWING_RATE = 6;

/**
 * The upper floor at play: the Lantern's room shows its crates until it's furnished, then its bed and the red lamp
 * by its door, lit (and the door shut) while a booking is upstairs. Made after the room is set up, from the
 * pieces it kept whole.
 */
export class Upstairs {
  private readonly furnished: Object3D;
  private readonly storage: Object3D;
  private readonly lamp: Object3D | null;
  private readonly door: Object3D;
  private readonly light = new PointLight(LAMP_LIGHT.color, 0, LAMP_LIGHT.distance, 2);
  private readonly furnishedBlocks: Rect[];
  private readonly storageBlocks: Rect[];
  private shownFurnished: boolean | null = null;
  private shownLit: boolean | null = null;
  private time = 0;
  /** What the Lantern's room blocks right now (its furniture, and its door), in world space. */
  blockers: Rect[] = [];

  constructor(pieces: ReadonlyMap<string, Object3D>) {
    const piece = (name: string) => {
      const found = pieces.get(name);
      if (!found) throw new Error(`The room did not keep "${name}" whole`);
      return found;
    };
    this.furnished = piece(LANTERN_FURNISHED);
    this.storage = piece(LANTERN_STORAGE);
    this.door = piece(LANTERN_DOOR);
    this.lamp = this.furnished.getObjectByName(DOOR_LAMP) ?? null;
    this.lamp?.getObjectByName("Light_Door_Lamp")?.add(this.light);
    this.furnishedBlocks = blocksOf(this.furnished);
    this.storageBlocks = blocksOf(this.storage);
  }

  /**
   * Shows the room as it stands tonight, and swings its door. True when what it blocks changed, so the game can
   * put the new blockers in the world's colliders.
   */
  update(dt: number, furnished: boolean, busy: boolean): boolean {
    this.time += dt;
    const lit = furnished && busy;
    const turn = lit ? 0 : DOOR_OPEN_TURN;
    this.door.rotation.y += (turn - this.door.rotation.y) * (1 - Math.exp(-DOOR_SWING_RATE * dt));
    const wobble = Math.sin(this.time * 8.3) * 0.5 + Math.sin(this.time * 21.1) * 0.5;
    this.light.intensity = lit ? LAMP_LIGHT.intensity * (1 + wobble * LAMP_LIGHT.flicker) : 0;
    if (furnished === this.shownFurnished && lit === this.shownLit) return false;

    this.furnished.visible = furnished;
    this.storage.visible = !furnished;
    if (this.lamp) setDoorLampLit(this.lamp, lit);
    // Kept in the scene lit or not, so lighting it doesn't change how many lights the shaders were built for.
    this.light.visible = true;
    this.shownFurnished = furnished;
    this.shownLit = lit;
    const leaf = upRect(lit ? shutLeaf(LANTERN_ROOM.door!) : openLeaf(LANTERN_ROOM.door!));
    this.blockers = [...(furnished ? this.furnishedBlocks : this.storageBlocks), leaf];
    return true;
  }
}

/** The ground each solid piece in a set stands on, from its box. */
function blocksOf(set: Object3D): Rect[] {
  const rects: Rect[] = [];
  set.updateWorldMatrix(true, true);
  set.traverse((object) => {
    if (!object.userData.blocks) return;
    const bounds = new Box3().setFromObject(object);
    rects.push({ minX: bounds.min.x, maxX: bounds.max.x, minZ: bounds.min.z, maxZ: bounds.max.z });
  });
  return rects;
}
