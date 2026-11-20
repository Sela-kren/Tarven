/**
 * Being seen (TOWN_DAY.md section 4, build step 5): what the town's notice does to her by day. The words are in
 * towntalk.ts (who says what about her stage, her name, her clothes); this is what they cost and bring.
 *
 * - **What's done with a word** (towntalk.ts `TownAct`): a photo spreads her name on the feed, for better or worse;
 *   a proposition she says yes to brings that person to her bar tonight; a hand that lands (only with the Consent
 *   switch off, the GAME_PATH.MD exception out of doors) stirs her like one in the taproom; a whistle, once she
 *   likes them, stirs her a little.
 * - **What she wears outside counts:** a piece missing, her underthings, bare on top or below, or nothing at all, or
 *   out in Lantern wear or lingerie: the town notices, once a day for each step further. Respect goes down, Lust and
 *   Fame go up. Known, she's past most of the Respect it costs.
 * - **The walk of shame:** out before noon still messy from last night, or in last night's state of dress, the
 *   street makes a scene of it, once a day.
 *
 * Pure rules: the game fills `SeenFacts` and applies the `SeenEffect`s (Tavern.beSeen). Lines fit both siblings
 * ("you"), and nothing here happens while she's passed out: she's on her feet in the street.
 */
import type { ArcStage } from "./lewd";
import type { Dress, OutfitStyle, TownAct } from "./towntalk";

export interface SeenFacts {
  arc: ArcStage;
  dress: Dress;
  outfit: OutfitStyle;
  /** Something from last night is still on her. */
  messy: boolean;
  /** The hour, 8 to 17. */
  hour: number;
  /** Things the town has noticed today (Tavern.townDoneToday, the "seen:" ones). */
  today: ReadonlySet<string>;
  /**
   * The dress code (townhall.ts `lawEffects`): how much Respect being seen costs, 1 as the Baron left it, 2 under a
   * modest code, 0 once bare is legal; and bare legal, when it costs her no heat either. Left out: the Baron's.
   */
  exposureRespect?: number;
  bareLegal?: boolean;
}

/** What being seen does to her. Each part is optional. */
export interface SeenEffect {
  /** For the log, and the key it's marked under today (so it isn't counted twice). */
  line: string;
  mark: string;
  respect?: number;
  fame?: number;
  lust?: number;
  flirt?: number;
  heat?: number;
  /** Fans at dawn, and guests tonight. */
  fans?: number;
  guests?: number;
  /** Desire, to her strongest meter or to the part a hand found. */
  desire?: number;
  touched?: "butt" | "breasts";
}

const ARC_ORDER: readonly ArcStage[] = ["sheltered", "curious", "willing", "known", "legend"];
const atLeast = (arc: ArcStage, stage: ArcStage) => ARC_ORDER.indexOf(arc) >= ARC_ORDER.indexOf(stage);
const pick = <T>(list: readonly T[], roll: number): T => list[Math.floor(roll * list.length) % list.length];

// ---- Acts ----

/** Photos a day that count: past these, she's just one more face on the feed. */
export const PHOTOS_A_DAY = 3;
/** Propositions she says yes to that bring someone in tonight, a day. */
export const YESES_A_DAY = 3;

const PHOTO_DRESSED = [
  "(Someone took your photo. It's on the feed by noon: \"the new keeper, in the square\".)",
  "(A photo of you by the well goes up on the feed. A few people ask where your tavern is.)",
];
const PHOTO_BARE = [
  "(Someone took your photo. In that state. The feed has opinions by noon, and so does the chapel.)",
  "(A photo of you, rather more of you than usual, goes round the feed. Your name travels. So does the rest.)",
];

/**
 * What a townsperson's act does to her, once its line has been said. `answer` is hers to an asked question (a
 * proposition), null when nothing was asked. Null for acts that are just words (a nod, a bow, a coin offer she
 * didn't take up), or past today's limit.
 */
export function actEffect(act: TownAct, answer: "yes" | "no" | null, f: SeenFacts, roll: number): SeenEffect | null {
  const counted = (prefix: string) => [...f.today].filter((k) => k.startsWith(prefix)).length;
  switch (act) {
    case "photo": {
      const n = counted("seen:photo:");
      if (n >= PHOTOS_A_DAY) return null;
      const bare = f.dress !== "dressed" || f.outfit === "lingerie";
      return bare
        ? { line: pick(PHOTO_BARE, roll), mark: `seen:photo:${n}`, fame: 1, fans: 1, lust: 1 }
        : { line: pick(PHOTO_DRESSED, roll), mark: `seen:photo:${n}`, fans: 1 };
    }
    case "proposition": {
      if (answer !== "yes") return null;
      const n = counted("seen:yes:");
      if (n >= YESES_A_DAY) return null;
      return { line: "(You said yes. They'll be at your bar tonight, early, and keen.)", mark: `seen:yes:${n}`, guests: 1, flirt: 1, desire: 5 };
    }
    case "grope":
      // Only the hands that land without asking carry this act (Consent off); asked ones are a proposition.
      return {
        line: "(A stranger's hand, in the open street. Nobody stops. Your skin keeps the print of it a while.)",
        mark: `seen:grope:${counted("seen:grope:")}`,
        touched: roll < 0.5 ? "butt" : "breasts",
        desire: 6,
      };
    case "whistle":
      return atLeast(f.arc, "curious") ? { line: "", mark: `seen:whistle:${counted("seen:whistle:")}`, desire: 2 } : null;
    default:
      return null;
  }
}

