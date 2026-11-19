import { describe, expect, it } from "vitest";
import { JOIN_FANS, QUEST_BY_ID, QUEST_TEMPLATES, questEncounters } from "../src/game/guild";
import { brawlLabel, fieldRng, fieldSeed, killXp, monstersFor, planField, shapeOf, walkDistance } from "../src/game/questfield";
import type { MonsterSpec } from "../src/game/questfield";
import { Tavern } from "../src/game/tavern";

const inside = (r: { minX: number; maxX: number; minZ: number; maxZ: number }, p: { x: number; z: number }) =>
  p.x > r.minX && p.x < r.maxX && p.z > r.minZ && p.z < r.maxZ;

describe("monsters", () => {
  it("reads the shape off the foe's name", () => {
    expect(shapeOf("cellar rats")).toBe("rat");
    expect(shapeOf("the rat king")).toBe("rat");
    expect(shapeOf("Old Tusker")).toBe("boar");
    expect(shapeOf("frost wolves")).toBe("wolf");
    expect(shapeOf("a young giant spider")).toBe("spider");
    expect(shapeOf("the snow troll")).toBe("troll");
    expect(shapeOf("the Warden")).toBe("guardian");
    expect(shapeOf("the keepers")).toBe("ghoul");
  });

  it("comes as a swarm for a plural foe, alone for a boss, and tougher as the boss", () => {
    const rats = monstersFor({ foe: "cellar rats", power: 5 }, () => 0.9);
    expect(rats.length).toBeGreaterThanOrEqual(4);
    expect(rats[0].name).toBe("a cellar rat");
    const king = monstersFor({ foe: "the rat king", power: 8, boss: true }, () => 0.9);
    expect(king).toHaveLength(1);
    expect(king[0].boss).toBe(true);
    expect(king[0].fight.stamina).toBeGreaterThan(rats[0].fight.stamina * 2);
    expect(brawlLabel(king[0])).toBe("rat king");
    expect(monstersFor({ foe: "frost wolves", power: 15 }, () => 0.1)[0].tint).toBeDefined();
  });

  it("brawls with a tavern brawler's numbers, tougher as the fight's power grows, and pays experience", () => {
    const troll = monstersFor({ foe: "the snow troll", power: 45, boss: true }, () => 0.5)[0];
    const wolf = monstersFor({ foe: "the white wolf", power: 19, boss: true }, () => 0.5)[0];
    for (const m of [troll, wolf]) {
      expect(m.fight.stamina).toBeGreaterThan(10);
      expect(m.fight.stamina).toBeLessThanOrEqual(90);
      expect(m.fight.accuracy).toBeGreaterThan(0.4);
      expect(m.fight.accuracy).toBeLessThanOrEqual(0.9);
    }
    expect(troll.fight.attack).toBeGreaterThan(wolf.fight.attack);
    expect(killXp({ xp: 6 })).toEqual({ strength: 6, agility: 3 });
  });
});

describe("the map", () => {
  it("lays out every quest: a clearing per encounter, all on walkable ground, joined by the path", () => {
    for (const quest of QUEST_TEMPLATES) {
      for (const seed of [1, 2, 3]) {
        const rng = fieldRng(seed);
        const { encounters } = questEncounters(quest, rng);
        const plan = planField(quest, encounters, rng);
        expect(plan.clearings).toHaveLength(encounters.length + 1);
        expect(plan.spawns).toHaveLength(encounters.length);
        const points = [plan.start, plan.exit, ...plan.spawns.map((s) => s.at), ...plan.spawns.flatMap((s) => (s.kind === "monsters" ? s.monsters.map((m) => m.at) : []))];
        for (const p of points) {
          expect(walkDistance(plan, p)).toBeLessThan(0);
          expect(plan.blocked.some((r) => inside(r, p))).toBe(false);
        }
        // The path between clearings is open the whole way.
        for (let i = 1; i < plan.clearings.length; i++) {
          const a = plan.clearings[i - 1];
          const b = plan.clearings[i];
          for (let t = 0; t <= 1; t += 0.05) {
            const p = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
            expect(plan.blocked.some((r) => inside(r, p))).toBe(false);
          }
        }
        expect(plan.props.length).toBeGreaterThan(20);
      }
    }
  });

  it("puts monsters where beasts are fought, and people to brawl where people are", () => {
    const rng = fieldRng(5);
    const rats = QUEST_BY_ID.rats_bell;
    const plan = planField(rats, rats.encounters, rng);
    expect(plan.spawns.map((s) => s.kind)).toEqual(["spot", "monsters", "monsters"]);
    expect(plan.theme).toBe("alleys");
    const outriders = QUEST_BY_ID.outriders;
    expect(planField(outriders, outriders.encounters, fieldRng(5)).spawns.map((s) => s.kind)).toEqual(["spot", "people", "people"]);
  });

  it("is the same map for the same quest and day", () => {
    const q = QUEST_BY_ID.frost_wolves;
    const a = planField(q, q.encounters, fieldRng(fieldSeed(q.id, 4)));
    const b = planField(q, q.encounters, fieldRng(fieldSeed(q.id, 4)));
    expect(a).toEqual(b);
    expect(planField(q, q.encounters, fieldRng(fieldSeed(q.id, 5)))).not.toEqual(a);
  });
});

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
  t.guildQuests();
  t.guildBoard = ["rats_bell", "moonwort"];
  return t;
}

