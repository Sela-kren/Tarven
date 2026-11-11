import { describe, expect, it } from "vitest";
import { Fight, type FighterStats } from "../src/game/fight";
import { effectsOf, METERS } from "../src/game/passives";
import { bodySkillBonus, levelOf, levelProgress, readExperience } from "../src/game/skills";
import { Tavern } from "../src/game/tavern";

const SEATS = 11;
const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };

/** A tavern open for the night with one seated guest, ready for trouble. */
function withGuest(): { t: Tavern; id: number } {
  const t = new Tavern(SEATS);
  t.random = () => 0;
  t.open();
  t.tick(0, { listeningTo: null, night: true });
  for (let i = 0; i < 40; i++) t.tick(0.1, { listeningTo: null, night: true });
  const guest = t.guests[0];
  t.guestArrived(guest.id);
  return { t, id: guest.id };
}

describe("levels", () => {
  it("climb with experience up to 10", () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(10)).toBe(2);
    expect(levelOf(9999)).toBe(10);
    expect(levelProgress(15)).toEqual([5, 15]);
    expect(levelProgress(9999)).toBeNull();
    expect(bodySkillBonus(1).ease).toBe(0);
    expect(bodySkillBonus(3).ease).toBe(4);
  });

  it("are given outright by some passives, like Karryn's skill level ups", () => {
    expect(effectsOf(new Set(["sweetLips"])).skill.mouth).toBe(1);
    expect(effectsOf(new Set(["bouncer"])).skill.strength).toBe(1);
  });

  it("grow from what she does, and make touches easier", () => {
    const { t, id } = withGuest();
    t.playerBody = "Female";
    expect(t.level("mouth")).toBe(1);
    t.xp.mouth = 25;
    expect(t.level("mouth")).toBe(3);
    t.meters.mouth = 30;
    expect(t.desireFor("lips")).toBeCloseTo(3.4);
    expect(id).toBeGreaterThan(0);
  });

  it("are kept in a save, and a broken entry is dropped", () => {
    const t = new Tavern(SEATS);
    t.xp.charm = 30;
    t.xp.upBed = 12;
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.xp.charm).toBe(30);
    expect(loaded.level("upBed")).toBe(2);
    expect(readExperience({ charm: 5, nonsense: 3, mind: -2 })).toEqual({ charm: 5 });
  });
});

describe("a brawl", () => {
  it("can only end in a throw once they're worn down", () => {
    const f = new Fight(1, "farmer", false, BASE, () => 0);
    expect(f.choices().find((c) => c.move === "throw")?.disabled).toBe(true);
    while (f.foeStamina > f.foeMax * 0.3) f.act("strike");
    expect(f.choices().find((c) => c.move === "throw")?.disabled).toBe(false);
    if (!f.outcome) f.act("throw");
    expect(f.outcome).toBe("won");
    expect(f.xp.strength).toBeGreaterThan(0);
  });

  it("is lost when her stamina runs out", () => {
    // Every roll misses for her and hits for them.
    let turn = 0;
    const f = new Fight(1, "soldier", false, BASE, () => (turn++ % 2 === 0 ? 0.99 : 0));
    for (let i = 0; i < 20 && !f.outcome; i++) f.act("strike");
    expect(f.outcome).toBe("lost");
  });

  it("can be talked down with Charm", () => {
    const charming = { ...BASE, levels: { ...BASE.levels, charm: 10 } };
    const f = new Fight(1, "farmer", false, charming, () => 0.1);
    f.act("talk");
    expect(f.outcome).toBe("talked");
  });
});

describe("brawls in the tavern", () => {
  it("throws the guest out when she wins, and the room respects her for it", () => {
    const { t, id } = withGuest();
    const respect = t.persona.respect;
    t.startFight(id);
    expect(t.fight).not.toBeNull();
    for (let i = 0; i < 30 && t.fight; i++) {
      const canThrow = !t.fight.choices().find((c) => c.move === "throw")!.disabled;
      t.fightMove(canThrow ? "throw" : "strike");
    }
    expect(t.fight).toBeNull();
    expect(t.records.fightsWon).toBe(1);
    expect(t.guests.find((g) => g.id === id)?.status).toBe("leaving");
    expect(t.persona.respect).toBeGreaterThan(respect);
    expect(t.takeFightResult()?.outcome).toBe("won");
  });

  it("costs only gold and pride when she loses", () => {
    const { t, id } = withGuest();
    t.gold = 50;
    t.playerBody = "Female";
    t.startFight(id);
    // Her swings all miss, and theirs all land: her roll comes first, then theirs.
    let turn = 0;
    t.random = () => (turn++ % 2 === 0 ? 0.99 : 0);
    (t.fight as unknown as { random: () => number }).random = t.random;
    const meters = { ...t.meters };
    for (let i = 0; i < 30 && t.fight; i++) t.fightMove("strike");
    expect(t.records.fightsLost).toBe(1);
    expect(t.gold).toBeLessThan(50);
    // Losing never leads to anything else.
    expect(METERS.every((m) => t.meters[m] === meters[m])).toBe(true);
    expect(t.takeAdultScene()).toBeNull();
    expect(t.records.invitations).toBe(0);
  });
});
