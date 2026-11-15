import { describe, expect, it } from "vitest";
import { BAR_DRUNK_VOICE, barVoice, HER_BAR_LINES } from "../src/game/barher";
import { BAR_VOICES, REACH_PART } from "../src/game/barvoices";
import { defaultRole, statsOf } from "../src/game/guestroles";
import { Tavern, type Guest, type GuestKind } from "../src/game/tavern";

const SEATS = 11;

function guest(id: number, kind: GuestKind, lust: number): Guest {
  return {
    id, kind, role: defaultRole(kind), stats: statsOf(kind), female: false, look: 0, order: "ale", ordered: true, seat: id,
    status: "waiting", patience: 30, maxPatience: 30, eatLeft: 0, rumor: false, listened: 0, party: null, lust, desires: 0, mood: "calm",
  };
}

/** A night under way, her warm for anything, one guest who'll reach for her. */
function night(g: Guest): Tavern {
  const t = new Tavern(SEATS);
  t.random = () => 0;
  t.playerBody = "Female";
  t.open();
  t.guests.length = 0;
  t.guests.push(g);
  for (const m of ["body", "mouth", "breasts", "butt", "pussy", "cock"] as const) t.meters[m] = 100;
  return t;
}
const reach = (t: Tavern, g: Guest) => (t as unknown as { maybeReach: (g: Guest) => boolean }).maybeReach(g);
const said = (lines: readonly { text: string }[], from: readonly string[]) => lines.some((l) => from.some((s) => l.text === `"${s}"`));

describe("the bar's raw talk, Karryn's Prison style", () => {
  it("she has something to say at every moment, in every voice; every type for every part of her", () => {
    for (const moment of Object.values(HER_BAR_LINES)) for (const lines of Object.values(moment)) expect(lines.length).toBeGreaterThan(3);
    for (const voice of Object.values(BAR_VOICES)) {
      for (const lines of Object.values(voice.reach)) expect(lines.length).toBeGreaterThan(3);
      for (const lines of [voice.crow, voice.sulk, voice.order, voice.serve]) expect(lines.length).toBeGreaterThan(3);
    }
  });

  it("her voice: drunk over all, horny until she's Known, else her stage", () => {
    expect(barVoice("sheltered", false, 0)).toBe("sheltered");
    expect(barVoice("curious", true, 0)).toBe("horny");
    expect(barVoice("known", true, 0)).toBe("known");
    expect(barVoice("known", true, BAR_DRUNK_VOICE)).toBe("drunk");
  });

  it("a guest says it as they reach; let it, and she says hers out loud and they crow", () => {
    const g = guest(1, "bandit", 9);
    const t = night(g);
    expect(reach(t, g)).toBe(true);
    const voice = BAR_VOICES.bandit;
    expect(said(t.talkLines, Object.values(voice.reach).flat())).toBe(true);
    t.chooseTalk(0);
    const reply = t.talkLines;
    expect(said(reply, voice.crow)).toBe(true);
    expect(reply.some((l) => l.speaker === "You" && l.text.startsWith('"'))).toBe(true);
  });

  it("say no, and they sulk", () => {
    const g = guest(1, "noble", 9);
    const t = night(g);
    reach(t, g);
    t.chooseTalk(t.talkChoices.length - 1);
    expect(said(t.talkLines, BAR_VOICES.noble.sulk)).toBe(true);
  });

  it("the touches she can be reached for all have a voice, but her clothes and the invitation keep their own", () => {
    expect(REACH_PART.chest).toBe("chest");
    expect(REACH_PART.clothes).toBeUndefined();
    expect(REACH_PART.invite).toBeUndefined();
  });

  it("opening up, she says her piece, and the bar's lines never touch the night's dice", () => {
    const a = new Tavern(SEATS);
    a.playerBody = "Female";
    a.open();
    expect(a.takeMessages().some((l) => l.startsWith("You: \""))).toBe(true);
    let calls = 0;
    const b = new Tavern(SEATS);
    b.playerBody = "Female";
    b.random = () => {
      calls++;
      return 0.5;
    };
    b.open();
    const male = new Tavern(SEATS);
    let maleCalls = 0;
    male.random = () => {
      maleCalls++;
      return 0.5;
    };
    male.open();
    expect(calls).toBe(maleCalls);
  });
});
