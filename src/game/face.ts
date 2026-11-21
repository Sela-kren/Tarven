/**
 * Her face's expressions, the way Karryn's Prison builds Karryn's (EXPRESSION_STUDY.md): a face is her brows, her eyes
 * and her mouth, each a part of its own, and the game picks one of each and lays them together. Each part of each
 * expression is a shape key sculpted in Blender (art/female_face_keys.blend: "Brow_angry", "Eye_tired",
 * "Mouth_panting"...), and the game plays them as morph targets on her face's meshes (facekeys.ts, appearance.ts
 * Dresser.setExpression), mixing as many as it likes: from one expression to the next, one expression's brows with
 * another's mouth (fightface.ts), half of one mouth and half of another (VARIANTS).
 *
 * Over the parts go a few keys of their own: her lids shutting (`blink`, which takes her eyes from whatever they're doing
 * to shut), where she looks (`lookX`, `lookY`) and her pupils' size (`pupil`); and what's drawn on her rather than
 * sculpted: her blush, the creases between her brows, wet eyes, tears, heart pupils and sweat.
 *
 * Which expression she wears comes from what she's going through, the way Karryn's Prison does it (`faceFor`): her
 * bearing from her Slut Level (stern, at ease, then confident), and over it her state (tired as her willpower runs out,
 * embarrassed as her clothes come off, drunk, worked up); or what she's in the middle of (an after-hours game, showing
 * a guest something, a brawl); or for a moment, what just happened (a tip, a guest walking out, saying no) or a touch.
 */
import type { Reaction } from "./player";

export type Expression =
  | "neutral" | "stern" | "confident" | "smile" | "shy" | "sultry" | "embarrassed" | "tired" | "drunk" | "angry"
  | "surprised" | "overwhelmed" | "bashful" | "aroused" | "panting" | "strained" | "blissful" | "delighted" | "pleasure" | "edge"
  | "lost" | "annoyed" | "set" | "gritted" | "spent";
export const EXPRESSIONS_LIST: readonly Expression[] = [
  "neutral", "stern", "confident", "smile", "shy", "sultry", "embarrassed", "tired", "drunk", "angry", "surprised", "overwhelmed",
  "bashful", "aroused", "panting", "strained", "blissful", "delighted", "pleasure", "edge", "lost", "annoyed", "set", "gritted", "spent",
];

/** The three parts a face is laid together from, as KP's layers are. */
export type FacePart = "brows" | "eyes" | "mouth";
export const FACE_PARTS: readonly FacePart[] = ["brows", "eyes", "mouth"];
/** Each part's shape keys are named its prefix and the expression: "Brow_angry", "Eye_angry", "Mouth_angry". */
export const PART_PREFIX: Readonly<Record<FacePart, string>> = { brows: "Brow", eyes: "Eye", mouth: "Mouth" };
/** How much of each expression's part she wears, 0 to 1 each; what's left of 1 is her face at rest there. */
export type PartMix = Partial<Record<Expression, number>>;

/** Her face: how much of each expression's brows, eyes and mouth, and the rest over them. */
export interface FaceShape {
  brows: PartMix;
  eyes: PartMix;
  mouth: PartMix;
  /** Her lids shut, 0 to 1, from whatever her eyes are doing: a blink, or her lids heavy (the "Blink" key). */
  blink: number;
  /**
   * Where her eyes look, over where her expression has them: across (her own left -1, right 1) and up (1) or down (-1)
   * ("Look_Left", "Look_Right", "Look_Up", "Look_Down").
   */
  lookX: number;
  lookY: number;
  /** Her pupils widened (1, aroused, drunk) or tightened to points (-1, angry, startled) ("Pupil_Big", "Pupil_Small"). */
  pupil: number;
  /** Her cheeks flushed, 0 to 1. Deep enough (FACE_LINES.hatch), a blush's strokes show on her cheeks. */
  blush: number;
  /** Creases between her brows as she frowns or strains, 0 to 1: two lines from FACE_LINES.creases[0], three from [1]. */
  crease: number;
  /**
   * KP's extra layers (EXPRESSION_STUDY.md), each 0 to 1 and shown past FACE_EXTRAS: wet, glossy eyes (`uru`); tears
   * (`namida`); heart pupils, for when she's fully gone; and sweat, a few drops then more (KP's sweat 1 and 2).
   */
  wet: number;
  tears: number;
  heart: number;
  sweat: number;
}

