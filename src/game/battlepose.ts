import { MathUtils, type Object3D } from "three";
import { chestOverHips } from "./player";

/**
 * Her poses in the big fight picture, the way Karryn's Prison does Karryn's: not frames of an animation, but a set
 * of held poses, each its own picture with its own framing. What happens in a turn picks the pose (a swing of hers,
 * a blow landing on her, a dodge, a hold); it snaps in, holds while that moment plays in the comic panel, and once
 * the turn has played out she settles into how she's left: on her feet, winded, or down.
 *
 * The poses are drawn for a fight on her right hand, the side the foes stand on (the picture on the right of the
 * screen, turned to face them); with the fight on her other side they're mirrored.
 *
 * Bone angles, on this rig (radians):
 * - Spine (hips, torso, head): negative X bends forwards / drops the head; Y turns.
 * - Limbs hang down, so positive X swings an arm or leg forwards; an elbow bends with positive X, a knee with
 *   negative X (stored here as how far it bends, positive).
 * - An arm's swing here is from straight down in the world (about 1.5 is level), not from her shoulders: however
 *   far she leans, `applyPose` takes the lean back off.
 * - A pose's turn, and its torso's and head's Y, are towards the fight when positive.
 */

export type BattlePoseName =
  | "ready"
  | "strike"
  | "shove"
  | "grapple"
  | "guard"
  | "dodge"
  | "held"
  | "stare"
  | "winded"
  | "down";

/** An arm: swung forwards (x), twisted (y, its own side's way), and out from her side (out, positive away). */
export interface ArmPose {
  x: number;
  y: number;
  out: number;
  /** The elbow's bend, and the forearm's twist. */
  elbow: number;
  twist: number;
  /** Her hand, from open (0) to a fist (1). */
  fist: number;
}

/** A leg: swung forwards (x) and out from her side, and the knee's bend. */
export interface LegPose {
  x: number;
  out: number;
  knee: number;
}

export interface BattlePose {
  /** Her pelvis tipped forwards, pushing her rear out. A man takes a fifth of it. */
  arch: number;
  /** Her hips lowered by this much of her leg's length (kneeling is about half). */
  drop: number;
  /** The whole body turned this much further round from facing the fight. */
  turn: number;
  /** Added on top of her standing upright: [x lean, y turn, z tilt]. */
  torso: readonly [number, number, number];
  /** Added on top of her keeping her gaze level: [x nod, y look, z tilt]. */
  head: readonly [number, number, number];
  /** Her arm and leg on the fight's side (her right), and on the far side (her left). */
  armNear: ArmPose;
  armFar: ArmPose;
  legNear: LegPose;
  legFar: LegPose;
}

/** A hand at rest: the fingers a little curled, as a hand hangs. */
export const LOOSE_HAND = 0.25;
const arm = (x: number, out: number, elbow: number, y = 0, twist = 0, fist = LOOSE_HAND): ArmPose => ({ x, y, out, elbow, twist, fist });
/** The same arm with its hand open (0) or closed (1). */
const hand = (a: ArmPose, fist: number): ArmPose => ({ ...a, fist });
const leg = (x: number, out: number, knee: number): LegPose => ({ x, out, knee });

/**
 * Every pose. `ready` is her stance and `dodge` her twist away, from the user's reference sketches (see
 * battleview.ts); the rest are Karryn's Prison's fight set brought over to a brawl in a tavern.
 */
