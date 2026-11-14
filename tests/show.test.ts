import { describe, expect, it } from "vitest";
import { assignSpeakers, speakerIndex } from "../src/game/chatter";
import { defaultRole, ROLES, type GuestRole } from "../src/game/guestroles";
import { earned, effectsOf, PASSIVE_BY_ID } from "../src/game/passives";
import {
  partToSee,
  SHOW_ASKED_BONUS,
  SHOW_ASKED_MARK,
  SHOW_GOLD,
  SHOW_NO_LABEL,
  SHOW_NOT_READY,
  SHOW_NOT_WEARING,
  SHOW_PARTS,
  SHOW_TOO_DRUNK,
  showChance,
  type ShowPart,
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

describe("a guest asking for a look", () => {
  /** Her answer for showing this, by its place in the list. */
  const answer = (t: Tavern, part: ShowPart) => t.talkChoices[SHOW_PARTS.indexOf(part)];
  const show = (t: Tavern, part: ShowPart) => t.chooseTalk(SHOW_PARTS.indexOf(part));
  /** What the guest asked for: the one answer marked so. */
  const askedFor = (t: Tavern) => SHOW_PARTS.find((part) => answer(t, part).label.includes(SHOW_ASKED_MARK))!;

  it("offers coin for one thing, and she picks what to show them, each on its own, or no", () => {
    const { t } = asked(10);
    expect(t.inConversation).toBe(true);
    const options = labels(t);
    expect(options.length).toBe(SHOW_PARTS.length + 1);
    SHOW_PARTS.forEach((_, i) => {
      expect(options[i]).toMatch(/^Show them your .+ \(.*\+\d+ gold\)$/);
      expect(t.talkChoices[i].disabled).toBe(false);
    });
    expect(options.at(-1)).toBe(SHOW_NO_LABEL);
    // Exactly one is what they asked for, and it pays a little more.
    expect(options.filter((l) => l.includes(SHOW_ASKED_MARK)).length).toBe(1);
    const part = askedFor(t);
    expect(answer(t, part).label).toContain(`+${SHOW_GOLD[part] + SHOW_ASKED_BONUS} gold`);
    // Her breasts, her band, her smallclothes, her pussy and her behind are all there to choose from.
    expect(options.some((l) => l.startsWith("Show them your breasts"))).toBe(true);
    expect(options.some((l) => l.startsWith("Show them your pussy"))).toBe(true);
    expect(options.some((l) => l.startsWith("Show them your behind"))).toBe(true);
  });

  it("only lets her go as far as she wants to", () => {
    const { t } = asked(0);
    // With no desire at all, only her band.
    expect(answer(t, "band").disabled).toBe(false);
    for (const part of ["breasts", "smalls", "pussy", "butt"] as const) {
      expect(answer(t, part).disabled).toBe(true);
      expect(answer(t, part).label).toContain(SHOW_NOT_READY);
    }
    // No is always there.
    expect(t.talkChoices.at(-1)?.disabled).toBe(false);
  });

  it("can't be a yes when she's too drunk", () => {
    const { t } = asked(10, (t) => (t.drunk = 0.9));
    for (const part of SHOW_PARTS) {
      expect(answer(t, part).label).toContain(SHOW_TOO_DRUNK);
      expect(answer(t, part).disabled).toBe(true);
    }
  });

  it("can't show them underwear she's lost tonight", () => {
    const { t } = asked(10, (t) => (t.stripped = 99));
    expect(answer(t, "band").label).toContain(SHOW_NOT_WEARING);
    expect(answer(t, "smalls").disabled).toBe(true);
    expect(answer(t, "breasts").disabled).toBe(false);
  });

  it("a peek at her underwear pays, and leaves them hornier and bolder", () => {
    const { t, guest } = asked(10);
    guest.lust = 4;
    const gold = t.gold;
    show(t, "band");
    expect(t.records.peeks).toBe(1);
    expect(t.gold).toBeGreaterThan(gold);
    expect(guest.lust).toBe(6);
    expect(t.talkReplyLines.length).toBe(3);
  });

  it("a bare look pays more, and the whole room gets an eyeful", () => {
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
    show(t, "breasts");
    expect(t.records.flashes).toBe(1);
    expect(t.gold - gold).toBeGreaterThanOrEqual(SHOW_GOLD.breasts);
    expect(others.length).toBeGreaterThan(0);
    for (const g of others) expect(g.lust).toBe(1);
  });

  it("acts each one out on her: her top pulled down off her band or her breasts, her skirt lifted, and all back after", () => {
    const shown = (part: ShowPart) => {
      const { t } = asked(10);
      expect(t.shownPieces).toEqual([]);
      expect(t.showingPull).toBeNull();
      show(t, part);
      return t;
    };
    // Her band: her chemise and bodice pulled down, still on her; nothing comes off.
    const band = shown("band");
    expect(band.showingOff).toBe("band");
    expect(band.showingPull).toEqual({ ids: ["belt", "bodice", "blouse"], dir: "down" });
    expect(band.shownPieces).toEqual([]);
    // Her breasts: pulled down the same, and her band off.
    const breasts = shown("breasts");
    expect(breasts.showingPull?.dir).toBe("down");
    expect(breasts.shownPieces).toEqual(["bra"]);
    // Her smallclothes: her skirt lifted, apron and all, nothing pulled; only her tights come down, which hide them.
    const smalls = shown("smalls");
    expect(smalls.shownPieces).toEqual(["stockings"]);
    expect(smalls.showingPull).toBeNull();
    // Her pussy and her behind: her skirt lifted, her tights and smallclothes off.
    expect(shown("pussy").shownPieces).toEqual(["stockings", "smalls"]);
    expect(shown("butt").shownPieces).toEqual(["stockings", "smalls"]);
    // Nothing counts as stripped: it's only out of the way while she shows them. Back to work, it's all back.
    expect(breasts.strippedPieces).toEqual([]);
    breasts.chooseTalk(labels(breasts).indexOf("Get back to work"));
    expect(breasts.shownPieces).toEqual([]);
    expect(breasts.showingPull).toBeNull();
    expect(breasts.showingOff).toBeNull();
  });

  it("lifts a top that can't come down up over her breasts instead", () => {
    const { t } = asked(10, (t) => (t.playerOutfit = "priestess"));
    expect(t.topPullDir).toBe("up");
    show(t, "breasts");
    expect(t.showingPull).toEqual({ ids: ["top"], dir: "up" });
    // Her drapes lift with her skirt panels and her girdle stays round her waist: nothing below comes off for a peek.
    const { t: below } = asked(10, (t) => (t.playerOutfit = "priestess"));
    show(below, "smalls");
    expect(below.shownPieces).toEqual([]);
  });

  it("pays a little more for just what they asked for", () => {
    const { t } = asked(10);
    const part = askedFor(t);
    const gold = t.gold;
    show(t, part);
    expect(t.gold - gold).toBe(SHOW_GOLD[part] + SHOW_ASKED_BONUS);
  });

  it("no is just no: nothing shown, nothing paid", () => {
    const { t } = asked(10);
    const gold = t.gold;
    t.chooseTalk(SHOW_PARTS.length);
    expect(t.records.showsRefused).toBe(1);
    expect(t.gold).toBe(gold);
    expect(labels(t)).toEqual(["Get back to work"]);
  });

  it("asks for the part their type likes, if they've the nerve for it, or the boldest thing short of it", () => {
    expect(partToSee("butt", 5)).toBe("butt");
    expect(partToSee("butt", 2)).toBe("band");
    expect(partToSee("pussy", 4)).toBe("smalls");
    expect(partToSee("pussy", 5)).toBe("pussy");
    expect(partToSee("breasts", 2)).toBe("band");
    expect(partToSee("breasts", 3)).toBe("breasts");
    expect(partToSee("hands", 9)).toBe("breasts");
    expect(showChance("farmer", 1, true)).toBe(0);
    expect(showChance("farmer", 2, false)).toBeGreaterThan(0.08);
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
