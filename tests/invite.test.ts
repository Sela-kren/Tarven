import { describe, expect, it } from "vitest";
import { ADULT_MAX, addStack, adultPlayChance, lewdnessEase, matchAct, matchWhere, STACK_GAIN, STACK_REFUSED, stackStart, type AdultPlayFacts } from "../src/game/adultplay";
import { BARE_DESIRE, BARE_SLUT, INSIDE_DESIRE, INSIDE_SLUT, LAYER_BONUS, layersOpen, pickLayer } from "../src/game/touch";
import { defaultRole, statsOf } from "../src/game/guestroles";
import { FANS_DELIGHTED, FANS_HAPPY } from "../src/game/ledger";
import { INVITE_ASKS, JOIN_ASKS, MORNING_AFTER, STAIRS, TAPROOM_END } from "../src/game/invitetalk";
import type { Mood } from "../src/game/mood";
import { earned, effectsOf, PASSIVE_BY_ID, readProgress } from "../src/game/passives";
import { isBaron, roomReaction, taproomResult, wantsToJoin, willingJoiners, type RoomGuest } from "../src/game/taproom";
import { MAX_PARTNERS } from "../src/game/duel";
import { Tavern, type Guest, type GuestKind, type GuestStatus, type InviteScene } from "../src/game/tavern";

const SEATS = 11;
const KINDS: GuestKind[] = ["farmer", "soldier", "smuggler", "fugitive", "adventurer", "bandit", "noble"];

/** A guest sat in the room, as the tavern keeps them. */
function guest(id: number, kind: GuestKind, lust: number, mood: Mood = "calm", status: GuestStatus = "waiting", female = false): Guest {
  return {
    id,
    kind,
    role: defaultRole(kind),
    stats: statsOf(kind),
    female,
    look: 0,
    order: "ale",
    ordered: true,
    seat: id,
    status,
    patience: 30,
    maxPatience: 30,
    eatLeft: 0,
    rumor: false,
    listened: 0,
    party: null,
    lust,
    desires: 0,
    mood,
  };
}

/** A night under way, her warm for everything, and a room of guests; she's been upstairs once before. */
function night(room: Guest[]): Tavern {
  const t = new Tavern(SEATS);
  t.random = () => 0.99;
  t.playerBody = "Female";
  t.open();
  t.guests.length = 0;
  t.guests.push(...room);
  for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 100;
  t.records.invitations = 1;
  // Her adult play stack full: a guest worked up enough can go for it.
  t.adultStack = 100;
  return t;
}

const scene = (g: Guest): InviteScene => ({ kind: "upstairs", guestId: g.id, guestKind: g.kind, guestStats: g.stats });
const inner = (t: Tavern) =>
  t as unknown as { drunk: number; pleasure: number; maybeReach: (g: Guest) => boolean; morningAfter: string[]; takeDrink: () => void; loseClothing: () => void };
/** Plays the game out to the end, kissing and holding back, whichever way it goes. */
function playOut(t: Tavern): void {
  for (let i = 0; i < 400 && t.duel; i++) t.duelMove(t.duel.stamina >= 4 ? "kiss" : "hold");
}

