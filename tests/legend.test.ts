import { describe, expect, it } from "vitest";
import { Lantern, tamsin } from "../src/game/lantern";
import {
  ARC_CARDS,
  ARC_CONSENT,
  ARC_DAWN,
  ARC_STAGES,
  arcStage,
  arcStageName,
  flavorLine,
  herLegendNight,
  LEGEND_AT,
  LEGEND_BACK,
  LEGEND_ENCORE,
  LEGEND_FALL,
  LEGEND_RISE,
  LEGEND_WILD,
  legendCardLines,
  legendStep,
  newLegend,
  readLegend,
  TOUCH_ASIDES,
} from "../src/game/lewd";
import { PASSIVES } from "../src/game/passives";
import {
  hire,
  JOB_STAGE_LINES,
  nightFor,
  readStaffMember,
  STAFF_JOBS,
  STAFF_LEGEND_AT,
  STAFF_LEGEND_FALL,
  STAFF_LEGEND_RISE,
  STAFF_ROSTER,
  STAFF_STAGE_LINES,
  STAFF_STAGE_LOOK,
  staffLook,
  staffStage,
  staffStageLine,
  type StaffMember,
  type StaffNight,
} from "../src/game/staff";
import { HEAT_MAX, Tavern } from "../src/game/tavern";
import { cardTitle } from "../src/game/tropes";

const idle = { listeningTo: null, night: true };

/** Plays tonight out with nobody served, with `lets` touches let, and to bed: the dawn report is in `news`. */
function night(t: Tavern, lets: number, chapel = false): void {
  t.random = () => 0.99;
  if (t.phase === "day") {
    if (chapel) t.townDoneToday.add("chapel:oden");
    t.open();
    t.tick(0, idle);
  }
  for (let i = 0; i < 4000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const g of [...t.guests]) {
      if (g.status === "arriving") t.guestArrived(g.id);
      if (g.status === "leaving") t.guestLeft(g.id);
    }
  }
  t.chooseLastCall(0);
  t.heat = Math.min(t.heat, HEAT_MAX - 1);
  t.touchesTonight.allowed = lets;
  t.sleep();
}

/** Known, with lewdness past the Legend's line. */
function makeLegendReady(t: Tavern): void {
  t.records.climaxes = LEGEND_AT + 5;
  t.records.kinds = { hand: ["farmer", "soldier", "smuggler", "noble"] };
}

const wild = { eligible: true, wild: true, quiet: false };
const quiet = { eligible: true, wild: false, quiet: true };

describe("Legend, the stage past Known", () => {
  it("is the fifth stage, named Legend, and only shows over Known", () => {
    expect(ARC_STAGES).toEqual(["sheltered", "curious", "willing", "known", "legend"]);
    expect(arcStageName("legend")).toBe("Legend");
    const facts = { lewdness: 200, backStairs: false, kinds: 4 };
    expect(arcStage(facts)).toBe("known");
    expect(arcStage({ ...facts, legend: true })).toBe("legend");
    // Not Known underneath (too few kinds), so not a Legend either.
    expect(arcStage({ ...facts, kinds: 2, legend: true })).toBe("willing");
  });

  it("rises after LEGEND_RISE wild nights in a row, only while she could be one", () => {
    let s = newLegend();
    for (let i = 1; i < LEGEND_RISE; i++) {
      const r = legendStep(s, wild);
      expect(r.change).toBeNull();
      s = r.state;
    }
    // A night that isn't wild starts the count again.
    expect(legendStep(s, { ...wild, wild: false }).state.streak).toBe(0);
    // Not past the line: wild nights count for nothing.
    expect(legendStep(s, { ...wild, eligible: false }).state.streak).toBe(0);
    const up = legendStep(s, wild);
    expect(up.change).toBe("rise");
    expect(up.state).toMatchObject({ on: true, streak: 0, rises: 1 });
  });

  it("comes back to Known after LEGEND_FALL quiet nights, sooner with the chapel, and a wild night resets it", () => {
    let s = { ...newLegend(), on: true, rises: 1 };
    for (let i = 1; i < LEGEND_FALL; i++) s = legendStep(s, quiet).state;
    expect(s.on).toBe(true);
    expect(legendStep(s, wild).state).toMatchObject({ on: true, streak: 0 });
    const down = legendStep(s, quiet);
    expect(down.change).toBe("fall");
    expect(down.state).toMatchObject({ on: false, streak: 0, falls: 1 });
    // A chapel day counts one on top of the night.
    const prayed = legendStep({ ...newLegend(), on: true }, { ...quiet, chapel: true });
    expect(prayed.state.streak).toBe(2);
    // No longer Known (or under the line): straight back.
    expect(legendStep({ ...newLegend(), on: true }, { ...quiet, eligible: false }).change).toBe("fall");
  });

  it("reads her night: wild is LEGEND_WILD touches let, quiet is willpower kept and next to nothing let", () => {
    const base = { stage: "known" as const, lewdness: LEGEND_AT, lets: LEGEND_WILD, keptWill: true, chapel: false };
    expect(herLegendNight(base)).toMatchObject({ eligible: true, wild: true, quiet: false });
    expect(herLegendNight({ ...base, lets: 0 })).toMatchObject({ wild: false, quiet: true });
    expect(herLegendNight({ ...base, lets: 0, keptWill: false }).quiet).toBe(false);
    expect(herLegendNight({ ...base, lewdness: LEGEND_AT - 1 }).eligible).toBe(false);
    expect(herLegendNight({ ...base, stage: "willing" }).eligible).toBe(false);
    expect(herLegendNight({ ...base, stage: "legend" }).eligible).toBe(true);
  });

  it("has a card for the first rise, an encore for the next, and one for coming back, titled", () => {
    expect(ARC_CARDS.legend.lines[0]).toBe(ARC_DAWN.legend);
    expect(legendCardLines("rise", 1, false)).toEqual([cardTitle(ARC_CARDS.legend.title), ...ARC_CARDS.legend.lines, ARC_CONSENT.legend.on]);
    expect(legendCardLines("rise", 2, true)).toEqual([cardTitle(LEGEND_ENCORE.title), ...LEGEND_ENCORE.lines, ARC_CONSENT.legend.off]);
    expect(legendCardLines("fall", 1, false)).toEqual([cardTitle(LEGEND_BACK.title), ...LEGEND_BACK.lines]);
    expect(ARC_CARDS.legend).toMatchObject({ trope: "mindBreak", beat: "aftermath" });
  });

  it("gives her Legend touch lines, always after the written line", () => {
    expect(flavorLine("(Warm.)", "legend", "chest", true, () => 0)).toBe(`(Warm.) ${TOUCH_ASIDES.legend.thought[0]}`);
    expect(flavorLine("You let them.", "legend", "chest", false, () => 0.9)).toMatch(/^You let them\. You grin, ".+"$/);
  });
});

