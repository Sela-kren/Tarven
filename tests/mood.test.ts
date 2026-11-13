import { defaultRole, ROLES } from "../src/game/guestroles";
import { describe, expect, it } from "vitest";
import { newPersona, type BanterContext, type Persona } from "../src/game/banter";
import { Chatter } from "../src/game/chatter";
import { arrivalFeelings, arrivalMood, feltMood, moodAfterDrink, moodAfterReply, moodWeights, moodWhenServed, moodWhileWaiting, type Mood } from "../src/game/mood";
import { FACE_TALK, HIGH_RESPECT_TALK, LOW_RESPECT_TALK } from "../src/game/facetalk";
import { ABOUT_YOU, LEERING_CALLS, SMUTTY_GOSSIP } from "../src/game/gossip";
import { CLASHES, DESIRE_TALKS, DESIRE_THANKS, MOOD_LINES, MOOD_TALKS } from "../src/game/moodtalk";
import { ANYONE, EXCHANGES, type Exchange } from "../src/game/tabletalk";
import type { Guest, GuestKind } from "../src/game/tavern";

const context = (changes: Partial<Persona> = {}, kind: GuestKind = "farmer", extra: Partial<BanterContext> = {}): BanterContext => ({
  body: "Male",
  persona: { ...newPersona(), ...changes },
  trust: 3,
  heat: 0,
  gold: 0,
  debt: 150,
  night: 0,
  drunk: 0,
  kind,
  ...extra,
});

const weight = (c: BanterContext, mood: Mood, filth = 0) => moodWeights(c, filth).find(([m]) => m === mood)![1];

const guest = (id: number, kind: GuestKind, mood: Mood): Guest => ({
  id,
  kind,
  role: defaultRole(kind),
  stats: ROLES[defaultRole(kind)],
  female: id % 2 === 0,
  look: 0,
  order: "ale",
  seat: id,
  status: "eating",
  patience: 50,
  maxPatience: 50,
  eatLeft: 1000,
  rumor: false,
  listened: 0,
  party: null,
  mood,
  lust: 0,
  desires: 0,
});

describe("the mood someone walks in with", () => {
  it("is calm on the lowest roll", () => {
    expect(arrivalMood(context(), 0, () => 0)).toBe("calm");
  });

  it("only turns to idolizing once you're well known", () => {
    expect(weight(context({ fame: 5 }), "idolize")).toBe(0);
    expect(weight(context({ fame: 40 }), "idolize")).toBeGreaterThan(weight(context({ fame: 20 }), "idolize"));
  });

  it("is more often lustful the flirtier your reputation", () => {
    expect(weight(context({ flirt: 8 }), "lust")).toBeGreaterThan(weight(context(), "lust"));
  });

  it("is angrier in a filthy room and for those you've betrayed", () => {
    expect(weight(context(), "angry", 1)).toBeGreaterThan(weight(context(), "angry", 0));
    expect(weight(context({ sold: 1 }), "angry")).toBeGreaterThan(weight(context(), "angry"));
  });

  it("depends on who they are", () => {
    expect(weight(context({}, "fugitive"), "scared")).toBeGreaterThan(weight(context({}, "soldier"), "scared"));
    expect(weight(context({}, "smuggler"), "scheming")).toBeGreaterThan(weight(context({}, "farmer"), "scheming"));
    expect(weight(context({}, "soldier"), "drunk")).toBeGreaterThan(weight(context({}, "farmer"), "drunk"));
  });
});

