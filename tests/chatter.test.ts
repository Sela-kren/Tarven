import { describe, expect, it } from "vitest";
import { assignSpeakers, Chatter, lineDuration, unquote } from "../src/game/chatter";
import { defaultRole, ROLES } from "../src/game/guestroles";
import type { Guest, GuestKind, PartyPlan } from "../src/game/tavern";

const guest = (id: number, kind: GuestKind, changes: Partial<Guest> = {}): Guest => ({
  id,
  kind,
  role: defaultRole(kind),
  stats: ROLES[defaultRole(kind)],
  female: id % 2 === 0,
  look: 0,
  order: "ale",
  seat: id,
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
  ...changes,
});

const PARTY: PartyPlan = {
  chat: ['Farmer: "Snow is coming."', 'Other farmer: "The toll is too."', 'Farmer: "Innkeeper! Sit with us."'],
  offer: "",
  gossip: "",
};

/** Runs the room for `seconds`, calling `each` after every step. */
function run(chatter: Chatter, guests: Guest[], seconds: number, parties: PartyPlan[] = [], each?: () => void): void {
  const chatting = (party: number) => guests.filter((g) => g.party === party).length >= 2;
  for (let i = 0; i < seconds * 10; i++) {
    chatter.update(0.1, guests, parties, chatting);
    each?.();
  }
}

describe("lines", () => {
  it("strips the quotes off a scripted line", () => {
    expect(unquote('"Snow is coming."')).toBe("Snow is coming.");
  });

  it("stay up long enough to read and no longer", () => {
    expect(lineDuration("Hm.")).toBe(2.2);
    expect(lineDuration("x".repeat(400))).toBe(6);
  });

  it("go to the right person at the table", () => {
    const members = [guest(1, "soldier"), guest(2, "farmer"), guest(3, "farmer")];
    const lines = assignSpeakers(PARTY.chat, members);
    expect(lines.map((l) => l.guestId)).toEqual([2, 3, 2]);
    expect(lines[2].text).toBe("Innkeeper! Sit with us.");
  });
});

describe("a guest waiting on their order", () => {
  it("calls for it soon after sitting, naming what they want", () => {
    const chatter = new Chatter(() => 0);
    const farmer = guest(1, "farmer");
    run(chatter, [farmer], 1);
    expect(chatter.saying(1)?.tone).toBe("call");
    expect(chatter.saying(1)?.text.toLowerCase()).toContain("ale");
  });

  it("calls again at half patience, and warns you near the end", () => {
    const chatter = new Chatter(() => 0);
    const soldier = guest(1, "soldier");
    run(chatter, [soldier], 8);
    expect(chatter.saying(1)).toBeNull();

    soldier.patience = 20;
    run(chatter, [soldier], 0.2);
    expect(chatter.saying(1)?.tone).toBe("call");

    run(chatter, [soldier], 8);
    soldier.patience = 5;
    run(chatter, [soldier], 0.2);
    expect(chatter.saying(1)?.tone).toBe("angry");
  });

  it("thanks you when served", () => {
    const chatter = new Chatter(() => 0);
    const farmer = guest(1, "farmer");
    run(chatter, [farmer], 0.1);
    farmer.status = "eating";
    run(chatter, [farmer], 0.1);
    expect(chatter.saying(1)?.tone).toBe("thanks");
  });

  it("grumbles if they give up, and stops once they're gone", () => {
    const chatter = new Chatter(() => 0);
    const farmer = guest(1, "farmer");
    run(chatter, [farmer], 0.1);
    farmer.status = "leaving";
    run(chatter, [farmer], 0.1);
    expect(chatter.saying(1)?.tone).toBe("angry");
    run(chatter, [], 0.1);
    expect(chatter.saying(1)).toBeNull();
  });
});

