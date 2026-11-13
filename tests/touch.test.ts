import { describe, expect, it } from "vitest";
import {
  afterLine,
  desireNeeded,
  nerve,
  pickTouch,
  reachChance,
  readTouchMemory,
  touchAnswers,
  touchesFor,
  touchLands,
  touchOutcome,
  GIVE_IN_MARGIN,
  intensityBonus,
  type NerveFacts,
} from "../src/game/touch";
import { TOUCHES } from "../src/game/touchtalk";
import { METERS } from "../src/game/passives";
import { Tavern, type Target } from "../src/game/tavern";

const calm: NerveFacts = { kind: "farmer", lust: 0, mood: "calm", respect: 0, lowRespect: -3, highRespect: 4, allowed: 0, slapped: false };
const byId = (id: string) => TOUCHES.find((t) => t.id === id)!;
const none = { canStrip: true, seen: new Set<string>() };

describe("the touches", () => {
  it("run from 1 to 10, five or more at every level, each with its own id", () => {
    for (let level = 1; level <= 10; level++) {
      expect(TOUCHES.filter((t) => t.level === level).length).toBeGreaterThanOrEqual(4);
    }
    expect(new Set(TOUCHES.map((t) => t.id)).size).toBe(TOUCHES.length);
    expect(TOUCHES.length).toBeGreaterThanOrEqual(50);
  });

  it("only use {piece} in touches that take clothes", () => {
    for (const touch of TOUCHES.filter((t) => !t.strip)) {
      expect([touch.reach, touch.allow, touch.lean, ...touch.thoughts].join(" ")).not.toContain("{piece}");
    }
  });
});

describe("a guest's nerve", () => {
  it("grows with lust and with a room that doesn't respect you", () => {
    expect(nerve({ ...calm, lust: 8 })).toBeGreaterThan(nerve(calm));
    expect(nerve({ ...calm, respect: -5 })).toBeGreaterThan(nerve(calm));
    expect(nerve({ ...calm, respect: 6 })).toBeLessThan(nerve({ ...calm, lust: 2 }) + 1);
  });

  it("is bolder from soldiers than farmers, and knocked down by a slap", () => {
    expect(nerve({ ...calm, kind: "soldier" })).toBeGreaterThan(nerve(calm));
    expect(nerve({ ...calm, kind: "soldier", lust: 8, slapped: true })).toBeLessThan(nerve({ ...calm, kind: "soldier", lust: 8 }));
  });

  it("stays between 0 and 10", () => {
    expect(nerve({ ...calm, kind: "soldier", lust: 10, mood: "lust", respect: -10, allowed: 9 })).toBe(10);
    expect(nerve({ ...calm, mood: "scared", respect: 10, slapped: true })).toBe(0);
  });

  it("makes reaching likelier, and a guest with none never reaches", () => {
    expect(reachChance(0)).toBe(0);
    expect(reachChance(6)).toBeGreaterThan(reachChance(2));
  });
});

describe("what a guest reaches for", () => {
  it("is never bolder than their nerve, never a lover's invitation, and fits who they are", () => {
    for (let roll = 0; roll < 1; roll += 0.05) {
      const touch = pickTouch("farmer", 4.5, () => roll, none)!;
      expect(touch.level).toBeLessThanOrEqual(4);
      expect(touch.romance).toBeFalsy();
      expect(touch.kinds.length === 0 || touch.kinds.includes("farmer")).toBe(true);
    }
    expect(touchesFor("soldier", 10, none).some((t) => t.romance)).toBe(false);
  });

  it("leaves clothes alone once there are none left to take", () => {
    expect(touchesFor("soldier", 10, { ...none, canStrip: false }).some((t) => t.strip)).toBe(false);
    expect(touchesFor("soldier", 10, none).some((t) => t.strip)).toBe(true);
  });

  it("is nothing at all without the nerve for the gentlest touch", () => {
    expect(pickTouch("farmer", 0.5, () => 0, none)).toBeNull();
  });
});