describe("Legend in play", () => {
  it("rises on the third wild Known night, with its card once, and comes back after quiet nights", () => {
    const t = new Tavern(11);
    makeLegendReady(t);
    for (let i = 0; i < LEGEND_RISE - 1; i++) {
      night(t, LEGEND_WILD);
      expect(t.arcStage).toBe("known");
      t.nextNight();
    }
    night(t, LEGEND_WILD);
    expect(t.arcStage).toBe("legend");
    expect(t.news).toContain(cardTitle(ARC_CARDS.legend.title));
    expect(t.news).toContain(ARC_CONSENT.legend.on);
    expect(t.records.legendRises).toBe(1);
    // Another wild night: still a Legend, no second card.
    t.nextNight();
    night(t, LEGEND_WILD);
    expect(t.arcStage).toBe("legend");
    expect(t.news).not.toContain(cardTitle(ARC_CARDS.legend.title));
    expect(t.legendNote).toContain("quiet nights");
    // Quiet nights bring her back to Known, with its card.
    for (let i = 0; i < LEGEND_FALL - 1; i++) {
      t.nextNight();
      night(t, 0);
      expect(t.arcStage).toBe("legend");
    }
    t.nextNight();
    night(t, 0);
    expect(t.arcStage).toBe("known");
    expect(t.news).toContain(cardTitle(LEGEND_BACK.title));
    expect(t.records.legendFalls).toBe(1);
    // And back up again: the encore, once.
    for (let i = 0; i < LEGEND_RISE; i++) {
      t.nextNight();
      night(t, LEGEND_WILD);
    }
    expect(t.arcStage).toBe("legend");
    expect(t.news).toContain(cardTitle(LEGEND_ENCORE.title));
    expect(t.legend.rises).toBe(2);
  });

  it("counts a day at the chapel toward coming back", () => {
    const t = new Tavern(11);
    makeLegendReady(t);
    t.legend = { ...newLegend(), on: true, rises: 1 };
    night(t, 0, true);
    expect(t.legend.streak).toBe(2);
    t.nextNight();
    night(t, 0);
    expect(t.arcStage).toBe("known");
  });

  it("never rises below the line, however wild the nights", () => {
    const t = new Tavern(11);
    t.records.climaxes = LEGEND_AT - 40;
    t.records.kinds = { hand: ["farmer", "soldier", "smuggler", "noble"] };
    for (let i = 0; i < LEGEND_RISE + 2; i++) {
      night(t, LEGEND_WILD + 4);
      t.nextNight();
    }
    expect(t.arcStage).toBe("known");
  });

  it("earns her Legend passives from the records", () => {
    const ids = new Set(PASSIVES.map((p) => p.id));
    for (const id of ["tarvensLegend", "byPopularDemand", "nightsOff"]) expect(ids.has(id), id).toBe(true);
  });

  it("loads a save with her Legend, and an older save without one as never a Legend", () => {
    const t = new Tavern(11);
    makeLegendReady(t);
    t.legend = { on: true, streak: 1, rises: 2, falls: 1 };
    const back = new Tavern(11);
    back.restore(t.snapshot());
    expect(back.legend).toEqual(t.legend);
    expect(back.arcStage).toBe("legend");
    const old = t.snapshot();
    delete old.story!.legend;
    const oldBack = new Tavern(11);
    oldBack.restore(old);
    expect(oldBack.legend).toEqual(newLegend());
    expect(oldBack.arcStage).toBe("known");
    expect(readLegend({ on: "yes", streak: -3 })).toEqual(newLegend());
  });
});

