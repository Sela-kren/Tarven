import { describe, expect, it } from "vitest";
import { AFTER_CLIMAX, CLIMAX_WILL, Duel, type DuelArea, type DuelistStats } from "../src/game/duel";
import { effectsOf, emptyMeters, readProgress } from "../src/game/passives";
import { FANS_DELIGHTED, FANS_HAPPY } from "../src/game/ledger";
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

  it("doesn't end when she comes: it costs her willpower, and she comes down and goes on", () => {
    const d = duel(["pussy"], () => 0);
    const will = d.will;
    while (!d.outcome && d.climaxes === 0) d.act("kiss");
    expect(d.climaxes).toBe(1);
    expect(d.will).toBeLessThanOrEqual(will - CLIMAX_WILL);
    expect(d.pleasure).toBeGreaterThanOrEqual(AFTER_CLIMAX);
  });

  it("is lost when her willpower gives out, and plays on to the end, every climax counted", () => {
    // She only kisses; they go for the boldest she allowed every time. Little willpower to start.
    const d = duel(["pussy"], () => 0);
    d.will = 5;
    for (let i = 0; i < 40 && !d.defeated; i++) d.act("kiss");
    expect(d.defeated).toBe(true);
    // Lost, but not over: they're not done, and she can let them, or Stop.
    expect(d.outcome).toBeNull();
    const moves = d.choices().map((c) => c.move);
    expect(moves).toContain("endure");
    expect(d.choices().find((c) => c.move === "stop")?.disabled).toBe(false);
    for (let i = 0; i < 400 && !d.outcome; i++) d.act("endure");
    expect(d.outcome).toBe("lost");
    expect(d.active).toHaveLength(0);
    expect(d.climaxes).toBeGreaterThanOrEqual(1);
  });

  it("lost, Stop still ends it at once", () => {
    const d = duel(["pussy"], () => 0);
    d.will = 0;
    d.act("endure");
    expect(d.defeated).toBe(true);
    d.act("stop");
    expect(d.outcome).toBe("stopped");
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

  it("sends them home satisfied: fans at dawn, delighted if they gave in first, happy if she did", () => {
    const won = atBedtime();
    won.meters.body = 30;
    won.startDuel(["hands"], 0);
    for (let i = 0; i < 40 && won.duel; i++) won.duelMove(won.duel.stamina >= 4 ? "hands" : "hold");
    expect(won.fansTonight).toBe(FANS_DELIGHTED);
    const lost = atBedtime();
    lost.random = () => 0;
    lost.meters.pussy = 60;
    lost.startDuel(["pussy"], 0);
    lost.duel!.will = 5;
    for (let i = 0; i < 400 && lost.duel; i++) lost.duelMove(lost.duel.defeated ? "endure" : "kiss");
    expect(lost.records.duelsLost).toBe(1);
    expect(lost.fansTonight).toBe(FANS_HAPPY);
    const stopped = atBedtime();
    stopped.startDuel([], 0);
    stopped.duelMove("stop");
    expect(stopped.fansTonight).toBe(0);
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
    t.duel!.will = 5;
    for (let i = 0; i < 400 && t.duel; i++) t.duelMove(t.duel.defeated ? "endure" : "kiss");
    expect(t.records.duelsLost).toBe(1);
    expect(t.gold).toBe(30);
  });

  it("lost: she carries it (Overwhelmed), and every climax counts toward her lewdness", () => {
    const t = atBedtime();
    t.random = () => 0;
    t.meters.pussy = 60;
    const lewd = t.lewdness;
    t.startDuel(["pussy"], 0);
    t.duel!.will = 5;
    for (let i = 0; i < 400 && t.duel; i++) t.duelMove(t.duel.defeated ? "endure" : "kiss");
    expect(t.debuffs.some((d) => d.id === "overwhelmed")).toBe(true);
    expect(t.records.climaxes).toBeGreaterThanOrEqual(1);
    // Played after hours (+2), lost (+2 more from the duel records), and a point a climax.
    expect(t.lewdness).toBeGreaterThanOrEqual(lewd + 2 + t.records.climaxes);
  });

  it("lost, then stopped: still lost, and she still carries it", () => {
    const t = atBedtime();
    t.startDuel([], 0);
    t.duel!.will = 0;
    t.duelMove("endure");
    t.duelMove("stop");
    expect(t.duel).toBeNull();
    expect(t.debuffs.some((d) => d.id === "overwhelmed")).toBe(true);
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
