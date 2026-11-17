import { describe, expect, it } from "vitest";
import { drift } from "../src/game/lantern";
import {
  arcDue,
  earnedStaffPassives,
  hire,
  hireable,
  JOB_UNLOCK,
  nightFor,
  PAY_LOYALTY,
  playBeat,
  STAFF_ARCS,
  STAFF_CAP,
  STAFF_GREEDY_PUSH,
  STAFF_PASSIVES,
  STAFF_ROSTER,
  staffDrift,
  APPLICANTS_SHOWN,
  FRIEND_AT,
  FRIEND_PERK,
  FRIEND_RARITY,
  RARITIES,
  RARITY_ODDS,
  RARITY_STATS,
  readStaffMember,
  rollApplicant,
  rollApplicants,
  rollPerk,
  rollRarity,
  STAFF_PERK_BY_ID,
  STAFF_PERKS,
  type StaffMember,
  type StaffNight,
} from "../src/game/staff";
import { noEffects } from "../src/game/passives";

/** A seeded roll (mulberry32), so the odds can be checked over many draws. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_SEVEN = ["tamsin", "maud", "corvin", "ash", "lysa", "wynn", "pip"];
const NEW_FRIENDS = ["sylvie", "bru", "grukka", "mirri", "hikari", "edda", "clara", "snik"];

/** A quiet night worked at a fair wage, under an honest house. */
const fair = (m: StaffMember, over: Partial<StaffNight> = {}): StaffNight => ({
  worked: true,
  wagePaid: m.wage,
  houseFame: 0,
  madamCorruption: m.corruption,
  greedyRules: 0,
  ...over,
});

