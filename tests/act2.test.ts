import { describe, expect, it } from "vitest";
import {
  ACT2_BEATS,
  ACT2_CARDS,
  bottomRival,
  housesOwned,
  ledgerLines,
  newPass,
  passNight,
  passRank,
  PASS_RIVALS,
  PIECES,
  readAct2,
  rivalAbove,
  RIVAL_GROWTH_MAX,
  type BookFacts,
} from "../src/game/act2";
import { TOWN_PLACES } from "../src/game/townplaces";
import { Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];

function onThePass(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 500;
  // Chapter 1 done: First in Tarven.
  for (const id of ["salt", "deserter", "cider", "meeting", "bakehouse", "pell", "canteen", "tollgate", "copperBell"]) t.beatsDone.add(id);
  return t;
}

/** The morning's Act 2 step alone. */
const morning = (t: Tavern) => (t as unknown as { act2Morning(): void }).act2Morning();

const facts: BookFacts = { trust: 0, gold: 0, arc: "sheltered", brawlsWon: 0, flags: new Set(), odenRoute: 0, maraTalks: 0, smugglerRank: -1 };

describe("the Pass Ledger (STORY.md 7 and 11)", () => {
  it("starts her fourth, behind the Stag, the Velvet House and the Rat", () => {
    const p = { ...newPass(), open: true };
    expect(passRank(p, 501)).toBe(4);
    expect(rivalAbove(p, 501)).toBe("rat");
    expect(ledgerLines(p, 501)[3]).toContain("Your tavern, 501 fans");
  });

  it("grows each rival a little every night, more once they're desperate", () => {
    const p = { ...newPass(), open: true };
    const grown = passNight(p, () => 0.999);
    expect(grown.rivals.stag.fans - p.rivals.stag.fans).toBe(RIVAL_GROWTH_MAX);
    expect(passNight({ ...p, desperate: true }, () => 0.999).rivals.stag.fans - p.rivals.stag.fans).toBeGreaterThan(RIVAL_GROWTH_MAX);
  });

  it("sends the rival she's pushed to the bottom to her door", () => {
    const p = { ...newPass(), open: true };
    expect(bottomRival(p, 700)).toBeNull();
    expect(bottomRival(p, 900)).toBe("rat");
  });

  it("counts the houses she owns for Master of the Pass", () => {
    const p = newPass();
    p.rivals.rat.fate = "bought";
    p.rivals.velvet.fate = "partner";
    p.rivals.stag.fate = "ruin";
    expect(housesOwned(p)).toEqual(["velvet", "rat"]);
  });
});

describe("Act 2's beats", () => {
  it("come in order, by fans, as dawn cards with her choices", () => {
    expect(ACT2_BEATS.map((b) => b.fans)).toEqual([600, 700, 850, 1000, 1150, 1300, 1500]);
    for (const b of ACT2_BEATS) expect(ACT2_CARDS[b.id].choices.length).toBeGreaterThan(0);
  });

  it("New terms opens the pass and tells her someone has the key", () => {
    const t = onThePass();
    t.fans = 600;
    morning(t);
    expect(t.beatCard?.title).toBe("New terms");
    t.answerBeat(t.beatChoices[0].id);
    expect(t.act2.pass.open).toBe(true);
    expect(t.act2.book.cover).toBe("heard");
    expect(t.storyAct).toBe(2);
  });

  it("only one a morning, and none before her fans reach it", () => {
    const t = onThePass();
    t.fans = 599;
    morning(t);
    expect(t.pendingBeat).toBeNull();
  });

  it("the first Ledger's brawl night: held, the map is hers to claim", () => {
    const t = onThePass();
    t.act2.pass.open = true;
    t.act2.flags.push("beat:newTerms", "beat:velvetCard", "beat:nightshirt");
    t.fans = 1000;
    // The rivals above her, still above: nobody falls this morning.
    for (const id of ["stag", "velvet", "rat"] as const) t.act2.pass.rivals[id].fans = 2000;
    morning(t);
    expect(t.beatCard?.title).toBe("The first Ledger");
    t.answerBeat("hold");
    expect(t.act2.book.routes).toBe("heard");
    (t as unknown as { rivalNight(a: unknown[]): void }).rivalNight([]);
    t.records.fightsWon++;
    morning(t);
    expect(t.act2.flags).toContain("heldTheRoom");
  });

  it("The turn: Father's letter puts the last pages in the keep's cells, and every rival gets desperate", () => {
    const lines = ACT2_CARDS.theTurn.lines({ gold: 0, trust: 0, respect: 0, messes: 0, flags: new Set(), ledger: [] }).join(" ");
    expect(lines).toContain("in the cells");
    expect(ACT2_CARDS.theTurn.choices[0].run({ gold: 0, trust: 0, respect: 0, messes: 0, flags: new Set(), ledger: [] }).desperate).toBe(true);
  });

  it("the second Ledger ends the act: Act 3 is next", () => {
    const t = onThePass();
    t.act2.flags.push(...["newTerms", "velvetCard", "nightshirt", "firstLedger", "inspection", "theTurn"].map((id) => `beat:${id}`));
    t.act2.pass.open = true;
    for (const id of ["stag", "velvet", "rat"] as const) t.act2.pass.rivals[id].fans = 3000;
    t.fans = 1500;
    morning(t);
    expect(t.beatCard?.title).toBe("The second Ledger");
    t.answerBeat("go");
    expect(t.storyAct).toBe(3);
  });
});

