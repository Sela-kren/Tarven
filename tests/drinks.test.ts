import { describe, expect, it } from "vitest";
import { BOTTLES, MAX_WARE, STOCK_PACK, Tavern, type Station, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "A", "B", "B", "B", "Bar", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const station = (s: Station): Target => ({ kind: "station", station: s });

function run(t: Tavern, seconds: number): void {
  for (let i = 0; i < Math.round(seconds * 10); i++) t.tick(0.1, idle);
}

function open(t: Tavern): void {
  t.open();
  t.tick(0, idle);
}

describe("cups and dishes", () => {
  it("can only be bought until the shelves are full", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.gold = 100;
    while (t.canBuyStock("cup")) t.buyStock("cup");
    expect(t.stock.cup).toBe(MAX_WARE.cup);
    const gold = t.gold;
    t.buyStock("cup");
    expect(t.stock.cup).toBe(MAX_WARE.cup);
    expect(t.gold).toBe(gold);
    // Dishes have shelves of their own.
    expect(t.canBuyStock("dish")).toBe(true);
    t.buyStock("dish");
    expect(t.stock.dish).toBe(6 + STOCK_PACK);
  });
});

describe("bottled drinks", () => {
  it("are bought once, during the day, and kept for good", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.gold = 100;
    t.buyBottle("wine");
    expect(t.bottles.has("wine")).toBe(true);
    expect(t.gold).toBe(100 - BOTTLES.wine.cost);
    t.buyBottle("wine");
    expect(t.gold).toBe(100 - BOTTLES.wine.cost);
    open(t);
    expect(t.canBuyBottle("mead")).toBe(false);
  });

  it("are asked for instead of ale only once they're on the shelf", () => {
    const without = new Tavern(TABLES.length, TABLES);
    without.random = () => 0;
    open(without);
    run(without, 4);
    expect(without.guests[0].order).toBe("ale");

    const stocked = new Tavern(TABLES.length, TABLES);
    stocked.random = () => 0;
    stocked.gold = 100;
    stocked.buyBottle("mead");
    open(stocked);
    run(stocked, 4);
    // The first guest of the first night is a farmer, and farmers drink mead.
    expect(stocked.guests[0].kind).toBe("farmer");
    expect(stocked.guests[0].order).toBe("mead");
  });

  it("are poured at the shelf and pay more than ale, and mead warms the guest up", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.random = () => 0;
    t.gold = 100;
    t.buyBottle("mead");
    open(t);
    run(t, 4);
    const guest = t.guests[0];
    t.guestArrived(guest.id);
    const cups = t.cleanWare.cup;
    expect(t.prompt(0, station("shelf"))?.label).toBe("Pour a cup of mead");
    t.interact(0, station("shelf"));
    expect(t.carrying[0]).toBe("mead");
    expect(t.bottles.has("mead")).toBe(true);
    expect(t.cleanWare.cup).toBe(cups - 1);
    // Nobody else wants any, so the shelf has nothing more to pour.
    expect(t.prompt(1, station("shelf"))?.actionable).toBeFalsy();

    const gold = t.gold;
    const lust = guest.lust;
    t.interact(0, { kind: "guest", id: guest.id });
    expect(t.gold - gold).toBeGreaterThanOrEqual(4 + BOTTLES.mead.extraPay);
    expect(guest.lust).toBe(Math.min(10, lust + 2));
  });

  it("go back on the shelf if you put them down there", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.random = () => 0;
    t.gold = 100;
    t.buyBottle("mead");
    open(t);
    run(t, 4);
    t.interact(0, station("shelf"));
    t.interact(0, station("shelf"));
    expect(t.carrying[0]).toBeNull();
    expect(t.cleanWare.cup).toBe(6);
  });

  it("are kept in the save", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.gold = 100;
    t.buyBottle("vodka");
    const saved = t.snapshot();
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(saved);
    expect([...loaded.bottles]).toEqual(["vodka"]);
  });
});

describe("the journal", () => {
  it("is read from the book, and the name written in it is kept in the save", () => {
    const t = new Tavern(TABLES.length, TABLES);
    expect(t.prompt(0, { kind: "book" })?.label).toBe("Read your journal");
    t.name = "Mira";
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(t.snapshot());
    expect(loaded.name).toBe("Mira");
  });
});
