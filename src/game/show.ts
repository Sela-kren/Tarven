/**
 * "Give us a look": a guest offers coin for a look at her, as she serves them. They name what they want to see, and
 * she picks what she shows them, one thing at a time, each acted out on her model (GAME_PATH.MD 7e):
 *
 * - Her breast band: her top pulled down (or, for a top that can't come down, lifted up) off it.
 * - Her breasts: her top pulled down or lifted up, and her band with it, bare: both of them, or (by chance) just
 *   her left or just her right, her other hand on her hip.
 * - Her smallclothes: her skirt lifted at the front.
 * - Her pussy: her skirt lifted at the front, her smallclothes off.
 * - Her behind: she turns round and lifts her skirt behind, her smallclothes off.
 *
 * It's always asked, and only ever her doing (GAME_PATH.MD, consent rule): she can say no, and nothing happens
 * that she didn't choose. Too drunk on either side, and no yes is there. How far she'll go depends on how much
 * that part of her wants it (its desire meter), less what her exhibition passives have done to her.
 *
 * Whatever she shows makes the guest hornier and bolder; a bare look warms the whole room.
 */
import type { Meter } from "./passives";
import type { GuestKind } from "./tavern";

export type ShowPart = "band" | "breasts" | "smalls" | "pussy" | "butt";

/** Everything she can show, in the order her answers list them: top half first, then bottom. */
export const SHOW_PARTS: readonly ShowPart[] = ["band", "breasts", "smalls", "pussy", "butt"];

/** Which of her breasts she bares: both, or just the one, her own left or right. */
export type ShowSide = "both" | "left" | "right";
/** Picked at random each time she shows her breasts, each as likely. */
export const SHOW_SIDES: readonly ShowSide[] = ["both", "left", "right"];

/** Her underwear (a peek: nothing bare), or bare skin. */
export type ShowHow = "peek" | "bare";
export const SHOW_HOW: Record<ShowPart, ShowHow> = { band: "peek", breasts: "bare", smalls: "peek", pussy: "bare", butt: "bare" };

/** The piece of underwear each peek shows (the wardrobe's garment ids): she can't show what she's lost tonight. */
export const SHOW_UNDER: Partial<Record<ShowPart, string>> = { band: "bra", smalls: "smalls" };

/** The desire meter each answers to. Her smallclothes are shown from the front. */
export const SHOW_METER: Record<ShowPart, Meter> = { band: "breasts", breasts: "breasts", smalls: "pussy", pussy: "pussy", butt: "butt" };

/** How much desire (meter ÷ 10) each takes. Exhibition passives take 1 off each, 2 at most. */
export const SHOW_NEED: Record<ShowPart, number> = { band: 0, breasts: 3, smalls: 2, pussy: 5, butt: 3 };

/** What each pays. */
export const SHOW_GOLD: Record<ShowPart, number> = { band: 2, breasts: 5, smalls: 3, pussy: 8, butt: 5 };
/** Showing them what they asked for pays this much more. */
export const SHOW_ASKED_BONUS = 2;

/** The nerve a guest needs to ask for each at all. */
export const SHOW_NERVE: Record<ShowPart, number> = { band: 2, breasts: 3, smalls: 3, pussy: 5, butt: 3 };

/** How much hornier (lust, 0–10) and bolder (as if she'd let them touch her this many times) it leaves them. */
export const SHOWN_LUST: Record<ShowHow, number> = { peek: 2, bare: 3 };
export const SHOWN_BOLD: Record<ShowHow, number> = { peek: 1, bare: 2 };
/** A bare look: everyone else in the room gets an eyeful too. */
export const ROOM_LUST = 1;
/** Her own desire for that part, after showing it. */
export const SHOWN_DESIRE: Record<ShowHow, number> = { peek: 5, bare: 10 };

/** The usual chance a guest asks, as she takes their order or serves them, before their nerve and mood. */
export const SHOW_CHANCE = 0.12;
export const SHOW_PER_NERVE = 0.03;
/** Lusting or drunk guests ask this much more often. */
export const SHOW_LOOSE = 1.5;
export const SHOW_MAX = 0.4;

/** How likely a guest of this kind, this bold, is to ask as she serves them. Nobody asks without the nerve for it. */
export function showChance(kind: GuestKind, guestNerve: number, loose: boolean, more = 0): number {
  if (guestNerve < SHOW_NERVE.band) return 0;
  const chance = (SHOW_CHANCE + SHOW_PER_NERVE * (guestNerve - SHOW_NERVE.band)) * SHOW_KIND[kind] * (loose ? SHOW_LOOSE : 1) * Math.max(0, 1 + more);
  return Math.min(SHOW_MAX, chance);
}

/**
 * What they ask to see: the part their type likes, if they've the nerve for it; short of that, the boldest thing on
 * the way to it they have the nerve for (her smallclothes, then her breasts, then her band).
 */
export function partToSee(prefers: string, guestNerve: number): ShowPart {
  const ladder: readonly ShowPart[] =
    prefers === "pussy" ? ["pussy", "smalls", "breasts", "band"] : prefers === "butt" ? ["butt", "smalls", "band"] : ["breasts", "band"];
  return ladder.find((part) => guestNerve >= SHOW_NERVE[part]) ?? "band";
}

