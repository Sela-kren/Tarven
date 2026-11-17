import { describe, expect, it } from "vitest";
import { ARC_STAGES, type ArcStage } from "../src/game/lewd";
import { DEBUFF_IDS } from "../src/game/debuffs";
import { PLOT_FLAGS, type PlotFlag } from "../src/game/plot";
import { TITLES } from "../src/game/titles";
import { PASSIVES } from "../src/game/passives";
import type { GuestKind } from "../src/game/tavern";
import {
  allTownTexts,
  blankTownFacts,
  heatChance,
  HEAT_MAX_CHANCE,
  lewdName,
  pickHeatMoment,
  REPUTATIONS,
  reputationOf,
  roleGroup,
  treatmentOf,
  TOO_DRUNK_TO_YES,
  type RepId,
  type RoleId,
  BUBBLE_MAX,
  CHATS,
  dressOf,
  EXCHANGES,
  exchangesFor,
  fillTown,
  HUSHES,
  outfitStyleOf,
  PASSING,
  passingLinesFor,
  pickChat,
  pickExchange,
  pickPassingLine,
  pickReply,
  PUBLIC_TITLES,
  RACES,
  RecentLines,
  REPLIES,
  STATE_CATEGORIES,
  type HeroBody,
  type TownCategory,
  type TownFacts,
  type Townsperson,
  type WornPiece,
} from "../src/game/towntalk";

const BODIES: readonly HeroBody[] = ["Female", "Male"];
const KINDS: readonly GuestKind[] = ["farmer", "soldier", "smuggler", "fugitive", "adventurer", "bandit", "noble"];
/** Everyone who might be out in the street: every kind, both sexes, with and without a people. */
const EVERYONE: readonly Townsperson[] = KINDS.flatMap((kind) =>
  [true, false].flatMap((female) => [{ kind, female }, ...RACES.map((race) => ({ kind, female, race }))]),
);

/** A seeded random, so the counts are the same every run. */
function seeded(seed = 7): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const facts = (change: Partial<TownFacts> = {}, body: HeroBody = "Female"): TownFacts => ({ ...blankTownFacts(body), ...change });

const ROLES: readonly RoleId[] = ["keeper", "madam", "squire", "knight", "knightCaptain", "adventurer", "priestess", "council", "reeve"];
const TOWN_BIKE: Partial<TownFacts> = { arc: "known", lewdness: 130 };
/** Facts that earn each public name. */
const REP_FACTS: Record<RepId, Partial<TownFacts>> = {
  blushing: {},
  pride: { titles: ["prideOfTarven"] },
  ironHand: { titles: ["ironHand"] },
  untouchable: { titles: ["untouchable"] },
  brawler: { titles: ["brawlQueen"] },
  barmaid: { titles: ["barmaid"] },
  famous: { fame: 60 },
  drinker: { drunk: 0.7 },
  secretSeller: { passives: new Set(["looseLips"]) },
  baronsToy: { corruption: 70 },
  darling: { titles: ["everyonesDarling"], arc: "known" },
  showOff: { dress: "topless" },
  unashamed: { titles: ["unashamed"], arc: "known" },
  warmHouseFav: { role: "priestess", arc: "willing" },
  bitchInHeat: { desire: 90, arc: "curious" },
  townBike: { arc: "known", lewdness: 130 },
  freeUse: { arc: "known", lewdness: 130, passives: new Set(["openHouse"]) },
  cumDump: { arc: "known", lewdness: 150, messy: true },
};

