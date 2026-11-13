/**
 * Who a guest is: the group they come from (`GuestKind`, which decides how they talk) and their type inside it
 * (`GuestRole`, which decides their numbers). A farmer and a soldier differ, and so do an archer and a mage, though
 * both are adventurers: each type has its own patience, purse, favourite drink, nerve, temper, fists and so on.
 *
 * The first four groups have one type each, named like the group. The adventurers come as a party of archer,
 * warrior, mage and cleric; the bandits as rogue and brute; the nobles as a noble and their servant. Each new type
 * wears its own guest-only outfit (appearance.ts).
 */
import type { GuestOutfit } from "./appearance";
import type { DuelArea } from "./duel";
import type { Mood } from "./mood";
import type { Bottle, GuestKind } from "./tavern";

export type GuestRole =
  | "farmer"
  | "soldier"
  | "smuggler"
  | "fugitive"
  | "archer"
  | "warrior"
  | "mage"
  | "cleric"
  | "rogue"
  | "brute"
  | "noble"
  | "servant";

export interface RoleStats {
  /** The group they belong to. */
  kind: GuestKind;
  /** What they're called when they speak, and in the log. */
  label: string;
  /** The guest-only outfit they wear, or null for the group's plain clothes. */
  outfit: GuestOutfit | null;

  // Service.
  /** Seconds they'll wait for their order, before cushions, mess and charm. */
  patience: number;
  /** Gold for what they ordered, and on top when they tip. */
  pay: number;
  tip: number;
  /** Village trust from serving them; and heat if they walk out. */
  trust: number;
  walkoutHeat: number;
  /** The bottle they ask for instead of ale, when it's on the shelf. */
  favourite: Bottle;
  /** How long they linger once served: 1 is usual. */
  stay: number;
  /** How easily vodka gets them drunk: 1 is usual, lower holds it better. */
  lightweight: number;
  /** How much a dirty room shortens their patience: 1 is usual, 0 doesn't notice, 2 can't bear it. */
  fussy: number;
  /** Extra fame when they leave served and tipping: they talk about the place wherever they go next. */
  fame: number;

  // Temper.
  /** What they tend to walk in feeling, before the innkeeper's reputation counts. Calm makes up the rest. */
  leanings: Partial<Record<Mood, number>>;
  /** How high lust and longing can roll on the way in, out of 10. */
  lustCeiling: number;
  desireCeiling: number;
  /** How bold they start, before lust and drink. */
  nerve: number;

  // A brawl.
  fight: { stamina: number; attack: number; accuracy: number };

  // Upstairs and after hours.
  /** resist: how hard to push over the edge. skill: the pleasure they deal. stamina: how much they can take. */
  partner: { resist: number; skill: number; stamina: number };
  /** The part of her they go for first. */
  prefers: DuelArea;
  /** Their usual load, in ml. A game's numbers, not a doctor's. */
  load: number;
}

