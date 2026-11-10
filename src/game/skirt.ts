import { Object3D, Quaternion, Vector3 } from "three";
import { Jiggle, type SpringSettings } from "./jiggle";

/**
 * A long skirt that the legs can never pass through.
 *
 * The skirt hangs from panels round the hips, each jointed at about knee height (see SKIRT_PANELS in
 * tools/blender/build_world.py). Every frame each panel swings out just far enough to clear the knees,
 * shins and feet, then falls back slowly, as cloth would; it hangs straight down, not tilted with the hips,
 * and a spring on its hem lets it sway when she turns or stops.
 *
 * Everything here is in the hips' frame: x to the side, y up, z back (forwards is -z).
 */

/** Points down each leg the skirt has to clear: bone, point in that bone's frame, radius in metres. */
const LEG_SAMPLES: readonly ["thigh" | "shin", readonly [number, number, number], number][] = [
  ["thigh", [0, -0.1, 0], 0.09],
  ["thigh", [0, -0.2, 0], 0.085],
  ["thigh", [0, -0.3, 0], 0.075],
  ["shin", [0, 0, 0], 0.065],
  ["shin", [0, -0.15, 0], 0.075],
  ["shin", [0, -0.3, 0], 0.05],
  ["shin", [0, -0.4, 0], 0.05],
  // The shoe: toe, ball and heel.
  ["shin", [0, -0.42, -0.13], 0.06],
  ["shin", [0, -0.42, -0.04], 0.07],
  ["shin", [0, -0.42, 0.04], 0.06],
];
/** Room left between the leg and the cloth. */
const GAP = 0.02;
/** How quickly a panel drops back once the leg has passed, per second. It rises at once. */
const FALL = 9;
/** From the panels' knee joint down to the hem. */
const HEM_DROP = 0.28;
/** The height of the hem above the floor, for the sway spring. */
const HEM_HEIGHT = 0.2;
/** The hem's sway: slow, and mostly sideways and back when turning or stopping. */
export const SKIRT_SWAY: SpringSettings = { frequency: 1.2, damping: 0.35, gain: 0.006, axes: [1, 0.1, 1], limit: 0.07 };

const TAU = Math.PI * 2;

/** Angle round the body, as the skirt is built: 0 at the right side, a quarter turn at the front. */
function turnOf(x: number, z: number): number {
  return (((Math.atan2(-z, x) % TAU) + TAU) % TAU);
}

interface Panel {
  readonly upper: Object3D;
  readonly lower: Object3D;
  readonly upperRest: Quaternion;
  readonly lowerRest: Quaternion;
  /** Outwards, level with the floor. */
  readonly out: Vector3;
  /** The panel swings out about this axis. */
  readonly axis: Vector3;
  readonly turn: number;
  /** How far out and how far below the hips' origin the panel hangs from. */
  readonly radius: number;
  readonly drop: number;
  /** Its resting angle out from straight down, and the length of its upper part. */
  readonly rest: number;
  readonly length: number;
  /** The angles it is easing back from, for the upper and lower parts. */
  upperEase: number;
  lowerEase: number;
}

/** One leg point as the skirt sees it, in the plane of the skirt at that angle round the body. */
interface Seen {
  first: number;
  second: number;
  share: number;
  out: number;
  down: number;
  reach: number;
  rest: number;
  length: number;
}

const point = new Vector3();
const down = new Vector3();
const inverse = new Quaternion();
const turnQ = new Quaternion();
const axisLocal = new Vector3();

export class Skirt {
  private readonly panels: Panel[];
  private readonly sway: Jiggle;
  private readonly hem = new Object3D();
  private readonly hemRest: Vector3;
  private readonly seen: Seen[] = [];

  /** The skirt of a model built with skirt panels, or null for a model without them. */
  static find(model: Object3D, name: string, hips: Object3D, legs: readonly [Object3D, Object3D][], strength = 1): Skirt | null {
    const panels: [Object3D, Object3D][] = [];
    for (let i = 0; ; i++) {
      const upper = model.getObjectByName(`${name}_Skirt${i}`);
      const lower = model.getObjectByName(`${name}_SkirtHem${i}`);
      if (!upper || !lower) break;
      panels.push([upper, lower]);
    }
    return panels.length >= 3 ? new Skirt(hips, legs, panels, strength) : null;
  }

  constructor(
    private readonly hips: Object3D,
    /** Each leg's thigh and shin. */
    private readonly legs: readonly [Object3D, Object3D][],
    bones: readonly [Object3D, Object3D][],
    strength = 1,
  ) {
    this.panels = bones.map(([upper, lower]) => {
      const head = upper.position;
      const knee = lower.position.clone().applyQuaternion(upper.quaternion);
      const out = new Vector3(head.x, 0, head.z).normalize();
      return {
        upper,
        lower,
        upperRest: upper.quaternion.clone(),
        lowerRest: lower.quaternion.clone(),
        out,
        axis: new Vector3(-out.z, 0, out.x),
        turn: turnOf(head.x, head.z),
        radius: Math.hypot(head.x, head.z),
        drop: -head.y,
        rest: Math.atan2(knee.dot(out), -knee.y),
        length: knee.length(),
        upperEase: Number.NaN,
        lowerEase: Number.NaN,
      };
    });
    // The hem's sway is a spring on a point at the middle of the hem, which moves no cloth itself.
    const hipsHeight = hips.position.y;
    this.hem.position.set(0, HEM_HEIGHT - hipsHeight, 0);
    this.hemRest = this.hem.position.clone();
    hips.add(this.hem);
    this.sway = new Jiggle(this.hem, SKIRT_SWAY, strength);
  }

