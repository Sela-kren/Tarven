import { describe, expect, it } from "vitest";
import { DEBUFFS } from "../src/game/debuffs";
import { DOUBLED_DEBT, FANS_FILTHY, FANS_HAPPY, FANS_WALKOUT, HOUSES, PARTNER_FANS, PARTNER_GOLD, RUIN_CORRUPTION } from "../src/game/ledger";
import { DEBT, HEAT_MAX, NIGHTS, RAID_FINE, Tavern } from "../src/game/tavern";

const SEATS = 11;
const idle = { listeningTo: null, night: true };

/** A tavern whose story runs on fans, as in the game (the tests' setup turns it off everywhere else). */
function story(): Tavern {
  const t = new Tavern(SEATS);
  t.storyBeats = true;
  return t;
}

/** Plays out tonight with nobody served, to bed, and on to the next morning (`fans` set as she goes to bed). */
function nextMorning(t: Tavern, fans?: number): void {
  if (t.phase === "day") {
    t.open();
    t.tick(0, idle);
  }
  for (let i = 0; i < 4000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const guest of [...t.guests]) {
      if (guest.status === "arriving") t.guestArrived(guest.id);
      if (guest.status === "leaving") t.guestLeft(guest.id);
    }
  }
  t.chooseLastCall(0);
  // A night of walkouts runs the heat up; a raid isn't what these tests are about.
  t.heat = Math.min(t.heat, HEAT_MAX - 1);
  t.sleep();
  if (fans !== undefined) t.fans = fans;
  t.nextNight();
}

describe("fans", () => {
  it("come from guests leaving happy, and go with walkouts and a filthy room, counted at dawn", () => {
    const t = story();
    t.open();
    t.tick(0, idle);
    // Nobody served all night: everyone walks out.
    for (let i = 0; i < 4000 && t.phase === "service"; i++) {
      t.tick(0.1, idle);
      for (const guest of [...t.guests]) {
        if (guest.status === "arriving") t.guestArrived(guest.id);
        if (guest.status === "leaving") t.guestLeft(guest.id);
      }
    }
    expect(t.fansTonight).toBe(FANS_WALKOUT * t.walkouts);
    t.fans = 100;
    t.chooseLastCall(0);
    const messy = t.messes.length >= 4 ? FANS_FILTHY : 0;
    t.sleep();
    expect(t.fans).toBe(Math.max(0, 100 + FANS_WALKOUT * t.walkouts + messy));
    expect(t.fansTonight).toBe(0);
    expect(FANS_HAPPY).toBe(5);
  });
});

describe("the beats", () => {
  it("open on the salt, then wait for fans: a side night until the next beat's reached", () => {
    const t = story();
    expect(t.plan).toBe(NIGHTS[0]);
    nextMorning(t, 10);
    // Ten fans: not enough for the deserter (50), so a night between beats, with a side rumour.
    expect(t.storyNight).toBe(-1);
    expect(t.plan).not.toBe(NIGHTS[1]);
    expect(NIGHTS.map((n) => n.lastCall)).not.toContain(t.plan.lastCall);
    nextMorning(t, 60);
    expect(t.plan).toBe(NIGHTS[1]);
    expect(t.beatsDone.has("deserter")).toBe(true);
  });

  it("fire one a morning, in order, however many fans she has", () => {
    const t = story();
    nextMorning(t, 999);
    expect(t.beatsDone.has("deserter")).toBe(true);
    expect(t.beatsDone.has("cider")).toBe(false);
    nextMorning(t, 999);
    expect(t.beatsDone.has("cider")).toBe(true);
  });
});