export const ROLES: Record<GuestRole, RoleStats> = {
  farmer: {
    kind: "farmer", label: "Farmer", outfit: null,
    patience: 55, pay: 4, tip: 2, trust: 1, walkoutHeat: 0, favourite: "mead", stay: 1, lightweight: 1, fussy: 1, fame: 0,
    leanings: { happy: 14, gloomy: 20, drunk: 6, angry: 4 }, lustCeiling: 4, desireCeiling: 8, nerve: 1,
    fight: { stamina: 14, attack: 3, accuracy: 0.55 },
    partner: { resist: 1.15, skill: 0.85, stamina: 22 }, prefers: "hands", load: 9,
  },
  soldier: {
    kind: "soldier", label: "Soldier", outfit: null,
    patience: 30, pay: 6, tip: 1, trust: 0, walkoutHeat: 2, favourite: "vodka", stay: 1, lightweight: 1, fussy: 0.6, fame: 0,
    leanings: { happy: 6, drunk: 22, angry: 10, lust: 4 }, lustCeiling: 7, desireCeiling: 7, nerve: 3,
    fight: { stamina: 24, attack: 6, accuracy: 0.7 },
    partner: { resist: 0.8, skill: 1.25, stamina: 30 }, prefers: "pussy", load: 12,
  },
  smuggler: {
    kind: "smuggler", label: "Smuggler", outfit: "pirate",
    patience: 40, pay: 9, tip: 4, trust: 0, walkoutHeat: 0, favourite: "wine", stay: 1, lightweight: 0.9, fussy: 1, fame: 0,
    leanings: { scheming: 32, happy: 4, drunk: 4, lust: 3 }, lustCeiling: 6, desireCeiling: 9, nerve: 2,
    fight: { stamina: 18, attack: 4, accuracy: 0.65 },
    partner: { resist: 0.9, skill: 1.1, stamina: 25 }, prefers: "butt", load: 8,
  },
  fugitive: {
    kind: "fugitive", label: "Stranger", outfit: null,
    patience: 45, pay: 5, tip: 3, trust: 1, walkoutHeat: 0, favourite: "vodka", stay: 0.9, lightweight: 1.1, fussy: 0.5, fame: 0,
    leanings: { scared: 42, gloomy: 12, happy: 2 }, lustCeiling: 3, desireCeiling: 10, nerve: 1,
    fight: { stamina: 16, attack: 4, accuracy: 0.6 },
    partner: { resist: 1, skill: 1, stamina: 24 }, prefers: "mouth", load: 7,
  },

  // The adventurers: loud, spend fast, and spread her name on the road.
  archer: {
    kind: "adventurer", label: "Archer", outfit: "archer",
    patience: 35, pay: 7, tip: 3, trust: 0, walkoutHeat: 0, favourite: "mead", stay: 1, lightweight: 0.9, fussy: 0.8, fame: 1,
    leanings: { happy: 22, drunk: 10, lust: 6 }, lustCeiling: 6, desireCeiling: 7, nerve: 2,
    fight: { stamina: 18, attack: 5, accuracy: 0.85 },
    partner: { resist: 1, skill: 1.15, stamina: 24 }, prefers: "butt", load: 9,
  },
  warrior: {
    kind: "adventurer", label: "Warrior", outfit: "warrior",
    patience: 30, pay: 8, tip: 2, trust: 0, walkoutHeat: 1, favourite: "vodka", stay: 1.25, lightweight: 0.5, fussy: 0.4, fame: 1,
    leanings: { drunk: 22, happy: 14, angry: 6, lust: 4 }, lustCeiling: 7, desireCeiling: 6, nerve: 3,
    fight: { stamina: 32, attack: 6, accuracy: 0.6 },
    partner: { resist: 0.8, skill: 1.15, stamina: 34 }, prefers: "pussy", load: 12,
  },
  mage: {
    kind: "adventurer", label: "Mage", outfit: "mage",
    patience: 50, pay: 10, tip: 4, trust: 0, walkoutHeat: 0, favourite: "wine", stay: 1.3, lightweight: 1.4, fussy: 1.3, fame: 2,
    leanings: { happy: 10, scheming: 10, gloomy: 6, lust: 4 }, lustCeiling: 4, desireCeiling: 9, nerve: 1,
    fight: { stamina: 12, attack: 7, accuracy: 0.75 },
    partner: { resist: 1.2, skill: 1, stamina: 18 }, prefers: "mouth", load: 7,
  },
  cleric: {
    kind: "adventurer", label: "Cleric", outfit: "cleric",
    patience: 65, pay: 6, tip: 5, trust: 2, walkoutHeat: 0, favourite: "mead", stay: 1.1, lightweight: 1, fussy: 1.1, fame: 1,
    leanings: { happy: 24, gloomy: 4 }, lustCeiling: 2, desireCeiling: 8, nerve: 0,
    fight: { stamina: 22, attack: 2, accuracy: 0.5 },
    partner: { resist: 1.3, skill: 0.9, stamina: 26 }, prefers: "hands", load: 8,
  },

  // The bandits: they bring trouble, and the Baron's heat when they're crossed.
  rogue: {
    kind: "bandit", label: "Rogue", outfit: "rogue",
    patience: 35, pay: 7, tip: 3, trust: 0, walkoutHeat: 1, favourite: "wine", stay: 0.9, lightweight: 0.8, fussy: 0.5, fame: 0,
    leanings: { scheming: 30, angry: 6, lust: 6 }, lustCeiling: 6, desireCeiling: 7, nerve: 4,
    fight: { stamina: 16, attack: 5, accuracy: 0.85 },
    partner: { resist: 0.9, skill: 1.3, stamina: 22 }, prefers: "butt", load: 8,
  },
  brute: {
    kind: "bandit", label: "Brute", outfit: "brute",
    patience: 25, pay: 6, tip: 1, trust: 0, walkoutHeat: 3, favourite: "vodka", stay: 1.1, lightweight: 0.6, fussy: 0, fame: 0,
    leanings: { angry: 26, drunk: 16, lust: 6 }, lustCeiling: 8, desireCeiling: 5, nerve: 5,
    fight: { stamina: 34, attack: 8, accuracy: 0.55 },
    partner: { resist: 0.75, skill: 1.2, stamina: 32 }, prefers: "pussy", load: 14,
  },

  // The nobles: the richest purses, and the shortest patience with a dirty room.
  noble: {
    kind: "noble", label: "Noble", outfit: "noble",
    patience: 40, pay: 16, tip: 8, trust: 0, walkoutHeat: 1, favourite: "wine", stay: 1.2, lightweight: 1.2, fussy: 2.5, fame: 3,
    leanings: { scheming: 12, happy: 6, lust: 6, angry: 6 }, lustCeiling: 5, desireCeiling: 9, nerve: 2,
    fight: { stamina: 10, attack: 2, accuracy: 0.45 },
    partner: { resist: 1.25, skill: 1, stamina: 20 }, prefers: "mouth", load: 7,
  },
  servant: {
    kind: "noble", label: "Servant", outfit: "servant",
    patience: 70, pay: 3, tip: 2, trust: 1, walkoutHeat: 0, favourite: "mead", stay: 0.8, lightweight: 1.1, fussy: 1.5, fame: 0,
    leanings: { gloomy: 14, scared: 10, happy: 8 }, lustCeiling: 3, desireCeiling: 9, nerve: 0,
    fight: { stamina: 12, attack: 2, accuracy: 0.5 },
    partner: { resist: 1.1, skill: 0.9, stamina: 22 }, prefers: "hands", load: 8,
  },
};

