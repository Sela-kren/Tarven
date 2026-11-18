import { describe, expect, it } from "vitest";
import {
  addFanNight,
  biggestFanGroup,
  CHAPTER_ENDINGS,
  chapterEndingCard,
  chapterEndingFor,
  firstInTarvenCard,
  LOW_RESPECT,
  newFanGroups,
  readFanGroups,
  RISE_TRUST,
  TO_BE_CONTINUED,
  type ChapterFacts,
} from "../src/game/chapter1";
import type { PlotFlag } from "../src/game/plot";
import { ENDINGS, HEAT_MAX, Tavern, TRUST_TO_OVERTHROW } from "../src/game/tavern";

const idle = { listeningTo: null, night: true };

/** First in Tarven reached by a keeper the village loves, with the debt paid and the book kept. */
const rising: ChapterFacts = {
  flags: new Set(),
  trust: RISE_TRUST,
  groups: { keeper: 300, lantern: 100, network: 100 },
  owed: 0,
  arrears: 0,
  bookPromised: false,
  arc: "curious",
  respect: 3,
  lanternHung: false,
};

function story(): Tavern {
  const t = new Tavern(11);
  t.storyBeats = true;
  return t;
}

function nextMorning(t: Tavern, fans?: number): void {
  if (t.phase === "day") {
    t.open();
    t.tick(0, idle);
  }
  for (let i = 0; i < 4000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const guest of [...t.guests]) {
      if (guest.status === "arriving") t.guestArrived(guest.id);
      if (guest.status === "leaving") t.guestLeft(guest.id);
    }
  }
  t.chooseLastCall(0);
  t.heat = Math.min(t.heat, HEAT_MAX - 1);
  t.sleep();
  if (fans !== undefined) t.fans = fans;
  t.nextNight();
}

/** The morning the Copper Bell falls, its boss at the door: every other beat played. */
function copperBellMorning(setup: (t: Tavern) => void = () => {}): Tavern {
  const t = story();
  for (const b of ["deserter", "cider", "meeting", "bakehouse", "pell", "canteen", "tollgate"]) t.beatsDone.add(b);
  t.houses = { cider: "partner", bakehouse: "partner", canteen: "partner", tollgate: "partner" };
  setup(t);
  nextMorning(t, 520);
  expect(t.beatCard?.title).toContain("The Copper Bell");
  return t;
}

describe("Chapter 1 endings: how each is picked", () => {
  it("The Village Rises: Mara free, trust high, Keeper her biggest group", () => {
    expect(chapterEndingFor(rising)).toBe("overthrow");
    expect(CHAPTER_ENDINGS.overthrow.title).toBe("The Village Rises");
    expect(RISE_TRUST).toBe(TRUST_TO_OVERTHROW);
  });

  it("not if Mara was arrested, the trust is short, or Keeper isn't her biggest group", () => {
    expect(chapterEndingFor({ ...rising, flags: new Set<PlotFlag>(["maraArrested"]) })).not.toBe("overthrow");
    expect(chapterEndingFor({ ...rising, trust: RISE_TRUST - 1 })).not.toBe("overthrow");
    expect(chapterEndingFor({ ...rising, groups: { keeper: 100, lantern: 300, network: 0 } })).not.toBe("overthrow");
    expect(chapterEndingFor({ ...rising, groups: { keeper: 100, lantern: 0, network: 300 } })).not.toBe("overthrow");
  });

  it("Lost to the Night: Known, low respect, no lantern", () => {
    const lost = { ...rising, trust: 5, arc: "known" as const, respect: LOW_RESPECT };
    expect(chapterEndingFor(lost)).toBe("lostToNight");
    expect(chapterEndingFor({ ...lost, lanternHung: true })).not.toBe("lostToNight");
    expect(chapterEndingFor({ ...lost, respect: LOW_RESPECT + 1 })).not.toBe("lostToNight");
    expect(chapterEndingFor({ ...lost, arc: "willing" })).not.toBe("lostToNight");
  });

  it("Paid in Full: the debt paid and the book kept", () => {
    const kept = { ...rising, trust: 5 };
    expect(chapterEndingFor(kept)).toBe("paidInFull");
    expect(chapterEndingFor({ ...kept, owed: 100 })).toBe("openAsUsual");
    expect(chapterEndingFor({ ...kept, arrears: 20 })).toBe("openAsUsual");
    expect(chapterEndingFor({ ...kept, bookPromised: true })).toBe("openAsUsual");
  });

  it("Open as Usual otherwise", () => {
    expect(chapterEndingFor({ ...rising, trust: 5, owed: 150, bookPromised: true })).toBe("openAsUsual");
  });

  it("reads First in Tarven, then the ending's epilogue, then the teaser last", () => {
    const card = firstInTarvenCard(new Set(), "network");
    expect(card[0]).toContain("Every table in Tarven");
    expect(card.some((l) => l.includes("raises a cup"))).toBe(true);
    expect(card.some((l) => l.includes("whispered at your tables"))).toBe(true);
    expect(card.join(" ")).not.toContain("To be continued");
    for (const id of ["overthrow", "paidInFull", "lostToNight", "openAsUsual"] as const) {
      const ending = chapterEndingCard(id);
      expect(ending.title).toBe(`Chapter 1: ${CHAPTER_ENDINGS[id].title}`);
      expect(ending.lines.length).toBeGreaterThanOrEqual(3);
      expect(ending.lines[ending.lines.length - 1]).toBe(TO_BE_CONTINUED);
    }
    // The old ending's table still reads, for the run's own endings later.
    expect(ENDINGS.overthrow.title).toBe("The Village Rises");
  });
});

