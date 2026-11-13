/**
 * What guests say out loud in the room, shown in a speech bubble over their heads as they say it.
 *
 * A guest calls out their order when they sit down, again when they're tired of waiting, thanks you when
 * served, and grumbles on the way out if they gave up. A party at a table talks among itself: first the
 * night's scripted chat, line by line, each said by the right person, then idle back-and-forth. Guests who
 * came alone strike up short exchanges with whoever shares their table, and nobody else. Only
 * one person in any conversation speaks at a time, so the bubbles read like talk instead of a crowd.
 *
 * Kept apart from the rendering so it can be tested, and the writing changed, on its own.
 */
import { SPEAKERS, type BanterContext } from "./banter";
import { ABOUT_YOU, LEERING_CALLS, LEERING_THANKS, SMUTTY_GOSSIP } from "./gossip";
import { feltMood, LOW_RESPECT, STRONG_DESIRE, type Mood } from "./mood";
import { CLASHES, DESIRE_TALKS, DESIRE_THANKS, MOOD_LINES, MOOD_TALKS } from "./moodtalk";
import { guestFemale, roleLabel } from "./guestroles";
import { ANYONE, EXCHANGES, type Exchange } from "./tabletalk";
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
  /** The state the speaker is in, shown on the bubble. */
  mood: Mood;
  /** Whether they're talking about the innkeeper, which can only be made out from close by. */
  aboutYou: boolean;
}

/** Letters per second a bubble types out at. */
export const BUBBLE_TYPE_SPEED = 38;

/** How long a line stays up: long enough to read, never so long it clogs the room. */
export function lineDuration(text: string): number {
  return Math.min(6, Math.max(2.2, 1.2 + text.length * 0.055));
}

const ITEM_WORDS: Record<Item, string> = {
  ale: "an ale",
  wine: "a cup of wine",
  mead: "a mead",
  vodka: "a vodka",
  bread: "some bread",
  stew: "a bowl of stew",
  cask: "a cask",
};

const NAMES: Record<Item, string> = { ale: "ale", wine: "wine", mead: "mead", vodka: "vodka", bread: "bread", stew: "stew", cask: "cask" };

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
  adventurer: [
    "Innkeeper! {Item} for the heroes of the north road!",
    "{Item} over here! Ruins at dawn, ale tonight!",
    "{Item}, innkeeper! And keep 'em coming, we're paid up front!",
  ],
  bandit: ["{Item}. And don't make me ask nice.", "Oi. {Item}. Red scarf table, can't miss us.", "{Item}, innkeeper. On the house, I reckon."],
  noble: [
    "Innkeeper. {Item}, in a clean cup, if such a thing exists.",
    "{Item}, if you please. The best you have.",
    "You there. {Item}. And wipe the table first.",
  ],
};

/** Calling again, once half their patience has gone. */
const NUDGES: Record<GuestKind, string[]> = {
  farmer: ["Still waiting on that {name}...", "Innkeeper? My {name}?"],
  soldier: ["Where's my {name}?!", "I said {item}! Are you deaf?"],
  smuggler: ["My {name}. Today, ideally.", "I don't like waiting, innkeeper."],
  fugitive: ["Sorry... is my {name} coming?", "I can't sit here long..."],
  adventurer: ["Oi! My {name}! I've fought trolls faster than this!", "Innkeeper? The {name}? We march at dawn!"],
  bandit: ["My {name}. Or I start breaking things.", "Corran doesn't like waiting. Nor do I."],
  noble: ["Is my {name} being brewed from scratch?", "I am not accustomed to waiting, innkeeper."],
};

/** About to give up. */
const LAST_WARNINGS: Record<GuestKind, string[]> = {
  farmer: ["I'll drink elsewhere if this keeps up!"],
  soldier: ["Last chance, innkeeper!"],
  smuggler: ["One more minute. Then I'm gone."],
  fugitive: ["I really can't stay much longer..."],
  adventurer: ["We'll drink in the ruins if we have to!"],
  bandit: ["Last chance before I help myself."],
  noble: ["One more moment and I'm calling for my carriage."],
};

