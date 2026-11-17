import { describe, expect, it } from "vitest";
import {
  FAME_NERVE_AT,
  JOIN_MAX,
  JOIN_NERVE,
  LAST_CLEAR_LINES,
  joinChance,
  REDRESS_ON_AT,
  REDRESS_PATIENCE,
  REDRESS_SECONDS,
  roomNerve,
  SOBER_NIGHT_SERVED,
  trayDropChance,
} from "../src/game/barwork";
import { Tavern, type Guest } from "../src/game/tavern";
import { METERS } from "../src/game/passives";

/** Her desire caps all lifted (passives.ts desireCap): a heroine far enough along for the boldest things. */
function openCaps(t: Tavern): void {
  for (const m of METERS) {
    t.passives.add(`cap1_${m}`);
    t.passives.add(`cap2_${m}`);
  }
  (t as unknown as { refreshEffects(): void }).refreshEffects();
}

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const run = (t: Tavern, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
};

/** Her tavern mid-service, with every roll at 0 and guests in their seats. */
function serving(guests = 1): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.random = () => 0;
  t.playerBody = "Female";
  t.open();
  t.tick(0, idle);
  for (let i = 0; i < 600 && t.guests.length < guests; i++) t.tick(0.1, idle);
  run(t, 1);
  for (const g of t.guests) t.guestArrived(g.id);
  return t;
}

// The rules reached into, for setting a moment up directly.
type Inside = {
  takeDrink(): void;
  maybeJoin(chat: object, guest: Guest): void;
  startJoin(): void;
  maybeDropTray(chat: object, guest: Guest | undefined): void;
  touchChat: { guestId: number; lines: { text: string }[] } | null;
  carrying: (string | null)[];
  carryCount: number[];
};
const inside = (t: Tavern) => t as unknown as Inside;

describe("the table joins in", () => {
  it("needs nerve, is likelier the bolder and looser they are, and never certain", () => {
    expect(joinChance(JOIN_NERVE - 1, true)).toBe(0);
    expect(joinChance(7, false)).toBeGreaterThan(joinChance(4, false));
    expect(joinChance(5, true)).toBeGreaterThan(joinChance(5, false));
    expect(joinChance(10, true)).toBe(JOIN_MAX);
  });

  it("sends a tablemate who watched her let a hand stay, as a reach she's asked about like any other", () => {
    const t = serving(2);
    const [first, mate] = t.guests;
    for (const g of [first, mate]) {
      g.party = 99;
      g.status = "eating";
      g.lust = 10;
      g.mood = "lust";
    }
    inside(t).maybeJoin({ joined: [first.id], reply: [] }, first);
    inside(t).startJoin();
    const chat = inside(t).touchChat;
    expect(chat?.guestId).toBe(mate.id);
    expect(t.records.tableJoins).toBe(1);
    // Her answers are all there, Pull away included.
    expect(t.talkChoices.map((c) => c.label.split(" · ")[0])).toContain("Pull away");
  });

  it("only sends someone who hasn't had a turn this round", () => {
    const t = serving(2);
    const [first, mate] = t.guests;
    for (const g of [first, mate]) {
      g.party = 99;
      g.status = "eating";
      g.lust = 10;
    }
    inside(t).maybeJoin({ joined: [first.id, mate.id], reply: [] }, first);
    inside(t).startJoin();
    expect(inside(t).touchChat).toBeNull();
  });
});

