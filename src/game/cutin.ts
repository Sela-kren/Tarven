import type { TouchRegion } from "./touch";

/**
 * Karryn's Prison's cut-ins, made for Tarven: the close-up panel that bursts in over the picture for each kind of
 * moment, each with its own framing, its own panel shape, its own drift across the screen and its own looping
 * motion (KP's are short animated loops that play while the panel slides). `kp` names the cut-in it answers
 * (RemtairyCutIn.js), for the comparison sheet. Their art is only a reference: every panel here is drawn live
 * from Tarven's own models.
 *
 * KP's toy cut-ins (rotor, dildo, anal beads) have no Tarven kind yet: Tarven has no toys to show.
 */
export type CutKind =
  | "breasts"
  | "nipples"
  | "pussy"
  | "clit"
  | "butt"
  | "anal"
  | "fingers"
  | "spank"
  | "kissed"
  | "deepKiss"
  | "kissHim"
  | "stroke"
  | "cumMouth"
  | "cumFace"
  | "cumBody"
  | "creampie"
  | "analCreampie"
  | "orgasm"
  | "flaunt";

/**
 * What moves, round and round while the panel is up: kneading (both hands in turn), pinching and rolling,
 * rubbing up and down, a fingertip circling, spreading her open, fingers in and out of her mouth, a spank wound up
 * and landed, lips pressing, a hand pumping, or no hand (her arching as she comes, her posing, or still).
 */
export type CutMotion = "knead" | "pinch" | "rub" | "circle" | "spread" | "suck" | "spank" | "kiss" | "pump" | "arch" | "pose" | "still";

/** Where what a man left on her shows: dribbling from her mouth, on her face, over her body, or running out of her. */
export type CutCum = "mouth" | "face" | "body" | "inside" | "behind";

/** The panel's proportions: landscape like KP's kisses, or tall like its butt and orgasm cut-ins. */
export type CutFormat = "wide" | "tall";

/** How she stands to the camera: facing it (angled to the guest, or square on), side on, or with her back to it. */
export type CutView = "front" | "square" | "under" | "above" | "between" | "profile" | "behind";

export interface CutIn {
  /** The Karryn's Prison cut-in it answers. */
  kp: string;
  /** The touch region it frames like (the comic's usual shot), before `bone`, `offset`, `distance` and `view`. */
  region: TouchRegion;
  /** Where the panel centres: a bone of hers and an offset from it in her model's space (front is -Z). */
  bone?: string;
  offset?: [number, number, number];
  /** How far back the camera stands, in model units. */
  distance?: number;
  view?: CutView;
  /** How many of his hands are on her: KP's breasts, nipples, butt and anal cut-ins use both. */
  hands: 0 | 1 | 2;
  motion: CutMotion;
  /** Seconds a loop of the motion takes. */
  loop: number;
  format: CutFormat;
  /** The panel's outline (a CSS polygon), cut on the slant like KP's. */
  shape: string;
  /** How far the panel slides while it's up, as a share of its width and height (KP's drift). */
  drift: [number, number];
  /** His body in the shot too: his face at hers for a kiss, or his crotch for her hand. */
  partner?: "kiss" | "crotch";
  /** What a man left on her, and where. */
  cum?: CutCum;
  /** The sound lettered big over it, and her voice (either may be empty): raw, like KP's. */
  hit: string;
  voice: string;
  /** Sparkles round her (flaunting), a white flash (coming). */
  sparkle?: boolean;
  flash?: boolean;
  /**
   * A close-up painted like KP's: drawn at twice the panel's resolution, her skin smooth and glossy (no blocky
   * texture), the camera tipped `roll` radians for KP's slant.
   */
  closeUp?: { roll: number };
  /**
   * Her legs spread for the panel (her copy only; the room never sees it), as KP draws her between her thighs: how
   * far each thigh is raised forward and swung out to her side, and how far her knees bend (radians).
   */
  legs?: { raise: number; out: number; knee: number };
}

