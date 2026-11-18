import { describe, expect, it } from "vitest";
import { DEFEAT_AT_ONCE, DEFEAT_IDS, DEFEATS, defeatPlay, type DefeatId } from "../src/game/defeat";
import { Duel, ENDURE_STAMINA, MAX_PARTNERS, type DuelArea, type DuelistStats, type PartnerSetup } from "../src/game/duel";
import { DuelStage, type StagePartner } from "../src/game/duelstage";
import { emptyMeters } from "../src/game/passives";
import { SCENE_POSES } from "../src/game/sexpose";
import { Tavern } from "../src/game/tavern";

/**
 * Defeats played like Karryn's Prison's defeat battles (defeat.ts defeatPlay, duel.ts DuelDefeat): up to 4 on her at
 * once and the rest stepping in as spots free up, too tired to act with no stamina and no willpower, and each
 * defeat's slots deciding what of her is in play.
 */

const BASE: DuelistStats = { level: () => 1, sens: emptyMeters(), power: 0, resist: 0, stamina: 0, hold: 0, edge: 0, undress: 0 };
const ALL: DuelArea[] = ["hands", "mouth", "breasts", "butt", "pussy"];
const men = (n: number): PartnerSetup[] => Array.from({ length: n }, () => ({ kind: "bandit", female: false }));

function defeat(id: DefeatId, n: number, forced = false, random: () => number = () => 0.5): Duel {
  return new Duel("bandit", new Set(ALL), 0, BASE, random, men(n), "plain", forced, defeatPlay(id));
}

describe("men join as spots free up (KP's onTurnEndSpecial_defeated…)", () => {
  it("starts with at most 4 on her, the rest of the total waiting", () => {
    const d = defeat("taproom", 7);
    expect(DEFEAT_AT_ONCE).toBe(4);
    expect(d.atOnce).toBe(4);
    expect(d.active.length).toBe(4);
    expect(d.waiting.length).toBe(3);
    expect(d.everyone).toBe(7);
  });

  it("fills each freed spot from the line until the total's reached, then stops", () => {
    const d = defeat("taproom", 7);
    let steppedIn = 0;
    for (let i = 0; i < 20 && !d.outcome; i++) {
      // One of them finishes this round.
      d.active[0].pleasure = 100;
      const before = d.partners.length;
      d.act("endure");
      steppedIn += d.partners.length - before;
      expect(d.active.length).toBeLessThanOrEqual(4);
      expect(d.partners.length).toBeLessThanOrEqual(7);
    }
    expect(steppedIn).toBe(3);
    expect(d.partners.length).toBe(7);
    expect(d.waiting.length).toBe(0);
    expect(d.outcome).not.toBeNull();
    expect(d.log.filter((l) => l.includes("steps into the free spot")).length).toBe(3);
  });

  it("never has more than 4 on her at once, however it plays", () => {
    for (const id of DEFEAT_IDS) {
      const d = defeat(id, 8, true, () => 0.3);
      for (let i = 0; i < 400 && !d.outcome; i++) {
        d.act(d.tooTired ? "endure" : d.choices().find((c) => !c.disabled)!.move);
        expect(d.active.length).toBeLessThanOrEqual(4);
      }
      expect(d.outcome).toBe(d.defeated ? "lost" : "won");
      expect(d.partners.length).toBe(8);
    }
  });

  it("leaves other games as they were: six at once", () => {
    const d = new Duel("bandit", new Set(ALL), 0, BASE, () => 0.5, men(8));
    expect(d.atOnce).toBe(MAX_PARTNERS);
    expect(d.active.length).toBe(MAX_PARTNERS);
    expect(d.defeat).toBeNull();
  });
});

