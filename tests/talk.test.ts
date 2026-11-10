import { describe, expect, it } from "vitest";
import { drunkLabel, Tavern, type Guest, type Target } from "../src/game/tavern";

/** The real room: two tables of two, a round table of three, and four bar stools. */
const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };

function run(t: Tavern, seconds: number): void {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
}

/** Night `night` (0-based), open, with everyone due by `seconds` seated. */
function atNight(night: number, seconds: number): Tavern {
  const t = new Tavern(TABLES.length, TABLES);
  t.nightIndex = night;
  t.open();
  t.tick(0, idle);
  run(t, seconds);
  for (const guest of t.guests) t.guestArrived(guest.id);
  return t;
}

const partyOf = (t: Tavern, party: number): Guest[] => t.guests.filter((g) => g.party === party);
const at = (guest: Guest): Target => ({ kind: "guest", id: guest.id });

describe("parties", () => {
  it("seat a party together at one table", () => {
    const t = atNight(1, 24);
    const party = partyOf(t, 0);
    expect(party).toHaveLength(2);
    expect(new Set(party.map((g) => TABLES[g.seat])).size).toBe(1);
    expect(TABLES[party[0].seat]).not.toBe("Bar");
  });

  it("seat a party side by side at the bar when no table fits them", () => {
    const t = atNight(2, 16);
    const party = partyOf(t, 0);
    expect(party).toHaveLength(3);
    expect(new Set(party.map((g) => TABLES[g.seat])).size).toBe(1);
  });

  it("stay at the table until the last of them has finished eating", () => {
    const t = atNight(0, 18);
    const [first, second] = partyOf(t, 0);
    first.status = "eating";
    first.eatLeft = 0.5;
    second.status = "eating";
    second.eatLeft = 3;
    run(t, 1);
    expect(first.status).toBe("eating");
    run(t, 3);
    expect(first.status).toBe("leaving");
    expect(second.status).toBe("leaving");
  });

  it("let the others go once a guest at the table has walked out", () => {
    const t = atNight(0, 18);
    const [first, second] = partyOf(t, 0);
    first.status = "eating";
    first.eatLeft = 0.5;
    second.patience = 1;
    run(t, 2);
    expect(second.status).toBe("leaving");
    expect(first.status).toBe("leaving");
  });

  it("invite you over only once two are seated, and only with empty hands", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.open();
    t.tick(0, idle);
    run(t, 18);
    const [first, second] = partyOf(t, 0);
    t.guestArrived(first.id);
    expect(t.prompt(0, at(first))).toBeNull();
    t.guestArrived(second.id);
    expect(t.prompt(0, at(first))).toEqual({ label: "Join their conversation", actionable: true });
    t.interact(0, { kind: "station", station: "bread" });
    // Holding bread: serving the farmer who wants it comes first, and the other won't chat.
    expect(t.prompt(0, at(first))?.label).toBe("Serve bread");
    expect(t.prompt(0, at(second))).toBeNull();
  });

  it("let you drink with them: trust, gossip, and a drunker innkeeper", () => {
    const t = atNight(0, 18);
    const trust = t.trust;
    t.interact(0, at(partyOf(t, 0)[0]));
    expect(t.talkingTo).toBe(0);
    expect(t.talkLines.length).toBeGreaterThan(0);
    t.chooseTalk(0);
    expect(t.drunk).toBeCloseTo(0.3);
    expect(t.trust).toBe(trust + 1);
    expect(t.talkLines.map((line) => line.text)).toContain(t.plan.parties[0].gossip);
    t.chooseTalk(0);
    expect(t.drunk).toBeCloseTo(0.6);
    expect(t.trust).toBe(trust + 1);
    // Two drinks a table, then they stop pouring.
    expect(t.talkChoices[0].disabled).toBe(true);
    t.chooseTalk(2);
    expect(t.talkingTo).toBeNull();
  });

  it("let the rumor slip once you drink with the table that has it", () => {
    const t = atNight(1, 24);
    t.interact(0, at(partyOf(t, 0)[0]));
    expect(t.heardRumor).toBe(false);
    t.chooseTalk(0);
    expect(t.heardRumor).toBe(true);
  });

  it("cool the heat when you drink with soldiers", () => {
    const t = atNight(1, 30);
    t.heat = 3;
    t.interact(0, at(partyOf(t, 1)[0]));
    t.chooseTalk(0);
    expect(t.heat).toBe(2);
  });

  it("buy a jug: gold, one serving from the tap, and patience back", () => {
    const t = atNight(0, 18);
    const party = partyOf(t, 0);
    party[0].patience = 1;
    const gold = t.gold;
    const tap = t.tapLeft;
    t.interact(0, at(party[0]));
    t.chooseTalk(1);
    expect(t.gold).toBe(gold + 6);
    expect(t.tapLeft).toBe(tap - 1);
    expect(party[0].patience).toBe(party[0].maxPatience);
    expect(t.talkChoices[1].disabled).toBe(true);
  });
});

