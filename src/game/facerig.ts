/**
 * Her face's old rig, kept only to bake her first shape keys (tools/bridge/facebake.preview.ts). The game no longer
 * moves her face with it: her expressions are now shape keys sculpted in Blender (art/female_face_keys.blend), played as
 * morph targets (facekeys.ts, face.ts). This is what used to move her face's points on the CPU, from 30 numbers per
 * expression (`FaceControls`). Each shape key's first shape was made from these numbers (`BAKE_RECIPES`), so the game
 * looked the same the day it changed over; after that, the sculpted keys are what counts, and re-baking a key throws
 * away what was sculpted on it.
 *
 * facecap.ts still reads a captured face into these numbers, as a recipe to bake a key from.
 */
import type { Expression } from "./face";

/** How far each part of her face has moved from at rest. All are 0 at rest. */
export interface FaceControls {
  /** Both brows raised (1) or lowered (-1). */
  brow: number;
  /** The inner ends of her brows raised (worried, 1) or drawn down (cross, -1). */
  browInner: number;
  /** The middle of each brow arched up (1) or flattened down (-1). */
  browArch: number;
  /** The outer ends of her brows up (1) or curving down towards her temples (-1). */
  browOuter: number;
  /** The very tips of her brows by her nose flicked up (1), as a brow drawn down to them curls at the end. */
  browTip: number;
  /** Her brows drawn right down close over her eyes, 0 to 1, as in the moments she's lost in it or fighting it. */
  browNear: number;
  /** The outer ends of her brows drawn out towards her temples (1) or in (-1), as they flare up in anger. */
  browSpread: number;
  /** The upper edge of each eye come down, 0 open to 1 shut. */
  lidUpper: number;
  /** The lower edge come up, 0 to 1 shut. */
  lidLower: number;
  /** Her eyes opened wide, 0 to 1. */
  wide: number;
  /** Her pupils widened (1, aroused, drunk) or tightened to points (-1, angry, startled). */
  pupil: number;
  /** Where her eyes look: across (her own left -1, right 1) and up (1) or down (-1). */
  lookX: number;
  lookY: number;
  /** Both corners of her mouth up (1) or down (-1). */
  smile: number;
  /** Her own left corner of her mouth up on its own: a smirk. */
  smirk: number;
  /** Her mouth open, 0 shut to 1 as wide as it goes. */
  open: number;
  /**
   * The shape of her open mouth, by its rig: rounded (1), her lower lip dropping in a soft U right out to near her
   * corners, her upper lip arched up off her teeth, her corners drawn a little in.
   */
  round: number;
  /** Her lips drawn back off both rows of her teeth (1): her mouth stretched wide and flat, square at the ends. */
  bare: number;
  /**
   * Her upper lip riding up with the corners of her smile (1: all the way), so the top of her open mouth stays a
   * smooth, flat line across instead of dipping to a point in the middle.
   */
  lift: number;
  /**
   * Her lower lip hanging free of her smile (1), so it drops away right out to her lifted corners: her open smile a
   * D, round at the bottom, not a wedge.
   */
  cup: number;
  /** Her lips pressed together small, the corners drawn in (1); or stretched wide, drawn out and back (-1). */
  purse: number;
  /** Her lips pressed thin together into a line, as if drawn, 0 to 1: the mouth a touch wider, not smaller. */
  press: number;
  /** Her whole mouth, lips, teeth, tongue and the skin right round it, raised (1) or lowered (-1). */
  mouthUp: number;
  /** Her tongue out over her lower lip, 0 in to 1 as far as it goes. */
  tongue: number;
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

/** When the lines an expression draws on her face show: two creases, three, and the strokes of a deep blush. */
export const FACE_LINES = { creases: [0.35, 0.7] as const, hatch: 0.7 };
/** When KP's extra layers show: wet eyes, tears, heart pupils, and a few drops of sweat then more. */
export const FACE_EXTRAS = { wet: 0.5, tears: 0.5, heart: 0.5, sweat: [0.35, 0.75] as const };

export const CONTROL_KEYS: readonly (keyof FaceControls)[] = [
  "brow", "browInner", "browArch", "browOuter", "browTip", "browNear", "browSpread", "lidUpper", "lidLower", "wide", "pupil", "lookX", "lookY", "smile", "smirk", "open", "round",
  "bare", "lift", "cup", "purse", "press", "mouthUp", "tongue", "blush", "crease", "wet", "tears", "heart", "sweat",
];

export const REST_CONTROLS: Readonly<FaceControls> = {
  brow: 0, browInner: 0, browArch: 0, browOuter: 0, browTip: 0, browNear: 0, browSpread: 0, lidUpper: 0, lidLower: 0, wide: 0, pupil: 0, lookX: 0, lookY: 0, smile: 0, smirk: 0,
  open: 0, round: 0, bare: 0, lift: 0, cup: 0, purse: 0, press: 0, mouthUp: 0, tongue: 0, blush: 0, crease: 0, wet: 0, tears: 0, heart: 0, sweat: 0,
};

/** The controls that can't go below 0 (the rest go both ways). */
export const UNSIGNED_CONTROLS: readonly (keyof FaceControls)[] = [
  "browNear", "lidUpper", "lidLower", "open", "round", "bare", "lift", "cup", "press", "tongue", "blush", "crease", "wet",
  "tears", "heart", "sweat",
];

const face = (shape: Partial<FaceControls>): FaceControls => ({ ...REST_CONTROLS, ...shape });

/** Each expression as the old rig made it: what its shape keys were first baked from. */
export const EXPRESSION_CONTROLS: Readonly<Record<Expression, FaceControls>> = {
  neutral: face({}),
  // Her bearing before the tavern's had its way with her: brows level and a touch low, mouth set.
  stern: face({ brow: -0.3, browInner: -0.4, browOuter: 0.15, lidUpper: 0.1, smile: -0.2 }),
  // Her bearing once it has: easy brows, lids a little low, a knowing half smile.
  confident: face({ brow: -0.15, browInner: -0.15, browArch: 0.3, browOuter: 0.35, lidUpper: 0.25, smile: 0.3, smirk: 0.45 }),
  // Her eyes crinkle from below as she smiles, her lips parting on her teeth.
  smile: face({ smile: 0.8, lidLower: 0.3, brow: 0.25, browArch: 0.5, browOuter: -0.2, open: 0.2 }),
  // Brows up and worried, eyes down and away, a small nervous smile, flushed.
  shy: face({ brow: 0.2, browInner: 0.9, browOuter: -0.6, lidUpper: 0.15, lookX: 0.5, lookY: -0.8, smile: 0.25, blush: 0.85, crease: 0.4 }),
  // Heavy lids under low brows, lips just parted in a smirk, a little flushed.
  sultry: face({ brow: -0.85, browArch: 0.3, browOuter: 0.3, lidUpper: 0.5, lidLower: 0.1, lookY: -0.1, smile: 0.25, smirk: 0.75, open: 0.12, blush: 0.5, pupil: 0.3 }),
  // Caught with too little on: brows high and worried, eyes away, mouth tight, red to the ears.
  embarrassed: face({ brow: 0.4, browInner: 1, browOuter: -0.7, wide: 0.2, lookX: -0.6, lookY: -0.4, smile: -0.35, blush: 1, crease: 0.5 }),
  // Worn down: heavy lids, brows sagging up in the middle, mouth drooping a little open.
  tired: face({ brow: -0.3, browInner: 0.6, browOuter: -0.6, lidUpper: 0.55, lidLower: 0.1, lookY: -0.3, smile: -0.25, open: 0.1, crease: 0.4 }),
  // Drunk: lids heavy, brows lifted and loose, a lopsided smile, flushed.
  drunk: face({ brow: 0.2, browInner: 0.4, browOuter: -0.4, lidUpper: 0.5, smile: 0.4, smirk: 0.3, open: 0.15, blush: 0.75, pupil: 0.3 }),
  // Squaring up to someone: brows in a sharp V, knitted down by her nose and flaring up and out at the ends (as the
  // user shaped it in art/face_expressions.blend), eyes narrowed, mouth set a little higher, teeth showing.
  angry: face({
    brow: -0.1, browNear: 0.5, browInner: -1.35, browArch: 0.55, browOuter: 1.55, browTip: 0.4, browSpread: 1.15,
    lidUpper: 0.3, lidLower: 0.25, pupil: -0.4, smile: -0.6, open: 0.12, mouthUp: 0.45, crease: 1,
  }),
  // Brows arched high, curving down at the ends, eyes wide, mouth open.
  surprised: face({ brow: 0.8, browInner: 0.3, browArch: 1, browOuter: -0.5, browTip: 1, wide: 1, smile: -0.15, open: 0.7, blush: 0.2, pupil: -0.6 }),
  // Too much at once: brows up and pinched, eyes squeezed, mouth stretched wide on her teeth, red.
  overwhelmed: face({ browNear: 0.9, browInner: 0.5, browArch: -0.4, browOuter: -0.5, browTip: 0.7, lidUpper: 0.8, lidLower: 0.5, smile: -0.5, open: 0.6, blush: 0.9, crease: 1, pupil: -0.3, tears: 0.6 }),
  // Worked up: low brows lifting in the middle, lids low, lips parted, flushed.
  aroused: face({ brow: -0.5, browInner: 0.6, browOuter: -0.4, browTip: 0.7, lidUpper: 0.45, lidLower: 0.1, smile: 0.1, open: 0.3, blush: 0.8, pupil: 0.4 }),
  // Barely able to: lips pressed thin into a line drawn across her face, brows sloping down to her nose with their
  // tips flicked up, eyes down, red all over.
  bashful: face({ browNear: 0.35, browInner: -0.75, browOuter: 0.2, browTip: 1, lidUpper: 0.35, lookY: -0.9, lookX: 0.3, smile: 0.2, press: 1, blush: 1, crease: 0.4 }),
  // Breathless: mouth soft and open, tongue out over her lip, lids heavy, brows worried, flushed.
  panting: face({ browNear: 0.8, browInner: 0.45, browArch: -0.3, browOuter: -0.4, browTip: 1, lidUpper: 0.6, lidLower: 0.15, lookY: 0.2, smile: 0.05, open: 1, round: 1, tongue: 1, blush: 1, crease: 0.4 }),
  // Fighting it: mouth stretched wide on both rows of teeth, corners down, eyes squeezed shut, brows pinched.
  strained: face({ browNear: 1, browInner: 0.5, browArch: -0.4, browOuter: -0.5, browTip: 0.6, lidUpper: 1, lidLower: 0.6, smile: -0.3, open: 0.65, bare: 1, blush: 0.9, crease: 1, tears: 0.7 }),
  // Melting: a wide, soft crescent of a smile on parted lips, its corners turned up to points, dreamy half shut eyes,
  // brows lifted and easy, flushed.
  blissful: face({ brow: 0.25, browInner: 0.5, browArch: 0.3, browOuter: -0.3, browTip: 0.6, lidUpper: 0.65, lidLower: 0.2, smile: 1.2, open: 0.25, lift: 0.7, purse: -1, blush: 0.9, pupil: 0.5 }),
  // Loving it: a big open D of a smile, its top flat on her teeth and its corners turned up, her lower lip dropped
  // round below it to her tongue, eyes crinkled from below, brows up and easy, flushed.
  delighted: face({ brow: 0.3, browInner: 0.4, browArch: 0.5, browOuter: -0.3, lidUpper: 0.35, lidLower: 0.55, smile: 1.15, open: 0.8, round: 1, lift: 0.8, cup: 0.7, purse: -0.9, tongue: 0.4, blush: 0.8, pupil: 0.4 }),
  // Eyes nearly shut, brows up in the middle and down at the ends, mouth open on a moan, flushed.
  pleasure: face({ browNear: 0.8, browInner: 0.5, browArch: -0.3, browOuter: -0.5, browTip: 0.9, lidUpper: 0.85, lidLower: 0.25, smile: 0.2, open: 0.55, blush: 1, crease: 0.6, pupil: 0.5 }),
  // On the edge: eyes screwed shut, brows high and pinched, mouth wide open on her tongue, as red as she gets.
  edge: face({ browNear: 0.9, browInner: 0.55, browArch: -0.4, browOuter: -0.5, browTip: 0.8, lidUpper: 1, lidLower: 0.4, smile: -0.1, open: 0.9, tongue: 0.6, blush: 1, crease: 1, pupil: 0.3 }),
  // Past it: eyes rolled up under heavy lids, brows high and helpless, mouth hanging open, tongue out.
  lost: face({ browNear: 1, browInner: 0.45, browArch: -0.5, browOuter: -0.4, browTip: 0.9, lidUpper: 0.3, lidLower: 0.2, lookY: 1, smile: 0.15, open: 1, tongue: 1, blush: 1, crease: 0.6, pupil: 0.6 }),
  // Brows knitted down, eyes narrowed, mouth turned down.
  annoyed: face({ brow: -0.4, browInner: -1, browOuter: 0.3, lidUpper: 0.35, lidLower: 0.2, smile: -0.7, crease: 0.6, pupil: -0.2 }),
  // Her willpower wearing down, in KP's steps (STAMINA_STEPS, EXPRESSION_STUDY.md): first her mouth sets (KP's mu),
  set: face({ brow: -0.2, browInner: -0.3, browOuter: 0.1, smile: -0.2, press: 0.35 }),
  // then she grits her teeth through it, brows hard (ku, kiri/oko),
  gritted: face({ brow: -0.3, browInner: -0.5, browOuter: 0.2, lidUpper: 0.15, smile: -0.45, open: 0.08, bare: 0.7, crease: 0.4 }),
  // and at the end she's spent: brows up and troubled, eyes nearly closed, mouth hanging open on a breath (koma, toji, wa).
  spent: face({ browNear: 0.3, browInner: 0.9, browOuter: -0.6, lidUpper: 0.7, lidLower: 0.15, lookY: -0.3, smile: -0.15, open: 0.4, crease: 0.4 }),
};

// Where the parts of her face are, found on the model (`faceRig`), and how an expression moves each point of it
// (`faceMove`), in the model's space as built: y up, forwards -z, metres.

/** One eye: the middle of its dot and the dot's half width and half height. */
/**
 * One eye: the middle of its white and the white's half width and half height; the middle of its pupil; and how its
 * plane slopes (z per x, z per y), so what slides across it stays on it: her eyes sit in a socket that turns back
 * steeply towards her temple.
 */
export interface EyeRig {
  centre: [number, number, number];
  half: [number, number];
  pupil: [number, number];
  slope: [number, number];
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
  /** Her tongue, how far forwards it reaches: its tip's z and its root's (forwards is -z); null if she has none. */
  tongue: [number, number] | null;
}

/**
 * What a point of her face is: her brows' and her upper teeth's move in their own ways; the rest by where it is, but
 * her lips draw back off her lower teeth and her tongue.
 */
export type FacePart =
  | "brow" | "teeth" | "lowerTeeth" | "tongue" | "skin"
  // Her eyes (build_world.py add_anime_eyes): the white stays; her eyelids' edges and her lash lines close over it,
  // upper and lower; her iris (with its darker top and the shines) looks about behind them; her pupil also grows.
  | "eyeWhite" | "lid" | "lidLow" | "lash" | "lashLow" | "iris" | "pupil";

/**
 * The front of her face, from its triangles (each nine numbers: three points' x, y, z), to keep her brows on it as
 * they move: how far forward it is (its z, forwards being -z) at (x, y), or null off it.
 */
export function faceSurface(triangles: readonly number[][]): (x: number, y: number) => number | null {
  // Each triangle is filed in the cells of a grid over x, y that its box covers, so a point is tested only against
  // the few under it: her brows are looked up on every change of expression (each blink and glance), and against
  // all of her face's triangles that took ~200 ms a time.
  const PAD = 1e-4;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of triangles) {
    minX = Math.min(minX, t[0], t[3], t[6]);
    maxX = Math.max(maxX, t[0], t[3], t[6]);
    minY = Math.min(minY, t[1], t[4], t[7]);
    maxY = Math.max(maxY, t[1], t[4], t[7]);
  }
  const N = Math.max(1, Math.min(64, Math.ceil(Math.sqrt(triangles.length / 2))));
  const sizeX = Math.max((maxX - minX) / N, 1e-6);
  const sizeY = Math.max((maxY - minY) / N, 1e-6);
  const cellX = (x: number) => Math.min(N - 1, Math.max(0, Math.floor((x - minX) / sizeX)));
  const cellY = (y: number) => Math.min(N - 1, Math.max(0, Math.floor((y - minY) / sizeY)));
  const cells: number[][][] = Array.from({ length: N * N }, () => []);
  for (const t of triangles) {
    const x0 = cellX(Math.min(t[0], t[3], t[6]) - PAD), x1 = cellX(Math.max(t[0], t[3], t[6]) + PAD);
    const y0 = cellY(Math.min(t[1], t[4], t[7]) - PAD), y1 = cellY(Math.max(t[1], t[4], t[7]) + PAD);
    for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) cells[j * N + i].push(t);
  }
  return (x, y) => {
    if (!triangles.length || x < minX - PAD || x > maxX + PAD || y < minY - PAD || y > maxY + PAD) return null;
    let front: number | null = null;
    for (const [ax, ay, az, bx, by, bz, cx, cy, cz] of cells[cellY(y) * N + cellX(x)]) {
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-12) continue;
      const u = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d;
      const v = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d;
      const w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      const z = u * az + v * bz + w * cz;
      if (front === null || z < front) front = z;
    }
    return front;
  };
}

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
  /** The tips of her brows by her nose flicked up this far, over this share of each brow from its inner end. */
  browTip: 0.004,
  browTipReach: 0.16,
  /** Her brows close over her eyes: down this far, past `browLow`, and forwards this far to stay on her brow. */
  browNear: 0.011,
  browNearForward: 0.0015,
  browLow: 0.006,
  browForward: 0.5,
  browKnit: 0.003,
  /** The outer ends of her brows drawn out this far (browSpread), less and less in towards her nose. */
  browSpread: 0.005,
  /** Eyes opened wide (share of their opening's height), and looking aside (share of the opening's half width and top). */
  wide: 0.22,
  look: 0.3,
  /** Pupils grown or shrunk by this share of their size (`pupil`). */
  pupil: 0.35,
  /** The corners of her mouth up and out, and back into her face as they go up. */
  smileUp: 0.009,
  smileOut: 0.003,
  smileBack: 0.001,
  /** How far round each corner of her mouth the skin goes with it. */
  corner: 0.017,
  /** Her whole mouth raised this far (mouthUp). */
  mouthUp: 0.003,
  /** Her mouth wide open: how far her jaw drops, and swings back. */
  jaw: 0.019,
  jawBack: 0.004,
  /**
   * The drop is all her lower lip's (down to `jawLip` below her mouth line) and less and less below it, to `jawChinShare`
   * of it at her chin: her mouth opens inside her face, as KP's does, instead of her whole chin dropping and her face
   * growing long (EXPRESSION_STUDY.md).
   */
  jawLip: 0.006,
  jawChinShare: 0.25,
  /**
   * Open wide, the corners of her mouth draw out to the sides this far; pressed small (`purseIn`), in. Her whole mouth
   * stretches with them, inside and all, so its corners stay clean: everything within `mouthHigh` of her mouth line,
   * fading out by `mouthFade`, out to her corners and fading out by `mouthSide` times as far.
   */
  mouthWiden: 0.004,
  purseIn: 0.0045,
  mouthHigh: 0.006,
  mouthFade: 0.014,
  mouthSide: 1.8,
  /** Her lips pressed small: the corners come a little forward. */
  purseForward: 0.0015,
  /**
   * Her lips pressed thin into a line: everything within `pressLip` of her mouth line closes in towards it by
   * `pressThin` of the way, the skin past it less, to nothing by `pressFade`; her mouth a touch wider (`pressWiden`),
   * and her lips pushed out a little (`pressOut`, most in the middle).
   */
  pressThin: 0.62,
  pressOut: 0.0012,
  pressLip: 0.0052,
  pressFade: 0.011,
  pressWiden: 0.0025,
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
  /**
   * Her mouth's rig: how her lips move across her mouth, from its middle out to her corners, as it opens. Rounded: her
   * jaw's drop reaching this much further out along her mouth line (`roundWide`), all of it out to `roundFull` of that,
   * so her lower lip drops in a U; her corners drawn in (`roundIn`), and her upper lip arched up (`roundArch`, most in
   * the middle). Bared: her jaw's drop flat out near to her corners (`bareWide`, `bareFull`), her corners stretched
   * out (`bareOut`), and her upper lip drawn up (`bareUp`) and her lower lip down (`bareDown`) off her teeth, flat
   * across out to `bareFlat` of the way to her corners. Both lips thin as they go, fading out by `lipFade` from her
   * mouth line.
   */
  roundWide: 0.006,
  roundFull: 0.3,
  roundIn: 0.001,
  roundArch: 0.0012,
  bareWide: 0.007,
  bareFull: 0.7,
  bareOut: 0.004,
  bareUp: 0.0018,
  bareDown: 0.0012,
  bareFlat: 0.85,
  lipFade: 0.012,
  /** Her upper lip riding up with her smile (`lift`): the skin above it going less and less, none by `liftFade` up. */
  liftFade: 0.013,
  /** Her lower lip hanging free of her smile (`cup`): all of it inside her corners, by this far in from them. */
  cupEdge: 0.001,
  /**
   * Her tongue all the way out: how far forwards its tip comes (its root `tongueRoot` of that), lifted up over her
   * lower teeth (`tongueUp`, all of it by `tongueLifted` of the way out), its tip hanging down over her lower lip
   * (`tongueDroop`, from `tongueBend` along it, more the further out it is), and spread wider (`tongueWide`, share of
   * its width). Lifting first and hanging down last, it comes out over her lip rather than through it.
   */
  tongueOut: 0.019,
  tongueRoot: 0.45,
  tongueUp: 0.003,
  tongueLifted: 0.4,
  tongueDroop: 0.0102,
  tongueBend: 0.35,
  tongueWide: 0.45,
};