describe("too tired to act (KP's STATE_DISABLED)", () => {
  it("with no stamina and no willpower she can only let them; it lifts once she has breath back", () => {
    const d = defeat("garrison", 1);
    d.stamina = 0;
    d.will = 0;
    expect(d.tooTired).toBe(true);
    expect(d.choices().map((c) => c.move)).toEqual(["endure", "stop"]);
    const n = d.entries.length;
    d.act("kiss");
    d.act("hold");
    expect(d.entries.length).toBe(n);
    d.act("endure");
    // Let them: a little stamina back, less what one man wears off her.
    expect(d.stamina).toBe(ENDURE_STAMINA - 1);
    expect(d.tooTired).toBe(false);
    expect(d.log.some((l) => l.includes("breath back"))).toBe(true);
    expect(d.choices().some((c) => c.move === "kiss")).toBe(true);
  });

  it("comes on when their moves wear the last of her stamina off", () => {
    const d = defeat("taproom", 4);
    d.will = 0;
    d.stamina = 2;
    expect(d.tooTired).toBe(false);
    // A kiss takes the last of her stamina; their moves leave her nothing to get back.
    d.act("kiss");
    expect(d.stamina).toBe(0);
    expect(d.tooTired).toBe(true);
    expect(d.log.some((l) => l.includes("Too tired"))).toBe(true);
  });

  it("is only in a defeat", () => {
    const d = new Duel("bandit", new Set(ALL), 0, BASE, () => 0.5, men(2));
    d.stamina = 0;
    d.will = 0;
    expect(d.tooTired).toBe(false);
  });
});

describe("each defeat's slots are the parts of her in play", () => {
  it("maps the slots to the game's parts of her, and the others to men standing round", () => {
    expect(defeatPlay("taproom")).toMatchObject({ areas: ["mouth", "hands"], holds: { mouth: 1, hands: 2 }, others: 4, atOnce: 4 });
    expect(defeatPlay("yard")).toMatchObject({ areas: ["pussy", "butt"], others: 4 });
    expect(defeatPlay("room")).toMatchObject({ others: 2 });
    expect(new Set(defeatPlay("garrison").areas)).toEqual(new Set(["pussy", "butt", "mouth", "breasts"]));
    expect(defeatPlay("garrison").others).toBe(0);
    expect(new Set(defeatPlay("baron").areas)).toEqual(new Set(ALL));
  });

  it("restricts the game to them, even with everything offered", () => {
    for (const id of DEFEAT_IDS) {
      const d = defeat(id, 3);
      expect([...d.areas].sort()).toEqual([...defeatPlay(id).areas].sort());
    }
    // ...and only what she offered of them (Consent on, her rules).
    const d = new Duel("bandit", new Set<DuelArea>(["hands", "pussy"]), 0, BASE, () => 0.5, men(2), "plain", false, defeatPlay("yard"));
    expect([...d.areas]).toEqual(["pussy"]);
  });

  it("in the yard they take only her pussy and rear, one each; the rest stand round and finish on her", () => {
    const d = defeat("yard", 6, true, () => 0.2);
    let stood = 0;
    for (let i = 0; i < 300 && !d.outcome; i++) {
      d.act("endure");
      for (const p of d.active) expect([null, "pussy", "butt"]).toContain(p.area);
      expect(d.active.filter((p) => p.area === "pussy").length).toBeLessThanOrEqual(1);
      expect(d.active.filter((p) => p.area === "butt").length).toBeLessThanOrEqual(1);
      stood += d.entries.filter((e) => e.action === "Works himself up").length > 0 ? 1 : 0;
    }
    expect(stood).toBeGreaterThan(0);
    expect(d.loads).toBe(6);
  });

  it("each defeat's stand-in is a pose the big picture has", () => {
    for (const id of DEFEAT_IDS) expect(SCENE_POSES[DEFEATS[id].standIn]).toBeDefined();
  });

  it("the big picture holds the stand-in pose the whole defeat, the next one in at its heart as one's done", () => {
    const stage = new DuelStage();
    const them: StagePartner[] = [1, 2, 3].map((id) => ({ id, kind: "bandit", female: false, done: false }));
    stage.start(true, them, false, "bentover");
    expect(stage.cast).toMatchObject({ scene: "bentover", lead: 1 });
    stage.moment({ side: "partner", part: "mouth", stage: 2, kind: "bandit", partner: 2 }, them, { defeated: false, alt: false });
    expect(stage.cast?.scene).toBe("bentover");
    them[0].done = true;
    stage.moment({ side: "partner", part: "pussy", stage: 2, kind: "bandit", partner: 3 }, them, { defeated: true, alt: false });
    expect(stage.cast?.scene).toBe("bentover");
    expect(stage.cast?.lead).not.toBe(1);
  });
});

