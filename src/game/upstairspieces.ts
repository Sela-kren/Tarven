/**
 * The furniture of the tavern's upper floor and of the stair hall that climbs to it, one builder per piece.
 * Each piece is built at the origin, standing on y = 0 and facing the camera (+Z, south), in real metres, as a
 * named group the floor plan places (upstairs.ts). They use the room's own materials, so they match the bedroom.
 *
 * Two pieces don't stand on the floor: the stair well reaches down below it, and the door lamp hangs on a wall.
 * UPSTAIRS_PIECES gives each piece's measured box (min corner and size) so the plan can place it exactly.
 */
import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Material,
  MeshStandardMaterial,
  Object3D,
  Shape,
  Vector2,
  Vector3,
  type BufferGeometry,
} from "three";
import { box, candle, flat, Piece } from "./furnishings";

type Materials = (name: string) => Material;

/** How high the stairs climb, and how far north they run doing it. */
export const STAIRS_RISE = 3.2;
export const STAIRS_RUN = 4.0;
/** Steps in the flight; the last one is level with the floor above. */
export const STAIRS_STEPS = 16;
export const STAIRS_WIDTH = 1.0;
const RISER = STAIRS_RISE / STAIRS_STEPS;
const GOING = STAIRS_RUN / STAIRS_STEPS;
/** The foot of the stairs is at +Z (south), the top at -Z. */
const FOOT_Z = STAIRS_RUN / 2;

/** The height of the tread she stands on at this distance along the stairs (local Z): 0 at the foot, the full rise at the top. */
export function stairsHeightAt(localZ: number): number {
  const steps = Math.ceil((FOOT_Z - localZ) / GOING - 1e-6);
  return Math.min(STAIRS_STEPS, Math.max(0, steps)) * RISER;
}

// Plain colours made once, so every bed shares one material and the room still merges into few meshes.
const made = new Map<string, MeshStandardMaterial>();
function own(name: string, color: number): MeshStandardMaterial {
  let material = made.get(name);
  if (!material) {
    material = flat(name, color);
    made.set(name, material);
  }
  return material;
}

/** A room material other furnishings make for themselves (linen, straw, copper...), or a match for it if they haven't yet. */
function soft(m: Materials, name: string, color: number): Material {
  try {
    return m(name);
  } catch {
    return own(name, color);
  }
}

/** A shape turned round the upright axis, from (radius, height) pairs listed bottom to top. */
function turned(profile: [number, number][], sides: number): LatheGeometry {
  return new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), sides);
}

/** Stretches a shape's texture coordinates, so a texture wrapped round a curve keeps its scale. */
function scaleUv(geometry: BufferGeometry, u: number, v: number): BufferGeometry {
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * u, uv.getY(i) * v);
  return geometry;
}

/** A flat outline in the side view (pairs of Z, Y) given thickness from x0 to x1: stringers, rails, braces. */
function prism(outline: [number, number][], x0: number, x1: number): BufferGeometry {
  const shape = new Shape(outline.map(([z, y]) => new Vector2(-z, y)));
  return new ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false }).rotateY(Math.PI / 2).translate(x0, 0, 0);
}

/** A band of the given upright height running along a slope y = y0 + slope * (from - z), cut off at the floor and at a ceiling. */
function slopedBand(from: number, to: number, y0: number, slope: number, depth: number, floor: number, ceiling: number): [number, number][] {
  const top = (z: number) => y0 + slope * (from - z);
  const zAt = (y: number) => from - (y - y0) / slope;
  const points: [number, number][] = [];
  // Up the top edge, from the foot to the far end, levelled off at the ceiling.
  const zTopCut = Math.max(to, zAt(ceiling));
  points.push([from, Math.max(floor, top(from) - depth)], [from, top(from)], [zTopCut, Math.min(ceiling, top(zTopCut))]);
  if (zTopCut > to) points.push([to, ceiling]);
  // Back down the bottom edge, levelled off at the floor.
  points.push([to, top(to) - depth]);
  const zBottomCut = zAt(floor + depth);
  if (zBottomCut < from) points.push([zBottomCut, floor]);
  if (points[0][1] > floor) points.push([from, floor]);
  return points;
}