describe("a quest walked", () => {
  it("is accepted off the board, one at a time, and can be given back", () => {
    const t = member();
    expect(t.guildAccept("rats_bell")).toBe(true);
    expect(t.acceptedQuest?.id).toBe("rats_bell");
    expect(t.guildAcceptBlocked("moonwort")).toBe("you've a quest already");
    expect(t.guildGiveUp()).toBe(true);
    expect(t.acceptedQuest).toBeNull();
    expect(t.guildAccept("moonwort")).toBe(true);
  });

  /** Plays a brawl out, KP-style, the way the tourney's test does. */
  function brawl(t: Tavern): "won" | "lost" | "talked" {
    for (let i = 0; i < 200 && t.fight; i++) {
      const canThrow = t.fight.choices().find((c) => c.move === "throw")?.disabled === false;
      t.fightMove(t.fight.downed ? "stayDown" : canThrow ? "throw" : "strike");
    }
    expect(t.fight).toBeNull();
    return t.takeFightResult()!.outcome;
  }

  it("brawls the monsters on the brawl screen, levels her up for them, and pays out when it's all done", () => {
    const t = member();
    t.gold = 20;
    t.guildAccept("rats_bell");
    const run = t.guildSetOut()!;
    expect(run).not.toBeNull();
    expect(t.guildQuestToday).toBe(true);
    const strength = t.level("strength");
    t.questDecide(0);
    const outcomes: string[] = [];
    run.plan.spawns.forEach((s) => {
      if (s.kind !== "monsters") return;
      const pack: MonsterSpec[] = s.monsters.map((m) => m.spec);
      expect(t.questMonsterBrawl(s.encounter, pack)).toBe(true);
      // The brawl is the taproom's, under the monster's own name and numbers.
      expect(t.fight!.name).toContain(brawlLabel(pack[0]));
      outcomes.push(brawl(t));
      expect(run.results[s.encounter]?.passed).toBe(outcomes[outcomes.length - 1] !== "lost");
    });
    expect(t.questAllDone).toBe(true);
    if (outcomes.includes("won")) expect(t.level("strength")).toBeGreaterThan(strength);
    const res = t.questFinish()!;
    expect(res.outcome).toBe(outcomes.every((o) => o !== "lost") ? "success" : outcomes[outcomes.length - 1] === "lost" ? "fail" : res.outcome);
    expect(t.guild!.accepted).toBeNull();
    expect(t.questRun).toBeNull();
  });

  it("fails if she heads home before the last stand", () => {

    const u = member();
    u.guildAccept("moonwort");
    u.guildSetOut();
    expect(u.questFinish()!.outcome).toBe("fail");
    expect(u.guild!.failed).toBe(1);
  });

  it("losing to people on the road brings the sex fight, as a lost taproom brawl does (never monsters)", () => {
    const t = member();
    t.playerBody = "Female";
    t.guildBoard.push("outriders");
    t.guildAccept("outriders");
    t.guild!.rank = "C";
    const run = t.guildSetOut()!;
    t.questDecide(0);
    expect(t.questBrawl(1)).toBe(true);
    expect(t.fight!.name).toContain("bandit guards");
    // Her legs give out on the first blow.
    t.fight!.stamina = 1;
    for (let i = 0; i < 200 && t.fight; i++) t.fightMove(t.fight.downed ? "stayDown" : "strike");
    const outcome = t.takeFightResult()!.outcome;
    expect(outcome).toBe("lost");
    expect(run.results[1]?.passed).toBe(false);
    expect(t.brawlOffer?.kind).toBe("bandit");
    expect(t.brawlPlaces().map((p) => p.id)).toEqual(["here", "yard"]);
    // After the scene, the quest's over: home to Tarven, failed, without the loot.
    expect(run.collapsed).toBe(true);
    t.declineBrawlOffer();
    const res = t.questFinish()!;
    expect(res.outcome).toBe("fail");
    expect(res.captured?.by).toBe("bandit guards");
    expect(res.loot).toEqual([]);

    // Beasts never: a lost monster brawl brings no offer.
    const u = member();
    u.playerBody = "Female";
    u.guildAccept("rats_bell");
    const r = u.guildSetOut()!;
    const spawn = r.plan.spawns.find((s) => s.kind === "monsters")!;
    expect(u.questMonsterBrawl(spawn.encounter, spawn.kind === "monsters" ? spawn.monsters.map((m) => m.spec) : [])).toBe(true);
    u.fight!.stamina = 1;
    for (let i = 0; i < 200 && u.fight; i++) u.fightMove(u.fight.downed ? "stayDown" : "strike");
    expect(u.takeFightResult()!.outcome).toBe("lost");
    expect(u.brawlOffer).toBeNull();
    expect(u.duel).toBeNull();
    expect(r.collapsed).toBe(true);
    expect(u.questFinish()!.outcome).toBe("fail");
  });

  it("with Consent off, a loss to people is KP's defeat on the spot", () => {
    const t = member();
    t.playerBody = "Female";
    t.touchSettings.autoTouch = true;
    t.touchSettings.agreed = true;
    t.guildBoard.push("outriders");
    t.guild!.rank = "C";
    t.guildAccept("outriders");
    t.guildSetOut();
    t.questDecide(0);
    expect(t.questBrawl(1)).toBe(true);
    t.fight!.stamina = 1;
    for (let i = 0; i < 200 && t.fight; i++) t.fightMove(t.fight.downed ? "stayDown" : "strike");
    expect(t.takeFightResult()!.outcome).toBe("lost");
    expect(t.duel).not.toBeNull();
  });

  it("keeps the accepted quest in a save", () => {
    const t = member();
    t.guildAccept("rats_bell");
    const u = new Tavern(11);
    u.restore(t.snapshot());
    expect(u.guild!.accepted).toBe("rats_bell");
  });
});
