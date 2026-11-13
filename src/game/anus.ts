/**
 * Her anus. The model has a disc of rings and spokes lying just over the skin in the cleft of her rear, like the
 * nipple discs, with a short canal going into her from its middle (add_anus in tools/blender/build_world.py). This
 * shapes it from her look and how open it is, on the skin as it is at that moment: closed, the rim draws in to a
 * point, puckered in folds; opening, it widens and shows the canal, and the folds smooth out; stretched, past fully
 * open (up to ANUS_STRETCHED), it widens further, its rim thinning, and its canal goes deeper. Sizes are in metres.
 *
 * Each corner's ring and spoke ride in its UVs: u the ring, 0 at the bottom of the canal, up the canal to the rim
 * (ANUS_CANAL + 1) and out across the disc to its edge on her skin (1), and v the spoke. The rim's rings and the
 * canal wear T_anus, the rest of the disc her skin (T_anus_skin).
 */

export const ANUS_MATERIAL = "T_anus";
export const ANUS_SKIN_MATERIAL = "T_anus_skin";
/** As build_world.py builds it: ANUS_SPOKES, ANUS_RINGS (rim to edge), ANUS_CANAL and ANUS_RADIUS. */
export const ANUS_SPOKES = 12;
export const ANUS_RINGS = 8;
export const ANUS_CANAL = 3;
const RADIUS = 0.026;
/** The rim's ring, and the last ring, as numbered in u. */
const RIM = ANUS_CANAL + 1;
export const ANUS_LAST = RIM + ANUS_RINGS;
/** The rings out from the rim that wear T_anus: ANUS_RIM in build_world.py. */
const PUCKER = 3;
/** How much further over the skin the game lays it than it was built (ANUS_LIFT), as with her vulva. */
const LIFT = 0.0003;
/** How open it is at its widest: 0 is closed, 1 fully open, and past it it stretches, as wide as it goes at 2. */
export const ANUS_STRETCHED = 2;
/** The rim's radius, closed and fully open, at her usual size, and how much wider it goes stretched. */
const SHUT = 0.0004;
const OPEN = 0.0065;
const STRETCH = 0.0055;
/** How deep the canal goes, and how much deeper stretched, and how much it turns up into her from straight in. */
const DEPTH = 0.03;
const STRETCH_DEEP = 0.015;
const INWARD_UP = 0.6;

export interface AnusType {
  id: string;
  label: string;
  /** How far out from the middle the darker, puckered rim reaches. */
  rim: number;
  /** How high the rim stands in a soft ring. */
  puff: number;
  /** How deep its folds are while it's closed. */
  folds: number;
  /** How open it sits when nothing opens it, from 0 to 1. */
  rest: number;
}

/** The first is the default. */
export const ANUS_TYPES: AnusType[] = [
  // Small and drawn in tight, deeply folded.
  { id: "tight", label: "Tight", rim: 0.0065, puff: 0.0006, folds: 0.0012, rest: 0 },
  // A full, raised rim.
  { id: "puffy", label: "Puffy", rim: 0.009, puff: 0.0026, folds: 0.0007, rest: 0.04 },
  // Soft and a little open, the folds shallow.
  { id: "relaxed", label: "Relaxed", rim: 0.008, puff: 0.0012, folds: 0.0004, rest: 0.15 },
];

/** Her anus as it is shaped now. */
export interface AnusShape {
  rim: number;
  puff: number;
  folds: number;
  /** The rim's radius now. */
  mouth: number;
  /** How open it is, 0 to 1: the folds smooth out as it opens. */
  open: number;
  /** How far it's stretched past fully open, 0 to 1. */
  stretch: number;
  /** How deep its canal goes. */
  deep: number;
}

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** A type with the Size slider (-1 to 1) and how far it's opened (0 closed, 1 fully, up to ANUS_STRETCHED) put in. */
export function anusShape(type: AnusType, size: number, open: number): AnusShape {
  const scale = 1 + 0.25 * Math.min(1, Math.max(-1, size));
  const o = Math.max(type.rest, Math.min(ANUS_STRETCHED, Math.max(0, open)));
  const stretch = smooth(o - 1);
  return {
    rim: type.rim * scale,
    // Stretched, the rim thins out.
    puff: type.puff * scale * (1 - 0.6 * stretch),
    folds: type.folds * scale,
    // Stretched, it's as wide as what's in her, whatever her size.
    mouth: (SHUT + (OPEN - SHUT) * smooth(o)) * scale + STRETCH * stretch,
    open: Math.min(1, o),
    stretch,
    deep: DEPTH * scale + STRETCH_DEEP * stretch,
  };
}

