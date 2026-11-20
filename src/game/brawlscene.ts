import type { DuelArea } from "./duel";
import { poseForEvent, type BattlePoseName, type PoseBeat } from "./battlepose";
import type { IntimateMove } from "./desire";
import { sceneForEntry, type ScenePoseName } from "./sexpose";
import type { GuestKind } from "./tavern";
import { SMACK_TOUCHES, type TouchRegion } from "./touchtalk";

/**
 * Sex in the middle of a brawl, in the big picture, the way Karryn's Prison does it in battle (RemtairyPoses.js
 * refreshPose returns early in a sex pose, so the pose is locked till the man who started it is done):
 *
 * - Her own moves (her hands on them, her mouth, riding them: fight.ts INTIMATE_MOVES) put her in a scene with the
 *   one she's fighting, and it holds through the turns, their swings and all, until she does something else.
 *   Doing it again keeps the same pose (her mouth on them again goes deeper, once, and stays there).
 * - A touch she lets land (the touch screen, or Consent off's check) shows a moment of it, then she's back in the
 *   fight, unless she's already in a scene with them.
 * - A foe starting a scene with her (GAME_PATH.MD 7i), once she's let him: the way his type has her, held the same
 *   while he has her (fight.ts `taken`): through his coming while he's got more in him, a helper at her mouth or
 *   hand coming and going, and her stamina running out. It ends when he lets go of her (spent, out of the fight,
 *   or pulling out to come on her), she struggles free, or it's over.
 *
 * It only ever shows what she chose or let happen: who starts what is fight.ts and the touch screen's business.
 */

/** A beat of a brawl turn in the big picture: a fight pose, or a scene with the one she's fighting. */
export interface BrawlBeat extends PoseBeat {
  scene?: ScenePoseName;
}

/** Her moves in a brawl that aren't fighting them (fight.ts IntimateMove). */
const INTIMATE: ReadonlySet<string> = new Set<IntimateMove>(["hands", "mouth", "ride"]);

/** The intimate move a brawl event is, if it is one. */
export function intimateOf(event: string): IntimateMove | null {
  const move = event.startsWith("intimate:") ? event.slice("intimate:".length) : "";
  return INTIMATE.has(move) ? (move as IntimateMove) : null;
}

/**
 * Whether a brawl event takes her out of a scene: a move of hers that isn't with them (fight.ts events), or
 * struggling free. Her willpower (suppressing, steeling herself) is in her head, and doesn't move her (KP's mental
 * phase leaves the pose be); held in a scene a foe started, only struggling free does.
 */
function breaksScene(event: string, taken: boolean): boolean {
  if (event === "struggle:free" || event === "lost") return true;
  if (taken) return false;
  return /^(strike|kick|shove|grab|headlock|hairpull|tackle|talk|stare):/.test(event) || ["dodge", "throw"].includes(event);
}

/**
 * Whether his coming (`events[i]` is "their:come") ends the scene she's in with him: not if he's got more in him
 * and keeps going ("their:again" before anyone else comes, KP's ejaculation stock); held by him, only once he's let
 * go of her (`stillTaken` false at the turn's end).
 */
function comeEnds(events: readonly string[], i: number, taken: boolean, stillTaken: boolean | undefined): boolean {
  if (taken) return stillTaken !== true;
  for (let j = i + 1; j < events.length && events[j] !== "their:come"; j++) if (events[j] === "their:again") return false;
  return true;
}

/** The part of her a foe has, if a brawl event is her letting him start a scene (fight.ts `taken:<area>`). */
export function takenOf(event: string): DuelArea | null {
  const m = /^taken:(hands|mouth|breasts|pussy|butt)$/.exec(event);
  return m ? (m[1] as DuelArea) : null;
}

/** How far each scene a foe starts goes (sexpose.ts THEIR_SCENES stages): stroking, kneeling, paizuri, his way. */
const TAKEN_STAGE: Readonly<Record<DuelArea, number>> = { hands: 1, mouth: 1, breasts: 2, pussy: 2, butt: 2 };

