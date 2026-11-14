import type { Mood } from "./mood";
import { statsOf, type GuestRole, type RoleStats } from "./guestroles";
import type { GuestKind } from "./tavern";
import { CONFIDENT, FIRSTS, FIRSTS_LATE, FIRSTS_UNASKED, TOUCHES, type TouchDef, type TouchRegion } from "./touchtalk";

/**
 * Guests who reach for the innkeeper. Each touch has a boldness from 1 to 10 (`TouchDef.level`); each guest has a
 * nerve, how bold they'll be tonight, and only reaches for touches up to it. The innkeeper has a desire for each
 * part of her (see `passives.ts`), and can only let a touch happen once the desire it needs is high enough; here
 * that desire comes in on a scale of 0 to 10. Slapping the hand away and slipping out of reach are always there,
 * and only they are, when either of them has had far too much.
 *
 * Once her desire runs well past what a touch needs, "Give in" is offered as well: the player can choose to stop
 * holding back. It is only ever an extra button. Nothing here takes an answer away from her, and Pull away always
 * works (GAME_CONCEPT.md 7.1, GAME_PATH.MD). Wanting it shows instead in what saying no costs her (willpower.ts).
 */

export type { TouchDef, TouchRegion } from "./touchtalk";

export type TouchAnswer = "allow" | "lean" | "givein" | "slap" | "pull";

/** Whether the touch lands: she lets it, leans in, or gives in. A slap or a pull always stops it. */
export function touchLands(answer: TouchAnswer): boolean {
  return answer === "allow" || answer === "lean" || answer === "givein";
}

export const MAX_LEVEL = 10;
export const MAX_DESIRE = 10;

/** Nerve for each point of a guest's lust, out of 10. */
const NERVE_PER_LUST = 0.6;
const NERVE_FROM_MOOD: Partial<Record<Mood, number>> = { lust: 1.5, drunk: 1.5, angry: 0.5, scheming: 0.5, idolize: -1, gloomy: -1, scared: -2 };
/** A room that's stopped respecting you gets bolder, and one that respects you minds itself. */
const NERVE_DISRESPECTED = 1.5;
const NERVE_RESPECTED = -1.5;
/** Each touch you've let a guest have tonight makes them bolder; a slap knocks it right out of them. */
const NERVE_PER_ALLOWED = 1;
const NERVE_AFTER_SLAP = -3;

/** How likely a guest is to reach for you as you serve them: a little from anyone, more from the bold. */
const REACH_BASE = 0.08;
const REACH_PER_NERVE = 0.05;
const REACH_MAX = 0.55;

/** How strongly a guest goes for the boldest thing their nerve allows rather than something tamer. */
const BOLD_PULL = 0.6;
/** A touch already tried tonight is less likely to come round again. */
const SEEN_WEIGHT = 0.2;

/** How far past what a touch needs her desire has to be before she can lean into it. */
export const LEAN_MARGIN = 2;

/** How far past what a touch needs her desire has to be before "Give in" is offered too. */
export const GIVE_IN_MARGIN = 3;

/** How many times she has to have let something like it before she stops being shocked. */
const CONFIDENT_AFTER = 3;

export interface NerveFacts {
  kind: GuestKind;
  /** Their type in the group; how bold they start out comes from it. */
  role?: GuestRole;
  /** Their own rolled numbers, when known; these win over the type's. */
  stats?: RoleStats;
  /** The guest's lust, 0 to 10. */
  lust: number;
  mood: Mood;
  /** The innkeeper's respect, -10 to 10. */
  respect: number;
  lowRespect: number;
  highRespect: number;
  /** Touches you let this guest have tonight. */
  allowed: number;
  /** Whether you slapped this guest tonight. */
  slapped: boolean;
  /** Anything else on their nerve: her passives, and how lewd she's known to be. */
  bonus?: number;
  /** A slap stops them reaching for good tonight. */
  slapStops?: boolean;
}

/** How bold a guest will be, from 0 to 10. */
export function nerve(f: NerveFacts): number {
  let n = (f.stats ?? statsOf(f.kind, f.role)).nerve + f.lust * NERVE_PER_LUST + (NERVE_FROM_MOOD[f.mood] ?? 0) + f.allowed * NERVE_PER_ALLOWED;
  if (f.respect <= f.lowRespect) n += NERVE_DISRESPECTED;
  if (f.respect >= f.highRespect) n += NERVE_RESPECTED;
  if (f.slapped) n += NERVE_AFTER_SLAP;
  if (f.slapped && f.slapStops) return 0;
  n += f.bonus ?? 0;
  return Math.min(MAX_LEVEL, Math.max(0, n));
}

