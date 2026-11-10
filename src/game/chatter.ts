/**
 * What guests say out loud in the room, shown in a speech bubble over their heads as they say it.
 *
 * A guest calls out their order when they sit down, again when they're tired of waiting, thanks you when
 * served, and grumbles on the way out if they gave up. A party at a table talks among itself: first the
 * night's scripted chat, line by line, each said by the right person, then idle table talk. Only one person
 * at a table speaks at a time, so the bubbles read like a conversation instead of a crowd.
 *
 * Kept apart from the rendering so it can be tested, and the writing changed, on its own.
 */
import { SPEAKERS } from "./banter";
import type { Guest, GuestKind, Item, PartyPlan } from "./tavern";

/** How a line is said, which colours its bubble. */
export type Tone = "chat" | "call" | "angry" | "thanks";

/** A line someone is saying right now. */
export interface Said {
  text: string;
  tone: Tone;
  /** Seconds since they started saying it. */
  age: number;
  /** How long the bubble stays up. */
  duration: number;
}

/** Letters per second a bubble types out at. */
export const BUBBLE_TYPE_SPEED = 38;

/** How long a line stays up: long enough to read, never so long it clogs the room. */
export function lineDuration(text: string): number {
  return Math.min(6, Math.max(2.2, 1.2 + text.length * 0.055));
}

const ITEM_WORDS: Record<Item, string> = {
  ale: "an ale",
  bread: "some bread",
  stew: "a bowl of stew",
  cask: "a cask",
};

const NAMES: Record<Item, string> = { ale: "ale", bread: "bread", stew: "stew", cask: "cask" };

/** Fills {item} ("an ale"), {Item} ("An ale") and {name} ("ale") in a line. */
function fill(text: string, item: Item): string {
  const words = ITEM_WORDS[item];
  return text
    .replaceAll("{item}", words)
    .replaceAll("{Item}", words[0].toUpperCase() + words.slice(1))
    .replaceAll("{name}", NAMES[item]);
}

/** Calling for their order as they sit down. */
const CALLS: Record<GuestKind, string[]> = {
  farmer: ["Innkeeper! {Item}, when you've a moment.", "Over here! {Item}, please.", "{Item} for a tired soul, innkeeper!"],
  soldier: ["Innkeeper! {Item}, and be quick.", "Oi! {Item} for the baron's man!", "{Item}. Now."],
  smuggler: ["{Item}. No hurry. Quietly.", "Innkeeper. {Item}, if you would.", "{Item} over here, friend."],
  fugitive: ["Could I... have {item}, please?", "Excuse me. {Item}?", "{Item}, please. Just {item}."],
};

/** Calling again, once half their patience has gone. */
const NUDGES: Record<GuestKind, string[]> = {
  farmer: ["Still waiting on that {name}...", "Innkeeper? My {name}?"],
  soldier: ["Where's my {name}?!", "I said {item}! Are you deaf?"],
  smuggler: ["My {name}. Today, ideally.", "I don't like waiting, innkeeper."],
  fugitive: ["Sorry... is my {name} coming?", "I can't sit here long..."],
};

/** About to give up. */
const LAST_WARNINGS: Record<GuestKind, string[]> = {
  farmer: ["I'll drink elsewhere if this keeps up!"],
  soldier: ["Last chance, innkeeper!"],
  smuggler: ["One more minute. Then I'm gone."],
  fugitive: ["I really can't stay much longer..."],
};

const THANKS: Record<GuestKind, string[]> = {
  farmer: ["Bless you.", "Ah, that's the stuff.", "Just what I needed."],
  soldier: ["About time.", "Hah! That'll do.", "For the baron. And me."],
  smuggler: ["Much obliged.", "Good. Quick, too.", "Fine service."],
  fugitive: ["Thank you. Truly.", "You're very kind.", "Thank you..."],
};

const WALKOUTS: Record<GuestKind, string[]> = {
  farmer: ["Forget it! I'm going home."],
  soldier: ["The captain will hear of this!"],
  smuggler: ["Waste of my evening."],
  fugitive: ["I can't wait any longer..."],
};