describe("lust and desires", () => {
  it("stay within limits for every kind, however flirty you are", () => {
    for (const kind of ["farmer", "soldier", "smuggler", "fugitive"] as GuestKind[]) {
      const most = arrivalFeelings(context({ flirt: 10 }, kind), () => 0.999);
      expect(most.lust).toBeLessThanOrEqual(10);
      expect(most.desires).toBeLessThanOrEqual(10);
      expect(most.desires).toBeGreaterThan(0);
    }
  });

  it("run higher in soldiers than fugitives, and higher with a flirty innkeeper", () => {
    const lustOf = (c: BanterContext) => arrivalFeelings(c, () => 0.999).lust;
    expect(lustOf(context({}, "soldier"))).toBeGreaterThan(lustOf(context({}, "fugitive")));
    expect(lustOf(context({ flirt: 10 }, "farmer"))).toBeGreaterThan(lustOf(context({}, "farmer")));
  });

  it("make someone with strong lust and no other mood come over lustful", () => {
    expect(feltMood({ mood: "calm", lust: 8 })).toBe("lust");
    expect(feltMood({ mood: "calm", lust: 2 })).toBe("calm");
    expect(feltMood({ mood: "angry", lust: 8 })).toBe("angry");
  });

  it("make a guest with strong longing say so when served", () => {
    const longing = { ...guest(1, "fugitive", "calm"), status: "waiting" as const, desires: 9 };
    const chatter = new Chatter(() => 0);
    chatter.update(0.1, [longing], [], () => false);
    longing.status = "eating" as never;
    chatter.update(0.1, [longing], [], () => false);
    expect(DESIRE_THANKS.fugitive).toContain(chatter.saying(1)?.text);
  });
});

describe("respect", () => {
  const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Opening lines only: short replies like "Why?" can turn up in any conversation.
  const smut = new Set(SMUTTY_GOSSIP.map((talk) => talk.lines[0]));
  const pair = () => [guest(1, "farmer", "calm"), guest(2, "soldier", "calm")];

  it("low brings smutty gossip, and normal respect never does", () => {
    const low = listen(new Chatter(seeded(13)), pair(), 300, context({ respect: -7 }));
    expect(low.some((said) => smut.has(said.text) && said.aboutYou)).toBe(true);
    const fine = listen(new Chatter(seeded(13)), pair(), 300, context());
    expect(fine.some((said) => smut.has(said.text))).toBe(false);
  });

  it("low draws more lust and fewer admirers", () => {
    const low = context({ respect: -6, fame: 40 });
    const fine = context({ fame: 40 });
    expect(weight(low, "lust")).toBeGreaterThan(weight(fine, "lust"));
    expect(weight(low, "idolize")).toBeLessThan(weight(fine, "idolize"));
  });

  it("low has guests leer when calling you over", () => {
    const waiting: Guest = { ...guest(1, "soldier", "calm"), status: "waiting" };
    const chatter = new Chatter(() => 0);
    const facts = context({ respect: -5 }, "soldier");
    for (let i = 0; i < 20; i++) chatter.update(0.1, [waiting], [], () => false, () => "", () => facts);
    expect(LEERING_CALLS.soldier.map((line) => line.replace("{Item}", "An ale"))).toContain(chatter.saying(1)?.text);
  });
});

describe("how moods change", () => {
  it("runs out of temper while waiting, the idolizing last of all", () => {
    expect(moodWhileWaiting("calm", 0.2)).toBe("angry");
    expect(moodWhileWaiting("idolize", 0.2)).toBe("idolize");
    expect(moodWhileWaiting("idolize", 0.05)).toBe("angry");
  });

  it("is pleased by quick service and forgives if it's quick enough", () => {
    expect(moodWhenServed("calm", 0.9)).toBe("happy");
    expect(moodWhenServed("angry", 0.8)).toBe("calm");
    expect(moodWhenServed("angry", 0.2)).toBe("angry");
  });

  it("follows drinks and how you answer", () => {
    expect(moodAfterDrink("gloomy", 1)).toBe("happy");
    expect(moodAfterDrink("gloomy", 2)).toBe("drunk");
    expect(moodAfterReply("calm", 1, 0)).toBe("lust");
    expect(moodAfterReply("calm", -2, 0)).toBe("gloomy");
    expect(moodAfterReply("calm", 0, 1)).toBe("happy");
  });
});

