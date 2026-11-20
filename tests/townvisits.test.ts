import { describe, expect, it } from "vitest";
import { newRecruits } from "../src/game/recruits";
import { newCareers } from "../src/game/careers";
import { ODEN_ROUTE, TOWN_PLACES, type TownState } from "../src/game/townplaces";
import { DIRTY, FAIR, RIVAL_PLANS, rivalActions, standing } from "../src/game/rivalvisits";
import { HOUSES } from "../src/game/ledger";
import { readProgress } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const base: TownState = {
  arc: "sheltered", corruption: 0, fame: 0, respect: 0, flirt: 0, heat: 0, trust: 0, fatigueLevel: 0,
  flags: new Set(), houses: {}, fans: 0, nights: 0, done: {}, recruits: newRecruits(), careers: newCareers(),
};

function day(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 100;
  return t;
}

/** Talks to Oden, a new day each time (each thing in town is once a day). */
function talk(t: Tavern): string {
  t.townDoneToday.clear();
  return t.doTownAction("chapel", "oden")!.line;
}

describe("Oden's route (TOWN_DAY.md step 4)", () => {
  it("moves on a step each talk, and waits for the salt night before the salt", () => {
    const t = day();
    expect(talk(t)).toContain("her chin");
    expect(talk(t)).toContain("red lantern");
    expect(t.records.town["oden:route"]).toBe(2);
    // The salt night hasn't been played yet: he talks about the day instead, and the route waits.
    talk(t);
    expect(t.records.town["oden:route"]).toBe(2);
    t.nightIndex = 1;
    expect(talk(t)).toContain("my floor");
    expect(t.records.town["oden:route"]).toBe(3);
    expect(t.records.town["chapel:oden"]).toBe(4);
  });

  it("speaks of the salt by what she did on the salt night", () => {
    const at = (flag?: "silasOwes" | "silasAngry") => ODEN_ROUTE[2].line({ ...base, nights: 1, flags: new Set(flag ? [flag] : []) });
    expect(at("silasOwes")).toContain("sent him to the quarry");
    expect(at("silasAngry")).toContain("sold what's under my floor");
    expect(at()).toContain("Silas keeps salt under it");
  });

  it("only hints at the night Wren died, and only late in the act", () => {
    const last = ODEN_ROUTE[ODEN_ROUTE.length - 1];
    expect(last.ready({ ...base, nights: 9, fans: 100 })).toBe(false);
    expect(last.ready({ ...base, nights: 9, fans: 250 })).toBe(true);
    expect(last.line(base)).toContain("Not yet");
  });

  it("goes cold once she's far gone, and doesn't move the route", () => {
    const t = day();
    t.corruption = 90;
    expect(talk(t)).toContain("never sold people");
    expect(t.records.town["oden:route"]).toBeUndefined();
  });

  it("is remembered in the save", () => {
    const t = day();
    talk(t);
    const restored = readProgress(JSON.parse(JSON.stringify({ corruption: 0, records: t.records, passives: [] })));
    expect(restored.records.town["oden:route"]).toBe(1);
    expect(restored.records.town["chapel:oden"]).toBe(1);
  });
});

describe("the rival houses by day (TOWN_DAY.md step 4)", () => {
  it("every house on the Ledger can be visited somewhere in town", () => {
    for (const house of HOUSES) {
      const place = TOWN_PLACES[RIVAL_PLANS[house.id].place];
      expect(place.actions.some((a) => a.id === `scout_${house.id}`), house.id).toBe(true);
      expect(place.actions.some((a) => a.id === `dirty_${house.id}`), house.id).toBe(true);
    }
  });

  it("scouting tells her how she stands against it", () => {
    expect(standing("cider", 40)).toContain("61 more and you pass it");
    expect(standing("cider", 120)).toContain("you've passed it");
    const t = day();
    t.fans = 40;
    expect(t.doTownAction("ciderbarn", "scout_cider")!.line).toContain("100 fans to your 40");
  });

  it("can't beat a house fairly before she's scouted it", () => {
    const t = day();
    expect(t.townBlocked("bakehouse", "fair_bakehouse", 8)).toBe("scout it first");
    t.doTownAction("bakehouse", "scout_bakehouse");
    expect(t.townBlocked("bakehouse", "fair_bakehouse", 8)).toBeNull();
    const before = t.errandFans;
    t.doTownAction("bakehouse", "fair_bakehouse");
    expect(t.errandFans - before).toBe(FAIR.fans);
  });

  it("dirty wins twice the fans, at a price", () => {
    const t = day();
    t.doTownAction("tollgate", "dirty_tollgate");
    expect(t.errandFans).toBe(DIRTY.fans);
    expect(t.corruption).toBe(DIRTY.corruption);
    expect(DIRTY.fans).toBe(FAIR.fans * 2);
  });

  it("the fight ends when the house falls: a partner pours her a drink, a ruined house is shut", () => {
    const fight = rivalActions("bakehouse");
    const shown = (s: TownState) => TOWN_PLACES.bakehouse.actions.filter((a) => !a.hidden?.(s)).map((a) => a.id);
    expect(fight.find((a) => a.id === "fair_bakehouse")!.locked!({ ...base, houses: { bakehouse: "partner" } })).toBe("you've already beaten it");
    const partner = { ...base, houses: { bakehouse: "partner" } };
    expect(fight.find((a) => a.id === "partner_bakehouse")!.locked!(partner)).toBeNull();
    const ruined = { ...base, houses: { bakehouse: "ruin" } };
    expect(shown(ruined)).toEqual([]);
    expect(TOWN_PLACES.bakehouse.describe(ruined)[0]).toContain("ovens are cold");
    expect(shown(base)).toContain("ovens");
  });

  it("Silas's crew won't be won over once she's crossed him", () => {
    const fair = rivalActions("copperBell").find((a) => a.id === "fair_copperBell")!;
    const scouted = { ...base, done: { "copperbell:scout_copperBell": 1 } };
    expect(fair.locked!(scouted)).toBeNull();
    expect(fair.locked!({ ...scouted, flags: new Set(["silasAngry"] as const) })).toBe("Silas's crew won't drink with you");
  });
});
