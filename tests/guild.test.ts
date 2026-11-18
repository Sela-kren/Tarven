import { describe, expect, it } from "vitest";
import {
  FRIEND_COMPANIONS,
  GUILD_RANKS,
  JOIN_FANS,
  LEAVE_LOYALTY,
  QUEST_BY_ID,
  QUEST_TEMPLATES,
  QUEST_TYPES,
  companionRefuses,
  fightChance,
  guildMasterEligible,
  hallDay,
  hireAdventurer,
  partyPower,
  partyProblem,
  promoteGuild,
  questBoard,
  rankIndex,
  runExpedition,
  type Companion,
  type HerOnQuest,
} from "../src/game/guild";

/** Low is lucky everywhere in guild.ts. */
const lucky = (): number => 0;
const unlucky = (): number => 0.99;
const middling = (): number => 0.5;
/** Rolls from a list, then lucky. */
const seq = (...rolls: number[]) => (): number => rolls.shift() ?? 0;

const level = (n: number): HerOnQuest["levels"] => ({ strength: n, agility: n, endurance: n, charm: n, mind: n });
const her = (n = 1, stamina = 30): HerOnQuest => ({ levels: level(n), stamina });

describe("guild ranks", () => {
  it("runs unranked, then F to S, with rising thresholds", () => {
    expect(GUILD_RANKS.map((r) => r.id)).toEqual(["unranked", "F", "E", "D", "C", "B", "A", "S"]);
    for (let i = 2; i < GUILD_RANKS.length; i++) expect(GUILD_RANKS[i].points).toBeGreaterThan(GUILD_RANKS[i - 1].points);
    expect(GUILD_RANKS.find((r) => r.id === "D")!.career).toBe("Hired blade");
    expect(GUILD_RANKS.find((r) => r.id === "C")!.career).toBe("Party leader");
  });

  it("joins at Kestrel's 300 fans, not before", () => {
    expect(promoteGuild(0, { rank: "unranked", quests: 0, brawlWins: 0, fans: JOIN_FANS - 1 }).promoted).toBe(false);
    expect(promoteGuild(0, { rank: "unranked", quests: 0, brawlWins: 0, fans: JOIN_FANS })).toEqual({ rank: "F", promoted: true, missing: [] });
  });

  it("climbs one rank at a time and says what's missing", () => {
    expect(promoteGuild(9999, { rank: "F", quests: 99, brawlWins: 99, fans: 9999 }).rank).toBe("E");
    const short = promoteGuild(50, { rank: "F", quests: 1, brawlWins: 0, fans: 300 });
    expect(short.promoted).toBe(false);
    expect(short.missing).toEqual(["50 more guild points", "2 more quests"]);
  });

  it("needs a legend's deed for S, and S is the top", () => {
    const facts = { rank: "A" as const, quests: 99, brawlWins: 99, fans: 9999 };
    expect(promoteGuild(9999, facts).missing).toEqual(["a legend's deed"]);
    expect(promoteGuild(9999, { ...facts, deed: true }).rank).toBe("S");
    expect(promoteGuild(99999, { ...facts, rank: "S", deed: true })).toEqual({ rank: "S", promoted: false, missing: [] });
  });
});

describe("guild master", () => {
  const ready = { rank: "A" as const, points: 4000, quests: 50, guildCounter: true, kestrelBacks: true };
  it("is open at A rank with the counter and Kestrel's word", () => {
    expect(guildMasterEligible(ready)).toEqual({ ok: true, missing: [] });
    expect(guildMasterEligible({ ...ready, rank: "S" }).ok).toBe(true);
  });
  it("lists every missing piece", () => {
    const r = guildMasterEligible({ rank: "B", points: 3000, quests: 50, guildCounter: false, kestrelBacks: false });
    expect(r.ok).toBe(false);
    expect(r.missing).toEqual(["A rank or higher", "1000 more guild points", "the guild counter in her tavern", "Kestrel's word with the lowland hall"]);
  });
  it("takes the cut of the day's quests and pays for recruiting", () => {
    expect(hallDay("fair", [100, 100], lucky)).toEqual({ gold: 20, mood: 0, recruits: 0 });
    expect(hallDay("steep", [100], lucky).gold).toBe(20);
    const drive = hallDay("low", [200], lucky, "poach");
    expect(drive.gold).toBe(10 - 60);
    expect(drive.recruits).toBe(4);
    expect(hallDay("low", [200], unlucky, "poach").recruits).toBe(2);
  });
});

