/**
 * Defeats, after Karryn's Prison's defeat battles (RemtairyEnemyTroop.js setupDefeatedLevel…Battle): which of six a
 * lost brawl becomes depends on where it ends and who won, and how many are in it on her records (KP's
 * getDefeatedLv…Factor). DEFEAT_SCENES.md has the full plan; the art (each defeat's own pose and props) is still to
 * come, so for now each plays as the After Hours game with a stand-in pose. It plays like KP's defeat battles
 * (`defeatPlay`): its slots are the parts of her in play, up to 4 are on her at once and the rest step in as spots
 * free up, and with no stamina and no willpower left she's too tired to act (duel.ts DuelDefeat). Its lines were
 * written with Grok in the house voice.
 *
 * The consent rule holds for all six: Consent on, she's asked (the lost-brawl offer) and Stop always works; Consent
 * off, it just happens (KP). Never while she's passed out, never with anyone roaring drunk. Pure rules.
 */
import type { DuelArea, DuelDefeat } from "./duel";
import type { ScenePoseName } from "./sexpose";
import type { GuestKind } from "./tavern";
import type { Crowd } from "./loglines";

export type DefeatId = "taproom" | "yard" | "room" | "storeroom" | "baron" | "garrison";
export const DEFEAT_IDS: readonly DefeatId[] = ["taproom", "yard", "room", "storeroom", "baron", "garrison"];

export interface DefeatDef {
  name: string;
  /** KP's defeat it's after. */
  kp: string;
  /** The slots on her the pose has (DEFEAT_SCENES.md), and the pose it uses until its own is made. */
  slots: readonly string[];
  standIn: ScenePoseName;
  /** Its opening, in the log. `{n}` is how many. */
  start: readonly string[];
  /** The morning after. */
  morning: readonly string[];
  /** The same when they're all women, and when it's men and women together. */
  women: DefeatWords;
  mixed: DefeatWords;
}