describe("the consent rule holds", () => {
  it("Consent on: Stop is always there and always works, too tired or not", () => {
    const d = defeat("taproom", 6);
    expect(d.choices().some((c) => c.move === "stop")).toBe(true);
    d.stamina = 0;
    d.will = 0;
    expect(d.choices().some((c) => c.move === "stop")).toBe(true);
    d.act("stop");
    expect(d.outcome).toBe("stopped");
  });

  it("Consent off: no Stop, and asking for it does nothing", () => {
    const d = defeat("taproom", 6, true);
    expect(d.choices().some((c) => c.move === "stop")).toBe(false);
    d.stamina = 0;
    d.will = 0;
    expect(d.choices().map((c) => c.move)).toEqual(["endure"]);
    d.act("stop");
    expect(d.outcome).toBeNull();
  });
});

describe("in the tavern", () => {
  /** A tavern open for the night with one seated guest, ready for trouble (as in fight.test.ts). */
  function withGuest(): { t: Tavern; id: number } {
    const t = new Tavern(11);
    t.random = () => 0;
    t.open();
    t.tick(0, { listeningTo: null, night: true });
    for (let i = 0; i < 40; i++) t.tick(0.1, { listeningTo: null, night: true });
    const guest = t.guests[0];
    t.guestArrived(guest.id);
    return { t, id: guest.id };
  }
  function lose(t: Tavern, id: number): void {
    t.startFight(id);
    let turn = 0;
    const rolls = t.fight?.desire ? [0.99, 0, 0, 0.99] : [0.99, 0, 0.99];
    t.random = () => rolls[turn++ % rolls.length];
    (t.fight as unknown as { random: () => number }).random = t.random;
    (t.fight as unknown as { joinQueue: unknown[] }).joinQueue.length = 0;
    for (let i = 0; i < 30 && t.fight; i++) t.fightMove(t.fight.downed ? "stayDown" : "strike");
  }

  it("Consent off: a lost brawl plays as its defeat, its slots and stand-in pose with it", () => {
    const { t, id } = withGuest();
    t.playerBody = "Female";
    t.touchSettings.autoTouch = true;
    t.touchSettings.agreed = true;
    lose(t, id);
    const duel = t.duel!;
    expect(duel.forced).toBe(true);
    const which = t.defeatTonight!;
    expect(duel.defeat?.id).toBe(which);
    expect(duel.atOnce).toBeLessThanOrEqual(4);
    for (const a of duel.areas) expect(defeatPlay(which).areas).toContain(a);
    expect(t.defeatPose).toBe(DEFEATS[which].standIn);
    expect(duel.log.some((l) => l.startsWith(DEFEATS[which].name))).toBe(true);
  });

  it("Consent on: the defeat she says yes to has its slots, and Stop ends it", () => {
    const { t, id } = withGuest();
    t.gold = 50;
    t.playerBody = "Female";
    lose(t, id);
    expect(t.startDuel([], 0, "plain", [], "yard")).toBe(true);
    expect(t.duel?.defeat?.id).toBe("yard");
    expect(t.defeatPose).toBe(DEFEATS.yard.standIn);
    expect(t.duel?.choices().some((c) => c.move === "stop")).toBe(true);
    t.duelMove("stop");
    expect(t.duel).toBeNull();
    expect(t.defeatPose).toBeNull();
    expect(t.takeDuelResult()).toMatchObject({ outcome: "stopped", brawl: true });
  });
});
