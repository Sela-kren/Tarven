import { describe, expect, it } from "vitest";
import { ACT3_BEATS, ACT3_CARDS, ENDINGS, pickEnding, TRAIL_RETRY, type Act3Facts } from "../src/game/act3";
import { reeveMissing, newPolitics, type HallFacts } from "../src/game/townhall";
import { Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];

/** A tavern with Act 2 behind her: the pass open, the second Ledger read. */
function lastCall(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 500;
  for (const id of ["salt", "deserter", "cider", "meeting", "bakehouse", "pell", "canteen", "tollgate", "copperBell"]) t.beatsDone.add(id);
  t.act2.pass.open = true;
  t.act2.flags.push(...["newTerms", "velvetCard", "nightshirt", "firstLedger", "inspection", "theTurn", "secondLedger"].map((id) => `beat:${id}`), "act2Done");
  // The rivals far ahead, so none falls to her on its own.
  for (const id of ["stag", "velvet", "rat"] as const) t.act2.pass.rivals[id].fans = 5000;
  t.fans = 1500;
  return t;
}

const morning = (t: Tavern) => (t as unknown as { act2Morning(): void }).act2Morning();

const base: Act3Facts = {
  gold: 0, trust: 0, respect: 0, fame: 0, corruption: 0, informed: 0, brawlsWon: 0, arcKnown: false, flags: new Set(),
  passRank: 2, closest: null, pieces: 0, guild: null, lanternHung: false, girlGone: false, owed: 0, crown: "keeper", owned: 0, ledger: [],
};

describe("Act 3: Last Call (STORY.md 13)", () => {
  it("has its beats in order, from 1,500 fans", () => {
    expect(ACT3_BEATS.map((b) => b.id)).toEqual(["fathersTrail", "rivalNight", "auditor", "lastOffer", "lastCall", "finalLedger"]);
    expect(ACT3_BEATS[0].fans).toBe(1500);
  });

  it("starts with Father's trail once Act 2's done, not before", () => {
    const t = lastCall();
    t.act2.flags = t.act2.flags.filter((f) => f !== "act2Done");
    morning(t);
    expect(t.pendingBeat).toBeNull();
    t.act2.flags.push("act2Done");
    morning(t);
    expect(t.beatCard?.title).toBe("Father's trail");
  });

  it("reaches the cells only by the roads she's opened, and comes round again if she can't", () => {
    const t = lastCall();
    t.gold = 0;
    morning(t);
    expect(t.beatChoices.map((c) => c.id)).toEqual(["wait"]);
    t.answerBeat("wait");
    morning(t);
    expect(t.pendingBeat).toBeNull();
    t.nightIndex += TRAIL_RETRY;
    t.plotFlags.add("rheaDoubts");
    morning(t);
    expect(t.beatChoices.map((c) => c.id)).toContain("rhea");
    t.answerBeat("rhea");
    expect(t.act2.flags).toContain("lastPages");
  });

  it("the rival night: a showdown with the closest rival, who falls to her at dawn", () => {
    const t = lastCall();
    t.act2.flags.push("beat3:fathersTrail", "lastPages");
    t.fans = 1750;
    t.act2.pass.rivals.rat.fans = 1760;
    morning(t);
    expect(t.beatCard?.lines.join(" ")).toContain("the Drowned Rat");
    t.answerBeat("dirty");
    expect(t.act2.pass.rivals.rat.fallen).toBe(true);
    morning(t);
    expect(t.pendingBeat?.kind).toBe("rival");
  });

  it("the auditor lodges at the top house; below it she can still get him through her door", () => {
    const top = ACT3_CARDS.auditor.choices({ ...base, passRank: 1 }).map((c) => c.id);
    expect(top).toEqual(["host"]);
    const below = ACT3_CARDS.auditor.choices({ ...base, gold: 100 }).map((c) => c.id);
    expect(below).toEqual(["varn", "bribe", "leave"]);
  });

  it("the last offer is a partnership on top of the pass with enough of the book, a threat otherwise", () => {
    expect(ACT3_CARDS.lastOffer.choices({ ...base, passRank: 1, pieces: 3 }).map((c) => c.id)).toEqual(["partner", "refuse"]);
    expect(ACT3_CARDS.lastOffer.choices({ ...base, pieces: 3 }).map((c) => c.id)).toEqual(["refuse", "give"]);
  });

  it("at last call, the book goes to the auditor only if she reached him and holds enough of it", () => {
    const shown = (f: Act3Facts) => ACT3_CARDS.lastCall.choices(f).filter((c) => !c.hidden?.(f)).map((c) => c.id);
    expect(shown({ ...base, pieces: 3 })).not.toContain("auditor");
    expect(shown({ ...base, pieces: 3, flags: new Set(["auditorReached"]) })).toContain("auditor");
    expect(shown({ ...base, pieces: 2, flags: new Set(["auditorReached"]) })).not.toContain("auditor");
  });

  it("plays out to an ending, and the nights go on", () => {
    const t = lastCall();
    t.plotFlags.add("rheaDoubts");
    t.trust = 14;
    for (const id of ["cover", "silver", "routes"] as const) t.act2.book[id] = "held";
    const answers: Record<string, string> = { fathersTrail: "rhea", rivalNight: "dirty", auditor: "varn", lastOffer: "refuse", lastCall: "auditor", finalLedger: "ending" };
    for (let i = 0; i < 12 && !t.passEnding; i++) {
      t.fans = 2000;
      morning(t);
      const beat = t.pendingBeat;
      if (!beat) continue;
      if (beat.kind === "rival") t.answerBeat("partner");
      else if (beat.kind === "act3") t.answerBeat(answers[beat.beat]);
    }
    expect(t.passEnding).toBe("villageRises");
    expect(t.news.join(" ")).toContain("The Village Rises");
  });
});

