import { describe, expect, it } from "vitest";
import { METERS } from "../src/game/passives";
import { Tavern, type Target } from "../src/game/tavern";
import { TOUCHES } from "../src/game/touchtalk";
import { autoTouchFits, defaultTouchSettings, impulsive, readTouchSettings, type TouchSettings } from "../src/game/touchsettings";

const byId = (id: string) => TOUCHES.find((t) => t.id === id)!;

describe("eager guests touching without asking", () => {
  it("starts switched on but not agreed to, up to boldness 5, 20% of the time", () => {
    expect(defaultTouchSettings()).toEqual({ autoTouch: true, agreed: false, upTo: 5, chance: 0.2 });
    // No browser storage here: the defaults stand.
    expect(readTouchSettings()).toEqual(defaultTouchSettings());
  });

  it("only counts a lustful guest with the nerve to do it as impulsive", () => {
    expect(impulsive("lust", 5)).toBe(true);
    expect(impulsive("lust", 4)).toBe(false);
    expect(impulsive("calm", 9)).toBe(false);
  });

  it("only covers touches she could say yes to, within the boldness chosen, never clothes or the invitation", () => {
    const s: TouchSettings = { ...defaultTouchSettings(), agreed: true, upTo: 9 };
    const waist = byId("waist");
    expect(autoTouchFits(s, waist, ["allow", "slap", "pull"])).toBe(true);
    // Not when she couldn't say yes anyway: her desire's too low, or someone's too drunk.
    expect(autoTouchFits(s, waist, ["slap", "pull"])).toBe(false);
    expect(autoTouchFits({ ...s, upTo: waist.level - 1 }, waist, ["allow", "slap", "pull"])).toBe(false);
    const strip = TOUCHES.find((t) => t.strip)!;
    expect(autoTouchFits(s, strip, ["allow", "slap", "pull"])).toBe(false);
    const invite = TOUCHES.find((t) => t.region === "invite")!;
    expect(autoTouchFits({ ...s, upTo: 10 }, invite, ["allow", "slap", "pull"])).toBe(false);
  });
});

describe("in the tavern", () => {
  const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
  const idle = { listeningTo: null, night: true };
  const run = (t: Tavern, seconds: number) => {
    for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
  };

  /** A lustful, bold guest reaching as she serves them, with the touch settings given and every chance at 0. */
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
    expect(options[0]).toMatch(/let eager guests skip asking \(20% of the time\)/);
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

  it("lands without the question once agreed, with the Force bar filling fast", () => {
    const t = served({ agreed: true, chance: 1 });
    expect(t.talkChoices.map((c) => c.label)).toEqual(["Get back to work"]);
    expect(t.landedTouch?.impulse).toBe(true);
    expect(t.takeTouchMoment()?.answer).toBe("allow");
  });

  it("still asks when the chance doesn't come up: not every time", () => {
    const t = served({ agreed: true, chance: 0 });
    expect(labels(t).slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(t.landedTouch).toBeNull();
  });

  it("never lands without asking when she's too drunk to say yes", () => {
    const t = served({ agreed: true, chance: 1 }, (tavern) => (tavern.drunk = 1));
    expect(labels(t)).toEqual(["Slap them", "Pull away"]);
    expect(t.landedTouch).toBeNull();
  });

  it("does nothing when switched off", () => {
    const t = served({ autoTouch: false, agreed: true, chance: 1 });
    expect(labels(t).slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(labels(t)).not.toContain("Always ask me first");
    expect(t.landedTouch).toBeNull();
  });
});
