import { describe, expect, it } from "vitest";
import { FAVORS } from "../src/game/banter";
import { FOLLOW_UP_BY_ID, FOLLOW_UPS } from "../src/game/favors";
import { Tavern, TIP_DRINK_DECLINE, type Guest, type Target } from "../src/game/tavern";

const TABLES = ["A", "A", "B", "B", "C", "C", "C", "Bar", "Bar", "Bar", "Bar"];
const idle = { listeningTo: null, night: true };
const run = (t: Tavern, seconds: number) => {
  for (let i = 0; i < seconds * 10; i++) t.tick(0.1, idle);
};
const at = (guest: Guest): Target => ({ kind: "guest", id: guest.id });

/** The first night's first guest (a farmer), seated and waiting for ale; `setup` runs before anything else. */
function waiting(setup: (t: Tavern) => void = () => {}): { t: Tavern; guest: Guest } {
  const t = new Tavern(TABLES.length, TABLES);
  t.random = () => 0;
  setup(t);
  t.open();
  t.tick(0, idle);
  run(t, 4);
  const guest = t.guests[0];
  t.guestArrived(guest.id);
  t.interact(0, { kind: "station", station: "tap" });
  run(t, 2);
  t.interact(0, { kind: "station", station: "tap" });
  return { t, guest };
}

describe("the follow-ups", () => {
  it("each come from a real answer, with someone to bring them and something to answer", () => {
    const answers = new Set([
      ...FAVORS.flatMap((f) => [f.agree.id, f.refuse.id]),
      ...FOLLOW_UPS.flatMap((f) => f.replies.map((r) => r.id)),
    ]);
    for (const f of FOLLOW_UPS) {
      expect(answers.has(f.after), `${f.id} comes after ${f.after}`).toBe(true);
      expect(f.kinds.length, f.id).toBeGreaterThan(0);
      expect(f.replies.length, f.id).toBeGreaterThan(0);
      expect(f.note.length, f.id).toBeGreaterThan(0);
    }
    expect(new Set(FOLLOW_UPS.map((f) => f.id)).size).toBe(FOLLOW_UPS.length);
  });

  it("cover every favor that promises someone will come, or says they'll pay you back", () => {
    const after = new Set(FOLLOW_UPS.map((f) => f.after));
    for (const id of ["f.letter", "f.ewe", "f.purse", "f.never", "f.crate", "f.slate", "f.seed"]) {
      expect(after.has(`${id}.yes`), id).toBe(true);
    }
  });
});

describe("a favor coming back", () => {
  it("comes when she serves the right kind of guest, straight to what they've come for", () => {
    const { t, guest } = waiting((t) => (t.favorsDue = [{ id: "fu.slate", night: 0 }]));
    const gold = t.gold;
    t.interact(0, at(guest));
    expect(t.inConversation).toBe(true);
    expect(t.talkLines[0].text).toContain("Barley's sold");
    // No drink to answer first: what they've come for.
    expect(t.talkChoices.map((c) => c.label)).toEqual(["\"Your word was good.\"", "Get back to work"]);
    t.chooseTalk(0);
    expect(t.gold).toBeGreaterThanOrEqual(gold + 4);
    expect(t.favorsDue).toEqual([]);
  });

  it("waits for its night, and for the right kind of guest", () => {
    const early = waiting((t) => (t.favorsDue = [{ id: "fu.slate", night: 1 }]));
    early.t.interact(0, at(early.guest));
    expect(early.t.talkLines.some((l) => l.text.includes("Barley's sold"))).toBe(false);
    expect(early.t.favorsDue).toHaveLength(1);
    // A soldier's follow-up never comes through a farmer.
    const wrong = waiting((t) => (t.favorsDue = [{ id: "fu.song", night: 0 }]));
    wrong.t.interact(0, at(wrong.guest));
    expect(wrong.t.favorsDue).toHaveLength(1);
  });

  it("keeping a promise sets up the thanks, a night later", () => {
    const { t, guest } = waiting((t) => (t.favorsDue = [{ id: "fu.ewe", night: 0 }]));
    t.interact(0, at(guest));
    expect(t.talkLines[0].speaker).toBe("A farm boy");
    t.chooseTalk(t.talkChoices.findIndex((c) => c.label === "\"He's at the mill. Run!\""));
    expect(t.favorsDue).toEqual([{ id: "fu.eweThanks", night: 1 }]);
    expect(t.favorsAhead.map((f) => f.kind)).toEqual(["return"]);
  });

  it("is set up by agreeing to a favor, and kept in the save", () => {
    // Rolls of 0.7 after the first few pass over the compliment for a favor (as in talk.test.ts).
    const { t, guest } = waiting((t) => {
      let rolls = 0;
      t.random = () => (rolls++ < 4 ? 0 : 0.7);
    });
    t.interact(0, at(guest));
    t.chooseTalk(t.talkChoices.findIndex((c) => c.label === TIP_DRINK_DECLINE));
    // The farmer's favors on the first night all have something to follow; agreeing is the first answer.
    t.chooseTalk(0);
    expect(t.favorsDue.length).toBe(1);
    expect(FOLLOW_UP_BY_ID.has(t.favorsDue[0].id)).toBe(true);
    const loaded = new Tavern(TABLES.length, TABLES);
    loaded.restore(t.snapshot());
    expect(loaded.favorsDue).toEqual(t.favorsDue);
  });
});
