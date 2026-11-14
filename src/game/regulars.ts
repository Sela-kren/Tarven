/**
 * Named regulars and the Wanted page (GAME_PATH.MD, section 5). A guest who takes a "first" with her (adult play,
 * or three touches she let land in one night) or settles a brawl with her becomes a regular: they get a name, and
 * keep their rolled sheet, body and look from then on, so they're always the same person. They come back on later
 * nights, bolder the more she's let them, and remember what happened last time. Each time she beats them, they come
 * back stronger. At most REGULARS_PER_KIND of each kind.
 *
 * The rules are here; the tavern (tavern.ts) marks what happens tonight, and settles it at the end of the night.
 */
import type { GuestRole, RoleStats } from "./guestroles";
import type { GuestKind } from "./tavern";

/** What a regular remembers most from last time, for the line they walk in with. */
export type RegularMemory = "met" | "let" | "slapped" | "adult" | "beatHer" | "lostToHer";

export interface Regular {
  id: string;
  name: string;
  kind: GuestKind;
  role: GuestRole;
  female: boolean;
  look: number;
  /** Their sheet, kept as it was rolled the night they became a regular, and grown since. */
  stats: RoleStats;
  /** Lasting nerve from the nights she let them touch her, 0 to LASTING_NERVE_MAX. */
  nerve: number;
  /** She slapped them last: −1 nerve until she lets them again. */
  slapped: boolean;
  /** Nights they've come in, nights she let them touch her, adult play with them, brawls they won and lost. */
  nights: number;
  lets: number;
  adult: number;
  beatHer: number;
  lostToHer: number;
  /** The night they became a regular. */
  since: number;
  last: RegularMemory;
}

/** What happened with a guest tonight, marked as it happens (tavern.ts). */
export interface NightMarks {
  lets: number;
  slapped: boolean;
  adult: number;
  beatHer: boolean;
  lostToHer: boolean;
}

export const REGULARS_PER_KIND = 2;
/** Touches she lets land in one night that make someone a regular. */
export const LETS_TO_REGULAR = 3;
export const LASTING_NERVE_PER_NIGHT = 0.5;
export const LASTING_NERVE_MAX = 2;
export const SLAPPED_NERVE = -1;
/** The chance a regular comes in on a night, more the more she's let them, and the most that come at once. */
export const RETURN_BASE = 0.5;
export const RETURN_PER_LET = 0.05;
export const RETURN_MAX = 0.85;
export const REGULARS_A_NIGHT = 3;

export function newMarks(): NightMarks {
  return { lets: 0, slapped: false, adult: 0, beatHer: false, lostToHer: false };
}

/** Whether tonight made a guest a regular. */
export function earnsRegular(m: NightMarks): boolean {
  return m.adult > 0 || m.beatHer || m.lostToHer || m.lets >= LETS_TO_REGULAR;
}

/** The nerve a regular walks in with on top of their sheet. */
export function regularNerve(r: Regular): number {
  return r.nerve + (r.slapped ? SLAPPED_NERVE : 0);
}

/** How likely a regular is to come in tonight. */
export function returnChance(r: Regular): number {
  return Math.min(RETURN_MAX, RETURN_BASE + RETURN_PER_LET * r.lets);
}

/** Settles a night with a regular: bolder for what she let them, cooler after a slap, stronger each time she beat them. */
export function settleNight(r: Regular, m: NightMarks): Regular {
  const next = { ...r, stats: structuredClone(r.stats), nights: r.nights + 1 };
  if (m.lets > 0) {
    next.nerve = Math.min(LASTING_NERVE_MAX, next.nerve + LASTING_NERVE_PER_NIGHT);
    next.slapped = false;
    next.lets++;
  }
  if (m.slapped && m.lets === 0) next.slapped = true;
  next.adult += m.adult;
  if (m.beatHer) next.beatHer++;
  // Beaten, they come back stronger: harder to put down, bolder, longer-lasting after hours.
  if (m.lostToHer) {
    next.lostToHer++;
    next.stats.nerve += 0.5;
    next.stats.fight = { ...next.stats.fight, stamina: next.stats.fight.stamina + 2, attack: next.stats.fight.attack + 1 };
    next.stats.partner = { ...next.stats.partner, stamina: next.stats.partner.stamina + 1 };
  }
  next.last = memoryOf(m) ?? r.last;
  return next;
}