/** A defeat's opening and morning lines for one crowd. */
export interface DefeatWords {
  start: readonly string[];
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
      "You wake on the sawdust with {n} empty tankards around you, thighs slick with their come and body aching from use.",
      "Morning finds you on the floor, {n} drained tankards nearby and their seed drying on your skin.",
      "You come to on the sawdust, {n} empty tankards about you and the sore, well-fucked feeling still between your legs.",
      "The morning cook steps over the mess and says the place needs a proper sweep. Doesn't look at you.",
      "Cook steps over you and the mess. Says it needs sweeping. That's all.",
      "Morning cook just steps over the mess and mutters about sweeping. Won't meet your eye.",
    ],
    women: {
      start: [
        "{n} women form a ring around you on the sawdust and the first one sits on your face while the benches watch.",
        "The whole taproom goes quiet, then starts cheering as the first of them pushes her fingers into you.",
        "Tankards bang on the tables while the second woman takes her place and grinds down on you.",
        "{n} women keep the circle tight and the room howls every time one of them comes.",
      ],
      morning: [
        "You wake on the sawdust with {n} empty tankards around you, your face sticky and your thighs still trembling.",
        "Morning finds you on the floor, {n} drained tankards nearby and someone's garter tangled in your hair.",
        "The morning cook steps over the mess and says the place needs a proper sweep. Doesn't look at you.",
      ],
    },
    mixed: {
      start: [
        "{n} of them, men and women both, form a ring around you on the sawdust, and the first cock pushes into your mouth while the benches watch.",
        "The whole taproom cheers as a man takes you from behind and a woman climbs over your face.",
        "Tankards bang on the tables while the next of them takes a turn. Him or her, you've stopped keeping count.",
        "{n} of them keep the circle tight and the room howls every time one of them finishes.",
      ],
      morning: [
        "You wake on the sawdust with {n} empty tankards around you, their come drying on your skin and lip paint smeared down your thighs.",
        "Morning finds you on the floor, {n} drained tankards nearby, someone's garter in your hair and seed on your skin.",
        "The morning cook steps over the mess and says the place needs a proper sweep. Doesn't look at you.",
      ],
    },
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
      "Rain barrel half empty. Yard wall marked with frost and boot prints where they had you.",
      "The rain barrel's low and the wall's marked with boots and the frost of last night.",
      "Half the rain barrel gone. Boot prints and frost on the yard wall.",
      "Stable boy shrugs. Says the men left before the sun was properly up. Doesn't ask where you were.",
      "Stable boy just shrugs. Men left early. That's all he'll say.",
      "The stable boy shrugs and says they were gone before dawn. Leaves it at that.",
    ],
    women: {
      start: [
        "{n} women line up along the wall in the cold while you bend over the rain barrel.",
        "The first one grabs your hips and slides her fingers in as the others stamp their feet to stay warm.",
        "Breath fogs in the air while the second woman takes her turn against the barrel.",
        "{n} women keep the queue moving until the yard is loud with gasps and the barrel rocks.",
      ],
      morning: [
        "Rain barrel half empty. Yard wall marked with frost and the prints of bare knees where they had you.",
        "Stable boy shrugs. Says the ladies left before the sun was properly up, giggling. Doesn't ask where you were.",
        "Half the rain barrel gone. A ribbon tied to the pump that isn't yours.",
      ],
    },
    mixed: {
      start: [
        "{n} of them, men and women, line up along the wall in the cold while you bend over the rain barrel.",
        "The first man grabs your hips and shoves in while a woman holds your face and kisses you through it.",
        "Breath fogs in the air while the next of them takes a turn against the barrel.",
        "{n} of them keep the queue moving until the yard is loud with grunts and gasps and the barrel rocks.",
      ],
      morning: [
        "Rain barrel half empty. Yard wall marked with frost, boot prints and the prints of bare knees.",
        "Stable boy shrugs. Says the lot of them left before dawn, arm in arm. Doesn't ask where you were.",
        "Half the rain barrel gone, a ribbon on the pump and a belt in the frost.",
      ],
    },
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
      "You wake in a wrecked bed with {n} pairs of boots by the door and the sheets wet from being taken all night.",
      "Morning light hits a ruined bed, {n} sets of boots left by the door, and your body still full of last night's spend.",
      "You stir sore in the disordered bed, {n} pairs of boots by the door and the ache of being fucked still deep inside you.",
      "Sheets ruined. Cook downstairs pretends not to hear you come down the stairs.",
      "The sheets are a mess. Cook pretends not to hear you on the stairs.",
      "Sheets are wrecked. Downstairs the cook pretends not to notice you coming down.",
    ],
    women: {
      start: [
        "{n} women shut the door to your own room and the first one climbs onto the bed with you.",
        "The mattress creaks while the second woman waits by the door and the rest crowd in, unlacing.",
        "Lantern light flickers as they take turns with their mouths and the bedframe knocks the wall.",
        "{n} women keep the door barred and the room fills with moaning that isn't all yours.",
      ],
      morning: [
        "You wake in a wrecked bed with {n} pairs of slippers by the door and the sheets soaked through.",
        "Morning light hits a ruined bed, {n} stockings hung on the bedpost, and your thighs still aching.",
        "Sheets ruined. Cook downstairs pretends not to hear you come down the stairs.",
      ],
    },
    mixed: {
      start: [
        "{n} of them, men and women, shut the door to your own room and the first one climbs onto the bed with you.",
        "The mattress creaks with a man inside you and a woman's mouth on your breasts, the rest crowding in.",
        "Lantern light flickers as they take turns and the bedframe knocks the wall.",
        "{n} of them keep the door barred and the room fills with the sound of the bed working.",
      ],
      morning: [
        "You wake in a wrecked bed, boots and slippers by the door and your body still full of last night's spend.",
        "Morning light hits a ruined bed, stockings on the bedpost and the sheets wet from being taken all night.",
        "Sheets ruined. Cook downstairs pretends not to hear you come down the stairs.",
      ],
    },
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
      "Three casks open and the lantern burned out. Floor sticky where they had you.",
      "Casks open, lantern dead. The storeroom smells of ale and sex.",
      "Three casks open, lantern out. Floor's sticky under your bare feet.",
      "Morning tally shows more ale missing than the night's sales explain. You know where it went.",
      "More ale gone than the sales account for. The storeroom tells its own story.",
      "Tally's short on ale. More missing than the night's orders.",
    ],
    women: {
      start: [
        "{n} women drag you into the storeroom and bend you over an ale cask under the lantern.",
        "The first one works her fingers into you while the others stand between the shelves and watch.",
        "Casks rattle as the second woman takes her place and the lantern swings.",
        "{n} women keep the line moving among the barrels until the floor is sticky with spilled ale.",
      ],
      morning: [
        "Three casks open and the lantern burned out. A hairpin on the floor where they had you.",
        "Casks open, lantern dead. The storeroom smells of ale and perfume.",
        "Tally's short on ale. More missing than the night's orders.",
      ],
    },
    mixed: {
      start: [
        "{n} of them, men and women, drag you into the storeroom and bend you over an ale cask under the lantern.",
        "A man thrusts in from behind while a woman sits on the cask in front of you and pulls your face between her thighs.",
        "Casks rattle as the next of them takes a turn and the lantern swings.",
        "{n} of them keep the line moving among the barrels until the floor is sticky with spilled ale.",
      ],
      morning: [
        "Three casks open and the lantern burned out. Floor sticky, with a hairpin and a belt where they had you.",
        "Casks open, lantern dead. The storeroom smells of ale, perfume and sex.",
        "Tally's short on ale. More missing than the night's orders.",
      ],
    },
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
      "The writ is still nailed to the table, captain's seal at the bottom, while you sit bare and aching from the night.",
      "Morning shows the writ pinned fast, the captain's seal clear, and your thighs still wet from being used.",
      "You see the writ nailed to the table with the seal stamped firm, body sore and marked from last night's fucking.",
      "You fold the paper away, cunt still throbbing; the Baron will want his copy.",
      "The paper is folded and set aside, seed still leaking from you, so the Baron can have his copy.",
      "You put the paper safely away, body humming and used, knowing the Baron expects his copy.",
    ],
    women: {
      start: [
        "The Baron's captain clears the big table, nails the writ down, and her {n} women-at-arms take their places.",
        "The first of them bends you over the table while the captain reads the writ aloud.",
        "The watching room stays quiet as the second woman steps up, unbuckling her sword belt.",
        "{n} women keep the order while the captain marks each name on the paper.",
      ],
      morning: [
        "The writ is still nailed to the table, captain's seal at the bottom, while you sit bare and aching from the night.",
        "You fold the paper away, still throbbing from their fingers; the Baron will want his copy.",
        "Morning shows the writ pinned fast and your thighs still shaking. The Baron will want his copy.",
      ],
    },
    mixed: {
      start: [
        "The Baron's captain clears the big table, nails the writ down, and {n} of the Baron's soldiers, men and women, take their places.",
        "The first man bends you over the table while a woman-at-arms holds your wrists and the captain reads the writ aloud.",
        "The watching room stays quiet as the next of them steps up and the writ stays nailed in place.",
        "{n} of them keep the order while the captain marks each name on the paper.",
      ],
      morning: [
        "The writ is still nailed to the table, captain's seal at the bottom, while you sit bare and aching from the night.",
        "The paper is folded and set aside, seed still leaking from you, so the Baron can have his copy.",
        "You put the paper safely away, body humming and used, knowing the Baron expects his copy.",
      ],
    },
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
      "Helmets gone and the floor swept cleaner than the rest of the tavern. They were tidy about it.",
      "Helmets gone. Floor swept clean. Garrison left everything in order.",
      "The helmets are gone and the floor's swept. Neater than the rest of the place.",
      "Morning watch nods. Says the squad left everything in order. Doesn't ask about you.",
      "Morning watch just nods. Squad left things in order. That's all.",
      "The morning watch nods and says the squad left everything tidy.",
    ],
    women: {
      start: [
        "A squad of {n} women sets their helmets in a neat row and the first one takes her turn.",
        "They keep the line tight like drill while the second woman steps forward, gauntlets off.",
        "Boots scuff the floor in rhythm as each of them comes and the next takes her place.",
        "{n} helmets stay lined up until the last of them is done and the squad reforms.",
      ],
      morning: [
        "Helmets gone and the floor swept cleaner than the rest of the tavern. They were tidy about it.",
        "Morning watch nods. Says the squad left everything in order. Doesn't ask about you.",
        "The helmets are gone, the floor's swept, and someone left you a neat little note saying thanks.",
      ],
    },
    mixed: {
      start: [
        "A squad of {n}, men and women, sets their helmets in a neat row and the first one takes a turn.",
        "They keep the line tight like drill while the next soldier steps forward.",
        "Boots scuff the floor in rhythm as each of them finishes and the next takes their place.",
        "{n} helmets stay lined up until the last of them is done and the squad reforms.",
      ],
      morning: [
        "Helmets gone and the floor swept cleaner than the rest of the tavern. They were tidy about it.",
        "Morning watch nods. Says the squad left everything in order. Doesn't ask about you.",
        "The helmets are gone and the floor's swept. Neater than the rest of the place.",
      ],
    },
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