describe("her answers", () => {
  const kiss = byId("kiss");

  it("are only slap or pull away until her desire reaches what the touch needs", () => {
    const facts = { sloppy: false, guestSloppy: false };
    expect(touchAnswers(kiss, { ...facts, desire: desireNeeded(kiss.level) - 0.5 })).toEqual(["slap", "pull"]);
    expect(touchAnswers(kiss, { ...facts, desire: desireNeeded(kiss.level) })).toEqual(["allow", "slap", "pull"]);
    expect(touchAnswers(kiss, { ...facts, desire: desireNeeded(kiss.level) + 2 })).toEqual(["allow", "lean", "slap", "pull"]);
  });

  it("are only slap or pull away when either of them has had far too much", () => {
    expect(touchAnswers(kiss, { desire: 10, sloppy: true, guestSloppy: false })).toEqual(["slap", "pull"]);
    expect(touchAnswers(kiss, { desire: 10, sloppy: false, guestSloppy: true })).toEqual(["slap", "pull"]);
  });

  it("always end with slap and pull away, at every desire, so leaving is always there", () => {
    for (const touch of TOUCHES) {
      for (let desire = 0; desire <= 10; desire += 0.5) {
        for (const sloppy of [false, true]) {
          const answers = touchAnswers(touch, { desire, sloppy, guestSloppy: false });
          expect(answers.slice(-2)).toEqual(["slap", "pull"]);
        }
      }
    }
    expect(touchLands("pull")).toBe(false);
    expect(touchLands("slap")).toBe(false);
  });

  it("add Give in beside the others once her desire runs well past the touch, never in place of them", () => {
    const facts = { sloppy: false, guestSloppy: false };
    const justUnder = desireNeeded(kiss.level) + GIVE_IN_MARGIN - 0.5;
    expect(touchAnswers(kiss, { ...facts, desire: justUnder })).not.toContain("givein");
    expect(touchAnswers(kiss, { ...facts, desire: desireNeeded(kiss.level) + GIVE_IN_MARGIN })).toEqual(["allow", "lean", "givein", "slap", "pull"]);
    // Too drunk on either side, and there's no yes of any kind.
    expect(touchAnswers(kiss, { desire: 10, sloppy: true, guestSloppy: false })).toEqual(["slap", "pull"]);
    expect(touchLands("givein")).toBe(true);
  });

  it("pays more for giving in than for letting it, and less than for leaning in", () => {
    const allow = touchOutcome(kiss, "allow");
    const givein = touchOutcome(kiss, "givein");
    const lean = touchOutcome(kiss, "lean");
    expect(givein.gold).toBeGreaterThan(allow.gold);
    expect(givein.gold).toBeLessThan(lean.gold);
    expect(givein.respect).toBeGreaterThanOrEqual(lean.respect);
  });

  it("only adds an intensity bonus for bold touches", () => {
    expect(intensityBonus(3)).toEqual({ gold: 0, meter: 0 });
    expect(intensityBonus(6).gold).toBeGreaterThan(0);
    expect(intensityBonus(9).gold).toBeGreaterThan(intensityBonus(6).gold);
  });

  it("pay and cost more the bolder the touch and the further she goes", () => {
    const allow = touchOutcome(kiss, "allow");
    const lean = touchOutcome(kiss, "lean");
    expect(lean.gold).toBeGreaterThan(allow.gold);
    expect(lean.respect).toBeLessThan(allow.respect);
    expect(touchOutcome(byId("squeeze"), "allow").gold).toBeGreaterThan(touchOutcome(byId("fingers"), "allow").gold);
    expect(touchOutcome(byId("squeeze"), "slap").respect).toBeGreaterThan(0);
    expect(touchOutcome(byId("squeeze"), "slap").mood).toBe("angry");
  });

  it("are shocked the first time and teasing once she's used to it", () => {
    expect(afterLine("lips", 0)?.thought).toBe(true);
    expect(afterLine("lips", 1)).toBeNull();
    expect(afterLine("lips", 3)?.thought).toBe(false);
  });
});

describe("touch memory", () => {
  it("survives a broken save", () => {
    expect(readTouchMemory(null)).toEqual({ lets: {} });
    expect(readTouchMemory({ desire: 99, lets: { lips: 2, nonsense: 4, rear: -1 } })).toEqual({ lets: { lips: 2 } });
  });
});

