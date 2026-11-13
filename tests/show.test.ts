import { describe, expect, it } from "vitest";
import { assignSpeakers, speakerIndex } from "../src/game/chatter";
import { defaultRole, ROLES, type GuestRole } from "../src/game/guestroles";
import { earned, effectsOf, PASSIVE_BY_ID } from "../src/game/passives";
import {
  partToSee,
  SHOW_BARE_LABEL,
  SHOW_GOLD,
  SHOW_NO_LABEL,
  SHOW_NOT_READY,
  SHOW_PEEK_LABEL,
  SHOW_TOO_DRUNK,
  showChance,
} from "../src/game/show";
import { REPLACE_COST, Tavern, type Guest, type GuestKind, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const run = (t: Tavern, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
};

/** A bold, lustful guest who asks for a look as she serves them (every roll at 0), her desire at `desire` (0–10). */
function asked(desire = 0, before: (t: Tavern, guest: Guest) => void = () => {}): { t: Tavern; guest: Guest } {
  const t = new Tavern(TABLES.length, TABLES);
  t.random = () => 0;
  t.showRandom = () => 0;
  t.playerBody = "Female";
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
  for (const m of ["body", "mouth", "breasts", "butt", "pussy"] as const) t.meters[m] = desire * 10;
  before(t, guest);
  t.interact(0, { kind: "guest", id: guest.id } as Target);
  return { t, guest };
}
const labels = (t: Tavern) => t.talkChoices.map((c) => c.label);
const pick = (t: Tavern, start: string) => t.chooseTalk(labels(t).findIndex((l) => l.startsWith(start)));

describe("a guest asking for a look", () => {
  it("offers coin, and she answers: a peek, a proper look, or no", () => {
    const { t } = asked(5);
    expect(t.inConversation).toBe(true);
    const options = labels(t);
    expect(options[0]).toMatch(new RegExp(`^${SHOW_PEEK_LABEL} \\(\\+\\d+ gold\\)$`));
    expect(options[1]).toMatch(new RegExp(`^${SHOW_BARE_LABEL}`));
    expect(options[2]).toBe(SHOW_NO_LABEL);
    // She has to answer first.
    expect(t.talkChoices.at(-1)?.disabled).toBe(true);
  });

  it("only lets her go as far as she wants to", () => {
    const { t } = asked(0);
    // The guest's type likes their part; with no desire, even a peek of the bolder parts waits.
    expect(labels(t)[1]).toContain(SHOW_NOT_READY);
    expect(t.talkChoices[1].disabled).toBe(true);
    // No is always there.
    expect(t.talkChoices[2].disabled).toBe(false);
  });

  it("can't be a yes when she's too drunk", () => {
    const { t } = asked(10, (t) => (t.drunk = 0.9));
    expect(labels(t)[0]).toContain(SHOW_TOO_DRUNK);
    expect(t.talkChoices[0].disabled).toBe(true);
    expect(t.talkChoices[1].disabled).toBe(true);
  });

  it("a peek pays, and leaves them hornier and bolder", () => {
    const { t, guest } = asked(10);
    guest.lust = 4;
    const gold = t.gold;
    pick(t, SHOW_PEEK_LABEL);
    expect(t.records.peeks).toBe(1);
    expect(t.gold).toBeGreaterThan(gold);
    expect(guest.lust).toBe(6);
    expect(t.talkReplyLines.length).toBe(3);
  });

  it("a proper look pays more, and the whole room gets an eyeful", () => {
    const { t, guest } = asked(10, (t, guest) => {
      // Let the room fill, without the one asking giving up on her.
      guest.patience = guest.maxPatience = 1000;
      run(t, 30);
      guest.patience = 0.01;
      for (const g of t.guests) g.lust = 0;
      guest.lust = 10;
    });
    const others = t.guests.filter((g) => g !== guest);
    const gold = t.gold;
    pick(t, SHOW_BARE_LABEL);
    expect(t.records.flashes).toBe(1);
    expect(t.gold - gold).toBeGreaterThanOrEqual(SHOW_GOLD.breasts.bare);
    expect(others.length).toBeGreaterThan(0);
    for (const g of others) expect(g.lust).toBe(1);
  });

  it("no is just no: nothing shown, nothing paid", () => {
    const { t } = asked(10);
    const gold = t.gold;
    t.chooseTalk(2);
    expect(t.records.showsRefused).toBe(1);
    expect(t.gold).toBe(gold);
    expect(labels(t)).toEqual(["Get back to work"]);
  });

  it("asks for the part their type likes, if they've the nerve for it", () => {
    expect(partToSee("butt", 5)).toBe("butt");
    expect(partToSee("pussy", 4)).toBe("breasts");
    expect(partToSee("pussy", 7)).toBe("pussy");
    expect(partToSee("hands", 9)).toBe("breasts");
    expect(showChance("farmer", 2, true)).toBe(0);
    expect(showChance("bandit", 6, true)).toBeGreaterThan(showChance("farmer", 6, false));
  });

  it("has passives: looks earn more, and get asked for more", () => {
    const facts = new Tavern(TABLES.length, TABLES).passiveFacts();
    facts.records.peeks = 5;
    facts.records.flashes = 5;
    expect(earned(PASSIVE_BY_ID.get("peepShow")!, facts)).toBe(true);
    expect(earned(PASSIVE_BY_ID.get("flasher")!, facts)).toBe(true);
    const e = effectsOf(new Set(["peepShow", "flasher"]));
    expect(e.showGold).toBe(3);
    expect(e.showAsk).toBeCloseTo(0.75);
  });
});

describe("a party's talk", () => {
  const member = (id: number, kind: GuestKind, role: GuestRole = defaultRole(kind)): Guest => ({
    id,
    kind,
    role,
    stats: ROLES[role],
    female: false,
    look: 0,
    order: "ale",
    ordered: true,
    seat: id,
    status: "eating",
    patience: 50,
    maxPatience: 50,
    eatLeft: 10,
    rumor: false,
    listened: 0,
    party: 0,
    mood: "calm",
    lust: 0,
    desires: 0,
  });

  it("never puts one adventurer's lines in another's mouth", () => {
    const mage = member(1, "adventurer", "mage");
    const cleric = member(2, "adventurer", "cleric");
    expect(speakerIndex("Warrior", [mage, cleric])).toBe(-1);
    expect(speakerIndex("Mage", [mage, cleric])).toBe(0);
    const chat = ['Warrior: "Four ales!"', 'Mage: "Stew."', 'Archer: "Ruins."', 'Cleric: "Sit with us."'];
    expect(assignSpeakers(chat, [mage, cleric])).toEqual([
      { guestId: 1, text: "Stew." },
      { guestId: 2, text: "Sit with us." },
    ]);
  });

  it("still lets a group's name go to anyone of the group", () => {
    const farmers = [member(1, "farmer"), member(2, "farmer")];
    expect(assignSpeakers(['Old farmer: "Snow."', 'Young farmer: "Toll."'], farmers).map((l) => l.guestId)).toEqual([1, 2]);
    // ...but not one farmer talking to themselves.
    expect(assignSpeakers(['Farmer: "Snow."', 'Other farmer: "Toll."'], [farmers[0]]).length).toBe(1);
  });

  it("at the table, says only what those sitting there would, and they still ask her to sit", () => {
    // Room enough for the whole night's crowd, adventurers and all.
    const big = [...TABLES, "D", "D", "D", "D", "E", "E", "E", "E"];
    const t = new Tavern(big.length, big);
    t.nightIndex = 1;
    t.open();
    t.tick(0, idle);
    run(t, 60);
    const party = t.guests.filter((g) => g.kind === "adventurer");
    // Only the mage and the cleric have sat down; the rest are still on the road.
    for (const g of party) {
      if (g.role === "mage" || g.role === "cleric") t.guestArrived(g.id);
    }
    const index = party[0].party!;
    expect(t.partyChatting(index)).toBe(true);
    t.talk(index);
    const speakers = t.talkLines.map((l) => l.speaker).filter((s): s is string => s !== null && s !== "You");
    expect(speakers.some((s) => /warrior|archer/i.test(s))).toBe(false);
    expect(t.talkLines.at(-1)?.text).toContain("sit with us");
  });
});

describe("broken cups and dishes", () => {
  it("are counted as she drops them, and bought back one at a time from the house plans", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.open();
    t.tick(0, idle);
    t.interact(0, { kind: "station", station: "tap" });
    run(t, 2);
    t.interact(0, { kind: "station", station: "tap" });
    const stock = t.stock.cup;
    t.stumble(0);
    expect(t.stock.cup).toBe(stock - 1);
    expect(t.broken.cup).toBe(1);
    t.phase = "day";
    t.gold = REPLACE_COST;
    expect(t.canReplace("cup")).toBe(true);
    expect(t.canReplace("dish")).toBe(false);
    t.replaceBroken("cup");
    expect(t.stock.cup).toBe(stock);
    expect(t.broken.cup).toBe(0);
    expect(t.gold).toBe(0);
    // ...and kept in the save until then.
    t.broken.dish = 2;
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(t.snapshot());
    expect(loaded.broken).toEqual({ cup: 0, dish: 2 });
  });
});
