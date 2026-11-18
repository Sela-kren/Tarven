/**
 * How Chapter 1 ends (STORY.md section 7 "How Chapter 1 ends", section 14, section 15 item 10). When she passes
 * the Copper Bell she's first in Tarven, and the chapter ends on a card read that morning. Which ending she gets is
 * picked from who she is then, and saved. **It doesn't end the run**: the card ends on "To be continued: the
 * pass", and the nights go on.
 *
 * Each Chapter 1 ending previews one of section 14's endings, the one she's on the road to. Words only: no ending
 * card starts anything.
 */
import { FIRST_IN_TARVEN, type HouseId } from "./ledger";
import { firstInTarvenLines, type PlotFlag } from "./plot";
import { arcIndex, type ArcStage } from "./lewd";

// ---- Fan groups (STORY.md section 7, "Every fan has a reason to come") ----

/** Why her fans come: Keeper (food, ale, safety), Lantern (her, the girls), Network (secrets, fights). */
export type FanGroup = "keeper" | "lantern" | "network";
export const FAN_GROUPS: readonly FanGroup[] = ["keeper", "lantern", "network"];
export type FanGroups = Record<FanGroup, number>;

export function newFanGroups(): FanGroups {
  return { keeper: 0, lantern: 0, network: 0 };
}

/** The fans a partnered or ruined house sends, by what it was known for (its "Steals" in section 7). */
export const HOUSE_GROUP: Readonly<Record<HouseId, FanGroup>> = {
  cider: "keeper",
  bakehouse: "keeper",
  canteen: "network",
  tollgate: "keeper",
  copperBell: "network",
};

/** Her biggest group. A tie goes to Keeper, then Network: the house she inherited is a tavern first. */
export function biggestFanGroup(groups: FanGroups): FanGroup {
  let best: FanGroup = "keeper";
  for (const g of FAN_GROUPS) if (groups[g] > groups[best]) best = g;
  return best;
}

/**
 * A night's fans into the groups: the ones tagged tonight go to their group, and the rest of the night's gain
 * (the guests who came for the food, the ale and a safe seat) to Keeper. A losing night takes from Keeper.
 */
export function addFanNight(groups: FanGroups, won: number, tagged: Partial<Record<Exclude<FanGroup, "keeper">, number>>): void {
  let rest = won;
  for (const g of ["lantern", "network"] as const) {
    const n = Math.max(0, Math.floor(tagged[g] ?? 0));
    groups[g] += n;
    rest -= n;
  }
  groups.keeper = Math.max(0, groups.keeper + rest);
}

/** From a save. Older saves never counted groups: every fan she had came for the house itself (Keeper). */
export function readFanGroups(raw: unknown, fans: number): FanGroups {
  const groups = newFanGroups();
  if (!raw || typeof raw !== "object") {
    groups.keeper = Math.max(0, Math.floor(fans));
    return groups;
  }
  const r = raw as Partial<Record<FanGroup, unknown>>;
  for (const g of FAN_GROUPS) {
    const n = r[g];
    if (typeof n === "number" && Number.isFinite(n)) groups[g] = Math.max(0, Math.floor(n));
  }
  return groups;
}

// ---- The endings ----

export type ChapterEndingId = "overthrow" | "paidInFull" | "lostToNight" | "openAsUsual";
export const CHAPTER_ENDING_IDS: readonly ChapterEndingId[] = ["overthrow", "paidInFull", "lostToNight", "openAsUsual"];
export const isChapterEnding = (value: unknown): value is ChapterEndingId => CHAPTER_ENDING_IDS.includes(value as ChapterEndingId);

export interface ChapterEnding {
  title: string;
  /** The ending of the whole story it's a preview of (STORY.md section 14), or none for the default. */
  previews: string;
  /** How it's picked, in words, for the journal. */
  needs: string;
  /** One line for the journal. */
  text: string;
  /** The epilogue, in the house voice, read on the card before the teaser. */
  epilogue: readonly string[];
}

/** Trust, of TRUST_MAX, at which the village rises with her (tavern.ts TRUST_TO_OVERTHROW). */
export const RISE_TRUST = 13;
/** Respect at or below this is low, for Lost to the Night. */
export const LOW_RESPECT = -3;