describe("the writing", () => {
  const conversations: Exchange[] = [
    ...Object.values(EXCHANGES).flat(),
    ...ANYONE,
    ...Object.values(MOOD_TALKS).flat(),
    ...Object.values(CLASHES).flat(),
    ...ABOUT_YOU.map((talk) => talk.lines),
    ...Object.values(DESIRE_TALKS).flat(),
    ...SMUTTY_GOSSIP.map((talk) => talk.lines),
  ];

  it("fits in a bubble, and every conversation goes back and forth", () => {
    for (const talk of conversations) {
      expect(talk.length, talk[0]).toBeGreaterThanOrEqual(2);
      for (const line of talk) expect(line.length, line).toBeLessThanOrEqual(90);
    }
  });

  it("doesn't open two conversations the same way", () => {
    const openings = conversations.map((talk) => talk[0]);
    expect(openings.filter((line, i) => openings.indexOf(line) !== i)).toEqual([]);
  });

  it("names the innkeeper in everything said about them", () => {
    for (const { lines } of [...ABOUT_YOU, ...SMUTTY_GOSSIP]) expect(lines.join(" "), lines[0]).toMatch(/innkeeper/i);
  });

  it("says things to your face in quotes, short enough for the conversation box", () => {
    for (const line of [...Object.values(FACE_TALK).flat(), ...LOW_RESPECT_TALK, ...HIGH_RESPECT_TALK]) {
      expect(line, line).toMatch(/^".*"$/);
      expect(line.length, line).toBeLessThanOrEqual(150);
    }
  });

  it("keys clashes alphabetically, so the right mood speaks first", () => {
    for (const key of Object.keys(CLASHES)) expect(key.split("/")).toEqual(key.split("/").sort());
  });

  it("has something to say for every kind of guest in every mood", () => {
    const kinds: GuestKind[] = ["farmer", "soldier", "smuggler", "fugitive"];
    for (const lines of Object.values(MOOD_LINES)) {
      for (const kind of kinds) {
        expect(lines.calls[kind].length).toBeGreaterThan(0);
        expect(lines.thanks[kind].length).toBeGreaterThan(0);
      }
    }
  });
});

/** Everything said by a pair over `seconds`. */
function listen(chatter: Chatter, guests: Guest[], seconds: number, facts: BanterContext | null = null): { text: string; aboutYou: boolean; mood: Mood }[] {
  const heard: { text: string; aboutYou: boolean; mood: Mood }[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    chatter.update(0.1, guests, [], () => false, () => "", facts ? () => facts : null);
    for (const g of guests) {
      const said = chatter.saying(g.id);
      if (said && heard[heard.length - 1]?.text !== said.text) heard.push(said);
    }
  }
  return heard;
}

describe("a conversation", () => {
  const seeded = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  it("doesn't repeat until the others have been had, even after a new night", () => {
    const chatter = new Chatter(seeded(7));
    const pair = () => [guest(1, "farmer", "calm"), guest(2, "soldier", "calm")];
    const first = listen(chatter, pair(), 200).map((said) => said.text);
    chatter.reset();
    const second = listen(chatter, pair(), 200).map((said) => said.text);
    const openings = [...first, ...second].filter((text) => Object.values(EXCHANGES["farmer/soldier"]).some((talk) => talk[0] === text));
    expect(openings.length).toBeGreaterThan(4);
    expect(new Set(openings).size).toBe(openings.length);
  });

  it("is sometimes about you, and marked as that", () => {
    const heard = listen(new Chatter(seeded(11)), [guest(1, "farmer", "calm"), guest(2, "soldier", "calm")], 400, context());
    expect(heard.some((said) => said.aboutYou)).toBe(true);
    expect(heard.some((said) => !said.aboutYou)).toBe(true);
  });

  it("carries the speaker's mood onto the bubble", () => {
    const heard = listen(new Chatter(seeded(3)), [guest(1, "soldier", "drunk"), guest(2, "soldier", "drunk")], 60);
    expect(heard.length).toBeGreaterThan(0);
    expect(heard.every((said) => said.mood === "drunk")).toBe(true);
  });

  it("picks something short when they're nearly done", () => {
    const pair = [guest(1, "farmer", "calm"), guest(2, "farmer", "calm")];
    pair.forEach((g) => (g.eatLeft = 8));
    const heard = listen(new Chatter(seeded(5)), pair, 7);
    expect(heard.length).toBeLessThanOrEqual(4);
  });
});
