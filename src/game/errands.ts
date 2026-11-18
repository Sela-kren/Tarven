import type { Dress, OutfitStyle } from "./towntalk";
import type { ArcStage } from "./lewd";

/**
 * Her day errands in the market square (TOWN_DAY.md §3, build step 2): two simple things that make going out pay
 * from day 1.
 *
 * - **The market stalls:** cups and dishes, cheaper than the delivery cart on the house plans (`STOCK_COST`,
 *   `REPLACE_COST` in tavern.ts). Dearer once Silas's crew have been crossed: his cousins run half the stalls.
 * - **Flyers:** handed out in the square, once a day. Her outfit, Flirt and Fame decide who listens: a few more
 *   guests tonight and a few fans at dawn. Showing more draws more, and costs Respect.
 * - **The town feed:** posted from her phone, once a day. Quicker and cheaper than flyers, but every message goes
 *   through the Baron's relay stone and Pell reads it all (WORLD.md): +1 heat.
 *
 * Every errand costs hours (TOWN_DAY.md §2): the game moves the clock on, never past five.
 */

/** The stalls' price for a set of cups or dishes (the cart's is 10), and for one to replace a broken one (2). */
export const MARKET_PACK_COST = 7;
export const MARKET_REPLACE_COST = 1;
/** What the stalls add once Silas has been crossed (plot.ts `bottlesDearer`). */
export const MARKET_SILAS_MARKUP = 2;
/** Hours a purchase at the stalls takes (haggling included). */
export const MARKET_HOURS = 0.5;

/** Flyers: the paper costs this, and handing them out takes this long. */
export const FLYER_COST = 3;
export const FLYER_HOURS = 1.5;
/** The feed: a post costs this (the relay's fee), and this long to write. */
export const FEED_COST = 1;
export const FEED_HOURS = 0.25;
/** Most guests her errands can bring in one night, flyers and feed together. */
export const MAX_ERRAND_GUESTS = 5;

/** The hour the stalls pack up and the square empties: the same five o'clock as the bell. */
export const ERRANDS_CLOSE_HOUR = 17;

export function marketPackCost(silasCrossed: boolean): number {
  return MARKET_PACK_COST + (silasCrossed ? MARKET_SILAS_MARKUP : 0);
}

export function marketReplaceCost(silasCrossed: boolean): number {
  return MARKET_REPLACE_COST + (silasCrossed ? MARKET_SILAS_MARKUP : 0);
}

/** What the square reads off her as she hands out flyers. */
export interface FlyerFacts {
  flirt: number;
  fame: number;
  respect: number;
  dress: Dress;
  outfit: OutfitStyle;
  arc: ArcStage;
}

/** What an errand did: guests tonight, fans at dawn, what it does to her name, and a line for the log. */
export interface ErrandResult {
  guests: number;
  fans: number;
  respect: number;
  fame: number;
  lust: number;
  heat: number;
  line: string;
}

/** How much she's showing, 0 (decent) to 4 (nothing on). */
function showing(dress: Dress, outfit: OutfitStyle): number {
  const bare: Record<Dress, number> = { dressed: 0, missingPiece: 1, underwear: 2, topless: 3, bareBottom: 3, naked: 4 };
  const cut = outfit === "revealing" || outfit === "lingerie" ? 1 : 0;
  return Math.min(4, bare[dress] + (bare[dress] === 0 ? cut : 0));
}

const FLYER_LINES: Record<number, readonly string[]> = {
  0: [
    "You hand out flyers by the market cross. Most people take one to be polite. A few actually read it.",
    "An hour of \"Stew tonight, best on the pass!\" A goblin asks if the stew comes with a phone charm. It doesn't.",
  ],
  1: [
    "Your flyers go faster than you'd like to admit. Nobody's reading the bit about the stew.",
    "A farmer takes three flyers and doesn't look at any of them. He's looking at you.",
  ],
  2: [
    "You stand by the market cross in your underwear with a stack of flyers. The stack goes very fast. The chapel bell rings, a little pointedly.",
    "A queue forms. Nobody in it wants a flyer; everyone in it takes one.",
  ],
  3: [
    "You hand out flyers half bare in the square. Somebody photographs it. By noon it's on the feed, and so is the address.",
    "Nobody has ever paid this much attention to a flyer. Brother Oden crosses the square without looking. Twice.",
  ],
  4: [
    "You hand out flyers in nothing at all. The square stops. Every flyer is gone in minutes, and so is most of your reputation.",
    "Naked by the market cross with a stack of flyers: the most read advertisement in Tarven's history.",
  ],
};

/**
 * Handing out flyers in the square. Guests: 1, more with Flirt and Fame, and more the more she shows (up to 2 more).
 * Fans: 1, plus 1 a 25 Fame. Showing costs Respect (1 a level past decent) and adds Fame and Lust; a Known woman is
 * old news, so it costs her less. `rng` (0 to 1) picks the line and a small swing in who listens.
 */
export function handOutFlyers(f: FlyerFacts, rng: () => number): ErrandResult {
  const show = showing(f.dress, f.outfit);
  const known = f.arc === "known" || f.arc === "legend";
  const pull = 1 + Math.floor(f.flirt / 4) + Math.floor(f.fame / 30) + Math.min(2, Math.ceil(show / 2)) + (rng() < 0.3 ? 1 : 0);
  const guests = Math.max(1, Math.min(MAX_ERRAND_GUESTS, pull - (f.respect <= -5 && show === 0 ? 1 : 0)));
  const fans = 1 + Math.floor(f.fame / 25) + (show >= 2 ? 1 : 0);
  const respect = show === 0 ? 0 : -(known ? Math.max(0, show - 2) : show);
  const lines = FLYER_LINES[show];
  return {
    guests,
    fans,
    respect,
    fame: show >= 2 ? 1 : 0,
    lust: show >= 1 ? 1 : 0,
    heat: 0,
    line: `${lines[Math.floor(rng() * lines.length) % lines.length]} (${guests} more tonight, +${fans} fan${fans === 1 ? "" : "s"} at dawn.)`,
  };
}

const FEED_LINES = [
  "You post tonight's menu on the town feed. Three likes, one from a goat account. Somewhere in the keep, Pell reads it twice.",
  "\"Fresh stew, cold ale, warm welcome.\" Posted. The relay stone glows as it goes through. Pell will have read it before the stew's warm.",
  "You post a photo of the taproom on the feed. Someone replies asking if you'll be in it. Pell saves the photo.",
];

/** Posting on the town feed: one guest, two with Fame 30+, a fan; and +1 heat, because Pell reads everything. */
export function postOnFeed(fame: number, rng: () => number): ErrandResult {
  const guests = 1 + (fame >= 30 ? 1 : 0);
  return {
    guests,
    fans: 1,
    respect: 0,
    fame: 0,
    lust: 0,
    heat: 1,
    line: `${FEED_LINES[Math.floor(rng() * FEED_LINES.length) % FEED_LINES.length]} (${guests} more tonight, +1 fan at dawn, +1 heat.)`,
  };
}