/** Panel outlines, KP's shapes: a tipped pentagon, a tall leaning strip, a wide wedge, a kite. */
const PENTAGON = "polygon(22% 0%, 100% 10%, 94% 100%, 8% 88%, 0% 36%)";
const TALL_STRIP = "polygon(4% 2%, 100% 0%, 95% 100%, 0% 96%)";
const WEDGE = "polygon(0% 0%, 100% 20%, 97% 84%, 12% 100%)";
const KITE = "polygon(8% 6%, 100% 0%, 92% 92%, 0% 100%)";
const SLANT = "polygon(0% 10%, 94% 0%, 100% 90%, 6% 100%)";

export const CUT_INS: Record<CutKind, CutIn> = {
  breasts: {
    kp: "Petting boobs (cutin_pt_bb)",
    region: "chest",
    bone: "Bust",
    offset: [0, -0.05, -0.08],
    // KP's frames: close in from a little below and to her side, her breasts filling the panel and over its edges,
    // his forearms up from its bottom; both hands squeeze at once, quick, pushing her breasts up (10 frames, ~0.36s).
    distance: 0.3,
    view: "under",
    hands: 2,
    motion: "knead",
    loop: 0.45,
    format: "wide",
    shape: PENTAGON,
    drift: [0.1, -0.1],
    hit: "squish♥",
    voice: "my tits—!",
    closeUp: { roll: 0.1 },
  },
  nipples: {
    kp: "Petting nipples (cutin_pt_ns)",
    region: "chest",
    bone: "Bust",
    offset: [0, -0.01, -0.09],
    // KP's frames: close over her breasts from a little above, her collarbone at the top; a hand at each nipple,
    // thumb and finger pinching it and tugging it out (12 frames, 0.8s).
    distance: 0.4,
    view: "above",
    hands: 2,
    motion: "pinch",
    loop: 0.55,
    format: "wide",
    shape: KITE,
    drift: [0.12, 0],
    hit: "pinch♥",
    voice: "n-not there...!",
    closeUp: { roll: -0.12 },
  },
  pussy: {
    kp: "Petting pussy (cutin_pt_ps)",
    region: "intimate",
    bone: "Hips",
    offset: [0, -0.16, -0.1],
    distance: 1.15,
    view: "front",
    hands: 1,
    motion: "rub",
    loop: 0.6,
    format: "tall",
    shape: TALL_STRIP,
    drift: [-0.1, 0],
    hit: "rub rub♥",
    voice: "so wet... damn it...",
  },
  clit: {
    kp: "Petting clit (cutin_pt_ct)",
    region: "intimate",
    // KP's frames: right up between her spread thighs, from a little below, her vulva just above the middle, her
    // belly at the top and the undersides of her cheeks at the bottom; his hand in over her mound from the top, two
    // fingertips circling her clit (8 frames, 0.44s). (The panel finds her clit itself; this is the fallback.)
    bone: "Hips",
    offset: [0, -0.1, -0.06],
    distance: 0.34,
    view: "between",
    hands: 1,
    motion: "circle",
    loop: 0.44,
    format: "tall",
    shape: TALL_STRIP,
    drift: [-0.1, 0],
    hit: "flick♥",
    voice: "hyaah♥!",
    closeUp: { roll: 0.06 },
    legs: { raise: 0.5, out: 0.5, knee: 0.4 },
  },
  butt: {
    kp: "Petting butt (cutin_pt_bt)",
    region: "rear",
    bone: "Hips",
    offset: [0, -0.05, 0.13],
    distance: 0.72,
    view: "behind",
    hands: 2,
    motion: "knead",
    loop: 0.75,
    format: "tall",
    shape: TALL_STRIP,
    drift: [0.12, 0],
    hit: "grope♥",
    voice: "hands off my ass!",
  },
  anal: {
    kp: "Petting anal (cutin_pt_an)",
    region: "rear",
    bone: "Hips",
    offset: [0, -0.08, 0.12],
    distance: 0.55,
    view: "behind",
    hands: 2,
    motion: "spread",
    loop: 0.9,
    format: "wide",
    shape: SLANT,
    drift: [0.1, 0.1],
    hit: "spread—",
    voice: "not that hole—!",
  },
  fingers: {
    kp: "Sucking fingers (cutin_fg_sc)",
    region: "lips",
    bone: "Head",
    offset: [0, 0.075, -0.13],
    distance: 0.65,
    view: "front",
    hands: 1,
    motion: "suck",
    loop: 0.55,
    format: "wide",
    shape: WEDGE,
    drift: [0, -0.12],
    hit: "slurp♥",
    voice: "mmgh—",
  },
  spank: {
    kp: "Spanking 1-3 (cutin_bs1-3)",
    region: "rear",
    bone: "Glute_L",
    offset: [0, -0.06, 0.09],
    distance: 0.75,
    view: "behind",
    hands: 1,
    motion: "spank",
    loop: 0.9,
    format: "tall",
    shape: TALL_STRIP,
    drift: [0, 0],
    hit: "SMACK!",
    voice: "kyaa!",
  },
  kissed: {
    kp: "Enemy kiss 1 (cutin_ks1_e)",
    region: "lips",
    bone: "Head",
    offset: [0, 0.075, -0.12],
    distance: 0.5,
    view: "profile",
    hands: 0,
    motion: "kiss",
    loop: 1.2,
    format: "wide",
    shape: WEDGE,
    drift: [0.12, 0],
    partner: "kiss",
    hit: "chu♥",
    voice: "mmph—!",
  },
  deepKiss: {
    kp: "Enemy kiss 2 (cutin_ks2_e)",
    region: "lips",
    bone: "Head",
    offset: [0, 0.075, -0.12],
    distance: 0.42,
    view: "profile",
    hands: 0,
    motion: "kiss",
    loop: 0.8,
    format: "wide",
    shape: SLANT,
    drift: [0.12, 0],
    partner: "kiss",
    hit: "chu♥ chuu♥",
    voice: "his tongue...",
  },
  kissHim: {
    kp: "Karryn kiss 1-2 (cutin_ks1_k, ks2_k)",
    region: "lips",
    bone: "Head",
    offset: [0, 0.075, -0.12],
    distance: 0.5,
    view: "profile",
    hands: 0,
    motion: "kiss",
    loop: 1,
    format: "wide",
    shape: WEDGE,
    drift: [-0.12, 0],
    partner: "kiss",
    hit: "chu♥",
    voice: "mmh♥",
  },
  stroke: {
    kp: "Cock petting (cutin_pt_ck)",
    region: "hand",
    distance: 0.55,
    hands: 1,
    motion: "pump",
    loop: 0.5,
    format: "tall",
    shape: KITE,
    drift: [0.1, 0],
    partner: "crotch",
    hit: "shlick shlick",
    voice: "so hard...",
  },
  cumMouth: {
    kp: "Ejaculate mouth (cutin_ej_m)",
    region: "lips",
    bone: "Head",
    offset: [0, 0.07, -0.12],
    distance: 0.5,
    view: "front",
    hands: 0,
    motion: "still",
    loop: 1,
    format: "wide",
    shape: WEDGE,
    drift: [-0.12, 0],
    cum: "mouth",
    hit: "SPLURT",
    voice: "gulp...♥",
  },
  cumFace: {
    kp: "Bukkake (cutin_ej_bk)",
    region: "face",
    bone: "Head",
    offset: [0, 0.1, -0.1],
    distance: 0.62,
    view: "front",
    hands: 0,
    motion: "still",
    loop: 1,
    format: "tall",
    shape: TALL_STRIP,
    drift: [0.12, 0],
    cum: "face",
    hit: "SPLAT♥",
    voice: "all over me...",
  },
  cumBody: {
    kp: "Bukkake on her body (cutin_ej_bk)",
    region: "chest",
    bone: "Bust",
    offset: [0, -0.03, -0.07],
    distance: 0.8,
    view: "front",
    hands: 0,
    motion: "still",
    loop: 1,
    format: "tall",
    shape: TALL_STRIP,
    drift: [0.12, 0],
    cum: "body",
    hit: "SPLAT♥",
    voice: "it's so hot...",
  },
  creampie: {
    kp: "Pussy creampie (cutin_ej_ps)",
    region: "intimate",
    bone: "Hips",
    offset: [0, -0.1, -0.1],
    distance: 0.55,
    view: "front",
    hands: 0,
    motion: "still",
    loop: 1,
    format: "wide",
    shape: SLANT,
    drift: [0, 0],
    cum: "inside",
    hit: "DOPU♥",
    voice: "inside... he came inside...",
  },
  analCreampie: {
    kp: "Anal creampie (cutin_ej_an)",
    region: "rear",
    bone: "Hips",
    offset: [0, -0.09, 0.12],
    distance: 0.6,
    view: "behind",
    hands: 0,
    motion: "still",
    loop: 1,
    format: "wide",
    shape: SLANT,
    drift: [0, 0],
    cum: "behind",
    hit: "DOPU♥",
    voice: "it's leaking out...",
  },
  orgasm: {
    kp: "Karryn orgasm 1-2 (cutin_or1, or2)",
    region: "face",
    bone: "Torso",
    offset: [0, 0.22, -0.05],
    distance: 1.25,
    view: "front",
    hands: 0,
    motion: "arch",
    loop: 0.25,
    format: "tall",
    shape: TALL_STRIP,
    drift: [0, 0.14],
    hit: "!!!",
    voice: "I'm coming—♥",
    flash: true,
  },
  flaunt: {
    kp: "Karryn flaunt (cutin_flaunt1)",
    region: "chest",
    bone: "Torso",
    offset: [0, 0.14, -0.08],
    distance: 1.7,
    view: "front",
    hands: 0,
    motion: "pose",
    loop: 1.6,
    format: "tall",
    shape: KITE,
    drift: [0.12, 0],
    hit: "~♪",
    voice: "like what you see?",
    sparkle: true,
  },
};

