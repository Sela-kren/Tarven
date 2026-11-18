import { describe, expect, it } from "vitest";
import {
  findLetter,
  findNextLetter,
  LETTER_BY_ID,
  LETTERS,
  letterUnlocked,
  newLetterState,
  queueLetters,
  readLetters,
  WILL_STREAK_NIGHTS,
  type LetterFacts,
  type LetterId,
} from "../src/game/letters";
import { HEAT_MAX, Tavern, TRUST_MAX } from "../src/game/tavern";

const idle = { listeningTo: null, night: true };

/** Nothing done yet: a sheltered keeper on her first night. */
const none: LetterFacts = {
  lets: 0,
  temptedNo: 0,
  duels: 0,
  brawlsWon: 0,
  lewdness: 0,
  arc: "sheltered",
  trust: 3,
  trustMax: TRUST_MAX,
  protected: 0,
  willStreak: 0,
  corruption: 0,
};

/** Every letter the facts unlock, the madam's in order (one call, as a dawn would see them). */
function unlocked(facts: Partial<LetterFacts>): LetterId[] {
  const state = newLetterState();
  return queueLetters(state, { ...none, ...facts });
}

function story(): Tavern {
  const t = new Tavern(11);
  t.storyBeats = true;
  return t;
}

/** Tonight with nobody served, to bed and on to the next morning. */
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

describe("Wren's letters: unlock checks", () => {
  it("has every letter from STORY.md section 10, each with where it's found and its text", () => {
    const ids = LETTERS.map((l) => l.id);
    expect(ids).toEqual(
      expect.arrayContaining(["pell", "midpoint", "father", "madamFirst", "madamWarming", "madamDuel", "madamEager", "madamLantern", "keeperNo", "keeperBrawl", "keeperTrust", "keeperNames", "keeperGrandfather", "warning"]),
    );
    for (const l of LETTERS) {
      expect(l.where.length).toBeGreaterThan(10);
      expect(l.text.length).toBeGreaterThanOrEqual(2);
    }
    // Section 10's quoted lines are kept.
    const all = (id: LetterId) => LETTER_BY_ID.get(id)!.text.join(" ");
    expect(all("pell")).toContain("If Pell is asking you about my book, then I'm already dead, and it wasn't my heart. Don't drink anything he pours.");
    expect(all("madamFirst")).toContain("The second time, I didn't.");
    expect(all("madamLantern")).toContain("Hang it, and they'll know what this house is again.");
    expect(all("keeperNo")).toContain("Wanting it and saying no anyway is the strongest thing you'll ever do behind this bar.");
    expect(all("warning")).toContain("I kept the secrets so long I forgot whose they were.");
  });

  it("finds nothing before she's done anything", () => {
    expect(unlocked({})).toEqual([]);
  });

  it("opens each madam's letter at its milestone, in order", () => {
    expect(unlocked({ lets: 1 })).toEqual(["madamFirst"]);
    expect(unlocked({ lets: 1, lewdness: 20, arc: "curious" })).toEqual(["madamFirst", "madamWarming"]);
    expect(unlocked({ lets: 1, lewdness: 20, arc: "curious", duels: 1 })).toEqual(["madamFirst", "madamWarming", "madamDuel"]);
    // Willing at Lewdness 54: mind stage 2 and the lantern's letter land together (section 10's proposed answer).
    expect(unlocked({ lets: 1, lewdness: 54, arc: "willing", duels: 1 })).toEqual(["madamFirst", "madamWarming", "madamDuel", "madamEager", "madamLantern"]);
    // Each waits for the one before: warm, but with no touch let yet, there's nothing.
    expect(unlocked({ lewdness: 30, arc: "curious" })).toEqual([]);
    expect(letterUnlocked("madamWarming", { ...none, lets: 1, lewdness: 30 }, new Set(["madamFirst"]))).toBe(true);
  });

  it("puts the madam's last letter at Willing, not mind stage 3", () => {
    const willing = { ...none, lets: 1, lewdness: 54, arc: "willing" as const, duels: 1 };
    const have = new Set<LetterId>(["madamFirst", "madamWarming", "madamDuel", "madamEager"]);
    expect(letterUnlocked("madamLantern", willing, have)).toBe(true);
    expect(letterUnlocked("madamLantern", { ...willing, arc: "curious" }, have)).toBe(false);
  });

  it("opens each keeper's letter at its milestone", () => {
    expect(unlocked({ temptedNo: 1 })).toEqual(["keeperNo"]);
    expect(unlocked({ brawlsWon: 1 })).toEqual(["keeperBrawl"]);
    expect(unlocked({ trust: Math.ceil(TRUST_MAX / 2) })).toEqual(["keeperTrust"]);
    expect(unlocked({ trust: Math.floor(TRUST_MAX / 2) })).toEqual([]);
    expect(unlocked({ protected: 2 })).toEqual([]);
    expect(unlocked({ protected: 3 })).toEqual(["keeperNames"]);
    expect(unlocked({ willStreak: WILL_STREAK_NIGHTS - 1 })).toEqual([]);
    expect(unlocked({ willStreak: WILL_STREAK_NIGHTS })).toEqual(["keeperGrandfather"]);
  });

  it("sends the warning letter when her corruption turns rotten", () => {
    expect(unlocked({ corruption: 149 })).toEqual([]);
    expect(unlocked({ corruption: 150 })).toEqual(["warning"]);
  });

  it("never unlocks a story letter by a check: Pell's comes with his dawn, the midpoint and Father's are later", () => {
    const everything: LetterFacts = { lets: 99, temptedNo: 99, duels: 99, brawlsWon: 99, lewdness: 999, arc: "known", trust: 15, trustMax: 15, protected: 99, willStreak: 99, corruption: 999 };
    const got = unlocked(everything);
    expect(got).not.toContain("pell");
    expect(got).not.toContain("midpoint");
    expect(got).not.toContain("father");
    expect(got.length).toBe(LETTERS.filter((l) => l.set !== "story").length);
  });

  it("queues each letter only once, and a found one never again", () => {
    const state = newLetterState();
    queueLetters(state, { ...none, brawlsWon: 1 });
    queueLetters(state, { ...none, brawlsWon: 2 });
    expect(state.queue).toEqual(["keeperBrawl"]);
    expect(findNextLetter(state)).toBe("keeperBrawl");
    expect(queueLetters(state, { ...none, brawlsWon: 3 })).toEqual([]);
    expect(findNextLetter(state)).toBeNull();
    findLetter(state, "pell");
    findLetter(state, "pell");
    expect(state.found).toEqual(["keeperBrawl", "pell"]);
  });
});

