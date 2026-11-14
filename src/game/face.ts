/**
 * Her face's expressions. Her face is drawn in flat planes with no bones of its own (build_world.py's head_grid): a
 * round black dot for each eye, a dark strip for each brow, and the lips' planes meeting at the corners of her mouth.
 * An expression moves those points on the model (Dresser.setExpression in appearance.ts): her eyes' upper and lower
 * edges closing in like lids, her eyes looking aside, her brows rising or knitting, the corners of her mouth turning
 * up or down, her mouth opening (her lower lip, chin, lower teeth and tongue dropping, as her jaw would, and the
 * inside of her mouth and her upper teeth showing); and her cheeks flush.
 *
 * Which expression she wears comes from what she's going through, the way Karryn's Prison does it (`faceFor`): her
 * bearing from her Slut Level (stern, at ease, then confident), and over it her state (tired as her willpower runs out,
 * embarrassed as her clothes come off, drunk, worked up); or what she's in the middle of (an after-hours game, showing
 * a guest something, a brawl); or for a moment, what just happened (a tip, a guest walking out, saying no) or a touch.
 */
import type { Reaction } from "./player";

/** How far each part of her face has moved from at rest. All are 0 at rest. */
export interface FaceShape {
  /** Both brows raised (1) or lowered (-1). */
  brow: number;
  /** The inner ends of her brows raised (worried, 1) or drawn down (cross, -1). */
  browInner: number;
  /** The middle of each brow arched up (1) or flattened down (-1). */
  browArch: number;
  /** The outer ends of her brows up (1) or curving down towards her temples (-1). */
  browOuter: number;
  /** The upper edge of each eye come down, 0 open to 1 shut. */
  lidUpper: number;
  /** The lower edge come up, 0 to 1 shut. */
  lidLower: number;
  /** Her eyes opened wide, 0 to 1. */
  wide: number;
  /** Where her eyes look: across (her own left -1, right 1) and up (1) or down (-1). */
  lookX: number;
  lookY: number;
  /** Both corners of her mouth up (1) or down (-1). */
  smile: number;
  /** Her own left corner of her mouth up on its own: a smirk. */
  smirk: number;
  /** Her mouth open, 0 shut to 1 as wide as it goes. */
  open: number;
  /** Her tongue out over her lower lip, 0 in to 1 as far as it goes. */
  tongue: number;
  /** Her cheeks flushed, 0 to 1. */
  blush: number;
}

export const FACE_KEYS: readonly (keyof FaceShape)[] = [
  "brow", "browInner", "browArch", "browOuter", "lidUpper", "lidLower", "wide", "lookX", "lookY", "smile", "smirk", "open",
  "tongue", "blush",
];

export const REST_FACE: Readonly<FaceShape> = {
  brow: 0, browInner: 0, browArch: 0, browOuter: 0, lidUpper: 0, lidLower: 0, wide: 0, lookX: 0, lookY: 0, smile: 0, smirk: 0,
  open: 0, tongue: 0, blush: 0,
};

export type Expression =
  | "neutral" | "stern" | "confident" | "smile" | "shy" | "sultry" | "embarrassed" | "tired" | "drunk" | "angry"
  | "surprised" | "overwhelmed" | "aroused" | "pleasure" | "edge" | "lost" | "annoyed";
export const EXPRESSIONS_LIST: readonly Expression[] = [
  "neutral", "stern", "confident", "smile", "shy", "sultry", "embarrassed", "tired", "drunk", "angry", "surprised", "overwhelmed",
  "aroused", "pleasure", "edge", "lost", "annoyed",
];

const face = (shape: Partial<FaceShape>): FaceShape => ({ ...REST_FACE, ...shape });