/** Spanks by how hard (KP's three spanking cut-ins): the sound over it, and how far it's wound up. */
export const SPANK_LEVELS = [
  { hit: "SMACK!", wind: 0.09, voice: "kyaa!" },
  { hit: "SMACK!!", wind: 0.13, voice: "hiiih—!" },
  { hit: "THWACK!!!", wind: 0.18, voice: "my ass...♥" },
] as const;

/** How hard a spank of this boldness lands: KP's spanking 1, 2 or 3. */
export function spankLevel(level: number): 1 | 2 | 3 {
  return level >= 8 ? 3 : level >= 5 ? 2 : 1;
}

/** Touches that are a hand coming down on her behind. */
const SPANKS = new Set(["smack", "swat", "luckyPat", "banditSmack", "scuffleSpank"]);
/** Touches that are a grab with the whole hand: kneading, on her chest or her behind. */
const GRABS = new Set(["grab", "bothHands", "cup", "squeeze", "gloved", "brush"]);

/**
 * Which cut-in a touch plays, when it has one of its own: a spank or a grab on her behind, a grab or a pinch on her
 * chest, a hand between her legs (her clit once it's bold), a kiss, his fingers in her mouth. Null keeps the
 * comic's plain shot for that touch (a hand on her shoulder, a look, a brawl's blows).
 */
export function cutKindFor(id: string, region: TouchRegion, level = 4, noHand = false): CutKind | null {
  if (noHand) return null;
  if (region === "rear") return SPANKS.has(id) ? "spank" : GRABS.has(id) || id === "roam" ? "butt" : null;
  if (region === "chest") return id === "pinch" ? "nipples" : GRABS.has(id) || id === "roam" ? "breasts" : null;
  if (region === "intimate") return level >= 8 ? "clit" : "pussy";
  if (region === "lips") {
    if (id === "scuffleMouth" || id === "feed") return "fingers";
    if (id === "deepKiss") return "deepKiss";
    if (id === "kiss" || id === "stolenKiss" || id === "scuffleKiss") return "kissed";
  }
  return null;
}