describe("Wren's letters in the tavern", () => {
  it("are checked at dawn, and found one a morning, the rest kept for the mornings after", () => {
    const t = story();
    t.records.fightsWon = 1;
    t.persona.protected = 3;
    t.trust = TRUST_MAX;
    nextMorning(t);
    const first = t.takeLetter();
    expect(first?.id).toBe("keeperBrawl");
    expect(first?.title).toContain("Into the snow");
    // Where she found it, then the letter.
    expect(first?.lines[0]).toContain("cudgel");
    expect(t.takeLetter()).toBeNull();
    expect(t.letters.found).toEqual(["keeperBrawl"]);
    expect(t.letters.queue.length).toBeGreaterThanOrEqual(2);
    nextMorning(t);
    expect(t.takeLetter()?.id).toBe(t.letters.found[1]);
    expect(t.letters.found.length).toBe(2);
  });

  it("start nothing: a letter is words on the morning card, and the day goes on as usual", () => {
    const t = story();
    t.records.fightsWon = 1;
    nextMorning(t);
    expect(t.phase).toBe("day");
    expect(t.fight).toBeNull();
    expect(t.duel).toBeNull();
    expect(t.takeAdultScene()).toBeNull();
    expect(t.takeLetter()).not.toBeNull();
  });

  it("counts the willpower streak at dawn: five clear nights bring Grandfather's letter", () => {
    const t = story();
    for (let i = 0; i < WILL_STREAK_NIGHTS - 1; i++) nextMorning(t);
    expect(t.letters.willStreak).toBe(WILL_STREAK_NIGHTS - 1);
    expect(t.letters.queue).not.toContain("keeperGrandfather");
    nextMorning(t);
    // Checked at dawn and found the morning after that dawn.
    expect(t.letters.found).toContain("keeperGrandfather");
  });

  it("finds Pell's on his morning, with his answer, and nothing else that morning", () => {
    const t = story();
    for (const id of ["deserter", "cider", "meeting", "bakehouse"]) t.beatsDone.add(id);
    t.houses = { cider: "ruin", bakehouse: "ruin" };
    t.records.fightsWon = 1;
    nextMorning(t, 260);
    expect(t.beatCard?.title).toBe("Pell at dawn");
    expect(t.takeLetter()).toBeNull();
    const before = t.news.length;
    t.answerPell(false);
    const said = t.news.slice(before);
    expect(said.some((l) => l.includes("hollow leg of the stool"))).toBe(true);
    expect(said.some((l) => l.includes("Don't drink anything he pours"))).toBe(true);
    expect(t.letters.found).toContain("pell");
    // The brawl letter waited: it's the next morning's.
    expect(t.letters.queue).toContain("keeperBrawl");
    nextMorning(t);
    expect(t.takeLetter()?.id).toBe("keeperBrawl");
  });

  it("are saved with the story, and come back as they were", () => {
    const t = story();
    t.records.fightsWon = 1;
    t.persona.protected = 3;
    nextMorning(t);
    t.letters.temptedNo = 2;
    const save = t.snapshot();
    const back = story();
    back.restore(save);
    expect(back.letters).toEqual(t.letters);
    expect(back.letters.found).toEqual(["keeperBrawl"]);
    expect(back.letters.queue).toEqual(["keeperNames"]);
    // The morning's letter was taken with its morning: a load doesn't show it again.
    expect(back.takeLetter()).toBeNull();
  });

  it("start older saves with none, except Pell's once his dawn has been", () => {
    const t = story();
    const save = t.snapshot();
    delete save.story!.letters;
    const fresh = story();
    fresh.restore(save);
    expect(fresh.letters.found).toEqual([]);
    save.story!.beats = [...save.story!.beats, "deserter", "cider", "meeting", "bakehouse", "pell"];
    fresh.restore(save);
    expect(fresh.letters.found).toEqual(["pell"]);
    expect(readLetters(undefined, false).found).toEqual([]);
    // Nonsense in a save is dropped.
    expect(readLetters({ found: ["pell", "nope", "pell"], queue: ["pell", "warning"], temptedNo: -3 }, false)).toEqual({
      found: ["pell"],
      queue: ["warning"],
      temptedNo: 0,
      willStreak: 0,
    });
  });
});