describe("the Village Ledger", () => {
  /** A morning with Hollin at the door: the salt and the deserter played, and her fans past his. */
  function hollinAtTheDoor(): Tavern {
    const t = story();
    nextMorning(t, 60);
    nextMorning(t, 110);
    return t;
  }

  it("starts her 6th of 6, with the Cider Barn above her", () => {
    const t = story();
    expect(t.rank).toBe(6);
    expect(t.houseAbove?.id).toBe("cider");
  });

  it("brings a fallen house's boss in, to partner with or ruin", () => {
    const t = hollinAtTheDoor();
    expect(t.pendingBeat?.kind).toBe("house");
    expect(t.beatCard?.title).toContain("Hollin's Cider Barn");
    expect(t.rank).toBe(5);
    expect(t.houseAbove?.id).toBe("bakehouse");
  });

  it("partnered, the house sends gold and regulars every night", () => {
    const t = hollinAtTheDoor();
    const trust = t.trust;
    t.answerHouse("partner");
    expect(t.houses.cider).toBe("partner");
    expect(t.trust).toBe(trust + 1);
    expect(t.pendingBeat).toBeNull();
    t.open();
    t.tick(0, idle);
    const gold = t.gold;
    const fans = t.fans;
    t.phase = "lastcall";
    t.chooseLastCall(0);
    t.sleep();
    expect(t.gold).toBeGreaterThanOrEqual(gold + PARTNER_GOLD);
    expect(t.fans).toBeGreaterThanOrEqual(fans + PARTNER_FANS - 15);
  });

  it("ruined, the house closes and half its fans come to her, for corruption and heat", () => {
    const t = hollinAtTheDoor();
    const fans = t.fans;
    const heat = t.heat;
    const corruption = t.corruption;
    t.answerHouse("ruin");
    expect(t.houses.cider).toBe("ruin");
    expect(t.fans).toBe(fans + HOUSES[0].fans / 2);
    expect(t.heat).toBe(heat + 1);
    expect(t.corruption).toBe(corruption + RUIN_CORRUPTION);
    // Its boss gives up what they know either way.
    expect(t.news).toContain(HOUSES[0].clue);
  });
});

describe("Pell and the debt", () => {
  /** Every beat before Pell's played, and the morning he's at the bar. */
  function pellAtDawn(): Tavern {
    const t = story();
    for (const id of ["deserter", "cider", "meeting", "bakehouse"]) t.beatsDone.add(id);
    // Ruined, so no partner gold muddles what Pell takes.
    t.houses = { cider: "ruin", bakehouse: "ruin" };
    nextMorning(t, 260);
    return t;
  }

  it("comes at 250 fans: promise him the book, or the debt doubles", () => {
    const refuse = pellAtDawn();
    expect(refuse.beatCard?.title).toBe("Pell at dawn");
    expect(refuse.owed).toBe(DEBT);
    refuse.answerPell(false);
    expect(refuse.owed).toBe(DOUBLED_DEBT);
    const promise = pellAtDawn();
    promise.answerPell(true);
    expect(promise.bookPromised).toBe(true);
    expect(promise.owed).toBe(DEBT);
  });

  it("collects a hundred as the Canteen falls; short, she's in the Baron's debt, never foreclosed", () => {
    const t = pellAtDawn();
    t.answerPell(false);
    t.gold = 40;
    nextMorning(t, 310);
    expect(t.beatsDone.has("canteen")).toBe(true);
    expect(t.owed).toBe(DOUBLED_DEBT - 40);
    expect(t.arrears).toBe(60);
    expect(t.debuffs.some((d) => d.id === "inDebt")).toBe(true);
    expect(t.takeBaronVisit()).toEqual({ due: 100, paid: 40, owed: DOUBLED_DEBT - 40 });
    expect(t.phase).toBe("day");
    // The next collection wants the shortfall on top; caught up, the debuff goes.
    t.answerHouse("partner");
    t.gold = 500;
    nextMorning(t, 410);
    expect(t.takeBaronVisit()?.due).toBe(160);
    expect(t.arrears).toBe(0);
    expect(t.debuffs.some((d) => d.id === "inDebt")).toBe(false);
  });

  it("promised the book, he asks after it instead of taking gold", () => {
    const t = pellAtDawn();
    t.answerPell(true);
    t.gold = 200;
    const heat = t.heat;
    nextMorning(t, 310);
    expect(t.gold).toBeGreaterThanOrEqual(200);
    expect(t.heat).toBeGreaterThan(heat - 1);
    expect(t.news.some((l) => l.includes("The book, innkeeper"))).toBe(true);
  });
});

