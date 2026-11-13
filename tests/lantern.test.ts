import { describe, expect, it } from "vitest";
import {
  BOOKING_TIME,
  drift,
  fansFromBooking,
  HAPPY_AT,
  GREEDY_PUSH,
  LANTERN_COST,
  LIT_HEAT,
  LIT_RESPECT,
  refuseChance,
  ROOM_COST,
  tamsin,
  type LanternHost,
} from "../src/game/lantern";
import { FANS_DELIGHTED, FANS_HAPPY } from "../src/game/ledger";
import { lanternSupplies } from "../src/game/lanternplans";
import { Tavern, type Guest, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const run = (t: Tavern, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
};
/** Rolls these, in order, then the last one for good. */
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

/** A madam on her first morning: corrupt enough for the brothel, with gold to spend. */
function madam(gold = 100): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.rollRandom = () => 0.5;
  t.corruption = 60;
  t.tick(0, idle); // Her passives are checked, and the brothel opens to her.
  t.gold = gold;
  return t;
}

/** The lantern hung, the room furnished, and tonight lit (or not). */
function lantern(lit = true): Tavern {
  const t = madam();
  t.hangLantern();
  t.furnishRoom();
  t.setLanternLit(lit);
  return t;
}

/**
 * Opens the night and serves the first guest, lustful (or as `before` leaves them), with the Lantern's dice set
 * to `dice` just before she sets the drink down. The first farmer of the night stays away on a lit night, and a
 * soldier (Tamsin's knack) comes in their place.
 */
function served(t: Tavern, dice: () => number, before: (guest: Guest) => void = () => {}): Guest {
  t.random = () => 0;
  t.open();
  t.tick(0, idle);
  run(t, 4);
  const guest = t.guests[0];
  t.guestArrived(guest.id);
  guest.mood = "lust";
  t.interact(0, { kind: "station", station: "tap" });
  run(t, 2);
  t.interact(0, { kind: "station", station: "tap" });
  guest.lust = 10;
  guest.patience = 0.01; // No tip, so no tip chat in the way.
  before(guest);
  t.lantern.random = dice;
  t.interact(0, { kind: "guest", id: guest.id } as Target);
  return guest;
}
const labels = (t: Tavern) => t.talkChoices.map((c) => c.label);
const pick = (t: Tavern, start: string) => t.chooseTalk(labels(t).findIndex((l) => l.startsWith(start)));

/** Plays out the rest of the night and goes to bed: the Lantern's night is settled at bedtime. */
function toDawn(t: Tavern): void {
  if (t.phase === "day") t.open();
  t.tick(0, idle);
  t.random = () => 0.99; // Nobody starts trouble while the room empties.
  for (let i = 0; i < 6000 && t.phase === "service"; i++) {
    t.tick(0.1, idle);
    for (const guest of [...t.guests]) {
      if (guest.status === "arriving") t.guestArrived(guest.id);
      if (guest.status === "leaving") t.guestLeft(guest.id);
    }
  }
  t.chooseLastCall(0);
  t.sleep();
}

describe("building the Lantern", () => {
  it("can't be hung until the brothel is open to her", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.gold = 100;
    expect(t.canHangLantern()).toBe(false);
    expect(lanternSupplies(t)).toEqual([]);
    t.corruption = 60;
    t.tick(0, idle);
    expect(t.houseMode.unlocked.has("brothel")).toBe(true);
    expect(t.canHangLantern()).toBe(true);
  });

  it("hangs the lantern for its price, and Tamsin comes asking for work", () => {
    const t = madam();
    expect(t.canFurnishRoom()).toBe(false);
    t.hangLantern();
    expect(t.lantern.hung).toBe(true);
    expect(t.gold).toBe(100 - LANTERN_COST);
    expect(t.lantern.girls.map((g) => [g.name, g.age])).toEqual([["Tamsin", 26]]);
    expect(t.takeMessages().some((m) => m.includes("Tamsin"))).toBe(true);
    // Once only.
    expect(t.canHangLantern()).toBe(false);
    // Then the plain room upstairs.
    expect(t.canFurnishRoom()).toBe(true);
    t.furnishRoom();
    expect(t.lantern.room).toBe(true);
    expect(t.gold).toBe(100 - LANTERN_COST - ROOM_COST);
  });

  it("is bought and set only by day", () => {
    const t = madam();
    t.open();
    expect(t.canHangLantern()).toBe(false);
    t.hangLantern();
    expect(t.lantern.hung).toBe(false);
  });

  it("puts the lantern, the room, the switch, the house rules and Tamsin on the house plans", () => {
    const t = lantern(false);
    const rows = lanternSupplies(t);
    expect(rows.map((r) => r.name)).toEqual([
      "The lantern",
      "Upstairs room (plain)",
      "Lantern dark tonight",
      "The cut: half to the girl",
      "Rough guests: shown the door",
      "Rest: a night off when she's spent",
      "Drunk guests: turned away from the stairs",
      "Tamsin, 26",
    ]);
    rows[2].buy();
    expect(t.lantern.lit).toBe(true);
    rows[3].buy();
    expect(t.lantern.rules.cut).toBe("greedy");
    expect(lanternSupplies(t)[3].name).toBe("The cut: most to the house");
  });
});