describe("a party at a table", () => {
  const seated = () => [guest(1, "farmer", { party: 0, status: "eating" }), guest(2, "farmer", { party: 0, status: "eating" })];

  it("says the night's script in order, one person at a time", () => {
    const chatter = new Chatter(() => 0);
    const party = seated();
    const heard: string[] = [];
    run(chatter, party, 25, [PARTY], () => {
      const speaking = party.filter((g) => chatter.saying(g.id));
      expect(speaking.length).toBeLessThanOrEqual(1);
      const text = speaking[0] && chatter.saying(speaking[0].id)!.text;
      if (text && heard[heard.length - 1] !== text) heard.push(text);
    });
    expect(heard.slice(0, 3)).toEqual(["Snow is coming.", "The toll is too.", "Innkeeper! Sit with us."]);
  });

  it("marks a line aimed at the innkeeper as a call", () => {
    const chatter = new Chatter(() => 0);
    const party = seated();
    let tone: string | undefined;
    run(chatter, party, 25, [PARTY], () => {
      const said = chatter.saying(party[0].id);
      if (said?.text.startsWith("Innkeeper")) tone = said.tone;
    });
    expect(tone).toBe("call");
  });

  it("keeps talking once the script runs out", () => {
    const chatter = new Chatter(() => 0);
    const party = seated();
    run(chatter, party, 20, [PARTY]);
    const heard = new Set<string>();
    run(chatter, party, 40, [PARTY], () => {
      for (const g of party) {
        const said = chatter.saying(g.id);
        if (said) heard.add(said.text);
      }
    });
    expect([...heard].some((t) => !PARTY.chat.some((c) => c.includes(t)))).toBe(true);
  });

  it("doesn't talk when only one of them is left", () => {
    const chatter = new Chatter(() => 0);
    const alone = [guest(1, "farmer", { party: 0, status: "eating" })];
    run(chatter, alone, 20, [PARTY]);
    expect(chatter.saying(1)).toBeNull();
  });

  it("starts the night's script again after a reset", () => {
    const chatter = new Chatter(() => 0);
    const party = seated();
    run(chatter, party, 30, [PARTY]);
    chatter.reset();
    const heard = new Set<string>();
    run(chatter, party, 3, [PARTY], () => {
      const said = chatter.saying(1);
      if (said) heard.add(said.text);
    });
    expect([...heard]).toEqual(["Snow is coming."]);
  });
});

describe("guests who came alone", () => {
  /** Who said what, in order, without repeats from one frame to the next. */
  function listen(chatter: Chatter, guests: Guest[], seconds: number): { id: number; text: string }[] {
    const heard: { id: number; text: string }[] = [];
    run(chatter, guests, seconds, [], () => {
      for (const g of guests) {
        const said = chatter.saying(g.id);
        const last = heard[heard.length - 1];
        if (said && !(last?.id === g.id && last.text === said.text)) heard.push({ id: g.id, text: said.text });
      }
    });
    return heard;
  }

  it("answer each other, taking turns", () => {
    const chatter = new Chatter(() => 0);
    const heard = listen(chatter, [guest(1, "farmer", { status: "eating" }), guest(2, "soldier", { status: "eating" })], 12);
    expect(heard.length).toBeGreaterThanOrEqual(2);
    expect(heard[0].id).not.toBe(heard[1].id);
  });

  it("don't talk with nobody to talk to", () => {
    const chatter = new Chatter(() => 0);
    expect(listen(chatter, [guest(1, "farmer", { status: "eating" })], 12)).toEqual([]);
  });

  it("only talk with someone at their own table", () => {
    const chatter = new Chatter(() => 0);
    const guests = [guest(1, "farmer", { status: "eating" }), guest(2, "soldier", { status: "eating" }), guest(3, "smuggler", { status: "eating" })];
    const tables = ["", "A", "B", "A"];
    const speakers = new Set<number>();
    for (let i = 0; i < 90; i++) {
      chatter.update(0.1, guests, [], () => false, (seat) => tables[seat]);
      for (const g of guests) if (chatter.saying(g.id)) speakers.add(g.id);
    }
    expect([...speakers].sort()).toEqual([1, 3]);
  });

  it("don't talk across the room to someone at another table", () => {
    const chatter = new Chatter(() => 0);
    const guests = [guest(1, "farmer", { status: "eating" }), guest(2, "soldier", { status: "eating" })];
    const tables = ["", "A", "B"];
    for (let i = 0; i < 120; i++) {
      chatter.update(0.1, guests, [], () => false, (seat) => tables[seat]);
      for (const g of guests) expect(chatter.saying(g.id)).toBeNull();
    }
  });

  it("stop mid-conversation when one of them leaves", () => {
    const chatter = new Chatter(() => 0);
    const pair = [guest(1, "farmer", { status: "eating" }), guest(2, "soldier", { status: "eating" })];
    run(chatter, pair, 2);
    expect(chatter.saying(1)?.tone).toBe("chat");
    pair[1].status = "leaving";
    run(chatter, pair, 10);
    expect(chatter.saying(1)).toBeNull();
    expect(chatter.saying(2)).toBeNull();
  });

  it("ask for their order before they start chatting", () => {
    const chatter = new Chatter(() => 0);
    const pair = [guest(1, "farmer"), guest(2, "soldier")];
    run(chatter, pair, 2, [], () => {
      for (const g of pair) expect(chatter.saying(g.id)?.tone).not.toBe("chat");
    });
    expect(chatter.saying(1)?.tone).toBe("call");
  });
});