describe("drinking", () => {
  it("wears off with time, and sleep clears it", () => {
    const t = atNight(0, 18);
    t.interact(0, at(partyOf(t, 0)[0]));
    t.chooseTalk(0);
    t.chooseTalk(2);
    run(t, 10);
    expect(t.drunk).toBeCloseTo(0.2);
    expect(drunkLabel(t.drunk)).toBe("Tipsy");
    t.drunk = 0.9;
    t.phase = "bedtime";
    t.sleep();
    expect(t.drunk).toBe(0);
  });

  it("refuses you more once you've had too much", () => {
    const t = atNight(0, 18);
    t.drunk = 0.9;
    t.interact(0, at(partyOf(t, 0)[0]));
    expect(t.talkChoices[0].disabled).toBe(true);
    t.chooseTalk(0);
    expect(t.drunk).toBe(0.9);
  });

  it("makes you drop what you carry when you stumble, except a cask", () => {
    const t = atNight(0, 0);
    t.interact(0, { kind: "station", station: "bread" });
    t.stumble(0);
    expect(t.carrying[0]).toBeNull();
    t.interact(0, { kind: "station", station: "barrel" });
    t.stumble(0);
    expect(t.carrying[0]).toBe("cask");
  });

  it("slows the tap", () => {
    const t = atNight(0, 0);
    t.drunk = 1;
    t.interact(0, { kind: "station", station: "tap" });
    run(t, 1.6);
    expect(t.aleReady).toBe(0);
    run(t, 0.8);
    expect(t.aleReady).toBe(1);
  });
});

describe("a drink as a tip", () => {
  /** A seated farmer served well, with chance fixed so they always offer a drink. */
  function tipped(setup: (t: Tavern) => void = () => {}, roll = 0): Tavern {
    const t = new Tavern(TABLES.length, TABLES);
    t.random = () => roll;
    setup(t);
    t.open();
    t.tick(0, idle);
    run(t, 4);
    const guest = t.guests[0];
    t.guestArrived(guest.id);
    t.interact(0, { kind: "station", station: "tap" });
    run(t, 2);
    t.interact(0, { kind: "station", station: "tap" });
    t.interact(0, at(guest));
    return t;
  }

  const said = (t: Tavern) => t.talkLines.map((line) => line.text);

  it("opens a conversation with the guest, who offers you a drink", () => {
    const t = tipped();
    expect(t.inConversation).toBe(true);
    expect(t.talkLines[0].speaker).toMatch(/^Farmer/);
    expect(t.talkChoices[0].label).toBe("Drink it, on them");
    const gold = t.gold;
    t.chooseTalk(0);
    expect(t.drunk).toBeCloseTo(0.3);
    expect(t.gold).toBe(gold + 2);
    expect(t.persona.drinks).toBe(1);
    expect(t.talkReplyLines[0]).toEqual({ speaker: "You", text: "\"Cheers!\"" });
    t.chooseTalk(t.talkChoices.length - 1);
    expect(t.inConversation).toBe(false);
  });

  it("flatters a shy innkeeper gently, and a known flirt boldly", () => {
    const shy = tipped((t) => (t.playerBody = "Female"));
    const bold = tipped((t) => {
      t.playerBody = "Female";
      t.persona.flirt = 8;
    });
    expect(said(shy)).toContain("\"Has anyone told you you've got the prettiest eyes on the whole pass?\"");
    expect(said(bold).some((text) => text.includes("flirt back"))).toBe(true);
    // Only a known flirt gets to flirt back shamelessly.
    expect(shy.talkChoices.map((c) => c.label)).not.toContain("Flirt back shamelessly");
    expect(bold.talkChoices.map((c) => c.label)).toContain("Flirt back shamelessly");
  });

  it("fits the compliment to who you play", () => {
    const him = tipped((t) => (t.playerBody = "Male"));
    expect(said(him)).toContain("\"Look at the arms on you! Bet you roll those casks like they're apples.\"");
  });

  it("builds your reputation from how you answer", () => {
    const t = tipped();
    const play = t.talkChoices.findIndex((c) => c.label === "Laugh and play along");
    t.chooseTalk(play);
    expect(t.persona.flirt).toBe(1);
    expect(t.gold).toBeGreaterThan(0);
  });

  it("brings up what you did at last call", () => {
    const t = tipped((t) => (t.persona.protected = 1));
    expect(said(t).some((text) => text.includes("sent the baron's man the wrong way"))).toBe(true);
  });

  it("asks a favor instead, sometimes, and the favor depends on who's asking and what they've heard", () => {
    // The first rolls decide how the guest feels walking in and open the conversation; rolls of 0.7 after
    // those skip the compliment, so the farmer asks a favor.
    const favorRolls = (t: Tavern) => {
      let rolls = 0;
      t.random = () => (rolls++ < 4 ? 0 : 0.7);
    };
    const asked = tipped(favorRolls);
    expect(said(asked).some((text) => text.includes("letter"))).toBe(true);
    const distrusted = tipped((t) => {
      favorRolls(t);
      t.persona.sold = 1;
    });
    expect(said(distrusted).some((text) => text.includes("I hear you sell what you hear"))).toBe(true);
  });

  it("doesn't repeat itself while it has something new to say", () => {
    const t = tipped((t) => (t.playerBody = "Female"));
    const first = said(t)[1];
    t.chooseTalk(t.talkChoices.length - 1);
    t.interact(0, { kind: "station", station: "tap" });
    run(t, 2);
    t.interact(0, { kind: "station", station: "tap" });
    const guest = t.guests[0];
    guest.status = "waiting";
    t.interact(0, at(guest));
    expect(said(t)[1]).not.toBe(first);
  });
});

describe("reputation", () => {
  it("remembers what you did at last call, and keeps it in the save", () => {
    const t = new Tavern(TABLES.length, TABLES);
    t.open();
    t.tick(0, idle);
    t.heardRumor = true;
    t.phase = "lastcall";
    t.chooseLastCall(2);
    expect(t.persona.sold).toBe(1);
    expect(t.persona.greed).toBe(2);
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(t.snapshot());
    expect(loaded.persona).toEqual(t.persona);
  });

  it("starts from nothing when an old save has none", () => {
    const t = new Tavern(TABLES.length, TABLES);
    const save = t.snapshot();
    delete save.persona;
    t.persona.flirt = 5;
    t.restore(save);
    expect(t.persona.flirt).toBe(0);
  });
});
