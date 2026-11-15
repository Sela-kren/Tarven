/**
 * Her face in a brawl, the way Karryn's Prison picks Karryn's (RemtairyKarrynEmote.js, emoteAttackPose and the
 * rest): each moment of the fight (battlepose.ts's poses) looks up a pool of faces by her reaction tier (how lewd
 * she's grown: her Slut Level), how much stamina she's got left (in KP's bands), whether she's worked up, and
 * whether she's winning. A face is picked from the pool by weight, then its brows, its eyes and its mouth each from
 * their own little pool, so the same moment doesn't wear quite the same face twice. It's picked once as the moment
 * starts, and held.
 *
 * Her parts come from her own expressions (face.ts): a mouth gritted on her teeth from "strained", brows knitted
 * down from "angry". A pool names expressions, and the part takes just that expression's brow, eye or mouth values.
 */
import type { BattlePoseName } from "./battlepose";
import { BEARING, EXPRESSIONS, REST_FACE, type Expression, type FaceShape } from "./face";

/** The three parts of her face a fight face is put together from, as KP's layers are. */
export type FacePart = "brows" | "eyes" | "mouth";

export const PART_KEYS: Readonly<Record<FacePart, readonly (keyof FaceShape)[]>> = {
  brows: ["brow", "browInner", "browArch", "browOuter", "browTip", "browNear", "crease"],
  eyes: ["lidUpper", "lidLower", "wide", "lookX", "lookY"],
  mouth: ["smile", "smirk", "open", "round", "bare", "lift", "cup", "purse", "press", "tongue"],
};

/** One of KP's face ids: a pool for each part. */
export type FightPreset = Readonly<Record<FacePart, readonly Expression[]>>;

/** How she takes a fight, by how lewd she's grown: proper, at ease with it, or lewd (KP's reaction score levels). */
export type FightTier = "proper" | "easy" | "lewd";
/** How much she's got left: KP's stamina bands, 100-61%, 60-21%, 20-0%. */
export type FightBand = "fresh" | "worn" | "spent";

export const BAND_FROM = { fresh: 0.61, worn: 0.21 };
/** Worked up past this (her arousal as it shows, 0 to 1), she fights with it on her face. */
export const AROUSED_FROM = 0.5;
/** She's winning when she has this much more of her stamina left than her foe has of theirs. */
export const WINNING_BY = 0.2;

export interface FightFaceCause {
  pose: BattlePoseName;
  /** Her stamina left, 0 to 1, and her foe's. */
  stamina: number;
  foeStamina: number;
  /** Her Slut Level. */
  slut: number;
  /** Her arousal as it shows, 0 to 1. */
  arousal: number;
}

export function fightTier(slut: number): FightTier {
  return slut < BEARING.easy ? "proper" : slut < BEARING.confident ? "easy" : "lewd";
}

export function fightBand(stamina: number): FightBand {
  return stamina >= BAND_FROM.fresh ? "fresh" : stamina >= BAND_FROM.worn ? "worn" : "spent";
}

const p = (brows: readonly Expression[], eyes: readonly Expression[], mouth: readonly Expression[]): FightPreset => ({ brows, eyes, mouth });

/** A pool: faces, each with its weight (KP pushes a face id into its array more than once to make it likelier). */
export type FightPool = readonly { preset: FightPreset; weight: number }[];

const one = (preset: FightPreset): FightPool => [{ preset, weight: 1 }];

/** By her tier: proper, easy, lewd. */
const byTier = <T>(tier: FightTier, proper: T, easy: T, lewd: T): T => (tier === "proper" ? proper : tier === "easy" ? easy : lewd);

/** Her swing, a shove, a grab: effort, teeth gritted, and once she's lewd and on top, a wild grin. */
function effort(tier: FightTier, band: FightBand, aroused: boolean, winning: boolean): FightPool {
  const pool: { preset: FightPreset; weight: number }[] = [];
  if (band === "fresh") pool.push({ preset: p(["angry"], ["angry"], ["strained", "angry"]), weight: 3 });
  else if (band === "worn") pool.push({ preset: p(["angry", "strained"], ["angry", "strained"], ["strained"]), weight: 3 });
  else pool.push({ preset: p(["strained"], ["strained", "tired"], ["strained", "panting"]), weight: 3 });
  if (winning && tier !== "proper") pool.push({ preset: p(["angry", "confident"], ["angry"], ["confident", "delighted"]), weight: tier === "lewd" ? 3 : 1 });
  if (aroused) pool.push({ preset: p(["strained", "aroused"], ["strained", "aroused"], ["strained", "panting"]), weight: 2 });
  return pool;
}

/**
 * The pool of faces for a moment of the fight (KP's faceArray), before one's picked. Every pool has at least one
 * face in it.
 */
