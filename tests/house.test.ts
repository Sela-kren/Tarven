import { describe, expect, it } from "vitest";
import {
  edgeAt,
  edgeRect,
  emptyLayout,
  faceTable,
  footprint,
  HousePlan,
  isHouseLayout,
  overlaps,
  seatSpecs,
  type Placed,
} from "../src/game/house";
import { Tavern } from "../src/game/tavern";

const plan = (furniture: Placed[] = []) => new HousePlan(emptyLayout(furniture));
const at = (kind: Placed["kind"], x: number, z: number, turn = 0): Placed => ({ kind, x, z, turn });

describe("buying floor", () => {
  it("sells tiles touching the house and not ones out on their own", () => {
    const house = plan();
    expect(house.canBuyTile(0, 5)).toBe(true);
    expect(house.canBuyTile(0, 6)).toBe(false);
    house.buyTile(0, 5);
    expect(house.canBuyTile(0, 6)).toBe(true);
  });

  it("keeps the street, the bedroom and the chimney unbuyable", () => {
    const house = plan();
    expect(house.canBuyTile(0, -6)).toBe(false);
    expect(house.canBuyTile(7, 0)).toBe(false);
    expect(house.canBuyTile(-8, -1)).toBe(false);
    expect(house.canBuyTile(7, 3)).toBe(true);
    expect(house.canBuyTile(-8, 3)).toBe(true);
  });

  it("doesn't sell the original floor, furnished floor, or a tile holding the rest on", () => {
    const house = plan([at("stool", 0.5, 5.5)]);
    expect(house.sellProblem(0, 0)).toMatch(/bought/);
    house.buyTile(0, 5);
    expect(house.sellProblem(0, 5)).toMatch(/furniture/i);
    house.layout.furniture.length = 0;
    house.buyTile(0, 6);
    expect(house.sellProblem(0, 5)).toMatch(/cut off/);
    expect(house.sellProblem(0, 6)).toBeNull();
  });

  it("takes drawn walls away with a sold tile", () => {
    const house = plan();
    house.buyTile(0, 5);
    house.layout.walls.push("h:0:5");
    expect(house.sellTile(0, 5)).toBe(1);
    expect(house.layout.walls).toEqual([]);
    expect(house.isOwned(0, 5)).toBe(false);
  });
});

describe("walls", () => {
  it("opens the wall between old and new floor and walls in the new tile", () => {
    const house = plan();
    const onLine = (z: number, x: number) =>
      house.outerWalls().filter(({ rect }) => rect.minZ === z && rect.minX <= x && rect.maxX > x);
    expect(onLine(5, 0.5)).toHaveLength(1);
    house.buyTile(0, 5);
    expect(onLine(5, 0.5)).toHaveLength(0);
    expect(onLine(6, 0.5)).toHaveLength(1);
  });

  it("keeps camera-facing walls low and back walls tall", () => {
    const house = plan();
    house.buyTile(-8, 3);
    const walls = house.outerWalls();
    const south = walls.find(({ rect }) => rect.minZ === 4 && rect.minX <= -7.5 && rect.maxX >= -7.5);
    const north = walls.find(({ rect }) => rect.maxZ === 3 && rect.minX <= -7.5 && rect.maxX >= -7.5);
    expect(south?.height).toBeLessThan(1);
    expect(north?.height).toBeGreaterThan(3);
  });

  it("doesn't put a tall wall in front of the bedroom", () => {
    const house = plan();
    house.buyTile(7, 3);
    house.buyTile(8, 3);
    const inFront = house.outerWalls().find(({ rect }) => rect.maxZ === 3 && rect.minX <= 8.5 && rect.maxX >= 8.5);
    expect(inFront?.height).toBeLessThan(1);
  });

  it("only allows drawn walls between owned tiles", () => {
    const house = plan();
    expect(house.wallProblem("h:0:0")).toBeNull();
    expect(house.wallProblem("h:0:5")).toMatch(/between/);
    house.layout.walls.push("h:0:0");
    expect(house.wallProblem("h:0:0")).toMatch(/already/);
  });

  it("picks the edge nearest the pointer", () => {
    expect(edgeAt(3.5, 2.1)).toBe("h:3:2");
    expect(edgeAt(3.1, 2.5)).toBe("v:3:2");
    expect(edgeAt(-3.5, -2.1)).toBe("h:-4:-2");
    expect(overlaps(edgeRect("h:3:2"), { minX: 3.4, maxX: 3.6, minZ: 1.95, maxZ: 2.05 })).toBe(true);
  });
});

