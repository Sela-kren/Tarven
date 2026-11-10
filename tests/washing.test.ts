import { describe, expect, it } from "vitest";
import { STOCK_COST, STOCK_PACK, Tavern, type Guest, type Station, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "A", "B", "B", "B", "Bar", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const scrubbing = { ...idle, scrubber: 0 };
const station = (s: Station): Target => ({ kind: "station", station: s });
const at = (guest: Guest): Target => ({ kind: "guest", id: guest.id });

function run(t: Tavern, seconds: number, context: Parameters<Tavern["tick"]>[1] = idle): void {
  for (let i = 0; i < Math.round(seconds * 10); i++) t.tick(0.1, context);
}

function opened(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.open();
  t.tick(0, idle);
  return t;
}

/** The first guest of the first night, sitting and waiting for their ale. */
function seated(t: Tavern): Guest {
  run(t, 4);
  const guest = t.guests[0];
  t.guestArrived(guest.id);
  return guest;
}

function serveAle(t: Tavern, guest: Guest): void {
  t.interact(0, station("tap"));
  run(t, 2);
  t.interact(0, station("tap"));
  t.interact(0, at(guest));
}

/** Serves the first guest and waits until they've finished and left a dirty cup on the table. */
function guestFinished(t: Tavern): Guest {
  const guest = seated(t);
  serveAle(t, guest);
  guest.eatLeft = 0.05;
  run(t, 0.2);
  return guest;
}

const dirtyPile = (t: Tavern) => t.messes.find((m) => m.kind === "dishes")!;

describe("cups and dishes", () => {
  it("start with a limited set, all clean", () => {
    const t = new Tavern(TABLES.length, TABLES);
    expect(t.cleanWare).toEqual(t.stock);
    expect(t.stock.cup).toBeGreaterThan(0);
    expect(t.stock.dish).toBeGreaterThan(0);
  });

  it("are used up by pouring ale and taking food", () => {
    const t = opened();
    const { cup, dish } = t.cleanWare;
    t.interact(0, station("tap"));
    expect(t.cleanWare.cup).toBe(cup - 1);
    run(t, 2);
    t.interact(0, station("tap"));
    t.interact(0, station("bin"));
    t.interact(0, station("bread"));
    expect(t.cleanWare.dish).toBe(dish - 1);
  });

  it("go back when you put the food back or bin it", () => {
    const t = opened();
    const { dish } = t.cleanWare;
    t.interact(0, station("bread"));
    t.interact(0, station("bread"));
    expect(t.cleanWare.dish).toBe(dish);
    t.interact(0, station("bread"));
    t.interact(0, station("bin"));
    expect(t.cleanWare.dish).toBe(dish);
  });

  it("stop you serving when none are clean", () => {
    const t = opened();
    t.cleanWare.cup = 0;
    t.cleanWare.dish = 0;
    expect(t.prompt(0, station("tap"))).toEqual({ label: "No clean cups. Wash some at the tub", actionable: false });
    expect(t.prompt(0, station("bread"))?.actionable).toBe(false);
    t.interact(0, station("tap"));
    expect(t.pourLeft).toBeNull();
  });

  it("break for good when you stumble with them", () => {
    const t = opened();
    t.carrying[0] = "ale";
    t.carryCount[0] = 3;
    const { cup } = t.stock;
    t.stumble(0);
    expect(t.stock.cup).toBe(cup - 3);
  });

  it("can be bought more of in the morning, again and again", () => {
    const t = opened();
    t.gold = STOCK_COST * 2;
    const { cup, dish } = t.stock;
    t.buyStock("cup");
    expect(t.stock.cup).toBe(cup);
    t.phase = "dawn";
    t.buyStock("cup");
    t.buyStock("dish");
    expect(t.stock.cup).toBe(cup + STOCK_PACK);
    expect(t.stock.dish).toBe(dish + STOCK_PACK);
    expect(t.gold).toBe(0);
    expect(t.canBuyStock()).toBe(false);
  });
});

describe("washing up", () => {
  it("leaves a dirty cup on the table as soon as a guest has finished", () => {
    const t = opened();
    const guest = guestFinished(t);
    expect(guest.status).toBe("leaving");
    expect(dirtyPile(t).spots).toEqual([guest.seat]);
    expect(dirtyPile(t).wares).toEqual(["cup"]);
  });

  it("runs from the table to the tub and back to the shelf", () => {
    const t = opened();
    guestFinished(t);
    const before = t.cleanWare.cup;
    t.interact(0, { kind: "mess", id: dirtyPile(t).id });
    expect(t.carrying[0]).toBe("dirty");
    expect(t.messes).toHaveLength(0);
    t.interact(0, station("wash"));
    expect(t.carrying[0]).toBeNull();
    expect(t.tub).toEqual(["cup"]);
    run(t, 1.5, scrubbing);
    expect(t.tub).toHaveLength(0);
    expect(t.cleanWare.cup).toBe(before + 1);
  });

  it("only scrubs while you stand at the tub with empty hands", () => {
    const t = opened();
    t.tub.push("dish");
    run(t, 3);
    expect(t.tub).toHaveLength(1);
    t.interact(0, station("bread"));
    run(t, 3, scrubbing);
    expect(t.tub).toHaveLength(1);
  });

  it("takes several piles in one trip", () => {
    const t = opened();
    t.messes.push({ id: 90, kind: "dishes", spots: [0], wares: ["cup"] }, { id: 91, kind: "dishes", spots: [3], wares: ["dish"] });
    t.interact(0, { kind: "mess", id: 90 });
    t.interact(0, { kind: "mess", id: 91 });
    expect(t.carryCount[0]).toBe(2);
    t.interact(0, station("wash"));
    expect([...t.tub].sort()).toEqual(["cup", "dish"]);
  });

  it("seats new guests away from dirty tables while there's room", () => {
    const t = opened();
    t.messes.push({ id: 90, kind: "dishes", spots: [0, 1, 2, 3, 4, 5], wares: ["dish", "dish", "dish", "dish", "dish", "dish"] });
    run(t, 4);
    expect(t.guests[0].seat).toBeGreaterThanOrEqual(6);
  });

  it("carries dirty things into the morning, and everything else comes back", () => {
    const t = opened();
    guestFinished(t);
    t.interact(0, station("bread"));
    t.phase = "dawn";
    t.nextNight();
    expect(t.cleanWare.cup).toBe(t.stock.cup - 1);
    expect(t.cleanWare.dish).toBe(t.stock.dish);
  });

  it("leaves dishes still in hand in the tub overnight", () => {
    const t = opened();
    guestFinished(t);
    t.interact(0, { kind: "mess", id: dirtyPile(t).id });
    t.phase = "dawn";
    t.nextNight();
    expect(t.carrying[0]).toBeNull();
    expect(t.tub).toEqual(["cup"]);
  });

  it("can still be done after the tavern shuts", () => {
    const t = opened();
    t.tub.push("cup");
    t.phase = "bedtime";
    expect(t.prompt(0, station("wash"))?.label).toContain("Scrubbing");
    run(t, 1.5, scrubbing);
    expect(t.tub).toHaveLength(0);
  });

  it("is saved, and an older save starts with the usual set", () => {
    const t = opened();
    guestFinished(t);
    t.stock.cup = 9;
    t.tub.push("dish");
    t.phase = "dawn";
    t.nextNight();
    const save = t.snapshot();
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(save);
    expect(loaded.stock).toEqual(t.stock);
    expect(loaded.tub).toEqual(t.tub);
    expect(loaded.cleanWare).toEqual(t.cleanWare);
    expect(loaded.messes).toEqual(t.messes);

    const older = new Tavern(TABLES.length, TABLES);
    const { stock: _stock, tub: _tub, ...old } = save;
    older.restore({ ...old, messes: [{ id: 1, kind: "dishes", spots: [0, 1] }] });
    expect(older.stock).toEqual(new Tavern(TABLES.length, TABLES).stock);
    expect(older.cleanWare.dish).toBe(older.stock.dish - 2);
  });
});

describe("how long guests take", () => {
  function servedWith(roll: number, pick: (t: Tavern) => Guest): Guest {
    const t = opened();
    t.random = () => roll;
    run(t, 19);
    const guest = pick(t);
    for (const g of t.guests) t.guestArrived(g.id);
    t.carrying[0] = guest.order;
    t.carryCount[0] = 1;
    guest.patience = 0.01; // No tip, so nothing else rolls the dice.
    t.interact(0, at(guest));
    return guest;
  }
  const alone = (t: Tavern) => t.guests.find((g) => g.party === null)!;
  const inParty = (t: Tavern) => t.guests.find((g) => g.party !== null)!;

  it("varies from guest to guest", () => {
    expect(servedWith(0, alone).eatLeft).toBeLessThan(servedWith(0.99, alone).eatLeft);
  });

  it("is much longer than a few seconds, even at the quickest", () => {
    expect(servedWith(0, alone).eatLeft).toBeGreaterThanOrEqual(14);
  });

  it("is longer in a group, who have talking to do first", () => {
    expect(servedWith(0, inParty).eatLeft).toBeGreaterThan(servedWith(0.99, alone).eatLeft);
  });
});
