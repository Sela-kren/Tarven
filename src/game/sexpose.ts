import { MathUtils, Vector3, type Box3, type Object3D } from "three";
import { applyPose, blendPose, type ArmPose, type BattlePose, type LegPose, type PoseBones, type PoseExtra } from "./battlepose";
import type { DuelArea, DuelLogEntry } from "./duel";
import type { GuestKind } from "./tavern";
import type { HerMove } from "./duelmoves";

/**
 * The big after-hours picture, the way Karryn's Prison draws its sex poses (cowgirl_karryn, bj_kneeling,
 * werewolf_back, paizuri_laying...): her and the partner she's with, in one held position together, swapped as the
 * game moves on. KP sandwiches the man's layers behind and in front of hers; here both bodies are posed and set
 * down together on one stage, and the camera framed on the two of them.
 *
 * Each scene is named for how the bodies are arranged, not for the act, so one can stand for several: kneeling in
 * front of a standing partner is her mouth on him, or on a woman. Which scene, and who's in it, is duelstage.ts's.
 *
 * The stage: her feet at the middle of it, y up, the camera's side +z. A body facing +x is turned -PI/2, facing -x
 * PI/2, facing the camera PI. `pitch` lays a body down: PI/2 on its back (its front turned up, its head where its back faced),
 * -PI/2 on its front. Poses use battlepose.ts's angles, with the arms and legs named by her own sides.
 */

export type ScenePoseName =
  | "kiss"
  | "caress"
  | "tease"
  | "strip"
  | "grope"
  | "stroke"
  | "kneel"
  | "throat"
  | "paizuri"
  | "suck"
  | "grab"
  | "spank"
  | "licked"
  | "cowgirl"
  | "reverse"
  | "doggy"
  | "missionary"
  | "bentover"
  | "carry"
  | "prone"
  | "gangbang"
  | "downed"
  | "slumped"
  | "used"
  | "tableBack"
  | "tableBent"
  | "footjob"
  | "rimjob"
  | "piledriver"
  | "kickCounter"
  | "standPaizuri"
  | "soldierGangbang"
  | "againstWall"
  | "lapRide";

/** Where a body stands on the stage, and which way it's turned and laid. */
export interface Place {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
}

/** A body's pose: battlepose.ts's, with the arms and legs by its own left and right. */
export interface Body {
  arch: number;
  drop: number;
  torso: readonly [number, number, number];
  head: readonly [number, number, number];
  armL: ArmPose;
  armR: ArmPose;
  legL: LegPose;
  legR: LegPose;
}

export interface ScenePose {
  her: { body: Body; place: Place };
  /** The partner; null for a scene she's in alone. */
  them: { body: Body; place: Place } | null;
  /** Where the camera looks from: turned round the two of them (0 straight on from the camera's side), and down. */
  view: SceneView;
  /** A table under her (KP's waitress_table), drawn with the scene; none for most. */
  table?: SceneTable;
  /** Anything else the scene stands on or against: a post, a wall, a bench. */
  props?: readonly SceneProp[];
}

/**
 * The camera on a scene, the way KP frames each of its pose pictures: from which way round (`yaw`, 0 from the
 * camera's side) and how far above (`pitch`; below them is negative). By default it takes in all of them; `focus` (a
 * point on the stage) and `zoom` (under 1 is closer) crop in on part of the picture, as KP's do.
 */
export interface SceneView {
  yaw: number;
  pitch: number;
  zoom?: number;
  focus?: readonly [number, number, number];
  /** A wider lens than the picture's own (degrees up and down), for a close shot from someone's eyes, as KP's footj. */
  fov?: number;
  /** How far the camera stands from `focus`, outright, however many are in the picture (a POV shot stays in his eyes). */
  distance?: number;
}

/** A prop on the stage: a post, a wall, a bench, the bar counter; where it stands, its size (along x, z, up) and turn. */
export interface SceneProp {
  kind: "post" | "wall" | "bench" | "bar";
  x: number;
  z: number;
  length: number;
  width: number;
  height: number;
  turn?: number;
}

/** A taproom table on the stage: the middle of its top, how long (along x) and wide (along z) it is, and how high. */
export interface SceneTable {
  x: number;
  z: number;
  length: number;
  width: number;
  height: number;
}

/** How high a taproom table's top stands. */
export const TABLE_TOP = 0.74;

/** Where another partner can join her in a scene: at her mouth, or at one of her hands. */
export type JoinSlot = "mouth" | "left" | "right";

/**
 * A place in a scene for another partner, the way Karryn's Prison's poses have a slot for each part of her a man can
 * join her at: where he stands and how, and her arm or head turned to him while he's there.
 */
export interface JoinSpot {
  slot: JoinSlot;
  body: Body;
  place: Place;
  reach?: Partial<Pick<Body, "armL" | "armR" | "head">>;
}

const arm = (x: number, out: number, elbow: number, y = 0, twist = 0, fist = 0.25): ArmPose => ({ x, y, out, elbow, twist, fist });
const leg = (x: number, out: number, knee: number, twist = 0): LegPose => (twist ? { x, out, knee, twist } : { x, out, knee });
const at = (x: number, y: number, z: number, yaw: number, pitch = 0, roll = 0): Place => ({ x, y, z, yaw, pitch, roll });

const FACE_X = -Math.PI / 2;
const FACE_MINUS_X = Math.PI / 2;
const FACE_US = Math.PI;
const ON_BACK = Math.PI / 2;

/** Standing easy, arms down. */
const STAND: Body = {
  arch: 0.1, drop: 0, torso: [0, 0, 0], head: [0, 0, 0],
  armL: arm(0.05, 0.03, 0.2), armR: arm(0.05, 0.03, 0.2),
  legL: leg(0, 0.04, 0.04), legR: leg(0, 0.04, 0.04),
};
/** Kneeling up, sitting back off her heels. */
const KNEEL: Body = { ...STAND, arch: 0.05, drop: 0.47, legL: leg(0.12, 0.08, 1.55), legR: leg(0.12, 0.08, 1.55) };

const b = (base: Body, over: Partial<Body>): Body => ({ ...base, ...over });

