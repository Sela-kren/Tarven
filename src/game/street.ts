/**
 * Tarven by day (TOWN_DAY.md): the market town she walks out into through her tavern's front door. It stands in the
 * same scene as the tavern, far enough off to the north that the camera never sees the two at once.
 *
 * It is laid out like a real small medieval market town: one high street running east to west, burgage plots
 * (narrow two-storey timber houses shoulder to shoulder, long yards behind) along its north side, the street
 * widening north into a stepped market place with the market cross at its heart, the chapel and its churchyard on
 * the market's north side, a lane from there up to the Baron's keep on its mound, the west gate where the road leaves
 * for Mara's fields, and the east road out to the quarry. Her tavern, the biggest building on the street, stands back
 * behind its own fenced front yard.
 *
 * The camera looks north from the south at 45 degrees, so every building faces south (toward it) and no building
 * stands south of ground she can walk on: the south side of the high street is the town's edge, low hedges and
 * kitchen gardens running down to the fields. Nothing tall ever comes between the camera and her.
 *
 * The map, north up, x east and z south in metres around STREET_ORIGIN (1 character = 1 m across, 1 row = 2 m down).
 * # building, = open ground she walks on, : her yard (. its path), + churchyard, ~ the keep's mound, W walls,
 * G the west gate, - dirt roads and the back lane, " the low gardens; S1-S4 stalls, X market cross, O well,
 * b notice board. Hills and pines close the view north of the keep; Mara's fields lie west, the quarry road east.
 *
 *   x:  -40       -30       -20       -10       0         10        20        30        40
 *  -40                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *  -38                            ~~~~~~~~~~~~~~~#######~~~~~~~~~~~~~~
 *  -36                            ~~~~~~~~~~~~~~~##KEEP#~~~~~~~~~~~~~~
 *  -34                            ~~~~~~~~~~~~~~~#######~~~~~~~~~~~~~~
 *  -32     W                      WWWWWWWWWWWWWWW#gate#WWWWWWWWWWWWWW
 *  -30     W                                 #######===
 *  -28     W                                 #######===
 *  -26     W                                 #CHAPEL===#######
 *  -24     W           back yards            #######===##WARM#
 *  -22     W                                 #######===#######
 *  -20     W                                 +++==++==========###### ############
 *  -18     W                       ##########+++==++==========###### ############
 *  -16     W                       ##COPPER##=================##BAKE #HER TAVERN#
 *  -14     W  ######---------------###BELL###==S1=========S2==###### ############
 *  -12     W  ############===######=b=============================== :::::..:::::######
 *  -10     W  #BARN###HS-C===#HS-A#================================= :::::..:::::##HS-B
 *   -8     W  ############===######=======S3=====O====X=====S4====== :::::..:::::######
 *   -6     W  ############===######================================= ::::yard::::######
 *   -4   GGGG========================================================================
 *   -2 --GGGG========================================================================----
 *    0 --GGGG==============================HIGH STREET===============================----
 *    2   GGGG========================================================================
 *    4 """W""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
 *    6 """W""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
 *
 * Walkable: the high street x[-35,37] z[-4,4.5]; the alley x[-22.5,-20] z[-12,-4]; the market place x[-14,19.5]
 * z[-11,-4] and x[-4,13.5] z[-16,-11]; the Warm House forecourt x[6.5,13.5] z[-19,-16]; the chapel path
 * x[-0.9,0.9] z[-19,-16]; the lane to the keep x[3.5,6.5] z[-30,-16]; her yard x[20,32] z[-11,-4]. Everything else
 * inside the town's bounds is blocked (see OPEN), so she never wanders behind the houses where they'd hide her.
 *
 * What each place does lives with the game (game.ts `useStreet`); this module only knows where things are.
 */
import {
  BoxGeometry,
  Box3,
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

/** Where the town's middle stands in the world: far north of the tavern, out of its camera's reach. */
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
  /** Where she comes out of the tavern's door, in her front yard. */
  spawn: Vector3;
  /** Which way she faces coming out: south, away from the door and toward the camera (0 = north). */
  spawnHeading: number;
  spots: StreetSpot[];
  /** How far the follow camera may go, in the world. */
  cameraLimits: Rect;
  /** What the townsfolk do (townsfolk.ts), and the doors they go in and out of, in the world. */
  activities: TownActivity[];
  doors: Vec2[];
  /** The ground the townsfolk find their way over, in the world. */
  walkable: Rect;
}

const rect = (minX: number, maxX: number, minZ: number, maxZ: number): Rect => ({ minX, maxX, minZ, maxZ });

/** The open ground, in street coordinates. Inside BOUNDS, everything not in one of these is blocked. */
const OPEN: Rect[] = [
  rect(-35, 37, -4, 4.5), // the high street, between the house fronts and the hedge on its south side
  rect(-22.5, -20, -12, -4), // the alley between two plots, to the back lane's gate
  rect(-14, 19.5, -11, -4), // the market place where it opens off the high street
  rect(-4, 13.5, -16, -11), // the market place's narrower north end
  rect(6.5, 13.5, -19, -16), // in front of the Warm House
  rect(-0.9, 0.9, -19, -16), // the path through the churchyard to the chapel door
  rect(3.5, 6.5, -30, -16), // the lane up to the keep
  rect(20, 32, -11, -4), // her front yard
];

/** The town's walkable bounds: the box round all the open ground. */
const BOUNDS = rect(-35, 37, -30, 4.5);

