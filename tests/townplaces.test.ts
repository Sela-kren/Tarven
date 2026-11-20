import { describe, expect, it } from "vitest";
import { newRecruits } from "../src/game/recruits";
import { newCareers } from "../src/game/careers";
import { TOWN_PLACES, type TownPlaceId, type TownState } from "../src/game/townplaces";
import { Tavern } from "../src/game/tavern";
import type { ArcStage } from "../src/game/lewd";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const ARCS: ArcStage[] = ["sheltered", "curious", "willing", "known"];
const base: TownState = { arc: "sheltered", corruption: 0, fame: 0, respect: 0, flirt: 0, heat: 0, trust: 0, fatigueLevel: 0, flags: new Set(), houses: {}, fans: 0, nights: 0, done: {}, recruits: newRecruits(), careers: newCareers() };

function day(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 100;
  return t;
}

describe("the town's places, version 1", () => {
  it("every place has something to do", () => {
    for (const place of Object.values(TOWN_PLACES)) {
      expect(place.actions.length).toBeGreaterThanOrEqual(2);
      expect(place.describe(base).length).toBeGreaterThan(0);
    }
  });

  it("every action she can do has words, at every stage", () => {
    for (const place of Object.values(TOWN_PLACES)) {
      for (const action of place.actions) {
        for (const arc of ARCS) {
          for (const roll of [0, 0.5, 0.99]) {
            const s = { ...base, arc, corruption: 50 };
            if (action.locked?.(s)) continue;
            expect(action.run(s, () => roll).line.length, `${place.id}:${action.id} at ${arc}`).toBeGreaterThan(10);
          }
        }
      }
    }
  });

  it("the lewder jobs open with her stage", () => {
    const t = day();
    expect(t.townBlocked("board", "painter", 9)).toBe("needs Curious");
    expect(t.townBlocked("board", "model", 9)).toBe("needs Willing");
    expect(t.townBlocked("warmhouse", "session", 9)).toBe("needs Willing");
    expect(t.townBlocked("board", "gerald", 9)).toBeNull();
    t.touchMemory.lets.hand = 200;
    expect(t.arcStage).not.toBe("sheltered");
    expect(t.townBlocked("board", "painter", 9)).toBeNull();
    // Three nights shared upstairs make her Willing (lewd.ts).
    t.passives.add("backStairs");
    expect(t.arcStage).toBe("willing");
    expect(t.townBlocked("board", "model", 9)).toBeNull();
  });

  it("each runs once a day, costs its price and pays what it earns", () => {
    const t = day();
    const out = t.doTownAction("garrison", "laundry");
    expect(out?.gold).toBe(5);
    expect(t.gold).toBe(105);
    expect(t.doTownAction("garrison", "laundry")).toBeNull();
    expect(t.townBlocked("garrison", "laundry", 9)).toBe("done today");
    t.doTownAction("garrison", "rhea");
    expect(t.gold).toBe(103);
  });

  it("brings guests tonight, fans at dawn, and tires her", () => {
    const t = day();
    t.doTownAction("quarry", "haul");
    expect(t.errandGuests).toBe(1);
    expect(t.fatigue).toBeGreaterThan(0);
    t.doTownAction("bakehouse", "pies");
    expect(t.errandFans).toBe(1);
  });

  it("hard work is refused when she's worn out, and a candle rests her", () => {
    const t = day();
    t.fatigue = 1000;
    expect(t.townBlocked("quarry", "haul", 9)).toBe("too tired");
    const before = t.fatigue;
    t.doTownAction("chapel", "candle");
    expect(t.fatigue).toBeLessThan(before);
  });

  it("confession lowers corruption at a cost, once there's something to confess", () => {
    const t = day();
    expect(t.townBlocked("chapel", "confess", 9)).toBe("nothing heavy enough yet");
    t.corruption = 60;
    t.doTownAction("chapel", "confess");
    expect(t.corruption).toBe(55);
    expect(t.heat).toBe(1);
  });

  it("the story shuts doors: Oden gone, Mara taken, Silas crossed", () => {
    const t = day();
    t.plotFlags.add("odenShut");
    t.plotFlags.add("maraArrested");
    t.plotFlags.add("silasAngry");
    expect(t.townBlocked("chapel", "oden", 9)).toBe("Oden's gone");
    expect(t.townBlocked("fields", "mara", 9)).toBe("Mara's been taken");
    expect(t.townBlocked("quarry", "crate", 9)).toBe("Silas won't deal with you");
    expect(t.townBlocked("fields", "harvest", 9)).toBeNull();
  });

  it("nothing after five, and nothing at night", () => {
    const t = day();
    expect(t.townBlocked("bakehouse", "gossip", 0)).toBe("it's past five");
    t.phase = "service";
    expect(t.townBlocked("bakehouse", "gossip", 9)).toBe("only by day");
  });

  it("what she's done today is kept in a save", () => {
    const t = day();
    t.doTownAction("ciderbarn", "cider");
    const back = new Tavern(TABLES.length, TABLES);
    back.restore(JSON.parse(JSON.stringify(t.snapshot())));
    expect(back.townBlocked("ciderbarn", "cider", 9)).toBe("done today");
  });

  it("knows every place on the street", () => {
    const ids: TownPlaceId[] = ["board", "chapel", "warmhouse", "copperbell", "bakehouse", "ciderbarn", "garrison", "fields", "quarry", "tollgate", "townhall"];
    expect(Object.keys(TOWN_PLACES).sort()).toEqual([...ids].sort());
  });
});