export const EXPRESSIONS: Readonly<Record<Expression, FaceShape>> = {
  neutral: face({}),
  // Her bearing before the tavern's had its way with her: brows level and a touch low, mouth set.
  stern: face({ brow: -0.3, browInner: -0.4, browOuter: 0.15, lidUpper: 0.1, smile: -0.2 }),
  // Her bearing once it has: easy brows, lids a little low, a knowing half smile.
  confident: face({ brow: -0.15, browInner: -0.15, browArch: 0.3, browOuter: 0.35, lidUpper: 0.25, smile: 0.3, smirk: 0.45 }),
  // Her eyes crinkle from below as she smiles, her lips parting on her teeth.
  smile: face({ smile: 0.8, lidLower: 0.3, brow: 0.25, browArch: 0.5, browOuter: -0.2, open: 0.2 }),
  // Brows up and worried, eyes down and away, a small nervous smile, flushed.
  shy: face({ brow: 0.2, browInner: 0.9, browOuter: -0.6, lidUpper: 0.15, lookX: 0.5, lookY: -0.8, smile: 0.25, blush: 0.85 }),
  // Heavy lids under low brows, lips just parted in a smirk, a little flushed.
  sultry: face({ brow: -0.85, browArch: 0.3, browOuter: 0.3, lidUpper: 0.5, lidLower: 0.1, lookY: -0.1, smile: 0.25, smirk: 0.75, open: 0.12, blush: 0.5 }),
  // Caught with too little on: brows high and worried, eyes away, mouth tight, red to the ears.
  embarrassed: face({ brow: 0.4, browInner: 1, browOuter: -0.7, wide: 0.2, lookX: -0.6, lookY: -0.4, smile: -0.35, blush: 1 }),
  // Worn down: heavy lids, brows sagging up in the middle, mouth drooping a little open.
  tired: face({ brow: -0.3, browInner: 0.6, browOuter: -0.6, lidUpper: 0.55, lidLower: 0.1, lookY: -0.3, smile: -0.25, open: 0.1 }),
  // Drunk: lids heavy, brows lifted and loose, a lopsided smile, flushed.
  drunk: face({ brow: 0.2, browInner: 0.4, browOuter: -0.4, lidUpper: 0.5, smile: 0.4, smirk: 0.3, open: 0.15, blush: 0.75 }),
  // Squaring up to someone: brows hard down and knitted, eyes narrowed, teeth showing.
  angry: face({ brow: -0.6, browInner: -1, browOuter: 0.6, lidUpper: 0.3, lidLower: 0.25, smile: -0.6, open: 0.12 }),
  // Brows arched high, curving down at the ends, eyes wide, mouth open.
  surprised: face({ brow: 0.8, browInner: 0.3, browArch: 1, browOuter: -0.5, wide: 1, smile: -0.15, open: 0.7, blush: 0.2 }),
  // Too much at once: brows up and pinched, eyes squeezed, mouth stretched wide on her teeth, red.
  overwhelmed: face({ brow: 0.3, browInner: 1, browOuter: -0.8, lidUpper: 0.8, lidLower: 0.5, smile: -0.5, open: 0.6, blush: 0.9 }),
  // Worked up: low brows lifting in the middle, lids low, lips parted, flushed.
  aroused: face({ brow: -0.5, browInner: 0.6, browOuter: -0.4, lidUpper: 0.45, lidLower: 0.1, smile: 0.1, open: 0.3, blush: 0.8 }),
  // Eyes nearly shut, brows up in the middle and down at the ends, mouth open on a moan, flushed.
  pleasure: face({ brow: 0.15, browInner: 1, browArch: 0.3, browOuter: -0.8, lidUpper: 0.85, lidLower: 0.25, smile: 0.2, open: 0.55, blush: 1 }),
  // On the edge: eyes screwed shut, brows high and pinched, mouth wide open, as red as she gets.
  edge: face({ brow: 0.5, browInner: 1, browArch: 0.3, browOuter: -0.9, lidUpper: 1, lidLower: 0.4, smile: -0.1, open: 0.9, blush: 1 }),
  // Past it: eyes rolled up under heavy lids, brows high and helpless, mouth hanging open, tongue out.
  lost: face({ brow: 0.6, browInner: 1, browArch: 0.4, browOuter: -0.8, lidUpper: 0.45, lookY: 1, smile: 0.15, open: 1, tongue: 1, blush: 1 }),
  // Brows knitted down, eyes narrowed, mouth turned down.
  annoyed: face({ brow: -0.4, browInner: -1, browOuter: 0.3, lidUpper: 0.35, lidLower: 0.2, smile: -0.7 }),
};

