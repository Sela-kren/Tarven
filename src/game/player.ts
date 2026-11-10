import { Group, MathUtils, Object3D, Vector3 } from "three";
import { moveVector, resolveCircle, type Rect } from "./collision";
import type { Input } from "./input";

const WALK_SPEED = 3.2;
const RUN_SPEED = 5.2;
const PLAYER_RADIUS = 0.3;
const TURN_RATE = 14;

const ELBOW_REST = 0.08;

/** One way of moving at one speed. Angles are in radians, distances in metres. */
interface Stride {
  /** Stride phase gained per metre travelled. */
  rate: number;
  thighSwing: number;
  /** Knee bend while the leg travels forwards. */
  kneeBend: number;
  /** Extra knee bend while the leg is behind the body, kicking the heel up. */
  heelKick: number;
  armSwing: number;
  /** Shifts the arm swing backwards (negative) or forwards. */
  armBias: number;
  elbow: number;
  /** Extra elbow bend as each arm swings forwards. */
  elbowFlick: number;
  bounce: number;
  /** Forward lean of the upper body. */
  lean: number;
  /** The hip on the standing leg rises and the other drops. */
  hipRoll: number;
  /** The hips slide over the standing leg. */
  hipShift: number;
  /** The hips turn forwards with the swinging leg. */
  hipTwist: number;
  /** The shoulders turn against the hips. */
  shoulderTwist: number;
  /** The shoulders tilt against the hips. */
  shoulderRoll: number;
  /** The feet step in towards the centre line. */
  crossover: number;
}

/**
 * A standing pose with the weight on the right leg and the left leg relaxed. Angles are in radians,
 * distances in metres. Posed and checked in Blender: the bones' X/Y/Z there match three.js.
 */
interface Stance {
  /** The hips slide over the standing leg. */
  hipShift: number;
  /** The hip over the standing leg rises. */
  hipRoll: number;
  /** The relaxed side's hip turns forwards (negative). */
  hipTwist: number;
  /** The shoulders tilt against the hips. */
  shoulderRoll: number;
  shoulderTwist: number;
  headTilt: number;
  /** The standing foot steps in under the body. */
  standIn: number;
  /** The relaxed knee comes forwards and bends; the toe just touches the floor. */
  freeThigh: number;
  freeKnee: number;
  /** The relaxed foot steps in towards the standing foot, turned out. */
  freeIn: number;
  freeTurn: number;
  /** How far the hips lower to keep the standing foot on the floor. */
  drop: number;
  freeArm: number;
  standArm: number;
  elbow: number;
  /** How far the chest rises with each breath. */
  breath: number;
  /** How much the weight shift grows and eases over time, as a fraction. */
  sway: number;
}

interface Gait {
  walk: Stride;
  run: Stride;
  /** Without one, the character stands in the model's resting pose. */
  stance?: Stance;
}

const PLAIN_WALK: Stride = {
  rate: 2.6, thighSwing: 0.62, kneeBend: 0.95, heelKick: 0, armSwing: 0.5, armBias: 0, elbow: 0.35, elbowFlick: 0,
  bounce: 0.03, lean: 0, hipRoll: 0, hipShift: 0, hipTwist: 0, shoulderTwist: 0, shoulderRoll: 0, crossover: 0,
};
/** The original walk at both speeds. */
const PLAIN: Gait = { walk: PLAIN_WALK, run: PLAIN_WALK };

/** A runway walk: one foot in front of the other, hips rolling and turning, shoulders and head held level. */
const FEMININE: Gait = {
  walk: {
    rate: 2.4, thighSwing: 0.6, kneeBend: 0.9, heelKick: 0.12, armSwing: 0.36, armBias: -0.07, elbow: 0.28,
    elbowFlick: 0.22, bounce: 0.018, lean: 0, hipRoll: 0.1, hipShift: 0.035, hipTwist: 0.16, shoulderTwist: 0.12,
    shoulderRoll: 0.045, crossover: 0.065,
  },
  run: {
    rate: 2.05, thighSwing: 0.95, kneeBend: 1.65, heelKick: 0.85, armSwing: 0.8, armBias: -0.05, elbow: 1.35,
    elbowFlick: 0.15, bounce: 0.06, lean: 0.17, hipRoll: 0.05, hipShift: 0.02, hipTwist: 0.12, shoulderTwist: 0.14,
    shoulderRoll: 0.02, crossover: 0.03,
  },
  stance: {
    hipShift: 0.045, hipRoll: 0.095, hipTwist: -0.09, shoulderRoll: 0.06, shoulderTwist: 0.06, headTilt: 0.07,
    standIn: 0.035, freeThigh: 0.42, freeKnee: 0.524, freeIn: 0.13, freeTurn: -0.2, drop: 0.0052, freeArm: 0.04,
    standArm: 0.14, elbow: 0.22, breath: 0.012, sway: 0.15,
  },
};

