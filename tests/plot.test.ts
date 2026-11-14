import { describe, expect, it } from "vitest";
import { SIDE_RUMORS } from "../src/game/ledger";
import { BOTTLE_MARKUP, FLAG_NEWS, firstInTarvenLines, SILAS_ARRIVES, type PlotFlag } from "../src/game/plot";
import { BOTTLES, HEAT_MAX, NIGHTS, Tavern } from "../src/game/tavern";

const SEATS = 11;
const idle = { listeningTo: null, night: true };

/** A tavern whose story runs on fans, as in the game (the tests' setup turns it off everywhere else). */
function story(): Tavern {
  const t = new Tavern(SEATS);
  t.storyBeats = true;
  return t;
}

/** Plays tonight out with nobody served, up to last call. */
function toLastCall(t: Tavern): void {
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
  expect(t.phase).toBe("lastcall");
}

/** To bed, and on to the next morning, with `fans` set as she goes to bed. */
function toMorning(t: Tavern, fans: number): void {
  if (t.phase === "lastcall") t.chooseLastCall(0);
  t.heat = Math.min(t.heat, HEAT_MAX - 1);
  t.sleep();
  t.fans = fans;
  t.nextNight();
}

const labels = (t: Tavern) => t.lastCallChoices.map((c) => c.label);

describe("Act 1's last calls set story flags", () => {
  it.each([
    [0, "odenShut"],
    [1, "silasOwes"],
    [2, "silasAngry"],
  ] as [number, PlotFlag][])("the salt: choice %i sets %s, and the morning says so", (index, flag) => {
    const t = story();
    toLastCall(t);
    t.heardRumor = true;
    t.chooseLastCall(index);
    expect([...t.plotFlags]).toEqual([flag]);
    expect(t.news).toContain(FLAG_NEWS[flag]);
  });

  it("sets nothing when she didn't hear the rumour", () => {
    const t = story();
    toLastCall(t);
    t.chooseLastCall(0);
    expect(t.plotFlags.size).toBe(0);
  });

  it("never sets a flag on a side night", () => {
    for (const rumor of SIDE_RUMORS) for (const choice of [...rumor.heard, ...rumor.unheard]) expect(choice.sets).toBeUndefined();
  });
});

describe("what comes back", () => {
  it("selling the salt brings Silas in angry the next night, once", () => {
    const t = story();
    toLastCall(t);
    t.heardRumor = true;
    t.chooseLastCall(2);
    toMorning(t, 10);
    t.open();
    t.tick(0, idle);
    expect(t.takeMessages()).toContain(SILAS_ARRIVES);
    expect(t.plotFlags.has("silasCame")).toBe(true);
    let silas = false;
    for (let i = 0; i < 4000 && !silas && t.phase === "service"; i++) {
      t.tick(0.1, idle);
      for (const guest of [...t.guests]) if (guest.status === "arriving") t.guestArrived(guest.id);
      silas = t.guests.some((g) => g.kind === "smuggler" && g.hired && g.mood === "angry");
    }
    expect(silas).toBe(true);
  });

  it("crossing Silas's crew makes bottles dearer; keeping his secret doesn't", () => {
    const t = story();
    expect(t.bottleCost("wine")).toBe(BOTTLES.wine.cost);
    t.plotFlags.add("silasOwes");
    expect(t.bottleCost("wine")).toBe(BOTTLES.wine.cost);
    t.plotFlags.add("odenShut");
    expect(t.bottleCost("wine")).toBe(BOTTLES.wine.cost + BOTTLE_MARKUP);
  });

  it("the meeting night opens with what became of Ash", () => {
    const t = story();
    t.storyNight = 2;
    t.plotFlags.add("ashCaught");
    t.open();
    t.tick(0, idle);
    expect(t.takeMessages().some((m) => m.includes("the deserter hangs"))).toBe(true);
  });
});

describe("the conditional choices", () => {
  it("hiding Ash is only offered once she's protected Silas, or has a kind heart", () => {
    const t = story();
    t.storyNight = 1;
    t.heardRumor = true;
    expect(labels(t)).not.toContain("Hide him in the cellar");
    t.plotFlags.add("silasOwes");
    expect(labels(t)).toContain("Hide him in the cellar");
    t.plotFlags.clear();
    t.persona.kindness = 2;
    expect(labels(t)).toContain("Hide him in the cellar");
  });

  it("hiding Ash counts as protecting him, and keeps him in the cellar", () => {
    const t = story();
    t.storyNight = 1;
    t.plotFlags.add("silasOwes");
    toLastCall(t);
    t.heardRumor = true;
    const protectedBefore = t.persona.protected;
    const index = labels(t).indexOf("Hide him in the cellar");
    t.chooseLastCall(index);
    expect(t.plotFlags.has("ashHidden")).toBe(true);
    expect(t.persona.protected).toBe(protectedBefore + 1);
    expect(t.news).toContain(FLAG_NEWS.ashHidden);
  });

  it("telling Rhea about the silver is only offered once she's heard the soldiers' talk", () => {
    const t = story();
    t.storyNight = 2;
    t.heardRumor = true;
    expect(labels(t)).not.toContain("Tell her where the baron's silver goes");
    t.plotFlags.add("heardSilver");
    expect(labels(t)).toContain("Tell her where the baron's silver goes");
  });

  it("the soldiers' table on the deserter night carries the silver clue", () => {
    expect(NIGHTS[1].parties.some((p) => p.clue === "heardSilver")).toBe(true);
  });

  it("beating the Watch Canteen gives her the silver, if she missed it", () => {
    const t = story();
    for (const id of ["salt", "deserter", "cider", "meeting", "bakehouse", "pell"]) t.beatsDone.add(id);
    toLastCall(t);
    toMorning(t, 301);
    expect(t.beatCard?.house?.id).toBe("canteen");
    t.answerHouse("partner");
    expect(t.plotFlags.has("heardSilver")).toBe(true);
  });
});

describe("saving the flags", () => {
  it("keeps them, and drops ones that don't exist", () => {
    const t = story();
    t.plotFlags.add("ashHidden");
    t.plotFlags.add("maraArrested");
    const save = t.snapshot();
    save.story!.flags!.push("notAFlag");
    const back = story();
    back.restore(save);
    expect([...back.plotFlags].sort()).toEqual(["ashHidden", "maraArrested"]);
  });

  it("starts with none from an older save", () => {
    const t = story();
    const save = t.snapshot();
    delete save.story!.flags;
    t.plotFlags.add("odenShut");
    t.restore(save);
    expect(t.plotFlags.size).toBe(0);
  });
});

describe("First in Tarven", () => {
  it("changes with Mara, Ash and Oden", () => {
    const free = firstInTarvenLines(new Set());
    expect(free.some((l) => l.includes("raises a cup"))).toBe(true);
    expect(free.some((l) => l.includes("rings the chapel bell"))).toBe(true);
    const dark = firstInTarvenLines(new Set<PlotFlag>(["maraArrested", "ashHidden", "odenShut"]));
    expect(dark.some((l) => l.includes("chair at the farmers' table stays empty"))).toBe(true);
    expect(dark.some((l) => l.includes("Ash drinks to you"))).toBe(true);
    expect(dark.some((l) => l.includes("chapel is still dark"))).toBe(true);
  });
});