/** How they ask, by what they want to see. `{gold}` is what they offer. */
export const SHOW_ASKS: Record<ShowPart, readonly string[]> = {
  band: [
    "{gold} gold says you'll give us a look down your front, innkeeper.",
    "Go on, love. Pull it down a bit, show us what's holding all that up. {gold} gold.",
    "Here's {gold} gold. Just a peek at what you've got on under there.",
  ],
  breasts: [
    "{gold} gold on the table. Let's see those, bare.",
    "Get them out, love. {gold} gold says you will.",
    "I'll make it worth {gold} gold. Out with them, all the way.",
  ],
  smalls: [
    "{gold} gold for a look up your skirt. Just what you've got on under it.",
    "Lift that hem for us, innkeeper. {gold} gold to see your smallclothes.",
    "Go on. {gold} gold, and show us what's under the skirt.",
  ],
  pussy: [
    "{gold} gold. Lift it up and let me see everything.",
    "I'll put {gold} gold down for a look between your legs. Just a look.",
    "Name your price. No? {gold} gold, then, to see what you're hiding down there.",
  ],
  butt: [
    "Turn round and give us a look at that behind. {gold} gold, right here.",
    "{gold} gold for a look under there, from the back. Bare. Go on.",
    "I've been watching you walk all night. {gold} gold to see it properly.",
  ],
};

/** What she thinks, as they wait for her answer. */
export const SHOW_THOUGHTS: readonly string[] = [
  "(The whole table's gone quiet, waiting.)",
  "(It's only a look. Isn't it?)",
  "(My face is burning. Why haven't I said no yet?)",
];

/** Her answers: one for each thing she can show, then no. `{under}` is what her underwear's called. */
export const SHOW_LABELS: Record<ShowPart, string> = {
  band: "Show them your {under}",
  breasts: "Show them your breasts",
  smalls: "Show them your {under}",
  pussy: "Show them your pussy",
  butt: "Show them your behind",
};
export const SHOW_NO_LABEL = "\"Not a chance.\"";
export const SHOW_NOT_READY = "(you're not ready for that)";
export const SHOW_TOO_DRUNK = "(too drunk to decide that)";
/** Underwear she isn't wearing tonight (a guest got it off her, or her style has none). */
export const SHOW_NOT_WEARING = "(you've nothing on there)";
/** Marks the one they asked for. */
export const SHOW_ASKED_MARK = "what they asked for";

/** What she does, by what she shows. `{top}` is how her top comes off it: "down" or "up". */
export const SHOW_TOLD: Record<ShowPart, readonly string[]> = {
  band: [
    "You hook your fingers in your neckline and drag it {top}, just for them. They lean in to look at your breast band and what it barely holds.",
    "You glance round, then work your top {top} until your band shows. Their eyes go straight to the swell of you inside it.",
  ],
  breasts: [
    "You pull everything {top}, band and all, and bare your breasts to the table. Someone drops a cup. You count to three.",
    "You drag it all {top} and let them look at your bare breasts, nipples tight in the cool air. The table roars.",
  ],
  smalls: [
    "You gather your skirt up at the front, slow, until they can see your smallclothes, and the shape of you through them.",
    "You hold the front of your skirt up at your waist. Their eyes fix on the thin cloth between your legs.",
  ],
  pussy: [
    "You lift your skirt at the front and slip your smallclothes down, and let them see your pussy, bare. Nobody at the table breathes.",
    "You hold everything up and part your legs, just a little, so they see all of you. The room goes silent, then explodes.",
  ],
  butt: [
    "You turn round, gather your skirt up behind and push your smallclothes down, baring your behind. A hand slaps the table. Then another.",
    "You turn, bend a little and lift your skirt behind you, bare underneath, for a long moment. The whole room sees.",
  ],
};

/** What she does baring just the one breast. `{top}` is as above; `{side}` is which, "left" or "right". */
export const SHOW_TOLD_ONE: readonly string[] = [
  "You tug your top {top} on the {side} only, band and all, and bare just the one breast, your other hand on your hip. Someone whistles.",
  "You hook one side {top} and let your {side} breast out, only that one, and cup it for them. They stare like it's the best thing in the room.",
];

/** What she says, saying yes, and saying no. */
export const SHOW_YES: readonly string[] = ["\"One look. That's all you get.\"", "\"Pay first.\"", "\"Don't blink.\""];
export const SHOW_NO: readonly string[] = ["\"Keep your coin. I'm not on the menu.\"", "\"Not a chance.\"", "\"In your dreams.\""];

/** What they say after, by answer; showing them something else than they asked for, `other`. */
export const SHOW_AFTER = {
  peek: ["Worth every coin.", "Now I want to see the rest.", "Gods. Do that again."],
  bare: ["I'm in love.", "Best gold I ever spent.", "I won't sleep tonight."],
  other: ["Not what I asked for. Not complaining, either.", "That'll do. Gods, that'll do.", "Next time, the rest of it."],
  no: ["Can't blame a body for asking.", "Your loss, innkeeper.", "I'll ask again when you've had a few."],
};

/** That part of her, for the log. */
export const PART_WORDS: Record<ShowPart, string> = {
  band: "breast band",
  breasts: "breasts",
  smalls: "smallclothes",
  pussy: "pussy",
  butt: "behind",
};

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