const fair = (m: StaffMember, over: Partial<StaffNight> = {}): StaffNight => ({
  worked: true,
  wagePaid: m.wage,
  houseFame: 0,
  madamCorruption: m.corruption,
  greedyRules: 0,
  ...over,
});

describe("Legend for staff and the Lantern's girls", () => {
  it("has a Legend line for everyone on the roster and every job, and a look", () => {
    for (const d of STAFF_ROSTER) {
      const lines = STAFF_STAGE_LINES[d.id];
      expect(lines.legend, d.id).toBeTruthy();
      expect(lines.legend).not.toBe(lines.known);
    }
    for (const job of STAFF_JOBS) expect(JOB_STAGE_LINES[job].legend, job).toBeTruthy();
    expect(STAFF_STAGE_LOOK.legend).toBe("house_legend");
  });

  it("rises after nights worked in a row past the line, and comes back after nights off", () => {
    let lysa: StaffMember = { ...hire("lysa"), lewdness: STAFF_LEGEND_AT, stageSeen: 3 };
    const cards: string[] = [];
    for (let i = 0; i < STAFF_LEGEND_RISE; i++) {
      const r = nightFor(lysa, fair(lysa));
      lysa = r.member;
      cards.push(...r.dawn.cards.map((c) => c.id));
    }
    expect(staffStage(lysa)).toBe("legend");
    expect(staffStageLine(lysa)).toBe(STAFF_STAGE_LINES.lysa.legend);
    expect(staffLook(lysa).key).toBe("lysa/house_legend");
    expect(cards).toEqual(["staff_stage_legend"]);
    for (let i = 0; i < STAFF_LEGEND_FALL; i++) {
      const r = nightFor(lysa, fair(lysa, { worked: false }));
      lysa = r.member;
      cards.push(...r.dawn.cards.map((c) => c.id));
    }
    expect(staffStage(lysa)).toBe("known");
    expect(cards).toEqual(["staff_stage_legend", "staff_legend_back"]);
  });

  it("stays Known under the line", () => {
    let maud: StaffMember = { ...hire("maud"), lewdness: STAFF_LEGEND_AT - 20, stageSeen: 3 };
    for (let i = 0; i < STAFF_LEGEND_RISE + 2; i++) maud = nightFor(maud, fair(maud)).member;
    expect(staffStage(maud)).toBe("known");
  });

  it("reads an older staff save as never a Legend", () => {
    const raw = JSON.parse(JSON.stringify({ ...hire("pip"), lewdness: STAFF_LEGEND_AT }));
    delete raw.legend;
    const back = readStaffMember(raw)!;
    expect(back.legend?.on ?? false).toBe(false);
    expect(staffStage(back)).toBe("known");
    const legendary = readStaffMember({ ...raw, legend: { on: true, streak: 0, rises: 1, falls: 0 } })!;
    expect(staffStage(legendary)).toBe("legend");
  });

  it("a Lantern girl rises on busy lit nights, shows it on the house plans, and comes back on nights off", () => {
    const lantern = new Lantern();
    (lantern as unknown as { hung: boolean }).hung = true;
    const g = tamsin();
    g.records.enjoyed = STAFF_LEGEND_AT;
    lantern.girls.push(g);
    const host = {
      guests: [],
      madamCorruption: 0,
      say: () => {},
      earn: () => {},
      shift: () => {},
      addHeat: () => {},
      addCorruption: () => {},
      addFans: () => {},
      guestSays: () => ({ speaker: null, text: "" }),
      nameOf: () => "",
      tableOf: () => "",
      leaveTable: () => {},
      cue: () => {},
    } as unknown as Parameters<Lantern["endNight"]>[0];
    const play = (lit: boolean, bookings: number) => {
      lantern.newDay();
      const tonight = (lantern as unknown as { tonight: { lit: boolean; worked: Record<string, number> } }).tonight;
      tonight.lit = lit;
      tonight.worked[g.id] = bookings;
      lantern.endNight(host);
      return lantern.dawnLines().join(" ");
    };
    let said = "";
    for (let i = 0; i < STAFF_LEGEND_RISE; i++) said = play(true, 2);
    expect(lantern.stageOf(g)).toBe("legend");
    expect(said).toContain(STAFF_STAGE_LINES.tamsin.legend);
    for (let i = 0; i < STAFF_LEGEND_FALL; i++) said = play(false, 0);
    expect(lantern.stageOf(g)).toBe("filthy");
    expect(said).toContain("Tamsin: nights off");
  });
});