describe("in the tavern", () => {
  const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
  const idle = { listeningTo: null, night: true };
  const run = (t: Tavern, seconds: number) => {
    for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
  };
  const at = (id: number): Target => ({ kind: "guest", id });

  /** A lustful guest served late enough that they don't tip, so they reach for you instead, with chance at 0. */
  function served(body: "Female" | "Male", desire = 0): Tavern {
    const t = new Tavern(TABLES.length, TABLES);
    t.random = () => 0;
    t.playerBody = body;
    t.open();
    for (const m of METERS) t.meters[m] = desire * 10;
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
    t.interact(0, at(guest.id));
    return t;
  }

  it("has a bold guest reach for the innkeeper sister as she serves them", () => {
    const t = served("Female");
    expect(t.inConversation).toBe(true);
    const labels = t.talkChoices.map((c) => c.label);
    // Saying no can carry a willpower cost after it (" · 4 will") when part of her is tempted.
    expect(labels.slice(-2).map((l) => l.split(" · ")[0])).toEqual(["Slap them", "Pull away"]);
    // With no desire yet, she's not ready to lean into anything.
    expect(labels).not.toContain("Lean into it");
  });

  it("leaves the brother alone, for now", () => {
    expect(served("Male").inConversation).toBe(false);
  });

  /** The boldness of the touch the guest reaches with, which is the same whatever her desire. */
  const reachLevel = (): number => (served("Female") as unknown as { touchChat: { touch: { level: number } } }).touchChat.touch.level;

  it("pays her, makes her bolder and plays out on screen when she lets it happen", () => {
    // Ready for it, but not so far past it that she can't pull away.
    const t = served("Female", desireNeeded(reachLevel()) + 1);
    const gold = t.gold;
    const before = Math.max(...METERS.map((m) => t.meters[m]));
    const allow = t.talkChoices.findIndex((c) => c.label === "Let it happen" || c.label === "Let them take it");
    expect(allow).toBeGreaterThanOrEqual(0);
    t.chooseTalk(allow);
    expect(t.gold).toBeGreaterThan(gold);
    expect(Math.max(...METERS.map((m) => t.meters[m]))).toBeGreaterThan(before);
    expect(t.takeTouchMoment()?.answer).toBe("allow");
    expect(t.takeTouchMoment()).toBeNull();
    expect(t.talkChoices.map((c) => c.label)).toEqual(["Get back to work"]);
    t.chooseTalk(0);
    expect(t.inConversation).toBe(false);
  });

  it("still lets her pull away when she wants it badly, and offers Give in as well", () => {
    expect(desireNeeded(reachLevel()) + GIVE_IN_MARGIN).toBeLessThanOrEqual(10);
    const t = served("Female", 10);
    const labels = t.talkChoices.map((c) => c.label.split(" · ")[0]);
    expect(labels.slice(-2)).toEqual(["Slap them", "Pull away"]);
    expect(labels.some((l) => l.startsWith("Give in"))).toBe(true);
    // No bar while she's still choosing.
    expect(t.landedTouch).toBeNull();
    const pulled = t.records.pulled;
    t.chooseTalk(labels.indexOf("Pull away"));
    expect(t.records.pulled).toBe(pulled + 1);
    expect(t.takeTouchMoment()?.answer).toBe("pull");
    expect(Object.values(t.touchMemory.lets).reduce((a, n) => a + (n ?? 0), 0)).toBe(0);
    // A no never shows the bar either.
    expect(t.landedTouch).toBeNull();
  });

  it("lands the touch, and shows the intensity bar after, when she chooses to give in", () => {
    const t = served("Female", 10);
    const gold = t.gold;
    const giveIn = t.talkChoices.findIndex((c) => c.label.startsWith("Give in"));
    expect(giveIn).toBeGreaterThanOrEqual(0);
    t.chooseTalk(giveIn);
    expect(t.gold).toBeGreaterThan(gold);
    expect(Object.values(t.touchMemory.lets).reduce((a, n) => a + (n ?? 0), 0)).toBe(1);
    expect(t.takeTouchMoment()?.answer).toBe("givein");
    expect(t.landedTouch?.answer).toBe("givein");
    expect(t.talkChoices.map((c) => c.label)).toEqual(["Get back to work"]);
  });

  it("keeps what she's let happen across a save, and forgets tonight's desire by morning", () => {
    const t = served("Female", 10);
    t.chooseTalk(0);
    const save = t.snapshot();
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(save);
    expect(loaded.touchMemory.lets).toEqual(t.touchMemory.lets);
    expect(loaded.records.leans + loaded.records.pulled + loaded.records.slapped).toBe(t.records.leans + t.records.pulled + t.records.slapped);
    expect(METERS.every((m) => loaded.meters[m] === 0)).toBe(true);
  });
});