/**
 * Finds her eyes, brows, mouth and tongue from the points of the meshes they're drawn in (as shaped): her eye dots',
 * her brows', her lips' and her tongue's. Null if any but her tongue are missing.
 */
export function faceRig(
  eyes: readonly number[][],
  brows: readonly number[][],
  lips: readonly number[][],
  tongue: readonly number[][] = [],
  pupils: readonly number[][] = [],
): FaceRig | null {
  if (!eyes.length || !brows.length || !lips.length) return null;
  const eye = (side: number): EyeRig | null => {
    const points = eyes.filter((p) => Math.sign(p[0]) === side);
    if (!points.length) return null;
    const span = (k: number) => [Math.min(...points.map((p) => p[k])), Math.max(...points.map((p) => p[k]))];
    const [x0, x1] = span(0);
    const [y0, y1] = span(1);
    const z = points.reduce((sum, p) => sum + p[2], 0) / points.length;
    const centre: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, z];
    const own = pupils.filter((p) => Math.sign(p[0]) === side);
    const mean = (k: number) => own.reduce((sum, p) => sum + p[k], 0) / own.length;
    return {
      centre,
      half: [(x1 - x0) / 2, (y1 - y0) / 2],
      pupil: own.length ? [mean(0), mean(1)] : [centre[0], centre[1]],
      slope: planeSlope(points, centre),
    };
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
  const reach = tongue.map((p) => p[2]);
  return {
    eyes: [left, right],
    brows: [Math.min(...across), Math.max(...across)],
    corners,
    line: (corners[0][1] + corners[1][1]) / 2,
    tongue: reach.length ? [Math.min(...reach), Math.max(...reach)] : null,
  };
}

