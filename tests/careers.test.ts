import { describe, expect, it } from "vitest";
import { CAREERS, careerTitle, missing, newCareers, nightlyPay, readCareers } from "../src/game/careers";
import { newRecruits, newRecruit } from "../src/game/recruits";
import { TOWN_PLACES, type TownState } from "../src/game/townplaces";
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

/** Does one thing in town on a fresh day (each is once a day). */
function act(t: Tavern, place: Parameters<Tavern["doTownAction"]>[0], id: string) {
  t.townDoneToday.clear();
  return t.doTownAction(place, id);
}

describe("the smuggler's ladder (TOWN_DAY.md 6.1, step 7)", () => {
  it("opens once she's carried Silas's crates, and only one if she lied for him", () => {
    expect(missing("smuggler", base)).toEqual(["carry two of his crates first"]);
    expect(missing("smuggler", { ...base, done: { "quarry:crate": 2 } })).toEqual([]);
    expect(missing("smuggler", { ...base, flags: new Set(["silasOwes"] as const), done: { "quarry:crate": 1 } })).toEqual([]);
  });

  it("is shut to her once she's crossed him", () => {
    const join = TOWN_PLACES.quarry.actions.find((a) => a.id === "join_smuggler")!;
    expect(join.locked!({ ...base, done: { "quarry:crate": 2 }, flags: new Set(["silasAngry"] as const) })).toBe("Silas won't deal with you");
  });

  it("climbs on runs, a shady name and fans, and says what's missing", () => {
    const runner = { ...base, careers: { ...newCareers(), smuggler: { rank: 0, jobs: 2 } } };
    expect(missing("smuggler", runner)).toEqual(["5 runs (2)", "a shadier name (corruption 40)", "150 fans: a house worth hiding things in"]);
    expect(missing("smuggler", { ...runner, corruption: 40, fans: 150, careers: { ...newCareers(), smuggler: { rank: 0, jobs: 5 } } })).toEqual([]);
  });

  it("in the tavern: join, run, and the crew pays every night once she's a partner", () => {
    const t = day();
    t.records.town["quarry:crate"] = 2;
    act(t, "quarry", "join_smuggler");
    expect(t.careers.smuggler.rank).toBe(0);
    const gold = t.gold;
    act(t, "quarry", "job_smuggler_0");
    expect(t.careers.smuggler.jobs).toBe(1);
    expect(t.gold - gold).toBe(CAREERS.smuggler.ranks[0].job.gold);
    expect(nightlyPay(t.careers).gold).toBe(0);
    t.careers.smuggler.rank = 1;
    expect(nightlyPay(t.careers).gold).toBe(5);
  });
});

describe("the clergy's ladder (CHURCH_CONCEPT.md 5 and 7, step 7)", () => {
  it("takes a rank only once she's Willing, and after a few visits", () => {
    expect(missing("clergy", base)).toEqual(["Willing", "3 visits to the Warm House"]);
    expect(missing("clergy", { ...base, arc: "willing", done: { "warmhouse:ribbon": 2, "warmhouse:session": 1 } })).toEqual([]);
  });

  it("names her rank by her body", () => {
    expect(careerTitle("clergy", { rank: 1, jobs: 0 }, true)).toBe("Deaconess");
    expect(careerTitle("clergy", { rank: 1, jobs: 0 }, false)).toBe("Deacon");
    expect(careerTitle("clergy", { rank: -1, jobs: 0 }, true)).toBeNull();
  });

  it("needs a recruit helped up the hill to be a Deaconess, and one helped all the way to be High Priestess", () => {
    const acolyte = { ...base, arc: "known" as const, careers: { ...newCareers(), clergy: { rank: 0, jobs: 3 } } };
    expect(missing("clergy", acolyte)).toEqual(["put in a word for one of the town's recruits"]);
    const helped = { ...acolyte, recruits: { ...newRecruits(), hedda: { ...newRecruit(), helped: 1 } } };
    expect(missing("clergy", helped)).toEqual([]);
    const priestess = { ...helped, careers: { ...newCareers(), clergy: { rank: 2, jobs: 12 } } };
    expect(missing("clergy", priestess)).toEqual(["a recruit you helped all the way up the hill"]);
  });

  it("shows only the jobs of the ranks she holds, and the next step up", () => {
    const shown = (s: TownState) => TOWN_PLACES.warmhouse.actions.filter((a) => !a.hidden?.(s)).map((a) => a.id);
    expect(shown(base)).toContain("join_clergy");
    expect(shown(base)).not.toContain("job_clergy_0");
    const deacon = { ...base, careers: { ...newCareers(), clergy: { rank: 1, jobs: 4 } } };
    expect(shown(deacon)).toEqual(expect.arrayContaining(["job_clergy_0", "job_clergy_1", "promote_clergy"]));
    expect(shown(deacon)).not.toContain("job_clergy_2");
    expect(shown(deacon)).not.toContain("join_clergy");
  });

  it("is kept in the save", () => {
    const back = readCareers(JSON.parse(JSON.stringify({ clergy: { rank: 9, jobs: 4 } })));
    expect(back.clergy).toEqual({ rank: CAREERS.clergy.ranks.length - 1, jobs: 4 });
    expect(back.smuggler).toEqual({ rank: -1, jobs: 0 });
  });
});

describe("the day-job ladder on the notice board (TOWN_DAY.md section 5)", () => {
  const board = (id: string) => TOWN_PLACES.board.actions.find((a) => a.id === id)!;

  it("has honest work from day one, flirty work at Curious, lewd work at Willing", () => {
    expect(board("sacks").locked!(base)).toBeNull();
    expect(board("rounds").locked!(base)).toBeNull();
    expect(board("lunch").locked!(base)).toBe("needs Curious");
    expect(board("lunch").locked!({ ...base, arc: "curious" })).toBeNull();
    expect(board("bath").locked!({ ...base, arc: "curious" })).toBe("needs Willing");
  });

  it("has guild work for the guild's members and the garrison's", () => {
    expect(board("escort").locked!(base)).toBe("a guild card");
    expect(board("escort").locked!({ ...base, guildRank: "F" })).toBeNull();
    expect(board("gate").locked!(base)).toBe("a place in the garrison");
    expect(board("gate").locked!({ ...base, knightRank: "volunteer" })).toBeNull();
  });

  it("a shift behind a rival's bar counts as scouting the house above her", () => {
    const t = day();
    const s = { ...t.townState, arc: "curious" as const };
    const out = board("shift").run(s, () => 0);
    expect(out.mark).toBe("ciderbarn:scout_cider");
    expect(out.line).toContain("Hollin's Cider Barn");
    expect(board("shift").locked!({ ...s, houses: { cider: "partner", bakehouse: "partner", canteen: "ruin", tollgate: "partner", copperBell: "partner" } })).toBe("no house left above you");
  });
});

describe("her standing in town", () => {
  it("is a Priestess once she's that high in the clergy, and the keeper otherwise", () => {
    const t = day();
    expect(t.herRole).toBe("keeper");
    t.careers.clergy.rank = 2;
    expect(t.herRole).toBe("priestess");
  });
});
