import { describe, expect, it } from "vitest";
import { Tavern } from "../src/game/tavern";
import { JOIN_FANS } from "../src/game/guild";

/** A seeded roll (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function member(): Tavern {
  const t = new Tavern(11);
  t.random = seeded(7);
  t.fans = JOIN_FANS;
  expect(t.joinGuild()).toBe(true);
  return t;
}

describe("joining", () => {
  it("opens at 300 fans", () => {
    const t = new Tavern(11);
    expect(t.guildOpen).toBe(false);
    expect(t.joinGuild()).toBe(false);
    t.fans = JOIN_FANS;
    expect(t.joinGuild()).toBe(true);
    expect(t.guild!.rank).toBe("F");
    expect(t.records.guildRankBest).toBe(1);
  });
});

describe("an expedition", () => {
  it("applies gold, points, fans and the quest count, once a day", () => {
    const t = member();
    t.gold = 50;
    const board = t.guildQuests();
    expect(board.length).toBeGreaterThan(0);
    const quest = board.find((q) => q.rank === "F") ?? board[0];
    const fans = t.errandFans;
    const res = t.guildRun(quest.id)!;
    expect(res).not.toBeNull();
    expect(t.gold).toBe(Math.max(0, 50 + res.gold));
    expect(t.guild!.points).toBe(Math.max(0, res.points));
    expect(t.errandFans).toBe(fans + res.fans);
    expect(t.records.questsDone + t.records.questsFailed).toBe(1);
    expect(res.outcome === "fail" ? t.guild!.failed : t.guild!.quests).toBe(1);
    expect(t.guildBlocked(board[1]?.id ?? quest.id)).not.toBeNull();
    expect(t.guildRun(quest.id)).toBeNull();
  });

  it("takes a hired hand along for one quest only", () => {
    const t = member();
    expect(t.guildHire("fighter")).toBe(true);
    // F rank takes one companion.
    expect(t.guildHire("healer")).toBe(false);
    const quest = t.guildQuests()[0];
    t.guildRun(quest.id);
    expect(t.guild!.party).toEqual([]);
  });

  it("an injury takes levels off her stat until it heals", () => {
    const t = member();
    const strength = t.level("strength");
    t.guild!.injuries.push({ who: "her", id: "ribs", days: 1 });
    const save = JSON.parse(JSON.stringify(t.snapshot()));
    const back = new Tavern(11);
    back.restore(save);
    expect(back.level("endurance")).toBe(t.level("endurance") - 2);
    expect(back.level("strength")).toBe(strength);
    back.phase = "dawn";
    back.nextNight();
    expect(back.guild!.injuries).toEqual([]);
    expect(back.level("endurance")).toBe(t.level("endurance"));
  });
});

describe("ranks", () => {
  it("ranks up on points and quests", () => {
    const t = member();
    expect(t.guildPromote()).toBe(false);
    expect(t.guildMissing().length).toBeGreaterThan(0);
    t.guild!.points = 100;
    t.guild!.quests = 3;
    expect(t.guildPromote()).toBe(true);
    expect(t.guild!.rank).toBe("E");
    expect(t.records.guildRankBest).toBe(2);
  });

  it("needs the counter and A rank before she can run the hall", () => {
    const t = member();
    expect(t.guildMasterCheck().ok).toBe(false);
    t.gold = 200;
    expect(t.buildGuildCounter()).toBe(false);
    Object.assign(t.guild!, { rank: "A", points: 4000, quests: 50 });
    expect(t.buildGuildCounter()).toBe(true);
    expect(t.guildMasterCheck().ok).toBe(true);
    expect(t.becomeGuildMaster()).toBe(true);
    expect(t.runGuildHall()).not.toBeNull();
    expect(t.runGuildHall()).toBeNull();
  });
});

describe("saving the guild", () => {
  it("round-trips her card, party and today's board", () => {
    const t = member();
    t.guildHire("scout");
    t.guildQuests();
    t.guild!.points = 42;
    const save = JSON.parse(JSON.stringify(t.snapshot()));
    const back = new Tavern(11);
    back.restore(save);
    expect(back.guild).toEqual(t.guild);
    expect(back.guildBoard).toEqual(t.guildBoard);
    expect(back.guildBoardDay).toBe(t.guildBoardDay);
  });

  it("loads an older save with no guild", () => {
    const back = new Tavern(11);
    back.restore(new Tavern(11).snapshot());
    expect(back.guild).toBeNull();
  });
});
