/**
 * Where a man finishes on (or in) her, and how much, like Karryn's records of every load: counted per spot for
 * the journal, shown in the duel log as it happens. Only men leave any; a woman partner giving in leaves none.
 *
 * Where it lands follows what they were doing, so it never goes outside the rules she set for a duel: inside her
 * pussy only if it was in play, in her mouth only if her mouth was. With no part of her in play it lands on her
 * body (or her face, when her mouth is in play).
 */
import type { GuestKind } from "./tavern";

export type CumSpot = "mouth" | "face" | "breasts" | "pussy" | "ass" | "body";
export const CUM_SPOTS: readonly CumSpot[] = ["mouth", "face", "breasts", "pussy", "ass", "body"];

/** What each spot is called in the journal and the duel log. */
export const CUM_NAMES: Record<CumSpot, string> = {
  mouth: "Swallowed",
  face: "Face",
  breasts: "Tits",
  pussy: "Pussy",
  ass: "Ass",
  body: "Body",
};

/** Each kind of guest's usual load, in ml. A game's numbers, not a doctor's. */
const LOAD: Record<GuestKind, number> = {
  farmer: 9,
  fugitive: 7,
  smuggler: 8,
  soldier: 12,
};

/** One load: some way either side of the guest's usual. */
export function loadOf(kind: GuestKind, random: () => number): number {
  return Math.max(1, Math.round(LOAD[kind] * (0.7 + random() * 0.6)));
}

/** Of a load in her mouth, the share of times he pulls out and finishes on her face instead. */
const FACE_CHANCE = 0.3;

/**
 * Where he finishes, from the part of her he had last ("hands", "mouth", "breasts", "butt", "pussy", or none).
 * `mouthInPlay` lets a load with nowhere else to go land on her face.
 */
export function spotFor(area: string | null, mouthInPlay: boolean, random: () => number): CumSpot {
  switch (area) {
    case "mouth":
      return random() < FACE_CHANCE ? "face" : "mouth";
    case "breasts":
      return "breasts";
    case "butt":
      return "ass";
    case "pussy":
      return "pussy";
    case "hands":
      return "body";
    default:
      return mouthInPlay ? "face" : "body";
  }
}

/** How a load in each spot reads in the log, when the AI bank has nothing for it. `{who}` is the man. */
export const CUM_LINES: Record<CumSpot, readonly string[]> = {
  mouth: [
    "{who} groans and floods your mouth. You swallow every drop.",
    "{who}'s cock throbs on your tongue as he pumps his load down your throat.",
    "{who} grabs your hair and empties himself in your mouth. You gulp it down.",
  ],
  face: [
    "{who} pulls out and paints your face in thick white ropes.",
    "{who} jerks himself over you and splatters your cheeks and lips.",
    "{who}'s load hits your face hot and sticky. It drips off your chin.",
  ],
  breasts: [
    "{who}'s cock jerks between your tits and coats them in cum.",
    "{who} groans and spurts all over your breasts. It runs down to your nipples.",
    "{who} unloads across your chest, thick and warm and dripping.",
  ],
  pussy: [
    "{who} slams in deep and fills your pussy with his cum.",
    "{who} shudders inside you, pumping you full. It leaks out when he pulls back.",
    "{who} buries his cock to the hilt and floods you, hot and thick.",
  ],
  ass: [
    "{who} grips your hips and empties himself deep in your ass.",
    "{who} groans and pumps your ass full. It drips down your thighs.",
    "{who}'s cock throbs in your ass as he fills you up.",
  ],
  body: [
    "{who} spurts hot cum all across your belly.",
    "{who} finishes in your hands and all over your stomach.",
    "{who} groans and splatters your skin with his load.",
  ],
};

/**
 * The parts of her the model shows it on, each built in stages that add to one another: the meshes
 * "<Body>_Cum<Section><Stage>", from stage 1 to COAT_STAGES.
 */
export type CoatSection = "Mouth" | "Face" | "Breasts" | "Body" | "Pussy" | "Ass" | "Back" | "Arms" | "Hands";
export const COAT_SECTIONS: readonly CoatSection[] = ["Mouth", "Face", "Breasts", "Body", "Pussy", "Ass", "Back", "Arms", "Hands"];
export const COAT_STAGES = 3;

/**
 * Where each spot shows, and how much of a load there counts: what goes in her mouth shows on her lips and chin
 * (her mouth, not her face), one on her face catches her lips a little too, a man behind her gets some on her lower
 * back as well as her ass, and one finishing in her hands (counted as on her body) gets her hands and arms too.
 */
const COAT_OF: Record<CumSpot, readonly [CoatSection, number][]> = {
  mouth: [["Mouth", 1]],
  face: [["Face", 1], ["Mouth", 0.4]],
  breasts: [["Breasts", 1]],
  body: [["Body", 1], ["Hands", 1], ["Arms", 0.6]],
  pussy: [["Pussy", 1]],
  ass: [["Ass", 1], ["Back", 0.6]],
};

/** The ml on a part of her it takes to reach stages 1, 2 and 3: one load shows, two more, four or so covers her. */
const COAT_STAGE_ML: readonly number[] = [1, 16, 32];

/** How far along each part of her is, from 0 (clean) to COAT_STAGES, for what has landed on her tonight. */
export function coatStages(cum: Partial<Record<CumSpot, number>>): Record<CoatSection, number> {
  const ml: Record<CoatSection, number> = { Mouth: 0, Face: 0, Breasts: 0, Body: 0, Pussy: 0, Ass: 0, Back: 0, Arms: 0, Hands: 0 };
  for (const spot of CUM_SPOTS) {
    for (const [section, share] of COAT_OF[spot]) ml[section] += (cum[spot] ?? 0) * share;
  }
  const stages = { ...ml };
  for (const section of COAT_SECTIONS) stages[section] = COAT_STAGE_ML.filter((need) => ml[section] >= need).length;
  return stages;
}
