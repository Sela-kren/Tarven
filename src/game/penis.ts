/**
 * His penis and scrotum. The model has a tube standing out of the skin of his groin and a sack hanging below it
 * (add_penis in tools/blender/build_world.py), and this shapes them from his look and how aroused he is, on the skin
 * as it is at that moment: soft, it hangs down in front of his scrotum, its foreskin over the glans; hard, it grows
 * longer and thicker and stands up and out, the foreskin drawn back, and his scrotum draws up tight. Sizes are in
 * metres.
 *
 * The tube's rings, from its root in the skin to the tip, are: the shaft (PENIS_SHAFT rings), the outer foreskin
 * (PENIS_OUTER), the foreskin's lip, the inner foreskin folding back from it (PENIS_INNER), the sulcus at the base of
 * the glans, the glans (PENIS_GLANS rings) and a single corner at the tip. Over the glans the foreskin covers it,
 * the inner foreskin lying between; drawn back, both bunch behind the glans and the inner foreskin shows as a band.
 * Each corner's ring rides in u (0 at the root to 1 at the tip) and its spoke in v. Up to the lip it wears T_penis,
 * which the game tones with his skin; from the lip on, T_glans.
 *
 * The sack's rings run from its mouth, lying on his skin, down to a single corner at its bottom: u the ring, v the
 * spoke. It wears T_scrotum, toned with his skin.
 */

export const PENIS_MATERIAL = "T_penis";
export const GLANS_MATERIAL = "T_glans";
export const SCROTUM_MATERIAL = "T_scrotum";
/** As build_world.py builds them: PENIS_SPOKES and the rings of each part of the tube, and SCROTUM_RINGS. */
export const PENIS_SPOKES = 12;
export const PENIS_SHAFT = 8;
export const PENIS_OUTER = 3;
export const PENIS_INNER = 2;
export const PENIS_GLANS = 4;
/** The rings as numbered in u. */
const LIP = PENIS_SHAFT + PENIS_OUTER;
const SULCUS = LIP + PENIS_INNER + 1;
export const PENIS_TIP = SULCUS + PENIS_GLANS + 1;
/** The sack's rings, its mouth first, besides the corner at its bottom. */
export const SCROTUM_RINGS = 8;
export const SCROTUM_LAST = SCROTUM_RINGS;

/** How long and how thick (its radius) at his usual size, soft and hard. */
const SOFT_LENGTH = 0.085;
const HARD_LENGTH = 0.145;
const SOFT_RADIUS = 0.0135;
const HARD_RADIUS = 0.0172;
/** How far the root goes into him, behind the skin, so no gap shows where the shaft meets it. */
const EMBED = 0.008;
/** The glans' length, as a share of the whole. */
const GLANS_SHARE = 0.2;
/** Soft, it leaves him a little below level and turns to hang nearly straight down within this share of its length. */
const SOFT_ROOT_ANGLE = -0.45;
const SOFT_HANG = -1.42;
const SOFT_BEND = 0.38;
/** The sack at his usual size, relaxed: its half width, its depth out from him, its height, and how low it hangs. */
const SACK = { width: 0.03, depth: 0.023, height: 0.028, hang: 0.018 };
/** How far the sack stands out of him before it turns down. */
const SACK_OUT = 0.004;
/**
 * Held in his clothes: how high above level it stands while hard, tenting the cloth out, and how much
 * of how far it and the sack stand out of him the cloth presses back in (half that while hard).
 */
const PACKED_ANGLE = 0.35;
const PACKED_PRESS = 0.5;