/** How a set of points' plane slopes about a centre, by least squares: [z per x, z per y]; flat if they don't say. */
function planeSlope(points: readonly number[][], centre: readonly number[]): [number, number] {
  let xx = 0, xy = 0, yy = 0, xz = 0, yz = 0;
  for (const [x, y, z] of points) {
    const dx = x - centre[0];
    const dy = y - centre[1];
    const dz = z - centre[2];
    xx += dx * dx;
    xy += dx * dy;
    yy += dy * dy;
    xz += dx * dz;
    yz += dy * dz;
  }
  const det = xx * yy - xy * xy;
  if (Math.abs(det) < 1e-18) return [0, 0];
  return [(xz * yy - yz * xy) / det, (yz * xx - xz * xy) / det];
}

const smooth = (s: number) => {
  const c = Math.min(1, Math.max(0, s));
  return c * c * (3 - 2 * c);
};

/** How much of her mouth a point of her face is across it, 0 to 1: all of it out to her corners, then fading. */
function mouthAcross(rig: FaceRig, x: number, z: number): number {
  if (z > rig.corners[0][2] + 0.02) return 0;
  const half = (Math.abs(rig.corners[0][0]) + Math.abs(rig.corners[1][0])) / 2;
  return 1 - smooth((Math.abs(x) - half) / (half * (FACE_REACH.mouthSide - 1)));
}