/** A face's numbers (all but its parts). */
export type FaceNumber = Exclude<keyof FaceShape, FacePart>;
export const FACE_NUMBERS: readonly FaceNumber[] = ["blink", "lookX", "lookY", "pupil", "blush", "crease", "wet", "tears", "heart", "sweat"];

/** When the lines an expression draws on her face show: two creases, three, and the strokes of a deep blush. */
export const FACE_LINES = { creases: [0.35, 0.7] as const, hatch: 0.7 };
/** When KP's extra layers show: wet eyes, tears, heart pupils, and a few drops of sweat then more. */
export const FACE_EXTRAS = { wet: 0.5, tears: 0.5, heart: 0.5, sweat: [0.35, 0.75] as const };

export const REST_FACE: Readonly<FaceShape> = Object.freeze({
  brows: Object.freeze({}), eyes: Object.freeze({}), mouth: Object.freeze({}),
  blink: 0, lookX: 0, lookY: 0, pupil: 0, blush: 0, crease: 0, wet: 0, tears: 0, heart: 0, sweat: 0,
});

/** Her shape keys besides the parts: her lids shut, her eyes looking each way, her pupils grown and shrunk. */
export const OVER_KEYS = ["Blink", "Look_Left", "Look_Right", "Look_Up", "Look_Down", "Pupil_Big", "Pupil_Small"] as const;
/**
 * Every shape key her face has (or can have): each expression's brows, eyes and mouth (neutral is her face at rest, so
 * it has none), and OVER_KEYS.
 */
export const FACE_KEY_NAMES: readonly string[] = [
  ...FACE_PARTS.flatMap((part) => EXPRESSIONS_LIST.filter((e) => e !== "neutral").map((e) => `${PART_PREFIX[part]}_${e}`)),
  ...OVER_KEYS,
];

/**
 * What each expression has besides its parts: where it has her look, her pupils, and what's drawn on her face. Its
 * brows, eyes and mouth are its shape keys.
 */
const OVER: Readonly<Record<Expression, Partial<Record<FaceNumber, number>>>> = {
  neutral: {},
  stern: {},
  confident: {},
  smile: {},
  shy: { lookX: 0.5, lookY: -0.8, blush: 0.85, crease: 0.4 },
  sultry: { lookY: -0.1, pupil: 0.3, blush: 0.5 },
  embarrassed: { lookX: -0.6, lookY: -0.4, blush: 1, crease: 0.5 },
  tired: { lookY: -0.3, crease: 0.4 },
  drunk: { pupil: 0.3, blush: 0.75 },
  angry: { pupil: -0.4, crease: 1 },
  surprised: { pupil: -0.6, blush: 0.2 },
  overwhelmed: { pupil: -0.3, blush: 0.9, crease: 1, tears: 0.6 },
  aroused: { pupil: 0.4, blush: 0.8 },
  bashful: { lookX: 0.3, lookY: -0.9, blush: 1, crease: 0.4 },
  panting: { lookY: 0.2, blush: 1, crease: 0.4 },
  strained: { blush: 0.9, crease: 1, tears: 0.7 },
  blissful: { pupil: 0.5, blush: 0.9 },
  delighted: { pupil: 0.4, blush: 0.8 },
  pleasure: { pupil: 0.5, blush: 1, crease: 0.6 },
  edge: { pupil: 0.3, blush: 1, crease: 1 },
  lost: { lookY: 1, pupil: 0.6, blush: 1, crease: 0.6 },
  annoyed: { pupil: -0.2, crease: 0.6 },
  set: {},
  gritted: { crease: 0.4 },
  spent: { lookY: -0.3, crease: 0.4 },
};

