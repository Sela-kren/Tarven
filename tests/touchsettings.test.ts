import { describe, expect, it } from "vitest";
import { METERS, newRecords, PASSIVES, type Records } from "../src/game/passives";
import { Tavern, type Target } from "../src/game/tavern";
import { TOUCHES } from "../src/game/touchtalk";
import { KINK_TALK, kinkOf } from "../src/game/kinktalk";
import {
  autoTouchFits,
  defaultTouchSettings,
  impulseCheck,
  impulsive,
  readTouchSettings,
  STRIP_HOLD,
  type ImpulseFacts,
  type TouchSettings,
} from "../src/game/touchsettings";

const byId = (id: string) => TOUCHES.find((t) => t.id === id)!;

describe("eager guests touching without asking", () => {
  it("starts with Consent on (switched on but not agreed to), up to boldness 5", () => {
    expect(defaultTouchSettings()).toEqual({ autoTouch: true, agreed: false, upTo: 5 });
    // No browser storage here: the defaults stand.
    expect(readTouchSettings()).toEqual(defaultTouchSettings());
  });

  it("only counts a lustful guest with the nerve to do it as impulsive", () => {
    expect(impulsive("lust", 5)).toBe(true);
    expect(impulsive("lust", 4)).toBe(false);
    expect(impulsive("calm", 9)).toBe(false);
  });

  it("only covers touches she could say yes to, within the boldness chosen, clothes too but never the invitation", () => {
    const s: TouchSettings = { ...defaultTouchSettings(), agreed: true, upTo: 9 };
    const waist = byId("waist");
    expect(autoTouchFits(s, waist, ["allow", "slap", "pull"])).toBe(true);
    // Not when she couldn't say yes anyway: her desire's too low, or someone's too drunk.
    expect(autoTouchFits(s, waist, ["slap", "pull"])).toBe(false);
    expect(autoTouchFits({ ...s, upTo: waist.level - 1 }, waist, ["allow", "slap", "pull"])).toBe(false);
    // A garment goes to the check like any touch, as long as she could say yes to it.
    const strip = TOUCHES.find((t) => t.strip)!;
    expect(autoTouchFits(s, strip, ["allow", "slap", "pull"])).toBe(true);
    expect(autoTouchFits(s, strip, ["slap", "pull"])).toBe(false);
    const invite = TOUCHES.find((t) => t.region === "invite")!;
    expect(autoTouchFits({ ...s, upTo: 10 }, invite, ["allow", "slap", "pull"])).toBe(false);
  });
});

describe("the Consent-off check: their push against her hold", () => {
  const facts: ImpulseFacts = { level: 5, desire: 0, exposed: 0, exhibition: 0, passives: 0, lets: 0, skill: 1, nerve: 6, prefers: false };

  it("holds against a bold touch when she doesn't want it", () => {
    const check = impulseCheck(facts);
    expect(check.push).toBe(6);
    expect(check.hold).toBe(11);
    expect(check.lands).toBe(false);
  });

  it("wears her hold down with desire, passives, experience and practice", () => {
    const check = impulseCheck({ ...facts, desire: 100, passives: 2, lets: 10, skill: 3 });
    expect(check.want).toEqual({ desire: 5, passives: 2, experience: 2, skill: 2, exhibition: 0 });
    expect(check.hold).toBe(0);
    expect(check.lands).toBe(true);
  });

  it("holds on to her clothes harder than to anything else: they have to push past more", () => {
    const check = impulseCheck({ ...facts, strip: true });
    expect(check.clothing).toBe(STRIP_HOLD);
    expect(check.hold).toBe(impulseCheck(facts).hold + STRIP_HOLD);
    // With her wanting it badly enough, and them bold enough, the garment still comes off.
    expect(impulseCheck({ ...facts, strip: true, desire: 100, passives: 3, lets: 15, skill: 4 }).lands).toBe(true);
  });

  it("pushes harder for the part their type goes for, and the more of her is on show", () => {
    expect(impulseCheck({ ...facts, prefers: true }).push).toBe(8);
    expect(impulseCheck({ ...facts, exposed: 3 }).push).toBe(9);
    // Exhibition passives only count once something's off.
    expect(impulseCheck({ ...facts, exhibition: 2 }).want.exhibition).toBe(0);
    expect(impulseCheck({ ...facts, exhibition: 2, exposed: 1 }).want.exhibition).toBe(2);
  });
});

