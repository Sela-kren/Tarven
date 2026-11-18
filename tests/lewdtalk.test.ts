import { describe, expect, it } from "vitest";
import { Chatter } from "../src/game/chatter";
import { defaultRole, statsOf } from "../src/game/guestroles";
import { Tavern, type Guest } from "../src/game/tavern";
import { Fight, type FighterStats } from "../src/game/fight";
import { TAVERN_RULE_BY_ID } from "../src/game/tavernrules";
import { lewdTurn } from "../src/game/brawlai";
import {
  DEFEAT_TALK,
  NO_EVIL_COST,
  SIGHT_PARTS,
  SIGHT_TIERS,
  JERK_SEEN,
  JERK_TALK_LINES,
  LEWD_PARTS,
  noTalkStats,
  REP_TALK_LINES,
  TALK_CAP_PLUS,
  TALK_TIERS,
  talkGain,
  talkRep,
  talkTier,
  type TalkStats,
} from "../src/game/lewdtalk";
import { DESIRE_CAPS, desireCap, effectsOf, emptyMeters, newRecords, PASSIVE_BY_ID, readProgress, type Meters } from "../src/game/passives";

const BASE: FighterStats = { levels: { strength: 1, agility: 1, endurance: 1, charm: 1, mind: 1 }, damage: 0, dodge: 0, talk: 0, stare: 0 };
const meters = (set: Partial<Meters>): Meters => ({ ...emptyMeters(), ...set });
/** Not ready for him yet: he can only talk. */
const NOT_READY = { desire: meters({}), exposure: 0, sexOk: true };
const talk = (set: Partial<TalkStats>): TalkStats => ({ ...noTalkStats(), ...set });
const fight = (extra: Partial<FighterStats>, random = () => 0.6) => new Fight(1, "farmer", false, { ...BASE, ...extra }, random);

