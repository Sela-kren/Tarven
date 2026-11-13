/**
 * The taproom answer to an invitation: instead of going upstairs with the guest who asked, she stays down in the
 * taproom with them, and with whoever else in the room wants in. It's played as the After Hours game (duel.ts),
 * with several partners, so her rules, her moves and her Stop all work as they do there.
 *
 * Lines that hold (GAME_PATH.MD, consent rule):
 * - It's her choice, at every step: the stairs or the taproom, who joins, what's in play, and Stop at any time.
 * - Nobody is pulled in. A guest joins only if they want to (their lust shows), and she still picks each one.
 * - Nobody too drunk to know what they're doing joins, and if she's had too much herself, it isn't on offer.
 * - The Baron is never a partner.
 *
 * This file holds the rules (who's willing, how the rest of the room takes it, what it costs and earns); the
 * words are in `invitetalk.ts`, and the tavern (tavern.ts) does the bookkeeping.
 */
import { MAX_PARTNERS, type DuelOutcome } from "./duel";
import type { Mood } from "./mood";
import { STRONG_LUST } from "./mood";
import type { GuestKind, GuestStatus } from "./tavern";

/** A guest needs at least this much lust (out of 10) to want in: the point where it shows on them. */
export const JOIN_LUST = STRONG_LUST;
/**
 * No cap on who joins: everyone in the room who wants in can. Six are on her at once (the After Hours game's
 * MAX_PARTNERS); the rest wait in line, and it piles up until the last of them is done.
 */
export const AT_ONCE = MAX_PARTNERS;
/**
 * The room left open (her choice, before it starts): watchers who get worked up enough as it goes join the line.
 * Watching stirs them by this much every few of her moves, and by more each time one of them gives in.
 */
export const STIR_EVERY = 3;
export const STIR_PER_MOVES = 1;
export const STIR_PER_GIVE_IN = 2;
/** Moods nobody joins in from: too drunk to know what they're doing, or in no state to want it. */
const NEVER_JOIN: ReadonlySet<Mood> = new Set(["drunk", "angry", "scared", "gloomy"]);
/** Watchers this cold to it, or in these moods, get up and leave once it starts. */
const LEAVE_BELOW_LUST = 3;
const LEAVE_MOODS: ReadonlySet<Mood> = new Set(["scared", "gloomy", "angry"]);
/** Nobles came for a respectable house: they leave unless they're well warmed up themselves. */
const NOBLE_STAYS_AT = STRONG_LUST;

/** What the taproom rules need to know about someone in the room. */
export interface RoomGuest {
  id: number;
  kind: GuestKind;
  /** What they're called: their type (Farmer, Archer, Noble...). */
  label: string;
  status: GuestStatus;
  lust: number;
  mood: Mood;
  female: boolean;
}

/**
 * Never a partner, whatever the room's like: the Baron (and anyone sent in his name). He isn't a guest kind today;
 * this keeps it so if he ever walks in.
 */
export function isBaron(g: Pick<RoomGuest, "label">): boolean {
  return /\bbaron\b/i.test(g.label);
}

/** Sat in the room, and so able to watch or join: not still walking in, not on their way out. */
function inTheRoom(g: RoomGuest): boolean {
  return g.status === "waiting" || g.status === "eating";
}

/**
 * Whether a guest wants to join in: in the room, their lust showing, sober enough to know what they're doing,
 * in a mood to, and not the Baron.
 */
export function wantsToJoin(g: RoomGuest): boolean {
  return inTheRoom(g) && g.lust >= JOIN_LUST && !NEVER_JOIN.has(g.mood) && !isBaron(g);
}

/**
 * Everyone who'd join, keenest first: never the guest who asked (they're already in). No cap unless one's given:
 * however many are willing, past six they wait in line. She still picks among them.
 */
export function willingJoiners(room: readonly RoomGuest[], hostId: number, cap = Infinity): RoomGuest[] {
  return room
    .filter((g) => g.id !== hostId && wantsToJoin(g))
    .sort((a, b) => b.lust - a.lust || a.id - b.id)
    .slice(0, Math.max(0, cap));
}

/**
 * How someone who isn't joining takes it: most stay and cheer, but the cold, the scared, the sullen and the
 * respectable get up and go.
 */
export function roomReaction(g: RoomGuest): "cheer" | "leave" {
  if (LEAVE_MOODS.has(g.mood) || g.lust < LEAVE_BELOW_LUST) return "leave";
  if (g.kind === "noble" && g.lust < NOBLE_STAYS_AT) return "leave";
  return "cheer";
}

/** What a taproom scene does to her name and the house, once it's over. */
export interface TaproomResult {
  fame: number;
  respect: number;
  flirt: number;
  heat: number;
  trust: number;
  /** Lust it stirs in everyone who stayed to watch. */
  watcherLust: number;
}

/** Played to the end: word travels, the room stops seeing an innkeeper, and the keep hears of it. */
const FAME_BASE = 2;
const RESPECT_BASE = -2;
const WATCHER_LUST = 3;

/**
 * The scene's consequences. Played to the end (won or lost), it's a night the pass will talk about: fame for
 * every partner, respect down (more the more there were), a heat for the Baron's ears, and village trust down
 * if any of the village's own walked out on it. Stopped early, the room only saw the start of it.
 */
export function taproomResult(outcome: DuelOutcome, partners: number, localsLeft: number): TaproomResult {
  if (outcome === "stopped") return { fame: 1, respect: -1, flirt: 1, heat: 0, trust: 0, watcherLust: 1 };
  return {
    fame: FAME_BASE + partners,
    respect: RESPECT_BASE - Math.floor(partners / 2),
    flirt: 2,
    heat: 1,
    trust: localsLeft > 0 ? -1 : 0,
    watcherLust: WATCHER_LUST,
  };
}

/** Gold each partner leaves her for a game played to the end, before her passives: their tip, and this. */
export const TAPROOM_TIP = 4;

/** The village's own: when they walk out on it, the village hears. */
export function isLocal(kind: GuestKind): boolean {
  return kind === "farmer" || kind === "fugitive";
}
