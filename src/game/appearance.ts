import { Color, Material, Matrix4, MeshLambertMaterial, Object3D, Quaternion, SkinnedMesh, Vector3 } from "three";
import {
  DISC_MATERIAL, NIPPLE_TYPES, nippleProfile, readDiscs, shapeDisc, skinUnder, tentHeight, type Disc, type NippleType,
} from "./nipples";
import {
  BRIEF_STYLES, LINGERIE_MATERIAL, TOP_STYLES, bottomStyle, coversNipples, lingerieTexture, topStyle, type Rgb, type UnderStyle,
} from "./lingerie";
import { PUBIC_MATERIAL, PUBIC_STYLES, pubicStyle, pubicTexture, type PubicStyle } from "./pubes";
import {
  CANAL_MATERIAL, HOLE_MATERIAL, LABIA_MATERIAL, VULVA_MATERIAL, VULVA_STRETCHED, VULVA_TYPES, gridOf, readVulva, rideVulva,
  shapeVulva, vulvaRiders, vulvaShape, type VulvaPatch, type VulvaRiders, type VulvaShape, type VulvaType,
} from "./vulva";
import {
  ANUS_MATERIAL, ANUS_SKIN_MATERIAL, ANUS_STRETCHED, ANUS_TYPES, anusShape, readAnus, shapeAnus, type AnusPatch, type AnusType,
} from "./anus";
import {
  GLANS_MATERIAL, PENIS_MATERIAL, PENIS_TYPES, SCROTUM_MATERIAL, penisFrame, penisShape, readPenis, shapePenis, type PenisPatch,
  type PenisType,
} from "./penis";
import { FACE_LINES, faceMove, faceMoved, faceRig, REST_FACE, type FaceRig, type FaceShape } from "./face";
import { coatRetroMaterial, coverCoat, solidRetroMaterial, stainRetroMaterial } from "./retro";
import type { LegSize } from "./skirt";

/**
 * Character customisation: body sliders, skin, face and clothing colours, and pieces that can be taken off.
 * Everything starts at the model as built; a slider at 0 or a colour left unset changes nothing.
 */

export type BodyName = "Male" | "Female";
export const BODY_NAMES: readonly BodyName[] = ["Male", "Female"];
/** "Cum" is what men leave on her: splats in stages, shown by the night's state, never part of the look. */
export type MeshPart = "Body" | "Cloth" | "Hair" | "Shoes" | "Cum" | "Jewel";
export type LookTab = "body" | "face" | "hair" | "skin" | "clothes";

export interface Look {
  /** Slider settings from -1 to 1. A missing slider sits at 0: the model as built. */
  sliders: Record<string, number>;
  /** Colours as "#rrggbb". A missing one keeps the model's own. */
  colors: Record<string, string>;
  /** Optional pieces taken off, by id. */
  hidden: string[];
  /** The hairstyle's id. Missing means the character's own, the first in their list. */
  hairstyle?: string;
  /** The outfit's id. Missing means the character's own, the first in their list. */
  outfit?: string;
  /** The legwear style's id. Missing means the outfit's own. */
  legwear?: string;
  /** Her nipples' type's id. Missing means the first, neat. */
  nipples?: string;
  /** Her bust's shape's id. Missing means the first, teardrop. */
  bustShape?: string;
  /** Her pubic hair's style's id. Missing means the first, trimmed. */
  pubes?: string;
  /** Her vulva's type's id. Missing means the first, tucked. */
  vulva?: string;
  /** Her anus's type's id. Missing means the first, tight. */
  anus?: string;
  /** His penis's type's id. Missing means the first, uncut. */
  penis?: string;
  /** The shoe style's id. Missing means the character's own shoes, the first in their list. */
  shoes?: string;
  /** Her bra's style's id, or a one-piece's, worn instead of her briefs too. Missing means her breast band. */
  bra?: string;
  /** Her briefs' style's id. Missing means her braies. */
  briefs?: string;
  /** The jewellery she has on, by id. Missing means what she's built wearing: her necklace, and no piercings. */
  jewellery?: string[];
}

export function newLook(): Look {
  return { sliders: {}, colors: {}, hidden: [] };
}

export function copyLook(look: Look): Look {
  const copy: Look = { sliders: { ...look.sliders }, colors: { ...look.colors }, hidden: [...look.hidden] };
  if (look.hairstyle) copy.hairstyle = look.hairstyle;
  if (look.outfit) copy.outfit = look.outfit;
  if (look.legwear) copy.legwear = look.legwear;
  if (look.nipples) copy.nipples = look.nipples;
  if (look.bustShape) copy.bustShape = look.bustShape;
  if (look.pubes) copy.pubes = look.pubes;
  if (look.vulva) copy.vulva = look.vulva;
  if (look.anus) copy.anus = look.anus;
  if (look.penis) copy.penis = look.penis;
  if (look.shoes) copy.shoes = look.shoes;
  if (look.bra) copy.bra = look.bra;
  if (look.briefs) copy.briefs = look.briefs;
  if (look.jewellery) copy.jewellery = [...look.jewellery];
  return copy;
}

/** How one slider reshapes the mesh around one bone. Distances are in metres from the bone's joint. */
interface BoneTerm {
  bone: string;
  /** Growth along X, Y and Z at a slider value of 1; -1 shrinks by the same share unless `shrink` says otherwise. */
  grow: readonly [number, number, number];
  /** How much it shrinks at -1, where growing and shrinking by the same share would go too far. */
  shrink?: readonly [number, number, number];
  /** How far it moves, in metres, at a value of 1: a full bust drops and comes forwards as it grows. */
  shift?: readonly [number, number, number];
  /** How far it moves at -1, where that differs from the opposite of `shift`. */
  shrinkShift?: readonly [number, number, number];
  /** Only this stretch below or above the joint grows lengthwise; past it the mesh just moves along. */
  span?: readonly [number, number];
  /** The growth is full at the first height and fades out by the second, along a smooth curve. */
  fade?: readonly [number, number];
  /**
   * The growth is full only between the middle two heights and fades out smoothly up to the first and down to the
   * last, from the top down, so a calf or an ankle can swell with the knee and the foot left alone.
   */
  band?: readonly [number, number, number, number];
  /**
   * Only the back changes: nothing in front of the first depth behind the joint, all of it past the second,
   * along a smooth curve, as the small of the back curves in while the belly stays as it is.
   */
  back?: readonly [number, number];
  /** Lengthwise growth is measured from this height above the joint instead of from the joint itself. */
  pivot?: number;
  /**
   * Grows about two centres instead of the joint: this offset from it, mirrored across the middle, so each breast
   * swells round about its own middle instead of stretching into a cone. Inside a breast, between its middle and
   * the cleavage, the centre slides in with the point: the inner side only comes forwards, never towards the
   * middle, so the cleavage keeps its width and the bodice over it lies smooth.
   */
  lobes?: readonly [number, number, number];
  /** Grows about this point, from the bone's joint, instead of the joint itself: a hand about its wrist. */
  about?: readonly [number, number, number];
  /**
   * Where the body's middle is across from this bone's joint, for a bone on one side of it, as a glute is. Growing
   * across, the side towards the middle swells along a curve that meets the middle flat instead of being pushed
   * over it, so the cheek rounds into the cleft and the two sides never pass through each other.
   */
  midline?: number;
  /**
   * The move reaches past where the bone's weight fades: it counts as the weight to this power instead of the weight
   * itself, so a breast slides whole, root and all, where its weight thins out towards the chest.
   */
  reach?: number;
  /**
   * How far each side moves away from the middle, in metres at a value of 1: breasts set further apart. It eases in
   * from the middle (to each breast's middle, for `lobes` terms), so the skin there stretches instead of tearing.
   */
  apart?: number;
  /** How far apart at -1, where that differs from the opposite of `apart`. */
  shrinkApart?: number;
  /** How far each side turns outwards, in metres at the front of the breast at a value of 1: nipples that point out. */
  turn?: number;
  /** Only these mesh parts change, as hair sliders leave the head under the hair alone. Joints never move for these. */
  parts?: readonly MeshPart[];
}

/**
 * Named steps a slider snaps to, as cup sizes. `zero` is the step at 0; the rest share -1..0 and 0..1 evenly, 1
 * at `full` (the last step unless given); any steps past `full` go on past 1 by the same step.
 */
export interface SliderStops {
  labels: readonly string[];
  zero: number;
  full?: number;
}

export interface SliderDef {
  id: string;
  label: string;
  tab: "body" | "face" | "hair";
  /** Grows or shrinks the whole character by this share at a value of 1. */
  height?: number;
  terms: BoneTerm[];
  /** A heading the customise panel shows above the first slider of a group. */
  group?: string;
  stops?: SliderStops;
  /** How far either way a random look goes, out of 1. 0.8 unless given. */
  roll?: number;
  /** Reshapes the body as built, before the other sliders, so their growth carries its change along with it. */
  early?: boolean;
  /**
   * How much of its terms the slider already applies at 0, for a shape she has as she stands: -1 takes it away
   * entirely and 1 gives all of it.
   */
  rest?: number;
}

/** How many steps above `zero` make a value of 1: up to `full` if given, else the last step. */
const stepsToOne = (stops: SliderStops) => (stops.full ?? stops.labels.length - 1) - stops.zero;

/** Where on the slider a named step sits. Steps past `full` go on past 1, as far apart as the rest. */
export function stopValue(stops: SliderStops, index: number): number {
  if (index < stops.zero) return (index - stops.zero) / stops.zero;
  if (index > stops.zero) return (index - stops.zero) / stepsToOne(stops);
  return 0;
}

/** The named step nearest a slider value. */
export function nearestStop(stops: SliderStops, value: number): number {
  const v = clampSlider(value, stopValue(stops, stops.labels.length - 1));
  return stops.zero + Math.round(v < 0 ? v * stops.zero : v * stepsToOne(stops));
}

/**
 * Cup sizes, one letter for each inch the bust measures over the band: A at -1, C as built, Q at 1, on up to Z
 * past it. Q stays at 1, where the cup's growth was measured, so a saved Q is still a Q; R to Z carry on by the
 * same inch a step (about 1.64 at Z).
 */
export const CUPS: SliderStops = { labels: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""), zero: 2, full: 16 };
/** The cup slider's value at its largest cup, Z. */
export const CUP_TOP = stopValue(CUPS, CUPS.labels.length - 1);

/** The furthest a slider goes: past 1 for one whose named steps run on past 1, as cup sizes do. */
export function sliderTop(def: SliderDef): number {
  return def.stops ? stopValue(def.stops, def.stops.labels.length - 1) : 1;
}

export interface ColorDef {
  id: string;
  label: string;
  tab: "face" | "hair" | "skin" | "clothes";
  /** The materials it covers, by mesh part and material name. The first is the one the swatches match. */
  parts: [MeshPart, string][];
  /**
   * "tone" moves every material by the same amount as the first, so shading and blush keep their differences.
   * "dye" paints each the new colour, keeping only how light or dark it was next to the first.
   */
  mode: "tone" | "dye";
  palette: string[];
  /** Follows that colour's change when this one is left alone, as lips follow the skin. */
  follows?: string;
}

export interface PieceDef {
  id: string;
  label: string;
  parts: [MeshPart, string][];
}

/**
 * A piece of jewellery: its own mesh, "<Body>_Jewel<mesh>", which she puts on and takes off like an accessory
 * rather than it being part of her body.
 */
export interface JewelDef {
  id: string;
  label: string;
  mesh: string;
  /** She's built wearing it: on until the look takes it off. */
  worn: boolean;
  /**
   * Where she's pierced for it, which must be bare for it to show, as it would poke through anything over it:
   * her nipples, her belly or her groin. Null for one worn over her clothes, such as a necklace.
   */
  bare: "chest" | "belly" | "groin" | null;
}

export const FEMALE_JEWELLERY: JewelDef[] = [
  { id: "necklace", label: "Necklace", mesh: "Necklace", worn: true, bare: null },
  { id: "nippleRings", label: "Nipple rings", mesh: "Nipples", worn: false, bare: "chest" },
  { id: "navelBar", label: "Belly ring", mesh: "Navel", worn: false, bare: "belly" },
  { id: "hoodRing", label: "Clit hood ring", mesh: "Hood", worn: false, bare: "groin" },
];

/** The ids of the jewellery a look has on: its own list, or what the body is built wearing. */
export function jewelleryOf(body: BodyName, look: Pick<Look, "jewellery">): string[] {
  return look.jewellery ?? LOOK_OPTIONS[body].jewellery.filter((def) => def.worn).map((def) => def.id);
}

/** The jewellery a jewel mesh is, by the mesh name after "<Body>_Jewel"; null for any other mesh. */
export function jewelOf(object: Object3D, body: BodyName): JewelDef | null {
  const pattern = new RegExp(`^${body}_Jewel([A-Z][a-z]+)`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return LOOK_OPTIONS[body].jewellery.find((def) => def.mesh === match[1]) ?? null;
  }
  return null;
}

/**
 * A legwear style: which bands of the legs it covers, by their materials on the cloth, and whether the sock cuff
 * at the top of the shoes shows. Without it, the cuff is painted over in skin.
 */
export interface LegwearDef {
  id: string;
  label: string;
  bands: string[];
  cuff: boolean;
}

/** A hairstyle: the mesh that shows for it, "<Body>_Hair<mesh>", or null for none at all. */
/**
 * A pair of shoes: the mesh that shows for them, "<Body>_Shoes<mesh>" ("" for the character's own). Heels are built
 * reaching below the own shoes' floor; the character is lifted to stand on them (see Dresser.apply).
 */
export interface ShoeStyleDef {
  id: string;
  label: string;
  mesh: string;
}

export interface HairstyleDef {
  id: string;
  label: string;
  mesh: string | null;
}

/**
 * A whole outfit: the cloth mesh that shows for it, "<Body>_Cloth<mesh>" ("" for the character's own), the clothes
 * colours it has, and the colours it is put on with. Garments shared between outfits share a colour id and a
 * material name, so they recolour and come off alike.
 */
export interface OutfitDef {
  id: string;
  label: string;
  mesh: string;
  /** Its clothes colours by id: the customise panel shows only these, and only these come off. */
  colors: string[];
  /** The colours it is put on with, over the model's own. Can set colours it doesn't list, such as the shoes' socks. */
  preset: Record<string, string>;
  /** Only guests wear it for now: the customise panel doesn't offer it, and a saved look can't have it on. */
  guestOnly?: boolean;
  /** The legwear style it's put on with. Left out for an outfit whose legs are covered, which has no legwear. */
  legwear?: string;
  /** The underwear styles it's put on with (lingerie.ts ids), for an outfit made to show them. */
  under?: { bra?: string; briefs?: string };
}

export interface LookOptions {
  sliders: SliderDef[];
  colors: ColorDef[];
  pieces: PieceDef[];
  /** The first is the character's own hair, which the look starts with. */
  hairstyles: HairstyleDef[];
  /** The first is the character's own outfit, which the look starts with. */
  outfits: OutfitDef[];
  /** Lengths of stockings and socks, for the outfits that have legwear. */
  legwear: LegwearDef[];
  /** Her necklace and piercings, for a body built with them. */
  jewellery: JewelDef[];
  /** Types of nipple, for a body built with them; the first is the default. */
  nipples: NippleType[];
  /** Shapes of bust; the first is the default, the model as built. */
  bustShapes: BustShape[];
  /** Styles of pubic hair, for a body built with the patch they're drawn on; the first is the default. */
  pubes: PubicStyle[];
  /** Types of vulva, for a body built with the grid they're shaped from; the first is the default. */
  vulva: VulvaType[];
  /** Types of anus, for a body built with the disc they're shaped from; the first is the default. */
  anus: AnusType[];
  /** Types of penis, for a body built with the tube and sack they're shaped from; the first is the default. */
  penis: PenisType[];
  /** Pairs of shoes; the first is the character's own, which the look starts with. Empty for one with no others. */
  shoes: ShoeStyleDef[];
  /**
   * Underwear drawn on the body built with a patch for it (lingerie.ts): bras and one-pieces, and briefs. The first
   * of each is the one painted on the body itself. Empty for one without.
   */
  tops: UnderStyle[];
  bottoms: UnderStyle[];
}

/** A shape of bust: terms on top of the cup size, as strong as shapeAmount says for the cup. */
export interface BustShape {
  id: string;
  label: string;
  terms: BoneTerm[];
}

const both = (label: string) => [`${label}_L`, `${label}_R`];
/** Rear changes are full from 3 cm below the glute joint and gone 11 cm above it, at the small of the back. */
const REAR_FADE = [-0.03, 0.11] as const;
/** Her hair's spring bones, and the bones they sit on. */
const HAIR_SPRINGS: readonly [string, string][] = [["HairSoft", "Head"], ["HairTail", "Torso"]];
/** Her breast band's material, painted on her body over the bust. */
const BAND_MATERIAL = "T_bra";
/**
 * What holds her bust while she has it on, and how firmly, out of 1: her breast band most, a bodice or corset laced
 * over it a little less, the priestess's top less again. Wearing more than one, the firmest counts.
 */
const BUST_HOLDS: Readonly<Record<string, number>> = { bra: 1, bodice: 0.8, top: 0.6 };
/**
 * What being held does to her bust at full hold, on top of her own sliders: lifted, drawn in together, rounder
 * towards the cleavage and closer to her body. Out of it, it settles back to the shape her sliders give it.
 */
const BUST_HELD: Readonly<Record<string, number>> = { bustLift: 0.35, bustTogether: 0.5, bustInner: 0.3, bustCloser: 0.25 };
/** How round the inner side of each breast fills with the inner fullness slider at 0 (see activeTerms). */
const INNER_AS_BUILT = 0.6;
/** How far each bust shape opens the cleavage (see ActiveTerm.cleft): those that set the breasts apart. */
const CLEFT_OF_SHAPE: Readonly<Record<string, number>> = { sideset: 0.7, eastwest: 0.3 };
/** How far the Inner fullness slider opens the cleavage at -1, drawing the inner sides in. */
const CLEFT_OF_INNER = 0.5;
/** The neck sliders reshape her skin and what lies on it, never her hair, which keeps to the head. */
const NECK_PARTS: readonly MeshPart[] = ["Body", "Cloth", "Cum"];
/** Each glute's joint is 6.5 cm to its side of the body's middle. */
const GLUTE_MIDDLE = 0.065;
/** The same terms for both glutes, each knowing which way the body's middle lies (see `midline`). */
const glutes = (grow: BoneTerm["grow"], extra: Omit<BoneTerm, "bone" | "grow"> = {}): BoneTerm[] => [
  { bone: "Glute_L", grow, midline: GLUTE_MIDDLE, ...extra },
  { bone: "Glute_R", grow, midline: -GLUTE_MIDDLE, ...extra },
];
const terms = (bones: string[], grow: BoneTerm["grow"], extra: Omit<BoneTerm, "bone" | "grow"> = {}): BoneTerm[] =>
  bones.map((bone) => ({ bone, grow, ...extra }));
/** How much of the Back arch slider's curve in the small of her back she has at 0 (see SliderDef.rest). */
const ARCH_REST = 0.4;
/** Her hips' and torso's joints, metres above the floor, which the lumbar band's heights are measured from. */
const HIPS_AT = 0.86;
const TORSO_AT = 0.98;
/**
 * The small of her back, drawn in by `depth` metres: most between her waist and the top of her hips, easing out
 * up to her shoulder blades and down onto her rear, and only on her back, easing in from her sides. Given on both
 * bones the skin there shares, at the same heights, so it moves alike whichever holds it.
 */
const lumbar = (depth: number): BoneTerm[] =>
  ([["Hips", HIPS_AT], ["Torso", TORSO_AT]] as const).map(([bone, at]) => ({
    bone,
    grow: [0, 0, 0],
    shift: [0, 0, depth],
    band: [1.15 - at, 1.06 - at, 0.99 - at, 0.91 - at],
    back: [0, 0.03],
  }));

const SKIN_TONES = ["#f6d5be", "#eab594", "#dba07f", "#c68a64", "#a86f4c", "#8a5536", "#6b3f27", "#4a2a1a"];
const HAIR_COLORS = ["#130f0f", "#3b2416", "#6b4226", "#a0663a", "#8c2f1c", "#c9a066", "#e3cf9c", "#9a948a", "#e8e4dc"];
const EYE_COLORS = ["#0a0807", "#192126", "#3a2416", "#5b8ead", "#3d6e3f", "#7a5a2c", "#6a6a78"];
const LIP_COLORS = ["#cc706d", "#e59993", "#d88a7a", "#b04a52", "#8c3a3a", "#9e6554"];
/** Areolae from pale pink to deep brown. */
const NIPPLE_COLORS = ["#f0b8ad", "#e09a8c", "#c97d70", "#b46a5c", "#94544a", "#6e3d33", "#4c2a23"];
/** The slit and inner lips, from light pink to deep brown. */
const VULVA_COLORS = ["#eaa8a4", "#d98a8c", "#c4707a", "#a8586a", "#8a4a52", "#6a3a3c", "#4a2a2a"];
/** The rim of her anus, from pink to deep brown. */
const ANUS_COLORS = ["#d8a090", "#c4867a", "#a8705f", "#8e5a4c", "#74463b", "#5a352c", "#40261f"];
/** His glans, from light pink to deep brown. */
const GLANS_COLORS = ["#e2a09a", "#d0868a", "#b86e72", "#9c5a5c", "#7e4a48", "#5e3834", "#432824"];
/** Pubic hair: the hair's own colours, then dyes. */
const PUBIC_COLORS = [...HAIR_COLORS, "#d0508a", "#8a3ab0", "#2f5fb0", "#2f8a6a", "#c02828"];
const GEM_COLORS = ["#3aa6d6", "#3f9a5a", "#b0303a", "#7a3fa0", "#e0c040", "#e8e8f0"];
const CLOTH_COLORS = [
  "#e8e0cc", "#b8ad96", "#2b2b2b", "#5b1417", "#8c2020", "#2b3d23", "#3d5a48",
  "#24345a", "#2f5590", "#6a4a8a", "#8a7a3e", "#4c3c2b", "#3d2314", "#7d6c55",
];

