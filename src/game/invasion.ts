/**
 * Night invasion, Karryn's Prison style (GAME_PATH.MD consent rule, Consent off only; KP's postMasturbationBattle).
 *
 * In KP, Karryn masturbating in her office makes noise, and the noise can draw inmates in: a battle starts while
 * she's still worked up, and if she came they get the first move. Here, easing the ache herself at bedtime can draw
 * back a guest who left tonight wanting her (lust that showed, sober, never the Baron): they slip in through the
 * door, into her room, and it's a brawl with every brawl rule. Win, and they're out and the door's barred; lose, and
 * it's KP's defeat, right there in her room, with no Stop.
 *
 * Never with Consent on. Never anyone roaring drunk. Pure rules and lines, kept apart from tavern.ts for the tests.
 */

/** KP's base chance an invasion comes (its prison level one: 20%); here a little lower, the tavern's door has a bar. */
export const INVASION_BASE = 0.15;
/** Her noise: up to this much more, the more worked up she was (her strongest desire). */
export const INVASION_NOISE = 0.25;
/** KP's reaction score makes her louder: each Slut Level adds this much. */
export const INVASION_PER_SLUT = 0.03;
/** A known tavern draws more lurkers: this much at fame 100. */
export const INVASION_FAME = 0.1;
/** Never likelier than this. */
export const INVASION_MAX = 0.6;
/** At most this many come in. */
export const INVADERS_MAX = 3;

export interface InvasionFacts {
  /** Her strongest desire, 0 to 100, as she starts. */
  desire: number;
  slutLevel: number;
  fame: number;
  /** How many left tonight wanting her: with nobody, nobody comes. */
  candidates: number;
}

/** How likely it is someone comes in while she eases the ache. */
export function invasionChance(f: InvasionFacts): number {
  if (f.candidates <= 0) return 0;
  const chance =
    INVASION_BASE +
    (Math.max(0, Math.min(100, f.desire)) / 100) * INVASION_NOISE +
    Math.max(0, f.slutLevel) * INVASION_PER_SLUT +
    (Math.max(0, Math.min(100, f.fame)) / 100) * INVASION_FAME;
  return Math.min(INVASION_MAX, chance);
}

/** How many come in: one, and more the louder she was, up to who's out there. `roll` is 0 to 1. */
export function invaderCount(candidates: number, desire: number, roll: number): number {
  const more = roll < desire / 100 ? 2 : roll < desire / 200 + 0.2 ? 1 : 0;
  return Math.max(1, Math.min(candidates, INVADERS_MAX, 1 + more));
}

/** Her noise, as it carries: said before the door goes. */
export const NOISE_LINES: readonly string[] = [
  "You bite the pillow, but the last cry still gets out, loud enough to carry down the stairs.",
  "The bed creaks against the wall, again and again. Anyone in the lane could hear it.",
  "You forget to be quiet. You forget everything for a moment.",
];

/** The door going: they're in. {Name} is the first of them; {n} how many. */
export const DOOR_LINES: readonly string[] = [
  "The latch lifts. {Name} from tonight slips in, eyes on you, still flushed and bare on the bed.",
  "The door creaks open. It's {name}, who left wanting you tonight. \"Heard you from the lane, innkeeper.\"",
  "A board creaks on the landing, then the door. {Name} stands there grinning. \"Don't stop on my account.\"",
];
export const DOOR_CREW_LINES: readonly string[] = [
  "The door bangs open. {Name} and {more} more from tonight crowd into your room. \"Sounded like you needed company.\"",
  "Footsteps on the stairs, too many of them. {Name} pushes the door wide, {more} more behind. \"We heard everything.\"",
];

/** Won: out they go, and the door's barred. */
export const WON_LINES: readonly string[] = [
  "You drive them down the stairs and out into the snow, and drop the bar across the door. Your heart won't slow down.",
  "They tumble down the stairs and out. You bar the door, wedge a chair under it, and lie awake a long while.",
];
/** Talked down: they slink off. */
export const TALKED_LINES: readonly string[] = [
  "They mumble an apology and slink off down the stairs. You bar the door behind them.",
];
/** Lost, Consent off (KP's defeat): her own bed. {n} is how many. */
export const FORCED_ROOM_ONE: readonly string[] = [
  "You're pinned to your own bed, too spent to push them off. Nobody's asking any more.",
  "They drag you back onto the bed by your ankle. \"Shouldn't have been so loud, innkeeper.\"",
];
export const FORCED_ROOM_CREW: readonly string[] = [
  "{n} of them close round your bed. Hands on your wrists, your ankles. Nobody's asking any more.",
  "Your little room has never been so full. {n} of them, and you flat on your back on the bed.",
];
