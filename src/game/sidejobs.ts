/**
 * Karryn's Prison's side jobs and a few of its smaller systems, on Tarven's side (KP_COMPARE.md §9 and the smaller
 * items). The art for each (the stage, the front desk, her hair) is still to come (POSES_TODO.md): until then they
 * play from a menu, with their results in the log. Pure rules, kept apart from tavern.ts so they can be tested.
 *
 * - **Dancing on the bar** (KP's stripper job): once a night during service. The room pays by how many are in, how
 *   well known she is, and how much of her is on show; it works the men up, and the town talks.
 * - **Renting rooms** (KP's receptionist): at bedtime, guests who'd stay the night pay for a room; the keen ones ask
 *   for more, which is counted for later (the visit itself plays when the front desk is built).
 * - **Riot nights** (KP's riots): three brawls in a night, and the next night trouble starts twice as easily, until
 *   she wins two brawls on it.
 * - **Her hair growing** (KP's RemtairyHair.js): a day's growth every night, from bare to wild; trimmed at the
 *   bathhouse. Her model's look for each is still to come.
 */

// ---------- Dancing on the bar ----------

export interface ShowInput {
  /** Guests in the room, and how many of them men. */
  guests: number;
  men: number;
  fame: number;
  /** How much of her is off, 0 to 1, and her Slut Level. */
  exposure: number;
  slutLevel: number;
}

export interface ShowResult {
  gold: number;
  /** What it does to every man's lust, her fame and respect, and her Body and Breasts desire. */
  lust: number;
  fame: number;
  respect: number;
  desire: number;
  line: string;
}

export const SHOW_LINES = {
  shy: "You climb up onto the bar and sway, cheeks burning, while the room whistles.",
  bold: "You climb up onto the bar and dance like you mean it, and the room roars.",
  bare: "You dance on the bar with next to nothing on, and the coins rain down.",
} as const;

/**
 * KP's dance requests (RemtairyKarrynStripper.js stripperBattle_makeDanceRequest): mid-dance, the keenest man in the
 * room calls up for more. It's asked as a look (show.ts), so she picks what she shows, or says no with willpower.
 * Keyed by what he's shouting for; {gold} is his offer.
 */
export const DANCE_CALLS: Readonly<Record<"band" | "breasts" | "smalls" | "pussy" | "butt", readonly string[]>> = {
  band: ["Top down, keeper! Let's see what's holding all that up! {gold} gold says you will!", "Pull that top down! {gold} gold!"],
  breasts: ["GET 'EM OUT! GET 'EM OUT! {gold} gold for the pair!", "Off with the top, keeper! {gold} gold if they bounce!"],
  smalls: ["Lift the skirt! What colour are they tonight? {gold} gold to find out!", "Show us your smalls, keeper! {gold} gold!"],
  pussy: ["All of it, keeper! Everything off! {gold} gold, and I'm not joking!", "Squat down here and show us! {gold} gold!"],
  butt: ["Turn round and bend over! {gold} gold for the view!", "Shake that arse at me! {gold} gold!"],
};

/** What a dance on the bar earns, and what it does. */
export function runShow(s: ShowInput): ShowResult {
  const per = 1 + Math.floor(s.fame / 10) + Math.round(s.exposure * 3) + Math.floor(s.slutLevel / 2);
  const gold = Math.max(1, s.guests) * per;
  const line = s.exposure >= 0.7 ? SHOW_LINES.bare : s.slutLevel >= 2 ? SHOW_LINES.bold : SHOW_LINES.shy;
  return { gold, lust: 2 + Math.round(s.exposure * 2), fame: 1 + (s.exposure >= 0.7 ? 1 : 0), respect: -1 - (s.exposure >= 0.7 ? 1 : 0), desire: 6, line };
}

// ---------- Renting rooms ----------

export const ROOM_PRICE = 6;
/** The most rooms upstairs (her own isn't for rent). */
export const ROOMS = 3;

export interface RoomsResult {
  rented: number;
  gold: number;
  /** Lodgers who asked her up to their room (counted; the visit plays when the front desk is built). */
  asked: number;
  line: string;
}

/** Bedtime: who'd stay (`stayers`: their lust, each), what they pay, and how many of them ask for more. */
export function rentRooms(stayers: readonly number[], keenAt: number): RoomsResult {
  const rented = Math.min(ROOMS, stayers.length);
  const asked = stayers.slice(0, rented).filter((lust) => lust >= keenAt).length;
  const line =
    rented === 0
      ? "Nobody wants a bed tonight."
      : `${rented === 1 ? "One guest takes" : `${rented} guests take`} a room for the night${asked > 0 ? `, and ${asked === 1 ? "one asks" : `${asked} ask`} if you'd come up later.` : "."}`;
  return { rented, gold: rented * ROOM_PRICE, asked, line };
}

// ---------- Riot nights ----------

/** Brawls in a night that make the next a riot night, and wins on it that put it down. */
export const RIOT_AFTER = 3;
export const RIOT_PUT_DOWN = 2;
/** How much likelier trouble is on a riot night, as a fraction (Effects.trouble goes the other way). */
export const RIOT_TROUBLE = 1;

// ---------- Her hair ----------

export type Growth = "bare" | "stubble" | "short" | "full" | "wild";
export const GROWTH: readonly Growth[] = ["bare", "stubble", "short", "full", "wild"];
/** Nights to each step. */
export const GROWTH_NIGHTS = 3;
export function growthOf(nights: number): Growth {
  return GROWTH[Math.min(GROWTH.length - 1, Math.floor(Math.max(0, nights) / GROWTH_NIGHTS))];
}