/** Colours of the pirate's rig that both bodies have. */
function pirateColors(): ColorDef[] {
  const dye = (id: string, label: string, material: string): ColorDef =>
    ({ id, label, tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", material]] });
  return [
    dye("sash", "Sash", "T_sash"),
    dye("breeches", "Breeches", "T_breeches"),
    dye("boots", "Boots", "T_boot"),
    dye("hat", "Hat", "T_hat"),
    dye("braid", "Braid", "T_braid"),
  ];
}

/**
 * The adventuring party's kit, which both bodies have: the archer's jerkin, bracers and mantle (a cloak the noble
 * wears too), the warrior's mail, plate and tabard (the cleric's tabard too), and the mage's and cleric's robes.
 */
function factionColors(): ColorDef[] {
  const dye = (id: string, label: string, material: string): ColorDef =>
    ({ id, label, tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", material]] });
  return [
    dye("jerkin", "Jerkin", "T_jerkin"), dye("bracers", "Bracers", "T_bracer"), dye("cloak", "Cloak", "T_cloak"),
    dye("mail", "Mail", "T_mail"), dye("plate", "Plate", "T_plate"), dye("tabard", "Tabard", "T_tabard"),
    dye("robe", "Robe", "T_robe"),
  ];
}

/**
 * Joints, measured on the models: the female's knee is 0.33 below the hip joint and her ankle about 0.35
 * below the knee; the male's are 0.42 and 0.46. Her torso joint is at the waist, shoulders 0.32 above it.
 */
const FEMALE_SLIDERS: SliderDef[] = [
  { id: "height", label: "Height", tab: "body", height: 0.06, terms: [] },
  {
    id: "build", label: "Build", tab: "body", terms: [
      ...terms(["Torso"], [0.1, 0, 0.1]),
      ...terms(["Hips"], [0.08, 0, 0.08]),
      ...terms([...both("Thigh"), ...both("ThighSoft")], [0.15, 0, 0.15]),
      ...terms(both("Shin"), [0.1, 0, 0.1], { fade: [0, -0.3] }),
      ...terms(both("UpperArm"), [0.15, 0, 0.15]),
      ...terms(both("ForeArm"), [0.12, 0, 0.12]),
      ...terms(["Belly"], [0.2, 0.1, 0.2]),
      ...glutes([0.1, 0.1, 0.1]),
    ],
  },
  { id: "shoulders", label: "Shoulders", tab: "body", terms: terms(["Torso"], [0.12, 0, 0], { fade: [0.3, 0.12] }) },
  {
    id: "waist", label: "Waist", tab: "body", terms: [
      ...terms(["Torso"], [0.15, 0, 0.12], { fade: [0.04, 0.2] }),
      ...terms(["Belly"], [0.15, 0, 0.15]),
    ],
  },
  {
    id: "hips", label: "Hips", tab: "body", terms: [
      ...terms(["Hips"], [0.14, 0, 0.1]),
      ...glutes([0.12, 0.08, 0.15], { fade: REAR_FADE }),
    ],
  },
  {
    id: "arms", label: "Arms", tab: "body", terms: [
      ...terms(both("UpperArm"), [0.18, 0, 0.18]),
      ...terms(both("ForeArm"), [0.15, 0, 0.15]),
    ],
  },
  // The hand is the end of the forearm bone, from the wrist 20 cm below the elbow to the fingertips at 35 cm, and
  // sits 6 cm out from the elbow as the arm hangs splayed: it grows about the wrist, so it stays on the arm.
  {
    id: "hands", label: "Hand size", tab: "body", roll: 0.4, terms: [
      { bone: "ForeArm_L", grow: [0.25, 0.25, 0.25], shrink: [0.15, 0.15, 0.15], about: [-0.06, -0.2, 0.005], fade: [-0.215, -0.19] },
      { bone: "ForeArm_R", grow: [0.25, 0.25, 0.25], shrink: [0.15, 0.15, 0.15], about: [0.06, -0.2, 0.005], fade: [-0.215, -0.19] },
    ],
  },
  // Her neck is part of the head: it follows the head bone from its base in the shoulders, 3.5 cm below the head's
  // joint, up to under the chin, 3 cm above it. The torso's skin stops 1.5 cm short of the joint.
  {
    // The head's joint, and with it the head, rises out of the torso; the neck's base is drawn back down by as much,
    // so the neck alone stretches and its base stays seated in the shoulders. Her hair rides up with the head.
    id: "neckLength", label: "Length", tab: "body", group: "Neck", terms: [
      { bone: "Torso", grow: [0, 0, 0], shift: [0, 0.025, 0], shrinkShift: [0, -0.015, 0], fade: [0.388, 0.38] },
      ...terms(["Head"], [0, 0.385, 0], { shrink: [0, 0.23, 0], pivot: 0.03, span: [-0.065, 0], parts: NECK_PARTS }),
    ],
  },
  // Wider or slimmer between the base and the chin, easing out at both, so the shoulders and the jaw keep their shape.
  {
    id: "neckWidth", label: "Thickness", tab: "body", group: "Neck",
    terms: terms(["Head"], [0.4, 0, 0.4], { shrink: [0.25, 0, 0.25], band: [0.05, 0.028, -0.022, -0.042], parts: NECK_PARTS }),
  },
  {
    id: "legs", label: "Leg length", tab: "body", group: "Legs", terms: [
      ...terms(both("Thigh"), [0, 0.1, 0], { span: [-0.33, 0] }),
      // The thigh's soft bone sits 15 cm down the thigh: the same stretch, measured from there.
      ...terms(both("ThighSoft"), [0, 0.1, 0], { span: [-0.18, 0.15] }),
      ...terms(both("Shin"), [0, 0.1, 0], { span: [-0.35, 0] }),
    ],
  },
  {
    id: "thighs", label: "Thighs", tab: "body", group: "Legs",
    terms: terms([...both("Thigh"), ...both("ThighSoft")], [0.18, 0, 0.18]),
  },
  // The shin bone holds the leg from the knee (its joint) down, and the foot inside the shoe: the calf is fullest
  // 6-14 cm below the knee, the ankle 26-31 cm, the shoe's cuff starts at 35 cm and the sole is at 47.5 cm.
  // The calf sits at the back of the leg (+z), so it swells backwards more than across.
  {
    id: "calves", label: "Calves", tab: "body", group: "Legs",
    terms: terms(both("Shin"), [0.2, 0, 0.3], { shrink: [0.15, 0, 0.2], band: [0, -0.06, -0.14, -0.27] }),
  },
  // Stops short of the shoe's cuff, so the ankle never comes through it.
  {
    id: "ankles", label: "Ankles", tab: "body", group: "Legs",
    terms: terms(both("Shin"), [0.25, 0, 0.25], { shrink: [0.15, 0, 0.15], band: [-0.18, -0.26, -0.31, -0.345] }),
  },
  // The foot in its shoe, below the cuff: longer forwards to the toes and wider, standing on the same sole.
  {
    id: "feet", label: "Foot size", tab: "body", group: "Legs", roll: 0.4,
    terms: terms(both("Shin"), [0.2, 0.08, 0.3], { shrink: [0.12, 0.05, 0.2], pivot: -0.475, fade: [-0.4, -0.355] }),
  },
  // The bust is weighted on each breast, with a crease under them that holds the fold. The bone's joint sits
  // about 4 cm behind the front of the breasts, so most of the growth is forwards. Here +z is backwards.
  {
    // Measured on the model with a tape: A at -1, B at -0.5, C as built, then about a cup for each step up to Q at
    // 1, and on by the same step to Z (CUPS).
    // Each breast swells about its own middle, 6 cm out and on the chest wall (BREAST_DOME in build_world.py), so it
    // stays round; a fuller bust is heavy and hangs: it drops and lengthens as it grows, and sits wider, each breast
    // 3 cm further out at Q and as much less on the way, so they grow apart instead of crowding into the cleavage
    // (smaller cups stay where they are). The top grows full up to 4 cm above the joint and fades out by 12 cm, just
    // under the collarbone, so a big bust fills out from high on the chest instead of leaving a tall, flat stretch of
    // chest above it as it drops; above that it stays put instead of sliding forwards. The
    // amounts are large because the front of the breasts takes about 0.58 of them (BUST_WEIGHT). They grow wide
    // as well as out: at Q each stands about 17 cm out from the chest and reaches 18.5 cm from the middle of her
    // (grown mostly forwards instead, a big bust stood out from her like a log). Shrinking stops well short of flat.
    id: "bust", label: "Cup size", tab: "body", group: "Bust", stops: CUPS, roll: 0.45,
    terms: terms(["Bust"], [4.0, 2.07, 2.6], {
      shrink: [0.2, 0.25, 0.7], shift: [0, -0.075, -0.012], shrinkShift: [0, 0, 0],
      lobes: [0.06, -0.005, 0.025], fade: [0.04, 0.12], apart: 0.03, shrinkApart: 0,
    }),
  },
  // Where the breasts sit on the chest, root and all: the move reaches past where their weight thins out towards
  // the chest, so the base slides with them instead of only the front tipping up as Lift does.
  { id: "bustHeight", label: "Height", tab: "body", group: "Bust", terms: terms(["Bust"], [0, 0, 0], { shift: [0, 0.045, 0], shrinkShift: [0, -0.06, 0], reach: 0.5 }) },
  { id: "bustLift", label: "Lift", tab: "body", group: "Bust", terms: terms(["Bust"], [0, 0, 0], { shift: [0, 0.05, -0.008] }) },
  // The upper pole, the slope from the collarbone down to the nipple: fuller bows it out round, less hollows it
  // into a straight or scooped slope. Only the middle of the slope moves, along a bump that is nothing at the
  // nipple, full 3.5 cm above it and nothing again by the collarbone, so the nipple stays the front of the breast
  // and nothing bulges past it. It shapes the bust as built, before the cup size, so it grows along with the cup.
  {
    id: "bustUpper", label: "Upper fullness", tab: "body", group: "Bust", early: true,
    terms: [
      ...terms(["Bust"], [0, 0, 0], { shift: [0, 0.002, -0.014], fade: [0.035, 0] }),
      ...terms(["Bust"], [0, 0, 0], { shift: [0, -0.002, 0.014], fade: [0.075, 0.035] }),
    ],
  },
  { id: "bustSpacing", label: "Spacing", tab: "body", group: "Bust", terms: terms(["Bust"], [0.3, 0, 0], { shrink: [0.2, 0, 0] }) },
  // Sits each breast closer to the chest without making it any smaller: it comes in to 0.7 of its depth and
  // spreads wider and taller by as much (1 / sqrt 0.7), so it keeps its size, as a breast pressed to the body does.
  // Below 0 it stands out further and narrows to match. Projection, by contrast, changes the size. It shapes the
  // bust as built, before the cup size, so the change grows with the cup; the top fades out as the cup's does.
  {
    id: "bustCloser", label: "Closer to body", tab: "body", group: "Bust", early: true,
    terms: terms(["Bust"], [0.195, 0.195, -0.3], {
      shrink: [0.123, 0.123, -0.3], lobes: [0.06, -0.005, 0.025], fade: [0.01, 0.075],
    }),
  },
  // Pushed together, as a push-up bra does: each breast slides whole towards the cleavage. Below 0 they part.
  { id: "bustTogether", label: "Push together", tab: "body", group: "Bust", terms: terms(["Bust"], [0, 0, 0], { apart: -0.022 }) },
  {
    id: "bustProjection", label: "Projection", tab: "body", group: "Bust",
    terms: terms(["Bust"], [0, 0, 0.9], { shrink: [0, 0, 0.4] }),
  },
  // How round the inner side of each breast fills towards the cleavage as the cup grows (see reshape).
  { id: "bustInner", label: "Inner fullness", tab: "body", group: "Bust", terms: [] },
  // How firmly her breast band and bodice hold her bust (BUST_HOLDS): -1 not at all, 0 as made, 1 twice as firm.
  { id: "bustSupport", label: "Support", tab: "body", group: "Bust", terms: [] },
  // Her nipples change no bones: the dresser shapes their discs from these and the type (see nipples.ts).
  { id: "nippleSize", label: "Nipple size", tab: "body", group: "Nipples", terms: [] },
  { id: "areolaSize", label: "Areola size", tab: "body", group: "Nipples", terms: [] },
  // Her pubic hair changes no bones either: the style is drawn on its patch this much smaller or bigger (pubes.ts).
  { id: "pubesSize", label: "Size", tab: "body", group: "Pubic hair", terms: [] },
  // Nor does her vulva: the dresser shapes its grid from these and the type (see vulva.ts).
  { id: "vulvaSize", label: "Size", tab: "body", group: "Vulva", terms: [] },
  { id: "vulvaFull", label: "Outer lips", tab: "body", group: "Vulva", terms: [] },
  { id: "vulvaLips", label: "Inner lips", tab: "body", group: "Vulva", terms: [] },
  // Her anus likewise: its disc is shaped from this and the type (see anus.ts).
  { id: "anusSize", label: "Size", tab: "body", group: "Anus", terms: [] },
  // Each glute has its own bone, about 3 cm inside the curve of the rear. The rear is fullest low down and
  // blends into the small of the back, so every change fades out above the joint instead of leaving a shelf.
  {
    // Measured on the model: at 1 the rear stands 5 cm further out behind the small of the back and the hips
    // measure 7 cm more, enough to go with the fullest bust. It grows out and back, hardly down, so the fold
    // under it stays where it is instead of hanging over the thighs. It grows by scaling the rear out from the joint,
    // so what stands out most grows most and the curve keeps its shape, and the scaling reaches past where the
    // weight thins out (reach): a push weighted by the skin alone follows the weight's own hill and comes to a point.
    id: "rear", label: "Size", tab: "body", group: "Rear",
    terms: [
      ...glutes([0.6, 0.12, 2.0], { shrink: [0.15, 0.08, 0.4], shift: [0, -0.008, 0], shrinkShift: [0, 0, 0], reach: 0.35 }),
      // The lower third, 4-5.5 cm below the joint, fills out on top of that and a little down, so the rear stays full
      // low and then turns in sharply to the fold on the thigh, which stays put, as a round mass sitting on the leg.
      ...glutes([0, 0, 0], { shift: [0, -0.006, 0.04], shrinkShift: [0, 0, 0], band: [-0.01, -0.04, -0.055, -0.085], reach: 0.5 }),
    ],
  },
  {
    id: "rearLift", label: "Lift", tab: "body", group: "Rear",
    terms: glutes([0, 0, 0], { shift: [0, 0.02, 0.004], fade: REAR_FADE }),
  },
  {
    id: "rearWidth", label: "Width", tab: "body", group: "Rear", terms: [
      { bone: "Glute_L", grow: [0.25, 0, 0], shift: [-0.012, 0, 0], fade: REAR_FADE, midline: GLUTE_MIDDLE },
      { bone: "Glute_R", grow: [0.25, 0, 0], shift: [0.012, 0, 0], fade: REAR_FADE, midline: -GLUTE_MIDDLE },
    ],
  },
  {
    id: "rearProjection", label: "Projection", tab: "body", group: "Rear",
    terms: glutes([0, 0, 0.5], { shrink: [0, 0, 0.35], shift: [0, 0, 0.008], fade: REAR_FADE }),
  },
  // The top of the rear, 2-5 cm above the joint, where it rises from the small of the back: fuller stands out in a
  // shelf, less slopes flat into the back. It eases out before the waist, so it leaves no step there.
  {
    id: "rearUpper", label: "Upper fullness", tab: "body", group: "Rear",
    terms: glutes([0, 0, 0], { shift: [0, 0.004, 0.02], band: [0.11, 0.05, 0.02, -0.02] }),
  },
  // The underside, 3-5 cm below the joint, over the fold onto the thighs: fuller rounds it out and down a little,
  // less tucks it in. It eases out before the fold, so the fold stays where it is.
  {
    id: "rearLower", label: "Lower fullness", tab: "body", group: "Rear",
    terms: glutes([0, 0, 0], { shift: [0, -0.004, 0.018], band: [0.01, -0.03, -0.05, -0.1] }),
  },
  // How much the small of her back curves in. Partly a pose (see postureFor): her pelvis tips forwards as she
  // stands and walks. And partly her shape: the skin over the small of her back draws in, between her shoulder
  // blades and her rear, and only at the back, so her belly stays as it is. She has some of it at 0.
  {
    id: "arch", label: "Lower back arch", tab: "body", group: "Posture", roll: 0.5, rest: ARCH_REST,
    terms: lumbar(-0.022),
  },
  // Her ribcage leaning back over her waist, chest lifted, or rounding forwards: only a pose (see postureFor).
  { id: "upperArch", label: "Upper back arch", tab: "body", group: "Posture", roll: 0.4, terms: [] },
  { id: "head", label: "Head size", tab: "face", terms: terms(["Head"], [0.12, 0.12, 0.12]) },
  { id: "faceWidth", label: "Face width", tab: "face", terms: terms(["Head"], [0.12, 0, 0.04]) },
  { id: "faceLength", label: "Face length", tab: "face", terms: terms(["Head"], [0, 0.1, 0]) },
  // Her head joint is at the neck; the bob covers the ears and ends at the jaw, about 0.1 above the joint.
  {
    id: "hairVolume", label: "Hair volume", tab: "hair",
    terms: [
      ...terms(["Head", ...both("Strand")], [0.2, 0.05, 0.2], { parts: ["Hair"] }),
      // Long hair lying on the back follows the torso; the same growth about the same height.
      ...terms(["Torso"], [0.2, 0.05, 0.2], { parts: ["Hair"], pivot: 0.39 }),
    ],
  },
  {
    id: "hairLength", label: "Hair length", tab: "hair",
    terms: [
      ...terms(["Head", ...both("Strand")], [0, 0.9, 0], { parts: ["Hair"], pivot: 0.12, span: [-1, 0] }),
      ...terms(["Torso"], [0, 0.9, 0], { parts: ["Hair"], pivot: 0.51, span: [-1, 0] }),
    ],
  },
];

/** Each breast's own middle, from the bust's joint, as the cup size grows about it. */
const BREASTS = [0.06, -0.005, 0.025] as const;
/** Above the middle of the breasts (the upper pole), and below it (the lower pole). Here +y is up. */
const UPPER = [0.03, -0.02] as const;
const LOWER = [-0.03, 0.01] as const;

/**
 * Shapes of bust, on top of the cup size. Teardrop, the model as built, is the one most often drawn as ideal:
 * a gently sloping top and a fuller, rounder bottom, the nipple a little above the fullest point.
 */
const BUST_SHAPES: BustShape[] = [
  { id: "teardrop", label: "Teardrop", terms: [] },
  // As full above as below, sitting high: the top fills out upwards, and it comes forwards a little less.
  {
    id: "round", label: "Round", terms: [
      { bone: "Bust", grow: [0, 0, 0], shift: [0, 0.025, 0], reach: 0.5 },
      { bone: "Bust", grow: [0.12, 0.3, 0.15], lobes: BREASTS, fade: UPPER },
      { bone: "Bust", grow: [0, 0, -0.12], lobes: BREASTS },
    ],
  },
  // Narrow at the top, full and heavy at the bottom.
  {
    id: "bell", label: "Bell", terms: [
      { bone: "Bust", grow: [-0.15, 0, -0.3], lobes: BREASTS, fade: UPPER },
      { bone: "Bust", grow: [0.3, 0.35, 0.2], lobes: BREASTS, fade: LOWER },
      { bone: "Bust", grow: [0, 0, 0], shift: [0, -0.012, 0] },
    ],
  },
  // The nipples point outwards, away from each other.
  { id: "eastwest", label: "East-west", terms: [{ bone: "Bust", grow: [0, 0, 0], turn: 0.032, apart: 0.005 }] },
  // Wide and shallow, on a broad chest.
  { id: "athletic", label: "Athletic", terms: [{ bone: "Bust", grow: [0.45, 0, -0.35], lobes: BREASTS }] },
  // Soft and low, longer and less forward.
  { id: "relaxed", label: "Relaxed", terms: [{ bone: "Bust", grow: [0.1, 0.35, -0.15], shift: [0, -0.028, 0.006], lobes: BREASTS }] },
  // Set wide apart, with a broad gap between them.
  { id: "sideset", label: "Side-set", terms: [{ bone: "Bust", grow: [0, 0, 0], apart: 0.022 }] },
  // Narrow and long.
  { id: "slender", label: "Slender", terms: [{ bone: "Bust", grow: [-0.3, 0.3, 0.15], lobes: BREASTS }] },
];

const MALE_SLIDERS: SliderDef[] = [
  { id: "height", label: "Height", tab: "body", height: 0.06, terms: [] },
  {
    id: "build", label: "Build", tab: "body", terms: [
      ...terms(["Torso"], [0.1, 0, 0.1]),
      ...terms(["Hips"], [0.08, 0, 0.08]),
      ...terms(both("Thigh"), [0.15, 0, 0.15]),
      ...terms(both("Shin"), [0.1, 0, 0.1], { fade: [0, -0.35] }),
      ...terms(both("UpperArm"), [0.15, 0, 0.15]),
      ...terms(both("ForeArm"), [0.12, 0, 0.12]),
    ],
  },
  { id: "shoulders", label: "Shoulders", tab: "body", terms: terms(["Torso"], [0.12, 0, 0], { fade: [0.28, 0.1] }) },
  { id: "chest", label: "Chest", tab: "body", terms: terms(["Torso"], [0.05, 0, 0.14], { fade: [0.25, 0.08] }) },
  { id: "waist", label: "Waist", tab: "body", terms: terms(["Torso"], [0.15, 0, 0.12], { fade: [0.04, 0.2] }) },
  { id: "hips", label: "Hips", tab: "body", terms: terms(["Hips"], [0.12, 0, 0.1]) },
  {
    id: "legs", label: "Leg length", tab: "body", terms: [
      ...terms(both("Thigh"), [0, 0.1, 0], { span: [-0.42, 0] }),
      ...terms(both("Shin"), [0, 0.1, 0], { span: [-0.46, 0] }),
    ],
  },
  { id: "thighs", label: "Thighs", tab: "body", terms: terms(both("Thigh"), [0.18, 0, 0.18]) },
  {
    id: "arms", label: "Arms", tab: "body", terms: [
      ...terms(both("UpperArm"), [0.18, 0, 0.18]),
      ...terms(both("ForeArm"), [0.15, 0, 0.15]),
    ],
  },
  // His penis and scrotum change no bones: the dresser shapes their tube and sack from these and the type (see
  // penis.ts).
  { id: "penisLength", label: "Length", tab: "body", group: "Penis", terms: [] },
  { id: "penisGirth", label: "Girth", tab: "body", group: "Penis", terms: [] },
  { id: "penisHead", label: "Head", tab: "body", group: "Penis", terms: [] },
  { id: "penisSkin", label: "Foreskin", tab: "body", group: "Penis", terms: [] },
  { id: "ballsSize", label: "Size", tab: "body", group: "Testicles", terms: [] },
  { id: "ballsHang", label: "Hang", tab: "body", group: "Testicles", terms: [] },
  { id: "head", label: "Head size", tab: "face", terms: terms(["Head"], [0.12, 0.12, 0.12]) },
  { id: "faceWidth", label: "Face width", tab: "face", terms: terms(["Head"], [0.12, 0, 0.04]) },
  { id: "faceLength", label: "Face length", tab: "face", terms: terms(["Head"], [0, 0.1, 0]) },
  // His hair is a short crop on top of the head, starting about 0.13 above the neck joint.
  {
    // His torso's joint is 0.44 below his head's, for long hair lying on his back.
    id: "hairVolume", label: "Hair volume", tab: "hair",
    terms: [...terms(["Head", "Torso"], [0.15, 0, 0.15], { parts: ["Hair"] })],
  },
  {
    id: "hairHeight", label: "Hair height", tab: "hair",
    terms: terms(["Head"], [0, 1.2, 0], { parts: ["Hair"], pivot: 0.2, span: [0, 1] }),
  },
];

/**
 * Her legwear is built as bands round the legs, each its own material on every dress, from the seat (hips and
 * thigh tops) down to the ankle; and the leg warmers and garter belt as their own pieces. A style shows the bands it
 * reaches. The knee is between "over" and "knee"; see LEGWEAR_BANDS in tools/blender/build_world.py.
 */
const HOSE_BANDS = ["T_hose", "T_hose_thigh", "T_hose_over", "T_hose_knee", "T_hose_calf", "T_hose_shin", "T_hose_low", "T_hose_ankle"];
/** The bands from one down to the ankle, or down to and including `last`. */
const hoseFrom = (first: string, last?: string) =>
  HOSE_BANDS.slice(HOSE_BANDS.indexOf(first), last ? HOSE_BANDS.indexOf(last) + 1 : undefined);
const LEGWEAR_PIECES = [...HOSE_BANDS, "T_warmer", "T_garter"];
/** The sock cuff, which shows at the top of the shoes. */
const CUFF: [MeshPart, string] = ["Shoes", "T_hose"];
/**
 * The top of her foot, where a low-cut shoe shows it: in her stockings where they reach the ankle and show above
 * the shoe, otherwise bare, in her skin.
 */
const INSTEP: [MeshPart, string] = ["Shoes", "T_instep"];

/** Her shoes, flats first, then heels, strapped heels and boots. */
const FEMALE_SHOES: ShoeStyleDef[] = [
  { id: "shoes", label: "Leather shoes", mesh: "" },
  // Her bare feet: in her skin, or in her stockings or socks where they reach the ankle.
  { id: "barefoot", label: "Barefoot", mesh: "Barefoot" },
  { id: "ballet", label: "Ballet flats", mesh: "Ballet" },
  { id: "loafer", label: "Loafers", mesh: "Loafer" },
  { id: "kitten", label: "Kitten heels", mesh: "Kitten" },
  { id: "pump", label: "Pumps", mesh: "Pump" },
  { id: "stiletto", label: "Stilettos", mesh: "Stiletto" },
  { id: "block", label: "Block heels", mesh: "Block" },
  { id: "cone", label: "Cone heels", mesh: "Cone" },
  { id: "spool", label: "Spool heels", mesh: "Spool" },
  { id: "wedge", label: "Wedges", mesh: "Wedge" },
  { id: "platform", label: "Platforms", mesh: "Platform" },
  { id: "maryjane", label: "Mary Janes", mesh: "Maryjane" },
  { id: "doublestrap", label: "Double straps", mesh: "Doublestrap" },
  { id: "anklestrap", label: "Ankle straps", mesh: "Anklestrap" },
  { id: "tstrap", label: "T-straps", mesh: "Tstrap" },
  { id: "bootie", label: "Ankle boots", mesh: "Bootie" },
  { id: "laceup", label: "Lace-up boots", mesh: "Laceup" },
  { id: "riding", label: "Riding boots", mesh: "Riding" },
  { id: "kneeboot", label: "Knee boots", mesh: "Kneeboot" },
  { id: "thighboot", label: "Thigh boots", mesh: "Thighboot" },
];

const FEMALE_LEGWEAR: LegwearDef[] = [
  { id: "tights", label: "Tights", bands: HOSE_BANDS, cuff: true },
  { id: "leggings", label: "Leggings", bands: HOSE_BANDS, cuff: false },
  { id: "garter", label: "Garter", bands: [...hoseFrom("T_hose_thigh"), "T_garter"], cuff: true },
  { id: "thighhigh", label: "Thigh-highs", bands: hoseFrom("T_hose_thigh"), cuff: true },
  { id: "overknee", label: "Over-knee", bands: hoseFrom("T_hose_over"), cuff: true },
  { id: "kneehigh", label: "Knee-highs", bands: hoseFrom("T_hose_calf"), cuff: true },
  { id: "capri", label: "Capri", bands: hoseFrom("T_hose", "T_hose_calf"), cuff: false },
  { id: "kneelength", label: "Knee-length", bands: hoseFrom("T_hose", "T_hose_knee"), cuff: false },
  { id: "warmers", label: "Warmers", bands: ["T_warmer"], cuff: false },
  { id: "crew", label: "Crew socks", bands: hoseFrom("T_hose_low"), cuff: true },
  { id: "ankle", label: "Ankle socks", bands: ["T_hose_ankle"], cuff: true },
  { id: "noshow", label: "No-show", bands: [], cuff: true },
];

const FEMALE_COLORS: ColorDef[] = [
  {
    id: "skin", label: "Skin tone", tab: "skin", mode: "tone", palette: SKIN_TONES,
    parts: [
      ["Body", "T_skin_f"], ["Body", "T_navel"], ["Body", LABIA_MATERIAL], ["Body", ANUS_SKIN_MATERIAL], ["Body", "T_face_skin"], ["Body", "T_face_mid"], ["Body", "T_face_cool"],
      ["Body", "T_face_lit"], ["Body", "T_face_white"], ["Body", "T_face_blush"], ["Body", "T_face_pink"],
    ],
  },
  { id: "lips", label: "Lips", tab: "face", mode: "dye", palette: LIP_COLORS, follows: "skin", parts: [["Body", "T_lip"], ["Body", "T_lip_lit"]] },
  { id: "nipples", label: "Nipples", tab: "skin", mode: "dye", palette: NIPPLE_COLORS, follows: "skin", parts: [["Body", "T_areola"]] },
  {
    id: "vulva", label: "Vulva", tab: "skin", mode: "dye", palette: VULVA_COLORS, follows: "skin",
    parts: [["Body", VULVA_MATERIAL], ["Body", CANAL_MATERIAL]],
  },
  { id: "anus", label: "Anus", tab: "skin", mode: "dye", palette: ANUS_COLORS, follows: "skin", parts: [["Body", ANUS_MATERIAL]] },
  { id: "eyes", label: "Eyes", tab: "face", mode: "dye", palette: EYE_COLORS, parts: [["Body", "T_soot"]] },
  { id: "hair", label: "Hair and brows", tab: "hair", mode: "dye", palette: HAIR_COLORS, parts: [["Hair", "T_hair_f"], ["Body", "T_hair_f"]] },
  { id: "pubes", label: "Pubic hair", tab: "hair", mode: "dye", palette: PUBIC_COLORS, follows: "hair", parts: [["Body", PUBIC_MATERIAL]] },
  { id: "blouse", label: "Blouse", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_linen"]] },
  { id: "bodice", label: "Bodice", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_bodice"]] },
  { id: "skirt", label: "Skirt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_skirt"]] },
  { id: "apron", label: "Apron", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_apron"]] },
  { id: "belt", label: "Belt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_leather"]] },
  {
    id: "stockings", label: "Legwear", tab: "clothes", mode: "dye", palette: CLOTH_COLORS,
    parts: [...LEGWEAR_PIECES.map((name): [MeshPart, string] => ["Cloth", name]), CUFF, INSTEP],
  },
  { id: "shoes", label: "Shoes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Shoes", "T_leather"]] },
  // Her shoes' soles and heels, and a boot's laces.
  { id: "soles", label: "Soles and heels", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Shoes", "T_sole_dark"]] },
  // Her braies, and the skin under her openings, painted the same while she's covered.
  {
    id: "smalls", label: "Smallclothes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS,
    parts: [["Body", "T_smalls"], ["Body", HOLE_MATERIAL]],
  },
  // Her breast band, painted on like the braies but its own piece: it comes off by itself, and holds her bust while on.
  {
    id: "bra", label: "Breast band", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Body", "T_bra"]],
    follows: "smalls",
  },
  // The dirndl's arm ribbons and laces, and the priestess's set. Gems are on both.
  { id: "ribbons", label: "Ribbons", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_ribbon"]] },
  { id: "top", label: "Top", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_top"]] },
  { id: "sleeves", label: "Sleeves", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_sheer"]] },
  { id: "girdle", label: "Girdle", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_girdle"]] },
  { id: "drapes", label: "Drapes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_drape"]] },
  { id: "jewels", label: "Jewellery", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_jewel"]] },
  // The gems on her clothes, and those set in her necklace and her belly ring.
  { id: "gems", label: "Gems", tab: "clothes", mode: "dye", palette: GEM_COLORS, parts: [["Cloth", "T_gem"], ["Jewel", "T_gem"]] },
  // The bunny set's own: her ears and their band, her collar and cuffs, the bow tie and the ears' linings, her tail.
  // Its corset is the bodice.
  { id: "ears", label: "Ears", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_ears"]] },
  { id: "collar", label: "Collar and cuffs", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_collar"]] },
  { id: "bowtie", label: "Bow tie", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_bowtie"]] },
  { id: "tail", label: "Tail", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_tail"]] },
  // The babydoll's choker, straps and bow, and the lace on it and on the corset gown (the gown's laces too). The
  // babydoll's skirt and band, and the gown's skirt, are the skirt; the gown's corset is the bodice.
  { id: "straps", label: "Straps", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_straps"]] },
  { id: "trim", label: "Lace", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_trim"]] },
  // The frilled set's bow (its top is the bodice, its ruffles the skirt, the lace round her arm the lace), and the
  // plunge dress with its choker.
  { id: "bow", label: "Bow", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_bow"]] },
  { id: "dress", label: "Dress", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_dress"]] },
  // The pirate's rig. Her corset is the bodice, her shirt the blouse, and her belt and corset laces the belt.
  ...pirateColors(),
  { id: "feather", label: "Feather", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_plume"]] },
  // The adventuring party's kit. The archer's shirt is the blouse, her belt and chest strap the belt, her arrows'
  // fletching the feather. The mage's hat is the pirate's, banded in the braid. The noble's gown is the bodice and
  // skirt, its neckline edged in the braid, with the girdle and jewellery.
  ...factionColors(),
];

const FEMALE_OUTFITS: OutfitDef[] = [
  {
    id: "tavern", label: "Tavern dress", mesh: "",
    colors: ["blouse", "bodice", "skirt", "apron", "belt", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {},
    legwear: "tights",
  },
  {
    // Olive-gold bodice and skirt, a white chemise, a green apron and ribbons, and white socks.
    id: "dirndl", label: "Dirndl", mesh: "Dirndl",
    colors: ["blouse", "ribbons", "bodice", "skirt", "apron", "gems", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      blouse: "#f1ece0", ribbons: "#2e5e3e", bodice: "#6e6233", skirt: "#5c5530", apron: "#2f6040",
      gems: "#3f9a5a", stockings: "#f1ece0", shoes: "#3d2314",
    },
    legwear: "noshow",
  },
  {
    // Gold and cream: a gold top and girdle, pale sleeves and drapes, gold jewellery with blue gems.
    id: "priestess", label: "Priestess", mesh: "Priestess",
    colors: ["top", "sleeves", "girdle", "drapes", "jewels", "gems", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      top: "#b8892e", sleeves: "#efe4c4", girdle: "#b8892e", drapes: "#efe6cf", jewels: "#c99a3a",
      gems: "#3aa6d6", shoes: "#9a7430", stockings: "#9a7430", smalls: "#b8892e", bra: "#b8892e",
    },
    legwear: "noshow",
  },
  {
    // A brothel girl's bunny set: black ears lined in pink, a white collar with a pink bow tie and white cuffs, a
    // black underbust corset, a white tail, black stockings on a garter belt, and pink heart pasties.
    id: "bunny", label: "Bunny", mesh: "Bunny",
    colors: ["ears", "bowtie", "collar", "tail", "bodice", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      ears: "#1c1a1e", bowtie: "#d8607e", collar: "#f1ece0", tail: "#f4f1ea", bodice: "#1c1a1e", stockings: "#2a2226",
      shoes: "#1c1716", soles: "#1c1716", bra: "#e0587a", smalls: "#e0587a",
    },
    legwear: "garter",
    under: { bra: "hearts", briefs: "heart" },
  },
  {
    // A pale blue babydoll: a choker with straps down the inside of her bare breasts to a bow under them, and a short
    // skirt parted at the front, banded with white lace.
    id: "babydoll", label: "Babydoll", mesh: "Babydoll",
    colors: ["straps", "trim", "skirt", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: { straps: "#8fb0e0", skirt: "#a9c2ea", trim: "#eef2fa", shoes: "#e8eef8", soles: "#c9d4e6" },
    legwear: "noshow",
  },
  {
    // A white corset gown: an underbust corset laced in black, and a long skirt open at the front, edged in black lace.
    id: "gown", label: "Corset gown", mesh: "Gown",
    colors: ["trim", "bodice", "skirt", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: { bodice: "#f1ece0", skirt: "#f1ece0", trim: "#1c1716", shoes: "#f1ece0", soles: "#9a8f80" },
    legwear: "noshow",
  },
  {
    // All in white: a strapless top under her bare breasts with a big bow, two tiers of ruffles round her hips, a band
    // of lace round her arm, and white stockings on a garter belt.
    id: "frills", label: "Frilled set", mesh: "Frills",
    colors: ["bow", "trim", "bodice", "skirt", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      bow: "#f6f3ee", trim: "#f6f3ee", bodice: "#f6f3ee", skirt: "#f6f3ee", stockings: "#f1ece0", shoes: "#f1ece0",
      soles: "#c9c2b6",
    },
    legwear: "garter",
  },
  {
    // A gold choker and a gold dress hanging from it, open at the front from her throat to below her hips, with long
    // panels down her legs. Nothing on her legs.
    id: "plunge", label: "Plunge dress", mesh: "Plunge",
    colors: ["dress", "shoes", "soles", "bra", "smalls"],
    preset: { dress: "#d9b85c", shoes: "#b8892e", soles: "#7a5c22" },
  },
  {
    // A cream shirt, an oxblood corset under a red sash, brown breeches, black boots, and a cocked hat with a white feather.
    id: "pirate", label: "Pirate", mesh: "Pirate", guestOnly: true,
    colors: ["hat", "braid", "feather", "blouse", "bodice", "sash", "belt", "breeches", "boots", "shoes", "bra", "smalls"],
    preset: {
      hat: "#1c1716", braid: "#c99a3a", feather: "#efebe2", blouse: "#ece4d2", bodice: "#5b1417", sash: "#9a2420",
      belt: "#3d2314", breeches: "#4c3c2b", boots: "#221a15", shoes: "#221a15", stockings: "#221a15",
    },
  },
  {
    // A green hooded mantle, a cream shirt, a tan jerkin with dark bracers, belt and strap, grey-brown breeches and
    // boots, and a quiver of white-fletched arrows on her back.
    id: "archer", label: "Archer", mesh: "Archer", guestOnly: true,
    colors: ["cloak", "bracers", "belt", "feather", "blouse", "jerkin", "breeches", "boots", "shoes", "bra", "smalls"],
    preset: {
      cloak: "#3a4a2c", blouse: "#ddd3bc", jerkin: "#7a5432", bracers: "#3a2616", belt: "#3d2314", breeches: "#4a3f33",
      boots: "#3a2a1e", shoes: "#3a2a1e", feather: "#efebe2",
    },
  },
  {
    // Grey mail, steel plate, a blue tabard with a blue badge, a round shield in the tabard's colour and a sword.
    id: "warrior", label: "Warrior", mesh: "Warrior", guestOnly: true,
    colors: ["tabard", "plate", "belt", "gems", "mail", "shoes", "bra", "smalls"],
    preset: { tabard: "#24345a", plate: "#a7abb2", mail: "#6e7078", belt: "#3d2314", gems: "#3aa6d6", shoes: "#2b2018" },
  },
  {
    // A violet robe with bell sleeves, a red sash, a gold amulet with a blue gem, a tall black hat and a staff.
    id: "mage", label: "Mage", mesh: "Mage", guestOnly: true,
    colors: ["hat", "braid", "sash", "jewels", "gems", "robe", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      hat: "#1c1716", braid: "#c99a3a", robe: "#4a2a6e", sash: "#8c2020", jewels: "#c99a3a", gems: "#3aa6d6",
      stockings: "#1c1716", shoes: "#2b2018",
    },
    legwear: "kneehigh",
  },
  {
    // A white robe under a blue tabard with a gold sun, a white hood, a leather belt and a mace.
    id: "cleric", label: "Cleric", mesh: "Cleric", guestOnly: true,
    colors: ["tabard", "belt", "jewels", "gems", "robe", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      robe: "#ece6d8", tabard: "#24345a", belt: "#3d2314", jewels: "#c99a3a", gems: "#e8e4dc", stockings: "#ece6d8",
      shoes: "#3d2314",
    },
    legwear: "kneehigh",
  },
  {
    // The bandit gang's rogue: a black hooded mantle, the gang's red scarf over her face, a grey shirt under a dark
    // leather vest, wrapped forearms, dark breeches and boots, two daggers and a coin pouch.
    id: "rogue", label: "Rogue", mesh: "Rogue", guestOnly: true,
    colors: ["sash", "cloak", "bracers", "belt", "blouse", "jerkin", "breeches", "boots", "shoes", "bra", "smalls"],
    preset: {
      cloak: "#1c1c22", sash: "#8c2020", bracers: "#221a15", belt: "#221a15", blouse: "#4f4f52", jerkin: "#2b2018",
      breeches: "#2b2b2b", boots: "#1c1716", shoes: "#1c1716",
    },
  },
  {
    // The bandit gang's brute: the gang's red bandana, a fur mantle, a studded leather vest with bare arms, wrapped
    // forearms, brown breeches and boots, and an axe.
    id: "brute", label: "Brute", mesh: "Brute", guestOnly: true,
    colors: ["sash", "cloak", "bracers", "belt", "jerkin", "breeches", "boots", "shoes", "bra", "smalls"],
    preset: {
      sash: "#8c2020", cloak: "#5c4a36", bracers: "#3d2314", belt: "#2b2018", jerkin: "#3d2314", breeches: "#4c3c2b",
      boots: "#2b2018", shoes: "#2b2018",
    },
  },
  {
    // A noble's maid: a black dress to mid-calf with white collar and cuffs, a white apron with a bib, a frilled
    // white cap and black stockings.
    id: "servant", label: "Maid", mesh: "Servant", guestOnly: true,
    colors: ["apron", "bodice", "skirt", "stockings", "shoes", "soles", "blouse", "bra", "smalls"],
    preset: {
      bodice: "#1c1c22", skirt: "#1c1c22", apron: "#f1ece0", blouse: "#f1ece0", stockings: "#1c1c22", shoes: "#1c1716",
    },
    legwear: "kneehigh",
  },
  {
    // A wine velvet gown edged in gold braid, linen ruffles at the wrists, a gold girdle and circlet, and blue gems.
    id: "noble", label: "Noble", mesh: "Noble", guestOnly: true,
    colors: ["jewels", "gems", "braid", "bodice", "girdle", "skirt", "stockings", "shoes", "soles", "blouse", "bra", "smalls"],
    preset: {
      bodice: "#5b1430", skirt: "#4a1028", braid: "#c99a3a", girdle: "#c99a3a", jewels: "#c99a3a", gems: "#3aa6d6",
      blouse: "#f1ece0", stockings: "#f1ece0", shoes: "#3d2314",
    },
    legwear: "kneehigh",
  },
];

const MALE_COLORS: ColorDef[] = [
  {
    id: "skin", label: "Skin tone", tab: "skin", mode: "tone", palette: SKIN_TONES,
    parts: [
      ["Body", "T_skin"], ["Body", "T_skin_lit"], ["Body", "T_skin_deep"], ["Body", "T_skin_shade"], ["Body", PENIS_MATERIAL],
      ["Body", SCROTUM_MATERIAL],
    ],
  },
  { id: "lips", label: "Lips", tab: "face", mode: "dye", palette: LIP_COLORS, follows: "skin", parts: [["Body", "T_lip_m"]] },
  { id: "glans", label: "Glans", tab: "skin", mode: "dye", palette: GLANS_COLORS, follows: "skin", parts: [["Body", GLANS_MATERIAL]] },
  { id: "eyes", label: "Eyes", tab: "face", mode: "dye", palette: EYE_COLORS, parts: [["Body", "T_iris_m"]] },
  {
    id: "hair", label: "Hair and brows", tab: "hair", mode: "dye", palette: HAIR_COLORS,
    parts: [["Hair", "T_hair_m"], ["Hair", "T_hair_m_warm"], ["Body", "T_hair_m"]],
  },
  { id: "tunic", label: "Tunic", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_tunic"]] },
  { id: "shirt", label: "Shirt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_linen"]] },
  { id: "waistcoat", label: "Waistcoat", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_waistcoat"]] },
  { id: "trousers", label: "Trousers", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_trousers"]] },
  { id: "belt", label: "Belt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_leather"]] },
  // His shoes, and the pirate's tall boots over them.
  { id: "boots", label: "Boots", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Shoes", "T_leather"], ["Cloth", "T_boot"]] },
  { id: "smalls", label: "Smallclothes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Body", "T_smalls"]] },
  ...pirateColors().filter((def) => def.id !== "boots"),
  // The adventurer's kit, and the noble's doublet, cap feather, and chain of office with its gem.
  ...factionColors(),
  { id: "doublet", label: "Doublet", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_doublet"]] },
  { id: "feather", label: "Feather", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_plume"]] },
  { id: "jewels", label: "Chain", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_jewel"]] },
  { id: "gems", label: "Gems", tab: "clothes", mode: "dye", palette: GEM_COLORS, parts: [["Cloth", "T_gem"]] },
];

export const LOOK_OPTIONS: Record<BodyName, LookOptions> = {
  Female: {
    sliders: FEMALE_SLIDERS,
    colors: FEMALE_COLORS,
    pieces: [{ id: "apron", label: "Apron", parts: [["Cloth", "T_apron"]] }],
    hairstyles: [
      { id: "bob", label: "Bob", mesh: "" },
      { id: "pixie", label: "Pixie", mesh: "Pixie" },
      { id: "long", label: "Long", mesh: "Long" },
      { id: "ponytail", label: "Ponytail", mesh: "Ponytail" },
      { id: "bun", label: "Bun", mesh: "Bun" },
      { id: "tail", label: "High tail", mesh: "Tail" },
    ],
    outfits: FEMALE_OUTFITS,
    legwear: FEMALE_LEGWEAR,
    jewellery: FEMALE_JEWELLERY,
    nipples: NIPPLE_TYPES,
    bustShapes: BUST_SHAPES,
    pubes: PUBIC_STYLES,
    vulva: VULVA_TYPES,
    anus: ANUS_TYPES,
    penis: [],
    shoes: FEMALE_SHOES,
    tops: TOP_STYLES,
    bottoms: BRIEF_STYLES,
  },
  Male: {
    sliders: MALE_SLIDERS,
    colors: MALE_COLORS,
    pieces: [],
    hairstyles: [
      { id: "short", label: "Short", mesh: "" },
      { id: "buzz", label: "Buzz", mesh: "Buzz" },
      { id: "long", label: "Long", mesh: "Long" },
      { id: "ponytail", label: "Ponytail", mesh: "Ponytail" },
      { id: "bald", label: "Bald", mesh: null },
    ],
    outfits: [
      { id: "tunic", label: "Tunic", mesh: "", colors: ["tunic", "trousers", "belt", "boots", "smalls"], preset: {} },
      {
        // A cream shirt under a navy waistcoat, a red sash, brown breeches, black boots and a cocked hat.
        id: "pirate", label: "Pirate", mesh: "Pirate", guestOnly: true,
        colors: ["hat", "braid", "shirt", "waistcoat", "sash", "breeches", "boots", "smalls"],
        preset: {
          hat: "#1c1716", braid: "#c99a3a", shirt: "#ece4d2", waistcoat: "#24345a", sash: "#9a2420",
          breeches: "#4c3c2b", boots: "#221a15",
        },
      },
      {
        // A green hooded mantle, a cream shirt with its sleeves pushed up, a tan jerkin, dark bracers and strap, and a
        // quiver of white-fletched arrows on his back.
        id: "archer", label: "Archer", mesh: "Archer", guestOnly: true,
        colors: ["cloak", "bracers", "belt", "feather", "shirt", "jerkin", "breeches", "boots", "smalls"],
        preset: {
          cloak: "#3a4a2c", shirt: "#ddd3bc", jerkin: "#7a5432", bracers: "#3a2616", breeches: "#4a3f33", boots: "#3a2a1e",
          feather: "#efebe2",
        },
      },
      {
        // Grey mail, steel plate, a blue tabard with a blue badge, a round shield in the tabard's colour and a sword.
        id: "warrior", label: "Warrior", mesh: "Warrior", guestOnly: true,
        colors: ["tabard", "plate", "belt", "gems", "mail", "boots", "smalls"],
        preset: { tabard: "#24345a", plate: "#a7abb2", mail: "#6e7078", gems: "#3aa6d6", boots: "#2b2018" },
      },
      {
        // A violet robe with bell sleeves, a red sash, a gold amulet with a blue gem, a tall black hat and a staff.
        id: "mage", label: "Mage", mesh: "Mage", guestOnly: true,
        colors: ["hat", "braid", "sash", "jewels", "gems", "robe", "breeches", "boots", "smalls"],
        preset: {
          hat: "#1c1716", braid: "#c99a3a", robe: "#4a2a6e", sash: "#8c2020", jewels: "#c99a3a", gems: "#3aa6d6",
          breeches: "#2b2b2b", boots: "#2b2018",
        },
      },
      {
        // A white robe under a blue tabard with a gold sun, a white hood, a leather belt and a mace.
        id: "cleric", label: "Cleric", mesh: "Cleric", guestOnly: true,
        colors: ["tabard", "belt", "jewels", "gems", "robe", "breeches", "boots", "smalls"],
        preset: {
          robe: "#ece6d8", tabard: "#24345a", jewels: "#c99a3a", gems: "#e8e4dc", breeches: "#4c3c2b", boots: "#3d2314",
        },
      },
      {
        // The bandit gang's rogue: a black hooded mantle, the gang's red scarf over his face, a grey shirt under a dark
        // leather vest, wrapped forearms, dark breeches and boots, two daggers and a coin pouch.
        id: "rogue", label: "Rogue", mesh: "Rogue", guestOnly: true,
        colors: ["sash", "cloak", "bracers", "belt", "shirt", "jerkin", "breeches", "boots", "smalls"],
        preset: {
          cloak: "#1c1c22", sash: "#8c2020", bracers: "#221a15", shirt: "#4f4f52", jerkin: "#2b2018", breeches: "#2b2b2b",
          boots: "#1c1716",
        },
      },
      {
        // The bandit gang's brute: the gang's red bandana, a fur mantle, a studded leather vest with bare arms, wrapped
        // forearms, brown breeches and boots, and an axe.
        id: "brute", label: "Brute", mesh: "Brute", guestOnly: true,
        colors: ["sash", "cloak", "bracers", "belt", "jerkin", "breeches", "boots", "smalls"],
        preset: { sash: "#8c2020", cloak: "#5c4a36", bracers: "#3d2314", jerkin: "#3d2314", breeches: "#4c3c2b", boots: "#2b2018" },
      },
      {
        // A noble's footman, in the house's livery: a wine coat with tails, edged in gold braid with gold buttons,
        // over a straw waistcoat, a white cravat, black breeches and white stockings.
        id: "servant", label: "Footman", mesh: "Servant", guestOnly: true,
        colors: ["braid", "doublet", "waistcoat", "shirt", "breeches", "boots", "smalls"],
        preset: {
          doublet: "#5b1430", braid: "#c99a3a", waistcoat: "#e3cf9c", shirt: "#f1ece0", breeches: "#1c1c22", boots: "#1c1716",
        },
      },
      {
        // A wine velvet doublet edged in gold braid, a linen ruff, a navy cape, a gold chain and a black cap with a feather.
        id: "noble", label: "Noble", mesh: "Noble", guestOnly: true,
        colors: ["hat", "braid", "feather", "cloak", "jewels", "gems", "doublet", "shirt", "breeches", "boots", "smalls"],
        preset: {
          hat: "#1c1716", braid: "#c99a3a", feather: "#efebe2", cloak: "#24345a", jewels: "#c99a3a", gems: "#8c2020",
          shirt: "#f1ece0", doublet: "#5b1430", breeches: "#2b2b2b", boots: "#221a15",
        },
      },
    ],
    legwear: [],
    jewellery: [],
    nipples: [],
    bustShapes: [],
    pubes: [],
    vulva: [],
    anus: [],
    penis: PENIS_TYPES,
    shoes: [],
    tops: [],
    bottoms: [],
  },
};

/**
 * The underwear a look has on: its top (a bra, or a one-piece worn instead of both), and its briefs, null under a
 * one-piece. Null altogether for a body without the styles.
 */
export function underOf(body: BodyName, look: Pick<Look, "bra" | "briefs">): { top: UnderStyle; bottom: UnderStyle | null } | null {
  if (!LOOK_OPTIONS[body].tops.length) return null;
  const top = topStyle(look.bra);
  return { top, bottom: top.kind === "whole" ? null : bottomStyle(look.briefs) };
}

/** Which colours a guest's outfit paints, by body. */
export const OUTFIT_COLORS: Record<BodyName, { top: string; legs: string; hair: string }> = {
  Female: { top: "bodice", legs: "skirt", hair: "hair" },
  Male: { top: "tunic", legs: "trousers", hair: "hair" },
};

// ---- Colour -------------------------------------------------------------------------------------

const luminance = (c: Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** A material's colour moved by the same amount, channel by channel, as `ref` moves to `target`. All linear. */
export function toneColor(material: Color, ref: Color, target: Color): Color {
  const share = (from: number, to: number) => (from > 1e-4 ? to / from : 1);
  return new Color(
    Math.min(1, material.r * share(ref.r, target.r)),
    Math.min(1, material.g * share(ref.g, target.g)),
    Math.min(1, material.b * share(ref.b, target.b)),
  );
}

/** `target`, made as much lighter or darker as `material` is next to `ref`. All linear. */
export function dyeColor(material: Color, ref: Color, target: Color): Color {
  const lum = luminance(ref);
  const shade = lum > 1e-4 ? Math.min(2, luminance(material) / lum) : 1;
  return new Color(Math.min(1, target.r * shade), Math.min(1, target.g * shade), Math.min(1, target.b * shade));
}

/** A "#rrggbb" colour in linear space, as materials use. */
export function hexColor(hex: string): Color {
  return new Color(hex);
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const averages = new WeakMap<Material, Color>();

/** The colour a material shows on average: its texture, if it has one, times its colour. Linear. */
export function averageColor(material: Material): Color {
  const known = averages.get(material);
  if (known) return known;
  const lambert = material as MeshLambertMaterial;
  const color = lambert.color ? lambert.color.clone() : new Color(1, 1, 1);
  const image = lambert.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (image && image.width > 0 && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(image, 0, 0);
        const { data } = ctx.getImageData(0, 0, image.width, image.height);
        let r = 0, g = 0, b = 0;
        const count = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          r += srgbToLinear(data[i] / 255);
          g += srgbToLinear(data[i + 1] / 255);
          b += srgbToLinear(data[i + 2] / 255);
        }
        color.multiply(new Color(r / count, g / count, b / count));
      }
    } catch {
      // A texture the canvas can't read keeps the material's own colour.
    }
  }
  averages.set(material, color);
  return color;
}

/** The colour a "#rrggbb" swatch should show for a material's average, for the "as built" swatch. */
export function displayHex(color: Color): string {
  return `#${color.getHexString()}`;
}

const paints = new Map<string, MeshLambertMaterial>();

function paint(original: Material, color: Color): MeshLambertMaterial {
  const key = `${original.name}|${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}`;
  let material = paints.get(key);
  if (!material) {
    // Keeps the original's name, so anything that finds materials by name still finds this one.
    material = solidRetroMaterial(original.name, 0xffffff);
    material.color.setRGB(color.r, color.g, color.b);
    paints.set(key, material);
  }
  return material;
}

const pubicMaterials = new Map<string, MeshLambertMaterial>();

/**
 * Her pubic hair as she wears it: the colour its swatch gives the patch (`worn`), cut out in the style's shape at
 * its size. Drawn a little in front of the skin, like the coat, so the vertex snapping never sinks it in.
 */
export function pubicMaterial(worn: Material, style: PubicStyle, size: number): MeshLambertMaterial {
  const color = averageColor(worn);
  const map = pubicTexture(style, size);
  const key = `${style.id}|${map.uuid}|${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}`;
  let material = pubicMaterials.get(key);
  if (!material) {
    material = solidRetroMaterial(PUBIC_MATERIAL, 0xffffff);
    material.color.copy(color);
    material.map = map;
    material.alphaTest = 0.5;
    material.polygonOffset = true;
    material.polygonOffsetFactor = 0;
    material.polygonOffsetUnits = -4;
    pubicMaterials.set(key, material);
  }
  return material;
}

const lingerieMaterials = new Map<string, MeshLambertMaterial>();

/**
 * Her underwear as she wears it: what's drawn of her top and her briefs (null for neither) in the colours their
 * swatches give them, cut out of the patch over her skin. Drawn a little in front of it, like the pubic patch.
 */
export function lingerieMaterial(top: UnderStyle | null, bottom: UnderStyle | null, topColor: Color, bottomColor: Color): MeshLambertMaterial {
  const rgb = (c: Color): Rgb => [c.r, c.g, c.b];
  const map = lingerieTexture(top, bottom, rgb(topColor), rgb(bottomColor));
  let material = lingerieMaterials.get(map.uuid);
  if (!material) {
    material = solidRetroMaterial(LINGERIE_MATERIAL, 0xffffff);
    material.map = map;
    material.alphaTest = 0.5;
    material.polygonOffset = true;
    material.polygonOffsetFactor = 0;
    material.polygonOffsetUnits = -6;
    lingerieMaterials.set(map.uuid, material);
  }
  return material;
}

const covers = (parts: [MeshPart, string][], part: MeshPart, name: string) => parts.some(([p, n]) => p === part && n === name);

/**
 * The material a mesh slot should wear for these colours: the original when nothing covering it is set.
 * `originals` finds the model's own material by part and name, for the colours' reference materials.
 */
export function materialFor(
  body: BodyName,
  part: MeshPart,
  original: Material,
  colors: Record<string, string>,
  originals: (part: MeshPart, name: string) => Material | undefined,
): Material {
  const defs = LOOK_OPTIONS[body].colors;
  const def = defs.find((d) => covers(d.parts, part, original.name));
  if (!def) return original;
  const refOf = (d: ColorDef) => {
    const [refPart, refName] = d.parts[0];
    const ref = originals(refPart, refName);
    return ref ? averageColor(ref) : averageColor(original);
  };
  const own = colors[def.id];
  if (own) {
    const target = hexColor(own);
    const mine = averageColor(original);
    const ref = refOf(def);
    return paint(original, def.mode === "tone" ? toneColor(mine, ref, target) : dyeColor(mine, ref, target));
  }
  const leader = def.follows ? defs.find((d) => d.id === def.follows) : undefined;
  if (leader && colors[leader.id]) {
    return paint(original, toneColor(averageColor(original), refOf(leader), hexColor(colors[leader.id])));
  }
  return original;
}

/** The mesh part a mesh belongs to, from its own name or its parents'. */
export function partOf(object: Object3D, body: BodyName): MeshPart | null {
  const pattern = new RegExp(`^${body}_(Body|Cloth|Hair|Shoes|Cum|Jewel)`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return match[1] as MeshPart;
  }
  return null;
}

/** The part of her a "<Body>_Cum<Section><Stage>" mesh lies on, and the stage it belongs to. */
export function coatMeshOf(object: Object3D, body: BodyName): { section: string; stage: number } | null {
  const pattern = new RegExp(`^${body}_Cum([A-Z][a-z]+)([0-9]+)`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return { section: match[1], stage: Number(match[2]) };
  }
  return null;
}

/**
 * Where a "<Body>_CumOn<Outfit>_<material>_<Section><Stage>" stain lies on her clothes: the outfit ("" for her own),
 * the piece's material, and the section and stage it shows with.
 */
export function stainMeshOf(
  object: Object3D,
  body: BodyName,
): { outfit: string; material: string; section: string; stage: number } | null {
  const pattern = new RegExp(`^${body}_CumOn([A-Za-z]*)_(T_[A-Za-z0-9_]+?)_([A-Z][a-z]+)([0-9]+)`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return { outfit: match[1], material: match[2], section: match[3], stage: Number(match[4]) };
  }
  return null;
}

/** The hairstyle a hair mesh belongs to, by the mesh name after "<Body>_Hair": "" for the character's own. */
export function hairMeshOf(object: Object3D, body: BodyName): string | null {
  const pattern = new RegExp(`^${body}_Hair([A-Z][a-z]+)?`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return match[1] ?? "";
  }
  return null;
}

/** The hair mesh a look shows: "" for the character's own, a style's mesh name, or null for none. */
export function outfitOf(body: BodyName, look: Pick<Look, "outfit">): OutfitDef {
  const outfits = LOOK_OPTIONS[body].outfits;
  return outfits.find((outfit) => outfit.id === look.outfit) ?? outfits[0];
}

/** The outfit a cloth mesh belongs to, by the mesh name after "<Body>_Cloth": "" for the character's own. */
export function outfitMeshOf(object: Object3D, body: BodyName): string | null {
  const pattern = new RegExp(`^${body}_Cloth([A-Z][a-z]+)?`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return match[1] ?? "";
  }
  return null;
}

/** The look with another outfit on, in that outfit's own colours: the clothes colours set before are dropped. */
export function wearOutfit(body: BodyName, look: Look, id: string): Look {
  const options = LOOK_OPTIONS[body];
  const outfit = options.outfits.find((o) => o.id === id) ?? options.outfits[0];
  const next = copyLook(look);
  for (const def of options.colors) if (def.tab === "clothes") delete next.colors[def.id];
  Object.assign(next.colors, outfit.preset);
  if (outfit === options.outfits[0]) delete next.outfit;
  else next.outfit = outfit.id;
  delete next.legwear;
  if (outfit.under?.bra) next.bra = outfit.under.bra;
  if (outfit.under?.briefs) next.briefs = outfit.under.briefs;
  return next;
}

export function hairMeshFor(body: BodyName, look: Pick<Look, "hairstyle">): string | null {
  const styles = LOOK_OPTIONS[body].hairstyles;
  return (styles.find((style) => style.id === look.hairstyle) ?? styles[0]).mesh;
}

/** The shoe style a shoe mesh belongs to, by the mesh name after "<Body>_Shoes": "" for the character's own. */
export function shoeMeshOf(object: Object3D, body: BodyName): string | null {
  const pattern = new RegExp(`^${body}_Shoes([A-Z][a-z]+)?`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return match[1] ?? "";
  }
  return null;
}

/** The shoe mesh a look shows: "" for the character's own, or a style's mesh name. */
export function shoeMeshFor(body: BodyName, look: Pick<Look, "shoes">): string {
  return LOOK_OPTIONS[body].shoes.find((style) => style.id === look.shoes)?.mesh ?? "";
}

/** The legwear a look has on: its own style, or its outfit's. Null for an outfit with none, such as the pirate's. */
export function legwearOf(body: BodyName, look: Pick<Look, "outfit" | "legwear">): LegwearDef | null {
  const outfit = outfitOf(body, look);
  if (!outfit.legwear) return null;
  const styles = LOOK_OPTIONS[body].legwear;
  return styles.find((style) => style.id === look.legwear) ?? styles.find((style) => style.id === outfit.legwear) ?? null;
}

/**
 * What legwear does to one mesh slot: "hide" a band the style doesn't reach, paint the sock cuff over in "skin" when
 * the style has none (or the stockings are off), or null to leave it alone.
 */
export function legwearSlot(legwear: LegwearDef | null, part: MeshPart, name: string, stockingsOff = false): "hide" | "skin" | null {
  // The top of her foot in a low-cut shoe: stockings only where they reach the ankle and show above the shoe.
  if (part === INSTEP[0] && name === INSTEP[1]) {
    const covered = legwear?.cuff && legwear.bands.includes("T_hose_ankle") && !stockingsOff;
    return covered ? null : "skin";
  }
  if (!legwear) return null;
  if (part === "Cloth" && LEGWEAR_PIECES.includes(name)) return legwear.bands.includes(name) ? null : "hide";
  if (part === CUFF[0] && name === CUFF[1]) return legwear.cuff && !stockingsOff ? null : "skin";
  return null;
}

/** The outfits a player can choose: all but those only guests wear for now. */
export function playerOutfits(body: BodyName): OutfitDef[] {
  return LOOK_OPTIONS[body].outfits.filter((outfit) => !outfit.guestOnly);
}

/** The outfits only guests wear. */
export type GuestOutfit = "pirate" | "archer" | "warrior" | "mage" | "cleric" | "noble" | "servant" | "rogue" | "brute";

/** An adventuring party's callings, each in its own kit: the archer, the warrior who shields the rest, the mage and the healer. */
export const ADVENTURER_OUTFITS: readonly GuestOutfit[] = ["archer", "warrior", "mage", "cleric"];
/** A noble, and the servant who comes with them: a maid, or a footman in the house's livery. */
export const NOBLE_OUTFITS: readonly GuestOutfit[] = ["noble", "servant"];
/** The bandit gang: rogues and brutes, every one in the gang's red. */
export const BANDIT_OUTFITS: readonly GuestOutfit[] = ["rogue", "brute"];

/** How many ways a guest's outfit can be coloured. */
export const GUEST_LOOKS = 4;
/** How many ways a guest's pirate rig can be coloured. */
export const PIRATE_LOOKS = GUEST_LOOKS;

/** Colours over each guest outfit's preset, so a party of them don't all look alike. The first is the preset itself. */
const GUEST_VARIANTS: Record<GuestOutfit, Record<BodyName, Record<string, string>[]>> = {
  pirate: {
    Male: [
      {},
      { waistcoat: "#5b1417", sash: "#2b3d23" },
      { waistcoat: "#2b2b2b", sash: "#8a7a3e", breeches: "#7d6c55" },
      { waistcoat: "#4c3c2b", sash: "#24345a", shirt: "#b8ad96", hat: "#3d2314" },
    ],
    Female: [
      {},
      { bodice: "#1c1c22", sash: "#24345a", feather: "#8c2020" },
      { bodice: "#3d2314", sash: "#2b3d23", breeches: "#7d6c55" },
      { bodice: "#24345a", sash: "#8a7a3e", feather: "#e3cf9c", blouse: "#b8ad96" },
    ],
  },
  // Travel-worn: mantles in green, grey, rust and blue, over leather from tan to near black.
  archer: {
    Male: [
      {},
      { cloak: "#4f4f52", jerkin: "#3d2314", breeches: "#5c5530" },
      { cloak: "#5c3a22", jerkin: "#8a6a3e", shirt: "#b8ad96", bracers: "#221a15" },
      { cloak: "#24345a", jerkin: "#4c3c2b", breeches: "#2b2b2b", boots: "#221a15" },
    ],
    Female: [
      {},
      { cloak: "#4f4f52", jerkin: "#3d2314", breeches: "#5c5530" },
      { cloak: "#7a2a22", jerkin: "#8a6a3e", blouse: "#b8ad96", bracers: "#221a15" },
      { cloak: "#24345a", jerkin: "#4c3c2b", breeches: "#2b2b2b", boots: "#221a15", shoes: "#221a15" },
    ],
  },
  // The warrior's tabard and shield in blue, red, green and black, over bright or blackened steel.
  warrior: {
    Male: [
      {},
      { tabard: "#8c2020", gems: "#c99a3a" },
      { tabard: "#2b4a2e", plate: "#7d7f86", gems: "#e8e4dc" },
      { tabard: "#1c1c22", plate: "#4f4f52", mail: "#4f4f52", gems: "#8c2020" },
    ],
    Female: [
      {},
      { tabard: "#8c2020", gems: "#c99a3a" },
      { tabard: "#2b4a2e", plate: "#7d7f86", gems: "#e8e4dc" },
      { tabard: "#1c1c22", plate: "#4f4f52", mail: "#4f4f52", gems: "#8c2020" },
    ],
  },
  // The mage's robe in violet, midnight blue, deep red and green, the hat to match or black.
  mage: {
    Male: [
      {},
      { robe: "#1c2a4f", hat: "#1c2a4f", sash: "#c99a3a", gems: "#e8e4dc" },
      { robe: "#5b1417", sash: "#1c1716", gems: "#c99a3a" },
      { robe: "#1f3a26", hat: "#3d2314", sash: "#6e6233", gems: "#3f9a5a" },
    ],
    Female: [
      {},
      { robe: "#1c2a4f", hat: "#1c2a4f", sash: "#c99a3a", gems: "#e8e4dc" },
      { robe: "#5b1417", sash: "#1c1716", gems: "#c99a3a" },
      { robe: "#1f3a26", hat: "#3d2314", sash: "#6e6233", gems: "#3f9a5a" },
    ],
  },
  // The cleric's white robe under a blue, red, green or gold tabard; one in grey.
  cleric: {
    Male: [
      {},
      { tabard: "#8c2020" },
      { robe: "#b8ad96", tabard: "#2b4a2e", jewels: "#a7abb2" },
      { tabard: "#b8892e", jewels: "#ece6d8", gems: "#c99a3a" },
    ],
    Female: [
      {},
      { tabard: "#8c2020", stockings: "#8c2020" },
      { robe: "#b8ad96", tabard: "#2b4a2e", jewels: "#a7abb2", stockings: "#b8ad96" },
      { tabard: "#b8892e", jewels: "#ece6d8", gems: "#c99a3a" },
    ],
  },
  // The gang's red stays; the rest is whatever they took off the road.
  rogue: {
    Male: [
      {},
      { cloak: "#2b2b2b", jerkin: "#3d2314", shirt: "#b8ad96" },
      { cloak: "#3d2314", jerkin: "#1c1c22", breeches: "#4c3c2b" },
      { cloak: "#16223f", jerkin: "#4c3c2b", shirt: "#7d6c55", boots: "#3d2314" },
    ],
    Female: [
      {},
      { cloak: "#2b2b2b", jerkin: "#3d2314", blouse: "#b8ad96" },
      { cloak: "#3d2314", jerkin: "#1c1c22", breeches: "#4c3c2b" },
      { cloak: "#16223f", jerkin: "#4c3c2b", blouse: "#7d6c55", boots: "#3d2314", shoes: "#3d2314" },
    ],
  },
  brute: {
    Male: [
      {},
      { cloak: "#4f4f52", jerkin: "#221a15" },
      { cloak: "#7d6c55", jerkin: "#5c4a36", breeches: "#2b2b2b" },
      { cloak: "#2b2018", jerkin: "#4c3c2b", bracers: "#7d6c55" },
    ],
    Female: [
      {},
      { cloak: "#4f4f52", jerkin: "#221a15" },
      { cloak: "#7d6c55", jerkin: "#5c4a36", breeches: "#2b2b2b" },
      { cloak: "#2b2018", jerkin: "#4c3c2b", bracers: "#7d6c55" },
    ],
  },
  // His livery in the house colours the nobles wear; her dress in black, navy, grey or brown.
  servant: {
    Male: [
      {},
      { doublet: "#1c2a4f", waistcoat: "#ece6d8" },
      { doublet: "#1f3a26", waistcoat: "#c99a3a", breeches: "#4c3c2b" },
      { doublet: "#1c1c22", braid: "#a7abb2", waistcoat: "#8c2020" },
    ],
    Female: [
      {},
      { bodice: "#16223f", skirt: "#16223f", stockings: "#16223f" },
      { bodice: "#4f4f52", skirt: "#4f4f52", stockings: "#f1ece0" },
      { bodice: "#3d2314", skirt: "#3d2314", apron: "#e3cf9c", blouse: "#e3cf9c" },
    ],
  },
  // House colours: wine, midnight blue, forest green and black, always with gold.
  noble: {
    Male: [
      {},
      { doublet: "#1c2a4f", cloak: "#5b1430", gems: "#3aa6d6" },
      { doublet: "#1f3a26", cloak: "#2b2b2b", feather: "#8c2020", gems: "#3f9a5a" },
      { doublet: "#1c1c22", cloak: "#6e6233", hat: "#5b1430", breeches: "#4c3c2b" },
    ],
    Female: [
      {},
      { bodice: "#1c2a4f", skirt: "#16223f", gems: "#e8e4dc" },
      { bodice: "#1f3a26", skirt: "#1a3020", gems: "#3f9a5a" },
      { bodice: "#1c1c22", skirt: "#24242c", gems: "#8c2020", blouse: "#e3cf9c" },
    ],
  },
};

/** The colours a guest's outfit is put on with: its preset, changed by one of its variants. */
/**
 * A guest's own skin, hair and eyes, from the look they rolled walking in (Guest.look), so no two farmers are the
 * same man. Each takes its own share of the number, so they don't move together.
 */
export function guestPersonColors(look: number): Record<string, string> {
  const at = (palette: readonly string[], step: number) => palette[Math.floor(look / step) % palette.length];
  return {
    skin: at(SKIN_TONES, GUEST_LOOKS),
    hair: at(HAIR_COLORS, GUEST_LOOKS * SKIN_TONES.length),
    eyes: at(EYE_COLORS, GUEST_LOOKS * SKIN_TONES.length * HAIR_COLORS.length),
  };
}

/** How many guests' looks go by before their outfit, skin, hair and eyes all come round again. */
export const GUEST_PERSON_LOOKS = GUEST_LOOKS * SKIN_TONES.length * HAIR_COLORS.length * EYE_COLORS.length;

export function guestOutfitColors(body: BodyName, outfit: GuestOutfit, variant: number): Record<string, string> {
  const def = LOOK_OPTIONS[body].outfits.find((o) => o.id === outfit)!;
  const index = ((variant % GUEST_LOOKS) + GUEST_LOOKS) % GUEST_LOOKS;
  return { ...def.preset, ...GUEST_VARIANTS[outfit][body][index] };
}

/** The colours a guest's pirate rig is put on with: its preset, changed by one of the variants. */
export function pirateGuestColors(body: BodyName, variant: number): Record<string, string> {
  return guestOutfitColors(body, "pirate", variant);
}

/**
 * Recolours a model's materials for these colours, leaving its shape alone, and shows only its own hair.
 * For guests, which share their meshes. They wear the character's own outfit unless another is named.
 */
export function dressColors(
  model: Object3D,
  body: BodyName,
  colors: Record<string, string>,
  outfit?: string,
  legwear?: string,
): void {
  const worn = outfitOf(body, { outfit }).mesh;
  const legs = legwearOf(body, { outfit, legwear });
  const slots: { mesh: SkinnedMesh; part: MeshPart; original: Material }[] = [];
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || Array.isArray(object.material)) return;
    const part = partOf(object, body);
    if (part) slots.push({ mesh: object, part, original: object.material });
  });
  const originals = (part: MeshPart, name: string) => slots.find((s) => s.part === part && s.original.name === name)?.original;
  const [skinPart, skinName] = LOOK_OPTIONS[body].colors.find((color) => color.id === "skin")?.parts[0] ?? ["Body", ""];
  const skinSlot = slots.find((s) => s.part === skinPart && s.original.name === skinName);
  const skin = skinSlot && materialFor(body, skinSlot.part, skinSlot.original, colors, originals);
  const bandSlot = slots.find((s) => s.part === "Body" && s.original.name === BAND_MATERIAL);
  const band = bandSlot && materialFor(body, bandSlot.part, bandSlot.original, colors, originals);
  for (const slot of slots) {
    slot.mesh.material = materialFor(body, slot.part, slot.original, colors, originals);
    // Guests keep their smallclothes on: a nipple disc wears the breast band, as it lies over it.
    if (slot.part === "Body" && slot.original.name === DISC_MATERIAL && band) slot.mesh.material = band;
    // ...and their pubic hair stays under them.
    if (slot.part === "Body" && slot.original.name === PUBIC_MATERIAL) slot.mesh.visible = false;
    if (slot.part === "Body" && PRIVATE_MATERIALS.includes(slot.original.name)) slot.mesh.visible = false;
    // They wear the band and braies painted on their bodies; the patch for other styles stays empty.
    if (slot.part === "Body" && slot.original.name === LINGERIE_MATERIAL) slot.mesh.visible = false;
    if (slot.part === "Hair") slot.mesh.visible = hairMeshOf(slot.mesh, body) === "";
    // Their own shoes too: guests aren't lifted onto heels, which would sink into the floor.
    if (slot.part === "Shoes") slot.mesh.visible = shoeMeshOf(slot.mesh, body) === "";
    // Only the outfit they wear shows; the others' meshes stay hidden.
    if (slot.part === "Cloth") slot.mesh.visible = outfitMeshOf(slot.mesh, body) === worn;
    if (slot.part === "Cum") slot.mesh.visible = false;
    // Only the jewellery they're built wearing, worn over their clothes: never a piercing.
    if (slot.part === "Jewel") slot.mesh.visible = jewelOf(slot.mesh, body)?.worn ?? false;
    // Only the legwear bands their style reaches show.
    const covered = legwearSlot(legs, slot.part, slot.original.name);
    if (covered === "hide") slot.mesh.visible = false;
    if (covered === "skin" && skin) slot.mesh.material = skin;
  }
}

// ---- Shape --------------------------------------------------------------------------------------

interface ActiveTerm {
  grow: [number, number, number];
  shift?: [number, number, number];
  span?: readonly [number, number];
  fade?: readonly [number, number];
  band?: readonly [number, number, number, number];
  back?: readonly [number, number];
  pivot?: number;
  lobes?: readonly [number, number, number];
  /** How round the inner side of each breast fills, -1..1, from the inner fullness slider; only for `lobes` terms. */
  inner?: number;
  /**
   * How far the cleavage opens, 0..1, as the breasts are set apart: the middle of her chest grows that much less
   * than the breasts, so they part over it instead of pulling the skin between them along. Only `lobes` terms.
   */
  cleft?: number;
  about?: readonly [number, number, number];
  midline?: number;
  reach?: number;
  apart?: number;
  turn?: number;
  parts?: readonly MeshPart[];
}

const lobe = new Vector3();

/** How much of a `band` a height gets: full between its middle two heights, easing out to nothing at its ends. */
export function bandWeight(band: readonly [number, number, number, number], y: number): number {
  const [top, fullTop, fullBottom, bottom] = band;
  const ease = (t: number) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * (3 - 2 * c);
  };
  return ease((top - y) / (top - fullTop)) * ease((y - bottom) / (fullBottom - bottom));
}
const before = new Vector3();

/**
 * Moves a point `d`, measured from a bone's joint, as that bone's active terms reshape it. `skin` is how much of the
 * point the bone holds, for terms that reach past it; the caller weights the whole move by it.
 */
export function reshape(active: readonly ActiveTerm[], d: Vector3, out: Vector3, skin = 1): Vector3 {
  out.copy(d);
  for (const term of active) {
    let weight = 1;
    if (term.fade) {
      const [full, none] = term.fade;
      const t = Math.min(1, Math.max(0, (d.y - none) / (full - none)));
      // Smooth at both ends, so a strong change leaves no shelf where it stops.
      weight = t * t * (3 - 2 * t);
    }
    if (term.band) weight *= bandWeight(term.band, d.y);
    // Set apart, the breasts part over the middle of her chest: it grows less, nothing at all fully open.
    if (term.lobes && term.cleft) weight *= 1 - term.cleft * (1 - Math.min(1, Math.abs(d.x) / term.lobes[0])) ** 2;
    if (term.back) {
      const t = Math.min(1, Math.max(0, (d.z - term.back[0]) / (term.back[1] - term.back[0])));
      weight *= t * t * (3 - 2 * t);
    }
    if (weight === 0) continue;
    // A term that reaches past the bone's weight moves the point as if the bone held more of it.
    const reach = term.reach !== undefined && skin > 0 ? skin ** (term.reach - 1) : 1;
    before.copy(out);
    const side = Math.sign(d.x);
    if (term.lobes) out.sub(lobe.set(side * Math.min(Math.abs(d.x), term.lobes[0]), term.lobes[1], term.lobes[2]));
    else if (term.about) out.sub(lobe.set(...term.about));
    const [gx, gy, gz] = term.grow;
    out.x *= 1 + gx * weight;
    out.z *= 1 + gz * weight;
    if (gy !== 0) {
      const from = out.y - (term.pivot ?? 0);
      const along = term.span ? Math.min(term.span[1], Math.max(term.span[0], from)) : from;
      out.y += gy * weight * along;
    }
    if (term.lobes || term.about) out.add(lobe);
    // Towards the body's middle, growth across follows mid * (1 - (1 - t)^(1 + g)): as steep as the outer side at the
    // joint, flat at the middle, so the inner side rounds into the cleft and stops there.
    if (term.midline && gx * weight > 0) {
      const t = d.x / term.midline;
      if (t > 0 && t < 1) {
        const g = gx * weight;
        out.x += term.midline * (1 - (1 - t) ** (1 + g)) - d.x * (1 + g);
      }
    }
    // Inner fullness: between a breast's middle and the cleavage, points spread across along a curve that meets the
    // outer side's growth at the middle, so the breast swells round on both sides instead of bending there. The
    // cleavage itself never moves, so the two sides can close in on it but never pass through each other.
    // Negative goes the other way: the inner side draws in towards the middle, opening the gap.
    if (term.lobes && term.inner && Math.abs(d.x) < term.lobes[0]) {
      const middle = term.lobes[0];
      const across = Math.abs(d.x);
      const p = Math.max(0.2, 1 + gx * weight);
      const curve = middle * (across / middle) ** (term.inner > 0 ? p : 1 / p);
      out.x += side * Math.abs(term.inner) * (curve - across);
    }
    if (term.shift) {
      out.x += term.shift[0] * weight;
      out.y += term.shift[1] * weight;
      out.z += term.shift[2] * weight;
    }
    // Towards the middle, the move fades out over the last 4 cm (or to each breast's middle, for a `lobes` term), so
    // the two sides close in but never cross, and moving apart they stretch the skin between them instead of
    // tearing it down the middle.
    if (term.apart) out.x += side * term.apart * weight * Math.min(1, Math.abs(d.x) / (term.lobes ? term.lobes[0] : 0.04));
    // Turning outwards moves the front of a breast most: by how far forwards (-z) it is, up to 1.5 times at 9 cm.
    if (term.turn) out.x += side * term.turn * weight * Math.min(1.5, Math.max(0, -d.z / 0.06));
    if (reach !== 1) out.sub(before).multiplyScalar(reach).add(before);
  }
  return out;
}

/**
 * The terms each bone gets from these slider settings, by bone label (the name without the body prefix), from
 * a bust shape's id if there is one, and from how firmly what she has on holds her bust (`held`, 0 to 1).
 */
export function activeTerms(
  body: BodyName, given: Record<string, number>, bustShape?: string, held = 0,
): Map<string, ActiveTerm[]> {
  // What holds her bust moves its sliders on, as if she had set them so herself, within their ends; her support
  // slider makes it hold more or less firmly.
  const sliders = { ...given };
  held *= 1 + clampSlider(given.bustSupport);
  if (held > 0) for (const [id, amount] of Object.entries(BUST_HELD)) sliders[id] = clampSlider((sliders[id] ?? 0) + amount * held);
  const byBone = new Map<string, ActiveTerm[]>();
  const add = (term: BoneTerm, value: number) => {
    const list = byBone.get(term.bone) ?? [];
    const amount = value < 0 && term.shrink ? term.shrink : term.grow;
    // shrinkShift is the move at -1 itself, so it is scaled by how far below 0 the slider is.
    const move = value < 0 && term.shrinkShift ? term.shrinkShift.map((v) => -v) : term.shift;
    list.push({
      grow: [amount[0] * value, amount[1] * value, amount[2] * value],
      shift: move ? [move[0] * value, move[1] * value, move[2] * value] : undefined,
      span: term.span,
      fade: term.fade,
      band: term.band,
      back: term.back,
      pivot: term.pivot,
      lobes: term.lobes,
      about: term.about,
      midline: term.midline,
      reach: term.reach,
      apart: term.apart === undefined ? undefined : (value < 0 && term.shrinkApart !== undefined ? -term.shrinkApart : term.apart) * value,
      turn: term.turn === undefined ? undefined : term.turn * value,
      parts: term.parts,
    });
    byBone.set(term.bone, list);
  };
  const defs = LOOK_OPTIONS[body].sliders;
  for (const def of [...defs.filter((d) => d.early), ...defs.filter((d) => !d.early)]) {
    const raw = clampSlider(sliders[def.id], sliderTop(def));
    const value = def.rest === undefined ? raw : raw >= 0 ? def.rest + (1 - def.rest) * raw : def.rest * (1 + raw);
    if (value === 0) continue;
    for (const term of def.terms) add(term, value);
  }
  const shape = LOOK_OPTIONS[body].bustShapes.find((s) => s.id === bustShape);
  if (shape) {
    const amount = shapeAmount(clampSlider(sliders.bust, CUP_TOP));
    for (const term of shape.terms) add(term, amount);
  }
  // Inner fullness changes no bones of its own: it shapes how every breast term grows towards the cleavage. As
  // built, a breast is 0.6 of the way round on its inner side, so a fuller bust closes the gap between them; the
  // slider takes it from fully drawn in (-1) to fully round, pressed together (1). The fill grows with the cup,
  // so a small bust looks the same whatever it is set to.
  // Her hair's springs sit on the joints of the head and the torso (see build_world.py), so whatever reshapes
  // those reshapes the hair riding on the springs alike.
  for (const [spring, bone] of HAIR_SPRINGS) {
    const list = byBone.get(bone);
    if (list) byBone.set(spring, list);
  }
  const slider = clampSlider(sliders.bustInner);
  const inner = slider >= 0 ? INNER_AS_BUILT + (1 - INNER_AS_BUILT) * slider : INNER_AS_BUILT + (1 + INNER_AS_BUILT) * slider;
  if (inner !== 0) for (const list of byBone.values()) for (const term of list) if (term.lobes) term.inner = inner;
  // Breasts set apart part over her chest instead of dragging the skin between them along, so the cleavage opens:
  // with the Spacing slider, a side-set or east-west shape, or the inner sides drawn in; pushed together (by her or
  // by what she wears), it closes again.
  const cleft = Math.min(1, Math.max(0,
    Math.max(0, clampSlider(sliders.bustSpacing)) + (CLEFT_OF_SHAPE[bustShape ?? ""] ?? 0)
    + Math.max(0, -slider) * CLEFT_OF_INNER - Math.max(0, clampSlider(sliders.bustTogether)),
  ));
  if (cleft > 0) for (const list of byBone.values()) for (const term of list) if (term.lobes) term.cleft = cleft;
  return byBone;
}

/**
 * How strongly a bust shape shows at this cup slider: a small bust has little to shape, a full one more. 0.8 as
 * built (C), 1 at about an H, 1.4 at Q, and 0.35 at A.
 */
export function shapeAmount(cup: number): number {
  return cup < 0 ? 0.8 + 0.45 * cup : 0.8 + 0.6 * cup;
}

/** A slider's value, held between -1 and `top` (1 for most; past it for cup sizes); 0 if it isn't a number. */
const clampSlider = (value: unknown, top = 1) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(top, Math.max(-1, value)) : 0;

interface MeshSlot {
  mesh: SkinnedMesh;
  part: MeshPart;
  original: Material;
  /** The material the look puts on it, which a stripped body part gives way to the skin's. */
  worn: Material;
  /** Vertex positions as built, in the model's bind space. */
  bind: Float32Array;
  /**
   * Clothes and shoes ride on the body under them: each vertex takes the movement of the nearest body points,
   * so the body never pushes through where the cloth follows different bones. Null for the body and hair.
   */
  follow: FollowTable | null;
  /** Where this mesh's points start in the shared list of body points, for body meshes. */
  bodyStart: number;
  /** Where the body's reshaping takes its points from, where that isn't `bind`: her nipple discs, from the skin. */
  shapeFrom?: Float32Array;
}

interface BoneRest {
  bone: Object3D;
  label: string;
  parent: BoneRest | null;
  position: Vector3;
  quaternion: Quaternion;
  /** Where the joint stood when the mesh was bound, in the model's space. */
  joint: Vector3;
}

/** How many body points each clothing point follows. */
const FOLLOW_POINTS = 4;
/**
 * Cloth within the first distance of the body follows it fully; by the second it keeps to its own bones,
 * so a skirt's flared hem keeps its shape instead of copying the legs.
 */
const FOLLOW_NEAR = 0.03;
const FOLLOW_FAR = 0.09;
const FOLLOWING_PARTS: readonly MeshPart[] = ["Cloth", "Shoes", "Cum", "Jewel"];
/**
 * How far round a piercing a piece of clothing reaches to cover it: any of its points this near, and the piercing
 * stays hidden while it's on, as it would poke through it.
 */
const JEWEL_COVER = 0.012;
/** How far from her vulva's grid a piercing's points are measured to ride it: all of a ring through her hood. */
const JEWEL_RIDE = 0.03;
/** How far out a ring through a standing nipple sits, as a share of how far the nipple stands. */
const NIPPLE_PIERCE = 0.5;
/** How far from a nipple's tip, as built, the clothes over it can tent out: past the widest areola there is. */
const RIDE = 0.04;

/**
 * Clothes don't sink into the cleavage: fabric pulled over two breasts stretches straight from one to the other.
 * The body points that can hold it out: the front of the chest, from just off the middle to past the breasts.
 * Model space: x across, y up, z backwards.
 */
const SPAN_HOLD = { across: [0.015, 0.16], height: [0.8, 1.5] } as const;
/** The clothing points that can stretch across: the front, near the middle, at chest height. */
const SPAN_CLOTH = { across: 0.12, height: [0.85, 1.45] } as const;
/** The span is measured in bands of this height, each holding either side's most forward point. */
const SPAN_BAND = 0.005;
const SPAN_BANDS = Math.ceil((SPAN_HOLD.height[1] - SPAN_HOLD.height[0]) / SPAN_BAND);
/** How much of the deeper dip the fabric still follows, so it lies a little into the cleavage, not dead flat. */
const SPAN_SLACK = 0.2;

/** The body points that hold the clothes out over her cleavage, by index into the body's points, as built. */
interface CleavageHold {
  at: Int32Array;
  bind: Float32Array;
}

/** A mesh's points that can stretch across her cleavage, and how far each lay behind the span as built. */
interface ClothSpan {
  verts: Int32Array;
  sunk: Float32Array;
}

/** The body points in front of her chest either side of the middle, out of the body's points as built. */
export function cleavageHold(body: Float32Array): CleavageHold {
  const at: number[] = [];
  for (let b = 0; b < body.length / 3; b++) {
    const x = Math.abs(body[b * 3]), y = body[b * 3 + 1], z = body[b * 3 + 2];
    if (x > SPAN_HOLD.across[0] && x < SPAN_HOLD.across[1] && y > SPAN_HOLD.height[0] && y < SPAN_HOLD.height[1] && z < 0) {
      at.push(b);
    }
  }
  const bind = new Float32Array(at.length * 3);
  at.forEach((b, k) => bind.set(body.subarray(b * 3, b * 3 + 3), k * 3));
  return { at: Int32Array.from(at), bind };
}

/**
 * For each band of height and each side (left first), the most forward of the holding points there and how far
 * across it lies, with the body moved by `bodyMoves` (by index into all the body's points), or as built.
 */
function spanBands(hold: CleavageHold, bodyMoves: Float32Array | null): { front: Float32Array; across: Float32Array } {
  const front = new Float32Array(SPAN_BANDS * 2).fill(-Infinity);
  const across = new Float32Array(SPAN_BANDS * 2);
  for (let k = 0; k < hold.at.length; k++) {
    const b = hold.at[k] * 3;
    const x = hold.bind[k * 3] + (bodyMoves ? bodyMoves[b] : 0);
    const y = hold.bind[k * 3 + 1] + (bodyMoves ? bodyMoves[b + 1] : 0);
    const f = -(hold.bind[k * 3 + 2] + (bodyMoves ? bodyMoves[b + 2] : 0));
    const band = Math.floor((y - SPAN_HOLD.height[0]) / SPAN_BAND);
    if (band < 0 || band >= SPAN_BANDS) continue;
    const i = band * 2 + (x < 0 ? 0 : 1);
    if (f > front[i]) {
      front[i] = f;
      across[i] = x;
    }
  }
  return { front, across };
}

/**
 * How far forward the fabric stretched from one side's most forward point to the other's lies at (x, y): those of
 * the band at that height and either next to it. NaN where a side has none, or (x, y) isn't between them.
 */
function spanAt(bands: { front: Float32Array; across: Float32Array }, x: number, y: number): number {
  const band = Math.floor((y - SPAN_HOLD.height[0]) / SPAN_BAND);
  let leftF = -Infinity, leftX = 0, rightF = -Infinity, rightX = 0;
  for (let b = Math.max(0, band - 1); b <= Math.min(SPAN_BANDS - 1, band + 1); b++) {
    if (bands.front[b * 2] > leftF) {
      leftF = bands.front[b * 2];
      leftX = bands.across[b * 2];
    }
    if (bands.front[b * 2 + 1] > rightF) {
      rightF = bands.front[b * 2 + 1];
      rightX = bands.across[b * 2 + 1];
    }
  }
  if (leftF === -Infinity || rightF === -Infinity || !(leftX < x && x < rightX)) return NaN;
  return leftF + (rightF - leftF) * (x - leftX) / (rightX - leftX);
}

/** A mesh's points that can stretch across her cleavage, from its points as built, with how far each lay behind. */
export function clothSpan(hold: CleavageHold, bind: Float32Array): ClothSpan | null {
  const bands = spanBands(hold, null);
  const verts: number[] = [], sunk: number[] = [];
  for (let v = 0; v < bind.length / 3; v++) {
    const x = bind[v * 3], y = bind[v * 3 + 1], z = bind[v * 3 + 2];
    if (Math.abs(x) >= SPAN_CLOTH.across || y <= SPAN_CLOTH.height[0] || y >= SPAN_CLOTH.height[1] || z >= 0) continue;
    const span = spanAt(bands, x, y);
    verts.push(v);
    sunk.push(Number.isNaN(span) ? 0 : Math.max(0, span + z));
  }
  return verts.length ? { verts: Int32Array.from(verts), sunk: Float32Array.from(sunk) } : null;
}

/**
 * Stretches a mesh's points across her cleavage: where the body under them has dipped further behind the span from
 * breast to breast than they lay as built, they come forward to it, all but SPAN_SLACK of the extra. `moves` are
 * the mesh's, changed in place; `bodyMoves` the body's, by index into all its points.
 */
export function spanCleavage(
  hold: CleavageHold, cloth: ClothSpan, bind: Float32Array, moves: Float32Array, bodyMoves: Float32Array,
): void {
  const bands = spanBands(hold, bodyMoves);
  for (let k = 0; k < cloth.verts.length; k++) {
    const v = cloth.verts[k] * 3;
    const z = bind[v + 2] + moves[v + 2];
    const span = spanAt(bands, bind[v] + moves[v], bind[v + 1] + moves[v + 1]);
    if (Number.isNaN(span)) continue;
    const behind = span + z;
    const allowed = cloth.sunk[k] + SPAN_SLACK * Math.max(0, behind - cloth.sunk[k]);
    if (behind > allowed) moves[v + 2] -= behind - allowed;
  }
}

/**
 * Pulling her tops off her breasts (Dresser.setPull), in the model's space (y up, forwards -z, metres as built).
 * Only cloth this high takes part, from under her breasts up past her collarbone, and only this far either side.
 */
const PULL_BAND: readonly [number, number] = [0.98, 1.4];
const PULL_HALF_WIDTH = 0.3;
/**
 * How far round her the pull reaches, measured round an axis this far behind the middle of her chest: nothing until
 * this share of the way round from her side towards the front, all of it from the second.
 */
const PULL_AXIS = 0.02;
const PULL_FRONT: readonly [number, number] = [-0.05, 0.6];
/** Her chest just under each breast as built (across, height): where its underside's gone says where the roll goes. */
const PULL_CREASE: readonly [number, number] = [0.06, 1.08];
/**
 * The rolled-up cloth: how far past the breasts it starts, how deep the roll is, how much it draws in towards her
 * middle, and how far it stands off what it lies on, at its near edge and its far edge.
 */
const PULL_ROLL = { gap: 0.006, height: 0.028, narrow: 0.06, thick: [0.006, 0.016] as const };
/** Meshes on her skin a top lifted over her breasts doesn't lie on: her nipple discs, pubic hair and underwear patch. */
const PULL_SKIP_SKIN: readonly string[] = [DISC_MATERIAL, PUBIC_MATERIAL, LINGERIE_MATERIAL];

/**
 * Pulling it off just the one breast: which way across is her own left and right (x, as built), and how the pull
 * fades out across the middle of her chest, from none this far over on the other side to all of it this far on hers.
 */
const PULL_SIDE: Readonly<Record<"left" | "right", number>> = { left: -1, right: 1 };
const PULL_SIDE_BLEND: readonly [number, number] = [-0.01, 0.05];

/** Where a pulled top's points go: for each point its place in the lists (-1 if it stays), where it goes, how far. */
interface PullPlan {
  at: Int32Array;
  target: Float32Array;
  weight: Float32Array;
}

/**
 * The front of a surface, for a pulled top to lie on: for each centimetre square of width and height, how far
 * forwards it comes. Asked for a square it has nothing in, it looks round it.
 */
class DepthGrid {
  private readonly cells = new Map<number, number>();
  private static key(ix: number, iy: number): number {
    return (ix + 500) * 10000 + (iy + 500);
  }
  add(p: Vector3): void {
    const key = DepthGrid.key(Math.round(p.x * 100), Math.round(p.y * 100));
    const known = this.cells.get(key);
    if (known === undefined || p.z < known) this.cells.set(key, p.z);
  }
  /** How far forwards it comes (its z) at this width and height, from the nearest squares it has; null if none near. */
  frontAt(x: number, y: number): number | null {
    const ix = Math.round(x * 100);
    const iy = Math.round(y * 100);
    for (let r = 0; r <= 3; r++) {
      let best: number | null = null;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const z = this.cells.get(DepthGrid.key(ix + dx, iy + dy));
          if (z !== undefined && (best === null || z < best)) best = z;
        }
      }
      if (best !== null) return best;
    }
    return null;
  }
}

/** For each point of a mesh, the body points nearest it and how much each counts, and how much it keeps its own move. */
interface FollowTable {
  points: Int32Array;
  weights: Float32Array;
  own: Float32Array;
}

/** The clothing points over a nipple: by index into their mesh, which disc, and how far from its tip as built. */
interface Riders {
  verts: Int32Array;
  disc: Uint8Array;
  r: Float32Array;
  /** A piercing: it moves out as one with the nipple it goes through, instead of tenting over it like cloth. */
  rigid: boolean;
}

const point = new Vector3();
const offset = new Vector3();
const moved = new Vector3();
const unbind = new Matrix4();
/**
 * How far her pubic hair's points rise above her vulva's shape where they lie over it: it is built under the grid
 * (0.9 mm off the skin to the grid's 1.1 mm), and must end up over it.
 */
const PUBIC_OVER_VULVA = 0.0004;
/** How near his penis's root a piece of clothing has to come to cover his groin. */
const GROIN_REACH = 0.035;
/** Her vulva's and anus's meshes, and his penis's, which only show while bare there; guests never show them. */
const PRIVATE_MATERIALS: readonly string[] = [
  VULVA_MATERIAL, LABIA_MATERIAL, CANAL_MATERIAL, ANUS_MATERIAL, ANUS_SKIN_MATERIAL, PENIS_MATERIAL, GLANS_MATERIAL, SCROTUM_MATERIAL,
];
/** The colour her areolae flush towards as she's aroused. */
const FLUSHED = new Color(0.55, 0.16, 0.18);

/**
 * Her face's meshes (face.ts), by their materials: every plane of her face, her lips, her eye dots, her brows and the
 * inside of her mouth (its pocket, her teeth and her tongue);
 * and the ones her eyes, brows and lips are found by. Only her face is drawn this way.
 */
const FACE_MATERIAL = /^T_(face_|lip|soot$|hair_f$|mouth$|teeth|tongue$)/;
const EYE_MATERIAL = "T_soot";
/** Her upper teeth, which stay with her skull as her mouth opens; her tongue, which can come out. */
const UPPER_TEETH_MATERIAL = "T_teeth";
const TONGUE_MATERIAL = "T_tongue";
const BROW_MATERIAL = "T_hair_f";
const LIP_MATERIALS: readonly string[] = ["T_lip", "T_lip_lit"];
/**
 * As she blushes, the red spreads over her face towards this colour: her cheeks first, then the tip of her nose, then
 * across the bridge of her nose and her brow, and at its deepest all over her face. Each plane of her face, by its
 * material: how deep it goes at most, and from how much blush it starts.
 */
const BLUSHED = new Color(0.86, 0.2, 0.24);
/** The lines an expression draws on her face (face.ts's FACE_LINES): two creases, the third, a blush's strokes. */
const CREASE_MATERIAL = "T_crease";
const CREASE_MID_MATERIAL = "T_crease_mid";
const HATCH_MATERIAL = "T_hatch";
/**
 * Her lips pressed thin into a line (face.ts's `press`): her upper lip darkens to an ink line and her lower lip mostly
 * fades into the skin round it, a hint of it left, so her mouth reads as a line drawn across her face. Each: towards
 * what, and how far at most.
 */
const PRESSED_LINE = new Color(0.16, 0.05, 0.05);
const PRESSED_INTO = { T_lip: ["line", 1], T_lip_lit: ["T_face_skin", 0.55] } as const;
const BLUSH_SPREAD: Readonly<Record<string, { depth: number; from: number }>> = {
  T_face_blush: { depth: 0.9, from: 0 },
  T_face_pink: { depth: 0.75, from: 0.1 },
  T_face_lit: { depth: 0.65, from: 0.3 },
  T_face_white: { depth: 0.65, from: 0.3 },
  T_face_cool: { depth: 0.65, from: 0.3 },
  T_face_skin: { depth: 0.45, from: 0.55 },
  T_face_mid: { depth: 0.45, from: 0.55 },
};

/**
 * Dresses one character: owns copies of its meshes so their shape can change without touching anyone sharing
 * them, and puts a look on it. Bones are only moved, never scaled, so the animation bends the limbs cleanly.
 */
export class Dresser {
  private readonly slots: MeshSlot[] = [];
  private readonly bones: BoneRest[] = [];
  private readonly boneIndex = new Map<Object3D, BoneRest>();
  /** The lowest point of the model as built, which the feet are kept on. */
  private readonly floor: number;
  private readonly bodyRoot: Object3D;
  /** How many body points there are, across the body's meshes. */
  private readonly bodyCount: number;
  /** True while the clothes are taken off to see the body; a preview, never part of the look. */
  private undressed = false;
  /** Down to her smallclothes, to see them while shaping her: everything else off, those left on. */
  private underwear = false;
  /** How firmly what she has on holds her bust, as last shaped. */
  private held = 0;
  /** Clothes guests have got off this character tonight; a state of the night, never part of the look. */
  private stripped: [MeshPart, string][] = [];
  /** How far along each part of her the night has got, by section; a state of the night, never part of the look. */
  private coat: Record<string, number> = {};
  /** How aroused she shows, from 0 to 1; a state of the night, never part of the look. */
  private arousal = 0;
  /**
   * Her nipple discs, for a body built with them, and for each clothing mesh the points close over a nipple: which
   * disc and how far from its tip. They tent out as it stands, and are all that change when only her arousal does.
   */
  private readonly nipples: { slot: MeshSlot; discs: Disc[]; riders: Map<MeshSlot, Riders> } | null = null;
  /** The body points holding the clothes out over her cleavage, and each clothing mesh's points stretched across. */
  private readonly cleavage: { hold: CleavageHold; spans: Map<MeshSlot, ClothSpan> } | null = null;
  /** How aroused her vulva shows, from 0 to 1; a state of the night, never part of the look. */
  private vulvaArousal = 0;
  /**
   * Whether her vulva and anus show: she has nothing on over them. Hidden, they lie flat and closed, nothing rides
   * over them, and the skin under their openings shows instead, in her smallclothes.
   */
  private vulvaShown = false;
  /** How open her vulva and her anus are, from 0 to 1; a state of the moment, never part of the look. */
  private vulvaOpen = 0;
  private anusOpen = 0;
  /**
   * Her vulva's grid, for a body built with it: its meshes (the slit, the outer lips, and her canal if it has one),
   * and the points of other meshes lying over it (her coat, clothes and pubic hair), which rise over its shape,
   * `over` more on top of it.
   */
  private readonly vulva: {
    slots: MeshSlot[];
    patch: VulvaPatch;
    riders: Map<MeshSlot, { riders: VulvaRiders; over: number; rigid: boolean }>;
  } | null = null;
  /** The clothes near each piercing, which hide it while any of them is on. */
  private readonly jewelCovers = new Map<MeshSlot, MeshSlot[]>();
  /** Her anus's disc, for a body built with it: its two meshes (the rim and canal, the skin around them). */
  private readonly anus: { slots: MeshSlot[]; patch: AnusPatch } | null = null;
  /** His penis's tube and sack, for a body built with them: the shaft, the glans, then the sack. */
  private readonly penis: { slots: MeshSlot[]; patch: PenisPatch; groin: MeshSlot[] } | null = null;
  /** Whether his penis was last shaped held in what covers his groin, rather than free. */
  private penisPacked = false;
  /** How hard he is, from 0 (soft) to 1; a state of the moment, never part of the look. */
  private erection = 0;
  /**
   * What the last look left, for arousal to change the discs and their riders without redoing the whole body:
   * every mesh's moves, where the discs lie on the skin, and the riders' moves before they tent. Likewise for her
   * vulva: where its meshes lie on the skin, and its riders' moves before they rise over it.
   */
  private shaped: {
    totals: Float32Array[];
    settled: Float32Array[];
    onSkin: Float32Array;
    flat: Map<MeshSlot, Float32Array>;
    vulvaSkin: Float32Array[];
    vulvaFlat: Map<MeshSlot, Float32Array>;
    anusSkin: Float32Array[];
    penisSkin: Float32Array[];
  } | null = null;
  private look: Look = newLook();
  /**
   * Her tops pulled down off her breasts or lifted up over them as she shows a guest (show.ts, 7e): which garments,
   * which way and how far (0 to 1); a state of the moment, never part of the look. Each pulled mesh's plan says
   * where its points go, worked out from the body as last shaped, and is dropped when the body's reshaped.
   */
  private pull: { ids: readonly string[]; dir: "down" | "up"; side?: "left" | "right"; amount: number } | null = null;
  /** Her face's expression now (face.ts), where her eyes, brows and mouth are on her as shaped, and how far it moves
   * each point of each of her face's meshes. */
  private faceShape: FaceShape = { ...REST_FACE };
  private faceRig: FaceRig | null = null;
  /** The shape her face's rig was found on, so it's only found again once she's reshaped. */
  private faceRigOn: unknown = null;
  private readonly faceMoves = new Map<MeshSlot, Float32Array>();
  private readonly pullPlans = new Map<MeshSlot, PullPlan>();
  /** The pulled meshes' normals as built, to put back once the pull's let go. */
  private readonly pullNormals = new Map<MeshSlot, Float32Array>();

  constructor(model: Object3D, readonly body: BodyName) {
    const root = model.getObjectByName(body);
    if (!root) throw new Error(`Character model is missing "${body}"`);
    this.bodyRoot = root;
    const meshes: SkinnedMesh[] = [];
    model.traverse((object) => {
      if (object instanceof SkinnedMesh && !Array.isArray(object.material) && partOf(object, body)) meshes.push(object);
    });
    const inverse = new Matrix4();
    let bodyCount = 0;
    for (const mesh of meshes) {
      mesh.geometry = mesh.geometry.clone();
      const position = mesh.geometry.getAttribute("position");
      const bind = new Float32Array(position.count * 3);
      for (let v = 0; v < position.count; v++) {
        point.fromBufferAttribute(position, v).applyMatrix4(mesh.bindMatrix).toArray(bind, v * 3);
      }
      const part = partOf(mesh, body)!;
      if (part === "Cum") {
        mesh.material = stainMeshOf(mesh, body) ? stainRetroMaterial() : coatRetroMaterial();
        // Too close to the skin to shadow it cleanly.
        mesh.castShadow = false;
      }
      const material = mesh.material as Material;
      this.slots.push({ mesh, part, original: material, worn: material, bind, follow: null, bodyStart: bodyCount });
      if (part === "Body") bodyCount += position.count;
      mesh.skeleton.bones.forEach((bone, i) => {
        if (this.boneIndex.has(bone)) return;
        const joint = new Vector3().setFromMatrixPosition(inverse.copy(mesh.skeleton.boneInverses[i]).invert());
        const rest: BoneRest = {
          bone,
          label: bone.name.startsWith(`${body}_`) ? bone.name.slice(body.length + 1) : bone.name,
          parent: null,
          position: bone.position.clone(),
          quaternion: bone.quaternion.clone(),
          joint,
        };
        this.boneIndex.set(bone, rest);
        this.bones.push(rest);
      });
    }
    for (const rest of this.bones) rest.parent = rest.bone.parent ? (this.boneIndex.get(rest.bone.parent) ?? null) : null;
    this.bodyCount = bodyCount;

    const bodyPoints = new Float32Array(bodyCount * 3);
    for (const slot of this.slots) if (slot.part === "Body") bodyPoints.set(slot.bind, slot.bodyStart * 3);
    // The clothes ride on the skin, never on her nipple discs, which lie over it and lift off it as a breast grows:
    // they are put out of reach. The nipples push the clothes out by themselves (see the riders below).
    // Her pubic hair's patch lies over the skin as well.
    const discSlot = this.slots.find((slot) => slot.part === "Body" && slot.original.name === DISC_MATERIAL);
    if (discSlot) bodyPoints.fill(1e6, discSlot.bodyStart * 3, (discSlot.bodyStart + discSlot.bind.length / 3) * 3);
    const pubicSlot = this.slots.find((slot) => slot.part === "Body" && slot.original.name === PUBIC_MATERIAL);
    if (pubicSlot) {
      bodyPoints.fill(1e6, pubicSlot.bodyStart * 3, (pubicSlot.bodyStart + pubicSlot.bind.length / 3) * 3);
      // Too close to the skin to shadow it cleanly, like the coat.
      pubicSlot.mesh.castShadow = false;
    }
    // Her underwear's patch, likewise.
    const lingerieSlot = this.slots.find((slot) => slot.part === "Body" && slot.original.name === LINGERIE_MATERIAL);
    if (lingerieSlot) {
      bodyPoints.fill(1e6, lingerieSlot.bodyStart * 3, (lingerieSlot.bodyStart + lingerieSlot.bind.length / 3) * 3);
      lingerieSlot.mesh.castShadow = false;
    }
    // Her vulva's grid and canal too, and her anus's disc, which stand off the skin once shaped.
    const bodySlot = (name: string) => this.slots.find((slot) => slot.part === "Body" && slot.original.name === name);
    const found = (names: string[]) => names.map(bodySlot).filter((slot): slot is MeshSlot => slot !== undefined);
    const vulvaSlots = found([VULVA_MATERIAL, LABIA_MATERIAL]);
    const canalSlot = bodySlot(CANAL_MATERIAL);
    const anusSlots = found([ANUS_MATERIAL, ANUS_SKIN_MATERIAL]);
    const penisSlots = found([PENIS_MATERIAL, GLANS_MATERIAL, SCROTUM_MATERIAL]);
    for (const slot of [...vulvaSlots, ...(canalSlot ? [canalSlot] : []), ...anusSlots, ...penisSlots]) {
      bodyPoints.fill(1e6, slot.bodyStart * 3, (slot.bodyStart + slot.bind.length / 3) * 3);
      slot.mesh.castShadow = false;
    }
    for (const slot of this.slots) {
      if (FOLLOWING_PARTS.includes(slot.part) && bodyCount >= FOLLOW_POINTS) slot.follow = nearestBody(slot.bind, bodyPoints);
    }
    // Her clothes, and what landed on them, stretch across her cleavage instead of following the skin into it.
    const hold = cleavageHold(bodyPoints);
    if (hold.at.length) {
      const spans = new Map<MeshSlot, ClothSpan>();
      for (const slot of this.slots) {
        if (!slot.follow || !(slot.part === "Cloth" || (slot.part === "Cum" && stainMeshOf(slot.mesh, body)))) continue;
        const span = clothSpan(hold, slot.bind);
        if (span) spans.set(slot, span);
      }
      if (spans.size) this.cleavage = { hold, spans };
    }

    const discs = discSlot ? readDiscs(discSlot.mesh.geometry, discSlot.bind) : [];
    if (discSlot && discs.length) {
      const riders = new Map<MeshSlot, Riders>();
      const tips = discs.map((disc) => discSlot.bind.subarray(disc.tip * 3, disc.tip * 3 + 3));
      for (const slot of this.slots) {
        if (!slot.follow) continue;
        const verts: number[] = [], which: number[] = [], from: number[] = [];
        for (let v = 0; v < slot.bind.length / 3; v++) {
          tips.forEach((tip, d) => {
            const r = Math.hypot(slot.bind[v * 3] - tip[0], slot.bind[v * 3 + 1] - tip[1], slot.bind[v * 3 + 2] - tip[2]);
            if (r < RIDE) {
              verts.push(v);
              which.push(d);
              from.push(r);
            }
          });
        }
        if (verts.length) {
          riders.set(slot, {
            verts: Int32Array.from(verts), disc: Uint8Array.from(which), r: Float32Array.from(from), rigid: slot.part === "Jewel",
          });
        }
      }
      discSlot.shapeFrom = skinUnder(discs, discSlot.bind);
      this.nipples = { slot: discSlot, discs, riders };
    }

    const uvs = vulvaSlots.map((slot) => slot.mesh.geometry.getAttribute("uv"));
    const canalUv = canalSlot?.mesh.geometry.getAttribute("uv");
    const patch = vulvaSlots.length === 2 && uvs.every(Boolean) ? readVulva(uvs, canalUv) : null;
    // The canal shapes along with the grid, as the last of its meshes.
    if (patch?.canal && canalSlot) vulvaSlots.push(canalSlot);
    if (patch) {
      const grid = gridOf(patch, vulvaSlots.map((slot) => slot.bind));
      const riders = new Map<MeshSlot, { riders: VulvaRiders; over: number; rigid: boolean }>();
      for (const slot of this.slots) {
        const pubic = slot === pubicSlot;
        if (!slot.follow && !pubic) continue;
        const rigid = slot.part === "Jewel";
        const found = vulvaRiders(slot.bind, grid, rigid ? JEWEL_RIDE : undefined);
        // Her pubic hair lies under the grid as built; it rises clear over it, so a full bush still covers her.
        if (found) riders.set(slot, { riders: found, over: pubic ? PUBIC_OVER_VULVA : 0, rigid });
      }
      this.vulva = { slots: vulvaSlots, patch, riders };
    }
    const anusUvs = anusSlots.map((slot) => slot.mesh.geometry.getAttribute("uv"));
    const anus = anusSlots.length === 2 && anusUvs.every(Boolean) ? readAnus(anusUvs) : null;
    if (anus) this.anus = { slots: anusSlots, patch: anus };
    const penisUvs = penisSlots.map((slot) => slot.mesh.geometry.getAttribute("uv"));
    const penis = penisSlots.length === 3 && penisUvs.every(Boolean) ? readPenis(penisUvs.slice(0, 2), penisUvs.slice(2)) : null;
    if (penis) {
      // The clothes over his groin, nearest first: any of them on, his penis lies packed in it rather than showing.
      const root = penisFrame(penis, penisSlots.map((slot) => slot.bind)).root;
      const near = (slot: MeshSlot) => {
        let best = Infinity;
        for (let v = 0; v < slot.bind.length; v += 3) {
          best = Math.min(best, Math.hypot(slot.bind[v] - root[0], slot.bind[v + 1] - root[1], slot.bind[v + 2] - root[2]));
        }
        return best;
      };
      const groin = this.slots
        .filter((slot) => slot.part === "Cloth")
        .map((slot) => ({ slot, d: near(slot) }))
        .filter(({ d }) => d < GROIN_REACH)
        .sort((a, b) => a.d - b.d)
        .map(({ slot }) => slot);
      this.penis = { slots: penisSlots, patch: penis, groin };
    }

    // The clothes over each piercing: any of them on, it stays hidden. Measured round each side of her apart, so
    // what covers one nipple doesn't hide the ring through the other.
    for (const slot of this.slots) {
      if (slot.part !== "Jewel" || !jewelOf(slot.mesh, body)?.bare) continue;
      const boxes = [-1, 0, 1].flatMap((side) => {
        const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
        for (let v = 0; v < slot.bind.length; v += 3) {
          const x = slot.bind[v];
          if ((side < 0 && x >= -0.01) || (side > 0 && x <= 0.01) || (side === 0 && Math.abs(x) > 0.01)) continue;
          for (let k = 0; k < 3; k++) {
            low[k] = Math.min(low[k], slot.bind[v + k] - JEWEL_COVER);
            high[k] = Math.max(high[k], slot.bind[v + k] + JEWEL_COVER);
          }
        }
        return low[0] === Infinity ? [] : [{ low, high }];
      });
      const inside = (bind: Float32Array) => {
        for (let v = 0; v < bind.length; v += 3) {
          for (const { low, high } of boxes) {
            if (bind[v] >= low[0] && bind[v] <= high[0] && bind[v + 1] >= low[1] && bind[v + 1] <= high[1] &&
              bind[v + 2] >= low[2] && bind[v + 2] <= high[2]) return true;
          }
        }
        return false;
      };
      this.jewelCovers.set(slot, this.slots.filter((other) => other.part === "Cloth" && inside(other.bind)));
    }

    // Measured on the own shoes: the other styles' heels reach below it, which is what lifts her onto them.
    let floor = Infinity;
    for (const slot of this.slots) {
      if (!this.stands(slot, "")) continue;
      for (let i = 1; i < slot.bind.length; i += 3) floor = Math.min(floor, slot.bind[i]);
    }
    this.floor = floor;
  }

  /** Whether a mesh counts for where the feet are with these shoes on: anything but the other shoes. */
  private stands(slot: MeshSlot, shoes: string): boolean {
    return slot.part !== "Shoes" || shoeMeshOf(slot.mesh, this.body) === shoes;
  }

  /** The model's own material for a part and name, before any colour was put on. */
  original(part: MeshPart, name: string): Material | undefined {
    return this.slots.find((s) => s.part === part && s.original.name === name)?.original;
  }

  /**
   * How much thicker and longer the legs are under the current look, for a skirt to swing clear of them.
   * Takes the most each term grows anywhere along the bone, so the skirt errs on the side of clearing.
   */
  armSpread(): number {
    return armSpreadFor(this.look.sliders);
  }

  /** How her back arches, beyond her walk style's own posture. */
  posture(): Posture {
    return postureFor(this.look.sliders);
  }

  legSize(): LegSize {
    const active = activeTerms(this.body, this.look.sliders);
    const size = (label: string) => {
      let across = 1;
      let along = 1;
      for (const term of active.get(label) ?? []) {
        if (term.parts) continue;
        across *= 1 + Math.max(term.grow[0], term.grow[2]);
        along *= 1 + term.grow[1];
      }
      return { across, along };
    };
    return { thigh: size("Thigh_L"), shin: size("Shin_L") };
  }

  /**
   * Takes the clothes off (true) or puts them back on, to see the body while shaping it. The smallclothes come
   * off too, painted over in skin; the shoes stay on.
   */
  setUndressed(undressed: boolean): void {
    this.setDressing(undressed ? "nude" : "dressed");
  }

  /** Dressed as she is, down to her smallclothes, or bare but for her shoes, to see the body while shaping it. */
  setDressing(dressing: "dressed" | "underwear" | "nude"): void {
    this.undressed = dressing === "nude";
    this.underwear = dressing === "underwear";
    this.reshapeIfHeldChanged();
    this.showPieces();
  }

  /** How firmly what she has on holds her bust, out of 1 (BUST_HOLDS): the firmest piece she still has on. */
  private holds(): number {
    if (this.undressed || !this.look) return 0;
    const wearing = outfitOf(this.body, this.look).colors;
    let most = 0;
    for (const [id, hold] of Object.entries(BUST_HOLDS)) {
      const color = LOOK_OPTIONS[this.body].colors.find((c) => c.id === id);
      if (!color || !wearing.includes(id)) continue;
      const off = color.parts.every(([part, name]) => covers(this.stripped, part, name) || (this.underwear && part !== "Body"));
      // Her bra holds as firmly as its style does: pasties not at all, a balconette as her band.
      const style = id === "bra" ? underOf(this.body, this.look)?.top : undefined;
      if (!off) most = Math.max(most, hold * (style?.hold ?? 1));
    }
    return most;
  }

  /** Taking off or putting on what holds her bust lets it settle or lifts it again. */
  private reshapeIfHeldChanged(): void {
    if (this.look && this.holds() !== this.held) this.apply(this.look);
  }

  /**
   * Takes off the clothes with these colour ids (the wardrobe's garment ids), or puts everything back with none.
   * The shoes stay. Clothing comes off the clothing layer; the smallclothes are painted on the body, so taking
   * them off paints them over in the skin's colour instead.
   */
  /** Shows each part of her up to its stage (0 hides it), by section: "Mouth", "Face", "Breasts", "Body", "Pussy", "Ass", "Back", "Arms", "Hands". */
  setCoat(stages: Readonly<Record<string, number>>): void {
    this.coat = { ...stages };
    this.showPieces();
  }

  setStripped(ids: readonly string[]): void {
    this.stripped = LOOK_OPTIONS[this.body].colors
      .filter((color) => color.tab === "clothes" && ids.includes(color.id))
      .flatMap((color) => color.parts)
      .filter(([part]) => part !== "Shoes");
    this.reshapeIfHeldChanged();
    this.showPieces();
  }

  /** Puts a look on: reshapes the meshes, moves the joints to match, and recolours. Puts the bones at rest. */
  apply(look: Look): void {
    this.look = look;
    this.held = this.holds();
    const active = activeTerms(this.body, look.sliders, look.bustShape, this.held);

    // Where each joint goes: its parent's new place, plus its offset from the parent reshaped by the parent.
    const shift = new Map<BoneRest, Vector3>();
    const shiftOf = (rest: BoneRest): Vector3 => {
      const known = shift.get(rest);
      if (known) return known;
      let delta = new Vector3();
      if (rest.parent) {
        delta = shiftOf(rest.parent).clone();
        const parentTerms = active.get(rest.parent.label)?.filter((term) => !term.parts);
        if (parentTerms?.length) {
          const from = new Vector3().subVectors(rest.joint, rest.parent.joint);
          delta.add(reshape(parentTerms, from, new Vector3()).sub(from));
        }
      }
      shift.set(rest, delta);
      return delta;
    };
    for (const rest of this.bones) shiftOf(rest);

    // First every point's own move: the reshaping of each bone it follows, weighted as it is skinned, plus how
    // far its bones' joints move. `settled` is the joints' part, which the skinning adds by itself.
    const moves = this.slots.map((slot) => {
      const { mesh, bind } = slot;
      const count = bind.length / 3;
      const total = new Float32Array(count * 3);
      const settled = new Float32Array(count * 3);
      if (active.size === 0) return { total, settled };
      const skinIndex = mesh.geometry.getAttribute("skinIndex");
      const skinWeight = mesh.geometry.getAttribute("skinWeight");
      const bones = mesh.skeleton.bones.map((bone) => this.boneIndex.get(bone)!);
      // The terms that reach this mesh: those for every part, and those for its own.
      const reaching = new Map<string, ActiveTerm[]>();
      for (const [label, list] of active) {
        const mine = list.filter((term) => !term.parts || term.parts.includes(slot.part));
        if (mine.length) reaching.set(label, mine);
      }
      const sum = new Vector3();
      const joints = new Vector3();
      const from = slot.shapeFrom ?? bind;
      for (let v = 0; v < count; v++) {
        point.fromArray(from, v * 3);
        sum.set(0, 0, 0);
        joints.set(0, 0, 0);
        for (let k = 0; k < 4; k++) {
          const weight = skinWeight.getComponent(v, k);
          if (weight <= 0) continue;
          const rest = bones[skinIndex.getComponent(v, k)];
          if (!rest) continue;
          joints.addScaledVector(shift.get(rest)!, weight);
          const boneTerms = reaching.get(rest.label);
          if (!boneTerms) continue;
          offset.subVectors(point, rest.joint);
          sum.addScaledVector(reshape(boneTerms, offset, moved, weight).sub(offset), weight);
        }
        sum.add(joints).toArray(total, v * 3);
        joints.toArray(settled, v * 3);
      }
      return { total, settled };
    });

    // The body's moves, in one list, for the clothes to copy.
    const bodyMoves = new Float32Array(this.bodyCount * 3);
    this.slots.forEach((slot, i) => {
      if (slot.part === "Body") bodyMoves.set(moves[i].total, slot.bodyStart * 3);
    });
    this.slots.forEach((slot, i) => {
      if (slot.follow && active.size > 0) this.follow(slot.follow, moves[i].total.slice(), moves[i].total, bodyMoves);
    });
    if (this.cleavage && active.size > 0) {
      for (const [slot, span] of this.cleavage.spans) {
        spanCleavage(this.cleavage.hold, span, slot.bind, moves[this.slots.indexOf(slot)].total, bodyMoves);
      }
    }

    // Her nipple discs, shaped on the skin where the reshaping left it, and the clothes tenting over them.
    const nipples = this.nipples;
    let onSkin = new Float32Array(0);
    const flat = new Map<MeshSlot, Float32Array>();
    if (nipples) {
      const from = nipples.slot.shapeFrom!;
      const { total } = moves[this.slots.indexOf(nipples.slot)];
      onSkin = new Float32Array(from.length);
      for (let i = 0; i < from.length; i++) onSkin[i] = from[i] + total[i];
      for (const [slot, riders] of nipples.riders) {
        const own = moves[this.slots.indexOf(slot)].total;
        const before = new Float32Array(riders.verts.length * 3);
        riders.verts.forEach((v, k) => before.set(own.subarray(v * 3, v * 3 + 3), k * 3));
        flat.set(slot, before);
      }
      this.shapeNipples(onSkin, moves.map((m) => m.total), flat);
    }

    // Her vulva, likewise, shaped on the skin where the reshaping left it, and what lies over it rising over it.
    // Her anus too.
    const { vulva, anus } = this;
    const onSkinOf = (slot: MeshSlot) => {
      const { total } = moves[this.slots.indexOf(slot)];
      const on = new Float32Array(slot.bind.length);
      for (let i = 0; i < on.length; i++) on[i] = slot.bind[i] + total[i];
      return on;
    };
    this.vulvaShown = (vulva !== null || anus !== null || this.penis !== null) && !this.underwearOn().bottomOn;
    let vulvaSkin: Float32Array[] = [];
    const vulvaFlat = new Map<MeshSlot, Float32Array>();
    if (vulva) {
      vulvaSkin = vulva.slots.map(onSkinOf);
      for (const [slot, { riders }] of vulva.riders) {
        const own = moves[this.slots.indexOf(slot)].total;
        const before = new Float32Array(riders.verts.length * 3);
        riders.verts.forEach((v, k) => before.set(own.subarray(v * 3, v * 3 + 3), k * 3));
        vulvaFlat.set(slot, before);
      }
      this.shapeVulva(vulvaSkin, moves.map((m) => m.total), vulvaFlat);
    }
    const anusSkin = anus ? anus.slots.map(onSkinOf) : [];
    this.shapeAnus(anusSkin, moves.map((m) => m.total));
    // His penis likewise, from where its tube and sack lie on his skin.
    const penisSkin = this.penis ? this.penis.slots.map(onSkinOf) : [];
    this.shapePenis(penisSkin, moves.map((m) => m.total));

    // Longer or shorter legs would lift the feet off the floor or sink them into it, and heels reach below it: the
    // whole body moves to match, standing on the shoes she has on.
    const shoes = shoeMeshFor(this.body, look);
    let lowest = Infinity;
    for (const [i, slot] of this.slots.entries()) {
      if (!this.stands(slot, shoes)) continue;
      for (let y = 1; y < slot.bind.length; y += 3) lowest = Math.min(lowest, slot.bind[y] + moves[i].total[y]);
    }
    const lift = Number.isFinite(lowest) ? this.floor - lowest : 0;

    // The mesh keeps everything but the joints' moves, which the bones now carry. A pulled top's plan was worked
    // out on the old shape: it's worked out again below.
    this.pullPlans.clear();
    for (const [i, slot] of this.slots.entries()) {
      this.writePositions(slot, moves[i].total, moves[i].settled);
      slot.mesh.geometry.boundingBox = null;
      slot.mesh.geometry.boundingSphere = null;
    }
    // The nipples stand off the disc, so its faces need their own light.
    nipples?.slot.mesh.geometry.computeVertexNormals();
    for (const slot of [...(vulva?.slots ?? []), ...(anus?.slots ?? []), ...(this.penis?.slots ?? [])]) {
      slot.mesh.geometry.computeVertexNormals();
    }
    this.shaped = {
      totals: moves.map((m) => m.total), settled: moves.map((m) => m.settled), onSkin, flat, vulvaSkin, vulvaFlat, anusSkin,
      penisSkin,
    };
    if (this.pull) this.repull(this.pullSlots());
    this.refreshFace();

    for (const rest of this.bones) {
      const delta = shift.get(rest)!;
      const parentDelta = rest.parent ? shift.get(rest.parent)! : new Vector3(0, -lift, 0);
      rest.bone.position.copy(rest.position).add(delta).sub(parentDelta);
      rest.bone.quaternion.copy(rest.quaternion);
    }
    // Culling and picking use the skinned bounds, which follow the new shape and joints.
    this.bodyRoot.updateMatrixWorld(true);
    for (const slot of this.slots) {
      slot.mesh.skeleton.update();
      slot.mesh.computeBoundingBox();
      slot.mesh.computeBoundingSphere();
    }

    const heightDef = LOOK_OPTIONS[this.body].sliders.find((def) => def.height);
    const height = heightDef ? 1 + (heightDef.height ?? 0) * clampSlider(look.sliders[heightDef.id]) : 1;
    this.bodyRoot.scale.setScalar(height);

    const originals = (part: MeshPart, name: string) => this.original(part, name);
    for (const slot of this.slots) {
      slot.worn = materialFor(this.body, slot.part, slot.original, look.colors, originals);
      slot.mesh.material = slot.worn;
    }
    this.showPieces();
  }

  /**
   * Pulls her tops (the wardrobe's garment ids) down off her breasts or up over them, `amount` of the way (0 to 1),
   * as her hands do in a show pose (show.ts, 7e); null or 0 lets them back. With a `side`, only off that breast (her
   * own left or right). Only the pulled meshes change, so it can follow her hands from moment to moment.
   */
  setPull(pull: { ids: readonly string[]; dir: "down" | "up"; side?: "left" | "right" } | null, amount: number): void {
    const a = pull ? Math.min(1, Math.max(0, amount)) : 0;
    const next = pull && a > 0 ? { ids: [...pull.ids], dir: pull.dir, side: pull.side, amount: a } : null;
    const key = (p: { ids: readonly string[]; dir: string; side?: string } | null) => (p ? `${p.dir}:${p.side ?? ""}:${p.ids.join(",")}` : "");
    const now = this.pull;
    const same = key(next) === key(now);
    // Small steps aren't worth rewriting the cloth for, but the ends are.
    if (same && (!next || !now || (Math.abs(next.amount - now.amount) < 0.02 && (next.amount < 1 || now.amount === 1)))) return;
    const before = [...this.pullPlans.keys()];
    if (!same) this.pullPlans.clear();
    this.pull = next;
    const after = next ? this.pullSlots() : [];
    this.repull([...new Set([...before, ...after])]);
    this.showPieces();
  }

  /**
   * Puts an expression on her face (face.ts): her eyes, brows and the corners of her mouth move, and her cheeks
   * flush. Only her face's meshes change, so it can follow her from moment to moment. Only her face is built for it.
   */
  setExpression(shape: FaceShape): void {
    if (!faceMoved(shape, this.faceShape)) return;
    const lines = (f: FaceShape) => `${Math.round(f.blush * 10)}:${Math.round(f.press * 10)}:${this.faceLines(f).join(",")}`;
    const blushed = lines(shape) !== lines(this.faceShape);
    this.faceShape = { ...shape };
    this.refreshFace();
    if (blushed) this.showPieces();
  }

  /** Which of the lines an expression draws on her face show for this face: her creases, and a blush's strokes. */
  private faceLines(shape: FaceShape): string[] {
    const shown: string[] = [];
    if (shape.crease >= FACE_LINES.creases[0]) shown.push(CREASE_MATERIAL);
    if (shape.crease >= FACE_LINES.creases[1]) shown.push(CREASE_MID_MATERIAL);
    if (shape.blush >= FACE_LINES.hatch) shown.push(HATCH_MATERIAL);
    return shown;
  }

  /** The meshes her face is drawn in. */
  private faceSlots(): MeshSlot[] {
    return this.body === "Female" ? this.slots.filter((slot) => slot.part === "Body" && FACE_MATERIAL.test(slot.original.name)) : [];
  }

  /** Finds her eyes, brows and mouth on her as shaped now, and moves her face's points for her expression. */
  private refreshFace(): void {
    const { shaped } = this;
    const slots = this.faceSlots();
    if (!shaped || !slots.length) return;
    const shapedAt = (slot: MeshSlot, v: number) => {
      const total = shaped.totals[this.slots.indexOf(slot)];
      const { bind } = slot;
      return [bind[v * 3] + total[v * 3], bind[v * 3 + 1] + total[v * 3 + 1], bind[v * 3 + 2] + total[v * 3 + 2]];
    };
    const pointsOf = (names: readonly string[]) =>
      slots.filter((slot) => names.includes(slot.original.name)).flatMap((slot) => Array.from({ length: slot.bind.length / 3 }, (_, v) => shapedAt(slot, v)));
    if (this.faceRigOn !== shaped) {
      this.faceRig = faceRig(pointsOf([EYE_MATERIAL]), pointsOf([BROW_MATERIAL]), pointsOf(LIP_MATERIALS), pointsOf([TONGUE_MATERIAL]));
      this.faceRigOn = shaped;
    }
    const rig = this.faceRig;
    const to = [0, 0, 0];
    for (const slot of slots) {
      const count = slot.bind.length / 3;
      let moves = this.faceMoves.get(slot);
      if (!moves) this.faceMoves.set(slot, (moves = new Float32Array(count * 3)));
      moves.fill(0);
      const name = slot.original.name;
      const part = name === BROW_MATERIAL ? "brow" : name === UPPER_TEETH_MATERIAL ? "teeth" : name === TONGUE_MATERIAL ? "tongue" : "skin";
      if (rig) {
        for (let v = 0; v < count; v++) {
          const p = shapedAt(slot, v);
          if (!faceMove(rig, this.faceShape, p, part, to)) continue;
          moves[v * 3] = to[0] - p[0];
          moves[v * 3 + 1] = to[1] - p[1];
          moves[v * 3 + 2] = to[2] - p[2];
        }
      }
      const i = this.slots.indexOf(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i]);
    }
  }

  /** The cloth meshes the pull takes: the pulled garments', of the outfit she has on. */
  private pullSlots(): MeshSlot[] {
    const pull = this.pull;
    if (!pull) return [];
    const outfit = outfitOf(this.body, this.look).mesh;
    const parts = LOOK_OPTIONS[this.body].colors.filter((c) => pull.ids.includes(c.id)).flatMap((c) => c.parts);
    return this.slots.filter(
      (slot) => slot.part === "Cloth" && covers(parts, slot.part, slot.original.name) && outfitMeshOf(slot.mesh, this.body) === outfit,
    );
  }

  /** Rewrites these meshes where the pull has them now (planning any it's only now taking), or puts them back. */
  private repull(slots: readonly MeshSlot[]): void {
    const { shaped } = this;
    if (!shaped) return;
    const pulling = new Set(this.pullSlots());
    for (const slot of slots) {
      const i = this.slots.indexOf(slot);
      if (pulling.has(slot) && !this.pullPlans.has(slot)) this.pullPlans.set(slot, this.planPull(slot, shaped.totals));
      if (!pulling.has(slot)) this.pullPlans.delete(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i]);
      const geometry = slot.mesh.geometry;
      const normal = geometry.getAttribute("normal");
      if (!normal) continue;
      if (pulling.has(slot)) {
        if (!this.pullNormals.has(slot)) this.pullNormals.set(slot, Float32Array.from(normal.array as ArrayLike<number>));
        geometry.computeVertexNormals();
      } else {
        const built = this.pullNormals.get(slot);
        if (built) {
          (normal.array as Float32Array).set(built);
          normal.needsUpdate = true;
          this.pullNormals.delete(slot);
        }
      }
    }
  }

  /**
   * Where a pulled top's points go (PULL_* above), on the body as shaped now (`totals`, every mesh's moves). Down:
   * the cloth over her breasts and above them is dragged down under them, rolled up in a band on the cloth below,
   * the neckline outermost. Up: it's lifted up over them, rolled in a band on her chest above. All the way at the
   * front, less round her sides, and not at all at her back or on her arms, so the cloth there pulls on a slant. Off
   * just the one breast, the pull fades out across the middle of her chest, so the cloth there pulls on a slant too.
   */
  private planPull(slot: MeshSlot, totals: Float32Array[]): PullPlan {
    const dir = this.pull?.dir ?? "down";
    const side = this.pull?.side;
    const own = this.slots.indexOf(slot);
    const count = slot.bind.length / 3;
    const at = new Int32Array(count).fill(-1);
    const p = new Vector3();
    const shapedAt = (s: number, v: number) => {
      const { bind } = this.slots[s];
      return p.set(bind[v * 3] + totals[s][v * 3], bind[v * 3 + 1] + totals[s][v * 3 + 1], bind[v * 3 + 2] + totals[s][v * 3 + 2]);
    };
    const front = this.frontness(slot, own, totals);
    if (side) {
      const [from, to] = PULL_SIDE_BLEND;
      for (let v = 0; v < count; v++) {
        const t = Math.min(1, Math.max(0, (shapedAt(own, v).x * PULL_SIDE[side] - from) / (to - from)));
        front[v] *= t * t * (3 - 2 * t);
      }
    }

    // Down: the roll goes under her breasts, as low as their undersides are now. Up: over the top's upper edge.
    let low = Infinity;
    let high = -Infinity;
    for (let v = 0; v < count; v++) {
      if (front[v] < 0.5) continue;
      const y = shapedAt(own, v).y;
      low = Math.min(low, y);
      high = Math.max(high, y);
    }
    const cut = dir === "down" ? (this.creaseHeight(totals) ?? PULL_CREASE[1]) : low;

    // Which points are taken: down, those above the breasts' undersides; up, all of it at the front.
    const taken: number[] = [];
    for (let v = 0; v < count; v++) {
      if (front[v] <= 0 || shapedAt(own, v).y <= cut) continue;
      at[v] = taken.length;
      taken.push(v);
    }

    // What the roll lies on: down, this cloth where it isn't taken (under her breasts); up, her skin.
    const ground = new DepthGrid();
    if (dir === "down") {
      for (let v = 0; v < count; v++) if (at[v] < 0 && front[v] > 0.3) ground.add(shapedAt(own, v));
    } else {
      for (const [s, body] of this.slots.entries()) {
        if (body.part !== "Body" || PULL_SKIP_SKIN.includes(body.original.name)) continue;
        const skinFront = this.frontness(body, s, totals);
        for (let v = 0; v < skinFront.length; v++) if (skinFront[v] > 0.3) ground.add(shapedAt(s, v));
      }
    }

    const target = new Float32Array(taken.length * 3);
    const weight = new Float32Array(taken.length);
    const span = Math.max(0.01, high - cut);
    const { gap, height, narrow, thick } = PULL_ROLL;
    taken.forEach((v, k) => {
      const { x, y, z } = shapedAt(own, v);
      // How far through the pulled cloth the point is, from where the roll starts (0) to its far edge (1).
      const t = Math.min(1, Math.max(0, dir === "down" ? (y - cut) / span : (high - y) / span));
      const to = dir === "down" ? cut - gap - height * t : high + gap + height * t;
      const on = ground.frontAt(x, to) ?? z;
      // The roll stands off what it lies on, the far edge outermost, as rolled cloth does.
      target[k * 3] = x * (1 - narrow * t);
      target[k * 3 + 1] = to;
      target[k * 3 + 2] = on - thick[0] - (thick[1] - thick[0]) * t;
      weight[k] = front[v];
    });
    return { at, target, weight };
  }

  /**
   * How much of each point of a mesh the pull takes, 0 to 1: all of it facing forwards, easing off round the sides
   * to nothing at the back, and nothing on the arms or past her sides.
   */
  private frontness(slot: MeshSlot, index: number, totals: Float32Array[]): Float32Array {
    const count = slot.bind.length / 3;
    const out = new Float32Array(count);
    const skinIndex = slot.mesh.geometry.getAttribute("skinIndex");
    const skinWeight = slot.mesh.geometry.getAttribute("skinWeight");
    const arm = slot.mesh.skeleton.bones.map((bone) => /^(UpperArm|ForeArm)/.test(this.boneIndex.get(bone)?.label ?? ""));
    const total = totals[index];
    const { bind } = slot;
    for (let v = 0; v < count; v++) {
      const x = bind[v * 3] + total[v * 3];
      const y = bind[v * 3 + 1] + total[v * 3 + 1];
      const z = bind[v * 3 + 2] + total[v * 3 + 2];
      if (y < PULL_BAND[0] || y > PULL_BAND[1] || Math.abs(x) > PULL_HALF_WIDTH) continue;
      let onArm = 0;
      for (let k = 0; k < 4; k++) if (arm[skinIndex.getComponent(v, k)]) onArm += skinWeight.getComponent(v, k);
      // Forwards is -z: the share of the way round from her side (0) to straight ahead (1).
      const ahead = -(z + PULL_AXIS) / Math.max(1e-6, Math.hypot(x, z + PULL_AXIS));
      const t = Math.min(1, Math.max(0, (ahead - PULL_FRONT[0]) / (PULL_FRONT[1] - PULL_FRONT[0])));
      out[v] = t * t * (3 - 2 * t) * Math.max(0, 1 - onArm * 2);
    }
    return out;
  }

  /** How high the undersides of her breasts are as shaped now: the chest just under them as built, where it's gone. */
  private creaseHeight(totals: Float32Array[]): number | null {
    const [skinPart, skinName] = LOOK_OPTIONS[this.body].colors.find((color) => color.id === "skin")?.parts[0] ?? ["Body", ""];
    const s = this.slots.findIndex((slot) => slot.part === skinPart && slot.original.name === skinName);
    if (s < 0) return null;
    const { bind } = this.slots[s];
    const heights: number[] = [];
    for (const side of [-1, 1]) {
      let best = -1;
      for (let v = 0; v < bind.length / 3; v++) {
        const x = bind[v * 3];
        const y = bind[v * 3 + 1];
        const z = bind[v * 3 + 2];
        if (Math.abs(x - side * PULL_CREASE[0]) > 0.02 || Math.abs(y - PULL_CREASE[1]) > 0.012 || z > 0) continue;
        if (best < 0 || z < bind[best * 3 + 2]) best = v;
      }
      if (best >= 0) heights.push(bind[best * 3 + 1] + totals[s][best * 3 + 1]);
    }
    return heights.length ? heights.reduce((a, b) => a + b, 0) / heights.length : null;
  }

  /**
   * How aroused she is, from 0 to 1: her nipples stand and her areolae draw in and flush, and her vulva (`vulva`,
   * the same unless given) swells, parts and flushes. Only the discs, the grid and the points riding on them
   * change, so it can follow her from moment to moment.
   */
  setArousal(level: number, vulva = level): void {
    const a = Math.min(1, Math.max(0, level));
    const b = Math.min(1, Math.max(0, vulva));
    const moved = (to: number, from: number) => Math.abs(to - from) >= 0.02 || ((to === 0 || to === 1) && to !== from);
    const { nipples } = this;
    const nipplesMove = nipples !== null && moved(a, this.arousal);
    const vulvaMoves = this.vulva !== null && moved(b, this.vulvaArousal);
    if (!nipplesMove && !vulvaMoves) return;
    if (vulvaMoves) {
      this.vulvaArousal = b;
      this.refreshVulva();
    }
    if (!nipples || !nipplesMove) {
      this.showPieces();
      return;
    }
    this.arousal = a;
    const { shaped } = this;
    if (shaped) {
      this.shapeNipples(shaped.onSkin, shaped.totals, shaped.flat);
      const at = this.slots.indexOf(nipples.slot);
      this.writePositions(nipples.slot, shaped.totals[at], shaped.settled[at]);
      nipples.slot.mesh.geometry.computeVertexNormals();
      for (const [slot, riders] of nipples.riders) {
        const i = this.slots.indexOf(slot);
        this.writePositions(slot, shaped.totals[i], shaped.settled[i], riders.verts);
      }
    }
    this.showPieces();
  }

  /** Her vulva's shape from her look and how aroused she is; null for a body without one. */
  private vulvaShapeNow(): VulvaShape | null {
    const types = LOOK_OPTIONS[this.body].vulva;
    const type = types.find((t) => t.id === this.look.vulva) ?? types[0];
    if (!type) return null;
    const { sliders } = this.look;
    return vulvaShape(
      type, clampSlider(sliders.vulvaSize), clampSlider(sliders.vulvaFull), clampSlider(sliders.vulvaLips), this.vulvaArousal,
      this.vulvaOpen,
    );
  }

  /**
   * How open her vulva and her anus are, from 0 (closed) through 1 (fully open) to 2 (stretched as wide as they go,
   * VULVA_STRETCHED and ANUS_STRETCHED): the cut down her slit parts onto her canal, and her anus's rim widens onto
   * its own. Only their meshes change, so it can follow her moment to moment.
   */
  setOpening(vulva: number, anus: number): void {
    const v = Math.min(VULVA_STRETCHED, Math.max(0, vulva));
    const a = Math.min(ANUS_STRETCHED, Math.max(0, anus));
    const ends = [0, 1, VULVA_STRETCHED];
    const moved = (to: number, from: number) => Math.abs(to - from) >= 0.02 || (ends.includes(to) && to !== from);
    if (this.vulva && moved(v, this.vulvaOpen)) {
      this.vulvaOpen = v;
      this.refreshVulva();
    }
    if (this.anus && moved(a, this.anusOpen)) {
      this.anusOpen = a;
      this.refreshAnus();
    }
  }

  /**
   * Shapes her anus's disc from where its meshes lie on the skin (`skin`) into `totals`, every mesh's moves. Hidden,
   * it lies closed.
   */
  private shapeAnus(skin: Float32Array[], totals: Float32Array[]): void {
    const { anus } = this;
    const types = LOOK_OPTIONS[this.body].anus;
    const type = types.find((t) => t.id === this.look.anus) ?? types[0];
    if (!anus || !type) return;
    const shape = anusShape(type, clampSlider(this.look.sliders.anusSize), this.vulvaShown ? this.anusOpen : 0);
    const out = anus.slots.map((slot) => new Float32Array(slot.bind.length));
    shapeAnus(anus.patch, skin, shape, out);
    anus.slots.forEach((slot, m) => {
      const total = totals[this.slots.indexOf(slot)];
      for (let i = 0; i < slot.bind.length; i++) total[i] = out[m][i] - slot.bind[i];
    });
  }

  /**
   * How hard he is, from 0 (soft) to 1: his penis grows, thickens and stands, its foreskin drawing back, and his
   * scrotum draws up. Only their meshes change, so it can follow him moment to moment.
   */
  setErection(level: number): void {
    const e = Math.min(1, Math.max(0, level));
    const moved = Math.abs(e - this.erection) >= 0.02 || ((e === 0 || e === 1) && e !== this.erection);
    if (!this.penis || !moved) return;
    this.erection = e;
    this.refreshPenis();
    this.showPieces();
  }

  /**
   * What covers his groin now, if anything: the nearest piece of clothing over it he has on, or else his
   * smallclothes. His penis lies packed in it, a bulge in its cloth.
   */
  private penisCover(): MeshSlot | null {
    const { penis } = this;
    if (!penis) return null;
    if (!this.undressed && !this.underwear) {
      const outfit = outfitOf(this.body, this.look).mesh;
      const pieces = LOOK_OPTIONS[this.body].pieces.filter((piece) => this.look.hidden.includes(piece.id));
      const on = penis.groin.find(
        (slot) =>
          outfitMeshOf(slot.mesh, this.body) === outfit &&
          !covers(this.stripped, slot.part, slot.original.name) &&
          !pieces.some((piece) => covers(piece.parts, slot.part, slot.original.name)),
      );
      if (on) return on;
    }
    if (!this.underwearOn().bottomOn) return null;
    return this.slots.find((slot) => slot.part === "Body" && slot.original.name === "T_smalls") ?? null;
  }

  /** Shapes his penis's tube and sack from where their meshes lie on the skin (`skin`) into `totals`. */
  private shapePenis(skin: Float32Array[], totals: Float32Array[]): void {
    const { penis } = this;
    this.penisPacked = this.penisCover() !== null;
    const types = LOOK_OPTIONS[this.body].penis;
    const type = types.find((t) => t.id === this.look.penis) ?? types[0];
    if (!penis || !type) return;
    const { sliders } = this.look;
    const shape = penisShape(
      type, clampSlider(sliders.penisLength), clampSlider(sliders.penisGirth), clampSlider(sliders.penisHead),
      clampSlider(sliders.penisSkin), clampSlider(sliders.ballsSize), clampSlider(sliders.ballsHang), this.erection,
      this.penisPacked ? 1 : 0,
    );
    const out = penis.slots.map((slot) => new Float32Array(slot.bind.length));
    shapePenis(penis.patch, skin, shape, out);
    penis.slots.forEach((slot, m) => {
      const total = totals[this.slots.indexOf(slot)];
      for (let i = 0; i < slot.bind.length; i++) total[i] = out[m][i] - slot.bind[i];
    });
  }

  /** Reshapes his penis alone, from what the last look left. */
  private refreshPenis(): void {
    const { penis, shaped } = this;
    if (!penis || !shaped) return;
    this.shapePenis(shaped.penisSkin, shaped.totals);
    for (const slot of penis.slots) {
      const i = this.slots.indexOf(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i]);
      slot.mesh.geometry.computeVertexNormals();
    }
  }

  /** Reshapes her anus alone, from what the last look left. */
  private refreshAnus(): void {
    const { anus, shaped } = this;
    if (!anus || !shaped) return;
    this.shapeAnus(shaped.anusSkin, shaped.totals);
    for (const slot of anus.slots) {
      const i = this.slots.indexOf(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i]);
      slot.mesh.geometry.computeVertexNormals();
    }
  }

  /**
   * Shapes her vulva's grid from where its meshes lie on the skin (`skin`, in the model's space) into `totals`,
   * every mesh's moves, and lifts what lies over it: each rider goes from its move before rising (`flat`) out from
   * the skin as far as the shape stands under it. Hidden, the grid lies flat and nothing rises.
   */
  private shapeVulva(skin: Float32Array[], totals: Float32Array[], flat: Map<MeshSlot, Float32Array>): void {
    const { vulva } = this;
    if (!vulva) return;
    const shape = this.vulvaShown ? this.vulvaShapeNow() : null;
    const out = vulva.slots.map((slot) => new Float32Array(slot.bind.length));
    const frame = shapeVulva(vulva.patch, skin, shape, out);
    vulva.slots.forEach((slot, m) => {
      const total = totals[this.slots.indexOf(slot)];
      for (let i = 0; i < slot.bind.length; i++) total[i] = out[m][i] - slot.bind[i];
    });
    for (const [slot, { riders, over, rigid }] of vulva.riders) {
      const own = totals[this.slots.indexOf(slot)];
      const before = flat.get(slot)!;
      const rise = rideVulva(riders, frame, shape, over);
      // A ring through her hood rises as one, by the shape's rise under it on average, so it keeps its round.
      if (rigid && riders.verts.length) {
        const mean = [0, 0, 0];
        for (let k = 0; k < riders.verts.length; k++) for (let axis = 0; axis < 3; axis++) mean[axis] += rise[k * 3 + axis];
        for (let k = 0; k < riders.verts.length; k++) {
          for (let axis = 0; axis < 3; axis++) rise[k * 3 + axis] = mean[axis] / riders.verts.length;
        }
      }
      riders.verts.forEach((v, k) => {
        for (let axis = 0; axis < 3; axis++) own[v * 3 + axis] = before[k * 3 + axis] + rise[k * 3 + axis];
      });
    }
  }

  /** Reshapes her vulva and its riders alone, from what the last look left: for her arousal, or her undressing. */
  private refreshVulva(): void {
    const { vulva, shaped } = this;
    if (!vulva || !shaped) return;
    this.shapeVulva(shaped.vulvaSkin, shaped.totals, shaped.vulvaFlat);
    for (const slot of vulva.slots) {
      const i = this.slots.indexOf(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i]);
      slot.mesh.geometry.computeVertexNormals();
    }
    for (const [slot, { riders }] of vulva.riders) {
      const i = this.slots.indexOf(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i], riders.verts);
    }
  }

  /**
   * Shapes her nipple discs from where they lie on the skin (`onSkin`, in the model's space) into `totals`, every
   * mesh's moves, and tents the clothes over them: each rider goes from its move before tenting (`flat`) out along
   * its disc's normal, as far as the nipple stands at its distance from the tip.
   */
  private shapeNipples(onSkin: Float32Array, totals: Float32Array[], flat: Map<MeshSlot, Float32Array>): void {
    const { nipples } = this;
    const types = LOOK_OPTIONS[this.body].nipples;
    const type = types.find((t) => t.id === this.look.nipples) ?? types[0];
    if (!nipples || !type) return;
    const { sliders } = this.look;
    const profile = nippleProfile(type, clampSlider(sliders.nippleSize), clampSlider(sliders.areolaSize), this.arousal);
    const { bind } = nipples.slot;
    const total = totals[this.slots.indexOf(nipples.slot)];
    const shaped = onSkin.slice();
    const frames = nipples.discs.map((disc) => shapeDisc(disc, onSkin, profile, shaped));
    for (let i = 0; i < bind.length; i++) total[i] = shaped[i] - bind[i];
    for (const [slot, riders] of nipples.riders) {
      const own = totals[this.slots.indexOf(slot)];
      const before = flat.get(slot)!;
      riders.verts.forEach((v, k) => {
        const { normal: [nx, ny, nz], lift } = frames[riders.disc[k]];
        // The clothes clear the disc's own lift too, over the areola and fading out a little past it.
        const t = Math.min(1, riders.r[k] / (profile[profile.length - 1].r * 1.3 + 0.004));
        // A ring goes through the nipple partway out from its foot, and moves out as one with it.
        const h = riders.rigid
          ? lift + Math.max(0, profile[0].h) * NIPPLE_PIERCE
          : tentHeight(profile, riders.r[k]) + lift * (1 - t * t * (3 - 2 * t));
        own[v * 3] = before[k * 3] + nx * h;
        own[v * 3 + 1] = before[k * 3 + 1] + ny * h;
        own[v * 3 + 2] = before[k * 3 + 2] + nz * h;
      });
    }
  }

  /**
   * Moves a mesh's points onto the body under them, by its table of the body points nearest each, from `own`, the
   * moves their own bones gave them, into `total`. Close to the body they follow it fully; further out they keep
   * more of their own.
   */
  private follow(follow: FollowTable, own: Float32Array, total: Float32Array, bodyMoves: Float32Array): void {
    for (let v = 0; v < total.length / 3; v++) {
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < FOLLOW_POINTS; k++) {
        const at = follow.points[v * FOLLOW_POINTS + k] * 3;
        const weight = follow.weights[v * FOLLOW_POINTS + k];
        x += bodyMoves[at] * weight;
        y += bodyMoves[at + 1] * weight;
        z += bodyMoves[at + 2] * weight;
      }
      const keep = follow.own[v];
      total[v * 3] = x + (own[v * 3] - x) * keep;
      total[v * 3 + 1] = y + (own[v * 3 + 1] - y) * keep;
      total[v * 3 + 2] = z + (own[v * 3 + 2] - z) * keep;
    }
  }

  /** Puts a mesh's points where their moves take them, less the joints' part, which the bones carry. */
  private writePositions(slot: MeshSlot, total: Float32Array, settled: Float32Array, only?: Int32Array): void {
    const { bind } = slot;
    const position = slot.mesh.geometry.getAttribute("position");
    const inverse = unbind.copy(slot.mesh.bindMatrix).invert();
    // A top pulled off her breasts: its points go that far towards where the pull takes them.
    const plan = this.pull ? this.pullPlans.get(slot) : undefined;
    const amount = this.pull?.amount ?? 0;
    const face = this.faceMoves.get(slot);
    const one = (v: number) => {
      point.set(bind[v * 3] + total[v * 3], bind[v * 3 + 1] + total[v * 3 + 1], bind[v * 3 + 2] + total[v * 3 + 2]);
      const k = plan ? plan.at[v] : -1;
      if (plan && k >= 0) {
        const w = plan.weight[k] * amount;
        point.x += (plan.target[k * 3] - point.x) * w;
        point.y += (plan.target[k * 3 + 1] - point.y) * w;
        point.z += (plan.target[k * 3 + 2] - point.z) * w;
      }
      // Her face, as her expression moves it.
      if (face) {
        point.x += face[v * 3];
        point.y += face[v * 3 + 1];
        point.z += face[v * 3 + 2];
      }
      point.x -= settled[v * 3];
      point.y -= settled[v * 3 + 1];
      point.z -= settled[v * 3 + 2];
      point.applyMatrix4(inverse);
      position.setXYZ(v, point.x, point.y, point.z);
    };
    if (only) for (const v of only) one(v);
    else for (let v = 0; v < position.count; v++) one(v);
    position.needsUpdate = true;
  }

  /**
   * What her nipple discs wear: her breast band while she has it on, so only their shape shows through, and
   * otherwise their own colour, flushed darker as she's aroused.
   */
  private discMaterial(slot: MeshSlot): Material {
    const band = this.slots.find((s) => s.part === "Body" && s.original.name === BAND_MATERIAL);
    // Under a bra that covers them they wear its colour too; pasties are drawn over them, so they do as well.
    if (band && this.underwearOn().nipplesCovered) return band.worn;
    const flush = Math.round(this.arousal * 5) / 5;
    if (flush === 0) return slot.worn;
    return paint(slot.original, averageColor(slot.worn).clone().lerp(FLUSHED, 0.22 * flush));
  }

  /**
   * Her underwear as it is now: whether her top and her briefs are on (a one-piece is on or off as one), which of
   * them are drawn on the patch rather than painted on her body, and whether her nipples are covered.
   */
  private underwearOn(): { topOn: boolean; bottomOn: boolean; top: UnderStyle | null; bottom: UnderStyle | null; whole: boolean; nipplesCovered: boolean } {
    const topOn = !this.undressed && !covers(this.stripped, "Body", BAND_MATERIAL);
    const under = underOf(this.body, this.look);
    if (!under) {
      const bottomOn = !this.undressed && !covers(this.stripped, "Body", "T_smalls");
      return { topOn, bottomOn, top: null, bottom: null, whole: false, nipplesCovered: topOn };
    }
    const whole = under.bottom === null;
    const bottomOn = whole ? topOn : !this.undressed && !covers(this.stripped, "Body", "T_smalls");
    const top = under.top.front ? under.top : null;
    const bottom = under.bottom?.front ? under.bottom : null;
    return { topOn, bottomOn, top, bottom, whole, nipplesCovered: topOn && (!top || coversNipples(top)) };
  }

  /**
   * Shows each mesh unless its piece is taken off or stripped, it's clothing while undressed, or it's another
   * hairstyle or another outfit. Stripped parts of the body itself stay, in the skin's colour.
   */
  private showPieces(): void {
    const pieces = LOOK_OPTIONS[this.body].pieces.filter((piece) => this.look.hidden.includes(piece.id));
    const hair = hairMeshFor(this.body, this.look);
    const outfit = outfitOf(this.body, this.look).mesh;
    const [skinPart, skinName] = LOOK_OPTIONS[this.body].colors.find((color) => color.id === "skin")?.parts[0] ?? ["Body", ""];
    const skin = this.slots.find((s) => s.part === skinPart && s.original.name === skinName);
    // Clothing painted on the body itself (the smallclothes), which comes off with the rest when undressed.
    const painted = LOOK_OPTIONS[this.body].colors
      .filter((color) => color.tab === "clothes")
      .flatMap((color) => color.parts)
      .filter(([part]) => part === "Body");
    const legwear = legwearOf(this.body, this.look);
    // Undressed or down to her smallclothes, her stockings are off too, feet and all.
    const stockingsOff = this.undressed || this.underwear || covers(this.stripped, "Cloth", HOSE_BANDS[0]);
    const shoes = shoeMeshFor(this.body, this.look);
    const under = this.underwearOn();
    // Her vulva shows once nothing covers it; it rises from the skin as it shows and lies flat again as it's covered.
    // Her anus likewise.
    const vulvaShown = (this.vulva !== null || this.anus !== null || this.penis !== null) && !under.bottomOn;
    // Putting on or taking off what covers his groin packs his penis in it or frees it.
    const cover = this.penisCover();
    if ((cover !== null) !== this.penisPacked) this.refreshPenis();
    if (vulvaShown !== this.vulvaShown) {
      this.vulvaShown = vulvaShown;
      this.refreshVulva();
      this.refreshAnus();
    }
    for (const slot of this.slots) {
      if (slot.part === "Cum" || slot.part === "Jewel") continue;
      // Only the shoes she has on; never undressed, as nothing is modelled under them.
      if (slot.part === "Shoes" && shoeMeshOf(slot.mesh, this.body) !== shoes) {
        slot.mesh.visible = false;
        continue;
      }
      // The legwear's bands show as far as its style reaches; a sock cuff it doesn't have is painted over in skin.
      const legs = legwearSlot(legwear, slot.part, slot.original.name, stockingsOff);
      if (legs === "skin") {
        slot.mesh.material = skin ? skin.worn : slot.worn;
        slot.mesh.visible = true;
        continue;
      }
      if (slot.part === "Shoes") slot.mesh.material = slot.worn;
      const stripped = covers(this.stripped, slot.part, slot.original.name);
      if (slot === this.nipples?.slot) {
        slot.mesh.material = this.discMaterial(slot);
        continue;
      }
      if (this.penis?.slots.includes(slot)) {
        // Covered, it shows packed in what covers it, in that cloth; bare, as it is.
        if (cover) {
          slot.mesh.visible = true;
          slot.mesh.material = cover.worn;
          continue;
        }
        slot.mesh.visible = vulvaShown;
        // The glans flushes darker as he hardens; the rest keeps its own colour.
        const flush = Math.round(this.erection * 5) / 5;
        const glans = slot.original.name === GLANS_MATERIAL && flush > 0;
        slot.mesh.material = glans ? paint(slot.original, averageColor(slot.worn).clone().lerp(FLUSHED, 0.2 * flush)) : slot.worn;
        continue;
      }
      if (this.vulva?.slots.includes(slot) || this.anus?.slots.includes(slot)) {
        slot.mesh.visible = vulvaShown;
        // The slit and canal flush darker as she's aroused, like her areolae; the rest keeps its own colour.
        const flush = Math.round(this.vulvaArousal * 5) / 5;
        const inner = (slot.original.name === VULVA_MATERIAL || slot.original.name === CANAL_MATERIAL) && flush > 0;
        slot.mesh.material = inner ? paint(slot.original, averageColor(slot.worn).clone().lerp(FLUSHED, 0.25 * flush)) : slot.worn;
        continue;
      }
      // The skin under her openings gives way to them while they show; otherwise it's painted like the skin around.
      if (slot.part === "Body" && slot.original.name === HOLE_MATERIAL) slot.mesh.visible = !vulvaShown;
      if (slot.part === "Body" && slot.original.name === PUBIC_MATERIAL) {
        // Only bare: under her smallclothes, or with none to show, it stays hidden.
        const style = pubicStyle(this.look.pubes);
        slot.mesh.visible = !under.bottomOn && style.shape !== null;
        if (slot.mesh.visible) slot.mesh.material = pubicMaterial(slot.worn, style, clampSlider(this.look.sliders.pubesSize));
        continue;
      }
      if (slot.part === "Body" && slot.original.name === LINGERIE_MATERIAL) {
        // Whatever styles she has on that aren't painted on her body, in their swatches' colours.
        const top = under.topOn ? under.top : null;
        const bottom = under.bottomOn ? under.bottom : null;
        slot.mesh.visible = top !== null || bottom !== null;
        const colorOf = (name: string) => {
          const painted = this.slots.find((s) => s.part === "Body" && s.original.name === name);
          return painted ? averageColor(painted.worn) : new Color(1, 1, 1);
        };
        if (slot.mesh.visible) slot.mesh.material = lingerieMaterial(top, bottom, colorOf(BAND_MATERIAL), colorOf("T_smalls"));
        continue;
      }
      // The lines an expression draws on her face show only while it does.
      if (slot.part === "Body" && [CREASE_MATERIAL, CREASE_MID_MATERIAL, HATCH_MATERIAL].includes(slot.original.name)) {
        slot.mesh.visible = this.faceLines(this.faceShape).includes(slot.original.name);
        continue;
      }
      if (slot.part === "Body") {
        // Her band and braies give way to the styles drawn instead of them; a one-piece takes the braies' place too.
        const drawnOver =
          (slot.original.name === BAND_MATERIAL && under.top !== null) ||
          ((slot.original.name === "T_smalls" || slot.original.name === HOLE_MATERIAL) && (under.whole || under.bottom !== null));
        const bare = stripped || drawnOver || (this.undressed && covers(painted, slot.part, slot.original.name));
        // Her face flushes as she blushes, the red spreading the deeper it goes.
        const blush = Math.round(this.faceShape.blush * 10) / 10;
        const toneOf = (face: MeshSlot) => {
          const spread = this.body === "Female" ? BLUSH_SPREAD[face.original.name] : undefined;
          const flushed = spread ? spread.depth * Math.max(0, (blush - spread.from) / (1 - spread.from)) : 0;
          return flushed > 0 ? averageColor(face.worn).clone().lerp(BLUSHED, flushed) : null;
        };
        // Her lips pressed thin: the upper one an ink line, the lower one gone into her skin.
        const press = this.body === "Female" ? Math.round(this.faceShape.press * 10) / 10 : 0;
        const into = PRESSED_INTO[slot.original.name as keyof typeof PRESSED_INTO];
        let tone = toneOf(slot);
        if (press > 0 && into) {
          const [toward, most] = into;
          const round = this.slots.find((s) => s.part === "Body" && s.original.name === toward);
          const target = toward === "line" ? PRESSED_LINE : round ? (toneOf(round) ?? averageColor(round.worn)) : null;
          if (target) tone = (tone ?? averageColor(slot.worn).clone()).lerp(target, press * most);
        }
        slot.mesh.material = bare && skin ? skin.worn : tone ? paint(slot.original, tone) : slot.worn;
        continue;
      }
      const off = pieces.some((piece) => covers(piece.parts, slot.part, slot.original.name)) || stripped || legs === "hide";
      const otherStyle =
        (slot.part === "Hair" && hairMeshOf(slot.mesh, this.body) !== hair) ||
        (slot.part === "Cloth" && outfitMeshOf(slot.mesh, this.body) !== outfit);
      slot.mesh.visible = !off && !otherStyle && !((this.undressed || this.underwear) && slot.part === "Cloth");
      if (slot.part === "Cloth" || slot.part === "Shoes") coverCoat(slot.mesh.material as Material);
    }
    // Her jewellery, once she has it on. A piercing shows only while she's bare there: no clothes over it, nor her
    // bra over her nipples, her one-piece over her belly or her briefs over her groin.
    const jewellery = jewelleryOf(this.body, this.look);
    for (const slot of this.slots) {
      if (slot.part !== "Jewel") continue;
      const def = jewelOf(slot.mesh, this.body);
      const bare =
        !def?.bare ||
        ((def.bare === "chest" ? !under.nipplesCovered : def.bare === "belly" ? !(under.whole && under.topOn) : vulvaShown) &&
          !(this.jewelCovers.get(slot) ?? []).some((cloth) => cloth.mesh.visible && !this.pullPlans.has(cloth)));
      slot.mesh.visible = def !== null && jewellery.includes(def.id) && bare;
    }
    // What's on her skin shows by its stage; what landed on her clothes shows too, while she has that piece on.
    const worn = new Set<string>();
    for (const slot of this.slots) {
      if (slot.part === "Cloth" && slot.mesh.visible) worn.add(`${outfitMeshOf(slot.mesh, this.body)}:${slot.original.name}`);
    }
    for (const slot of this.slots) {
      if (slot.part !== "Cum") continue;
      const stain = stainMeshOf(slot.mesh, this.body);
      const at = stain ?? coatMeshOf(slot.mesh, this.body);
      const reached = at !== null && (this.coat[at.section] ?? 0) >= at.stage;
      slot.mesh.visible = reached && (!stain || worn.has(`${stain.outfit}:${stain.material}`));
    }
  }
}

/** Body points put out of reach (nipple discs, the pubic patch and so on are moved to 1e6): never followed. */
const OUT_OF_REACH = 1e5;
/** About how many body points each cell of the search grid would hold if they filled its box. They lie on a surface, so the cells they're in hold more. */
const POINTS_PER_CELL = 1;
/** The most cells the search grid may have, whatever the body. */
const MAX_CELLS = 1 << 21;

/**
 * Puts (d, b) among the FOLLOW_POINTS nearest so far, kept in order by distance and then by index. Ties go to the
 * lower index, so the result is the same whatever order the points are looked at in.
 */
function considerNearest(best: Float64Array, bestAt: Int32Array, d: number, b: number): void {
  const last = FOLLOW_POINTS - 1;
  if (d > best[last] || (d === best[last] && b >= bestAt[last])) return;
  let k = last;
  while (k > 0 && (best[k - 1] > d || (best[k - 1] === d && bestAt[k - 1] > b))) {
    best[k] = best[k - 1];
    bestAt[k] = bestAt[k - 1];
    k--;
  }
  best[k] = d;
  bestAt[k] = b;
}

/** The body points sorted into a grid of cubes, so a search only looks at the cubes near it. */
interface BodyGrid {
  min: [number, number, number];
  size: number;
  n: [number, number, number];
  /** Where each cell's points start in `items`; the cell after it marks the end. */
  start: Int32Array;
  items: Int32Array;
}

/** Each body's grid, built once: every clothing mesh searches the same body points. */
const bodyGrids = new WeakMap<Float32Array, BodyGrid | null>();

function bodyGrid(body: Float32Array): BodyGrid | null {
  if (bodyGrids.has(body)) return bodyGrids.get(body)!;
  const grid = buildBodyGrid(body);
  bodyGrids.set(body, grid);
  return grid;
}

function buildBodyGrid(body: Float32Array): BodyGrid | null {
  const count = body.length / 3;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  let real = 0;
  for (let b = 0; b < count; b++) {
    if (Math.abs(body[b * 3]) >= OUT_OF_REACH) continue;
    real++;
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], body[b * 3 + a]);
      max[a] = Math.max(max[a], body[b * 3 + a]);
    }
  }
  if (real < FOLLOW_POINTS) return null;
  const extent = [0, 1, 2].map((a) => Math.max(max[a] - min[a], 1e-3));
  let size = Math.cbrt((extent[0] * extent[1] * extent[2] * POINTS_PER_CELL) / real);
  const cellsAt = (s: number) => extent.map((e) => Math.max(1, Math.ceil(e / s) + 1)) as [number, number, number];
  let n = cellsAt(size);
  while (n[0] * n[1] * n[2] > MAX_CELLS) n = cellsAt((size *= 1.5));
  const cellOf = (b: number) => {
    const at = [0, 1, 2].map((a) => Math.min(n[a] - 1, Math.max(0, Math.floor((body[b * 3 + a] - min[a]) / size))));
    return (at[2] * n[1] + at[1]) * n[0] + at[0];
  };
  const start = new Int32Array(n[0] * n[1] * n[2] + 1);
  const cells = new Int32Array(count).fill(-1);
  for (let b = 0; b < count; b++) {
    if (Math.abs(body[b * 3]) >= OUT_OF_REACH) continue;
    cells[b] = cellOf(b);
    start[cells[b] + 1]++;
  }
  for (let c = 0; c < start.length - 1; c++) start[c + 1] += start[c];
  const fill = start.slice(0, -1);
  const items = new Int32Array(real);
  // In index order, so each cell lists its points lowest first.
  for (let b = 0; b < count; b++) if (cells[b] >= 0) items[fill[cells[b]]++] = b;
  return { min, size, n, start, items };
}

/** Checks one cell's body points against (x, y, z). */
function lookInCell(grid: BodyGrid, body: Float32Array, cell: number, x: number, y: number, z: number, best: Float64Array, bestAt: Int32Array): void {
  const { start, items } = grid;
  for (let i = start[cell], end = start[cell + 1]; i < end; i++) {
    const b = items[i];
    const dx = body[b * 3] - x, dy = body[b * 3 + 1] - y, dz = body[b * 3 + 2] - z;
    considerNearest(best, bestAt, dx * dx + dy * dy + dz * dz, b);
  }
}

/**
 * The FOLLOW_POINTS nearest body points to (x, y, z), into `best` and `bestAt`: the cells around it, ring by ring
 * outwards, until no cell further out could hold anything nearer than the furthest kept.
 */
function gridNearest(grid: BodyGrid, body: Float32Array, x: number, y: number, z: number, best: Float64Array, bestAt: Int32Array): void {
  const { min, size, n } = grid;
  const nx = n[0], ny = n[1], nz = n[2];
  const cx = Math.floor((x - min[0]) / size), cy = Math.floor((y - min[1]) / size), cz = Math.floor((z - min[2]) / size);
  // Rings past this one hold no cells at all.
  const lastRing = Math.max(Math.abs(cx), Math.abs(nx - 1 - cx), Math.abs(cy), Math.abs(ny - 1 - cy), Math.abs(cz), Math.abs(nz - 1 - cz));
  for (let r = 0; r <= lastRing; r++) {
    // Only the cells of this ring that lie inside the grid.
    const z0 = Math.max(0, cz - r), z1 = Math.min(nz - 1, cz + r);
    const y0 = Math.max(0, cy - r), y1 = Math.min(ny - 1, cy + r);
    const x0 = Math.max(0, cx - r), x1 = Math.min(nx - 1, cx + r);
    for (let gz = z0; gz <= z1; gz++) {
      const zEdge = gz === cz - r || gz === cz + r;
      for (let gy = y0; gy <= y1; gy++) {
        const row = (gz * ny + gy) * nx;
        if (zEdge || gy === cy - r || gy === cy + r) {
          for (let gx = x0; gx <= x1; gx++) lookInCell(grid, body, row + gx, x, y, z, best, bestAt);
        } else {
          if (cx - r >= 0 && cx - r < nx) lookInCell(grid, body, row + cx - r, x, y, z, best, bestAt);
          if (r > 0 && cx + r >= 0 && cx + r < nx) lookInCell(grid, body, row + cx + r, x, y, z, best, bestAt);
        }
      }
    }
    // Anything not yet looked at lies outside the block of cells searched so far: done once the furthest kept is
    // nearer than the block's nearest face. (A hair under, so rounding can't put a point inside it.)
    const reach =
      Math.min(
        x - (min[0] + (cx - r) * size), min[0] + (cx + r + 1) * size - x,
        y - (min[1] + (cy - r) * size), min[1] + (cy + r + 1) * size - y,
        z - (min[2] + (cz - r) * size), min[2] + (cz + r + 1) * size - z,
      ) - 1e-6;
    if (reach > 0 && best[FOLLOW_POINTS - 1] < reach * reach) return;
  }
}

/**
 * For each of `points`, the nearest body points, weighted by closeness, and how much it keeps its own move.
 * The body points go into a grid first, so each point only searches near itself rather than the whole body: the
 * same nearest points as checking every one (ties to the lower index), in a fraction of the time.
 */
export function nearestBody(points: Float32Array, body: Float32Array): FollowTable {
  const count = points.length / 3;
  const bodyCount = body.length / 3;
  const found = new Int32Array(count * FOLLOW_POINTS);
  const weights = new Float32Array(count * FOLLOW_POINTS);
  const own = new Float32Array(count);
  const best = new Float64Array(FOLLOW_POINTS);
  const bestAt = new Int32Array(FOLLOW_POINTS);
  const grid = bodyGrid(body);
  for (let v = 0; v < count; v++) {
    const x = points[v * 3], y = points[v * 3 + 1], z = points[v * 3 + 2];
    best.fill(Infinity);
    bestAt.fill(0);
    if (grid) gridNearest(grid, body, x, y, z, best, bestAt);
    else {
      // Too few body points to be worth a grid: check every one.
      for (let b = 0; b < bodyCount; b++) {
        const dx = body[b * 3] - x, dy = body[b * 3 + 1] - y, dz = body[b * 3 + 2] - z;
        considerNearest(best, bestAt, dx * dx + dy * dy + dz * dz, b);
      }
    }
    let sum = 0;
    for (let k = 0; k < FOLLOW_POINTS; k++) {
      const weight = 1 / (Math.sqrt(best[k]) + 0.005) ** 2;
      found[v * FOLLOW_POINTS + k] = bestAt[k];
      weights[v * FOLLOW_POINTS + k] = weight;
      sum += weight;
    }
    for (let k = 0; k < FOLLOW_POINTS; k++) weights[v * FOLLOW_POINTS + k] /= sum;
    const nearest = Math.sqrt(best[0]);
    own[v] = Math.min(1, Math.max(0, (nearest - FOLLOW_NEAR) / (FOLLOW_FAR - FOLLOW_NEAR)));
  }
  return { points: found, weights, own };
}

/**
 * How far the arms should hang out from the sides for these sliders, in radians. The arms hang a little
 * behind the hips, so wider hips, a fuller build and a bigger rear would otherwise grow into the hands.
 */
export function armSpreadFor(sliders: Record<string, number>): number {
  // A bust past Q pushes the arms out further still, by as much again for each cup.
  const more = (id: string) => Math.max(0, clampSlider(sliders[id], id === "bust" ? CUP_TOP : 1));
  return ARM_SPREAD.reduce((sum, [id, amount]) => sum + more(id) * amount, 0);
}
/** How her Posture sliders set her stance, in radians, for her body's pose (Body.refreshRest in player.ts). */
export interface Posture {
  /**
   * How far the Lower back arch slider moves her pelvis's forward tip from her walk style's own: -1 takes the
   * arch away entirely at any style, +1 adds about as much again as the strut has.
   */
  arch: number;
  /** How far her ribcage leans back over her waist (positive) or rounds forwards (negative): the Upper back arch. */
  chest: number;
}
export const UPRIGHT: Posture = { arch: 0, chest: 0 };

export function postureFor(sliders: Record<string, number>): Posture {
  const chest = clampSlider(sliders.upperArch);
  return { arch: clampSlider(sliders.arch) * ARCH_RANGE, chest: chest * (chest >= 0 ? CHEST_BACK : CHEST_ROUND) };
}
const ARCH_RANGE = 0.15;
/** The Upper back arch at its ends: leaning back 10 degrees at 1, rounding forwards 7 at -1. */
const CHEST_BACK = 0.18;
const CHEST_ROUND = 0.12;

const ARM_SPREAD: [string, number][] = [
  // A full bust grows wide, out past where the arms hang (each breast reaches 23 cm from her middle at Q): at Q the
  // arms swing out about 17 degrees to clear it.
  ["bust", 0.3], ["hips", 0.06], ["build", 0.05], ["rear", 0.07], ["rearProjection", 0.05], ["rearWidth", 0.05], ["thighs", 0.03],
];

/** A random look: every slider somewhere in the middle of its range, colours from the swatches. */
export function randomLook(body: BodyName, random: () => number = Math.random): Look {
  const options = LOOK_OPTIONS[body];
  const look = newLook();
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length) % list.length];
  for (const def of options.sliders) {
    // Two rolls averaged lean towards the middle, so most random people look ordinary and a few stand out.
    let value = Math.round(((random() + random()) - 1) * (def.roll ?? 0.8) * 100) / 100;
    if (def.stops) value = stopValue(def.stops, nearestStop(def.stops, value));
    if (value !== 0) look.sliders[def.id] = value;
  }
  for (const def of options.colors) {
    // Lips mostly follow the skin; clothes and hair always get a colour.
    if (def.follows && random() < 0.6) continue;
    look.colors[def.id] = pick(def.palette);
  }
  for (const piece of options.pieces) if (random() < 0.3) look.hidden.push(piece.id);
  const style = pick(options.hairstyles);
  if (style !== options.hairstyles[0]) look.hairstyle = style.id;
  const outfit = pick(playerOutfits(body));
  if (outfit !== options.outfits[0]) look.outfit = outfit.id;
  if (outfit.legwear && options.legwear.length) look.legwear = pick(options.legwear).id;
  if (options.nipples.length) {
    const type = pick(options.nipples);
    if (type !== options.nipples[0]) look.nipples = type.id;
  }
  if (options.bustShapes.length) {
    const shape = pick(options.bustShapes);
    if (shape !== options.bustShapes[0]) look.bustShape = shape.id;
  }
  if (options.pubes.length) {
    const style = pick(options.pubes);
    if (style !== options.pubes[0]) look.pubes = style.id;
  }
  if (options.vulva.length) {
    const type = pick(options.vulva);
    if (type !== options.vulva[0]) look.vulva = type.id;
  }
  if (options.anus.length) {
    const type = pick(options.anus);
    if (type !== options.anus[0]) look.anus = type.id;
  }
  if (options.penis.length) {
    const type = pick(options.penis);
    if (type !== options.penis[0]) look.penis = type.id;
  }
  if (options.shoes.length) {
    const style = pick(options.shoes);
    if (style !== options.shoes[0]) look.shoes = style.id;
  }
  if (options.tops.length) {
    const top = pick(options.tops);
    if (top !== options.tops[0]) look.bra = top.id;
    const bottom = pick(options.bottoms);
    if (bottom !== options.bottoms[0]) look.briefs = bottom.id;
  }
  return look;
}