/** Every group, in the order they came to Tarven. */
export const GUEST_KIND_LIST: readonly GuestKind[] = ["farmer", "smuggler", "soldier", "fugitive", "adventurer", "bandit", "noble"];

/** The types in each group, in the order a party of them comes through the door. */
export const ROLES_OF: Record<GuestKind, readonly GuestRole[]> = {
  farmer: ["farmer"],
  smuggler: ["smuggler"],
  soldier: ["soldier"],
  fugitive: ["fugitive"],
  adventurer: ["archer", "warrior", "mage", "cleric"],
  bandit: ["rogue", "brute"],
  noble: ["noble", "servant"],
};

/** The type a group's guest is when nothing says otherwise: the first of its roster. */
export function defaultRole(kind: GuestKind): GuestRole {
  return ROLES_OF[kind][0];
}

/** The numbers for someone, by their type, or their group's first type when it isn't known. */
export function statsOf(kind: GuestKind, role?: GuestRole): RoleStats {
  return ROLES[role && ROLES[role].kind === kind ? role : defaultRole(kind)];
}

/**
 * How far one guest's numbers can stray from their type's, either way. Like an enemy in a fight, no two of a
 * type are quite the same: one warrior has a deeper purse, another a shorter fuse. Shares are a part of the
 * type's number (0.2 is up to 20% more or less); `add` is a flat amount.
 */
const SPREAD = {
  patience: 0.2,
  pay: 0.25,
  tip: { add: 1 },
  stay: 0.15,
  lightweight: 0.25,
  fussy: 0.2,
  lustCeiling: { add: 1 },
  desireCeiling: { add: 1 },
  nerve: { add: 1 },
  fightStamina: 0.2,
  fightAttack: { add: 1 },
  fightAccuracy: { add: 0.08 },
  partner: 0.1,
  load: 0.2,
} as const;

/**
 * One guest's own numbers: their type's, each rolled somewhere in its range. Counts stay whole, nothing goes
 * below zero, and ceilings and odds stay in their bounds. What they wear, drink and go for stays their type's.
 */
export function rollStats(role: GuestRole, random: () => number): RoleStats {
  const base = ROLES[role];
  const either = () => random() * 2 - 1;
  const share = (n: number, spread: number, min = 0) => Math.max(min, n * (1 + either() * spread));
  const whole = (n: number, add: number, min = 0, max = Infinity) => Math.min(max, Math.max(min, Math.round(n + either() * add)));
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    ...base,
    patience: Math.round(share(base.patience, SPREAD.patience, 10)),
    pay: Math.max(1, Math.round(share(base.pay, SPREAD.pay))),
    tip: whole(base.tip, SPREAD.tip.add),
    stay: round2(share(base.stay, SPREAD.stay, 0.5)),
    lightweight: round2(share(base.lightweight, SPREAD.lightweight)),
    fussy: round2(share(base.fussy, SPREAD.fussy)),
    lustCeiling: whole(base.lustCeiling, SPREAD.lustCeiling.add, 0, 10),
    desireCeiling: whole(base.desireCeiling, SPREAD.desireCeiling.add, 0, 10),
    nerve: whole(base.nerve, SPREAD.nerve.add, 0, 10),
    fight: {
      stamina: Math.round(share(base.fight.stamina, SPREAD.fightStamina, 6)),
      attack: whole(base.fight.attack, SPREAD.fightAttack.add, 1),
      accuracy: round2(Math.min(0.95, Math.max(0.3, base.fight.accuracy + either() * SPREAD.fightAccuracy.add))),
    },
    partner: {
      resist: round2(share(base.partner.resist, SPREAD.partner, 0.5)),
      skill: round2(share(base.partner.skill, SPREAD.partner, 0.5)),
      stamina: Math.round(share(base.partner.stamina, SPREAD.partner, 10)),
    },
    load: Math.max(1, Math.round(share(base.load, SPREAD.load))),
  };
}

/** Which body a guest has: every other guest through the door is a woman. The scene and the rules both go by it. */
export function guestFemale(id: number): boolean {
  return id % 2 === 0;
}

/** What a servant is called on each body: a maid on hers, a footman on his. Everyone else goes by their type. */
export function roleLabel(role: GuestRole, female?: boolean): string {
  if (role === "servant" && female !== undefined) return female ? "Maid" : "Footman";
  return ROLES[role].label;
}
