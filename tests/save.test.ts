import { beforeEach, describe, expect, it, vi } from "vitest";
import { latestSave, readSave, writeSave } from "../src/game/save";
import { Tavern } from "../src/game/tavern";

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
    t.tapLeft = 3;
    t.upgrades.add("bigpot");
    t.nightIndex = 1;
    const saved = t.snapshot();

    const loaded = new Tavern(SEATS);
    loaded.open();
    for (let i = 0; i < 100; i++) loaded.tick(0.1, { listeningTo: null, night: true });
    loaded.carrying[0] = "ale";
    loaded.restore(saved);

    expect(loaded.snapshot()).toEqual(saved);
    expect(loaded.phase).toBe("day");
    expect(loaded.guests).toHaveLength(0);
    expect(loaded.carrying).toEqual([null, null]);
    const messages = loaded.takeMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/^Day 2\./);
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
    tampered.tavern.nightIndex = 42;
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