/* ------------------------------------------------------------------------------------------------ stairs */

/** A straight timber staircase climbing north, open on the west side with a handrail, the space under it boarded in. */
export function buildStairsUp(m: Materials): Object3D {
  const wood = m("T_wood");
  const boards = m("T_crate");
  const iron = m("T_iron");
  const half = STAIRS_WIDTH / 2;
  const stringer = 0.06;
  const piece = new Piece("Stairs_Up");

  for (let i = 0; i < STAIRS_STEPS; i++) {
    const top = (i + 1) * RISER;
    const front = FOOT_Z - i * GOING;
    const back = front - GOING;
    // The boarded column under each tread; its south face is the riser, set back under the tread's nosing.
    piece.add(box([-half + 0.01, 0, back], [half - 0.01, top - 0.04, front - 0.03], { tile: 0.9, swap: true }), boards);
    piece.add(box([-half + stringer, top - 0.04, back], [half - stringer, top, front], { tile: 0.8 }), wood);
  }

  // Stringers both sides, their top edge just over the nosings, cut level at the floor and at the floor above.
  const slope = RISER / GOING;
  const band = slopedBand(FOOT_Z, -FOOT_Z, RISER + 0.05, slope, 0.38, 0, STAIRS_RISE);
  piece.add(prism(band, -half, -half + stringer), wood);
  piece.add(prism(band, half - stringer, half), wood);

  // A low cupboard door in the boarding under the high end.
  piece
    .add(box([-half, 0.03, -0.95], [-half + 0.015, 1.45, -0.27], { tile: 0.9, swap: true }), wood)
    .add(box([-half - 0.01, 0.3, -0.92], [-half, 0.36, -0.5]), iron)
    .add(box([-half - 0.01, 1.1, -0.92], [-half, 1.16, -0.5]), iron)
    .add(box([-half - 0.03, 0.7, -0.4], [-half, 0.78, -0.35]), iron);

  // The handrail on the open west side, on newel posts at the foot and the top, with a baluster on every tread.
  const railX: [number, number] = [-half, -half + stringer];
  const nosing = (z: number) => RISER + slope * (FOOT_Z - z);
  const railHeight = 0.86;
  const [footPost, topPost] = [FOOT_Z - 0.1, -FOOT_Z + 0.1];
  piece.add(
    prism(
      [
        [footPost, nosing(footPost) + railHeight - 0.035],
        [footPost, nosing(footPost) + railHeight + 0.035],
        [topPost, nosing(topPost) + railHeight + 0.035],
        [topPost, nosing(topPost) + railHeight - 0.035],
      ],
      railX[0] - 0.005,
      railX[1] + 0.005,
    ),
    wood,
  );
  for (const [z, base] of [[footPost, 0], [topPost, STAIRS_RISE - 0.3]]) {
    const capY = nosing(z) + railHeight + 0.12;
    piece
      .add(box([-half, base, z - 0.045], [-half + 0.08, capY, z + 0.045], { swap: true }), wood)
      .add(box([-half - 0.005, capY, z - 0.05], [-half + 0.085, capY + 0.04, z + 0.05]), wood);
  }
  for (let i = 1; i < STAIRS_STEPS - 1; i++) {
    const z = FOOT_Z - (i + 0.5) * GOING;
    const foot = nosing(z) + 0.05 - 0.04;
    piece.add(box([-half + 0.012, foot, z - 0.018], [-half + 0.048, nosing(z) + railHeight - 0.03, z + 0.018]), wood);
  }
  return piece.group;
}

