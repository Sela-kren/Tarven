import type { BufferGeometry } from "three";

/**
 * Her areolae and nipples. The model has a flat disc of rings and spokes lying just over the skin of each breast
 * (add_nipples in tools/blender/build_world.py); this shapes it from her look and how aroused she is, on the skin
 * as the breast is at that moment, so it keeps its size whatever the cup. Sizes are in metres at her build.
 */

/** The rings and spokes each disc is built with: NIPPLE_RINGS and NIPPLE_SPOKES in build_world.py. */
export const DISC_RINGS = 5;
export const DISC_SPOKES = 12;
/** The material the discs are built in. */
export const DISC_MATERIAL = "T_areola";
/** How far over the skin the disc is built: NIPPLE_LIFT in build_world.py. */
export const DISC_LIFT = 0.0008;
/**
 * How far over the skin the game lays it, and how much further for each time over that the skin under it has
 * stretched: a fuller breast stretches the skin's faces under the disc, and their ridges stand higher between its
 * corners. The clothes over it clear the same (see tentHeight).
 */
const BASE_LIFT = 0.0013;
const STRETCH_LIFT = 0.0021;
/** How far the cloth over a nipple tents out around it, in the nipple's own radius. */
const TENT = 5;

export interface NippleType {
  id: string;
  label: string;
  /** The areola's radius. */
  areola: number;
  /** The nipple's radius. */
  nipple: number;
  /** How far the nipple stands off the areola when she's calm; below 0 it's tucked in. */
  height: number;
  /** How far it stands when she's fully aroused. */
  erect: number;
  /** How far the areola itself is raised in a soft dome. */
  puff: number;
}

/** The first is the default. */
export const NIPPLE_TYPES: NippleType[] = [
  { id: "neat", label: "Neat", areola: 0.0105, nipple: 0.003, height: 0.0026, erect: 0.0075, puff: 0 },
  { id: "puffy", label: "Puffy", areola: 0.013, nipple: 0.0032, height: 0.0018, erect: 0.0065, puff: 0.0035 },
  { id: "wide", label: "Wide areola", areola: 0.0175, nipple: 0.0032, height: 0.0024, erect: 0.007, puff: 0.0004 },
  // Tucked in when calm; it comes out as she's aroused.
  { id: "inverted", label: "Inverted", areola: 0.012, nipple: 0.0032, height: -0.0022, erect: 0.006, puff: 0.0008 },
];

/**
 * How aroused she shows, from 0 to 1: her breasts' desire tonight (0 to 1), or in a duel her pleasure (0 to 1),
 * whichever is more. Aroused, she shows at least 0.6; on the edge, fully.
 */
export function arousalOf(breasts: number, duel?: { state: "calm" | "aroused" | "edge"; pleasure: number } | null): number {
  let level = breasts;
  if (duel) {
    const floor = duel.state === "edge" ? 1 : duel.state === "aroused" ? 0.6 : 0;
    level = Math.max(level, duel.pleasure, floor);
  }
  return Math.min(1, Math.max(0, level));
}

/** Nipples stiffen within a couple of seconds and soften slowly: `shown` moved towards `target` over `dt`. */
export function easeArousal(shown: number, target: number, dt: number): number {
  const rate = target > shown ? 0.5 : 0.15;
  const step = Math.min(Math.abs(target - shown), rate * dt);
  return shown + Math.sign(target - shown) * step;
}