  /** Moves the hem's sway on; call with the body's other springs. */
  advance(dt: number): void {
    this.sway.update(dt);
  }

  /** The two panels either side of an angle round the body, and how far it is from the first to the second. */
  private between(turn: number): [number, number, number] {
    const { panels } = this;
    for (let i = 0; i < panels.length; i++) {
      const k = (i + 1) % panels.length;
      const span = (((panels[k].turn - panels[i].turn) % TAU) + TAU) % TAU;
      const past = (((turn - panels[i].turn) % TAU) + TAU) % TAU;
      if (past <= span) return [i, k, past / span];
    }
    return [0, 1, 0];
  }

  /** Swings the panels clear of the legs as they are posed now; dt is the time since the last call. */
  solve(dt: number): void {
    const { panels, seen } = this;
    const fall = dt > 0 ? Math.min(1, FALL * dt) : 1;
    seen.length = 0;
    for (const [thigh, shin] of this.legs) {
      thigh.updateMatrix();
      shin.updateMatrix();
      for (const [bone, [x, y, z], radius] of LEG_SAMPLES) {
        point.set(x, y, z);
        if (bone === "shin") point.applyMatrix4(shin.matrix);
        point.applyMatrix4(thigh.matrix);
        const [first, second, share] = this.between(turnOf(point.x, point.z));
        const a = panels[first];
        const b = panels[second];
        const mix = (from: number, to: number) => from + (to - from) * share;
        seen.push({
          first,
          second,
          share,
          out: Math.hypot(point.x, point.z) - mix(a.radius, b.radius),
          down: -mix(a.drop, b.drop) - point.y,
          reach: radius + GAP,
          rest: mix(a.rest, b.rest),
          length: mix(a.length, b.length),
        });
      }
    }

    // The cloth hangs straight down, however the hips tilt.
    down.set(0, -1, 0).applyQuaternion(inverse.copy(this.hips.quaternion).invert());
    const hang = panels.map((p) => p.rest + Math.atan2(down.dot(p.out), -down.y));
    const swayed = this.hem.position.clone().sub(this.hemRest);
    const tilt = panels.map((p) => swayed.dot(p.out) / (p.length + HEM_DROP));

    // The upper parts clear what is within reach of them, and swing out far enough for the lower parts
    // to reach over anything further down; past the hem, the whole panel tents straight over it.
    const need = [...hang];
    for (const s of seen) {
      const distance = Math.hypot(s.out, s.down);
      let angle: number;
      if (distance < s.length + s.reach) {
        angle = Math.atan2(s.out, s.down) + Math.asin(Math.min(1, s.reach / Math.max(distance, 1e-6)));
      } else {
        const lower = Math.max(0.05, HEM_DROP / Math.cos(s.rest) - s.reach);
        const c = (s.length * s.length + distance * distance - lower * lower) / (2 * s.length * distance);
        angle = Math.atan2(s.out, s.down) - (c < 1 ? Math.acos(c) : 0);
      }
      need[s.first] = Math.max(need[s.first], angle);
      need[s.second] = Math.max(need[s.second], angle);
    }
    const upper = panels.map((p, i) => {
      p.upperEase = Number.isNaN(p.upperEase) || need[i] > p.upperEase ? need[i] : p.upperEase + (need[i] - p.upperEase) * fall;
      return Math.max(need[i], p.upperEase + tilt[i]);
    });

    // The lower parts clear whatever lies beyond the knee joints.
    for (let i = 0; i < need.length; i++) need[i] = hang[i];
    for (const s of seen) {
      if (Math.hypot(s.out, s.down) <= s.length - s.reach) continue;
      const bent = upper[s.first] + (upper[s.second] - upper[s.first]) * s.share;
      const out = s.out - s.length * Math.sin(bent);
      const below = s.down - s.length * Math.cos(bent);
      const distance = Math.hypot(out, below);
      const angle = Math.atan2(out, below) + Math.asin(Math.min(1, s.reach / Math.max(distance, 1e-6)));
      need[s.first] = Math.max(need[s.first], angle);
      need[s.second] = Math.max(need[s.second], angle);
    }
    panels.forEach((p, i) => {
      p.lowerEase = Number.isNaN(p.lowerEase) || need[i] > p.lowerEase ? need[i] : p.lowerEase + (need[i] - p.lowerEase) * fall;
      const lower = Math.max(need[i], p.lowerEase + tilt[i]);
      Skirt.turn(p.upper, p.upperRest, axisLocal.copy(p.axis), upper[i] - p.rest);
      // Turning about the axis leaves it where it was, so in the upper part's frame it is only un-rested.
      Skirt.turn(p.lower, p.lowerRest, axisLocal.copy(p.axis).applyQuaternion(inverse.copy(p.upperRest).invert()), lower - upper[i]);
    });
  }

  /** Sets a bone to its rest turn followed by a turn about an axis given in its parent's frame. */
  private static turn(bone: Object3D, rest: Quaternion, axis: Vector3, angle: number): void {
    axis.applyQuaternion(inverse.copy(rest).invert());
    bone.quaternion.copy(rest).multiply(turnQ.setFromAxisAngle(axis, angle));
  }

  /** Lets the skirt hang at rest again, for a cut or a teleport. */
  reset(): void {
    this.sway.reset();
    for (const p of this.panels) {
      p.upperEase = Number.NaN;
      p.lowerEase = Number.NaN;
      p.upper.quaternion.copy(p.upperRest);
      p.lower.quaternion.copy(p.lowerRest);
    }
  }
}
