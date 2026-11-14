/**
 * Bar work, Karryn's Prison style (her waitress job): the room reads her, and the job gets harder the better known
 * she is. The rules live here; the tavern (tavern.ts) calls them.
 *
 * - **The table joins in:** once she lets one guest's hand land, someone else at their table may want a turn. It's a
 *   new reach, asked like any other (Pull away always there; Consent off, the push-vs-hold check).
 * - **The tray:** a hand landing on her while she's still carrying cups can make her drop the lot.
 * - **A known tavern:** the more famous she is, the bolder the crowd (her bar reputation).
 * - **They can tell:** horny or wet, it shows, and the room gets bolder for it.
 * - **Dead drunk:** past her limit she's done for the night; sober nights and dead-drunk nights both count.
 * - **Fixing her clothes:** behind the bar, with empty hands, she can put a piece back on while the room waits.
 */
import type { GuestKind } from "./tavern";

// ---------- The table joins in ----------

/** Least nerve a tablemate needs to follow up. */
export const JOIN_NERVE = 3;
/** The chance a tablemate with JOIN_NERVE follows up, and how much more per point of nerve past it. */
export const JOIN_BASE = 0.3;
export const JOIN_PER_NERVE = 0.08;
/** Lusting or drunk, they're this much likelier to. */
export const JOIN_LOOSE = 1.5;
export const JOIN_MAX = 0.75;

/** How likely a tablemate is to want a turn, having watched her let someone's hand land. */
export function joinChance(mateNerve: number, loose: boolean): number {
  if (mateNerve < JOIN_NERVE) return 0;
  return Math.min(JOIN_MAX, (JOIN_BASE + JOIN_PER_NERVE * (mateNerve - JOIN_NERVE)) * (loose ? JOIN_LOOSE : 1));
}

/** Said as the tablemate makes their move. `{who}` is them. */
export const JOIN_LINES: readonly string[] = [
  "The {who} beside them has been watching every second of it. \"My turn.\"",
  "Seeing that, the {who} across the table leans in too.",
  "\"Don't keep it all to yourself,\" the {who} next to them says, and reaches.",
  "The {who} at the same table elbows their mate aside. \"Shove over.\"",
];

/** Their tablemates cheer the first one on, by kind. */
export const JOIN_CHEERS: Record<GuestKind, readonly string[]> = {
  farmer: ["Go on, then! She won't bite."],
  smuggler: ["Fair shares. That's the rule at this table."],
  soldier: ["Form a line, lads!"],
  fugitive: ["...Can I? Just once?"],
  adventurer: ["Party loot gets split even!"],
  bandit: ["What's his is mine."],
  noble: ["One does like to keep up."],
};

// ---------- The tray ----------

/** The chance a hand landing on her makes her drop what she's carrying, and how much more per point of boldness. */
export const TRAY_DROP_BASE = 0.1;
export const TRAY_DROP_PER_LEVEL = 0.03;
/** Leaning into it, she forgets the tray altogether. */
export const TRAY_DROP_LEAN = 1.5;
/** Sloppy drunk, she's all thumbs. */
export const TRAY_DROP_DRUNK = 1.5;
/** Each agility level past 1 takes this much off the chance, as a fraction. */
export const TRAY_DROP_AGILITY = 0.08;

/** How likely a touch that's landed is to make her drop what she's carrying. */
export function trayDropChance(level: number, f: { lean: boolean; sloppy: boolean; agility: number }): number {
  const steady = Math.max(0, 1 - TRAY_DROP_AGILITY * Math.max(0, f.agility - 1));
  return Math.min(0.9, (TRAY_DROP_BASE + TRAY_DROP_PER_LEVEL * level) * (f.lean ? TRAY_DROP_LEAN : 1) * (f.sloppy ? TRAY_DROP_DRUNK : 1) * steady);
}

export const TRAY_DROP_LINES: readonly string[] = [
  "The tray tips out of your hand. CRASH. Everything on it goes over the floor.",
  "Your fingers forget the tray. It hits the boards, and the cups go everywhere.",
  "You lose your grip on the tray, and the whole lot smashes at your feet.",
];

// ---------- A known tavern, and a room that can tell ----------

