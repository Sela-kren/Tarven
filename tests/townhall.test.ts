import { describe, expect, it } from "vitest";
import {
  CANVASS_GAIN,
  CANVASS_MOST,
  canvass,
  factionMoods,
  lawEffects,
  newPolitics,
  readPolitics,
  reeveMissing,
  REFUSAL_COST,
  voteShare,
  type HallFacts,
} from "../src/game/townhall";
import { BARON_LAWS } from "../src/game/knight";
import { outfitNoticed, type SeenFacts } from "../src/game/beingseen";
import { blankTownFacts, passingLinesFor } from "../src/game/towntalk";
import { TOWN_PLACES } from "../src/game/townplaces";
import { Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const plain: HallFacts = {
  trust: 0, respect: 0, fame: 0, corruption: 0, fans: 0, knightRank: null, clergyRank: -1, helped: 0, warned: 0,
  partners: 0, ruins: 0, ciderPartner: false, ciderRuined: false, canteenPartner: false, canteenRuined: false,
  odenShut: false, maraArrested: false, odenRoute: 0, lanternLit: false, seat: true,
};

function day(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 500;
  return t;
}

/** Wins the town over: every bloc canvassed to the most it can be. */
function wonOver(t: Tavern): void {
  for (let i = 0; i < CANVASS_MOST / CANVASS_GAIN; i++) for (const f of ["farmers", "merchants", "soldiers", "devotees", "nobles", "oden"] as const) t.canvass(f);
}

describe("the town's blocs and the vote (TOWN_DAY.md 6.2, step 8)", () => {
  it("read what she's done: the farmers her trust, Oden's faithful his chapel, the devotees her church", () => {
    const p = newPolitics();
    expect(factionMoods({ ...plain, trust: 10 }, p).farmers).toBeGreaterThan(factionMoods(plain, p).farmers);
    expect(factionMoods({ ...plain, odenShut: true }, p).oden).toBeLessThan(factionMoods(plain, p).oden);
    expect(factionMoods({ ...plain, clergyRank: 3, helped: 2 }, p).devotees).toBeGreaterThan(factionMoods(plain, p).devotees);
  });

  it("starts her at about half, and canvassing wins it", () => {
    expect(voteShare(plain, newPolitics())).toBeCloseTo(0.5, 1);
    let p = newPolitics();
    for (let i = 0; i < 5; i++) p = canvass(p, "farmers");
    expect(p.campaign.farmers).toBe(CANVASS_MOST);
    expect(voteShare(plain, p)).toBeGreaterThan(0.5);
  });

  it("needs the council seat and over half the vote for the chain", () => {
    expect(reeveMissing({ ...plain, seat: false }, newPolitics())).toContain("a council seat (First in Tarven)");
    expect(reeveMissing(plain, newPolitics()).join(" ")).toContain("over half the town's vote");
    let p = newPolitics();
    for (let i = 0; i < 5; i++) p = canvass(canvass(p, "farmers"), "merchants");
    expect(reeveMissing(plain, p)).toEqual([]);
  });
});

describe("the laws, doing something (step 8)", () => {
  it("as the Baron left them, change nothing but a little", () => {
    const e = lawEffects(BARON_LAWS, false);
    expect(e.nightlyGold).toBe(0);
    expect(e.exposureRespect).toBe(1);
    expect(e.freeUse).toBe(0);
    expect(e.veyraFaith).toBe(false);
  });

  it("move her takings, the Lantern's heat, the dress code and the faith", () => {
    expect(lawEffects({ ...BARON_LAWS, aleTax: 2, curfew: 2 }, false).nightlyGold).toBe(10);
    expect(lawEffects({ ...BARON_LAWS, curfew: 0 }, false).nightlyGold).toBe(-4);
    expect(lawEffects({ ...BARON_LAWS, brothels: 0 }, true).nightlyHeat).toBe(1);
    expect(lawEffects({ ...BARON_LAWS, brothels: 2 }, true).nightlyGold).toBe(3);
    expect(lawEffects({ ...BARON_LAWS, dressCode: 2 }, false).bareLegal).toBe(true);
    expect(lawEffects({ ...BARON_LAWS, stateFaith: 2 }, false).veyraFaith).toBe(true);
  });

  it("the dress code changes what being seen bare costs her", () => {
    const seen: SeenFacts = { arc: "sheltered", dress: "topless", outfit: "work", messy: false, hour: 10, today: new Set() };
    const baron = outfitNoticed(seen, 0)!;
    const modest = outfitNoticed({ ...seen, exposureRespect: 2 }, 0)!;
    const legal = outfitNoticed({ ...seen, exposureRespect: 0, bareLegal: true }, 0)!;
    expect(modest.respect).toBe(baron.respect! * 2);
    expect(legal.respect ?? 0).toBe(0);
    expect(legal.heat).toBeUndefined();
    expect(baron.heat).toBe(1);
  });
});

describe("the town hall in the game", () => {
  it("is shut to her until she's First in Tarven, then she can canvass and stand", () => {
    const t = day();
    const shown = () => TOWN_PLACES.townhall.actions.filter((a) => !a.hidden?.(t.townState)).map((a) => a.id);
    expect(shown()).toEqual([]);
    t.beatsDone.add("copperBell");
    expect(shown()).toContain("canvass_farmers");
    expect(shown()).toContain("stand");
  });

  it("makes her Reeve without the garrison, once the town would vote for her", () => {
    const t = day();
    t.beatsDone.add("copperBell");
    expect(t.knight).toBeNull();
    // Not well liked yet: the village doesn't trust her, and her name's poor.
    t.trust = 0;
    t.persona.respect = -5;
    expect(t.townBlocked("townhall", "stand", 8)).toContain("over half the town's vote");
    wonOver(t);
    t.doTownAction("townhall", "stand");
    expect(t.politics.reeve).toBe(true);
    expect(t.herRole).toBe("reeve");
  });

  it("passes a law the town will feel, and the blocs answer", () => {
    const t = day();
    t.beatsDone.add("copperBell");
    wonOver(t);
    t.becomeReeve();
    expect(t.passLaw("aleTax", 1)).toBe(true);
    expect(t.politics.laws.aleTax).toBe(1);
    expect(t.politics.lawShift.farmers).toBeGreaterThan(0);
    expect(t.lawEffects.nightlyGold).toBe(3);
  });

  it("under Free use, her no counts and costs her with the devotees (TOWN_DAY.md 6.3)", () => {
    const t = day();
    t.refusedUnderFreeUse();
    expect(t.politics.campaign.devotees ?? 0).toBe(0);
    t.politics.laws.freeUse = 1;
    t.refusedUnderFreeUse();
    expect(t.politics.campaign.devotees).toBe(-REFUSAL_COST);
  });

  it("keeps the chain and laws she won as a knight, from an older save", () => {
    const p = readPolitics(undefined, { reeve: true, laws: { ...BARON_LAWS, freeUse: 2 } });
    expect(p.reeve).toBe(true);
    expect(p.laws.freeUse).toBe(2);
    expect(readPolitics({ reeve: false, laws: { curfew: 2 }, campaign: { farmers: 16 } }).campaign.farmers).toBe(16);
  });
});

describe("the street under her laws (6.3)", () => {
  const who = { kind: "farmer" as const, female: false };
  const lawLines = (laws: { freeUse: number; publicAffection: number; dressCode: number } | undefined, consentOff = false) =>
    passingLinesFor({ ...blankTownFacts(), laws, consentOff }, who).filter((l) => l.id.startsWith("law."));

  it("says nothing of laws she hasn't passed", () => {
    expect(lawLines(undefined)).toEqual([]);
    expect(lawLines({ freeUse: 0, publicAffection: 0, dressCode: 1 })).toEqual([]);
  });

  it("asks her under Free use with Consent on, and only lets hands land with it off", () => {
    const on = lawLines({ freeUse: 2, publicAffection: 0, dressCode: 1 });
    expect(on.some((l) => l.ask)).toBe(true);
    expect(on.some((l) => l.lands)).toBe(false);
    const off = lawLines({ freeUse: 2, publicAffection: 0, dressCode: 1 }, true);
    expect(off.some((l) => l.lands)).toBe(true);
  });
});