/** How likely a guest with this much nerve is to reach for you as you serve them. */
export function reachChance(guestNerve: number): number {
  if (guestNerve < 1) return 0;
  return Math.min(REACH_MAX, REACH_BASE + guestNerve * REACH_PER_NERVE);
}

export interface PickOptions {
  /** Whether there's any clothing left that guests would take. */
  canStrip: boolean;
  /** Touches already tried tonight. */
  seen: ReadonlySet<string>;
  /** Whether adult play is in the pool. The tavern rolls for it on its own (adultplay.ts) and leaves this off. */
  invites?: boolean;
  /** How much more often guests go for each kind of touch, as a fraction. */
  pull?: Partial<Record<TouchRegion, number>>;
  /** A foe reaching mid-brawl: the scuffle's own touches open up, and come up more often than the room's. */
  brawl?: boolean;
  /** A guest with hold of her at the table: the held strip tries open up, and garments are all they go for. */
  held?: boolean;
  /**
   * How open she is, by part, for the parts guests only go as far as she's open to (`LEWD_REGIONS`): see `openness`.
   * A part left out isn't held to it (a brawl leaves it all out: the fight has its own rules).
   */
  open?: Partial<Record<TouchRegion, number>>;
}

/**
 * Karryn-style, any guest may go for her breasts or her behind, but only as far as she's open to it: her desire for
 * that part (0 to 10) and her Slut Level, each level counting as this much desire. A touch there needs their nerve as
 * ever, and her openness at least its boldness less `LEWD_SLACK`; and the more open she is, the more often they go
 * for it (`LEWD_PULL` per point). Her answer is still hers: openness only decides what they try.
 */
export const LEWD_REGIONS: readonly TouchRegion[] = ["chest", "rear"];
export const LEWD_SLACK = 3;
export const SLUT_OPENS = 1;
export const LEWD_PULL = 0.1;

export function openness(desire: number, slutLevel: number): number {
  return desire + slutLevel * SLUT_OPENS;
}

/** Whether she's open enough to a touch for a guest to try it (always, for a part not held to her openness). */
function openTo(touch: TouchDef, open: PickOptions["open"]): boolean {
  const how = open?.[touch.region];
  return how === undefined || touch.level <= how + LEWD_SLACK;
}

/** How much likelier a brawl's own touches are than the room's, mid-fight. */
const BRAWL_TOUCH_WEIGHT = 3;

/**
 * The touches a guest of this kind with this much nerve might go for. Adult play only when asked for (it has its
 * own roll, `adultTouch`); the scuffle's own touches only in a brawl.
 */
export function touchesFor(kind: GuestKind, guestNerve: number, options: PickOptions): TouchDef[] {
  return TOUCHES.filter(
    (t) =>
      (!t.romance || options.invites === true) &&
      (!t.brawl || options.brawl === true) &&
      (!t.grab || options.held === true) &&
      t.level <= guestNerve &&
      openTo(t, options.open) &&
      (t.kinds.length === 0 || t.kinds.includes(kind)) &&
      (!t.strip || options.canStrip),
  );
}

/**
 * Which touch a guest reaches for: one of the boldest they've the nerve for, more often than not, and less
 * often one they've tried already tonight, more often for a part she's open to. Null if their nerve won't stretch
 * to anything.
 */
export function pickTouch(kind: GuestKind, guestNerve: number, random: () => number, options: PickOptions): TouchDef | null {
  const open = touchesFor(kind, guestNerve, options);
  // With hold of her, they go for her clothes, while there's anything left to take.
  const garments = options.held ? open.filter((t) => t.strip) : [];
  const choices = garments.length > 0 ? garments : open;
  if (choices.length === 0) return null;
  const weights = choices.map(
    (t) =>
      Math.exp(-BOLD_PULL * (guestNerve - t.level)) *
      (options.seen.has(t.id) ? SEEN_WEIGHT : 1) *
      (1 + (options.pull?.[t.region] ?? 0) + LEWD_PULL * (options.open?.[t.region] ?? 0)) *
      (t.brawl ? BRAWL_TOUCH_WEIGHT : 1),
  );
  let roll = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) {
    roll -= weights[i];
    if (roll < 0) return choices[i];
  }
  return choices[choices.length - 1];
}

/**
 * A guest going for adult play (adultplay.ts decides when): one of the ways it's asked that fits their kind. It
 * isn't held to their nerve, since the chance of it already weighs how worked up they are.
 */
export function adultTouch(kind: GuestKind, random: () => number): TouchDef | null {
  const fits = TOUCHES.filter((t) => t.romance && (t.kinds.length === 0 || t.kinds.includes(kind)));
  if (fits.length === 0) return null;
  return fits[Math.floor(random() * fits.length) % fits.length];
}