const FAREWELLS: Record<GuestKind, string[]> = {
  farmer: ["Goodnight, innkeeper!", "Mind the snow, all."],
  soldier: ["Back to the fort, then.", "On your feet, lads."],
  smuggler: ["You never saw me.", "Until next time."],
  fugitive: ["Thank you for the warmth.", "Goodnight..."],
};

/** What a table talks about once the night's scripted chat has been said. */
const TABLE_TALK: Record<GuestKind, string[]> = {
  farmer: [
    "The ewes won't last another winter like the last.",
    "My family says I drink too much. I say they count too well.",
    "Have you seen the price of salt?",
    "The mill wheel's frozen again.",
  ],
  soldier: [
    "Another week of guard duty. Wonderful.",
    "The sergeant snores like a bear.",
    "When do we get paid, anyway?",
    "This beats the fort's slop, I'll say that.",
  ],
  smuggler: [
    "Roads are watched tonight. Keep it down.",
    "The north path's clear, for now.",
    "Drink up. We leave before first light.",
    "Never trust a toll man who smiles.",
  ],
  fugitive: [
    "Did you hear that? ...No. Nothing.",
    "How far is the border from here?",
    "Don't look at the door. Just drink.",
    "I haven't slept in two days.",
  ],
};

/** A short beat between lines at a table. */
const TABLE_GAP = 0.6;
/** The pause before the table's idle talk starts. */
const IDLE_PAUSE = 2.5;
/** Idle talk is quieter: a random pause of up to this long between lines. */
const IDLE_GAP = 4;
/** After sitting down, a guest waits this long (plus a little, so a party doesn't all shout at once) to call. */
const CALL_DELAY = 0.6;

/** Removes the quotation marks around a line from a script. */
export function unquote(text: string): string {
  return text.trim().replace(/^"(.*)"$/s, "$1");
}

/**
 * Which party member says each scripted line, matched by what they're called ("Other farmer" is a farmer)
 * and failing that, whoever hasn't spoken yet. Lines with no speaker are left out.
 */
