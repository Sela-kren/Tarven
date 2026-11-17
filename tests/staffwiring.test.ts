import { describe, expect, it } from "vitest";
import { BARMAID_PATIENCE, DOORMAN_TROUBLE, Tavern } from "../src/game/tavern";
import { FRIEND_AT, hire, STAFF_CAP } from "../src/game/staff";

/** A seeded roll (mulberry32). */
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

const MID_FRIENDS = ["maud", "corvin", "ash", "bru", "grukka", "clara"];

/** A tavern in the mid game (night 6), by day, with every mid-game roster person a friend. */
function midGame(): Tavern {
  const t = new Tavern(11);
  t.random = seeded(1);
  t.nightIndex = 5;
  for (const id of MID_FRIENDS) t.friendship[id] = FRIEND_AT;
  return t;
}

/** Puts her to bed after a night, and returns what the morning said. */
function bedtime(t: Tavern): string[] {
  t.phase = "bedtime";
  t.takeMessages();
  t.sleep();
  return t.takeMessages();
}

describe("staff stage", () => {
  it("has nobody in the early game, then opens mid and late", () => {
    const t = new Tavern(11);
    expect(t.staffStage).toBe("early");
    expect(t.staffHireable()).toEqual([]);
    t.nightIndex = 5;
    expect(t.staffStage).toBe("mid");
    t.nightIndex = 0;
    t.gold = 150;
    expect(t.staffStage).toBe("mid");
    t.persona.fame = 60;
    expect(t.staffStage).toBe("late");
  });
});

describe("hiring", () => {
  it("hires friends up to the stage's cap", () => {
    const t = midGame();
    expect(t.hireStaff("maud")).toBe(true);
    expect(t.hireStaff("corvin")).toBe(true);
    expect(t.hireStaff("ash")).toBe(true);
    expect(t.staffCap).toEqual({ have: 3, cap: STAFF_CAP.mid });
    expect(t.hireStaff("bru")).toBe(false);
    expect(t.staffHireable()).toEqual([]);
    expect(t.fireStaff("ash")).toBe(true);
    expect(t.hireStaff("bru")).toBe(true);
  });

  it("only hires friends, and friendship grows once a day each", () => {
    const t = new Tavern(11);
    t.nightIndex = 5;
    expect(t.hireStaff("maud")).toBe(false);
    expect(t.spendTimeWith("maud")).toBe(true);
    expect(t.spendTimeWith("maud")).toBe(false);
    expect(t.friendship.maud).toBe(1);
    t.friendship.maud = FRIEND_AT;
    expect(t.hireStaff("maud")).toBe(true);
    expect(t.staff[0].perks).toEqual(["farm_friends"]);
  });

  it("leaves the Lantern's girls off the cap", () => {
    const t = midGame();
    t.staff.push(hire("tamsin"));
    expect(t.staffCap.have).toBe(0);
    for (const id of ["maud", "corvin", "ash"]) expect(t.hireStaff(id)).toBe(true);
    expect(t.staff.length).toBe(4);
  });

  it("isn't done in the middle of service", () => {
    const t = midGame();
    t.phase = "service";
    expect(t.hireStaff("maud")).toBe(false);
  });

  it("posts for applicants, and takes one on within the cap", () => {
    const t = midGame();
    t.gold = 20;
    expect(t.postForWork()).toBe(true);
    expect(t.gold).toBe(15);
    expect(t.applicants.length).toBe(3);
    const first = t.applicants[0];
    expect(first.age).toBeGreaterThanOrEqual(18);
    expect(t.hireApplicant(first.id)).toBe(true);
    expect(t.applicants.length).toBe(2);
    t.hireStaff("maud");
    t.hireStaff("corvin");
    expect(t.hireApplicant(t.applicants[0].id)).toBe(false);
  });

  it("brings a fresh lot of applicants with the morning every few nights, once staff come in", () => {
    const t = midGame();
    t.phase = "dawn";
    t.nextNight();
    expect(t.applicants.length).toBe(3);
  });
});

describe("a night's end", () => {
  it("pays wages from the till and counts their night", () => {
    const control = midGame();
    control.gold = 100;
    bedtime(control);
    const t = midGame();
    t.gold = 100;
    t.hireStaff("maud");
    bedtime(t);
    expect(control.gold - t.gold).toBe(3);
    expect(t.staff[0].records.nights).toBe(1);
  });

  it("pays what she can, and says so", () => {
    const t = midGame();
    t.hireStaff("maud");
    t.gold = 1;
    const said = bedtime(t);
    expect(t.gold).toBe(0);
    expect(said.some((l) => l.includes("could only pay 1 of 3"))).toBe(true);
  });

  it("loses anyone who quits", () => {
    const t = midGame();
    t.hireStaff("maud");
    t.staff[0].loyalty = 1;
    t.gold = 0;
    const said = bedtime(t);
    expect(t.staff).toEqual([]);
    expect(said.some((l) => l.includes("packed up and left"))).toBe(true);
  });
});

describe("their jobs", () => {
  it("a cook keeps the stew from burning", () => {
    const burns = (cook: boolean) => {
      const t = midGame();
      if (cook) t.hireStaff("corvin");
      t.potState = "ready";
      t.potTimer = 0.5;
      (t as unknown as { updatePot(dt: number): void }).updatePot(10);
      return t.potState;
    };
    expect(burns(false)).toBe("burnt");
    expect(burns(true)).toBe("ready");
  });

  it("a barmaid keeps guests waiting longer, and a doorman keeps trouble down", () => {
    const t = midGame();
    (t as unknown as { refreshEffects(): void }).refreshEffects();
    const before = { patience: t.effects.patience, trouble: t.effects.trouble };
    t.hireStaff("clara");
    expect(t.effects.patience).toBeCloseTo(before.patience + BARMAID_PATIENCE + 0.15);
    t.hireStaff("ash");
    expect(t.effects.trouble).toBeCloseTo(before.trouble + DOORMAN_TROUBLE + 0.1);
  });

  it("their perks stop when they're too tired to work", () => {
    const t = midGame();
    t.hireStaff("grukka");
    expect(t.effects.fightDamage).toBeGreaterThan(0);
    t.staff[0].stamina.current = 0;
    (t as unknown as { refreshEffects(): void }).refreshEffects();
    expect(t.effects.fightDamage).toBe(0);
  });
});

describe("saving", () => {
  it("keeps staff, applicants and friendship", () => {
    const t = midGame();
    t.gold = 50;
    t.hireStaff("maud");
    t.postForWork();
    t.setWage("maud", 7);
    const save = JSON.parse(JSON.stringify(t.snapshot()));
    const back = new Tavern(11);
    back.restore(save);
    expect(back.staff).toEqual(t.staff);
    expect(back.applicants).toEqual(t.applicants);
    expect(back.friendship).toEqual(t.friendship);
    expect(back.staff[0].wage).toBe(7);
  });

  it("loads an older save with no staff", () => {
    const t = new Tavern(11);
    const save = t.snapshot();
    expect(save.staff).toBeUndefined();
    const back = new Tavern(11);
    back.restore(save);
    expect(back.staff).toEqual([]);
  });
});
