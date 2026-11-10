import { describe, expect, it } from "vitest";
import { DEBT, NIGHTS, Tavern, type Guest, type Item, type Station, type Target } from "../src/game/tavern";

const SEATS = 11;
const station = (s: Station): Target => ({ kind: "station", station: s });
const idle = { listeningTo: null, night: true };
const daytime = { listeningTo: null, night: false };

function run(t: Tavern, seconds: number, context: Parameters<Tavern["tick"]>[1] = idle): void {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, context);
}

/** Rings the bell after dark, so the night starts at once. */
function openForNight(t: Tavern): void {
  t.open();
  t.tick(0, idle);
}

/** A tavern on its first night, open and service started. */
function opened(): Tavern {
  const t = new Tavern(SEATS);
  openForNight(t);
  return t;
}

function firstGuestSeated(t: Tavern): Guest {
  run(t, 4);
  const guest = t.guests[0];
  t.guestArrived(guest.id);
  return guest;
}

function clearNight(t: Tavern): void {
  if (t.phase === "day") openForNight(t);
  // Guests who walk out still have to physically leave before the night ends.
  for (let i = 0; i < 4000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const guest of [...t.guests]) {
      if (guest.status === "arriving") t.guestArrived(guest.id);
      if (guest.status === "leaving") t.guestLeft(guest.id);
    }
  }
}

describe("the day", () => {
  it("starts closed, and no guests come however long you wait", () => {
    const t = new Tavern(SEATS);
    expect(t.phase).toBe("day");
    run(t, 60, daytime);
    run(t, 60);
    expect(t.phase).toBe("day");
    expect(t.guests).toHaveLength(0);
  });

  it("lets you get ready: ale pours and stew cooks while closed", () => {
    const t = new Tavern(SEATS);
    t.interact(0, station("tap"));
    t.interact(0, station("pot"));
    run(t, 9, daytime);
    expect(t.aleReady).toBe(1);
    expect(t.potState).toBe("ready");
  });

  it("opens at the bell, then waits for nightfall before the night begins", () => {
    const t = new Tavern(SEATS);
    t.takeMessages();
    expect(t.prompt(0, { kind: "bell" })?.actionable).toBe(true);
    t.interact(0, { kind: "bell" });
    expect(t.phase).toBe("dusk");
    run(t, 10, daytime);
    expect(t.phase).toBe("dusk");
    expect(t.guests).toHaveLength(0);
    t.tick(0.1, idle);
    expect(t.phase).toBe("service");
    expect(t.takeMessages().at(-1)).toBe(t.plan.intro);
    expect(t.prompt(0, { kind: "bell" })).toBeNull();
    expect(t.prompt(0, { kind: "bed" })).toBeNull();
  });
});