describe("the invitation, told as a story", () => {
  it("has its own words for every kind of guest: asking, the stairs, and the morning after", () => {
    for (const kind of KINDS) {
      expect(INVITE_ASKS[kind].length, kind).toBeGreaterThan(1);
      expect(STAIRS[kind].length, kind).toBeGreaterThan(0);
      expect(MORNING_AFTER[kind].length, kind).toBeGreaterThan(0);
      expect(JOIN_ASKS[kind].length, kind).toBeGreaterThan(0);
    }
    // Different kinds ask differently.
    expect(INVITE_ASKS.farmer[0]).not.toBe(INVITE_ASKS.noble[0]);
  });

  it("opens with what they say, in their kind's words, and the room going quiet", () => {
    const host = guest(1, "soldier", 10, "lust");
    const t = night([host]);
    // Reach for sure (0), and the adult play roll comes up (0).
    const rolls = [0];
    t.random = () => rolls.shift() ?? 0.5;
    t.adultRandom = () => 0;
    expect(inner(t).maybeReach(host)).toBe(true);
    const lines = t.talkLines;
    expect(lines[0].speaker).not.toBeNull();
    expect(INVITE_ASKS.soldier.map((l) => `"${l}"`)).toContain(lines[0].text);
    // The reach, the room, then her thought: all before she answers.
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines.at(-1)?.speaker).toBe("You");

    // She says yes: the room reacts, and the invitation card is waiting.
    t.chooseTalk(0);
    expect(t.takeAdultScene()).toMatchObject({ kind: "upstairs", guestId: 1, guestKind: "soldier" });
  });

  it("goes up the stairs in their way, to a room that's new the first time, and leaves a morning-after line", () => {
    const host = guest(1, "noble", 8);
    const t = night([host]);
    t.records.invitations = 0;
    expect(t.upstairsLine(scene(host))).toContain("never brought anyone");
    expect(STAIRS.noble.some((l) => t.upstairsLine(scene(host)).startsWith(l))).toBe(true);
    t.takeUpstairs(scene(host), "kiss");
    expect(t.records.invitations).toBe(1);
    expect(t.upstairsLine(scene(host))).not.toContain("never brought anyone");
    t.takeMessages();
    t.phase = "bedtime";
    t.sleep();
    expect(t.takeMessages().some((l) => MORNING_AFTER.noble.includes(l))).toBe(true);
  });
});

