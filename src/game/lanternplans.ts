/**
 * The Lantern on the house plans (the desk in her room, by day): hanging the lantern, furnishing the room
 * upstairs, lighting it or leaving it dark tonight, the house rules, and how her girls are doing. The rules
 * themselves are in lantern.ts; this only lays them out as rows for the build bar.
 */
import type { Supply } from "./buildmode";
import { girlLewdness, HOUSE_RULES, LANTERN_COST, ROOM_COST, RULE_TEXT, tierOf } from "./lantern";
import { REVEL_HALL_COST, type Tavern } from "./tavern";

const GROUP = "The Lantern";

/** Nothing shows until the brothel is open to her; then the lantern, and once it's hung, the rest. */
export function lanternSupplies(tavern: Tavern): Supply[] {
  const { lantern } = tavern;
  if (!tavern.houseMode.unlocked.has("brothel")) return [];
  const day = tavern.phase === "day";
  const rows: Supply[] = [
    {
      name: "The lantern",
      icon: "lantern",
      group: GROUP,
      price: LANTERN_COST,
      detail:
        "A red lantern for the window. Once it's hung you choose, each day, whether the house is open for company tonight. A girl will come asking for work.",
      owned: lantern.hung,
      canBuy: tavern.canHangLantern(),
      buy: () => tavern.hangLantern(),
    },
  ];
  if (!lantern.hung) return rows;
  rows.push(
    {
      name: "Upstairs room (plain)",
      icon: "bed",
      group: GROUP,
      price: ROOM_COST,
      detail: "A bed, a washstand and a lock on the door. One booking at a time.",
      owned: lantern.room,
      canBuy: tavern.canFurnishRoom(),
      buy: () => tavern.furnishRoom(),
    },
    {
      name: lantern.lit ? "Lantern lit tonight" : "Lantern dark tonight",
      icon: "lantern",
      group: GROUP,
      detail: lantern.lit
        ? "Tonight is a Lantern night: soldiers, smugglers and adventurers come, farmers stay away, and guests can book the room. Respect slips and heat rises a little. Click to leave it dark."
        : "Tonight is a plain tavern night. Click to light the lantern.",
      owned: lantern.lit,
      canBuy: day,
      buy: () => tavern.setLanternLit(!lantern.lit),
    },
    ...HOUSE_RULES.map((rule): Supply => {
      const text = RULE_TEXT[rule];
      const choice = lantern.rules[rule];
      return {
        name: `${text.name}: ${text[choice]}`,
        icon: "rule",
        group: "House rules",
        tab: "edicts",
        detail: `${text.detail} Click to change it.`,
        owned: false,
        canBuy: day,
        buy: () => tavern.setHouseRule(rule, choice === "fair" ? "greedy" : "fair"),
      };
    }),
    // Each girl, so the madam can see how she is. Picking her changes nothing.
    ...lantern.girls.map(
      (girl): Supply => ({
        name: girl.quit ? `${girl.name} (gone)` : `${girl.name}, ${girl.age}`,
        icon: "heart",
        group: "Girls",
        tab: "staff",
        detail: girl.quit
          ? `${girl.name} left the house.`
          : `${girl.about} Appeal ${girl.appeal}, charm ${girl.charm}, stamina ${girl.stamina - Math.min(girl.stamina, girl.fatigue)}/${girl.stamina}, loyalty ${Math.round(girl.loyalty)}, resolve ${girl.resolve}. Best with ${girl.knack}s. ${tierOf(girl.corruption)}, lewdness ${girlLewdness(girl)} (${lantern.stageOf(girl)}).${girl.ill > 0 ? " Ill: resting." : ""} She can turn down any guest.`,
        owned: false,
        canBuy: !girl.quit,
        buy: () => {},
      }),
    ),
  );
  return rows;
}

/**
 * The Revel Hall (revel.ts, REVEL_HOUSE.md): hidden till Act 3, then shown, greyed out with what she still needs
 * (lewd or corrupt enough, the table scenes) till she's ready to build it, then tonight's switch once a revel's open.
 */
export function revelSupplies(tavern: Tavern): Supply[] {
  if (!tavern.revelShown) return [];
  const about =
    "Cushions, drapes and the big table: on the nights you choose, the taproom becomes the pass's revel house (18+). Set the night up from Settings, Revel nights.";
  // Before she's ready, the tile says what's still missing (all but the Hall itself, which this tile builds).
  const missing = tavern.revelReady ? [] : tavern.revelMissing().filter((m) => !m.startsWith("the Revel Hall"));
  const rows: Supply[] = [
    {
      name: "The Revel Hall",
      icon: "cushions",
      group: "The Revel Hall",
      price: REVEL_HALL_COST,
      detail: tavern.revelHall || missing.length === 0 ? about : `${about} Still needed: ${missing.join("; ")}.`,
      owned: tavern.revelHall,
      canBuy: tavern.canBuildRevelHall,
      buy: () => tavern.buildRevelHall(),
    },
  ];
  if (tavern.revelHall && (tavern.revelOpen || tavern.revelTonight)) {
    rows.push({
      name: tavern.revelTonight ? "Revel tonight" : "No revel tonight",
      icon: "heart",
      group: "The Revel Hall",
      detail: tavern.revelTonight ? "Tonight the hall opens as the tavern shuts. Click to call it off." : "Click to make tonight a revel night.",
      owned: tavern.revelTonight,
      canBuy: tavern.phase === "day",
      buy: () => tavern.setRevelTonight(!tavern.revelTonight),
    });
  }
  return rows;
}