describe("lewd talk, Karryn's Prison style", () => {
  it("a line is only desire until she's learned to like hearing it (KP's talk sensitivity starts at 0)", () => {
    const cold = talkGain({ talkLvl: 0, sense: 0, rate: 0, jerk: 0, spread: 0.5 });
    expect(cold.desire).toBeGreaterThan(0);
    expect(cold.pleasure).toBe(0);
    const warm = talkGain({ talkLvl: 0, sense: 0.4, rate: 0, jerk: 0, spread: 0.5 });
    expect(warm.pleasure).toBeGreaterThan(0);
    // A mouthy one says more, and it lands harder; one stroking himself stirs more desire, not more pleasure.
    expect(talkGain({ talkLvl: 2, sense: 0.4, rate: 0, jerk: 0, spread: 0.5 }).pleasure).toBeGreaterThan(warm.pleasure);
    const jerk = talkGain({ talkLvl: 0, sense: 0.4, rate: 0, jerk: 0.5, spread: 0.5 });
    expect(jerk.desire).toBeCloseTo(warm.desire * 1.5);
    expect(jerk.pleasure).toBeCloseTo(warm.pleasure);
  });

  it("in a brawl, talk gives her pleasure once she has the sensitivity, and it's all counted", () => {
    const cold = fight({ ...NOT_READY, workedUp: true });
    cold.act("dodge");
    expect(cold.events.some((e) => e.startsWith("their:talk:"))).toBe(true);
    expect(cold.pleasure).toBe(0);
    const warm = fight({ ...NOT_READY, workedUp: true, lewdTalk: talk({ sense: 0.5 }) });
    warm.act("dodge");
    expect(warm.pleasure).toBeGreaterThan(0);
    expect(warm.talkPleasure).toBe(warm.pleasure);
    expect(Object.values(warm.talkedAt).reduce((a, b) => a + (b ?? 0), 0)).toBe(1);
    expect(warm.talkers.size).toBe(1);
    expect(warm.log.some((l) => l.includes("pleasure)"))).toBe(true);
  });

  it("worked up and not angry, he strokes himself as he talks (KP's jerk-off talk): it works him up faster", () => {
    const f = fight({ ...NOT_READY, workedUp: true });
    f.act("dodge");
    expect(f.jerkedAt).toBe(1);
    const strokes = JERK_TALK_LINES.map((l) => l.replace("{Name} ", ""));
    expect(f.log.some((l) => strokes.some((s) => l.includes(s)))).toBe(true);
  });

  it("enough talk makes her come, and that counts on its own", () => {
    const f = fight({ ...NOT_READY, workedUp: true, pleasure: 99, lewdTalk: talk({ sense: 1 }) });
    f.act("dodge");
    expect(f.climaxes).toBe(1);
    expect(f.talkClimaxes).toBe(1);
    expect(f.log.some((l) => l.includes("His words did that."))).toBe(true);
  });

  it("Cock's third talk passive can tip her straight into horny", () => {
    // 0.45 for every roll: no grope, and one who goes for her hands talks about his cock; 0.45 < 1 lands the chance.
    const f = fight({ ...NOT_READY, workedUp: true, prefers: "hands", lewdTalk: talk({ horny: 1 }) }, () => 0.45);
    f.act("dodge");
    expect(f.talkedAt.cock).toBe(1);
    expect(f.desire!.cock).toBeGreaterThanOrEqual(60);
    expect(f.events).toContain("her:hornyTalk");
  });

  it("what he says goes by what the room knows of her (KP's line tiers)", () => {
    expect(talkRep(undefined, 50, 50)).toBe("plain");
    expect(talkRep("proper", 0, 0)).toBe("innocent");
    expect(talkRep("proper", 40, 3)).toBe("plain");
    expect(talkRep("easy", 20, 3)).toBe("known");
    expect(talkRep("easy", 5, 3)).toBe("plain");
    expect(talkRep("lewd", 40, 3)).toBe("notorious");
    expect(talkRep("lewd", 0, 25)).toBe("notorious");
    // A proper girl who's never done it: the innocent lines come up.
    const f = fight({ ...NOT_READY, workedUp: true, tier: "proper", fame: 0, experience: {} });
    f.act("dodge");
    const lines = Object.values(REP_TALK_LINES.innocent).flat();
    expect(f.log.some((l) => lines.some((r) => l.includes(r)))).toBe(true);
  });

  it("12, 38 and 70 times talked at about a part earn its passives, each with KP's own effect", () => {
    expect(TALK_TIERS).toEqual([12, 38, 70]);
    expect(talkTier(11)).toBe(0);
    expect(talkTier(12)).toBe(1);
    expect(talkTier(70)).toBe(3);
    const records = newRecords();
    records.talkedAt.mouth = 12;
    const one = PASSIVE_BY_ID.get("talk1_mouth")!;
    expect(one.progress({ records } as never)).toEqual([12, 12]);
    const all = LEWD_PARTS.flatMap((p) => [1, 2, 3].map((i) => `talk${i}_${p}`));
    for (const id of all) expect(PASSIVE_BY_ID.has(id)).toBe(true);
    const e = effectsOf(new Set(all));
    // Every tier lifts that desire's cap (KP: max desire up).
    for (const p of LEWD_PARTS) expect(desireCap(e, p)).toBe(Math.min(100, DESIRE_CAPS[0] + TALK_CAP_PLUS * 3));
    // The seconds: mouth and cock fill faster, stares hit harder, rear talk brings hands, pussy talk makes her wet.
    expect(e.talk.stack.mouth).toBeGreaterThan(0);
    expect(e.talk.stack.cock).toBeGreaterThan(0);
    expect(e.talk.sight).toBeGreaterThan(0);
    expect(e.talk.gropeButt).toBeGreaterThan(0);
    expect(e.talk.wet).toBeGreaterThan(0);
    // The thirds: feeling it more when one comes in or on what they talked about; cock talk tips her into horny.
    for (const p of ["mouth", "breasts", "butt", "pussy"] as const) expect(e.talk.come[p]).toBeGreaterThan(0);
    expect(e.talk.horny).toBeGreaterThan(0);
  });

  it("the rest of KP's talk passives: losing opens her to it, and watching them stroke it", () => {
    expect(DEFEAT_TALK).toEqual([1, 7, 14]);
    expect(JERK_SEEN).toEqual([5, 25, 70]);
    const records = newRecords();
    records.fightsLost = 1;
    expect(PASSIVE_BY_ID.get("talkDefeat1")!.progress({ records } as never)).toEqual([1, 1]);
    const lost = effectsOf(new Set(["talkDefeat1", "talkDefeat2", "talkDefeat3"]));
    expect(lost.talk.sense).toBeCloseTo(0.3);
    expect(lost.talk.rate).toBeCloseTo(0.2);
    expect(lost.start.cock).toBe(5);
    const seen = effectsOf(new Set(["jerkSeen1", "jerkSeen2", "jerkSeen3"]));
    expect(seen.talk.jerk).toBe(0.5);
    expect(seen.skill.mind).toBe(1);
    expect(effectsOf(new Set(["prettyWords"])).talk.damage).toBe(1);
    expect(effectsOf(new Set(["hangOnEveryWord"])).talk.mindDown).toBeGreaterThan(0);
    expect(effectsOf(new Set(["justKeepTalking"])).talk.damage).toBe(-1);
  });

  it("in a brawl, KP counts each new one who talks, not each line", () => {
    // Two lines from the same farmer about her mouth: one talker, so no stacking yet on the second line.
    const f = fight({ ...NOT_READY, workedUp: true, lewdTalk: talk({ stack: { mouth: 0.03 } }) });
    f.act("dodge");
    f.act("dodge");
    expect(f.talkedAt.mouth).toBe(2);
    expect(f.talkers.size).toBe(1);
  });

  it("Pretty Words: every new one talking lewd makes her hit harder; Hang on Every Word makes her worse at talking them down", () => {
    const calm = fight({ ...NOT_READY, workedUp: true });
    const angry = fight({ ...NOT_READY, workedUp: true, lewdTalk: talk({ damage: 1, mindDown: 0.04 }) });
    calm.act("dodge");
    angry.act("dodge");
    const talkDown = (f: Fight) => f.choices().find((c) => c.move === "talk")!.chance ?? 0;
    expect(talkDown(angry)).toBeLessThan(talkDown(calm));
  });

  it("the edicts: what the board says about her is what they talk about (KP's Publish edicts)", () => {
    const board = (ids: string[]) => {
      const e = effectsOf(new Set());
      for (const id of ids) TAVERN_RULE_BY_ID.get(id)!.effect!(e);
      return e.talk;
    };
    expect(board(["postedProfile"]).known).toBe(15);
    expect(board(["postedProfile", "postedRecords"]).known).toBe(30);
    expect(board(["postedFirsts"]).firsts).toBe(true);
    expect(board(["postedWeakSpots"]).aim).toBe(true);
    expect(board(["foulMouths"]).rate).toBeLessThan(0);
    expect(TAVERN_RULE_BY_ID.get("foulMouths")!.excludes).toContain("postedWeakSpots");
    // Posted, they know what she's never done, however lewd she is.
    expect(talkRep("lewd", 0, 0)).toBe("plain");
    expect(talkRep("lewd", 0, 0, true)).toBe("innocent");
    // Her name on the board: they talk as if she were famous.
    const f = fight({ ...NOT_READY, workedUp: true, tier: "easy", fame: 0, experience: { mouth: 3 }, lewdTalk: talk({ known: 15 }) });
    f.act("dodge");
    const known = Object.values(REP_TALK_LINES.known).flat();
    expect(f.log.some((l) => known.some((r) => l.includes(r)))).toBe(true);
  });

  it("the talk records are kept in a save", () => {
    const back = readProgress({ records: { talkedAt: { pussy: 9, nonsense: 3 }, talkedBy: 4, talkPleasure: 30, talkClimaxes: 1, jerkedAt: 2 } });
    expect(back.records.talkedAt).toEqual({ pussy: 9 });
    expect(back.records.talkedBy).toBe(4);
    expect(back.records.talkPleasure).toBe(30);
    expect(back.records.talkClimaxes).toBe(1);
    expect(back.records.jerkedAt).toBe(2);
  });

  it("a leer to her face in the taproom is handed on to the tavern, once", () => {
    const chatter = new Chatter(() => 0);
    const facts = () => ({ persona: { respect: -10 } }) as never;
    const guest = { id: 7, kind: "farmer", status: "waiting", ordered: true, order: "ale", patience: 10, maxPatience: 10, party: null, mood: "calm", desires: 0 } as never;
    chatter.update(0.1, [guest], [], () => false, () => "", facts);
    chatter.update(5, [guest], [], () => false, () => "", facts);
    expect(chatter.takeLeers()).toContain(7);
    expect(chatter.takeLeers()).toEqual([]);
  });

  it("and the tavern feels it: desire for the part he goes for, counted toward her talk passives", () => {
    const t = new Tavern(11);
    t.random = () => 0.5;
    t.playerBody = "Female";
    t.open();
    const g: Guest = {
      id: 3, kind: "farmer", role: defaultRole("farmer"), stats: { ...statsOf("farmer"), prefers: "breasts" }, female: false, look: 0, order: "ale", ordered: true, seat: 3,
      status: "waiting", patience: 30, maxPatience: 30, eatLeft: 0, rumor: false, listened: 0, party: null, lust: 0, desires: 0, mood: "calm",
    };
    t.guests.length = 0;
    t.guests.push(g);
    const before = t.meters.breasts;
    t.heardLeer(3);
    expect(t.meters.breasts).toBeGreaterThan(before);
    expect(t.records.talkedAt.breasts).toBe(1);
    // Nobody to hear it from, nothing happens.
    t.heardLeer(99);
    expect(t.records.talkedAt.breasts).toBe(1);
  });

  it("they stare at her face too, now and then, not only at what's bare (KP's Sight on her face)", () => {
    expect(lewdTurn("mouth", 0, false, 0.65, 0)).toEqual({ kind: "sight", part: "mouth" });
    expect(lewdTurn("mouth", 0, false, 0.5, 0)).toEqual({ kind: "talk", part: "mouth" });
  });

  it("a stare is desire, and pleasure once she likes being looked at; it's all counted (KP's sight)", () => {
    const bare = { ...NOT_READY, exposure: 1, workedUp: true, prefers: "breasts" as const };
    const cold = fight(bare, () => 0.45);
    cold.act("dodge");
    expect(cold.events).toContain("their:sight:breasts");
    expect(cold.pleasure).toBe(0);
    const warm = fight({ ...bare, lewdTalk: talk({ sightSense: 0.5 }) }, () => 0.45);
    warm.act("dodge");
    expect(warm.pleasure).toBeGreaterThan(0);
    expect(warm.sightPleasure).toBe(warm.pleasure);
    expect(warm.seenAt.breasts).toBe(1);
    expect(warm.starers.size).toBe(1);
  });

  it("every round: her sight passives raise desire, and bare in front of them she feels their eyes", () => {
    const f = fight({ ...NOT_READY, workedUp: true, lewdTalk: talk({ sightEvery: { pussy: 1 } }) });
    f.act("dodge");
    expect(f.desire!.pussy).toBeGreaterThan(0);
    const bare = fight({ ...NOT_READY, exposure: 1, workedUp: true, lewdTalk: talk({ naked: 1 }) });
    bare.act("dodge");
    expect(bare.events).toContain("her:nakedLooks");
    expect(bare.pleasure).toBeGreaterThan(0);
  });

  it("Hear No Evil shuts most of their talk out, once her edicts teach it (KP's willpower skill)", () => {
    const untaught = fight({ ...NOT_READY, workedUp: true });
    expect(untaught.choices().some((c) => c.move === "hearNoEvil")).toBe(false);
    const plain = fight({ ...NOT_READY, workedUp: true, lewdTalk: talk({ hearNoEvil: true }) });
    const deaf = fight({ ...NOT_READY, workedUp: true, lewdTalk: talk({ hearNoEvil: true }) });
    expect(deaf.choices().some((c) => c.move === "hearNoEvil")).toBe(true);
    const will = deaf.will;
    deaf.act("hearNoEvil");
    expect(deaf.hearing).toBe(true);
    expect(deaf.will).toBe(will - NO_EVIL_COST.hearNoEvil);
    plain.act("dodge");
    deaf.act("dodge");
    expect(deaf.desire!.mouth).toBeLessThan(plain.desire!.mouth);
    // It holds this round and the next, then lets go.
    deaf.act("dodge");
    expect(deaf.hearing).toBe(true);
    deaf.act("dodge");
    expect(deaf.hearing).toBe(false);
  });

  it("with See and Hear No Evil both up, Speak No Evil takes the want down (KP)", () => {
    const f = fight({ ...NOT_READY, desire: meters({ mouth: 40, pussy: 40 }), workedUp: true, lewdTalk: talk({ seeNoEvil: true, hearNoEvil: true, speakNoEvil: true }) });
    const speak = () => f.choices().find((c) => c.move === "speakNoEvil");
    expect(speak()).toBeUndefined();
    f.act("seeNoEvil");
    f.act("dodge");
    f.act("hearNoEvil");
    // Both up, but she's had her willpower skill this turn.
    expect(speak()?.disabled).toBe(true);
    f.act("dodge");
    expect(speak()?.disabled).toBe(false);
    const before = f.desire!.pussy;
    f.act("speakNoEvil");
    expect(f.events).toContain("speakNoEvil");
    expect(f.desire!.pussy).toBeLessThan(before);
  });

  it("KP's sight passives: three for each part she's stared at (15, 54, 73), and the ones for liking it", () => {
    expect(SIGHT_TIERS).toEqual([15, 54, 73]);
    const ids = SIGHT_PARTS.flatMap((p) => [1, 2, 3].map((i) => `sight${i}_${p}`));
    for (const id of ids) expect(PASSIVE_BY_ID.has(id)).toBe(true);
    const e = effectsOf(new Set(ids));
    for (const p of SIGHT_PARTS) {
      expect(e.talk.sightEvery[p]).toBeGreaterThan(0);
      expect(e.talk.sightStack[p]).toBeGreaterThan(0);
    }
    expect(e.talk.sightSenseBreasts).toBeGreaterThan(0);
    expect(e.talk.sightGropeButt).toBeGreaterThan(0);
    expect(e.talk.sightEveryPer.mouth).toBeGreaterThan(0);
    expect(e.talk.sightEveryPer.pussy).toBeGreaterThan(0);
    const liking = effectsOf(new Set(["audience", "vulgarGazes", "leeringPleasure", "willingEyeCandy", "ogledOrgasm", "undoneByEyes"]));
    expect(liking.talk.sightSense).toBeCloseTo(0.4);
    expect(liking.talk.naked).toBe(3);
    expect(liking.talk.sightCrit).toBe(true);
    expect(liking.skill.charm).toBe(1);
    const records = newRecords();
    records.seenAt.pussy = 15;
    expect(PASSIVE_BY_ID.get("sight1_pussy")!.progress({ records } as never)).toEqual([15, 15]);
    const back = readProgress({ records: { seenAt: { pussy: 4, cock: 2 }, seenBy: 3, sightPleasure: 12, sightClimaxes: 1 } });
    expect(back.records.seenAt).toEqual({ pussy: 4 });
    expect(back.records.seenBy).toBe(3);
  });

  it("the edicts that teach See, Hear and Speak No Evil, one after the other", () => {
    const e = effectsOf(new Set());
    for (const id of ["seeNoEvil", "hearNoEvil", "speakNoEvil"]) TAVERN_RULE_BY_ID.get(id)!.effect!(e);
    expect([e.talk.seeNoEvil, e.talk.hearNoEvil, e.talk.speakNoEvil]).toEqual([true, true, true]);
    expect(TAVERN_RULE_BY_ID.get("hearNoEvil")!.requires).toEqual(["seeNoEvil"]);
    expect(TAVERN_RULE_BY_ID.get("speakNoEvil")!.requires).toEqual(["hearNoEvil"]);
  });
});