export interface PenisType {
  id: string;
  label: string;
  /** Whether it has its foreskin. Without, the shaft runs up to the glans, a faint line where it was. */
  cut: boolean;
  /** How much of the glans the foreskin covers while soft, 0 to 1. */
  cover: number;
  /** How far the foreskin reaches past the tip while soft, as a share of the glans' length. */
  overhang: number;
  /** How wide the glans' crown is, as a share of the shaft's radius. */
  flare: number;
  /** How much thinner the shaft is at the glans than at the root. */
  taper: number;
  /** How far, in radians, it curves up along its length while hard. */
  curve: number;
  /** How high above level it stands while hard, in radians. */
  angle: number;
  /** How much longer and thicker it is than usual: 1 is as usual. */
  length: number;
  girth: number;
  /**
   * How long it is soft, as a share of the usual soft length for its size: a grower's is short and grows a lot, a
   * shower's is long and grows little. 1 if not given.
   */
  soft?: number;
  /** How much of the foreskin's cover draws back as he hardens, 0 to 1: a tight one hardly does. 0.85 if not given. */
  retract?: number;
}

/** The first is the default. */
export const PENIS_TYPES: PenisType[] = [
  // The foreskin over the glans while soft, drawn back as he hardens.
  { id: "uncut", label: "Uncircumcised", cut: false, cover: 1, overhang: 0.05, flare: 1.08, taper: 0.06, curve: 0.08, angle: 0.4, length: 1, girth: 1 },
  // No foreskin: the glans always bare.
  { id: "cut", label: "Circumcised", cut: true, cover: 0, overhang: 0, flare: 1.12, taper: 0.05, curve: 0.05, angle: 0.42, length: 1, girth: 1 },
  // Untouched: smaller and slender, a snug foreskin past the tip that stays over the glans even hard, standing high.
  {
    id: "virgin", label: "Virgin", cut: false, cover: 1, overhang: 0.2, flare: 1.02, taper: 0.1, curve: 0.12, angle: 0.55,
    length: 0.85, girth: 0.85, retract: 0.15,
  },
  // A long foreskin, gathered past the tip while soft.
  { id: "hooded", label: "Long foreskin", cut: false, cover: 1, overhang: 0.35, flare: 1.04, taper: 0.08, curve: 0.06, angle: 0.36, length: 1, girth: 0.95 },
  // Small soft, growing a great deal as he hardens.
  {
    id: "grower", label: "Grower", cut: false, cover: 1, overhang: 0.1, flare: 1.08, taper: 0.05, curve: 0.08, angle: 0.42,
    length: 1.05, girth: 1, soft: 0.6,
  },
  // Long and heavy soft, growing little as he hardens.
  {
    id: "shower", label: "Shower", cut: true, cover: 0, overhang: 0, flare: 1.1, taper: 0.04, curve: 0.03, angle: 0.3,
    length: 1, girth: 1.08, soft: 1.35,
  },
  // Thick, with a broad crown, cut.
  { id: "thick", label: "Thick", cut: true, cover: 0, overhang: 0, flare: 1.2, taper: 0.02, curve: 0.02, angle: 0.3, length: 0.92, girth: 1.22 },
  // A slim shaft under a wide, flared head.
  { id: "mushroom", label: "Mushroom head", cut: true, cover: 0, overhang: 0, flare: 1.38, taper: 0.12, curve: 0.04, angle: 0.38, length: 0.98, girth: 0.92 },
  // Wide at the root, narrowing to a small head.
  {
    id: "tapered", label: "Tapered", cut: false, cover: 0.6, overhang: 0, flare: 0.96, taper: 0.32, curve: 0.06, angle: 0.4,
    length: 1.08, girth: 1.05,
  },
  // Long and slender, curving up while hard.
  { id: "curved", label: "Curved up", cut: false, cover: 0.7, overhang: 0, flare: 1.06, taper: 0.12, curve: 0.45, angle: 0.25, length: 1.12, girth: 0.9 },
  // Bending down along its length while hard, standing lower.
  { id: "downward", label: "Curved down", cut: false, cover: 1, overhang: 0.05, flare: 1.06, taper: 0.08, curve: -0.35, angle: 0.5, length: 1.05, girth: 0.95 },
  // Small all over.
  { id: "small", label: "Small", cut: false, cover: 1, overhang: 0.1, flare: 1.04, taper: 0.06, curve: 0.08, angle: 0.5, length: 0.68, girth: 0.82 },
  // Big all over.
  { id: "large", label: "Large", cut: true, cover: 0, overhang: 0, flare: 1.12, taper: 0.05, curve: 0.04, angle: 0.28, length: 1.3, girth: 1.2 },
];

