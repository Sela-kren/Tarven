import { Group, MathUtils, Object3D, Vector3 } from "three";
import { moveVector, resolveCircle, type Rect } from "./collision";
import type { Input } from "./input";
import { BUILT_HEFT, heftedSpring, type SoftHeft } from "./heft";
import { Jiggle, type SpringSettings } from "./jiggle";
import type { Posture } from "./appearance";
import { BUILT_LEGS, Skirt, type LegSize } from "./skirt";

/** How much the female's soft parts move, from 0 (still) up; 1 is the tuned amount. */
export const FEMALE_JIGGLE = 1;

/**
 * Secondary motion, by bone. The bounce frequencies sit near a walking step (about 2 a second) so
 * each step sets them going.
 */
const SOFT_PARTS: Record<string, SpringSettings> = {
  // The breasts take about 0.58 of the bust bone's move, evenly over each (BUST_WEIGHT in build_world.py): the gain
  // and limit make up for it. These are for the bust and rear as built; a fuller one is heavier (heft.ts).
  Bust: { frequency: 2.3, damping: 0.2, gain: 0.0038, axes: [0.35, 1, 0.3], limit: 0.033 },
  Glute_L: { frequency: 2.1, damping: 0.22, gain: 0.0022, axes: [0.3, 1, 0.25], limit: 0.018 },
  Glute_R: { frequency: 2.1, damping: 0.22, gain: 0.0022, axes: [0.3, 1, 0.25], limit: 0.018 },
  Belly: { frequency: 2.8, damping: 0.3, gain: 0.0012, axes: [0.2, 1, 0.4], limit: 0.01 },
  // The flesh of the thighs: firmer than the rear and quicker, and it takes under half the skin's weight.
  ThighSoft_L: { frequency: 2.6, damping: 0.26, gain: 0.0018, axes: [0.35, 1, 0.35], limit: 0.012 },
  ThighSoft_R: { frequency: 2.6, damping: 0.26, gain: 0.0018, axes: [0.35, 1, 0.35], limit: 0.012 },
  // Her hair: what hangs from her head, and what falls down her back. Slower and looser than flesh, and it swings
  // across and back more than it bobs; the long ends on her back swing furthest.
  // The head's spring's limit is HAIR_SOFT_REACH in build_world.py, which keeps the locks by her face clear of it.
  HairSoft: { frequency: 1.6, damping: 0.18, gain: 0.004, axes: [1, 0.5, 1], limit: 0.025 },
  // Long hair lies on her back, so it swings back away from her (+z) but never forwards into her, and only a
  // little to the sides, where her back curves round under it.
  HairTail: {
    frequency: 1.3, damping: 0.15, gain: 0.006, axes: [1, 0.4, 1], limit: 0.045,
    range: [[-0.015, 0.015], [-0.02, 0.02], [0, 0.045]],
  },
};

/**
 * How a body answers being touched: a jolt of surprise, a slow melt into it, or a twist away. Each plays over
 * whatever pose the body is in and fades out by itself.
 */
export type Reaction = "jolt" | "melt" | "recoil";
/** The soft parts a touch can set bouncing. */
export type SoftPart = "Bust" | "Glute";
const REACTION_TIME: Record<Reaction, number> = { jolt: 0.4, melt: 1.8, recoil: 0.55 };

/**
 * How she stands to show a guest what they paid to see (show.ts): both hands holding her top pulled down under her
 * breasts, or lifted up over them (the game pulls the cloth with them, `Dresser.setPull`), her skirt lifted at the
 * front, or turned round with it lifted behind. A chest pose ending L or R bares just the one breast, her own left or
 * right, her other hand on her hip.
 */
export type ShowPose = "chestDown" | "chestDownL" | "chestDownR" | "chestUp" | "chestUpL" | "chestUpR" | "frontLift" | "backLift";
export const SHOW_POSES: readonly ShowPose[] = ["chestDown", "chestDownL", "chestDownR", "chestUp", "chestUpL", "chestUpR", "frontLift", "backLift"];
/** How quickly a show pose eases off once it's over, per second. It comes on at once. */
const SHOW_EASE = 3;

const WALK_SPEED = 3.2;
const RUN_SPEED = 5.2;
const PLAYER_RADIUS = 0.3;
const TURN_RATE = 14;
/** Pace of the short steps taken on the character select screen. */
const STAGE_STEP_SPEED = 1.4;