describe("lit or dark", () => {
  it("a lit night costs a little respect, draws a little heat, and changes the crowd", () => {
    const t = lantern(true);
    const farmersPlanned = t.plan.guests.filter((a) => a.kind === "farmer").length;
    t.open();
    t.tick(0, idle);
    expect(t.lantern.litTonight).toBe(true);
    expect(t.persona.respect).toBe(LIT_RESPECT);
    expect(t.heat).toBe(LIT_HEAT);
    // A farmer walking in alone stays home; a soldier comes instead. Parties come as planned.
    expect(t.tonight.filter((a) => a.kind === "farmer").length).toBe(farmersPlanned - 1);
    expect(t.tonight[0].kind).toBe("soldier");
  });

  it("a dark night is a plain tavern night: nobody asks for company", () => {
    const t = lantern(false);
    const guest = served(t, () => 0);
    expect(t.lantern.litTonight).toBe(false);
    expect(t.persona.respect).toBe(0);
    expect(t.heat).toBe(0);
    expect(guest.kind).toBe("farmer");
    expect(t.lantern.chat).toBeNull();
  });

  it("without the room, a lit lantern takes no bookings", () => {
    const t = madam();
    t.hangLantern();
    t.setLanternLit(true);
    served(t, () => 0);
    expect(t.lantern.litTonight).toBe(true);
    expect(t.lantern.chat).toBeNull();
  });
});