export const SCENE_POSES: Readonly<Record<ScenePoseName, ScenePose>> = {
  // Face to face, her arms round his neck, his round her waist, heads tipped to meet.
  kiss: {
    her: { body: b(STAND, { arch: 0.2, head: [0.3, 0, 0.15], armL: arm(1.9, 0, 0.5), armR: arm(1.9, 0, 0.5) }), place: at(-0.15, 0, 0, FACE_X) },
    them: { body: b(STAND, { torso: [-0.1, 0, 0], head: [-0.25, 0, -0.15], armL: arm(0.6, -0.25, 1.2), armR: arm(0.6, -0.25, 1.2) }), place: at(0.17, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.35, pitch: 0.05 },
  },
  // Close, her hands on his chest, his on her hips.
  caress: {
    her: { body: b(STAND, { arch: 0.18, head: [0.2, 0, 0.1], armL: arm(0.9, -0.15, 0.9), armR: arm(0.8, -0.1, 1.0) }), place: at(-0.18, 0, 0, FACE_X) },
    them: { body: b(STAND, { head: [-0.2, 0, 0], armL: arm(0.35, -0.1, 0.9), armR: arm(0.35, -0.1, 0.9) }), place: at(0.18, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.45, pitch: 0.05 },
  },
  // At his side, up on her toes to his ear, a hand on his chest; he faces us.
  tease: {
    her: { body: b(STAND, { arch: 0.25, torso: [-0.1, 0.2, 0], head: [0.15, 0.3, 0], armL: arm(1.3, -0.3, 1.3), armR: arm(0.4, 0.05, 0.5) }), place: at(-0.18, 0, 0.05, FACE_X + 0.4) },
    them: { body: b(STAND, { head: [0, -0.3, 0], armR: arm(0.15, -0.04, 0.01, 0.02) }), place: at(0.1, 0, 0, FACE_US) },
    view: { yaw: 0.1, pitch: 0.05 },
  },
  // Undressing for him: facing us, hands behind her head, hip cocked; he watches from the side.
  strip: {
    her: { body: b(STAND, { arch: 0.3, torso: [0.05, 0, 0.08], head: [0.1, 0.2, 0], armL: arm(2.8, 0.3, 2.2), armR: arm(2.8, 0.3, 2.2), legL: leg(0.12, 0.02, 0.2), legR: leg(-0.02, 0.1, 0.02) }), place: at(-0.1, 0, 0, FACE_US) },
    them: { body: STAND, place: at(0.75, 0, -0.3, FACE_MINUS_X - 0.5) },
    view: { yaw: 0, pitch: 0.05 },
  },
  // Him behind her, arms round her front, his face by hers; her head back on his shoulder.
  grope: {
    her: { body: b(STAND, { arch: 0.25, head: [0.25, 0.25, 0], armL: arm(0.4, 0.1, 0.9), armR: arm(0.4, 0.1, 0.9) }), place: at(0, 0, 0, FACE_US) },
    them: { body: b(STAND, { torso: [-0.1, 0, 0], head: [-0.2, -0.4, 0], armL: arm(0.95, -0.45, 1.1), armR: arm(0.65, -0.35, 0.9) }), place: at(0.05, 0, -0.2, FACE_US) },
    view: { yaw: 0.25, pitch: 0.05 },
  },
  // Side by side, her hand on him, the other on his chest.
  stroke: {
    her: { body: b(STAND, { arch: 0.2, torso: [-0.1, 0.2, 0], head: [-0.2, 0.2, 0], armL: arm(0.75, -0.25, 0.35), armR: arm(1.1, -0.2, 1.4) }), place: at(-0.18, 0, 0.08, FACE_X + 0.6) },
    them: { body: b(STAND, { head: [-0.15, -0.3, 0], armR: arm(0.5, 0.2, 0.6) }), place: at(0.12, 0, -0.029, FACE_US) },
    view: { yaw: 0.15, pitch: 0.05 },
  },
  // On her knees in front of him, her mouth at him, hands on his thighs.
  kneel: {
    her: { body: b(KNEEL, { torso: [-0.18, 0, 0], head: [0.14, 0, 0], armL: arm(1.0, -0.15, 0.7), armR: arm(1.0, -0.15, 0.7), drop: 0.366, legL: leg(0.01, 0.08, 1.24), legR: leg(0.01, 0.08, 1.25) }), place: at(-0.33, 0, 0, FACE_X) },
    them: { body: b(STAND, { arch: 0.2, head: [-0.4, 0, 0], armL: arm(0.4, 0.1, 0.6), armR: arm(0.4, 0.1, 0.6) }), place: at(0.2, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.5, pitch: 0.1 },
  },
  // As kneeling, closer, his hands holding her head, her face tipped up to him.
  throat: {
    her: { body: b(KNEEL, { torso: [-0.1, 0, 0], head: [0.5, 0, 0], armL: arm(0.9, -0.1, 0.5), armR: arm(0.9, -0.1, 0.5), drop: 0.362, legL: leg(0, 0.08, 1.23), legR: leg(0.01, 0.08, 1.24) }), place: at(-0.28, 0, 0, FACE_X) },
    them: { body: b(STAND, { arch: 0.4, torso: [-0.15, 0, 0], head: [-0.45, 0, 0], armL: arm(0.55, -0.2, 0.3), armR: arm(0.55, -0.2, 0.3) }), place: at(0.17, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.5, pitch: 0.1 },
  },
  // Kneeling up tall against him, her breasts round him, pressed together with her hands.
  paizuri: {
    her: { body: b(KNEEL, { drop: 0.261, arch: 0.15, legL: leg(-0.09, 0.1, 0.75), legR: leg(-0.09, 0.1, 0.75), head: [0.66, 0, 0], armL: arm(0.45, -0.35, 1.7), armR: arm(0.45, -0.35, 1.7), torso: [-0.03, 0, 0] }), place: at(-0.2, 0, 0, FACE_X) },
    them: { body: b(STAND, { head: [-0.45, 0, 0], armL: arm(0.3, 0.15, 0.4), armR: arm(0.3, 0.15, 0.4) }), place: at(0.12, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.5, pitch: 0.1 },
  },
  // Him bent to her breasts, hands at her waist; her hands in his hair, head back.
  suck: {
    her: { body: b(STAND, { arch: 0.3, torso: [0.12, 0, 0], head: [0.35, 0, 0], armL: arm(1.3, -0.1, 1.2), armR: arm(1.2, -0.1, 1.2) }), place: at(-0.17, 0, 0, FACE_X) },
    them: { body: b(STAND, { drop: 0.22, torso: [-1.2, 0, 0], head: [0.45, 0, 0], armL: arm(0.6, -0.1, 0.6), armR: arm(0.6, -0.1, 0.6), legL: leg(0.35, 0.1, 0.6), legR: leg(0.05, 0.1, 0.5) }), place: at(0.45, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.45, pitch: 0.05 },
  },
  // Pressed together, his hands full of her rear, hers on his chest.
  grab: {
    her: { body: b(STAND, { arch: 0.35, head: [0.25, 0, 0.1], armL: arm(1.1, -0.15, 1.6), armR: arm(1.1, -0.15, 1.6) }), place: at(-0.14, 0, 0, FACE_X) },
    them: { body: b(STAND, { torso: [-0.01, 0, 0], head: [-0.25, 0, -0.1], armL: arm(0.55, -0.5, 1.0), armR: arm(0.55, -0.5, 1.0), drop: 0.01, legL: leg(0.16, 0.01, 0.17), legR: leg(0.16, 0.01, 0.17) }), place: at(0.298, 0, 0, FACE_MINUS_X) },
    view: { yaw: -0.6, pitch: 0.05 },
  },
  // Bent over, hands on her knees, rear to him; his hand raised to bring down on it.
  spank: {
    her: { body: b(STAND, { arch: 0.4, torso: [-1.1, 0, 0], head: [0.6, 0.6, 0], armL: arm(0.45, 0.05, 0.1), armR: arm(0.45, 0.05, 0.1), legL: leg(0.1, 0.06, 0.1), legR: leg(0.1, 0.06, 0.1) }), place: at(0, 0, 0, FACE_MINUS_X) },
    them: { body: b(STAND, { torso: [-0.1, 0, 0], armR: arm(2.6, 0.2, 0.5), armL: arm(0.6, -0.2, 0.3) }), place: at(0.5, 0, 0.12, FACE_MINUS_X) },
    view: { yaw: 0.35, pitch: 0.1 },
  },
  // Her standing, legs apart, back to the wall, his head between her thighs, her hands in his hair.
  licked: {
    her: { body: b(STAND, { arch: 0.25, torso: [0.05, 0, 0], head: [0.2, 0, 0], armL: arm(0.7, -0.1, 0.5), armR: arm(0.7, -0.1, 0.5), legL: leg(0.15, 0.22, 0.25), legR: leg(0, 0.22, 0.05) }), place: at(-0.2, 0, 0, FACE_X) },
    them: { body: b(KNEEL, { drop: 0.65, torso: [-1.15, 0, 0], head: [0.85, 0, 0], armL: arm(0.7, 0.1, 0.4), armR: arm(0.7, 0.1, 0.4) }), place: at(0.42, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.55, pitch: 0.1 },
  },
  // Him on his back, his head to us; her kneeling astride him, upright, hands on his chest.
  cowgirl: {
    her: { body: b(KNEEL, { drop: 0.4, arch: 0.25, legL: leg(0.35, 0.55, 1.6), legR: leg(0.35, 0.55, 1.6), head: [0.05, 0, 0], armL: arm(0.6, 0.1, 0.2), armR: arm(0.6, 0.1, 0.2) }), place: at(0, 0, 0, FACE_US) },
    them: { body: b(STAND, { arch: 0, armL: arm(0.6, 0.3, 0.6), armR: arm(0.6, 0.3, 0.6), legL: leg(0, 0.08, 0), legR: leg(0, 0.08, 0) }), place: at(0, 0.128, -1.054, 0, ON_BACK) },
    view: { yaw: 0, pitch: 0.3 },
  },
  // Him on his back, his feet to us; her astride him facing his feet, leaning back on her hands.
  reverse: {
    her: { body: b(KNEEL, { drop: 0.4, arch: 0.15, torso: [0.35, 0, 0], head: [0.1, 0, 0], legL: leg(0.35, 0.55, 1.6), legR: leg(0.35, 0.55, 1.6), armL: arm(-0.6, 0.25, 0.1), armR: arm(-0.6, 0.25, 0.1) }), place: at(0, 0, 0, FACE_US) },
    them: { body: b(STAND, { arch: 0, armL: arm(0.4, 0.2, 0.3), armR: arm(0.4, 0.2, 0.3), legL: leg(0, 0.1, 0), legR: leg(0, 0.1, 0) }), place: at(0, 0.128, 1.054, FACE_US, ON_BACK) },
    view: { yaw: 0, pitch: 0.3 },
  },
  // On her hands and knees, looking back at us; him kneeling up behind her, hands on her hips.
  doggy: {
    her: { body: b(KNEEL, { arch: 0.4, torso: [-1.35, 0, 0], head: [0.9, 0.5, 0], armL: arm(0, 0.05, 0.1), armR: arm(0, 0.05, 0.1) }), place: at(-0.1, 0, 0, FACE_MINUS_X) },
    them: { body: b(KNEEL, { arch: 0.1, head: [-0.3, 0, 0], armL: arm(0.6, -0.15, 0.3), armR: arm(0.6, -0.15, 0.3), drop: 0.522, legL: leg(0.05, 0.09, 1.6), legR: leg(0.07, 0.09, 1.61) }), place: at(0.34, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.35, pitch: 0.15 },
  },
  // On her back, legs up and apart round him; him kneeling up between them, hands on her thighs.
  missionary: {
    her: { body: b(STAND, { arch: 0, head: [0.2, 0.6, 0], armL: arm(2.6, 0.5, 0.6), armR: arm(2.6, 0.5, 0.6), legL: leg(1.5, 0.45, 1.0), legR: leg(1.5, 0.45, 1.0) }), place: at(0.85, 0.1, 0, FACE_X, ON_BACK) },
    them: { body: b(KNEEL, { torso: [-0.35, 0, 0], head: [-0.3, 0, 0], armL: arm(0.55, 0.15, 0.3), armR: arm(0.55, 0.15, 0.3), drop: 0.523, legL: leg(0.06, 0.09, 1.6), legR: leg(0.07, 0.09, 1.62) }), place: at(0.27, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.45, pitch: 0.2 },
  },
  // Standing, bent right over, hands on her knees, looking back; him standing close behind, hands on her hips.
  bentover: {
    her: { body: b(STAND, { arch: 0.45, torso: [-1.25, 0, 0], head: [0.9, 0.5, 0], armL: arm(0.3, 0.05, 0.05), armR: arm(0.3, 0.05, 0.05), legL: leg(0.05, 0.12, 0.08), legR: leg(0.05, 0.12, 0.08) }), place: at(0, 0, 0, FACE_MINUS_X) },
    them: { body: b(STAND, { drop: 0.128, torso: [-0.15, 0, 0], head: [-0.3, 0, 0], armL: arm(0.75, -0.15, 0.35), armR: arm(0.75, -0.15, 0.35), legL: leg(0.1, 0.41, 0.15), legR: leg(0.16, 0.41, 0.21) }), place: at(0.32, 0, 0.002, FACE_MINUS_X) },
    view: { yaw: 0.4, pitch: 0.1 },
  },
  // Him standing, holding her up under her thighs; her legs locked round his waist, arms round his neck.
  carry: {
    her: { body: b(STAND, { arch: 0.2, torso: [0.1, 0, 0], head: [0.25, 0, 0.15], armL: arm(1.5, -0.1, 0.7), armR: arm(1.5, -0.1, 0.7), legL: leg(1.35, 0.35, 1.5), legR: leg(1.35, 0.35, 1.5) }), place: at(-0.12, 0.22, 0, FACE_X) },
    them: { body: b(STAND, { arch: 0.3, torso: [0.12, 0, 0], head: [-0.2, 0, 0], armL: arm(0.7, -0.35, 1.1), armR: arm(0.7, -0.35, 1.1), legL: leg(0.68, 0.15, 0.64), legR: leg(0.79, 0.09, 1.27), drop: 0.098 }), place: at(0.132, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.5, pitch: 0.05 },
  },
  // Flat on her front, head up; him kneeling astride her thighs, leaning over her on his hands.
  prone: {
    her: { body: b(STAND, { arch: 0.25, head: [0.6, 0, 0], armL: arm(2.6, 0.4, 1.4), armR: arm(2.6, 0.4, 1.4), legL: leg(0, 0.15, 0), legR: leg(0, 0.15, 0) }), place: at(0.9, 0.12, 0, FACE_MINUS_X, -ON_BACK) },
    them: { body: b(KNEEL, { drop: 0.55, torso: [-0.55, 0, 0], head: [0.1, 0, 0], armL: arm(0.15, 0.15, 0), armR: arm(0.15, 0.15, 0), legL: leg(0.07, 0.09, 1.62), legR: leg(0.07, 0.09, 1.61) }), place: at(0.32, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.45, pitch: 0.25 },
  },
  // On her knees in the middle of them, facing us: one at her side with her mouth turned to him, the others at her
  // other hand and behind her (SCENE_JOINS).
  gangbang: {
    her: { body: b(KNEEL, { torso: [-0.14, 0, 0], head: [0.39, -0.75, 0], armL: arm(0.4, 0.3, 0.3), armR: arm(0.6, -0.2, 0.6), drop: 0.359, legL: leg(0.01, 0.08, 1.24), legR: leg(0, 0.08, 1.23) }), place: at(0, 0, 0, FACE_US) },
    them: { body: b(STAND, { arch: 0.3, head: [-0.45, 0, 0], armL: arm(0.55, -0.2, 0.3), armR: arm(0.55, -0.2, 0.3) }), place: at(-0.33, 0, 0.1, FACE_X) },
    view: { yaw: 0, pitch: 0.15 },
  },
  // Knocked down in the brawl she lost, on her knees and slumped, looking up at the one who won, standing over her.
  downed: {
    her: { body: b(KNEEL, { torso: [-0.55, 0, 0], head: [0.1, -0.3, 0.2], armL: arm(0, 0.05, 0.25), armR: arm(0.1, 0.05, 0.25), legL: leg(0.15, 0.04, 1.55), legR: leg(0.05, 0.04, 1.6) }), place: at(0, 0, 0, FACE_US - 0.6) },
    them: { body: b(STAND, { head: [-0.45, 0, 0], armL: arm(0.1, 0.06, 0.3, 0, 0, 1), armR: arm(0.1, 0.06, 0.3, 0, 0, 1), legL: leg(0, 0.1, 0.03), legR: leg(0, 0.1, 0.03) }), place: at(0.5, 0, -0.3, FACE_MINUS_X + 0.5) },
    view: { yaw: 0.2, pitch: 0.15 },
  },
  // Her willpower gone: flat on her back on the floor, limp, head fallen aside; him kneeling over her.
  slumped: {
    her: { body: b(STAND, { arch: 0, head: [0, 0.9, 0], armL: arm(0, 1.1, 0.3), armR: arm(0, 1.1, 0.3), legL: leg(0.25, 0.2, 0.5), legR: leg(0.1, 0.2, 0.2) }), place: at(0.85, 0.1, 0, FACE_X, ON_BACK) },
    them: { body: b(KNEEL, { torso: [-0.5, 0, 0], head: [-0.3, 0, 0], armL: arm(0.5, -0.1, 0.2), armR: arm(0.2, 0.05, 0.2), drop: 0.435, legR: leg(0.11, 0.08, 1.56) }), place: at(-0.099, 0, -0.401, FACE_US) },
    view: { yaw: 0.25, pitch: 0.35 },
  },
  // On a table in the taproom (KP's waitress_table): on her back across it, her hips at its edge and her legs up round
  // him; him standing between them, hands on her thighs.
  tableBack: {
    her: { body: b(STAND, { arch: 0, head: [0.25, 0.6, 0], armL: arm(2.7, 0.6, 0.5), armR: arm(2.7, 0.6, 0.5), legL: leg(1.5, 0.45, 1.0), legR: leg(1.5, 0.45, 1.0) }), place: at(0.85, TABLE_TOP + 0.1, 0, FACE_X, ON_BACK) },
    them: { body: b(STAND, { torso: [-0.2, 0, 0], head: [-0.4, 0, 0], armL: arm(0.75, -0.15, 0.35), armR: arm(0.75, -0.15, 0.35), legL: leg(0.79, 0.09, 1.29), legR: leg(0.79, 0.09, 1.28), drop: 0.098 }), place: at(0.329, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.45, pitch: 0.2 },
    table: { x: -0.45, z: 0, length: 1.25, width: 0.75, height: TABLE_TOP },
  },
  // Bent forward over a table, chest down on it, arms out across it, looking back; him standing close behind.
  tableBent: {
    her: { body: b(STAND, { arch: 0.2, head: [0.6, 0.35, 0], armL: arm(2.6, 0.4, 1.2), armR: arm(2.6, 0.4, 1.2), legL: leg(1.5, 0.12, 0.05), legR: leg(1.5, 0.12, 0.05) }), place: at(0.9, TABLE_TOP + 0.12, 0, FACE_MINUS_X, -ON_BACK) },
    them: { body: b(STAND, { drop: 0.128, torso: [-0.15, 0, 0], head: [-0.3, 0, 0], armL: arm(0.75, -0.15, 0.35), armR: arm(0.75, -0.15, 0.35), legL: leg(0.1, 0.41, 0.15), legR: leg(0.16, 0.41, 0.21) }), place: at(0.32, 0, 0.002, FACE_MINUS_X) },
    view: { yaw: 0.4, pitch: 0.15 },
    table: { x: -0.55, z: 0, length: 1.05, width: 0.75, height: TABLE_TOP },
  },
  // Her willpower gone and him in her: on her back, limp, legs fallen open; him kneeling between them, over her.
  used: {
    her: { body: b(STAND, { arch: 0, head: [0, 0.8, 0], armL: arm(2.6, 0.8, 0.3), armR: arm(2.6, 0.8, 0.3), legL: leg(0.9, 0.5, 1.3), legR: leg(0.9, 0.5, 1.3) }), place: at(0.85, 0.1, 0, FACE_X, ON_BACK) },
    them: { body: b(KNEEL, { torso: [-0.45, 0, 0], head: [-0.3, 0, 0], armL: arm(0.25, 0.1, 0), armR: arm(0.25, 0.1, 0), drop: 0.523, legL: leg(0.06, 0.09, 1.6), legR: leg(0.07, 0.09, 1.62) }), place: at(0.22, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.45, pitch: 0.3 },
  },
  // KP's footj: sat on the floor leaning back on her hands, knees up and out, her soles together round him; him
  // reclined facing her, legs spread round hers. Seen from his eyes, as KP draws it: low, looking up past her soles at
  // her, with a wide lens from inside him (his body's back faces aren't drawn), so only his cock shows, between her feet.
  footjob: {
    her: { body: b(STAND, { drop: 0.91, arch: 0.1, torso: [0.75, 0, 0], head: [-0.35, 0, 0], armL: arm(-0.3, 0.3, 0), armR: arm(-0.3, 0.3, 0), legL: leg(3.0, 0.55, 1.9, -0.5), legR: leg(3.0, 0.55, 1.9, -0.5) }), place: at(0, 0, 0.15, FACE_US) },
    them: { body: b(STAND, { drop: 0.92, torso: [-0.1, 0, 0], head: [-0.4, 0, 0], armL: arm(-1.5, -0.1, 1.6), armR: arm(-1.5, -0.1, 1.6), legL: leg(1.3, 0.36, 0.45), legR: leg(1.3, 0.36, 0.45) }), place: at(0, 0.032, 0.664, 0, 0.7) },
    view: { yaw: 0, pitch: -0.1, focus: [0, 0.38, 0.2], fov: 55, distance: 0.8 },
  },
  // KP's rimming, side on: him bent over a table on his hands, looking back; her bent at the waist behind him, face to
  // his rear, hands on it. Cropped on her whole bent body and his rear, as close as the tall picture allows.
  rimjob: {
    her: { body: b(STAND, { drop: 0.03, arch: 0.45, torso: [-1.8, 0, 0], head: [0.1, 0, 0], armL: arm(0.6, -0.3, 2.1, 0.3, 0, 0.2), armR: arm(0.6, -0.3, 2.1, 0.3, 0, 0.2), legL: leg(0.5, 0.12, 0.9), legR: leg(0.5, 0.12, 0.9) }), place: at(0.38, 0, 0, FACE_MINUS_X) },
    them: { body: b(STAND, { torso: [-1.74, 0, 0], head: [-0.2, -0.9, 0], armL: arm(0.01, -0.11, 1.06, 0.19), armR: arm(0.01, -0.12, 1.06, 0.19), legL: leg(0.73, 0.09, 1.27), legR: leg(0.62, 0.15, 0.61), drop: 0.088 }), place: at(-0.243, 0, -0.001, FACE_MINUS_X) },
    view: { yaw: 0.05, pitch: -0.04, focus: [0.06, 0.72, 0], distance: 2.7 },
    // A low table, so his hands lie flat on its top.
    table: { x: -1.0, z: 0, length: 0.8, width: 0.75, height: 0.69 },
  },
  // KP's slime_piledriver: on her shoulders, hips up, legs folded over towards her head and feet down by it; him
  // kneeling up tall behind her raised rear, in her from above, hands on the backs of her thighs. Seen from her head's
  // side, high, as KP: her rear filling the top of the picture, his chest cut off by its top edge, her head at the bottom.
  piledriver: {
    her: { body: b(STAND, { arch: 0, torso: [-0.95, 0, 0], head: [-2.2, 0, 0], armL: arm(1.4, 0.5, 0.1), armR: arm(1.4, 0.5, 0.1), legL: leg(2.35, 0.3, 0.9), legR: leg(2.35, 0.3, 0.9) }), place: at(0, 1.29, -0.2, 0, 3.55) },
    them: { body: b(KNEEL, { arch: 1.5, drop: 0.467, torso: [-0.15, 0, 0], head: [-0.5, 0, 0], armL: arm(-0.06, -0.21, 0.52, 0.56), armR: arm(-0.06, -0.21, 0.52, 0.56), legL: leg(0.3, 0.07, 2.02), legR: leg(0.31, 0.07, 2.03) }), place: at(0, 0, -0.735, FACE_US) },
    view: { yaw: 0, pitch: 0.6, focus: [0, 0.36, -0.45], distance: 2.1 },
  },
  // KP's kick_counter, side on: she's on one leg (up on her toes, below the picture), the kicking one caught up high,
  // its thigh rising to him and its shin hanging by his hip; his near arm hooked under it, his hand spread on her rear,
  // the other at her far hip; knees bent to her height. Her hands on his chest, faces close. A bench behind them.
  kickCounter: {
    her: { body: b(STAND, { arch: 0, torso: [0.05, 0, 0], head: [0.05, 0, 0], armL: arm(0.4, -0.1, 1.8, 0.3), armR: arm(0.4, -0.1, 1.8, 0.3), legL: leg(2.2, 0.55, 2.25), legR: leg(-0.05, 0.05, 0.05) }), place: at(0.11, 0.08, 0, FACE_MINUS_X) },
    them: { body: b(STAND, { drop: 0.252, arch: 0.2, torso: [0.02, 0, 0], head: [-0.2, 0, 0], armR: arm(-0.45, 0.16, 1.35, 0.56, 0, 0.4), armL: arm(-0.54, -0.34, 1.61, 0.34, 0, 0.4), legL: leg(0.88, 0.65, 1.6), legR: leg(0.87, 0.65, 1.59) }), place: at(-0.135, 0, -0.001, FACE_X) },
    view: { yaw: 0.05, pitch: 0, focus: [-0.02, 1.08, 0], zoom: 0.56 },
    props: [{ kind: "bench", x: 0.2, z: -0.4, length: 1.4, width: 0.32, height: 0.32 }],
  },
  // KP's yeti_paizuri, side on: her back to a post, slid down it to his height, knees out; her own hands squeezing her
  // breasts round him, as KP's yeti has it, so nothing of his is in front of them; him stood close, straddling her
  // knees, his hands up on the post over her head.
  standPaizuri: {
    her: { body: b(STAND, { drop: 0.4, arch: 0.15, head: [0.25, 0, 0], armL: arm(0.2, -0.6, 2.4, 0.6), armR: arm(0.2, -0.6, 2.4, 0.6), legL: leg(1.5, 0.6, 1.5), legR: leg(1.5, 0.6, 1.5) }), place: at(-0.25, 0, 0, FACE_X) },
    them: { body: b(STAND, { drop: 0.216, arch: 0.2, head: [-0.45, 0, 0], armL: arm(0.44, -0.48, 1.92, 0.42, 0, 0.5), armR: arm(0.44, -0.48, 1.92, 0.42, 0, 0.5), legL: leg(0.85, 0.66, 1.44), legR: leg(0.84, 0.67, 1.43) }), place: at(0.06, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.15, pitch: 0.08, focus: [-0.06, 0.86, 0], distance: 2.3 },
    props: [{ kind: "post", x: -0.47, z: 0, length: 0.2, width: 0.2, height: 2.4 }],
  },
  // KP's guard_gb: him on his back, her astride him leaning forward on her hands, looking back over her shoulder, his
  // hands spreading her rear and him up in her; seen close from low behind her, as KP does, her rear filling the picture.
  // The squad fills her mouth and hands (SCENE_JOINS); the crop stays as KP's whoever's in.
  soldierGangbang: {
    her: { body: b(KNEEL, { drop: 0.55, arch: 0.4, torso: [-1.3, 0, 0], head: [0.3, -1.3, 0], armL: arm(0.1, 0.3, 0.3), armR: arm(0.1, 0.3, 0.3), legL: leg(0.7, 0.65, 2.3, 0.15), legR: leg(0.7, 0.65, 2.3, 0.15) }), place: at(0, 0, -0.03, 0) },
    them: { body: b(STAND, { arch: 0, armL: arm(-0.35, -0.54, 1.06, 0.06, 0, 0.15), armR: arm(-0.35, -0.54, 1.06, 0.06, 0, 0.15), legL: leg(0, 0.1, 0), legR: leg(0, 0.1, 0) }), place: at(0, 0.128, 1.124, FACE_US, ON_BACK) },
    view: { yaw: 0.45, pitch: -0.05, focus: [0, 0.44, -0.17], distance: 1.6 },
  },
  // Pressed face-first to the wall, her hands up flat on it and her rear out, looking back, up on her toes (below the
  // picture); him close behind, knees bent and spread to her height, in her, hands at her hips. Side on, so neither he
  // nor the wall stands in front of her.
  againstWall: {
    her: { body: b(STAND, { arch: 0.55, torso: [0.05, 0, 0], head: [0, 0.9, 0], armL: arm(2.8, 0.5, 0.1), armR: arm(2.8, 0.5, 0.1), legL: leg(-0.05, 0.18, 0.05), legR: leg(-0.05, 0.18, 0.05) }), place: at(-0.35, 0.08, 0, FACE_MINUS_X) },
    them: { body: b(STAND, { drop: 0.288, torso: [-0.1, 0, 0], head: [-0.3, 0, 0], armL: arm(-0.83, -0.31, 1.82, 0.34, 0, 0.4), armR: arm(-0.83, -0.31, 1.82, 0.34, 0, 0.4), legL: leg(0.95, 0.73, 1.73), legR: leg(0.94, 0.73, 1.72) }), place: at(-0.094, 0, 0, FACE_MINUS_X) },
    view: { yaw: 0.12, pitch: 0.05, focus: [-0.22, 1.18, 0], distance: 3.0 },
    props: [{ kind: "wall", x: -0.6, z: 0, length: 0.12, width: 2.4, height: 2.4 }],
  },
  // Him sat on a bench; her kneeling astride his lap on it, facing him, her shins along the seat by his thighs, hands
  // at his face; his hands under her rear.
  lapRide: {
    her: { body: b(KNEEL, { drop: 0.82, arch: 0.3, head: [0.1, 0, 0], armL: arm(0.75, 0.05, 1.75), armR: arm(0.75, 0.05, 1.75), legL: leg(1.0, 0.45, 2.8, 0.5), legR: leg(1.0, 0.45, 2.8, 0.5) }), place: at(-0.05, 0.6, 0, FACE_MINUS_X) },
    them: { body: b(STAND, { drop: 0.452, torso: [0.15, 0, 0], head: [0, 0, 0], armL: arm(0.08, -0.16, 0.88, 0.01), armR: arm(0.08, -0.16, 0.88, 0.01), legL: leg(1.74, -0.06, 2.23), legR: leg(1.73, -0.21, 2.24) }), place: at(-0.231, 0, 0.001, FACE_X) },
    view: { yaw: 0.25, pitch: 0.12 },
    props: [{ kind: "bench", x: -0.12, z: 0, length: 0.42, width: 1.6, height: 0.5 }],
  },
};

/** Another man waiting his turn beside her, hand on himself. */
const WAITING: Body = b(STAND, { head: [-0.35, 0, 0], armR: arm(0.55, -0.25, 0.5), armL: arm(0.1, 0.05, 0.2) });
/** Kneeling at her head, his hands on it. */
const AT_HEAD: Body = b(KNEEL, { arch: 0.3, head: [-0.4, 0, 0], armL: arm(0.6, -0.2, 0.4), armR: arm(0.6, -0.2, 0.4) });
/** Standing at her head, his hands on it. */
const STANDING_AT_HEAD: Body = b(STAND, { arch: 0.3, head: [-0.45, 0, 0], armL: arm(0.6, -0.2, 0.3), armR: arm(0.6, -0.2, 0.3) });
/** A man kneeling up at her head, his hands on it: his knees and feet down on the floor (KNEEL is drawn for her). */
const MAN_AT_HEAD: Body = b(AT_HEAD, { drop: 0.55, legL: leg(0.12, 0.08, 2.0), legR: leg(0.12, 0.08, 2.0) });
/** Lying on his side by her face, his legs drawn back out of the way: at her mouth when it's down on the floor. */
const LYING_AT_MOUTH: Body = b(STAND, { torso: [0, 0, -0.2], head: [-0.3, 0, 0], armL: arm(-0.3, -0.15, 0.2), armR: arm(2.9, -0.45, 0.4), legL: leg(-0.45, -0.1, 1.4), legR: leg(-0.6, -0.1, 1.2) });
/** Arms hanging easy at his sides, out of the way of the picture. */
const HANGING = arm(0.05, 0.12, 0.3);
/** Kneeling up beside her, waiting his turn, hand on himself. */
const KNEEL_WAITING: Body = b(KNEEL, { drop: 0.55, legL: leg(0.12, 0.08, 2.0), legR: leg(0.12, 0.08, 2.0), head: [-0.35, 0, 0], armR: arm(0.55, -0.25, 0.5), armL: arm(0.1, 0.05, 0.2) });

/**
 * Where others join her in the scenes that hold (see duelstage.ts): KP's slots, at her mouth and her hands. A scene
 * that isn't here has none: it's just the two of them.
 */
export const SCENE_JOINS: Partial<Readonly<Record<ScenePoseName, readonly JoinSpot[]>>> = {
  doggy: [
    { slot: "mouth", body: b(AT_HEAD, { drop: 0.522, legL: leg(0.06, 0.09, 1.61), legR: leg(0.06, 0.09, 1.61) }), place: at(-1.07, 0, 0, FACE_X) },
    { slot: "right", body: WAITING, place: at(-0.35, 0, -0.5, FACE_US) },
  ],
  bentover: [
    { slot: "mouth", body: b(STANDING_AT_HEAD, { drop: 0.096, legL: leg(0.76, 0.02, 1.3), legR: leg(0.67, -0.04, 0.64) }), place: at(-0.958, 0, 0, FACE_X) },
    { slot: "right", body: WAITING, place: at(-0.3, 0, -0.5, FACE_US) },
  ],
  missionary: [
    { slot: "mouth", body: b(AT_HEAD, { drop: 0.522, legL: leg(0.06, 0.09, 1.61), legR: leg(0.06, 0.09, 1.61) }), place: at(-1.02, 0, 0, FACE_X) },
    { slot: "right", body: WAITING, place: at(-0.35, 0, -0.5, FACE_US) },
  ],
  used: [
    { slot: "mouth", body: b(AT_HEAD, { drop: 0.522, legL: leg(0.06, 0.09, 1.61), legR: leg(0.06, 0.09, 1.61) }), place: at(-1.02, 0, 0, FACE_X) },
    { slot: "right", body: WAITING, place: at(-0.35, 0, -0.5, FACE_US) },
  ],
  prone: [
    { slot: "mouth", body: b(AT_HEAD, { drop: 0.522, legL: leg(0.06, 0.09, 1.61), legR: leg(0.06, 0.09, 1.61) }), place: at(-1.17, 0, 0, FACE_X) },
    { slot: "right", body: WAITING, place: at(-0.3, 0, -0.5, FACE_US) },
  ],
  cowgirl: [
    { slot: "left", body: WAITING, place: at(0.45, 0, -0.05, FACE_MINUS_X), reach: { armL: arm(0.9, 0.55, 0.3) } },
    { slot: "right", body: WAITING, place: at(-0.45, 0, -0.05, FACE_X), reach: { armR: arm(0.9, 0.55, 0.3) } },
  ],
  reverse: [
    { slot: "left", body: WAITING, place: at(0.467, 0, -0.058, FACE_MINUS_X), reach: { armL: arm(0.9, 0.55, 0.3) } },
    { slot: "right", body: WAITING, place: at(-0.469, 0, -0.051, FACE_X), reach: { armR: arm(0.9, 0.55, 0.3) } },
  ],
  kneel: [{ slot: "left", body: WAITING, place: at(-0.55, 0, -0.35, -2.14), reach: { armL: arm(0.4, 0.7, 0.3) } }],
  throat: [{ slot: "left", body: WAITING, place: at(-0.55, 0, -0.35, -2.14), reach: { armL: arm(0.4, 0.7, 0.3) } }],
  paizuri: [{ slot: "left", body: WAITING, place: at(-0.55, 0, -0.35, -2.14) }],
  gangbang: [
    { slot: "left", body: WAITING, place: at(0.45, 0, -0.05, FACE_MINUS_X), reach: { armL: arm(0.9, 0.6, 0.3) } },
    { slot: "right", body: WAITING, place: at(0.05, 0, -0.5, FACE_US) },
  ],
  downed: [
    { slot: "left", body: WAITING, place: at(-0.55, 0, -0.35, FACE_X + 0.6) },
    { slot: "right", body: WAITING, place: at(0.05, 0, -0.65, 0.2) },
  ],
  slumped: [
    { slot: "left", body: WAITING, place: at(-0.6, 0, -0.5, FACE_US - 0.4) },
    { slot: "right", body: WAITING, place: at(0.5, 0, -0.55, FACE_US + 0.4) },
  ],
  // The table (KP's waitress_table joins): one at her head across the table's end, one at her hand, one at the other.
  tableBack: [
    { slot: "mouth", body: b(STANDING_AT_HEAD, { drop: 0.096, legL: leg(0.76, 0.02, 1.3), legR: leg(0.67, -0.04, 0.64) }), place: at(-1.408, 0, 0, FACE_X) },
    { slot: "left", body: b(WAITING, { torso: [0.05, 0, 0], armL: arm(0.26, 0, 0.01, 0.03) }), place: at(-0.833, 0, -0.682, FACE_US + 0.3), reach: { armL: arm(2.2, 1.2, 0.3) } },
    { slot: "right", body: WAITING, place: at(-0.45, 0, -0.65, FACE_US), reach: { armR: arm(2.2, 1.2, 0.3) } },
  ],
  tableBent: [
    { slot: "mouth", body: b(STANDING_AT_HEAD, { drop: 0.096, legL: leg(0.76, 0.02, 1.3), legR: leg(0.67, -0.04, 0.64) }), place: at(-1.558, 0, 0, FACE_X) },
    { slot: "right", body: WAITING, place: at(-0.3, 0, -0.6, FACE_US) },
  ],
  // Kneeling round her, out of his eyes but for what's in her mouth and hands: KP's footj joins, one at her mouth from
  // the left, her left hand raised to one at her shoulder (KP's leftarm_hj), her right hand down to one low on the left.
  footjob: [
    { slot: "mouth", body: b(MAN_AT_HEAD, { drop: 0.522, armL: HANGING, armR: arm(-0.17, 0.06, 0.64, -0.04), legL: leg(0.43, 0.07, 2.24), legR: leg(0.44, 0.09, 2.24), torso: [0.01, 0, 0] }), place: at(-0.211, 0, -0.153, -2.06), reach: { head: [-0.1, -0.5, 0] } },
    { slot: "left", body: b(KNEEL_WAITING, { drop: 0.519, armL: HANGING, armR: HANGING, legL: leg(-0.04, 0.09, 1.81), legR: leg(0, 0.08, 1.85) }), place: at(0.448, 0, 0.1, FACE_MINUS_X), reach: { armL: arm(1.2, 0.3, 2.0, 0, 0, 0.6) } },
    { slot: "right", body: b(KNEEL_WAITING, { drop: 0.602, armL: HANGING, armR: HANGING, legL: leg(0.12, 0.24, 2.91), legR: leg(0.3, 0.08, 2.9) }), place: at(-0.471, 0, 0.311, FACE_X + 0.4), reach: { armR: arm(1, 0.1, 1.5, 0, 0, 0.6) } },
  ],
  // Both kneeling on the far side, behind her, so neither stands between her and the camera: her left hand down under
  // her chest to the one by her shoulders, her right back by her hip to the other.
  rimjob: [
    { slot: "left", body: b(KNEEL_WAITING, { drop: 0.561, armL: HANGING, armR: HANGING, legL: leg(0.06, 0.08, 2.46), legR: leg(0.06, 0.09, 2.44) }), place: at(0.12, 0, -0.467, FACE_US), reach: { armL: arm(0.4, -1.2, 0.3, 0.6, 0, 0.6) } },
    { slot: "right", body: b(KNEEL_WAITING, { drop: 0.519, armL: HANGING, armR: HANGING, legL: leg(-0.01, 0.09, 1.84), legR: leg(-0.02, 0.07, 1.84) }), place: at(0.627, 0, -0.364, 2.11), reach: { armR: arm(-0.8, 0, 0, 0.3, 0, 0.6) } },
  ],
  piledriver: [{ slot: "mouth", body: b(LYING_AT_MOUTH, { drop: 0.086, torso: [-0.04, 0, -0.2], legL: leg(-0.42, 0.01, 1.4), legR: leg(-0.49, -0.12, 1.2) }), place: at(0.277, 0.172, 0.702, FACE_MINUS_X, 0, -Math.PI / 2), reach: { head: [-2.2, -0.9, 0] } }],
  // Up on the bench behind them, so he's at her mouth while she's held on one leg, his hands either side of her head.
  kickCounter: [{ slot: "mouth", body: b(STANDING_AT_HEAD, { armL: arm(0.02, -0.3, 0.76, 0.29), armR: arm(0.02, -0.3, 0.76, 0.29) }), place: at(0.1, 0.32, -0.295, FACE_US), reach: { head: [-0.15, -1.3, 0] } }],
  // On her far side, so he doesn't stand between her and the camera; his hips tipped up to her mouth, hands on her head.
  standPaizuri: [{ slot: "mouth", body: b(STANDING_AT_HEAD, { arch: -1.3, armL: arm(-0.2, -0.3, 1.5, 0.3), armR: arm(-0.3, -0.32, 1.57, 0.61), drop: 0.1, legL: leg(0.68, -0.03, 0.65), legR: leg(0.77, 0.01, 1.31) }), place: at(-0.211, 0, -0.28, FACE_US), reach: { head: [0, 0.9, -0.3] } }],
  // The squad round her: one kneeling up at her side where she looks back, in her mouth from the right as KP draws it;
  // one kneeling at each hand.
  soldierGangbang: [
    { slot: "mouth", body: b(MAN_AT_HEAD, { drop: 0.412, legL: leg(0.41, 0.07, 2), legR: leg(0.4, 0.07, 1.99) }), place: at(0.28, 0, -0.461, FACE_MINUS_X), reach: { head: [0.3, -1.3, 0] } },
    { slot: "left", body: b(KNEEL_WAITING, { armL: HANGING, armR: HANGING, drop: 0.59, legL: leg(0.19, 0.07, 2.54), legR: leg(0.2, 0.09, 2.52) }), place: at(-0.838, 0, -0.41, FACE_X), reach: { armL: arm(0.35, 1.05, 0.3) } },
    { slot: "right", body: b(KNEEL_WAITING, { armL: HANGING, armR: HANGING, drop: 0.59, legL: leg(0.19, 0.07, 2.54), legR: leg(0.2, 0.08, 2.53) }), place: at(0.838, 0, -0.41, FACE_MINUS_X), reach: { armR: arm(0.35, 1.05, 0.3) } },
  ],
  // Standing behind her, one at each side of her back, so neither stands between her and the camera; she reaches back
  // to them.
  lapRide: [
    { slot: "left", body: WAITING, place: at(0.55, 0, 0.32, FACE_MINUS_X + 0.5), reach: { armL: arm(-0.39, 0.98, 0.28, -0.73, 0, 0.6) } },
    { slot: "right", body: WAITING, place: at(0.55, 0, -0.32, FACE_MINUS_X - 0.5), reach: { armR: arm(-0.39, 0.98, 0.28, -0.73, 0, 0.6) } },
  ],
};

/**
 * The scenes that hold (KP's sex poses): once she's in one with someone, it stays until he's done, whatever else
 * goes on, and others join her in it rather than taking her out of it.
 */
export const HOLDING_SCENES: ReadonlySet<ScenePoseName> = new Set<ScenePoseName>([
  "kneel", "throat", "paizuri", "licked", "cowgirl", "reverse", "doggy", "missionary", "bentover", "carry", "prone", "gangbang", "used",
  "tableBack", "tableBent",
  "footjob", "rimjob", "piledriver", "kickCounter", "standPaizuri", "soldierGangbang", "againstWall", "lapRide",
]);

/**
 * How each type of man has her when he goes all the way, the way KP's enemy types each have their own pose: in her
 * pussy, and in her ass. A table to change.
 */
export const KIND_POSITIONS: Readonly<Record<GuestKind, { pussy: ScenePoseName; butt: ScenePoseName }>> = {
  farmer: { pussy: "missionary", butt: "doggy" },
  soldier: { pussy: "prone", butt: "bentover" },
  smuggler: { pussy: "bentover", butt: "bentover" },
  fugitive: { pussy: "doggy", butt: "prone" },
  adventurer: { pussy: "carry", butt: "doggy" },
  bandit: { pussy: "doggy", butt: "prone" },
  noble: { pussy: "cowgirl", butt: "reverse" },
};

/**
 * On a table in the taproom (KP's Waitress Sex): the scenes there are on it. Lying back or riding is on her back
 * across it; from behind, or flat out, is bent over it. With three or more of them on her, it's still the table,
 * them all at her slots. What isn't either (on her knees for him, a kiss) takes her off it for the moment.
 */
export function onTable(scene: ScenePoseName): ScenePoseName {
  if (["missionary", "cowgirl", "reverse", "carry", "licked", "used", "gangbang"].includes(scene)) return "tableBack";
  if (["doggy", "bentover", "prone"].includes(scene)) return "tableBent";
  return scene;
}

/** With her willpower gone she can't hold herself up: what each scene becomes. */
export function defeatedScene(scene: ScenePoseName): ScenePoseName {
  if (["missionary", "cowgirl", "reverse", "carry", "licked"].includes(scene)) return "used";
  if (["doggy", "bentover"].includes(scene)) return "prone";
  if (HOLDING_SCENES.has(scene)) return scene;
  return "slumped";
}

export const SCENE_POSE_LIST = Object.keys(SCENE_POSES) as ScenePoseName[];

/**
 * Where a partner's move puts them with her: by the part of her they have, and how bold they've got with it. "kind"
 * is the position his type has her in (KIND_POSITIONS).
 */
const THEIR_SCENES: Readonly<Record<DuelArea, readonly (ScenePoseName | "kind")[]>> = {
  hands: ["grope", "stroke", "stroke"],
  mouth: ["kiss", "kneel", "throat"],
  breasts: ["grope", "suck", "paizuri"],
  butt: ["grab", "spank", "kind"],
  pussy: ["grope", "licked", "kind"],
};

/** A woman's moves on her: no stages, and none of a man's. */
const WOMAN_SCENES: Readonly<Record<"kiss" | DuelArea, ScenePoseName>> = {
  kiss: "kiss", hands: "caress", mouth: "kiss", breasts: "suck", butt: "grab", pussy: "grope",
};

/** Her own moves: what she does with them. Holding back, enduring and stopping leave them as they are. */
const HER_SCENES: Partial<Readonly<Record<HerMove, ScenePoseName>>> = {
  kiss: "kiss", caress: "caress", tease: "tease", undress: "strip", hands: "stroke", mouth: "kneel", tits: "paizuri", ride: "cowgirl", anal: "doggy",
};

/** On a woman: her fingers on her, going down on her, her breasts to hers, grinding on her thigh. */
const HER_ON_WOMAN: Partial<Readonly<Record<HerMove, ScenePoseName>>> = { hands: "caress", tits: "caress", ride: "cowgirl" };

/**
 * The scene a moment of the game puts them in, or null to leave them as they are (a note, a climax, a load, holding
 * back). `female` is whether the partner is a woman; `alt` picks between scenes that can stand for the same move
 * (riding him facing him, or facing his feet). A man going all the way has her the way his type does
 * (KIND_POSITIONS); riding him is her own choice, KP's Karryn cowgirl.
 */
export function sceneForEntry(entry: Pick<DuelLogEntry, "side" | "part" | "stage" | "move" | "kind">, female: boolean, alt = false): ScenePoseName | null {
  const kind = entry.kind ? KIND_POSITIONS[entry.kind] : null;
  if (entry.side === "partner" && entry.part) {
    if (female) return WOMAN_SCENES[entry.part];
    if (entry.part === "kiss") return "kiss";
    const stages = THEIR_SCENES[entry.part];
    const scene = stages[Math.min(stages.length - 1, Math.max(0, entry.stage ?? 0))];
    if (scene !== "kind") return scene;
    return entry.part === "butt" ? (kind?.butt ?? "doggy") : (kind?.pussy ?? "missionary");
  }
  if (entry.side === "her" && entry.move) {
    if (!female && entry.move === "anal") return kind?.butt ?? "doggy";
    const scene = (female ? HER_ON_WOMAN[entry.move] : undefined) ?? HER_SCENES[entry.move] ?? null;
    return scene === "cowgirl" && alt && !female ? "reverse" : scene;
  }
  return null;
}

/** As battlepose.ts has a body's pose: her left arm and leg as its near side, mirrored. */
function asBattle(body: Body): BattlePose {
  return { arch: body.arch, drop: body.drop, turn: 0, torso: body.torso, head: body.head, armNear: body.armL, armFar: body.armR, legNear: body.legL, legFar: body.legR };
}

function fromBattle(pose: BattlePose): Body {
  return { arch: pose.arch, drop: pose.drop, torso: pose.torso, head: pose.head, armL: pose.armNear, armR: pose.armFar, legL: pose.legNear, legR: pose.legFar };
}

/** Partway from one scene to the next, `t` of the way. */
export function blendScene(a: ScenePose, c: ScenePose, t: number): ScenePose {
  const l = (x: number, y: number) => MathUtils.lerp(x, y, t);
  const place = (p: Place, q: Place): Place => ({ x: l(p.x, q.x), y: l(p.y, q.y), z: l(p.z, q.z), yaw: l(p.yaw, q.yaw), pitch: l(p.pitch, q.pitch), roll: l(p.roll, q.roll) });
  const body = (p: Body, q: Body) => fromBattle(blendPose(asBattle(p), asBattle(q), t));
  const them = a.them && c.them ? { body: body(a.them.body, c.them.body), place: place(a.them.place, c.them.place) } : t < 0.5 ? a.them : c.them;
  return {
    her: { body: body(a.her.body, c.her.body), place: place(a.her.place, c.her.place) },
    them,
    view: { ...c.view, yaw: l(a.view.yaw, c.view.yaw), pitch: l(a.view.pitch, c.view.pitch) },
  };
}

/**
 * How much bigger the men are drawn in the scene pictures than in the room: KP's men tower over Karryn, a head and
 * more above her stood up. Only in the picture; the poses are made for them this size. A woman partner is as she is.
 */
export const SCENE_MAN_SCALE = 1.1;

/** A cast member's model sized for the scene picture (`name` its body name): a man drawn SCENE_MAN_SCALE big. */
export function sizeForScene(model: Object3D, name: string): void {
  if (name === "Male") model.scale.multiplyScalar(SCENE_MAN_SCALE);
}

/** A body's measures for posing it: its hips' rest and its legs' length, and how big it's drawn. */
export interface Posed {
  model: Object3D;
  bones: PoseBones;
  female: boolean;
  hipsBaseY: number;
  hipsBaseZ: number;
  legLength: number;
  scale: number;
}

/** Poses one body and sets it down on the stage. */
export function placeBody(posed: Posed, body: Body, place: Place, extra?: PoseExtra): void {
  applyPose(posed.bones, asBattle(body), {
    mirror: true,
    female: posed.female,
    legLength: posed.legLength,
    hipsBaseY: posed.hipsBaseY,
    hipsBaseZ: posed.hipsBaseZ,
    extra,
  });
  posed.model.position.set(place.x * posed.scale, place.y * posed.scale, place.z * posed.scale);
  posed.model.rotation.set(place.pitch, place.yaw, place.roll, "YXZ");
}

/** How much of the picture the two of them fill: their bounding sphere's share of the narrower way across. */
export const SCENE_FILL = 0.6;

/**
 * Where the camera stands for a scene: looking at the middle of the two of them (`box`, both bodies as posed) from
 * the scene's angle, back far enough that they fill the picture (`aspect` is its width over its height); or, for a
 * scene that crops in (its `focus`, on a stage drawn `scale` big), at that point, and as much closer as its `zoom`.
 */
export function sceneFraming(box: Box3, view: SceneView, fov: number, aspect: number, scale = 1): { position: Vector3; target: Vector3 } {
  const target = view.focus ? new Vector3(...view.focus).multiplyScalar(scale) : box.getCenter(new Vector3());
  const radius = box.getSize(new Vector3()).length() / 2;
  const half = MathUtils.degToRad(fov) / 2;
  const across = Math.min(half, Math.atan(Math.tan(half) * aspect));
  const distance = view.distance !== undefined ? view.distance * scale : (radius / Math.sin(across)) * SCENE_FILL * (view.zoom ?? 1);
  const dir = new Vector3(Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), Math.cos(view.yaw) * Math.cos(view.pitch));
  return { position: target.clone().addScaledVector(dir, distance), target };
}