describe("adult play, Karryn-style: any time, likelier the more worked up", () => {
  const calm: AdultPlayFacts = { cock: 0, horny: false, wet: false, lust: 6, lusting: false, lewdness: 0, exposed: 0, night: 0, pull: 0, respected: false, stack: 100 };

  it("never before the stack is full, or with a guest who isn't aroused", () => {
    expect(adultPlayChance({ ...calm, stack: 99, cock: 100, lust: 10 })).toBe(0);
    expect(adultPlayChance({ ...calm, lust: 5 })).toBe(0);
    expect(adultPlayChance(calm)).toBeGreaterThan(0);
  });

  it("once full: small to start, grows with everything that's worked up, and never passes the cap", () => {
    const early = adultPlayChance(calm);
    expect(early).toBeLessThan(0.15);
    const steps: Partial<AdultPlayFacts>[] = [{ cock: 40 }, { horny: true }, { wet: true }, { lust: 9 }, { lusting: true }, { lewdness: 10 }, { exposed: 2 }, { night: 8 }, { pull: 0.5 }];
    let facts = { ...calm };
    let last = early;
    for (const step of steps) {
      facts = { ...facts, ...step };
      const now = adultPlayChance(facts);
      expect(now, JSON.stringify(step)).toBeGreaterThan(last);
      last = now;
    }
    expect(adultPlayChance({ ...facts, cock: 100, lewdness: 500, exposed: 9, night: 99, pull: 5 })).toBe(ADULT_MAX);
    // A respected innkeeper is asked half as often.
    expect(adultPlayChance({ ...facts, pull: 0, respected: true })).toBeCloseTo(adultPlayChance({ ...facts, pull: 0 }) / 2);
  });

  it("needs no lewdness to be asked: an aroused guest can go for it on an early night", () => {
    const host = guest(1, "farmer", 7);
    const t = night([host]);
    t.records.invitations = 0;
    t.touchMemory.lets.hand = 1;
    t.random = () => 0;
    t.adultRandom = () => 0;
    expect(t.lewdness).toBeLessThan(25);
    expect(inner(t).maybeReach(host)).toBe(true);
    expect(t.talkLines.some((l) => (INVITE_ASKS.farmer as readonly string[]).some((ask) => l.text === `"${ask}"`))).toBe(true);
  });

  it("is ready for it horny and wet, whatever her Cock desire; and her lewdness takes some of the need off", () => {
    const t = night([guest(1, "farmer", 4)]);
    for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 20;
    expect(t.adultDesire()).toBeLessThan(9);
    t.meters.pussy = 100;
    inner(t).pleasure = 60;
    expect(t.wet).toBe(true);
    expect(t.adultDesire()).toBeGreaterThanOrEqual(9);
    expect(lewdnessEase(0)).toBe(0);
    expect(lewdnessEase(50)).toBe(10);
    expect(lewdnessEase(999)).toBe(20);
  });

  /** Consent off, and a guest goes for adult play. */
  function consentOff(host: Guest, room: Guest[] = []): Tavern {
    const t = night([host, ...room]);
    t.touchSettings.autoTouch = true;
    t.touchSettings.agreed = true;
    t.random = () => 0;
    t.adultRandom = () => 0;
    return t;
  }

  it("Consent off: her state decides. Ready, and them aroused, and it happens without the question", () => {
    const host = guest(1, "soldier", 8);
    const t = consentOff(host);
    expect(inner(t).maybeReach(host)).toBe(true);
    expect(t.takeAdultScene()).toMatchObject({ kind: "upstairs", guestId: 1, auto: true });
  });

  it("Consent off: not when they aren't aroused, or anyone's too drunk, or she isn't ready. Then she's asked", () => {
    const cool = guest(1, "soldier", 3);
    const t1 = consentOff(cool);
    expect(inner(t1).maybeReach(cool)).toBe(true);
    expect(t1.takeAdultScene()).toBeNull();

    const host = guest(1, "soldier", 8);
    const t2 = consentOff(host);
    inner(t2).drunk = 0.9;
    inner(t2).maybeReach(host);
    expect(t2.takeAdultScene()).toBeNull();

    const t3 = consentOff(host);
    for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t3.meters[m] = 10;
    inner(t3).maybeReach(host);
    expect(t3.takeAdultScene()).toBeNull();
  });

  it("Consent off: what happens upstairs is matched to her strongest desire", () => {
    const host = guest(1, "soldier", 8);
    const t = consentOff(host);
    for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 60;
    t.meters.cock = 95;
    const result = t.autoAdultPlay(scene(host));
    expect(result).toMatchObject({ where: "upstairs", act: "mouth" });
    expect(t.records.invitations).toBe(2);
    // Ties go to the bolder act; a kiss when nothing else is ready.
    const meters = { body: 0, mouth: 50, breasts: 0, butt: 50, pussy: 0, cock: 0 };
    expect(matchAct([{ act: "kiss", ready: true, meter: "mouth" }, { act: "behind", ready: true, meter: "butt" }], meters)).toBe("behind");
    expect(matchAct([{ act: "kiss", ready: true, meter: "mouth" }, { act: "behind", ready: false, meter: "butt" }], meters)).toBe("kiss");
  });

  it("Consent off: down in the taproom when it's open to her and she's already on show", () => {
    expect(matchWhere(true, 1, false)).toBe("taproom");
    expect(matchWhere(true, 0, true)).toBe("taproom");
    expect(matchWhere(true, 0, false)).toBe("upstairs");
    expect(matchWhere(false, 3, true)).toBe("upstairs");
    const host = guest(1, "soldier", 8);
    const t = consentOff(host, [guest(2, "bandit", 8)]);
    t.passives.add("openHouse");
    expect(t.autoAdultPlay(scene(host))).toEqual({ where: "taproom" });
    expect(t.duel?.everyone).toBe(2);
    // Stop still ends it, for everyone.
    t.duelMove("stop");
    expect(t.duel).toBeNull();
  });
});

