import { describe, expect, it } from "vitest";
import { Tavern, type Mess, type Station, type Target } from "../src/game/tavern";

// Two tables of three and a bar of three, like a small room.
const TABLES = ["A", "A", "A", "B", "B", "B", "Bar", "Bar", "Bar"];
const DUST_SPOTS = 20;
const COBWEB_SPOTS = 7;
const idle = { listeningTo: null, night: true };
const station = (s: Station): Target => ({ kind: "station", station: s });
const messAt = (m: Mess): Target => ({ kind: "mess", id: m.id });
const bell: Target = { kind: "bell" };

function tavern(): Tavern {
  return new Tavern(TABLES.length, TABLES, DUST_SPOTS, COBWEB_SPOTS);
}

/** Plays a night out: serves everyone who sits down (or lets them walk out), then the morning comes. */
function playNight(t: Tavern, serve: boolean): void {
  t.open();
  t.tick(0, idle);
  for (let i = 0; i < 6000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const guest of [...t.guests]) {
      if (guest.status === "arriving") t.guestArrived(guest.id);
      if (guest.status === "leaving") t.guestLeft(guest.id);
      if (serve && guest.status === "waiting") {
        t.carrying[0] = guest.order;
        t.carryCount[0] = 1;
        t.interact(0, { kind: "guest", id: guest.id });
      }
    }
  }
  t.chooseLastCall(0);
  t.sleep();
  t.nextNight();
}

/** Clears every mess, taking the dishes to the tub and scrubbing them. */
function cleanEverything(t: Tavern): void {
  for (const mess of [...t.messes]) {
    t.interact(0, messAt(mess));
    if (t.carrying[0] === "dirty") t.interact(0, station("wash"));
  }
  for (let i = 0; i < 500 && t.tub.length > 0; i++) t.tick(0.1, { ...idle, scrubber: 0 });
}