const BREATH_PERIOD = 3.8;
const SWAY_PERIOD = 7;
/** The standing side's elbow bends a little more. */
const RESTING_ELBOW_STAND = 0.08;
const NO_STANCE: Stance = {
  hipShift: 0, hipRoll: 0, hipTwist: 0, shoulderRoll: 0, shoulderTwist: 0, headTilt: 0, standIn: 0, freeThigh: 0,
  freeKnee: 0, freeIn: 0, freeTurn: 0, drop: 0, freeArm: 0, standArm: 0, elbow: 0, breath: 0, sway: 0,
};

/** How much of the upper body's tilt and turn the neck takes back, keeping the gaze level. */
const HEAD_STEADY = 0.85;

/** How far loose hair trails behind while walking. */
const HAIR_TRAIL = 0.22;
/** How far hair bounces with each step. */
const HAIR_BOB = 0.12;
const STRAND_SWAY = 0.1;
const BUN_BOB = 0.07;
const BUN_SWAY = 0.05;

const CARRY_UPPER_ARM = 0.3;
const CARRY_ELBOW = 0.95;
const CARRY_POSITION = new Vector3(0, 1.02, -0.42);
const SIT_THIGH = 1.5;
const SIT_KNEE = 1.5;
const SIT_UPPER_ARM = 0.3;
const SIT_ELBOW = 0.8;
/** How far the hips sit above the seat surface. */
const SIT_CLEARANCE = 0.07;

function requirePart(root: Object3D, name: string): Object3D {
  const part = root.getObjectByName(name);
  if (!part) throw new Error(`Character model is missing "${name}"`);
  return part;
}

/** One jointed character model. Positive X rotation swings a limb forwards. */
export class Body {
  readonly root: Object3D;
  readonly gait: Gait;
  private readonly hips: Object3D;
  private readonly hipsBaseY: number;
  /** From the hip joint to the floor. */
  private readonly legLength: number;
  private readonly torso: Object3D;
  /** Seconds of standing animation, for breathing and the slow weight shift. */
  private clock = 0;
  private readonly head: Object3D;
  private readonly thighL: Object3D;
  private readonly thighR: Object3D;
  private readonly shinL: Object3D;
  private readonly shinR: Object3D;
  private readonly upperArmL: Object3D;
  private readonly upperArmR: Object3D;
  private readonly foreArmL: Object3D;
  private readonly foreArmR: Object3D;
  // Only characters with loose hair have these bones.
  private readonly bun: Object3D | undefined;
  private readonly strandL: Object3D | undefined;
  private readonly strandR: Object3D | undefined;
  private sitKnee = SIT_KNEE;

  constructor(model: Object3D, name: string) {
    const part = (label: string) => requirePart(model, `${name}_${label}`);
    this.root = requirePart(model, name);
    this.hips = part("Hips");
    this.hipsBaseY = this.hips.position.y;
    this.torso = part("Torso");
    this.head = part("Head");
    this.gait = name === "Female" ? FEMININE : PLAIN;
    this.legLength = this.hipsBaseY + part("Thigh_L").position.y;
    this.thighL = part("Thigh_L");
    this.thighR = part("Thigh_R");
    this.shinL = part("Shin_L");
    this.shinR = part("Shin_R");
    this.upperArmL = part("UpperArm_L");
    this.upperArmR = part("UpperArm_R");
    this.foreArmL = part("ForeArm_L");
    this.foreArmR = part("ForeArm_R");
    this.bun = model.getObjectByName(`${name}_Bun`);
    this.strandL = model.getObjectByName(`${name}_Strand_L`);
    this.strandR = model.getObjectByName(`${name}_Strand_R`);
  }