describe("the adult play stack, in percent", () => {
  const room = () => {
    const t = new Tavern(SEATS);
    t.random = () => 0.99;
    t.playerBody = "Female";
    t.open();
    return t;
  };

  it("starts each night from her lewdness, at most 40%", () => {
    expect(stackStart(0)).toBe(0);
    expect(stackStart(30)).toBe(15);
    expect(stackStart(500)).toBe(40);
    expect(addStack(95, 10)).toBe(100);
    expect(addStack(5, -STACK_REFUSED)).toBe(0);
  });

  it("fills with drinks, desire, clothes off and touches she lets land", () => {
    const t = room();
    const at = t.adultStack;
    inner(t).takeDrink();
    expect(t.adultStack).toBeGreaterThanOrEqual(at + STACK_GAIN.drink);
    const before = t.adultStack;
    inner(t).loseClothing();
    expect(t.adultStack).toBeCloseTo(Math.min(100, before + STACK_GAIN.piece));
  });

  it("keeps a guest from going for it until it's full; full, an aroused one can", () => {
    const host = guest(1, "soldier", 9, "lust");
    const t = night([host]);
    t.adultStack = 60;
    t.random = () => 0;
    t.adultRandom = () => 0;
    inner(t).maybeReach(host);
    expect(t.talkLines.some((l) => (INVITE_ASKS.soldier as readonly string[]).some((ask) => l.text === `"${ask}"`))).toBe(false);
    const full = night([host]);
    full.random = () => 0;
    full.adultRandom = () => 0;
    inner(full).maybeReach(host);
    expect(full.talkLines.some((l) => (INVITE_ASKS.soldier as readonly string[]).some((ask) => l.text === `"${ask}"`))).toBe(true);
  });

  it("knocks back when she says no, and empties once it's played out", () => {
    const host = guest(1, "soldier", 9, "lust");
    const t = night([host]);
    t.random = () => 0;
    t.adultRandom = () => 0;
    inner(t).maybeReach(host);
    // Her answers end with Slap, then Pull away.
    t.chooseTalk(t.talkChoices.length - 1);
    expect(t.adultStack).toBe(100 - STACK_REFUSED);
    t.takeUpstairs(scene(host), "kiss");
    expect(t.adultStack).toBeLessThan(10);
  });
});

describe("touch layers: over the clothes, inside them, bare skin", () => {
  const facts = { region: "chest" as const, level: 7, desire: 6, slutLevel: 0, exposed: 0 };

  it("open up with desire past what the touch needs, or with her Slut Level", () => {
    expect(layersOpen(facts)).toEqual(["over"]);
    expect(layersOpen({ ...facts, desire: 6 + INSIDE_DESIRE })).toEqual(["over", "inside"]);
    expect(layersOpen({ ...facts, slutLevel: INSIDE_SLUT })).toEqual(["over", "inside"]);
    expect(layersOpen({ ...facts, desire: 6 + BARE_DESIRE })).toEqual(["over", "inside", "bare"]);
    expect(layersOpen({ ...facts, slutLevel: BARE_SLUT })).toEqual(["over", "inside", "bare"]);
    expect(layersOpen({ ...facts, exposed: 2 })).toEqual(["over", "inside", "bare"]);
    // Parts clothes don't cover only ever go over.
    expect(layersOpen({ ...facts, region: "hand", slutLevel: 9 })).toEqual(["over"]);
  });

  it("go for the boldest open half the time, and pay and warm her more the further in", () => {
    expect(pickLayer(["over", "inside", "bare"], 0.1)).toBe("bare");
    expect(["over", "inside"]).toContain(pickLayer(["over", "inside", "bare"], 0.9));
    expect(pickLayer(["over"], 0.9)).toBe("over");
    expect(LAYER_BONUS.bare.gold).toBeGreaterThan(LAYER_BONUS.inside.gold);
    expect(LAYER_BONUS.inside.desire).toBeGreaterThan(LAYER_BONUS.over.desire);
  });
});

describe("after a lost brawl: wherever she chooses", () => {
  it("right where she fell (not her first time), upstairs, or out back", () => {
    const t = night([]);
    expect(t.brawlPlaces().map((p) => p.id)).toEqual(["here", "upstairs", "yard"]);
    expect(t.brawlPlaces().every((p) => p.blocked === null)).toBe(true);
    t.records.invitations = 0;
    expect(t.brawlPlaces().find((p) => p.id === "here")?.blocked).toMatch(/first time/);
    expect(t.brawlPlaces().find((p) => p.id === "yard")?.blocked).toBeNull();
  });
});