/** What stands out from a night, if anything: the most telling thing first. */
export function memoryOf(m: NightMarks): RegularMemory | null {
  if (m.adult > 0) return "adult";
  if (m.lostToHer) return "lostToHer";
  if (m.beatHer) return "beatHer";
  if (m.slapped && m.lets === 0) return "slapped";
  if (m.lets > 0) return "let";
  return null;
}

/** The line in the log as a regular walks in, by what they remember. `{name}` is them. */
export const REGULAR_RETURNS: Record<RegularMemory, readonly string[]> = {
  met: ["{name} is back, and takes the same seat as last time."],
  let: [
    "{name} is back, and catches your eye before they've even sat down. They remember.",
    "{name} walks in grinning. \"Saved my seat?\"",
  ],
  slapped: [
    "{name} is back, rubbing the back of their hand like it still stings. They keep their distance. For now.",
    "{name} walks in and gives you a wide berth. \"Just a drink tonight. Promise.\"",
  ],
  adult: [
    "{name} is back, and the look they give you says they haven't stopped thinking about last time.",
    "{name} walks in, and the whole table knows exactly why they've come back.",
  ],
  beatHer: [
    "{name} swaggers in. \"Rematch? No? Pity.\" They haven't forgotten who won.",
    "{name} is back, cracking their knuckles. They remember putting you on the floor.",
  ],
  lostToHer: [
    "{name} is back, and bigger round the shoulders than you remember. They've been training. For you.",
    "{name} walks in and nods to you, very carefully. They haven't forgotten. They want another go.",
  ],
};

/** What the Wanted page says they remember. */
export const MEMORY_WORDS: Record<RegularMemory, string> = {
  met: "Knows your face",
  let: "Remembers you letting them",
  slapped: "Remembers your slap",
  adult: "Can't stop thinking about last time",
  beatHer: "Remembers beating you",
  lostToHer: "Wants a rematch",
};

/** Names for regulars, by kind. Chosen in turn, so no two regulars share one. */
export const REGULAR_NAMES: Record<GuestKind, readonly string[]> = {
  farmer: ["Wat Barley", "Hob Tanner", "Elsbeth Rye", "Jory Fenn"],
  smuggler: ["Corin Vane", "Tamsin Hook", "Jasper Lowe", "Nell Saltash"],
  soldier: ["Sergeant Brask", "Corporal Iley", "Dagny Pike", "Ostrin Hale"],
  fugitive: ["The Grey Stranger", "Wren Ashby", "Kit Mallory", "Sorrel Dunn"],
  adventurer: ["Brannoc the Bold", "Ysolde Marr", "Fenwick Dale", "Talia Brightspur"],
  bandit: ["Gristle Jack", "Red Morwen", "Hask One-Ear", "Vosk the Knife"],
  noble: ["Lord Aldric Vey", "Lady Seraphine Dorr", "Master Lucan Thorne", "Dame Isolde Crane"],
};

/** The next name for a new regular of this kind, not already taken. */
export function nextName(kind: GuestKind, taken: ReadonlySet<string>): string {
  const free = REGULAR_NAMES[kind].find((n) => !taken.has(n));
  return free ?? `${REGULAR_NAMES[kind][0]} the Younger`;
}

/** Regulars from a save, with anything broken left out. Older saves have none. */
export function readRegulars(raw: unknown): Regular[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0);
  const memories = Object.keys(MEMORY_WORDS) as RegularMemory[];
  return raw.flatMap((item): Regular[] => {
    if (!item || typeof item !== "object") return [];
    const r = item as Partial<Regular>;
    if (typeof r.id !== "string" || typeof r.name !== "string" || typeof r.kind !== "string" || typeof r.role !== "string") return [];
    if (!r.stats || typeof r.stats !== "object") return [];
    return [
      {
        id: r.id,
        name: r.name,
        kind: r.kind,
        role: r.role,
        female: r.female === true,
        look: num(r.look),
        stats: r.stats,
        nerve: Math.min(LASTING_NERVE_MAX, num(r.nerve)),
        slapped: r.slapped === true,
        nights: num(r.nights),
        lets: num(r.lets),
        adult: num(r.adult),
        beatHer: num(r.beatHer),
        lostToHer: num(r.lostToHer),
        since: num(r.since),
        last: memories.includes(r.last as RegularMemory) ? (r.last as RegularMemory) : "met",
      },
    ];
  });
}