/** Partway from one face to another, `t` of the way (0 to 1). */
export function blendFace(a: FaceShape, b: FaceShape, t: number): FaceShape {
  const out = { ...a };
  const k = Math.min(1, Math.max(0, t));
  for (const key of FACE_KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  return out;
}

/** How quickly her face changes from one expression to the next, per second. */
export const FACE_EASE = 6;

/** Her face `dt` seconds further on towards `to`. */
export function easeFace(from: FaceShape, to: FaceShape, dt: number): FaceShape {
  return blendFace(from, to, 1 - Math.exp(-FACE_EASE * dt));
}

/** Whether two faces differ enough to be worth moving her face for. */
export function faceMoved(a: FaceShape, b: FaceShape): boolean {
  return FACE_KEYS.some((key) => Math.abs(a[key] - b[key]) >= 0.02);
}

/** Showing a guest something, she's sultry once she's this far past what it takes (desire ÷ 10); short of it, shy. */
export const SULTRY_PAST = 2;

/** Something that just happened, showing on her face for a moment: a tip, a guest walking out on her, saying no. */
export type FaceMoment = "tipped" | "walkedOut" | "refused";
const MOMENT_FACE: Readonly<Record<FaceMoment, Expression>> = { tipped: "smile", walkedOut: "annoyed", refused: "angry" };
/** How long a moment shows, in seconds. */
export const MOMENT_TIME: Readonly<Record<FaceMoment, number>> = { tipped: 1.6, walkedOut: 1.8, refused: 1.4 };

/** What she's going through, for her face. Everything past `drunk` can be left out. */
export interface FaceCause {
  /** Showing a guest something: how far past what it takes she is (desire ÷ 10, see SULTRY_PAST); null if not. */
  showing: number | null;
  /** A touch she's reacting to, if any. */
  reaction: Reaction | null;
  /** How aroused she shows, and how drunk she is, each 0 to 1. */
  arousal: number;
  drunk: number;
  /** Her Slut Level: how far the tavern's had its way with her. */
  slut?: number;
  /** How much of her willpower is left, 0 to 1. */
  will?: number;
  /** How much of her clothes are off tonight, 0 to 1. */
  exposed?: number;
  /** In a brawl. */
  fighting?: boolean;
  /** In an after-hours game: how far gone she is (duel.ts's states), and her pleasure, 0 to 1. */
  duel?: { state: "calm" | "aroused" | "edge"; pleasure: number } | null;
  /** Something that just happened. */
  moment?: FaceMoment | null;
}

/** Jolted by a touch while she's this aroused, she's overwhelmed rather than surprised. */
export const OVERWHELMED_AT = 0.6;
/** On the edge in an after-hours game, past this much pleasure she starts to lose herself. */
export const LOST_FROM = 0.85;

/** A touch's reaction on her face. */
const REACTION_FACE: Readonly<Record<Reaction, Expression>> = { jolt: "surprised", melt: "pleasure", recoil: "annoyed" };

/**
 * Her bearing, from her Slut Level: stern at none, at ease by `BEARING.easy`, confident by `BEARING.confident`.
 * Over it, as her state goes: tired as her willpower runs out (from `BEARING.tiredBelow` left), embarrassed as her
 * clothes come off (less the lewder she is: not at all by `BEARING.shameless`), drunk, and worked up.
 */
export const BEARING = { easy: 2, confident: 5, tiredBelow: 0.5, shameless: 6 };

/**
 * The expression that leads her face: a reaction to a touch first, then a moment, then what she's in the middle of
 * (an after-hours game, showing a guest something, a brawl); otherwise her bearing.
 */
export function expressionFor(cause: FaceCause): Expression {
  return leading(cause) ?? bearing(cause.slut ?? 0).main;
}

/** What's happening that leads her face, if anything; null leaves it to her bearing and her state. */
function leading(cause: FaceCause): Expression | null {
  if (cause.reaction) return cause.reaction === "jolt" && cause.arousal >= OVERWHELMED_AT ? "overwhelmed" : REACTION_FACE[cause.reaction];
  if (cause.moment) return MOMENT_FACE[cause.moment];
  if (cause.duel && cause.duel.state !== "calm") return cause.duel.state === "edge" ? "edge" : "aroused";
  if (cause.showing !== null) return cause.showing >= SULTRY_PAST ? "sultry" : "shy";
  if (cause.fighting) return "angry";
  return null;
}

/** Her bearing at a Slut Level: the expression it leans to, and how far. */
function bearing(slut: number): { main: Expression; face: FaceShape } {
  const { easy, confident } = BEARING;
  if (slut <= easy) return { main: slut < easy / 2 ? "stern" : "neutral", face: blendFace(EXPRESSIONS.stern, EXPRESSIONS.neutral, slut / easy) };
  const t = (slut - easy) / (confident - easy);
  return { main: t < 0.5 ? "neutral" : "confident", face: blendFace(EXPRESSIONS.neutral, EXPRESSIONS.confident, t) };
}

/**
 * Her lids heavy and her cheeks flushed as she's aroused or drunk, at most this much, whatever her expression.
 */
export const HEAVY_LIDS = { arousal: 0.3, drunk: 0.35 };
export const FLUSH = { arousal: 0.7, drunk: 0.6 };

/** Her face as it goes now (see `expressionFor` and `BEARING`). */
export function faceFor(cause: FaceCause): FaceShape {
  const main = leading(cause);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  let shape: FaceShape;
  if (!main) {
    // Nothing in particular going on: her bearing, and her state over it.
    const slut = cause.slut ?? 0;
    shape = bearing(slut).face;
    const tired = clamp(1 - (cause.will ?? 1) / BEARING.tiredBelow);
    shape = blendFace(shape, EXPRESSIONS.tired, tired);
    const shame = clamp(cause.exposed ?? 0) * clamp(1 - slut / BEARING.shameless);
    shape = blendFace(shape, EXPRESSIONS.embarrassed, shame);
    shape = blendFace(shape, EXPRESSIONS.drunk, clamp(cause.drunk) * 0.8);
    shape = blendFace(shape, EXPRESSIONS.aroused, clamp(cause.arousal) * 0.5);
  } else {
    shape = { ...EXPRESSIONS[main] };
    // Deep in an after-hours game, her pleasure takes her further: worked up towards pleasure, and on the edge, lost.
    if (cause.duel && main === "aroused") shape = blendFace(shape, EXPRESSIONS.pleasure, clamp(cause.duel.pleasure));
    if (cause.duel && main === "edge") shape = blendFace(shape, EXPRESSIONS.lost, clamp((cause.duel.pleasure - LOST_FROM) / (1 - LOST_FROM)));
  }
  const a = clamp(cause.arousal);
  const d = clamp(cause.drunk);
  shape.lidUpper = Math.min(1, Math.max(shape.lidUpper, a * HEAVY_LIDS.arousal, d * HEAVY_LIDS.drunk));
  shape.blush = Math.min(1, Math.max(shape.blush, a * FLUSH.arousal, d * FLUSH.drunk));
  return shape;
}

// Where the parts of her face are, found on the model (`faceRig`), and how an expression moves each point of it
// (`faceMove`), in the model's space as built: y up, forwards -z, metres.

/** One eye: the middle of its dot and the dot's half width and half height. */
export interface EyeRig {
  centre: [number, number, number];
  half: [number, number];
}

export interface FaceRig {
  /** Her eyes: her own left (-x) first. */
  eyes: [EyeRig, EyeRig];
  /** Her brows: how far out from the middle each runs, inner end to outer end. */
  brows: [number, number];
  /** The corners of her mouth: her own left first. */
  corners: [[number, number, number], [number, number, number]];
  /** How high her mouth line is: her upper lip's lower edge, level, with her lower lip's just below. */
  line: number;
}

/** What a point of her face is: her brows' and her upper teeth's move in their own ways; the rest by where it is. */
export type FacePart = "brow" | "teeth" | "tongue" | "skin";

/** How far the parts move at full strength (metres). */
export const FACE_REACH = {
  /**
   * Brows raised, and their inner ends. Lowered, they go only so far (`browLow`), and come forwards as they go
   * (`browForward` of the drop), so as not to sink into her brow. Drawn down in the middle, they knit in towards
   * each other (`browKnit`).
   */
  brow: 0.009,
  browInner: 0.009,
  browArch: 0.004,
  browOuter: 0.006,
  browLow: 0.006,
  browForward: 0.5,
  browKnit: 0.003,
  /** Eyes opened wide (share of their size) and looking aside (share of their half size). */
  wide: 0.22,
  look: 0.45,
  /** The corners of her mouth up and out, and back into her face as they go up. */
  smileUp: 0.009,
  smileOut: 0.003,
  smileBack: 0.001,
  /** How far round each corner of her mouth the skin goes with it. */
  corner: 0.017,
  /** How much past the edge of an eye's dot still counts as the eye. */
  eyeEdge: 1.1,
  /** Her mouth wide open: how far her jaw drops, and swings back. */
  jaw: 0.014,
  jawBack: 0.003,
  /**
   * What drops with her jaw: everything below her mouth line (by more than `jawGap`) down to `jawDepth` below it, all
   * of it in the middle, less towards the sides: none past `jawWide` out at her mouth line, widening to `jawWideLow`
   * down at her chin (`jawChin` below the line), all of it within `jawFull` of that.
   */
  jawGap: 0.00004,
  jawDepth: 0.035,
  jawChin: 0.027,
  jawWide: 0.016,
  jawWideLow: 0.05,
  jawFull: 0.35,
  /** Her tongue all the way out: how far forwards, lifted up onto her lower lip as it comes. */
  tongueOut: 0.011,
  tongueUp: 0.0028,
};

/**
 * Finds her eyes, brows and mouth from the points of the meshes they're drawn in (as shaped): her eye dots', her
 * brows' and her lips'. Null if any are missing.
 */
export function faceRig(eyes: readonly number[][], brows: readonly number[][], lips: readonly number[][]): FaceRig | null {
  if (!eyes.length || !brows.length || !lips.length) return null;
  const eye = (side: number): EyeRig | null => {
    const points = eyes.filter((p) => Math.sign(p[0]) === side);
    if (!points.length) return null;
    const span = (k: number) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))];
    const [x0, x1] = span(0);
    const [y0, y1] = span(1);
    const z = points.reduce((sum, p) => sum + p[2], 0) / points.length;
    return { centre: [(x0 + x1) / 2, (y0 + y1) / 2, z], half: [(x1 - x0) / 2, (y1 - y0) / 2] };
  };
  const left = eye(-1);
  const right = eye(1);
  if (!left || !right) return null;
  const across = brows.map((p) => Math.abs(p[0]));
  const corner = (side: number): [number, number, number] => {
    const points = lips.filter((p) => p[0] * side > 0);
    const out = points.reduce((best, p) => (Math.abs(p[0]) > Math.abs(best[0]) ? p : best), points[0] ?? [0, 0, 0]);
    return [out[0], out[1], out[2]];
  };
  const corners: FaceRig["corners"] = [corner(-1), corner(1)];
  return { eyes: [left, right], brows: [Math.min(...across), Math.max(...across)], corners, line: (corners[0][1] + corners[1][1]) / 2 };
}

