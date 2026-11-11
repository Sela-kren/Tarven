import { Color, Material, Matrix4, MeshLambertMaterial, Object3D, Quaternion, SkinnedMesh, Vector3 } from "three";
import { solidRetroMaterial } from "./retro";
import type { LegSize } from "./skirt";

/**
 * Character customisation: body sliders, skin, face and clothing colours, and pieces that can be taken off.
 * Everything starts at the model as built; a slider at 0 or a colour left unset changes nothing.
 */

export type BodyName = "Male" | "Female";
export const BODY_NAMES: readonly BodyName[] = ["Male", "Female"];
export type MeshPart = "Body" | "Cloth" | "Hair" | "Shoes";
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
}

export function newLook(): Look {
  return { sliders: {}, colors: {}, hidden: [] };
}

export function copyLook(look: Look): Look {
  const copy: Look = { sliders: { ...look.sliders }, colors: { ...look.colors }, hidden: [...look.hidden] };
  if (look.hairstyle) copy.hairstyle = look.hairstyle;
  if (look.outfit) copy.outfit = look.outfit;
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
  /** The growth is full at the first height and fades out by the second. */
  fade?: readonly [number, number];
  /** Lengthwise growth is measured from this height above the joint instead of from the joint itself. */
  pivot?: number;
  /** Only these mesh parts change, as hair sliders leave the head under the hair alone. Joints never move for these. */
  parts?: readonly MeshPart[];
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

/** A hairstyle: the mesh that shows for it, "<Body>_Hair<mesh>", or null for none at all. */
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
}

export interface LookOptions {
  sliders: SliderDef[];
  colors: ColorDef[];
  pieces: PieceDef[];
  /** The first is the character's own hair, which the look starts with. */
  hairstyles: HairstyleDef[];
  /** The first is the character's own outfit, which the look starts with. */
  outfits: OutfitDef[];
}

const both = (label: string) => [`${label}_L`, `${label}_R`];
/** Rear changes are full from 3 cm below the glute joint and gone 11 cm above it, at the small of the back. */
const REAR_FADE = [-0.03, 0.11] as const;
const terms = (bones: string[], grow: BoneTerm["grow"], extra: Omit<BoneTerm, "bone" | "grow"> = {}): BoneTerm[] =>
  bones.map((bone) => ({ bone, grow, ...extra }));

const SKIN_TONES = ["#f6d5be", "#eab594", "#dba07f", "#c68a64", "#a86f4c", "#8a5536", "#6b3f27", "#4a2a1a"];
const HAIR_COLORS = ["#130f0f", "#3b2416", "#6b4226", "#a0663a", "#8c2f1c", "#c9a066", "#e3cf9c", "#9a948a", "#e8e4dc"];
const EYE_COLORS = ["#0a0807", "#192126", "#3a2416", "#5b8ead", "#3d6e3f", "#7a5a2c", "#6a6a78"];
const LIP_COLORS = ["#cc706d", "#e59993", "#d88a7a", "#b04a52", "#8c3a3a", "#9e6554"];
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
 * Joints, measured on the models: the female's knee is 0.33 below the hip joint and her ankle about 0.35
 * below the knee; the male's are 0.42 and 0.46. Her torso joint is at the waist, shoulders 0.32 above it.
 */
