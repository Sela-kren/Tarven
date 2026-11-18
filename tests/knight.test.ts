import { describe, expect, it } from "vitest";
import {
  ashChoice,
  becomeReeve,
  canPromote,
  canRaid,
  caughtChance,
  commanderDuel,
  drill,
  effectsOf,
  fadeScandal,
  FAVOUR_GOOD,
  KNIGHT_RANK_ORDER,
  KNIGHT_RANKS,
  lawCost,
  mayorEligible,
  newKnightState,
  passLaw,
  PATROL_EVENTS,
  patrolEvents,
  promote,
  raidOdds,
  recordDrill,
  recordPatrol,
  recordRaid,
  resolvePatrol,
  resolveRaid,
  scandal,
  SCANDAL_LIMIT,
  setRules,
  squadVote,
  swearOath,
  tourneyDuel,
  townVoteShare,
  type KnightFacts,
  type KnightState,
} from "../src/game/knight";

const facts = (over: Partial<KnightFacts> = {}): KnightFacts => ({
  brawlsWon: 0,
  fame: 0,
  respect: 0,
  act: 1,
  rheaDoubts: false,
  councilSeat: false,
  baronFallen: false,
  townVote: 0,
  ...over,
});
const at = (over: Partial<KnightState> = {}): KnightState => ({ ...newKnightState(), ...over });
const always = () => 0;
const never = () => 0.999;

describe("the ladder", () => {
  it("has five ranks, each with its data", () => {
    expect(KNIGHT_RANK_ORDER).toEqual(["volunteer", "squire", "knight", "captain", "commander"]);
    for (const r of KNIGHT_RANK_ORDER) expect(KNIGHT_RANKS[r].name.length).toBeGreaterThan(0);
    expect(KNIGHT_RANKS.commander.effects.rules).toBe(true);
    expect(KNIGHT_RANKS.squire.effects.brawlDamage).toBeGreaterThan(0);
  });

  it("Squire needs 5 brawls and the drill test, and says what's missing", () => {
    const s = at();
    const no = canPromote(s, facts({ brawlsWon: 3 }));
    expect(no.ok).toBe(false);
    expect(no.next).toBe("squire");
    expect(no.missing).toHaveLength(2);
    expect(no.missing[0]).toContain("3/5");
    const yes = promote(at({ drillBest: 70 }), facts({ brawlsWon: 5 }));
    expect(yes.ok).toBe(true);
    expect(yes.state.rank).toBe("squire");
    expect(yes.xp).toBe(KNIGHT_RANKS.squire.xp);
    expect(yes.state.favour).toBe(20);
  });

  it("a failed promotion changes nothing", () => {
    const s = at();
    const r = promote(s, facts());
    expect(r.ok).toBe(false);
    expect(r.state).toBe(s);
  });

  it("Knight needs a tourney win and the oath, and brings a squad", () => {
    let s = at({ rank: "squire", patrols: 5, favour: FAVOUR_GOOD });
    expect(canPromote(s, facts()).missing).toEqual(["Win a tourney duel", "Swear the oath"]);
    s = tourneyDuel(s, "lost").state;
    expect(s.tourneyWins).toBe(0);
    s = tourneyDuel(s, "won").state;
    expect(swearOath(s, "town", facts()).ok).toBe(false);
    s = swearOath(s, "baron", facts()).state;
    expect(s.oath).toBe("baron");
    const r = promote(s, facts());
    expect(r.ok).toBe(true);
    expect(r.state.rank).toBe("knight");
    expect(r.state.squad).toHaveLength(3);
  });

  it("Captain needs fame, respect, patrols and a loyal squad", () => {
    const squad = [
      { name: "a", loyalty: 60 },
      { name: "b", loyalty: 60 },
      { name: "c", loyalty: 50 },
    ];
    const s = at({ rank: "knight", patrols: 12, squad });
    expect(canPromote(s, facts({ fame: 40, respect: 40 })).missing).toHaveLength(1);
    const loyal = at({ rank: "knight", patrols: 12, squad: squad.map((m) => ({ ...m, loyalty: 70 })) });
    expect(promote(loyal, facts({ fame: 40, respect: 40 })).state.rank).toBe("captain");
  });

  it("Commander: beat the old commander or win the squad vote, in act 2", () => {
    const squad = [
      { name: "a", loyalty: 60 },
      { name: "b", loyalty: 60 },
      { name: "c", loyalty: 20 },
    ];
    const s = at({ rank: "captain", squad });
    expect(canPromote(s, facts({ act: 2 })).ok).toBe(false);
    expect(commanderDuel(s, "talked").state.commanderBeaten).toBe(false);
    const duel = commanderDuel(s, "won").state;
    expect(promote(duel, facts({ act: 2 })).state.rank).toBe("commander");
    expect(promote(duel, facts({ act: 1 })).ok).toBe(false);
    const noRhea = squadVote(s, false);
    expect(noRhea.won).toBe(false);
    const vote = squadVote(s, true);
    expect(vote.yes).toBe(3);
    expect(vote.won).toBe(true);
    const r = promote(vote.state, facts({ act: 2 }));
    expect(r.state.rank).toBe("commander");
    expect(r.state.squad).toHaveLength(5);
    expect(canPromote(r.state, facts({ act: 3 })).next).toBeNull();
  });
});