/**
 * How far her upper lip rides up with her smile at a point of her face (`lift`): what her corners don't already take
 * of their rise along her lip, less and less above it (FACE_REACH.liftFade). Her upper teeth (`whole`) go up as one,
 * as far as the middle of her lip, so they stay tucked under it, straight.
 */
function lipLift(rig: FaceRig, shape: FaceControls, x: number, y: number, z: number, whole: boolean): number {
  if (shape.lift <= 0 || shape.smile <= 0) return 0;
  const dy = y - rig.line;
  if (!whole && dy < -FACE_REACH.jawGap) return 0;
  if (mouthAcross(rig, x, z) <= 0) return 0;
  const half = (Math.abs(rig.corners[0][0]) + Math.abs(rig.corners[1][0])) / 2;
  const along = whole ? 0 : Math.abs(x);
  const cornerTakes = (1 - Math.min(1, Math.max(0, half - along) / FACE_REACH.corner)) ** 2;
  const above = whole ? 1 : 1 - smooth(Math.max(0, dy) / FACE_REACH.liftFade);
  return FACE_REACH.smileUp * shape.smile * shape.lift * (1 - cornerTakes) * above;
}

/** How much of her mouth's widening a point of her face takes, 0 to 1 (FACE_REACH.mouth*). */
export function mouthWeight(rig: FaceRig, x: number, y: number, z: number): number {
  const across = mouthAcross(rig, x, z);
  if (across === 0) return 0;
  const high = 1 - smooth((Math.abs(y - rig.line) - FACE_REACH.mouthHigh) / (FACE_REACH.mouthFade - FACE_REACH.mouthHigh));
  return across * high;
}