/** Her yard, and the part of it kept empty for things she adds later (benches, a sign, a stall, a garden). */
const YARD = rect(20, 32, -11, -4);
/** The yard's gate onto the high street, a gap in the picket fence. */
const YARD_GATE = { minX: 24.8, maxX: 27.2 };
/** Her tavern's door, in the middle of its front. */
const TAVERN_DOOR = { x: 26, z: -11 };

/**
 * The buildings: where each stands (its middle across, its front line), its footprint and height (the kit pieces'
 * real sizes for the existing ones, the brief's for the new ones until they're made), and the door's x.
 * They block the same with or without the kit.
 */
interface Plot {
  /** Its middle across. */
  x: number;
  /** Its front line, facing south. */
  front: number;
  w: number;
  d: number;
  /** To the ridge. */
  h: number;
}

const BUILDINGS: Record<
  "ciderBarn" | "houseC" | "houseA" | "copperBell" | "chapel" | "warmHouse" | "bakehouse" | "tavern" | "houseB",
  Plot
> = {
  ciderBarn: { x: -31.75, front: -4, w: 6.5, d: 9.4, h: 6.2 },
  houseC: { x: -25.5, front: -4, w: 6, d: 8, h: 7.5 },
  houseA: { x: -17, front: -4, w: 6, d: 8, h: 7.8 },
  copperBell: { x: -9, front: -11, w: 10, d: 7, h: 8 },
  chapel: { x: 0, front: -19, w: 7, d: 11, h: 7 },
  warmHouse: { x: 10, front: -19, w: 7, d: 7, h: 7.5 },
  bakehouse: { x: 16.5, front: -11, w: 6, d: 8.6, h: 6.8 },
  tavern: { x: TAVERN_DOOR.x, front: TAVERN_DOOR.z, w: 12, d: 8, h: 9 },
  houseB: { x: 35.5, front: -4, w: 6, d: 8, h: 7.2 },
};

/** The keep on its mound north of the lane, and how high the mound stands. */
const KEEP = { x: 5, front: -31, w: 7, d: 7, h: 16, mound: 1.2 };
/** The west gate, across the high street where it leaves town, turned so its arch runs east to west. */
const GATE = { x: -37, z: 0, depth: 4, span: 9, h: 7 };

const COLORS = {
  grass: 0x5d8a3a,
  grassDark: 0x4a7330,
  hill: 0x557f38,
  road: 0x8a7f72,
  dirt: 0x8d7556,
  cobble: 0x766b5f,
  plaster: 0xd9cdb4,
  plasterWarm: 0xe2c690,
  plasterWhite: 0xece6d6,
  timber: 0x5a3c26,
  stone: 0x9a948a,
  stoneDark: 0x6e6961,
  roofRed: 0x8a3b2a,
  roofSlate: 0x4d5560,
  roofThatch: 0xb08a4a,
  barn: 0x9a3328,
  door: 0x3d2516,
  window: 0x2c3a44,
  veyra: 0xb8324a,
  veyraLight: 0xe8a0b0,
  copper: 0xb5703a,
  copperGreen: 0x5f9c86,
  awningA: 0xc9a227,
  awningB: 0x3f6f9a,
  board: 0x7a5233,
  paper: 0xefe8d6,
  hedge: 0x3e6a2c,
  trunk: 0x5a4030,
  leaves: 0x3f7a34,
  lampPost: 0x2a2a2e,
  lampGlow: 0x9fe6ff,
  poster: 0xe0b040,
  hay: 0xd2b25a,
};

/** Fixed numbers, so the town looks the same every time it's built. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How a kit piece is put down: its size against the kit's real one, its turn, its front line, what it blocks. */
interface PieceOptions {
  scale?: number;
  /** Turned about the vertical, in radians. The kit's pieces face the camera (south) as they come. */
  turn?: number;
  /** Its front set on this line (z) instead of its middle on z: for buildings along a street. */
  frontAt?: number;
  /** Stood this high, on a mound. */
  y?: number;
  /**
   * The footprint [across, deep] she can't walk through, round (x, z), or behind the front line if `frontAt` is
   * set. Given here rather than taken from the kit, so the town blocks the same with or without it.
   */
  solid?: [number, number];
}

class Builder {
  readonly root = new Group();
  readonly colliders: Rect[] = [];
  private readonly materials = new Map<number, MeshLambertMaterial>();

  /** The town kit (tools/blender/build_street_kit.py), or null to build with boxes only. */
  constructor(private readonly kit: Object3D | null) {}

