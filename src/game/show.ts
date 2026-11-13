/**
 * "Give us a look": a guest offers coin for a look at her, as she serves them. Two ways she can say yes:
 *
 * - A peek: she lets them look inside her clothes, at what's under there (her breast band, her smallclothes).
 * - A proper look: she shows them that part of her bare, for a moment.
 *
 * It's always asked, and only ever her doing (GAME_PATH.MD, consent rule): she can say no, and nothing happens
 * that she didn't choose. Too drunk on either side, and neither yes is there. How far she'll go depends on how much
 * that part of her wants it (its desire meter), less what her exhibition passives have done to her.
 *
 * Whatever she shows makes the guest hornier and bolder; a proper look warms the whole room.
 */
import type { Meter } from "./passives";
import type { GuestKind } from "./tavern";

export type ShowPart = "breasts" | "butt" | "pussy";

export const SHOW_PARTS: readonly ShowPart[] = ["breasts", "butt", "pussy"];

/** The desire meter that part of her answers to. */
export const SHOW_METER: Record<ShowPart, Meter> = { breasts: "breasts", butt: "butt", pussy: "pussy" };

/** How much desire (meter ÷ 10) a proper look takes; a peek takes 3 less. Exhibition passives take 1 off each. */
export const SHOW_NEED: Record<ShowPart, number> = { breasts: 3, butt: 3, pussy: 5 };
export const PEEK_EASIER = 3;

/** What they pay: a peek, and a proper look. */
export const SHOW_GOLD: Record<ShowPart, { peek: number; bare: number }> = {
  breasts: { peek: 2, bare: 5 },
  butt: { peek: 2, bare: 5 },
  pussy: { peek: 4, bare: 8 },
};

/** The nerve a guest needs to ask for that part at all. */
export const SHOW_NERVE: Record<ShowPart, number> = { breasts: 3, butt: 3, pussy: 6 };

/** How much hornier (lust, 0–10) and bolder (as if she'd let them touch her this many times) it leaves them. */
export const SHOWN_LUST = { peek: 2, bare: 3 };
export const SHOWN_BOLD = { peek: 1, bare: 2 };
/** A proper look: everyone else in the room gets an eyeful too. */
export const ROOM_LUST = 1;
/** Her own desire for that part, after showing it. */
export const SHOWN_DESIRE = { peek: 5, bare: 10 };

/** The usual chance a guest asks, as she serves them, before their nerve and mood. */
export const SHOW_CHANCE = 0.06;
export const SHOW_PER_NERVE = 0.02;
/** Lusting or drunk guests ask this much more often. */
export const SHOW_LOOSE = 1.5;
export const SHOW_MAX = 0.3;

/** How likely a guest of this kind, this bold, is to ask as she serves them. Nobody asks without the nerve for it. */
export function showChance(kind: GuestKind, guestNerve: number, loose: boolean, more = 0): number {
  if (guestNerve < SHOW_NERVE.breasts) return 0;
  const chance = (SHOW_CHANCE + SHOW_PER_NERVE * (guestNerve - 3)) * SHOW_KIND[kind] * (loose ? SHOW_LOOSE : 1) * Math.max(0, 1 + more);
  return Math.min(SHOW_MAX, chance);
}

/** What they ask to see: the part their type likes, if they've the nerve for it, and her breasts otherwise. */
export function partToSee(prefers: string, guestNerve: number): ShowPart {
  const liked = (SHOW_PARTS as readonly string[]).includes(prefers) ? (prefers as ShowPart) : "breasts";
  if (guestNerve >= SHOW_NERVE[liked]) return liked;
  return "breasts";
}

