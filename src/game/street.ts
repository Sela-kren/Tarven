/**
 * Tarven's high street by day (TOWN_DAY.md): the scene she walks out into through the tavern's front door. It is
 * built here from boxes, like the furnishings, and stands in the same scene as the tavern, far enough off to the
 * north that the camera never sees the two at once.
 *
 * The camera looks north from the south, as in the tavern, so the street runs east to west across the screen. The
 * buildings stand along its north side with their fronts to the camera. Along the south side there's only a low
 * hedge, so nothing hides her, and her own tavern's door is behind her, where she came out.
 *
 * What each place does lives with the game (game.ts `useStreet`); this module only knows where things are.
 */
import {
  Box3,
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import type { Rect, Vec2 } from "./collision";
import type { TownActivity } from "./townsfolk";
import { solidRetroMaterial } from "./retro";

/** Where the street's middle stands in the world: far north of the tavern, out of its camera's reach. */
export const STREET_ORIGIN = new Vector3(0, 0, -70);

/** The places she can walk up to and use. */
export type StreetPlace =
  | "home" | "market" | "board" | "chapel" | "warmhouse" | "copperbell" | "garrison" | "fields" | "quarry"
  | "ciderbarn" | "bakehouse";

export interface StreetSpot {
  place: StreetPlace;
  /** What the prompt says: "E: Go to the market square". */
  label: string;
  /** Where she stands to use it, in the world. */
  at: Vector3;
  /** How near she has to be. */
  range: number;
}

export interface Street {
  root: Group;
  colliders: Rect[];
  /** Where she comes out of the tavern's door, facing north up the street. */
  spawn: Vector3;
  spots: StreetSpot[];
  /** How far the follow camera may go, in the world. */
  cameraLimits: Rect;
  /** What the townsfolk do (townsfolk.ts), and the doors they go in and out of, in the world. */
  activities: TownActivity[];
  doors: Vec2[];
  /** The ground the townsfolk find their way over, in the world. */
  walkable: Rect;
}

/** The street's walkable bounds, around its middle: the fronts of the buildings to the north, the hedge south. */
const BOUNDS = { minX: -27, maxX: 27, minZ: -4.2, maxZ: 2.5 };

const COLORS = {
  grass: 0x5d8a3a,
  grassDark: 0x4a7330,
  road: 0x8a7f72,
  cobble: 0x766b5f,
  plaster: 0xd9cdb4,
  timber: 0x5a3c26,
  stone: 0x9a948a,
  stoneDark: 0x6e6961,
  roofRed: 0x8a3b2a,
  roofSlate: 0x4d5560,
  roofThatch: 0xb08a4a,
  door: 0x3d2516,
  veyra: 0xb8324a,
  veyraLight: 0xe8a0b0,
  copper: 0xb5703a,
  awningA: 0xc9a227,
  awningB: 0x3f6f9a,
  awningC: 0xa83a32,
  board: 0x7a5233,
  paper: 0xefe8d6,
  hedge: 0x3e6a2c,
  trunk: 0x5a4030,
  leaves: 0x3f7a34,
  lampPost: 0x2a2a2e,
  lampGlow: 0x9fe6ff,
  poster: 0xe0b040,
};

/** Fixed numbers, so the street looks the same every time it's built. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How a kit piece is put down: its size against the kit's real one, its turn, and whether it blocks her. */
interface PieceOptions {
  scale?: number;
  /** Turned about the vertical, in radians. The kit's pieces face the camera (south) as they come. */
  turn?: number;
  collide?: boolean;
  /** Its front set on this line (z) instead of its middle on z: for buildings along the street. */
  frontAt?: number;
}

class Builder {
  readonly root = new Group();
  readonly colliders: Rect[] = [];
  private readonly materials = new Map<number, MeshLambertMaterial>();

  /** The town kit (tools/blender/build_street_kit.py), or null to build with boxes only. */
  constructor(private readonly kit: Object3D | null) {}

  /** True if the kit has this piece. */
  has(id: string): boolean {
    return Boolean(this.kit?.getObjectByName(`Kit_${id}`));
  }

  /** A copy of a kit piece, put down at (x, z) in street coordinates. Null without the kit. */
  piece(id: string, x: number, z: number, options: PieceOptions = {}): Object3D | null {
    const source = this.kit?.getObjectByName(`Kit_${id}`);
    if (!source) return null;
    const copy = source.clone();
    const scale = options.scale ?? 1;
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, options.turn ?? 0, 0);
    copy.scale.setScalar(scale);
    copy.updateMatrixWorld(true);
    const box = new Box3().setFromObject(copy);
    const shift = options.frontAt === undefined ? z : options.frontAt - box.max.z;
    copy.position.set(x, 0, shift);
    copy.traverse((child) => {
      if (child instanceof Mesh) child.castShadow = child.receiveShadow = true;
    });
    this.root.add(copy);
    if (options.collide) {
      // A little inside the outline, so she can walk up close to a wall or a cart.
      const [w, d] = [(box.max.x - box.min.x) * 0.9, (box.max.z - box.min.z) * 0.9];
      this.block(x + (box.max.x + box.min.x) / 2, shift + (box.max.z + box.min.z) / 2, w, d);
    }
    return copy;
  }

  material(color: number, glow = false): MeshLambertMaterial {
    const key = glow ? -color - 1 : color;
    let material = this.materials.get(key);
    if (!material) {
      material = solidRetroMaterial(`Street_${color.toString(16)}`, color);
      if (glow) {
        material.emissive.setHex(color);
        material.emissiveIntensity = 0.9;
      }
      this.materials.set(key, material);
    }
    return material;
  }

  /** A box by its centre and size, in street coordinates. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, collide = false): Mesh {
    const mesh = new Mesh(new BoxGeometry(w, h, d), this.material(color));
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this.root.add(mesh);
    if (collide) this.block(x, z, w, d);
    return mesh;
  }

  /** A footprint she can't walk through. */
  block(x: number, z: number, w: number, d: number): void {
    this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  /** A pitched roof along x: a four-sided cone squashed into a ridge. */
  roof(x: number, y: number, z: number, w: number, d: number, h: number, color: number): void {
    const mesh = new Mesh(new ConeGeometry(Math.SQRT1_2, 1, 4, 1), this.material(color));
    mesh.rotation.y = Math.PI / 4;
    mesh.scale.set(w * 1.05, h, d * 1.1);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    this.root.add(mesh);
  }

  /** A house front: walls, a roof, a door at the front and windows either side. */
  house(x: number, w: number, h: number, wall: number, roof: number, door = COLORS.door): void {
    const depth = 4;
    const z = BOUNDS.minZ - depth / 2 - 0.05;
    this.box(x, h / 2, z, w, h, depth, wall, true);
    this.roof(x, h, z, w, depth, Math.min(2.2, w * 0.45), roof);
    // Timber framing across the front, and the door and windows set into it.
    this.box(x, h - 0.15, BOUNDS.minZ - 0.02, w, 0.18, 0.06, COLORS.timber);
    this.box(x, 0.1, BOUNDS.minZ - 0.02, w, 0.2, 0.06, COLORS.timber);
    this.box(x, 1.05, BOUNDS.minZ - 0.01, 1.0, 2.1, 0.08, door);
    for (const side of [-1, 1]) {
      if (w < 3.4) continue;
      this.box(x + side * (w / 2 - 0.9), 1.6, BOUNDS.minZ - 0.01, 0.8, 0.8, 0.08, 0x2c3a44);
    }
  }
}

/** The street: its ground, buildings, market, trees and lamps, its walls, and the places she can use. */
export function buildStreet(kit: Object3D | null = null): Street {
  const b = new Builder(kit);
  const rand = seeded(0x7a2e);
  const { minX, maxX, minZ, maxZ } = BOUNDS;

  // The ground: grass all round, and the cobbled road east to west through the middle.
  const ground = new Mesh(new PlaneGeometry(90, 30), b.material(COLORS.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -4);
  ground.receiveShadow = true;
  b.root.add(ground);
  const road = new Mesh(new PlaneGeometry(maxX - minX + 6, 3.2), b.material(COLORS.road));
  road.rotation.x = -Math.PI / 2;
  // Lifted clear of the grass, which it would otherwise flicker through at a distance.
  road.position.set(0, 0.04, 0);
  road.receiveShadow = true;
  b.root.add(road);
  // A few darker cobbles, so the road reads as stone.
  for (let i = 0; i < 110; i++) {
    const [x, z] = [minX - 2 + rand() * (maxX - minX + 4), -1.5 + rand() * 3];
    b.box(x, 0.06, z, 0.25 + rand() * 0.2, 0.03, 0.2 + rand() * 0.15, COLORS.cobble);
  }
  // The path down from her door to the road.
  b.box(0, 0.03, 2.4, 1.4, 0.06, 2, COLORS.road);

  // Along the north side, west to east: the garrison's gate, the Copper Bell, the market and notice board, the
  // chapel and the Warm House.
  // The garrison yard: a stone wall with a gate, and the keep's tower behind it.
  b.box(-15, 1.2, minZ - 0.4, 5, 2.4, 0.8, COLORS.stone, true);
  b.box(-15, 1.15, minZ - 0.02, 1.6, 2.3, 0.1, COLORS.timber);
  b.box(-16, 4, minZ - 6, 3, 8, 3, COLORS.stoneDark, true);
  b.roof(-16, 8, minZ - 6, 3, 3, 1.6, COLORS.roofSlate);
  // The relay stone on the keep's tower: everyone's messages go through it, and Pell reads them (WORLD.md §3).
  const relay = new Mesh(new SphereGeometry(0.35, 8, 6), b.material(COLORS.lampGlow, true));
  relay.position.set(-16, 10.1, minZ - 6);
  b.root.add(relay);

  // The Copper Bell, the biggest tavern in the village: a wide copper-roofed front with a bell over the door.
  b.house(-8.5, 5.2, 3.6, COLORS.plaster, COLORS.copper);
  const bell = new Mesh(new ConeGeometry(0.25, 0.4, 8), b.material(COLORS.copper));
  bell.position.set(-8.5, 2.6, minZ + 0.2);
  b.root.add(bell);

  // The market square: three stalls under striped awnings, crates of goods, and the notice board on its posts.
  const awnings = [COLORS.awningA, COLORS.awningB, COLORS.awningC];
  [-3.4, -1.2, 1.0].forEach((x, i) => {
    b.box(x, 0.45, minZ - 0.9, 1.7, 0.9, 0.9, COLORS.timber, true);
    for (const side of [-1, 1]) b.box(x + side * 0.8, 1.1, minZ - 0.5, 0.08, 2.2, 0.08, COLORS.timber);
    const awning = b.box(x, 2.2, minZ - 0.9, 2, 0.08, 1.4, awnings[i]);
    awning.rotation.x = 0.18;
    for (let k = 0; k < 4; k++) {
      const goods = [0xd4a04a, 0x8a2a2a, 0xe8dcc0, 0x5a8a3a][(k + i) % 4];
      b.box(x - 0.6 + k * 0.4, 0.98, minZ - 0.9, 0.3, 0.16, 0.3, goods);
    }
  });
  b.box(3.1, 0.9, minZ - 0.2, 0.08, 1.8, 0.08, COLORS.timber, true);
  b.box(4.3, 0.9, minZ - 0.2, 0.08, 1.8, 0.08, COLORS.timber);
  b.box(3.7, 1.35, minZ - 0.18, 1.4, 0.9, 0.06, COLORS.board);
  for (let k = 0; k < 5; k++) {
    b.box(3.25 + (k % 3) * 0.42, 1.2 + Math.floor(k / 3) * 0.38, minZ - 0.14, 0.3, 0.3, 0.02, k === 2 ? COLORS.poster : COLORS.paper);
  }

  // The chapel of the Stone-Hearted: grey stone, a tall front and a bell tower.
  b.house(7.6, 3.6, 4.8, COLORS.stone, COLORS.roofSlate);
  b.box(7.6, 6.5, minZ - 1.8, 1.4, 3.4, 1.4, COLORS.stone);
  b.roof(7.6, 8.2, minZ - 1.8, 1.4, 1.4, 1.6, COLORS.roofSlate);

  // The Warm House, Veyra's church: red, with pink lanterns either side of its door.
  b.house(12.6, 4.4, 3.4, COLORS.veyra, COLORS.roofRed, COLORS.veyraLight);
  for (const side of [-1, 1]) {
    const lantern = new Mesh(new SphereGeometry(0.16, 8, 6), b.material(COLORS.veyraLight, true));
    lantern.position.set(12.6 + side * 0.85, 2.3, minZ + 0.1);
    b.root.add(lantern);
  }

  // Posters on the plaster walls (the modern touches, WORLD.md §5).
  b.box(-10.3, 1.5, minZ + 0.005, 0.5, 0.7, 0.02, COLORS.poster);
  b.box(14.1, 1.5, minZ + 0.005, 0.5, 0.7, 0.02, COLORS.paper);

  // Mana-lamps along the road: the kit's street lamp, its arm over the road.
  for (const x of [-19, -11.5, -5, 5.5, 11, 17.5]) {
    if (b.piece("lamp", x, 1.95, { scale: 0.62, turn: Math.PI, collide: true })) continue;
    b.box(x, 0.9, 1.9, 0.1, 1.8, 0.1, COLORS.lampPost, true);
    const glow = new Mesh(new SphereGeometry(0.13, 8, 6), b.material(COLORS.lampGlow, true));
    glow.position.set(x, 1.9, 1.9);
    b.root.add(glow);
  }

  // The rest of the village from the kit: two more of the houses she competes with, at the ends of the street, and
  // the everyday things between.
  // Hollin's Cider Barn (STORY.md, the Village Ledger): farmers drink on credit in his barn, by the fields road.
  b.piece("barn", -22.5, 0, { scale: 0.55, collide: true, frontAt: minZ });
  b.piece("hayStack", -19.2, -3.5, { scale: 0.8, collide: true });
  b.piece("chicken", -20.2, -2.9, { turn: 0.6 });
  b.piece("chicken", -19.6, -2.5, { turn: -1.1 });
  b.piece("hayWagon", -25.6, -2.7, { scale: 0.85, turn: Math.PI / 2, collide: true });
  b.piece("scarecrow", -26.3, 2.2, { scale: 0.9 });
  // The Bakehouse: Goodwife Tansy's pies and gossip, at the east end.
  b.piece("bakery", 20.5, 0, { scale: 0.62, collide: true, frontAt: minZ });
  b.piece("cafeTable", 24.4, -3.1, { scale: 0.75, collide: true });
  // The market's goods, beside the stalls.
  b.piece("crates", -4.9, -3.5, { scale: 0.9, collide: true });
  b.piece("pumpkins", 2.3, -3.5);
  b.piece("milkCans", -5.2, -2.6, { turn: 0.4 });
  // By the garrison, a trough for the horses; planters at the doors; a wheelbarrow left by the chapel.
  b.piece("trough", -12.4, -3.6, { scale: 0.9, collide: true });
  b.piece("planter", -6.2, -3.95, { scale: 0.8 });
  b.piece("planter", 14.9, -3.95, { scale: 0.8 });
  b.piece("wheelbarrow", 9.9, -3.3, { turn: 1.2 });
  // Benches on the south verge, facing the street.
  b.piece("bench", -7, 2.05, { turn: Math.PI, collide: true });
  b.piece("bench", 7, 2.05, { turn: Math.PI, collide: true });
  b.piece("bench", 21.5, 2.05, { turn: Math.PI, collide: true });

  // The low hedge along the south side, with a gap for her own door's path.
  for (const [from, to] of [[minX - 2, -0.9], [0.9, maxX + 2]] as const) {
    b.box((from + to) / 2, 0.35, maxZ + 0.35, to - from, 0.7, 0.5, COLORS.hedge, true);
  }
  // Her own tavern's gate, behind her: two short posts either side of the path, low enough not to hide her.
  for (const side of [-1, 1]) b.box(side * 0.8, 0.5, maxZ + 0.5, 0.14, 1.0, 0.14, COLORS.timber);
  b.box(0.8, 1.05, maxZ + 0.5, 0.5, 0.3, 0.05, COLORS.copper);
  b.block(0, maxZ + 1.2, 2, 1);

  // Trees at both ends, where the road leaves town: west to Mara's fields, east up the quarry road.
  // Only out at the ends: one in front of the hedge would hide her from the camera.
  const trees: [string, number, number][] = [
    ["appleTree", -27.5, -3.4], ["pineTree", -29, 2.6], ["pineTree", 26.2, -3.3], ["appleTree", 28.6, 2.7],
  ];
  for (const [kind, x, z] of trees) {
    if (b.piece(kind, x, z, { scale: 0.75, collide: true })) continue;
    b.box(x, 0.8, z, 0.3, 1.6, 0.3, COLORS.trunk, true);
    const crown = new Mesh(new ConeGeometry(1, 2.2, 7), b.material(COLORS.leaves));
    crown.position.set(x, 2.5, z);
    crown.castShadow = true;
    b.root.add(crown);
  }
  // The edges of the world: past the ends of the road the fields and the quarry are reached by walking up to them.
  b.block(minX - 1, 0, 2, 20);
  b.block(maxX + 1, 0, 2, 20);
  b.block(0, minZ - 1, maxX - minX + 6, 2);
  b.block(0, maxZ + 1.6, maxX - minX + 6, 1);

  addGrass(b.root, rand);

  b.root.position.copy(STREET_ORIGIN);
  b.root.updateMatrixWorld(true);
  const o = STREET_ORIGIN;
  const colliders = b.colliders.map((r) => ({ minX: r.minX + o.x, maxX: r.maxX + o.x, minZ: r.minZ + o.z, maxZ: r.maxZ + o.z }));
  const at = (x: number, z: number) => new Vector3(x + o.x, 0, z + o.z);
  const front = minZ + 0.6;
  const spots: StreetSpot[] = [
    { place: "home", label: "Go back inside your tavern", at: at(0, maxZ - 0.2), range: 1.3 },
    { place: "ciderbarn", label: "Look in at Hollin's Cider Barn", at: at(-22.5, front), range: 1.6 },
    { place: "garrison", label: "Go to the garrison yard", at: at(-15, front), range: 1.5 },
    { place: "copperbell", label: "Look in at the Copper Bell", at: at(-8.5, front), range: 1.4 },
    { place: "market", label: "Go to the market stalls", at: at(-1.2, front - 0.2), range: 2 },
    { place: "board", label: "Read the notice board", at: at(3.7, front), range: 1.2 },
    { place: "chapel", label: "Go into the chapel", at: at(7.6, front), range: 1.4 },
    { place: "warmhouse", label: "Go into the Warm House", at: at(12.6, front), range: 1.4 },
    { place: "bakehouse", label: "Go into the Bakehouse", at: at(20.5, front), range: 1.6 },
    { place: "fields", label: "Walk out to Mara's fields", at: at(minX + 0.6, 0), range: 1.6 },
    { place: "quarry", label: "Take the quarry road", at: at(maxX - 0.6, 0), range: 1.6 },
  ];
  // What the townsfolk get up to. Headings: 0 faces north (the houses), PI south, -PI/2 east, PI/2 west.
  const north = 0;
  const activity = (x: number, z: number, heading: number, stay: [number, number] = [6, 14]): TownActivity => ({
    at: { x: x + o.x, z: z + o.z },
    heading,
    stay,
  });
  const activities: TownActivity[] = [
    // Shopping at the stalls and looking over the crates.
    activity(-3.4, -3.25, north), activity(-1.2, -3.25, north), activity(1.0, -3.25, north), activity(-4.6, -2.8, north, [4, 8]),
    // Reading the notice board.
    activity(3.5, -3.35, north, [5, 10]), activity(4.1, -3.3, north, [5, 10]),
    // A horse's drink at the garrison trough; a prayer at the chapel door; a look at the Warm House.
    activity(-12.4, -2.85, north, [5, 9]), activity(7.6, -3.55, north, [8, 16]), activity(12.1, -3.5, north, [3, 7]),
    // Chats in the road, in pairs facing each other.
    activity(-14.3, 0.3, -Math.PI / 2, [10, 20]), activity(-13.5, 0.3, Math.PI / 2, [10, 20]),
    activity(15.2, -0.5, -Math.PI / 2, [10, 20]), activity(16.0, -0.5, Math.PI / 2, [10, 20]),
    activity(-2.6, 0.9, -Math.PI / 2, [8, 15]), activity(-1.8, 0.9, Math.PI / 2, [8, 15]),
    // A sit at the bakehouse's café table; a rest by the benches; the hay at the cider barn; looking down the roads.
    activity(24.4, -1.8, north, [10, 18]), activity(-7, 1.45, Math.PI, [6, 12]), activity(7, 1.45, Math.PI, [6, 12]),
    activity(-20.2, -2.3, north, [6, 12]), activity(-24.4, 0.2, Math.PI / 2, [4, 9]), activity(25.2, 0.2, -Math.PI / 2, [4, 9]),
  ];
  // Doors they go in and out of: the houses' doors, the garrison gate, and the two roads out of town.
  const doors = [-22.5, -15, -8.5, 7.6, 12.6, 20.5].map((x) => ({ x: x + o.x, z: minZ + 0.45 + o.z }));
  doors.push({ x: minX + 0.3 + o.x, z: o.z }, { x: maxX - 0.3 + o.x, z: o.z });

  return {
    root: b.root,
    colliders,
    activities,
    doors,
    walkable: { minX: minX + o.x, maxX: maxX + o.x, minZ: minZ + o.z, maxZ: maxZ + o.z },
    spawn: at(0, maxZ - 0.5),
    spots,
    // Held up the street from her, and following her north, so the fronts and roofs come into the shot as she
    // walks up to them.
    cameraLimits: { minX: o.x + minX + 7, maxX: o.x + maxX - 7, minZ: o.z - 3, maxZ: o.z - 1.6 },
  };
}

/** Tufts of grass and a few flowers on the verges, as instances so they cost one draw each. */
function addGrass(root: Object3D, rand: () => number): void {
  const tufts: Matrix4[] = [];
  const flowers: { matrix: Matrix4; color: number }[] = [];
  const up = new Vector3(0, 1, 0);
  const place = (x: number, z: number, scale: number) =>
    new Matrix4().compose(new Vector3(x, 0, z), new Quaternion().setFromAxisAngle(up, rand() * Math.PI), new Vector3(scale, scale * (0.8 + rand() * 0.6), scale));
  for (let i = 0; i < 1300; i++) {
    const x = -32 + rand() * 64;
    const z = -6 + rand() * 12;
    // Off the road, the path and the market's floor.
    if (Math.abs(z) < 1.7 || (Math.abs(x) < 0.8 && z > 0) || (x > -4.6 && x < 4.6 && z < -3.4)) continue;
    tufts.push(place(x, z, 0.5 + rand() * 0.5));
    if (rand() < 0.08) flowers.push({ matrix: place(x + 0.1, z + 0.1, 1), color: [0xf4f0e8, 0xe88aa8, 0x8a9af0, 0xf0c838][Math.floor(rand() * 4)] });
  }
  const tuft = new InstancedMesh(new ConeGeometry(0.09, 0.35, 3), solidRetroMaterial("Street_tuft", COLORS.grassDark), tufts.length);
  tufts.forEach((m, i) => tuft.setMatrixAt(i, m));
  tuft.position.y = 0.17;
  tuft.receiveShadow = true;
  root.add(tuft);
  const bloom = new InstancedMesh(new SphereGeometry(0.06, 6, 4), solidRetroMaterial("Street_flower", 0xffffff), flowers.length);
  flowers.forEach((f, i) => {
    f.matrix.elements[13] = 0.32;
    bloom.setMatrixAt(i, f.matrix);
    bloom.setColorAt(i, new Color(f.color));
  });
  root.add(bloom);
  // Stems under the flowers, the grass's own colour.
  const stems = new InstancedMesh(new CylinderGeometry(0.01, 0.01, 0.3, 3), solidRetroMaterial("Street_stem", COLORS.grassDark), flowers.length);
  flowers.forEach((f, i) => {
    const m = f.matrix.clone();
    m.elements[13] = 0.15;
    stems.setMatrixAt(i, m);
  });
  root.add(stems);
}
