import { describe, expect, it } from "vitest";
import { Fight, FOE_GRAPPLES, pickGrapple, type FighterStats, type FoeGrapple } from "../src/game/fight";
import { GUEST_KIND_LIST } from "../src/game/guestroles";
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
    // Every roll misses for her and hits for them: her roll, their hit roll, then a fist rather than a grapple.
    let turn = 0;
    const f = new Fight(1, "soldier", false, BASE, () => [0.99, 0, 0.99][turn++ % 3]);
    for (let i = 0; i < 20 && !f.outcome; i++) f.act("strike");
    expect(f.outcome).toBe("lost");
  });

  it("can be talked down with Charm", () => {
    const charming = { ...BASE, levels: { ...BASE.levels, charm: 10 } };
    const f = new Fight(1, "farmer", false, charming, () => 0.1);
    f.act("talk");
    expect(f.outcome).toBe("talked");
  });

  it("has grapples as plain fight moves: grab, then headlock, hair-pull, tackle", () => {
    // Her moves all land. Their swing after the grab misses (a blow that lands breaks her hold); the headlock and
    // the tackle stagger them, so no swing follows those.
    const rolls = [0, 0.99, 0, 0, 0.99, 0];
    let i = 0;
    const f = new Fight(1, "soldier", false, BASE, () => rolls[i++] ?? 0.99);
    const moves = () => f.choices().map((c) => c.move);
    expect(moves()).toEqual(expect.arrayContaining(["grab", "hairpull", "tackle"]));
    expect(moves()).not.toContain("headlock");
    const before = f.foeStamina;
    f.act("grab");
    // With hold of their arm, the button is a headlock.
    expect(moves()).toContain("headlock");
    expect(moves()).not.toContain("grab");
    f.act("headlock");
    f.act("hairpull");
    f.act("tackle");
    expect(f.foeStamina).toBeLessThan(before);
    expect(f.reaching).toBe(false);
    expect(f.events).toEqual(expect.arrayContaining(["grab:hit", "headlock:hit", "hairpull:hit", "tackle:hit"]));
  });

  it("lets them grapple too, and none of it asks her anything", () => {
    // Her roll, their hit roll, the grapple roll (under 0.35), then which grapple.
    const rolls = [0.99, 0, 0, 0];
    let i = 0;
    const f = new Fight(1, "soldier", false, BASE, () => rolls[i++ % rolls.length]);
    f.act("strike");
    expect(f.events).toContain("their:grab");
    expect(f.stamina).toBeLessThan(f.maxStamina);
    expect(f.reaching).toBe(false);
  });

  it("has a whole set of grapples for them, each kind with favourites, every one a fight move", () => {
    const all = Object.keys(FOE_GRAPPLES) as FoeGrapple[];
    expect(all.length).toBeGreaterThanOrEqual(8);
    expect(pickGrapple("bandit", 0)).toBe("grab");
    // Swept across every roll, each kind lands on every grapple, and on its favourites most.
    for (const kind of GUEST_KIND_LIST) {
      const seen = new Map<FoeGrapple, number>();
      for (let roll = 0; roll < 1; roll += 0.001) {
        const g = pickGrapple(kind, roll);
        seen.set(g, (seen.get(g) ?? 0) + 1);
      }
      expect([...seen.keys()].sort()).toEqual([...all].sort());
    }
    const bandit = (g: FoeGrapple) => Array.from({ length: 1000 }, (_, i) => pickGrapple("bandit", i / 1000)).filter((x) => x === g).length;
    expect(bandit("bearhug")).toBeGreaterThan(bandit("sweep"));
    // A bear hug lands as a fight event, hurts, holds her, and asks her nothing.
    // Her roll misses, their hit roll lands, the grapple roll is under the line, then the roll for a bear hug.
    const hug = Array.from({ length: 1000 }, (_, n) => n / 1000).find((r) => pickGrapple("farmer", r) === "bearhug")!;
    const rolls = [0.99, 0, 0, hug];
    let i = 0;
    const f = new Fight(1, "farmer", false, BASE, () => rolls[i++] ?? 0.99);
    f.act("strike");
    expect(f.events).toContain("their:bearhug");
    expect(f.stamina).toBeLessThan(f.maxStamina);
    expect(f.reaching).toBe(false);
    expect(f.choices().find((c) => c.move === "strike")!.chance!).toBeLessThan(new Fight(1, "farmer", false, BASE, () => 0).choices()[0].chance!);
  });

  it("stops for a worked-up foe's reach, and picks up once she's answered", () => {
    const f = new Fight(1, "soldier", false, { ...BASE, workedUp: true }, () => 0);
    f.act("dodge");
    expect(f.reaching).toBe(true);
    // Nothing goes on until she answers.
    const log = f.log.length;
    f.act("strike");
    expect(f.log.length).toBe(log);
    f.afterReach("pull", f.will);
    expect(f.reaching).toBe(false);
    expect(f.events).toContain("reach:pull");
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

  /** She loses a brawl: her swings all miss, and theirs all land (her roll, their hit, a fist). */
  function lose(t: Tavern, id: number): void {
    t.startFight(id);
    let turn = 0;
    t.random = () => [0.99, 0, 0.99][turn++ % 3];
    (t.fight as unknown as { random: () => number }).random = t.random;
    for (let i = 0; i < 30 && t.fight; i++) t.fightMove("strike");
  }

  it("on a loss, costs gold and pride, then the winner only asks: stopping ends the night with nothing more", () => {
    const { t, id } = withGuest();
    t.gold = 50;
    t.playerBody = "Female";
    const meters = { ...t.meters };
    lose(t, id);
    expect(t.records.fightsLost).toBe(1);
    expect(t.gold).toBeLessThan(50);
    const gold = t.gold;
    // Nothing has happened: she's been asked, that's all.
    expect(t.brawlOffer).not.toBeNull();
    expect(t.duelOfferFrom).toBe("brawl");
    expect(t.duel).toBeNull();
    expect(METERS.every((m) => t.meters[m] === meters[m])).toBe(true);
    expect(t.takeAdultScene()).toBeNull();
    t.declineBrawlOffer();
    expect(t.brawlOffer).toBeNull();
    expect(t.phase).toBe("bedtime");
    expect(t.gold).toBe(gold);
    expect(METERS.every((m) => t.meters[m] === meters[m])).toBe(true);
    expect(t.guests.every((g) => g.status === "leaving")).toBe(true);
  });

  it("on a loss, going on leads to her own After Hours rules, and the night ends after", () => {
    const { t, id } = withGuest();
    t.gold = 50;
    t.playerBody = "Female";
    lose(t, id);
    expect(t.duelBlocked).toBeNull();
    expect(t.startDuel([], 0)).toBe(true);
    expect(t.brawlOffer).toBeNull();
    t.duelMove("stop");
    expect(t.duel).toBeNull();
    expect(t.takeDuelResult()).toMatchObject({ outcome: "stopped", brawl: true });
    expect(t.phase).toBe("bedtime");
  });

  it("on a loss to a roaring drunk, going on isn't possible", () => {
    const { t, id } = withGuest();
    t.playerBody = "Female";
    t.guests.find((g) => g.id === id)!.mood = "drunk";
    lose(t, id);
    expect(t.duelBlocked).toMatch(/too drunk/);
    expect(t.startDuel([], 0)).toBe(false);
  });

  it("asks a worked-up foe's reach on the touch screen, with Pull away there, and the fight goes on after", () => {
    const { t, id } = withGuest();
    t.playerBody = "Female";
    t.guests.find((g) => g.id === id)!.lust = 10;
    t.startFight(id);
    expect(t.fight).not.toBeNull();
    t.fightMove("dodge");
    expect(t.fight?.reaching).toBe(true);
    expect(t.inConversation).toBe(true);
    const labels = t.talkChoices.map((c) => c.label);
    expect(labels.length).toBeGreaterThanOrEqual(2);
    // Pull away is the last answer, as on every touch.
    t.chooseTalk(labels.length - 1);
    expect(t.fight?.reaching).toBe(false);
    expect(t.talkChoices.map((c) => c.label)).toEqual(["Back to the fight"]);
    t.chooseTalk(0);
    expect(t.inConversation).toBe(false);
    expect(t.fight).not.toBeNull();
  });

  it("lets a sober guest she talked down ask her after hours, which she can turn down", () => {
    const { t, id } = withGuest();
    t.playerBody = "Female";
    // Known well enough to be asked at all.
    (t as unknown as { passives: Set<string> }).passives.add("upstairsCurious");
    t.startFight(id);
    // Every roll at 0: the talk works.
    t.fightMove("talk");
    expect(t.takeFightResult()?.outcome).toBe("talked");
    t.phase = "bedtime";
    expect(t.duelOffer()).toBe(t.guests.find((g) => g.id === id)!.kind);
    expect(t.duelOfferFrom).toBe("talked");
    // Turning it down is just going to sleep.
    t.sleep();
    expect(t.phase).toBe("dawn");
    expect(t.duel).toBeNull();
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