/** How many are on her at the start of a defeat, at most (KP: Math.min(4, max)); the rest step in as spots free up. */
export const DEFEAT_AT_ONCE = 4;

/** Each slot on her (DEFEAT_SCENES.md) as the After Hours game's part of her; "other 1-N" are men standing round. */
const SLOT_AREA: Readonly<Record<string, DuelArea>> = { mouth: "mouth", left: "hands", right: "hands", breasts: "breasts", pussy: "pussy", rear: "butt" };

/**
 * A defeat as the After Hours game plays it (duel.ts DuelDefeat): its slots are the parts of her in play (each
 * holding one; both hands hold two), the "others" are how many stand round her, and at most DEFEAT_AT_ONCE are on her
 * at once (fewer if the slots hold fewer).
 */
export function defeatPlay(id: DefeatId): DuelDefeat {
  const holds: Partial<Record<DuelArea, number>> = {};
  let others = 0;
  for (const slot of DEFEATS[id].slots) {
    const many = /^other 1-(\d+)$/.exec(slot);
    if (many) {
      others += Number(many[1]);
      continue;
    }
    const area = SLOT_AREA[slot];
    if (area) holds[area] = (holds[area] ?? 0) + 1;
  }
  const areas = Object.keys(holds) as DuelArea[];
  const room = Object.values(holds).reduce((n, h) => n + (h ?? 0), 0) + others;
  return { id, areas, holds, others, atOnce: Math.min(DEFEAT_AT_ONCE, room) };
}

/** A defeat's opening and morning lines for who's in it: the men's are the defeat's own `start` and `morning`. */
export function defeatWords(id: DefeatId, crowd: Crowd): DefeatWords {
  const def = DEFEATS[id];
  return crowd === "men" ? { start: def.start, morning: def.morning } : def[crowd];
}

/** A line from a list, by a roll 0 to 1. */
export function defeatLine(lines: readonly string[], roll: number, n: number): string {
  return lines[Math.floor(roll * lines.length) % lines.length].replaceAll("{n}", String(n));
}