describe("in the tavern", () => {
  const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
  const idle = { listeningTo: null, night: true };
  const run = (t: Tavern, seconds: number) => {
    for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
  };

  /** A lustful, bold guest reaching as she serves them, with the touch settings given and every roll at 0. */
  function served(settings: Partial<TouchSettings>, before: (t: Tavern) => void = () => {}): Tavern {
    const t = new Tavern(TABLES.length, TABLES);
    t.random = () => 0;
    t.playerBody = "Female";
    t.touchSettings = { ...defaultTouchSettings(), upTo: 9, ...settings };
    t.open();
    for (const m of METERS) t.meters[m] = 50;
    t.tick(0, idle);
    run(t, 4);
    const guest = t.guests[0];
    t.guestArrived(guest.id);
    t.interact(0, { kind: "station", station: "tap" });
    run(t, 2);
    t.interact(0, { kind: "station", station: "tap" });
    guest.lust = 10;
    guest.mood = "lust";
    guest.patience = 0.01;
    before(t);
    t.interact(0, { kind: "guest", id: guest.id } as Target);
    return t;
  }
  const labels = (t: Tavern) => t.talkChoices.map((c) => c.label.split(" · ")[0]);

  it("asks the first time, with every usual answer still there", () => {
    const t = served({});
    const options = labels(t);
    expect(options[0]).toMatch(/let eager guests skip asking \(Consent off\)/);
    expect(options[1]).toBe("Always ask me first");
    expect(options).toContain("Let it happen");
    expect(options.slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(t.landedTouch).toBeNull();
  });

  it("takes the offer as a yes, now and from then on", () => {
    const t = served({});
    t.chooseTalk(0);
    expect(t.touchSettings.agreed).toBe(true);
    expect(t.takeTouchMoment()?.answer).toBe("allow");
  });

  it("keeps asking every time once she says always ask, and the touch still waits on her", () => {
    const t = served({});
    t.chooseTalk(1);
    expect(t.touchSettings.autoTouch).toBe(false);
    const options = labels(t);
    expect(options).not.toContain("Always ask me first");
    expect(options.slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(t.takeTouchMoment()).toBeNull();
  });

  it("lands without the question once Consent is off and they push past her, with the Force bar filling fast", () => {
    const t = served({ agreed: true });
    expect(t.lastImpulse?.check.lands).toBe(true);
    expect(t.talkChoices.map((c) => c.label)).toEqual(["Get back to work"]);
    expect(t.landedTouch?.impulse).toBe(true);
    expect(t.lastImpulse?.landed).toBe(true);
    // Sub talk: she gives in to it in her own voice, and it's in the log.
    const sub = KINK_TALK.plain.sub[0].replaceAll("{guest}", t.lastImpulse!.guest.toLowerCase());
    expect(t.talkReplyLines.map((line) => line.text)).toContain(sub);
    expect(t.takeMessages().some((line) => line.includes(sub))).toBe(true);
    expect(t.takeTouchMoment()?.answer).toBe("allow");
    // Her sub side: it counts, toward masochism.
    expect(t.records.subWins).toBe(1);
    expect(t.records.domWins).toBe(0);
  });

  it("still asks when her hold stands", () => {
    const t = served({ agreed: true }, (tavern) => {
      // Weigh a bold touch she doesn't want against a guest with no taste for it.
      const real = tavern.impulseFacts.bind(tavern);
      tavern.impulseFacts = (...args) => ({ ...real(...args), level: 9, desire: 0, prefers: false });
    });
    expect(t.lastImpulse?.check.lands).toBe(false);
    // She mocks them for trying, in the conversation and the log, and they have to ask after all.
    const mock = KINK_TALK.plain.dom[0].replaceAll("{guest}", t.lastImpulse!.guest.toLowerCase());
    expect(t.talkLines.map((line) => line.text)).toContain(mock);
    expect(t.takeMessages().some((line) => line.startsWith(mock))).toBe(true);
    expect(labels(t).slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(t.landedTouch).toBeNull();
    // Her dom side: it counts, toward sadism.
    expect(t.records.domWins).toBe(1);
    expect(t.records.subWins).toBe(0);
  });

  it("pushes her toward a side: giving in toward masochism, facing them down toward sadism", () => {
    const sub = { ...newRecords(), subWins: 3 };
    const dom = { ...newRecords(), domWins: 5 };
    const progressOf = (id: string, records: Records) => PASSIVES.find((p) => p.id === id)!.progress({ records } as never);
    expect(progressOf("stingingCheeks", sub)).toEqual(progressOf("stingingCheeks", { ...newRecords(), rough: 3 }));
    expect(progressOf("firmHand", dom)).toEqual(progressOf("firmHand", { ...newRecords(), slapped: 5 }));
    expect(progressOf("stingingCheeks", dom)).toEqual(progressOf("stingingCheeks", newRecords()));
  });

  it("never lands without asking when she's too drunk to say yes", () => {
    const t = served({ agreed: true }, (tavern) => (tavern.drunk = 1));
    expect(labels(t)).toEqual(["Slap them", "Pull away"]);
    expect(t.landedTouch).toBeNull();
  });

  it("does nothing when switched off", () => {
    const t = served({ autoTouch: false, agreed: true });
    expect(labels(t).slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(labels(t)).not.toContain("Always ask me first");
    expect(t.landedTouch).toBeNull();
  });
  it("uses her kink's lines when the check is decided", () => {
    const masochist = PASSIVES.find((p) => p.group === "masochism")!.id;
    const t = served({ agreed: true }, (tavern) => tavern.passives.add(masochist));
    expect(t.kink).toBe("masochism");
    expect(t.talkReplyLines.map((line) => line.text)).toContain(KINK_TALK.masochism.sub[0]);
  });
});

describe("talk shaped by her kink", () => {
  it("is plain with no kink passives, and follows the group she has most of", () => {
    expect(kinkOf([])).toBe("plain");
    const of = (group: string) => PASSIVES.filter((p) => p.group === group).map((p) => p.id);
    expect(kinkOf(of("masochism").slice(0, 1))).toBe("masochism");
    expect(kinkOf([...of("sadism").slice(0, 2), ...of("exhibition").slice(0, 1)])).toBe("sadism");
  });

  it("has every set filled for every kink", () => {
    for (const talk of Object.values(KINK_TALK)) {
      for (const lines of [talk.sub, talk.dom, talk.guestWin, talk.guestFail]) expect(lines.length).toBeGreaterThan(0);
    }
  });
});
