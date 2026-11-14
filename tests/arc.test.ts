import { describe, expect, it } from "vitest";
import { townTalk, type Standing } from "../src/game/daystory";
import { defaultRole, statsOf } from "../src/game/guestroles";
import { ARC_DAWN, arcStage, flavorLine, MIND_AT, mindStage, TANSY_CALLBACK } from "../src/game/lewd";
import { EAR_COLLECTION, EAR_CORRUPTION, PELL_DEFY, PELL_EAR, SHADY_AT } from "../src/game/ledger";
import type { Mood } from "../src/game/mood";
import { afterLine } from "../src/game/touch";
import { FIRST_REACH_MAX, FIRST_REACH_THOUGHT, FIRSTS, FIRSTS_LATE, FIRSTS_UNASKED } from "../src/game/touchtalk";
import { HEAT_MAX, Tavern, TRUST_MAX, type Guest, type GuestKind } from "../src/game/tavern";

const SEATS = 11;
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

function story(): Tavern {
  const t = new Tavern(SEATS);
  t.storyBeats = true;
  return t;
}

/** Plays tonight out with nobody served, and to bed: the dawn report is in `news`. */
function toBed(t: Tavern): void {
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

/** To bed, and on to the next morning with `fans`. */
function nextMorning(t: Tavern, fans: number): void {
  toBed(t);
  t.fans = fans;
  t.nextNight();
}

/** A tavern whose next beat is Pell at dawn. */
function atPell(prepare: (t: Tavern) => void = () => {}): Tavern {
  const t = story();
  for (const id of ["salt", "deserter", "cider", "meeting", "bakehouse"]) t.beatsDone.add(id);
  prepare(t);
  nextMorning(t, 250);
  expect(t.beatCard?.title).toBe("Pell at dawn");
  return t;
}

describe("her mind stage reads lewdness only", () => {
  it("has the old thresholds, with corruption taken out", () => {
    expect(mindStage(MIND_AT[0] - 1)).toBe(0);
    expect(mindStage(MIND_AT[0])).toBe(1);
    expect(mindStage(MIND_AT[1])).toBe(2);
    expect(mindStage(MIND_AT[2])).toBe(3);
  });

  it("a cold informant with no lewdness is still Sheltered", () => {
    const t = story();
    t.corruption = 200;
    expect(t.arcStage).toBe("sheltered");
  });
});

describe("her arc", () => {
  it("goes Sheltered, Curious, Willing, Known", () => {
    const at = (lewdness: number, kinds = 0, backStairs = false) => arcStage({ lewdness, kinds, backStairs });
    expect(at(0)).toBe("sheltered");
    expect(at(MIND_AT[0])).toBe("curious");
    expect(at(MIND_AT[1])).toBe("willing");
    expect(at(MIND_AT[0], 0, true)).toBe("willing");
    // Filthy, but only a few kinds of guest: she still reads as Willing.
    expect(at(MIND_AT[2], 3)).toBe("willing");
    expect(at(MIND_AT[2], 4)).toBe("known");
  });

  it("layers on the written line, never replaces it", () => {
    const written = "(Their hand's warm.)";
    expect(flavorLine(written, "sheltered", "hand", true)).toBe(written);
    expect(flavorLine(written, "willing", "hand", true)).toBe(written);
    expect(flavorLine(written, "curious", "hand", true)).toContain("Their hand's warm.");
    const known = flavorLine(written, "known", "chest", true);
    expect(known.startsWith(written)).toBe(true);
    expect(known.length).toBeGreaterThan(written.length);
    expect(flavorLine("You let them.", "known", "chest", false)).toMatch(/^You let them\. You breathe, ".+"$/);
  });

  it("has a first-time thought for a first that lands unasked, and one that comes late", () => {
    expect(afterLine("lips", 0)?.text).toBe(FIRSTS.lips);
    expect(afterLine("lips", 0, { unasked: true })?.text).toBe(FIRSTS_UNASKED.lips);
    expect(afterLine("lips", 0, { late: true })?.text).toBe(FIRSTS_LATE.lips);
    // Unasked comes first: it's the bigger moment.
    expect(afterLine("lips", 0, { unasked: true, late: true })?.text).toBe(FIRSTS_UNASKED.lips);
    expect(afterLine("lips", 1, { unasked: true })).toBeNull();
  });

  it("speaks once on the dawn report as each stage begins", () => {
    const t = story();
    toBed(t);
    expect(t.news).toContain(ARC_DAWN.sheltered);
    expect(t.arcSeen).toBe(0);
    t.nextNight();
    toBed(t);
    expect(t.news).not.toContain(ARC_DAWN.sheltered);
  });

  it("brings Tansy's words back at Willing, if she denied the Lantern", () => {
    const t = story();
    t.arcSeen = 1;
    t.plotFlags.add("deniedLantern");
    t.passives.add("backStairs");
    toBed(t);
    expect(t.news).toContain(ARC_DAWN.willing);
    expect(t.news).toContain(TANSY_CALLBACK);
    expect(t.arcSeen).toBe(2);
  });

  it("an older save doesn't announce the stage she's already at", () => {
    const t = story();
    t.passives.add("backStairs");
    const save = t.snapshot();
    delete save.story!.arc;
    const back = story();
    back.restore(save);
    expect(back.arcSeen).toBe(2);
  });

  it("saves which stage the dawn has spoken of", () => {
    const t = story();
    t.arcSeen = 2;
    const back = story();
    back.restore(t.snapshot());
    expect(back.arcSeen).toBe(2);
  });

  it("the town talks the morning her stage rises", () => {
    const base: Standing = {
      gold: 0, trust: 0, heat: 0, respect: 0, fame: 0, lewdness: 0, corruption: 0,
      flirt: 0, kindness: 0, greed: 0, drinks: 0, protected: 0, informed: 0, sold: 0,
    };
    const talk = townTalk(base, { ...base, lewdness: MIND_AT[0] });
    expect(talk.some((l) => l.includes("warming up"))).toBe(true);
    expect(townTalk(base, { ...base, lewdness: MIND_AT[0] - 1 }).some((l) => l.includes("warming up"))).toBe(false);
  });
});

describe("Act 1's first moments", () => {
  it("the first reach of the run is one of the gentlest, and she wonders if it's allowed", () => {
    const t = new Tavern(SEATS);
    t.playerBody = "Female";
    t.open();
    t.guests.length = 0;
    const host = guest(1, "soldier", 10, "lust");
    t.guests.push(host);
    for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 100;
    // Reach for sure, then the boldest touch their nerve allows.
    const rolls = [0, 0.999];
    t.random = () => rolls.shift() ?? 0.5;
    expect((t as unknown as { maybeReach: (g: Guest) => boolean }).maybeReach(host)).toBe(true);
    const chat = (t as unknown as { touchChat: { touch: { level: number } } }).touchChat;
    expect(chat.touch.level).toBeLessThanOrEqual(FIRST_REACH_MAX);
    expect(t.talkLines.map((l) => l.text)).toContain(FIRST_REACH_THOUGHT);
  });
});

describe("Pell at dawn reads who she's become", () => {
  it("early and honest: his line, and she can throw him out once the village is behind her", () => {
    const t = atPell((t) => (t.trust = TRUST_MAX));
    expect(t.beatCard!.lines.some((l) => l.includes("grandmother's chin"))).toBe(true);
    expect(t.pellChoices.map((c) => c.label)).toContain(PELL_DEFY);
    expect(t.pellChoices.map((c) => c.label)).not.toContain(PELL_EAR);
    const heat = t.heat;
    t.answerPell("defy");
    expect(t.owed).toBe(300);
    expect(t.heat).toBe(heat + 2);
    expect(t.plotFlags.has("defiedPell")).toBe(true);
  });

  it("early and honest, but the village isn't behind her yet: no throwing him out", () => {
    const t = atPell((t) => (t.trust = 0));
    expect(t.pellChoices.map((c) => c.label)).not.toContain(PELL_DEFY);
  });

  it("late and shady: she can give him her ear, and he takes half the gold and a name", () => {
    const t = atPell((t) => {
      t.passives.add("backStairs");
      t.corruption = SHADY_AT;
    });
    expect(t.beatCard!.lines.some((l) => l.includes("same ear"))).toBe(true);
    expect(t.pellChoices.map((c) => c.label)).toContain(PELL_EAR);
    t.answerPell("ear");
    expect(t.owed).toBe(150);
    expect(t.corruption).toBe(SHADY_AT + EAR_CORRUPTION);
    expect(t.plotFlags.has("pellsEar")).toBe(true);
    // His first collection: half the gold, and a name.
    t.gold = 500;
    t.beatsDone.add("pell");
    const informed = t.persona.informed;
    nextMorning(t, 301);
    expect(t.owed).toBe(150 - EAR_COLLECTION);
    expect(t.persona.informed).toBe(informed + 1);
  });

  it("an answer that isn't hers to give does nothing", () => {
    const t = atPell();
    t.answerPell("ear");
    expect(t.beatCard?.title).toBe("Pell at dawn");
  });

  it("still takes the old yes or no", () => {
    const t = atPell();
    t.answerPell(false);
    expect(t.owed).toBe(300);
  });
});

it("Tansy's hint: early on, she denies it, and the story remembers", () => {
  const t = story();
  for (const id of ["salt", "deserter", "cider", "meeting"]) t.beatsDone.add(id);
  nextMorning(t, 201);
  expect(t.beatCard?.house?.id).toBe("bakehouse");
  t.answerHouse("partner");
  expect(t.plotFlags.has("deniedLantern")).toBe(true);
  expect(t.news.some((l) => l.includes("Grandma kept a respectable house"))).toBe(true);
});
