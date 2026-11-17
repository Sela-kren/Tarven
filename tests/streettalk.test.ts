import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { HER_ID, StreetTalk, TOWNSFOLK_ID, type TalkPerson } from "../src/game/streettalk";
import { blankTownFacts, type TownFacts, type Townsperson } from "../src/game/towntalk";

/** A steady random so the tests don't flicker. */
function seeded(seed = 7): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const who = (index: number): Townsperson => ({ kind: index % 2 ? "farmer" : "soldier", female: index % 3 === 1 });
const person = (index: number, x: number, z: number, activity = -1, state: TalkPerson["state"] = "doing"): TalkPerson => ({
  index,
  position: new Vector3(x, 0, z),
  visible: true,
  state,
  activity,
});

describe("street talk", () => {
  it("has someone near her call out as she passes, and never two passing lines at once", () => {
    const thoughts: string[] = [];
    const talk = new StreetTalk(who, [], (t) => thoughts.push(t), seeded());
    const people = [person(0, 1, 0), person(1, -1, 0), person(2, 30, 0)];
    const facts = blankTownFacts();
    let said = 0;
    for (let i = 0; i < 600; i++) {
      talk.update(0.1, people, { x: 0, z: 0 }, facts);
      const up = talk.speakers(people, new Vector3()).filter((s) => s.id !== HER_ID);
      expect(up.length).toBeLessThanOrEqual(1);
      expect(up.some((s) => s.id === TOWNSFOLK_ID + 2)).toBe(false);
      if (up.length) said++;
    }
    expect(said).toBeGreaterThan(0);
  });

  it("answers when she stops someone to talk", () => {
    const talk = new StreetTalk(who, [], () => undefined, seeded(3));
    const people = [person(4, 1, 0)];
    expect(talk.talkTo(4, blankTownFacts())).toBe(true);
    expect(talk.speakers(people, new Vector3()).map((s) => s.id)).toContain(TOWNSFOLK_ID + 4);
    // Mid-line, they can't be started again.
    expect(talk.talkTo(4, blankTownFacts())).toBe(false);
  });

  it("lets two townsfolk at a chat pair talk, a line at a time, hushed when she's far", () => {
    const talk = new StreetTalk(who, [[0, 1]], () => undefined, seeded(11));
    const people = [person(0, 20, 0, 0), person(1, 20.8, 0, 1)];
    const facts = blankTownFacts();
    let both = false;
    let spoke = 0;
    for (let i = 0; i < 400; i++) {
      talk.update(0.1, people, { x: 0, z: 0 }, facts);
      const up = talk.speakers(people, new Vector3());
      if (up.length > 1) both = true;
      if (up.length) spoke++;
      for (const s of up) if (s.said.aboutYou) expect(s.hushed).toBe(true);
    }
    expect(spoke).toBeGreaterThan(0);
    expect(both).toBe(false);
  });
});

describe("street talk: heat moments and acts", () => {
  const hot = {
    ...blankTownFacts(),
    arc: "known" as const,
    lewdness: 130,
    desire: 100,
    lust: 9,
    flirt: 8,
    willpower: 0.05,
    drunk: 0.5,
    passives: new Set(["aching", "alwaysWanting", "insatiable"]),
  };

  /** Stops one person to talk, again and again, letting each talk play out; returns the heat moments reported. */
  function talkMany(facts: TownFacts, times: number, seed: number): { moments: number; herBubbles: number; thoughts: number } {
    const thoughts: string[] = [];
    const talk = new StreetTalk(who, [], (t) => thoughts.push(t), seeded(seed));
    let moments = 0;
    talk.onHeat = (moment, index) => {
      moments++;
      expect(index).toBe(4);
      expect(["resisted", "gaveIn"]).toContain(moment.outcome);
    };
    const people = [person(4, 1, 0)];
    let herBubbles = 0;
    for (let n = 0; n < times; n++) {
      talk.talkTo(4, facts);
      for (let i = 0; i < 400; i++) {
        talk.update(0.1, [], { x: 0, z: 0 }, facts);
        if (talk.speakers(people, new Vector3()).some((s) => s.id === HER_ID)) herBubbles++;
      }
    }
    return { moments, herBubbles, thoughts: thoughts.length };
  }

  it("lets her heat take over a talk when she's hot, and reports how it ended", () => {
    const { moments, herBubbles } = talkMany(hot, 30, 5);
    expect(moments).toBeGreaterThan(8);
    expect(herBubbles).toBeGreaterThan(0);
  });

  it("never when she's cool-headed", () => {
    expect(talkMany(blankTownFacts(), 15, 6).moments).toBe(0);
  });

  it("hands acts to the game, and a hand only lands with the switch off", () => {
    const property = { ...blankTownFacts(), arc: "known" as const, lewdness: 130, passives: new Set(["openHouse"]) };
    const run = (consentOff: boolean) => {
      const talk = new StreetTalk(who, [], () => undefined, seeded(consentOff ? 8 : 9));
      const acts: string[] = [];
      talk.onAct = (_, act, answer) => {
        acts.push(act);
        if (answer !== null) expect(["yes", "no"]).toContain(answer);
      };
      const people = [person(0, 1, 0), person(1, -1, 0), person(2, 0, 1)];
      for (let i = 0; i < 6000; i++) talk.update(0.1, people, { x: 0, z: 0 }, { ...property, consentOff });
      return acts;
    };
    const on = run(false);
    expect(on.length).toBeGreaterThan(0);
    expect(on).not.toContain("grope");
    expect(run(true)).toContain("grope");
  });
});
