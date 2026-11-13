import { describe, expect, it } from "vitest";
import { dayIcon, dayStory, statusLines, townTalk, type DayState, type Standing } from "../src/game/daystory";

const morning = (over: Partial<DayState> = {}): DayState => ({
  day: 0,
  gold: 0,
  debt: 150,
  trust: 3,
  trustMax: 15,
  trustToRise: 13,
  heat: 0,
  heatMax: 8,
  messes: 0,
  ...over,
});

const standing = (over: Partial<Standing> = {}): Standing => ({
  gold: 0,
  trust: 3,
  heat: 0,
  respect: 0,
  fame: 0,
  lewdness: 0,
  corruption: 0,
  flirt: 0,
  kindness: 0,
  greed: 0,
  drinks: 0,
  protected: 0,
  informed: 0,
  sold: 0,
  ...over,
});

const icons = { gold: "g", trust: "t", heat: "h" };
const limits = { debt: 150, trustMax: 15, heatMax: 8 };

describe("the day's card", () => {
  it("gives every day of the run an icon of its own", () => {
    const drawn = [0, 1, 2].map(dayIcon);
    expect(new Set(drawn).size).toBe(3);
    expect(drawn.every((svg) => svg.startsWith("<svg"))).toBe(true);
  });

  it("says what's still owed the Baron, with no day it falls due", () => {
    const lines = dayStory(morning({ day: 1, gold: 50 }));
    expect(lines.some((l) => l.includes("You have 50 gold") && l.includes("stands at 150"))).toBe(true);
    expect(dayStory(morning({ debt: 0 })).some((l) => l.includes("debt"))).toBe(false);
    expect(dayStory(morning({ promised: true })).some((l) => l.includes("promised Pell the book"))).toBe(true);
  });

  it("says where she stands in Tarven, and which house is next", () => {
    const lines = dayStory(morning({ fans: 120, rank: 5, above: { name: "The Bakehouse", fans: 200 } }));
    expect(lines.some((l) => l.includes("5th of 6") && l.includes("The Bakehouse has 200"))).toBe(true);
    expect(dayStory(morning({ fans: 600, rank: 1, above: null })).some((l) => l.includes("first in Tarven"))).toBe(true);
  });

  it("speaks of the village, the baron's men and the mess when there is something to say", () => {
    const quiet = dayStory(morning());
    expect(quiet).toHaveLength(2);
    const loud = dayStory(morning({ day: 1, trust: 13, heat: 7, messes: 4 }));
    expect(loud.some((l) => l.includes("behind you"))).toBe(true);
    expect(loud.some((l) => l.includes("by name"))).toBe(true);
    expect(loud.some((l) => l.includes("mess"))).toBe(true);
  });
});

describe("the morning after", () => {
  it("has the town talk about the biggest things she did, at most three", () => {
    const talk = townTalk(standing(), standing({ sold: 1, fame: 4, flirt: 2, drinks: 5, kindness: 1 }));
    expect(talk).toHaveLength(3);
    expect(talk[0]).toContain("sold");
    expect(talk[1]).toContain("market");
  });

  it("says when nobody noticed", () => {
    expect(townTalk(standing(), standing())).toEqual([expect.stringContaining("barely noticed")]);
  });

  it("shows each status with how far it moved, good or bad for her", () => {
    const rows = statusLines(standing({ gold: 60, heat: 2, respect: -1 }), standing({ gold: 20 }), limits, icons);
    const by = (label: string) => rows.find((r) => r.label === label);
    expect(by("Gold")).toMatchObject({ value: "60/150", change: 40, tone: "good" });
    expect(by("Heat")).toMatchObject({ change: 2, tone: "bad" });
    expect(by("Respect")).toMatchObject({ value: "-1", change: -1, tone: "bad" });
    expect(by("Trust")).toMatchObject({ change: 0, tone: "plain" });
  });

  it("shows no changes without a day to measure against", () => {
    expect(statusLines(standing({ gold: 60 }), null, limits, icons).every((r) => r.change === 0)).toBe(true);
  });
});