/** How much of the drop a point this far below her mouth line takes: all of it at her lip, `jawChinShare` at her chin. */
export function jawDepthShare(below: number): number {
  const s = smooth((below - FACE_REACH.jawLip) / (FACE_REACH.jawChin - FACE_REACH.jawLip));
  return 1 - (1 - FACE_REACH.jawChinShare) * s;
}

/**
 * How much of her jaw's drop a point of her face below her mouth line takes, 0 to 1 (FACE_REACH.jaw*): along her
 * mouth line, out to how near her corners as her mouth rig shapes it (`round`, `bare`).
 */
export function jawWeight(rig: FaceRig, x: number, y: number, z: number, shape?: Pick<FaceControls, "round" | "bare">): number {
  const below = rig.line - y;
  if (below <= FACE_REACH.jawGap || below > FACE_REACH.jawDepth || z > rig.corners[0][2] + 0.02) return 0;
  const t = Math.min(1, below / FACE_REACH.jawChin);
  const round = shape?.round ?? 0;
  const bare = shape?.bare ?? 0;
  const line = FACE_REACH.jawWide + FACE_REACH.roundWide * round + FACE_REACH.bareWide * bare;
  const share = FACE_REACH.jawFull + (FACE_REACH.roundFull - FACE_REACH.jawFull) * round + (FACE_REACH.bareFull - FACE_REACH.jawFull) * bare;
  const wide = line + (FACE_REACH.jawWideLow - line) * t;
  const full = wide * Math.min(0.9, share);
  const s = Math.min(1, Math.max(0, (Math.abs(x) - full) / (wide - full)));
  return 1 - s * s * (3 - 2 * s);
}

