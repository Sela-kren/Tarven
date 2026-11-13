import { describe, expect, it } from "vitest";
import { GRAB_CAUGHT, GRAB_LET, GRAB_MAX, GRAB_SLAP, GRAB_TWIST, grabChance } from "../src/game/grab";
import { earned, effectsOf, PASSIVE_BY_ID } from "../src/game/passives";
import { pickTouch, touchesFor } from "../src/game/touch";
import { defaultTouchSettings, HELD_PUSH, impulseCheck, type TouchSettings } from "../src/game/touchsettings";
import { Tavern, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const run = (t: Tavern, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
};

/** A bold, lustful guest who grabs her as she serves them (every roll at 0), with the touch settings given. */
function grabbed(settings: Partial<TouchSettings> = {}): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.random = () => 0;
  t.grabRandom = () => 0;
  t.playerBody = "Female";
  t.touchSettings = { ...defaultTouchSettings(), upTo: 9, ...settings };
  t.open();
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
  t.interact(0, { kind: "guest", id: guest.id } as Target);
  return t;
}
const labels = (t: Tavern) => t.talkChoices.map((c) => c.label.split(" · ")[0]);
const choose = (t: Tavern, label: string) => t.chooseTalk(labels(t).indexOf(label));
const OFF = { autoTouch: true, agreed: true };

describe("a grab at the table, Consent on", () => {
  it("stops her as she serves, and she answers it: twist free, slap, or let them hold her", () => {
    const t = grabbed();
    expect(t.inConversation).toBe(true);
    expect(labels(t)).toEqual([GRAB_TWIST, GRAB_SLAP, GRAB_LET, "Get back to work"]);
    // They say something with hold of her, and she thinks something back.
    expect(t.talkLines.some((l) => l.speaker !== undefined && l.speaker !== "You" && l.text.startsWith("\""))).toBe(true);
    expect(t.talkLines.at(-1)?.speaker).toBe("You");
    // She has to answer it first.
    expect(t.talkChoices.at(-1)?.disabled).toBe(true);
    expect(t.records.grabbed).toBe(1);
  });

  it("always lets her twist free, and nothing comes off", () => {
    const t = grabbed();
    choose(t, GRAB_TWIST);
    expect(t.records.grabsBroken).toBe(1);
    expect(t.stripped).toBe(0);
    expect(t.talkReplyLines.length).toBeGreaterThan(1);
    expect(labels(t)).toEqual(["Get back to work"]);
    t.chooseTalk(0);
    expect(t.inConversation).toBe(false);
  });

  it("can be slapped off, which earns respect", () => {
    const t = grabbed();
    const respect = t.persona.respect;
    choose(t, GRAB_SLAP);
    expect(t.persona.respect).toBe(respect + 1);
    expect(t.stripped).toBe(0);
  });

  it("let stand, they go for her clothes, and that still asks, Pull away and all", () => {
    const t = grabbed();
    choose(t, GRAB_LET);
    expect(t.records.grabsAllowed).toBe(1);
    // A strip try with her wrist in their hand, shown fresh: how she let them, then the reach.
    const touch = (t as unknown as { touchChat: { touch: { strip?: boolean; grab?: boolean } } }).touchChat.touch;
    expect(touch.strip).toBe(true);
    expect(t.talkReplyLines[0].speaker).toBe("You");
    expect(labels(t)).toContain("Pull away");
    expect(t.landedTouch).toBeNull();
    choose(t, "Pull away");
    expect(t.stripped).toBe(0);
  });
});

describe("a grab at the table, Consent off", () => {
  it("just happens: no answer to the grab, straight to what they try, weighed with their grip on their side", () => {
    const t = grabbed(OFF);
    expect(labels(t)).not.toContain(GRAB_TWIST);
    expect(t.talkLines.some((l) => GRAB_CAUGHT.includes(l.text))).toBe(true);
    expect(t.lastImpulse?.facts.held).toBe(true);
    const { facts } = t.lastImpulse!;
    expect(impulseCheck(facts).push).toBe(impulseCheck({ ...facts, held: false }).push + HELD_PUSH);
  });
});

describe("how often", () => {
  it("goes by kind, nerve and mood, and never past the most", () => {
    expect(grabChance("bandit", 5, false)).toBeGreaterThan(grabChance("farmer", 5, false));
    expect(grabChance("soldier", 7, false)).toBeGreaterThan(grabChance("soldier", 3, false));
    expect(grabChance("soldier", 5, true)).toBeGreaterThan(grabChance("soldier", 5, false));
    expect(grabChance("bandit", 10, true, 2)).toBe(GRAB_MAX);
    expect(grabChance("bandit", 10, true, -1)).toBe(0);
  });

  it("never happens without dice to roll it (the tests' default)", () => {
    const t = new Tavern(TABLES.length, TABLES);
    expect(t.grabRandom).toBeNull();
  });
});

describe("the held touches", () => {
  const options = { canStrip: true, seen: new Set<string>() };

  it("only come once a guest has hold of her, from any kind", () => {
    expect(touchesFor("farmer", 7, options).some((t) => t.grab)).toBe(false);
    const held = touchesFor("farmer", 7, { ...options, held: true });
    expect(held.filter((t) => t.grab).map((t) => t.id)).toEqual(["heldTug", "heldYank", "heldPeel"]);
    // ...and never with nothing left to take.
    expect(touchesFor("farmer", 7, { ...options, canStrip: false, held: true }).some((t) => t.strip)).toBe(false);
  });

  it("go for her clothes, while she has any left to take", () => {
    for (let i = 0; i < 20; i++) expect(pickTouch("bandit", 7, () => i / 20, { ...options, held: true })?.strip).toBe(true);
    expect(pickTouch("bandit", 7, () => 0, { ...options, canStrip: false, held: true })?.strip).toBeFalsy();
  });
});

describe("its passives", () => {
  it("are earned at the table: breaking holds makes her slipperier, letting them hold her pays", () => {
    const t = new Tavern(TABLES.length, TABLES);
    const facts = t.passiveFacts();
    const slippery = PASSIVE_BY_ID.get("slippery")!;
    const heldFast = PASSIVE_BY_ID.get("heldFast")!;
    expect(earned(slippery, facts)).toBe(false);
    facts.records.grabsBroken = 8;
    facts.records.grabsAllowed = 6;
    expect(earned(slippery, facts)).toBe(true);
    expect(earned(heldFast, facts)).toBe(true);
    expect(effectsOf(new Set(["slippery"])).grab).toBeCloseTo(-0.3);
    const held = effectsOf(new Set(["heldFast"]));
    expect(held.grab).toBeCloseTo(0.25);
    expect(held.grabGold).toBe(2);
  });

  it("Held Fast pays when she lets them hold her", () => {
    const t = grabbed();
    t.effects.grabGold = 2;
    const gold = t.gold;
    choose(t, GRAB_LET);
    expect(t.gold).toBe(gold + 2);
  });
});