describe("the morning mess", () => {
  it("the first day starts clean", () => {
    expect(tavern().messes).toHaveLength(0);
  });

  it("a night of guests leaves dishes on each table that ate, and dust", () => {
    const t = tavern();
    playNight(t, true);
    expect(t.phase).toBe("day");
    const dishes = t.messes.filter((m) => m.kind === "dishes");
    expect(dishes.length).toBeGreaterThan(0);
    // One pile per table, never two for the same table.
    const tables = dishes.map((m) => TABLES[m.spots[0]]);
    expect(new Set(tables).size).toBe(tables.length);
    for (const pile of dishes) expect(pile.spots.every((s) => TABLES[s] === TABLES[pile.spots[0]])).toBe(true);
    expect(t.messes.filter((m) => m.kind === "dust").length).toBeGreaterThanOrEqual(3);
    expect(t.takeMessages().at(-1)).toContain("mess");
  });

  it("guests who walk out spill their ale", () => {
    const t = tavern();
    playNight(t, false);
    expect(t.messes.some((m) => m.kind === "spill")).toBe(true);
    expect(t.messes.some((m) => m.kind === "dishes")).toBe(false);
  });

  it("is cleaned one mess at a time with empty hands, until the tavern is spotless", () => {
    const t = tavern();
    playNight(t, true);
    const first = t.messes[0];

    t.interact(0, station("bread"));
    expect(t.prompt(0, messAt(first))?.actionable).toBe(false);
    t.interact(0, station("bread")); // Put it back.

    const count = t.messes.length;
    expect(t.prompt(0, messAt(first))?.actionable).toBe(true);
    t.interact(0, messAt(first));
    expect(t.messes).toHaveLength(count - 1);
    expect(t.prompt(0, messAt(first))).toBeNull();
    if (t.carrying[0] === "dirty") t.interact(0, station("wash"));

    cleanEverything(t);
    expect(t.messes).toHaveLength(0);
    expect(t.takeMessages().at(-1)).toBe("The tavern is spotless.");
  });

  it("makes guests less patient in a dirty room", () => {
    const clean = tavern();
    playNight(clean, true);
    cleanEverything(clean);
    const dirty = tavern();
    playNight(dirty, true);
    expect(dirty.messPatience).toBeLessThan(1);
    expect(clean.messPatience).toBe(1);

    for (const t of [clean, dirty]) {
      t.open();
      t.tick(0, idle);
      for (let i = 0; i < 200 && t.guests.length === 0; i++) t.tick(0.1, idle);
    }
    expect(dirty.guests[0].maxPatience).toBeLessThan(clean.guests[0].maxPatience);
  });

  it("left alone, carries on into the next day without doubling up", () => {
    const t = tavern();
    playNight(t, true);
    const before = t.messes.length;
    playNight(t, true);
    expect(t.messes.length).toBeGreaterThanOrEqual(before);
    const keys = t.messes.map((m) => `${m.kind}:${m.kind === "dishes" ? TABLES[m.spots[0]] : m.spots[0]}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(t.messes.map((m) => m.id)).size).toBe(t.messes.length);
  });

  it("a night opened dirty lets a spider back in, but one opened clean doesn't", () => {
    const dirty = tavern();
    playNight(dirty, true);
    playNight(dirty, true); // Opened with last night's mess still about.
    expect(dirty.messes.filter((m) => m.kind === "cobweb")).toHaveLength(1);
    expect(dirty.takeMessages().some((line) => line.includes("spider"))).toBe(true);

    const clean = tavern();
    playNight(clean, true);
    cleanEverything(clean);
    playNight(clean, true);
    expect(clean.messes.some((m) => m.kind === "cobweb")).toBe(false);
  });

  it("is kept in the save, so loading the morning brings the mess back", () => {
    const t = tavern();
    playNight(t, true);
    const save = t.snapshot();
    const loaded = tavern();
    loaded.restore(save);
    expect(loaded.messes).toEqual(t.messes);
    // Cleaning the loaded copy doesn't touch the save.
    for (const mess of [...loaded.messes]) loaded.interact(0, messAt(mess));
    expect(save.messes?.length).toBe(t.messes.length);
  });
});

describe("the first morning in Grandma's tavern", () => {
  function settled(): Tavern {
    const t = tavern();
    t.settleIn();
    return t;
  }

  it("is full of cobwebs and dust, each on its own spot", () => {
    const t = settled();
    const webs = t.messes.filter((m) => m.kind === "cobweb");
    const dust = t.messes.filter((m) => m.kind === "dust");
    expect(webs).toHaveLength(5);
    expect(dust).toHaveLength(6);
    for (const kind of [webs, dust]) expect(new Set(kind.map((m) => m.spots[0])).size).toBe(kind.length);
    expect(webs.every((m) => m.spots[0] < COBWEB_SPOTS)).toBe(true);
    // The usual "the tavern is closed" line gives way to what to do.
    const lines = t.takeMessages();
    expect(lines[0]).toContain("Nobody has opened the place");
    expect(lines.some((line) => line.includes("press E"))).toBe(true);
  });

  it("only happens on a new game's first morning, once", () => {
    const t = settled();
    const count = t.messes.length;
    t.settleIn();
    expect(t.messes).toHaveLength(count);

    const later = tavern();
    playNight(later, true);
    cleanEverything(later);
    later.settleIn();
    expect(later.messes).toHaveLength(0);
  });

  it("won't let the bell ring until it's all cleaned, and walks her through it", () => {
    const t = settled();
    t.takeMessages();
    expect(t.prompt(0, bell)?.actionable).toBe(false);
    expect(t.prompt(0, bell)?.label).toContain("5 cobwebs and 6 patches of dust left");
    t.open();
    expect(t.phase).toBe("day");

    const web = t.messes.find((m) => m.kind === "cobweb")!;
    expect(t.prompt(0, messAt(web))?.label).toBe("Brush down the cobweb");
    t.interact(0, messAt(web));
    expect(t.takeMessages().at(-1)).toBe("Cobweb down. 4 cobwebs and 6 patches of dust left.");

    cleanEverything(t);
    expect(t.messes).toHaveLength(0);
    expect(t.takeMessages().at(-1)).toContain("Ring the bell");
    expect(t.prompt(0, bell)?.actionable).toBe(true);
    t.interact(0, bell);
    expect(t.phase).toBe("dusk");
  });

  it("still lets her into the house plans with cobwebs up", () => {
    const t = settled();
    expect(t.prompt(0, { kind: "desk" })?.actionable).toBe(true);
  });

  it("keeps its cobwebs in the save", () => {
    const t = settled();
    const loaded = tavern();
    loaded.restore(t.snapshot());
    expect(loaded.messes.filter((m) => m.kind === "cobweb")).toHaveLength(5);
    expect(loaded.prompt(0, bell)?.actionable).toBe(false);
  });
});