/** The top of the stairs as seen from the floor above: an opening, the top treads going down south into the dark, a banister round it. */
export function buildStairWell(m: Materials): Object3D {
  const wood = m("T_wood");
  const boards = m("T_crate");
  const floor = m("T_floor");
  const shadow = own("T_well_shadow", 0x2b1d14);
  const deep = own("T_well_tread", 0x3a2818);
  const dark = own("T_void", 0x0c0806);
  const half = STAIRS_WIDTH / 2;
  const [outer, north, south] = [half + 0.1, -FOOT_Z - 0.1, FOOT_Z + 0.1];
  // The opening runs from the nosing of the last tread (which is level with this floor) to the south end of the flight.
  const lip = -FOOT_Z + GOING;
  const bottom = -1.85;
  const piece = new Piece("Stair_Well");

  // Floorboards round the opening, filling the well's footprint, with the top tread's nosing trim at the lip.
  piece
    .add(box([-outer, -0.2, north], [outer, 0, lip], { tile: 0.5 }), floor)
    .add(box([-outer, -0.2, FOOT_Z], [outer, 0, south], { tile: 0.5 }), floor)
    .add(box([-outer, -0.2, lip], [-half, 0, FOOT_Z], { tile: 0.5 }), floor)
    .add(box([half, -0.2, lip], [outer, 0, FOOT_Z], { tile: 0.5 }), floor)
    .add(box([-half, -0.06, lip - 0.06], [half, 0.01, lip + 0.02]), wood);
  // The sides of the well, fading into the dark, and the dark it goes down into.
  piece
    .add(box([-outer, bottom, lip], [-half, -0.2, FOOT_Z], { tile: 0.9, swap: true }), shadow)
    .add(box([half, bottom, lip], [outer, -0.2, FOOT_Z], { tile: 0.9, swap: true }), shadow)
    .add(box([-half, bottom, FOOT_Z], [half, -0.2, south]), shadow)
    .add(box([-half, bottom - 0.05, lip], [half, bottom, FOOT_Z]), dark);
  // The treads going down, the first four in plain wood and the next four darkening into the well.
  for (let k = 1; k <= 8; k++) {
    const top = -k * RISER;
    const back = lip + (k - 1) * GOING;
    const front = back + GOING;
    const lit = k <= 4;
    piece
      .add(box([-half, bottom, back], [half, top - 0.04, front - 0.03], { tile: 0.9, swap: true }), lit ? boards : shadow)
      .add(box([-half, top - 0.04, back], [half, top, front], { tile: 0.8 }), lit ? wood : deep);
  }

  // A banister along the open west side and across the south end; she steps on at the north end.
  const post = (x: number, z: number) => box([x - 0.045, 0, z - 0.045], [x + 0.045, 1.0, z + 0.045], { swap: true });
  const [railX, railZ] = [-half - 0.05, FOOT_Z + 0.05];
  piece
    .add(post(railX, lip - 0.08), wood)
    .add(post(railX, railZ), wood)
    .add(post(half + 0.05, railZ), wood)
    .add(box([railX - 0.035, 0.9, lip - 0.08], [railX + 0.035, 0.96, railZ]), wood)
    .add(box([railX, 0.9, railZ - 0.035], [half + 0.05, 0.96, railZ + 0.035]), wood)
    .add(box([railX - 0.03, 0, lip - 0.08], [railX + 0.03, 0.06, railZ]), wood)
    .add(box([railX, 0, railZ - 0.03], [half + 0.05, 0.06, railZ + 0.03]), wood);
  for (let z = lip + 0.25; z < railZ - 0.15; z += 0.32) {
    piece.add(box([railX - 0.018, 0.06, z - 0.018], [railX + 0.018, 0.9, z + 0.018]), wood);
  }
  for (const x of [-0.25, 0, 0.25]) {
    piece.add(box([x - 0.018, 0.06, railZ - 0.018], [x + 0.018, 0.9, railZ + 0.018]), wood);
  }
  return piece.group;
}

/* ------------------------------------------------------------------------------------------------ beds */