describe("rank effects", () => {
  it("keeps heat down only while in favour, and allies only if loyal", () => {
    const s = at({ rank: "captain", favour: 50, squad: [{ name: "a", loyalty: 80 }, { name: "b", loyalty: 10 }] });
    const e = effectsOf(s);
    expect(e.heatPerNight).toBe(-2);
    expect(e.squadAllies).toBe(1);
    expect(effectsOf({ ...s, favour: 5 }).heatPerNight).toBe(0);
  });

  it("only the Commander sets the rules", () => {
    expect(setRules(at({ rank: "captain" }), "fair").ok).toBe(false);
    expect(setRules(at({ rank: "commander" }), "harsh").state.rules).toBe("harsh");
  });
});

describe("the drill", () => {
  it("scores timings", () => {
    const perfect = drill([0, 10, -40, 50]);
    expect(perfect.score).toBe(100);
    expect(perfect.passed).toBe(true);
    expect(perfect.xp).toBe(10 + 4 + 5);
    const mixed = drill([0, 100, 200, null]);
    expect([mixed.perfect, mixed.good, mixed.ok, mixed.miss]).toEqual([1, 1, 1, 1]);
    expect(mixed.score).toBe(48);
    expect(mixed.passed).toBe(false);
    expect(drill([]).score).toBe(0);
  });

  it("Hikari's teaching widens the windows", () => {
    expect(drill([58]).perfect).toBe(0);
    expect(drill([58], { hikari: true }).perfect).toBe(1);
  });

  it("keeps her best and lifts the squad on a pass", () => {
    const s = at({ drillBest: 80, squad: [{ name: "a", loyalty: 10 }] });
    const after = recordDrill(s, drill([0, 0]));
    expect(after.drillBest).toBe(100);
    expect(after.squad[0].loyalty).toBe(12);
    expect(recordDrill(s, drill([null])).drillBest).toBe(80);
  });
});

describe("patrols", () => {
  it("opens harder patrols with rank", () => {
    expect(patrolEvents("volunteer").map((e) => e.id)).not.toContain("escort");
    expect(patrolEvents("knight").map((e) => e.id)).toContain("cart");
    expect(patrolEvents("commander")).toHaveLength(PATROL_EVENTS.length);
  });

  it("rolls a choice, or takes the brawl's outcome", () => {
    const thief = PATROL_EVENTS.find((e) => e.id === "thief")!;
    expect(resolvePatrol(thief, "chase", "volunteer", always).ok).toBe(true);
    expect(resolvePatrol(thief, "chase", "volunteer", never).ok).toBe(false);
    expect(resolvePatrol(thief, "warn", "volunteer", never).ok).toBe(true);
    expect(resolvePatrol(thief, "tackle", "volunteer", never, "won").ok).toBe(true);
    expect(resolvePatrol(thief, "tackle", "volunteer", always, "lost").ok).toBe(false);
    expect(() => resolvePatrol(thief, "nope", "volunteer", always)).toThrow();
  });

  it("counts the patrol and applies favour", () => {
    const thief = PATROL_EVENTS.find((e) => e.id === "thief")!;
    const s = recordPatrol(at(), resolvePatrol(thief, "chase", "volunteer", always));
    expect(s.patrols).toBe(1);
    expect(s.favour).toBe(13);
  });
});

describe("raids", () => {
  const squad = [
    { name: "a", loyalty: 50 },
    { name: "b", loyalty: 50 },
    { name: "c", loyalty: 50 },
  ];

  it("needs Captain (and Commander for the Baron's silver)", () => {
    expect(canRaid(at({ rank: "knight", squad }), "smugglers")).toBe(false);
    expect(canRaid(at({ rank: "captain", squad }), "smugglers")).toBe(true);
    expect(canRaid(at({ rank: "captain", squad }), "tollhouse")).toBe(false);
    expect(canRaid(at({ rank: "captain", squad: [] }), "smugglers")).toBe(false);
  });

  it("orders move the odds and the loyalty", () => {
    expect(raidOdds(squad, "smugglers", "charge")).toBeGreaterThan(raidOdds(squad, "smugglers", "hold"));
    expect(raidOdds(squad, "bandits")).toBeLessThan(raidOdds(squad, "smugglers"));
    const win = resolveRaid(squad, "smugglers", always, "charge");
    expect(win.ok).toBe(true);
    expect(win.squad[0].loyalty).toBe(58);
    expect(win.effects.flag).toBe("silasAngry");
    const loss = resolveRaid(squad, "smugglers", never, "charge");
    expect(loss.ok).toBe(false);
    expect(loss.squad[0].loyalty).toBe(38);
    const s = recordRaid(at({ rank: "captain", squad }), win);
    expect(s.raids).toBe(1);
    expect(s.squad[0].loyalty).toBe(58);
    expect(s.favour).toBe(16);
  });
});