export const BATTLE_POSES: Readonly<Record<BattlePoseName, BattlePose>> = {
  // Square on, feet planted apart, back curved in, arms loose and out from her sides.
  ready: {
    arch: 0.13, drop: 0, turn: 0, torso: [0, 0, 0], head: [0, 0, 0],
    armNear: arm(0.05, 0.02, 0.2), armFar: arm(0.05, 0.02, 0.2),
    legNear: leg(0, 0.07, 0.04), legFar: leg(0, 0.07, 0.04),
  },
  // Her swing: turned into them, the near fist thrown straight out at them, the far one up by her chin, her
  // weight going onto the front foot.
  strike: {
    arch: 0.08, drop: 0.04, turn: 0.5, torso: [-0.12, 0.25, 0.05], head: [0.05, -0.1, 0],
    armNear: hand(arm(1.55, -0.05, 0.05), 1), armFar: hand(arm(0.7, -0.15, 1.95), 1),
    legNear: leg(0.4, 0.1, 0.35), legFar: leg(-0.35, 0.08, 0.12),
  },
  // Both hands driven into them, arms straight out, her whole weight behind it.
  shove: {
    arch: 0.05, drop: 0.05, turn: 0.35, torso: [-0.3, 0.1, 0], head: [0.2, -0.05, 0],
    armNear: hand(arm(1.5, -0.15, 0.15), 0), armFar: hand(arm(1.5, -0.15, 0.2), 0),
    legNear: leg(0.45, 0.08, 0.4), legFar: leg(-0.4, 0.06, 0.1),
  },
  // Hands out to catch hold of them: reaching, elbows soft, low and ready.
  grapple: {
    arch: 0.1, drop: 0.06, turn: 0.35, torso: [-0.25, 0.1, 0], head: [0.15, -0.05, 0],
    armNear: hand(arm(1.3, 0.15, 0.6, 0.2), 0.45), armFar: hand(arm(1.2, 0.05, 0.8, -0.2), 0.45),
    legNear: leg(0.3, 0.12, 0.35), legFar: leg(-0.2, 0.12, 0.3),
  },
  // A blow lands: she folds round it, turning away, forearms crossed up in front of her face, chin down, knees
  // giving.
  guard: {
    arch: 0.05, drop: 0.06, turn: -0.25, torso: [-0.25, -0.15, -0.05], head: [-0.25, -0.25, 0.1],
    armNear: hand(arm(0.95, -0.1, 2.35, 1.2), 0.85), armFar: hand(arm(1.0, -0.05, 2.3, 1.1), 0.85),
    legNear: leg(0.2, 0.12, 0.3), legFar: leg(-0.1, 0.1, 0.2),
  },
  // A blow she dodged: twisted away from it, back to us, rear out, ribcage and head turned back so she looks at us
  // over her shoulder, arms swung back.
  dodge: {
    arch: 0.3, drop: 0, turn: -Math.PI * 0.78, torso: [0.12, 0.45, 0], head: [-0.1, 1.25, -0.12],
    armNear: arm(-0.3, 0.18, 0.12), armFar: arm(-0.3, 0.18, 0.12),
    legNear: leg(-0.05, 0.04, 0.08), legFar: leg(-0.05, 0.04, 0.08),
  },
  // They've got hold of her: hauled off balance towards them by her near arm, the far one shoving at them,
  // her head turned away.
  held: {
    arch: 0.2, drop: 0.03, turn: 0.4, torso: [-0.25, 0.3, 0.12], head: [-0.05, -0.6, -0.1],
    armNear: hand(arm(1.5, 0.1, 0, 0.2), 0.1), armFar: hand(arm(1.2, -0.1, 1.0, -0.4), 0),
    legNear: leg(0.35, 0.12, 0.15), legFar: leg(-0.25, 0.15, 0.3),
  },
  // Talking them down or staring them out: hands on her hips, chin up, weight on one leg.
  stare: {
    arch: 0.18, drop: 0, turn: 0.15, torso: [0.05, 0, 0.03], head: [0.1, 0.1, 0],
    armNear: arm(-1.747, 1.34, 1.506, 0.845), armFar: arm(-1.747, 1.34, 1.506, 0.845),
    legNear: leg(0.06, 0.12, 0.05), legFar: leg(-0.02, 0.03, 0.02),
  },
  // Out of breath: bent over with her hands on her knees, looking up at them; turned side on, so the bend shows.
  winded: {
    arch: 0.2, drop: 0.08, turn: 0.75, torso: [-0.65, 0, 0], head: [0.2, 0.1, 0],
    armNear: arm(0.4, 0.04, 0.15), armFar: arm(0.4, 0.04, 0.15),
    legNear: leg(0.4, 0.1, 0.55), legFar: leg(0.3, 0.12, 0.5),
  },
  // Knocked down: on her knees, slumped, head hanging (her faint, in player.ts, held at the bottom).
  down: {
    arch: 0, drop: 0.47, turn: 0, torso: [-0.6, 0, 0], head: [-0.75, 0, 0.35],
    armNear: arm(0, 0.05, 0.25), armFar: arm(0, 0.05, 0.25),
    legNear: leg(0.15, 0.04, 1.55), legFar: leg(0.05, 0.04, 1.6),
  },
};