describe("the quest board", () => {
  it("has enough quests across every type and rank", () => {
    expect(QUEST_TEMPLATES.length).toBeGreaterThanOrEqual(15);
    for (const t of QUEST_TYPES) expect(QUEST_TEMPLATES.some((q) => q.type === t)).toBe(true);
    for (const r of ["F", "E", "D", "C", "B", "A", "S"]) expect(QUEST_TEMPLATES.some((q) => q.rank === r)).toBe(true);
    expect(new Set(QUEST_TEMPLATES.map((q) => q.id)).size).toBe(QUEST_TEMPLATES.length);
    for (const q of QUEST_TEMPLATES) expect(q.encounters.length).toBeGreaterThan(0);
  });

  it("is shut to her without a card", () => {
    expect(questBoard("unranked", lucky)).toEqual([]);
  });

  it("shows her rank and below, and one above", () => {
    for (const rank of ["F", "D", "B"] as const) {
      const board = questBoard(rank, middling, { count: 99 });
      expect(board.length).toBeGreaterThan(0);
      for (const q of board) expect(rankIndex(q.rank)).toBeLessThanOrEqual(rankIndex(rank) + 1);
      expect(board.some((q) => rankIndex(q.rank) === rankIndex(rank) + 1)).toBe(true);
    }
    expect(questBoard("F", middling, { count: 99 }).every((q) => q.rank === "F" || q.rank === "E")).toBe(true);
    expect(questBoard("S", middling, { count: 99 }).length).toBe(QUEST_TEMPLATES.length);
  });

  it("shows at most five, and the bar's own board only bar quests", () => {
    expect(questBoard("S", middling).length).toBe(5);
    const bar = questBoard("S", middling, { atBar: true, count: 99 });
    expect(bar.length).toBeGreaterThan(0);
    expect(bar.every((q) => q.atBar)).toBe(true);
  });
});

describe("the party", () => {
  it("is limited by rank, with nobody twice", () => {
    const { hikari, sylvie, mirri, grukka } = FRIEND_COMPANIONS;
    expect(partyProblem("unranked", [])).not.toBeNull();
    expect(partyProblem("F", [hikari])).toBeNull();
    expect(partyProblem("F", [hikari, sylvie])).not.toBeNull();
    expect(partyProblem("C", [hikari, sylvie, mirri])).toBeNull();
    expect(partyProblem("S", [hikari, sylvie, mirri, grukka])).not.toBeNull();
    expect(partyProblem("C", [hikari, hikari])).toBe("Nobody goes twice.");
  });

  it("hires adventurers whose stats and fees grow with rank", () => {
    const low = hireAdventurer("fighter", "F", unlucky);
    const high = hireAdventurer("fighter", "A", unlucky);
    expect(low.friend).toBe(false);
    expect(high.power).toBeGreaterThan(low.power);
    expect(high.fee).toBeGreaterThan(low.fee);
    expect(hireAdventurer("healer", "C", lucky).role).toBe("healer");
  });

  it("Ash won't take garrison work", () => {
    expect(companionRefuses(FRIEND_COMPANIONS.ash, QUEST_BY_ID.smugglers)).not.toBeNull();
    expect(companionRefuses(FRIEND_COMPANIONS.ash, QUEST_BY_ID.boars)).toBeNull();
    expect(companionRefuses(FRIEND_COMPANIONS.grukka, QUEST_BY_ID.smugglers)).toBeNull();
  });
});

