import { describe, expect, it } from "vitest";
import { BRAWL_SKILLS } from "../src/game/brawlskills";
import { noEffects } from "../src/game/passives";
import { hire, STAFF_ROSTER, type StaffJob } from "../src/game/staff";
import { BARMAID_PATIENCE, Tavern } from "../src/game/tavern";
import { EDICT_BRANCHES, EDICT_START_POINTS, edictState, TAVERN_RULES, TAVERN_RULE_BY_ID, type TavernRuleId } from "../src/game/tavernrules";

const SEATS = 11;

/** A tavern by day with gold and points to spare. */
function rich(): Tavern {
  const t = new Tavern(SEATS);
  t.phase = "day";
  t.gold = 1000;
  t.edictPoints = 100;
  return t;
}

describe("the edict tree", () => {
  it("has its own id for each edict, each on a branch, each doing something", () => {
    expect(new Set(TAVERN_RULES.map((r) => r.id)).size).toBe(TAVERN_RULES.length);
    const branches = new Set(EDICT_BRANCHES.map((b) => b.id));
    const none = JSON.stringify(noEffects());
    for (const rule of TAVERN_RULES) {
      expect(branches.has(rule.branch), rule.id).toBe(true);
      const e = noEffects();
      rule.effect?.(e);
      // A Brawling edict does its work by teaching a move (brawlskills.ts), not through the effects.
      const teaches = BRAWL_SKILLS.some((skill) => "edict" in skill.learn && skill.learn.edict === rule.id);
      expect(JSON.stringify(e) !== none || rule.posts !== undefined || rule.staff !== undefined || teaches, rule.id).toBe(true);
    }
  });

  it("grows each edict from ones on its own branch, a tier up, and pairs every either/or both ways", () => {
    for (const rule of TAVERN_RULES) {
      for (const id of rule.requires ?? []) {
        const parent = TAVERN_RULE_BY_ID.get(id)!;
        expect(parent, `${rule.id} needs ${id}`).toBeDefined();
        expect(parent.branch, rule.id).toBe(rule.branch);
        expect(parent.tier, rule.id).toBeLessThan(rule.tier);
      }
      for (const id of rule.excludes ?? []) expect(TAVERN_RULE_BY_ID.get(id)?.excludes, `${rule.id} / ${id}`).toContain(rule.id);
      if (rule.tier === 1) expect(rule.requires, rule.id).toBeUndefined();
    }
  });

  it("costs edict points, gold and any corruption once, and is enacted for good", () => {
    const t = rich();
    const corruption = t.corruption;
    t.enact("sergeant");
    expect(t.rules.has("sergeant")).toBe(true);
    expect(t.gold).toBe(1000 - TAVERN_RULE_BY_ID.get("sergeant")!.cost);
    expect(t.edictPoints).toBe(100 - TAVERN_RULE_BY_ID.get("sergeant")!.points);
    expect(t.corruption).toBe(corruption + 10);
    expect(t.canEnact("sergeant")).toBe(false);
  });

  it("needs the edict above it, the points, the gold, and the day", () => {
    const t = rich();
    expect(t.canEnact("backRoom")).toBe(false);
    t.enact("shorterApron");
    expect(t.canEnact("backRoom")).toBe(true);
    t.edictPoints = 0;
    expect(t.canEnact("backRoom")).toBe(false);
    t.edictPoints = 100;
    t.gold = 0;
    expect(t.canEnact("backRoom")).toBe(false);
    t.gold = 100;
    t.phase = "service";
    expect(t.canEnact("backRoom")).toBe(false);
  });

  it("locks out the other side of an either/or", () => {
    const t = rich();
    t.enact("handsOff");
    expect(edictState(TAVERN_RULE_BY_ID.get("shorterApron")!, t.rules)).toBe("excluded");
    expect(t.canEnact("shorterApron")).toBe(false);
    expect(t.effects.reach).toBeCloseTo(-0.3);
  });

  it("makes her lewder for good with the Shorter Apron", () => {
    const t = rich();
    const lewd = t.lewdness;
    t.enact("shorterApron");
    expect(t.lewdness).toBe(lewd + 5);
  });

  it("charges upkeep every night", () => {
    const t = rich();
    t.enact("bouncer");
    const gold = t.gold;
    t.phase = "bedtime";
    t.sleep();
    expect(t.gold).toBe(gold - 4);
  });

  it("starts her with a few points, and gives one each morning", () => {
    const t = new Tavern(SEATS);
    expect(t.edictPoints).toBe(EDICT_START_POINTS);
    t.phase = "dawn";
    t.nextNight();
    expect(t.edictPoints).toBe(EDICT_START_POINTS + 1);
  });

  it("is kept in a save with the points left, and an old save keeps the rules it had on", () => {
    const t = rich();
    t.enact("waterAle");
    t.edictPoints = 7;
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect([...loaded.rules]).toEqual(["waterAle"]);
    expect(loaded.edictPoints).toBe(7);
    expect(loaded.effects.payPct).toBeCloseTo(0.1);

    const old = t.snapshot();
    old.progress = { ...old.progress!, rulesAdopted: ["waterAle", "bouncer"], rules: ["waterAle"] };
    delete old.progress.edictPoints;
    const older = new Tavern(SEATS);
    older.restore(old);
    expect([...older.rules]).toEqual(["waterAle"]);
    expect(older.edictPoints).toBe(EDICT_START_POINTS);
  });
});