/**
 * How far in a touch goes, Karryn-style: over her clothes, inside them, or on bare skin. Only for the parts of her
 * clothes cover (`LAYERED_REGIONS`). The bolder layers open up as her desire for that part runs past what the touch
 * needs, or as her Slut Level climbs; bare skin too once two pieces are off her anyway. Her yes is decided by her
 * desire as before; the layer is how far in they go, and pays and warms her more the further it is.
 */
export type TouchLayer = "over" | "inside" | "bare";
export const LAYERED_REGIONS: ReadonlySet<TouchRegion> = new Set(["chest", "rear", "thigh", "intimate", "waist"]);
/** Desire past what the touch needs (0-10 scale) to open each layer, or the Slut Level that does instead. */
export const INSIDE_DESIRE = 2;
export const INSIDE_SLUT = 2;
export const BARE_DESIRE = 4;
export const BARE_SLUT = 4;
/** Pieces off her that open bare skin whatever her desire. */
export const BARE_EXPOSED = 2;
/** What each layer adds once it lands: gold, how much more desire it stirs, and boldness in the Consent-off check. */
export const LAYER_BONUS: Record<TouchLayer, { gold: number; desire: number; bold: number }> = {
  over: { gold: 0, desire: 1, bold: 0 },
  inside: { gold: 1, desire: 1.25, bold: 1 },
  bare: { gold: 2, desire: 1.5, bold: 2 },
};
export const LAYER_NAMES: Record<TouchLayer, string> = { over: "over your clothes", inside: "inside your clothes", bare: "on bare skin" };

export interface LayerFacts {
  region: TouchRegion;
  level: number;
  /** Her desire for that part, 0 to 10. */
  desire: number;
  slutLevel: number;
  /** Pieces of clothing off her. */
  exposed: number;
}

/** The layers a touch could go to right now, tamest first. Only "over" for parts clothes don't cover. */
export function layersOpen(f: LayerFacts): TouchLayer[] {
  if (!LAYERED_REGIONS.has(f.region)) return ["over"];
  const past = f.desire - desireNeeded(f.level);
  const layers: TouchLayer[] = ["over"];
  const inside = past >= INSIDE_DESIRE || f.slutLevel >= INSIDE_SLUT;
  const bare = f.exposed >= BARE_EXPOSED || past >= BARE_DESIRE || f.slutLevel >= BARE_SLUT;
  if (inside || bare) layers.push("inside");
  if (bare) layers.push("bare");
  return layers;
}

/** What's said after the reach when they go further than over her clothes, by part of her. */
export const LAYER_LINES: Partial<Record<TouchRegion, Record<"inside" | "bare", string>>> = {
  chest: {
    inside: "Then their hand slips inside your top, under the cloth.",
    bare: "There's nothing in the way: it's your bare breast in their hand.",
  },
  rear: {
    inside: "Their hand slides up under your clothes.",
    bare: "Their palm finds bare skin, and stays there.",
  },
  thigh: {
    inside: "Their fingers slip up under the hem.",
    bare: "Bare thigh, all the way up, and their hand doesn't stop.",
  },
  intimate: {
    inside: "Under your clothes, under your smallclothes.",
    bare: "Nothing at all between their fingers and you.",
  },
  waist: {
    inside: "Their fingers slip under the hem, onto your belly.",
    bare: "Bare skin at your waist, warm under their hand.",
  },
};

/** How far in they go: the boldest layer open, half the time; otherwise one of the others. `roll` is 0 to 1. */
export function pickLayer(open: readonly TouchLayer[], roll: number): TouchLayer {
  if (open.length === 1 || roll < 0.5) return open[open.length - 1];
  const rest = open.slice(0, -1);
  return rest[Math.floor(((roll - 0.5) / 0.5) * rest.length) % rest.length];
}

/** How much desire it takes to let a touch of this boldness happen. */
export function desireNeeded(level: number): number {
  return level - 1;
}

/** Which of her three thoughts fits: 0 not ready, 1 torn, 2 wanting it. */
export function thoughtTier(touch: TouchDef, desire: number, leanMargin = LEAN_MARGIN): 0 | 1 | 2 {
  const need = desireNeeded(touch.level);
  if (desire < need) return 0;
  return desire < need + leanMargin ? 1 : 2;
}

export interface AnswerFacts {
  /** Her desire for this touch in the moment, 0 to 10. */
  desire: number;
  /** How far past what it needs she has to be to lean in; less with passives. */
  leanMargin?: number;
  /** She's had far too much to say yes to anything. */
  sloppy: boolean;
  /** So has the guest. */
  guestSloppy: boolean;
}

/**
 * What she can answer, in the order shown. Slap and Pull away are always there, at every desire. The yeses come
 * only as her desire allows, and not at all when either of them has had far too much. "Give in" joins them once
 * her desire runs well past the touch; it never replaces anything.
 */