/** His penis and scrotum as shaped now: a type with his sliders and arousal put in. */
export interface PenisShape {
  /** Along its middle, root to tip, and its shaft's radius at the root. */
  length: number;
  radius: number;
  taper: number;
  /** The glans' length and its crown's radius as a share of the shaft's. */
  glans: number;
  flare: number;
  /** How much of the glans the foreskin covers now, 0 (drawn back) to 1, and how far past the tip it reaches. */
  cover: number;
  overhang: number;
  cut: boolean;
  /** From soft to hard, 0 to 1: how much its hanging gives way to standing. */
  stand: number;
  /** While hard: how much it curves up along its length, and how high above level it leaves him, in radians. */
  curve: number;
  hardAngle: number;
  /** The sack's half width, depth, height and how low it hangs below its mouth. */
  sack: { width: number; depth: number; height: number; hang: number };
  /** How much it's held in his clothes, 0 (free) to 1: pressed in against him, and lying up while hard. */
  packed: number;
}

const clamp = (x: number, low = -1, high = 1) => Math.min(high, Math.max(low, x));
const smooth = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * A type with the sliders (-1 to 1) and how aroused he is (0 soft to 1 hard) put in. The Length and Girth sliders
 * scale it, Head its glans, Foreskin how much the foreskin covers (no help to a cut one), and Balls and Hang the
 * sack. Hardening grows it in the first two thirds of the way and stands it up over the whole; the foreskin draws
 * back and the sack draws up tight.
 */
export function penisShape(
  type: PenisType, length: number, girth: number, head: number, skin: number, balls: number, hang: number, arousal: number,
  packed = 0,
): PenisShape {
  const held = clamp(packed, 0, 1);
  const a = clamp(arousal, 0, 1);
  const grow = smooth(a / 0.66);
  const stand = smooth(a);
  const long = type.length * (1 + 0.3 * clamp(length));
  const thick = type.girth * (1 + 0.22 * clamp(girth));
  // Never longer soft than hard.
  const total = lerp(Math.min(SOFT_LENGTH * (type.soft ?? 1), HARD_LENGTH * 0.92), HARD_LENGTH, grow) * long;
  const retract = type.retract ?? 0.85;
  const cover = type.cut ? 0 : clamp(type.cover + 0.5 * clamp(skin), 0, 1) * (1 - retract * smooth((a - 0.25) / 0.65));
  const ball = 1 + 0.3 * clamp(balls);
  const tight = smooth(a);
  return {
    length: total,
    radius: lerp(SOFT_RADIUS, HARD_RADIUS, grow) * thick,
    taper: type.taper,
    glans: total * GLANS_SHARE * (1 + 0.2 * clamp(head)),
    flare: type.flare * (1 + 0.1 * clamp(head)) * (1 + 0.04 * grow),
    cover,
    overhang: type.cut ? 0 : Math.max(0, type.overhang + 0.15 * clamp(skin)) * (1 - stand),
    cut: type.cut,
    stand,
    curve: type.curve * (1 - held),
    hardAngle: lerp(type.angle, PACKED_ANGLE, held),
    sack: {
      width: SACK.width * ball * (1 - 0.08 * tight),
      depth: SACK.depth * ball * (1 - 0.08 * tight),
      height: SACK.height * ball * (1 - 0.25 * tight),
      hang: SACK.hang * (1 + 0.6 * clamp(hang)) * (1 - 0.65 * tight) * Math.sqrt(ball) * (1 - 0.6 * held),
    },
    packed: held,
  };
}

/** Which way the middle runs `s` along it, in radians above level: hanging while soft, standing while hard. */
export function penisAngle(shape: PenisShape, s: number): number {
  const t = s / Math.max(1e-6, shape.length);
  const soft = SOFT_ROOT_ANGLE + (SOFT_HANG - SOFT_ROOT_ANGLE) * smooth(t / SOFT_BEND);
  const hard = shape.hardAngle + shape.curve * clamp(t, 0, 1.2);
  return lerp(soft, hard, shape.stand);
}

