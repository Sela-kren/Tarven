/**
 * What a night leaves behind, drawn in the room: dirty bowls and tipped cups on the tables, puddles of
 * ale on the floor, patches of dust with little grey clumps, and cobwebs high on the walls. The tavern
 * decides what there is; this only draws it, finds where each one is, and shrinks each away when it's cleaned.
 *
 * Positions are in game space: +X east, -Z north, Y up, floor at 0.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  LatheGeometry,
  Material,
  Mesh,
  NearestFilter,
  Object3D,
  PlaneGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { Rect } from "./collision";
import { solidRetroMaterial } from "./retro";
import { messWares, type Mess, type Ware } from "./tavern";
import type { Seat } from "./world";

/** Spacing of the places dust can settle, and how far they keep from furniture and walls. */
const DUST_GRID = 1.1;
const DUST_CLEARANCE = 0.45;
const DUST_WALL_INSET = 0.7;
/** Just above the floor, so decals don't flicker against it. */
const DECAL_Y = 0.012;
/** How long a cleaned mess takes to shrink away. */
const VANISH_SECONDS = 0.3;
/** How far a puddle lies from its seat, towards the table. */
const SPILL_REACH = 0.3;
/** A carried stack of dirty bowls: how many are drawn, how far apart, and how large. */
const STACK_SHOWN = 5;
const STACK_STEP = 0.06;
const STACK_SCALE = 1.6;

/** Cobwebs: how far off the wall they hang, and how big a web in a corner or mid-wall is. */
const WEB_OFF_WALL = 0.07;
const CORNER_WEB_RADIUS = 0.75;
const WALL_WEB_RADIUS = 0.6;
/** How thick each strand is: thick enough to read at a distance in the retro look. */
const STRAND_WIDTH = 0.026;
const STRAND_DEPTH = 0.01;
/** The rings of a web, as shares of its spokes' length. */
const WEB_RINGS = [0.28, 0.48, 0.68, 0.88];
/** Where she stands below a web to reach it: how far out from the wall, and how clear of furniture. */
const WEB_REACH = [0.75, 1.15];
const WEB_STAND_CLEARANCE = 0.35;
/** How far a corner web's standing place can be from its corner, along the wall. */
const CORNER_STAND_ALONG = [0.45, 0.9];
/**
 * Places on the walls a cobweb can hang. Only the back (north) wall and the east wall by the bar are here,
 * since those never move: bought floor can open up the west wall. `along` is x on the north wall and z on
 * the east wall. A corner web spreads along the wall away from its corner (1 towards +x or +z, -1 the other
 * way); 0 hangs both ways. Tops are low enough for the camera to see: it shows the back wall only up to
 * about 2 m. None go behind the bar: its shelves cover the wall, and there's no floor to stand on.
 */
const WEB_PLACES: readonly { wall: "north" | "east"; along: number; spread: -1 | 0 | 1; top: number }[] = [
  // Down low in the back wall's west corner, where the broom never reached.
  { wall: "north", along: -7, spread: 1, top: 0.8 },
  // Against the post between the window and the front door.
  { wall: "north", along: -3.3, spread: 1, top: 1.95 },
  // Up in the corners either side of the bedroom door's frame.
  { wall: "east", along: -0.72, spread: -1, top: 2.3 },
  { wall: "east", along: 0.72, spread: 1, top: 2.3 },
  { wall: "east", along: 2.2, spread: 0, top: 2.5 },
];

/** A cobweb high on a wall: where it hangs, which way it faces, and where she stands to brush it down. */
export interface CobwebSpot {
  /** The top of the web, against the wall. */
  anchor: Vector3;
  /** The turn about Y that faces the web into the room. */
  facing: number;
  /** A corner web spreads one way along the wall from its corner (1 or -1, along the web's own x); 0 hangs both ways. */
  spread: -1 | 0 | 1;
  /** Open floor below it, where she stands to reach it. */
  stand: Vector3;
}