export function touchAnswers(touch: TouchDef, f: AnswerFacts): TouchAnswer[] {
  const answers: TouchAnswer[] = [];
  if (!f.sloppy && !f.guestSloppy) {
    const tier = thoughtTier(touch, f.desire, f.leanMargin);
    if (tier >= 1) answers.push("allow");
    if (tier >= 2) answers.push("lean");
    if (f.desire >= desireNeeded(touch.level) + GIVE_IN_MARGIN) answers.push("givein");
  }
  answers.push("slap", "pull");
  return answers;
}

/**
 * What the intensity (Force) bar adds once a touch she said yes to has landed: a bolder touch tips a little more
 * and warms her a little more. Never shown, and never anything, before she has answered.
 */
export function intensityBonus(level: number): { gold: number; meter: number } {
  if (level >= 9) return { gold: 2, meter: 0.5 };
  if (level >= 6) return { gold: 1, meter: 0.25 };
  return { gold: 0, meter: 0 };
}

/** What an answer does: to her reputation, her purse, her own feelings, and the guest. */
export interface TouchOutcome {
  gold: number;
  respect: number;
  fame: number;
  flirt: number;
  /** The guest's mood after, or null to leave it. */
  mood: Mood | null;
}

export function touchOutcome(touch: TouchDef, answer: TouchAnswer): TouchOutcome {
  const level = touch.level;
  switch (answer) {
    case "allow":
      return {
        gold: level,
        respect: -Math.floor(level / 3),
        fame: level >= 4 ? 1 : 0,
        flirt: level >= 5 ? 1 : 0,
        mood: "lust",
      };
    case "lean":
      return {
        gold: level * 2 + 1,
        respect: -Math.floor(level / 3) - 1,
        fame: 2,
        flirt: 1,
        mood: "lust",
      };
    case "givein":
      // Between letting it and leaning in: she stopped holding back, and the room saw her choose to.
      return {
        gold: level + 1,
        respect: -Math.floor(level / 3),
        fame: level >= 4 ? 1 : 0,
        flirt: 1,
        mood: "lust",
      };
    case "slap":
      return { gold: 0, respect: level >= 6 ? 2 : level >= 3 ? 1 : 0, fame: 0, flirt: 0, mood: "angry" };
    case "pull":
      return { gold: 0, respect: level >= 5 ? 1 : 0, fame: 0, flirt: 0, mood: null };
  }
}

/** The button for an answer. */
export function answerLabel(touch: TouchDef, answer: TouchAnswer): string {
  switch (answer) {
    case "allow":
      return touch.strip ? "Let them take it" : "Let it happen";
    case "lean":
      return touch.strip ? "Help them with it" : "Lean into it";
    case "givein":
      return touch.strip ? "Give in and let it go" : "Give in";
    case "slap":
      return "Slap them";
    case "pull":
      return "Pull away";
  }
}

/**
 * What she thinks, or says, after letting it: shocked the first time, teasing once she's used to it. A first that
 * landed unasked (Consent off) or came late (she's Willing or Known already) has its own thought (STORY.md 4b).
 */
export function afterLine(
  region: TouchRegion,
  timesBefore: number,
  first: { unasked?: boolean; late?: boolean } = {},
): { thought: boolean; text: string } | null {
  if (timesBefore === 0) {
    const text = first.unasked ? FIRSTS_UNASKED[region] : first.late ? FIRSTS_LATE[region] : FIRSTS[region];
    return { thought: true, text };
  }
  if (timesBefore >= CONFIDENT_AFTER) return { thought: false, text: CONFIDENT[region] };
  return null;
}

/** Fills in the garment a touch is after. */
export function fillPiece(text: string, piece: string | null): string {
  return text.replaceAll("{piece}", piece ?? "clothes");
}

/** What carries between nights: how many times she's let each kind of touch happen. */
export interface TouchMemory {
  lets: Partial<Record<TouchRegion, number>>;
}

export function newTouchMemory(): TouchMemory {
  return { lets: {} };
}

/** A touch memory from a save, with anything broken put back to its start. */
export function readTouchMemory(raw: unknown): TouchMemory {
  const memory = newTouchMemory();
  if (!raw || typeof raw !== "object") return memory;
  // Older saves also kept a lasting desire; that's now worked out from passives, so it's let go.
  const fields = raw as { lets?: unknown };
  if (fields.lets && typeof fields.lets === "object") {
    for (const [region, count] of Object.entries(fields.lets as Record<string, unknown>)) {
      if (region in FIRSTS && typeof count === "number" && Number.isFinite(count) && count > 0) {
        memory.lets[region as TouchRegion] = Math.floor(count);
      }
    }
  }
  return memory;
}