/** The scene a foe starts with her, by the part of her he has: in her, the way his type has her. */
export function takenScene(area: DuelArea, kind: GuestKind, female: boolean): ScenePoseName {
  return sceneForEntry({ side: "partner", part: area, stage: TAKEN_STAGE[area], kind }, female) ?? "grope";
}

/** How many times running she's done each intimate move, for going deeper with her mouth or turning round on them. */
export type IntimateRun = { move: IntimateMove; times: number } | null;

/**
 * The scene an intimate move of hers puts her in with them. `times` is how many times running she's done it, this
 * one included: her mouth on them twice running goes deeper, and stays there; riding them she stays as she is (KP
 * holds a pose, it doesn't flip it turn to turn).
 */
export function intimateScene(move: IntimateMove, kind: GuestKind, female: boolean, times: number): ScenePoseName {
  if (!female && move === "mouth" && times >= 2) return "throat";
  return sceneForEntry({ side: "her", move, kind }, female) ?? "stroke";
}

/** The scene a touch she lets land mid-brawl shows for a moment, or null for one that doesn't make one (her clothes). */
export function touchScene(touch: { id: string; region: TouchRegion }): ScenePoseName | null {
  if (SMACK_TOUCHES.has(touch.id)) return "spank";
  switch (touch.region) {
    case "lips":
    case "neck":
      return "kiss";
    case "face":
    case "hair":
    case "hand":
    case "shoulder":
    case "waist":
      return "caress";
    case "chest":
    case "lap":
    case "thigh":
    case "intimate":
      return "grope";
    case "rear":
      return "grab";
    default:
      return null;
  }
}

/** How long a touch she let land holds the picture before she's back in the fight, in seconds. */
export const TOUCH_SCENE_HOLD = 1.8;

/**
 * A brawl turn's beats in the big picture (battlepose.ts turnBeats, with scenes): each event that gets a comic
 * moment (`hasShot`) takes `gap` seconds. An event that puts her in a scene (`sceneOf`: an intimate move of hers, or
 * a foe's she let him start) holds through what they do, a blow still flashing the picture, until she does something
 * else, struggles free, he's done with her, or it's over (her going down doesn't end it: KP's sex pose stays). `held`
 * is the scene she came into the turn in, `taken` whether a foe started it, and `stillTaken` whether a foe still has
 * her once the turn's played (fight.ts `taken`); the one she's left in comes back with the beats.
 */
export function brawlBeats(
  events: readonly string[],
  hasShot: (event: string) => boolean,
  gap: number,
  rest: BattlePoseName,
  held: ScenePoseName | null,
  sceneOf: (event: string) => ScenePoseName | null,
  taken = false,
  stillTaken?: boolean,
): { beats: BrawlBeat[]; held: ScenePoseName | null; taken: boolean } {
  const beats: BrawlBeat[] = [];
  let shots = 0;
  for (const [i, event] of events.entries()) {
    const scene = sceneOf(event);
    if (scene) {
      held = scene;
      taken = takenOf(event) !== null;
    } else if (breaksScene(event, taken) || (event === "their:come" && comeEnds(events, i, taken, stillTaken))) {
      held = null;
      taken = false;
    }
    if (!hasShot(event)) continue;
    const at = shots * gap;
    shots++;
    const pose = poseForEvent(event);
    if (held) beats.push({ pose: pose ?? "held", at, hurt: pose === "guard" || pose === "held", scene: held });
    else if (pose) beats.push({ pose, at, hurt: pose === "guard" || pose === "held" || pose === "down" });
  }
  // A foe that still has her keeps her, whatever went on in the turn (a helper coming and going at her mouth); one
  // that's let go of her, however it happened, doesn't.
  if (taken && stillTaken === false) {
    held = null;
    taken = false;
  }
  const end = Math.max(1, shots) * gap;
  beats.push(held ? { pose: rest, at: end, hurt: false, scene: held } : { pose: rest, at: end, hurt: false });
  return { beats, held, taken: held !== null && taken };
}