const COLORS = {
  clay: 0x8a7a66,
  crust: 0x4e3018,
  crumb: 0xb48a4e,
  pewter: 0x8a8882,
  ale: 0x5a3410,
  aleWet: 0x7a4a18,
  dust: 0x8c8474,
  web: 0xd8d3c8,
  spider: 0x1e1812,
};

/** A small random number generator, so the same mess always looks the same. */
function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const distanceToRect = (x: number, z: number, r: Rect) =>
  Math.hypot(x - Math.min(Math.max(x, r.minX), r.maxX), z - Math.min(Math.max(z, r.minZ), r.maxZ));

/** Open floor in the room where dust can settle, on an even grid, away from furniture and walls. */
export function findDustSpots(colliders: readonly Rect[], room: Rect): Vector3[] {
  const spots: Vector3[] = [];
  for (let x = room.minX + DUST_WALL_INSET; x <= room.maxX - DUST_WALL_INSET; x += DUST_GRID) {
    for (let z = room.minZ + DUST_WALL_INSET; z <= room.maxZ - DUST_WALL_INSET; z += DUST_GRID) {
      if (colliders.every((r) => distanceToRect(x, z, r) >= DUST_CLEARANCE)) spots.push(new Vector3(x, 0, z));
    }
  }
  return spots;
}

/**
 * The places in the room a cobweb can hang, each with open floor below it to stand on. A place whose floor is
 * taken up by furniture is left out.
 */
export function findCobwebSpots(colliders: readonly Rect[], room: Rect): CobwebSpot[] {
  const spots: CobwebSpot[] = [];
  const clear = (x: number, z: number) =>
    x > room.minX + WEB_STAND_CLEARANCE &&
    x < room.maxX - WEB_STAND_CLEARANCE &&
    colliders.every((r) => distanceToRect(x, z, r) >= WEB_STAND_CLEARANCE);
  for (const { wall, along, spread, top } of WEB_PLACES) {
    // Where the wall's face is, the way along it (the web's own x), and the way into the room.
    const north = wall === "north";
    const face = north ? new Vector3(along, 0, room.minZ) : new Vector3(room.maxX, 0, along);
    const tangent = north ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
    const inward = north ? new Vector3(0, 0, 1) : new Vector3(-1, 0, 0);
    const anchor = face.clone().setY(top).addScaledVector(inward, WEB_OFF_WALL).addScaledVector(tangent, spread * WEB_OFF_WALL);
    let stand: Vector3 | null = null;
    for (const sideways of spread === 0 ? [0] : CORNER_STAND_ALONG) {
      for (const reach of WEB_REACH) {
        const at = face.clone().addScaledVector(inward, reach).addScaledVector(tangent, spread * sideways);
        if (!stand && clear(at.x, at.z)) stand = at;
      }
    }
    if (stand) spots.push({ anchor, facing: north ? 0 : -Math.PI / 2, spread, stand });
  }
  return spots;
}