describe("upstairs or the taproom", () => {
  it("offers both once others in the room want in", () => {
    const host = guest(1, "smuggler", 9);
    const t = night([host, guest(2, "soldier", 8), guest(3, "farmer", 1)]);
    const option = t.taproomOption(scene(host));
    expect(option).toMatchObject({ shown: true, blocked: null });
    expect(option.joiners.map((g) => g.id)).toEqual([2]);
    expect(t.inviteChoiceLine(scene(host))).toMatch(/down here/i);
  });

  it("keeps her first time behind a closed door, and needs someone else who wants in", () => {
    const host = guest(1, "farmer", 9);
    const t = night([host, guest(2, "soldier", 8)]);
    t.records.invitations = 0;
    expect(t.taproomOption(scene(host)).blocked).toMatch(/first time/);
    expect(t.startTaproom(scene(host), [2], [])).toBe(false);
    const alone = night([host, guest(2, "soldier", 2)]);
    expect(alone.taproomOption(scene(host)).blocked).toMatch(/nobody/);
  });

  it("isn't there at all when she's had too much, or the one who asked has", () => {
    const host = guest(1, "farmer", 9);
    const t = night([host, guest(2, "soldier", 8)]);
    inner(t).drunk = 0.9;
    expect(t.taproomOption(scene(host)).shown).toBe(false);
    expect(t.startTaproom(scene(host), [2], [])).toBe(false);
    const drunkHost = guest(1, "farmer", 9, "drunk");
    expect(night([drunkHost, guest(2, "soldier", 8)]).taproomOption(scene(drunkHost)).shown).toBe(false);
  });
});

describe("who joins", () => {
  const room = (over: Partial<RoomGuest> & { id: number }): RoomGuest => ({ kind: "soldier", label: "Soldier", status: "waiting", lust: 8, mood: "calm", female: false, ...over });

  it("only the willing: lust that shows, sober, in the room, and never the Baron", () => {
    expect(wantsToJoin(room({ id: 1 }))).toBe(true);
    expect(wantsToJoin(room({ id: 2, lust: 3 }))).toBe(false);
    expect(wantsToJoin(room({ id: 3, mood: "drunk", lust: 10 }))).toBe(false);
    expect(wantsToJoin(room({ id: 4, mood: "angry" }))).toBe(false);
    expect(wantsToJoin(room({ id: 5, status: "arriving" }))).toBe(false);
    expect(wantsToJoin(room({ id: 6, status: "leaving" }))).toBe(false);
    expect(wantsToJoin(room({ id: 7, label: "Baron Hesk", lust: 10 }))).toBe(false);
    expect(isBaron({ label: "Baron Hesk" })).toBe(true);
  });

  it("keenest first, never the one who asked, and no cap: everyone willing is in line", () => {
    const people = [room({ id: 1, lust: 10 }), ...[2, 3, 4, 5, 6, 7, 8, 9].map((id) => room({ id, lust: Math.min(10, 2 + id) }))];
    const joiners = willingJoiners(people, 1);
    expect(joiners.map((g) => g.id)).toEqual([8, 9, 7, 6, 5, 4]);
    expect(joiners.some((g) => g.id === 1)).toBe(false);
  });

  it("in the tavern: a drunk guest never joins, whatever their lust, and she can't pick them", () => {
    const host = guest(1, "bandit", 9);
    const t = night([host, guest(2, "soldier", 10, "drunk"), guest(3, "farmer", 7)]);
    expect(t.taproomJoiners(scene(host)).map((g) => g.id)).toEqual([3]);
    expect(t.startTaproom(scene(host), [2], [])).toBe(false);
    expect(t.startTaproom(scene(host), [], [])).toBe(false);
    expect(t.duel).toBeNull();
  });

  it("every one asks first", () => {
    const host = guest(1, "bandit", 9);
    const t = night([host, guest(2, "noble", 8)]);
    expect(JOIN_ASKS.noble.map((l) => `"${l}"`)).toContain(t.joinAsk(2));
  });
});

