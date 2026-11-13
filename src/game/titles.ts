/**
 * Titles, Karryn's Prison style: each one earned by something she's done, with a bonus the moment it's earned and an
 * effect for as long as she wears it. She wears one at a time, two once her fame reaches TWO_SLOTS_FAME, and
 * changes them in the journal while the tavern's shut. Like passives, every title does something, and every one
 * can be earned in play (tests/titles.test.ts checks both).
 */
import type { Effects, PassiveFacts } from "./passives";

/** What she gets once, the moment a title is earned. */
export interface TitleBonus {
  gold?: number;
  respect?: number;
  fame?: number;
  trust?: number;
}

export interface TitleDef {
  id: string;
  name: string;
  /** What earns it, in words, and how far along she is: [have, need]. */
  need: string;
  progress: (f: PassiveFacts) => [number, number];
  also?: (f: PassiveFacts) => boolean;
  bonus: TitleBonus;
  /** While she wears it: what it does, and what it costs. */
  worn: string;
  cost?: string;
  wear: (e: Effects) => void;
}

/** Fame that opens a second title slot. */
export const TWO_SLOTS_FAME = 50;
/** The title every innkeeper starts with, worn from the first night. */
export const START_TITLE = "innkeeper";

const count = (n: number, need: number): [number, number] => [Math.min(Math.max(0, n), need), need];
const subSide = (f: PassiveFacts) => f.records.rough + f.records.subWins;
const domSide = (f: PassiveFacts) => f.records.slapped + f.records.domWins;
const EVERY_TOUCH = ["hand", "face", "hair", "shoulder", "waist", "rear", "chest", "lap", "lips", "neck", "thigh", "clothes", "intimate"] as const;

