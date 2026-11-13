import { describe, expect, it } from "vitest";
import { Chatter } from "../src/game/chatter";
import { GRAB_AT_ORDER } from "../src/game/grab";
import { defaultRole, ROLES } from "../src/game/guestroles";
import { Tavern, type Guest, type GuestKind, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const run = (t: Tavern, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
};
const at = (guest: Guest): Target => ({ kind: "guest", id: guest.id });
const tap: Target = { kind: "station", station: "tap" };

/** The first guest of the night, sat down, in a tavern where she takes the orders. */
function seated(setup: (t: Tavern) => void = () => {}): { t: Tavern; guest: Guest } {
  const t = new Tavern(TABLES.length, TABLES);
  t.takeOrders = true;
  t.random = () => 0;
  setup(t);
  t.open();
  t.tick(0, idle);
  run(t, 4);
  const guest = t.guests[0];
  t.takeMessages();
  t.guestArrived(guest.id);
  return { t, guest };
}

describe("taking orders", () => {
  it("has a guest sit calling her over, and say so in the log", () => {
    const { t, guest } = seated();
    expect(guest.status).toBe("waiting");
    expect(guest.ordered).toBe(false);
    expect(t.takeMessages().join(" ")).toMatch(/at table \w+ is calling you over/);
    expect(t.prompt(0, at(guest))).toEqual({ label: "Take their order", actionable: true });
  });

  it("won't let her serve them before she's asked, even holding the right thing", () => {
    const { t, guest } = seated();
    t.interact(0, tap);
    run(t, 2);
    t.interact(0, tap);
    expect(t.carrying[0]).toBe(guest.order);
    expect(t.prompt(0, at(guest))?.label).toBe("Take their order");
    const gold = t.gold;
    t.interact(0, at(guest));
    // That took the order; it didn't serve it.
    expect(guest.ordered).toBe(true);
    expect(guest.status).toBe("waiting");
    expect(t.gold).toBe(gold);
    expect(t.takeMessages().join(" ")).toContain(`wants an ${guest.order}`);
    // Now she knows, and can.
    expect(t.prompt(0, at(guest))?.label).toBe(`Serve ${guest.order}`);
    t.interact(0, at(guest));
    expect(guest.status).toBe("eating");
  });

  it("can be when they grab her, leaning in to listen", () => {
    const { t, guest } = seated((t) => {
      t.playerBody = "Female";
      t.grabRandom = () => 0;
    });
    t.interact(0, at(guest));
    expect(guest.ordered).toBe(true);
    expect(t.inConversation).toBe(true);
    expect(GRAB_AT_ORDER).toContain(t.talkLines[0].text);
  });

  it("is skipped where guests say what they want as they sit (the tests' default)", () => {
    const t = new Tavern(TABLES.length, TABLES);
    expect(t.takeOrders).toBe(false);
  });
});

describe("what they call out", () => {
  const guest = (kind: GuestKind, ordered: boolean): Guest => ({
    id: 1,
    kind,
    role: defaultRole(kind),
    stats: ROLES[defaultRole(kind)],
    female: false,
    look: 0,
    order: "stew",
    ordered,
    seat: 0,
    status: "waiting",
    patience: 50,
    maxPatience: 50,
    eatLeft: 10,
    rumor: false,
    listened: 0,
    party: null,
    mood: "calm",
    lust: 0,
    desires: 0,
  });
  const update = (chatter: Chatter, guests: Guest[], seconds: number) => {
    for (let i = 0; i < seconds * 10; i++) chatter.update(0.1, guests, [], () => false);
  };

  it("before she's asked: calling her over, never what they want", () => {
    for (const kind of ["farmer", "soldier", "noble", "bandit"] as GuestKind[]) {
      const chatter = new Chatter(() => 0);
      const g = guest(kind, false);
      update(chatter, [g], 1);
      expect(chatter.saying(1)?.tone, kind).toBe("call");
      expect(chatter.saying(1)?.text.toLowerCase(), kind).not.toContain("stew");
      // Half their patience gone, still nobody's asked.
      g.patience = 20;
      update(chatter, [g], 8);
      expect(chatter.saying(1)?.text.toLowerCase() ?? "", kind).not.toContain("stew");
    }
  });

  it("the moment she asks: what they want, out loud", () => {
    const chatter = new Chatter(() => 0);
    const g = guest("farmer", false);
    update(chatter, [g], 1);
    g.ordered = true;
    update(chatter, [g], 0.1);
    expect(chatter.saying(1)?.text.toLowerCase()).toContain("stew");
  });
});