// Walking drunk. Each amount is at full drunkenness and scales down with it.
/** How far the walk veers off the way you're pushing, in radians. */
const DRUNK_VEER = 0.6;
/** How much slower you go. */
const DRUNK_SLOW = 0.25;
/** How fast the walk catches up with the controls, sober and fully drunk: drunk, it slides and overshoots. */
const SOBER_GRIP = 30;
const DRUNK_GRIP = 3;
/** You can't quite stand still: the speed of the shuffle while you're not moving. */
const DRUNK_SHUFFLE = 0.35;
/** Above this drunkenness, walking sometimes ends in a stumble; this many a second at full drunkenness. */
const STUMBLE_FROM = 0.5;
const STUMBLE_RATE = 0.5;
const STUMBLE_TIME = 0.45;
const STUMBLE_SPEED = 3;
/** How far the steps fall out of rhythm, as a share of the stride rate. */
const DRUNK_LIMP = 0.35;
/** The whole body sways side to side, and lurches forwards in a stumble. Radians. */
const DRUNK_SWAY = 0.09;
const STUMBLE_LEAN = 0.3;
/** The head lolls side to side and droops, and the chest slumps. Radians. */
const DRUNK_LOLL = 0.2;
const DRUNK_DROOP = 0.18;
const DRUNK_SLUMP = 0.08;

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
  /** 1 keeps the standing foot on the floor by lowering the hips as the legs spread; 0 lets the body float. */
  plant: number;
  /** How far ahead of the legs the hips turn and roll, in radians of the stride: the hips lead the step. */
  hipLead: number;
  /** How much the arms hang straight down while the body sways, instead of tilting with it. */
  armDangle: number;
  /** Moving speed as a share of the normal walking or running speed. */
  pace: number;
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
  freeArm: number;
  standArm: number;
  elbow: number;
  /** How far the chest rises with each breath. */
  breath: number;
  /** How much the weight shift grows and eases over time, as a fraction. */
  sway: number;
  /** 1 rests the standing side's hand on its hip, elbow out. */
  handOnHip: number;
  /**
   * The small of the back curves in, in radians: the pelvis tips forwards, pushing the rear up and back,
   * and her upright torso stands over it. Held while walking too; sitting takes it away.
   */
  arch: number;
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
  plant: 0, hipLead: 0, armDangle: 0, pace: 1,
};
/** The original walk at both speeds. */
const PLAIN: Gait = { walk: PLAIN_WALK, run: PLAIN_WALK };

/**
 * How much sway the female walk and run have at the start, from 1 to 5:
 * 1 plain, 2 a light feminine sway, 3 confident, 4 a runway walk, 5 an exaggerated strut.
 * The player can change it while playing (O).
 */
export const FEMALE_WALK_STYLE = 4;
export const WALK_STYLE_NAMES = ["plain", "light sway", "confident", "runway", "strut"] as const;

/**
 * The anchor levels; 3 and 4 are blended between 2 and 5. Level 5 follows the female and runway walk in
 * animation reference: the walk is led from the hips, which roll and turn a beat ahead of the legs; the
 * thighs angle in so the feet land on one line; the legs stay long and glide, with little knee bend or
 * heel kick; the standing foot stays planted so the body sinks between steps instead of floating; the
 * shoulders turn and tilt against the hips while the head stays level; the arms hang loose and swing
 * little; and the steps are slower, so she moves more slowly. An everyday walk rolls and turns the pelvis
 * about 5 degrees; level 5 rolls it about 11 and turns it about 16.
 */
const STYLE_ANCHORS: Record<1 | 2 | 5, { walk: Stride; run: Stride }> = {
  1: { walk: PLAIN_WALK, run: PLAIN_WALK },
  2: {
    walk: {
      rate: 2.4, thighSwing: 0.6, kneeBend: 0.9, heelKick: 0.12, armSwing: 0.36, armBias: -0.07, elbow: 0.28,
      elbowFlick: 0.22, bounce: 0.018, lean: 0, hipRoll: 0.1, hipShift: 0.035, hipTwist: 0.16, shoulderTwist: 0.12,
      shoulderRoll: 0.045, crossover: 0.065, plant: 1, hipLead: 0.15, armDangle: 0.5, pace: 1,
    },
    run: {
      // A run in an ankle-length skirt: a shorter stride and a low heel, so the feet stay under the hem.
      rate: 2.05, thighSwing: 0.85, kneeBend: 1, heelKick: 0.3, armSwing: 0.8, armBias: -0.05, elbow: 1.35,
      elbowFlick: 0.15, bounce: 0.06, lean: 0.17, hipRoll: 0.05, hipShift: 0.02, hipTwist: 0.12, shoulderTwist: 0.14,
      shoulderRoll: 0.02, crossover: 0.03, plant: 0, hipLead: 0.1, armDangle: 0.3, pace: 1,
    },
  },
  5: {
    walk: {
      rate: 3.4, thighSwing: 0.48, kneeBend: 0.6, heelKick: 0.06, armSwing: 0.24, armBias: -0.04, elbow: 0.22,
      elbowFlick: 0.3, bounce: 0, lean: -0.02, hipRoll: 0.2, hipShift: 0.075, hipTwist: 0.28, shoulderTwist: 0.18,
      shoulderRoll: 0.09, crossover: 0.1, plant: 1, hipLead: 0.4, armDangle: 0.85, pace: 0.75,
    },
    run: {
      rate: 2.0, thighSwing: 0.8, kneeBend: 0.9, heelKick: 0.25, armSwing: 0.72, armBias: -0.08, elbow: 1.3,
      elbowFlick: 0.22, bounce: 0.055, lean: 0.13, hipRoll: 0.1, hipShift: 0.036, hipTwist: 0.19, shoulderTwist: 0.19,
      shoulderRoll: 0.045, crossover: 0.055, plant: 0, hipLead: 0.2, armDangle: 0.4, pace: 1,
    },
  },
};

function blendStride(a: Stride, b: Stride, t: number): Stride {
  const out = { ...a };
  for (const key of Object.keys(a) as (keyof Stride)[]) out[key] = MathUtils.lerp(a[key], b[key], t);
  return out;
}

/** The walk and run for a style level from 1 to 5; fractions blend between levels. */
export function styledStrides(level: number): { walk: Stride; run: Stride } {
  const l = MathUtils.clamp(level, 1, 5);
  const [from, to, t] = l <= 2
    ? [STYLE_ANCHORS[1], STYLE_ANCHORS[2], l - 1]
    : [STYLE_ANCHORS[2], STYLE_ANCHORS[5], (l - 2) / 3];
  return { walk: blendStride(from.walk, to.walk, t), run: blendStride(from.run, to.run, t) };
}

