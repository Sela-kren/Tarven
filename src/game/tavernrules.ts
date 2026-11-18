/**
 * The edict tree, Karryn's Prison's edicts for a tavern (PASSIVES_DESIGN.md, section 6): rules she enacts at the
 * house plans by day. Each one costs edict points (she earns them each morning, `EDICT_POINTS_PER_DAY`) and gold,
 * and may cost corruption once. Enacted, it's for good. Each sits on a branch at a tier and needs the edicts
 * above it (`requires`, any one of them); some are either/or with another (`excludes`), and taking one locks the
 * other out for good.
 *
 * The staff branch opens more posts to put staff on (`posts`) and changes how they take the work (`staff`).
 *
 * Not the Lantern's "house rules" (lantern.ts), which are about the girls upstairs and stay switchable.
 */
import type { Effects } from "./passives";
import type { StaffJob } from "./staff";

export type EdictBranch = "service" | "staff" | "conduct" | "order" | "house";

/** The branches, left to right on the plans. */
export const EDICT_BRANCHES: readonly { id: EdictBranch; name: string }[] = [
  { id: "service", name: "Service & Trade" },
  { id: "staff", name: "Staff & Posts" },
  { id: "conduct", name: "Her Conduct" },
  { id: "order", name: "Order & Law" },
  { id: "house", name: "The House" },
];

export type TavernRuleId =
  // Service & Trade
  | "dailySpecials" | "waterAle" | "honestMeasures" | "tabSlate" | "bottleService" | "happyHour" | "marketContracts"
  // Staff & Posts
  | "staffMeals" | "secondBar" | "crossTraining" | "kitchenHand" | "doorWatch" | "barStage" | "sharedTips" | "houseTips"
  // Her Conduct
  | "shorterApron" | "handsOff" | "backRoom" | "smilePolicy" | "lowNeckline" | "lapSeats" | "ironComposure"
  | "seeNoEvil" | "hearNoEvil" | "speakNoEvil"
  // Order & Law
  | "bouncer" | "sergeant" | "weaponRack" | "nightPatrol" | "informants" | "sanctuary" | "cudgelDrills" | "foulMouths"
  // The House
  | "freshRushes" | "betterLamps" | "warmHearth" | "noticeBoard" | "feedCorner"
  // The House: what the board says about her (KP's Publish edicts, lewdtalk.ts)
  | "postedProfile" | "postedFirsts" | "postedWeakSpots" | "postedRecords";

export interface TavernRuleDef {
  id: TavernRuleId;
  name: string;
  branch: EdictBranch;
  /** Its row on the branch, from 1 at the top. */
  tier: number;
  /** Edicts it grows from: it can be enacted once any one of them is. */
  requires?: readonly TavernRuleId[];
  /** Either/or: enacting one locks the other out. Listed on both sides. */
  excludes?: readonly TavernRuleId[];
  /** Edict points to enact it. */
  points: number;
  /** Gold to enact it. */
  cost: number;
  /** Corruption added once, when it's enacted. */
  corruption?: number;
  /** Lewd points toward her lewdness, for good. */
  lewd?: number;
  /** More posts for staff to work, by job. */
  posts?: Partial<Record<StaffJob, number>>;
  /** How it changes her staff's nights: loyalty each night they work, and no grudge working another job's post. */
  staff?: { loyalty?: number; crossTrained?: boolean };
  /** What it does, and what it costs. */
  does: string;
  costs?: string;
  effect?: (e: Effects) => void;
}

/** Edict points she starts with, and earns each morning (one more once the tavern's famous). */
export const EDICT_START_POINTS = 2;
export const EDICT_POINTS_PER_DAY = 1;
export const EDICT_FAME_BONUS_AT = 50;

