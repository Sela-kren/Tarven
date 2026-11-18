/**
 * A foe's mind in a brawl, the way Karryn's Prison runs its enemies (RemtairyEnemyAI.js `enemyBattleAIGeneric`),
 * GAME_PATH.MD 7i:
 *
 * - Each foe has their own pleasure (KP's enemy arousal). It climbs as they touch her, talk at her, look at what's
 *   bare, and as she works on them. Past half they're erect; at the top they come, and they're spent.
 * - Each turn they either want her or want to hurt her: a roll of 100 (more if they're horny) against their anger
 *   less their pleasure. Horny and not angry, they always want her.
 * - Wanting her and erect, they try to start a scene with her, but only one she's ready for (SCENE_NEEDS, KP's
 *   sex requirements). Otherwise they grope, talk or stare.
 *
 * Pure rules, kept apart from fight.ts so they can be tested.
 */
import type { DuelArea } from "./duel";
import type { Meter, Meters } from "./passives";

/** Past this much pleasure a foe is erect, and can start a scene with her. */
export const ERECT_AT = 50;
/** At the top, they come. */
export const FOE_PLEASURE_MAX = 100;
/** A foe's anger: an angry one wants to hurt her, a roaring drunk less sure what he wants. */
export const ANGER = { angry: 80, drunk: 40 } as const;
/** What their roll goes up by when they're horny (KP: +80). */
const HORNY_ROLL = 80;

/** What raises a foe's pleasure (KP's enemy pleasure gains), each time. */
export const FOE_PLEASURE = {
  /** Getting a piece of her clothes off her (7l). */
  strip: 10,
  /** Talking lewd at her, and staring at what's bare. */
  talk: 3,
  sight: 6,
  /** A touch of theirs she let land. */
  touch: 8,
  /** Each turn, watching her: this much for all of her bare (scaled by how much is). */
  watch: 4,
  /** A turn of theirs in a scene with her, and a turn of her going along with it. */
  pose: 15,
  goAlong: 20,
  /** Her hands, mouth or riding them, per point of the stamina it wears off them. */
  intimatePerDrain: 3,
} as const;

/**
 * What she has to be ready for before a foe can start each scene (KP's canGet...Inserted, on Tarven's 0 to 100
 * desire): her desire for it, her Cock desire, wet for him in her, and how much of her clothes are off (0 to 1).
 */
export interface SceneNeed {
  need: Partial<Meters>;
  wet?: boolean;
  exposure?: number;
}
export const SCENE_NEEDS: Readonly<Record<DuelArea, SceneNeed>> = {
  hands: { need: { cock: 40 } },
  mouth: { need: { mouth: 80, cock: 50 } },
  breasts: { need: { breasts: 80, cock: 50 }, exposure: 0.4 },
  pussy: { need: { pussy: 80, cock: 70 }, wet: true, exposure: 0.7 },
  butt: { need: { butt: 80, cock: 70 }, exposure: 0.7 },
};

/** Bolder first: what a foe would rather have of her. */
const BOLDEST: readonly DuelArea[] = ["pussy", "butt", "mouth", "breasts", "hands"];

/** Whether she's ready for a foe to start this scene with her. */
export function readyFor(area: DuelArea, her: { desire: Readonly<Meters>; wet: boolean; exposure: number }): boolean {
  const need = SCENE_NEEDS[area];
  for (const [meter, n] of Object.entries(need.need) as [Meter, number][]) if (her.desire[meter] < n) return false;
  if (need.wet && !her.wet) return false;
  return her.exposure >= (need.exposure ?? 0);
}

/**
 * The scene a foe starts with her: the part his type goes for if she's ready for it, else the boldest she's ready
 * for; null if she isn't ready for any.
 */
export function pickScene(prefers: DuelArea | undefined, her: { desire: Readonly<Meters>; wet: boolean; exposure: number }): DuelArea | null {
  if (prefers && readyFor(prefers, her)) return prefers;
  return BOLDEST.find((area) => readyFor(area, her)) ?? null;
}

/** Whether a foe wants her this turn, rather than to hurt her (KP's wantSex). `roll` is 0 to 1. */
export function wantsHer(foe: { horny: boolean; angry: boolean; anger: number; pleasure: number }, roll: number): boolean {
  if (foe.horny && !foe.angry) return true;
  const range = 100 + (foe.horny ? HORNY_ROLL : 0);
  return roll * range > Math.max(0, foe.anger - foe.pleasure);
}

/** Whether a foe is erect: horny from the start, or worked up past half. */
export function erect(foe: { horny: boolean; pleasure: number }): boolean {
  return foe.horny || foe.pleasure >= ERECT_AT;
}

/** The parts of her a foe talks lewd about, or stares at once they're bare. */
export type LewdPart = "mouth" | "breasts" | "butt" | "pussy" | "cock";
/** The desire each part's talk or stare raises. */
export const LEWD_METER: Readonly<Record<LewdPart, Meter>> = { mouth: "mouth", breasts: "breasts", butt: "butt", pussy: "pussy", cock: "cock" };
/** How much of her has to be off before a foe can stare at a part: her mouth is always on show. */
export const SIGHT_EXPOSURE: Readonly<Record<LewdPart, number>> = { mouth: 0, breasts: 0.4, butt: 0.6, pussy: 0.7, cock: 0 };

/** Of a foe's rolls on her mouth, from here (to 0.7) he stares at her face instead of talking. */
const FACE_STARE_FROM = 0.62;

/** What a foe does instead of fighting, when there's no scene to be had: a grope, lewd talk, or a stare. */
export type LewdTurn = { kind: "grope" } | { kind: "talk"; part: LewdPart } | { kind: "sight"; part: LewdPart };

/**
 * Which lewd thing a foe does (KP genericPettingTalkSight): a grope if he still can (`canGrope`), else talk or a
 * stare, at the part his type goes for more often than not. `roll` and `pick` are 0 to 1.
 */
export function lewdTurn(prefers: DuelArea | undefined, exposure: number, canGrope: boolean, roll: number, pick: number): LewdTurn {
  if (canGrope && roll < 0.4) return { kind: "grope" };
  const preferred: LewdPart = prefers === "hands" || !prefers ? "cock" : prefers === "mouth" ? "mouth" : prefers;
  const parts: LewdPart[] = ["mouth", "breasts", "butt", "pussy", "cock"];
  const part = pick < 0.5 ? preferred : parts[Math.floor(((pick - 0.5) / 0.5) * parts.length) % parts.length];
  // Staring takes something bare to stare at; talking doesn't. Her face is always on show, but they'd mostly rather
  // talk about her mouth than gaze at it (KP's Sight on her face).
  if (part === "mouth") return roll >= FACE_STARE_FROM && roll < 0.7 ? { kind: "sight", part } : { kind: "talk", part };
  if (part !== "cock" && exposure >= SIGHT_EXPOSURE[part] && roll < 0.7) return { kind: "sight", part };
  return { kind: "talk", part };
}
