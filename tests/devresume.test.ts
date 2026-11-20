import { describe, expect, it } from "vitest";
import { Fight } from "../src/game/fight";
import { Duel } from "../src/game/duel";
import { Tavern, type DevBattle } from "../src/game/tavern";

const SEATS = 11;

/** Through JSON and back, as sessionStorage keeps it over a reload. */
const reloaded = (battle: DevBattle | null): DevBattle => JSON.parse(JSON.stringify(battle)) as DevBattle;

function brawling(): Tavern {
  const t = new Tavern(SEATS);
  t.random = () => 0.3;
  t.playerBody = "Female";
  t.startTestFight();
  return t;
}

function dueling(): Tavern {
  const t = new Tavern(SEATS);
  t.random = () => 0.99;
  t.playerBody = "Female";
  t.gold = 50;
  t.passives.add("upstairsCurious");
  const inner = t as unknown as { phase: string; admirers: { kind: string }[] };
  inner.phase = "bedtime";
  inner.admirers = [{ kind: "farmer" }];
  t.meters.body = 30;
  expect(t.startDuel(["hands"], 10)).toBe(true);
  return t;
}

describe("the dev resume after a reload", () => {
  it("puts a brawl back on the same turn, and it plays on the same from there", () => {
    const t = brawling();
    t.fightMove("dodge");
    t.fightMove("strike");
    expect(t.fight).not.toBeNull();
    const kept = reloaded(t.devCaptureBattle());
    expect(kept.kind).toBe("fight");

    const back = brawling();
    back.fight = null;
    back.devResumeBattle(kept);
    expect(back.fight).toBeInstanceOf(Fight);
    expect(back.fight!.turns).toBe(t.fight!.turns);
    expect(back.fight!.log).toEqual(t.fight!.log);
    expect(back.fight!.stamina).toBe(t.fight!.stamina);
    expect(reloaded(back.devCaptureBattle())).toEqual(kept);

    // The same move from here, the same brawl.
    t.fightMove("strike");
    back.fightMove("strike");
    expect(reloaded(back.devCaptureBattle())).toEqual(reloaded(t.devCaptureBattle()));
  });

  it("puts a sex fight back too", () => {
    const t = dueling();
    t.duelMove("hands");
    const kept = reloaded(t.devCaptureBattle());
    expect(kept.kind).toBe("duel");

    const back = dueling();
    back.devResumeBattle(kept);
    expect(back.duel).toBeInstanceOf(Duel);
    expect(back.fight).toBeNull();
    expect(back.duel!.stamina).toBe(t.duel!.stamina);
    t.duelMove("hands");
    back.duelMove("hands");
    expect(reloaded(back.devCaptureBattle())).toEqual(reloaded(t.devCaptureBattle()));
  });

  it("keeps nothing when there's no battle", () => {
    expect(new Tavern(SEATS).devCaptureBattle()).toBeNull();
  });
});