export function assignSpeakers(chat: readonly string[], members: readonly Guest[]): { guestId: number; text: string }[] {
  const unmatched = [...members];
  const speakers = new Map<string, number>();
  const lines: { guestId: number; text: string }[] = [];
  for (const raw of chat) {
    const match = /^([A-Z][A-Za-z ]{0,24}): (".*)$/.exec(raw);
    if (!match || members.length === 0) continue;
    const [, name, said] = match;
    let id = speakers.get(name);
    if (id === undefined) {
      const lower = name.toLowerCase();
      const index = Math.max(0, unmatched.findIndex((g) => lower.includes(SPEAKERS[g.kind].toLowerCase())));
      id = (unmatched.splice(index, 1)[0] ?? members[0]).id;
      speakers.set(name, id);
    }
    lines.push({ guestId: id, text: unquote(said) });
  }
  return lines;
}

interface GuestState {
  status: Guest["status"];
  /** 0 not called yet, 1 called, 2 nudged, 3 warned. */
  called: number;
  /** Counts down to their first call after sitting. */
  callIn: number;
  said: Said | null;
}

interface TableState {
  /** The next scripted line, or past the end once it's all been said. */
  next: number;
  wait: number;
}

/** What everyone in the room is saying. */
export class Chatter {
  private readonly guests = new Map<number, GuestState>();
  private readonly tables = new Map<number, TableState>();

  constructor(private readonly random: () => number = Math.random) {}

  /** What a guest is saying right now, or null. */
  saying(guestId: number): Said | null {
    return this.guests.get(guestId)?.said ?? null;
  }

  /** Whether anyone at the table is in the middle of a line. */
  private tableBusy(members: readonly Guest[]): boolean {
    return members.some((g) => this.saying(g.id) !== null);
  }

  /** Forgets everyone, for a new night or a loaded game. */
  reset(): void {
    this.guests.clear();
    this.tables.clear();
  }

  private pick(lines: readonly string[]): string {
    return lines[Math.floor(this.random() * lines.length) % lines.length];
  }

  private say(state: GuestState, text: string, tone: Tone): void {
    state.said = { text, tone, age: 0, duration: lineDuration(text) };
  }

  /**
   * Moves everyone's talk on by `dt` seconds. `parties` are the night's party scripts, and `chatting` says
   * whether a party is sitting together.
   */
  update(dt: number, guests: readonly Guest[], parties: readonly PartyPlan[], chatting: (party: number) => boolean): void {
    // Forget anyone who's gone.
    const present = new Set(guests.map((g) => g.id));
    for (const id of this.guests.keys()) if (!present.has(id)) this.guests.delete(id);

    for (const guest of guests) {
      let state = this.guests.get(guest.id);
      if (!state) {
        state = { status: guest.status, called: 0, callIn: CALL_DELAY + this.random() * 1.2, said: null };
        this.guests.set(guest.id, state);
      }
      if (state.said) {
        state.said.age += dt;
        if (state.said.age >= state.said.duration) state.said = null;
      }

      const was = state.status;
      state.status = guest.status;
      const kind = guest.kind;
      // Changes of state get said straight away, over whatever they were saying.
      if (was === "waiting" && guest.status === "eating") {
        this.say(state, this.pick(THANKS[kind]), "thanks");
        continue;
      }
      if (was !== "leaving" && guest.status === "leaving") {
        if (was === "waiting") this.say(state, this.pick(WALKOUTS[kind]), "angry");
        else if (this.random() < 0.5) this.say(state, this.pick(FAREWELLS[kind]), "chat");
        continue;
      }
      if (guest.status !== "waiting" || state.said) continue;

      // Waiting for their order: call for it, and call again as they lose patience.
      const left = guest.patience / guest.maxPatience;
      const party = guest.party === null ? [] : guests.filter((g) => g.party === guest.party && g.id !== guest.id);
      const quietTable = !this.tableBusy(party);
      if (state.called === 0) {
        state.callIn -= dt;
        if (state.callIn <= 0 && quietTable) {
          state.called = 1;
          this.say(state, fill(this.pick(CALLS[kind]), guest.order), "call");
        }
      } else if (state.called === 1 && left < 0.5 && quietTable) {
        state.called = 2;
        this.say(state, fill(this.pick(NUDGES[kind]), guest.order), "call");
      } else if (state.called === 2 && left < 0.22) {
        // Someone about to walk out says so whoever else is talking.
        state.called = 3;
        this.say(state, fill(this.pick(LAST_WARNINGS[kind]), guest.order), "angry");
      }
    }

    this.updateTables(dt, guests, parties, chatting);
  }

  private updateTables(
    dt: number,
    guests: readonly Guest[],
    parties: readonly PartyPlan[],
    chatting: (party: number) => boolean,
  ): void {
    parties.forEach((plan, party) => {
      if (!chatting(party)) return;
      const members = guests.filter((g) => g.party === party && (g.status === "waiting" || g.status === "eating"));
      let table = this.tables.get(party);
      if (!table) {
        table = { next: 0, wait: 1 + this.random() };
        this.tables.set(party, table);
      }
      if (this.tableBusy(members)) return;
      table.wait -= dt;
      if (table.wait > 0) return;

      const script = assignSpeakers(plan.chat, members);
      let speaker: Guest | undefined;
      let text: string;
      if (table.next < script.length) {
        const line = script[table.next];
        speaker = members.find((g) => g.id === line.guestId);
        text = line.text;
      } else {
        speaker = members[Math.floor(this.random() * members.length) % members.length];
        text = this.pick(TABLE_TALK[speaker.kind]);
      }
      table.next++;
      const state = speaker && this.guests.get(speaker.id);
      if (!state) return;
      this.say(state, text, /innkeeper/i.test(text) ? "call" : "chat");
      table.wait =
        table.next === script.length ? IDLE_PAUSE : table.next > script.length ? TABLE_GAP + this.random() * IDLE_GAP : TABLE_GAP;
    });
  }
}