describe("in the taproom", () => {
  it("plays as the After Hours game with her picks, and the room reacts as it starts", () => {
    const host = guest(1, "adventurer", 9);
    const t = night([host, guest(2, "soldier", 8), guest(3, "smuggler", 7, "calm", "eating", true), guest(4, "noble", 2), guest(5, "farmer", 4)]);
    expect(t.startTaproom(scene(host), [2, 3], ["hands"])).toBe(true);
    const duel = t.duel!;
    expect(duel.partners.map((p) => p.kind)).toEqual(["adventurer", "soldier", "smuggler"]);
    expect(duel.partners[2].female).toBe(true);
    expect(duel.stake).toBe(0);
    // The cold noble leaves; the farmer stays to watch.
    expect(t.guests.find((g) => g.id === 4)?.status).toBe("leaving");
    expect(t.guests.find((g) => g.id === 5)?.status).toBe("waiting");
    expect(t.records.taproomScenes).toBe(1);
    expect(t.records.taproomPartners).toBe(3);
  });

  it("takes six on her at once; the rest wait in line and step in as each one gives in, until the last", () => {
    const host = guest(1, "adventurer", 10);
    const others = [2, 3, 4, 5, 6, 7, 8].map((id) => guest(id, "soldier", 9));
    const t = night([host, ...others]);
    expect(t.startTaproom(scene(host), others.map((g) => g.id), ["hands", "mouth", "breasts", "butt", "pussy"])).toBe(true);
    const duel = t.duel!;
    expect(MAX_PARTNERS).toBe(6);
    expect(duel.active).toHaveLength(6);
    expect(duel.waiting).toHaveLength(2);
    expect(duel.everyone).toBe(8);
    // One gives in: the next in line steps in at once.
    duel.active[0].pleasure = 100;
    t.duelMove("hold");
    if (t.duel) {
      expect(duel.partners.filter((p) => p.done)).toHaveLength(1);
      expect(duel.waiting).toHaveLength(1);
      expect(duel.active).toHaveLength(6);
      expect(duel.log.some((l) => l.includes("steps in to take a turn"))).toBe(true);
    }
    // It isn't won while anyone's still waiting.
    expect(t.records.taproomMost).toBe(0);
    playOut(t);
    expect(t.records.taproomMost).toBe(8);
  });

  it("left open, watchers who get worked up join the line as it goes", () => {
    const host = guest(1, "adventurer", 10);
    const t = night([host, guest(2, "soldier", 9), guest(3, "farmer", 5), guest(4, "bandit", 5, "drunk")]);
    expect(t.startTaproom(scene(host), [2], ["hands"], "plain", true)).toBe(true);
    for (let i = 0; i < 3 && t.duel; i++) t.duelMove("hold");
    // The farmer's worked up enough now, and joins; the drunk bandit never does.
    expect(t.guests.find((g) => g.id === 3)!.lust).toBeGreaterThanOrEqual(6);
    expect(t.duel?.everyone ?? 3).toBe(3);
    expect(t.records.taproomPartners).toBe(3);
  });

  it("kept closed, the watchers only watch", () => {
    const host = guest(1, "adventurer", 10);
    const t = night([host, guest(2, "soldier", 9), guest(3, "farmer", 5)]);
    t.startTaproom(scene(host), [2], ["hands"]);
    for (let i = 0; i < 6 && t.duel; i++) t.duelMove("hold");
    expect(t.duel?.everyone ?? 2).toBe(2);
    expect(t.records.taproomPartners).toBe(2);
  });

  it("only with parts she's warm enough for", () => {
    const host = guest(1, "adventurer", 9);
    const t = night([host, guest(2, "soldier", 8)]);
    t.meters.pussy = 0;
    expect(t.startTaproom(scene(host), [2], ["pussy"])).toBe(false);
  });

  it("stops at once when she says so: no gold, no heat, and back to the bar", () => {
    const host = guest(1, "fugitive", 9);
    const t = night([host, guest(2, "soldier", 8)]);
    const { gold, heat, phase } = t;
    t.startTaproom(scene(host), [2], []);
    t.duelMove("stop");
    expect(t.duel).toBeNull();
    const result = t.takeDuelResult()!;
    expect(result).toMatchObject({ outcome: "stopped", taproom: true, gold: 0 });
    expect(t.gold).toBe(gold);
    expect(t.heat).toBe(heat);
    // The night goes on: no early close, unlike a lost brawl.
    expect(t.phase).toBe(phase);
    expect(t.guests.find((g) => g.id === 2)?.mood).toBe("calm");
  });

  it("played out: fame up, respect down, heat, tips, the room stirred, the night goes on, and a morning after", () => {
    const host = guest(1, "fugitive", 9);
    const t = night([host, guest(2, "soldier", 8), guest(3, "farmer", 5), guest(4, "farmer", 1)]);
    t.persona.respect = 5;
    const { gold, heat, trust, phase } = t;
    const fame = t.persona.fame;
    const fans = t.fansTonight;
    t.startTaproom(scene(host), [2], []);
    playOut(t);
    const result = t.takeDuelResult()!;
    expect(result.taproom).toBe(true);
    expect(["won", "lost"]).toContain(result.outcome);
    // Both of them go home satisfied, and that's fans at dawn: the one who asked, and the one who joined.
    expect(t.fansTonight).toBe(fans + 2 * (result.outcome === "won" ? FANS_DELIGHTED : FANS_HAPPY));
    expect((TAPROOM_END[result.outcome as "won" | "lost"] as readonly string[]).includes(result.line)).toBe(true);
    expect(t.gold).toBe(gold + result.gold);
    expect(result.gold).toBeGreaterThan(0);
    expect(t.persona.fame).toBeGreaterThan(fame);
    expect(t.persona.respect).toBeLessThan(5);
    expect(t.heat).toBe(heat + 1);
    // A farmer walked out on it: the village hears.
    expect(t.trust).toBe(Math.max(0, trust - 1));
    expect(t.guests.find((g) => g.id === 2)?.mood).toBe("idolize");
    // Watching stirred them as it went, and the end more: past where they started by the end bonus at least.
    expect(t.guests.find((g) => g.id === 3)!.lust).toBeGreaterThanOrEqual(8);
    // The night goes on: no early close, unlike a lost brawl.
    expect(t.phase).toBe(phase);
    expect(inner(t).morningAfter).toHaveLength(1);
  });

  it("works its consequences out by how many were in it", () => {
    expect(taproomResult("won", 4, 0).fame).toBeGreaterThan(taproomResult("won", 2, 0).fame);
    expect(taproomResult("won", 4, 0).respect).toBeLessThan(taproomResult("won", 2, 0).respect);
    expect(taproomResult("lost", 2, 1).trust).toBe(-1);
    expect(taproomResult("stopped", 4, 3)).toMatchObject({ heat: 0, trust: 0 });
    expect(roomReaction({ id: 1, kind: "noble", label: "Noble", status: "waiting", lust: 4, mood: "calm", female: false })).toBe("leave");
    expect(roomReaction({ id: 1, kind: "soldier", label: "Soldier", status: "waiting", lust: 4, mood: "calm", female: false })).toBe("cheer");
  });
});