/** A brawl event's pose in the picture, or null if it doesn't change her pose (fight.ts events). */
export function poseForEvent(event: string): BattlePoseName | null {
  if (event.startsWith("strike:") || event === "reach:slap") return "strike";
  if (event.startsWith("shove:") || event === "throw") return "shove";
  if (/^(grab|headlock|hairpull|tackle):/.test(event)) return "grapple";
  if (event === "dodge" || event === "their:dodged" || event === "reach:pull") return "dodge";
  if (event.startsWith("talk:") || event.startsWith("stare:") || event === "steel") return "stare";
  if (event === "their:hit" || event === "their:tackle") return "guard";
  // Knocked off her feet, or coming mid-brawl (KP's down, orgasm).
  if (event === "their:sweep" || event === "lost" || event === "her:come") return "down";
  // Any other grapple of theirs (a grab, a headlock, a bear hug, a pin, a collar haul...): they have hold of her.
  if (event.startsWith("their:") && !["their:miss", "their:reach", "their:wander"].includes(event)) return "held";
  return null;
}

/** Below this much of her stamina left, she's winded. */
export const WINDED_BELOW = 0.25;

/** How she's left standing once a turn has played out. */
export function restingPose(state: { stamina: number; maxStamina: number; lost: boolean }): BattlePoseName {
  if (state.lost) return "down";
  if (state.maxStamina > 0 && state.stamina / state.maxStamina < WINDED_BELOW) return "winded";
  return "ready";
}

/** One pose to strike in a turn, and how many seconds into the turn it comes. */
export interface PoseBeat {
  pose: BattlePoseName;
  at: number;
  /** A blow landing on her: the picture flashes as the pose snaps in. */
  hurt: boolean;
}

/** The poses a blow landing on her puts her in. */
const HURT_POSES: ReadonlySet<BattlePoseName> = new Set(["guard", "held", "down"]);

/**
 * The poses of a turn, timed to its comic moments: each event that gets a moment (`hasShot`) takes `gap` seconds,
 * and one with a pose strikes it as its moment comes up. Then, a moment after the last, she settles into `rest`.
 */
export function turnBeats(events: readonly string[], hasShot: (event: string) => boolean, gap: number, rest: BattlePoseName): PoseBeat[] {
  const shots = events.filter(hasShot);
  const beats: PoseBeat[] = [];
  shots.forEach((event, index) => {
    const pose = poseForEvent(event);
    if (pose) beats.push({ pose, at: index * gap, hurt: HURT_POSES.has(pose) });
  });
  beats.push({ pose: rest, at: Math.max(1, shots.length) * gap, hurt: false });
  return beats;
}