/**
 * The standing pose at levels 1, 3 and 5 of the same scale as the walk; 2 and 4 blend between them.
 * 1 stands easy with a hint of weight on one leg. 3 is a relaxed contrapposto: weight on the right leg,
 * hip out, the left knee forward and in, shoulders tilted against the hips. 5 pushes it: a big hip pop,
 * the relaxed knee crossing in front, the head tilted, and the right hand on the hip with the elbow out.
 */
const STANCE_ANCHORS: Record<1 | 3 | 5, Stance> = {
  1: {
    hipShift: 0.012, hipRoll: 0.025, hipTwist: -0.02, shoulderRoll: 0.015, shoulderTwist: 0.01, headTilt: 0.015,
    standIn: 0.01, freeThigh: 0.1, freeKnee: 0.14, freeIn: 0.03, freeTurn: -0.05, freeArm: 0.02, standArm: 0.03,
    elbow: 0.12, breath: 0.01, sway: 0.1, handOnHip: 0, arch: 0.07,
  },
  3: {
    hipShift: 0.045, hipRoll: 0.095, hipTwist: -0.09, shoulderRoll: 0.06, shoulderTwist: 0.06, headTilt: 0.07,
    standIn: 0.035, freeThigh: 0.42, freeKnee: 0.524, freeIn: 0.13, freeTurn: -0.2, freeArm: 0.04, standArm: 0.14,
    elbow: 0.22, breath: 0.012, sway: 0.15, handOnHip: 0, arch: 0.11,
  },
  5: {
    hipShift: 0.075, hipRoll: 0.16, hipTwist: -0.15, shoulderRoll: 0.1, shoulderTwist: 0.1, headTilt: 0.12,
    standIn: 0.05, freeThigh: 0.5, freeKnee: 0.66, freeIn: 0.22, freeTurn: -0.32, freeArm: 0.08, standArm: 0.14,
    elbow: 0.25, breath: 0.014, sway: 0.2, handOnHip: 1, arch: 0.15,
  },
};

/** The standing pose for a style level from 1 to 5. The hand only goes to the hip between 4 and 5. */
export function styledStance(level: number): Stance {
  const l = MathUtils.clamp(level, 1, 5);
  const [from, to, t] = l <= 3 ? [STANCE_ANCHORS[1], STANCE_ANCHORS[3], (l - 1) / 2] : [STANCE_ANCHORS[3], STANCE_ANCHORS[5], (l - 3) / 2];
  const out = { ...from };
  for (const key of Object.keys(from) as (keyof Stance)[]) out[key] = MathUtils.lerp(from[key], to[key], t);
  out.handOnHip = MathUtils.clamp(l - 4, 0, 1);
  return out;
}

function feminine(level: number): Gait {
  return { ...styledStrides(level), stance: styledStance(level) };
}

/**
 * The right arm with its hand resting on the right hip, elbow out to the side and a little back:
 * found by searching the arm's angles against the female model in Blender.
 */
const HAND_ON_HIP = { upper: new Vector3(-1.747, 0.845, 1.34), elbow: 1.506 };

/** Baring just the one breast, she turns that one a little towards them (radians). */
const ONE_BREAST_TURN = 0.18;

/** Turned round to show her behind: most of the way, so she can still look back over her shoulder. */
const BACK_TURN = Math.PI * 0.95;

const BREATH_PERIOD = 3.8;
const SWAY_PERIOD = 7;
/** The standing side's elbow bends a little more. */
const RESTING_ELBOW_STAND = 0.08;
const NO_STANCE: Stance = {
  hipShift: 0, hipRoll: 0, hipTwist: 0, shoulderRoll: 0, shoulderTwist: 0, headTilt: 0, standIn: 0, freeThigh: 0,
  freeKnee: 0, freeIn: 0, freeTurn: 0, freeArm: 0, standArm: 0, elbow: 0, breath: 0, sway: 0, handOnHip: 0, arch: 0,
};

/** How far the shoe reaches in front of and behind the shin, for keeping a planted foot out of the floor. */
const TOE_REACH = 0.18;
const HEEL_REACH = 0.08;

/**
 * How far the chest leans back for each radian of arch, against the pelvis tipping forwards by one: a little
 * over one, so her torso stands upright, a touch back, and the bend is in the small of her back. The curve
 * itself is in her shape: the Back arch slider draws the small of her back in (appearance.ts), only at the back.
 * Bones alone can't: sliding or bending the torso back moves her front with it, and pushes her belly out.
 */
const ARCH_CHEST = 1.15;

/**
 * How far back a torso leans to stand over its pelvis as the arch tips it, with her ribcage's own lean (the
 * Upper back arch): scenes that copy a posed body and then set the torso's angle outright add this, so the
 * copy keeps her posture.
 */