/** The glans' radius `s` along the middle, from the sulcus to the tip: 0 outside it. */
export function glansRadius(shape: PenisShape, s: number): number {
  const start = shape.length - shape.glans;
  const u = (s - start) / shape.glans;
  if (u < 0 || u > 1) return 0;
  const crown = shape.radius * (1 - shape.taper) * shape.flare;
  const CREST = 0.12;
  if (u < CREST) return lerp(shape.radius * (1 - shape.taper) * 0.9, crown, u / CREST);
  const w = (u - CREST) / (1 - CREST);
  return crown * Math.sqrt(Math.max(0, 1 - w * w));
}

/** One ring of the tube as shaped: how far along the middle it lies and its radius. */
export interface PenisRing {
  s: number;
  r: number;
}

/**
 * The tube's rings from the root to the tip, for a shape: where the foreskin lies, between covering the glans
 * (`cover` 1) and drawn back behind it (0), the lip clinging to the glans wherever it rests on it.
 */
export function penisRings(shape: PenisShape): PenisRing[] {
  const { length: L, glans: g, radius } = shape;
  const sulcus = L - g;
  const c = shape.cover;
  const shaftR = (s: number) => radius * (1 - shape.taper * clamp(s / sulcus, 0, 1));
  const r = shaftR(sulcus);
  // Covering: the outer foreskin over the glans to the lip at the tip (or past it), the inner back down inside it.
  // Drawn back: both bunched behind the glans, a soft roll; cut, they lie smooth along the shaft up to the glans.
  const roll = shape.cut ? 1 : 1.1;
  const reach = L + (0.03 + shape.overhang) * g;
  const back = shape.cut ? 0.12 : 0.32;
  const covered: PenisRing[] = [
    { s: sulcus - 0.08 * g, r: r * 1.04 },
    { s: sulcus + 0.4 * g, r: glansRadius(shape, sulcus + 0.4 * g) * 1.08 },
    { s: L - 0.08 * g + 0.4 * shape.overhang * g, r: Math.max(r * 0.4, glansRadius(shape, L - 0.08 * g) * 1.08) },
    { s: reach, r: r * 0.16 },
    { s: L - 0.06 * g, r: Math.max(r * 0.12, glansRadius(shape, L - 0.06 * g) * 1.02) },
    { s: sulcus + 0.4 * g, r: glansRadius(shape, sulcus + 0.4 * g) * 1.02 },
  ];
  const drawn: PenisRing[] = [
    { s: sulcus - back * g, r: r * (shape.cut ? 1 : 1.04) },
    { s: sulcus - back * 0.72 * g, r: r * roll },
    { s: sulcus - back * 0.45 * g, r: r * roll },
    { s: sulcus - back * 0.25 * g, r: r * (shape.cut ? 0.99 : 1.04) },
    { s: sulcus - back * 0.12 * g, r: r * (shape.cut ? 0.97 : 1.0) },
    { s: sulcus - back * 0.04 * g, r: r * 0.95 },
  ];
  const foreskin = covered.map((on, i) => {
    const s = lerp(drawn[i].s, on.s, c);
    let ring = lerp(drawn[i].r, on.r, c);
    // Never inside the glans: the outer foreskin and its lip stretch over it, the inner lies on it.
    const over = glansRadius(shape, s);
    if (over > 0) ring = Math.max(ring, over * (i < PENIS_OUTER + 1 ? 1.05 : 1.01));
    return { s, r: ring };
  });
  const shaftEnd = foreskin[0].s;
  const rings: PenisRing[] = [];
  // The root goes into him; the shaft's own rings, a touch fuller at the root, spread out to where the foreskin starts.
  rings.push({ s: -EMBED, r: radius * 1.1 });
  for (let i = 1; i < PENIS_SHAFT; i++) {
    const s = (shaftEnd * (i - 1)) / (PENIS_SHAFT - 1) + (i === 1 ? 0.0015 : 0);
    rings.push({ s, r: shaftR(s) * (i === 1 ? 1.06 : 1) });
  }
  rings.push(...foreskin);
  rings.push({ s: sulcus, r: r * 0.9 });
  for (const u of [0.12, 0.45, 0.75, 0.93]) rings.push({ s: sulcus + u * g, r: glansRadius(shape, sulcus + u * g) });
  rings.push({ s: L, r: 0 });
  return rings;
}