describe("the roster", () => {
  it("has the seven people of STAFF.md §5 and the newer friends, all adults, each with an arc of 3 or 4 beats", () => {
    expect(STAFF_ROSTER.map((d) => d.id)).toEqual([...FIRST_SEVEN, ...NEW_FRIENDS]);
    for (const d of STAFF_ROSTER) {
      expect(d.age).toBeGreaterThanOrEqual(18);
      expect(d.about.length).toBeGreaterThan(0);
      const arc = STAFF_ARCS[d.id];
      expect(arc.length).toBeGreaterThanOrEqual(3);
      expect(arc.length).toBeLessThanOrEqual(4);
      for (const beat of arc) {
        expect(beat.outcomes.length).toBeGreaterThanOrEqual(2);
        expect(beat.outcomes.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("opens the bar, kitchen, door and Lantern mid, and the rest late", () => {
    expect(JOB_UNLOCK.barmaid).toBe("mid");
    expect(JOB_UNLOCK.girl).toBe("mid");
    expect(JOB_UNLOCK.dancer).toBe("late");
    expect(JOB_UNLOCK.clerk).toBe("late");
  });
});

describe("hiring by stage", () => {
  it("has nobody in the early game", () => {
    expect(hireable("early", [])).toEqual([]);
  });

  it("offers the mid-game people mid, and everyone late", () => {
    expect(hireable("mid", []).map((d) => d.id)).toEqual(["tamsin", "maud", "corvin", "ash", "bru", "grukka", "clara"]);
    expect(hireable("late", []).map((d) => d.id)).toEqual(STAFF_ROSTER.map((d) => d.id));
  });

  it("leaves out those already hired, and stops at the stage's cap", () => {
    expect(hireable("mid", ["maud"]).map((d) => d.id)).not.toContain("maud");
    expect(hireable("mid", ["maud", "corvin", "ash"].slice(0, STAFF_CAP.mid))).toEqual([]);
    expect(hireable("late", ["maud", "corvin", "ash"]).length).toBeGreaterThan(0);
  });

  it("hires a member rested, with clean records, from the roster's numbers", () => {
    const maud = hire("maud");
    expect(maud).toMatchObject({ name: "Maud", job: "barmaid", female: true, wage: 3, loyalty: 60, arcBeat: 0, fame: 0, quit: false });
    expect(maud.stamina).toEqual({ current: 7, max: 7 });
    expect(maud.records.nights).toBe(0);
    expect(() => hire("nobody")).toThrow();
  });
});

describe("a night", () => {
  it("doesn't change the member passed in", () => {
    const maud = hire("maud");
    nightFor(maud, fair(maud));
    expect(maud.records.nights).toBe(0);
    expect(maud.stamina.current).toBe(7);
  });

  it("spends stamina when worked, and restores it in full on a night off", () => {
    let maud = hire("maud");
    maud = nightFor(maud, fair(maud)).member;
    maud = nightFor(maud, fair(maud)).member;
    expect(maud.stamina.current).toBe(5);
    const { member, dawn } = nightFor(maud, fair(maud, { worked: false, wagePaid: 0 }));
    expect(member.stamina.current).toBe(7);
    expect(dawn.loyalty).toBe(1);
  });

  it("wins loyalty on fair and generous pay, and loses it when short or unpaid", () => {
    const maud = hire("maud");
    expect(nightFor(maud, fair(maud)).dawn.loyalty).toBe(PAY_LOYALTY.fair);
    expect(nightFor(maud, fair(maud, { wagePaid: 5 })).dawn.loyalty).toBe(PAY_LOYALTY.generous);
    expect(nightFor(maud, fair(maud, { wagePaid: 2 })).dawn.loyalty).toBe(PAY_LOYALTY.short);
    const unpaid = nightFor(maud, fair(maud, { wagePaid: 0 }));
    expect(unpaid.dawn.loyalty).toBe(PAY_LOYALTY.unpaid);
    expect(unpaid.dawn.mood).toBe("resentful");
  });

  it("is worn and loses loyalty when worked with no stamina left", () => {
    const corvin = { ...hire("corvin"), stamina: { current: 0, max: 6 } };
    const { dawn } = nightFor(corvin, fair(corvin));
    expect(dawn.mood).toBe("worn");
    expect(dawn.loyalty).toBe(PAY_LOYALTY.fair - 2);
  });

  it("drifts corruption toward the madam's exactly as the Lantern does, plus 3 per greedy rule", () => {
    const maud = hire("maud");
    expect(staffDrift(10, 70, 7)).toBeCloseTo(drift(10, 70, 7));
    expect(staffDrift(60, 0, 2)).toBeCloseTo(drift(60, 0, 2));
    const up = nightFor(maud, fair(maud, { madamCorruption: 70 })).member.corruption;
    expect(up).toBeCloseTo(10 + 60 * 0.1 * (1 - 7 * 0.05));
    const greedy = nightFor(maud, fair(maud, { madamCorruption: 70, greedyRules: 2 })).member.corruption;
    expect(greedy).toBeCloseTo(up + 2 * STAFF_GREEDY_PUSH);
    // Falling goes at half speed.
    const pip = hire("pip");
    expect(nightFor(pip, fair(pip, { madamCorruption: 0 })).member.corruption).toBeCloseTo(40 - 40 * 0.1 * (1 - 3 * 0.05) * 0.5);
  });

  it("doesn't drift on a night off", () => {
    const maud = hire("maud");
    expect(nightFor(maud, fair(maud, { worked: false, madamCorruption: 90 })).member.corruption).toBe(10);
  });

  it("grows skill with use and fame with good nights and a famous house", () => {
    let ash = hire("ash");
    for (let i = 0; i < 10; i++) ash = nightFor(ash, fair(ash, { done: { throwOuts: 1 } })).member;
    expect(ash.skill).toBe(7);
    // His stamina is 8: the last two nights were worked tired, and a tired night earns no fame.
    expect(ash.fame).toBe(8);
    expect(ash.stamina.current).toBe(0);
    expect(ash.records.throwOuts).toBe(10);
    // Tired, he earns nothing himself, but a house 20+ more famous still lifts him; rested, he earns his own too.
    expect(nightFor(ash, fair(ash, { houseFame: 60 })).dawn.fame).toBe(1);
    const rested = { ...ash, stamina: { current: 8, max: 8 } };
    expect(nightFor(rested, fair(rested, { houseFame: 60 })).dawn.fame).toBe(2);
  });

  it("quits at loyalty 0, and stays gone", () => {
    const wynn = { ...hire("wynn"), loyalty: 4 };
    const { member, dawn } = nightFor(wynn, fair(wynn, { wagePaid: 0 }));
    expect(member.loyalty).toBe(0);
    expect(member.quit).toBe(true);
    expect(dawn.mood).toBe("quit");
    expect(dawn.beat).toBeNull();
    expect(nightFor(member, fair(member)).dawn.mood).toBe("quit");
  });

  it("is happy when loyal, and steady otherwise", () => {
    const maud = { ...hire("maud"), loyalty: 80 };
    expect(nightFor(maud, fair(maud)).dawn.mood).toBe("happy");
    const corvin = hire("corvin");
    expect(nightFor(corvin, fair(corvin)).dawn.mood).toBe("steady");
  });

  it("works out a girl's lewdness from her bookings", () => {
    const tamsin = hire("tamsin");
    expect(nightFor(tamsin, fair(tamsin, { done: { bookings: 6 } })).member.lewdness).toBe(2);
  });
});

describe("passives", () => {
  it("earns Quick Hands at 200 served, once", () => {
    const maud = hire("maud");
    expect(earnedStaffPassives(maud)).toEqual([]);
    const busy = { ...maud, records: { ...maud.records, served: 200 } };
    expect(earnedStaffPassives(busy)).toEqual(["quick_hands"]);
    expect(earnedStaffPassives({ ...busy, passives: ["quick_hands"] })).toEqual([]);
  });

  it("earns Wall of the Door through a night, and names it at dawn", () => {
    const ash = hire("ash");
    const worn = { ...ash, records: { ...ash.records, throwOuts: 19 } };
    const { member, dawn } = nightFor(worn, fair(worn, { done: { throwOuts: 1 } }));
    expect(dawn.passives).toEqual(["wall_of_the_door"]);
    expect(member.passives).toContain("wall_of_the_door");
    expect(dawn.line).toContain("Wall of the Door");
  });

  it("has between 6 and 10 passives with unique ids", () => {
    expect(STAFF_PASSIVES.length).toBeGreaterThanOrEqual(6);
    expect(STAFF_PASSIVES.length).toBeLessThanOrEqual(10);
    expect(new Set(STAFF_PASSIVES.map((p) => p.id)).size).toBe(STAFF_PASSIVES.length);
  });
});

describe("their stories", () => {
  it("brings on a beat once enough nights are worked, and moves on when it's played", () => {
    let maud = hire("maud");
    expect(arcDue(maud)).toBeNull();
    for (let i = 0; i < 4; i++) maud = nightFor(maud, fair(maud)).member;
    expect(arcDue(maud)?.id).toBe("maud_letter");
    expect(playBeat(maud, "no_such_outcome")).toBeNull();
    const next = playBeat(maud, "ask")!;
    expect(next.arcBeat).toBe(1);
    expect(arcDue(next)).toBeNull();
  });

  it("reports the due beat at dawn", () => {
    const corvin = { ...hire("corvin"), records: { nights: 3, served: 0, bookings: 0, throwOuts: 0, dances: 0, tips: 0 } };
    expect(nightFor(corvin, fair(corvin)).dawn.beat?.id).toBe("corvin_dice");
  });

  it("holds a loyalty-gated beat until they're loyal enough", () => {
    const ash = { ...hire("ash"), arcBeat: 2, loyalty: 30, records: { nights: 30, served: 0, bookings: 0, throwOuts: 0, dances: 0, tips: 0 } };
    expect(arcDue(ash)).toBeNull();
    expect(arcDue({ ...ash, loyalty: 60 })?.id).toBe("ash_end");
  });

  it("has no beat left once the story's done", () => {
    const lysa = { ...hire("lysa"), arcBeat: STAFF_ARCS.lysa.length, records: { nights: 99, served: 0, bookings: 0, throwOuts: 0, dances: 0, tips: 0 } };
    expect(arcDue(lysa)).toBeNull();
  });
});

describe("the newer friends", () => {
  const news = STAFF_ROSTER.filter((d) => NEW_FRIENDS.includes(d.id));

  it("are adults, mostly women, from several peoples, each with a look for the art", () => {
    for (const d of news) {
      expect(d.age, d.id).toBeGreaterThanOrEqual(18);
      expect(d.look?.length ?? 0, d.id).toBeGreaterThan(0);
      expect(d.people?.length ?? 0, d.id).toBeGreaterThan(0);
    }
    expect(news.filter((d) => d.female).length).toBeGreaterThan(news.length / 2);
    expect(new Set(news.map((d) => d.people!.split(" ")[0])).size).toBeGreaterThanOrEqual(5);
  });

  it("each have a perk of their own and a rarity, mostly Epic or Legendary", () => {
    const perks = news.map((d) => FRIEND_PERK[d.id]);
    expect(new Set(perks).size).toBe(news.length);
    for (const id of perks) expect(STAFF_PERK_BY_ID[id].tier).toBe("friend");
    const high = news.filter((d) => FRIEND_RARITY[d.id] === "epic" || FRIEND_RARITY[d.id] === "legendary").length;
    expect(high).toBeGreaterThan(news.length / 2);
  });
});

describe("recruitment", () => {
  it("rolls rarities near the odds (60/25/10/4/1)", () => {
    const rng = seeded(42);
    const counts = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<string, number>;
    const N = 20000;
    for (let i = 0; i < N; i++) counts[rollRarity(rng)]++;
    for (const r of RARITIES) expect(Math.abs((counts[r] / N) * 100 - RARITY_ODDS[r]), r).toBeLessThan(1.5);
    expect(RARITIES.reduce((n, r) => n + RARITY_ODDS[r], 0)).toBe(100);
  });

  it("gives perks by rarity: never Common, sometimes Uncommon, always one of their tier above", () => {
    const rng = seeded(7);
    let uncommon = 0;
    for (let i = 0; i < 500; i++) {
      expect(rollPerk("common", rng)).toBeNull();
      if (rollPerk("uncommon", rng)) uncommon++;
      for (const r of ["rare", "epic", "legendary"] as const) expect(STAFF_PERK_BY_ID[rollPerk(r, rng)!].tier).toBe(r);
    }
    expect(uncommon).toBeGreaterThan(0);
    expect(uncommon).toBeLessThan(250);
    // Friends' perks are never rolled.
    for (const p of STAFF_PERKS.filter((x) => x.tier === "friend")) expect(Object.values(FRIEND_PERK)).toContain(p.id);
  });

  it("rolls adult applicants with stats in their rarity's range, for jobs open at the stage", () => {
    const rng = seeded(3);
    expect(rollApplicant("early", rng, "x")).toBeNull();
    for (let i = 0; i < 300; i++) {
      const a = rollApplicant("mid", rng, `a${i}`)!;
      expect(a.age).toBeGreaterThanOrEqual(18);
      expect(["barmaid", "cook", "doorman"]).toContain(a.job);
      const [lo, hi] = RARITY_STATS[a.rarity];
      for (const v of [a.skill, a.appeal, a.charm]) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
      }
      if (a.rarity === "common") expect(a.perks).toEqual([]);
      if (a.rarity === "rare" || a.rarity === "epic" || a.rarity === "legendary") expect(a.perks.length).toBe(1);
    }
    const lot = rollApplicants("late", seeded(9), 5);
    expect(lot.length).toBe(APPLICANTS_SHOWN);
    expect(lot.map((a) => a.id)).toEqual(["hire5", "hire6", "hire7"]);
  });

  it("only offers roster people who are her friends, when friendship is given", () => {
    expect(hireable("mid", [], {})).toEqual([]);
    expect(hireable("mid", [], { maud: FRIEND_AT - 1 })).toEqual([]);
    expect(hireable("mid", [], { maud: FRIEND_AT }).map((d) => d.id)).toEqual(["maud"]);
  });

  it("hires friends with their own perk and rarity", () => {
    const ash = hire("ash");
    expect(ash.perks).toEqual(["old_soldier"]);
    expect(ash.rarity).toBe("legendary");
  });

  it("perks change something", () => {
    const none = JSON.stringify(noEffects());
    for (const p of STAFF_PERKS) {
      const e = noEffects();
      p.effect?.(e);
      const changes = JSON.stringify(e) !== none || p.nightly !== undefined || p.stamina !== undefined;
      expect(changes, p.id).toBe(true);
    }
  });

  it("reads a saved member back, and drops a broken one", () => {
    const maud = hire("maud");
    expect(readStaffMember(JSON.parse(JSON.stringify(maud)))).toEqual(maud);
    expect(readStaffMember({ id: 3 })).toBeNull();
    expect(readStaffMember({ ...maud, job: "king" })).toBeNull();
  });
});