describe("staff posts", () => {
  /** The first on the roster with this job. */
  const firstOf = (job: StaffJob) => STAFF_ROSTER.find((def) => def.job === job)!.id;
  /** A tavern by day with a barmaid and a cook on her books. */
  function staffed(): Tavern {
    const t = rich();
    t.staff = [hire(firstOf("barmaid")), hire(firstOf("cook"))];
    return t;
  }

  it("puts each one on their own job's post to start", () => {
    const t = staffed();
    const [barmaid, cook] = t.staff;
    expect(t.postOf(barmaid)).toBe("barmaid");
    expect(t.postOf(cook)).toBe("cook");
    expect(t.staffOnPost("barmaid")).toBe(1);
  });

  it("takes one to a post until it's full, and more once an edict opens another place", () => {
    const t = staffed();
    const [, cook] = t.staff;
    expect(t.setPost(cook.id, "barmaid")).toBe(false);
    t.enact("secondBar");
    expect(t.postSlots("barmaid")).toBe(2);
    expect(t.setPost(cook.id, "barmaid")).toBe(true);
    expect(t.staffOnPost("barmaid")).toBe(2);
    expect(t.staffWorking("cook")).toBe(false);
  });

  it("rests one: they're off tonight and their help goes with them", () => {
    const t = staffed();
    const [barmaid] = t.staff;
    expect(t.setPost(barmaid.id, "rest")).toBe(true);
    expect(t.postOf(barmaid)).toBeNull();
    expect(t.staffWorking("barmaid")).toBe(false);
    const resting = t.effects.patience;
    expect(t.setPost(barmaid.id, "barmaid")).toBe(true);
    expect(t.effects.patience - resting).toBeCloseTo(BARMAID_PATIENCE);
  });

  it("can't move anyone while the tavern's open", () => {
    const t = staffed();
    t.phase = "service";
    expect(t.setPost(t.staff[0].id, "rest")).toBe(false);
  });

  it("keeps their post in a save", () => {
    const t = staffed();
    t.setPost(t.staff[1].id, "rest");
    const loaded = new Tavern(SEATS);
    loaded.restore(t.snapshot());
    expect(loaded.postOf(loaded.staff[1])).toBeNull();
    expect(loaded.postOf(loaded.staff[0])).toBe("barmaid");
  });

  it("grudges working someone else's job, unless she's cross-trained them", () => {
    /** The cook's loyalty after a night on the bar, with these edicts. */
    const nightOnTheBar = (edicts: TavernRuleId[]) => {
      const t = staffed();
      for (const id of edicts) t.enact(id);
      const cook = t.staff[1];
      t.setPost(cook.id, "barmaid");
      t.phase = "bedtime";
      t.sleep();
      return t.staff.find((m) => m.id === cook.id)!.loyalty;
    };
    const untrained = nightOnTheBar(["secondBar"]);
    const trained = nightOnTheBar(["secondBar", "staffMeals", "crossTraining"]);
    // Meals add one, and no grudge takes one: two better off, from the same start.
    expect(trained - untrained).toBe(2);
  });
});