/** Partway from one pose to another, `t` of the way (0 to 1). */
export function blendPose(a: BattlePose, b: BattlePose, t: number): BattlePose {
  const l = (x: number, y: number) => MathUtils.lerp(x, y, t);
  const v = (x: readonly [number, number, number], y: readonly [number, number, number]) => [l(x[0], y[0]), l(x[1], y[1]), l(x[2], y[2])] as const;
  const armL = (x: ArmPose, y: ArmPose): ArmPose => ({
    x: l(x.x, y.x), y: l(x.y, y.y), out: l(x.out, y.out), elbow: l(x.elbow, y.elbow), twist: l(x.twist, y.twist), fist: l(x.fist, y.fist),
  });
  const legL = (x: LegPose, y: LegPose): LegPose => ({ x: l(x.x, y.x), out: l(x.out, y.out), knee: l(x.knee, y.knee) });
  return {
    arch: l(a.arch, b.arch), drop: l(a.drop, b.drop), turn: l(a.turn, b.turn), torso: v(a.torso, b.torso), head: v(a.head, b.head),
    armNear: armL(a.armNear, b.armNear), armFar: armL(a.armFar, b.armFar), legNear: legL(a.legNear, b.legNear), legFar: legL(a.legFar, b.legFar),
  };
}

/** The bones a pose moves; any of the limbs may be missing on a guest's body. */
export interface PoseBones {
  hips: Object3D | null;
  torso: Object3D | null;
  head: Object3D | null;
  upperL: Object3D | null;
  upperR: Object3D | null;
  foreL: Object3D | null;
  foreR: Object3D | null;
  thighL: Object3D | null;
  thighR: Object3D | null;
  shinL: Object3D | null;
  shinR: Object3D | null;
  /** Each hand's four fingers at the knuckles, their tips at the middle joints, and the thumb. */
  fingersL: Object3D | null;
  fingersR: Object3D | null;
  tipsL: Object3D | null;
  tipsR: Object3D | null;
  thumbL: Object3D | null;
  thumbR: Object3D | null;
}

/** Finds a pose's bones on a body (`name` is its body name, "Female" or "Male"). */
export function poseBones(model: Object3D, name: string): PoseBones {
  const part = (label: string) => model.getObjectByName(`${name}_${label}`) ?? null;
  return {
    hips: part("Hips"), torso: part("Torso"), head: part("Head"),
    upperL: part("UpperArm_L"), upperR: part("UpperArm_R"), foreL: part("ForeArm_L"), foreR: part("ForeArm_R"),
    thighL: part("Thigh_L"), thighR: part("Thigh_R"), shinL: part("Shin_L"), shinR: part("Shin_R"),
    fingersL: part("HandFingers_L"), fingersR: part("HandFingers_R"), tipsL: part("HandTips_L"), tipsR: part("HandTips_R"),
    thumbL: part("HandThumb_L"), thumbR: part("HandThumb_R"),
  };
}

/**
 * A closed fist, in radians: the fingers curled in towards the palm at the knuckles and again at the middle joints,
 * and the thumb folded in across the front of them. Measured on the right hand (the left's mirrored): curling in is
 * negative Z, and the thumb's tip swings in with positive Y.
 */
export const FIST = { fingers: 1.45, tips: 1.5, thumb: [0.3, 0.9, -0.6] as const };

/** How the picture's own motion (breathing, a flinch, a tremble) adds to a pose, on top. */
export interface PoseExtra {
  /** Leaned back (positive) on the spine's X, and twisted on its Y. */
  torsoX: number;
  torsoY: number;
  headX: number;
  headY: number;
  headZ: number;
}

export const NO_EXTRA: PoseExtra = { torsoX: 0, torsoY: 0, headX: 0, headY: 0, headZ: 0 };

/**
 * Sets the bones to a pose, outright, so whatever she was doing in the room when the fight began doesn't carry
 * into the picture. `mirror` flips it for a fight on her left; `female` gives her pelvis its full tilt.
 * `legLength` (from her hips to the floor) is what a dropped pose lowers her by, from her hips' rest
 * (`hipsBaseY`, and `hipsBaseZ` if given). Returns the turn to add to the body's own.
 */