/**
 * How shut each expression's eyes key has her lids, 0 open to 1 (as first baked: facerig.ts EXPRESSION_CONTROLS'
 * lidUpper), so heavy lids (HEAVY_LIDS) only shut them further where they aren't already.
 */
export const EYE_SHUT: Readonly<Partial<Record<Expression, number>>> = {
  stern: 0.1, confident: 0.25, shy: 0.15, sultry: 0.5, tired: 0.55, drunk: 0.5, angry: 0.3, overwhelmed: 0.8, aroused: 0.45,
  bashful: 0.35, panting: 0.6, strained: 1, blissful: 0.65, delighted: 0.35, pleasure: 0.85, edge: 1, lost: 0.3, annoyed: 0.35,
  gritted: 0.15, spent: 0.7,
};

/**
 * How thin each expression's mouth key presses her lips, 0 to 1 (as first baked: EXPRESSION_CONTROLS' press): pressed,
 * her lips' colours go too, the upper one to an ink line and the lower one into her skin (appearance.ts PRESSED_INTO).
 */
export const MOUTH_PRESS: Readonly<Partial<Record<Expression, number>>> = { bashful: 1, set: 0.35 };

/** How thin her lips are pressed in a face, 0 to 1. */
export function mouthPress(shape: FaceShape): number {
  let press = 0;
  for (const [e, w] of Object.entries(shape.mouth) as [Expression, number][]) press += w * (MOUTH_PRESS[e] ?? 0);
  return clamp01(press);
}

/** Each expression: its own brows, eyes and mouth, and what it has over them. */
export const EXPRESSIONS: Readonly<Record<Expression, FaceShape>> = Object.fromEntries(
  EXPRESSIONS_LIST.map((e) => [e, { ...REST_FACE, brows: { [e]: 1 }, eyes: { [e]: 1 }, mouth: { [e]: 1 }, ...OVER[e] }]),
) as Record<Expression, FaceShape>;

/**
 * A close variant of an expression, as KP's random pools pick another brow, eye or mouth (EXPRESSION_STUDY.md §3.5):
 * a part taken from another expression (all of it, or a share: `{ gritted: 0.5 }` is half her own, half gritted's),
 * and her look or her lids moved a little.
 */
export interface FaceVariant {
  brows?: Expression | PartMix;
  eyes?: Expression | PartMix;
  mouth?: Expression | PartMix;
  lookX?: number;
  lookY?: number;
  blink?: number;
}

/**
 * Close variants of each expression: one is picked (or none) whenever her face changes, so she never holds one fixed
 * face. `angry`'s only touch her mouth, to keep the brows the user drew.
 */