/**
 * The opening of her eye, as build_world.py's EYE_SHAPE draws it (keep the two in step), in shares of the white's half
 * width and half height (EYE_WHITE_HALF, 23 by 14 reference pixels): how wide it is, how high its top arches and how
 * low its bottom dips (each times (1 - u^2) to its power), the corners' heights, inner and outer; and where her lids
 * meet when they close, a share of the way up from the bottom.
 */
export const EYE_OPENING = {
  half: 21 / 23, top: 12.5 / 14, topPow: 0.55, bottom: 10 / 14, bottomPow: 0.8, inner: -1 / 14, outer: 2.5 / 14, meet: 0.25,
};
/**
 * Her eyeball, as build_world.py's EYE_DOME shapes it (keep the two in step): the eye stands out of its socket in a dome
 * `depth` times the white's half width high at its middle, falling off as (1 - r^2) to the `power` out to an oval just
 * round the opening (`across`, `up`, `down`: shares of the white's half size). What moves over the eye (her iris
 * looking about, her lids closing) stays on it.
 */
export const EYE_DOME = { depth: 0.2, power: 0.6, across: 1.0, up: 0.98, down: 0.79 };

/** How far the eyeball stands out at a point (shares of the white's half width and half height from its middle). */
export function eyeDome(x: number, y: number): number {
  const across = x / EYE_DOME.across;
  const up = y / (y > 0 ? EYE_DOME.up : EYE_DOME.down);
  return EYE_DOME.depth * Math.max(0, 1 - across * across - up * up) ** EYE_DOME.power;
}

/** How far past its edge a point of an eyelid still moves with it, in shares of the white's half height. */
const LID_EDGE = 0.25;
const EYE_PARTS: readonly FacePart[] = ["eyeWhite", "lid", "lidLow", "lash", "lashLow", "iris", "pupil"];

/** The opening at u (-1 her inner corner, 1 her outer), in shares of the white's half height about its middle. */
export function eyeOpening(u: number): { top: number; bottom: number; meet: number; tilt: number } {
  const e = EYE_OPENING;
  const c = Math.min(1, Math.max(-1, u));
  const tilt = e.inner + ((e.outer - e.inner) * (c + 1)) / 2;
  const across = Math.max(0, 1 - c * c);
  const top = tilt + e.top * across ** e.topPow;
  const bottom = tilt - e.bottom * across ** e.bottomPow;
  return { top, bottom, meet: bottom + e.meet * (top - bottom), tilt };
}

/**
 * How an expression moves a point of her eye: her eyelids' edges and lash lines close over it (lidUpper down to where
 * the lids meet, lidLower up to it) or open it wide; her iris looks about behind them; her pupil grows or shrinks.
 */
function eyeMove(rig: FaceRig, shape: FaceControls, p: readonly number[], part: FacePart, out: number[]): boolean {
  const eye = rig.eyes[p[0] < 0 ? 0 : 1];
  const [cx, cy] = eye.centre;
  const [hx, hy] = eye.half;
  if (part === "eyeWhite") return false;
  if (part === "iris" || part === "pupil") {
    let x = p[0];
    let y = p[1];
    if (part === "pupil" && shape.pupil !== 0) {
      const grow = 1 + shape.pupil * FACE_REACH.pupil;
      x = eye.pupil[0] + (x - eye.pupil[0]) * grow;
      y = eye.pupil[1] + (y - eye.pupil[1]) * grow;
    }
    out[0] = x + shape.lookX * FACE_REACH.look * hx * EYE_OPENING.half;
    out[1] = y + shape.lookY * FACE_REACH.look * hy * EYE_OPENING.top;
    out[2] = onEye(eye, p, out);
    return out[0] !== p[0] || out[1] !== p[1];
  }
  const u = (Math.abs(p[0]) - Math.abs(cx)) / (hx * EYE_OPENING.half);
  const at = eyeOpening(u);
  const dy = (p[1] - cy) / hy;
  const upper = part === "lid" || part === "lash";
  // A lid's edge moves; its far side, out past the white, stays where it is, so the lid stretches over the eye.
  const edge = upper ? dy - at.top : at.bottom - dy;
  const w = part === "lash" || part === "lashLow" ? 1 : 1 - smooth(edge / LID_EDGE);
  if (w <= 0) return false;
  const move = upper
    ? -shape.lidUpper * (at.top - at.meet) + shape.wide * FACE_REACH.wide * (at.top - at.tilt)
    : shape.lidLower * (at.meet - at.bottom) - shape.wide * FACE_REACH.wide * (at.tilt - at.bottom);
  if (move === 0) return false;
  out[1] = p[1] + move * w * hy;
  out[2] = onEye(eye, p, out);
  return true;
}