// ---- Keeping looks ------------------------------------------------------------------------------

const HEX = /^#[0-9a-f]{6}$/i;

/** A look read back from storage, with anything unknown or broken dropped; null if it isn't a look at all. */
export function readLook(raw: unknown, body: BodyName): Look | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<Look>;
  const options = LOOK_OPTIONS[body];
  const look = newLook();
  if (data.sliders && typeof data.sliders === "object") {
    for (const def of options.sliders) {
      const value = clampSlider((data.sliders as Record<string, unknown>)[def.id], sliderTop(def));
      if (value !== 0) look.sliders[def.id] = value;
    }
  }
  if (data.colors && typeof data.colors === "object") {
    for (const def of options.colors) {
      const value = (data.colors as Record<string, unknown>)[def.id];
      if (typeof value === "string" && HEX.test(value)) look.colors[def.id] = value.toLowerCase();
    }
  }
  if (Array.isArray(data.hidden)) {
    look.hidden = options.pieces.map((piece) => piece.id).filter((id) => (data.hidden as unknown[]).includes(id));
  }
  // The character's own style is the default, so it is left out rather than stored.
  if (options.hairstyles.slice(1).some((style) => style.id === data.hairstyle)) look.hairstyle = data.hairstyle;
  if (playerOutfits(body).slice(1).some((outfit) => outfit.id === data.outfit)) look.outfit = data.outfit;
  if (options.legwear.some((style) => style.id === data.legwear)) look.legwear = data.legwear;
  if (options.nipples.slice(1).some((type) => type.id === data.nipples)) look.nipples = data.nipples;
  if (options.bustShapes.slice(1).some((shape) => shape.id === data.bustShape)) look.bustShape = data.bustShape;
  if (options.pubes.slice(1).some((style) => style.id === data.pubes)) look.pubes = data.pubes;
  if (options.vulva.slice(1).some((type) => type.id === data.vulva)) look.vulva = data.vulva;
  if (options.anus.slice(1).some((type) => type.id === data.anus)) look.anus = data.anus;
  if (options.penis.slice(1).some((type) => type.id === data.penis)) look.penis = data.penis;
  if (options.shoes.slice(1).some((style) => style.id === data.shoes)) look.shoes = data.shoes;
  if (options.tops.slice(1).some((style) => style.id === data.bra)) look.bra = data.bra;
  if (options.bottoms.slice(1).some((style) => style.id === data.briefs)) look.briefs = data.briefs;
  if (Array.isArray(data.jewellery) && options.jewellery.length) {
    look.jewellery = options.jewellery.map((def) => def.id).filter((id) => (data.jewellery as unknown[]).includes(id));
  }
  return look;
}

export type Looks = Record<BodyName, Look>;

export function readLooks(raw: unknown): Looks | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<Record<BodyName, unknown>>;
  return { Male: readLook(data.Male, "Male") ?? newLook(), Female: readLook(data.Female, "Female") ?? newLook() };
}

const LOOKS_KEY = "tarven.looks";

/** The looks last made on the customise screen, or both as built. */
export function loadLooks(): Looks {
  try {
    const text = localStorage.getItem(LOOKS_KEY);
    if (text) return readLooks(JSON.parse(text)) ?? { Male: newLook(), Female: newLook() };
  } catch {
    // No storage, or a broken entry: start as built.
  }
  return { Male: newLook(), Female: newLook() };
}

export function storeLooks(looks: Looks): void {
  try {
    localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  } catch {
    // Private mode or full storage: the looks last until the page closes.
  }
}