describe("a booking", () => {
  it("opens a booking card: the girl, the room, the price", () => {
    const t = lantern();
    served(t, seq(0, 0.99));
    expect(t.inConversation).toBe(true);
    const text = t.talkLines.map((l) => l.text).join(" ");
    expect(text).toContain("Tamsin, 26");
    expect(text).toContain("plain room upstairs");
    expect(text).toContain("13 gold");
    expect(labels(t)).toEqual(["Send them up to Tamsin (13 gold)", "Turn them away", "Get back to work"]);
    expect(t.talkChoices[2].disabled).toBe(true);
  });

  it("accepted: she takes them up, the room is busy, and they come down and pay", () => {
    const t = lantern();
    const guest = served(t, seq(0, 0.99));
    const gold = t.gold;
    pick(t, "Send them up");
    expect(t.lantern.busy).toBe(true);
    expect(guest.status).toBe("leaving");
    // The heroine isn't part of it: no scene for her, nothing asked of her.
    expect(t.takeAdultScene()).toBeNull();
    pick(t, "Get back to work");
    expect(t.inConversation).toBe(false);
    const fans = t.fansTonight;
    run(t, BOOKING_TIME + 1);
    // They came down grinning: delighted, and that's fans at dawn like a guest who ate well.
    expect(t.fansTonight).toBe(fans + FANS_DELIGHTED);
    expect(t.lantern.busy).toBe(false);
    // 13 gold and a 2 gold tip (charm 6, a soldier: her knack). Half to Tamsin, rounded her way.
    expect(t.lantern.tonight).toMatchObject({ bookings: 1, takings: 7, cut: 8 });
    expect(t.gold).toBe(gold + 7);
    expect(t.lantern.girls[0].records.bookings).toBe(1);
    expect(t.lantern.girls[0].purse).toBe(8);
  });

  it("satisfied upstairs earns fans like satisfied at the table; sour earns none", () => {
    expect(fansFromBooking(HAPPY_AT)).toBe(FANS_DELIGHTED);
    expect(fansFromBooking(5)).toBe(FANS_HAPPY);
    expect(fansFromBooking(2)).toBe(0);
  });

  it("turned away by the madam: the guest stays at their table", () => {
    const t = lantern();
    const guest = served(t, seq(0, 0.99));
    pick(t, "Turn them away");
    expect(t.lantern.busy).toBe(false);
    expect(guest.status).toBe("eating");
    expect(guest.mood).toBe("gloomy");
    expect(t.lantern.tonight.turnedAway).toBe(1);
    expect(t.talkChoices.at(-1)?.disabled).toBe(false);
  });

  it("Tamsin can refuse, and her no is the end of it", () => {
    const t = lantern();
    const guest = served(t, seq(0, 0));
    pick(t, "Send them up");
    expect(t.lantern.busy).toBe(false);
    expect(guest.status).toBe("eating");
    expect(t.lantern.girls[0].records.refused).toBe(1);
    // Nothing left to choose but going back to work: no asking twice, no pressing her.
    expect(labels(t)).toEqual(["Get back to work"]);
    expect(t.talkLines.map((l) => l.text).join(" ")).toContain("Not this one");
  });

  it("she always has a chance to refuse, rough and drunk guests most", () => {
    const girl = tamsin();
    const plain = { rough: false, drunk: false, kind: "soldier" as const };
    expect(refuseChance(girl, plain, false)).toBeGreaterThan(0);
    expect(refuseChance(girl, { ...plain, rough: true }, false)).toBeGreaterThan(refuseChance(girl, plain, false));
    expect(refuseChance(girl, { ...plain, drunk: true }, false)).toBeGreaterThan(refuseChance(girl, plain, false));
    expect(refuseChance(girl, plain, true)).toBeGreaterThan(refuseChance(girl, plain, false));
  });

  it("only one booking at a time: nobody asks while the room is busy", () => {
    const t = lantern();
    served(t, seq(0, 0.99));
    pick(t, "Send them up");
    pick(t, "Get back to work");
    run(t, 8); // The next guest walks in, with the room still busy.
    expect(t.lantern.busy).toBe(true);
    const next = t.guests.find((g) => g.status !== "leaving");
    expect(next).toBeDefined();
    // Turned down before the house is even asked about.
    expect(t.lantern.maybeAsk(next!, {} as LanternHost)).toBe(false);
  });

  it("last call waits for the room, and bedtime settles the night in the morning report", () => {
    const t = lantern();
    served(t, seq(0, 0.99));
    pick(t, "Send them up");
    pick(t, "Get back to work");
    toDawn(t);
    expect(t.phase).toBe("dawn");
    const lines = t.lantern.dawnLines();
    expect(lines[0]).toBe("The Lantern: 1 booking, 7 gold in room takings, 8 gold to the girls.");
    expect(lines[1]).toMatch(/^Tamsin is (happy|steady)/);
  });
});

describe("house rules", () => {
  it("the greedy cut keeps most for the house, and costs her loyalty", () => {
    const t = lantern();
    t.setHouseRule("cut", "greedy");
    served(t, seq(0, 0.99));
    const loyalty = t.lantern.girls[0].loyalty;
    pick(t, "Send them up");
    run(t, BOOKING_TIME + 1);
    expect(t.lantern.tonight).toMatchObject({ takings: 11, cut: 4 });
    expect(t.lantern.girls[0].loyalty).toBeLessThan(loyalty);
  });

  it("fair: drunk guests are turned away from the stairs; greedy lets them up", () => {
    const fair = lantern();
    served(fair, seq(0, 0.99), (g) => (g.mood = "drunk"));
    expect(labels(fair)[0]).toContain("no drunks on the stairs");
    expect(fair.talkChoices[0].disabled).toBe(true);
    expect(fair.talkChoices[1].disabled).toBe(false);

    const greedy = lantern();
    greedy.setHouseRule("drunk", "greedy");
    served(greedy, seq(0, 0.99), (g) => (g.mood = "drunk"));
    expect(greedy.talkChoices[0].disabled).toBe(false);
  });

  it("fair: a rough guest is shown the door", () => {
    const t = lantern();
    const guest = served(t, seq(0, 0.99), (g) => (g.mood = "angry"));
    expect(labels(t)[0]).toContain("no rough guests");
    pick(t, "Show them the door");
    expect(guest.status).toBe("leaving");
    expect(t.lantern.busy).toBe(false);
  });

  it("fair rest: once her stamina's spent she takes the night off, and is rested by morning", () => {
    const t = lantern();
    const girl = t.lantern.girls[0];
    girl.fatigue = girl.stamina;
    served(t, () => 0);
    expect(t.lantern.chat).toBeNull();
    toDawn(t);
    expect(girl.fatigue).toBe(0);
  });

  it("greedy rest: she works on tired, and guests come down less pleased", () => {
    const t = lantern();
    t.setHouseRule("rest", "greedy");
    const girl = t.lantern.girls[0];
    girl.fatigue = girl.stamina;
    served(t, seq(0, 0.99));
    pick(t, "Send them up");
    run(t, BOOKING_TIME + 1);
    // Charm 6 + knack 2 - tired 2: no tip.
    expect(t.lantern.tonight).toMatchObject({ bookings: 1, takings: 6, cut: 7 });
  });
});

