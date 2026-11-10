import { describe, expect, it } from "vitest";
import { DEBT, NIGHTS, Tavern, type Guest, type Item, type Station, type Target } from "../src/game/tavern";

const SEATS = 11;
const station = (s: Station): Target => ({ kind: "station", station: s });
const idle = { helper: null, listeningTo: null };

function run(t: Tavern, seconds: number, context: Parameters<Tavern["tick"]>[1] = idle): void {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, context);
}

function firstGuestSeated(t: Tavern): Guest {
  run(t, 4);
  const guest = t.guests[0];
  t.guestArrived(guest.id);
  return guest;
}

function clearNight(t: Tavern): void {
  // Guests who walk out still have to physically leave before the night ends.
  for (let i = 0; i < 4000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const guest of [...t.guests]) {
      if (guest.status === "arriving") t.guestArrived(guest.id);
      if (guest.status === "leaving") t.guestLeft(guest.id);
    }
  }
}

describe("service", () => {
  it("seats a guest when the schedule says so", () => {
    const t = new Tavern(SEATS);
    expect(t.guests).toHaveLength(0);
    run(t, 4);
    expect(t.guests).toHaveLength(1);
    expect(t.guests[0].status).toBe("arriving");
  });

  it("does not count patience until the guest has sat down", () => {
    const t = new Tavern(SEATS);
    run(t, 4);
    const before = t.guests[0].patience;
    run(t, 2);
    expect(t.guests[0].patience).toBe(before);
  });

  it("serves the right item, pays with a tip, and clears the hands", () => {
    const t = new Tavern(SEATS);
    const guest = firstGuestSeated(t);
    t.interact(0, station("tap"));
    run(t, 2);
    t.interact(0, station("tap"));
    expect(t.carrying[0]).toBe("ale");
    t.interact(0, { kind: "guest", id: guest.id });
    expect(t.carrying[0]).toBeNull();
    expect(guest.status).toBe("eating");
    expect(t.gold).toBe(6);
  });

  it("refuses the wrong item", () => {
    const t = new Tavern(SEATS);
    const guest = firstGuestSeated(t);
    t.interact(0, station("bread"));
    expect(t.prompt(0, { kind: "guest", id: guest.id })).toBeNull();
    t.interact(0, { kind: "guest", id: guest.id });
    expect(t.carrying[0]).toBe("bread");
    expect(guest.status).toBe("waiting");
  });

  it("drops the tip when service is slow", () => {
    const t = new Tavern(SEATS);
    const guest = firstGuestSeated(t);
    guest.patience = guest.maxPatience * 0.3;
    t.interact(0, station("tap"));
    run(t, 2);
    t.interact(0, station("tap"));
    t.interact(0, { kind: "guest", id: guest.id });
    expect(t.gold).toBe(4);
  });

  it("loses trust when a guest walks out", () => {
    const t = new Tavern(SEATS);
    const trust = t.trust;
    const guest = firstGuestSeated(t);
    guest.patience = 0.05;
    run(t, 0.2);
    expect(guest.status).toBe("leaving");
    expect(t.walkouts).toBe(1);
    expect(t.trust).toBe(trust - 1);
  });

  it("raises heat when a soldier walks out", () => {
    const t = new Tavern(SEATS);
    run(t, 11);
    const soldier = t.guests.find((g) => g.kind === "soldier")!;
    t.guestArrived(soldier.id);
    soldier.patience = 0.05;
    run(t, 0.2);
    expect(t.heat).toBe(2);
  });

  it("runs out of ale until a cask is brought", () => {
    const t = new Tavern(SEATS);
    t.tapLeft = 0;
    expect(t.prompt(0, station("tap"))?.actionable).toBe(false);
    t.interact(0, station("barrel"));
    expect(t.carrying[0]).toBe("cask");
    t.interact(0, station("tap"));
    expect(t.carrying[0]).toBeNull();
    expect(t.tapLeft).toBe(8);
  });

  it("lets an item go back to where it came from", () => {
    const t = new Tavern(SEATS);
    t.interact(0, station("bread"));
    t.interact(0, station("bread"));
    expect(t.carrying[0]).toBeNull();
  });
});

describe("siblings working together", () => {
  it("burns stew when nobody is watching", () => {
    const t = new Tavern(SEATS);
    t.interact(0, station("pot"));
    run(t, 8.5);
    expect(t.potState).toBe("ready");
    run(t, 17);
    expect(t.potState).toBe("burnt");
  });

  it("never burns stew while a sibling is at the pot", () => {
    const t = new Tavern(SEATS);
    t.interact(0, station("pot"));
    run(t, 60, { helper: "pot", listeningTo: null });
    expect(t.potState).toBe("ready");
  });

  it("cooks faster and starts the pot when a sibling is there", () => {
    const t = new Tavern(SEATS);
    run(t, 6, { helper: "pot", listeningTo: null });
    expect(t.potState).toBe("ready");
  });

  it("pours ale ahead while a sibling is at the tap, but only up to the shelf limit", () => {
    const t = new Tavern(SEATS);
    run(t, 20, { helper: "tap", listeningTo: null });
    expect(t.aleReady).toBe(2);
    expect(t.tapLeft).toBe(6);
  });
});

