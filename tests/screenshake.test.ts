import { describe, expect, it } from "vitest";
import { duelShake, ScreenShake, SHAKE_FPS, SHAKES, shakePixels, SPANK_STAGE, type ShakeKind } from "../src/game/screenshake";

const FRAME = 1 / SHAKE_FPS;

/** Every frame's offset, from the start of a shake to its stop. */
function run(kind: ShakeKind): number[] {
  const shake = new ScreenShake();
  shake.start(kind);
  const out: number[] = [];
  while (shake.shaking && out.length < 600) out.push(shake.update(FRAME));
  return out;
}

describe("the screen shake, KP's own", () => {
  it("slides a blow out and back in its ten frames, turning past twice its power", () => {
    // Power 5, speed 5: 2.5px a frame, turning back once past 10.
    expect(run("hit")).toEqual([3, 5, 8, 10, 13, 10, 8, 5, 3, 0]);
  });

  it("snaps a spank out and back in six", () => {
    expect(run("spank")).toEqual([4, 8, 12, 8, 4, 0]);
  });

  it("settles every kind back in the middle, never further out than a frame past its turn", () => {
    for (const kind of Object.keys(SHAKES) as ShakeKind[]) {
      const frames = run(kind);
      const { power, speed } = SHAKES[kind];
      expect(frames.length, kind).toBeLessThan(60);
      expect(frames.at(-1), kind).toBe(0);
      expect(Math.max(...frames.map(Math.abs)), kind).toBeLessThanOrEqual(Math.ceil(power * 2 + (power * speed) / 10));
    }
  });

  it("her coming harder shakes harder", () => {
    const peak = (kind: ShakeKind) => Math.max(...run(kind).map(Math.abs));
    expect(peak("bigClimax")).toBeGreaterThan(peak("climax"));
  });

  it("keeps time in whole frames however the seconds come", () => {
    const shake = new ScreenShake();
    shake.start("hit");
    expect(shake.update(FRAME * 0.5)).toBe(0);
    expect(shake.update(FRAME * 0.5)).toBe(3);
    // A long stall plays the frames it missed and comes to rest.
    expect(shake.update(1)).toBe(0);
    expect(shake.shaking).toBe(false);
    // Standing still doesn't bank time for the next one: it moves one frame's step, no more. (It sets off the way
    // the last one was going, as RPG Maker's does: left, -2.5 drawn as -2.)
    shake.update(5);
    shake.start("hit");
    expect(shake.update(FRAME)).toBe(-2);
  });

  it("scales KP's pixels from its 1440-wide screen to ours", () => {
    expect(shakePixels(10, 1440)).toBe(10);
    expect(shakePixels(10, 720)).toBe(5);
    expect(shakePixels(0, 1920)).toBe(0);
  });
});

describe("what an after-hours turn shakes for", () => {
  const spank = { side: "partner", part: "butt", stage: SPANK_STAGE };
  const none = { before: 0, after: 0 };

  it("her coming, harder from the second time on", () => {
    expect(duelShake([], { before: 0, after: 1 })).toBe("climax");
    expect(duelShake([], { before: 1, after: 2 })).toBe("bigClimax");
  });

  it("a man spanking her, unless she came the same turn", () => {
    expect(duelShake([spank], none)).toBe("spank");
    expect(duelShake([spank], { before: 0, after: 1 })).toBe("climax");
  });

  it("nothing for a grab of her rear, or her own move", () => {
    expect(duelShake([{ ...spank, stage: 0 }], none)).toBeNull();
    expect(duelShake([{ side: "her", part: "butt", stage: SPANK_STAGE }], none)).toBeNull();
    expect(duelShake([], none)).toBeNull();
  });
});