export function chestOverHips(torso: Object3D): number {
  return -(torso.parent?.rotation.x ?? 0) * ARCH_CHEST + ((torso.userData.chestLean as number | undefined) ?? 0);
}

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
  gait: Gait;
  /** How drunk this character is, from 0 to 1: the head lolls and the chest slumps. */
  drunk = 0;
  /** The female walk's style level, 1 to 5; null for a body with only the plain walk. */
  private style: number | null;
  private readonly hips: Object3D;
  private hipsBaseY: number;
  /** Where the hips sit front to back at rest, for the arch to move them back from. */
  private hipsBaseZ: number;
  /** From the hip joint to the floor. */
  private legLength: number;
  private readonly torso: Object3D;
  /** Seconds of standing animation, for breathing and the slow weight shift. */
  private clock = 0;
  /** Springs on the soft parts; only models with those bones get them. */
  private readonly jiggles: Jiggle[] = [];
  /** A long skirt that swings clear of the legs; only models built with skirt panels have one. */
  private skirt: Skirt | null;
  /** A reaction to being touched, playing over the pose, and how far through it is (0 to 1). */
  private reaction: { kind: Reaction; done: number } | null = null;
  /** Time the skirt has not yet caught up with. */
  private skirtTime = 0;
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
  private readonly name: string;
  /** How much thicker and longer the legs are than as built, for the skirt to clear. */
  private legSize: LegSize = BUILT_LEGS;
  /** How far the arms hang out from the sides, in radians, so a wider or fuller figure keeps its hands clear. */
  private armSpread = 0;
  /** Added to the walk style's arch, from the look's Back arch slider; the arch never goes below none. */
  /** Her Posture sliders' settings, on top of the walk style's own arch. */
  private posture: Posture = { arch: 0, chest: 0 };
  /** A show pose held over the standing pose, and how far it's on (0 to 1); `showHeld` false lets it ease off. */
  private show: ShowPose | null = null;
  private showAmount = 0;
  private showHeld = false;
  /** The root's own turn as loaded, for a pose that turns her round to add to. */
  private readonly rootTurn: number;

  constructor(model: Object3D, name: string) {
    this.name = name;
    const part = (label: string) => requirePart(model, `${name}_${label}`);
    this.root = requirePart(model, name);
    this.rootTurn = this.root.rotation.y;
    this.hips = part("Hips");
    this.hipsBaseY = this.hips.position.y;
    this.hipsBaseZ = this.hips.position.z;
    this.torso = part("Torso");
    this.head = part("Head");
    this.style = name === "Female" ? FEMALE_WALK_STYLE : null;
    this.gait = this.style === null ? PLAIN : feminine(this.style);
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
    for (const [part, settings] of Object.entries(SOFT_PARTS)) {
      const bone = model.getObjectByName(`${name}_${part}`);
      if (bone) this.jiggles.push(new Jiggle(bone, settings, name === "Female" ? FEMALE_JIGGLE : 1));
    }
    this.skirt = this.findSkirt();
  }

  private findSkirt(): Skirt | null {
    const legs: [Object3D, Object3D][] = [[this.thighL, this.shinL], [this.thighR, this.shinR]];
    // Searched under the body's own root: a sibling's body is moved out of the loaded model into its own group.
    return Skirt.find(this.root, this.name, this.hips, legs, this.name === "Female" ? FEMALE_JIGGLE : 1, this.legSize);
  }

  /**
   * Takes the bones' current places as the body's rest, after a new look reshaped it. Call with the bones
   * at rest, as `Dresser.apply` leaves them.
   */
  refreshRest(
    legSize: LegSize = BUILT_LEGS, armSpread = 0, posture: Posture = { arch: 0, chest: 0 }, heft: SoftHeft = BUILT_HEFT,
  ): void {
    this.legSize = legSize;
    this.armSpread = armSpread;
    this.posture = posture;
    this.hipsBaseY = this.hips.position.y;
    this.hipsBaseZ = this.hips.position.z;
    this.legLength = this.hipsBaseY + this.thighL.position.y;
    for (const jiggle of this.jiggles) {
      // A fuller bust or rear is heavier: it swings further and a little slower.
      const part = jiggle.bone.name.slice(this.name.length + 1);
      const base = SOFT_PARTS[part];
      const weight = part === "Bust" ? heft.bust : part.startsWith("Glute") ? heft.rear : 1;
      if (base) jiggle.retune(heftedSpring(base, weight));
      jiggle.rebase();
    }
    this.skirt?.dispose();
    this.skirt = this.findSkirt();
    this.skirtTime = 0;
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
    // Worked out in the model's own size; a taller or shorter character is the model scaled.
    const scale = this.root.scale.y;
    const seat = seatHeight / scale;
    // Long shins angle forwards so the feet rest on the floor instead of passing through it.
    const kneeHeight = this.hipsBaseY + this.thighL.position.y + this.shinL.position.y;
    const seatedKneeHeight = seat + SIT_CLEARANCE + this.thighL.position.y;
    this.sitKnee = SIT_KNEE - Math.acos(Math.min(1, seatedKneeHeight / kneeHeight));
    return (seat + SIT_CLEARANCE - this.hipsBaseY) * scale;
  }

  get walkStyle(): number | null {
    return this.style;
  }

  /** True for a body built with skirt panels, which swing clear of the legs. */
  get hasSkirt(): boolean {
    return this.skirt !== null;
  }

  /** Changes the female walk and run to another style level; does nothing for a plain body. */
  setWalkStyle(level: number): void {
    if (this.style === null) return;
    this.style = MathUtils.clamp(Math.round(level), 1, 5);
    this.gait = feminine(this.style);
  }

  /** The stride rate for a blend between walking (0) and running (1). */
  strideRate(running: number): number {
    return MathUtils.lerp(this.gait.walk.rate, this.gait.run.rate, running);
  }

  /** Moving speed as a share of normal, for a blend between walking (0) and running (1). */
  pace(running: number): number {
    return MathUtils.lerp(this.gait.walk.pace, this.gait.run.pace, running);
  }

  /**
   * How far a leg's sole would sit above the floor with the hips at rest height, from the leg's
   * angles and the hips' roll. Negative when the leg reaches below the floor.
   */
  private footHeight(thigh: Object3D, shin: Object3D, hipRoll: number): number {
    const upper = -shin.position.y;
    const lower = this.hipsBaseY + thigh.position.y - upper; // knee to sole; the sole rests on the floor
    const hip = thigh.position.x * Math.sin(hipRoll) + thigh.position.y * Math.cos(hipRoll);
    const tilt = Math.cos(thigh.rotation.z + hipRoll);
    // The thighs hang from the pelvis, so its forward tip (the arch) counts against their swing.
    const swing = thigh.rotation.x + this.hips.rotation.x;
    const pitch = swing + shin.rotation.x;
    const reach = (upper * Math.cos(swing) + lower * Math.cos(pitch)) * tilt;
    // There is no ankle, so the foot tips with the shin: the heel dips when it swings forward, the toe when back.
    const dip = pitch >= 0 ? HEEL_REACH * Math.sin(pitch) : TOE_REACH * Math.sin(-pitch);
    return this.hipsBaseY + hip - reach - dip;
  }

  /** Moves the standing pose's breathing and weight shift along. */
  /**
   * Answers a touch: plays `kind` over the pose, and sets `soft` bouncing, `strength` metres a second, as a
   * slap or a squeeze would.
   */
  react(kind: Reaction, soft: SoftPart | null = null, strength = 0.6): void {
    this.reaction = { kind, done: 0 };
    if (!soft) return;
    const push = new Vector3(0, strength, strength * 0.4);
    for (const jiggle of this.jiggles) if (jiggle.bone.name.startsWith(`${this.name}_${soft}`)) jiggle.kick(push);
  }

  /** Lays the reaction to a touch over the pose just set. */
  private poseReaction(): void {
    if (!this.reaction) return;
    const { kind, done } = this.reaction;
    const k = Math.sin(Math.PI * done);
    if (kind === "jolt") {
      // Up on her toes with a squeak, back arched.
      this.hips.position.y += k * 0.035;
      this.torso.rotation.x -= k * 0.16;
      this.head.rotation.x -= k * 0.12;
    } else if (kind === "melt") {
      // Leans in, head tipped, slow.
      this.torso.rotation.x += k * 0.1;
      this.head.rotation.z += k * 0.22;
      this.head.rotation.x += k * 0.08;
    } else {
      // Twists away from the hand.
      this.torso.rotation.y += k * 0.45;
      this.head.rotation.y += k * 0.3;
      this.hips.position.y += k * 0.015;
    }
  }

  /** The show pose on her now, and how far it's on (0 to 1, eased as her limbs are); null with none. */
  get showing(): { pose: ShowPose; amount: number } | null {
    return this.show ? { pose: this.show, amount: MathUtils.smoothstep(this.showAmount, 0, 1) } : null;
  }

  /** Holds a show pose (at once, so a picture taken now shows it), or with null lets it ease off. */
  display(pose: ShowPose | null): void {
    if (pose) {
      this.show = pose;
      this.showAmount = 1;
    }
    this.showHeld = pose !== null;
  }

  /**
   * Lays a show pose over the pose just set, and lifts the skirt for one that needs it. Arm angles are set outright
   * (blended from wherever the standing pose had them); the body's lean and turn are added on top.
   */
  private poseShow(): void {
    const pose = this.show;
    const a = pose ? MathUtils.smoothstep(this.showAmount, 0, 1) : 0;
    this.skirt?.setLift(pose === "frontLift" ? a : 0, pose === "backLift" ? a : 0);
    this.root.rotation.y = this.rootTurn + (pose === "backLift" ? BACK_TURN * a : 0);
    if (!pose || a <= 0) return;
    const set = (bone: Object3D, x: number, z: number, y = 0) => {
      bone.rotation.x = MathUtils.lerp(bone.rotation.x, x, a);
      bone.rotation.y = MathUtils.lerp(bone.rotation.y, y, a);
      bone.rotation.z = MathUtils.lerp(bone.rotation.z, z, a);
    };
    const bend = (bone: Object3D, x: number) => (bone.rotation.x = MathUtils.lerp(bone.rotation.x, x, a));
    // Positive Z swings the left arm in and the right arm out.
    if (pose.startsWith("chest")) {
      const up = pose.startsWith("chestUp");
      const only = pose.endsWith("L") ? "L" : pose.endsWith("R") ? "R" : null;
      // Each arm (mirrored for the left: its y and z turn the other way): showing its breast, or with just the other
      // one bared, its hand resting on her hip.
      const arm = (upper: Object3D, fore: Object3D, mirror: number, showing: boolean) => {
        if (!showing) {
          set(upper, HAND_ON_HIP.upper.x, HAND_ON_HIP.upper.z * mirror, HAND_ON_HIP.upper.y * mirror);
          set(fore, HAND_ON_HIP.elbow, 0);
        } else if (up) {
          // High on her chest, holding her top lifted up over her breast.
          set(upper, 0.5, -0.5 * mirror, 0.7 * mirror);
          bend(fore, 2.3);
        } else {
          // Her top dragged down under her breast, and her hand presenting it: elbow open out to her side and back,
          // palm turned up (the forearm's twist) right under her breast, holding it up.
          set(upper, -0.48, 0.27 * mirror, 0.57 * mirror);
          set(fore, 1.99, 0, -1.13 * mirror);
        }
      };
      arm(this.upperArmR, this.foreArmR, 1, only !== "L");
      arm(this.upperArmL, this.foreArmL, -1, only !== "R");
      // Chest out; down, chin up, up, looking down at them. Just the one, turned a little to show it.
      this.torso.rotation.x -= (up ? 0.1 : 0.12) * a;
      this.head.rotation.x += (up ? 0.1 : -0.06) * a;
      if (only) this.torso.rotation.y += (only === "R" ? 1 : -1) * ONE_BREAST_TURN * a;
    } else if (pose === "frontLift") {
      // Both hands low at her waist, either side, holding the front of her skirt gathered up against her middle,
      // clear of her groin; she looks down.
      set(this.upperArmR, 0.45, -0.22, 0.3);
      bend(this.foreArmR, 0.75);
      set(this.upperArmL, 0.45, 0.22, -0.3);
      bend(this.foreArmL, 0.75);
      this.torso.rotation.x += 0.06 * a;
      this.head.rotation.x += 0.14 * a;
    } else {
      // Turned round, bent a little forwards, both hands behind at her waist holding her skirt gathered up there, clear
      // of her behind, looking back over her shoulder.
      set(this.upperArmR, -0.6, -0.15);
      bend(this.foreArmR, 1.5);
      set(this.upperArmL, -0.6, 0.15);
      bend(this.foreArmL, 1.5);
      this.torso.rotation.x += 0.3 * a;
      this.torso.rotation.y += 0.3 * a;
      this.head.rotation.y += 0.85 * a;
      this.head.rotation.x -= 0.15 * a;
    }
  }

  advance(dt: number): void {
    this.clock += dt;
    if (this.show && !this.showHeld) {
      this.showAmount -= dt * SHOW_EASE;
      if (this.showAmount <= 0) {
        this.showAmount = 0;
        this.show = null;
      }
    }
    if (this.reaction) {
      this.reaction.done += dt / REACTION_TIME[this.reaction.kind];
      if (this.reaction.done >= 1) this.reaction = null;
    }
    for (const jiggle of this.jiggles) jiggle.update(dt);
    this.skirt?.advance(dt);
    this.skirtTime += dt;
  }

  /**
   * The limbs swing on X; the hips, torso and head also roll on Z and turn on Y, the thighs turn on Z
   * to step in, and the arms turn on Z only to hang straight while the body sways.
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
    // Negative X tips the pelvis's top forwards; the torso leans back past it and the thighs swing
    // forwards by the same amount, so the legs still hang straight.
    const arch = (this.gait.stance ? Math.max(0, s.arch + this.posture.arch) : 0) * (1 - sit);
    // The ribcage leans back over the waist, or rounds forwards; the arms still hang straight down from it.
    const chestLean = this.posture.chest * (1 - sit);
    this.torso.userData.chestLean = chestLean;

    // The left leg stands while lift is negative, so its hip rises and the hips slide over to it.
    // The hips move a little ahead of the legs, so they lead each step.
    const lead = g("hipLead");
    const hipRoll = Math.cos(stride + lead) * g("hipRoll") * moving + s.hipRoll * shifting;
    this.hips.rotation.z = hipRoll;
    this.hips.rotation.x = -arch;
    // Tipping the pelvis carries the waist forwards; the hips move back by as much, so her upper body stays over
    // her feet where it stood, and only her rear and the small of her back change.
    this.hips.position.z = this.hipsBaseZ + Math.sin(arch) * this.torso.position.y;
    this.hips.rotation.y = -Math.sin(stride + lead) * g("hipTwist") * moving + s.hipTwist * still;
    this.hips.position.x = Math.cos(stride + lead) * g("hipShift") * moving + s.hipShift * shifting;

    this.torso.rotation.z = -hipRoll - lift * g("shoulderRoll") * moving - s.shoulderRoll * shifting;
    this.torso.rotation.y =
      -this.hips.rotation.y + phase * g("shoulderTwist") * moving + s.shoulderTwist * still;
    this.torso.rotation.x = g("lean") * moving + breath + arch * ARCH_CHEST + chestLean;
    this.head.rotation.z = -(this.hips.rotation.z + this.torso.rotation.z) * HEAD_STEADY + s.headTilt * still;
    this.head.rotation.y = -(this.hips.rotation.y + this.torso.rotation.y) * HEAD_STEADY;
    this.head.rotation.x = -(this.hips.rotation.x + this.torso.rotation.x) * HEAD_STEADY;
    if (this.drunk > 0) {
      this.head.rotation.z += Math.sin(this.clock * 1.1) * DRUNK_LOLL * this.drunk;
      this.head.rotation.x += DRUNK_DROOP * this.drunk;
      this.torso.rotation.z += Math.sin(this.clock * 0.7 + 1) * DRUNK_SLUMP * this.drunk;
    }

    const thighSwing = g("thighSwing") * swing;
    this.thighL.rotation.x = lerp(phase * thighSwing + s.freeThigh * still, SIT_THIGH, sit) + arch;
    this.thighR.rotation.x = lerp(-phase * thighSwing, SIT_THIGH, sit) + arch;
    this.thighL.rotation.y = s.freeTurn * still;
    // The legs stay upright under the rolling hips, lean back against the hip slide so the feet stay
    // where they are, then step in towards the centre line, most of all as each foot reaches forwards,
    // so the knees pass close without striking.
    const crossover = g("crossover") * moving;
    const underHips = -hipRoll - this.hips.position.x / this.legLength;
    this.thighL.rotation.z = crossover * (0.55 + 0.45 * phase) + underHips + s.freeIn * still;
    this.thighR.rotation.z = -crossover * (0.55 - 0.45 * phase) + underHips - s.standIn * still;
    // A knee bends while its leg travels forwards, and the heel kicks up while the leg is behind.
    const knee = (forwards: number, ahead: number) =>
      -(Math.max(0, forwards) * g("kneeBend") + Math.max(0, -ahead) * g("heelKick")) * swing;
    this.shinL.rotation.x = lerp(knee(lift, phase) - s.freeKnee * still, -this.sitKnee, sit);
    this.shinR.rotation.x = lerp(knee(-lift, -phase), -this.sitKnee, sit);

    // Floating: the hips simply bob. Planted: they sit as low as the longer leg reaches, so that foot stays
    // on the floor and the body sinks as the legs spread.
    const floating = this.hipsBaseY + Math.abs(lift) * g("bounce") * moving;
    const lowestFoot = Math.min(this.footHeight(this.thighL, this.shinL, hipRoll), this.footHeight(this.thighR, this.shinR, hipRoll));
    const planted = this.hipsBaseY - lowestFoot;
    // Standing still always plants the feet, whatever the pose.
    this.hips.position.y = lerp(floating, planted, Math.max(g("plant") * moving, still));

    const raised = (angle: number) => lerp(lerp(angle, CARRY_UPPER_ARM, carrying), SIT_UPPER_ARM, sit);
    const armSwing = g("armSwing") * swing;
    const armBias = g("armBias") * swing;
    this.upperArmL.rotation.x = raised(-phase * armSwing + armBias + s.freeArm * still - chestLean);
    this.upperArmR.rotation.x = raised(phase * armSwing + armBias + s.standArm * still - chestLean);
    // Loose arms hang straight down while the body above the hips tilts.
    const dangle = -(this.hips.rotation.z + this.torso.rotation.z) * g("armDangle") * moving;
    // Positive Z swings the left arm in and the right arm out.
    this.upperArmL.rotation.z = dangle - this.armSpread;
    this.upperArmR.rotation.z = dangle + this.armSpread;
    const elbow = (ahead: number, resting: number) => {
      const swinging = ELBOW_REST + (g("elbow") + Math.max(0, ahead) * g("elbowFlick")) * swing + resting * still;
      return lerp(lerp(swinging, CARRY_ELBOW, carrying), SIT_ELBOW, sit);
    };
    this.foreArmL.rotation.x = elbow(-phase, s.elbow);
    this.foreArmR.rotation.x = elbow(phase, s.elbow + RESTING_ELBOW_STAND);
    // The standing pose can rest the right hand on the hip; carrying or sitting takes the hand away.
    const hand = s.handOnHip * still * (1 - carrying);
    if (hand > 0) {
      this.upperArmR.rotation.x = lerp(this.upperArmR.rotation.x, HAND_ON_HIP.upper.x, hand);
      this.upperArmR.rotation.z = lerp(this.upperArmR.rotation.z, HAND_ON_HIP.upper.z, hand);
      this.foreArmR.rotation.x = lerp(this.foreArmR.rotation.x, HAND_ON_HIP.elbow, hand);
    }
    this.upperArmR.rotation.y = HAND_ON_HIP.upper.y * hand;

    this.poseShow();
    this.poseReaction();
    this.swayHair(stride, moving);
    this.skirt?.solve(this.skirtTime);
    this.skirtTime = 0;
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
  /** How drunk the sibling is, from 0 to 1, as last given to `move`. */
  private drunk = 0;
  /** Seconds of drunken swaying, which drives the sway, veer and shuffle. */
  private drunkClock = 0;
  /** Actual speed over the floor, which lags behind the controls while drunk. */
  private readonly velocity = { x: 0, z: 0 };
  /** Seconds left of a stumble, and the way it throws you. */
  private stumbleLeft = 0;
  private readonly stumbleDir = { x: 0, z: 0 };

  /** The walk style level, 1 to 5, or null if this sibling has only the plain walk. */
  get walkStyle(): number | null {
    return this.body.walkStyle;
  }

  /** Steps the walk style on to the next level, wrapping from 5 back to 1. Returns the new level. */
  cycleWalkStyle(): number | null {
    const style = this.body.walkStyle;
    if (style === null) return null;
    this.body.setWalkStyle((style % 5) + 1);
    return this.body.walkStyle;
  }

  /** Holds a show pose, or lets it ease off: see `Body.display`. */
  display(pose: ShowPose | null): void {
    this.body.display(pose);
  }

  /** The show pose on her now, and how far it's on: see `Body.showing`. */
  get showing(): { pose: ShowPose; amount: number } | null {
    return this.body.showing;
  }

  /** Answers a touch on the floor: see `Body.react`. */
  react(kind: Reaction, soft: SoftPart | null = null, strength?: number): void {
    this.body.react(kind, soft, strength);
  }

  /** Call after a new look reshapes this sibling's body. */
  refreshBody(legSize?: LegSize, armSpread?: number, posture?: Posture, heft?: SoftHeft): void {
    this.body.refreshRest(legSize, armSpread, posture, heft);
  }

  constructor(model: Object3D, name: string, spawn: Vector3) {
    this.body = new Body(model, name);
    this.root.add(this.body.root);
    this.root.position.copy(spawn);
    // Turn first, then lean, so a drunk sway tips the body over its own feet whichever way it faces.
    this.root.rotation.order = "YXZ";
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** How far through the walk cycle the legs have come, in radians. It only ever goes up. */
  get strideAngle(): number {
    return this.stride;
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
    this.body.drunk = this.drunk;
    this.body.pose(this.stride, this.swing, this.carry, 0, this.running);

    // A drunk sways from the ankles, and pitches forwards in a stumble.
    this.drunkClock += dt;
    const lurch = this.stumbleLeft > 0 ? Math.sin((Math.PI * this.stumbleLeft) / STUMBLE_TIME) * STUMBLE_LEAN : 0;
    this.root.rotation.z = Math.sin(this.drunkClock * 1.3) * DRUNK_SWAY * this.drunk;
    this.root.rotation.x = -lurch;
  }

  rest(dt: number): void {
    this.animate(dt, false, false);
  }

  /** Which way she faces, in radians about the vertical. */
  get facing(): number {
    return this.heading;
  }

  /** Turns to a fixed heading at once. */
  face(heading: number): void {
    this.heading = heading;
    this.root.rotation.y = heading;
  }

  /** Walks straight to a floor point without turning, for staged scenes such as character select. */
  stepTo(target: Vector3, dt: number): void {
    const dx = target.x - this.root.position.x;
    const dz = target.z - this.root.position.z;
    const distance = Math.hypot(dx, dz);
    const moving = distance > 0.005;
    if (moving) {
      const t = Math.min(1, (STAGE_STEP_SPEED * dt) / distance);
      this.root.position.x += dx * t;
      this.root.position.z += dz * t;
      this.stride += STAGE_STEP_SPEED * this.body.strideRate(0) * dt;
    }
    this.animate(dt, moving, false);
  }

  /**
   * Walks by the controls. `drunk`, from 0 to 1, makes the walk veer, slide, shuffle and sometimes stumble.
   * Returns true on the frame a stumble starts.
   */
  move(dt: number, input: Input, colliders: readonly Rect[], drunk = 0): boolean {
    this.drunk = drunk;
    const t = this.drunkClock;
    const direction = moveVector(input.left, input.right, input.up, input.down);
    const pushing = direction.x !== 0 || direction.z !== 0;
    const speed = (input.run ? RUN_SPEED : WALK_SPEED) * this.body.pace(this.running) * (1 - DRUNK_SLOW * drunk);

    let wantX = direction.x * speed;
    let wantZ = direction.z * speed;
    if (drunk > 0 && pushing) {
      // The way you go wanders off the way you meant, back and forth.
      const veer = (DRUNK_VEER * drunk * (Math.sin(t * 1.7) + 0.6 * Math.sin(t * 0.63 + 1.3))) / 1.6;
      const cos = Math.cos(veer);
      const sin = Math.sin(veer);
      [wantX, wantZ] = [wantX * cos - wantZ * sin, wantX * sin + wantZ * cos];
    } else if (drunk > 0) {
      // Standing still, the feet shuffle about in a slowly turning direction.
      const angle = t * 0.7 + Math.sin(t * 0.31) * 3;
      const amount = DRUNK_SHUFFLE * drunk * drunk * Math.max(0, Math.sin(t * 1.1));
      wantX = Math.cos(angle) * amount;
      wantZ = Math.sin(angle) * amount;
    }

    let stumbled = false;
    const stumbleChance = (STUMBLE_RATE * (drunk - STUMBLE_FROM)) / (1 - STUMBLE_FROM);
    if (this.stumbleLeft <= 0 && pushing && drunk > STUMBLE_FROM && Math.random() < stumbleChance * dt) {
      // Lurch off roughly the way you were going.
      const angle = Math.atan2(wantZ, wantX) + (Math.random() - 0.5) * 1.6;
      this.stumbleDir.x = Math.cos(angle);
      this.stumbleDir.z = Math.sin(angle);
      this.stumbleLeft = STUMBLE_TIME;
      stumbled = true;
    }

    if (this.stumbleLeft > 0) {
      // A stumble throws you: the controls do nothing until you've caught yourself.
      this.stumbleLeft -= dt;
      this.velocity.x = this.stumbleDir.x * STUMBLE_SPEED;
      this.velocity.z = this.stumbleDir.z * STUMBLE_SPEED;
    } else {
      // Sober, the walk follows the controls at once; drunk, it slides after them.
      const follow = drunk > 0 ? Math.min(1, MathUtils.lerp(SOBER_GRIP, DRUNK_GRIP, drunk) * dt) : 1;
      this.velocity.x += (wantX - this.velocity.x) * follow;
      this.velocity.z += (wantZ - this.velocity.z) * follow;
    }

    const { x: vx, z: vz } = this.velocity;
    const pace = Math.hypot(vx, vz);
    const travelling = pushing || this.stumbleLeft > 0;
    if (pace > 0.01) {
      const target = resolveCircle(
        { x: this.root.position.x + vx * dt, z: this.root.position.z + vz * dt },
        PLAYER_RADIUS,
        colliders,
      );
      this.root.position.x = target.x;
      this.root.position.z = target.z;

      // Face the way you're going; shuffling on the spot doesn't turn you round. The model faces -Z at rest.
      if (travelling) {
        const desired = Math.atan2(-vx, -vz);
        const delta = Math.atan2(Math.sin(desired - this.heading), Math.cos(desired - this.heading));
        this.heading += delta * Math.min(1, TURN_RATE * dt);
        this.root.rotation.y = this.heading;
      }
      const limp = 1 + DRUNK_LIMP * drunk * Math.sin(t * 3.1);
      this.stride += pace * this.body.strideRate(this.running) * limp * dt;
    }

    this.animate(dt, travelling || pace > 0.15, input.run);
    return stumbled;
  }
}
