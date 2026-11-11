/**
 * What each character wears, as layers, and the one rule every outfit follows when guests get it off you.
 *
 * Each garment says which layer it is and what part of the body it covers:
 *
 *   1. accessory      worn over everything: apron, belt
 *   2. outer          the main clothes: bodice, skirt, tunic, trousers (and shoes, which never come off)
 *   3. legwear        stockings and hose
 *   4. under          the shirt against the skin: the chemise
 *   5. smallclothes   painted on the body: braies, and for her a breast band. Always the last to come off.
 *
 * Garments come off outermost layer first. Within a layer, top half before bottom half, waist before
 * either, and then in the order they're listed. A garment with `keep` set never comes off, for the reason given.
 *
 * Adding clothes: give the garment a layer and region here, with the same id as its colour in
 * `appearance`. It takes its place in the strip ladder, and guests say generic lines about it until
 * `banter` gives it its own.
 *
 * Each outfit in `appearance` lists the colours it has; its ladder is the garments among them, so the
 * dirndl and the priestess's set each come off in their own order.
 */

import { outfitOf } from "./appearance";

/** Which body, as the models and saves call it. */
export type WardrobeBody = "Female" | "Male";

export const LAYERS = ["accessory", "outer", "legwear", "under", "smallclothes"] as const;
export type Layer = (typeof LAYERS)[number];

/** Within a layer, the order body parts are uncovered. */
export const REGIONS = ["waist", "top", "bottom", "legs", "feet"] as const;
export type Region = (typeof REGIONS)[number];

export interface Garment {
  /** The same id as its colour in `appearance`. */
  id: string;
  /** What guests call it. */
  label: string;
  layer: Layer;
  region: Region;
  /** Why it never comes off, if it doesn't. */
  keep?: string;
}

/** The pirate's rig that both bodies have. The hat keeps its braid and feather, so it stays on with them. */
const PIRATE_GARMENTS: readonly Garment[] = [
  { id: "sash", label: "sash", layer: "accessory", region: "waist" },
  { id: "breeches", label: "breeches", layer: "outer", region: "bottom" },
  { id: "boots", label: "boots", layer: "outer", region: "feet", keep: "the shoes inside them never come off either" },
  { id: "hat", label: "hat", layer: "accessory", region: "top", keep: "its braid and feather are sewn on and would be left hanging in the air" },
  { id: "braid", label: "braid", layer: "accessory", region: "top", keep: "it's sewn round the hat's brim" },
];

export const WARDROBE: Record<WardrobeBody, readonly Garment[]> = {
  Female: [
    { id: "apron", label: "apron", layer: "accessory", region: "waist" },
    { id: "belt", label: "belt", layer: "accessory", region: "waist" },
    { id: "bodice", label: "bodice", layer: "outer", region: "top" },
    { id: "skirt", label: "skirt", layer: "outer", region: "bottom" },
    { id: "shoes", label: "shoes", layer: "outer", region: "feet", keep: "the body has no feet modelled under them" },
    { id: "stockings", label: "stockings", layer: "legwear", region: "legs" },
    { id: "blouse", label: "chemise", layer: "under", region: "top" },
    { id: "smalls", label: "smallclothes", layer: "smallclothes", region: "bottom" },
    // The dirndl's and the priestess's own. Drapes come off before the girdle they hang from.
    { id: "ribbons", label: "arm ribbons", layer: "accessory", region: "top" },
    { id: "sleeves", label: "sleeves", layer: "accessory", region: "top" },
    { id: "top", label: "gold top", layer: "outer", region: "top" },
    { id: "drapes", label: "drapes", layer: "outer", region: "bottom" },
    { id: "girdle", label: "girdle", layer: "outer", region: "bottom" },
    { id: "jewels", label: "jewellery", layer: "accessory", region: "top", keep: "her jewellery is hers; dares are for clothes" },
    { id: "gems", label: "gems", layer: "accessory", region: "top", keep: "they're set in her jewellery and necklace" },
    // The pirate's rig, which only guests wear for now. Her corset is the bodice and her shirt the chemise.
    ...PIRATE_GARMENTS,
    { id: "feather", label: "feather", layer: "accessory", region: "top", keep: "it's pinned in her hat" },
  ],
  Male: [
    {
      id: "belt",
      label: "belt",
      layer: "accessory",
      region: "waist",
      keep: "it holds up his braies, and its leather is shared with his cuffs, so taking it off leaves a gap at the waist",
    },
    { id: "tunic", label: "tunic", layer: "outer", region: "top" },
    { id: "trousers", label: "trousers", layer: "outer", region: "bottom" },
    { id: "boots", label: "boots", layer: "outer", region: "feet", keep: "the body has no feet modelled under them" },
    { id: "smalls", label: "smallclothes", layer: "smallclothes", region: "bottom" },
    // The pirate's rig, which only guests wear for now. His boots are the ones above, pulled up to the knee.
    { id: "shirt", label: "shirt", layer: "under", region: "top" },
    { id: "waistcoat", label: "waistcoat", layer: "outer", region: "top" },
    ...PIRATE_GARMENTS.filter((g) => g.id !== "boots"),
  ],
};

/** The garments that can come off an outfit (the character's own when left out), in the order they come off. */
export function stripLadder(body: WardrobeBody, outfit?: string): Garment[] {
  const worn = outfitOf(body, { outfit }).colors;
  const rank = (g: Garment) => LAYERS.indexOf(g.layer) * 100 + REGIONS.indexOf(g.region) * 10;
  return WARDROBE[body]
    .filter((g) => !g.keep && worn.includes(g.id))
    .map((g, index) => ({ g, index }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.index - b.index)
    .map(({ g }) => g);
}

/** How many looks a body goes through: fully dressed, then one more for each garment that comes off. */
export function stripStages(body: WardrobeBody, outfit?: string): number {
  return stripLadder(body, outfit).length + 1;
}

/** The ids of what's off at a stage: 0 is fully dressed. */
export function piecesOff(body: WardrobeBody, stage: number, outfit?: string): string[] {
  return stripLadder(body, outfit)
    .slice(0, Math.max(0, stage))
    .map((g) => g.id);
}
