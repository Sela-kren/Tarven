import { Group, MathUtils, Object3D, Vector3 } from "three";
import { moveVector, resolveCircle, type Rect } from "./collision";
import type { Input } from "./input";

const WALK_SPEED = 3.2;
const RUN_SPEED = 5.2;
const PLAYER_RADIUS = 0.3;
const TURN_RATE = 14;
const STRIDE_RATE = 2.6;

const THIGH_SWING = 0.62;
const KNEE_BEND = 0.95;
const ARM_SWING = 0.5;
const ELBOW_REST = 0.08;
const ELBOW_WALK = 0.35;
const STEP_BOUNCE = 0.03;

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
  private readonly hips: Object3D;
  private readonly hipsBaseY: number;
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

  /**
   * Only the X rotations are written, which keeps the arms' resting splay.
   * `carrying` and `sit` run from 0 to 1 and blend over the walk cycle.
   */
  pose(stride: number, swing: number, carrying = 0, sit = 0): void {
    const phase = Math.sin(stride);
    const lift = Math.cos(stride);
    const { lerp } = MathUtils;

    this.thighL.rotation.x = lerp(phase * THIGH_SWING * swing, SIT_THIGH, sit);
    this.thighR.rotation.x = lerp(-phase * THIGH_SWING * swing, SIT_THIGH, sit);
    // A knee only bends while its leg is travelling forwards.
    this.shinL.rotation.x = lerp(-Math.max(0, lift) * KNEE_BEND * swing, -this.sitKnee, sit);
    this.shinR.rotation.x = lerp(-Math.max(0, -lift) * KNEE_BEND * swing, -this.sitKnee, sit);

    const raised = (angle: number) => lerp(lerp(angle, CARRY_UPPER_ARM, carrying), SIT_UPPER_ARM, sit);
    this.upperArmL.rotation.x = raised(-phase * ARM_SWING * swing);
    this.upperArmR.rotation.x = raised(phase * ARM_SWING * swing);
    const elbow = lerp(lerp(ELBOW_REST + ELBOW_WALK * swing, CARRY_ELBOW, carrying), SIT_ELBOW, sit);
    this.foreArmL.rotation.x = elbow;
    this.foreArmR.rotation.x = elbow;

    this.hips.position.y = this.hipsBaseY + Math.abs(lift) * STEP_BOUNCE * swing * (1 - sit);
    this.swayHair(stride, swing * (1 - sit));
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

  private animate(dt: number, moving: boolean): void {
    this.swing += ((moving ? 1 : 0) - this.swing) * Math.min(1, 12 * dt);
    this.carry += ((this.held ? 1 : 0) - this.carry) * Math.min(1, 14 * dt);
    this.body.pose(this.stride, this.swing, this.carry);
  }

  rest(dt: number): void {
    this.animate(dt, false);
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
      this.stride += speed * STRIDE_RATE * dt;
    }

    this.animate(dt, moving);
  }
}