export const VARIANTS: Readonly<Record<Expression, readonly FaceVariant[]>> = {
  neutral: [{ mouth: { shy: 0.5 } }, { brows: { set: 0.5 } }],
  stern: [{ mouth: "set" }, { brows: { annoyed: 0.5 } }],
  confident: [{ mouth: { smile: 0.5 } }, { eyes: { drunk: 0.5 }, lookX: 0.25 }],
  smile: [{ mouth: { shy: 0.5 } }, { eyes: { delighted: 0.5 } }],
  shy: [{ lookX: -1 }, { mouth: "set" }],
  sultry: [{ lookX: 0.4 }, { mouth: "drunk" }],
  embarrassed: [{ lookX: 1.2 }, { mouth: { bashful: 0.5 } }],
  tired: [{ eyes: "spent", mouth: { spent: 0.5 } }, { mouth: { gritted: 0.5 } }],
  drunk: [{ mouth: { pleasure: 0.5 } }, { blink: 0.2, lookX: 0.3 }],
  angry: [{ mouth: { set: 0.5 } }, { mouth: { gritted: 0.5 } }],
  surprised: [{ mouth: { aroused: 0.5 } }, { eyes: { embarrassed: 0.5 } }],
  overwhelmed: [{ eyes: "strained", mouth: { embarrassed: 0.5 } }, { mouth: { strained: 0.5 } }],
  bashful: [{ lookX: -0.6 }, { brows: { neutral: 0.5 } }],
  aroused: [{ mouth: { panting: 0.5 } }, { eyes: { spent: 0.5 } }],
  panting: [{ mouth: { pleasure: 0.5 } }, { lookY: -0.4 }],
  strained: [{ eyes: { lost: 0.5 } }, { mouth: { gritted: 0.5 } }],
  blissful: [{ mouth: { delighted: 0.3 } }, { eyes: "pleasure" }],
  delighted: [{ mouth: { blissful: 0.5 } }, { eyes: { strained: 0.5 } }],
  pleasure: [{ mouth: { panting: 0.5 } }, { eyes: { edge: 0.5 }, lookY: 0.3 }],
  edge: [{ mouth: "surprised" }, { eyes: { delighted: 0.5 }, lookY: 0.6 }],
  lost: [{ mouth: { surprised: 0.5 } }, { lookX: 0.4, lookY: -0.4 }],
  annoyed: [{ lookX: 0.6 }, { mouth: { bashful: 0.5 } }],
  set: [{ mouth: { embarrassed: 0.5 } }, { lookX: 0.3 }],
  gritted: [{ mouth: { tired: 0.5 } }, { eyes: "bashful" }],
  spent: [{ mouth: { gritted: 0.5 } }, { eyes: "pleasure", lookY: -0.2 }],
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** A part's mix with its `from` expression's weight handed over to `to` (an expression, or shares of some). */
function handOver(mix: PartMix, from: Expression, to: Expression | PartMix): PartMix {
  const weight = mix[from] ?? 0;
  if (weight <= 0) return mix;
  const out: PartMix = { ...mix };
  const shares: PartMix = typeof to === "string" ? { [to]: 1 } : to;
  let given = 0;
  for (const [e, share] of Object.entries(shares) as [Expression, number][]) {
    out[e] = (out[e] ?? 0) + weight * share;
    given += weight * share;
  }
  out[from] = (out[from] ?? 0) - given;
  if ((out[from] ?? 0) <= 1e-6) delete out[from];
  return out;
}

/** An expression's face with its variant `variant` on it: 0 is the expression itself, then each of its VARIANTS in turn. */
export function withVariant(shape: FaceShape, expression: Expression, variant: number): FaceShape {
  const pool = VARIANTS[expression];
  const pick = ((Math.floor(variant) % (pool.length + 1)) + pool.length + 1) % (pool.length + 1);
  if (pick === 0) return shape;
  const v = pool[pick - 1];
  const out = { ...shape };
  for (const part of FACE_PARTS) {
    const to = v[part];
    if (to) out[part] = handOver(shape[part], expression, to);
  }
  if (v.lookX) out.lookX += v.lookX;
  if (v.lookY) out.lookY += v.lookY;
  if (v.blink) out.blink = clamp01(out.blink + v.blink);
  return out;
}

/** How shut her lids are in a face, 0 open to 1: her eyes keys' own (EYE_SHUT), and her blink over them. */
export function eyesShut(shape: FaceShape): number {
  let own = 0;
  for (const [e, w] of Object.entries(shape.eyes) as [Expression, number][]) own += w * (EYE_SHUT[e] ?? 0);
  own = clamp01(own);
  return own + (1 - own) * clamp01(shape.blink);
}

/** Her face with her lids at least this shut (0 to 1), by shutting them further over her eyes keys (`blink`). */
export function shutAtLeast(shape: FaceShape, shut: number): FaceShape {
  if (eyesShut(shape) >= shut) return shape;
  const own = eyesShut({ ...shape, blink: 0 });
  return { ...shape, blink: own >= 1 ? 1 : clamp01((shut - own) / (1 - own)) };
}

/** Partway from one part's mix to another's, `k` of the way. */
function blendMix(a: PartMix, b: PartMix, k: number): PartMix {
  const out: PartMix = {};
  for (const e of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<Expression>) {
    const w = (a[e] ?? 0) * (1 - k) + (b[e] ?? 0) * k;
    if (w > 1e-6) out[e] = w;
  }
  return out;
}

/** Partway from one face to another, `t` of the way (0 to 1). */
export function blendFace(a: FaceShape, b: FaceShape, t: number): FaceShape {
  const k = Math.min(1, Math.max(0, t));
  const out = { ...a };
  for (const part of FACE_PARTS) out[part] = blendMix(a[part], b[part], k);
  for (const key of FACE_NUMBERS) out[key] = a[key] + (b[key] - a[key]) * k;
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
  if (FACE_NUMBERS.some((key) => Math.abs(a[key] - b[key]) >= 0.02)) return true;
  return FACE_PARTS.some((part) => {
    const keys = new Set([...Object.keys(a[part]), ...Object.keys(b[part])]) as Set<Expression>;
    return [...keys].some((e) => Math.abs((a[part][e] ?? 0) - (b[part][e] ?? 0)) >= 0.02);
  });
}

/**
 * Her shape keys' weights for a face (FACE_KEY_NAMES), as the morph targets on her face's meshes take them: each part's
 * expressions' keys at their share (her eyes' giving way to "Blink" as she shuts them), and the look and pupil keys,
 * one of each pair by which way it goes. Keys left out are at 0.
 */
export function faceKeyWeights(shape: FaceShape): Map<string, number> {
  const out = new Map<string, number>();
  const blink = clamp01(shape.blink);
  for (const part of FACE_PARTS) {
    const keep = part === "eyes" ? 1 - blink : 1;
    for (const [e, w] of Object.entries(shape[part]) as [Expression, number][]) {
      if (e === "neutral" || !(w > 0)) continue;
      const name = `${PART_PREFIX[part]}_${e}`;
      out.set(name, (out.get(name) ?? 0) + w * keep);
    }
  }
  const pair = (value: number, minus: string, plus: string) => {
    if (value > 0) out.set(plus, value);
    else if (value < 0) out.set(minus, -value);
  };
  if (blink > 0) out.set("Blink", blink);
  pair(shape.lookX, "Look_Left", "Look_Right");
  pair(shape.lookY, "Look_Down", "Look_Up");
  pair(shape.pupil, "Pupil_Small", "Pupil_Big");
  return out;
}

/**
 * Showing a guest something, she's sultry once she's this far past what it takes (desire ÷ 10), and delighted this
 * far; short of it, shy.
 */
export const SULTRY_PAST = 2;
export const DELIGHTED_PAST = 4;
/** Barely able to show it (less than this past what it takes), she's bashful rather than shy. */
export const BASHFUL_BELOW = 1;

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
  /** In a brawl, the face picked for the moment she's in (fightface.ts), if one has been: it leads in place of anger. */
  fightFace?: FaceShape | null;
  /** In an after-hours game: how far gone she is (duel.ts's states), and her pleasure, 0 to 1. */
  duel?: { state: "calm" | "aroused" | "edge"; pleasure: number } | null;
  /** Something that just happened. */
  moment?: FaceMoment | null;
  /** Which close variant of her expression she wears (withVariant): re-picked by the game as her face changes. */
  variant?: number;
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
export const BEARING = { easy: 2, confident: 5, shameless: 6 };

/**
 * How her face wears down as her willpower runs out, KP's stamina bands (EXPRESSION_STUDY.md §3.1): her bearing down to
 * the first step, then from each step's face to the next's as her willpower falls between them. Lewd and sure of
 * herself (`BEARING.confident`), she wears down only `confidentShare` of the way, keeping her smirk and half-lids.
 */
export const STAMINA_STEPS: readonly { will: number; face: Expression | null }[] = [
  { will: 0.8, face: null },
  { will: 0.6, face: "set" },
  { will: 0.4, face: "gritted" },
  { will: 0.2, face: "tired" },
  { will: 0, face: "spent" },
];
export const STAMINA = { confidentShare: 0.7 };

/** The step of wearing down she's nearest, for her variants; null while she's still fresh (above the first step). */
function staminaStep(will: number): Expression | null {
  if (will >= STAMINA_STEPS[0].will) return null;
  let best = STAMINA_STEPS[1];
  for (const step of STAMINA_STEPS) if (step.face && Math.abs(step.will - will) < Math.abs(best.will - will)) best = step;
  return best.face;
}

/** Her bearing worn down by how much of her willpower is left (STAMINA_STEPS). */
function wornDown(bearingFace: FaceShape, will: number, slut: number): FaceShape {
  const faceAt = (step: (typeof STAMINA_STEPS)[number]) => (step.face ? EXPRESSIONS[step.face] : bearingFace);
  let worn = bearingFace;
  for (let i = 1; i < STAMINA_STEPS.length; i++) {
    const hi = STAMINA_STEPS[i - 1];
    const lo = STAMINA_STEPS[i];
    if (will >= hi.will) break;
    const t = Math.min(1, (hi.will - will) / (hi.will - lo.will));
    worn = blendFace(faceAt(hi), faceAt(lo), t);
  }
  const share = slut >= BEARING.confident ? STAMINA.confidentShare : 1;
  return blendFace(bearingFace, worn, share);
}

/**
 * The expression that leads her face: a reaction to a touch first, then a moment, then what she's in the middle of
 * (an after-hours game, showing a guest something, a brawl); otherwise her bearing.
 */
export function expressionFor(cause: FaceCause): Expression {
  return leading(cause) ?? bearing(cause.slut ?? 0).main;
}

/** What's happening that leads her face, if anything; null leaves it to her bearing and her state. */
function leading(cause: FaceCause): Expression | null {
  const slut = cause.slut ?? 0;
  if (cause.reaction === "jolt" && cause.arousal >= OVERWHELMED_AT) return "overwhelmed";
  if (cause.reaction === "melt" && slut >= BEARING.confident) return "blissful";
  if (cause.reaction) return REACTION_FACE[cause.reaction];
  if (cause.moment) return MOMENT_FACE[cause.moment];
  if (cause.duel && cause.duel.state !== "calm") {
    if (cause.duel.state === "edge") return "edge";
    // Still proper, she fights it; lewd enough, she loves it; between, she's worked up.
    return slut < BEARING.easy ? "strained" : slut >= BEARING.confident ? "delighted" : "aroused";
  }
  if (cause.showing !== null) {
    if (cause.showing >= DELIGHTED_PAST) return "delighted";
    if (cause.showing >= SULTRY_PAST) return "sultry";
    return cause.showing >= BASHFUL_BELOW ? "shy" : "bashful";
  }
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
/** Her pupils widen as she's aroused or drunk, by this much more at most, over her expression's own. */
export const WIDE_PUPILS = { arousal: 0.6, drunk: 0.4 };
/**
 * KP's extras over any face (EXPRESSION_STUDY.md §3): she sweats as her willpower runs low (from `sweatFrom` left, all
 * of it by `sweatFull`) and in a brawl or a game; her eyes go wet as she's aroused once she's at ease with it
 * (Slut Level BEARING.easy: KP's lv2), from `wetFrom` arousal, all of it by `wetFull`; and her pupils turn to hearts
 * only when she's fully gone: sure of herself (BEARING.confident: KP's lv3), this aroused, in one of HEART_FACES.
 */
export const EXTRAS = { sweatFrom: 0.65, sweatFull: 0.25, sweatFighting: 0.4, sweatGame: 0.6, wetFrom: 0.4, wetFull: 0.8, heartArousal: 0.8 };
export const HEART_FACES: readonly Expression[] = ["blissful", "delighted", "pleasure", "edge", "lost"];

/** Her face as it goes now (see `expressionFor` and `BEARING`). */
export function faceFor(cause: FaceCause): FaceShape {
  const main = leading(cause);
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  let shape: FaceShape;
  if (!main) {
    // Nothing in particular going on: her bearing, and her state over it.
    const slut = cause.slut ?? 0;
    shape = wornDown(bearing(slut).face, clamp(cause.will ?? 1), slut);
    const shame = clamp(cause.exposed ?? 0) * clamp(1 - slut / BEARING.shameless);
    shape = blendFace(shape, EXPRESSIONS.embarrassed, shame);
    shape = blendFace(shape, EXPRESSIONS.drunk, clamp(cause.drunk) * 0.8);
    shape = blendFace(shape, EXPRESSIONS.aroused, clamp(cause.arousal) * 0.5);
  } else if (cause.fightFace && cause.fighting && leading({ ...cause, fighting: false }) === null) {
    // In a brawl with nothing else going on: the face for the moment of the fight she's in.
    shape = { ...cause.fightFace };
  } else {
    shape = { ...EXPRESSIONS[main] };
    // Deep in an after-hours game, her pleasure takes her further: worked up towards pleasure, and on the edge, lost.
    // Worked up, she pants as her pleasure climbs; loving it, she melts.
    if (cause.duel && main === "aroused") shape = blendFace(shape, EXPRESSIONS.panting, clamp(cause.duel.pleasure));
    if (cause.duel && main === "delighted") shape = blendFace(shape, EXPRESSIONS.blissful, clamp(cause.duel.pleasure) * 0.6);
    if (cause.duel && main === "strained") shape = blendFace(shape, EXPRESSIONS.pleasure, clamp(cause.duel.pleasure) * 0.5);
    if (cause.duel && main === "edge") shape = blendFace(shape, EXPRESSIONS.lost, clamp((cause.duel.pleasure - LOST_FROM) / (1 - LOST_FROM)));
  }
  // One of her expression's close variants, as KP re-rolls its pools (not in a brawl: its faces have their own pools).
  if (cause.variant && !(cause.fightFace && cause.fighting)) {
    const slut = cause.slut ?? 0;
    const pool = main ?? (slut < BEARING.confident ? staminaStep(clamp(cause.will ?? 1)) : null) ?? bearing(slut).main;
    shape = withVariant(shape, pool, cause.variant);
  }
  const a = clamp(cause.arousal);
  const d = clamp(cause.drunk);
  shape = shutAtLeast(shape, Math.max(a * HEAVY_LIDS.arousal, d * HEAVY_LIDS.drunk));
  shape.blush = Math.min(1, Math.max(shape.blush, a * FLUSH.arousal, d * FLUSH.drunk));
  shape.pupil = Math.min(1, Math.max(-1, shape.pupil + a * WIDE_PUPILS.arousal + d * WIDE_PUPILS.drunk));
  const slut = cause.slut ?? 0;
  const worn = clamp((EXTRAS.sweatFrom - (cause.will ?? 1)) / (EXTRAS.sweatFrom - EXTRAS.sweatFull));
  const exertion = Math.max(cause.fighting ? EXTRAS.sweatFighting : 0, (cause.duel?.pleasure ?? 0) * EXTRAS.sweatGame);
  shape.sweat = Math.min(1, Math.max(shape.sweat, worn, exertion));
  if (slut >= BEARING.easy) shape.wet = Math.max(shape.wet, clamp((a - EXTRAS.wetFrom) / (EXTRAS.wetFull - EXTRAS.wetFrom)));
  if (slut >= BEARING.confident && a >= EXTRAS.heartArousal && main && HEART_FACES.includes(main)) shape.heart = 1;
  return shape;
}
