/**
 * The town's talk, played out in the street: who says what (towntalk.ts) turned into speech bubbles over the
 * townsfolk (townsfolk.ts) and over her, with the timing that keeps it readable.
 *
 * - **Passing lines.** Someone standing near her as she walks by calls out a line about her (most of it keyed on her
 *   state: arc, Respect, Fame, drink, mess, what she's wearing, titles, passives). One passing bubble at a time, and
 *   nobody speaks twice in a row.
 * - **Her answer.** About half the time she answers once their line has typed out: out loud as a bubble over her, or
 *   as a thought in the log.
 * - **Chats.** Two townsfolk standing at a chat pair talk to each other, a line at a time. When it's about her and
 *   she's too far off, the bubble is hushed (the same as guests' gossip in the taproom).
 * - **Talking to someone (E).** Their line, her answer, their comeback.
 * - **Heat moments.** Now and then her own want takes over mid-talk (towntalk.ts `heatChance`): mostly when she
 *   stops someone, sometimes on a passing word. Its beats play as bubbles in turn, her kept thoughts go to the log,
 *   and when it's played out `onHeat` gets the outcome for the game to apply.
 * - **Acts.** A line with something done with it (a whistle, a bow, a hand asked for or landing) goes to `onAct`,
 *   with her yes or no when it was asked.
 *
 * Kept apart from game.ts: the game fills the facts and the people, this decides who speaks.
 */
import { Vector3 } from "three";
import { BUBBLE_TYPE_SPEED, lineDuration, type Said } from "./chatter";
import type { Speaker } from "./speech";
import {
  heatChance,
  pickChat,
  pickHeatMoment,
  pickExchange,
  pickPassingLine,
  pickReply,
  RecentLines,
  type HeatMoment,
  type TownAct,
  type TownFacts,
  type Townsperson,
} from "./towntalk";

/** How close someone has to be to call out to her as she passes. */
export const PASSING_RANGE = 2.6;
/** How close she has to be to make out talk about her, as in the taproom (game.ts OVERHEAR_RANGE). */
export const OVERHEAR_RANGE = 4.5;
/** Seconds before the same person calls out to her again. */
const PERSON_REST: [number, number] = [25, 40];
/** Seconds of quiet after a passing line before the next one. */
const PASSING_GAP: [number, number] = [3, 4.5];
/** How often she answers a passing line. */
const ANSWER_CHANCE = 0.5;
/** Seconds between a pair's chats, and between the lines of one. */
const CHAT_GAP: [number, number] = [6, 10];
const CHAT_LINE_GAP = 0.6;
/** The pause between the beats of a heat moment. */
const HEAT_BEAT_GAP = 0.45;
/** Bubble id for her; townsfolk get TOWNSFOLK_ID + their index. */
export const HER_ID = 9_999;
export const TOWNSFOLK_ID = 10_000;
/** How high over the ground a bubble's tail points, for townsfolk and for her. */
const SPEECH_HEIGHT = 2.7;
const HER_SPEECH_HEIGHT = 2.35;

/** What the talk needs to know of one of the townsfolk (townsfolk.ts `view`). */
export interface TalkPerson {
  index: number;
  position: { x: number; z: number };
  visible: boolean;
  state: "walking" | "doing" | "indoors";
  activity: number;
}

/** A line waiting its turn: who says it, after how many seconds, and how. */
interface Queued {
  /** TOWNSFOLK_ID + index, or HER_ID. */
  id: number;
  delay: number;
  said: Said;
  /** Said loud enough for her to hear wherever she is. */
  loud: boolean;
  /** The pair's chat this belongs to, if any. */
  pair?: number;
}

const between = ([low, high]: readonly [number, number], random: () => number) => low + (high - low) * random();

export class StreetTalk {
  /** What each speaker is saying now. */
  private readonly saying = new Map<number, { said: Said; loud: boolean }>();
  private readonly queue: Queued[] = [];
  /** Seconds before each person may call out to her again. */
  private readonly rest = new Map<number, number>();
  private passingGap = 2;
  /** Seconds before each chat pair talks again, and whether it's mid-chat. */
  private readonly pairWait: number[];
  private readonly pairBusy: boolean[];
  private readonly recentPassing = new RecentLines(40);
  private readonly recentExchanges = new RecentLines(12);
  private readonly recentChats = new RecentLines(20);
  private readonly recentHeat = new RecentLines(30);
  /** Things to do once some seconds have passed: her thoughts mid-moment, a heat moment's outcome. */
  private readonly timers: { delay: number; fire: () => void }[] = [];

  /** A heat moment has played out: the game applies its effects and logs its summary. */
  onHeat: ((moment: HeatMoment, index: number) => void) | null = null;
  /**
   * Someone did something as they spoke (TownAct): the game can play it on them. `answer` is her yes or no when
   * they asked (a hand asked for); null when nothing was asked. A "grope" only comes with the Consent switch off.
   */
  onAct: ((index: number, act: TownAct, answer: "yes" | "no" | null) => void) | null = null;