/** The tube and sack as built: which ring and spoke each corner of their meshes is, and one corner for each. */
export interface PenisPatch {
  /** For each of the tube's meshes then the sack's, each corner's ring and spoke. */
  rings: Uint8Array[];
  spokes: Uint8Array[];
  /** How many of the meshes are the tube's; the rest are the sack's. */
  tubeMeshes: number;
  /** For each ring (0 to PENIS_TIP) and spoke of the tube, a mesh and a corner in it: two numbers each. */
  pick: Int32Array;
  /** Likewise for the sack, its rings 0 to SCROTUM_LAST. */
  sackPick: Int32Array;
}

interface UvLike {
  count: number;
  getX(index: number): number;
  getY(index: number): number;
}

/**
 * Finds the tube in its meshes (`tube`, by material) and the sack in its (`sack`) from their UVs, which glTF stores
 * upside down. Null if either is incomplete.
 */
export function readPenis(tube: UvLike[], sack: UvLike[]): PenisPatch | null {
  const rings: Uint8Array[] = [];
  const spokes: Uint8Array[] = [];
  const read = (uvs: UvLike[], last: number, first: number) => {
    const pick = new Int32Array((last + 1) * PENIS_SPOKES * 2).fill(-1);
    uvs.forEach((uv, i) => {
      const ring = new Uint8Array(uv.count);
      const spoke = new Uint8Array(uv.count);
      for (let v = 0; v < uv.count; v++) {
        ring[v] = Math.min(last, Math.max(0, Math.round(uv.getX(v) * last)));
        spoke[v] = Math.round((1 - uv.getY(v)) * PENIS_SPOKES) % PENIS_SPOKES;
        const at = (ring[v] * PENIS_SPOKES + spoke[v]) * 2;
        if (pick[at] < 0) {
          pick[at] = first + i;
          pick[at + 1] = v;
        }
      }
      rings.push(ring);
      spokes.push(spoke);
    });
    // The single corner at the end stands for every spoke.
    const end = last * PENIS_SPOKES * 2;
    for (let k = 1; k < PENIS_SPOKES; k++) {
      if (pick[end + k * 2] < 0) {
        pick[end + k * 2] = pick[end];
        pick[end + k * 2 + 1] = pick[end + 1];
      }
    }
    return pick;
  };
  const pick = read(tube, PENIS_TIP, 0);
  const sackPick = read(sack, SCROTUM_LAST, tube.length);
  if (pick.includes(-1) || sackPick.includes(-1)) return null;
  return { rings, spokes, tubeMeshes: tube.length, pick, sackPick };
}

type Vec = [number, number, number];
const add = (a: Vec, b: Vec, k = 1): Vec => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Where his penis leaves him and which ways are out of him (`out`), up, and across him to +x (`side`), in the model's space. */
export interface PenisFrame {
  root: Vec;
  out: Vec;
  up: Vec;
  side: Vec;
  /** The middle of the sack's mouth, on his skin. */
  mouth: Vec;
}

/** The frame, from the meshes as they lie on the skin now (`on`, one array per mesh): built standing straight out. */
export function penisFrame(patch: PenisPatch, on: Float32Array[]): PenisFrame {
  const at = (pick: Int32Array, ring: number, spoke: number): Vec => {
    const p = (ring * PENIS_SPOKES + spoke) * 2;
    const from = on[pick[p]];
    const v = pick[p + 1] * 3;
    return [from[v], from[v + 1], from[v + 2]];
  };
  const centre = (pick: Int32Array, ring: number): Vec => {
    let sum: Vec = [0, 0, 0];
    for (let k = 0; k < PENIS_SPOKES; k++) sum = add(sum, at(pick, ring, k), 1 / PENIS_SPOKES);
    return sum;
  };
  const root = centre(patch.pick, 0);
  const out = unit(add(at(patch.pick, PENIS_TIP, 0), root, -1));
  // Up is up in the model (+y), square to the way out.
  const up = unit(add([0, 1, 0], out, -out[1]));
  return { root, out, up, side: cross(out, up), mouth: centre(patch.sackPick, 0) };
}