/** Every state the town's talk keys on, the facts that put her in it, and the category its lines are in. */
const STATES: { name: string; category: TownCategory; change: Partial<TownFacts>; femaleOnly?: boolean }[] = [
  ...ARC_STAGES.map((arc) => ({ name: `arc ${arc}`, category: "arc" as const, change: { arc } })),
  { name: "high respect", category: "respect", change: { respect: 6 } },
  { name: "low respect", category: "respect", change: { respect: -6 } },
  { name: "known face", category: "fame", change: { fame: 25 } },
  { name: "famous", category: "fame", change: { fame: 60 } },
  { name: "legend", category: "fame", change: { fame: 90 } },
  { name: "nobody", category: "fame", change: { fame: 0, day: 5 } },
  { name: "wanting", category: "lust", change: { desire: 90 } },
  { name: "flirt", category: "lust", change: { flirt: 7 } },
  { name: "tipsy", category: "drunk", change: { drunk: 0.4 } },
  { name: "drunk", category: "drunk", change: { drunk: 0.8 } },
  { name: "messy", category: "mess", change: { messy: true } },
  { name: "stained", category: "mess", change: { stained: true } },
  { name: "smells", category: "mess", change: { smellsOfSex: true } },
  { name: "missing a piece", category: "dress", change: { dress: "missingPiece" } },
  { name: "underwear", category: "dress", change: { dress: "underwear" } },
  { name: "topless", category: "dress", change: { dress: "topless" } },
  { name: "bare bottom", category: "dress", change: { dress: "bareBottom" } },
  { name: "naked", category: "dress", change: { dress: "naked" } },
  { name: "modern", category: "outfit", change: { outfit: "modern" } },
  { name: "revealing", category: "outfit", change: { outfit: "revealing" } },
  { name: "lingerie", category: "outfit", change: { outfit: "lingerie" } },
  { name: "church", category: "outfit", change: { outfit: "church" } },
  { name: "medieval", category: "outfit", change: { outfit: "medieval" } },
  ...[...PUBLIC_TITLES].map((id) => ({ name: `title ${id}`, category: "title" as const, change: { titles: [id], arc: "known" as ArcStage } })),
  ...DEBUFF_IDS.map((id) => ({ name: `debuff ${id}`, category: "debuff" as const, change: { debuffs: [id] } })),
  { name: "lantern lit", category: "lantern", change: { lantern: "lit" } },
  { name: "lantern dark", category: "lantern", change: { lantern: "dark" } },
  ...PLOT_FLAGS.map((flag) => ({ name: `plot ${flag}`, category: "plot" as const, change: { plot: new Set<PlotFlag>([flag]), arc: "willing" as ArcStage } })),
  { name: "corrupt", category: "corruption", change: { corruption: 60 } },
  { name: "trusted", category: "trust", change: { trust: 12 } },
  { name: "distrusted", category: "trust", change: { trust: 1 } },
  { name: "worn out", category: "will", change: { willpower: 0.1 } },
  { name: "many fans", category: "fans", change: { fans: 320 } },
  { name: "few fans", category: "fans", change: { fans: 2 } },
  ...ROLES.filter((role) => role !== "keeper").flatMap((role) => [
    { name: `role ${role}`, category: "role" as const, change: { role } },
    { name: `role ${role}, filthy name`, category: "role" as const, change: { role, ...TOWN_BIKE } },
  ]),
  ...Object.entries(REP_FACTS).map(([id, change]) => ({ name: `name ${id}`, category: "rep" as const, change })),
  { name: "leered at", category: "treat", change: { arc: "curious" } },
  { name: "propositioned", category: "treat", change: { arc: "willing" } },
  { name: "public property", category: "treat", change: { ...TOWN_BIKE } },
];

/** The visible passives the lines key on (one of each group of lines is enough). */
const SEEN_PASSIVES = [
  "cheeky", "shamelessBust", "swayingHips", "lapWarmer", "stolenKiss", "eagerMouth", "firstNight", "flasher", "openHouse",
  "likesItRough", "aching", "sharpPalm", "iceQueen", "spotlessName", "bouncer", "bottomless", "winningSmile",
  "heartOfTheVillage", "stewKeeper", "secretBroker",
];

