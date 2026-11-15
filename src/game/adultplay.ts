/**
 * Adult play, Karryn's Prison style: KP's Waitress Sex (GAME_PATH.MD 7f). Mid-shift, a guest with his hands on her
 * gets her down on a table right there in the taproom, and the rest of the room joins in, the way KP's bar patrons do.
 *
 * **When it can come up** (KP's canStartWaitressSex): once she's drunk enough, or she's come enough times this shift
 * (overwhelmed at a table, or mid-brawl). Her passives ease it, as KP's waitress-sex passives do: *Open House* and
 * *The Whole Room* each bring it a drink sooner (tipsy, not drunk) and a time sooner. Too drunk to say yes, and it
 * never comes up (the consent rule; KP's dead-drunk case is left out on purpose).
 *
 * **Then:** an aroused guest (lust 6+, sober) who reaches for her may go for it instead, by a chance that grows the
 * more she and they are worked up. A respected innkeeper is asked half as often.
 *
 * **Her yes** still needs her ready for it: Cock desire for the boldest touch there is, less what her lewdness and
 * passives take off, or else horny and wet at once. Consent on, she's asked, Pull away always there; Consent off, her
 * state decides (ready and them aroused, and it happens).
 */

export interface AdultPlayFacts {
  /** Her Cock desire, 0 to 100: wanting to be intimate with someone. */
  cock: number;
  /** Any desire at 80+. */
  horny: boolean;
  wet: boolean;
  /** The guest's lust, 0 to 10. */
  lust: number;
  /** The guest's mood is lust. */
  lusting: boolean;
  /** How lewd she's known to be. */
  lewdness: number;
  /** Pieces of clothing off her. */
  exposed: number;
  /** Nights gone by, from 0. */
  night: number;
  /** Her passives' pull toward it, as a fraction. */
  pull: number;
  /** The room respects her: they think twice. */
  respected: boolean;
  /** She's drunk enough, or has come enough this shift, for it to come up at all (`tableOpen`). */
  open: boolean;
}

/**
 * How drunk she has to be (0 to 1, a drink is 1/8) for it to come up: Drunk (4 drinks), or Tipsy (2) once her
 * passives ease it. KP: drunk; tipsy with its waitress-sex passives.
 */
export const TABLE_DRUNK = { base: 0.5, eased: 0.25 } as const;
/**
 * How many times she has to have come this shift instead: 3, then 2 and 1 as her passives ease it (KP: 10, 6, 4
 * orgasms in a bar shift; she comes far less often in Tarven's).
 */
export const TABLE_COMES = [3, 2, 1] as const;

export interface TableFacts {
  /** How drunk she is, 0 to 1. */
  drunk: number;
  /** At or past this, she's too drunk to say yes to anything (the consent rule). */
  tooDrunk: number;
  /** Times she's come this shift. */
  comes: number;
  /** How much her passives ease it: 0, 1 or 2 (Open House, The Whole Room, The Back Room...). */
  ease: number;
}

/** Whether it can come up at all tonight (KP's canStartWaitressSex, minus dead drunk). */
export function tableOpen(f: TableFacts): boolean {
  if (f.drunk >= f.tooDrunk) return false;
  const ease = Math.max(0, Math.min(TABLE_COMES.length - 1, Math.floor(f.ease)));
  return f.drunk >= (ease > 0 ? TABLE_DRUNK.eased : TABLE_DRUNK.base) || f.comes >= TABLE_COMES[ease];
}

/** The least chance there is, once it's open, on a first night with nobody worked up. */
export const ADULT_BASE = 0.25;
/** Never more likely than this, however worked up everyone is. */
export const ADULT_MAX = 0.7;
/** A guest this lustful (or more) is aroused: lust past it adds to the chance, and Consent off needs it. */
export const ADULT_LUST = 6;

/**
 * How likely a guest who reaches for her goes for it instead of a touch: nothing until it's open and they're
 * aroused, then a fair chance at the start and bigger with every part of the moment that's worked up.
 */
export function adultPlayChance(f: AdultPlayFacts): number {
  if (!f.open || f.lust < ADULT_LUST) return 0;
  let chance =
    ADULT_BASE +
    (f.cock / 100) * 0.12 +
    (f.horny ? 0.06 : 0) +
    (f.wet ? 0.04 : 0) +
    (Math.max(0, f.lust - (ADULT_LUST - 1)) / (11 - ADULT_LUST)) * 0.08 +
    (f.lusting ? 0.03 : 0) +
    Math.min(0.12, f.lewdness * 0.003) +
    Math.min(0.06, f.exposed * 0.02) +
    Math.min(0.04, f.night * 0.004);
  chance *= 1 + f.pull;
  if (f.respected) chance *= 0.5;
  return Math.min(ADULT_MAX, Math.max(0, chance));
}

/** What her lewdness takes off the Cock desire adult play needs: 1 for every 5, at most 20. */
export function lewdnessEase(lewdness: number): number {
  return Math.min(20, Math.max(0, lewdness) / 5);
}

/** The guest is aroused enough for adult play to happen without asking (Consent off): lust that shows, sober. */
export function aroused(lust: number, drunk: boolean): boolean {
  return lust >= ADULT_LUST && !drunk;
}