/** The sack's middle line from its mouth down to its bottom, `t` from 0 to 1, and the way it runs there. */
function sackPath(frame: PenisFrame, shape: PenisShape, t: number): { at: Vec; way: Vec } {
  const { out, up } = frame;
  const { depth, height, hang } = shape.sack;
  // A curve leaving the mouth straight out of him and turning down to the bottom, below and a little out.
  const a = frame.mouth;
  const b = add(a, out, SACK_OUT + depth * 0.3);
  const c = add(add(a, out, SACK_OUT + depth * 0.25), up, -(hang + height * 1.6));
  const u = 1 - t;
  const at: Vec = [0, 1, 2].map((i) => u * u * a[i] + 2 * u * t * b[i] + t * t * c[i]) as Vec;
  const way = unit([0, 1, 2].map((i) => 2 * u * (b[i] - a[i]) + 2 * t * (c[i] - b[i])) as Vec);
  return { at, way };
}

/** Where along its middle line each ring of the sack lies: closer together towards the bottom, where it rounds off. */
export function sackRing(ring: number): number {
  return Math.sin((Math.PI / 2) * (ring / SCROTUM_LAST));
}

/** Where along its middle line the sack is fullest. */
const SACK_FULL = 0.5;

/**
 * How wide the sack is `t` along its middle line from its mouth, as a share of its fullest: widening from a neck to
 * its fullest halfway, then rounding off to its bottom.
 */
export function sackProfile(t: number): number {
  if (t <= SACK_FULL) return 0.5 + 0.5 * Math.sin((Math.PI / 2) * (t / SACK_FULL));
  const w = (t - SACK_FULL) / (1 - SACK_FULL);
  return Math.sqrt(Math.max(0, 1 - w * w));
}

/** The middle of each ring of the tube, `s` along its middle, and the way it runs there: `step` apart, from the root. */
function middleLine(frame: PenisFrame, shape: PenisShape, to: number): { at: Vec[]; way: Vec[]; step: number } {
  const steps = 96;
  const step = to / steps;
  const at: Vec[] = [frame.root];
  const way: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const phi = penisAngle(shape, (i + 0.5) * step);
    const dir = unit(add(add([0, 0, 0], frame.out, Math.cos(phi)), frame.up, Math.sin(phi)));
    way.push(dir);
    if (i < steps) at.push(add(at[i], dir, step));
  }
  return { at, way, step };
}

/**
 * Moves the penis's middle line (`line`, from the root) out of him wherever it would sink into the front of the
 * sack, as it hangs, and keeps each point at least as far out as the one before, so it drapes down over the sack
 * rather than tucking back under it.
 */
function restOnSack(frame: PenisFrame, shape: PenisShape, line: Vec[]): void {
  const top = sackPath(frame, shape, 0);
  const bottom = sackPath(frame, shape, 1);
  const fullest = sackPath(frame, shape, SACK_FULL);
  const high = dot(top.at, frame.up);
  const low = dot(bottom.at, frame.up);
  const middle = (high + low) / 2;
  const half = (high - low) / 2;
  const front = dot(fullest.at, frame.out) + shape.sack.depth;
  const clear = shape.radius * 1.15;
  let pushed = 0;
  for (let i = 1; i < line.length; i++) {
    const height = dot(line[i], frame.up);
    const v = (height - middle) / half;
    if (Math.abs(v) < 1) {
      const need = front - shape.sack.depth * (1 - Math.sqrt(1 - v * v)) + clear - dot(line[i], frame.out);
      pushed = Math.max(pushed, need);
    }
    if (pushed > 0) line[i] = add(line[i], frame.out, pushed);
  }
}