describe("the tray", () => {
  it("drops more with bolder hands, leaning in or drunk, and less the more agile she is", () => {
    const base = { lean: false, sloppy: false, agility: 1 };
    expect(trayDropChance(8, base)).toBeGreaterThan(trayDropChance(3, base));
    expect(trayDropChance(5, { ...base, lean: true })).toBeGreaterThan(trayDropChance(5, base));
    expect(trayDropChance(5, { ...base, sloppy: true })).toBeGreaterThan(trayDropChance(5, base));
    expect(trayDropChance(5, { ...base, agility: 5 })).toBeLessThan(trayDropChance(5, base));
  });

  it("breaks what's on it and leaves a spill under their seat", () => {
    const t = serving();
    const guest = t.guests[0];
    inside(t).carrying[0] = "ale";
    inside(t).carryCount[0] = 2;
    const reply: unknown[] = [];
    inside(t).maybeDropTray({ sibling: 0, touch: { level: 6 }, answer: "allow", reply }, guest);
    expect(inside(t).carrying[0]).toBeNull();
    expect(t.records.traysDropped).toBe(1);
    expect(t.messes.some((m) => m.kind === "spill" && m.spots[0] === guest.seat)).toBe(true);
    expect(reply.length).toBe(1);
  });

  it("never drops with Steady Hands on", () => {
    const t = serving();
    t.effects.steady = 1;
    inside(t).carrying[0] = "ale";
    inside(t).carryCount[0] = 2;
    inside(t).maybeDropTray({ sibling: 0, touch: { level: 9 }, answer: "lean", reply: [] }, t.guests[0]);
    expect(inside(t).carrying[0]).toBe("ale");
  });
});

describe("the room reads her", () => {
  it("is bolder the better known the tavern, and when she's worked up", () => {
    const calm = { fame: 0, horny: false, wet: false };
    expect(roomNerve(calm)).toBe(0);
    expect(roomNerve({ ...calm, fame: FAME_NERVE_AT[0] })).toBe(1);
    expect(roomNerve({ ...calm, fame: FAME_NERVE_AT[1] })).toBe(2);
    expect(roomNerve({ ...calm, horny: true, wet: true })).toBe(2);
  });
});

describe("dead drunk", () => {
  /** How many drinks in a row she has before she's going under. */
  const drinksToPassOut = (t: Tavern) => {
    let n = 0;
    while (!(t as unknown as { passingOut: boolean }).passingOut && n < 30) {
      inside(t).takeDrink();
      n++;
    }
    return n;
  };

  it("takes nine drinks in a row, and two more with Hollow Legs", () => {
    expect(drinksToPassOut(serving())).toBe(9);
    const t = serving();
    t.effects.holdLiquor = 2;
    expect(drinksToPassOut(t)).toBe(11);
  });

  it("wears off over the limit first, before she sobers", () => {
    const t = serving();
    t.drunk = 1;
    t.overLimit = 0.05;
    const drunk = t.drunk;
    t.tick(1, idle);
    expect(t.drunk).toBe(drunk);
  });

  it("ends the night once she's done talking, and the room saw it", () => {
    const t = serving();
    const respect = t.persona.respect;
    drinksToPassOut(t);
    t.tick(0.1, idle);
    expect(t.records.passedOut).toBe(1);
    expect(t.phase).toBe("bedtime");
    expect(t.persona.respect).toBeLessThan(respect);
    // She goes down where she stood, acted out on her.
    expect(t.takeActMoment()).toBe("faint");
  });

  it("counts a busy night without a drink as a sober shift", () => {
    const t = serving();
    (t as unknown as { served: number }).served = SOBER_NIGHT_SERVED;
    t.phase = "bedtime";
    t.sleep();
    expect(t.records.soberNights).toBe(1);
  });
});