/** One ring of the disc out from the rim, as shaped: its radius, and how high it stands on the spokes. */
export interface AnusRing {
  r: number;
  /** Its height on the even spokes and on the odd ones: the folds lie between. */
  even: number;
  odd: number;
}

/**
 * The disc's rings from the rim to the edge, for a shape. The rim's rings crowd in after a closed rim and spread
 * out after an open one, the rest out to the disc's edge as built, which lies flat on her skin.
 */
export function anusRings(shape: AnusShape): AnusRing[] {
  const rim = Math.max(shape.rim, shape.mouth / (0.7 + 0.15 * shape.stretch));
  const rings: AnusRing[] = [];
  const fold = shape.folds * (1 - smooth(shape.open / 0.6));
  for (let j = 0; j <= ANUS_RINGS; j++) {
    const r = j <= PUCKER ? shape.mouth + ((rim - shape.mouth) * j) / PUCKER : rim + ((RADIUS - rim) * (j - PUCKER)) / (ANUS_RINGS - PUCKER);
    // A soft ring of puff, highest a little out from the rim, fading to the skin by the edge.
    const out = j <= PUCKER ? Math.sin((Math.PI * (j + 0.5)) / (PUCKER + 1.5)) : 1 - (j - PUCKER) / (ANUS_RINGS - PUCKER);
    const puff = shape.puff * Math.max(0, out) * (j <= PUCKER ? 1 : 0.35);
    // Closed, the rim itself sinks in a little; stretched, it's drawn out over the curve of her cleft.
    const sink = j === 0 ? -0.0012 * (1 - smooth(shape.open / 0.3)) : 0;
    const drawn = j <= PUCKER ? 0.0015 * shape.stretch * (1 - j / (PUCKER + 1)) : 0;
    const folding = j >= 1 && j < PUCKER ? fold * (j === 1 ? 1 : 0.6) : 0;
    rings.push({ r, even: puff + sink + drawn + folding, odd: puff + sink + drawn - folding * 0.6 });
  }
  return rings;
}

/** The disc as built: which ring and spoke each corner of its meshes is, and one corner for each ring and spoke. */
export interface AnusPatch {
  rings: Uint8Array[];
  spokes: Uint8Array[];
  /** For each ring (0 to ANUS_LAST) and spoke, a mesh and a corner in it: two numbers each. */
  pick: Int32Array;
}

interface UvLike {
  count: number;
  getX(index: number): number;
  getY(index: number): number;
}

/** Finds the disc in its meshes from their UVs (which glTF stores upside down). Null if it's incomplete. */
export function readAnus(uvs: UvLike[]): AnusPatch | null {
  const pick = new Int32Array((ANUS_LAST + 1) * ANUS_SPOKES * 2).fill(-1);
  const rings: Uint8Array[] = [];
  const spokes: Uint8Array[] = [];
  uvs.forEach((uv, mesh) => {
    const ring = new Uint8Array(uv.count);
    const spoke = new Uint8Array(uv.count);
    for (let v = 0; v < uv.count; v++) {
      ring[v] = Math.min(ANUS_LAST, Math.max(0, Math.round(uv.getX(v) * ANUS_LAST)));
      spoke[v] = Math.round((1 - uv.getY(v)) * ANUS_SPOKES) % ANUS_SPOKES;
      const at = (ring[v] * ANUS_SPOKES + spoke[v]) * 2;
      if (pick[at] < 0) {
        pick[at] = mesh;
        pick[at + 1] = v;
      }
    }
    rings.push(ring);
    spokes.push(spoke);
  });
  // The canal's bottom is one corner for every spoke.
  for (let k = 1; k < ANUS_SPOKES; k++) {
    if (pick[k * 2] < 0) {
      pick[k * 2] = pick[0];
      pick[k * 2 + 1] = pick[1];
    }
  }
  return pick.includes(-1) ? null : { rings, spokes, pick };
}