const FEMALE_SLIDERS: SliderDef[] = [
  { id: "height", label: "Height", tab: "body", height: 0.06, terms: [] },
  {
    id: "build", label: "Build", tab: "body", terms: [
      ...terms(["Torso"], [0.1, 0, 0.1]),
      ...terms(["Hips"], [0.08, 0, 0.08]),
      ...terms(both("Thigh"), [0.15, 0, 0.15]),
      ...terms(both("Shin"), [0.1, 0, 0.1], { fade: [0, -0.3] }),
      ...terms(both("UpperArm"), [0.15, 0, 0.15]),
      ...terms(both("ForeArm"), [0.12, 0, 0.12]),
      ...terms(["Belly"], [0.2, 0.1, 0.2]),
      ...terms(both("Glute"), [0.1, 0.1, 0.1]),
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
      ...terms(both("Glute"), [0.12, 0.08, 0.15], { fade: REAR_FADE }),
    ],
  },
  {
    id: "legs", label: "Leg length", tab: "body", terms: [
      ...terms(both("Thigh"), [0, 0.1, 0], { span: [-0.33, 0] }),
      ...terms(both("Shin"), [0, 0.1, 0], { span: [-0.35, 0] }),
    ],
  },
  {
    id: "thighs", label: "Thighs", tab: "body", terms: terms(both("Thigh"), [0.18, 0, 0.18]),
  },
  {
    id: "arms", label: "Arms", tab: "body", terms: [
      ...terms(both("UpperArm"), [0.18, 0, 0.18]),
      ...terms(both("ForeArm"), [0.15, 0, 0.15]),
    ],
  },
  // The bust is weighted on each breast, with a crease under them that holds the fold. The bone's joint sits
  // about 4 cm behind the front of the breasts, so most of the growth is forwards. Here +z is backwards.
  {
    // A fuller bust is heavier: it drops and comes forwards as it grows. Shrinking stops well short of flat.
    id: "bust", label: "Size", tab: "body", group: "Bust",
    terms: terms(["Bust"], [0.35, 0.55, 1.6], { shrink: [0.12, 0.15, 0.45], shift: [0, -0.03, -0.012], shrinkShift: [0, 0, 0] }),
  },
  { id: "bustLift", label: "Lift", tab: "body", group: "Bust", terms: terms(["Bust"], [0, 0, 0], { shift: [0, 0.025, -0.004] }) },
  { id: "bustSpacing", label: "Spacing", tab: "body", group: "Bust", terms: terms(["Bust"], [0.3, 0, 0], { shrink: [0.2, 0, 0] }) },
  {
    id: "bustProjection", label: "Projection", tab: "body", group: "Bust",
    terms: terms(["Bust"], [0, 0, 0.9], { shrink: [0, 0, 0.4] }),
  },
  // Each glute has its own bone, about 3 cm inside the curve of the rear. The rear is fullest low down and
  // blends into the small of the back, so every change fades out above the joint instead of leaving a shelf.
  {
    id: "rear", label: "Size", tab: "body", group: "Rear",
    terms: terms(both("Glute"), [0.25, 0.18, 0.32], {
      shrink: [0.12, 0.1, 0.3], shift: [0, -0.012, 0.008], shrinkShift: [0, 0, 0], fade: REAR_FADE,
    }),
  },
  {
    id: "rearLift", label: "Lift", tab: "body", group: "Rear",
    terms: terms(both("Glute"), [0, 0, 0], { shift: [0, 0.02, 0.004], fade: REAR_FADE }),
  },
  {
    id: "rearWidth", label: "Width", tab: "body", group: "Rear", terms: [
      { bone: "Glute_L", grow: [0.25, 0, 0], shift: [-0.012, 0, 0], fade: REAR_FADE },
      { bone: "Glute_R", grow: [0.25, 0, 0], shift: [0.012, 0, 0], fade: REAR_FADE },
    ],
  },
  {
    id: "rearProjection", label: "Projection", tab: "body", group: "Rear",
    terms: terms(both("Glute"), [0, 0, 0.5], { shrink: [0, 0, 0.35], shift: [0, 0, 0.008], fade: REAR_FADE }),
  },
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

const FEMALE_COLORS: ColorDef[] = [
  {
    id: "skin", label: "Skin tone", tab: "skin", mode: "tone", palette: SKIN_TONES,
    parts: [
      ["Body", "T_skin_f"], ["Body", "T_face_skin"], ["Body", "T_face_mid"], ["Body", "T_face_cool"],
      ["Body", "T_face_lit"], ["Body", "T_face_white"], ["Body", "T_face_blush"], ["Body", "T_face_pink"],
    ],
  },
  { id: "lips", label: "Lips", tab: "face", mode: "dye", palette: LIP_COLORS, follows: "skin", parts: [["Body", "T_lip"], ["Body", "T_lip_lit"]] },
  { id: "eyes", label: "Eyes", tab: "face", mode: "dye", palette: EYE_COLORS, parts: [["Body", "T_soot"]] },
  { id: "hair", label: "Hair and brows", tab: "hair", mode: "dye", palette: HAIR_COLORS, parts: [["Hair", "T_hair_f"], ["Body", "T_hair_f"]] },
  { id: "blouse", label: "Blouse", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_linen"]] },
  { id: "bodice", label: "Bodice", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_bodice"]] },
  { id: "skirt", label: "Skirt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_skirt"]] },
  { id: "apron", label: "Apron", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_apron"]] },
  { id: "belt", label: "Belt", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_leather"]] },
  { id: "stockings", label: "Stockings", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_hose"], ["Shoes", "T_hose"]] },
  { id: "shoes", label: "Shoes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Shoes", "T_leather"]] },
  { id: "smalls", label: "Smallclothes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Body", "T_smalls"]] },
  // The dirndl's arm ribbons and laces, and the priestess's set. Gems are on both.
  { id: "ribbons", label: "Ribbons", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_ribbon"]] },
  { id: "top", label: "Top", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_top"]] },
  { id: "sleeves", label: "Sleeves", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_sheer"]] },
  { id: "girdle", label: "Girdle", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_girdle"]] },
  { id: "drapes", label: "Drapes", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_drape"]] },
  { id: "jewels", label: "Jewellery", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_jewel"]] },
  { id: "gems", label: "Gems", tab: "clothes", mode: "dye", palette: GEM_COLORS, parts: [["Cloth", "T_gem"]] },
  // The pirate's rig. Her corset is the bodice, her shirt the blouse, and her belt and corset laces the belt.
  ...pirateColors(),
  { id: "feather", label: "Feather", tab: "clothes", mode: "dye", palette: CLOTH_COLORS, parts: [["Cloth", "T_plume"]] },
];

const FEMALE_OUTFITS: OutfitDef[] = [
  {
    id: "tavern", label: "Tavern dress", mesh: "",
    colors: ["blouse", "bodice", "skirt", "apron", "belt", "stockings", "shoes", "smalls"],
    preset: {},
  },
  {
    // Olive-gold bodice and skirt, a white chemise, a green apron and ribbons, and white socks.
    id: "dirndl", label: "Dirndl", mesh: "Dirndl",
    colors: ["blouse", "ribbons", "bodice", "skirt", "apron", "gems", "shoes", "smalls"],
    preset: {
      blouse: "#f1ece0", ribbons: "#2e5e3e", bodice: "#6e6233", skirt: "#5c5530", apron: "#2f6040",
      gems: "#3f9a5a", stockings: "#f1ece0", shoes: "#3d2314",
    },
  },
  {
    // Gold and cream: a gold top and girdle, pale sleeves and drapes, gold jewellery with blue gems.
    id: "priestess", label: "Priestess", mesh: "Priestess",
    colors: ["top", "sleeves", "girdle", "drapes", "jewels", "gems", "shoes", "smalls"],
    preset: {
      top: "#b8892e", sleeves: "#efe4c4", girdle: "#b8892e", drapes: "#efe6cf", jewels: "#c99a3a",
      gems: "#3aa6d6", shoes: "#9a7430", stockings: "#9a7430", smalls: "#b8892e",
    },
  },
  {
    // A cream shirt, an oxblood corset under a red sash, brown breeches, black boots, and a cocked hat with a white feather.
    id: "pirate", label: "Pirate", mesh: "Pirate", guestOnly: true,
    colors: ["hat", "braid", "feather", "blouse", "bodice", "sash", "belt", "breeches", "boots", "shoes", "smalls"],
    preset: {
      hat: "#1c1716", braid: "#c99a3a", feather: "#efebe2", blouse: "#ece4d2", bodice: "#5b1417", sash: "#9a2420",
      belt: "#3d2314", breeches: "#4c3c2b", boots: "#221a15", shoes: "#221a15", stockings: "#221a15",
    },
  },
];

const MALE_COLORS: ColorDef[] = [
  {
    id: "skin", label: "Skin tone", tab: "skin", mode: "tone", palette: SKIN_TONES,
    parts: [["Body", "T_skin"], ["Body", "T_skin_lit"], ["Body", "T_skin_deep"], ["Body", "T_skin_shade"]],
  },
  { id: "lips", label: "Lips", tab: "face", mode: "dye", palette: LIP_COLORS, follows: "skin", parts: [["Body", "T_lip_m"]] },
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
    ],
  },
};

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
  const pattern = new RegExp(`^${body}_(Body|Cloth|Hair|Shoes)`);
  for (let node: Object3D | null = object; node; node = node.parent) {
    const match = pattern.exec(node.name);
    if (match) return match[1] as MeshPart;
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
  return next;
}

export function hairMeshFor(body: BodyName, look: Pick<Look, "hairstyle">): string | null {
  const styles = LOOK_OPTIONS[body].hairstyles;
  return (styles.find((style) => style.id === look.hairstyle) ?? styles[0]).mesh;
}

/** The outfits a player can choose: all but those only guests wear for now. */
export function playerOutfits(body: BodyName): OutfitDef[] {
  return LOOK_OPTIONS[body].outfits.filter((outfit) => !outfit.guestOnly);
}

/** How many ways a guest's pirate rig can be coloured. */
export const PIRATE_LOOKS = 4;

/** Colours over the pirate preset, so a crew of them don't all look alike. The first is the preset itself. */
const PIRATE_VARIANTS: Record<BodyName, Record<string, string>[]> = {
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
};

/** The colours a guest's pirate rig is put on with: its preset, changed by one of the variants. */
export function pirateGuestColors(body: BodyName, variant: number): Record<string, string> {
  const pirate = LOOK_OPTIONS[body].outfits.find((outfit) => outfit.id === "pirate")!;
  const index = ((variant % PIRATE_LOOKS) + PIRATE_LOOKS) % PIRATE_LOOKS;
  return { ...pirate.preset, ...PIRATE_VARIANTS[body][index] };
}

/**
 * Recolours a model's materials for these colours, leaving its shape alone, and shows only its own hair.
 * For guests, which share their meshes. They wear the character's own outfit unless another is named.
 */
export function dressColors(model: Object3D, body: BodyName, colors: Record<string, string>, outfit?: string): void {
  const worn = outfitOf(body, { outfit }).mesh;
  const slots: { mesh: SkinnedMesh; part: MeshPart; original: Material }[] = [];
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || Array.isArray(object.material)) return;
    const part = partOf(object, body);
    if (part) slots.push({ mesh: object, part, original: object.material });
  });
  const originals = (part: MeshPart, name: string) => slots.find((s) => s.part === part && s.original.name === name)?.original;
  for (const slot of slots) {
    slot.mesh.material = materialFor(body, slot.part, slot.original, colors, originals);
    if (slot.part === "Hair") slot.mesh.visible = hairMeshOf(slot.mesh, body) === "";
    // Only the outfit they wear shows; the others' meshes stay hidden.
    if (slot.part === "Cloth") slot.mesh.visible = outfitMeshOf(slot.mesh, body) === worn;
  }
}

// ---- Shape --------------------------------------------------------------------------------------

interface ActiveTerm {
  grow: [number, number, number];
  shift?: [number, number, number];
  span?: readonly [number, number];
  fade?: readonly [number, number];
  pivot?: number;
  parts?: readonly MeshPart[];
}

/** Moves a point `d`, measured from a bone's joint, as that bone's active terms reshape it. */
export function reshape(active: readonly ActiveTerm[], d: Vector3, out: Vector3): Vector3 {
  out.copy(d);
  for (const term of active) {
    let weight = 1;
    if (term.fade) {
      const [full, none] = term.fade;
      weight = Math.min(1, Math.max(0, (d.y - none) / (full - none)));
    }
    if (weight === 0) continue;
    const [gx, gy, gz] = term.grow;
    out.x *= 1 + gx * weight;
    out.z *= 1 + gz * weight;
    if (gy !== 0) {
      const from = out.y - (term.pivot ?? 0);
      const along = term.span ? Math.min(term.span[1], Math.max(term.span[0], from)) : from;
      out.y += gy * weight * along;
    }
    if (term.shift) {
      out.x += term.shift[0] * weight;
      out.y += term.shift[1] * weight;
      out.z += term.shift[2] * weight;
    }
  }
  return out;
}

/** The terms each bone gets from these slider settings, by bone label (the name without the body prefix). */
export function activeTerms(body: BodyName, sliders: Record<string, number>): Map<string, ActiveTerm[]> {
  const byBone = new Map<string, ActiveTerm[]>();
  for (const def of LOOK_OPTIONS[body].sliders) {
    const value = clampSlider(sliders[def.id]);
    if (value === 0) continue;
    for (const term of def.terms) {
      const list = byBone.get(term.bone) ?? [];
      const amount = value < 0 && term.shrink ? term.shrink : term.grow;
      // shrinkShift is the move at -1 itself, so it is scaled by how far below 0 the slider is.
      const move = value < 0 && term.shrinkShift ? term.shrinkShift.map((v) => -v) : term.shift;
      list.push({
        grow: [amount[0] * value, amount[1] * value, amount[2] * value],
        shift: move ? [move[0] * value, move[1] * value, move[2] * value] : undefined,
        span: term.span,
        fade: term.fade,
        pivot: term.pivot,
        parts: term.parts,
      });
      byBone.set(term.bone, list);
    }
  }
  return byBone;
}

const clampSlider = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;

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
  follow: { points: Int32Array; weights: Float32Array; own: Float32Array } | null;
  /** Where this mesh's points start in the shared list of body points, for body meshes. */
  bodyStart: number;
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
const FOLLOWING_PARTS: readonly MeshPart[] = ["Cloth", "Shoes"];

const point = new Vector3();
const offset = new Vector3();
const moved = new Vector3();

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
  /** Clothes guests have got off this character tonight; a state of the night, never part of the look. */
  private stripped: [MeshPart, string][] = [];
  private look: Look = newLook();

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
    for (const slot of this.slots) {
      if (FOLLOWING_PARTS.includes(slot.part) && bodyCount >= FOLLOW_POINTS) slot.follow = nearestBody(slot.bind, bodyPoints);
    }

    let floor = Infinity;
    for (const slot of this.slots) for (let i = 1; i < slot.bind.length; i += 3) floor = Math.min(floor, slot.bind[i]);
    this.floor = floor;
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
    this.undressed = undressed;
    this.showPieces();
  }

  /**
   * Takes off the clothes with these colour ids (the wardrobe's garment ids), or puts everything back with none.
   * The shoes stay. Clothing comes off the clothing layer; the smallclothes are painted on the body, so taking
   * them off paints them over in the skin's colour instead.
   */
  setStripped(ids: readonly string[]): void {
    this.stripped = LOOK_OPTIONS[this.body].colors
      .filter((color) => color.tab === "clothes" && ids.includes(color.id))
      .flatMap((color) => color.parts)
      .filter(([part]) => part !== "Shoes");
    this.showPieces();
  }

  /** Puts a look on: reshapes the meshes, moves the joints to match, and recolours. Puts the bones at rest. */
  apply(look: Look): void {
    this.look = look;
    const active = activeTerms(this.body, look.sliders);

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
      for (let v = 0; v < count; v++) {
        point.fromArray(bind, v * 3);
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
          sum.addScaledVector(reshape(boneTerms, offset, moved).sub(offset), weight);
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
      const { follow } = slot;
      if (!follow || active.size === 0) return;
      const { total } = moves[i];
      for (let v = 0; v < total.length / 3; v++) {
        let x = 0, y = 0, z = 0;
        for (let k = 0; k < FOLLOW_POINTS; k++) {
          const at = follow.points[v * FOLLOW_POINTS + k] * 3;
          const weight = follow.weights[v * FOLLOW_POINTS + k];
          x += bodyMoves[at] * weight;
          y += bodyMoves[at + 1] * weight;
          z += bodyMoves[at + 2] * weight;
        }
        const own = follow.own[v];
        total[v * 3] = x + (total[v * 3] - x) * own;
        total[v * 3 + 1] = y + (total[v * 3 + 1] - y) * own;
        total[v * 3 + 2] = z + (total[v * 3 + 2] - z) * own;
      }
    });

    // Longer or shorter legs would lift the feet off the floor or sink them into it: the whole body moves to match.
    let lowest = Infinity;
    for (const [i, slot] of this.slots.entries()) {
      for (let y = 1; y < slot.bind.length; y += 3) lowest = Math.min(lowest, slot.bind[y] + moves[i].total[y]);
    }
    const lift = active.size > 0 && Number.isFinite(lowest) ? this.floor - lowest : 0;

    // The mesh keeps everything but the joints' moves, which the bones now carry.
    const inverse = new Matrix4();
    for (const [i, slot] of this.slots.entries()) {
      const { mesh, bind } = slot;
      const { total, settled } = moves[i];
      const geometry = mesh.geometry;
      const position = geometry.getAttribute("position");
      inverse.copy(mesh.bindMatrix).invert();
      for (let v = 0; v < position.count; v++) {
        point.set(
          bind[v * 3] + total[v * 3] - settled[v * 3],
          bind[v * 3 + 1] + total[v * 3 + 1] - settled[v * 3 + 1],
          bind[v * 3 + 2] + total[v * 3 + 2] - settled[v * 3 + 2],
        ).applyMatrix4(inverse);
        position.setXYZ(v, point.x, point.y, point.z);
      }
      position.needsUpdate = true;
      geometry.boundingBox = null;
      geometry.boundingSphere = null;
    }

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
    for (const slot of this.slots) {
      const stripped = covers(this.stripped, slot.part, slot.original.name);
      if (slot.part === "Body") {
        const bare = stripped || (this.undressed && covers(painted, slot.part, slot.original.name));
        slot.mesh.material = bare && skin ? skin.worn : slot.worn;
        continue;
      }
      const off = pieces.some((piece) => covers(piece.parts, slot.part, slot.original.name)) || stripped;
      const otherStyle =
        (slot.part === "Hair" && hairMeshOf(slot.mesh, this.body) !== hair) ||
        (slot.part === "Cloth" && outfitMeshOf(slot.mesh, this.body) !== outfit);
      slot.mesh.visible = !off && !otherStyle && !(this.undressed && slot.part === "Cloth");
    }
  }
}