/** How they ask, by part. `{gold}` is what they offer for a proper look. */
export const SHOW_ASKS: Record<ShowPart, readonly string[]> = {
  breasts: [
    "{gold} gold says you'll give us a look down your front, innkeeper.",
    "Go on, love. A peek at what's under there. I'll make it worth {gold} gold.",
    "Here's {gold} gold on the table. Let's see those.",
  ],
  butt: [
    "Turn round and give us a look at that behind. {gold} gold, right here.",
    "{gold} gold for a look under there, from the back. Go on.",
    "I've been watching you walk all night. {gold} gold to see it properly.",
  ],
  pussy: [
    "{gold} gold. Lift it up and let me see everything.",
    "I'll put {gold} gold down for a look between your legs. Just a look.",
    "Name your price. No? {gold} gold, then, to see what you're hiding down there.",
  ],
};

/** What she thinks, as they wait for her answer. */
export const SHOW_THOUGHTS: readonly string[] = [
  "(The whole table's gone quiet, waiting.)",
  "(It's only a look. Isn't it?)",
  "(My face is burning. Why haven't I said no yet?)",
];

/** Her answers. */
export const SHOW_PEEK_LABEL = "Let them peek inside your clothes";
export const SHOW_BARE_LABEL = "Show them properly";
export const SHOW_NO_LABEL = "\"Not a chance.\"";
export const SHOW_NOT_READY = "(you're not ready for that)";
export const SHOW_TOO_DRUNK = "(too drunk to decide that)";

/** A peek inside her clothes, by part. */
export const SHOW_PEEKS: Record<ShowPart, readonly string[]> = {
  breasts: [
    "You hook a finger in your neckline and pull it out, just for them. They lean in to look down your front, at your breast band and what it barely holds.",
    "You glance round, then tug your top aside for a heartbeat. Their eyes go straight to the swell under your band.",
  ],
  butt: [
    "You turn and lift the back of your hem a hand's width. They get a look at your smallclothes stretched tight over your behind.",
    "You flick up the back for a moment. Long enough for them to see your smallclothes, and how little they cover.",
  ],
  pussy: [
    "You lift your hem at the front, slow, until they can see your smallclothes, and the shape of you through them.",
    "You hold the front up just long enough. Their eyes fix on the thin cloth between your legs.",
  ],
};

/** A proper look, bare, by part. */
export const SHOW_BARES: Record<ShowPart, readonly string[]> = {
  breasts: [
    "You pull everything down and bare your breasts to the table. Someone drops a cup. You count to three and cover up.",
    "You lift it all clear and let them look at your bare breasts, nipples tight in the cool air. The table roars.",
  ],
  butt: [
    "You turn round, lift everything and pull your smallclothes down, baring your behind. A hand slaps the table. Then another.",
    "You bend a little and bare your behind to them, all of it, for a long moment. The whole room sees.",
  ],
  pussy: [
    "You lift your hem and pull your smallclothes aside, and let them see your pussy, bare. Nobody at the table breathes.",
    "You hold everything up and part your legs, just a little, so they see all of you. The room goes silent, then explodes.",
  ],
};

/** What she says, saying yes, and saying no. */
export const SHOW_YES: readonly string[] = ["\"One look. That's all you get.\"", "\"Pay first.\"", "\"Don't blink.\""];
export const SHOW_NO: readonly string[] = ["\"Keep your coin. I'm not on the menu.\"", "\"Not a chance.\"", "\"In your dreams.\""];

/** What they say after, by answer. */
export const SHOW_AFTER = {
  peek: ["Worth every coin.", "Now I want to see the rest.", "Gods. Do that again."],
  bare: ["I'm in love.", "Best gold I ever spent.", "I won't sleep tonight."],
  no: ["Can't blame a body for asking.", "Your loss, innkeeper.", "I'll ask again when you've had a few."],
};

/** That part of her, for the log. */
export const PART_WORDS: Record<ShowPart, string> = { breasts: "breasts", butt: "behind", pussy: "pussy" };

/** How likely each kind is to ask, as a share of the usual. */
export const SHOW_KIND: Record<GuestKind, number> = {
  farmer: 0.8,
  smuggler: 1.1,
  soldier: 1.2,
  fugitive: 0.5,
  adventurer: 1.1,
  bandit: 1.4,
  noble: 1,
};