  constructor(
    /** Who each of the townsfolk is, by index. */
    private readonly who: (index: number) => Townsperson,
    /** Pairs of activity indices where two townsfolk stand and talk. */
    private readonly chatPairs: readonly (readonly [number, number])[],
    /** Her thoughts, and anything else for the log. */
    private readonly think: (text: string) => void,
    private readonly random: () => number = Math.random,
  ) {
    this.pairWait = chatPairs.map(() => between(CHAT_GAP, random));
    this.pairBusy = chatPairs.map(() => false);
  }

  /** Everything said stops (she went back inside). */
  clear(): void {
    this.saying.clear();
    this.queue.length = 0;
    this.timers.length = 0;
    this.pairBusy.fill(false);
  }

  update(dt: number, people: readonly TalkPerson[], her: { x: number; z: number }, facts: TownFacts): void {
    // Lines already up age, and come down when their time's up.
    for (const [id, line] of this.saying) {
      line.said.age += dt;
      if (line.said.age >= line.said.duration) this.saying.delete(id);
    }
    // Lines waiting their turn.
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const queued = this.queue[i];
      queued.delay -= dt;
      if (queued.delay > 0) continue;
      this.queue.splice(i, 1);
      this.saying.set(queued.id, { said: queued.said, loud: queued.loud });
      if (queued.pair !== undefined && !this.queue.some((q) => q.pair === queued.pair)) {
        this.pairBusy[queued.pair] = false;
        this.pairWait[queued.pair] = queued.said.duration + between(CHAT_GAP, this.random);
      }
    }
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const timer = this.timers[i];
      timer.delay -= dt;
      if (timer.delay > 0) continue;
      this.timers.splice(i, 1);
      timer.fire();
    }
    for (const [index, left] of this.rest) this.rest.set(index, left - dt);

    this.passing(dt, people, her, facts);
    this.chats(dt, people, her, facts);
  }

  /** Someone near her calls out as she goes by. */
  private passing(dt: number, people: readonly TalkPerson[], her: { x: number; z: number }, facts: TownFacts): void {
    this.passingGap -= dt;
    if (this.passingGap > 0) return;
    let nearest: TalkPerson | null = null;
    let nearestDistance = PASSING_RANGE;
    for (const person of people) {
      if (!person.visible || person.state === "indoors") continue;
      if ((this.rest.get(person.index) ?? 0) > 0 || this.busy(person.index)) continue;
      const distance = Math.hypot(person.position.x - her.x, person.position.z - her.z);
      if (distance < nearestDistance) [nearest, nearestDistance] = [person, distance];
    }
    if (!nearest) return;
    const pick = pickPassingLine(facts, this.who(nearest.index), this.recentPassing, this.random);
    this.rest.set(nearest.index, between(PERSON_REST, this.random));
    if (!pick) return;
    const said = this.say(TOWNSFOLK_ID + nearest.index, pick.text, pick.mood, true, 0, true);
    this.passingGap = said.duration + between(PASSING_GAP, this.random);
    const after = pick.text.length / BUBBLE_TYPE_SPEED + 0.6;
    // Now and then a word in the street is enough to set her heat off.
    if (this.random() < heatChance(facts, "passing")) {
      const moment = pickHeatMoment(facts, this.who(nearest.index), this.recentHeat, this.random, { opener: false });
      if (moment) {
        const length = this.playHeat(nearest.index, moment, after);
        this.passingGap = Math.max(this.passingGap, length + between(PASSING_GAP, this.random));
        return;
      }
    }
    // A question always gets her answer; anything else, about half the time.
    let answer: "yes" | "no" | null = null;
    if (pick.ask || this.random() < ANSWER_CHANCE) answer = this.answer(pick.id, after, facts);
    if (pick.act) this.onAct?.(nearest.index, pick.act, pick.ask ? answer : null);
  }

  /** Her answer to a line, once it's typed out (`after` seconds): out loud, or to herself. Her yes or no, if asked. */
  private answer(lineId: string, after: number, facts: TownFacts): "yes" | "no" | null {
    const reply = pickReply(lineId, facts, this.random);
    if (!reply) return null;
    if (reply.thought) this.think(reply.text);
    else this.say(HER_ID, reply.text, "calm", false, after, true);
    return reply.answer ?? null;
  }

  /**
   * Plays a heat moment's beats in turn, from `start` seconds on: theirs over them, hers over her, her kept thoughts
   * to the log; then reports it to `onHeat`. Returns how long it takes.
   */
  private playHeat(index: number, moment: HeatMoment, start: number): number {
    const id = TOWNSFOLK_ID + index;
    let delay = start;
    for (const beat of moment.beats) {
      if (beat.thought) {
        this.timers.push({ delay, fire: () => this.think(beat.text) });
        delay += 1.2;
        continue;
      }
      const said = this.say(beat.who === "her" ? HER_ID : id, beat.text, beat.mood, beat.who === "them", delay, true);
      delay += said.duration + HEAT_BEAT_GAP;
    }
    this.timers.push({ delay, fire: () => this.onHeat?.(moment, index) });
    this.rest.set(index, delay + between(PERSON_REST, this.random));
    return delay;
  }

  /** Two townsfolk at a chat pair talk to each other. */
  private chats(dt: number, people: readonly TalkPerson[], her: { x: number; z: number }, facts: TownFacts): void {
    this.chatPairs.forEach(([first, second], pair) => {
      if (this.pairBusy[pair]) return;
      this.pairWait[pair] -= dt;
      if (this.pairWait[pair] > 0) return;
      const a = people.find((p) => p.state === "doing" && p.visible && p.activity === first);
      const b = people.find((p) => p.state === "doing" && p.visible && p.activity === second);
      if (!a || !b || this.busy(a.index) || this.busy(b.index)) {
        this.pairWait[pair] = 1;
        return;
      }
      const middle = { x: (a.position.x + b.position.x) / 2, z: (a.position.z + b.position.z) / 2 };
      const near = Math.hypot(middle.x - her.x, middle.z - her.z) < OVERHEAR_RANGE;
      const chat = pickChat(facts, this.who(a.index), this.who(b.index), this.recentChats, this.random, near);
      if (!chat) {
        this.pairWait[pair] = between(CHAT_GAP, this.random);
        return;
      }
      let delay = 0;
      for (const line of chat.lines) {
        const speaker = line.who === 0 ? a : b;
        const said = this.said(line.text, "calm", chat.aboutYou);
        this.queue.push({ id: TOWNSFOLK_ID + speaker.index, delay, said, loud: chat.loud, pair });
        delay += said.duration + CHAT_LINE_GAP;
      }
      this.pairBusy[pair] = true;
    });
  }

  /**
   * She stops to talk to one of the townsfolk (E): their line, hers, and their comeback. False if they've nothing
   * to say (they're mid-line already).
   */
  talkTo(index: number, facts: TownFacts): boolean {
    if (this.busy(index)) return false;
    // Sometimes her heat takes over the talk.
    if (this.random() < heatChance(facts, "talk")) {
      const moment = pickHeatMoment(facts, this.who(index), this.recentHeat, this.random);
      if (moment) {
        const length = this.playHeat(index, moment, 0);
        this.passingGap = Math.max(this.passingGap, length);
        return true;
      }
    }
    const pick = pickExchange(facts, this.who(index), this.recentExchanges, this.random);
    if (!pick) return false;
    const id = TOWNSFOLK_ID + index;
    const first = this.say(id, pick.npc, pick.mood, true, 0, true);
    let delay = first.duration + CHAT_LINE_GAP;
    if (pick.her.thought) this.think(pick.her.text);
    else if (pick.her.text) {
      const hers = this.say(HER_ID, pick.her.text, "calm", false, delay, true);
      delay += hers.duration + CHAT_LINE_GAP;
    }
    if (pick.back) this.say(id, pick.back, pick.mood, true, delay, true);
    this.rest.set(index, between(PERSON_REST, this.random));
    return true;
  }

  /** The bubbles to draw this frame, over the townsfolk and over her. */
  speakers(people: readonly TalkPerson[], herAt: Vector3): Speaker[] {
    const speakers: Speaker[] = [];
    for (const [id, { said, loud }] of this.saying) {
      if (id === HER_ID) {
        speakers.push({ id, said, at: new Vector3(herAt.x, HER_SPEECH_HEIGHT, herAt.z), hushed: false });
        continue;
      }
      const person = people.find((p) => p.index === id - TOWNSFOLK_ID);
      if (!person || !person.visible) continue;
      const far = Math.hypot(person.position.x - herAt.x, person.position.z - herAt.z) > OVERHEAR_RANGE;
      speakers.push({
        id,
        said,
        at: new Vector3(person.position.x, SPEECH_HEIGHT, person.position.z),
        hushed: said.aboutYou && far && !loud,
      });
    }
    return speakers;
  }

  /** Whether someone's saying something, or has a line waiting. */
  private busy(index: number): boolean {
    const id = TOWNSFOLK_ID + index;
    return this.saying.has(id) || this.queue.some((q) => q.id === id);
  }

  /** Whether a heat moment is still playing out (its outcome not yet reported). */
  get heatPlaying(): boolean {
    return this.timers.length > 0;
  }

  private said(text: string, mood: Said["mood"], aboutYou: boolean): Said {
    return { text, tone: "chat", age: 0, duration: lineDuration(text), mood, aboutYou };
  }

  /** Puts a line up now, or queues it to start after `delay` seconds. */
  private say(id: number, text: string, mood: Said["mood"], aboutYou: boolean, delay: number, loud: boolean): Said {
    const said = this.said(text, mood, aboutYou);
    if (delay <= 0) this.saying.set(id, { said, loud });
    else this.queue.push({ id, delay, said, loud });
    return said;
  }
}
