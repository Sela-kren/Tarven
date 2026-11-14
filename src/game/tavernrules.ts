/**
 * Tavern rules, Karryn's Prison's edicts for a tavern (PASSIVES_DESIGN.md, section 6): rules she sets at the house
 * plans by day. Each costs gold to adopt the first time (and may cost corruption then, once); after that it's hers
 * to switch on or off any day. While it's on it does something, and some cost her every night (upkeep, respect).
 *
 * Not the Lantern's "house rules" (lantern.ts), which are about the girls upstairs.
 */
import type { Effects } from "./passives";

export type TavernRuleId = "shorterApron" | "backRoom" | "waterAle" | "sergeant" | "handsOff" | "bouncer";

export interface TavernRuleDef {
  id: TavernRuleId;
  name: string;
  /** Gold to adopt it, the first time. */
  cost: number;
  /** Corruption added once, the first time it's adopted. */
  corruption?: number;
  /** Lewd points toward her lewdness, while it's on. */
  lewd?: number;
  /** What it does while it's on, and what it costs. */
  does: string;
  costs?: string;
  effect: (e: Effects) => void;
}

export const TAVERN_RULES: readonly TavernRuleDef[] = [
  {
    id: "shorterApron",
    name: "Shorter Apron",
    cost: 15,
    lewd: 5,
    does: "+1 gold on every tipped serve; guests ask for a look 25% more often",
    costs: "Guests reach for you 15% more often; lewdness +5 while it's on",
    effect: (e) => {
      e.serveTip += 1;
      e.showAsk += 0.25;
      e.reach += 0.15;
    },
  },
  {
    id: "backRoom",
    name: "The Back Room",
    cost: 30,
    corruption: 5,
    does: "Your adult play stack starts every night 20% fuller",
    costs: "Corruption +5 when you open it",
    effect: (e) => (e.stackStart += 20),
  },
  {
    id: "waterAle",
    name: "Water the Ale",
    cost: 0,
    corruption: 5,
    does: "+10% on everything you're paid",
    costs: "Guests wait 10% less; corruption +5 the first time",
    effect: (e) => {
      e.payPct += 0.1;
      e.patience -= 0.1;
    },
  },
  {
    id: "sergeant",
    name: "Pay the Baron's Sergeant",
    cost: 10,
    corruption: 10,
    does: "-1 heat every night",
    costs: "3 gold every night; corruption +10 the first time",
    effect: (e) => {
      e.perNight.heat -= 1;
      e.perNight.gold -= 3;
    },
  },
  {
    id: "handsOff",
    name: "Hands Off the Staff",
    cost: 10,
    does: "Guests reach for you 30% less and grab you 30% less; +1 respect every night",
    costs: "-1 gold on every tipped serve",
    effect: (e) => {
      e.reach -= 0.3;
      e.grab -= 0.3;
      e.perNight.respect += 1;
      e.serveTip -= 1;
    },
  },
  {
    id: "bouncer",
    name: "Hire a Bouncer",
    cost: 20,
    does: "Trouble starts 40% less often",
    costs: "4 gold every night",
    effect: (e) => {
      e.trouble += 0.4;
      e.perNight.gold -= 4;
    },
  },
];

export const TAVERN_RULE_BY_ID: ReadonlyMap<string, TavernRuleDef> = new Map(TAVERN_RULES.map((r) => [r.id, r]));