export const CHAPTER_ENDINGS: Readonly<Record<ChapterEndingId, ChapterEnding>> = {
  overthrow: {
    title: "The Village Rises",
    previews: "The Village Rises",
    needs: "Mara free, the village's trust high, and Keeper fans her biggest group.",
    text: "When the Baron's man comes to collect, the whole village is waiting at your door. The Baron's hold on Tarven has a crack in it, and it's your house.",
    epilogue: [
      "Pell came up the hill this morning for the Baron's due and found the whole village waiting on your step: Mara's farmers with their pitchforks, the chapel brothers, Hollin with his credit book, and somebody's goat.",
      "Nobody touched him. Nobody had to. He took one look, remembered an appointment, and went back down the hill a great deal faster than he came up.",
      "That night the farmers push the tables together and hold their meeting in your taproom, over your ale. Mara bangs a tankard for order. It's the village's house now, as much as yours. Up at the keep, the Baron is going to hate that.",
    ],
  },
  paidInFull: {
    title: "Paid in Full",
    previews: "Paid in Full",
    needs: "The Baron's debt paid off, and the book kept from him.",
    text: "The debt is paid and the book is still yours. The tavern is yours, and the Baron is still watching.",
    epilogue: [
      "The Baron's debt is paid, every copper of it, and the deed in your drawer says what it always said: yours, free and clear.",
      "The book's still yours too, wherever Grandma hid the rest of it. Pell knows it. He stands across the square with his ledger under his arm, watching your door like a cat watching a mousehole that's grown a bigger cat.",
      "Up at the keep a lamp burns late. The Baron is still watching. Let him watch. You've a house to run.",
    ],
  },
  lostToNight: {
    title: "Lost to the Night",
    previews: "Lost to the Night",
    needs: "Known on her arc, low respect, and no lantern hung.",
    text: "Everyone knows your name, and the room thinks it owns it. A warning, for now.",
    epilogue: [
      "Everyone in Tarven knows your name tonight. They shout it across the taproom, and they've scratched it on the privy wall with drawings, mostly accurate.",
      "First in the village, and every man in the room thinks he owns a piece of it. You never hung a lantern, so there are no rules, no prices and no door you can shut. Just you, and the room, and whatever the room wants next.",
      "Grandma ran this house. Tonight it's running you. (A cautionary tale, so far. The nights go on, and you can still take them back.)",
    ],
  },
  openAsUsual: {
    title: "Open as Usual",
    previews: "",
    needs: "Any other way to first in Tarven.",
    text: "First in Tarven, and the tables still need wiping.",
    epilogue: [
      "No crowd at the door, no song in the square. Just a full room, a hot pot, and Jory Bell's old regulars learning where you keep the good cups.",
      "Whatever you owe and whoever's watching, you're first in Tarven, and the tables still need wiping.",
      "Grandma would have called it a good night's work. Then she'd have handed you the mop.",
    ],
  },
};

/** What picks the ending, all read as she passes the Copper Bell. */
export interface ChapterFacts {
  flags: ReadonlySet<PlotFlag>;
  trust: number;
  groups: FanGroups;
  /** What's still owed the Baron, short from his last collection, and whether she promised him the book. */
  owed: number;
  arrears: number;
  bookPromised: boolean;
  arc: ArcStage;
  respect: number;
  lanternHung: boolean;
}

/**
 * The Chapter 1 ending she's earned, checked in this order (the first that fits):
 * 1. **The Village Rises:** Mara free (`maraArrested` not set), trust at RISE_TRUST or more, and Keeper her
 *    biggest fan group.
 * 2. **Lost to the Night:** Known on her arc, respect at LOW_RESPECT or lower, and no lantern hung.
 * 3. **Paid in Full:** nothing owed (and nothing short), and she never promised Pell the book.
 * 4. **Open as Usual**, otherwise.
 */
export function chapterEndingFor(f: ChapterFacts): ChapterEndingId {
  if (!f.flags.has("maraArrested") && f.trust >= RISE_TRUST && biggestFanGroup(f.groups) === "keeper") return "overthrow";
  if (arcIndex(f.arc) >= arcIndex("known") && f.respect <= LOW_RESPECT && !f.lanternHung) return "lostToNight";
  if (f.owed <= 0 && f.arrears <= 0 && !f.bookPromised) return "paidInFull";
  return "openAsUsual";
}

/** What the First in Tarven card says of her biggest group (STORY.md 7: the card changes with it). */
export const GROUP_LINES: Readonly<Record<FanGroup, string>> = {
  keeper: "Most of them came for the stew, the ale and a safe seat by the fire. They'll keep coming for that.",
  lantern: "Most of them came for you, and they're not shy about saying so.",
  network: "Most of them came for what gets whispered at your tables, and for the fights. Everyone knows which house hears everything.",
};

export const TO_BE_CONTINUED = "(To be continued: the pass.)";

/** The First in Tarven card: the room, what came of Act 1 (plot.ts), her biggest group, and the riders at the door. */
export function firstInTarvenCard(flags: ReadonlySet<PlotFlag>, group: FanGroup): string[] {
  const [opening, ...rest] = FIRST_IN_TARVEN;
  return [opening, ...firstInTarvenLines(flags), GROUP_LINES[group], ...rest];
}

/** The ending's own card, after First in Tarven: its epilogue, then the teaser. */
export function chapterEndingCard(id: ChapterEndingId): { title: string; lines: string[] } {
  const ending = CHAPTER_ENDINGS[id];
  return { title: `Chapter 1: ${ending.title}`, lines: [...ending.epilogue, TO_BE_CONTINUED] };
}
