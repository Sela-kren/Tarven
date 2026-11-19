import { BufferAttribute, Color, Material, Matrix3, Matrix4, MeshLambertMaterial, Object3D, Quaternion, SkinnedMesh, Texture, Vector3 } from "three";
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
import { FACE_EXTRAS, FACE_LINES, faceMove, faceMoved, faceRig, faceSurface, REST_FACE, type FacePart, type FaceRig, type FaceShape } from "./face";
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
  /** Her nipples' type's id. Missing means the first, full & puffy (KP's). */
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

/**
 * A player character's look as they start: as built, in the outfit they start in (LookOptions.defaultOutfit, with
 * its colours) when that isn't their first. A look from newLook() is a guest's: in the first.
 */
export function startLook(body: BodyName): Look {
  const own = LOOK_OPTIONS[body].defaultOutfit;
  const look = own ? wearOutfit(body, newLook(), own) : newLook();
  if (body === "Female") Object.assign(look.sliders, startSliders());
  return look;
}

/**
 * Her body as she starts (the user, 2026-11-19): a J cup, with nipples and areolae bigger than as built. A save
 * from before this picks it up too, except where she set them herself (readLooks).
 */
export function startSliders(): Record<string, number> {
  return { bust: stopValue(CUPS, CUPS.labels.indexOf("J")), nippleSize: 0.5, areolaSize: 0.5 };
}

/** Both siblings' looks as they start (startLook). */
export function startLooks(): Record<BodyName, Look> {
  return { Male: startLook("Male"), Female: startLook("Female") };
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
  /**
   * The turn grows as the value to this power, growing only, instead of evenly: under 1 it comes on early, so the
   * smaller cups already point out without the biggest going too far.
   */
  turnEase?: number;
  /**
   * How far the front of the breast sinks, in metres at its front at a value of 1, more than its root does: a heavy
   * breast hangs, so the nipple sits low on it and looks a little down instead of straight out. Growing only.
   */
  droop?: number;
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
  /** How much of her skin colour shows through its stockings below their top band, out of 1: sheer stockings. */
  sheer?: number;
  /** Its own materials her skin shows through too, by `sheer` (the halter dress's lace panels). */
  sheerCloth?: string[];
  /**
   * Its legwear comes down rather than off (leggings): the band they're pulled down to, rolled up in the outfit's
   * roll (LEGROLL_MATERIAL) just above it, with the bands from there down still on her. Only for a style that reaches
   * up over her groin and down to that band; any other comes off as usual.
   */
  legsDown?: string;
  /**
   * Its own top's materials, which hide her bra's drawing while she has any of them on: the bra is all under the
   * top but where the top opens (a low scoop neck), and there its cups' top edge showed in the opening and, drawn a
   * little in front of her skin, through the cloth lying close to it at the neckline, as white blotches.
   */
  hidesBra?: string[];
}