describe("first in Tarven", () => {
  it("comes when she passes the Copper Bell, and the nights go on", () => {
    const t = story();
    for (const b of ["deserter", "cider", "meeting", "bakehouse", "pell", "canteen", "tollgate"]) t.beatsDone.add(b);
    t.houses = { cider: "partner", bakehouse: "partner", canteen: "partner", tollgate: "partner" };
    t.bookPromised = true;
    nextMorning(t, 520);
    expect(t.beatCard?.title).toContain("The Copper Bell");
    t.answerHouse("partner");
    expect(t.rank).toBe(1);
    expect(t.houseAbove).toBeNull();
    expect(t.takeFirstInTarven()).toBe(true);
    expect(t.takeFirstInTarven()).toBe(false);
    nextMorning(t);
    expect(t.phase).toBe("day");
  });
});

describe("debuffs instead of endings", () => {
  it("a maxed heat brings a raid: a fine, the heat let off, and Under Watch", () => {
    const t = story();
    t.gold = 50;
    t.open();
    t.tick(0, idle);
    t.heat = HEAT_MAX;
    t.phase = "lastcall";
    t.chooseLastCall(0);
    t.heat = HEAT_MAX;
    t.sleep();
    expect(t.gold).toBe(50 - RAID_FINE);
    expect(t.heat).toBeLessThan(HEAT_MAX);
    expect(t.records.raids).toBe(1);
    expect(t.debuffs.find((d) => d.id === "watched")?.nights).toBe(DEBUFFS.watched.nights);
    expect(t.effects.patience).toBeLessThan(0);
  });

  it("wear off with the nights, and get worse when they come again", () => {
    const t = story();
    t.addDebuff("bruised");
    expect(t.effects.hold).toBe(-1);
    t.addDebuff("bruised");
    expect(t.debuffs[0].level).toBe(2);
    expect(t.effects.hold).toBe(-2);
    nextMorning(t);
    expect(t.debuffs.some((d) => d.id === "bruised")).toBe(true);
    nextMorning(t);
    expect(t.debuffs.some((d) => d.id === "bruised")).toBe(false);
    expect(t.effects.hold).toBe(0);
  });

  it("show in the queue for the game's toasts", () => {
    const t = story();
    t.addDebuff("watched");
    expect(t.takeGains()).toContainEqual({ kind: "debuff", id: "watched", level: 1 });
  });
});

describe("the house above", () => {
  it("fights back some nights: here, poaching two of her walk-ins", () => {
    const t = story();
    // Every roll at 0: the crowd as written, and a move tonight, the first of them (poaching).
    t.crowdRandom = () => 0;
    t.open();
    t.tick(0, idle);
    expect(t.rivalMove).toBe("poach");
    expect(t.tonight.length).toBe(NIGHTS[0].guests.length - 2);
    expect(t.takeMessages().join(" ")).toContain("Hollin's Cider Barn");
  });

  it("leaves her be without dice to roll it (the tests' default)", () => {
    const t = story();
    t.open();
    t.tick(0, idle);
    expect(t.rivalMove).toBeNull();
  });
});

describe("the story, saved", () => {
  it("keeps fans, beats, houses, the debt and her debuffs", () => {
    const t = story();
    t.fans = 222;
    t.beatsDone.add("deserter");
    t.houses = { cider: "ruin" };
    t.owed = 300;
    t.arrears = 60;
    t.addDebuff("inDebt");
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.fans).toBe(222);
    expect(loaded.beatsDone.has("deserter")).toBe(true);
    expect(loaded.houses).toEqual({ cider: "ruin" });
    expect(loaded.owed).toBe(300);
    expect(loaded.arrears).toBe(60);
    expect(loaded.debuffs).toEqual([{ id: "inDebt", level: 1, nights: 0 }]);
    expect(loaded.effects.payPct).toBeLessThan(0);
  });
});