/** For each of `points`, the nearest body points, weighted by closeness, and how much it keeps its own move. */
function nearestBody(points: Float32Array, body: Float32Array): { points: Int32Array; weights: Float32Array; own: Float32Array } {
  const count = points.length / 3;
  const bodyCount = body.length / 3;
  const found = new Int32Array(count * FOLLOW_POINTS);
  const weights = new Float32Array(count * FOLLOW_POINTS);
  const own = new Float32Array(count);
  const best = new Float64Array(FOLLOW_POINTS);
  const bestAt = new Int32Array(FOLLOW_POINTS);
  for (let v = 0; v < count; v++) {
    const x = points[v * 3], y = points[v * 3 + 1], z = points[v * 3 + 2];
    best.fill(Infinity);
    bestAt.fill(0);
    for (let b = 0; b < bodyCount; b++) {
      const dx = body[b * 3] - x, dy = body[b * 3 + 1] - y, dz = body[b * 3 + 2] - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d >= best[FOLLOW_POINTS - 1]) continue;
      let k = FOLLOW_POINTS - 1;
      while (k > 0 && best[k - 1] > d) {
        best[k] = best[k - 1];
        bestAt[k] = bestAt[k - 1];
        k--;
      }
      best[k] = d;
      bestAt[k] = b;
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
  const more = (id: string) => Math.max(0, clampSlider(sliders[id]));
  return ARM_SPREAD.reduce((sum, [id, amount]) => sum + more(id) * amount, 0);
}
const ARM_SPREAD: [string, number][] = [
  ["hips", 0.06], ["build", 0.05], ["rear", 0.07], ["rearProjection", 0.05], ["rearWidth", 0.05], ["thighs", 0.03],
];

/** A random look: every slider somewhere in the middle of its range, colours from the swatches. */
export function randomLook(body: BodyName, random: () => number = Math.random): Look {
  const options = LOOK_OPTIONS[body];
  const look = newLook();
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length) % list.length];
  for (const def of options.sliders) {
    // Two rolls averaged lean towards the middle, so most random people look ordinary and a few stand out.
    const value = Math.round(((random() + random()) - 1) * 0.8 * 100) / 100;
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
      const value = clampSlider((data.sliders as Record<string, unknown>)[def.id]);
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