export interface LookOptions {
  sliders: SliderDef[];
  colors: ColorDef[];
  pieces: PieceDef[];
  /** The first is the character's own hair, which the look starts with. */
  hairstyles: HairstyleDef[];
  /**
   * The first is the character's own outfit: what a look with none named has on, guests included ("<Body>_Cloth").
   * A player character may start in another (`defaultOutfit`).
   */
  outfits: OutfitDef[];
  /**
   * The outfit a player's look starts in and a saved look with none named comes back in, when it isn't the first.
   * Such a look always names its outfit, the first included, so guests (who name none) keep the first.
   */
  defaultOutfit?: string;
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
/**
 * The fingers' and thumbs' bones. The hand used to be all forearm, so wherever a slider reshapes the forearm, they
 * take the same share about their own joints (which the forearm's reshaping carries along with it).
 */
const HAND_BONES = ["HandFingers", "HandTips", "HandThumb"].flatMap(both);
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
/** Her irises (anime eyes): the brown she's built with first, the rest as everyone's, then violet, red and gold. */
const HER_EYE_COLORS = ["#73452b", ...EYE_COLORS, "#7a4a9e", "#a8343a", "#c7953a"];
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
    // The guests' modern clothes: the top (hoodie, tee, tank) and the bottoms (joggers, jeans, shorts).
    dye("knit", "Top", "T_knit"), dye("denim", "Bottoms", "T_denim"),
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
      ...terms(HAND_BONES, [0.12, 0, 0.12]),
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
  // Her stomach on its own, on the belly's soft bone (just inside the front of it, at navel height): -1 flat and
  // drawn in, 1 a soft round belly that comes forwards and sits a little low, fullest under the navel.
  {
    id: "stomach", label: "Stomach", tab: "body", roll: 0.5, terms: terms(["Belly"], [0.12, 0.05, 0.35], {
      shrink: [0.04, 0, 0.25], shift: [0, -0.006, -0.014], shrinkShift: [0, 0, 0.006],
    }),
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
      ...terms(HAND_BONES, [0.15, 0, 0.15]),
    ],
  },
  // The hand is the end of the forearm bone, from the wrist 20 cm below the elbow to the fingertips at 35 cm, and
  // sits 6 cm out from the elbow as the arm hangs splayed: it grows about the wrist, so it stays on the arm.
  {
    id: "hands", label: "Hand size", tab: "body", roll: 0.4, terms: [
      { bone: "ForeArm_L", grow: [0.25, 0.25, 0.25], shrink: [0.15, 0.15, 0.15], about: [-0.06, -0.2, 0.005], fade: [-0.215, -0.19] },
      { bone: "ForeArm_R", grow: [0.25, 0.25, 0.25], shrink: [0.15, 0.15, 0.15], about: [0.06, -0.2, 0.005], fade: [-0.215, -0.19] },
      // The fingers and thumb, on bones of their own: the hand growing carries their joints out with it, so each
      // grows by the same share about its own joint and the whole hand keeps its shape.
      ...terms(HAND_BONES, [0.25, 0.25, 0.25], { shrink: [0.15, 0.15, 0.15] }),
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
    // As it grows the front sinks more than the root (droop), as real_heroin's does: the nipple low on the breast and
    // looking a little down, the upper slope longer, the lower curve full; without it a big bust pointed straight out.
    // More than this pushed a point out under the nipple.
    // Grown wide about each breast's middle, the nipples came to look in towards each other from about F up (the user
    // asked for them to point out instead): the front turns outwards as it grows, coming on early (turnEase) so F
    // already points out, about 2.5 cm at its front, and Q about 6.
    id: "bust", label: "Cup size", tab: "body", group: "Bust", stops: CUPS, roll: 0.45,
    terms: terms(["Bust"], [4.0, 2.07, 2.6], {
      shrink: [0.2, 0.25, 0.7], shift: [0, -0.075, -0.012], shrinkShift: [0, 0, 0],
      lobes: [0.06, -0.005, 0.025], fade: [0.04, 0.12], apart: 0.03, shrinkApart: 0, droop: 0.09,
      turn: 0.04, turnEase: 0.5,
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
  // How thick her outer lips are across: thin narrow ridges either side of the slit, or broad full ones.
  { id: "vulvaThick", label: "Outer lip thickness", tab: "body", group: "Vulva", terms: [] },
  // Her anus likewise: its disc is shaped from this and the type (see anus.ts).
  { id: "anusSize", label: "Size", tab: "body", group: "Anus", terms: [] },
  // Each glute has its own bone, about 3 cm inside the curve of the rear. The rear is fullest low down and
  // blends into the small of the back, so every change fades out above the joint instead of leaving a shelf.
  {
    // It swells each cheek round about a point 4 cm in front of its joint, inside her (about), growing out, back and
    // a little up and down alike, as a breast does, so it stays a round mass. Grown mostly backwards about the joint
    // itself (0.6, 0.12, 2.0), what stood out most grew most and it came to a point, a cone from the side. The growth
    // reaches past where the weight thins out (reach): a push weighted by the skin alone follows the weight's own hill
    // and comes to a point.
    id: "rear", label: "Size", tab: "body", group: "Rear",
    terms: [
      ...glutes([0.5, 0.3, 0.7], { shrink: [0.15, 0.08, 0.25], shift: [0, 0.004, 0], shrinkShift: [0, 0, 0], about: [0, 0, -0.04], reach: 0.35 }),
      // The lower half, 2-6 cm below the joint, fills out on top of that and a little down, so the rear stays full
      // low and then turns in to the fold on the thigh, which stays put, as a round mass sitting on the leg. It eases
      // in from 4 cm above the joint: started at the joint (full from 4 cm below), it stood out as a second roll
      // under the cheek with a crease between, a double bump from the side.
      ...glutes([0, 0, 0], { shift: [0, -0.006, 0.04], shrinkShift: [0, 0, 0], band: [0.04, -0.02, -0.06, -0.1], reach: 0.5 }),
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
      ...terms(HAND_BONES, [0.12, 0, 0.12]),
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
      ...terms(HAND_BONES, [0.15, 0, 0.15]),
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
/** The roll an outfit's leggings bunch up in when they're pulled down (OutfitDef.legsDown). */
const LEGROLL_MATERIAL = "T_legroll";
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
      ["Body", "T_skin_f"], ["Body", "T_navel"], ["Body", "T_nail"],["Body", LABIA_MATERIAL], ["Body", ANUS_SKIN_MATERIAL], ["Body", "T_face_skin"], ["Body", "T_face_mid"], ["Body", "T_face_cool"],
      ["Body", "T_face_lit"], ["Body", "T_face_white"], ["Body", "T_face_blush"], ["Body", "T_face_pink"],
      // Her eyelids are her face's skin.
      ["Body", "T_eye_lid"], ["Body", "T_eye_lid_low"],
    ],
  },
  { id: "lips", label: "Lips", tab: "face", mode: "dye", palette: LIP_COLORS, follows: "skin", parts: [["Body", "T_lip"], ["Body", "T_lip_lit"]] },
  { id: "nipples", label: "Nipples", tab: "skin", mode: "dye", palette: NIPPLE_COLORS, follows: "skin", parts: [["Body", "T_areola"]] },
  {
    id: "vulva", label: "Vulva", tab: "skin", mode: "dye", palette: VULVA_COLORS, follows: "skin",
    parts: [["Body", VULVA_MATERIAL], ["Body", CANAL_MATERIAL]],
  },
  { id: "anus", label: "Anus", tab: "skin", mode: "dye", palette: ANUS_COLORS, follows: "skin", parts: [["Body", ANUS_MATERIAL]] },
  // Her irises (build_world.py add_anime_eyes): the iris the swatch, its darker top and her pupil keeping their depth.
  { id: "eyes", label: "Eyes", tab: "face", mode: "dye", palette: HER_EYE_COLORS, parts: [["Body", "T_eye_iris"], ["Body", "T_eye_iris_dark"], ["Body", "T_eye_pupil"]] },
  { id: "hair", label: "Hair and brows", tab: "hair", mode: "dye", palette: HAIR_COLORS, parts: [["Hair", "T_hair_f"], ["Body", "T_hair_f"]] },
  { id: "pubes", label: "Pubic hair", tab: "hair", mode: "dye", palette: PUBIC_COLORS, follows: "hair", parts: [["Body", PUBIC_MATERIAL]] },
  { id: "blouse", label: "Blouse", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_linen"]] },
  { id: "bodice", label: "Bodice", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_bodice"]] },
  { id: "skirt", label: "Skirt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_skirt"]] },
  { id: "apron", label: "Apron", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_apron"]] },
  { id: "belt", label: "Belt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_leather"]] },
  {
    id: "stockings", label: "Legwear", tab: "clothes", mode: "dye", palette: CLOTH_COLORS,
    parts: [...LEGWEAR_PIECES.map((name): [MeshPart, string] => ["Cloth", name]), ["Cloth", LEGROLL_MATERIAL], CUFF, INSTEP],
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
  // The plunge dress, and the halter dress with the lace panels sewn into its sides.
  {
    id: "dress", label: "Dress", tab: "clothes", mode: "dye", palette: CLOTH_COLORS,
    parts: [["Cloth", "T_dress"], ["Cloth", "T_halter"], ["Cloth", "T_lace"]],
  },
  // Her T-shirt; its leggings are the legwear.
  { id: "tee", label: "T-shirt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_tee"]] },
  // The pirate's rig. Her corset is the bodice, her shirt the blouse, and her belt and corset laces the belt.
  ...pirateColors(),
  { id: "feather", label: "Feather", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_plume"]] },
  // The adventuring party's kit. The archer's shirt is the blouse, her belt and chest strap the belt, her arrows'
  // fletching the feather. The mage's hat is the pirate's, banded in the braid. The noble's gown is the bodice and
  // skirt, its neckline edged in the braid, with the girdle and jewellery.
  ...factionColors(),
];

/**
 * What she wears under her everyday clothes (the tee she starts in, the tavern dress, the dirndl): a plain full-cup bra
 * and plain hipster briefs. The sexy sets come with the lewd outfits (the bunny set, the babydoll, the corset gown,
 * the frilled set, the plunge dress, the priestess's); early on she dresses like anyone else.
 */
const EVERYDAY_UNDER = { bra: "fullcup", briefs: "hipster" } as const;

/** The sexy sets her everyday clothes came with before EVERYDAY_UNDER, and their colour, so old saves move over. */
const OLD_EVERYDAY_UNDER: Readonly<Record<string, { bra: string; briefs: string; color: string }>> = {
  tee: { bra: "demi", briefs: "brazilian", color: "#b0213a" },
  tavern: { bra: "balconette", briefs: "tanga", color: "#7a1e2a" },
  dirndl: { bra: "balconette", briefs: "tanga", color: "#f1ece0" },
};

const FEMALE_OUTFITS: OutfitDef[] = [
  {
    id: "tavern", label: "Tavern dress", mesh: "",
    colors: ["blouse", "bodice", "skirt", "apron", "belt", "stockings", "shoes", "soles", "bra", "smalls"],
    // Under it, plain everyday underwear (EVERYDAY_UNDER), cream.
    preset: { bra: "#e8e0d2", smalls: "#e8e0d2" },
    legwear: "tights",
    under: EVERYDAY_UNDER,
  },
  {
    // What she starts in (defaultOutfit): a fitted white T-shirt, cropped above her navel with a low scoop neck,
    // and black leggings low on her hips, with white shoes. The tee lifts up over her breasts; the leggings come
    // down to her knees, bunched there.
    id: "tee", label: "T-shirt and leggings", mesh: "Tee",
    colors: ["tee", "stockings", "shoes", "soles", "bra", "smalls"],
    // Under them, plain everyday underwear (EVERYDAY_UNDER), white.
    preset: { tee: "#f1efea", stockings: "#1c1a1e", shoes: "#f1ece0", soles: "#c9c2b6", bra: "#ece7df", smalls: "#ece7df" },
    legwear: "leggings",
    legsDown: "T_hose_knee",
    under: EVERYDAY_UNDER,
    hidesBra: ["T_tee"],
  },
  {
    // Olive-gold bodice and skirt, a white chemise, a green apron and ribbons, and white socks.
    id: "dirndl", label: "Dirndl", mesh: "Dirndl",
    colors: ["blouse", "ribbons", "bodice", "skirt", "apron", "gems", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      blouse: "#f1ece0", ribbons: "#2e5e3e", bodice: "#6e6233", skirt: "#5c5530", apron: "#2f6040",
      gems: "#3f9a5a", stockings: "#f1ece0", shoes: "#3d2314", bra: "#f1ece0", smalls: "#f1ece0",
    },
    legwear: "noshow",
    // Plain white everyday underwear under the chemise (EVERYDAY_UNDER).
    under: EVERYDAY_UNDER,
  },
  {
    // Gold and cream: a gold top and girdle, pale sleeves and drapes, gold jewellery with blue gems.
    id: "priestess", label: "Priestess", mesh: "Priestess",
    colors: ["top", "sleeves", "girdle", "drapes", "jewels", "gems", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      top: "#b8892e", sleeves: "#efe4c4", girdle: "#b8892e", drapes: "#efe6cf", jewels: "#c99a3a",
      gems: "#3aa6d6", shoes: "#9a7430", stockings: "#9a7430", smalls: "#f3efe6", bra: "#f3efe6",
    },
    legwear: "noshow",
    // A white string set, so taking off the gold shows something new.
    under: { bra: "triangle", briefs: "stringbikini" },
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
    preset: { straps: "#8fb0e0", skirt: "#a9c2ea", trim: "#eef2fa", shoes: "#e8eef8", soles: "#c9d4e6", bra: "#8fb0e0", smalls: "#8fb0e0" },
    legwear: "noshow",
    // A shelf under her bare breasts, and a g-string under the parted skirt.
    under: { bra: "shelf", briefs: "gstring" },
  },
  {
    // A white corset gown: an underbust corset laced in black, and a long skirt open at the front, edged in black lace.
    id: "gown", label: "Corset gown", mesh: "Gown",
    colors: ["trim", "bodice", "skirt", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: { bodice: "#f1ece0", skirt: "#f1ece0", trim: "#1c1716", shoes: "#f1ece0", soles: "#9a8f80", bra: "#1c1716", smalls: "#1c1716" },
    legwear: "noshow",
    // A black shelf under the corset, and a black thong in the skirt's split.
    under: { bra: "shelf", briefs: "thong" },
  },
  {
    // All in white: a strapless top under her bare breasts with a big bow on her hip, three tiers of ruffles round her
    // hips, a band of lace round her arm, and sheer white stockings on a garter belt.
    id: "frills", label: "Frilled set", mesh: "Frills",
    colors: ["bow", "trim", "bodice", "skirt", "stockings", "shoes", "soles", "bra", "smalls"],
    preset: {
      bow: "#f6f3ee", trim: "#f6f3ee", bodice: "#f6f3ee", skirt: "#f6f3ee", stockings: "#f1ece0", shoes: "#f1ece0",
      soles: "#c9c2b6", bra: "#f6f3ee", smalls: "#f6f3ee",
    },
    legwear: "garter",
    sheer: 0.45,
    // A white shelf and thong.
    under: { bra: "shelf", briefs: "thong" },
  },
  {
    // A gold choker and a gold dress hanging from it, open at the front from her throat to below her hips, with long
    // panels down her legs. Nothing on her legs.
    id: "plunge", label: "Plunge dress", mesh: "Plunge",
    colors: ["dress", "shoes", "soles", "bra", "smalls"],
    preset: { dress: "#d9b85c", shoes: "#b8892e", soles: "#7a5c22", bra: "#d9b85c", smalls: "#d9b85c" },
    // A stick-on bra down the open front, and a gold g-string.
    under: { bra: "adhesive", briefs: "gstring" },
  },
  {
    // A long black halter dress: a high collar, bare shoulders and back down to the small of her back, fitted close to
    // her lower calves round both legs, with sheer lace panels down her sides that her skin shows through. Bare legs.
    id: "halter", label: "Halter dress", mesh: "Halter",
    colors: ["dress", "shoes", "soles", "bra", "smalls"],
    preset: { dress: "#141216", shoes: "#c9a86a", soles: "#7a5c22", bra: "#141216", smalls: "#141216" },
    sheer: 0.2,
    sheerCloth: ["T_lace"],
    // Nothing that shows at the open back or through the lace: a stick-on bra and a black g-string.
    under: { bra: "adhesive", briefs: "gstring" },
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
  // The guests' modern clothes (WORLD.md, section 2b), cut short on her: a cropped grey hoodie over low black joggers,
  // a cropped white tee over low-rise jeans, and a black sports top over bike shorts.
  {
    id: "hoodie", label: "Hoodie", mesh: "Hoodie", guestOnly: true,
    colors: ["knit", "denim", "shoes", "bra", "smalls"],
    preset: { knit: "#7d7f86", denim: "#1c1c22", shoes: "#e8e4dc" },
  },
  {
    id: "casual", label: "Tee and jeans", mesh: "Casual", guestOnly: true,
    colors: ["knit", "denim", "shoes", "bra", "smalls"],
    preset: { knit: "#ece6d8", denim: "#2f4f7f", shoes: "#e8e4dc" },
  },
  {
    id: "sporty", label: "Sportswear", mesh: "Sporty", guestOnly: true,
    colors: ["knit", "denim", "shoes", "bra", "smalls"],
    preset: { knit: "#1c1c22", denim: "#1c1c22", shoes: "#e8e4dc" },
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
      // The bob with a long side-swept fringe, a braid along the parting and the ends flicked out (build_world.py).
      { id: "braid", label: "Braided bob", mesh: "Braid" },
      { id: "pixie", label: "Pixie", mesh: "Pixie" },
      { id: "long", label: "Long", mesh: "Long" },
      { id: "ponytail", label: "Ponytail", mesh: "Ponytail" },
      { id: "bun", label: "Bun", mesh: "Bun" },
      { id: "tail", label: "High tail", mesh: "Tail" },
    ],
    outfits: FEMALE_OUTFITS,
    defaultOutfit: "tee",
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
      // The guests' modern clothes (WORLD.md, section 2b): a grey hoodie with a front pocket over black joggers, a
      // white tee tucked into belted jeans, and a tank top over shorts.
      {
        id: "hoodie", label: "Hoodie", mesh: "Hoodie", guestOnly: true,
        colors: ["knit", "denim", "boots", "smalls"],
        preset: { knit: "#7d7f86", denim: "#1c1c22", boots: "#2b2b2b" },
      },
      {
        id: "casual", label: "Tee and jeans", mesh: "Casual", guestOnly: true,
        colors: ["knit", "denim", "belt", "boots", "smalls"],
        preset: { knit: "#ece6d8", denim: "#2f4f7f", belt: "#3d2314", boots: "#3d2314" },
      },
      {
        id: "sporty", label: "Sportswear", mesh: "Sporty", guestOnly: true,
        colors: ["knit", "denim", "boots", "smalls"],
        preset: { knit: "#e8e4dc", denim: "#2b2b2b", boots: "#2b2b2b" },
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
const textureAverages = new WeakMap<Texture, Color | null>();

/** A texture's average colour (linear), read once per texture; null if it can't be read (no canvas, not loaded). */
function textureAverage(map: Texture | null | undefined): Color | null {
  if (!map) return null;
  if (textureAverages.has(map)) return textureAverages.get(map) ?? null;
  const image = map.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!image || !(image.width > 0) || typeof document === "undefined") return null;
  let average: Color | null = null;
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
      average = new Color(r / count, g / count, b / count);
    }
  } catch {
    // A texture the canvas can't read keeps the material's own colour.
  }
  textureAverages.set(map, average);
  return average;
}

/** The colour a material shows on average: its texture, if it has one, times its colour. Linear. */
export function averageColor(material: Material): Color {
  const known = averages.get(material);
  if (known) return known;
  const lambert = material as MeshLambertMaterial;
  const color = lambert.color ? lambert.color.clone() : new Color(1, 1, 1);
  const texture = textureAverage(lambert.map);
  if (texture) color.multiply(texture);
  averages.set(material, color);
  return color;
}

/** The colour a "#rrggbb" swatch should show for a material's average, for the "as built" swatch. */
export function displayHex(color: Color): string {
  return `#${color.getHexString()}`;
}

const paints = new Map<string, MeshLambertMaterial>();

/**
 * Materials whose texture is painted (her body's skin: shading, warmth at her joints; his penis's veins, raphe and
 * wrinkles), not a flat colour. Recoloured,
 * they keep their texture, tinted so its average lands on the new colour; the rest turn one flat colour.
 */
const PAINTED_MAPS = /^(T_skin_f|T_penis|T_glans|T_scrotum)$/;

/** A material that shows `color` on average (linear): flat, or `original`'s painted texture tinted to it. */
function paint(original: Material, color: Color): MeshLambertMaterial {
  const map = PAINTED_MAPS.test(original.name) ? ((original as MeshLambertMaterial).map ?? null) : null;
  const texture = textureAverage(map);
  const kept = map && texture ? map : null;
  const key = `${original.name}|${kept ? kept.uuid : "flat"}|${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}`;
  let material = paints.get(key);
  if (!material) {
    // Keeps the original's name, so anything that finds materials by name still finds this one.
    material = solidRetroMaterial(original.name, 0xffffff);
    if (kept && texture) {
      material.map = kept;
      // Texture times colour averages to `color`. Over 1 is fine: the shader multiplies, and the screen clamps.
      const share = (want: number, has: number) => (has > 1e-4 ? want / has : want);
      material.color.setRGB(share(color.r, texture.r), share(color.g, texture.g), share(color.b, texture.b));
    } else {
      material.color.setRGB(color.r, color.g, color.b);
    }
    paints.set(key, material);
  }
  return material;
}

const pubicMaterials = new Map<string, MeshLambertMaterial>();

/**
 * Her pubic hair as she wears it: the colour its swatch gives the patch (`worn`), drawn in the style's shape at its
 * size as soft, fine strands (pubicTexture) blended over her skin, not cut out. Not snapped like the rest of the
 * room's models: a close-up copies this material as it is, and her painted skin there isn't snapped either, so a
 * snapped patch would crawl over it in coarse steps. Drawn a little in front of the skin, like the coat.
 */
export function pubicMaterial(worn: Material, style: PubicStyle, size: number): MeshLambertMaterial {
  const color = averageColor(worn);
  const map = pubicTexture(style, size);
  const key = `${style.id}|${map.uuid}|${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}`;
  let material = pubicMaterials.get(key);
  if (!material) {
    material = new MeshLambertMaterial({ name: PUBIC_MATERIAL, color, map, transparent: true, depthWrite: false });
    // Only what's next to nothing is left out, so the faintest strands at its edge don't darken the depth.
    material.alphaTest = 0.02;
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
  // The first is what a look naming none has on, unless the body starts in another: then every look names its own.
  if (outfit === options.outfits[0] && !options.defaultOutfit) delete next.outfit;
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
 * The stocking bands her skin shows through, and how much, for an outfit with sheer stockings: every band her legwear
 * reaches but the top one, which is doubled over and stays solid; and the outfit's own sheer cloth (sheerCloth).
 * Null for an outfit without either.
 */
export function sheerOf(body: BodyName, look: Pick<Look, "outfit" | "legwear">): { bands: string[]; amount: number } | null {
  const outfit = outfitOf(body, look);
  const amount = outfit.sheer ?? 0;
  const legwear = legwearOf(body, look);
  if (amount <= 0) return null;
  const bands = [...(legwear?.bands.filter((band) => HOSE_BANDS.includes(band)).slice(1) ?? []), ...(outfit.sheerCloth ?? [])];
  return bands.length ? { bands, amount } : null;
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
export type GuestOutfit =
  | "pirate" | "archer" | "warrior" | "mage" | "cleric" | "noble" | "servant" | "rogue" | "brute"
  | "hoodie" | "casual" | "sporty";

/** An adventuring party's callings, each in its own kit: the archer, the warrior who shields the rest, the mage and the healer. */
export const ADVENTURER_OUTFITS: readonly GuestOutfit[] = ["archer", "warrior", "mage", "cleric"];
/** A noble, and the servant who comes with them: a maid, or a footman in the house's livery. */
export const NOBLE_OUTFITS: readonly GuestOutfit[] = ["noble", "servant"];
/** The bandit gang: rogues and brutes, every one in the gang's red. */
export const BANDIT_OUTFITS: readonly GuestOutfit[] = ["rogue", "brute"];
/** Modern clothes, which most guests come in now (WORLD.md, section 2b): the medieval kit is the exception. */
export const MODERN_OUTFITS: readonly GuestOutfit[] = ["hoodie", "casual", "sporty"];

/**
 * The modern clothes a guest comes in instead of their type's own, from the look they rolled walking in (Guest.look):
 * `share` of a type's guests do, each in one of `styles`; the rest keep the old kit (or plain clothes). The same look
 * always comes out the same (a regular keeps theirs); 0, their kind's plain look, never does. Mixed apart from what
 * picks their hairstyle and colours, so the two don't move together.
 */
export function guestModernOutfit(look: number, share: number, styles: readonly GuestOutfit[] = MODERN_OUTFITS): GuestOutfit | null {
  if (look <= 0 || share <= 0 || styles.length === 0) return null;
  let h = Math.imul(look ^ (look >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h = (h ^ (h >>> 16)) >>> 0;
  if ((h % 1000) / 1000 >= share) return null;
  return styles[Math.floor(h / 1000) % styles.length];
}

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
  // Modern clothes in everyday colours: greys, black, navy, a bright one; jeans from light to black.
  hoodie: {
    Male: [
      {},
      { knit: "#24345a", denim: "#4f4f52" },
      { knit: "#8c2020", denim: "#1c1c22", boots: "#e8e4dc" },
      { knit: "#2b3d23", denim: "#7d6c55" },
    ],
    Female: [
      {},
      { knit: "#e8a0b8", denim: "#e8e4dc" },
      { knit: "#1c1c22", denim: "#4f4f52", shoes: "#1c1c22" },
      { knit: "#6a4a8a", denim: "#1c1c22" },
    ],
  },
  casual: {
    Male: [
      {},
      { knit: "#1c1c22", denim: "#16223f" },
      { knit: "#2f5590", denim: "#7d7f86", boots: "#e8e4dc" },
      { knit: "#8a7a3e", denim: "#1c1c22", belt: "#1c1716" },
    ],
    Female: [
      {},
      { knit: "#1c1c22", denim: "#7aa0c8" },
      { knit: "#e8a0b8", denim: "#16223f" },
      { knit: "#8c2020", denim: "#1c1c22", shoes: "#1c1c22" },
    ],
  },
  sporty: {
    Male: [
      {},
      { knit: "#1c1c22", denim: "#4f4f52" },
      { knit: "#2f5590", denim: "#1c1c22", boots: "#e8e4dc" },
      { knit: "#8c2020", denim: "#24345a" },
    ],
    Female: [
      {},
      { knit: "#e8a0b8", denim: "#e8a0b8" },
      { knit: "#2f5590", denim: "#1c1c22" },
      { knit: "#ece6d8", denim: "#4f4f52", shoes: "#1c1c22" },
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
/**
 * A guest's hairstyle, from the look they rolled walking in (Guest.look): any of their body's styles, the same look
 * always the same one (a regular keeps theirs). 0, their kind's plain look, keeps the first. The look is mixed first,
 * so the style doesn't follow the skin and hair colours picked from it.
 */
export function guestHairstyle(body: BodyName, look: number): string | undefined {
  if (look <= 0) return undefined;
  const styles = LOOK_OPTIONS[body].hairstyles;
  let h = Math.imul(look ^ (look >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return styles[(h >>> 0) % styles.length].id;
}

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
  hairstyle?: string,
): void {
  const worn = outfitOf(body, { outfit }).mesh;
  const hair = hairMeshFor(body, { hairstyle });
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
    if (slot.part === "Hair") slot.mesh.visible = hair !== null && hairMeshOf(slot.mesh, body) === hair;
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
  droop?: number;
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
      } else if (t >= 1) {
        // Past the middle, on the other side's skin this bone still holds a little of (down the cleft): it stays
        // across where it is, as the middle itself does, instead of being pushed further over and pulling the two
        // sides apart.
        out.x -= d.x * gx * weight;
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
    // Sinking likewise moves the front of a breast most, by how far forwards it is, so its root stays on the chest.
    if (term.droop) out.y -= term.droop * weight * Math.min(1.5, Math.max(0, -d.z / 0.06));
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
      turn: term.turn === undefined ? undefined
        : term.turnEase === undefined ? term.turn * value : term.turn * Math.max(0, value) ** term.turnEase,
      droop: term.droop === undefined ? undefined : term.droop * Math.max(0, value),
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
  if (inner !== 0) for (const term of byBone.get("Bust") ?? []) if (term.lobes) term.inner = inner;
  // Breasts set apart part over her chest instead of dragging the skin between them along, so the cleavage opens:
  // with the Spacing slider, a side-set or east-west shape, or the inner sides drawn in; pushed together (by her or
  // by what she wears), it closes again.
  const cleft = Math.min(1, Math.max(0,
    Math.max(0, clampSlider(sliders.bustSpacing)) + (CLEFT_OF_SHAPE[bustShape ?? ""] ?? 0)
    + Math.max(0, -slider) * CLEFT_OF_INNER - Math.max(0, clampSlider(sliders.bustTogether)),
  ));
  if (cleft > 0) for (const term of byBone.get("Bust") ?? []) if (term.lobes) term.cleft = cleft;
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
  /**
   * Where each point was before the build reshaped her (the model's "_SLIDER_REST", in bind space), and her nipple
   * discs' skin there: the sliders were worked out on her as built, so they shape her there (see `apply`).
   */
  rest?: Float32Array;
  restShapeFrom?: Float32Array;
  /** The user's sculpted fixes to the breasts at single cup sizes (the model's "_BUST_FIX_<cup>"), in bind space. */
  cupFixes?: { cup: number; delta: Float32Array }[];
}

/**
 * The cup sizes the bust review lays out to sculpt on (tools/posepreview/bustexport.preview.ts): a fix sculpted at one
 * of them is whole there and fades out to nothing at the reviewed sizes either side.
 */
export const REVIEWED_CUPS = ["A", "C", "F", "J", "M", "Q", "U", "Z"].map((letter) => stopValue(CUPS, CUPS.labels.indexOf(letter)));

/** How much of a fix sculpted at cup slider value `at` the bust wears at slider value `cup`, 0 to 1. */
export function cupFixAmount(at: number, cup: number): number {
  const stops = [...new Set([...REVIEWED_CUPS, at])].sort((a, b) => a - b);
  const i = stops.indexOf(at);
  const below = stops[i - 1];
  const above = stops[i + 1];
  if (cup === at) return 1;
  if (cup < at) return below === undefined ? 1 : Math.max(0, (cup - below) / (at - below));
  return above === undefined ? 1 : Math.max(0, (above - cup) / (above - at));
}

interface BoneRest {
  bone: Object3D;
  label: string;
  parent: BoneRest | null;
  position: Vector3;
  quaternion: Quaternion;
  /** Where the joint stood when the mesh was bound, in the model's space. */
  joint: Vector3;
  /** Where it stood before the build reshaped her (its "slider_shift" on), for the meshes with a `rest`. */
  restJoint: Vector3;
}

/** How many body points each clothing point follows, and how softly the nearer ones count over the further. */
const FOLLOW_POINTS = 4;
const FOLLOW_SOFT = 0.005;
/**
 * Fitted tops (SMOOTH_TOPS) follow more of her skin, more evenly: over the crease under a big bust the four
 * nearest points of a tee bridging it were split between the breast's underside and her ribs, and as the breast
 * grew and dropped they parted and tore the cloth between them. Following the skin round it as a whole, the cloth
 * moves smoothly with the breast and hangs from its front, as a tight shirt does.
 */
const TOP_FOLLOW = { k: 12, soft: 0.015 };
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
 * Her tops never end up inside her: a bust grown past what a top was built over swallowed the cloth that followed
 * the ribs under it (a full breast hangs down over where the top lay). Any point of a top inside her skin, as both
 * are shaped now, goes out to the skin nearest it and CLEAR_GAP beyond, so the top wraps the breast, as a tight top
 * does. Model space, as built: x across, y up, z backwards. Only this part of her, and only tops and dresses (clothes
 * reaching CLEAR_GARMENT_TOP), take part. Twice over, for points in a crease, put out of one side into the other.
 */
const CLEAR_HALF_WIDTH = 0.45;
const CLEAR_HEIGHT: readonly [number, number] = [0.7, 1.5];
const CLEAR_GARMENT_TOP = 1.15;
const CLEAR_GAP = 0.002;
/** Further inside than this, the nearest skin no longer tells which way is out: such points are left. */
const CLEAR_DEPTH = 0.06;
/** The skin is searched in cells this big, ring by ring round the cell a point is in, out to CLEAR_DEPTH. */
const CLEAR_CELL = 0.02;
const CLEAR_RINGS = 3;
/** Her arms' bones: her skin there isn't what her tops are kept out of. */
const CLEAR_NOT_SKIN = /Arm|Hand|Finger|Thumb|Elbow|Wrist|Forearm/;

/** How high a piece of clothing reaches up her, as built (its highest point's y). */
function reach(points: Float32Array): number {
  let top = -Infinity;
  for (let v = 1; v < points.length; v += 3) top = Math.max(top, points[v]);
  return top;
}

function inClearRegion(points: Float32Array, v: number): boolean {
  const x = points[v * 3], y = points[v * 3 + 1], z = points[v * 3 + 2];
  return Math.abs(x) < CLEAR_HALF_WIDTH && y > CLEAR_HEIGHT[0] && y < CLEAR_HEIGHT[1] && Number.isFinite(z);
}

/** A piece of her skin's points that tops are kept out of, and its triangles for which way is out. */
interface ClearSkin {
  slot: number;
  verts: Int32Array;
  tris: ArrayLike<number>;
  /** Per point, 1 where it is her arm's (left out of her shell). */
  arm: Uint8Array;
}

/** Each point's outward direction (not normalised) from the triangles round it. */
function pointNormals(points: Float32Array, tris: ArrayLike<number>): Float32Array {
  const n = new Float32Array(points.length);
  for (let t = 0; t < tris.length; t += 3) {
    const a = tris[t] * 3, b = tris[t + 1] * 3, c = tris[t + 2] * 3;
    const ux = points[b] - points[a], uy = points[b + 1] - points[a + 1], uz = points[b + 2] - points[a + 2];
    const vx = points[c] - points[a], vy = points[c + 1] - points[a + 1], vz = points[c + 2] - points[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) {
      n[k] += nx;
      n[k + 1] += ny;
      n[k + 2] += nz;
    }
  }
  return n;
}

/**
 * Fabric over her lies on her outermost skin, never in a hollow behind it: round her middle, a top's cloth can't
 * be nearer her than any of her skin out from it in the same direction (her arms aside), less SHELL_SLOPE for every
 * metre along her between them. So it bridges from a breast to her ribs instead of following the skin in under it
 * (a full breast hanging past where the top was built to lie trapped the cloth under it, and showed bare from
 * behind), and hangs off the front of a heavy bust, hollow under it. Measured round an upright line through the
 * middle of her chest, in bands of height and turns round it; only skin and cloth in SHELL_HEIGHT take part (not her
 * shoulders and neck, which the shell would hold the neckline up off).
 */
const SHELL_SLOPE = 0.9;
const SHELL_HEIGHT: readonly [number, number] = [0.75, 1.38];
const SHELL_BAND = 0.01;
const SHELL_TURNS = 180;
/** How far along her skin any one point holds the cloth out (beyond, it lies too far below to). */
const SHELL_REACH = 0.06;
const SHELL_BANDS = Math.ceil((SHELL_HEIGHT[1] - SHELL_HEIGHT[0]) / SHELL_BAND);

/**
 * Her skin round her middle as shaped now: each point's turn, height and distance out, sorted by cell of band and
 * turn (`start[cell]` to `start[cell + 1]`).
 */
interface Shell {
  centre: number;
  turn: Float32Array;
  height: Float32Array;
  out: Float32Array;
  start: Int32Array;
  /** Per cell, the furthest out of its points, so cells that can't hold the cloth out are passed over. */
  most: Float32Array;
}

const shellTurn = (x: number, z: number, centre: number) => Math.atan2(x, centre - z);
const shellTurnCell = (a: number) => Math.min(SHELL_TURNS - 1, Math.floor(((a + Math.PI) / (2 * Math.PI)) * SHELL_TURNS));

/** Her skin (`skin`, by her points as shaped now, not her arms) round the upright line at depth `centre`. */
export function shellOf(skin: ClearSkin[], shaped: Float32Array[], centre: number): Shell {
  const turn: number[] = [], height: number[] = [], out: number[] = [], cell: number[] = [];
  for (const piece of skin) {
    const points = shaped[piece.slot];
    for (let n = 0; n < piece.verts.length; n++) {
      if (piece.arm[n]) continue;
      const v = piece.verts[n];
      const x = points[v * 3], y = points[v * 3 + 1], z = points[v * 3 + 2];
      if (y < SHELL_HEIGHT[0] || y >= SHELL_HEIGHT[1]) continue;
      const a = shellTurn(x, z, centre);
      turn.push(a);
      height.push(y);
      out.push(Math.hypot(x, z - centre));
      cell.push(Math.floor((y - SHELL_HEIGHT[0]) / SHELL_BAND) * SHELL_TURNS + shellTurnCell(a));
    }
  }
  const cells = SHELL_BANDS * SHELL_TURNS;
  const start = new Int32Array(cells + 1);
  for (const c of cell) start[c + 1]++;
  for (let c = 0; c < cells; c++) start[c + 1] += start[c];
  const fill = start.slice(0, cells);
  const shell: Shell = {
    centre, turn: new Float32Array(turn.length), height: new Float32Array(turn.length), out: new Float32Array(turn.length), start,
    most: new Float32Array(cells).fill(-Infinity),
  };
  for (let i = 0; i < cell.length; i++) {
    const k = fill[cell[i]]++;
    shell.turn[k] = turn[i];
    shell.height[k] = height[i];
    shell.out[k] = out[i];
    shell.most[cell[i]] = Math.max(shell.most[cell[i]], out[i]);
  }
  return shell;
}

/** Puts a top's points (`clothVerts`, `bind` + `moves`, `moves` changed in place) out onto her shell. */
export function onShell(shell: Shell, clothVerts: Int32Array, bind: Float32Array, moves: Float32Array): void {
  const { centre, turn, height, out, start, most } = shell;
  const bands = Math.ceil(SHELL_REACH / SHELL_BAND);
  const reach2 = SHELL_REACH * SHELL_REACH;
  for (const c of clothVerts) {
    const v = c * 3;
    const x = bind[v] + moves[v], y = bind[v + 1] + moves[v + 1], z = bind[v + 2] + moves[v + 2];
    if (y < SHELL_HEIGHT[0] || y >= SHELL_HEIGHT[1]) continue;
    const r = Math.hypot(x, z - centre);
    if (!(r > 0)) continue;
    const a = shellTurn(x, z, centre);
    const band = Math.floor((y - SHELL_HEIGHT[0]) / SHELL_BAND);
    const at = shellTurnCell(a);
    const turns = Math.min(SHELL_TURNS >> 1, Math.ceil((SHELL_REACH / Math.max(r, 0.05)) / ((2 * Math.PI) / SHELL_TURNS)));
    // Nothing nearer than the cloth already lies can hold it out: only skin further out than it, less the slope.
    let need = r - CLEAR_GAP;
    for (let b = Math.max(0, band - bands); b <= Math.min(SHELL_BANDS - 1, band + bands); b++) {
      const row = b * SHELL_TURNS;
      const below = SHELL_SLOPE * Math.max(0, Math.abs(b - band) - 1) * SHELL_BAND;
      for (let dt = -turns; dt <= turns; dt++) {
        const t = (((at + dt) % SHELL_TURNS) + SHELL_TURNS) % SHELL_TURNS;
        if (most[row + t] - below <= need) continue;
        for (let i = start[row + t], end = start[row + t + 1]; i < end; i++) {
          const o = out[i];
          if (o <= need) continue;
          let da = turn[i] - a;
          if (da > Math.PI) da -= 2 * Math.PI;
          else if (da < -Math.PI) da += 2 * Math.PI;
          const across = da * o, up = height[i] - y;
          const along2 = across * across + up * up;
          if (along2 > reach2) continue;
          const held = o - SHELL_SLOPE * Math.sqrt(along2);
          if (held > need) need = held;
        }
      }
    }
    need += CLEAR_GAP;
    if (need <= r) continue;
    const scale = need / r;
    moves[v] = x * scale - bind[v];
    moves[v + 2] = centre + (z - centre) * scale - bind[v + 2];
  }
}

const clearKey = (gx: number, gy: number, gz: number) => (gx + 512) * 1048576 + (gy + 512) * 1024 + (gz + 512);

/** Her skin as shaped now, for keeping her tops out of: its points, which way is out at each, and cells of them. */
interface ClearGrid {
  at: number[];
  out: number[];
  cells: Map<number, number[]>;
}

/** The skin (`skin`, by her points as shaped now in `shaped`) for clearOfSkin to search. */
export function clearGrid(skin: ClearSkin[], shaped: Float32Array[]): ClearGrid {
  const at: number[] = [], out: number[] = [];
  const grid = new Map<number, number[]>();
  for (const piece of skin) {
    const points = shaped[piece.slot];
    const normals = pointNormals(points, piece.tris);
    for (let n = 0; n < piece.verts.length; n++) {
      const v = piece.verts[n];
      const len = Math.hypot(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]);
      if (!(len > 0)) continue;
      const i = at.length / 3;
      const x = points[v * 3], y = points[v * 3 + 1], z = points[v * 3 + 2];
      at.push(x, y, z);
      out.push(normals[v * 3] / len, normals[v * 3 + 1] / len, normals[v * 3 + 2] / len);
      const k = clearKey(Math.floor(x / CLEAR_CELL), Math.floor(y / CLEAR_CELL), Math.floor(z / CLEAR_CELL));
      const list = grid.get(k);
      if (list) list.push(i);
      else grid.set(k, [i]);
    }
  }
  return { at, out, cells: grid };
}

/**
 * Puts the points of a top (`clothVerts`, `bind` + `moves`, `moves` changed in place) inside her skin out over it.
 * Returns the points it moved.
 */
export function clearOfSkin(
  skin: ClearGrid, clothVerts: Int32Array, bind: Float32Array, moves: Float32Array, gap = CLEAR_GAP,
): Int32Array {
  const { at, out, cells: grid } = skin;
  const moved: number[] = [];
  for (const c of clothVerts) {
    const v = c * 3;
    const x = bind[v] + moves[v], y = bind[v + 1] + moves[v + 1], z = bind[v + 2] + moves[v + 2];
    let best = -1, bestD = CLEAR_DEPTH * CLEAR_DEPTH;
    const gx = Math.floor(x / CLEAR_CELL), gy = Math.floor(y / CLEAR_CELL), gz = Math.floor(z / CLEAR_CELL);
    // Ring by ring out from its own cell, until the nearest found is nearer than the next ring could be.
    for (let r = 0; r <= CLEAR_RINGS; r++) {
      if (best >= 0 && bestD <= ((r - 1) * CLEAR_CELL) ** 2) break;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== r) continue;
        const list = grid.get(clearKey(gx + dx, gy + dy, gz + dz));
        if (!list) continue;
        for (const i of list) {
          const d = (at[i * 3] - x) ** 2 + (at[i * 3 + 1] - y) ** 2 + (at[i * 3 + 2] - z) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    if (best < 0) continue;
    const nx = out[best * 3], ny = out[best * 3 + 1], nz = out[best * 3 + 2];
    const over = (x - at[best * 3]) * nx + (y - at[best * 3 + 1]) * ny + (z - at[best * 3 + 2]) * nz;
    if (over >= gap) continue;
    moves[v] += nx * (gap - over);
    moves[v + 1] += ny * (gap - over);
    moves[v + 2] += nz * (gap - over);
    moved.push(c);
  }
  return Int32Array.from(moved);
}

/**
 * Fitted tops are smoothed after the reshaping: the build smooths them into fabric over her (smooth_tops in
 * build_world.py), but each point then takes its own move as her bust is sized, and neighbours moving apart crumpled
 * the cloth: a point under the bust took the breast's move or the ribs' by which skin point was nearest. A top built
 * over a C cup bunched into ridges over a smaller one, a few centimetres apart, and tore under a bigger one. Its moves
 * are eased towards their neighbours' (not its points: its built shape stays as it was), enough passes to reach across
 * those ridges; the edges (hem, neck, sleeve ends) are eased only along themselves. Only these materials.
 * Up to SMOOTH_TOPS_TAUBIN[0] plainly, which irons out the gentle ridges of a small bust; by [1] in Taubin's two steps
 * (in, then back out a little): plain easing pulled the cloth's large-scale moves together too, and over a big bust
 * it lagged behind the breast's growth and her skin showed through, while the two steps take out only the
 * small-scale tears and keep the stretch. Between, the step back out grows, so there's no jump on the slider.
 */
const SMOOTH_TOPS: readonly string[] = ["T_tee", "T_halter", "T_lace"];
const SMOOTH_TOPS_PASSES = 100;
const SMOOTH_TOPS_EASE: readonly number[] = [0.5];
const SMOOTH_TOPS_TAUBIN = { cups: ["F", "J"] as const, back: -0.53 };

/** The easing steps her tops are smoothed with at this Cup size slider value, each pair one pass (see SMOOTH_TOPS). */
export function smoothTopSteps(bust: number): [number, number] {
  const [from, to] = SMOOTH_TOPS_TAUBIN.cups.map((letter) => stopValue(CUPS, CUPS.labels.indexOf(letter)));
  const t = Math.min(1, Math.max(0, (bust - from) / (to - from)));
  return [0.5, SMOOTH_TOPS_TAUBIN.back * t];
}
/**
 * How far her fitted tops are kept off her skin, by her cup size: CLEAR_GAP up to the first, rising to the second gap
 * by the second cup. Over a big bust the cloth's faces are stretched centimetres across, and a flat face that wide on
 * the breast's curve dips into it between its corners: with only CLEAR_GAP her skin showed through in patches.
 */
const SMOOTH_TOPS_GAP = { cups: ["F", "M"] as const, gaps: [CLEAR_GAP, 0.008] as const };

/** How far her fitted tops are kept off her skin at this Cup size slider value (see SMOOTH_TOPS_GAP). */
export function smoothTopGap(bust: number): number {
  const [from, to] = SMOOTH_TOPS_GAP.cups.map((letter) => stopValue(CUPS, CUPS.labels.indexOf(letter)));
  const t = Math.min(1, Math.max(0, (bust - from) / (to - from)));
  return SMOOTH_TOPS_GAP.gaps[0] + (SMOOTH_TOPS_GAP.gaps[1] - SMOOTH_TOPS_GAP.gaps[0]) * t;
}
/**
 * Her T-shirt hangs from a big bust instead of wrapping under it: below the front of each breast the cloth falls
 * straight down to the hem, a little back as it goes (`slope`, metres back per metre down), not back in under the
 * breast to her ribs. Round her upright line (the shell's), each way round from her front (`bins` of it, half each
 * side) and each height (`band`), the cloth comes out at least as far as the cloth above it, less the slope. Fully
 * out to `ways[0]` round from her front, none past `ways[1]` (her sides and sleeves keep their shape). None up to the
 * first cup, all of it by the second. The hem's turned-under strip goes with the fold it turns under at.
 */
const HANG_TOPS: readonly string[] = ["T_tee"];
export const HANG = {
  cups: ["C", "G"] as const, slope: 0.2, bins: 72, band: 0.005, ways: [75, 95] as const, top: 1.32,
  /** The turned-under strip's points: on the tee's open edge, this close to the fold they turn at. */
  turned: 0.005,
  /** Passes the push out is eased by (see smoothMoves). */
  ease: 30,
  /** Her stains on the tee, kept this far out on it. */
  lift: 0.001,
  /**
   * Where it hangs free (from `free` metres below where it hangs from, all of it by twice that), its shape is ironed (`iron` passes, its points eased towards their
   * neighbours'), so the crease the tee was built with under a smaller bust doesn't stay in as a line across it.
   */
  free: 0.01,
  iron: 24,
  /** Passes its rows are evened out in height by, where it hangs free. */
  even: 80,
  /**
   * Folds down the cloth hanging from her bust, as a sheet hanging from two points falls in: ridges `fold` metres
   * apart round her front, a valley under her cleavage, out by up to `depth`, from nothing `grow` metres above the
   * front of her breasts (down their lower halves, so the folds and the breasts are one cloth) to all of it `grow`
   * below.
   */
  fold: 0.06,
  depth: 0,
  grow: 0.03,
  /** A band spans a dip in itself (see bridgeBands) only where that's this much further out than the cloth there. */
  bridgeOver: 0.001,
  /** The bands either side of a band its outline is taken over (see bridgeBands). */
  bridgeBands: 2,
};

/** How much of the hang (see HANG) her T-shirt takes at this Cup size slider value. */
export function hangAmount(bust: number): number {
  const [from, to] = HANG.cups.map((letter) => stopValue(CUPS, CUPS.labels.indexOf(letter)));
  return Math.min(1, Math.max(0, (bust - from) / (to - from)));
}

/** Per point of a top, the point of the fold its turned-under strip turns at (-1 for the rest). */
export function turnedPartners(bind: Float32Array, table: SmoothTable, index: ArrayLike<number>): Int32Array {
  const { node, nodes } = table;
  const edges = new Map<number, number>();
  for (let t = 0; t + 2 < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = node[index[t + k]], b = node[index[t + ((k + 1) % 3)]];
      if (a === b) continue;
      const key = Math.min(a, b) * nodes + Math.max(a, b);
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  const open = new Uint8Array(nodes);
  for (const [key, n] of edges) if (n === 1) open[Math.floor(key / nodes)] = open[key % nodes] = 1;
  const first = new Int32Array(nodes).fill(-1);
  for (let v = 0; v < node.length; v++) if (first[node[v]] < 0) first[node[v]] = v;
  const best = new Int32Array(nodes).fill(-1);
  const bestDistance = new Float32Array(nodes).fill(HANG.turned);
  for (const key of edges.keys()) {
    const a = Math.floor(key / nodes), b = key % nodes;
    if (open[a] === open[b]) continue;
    const [edge, fold] = open[a] ? [a, b] : [b, a];
    const p = first[edge] * 3, q = first[fold] * 3;
    const d = Math.hypot(bind[p] - bind[q], bind[p + 1] - bind[q + 1], bind[p + 2] - bind[q + 2]);
    if (d < bestDistance[edge]) {
      bestDistance[edge] = d;
      best[edge] = fold;
    }
  }
  const partner = new Int32Array(node.length).fill(-1);
  for (let v = 0; v < node.length; v++) if (best[node[v]] >= 0) partner[v] = first[best[node[v]]];
  return partner;
}

/** How far out round the upright line at (x, z = `centre`) the hanging cloth comes, by way round and height. */
export interface HangField {
  centre: number;
  bottom: number;
  bands: number;
  /** Per way round (HANG.bins) and band from `bottom` up, how far out; -Infinity where nothing hangs. */
  out: Float32Array;
  /** Per way round and band, the height it hangs from. */
  from: Float32Array;
  /** Per way round, the height it comes out furthest at (the front of her breast there); NaN where none. */
  apex: Float32Array;
}

/**
 * Per band (HangField's layout: bin * bands + band), how far out the cloth lies over what's there when pulled taut
 * round it, like a towel over her bust: the convex outline, seen from above, of the furthest out per way round (and her
 * upright line), so it spans the dip between her breasts instead of following into it. -Infinity where nothing is.
 */
function bridgeBands(most: Float32Array, bands: number): Float32Array {
  const bridged = new Float32Array(most.length).fill(-Infinity);
  const angle = (bin: number) => ((bin + 0.5) / HANG.bins - 0.5) * Math.PI;
  const xs: number[] = [], zs: number[] = [];
  for (let band = 0; band < bands; band++) {
    // Her upright line, then the furthest out per way round, in order round her (x across, z forwards).
    // Taken over the bands round it too: one band alone caught only some of the breast's rows, and the outline came out
    // smaller there than in the bands either side, in stripes across.
    xs.length = zs.length = 0;
    xs.push(0);
    zs.push(0);
    for (let bin = 0; bin < HANG.bins; bin++) {
      let r = -Infinity;
      for (let b = Math.max(0, band - HANG.bridgeBands); b <= Math.min(bands - 1, band + HANG.bridgeBands); b++) {
        r = Math.max(r, most[bin * bands + b]);
      }
      if (r === -Infinity) continue;
      xs.push(r * Math.sin(angle(bin)));
      zs.push(r * Math.cos(angle(bin)));
    }
    if (xs.length < 3) {
      for (let bin = 0; bin < HANG.bins; bin++) bridged[bin * bands + band] = most[bin * bands + band];
      continue;
    }
    // The outline: the points round from the first, keeping only those it turns outwards at (a convex chain).
    const hull: number[] = [];
    for (let i = 1; i < xs.length; i++) {
      while (hull.length >= 2) {
        const a = hull[hull.length - 2], b = hull[hull.length - 1];
        const cross = (xs[b] - xs[a]) * (zs[i] - zs[a]) - (zs[b] - zs[a]) * (xs[i] - xs[a]);
        // Going round from her right to her left (x rising): an inward dent turns the other way.
        if (cross < 0) break;
        hull.pop();
      }
      hull.push(i);
    }
    // Each way round where there's cloth: how far out along it the outline lies.
    for (let bin = 0; bin < HANG.bins; bin++) {
      const r = most[bin * bands + band];
      if (r === -Infinity) continue;
      const dx = Math.sin(angle(bin)), dz = Math.cos(angle(bin));
      let best = r;
      for (let k = 0; k + 1 < hull.length; k++) {
        const a = hull[k], b = hull[k + 1];
        const ex = xs[b] - xs[a], ez = zs[b] - zs[a];
        const det = dx * ez - dz * ex;
        if (Math.abs(det) < 1e-9) continue;
        const t = (xs[a] * ez - zs[a] * ex) / det;
        const s = (xs[a] * dz - zs[a] * dx) / det;
        if (s >= 0 && s <= 1 && t > best) best = t;
      }
      bridged[bin * bands + band] = best;
    }
  }
  return bridged;
}

/** Which way round her upright line a point is (0 her front, to ±π/2 her sides; x across, z backwards). */
function hangWay(x: number, z: number, centre: number): number {
  return Math.atan2(x, centre - z);
}

/** The hang (see HANG) of a top shaped at `shaped` (its points `verts`): how far out it hangs everywhere. */
export function hangField(shaped: Float32Array, verts: ArrayLike<number>, centre: number): HangField | null {
  let bottom = Infinity;
  for (let i = 0; i < verts.length; i++) bottom = Math.min(bottom, shaped[verts[i] * 3 + 1]);
  if (!Number.isFinite(bottom)) return null;
  const bands = Math.max(1, Math.ceil((HANG.top - bottom) / HANG.band) + 1);
  const most = new Float32Array(HANG.bins * bands).fill(-Infinity);
  const reach = (HANG.ways[1] * Math.PI) / 180;
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i] * 3;
    const x = shaped[v], y = shaped[v + 1], z = shaped[v + 2];
    const way = hangWay(x, z, centre);
    if (Math.abs(way) > reach || y > HANG.top) continue;
    const bin = Math.min(HANG.bins - 1, Math.max(0, Math.floor(((way / Math.PI) + 0.5) * HANG.bins)));
    const band = Math.min(bands - 1, Math.floor((y - bottom) / HANG.band));
    const at = bin * bands + band;
    most[at] = Math.max(most[at], Math.hypot(x, centre - z));
  }
  const bridged = bridgeBands(most, bands);
  // Each band takes what hangs from every band above it (not its own: a point never hangs from itself), and what its
  // own band bridges across (a dip between her breasts, spanned).
  const out = new Float32Array(HANG.bins * bands).fill(-Infinity);
  const from = new Float32Array(HANG.bins * bands);
  const drop = HANG.slope * HANG.band;
  for (let bin = 0; bin < HANG.bins; bin++) {
    let hang = -Infinity, at = HANG.top, spanTop = NaN;
    for (let band = bands - 1; band >= 0; band--) {
      const height = bottom + (band + 0.5) * HANG.band;
      const span = bridged[bin * bands + band];
      const spans = span > most[bin * bands + band] + HANG.bridgeOver && span > hang;
      // A span hangs from where it starts (so the cloth spanning down her cleavage hangs free, and is ironed with the
      // rest), and the cloth under it hangs from it: hung from the dip instead, it fell back in under the span.
      if (!spans) spanTop = NaN;
      else if (Number.isNaN(spanTop)) spanTop = height;
      out[bin * bands + band] = spans ? span : hang;
      from[bin * bands + band] = spans ? spanTop : at;
      const own = spans ? span : most[bin * bands + band];
      if (own >= hang - drop) at = spans ? spanTop : height;
      hang = Math.max(hang - drop, own);
    }
  }
  const apex = new Float32Array(HANG.bins).fill(NaN);
  for (let bin = 0; bin < HANG.bins; bin++) {
    let best = -Infinity;
    for (let band = 0; band < bands; band++) {
      if (most[bin * bands + band] > best) {
        best = most[bin * bands + band];
        apex[bin] = bottom + (band + 0.5) * HANG.band;
      }
    }
  }
  return { centre, bottom, bands, out, from, apex };
}

/**
 * How far out the cloth hangs at a point (x, y, z), between the ways round either side of it, and the height it hangs
 * from (`at[0]`).
 */
function hangAt(field: HangField, x: number, y: number, z: number, at?: number[]): number {
  const { centre, bottom, bands, out, from } = field;
  const way = (hangWay(x, z, centre) / Math.PI + 0.5) * HANG.bins - 0.5;
  const height = (y - bottom) / HANG.band - 0.5;
  const lo = Math.floor(way), t = way - lo;
  const low = Math.floor(height), u = height - low;
  // Between the two nearest of each, leaving out any with nothing hanging there.
  let sum = 0, weights = 0, height_ = 0;
  for (const [bin, wb] of [[lo, 1 - t], [lo + 1, t]]) {
    for (const [band, wh] of [[low, 1 - u], [low + 1, u]]) {
      if (bin < 0 || bin >= HANG.bins || band < 0 || band >= bands) continue;
      const value = out[bin * bands + band];
      if (value === -Infinity || wb * wh <= 0) continue;
      sum += value * wb * wh;
      height_ += from[bin * bands + band] * wb * wh;
      weights += wb * wh;
    }
  }
  if (at) at[0] = weights > 0 ? height_ / weights : y;
  return weights > 0 ? sum / weights : -Infinity;
}

/** The height the cloth comes out furthest at, this way round (see HangField.apex), between the ways either side. */
function apexAt(field: HangField, way: number): number {
  const at = (way / Math.PI + 0.5) * HANG.bins - 0.5;
  const lo = Math.max(0, Math.min(HANG.bins - 1, Math.floor(at))), hi = Math.min(HANG.bins - 1, lo + 1);
  const a = field.apex[lo], b = field.apex[hi], t = Math.min(1, Math.max(0, at - lo));
  if (Number.isNaN(a)) return b;
  if (Number.isNaN(b)) return a;
  return a + (b - a) * t;
}

/**
 * Hangs a top's points (`verts`, shaped at `shaped`, their moves `moves` changed in place) out to `field` by
 * `amount`, `lift` beyond it; a point with a `partner` (its turned-under strip) moves as its partner does.
 */
export function hangTop(
  field: HangField, shaped: Float32Array, verts: ArrayLike<number>, moves: Float32Array, amount: number,
  lift = 0, partner?: Int32Array, table?: SmoothTable,
): void {
  if (amount <= 0) return;
  const full = (HANG.ways[0] * Math.PI) / 180, none = (HANG.ways[1] * Math.PI) / 180;
  const push = new Float32Array(shaped.length);
  /** Per point, how far it hangs below where it hangs from (NaN where it doesn't), and how much its fade lets it. */
  const below = new Float32Array(shaped.length / 3).fill(NaN);
  const fades = new Float32Array(shaped.length / 3);
  const { centre } = field;
  const at = [0];
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i] * 3;
    const x = shaped[v], y = shaped[v + 1], z = shaped[v + 2];
    const way = Math.abs(hangWay(x, z, centre));
    if (way >= none) continue;
    const hang = hangAt(field, x, y, z, at) + lift;
    const r = Math.hypot(x, centre - z);
    if (hang === -Infinity || r < 1e-6) continue;
    const fade = way <= full ? 1 : 1 - (way - full) / (none - full);
    below[verts[i]] = Math.max(0, at[0] - y);
    fades[verts[i]] = fade * fade * (3 - 2 * fade);
    if (!(hang > r)) continue;
    const s = ((hang - r) * amount * fades[verts[i]]) / r;
    push[v] = x * s;
    push[v + 2] = (z - centre) * s;
  }
  // Eased into the cloth round it, so it rounds off where it leaves the breast instead of creasing there; never less
  // than its own (eased down, the deepest of the crease under the breast stayed in as a line above a roll).
  if (table) {
    const eased = push.slice();
    smoothMoves(table, eased, HANG.ease, SMOOTH_TOPS_EASE);
    for (let v = 0; v < push.length; v += 3) {
      if (eased[v] ** 2 + eased[v + 2] ** 2 > push[v] ** 2 + push[v + 2] ** 2) {
        push[v] = eased[v];
        push[v + 2] = eased[v + 2];
      }
    }
    // Ironed where it hangs free: how far out it is there, eased, by how freely each point hangs (only how far out:
    // eased all over, the hanging cloth drew up towards her bust).
    const reach = new Float32Array(shaped.length);
    for (let v = 0; v < reach.length / 3; v++) {
      reach[v * 3] = Math.hypot(shaped[v * 3] + push[v * 3], centre - shaped[v * 3 + 2] - push[v * 3 + 2]);
    }
    // The hem's turned-under strip as far out as its fold: lying in under it, it drew the fold and the hem in.
    if (partner) for (let v = 0; v < reach.length / 3; v++) if (partner[v] >= 0) reach[v * 3] = reach[partner[v] * 3];
    // How freely each point hangs, none (held as it is) to all: by how far below where it hangs from it is.
    const free = new Float32Array(shaped.length / 3);
    for (let v = 0; v < free.length; v++) {
      if (Number.isNaN(below[v])) continue;
      const t = Math.min(1, Math.max(0, below[v] / HANG.free - 1));
      free[v] = t * t * (3 - 2 * t) * fades[v] * Math.min(1, amount);
    }
    const ironed = reach.slice();
    smoothHeld(table, ironed, HANG.iron, free);
    for (let v = 0; v < reach.length / 3; v++) {
      const by = ironed[v * 3] - reach[v * 3];
      const r = reach[v * 3];
      if (r < 1e-6 || by === 0) continue;
      push[v * 3] += ((shaped[v * 3] + push[v * 3]) / r) * by;
      push[v * 3 + 2] += ((shaped[v * 3 + 2] + push[v * 3 + 2] - centre) / r) * by;
    }
    // And its rows evened out in height: under a grown bust the tee's rows down to the hem (12 cm of it as built) were
    // squeezed into its last few centimetres. Her bust above and the hem (eased only along itself) hold.
    const heights = new Float32Array(shaped.length);
    for (let v = 0; v < heights.length / 3; v++) heights[v * 3] = shaped[v * 3 + 1];
    const even = heights.slice();
    smoothHeld(table, even, HANG.even, free);
    for (let v = 0; v < heights.length / 3; v++) push[v * 3 + 1] += even[v * 3] - heights[v * 3];
  }
  // The folds, out from her upright line.
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    if (Number.isNaN(below[v])) continue;
    const x = shaped[v * 3] + push[v * 3], z = shaped[v * 3 + 2] + push[v * 3 + 2];
    const r = Math.hypot(x, centre - z);
    if (r < 1e-6) continue;
    // From nothing `grow` above the front of her breast, all of it `grow` below: down the breast into the hang.
    const apex = apexAt(field, hangWay(x, z, centre));
    if (Number.isNaN(apex)) continue;
    const t = Math.min(1, Math.max(0, (apex + HANG.grow - (shaped[v * 3 + 1] + push[v * 3 + 1])) / (2 * HANG.grow)));
    const round = hangWay(x, z, centre) * 0.2;
    const fold = HANG.depth * amount * fades[v] * t * t * (3 - 2 * t) * 0.5 * (1 - Math.cos((2 * Math.PI * round) / HANG.fold));
    push[v * 3] += (x / r) * fold;
    push[v * 3 + 2] += ((z - centre) / r) * fold;
  }
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const from = partner && partner[v] >= 0 ? partner[v] : v;
    moves[v * 3] += push[from * 3];
    moves[v * 3 + 1] += push[from * 3 + 1];
    moves[v * 3 + 2] += push[from * 3 + 2];
  }
}

/**
 * smoothMoves, a pass at a time, each point held where it started by all but `free` of each pass (0 holds it, 1 lets
 * it go): the eased points between held ones even out between them.
 */
function smoothHeld(table: SmoothTable, values: Float32Array, passes: number, free: Float32Array): void {
  const start = values.slice();
  for (let pass = 0; pass < passes; pass++) {
    smoothMoves(table, values, 1, SMOOTH_TOPS_EASE);
    for (let v = 0; v < free.length; v++) {
      for (let k = v * 3; k < v * 3 + 3; k++) values[k] = start[k] + (values[k] - start[k]) * free[v];
    }
  }
}

/** Points of a top this close together, as built, are one point (glTF splits them at seams). */
const SMOOTH_WELD = 1e-5;

/** A top's points welded into nodes, each node's neighbours (start..start+1 in `next`) and its points. */
export interface SmoothTable {
  /** Per point, its node. */
  node: Int32Array;
  nodes: number;
  start: Int32Array;
  next: Int32Array;
}

/** The smoothing table for a top's points as built (`bind`) and its triangles. */
export function smoothTable(bind: Float32Array, index: ArrayLike<number>): SmoothTable {
  const count = bind.length / 3;
  const node = new Int32Array(count);
  const seen = new Map<string, number>();
  let nodes = 0;
  for (let v = 0; v < count; v++) {
    const key = `${Math.round(bind[v * 3] / SMOOTH_WELD)},${Math.round(bind[v * 3 + 1] / SMOOTH_WELD)},${Math.round(bind[v * 3 + 2] / SMOOTH_WELD)}`;
    let n = seen.get(key);
    if (n === undefined) {
      n = nodes++;
      seen.set(key, n);
    }
    node[v] = n;
  }
  // Each edge between nodes, and how many triangles share it: an edge only one has is on the top's edge.
  const edges = new Map<number, number>();
  for (let t = 0; t + 2 < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const a = node[index[t + k]], b = node[index[t + ((k + 1) % 3)]];
      if (a === b) continue;
      const key = Math.min(a, b) * nodes + Math.max(a, b);
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  const edge = new Uint8Array(nodes);
  for (const [key, n] of edges) {
    if (n !== 1) continue;
    edge[Math.floor(key / nodes)] = 1;
    edge[key % nodes] = 1;
  }
  const around: number[][] = Array.from({ length: nodes }, () => []);
  for (const [key, n] of edges) {
    const a = Math.floor(key / nodes), b = key % nodes;
    // A point on the edge is eased only along it; a point inside, by all its neighbours.
    if (!edge[a] || n === 1) around[a].push(b);
    if (!edge[b] || n === 1) around[b].push(a);
  }
  const start = new Int32Array(nodes + 1);
  around.forEach((list, n) => (start[n + 1] = start[n] + list.length));
  const next = new Int32Array(start[nodes]);
  around.forEach((list, n) => next.set(list, start[n]));
  return { node, nodes, start, next };
}

/**
 * Points at one spot whose normals lean less than this apart (as a cosine) are lit as one. Further apart, the edge is
 * meant: the tee's hem, cuffs and neckline turn under at about a right angle (finish_tee in build_world.py), and
 * stay crisp.
 */
const WELD_NORMALS = 0.5;

/**
 * Gives every point at one spot (one node of `table`) the average of the normals there that lean its way, so no
 * hard edge shows where the export split them at a gentle corner.
 */
export function weldNormals(table: SmoothTable, normal: BufferAttribute): void {
  const { node, nodes } = table;
  const start = new Int32Array(nodes + 1);
  for (let v = 0; v < node.length; v++) start[node[v] + 1]++;
  for (let n = 0; n < nodes; n++) start[n + 1] += start[n];
  const fill = start.slice(0, nodes);
  const members = new Int32Array(node.length);
  for (let v = 0; v < node.length; v++) members[fill[node[v]]++] = v;
  const built = Float32Array.from(normal.array as ArrayLike<number>);
  for (let v = 0; v < node.length; v++) {
    const n = node[v];
    if (start[n + 1] - start[n] < 2) continue;
    const ox = built[v * 3], oy = built[v * 3 + 1], oz = built[v * 3 + 2];
    let x = 0, y = 0, z = 0;
    for (let i = start[n]; i < start[n + 1]; i++) {
      const m = members[i] * 3;
      if (built[m] * ox + built[m + 1] * oy + built[m + 2] * oz < WELD_NORMALS) continue;
      x += built[m];
      y += built[m + 1];
      z += built[m + 2];
    }
    const length = Math.hypot(x, y, z);
    if (length > 1e-9) normal.setXYZ(v, x / length, y / length, z / length);
  }
  normal.needsUpdate = true;
}

/**
 * Eases a top's points (`values`, any per-point vectors, changed in place) towards their neighbours', `passes` times
 * over, each pass easing by the next of `steps` in turn.
 */
export function smoothMoves(
  table: SmoothTable, moves: Float32Array, passes = SMOOTH_TOPS_PASSES, steps: readonly number[] = SMOOTH_TOPS_EASE,
): void {
  const { node, nodes, start, next } = table;
  let at = new Float32Array(nodes * 3);
  const members = new Float32Array(nodes);
  for (let v = 0; v < node.length; v++) {
    const n = node[v] * 3;
    at[n] += moves[v * 3];
    at[n + 1] += moves[v * 3 + 1];
    at[n + 2] += moves[v * 3 + 2];
    members[node[v]]++;
  }
  for (let n = 0; n < nodes; n++) for (let k = 0; k < 3; k++) at[n * 3 + k] /= members[n] || 1;
  let to = new Float32Array(nodes * 3);
  for (let pass = 0; pass < passes; pass++) {
    const ease = steps[pass % steps.length];
    for (let n = 0; n < nodes; n++) {
      const from = start[n], end = start[n + 1];
      for (let k = 0; k < 3; k++) {
        const own = at[n * 3 + k];
        if (end === from) {
          to[n * 3 + k] = own;
          continue;
        }
        let sum = 0;
        for (let i = from; i < end; i++) sum += at[next[i] * 3 + k];
        to[n * 3 + k] = own + ease * (sum / (end - from) - own);
      }
    }
    [at, to] = [to, at];
  }
  for (let v = 0; v < node.length; v++) moves.set(at.subarray(node[v] * 3, node[v] * 3 + 3), v * 3);
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
/**
 * Her breasts' skin, for where a pulled-down top goes under them: what the Bust bone carries at least this much of,
 * and how far below their lowest point the cloth taken still reaches.
 */
const PULL_UNDER_WEIGHT = 0.5;
const PULL_UNDER_BAND = 0.03;
/** A top lifted over her breasts is taken up to this far above their top (Dresser.overBreasts), and bunches there. */
const PULL_OVER_BAND = 0.03;
/** Her chest just under each breast as built (across, height): where its underside's gone says where the roll goes. */
const PULL_CREASE: readonly [number, number] = [0.06, 1.08];
/**
 * The rolled-up cloth: how far past the breasts it starts, how deep the roll is, how much it draws in towards her
 * middle, and how far it stands off what it lies on, at its near edge and its far edge.
 */
const PULL_ROLL = { gap: 0.006, height: 0.028, narrow: 0.06, thick: [0.006, 0.016] as const };
/** How wide each strip of a top pulled down is, across her, measured to its own neckline (see Dresser.planPull). */
const PULL_STRIP = 0.012;
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
  /** How many body points each point follows (FOLLOW_POINTS, or TOP_FOLLOW for fitted tops). */
  k: number;
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
const FACE_MATERIAL = /^T_(face_|lip|hair_f$|mouth$|teeth|tongue$|eye_|drop_)/;
/** Her eyes' pieces (build_world.py add_anime_eyes), and how each moves (face.ts FacePart). */
const EYE_MATERIAL = "T_eye_sclera";
const PUPIL_MATERIAL = "T_eye_pupil";
const EYE_PART: Readonly<Record<string, FacePart>> = {
  T_eye_sclera: "eyeWhite", T_eye_lid: "lid", T_eye_lid_low: "lidLow", T_eye_lash: "lash", T_eye_lash_low: "lashLow",
  T_eye_iris: "iris", T_eye_iris_dark: "iris", T_eye_shine: "iris", T_eye_pupil: "pupil",
  T_eye_wet: "iris", T_eye_heart: "pupil",
  // The upper lid's shadow on the white goes with the lid, as its lash line does.
  T_eye_shade: "lash",
  // Her upper eyelid's crease sits on the lid's far side, which stays put as the lid closes.
  T_eye_crease: "lid",
};
/** KP's extra layers on her face (face.ts FACE_EXTRAS): each shows only while her expression calls for it. */
const EXTRA_MATERIALS: Readonly<Record<string, (shape: FaceShape) => boolean>> = {
  T_eye_wet: (f) => f.wet >= FACE_EXTRAS.wet,
  T_eye_heart: (f) => f.heart >= FACE_EXTRAS.heart,
  T_drop_tear: (f) => f.tears >= FACE_EXTRAS.tears,
  T_drop_sweat: (f) => f.sweat >= FACE_EXTRAS.sweat[0],
  T_drop_sweat_more: (f) => f.sweat >= FACE_EXTRAS.sweat[1],
};
/** Her upper teeth, which stay with her skull as her mouth opens; her tongue, which can come out. */
const UPPER_TEETH_MATERIAL = "T_teeth";
const LOWER_TEETH_MATERIAL = "T_teeth_low";
const TONGUE_MATERIAL = "T_tongue";
const BROW_MATERIAL = "T_hair_f";
/** The planes of her face's skin, which her brows lie on. */
const SKIN_FACE_MATERIAL = /^T_face_/;
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
/**
 * The planes a blush is painted on (her cheeks and the tip of her nose): at rest they're the skin round them, as KP's
 * calm faces never blush, and the red comes into them only as she blushes.
 */
const BLUSH_RESTS_AS: Readonly<Record<string, string>> = { T_face_blush: "T_face_skin", T_face_pink: "T_face_skin" };
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
  /** Whether the model keeps her shape from before the build reshaped her (see MeshSlot.rest): the joints move as worked out there. */
  private readonly reshapedRest: boolean;
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
  /** Whether her nipples were last shaped held flat under a bra, rather than standing bare. */
  private nipplesHeld = false;
  /**
   * Her nipple discs, for a body built with them, and for each clothing mesh the points close over a nipple: which
   * disc and how far from its tip. They tent out as it stands, and are all that change when only her arousal does.
   */
  private readonly nipples: { slot: MeshSlot; discs: Disc[]; riders: Map<MeshSlot, Riders> } | null = null;
  /** The body points holding the clothes out over her cleavage, and each clothing mesh's points stretched across. */
  private readonly cleavage: { hold: CleavageHold; spans: Map<MeshSlot, ClothSpan> } | null = null;
  /** Her skin round her chest and the points of her tops kept out of it (see clearOfSkin). */
  private readonly clear: { skin: ClearSkin[]; cloths: Map<MeshSlot, Int32Array>; centre: number } | null = null;
  /** Her fitted tops, smoothed after the reshaping (see SMOOTH_TOPS). */
  private readonly smoothTops = new Map<MeshSlot, SmoothTable>();
  /** Her T-shirt, hanging from a big bust (see HANG), with its turned-under strips' folds (see turnedPartners). */
  private readonly hangTops = new Map<MeshSlot, Int32Array>();
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
  /** The front of her face round her brows (on her as shaped), and how far in front of it each point of them is. */
  private browSurface: ((x: number, y: number) => number | null) | null = null;
  private browSurfaceOn: unknown = null;
  private readonly browOffsets = new Map<MeshSlot, Float32Array>();
  private readonly pullPlans = new Map<MeshSlot, PullPlan>();
  /** The pulled meshes' normals as built, to put back once the pull's let go. */
  private readonly pullNormals = new Map<MeshSlot, Float32Array>();
  /** Each mesh's normals as built, and per mesh group the welded points and their smooth normals as built. */
  private readonly builtNormals = new Map<MeshSlot, Float32Array>();
  private readonly normalWelds = new Map<string, { ids: Int32Array[]; count: number; rest: Float32Array }>();

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
      // Where the build kept each point as she was before it reshaped her (see keep_slider_rest in build_world.py).
      const kept = mesh.geometry.getAttribute("_slider_rest");
      let rest: Float32Array | undefined;
      if (kept && kept.count === position.count) {
        rest = new Float32Array(position.count * 3);
        for (let v = 0; v < kept.count; v++) {
          point.fromBufferAttribute(kept, v).applyMatrix4(mesh.bindMatrix).toArray(rest, v * 3);
        }
      }
      const part = partOf(mesh, body)!;
      // The user's sculpted breast fixes, one per cup they sculpted at (see apply_sculpt_fixes in build_world.py).
      const cupFixes: { cup: number; delta: Float32Array }[] = [];
      const toBind = new Matrix3().setFromMatrix4(mesh.bindMatrix);
      for (const [attrName, attr] of Object.entries(mesh.geometry.attributes)) {
        const letter = /^_bust_fix_([a-z])$/.exec(attrName)?.[1]?.toUpperCase();
        if (!letter || attr.count !== position.count) continue;
        const delta = new Float32Array(attr.count * 3);
        for (let v = 0; v < attr.count; v++) point.fromBufferAttribute(attr, v).applyMatrix3(toBind).toArray(delta, v * 3);
        cupFixes.push({ cup: stopValue(CUPS, CUPS.labels.indexOf(letter)), delta });
      }
      if (part === "Cum") {
        mesh.material = stainMeshOf(mesh, body) ? stainRetroMaterial() : coatRetroMaterial();
        // Too close to the skin to shadow it cleanly.
        mesh.castShadow = false;
      }
      const material = mesh.material as Material;
      this.slots.push({
        mesh, part, original: material, worn: material, bind, follow: null, bodyStart: bodyCount, rest,
        cupFixes: cupFixes.length ? cupFixes : undefined,
      });
      if (part === "Body") bodyCount += position.count;
      mesh.skeleton.bones.forEach((bone, i) => {
        if (this.boneIndex.has(bone)) return;
        const joint = new Vector3().setFromMatrixPosition(inverse.copy(mesh.skeleton.boneInverses[i]).invert());
        const shiftBy = bone.userData?.slider_shift as number[] | undefined;
        const restJoint = Array.isArray(shiftBy) && shiftBy.length === 3 ? joint.clone().add(new Vector3(...shiftBy)) : joint.clone();
        const rest: BoneRest = {
          bone,
          label: bone.name.startsWith(`${body}_`) ? bone.name.slice(body.length + 1) : bone.name,
          parent: null,
          position: bone.position.clone(),
          quaternion: bone.quaternion.clone(),
          joint,
          restJoint,
        };
        this.boneIndex.set(bone, rest);
        this.bones.push(rest);
      });
    }
    for (const rest of this.bones) rest.parent = rest.bone.parent ? (this.boneIndex.get(rest.bone.parent) ?? null) : null;
    this.bodyCount = bodyCount;
    this.reshapedRest = this.slots.some((slot) => slot.rest !== undefined);
    // Her fitted tops, smoothed after each reshaping (see SMOOTH_TOPS), and lit smooth all over: the build left hard
    // edges inside the tee (its points at one spot with different normals), and one across the front at the top of its
    // hem band showed as a line across her. Each spot takes the average of its points' normals, before the lighting
    // keeps them as built (see refreshNormals).
    for (const slot of this.slots) {
      const { geometry } = slot.mesh;
      if (slot.part !== "Cloth" || !geometry.index || !SMOOTH_TOPS.includes(slot.original.name)) continue;
      const table = smoothTable(slot.bind, geometry.index.array as ArrayLike<number>);
      this.smoothTops.set(slot, table);
      if (HANG_TOPS.includes(slot.original.name)) {
        this.hangTops.set(slot, turnedPartners(slot.bind, table, geometry.index.array as ArrayLike<number>));
      }
      const normal = geometry.getAttribute("normal");
      if (normal) weldNormals(table, normal as BufferAttribute);
    }

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
      if (!FOLLOWING_PARTS.includes(slot.part) || bodyCount < FOLLOW_POINTS) continue;
      // Fitted tops, and the stains made on them, follow her skin more widely (see TOP_FOLLOW).
      const top = (slot.part === "Cloth" && SMOOTH_TOPS.includes(slot.original.name))
        || (slot.part === "Cum" && SMOOTH_TOPS.some((name) => slot.mesh.name.includes(`_${name}_`)));
      slot.follow = nearestBody(slot.bind, bodyPoints, top && bodyCount >= TOP_FOLLOW.k ? TOP_FOLLOW : undefined);
    }
    // Her clothes, and what landed on them, stretch across her cleavage instead of following the skin into it.
    const hold = cleavageHold(bodyPoints);
    if (hold.at.length) {
      const spans = new Map<MeshSlot, ClothSpan>();
      for (const slot of this.slots) {
        if (!slot.follow || !(slot.part === "Cloth" || (slot.part === "Cum" && stainMeshOf(slot.mesh, body)))) continue;
        // Only pieces that reach her chest, as in clearing (CLEAR_GARMENT_TOP): a breast hanging to her waist took
        // the span down with it, and pulled her leggings' waistband out to it in a wedge under her bust.
        if (reach(slot.bind) < CLEAR_GARMENT_TOP) continue;
        const span = clothSpan(hold, slot.bind);
        if (span) spans.set(slot, span);
      }
      if (spans.size) this.cleavage = { hold, spans };
    }
    // Her tops are kept out of her skin, where a bust grown past them would swallow them.
    const clearSkin: ClearSkin[] = [];
    this.slots.forEach((slot, s) => {
      const index = slot.mesh.geometry.index;
      if (slot.part !== "Body" || !index) return;
      // Her arms are told apart: a sleeve is kept out of them like anything else, but they don't hold her tops out
      // round her middle (see onShell).
      const skinIndex = slot.mesh.geometry.getAttribute("skinIndex");
      const skinWeight = slot.mesh.geometry.getAttribute("skinWeight");
      const arm = new Set<number>();
      slot.mesh.skeleton.bones.forEach((bone, i) => {
        if (CLEAR_NOT_SKIN.test(this.boneIndex.get(bone)?.label ?? "")) arm.add(i);
      });
      const verts: number[] = [], onArm: number[] = [];
      for (let v = 0; v < slot.bind.length / 3; v++) {
        if (!inClearRegion(slot.bind, v)) continue;
        let w = 0;
        if (skinIndex && skinWeight) for (let k = 0; k < 4; k++) if (arm.has(skinIndex.getComponent(v, k))) w += skinWeight.getComponent(v, k);
        verts.push(v);
        onArm.push(w >= 0.5 ? 1 : 0);
      }
      if (!verts.length) return;
      // Only the triangles round those points, for which way is out at each.
      const inside = new Set(verts);
      const tris: number[] = [];
      for (let t = 0; t < index.count; t += 3) {
        const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
        if (inside.has(a) || inside.has(b) || inside.has(c)) tris.push(a, b, c);
      }
      clearSkin.push({ slot: s, verts: Int32Array.from(verts), tris: Int32Array.from(tris), arm: Uint8Array.from(onArm) });
    });
    if (clearSkin.length) {
      // The shell's upright line: midway between her front and back at her chest, as built.
      let front = Infinity, back = -Infinity;
      for (const piece of clearSkin) {
        const points = this.slots[piece.slot].bind;
        piece.verts.forEach((v, n) => {
          const y = points[v * 3 + 1];
          if (piece.arm[n] || y < 1.1 || y > 1.3 || Math.abs(points[v * 3]) > 0.05) return;
          front = Math.min(front, points[v * 3 + 2]);
          back = Math.max(back, points[v * 3 + 2]);
        });
      }
      const centre = Number.isFinite(front + back) ? (front + back) / 2 : 0;
      const cloths = new Map<MeshSlot, Int32Array>();
      for (const slot of this.slots) {
        if (!slot.follow || !(slot.part === "Cloth" || (slot.part === "Cum" && stainMeshOf(slot.mesh, body)))) continue;
        // Each piece (material) by its own reach: an outfit's leggings are pieces of the same mesh as its top, and
        // pushed out over a breast hanging to her waist, their waistband stood out from her belly.
        if (reach(slot.bind) < CLEAR_GARMENT_TOP) continue;
        const verts: number[] = [];
        for (let v = 0; v < slot.bind.length / 3; v++) if (inClearRegion(slot.bind, v)) verts.push(v);
        if (verts.length) cloths.set(slot, Int32Array.from(verts));
      }
      if (cloths.size) this.clear = { skin: clearSkin, cloths, centre };
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
      if (discSlot.rest) discSlot.restShapeFrom = skinUnder(discs, discSlot.rest);
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
          const from = this.reshapedRest
            ? new Vector3().subVectors(rest.restJoint, rest.parent.restJoint)
            : new Vector3().subVectors(rest.joint, rest.parent.joint);
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
      // The sliders shape her as she was built, before the build reshaped her, and the change carries over to her as
      // she is (moves are offsets): where the model keeps that shape, the points and joints are taken from there.
      const asBuilt = slot.rest !== undefined;
      const from = asBuilt ? (slot.restShapeFrom ?? slot.rest!) : (slot.shapeFrom ?? bind);
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
          offset.subVectors(point, asBuilt ? rest.restJoint : rest.joint);
          sum.addScaledVector(reshape(boneTerms, offset, moved, weight).sub(offset), weight);
        }
        sum.add(joints).toArray(total, v * 3);
        joints.toArray(settled, v * 3);
      }
      // The user's sculpted fixes for the cup she's at, or the reviewed sizes either side of it.
      for (const fix of slot.cupFixes ?? []) {
        const amount = cupFixAmount(fix.cup, look.sliders.bust ?? 0);
        if (amount > 0) for (let k = 0; k < total.length; k++) total[k] += fix.delta[k] * amount;
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
        // Not her fitted tops (SMOOTH_TOPS): they bridge her cleavage as built and are kept out on her shell; over a
        // big bust the span's line from breast to breast cut across their lower insides and folded them into flaps.
        if (this.smoothTops.has(slot)) continue;
        spanCleavage(this.cleavage.hold, span, slot.bind, moves[this.slots.indexOf(slot)].total, bodyMoves);
      }
    }
    if (this.clear && active.size > 0) {
      const shaped = this.slots.map((slot) => slot.bind);
      for (const { slot } of this.clear.skin) {
        const { bind } = this.slots[slot];
        const { total } = moves[slot];
        const now = new Float32Array(bind.length);
        for (let i = 0; i < now.length; i++) now[i] = bind[i] + total[i];
        shaped[slot] = now;
      }
      const skin = clearGrid(this.clear.skin, shaped);
      const shell = shellOf(this.clear.skin, shaped, this.clear.centre);
      // Only the outfit she has on: there are hundreds of pieces in her wardrobe, and each was a few milliseconds.
      const outfit = outfitOf(this.body, look).mesh;
      const topGap = smoothTopGap(look.sliders.bust ?? 0);
      const topSteps = smoothTopSteps(look.sliders.bust ?? 0);
      const hang = hangAmount(look.sliders.bust ?? 0);
      let field: HangField | null = null;
      const shapedOf = (slot: MeshSlot, total: Float32Array) => {
        const now = new Float32Array(slot.bind.length);
        for (let i = 0; i < now.length; i++) now[i] = slot.bind[i] + total[i];
        return now;
      };
      // Her T-shirt before its stains, which hang with it.
      const order = [...this.clear.cloths].sort(([a], [b]) => Number(b.part === "Cloth") - Number(a.part === "Cloth"));
      for (const [slot, verts] of order) {
        if (slot.part === "Cloth" && outfitMeshOf(slot.mesh, this.body) !== outfit) continue;
        const { total } = moves[this.slots.indexOf(slot)];
        onShell(shell, verts, slot.bind, total);
        // A fitted top: smoothed once out on her shell, out on it again (smoothing pulls it in a little over her
        // curves), then kept out of her skin by more the bigger her bust (see SMOOTH_TOPS_GAP).
        const table = this.smoothTops.get(slot);
        if (table) {
          smoothMoves(table, total, SMOOTH_TOPS_PASSES * 2, topSteps);
          onShell(shell, verts, slot.bind, total);
        }
        // Her T-shirt hanging from a big bust, and its stains with it (see HANG).
        const turned = this.hangTops.get(slot);
        if (turned && hang > 0) {
          const shaped = shapedOf(slot, total);
          field = hangField(shaped, verts, this.clear.centre);
          if (field) hangTop(field, shaped, verts, total, hang, 0, turned, table);
        } else if (field && slot.part === "Cum" && slot.mesh.name.includes(`_${HANG_TOPS[0]}_`)) {
          hangTop(field, shapedOf(slot, total), verts, total, hang, HANG.lift);
        }
        const gap = table ? topGap : CLEAR_GAP;
        clearOfSkin(skin, clearOfSkin(skin, verts, slot.bind, total, gap), slot.bind, total, gap);
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
    // Her skin and clothes lit as they are now shaped, not as built (see refreshNormals).
    this.refreshNormals(moves.map((m) => m.total));
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
    // Sheer stockings: her skin colour shows through them below their top band.
    const sheer = sheerOf(this.body, look);
    const [skinPart, skinName] = LOOK_OPTIONS[this.body].colors.find((color) => color.id === "skin")?.parts[0] ?? ["Body", ""];
    const skin = this.slots.find((s) => s.part === skinPart && s.original.name === skinName);
    if (sheer && skin) {
      const tone = averageColor(skin.worn);
      for (const slot of this.slots) {
        if (slot.part !== "Cloth" || !sheer.bands.includes(slot.original.name)) continue;
        slot.worn = paint(slot.original, averageColor(slot.worn).clone().lerp(tone, sheer.amount));
        slot.mesh.material = slot.worn;
      }
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
    for (const [material, shows] of Object.entries(EXTRA_MATERIALS)) if (shows(shape)) shown.push(material);
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
      this.faceRig = faceRig(pointsOf([EYE_MATERIAL]), pointsOf([BROW_MATERIAL]), pointsOf(LIP_MATERIALS), pointsOf([TONGUE_MATERIAL]), pointsOf([PUPIL_MATERIAL]));
      this.faceRigOn = shaped;
    }
    const rig = this.faceRig;
    // Her brows lie on her face like her eyes, however she's shaped and wherever they move: the front of her face
    // round them as shaped, and how far in front of it each point of them was built (on her face as built).
    if (this.browSurfaceOn !== shaped) {
      this.browSurfaceOn = shaped;
      this.browSurface = null;
      this.browOffsets.clear();
      if (rig) {
        const low = Math.min(...rig.eyes.map((eye) => eye.centre[1] - eye.half[1])) - 0.02;
        const high = Math.max(...pointsOf([BROW_MATERIAL]).map((p) => p[1])) + 0.02;
        const built = (slot: MeshSlot, v: number) => [slot.bind[v * 3], slot.bind[v * 3 + 1], slot.bind[v * 3 + 2]];
        const front = (at: (slot: MeshSlot, v: number) => number[]) => {
          const triangles: number[][] = [];
          for (const slot of slots) {
            if (!SKIN_FACE_MATERIAL.test(slot.original.name)) continue;
            const index = slot.mesh.geometry.index;
            const count = index ? index.count : slot.bind.length / 3;
            for (let t = 0; t < count; t += 3) {
              const corners = [0, 1, 2].map((k) => at(slot, index ? index.getX(t + k) : t + k));
              if (corners.every((p) => p[1] < low - 0.02 || p[1] > high + 0.02)) continue;
              triangles.push(corners.flat());
            }
          }
          return triangles.length ? faceSurface(triangles) : null;
        };
        this.browSurface = front(shapedAt);
        const asBuilt = front(built);
        for (const slot of slots) {
          if (slot.original.name !== BROW_MATERIAL || !asBuilt) continue;
          const offsets = new Float32Array(slot.bind.length / 3);
          for (let v = 0; v < offsets.length; v++) {
            const [x, y, z] = built(slot, v);
            const under = asBuilt(x, y);
            offsets[v] = under === null ? Number.NaN : z - under;
          }
          this.browOffsets.set(slot, offsets);
        }
      }
    }
    const surface = this.browSurface;
    const to = [0, 0, 0];
    for (const slot of slots) {
      const count = slot.bind.length / 3;
      let moves = this.faceMoves.get(slot);
      if (!moves) this.faceMoves.set(slot, (moves = new Float32Array(count * 3)));
      moves.fill(0);
      const name = slot.original.name;
      const part: FacePart = EYE_PART[name] ??
        (name === BROW_MATERIAL ? "brow" : name === UPPER_TEETH_MATERIAL ? "teeth" : name === LOWER_TEETH_MATERIAL ? "lowerTeeth" : name === TONGUE_MATERIAL ? "tongue" : "skin");
      if (rig) {
        for (let v = 0; v < count; v++) {
          const p = shapedAt(slot, v);
          const moved = faceMove(rig, this.faceShape, p, part, to);
          // Her brows: kept as far in front of her face as they were built, wherever they are.
          const offset = part === "brow" && surface ? this.browOffsets.get(slot)?.[v] : undefined;
          if (offset !== undefined && !Number.isNaN(offset)) {
            const under = surface!(to[0], to[1]);
            if (under !== null) to[2] = under + offset;
          } else if (!moved) continue;
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
    // Down: under her breasts as they hang now, however big (a full bust hangs well below the crease as built), and
    // the cloth taken from as low as that.
    const under = dir === "down" ? this.underBreasts(totals) : null;
    const front = this.frontness(slot, own, totals, under === null ? PULL_BAND[0] : Math.min(PULL_BAND[0], under - PULL_UNDER_BAND));
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
    // Up, all of it from its hem, the lowest row too (left behind, it would stretch long slivers up to the roll), but
    // only as high as just over her breasts: a top reaching higher (a T-shirt up to her shoulders) bunches there,
    // and what's above stays put.
    const cut = dir === "down" ? (under ?? PULL_CREASE[1]) : low - 1e-3;
    const over = dir === "up" ? this.overBreasts(totals) : null;
    const ceiling = over === null ? Infinity : over + PULL_OVER_BAND;

    // Which points are taken: down, those above the breasts' undersides; up, all of it at the front below the ceiling.
    const taken: number[] = [];
    for (let v = 0; v < count; v++) {
      const y = shapedAt(own, v).y;
      if (front[v] <= 0 || y <= cut || y > ceiling) continue;
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
    const { gap, height, narrow, thick } = PULL_ROLL;
    // Each strip of the cloth (across her, PULL_STRIP wide) is measured to its own top edge: a neckline isn't level
    // (it dips between her breasts), and measured to the highest point of all, the strips would roll to different
    // depths and their faces fold over each other into teeth. So the neckline is the roll's one even edge: pulled
    // down, the roll's far edge; lifted, where the roll sits, just over it, so a scoop neck's roll sits on her chest
    // above her breasts, not up at her throat.
    const strip = (x: number) => Math.round(x / PULL_STRIP);
    const tops = new Map<number, number>();
    for (const v of taken) {
      const { x, y } = shapedAt(own, v);
      const b = strip(x);
      tops.set(b, Math.max(tops.get(b) ?? -Infinity, y));
    }
    const topAt = (x: number) => {
      const b = strip(x);
      let top = -Infinity;
      for (const n of [b - 1, b, b + 1]) top = Math.max(top, tops.get(n) ?? -Infinity);
      return Number.isFinite(top) ? top : high;
    };
    taken.forEach((v, k) => {
      const { x, y, z } = shapedAt(own, v);
      // How far through the pulled cloth the point is, from where the roll starts (0) to its far edge (1).
      const top = topAt(x);
      const t = Math.min(1, Math.max(0, dir === "down" ? (y - cut) / Math.max(0.01, top - cut) : (top - y) / Math.max(0.01, top - cut)));
      const to = dir === "down" ? cut - gap - height * t : top + gap + height * t;
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
  private frontness(slot: MeshSlot, index: number, totals: Float32Array[], bottom = PULL_BAND[0]): Float32Array {
    const count = slot.bind.length / 3;
    const out = new Float32Array(count);
    const skinIndex = slot.mesh.geometry.getAttribute("skinIndex");
    const skinWeight = slot.mesh.geometry.getAttribute("skinWeight");
    const arm = slot.mesh.skeleton.bones.map((bone) => /^(UpperArm|ForeArm|Hand)/.test(this.boneIndex.get(bone)?.label ?? ""));
    const total = totals[index];
    const { bind } = slot;
    for (let v = 0; v < count; v++) {
      const x = bind[v * 3] + total[v * 3];
      const y = bind[v * 3 + 1] + total[v * 3 + 1];
      const z = bind[v * 3 + 2] + total[v * 3 + 2];
      if (y < bottom || y > PULL_BAND[1] || Math.abs(x) > PULL_HALF_WIDTH) continue;
      let onArm = 0;
      for (let k = 0; k < 4; k++) if (arm[skinIndex.getComponent(v, k)]) onArm += skinWeight.getComponent(v, k);
      // Forwards is -z: the share of the way round from her side (0) to straight ahead (1).
      const ahead = -(z + PULL_AXIS) / Math.max(1e-6, Math.hypot(x, z + PULL_AXIS));
      const t = Math.min(1, Math.max(0, (ahead - PULL_FRONT[0]) / (PULL_FRONT[1] - PULL_FRONT[0])));
      out[v] = t * t * (3 - 2 * t) * Math.max(0, 1 - onArm * 2);
    }
    return out;
  }

  /**
   * Where a top pulled down goes under her breasts as shaped now: the crease under them, or lower where her breasts
   * hang below it (a full bust does), the lowest of her skin the Bust bone carries at the front.
   */
  private underBreasts(totals: Float32Array[]): number | null {
    const crease = this.creaseHeight(totals);
    // Every piece of her body, not just the one coloured as her skin: her breasts are mostly the piece her breast
    // band is painted on.
    let lowest = Infinity;
    this.slots.forEach((slot, s) => {
      if (slot.part !== "Body" || PULL_SKIP_SKIN.includes(slot.original.name)) return;
      const { bind, mesh } = slot;
      const bust = mesh.skeleton.bones.findIndex((bone) => this.boneIndex.get(bone)?.label === "Bust");
      const skinIndex = mesh.geometry.getAttribute("skinIndex");
      const skinWeight = mesh.geometry.getAttribute("skinWeight");
      if (bust < 0 || !skinIndex || !skinWeight) return;
      for (let v = 0; v < bind.length / 3; v++) {
        if (bind[v * 3 + 2] > 0) continue;
        let w = 0;
        for (let k = 0; k < 4; k++) if (skinIndex.getComponent(v, k) === bust) w += skinWeight.getComponent(v, k);
        if (w < PULL_UNDER_WEIGHT) continue;
        lowest = Math.min(lowest, bind[v * 3 + 1] + totals[s][v * 3 + 1]);
      }
    });
    // Never higher than it always went, for a small bust; lower for one that hangs below that.
    return Math.min(crease ?? PULL_CREASE[1], lowest);
  }

  /** The top of her breasts as shaped now: the highest of her skin at the front the Bust bone carries most of. */
  private overBreasts(totals: Float32Array[]): number | null {
    let highest = -Infinity;
    this.slots.forEach((slot, s) => {
      if (slot.part !== "Body" || PULL_SKIP_SKIN.includes(slot.original.name)) return;
      const { bind, mesh } = slot;
      const bust = mesh.skeleton.bones.findIndex((bone) => this.boneIndex.get(bone)?.label === "Bust");
      const skinIndex = mesh.geometry.getAttribute("skinIndex");
      const skinWeight = mesh.geometry.getAttribute("skinWeight");
      if (bust < 0 || !skinIndex || !skinWeight) return;
      for (let v = 0; v < bind.length / 3; v++) {
        if (bind[v * 3 + 2] > 0) continue;
        let w = 0;
        for (let k = 0; k < 4; k++) if (skinIndex.getComponent(v, k) === bust) w += skinWeight.getComponent(v, k);
        if (w < PULL_UNDER_WEIGHT) continue;
        highest = Math.max(highest, bind[v * 3 + 1] + totals[s][v * 3 + 1]);
      }
    });
    return Number.isFinite(highest) ? highest : null;
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
    this.reshapeNipples();
    this.showPieces();
  }

  /** Shapes her nipple discs and the clothes tenting over them again from what the last look left. */
  private reshapeNipples(): void {
    const { nipples, shaped } = this;
    if (!nipples || !shaped) return;
    this.shapeNipples(shaped.onSkin, shaped.totals, shaped.flat);
    const at = this.slots.indexOf(nipples.slot);
    this.writePositions(nipples.slot, shaped.totals[at], shaped.settled[at]);
    nipples.slot.mesh.geometry.computeVertexNormals();
    for (const [slot, riders] of nipples.riders) {
      const i = this.slots.indexOf(slot);
      this.writePositions(slot, shaped.totals[i], shaped.settled[i], riders.verts);
    }
  }

  /** Her vulva's shape from her look and how aroused she is; null for a body without one. */
  private vulvaShapeNow(): VulvaShape | null {
    const types = LOOK_OPTIONS[this.body].vulva;
    const type = types.find((t) => t.id === this.look.vulva) ?? types[0];
    if (!type) return null;
    const { sliders } = this.look;
    return vulvaShape(
      type, clampSlider(sliders.vulvaSize), clampSlider(sliders.vulvaFull), clampSlider(sliders.vulvaLips), this.vulvaArousal,
      this.vulvaOpen, clampSlider(sliders.vulvaThick),
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
    const standing = nippleProfile(type, clampSlider(sliders.nippleSize), clampSlider(sliders.areolaSize), this.arousal, clampSlider(sliders.bust, CUP_TOP));
    // A bra over them holds them flat, so nothing pokes through it or the clothes over it; bare, they stand.
    this.nipplesHeld = this.underwearOn().nipplesCovered;
    const profile = this.nipplesHeld ? standing.map((ring) => ({ ...ring, h: 0 })) : standing;
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
      for (let k = 0; k < follow.k; k++) {
        const at = follow.points[v * follow.k + k] * 3;
        const weight = follow.weights[v * follow.k + k];
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
  /**
   * The light follows the reshaping: without this a mesh kept the normals it was built with, so a breast grown from a
   * C cup was lit as the C cup, the edge of the small breast showing as a line across the big one. Each point's
   * normal as built turns by as much as the smooth surface there turned (worked out over all of a mesh's materials
   * together, points at the same spot welded, so there's no seam where the skin's materials meet), keeping the
   * build's sharp edges. The parts that light themselves (nipple discs, vulva, anus, penis) are left to that.
   */
  private refreshNormals(totals: readonly Float32Array[]): void {
    const own = new Set<MeshSlot>([
      ...(this.nipples ? [this.nipples.slot] : []), ...(this.vulva?.slots ?? []), ...(this.anus?.slots ?? []),
      ...(this.penis?.slots ?? []),
    ]);
    const groups = new Map<string, number[]>();
    this.slots.forEach((slot, i) => {
      if (own.has(slot) || !slot.mesh.geometry.getAttribute("normal")) return;
      const key = slot.mesh.parent && !(slot.mesh.parent instanceof SkinnedMesh) && slot.mesh.parent.name ? slot.mesh.parent.uuid : slot.mesh.uuid;
      const list = groups.get(key) ?? [];
      list.push(i);
      groups.set(key, list);
    });
    const n = new Vector3(), d = new Vector3();
    // Each welded point's normal, the area-weighted sum of its faces' normals, from each mesh's points (`at`).
    const sumFaces = (members: number[], ids: Int32Array[], count: number, at: (m: number) => Float32Array) => {
      const sum = new Float32Array(count * 3);
      members.forEach((i, m) => {
        const geometry = this.slots[i].mesh.geometry;
        const index = geometry.getIndex();
        const p = at(m);
        const own = ids[m];
        const corners = index ? index.count : p.length / 3;
        const tri = index ? (index.array as ArrayLike<number>) : null;
        for (let t = 0; t + 2 < corners; t += 3) {
          const v0 = tri ? tri[t] : t, v1 = tri ? tri[t + 1] : t + 1, v2 = tri ? tri[t + 2] : t + 2;
          const ax = p[v0 * 3], ay = p[v0 * 3 + 1], az = p[v0 * 3 + 2];
          const bx = p[v1 * 3], by = p[v1 * 3 + 1], bz = p[v1 * 3 + 2];
          const ux = p[v2 * 3] - bx, uy = p[v2 * 3 + 1] - by, uz = p[v2 * 3 + 2] - bz;
          const wx = ax - bx, wy = ay - by, wz = az - bz;
          const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
          for (const v of [v0, v1, v2]) {
            const id = own[v] * 3;
            sum[id] += nx; sum[id + 1] += ny; sum[id + 2] += nz;
          }
        }
      });
      for (let id = 0; id < count; id++) {
        const x = sum[id * 3], y = sum[id * 3 + 1], z = sum[id * 3 + 2];
        const length = Math.hypot(x, y, z) || 1;
        sum[id * 3] = x / length; sum[id * 3 + 1] = y / length; sum[id * 3 + 2] = z / length;
      }
      return sum;
    };
    const toLocal = new Matrix3();
    for (const [key, members] of groups) {
      let weld = this.normalWelds.get(key);
      if (!weld) {
        const lookup = new Map<string, number>();
        const ids = members.map((i) => {
          const bind = this.slots[i].bind;
          const out = new Int32Array(bind.length / 3);
          for (let v = 0; v < out.length; v++) {
            const k = `${Math.round(bind[v * 3] * 1e4)},${Math.round(bind[v * 3 + 1] * 1e4)},${Math.round(bind[v * 3 + 2] * 1e4)}`;
            let id = lookup.get(k);
            if (id === undefined) lookup.set(k, (id = lookup.size));
            out[v] = id;
          }
          return out;
        });
        const rest = sumFaces(members, ids, lookup.size, (m) => this.slots[members[m]].bind);
        weld = { ids, count: lookup.size, rest };
        this.normalWelds.set(key, weld);
      }
      const { ids, count, rest } = weld;
      const moved = members.some((i) => totals[i].some((x) => x !== 0));
      const now = moved
        ? sumFaces(members, ids, count, (m) => {
          const { bind } = this.slots[members[m]];
          const total = totals[members[m]];
          const out = new Float32Array(bind.length);
          for (let k = 0; k < bind.length; k++) out[k] = bind[k] + total[k];
          return out;
        })
        : rest;
      members.forEach((i, m) => {
        const slot = this.slots[i];
        const normal = slot.mesh.geometry.getAttribute("normal") as BufferAttribute;
        let built = this.builtNormals.get(slot);
        if (!built) this.builtNormals.set(slot, (built = Float32Array.from(normal.array as ArrayLike<number>)));
        const array = normal.array as Float32Array;
        if (!moved) {
          array.set(built);
        } else {
          toLocal.getNormalMatrix(unbind.copy(slot.mesh.bindMatrix).invert());
          for (let v = 0; v < ids[m].length; v++) {
            const id = ids[m][v];
            d.set(now[id * 3] - rest[id * 3], now[id * 3 + 1] - rest[id * 3 + 1], now[id * 3 + 2] - rest[id * 3 + 2]).applyMatrix3(toLocal);
            n.set(built[v * 3] + d.x, built[v * 3 + 1] + d.y, built[v * 3 + 2] + d.z);
            if (n.lengthSq() < 1e-12) n.fromArray(built, v * 3);
            n.normalize().toArray(array, v * 3);
          }
        }
        normal.needsUpdate = true;
        // A pull that has these normals saved puts back these, not the old shape's.
        if (this.pullNormals.has(slot)) this.pullNormals.set(slot, Float32Array.from(array));
      });
    }
  }

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
   * What her nipple discs wear: her breast band while she has it on, held flat under it so they don't show, and
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
   * Whether her outfit's top is on and hides her bra (OutfitDef.hidesBra): dressed, and that top neither stripped nor
   * lifted up over her breasts or pulled down off them as she shows (setPull). Pulled, the bra shows where it was,
   * as it must: hidden, her nipple discs would still wear its colour (discMaterial) as two bare patches.
   */
  private braHiddenByTop(): boolean {
    if (this.undressed || this.underwear) return false;
    const materials = outfitOf(this.body, this.look).hidesBra ?? [];
    const pulled = new Set(this.pullSlots().map((slot) => slot.original.name));
    return materials.some((name) => !covers(this.stripped, "Cloth", name) && !pulled.has(name));
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
    // Leggings taken "off" only come down (OutfitDef.legsDown): the bands from that one down stay on her, bunched in
    // the roll above them. The first band shown, or -1 while they're up or off.
    const { legsDown } = outfitOf(this.body, this.look);
    const downTo =
      legsDown && legwear && stockingsOff && !this.undressed && !this.underwear && legwear.bands.includes(HOSE_BANDS[0]) && legwear.bands.includes(legsDown)
        ? HOSE_BANDS.indexOf(legsDown)
        : -1;
    const shoes = shoeMeshFor(this.body, this.look);
    const under = this.underwearOn();
    // Putting on or taking off her bra holds her nipples flat or lets them stand.
    if (under.nipplesCovered !== this.nipplesHeld) this.reshapeNipples();
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
      if (slot.part === "Cloth" && (slot.original.name === LEGROLL_MATERIAL || (downTo >= 0 && LEGWEAR_PIECES.includes(slot.original.name)))) {
        const band = HOSE_BANDS.indexOf(slot.original.name);
        const shown = slot.original.name === LEGROLL_MATERIAL ? downTo >= 0 : band >= downTo && legs !== "hide";
        slot.mesh.visible = shown && outfitMeshOf(slot.mesh, this.body) === outfit;
        coverCoat(slot.mesh.material as Material);
        continue;
      }
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
        // Whatever styles she has on that aren't painted on her body, in their swatches' colours; her bra not while
        // a top that hides it is on (see OutfitDef.hidesBra).
        const top = under.topOn && !this.braHiddenByTop() ? under.top : null;
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
      if (slot.part === "Body" && ([CREASE_MATERIAL, CREASE_MID_MATERIAL, HATCH_MATERIAL].includes(slot.original.name) || slot.original.name in EXTRA_MATERIALS)) {
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
          const female = this.body === "Female";
          const spread = female ? BLUSH_SPREAD[face.original.name] : undefined;
          const flushed = spread ? spread.depth * Math.max(0, (blush - spread.from) / (1 - spread.from)) : 0;
          const restsAs = female ? BLUSH_RESTS_AS[face.original.name] : undefined;
          const round = restsAs ? this.slots.find((s) => s.part === "Body" && s.original.name === restsAs) : undefined;
          const base = averageColor((round ?? face).worn).clone();
          return flushed > 0 ? base.lerp(BLUSHED, flushed) : round ? base : null;
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
  const last = best.length - 1;
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
    if (reach > 0 && best[best.length - 1] < reach * reach) return;
  }
}

/**
 * For each of `points`, the nearest body points, weighted by closeness, and how much it keeps its own move.
 * The body points go into a grid first, so each point only searches near itself rather than the whole body: the
 * same nearest points as checking every one (ties to the lower index), in a fraction of the time.
 */
export function nearestBody(
  points: Float32Array, body: Float32Array, follow: { k: number; soft: number } = { k: FOLLOW_POINTS, soft: FOLLOW_SOFT },
): FollowTable {
  const count = points.length / 3;
  const bodyCount = body.length / 3;
  const K = follow.k;
  const found = new Int32Array(count * K);
  const weights = new Float32Array(count * K);
  const own = new Float32Array(count);
  const best = new Float64Array(K);
  const bestAt = new Int32Array(K);
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
    for (let k = 0; k < K; k++) {
      const weight = 1 / (Math.sqrt(best[k]) + follow.soft) ** 2;
      found[v * K + k] = bestAt[k];
      weights[v * K + k] = weight;
      sum += weight;
    }
    for (let k = 0; k < K; k++) weights[v * K + k] /= sum;
    const nearest = Math.sqrt(best[0]);
    own[v] = Math.min(1, Math.max(0, (nearest - FOLLOW_NEAR) / (FOLLOW_FAR - FOLLOW_NEAR)));
  }
  return { points: found, weights, own, k: K };
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
  if (outfit !== options.outfits[0] || options.defaultOutfit) look.outfit = outfit.id;
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
    // A people's own type only for them, once they're in the game.
    const type = pick(options.penis.filter((t) => !t.people));
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
  // A body that starts in another outfit than its first names every outfit, the first too; one saved with none (from
  // before it had that default) comes back in the default, in its colours where none were set.
  const named = playerOutfits(body).find((outfit) => outfit.id === data.outfit);
  let startUnder: OutfitDef["under"];
  if (named && (named !== options.outfits[0] || options.defaultOutfit)) look.outfit = named.id;
  else if (options.defaultOutfit) {
    const start = outfitOf(body, { outfit: options.defaultOutfit });
    look.outfit = start.id;
    for (const [id, hex] of Object.entries(start.preset)) if (!(id in look.colors)) look.colors[id] = hex;
    startUnder = start.under;
  }
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
  // A save from before she started in the tee, still in her old band and braies, gets the tee's own underwear too.
  if (startUnder?.bra && !look.bra) look.bra = startUnder.bra;
  if (startUnder?.briefs && !look.briefs) look.briefs = startUnder.briefs;
  // A save from when her everyday clothes came with a sexy set, still wearing exactly that set, gets the plain one
  // they come with now (EVERYDAY_UNDER), and its colour too while it's still the old set's.
  const old = look.outfit ? OLD_EVERYDAY_UNDER[look.outfit] : undefined;
  if (old && look.bra === old.bra && look.briefs === old.briefs) {
    const now = outfitOf(body, look);
    look.bra = EVERYDAY_UNDER.bra;
    look.briefs = EVERYDAY_UNDER.briefs;
    for (const id of ["bra", "smalls"] as const) {
      if (look.colors[id] === old.color && now.preset[id]) look.colors[id] = now.preset[id];
    }
  }
  if (Array.isArray(data.jewellery) && options.jewellery.length) {
    look.jewellery = options.jewellery.map((def) => def.id).filter((id) => (data.jewellery as unknown[]).includes(id));
  }
  return look;
}

export type Looks = Record<BodyName, Look>;

export function readLooks(raw: unknown): Looks | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<Record<BodyName, unknown>>;
  const her = readLook(data.Female, "Female");
  if (her) startHerSave(her, (data.Female as Partial<Look>).sliders);
  return { Male: readLook(data.Male, "Male") ?? startLook("Male"), Female: her ?? startLook("Female") };
}

/**
 * Brings a save of hers made before she started bigger (startSliders) up to it: any of those she never set comes
 * in at the start value. One she set herself stays, even as built (stored as 0, which is kept so it reads back).
 */
function startHerSave(look: Look, saved: unknown): void {
  const set = saved && typeof saved === "object" ? (saved as Record<string, unknown>) : {};
  for (const [id, start] of Object.entries(startSliders())) {
    if (!(id in set)) look.sliders[id] = start;
    else look.sliders[id] ??= 0;
  }
}

const LOOKS_KEY = "tarven.looks";

/** The looks last made on the customise screen, or both as built. */
export function loadLooks(): Looks {
  try {
    const text = localStorage.getItem(LOOKS_KEY);
    if (text) return readLooks(JSON.parse(text)) ?? startLooks();
  } catch {
    // No storage, or a broken entry: start as built.
  }
  return startLooks();
}

export function storeLooks(looks: Looks): void {
  try {
    localStorage.setItem(LOOKS_KEY, JSON.stringify(looks));
  } catch {
    // Private mode or full storage: the looks last until the page closes.
  }
}