  /**
   * A copy of a kit piece, put down at (x, z) in street coordinates, or null without the kit (the caller then
   * builds its own plainer stand-in). What it blocks is blocked either way.
   */
  piece(id: string, x: number, z: number, options: PieceOptions = {}): Object3D | null {
    if (options.solid) {
      const [w, d] = options.solid;
      this.block(x, options.frontAt === undefined ? z : options.frontAt - d / 2, w, d);
    }
    const source = this.kit?.getObjectByName(`Kit_${id}`);
    if (!source) return null;
    const copy = source.clone();
    copy.position.set(0, 0, 0);
    copy.rotation.set(0, options.turn ?? 0, 0);
    copy.scale.setScalar(options.scale ?? 1);
    copy.updateMatrixWorld(true);
    const shift = options.frontAt === undefined ? z : options.frontAt - new Box3().setFromObject(copy).max.z;
    copy.position.set(x, options.y ?? 0, shift);
    copy.traverse((child) => {
      if (child instanceof Mesh) child.castShadow = child.receiveShadow = true;
    });
    this.root.add(copy);
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

  /** A flat patch of ground (road, cobbles, a path), lifted clear of the grass so it doesn't flicker through it. */
  patch(r: Rect, color: number, y = 0.04): void {
    const mesh = new Mesh(new PlaneGeometry(r.maxX - r.minX, r.maxZ - r.minZ), this.material(color));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set((r.minX + r.maxX) / 2, y, (r.minZ + r.maxZ) / 2);
    mesh.receiveShadow = true;
    this.root.add(mesh);
  }

  /** A glowing ball: a mana-lamp's light, Veyra's lanterns, the relay stone. */
  glow(x: number, y: number, z: number, radius: number, color: number): void {
    const mesh = new Mesh(new SphereGeometry(radius, 8, 6), this.material(color, true));
    mesh.position.set(x, y, z);
    this.root.add(mesh);
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

  /**
   * The stand-in for a building when the kit hasn't got it: walls, a roof, a timber band per storey, the door in the
   * middle of the front and windows either side on every storey.
   */
  building(
    at: Plot,
    wall: number,
    roof: number,
    door = COLORS.door,
  ): void {
    const { x, front, w, d, h } = at;
    const storeys = h >= 6 ? 2 : 1;
    const eaves = h * (storeys === 2 ? 0.7 : 0.62);
    const z = front - d / 2;
    this.box(x, eaves / 2, z, w, eaves, d, wall);
    this.roof(x, eaves, z, w, d, h - eaves, roof);
    const face = front + 0.03;
    const storey = eaves / storeys;
    // Windows a quarter of the way in from each side, and two more a side on the wide fronts.
    const windows = w >= 8 ? [0.17, 0.36] : w >= 3.4 ? [0.28] : [];
    for (let s = 0; s < storeys; s++) {
      this.box(x, s * storey + 0.1, face, w, 0.2, 0.06, COLORS.timber);
      const sill = s * storey + (s === 0 ? 1.2 : 0.9);
      for (const side of [-1, 1]) {
        for (const at of windows) this.box(x + side * at * w, sill + 0.45, face, 0.8, 0.9, 0.08, COLORS.window);
      }
    }
    this.box(x, eaves - 0.1, face, w, 0.2, 0.06, COLORS.timber);
    this.box(x, 1.1, face + 0.01, 1.2, 2.2, 0.08, door);
  }

  /** A tree from the kit, or a trunk and a cone of leaves. It blocks only round its trunk. */
  tree(kind: "appleTree" | "pineTree" | "roundTree", x: number, z: number, scale = 1, solid = true): void {
    if (this.piece(kind, x, z, { scale, solid: solid ? [0.6, 0.6] : undefined })) return;
    this.box(x, 0.9 * scale, z, 0.3, 1.8 * scale, 0.3, COLORS.trunk);
    const tall = kind === "pineTree" ? 5 : 3;
    const crown = new Mesh(new ConeGeometry(1.6 * scale, tall * scale, 7), this.material(COLORS.leaves));
    crown.position.set(x, (1.6 + tall / 2) * scale, z);
    crown.castShadow = true;
    this.root.add(crown);
  }

  /** A market stall: a counter, its goods and a striped awning on four posts. */
  stall(id: "stall" | "stallB", x: number, z: number, awning: number): void {
    if (this.piece(id, x, z, { solid: [2.4, 1.6] })) return;
    this.box(x, 0.45, z + 0.3, 2.2, 0.9, 0.8, COLORS.timber);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(x + sx * 1.1, 1.2, z + sz * 0.7, 0.08, 2.4, 0.08, COLORS.timber);
    const top = this.box(x, 2.45, z, 2.5, 0.08, 1.7, awning);
    top.rotation.x = -0.15;
    for (let k = 0; k < 4; k++) {
      const goods = [0xd4a04a, 0x8a2a2a, 0xe8dcc0, 0x5a8a3a][(k + Math.round(x)) & 3];
      this.box(x - 0.75 + k * 0.5, 0.98, z + 0.3, 0.35, 0.16, 0.35, goods);
    }
  }
}

/** The ground inside BOUNDS that isn't open, cut into as few rectangles as it takes. */
function blockedGround(): Rect[] {
  const xs = [...new Set([BOUNDS.minX, BOUNDS.maxX, ...OPEN.flatMap((r) => [r.minX, r.maxX])])].sort((a, b) => a - b);
  const zs = [...new Set([BOUNDS.minZ, BOUNDS.maxZ, ...OPEN.flatMap((r) => [r.minZ, r.maxZ])])].sort((a, b) => a - b);
  const open = (x: number, z: number) => OPEN.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ);
  const rows: Rect[] = [];
  for (let j = 0; j + 1 < zs.length; j++) {
    const z = (zs[j] + zs[j + 1]) / 2;
    let start: number | null = null;
    for (let i = 0; i + 1 <= xs.length; i++) {
      const shut = i + 1 < xs.length && !open((xs[i] + xs[i + 1]) / 2, z);
      if (shut && start === null) start = xs[i];
      if (!shut && start !== null) {
        rows.push(rect(start, xs[i], zs[j], zs[j + 1]));
        start = null;
      }
    }
  }
  // Runs one above the other with the same ends become one.
  const merged: Rect[] = [];
  for (const r of rows) {
    const above = merged.find((m) => m.minX === r.minX && m.maxX === r.maxX && m.maxZ === r.minZ);
    if (above) above.maxZ = r.maxZ;
    else merged.push({ ...r });
  }
  return merged;
}

/** The town: its ground, buildings, market, gardens and the keep, its walls, and the places she can use. */
export function buildStreet(kit: Object3D | null = null): Street {
  const b = new Builder(kit);
  const rand = seeded(0x7a2e);

  buildGround(b, rand);
  buildHighStreetRow(b);
  buildMarket(b);
  buildTavernAndYard(b);
  buildKeep(b);
  buildEdges(b);

  // Everything inside the town's bounds that isn't open ground, and a wall round the bounds themselves.
  b.colliders.push(...blockedGround());
  const { minX, maxX, minZ, maxZ } = BOUNDS;
  b.block(minX - 1, (minZ + maxZ) / 2, 2, maxZ - minZ + 4);
  b.block(maxX + 1, (minZ + maxZ) / 2, 2, maxZ - minZ + 4);
  b.block((minX + maxX) / 2, minZ - 1, maxX - minX + 4, 2);
  b.block((minX + maxX) / 2, maxZ + 1, maxX - minX + 4, 2);

  addGrass(b.root, rand);

  b.root.position.copy(STREET_ORIGIN);
  b.root.updateMatrixWorld(true);
  const o = STREET_ORIGIN;
  const colliders = b.colliders.map((r) => ({ minX: r.minX + o.x, maxX: r.maxX + o.x, minZ: r.minZ + o.z, maxZ: r.maxZ + o.z }));
  const at = (x: number, z: number) => new Vector3(x + o.x, 0, z + o.z);
  const { ciderBarn, copperBell, chapel, warmHouse, bakehouse } = BUILDINGS;
  const spots: StreetSpot[] = [
    { place: "home", label: "Go back inside your tavern", at: at(TAVERN_DOOR.x, TAVERN_DOOR.z + 0.6), range: 1.3 },
    { place: "ciderbarn", label: "Look in at Hollin's Cider Barn", at: at(ciderBarn.x, ciderBarn.front + 0.7), range: 1.6 },
    { place: "copperbell", label: "Look in at the Copper Bell", at: at(copperBell.x, copperBell.front + 0.7), range: 1.4 },
    { place: "board", label: "Read the notice board", at: at(-12.3, -9.7), range: 1.2 },
    { place: "market", label: "Go to the market stalls", at: at(-1, -11.8), range: 1.8 },
    { place: "chapel", label: "Go into the chapel", at: at(chapel.x, chapel.front + 0.7), range: 1.4 },
    { place: "warmhouse", label: "Go into the Warm House", at: at(warmHouse.x, warmHouse.front + 0.7), range: 1.4 },
    { place: "bakehouse", label: "Go into the Bakehouse", at: at(bakehouse.x, bakehouse.front + 0.7), range: 1.5 },
    { place: "garrison", label: "Go to the garrison yard", at: at(KEEP.x, KEEP.front + 1.7), range: 1.6 },
    { place: "fields", label: "Walk out to Mara's fields", at: at(BOUNDS.minX + 0.7, 0), range: 1.6 },
    { place: "quarry", label: "Take the quarry road", at: at(BOUNDS.maxX - 0.7, 0), range: 1.6 },
  ];

  // What the townsfolk get up to. Headings: 0 faces north (the houses), PI south, -PI/2 east, PI/2 west.
  // None of it is in her yard: that's hers.
  const [north, south, east, west] = [0, Math.PI, -Math.PI / 2, Math.PI / 2];
  const activity = (x: number, z: number, heading: number, stay: [number, number] = [6, 14]): TownActivity => ({
    at: { x: x + o.x, z: z + o.z },
    heading,
    stay,
  });
  const activities: TownActivity[] = [
    // Shopping at the four stalls.
    activity(-6.5, -6.2, north), activity(11.5, -6.2, north), activity(-1, -11.9, north), activity(9.5, -11.9, north),
    // Reading the notice board on the Copper Bell's wall.
    activity(-12.7, -9.8, north, [5, 10]), activity(-11.9, -9.75, north, [5, 10]),
    // Water from the well; a sit on the market cross's steps, watching the square.
    activity(0, -5.9, north, [5, 9]), activity(5, -6.3, south, [8, 16]),
    // A prayer at the chapel door; a long look at the Warm House; the queue at the Bakehouse; the café table.
    activity(0, -18, north, [8, 16]), activity(10.8, -17.6, north, [3, 7]), activity(17.3, -10, north, [6, 12]),
    activity(18.1, -4.4, north, [10, 18]),
    // A drink on the Copper Bell's bench; a rest by the benches on the high street.
    activity(-6, -9.9, south, [8, 15]), activity(-15, 3.4, south, [6, 12]), activity(15, 3.4, south, [6, 12]),
    // Gawping up at the keep; the hay at the cider barn; looking down the roads out of town.
    activity(4.2, -28.6, north, [5, 10]), activity(-29.3, -2.6, north, [6, 12]),
    activity(-33.8, 0.6, west, [4, 9]), activity(35.6, -0.6, east, [4, 9]),
  ];
  // Chats: two spots 0.8 m apart facing each other, each naming the other as its `pair`, so two townsfolk standing
  // there are talking to each other (towntalk.ts).
  const chat = (x: number, z: number, stay: [number, number]) => {
    const first = activities.length;
    activities.push({ ...activity(x, z, east, stay), pair: first + 1 }, { ...activity(x + 0.8, z, west, stay), pair: first });
  };
  chat(14.6, -5.2, [10, 20]); // in the square by the Bakehouse
  chat(2.4, -13.3, [8, 15]); // at the market's north end
  chat(-24.3, 0.4, [10, 20]); // in the high street by the alley
  // Doors they go in and out of: the houses, the inn and the shops, the chapel and the Warm House, the keep's gate,
  // the back lane's gate at the end of the alley, and the two roads out of town. Never her tavern's.
  const door = (x: number, z: number) => ({ x: x + o.x, z: z + o.z });
  const doors = [
    ...[ciderBarn, BUILDINGS.houseC, BUILDINGS.houseA, copperBell, chapel, warmHouse, bakehouse, BUILDINGS.houseB].map((h) =>
      door(h.x, h.front + 0.45),
    ),
    door(KEEP.x, KEEP.front + 1.45),
    door(-21.25, -11.55),
    door(BOUNDS.minX + 0.3, 0),
    door(BOUNDS.maxX - 0.3, 0),
  ];

  return {
    root: b.root,
    colliders,
    activities,
    doors,
    walkable: { minX: BOUNDS.minX + o.x, maxX: BOUNDS.maxX + o.x, minZ: BOUNDS.minZ + o.z, maxZ: BOUNDS.maxZ + o.z },
    spawn: at(TAVERN_DOOR.x, TAVERN_DOOR.z + 1.1),
    spawnHeading: Math.PI,
    spots,
    // The camera follows her over the whole town but stops short of its ends, so the scenery past the gate, the
    // quarry road, the keep's hill and the gardens always fills the edges of the shot. At the ends she walks out to
    // the edge of the frame instead.
    cameraLimits: { minX: o.x - 28, maxX: o.x + 29.5, minZ: o.z - 29, maxZ: o.z + 0.5 },
  };
}

/** The grass, the hills behind the keep, the roads, the market's cobbles, the lanes and paths. */
function buildGround(b: Builder, rand: () => number): void {
  const ground = new Mesh(new PlaneGeometry(150, 110), b.material(COLORS.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -20);
  ground.receiveShadow = true;
  b.root.add(ground);
  // The high street's cobbles between the house fronts and the south verge, and the dirt road on out of town both ways.
  b.patch(rect(-35, 37, -4, 2.6), COLORS.road);
  b.patch(rect(-62, -35, -2, 2), COLORS.dirt);
  b.patch(rect(37, 62, -2, 2), COLORS.dirt);
  // The market place, the lane to the keep, the forecourt and the paths.
  for (const r of OPEN.slice(1, 7)) b.patch(r, r === OPEN[1] ? COLORS.dirt : COLORS.road);
  // The back lane behind the west plots, through the alley's gate (seen over the roofs, not walked).
  b.patch(rect(-28.5, -14, -14.5, -12.3), COLORS.dirt);
  // The path from her door to her gate across the yard.
  b.patch(rect(TAVERN_DOOR.x - 0.7, TAVERN_DOOR.x + 0.7, YARD.minZ, YARD.maxZ), COLORS.dirt, 0.045);
  // A few darker cobbles, so the street and the market read as stone.
  const paved = [rect(-35, 37, -4, 2.6), OPEN[2], OPEN[3], OPEN[6]];
  for (let i = 0; i < 320; i++) {
    const r = paved[i % paved.length];
    const [x, z] = [r.minX + rand() * (r.maxX - r.minX), r.minZ + rand() * (r.maxZ - r.minZ)];
    b.box(x, 0.06, z, 0.25 + rand() * 0.2, 0.03, 0.2 + rand() * 0.15, COLORS.cobble);
  }
  // The hills the keep's mound rises out of, closing the view to the north.
  for (const [x, z, radius, height] of [[-30, -54, 20, 9], [8, -60, 26, 14], [42, -54, 22, 10], [-55, -40, 16, 7]]) {
    const hill = new Mesh(new ConeGeometry(radius, height, 9), b.material(COLORS.hill));
    hill.position.set(x, height / 2 - 0.2, z);
    hill.scale.z = 0.6;
    hill.receiveShadow = true;
    b.root.add(hill);
  }
}

/** The north side of the high street, west to east: the cider barn, two plots and the alley between them. */
function buildHighStreetRow(b: Builder): void {
  const { ciderBarn, houseC, houseA, houseB } = BUILDINGS;
  // Hollin's Cider Barn (STORY.md, the Village Ledger): farmers drink on credit in his barn, by the fields road.
  if (!b.piece("barn", ciderBarn.x, 0, { scale: 0.6, frontAt: ciderBarn.front, solid: [ciderBarn.w, ciderBarn.d] })) {
    b.building(ciderBarn, COLORS.barn, COLORS.roofSlate, COLORS.timber);
  }
  b.piece("hayStack", -29.3, -3.45, { scale: 0.8, solid: [2.1, 0.75] }) ?? b.box(-29.3, 0.45, -3.45, 2.1, 0.9, 0.75, COLORS.hay, false);
  b.piece("chicken", -33.6, -3.2, { turn: 0.6 });
  b.piece("chicken", -33, -2.7, { turn: -1.1 });
  // Burgage plots: narrow timber houses shoulder to shoulder, gables to the street, their yards running back north.
  const houses: [string, Plot, number, number][] = [
    ["houseC", houseC, COLORS.plasterWhite, COLORS.roofSlate],
    ["houseA", houseA, COLORS.plaster, COLORS.roofRed],
    ["houseB", houseB, COLORS.plasterWarm, COLORS.roofThatch],
  ];
  for (const [id, house, wall, roof] of houses) {
    if (!b.piece(id, house.x, 0, { frontAt: house.front, solid: [house.w, house.d] })) b.building(house, wall, roof);
    b.piece("planter", house.x + 1.9, house.front + 0.3, { scale: 0.8 });
  }
  // The alley between houseC and houseA ends at the back lane's gate.
  b.box(-21.25, 0.6, -12, 2.5, 1.2, 0.1, COLORS.timber);
  // Posters on the timber walls (the modern touches, WORLD.md §5).
  b.box(houseA.x - 2.1, 1.6, houseA.front + 0.04, 0.5, 0.7, 0.02, COLORS.poster);
  b.box(houseB.x - 2.1, 1.6, houseB.front + 0.04, 0.5, 0.7, 0.02, COLORS.paper);
  // Trees in the plots' back yards, over the roofs.
  b.tree("appleTree", -26, -17, 1, false);
  b.tree("roundTree", -33, -18, 1, false);
  b.tree("roundTree", -18, -17.5, 0.9, false);
  b.tree("pineTree", 36, -16, 1, false);
  b.tree("appleTree", 10, -28.5, 0.9, false);
}

/** The market place: the Copper Bell and the Bakehouse on its steps, the chapel and the Warm House at its head. */
function buildMarket(b: Builder): void {
  const { copperBell, chapel, warmHouse, bakehouse } = BUILDINGS;
  // The Copper Bell, the biggest of the houses she competes with: a wide copper-roofed inn with a bell over the door.
  if (!b.piece("copperBell", copperBell.x, 0, { frontAt: copperBell.front, solid: [copperBell.w, copperBell.d] })) {
    b.building(copperBell, COLORS.plaster, COLORS.copperGreen);
    const bell = new Mesh(new ConeGeometry(0.3, 0.5, 8), b.material(COLORS.copper));
    bell.position.set(copperBell.x, 2.8, copperBell.front + 0.35);
    b.root.add(bell);
  }
  // Its notice board on the wall west of the door, and a bench by it for a drink in the sun.
  if (!b.piece("noticeBoard", -12.3, -10.7, { solid: [1.6, 0.4] })) {
    for (const side of [-1, 1]) b.box(-12.3 + side * 0.7, 0.9, -10.7, 0.08, 1.8, 0.08, COLORS.timber);
    b.box(-12.3, 1.35, -10.68, 1.4, 0.9, 0.06, COLORS.board);
    for (let k = 0; k < 5; k++) {
      b.box(-12.75 + (k % 3) * 0.42, 1.2 + Math.floor(k / 3) * 0.38, -10.64, 0.3, 0.3, 0.02, k === 2 ? COLORS.poster : COLORS.paper);
    }
  }
  b.piece("bench", -6, -10.55, { solid: [1.8, 0.5] }) ?? b.box(-6, 0.25, -10.55, 1.8, 0.5, 0.5, COLORS.timber);

  // The Bakehouse: Goodwife Tansy's pies and gossip, on the market's east step.
  if (!b.piece("bakery", bakehouse.x, 0, { scale: 0.82, frontAt: bakehouse.front, solid: [bakehouse.w, bakehouse.d] })) {
    b.building(bakehouse, COLORS.plasterWarm, COLORS.roofRed);
    b.box(bakehouse.x + 1.8, bakehouse.h, bakehouse.front - 3, 0.7, 2, 0.7, COLORS.stoneDark);
  }
  b.piece("cafeTable", 18.1, -6, { scale: 0.85, solid: [1.6, 1.6] }) ?? b.box(18.1, 0.4, -6, 1.2, 0.8, 1.2, COLORS.timber, false);

  // The chapel of the Stone-Hearted at the market's head: grey stone, its bell tower at the front.
  if (!b.piece("chapel", chapel.x, 0, { frontAt: chapel.front, solid: [chapel.w, chapel.d] })) {
    b.building({ ...chapel, h: 6.5 }, COLORS.stone, COLORS.roofSlate);
    b.box(chapel.x, 6, chapel.front - 1.7, 3.4, 12, 3.4, COLORS.stone);
    b.roof(chapel.x, 12, chapel.front - 1.7, 3.4, 3.4, 2.2, COLORS.roofSlate);
  }
  // Its churchyard in front: a low wall, a gap for the path, the graves and a yew.
  for (const [x, w] of [[-2.2, 2.6], [2.2, 2.6]]) b.box(x, 0.3, -16.15, w, 0.6, 0.3, COLORS.stone);
  for (const x of [-3.35, 3.35]) b.box(x, 0.3, -17.6, 0.3, 0.6, 2.9, COLORS.stone);
  for (const [x, z] of [[-2.6, -17.2], [-1.6, -17.4], [-2.4, -18.4], [1.5, -17.1], [2.3, -17.4], [1.5, -18.4]]) {
    b.box(x, 0.35, z, 0.45, 0.7, 0.12, COLORS.stoneDark);
  }
  b.tree("roundTree", 2.9, -18.6, 0.45, false);

  // The Warm House, Veyra's church, across the lane from the chapel: red, with pink lanterns either side of its door.
  if (!b.piece("warmHouse", warmHouse.x, 0, { frontAt: warmHouse.front, solid: [warmHouse.w, warmHouse.d] })) {
    b.building(warmHouse, COLORS.veyra, COLORS.roofRed, COLORS.veyraLight);
    for (const side of [-1, 1]) b.glow(warmHouse.x + side * 0.95, 2.3, warmHouse.front + 0.2, 0.18, COLORS.veyraLight);
  }

  // The square: four stalls round the market cross and the well, the goods stacked between.
  b.stall("stallB", -6.5, -7.6, COLORS.awningB);
  b.stall("stall", 11.5, -7.6, COLORS.awningA);
  b.stall("stall", -1, -13.4, COLORS.awningA);
  b.stall("stallB", 9.5, -13.4, COLORS.awningB);
  if (!b.piece("marketCross", 5, -7.6, { solid: [1.6, 1.6] })) {
    b.box(5, 0.2, -7.6, 1.6, 0.4, 1.6, COLORS.stone);
    b.box(5, 0.55, -7.6, 1.1, 0.3, 1.1, COLORS.stone);
    b.box(5, 2, -7.6, 0.25, 2.6, 0.25, COLORS.stone);
    b.box(5, 2.8, -7.6, 1, 0.22, 0.22, COLORS.stone);
  }
  if (!b.piece("well", 0, -7.6, { solid: [2.3, 2.3] })) {
    const ring = new Mesh(new CylinderGeometry(0.9, 0.9, 0.8, 10), b.material(COLORS.stone));
    ring.position.set(0, 0.4, -7.6);
    b.root.add(ring);
    b.roof(0, 2.2, -7.6, 1.9, 1.9, 0.7, COLORS.roofRed);
    for (const side of [-1, 1]) b.box(side * 0.85, 1.1, -7.6, 0.1, 2.2, 0.1, COLORS.timber);
  }
  b.piece("crates", -3.6, -7.7, { scale: 0.9, solid: [1.5, 0.85] }) ?? b.box(-3.6, 0.4, -7.7, 1.4, 0.8, 0.8, COLORS.board, false);
  b.piece("pumpkins", 7.3, -7.7);
  b.piece("milkCans", 13.6, -7.5, { turn: 0.4 });
}

/** Her tavern, the biggest building on the street, set back behind her own fenced front yard. */
function buildTavernAndYard(b: Builder): void {
  const { tavern } = BUILDINGS;
  if (!b.piece("tavern", tavern.x, 0, { frontAt: tavern.front, solid: [tavern.w, tavern.d] })) {
    b.building(tavern, COLORS.plaster, COLORS.roofThatch);
    // Its sign on a bracket over the door.
    b.box(tavern.x + 0.9, 3.1, tavern.front + 0.5, 0.08, 0.08, 1, COLORS.timber);
    b.box(tavern.x + 0.9, 2.65, tavern.front + 0.9, 0.06, 0.7, 0.9, COLORS.copper);
  }
  // The picket fence along the street, with the gap for the gate, and its two posts.
  const front = YARD.maxZ;
  for (const [from, to] of [[YARD.minX - 0.4, YARD_GATE.minX], [YARD_GATE.maxX, YARD.maxX + 0.4]]) {
    b.block((from + to) / 2, front, to - from, 0.24);
    const half = (to - from) / 2;
    for (const x of [from + half / 2, to - half / 2]) {
      if (!b.piece("picket", x, front, { scale: half / 3.08 })) b.box(x, 0.4, front, half, 0.8, 0.06, COLORS.plasterWhite);
    }
  }
  for (const x of [YARD_GATE.minX, YARD_GATE.maxX]) b.box(x, 0.6, front, 0.16, 1.2, 0.16, COLORS.timber, true);
  // A low hedge down the side toward the market.
  b.block(YARD.minX - 0.25, (YARD.minZ + YARD.maxZ) / 2, 0.5, YARD.maxZ - YARD.minZ);
  for (const z of [-9.85, -7.55, -5.25]) {
    if (!b.piece("hedge", YARD.minX - 0.25, z, { scale: 0.72, turn: Math.PI / 2 })) {
      b.box(YARD.minX - 0.25, 0.45, z, 0.6, 0.9, 2.3, COLORS.hedge);
    }
  }
  // The rest of the yard, x[20,32] z[-10.4,-4.3] beside the path, is kept empty: reserved for later.
}

/** The Baron's keep on its mound at the top of the lane, the garrison walls either side, the relay stone on top. */
function buildKeep(b: Builder): void {
  const { x, front, w, d, h, mound } = KEEP;
  b.box(5, mound / 2, -40.5, 36, mound, 19, COLORS.grassDark);
  // Steps up to the keep's gate from the lane.
  b.box(x, mound / 4, front + 0.35, 3, mound / 2, 0.7, COLORS.stone);
  if (!b.piece("keep", x, 0, { frontAt: front, y: mound, solid: [w, d] })) {
    const z = front - d / 2;
    b.box(x, mound + h / 2, z, w, h, d, COLORS.stoneDark);
    for (let k = 0; k < 4; k++) {
      for (const side of [-1, 1]) {
        b.box(x - w / 2 + 0.5 + k * ((w - 1) / 3), mound + h + 0.4, z + side * (d / 2 - 0.3), 0.6, 0.8, 0.6, COLORS.stoneDark);
      }
    }
    b.box(x, mound + 1.4, front + 0.03, 1.8, 2.8, 0.08, COLORS.door);
    // The relay stone: everyone's messages go through it, and Pell reads them (WORLD.md §3).
    b.glow(x, mound + h + 1.2, z, 0.6, COLORS.lampGlow);
  }
  // The garrison yard's walls along the mound's front, battlemented.
  for (const [from, to] of [[-12, x - w / 2], [x + w / 2, 22]]) {
    b.box((from + to) / 2, mound + 1.5, front - 0.4, to - from, 3, 0.8, COLORS.stone);
    for (let m = from + 0.4; m < to - 0.3; m += 1.2) b.box(m, mound + 3.3, front - 0.4, 0.6, 0.6, 0.8, COLORS.stone);
  }
  for (const wx of [-12, 22]) b.box(wx, mound + 1.5, -38, 0.8, 3, 14, COLORS.stone);
  for (const [tx, tz] of [[-8, -44], [17, -45], [-3, -47], [26, -42], [-16, -42]]) b.tree("pineTree", tx, tz, 1, false);
}

/** The town's edges: the west gate and wall, the fields past them, the quarry road east, the gardens to the south. */
function buildEdges(b: Builder): void {
  // The west gate across the road, its arch running east to west, and the town wall north and south of it.
  if (!b.piece("gatehouse", GATE.x, GATE.z, { turn: Math.PI / 2, solid: [GATE.depth, GATE.span] })) {
    for (const side of [-1, 1]) b.box(GATE.x, GATE.h / 2, side * 3.4, GATE.depth, GATE.h, 2.2, COLORS.stone);
    b.box(GATE.x, GATE.h - 1.1, 0, GATE.depth - 0.4, 2.2, 4.6, COLORS.stone);
  }
  b.box(GATE.x, 1.75, -17.25, 1, 3.5, 25.5, COLORS.stone);
  b.box(GATE.x, 1.75, 9.5, 1, 3.5, 10, COLORS.stone);

  // Past the gate: Mara's fields.
  for (let k = 0; k < 5; k++) b.piece("railFence", -41 - 1.6 - k * 3.2, -6.5);
  for (let k = 0; k < 5; k++) b.piece("railFence", -41 - 1.6 - k * 3.2, 6.5);
  b.piece("hayBales", -46, -10);
  b.piece("hayBales", -52, -12, { turn: 0.5 });
  b.piece("scarecrow", -47, 9);
  b.piece("hayStack", -43.5, 10);
  b.piece("pumpkins", -51, 8);
  b.tree("appleTree", -44, -16, 1, false);

  // East: the quarry road out between the pines and the rocks, and a signpost at the edge of town.
  b.box(38.2, 1, -3.1, 0.14, 2, 0.14, COLORS.timber);
  b.box(38.7, 1.8, -3.1, 1, 0.28, 0.06, COLORS.board);
  for (const [tx, tz] of [[41, -8], [45, -11], [47, 7], [42.5, 9], [52, -6], [50, 12]]) b.tree("pineTree", tx, tz, 1, false);
  for (const [rx, rz, rs] of [[44, -4.5, 1.4], [49, -5.5, 1], [47, 4.5, 1.2]]) {
    const rock = b.box(rx, rs / 2, rz, rs * 1.4, rs, rs, COLORS.stoneDark);
    rock.rotation.y = rx;
  }

  // Mana-lamps along the south verge, their arms out over the road.
  for (const x of [-27, -17, -7, 3, 13, 23, 33]) {
    b.block(x, 4.3, 0.3, 0.3);
    if (b.piece("lamp", x, 4, { turn: Math.PI })) continue;
    b.box(x, 1.2, 4.2, 0.1, 2.4, 0.1, COLORS.lampPost);
    b.glow(x, 2.45, 4.2, 0.14, COLORS.lampGlow);
  }
  // Benches and a trough on the south verge, facing the street.
  for (const x of [-15, 15]) b.piece("bench", x, 4.05, { turn: Math.PI, solid: [1.8, 0.5] }) ?? b.box(x, 0.25, 4.05, 1.8, 0.5, 0.5, COLORS.timber);
  b.piece("trough", -32.5, 4.05, { solid: [1.9, 0.75] }) ?? b.box(-32.5, 0.3, 4.05, 1.9, 0.6, 0.75, COLORS.timber);

  // The town's south edge: a low hedge, then the plots' kitchen gardens running down to the fields. Nothing here is
  // taller than the camera's line down to her, so it never hides her.
  b.box(1, 0.3, 5, 74, 0.6, 0.5, COLORS.hedge);
  for (const x of [-25, -7, 9, 27]) b.piece("railFence", x, 8.5, { turn: Math.PI / 2 });
  b.piece("coop", -18, 9.5, { turn: Math.PI });
  b.piece("chicken", -16.4, 7.4, { turn: 0.3 });
  b.piece("chicken", -19.8, 7.6, { turn: 2.1 });
  b.piece("chicken", -15.6, 8.6, { turn: -0.8 });
  b.piece("pumpkins", 6, 7.5);
  b.piece("pumpkins", -4, 8);
  b.piece("hayBales", -10, 10.5);
  b.piece("wheelbarrow", 12, 7.6, { turn: 1.2 });
  b.piece("scarecrow", 20, 9.5, { turn: Math.PI });
  b.piece("hayWagon", -29, 9.5, { turn: Math.PI / 2 });
  for (const [tx, tz] of [[-24, 13.5], [-2, 14], [17, 13.5], [31, 13]]) b.tree("appleTree", tx, tz, 1, false);
  for (const [tx, tz] of [[-12, 18], [26, 19], [8, 20]]) b.tree("pineTree", tx, tz, 1, false);
}

/** Tufts of grass and a few flowers off the paving, as instances so they cost one draw each. */
function addGrass(root: Object3D, rand: () => number): void {
  const tufts: Matrix4[] = [];
  const flowers: { matrix: Matrix4; color: number }[] = [];
  const up = new Vector3(0, 1, 0);
  const place = (x: number, z: number, scale: number) =>
    new Matrix4().compose(new Vector3(x, 0, z), new Quaternion().setFromAxisAngle(up, rand() * Math.PI), new Vector3(scale, scale * (0.8 + rand() * 0.6), scale));
  // Off the paving and out of the buildings (her yard and the churchyard are grass).
  const bare = [
    rect(-62, 62, -4.2, 2.8), ...OPEN.slice(1, 7), rect(-28.5, -14, -14.7, -12.1),
    rect(TAVERN_DOOR.x - 0.8, TAVERN_DOOR.x + 0.8, YARD.minZ, YARD.maxZ),
    ...Object.values(BUILDINGS).map((h) => rect(h.x - h.w / 2, h.x + h.w / 2, h.front - h.d, h.front)),
  ];
  for (let i = 0; i < 2800; i++) {
    const x = -50 + rand() * 100;
    const z = -30 + rand() * 48;
    if (bare.some((r) => x > r.minX && x < r.maxX && z > r.minZ && z < r.maxZ)) continue;
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