/**
 * Lays the disc and its canal into a shape. `on` is where each corner of its meshes lies on the skin now, after the
 * body's own reshaping, in the model's space; the shaped corners are written into `out`, one array per mesh. Each
 * ring slides along its spoke over the skin as built, so the disc hugs the cleft however it curves; the canal goes
 * straight in from the middle.
 */
export function shapeAnus(patch: AnusPatch, on: Float32Array[], shape: AnusShape, out: Float32Array[]): void {
  const at = (ring: number, spoke: number, axis: number) => {
    const p = (ring * ANUS_SPOKES + spoke) * 2;
    return on[patch.pick[p]][patch.pick[p + 1] * 3 + axis];
  };
  // The middle, on the skin: the rim's corners as built lie all but on it.
  const centre = [0, 0, 0];
  for (let k = 0; k < ANUS_SPOKES; k++) for (let a = 0; a < 3; a++) centre[a] += at(RIM, k, a) / ANUS_SPOKES;
  // Out of her: from the canal's bottom up to the middle.
  const normal = [0, 1, 2].map((a) => centre[a] - at(0, 0, a));
  const length = Math.hypot(...normal) || 1;
  for (let a = 0; a < 3; a++) normal[a] /= length;
  /** Where the skin is along spoke `k`, `r` out from the middle. */
  const skin = (k: number, r: number, axis: number) => {
    const step = Math.min(ANUS_RINGS, (r / RADIUS) * ANUS_RINGS);
    const j = Math.min(ANUS_RINGS - 1, Math.floor(step));
    const f = step - j;
    const from = j === 0 ? centre[axis] : at(RIM + j, k, axis);
    return from + (at(RIM + j + 1, k, axis) - from) * f;
  };
  /** The way out along spoke `k` from the middle, square to the normal. */
  const way = (k: number) => {
    const d = [0, 1, 2].map((a) => at(RIM + 1, k, a) - centre[a]);
    const n = d[0] * normal[0] + d[1] * normal[1] + d[2] * normal[2];
    for (let a = 0; a < 3; a++) d[a] -= normal[a] * n;
    const l = Math.hypot(...d) || 1;
    return d.map((x) => x / l);
  };
  // The canal runs in and up into her (+y is up in the model), clear of the skin in front of it.
  const inward = [-normal[0], -normal[1] + INWARD_UP, -normal[2]];
  const inwardLength = Math.hypot(...inward) || 1;
  for (let a = 0; a < 3; a++) inward[a] /= inwardLength;
  const rings = anusRings(shape);
  const position = (ring: number, k: number, axis: number): number => {
    if (ring >= RIM) {
      const { r, even, odd } = rings[ring - RIM];
      const h = (k % 2 === 0 ? even : odd) + LIFT;
      // On the skin as it curves up the sides of her cleft, however wide it's opened.
      const base = skin(k, r, axis);
      return base + normal[axis] * h;
    }
    // Down the canal, narrowing a little; its bottom on the middle.
    const deep = ring === 0 ? shape.deep * 1.15 : (shape.deep * (RIM - ring)) / ANUS_CANAL;
    const r = ring === 0 ? 0 : shape.mouth * (1 - (0.35 * (RIM - ring)) / ANUS_CANAL);
    return centre[axis] + way(k)[axis] * r + inward[axis] * deep + normal[axis] * (LIFT - 0.0012 * (1 - smooth(shape.open / 0.3)));
  };
  patch.rings.forEach((rings, mesh) => {
    const target = out[mesh];
    const spokes = patch.spokes[mesh];
    for (let v = 0; v < rings.length; v++) {
      for (let a = 0; a < 3; a++) target[v * 3 + a] = position(rings[v], spokes[v], a);
    }
  });
}