  /** Hair follows the stride, so it settles by itself when the character stops or sits. */
  private swayHair(stride: number, swing: number): void {
    const phase = Math.sin(stride);
    const bounce = Math.sin(stride * 2);
    if (this.bun) {
      this.bun.rotation.x = bounce * BUN_BOB * swing;
      this.bun.rotation.z = phase * BUN_SWAY * swing;
    }
    const trail = (bounce * HAIR_BOB - HAIR_TRAIL) * swing;
    if (this.strandL) {
      this.strandL.rotation.x = trail;
      this.strandL.rotation.z = phase * STRAND_SWAY * swing;
    }
    if (this.strandR) {
      this.strandR.rotation.x = trail;
      this.strandR.rotation.z = phase * STRAND_SWAY * swing;
    }
  }

  /** How far to lower the whole character so it rests on a seat of this height. */
  seatedOffset(seatHeight: number): number {
    // Long shins angle forwards so the feet rest on the floor instead of passing through it.
    const kneeHeight = this.hipsBaseY + this.thighL.position.y + this.shinL.position.y;
    const seatedKneeHeight = seatHeight + SIT_CLEARANCE + this.thighL.position.y;
    this.sitKnee = SIT_KNEE - Math.acos(Math.min(1, seatedKneeHeight / kneeHeight));
    return seatHeight + SIT_CLEARANCE - this.hipsBaseY;
  }

  /** The stride rate for a blend between walking (0) and running (1). */
  strideRate(running: number): number {
    return MathUtils.lerp(this.gait.walk.rate, this.gait.run.rate, running);
  }

  /** Moves the standing pose's breathing and weight shift along. */
  advance(dt: number): void {
    this.clock += dt;
  }

  /**
   * The limbs swing on X; the hips, torso and head also roll on Z and turn on Y, and the thighs
   * turn on Z to step in. The arms' Z is never written, which keeps their resting splay.
   * `carrying`, `sit` and `running` run from 0 to 1 and blend over the walk cycle.
   */
  pose(stride: number, swing: number, carrying = 0, sit = 0, running = 0): void {
    const { lerp } = MathUtils;
    const { walk, run } = this.gait;
    const g = (key: keyof Stride) => lerp(walk[key], run[key], running);
    // At stride 0 both feet pass under the body; the left leg is forwards for the first half of the cycle.
    const phase = Math.sin(stride);
    const lift = Math.cos(stride);
    const moving = swing * (1 - sit);
    // The standing pose fades in as the walk fades out, and is all zeros for a gait without one.
    const s = this.gait.stance ?? NO_STANCE;
    const still = (1 - swing) * (1 - sit);
    const shifting = still * (1 + s.sway * Math.sin((this.clock * 2 * Math.PI) / SWAY_PERIOD));
    const breath = Math.sin((this.clock * 2 * Math.PI) / BREATH_PERIOD) * s.breath * still;

    // The left leg stands while lift is negative, so its hip rises and the hips slide over to it.
    const hipRoll = lift * g("hipRoll") * moving + s.hipRoll * shifting;
    this.hips.rotation.z = hipRoll;
    this.hips.rotation.y = -phase * g("hipTwist") * moving + s.hipTwist * still;
    this.hips.position.x = lift * g("hipShift") * moving + s.hipShift * shifting;
    this.hips.position.y = this.hipsBaseY + Math.abs(lift) * g("bounce") * moving - s.drop * still;

    this.torso.rotation.z = -hipRoll - lift * g("shoulderRoll") * moving - s.shoulderRoll * shifting;
    this.torso.rotation.y =
      -this.hips.rotation.y + phase * g("shoulderTwist") * moving + s.shoulderTwist * still;
    this.torso.rotation.x = g("lean") * moving + breath;
    this.head.rotation.z = -(this.hips.rotation.z + this.torso.rotation.z) * HEAD_STEADY + s.headTilt * still;
    this.head.rotation.y = -(this.hips.rotation.y + this.torso.rotation.y) * HEAD_STEADY;
    this.head.rotation.x = -this.torso.rotation.x * HEAD_STEADY;

    const thighSwing = g("thighSwing") * swing;
    this.thighL.rotation.x = lerp(phase * thighSwing + s.freeThigh * still, SIT_THIGH, sit);
    this.thighR.rotation.x = lerp(-phase * thighSwing, SIT_THIGH, sit);
    this.thighL.rotation.y = s.freeTurn * still;
    // The legs stay upright under the rolling hips, lean back against the hip slide so the feet stay
    // where they are, then step in towards the centre line.
    const crossover = g("crossover") * moving;
    const underHips = -hipRoll - this.hips.position.x / this.legLength;
    this.thighL.rotation.z = crossover + underHips + s.freeIn * still;
    this.thighR.rotation.z = -crossover + underHips - s.standIn * still;
    // A knee bends while its leg travels forwards, and the heel kicks up while the leg is behind.
    const knee = (forwards: number, ahead: number) =>
      -(Math.max(0, forwards) * g("kneeBend") + Math.max(0, -ahead) * g("heelKick")) * swing;
    this.shinL.rotation.x = lerp(knee(lift, phase) - s.freeKnee * still, -this.sitKnee, sit);
    this.shinR.rotation.x = lerp(knee(-lift, -phase), -this.sitKnee, sit);

    const raised = (angle: number) => lerp(lerp(angle, CARRY_UPPER_ARM, carrying), SIT_UPPER_ARM, sit);
    const armSwing = g("armSwing") * swing;
    const armBias = g("armBias") * swing;
    this.upperArmL.rotation.x = raised(-phase * armSwing + armBias + s.freeArm * still);
    this.upperArmR.rotation.x = raised(phase * armSwing + armBias + s.standArm * still);
    const elbow = (ahead: number, resting: number) => {
      const swinging = ELBOW_REST + (g("elbow") + Math.max(0, ahead) * g("elbowFlick")) * swing + resting * still;
      return lerp(lerp(swinging, CARRY_ELBOW, carrying), SIT_ELBOW, sit);
    };
    this.foreArmL.rotation.x = elbow(-phase, s.elbow);
    this.foreArmR.rotation.x = elbow(phase, s.elbow + RESTING_ELBOW_STAND);

    this.swayHair(stride, moving);
  }
}

