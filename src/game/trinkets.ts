/**
 * Trinkets, after Karryn's Prison's accessories (rings and the rest, RemtairyKarryn.js accessoryCharmReq and the
 * desire requirements they move, RemtairyKarrynPassives.js): small things she wears that change her numbers, some
 * with a catch. KP unlocks a new one each time her Charm reaches the next step; so does Tarven (her Charm level),
 * and some come from her records. She wears up to TRINKET_SLOTS at once, chosen in Settings › Trinkets.
 *
 * Their look on her model is still to be made (POSES_TODO.md, art): until then they're numbers only. Pure rules.
 */
import type { Effects, Meter, Records } from "./passives";

export interface TrinketDef {
  id: string;
  name: string;
  /** What it does, in words. */
  about: string;
  /** Her Charm level it comes with, or a record it needs instead. */
  charm?: number;
  need?: (r: Records) => boolean;
  needText?: string;
  wear: (e: Effects) => void;
}

/** Lowers what a brawl scene needs of one desire (KP's lip gloss on kissing, nail polish on handjobs...). */
const sceneEase = (e: Effects, meter: Meter, n: number) => {
  e.sceneEase[meter] = (e.sceneEase[meter] ?? 0) + n;
};

export const TRINKETS: readonly TrinketDef[] = [
  { id: "lipTint", name: "Berry lip tint", about: "Mouth scenes need 10 less Mouth desire; kisses need 10 less", charm: 2, wear: (e) => { sceneEase(e, "mouth", 10); e.ease.lips = (e.ease.lips ?? 0) + 10; } },
  { id: "nailPaint", name: "Painted nails", about: "Her hands need 10 less Cock desire", charm: 2, wear: (e) => sceneEase(e, "cock", 10) },
  { id: "chestRibbon", name: "Bodice ribbon", about: "Breast scenes need 10 less Breasts desire; +1 gold a chest touch", charm: 3, wear: (e) => { sceneEase(e, "breasts", 10); e.touchGold.chest = (e.touchGold.chest ?? 0) + 1; } },
  { id: "ankleBell", name: "Ankle bell", about: "Rear scenes need 10 less Butt desire; guests reach a little more", charm: 3, wear: (e) => { sceneEase(e, "butt", 10); e.reach += 0.1; } },
  { id: "garterCharm", name: "Garter charm", about: "Pussy scenes need 10 less Pussy desire", charm: 4, wear: (e) => sceneEase(e, "pussy", 10) },
  { id: "ironRing", name: "Iron knuckle ring", about: "+2 damage in a brawl; scenes need 10 MORE Cock desire", charm: 1, wear: (e) => { e.fightDamage += 2; sceneEase(e, "cock", -10); } },
  { id: "silverBand", name: "Silver band", about: "+15% willpower at the top; desire fills 10% slower", charm: 4, wear: (e) => { e.willMax += 3; for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as Meter[]) e.sens[m] -= 0.1; } },
  { id: "luckyCoin", name: "Lucky coin", about: "+10% pay on everything", charm: 5, wear: (e) => (e.payPct += 0.1) },
  { id: "rosePerfume", name: "Rose perfume", about: "Every desire starts each night at +5; guests reach more", charm: 5, wear: (e) => { for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as Meter[]) e.start[m] += 5; e.reach += 0.15; } },
  { id: "chokerBell", name: "Little choker bell", about: "Foes would rather grope than swing; +1 hold against touches", charm: 6, wear: (e) => { e.brawlReach += 0.1; e.hold += 1; } },
  { id: "wardensKey", name: "An old cell key", about: "Talking them down works better (+10%)", need: (r) => r.talkedDown >= 5, needText: "Talk 5 brawls down", wear: (e) => (e.fightTalk += 0.1) },
  { id: "brawlerWraps", name: "Knuckle wraps", about: "+1 damage, +5% dodge", need: (r) => r.fightsWon >= 10, needText: "Win 10 brawls", wear: (e) => { e.fightDamage += 1; e.fightDodge += 0.05; } },
];

export const TRINKET_BY_ID: ReadonlyMap<string, TrinketDef> = new Map(TRINKETS.map((t) => [t.id, t]));
/** How many she can wear at once (KP: a ring and an accessory). */
export const TRINKET_SLOTS = 2;

/** The trinkets she has: by her Charm level, or her records. */
export function trinketsOwned(charm: number, r: Records): TrinketDef[] {
  return TRINKETS.filter((t) => (t.charm !== undefined && charm >= t.charm) || (t.need?.(r) ?? false));
}