/** How far out one ring of the disc sits, and how far it stands off the skin. */
export interface Ring {
  r: number;
  h: number;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/**
 * The disc's rings, tip first, for a type, the two size sliders (-1 to 1) and how aroused she is (0 to 1).
 * Aroused, the nipple stands and swells a little, and the areola draws in and firms.
 */
export function nippleProfile(type: NippleType, nippleSize: number, areolaSize: number, arousal: number): Ring[] {
  const a = smooth(arousal);
  const size = 1 + 0.5 * nippleSize;
  const rn = type.nipple * size * (1 + 0.1 * a);
  const hn = (type.height + (type.erect - type.height) * a) * size;
  const puff = type.puff * (1 - 0.6 * a);
  // Never smaller than the nipple's own base, with a ring of areola around it.
  const ra = Math.max(rn * 1.8, type.areola * (1 + 0.45 * areolaSize) * (1 - 0.18 * a));
  const base = rn * 1.15;
  return [
    { r: 0, h: puff + hn },
    { r: rn * 0.65, h: puff + hn * 0.9 },
    { r: rn, h: puff + hn * 0.45 },
    { r: base, h: puff * 0.97 },
    { r: base + (ra - base) * 0.55, h: puff * 0.6 },
    { r: ra, h: 0 },
  ];
}

/** One disc as built: which ring and spoke each of its corners is, and where to find its tip and edge. */
export interface Disc {
  /** The corners of this disc, by index into the mesh. */
  verts: Int32Array;
  rings: Uint8Array;
  spokes: Uint8Array;
  /** A corner at the tip. */
  tip: number;
  /** A corner on the edge, for each spoke. */
  edge: Int32Array;
  /** A corner at each ring and spoke, ring by ring; the tip stands for every spoke of ring 0. */
  grid: Int32Array;
  /** The disc's radius as built; its rings are evenly spaced out to it. */
  rest: number;
  /** Which way it faces as built. */
  normal: [number, number, number];
}

/**
 * The points under the discs' corners, on the skin: `bind` with each corner taken back down to the skin along its
 * disc's normal. The body's reshaping moves these, not the corners themselves, so the disc's small gap off the skin
 * doesn't grow with the breast; it's laid back on at the size it should be.
 */
export function skinUnder(discs: Disc[], bind: Float32Array): Float32Array {
  const out = bind.slice();
  for (const disc of discs) {
    const [nx, ny, nz] = disc.normal;
    for (const v of disc.verts) {
      out[v * 3] -= nx * DISC_LIFT;
      out[v * 3 + 1] -= ny * DISC_LIFT;
      out[v * 3 + 2] -= nz * DISC_LIFT;
    }
  }
  return out;
}

/** Which way a disc faces, from its edge all the way round: forwards, which is -z in the model. */
function facing(disc: Pick<Disc, "tip" | "edge">, on: Float32Array): [number, number, number] {
  const t = disc.tip * 3;
  let nx = 0, ny = 0, nz = 0;
  for (let j = 0; j < DISC_SPOKES; j++) {
    const a = disc.edge[j] * 3;
    const b = disc.edge[(j + 1) % DISC_SPOKES] * 3;
    const ax = on[a] - on[t], ay = on[a + 1] - on[t + 1], az = on[a + 2] - on[t + 2];
    const bx = on[b] - on[t], by = on[b + 1] - on[t + 1], bz = on[b + 2] - on[t + 2];
    nx += ay * bz - az * by;
    ny += az * bx - ax * bz;
    nz += ax * by - ay * bx;
  }
  const length = Math.hypot(nx, ny, nz) || 1;
  const flip = nz > 0 ? -1 : 1;
  return [(nx * flip) / length, (ny * flip) / length, (nz * flip) / length];
}

/**
 * Finds the two discs in their mesh: the ring and spoke of each corner ride in its UVs (u the ring, v the spoke,
 * which glTF stores upside down), and the side it's on in where it was built. `bind` is the model-space positions.
 */
export function readDiscs(geometry: BufferGeometry, bind: Float32Array): Disc[] {
  const uv = geometry.getAttribute("uv");
  if (!uv) return [];
  const sides = new Map<number, number[]>();
  for (let v = 0; v < uv.count; v++) {
    const side = bind[v * 3] < 0 ? -1 : 1;
    const list = sides.get(side) ?? [];
    list.push(v);
    sides.set(side, list);
  }
  const discs: Disc[] = [];
  for (const list of sides.values()) {
    const verts = Int32Array.from(list);
    const rings = new Uint8Array(verts.length);
    const spokes = new Uint8Array(verts.length);
    const grid = new Int32Array((DISC_RINGS + 1) * DISC_SPOKES).fill(-1);
    verts.forEach((v, i) => {
      rings[i] = Math.min(DISC_RINGS, Math.round(uv.getX(v) * DISC_RINGS));
      spokes[i] = Math.round((1 - uv.getY(v)) * DISC_SPOKES) % DISC_SPOKES;
      if (rings[i] === 0) grid.fill(v, 0, DISC_SPOKES);
      else grid[rings[i] * DISC_SPOKES + spokes[i]] = v;
    });
    if (grid.some((v) => v < 0)) continue;
    const tip = grid[0];
    const edge = grid.slice(DISC_RINGS * DISC_SPOKES);
    let rest = 0;
    for (const v of edge) rest += Math.hypot(bind[v * 3] - bind[tip * 3], bind[v * 3 + 1] - bind[tip * 3 + 1], bind[v * 3 + 2] - bind[tip * 3 + 2]);
    discs.push({ verts, rings, spokes, tip, edge, grid, rest: rest / DISC_SPOKES, normal: facing({ tip, edge }, bind) });
  }
  return discs;
}

/**
 * Lays one disc into its shape. `on` is where each corner of the mesh lies on the skin now, after the body's own
 * reshaping, in the model's space; the shaped corners are written into `out` at the same places. Each ring slides
 * along its spoke over the skin, following where the disc's own corners lie, so it hugs the breast however it
 * curves, and a fuller breast stretches the areola with it; past the edge as built, the skin's curve carries on.
 * The nipple keeps its own size and stands out along the disc's normal. The normal and how far the disc lifts off
 * the skin for its stretch are returned, for the clothes.
 */
export function shapeDisc(disc: Disc, on: Float32Array, profile: Ring[], out: Float32Array): { normal: [number, number, number]; lift: number } {
  const t = disc.tip * 3;
  const cx = on[t], cy = on[t + 1], cz = on[t + 2];
  const [nx, ny, nz] = facing(disc, on);
  // The disc lifts off the skin a little more as the skin under it stretches, so the skin never shows through.
  let across = 0;
  for (const v of disc.edge) across += Math.hypot(on[v * 3] - cx, on[v * 3 + 1] - cy, on[v * 3 + 2] - cz);
  const lift = BASE_LIFT + STRETCH_LIFT * Math.max(0, across / DISC_SPOKES / disc.rest - 1);
  /** Where the skin is along spoke `j`, `step` rings out (a fraction between rings, or past the edge). */
  const skin = (j: number, step: number, axis: number): number => {
    const at = (ring: number) => on[disc.grid[ring * DISC_SPOKES + j] * 3 + axis];
    if (step <= DISC_RINGS) {
      const ring = Math.min(DISC_RINGS - 1, Math.floor(step));
      const f = step - ring;
      return at(ring) + (at(ring + 1) - at(ring)) * f;
    }
    // Past the edge: the curve through the last three rings, carried on.
    const k = DISC_RINGS;
    const l0 = ((step - (k - 1)) * (step - k)) / 2;
    const l1 = -(step - (k - 2)) * (step - k);
    const l2 = ((step - (k - 2)) * (step - (k - 1))) / 2;
    return at(k - 2) * l0 + at(k - 1) * l1 + at(k) * l2;
  };
  for (let i = 0; i < disc.verts.length; i++) {
    const o = disc.verts[i] * 3;
    const ring = profile[disc.rings[i]];
    const step = disc.rings[i] === 0 ? 0 : (ring.r / disc.rest) * DISC_RINGS;
    const j = disc.spokes[i];
    const h = ring.h + lift;
    out[o] = skin(j, step, 0) + nx * h;
    out[o + 1] = skin(j, step, 1) + ny * h;
    out[o + 2] = skin(j, step, 2) + nz * h;
  }
  return { normal: [nx, ny, nz], lift };
}

/**
 * How far the clothes stand out over a nipple, `r` from its tip on the skin as built. Cloth tents out around a
 * standing nipple, wider than the nipple itself: the clothes' points are further apart than a nipple is wide, and
 * would hardly feel it otherwise. Over a raised areola it rises with it; over a tucked-in nipple it lies flat.
 */
export function tentHeight(profile: Ring[], r: number): number {
  const reach = profile[2].r * TENT;
  const t = Math.min(1, r / reach);
  let h = Math.max(0, profile[0].h) * (1 - t * t * (3 - 2 * t));
  for (let k = 1; k < profile.length; k++) {
    if (r <= profile[k].r) {
      const f = (r - profile[k - 1].r) / (profile[k].r - profile[k - 1].r || 1);
      h = Math.max(h, profile[k - 1].h + (profile[k].h - profile[k - 1].h) * f);
      break;
    }
  }
  return Math.max(0, h);
}