export function applyPose(
  bones: PoseBones,
  pose: BattlePose,
  options: { mirror: boolean; female: boolean; legLength: number; hipsBaseY: number; hipsBaseZ?: number; extra?: PoseExtra },
): number {
  // Turning (Y) towards the fight: a positive turn is to her left (the screen's right as she faces us), so towards
  // a fight on her right is negative. Tilts (Z) mirror the other way round.
  const toward = options.mirror ? 1 : -1;
  const tilt = options.mirror ? -1 : 1;
  const extra = options.extra ?? NO_EXTRA;
  const arch = pose.arch * (options.female ? 1 : 0.2);
  const { hips, torso, head } = bones;
  if (hips) {
    hips.rotation.set(-arch, 0, 0);
    hips.position.y = options.hipsBaseY - options.legLength * pose.drop;
    if (options.hipsBaseZ !== undefined) hips.position.z = options.hipsBaseZ;
  }
  if (torso) torso.rotation.set(chestOverHips(torso) + pose.torso[0] + extra.torsoX, pose.torso[1] * toward + extra.torsoY, pose.torso[2] * tilt);
  if (head) {
    // Her gaze kept level over the lean of her hips and torso, then the pose's own nod and look on top.
    const level = hips && torso ? -(hips.rotation.x + torso.rotation.x) * 0.85 : 0;
    head.rotation.set(level + pose.head[0] + extra.headX, pose.head[1] * toward + extra.headY, pose.head[2] * tilt + extra.headZ);
  }
  const torsoData = torso?.userData ?? {};
  // Her arms hang clear of her build (appearance.ts), as they do in the room.
  const spread = (torsoData.armSpread as number | undefined) ?? 0;
  // An arm's swing is from straight down in the world, whatever her back is doing: the lean of her hips and
  // torso, which carries the shoulders with it, is taken back off.
  const lean = (hips?.rotation.x ?? 0) + (torso?.rotation.x ?? 0);
  // The near side is her right, or her left when mirrored. Positive Z swings a right limb out, a left one in.
  const right = { arm: options.mirror ? pose.armFar : pose.armNear, leg: options.mirror ? pose.legFar : pose.legNear };
  const left = { arm: options.mirror ? pose.armNear : pose.armFar, leg: options.mirror ? pose.legNear : pose.legFar };
  const setArm = (upper: Object3D | null, fore: Object3D | null, a: ArmPose, s: number) => {
    upper?.rotation.set(a.x - lean, a.y * s, (spread + a.out) * s);
    fore?.rotation.set(a.elbow, a.twist * s, 0);
  };
  setArm(bones.upperR, bones.foreR, right.arm, 1);
  setArm(bones.upperL, bones.foreL, left.arm, -1);
  // Her hands: a body built before the fingers had bones has none of these, and keeps its hands as they are.
  const setHand = (fingers: Object3D | null, tips: Object3D | null, thumb: Object3D | null, fist: number, s: number) => {
    fingers?.rotation.set(0, 0, -FIST.fingers * fist * s);
    tips?.rotation.set(0, 0, -FIST.tips * fist * s);
    thumb?.rotation.set(FIST.thumb[0] * fist, FIST.thumb[1] * fist * s, FIST.thumb[2] * fist * s);
  };
  setHand(bones.fingersR, bones.tipsR, bones.thumbR, right.arm.fist, 1);
  setHand(bones.fingersL, bones.tipsL, bones.thumbL, left.arm.fist, -1);
  // The thighs hang from the tipped pelvis, so they swing forwards by the arch to stay upright.
  const setLeg = (thigh: Object3D | null, shin: Object3D | null, l: LegPose, s: number) => {
    thigh?.rotation.set(arch + l.x, 0, l.out * s);
    shin?.rotation.set(-l.knee, 0, 0);
  };
  setLeg(bones.thighR, bones.shinR, right.leg, 1);
  setLeg(bones.thighL, bones.shinL, left.leg, -1);
  return pose.turn * toward;
}
