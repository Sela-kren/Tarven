/**
 * The world's time of day, shared by everything: the tavern asks it whether night has fallen, and the
 * lighting reads the sun from it. It knows nothing about rendering or about the tavern, so scenes
 * added later (the street outside, the market) can run on the same clock.
 *
 * Time is kept as hours since the game began, so it never wraps: 26 is 2 AM on day 1.
 */

/** When the sun is on the horizon. Noon is halfway between. */
export const SUNRISE = 6;
export const SUNSET = 18;
const DAY_LENGTH = SUNSET - SUNRISE;

/** The sun's height (-1 to 1) at which daylight starts to fade, and at which it is fully dark. */
const DAYLIGHT_FULL = 0.2;
const DAYLIGHT_GONE = -0.08;

/** A clock face for an hour of the day, to the nearest ten minutes: "8:00 AM", "5:30 PM". */
export function formatHour(hour: number): string {
  const tens = Math.floor((((hour % 24) + 24) % 24) * 6);
  const h = Math.floor(tens / 6);
  const minutes = String((tens % 6) * 10).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${minutes} ${h < 12 ? "AM" : "PM"}`;
}

interface Transition {
  from: number;
  to: number;
  elapsed: number;
  duration: number;
}

export class WorldClock {
  /** Hours since the game began. */
  time = 0;
  /** Game hours that pass per real second when not in a transition. */
  private rate = 0;
  /** Time stops here until something moves it on. */
  private holdAt = Infinity;
  private transition: Transition | null = null;

  /** Hour of the day, 0 to 24. */
  get hour(): number {
    return ((this.time % 24) + 24) % 24;
  }

  /** Which day it is, counting from 0. */
  get day(): number {
    return Math.floor(this.time / 24);
  }

  /** The sun's height: 1 at noon, 0 at sunrise and sunset, -1 at midnight. */
  get sunHeight(): number {
    return Math.sin((Math.PI * (this.hour - SUNRISE)) / DAY_LENGTH);
  }

  /** How far the sun has crossed the sky today: 0 at sunrise, 1 at sunset (outside that range at night). */
  get sunProgress(): number {
    return (this.hour - SUNRISE) / DAY_LENGTH;
  }

  /** 1 in full daylight, 0 in full dark, blending through dawn and dusk. */
  get daylight(): number {
    const t = Math.min(1, Math.max(0, (this.sunHeight - DAYLIGHT_GONE) / (DAYLIGHT_FULL - DAYLIGHT_GONE)));
    return t * t * (3 - 2 * t);
  }

  /** Fully dark, and not part-way through moving the time on. */
  get isNight(): boolean {
    return this.daylight === 0 && !this.transition;
  }

  get transitioning(): boolean {
    return this.transition !== null;
  }

  /** Jumps to a time on a given day, stopped there. */
  setTime(day: number, hour: number): void {
    this.time = day * 24 + hour;
    this.transition = null;
    this.rate = 0;
    this.holdAt = Infinity;
  }

  /** Lets time pass at `hoursPerSecond`, stopping when the clock reaches `untilHour` (if given). */
  run(hoursPerSecond: number, untilHour?: number): void {
    this.rate = hoursPerSecond;
    this.holdAt = untilHour === undefined ? Infinity : this.next(untilHour);
  }

  /** Moves the clock forwards to the next `hour` over `seconds`, easing in and out, then holds there. */
  transitionTo(hour: number, seconds: number): void {
    this.transition = { from: this.time, to: this.next(hour), elapsed: 0, duration: seconds };
    this.rate = 0;
    this.holdAt = Infinity;
  }

  update(dt: number): void {
    const move = this.transition;
    if (move) {
      move.elapsed += dt;
      const t = Math.min(1, move.elapsed / move.duration);
      this.time = move.from + (move.to - move.from) * (t * t * (3 - 2 * t));
      if (t >= 1) this.transition = null;
      return;
    }
    this.time = Math.min(this.holdAt, this.time + this.rate * dt);
  }

  /** The next time the clock shows `hour`, from now (now itself counts). */
  private next(hour: number): number {
    const today = this.day * 24 + hour;
    return today >= this.time ? today : today + 24;
  }
}