describe("a rival at her door", () => {
  it("bought, partnered or ruined, and what each brings", () => {
    const t = onThePass();
    t.act2.pass.open = true;
    t.fans = 900;
    morning(t);
    expect(t.pendingBeat?.kind).toBe("rival");
    expect(t.beatChoices.map((c) => c.id)).toEqual(["bought", "partner", "ruin"]);
    const fans = t.fans;
    const corruption = t.corruption;
    t.answerBeat("ruin");
    expect(t.act2.pass.rivals.rat.fate).toBe("ruin");
    expect(t.fans).toBeGreaterThan(fans);
    expect(t.corruption).toBeGreaterThan(corruption);
    expect(t.news.join(" ")).toContain(PASS_RIVALS.rat.clue);
  });

  it("can't be bought without the gold", () => {
    const t = onThePass();
    t.gold = 10;
    t.act2.pass.open = true;
    t.fans = 900;
    morning(t);
    expect(t.beatChoices.map((c) => c.id)).toEqual(["partner", "ruin"]);
  });
});

describe("the red book (STORY.md 3 and 6)", () => {
  it("each piece has a way for more than one kind of player", () => {
    expect(PIECES.silver.ways.map((w) => w.way)).toEqual(["trust", "desire", "coin", "fists"]);
    expect(PIECES.routes.ways.map((w) => w.way)).toEqual(["trust", "desire", "coin", "fists"]);
  });

  it("Act 1's choices change who has a piece: a shut chapel means buying Oden's key from the Baron's men", () => {
    const trust = PIECES.cover.ways.find((w) => w.way === "trust")!;
    const coin = PIECES.cover.ways.find((w) => w.way === "coin")!;
    const shut = { ...facts, gold: 100, flags: new Set(["odenShut"]) };
    expect(trust.needs(shut)).toBe("Oden's gone");
    expect(coin.needs(shut)).toBeNull();
    expect(coin.needs({ ...facts, gold: 100 })).toBe("Oden still has it");
  });

  it("is won in town once she's heard of it, and gone from the list once she holds it", () => {
    const t = onThePass();
    const shown = () => TOWN_PLACES.quarry.actions.filter((a) => !a.hidden?.(t.townState)).map((a) => a.id);
    expect(shown()).not.toContain("book_routes_coin");
    t.act2.book.routes = "heard";
    expect(shown()).toContain("book_routes_coin");
    const gold = t.gold;
    t.doTownAction("quarry", "book_routes_coin");
    expect(t.act2.book.routes).toBe("held");
    expect(t.act2.won.routes).toBe("coin");
    expect(gold - t.gold).toBe(100);
    expect(shown()).not.toContain("book_routes_coin");
  });

  it("is kept in the save", () => {
    const back = readAct2(JSON.parse(JSON.stringify({ pass: { open: true, rivals: { rat: { fans: 850, fate: "partner" } } }, book: { cover: "held" }, won: { cover: "trust" }, flags: ["beat:newTerms"] })));
    expect(back.pass.open).toBe(true);
    expect(back.pass.rivals.rat).toEqual({ fans: 850, fate: "partner", fallen: false });
    expect(back.book.cover).toBe("held");
    expect(back.won.cover).toBe("trust");
    expect(back.flags).toEqual(["beat:newTerms"]);
  });
});