export const TITLES: readonly TitleDef[] = [
  {
    id: START_TITLE,
    name: "Innkeeper of Tarven",
    need: "Take over Grandma's tavern",
    progress: () => [1, 1],
    bonus: {},
    worn: "Guests wait 5% longer",
    wear: (e) => (e.patience += 0.05),
  },
  {
    id: "barmaid",
    name: "Barmaid of the Pass",
    need: "Serve 200 orders",
    progress: (f) => count(f.records.served, 200),
    bonus: { gold: 10 },
    worn: "+10% on everything you're paid",
    wear: (e) => (e.payPct += 0.1),
  },
  {
    id: "hearthKeeper",
    name: "Keeper of the Hearth",
    need: "Cook 20 pots of stew and clean up 60 messes",
    progress: (f) => count(f.records.stewsCooked, 20),
    also: (f) => f.records.messesCleaned >= 60,
    bonus: { trust: 1 },
    worn: "The stew cooks 20% faster; a messy room wears on guests 30% less",
    wear: (e) => {
      e.cookSpeed += 0.2;
      e.tidy += 0.3;
    },
  },
  {
    id: "untouchable",
    name: "The Untouchable",
    need: "Pull away from or slap 50 guests",
    progress: (f) => count(f.records.pulled + f.records.slapped, 50),
    bonus: { respect: 2 },
    worn: "Guests reach for you half as often; your hold is 2 stronger (Consent off)",
    cost: "Every desire fills 20% slower",
    wear: (e) => {
      e.reach -= 0.5;
      e.hold += 2;
      for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) e.sens[m] -= 0.2;
    },
  },
  {
    id: "ironHand",
    name: "The Iron Hand",
    need: "Slap or face them down 20 more times than you get rough or give in",
    progress: (f) => count(domSide(f) - subSide(f), 20),
    bonus: { fame: 3 },
    worn: "A slapped guest won't reach for you again that night; +1 respect a slap; your hold is 1 stronger",
    cost: "Guests reach for you 20% less (fewer touch tips)",
    wear: (e) => {
      e.slapStops = true;
      e.slapRespect += 1;
      e.hold += 1;
      e.reach -= 0.2;
    },
  },
  {
    id: "everyonesDarling",
    name: "Everyone's Darling",
    need: "Get rough or give in 20 more times than you slap or face them down, with lewdness 20 or more",
    progress: (f) => count(subSide(f) - domSide(f), 20),
    also: (f) => f.lewdness >= 20,
    bonus: { gold: 10 },
    worn: "Every touch you allow pays +2 gold; pleasure builds 20% faster",
    cost: "Your hold is 2 weaker (Consent off); guests are bolder (+1 nerve)",
    wear: (e) => {
      for (const r of EVERY_TOUCH) e.touchGold[r] = (e.touchGold[r] ?? 0) + 2;
      e.pleasure += 0.2;
      e.hold -= 2;
      e.nerve += 1;
    },
  },
  {
    id: "unashamed",
    name: "Unashamed",
    need: "Reach Slut Level 8",
    progress: (f) => count(f.slutLevel, 8),
    bonus: { fame: 5 },
    worn: "+20% on everything you're paid; +2 gold a serve while you've lost a piece",
    cost: "-2 respect every night",
    wear: (e) => {
      e.payPct += 0.2;
      e.strippedGold += 2;
      e.perNight.respect -= 2;
    },
  },
  {
    id: "baronsCreature",
    name: "The Baron's Creature",
    need: "Reach corruption 80",
    progress: (f) => count(Math.floor(f.corruption), 80),
    bonus: { gold: 20 },
    worn: "-1 heat every night",
    cost: "-1 trust every night",
    wear: (e) => {
      e.perNight.heat -= 1;
      e.perNight.trust -= 1;
    },
  },
  {
    id: "prideOfTarven",
    name: "Pride of Tarven",
    need: "Win the village's trust all the way",
    progress: (f) => count(f.trust, f.trustMax),
    bonus: { trust: 2 },
    worn: "+1 trust every night",
    wear: (e) => (e.perNight.trust += 1),
  },
  {
    id: "drinksThemUnder",
    name: "Drinks Them Under",
    need: "Drink with guests 100 times",
    progress: (f) => count(f.drinks, 100),
    bonus: { fame: 2 },
    worn: "Drink gets to you half as fast",
    wear: (e) => (e.drunkRate += 0.5),
  },
  {
    id: "brawlQueen",
    name: "Queen of the Brawl",
    need: "Win 15 brawls",
    progress: (f) => count(f.records.fightsWon, 15),
    bonus: { fame: 3 },
    worn: "Your blows hit 2 harder; you dodge 10% more",
    cost: "Trouble starts 20% more often",
    wear: (e) => {
      e.fightDamage += 2;
      e.fightDodge += 0.1;
      e.trouble -= 0.2;
    },
  },
  {
    id: "nightChampion",
    name: "Champion of the Night",
    need: "Win 10 after-hours games",
    progress: (f) => count(f.records.duelsWon, 10),
    bonus: { gold: 20 },
    worn: "Your moves land 20% harder After Hours; a win pays 25% more",
    wear: (e) => {
      e.duelPower += 0.2;
      e.duelGold += 0.25;
    },
  },
  {
    id: "seasoned",
    name: "Seasoned Keeper",
    need: "Reach Level 5",
    progress: (f) => count(f.herLevel, 5),
    bonus: { respect: 1 },
    worn: "+10 willpower; guests wait 5% longer",
    wear: (e) => {
      e.willMax += 10;
      e.patience += 0.05;
    },
  },
];

export const TITLE_BY_ID: ReadonlyMap<string, TitleDef> = new Map(TITLES.map((t) => [t.id, t]));

/** Whether she's earned a title. */
export function titleEarned(def: TitleDef, f: PassiveFacts): boolean {
  const [have, need] = def.progress(f);
  return have >= need && (def.also?.(f) ?? true);
}

/** The bonus for earning a title, in words. */
export function bonusText(bonus: TitleBonus): string {
  const parts = [
    bonus.gold ? `+${bonus.gold} gold` : "",
    bonus.respect ? `+${bonus.respect} respect` : "",
    bonus.fame ? `+${bonus.fame} fame` : "",
    bonus.trust ? `+${bonus.trust} trust` : "",
  ].filter(Boolean);
  return parts.join(", ");
}
