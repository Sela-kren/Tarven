import { describe, expect, it } from "vitest";
import { Duel, type DuelArea, type DuelistStats } from "../src/game/duel";
import { effectsOf, emptyMeters, readProgress } from "../src/game/passives";
import { Tavern } from "../src/game/tavern";

const SEATS = 11;
const BASE: DuelistStats = { level: () => 1, sens: emptyMeters(), power: 0, resist: 0, stamina: 0, hold: 0, edge: 0, undress: 0 };

const duel = (areas: DuelArea[], random: () => number = () => 0.99, stats = BASE) => new Duel("farmer", new Set(areas), 10, stats, random);

/** A tavern shut for the night, with a sober farmer she let touch her lingering at the door. */
function atBedtime(): Tavern {
  const t = new Tavern(SEATS);
  t.random = () => 0.99;
  t.playerBody = "Female";
  t.gold = 50;
  t.passives.add("upstairsCurious");
  const inner = t as unknown as { phase: string; admirers: { kind: string }[] };
  inner.phase = "bedtime";
  inner.admirers = [{ kind: "farmer" }];
  return t;
}

describe("an after-hours game", () => {
  it("is won by making them give in first", () => {
    const d = duel(["hands"]);
    for (let i = 0; i < 40 && !d.outcome; i++) d.act(d.stamina >= 4 ? "hands" : "hold");
    expect(d.outcome).toBe("won");
    expect(d.xp.upHands).toBeGreaterThan(0);
  });

  it("is lost when she gives in first", () => {
    // She only kisses; they go for the boldest she allowed every time.
    const d = duel(["pussy"], () => 0);
    for (let i = 0; i < 60 && !d.outcome; i++) d.act("kiss");
    expect(d.outcome).toBe("lost");
  });

  it("only lets them do what she put in play, and a kiss", () => {
    let n = 0;
    const d = duel([], () => (n++ % 7) / 7);
    for (let i = 0; i < 30 && !d.outcome; i++) d.act("hold");
    expect(Object.keys(d.meterGains)).toEqual(["mouth"]);
    expect(d.log.some((line) => /breasts|butt|thighs|roam/.test(line))).toBe(false);
  });

  it("only offers her the moves her rules allow", () => {
    const moves = duel(["mouth"]).choices().map((c) => c.move);
    expect(moves).toContain("mouth");
    expect(moves).not.toContain("hands");
    expect(moves).not.toContain("ride");
    expect(moves).toContain("stop");
  });

  it("stops at once whenever she says so, even on the edge", () => {
    const d = duel(["pussy"], () => 0);
    while (!d.outcome && d.state !== "edge") d.act("kiss");
    expect(d.choices().find((c) => c.move === "stop")?.disabled).toBe(false);
    d.act("stop");
    expect(d.outcome).toBe("stopped");
  });

  it("gets harder to hold back the closer she is", () => {
    const d = duel([]);
    const calm = d.holdAmount();
    d.pleasure = 85;
    expect(d.state).toBe("edge");
    expect(d.holdAmount()).toBeLessThan(calm);
  });

  it("hits harder once she's aroused", () => {
    const d = duel([]);
    const calm = d.power("kiss");
    d.pleasure = 60;
    expect(d.power("kiss")).toBeGreaterThan(calm);
  });
});

describe("after hours in the tavern", () => {
  it("is only offered by a sober guest she warmed to, once she's lewd enough", () => {
    const t = atBedtime();
    expect(t.duelOffer()).toBe("farmer");
    const shy = new Tavern(SEATS);
    shy.playerBody = "Female";
    (shy as unknown as { phase: string }).phase = "bedtime";
    (shy as unknown as { admirers: { kind: string }[] }).admirers = [{ kind: "farmer" }];
    expect(shy.duelOffer()).toBeNull();
    const nobody = atBedtime();
    (nobody as unknown as { admirers: unknown[] }).admirers = [];
    expect(nobody.duelOffer()).toBeNull();
  });

  it("can't start when she's had too much to drink", () => {
    const t = atBedtime();
    t.drunk = 0.7;
    expect(t.duelBlocked).not.toBeNull();
    expect(t.startDuel([], 5)).toBe(false);
  });

  it("only lets her put in play what she's warm enough for", () => {
    const t = atBedtime();
    t.meters.pussy = 10;
    expect(t.startDuel(["pussy"], 5)).toBe(false);
    t.meters.pussy = 60;
    expect(t.startDuel(["pussy"], 5)).toBe(true);
  });

  it("pays the stake when she wins, and only once a night", () => {
    const t = atBedtime();
    t.meters.body = 30;
    expect(t.startDuel(["hands"], 10)).toBe(true);
    for (let i = 0; i < 40 && t.duel; i++) t.duelMove(t.duel.stamina >= 4 ? "hands" : "hold");
    expect(t.records.duelsWon).toBe(1);
    expect(t.gold).toBe(60);
    expect(t.takeDuelResult()?.outcome).toBe("won");
    expect(t.duelOffer()).toBeNull();
  });

  it("costs nothing to call off", () => {
    const t = atBedtime();
    t.startDuel([], 20);
    t.duelMove("kiss");
    t.duelMove("stop");
    expect(t.duel).toBeNull();
    expect(t.gold).toBe(50);
    expect(t.records.duelsStopped).toBe(1);
    expect(t.records.duelsWon + t.records.duelsLost).toBe(0);
  });

  it("costs only the stake when she loses", () => {
    const t = atBedtime();
    t.random = () => 0;
    t.meters.pussy = 60;
    t.startDuel(["pussy"], 20);
    for (let i = 0; i < 60 && t.duel; i++) t.duelMove("kiss");
    expect(t.records.duelsLost).toBe(1);
    expect(t.gold).toBe(30);
  });

  it("earns its own passives", () => {
    const t = atBedtime();
    t.meters.body = 30;
    t.startDuel(["hands"], 0);
    for (let i = 0; i < 40 && t.duel; i++) t.duelMove(t.duel.stamina >= 4 ? "hands" : "hold");
    t.sleep();
    expect(t.passives.has("nightOwl")).toBe(true);
    expect(effectsOf(new Set(["cleverFingers"])).skill.upHands).toBe(1);
  });

  it("keeps its records in a save", () => {
    const t = atBedtime();
    t.records.duelsWon = 4;
    t.records.duelMoves.ride = 7;
    const loaded = readProgress(JSON.parse(JSON.stringify(t.snapshot().progress)));
    expect(loaded.records.duelsWon).toBe(4);
    expect(loaded.records.duelMoves.ride).toBe(7);
  });
});
