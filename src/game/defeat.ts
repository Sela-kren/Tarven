/**
 * Defeats, after Karryn's Prison's defeat battles (RemtairyEnemyTroop.js setupDefeatedLevel…Battle): which of six a
 * lost brawl becomes depends on where it ends and who won, and how many are in it on her records (KP's
 * getDefeatedLv…Factor). DEFEAT_SCENES.md has the full plan; the art (each defeat's own pose and props) is still to
 * come, so for now each plays as the After Hours game with a stand-in. Its lines were written with Grok in the house
 * voice.
 *
 * The consent rule holds for all six: Consent on, she's asked (the lost-brawl offer) and Stop always works; Consent
 * off, it just happens (KP). Never while she's passed out, never with anyone roaring drunk. Pure rules.
 */
import type { GuestKind } from "./tavern";

export type DefeatId = "taproom" | "yard" | "room" | "storeroom" | "baron" | "garrison";
export const DEFEAT_IDS: readonly DefeatId[] = ["taproom", "yard", "room", "storeroom", "baron", "garrison"];

export interface DefeatDef {
  name: string;
  /** KP's defeat it's after. */
  kp: string;
  /** The slots on her the pose has (DEFEAT_SCENES.md), and the pose it uses until its own is made. */
  slots: readonly string[];
  standIn: string;
  /** Its opening, in the log. `{n}` is how many. */
  start: readonly string[];
  /** The morning after. */
  morning: readonly string[];
}

export const DEFEATS: Readonly<Record<DefeatId, DefeatDef>> = {
  taproom: {
    name: "The taproom floor",
    kp: "defeated_level1 (the blowbang)",
    slots: ["mouth", "left", "right", "other 1-4"],
    standIn: "gangbang",
    start: [
      "{n} men form a ring around you on the sawdust and the first one steps in while the benches watch.",
      "The whole taproom goes quiet then starts cheering as the first cock pushes into your mouth.",
      "Tankards bang on the tables while the second man takes his place behind you.",
      "{n} men keep the circle tight and the room howls every time one of them finishes.",
    ],
    morning: [
      "You wake on the sawdust with {n} empty tankards scattered around you and the floor sticky.",
      "The morning cook steps over the mess and just says the place needs a proper sweep.",
    ],
  },
  yard: {
    name: "Out back in the yard",
    kp: "defeated_level2 (the bathroom)",
    slots: ["pussy", "rear", "other 1-4"],
    standIn: "bentover",
    start: [
      "{n} men line up along the wall in the cold while you bend over the rain barrel.",
      "The first one grabs your hips and shoves in as the others stamp their feet to stay warm.",
      "Breath fogs in the air while the second man takes his turn against the barrel.",
      "{n} men keep the queue moving until the yard is loud with grunts and the barrel rocks.",
    ],
    morning: [
      "You find the rain barrel half empty and the yard wall marked with frost and boot prints.",
      "The stable boy just shrugs and says the men left before the sun was properly up.",
    ],
  },
  room: {
    name: "Her own room",
    kp: "defeated_level3 (the solo cell)",
    slots: ["pussy", "rear", "mouth", "breasts", "other 1-2"],
    standIn: "missionary",
    start: [
      "{n} men shut the door to your own room and the first one climbs onto the bed with you.",
      "The mattress creaks while the second man waits by the door and the rest crowd in.",
      "Lantern light flickers as they take turns and the bedframe knocks the wall.",
      "{n} men keep the door barred and the room fills with the sound of the bed working.",
    ],
    morning: [
      "You wake in a wrecked bed with {n} pairs of boots still by the door.",
      "The sheets are ruined, and the cook downstairs pretends not to hear you come down.",
    ],
  },
  storeroom: {
    name: "The storeroom",
    kp: "defeated_level4",
    slots: ["pussy", "rear", "mouth", "other 1-4"],
    standIn: "bentover",
    start: [
      "{n} men drag you into the storeroom and bend you over an ale cask under the lantern.",
      "The first one thrusts in while the others stand between the shelves and watch.",
      "Casks rattle as the second man takes his place and the lantern swings.",
      "{n} men keep the line moving among the barrels until the floor is sticky with spilled ale.",
    ],
    morning: [
      "You find three casks open and the lantern burned out on the shelf.",
      "The morning tally shows more ale missing than the night's sales can explain.",
    ],
  },
  baron: {
    name: "The Baron's men",
    kp: "defeated_level5 (the captain)",
    slots: ["pussy", "rear", "mouth", "left", "right", "breasts", "other 1-4"],
    standIn: "gangbang",
    start: [
      "The Baron's captain clears the big table, nails the writ down, and his {n} men take their places.",
      "The first man bends you over the table while the captain reads the writ aloud.",
      "The watching room stays quiet as the second man steps up and the writ stays nailed in place.",
      "{n} men keep the order while the captain marks each name on the paper.",
    ],
    morning: [
      "The writ is still nailed to the table and the captain's seal is stamped at the bottom.",
      "You fold the paper away; the Baron will want his copy.",
    ],
  },
  garrison: {
    name: "The garrison",
    kp: "defeated_guard",
    slots: ["pussy", "rear", "mouth", "breasts"],
    standIn: "gangbang",
    start: [
      "A squad of {n} men sets their helmets in a neat row and the first one takes his turn.",
      "They keep the line tight like drill while the second man steps forward.",
      "Boots scuff the floor in rhythm as each man finishes and the next takes his place.",
      "{n} helmets stay lined up until the last man is done and the squad reforms.",
    ],
    morning: [
      "The helmets are gone and the floor is swept cleaner than the rest of the tavern.",
      "The morning watch just nods and says the squad left everything in order.",
    ],
  },
};

/** Where a lost brawl ends up, as the tavern knows it. */
export interface DefeatContext {
  place: "here" | "upstairs" | "yard";
  /** Who won. */
  kind: GuestKind;
  /** It was a night invasion, in her room. */
  invasion?: boolean;
  /** How much the keep has its eye on her (heat): the Baron's men come for her at the top. */
  heat: number;
}

/** The heat at which a soldier who beats her is the Baron's man, and it's the captain's defeat. */
export const BARON_HEAT = 8;

/** Which defeat a lost brawl becomes. */
export function defeatFor(c: DefeatContext): DefeatId {
  if (c.invasion || c.place === "upstairs") return "room";
  if (c.place === "yard") return "yard";
  if (c.kind === "soldier") return c.heat >= BARON_HEAT ? "baron" : "garrison";
  // Smugglers know where the casks are kept.
  if (c.kind === "smuggler") return "storeroom";
  return "taproom";
}

/** How many are in a defeat at most (KP's getDefeatedLv…Factor), from her records. */
export const CROWD_MAX = 8;
export function crowdFactor(r: { taproomPartners: number; fightsLost: number; defeats?: Partial<Record<DefeatId, number>> }, id: DefeatId): number {
  const here = r.defeats?.[id] ?? 0;
  const n = 2 + Math.floor(r.taproomPartners / 10) + Math.floor(r.fightsLost / 3) + Math.min(2, here);
  // Her own room only holds so many.
  return Math.min(id === "room" ? 3 : CROWD_MAX, n);
}

/** A line from a list, by a roll 0 to 1. */
export function defeatLine(lines: readonly string[], roll: number, n: number): string {
  return lines[Math.floor(roll * lines.length) % lines.length].replaceAll("{n}", String(n));
}