export const TAVERN_RULES: readonly TavernRuleDef[] = [
  // ---------- Service & Trade ----------
  {
    id: "dailySpecials", name: "Daily Specials", branch: "service", tier: 1, points: 1, cost: 10,
    does: "The stew cooks 20% faster; guests wait 5% longer",
    effect: (e) => {
      e.cookSpeed += 0.2;
      e.patience += 0.05;
    },
  },
  {
    id: "waterAle", name: "Water the Ale", branch: "service", tier: 1, points: 1, cost: 0, corruption: 5,
    excludes: ["honestMeasures"],
    does: "+10% on everything you're paid",
    costs: "Guests wait 10% less; corruption +5",
    effect: (e) => {
      e.payPct += 0.1;
      e.patience -= 0.1;
    },
  },
  {
    id: "honestMeasures", name: "Honest Measures", branch: "service", tier: 1, points: 1, cost: 10,
    excludes: ["waterAle"],
    does: "+1 trust and +1 respect every night",
    costs: "Locks out Water the Ale",
    effect: (e) => {
      e.perNight.trust += 1;
      e.perNight.respect += 1;
    },
  },
  {
    id: "tabSlate", name: "Run a Tab", branch: "service", tier: 2, points: 1, cost: 20, requires: ["dailySpecials"],
    does: "+5% on everything you're paid; +1 trust every night",
    effect: (e) => {
      e.payPct += 0.05;
      e.perNight.trust += 1;
    },
  },
  {
    id: "bottleService", name: "Bottle Service", branch: "service", tier: 2, points: 1, cost: 25, requires: ["waterAle", "honestMeasures"],
    does: "Guests ask for a bottle 25% more often; +1 gold on every bottle",
    effect: (e) => {
      e.bottleAsk += 0.25;
      e.bottleGold += 1;
    },
  },
  {
    id: "happyHour", name: "Happy Hour", branch: "service", tier: 3, points: 2, cost: 30, requires: ["bottleService"],
    does: "Guests wait 15% longer",
    costs: "-5% on everything you're paid",
    effect: (e) => {
      e.patience += 0.15;
      e.payPct -= 0.05;
    },
  },
  {
    id: "marketContracts", name: "Market Contracts", branch: "service", tier: 3, points: 2, cost: 40, requires: ["tabSlate"],
    does: "+3 gold every night from selling bread and ale on to the market",
    effect: (e) => (e.perNight.gold += 3),
  },

  // ---------- Staff & Posts ----------
  {
    id: "staffMeals", name: "Staff Meals", branch: "staff", tier: 1, points: 1, cost: 10,
    staff: { loyalty: 1 },
    does: "Every one of your staff who works a night gains +1 loyalty",
    costs: "2 gold every night",
    effect: (e) => (e.perNight.gold -= 2),
  },
  {
    id: "secondBar", name: "Second Bar Post", branch: "staff", tier: 1, points: 1, cost: 20,
    posts: { barmaid: 1 },
    does: "One more post behind the bar: two staff can serve at once",
  },
  {
    id: "crossTraining", name: "Cross-Training", branch: "staff", tier: 2, points: 2, cost: 25, requires: ["staffMeals"],
    staff: { crossTrained: true },
    does: "Staff work any post without a grudge (otherwise -1 loyalty a night off their own job)",
  },
  {
    id: "kitchenHand", name: "Kitchen Hand", branch: "staff", tier: 2, points: 1, cost: 25, requires: ["secondBar"],
    posts: { cook: 1 },
    does: "One more post in the kitchen; the stew cooks 10% faster",
    effect: (e) => (e.cookSpeed += 0.1),
  },
  {
    id: "doorWatch", name: "Door Watch", branch: "staff", tier: 2, points: 1, cost: 25, requires: ["secondBar"],
    posts: { doorman: 1 },
    does: "One more post at the door: two can keep it",
  },
  {
    id: "barStage", name: "The Bar-Top Stage", branch: "staff", tier: 3, points: 2, cost: 40, requires: ["crossTraining", "doorWatch"],
    posts: { dancer: 1 },
    does: "A post on the bar top for a dancer; guests ask for a look 10% more often",
    effect: (e) => (e.showAsk += 0.1),
  },
  {
    id: "sharedTips", name: "Shared Tip Jar", branch: "staff", tier: 3, points: 1, cost: 15, requires: ["staffMeals"],
    excludes: ["houseTips"],
    staff: { loyalty: 2 },
    does: "Staff who work a night gain +2 loyalty",
    costs: "-1 gold on every tipped serve; locks out The House Takes the Tips",
    effect: (e) => (e.serveTip -= 1),
  },
  {
    id: "houseTips", name: "The House Takes the Tips", branch: "staff", tier: 3, points: 1, cost: 0, corruption: 5, requires: ["staffMeals"],
    excludes: ["sharedTips"],
    staff: { loyalty: -2 },
    does: "+1 gold on every tipped serve",
    costs: "Staff who work a night lose 2 loyalty; corruption +5; locks out the Shared Tip Jar",
    effect: (e) => (e.serveTip += 1),
  },

  // ---------- Her Conduct ----------
  {
    id: "shorterApron", name: "Shorter Apron", branch: "conduct", tier: 1, points: 1, cost: 15, lewd: 5,
    excludes: ["handsOff"],
    does: "+1 gold on every tipped serve; guests ask for a look 25% more often",
    costs: "Guests reach for you 15% more often; lewdness +5; locks out Hands Off the Staff",
    effect: (e) => {
      e.serveTip += 1;
      e.showAsk += 0.25;
      e.reach += 0.15;
    },
  },
  {
    id: "handsOff", name: "Hands Off the Staff", branch: "conduct", tier: 1, points: 1, cost: 10,
    excludes: ["shorterApron"],
    does: "Guests reach for you 30% less and grab you 30% less; +1 respect every night",
    costs: "-1 gold on every tipped serve; locks out the Shorter Apron",
    effect: (e) => {
      e.reach -= 0.3;
      e.grab -= 0.3;
      e.perNight.respect += 1;
      e.serveTip -= 1;
    },
  },
  {
    id: "backRoom", name: "The Back Room", branch: "conduct", tier: 2, points: 2, cost: 30, corruption: 5, requires: ["shorterApron"],
    does: "Guests can have you on a table a drink sooner (tipsy, not drunk), and once you've come one time fewer",
    costs: "Corruption +5",
    effect: (e) => (e.tableEase += 1),
  },
  {
    id: "lowNeckline", name: "Low Neckline", branch: "conduct", tier: 2, points: 1, cost: 15, lewd: 5, requires: ["shorterApron"],
    does: "Guests ask for a look 15% more often; +1 gold for every look",
    costs: "Lewdness +5",
    effect: (e) => {
      e.showAsk += 0.15;
      e.showGold += 1;
    },
  },
  {
    id: "smilePolicy", name: "Service with a Smile", branch: "conduct", tier: 2, points: 1, cost: 15, requires: ["handsOff"],
    does: "Guests wait 10% longer; +1 respect every night",
    effect: (e) => {
      e.patience += 0.1;
      e.perNight.respect += 1;
    },
  },
  {
    id: "lapSeats", name: "Lap Seats", branch: "conduct", tier: 3, points: 2, cost: 25, corruption: 5, lewd: 5, requires: ["backRoom", "lowNeckline"],
    does: "Guests grab you 20% more often, and you get +2 gold each time you let one hold you",
    costs: "Corruption +5; lewdness +5",
    effect: (e) => {
      e.grab += 0.2;
      e.grabGold += 2;
    },
  },
  {
    id: "ironComposure", name: "Iron Composure", branch: "conduct", tier: 3, points: 2, cost: 20, requires: ["smilePolicy"],
    does: "Saying no costs you 15% less willpower; guests reach for you 10% less",
    effect: (e) => {
      e.refuseEase += 0.15;
      e.reach -= 0.1;
    },
  },

  // KP's See, Hear and Speak No Evil: willpower skills she learns for brawls (fight.ts), whichever way her conduct went.
  {
    id: "seeNoEvil", name: "See No Evil", branch: "conduct", tier: 2, points: 1, cost: 20, requires: ["shorterApron", "handsOff"],
    does: "In a brawl, a willpower skill: for two rounds, stares do 40% less to you (more with a sharper Mind)",
    effect: (e) => (e.talk.seeNoEvil = true),
  },
  {
    id: "hearNoEvil", name: "Hear No Evil", branch: "conduct", tier: 3, points: 1, cost: 20, requires: ["seeNoEvil"],
    does: "In a brawl, a willpower skill: for two rounds, lewd talk does 40% less to you (more with a sharper Mind)",
    effect: (e) => (e.talk.hearNoEvil = true),
  },
  {
    id: "speakNoEvil", name: "Speak No Evil", branch: "conduct", tier: 4, points: 2, cost: 60, requires: ["hearNoEvil"],
    does: "In a brawl, with See and Hear No Evil both up, a willpower skill that takes 5 or more off every desire",
    effect: (e) => (e.talk.speakNoEvil = true),
  },

  // ---------- Order & Law ----------
  {
    id: "bouncer", name: "Hire a Bouncer", branch: "order", tier: 1, points: 1, cost: 20,
    does: "Trouble starts 40% less often",
    costs: "4 gold every night",
    effect: (e) => {
      e.trouble += 0.4;
      e.perNight.gold -= 4;
    },
  },
  {
    id: "sergeant", name: "Pay the Baron's Sergeant", branch: "order", tier: 1, points: 1, cost: 10, corruption: 10,
    does: "-1 heat every night",
    costs: "3 gold every night; corruption +10",
    effect: (e) => {
      e.perNight.heat -= 1;
      e.perNight.gold -= 3;
    },
  },
  {
    id: "foulMouths", name: "No Foul Mouths", branch: "order", tier: 2, points: 1, cost: 15, requires: ["bouncer"],
    excludes: ["postedWeakSpots"],
    does: "The bouncer has a word with anyone talking filth at you: lewd talk does 15% less to you; +1 respect every night",
    costs: "-1 gold on every tipped serve; locks out Her Weak Spots Posted",
    effect: (e) => {
      e.talk.rate -= 0.15;
      e.perNight.respect += 1;
      e.serveTip -= 1;
    },
  },
  {
    id: "weaponRack", name: "Weapons at the Door", branch: "order", tier: 2, points: 1, cost: 15, requires: ["bouncer"],
    does: "Trouble starts 20% less often; every guest has a little less nerve",
    effect: (e) => {
      e.trouble += 0.2;
      e.nerve -= 1;
    },
  },
  {
    id: "nightPatrol", name: "Night Patrol", branch: "order", tier: 2, points: 1, cost: 20, requires: ["sergeant"],
    does: "-1 heat every night",
    costs: "2 gold every night",
    effect: (e) => {
      e.perNight.heat -= 1;
      e.perNight.gold -= 2;
    },
  },
  {
    id: "cudgelDrills", name: "Cudgel Drills", branch: "order", tier: 3, points: 2, cost: 25, requires: ["weaponRack"],
    does: "In a fight: +2 damage and 5% more chance to dodge",
    effect: (e) => {
      e.fightDamage += 2;
      e.fightDodge += 0.05;
    },
  },
  {
    id: "informants", name: "Informants", branch: "order", tier: 3, points: 2, cost: 20, corruption: 10, requires: ["nightPatrol", "weaponRack"],
    excludes: ["sanctuary"],
    does: "+3 gold for every secret you sell",
    costs: "-1 trust every night; corruption +10; locks out Sanctuary",
    effect: (e) => {
      e.secretGold += 3;
      e.perNight.trust -= 1;
    },
  },
  {
    id: "sanctuary", name: "Sanctuary", branch: "order", tier: 3, points: 2, cost: 20, requires: ["nightPatrol", "weaponRack"],
    excludes: ["informants"],
    does: "+2 trust and +1 respect every night: what's said here stays here",
    costs: "Locks out Informants",
    effect: (e) => {
      e.perNight.trust += 2;
      e.perNight.respect += 1;
    },
  },

  // ---------- The House ----------
  {
    id: "freshRushes", name: "Fresh Rushes", branch: "house", tier: 1, points: 1, cost: 10,
    does: "A messy room wears on guests 25% less",
    effect: (e) => (e.tidy += 0.25),
  },
  {
    id: "betterLamps", name: "Better Lamps", branch: "house", tier: 1, points: 1, cost: 15,
    does: "Guests wait 5% longer; you're 10% steadier with a hand on you",
    effect: (e) => {
      e.patience += 0.05;
      e.steady += 0.1;
    },
  },
  {
    id: "warmHearth", name: "A Warm Hearth", branch: "house", tier: 2, points: 1, cost: 25, requires: ["betterLamps"],
    does: "Guests wait 10% longer; +1 trust every night",
    costs: "1 gold every night for firewood",
    effect: (e) => {
      e.patience += 0.1;
      e.perNight.trust += 1;
      e.perNight.gold -= 1;
    },
  },
  {
    id: "noticeBoard", name: "Notice Board", branch: "house", tier: 2, points: 1, cost: 15, requires: ["freshRushes"],
    does: "+1 trust every night; +2 gold for every secret you sell",
    effect: (e) => {
      e.perNight.trust += 1;
      e.secretGold += 2;
    },
  },
  {
    id: "feedCorner", name: "The Feed Corner", branch: "house", tier: 3, points: 2, cost: 30, requires: ["warmHearth", "noticeBoard"],
    does: "A well-lit corner for photos: +20% likes on every post",
    effect: (e) => (e.feedLikes += 0.2),
  },

  // What the board says about her: Karryn's Prison's Publish edicts. What the room knows, they talk about (lewdtalk.ts).
  {
    id: "postedProfile", name: "Her Name on the Board", branch: "house", tier: 3, points: 1, cost: 10, lewd: 2, requires: ["noticeBoard"],
    does: "Travellers come to see the innkeeper: guests ask for a look 10% more often",
    costs: "When they talk lewd at you, they talk as if your fame were 15 higher (what they've heard); lewdness +2",
    effect: (e) => {
      e.showAsk += 0.1;
      e.talk.known += 15;
    },
  },
  {
    id: "postedFirsts", name: "What She's Never Done", branch: "house", tier: 4, points: 1, cost: 0, lewd: 3, requires: ["postedProfile"],
    does: "+1 gold on every tipped serve: they tip the girl who's never",
    costs: "Talk about anything you've never done is about being your first, however lewd you are; guests reach for you 10% more (they all want to be first); lewdness +3",
    effect: (e) => {
      e.serveTip += 1;
      e.talk.firsts = true;
      e.reach += 0.1;
    },
  },
  {
    id: "postedWeakSpots", name: "Her Weak Spots Posted", branch: "house", tier: 4, points: 1, cost: 0, corruption: 5, lewd: 5, requires: ["postedProfile"],
    excludes: ["foulMouths"],
    does: "+2 gold on every tipped serve",
    costs: "Half the time lewd talk goes for the part you're most sensitive in, and it does 10% more to you; corruption +5; lewdness +5; locks out No Foul Mouths",
    effect: (e) => {
      e.serveTip += 2;
      e.talk.aim = true;
      e.talk.rate += 0.1;
    },
  },
  {
    id: "postedRecords", name: "The Tally Board", branch: "house", tier: 5, points: 2, cost: 0, corruption: 5, lewd: 8, requires: ["postedFirsts", "postedWeakSpots"],
    does: "Every man, every load, chalked up for the room to read: +10% pay on everything",
    costs: "They talk as if your fame were 15 higher again; lewd talk does 5% more; guests reach for you 10% more; corruption +5; lewdness +8",
    effect: (e) => {
      e.payPct += 0.1;
      e.talk.known += 15;
      e.talk.rate += 0.05;
      e.reach += 0.1;
    },
  },
];