const THANKS: Record<GuestKind, string[]> = {
  farmer: ["Bless you.", "Ah, that's the stuff.", "Just what I needed."],
  soldier: ["About time.", "Hah! That'll do.", "For the baron. And me."],
  smuggler: ["Much obliged.", "Good. Quick, too.", "Fine service."],
  fugitive: ["Thank you. Truly.", "You're very kind.", "Thank you..."],
  adventurer: ["Ha! Fuel for the road!", "Now that's a reward worth the quest!", "Cheers! To loot and long life!"],
  bandit: ["That'll do.", "Good. Quick learner.", "Smart. Keep it that way."],
  noble: ["Adequate.", "Hm. Passable, for the mountains.", "Thank you. Do take your thumbprint off the cup."],
};

const WALKOUTS: Record<GuestKind, string[]> = {
  farmer: ["Forget it! I'm going home."],
  soldier: ["The captain will hear of this!"],
  smuggler: ["Waste of my evening."],
  fugitive: ["I can't wait any longer..."],
  adventurer: ["Forget it! The ruins have better service!"],
  bandit: ["You'll regret that, innkeeper."],
  noble: ["Appalling. The Baroness will hear of this."],
};

const FAREWELLS: Record<GuestKind, string[]> = {
  farmer: ["Goodnight, innkeeper!", "Mind the snow, all."],
  soldier: ["Back to the fort, then.", "On your feet, lads."],
  smuggler: ["You never saw me.", "Until next time."],
  fugitive: ["Thank you for the warmth.", "Goodnight..."],
  adventurer: ["To the north road! Wish us luck!", "Keep a bed warm. We'll be back rich!"],
  bandit: ["Nice place. Be a shame if it burned.", "See you next week. Have the coin ready."],
  noble: ["Bring the carriage round. Quickly.", "Charming, in a rustic sort of way."],
};


/** How often a new conversation is about the innkeeper. */
const ABOUT_YOU_CHANCE = 0.2;
/** How often, on top of that, someone in a mood lets it set the subject. */
const MOOD_TALK_CHANCE = 0.25;
/** And how often someone who wants something badly talks about that. */
const DESIRE_TALK_CHANCE = 0.1;
/** At low respect, how often a conversation is smutty gossip about you, and how often a guest leers at you. */
const SMUT_CHANCE = 0.3;
const LEER_CHANCE = 0.5;
/** How often someone with a strong longing lets it show when they're served. */
const DESIRE_THANKS_CHANCE = 0.4;
/** A short beat between lines at a table. */
const TABLE_GAP = 0.6;
/** The pause before the table's idle talk starts. */
const IDLE_PAUSE = 2.5;
/** Idle talk is quieter: a random pause of up to this long between one exchange and the next. */
const IDLE_GAP = 2.5;
/** How many pairs of solo guests can be talking at once, so the room stays readable. */
const MAX_ROOM_TALKS = 2;
/** The pause before another pair strikes up, and the random extra on top of it. */
const ROOM_GAP = 1.5;
const ROOM_GAP_SPREAD = 2.5;
/** After sitting down, a guest waits this long (plus a little, so a party doesn't all shout at once) to call. */
const CALL_DELAY = 0.6;

/** One line of a conversation, and who says it. */
interface ScriptLine {
  guestId: number;
  text: string;
  aboutYou?: boolean;
}

/** What a conversation will be about, and who starts it. */
interface Topic {
  options: readonly Exchange[];
  first: Guest;
  second: Guest;
  aboutYou: boolean;
}

/** About how long a conversation takes to say. */
function spokenFor(lines: Exchange): number {
  return lines.reduce((total, line) => total + lineDuration(line) + TABLE_GAP, 0);
}

/** How long a guest is sure to stay. Nobody leaves before they've been served. */
function stayLeft(guest: Guest): number {
  return guest.status === "eating" ? guest.eatLeft : Infinity;
}

/** Removes the quotation marks around a line from a script. */
export function unquote(text: string): string {
  return text.trim().replace(/^"(.*)"$/s, "$1");
}

/**
 * Which party member says each scripted line, matched by what they're called ("Other farmer" is a farmer)
 * and failing that, whoever hasn't spoken yet. Lines with no speaker are left out.
 */