/** A plain single bed for a rented room, head to the north: a straw-tick mattress, a brown wool blanket and a pillow. */
export function buildBedPlain(m: Materials): Object3D {
  const wood = m("T_wood");
  const linen = soft(m, "T_linen_bed", 0xd9cfb6);
  const tick = own("T_tick", 0xc4b088);
  const blanket = own("T_wool_plain", 0x6b5c47);
  const straw = soft(m, "T_straw", 0xb39a5e);
  const bed = new Piece("Bed_Plain", true)
    .add(box([-0.5, 0, -1.0], [0.5, 0.92, -0.92], { tile: 0.8 }), wood)
    .add(box([-0.5, 0, 0.92], [0.5, 0.55, 1.0], { tile: 0.8 }), wood)
    .add(box([-0.46, 0.1, -0.92], [0.46, 0.32, 0.92], { tile: 0.8 }), wood)
    .add(box([-0.44, 0.32, -0.92], [0.44, 0.47, 0.9]), tick)
    .add(box([-0.3, 0.47, -0.88], [0.3, 0.57, -0.58]), linen)
    .add(box([-0.48, 0.28, -0.3], [0.48, 0.52, 0.9]), blanket)
    .add(box([-0.48, 0.52, -0.34], [0.48, 0.54, -0.2]), blanket);
  // A few wisps of straw poking out of the tick at the foot.
  for (const [x, z, turn] of [[0.36, 0.86, 0.4], [0.4, 0.84, -0.3], [-0.38, 0.87, 0.2]]) {
    bed.add(box([-0.006, -0.05, -0.004], [0.006, 0.05, 0.004]).rotateZ(turn).translate(x, 0.42, z), straw);
  }
  return bed.group;
}

/** The Lantern's bed: wide, under a red cover with cushions, and a low canopy with its curtains gathered at the posts. */
export function buildBedLantern(m: Materials): Object3D {
  const wood = m("T_wood");
  const linen = soft(m, "T_linen_bed", 0xd9cfb6);
  const curtain = soft(m, "T_curtain", 0x6a2a24);
  const red = own("T_lantern_red", 0x8e1c26);
  const gold = own("T_cushion_gold", 0xc8962e);
  const plum = own("T_cushion_plum", 0x5a2446);
  const brass = soft(m, "T_brass", 0xc29235);
  const [hx, hz, top] = [0.7, 1.0, 1.84];
  const bed = new Piece("Bed_Lantern", true);

  // Four posts carrying the canopy frame, a carved-high headboard and a low footboard.
  for (const x of [-hx, hx - 0.08]) {
    for (const z of [-hz, hz - 0.08]) bed.add(box([x, 0, z], [x + 0.08, top, z + 0.08], { swap: true }), wood);
  }
  bed
    .add(box([-hx + 0.08, 0.2, -hz + 0.01], [hx - 0.08, 1.1, -hz + 0.07], { tile: 0.8 }), wood)
    .add(box([-0.3, 1.1, -hz + 0.01], [0.3, 1.22, -hz + 0.07], { tile: 0.8 }), wood)
    .add(box([-hx + 0.08, 0.2, hz - 0.07], [hx - 0.08, 0.55, hz - 0.01], { tile: 0.8 }), wood)
    .add(box([-hx + 0.04, 0.15, -hz + 0.08], [hx - 0.04, 0.38, hz - 0.08], { tile: 0.8 }), wood)
    .add(box([-hx + 0.06, 0.38, -hz + 0.08], [hx - 0.06, 0.56, hz - 0.1]), linen);
  // The red cover over the lower two thirds, turned back at the top, hanging over the sides.
  bed
    .add(box([-hx - 0.02, 0.33, -0.35], [hx + 0.02, 0.6, hz - 0.08]), red)
    .add(box([-hx - 0.02, 0.6, -0.42], [hx + 0.02, 0.63, -0.28]), red);
  // Pillows against the headboard and cushions leaning on them.
  bed
    .add(box([-0.6, 0.56, -0.9], [-0.06, 0.68, -0.6]), linen)
    .add(box([0.06, 0.56, -0.9], [0.6, 0.68, -0.6]), linen);
  const cushion = (x: number, turn: number, material: Material) =>
    bed.add(box([-0.17, -0.12, -0.06], [0.17, 0.12, 0.06]).rotateX(-0.45).rotateY(turn).translate(x, 0.74, -0.62), material);
  cushion(-0.36, 0.12, red);
  cushion(0, 0, gold);
  cushion(0.36, -0.12, plum);

  // The canopy: a rail round the top with a short valance, and the curtains gathered and tied at each post.
  bed
    .add(box([-hx, top - 0.06, -hz], [hx, top, -hz + 0.08]), wood)
    .add(box([-hx, top - 0.06, hz - 0.08], [hx, top, hz]), wood)
    .add(box([-hx, top - 0.06, -hz], [-hx + 0.08, top, hz]), wood)
    .add(box([hx - 0.08, top - 0.06, -hz], [hx, top, hz]), wood);
  bed
    .add(box([-hx, top - 0.2, hz - 0.005], [hx, top - 0.04, hz + 0.015]), curtain)
    .add(box([-hx - 0.015, top - 0.2, -hz], [-hx + 0.005, top - 0.04, hz]), curtain)
    .add(box([hx - 0.005, top - 0.2, -hz], [hx + 0.015, top - 0.04, hz]), curtain);
  const drape = turned([[0, 0], [0.05, 0], [0.07, 0.3], [0.04, 0.68], [0.065, 0.9], [0.05, 1.32], [0, 1.32]], 6);
  for (const x of [-hx, hx]) {
    for (const z of [-hz + 0.15, hz - 0.17]) {
      bed
        .add(drape.clone().translate(x, top - 0.2 - 1.32, z), curtain)
        .add(new CylinderGeometry(0.045, 0.045, 0.04, 6).translate(x, top - 0.2 - 1.32 + 0.68, z), brass);
    }
  }
  return bed.group;
}