describe("service", () => {
  it("seats a guest when the schedule says so", () => {
    const t = opened();
    expect(t.guests).toHaveLength(0);
    run(t, 4);
    expect(t.guests).toHaveLength(1);
    expect(t.guests[0].status).toBe("arriving");
  });

  it("does not count patience until the guest has sat down", () => {
    const t = opened();
    run(t, 4);
    const before = t.guests[0].patience;
    run(t, 2);
    expect(t.guests[0].patience).toBe(before);
  });

  it("serves the right item, pays with a tip, and clears the hands", () => {
    const t = opened();
    const guest = firstGuestSeated(t);
    guest.mood = "calm";
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
    const t = opened();
    const guest = firstGuestSeated(t);
    t.interact(0, station("bread"));
    expect(t.prompt(0, { kind: "guest", id: guest.id })).toBeNull();
    t.interact(0, { kind: "guest", id: guest.id });
    expect(t.carrying[0]).toBe("bread");
    expect(guest.status).toBe("waiting");
  });

  it("drops the tip when service is slow", () => {
    const t = opened();
    const guest = firstGuestSeated(t);
    guest.patience = guest.maxPatience * 0.3;
    t.interact(0, station("tap"));
    run(t, 2);
    t.interact(0, station("tap"));
    t.interact(0, { kind: "guest", id: guest.id });
    expect(t.gold).toBe(4);
  });

  it("loses trust when a guest walks out", () => {
    const t = opened();
    const trust = t.trust;
    const guest = firstGuestSeated(t);
    guest.patience = 0.05;
    run(t, 0.2);
    expect(guest.status).toBe("leaving");
    expect(t.walkouts).toBe(1);
    expect(t.trust).toBe(trust - 1);
  });

  it("raises heat when a soldier walks out", () => {
    const t = opened();
    run(t, 11);
    const soldier = t.guests.find((g) => g.kind === "soldier")!;
    t.guestArrived(soldier.id);
    soldier.patience = 0.05;
    run(t, 0.2);
    expect(t.heat).toBe(2);
  });

  it("runs out of ale until a cask is brought", () => {
    const t = opened();
    t.tapLeft = 0;
    expect(t.prompt(0, station("tap"))?.actionable).toBe(false);
    t.interact(0, station("barrel"));
    expect(t.carrying[0]).toBe("cask");
    t.interact(0, station("tap"));
    expect(t.carrying[0]).toBeNull();
    expect(t.tapLeft).toBe(8);
  });

  it("lets an item go back to where it came from", () => {
    const t = opened();
    t.interact(0, station("bread"));
    t.interact(0, station("bread"));
    expect(t.carrying[0]).toBeNull();
  });
});

describe("the stew pot", () => {
  it("only cooks once the player starts it", () => {
    const t = opened();
    run(t, 10);
    expect(t.potState).toBe("empty");
    t.interact(0, station("pot"));
    run(t, 8.5);
    expect(t.potState).toBe("ready");
  });

  it("keeps ready stew warm long enough to serve, then burns it", () => {
    const t = opened();
    t.interact(0, station("pot"));
    run(t, 8.5);
    run(t, 35);
    expect(t.potState).toBe("ready");
    run(t, 6);
    expect(t.potState).toBe("burnt");
  });

  it("pours ale only when the player pulls it", () => {
    const t = opened();
    run(t, 5);
    expect(t.aleReady).toBe(0);
    t.interact(0, station("tap"));
    run(t, 2);
    expect(t.aleReady).toBe(1);
    expect(t.tapLeft).toBe(7);
  });
});

describe("rumors and last call", () => {
  function atSmuggler(): { t: Tavern; id: number } {
    const t = opened();
    run(t, 26);
    const guest = t.guests.find((g) => g.rumor)!;
    t.guestArrived(guest.id);
    return { t, id: guest.id };
  }

  it("needs a few seconds beside the right guest", () => {
    const { t, id } = atSmuggler();
    run(t, 2, { listeningTo: id, night: true });
    expect(t.heardRumor).toBe(false);
    run(t, 1.5, { listeningTo: id, night: true });
    expect(t.heardRumor).toBe(true);
  });

  it("offers selling only if you heard the rumor", () => {
    const t = opened();
    expect(t.lastCallChoices).toHaveLength(2);
    t.heardRumor = true;
    expect(t.lastCallChoices).toHaveLength(3);
  });

  it("reaches last call once every guest has gone, then applies the choice", () => {
    const t = opened();
    clearNight(t);
    expect(t.phase).toBe("lastcall");
    const heat = t.heat;
    t.chooseLastCall(0);
    expect(t.phase).toBe("bedtime");
    expect(t.heat).toBe(heat + 1);
  });

  it("lets you nap once a day while closed, without skipping the night", () => {
    const t = new Tavern(SEATS);
    expect(t.prompt(0, { kind: "bed" })).toEqual({ label: "Nap until evening", actionable: true });
    t.interact(0, { kind: "bed" });
    expect(t.phase).toBe("day");
    expect(t.prompt(0, { kind: "bed" })?.actionable).toBe(false);
    t.open();
    expect(t.prompt(0, { kind: "bed" })?.actionable).toBe(false);
    t.tick(0, idle);
    clearNight(t);
    t.chooseLastCall(0);
    t.sleep();
    t.nextNight();
    expect(t.prompt(0, { kind: "bed" })?.actionable).toBe(true);
  });

  it("opens and closes the bedroom door at any time", () => {
    const t = new Tavern(SEATS);
    expect(t.doorOpen).toBe(false);
    expect(t.prompt(0, { kind: "door" })).toEqual({ label: "Open the door", actionable: true });
    t.interact(0, { kind: "door" });
    expect(t.doorOpen).toBe(true);
    expect(t.prompt(0, { kind: "door" })?.label).toBe("Close the door");
    openForNight(t);
    t.interact(0, { kind: "door" });
    expect(t.doorOpen).toBe(false);
  });

  it("sleeps through to dawn from the bed once the tavern has shut", () => {
    const t = opened();
    clearNight(t);
    t.chooseLastCall(0);
    expect(t.canBuy("bigpot")).toBe(false);
    expect(t.prompt(0, { kind: "bed" })?.actionable).toBe(true);
    t.interact(0, { kind: "bed" });
    expect(t.phase).toBe("dawn");
    expect(t.prompt(0, { kind: "bed" })).toBeNull();
  });
});