/**
 * Lays the tube and the sack into a shape. `on` is where each corner of their meshes lies on the skin now, after the
 * body's own reshaping, in the model's space; the shaped corners are written into `out`, one array per mesh. Soft,
 * the penis rests on the front of the sack rather than sinking into it.
 */
export function shapePenis(patch: PenisPatch, on: Float32Array[], shape: PenisShape, out: Float32Array[]): void {
  const frame = penisFrame(patch, on);
  const rings = penisRings(shape);
  const far = Math.max(...rings.map((r) => r.s)) + 0.01;
  const line = middleLine(frame, shape, far);
  restOnSack(frame, shape, line.at);
  const along = (s: number): { at: Vec; way: Vec } => {
    if (s <= 0) return { at: add(frame.root, frame.out, s), way: line.way[0] };
    const f = Math.min(line.at.length - 1.001, s / line.step);
    const i = Math.floor(f);
    const k = f - i;
    return { at: add(line.at[i], add(line.at[i + 1], line.at[i], -1), k), way: line.way[Math.min(i, line.way.length - 1)] };
  };

  // The sack first, so the penis can rest on it.
  const { width, depth } = shape.sack;
  const sackAt = (ring: number, spoke: number): Vec => {
    const p = (ring * PENIS_SPOKES + spoke) * 2;
    if (ring === 0) {
      const from = on[patch.sackPick[p]];
      const v = patch.sackPick[p + 1] * 3;
      return [from[v], from[v + 1], from[v + 2]];
    }
    const t = sackRing(ring);
    const { at, way } = sackPath(frame, shape, t);
    if (ring === SCROTUM_LAST) return at;
    // Across the way it runs: to his side, and the third way, which is up at the mouth and out of him lower down.
    const across = frame.side;
    const third = unit(cross(across, way));
    const theta = (2 * Math.PI * spoke) / PENIS_SPOKES;
    // From the mouth's size out to the sack's own over its neck.
    const mouth = [0, 1, 2].map((i) => sackAt0(spoke)[i] - frame.mouth[i]) as Vec;
    const mouthAcross = dot(mouth, across);
    const mouthThird = dot(mouth, frame.up);
    const full = sackProfile(t);
    const neck = smooth(t / 0.3);
    // A crease down its middle, front and back, between the two testicles, deepening lower down.
    const crease = 1 - 0.2 * smooth((t - 0.3) / 0.4) * (Math.exp(-(((theta - Math.PI / 2) / 0.4) ** 2)) + Math.exp(-(((theta - 1.5 * Math.PI) / 0.4) ** 2)));
    const a = lerp(mouthAcross, width * full * Math.cos(theta), neck) * crease;
    const b = lerp(mouthThird, depth * full * Math.sin(theta), neck) * crease;
    return add(add(at, across, a), third, b);
  };
  const sackAt0 = (spoke: number): Vec => sackAt(0, spoke);
  const position = (ring: number, spoke: number): Vec => {
    const { s, r } = rings[ring];
    const { at, way } = along(s);
    const normal = unit(cross(frame.side, way));
    const theta = (2 * Math.PI * spoke) / PENIS_SPOKES;
    return add(add(at, frame.side, Math.cos(theta) * r), normal, Math.sin(theta) * r);
  };

  // Held in his clothes, whatever stands out in front of where it leaves him is pressed back towards him.
  const press = PACKED_PRESS * shape.packed * (1 - 0.5 * shape.stand);
  const pressed = (p: Vec): Vec => {
    const d = dot(add(p, frame.root, -1), frame.out);
    return d > 0 && press > 0 ? add(p, frame.out, -d * press) : p;
  };

  patch.rings.forEach((rs, mesh) => {
    const target = out[mesh];
    const spokes = patch.spokes[mesh];
    const sack = mesh >= patch.tubeMeshes;
    for (let v = 0; v < rs.length; v++) {
      const p = pressed(sack ? sackAt(rs[v], spokes[v]) : position(rs[v], spokes[v]));
      target[v * 3] = p[0];
      target[v * 3 + 1] = p[1];
      target[v * 3 + 2] = p[2];
    }
  });
}
