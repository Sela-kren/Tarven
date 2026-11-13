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

  it("leaves the cup of a guest thrown out mid-drink on the table, so no cup goes missing", () => {
    const { t, id } = withGuest();
    const guest = t.guests.find((g) => g.id === id)!;
    expect(guest.order).toBe("ale");
    guest.status = "eating";
    guest.eatLeft = 30;
    t.startFight(id);
    for (let i = 0; i < 30 && t.fight; i++) {
      const canThrow = !t.fight.choices().find((c) => c.move === "throw")!.disabled;
      t.fightMove(canThrow ? "throw" : "strike");
    }
    expect(t.takeFightResult()?.outcome).toBe("won");
    expect(guest.status).toBe("leaving");
    const left = t.messes.filter((m) => m.kind === "dishes" && m.spots.includes(guest.seat));
    expect(left.flatMap((m) => m.wares ?? [])).toEqual(["cup"]);
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

describe("trouble brewing before a brawl", () => {
  const NIGHT = { listeningTo: null, night: true };
  /** An angry guest, and a tick: with every roll at 0, trouble starts brewing at once. */
  function brewing(): { t: Tavern; id: number } {
    const { t, id } = withGuest();
    t.guests.find((g) => g.id === id)!.mood = "angry";
    t.takeMessages();
    t.tick(0.1, NIGHT);
    return { t, id };
  }

  it("shouts something hateful first, in the log, before any fight", () => {
    const { t, id } = brewing();
    expect(t.trouble).toMatchObject({ guestId: id, stage: "brewing" });
    expect(t.fight).toBeNull();
    const log = t.takeMessages();
    expect(log.some((line) => line.includes(`"${t.trouble!.shout}"`))).toBe(true);
  });

  it("then gets up and comes for her, and the brawl starts when they reach her", () => {
    const { t, id } = brewing();
    for (let i = 0; i < 50; i++) t.tick(0.1, NIGHT);
    expect(t.trouble?.stage).toBe("coming");
    expect(t.fight).toBeNull();
    expect(t.takeMessages().some((line) => line.includes("comes for you"))).toBe(true);
    t.troubleArrived(id);
    t.tick(0.1, NIGHT);
    expect(t.trouble).toBeNull();
    expect(t.fight?.guestId).toBe(id);
    expect(t.takeMessages().some((line) => line.startsWith("Brawl!"))).toBe(true);
  });

  it("starts anyway if they can't reach her in time", () => {
    const { t, id } = brewing();
    for (let i = 0; i < 160 && !t.fight; i++) t.tick(0.1, NIGHT);
    expect(t.fight?.guestId).toBe(id);
  });

  it("waits for her to finish a conversation before it starts", () => {
    const { t, id } = brewing();
    for (let i = 0; i < 50; i++) t.tick(0.1, NIGHT);
    (t as unknown as { talkingTo: number | null }).talkingTo = id;
    t.troubleArrived(id);
    t.tick(0.1, NIGHT);
    expect(t.fight).toBeNull();
    (t as unknown as { talkingTo: number | null }).talkingTo = null;
    t.tick(0.1, NIGHT);
    expect(t.fight?.guestId).toBe(id);
  });

  it("settles if she serves them while it brews", () => {
    const { t, id } = brewing();
    t.guests.find((g) => g.id === id)!.status = "eating";
    t.tick(0.1, NIGHT);
    expect(t.trouble).toBeNull();
    expect(t.takeMessages().some((line) => line.includes("stays put"))).toBe(true);
    expect(t.guests.find((g) => g.id === id)!.mood).toBe("calm");
    for (let i = 0; i < 160; i++) t.tick(0.1, NIGHT);
    expect(t.fight?.guestId).not.toBe(id);
  });

  it("still comes for her if it started while they were eating", () => {
    const { t, id } = withGuest();
    const guest = t.guests.find((g) => g.id === id)!;
    guest.status = "eating";
    guest.eatLeft = 60;
    guest.mood = "drunk";
    t.tick(0.1, NIGHT);
    expect(t.trouble?.guestId).toBe(id);
    for (let i = 0; i < 160 && !t.fight; i++) t.tick(0.1, NIGHT);
    expect(t.fight?.guestId).toBe(id);
    expect(t.fight?.drunk).toBe(true);
  });

  it("doesn't drain their patience or let them walk out while it brews", () => {
    const { t, id } = brewing();
    const guest = t.guests.find((g) => g.id === id)!;
    const patience = guest.patience;
    for (let i = 0; i < 30; i++) t.tick(0.1, NIGHT);
    expect(guest.patience).toBe(patience);
    expect(guest.status).toBe("waiting");
  });
});