export function assignSpeakers(chat: readonly string[], members: readonly Guest[]): ScriptLine[] {
  const unmatched = [...members];
  const speakers = new Map<string, number>();
  const lines: ScriptLine[] = [];
  for (const raw of chat) {
    const match = /^([A-Z][A-Za-z ]{0,24}): (".*)$/.exec(raw);
    if (!match || members.length === 0) continue;
    const [, name, said] = match;
    let id = speakers.get(name);
    if (id === undefined) {
      const lower = name.toLowerCase();
      // By their type first ("Archer"), then their group ("Farmer").
      const byType = unmatched.findIndex((g) => lower.includes(roleLabel(g.role, guestFemale(g.id)).toLowerCase()));
      const index = Math.max(0, byType >= 0 ? byType : unmatched.findIndex((g) => lower.includes(SPEAKERS[g.kind].toLowerCase())));
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
  mood: Mood;
}

interface TableState {
  /** The next scripted line, or past the end once it's all been said. */
  next: number;
  wait: number;
  /** The rest of the back-and-forth they're in the middle of, once the script is done. */
  idle: ScriptLine[];
}

/** Two guests who came alone, passing the time. */
interface RoomTalk {
  members: [number, number];
  lines: ScriptLine[];
  wait: number;
}

/** What everyone in the room is saying. */
export class Chatter {
  private readonly guests = new Map<number, GuestState>();
  private readonly tables = new Map<number, TableState>();
  private roomTalks: RoomTalk[] = [];
  /** Counts down to the next pair of solo guests striking up. */
  private roomWait = ROOM_GAP;
  /** Conversations already had, kept from night to night, so none comes round again until the rest are used. */
  private readonly usedExchanges = new Set<Exchange>();
  private lastExchange: Exchange | null = null;
  /** What guests have heard about the innkeeper. */
  private facts: ((kind: GuestKind) => BanterContext) | null = null;

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
    this.roomTalks = [];
    this.roomWait = ROOM_GAP;
  }

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.random() * items.length) % items.length];
  }

  private say(state: GuestState, text: string, tone: Tone, aboutYou = false): void {
    state.said = { text, tone, age: 0, duration: lineDuration(text), mood: state.mood, aboutYou };
  }

  /** Decides what two guests talk about: the innkeeper, whatever mood they're in, or their own lives. */
  private topic(a: Guest, b: Guest): Topic {
    const [first, second] = EXCHANGES[`${a.kind}/${b.kind}`] ? [a, b] : [b, a];
    let roll = this.random();

    const facts = this.facts?.(first.kind);
    if (facts && facts.persona.respect <= LOW_RESPECT) {
      if (roll < SMUT_CHANCE) {
        const gossip = SMUTTY_GOSSIP.filter((talk) => !talk.when || talk.when(facts)).map((talk) => talk.lines);
        return { options: gossip, first, second, aboutYou: true };
      }
      roll = (roll - SMUT_CHANCE) / (1 - SMUT_CHANCE);
    }
    const known = facts ? ABOUT_YOU.filter((talk) => !talk.when || talk.when(facts)).map((talk) => talk.lines) : [];
    if (known.length > 0 && roll < ABOUT_YOU_CHANCE) return { options: known, first, second, aboutYou: true };

    const moody = [first, second].filter((guest) => feltMood(guest) !== "calm");
    if (moody.length > 0 && roll < ABOUT_YOU_CHANCE + MOOD_TALK_CHANCE) {
      if (moody.length === 2 && feltMood(first) !== feltMood(second)) {
        const [earlier, later] = feltMood(first) < feltMood(second) ? [first, second] : [second, first];
        const clash = CLASHES[`${feltMood(earlier)}/${feltMood(later)}`];
        if (clash) return { options: clash, first: earlier, second: later, aboutYou: false };
      }
      const speaker = this.pick(moody);
      const mood = feltMood(speaker);
      const talks = MOOD_TALKS[mood];
      if (talks) {
        const aboutYou = mood === "lust" || mood === "idolize";
        return { options: talks, first: speaker, second: speaker === first ? second : first, aboutYou };
      }
    }

    const longing = [first, second].filter((guest) => guest.desires >= STRONG_DESIRE);
    if (longing.length > 0 && roll >= ABOUT_YOU_CHANCE + MOOD_TALK_CHANCE && roll < ABOUT_YOU_CHANCE + MOOD_TALK_CHANCE + DESIRE_TALK_CHANCE) {
      const speaker = this.pick(longing);
      return { options: DESIRE_TALKS[speaker.kind], first: speaker, second: speaker === first ? second : first, aboutYou: false };
    }
    return { options: [...EXCHANGES[`${first.kind}/${second.kind}`], ...ANYONE], first, second, aboutYou: false };
  }

  /** Whether this guest, who has heard what's said about you, is going to be crude about it. */
  private leers(guest: Guest): boolean {
    const facts = this.facts?.(guest.kind);
    return Boolean(facts && facts.persona.respect <= LOW_RESPECT && guest.mood !== "angry" && this.random() < LEER_CHANCE);
  }

  /** One of `options` that fits in `seconds`, and that hasn't been had yet if there is one. */
  private choose(options: readonly Exchange[], seconds: number): Exchange {
    const fits = options.filter((lines) => spokenFor(lines) <= seconds);
    const shortest = options.reduce((best, lines) => (spokenFor(lines) < spokenFor(best) ? lines : best));
    const pool = fits.length > 0 ? fits : [shortest];
    let fresh = pool.filter((lines) => !this.usedExchanges.has(lines));
    if (fresh.length === 0) {
      // All said: they can come round again, but not the one that was only just had.
      for (const lines of pool) this.usedExchanges.delete(lines);
      fresh = pool.length > 1 ? pool.filter((lines) => lines !== this.lastExchange) : pool;
    }
    const chosen = this.pick(fresh);
    this.usedExchanges.add(chosen);
    this.lastExchange = chosen;
    return chosen;
  }

  /** A back-and-forth for two guests, short enough to finish in the `seconds` they have left together. */
  private exchange(a: Guest, b: Guest, seconds: number): ScriptLine[] {
    const { options, first, second, aboutYou } = this.topic(a, b);
    const chosen = this.choose(options, seconds);
    const concernsYou = aboutYou || chosen.some((line) => /innkeeper/i.test(line));
    return chosen.map((text, turn) => ({ guestId: (turn % 2 === 0 ? first : second).id, text, aboutYou: concernsYou }));
  }

  /**
   * Moves everyone's talk on by `dt` seconds. `parties` are the night's party scripts, `chatting` says
   * whether a party is sitting together, `tableOf` names the table at a seat, since only guests at the same table talk,
   * and `facts` is what guests have heard about the innkeeper.
   */
  update(
    dt: number,
    guests: readonly Guest[],
    parties: readonly PartyPlan[],
    chatting: (party: number) => boolean,
    tableOf: (seat: number) => string = () => "",
    facts: ((kind: GuestKind) => BanterContext) | null = null,
  ): void {
    this.facts = facts;
    // Forget anyone who's gone.
    const present = new Set(guests.map((g) => g.id));
    for (const id of this.guests.keys()) if (!present.has(id)) this.guests.delete(id);

    for (const guest of guests) {
      let state = this.guests.get(guest.id);
      if (!state) {
        state = { status: guest.status, called: 0, callIn: CALL_DELAY + this.random() * 1.2, said: null, mood: feltMood(guest) };
        this.guests.set(guest.id, state);
      }
      state.mood = feltMood(guest);
      const moodLines = MOOD_LINES[state.mood];
      if (state.said) {
        state.said.age += dt;
        if (state.said.age >= state.said.duration) state.said = null;
      }

      const was = state.status;
      state.status = guest.status;
      const kind = guest.kind;
      // Changes of state get said straight away, over whatever they were saying.
      if (was === "waiting" && guest.status === "eating") {
        const longing = guest.desires >= STRONG_DESIRE && guest.mood !== "angry" && this.random() < DESIRE_THANKS_CHANCE;
        const plain = this.leers(guest) ? LEERING_THANKS[kind] : (moodLines?.thanks[kind] ?? THANKS[kind]);
        const thanks = longing ? DESIRE_THANKS[kind] : plain;
        this.say(state, this.pick(thanks), guest.mood === "angry" ? "angry" : "thanks");
        continue;
      }
      if (was !== "leaving" && guest.status === "leaving") {
        if (was === "waiting") this.say(state, this.pick(WALKOUTS[kind]), "angry");
        else if (this.random() < 0.5) {
          this.say(state, this.pick(moodLines?.farewells ?? FAREWELLS[kind]), guest.mood === "angry" ? "angry" : "chat");
        }
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
          const calls = this.leers(guest) ? LEERING_CALLS[kind] : (moodLines?.calls[kind] ?? CALLS[kind]);
          this.say(state, fill(this.pick(calls), guest.order), "call");
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
    this.updateRoom(dt, guests, tableOf);
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
        table = { next: 0, wait: 1 + this.random(), idle: [] };
        this.tables.set(party, table);
      }
      if (this.tableBusy(members)) return;
      table.wait -= dt;
      if (table.wait > 0) return;

      const script = assignSpeakers([...plan.chat, ...(plan.overheard ?? [])], members);
      const scripted = table.next < script.length;
      if (!scripted && table.idle.length === 0) {
        const first = this.pick(members);
        // A table stays until the last of them has finished.
        const seconds = Math.max(...members.map(stayLeft));
        table.idle = this.exchange(first, this.pick(members.filter((g) => g !== first)), seconds);
      }
      const line = scripted ? script[table.next] : table.idle.shift()!;
      table.next++;
      const state = this.guests.get(line.guestId);
      if (!state || !members.some((g) => g.id === line.guestId)) return;
      // In the night's script, naming the innkeeper means calling them over. In idle talk it's gossip.
      this.say(state, line.text, scripted && /innkeeper/i.test(line.text) ? "call" : "chat", line.aboutYou);
      if (table.next < script.length) table.wait = TABLE_GAP;
      else if (table.next === script.length) table.wait = IDLE_PAUSE;
      else table.wait = table.idle.length > 0 ? TABLE_GAP : TABLE_GAP + this.random() * IDLE_GAP;
    });
  }

  /** Whether a guest is free to strike up a conversation: seated, quiet, and has already asked for their order. */
  private canTalk(guest: Guest): boolean {
    const state = this.guests.get(guest.id);
    if (!state || state.said) return false;
    return guest.status === "eating" || (guest.status === "waiting" && state.called >= 1);
  }

  /** Guests who came alone: carries on the exchanges under way, and starts another when there's a pair free. */
  private updateRoom(dt: number, guests: readonly Guest[], tableOf: (seat: number) => string): void {
    const seated = (id: number) => guests.some((g) => g.id === id && (g.status === "waiting" || g.status === "eating"));
    this.roomTalks = this.roomTalks.filter((talk) => {
      if (!talk.members.every(seated)) return false;
      if (talk.members.some((id) => this.saying(id))) return true;
      talk.wait -= dt;
      if (talk.wait > 0) return true;
      const line = talk.lines.shift();
      const state = line && this.guests.get(line.guestId);
      if (!line || !state) return false;
      this.say(state, line.text, "chat", line.aboutYou);
      talk.wait = TABLE_GAP;
      return true;
    });

    this.roomWait -= dt;
    if (this.roomWait > 0 || this.roomTalks.length >= MAX_ROOM_TALKS) return;
    const busy = new Set(this.roomTalks.flatMap((talk) => talk.members));
    const free = guests.filter((g) => g.party === null && !busy.has(g.id) && this.canTalk(g));
    // Only people sharing a table talk; nobody shouts across the room to a stranger.
    const byTable = new Map<string, Guest[]>();
    for (const guest of free) {
      const table = tableOf(guest.seat);
      byTable.set(table, [...(byTable.get(table) ?? []), guest]);
    }
    const tables = [...byTable.values()].filter((group) => group.length >= 2);
    if (tables.length === 0) return;
    const group = this.pick(tables);
    const first = this.pick(group);
    const second = this.pick(group.filter((g) => g !== first));
    const seconds = Math.min(stayLeft(first), stayLeft(second));
    this.roomTalks.push({ members: [first.id, second.id], lines: this.exchange(first, second, seconds), wait: 0 });
    this.roomWait = ROOM_GAP + this.random() * ROOM_GAP_SPREAD;
  }
}
