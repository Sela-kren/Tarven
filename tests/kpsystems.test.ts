import { describe, expect, it } from "vitest";
import { CROWD_MAX, crowdFactor, defeatFor, DEFEAT_IDS, DEFEATS } from "../src/game/defeat";
import { Fight, type FighterStats } from "../src/game/fight";
import { effectsOf, emptyMeters, newRecords, noEffects, PASSIVE_BY_ID, type Meters } from "../src/game/passives";
import { growthOf, rentRooms, ROOM_PRICE, ROOMS, runShow } from "../src/game/sidejobs";
import { TRINKET_BY_ID, trinketsOwned } from "../src/game/trinkets";
import { sceneReady } from "../src/game/brawlscenes";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });

describe("defeats (KP's defeat battles)", () => {
  it("go by where it ended and who won", () => {
    expect(defeatFor({ place: "here", kind: "bandit", heat: 0 })).toBe("taproom");
    expect(defeatFor({ place: "yard", kind: "bandit", heat: 0 })).toBe("yard");
    expect(defeatFor({ place: "upstairs", kind: "bandit", heat: 0 })).toBe("room");
    expect(defeatFor({ place: "here", kind: "smuggler", heat: 0 })).toBe("storeroom");
    expect(defeatFor({ place: "here", kind: "soldier", heat: 0 })).toBe("garrison");
    expect(defeatFor({ place: "here", kind: "soldier", heat: 99 })).toBe("baron");
    expect(defeatFor({ place: "here", kind: "bandit", heat: 0, invasion: true })).toBe("room");
  });

  it("hold more the more her records say, up to a cap; her room fewer", () => {
    const r = newRecords();
    expect(crowdFactor(r, "taproom")).toBe(2);
    r.taproomPartners = 100;
    r.fightsLost = 30;
    expect(crowdFactor(r, "taproom")).toBe(CROWD_MAX);
    expect(crowdFactor(r, "room")).toBe(3);
  });

  it("each has its lines and a passive", () => {
    for (const id of DEFEAT_IDS) {
      expect(DEFEATS[id].start.length).toBeGreaterThan(0);
      expect(PASSIVE_BY_ID.has(`defeat_${id}`)).toBe(true);
    }
  });
});

describe("trinkets (KP's accessories)", () => {
  it("come with her Charm, or her records", () => {
    const r = newRecords();
    expect(trinketsOwned(1, r).map((t) => t.id)).toContain("ironRing");
    expect(trinketsOwned(1, r).map((t) => t.id)).not.toContain("lipTint");
    r.fightsWon = 10;
    expect(trinketsOwned(1, r).map((t) => t.id)).toContain("brawlerWraps");
  });

  it("move what a scene needs of her", () => {
    const e = noEffects();
    TRINKET_BY_ID.get("lipTint")!.wear(e);
    const her = { desire: meters({ mouth: 72, cock: 60 }), wet: false, exposure: 0 };
    expect(sceneReady("mouth", her)).toBe(false);
    expect(sceneReady("mouth", { ...her, ease: e.sceneEase })).toBe(true);
  });
});

describe("side jobs (KP's)", () => {
  it("a dance pays by the room, and more the more she shows", () => {
    const shy = runShow({ guests: 6, men: 4, fame: 0, exposure: 0, slutLevel: 0 });
    const bare = runShow({ guests: 6, men: 4, fame: 0, exposure: 1, slutLevel: 0 });
    expect(bare.gold).toBeGreaterThan(shy.gold);
    expect(bare.respect).toBeLessThan(shy.respect);
  });

  it("the rooms let to who'd stay, and the keen ones ask", () => {
    const r = rentRooms([9, 8, 2, 1], 6);
    expect(r.rented).toBe(ROOMS);
    expect(r.gold).toBe(ROOMS * ROOM_PRICE);
    expect(r.asked).toBe(2);
  });

  it("her hair grows night by night", () => {
    expect(growthOf(0)).toBe("bare");
    expect(growthOf(100)).toBe("wild");
  });
});

describe("toys and Deny (KP's)", () => {
  it("a noble may put a toy in her, asked; in, it works on her", () => {
    const f = new Fight(1, "noble", false, { ...BASE, desire: meters({ pussy: 90, butt: 90, cock: 90 }), pleasure: 60, exposure: 1, sexOk: true, will: 100, maxWill: 100, extraStamina: 200 }, () => 0.01);
    // Not angry, not yet erect: he'd rather have her, and reaches for a toy.
    f.foes[0].angry = false;
    f.foes[0].anger = 0;
    for (let i = 0; i < 10 && !f.offeringToy && !f.outcome; i++) {
      if (f.offering) f.answerOffer("pull");
      f.act("dodge");
    }
    expect(f.offeringToy).not.toBeNull();
    f.answerOffer("yes");
    expect(f.toys.size).toBe(1);
    expect(f.choices().some((c) => c.move === "pullToys")).toBe(true);
    f.act("pullToys");
    expect(f.toys.size).toBe(0);
  });

  it("Deny is there only with her dom side", () => {
    const stats = { ...BASE, desire: meters({ cock: 50 }), pleasure: 0, will: 100, maxWill: 100 };
    expect(new Fight(1, "bandit", false, stats, () => 0.5).choices().some((c) => c.move === "deny")).toBe(false);
    expect(new Fight(1, "bandit", false, { ...stats, denyOk: true }, () => 0.5).choices().some((c) => c.move === "deny")).toBe(true);
  });

  it("the new passives add up", () => {
    expect(() => effectsOf(new Set(["barDancer", "frontDesk", "riotBreaker", "toyBox"]))).not.toThrow();
  });
});
