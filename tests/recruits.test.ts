import { describe, expect, it } from "vitest";
import {
  churchDay,
  DEVOTEE_FANS,
  helpRecruit,
  newRecruit,
  readRecruits,
  RECRUIT_IDS,
  RECRUITS,
  VISITS_PER_STAGE,
  warnRecruit,
  type RecruitState,
} from "../src/game/recruits";
import { LOOK_OPTIONS } from "../src/game/appearance";
import { TOWN_PLACES } from "../src/game/townplaces";
import { Tavern } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];

function day(): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.crowdRandom = null;
  t.random = () => 0.5;
  t.gold = 100;
  return t;
}

/** The tavern's dawn for the recruits alone. */
const dawn = (t: Tavern) => (t as unknown as { recruitsDawn(): void }).recruitsDawn();

describe("the Warm House's recruits (TOWN_DAY.md step 6)", () => {
  it("are three adults, one of each kind of frustration, each a person of their own", () => {
    const looks = new Set<number>();
    for (const id of RECRUIT_IDS) {
      const r = RECRUITS[id];
      expect(r.age, id).toBeGreaterThanOrEqual(18);
      expect(r.atBar[0], id).toContain(`(${r.age})`);
      looks.add(r.look);
      for (const outfit of r.outfits) {
        expect(LOOK_OPTIONS[r.female ? "Female" : "Male"].outfits.some((o) => o.id === outfit.id), `${id}: ${outfit.id}`).toBe(true);
      }
    }
    expect(looks.size).toBe(3);
    expect(new Set(RECRUIT_IDS.map((id) => RECRUITS[id].type)).size).toBe(3);
  });

  it("dress further along the hill at every stage", () => {
    for (const id of RECRUIT_IDS) {
      const [, one, two, three] = RECRUITS[id].outfits;
      expect(two.id === one.id && JSON.stringify(two.colors) === JSON.stringify(one.colors), id).toBe(false);
      expect(three.id === two.id && JSON.stringify(three.colors) === JSON.stringify(two.colors), id).toBe(false);
    }
  });

  it("go a stage further every few visits", () => {
    let state: RecruitState = newRecruit();
    for (let i = 0; i < VISITS_PER_STAGE - 1; i++) {
      const step = churchDay(state, 0, false);
      expect(step.stepped).toBe(false);
      state = step.state;
    }
    const step = churchDay(state, 0, false);
    expect(step.stepped).toBe(true);
    expect(step.state.stage).toBe(1);
    expect(step.state.visits).toBe(0);
  });

  it("don't go on a day the roll misses, and go far less once warned off", () => {
    expect(churchDay(newRecruit(), 0.99, false).state.visits).toBe(0);
    const warned = warnRecruit(newRecruit())!;
    expect(churchDay(warned, 0.1, false).state.visits).toBe(0);
    expect(churchDay(newRecruit(), 0.1, false).state.visits).toBe(1);
  });

  it("go tomorrow, counted double, when she puts in a word; and twice as fast with the chapel shut", () => {
    const helped = helpRecruit(warnRecruit(newRecruit())!)!;
    expect(helped.warned).toBe(false);
    const next = churchDay(helped, 0.99, false).state;
    expect(next.visits).toBe(2);
    expect(next.nudged).toBe(false);
    expect(churchDay(newRecruit(), 0, true).state.visits).toBe(2);
  });

  it("can't be helped or warned once committed, and don't come back down", () => {
    const committed = { ...newRecruit(), stage: 3 as const };
    expect(helpRecruit(committed)).toBeNull();
    expect(warnRecruit(committed)).toBeNull();
    expect(churchDay(committed, 0, true).state.stage).toBe(3);
  });

  it("are kept in the save", () => {
    const saved = JSON.parse(JSON.stringify({ hedda: { ...newRecruit(), stage: 2, helped: 1 } }));
    const back = readRecruits(saved);
    expect(back.hedda.stage).toBe(2);
    expect(back.hedda.helped).toBe(1);
    expect(back.tobin.stage).toBe(0);
    expect(readRecruits("nonsense").ilse.stage).toBe(0);
  });
});

describe("the recruits in the game", () => {
  it("are at the Warm House door, as far along as they've gone, with help and warn for each", () => {
    const t = day();
    const place = TOWN_PLACES.warmhouse;
    expect(place.describe(t.townState).join(" ")).toContain("Hedda Cooper");
    for (const id of RECRUIT_IDS) {
      expect(place.actions.some((a) => a.id === `help_${id}`)).toBe(true);
      expect(place.actions.some((a) => a.id === `warn_${id}`)).toBe(true);
    }
  });

  it("helping sends them up the hill tomorrow, and costs her a little Respect", () => {
    const t = day();
    const respect = t.persona.respect;
    t.doTownAction("warmhouse", "help_hedda");
    expect(t.recruits.hedda.nudged).toBe(true);
    expect(t.persona.respect).toBeLessThan(respect);
    dawn(t);
    expect(t.recruits.hedda.visits).toBe(2);
  });

  it("a stage made is a story card and the town's gossip at dawn", () => {
    const t = day();
    t.recruits.tobin = { ...newRecruit(), visits: VISITS_PER_STAGE - 1 };
    t.random = () => 0;
    dawn(t);
    expect(t.recruits.tobin.stage).toBe(1);
    expect(t.news.join(" ")).toContain("Tobin's first visit");
    expect(t.news.join(" ")).toContain("Tobin Marsh! At the Warm House!");
  });

  it("one she helped all the way brings her their fans", () => {
    const t = day();
    t.recruits.ilse = { ...newRecruit(), stage: 2, visits: VISITS_PER_STAGE - 1, helped: 1 };
    t.random = () => 0;
    const fans = t.errandFans;
    dawn(t);
    expect(t.recruits.ilse.stage).toBe(3);
    expect(t.errandFans - fans).toBe(DEVOTEE_FANS);
  });

  it("wear their stage's outfit when they come in", () => {
    const t = day();
    t.recruits.hedda.stage = 3;
    expect(t.recruitOutfitOf({ recruit: "hedda" })?.id).toBe("priestess");
    expect(t.recruitOutfitOf({})).toBeNull();
  });
});