describe("dawn and endings", () => {
  function atDawn(night: number): Tavern {
    const t = opened();
    for (let i = 0; i < night; i++) {
      clearNight(t);
      t.chooseLastCall(0);
      t.sleep();
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
    expect(t.phase).toBe("day");
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

/** Plays like a person working alone: every trip across the room costs time, and the pot needs starting. */
function playWholeGame(pickChoice: number, tripTime: number): Tavern {
  const t = opened();
  // How long each guest takes is random; a fixed sequence keeps the result the same every run.
  let roll = 12345;
  t.random = () => (roll = (Math.imul(roll, 1664525) + 1013904223) >>> 0) / 0x100000000;
  const dt = 0.1;
  const sourceOf: Record<Item, Station> = { ale: "tap", bread: "bread", stew: "pot", cask: "barrel" };
  const hasWareFor = (order: Item) =>
    order === "ale" ? t.aleReady > 0 || t.pourLeft !== null || t.cleanWare.cup > 0 : t.cleanWare.dish > 0;

  while (t.phase !== "ended") {
    if (t.phase === "day") {
      // Whatever was left from last night gets washed before opening.
      for (const mess of t.messes.filter((m) => m.kind === "dishes")) {
        t.interact(0, { kind: "mess", id: mess.id });
        t.interact(0, station("wash"));
      }
      while (t.tub.length > 0) t.tick(dt, { listeningTo: null, night: false, scrubber: 0 });
      openForNight(t);
    }
    let busy = 0;
    let scrubber: number | null = null;
    for (let steps = 0; t.phase === "service" && steps < 20000; steps++) {
      const rumorGuest = t.guests.find((g) => g.rumor && (g.status === "waiting" || g.status === "eating"));
      t.tick(dt, { listeningTo: rumorGuest?.id ?? null, night: true, scrubber });
      for (const guest of [...t.guests]) {
        if (guest.status === "arriving") t.guestArrived(guest.id);
        if (guest.status === "leaving") t.guestLeft(guest.id);
      }

      busy -= dt;
      if (busy > 0) continue;

      scrubber = null;
      const held = t.carrying[0];
      const waiting = t.guests.filter((g) => g.status === "waiting").sort((a, b) => a.patience - b.patience);
      if (held === "dirty") {
        t.interact(0, station("wash"));
        busy = tripTime;
      } else if (held === "cask") {
        t.interact(0, station("tap"));
        busy = tripTime;
      } else if (held) {
        const guest = waiting.find((g) => g.order === held);
        if (guest) t.interact(0, { kind: "guest", id: guest.id });
        else t.interact(0, station(sourceOf[held]));
        busy = 0.3;
      } else if (waiting.length === 0 || !hasWareFor(waiting[0].order)) {
        // Nobody to serve, or nothing clean to serve them on: wash up.
        const pile = t.messes.find((m) => m.kind === "dishes");
        if (t.tub.length > 0) scrubber = 0;
        else if (pile) {
          t.interact(0, { kind: "mess", id: pile.id });
          busy = tripTime;
        }
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
        } else if (t.potState === "empty" || t.potState === "burnt") {
          // Start the pot (or scrape it out first), then get on with other orders while it cooks.
          t.interact(0, station("pot"));
          busy = tripTime;
        }
      }
    }
    expect(t.phase).toBe("lastcall");
    t.chooseLastCall(pickChoice);
    t.sleep();
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
    const t = opened();
    while (t.phase !== "ended") {
      clearNight(t);
      t.chooseLastCall(0);
      t.sleep();
      t.nextNight();
    }
    expect(t.gold).toBeLessThan(DEBT);
    expect(["lost", "arrested"]).toContain(t.ending);
  });
});

describe("fixing mistakes", () => {
  it("throws away whatever you picked up by mistake in the bin", () => {
    const t = opened();
    expect(t.prompt(0, station("bin"))).toBeNull();
    t.interact(0, station("bread"));
    expect(t.prompt(0, station("bin"))).toEqual({ label: "Throw away the bread", actionable: true });
    t.interact(0, station("bin"));
    expect(t.carrying[0]).toBeNull();
  });

  it("won't take a cask in the bin", () => {
    const t = opened();
    t.interact(0, station("barrel"));
    expect(t.prompt(0, station("bin"))?.actionable).toBe(false);
    t.interact(0, station("bin"));
    expect(t.carrying[0]).toBe("cask");
  });

  it("lets you stop the stew once it's started", () => {
    const t = opened();
    t.interact(0, station("pot"));
    expect(t.potState).toBe("cooking");
    expect(t.prompt(0, station("pot"))).toEqual({ label: "Stop cooking and tip out the stew", actionable: true });
    t.interact(0, station("pot"));
    expect(t.potState).toBe("empty");
    run(t, 10);
    expect(t.potState).toBe("empty");
  });
});

describe("the ale tray", () => {
  /** Pours one ale and waits for it. */
  function pour(t: Tavern): void {
    t.interact(0, station("tap"));
    run(t, 2);
  }

  it("holds up to three cups, poured one after another", () => {
    const t = opened();
    pour(t);
    t.interact(0, station("tap"));
    expect(t.carryCount[0]).toBe(1);
    expect(t.prompt(0, station("tap"))?.label).toBe("Pour another ale");
    pour(t);
    expect(t.prompt(0, station("tap"))?.label).toBe("Put another ale on the tray (2/3)");
    t.interact(0, station("tap"));
    pour(t);
    t.interact(0, station("tap"));
    expect(t.carrying[0]).toBe("ale");
    expect(t.carryCount[0]).toBe(3);
    // Full: the tap only takes a cup back now.
    expect(t.prompt(0, station("tap"))?.label).toBe("Put an ale back");
    t.interact(0, station("tap"));
    expect(t.carryCount[0]).toBe(2);
    expect(t.aleReady).toBe(1);
  });

  it("serves one cup at a time, and empties your hands with the last", () => {
    const t = opened();
    const guest = firstGuestSeated(t);
    pour(t);
    t.interact(0, station("tap"));
    pour(t);
    t.interact(0, station("tap"));
    t.interact(0, { kind: "guest", id: guest.id });
    expect(guest.status).toBe("eating");
    expect(t.carrying[0]).toBe("ale");
    expect(t.carryCount[0]).toBe(1);
  });

  it("goes in the bin, or on the floor, all at once", () => {
    const t = opened();
    pour(t);
    t.interact(0, station("tap"));
    pour(t);
    t.interact(0, station("tap"));
    expect(t.prompt(0, station("bin"))?.label).toBe("Throw away the 2 ales");
    t.stumble(0);
    expect(t.carrying[0]).toBeNull();
    expect(t.carryCount[0]).toBe(0);
  });
});