export const TAVERN_RULE_BY_ID: ReadonlyMap<string, TavernRuleDef> = new Map(TAVERN_RULES.map((r) => [r.id, r]));

/** Where an edict stands for her: enacted, can be enacted now, waiting on the one above it, or locked out. */
export type EdictState = "enacted" | "open" | "needs" | "excluded";

export function edictState(def: TavernRuleDef, enacted: ReadonlySet<string>): EdictState {
  if (enacted.has(def.id)) return "enacted";
  if (def.excludes?.some((id) => enacted.has(id))) return "excluded";
  if (def.requires && !def.requires.some((id) => enacted.has(id))) return "needs";
  return "open";
}

/** Extra staff posts her edicts open, by job. */
export function edictPosts(enacted: ReadonlySet<string>): Partial<Record<StaffJob, number>> {
  const out: Partial<Record<StaffJob, number>> = {};
  for (const id of enacted) {
    for (const [job, n] of Object.entries(TAVERN_RULE_BY_ID.get(id)?.posts ?? {}) as [StaffJob, number][]) {
      out[job] = (out[job] ?? 0) + n;
    }
  }
  return out;
}

/** How her edicts change her staff's nights: loyalty for each who works, and whether any post is theirs to work. */
export function edictStaff(enacted: ReadonlySet<string>): { loyalty: number; crossTrained: boolean } {
  let loyalty = 0;
  let crossTrained = false;
  for (const id of enacted) {
    const staff = TAVERN_RULE_BY_ID.get(id)?.staff;
    loyalty += staff?.loyalty ?? 0;
    crossTrained ||= staff?.crossTrained === true;
  }
  return { loyalty, crossTrained };
}
