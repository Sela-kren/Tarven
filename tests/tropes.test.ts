import { describe, expect, it } from "vitest";
import { defaultRole, statsOf } from "../src/game/guestroles";
import { tamsin } from "../src/game/lantern";
import {
  ARC_AFTERMATH,
  ARC_AFTERMATH_SEEN,
  ARC_CARDS,
  ARC_CONSENT,
  ARC_DAWN,
  ARC_STAGES,
  ARC_TROPE,
  arcCardLines,
  arcDawnStep,
  arcSeenFor,
  CORRUPTION_AT,
  CORRUPTION_CARDS,
  corruptionDawnStep,
  corruptionTier,
  flavorLine,
  MIND_AT,
  TOUCH_ASIDES,
  WILLING_ASIDE,
} from "../src/game/lewd";
import type { Mood } from "../src/game/mood";
import {
  hire,
  JOB_STAGE_LINES,
  nightFor,
  pusherOf,
  readStaffMember,
  rollApplicant,
  STAFF_JOBS,
  STAFF_ROSTER,
  STAFF_STAGE_LINES,
  STAFF_STAGE_LOOK,
  STAFF_TIER_LINES,
  STAFF_TIER_TROPE,
  staffLook,
  staffStage,
  staffStageLine,
  staffTierCard,
  type StaffMember,
  type StaffNight,
} from "../src/game/staff";
import { HEAT_MAX, Tavern, type Guest, type GuestKind } from "../src/game/tavern";
import { TOO_DRUNK_TO_ALLOW } from "../src/game/touchtalk";
import { FALL_BEATS, fillCard, PUSHERS, TROPE_IDS, TROPES, type StageCard } from "../src/game/tropes";

const idle = { listeningTo: null, night: true };

function guest(id: number, kind: GuestKind, lust: number, mood: Mood = "calm"): Guest {
  return {
    id,
    kind,
    role: defaultRole(kind),
    stats: statsOf(kind),
    female: false,
    look: 0,
    order: "ale",
    ordered: true,
    seat: id,
    status: "waiting",
    patience: 30,
    maxPatience: 30,
    eatLeft: 0,
    rumor: false,
    listened: 0,
    party: null,
    lust,
    desires: 0,
    mood,
  };
}