describe("expeditions", () => {
  it("a lucky run succeeds with full rewards, and fights are flagged for the brawl", () => {
    const r = runExpedition(QUEST_BY_ID.rats_bell, [], her(), lucky);
    expect(r.outcome).toBe("success");
    expect(r.gold).toBe(8);
    expect(r.points).toBe(10);
    expect(r.loot).toEqual(["rat tails (bounty)", "a cask Jory 'forgot'"]);
    expect(r.encounters).toHaveLength(3);
    const fights = r.encounters.filter((e) => e.kind === "fight");
    expect(fights.length).toBe(2);
    for (const f of fights) expect(f.useBrawl).toBe(true);
    expect(r.injuries).toEqual([]);
    expect(r.fans).toBeGreaterThan(0);
    expect(r.guestsTonight).toBeGreaterThan(0);
    expect(r.captured).toBeNull();
  });

  it("an unlucky run against monsters fails, costs points and hurts, but nobody's taken", () => {
    const r = runExpedition(QUEST_BY_ID.ruins_1, [], her(), unlucky);
    expect(r.outcome).toBe("fail");
    expect(r.gold).toBe(0);
    expect(r.points).toBeLessThan(0);
    expect(r.injuries.some((i) => i.who === "her")).toBe(true);
    expect(r.captured).toBeNull();
    expect(r.fans).toBe(0);
  });

  it("losing to people can end with her taken, and the loot gone", () => {
    const r = runExpedition(QUEST_BY_ID.outriders, [], her(), unlucky);
    expect(r.outcome).toBe("fail");
    expect(r.rival).toBe(true);
    expect(r.captured).toEqual({ by: "the outrider captain", brawlKind: "bandit" });
    expect(r.loot).toEqual([]);
    const boss = r.encounters[r.encounters.length - 1];
    expect(boss.brawlKind).toBe("bandit");
  });

  it("collapses when her stamina runs out, and the quest fails", () => {
    const r = runExpedition(QUEST_BY_ID.ruins_1, [], her(1, 3), lucky);
    expect(r.collapsed).toBe(true);
    expect(r.outcome).toBe("fail");
    expect(r.encounters.length).toBeLessThan(QUEST_BY_ID.ruins_1.encounters.length);
  });

  it("a partial run pays half", () => {
    // One failure is still a success, so take two: fail the lamp check (d10 of 1), lose to the rats (0.99, and the
    // injury rolls), then beat the king (0).
    const r = runExpedition(QUEST_BY_ID.rats_bell, [], her(1, 30), seq(0.95, 0.99, 0.99, 0.99, 0));
    expect(r.encounters.map((e) => e.passed)).toEqual([false, false, true]);
    expect(r.outcome).toBe("partial");
    expect(r.gold).toBe(4);
    expect(r.points).toBe(5);
  });

  it("takes the player's choice, or the first option", () => {
    const pay = runExpedition(QUEST_BY_ID.kevin_sword, [], her(), lucky, { choices: { deal: "pay" } });
    expect(pay.encounters[pay.encounters.length - 1].chose).toBe("pay");
    expect(pay.gold).toBe(12 - 10);
    const grab = runExpedition(QUEST_BY_ID.kevin_sword, [], her(), lucky, { choices: { deal: "grab" } });
    expect(grab.encounters[grab.encounters.length - 1].useBrawl).toBe(true);
    expect(grab.corruption).toBe(2);
    const plain = runExpedition(QUEST_BY_ID.kevin_sword, [], her(), lucky);
    expect(plain.encounters[plain.encounters.length - 1].chose).toBe("haggle");
  });
});

