import { describe, expect, it } from "vitest";
import { Tavern, type Mess, type Station, type Target } from "../src/game/tavern";

// Two tables of three and a bar of three, like a small room.
const TABLES = ["A", "A", "A", "B", "B", "B", "Bar", "Bar", "Bar"];
const DUST_SPOTS = 20;
const idle = { listeningTo: null, night: true };
const station = (s: Station): Target => ({ kind: "station", station: s });
const messAt = (m: Mess): Target => ({ kind: "mess", id: m.id });

function tavern(): Tavern {
  return new Tavern(TABLES.length, TABLES, DUST_SPOTS);
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
