import { describe, expect, it } from "vitest";
import { formatHour, SUNRISE, SUNSET, WorldClock } from "../src/game/time";

function clockAt(day: number, hour: number): WorldClock {
  const clock = new WorldClock();
  clock.setTime(day, hour);
  return clock;
}

function pass(clock: WorldClock, seconds: number): void {
  for (let i = 0; i < seconds * 10; i++) clock.update(0.1);
}

describe("world clock", () => {
  it("is fully light at midday and fully dark at midnight", () => {
    expect(clockAt(0, 12).daylight).toBe(1);
    expect(clockAt(0, 0).daylight).toBe(0);
    expect(clockAt(0, 0).isNight).toBe(true);
  });

  it("fades through dawn and dusk", () => {
    const dusk = clockAt(0, SUNSET).daylight;
    expect(dusk).toBeGreaterThan(0);
    expect(dusk).toBeLessThan(1);
    const dawn = clockAt(0, SUNRISE).daylight;
    expect(dawn).toBeCloseTo(dusk);
  });

  it("stands still until told to run, then stops at the hour it was given", () => {
    const clock = clockAt(2, 8);
    pass(clock, 10);
    expect(clock.hour).toBe(8);
    clock.run(1, 11);
    pass(clock, 2);
    expect(clock.hour).toBeCloseTo(10);
    pass(clock, 10);
    expect(clock.hour).toBe(11);
    expect(clock.day).toBe(2);
  });

  it("moves on to nightfall over a few seconds, and only counts as night once there", () => {
    const clock = clockAt(0, 17);
    clock.transitionTo(21, 5);
    pass(clock, 4);
    expect(clock.daylight).toBe(0);
    expect(clock.isNight).toBe(false);
    pass(clock, 1.1);
    expect(clock.hour).toBeCloseTo(21);
    expect(clock.isNight).toBe(true);
  });

  it("goes forwards past midnight into the next day", () => {
    const clock = clockAt(0, 22);
    clock.transitionTo(6, 1);
    pass(clock, 1.1);
    expect(clock.day).toBe(1);
    expect(clock.hour).toBeCloseTo(6);
  });

  it("reads like a clock face", () => {
    expect(formatHour(8)).toBe("8:00 AM");
    expect(formatHour(17.5)).toBe("5:30 PM");
    expect(formatHour(0.25)).toBe("12:10 AM");
    expect(formatHour(12)).toBe("12:00 PM");
  });
});
