import { describe, expect, it } from "vitest";
import { Tavern } from "../src/game/tavern";
import { KNIGHT_RANKS } from "../src/game/knight";

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

function enrolled(): Tavern {
  const t = new Tavern(11);
  t.random = seeded(5);
  expect(t.joinGarrison()).toBe(true);
  return t;
}

describe("signing up", () => {
  it("starts with no place in the garrison, and signs up by day only", () => {
    const t = new Tavern(11);
    expect(t.knight).toBeNull();
    t.phase = "service";
    expect(t.joinGarrison()).toBe(false);
    t.phase = "day";
    expect(t.joinGarrison()).toBe(true);
    expect(t.knight!.rank).toBe("volunteer");
    expect(t.joinGarrison()).toBe(false);
  });
});

describe("the day's work", () => {
  it("drills once a day and keeps her best", () => {
    const t = enrolled();
    const r = t.knightDrill([0, 0, 0, 0, 0, 0, 0, 0])!;
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(t.knight!.drillBest).toBe(100);
    expect(t.records.drillsPassed).toBe(1);
    expect(t.knightDrill(t.knightDrillTimings("steady"))).toBeNull();
  });

  it("walks a patrol: a rolled choice counts at once", () => {
    const t = enrolled();
    const event = t.knightPatrol()!;
    expect(event).not.toBeNull();
    const calm = event.choices.find((c) => !c.fight)!;
    const r = t.knightPatrolChoose(calm.id);
    expect(r).not.toBe("fight");
    expect(t.knight!.patrols).toBe(1);
    expect(t.records.knightPatrols).toBe(1);
    expect(t.canKnight("patrol")).toBe(false);
  });

  it("plays a tourney as a real brawl, and counts only a win", () => {
    const t = enrolled();
    const gold = (t.gold = 30);
    expect(t.knightTourney()).toBe(true);
    expect(t.fight).not.toBeNull();
    expect(t.canTourney).toBe(false);
    for (let i = 0; i < 80 && t.fight; i++) {
      const canThrow = t.fight.choices().find((c) => c.move === "throw")?.disabled === false;
      t.fightMove(t.fight.downed ? "stayDown" : canThrow ? "throw" : "strike");
    }
    expect(t.fight).toBeNull();
    const outcome = t.takeFightResult()!.outcome;
    expect(t.knight!.tourneyWins).toBe(outcome === "won" ? 1 : 0);
    expect(t.records.tourneyWins).toBe(outcome === "won" ? 1 : 0);
    // The lists aren't the taproom: nobody grabs from the till, and there's no offer after.
    expect(t.gold).toBe(gold);
    expect(t.brawlOffer).toBeNull();
  });
});

describe("promotion and rank", () => {
  it("says what's missing, then steps up and puts a sword in her brawls", () => {
    const t = enrolled();
    expect(t.knightPromote()).toBe(false);
    expect(t.knightBrawlDamage).toBe(KNIGHT_RANKS.volunteer.effects.brawlDamage);
    t.records.fightsWon = 5;
    t.knightDrill([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(t.knightPromote()).toBe(true);
    expect(t.knight!.rank).toBe("squire");
    expect(t.records.knightRankBest).toBe(1);
    expect(t.knightBrawlDamage).toBe(KNIGHT_RANKS.squire.effects.brawlDamage);
  });

  it("keeps the heat down at night while she's in favour", () => {
    const t = enrolled();
    t.knight = { ...t.knight!, rank: "knight", favour: 50 };
    t.heat = 4;
    t.phase = "bedtime";
    t.sleep();
    expect(t.heat).toBe(4 + KNIGHT_RANKS.knight.effects.heatPerNight);
  });

  it("lets talk fade by day", () => {
    const t = enrolled();
    t.knight = { ...t.knight!, scandal: 10 };
    t.phase = "dawn";
    t.nextNight();
    expect(t.knight!.scandal).toBe(8);
  });
});

describe("saving the knight", () => {
  it("round-trips her place in the garrison and today's work", () => {
    const t = enrolled();
    t.knightDrill([0, 10, 20, 30, 0, 0, 0, 0]);
    t.knight = { ...t.knight!, favour: 40, scandal: 6, squad: [{ name: "Corporal Dunn", loyalty: 55 }], oath: "baron" };
    t.knightFlags = ["ashCaught"];
    t.knightTourneyWeek = 0;
    const save = JSON.parse(JSON.stringify(t.snapshot()));
    const back = new Tavern(11);
    back.restore(save);
    expect(back.knight).toEqual(t.knight);
    expect(back.knightFlags).toEqual(["ashCaught"]);
    expect(back.knightTourneyWeek).toBe(0);
    expect(back.canKnight("drill")).toBe(false);
  });

  it("loads an older save with no knight", () => {
    const back = new Tavern(11);
    back.restore(new Tavern(11).snapshot());
    expect(back.knight).toBeNull();
  });
});