describe("her last clear drink", () => {
  /** A guest she's drinking with, aroused, and her one drink from too drunk to say yes. */
  function lastClear(consentOff = false): { t: Tavern; guest: Guest } {
    const t = serving();
    const guest = t.guests[0];
    guest.lust = 9;
    guest.mood = "lust";
    if (consentOff) t.touchSettings = { ...t.touchSettings, autoTouch: true, agreed: true };
    // Six drinks in: the 7th is her last clear one.
    t.drunk = 0.75;
    (t as unknown as { takeDrink(w: Guest[]): void }).takeDrink([guest]);
    t.tick(0.1, idle);
    return { t, guest };
  }
  const touchOf = (t: Tavern) => (t as unknown as { touchChat: { guestId: number; touch: { region: string } } | null }).touchChat;

  it("has the guest she drank with ask for adult play, while she can still answer", () => {
    const { t, guest } = lastClear();
    expect(touchOf(t)?.guestId).toBe(guest.id);
    expect(touchOf(t)?.touch.region).toBe("invite");
    expect(t.records.lastClearAsks).toBe(1);
    // Yes or No: saying no is always there.
    expect(t.talkChoices.map((c) => c.label.split(" · ")[0])).toContain("Pull away");
  });

  it("is her putting it to the whole room: a yes opens the Adult play card with all of them first", () => {
    const t = serving();
    const guest = t.guests[0];
    guest.lust = 9;
    guest.mood = "lust";
    openCaps(t);
    t.meters.cock = 100;
    t.drunk = 0.75;
    (t as unknown as { takeDrink(w: Guest[]): void }).takeDrink([guest]);
    t.tick(0.1, idle);
    expect(t.talkLines.some((l) => LAST_CLEAR_LINES.includes(l.text))).toBe(true);
    t.chooseTalk(t.talkChoices.findIndex((c) => c.label.startsWith("Let it happen")));
    const scene = t.takeAdultScene();
    expect(scene?.kind === "table" && scene.wholeRoom).toBe(true);
  });

  it("with Consent off, goes by her state: ready, it happens; not ready, she's asked", () => {
    const notReady = lastClear(true).t;
    expect((notReady as unknown as { touchChat: { impulse: boolean } }).touchChat.impulse).toBe(false);
    expect(notReady.talkChoices.map((c) => c.label.split(" · ")[0])).toContain("Pull away");

    const t = serving();
    const guest = t.guests[0];
    guest.lust = 9;
    guest.mood = "lust";
    openCaps(t);
    t.meters.cock = 100;
    t.touchSettings = { ...t.touchSettings, autoTouch: true, agreed: true };
    t.drunk = 0.75;
    (t as unknown as { takeDrink(w: Guest[]): void }).takeDrink([guest]);
    t.tick(0.1, idle);
    expect((t as unknown as { touchChat: { impulse: boolean } }).touchChat.impulse).toBe(true);
  });

  it("isn't asked by a guest who's drunk themselves, and only once a night", () => {
    const t = serving();
    const guest = t.guests[0];
    guest.lust = 9;
    guest.mood = "drunk";
    t.drunk = 0.75;
    (t as unknown as { takeDrink(w: Guest[]): void }).takeDrink([guest]);
    t.tick(0.1, idle);
    expect(touchOf(t)).toBeNull();
    const again = lastClear().t;
    t.drunk = 0;
    (again as unknown as { touchChat: null }).touchChat = null;
    again.drunk = 0.75;
    (again as unknown as { takeDrink(w: Guest[]): void }).takeDrink([again.guests[0]]);
    again.tick(0.1, idle);
    expect(again.records.lastClearAsks).toBe(1);
  });
});

describe("fixing her clothes", () => {
  it("puts the last piece back on behind the bar, and the room waits for it", () => {
    const t = serving();
    t.stripped = 1;
    const waiting = t.guests.find((g) => g.status === "waiting")!;
    const patience = waiting.patience;
    const target = { kind: "station", station: "wash" } as const;
    expect(t.prompt(0, target)?.label).toContain("put your");
    t.interact(0, target);
    expect(t.stripped).toBe(0);
    expect(t.records.redressed).toBe(1);
    expect(waiting.patience).toBeCloseTo(Math.max(1, patience - waiting.maxPatience * REDRESS_PATIENCE));
  });

  it("acts it out: the piece stays off until her hands have brought it up", () => {
    const t = serving();
    t.stripped = 1;
    const off = t.shownPieces;
    expect(off.length).toBeGreaterThan(0);
    t.interact(0, { kind: "station", station: "wash" });
    expect(t.takeActMoment()).toBe("dress");
    expect(t.shownPieces).toEqual(off);
    t.tick(REDRESS_SECONDS * REDRESS_ON_AT + 0.05, idle);
    expect(t.shownPieces.length).toBeLessThan(off.length);
  });
});