/** How much of her jaw's drop a point of her face below her mouth line takes, 0 to 1 (FACE_REACH.jaw*). */
export function jawWeight(rig: FaceRig, x: number, y: number, z: number): number {
  const below = rig.line - y;
  if (below <= FACE_REACH.jawGap || below > FACE_REACH.jawDepth || z > rig.corners[0][2] + 0.02) return 0;
  const t = Math.min(1, below / FACE_REACH.jawChin);
  const wide = FACE_REACH.jawWide + (FACE_REACH.jawWideLow - FACE_REACH.jawWide) * t;
  const full = wide * FACE_REACH.jawFull;
  const s = Math.min(1, Math.max(0, (Math.abs(x) - full) / (wide - full)));
  return 1 - s * s * (3 - 2 * s);
}

/**
 * Where an expression takes a point of her face (`p`, as shaped), written into `out`; false if it doesn't move it.
 * `part` says what it is: her brows move on their own, her upper teeth stay with her skull, the rest moves by where it is.
 */
export function faceMove(rig: FaceRig, shape: FaceShape, p: readonly number[], part: FacePart, out: number[]): boolean {
  const [x, y, z] = p;
  out[0] = x;
  out[1] = y;
  out[2] = z;
  if (part === "teeth") return false;
  if (part === "brow") {
    const [inner, outer] = rig.brows;
    const t = Math.min(1, Math.max(0, (Math.abs(x) - inner) / Math.max(1e-6, outer - inner)));
    const raised =
      shape.brow * FACE_REACH.brow +
      shape.browInner * FACE_REACH.browInner * (1 - t) +
      shape.browArch * FACE_REACH.browArch * 4 * t * (1 - t) +
      shape.browOuter * FACE_REACH.browOuter * t * t;
    const up = Math.max(-FACE_REACH.browLow, raised);
    const knit = Math.max(0, -shape.browInner) * FACE_REACH.browKnit * (1 - t);
    out[0] = x - Math.sign(x) * knit;
    out[1] = y + up;
    out[2] = z + Math.min(0, up) * FACE_REACH.browForward;
    return up !== 0 || knit !== 0;
  }
  let moved = false;
  for (const eye of rig.eyes) {
    const [cx, cy, cz] = eye.centre;
    const [hw, hh] = eye.half;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.abs(dx) > hw * FACE_REACH.eyeEdge || Math.abs(dy) > hh * FACE_REACH.eyeEdge || z > cz + 0.01) continue;
    const scale = 1 + shape.wide * FACE_REACH.wide;
    // Each half of the dot closes in towards the middle like a lid, never quite to nothing: shut, a dark line.
    const lid = Math.max(0.06, dy > 0 ? 1 - shape.lidUpper : 1 - shape.lidLower);
    out[0] = cx + dx * scale + shape.lookX * hw * FACE_REACH.look;
    out[1] = cy + dy * scale * lid + shape.lookY * hh * FACE_REACH.look;
    moved = true;
  }
  if (moved) return true;
  rig.corners.forEach((corner, i) => {
    const d = Math.hypot(x - corner[0], y - corner[1]);
    if (d >= FACE_REACH.corner || z > corner[2] + 0.012) return;
    const w = (1 - d / FACE_REACH.corner) ** 2;
    const side = i === 0 ? -1 : 1;
    const lift = shape.smile + (i === 0 ? shape.smirk : 0);
    if (lift === 0) return;
    out[0] += side * FACE_REACH.smileOut * Math.max(0, lift) * w;
    out[1] += FACE_REACH.smileUp * lift * w;
    out[2] += FACE_REACH.smileBack * Math.max(0, lift) * w;
    moved = true;
  });
  // Her tongue comes out over her lower lip.
  if (part === "tongue" && shape.tongue > 0) {
    out[2] -= FACE_REACH.tongueOut * shape.tongue;
    out[1] += FACE_REACH.tongueUp * shape.tongue;
    moved = true;
  }
  // Her jaw drops, and her lower lip, teeth and tongue with it.
  if (shape.open > 0) {
    const w = jawWeight(rig, x, y, z);
    if (w > 0) {
      out[1] -= FACE_REACH.jaw * shape.open * w;
      out[2] += FACE_REACH.jawBack * shape.open * w;
      moved = true;
    }
  }
  return moved;
}
