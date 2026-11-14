/**
 * Her face's expressions. Her face is drawn in flat planes with no bones of its own (build_world.py's head_grid): a
 * round black dot for each eye, a dark strip for each brow, and the lips' planes meeting at the corners of her mouth.
 * An expression moves those points on the model (Dresser.setExpression in appearance.ts): her eyes' upper and lower
 * edges closing in like lids, her eyes looking aside, her brows rising or knitting, the corners of her mouth turning
 * up or down, her mouth opening (her lower lip, chin, lower teeth and tongue dropping, as her jaw would, and the
 * inside of her mouth and her upper teeth showing); and her cheeks flush.
 *
 * Which expression she wears comes from what she's doing (`expressionFor`): showing a guest something (shy, or sultry
 * once she wants it), reacting to a touch, or otherwise at ease, her lids heavier as she's aroused or drunk.
 */
import type { Reaction } from "./player";

/** How far each part of her face has moved from at rest. All are 0 at rest. */
export interface FaceShape {
  /** Both brows raised (1) or lowered (-1). */
  brow: number;
  /** The inner ends of her brows raised (worried, 1) or drawn down (cross, -1). */
  browInner: number;
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
  /** Her cheeks flushed, 0 to 1. */
  blush: number;
}

export const FACE_KEYS: readonly (keyof FaceShape)[] = [
  "brow", "browInner", "lidUpper", "lidLower", "wide", "lookX", "lookY", "smile", "smirk", "open", "blush",
];

export const REST_FACE: Readonly<FaceShape> = {
  brow: 0, browInner: 0, lidUpper: 0, lidLower: 0, wide: 0, lookX: 0, lookY: 0, smile: 0, smirk: 0, open: 0, blush: 0,
};

export type Expression = "neutral" | "smile" | "shy" | "sultry" | "surprised" | "pleasure" | "annoyed";
export const EXPRESSIONS_LIST: readonly Expression[] = ["neutral", "smile", "shy", "sultry", "surprised", "pleasure", "annoyed"];

const face = (shape: Partial<FaceShape>): FaceShape => ({ ...REST_FACE, ...shape });

export const EXPRESSIONS: Readonly<Record<Expression, FaceShape>> = {
  neutral: face({}),
  // Her eyes crinkle from below as she smiles, her lips parting on her teeth.
  smile: face({ smile: 0.8, lidLower: 0.3, brow: 0.15, open: 0.2 }),
  // Brows up and worried, eyes down and away, a small nervous smile, flushed.
  shy: face({ brow: 0.3, browInner: 0.8, lidUpper: 0.15, lookX: 0.5, lookY: -0.8, smile: 0.25, blush: 0.85 }),
  // Heavy lids, brows at ease, lips just parted in a smirk, a little flushed.
  sultry: face({ brow: -0.15, browInner: -0.1, lidUpper: 0.5, lidLower: 0.1, lookY: -0.1, smile: 0.25, smirk: 0.75, open: 0.12, blush: 0.5 }),
  // Brows high, eyes wide, mouth open.
  surprised: face({ brow: 1, browInner: 0.3, wide: 1, smile: -0.15, open: 0.7, blush: 0.2 }),
  // Eyes nearly shut, brows up in the middle, mouth open on a moan, flushed.
  pleasure: face({ brow: 0.35, browInner: 0.8, lidUpper: 0.85, lidLower: 0.25, smile: 0.2, open: 0.55, blush: 1 }),
  // Brows knitted down, eyes narrowed, mouth turned down.
  annoyed: face({ brow: -0.4, browInner: -1, lidUpper: 0.35, lidLower: 0.2, smile: -0.7 }),
};

/** Partway from one face to another, `t` of the way (0 to 1). */
export function blendFace(a: FaceShape, b: FaceShape, t: number): FaceShape {
  const out = { ...a };
  for (const key of FACE_KEYS) out[key] = a[key] + (b[key] - a[key]) * t;
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

/** What she's going through, for her face. */
export interface FaceCause {
  /** Showing a guest something: how far past what it takes she is (desire ÷ 10, see SULTRY_PAST); null if not. */
  showing: number | null;
  /** A touch she's reacting to, if any. */
  reaction: Reaction | null;
  /** How aroused she shows, and how drunk she is, each 0 to 1. */
  arousal: number;
  drunk: number;
}

/** A touch's reaction on her face. */
const REACTION_FACE: Readonly<Record<Reaction, Expression>> = { jolt: "surprised", melt: "pleasure", recoil: "annoyed" };

/** The expression her face goes to. */
export function expressionFor(cause: FaceCause): Expression {
  if (cause.reaction) return REACTION_FACE[cause.reaction];
  if (cause.showing !== null) return cause.showing >= SULTRY_PAST ? "sultry" : "shy";
  return "neutral";
}

/**
 * Her face as it goes now: the expression, and over it her lids heavy and her cheeks flushed as she's aroused or
 * drunk (at most this much).
 */
export const HEAVY_LIDS = { arousal: 0.3, drunk: 0.35 };
export const FLUSH = { arousal: 0.7, drunk: 0.6 };

export function faceFor(cause: FaceCause): FaceShape {
  const shape = { ...EXPRESSIONS[expressionFor(cause)] };
  const a = Math.min(1, Math.max(0, cause.arousal));
  const d = Math.min(1, Math.max(0, cause.drunk));
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
export type FacePart = "brow" | "teeth" | "skin";

/** How far the parts move at full strength (metres). */
export const FACE_REACH = {
  /** Brows raised, and their inner ends. Lowered, they go only so far, so as not to sink into her brow. */
  brow: 0.006,
  browInner: 0.006,
  browLow: 0.003,
  /** Eyes opened wide (share of their size) and looking aside (share of their half size). */
  wide: 0.22,
  look: 0.35,
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
    const up = shape.brow * FACE_REACH.brow + shape.browInner * FACE_REACH.browInner * (1 - t);
    out[1] = y + Math.max(-FACE_REACH.browLow, up);
    return up !== 0;
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
