import { describe, expect, it } from "vitest";
import { MIND_AT } from "../src/game/lewd";
import {
  hire,
  JOB_LEWD_WORK,
  lewdWork,
  nightFor,
  readStaffMember,
  STAFF_JOBS,
  STAFF_ROTTEN,
  STAFF_TIER_LINES,
  STAFF_TIERS,
  staffLewdness,
  staffStage,
  staffTier,
  staffTierCard,
  type StaffJob,
  type StaffMember,
  type StaffNight,
} from "../src/game/staff";
import { Tavern } from "../src/game/tavern";
import { PUSHERS, TROPE_IDS, type StageCard } from "../src/game/tropes";

const fair = (m: StaffMember, over: Partial<StaffNight> = {}): StaffNight => ({
  worked: true,
  wagePaid: m.wage,
  houseFame: 0,
  madamCorruption: m.corruption,
  greedyRules: 0,
  ...over,
});

/** A night worked, rested by the next (so nobody quits from working tired). */
function workNight(m: StaffMember, reached: number, over: Partial<StaffNight> = {}): { member: StaffMember; cards: StageCard[] } {
  const rested = { ...m, stamina: { ...m.stamina, current: m.stamina.max } };
  const r = nightFor(rested, fair(rested, { done: lewdWork(m.job, { reached, revel: false }), ...over }));
  return { member: r.member, cards: r.dawn.cards };
}

/** Lewdness after this many handsy nights (4 hands for the keeper), for one of each job. */
function lewdAfter(job: StaffJob, nights: number, reached = 4): number {
  let m: StaffMember = { ...hire("maud"), job };
  for (let i = 0; i < nights; i++) m = workNight(m, reached).member;
  return m.lewdness;
}

describe("staff lewdness from their own work", () => {
  it("gives each job its own lewd work a night", () => {
    expect(lewdWork("barmaid", { reached: 4, revel: false })).toEqual({ gropes: 3, dances: 0, revels: 0 });
    expect(lewdWork("girl", { reached: 4, revel: false })).toEqual({ gropes: 5, dances: 0, revels: 0 });
    expect(lewdWork("dancer", { reached: 4, revel: false })).toEqual({ gropes: 2, dances: 3, revels: 0 });
    expect(lewdWork("doorman", { reached: 4, revel: false })).toEqual({ gropes: 1, dances: 0, revels: 0 });
    expect(lewdWork("devotee", { reached: 4, revel: false })).toEqual({ gropes: 1, dances: 0, revels: 0 });
    expect(lewdWork("cook", { reached: 4, revel: false })).toEqual({ gropes: 0, dances: 0, revels: 0 });
    expect(lewdWork("clerk", { reached: 6, revel: false })).toEqual({ gropes: 1, dances: 0, revels: 0 });
    // A quiet room still has the barmaid's pinch; the cook's left alone.
    expect(lewdWork("barmaid", { reached: 0, revel: false }).gropes).toBe(1);
    expect(lewdWork("cook", { reached: 0, revel: false }).gropes).toBe(0);
    for (const job of STAFF_JOBS) expect(JOB_LEWD_WORK[job]).toBeDefined();
  });

  it("a revel night counts for everyone on, and the dancer dances more", () => {
    expect(lewdWork("cook", { reached: 0, revel: true })).toEqual({ gropes: 0, dances: 0, revels: 1 });
    expect(lewdWork("dancer", { reached: 0, revel: true }).dances).toBe(5);
    expect(staffLewdness({ nights: 1, served: 0, bookings: 0, throwOuts: 0, dances: 0, tips: 0, gropes: 0, revels: 3 })).toBe(3);
  });

  it("counts gropes 1 for every 3, beside bookings and dances", () => {
    const rec = { nights: 10, served: 0, bookings: 6, throwOuts: 0, dances: 10, tips: 0, gropes: 8, revels: 0 };
    expect(staffLewdness(rec)).toBe(2 + 2 + 2);
  });

  it("each falls at their own pace: the groped barmaid long before the cook", () => {
    const nights = 30;
    const barmaid = lewdAfter("barmaid", nights);
    const cook = lewdAfter("cook", nights);
    const girl = lewdAfter("girl", nights);
    const dancer = lewdAfter("dancer", nights);
    expect(barmaid).toBe(30);
    expect(cook).toBe(0);
    expect(girl).toBeGreaterThan(dancer);
    expect(dancer).toBeGreaterThan(barmaid);
    expect(lewdAfter("doorman", nights)).toBe(10);
    // In a wild room even the cook gets pinched, now and then.
    expect(lewdAfter("cook", nights, 6)).toBe(10);
  });

  it("tells a barmaid's Curious card once, when her own nights get her there", () => {
    let maud = hire("maud");
    const cards: StageCard[] = [];
    for (let i = 0; i < 40; i++) {
      const r = workNight(maud, 4);
      maud = r.member;
      cards.push(...r.cards);
    }
    expect(maud.lewdness).toBeGreaterThanOrEqual(MIND_AT[0]);
    expect(staffStage(maud)).toBe("curious");
    expect(cards.filter((c) => c.id === "staff_stage_curious")).toHaveLength(1);
  });

  it("the tavern records each one's lewd work at bedtime, and the stage card reaches the morning", () => {
    const t = new Tavern(11);
    const maud = { ...hire("maud"), lewdness: MIND_AT[0] - 1 };
    maud.records = { ...maud.records, gropes: 3 * (MIND_AT[0] - 1) };
    const corvin = hire("corvin");
    t.staff.push(maud, corvin);
    t.corruption = maud.corruption;
    t.touchesTonight.reached = 4;
    t.phase = "bedtime";
    t.takeMessages();
    t.sleep();
    const said = t.takeMessages().join(" ") + " " + t.news.join(" ");
    const after = t.staff.find((m) => m.id === "maud")!;
    expect(after.records.gropes).toBe(3 * (MIND_AT[0] - 1) + 3);
    expect(after.lewdness).toBe(MIND_AT[0]);
    expect(said).toContain("Maud has noticed the tips come bigger");
    expect(t.staff.find((m) => m.id === "corvin")!.records.gropes).toBe(0);
  });

  it("reads an older save's records with no gropes or revels as 0", () => {
    const raw = JSON.parse(JSON.stringify(hire("maud")));
    delete raw.records.gropes;
    delete raw.records.revels;
    const back = readStaffMember(raw)!;
    expect(back.records.gropes).toBe(0);
    expect(back.records.revels).toBe(0);
    const { member } = workNight(back, 4);
    expect(member.records.gropes).toBe(3);
    expect(Number.isFinite(member.lewdness)).toBe(true);
  });
});