export function fightFacePool(cause: FightFaceCause): FightPool {
  const tier = fightTier(cause.slut);
  const band = fightBand(cause.stamina);
  const aroused = cause.arousal >= AROUSED_FROM;
  const winning = cause.stamina - cause.foeStamina >= WINNING_BY;
  switch (cause.pose) {
    case "strike":
    case "shove":
    case "grapple":
      return effort(tier, band, aroused, winning);
    case "guard": {
      // A blow landing: squeezed shut and gritted, or knocked breathless; lewd and worked up, KP's masochist face.
      const pool = [{ preset: band === "spent" ? p(["overwhelmed", "tired"], ["strained"], ["panting", "strained"]) : p(["strained", "overwhelmed"], ["strained", "overwhelmed"], ["strained", "surprised"]), weight: 3 }];
      if (aroused && tier === "lewd") pool.push({ preset: p(["pleasure", "overwhelmed"], ["pleasure"], ["surprised", "pleasure"]), weight: 2 });
      return pool;
    }
    case "dodge":
      // Ducked it: a smirk while she's fresh, a near thing once she's worn.
      if (band === "fresh") return one(p(["confident", "stern"], ["confident", "angry"], tier === "proper" ? ["stern", "annoyed"] : ["confident", "stern"]));
      if (band === "worn") return one(p(["surprised", "angry"], ["surprised", "angry"], ["surprised", "annoyed"]));
      return one(p(["surprised", "tired"], ["surprised"], ["surprised", "panting"]));
    case "held": {
      // Their hands on her, as KP's harassed faces go by tier: disgust, then embarrassment, then wanting it. Worked
      // up, she's a tier further on.
      const steps: FightTier[] = ["proper", "easy", "lewd"];
      const shown = aroused ? steps[Math.min(2, steps.indexOf(tier) + 1)] : tier;
      const pool = [{
        preset: byTier(
          shown,
          p(["angry", "annoyed"], ["annoyed", "angry"], ["annoyed", "strained"]),
          p(["embarrassed", "shy"], ["embarrassed", "shy"], ["embarrassed", "bashful"]),
          p(["aroused", "sultry"], ["sultry", "aroused"], ["aroused", "sultry"]),
        ),
        weight: 3,
      }];
      if (band === "spent") pool.push({ preset: p(["strained"], ["strained", "tired"], ["strained", "panting"]), weight: 1 });
      return pool;
    }
    case "stare":
      // Staring them down, or talking them round.
      return one(byTier(
        tier,
        p(["stern", "angry"], ["angry", "stern"], ["stern", "annoyed"]),
        p(["stern", "confident"], ["confident", "stern"], ["confident", "stern"]),
        p(["sultry", "confident"], ["sultry"], ["confident", "sultry"]),
      ));
    case "winded":
      return one(aroused ? p(["aroused", "tired"], ["aroused", "tired"], ["panting"]) : p(["tired", "strained"], ["tired"], ["panting", "tired"]));
    case "down":
      if (aroused && tier === "lewd") return one(p(["lost", "pleasure"], ["lost", "pleasure"], ["lost", "panting"]));
      return one(p(["overwhelmed", "tired"], ["tired", "strained"], ["panting", "tired"]));
    case "ready": {
      // Squared up between blows: by how lewd she is and how worn; on top, a confident face, likelier the lewder
      // she is (as KP's cockiness weights it).
      const pool: { preset: FightPreset; weight: number }[] = [];
      if (aroused) {
        pool.push({ preset: byTier(tier, p(["aroused", "embarrassed"], ["aroused"], ["bashful", "annoyed"]), p(["aroused"], ["aroused", "sultry"], ["aroused", "panting"]), p(["sultry", "aroused"], ["sultry"], ["sultry", "delighted"])), weight: 3 });
      } else if (band === "fresh") {
        pool.push({ preset: byTier(tier, p(["angry", "stern"], ["angry", "stern"], ["stern", "annoyed"]), p(["stern", "angry"], ["stern", "confident"], ["stern", "confident"]), p(["confident"], ["confident", "sultry"], ["confident", "smile"])), weight: 3 });
      } else if (band === "worn") {
        pool.push({ preset: p(["angry", "tired"], ["stern", "tired"], tier === "lewd" ? ["confident", "tired"] : ["annoyed", "tired"]), weight: 3 });
      } else {
        pool.push({ preset: p(["tired", "strained"], ["tired"], ["tired", "panting"]), weight: 3 });
      }
      if (winning && band !== "spent") pool.push({ preset: p(["confident"], ["confident"], ["confident", "smile"]), weight: byTier(tier, 1, 2, 3) });
      return pool;
    }
  }
}

/** The face picked: what it's made of (for telling faces apart), and the shape it makes. */
export interface FightFace {
  parts: Readonly<Record<FacePart, Expression>>;
  shape: FaceShape;
}

/** Her face out of its parts: each part's values from its own expression, and the deepest blush of the three. */
export function composeFace(parts: Readonly<Record<FacePart, Expression>>): FaceShape {
  const shape: FaceShape = { ...REST_FACE };
  for (const part of Object.keys(PART_KEYS) as FacePart[]) {
    for (const key of PART_KEYS[part]) shape[key] = EXPRESSIONS[parts[part]][key];
  }
  shape.blush = Math.max(...Object.values(parts).map((e) => EXPRESSIONS[e].blush));
  return shape;
}

/** Picks her face for a moment of the fight: a face from its pool by weight, then each part from its own pool. */
export function fightFace(cause: FightFaceCause, random: () => number = Math.random): FightFace {
  const pool = fightFacePool(cause);
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  let preset = pool[pool.length - 1].preset;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll < 0) {
      preset = entry.preset;
      break;
    }
  }
  const from = (options: readonly Expression[]) => options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  const parts = { brows: from(preset.brows), eyes: from(preset.eyes), mouth: from(preset.mouth) };
  return { parts, shape: composeFace(parts) };
}