describe("rumors and last call", () => {
  function atSmuggler(): { t: Tavern; id: number } {
    const t = new Tavern(SEATS);
    run(t, 26);
    const guest = t.guests.find((g) => g.rumor)!;
    t.guestArrived(guest.id);
    return { t, id: guest.id };
  }

  it("needs a few seconds beside the right guest", () => {
    const { t, id } = atSmuggler();
    run(t, 2, { helper: null, listeningTo: id });
    expect(t.heardRumor).toBe(false);
    run(t, 1.5, { helper: null, listeningTo: id });
    expect(t.heardRumor).toBe(true);
  });

  it("offers selling only if you heard the rumor", () => {
    const t = new Tavern(SEATS);
    expect(t.lastCallChoices).toHaveLength(2);
    t.heardRumor = true;
    expect(t.lastCallChoices).toHaveLength(3);
  });

  it("reaches last call once every guest has gone, then applies the choice", () => {
    const t = new Tavern(SEATS);
    clearNight(t);
    expect(t.phase).toBe("lastcall");
    const heat = t.heat;
    t.chooseLastCall(0);
    expect(t.phase).toBe("dawn");
    expect(t.heat).toBe(heat + 1);
  });
});

describe("dawn and endings", () => {
  function atDawn(night: number): Tavern {
    const t = new Tavern(SEATS);
    for (let i = 0; i < night; i++) {
      clearNight(t);
      t.chooseLastCall(0);
      if (i < night - 1) t.nextNight();
    }
    return t;
  }

  it("charges for an upgrade once and refuses when you cannot afford it", () => {
    const t = atDawn(1);
    t.gold = 25;
    t.buy("bigpot");
    expect(t.gold).toBe(5);
    expect(t.upgrades.has("bigpot")).toBe(true);
    t.buy("bigpot");
    expect(t.gold).toBe(5);
    t.buy("quicktap");
    expect(t.upgrades.has("quicktap")).toBe(false);
  });

  it("resets the night but keeps money and upgrades", () => {
    const t = atDawn(1);
    t.gold = 40;
    t.buy("cushions");
    t.nextNight();
    expect(t.nightIndex).toBe(1);
    expect(t.phase).toBe("service");
    expect(t.gold).toBe(20);
    expect(t.upgrades.has("cushions")).toBe(true);
    expect(t.heardRumor).toBe(false);
  });

  const ending = (gold: number, trust: number, heat: number) => {
    const t = atDawn(NIGHTS.length);
    t.gold = gold;
    t.trust = trust;
    t.heat = heat;
    t.nextNight();
    expect(t.phase).toBe("ended");
    return t.ending;
  };

  it("picks the right ending", () => {
    expect(ending(DEBT, 5, 2)).toBe("kept");
    expect(ending(DEBT - 1, 5, 2)).toBe("lost");
    expect(ending(0, 13, 2)).toBe("overthrow");
    expect(ending(DEBT, 15, 8)).toBe("arrested");
  });
});

/** Plays like a person: every trip across the room costs time, and one sibling minds the pot. */
function playWholeGame(pickChoice: number, tripTime: number): Tavern {
  const t = new Tavern(SEATS);
  const dt = 0.1;
  const sourceOf: Record<Item, Station> = { ale: "tap", bread: "bread", stew: "pot", cask: "barrel" };

  while (t.phase !== "ended") {
    let busy = 0;
    for (let steps = 0; t.phase === "service" && steps < 20000; steps++) {
      const rumorGuest = t.guests.find((g) => g.rumor && (g.status === "waiting" || g.status === "eating"));
      t.tick(dt, { helper: "pot", listeningTo: rumorGuest?.id ?? null });
      for (const guest of [...t.guests]) {
        if (guest.status === "arriving") t.guestArrived(guest.id);
        if (guest.status === "leaving") t.guestLeft(guest.id);
      }

      busy -= dt;
      if (busy > 0) continue;

      const held = t.carrying[0];
      const waiting = t.guests.filter((g) => g.status === "waiting").sort((a, b) => a.patience - b.patience);
      if (held === "cask") {
        t.interact(0, station("tap"));
        busy = tripTime;
      } else if (held) {
        const guest = waiting.find((g) => g.order === held);
        if (guest) t.interact(0, { kind: "guest", id: guest.id });
        else t.interact(0, station(sourceOf[held]));
        busy = 0.3;
      } else if (waiting.length > 0) {
        const want = waiting[0].order;
        if (want === "ale" && t.aleReady === 0) {
          if (t.tapLeft === 0 && t.pourLeft === null) {
            t.interact(0, station("barrel"));
            busy = tripTime;
          } else if (t.pourLeft === null) {
            t.interact(0, station("tap"));
            busy = 0.3;
          }
        } else if (want !== "stew" || t.potState === "ready") {
          t.interact(0, station(sourceOf[want]));
          busy = tripTime;
        }
      }
    }
    expect(t.phase).toBe("lastcall");
    t.chooseLastCall(pickChoice);
    t.nextNight();
  }
  return t;
}

describe("whole game", () => {
  it("can be paid off by a player who is reasonably quick", () => {
    const t = playWholeGame(2, 3);
    expect(t.gold).toBeGreaterThanOrEqual(DEBT);
    expect(t.ending).toBe("kept");
  });

  it("reaches the village ending by protecting people at last call", () => {
    expect(playWholeGame(1, 3).ending).toBe("overthrow");
  });

  it("loses if nobody serves anyone", () => {
    const t = new Tavern(SEATS);
    while (t.phase !== "ended") {
      clearNight(t);
      t.chooseLastCall(0);
      t.nextNight();
    }
    expect(t.gold).toBeLessThan(DEBT);
    expect(["lost", "arrested"]).toContain(t.ending);
  });
});