describe("scandal", () => {
  it("is only talk once she's high enough", () => {
    const r = scandal(at({ rank: "knight", scandal: 25 }), "boldPost");
    expect(r.demoted).toBe(false);
    expect(r.points).toBe(5);
  });

  it("adds up and costs a rank at the limit", () => {
    let s = at({ rank: "squire", favour: 40 });
    let r = scandal(s, "boldPost");
    expect(r.demoted).toBe(false);
    s = scandal(r.state, "boldPost").state;
    expect(s.scandal).toBe(20);
    r = scandal(s, "boldPost");
    expect(r.state.scandal).toBe(0);
    expect(SCANDAL_LIMIT).toBe(30);
    expect(r.demoted).toBe(true);
    expect(r.to).toBe("volunteer");
    expect(r.state.favour).toBe(30);
  });

  it("hiding a deserter is never safe", () => {
    const r = scandal(at({ rank: "commander" }), "ashHidden");
    expect(r.demoted).toBe(true);
    expect(r.to).toBe("captain");
  });

  it("the Baron watches harder as she climbs, and talk fades", () => {
    expect(caughtChance("lanternNight", at({ rank: "commander" }))).toBeGreaterThan(caughtChance("lanternNight", at()));
    expect(fadeScandal(at({ scandal: 5 }), 2).scandal).toBe(1);
    expect(fadeScandal(at({ scandal: 5 }), 9).scandal).toBe(0);
  });
});

describe("Ash", () => {
  it("can be hunted by anyone, cleared only by a Captain with Rhea's doubts", () => {
    expect(ashChoice(at(), "hunt", facts()).effects.flag).toBe("ashCaught");
    expect(ashChoice(at(), "clear", facts({ rheaDoubts: true })).ok).toBe(false);
    expect(ashChoice(at({ rank: "captain" }), "clear", facts()).ok).toBe(false);
    expect(ashChoice(at({ rank: "captain" }), "clear", facts({ rheaDoubts: true })).effects.flag).toBe("ashCleared");
  });
});

describe("Reeve of Tarven", () => {
  it("is late game: a council seat, then the Baron's fall or the town vote", () => {
    expect(mayorEligible(at(), facts({ act: 2, councilSeat: true, baronFallen: true })).ok).toBe(false);
    expect(mayorEligible(at(), facts({ act: 3, councilSeat: true, baronFallen: true })).route).toBe("baronFell");
    const vote = facts({ act: 3, councilSeat: true, townVote: 0.45, respect: 60 });
    expect(mayorEligible(at(), vote).ok).toBe(false);
    expect(mayorEligible(at({ rank: "commander" }), vote).route).toBe("vote");
    expect(becomeReeve(at({ rank: "commander" }), vote).state.reeve).toBe(true);
  });

  it("counts a town vote from the blocs' moods", () => {
    expect(townVoteShare({})).toBeCloseTo(0.5);
    expect(townVoteShare({ farmers: 100 })).toBeCloseTo(0.65);
    expect(townVoteShare({}, "commander")).toBeCloseTo(0.6);
  });

  it("passes a law with the council's support, and the factions answer", () => {
    expect(passLaw(at(), "curfew", 2, 100).passed).toBe(false);
    const reeve = at({ reeve: true });
    expect(passLaw(reeve, "aleTax", 0, 100).passed).toBe(false);
    expect(lawCost(0, 2)).toEqual({ support: 80, gold: 100, favours: 2 });
    expect(passLaw(reeve, "freeUse", 2, 79).passed).toBe(false);
    const r = passLaw(reeve, "freeUse", 2, 80);
    expect(r.passed).toBe(true);
    expect(r.state.laws.freeUse).toBe(2);
    expect(r.gold).toBe(100);
    expect(r.factions.devotees).toBe(40);
    expect(r.factions.oden).toBe(-50);
    const back = passLaw(r.state, "freeUse", 0, 80);
    expect(back.factions.devotees).toBe(-40);
  });
});