describe("the endings (STORY.md 14)", () => {
  it("put where the book went first", () => {
    expect(pickEnding({ ...base, flags: new Set(["book:baron"]), passRank: 1, corruption: 200 })).toBe("boughtAndSold");
    expect(pickEnding({ ...base, flags: new Set(["book:partner"]), passRank: 1 })).toBe("baronsPartner");
    expect(pickEnding({ ...base, flags: new Set(["book:varn"]), passRank: 1 })).toBe("baronessHouse");
  });

  it("then what she became", () => {
    expect(pickEnding({ ...base, passRank: 1, corruption: 160 })).toBe("newBaron");
    expect(pickEnding({ ...base, lanternHung: true, girlGone: true, corruption: 160 })).toBe("lanternBurns");
    expect(pickEnding({ ...base, passRank: 1, owned: 2 })).toBe("masterOfPass");
    expect(pickEnding({ ...base, flags: new Set(["book:kept"]), crown: "lantern" })).toBe("redLantern");
    expect(pickEnding({ ...base, flags: new Set(["book:kept"]), crown: "network", informed: 6 })).toBe("wrensHeir");
    expect(pickEnding({ ...base, arcKnown: true, respect: -4, owed: 100 })).toBe("lostToNight");
    expect(pickEnding({ ...base, owed: 0 })).toBe("paidInFull");
    expect(pickEnding({ ...base, owed: 100 })).toBe("lastCall");
  });

  it("the Village Rises needs the book with the auditor, the Keeper's crown, Mara free and the village's trust", () => {
    const rises = { ...base, flags: new Set(["book:auditor"]), crown: "keeper" as const, trust: 13 };
    expect(pickEnding(rises)).toBe("villageRises");
    expect(pickEnding({ ...rises, flags: new Set(["book:auditor", "maraArrested"]) })).not.toBe("villageRises");
    for (const id of Object.keys(ENDINGS)) expect(ENDINGS[id as keyof typeof ENDINGS].lines.length).toBeGreaterThan(0);
  });

  it("with the Baron fallen, the town picks its own Reeve: no vote needed", () => {
    const hall: HallFacts = {
      trust: 0, respect: -10, fame: 0, corruption: 0, fans: 0, knightRank: null, clergyRank: -1, helped: 0, warned: 0, partners: 0, ruins: 5,
      ciderPartner: false, ciderRuined: true, canteenPartner: false, canteenRuined: true, odenShut: true, maraArrested: true, odenRoute: 0, lanternLit: false, seat: true,
    };
    expect(reeveMissing(hall, newPolitics()).length).toBeGreaterThan(0);
    expect(reeveMissing({ ...hall, baronFallen: true }, newPolitics())).toEqual([]);
  });
});
