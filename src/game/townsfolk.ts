/**
 * The people of Tarven going about their day on the high street (street.ts): they walk the street by the nav grid,
 * stop at something to do (the market stalls, the notice board, a word with a neighbour), and now and then go in
 * through a door, or out of town, and come back out of another one later.
 *
 * Their bodies are made the way the guests' are (game.ts `makeGuestBody`), so they're as varied as the guests. They
 * only move while she's out in the street; the rest of the time they wait where they were.
 */
import { Group, type Vector3 } from "three";
import type { Body } from "./player";
import type { Rect, Vec2 } from "./collision";
import { NavGrid } from "./path";
import { Walker } from "./guests";

/** Something to do somewhere on the street: where to stand, which way to face, and for how long. */
export interface TownActivity {
  at: Vec2;
  /** Which way to face while there (0 = north, toward the houses). */
  heading: number;
  /** Seconds to stay, at least and at most. */
  stay: [number, number];
  /** For a chat: the index of the activity facing this one, where whoever they're talking to stands. */
  pair?: number;
}

/** One of the townsfolk as the game sees them, read-only (for their street talk, towntalk.ts). */
export interface TownPersonView {
  /** The index their body was made with (`makeBody(index)`). */
  readonly index: number;
  /** Where they stand, in the world (their walker's own position: don't move it). */
  readonly position: Vector3;
  readonly visible: boolean;
  readonly state: "walking" | "doing" | "indoors";
  /** The activity they're at or heading to (an index into the street's activities), or -1 for a door. */
  readonly activity: number;
}

/** How many townsfolk are out in the town at once (street.ts has ~25 things for them to do). */
const PEOPLE = 12;
/** How often (0-1) someone done with what they were doing goes indoors or out of town instead. */
const GO_IN_CHANCE = 0.3;
/** Seconds someone stays indoors before coming back out of a door. */
const INDOORS: [number, number] = [8, 25];
/** How far they keep from walls and stalls when finding their way. */
const CLEARANCE = 0.3;

interface Person {
  walker: Walker;
  state: "walking" | "doing" | "indoors";
  /** Seconds left at what they're doing, or indoors. */
  left: number;
  /** The activity they're heading to or at (an index), or -1 for a door. */
  activity: number;
}

export class Townsfolk {
  readonly group = new Group();
  private readonly crowd: Person[] = [];
  private readonly nav: NavGrid;
  private readonly taken = new Set<number>();

  constructor(
    private readonly activities: readonly TownActivity[],
    private readonly doors: readonly Vec2[],
    colliders: readonly Rect[],
    bounds: Rect,
    makeBody: (index: number) => Body,
    private readonly random: () => number = Math.random,
  ) {
    this.nav = new NavGrid(colliders, CLEARANCE, bounds);
    for (let i = 0; i < PEOPLE; i++) {
      const walker = new Walker(makeBody(i));
      const person: Person = { walker, state: "doing", left: 0, activity: -1 };
      // Everyone starts somewhere along the street already, at something to do or on their way.
      const start = this.freeActivity();
      if (start >= 0) {
        this.taken.add(start);
        const { at, heading } = this.activities[start];
        walker.group.position.set(at.x, 0, at.z);
        walker.face(heading);
        person.activity = start;
        person.left = this.between(this.activities[start].stay) * this.random();
      } else {
        this.goIndoors(person);
      }
      this.crowd.push(person);
      this.group.add(walker.group);
    }
  }

  /** Everyone, in the order their bodies were made. */
  people(): TownPersonView[] {
    return this.crowd.map((person, index) => ({
      index,
      position: person.walker.group.position,
      visible: person.walker.group.visible,
      state: person.state,
      activity: person.activity,
    }));
  }

  update(dt: number): void {
    for (const person of this.crowd) {
      if (person.state === "indoors") {
        person.left -= dt;
        if (person.left <= 0) this.comeOut(person);
        continue;
      }
      if (person.state === "walking") {
        if (!person.walker.walk(dt)) continue;
        if (person.activity < 0) {
          this.goIndoors(person);
          continue;
        }
        person.state = "doing";
        person.left = this.between(this.activities[person.activity].stay);
        continue;
      }
      // Doing something: turned to it, standing easy.
      const activity = this.activities[person.activity];
      if (activity) person.walker.turnTo(activity.heading, dt);
      person.walker.settle(dt);
      person.left -= dt;
      if (person.left <= 0) this.moveOn(person);
    }
  }

  /** Done here: on to something else, or off indoors or out of town. */
  private moveOn(person: Person): void {
    this.taken.delete(person.activity);
    const next = this.random() < GO_IN_CHANCE ? -1 : this.freeActivity();
    const from = { x: person.walker.group.position.x, z: person.walker.group.position.z };
    const to = next >= 0 ? this.activities[next].at : this.pick(this.doors);
    if (next >= 0) this.taken.add(next);
    person.activity = next;
    person.state = "walking";
    person.walker.setPath(this.nav.findPath(from, to) ?? [to]);
  }

  private goIndoors(person: Person): void {
    person.state = "indoors";
    person.activity = -1;
    person.left = this.between(INDOORS);
    person.walker.group.visible = false;
  }

  /** Back out of a door, on the way to something to do. */
  private comeOut(person: Person): void {
    const door = this.pick(this.doors);
    person.walker.group.position.set(door.x, 0, door.z);
    person.walker.group.visible = true;
    const next = this.freeActivity();
    if (next < 0) {
      person.left = this.between(INDOORS);
      person.walker.group.visible = false;
      return;
    }
    this.taken.add(next);
    person.activity = next;
    person.state = "walking";
    person.walker.setPath(this.nav.findPath(door, this.activities[next].at) ?? [this.activities[next].at]);
  }

  /** Something nobody else is at or heading to, or -1 if everything's taken. */
  private freeActivity(): number {
    const free = this.activities.map((_, i) => i).filter((i) => !this.taken.has(i));
    return free.length ? this.pick(free) : -1;
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.random() * list.length) % list.length];
  }

  private between([low, high]: [number, number]): number {
    return low + (high - low) * this.random();
  }
}
