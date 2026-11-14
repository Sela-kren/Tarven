/**
 * What each character wears, as layers, and the one rule every outfit follows when guests get it off you.
 *
 * Each garment says which layer it is and what part of the body it covers:
 *
 *   1. accessory      worn over everything: apron, belt
 *   2. outer          the main clothes: bodice, skirt, tunic, trousers (and shoes, which never come off)
 *   3. legwear        stockings and hose
 *   4. under          the shirt against the skin: the chemise
 *   5. smallclothes   painted on the body: braies, and for her a breast band, her top half before the braies.
 *                     Always the last to come off.
 *
 * Garments come off outermost layer first. Within a layer, top half before bottom half, waist before
 * either, and then in the order they're listed. A garment with `keep` set never comes off, for the reason given.
 *
 * Adding clothes: give the garment a layer and region here, with the same id as its colour in
 * `appearance`. It takes its place in the strip ladder, and guests say generic lines about it until
 * `banter` gives it its own.
 *
 * Each outfit in `appearance` lists the colours it has; its ladder is the garments among them, so the
 * dirndl and the priestess's set each come off in their own order. Legwear with nothing on the legs, such as
 * no-show socks, isn't a step: there's nothing to roll down.
 */

import { legwearOf, outfitOf, underOf, type Look } from "./appearance";

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
  /** Set when it goes by the name of the style she chose (a thong, pasties), so the lines written for it don't fit. */
  styled?: boolean;
}

/**
 * The pirate's rig that both bodies have. The hat keeps its braid and feather, so it stays on with them. The noble's
 * clothes are edged in the same braid, and his cap is the hat.
 */
const PIRATE_GARMENTS: readonly Garment[] = [
  // The pirate's sash, and the bandits' red scarf or bandana.
  { id: "sash", label: "sash", layer: "accessory", region: "waist" },
  { id: "breeches", label: "breeches", layer: "outer", region: "bottom" },
  { id: "boots", label: "boots", layer: "outer", region: "feet", keep: "the shoes inside them never come off either" },
  { id: "hat", label: "hat", layer: "accessory", region: "top", keep: "its braid and feather are sewn on and would be left hanging in the air" },
  { id: "braid", label: "braid", layer: "accessory", region: "top", keep: "it's sewn along the edges of what it trims" },
];

/**
 * The adventuring party's kit that both bodies have, which only guests wear for now. The mantle comes off first,
 * and the tabard and plate before the mail under them.
 */
const ADVENTURER_GARMENTS: readonly Garment[] = [
  { id: "cloak", label: "cloak", layer: "accessory", region: "top" },
  { id: "bracers", label: "bracers", layer: "accessory", region: "top" },
  { id: "tabard", label: "tabard", layer: "accessory", region: "top" },
  { id: "plate", label: "armour", layer: "accessory", region: "top" },
  { id: "jerkin", label: "jerkin", layer: "outer", region: "top" },
  { id: "mail", label: "mail shirt", layer: "outer", region: "top" },
  { id: "robe", label: "robe", layer: "outer", region: "top" },
];

export const WARDROBE: Record<WardrobeBody, readonly Garment[]> = {
  Female: [
    { id: "apron", label: "apron", layer: "accessory", region: "waist" },
    { id: "belt", label: "belt", layer: "accessory", region: "waist" },
    { id: "bodice", label: "bodice", layer: "outer", region: "top" },
    { id: "skirt", label: "skirt", layer: "outer", region: "bottom" },
    { id: "shoes", label: "shoes", layer: "outer", region: "feet", keep: "the body has no feet modelled under them" },
    { id: "soles", label: "soles", layer: "outer", region: "feet", keep: "they're part of her shoes, which never come off" },
    { id: "stockings", label: "stockings", layer: "legwear", region: "legs" },
    { id: "blouse", label: "chemise", layer: "under", region: "top" },
    { id: "bra", label: "breast band", layer: "smallclothes", region: "top" },
    { id: "smalls", label: "smallclothes", layer: "smallclothes", region: "bottom" },
    // The dirndl's and the priestess's own. Drapes come off before the girdle they hang from.
    { id: "ribbons", label: "arm ribbons", layer: "accessory", region: "top" },
    { id: "sleeves", label: "sleeves", layer: "accessory", region: "top" },
    { id: "top", label: "gold top", layer: "outer", region: "top" },
    { id: "drapes", label: "drapes", layer: "outer", region: "bottom" },
    { id: "girdle", label: "girdle", layer: "outer", region: "bottom" },
    { id: "jewels", label: "jewellery", layer: "accessory", region: "top", keep: "her jewellery is hers; dares are for clothes" },
    { id: "gems", label: "gems", layer: "accessory", region: "top", keep: "they're set in her jewellery and necklace" },
    // The bunny set's own. Its corset is the bodice.
    { id: "ears", label: "bunny ears", layer: "accessory", region: "top" },
    { id: "bowtie", label: "bow tie", layer: "accessory", region: "top" },
    { id: "collar", label: "collar and cuffs", layer: "accessory", region: "top" },
    { id: "tail", label: "tail", layer: "accessory", region: "bottom" },
    // The babydoll's straps, and the lace on it and the corset gown, which comes away before the cloth it's on.
    { id: "straps", label: "straps", layer: "accessory", region: "top" },
    { id: "trim", label: "lace", layer: "accessory", region: "bottom" },
    // The frilled set's bow, and the plunge dress.
    { id: "bow", label: "bow", layer: "accessory", region: "waist" },
    { id: "dress", label: "dress", layer: "outer", region: "top" },
    // The pirate's rig, which only guests wear for now. Her corset is the bodice and her shirt the chemise.
    ...PIRATE_GARMENTS,
    { id: "feather", label: "feather", layer: "accessory", region: "top", keep: "it's pinned in her hat, or on her arrows" },
    // The adventuring party's kit, which only guests wear for now. The archer's shirt is the chemise, her strap goes
    // with the belt and her arrows' fletching with the feather; the mage's hat is the hat. The noble's gown is her
    // bodice and skirt, with the girdle and jewellery.
    ...ADVENTURER_GARMENTS,
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
    // The adventuring party's kit and the noble's clothes, which only guests wear for now. His cap and the mage's
    // hat are the pirate's hat; the mage's amulet and cleric's sun are the chain.
    ...ADVENTURER_GARMENTS,
    { id: "doublet", label: "doublet", layer: "outer", region: "top" },
    { id: "feather", label: "feather", layer: "accessory", region: "top", keep: "it's pinned in his cap, or on his arrows" },
    { id: "jewels", label: "chain", layer: "accessory", region: "top", keep: "his chain of office is his; dares are for clothes" },
    { id: "gems", label: "gems", layer: "accessory", region: "top", keep: "they're set in his chain" },
  ],
};