/** Fame that makes the crowd bolder: +1 nerve at the first, +2 at the second (fame runs 0 to 100). */
export const FAME_NERVE_AT: readonly [number, number] = [40, 80];
/** Nerve the room gets when she's horny, and when she's wet: they can tell. */
export const HORNY_NERVE = 1;
export const WET_NERVE = 1;

/** What the room reads off her: how well known the tavern is, and whether she's worked up. */
export function roomNerve(f: { fame: number; horny: boolean; wet: boolean }): number {
  const fame = f.fame >= FAME_NERVE_AT[1] ? 2 : f.fame >= FAME_NERVE_AT[0] ? 1 : 0;
  return fame + (f.horny ? HORNY_NERVE : 0) + (f.wet ? WET_NERVE : 0);
}

// ---------- Dead drunk ----------

/**
 * How much she can drink past the top of drunk (DRUNK_MAX) before she's done for the night, in drinks. At the top
 * she's as drunk as she gets; what she drinks after that piles up as "over the limit" and wears off first. With
 * eight drinks to reach the top (too drunk to say yes at the 8th), she passes out on the 9th drink in a row. Passives add more
 * (`Effects.holdLiquor`).
 */
export const PASS_OUT_DRINKS_PAST = 1;

/** How far over the limit she can go, in drunk points, before she passes out. */
export function passOutLimit(drinkStrength: number, holdLiquor: number): number {
  return (PASS_OUT_DRINKS_PAST + holdLiquor) * drinkStrength;
}
/** What passing out costs her: respect, as the room carries her off. */
export const PASS_OUT_RESPECT = -2;
/** Least orders served for a night without a drink to count as a sober shift. */
export const SOBER_NIGHT_SERVED = 5;

export const PASS_OUT_LINES: readonly string[] = [
  "The room tips sideways. The last thing you hear is a cheer, and then the floor.",
  "One cup too many. Your knees fold, and somebody catches you before your head hits the bench.",
  "You set the cup down, very carefully, and then you're asleep on the bar.",
];
export const PASS_OUT_AFTER = "The regulars carry you up to bed and see themselves out. Nobody pays for the last round.";
/**
 * Her last clear drink: one more and she's too drunk to say yes to anything (sloppy drunk blocks every yes,
 * GAME_PATH.MD). An aroused guest she drank with goes for adult play now, while she can still answer: Consent on,
 * it's asked, Yes or No; Consent off, her state decides, as for any adult play. A yes needs her ready, as ever. Once
 * a night. Passed out, nothing happens.
 */
export const LAST_CLEAR_LINES: readonly string[] = [
  "You set your cup down, very deliberately, and look round the room at all of them. \"Why stop at one of you?\"",
  "You climb up onto the bench, cup raised, while you can still stand on it. \"Who's had enough of just watching?\"",
  "You put your hand over the top of your cup and turn to the room. \"Not another drink. Something else. All of you.\"",
];
export const LAST_CLEAR_THOUGHT = "(One more and I won't be able to think straight. If I'm going to say yes to anything, it's now.)";
/** The Adult play card, when she's put it to the whole room and the room's answering. */
export const WHOLE_ROOM_LINES: readonly string[] = [
  "The room goes quiet, then chairs scrape back all over the taproom. They're waiting on you.",
  "Somebody bangs the table, and then everybody does. Every one of them is looking at you.",
  "Nobody's talking about anything else now. They're waiting for you to say where.",
];
/** A warning, the drink before. */
export const ONE_MORE_WARNING = "(One more and I'll be under the table.)";

// ---------- Fixing her clothes ----------

/**
 * How long she takes over it, acted out on her (player.ts): the piece stays off until her hands have brought it up
 * this far through.
 */
export const REDRESS_SECONDS = 1.4;
export const REDRESS_ON_AT = 0.5;
/** How long she takes to go down when she passes out, and how long she lies there before the room carries her up. */
export const FAINT_SECONDS = 1.6;
export const FAINT_HOLD = 1.2;

/** How much of every waiting guest's patience goes while she's behind the bar putting a piece back on. */
export const REDRESS_PATIENCE = 0.15;

export const REDRESS_LINES: readonly string[] = [
  "You duck behind the bar and put your {piece} back on, fast.",
  "Behind the bar, out of sight, you get your {piece} back where it belongs.",
  "You crouch behind the bar and wriggle back into your {piece}. Someone groans in disappointment.",
];