/** A brother or sister: one body on the floor that keeps its place when you swap away. */
export class Sibling {
  readonly root = new Group();
  private readonly body: Body;
  private heading = 0;
  private stride = 0;
  private swing = 0;
  private carry = 0;
  private running = 0;
  private held: Object3D | null = null;

  constructor(model: Object3D, name: string, spawn: Vector3) {
    this.body = new Body(model, name);
    this.root.add(this.body.root);
    this.root.position.copy(spawn);
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** Puts a model in the sibling's hands, or empties them with null. */
  hold(model: Object3D | null): void {
    if (this.held) this.root.remove(this.held);
    this.held = model;
    if (model) {
      model.position.copy(CARRY_POSITION);
      this.root.add(model);
    }
  }

  private animate(dt: number, moving: boolean, running: boolean): void {
    this.swing += ((moving ? 1 : 0) - this.swing) * Math.min(1, 12 * dt);
    this.carry += ((this.held ? 1 : 0) - this.carry) * Math.min(1, 14 * dt);
    this.running += ((moving && running ? 1 : 0) - this.running) * Math.min(1, 8 * dt);
    this.body.advance(dt);
    this.body.pose(this.stride, this.swing, this.carry, 0, this.running);
  }

  rest(dt: number): void {
    this.animate(dt, false, false);
  }

  move(dt: number, input: Input, colliders: readonly Rect[]): void {
    const direction = moveVector(input.left, input.right, input.up, input.down);
    const moving = direction.x !== 0 || direction.z !== 0;
    const speed = input.run ? RUN_SPEED : WALK_SPEED;

    if (moving) {
      const target = resolveCircle(
        {
          x: this.root.position.x + direction.x * speed * dt,
          z: this.root.position.z + direction.z * speed * dt,
        },
        PLAYER_RADIUS,
        colliders,
      );
      this.root.position.x = target.x;
      this.root.position.z = target.z;

      // The model faces -Z at rest.
      const desired = Math.atan2(-direction.x, -direction.z);
      const delta = Math.atan2(Math.sin(desired - this.heading), Math.cos(desired - this.heading));
      this.heading += delta * Math.min(1, TURN_RATE * dt);
      this.root.rotation.y = this.heading;
      this.stride += speed * this.body.strideRate(this.running) * dt;
    }

    this.animate(dt, moving, input.run);
  }
}