describe("town talk: the writing", () => {
  it("has a lot of it", () => {
    const replies = Object.values(REPLIES).reduce((sum, pool) => sum + Object.values(pool).reduce((n, lines) => n + (lines?.length ?? 0), 0), 0);
    expect(PASSING.length).toBeGreaterThanOrEqual(300);
    expect(PASSING.length + replies + EXCHANGES.length + CHATS.length).toBeGreaterThanOrEqual(600);
  });

  it("gives every line its own id", () => {
    const ids = [...PASSING.map((l) => l.id), ...EXCHANGES.map((e) => e.id), ...CHATS.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("fits every line in a speech bubble, filled for either body, any standing and the longest name", () => {
    const texts = allTownTexts();
    expect(texts.length).toBeGreaterThan(1000);
    for (const body of BODIES) {
      const longest = REPUTATIONS.map((r) => r.names[body === "Female" ? 0 : 1]).reduce((a, b) => (b.length > a.length ? b : a));
      for (const role of ROLES) {
        for (const text of texts) {
          const filled = fillTown(text, body, role, longest);
          expect(filled, text).not.toMatch(/\{\w+\}/);
          expect(filled.length, filled).toBeLessThanOrEqual(BUBBLE_MAX);
        }
      }
    }
    expect(HUSHES.length).toBeGreaterThan(0);
  });

  it("only uses passives and titles that exist", () => {
    const passiveIds = new Set(PASSIVES.map((p) => p.id));
    for (const id of SEEN_PASSIVES) expect(passiveIds.has(id), id).toBe(true);
    const titleIds = new Set(TITLES.map((t) => t.id));
    for (const id of PUBLIC_TITLES) expect(titleIds.has(id), id).toBe(true);
  });
});

describe("town talk: every state has lines", () => {
  /** Keyed lines that fit this state for someone in the street and don't fit a neutral heroine. */
  function keyedFor(f: TownFacts, category: TownCategory): string[] {
    // Two plain heroines in different stages: a line that fits both reads none of her state.
    const plainA = blankTownFacts(f.body);
    const plainB = { ...blankTownFacts(f.body), arc: "curious" as ArcStage, fame: 40 };
    const ids = new Set<string>();
    for (const who of EVERYONE) {
      const inB = new Set(passingLinesFor(plainB, who).map((l) => l.id));
      const neutral = new Set(passingLinesFor(plainA, who).filter((l) => inB.has(l.id)).map((l) => l.id));
      for (const line of passingLinesFor(f, who)) if (line.category === category && !neutral.has(line.id)) ids.add(line.id);
    }
    return [...ids];
  }

  for (const state of STATES) {
    it(`${state.name}, for both bodies`, () => {
      for (const body of BODIES) expect(keyedFor(facts(state.change, body), state.category).length, `${state.name} ${body}`).toBeGreaterThan(0);
    });
  }

  it("the visible passives each have lines, for both bodies", () => {
    for (const id of SEEN_PASSIVES) {
      for (const body of BODIES) {
        const f = facts({ passives: new Set([id]), arc: "known" }, body);
        expect(keyedFor(f, "passive").length, `${id} ${body}`).toBeGreaterThan(0);
      }
    }
  });

  it("the hour has lines morning, noon, afternoon and late", () => {
    for (const hour of [8, 12, 15, 16.5]) {
      const lines = passingLinesFor(facts({ hour }), { kind: "farmer", female: false }).filter((l) => l.category === "time");
      expect(lines.length, `${hour}`).toBeGreaterThan(0);
    }
  });

  it("every kind of townsperson has a voice, and every people some lines", () => {
    for (const kind of KINDS) {
      expect(PASSING.some((l) => l.category === "kind" && l.k?.includes(kind)), kind).toBe(true);
      expect(EXCHANGES.some((e) => e.k?.includes(kind) || (!e.k && !e.r)), kind).toBe(true);
    }
    for (const race of RACES) expect(PASSING.some((l) => l.r?.includes(race)), race).toBe(true);
  });

  it("every body-gated category has lines for the other body too", () => {
    const gated = new Set(PASSING.filter((l) => l.b).map((l) => l.id.split(".").slice(0, 2).join(".")));
    for (const prefix of gated) {
      for (const body of BODIES) {
        const open = PASSING.filter((l) => l.id.startsWith(`${prefix}.`) && (!l.b || l.b === body));
        expect(open.length, `${prefix} ${body}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("town talk: her state wins", () => {
  const farmer: Townsperson = { kind: "farmer", female: false };

  /** The share of `draws` passing lines in `category`, each a fresh pick. */
  function share(f: TownFacts, test: (category: TownCategory, keyed: boolean) => boolean, who = farmer, draws = 600): number {
    const random = seeded(11);
    let hits = 0;
    for (let i = 0; i < draws; i++) {
      const pick = pickPassingLine(f, who, new RecentLines(), random)!;
      if (test(pick.category, pick.keyed)) hits++;
    }
    return hits / draws;
  }

  it("is mostly about her, even on an ordinary day", () => {
    expect(share(facts(), (_, keyed) => keyed)).toBeGreaterThan(0.7);
  });

  it("a messy heroine hears about it most of the time", () => {
    expect(share(facts({ messy: true }), (c) => c === "mess")).toBeGreaterThan(0.5);
    expect(share(facts({ messy: true, smellsOfSex: true, arc: "known" }, "Male"), (c) => c === "mess")).toBeGreaterThan(0.5);
  });

  it("bare in the street drowns out everything else", () => {
    for (const body of BODIES) {
      expect(share(facts({ dress: "topless", arc: "willing", titles: ["barmaid"] }, body), (c) => c === "dress")).toBeGreaterThan(0.5);
      expect(share(facts({ dress: "naked", passives: new Set(["cheeky"]) }, body), (c) => c === "dress")).toBeGreaterThan(0.55);
    }
  });

  it("very drunk, the street notices", () => {
    expect(share(facts({ drunk: 0.9 }), (c) => c === "drunk")).toBeGreaterThan(0.4);
  });

  it("a speaker's own voice comes through when it fits", () => {
    const goblin: Townsperson = { kind: "smuggler", female: false, race: "goblin" };
    const random = seeded(3);
    let goblinish = 0;
    for (let i = 0; i < 300; i++) {
      const pick = pickPassingLine(facts({ dress: "naked" }), goblin, new RecentLines(), random)!;
      if (/silver|Cheap|postcards/i.test(pick.text)) goblinish++;
    }
    expect(goblinish).toBeGreaterThan(30);
  });

  it("speaks of the arc stage she's at, and not one she isn't", () => {
    const random = seeded(5);
    for (const arc of ARC_STAGES) {
      for (let i = 0; i < 80; i++) {
        const pick = pickPassingLine(facts({ arc }), farmer, new RecentLines(), random)!;
        if (pick.id.startsWith("arc.") && !pick.id.startsWith("arc.rotten")) expect(pick.id.startsWith(`arc.${arc}.`), pick.id).toBe(true);
      }
    }
  });
});

describe("town talk: picking", () => {
  const soldier: Townsperson = { kind: "soldier", female: false, race: "orc" };

  it("never repeats a line within the window", () => {
    const recent = new RecentLines(30);
    const random = seeded(2);
    const seen: string[] = [];
    for (let i = 0; i < 30; i++) {
      const pick = pickPassingLine(facts({ arc: "known", messy: true, fame: 60 }), soldier, recent, random);
      expect(pick).not.toBeNull();
      seen.push(pick!.id);
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("returns null once everything that fits has been said", () => {
    const recent = new RecentLines(1000);
    const random = seeded(4);
    let picks = 0;
    while (pickPassingLine(facts(), { kind: "noble", female: true }, recent, random)) picks++;
    expect(picks).toBeGreaterThan(10);
    expect(pickPassingLine(facts(), { kind: "noble", female: true }, recent, random)).toBeNull();
  });

  it("never gives the other body's lines", () => {
    const random = seeded(9);
    for (let i = 0; i < 300; i++) {
      const male = pickPassingLine(facts({ dress: "naked", arc: "known" }, "Male"), soldier, new RecentLines(), random)!;
      expect(male.text).not.toMatch(/tits|pussy|nightie/i);
      const female = pickPassingLine(facts({ dress: "naked", arc: "known" }, "Female"), soldier, new RecentLines(), random)!;
      expect(female.text).not.toMatch(/\bcock's out|balls are out|shirtless/i);
    }
  });

  it("finds her an answer for every line and every stage", () => {
    for (const line of PASSING) {
      for (const arc of ARC_STAGES) {
        for (const body of BODIES) {
          const reply = pickReply(line.id, facts({ arc }, body), () => 0.5);
          expect(reply, `${line.id} ${arc}`).not.toBeNull();
          expect(reply!.thought).toBe(reply!.text.startsWith("("));
        }
      }
    }
    expect(pickReply("no.such.line", facts(), Math.random)).toBeNull();
  });

  it("answers in her stage's voice", () => {
    const line = PASSING.find((l) => l.id.startsWith("respect.lo"))!;
    const sheltered = REPLIES["respect.lo"].sheltered!;
    const known = REPLIES["respect.lo"].known!;
    const random = seeded(8);
    for (let i = 0; i < 20; i++) {
      expect(sheltered).toContain(pickReply(line.id, facts({ arc: "sheltered", respect: -6 }), random)!.text);
      expect(known).toContain(pickReply(line.id, facts({ arc: "known", respect: -6 }), random)!.text);
    }
  });

  it("has exchanges for every stage, for everyone, with her line filled", () => {
    for (const arc of ARC_STAGES) {
      for (const who of EVERYONE) {
        for (const body of BODIES) expect(exchangesFor(facts({ arc }, body), who).length, `${arc} ${who.kind}`).toBeGreaterThan(2);
      }
    }
    const random = seeded(6);
    const recent = new RecentLines(10);
    for (let i = 0; i < 40; i++) {
      const pick = pickExchange(facts({ arc: ARC_STAGES[i % 4], messy: i % 3 === 0 }), { kind: KINDS[i % KINDS.length], female: i % 2 === 0 }, recent, random)!;
      expect(pick.npc.length).toBeGreaterThan(0);
      expect(pick.her.text.length).toBeGreaterThan(0);
    }
  });

  it("two townsfolk mostly talk about her, and hush or say it to her face when she's near", () => {
    const random = seeded(12);
    const a: Townsperson = { kind: "farmer", female: true };
    const b: Townsperson = { kind: "soldier", female: false };
    let aboutHer = 0;
    for (let i = 0; i < 300; i++) {
      const chat = pickChat(facts({ arc: "known", messy: true }), a, b, new RecentLines(), random)!;
      if (chat.aboutYou) aboutHer++;
      for (const line of chat.lines) expect(line.who === 0 || line.who === 1).toBe(true);
    }
    expect(aboutHer / 300).toBeGreaterThan(0.6);

    for (let i = 0; i < 200; i++) {
      const chat = pickChat(facts({ arc: "willing" }), a, b, new RecentLines(), random, true)!;
      if (!chat.aboutYou) continue;
      const hushed = HUSHES.some((hush) => hush.map((t) => fillTown(t, "Female")).join("|") === chat.lines.map((l) => l.text).join("|"));
      expect(chat.loud || hushed, chat.id).toBe(true);
    }
  });

  it("gives a line to a speaker a chat's first line fits, whichever was passed first", () => {
    const random = seeded(13);
    const elf: Townsperson = { kind: "noble", female: true, race: "elf" };
    const human: Townsperson = { kind: "farmer", female: false, race: "human" };
    for (let i = 0; i < 200; i++) {
      const chat = pickChat(facts(), human, elf, new RecentLines(), random)!;
      const def = CHATS.find((c) => c.id === chat.id)!;
      if (def.r?.includes("elf")) expect(chat.lines[0].who).toBe(1);
    }
  });
});

describe("town talk: filling the facts", () => {
  const ladder: WornPiece[] = [
    { id: "apron", layer: "accessory", region: "waist" },
    { id: "bodice", layer: "outer", region: "top" },
    { id: "skirt", layer: "outer", region: "bottom" },
    { id: "shoes", layer: "outer", region: "feet", keep: "never" },
    { id: "stockings", layer: "legwear", region: "legs" },
    { id: "blouse", layer: "under", region: "top" },
    { id: "bra", layer: "smallclothes", region: "top" },
    { id: "smalls", layer: "smallclothes", region: "bottom" },
  ];

  it("reads what shows from the pieces off her", () => {
    expect(dressOf(ladder, [])).toBe("dressed");
    expect(dressOf(ladder, ["apron"])).toBe("missingPiece");
    expect(dressOf(ladder, ["apron", "bodice"])).toBe("underwear");
    expect(dressOf(ladder, ["apron", "bodice", "blouse", "bra"])).toBe("topless");
    expect(dressOf(ladder, ["skirt", "smalls"])).toBe("bareBottom");
    expect(dressOf(ladder, ladder.map((g) => g.id))).toBe("naked");
  });

  it("knows the outfits", () => {
    expect(outfitStyleOf(undefined)).toBe("work");
    expect(outfitStyleOf("tavern")).toBe("work");
    expect(outfitStyleOf("dirndl")).toBe("medieval");
    expect(outfitStyleOf("plunge")).toBe("revealing");
    expect(outfitStyleOf("babydoll")).toBe("lingerie");
    expect(outfitStyleOf("priestess")).toBe("church");
    expect(outfitStyleOf("tee")).toBe("modern");
  });

  it("covers every state category", () => {
    const covered = new Set(STATES.map((s) => s.category));
    covered.add("passive");
    for (const category of STATE_CATEGORIES) expect(covered.has(category), category).toBe(true);
  });
});

describe("town talk: her standing and her names", () => {
  it("knows the standings, and reads unknown ones as the keeper", () => {
    expect(roleGroup(undefined)).toBe("keeper");
    expect(roleGroup("knightCaptain")).toBe("knight");
    expect(roleGroup("reeve")).toBe("reeve");
    expect(roleGroup("archmage")).toBe("keeper");
    expect(fillTown("Morning, {Role}!", "Female", "knight")).toBe("Morning, Dame!");
    expect(fillTown("Morning, {Role}!", "Male", "knight")).toBe("Morning, Sir!");
    expect(fillTown("Morning, {Role}!", "Male", "archmage")).toBe("Morning, Keeper!");
  });

  it("names her by what she's done, best known first", () => {
    for (const [id, change] of Object.entries(REP_FACTS)) {
      for (const body of BODIES) expect(reputationOf(facts(change, body)).map((r) => r.id), `${id} ${body}`).toContain(id);
    }
    const filthy = reputationOf(facts({ arc: "known", lewdness: 150, messy: true, passives: new Set(["openHouse"]) }));
    expect(filthy.map((r) => r.id)).toEqual(expect.arrayContaining(["cumDump", "townBike", "freeUse"]));
    expect(filthy[0].id).toBe("cumDump");
    for (let i = 1; i < filthy.length; i++) expect(filthy[i - 1].score).toBeGreaterThanOrEqual(filthy[i].score);
    // The body sets the words.
    expect(reputationOf(facts({ desire: 95, arc: "willing" }, "Female")).find((r) => r.id === "bitchInHeat")?.name).toBe("the bitch in heat");
    expect(reputationOf(facts({ desire: 95, arc: "willing" }, "Male")).find((r) => r.id === "bitchInHeat")?.name).toBe("the stud in rut");
    // A sheltered keeper's want isn't seen in the street yet, and a clean one has no filthy name.
    expect(reputationOf(facts({ desire: 95 })).some((r) => r.id === "bitchInHeat")).toBe(false);
    expect(lewdName(facts({ titles: ["prideOfTarven"] }))).toBeNull();
    expect(reputationOf(facts({ titles: ["prideOfTarven"] }))[0].id).toBe("pride");
  });

  it("treats her by her name: polite, leering, offers, public property", () => {
    expect(treatmentOf(facts())).toBe("polite");
    expect(treatmentOf(facts({ arc: "curious" }))).toBe("leering");
    expect(treatmentOf(facts({ arc: "willing" }))).toBe("propositions");
    expect(treatmentOf(facts(TOWN_BIKE))).toBe("property");
    expect(treatmentOf(facts({ ...TOWN_BIKE, respect: 4 }))).toBe("propositions");
    expect(treatmentOf(facts({ arc: "willing", respect: 7 }))).toBe("leering");
  });

  it("keys lines on her standing and her name together", () => {
    const farmer: Townsperson = { kind: "farmer", female: false };
    const clean = passingLinesFor(facts({ role: "reeve" }), farmer).filter((l) => l.category === "role");
    const filthy = passingLinesFor(facts({ role: "reeve", ...TOWN_BIKE }), farmer).filter((l) => l.category === "role");
    expect(clean.length).toBeGreaterThan(0);
    expect(clean.some((l) => l.id.startsWith("role.lewd"))).toBe(false);
    expect(filthy.every((l) => l.id.startsWith("role.lewd"))).toBe(true);
    expect(filthy.some((l) => l.id.startsWith("role.lewd.reeve"))).toBe(true);
    // A keeper has no standing lines.
    expect(passingLinesFor(facts(TOWN_BIKE), farmer).some((l) => l.category === "role")).toBe(false);
    // The respected standing with the filthy name is the joke the street makes most.
    const random = seeded(21);
    let role = 0;
    for (let i = 0; i < 400; i++) if (pickPassingLine(facts({ role: "reeve", ...TOWN_BIKE }), farmer, new RecentLines(), random)!.category === "role") role++;
    expect(role / 400).toBeGreaterThan(0.2);
    // Fills her address in.
    const knight = pickPassingLine(facts({ role: "knight", ...TOWN_BIKE }, "Male"), { kind: "soldier", female: false }, new RecentLines(), () => 0.01);
    expect(knight!.text).not.toMatch(/\{/);
  });
});

describe("town talk: consent", () => {
  const property = facts({ ...TOWN_BIKE, passives: new Set(["openHouse"]) });

  it("writes every grope as a hand that lands, and lets one land only with the switch off", () => {
    for (const line of PASSING) if (line.act === "grope") expect(line.lands, line.id).toBe(true);
    for (const line of PASSING) if (line.lands) expect(line.act, line.id).toBe("grope");
    for (const who of EVERYONE) {
      for (const body of BODIES) {
        expect(passingLinesFor({ ...property, body }, who).some((l) => l.lands)).toBe(false);
      }
    }
    expect(EVERYONE.some((who) => passingLinesFor({ ...property, consentOff: true }, who).some((l) => l.lands))).toBe(true);
    const random = seeded(31);
    let landed = 0;
    for (let i = 0; i < 600; i++) {
      const on = pickPassingLine(property, { kind: "soldier", female: false }, new RecentLines(), random)!;
      expect(on.act).not.toBe("grope");
      const off = pickPassingLine({ ...property, consentOff: true }, { kind: "soldier", female: false }, new RecentLines(), random)!;
      if (off.act === "grope") landed++;
    }
    expect(landed).toBeGreaterThan(0);
  });

  it("lets her answer a touch asked for, and her no stands", () => {
    const asks = PASSING.filter((l) => l.ask);
    expect(asks.length).toBeGreaterThan(5);
    const random = seeded(41);
    for (const line of asks) {
      for (const body of BODIES) {
        const sheltered = pickReply(line.id, facts({}, body), random)!;
        expect(sheltered.answer).toBe("no");
        const drunk = pickReply(line.id, facts({ ...TOWN_BIKE, drunk: TOO_DRUNK_TO_YES }, body), random)!;
        expect(drunk.answer).toBe("no");
      }
    }
    let yes = 0;
    for (let i = 0; i < 200; i++) if (pickReply(asks[0].id, property, random)!.answer === "yes") yes++;
    expect(yes).toBeGreaterThan(120);
  });

  it("says nothing to her, and does nothing, while she's passed out", () => {
    const out = facts({ ...TOWN_BIKE, passedOut: true, consentOff: true });
    const who: Townsperson = { kind: "soldier", female: false };
    expect(pickPassingLine(out, who, new RecentLines())).toBeNull();
    expect(pickExchange(out, who, new RecentLines())).toBeNull();
    expect(pickChat(out, who, who, new RecentLines())).toBeNull();
    expect(pickHeatMoment(out, who, new RecentLines())).toBeNull();
    expect(heatChance(out)).toBe(0);
  });
});

describe("town talk: heat moments", () => {
  const hot: Partial<TownFacts> = {
    arc: "known",
    lewdness: 130,
    desire: 100,
    lust: 9,
    flirt: 8,
    willpower: 0.05,
    drunk: 0.5,
    passives: new Set(["aching", "alwaysWanting", "insatiable"]),
  };

  it("comes on with desire, lust, flirt, heat passives, drink and low willpower", () => {
    expect(heatChance(facts())).toBe(0);
    const warm = heatChance(facts({ arc: "curious", desire: 70 }));
    expect(warm).toBeGreaterThan(0);
    expect(heatChance(facts({ arc: "curious", desire: 70, drunk: 0.6 }))).toBeGreaterThan(warm);
    expect(heatChance(facts({ arc: "curious", desire: 70, willpower: 0.1 }))).toBeGreaterThan(warm);
    expect(heatChance(facts({ arc: "curious", desire: 70, passives: new Set(["aching"]) }))).toBeGreaterThan(warm);
    expect(heatChance(facts({ arc: "willing", desire: 70 }))).toBeGreaterThan(warm);
    expect(heatChance(facts(hot))).toBe(HEAT_MAX_CHANCE);
    expect(heatChance(facts(hot), "passing")).toBeLessThan(heatChance(facts(hot), "talk"));
  });

  it("is won by her willpower: held, she catches herself; spent, she makes an offer", () => {
    const random = seeded(51);
    const who: Townsperson = { kind: "soldier", female: false };
    let held = 0;
    let gave = 0;
    for (let i = 0; i < 200; i++) {
      if (pickHeatMoment(facts({ arc: "curious", desire: 70, willpower: 1 }), who, new RecentLines(), random)!.outcome === "resisted") held++;
      if (pickHeatMoment(facts(hot), who, new RecentLines(), random)!.outcome === "gaveIn") gave++;
    }
    expect(held / 200).toBeGreaterThan(0.7);
    expect(gave / 200).toBeGreaterThan(0.7);
  });

  it("plays as beats in turn, with effects and an offer to hook a scene on", () => {
    const random = seeded(61);
    for (let i = 0; i < 300; i++) {
      const body = BODIES[i % 2];
      const who = EVERYONE[i % EVERYONE.length];
      const f = facts({ ...hot, willpower: i % 3 === 0 ? 1 : 0.05 }, body);
      const m = pickHeatMoment(f, who, new RecentLines(), random, { opener: i % 4 !== 0 })!;
      expect(m.beats.length).toBeGreaterThanOrEqual(5);
      expect(m.beats.some((b) => b.who === "her")).toBe(true);
      expect(m.beats.some((b) => b.who === "them")).toBe(true);
      expect(m.beats[0].who).toBe(i % 4 !== 0 ? "them" : "her");
      for (const beat of m.beats) {
        expect(beat.text.length).toBeLessThanOrEqual(BUBBLE_MAX);
        expect(beat.text).not.toMatch(/\{/);
        if (beat.thought) expect(beat.who).toBe("her");
        if (body === "Male") expect(beat.text).not.toMatch(/dripping/);
        if (body === "Female") expect(beat.text).not.toMatch(/hard as a post/);
      }
      expect(m.effects.respect).toBeLessThan(0);
      expect(m.summary.length).toBeGreaterThan(0);
      expect(m.summary).not.toMatch(/\{/);
      if (body === "Male") expect(m.summary).not.toMatch(/(Her|She|she|herself)/);
      if (m.outcome === "resisted") expect(m.offer).toBeNull();
      if (m.reaction === "flees" || m.reaction === "declines") expect(m.offer).toBeNull();
      if (m.outcome === "gaveIn" && m.reaction !== "flees" && m.reaction !== "declines") expect(m.offer).not.toBeNull();
    }
  });

  it("turns her down when she's too drunk to ask, with Consent On", () => {
    const random = seeded(71);
    const who: Townsperson = { kind: "soldier", female: false };
    for (let i = 0; i < 100; i++) {
      const m = pickHeatMoment(facts({ ...hot, drunk: 1 }), who, new RecentLines(), random)!;
      if (m.outcome === "gaveIn") expect(["declines", "flees"]).toContain(m.reaction);
    }
  });

  it("reacts by who they are: the bold call their friends, the prim run", () => {
    const random = seeded(81);
    const count = (who: Townsperson) => {
      const seen: Record<string, number> = {};
      for (let i = 0; i < 300; i++) {
        const m = pickHeatMoment(facts(hot), who, new RecentLines(), random)!;
        seen[m.reaction] = (seen[m.reaction] ?? 0) + 1;
      }
      return seen;
    };
    const soldier = count({ kind: "soldier", female: false });
    const lady = count({ kind: "noble", female: true });
    expect(soldier.callsFriends ?? 0).toBeGreaterThan(lady.callsFriends ?? 0);
    expect(lady.flees ?? 0).toBeGreaterThan(soldier.flees ?? 0);
  });

  it("doesn't repeat her needy lines back to back", () => {
    const recent = new RecentLines(30);
    const random = seeded(91);
    const slips: string[] = [];
    for (let i = 0; i < 3; i++) {
      const m = pickHeatMoment(facts(hot), { kind: "farmer", female: false }, recent, random, { opener: false })!;
      slips.push(m.beats[0].text);
    }
    expect(new Set(slips).size).toBe(3);
  });
});
