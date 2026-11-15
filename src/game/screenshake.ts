/**
 * The screen shake, Karryn's Prison's own: RPG Maker's, stepped frame by frame at 60 a second. The picture slides
 * side to side in a triangle wave, `power × speed / 10` pixels a frame, turning back each time it's `power × 2`
 * out; once its frames are up it carries on to the middle and stops there. The pixels are KP's, on its 1440-wide
 * screen, so they're scaled to ours.
 *
 * Like KP, only the pictures shake (the room, her big picture, the foes across from her), never the words.
 */

export interface Shake {
  power: number;
  speed: number;
  /** How many frames it's driven for, before it settles back. */
  frames: number;
}

/** KP's numbers (RemtairyEnemySex.js, RemtairyCutIn.js, RemtairyBeforeYEPBattleCore.js). */
export const SHAKES = {
  /** A blow landing on her in a fight. */
  hit: { power: 5, speed: 5, frames: 10 },
  /** A spank, or a smack on the floor. */
  spank: { power: 4, speed: 10, frames: 6 },
  /** She comes. */
  climax: { power: 6, speed: 6, frames: 10 },
  /** She comes again: the harder one. KP shakes this one when her pleasure's run past twice what tips her over. */
  bigClimax: { power: 12, speed: 8, frames: 10 },
} as const satisfies Record<string, Shake>;

export type ShakeKind = keyof typeof SHAKES;

export const SHAKE_FPS = 60;
/** How wide KP's screen is, which its shake's pixels are measured on. */
export const SHAKE_SCREEN_WIDTH = 1440;

export class ScreenShake {
  private power = 0;
  private speed = 0;
  private duration = 0;
  /** Which way it's sliding: kept from one shake to the next, as RPG Maker keeps it. */
  private direction = 1;
  private shake = 0;
  private clock = 0;

  /** Starts a shake. One already going carries on from where it is, with the new one's numbers. */
  start(kind: ShakeKind): void {
    const s = SHAKES[kind];
    this.power = s.power;
    this.speed = s.speed;
    this.duration = s.frames;
  }

  /** Whether it's still moving. */
  get shaking(): boolean {
    return this.duration > 0 || this.shake !== 0;
  }

  /** How far out it is, in KP's pixels, rounded as RPG Maker draws it. */
  get offset(): number {
    return Math.round(this.shake);
  }

  /** Steps it on by `dt` seconds, a whole frame at a time, and says how far out it is. */
  update(dt: number): number {
    if (!this.shaking) {
      this.clock = 0;
      return 0;
    }
    this.clock += dt;
    while (this.clock >= 1 / SHAKE_FPS && this.shaking) {
      this.clock -= 1 / SHAKE_FPS;
      this.frame();
    }
    return this.offset;
  }

  /** RPG Maker's Game_Screen.updateShake, line for line. */
  private frame(): void {
    const delta = (this.power * this.speed * this.direction) / 10;
    if (this.duration <= 1 && this.shake * (this.shake + delta) < 0) this.shake = 0;
    else this.shake += delta;
    if (this.shake > this.power * 2) this.direction = -1;
    if (this.shake < -this.power * 2) this.direction = 1;
    this.duration--;
  }
}

/** KP's shake on our screen: its pixels, scaled from its 1440 to however wide ours is. */
export function shakePixels(offset: number, screenWidth: number): number {
  return Math.round((offset * screenWidth) / SHAKE_SCREEN_WIDTH);
}

/**
 * What one after-hours turn shakes the screen for, if anything: her coming (harder from the second time on), or else
 * a man spanking her. `climaxes` is how many times she's come, before the turn and after it.
 */
export function duelShake(
  turn: readonly { side: string; part?: string; stage?: number }[],
  climaxes: { before: number; after: number },
): ShakeKind | null {
  if (climaxes.after > climaxes.before) return climaxes.after >= 2 ? "bigClimax" : "climax";
  if (turn.some((e) => e.side === "partner" && e.part === "butt" && e.stage === SPANK_STAGE)) return "spank";
  return null;
}

/** A man on her rear, a step bolder than his hands: he spanks her (dueltalk.ts THEIR_STAGES.butt). */
export const SPANK_STAGE = 1;