/* ------------------------------------------------------------------------------------------------ small furniture */

/** A small washstand: a basin of water, a copper jug, a folded towel on the shelf underneath. */
export function buildWashstand(m: Materials): Object3D {
  const wood = m("T_wood");
  const top = soft(m, "T_tabletop", 0x8a5a32);
  const stand = new Piece("Washstand", true)
    .add(box([-0.3, 0.76, -0.225], [0.3, 0.8, 0.225], { tile: 0.8 }), top)
    .add(box([-0.3, 0.8, -0.225], [0.3, 0.94, -0.2], { tile: 0.8 }), wood)
    .add(box([-0.27, 0.16, -0.2], [0.27, 0.2, 0.2], { tile: 0.8 }), wood);
  for (const x of [-0.28, 0.23]) {
    for (const z of [-0.205, 0.155]) stand.add(box([x, 0, z], [x + 0.05, 0.76, z + 0.05], { swap: true }), wood);
  }
  stand
    .add(turned([[0.07, 0], [0.13, 0.04], [0.16, 0.09], [0.145, 0.09], [0.11, 0.045], [0, 0.03]], 10).translate(-0.07, 0.8, 0.02), soft(m, "T_basin", 0xd8d2c0))
    .add(new CylinderGeometry(0.135, 0.135, 0.01, 10).translate(-0.07, 0.86, 0.02), soft(m, "T_washwater", 0x7f9aa0))
    .add(turned([[0.06, 0], [0.075, 0.08], [0.05, 0.18], [0.04, 0.22], [0.055, 0.26], [0, 0.26]], 8).translate(0.19, 0.8, -0.06), soft(m, "T_copper", 0xa8603a))
    .add(box([0.13, 0.8, 0.1], [0.22, 0.83, 0.17]), own("T_soap", 0xe9dcae))
    .add(box([-0.2, 0.2, -0.13], [0.12, 0.25, 0.14]), soft(m, "T_linen_bed", 0xd9cfb6))
    .add(box([-0.19, 0.25, -0.12], [0.11, 0.3, 0.13]), soft(m, "T_towel_blue", 0x5d7590));
  return stand.group;
}

/** A small bedside stand with a drawer and a candle in a dish (which makes its own light anchor). */
export function buildNightstand(m: Materials): Object3D {
  const stand = new Piece("Nightstand", true)
    .add(box([-0.21, 0, -0.2], [0.21, 0.55, 0.2], { tile: 0.9 }), m("T_crate"))
    .add(box([-0.225, 0.55, -0.215], [0.225, 0.6, 0.215]), soft(m, "T_tabletop", 0x8a5a32))
    .add(box([-0.17, 0.36, 0.2], [0.17, 0.5, 0.215]), m("T_wood"))
    .add(box([-0.025, 0.41, 0.215], [0.025, 0.45, 0.24]), m("T_iron"));
  candle(stand.group, "Candle_Nightstand", new Vector3(0.05, 0.6, -0.03), m);
  return stand.group;
}

