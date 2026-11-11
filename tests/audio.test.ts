import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SOUND,
  EFFECT_FILES,
  falloff,
  footfalls,
  MUSIC_FILES,
  musicFor,
  nextSoundLevel,
  readSoundSettings,
} from "../src/game/audio";
import { Tavern, type Station, type Target } from "../src/game/tavern";

const station = (s: Station): Target => ({ kind: "station", station: s });
const daytime = { listeningTo: null, night: false };

describe("music", () => {
  it("plays the title theme before the tavern opens and at the end", () => {
    expect(musicFor(true, "day", 0)).toEqual(["bards_tale"]);
    expect(musicFor(false, "ended", 2)).toEqual(["bards_tale"]);
  });

  it("opens each night on a different song from the same lively set", () => {
    const nights = [0, 1, 2].map((night) => musicFor(false, "service", night)!);
    expect(new Set(nights.map((set) => set[0])).size).toBe(3);
    for (const set of nights) {
      expect([...set].sort()).toEqual([...nights[0]].sort());
      expect(set).not.toContain("harvest_season");
      expect(set).not.toContain("bards_tale");
    }
  });

  it("plays calmer songs by day", () => {
    for (const phase of ["day", "dusk", "dawn"] as const) {
      const day = musicFor(false, phase, 1)!;
      expect(day).toContain("harvest_season");
      expect(day).not.toContain(musicFor(false, "service", 1)![0]);
    }
  });

  it("hands back the same playlist every frame, so the music isn't restarted", () => {
    expect(musicFor(false, "service", 1)).toBe(musicFor(false, "service", 1));
    expect(musicFor(false, "day", 1)).toBe(musicFor(false, "dusk", 2));
  });

  it("has a file on disk for every song", () => {
    const onDisk = Object.keys(import.meta.glob("../public/audio/music/*")).map((path) => path.split("/").pop());
    for (const file of Object.values(MUSIC_FILES)) expect(onDisk, file).toContain(file);
  });

  it("stops after last call", () => {
    expect(musicFor(false, "lastcall", 0)).toBeNull();
    expect(musicFor(false, "bedtime", 0)).toBeNull();
  });
});

describe("footfalls", () => {
  it("lands twice in each full stride", () => {
    expect(footfalls(0, Math.PI * 2)).toBe(2);
  });

  it("is silent between landings and when standing still", () => {
    expect(footfalls(0, 0.5)).toBe(0);
    expect(footfalls(1, 1)).toBe(0);
  });

  it("counts the landing a small step crosses", () => {
    expect(footfalls(Math.PI / 2 - 0.01, Math.PI / 2 + 0.01)).toBe(1);
  });
});

describe("falloff", () => {
  it("is full up close and gone at its reach", () => {
    expect(falloff(0, 10)).toBe(1);
    expect(falloff(10, 10)).toBe(0);
    expect(falloff(50, 10)).toBe(0);
  });

  it("gets quieter with distance", () => {
    expect(falloff(2, 10)).toBeGreaterThan(falloff(6, 10));
  });
});

describe("sound settings", () => {
  const items = new Map<string, string>();

  beforeEach(() => {
    items.clear();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => items.get(key) ?? null,
      setItem: (key: string, value: string) => items.set(key, value),
    });
  });

  it("steps up through the levels and wraps round to off", () => {
    expect(nextSoundLevel(0)).toBe(0.25);
    expect(nextSoundLevel(0.75)).toBe(1);
    expect(nextSoundLevel(1)).toBe(0);
  });

  it("defaults when nothing is saved or the save is broken", () => {
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND);
    items.set("tarven.sound", "{not json");
    expect(readSoundSettings()).toEqual(DEFAULT_SOUND);
  });

  it("keeps good values and replaces bad ones", () => {
    items.set("tarven.sound", JSON.stringify({ music: 0.25, effects: 7, muted: true }));
    expect(readSoundSettings()).toEqual({ music: 0.25, effects: DEFAULT_SOUND.effects, muted: true });
  });
});

describe("effect table", () => {
  it("names each file once", () => {
    expect(new Set(EFFECT_FILES).size).toBe(EFFECT_FILES.length);
    expect(EFFECT_FILES.length).toBeGreaterThan(0);
  });
});

describe("tavern cues", () => {
  it("pours, then clinks when the ale is ready, then clinks as you take it", () => {
    const t = new Tavern(11);
    t.interact(0, station("tap"));
    expect(t.takeCues()).toEqual(["pour"]);
    for (let i = 0; i < 20; i++) t.tick(0.1, daytime);
    expect(t.takeCues()).toEqual(["aleReady"]);
    t.interact(0, station("tap"));
    expect(t.takeCues()).toEqual(["takeAle"]);
  });

  it("empties the queue when read", () => {
    const t = new Tavern(11);
    t.interact(0, station("tap"));
    t.takeCues();
    expect(t.takeCues()).toEqual([]);
  });

  it("puts things down and fills the tap with different sounds", () => {
    const t = new Tavern(11);
    t.interact(0, station("barrel"));
    expect(t.takeCues()).toEqual(["takeCask"]);
    t.interact(0, station("tap"));
    expect(t.takeCues()).toEqual(["refill"]);
    t.interact(0, station("bread"));
    t.takeCues();
    t.interact(0, station("bread"));
    expect(t.takeCues()).toEqual(["putDown"]);
  });

  it("smashes a carried drink and only thuds with empty hands", () => {
    const t = new Tavern(11);
    t.stumble(0);
    expect(t.takeCues()).toEqual(["drop"]);
    t.interact(0, station("tap"));
    for (let i = 0; i < 20; i++) t.tick(0.1, daytime);
    t.interact(0, station("tap"));
    t.takeCues();
    t.stumble(0);
    expect(t.takeCues()).toEqual(["smashOne"]);
  });

  it("does not carry cues across a load", () => {
    const t = new Tavern(11);
    const save = t.snapshot();
    t.interact(0, station("tap"));
    t.restore(save);
    expect(t.takeCues()).toEqual([]);
  });
});
