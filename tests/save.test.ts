import { beforeEach, describe, expect, it, vi } from "vitest";
import { latestSave, readSave, writeSave } from "../src/game/save";
import { Tavern } from "../src/game/tavern";
import { METERS } from "../src/game/passives";

const SEATS = 11;

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", memoryStorage());
});

describe("tavern snapshot", () => {
  it("restores what lasts between nights and opens that day, closed and empty", () => {
    const t = new Tavern(SEATS);
    t.gold = 64;
    t.trust = 7;
    t.heat = 2;
    // The tap never runs dry: an empty one from an old save loads full.
    t.tapLeft = 0;
    t.upgrades.add("bigpot");
    t.nightIndex = 1;
    const saved = t.snapshot();

    const loaded = new Tavern(SEATS);
    loaded.open();
    for (let i = 0; i < 100; i++) loaded.tick(0.1, { listeningTo: null, night: true });
    loaded.carrying[0] = "ale";
    loaded.restore(saved);

    expect(loaded.snapshot()).toEqual({ ...saved, tapLeft: 8 });
    expect(loaded.phase).toBe("day");
    expect(loaded.guests).toHaveLength(0);
    expect(loaded.carrying).toEqual([null, null]);
    const messages = loaded.takeMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/^Day 2\./);
  });
});

describe("hidden stats", () => {
  it("start at zero and last through a save", () => {
    const t = new Tavern(SEATS);
    expect(t.persona.lust).toBe(0);
    expect(t.persona.desires).toBe(0);
    t.persona.lust = 4;
    t.persona.desires = 7;

    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.persona.lust).toBe(4);
    expect(loaded.persona.desires).toBe(7);
  });

  it("load as zero from a save made before they existed", () => {
    const t = new Tavern(SEATS);
    const save = t.snapshot();
    const older = { ...save.persona! } as Partial<NonNullable<typeof save.persona>>;
    delete older.lust;
    delete older.desires;
    t.persona.lust = 5;
    t.restore({ ...save, persona: older as NonNullable<typeof save.persona> });
    expect(t.persona.lust).toBe(0);
    expect(t.persona.desires).toBe(0);
  });

  it("are carried by each guest, within their limits", () => {
    const t = new Tavern(SEATS);
    t.open();
    for (let i = 0; i < 600 && t.guests.length === 0; i++) t.tick(0.1, { listeningTo: null, night: true });
    expect(t.guests.length).toBeGreaterThan(0);
    for (const guest of t.guests) {
      expect(guest.lust).toBeGreaterThanOrEqual(0);
      expect(guest.lust).toBeLessThanOrEqual(10);
      expect(guest.desires).toBeGreaterThanOrEqual(0);
      expect(guest.desires).toBeLessThanOrEqual(10);
    }
  });
});

describe("save slots", () => {
  it("reads back what was written", () => {
    const t = new Tavern(SEATS);
    t.gold = 30;
    expect(writeSave(2, 1, t.snapshot())).toBe(true);
    const data = readSave(2);
    expect(data?.active).toBe(1);
    expect(data?.tavern.gold).toBe(30);
    expect(readSave(1)).toBeNull();
  });

  it("picks the newest save to continue from", () => {
    const t = new Tavern(SEATS);
    vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(3000).mockReturnValueOnce(2000);
    writeSave(1, 0, t.snapshot());
    writeSave("auto", 0, t.snapshot());
    writeSave(3, 0, t.snapshot());
    expect(latestSave()?.slot).toBe("auto");
    vi.restoreAllMocks();
  });

  it("ignores saves that are broken or from another version", () => {
    localStorage.setItem("tarven.save.1", "{not json");
    localStorage.setItem("tarven.save.2", JSON.stringify({ version: 99, savedAt: 1, active: 0, tavern: {} }));
    const t = new Tavern(SEATS);
    writeSave(3, 0, t.snapshot());
    const tampered = JSON.parse(localStorage.getItem("tarven.save.3")!);
    tampered.tavern.nightIndex = -1;
    localStorage.setItem("tarven.save.3", JSON.stringify(tampered));

    expect(readSave(1)).toBeNull();
    expect(readSave(2)).toBeNull();
    expect(readSave(3)).toBeNull();
  });

  it("reports failure when the browser blocks storage", () => {
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(writeSave(1, 0, new Tavern(SEATS).snapshot())).toBe(false);
  });
});

describe("saving the moment", () => {
  const night = { listeningTo: null, night: true };
  const moment = (t: Tavern) => ({ time: 45.5, at: { x: 1, z: -2, facing: 0.5 }, dayStart: null, ...t.captureMoment() });

  it("brings a night back as it stood: the guests, her hands, the clock", () => {
    const t = new Tavern(SEATS);
    t.gold = 30;
    t.open();
    for (let i = 0; i < 200; i++) t.tick(0.1, night);
    for (const guest of t.guests) if (guest.status === "arriving") t.guestArrived(guest.id);
    t.carrying[0] = "ale";
    t.carryCount[0] = 2;
    t.meters[METERS[0]] = 40;
    expect(t.phase).toBe("service");
    expect(t.guests.length).toBeGreaterThan(0);
    expect(writeSave(2, 1, t.snapshot(), undefined, moment(t))).toBe(true);

    const data = readSave(2)!;
    expect(data.moment?.time).toBe(45.5);
    const loaded = new Tavern(SEATS);
    loaded.restore(data.tavern);
    loaded.resumeMoment(data.moment!);

    expect(loaded.phase).toBe("service");
    expect(loaded.clock).toBe(t.clock);
    expect(loaded.guests).toEqual(t.guests);
    expect(loaded.carrying).toEqual(["ale", null]);
    expect(loaded.carryCount).toEqual([2, 0]);
    expect(loaded.meters[METERS[0]]).toBe(40);
    expect(loaded.gold).toBe(t.gold);
    expect(loaded.tonight).toEqual(t.tonight);
    // The night carries on from there: the same guests are still due, not a fresh crowd.
    for (let i = 0; i < 50; i++) {
      t.tick(0.1, night);
      loaded.tick(0.1, night);
    }
    expect(loaded.guests.map((g) => g.id)).toEqual(t.guests.map((g) => g.id));
  });

  it("keeps a day's progress: a mess cleaned, gold spent", () => {
    const t = new Tavern(SEATS);
    t.gold = 50;
    t.napped = true;
    t.drunk = 3;
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    loaded.resumeMoment(t.captureMoment());
    expect(loaded.phase).toBe("day");
    expect(loaded.napped).toBe(true);
    expect(loaded.drunk).toBe(3);
  });

  it("drops a broken moment, and the save still opens at the start of its day", () => {
    const t = new Tavern(SEATS);
    expect(writeSave(1, 1, t.snapshot(), undefined, { ...moment(t), at: { x: "here" } } as never)).toBe(true);
    const data = readSave(1)!;
    expect(data).not.toBeNull();
    expect(data.moment).toBeUndefined();
  });

  it("refuses a moment whose fields are the wrong kind, rather than half-loading it", () => {
    const t = new Tavern(SEATS);
    const loaded = new Tavern(SEATS);
    expect(() => loaded.resumeMoment({ tavern: { ...t.captureMoment().tavern, gold: "lots" } })).toThrow();
    expect(() => loaded.resumeMoment({ tavern: { ...t.captureMoment().tavern, guests: 3 } })).toThrow();
  });
});