/**
 * Where a point of the eye moved across it (from p to out, x and y) sits in depth: along the eye's plane and over its
 * dome, as far in front of them as it was, so it stays in front of the white wherever it goes (forwards is -z).
 */
function onEye(eye: EyeRig, p: readonly number[], out: readonly number[]): number {
  const [cx, cy] = eye.centre;
  const [hx, hy] = eye.half;
  const dome = (x: number, y: number) => eyeDome((Math.abs(x) - Math.abs(cx)) / hx, (y - cy) / hy) * hx;
  return p[2] + (out[0] - p[0]) * eye.slope[0] + (out[1] - p[1]) * eye.slope[1] - (dome(out[0], out[1]) - dome(p[0], p[1]));
}

/**
 * Where an expression takes a point of her face (`p`, as shaped), written into `out`; false if it doesn't move it.
 * `part` says what it is: her brows move on their own, her upper teeth stay with her skull, the rest moves by where it is.
 */
export function faceMove(rig: FaceRig, shape: FaceControls, p: readonly number[], part: FacePart, out: number[]): boolean {
  let moved = faceMoveParts(rig, shape, p, part, out);
  // Her whole mouth raised or lowered, on top of everything else it does, by where each point was.
  if (shape.mouthUp !== 0 && part !== "brow") {
    const w = mouthWeight(rig, p[0], p[1], p[2]);
    if (w > 0) {
      out[1] += shape.mouthUp * FACE_REACH.mouthUp * w;
      moved = true;
    }
  }
  return moved;
}

/** faceMove but for raising her whole mouth: each part of her face moved its own way. */
function faceMoveParts(rig: FaceRig, shape: FaceControls, p: readonly number[], part: FacePart, out: number[]): boolean {
  const [x, y, z] = p;
  out[0] = x;
  out[1] = y;
  out[2] = z;
  if (part === "brow") {
    const [inner, outer] = rig.brows;
    const t = Math.min(1, Math.max(0, (Math.abs(x) - inner) / Math.max(1e-6, outer - inner)));
    const raised =
      shape.brow * FACE_REACH.brow +
      shape.browInner * FACE_REACH.browInner * (1 - t) +
      shape.browArch * FACE_REACH.browArch * 4 * t * (1 - t) +
      shape.browOuter * FACE_REACH.browOuter * t * t +
      shape.browTip * FACE_REACH.browTip * Math.max(0, 1 - t / FACE_REACH.browTipReach) ** 2;
    const up = Math.max(-FACE_REACH.browLow, raised);
    const near = shape.browNear * FACE_REACH.browNear;
    const knit = Math.max(0, -shape.browInner) * FACE_REACH.browKnit * (1 - t);
    const spread = shape.browSpread * FACE_REACH.browSpread * t * t;
    out[0] = x - Math.sign(x) * (knit - spread);
    out[1] = y + up - near;
    out[2] = z + Math.min(0, up) * FACE_REACH.browForward - shape.browNear * FACE_REACH.browNearForward;
    return up !== 0 || knit !== 0 || near !== 0 || spread !== 0;
  }
  if (EYE_PARTS.includes(part)) return eyeMove(rig, shape, p, part, out);
  // Her mouth stretches wide or draws in as a whole, lips, teeth, tongue and the inside of it, from the middle out.
  let moved = false;
  const widen = FACE_REACH.mouthWiden * shape.open - FACE_REACH.purseIn * shape.purse + FACE_REACH.pressWiden * shape.press +
    FACE_REACH.bareOut * shape.bare - FACE_REACH.roundIn * shape.round;
  if (widen !== 0) {
    const w = mouthWeight(rig, x, y, z);
    if (w > 0) {
      const half = (Math.abs(rig.corners[0][0]) + Math.abs(rig.corners[1][0])) / 2;
      out[0] += (x / half) * widen * w;
      moved = true;
    }
  }
  // Her upper teeth stay with her skull, but for riding up under her upper lip as it lifts with her smile.
  const lifted = lipLift(rig, shape, x, y, z, part === "teeth");
  if (lifted > 0) {
    out[1] += lifted;
    moved = true;
  }
  if (part === "teeth") return moved;
  // Her lips pressed thin: both close in on her mouth line till they're a line drawn across her face.
  if (shape.press > 0) {
    const dy = y - rig.line;
    const far = Math.abs(dy);
    const w = mouthAcross(rig, x, z);
    if (w > 0 && far < FACE_REACH.pressFade) {
      const reach = far <= FACE_REACH.pressLip
        ? far
        : FACE_REACH.pressLip * (1 - smooth((far - FACE_REACH.pressLip) / (FACE_REACH.pressFade - FACE_REACH.pressLip)));
      out[1] -= Math.sign(dy) * reach * FACE_REACH.pressThin * shape.press * w;
      const half = (Math.abs(rig.corners[0][0]) + Math.abs(rig.corners[1][0])) / 2;
      const middle = Math.max(0, 1 - Math.abs(x) / half);
      out[2] -= FACE_REACH.pressOut * shape.press * middle * (reach / FACE_REACH.pressLip);
      moved = true;
    }
  }
  // Her mouth's rig: her upper lip arched up (round) or drawn up flat off her upper teeth (bare), her lower lip pulled
  // down off her lower teeth (bare), each thinning as it goes; her jaw drops her lower lip with the rest, below.
  if (shape.round > 0 || shape.bare > 0) {
    const across = mouthAcross(rig, x, z);
    if (across > 0) {
      const half = (Math.abs(rig.corners[0][0]) + Math.abs(rig.corners[1][0])) / 2;
      const u = Math.abs(x) / half;
      const dy = y - rig.line;
      const fade = 1 - smooth(Math.abs(dy) / FACE_REACH.lipFade);
      const flat = 1 - smooth((u - FACE_REACH.bareFlat) / (1 - FACE_REACH.bareFlat));
      if (dy >= -FACE_REACH.jawGap) {
        out[1] += (FACE_REACH.roundArch * shape.round * Math.max(0, 1 - u * u) + FACE_REACH.bareUp * shape.bare * flat) * fade;
        moved = true;
      } else if (part !== "lowerTeeth" && part !== "tongue" && shape.bare > 0) {
        out[1] -= FACE_REACH.bareDown * shape.bare * flat * fade;
        moved = true;
      }
    }
  }
  rig.corners.forEach((corner, i) => {
    const d = Math.hypot(x - corner[0], y - corner[1]);
    if (d >= FACE_REACH.corner || z > corner[2] + 0.012) return;
    const w = (1 - d / FACE_REACH.corner) ** 2;
    const side = i === 0 ? -1 : 1;
    const lift = shape.smile + (i === 0 ? shape.smirk : 0);
    if (shape.purse > 0) {
      out[2] -= FACE_REACH.purseForward * shape.purse * w;
      moved = true;
    }
    if (lift === 0) return;
    // Her lower lip, inside her corners, hangs free of them as they lift (cup), but spreads out evenly as they draw
    // out, so its sides stay under them.
    const free = shape.cup > 0 && y < rig.line - FACE_REACH.jawGap && mouthAcross(rig, x, z) > 0
      ? shape.cup * smooth((Math.abs(corner[0]) - Math.abs(x)) / FACE_REACH.cupEdge)
      : 0;
    const spread = free * Math.max(0, (x * side) / Math.abs(corner[0])) + (1 - free) * w;
    out[0] += side * FACE_REACH.smileOut * Math.max(0, lift) * spread;
    out[1] += FACE_REACH.smileUp * lift * w * (1 - free);
    out[2] += FACE_REACH.smileBack * Math.max(0, lift) * w;
    moved = true;
  });
  // Her tongue comes out over her lower teeth and lip, spreading, its tip hanging down over her lip.
  if (part === "tongue" && shape.tongue > 0 && rig.tongue) {
    const [tip, root] = rig.tongue;
    const t = Math.min(1, Math.max(0, (root - z) / Math.max(1e-6, root - tip)));
    const bend = Math.max(0, (t - FACE_REACH.tongueBend) / (1 - FACE_REACH.tongueBend));
    out[0] += x * FACE_REACH.tongueWide * shape.tongue;
    const lift = FACE_REACH.tongueUp * Math.min(1, shape.tongue / FACE_REACH.tongueLifted);
    out[1] += lift - FACE_REACH.tongueDroop * bend * bend * shape.tongue * shape.tongue;
    out[2] -= FACE_REACH.tongueOut * shape.tongue * (FACE_REACH.tongueRoot + (1 - FACE_REACH.tongueRoot) * t);
    moved = true;
  }
  // Her jaw drops, and her lower lip, teeth and tongue with it.
  if (shape.open > 0) {
    const w = jawWeight(rig, x, y, z, shape) * jawDepthShare(rig.line - y);
    if (w > 0) {
      out[1] -= FACE_REACH.jaw * shape.open * w;
      out[2] += FACE_REACH.jawBack * shape.open * w;
      moved = true;
    }
  }
  return moved;
}