/**
 * How each top comes off her breasts when she shows them (GAME_PATH.MD 7e), pulled on her model rather than taken
 * off: a chemise and a bodice are dragged down under them, and the laces up the bodice's front with them (the belt's
 * leather, the dirndl's ribbons; only what's over her breasts moves, so a belt round her waist stays put, and arm
 * ribbons on her arms); the priestess's short gold top is lifted up over them.
 */
export const TOP_PULL: Readonly<Record<string, "down" | "up">> = { blouse: "down", bodice: "down", belt: "down", ribbons: "down", top: "up" };

/** Tops that sit under her breasts in an outfit, leaving them bare: the bunny set's, corset gown's and frilled set's. */
const UNDER_BUST: Readonly<Record<string, readonly string[]>> = { bunny: ["bodice"], gown: ["bodice"], frills: ["bodice"] };

/**
 * The tops she has on that cover her breasts, and which way they come off them: up if any of them only lifts, down
 * otherwise; null with none on.
 */
export function topPull(body: WardrobeBody, outfit: string | undefined, off: readonly string[]): { ids: string[]; dir: "down" | "up" } | null {
  const under = (outfit && UNDER_BUST[outfit]) || [];
  const ids = stripLadder(body, outfit)
    .filter((g) => g.id in TOP_PULL && !off.includes(g.id) && !under.includes(g.id))
    .map((g) => g.id);
  if (ids.length === 0) return null;
  return { ids, dir: ids.some((id) => TOP_PULL[id] === "up") ? "up" : "down" };
}

/** Whether her legwear reaches up over her groin (tights, leggings): its top band, from her waist down her thighs. */
export function legwearOverGroin(body: WardrobeBody, outfit?: string, legwear?: string): boolean {
  return legwearOf(body, { outfit, legwear })?.bands.includes("T_hose") ?? false;
}

/**
 * The garments that can come off an outfit (the character's own when left out), in the order they come off.
 * `legwear` is the style of stockings she has on, the outfit's own when left out.
 */
export function stripLadder(body: WardrobeBody, outfit?: string, legwear?: string, under?: Pick<Look, "bra" | "briefs">): Garment[] {
  const legs = legwearOf(body, { outfit, legwear });
  const styles = under ? underOf(body, under) : null;
  const worn = outfitOf(body, { outfit }).colors.filter(
    // A one-piece comes off whole, as her top: there are no briefs left to take off after it.
    (id) => (id !== "stockings" || !legs || legs.bands.length > 0) && (id !== "smalls" || !styles || styles.bottom !== null),
  );
  const rank = (g: Garment) => LAYERS.indexOf(g.layer) * 100 + REGIONS.indexOf(g.region) * 10;
  return WARDROBE[body]
    .filter((g) => !g.keep && worn.includes(g.id))
    .map((g, index) => ({ g, index }))
    .sort((a, b) => rank(a.g) - rank(b.g) || a.index - b.index)
    .map(({ g }) => styled(g, styles));
}

/** Her bra and briefs go by their styles' names, unless they're the band and braies painted on her. */
function styled(g: Garment, styles: ReturnType<typeof underOf>): Garment {
  const style = g.id === "bra" ? styles?.top : g.id === "smalls" ? styles?.bottom : null;
  if (!style || !style.front) return g;
  return { ...g, label: style.garment, styled: true };
}

/** How many looks a body goes through: fully dressed, then one more for each garment that comes off. */
export function stripStages(body: WardrobeBody, outfit?: string, legwear?: string, under?: Pick<Look, "bra" | "briefs">): number {
  return stripLadder(body, outfit, legwear, under).length + 1;
}

/** The ids of what's off at a stage: 0 is fully dressed. */
export function piecesOff(body: WardrobeBody, stage: number, outfit?: string, legwear?: string, under?: Pick<Look, "bra" | "briefs">): string[] {
  return stripLadder(body, outfit, legwear, under)
    .slice(0, Math.max(0, stage))
    .map((g) => g.id);
}