describe("placing furniture", () => {
  it("has to be on owned floor and clear of everything", () => {
    const house = plan([at("longTable", 0, 0)]);
    expect(house.placeProblem(at("stool", 0, 8), [])).toMatch(/floor/);
    expect(house.placeProblem(at("stool", 0, 0), [])).toMatch(/way/);
    expect(house.placeProblem(at("stool", 3, 3), [{ minX: 2.9, maxX: 3.1, minZ: 2.9, maxZ: 3.1 }])).toMatch(/way/);
    expect(house.placeProblem(at("stool", 3, 3), [])).toBeNull();
  });

  it("doesn't count a piece against itself while it's being moved", () => {
    const house = plan([at("longTable", 0, 0)]);
    expect(house.placeProblem(at("longTable", 0.25, 0), [], 0)).toBeNull();
  });

  it("swaps a long table's footprint when it's turned", () => {
    expect(footprint(at("longTable", 0, 0, 1)).maxZ).toBeCloseTo(0.85);
    expect(footprint(at("longTable", 0, 0, 0)).maxZ).toBeCloseTo(0.475);
  });
});

describe("seats", () => {
  it("counts seats at tables and the customer side of the bar only", () => {
    const seats = seatSpecs([
      at("longTable", -3, 2),
      at("chair", -3, 2.8),
      at("chair", 0, 3),
      at("stool", 3, -2.1),
      at("stool", 3, -3.7),
    ]);
    expect(seats.map((seat) => seat.table)).toEqual(["Table 0", "Bar"]);
    expect(seats[1].targetZ).toBeCloseTo(-2.9);
  });

  it("keeps seat numbers in furniture order", () => {
    const seats = seatSpecs([at("stool", 3, -2.1), at("stool", 4, -2.1)]);
    expect(seats.map((seat) => seat.x)).toEqual([3, 4]);
  });

  it("turns a chair to face its table", () => {
    const table = at("longTable", 0, 0);
    const south = at("chair", 0, 0.8);
    const north = at("chair", 0, -0.8);
    expect(faceTable(south, [table, south])).toBe(0);
    expect(faceTable(north, [table, north])).toBe(2);
    expect(faceTable(at("chair", 5, 3, 3), [table])).toBe(3);
  });
});

describe("saved layouts", () => {
  it("accepts a real layout and rejects a broken one", () => {
    expect(isHouseLayout(emptyLayout([at("chair", 1, 1)]))).toBe(true);
    expect(isHouseLayout({ ...emptyLayout(), tiles: [["a", 1]] })).toBe(false);
    expect(isHouseLayout({ ...emptyLayout(), stored: ["throne"] })).toBe(false);
    expect(isHouseLayout(null)).toBe(false);
  });
});

describe("the house plans desk", () => {
  const desk = { kind: "desk" } as const;

  it("opens by day, and not once the bell has rung", () => {
    const t = new Tavern(4, ["A", "A", "Bar", "Bar"]);
    expect(t.prompt(0, desk)?.actionable).toBe(true);
    t.open();
    expect(t.prompt(0, desk)?.actionable).toBe(false);
  });

  it("waits for dishes and spills to be cleared, but not dust", () => {
    const dusty = new Tavern(4, ["A", "A", "Bar", "Bar"]);
    dusty.messes.push({ id: 1, kind: "dust", spots: [0] });
    expect(dusty.prompt(0, desk)?.actionable).toBe(true);
    const dirty = new Tavern(4, ["A", "A", "Bar", "Bar"]);
    dirty.messes.push({ id: 1, kind: "dishes", spots: [0] });
    expect(dirty.prompt(0, desk)).toMatchObject({ actionable: false, label: expect.stringMatching(/dishes/) });
  });

  it("carries the layout through a snapshot without sharing it", () => {
    const t = new Tavern(4);
    expect(t.snapshot().layout).toBeUndefined();
    t.layout = emptyLayout([at("chair", 1, 1)]);
    const saved = t.snapshot();
    t.layout.furniture[0].x = 9;
    const loaded = new Tavern(4);
    loaded.restore(saved);
    expect(loaded.layout?.furniture[0].x).toBe(1);
  });

  it("uses new seats once they're set", () => {
    const t = new Tavern(0);
    t.setSeats(["A", "A"]);
    t.open();
    for (let i = 0; i < 200 && t.guests.length === 0; i++) t.tick(0.5, { listeningTo: null, night: true });
    expect(t.guests.length).toBeGreaterThan(0);
    expect(t.guests[0].seat).toBeLessThan(2);
  });
});