describe("party roles matter", () => {
  it("the right role passes a check she'd fail alone", () => {
    const alone = runExpedition(QUEST_BY_ID.moonwort, [], her(), middling);
    const withHealer = runExpedition(QUEST_BY_ID.moonwort, [FRIEND_COMPANIONS.sylvie], her(), middling);
    expect(alone.encounters[0].passed).toBe(false);
    expect(withHealer.encounters[0].passed).toBe(true);
    // The wrong role doesn't help.
    const withFighter = runExpedition(QUEST_BY_ID.moonwort, [FRIEND_COMPANIONS.grukka], her(), middling);
    expect(withFighter.encounters[0].passed).toBe(false);
  });

  it("fighters add full power, others half; mages double on the weak and halve in the ruins", () => {
    const lv = level(1);
    const alone = partyPower(lv, [], {}, "town");
    expect(partyPower(lv, [FRIEND_COMPANIONS.grukka], {}, "town")).toBe(alone + 9);
    expect(partyPower(lv, [FRIEND_COMPANIONS.sylvie], {}, "town")).toBe(alone + 1);
    expect(partyPower(lv, [FRIEND_COMPANIONS.mirri], {}, "town")).toBe(alone + 4);
    const snik = FRIEND_COMPANIONS.snik;
    expect(partyPower(lv, [snik], { weakTo: "magic" }, "town")).toBe(alone + 6);
    expect(partyPower(lv, [snik], { weakTo: "magic" }, "ruins")).toBe(alone + 3);
    expect(fightChance(100, 1)).toBe(0.95);
    expect(fightChance(1, 100)).toBe(0.05);
    expect(fightChance(10, 10)).toBe(0.5);
  });

  it("a fighter turns a lost fight into a won one", () => {
    // Boar (power 7) on the turnip run: she's power 6 alone (46%), with Grukka 15 (82%). Roll 0.6.
    const roll = (): number => 0.6;
    const alone = runExpedition(QUEST_BY_ID.turnips, [], her(), roll);
    const withGrukka = runExpedition(QUEST_BY_ID.turnips, [FRIEND_COMPANIONS.grukka], her(), roll);
    expect(alone.encounters[1].passed).toBe(false);
    expect(withGrukka.encounters[1].passed).toBe(true);
  });

  it("Hikari's luck rerolls the first failure", () => {
    const without = runExpedition(QUEST_BY_ID.gerald, [], her(), seq(0.95));
    const withHikari = runExpedition(QUEST_BY_ID.gerald, [FRIEND_COMPANIONS.hikari], her(), seq(0.95, 0));
    expect(without.encounters[0].passed).toBe(false);
    expect(withHikari.encounters[0].passed).toBe(true);
    expect(withHikari.encounters[0].lucky).toBe(true);
  });

  it("a healer shortens injuries and gives stamina back", () => {
    const hurt = runExpedition(QUEST_BY_ID.ruins_1, [], her(1, 60), unlucky);
    const healed = runExpedition(QUEST_BY_ID.ruins_1, [FRIEND_COMPANIONS.sylvie], her(1, 60), unlucky);
    const herHurt = hurt.injuries.filter((i) => i.who === "her");
    const herHealed = healed.injuries.filter((i) => i.who === "her");
    expect(herHurt.length).toBeGreaterThan(0);
    expect(herHealed.length).toBeGreaterThan(0);
    expect(herHealed[0].days).toBeLessThan(herHurt[0].days);
    expect(healed.staminaLeft).toBeGreaterThan(hurt.staminaLeft);
  });

  it("Mirri is never injured; Snik's songs bring fans", () => {
    const r = runExpedition(QUEST_BY_ID.boars, [FRIEND_COMPANIONS.mirri, FRIEND_COMPANIONS.grukka], her(1, 60), unlucky);
    expect(r.injuries.some((i) => i.who === "mirri")).toBe(false);
    expect(r.injuries.some((i) => i.who === "grukka")).toBe(true);
    const plain = runExpedition(QUEST_BY_ID.rats_bell, [], her(), lucky);
    const sung = runExpedition(QUEST_BY_ID.rats_bell, [FRIEND_COMPANIONS.snik], her(), lucky);
    expect(sung.fans).toBe(plain.fans + 5);
  });
});

describe("loyalty and fees", () => {
  it("success raises loyalty, failure and injury lower it, and low loyalty walks", () => {
    const ok = runExpedition(QUEST_BY_ID.rats_bell, [FRIEND_COMPANIONS.grukka], her(), lucky);
    expect(ok.loyalty.grukka).toBe(4);
    const shaky: Companion = { ...FRIEND_COMPANIONS.grukka, loyalty: LEAVE_LOYALTY + 2 };
    const bad = runExpedition(QUEST_BY_ID.ruins_1, [shaky], her(), unlucky);
    expect(bad.outcome).toBe("fail");
    expect(bad.loyalty.grukka).toBe(-5);
    expect(bad.leaves).toEqual(["grukka"]);
  });

  it("hired hands are paid out of the gold, win or lose", () => {
    const hand = hireAdventurer("fighter", "F", unlucky);
    const r = runExpedition(QUEST_BY_ID.rats_bell, [hand], her(), lucky);
    expect(r.fees).toBe(hand.fee);
    expect(r.gold).toBe(8 - hand.fee);
  });

  it("an S quest won is a legend's deed", () => {
    const r = runExpedition(QUEST_BY_ID.deep_vault, [FRIEND_COMPANIONS.hikari, FRIEND_COMPANIONS.sylvie, FRIEND_COMPANIONS.snik], her(10, 200), lucky);
    expect(r.outcome).toBe("success");
    expect(r.deed).toBe(true);
  });
});