/** A plank chest with iron bands and a hasp, for the foot of a bed. */
export function buildChest(m: Materials): Object3D {
  const iron = m("T_iron");
  const chest = new Piece("Chest", true)
    .add(box([-0.42, 0, -0.23], [0.42, 0.46, 0.23], { tile: 0.9 }), m("T_crate"))
    .add(box([-0.45, 0.46, -0.25], [0.45, 0.53, 0.25]), m("T_wood"));
  for (const x of [-0.27, 0.27]) chest.add(box([x - 0.03, 0, -0.255], [x + 0.03, 0.54, 0.255]), iron);
  chest
    .add(box([-0.04, 0.3, 0.23], [0.04, 0.5, 0.255]), iron)
    .add(box([-0.455, 0.3, -0.08], [-0.42, 0.34, 0.08]), iron)
    .add(box([0.42, 0.3, -0.08], [0.455, 0.34, 0.08]), iron);
  return chest.group;
}

const SACK: [number, number][] = [
  [0.2, 0], [0.25, 0.12], [0.26, 0.32], [0.22, 0.48], [0.12, 0.56], [0.06, 0.6], [0.08, 0.66], [0.03, 0.7], [0, 0.7],
];

/** One crate centred on the origin, standing on y = 0: plank sides, corner battens and a band round the middle. */
function crateParts(w: number, d: number, h: number): BufferGeometry[][] {
  const [x, z] = [w / 2, d / 2];
  const body = [box([-x + 0.01, 0, -z + 0.01], [x - 0.01, h, z - 0.01], { tile: 1.2 })];
  const battens: BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const [cx, cz] = [sx * (x - 0.025), sz * (z - 0.025)];
      battens.push(box([cx - 0.025, 0, cz - 0.025], [cx + 0.025, h, cz + 0.025], { swap: true }));
    }
  }
  battens.push(box([-x + 0.005, h - 0.05, -z + 0.005], [x - 0.005, h, z - 0.005]));
  battens.push(box([-x + 0.005, h / 2 - 0.03, -z + 0.005], [x - 0.005, h / 2 + 0.03, z - 0.005]));
  return [body, battens];
}

/** Stacked crates and a couple of sacks: the Lantern's room before it's furnished. */
export function buildCrates(m: Materials): Object3D {
  const [planks, wood] = [m("T_crate"), m("T_wood")];
  const burlap = soft(m, "T_burlap", 0xa88a5c);
  const twine = soft(m, "T_twine", 0x5e4a2e);
  const pile = new Piece("Crates", true);
  const place = (w: number, d: number, h: number, x: number, y: number, z: number, turn = 0) => {
    const [body, battens] = crateParts(w, d, h);
    for (const g of body) pile.add(g.rotateY(turn).translate(x, y, z), planks);
    for (const g of battens) pile.add(g.rotateY(turn).translate(x, y, z), wood);
  };
  place(0.66, 0.56, 0.58, -0.36, 0, -0.2);
  place(0.48, 0.42, 0.42, -0.34, 0.58, -0.2, 0.18);
  place(0.52, 0.5, 0.48, 0.38, 0, -0.22, -0.08);
  for (const [x, z, height] of [[-0.06, 0.3, 0.9], [0.4, 0.3, 0.72]]) {
    pile
      .add(scaleUv(turned(SACK, 8), 2, 1).scale(0.8, height, 0.8).translate(x, 0, z), burlap)
      .add(new CylinderGeometry(0.06, 0.06, 0.03, 6).translate(x, 0.6 * height, z), twine);
  }
  return pile.group;
}

/* ------------------------------------------------------------------------------------------------ doors */