describe("taproom passives and records", () => {
  it("earns Open House, then The Whole Room with four at once", () => {
    const t = new Tavern(SEATS);
    const f = t.passiveFacts();
    const has = (id: string) => earned(PASSIVE_BY_ID.get(id)!, f);
    expect(has("openHouse")).toBe(false);
    f.records.taproomScenes = 1;
    expect(has("openHouse")).toBe(true);
    f.records.taproomScenes = 3;
    f.records.taproomMost = 3;
    expect(has("wholeRoom")).toBe(false);
    f.records.taproomMost = 4;
    expect(has("wholeRoom")).toBe(true);
    expect(effectsOf(new Set(["openHouse"])).upstairsGold).toBeCloseTo(0.2);
    expect(effectsOf(new Set(["wholeRoom"])).perNight.respect).toBe(-1);
  });

  it("keeps the taproom records in a save", () => {
    const saved = readProgress({ records: { taproomScenes: 2, taproomPartners: 7, taproomMost: 4 } });
    expect(saved.records).toMatchObject({ taproomScenes: 2, taproomPartners: 7, taproomMost: 4 });
    const t = new Tavern(SEATS);
    t.records.taproomScenes = 3;
    const copy = new Tavern(SEATS);
    copy.restore(t.snapshot());
    expect(copy.records.taproomScenes).toBe(3);
  });
});