/**
 * Which of the controls each part of her face is made of, as Karryn's Prison layers a face (EXPRESSION_STUDY.md §1):
 * her brows, her eyes (her lids; where she looks and her pupils' size are keys of their own) and her mouth.
 */
export const PART_CONTROLS = {
  brows: ["brow", "browInner", "browArch", "browOuter", "browTip", "browNear", "browSpread"],
  eyes: ["lidUpper", "lidLower", "wide"],
  mouth: ["smile", "smirk", "open", "round", "bare", "lift", "cup", "purse", "press", "mouthUp", "tongue"],
} as const satisfies Record<string, readonly (keyof FaceControls)[]>;

/**
 * What each of her shape keys was first baked from (face.ts FACE_KEY_NAMES): each expression's brows, eyes and mouth on
 * their own, her lids shut, her eyes looking each way, and her pupils grown and shrunk.
 */
export function bakeRecipes(keys: readonly string[]): Record<string, Partial<FaceControls>> {
  const out: Record<string, Partial<FaceControls>> = {};
  const fixed: Record<string, Partial<FaceControls>> = {
    Blink: { lidUpper: 1, lidLower: 0.25 },
    Look_Left: { lookX: -1 }, Look_Right: { lookX: 1 }, Look_Up: { lookY: 1 }, Look_Down: { lookY: -1 },
    Pupil_Big: { pupil: 1 }, Pupil_Small: { pupil: -1 },
  };
  const parts: Record<string, readonly (keyof FaceControls)[]> = { Brow: PART_CONTROLS.brows, Eye: PART_CONTROLS.eyes, Mouth: PART_CONTROLS.mouth };
  for (const key of keys) {
    if (fixed[key]) {
      out[key] = fixed[key];
      continue;
    }
    const [, part, expression] = /^(Brow|Eye|Mouth)_(\w+)$/.exec(key) ?? [];
    const controls = part ? EXPRESSION_CONTROLS[expression as Expression] : undefined;
    if (!controls) continue;
    out[key] = Object.fromEntries(parts[part].map((c) => [c, controls[c]]).filter(([, v]) => v !== 0));
  }
  return out;
}