describe("fan groups", () => {
  it("count a night's tagged fans to their group, and the rest to Keeper", () => {
    const g = newFanGroups();
    addFanNight(g, 40, { lantern: 15, network: 5 });
    expect(g).toEqual({ keeper: 20, lantern: 15, network: 5 });
    addFanNight(g, -30, {});
    expect(g.keeper).toBe(0);
    expect(biggestFanGroup(g)).toBe("lantern");
    expect(biggestFanGroup(newFanGroups())).toBe("keeper");
  });

  it("start older saves with every fan as Keeper", () => {
    expect(readFanGroups(undefined, 120)).toEqual({ keeper: 120, lantern: 0, network: 0 });
    expect(readFanGroups({ keeper: 3, lantern: "x", network: 9 }, 120)).toEqual({ keeper: 3, lantern: 0, network: 9 });
  });
});

describe("Chapter 1 ends, the run doesn't", () => {
  it("picks the ending as she passes the Copper Bell, and the nights go on", () => {
    const t = copperBellMorning((t) => (t.bookPromised = true));
    // The night's walkouts cost trust: the village's trust as she meets Jory.
    t.trust = 15;
    t.fanGroups = { keeper: 400, lantern: 60, network: 60 };
    t.answerHouse("partner");
    expect(t.chapterEnding).toBe("overthrow");
    expect(t.takeFirstInTarven()).toBe(true);
    // A chapter card, never the end of the run.
    expect(t.phase).toBe("day");
    expect(t.ending).toBeNull();
    nextMorning(t);
    expect(t.phase).toBe("day");
    expect(t.ending).toBeNull();
    expect(t.nightIndex).toBeGreaterThan(1);
  });

  it("closes the Village Rises for good when Mara was arrested", () => {
    const t = copperBellMorning((t) => {
      t.plotFlags.add("maraArrested");
      t.bookPromised = true;
    });
    t.trust = 15;
    t.fanGroups = { keeper: 400, lantern: 60, network: 60 };
    t.answerHouse("partner");
    expect(t.chapterEnding).toBe("openAsUsual");
  });

  it("is Paid in Full with the Baron's due all paid and the book kept", () => {
    const t = copperBellMorning((t) => {
      t.owed = 100;
      t.gold = 500;
    });
    t.trust = 5;
    // Pell took the last hundred as the Bell fell.
    expect(t.owed).toBe(0);
    t.answerHouse("partner");
    expect(t.chapterEnding).toBe("paidInFull");
  });

  it("is saved with the story, and older saves have none", () => {
    const t = copperBellMorning((t) => (t.bookPromised = true));
    t.trust = 15;
    t.fanGroups = { keeper: 400, lantern: 60, network: 60 };
    t.answerHouse("ruin");
    t.fanGroups.lantern = 7;
    const save = t.snapshot();
    const back = story();
    back.restore(save);
    expect(back.chapterEnding).toBe("overthrow");
    expect(back.fanGroups).toEqual(t.fanGroups);
    delete save.story!.chapter1;
    delete save.story!.fanGroups;
    back.restore(save);
    expect(back.chapterEnding).toBeNull();
    expect(back.fanGroups).toEqual({ keeper: back.fans, lantern: 0, network: 0 });
  });

  it("a ruined Copper Bell sends its fans as Network", () => {
    const t = copperBellMorning();
    const before = t.fanGroups.network;
    t.answerHouse("ruin");
    expect(t.fanGroups.network).toBe(before + 250);
  });
});