/** A blotchy patch of dust and grit, mostly see-through, in a few flat colours to suit the retro look. */
function dustTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const random = seeded(91);
    const centre = size / 2;
    // Soft blotches that thin out towards the edge.
    for (let i = 0; i < 70; i++) {
      const angle = random() * Math.PI * 2;
      const reach = Math.sqrt(random()) * centre * 0.8;
      const x = centre + Math.cos(angle) * reach;
      const y = centre + Math.sin(angle) * reach;
      const fade = 1 - reach / centre;
      ctx.fillStyle = `rgba(${120 + random() * 30}, ${110 + random() * 25}, ${95 + random() * 20}, ${0.12 + 0.3 * fade})`;
      ctx.beginPath();
      ctx.arc(x, y, 3 + random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    // Grit: hard dark specks.
    for (let i = 0; i < 90; i++) {
      const angle = random() * Math.PI * 2;
      const reach = Math.sqrt(random()) * centre * 0.85;
      ctx.fillStyle = `rgba(60, 48, 36, ${0.35 + random() * 0.4})`;
      ctx.fillRect(Math.round(centre + Math.cos(angle) * reach), Math.round(centre + Math.sin(angle) * reach), 1, 1);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

/** A flat, lumpy puddle shape: a circle with its edge pushed in and out. */
function puddleGeometry(radius: number, random: () => number): CircleGeometry {
  const segments = 12;
  const geometry = new CircleGeometry(radius, segments);
  const position = geometry.getAttribute("position");
  const wobble = Array.from({ length: segments }, () => 0.65 + random() * 0.55);
  // Vertex 0 is the centre; the rim runs round from 1, ending on a copy of the first.
  for (let i = 1; i < position.count; i++) {
    const scale = wobble[(i - 1) % segments];
    position.setXY(i, position.getX(i) * scale, position.getY(i) * scale);
  }
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

interface Drawn {
  root: Object3D;
  /** Where the player can clean it from: one point per seat for dishes, one for anything else. */
  spots: Vector3[];
  /** Counts down once cleaned, until it's gone. */
  vanishing: number | null;
}

export class MessLayer {
  readonly group = new Group();
  private readonly drawn = new Map<number, Drawn>();

  private readonly bowl = new LatheGeometry(
    [new Vector2(0, 0), new Vector2(0.05, 0), new Vector2(0.075, 0.035), new Vector2(0.08, 0.055), new Vector2(0.074, 0.056), new Vector2(0.068, 0.038), new Vector2(0, 0.014)],
    7,
  );
  private readonly bowlCrust = new CircleGeometry(0.055, 7).rotateX(-Math.PI / 2);
  private readonly cup = new CylinderGeometry(0.04, 0.035, 0.1, 7, 1, true);
  private readonly cupBase = new CircleGeometry(0.035, 7).rotateX(Math.PI / 2);
  private readonly crumb = new BoxGeometry(0.025, 0.012, 0.018);
  private readonly dustPatch = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly clump = new IcosahedronGeometry(0.045, 0);

  private readonly materials: Record<keyof typeof COLORS, Material> = {
    clay: solidRetroMaterial("Mess_Clay", COLORS.clay),
    crust: solidRetroMaterial("Mess_Crust", COLORS.crust),
    crumb: solidRetroMaterial("Mess_Crumb", COLORS.crumb),
    pewter: solidRetroMaterial("Mess_Pewter", COLORS.pewter),
    ale: solidRetroMaterial("Mess_Ale", COLORS.ale),
    aleWet: solidRetroMaterial("Mess_AleWet", COLORS.aleWet),
    dust: solidRetroMaterial("Mess_Dust", COLORS.dust),
    web: solidRetroMaterial("Mess_Web", COLORS.web),
    spider: solidRetroMaterial("Mess_Spider", COLORS.spider),
  };
  private readonly spiderBody = new IcosahedronGeometry(0.035, 0);
  private readonly spiderHead = new IcosahedronGeometry(0.022, 0);
  private readonly dustMaterial = solidRetroMaterial("Mess_DustPatch", 0xffffff);

  constructor(
    private readonly seats: readonly Seat[],
    private readonly dustSpots: readonly Vector3[],
    private readonly cobwebSpots: readonly CobwebSpot[] = [],
  ) {
    this.group.name = "Messes";
    this.dustMaterial.map = dustTexture();
    this.dustMaterial.transparent = true;
    this.dustMaterial.depthWrite = false;
    for (const material of [this.dustMaterial, this.materials.ale, this.materials.aleWet, this.materials.crust]) {
      material.polygonOffset = true;
      material.polygonOffsetFactor = -2;
      material.polygonOffsetUnits = -2;
    }
  }

  /** The drawn mess, for outlining, or null if it isn't there. */
  root(id: number): Object3D | null {
    const drawn = this.drawn.get(id);
    return drawn && drawn.vanishing === null ? drawn.root : null;
  }

  /** Where each still-dirty mess can be cleaned from. */
  spots(id: number): readonly Vector3[] {
    return this.drawn.get(id)?.spots ?? [];
  }

  /** Draws new messes, and shrinks away the ones that have been cleaned. */
  sync(messes: readonly Mess[], dt: number): void {
    const live = new Set<number>();
    for (const mess of messes) {
      live.add(mess.id);
      const existing = this.drawn.get(mess.id);
      // Dishes grow when a later night adds seats to the same table, so redraw them.
      if (existing && existing.vanishing === null && existing.spots.length === this.spotCount(mess)) continue;
      if (existing) this.remove(existing);
      const drawn = this.draw(mess);
      this.drawn.set(mess.id, drawn);
      this.group.add(drawn.root);
    }
    for (const [id, drawn] of this.drawn) {
      if (live.has(id)) continue;
      drawn.vanishing ??= VANISH_SECONDS;
      drawn.vanishing -= dt;
      if (drawn.vanishing <= 0) {
        this.remove(drawn);
        this.drawn.delete(id);
      } else {
        drawn.root.scale.setScalar(drawn.vanishing / VANISH_SECONDS);
      }
    }
  }

  /** Takes a drawn mess out of the room, letting go of any geometry made just for it. */
  private remove(drawn: Drawn): void {
    drawn.root.removeFromParent();
    drawn.root.traverse((object) => {
      if (object instanceof Mesh && object.userData.ownGeometry) object.geometry.dispose();
    });
  }

  private spotCount(mess: Mess): number {
    return mess.kind === "dishes" ? mess.spots.length : 1;
  }

  private mesh(geometry: BufferGeometry, material: Material): Mesh {
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = false; // Only the siblings cast shadows, to keep the frame rate up.
    mesh.receiveShadow = true;
    return mesh;
  }

  private draw(mess: Mess): Drawn {
    const root = new Group();
    root.name = `Mess_${mess.kind}_${mess.id}`;
    const random = seeded(mess.id * 977 + mess.spots[0] * 31);
    const spots: Vector3[] = [];

    if (mess.kind === "dishes") {
      const wares = messWares(mess);
      const places = mess.spots.flatMap((index, i) => {
        const seat = this.seats[index];
        return seat ? [{ seat, ware: wares[i] }] : [];
      });
      // Centred on the table, so it shrinks away into the table rather than towards the room's middle.
      const middle = new Vector3();
      for (const { seat } of places) middle.add(seat.plate);
      if (places.length > 0) middle.divideScalar(places.length).setY(0);
      root.position.copy(middle);
      for (const { seat, ware } of places) {
        const place = this.dirtyPlace(seat, ware, random);
        place.position.sub(middle);
        root.add(place);
        spots.push(seat.plate.clone().setY(0));
      }
    } else if (mess.kind === "spill") {
      const seat = this.seats[mess.spots[0]];
      const at = new Vector3();
      if (seat) {
        const towardTable = seat.plate.clone().sub(seat.position).setY(0).normalize();
        at.copy(seat.position).setY(0).addScaledVector(towardTable, SPILL_REACH);
      }
      root.position.copy(at);
      root.add(this.puddle(random));
      spots.push(at);
    } else if (mess.kind === "cobweb") {
      const spot = this.cobwebSpots[mess.spots[0] % Math.max(1, this.cobwebSpots.length)];
      if (spot) {
        // Centred on its top, so it shrinks away up into the corner.
        root.position.copy(spot.anchor);
        root.rotation.y = spot.facing;
        root.add(this.cobweb(spot.spread, random));
      }
      spots.push(spot?.stand.clone() ?? new Vector3());
    } else {
      const at = this.dustSpots[mess.spots[0] % Math.max(1, this.dustSpots.length)]?.clone() ?? new Vector3();
      root.position.copy(at);
      root.add(this.dust(random));
      spots.push(at);
    }
    return { root, spots, vanishing: null };
  }

  /** A stack of dirty bowls for carrying to the tub, sitting at the origin. Drawn no higher than a few, however many it is. */
  dirtyStack(count: number): Object3D {
    const stack = new Group();
    for (let i = 0; i < Math.min(count, STACK_SHOWN); i++) {
      const bowl = this.mesh(this.bowl, this.materials.clay);
      bowl.castShadow = false;
      bowl.position.y = i * STACK_STEP;
      bowl.scale.setScalar(STACK_SCALE);
      stack.add(bowl);
    }
    return stack;
  }

  /** What one guest left on the table: a cup, sometimes tipped, or a bowl scraped not quite clean, with crumbs. */
  private dirtyPlace(seat: Seat, ware: Ware, random: () => number): Object3D {
    const place = new Group();
    place.position.copy(seat.plate);
    place.rotation.y = seat.heading;

    if (ware === "dish") {
      const bowl = this.mesh(this.bowl, this.materials.clay);
      bowl.position.set((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.06);
      const crust = this.mesh(this.bowlCrust, this.materials.crust);
      crust.position.y = 0.02;
      crust.scale.setScalar(0.6 + random() * 0.4);
      bowl.add(crust);
      place.add(bowl);

      for (let i = 0; i < 3 + Math.floor(random() * 3); i++) {
        const crumb = this.mesh(this.crumb, this.materials.crumb);
        crumb.position.set((random() - 0.5) * 0.3, 0.006, (random() - 0.5) * 0.22);
        crumb.rotation.y = random() * Math.PI;
        place.add(crumb);
      }
      return place;
    }

    const cup = new Group();
    cup.add(this.mesh(this.cup, this.materials.pewter));
    const base = this.mesh(this.cupBase, this.materials.pewter);
    base.position.y = -0.05;
    cup.add(base);
    if (random() < 0.5) {
      // Knocked over, lying on its side with a little ale run out of it.
      cup.rotation.z = Math.PI / 2;
      cup.position.set(0.13, 0.04, -0.04);
      const drip = this.mesh(puddleGeometry(0.07, random), this.materials.ale);
      drip.position.set(0.2, 0.002, -0.04);
      place.add(drip);
    } else {
      cup.position.set(0.13, 0.05, -0.06);
    }
    cup.rotation.y = random() * Math.PI;
    place.add(cup);
    return place;
  }

  /** A puddle of ale with a wetter middle, and the cup that spilt it. */
  private puddle(random: () => number): Object3D {
    const puddle = new Group();
    puddle.add(this.mesh(puddleGeometry(0.32 + random() * 0.12, random), this.materials.ale));
    const wet = this.mesh(puddleGeometry(0.16, random), this.materials.aleWet);
    wet.position.set((random() - 0.5) * 0.1, 0.002, (random() - 0.5) * 0.1);
    puddle.add(wet);
    // Overlapping splashes round the edge.
    for (let i = 0; i < 3; i++) {
      const angle = random() * Math.PI * 2;
      const splash = this.mesh(puddleGeometry(0.06 + random() * 0.05, random), this.materials.ale);
      splash.position.set(Math.cos(angle) * 0.38, 0, Math.sin(angle) * 0.38);
      puddle.add(splash);
    }
    const cup = new Group();
    cup.add(this.mesh(this.cup, this.materials.pewter));
    const base = this.mesh(this.cupBase, this.materials.pewter);
    base.position.y = -0.05;
    cup.add(base);
    cup.rotation.set(0, random() * Math.PI * 2, Math.PI / 2, "YXZ");
    cup.position.set(0.22, 0.04, 0.1);
    puddle.add(cup);
    puddle.position.y = DECAL_Y;
    return puddle;
  }

  /**
   * A cobweb flat against the wall, hanging down from its top at the origin: spokes fanning out, sagging rings
   * strung between them with a few torn through, and a loose strand or two. A corner web fans a quarter turn
   * along the wall (`spread` 1 east, -1 west) and down the corner; one mid-wall hangs a half turn both ways.
   * Built from thin strands merged into one mesh, so its outline follows the threads.
   */
  private cobweb(spread: -1 | 0 | 1, random: () => number): Object3D {
    const web = new Group();
    const corner = spread !== 0;
    const radius = corner ? CORNER_WEB_RADIUS : WALL_WEB_RADIUS;
    const spokes = corner ? 5 : 7;
    // Angles in the wall's plane, x along the wall and y up: 0 runs along the top, -PI/2 straight down.
    const span = corner ? Math.PI / 2 : Math.PI;
    const side = corner ? spread : 1;
    const ends = Array.from({ length: spokes }, (_, i) => {
      const inner = i > 0 && i < spokes - 1;
      const angle = -span * (i / (spokes - 1)) + (inner ? (random() - 0.5) * 0.16 : 0);
      const length = radius * (inner ? 0.85 + random() * 0.15 : 1);
      return new Vector2(Math.cos(angle) * length * side, Math.sin(angle) * length);
    });

    const strands: [Vector2, Vector2][] = ends.map((end) => [new Vector2(), end]);
    for (const ring of WEB_RINGS) {
      for (let i = 0; i + 1 < spokes; i++) {
        // A few threads have torn, more often towards the edge.
        if (random() < 0.06 + ring * 0.1) continue;
        const a = ends[i].clone().multiplyScalar(ring);
        const b = ends[i + 1].clone().multiplyScalar(ring);
        const sag = a.clone().add(b).multiplyScalar(0.5 * 0.9);
        strands.push([a, sag], [sag, b]);
      }
    }
    // Loose strands hanging from the outer ring.
    for (let i = 0; i < 1 + Math.floor(random() * 2); i++) {
      const from = ends[1 + Math.floor(random() * (spokes - 2))].clone().multiplyScalar(WEB_RINGS[WEB_RINGS.length - 1]);
      strands.push([from, from.clone().add(new Vector2((random() - 0.5) * 0.06, -(0.15 + random() * 0.2)))]);
    }

    const pieces: BufferGeometry[] = strands.map(([a, b]) => {
      const length = a.distanceTo(b);
      return new BoxGeometry(length + STRAND_WIDTH, STRAND_WIDTH, STRAND_DEPTH)
        .rotateZ(Math.atan2(b.y - a.y, b.x - a.x))
        .translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
    });
    const merged = mergeGeometries(pieces);
    for (const piece of pieces) piece.dispose();
    if (merged) {
      const strandsMesh = this.mesh(merged, this.materials.web);
      // Every web has its own threads, so they're let go when it's brushed down.
      strandsMesh.userData.ownGeometry = true;
      web.add(strandsMesh);
    }

    // Now and then the spider is still at home.
    if (random() < 0.5) {
      const at = ends[1 + Math.floor(random() * (spokes - 2))].clone().multiplyScalar(WEB_RINGS[1 + Math.floor(random() * 2)]);
      const body = this.mesh(this.spiderBody, this.materials.spider);
      body.position.set(at.x, at.y, STRAND_DEPTH * 2);
      body.scale.set(1, 1.2, 0.7);
      const head = this.mesh(this.spiderHead, this.materials.spider);
      head.position.set(at.x, at.y + 0.045, STRAND_DEPTH * 2);
      web.add(body, head);
    }
    return web;
  }

  /** A patch of dust and grit, with a few grey clumps rolled up in it. */
  private dust(random: () => number): Object3D {
    const dust = new Group();
    const patch = this.mesh(this.dustPatch, this.dustMaterial);
    patch.scale.set(1 + random() * 0.4, 1, 0.8 + random() * 0.4);
    patch.rotation.y = random() * Math.PI;
    patch.position.y = DECAL_Y;
    dust.add(patch);
    for (let i = 0; i < 2 + Math.floor(random() * 3); i++) {
      const clump = this.mesh(this.clump, this.materials.dust);
      clump.position.set((random() - 0.5) * 0.6, 0.02, (random() - 0.5) * 0.5);
      clump.scale.set(0.7 + random() * 0.8, 0.5, 0.7 + random() * 0.8);
      clump.rotation.y = random() * Math.PI;
      dust.add(clump);
    }
    return dust;
  }
}