describe("rotten staff", () => {
  it("are rotten from STAFF_ROTTEN, past crooked", () => {
    expect(STAFF_TIERS).toEqual(["honest", "shady", "crooked", "rotten"]);
    expect(staffTier(80)).toBe("crooked");
    expect(staffTier(STAFF_ROTTEN - 0.1)).toBe("crooked");
    expect(staffTier(STAFF_ROTTEN)).toBe("rotten");
    expect(staffTier(100)).toBe("rotten");
  });

  it("is reachable under a madam well into crooked: a crooked barmaid gets there in about a week at 120", () => {
    let maud = { ...hire("maud"), corruption: 80, resolve: 5, tierSeen: 2 };
    let nights = 0;
    while (staffTier(maud.corruption) !== "rotten" && nights < 100) {
      maud = workNight(maud, 0, { madamCorruption: 120 }).member;
      nights++;
    }
    expect(nights).toBeLessThanOrEqual(8);
    // Under a madam of 80 with no greedy rules, never; one greedy rule gets them there.
    let still = { ...hire("maud"), corruption: 80, resolve: 5, tierSeen: 2 };
    for (let i = 0; i < 300; i++) still = workNight(still, 0, { madamCorruption: 80 }).member;
    expect(staffTier(still.corruption)).toBe("crooked");
    let pushed = { ...hire("maud"), corruption: 80, resolve: 5, tierSeen: 2 };
    for (let i = 0; i < 30; i++) pushed = workNight(pushed, 0, { madamCorruption: 80, greedyRules: 1 }).member;
    expect(staffTier(pushed.corruption)).toBe("rotten");
  });

  it("tells the rotten card once, and never again", () => {
    let maud = { ...hire("maud"), corruption: 94, tierSeen: 2 };
    const cards: StageCard[] = [];
    for (let i = 0; i < 20; i++) {
      const r = workNight(maud, 0, { madamCorruption: 150 });
      maud = r.member;
      cards.push(...r.cards);
    }
    // Fall back and rise again: still nothing told twice.
    maud = workNight(maud, 0, { madamCorruption: 0 }).member;
    for (let i = 0; i < 20; i++) cards.push(...workNight(maud, 0, { madamCorruption: 150 }).cards);
    expect(cards.filter((c) => c.id.startsWith("staff_madam_")).map((c) => c.id)).toEqual(["staff_madam_rotten"]);
    expect(maud.tierSeen).toBe(3);
  });

  it("writes one rotten card per pusher on the Rotten tropes, at the aftermath, ending on their own choice", () => {
    for (const p of PUSHERS) {
      const job: StaffJob = p === "church" ? "devotee" : "barmaid";
      const id = p === "sabine" ? "tamsin" : p === "smugglers" ? "corvin" : `x_${p}`;
      for (const female of [true, false]) {
        const card = staffTierCard({ id, job, name: "Nell", female }, "rotten");
        expect(card.id).toBe(`staff_${p}_rotten`);
        expect(card.beat).toBe("aftermath");
        expect(["gaslighting", "traumaBond", "brainwashing"]).toContain(card.trope);
        expect(TROPE_IDS).toContain(card.also!);
        expect(card.title).toBe(STAFF_TIER_LINES[p].rotten.title);
        const text = card.lines.join(" ");
        expect(text).not.toMatch(/\{\w+\}/);
        expect(text).not.toMatch(/\b(she|he)'re\b|\b(She|He) (keep|have|haven't|like)\b/);
        expect(card.lines.at(-1)).toMatch(/chose|could|can/);
      }
    }
  });

  it("an older save at rotten already doesn't announce it", () => {
    const raw = JSON.parse(JSON.stringify({ ...hire("maud"), corruption: 97 }));
    delete raw.tierSeen;
    const back = readStaffMember(raw)!;
    expect(back.tierSeen).toBe(3);
    expect(workNight(back, 0).cards).toEqual([]);
  });

  it("shows rotten on their dawn line", () => {
    const maud = { ...hire("maud"), corruption: 99, tierSeen: 3 };
    expect(nightFor(maud, fair(maud)).dawn.line).toContain("rotten");
  });
});