/** Plays tonight out with nobody served, and to bed: the dawn report is in `news`. */
function toBed(t: Tavern): void {
  t.random = () => 0.99; // Nobody starts trouble tonight.
  if (t.phase === "day") {
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
  t.sleep();
}

/** Makes her Known: filthy lewdness, and touches let from four kinds of guest. */
function makeKnown(t: Tavern): void {
  t.records.climaxes = MIND_AT[2] + 10;
  t.records.kinds = { hand: ["farmer", "soldier", "smuggler", "noble"] };
}

const fair = (m: StaffMember, over: Partial<StaffNight> = {}): StaffNight => ({
  worked: true,
  wagePaid: m.wage,
  houseFame: 0,
  madamCorruption: m.corruption,
  greedyRules: 0,
  ...over,
});

const allCards = (): StageCard[] => [
  ...Object.values(ARC_CARDS),
  ...Object.values(ARC_AFTERMATH),
  ...Object.values(CORRUPTION_CARDS),
  ...PUSHERS.flatMap((p) => (["shady", "crooked", "rotten"] as const).map((step) => staffTierCard({ id: `x_${p}`, job: p === "church" ? "devotee" : "barmaid", name: "Nell", female: true }, step))),
];

describe("the tropes", () => {
  it("has one id for each trope of the doc's table, with rationalisation and blackmail apart", () => {
    expect(TROPE_IDS).toHaveLength(10);
    expect(Object.keys(TROPES).sort()).toEqual([...TROPE_IDS].sort());
  });

  it("tags every stage card with a known trope and one of the five beats", () => {
    for (const card of allCards()) {
      expect(TROPE_IDS).toContain(card.trope);
      if (card.also) expect(TROPE_IDS).toContain(card.also);
      expect(FALL_BEATS).toContain(card.beat);
      expect(card.lines.length).toBeGreaterThan(0);
    }
  });

  it("fills a card for her or him", () => {
    expect(fillCard("{name} said {they} would. {They} did, with {their} hands on {them}.", "Ash", false)).toBe("Ash said he would. He did, with his hands on him.");
    expect(fillCard("{name}: {They} kept {their} word.", "Maud", true)).toBe("Maud: She kept her word.");
  });
});

describe("her fall, step by step", () => {
  it("picks the doc's trope for each step, with the mind break only past Known (Legend)", () => {
    expect(ARC_TROPE.sheltered).toMatchObject({ trope: "corruption", beat: "setup" });
    expect(ARC_TROPE.curious).toMatchObject({ trope: "conditioning", also: "loveBombing", beat: "erosion" });
    expect(ARC_TROPE.willing).toMatchObject({ trope: "rationalisation", also: "blackmail", beat: "internalisation" });
    expect(ARC_TROPE.known).toMatchObject({ trope: "isolation", also: "traumaBond", beat: "break" });
    expect(ARC_TROPE.legend).toMatchObject({ trope: "mindBreak", also: "brainwashing", beat: "aftermath" });
    for (const card of allCards().filter((c) => !c.id.startsWith("arc_legend"))) {
      expect(card.trope).not.toBe("mindBreak");
      expect(card.also).not.toBe("mindBreak");
    }
    for (const stage of ARC_STAGES) expect(ARC_CARDS[stage].trope).toBe(ARC_TROPE[stage].trope);
  });

  it("keeps her dawn line as each card's first", () => {
    for (const stage of ARC_STAGES) expect(ARC_CARDS[stage].lines[0]).toBe(ARC_DAWN[stage]);
  });

  it("steps through the stages once each, then the aftermath once, then nothing", () => {
    expect(arcDawnStep("sheltered", -1, false)).toMatchObject({ seen: 0, stage: "sheltered" });
    expect(arcDawnStep("sheltered", 0, false)).toBeNull();
    expect(arcDawnStep("willing", 0, false)?.card).toBe(ARC_CARDS.willing);
    expect(arcDawnStep("willing", 2, false)).toBeNull();
    expect(arcDawnStep("known", 2, false)?.card).toBe(ARC_CARDS.known);
    const after = arcDawnStep("known", 3, false);
    expect(after).toMatchObject({ seen: ARC_AFTERMATH_SEEN, stage: null, card: ARC_AFTERMATH.fair });
    expect(after!.card.beat).toBe("aftermath");
    expect(arcDawnStep("known", 3, true)?.card).toBe(ARC_AFTERMATH.rotten);
    expect(arcDawnStep("known", ARC_AFTERMATH_SEEN, false)).toBeNull();
    expect(arcSeenFor("known")).toBe(ARC_AFTERMATH_SEEN);
    expect(arcSeenFor("curious")).toBe(1);
  });

  it("ends each stage card on her choice with Consent on, and on the Consent-off rules with it off", () => {
    for (const stage of ARC_STAGES) {
      const step = { card: ARC_CARDS[stage], stage };
      expect(arcCardLines(step, false).at(-1)).toBe(ARC_CONSENT[stage].on);
      expect(arcCardLines(step, true).at(-1)).toBe(ARC_CONSENT[stage].off);
      expect(ARC_CONSENT[stage].on).not.toBe(ARC_CONSENT[stage].off);
    }
    // The aftermath has no consent line of its own.
    expect(arcCardLines({ card: ARC_AFTERMATH.fair, stage: null }, false)).toEqual([...ARC_AFTERMATH.fair.lines]);
  });

  it("puts the card on the dawn report the first morning of a stage, and the aftermath the morning after Known", () => {
    const t = new Tavern(11);
    toBed(t);
    for (const line of arcCardLines({ card: ARC_CARDS.sheltered, stage: "sheltered" }, false)) expect(t.news).toContain(line);
    t.nextNight();
    makeKnown(t);
    toBed(t);
    expect(t.news).toContain(ARC_DAWN.known);
    expect(t.news).toContain(ARC_CONSENT.known.on);
    expect(t.arcSeen).toBe(3);
    t.nextNight();
    toBed(t);
    expect(t.news).toContain(ARC_AFTERMATH.fair.lines[0]);
    expect(t.arcSeen).toBe(ARC_AFTERMATH_SEEN);
    t.nextNight();
    toBed(t);
    expect(t.news).not.toContain(ARC_AFTERMATH.fair.lines[0]);
    expect(t.news).not.toContain(ARC_DAWN.known);
  });

  it("an older save at Known doesn't hear the aftermath either", () => {
    const t = new Tavern(11);
    makeKnown(t);
    const save = t.snapshot();
    delete save.story!.arc;
    const back = new Tavern(11);
    back.restore(save);
    expect(back.arcSeen).toBe(ARC_AFTERMATH_SEEN);
  });
});

describe("her corruption tiers", () => {
  it("are honest, shady, crooked and rotten, at 40, 80 and 150", () => {
    expect(corruptionTier(CORRUPTION_AT[0] - 1)).toBe("honest");
    expect(corruptionTier(CORRUPTION_AT[0])).toBe("shady");
    expect(corruptionTier(CORRUPTION_AT[1])).toBe("crooked");
    expect(corruptionTier(CORRUPTION_AT[2])).toBe("rotten");
  });

  it("gives each tier past honest a card with the tropes she uses there", () => {
    expect(CORRUPTION_CARDS.shady).toMatchObject({ trope: "loveBombing", also: "rationalisation" });
    expect(CORRUPTION_CARDS.crooked).toMatchObject({ trope: "blackmail", also: "isolation" });
    expect(CORRUPTION_CARDS.rotten).toMatchObject({ trope: "gaslighting", also: "traumaBond" });
    expect(corruptionDawnStep(10, 0)).toBeNull();
    expect(corruptionDawnStep(90, 0)).toMatchObject({ seen: 2, card: CORRUPTION_CARDS.crooked });
    expect(corruptionDawnStep(90, 2)).toBeNull();
    // Falling back and rising again tells nothing twice.
    expect(corruptionDawnStep(50, 2)).toBeNull();
  });

  it("tells her tier's card at dawn once, and saves which it told", () => {
    const t = new Tavern(11);
    t.corruption = CORRUPTION_AT[0];
    toBed(t);
    expect(t.news).toContain(CORRUPTION_CARDS.shady.lines[0]);
    expect(t.tierSeen).toBe(1);
    const back = new Tavern(11);
    back.restore(t.snapshot());
    expect(back.tierSeen).toBe(1);
    back.nextNight();
    toBed(back);
    expect(back.news).not.toContain(CORRUPTION_CARDS.shady.lines[0]);
  });

  it("an older save doesn't announce the tier she's already at", () => {
    const t = new Tavern(11);
    t.corruption = CORRUPTION_AT[2];
    const save = t.snapshot();
    delete save.story!.tier;
    const back = new Tavern(11);
    back.restore(save);
    expect(back.tierSeen).toBe(3);
  });
});

describe("her touch lines in the trope's voice", () => {
  const written = "(Their hand's warm.)";

  it("leaves Sheltered as written", () => {
    expect(flavorLine(written, "sheltered", "hand", true, () => 0)).toBe(written);
  });

  it("puts a Curious thought inside the written one's brackets, and a spoken aside after the line", () => {
    expect(flavorLine(written, "curious", "hand", true, () => 0)).toBe(`(Their hand's warm. ${TOUCH_ASIDES.curious.thought[0]})`);
    const last = TOUCH_ASIDES.curious.said.at(-1)!;
    expect(flavorLine("You let them.", "curious", "hand", false, () => 0.99)).toBe(`You let them. ${last}`);
  });

  it("talks herself into it at Willing half the time", () => {
    expect(flavorLine(written, "willing", "hand", true, () => WILLING_ASIDE)).toBe(written);
    const said = flavorLine("You let them.", "willing", "hand", false, () => 0);
    expect(said).toBe(`You let them. ${TOUCH_ASIDES.willing.said[0]}`);
  });

  it("at Known, speaks for the ones who stayed or in the body's own words, always after the written line", () => {
    const trope = flavorLine(written, "known", "chest", true, () => 0);
    expect(trope).toBe(`${written} ${TOUCH_ASIDES.known.thought[0]}`);
    expect(flavorLine("You let them.", "known", "chest", false, () => 0)).toMatch(/^You let them\. You breathe, ".+"$/);
    expect(flavorLine("You let them.", "known", "chest", false, () => 0.9)).toMatch(/^You let them\. You breathe, ".+"$/);
  });
});

describe("staff stages", () => {
  it("reads their lewdness on her four stages, by her thresholds", () => {
    expect(staffStage({ lewdness: 0 })).toBe("sheltered");
    expect(staffStage({ lewdness: MIND_AT[0] - 1 })).toBe("sheltered");
    expect(staffStage({ lewdness: MIND_AT[0] })).toBe("curious");
    expect(staffStage({ lewdness: MIND_AT[1] })).toBe("willing");
    expect(staffStage({ lewdness: MIND_AT[2] })).toBe("known");
  });

  it("gives everyone on the roster their own line at every stage, each one different", () => {
    for (const d of STAFF_ROSTER) {
      const lines = STAFF_STAGE_LINES[d.id];
      expect(lines, d.id).toBeDefined();
      expect(new Set(ARC_STAGES.map((s) => lines[s])).size).toBe(ARC_STAGES.length);
    }
    for (const job of STAFF_JOBS) expect(new Set(ARC_STAGES.map((s) => JOB_STAGE_LINES[job][s])).size).toBe(ARC_STAGES.length);
  });

  it("changes their line and their look key as they go up", () => {
    const lysa = hire("lysa");
    const at = (lewdness: number) => ({ ...lysa, lewdness });
    expect(staffStageLine(at(0))).toBe(STAFF_STAGE_LINES.lysa.sheltered);
    expect(staffStageLine(at(MIND_AT[1]))).toBe(STAFF_STAGE_LINES.lysa.willing);
    expect(staffLook(at(0))).toEqual({ stage: "sheltered", outfit: STAFF_STAGE_LOOK.sheltered, key: "lysa/work", jobKey: "dancer/work" });
    expect(staffLook(at(MIND_AT[2])).key).toBe(`lysa/${STAFF_STAGE_LOOK.known}`);
    expect(new Set(Object.values(STAFF_STAGE_LOOK)).size).toBe(ARC_STAGES.length);
    // An applicant speaks by their job.
    const a = rollApplicant("late", () => 0.3, "hire1")!;
    expect(staffStageLine(a)).toBe(JOB_STAGE_LINES[a.job].sheltered);
  });

  it("tells a stage card the first morning they're at a new stage, once, with the heroine's trope for that step", () => {
    const lysa = hire("lysa");
    const { member, dawn } = nightFor(lysa, fair(lysa, { done: { dances: 5 * MIND_AT[0] } }));
    expect(member.lewdness).toBe(MIND_AT[0]);
    expect(dawn.cards).toHaveLength(1);
    expect(dawn.cards[0]).toMatchObject({ trope: ARC_TROPE.curious.trope, beat: "erosion" });
    expect(dawn.cards[0].lines.join(" ")).toContain(STAFF_STAGE_LINES.lysa.curious);
    expect(dawn.line).toContain("curious");
    const again = nightFor(member, fair(member));
    expect(again.dawn.cards).toEqual([]);
  });

  it("their stage cards say they chose it, and they can still say no", () => {
    const lysa = { ...hire("lysa"), lewdness: MIND_AT[2] };
    const { dawn } = nightFor({ ...lysa, stageSeen: 2 }, fair(lysa));
    expect(dawn.cards[0].lines.at(-1)).toMatch(/chose .* can still say no/);
  });
});

describe("staff tier cards, by who's pushing", () => {
  it("knows who pushes whom", () => {
    expect(pusherOf(hire("tamsin"))).toBe("sabine");
    expect(pusherOf(hire("corvin"))).toBe("smugglers");
    expect(pusherOf(hire("wynn"))).toBe("church");
    expect(pusherOf({ id: "hire9", job: "devotee" })).toBe("church");
    expect(pusherOf(hire("maud"))).toBe("madam");
  });

  it("uses the doc's tropes for each pusher", () => {
    expect(STAFF_TIER_TROPE.madam.shady.trope).toBe("conditioning");
    expect(STAFF_TIER_TROPE.madam.crooked.trope).toBe("isolation");
    expect(STAFF_TIER_TROPE.sabine.shady.trope).toBe("loveBombing");
    expect(STAFF_TIER_TROPE.sabine.crooked.trope).toBe("loveBombing");
    expect(STAFF_TIER_TROPE.church.shady.trope).toBe("rationalisation");
    expect(STAFF_TIER_TROPE.church.crooked.trope).toBe("brainwashing");
    expect(STAFF_TIER_TROPE.smugglers.shady.trope).toBe("blackmail");
    expect(STAFF_TIER_TROPE.smugglers.crooked.trope).toBe("blackmail");
    for (const p of PUSHERS) for (const step of ["shady", "crooked", "rotten"] as const) expect(STAFF_TIER_LINES[p][step].lines.length).toBeGreaterThanOrEqual(2);
  });

  it("tells Maud's honest-to-shady card under a crooked madam, then shady-to-crooked, each once", () => {
    let maud = hire("maud");
    const cards: StageCard[] = [];
    for (let i = 0; i < 60; i++) {
      const r = nightFor(maud, fair(maud, { madamCorruption: 200, greedyRules: 2 }));
      maud = r.member;
      cards.push(...r.dawn.cards);
    }
    // A madam of 200 and two greedy rules carry her all the way: shady, crooked, then rotten, each once.
    expect(cards.map((c) => c.id)).toEqual(["staff_madam_shady", "staff_madam_crooked", "staff_madam_rotten"]);
    expect(cards[0].trope).toBe("conditioning");
    expect(cards[1].trope).toBe("isolation");
    expect(cards[2].trope).toBe("traumaBond");
    expect(cards[0].lines.join(" ")).toContain("Maud");
    expect(cards[0].lines.join(" ")).not.toMatch(/\{\w+\}/);
  });

  it("Tamsin starts shady, so her first card is Sabine going cold at crooked", () => {
    const t = hire("tamsin");
    const { dawn } = nightFor({ ...t, corruption: 79 }, fair(t, { madamCorruption: 200, greedyRules: 1 }));
    expect(dawn.cards.map((c) => c.id)).toEqual(["staff_sabine_crooked"]);
    expect(dawn.cards[0].lines.join(" ")).toContain("Sabine");
  });

  it("ends every staff tier card on their own choice", () => {
    for (const p of PUSHERS) for (const step of ["shady", "crooked", "rotten"] as const) expect(STAFF_TIER_LINES[p][step].lines.at(-1)).toMatch(/chose|could|can/);
  });

  it("reads an older save without cards heard as already at their tier and stage", () => {
    const pip = { ...hire("pip"), corruption: 85, lewdness: MIND_AT[1] };
    const raw = JSON.parse(JSON.stringify(pip));
    delete raw.tierSeen;
    delete raw.stageSeen;
    const back = readStaffMember(raw)!;
    expect(back.tierSeen).toBe(2);
    expect(back.stageSeen).toBe(2);
    expect(nightFor(back, fair(back)).dawn.cards).toEqual([]);
  });

  it("puts their cards on the morning report", () => {
    const t = new Tavern(11);
    const maud = { ...hire("maud"), corruption: 39 };
    t.staff.push(maud);
    t.corruption = 300;
    t.phase = "bedtime";
    t.takeMessages();
    t.sleep();
    const said = t.takeMessages().join(" ") + " " + t.news.join(" ");
    expect(said).toContain("Every time Maud did \"a bit more\" with the soldiers' table");
  });

  it("a Lantern girl gets her tier card too, by who's pushing her", () => {
    const g = tamsin();
    expect(g.corruption).toBeLessThan(80);
    const card = staffTierCard({ id: g.id, job: "girl", name: g.name, female: true }, "crooked");
    expect(card.trope).toBe("loveBombing");
    expect(card.who).toBe("Sabine");
  });
});

describe("the consent rule, untouched", () => {
  it("too drunk, even Known, the reach is still a no: her stage never talks over it", () => {
    const t = new Tavern(11);
    t.playerBody = "Female";
    makeKnown(t);
    expect(t.arcStage).toBe("known");
    t.open();
    t.guests.length = 0;
    const host = guest(1, "soldier", 10, "lust");
    t.guests.push(host);
    for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 100;
    t.drunk = 1;
    const rolls = [0, 0.5];
    t.random = () => rolls.shift() ?? 0.5;
    const reached = (t as unknown as { maybeReach: (g: Guest) => boolean }).maybeReach(host);
    expect(reached).toBe(true);
    expect(t.talkLines.map((l) => l.text)).toContain(TOO_DRUNK_TO_ALLOW);
    expect(t.talkLines.map((l) => l.text).some((l) => l.includes(TOUCH_ASIDES.known.thought[0]))).toBe(false);
  });

  it("a card is only words: a new stage and tier at dawn start no scene", () => {
    const t = new Tavern(11);
    makeKnown(t);
    t.corruption = CORRUPTION_AT[2];
    toBed(t);
    expect(t.news).toContain(ARC_DAWN.known);
    expect(t.news).toContain(CORRUPTION_CARDS.rotten.lines[0]);
    expect((t as unknown as { duel: unknown }).duel ?? null).toBeNull();
    expect((t as unknown as { fight: unknown }).fight ?? null).toBeNull();
  });

  it("no card puts anyone passed out or roaring drunk in a scene", () => {
    for (const card of allCards()) for (const line of card.lines) expect(line).not.toMatch(/passed out|unconscious|asleep|roaring drunk/i);
  });
});
