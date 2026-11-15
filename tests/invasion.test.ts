import { describe, expect, it } from "vitest";
import { statsOf } from "../src/game/guestroles";
import { INVADERS_MAX, INVASION_MAX, invaderCount, invasionChance } from "../src/game/invasion";
import { Tavern } from "../src/game/tavern";

const SEATS = 11;
const calm = { desire: 0, slutLevel: 0, fame: 0, candidates: 1 };

/** Bedtime, her worked up enough to be restless, and one guest who left wanting her tonight. */
function bedtime(consentOff: boolean): Tavern {
  const t = new Tavern(SEATS);
  t.playerBody = "Female";
  t.open();
  t.phase = "bedtime";
  for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 90;
  t.touchSettings.autoTouch = consentOff;
  t.touchSettings.agreed = consentOff;
  t.leftWanting.push({ kind: "bandit", stats: statsOf("bandit") });
  t.random = () => 0;
  return t;
}

describe("night invasion, Karryn's Prison style (Consent off)", () => {
  it("nobody out there, nobody comes; louder, lewder and better known, likelier; never past the cap", () => {
    expect(invasionChance({ ...calm, candidates: 0, desire: 100 })).toBe(0);
    const base = invasionChance(calm);
    expect(base).toBeGreaterThan(0);
    expect(invasionChance({ ...calm, desire: 90 })).toBeGreaterThan(base);
    expect(invasionChance({ ...calm, slutLevel: 3 })).toBeGreaterThan(base);
    expect(invasionChance({ ...calm, fame: 80 })).toBeGreaterThan(base);
    expect(invasionChance({ desire: 100, slutLevel: 20, fame: 100, candidates: 5 })).toBe(INVASION_MAX);
  });

  it("one comes in, more the louder she was, never more than are out there or the most there can be", () => {
    expect(invaderCount(1, 100, 0)).toBe(1);
    expect(invaderCount(5, 100, 0)).toBe(INVADERS_MAX);
    expect(invaderCount(5, 0, 0.99)).toBe(1);
  });

  it("Consent on: never. She eases the ache and sleeps easy", () => {
    const t = bedtime(false);
    expect(t.invasionChance).toBe(0);
    expect(t.easeAche()).toBe(false);
    expect(t.fight).toBeNull();
    expect(t.meters.cock).toBe(0);
  });

  it("Consent off: her noise draws them in. Still worked up, just come (they move first), bare on her bed", () => {
    const t = bedtime(true);
    expect(t.invasionChance).toBeGreaterThan(0);
    expect(t.easeAche()).toBe(true);
    const fight = t.fight!;
    expect(fight).not.toBeNull();
    expect(t.invading).toBe(true);
    expect(fight.dazed).toBe(true);
    expect(fight.exposure).toBe(1);
    expect(fight.events).toContain("invade");
    expect(t.meters.cock).toBe(90);
    expect(t.records.invaded).toBe(1);
  });

  it("sees them off: the door's barred, and it's bed", () => {
    const t = bedtime(true);
    t.easeAche();
    const fight = t.fight!;
    for (let i = 0; i < 60 && t.fight; i++) {
      const moves = fight.choices().filter((c) => !c.disabled).map((c) => c.move);
      const move = (["recover", "throw", "strike"] as const).find((m) => moves.includes(m)) ?? moves[0];
      t.fightMove(move);
      if (fight.offering) fight.answerOffer("pull");
    }
    const result = t.takeFightResult();
    expect(result?.invasion).toBe(true);
    expect(["won", "talked"]).toContain(result?.outcome);
    expect(t.fight).toBeNull();
  });

  it("loses: KP's defeat right there in her room, with no Stop", () => {
    const t = bedtime(true);
    t.easeAche();
    for (let i = 0; i < 80 && t.fight; i++) {
      const fight = t.fight;
      if (fight.downed) t.fightMove("stayDown");
      else if (fight.dazed) t.fightMove("recover");
      else if (fight.taken) t.fightMove("goAlong");
      else t.fightMove("dodge");
      fight.stamina = Math.min(fight.stamina, 1);
    }
    const result = t.takeFightResult();
    expect(result?.outcome).toBe("lost");
    expect(t.duel?.forced).toBe(true);
    expect(t.duel?.choices().some((c) => c.move === "stop")).toBe(false);
  });

  it("who might come back: those who left wanting her, sober, and never the Baron", () => {
    const t = new Tavern(SEATS);
    t.playerBody = "Female";
    t.random = () => 0.99;
    t.open();
    for (let i = 0; i < 40; i++) t.tick(0.1, { listeningTo: null, night: true });
    const g = t.guests[0];
    expect(g).toBeDefined();
    g.lust = 9;
    g.mood = "lust";
    g.female = false;
    (t as unknown as { sendOff: (guest: typeof g) => void }).sendOff(g);
    expect(t.leftWanting.length).toBe(1);
  });
});