/** The leaf of an interior plank door, built round its hinge: it runs from x = 0 to 0.9 along z = 0, so turning it swings it. */
export function buildDoorPlain(m: Materials): Object3D {
  const iron = m("T_iron");
  const seam = own("T_plank_seam", 0x2e1d10);
  const [width, height] = [0.9, 2.1];
  const door = new Piece("Door_Plain")
    .add(box([0.01, 0.01, -0.025], [width - 0.01, height - 0.02, 0.025], { tile: 0.9, swap: true }), m("T_wood"));
  for (const x of [0.3, 0.6]) door.add(box([x - 0.004, 0.03, 0.025], [x + 0.004, height - 0.04, 0.028]), seam);
  // Ledges across the back, strap hinges on the front, a latch and handle each side.
  for (const y of [0.38, 1.68]) {
    door
      .add(box([0.06, y - 0.06, -0.045], [width - 0.06, y + 0.06, -0.025], { tile: 0.9 }), m("T_wood"))
      .add(box([0, y - 0.03, 0.025], [0.6, y + 0.03, 0.035]), iron)
      .add(new CylinderGeometry(0.018, 0.018, 0.14, 6).translate(0, y, 0), iron);
  }
  door
    .add(box([0.76, 0.95, 0.025], [0.82, 1.13, 0.035]), iron)
    .add(box([0.775, 0.98, 0.035], [0.805, 1.07, 0.07]), iron)
    .add(box([0.775, 0.98, -0.07], [0.805, 1.07, -0.045]), iron);
  return door.group;
}

/** Jambs and a lintel for a 0.9 m doorway through a 0.2 m wall, centred on the opening. The door hinges at x = -0.45. */
export function buildDoorFrame(m: Materials): Object3D {
  const wood = m("T_wood");
  const [half, side, height, z] = [0.45, 0.1, 2.1, 0.12];
  return new Piece("Door_Frame")
    .add(box([-half - side, 0, -z], [-half, height, z], { swap: true }), wood)
    .add(box([half, 0, -z], [half + side, height, z], { swap: true }), wood)
    .add(box([-half - side, height, -z], [half + side, height + 0.15, z]), wood).group;
}

/* ------------------------------------------------------------------------------------------------ the door lamp */

/**
 * A small red lantern hung out from the wall on an iron bracket, lit while a Lantern booking is upstairs. Its origin
 * is on the floor at the face of the wall (z = 0); the bracket stands out south from there, the lamp about 2 m up.
 * Starts unlit; setDoorLampLit switches it.
 */
export function buildDoorLamp(m: Materials): Object3D {
  const iron = m("T_iron");
  const [z, y] = [0.3, 1.78];
  const lamp = new Piece("Door_Lamp");

  // The wall plate, the arm out from it with a brace underneath, and the hook the lantern hangs from.
  lamp
    .add(box([-0.05, 1.95, 0], [0.05, 2.27, 0.02]), iron)
    .add(box([-0.015, 2.18, 0.02], [0.015, 2.21, 0.37]), iron)
    .add(prism([[0.02, 1.98], [0.02, 2.03], [0.27, 2.18], [0.22, 2.18]], -0.012, 0.012), iron)
    .add(new ConeGeometry(0.018, 0.05, 4).rotateX(Math.PI).translate(0, 2.17, 0.37), iron)
    .add(new CylinderGeometry(0.008, 0.008, 0.08, 4).translate(0, 2.14, z), iron);
  // The lantern: a pointed cap with a ring, top and bottom plates, corner posts and the red glass between them.
  lamp
    .add(new CylinderGeometry(0.02, 0.02, 0.015, 6).translate(0, 2.1, z), iron)
    .add(new ConeGeometry(0.115, 0.08, 4).rotateY(Math.PI / 4).translate(0, y + 0.29, z), iron)
    .add(box([-0.08, y + 0.21, z - 0.08], [0.08, y + 0.25, z + 0.08]), iron)
    .add(box([-0.08, y, z - 0.08], [0.08, y + 0.03, z + 0.08]), iron)
    .add(new ConeGeometry(0.045, 0.05, 4).rotateY(Math.PI / 4).rotateX(Math.PI).translate(0, y - 0.025, z), iron);
  for (const dx of [-0.07, 0.07]) {
    for (const dz of [-0.07, 0.07]) lamp.add(box([dx - 0.0085, y + 0.03, z + dz - 0.0085], [dx + 0.0085, y + 0.21, z + dz + 0.0085]), iron);
  }
  const glass = (material: Material, lit: boolean) => {
    lamp.add(box([-0.066, y + 0.03, z - 0.066], [0.066, y + 0.21, z + 0.066]), material);
    lamp.group.children[lamp.group.children.length - 1].userData.lampLit = lit;
  };
  glass(own("T_lamp_glass", 0x4a1416), false);
  glass(lampGlow(), true);
  // The candle inside and its flame, which only burns while the lamp is lit.
  lamp.add(new CylinderGeometry(0.022, 0.022, 0.07, 5).translate(0, y + 0.065, z), m("T_wax"));
  lamp.add(new ConeGeometry(0.02, 0.07, 4).translate(0, y + 0.135, z), m("T_flame"));
  lamp.group.children[lamp.group.children.length - 1].userData.lampLit = true;

  const light = new Object3D();
  light.name = "Light_Door_Lamp";
  light.position.set(0, y + 0.12, z);
  light.userData.light = "lantern";
  lamp.group.add(light);

  setDoorLampLit(lamp.group, false);
  return lamp.group;
}