describe("corruption spreads", () => {
  it("drifts a tenth of the gap toward the madam, slowed by resolve, and falls at half speed", () => {
    expect(drift(40, 140, 0)).toBeCloseTo(50);
    expect(drift(40, 140, 10)).toBeCloseTo(45);
    expect(drift(140, 40, 0)).toBeCloseTo(135);
    expect(drift(50, 50, 5)).toBe(50);
  });

  it("each lit night drifts Tamsin toward the madam, and greedy rules push harder", () => {
    const fair = lantern();
    const start = fair.lantern.girls[0].corruption;
    fair.corruption = 145;
    fair.open();
    toDawn(fair);
    const drifted = fair.lantern.girls[0].corruption;
    expect(drifted).toBeGreaterThan(start);
    expect(drifted).toBeLessThan(start + 10);

    const greedy = lantern();
    greedy.setHouseRule("cut", "greedy");
    greedy.corruption = 145;
    greedy.open();
    toDawn(greedy);
    expect(greedy.lantern.girls[0].corruption).toBeCloseTo(drifted + GREEDY_PUSH, 0);
    // The greedy rule touches the madam too: running the Lantern alone doesn't.
    expect(greedy.corruption).toBeGreaterThan(fair.corruption);
  });

  it("dark nights leave her be", () => {
    const t = lantern(false);
    const start = t.lantern.girls[0].corruption;
    t.corruption = 145;
    t.open();
    toDawn(t);
    expect(t.lantern.girls[0].corruption).toBe(start);
    expect(t.lantern.dawnLines()).toEqual(["The lantern stayed dark last night."]);
  });

  it("with no loyalty left, she quits", () => {
    const t = lantern();
    t.setHouseRule("cut", "greedy");
    t.lantern.girls[0].loyalty = 1;
    t.open();
    toDawn(t);
    expect(t.lantern.girls[0].quit).toBe(true);
    expect(t.lantern.available).toBeNull();
    expect(t.lantern.dawnLines().join(" ")).toContain("Velvet House");
  });
});

describe("saving the Lantern", () => {
  it("keeps the lamp, the room, tonight's choice, the rules and Tamsin", () => {
    const t = lantern();
    t.setHouseRule("cut", "greedy");
    t.setHouseRule("drunk", "greedy");
    t.lantern.girls[0].loyalty = 41;
    t.lantern.girls[0].records.bookings = 7;
    const save = t.snapshot();
    expect(save.lantern).toBeDefined();
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(JSON.parse(JSON.stringify(save)));
    expect(loaded.lantern.save()).toEqual(t.lantern.save());
    expect(loaded.snapshot()).toEqual({ ...save, tapLeft: loaded.tapLeft });
  });

  it("an older save, or a game without the lantern, has none", () => {
    const t = madam();
    const save = t.snapshot();
    expect(save.lantern).toBeUndefined();
    const loaded = lantern();
    loaded.restore(save);
    expect(loaded.lantern.hung).toBe(false);
    expect(loaded.lantern.girls).toEqual([]);
  });

  it("a broken Lantern save loses what's broken, not the night", () => {
    const t = madam();
    t.restore({ ...t.snapshot(), lantern: { hung: true, room: "yes", lit: true, rules: { cut: "evil" }, girls: [{ id: "tamsin", loyalty: "x" }] } as never });
    expect(t.lantern.hung).toBe(true);
    expect(t.lantern.room).toBe(false);
    expect(t.lantern.rules.cut).toBe("fair");
    expect(t.lantern.girls[0].loyalty).toBe(tamsin().loyalty);
  });
});
