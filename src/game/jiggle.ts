import { Object3D, Quaternion, Vector3 } from "three";

/** How one soft part answers the body's movement. */
export interface SpringSettings {
  /** How many times a second it bounces. */
  frequency: number;
  /** 0 bounces for ever; 1 settles without overshooting. */
  damping: number;
  /** How far it lags, in metres per m/s² of the body's acceleration. */
  gain: number;
  /** How freely it moves side to side (x), up and down (y) and forwards and back (z). */
  axes: readonly [number, number, number];
  /** The furthest it moves from rest, in metres. */
  limit: number;
  /**
   * The furthest it moves each way along x, y and z, [least, most] in metres, for a part lying against the body
   * that can swing away from it but not into it: it comes to rest there, as against the body.
   */
  range?: readonly [readonly [number, number], readonly [number, number], readonly [number, number]];
}

/** Snaps such as sitting down or swapping siblings would otherwise fling the parts. */
const MAX_ACCELERATION = 40;
/** The spring is stepped at least this finely, so it stays steady at low frame rates. */
const STEP = 1 / 120;

const anchor = new Vector3();
const velocity = new Vector3();
const acceleration = new Vector3();
const toLocal = new Quaternion();

/**
 * Secondary motion for one bone: a damped spring that lags behind its parent. The bone's rest
 * position is its spring's centre; the parent's acceleration, turned into the parent's own frame,
 * pushes the bone the other way, as a weight on a spring would be.
 */
export class Jiggle {
  private rest: Vector3;
  private readonly offset = new Vector3();
  private readonly speed = new Vector3();
  private readonly lastAnchor = new Vector3();
  private readonly lastVelocity = new Vector3();
  /** Frames of history; acceleration needs two. */
  private history = 0;

  constructor(
    readonly bone: Object3D,
    private settings: SpringSettings,
    /** Scales how far it moves; 0 holds it still. */
    public strength = 1,
  ) {
    this.rest = bone.position.clone();
  }

  update(dt: number): void {
    const parent = this.bone.parent;
    if (!parent || dt <= 0) return;
    parent.updateWorldMatrix(true, false);
    anchor.copy(this.rest).applyMatrix4(parent.matrixWorld);
    velocity.copy(anchor).sub(this.lastAnchor).divideScalar(dt);
    acceleration.copy(velocity).sub(this.lastVelocity).divideScalar(dt);
    if (this.history < 2) acceleration.set(0, 0, 0);
    this.history = Math.min(2, this.history + 1);
    this.lastAnchor.copy(anchor);
    this.lastVelocity.copy(velocity);
    acceleration.clampLength(0, MAX_ACCELERATION).applyQuaternion(parent.getWorldQuaternion(toLocal).invert());

    const { frequency, damping, gain, axes, limit } = this.settings;
    const omega = 2 * Math.PI * frequency;
    const stiffness = omega * omega;
    const friction = 2 * damping * omega;
    const push = [0, 1, 2].map((i) => -acceleration.getComponent(i) * gain * axes[i] * stiffness * this.strength);
    for (let left = dt; left > 0; left -= STEP) {
      const h = Math.min(STEP, left);
      for (let i = 0; i < 3; i++) {
        const x = this.offset.getComponent(i);
        const v = this.speed.getComponent(i) + (push[i] - stiffness * x - friction * this.speed.getComponent(i)) * h;
        this.speed.setComponent(i, v);
        this.offset.setComponent(i, x + v * h);
      }
    }
    if (this.offset.length() > limit) {
      this.offset.setLength(limit);
      this.speed.multiplyScalar(0.5);
    }
    if (this.settings.range) {
      for (let i = 0; i < 3; i++) {
        const [least, most] = this.settings.range[i];
        const x = this.offset.getComponent(i);
        if (x < least || x > most) {
          this.offset.setComponent(i, Math.min(most, Math.max(least, x)));
          this.speed.setComponent(i, 0);
        }
      }
    }
    this.bone.position.copy(this.rest).add(this.offset);
  }

  /**
   * Sets the part bouncing as a slap or a squeeze would: `velocity` is in metres a second, in the parent's own
   * frame. The spring settles it back on its own.
   */
  kick(velocity: Vector3): void {
    this.speed.addScaledVector(velocity, this.strength);
  }

  /** Changes how it bounces from now on, as when the part grows heavier or lighter; it keeps moving as it was. */
  retune(settings: SpringSettings): void {
    this.settings = settings;
  }

  /** Takes where the bone stands now as its new rest, as after the body is reshaped. */
  rebase(): void {
    this.rest = this.bone.position.clone();
    this.reset();
  }

  /** Puts the part back at rest, for a cut or a teleport. */
  reset(): void {
    this.offset.set(0, 0, 0);
    this.speed.set(0, 0, 0);
    this.history = 0;
    this.bone.position.copy(this.rest);
  }
}