let glow: MeshStandardMaterial | null = null;
/** Red glass with the candle behind it: glows on its own, and lets a little of the flame show through. */
function lampGlow(): MeshStandardMaterial {
  glow ??= new MeshStandardMaterial({
    name: "T_lamp_glow",
    color: 0xff5a48,
    emissive: 0xd8201a,
    emissiveIntensity: 1.6,
    roughness: 0.6,
    transparent: true,
    opacity: 0.85,
  });
  return glow;
}

/**
 * Lights the door lamp or puts it out: swaps the dark glass for the glowing glass, shows or hides the flame, and
 * shows or hides any light hung on the lamp's anchor. The lamp must be kept whole (not merged into the room).
 */
export function setDoorLampLit(lamp: Object3D, lit: boolean): void {
  lamp.userData.lit = lit;
  lamp.traverse((object) => {
    if (typeof object.userData.lampLit === "boolean") object.visible = object.userData.lampLit === lit;
    if ((object as Object3D & { isLight?: boolean }).isLight) object.visible = lit;
  });
}

/* ------------------------------------------------------------------------------------------------ the table */

export interface UpstairsPiece {
  build: (m: Materials) => Object3D;
  /** The measured size of the piece's box: width (x), depth (z) and height (y), in metres. */
  footprint: { w: number; d: number; h: number };
  /** The box's lowest corner (x, y, z) relative to the piece's origin; most are centred on x and z and stand on y = 0. */
  min: [number, number, number];
}

/** Every piece by its id, with its measured box (tests/upstairspieces.test.ts checks these against the builders). */
export const UPSTAIRS_PIECES: Record<string, UpstairsPiece> = {
  stairsUp: { build: buildStairsUp, footprint: { w: 1.03, d: 4.0, h: 4.34 }, min: [-0.53, 0, -2] },
  stairWell: { build: buildStairWell, footprint: { w: 1.2, d: 4.2, h: 2.9 }, min: [-0.6, -1.9, -2.1] },
  bedPlain: { build: buildBedPlain, footprint: { w: 1.0, d: 2.0, h: 0.92 }, min: [-0.5, 0, -1] },
  bedLantern: { build: buildBedLantern, footprint: { w: 1.53, d: 2.02, h: 1.84 }, min: [-0.76, 0, -1] },
  washstand: { build: buildWashstand, footprint: { w: 0.6, d: 0.45, h: 1.06 }, min: [-0.3, 0, -0.225] },
  nightstand: { build: buildNightstand, footprint: { w: 0.45, d: 0.45, h: 0.83 }, min: [-0.225, 0, -0.225] },
  chest: { build: buildChest, footprint: { w: 0.91, d: 0.51, h: 0.54 }, min: [-0.455, 0, -0.255] },
  crates: { build: buildCrates, footprint: { w: 1.35, d: 1.0, h: 1.0 }, min: [-0.69, 0, -0.49] },
  doorPlain: { build: buildDoorPlain, footprint: { w: 0.91, d: 0.14, h: 2.07 }, min: [-0.02, 0.01, -0.07] },
  doorFrame: { build: buildDoorFrame, footprint: { w: 1.1, d: 0.24, h: 2.25 }, min: [-0.55, 0, -0.12] },
  doorLamp: { build: buildDoorLamp, footprint: { w: 0.17, d: 0.39, h: 0.54 }, min: [-0.08, 1.73, 0] },
};