// ---- What she wears ----

/** How much of her the street sees, 0 (dressed for the day) to 4 (nothing on). */
export function exposure(dress: Dress, outfit: OutfitStyle): number {
  const shown = { dressed: 0, missingPiece: 1, underwear: 2, topless: 3, bareBottom: 3, naked: 4 }[dress];
  return Math.max(shown, outfit === "lingerie" ? 2 : outfit === "revealing" ? 1 : 0);
}

const OUTFIT_LINES: Record<1 | 2 | 3 | 4, readonly string[]> = {
  1: ["(Heads turn as you pass. A dress like that, by daylight, in the square: the town will talk.)"],
  2: ["(Your underthings, out in the high street. A cart stops. The carter doesn't pretend not to look.)"],
  3: ["(Half bare in the high street. The square goes quiet, then very loud. Somebody runs for the garrison.)"],
  4: ["(Nothing on, in the middle of town. Tarven will be telling this one for forty years.)"],
};
const OUTFIT_EFFECT: Record<1 | 2 | 3 | 4, Omit<SeenEffect, "line" | "mark">> = {
  1: { respect: -1, lust: 1, fame: 1 },
  2: { respect: -1, lust: 1, fame: 2 },
  3: { respect: -2, lust: 2, fame: 3, heat: 1 },
  4: { respect: -3, lust: 2, fame: 4, heat: 1 },
};

/**
 * The town noticing what she's out in: once a day for each step further she goes (a piece missing, then her
 * underthings, then bare, then nothing). Known or past it, it costs her a point less Respect: they've seen it.
 * Null when there's nothing new to notice.
 */
export function outfitNoticed(f: SeenFacts, roll: number): SeenEffect | null {
  const level = exposure(f.dress, f.outfit) as 0 | 1 | 2 | 3 | 4;
  if (level === 0 || f.today.has(`seen:outfit:${level}`)) return null;
  const effect = { ...OUTFIT_EFFECT[level] };
  // (`|| 0` keeps a legal bare from costing "-0" Respect.)
  effect.respect = (effect.respect ?? 0) * (f.exposureRespect ?? 1) || 0;
  if (f.bareLegal) delete effect.heat;
  if (atLeast(f.arc, "known")) effect.respect = Math.min(0, effect.respect + 1);
  return { ...effect, line: pick(OUTFIT_LINES[level], roll), mark: `seen:outfit:${level}` };
}

// ---- The walk of shame ----

/** Before this hour, going out messy or undressed is the walk of shame. */
export const SHAME_BEFORE = 12;

export interface ShameScene {
  title: string;
  lines: readonly string[];
  effect: SeenEffect;
}

const SHAME_LINES: Record<"early" | "willing" | "known", readonly (readonly string[])[]> = {
  early: [
    [
      "You step out into the morning and the morning steps back.",
      "Last night is still on you, plain as a sign. The baker's boy drops a loaf. Two old women by the well stop mid-sentence and start a much better one.",
      "You walk faster. It doesn't help. Tarven has excellent eyesight before noon.",
    ],
    [
      "The high street is busy. It gets busier.",
      "A farmer tips his hat, looks again, and tips it again, slower. Somebody's child asks what's on you. Somebody's mother says \"Nothing, dear\" in a voice that means everything.",
    ],
  ],
  willing: [
    [
      "You walk the high street in last night's state, and you take your time about it.",
      "The square watches. You let it. By the well, a soldier from last night raises his cup to you, and his friends cheer.",
    ],
  ],
  known: [
    [
      "The walk of shame, they call it. In Tarven, for you, it's more of a parade.",
      "People line the high street. Somebody's selling buns. A child hands you a flower. Three regulars from last night bow as you pass.",
    ],
  ],
};

/**
 * The walk of shame: out before noon, still messy from last night or in last night's state of dress, once a day.
 * Sheltered or Curious, it's mortifying; Willing, she owns it; Known, it's a parade. It spreads her name either way.
 */
export function walkOfShame(f: SeenFacts, roll: number): ShameScene | null {
  if (f.hour >= SHAME_BEFORE || f.today.has("seen:walk")) return null;
  if (!f.messy && f.dress === "dressed") return null;
  const stage = atLeast(f.arc, "known") ? "known" : f.arc === "willing" ? "willing" : "early";
  const effect: SeenEffect =
    stage === "early"
      ? { line: "(The walk of shame. The whole high street saw.)", mark: "seen:walk", respect: -1, fame: 2, lust: 1 }
      : stage === "willing"
        ? { line: "(The walk of shame, and you walked it slow.)", mark: "seen:walk", fame: 2, lust: 1, guests: 1 }
        : { line: "(The walk of shame, as a parade. Half of them will be at your bar tonight.)", mark: "seen:walk", fame: 3, lust: 1, guests: 2 };
  return { title: "The Walk of Shame", lines: pick(SHAME_LINES[stage], roll), effect };
}
