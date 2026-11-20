import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  type InterleavedBufferAttribute,
  MathUtils,
  Matrix3,
  Matrix4,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SkinnedMesh,
  type Texture,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { DISC_MATERIAL } from "./nipples";
import { CANAL_MATERIAL, VULVA_MATERIAL } from "./vulva";
import type { Effect } from "./audio";
import { PANEL_SHAPE } from "./comic";
import { addSkinDetail } from "./skindetail";
import { ComicFx, fxPlan, makeMoanBubble, touchHeat, type FxPlan, type FxSpots } from "./comicfx";
import { Jiggle } from "./jiggle";
import { chestOverHips } from "./player";
import { CUT_INS, cutKindFor, SPANK_LEVELS, spankLevel, type CutFormat, type CutIn, type CutKind, type CutMotion } from "./cutin";
import { touchLands, type TouchAnswer, type TouchRegion } from "./touch";
import { SMACK_TOUCHES } from "./touchtalk";
import type { GuestKind } from "./tavern";
import { addPaintTo } from "./paint";

/**
 * The comic panel for a guest reaching for you, in the same dithered look as the drink panel: your own character,
 * rendered live from the real model and framed close on where the touch lands, and a guest's hand coming in from
 * the side. What happens next is your answer: the hand lands and she jolts or melts into it, she slaps it away,
 * or she twists out of reach and it grabs at air. It plays by itself alongside the conversation.
 */

/** The panel's size in game pixels at each shape, shown scaled up without smoothing, like the rest of the game. */
const FORMATS: Record<CutFormat, { width: number; height: number }> = { wide: { width: 240, height: 180 }, tall: { width: 180, height: 240 } };
const LEVELS = 31;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** When each beat happens, in seconds from the panel popping up. */
const T = {
  popIn: 0.3,
  /** The hand starts in from the side. */
  reachFrom: 0.2,
  /** Where it lands, or would have. */
  contact: 0.85,
  /** She swings to slap it, or starts to twist away, a little before. */
  swing: 0.62,
  /** The hand lets go, or flies off. */
  release: 2.35,
  popOut: 2.9,
  end: 3.25,
} as const;

/** Where a held panel stops: the hand on her, before it lets go. */
const HOLD_AT = T.release - 0.05;

/** How she stands to the camera: facing it (angled toward the guest), side on, or with her back to it. */
type View = "front" | "square" | "under" | "low" | "above" | "between" | "profile" | "behind";
const TURN: Record<View, number> = {
  front: Math.PI - 0.5,
  square: Math.PI - 0.12,
  under: Math.PI - 0.42,
  low: Math.PI - 0.1,
  above: Math.PI - 0.2,
  between: Math.PI,
  profile: Math.PI - 1.15,
  behind: 0.3,
};

/**
 * What the guest's hand does once it's there: rests, holds on, strokes across or up, smacks, squeezes, presses
 * in (a kiss, a coin), taps, or tugs at something. "none" is a touch with no hand in it, such as a long look.
 */
type Gesture = "rest" | "hold" | "stroke" | "strokeUp" | "smack" | "squeeze" | "press" | "tap" | "tug" | "none";

/**
 * The shot for a touch: where it lands (a bone, and an offset from it in the model's own space, where the
 * front is -Z, so the point sits on the skin rather than inside the body), how close the camera comes, how
 * she stands to it, and what the hand does. The camera centres on where it lands, so the panel is about
 * that and nothing else.
 */
interface Shot {
  bone: string;
  offset: [number, number, number];
  /** How far back the camera stands, in model units. */
  distance: number;
  view: View;
  gesture: Gesture;
  /**
   * On the side of her face: the hand cups her cheek and jaw with its fingers pointing up, and the camera
   * centres on her face rather than the hand, so the player sees how she takes it.
   */
  sideOfFace?: boolean;
}

/** The side of her face the hand comes from, cheek to jaw, from the head bone: clear of her eyes and mouth. */
const SIDE_OF_FACE: [number, number, number] = [-0.1, 0.05, 0];
/** Where the middle of her face is, from the head bone. */
const MIDDLE_OF_FACE = new Vector3(0, 0.1, -0.08);

/** The usual shot for each place a touch can land. */
const SHOTS: Record<TouchRegion, Shot> = {
  hand: { bone: "ForeArm_R", offset: [0, -0.3, -0.02], distance: 0.8, view: "front", gesture: "hold" },
  face: { bone: "Head", offset: SIDE_OF_FACE, distance: 0.75, view: "front", gesture: "stroke", sideOfFace: true },
  hair: { bone: "Head", offset: [-0.09, 0.2, 0], distance: 0.8, view: "front", gesture: "stroke" },
  shoulder: { bone: "UpperArm_R", offset: [0, 0.02, 0], distance: 1.0, view: "front", gesture: "hold" },
  waist: { bone: "Hips", offset: [-0.14, 0.12, -0.04], distance: 1.05, view: "front", gesture: "hold" },
  rear: { bone: "Glute_L", offset: [0, -0.07, 0.07], distance: 0.95, view: "behind", gesture: "squeeze" },
  chest: { bone: "Torso", offset: [-0.06, 0.17, -0.16], distance: 0.85, view: "front", gesture: "squeeze" },
  lap: { bone: "Thigh_R", offset: [0, -0.12, -0.1], distance: 1.1, view: "front", gesture: "hold" },
  lips: { bone: "Head", offset: [0, 0.075, -0.13], distance: 0.6, view: "front", gesture: "press" },
  neck: { bone: "Head", offset: [-0.06, 0.0, -0.04], distance: 0.75, view: "profile", gesture: "stroke" },
  thigh: { bone: "Thigh_R", offset: [-0.04, -0.15, -0.09], distance: 1.15, view: "front", gesture: "rest" },
  clothes: { bone: "Torso", offset: [-0.08, 0.1, -0.13], distance: 1.0, view: "front", gesture: "tug" },
  intimate: { bone: "Thigh_R", offset: [0.03, 0.02, -0.1], distance: 1.15, view: "front", gesture: "strokeUp" },
  invite: { bone: "Head", offset: SIDE_OF_FACE, distance: 0.9, view: "front", gesture: "hold", sideOfFace: true },
};

/** Touches that need a shot of their own, by id: only what differs from their region's. */
const SHOT_BY_TOUCH: Record<string, Partial<Shot>> = {
  fingers: { gesture: "rest" },
  gaze: { offset: [0, 0.12, -0.1], distance: 0.65, gesture: "none" },
  crumb: { gesture: "stroke" },
  nose: { offset: [0, 0.11, -0.12], distance: 0.6, gesture: "tap", sideOfFace: false },
  collar: { bone: "Torso", offset: [-0.02, 0.36, -0.1], distance: 0.8, gesture: "stroke" },
  whisper: { offset: [-0.08, 0.12, 0], gesture: "none" },
  lowBack: { offset: [-0.05, 0.18, 0.12], view: "behind", gesture: "stroke" },
  smack: { gesture: "smack" },
  kissHand: { gesture: "press" },
  chin: { offset: [0, 0.02, -0.09], distance: 0.7, gesture: "hold" },
  cheekKiss: { gesture: "press" },
  lock: { gesture: "tug" },
  hip: { offset: [-0.17, 0, -0.02], gesture: "stroke" },
  nuzzle: { gesture: "press" },
  coin: { offset: [0, 0.33, -0.14], distance: 0.75, gesture: "press" },
  neckKiss: { gesture: "press" },
  thighUp: { gesture: "strokeUp" },
  roam: { gesture: "stroke" },
  grab: { gesture: "squeeze" },
  // A kiss: the guest's face isn't in the panel, so their hand cups her jaw and her lips stay in view.
  kiss: { offset: SIDE_OF_FACE, distance: 0.7, gesture: "hold", sideOfFace: true },
  stolenKiss: { offset: SIDE_OF_FACE, distance: 0.7, gesture: "hold", sideOfFace: true },
  deepKiss: { offset: SIDE_OF_FACE, distance: 0.7, gesture: "hold", sideOfFace: true },
  bothHands: { gesture: "squeeze" },
  // Her breasts and behind, from anyone.
  pinch: { gesture: "tap" },
  swat: { gesture: "smack" },
  luckyPat: { gesture: "smack" },
  banditSmack: { gesture: "smack" },
  clumsyPat: { gesture: "tap" },
  brush: { gesture: "stroke" },
  cup: { gesture: "hold" },
  gloved: { gesture: "stroke" },
  overHeart: { offset: [-0.04, 0.24, -0.15], gesture: "rest" },
  // A brawl's own touches.
  scuffleSpank: { gesture: "smack" },
  scuffleMouth: { gesture: "stroke" },
  scuffleNeck: { offset: [-0.08, 0.12, 0], gesture: "none" },
  scuffleThigh: { gesture: "strokeUp" },
  scuffleKiss: { offset: SIDE_OF_FACE, distance: 0.7, gesture: "hold", sideOfFace: true },
};

function shotFor(id: string, region: TouchRegion): Shot {
  return { ...SHOTS[region], ...SHOT_BY_TOUCH[id] };
}

/** The soft part a touch sets bouncing, if any. */
const SOFT: Partial<Record<TouchRegion, string[]>> = { rear: ["Glute_L", "Glute_R"], chest: ["Bust"], lap: ["Glute_L", "Glute_R", "Bust"] };
/** The soft parts a cut-in sets bouncing. */
const CUT_SOFT: Partial<Record<CutKind, string[]>> = {
  breasts: ["Bust"],
  nipples: ["Bust"],
  butt: ["Glute_L", "Glute_R"],
  anal: ["Glute_L", "Glute_R"],
  spank: ["Glute_L", "Glute_R"],
  orgasm: ["Bust"],
  flaunt: ["Bust", "Glute_L", "Glute_R"],
  cumBody: ["Bust"],
};
/** Springs for the panel's own copy of the soft parts: only kicks move them. */
const SPRING = { frequency: 2.3, damping: 0.16, gain: 0, axes: [0.35, 1, 0.35] as const, limit: 0.03 };


/** The sounds lettered over the panel. */
interface Lettering {
  el: HTMLElement;
  from: number;
  to: number;
  /** Trembles while it's up: a moan she can't hold in. */
  shake?: boolean;
  /** Pops again every this many seconds, by the clock (a cut-in's sound, once a squeeze). */
  repeat?: number;
}

/** Where her mouth is from the head bone, for the breath steaming out of it. */
const MOUTH = new Vector3(0, 0.075, -0.11);
/** Either temple, from the head bone (the left one mirrored), for sweat. */
const TEMPLE = new Vector3(0.075, 0.16, -0.03);

/** Each linear byte the renderer gives, as sRGB (0 to 1): looked up, not worked out a pixel at a time. */
const TO_SRGB = Float32Array.from({ length: 256 }, (_, i) => linearToSrgb(i / 255));
/** Each of the panel's colour levels (0 to LEVELS) as a byte. */
const DITHERED = Uint8Array.from({ length: LEVELS + 1 }, (_, i) => Math.round((i / LEVELS) * 255));

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function span(t: number, from: number, to: number): number {
  return MathUtils.clamp((t - from) / (to - from), 0, 1);
}

const ease = (t: number) => MathUtils.smootherstep(t, 0, 1);

/** How much of a vertex has to move with the arm for it to count as part of the arm. */
const ARM_WEIGHT = 0.5;
/** Which way the palm faces in the forearm's own space, with the arm hanging down its -Y. */
const PALM = new Vector3(1, 0, 0);
/** How far the fingers dip into her, so the wrist and forearm rise off her rather than lying along her. */
const WRIST_LIFT = 0.4;

/** How long the fingers are, from the knuckles, in metres: what bends when the hand closes. */
const FINGER = 0.085;
/** How far closed fingers bend in all, in radians, from knuckle to tip. */
const CURL = 1.7;
/**
 * The hand built onto a cut arm. The models' hands are mittens (no fingers of their own), which up close read as
 * paddles; the panel gives each arm a hand of palm, four three-jointed fingers and a thumb instead, sized off the
 * mitten. Shares are of the mitten's length, wrist to fingertips.
 */
const HAND = {
  /** The palm's share; the fingers have the rest. */
  palm: 0.5,
  /** Each finger's length, index to little, as a share of the finger length. */
  fingers: [1.04, 1.12, 1.06, 0.87],
  /** Each finger's three bones, as shares of its length, and of its bend when it closes. */
  bones: [0.45, 0.31, 0.24],
  bend: [0.36, 0.38, 0.26],
  /** How far the fingers splay at their tips, open (radians each side of the middle). */
  splay: 0.16,
  /** How bent the fingers are even at rest, so they never stick out straight like boards. */
  rest: 0.12,
  /** The thumb's two bones (shares of the finger length), and its turn out from the palm. */
  thumb: [0.5, 0.44],
  thumbOut: 0.75,
};
/** Which side of a cut arm (its Z) the thumb is on. */
const THUMB_SIDE = 1;
/** How far a C cup's skin sits from the middle of each breast, as built: the size the breast cut-ins are framed for. */
const BUST_AS_BUILT = 0.076;
/** Which way from the middle of each breast his palm takes hold: out to her side (further out on the panel's left, where his left hand comes in from the edge), down and forward. */
const GRIP = { out: 0.3, outLeft: 0.45, down: 0.3, downLeft: 0, forward: 0.8 };
/** How far at most his hand moves out of (or into) her from where he took hold, to rest on her skin. */
const SIT_MOST = 0.04;
/** How much his fingers point up her body as well as at her nipple (so his forearm hangs straight down). */
const GRIP_UP = 1;
/** How far past her nipple, up over her breast (a share of the breast's size), his fingers reach for. */
const REACH_PAST = 0.25;
/**
 * KP's nipple pinch: how bent his thumb's tip is; how far apart his thumb and index fingertips are, in his finger's
 * radii, open and how much closer squeezing; his other fingers curled under her breast (0 open, 1 a fist), how far
 * they fan; how far he tugs her nipple (in metres at her build) and which way, on the panel's left (out to her side,
 * a little up, and that much further) and right (out and down), both drawn a little back off her chest, his arm
 * pulling away: out to her side, up, back toward him (the viewer); how far round
 * it her breast stretches after
 * it (a share of the breast's size), how much of it moves as one with the nipple (the rest drawn out toward it),
 * how much of the pull the whole breast follows (on its spring), and how
 * steeply his pinch lies across her nipple (up, to in toward her middle, 1).
 */
const PINCH = { thumbTip: 0.3, gap: [2.4, 1.2], curled: 0.85, spread: 0.6, tug: 0.045, pullUp: [1, 0.1, 0.35], pullDown: [0.3, -1, 0.35], tugOut: 1.1, reach: 1.4, whole: 0.6, follow: 0.4, rise: 0.8 } as const;
/** About how wide her nipple is, in metres at her build: the spark under it is sized from it. */
const NIPPLE_SIZE = 0.012;
/** About how wide her vulva is either side of the hole, in metres at her build: the jolts beside it are placed by it. */
const JOLT_WIDTH = 0.02;
/** KP's nipple cut-in, low and square on: how far under her breasts the camera looks, and how far below that it is. */
const LOW = { below: 0.05, camera: 0.18 } as const;
/** How far his fingers fan on her breasts (1 as they rest): wide, as KP draws them. */
const GRIP_SPREAD = 3;
/** How big a guest's hand is next to hers. */
const HAND_TO_HERS = 1.15;

/**
 * A guest's right arm, cut out of their own model as it stands: every triangle that moves with the upper arm
 * or forearm, skin and sleeve alike, at its true size, in the forearm bone's own space with the hand toward
 * -Y, its mitten of a hand swapped for a built one (HAND). It can close its fingers (`curl`) toward the palm (+X).
 */
export interface Arm {
  group: Group;
  /** Where the palm is, in the arm's own space. */
  palm: Vector3;
  /** Closes the fingers, from 0 (open) to 1 (a fist). */
  curl(amount: number): void;
  /** The built hand's pieces (palm, finger bones, thumb), for drawing and inking. The palm is the first. */
  hand: Mesh[];
  /** What of it presses into her: the palm (first) and fingers. His thumb only rests on her: denting her too, it
   * crumpled her skin in her cleavage, where it lies. */
  grip: Mesh[];
  /** Its four fingers, each bent on its own (0 open, 1 closed) and with a point at its tip: for gripping her. */
  fingers: { bend(amount: number): void; tip: Object3D }[];
  /** Its thumb, bent the same way (0 out from the hand, 1 closed across the palm). */
  thumb: { bend(amount: number): void; tip: Object3D } | null;
  /** Fans the fingers apart: 1 as they rest, more spread wide as KP's hands are on her breasts. */
  spread(amount: number): void;
  /** Pinches: thumb and index finger closing together (0 apart, 1 tight), the other fingers curled under. */
  pinch(amount: number): void;
}

export function cutArm(model: Object3D, name: string): Arm {
  const fore = model.getObjectByName(`${name}_ForeArm_R`);
  const upper = model.getObjectByName(`${name}_UpperArm_R`);
  const group = new Group();
  const none: Arm = { group, palm: new Vector3(0, -0.25, 0), curl: () => {}, hand: [], grip: [], fingers: [], thumb: null, spread: () => {}, pinch: () => {} };
  if (!fore || !upper) return none;
  model.updateMatrixWorld(true);
  const toArm = fore.matrixWorld.clone().invert();
  const v = new Vector3();
  const parts: { geometry: BufferGeometry; positions: Float32Array; kept: number[]; mesh: Mesh }[] = [];
  // The mitten's points (moving with the forearm alone), with the piece and texture spot each is on.
  const handPoints: { at: Vector3; part: number; u: number; v: number; material: Material | Material[] }[] = [];
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    const geometry = object.geometry;
    const position = geometry.getAttribute("position");
    const indices = geometry.getAttribute("skinIndex");
    const weights = geometry.getAttribute("skinWeight");
    const bones = object.skeleton.bones;
    const foreIndex = bones.indexOf(fore as never);
    const upperIndex = bones.indexOf(upper as never);
    if (foreIndex < 0 || !indices || !weights) return;
    object.skeleton.update();
    const weightOf = (i: number, wanted: number[]) => {
      let w = 0;
      for (let k = 0; k < 4; k++) if (wanted.includes(indices.getComponent(i, k))) w += weights.getComponent(i, k);
      return w;
    };
    const index = geometry.getIndex();
    const triangles = index ? index.count / 3 : position.count / 3;
    const vertexAt = (t: number, c: number) => (index ? index.getX(t * 3 + c) : t * 3 + c);
    const arm = [foreIndex, upperIndex];
    // Keep each shared vertex once, so the cut stays smooth-shaded.
    const renumber = new Map<number, number>();
    const kept: number[] = [];
    for (let t = 0; t < triangles; t++) {
      const corners = [vertexAt(t, 0), vertexAt(t, 1), vertexAt(t, 2)];
      if (!corners.every((c) => weightOf(c, arm) >= ARM_WEIGHT)) continue;
      for (const c of corners) {
        if (!renumber.has(c)) renumber.set(c, renumber.size);
        kept.push(renumber.get(c)!);
      }
    }
    if (kept.length === 0) return;
    const positions = new Float32Array(renumber.size * 3);
    const uv = geometry.getAttribute("uv");
    const uvs = uv ? new Float32Array(renumber.size * 2) : null;
    for (const [old, i] of renumber) {
      // Where the vertex is now, posed, then in the forearm's own space.
      object.applyBoneTransform(old, v.fromBufferAttribute(position, old));
      v.applyMatrix4(object.matrixWorld).applyMatrix4(toArm);
      positions.set([v.x, v.y, v.z], i * 3);
      if (weightOf(old, [foreIndex]) >= 0.6) handPoints.push({ at: v.clone(), part: parts.length, u: uv ? uv.getX(old) : 0, v: uv ? uv.getY(old) : 0, material: object.material });
      if (uv && uvs) uvs.set([uv.getX(old), uv.getY(old)], i * 2);
    }
    const cut = new BufferGeometry();
    cut.setAttribute("position", new BufferAttribute(positions, 3));
    if (uvs) cut.setAttribute("uv", new BufferAttribute(uvs, 2));
    cut.setIndex(kept);
    cut.computeVertexNormals();
    const mesh = new Mesh(cut, object.material);
    parts.push({ geometry: cut, positions, kept, mesh });
    group.add(mesh);
  });
  if (handPoints.length === 0) return none;

  // The fingertips are the far end of the forearm; the knuckles a finger's length back; the palm just behind.
  const tips = Math.min(...handPoints.map((p) => p.at.y));
  const knuckles = tips + FINGER;
  const inPalm = handPoints.filter((p) => p.at.y < knuckles + FINGER * 0.9 && p.at.y >= knuckles);
  const palmPoints = inPalm.map((p) => p.at);
  const palm = palmPoints.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(Math.max(1, palmPoints.length));
  const wrist = tips + FINGER / HAND.palm;
  const length = wrist - tips;

  // Off with the mitten, at the wrist.
  for (const { geometry, positions, kept } of parts) {
    const left: number[] = [];
    for (let t = 0; t < kept.length; t += 3) {
      if (Math.min(positions[kept[t] * 3 + 1], positions[kept[t + 1] * 3 + 1], positions[kept[t + 2] * 3 + 1]) < wrist) continue;
      left.push(kept[t], kept[t + 1], kept[t + 2]);
    }
    geometry.setIndex(left);
  }
  for (const part of [...parts]) {
    if ((part.geometry.getIndex()?.count ?? 0) > 0) continue;
    group.remove(part.mesh);
    parts.splice(parts.indexOf(part), 1);
  }

  // The skin it's made of: the mitten's own material, every point of it on the mitten's skin colour.
  const tally = new Map<number, number>();
  for (const p of inPalm) tally.set(p.part, (tally.get(p.part) ?? 0) + 1);
  const skinPart = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? handPoints[0].part;
  const onSkin = inPalm.filter((p) => p.part === skinPart);
  const skinU = onSkin.reduce((sum, p) => sum + p.u, 0) / Math.max(1, onSkin.length);
  const skinV = onSkin.reduce((sum, p) => sum + p.v, 0) / Math.max(1, onSkin.length);
  const worn = (onSkin[0] ?? handPoints[0]).material;
  const skin = Array.isArray(worn) ? worn[0] : worn;

  // As wide and thick as the mitten was, within a hand's proportions.
  const across = (axis: "x" | "z") => {
    const values = palmPoints.map((p) => p[axis]);
    return values.length ? Math.max(...values) - Math.min(...values) : 0;
  };
  const width = MathUtils.clamp(across("z"), length * 0.42, length * 0.56);
  const thick = MathUtils.clamp(across("x"), length * 0.14, length * 0.2);
  const radius = width / 9.6;
  const fingerLength = length * (1 - HAND.palm);
  const hand: Mesh[] = [];
  // A finger bone: a tube from its joint (at 0) to the next (at -long), thick r0 tapering to r1, rounded at each end
  // so the bones run on into one another, a little flatter front to back than across.
  const bone = (r0: number, r1: number, long: number, parent: Object3D) => {
    const sections: Section[] = [];
    for (let i = 1; i <= 7; i++) {
      const turn = (i * Math.PI) / 8;
      const r = i <= 4 ? r0 : r1;
      const round = r * Math.sin(turn);
      sections.push({ y: (i <= 4 ? 0 : -long) + r * Math.cos(turn), x: 0, z: 0, rx: round * 0.88, rz: round, square: 2.2 });
    }
    const end = 1 - Math.cos(Math.PI / 8);
    const mesh = new Mesh(loft(sections, 10, r0 * end, r1 * end, skinU, skinV), skin);
    parent.add(mesh);
    hand.push(mesh);
    return mesh;
  };

  // His forearm's open end where the mitten came off: its last ring of points, on his skin.
  let ring: { y: number; x: number; z: number; rx: number; rz: number } | null = null;
  for (const { positions, geometry, mesh } of parts) {
    const worn = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (worn !== skin) continue;
    const used = [...new Set(geometry.getIndex()?.array ?? [])];
    if (used.length < 3) continue;
    const lowest = Math.min(...used.map((i) => positions[i * 3 + 1]));
    const end = used.filter((i) => positions[i * 3 + 1] < lowest + length * 0.04);
    if (end.length < 3) continue;
    const xs = end.map((i) => positions[i * 3]);
    const zs = end.map((i) => positions[i * 3 + 2]);
    ring = {
      y: lowest,
      x: (Math.max(...xs) + Math.min(...xs)) / 2,
      z: (Math.max(...zs) + Math.min(...zs)) / 2,
      rx: (Math.max(...xs) - Math.min(...xs)) / 2,
      rz: (Math.max(...zs) - Math.min(...zs)) / 2,
    };
  }

  // The palm and wrist, one piece: from just inside his forearm's open end, narrowing at the wrist, out over the
  // heel of his hand (the mound under his thumb) and flattening to the knuckles, rounded off there.
  const palmTop = wrist + length * 0.06;
  const palmBottom = tips + fingerLength - radius * 0.6;
  const half = { rx: thick / 2, rz: width / 2 };
  const from = ring ?? { y: palmTop + length * 0.12, x: palm.x - thick * 0.6, z: palm.z, rx: thick * 0.9, rz: width * 0.42 };
  const mid = (a: number, b: number, t: number) => a + (b - a) * t;
  const palmSections: Section[] = [
    { y: from.y + length * 0.05, x: from.x, z: from.z, rx: from.rx * 0.9, rz: from.rz * 0.9, square: 2 },
    { y: from.y, x: from.x, z: from.z, rx: from.rx, rz: from.rz, square: 2 },
    {
      y: mid(from.y, palmTop, 0.5),
      x: mid(from.x, palm.x, 0.45),
      z: mid(from.z, palm.z, 0.5),
      rx: mid(from.rx, half.rx * 1.2, 0.5) * 0.9,
      rz: mid(from.rz, half.rz * 0.84, 0.5) * 0.86,
      square: 2.3,
    },
    { y: palmTop, x: palm.x, z: palm.z, rx: half.rx * 1.2, rz: half.rz * 0.86, square: 2.6, mound: 1 },
    { y: mid(palmTop, palmBottom, 0.45), x: palm.x, z: palm.z, rx: half.rx * 1.02, rz: half.rz * 0.98, square: 2.9, mound: 0.6 },
    { y: mid(palmTop, palmBottom, 0.85), x: palm.x, z: palm.z, rx: half.rx * 0.92, rz: half.rz, square: 3 },
  ];
  const knuckleEnd = palmSections[palmSections.length - 1];
  for (let i = 1; i <= 3; i++) {
    const turn = (i * Math.PI) / 8;
    palmSections.push({ ...knuckleEnd, y: knuckleEnd.y - half.rx * 1.1 * Math.sin(turn), rx: knuckleEnd.rx * Math.cos(turn), rz: knuckleEnd.rz * (0.5 + 0.5 * Math.cos(turn)) });
  }
  // In two: his wrist (into his forearm), and his palm from the wrist down, which alone rests on her. (His wrist
  // isn't part of his hand pressing on her: on a small breast it's by her chest.)
  const wristMesh = new Mesh(loft(palmSections.slice(0, 3), 16, 0, 0, skinU, skinV), skin);
  group.add(wristMesh);
  const palmMesh = new Mesh(loft(palmSections.slice(2), 16, 0, 0, skinU, skinV), skin);
  group.add(palmMesh);
  hand.push(palmMesh);

  // The fingers, index (thumb side) to little, splayed a touch at rest; each three bones that bend toward the palm.
  const joints: { joint: Group; share: number }[] = [];
  const fans: { root: Group; fan: number }[] = [];
  const fingers: Arm["fingers"] = [];
  HAND.fingers.forEach((share, f) => {
    const own: { joint: Group; share: number }[] = [];
    const offset = (1.5 - f) * THUMB_SIDE * width * 0.24;
    const root = new Group();
    root.position.set(palm.x + thick * 0.08, palmBottom + radius * 0.5, palm.z + offset);
    const fan = (-offset / (width * 0.36)) * HAND.splay;
    root.rotation.x = fan;
    fans.push({ root, fan });
    group.add(root);
    let parent: Group = root;
    HAND.bones.forEach((part, b) => {
      const long = fingerLength * share * part;
      // Thicker at the knuckle, tapering bone by bone to the tip.
      bone(radius * (b === 0 ? 1.06 : 1 - b * 0.08), radius * (1 - (b + 1) * 0.08), long, parent);
      joints.push({ joint: parent, share: HAND.bend[b] });
      own.push({ joint: parent, share: HAND.bend[b] });
      const next = new Group();
      next.position.y = -long;
      parent.add(next);
      parent = next;
    });
    const tip = new Group();
    tip.position.y = -radius;
    parent.add(tip);
    fingers.push({
      tip,
      bend: (amount) => {
        const bend = HAND.rest + amount * (CURL - HAND.rest);
        for (const { joint, share: part } of own) joint.rotation.z = bend * part;
      },
    });
  });

  // The thumb: from the heel of the palm on the thumb side, out and down, toward the palm.
  const thumbRoot = new Group();
  thumbRoot.position.set(palm.x + thick * 0.22, wrist - length * 0.12, palm.z + THUMB_SIDE * width * 0.4);
  group.add(thumbRoot);
  const thumbTip = new Group();
  const grip = hand.slice();
  bone(radius * 1.25, radius * 1.1, fingerLength * HAND.thumb[0], thumbRoot);
  thumbTip.position.y = -fingerLength * HAND.thumb[0];
  thumbRoot.add(thumbTip);
  bone(radius * 1.1, radius * 0.9, fingerLength * HAND.thumb[1], thumbTip);
  const thumbEnd = new Group();
  thumbEnd.position.y = -fingerLength * HAND.thumb[1] - radius;
  thumbTip.add(thumbEnd);
  const bendThumb = (amount: number) => {
    thumbRoot.rotation.set(-THUMB_SIDE * HAND.thumbOut * (1 - amount * 0.6), 0, 0.35 + amount * 0.5);
    thumbTip.rotation.z = 0.2 + amount * 0.7;
  };

  const curl = (amount: number) => {
    const bend = HAND.rest + amount * (CURL - HAND.rest);
    for (const { joint, share } of joints) joint.rotation.z = bend * share;
    // Closing, the fingers draw together.
    for (const { root, fan } of fans) root.rotation.x = fan * (1 - amount * 0.7);
    bendThumb(amount);
  };
  curl(0);
  const spread = (amount: number) => {
    for (const { root, fan } of fans) root.rotation.x = fan * amount;
  };
  // A pinch: his thumb turned across to meet his index finger (opposed, as a real thumb is, not just bent toward
  // the palm), the finger bent until there's a nipple's width between their tips, less as he squeezes.
  const pinch = (amount: number) => {
    fingers.forEach((finger, f) => f > 0 && finger.bend(PINCH.curled));
    for (const { root, fan } of fans) root.rotation.x = fan * PINCH.spread;
    thumbRoot.rotation.set(0, 0, 0);
    thumbTip.rotation.set(0, 0, PINCH.thumbTip);
    group.updateMatrixWorld(true);
    // How far his thumb reaches, root to tip, and which way it points with its root unturned.
    const end = thumbRoot.worldToLocal(thumbEnd.getWorldPosition(new Vector3()));
    const reach = end.length();
    const gap = radius * (PINCH.gap[0] - PINCH.gap[1] * amount);
    const index = fingers[0];
    const indexTip = () => {
      group.updateMatrixWorld(true);
      return group.worldToLocal(index.tip.getWorldPosition(new Vector3()));
    };
    let low = 0;
    let high = 1;
    for (let step = 0; step < 8; step++) {
      const mid = (low + high) / 2;
      index.bend(mid);
      if (indexTip().distanceTo(thumbRoot.position) > reach + gap) low = mid;
      else high = mid;
    }
    index.bend(low);
    thumbRoot.quaternion.setFromUnitVectors(end.normalize(), indexTip().sub(thumbRoot.position).normalize());
  };
  return { group, palm, curl, hand, grip, fingers, thumb: { bend: bendThumb, tip: thumbEnd }, spread, pinch };
}

/**
 * One cross-section of a built hand piece, in its own space (the hand toward -Y): at height `y`, centred on (x, z),
 * half as thick (X, palm to back) and wide (Z) as `rx` and `rz`, and how square (2 round, higher squarer). `mound`
 * swells it on the palm side toward the thumb: the heel of his hand under his thumb.
 */
interface Section {
  y: number;
  x: number;
  z: number;
  rx: number;
  rz: number;
  square: number;
  mound?: number;
}

/**
 * A closed tube through `sections` (top to bottom), `around` points round each, shut at each end with a point
 * `top` above the first and `bottom` below the last. Every point on the skin colour at (u, v).
 */
function loft(sections: Section[], around: number, top: number, bottom: number, u: number, v: number): BufferGeometry {
  const count = sections.length * around + 2;
  const positions = new Float32Array(count * 3);
  sections.forEach((s, r) => {
    const e = 2 / s.square;
    for (let a = 0; a < around; a++) {
      const turn = (a / around) * Math.PI * 2;
      const c = Math.cos(turn);
      const n = Math.sin(turn);
      const swell = 1 + (s.mound ?? 0) * 0.45 * Math.max(0, c * 0.6 + n * THUMB_SIDE * 0.8) ** 2;
      const i = (r * around + a) * 3;
      positions[i] = s.x + Math.sign(c) * Math.abs(c) ** e * s.rx * swell;
      positions[i + 1] = s.y;
      positions[i + 2] = s.z + Math.sign(n) * Math.abs(n) ** e * s.rz * swell;
    }
  });
  const first = sections[0];
  const last = sections[sections.length - 1];
  const ends = sections.length * around;
  positions.set([first.x, first.y + top, first.z, last.x, last.y - bottom, last.z], ends * 3);
  const index: number[] = [];
  for (let r = 0; r + 1 < sections.length; r++) {
    for (let a = 0; a < around; a++) {
      const p = r * around + a;
      const q = r * around + ((a + 1) % around);
      index.push(p, q, p + around, q, q + around, p + around);
    }
  }
  for (let a = 0; a < around; a++) {
    const b = (a + 1) % around;
    index.push(ends, b, a);
    index.push(ends + 1, ends - around + a, ends - around + b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(count * 2).map((_, i) => (i % 2 ? v : u)), 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The front of each of her breasts as she stands, in her model's space, found on whatever she has on over them (her
 * skin, or her top): the middle of the most forward part of each, and which way is out of it. However her sliders
 * have made her, the hands land on her breasts. Null if she has no breasts to speak of.
 */
function breastFronts(
  model: Object3D,
  name: string,
  middle: number,
  skinOnly = true,
): { point: Vector3; out: Vector3; centre: Vector3; points: Vector3[] }[] | null {
  const bust = model.getObjectByName(`${name}_Bust`);
  if (!bust) return null;
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const sides: Vector3[][] = [[], []];
  const v = new Vector3();
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    // Her own skin: a top rolled down under her breasts sticks out further than they do, and would mislead it.
    if (skinOnly && !object.name.startsWith(`${name}_Body`)) return;
    // Not her areolae: a bigger nipple standing out would move where his hands take hold (over her nipples).
    const worn = Array.isArray(object.material) ? object.material[0] : object.material;
    if (worn.name === DISC_MATERIAL) return;
    const index = object.skeleton.bones.indexOf(bust as never);
    const indices = object.geometry.getAttribute("skinIndex");
    const weights = object.geometry.getAttribute("skinWeight");
    const position = object.geometry.getAttribute("position");
    if (index < 0 || !indices || !weights) return;
    object.skeleton.update();
    for (let i = 0; i < position.count; i++) {
      let w = 0;
      for (let k = 0; k < 4; k++) if (indices.getComponent(i, k) === index) w += weights.getComponent(i, k);
      if (w < 0.5) continue;
      object.applyBoneTransform(i, v.fromBufferAttribute(position, i));
      v.applyMatrix4(object.matrixWorld).applyMatrix4(toModel);
      sides[v.x < middle ? 0 : 1].push(v.clone());
    }
  });
  if (sides.some((side) => side.length < 8)) return skinOnly ? breastFronts(model, name, middle, false) : null;
  return sides.map((side) => {
    const centre = side.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(side.length);
    const front = Math.min(...side.map((p) => p.z));
    const tip = side.filter((p) => p.z < front + 0.02);
    const point = tip.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(tip.length);
    return { point, out: point.clone().sub(centre).normalize(), centre, points: side };
  });
}

/**
 * The tip of each of her nipples as she stands, in her model's space, left of `middle` first: the point of each of
 * her nipple discs (DISC_MATERIAL) standing furthest out from her breast (or with none, the breast's front), lifted
 * out over anything she has on over it.
 */
function nippleTips(model: Object3D, name: string, middle: number, fronts: { point: Vector3; centre: Vector3; out: Vector3 }[]): Vector3[] {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const sideOf = (at: Vector3) => (at.x < middle ? 0 : 1);
  const front = [0, 1].map((side) => fronts.find((f) => sideOf(f.point) === side) ?? fronts[0]);
  const discs: Vector3[][] = [[], []];
  const v = new Vector3();
  const near2 = NIPPLE_NEAR ** 2;
  // Her nipple discs, even under her clothes: only their points by the front of each breast (the mesh has others).
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.name.startsWith(`${name}_Body`)) return;
    const worn = Array.isArray(object.material) ? object.material[0] : object.material;
    if (worn.name !== DISC_MATERIAL) return;
    object.skeleton.update();
    const position = object.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      object.applyBoneTransform(i, v.fromBufferAttribute(position, i));
      v.applyMatrix4(object.matrixWorld).applyMatrix4(toModel);
      const side = sideOf(v);
      if (v.distanceToSquared(front[side].point) <= near2) discs[side].push(v.clone());
    }
  });
  // Each nipple's way out: from the middle of the breast through the middle of its areola; its tip, the point of the
  // disc standing furthest out that way. With no disc, the breast's front and its way out.
  const outs = discs.map((disc, side) => {
    if (disc.length < 3) return front[side].out.clone();
    const mid = disc.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(disc.length);
    return mid.sub(front[side].centre).normalize();
  });
  const at = discs.map((disc, side) =>
    disc.length < 3 ? front[side].point.clone() : disc.reduce((best, p) => (p.dot(outs[side]) > best.dot(outs[side]) ? p : best)).clone(),
  );
  // Over whatever she has on: out along the nipple to the outermost of anything over it, so dressed his fingers pinch
  // her top where it tents over it, not through it.
  const over = [0, 0];
  const across2 = NIPPLE_OVER ** 2;
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    const worn = Array.isArray(object.material) ? object.material[0] : object.material;
    if (worn.name === DISC_MATERIAL) return;
    object.skeleton.update();
    const position = object.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      object.applyBoneTransform(i, v.fromBufferAttribute(position, i));
      v.applyMatrix4(object.matrixWorld).applyMatrix4(toModel);
      const side = sideOf(v);
      v.sub(at[side]);
      const up = v.dot(outs[side]);
      if (up > over[side] && up < NIPPLE_OVER_MOST && v.lengthSq() - up * up < across2) over[side] = up;
    }
  });
  return at.map((tip, side) => tip.addScaledVector(outs[side], over[side]));
}

/** How far out over a nipple (in metres at her build) her clothes can stand: anything further is something else. */
const NIPPLE_OVER_MOST = 0.02;
/** How far from the front of a breast (in metres at her build) its nipple disc's points are looked for. */
const NIPPLE_NEAR = 0.05;
/** How far to either side of a nipple (in metres at her build) something over it counts as covering it. */
const NIPPLE_OVER = 0.012;

/**
 * Her breasts' skin as she stands, for squeezing: every point the Bust bone moves, on every piece of her (she's
 * split by material, and the pieces meet at seams), welded where the pieces meet so a squeeze moves them as one
 * and the seams never open. The meshes must be her copy's own, not shared with the room.
 */
function softSkin(model: Object3D, bust: Object3D, bodyOf: string | null = null): SoftSkin | null {
  model.updateMatrixWorld(true);
  const v = new Vector3();
  const sum = new Matrix4();
  const bone = new Matrix4();
  const linear = new Matrix4();
  const pieces: SoftPiece[] = [];
  // The welded points: where each is, how much the Bust bone moves it, and the key it's found by.
  const posed: number[] = [];
  const weight: number[] = [];
  const keyed = new Map<string, number>();
  const links: Set<number>[] = [];
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    // Her top pulled down off her breasts is rolled up under them: it stays where it's rolled, not squeezed with them.
    if (bodyOf && !object.name.startsWith(`${bodyOf}_Body`)) return;
    const { skeleton, geometry } = object;
    const bustIndex = skeleton.bones.indexOf(bust as never);
    const indices = geometry.getAttribute("skinIndex");
    const weights = geometry.getAttribute("skinWeight");
    const position = geometry.getAttribute("position");
    if (bustIndex < 0 || !indices || !weights || !skeleton.boneMatrices) return;
    skeleton.update();
    const picked: number[] = [];
    const points: number[] = [];
    const back: number[] = [];
    const local = new Int32Array(position.count).fill(-1);
    for (let i = 0; i < position.count; i++) {
      let w = 0;
      for (let k = 0; k < 4; k++) if (indices.getComponent(i, k) === bustIndex) w += weights.getComponent(i, k);
      if (w < 0.15) continue;
      object.applyBoneTransform(i, v.fromBufferAttribute(position, i));
      v.applyMatrix4(object.matrixWorld);
      // Welded to any point of another piece within half a millimetre.
      const key = `${Math.round(v.x * 2000)},${Math.round(v.y * 2000)},${Math.round(v.z * 2000)}`;
      let point = keyed.get(key);
      if (point === undefined) {
        point = weight.length;
        keyed.set(key, point);
        posed.push(v.x, v.y, v.z);
        weight.push(0);
        links.push(new Set());
      }
      weight[point] = Math.max(weight[point], Math.min(1, w * 1.4));
      local[i] = picked.length;
      picked.push(i);
      points.push(point);
      // The point's own skinning, mesh to scene: the blend of its bones' matrices, between the bind matrices.
      sum.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const bw = weights.getComponent(i, k);
        if (bw === 0) continue;
        bone.fromArray(skeleton.boneMatrices, indices.getComponent(i, k) * 16);
        for (let e = 0; e < 16; e++) sum.elements[e] += bone.elements[e] * bw;
      }
      linear.copy(object.matrixWorld).multiply(object.bindMatrixInverse).multiply(sum).multiply(object.bindMatrix);
      // Scene to mesh, row by row (Matrix3 is column by column; inverted then transposed, it reads as rows).
      back.push(...new Matrix3().setFromMatrix4(linear).invert().transpose().elements);
    }
    if (!picked.length) return;
    // Edges between welded points, from this piece's triangles; and the triangles that touch them, for shading.
    const triangles = geometry.getIndex();
    const count = triangles ? triangles.count : position.count;
    const welded = new Int32Array(position.count).fill(-1);
    picked.forEach((i, n) => (welded[i] = points[n]));
    const touching: number[] = [];
    for (let t = 0; t + 2 < count; t += 3) {
      const ids = [0, 1, 2].map((c) => (triangles ? triangles.getX(t + c) : t + c));
      const corner = ids.map((i) => welded[i]);
      if (corner.some((c) => c >= 0)) touching.push(...ids);
      for (let a = 0; a < 3; a++)
        for (let b = 0; b < 3; b++) if (a !== b && corner[a] >= 0 && corner[b] >= 0 && corner[a] !== corner[b]) links[corner[a]].add(corner[b]);
    }
    pieces.push({
      mesh: object,
      rest: (position.array as Float32Array).slice(),
      restNormal: ((geometry.getAttribute("normal")?.array as Float32Array | undefined) ?? new Float32Array(position.count * 3)).slice(),
      index: Uint32Array.from(picked),
      point: Uint32Array.from(points),
      back: Float32Array.from(back),
      triangles: Uint32Array.from(touching),
      welded,
    });
  });
  if (!pieces.length) return null;
  const aroundStart = new Uint32Array(links.length + 1);
  links.forEach((set, j) => (aroundStart[j + 1] = aroundStart[j] + set.size));
  const around = new Uint32Array(aroundStart[links.length]);
  links.forEach((set, j) => around.set([...set], aroundStart[j]));
  // Her areolae ride her skin: each of their points on the nearest few of the skin's.
  const onDisc = new Set<number>();
  const onSkin = new Set<number>();
  for (const piece of pieces) {
    const worn = Array.isArray(piece.mesh.material) ? piece.mesh.material[0] : piece.mesh.material;
    for (const point of piece.point) (worn.name === DISC_MATERIAL ? onDisc : onSkin).add(point);
  }
  const skinPoints = [...onSkin];
  const riders: SoftSkin["riders"] = [];
  for (const point of onDisc) {
    if (onSkin.has(point)) continue;
    const near: { at: number; far: number }[] = [];
    for (const at of skinPoints) {
      const far = (posed[at * 3] - posed[point * 3]) ** 2 + (posed[at * 3 + 1] - posed[point * 3 + 1]) ** 2 + (posed[at * 3 + 2] - posed[point * 3 + 2]) ** 2;
      if (near.length < RIDE_ON || far < near[near.length - 1].far) {
        near.push({ at, far });
        near.sort((a, b) => a.far - b.far);
        if (near.length > RIDE_ON) near.pop();
      }
    }
    if (!near.length) continue;
    const weights = near.map(({ far }) => 1 / (Math.sqrt(far) + 1e-4));
    const total = weights.reduce((a, b) => a + b, 0);
    riders.push({ point, on: Uint32Array.from(near.map(({ at }) => at)), weights: Float32Array.from(weights.map((w) => w / total)) });
  }
  const disc = new Uint8Array(weight.length);
  for (const point of onDisc) disc[point] = 1;
  return { pieces, posed: Float32Array.from(posed), weight: Float32Array.from(weight), aroundStart, around, disc, riders };
}

/** The cut-ins that knead or pinch her breasts: their hands find her breasts, and her breasts squish under them. */
const ON_BREASTS: ReadonlySet<CutKind> = new Set<CutKind>(["breasts", "nipples"]);

export interface TouchShow {
  region: TouchRegion;
  answer: TouchAnswer;
  /** The touch, for the words lettered over it. */
  id: string;
  kind: GuestKind;
  /** No hand comes in: the shot is of her alone (her own move in a duel, or where a man finished). */
  noHand?: boolean;
  /** Stays up on the moment, hand still on her, until the next one or clear(): a duel's battle picture. */
  hold?: boolean;
  /**
   * A brawl, not a touch: these words lettered over it instead (the hit, then her voice; either may be empty),
   * no blush and no heart, and with `fist` the guest's hand comes in as a closed fist.
   */
  words?: { hit: string; voice: string };
  fist?: boolean;
  /** How bold the touch was, 1 to 10: a bolder one works her up more. */
  level?: number;
  /** How worked up she is, 0 to 1, when it's known outright (a duel's state); otherwise worked out from the touch. */
  heat?: number;
  /** A Karryn-style cut-in to play (cutin.ts); without it, a touch that lands picks its own (`cutKindFor`). */
  cut?: CutKind;
  /** How hard: a spank's 1 to 3 (KP's three), or her coming's 1 or 2. Worked out from `level` when left out. */
  strength?: number;
  /**
   * The game has just moved her clothes on her own model for this moment (her top pulled down off her breasts):
   * the panel takes its own copy of her shape, so the room's model can go straight back.
   */
  ownCloth?: boolean;
}

/** The panel's own picture at one size: what it renders into and the effects canvas over it. */
interface Surface {
  width: number;
  height: number;
  target: WebGLRenderTarget;
  pixels: Uint8Array;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  image: ImageData;
  fx: ComicFx;
  /** A blotchy paint texture for the backdrop, -1 to 1 a pixel, like KP's mottled cut-in backgrounds. */
  mottle: Float32Array;
  /** Where his hands show, not hidden behind her: white there (rendered flat), for the ink round them. */
  mask: WebGLRenderTarget;
  maskPixels: Uint8Array;
}

function makeSurface(format: CutFormat, scale = 1): Surface {
  const width = FORMATS[format].width * scale;
  const height = FORMATS[format].height * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const mottle = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // The same blotches at any scale.
      const sx = x / scale;
      const sy = y / scale;
      const cell = Math.sin(Math.floor(sx / 3) * 12.9898 + Math.floor(sy / 3) * 78.233) * 43758.5453;
      mottle[y * width + x] =
        Math.sin(sx * 0.11 + Math.sin(sy * 0.07) * 2.2) * 0.45 + Math.sin(sy * 0.09 + sx * 0.04) * 0.3 + (cell - Math.floor(cell) - 0.5) * 0.5;
    }
  }
  return {
    width,
    height,
    target: new WebGLRenderTarget(width, height),
    pixels: new Uint8Array(width * height * 4),
    canvas,
    ctx,
    image: ctx.createImageData(width, height),
    fx: new ComicFx(width, height),
    mottle,
    mask: new WebGLRenderTarget(width, height),
    maskPixels: new Uint8Array(width * height * 4),
  };
}

/** One of his hands (or hers, stroking him) on her: its arm, and where it comes from and lands. */
interface HandRig {
  group: Group;
  arm: Arm;
  /** Where its palm is, in the arm's own space. */
  palm: Vector3;
  contact: Vector3;
  start: Vector3;
  /** Which way is out of her at the touch, so the palm lies on her. */
  normal: Vector3;
  /** A left hand: the right arm mirrored, coming in from the panel's right. */
  mirror: boolean;
  /** Seconds it comes in after the first hand. */
  delay: number;
  /** Where in its loop it starts, so two hands knead in turn. */
  phase: number;
  /** Away from her middle, for spreading her. */
  out: Vector3;
  /** How hard it's squeezing her now, 0 to 1: her breast squishes under it. */
  press: number;
  /** Which way its fingers lie along her, and how far it's settled onto her (0 reaching, 1 on her). */
  fingers: Vector3;
  on: number;
  /** Its palm and fingers' points, on her breasts, so her skin gives under them. */
  touch: HandTouch[];
  /** How far his grip has moved along her from where it took hold: her breast goes with it. */
  drag: Vector3;
  /** How far out of her (along `normal`) his hand sits to rest on her skin: eased toward, frame by frame. */
  sit: number;
  /** Where his fingers reach for, if anywhere: up over her breast to her nipple. */
  aim: Vector3 | null;
  /** Pinching her nipple: how far he's pulled it from where it sits, this frame. */
  pull: Vector3;
}

/** One piece of her (a mesh) with points on her breasts: which, the welded point each is, and the turn back into it. */
interface SoftPiece {
  mesh: SkinnedMesh;
  /** The mesh's points as built, all of them, and their normals. */
  rest: Float32Array;
  restNormal: Float32Array;
  /** Which of its points take part, and the welded point each one is. */
  index: Uint32Array;
  point: Uint32Array;
  /** Each one's scene-to-mesh turn (3 by 3, row by row). */
  back: Float32Array;
  /** Its triangles that touch her breasts (three points each), and the welded point of each of its points, or -1. */
  triangles: Uint32Array;
  welded: Int32Array;
}

/**
 * Her breasts' skin, for squeezing like a balloon (KP's petting cut-in): one surface welded across her pieces. Each
 * point: where it was posed when the panel copied her, how much the Bust bone moves it, and the points it shares
 * an edge with (`around[aroundStart[j]]` up to `aroundStart[j + 1]`), for softening the dents.
 */
interface SoftSkin {
  pieces: SoftPiece[];
  posed: Float32Array;
  weight: Float32Array;
  aroundStart: Uint32Array;
  around: Uint32Array;
  /** Which points are on her areolae and nipples (1), not her skin. */
  disc: Uint8Array;
  /**
   * Her areolae and nipples (a disc lying just over her skin, not joined to it): each of their points rides the
   * skin under it, moving as the nearest few points of her skin do (RIDE_ON of them, nearer counting more), so a
   * squeeze never brings her skin up through them or flattens her nipples. Point, then its skin points and weights.
   */
  riders: { point: number; on: Uint32Array; weights: Float32Array }[];
}

/**
 * Across how much of the Bust bone's weight (from, to) her skin's shading goes from her own normals to the ones
 * worked out as she's squeezed: so the edge of her breasts' soft skin leaves no seam.
 */
const SOFT_SHADE = [0.2, 0.7] as const;

/** How many of her skin's points each point of her areola rides on. */
const RIDE_ON = 4;

/** The points of his hand that can press into her (palm and fingers), in each of its meshes. */
interface HandTouch {
  mesh: Mesh;
  index: Uint32Array;
}

/**
 * His hand's points that press into her: points spread over its built palm, fingers and thumb, about HAND_POINTS
 * in all (every vertex of every piece would be thousands, each checked against her skin every frame).
 */
function handTouch(arm: Arm): HandTouch[] {
  const total = arm.grip.reduce((sum, mesh) => sum + mesh.geometry.getAttribute("position").count, 0);
  const step = Math.max(1, Math.ceil(total / HAND_POINTS));
  return arm.grip.map((mesh) => {
    const count = mesh.geometry.getAttribute("position").count;
    const index: number[] = [];
    for (let i = 0; i < count; i += step) index.push(i);
    return { mesh, index: Uint32Array.from(index) };
  });
}

/** About how many points of his hand press into her. */
const HAND_POINTS = 180;

/**
 * The balloon squeeze, in metres on her as built. Her skin gives wherever his actual hand would go into her, so it
 * sinks under his palm and each finger, softened into the skin round it, and swells up round his hand.
 */
const SQUEEZE = {
  /** How far round each point of his hand her skin gives, and how far under it it settles. */
  reach: 0.3,
  margin: 0.06,
  /** The deepest a finger dents her anywhere. */
  most: 0.22,
  /** How much further his fingertips dig in at a full squeeze, and his palm (times its resting sink). */
  dig: 0.14,
  palmIn: 0.3,
  /** How bent his fingers are at most, easing off, and how far they close at a full squeeze, whatever they meet (0
   * open, 1 a fist): so the grip is seen opening and closing. */
  open: 0.4,
  close: 0.9,
  /** Where his squeeze centres: this far from his palm toward his fingertips. */
  middle: 0.5,
  /** How far into her his palm and fingertips sit: a finger's sink, further as he squeezes. */
  sink: 0.07,
  /** How many times the dents are softened into the skin round them, and how much they spread each time. */
  passes: 4,
  spread: 0.75,
  /**
   * The flesh he's pushed aside: how many times the dents are spread out further (plain averaging, to find the skin
   * beside them), and how much the skin just beside a dent swells out, for how much deeper its neighbours went.
   */
  aside: 5,
  swell: 0.5,
  /** His squeeze on the whole breast: how far it flattens under his palm, across how wide, at a full squeeze. */
  squash: 0.16,
  squashWide: 0.62,
  /** The flesh it pushes aside: a ring round his hand (how far out, how wide) bulging out and sliding away. */
  ring: 0.78,
  ringWide: 0.36,
  bulge: 0.08,
  slide: 0.05,
  /** How far back toward her chest his squeeze still reaches. */
  depth: 1.6,
} as const;

/**
 * Which of her skin is her breast, to move as one (by how much the Bust bone holds it): none of it below the first,
 * all of it above the second; her chest round her breasts stays put.
 */
const BREAST_BODY = [0.3, 0.75] as const;

/** Across her cleavage, how far either side of the middle (a share of a breast's size) her skin shades between them. */
const BREAST_BLEND = 0.45;

/**
 * Her breasts as soft bodies: each one a spring (how often it bounces, and how soon it settles, out of critical)
 * that follows his hands with a little lag, so a squeeze lifts it, it overshoots, and it bounces as he lets go.
 */
const BREAST_SPRING = { hz: 6, damping: 0.5 } as const;

/** How she stands for a kiss: side on to the camera and a little toward it, him the mirror of her. */
const KISS_TURN = 1.87;
/** Where his shaft is, in his model's space: from its root to its tip (penis.ts shapes it there, erect). */
const SHAFT_ROOT = new Vector3(0, 1.0, -0.05);
const SHAFT_TIP = new Vector3(0, 1.065, -0.185);

/**
 * The shot between her legs (CutView "between"), in shares of the camera's distance: how far under where it lands
 * it looks (her vulva just above the middle), how far below that and out in front of her the camera stands, and
 * how bright the light from below is.
 */
const BETWEEN = { below: 0.25, low: 0.9, ahead: 0.6, light: 1.4 } as const;
/**
 * His fingertip on her clit (KP's petting clit): how deep it sinks into her (metres at her build, negative: in), how
 * wide its circles are, how far round her clit her skin is drawn after it and how much of its move her skin takes;
 * how bent each finger is (index, middle, ring, little: two out, two curled under) and his thumb.
 */
const CLIT = { sink: -0.001, circle: 0.0045, reach: 0.018, follow: 0.8, bends: [0.12, 0.22, 0.85, 0.85], thumb: 0.55 } as const;
/**
 * His fingers in her (KP's petting pussy): where his hand comes from (shares of the camera's distance: left and down
 * on the panel, and out toward the camera), how far down her opening the hole is (a share of its length from the
 * top), how deep his fingertips sit in her and how much further each push takes them (metres at her build), how far
 * round the hole her skin goes in and out with them and how much of their move it takes, and how bent each finger is
 * (index, middle, ring, little: two in her, two curled) and his thumb (out).
 */
const FINGERING = {
  from: [0.5, 0.6, 0.12],
  down: 0.72,
  sink: -0.004,
  push: 0.01,
  reach: 0.02,
  follow: 0.5,
  bends: [0.08, 0.12, 1, 1],
  thumb: 0.05,
} as const;

/**
 * Spreads her legs (her copy in the panel): each thigh raised forward and swung out to her side by the turns given,
 * in her model's own frame, and her knees bent back.
 */
function spreadLegs(model: Object3D, name: string, legs: { raise: number; out: number; knee: number }): void {
  model.updateMatrixWorld(true);
  const turn = model.getWorldQuaternion(new Quaternion());
  const inWorld = (local: Quaternion) => turn.clone().multiply(local).multiply(turn.clone().invert());
  // Turns a bone by a turn in the world, keeping it on its parent.
  const turnBone = (bone: Object3D, by: Quaternion) => {
    const now = bone.getWorldQuaternion(new Quaternion());
    const parent = bone.parent ? bone.parent.getWorldQuaternion(new Quaternion()) : new Quaternion();
    bone.quaternion.copy(parent.invert().multiply(by.multiply(now)));
    bone.updateMatrixWorld(true);
  };
  const x = new Vector3(1, 0, 0);
  const z = new Vector3(0, 0, 1);
  for (const [side, away] of [["L", -1], ["R", 1]] as const) {
    const thigh = model.getObjectByName(`${name}_Thigh_${side}`);
    const shin = model.getObjectByName(`${name}_Shin_${side}`);
    // Forward is her -Z: a turn about +X raises a leg forward; about Z, out to her side (her left is -X).
    if (thigh) turnBone(thigh, inWorld(new Quaternion().setFromAxisAngle(x, legs.raise).multiply(new Quaternion().setFromAxisAngle(z, away * legs.out))));
    if (shin) turnBone(shin, inWorld(new Quaternion().setFromAxisAngle(x, -legs.knee)));
  }
  model.updateMatrixWorld(true);
}

/** The top of her slit, where her clit is, in the world: the highest point of her inner lips' mesh. Null if she has none. */
function clitPoint(model: Object3D): Vector3 | null {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const v = new Vector3();
  let bestY = -Infinity;
  let best: Vector3 | null = null;
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    const worn = Array.isArray(object.material) ? object.material[0] : object.material;
    if (worn.name !== VULVA_MATERIAL) return;
    object.skeleton.update();
    const position = object.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      object.applyBoneTransform(i, v.fromBufferAttribute(position, i)).applyMatrix4(object.matrixWorld);
      const y = v.clone().applyMatrix4(toModel).y;
      if (y > bestY) {
        bestY = y;
        best = v.clone();
      }
    }
  });
  return best;
}

/**
 * The hole into her, low in her opening, in the world: the middle of her canal's mouth (its rim, where it meets her
 * opening's two sides) at FINGERING.down of the way down it. Null if she has none.
 */
function holePoint(model: Object3D): Vector3 | null {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const v = new Vector3();
  const points: { world: Vector3; y: number }[] = [];
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    const worn = Array.isArray(object.material) ? object.material[0] : object.material;
    if (worn.name !== CANAL_MATERIAL) return;
    object.skeleton.update();
    const position = object.geometry.getAttribute("position");
    const uv = object.geometry.getAttribute("uv");
    for (let i = 0; i < position.count; i++) {
      // Its rim only: the first and last points across it (its u runs from one side down into her and back up).
      const across = uv ? uv.getX(i) : 0;
      if (across > 0.01 && across < 0.99) continue;
      const world = object.applyBoneTransform(i, v.fromBufferAttribute(position, i)).applyMatrix4(object.matrixWorld).clone();
      points.push({ world, y: world.clone().applyMatrix4(toModel).y });
    }
  });
  if (!points.length) return null;
  const top = Math.max(...points.map((p) => p.y));
  const bottom = Math.min(...points.map((p) => p.y));
  const level = top - FINGERING.down * (top - bottom);
  const near = points.filter((p) => Math.abs(p.y - level) <= 0.12 * (top - bottom));
  const from = near.length ? near : points;
  return from.reduce((sum, p) => sum.add(p.world), new Vector3()).divideScalar(from.length);
}

/**
 * How much bigger than life her vulva's drawn on her clit (KP draws it big): her skin swollen smoothly out from its
 * middle, `gain` more at the middle (a share of how far out each point is), fading to nothing by `radius` (metres
 * at her build). (Under 1.25 it never folds over.)
 */
const CLIT_LENS = { radius: 0.065, gain: 0.75 } as const;

/** The middle of her vulva in the world, as she's posed: the mean of her inner lips' points. Null if she has none. */
function vulvaMiddle(model: Object3D): Vector3 | null {
  model.updateMatrixWorld(true);
  const v = new Vector3();
  const sum = new Vector3();
  let count = 0;
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    const worn = Array.isArray(object.material) ? object.material[0] : object.material;
    if (worn.name !== VULVA_MATERIAL) return;
    object.skeleton.update();
    const position = object.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      sum.add(object.applyBoneTransform(i, v.fromBufferAttribute(position, i)).applyMatrix4(object.matrixWorld));
      count++;
    }
  });
  return count ? sum.divideScalar(count) : null;
}

/**
 * Swells her skin round `centre` (in the world), as through a lens: each point of her body's meshes within
 * `radius` moved out from it by `gain` of how far out it is, fully at the middle and smoothly less to nothing at
 * `radius`, so nothing tears. Once, on her copy, as she's posed.
 */
function lensSkin(model: Object3D, centre: Vector3, radius: number, gain: number): void {
  const swell = dragSkin(model, centre, radius, (at, far) => at.clone().sub(centre).multiplyScalar(gain * (1 - far * far) ** 2));
  swell?.move(new Vector3(1, 1, 1));
}

/** Her skin round a point, dragged after something on it (his fingertip on her clit): `move` puts it where the drag has it. */
interface DragSkin {
  move(by: Vector3): void;
}

/**
 * Her skin round `at` (in the world): each point of her body's meshes within `reach`, how much of the drag it takes
 * (all of it at the point, none by `reach`), and the turn from the world back into its mesh as it's skinned.
 */
function dragSkin(model: Object3D, at: Vector3, reach: number, own?: (point: Vector3, far: number) => Vector3): DragSkin | null {
  model.updateMatrixWorld(true);
  const pieces: { mesh: SkinnedMesh; index: Uint32Array; share: Float32Array; back: Float32Array; rest: Float32Array; moves: Float32Array | null }[] = [];
  const v = new Vector3();
  const sum = new Matrix4();
  const bone = new Matrix4();
  const linear = new Matrix4();
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible || !/_Body/.test(object.name)) return;
    const { skeleton, geometry } = object;
    const position = geometry.getAttribute("position");
    const indices = geometry.getAttribute("skinIndex");
    const weights = geometry.getAttribute("skinWeight");
    if (!indices || !weights || !skeleton.boneMatrices) return;
    skeleton.update();
    const index: number[] = [];
    const share: number[] = [];
    const back: number[] = [];
    const moves: number[] = [];
    for (let i = 0; i < position.count; i++) {
      object.applyBoneTransform(i, v.fromBufferAttribute(position, i)).applyMatrix4(object.matrixWorld);
      const far = v.distanceTo(at) / reach;
      if (far > 1) continue;
      index.push(i);
      share.push((1 - far * far) ** 2);
      if (own) moves.push(...own(v, far).toArray());
      sum.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const w = weights.getComponent(i, k);
        if (w === 0) continue;
        bone.fromArray(skeleton.boneMatrices, indices.getComponent(i, k) * 16);
        for (let e = 0; e < 16; e++) sum.elements[e] += bone.elements[e] * w;
      }
      linear.copy(object.matrixWorld).multiply(object.bindMatrixInverse).multiply(sum).multiply(object.bindMatrix);
      back.push(...new Matrix3().setFromMatrix4(linear).invert().elements);
    }
    if (index.length) {
      pieces.push({
        mesh: object,
        index: Uint32Array.from(index),
        share: Float32Array.from(share),
        back: Float32Array.from(back),
        rest: (position.array as Float32Array).slice(),
        moves: own ? Float32Array.from(moves) : null,
      });
    }
  });
  if (!pieces.length) return null;
  const turn = new Matrix3();
  return {
    move(by: Vector3) {
      for (const { mesh, index, share, back, rest, moves } of pieces) {
        const position = mesh.geometry.getAttribute("position") as BufferAttribute;
        const array = position.array as Float32Array;
        index.forEach((i, n) => {
          // Its own move (a lens: scaled by `by`), or its share of the drag.
          if (moves) v.fromArray(moves, n * 3).multiply(by);
          else v.copy(by).multiplyScalar(share[n]);
          v.applyMatrix3(turn.fromArray(back, n * 9));
          array[i * 3] = rest[i * 3] + v.x;
          array[i * 3 + 1] = rest[i * 3 + 1] + v.y;
          array[i * 3 + 2] = rest[i * 3 + 2] + v.z;
        });
        position.needsUpdate = true;
      }
    },
  };
}

/** How many times sharper a close-up (CutIn.closeUp) is drawn than a plain panel. */
const CLOSE_UP_SCALE = 2;

/**
 * KP's skin, for a close-up: her body's skin and areolae smooth (one colour, the average of their texture, not its
 * blocky texels blown up), glossy (highlights from the panel's lights, a clear coat), a soft pink sheen, and a bright
 * rim where her skin turns away from the viewer. On her copy's own meshes only: new materials, the room's untouched.
 */
function paintSkin(model: Object3D, shade: UnderShade): void {
  const painted: Mesh[] = [];
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const worn = object.material as Material | Material[];
    const swap = (material: Material): Material => {
      if (!SKIN_PAINTED.test(material.name)) return material;
      const old = material as Material & { color?: Color; map?: Texture | null };
      // A touch warmer and pinker than the texture's average, as KP paints her.
      const color = averageColor(old.map ?? null).multiply(old.color ?? new Color(1, 1, 1)).offsetHSL(-0.01, SKIN_GLOSS.warmer, -0.02);
      // Inside her, darker: depth, not shine.
      const inside = SKIN_INSIDE.test(material.name);
      if (inside) color.multiplyScalar(SKIN_GLOSS.inside);
      const areola = material.name === DISC_MATERIAL;
      const painted = new MeshPhysicalMaterial({
        name: material.name,
        color,
        // Her inner lips and canal wet: glossier.
        roughness: inside ? SKIN_GLOSS.roughness : SKIN_WET.test(material.name) ? SKIN_GLOSS.wetRoughness : SKIN_GLOSS.roughness,
        clearcoat: inside ? 0 : SKIN_GLOSS.clearcoat,
        clearcoatRoughness: SKIN_WET.test(material.name) ? SKIN_GLOSS.wetCoat : SKIN_GLOSS.clearcoatRoughness,
        sheen: SKIN_GLOSS.sheen,
        sheenColor: new Color(...SKIN_GLOSS.sheenColor),
        sheenRoughness: 0.5,
        emissive: color.clone().multiply(new Color(...SKIN_GLOSS.glow)),
        emissiveIntensity: areola ? 0.12 : 0.05,
      });
      // Drawn in front of what it lies on as the original was (her lips and openings over her skin), or the two fight.
      painted.polygonOffset = material.polygonOffset;
      painted.polygonOffsetFactor = material.polygonOffsetFactor;
      painted.polygonOffsetUnits = material.polygonOffsetUnits;
      painted.alphaTest = material.alphaTest;
      // Her inner lips and canal from both sides: seen from below, past the canal's walls is nothing to see through to.
      painted.side = SKIN_WET.test(material.name) ? DoubleSide : material.side;
      painted.onBeforeCompile = (shader) => {
        // Her painted layers from the Blender bridge (paint.ts), as in the room.
        addPaintTo(shader);
        Object.assign(shader.uniforms, shade);
        shader.vertexShader = `varying vec3 vShadeAt;
${shader.vertexShader}`.replace(
          "#include <project_vertex>",
          `#include <project_vertex>
vShadeAt = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
        );
        // Her breasts' soft shadow on her ribcage under them (and on their own undersides), as KP paints it; then a
        // rim of light where her skin turns away from the viewer: KP's soft bright edge to every curve.
        shader.fragmentShader = `${UNDER_SHADE_GLSL}${shader.fragmentShader}`.replace(
          "#include <dithering_fragment>",
          `float underLit = underShade(vShadeAt, uShadeFrom, uBreasts[0]) * underShade(vShadeAt, uShadeFrom, uBreasts[1]);
gl_FragColor.rgb *= mix(vec3(1.0), vec3(${UNDER_SHADE.tint.map((v) => v.toFixed(2)).join(", ")}), (1.0 - underLit) * ${UNDER_SHADE.dark.toFixed(2)});
float rimLight = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), ${SKIN_GLOSS.rimPower.toFixed(1)});
gl_FragColor.rgb += vec3(${SKIN_GLOSS.rimColor.map((v) => v.toFixed(2)).join(", ")}) * rimLight * ${SKIN_GLOSS.rim.toFixed(2)};
#include <dithering_fragment>`,
        );
      };
      // Her areolae and vulva painted in detail on top, as in the room (skindetail.ts): it builds on the shader above.
      addSkinDetail(painted);
      return painted;
    };
    object.material = Array.isArray(worn) ? worn.map(swap) : swap(worn);
    if ((Array.isArray(worn) ? worn : [worn]).some((material) => SKIN_PAINTED.test(material.name))) painted.push(object);
  });
  smoothShading(painted);
}

/**
 * Shades her skin smooth, not in flat facets: every point's normal the average of all the normals at its spot, across
 * every piece of her skin (so their seams vanish too). Each piece's geometry is made its own first.
 */
function smoothShading(meshes: Mesh[]): void {
  const sums = new Map<string, Vector3>();
  const key = (position: BufferAttribute | InterleavedBufferAttribute, i: number) =>
    `${Math.round(position.getX(i) * 4000)},${Math.round(position.getY(i) * 4000)},${Math.round(position.getZ(i) * 4000)}`;
  const n = new Vector3();
  for (const mesh of meshes) {
    mesh.geometry = mesh.geometry.clone();
    const { geometry } = mesh;
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    for (let i = 0; i < position.count; i++) {
      const k = key(position, i);
      const sum = sums.get(k) ?? new Vector3();
      sum.add(n.fromBufferAttribute(normal, i));
      sums.set(k, sum);
    }
  }
  for (const sum of sums.values()) if (sum.lengthSq() > 1e-12) sum.normalize();
  // Her nipples, lips and openings keep their shapes: averaged at each spot only, not blurred.
  const plain = new Map([...sums].map(([k, sum]) => [k, sum.clone()]));
  // Blurred over her skin's neighbouring points, a few times, so a fold in her low-poly shape (where her breasts
  // meet her chest) shades as a soft curve, not a line. Her areolae keep their own (her nipples stand off them).
  const near = new Map<string, Set<string>>();
  for (const mesh of meshes) {
    if (isAreola(mesh)) continue;
    const position = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.getIndex();
    const corners = index ? index.count : position.count;
    for (let t = 0; t + 2 < corners; t += 3) {
      const ks = [0, 1, 2].map((c) => key(position, index ? index.getX(t + c) : t + c));
      for (const a of ks) for (const b of ks) if (a !== b) (near.get(a) ?? near.set(a, new Set()).get(a)!).add(b);
    }
  }
  for (let pass = 0; pass < NORMAL_BLUR; pass++) {
    const next = new Map<string, Vector3>();
    for (const [k, around] of near) {
      const own = sums.get(k);
      if (!own) continue;
      const blurred = own.clone();
      for (const other of around) {
        const o = sums.get(other);
        if (o) blurred.add(o);
      }
      next.set(k, blurred.normalize());
    }
    for (const [k, blurred] of next) sums.get(k)!.copy(blurred);
  }
  // Her skin's points by where they are (in cells PATCH_EDGE.reach across), for the patches lying over it.
  const cell = (x: number) => Math.floor(x / PATCH_EDGE.reach);
  const skinAt = new Map<string, { at: Vector3; normal: Vector3 }[]>();
  for (const mesh of meshes) {
    if (isAreola(mesh) || isPatch(mesh)) continue;
    const position = mesh.geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const normal = sums.get(key(position, i));
      if (!normal) continue;
      const at = new Vector3().fromBufferAttribute(position, i);
      const c = `${cell(at.x)},${cell(at.y)},${cell(at.z)}`;
      (skinAt.get(c) ?? skinAt.set(c, []).get(c)!).push({ at, normal });
    }
  }
  const skinUnder = (at: Vector3): Vector3 | null => {
    let best: Vector3 | null = null;
    let bestFar = PATCH_EDGE.reach ** 2;
    const [cx, cy, cz] = [cell(at.x), cell(at.y), cell(at.z)];
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let y = cy - 1; y <= cy + 1; y++)
        for (let z = cz - 1; z <= cz + 1; z++)
          for (const point of skinAt.get(`${x},${y},${z}`) ?? []) {
            const far = point.at.distanceToSquared(at);
            if (far < bestFar) {
              bestFar = far;
              best = point.normal;
            }
          }
    return best;
  };
  const at = new Vector3();
  for (const mesh of meshes) {
    const position = mesh.geometry.getAttribute("position");
    const normal = mesh.geometry.getAttribute("normal");
    const patch = isPatch(mesh);
    const whole = patch && PATCH_WHOLE.test((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name);
    const uv = patch && !whole ? mesh.geometry.getAttribute("uv") : null;
    for (let i = 0; i < position.count; i++) {
      const sum = (isAreola(mesh) ? plain : sums).get(key(position, i));
      if (sum && sum.lengthSq() > 1e-12) n.copy(sum).normalize();
      else n.fromBufferAttribute(normal, i);
      if (patch) {
        // A patch over her skin shades as the skin under it (her outer lips only at their edge, their own in their
        // middle: a grid, u across, v along, 0 to 1), so it melts into her.
        const edge = uv ? Math.max(Math.abs(2 * uv.getX(i) - 1), Math.abs(2 * uv.getY(i) - 1)) : 1;
        const under = skinUnder(at.fromBufferAttribute(position, i));
        if (under) n.lerp(under, MathUtils.smoothstep(edge, PATCH_EDGE.from, PATCH_EDGE.to)).normalize();
      }
      normal.setXYZ(i, n.x, n.y, n.z);
    }
    normal.needsUpdate = true;
  }
}

/**
 * Patches over her skin, blurred with it and shaded as the skin under them: her outer lips at their edges (they're
 * a grid, their middle shaped), the skin round her anus all over.
 */
const SKIN_PATCH = /^(T_labia|T_anus_skin)$/;
const PATCH_WHOLE = /^T_anus_skin$/;
const isPatch = (mesh: Mesh) => SKIN_PATCH.test((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name);
/**
 * Where a patch's shading turns to the skin under it: from this far out from its middle (0 middle, 1 edge) to all of
 * it here; and how far off it the skin under it is looked for (metres as built).
 */
const PATCH_EDGE = { from: 0.45, to: 0.9, reach: 0.012 } as const;

/** The shadow under her breasts in a close-up: uniforms shared by her painted skin's shaders (TouchComic.underShade). */
interface UnderShade {
  [uniform: string]: { value: unknown };
  uBreasts: { value: Vector4[] };
  uShadeFrom: { value: Vector3 };
}

/**
 * The soft shadow her breasts cast on her ribcage under them in a close-up, each breast taken as a ball: how big the
 * ball is (a share of the breast's size, so its own top isn't shadowed), how soft the shadow's edge is (higher:
 * harder), how dark it is at most and the colour it darkens toward (warm, as KP's), and how far in front of her the
 * light comes from (0: straight down; 1: as much from the front); and from how far down the ball (a share of its
 * size below its middle) the shadow starts, to where it's whole: low on her breast and under it, not a line across.
 */
const UNDER_SHADE = { fit: 0.9, soft: 1.4, dark: 0.55, tint: [0.62, 0.36, 0.38], ahead: 0.35, low: [0.2, 0.9] } as const;
const UNDER_SHADE_GLSL = `varying vec3 vShadeAt;
uniform vec4 uBreasts[2];
uniform vec3 uShadeFrom;
float underShade(vec3 at, vec3 toLight, vec4 ball) {
  if (ball.w <= 0.0) return 1.0;
  vec3 oc = at - ball.xyz;
  float b = dot(oc, toLight);
  float h = b * b - dot(oc, oc) + ball.w * ball.w;
  float miss = sqrt(max(0.0, ball.w * ball.w - h)) - ball.w;
  float t = -b - sqrt(max(h, 0.0));
  float low = smoothstep(${UNDER_SHADE.low[0].toFixed(2)}, ${UNDER_SHADE.low[1].toFixed(2)}, (ball.y - at.y) / ball.w);
  return t < 0.0 ? 1.0 : mix(1.0, smoothstep(0.0, 1.0, ${UNDER_SHADE.soft.toFixed(1)} * miss / t), low);
}
`;

/** Whether a mesh has shapes of its own (her areolae and nipples, her vulva and anus: SKIN_DETAIL), not blurred. */
const isAreola = (mesh: Mesh) => SKIN_DETAIL.test((Array.isArray(mesh.material) ? mesh.material[0] : mesh.material).name);

/**
 * How many times her skin's shading is blurred over each point's neighbours in a close-up: enough to melt the folds
 * of her low-poly shape (the crease where her breasts meet her chest) into soft curves.
 */
const NORMAL_BLUR = 8;


/** Which of her materials are painted for a close-up: her body's skin and her areolae (not her face's). */
const SKIN_PAINTED = /^(T_skin_f|T_skin|T_areola|T_labia|T_vulva|T_canal|T_anus|T_anus_skin|T_navel)$/;
/** Of those, what's wet (her inner lips, her canal): glossier, and drawn from both sides. */
const SKIN_WET = /^(T_vulva|T_canal)$/;
/** Of those, what's inside her (her canal): darker and without the clear coat, so it reads as depth. */
const SKIN_INSIDE = /^T_canal$/;
/**
 * Of those, what has shapes of its own (nipples, inner lips, openings) that blurring her shading would flatten. Her
 * outer lips and the skin round her anus are blurred with her skin, so they melt into it at their edges.
 */
const SKIN_DETAIL = /^(T_areola|T_vulva|T_canal|T_anus)$/;
/**
 * How her skin is painted in a close-up: how much more saturated than her texture, how rough (low: glossy), its clear coat and how sharp that is, a pink
 * sheen, a warm glow of its own (as light through skin), and the rim's strength, how tight it is and its colour.
 */
const SKIN_GLOSS = {
  inside: 0.6,
  wetRoughness: 0.3,
  wetCoat: 0.18,
  warmer: 0.12,
  roughness: 0.6,
  clearcoat: 0.45,
  clearcoatRoughness: 0.5,
  sheen: 0.3,
  sheenColor: [1, 0.6, 0.6] as [number, number, number],
  glow: [1, 0.5, 0.45] as [number, number, number],
  rim: 0.16,
  rimPower: 3.0,
  rimColor: [1, 0.8, 0.78] as [number, number, number],
} as const;

/** A texture's average colour (linear), found once a texture; white if it can't be read. */
const averages = new WeakMap<Texture, Color>();
function averageColor(map: Texture | null): Color {
  if (!map) return new Color(1, 1, 1);
  const known = averages.get(map);
  if (known) return known.clone();
  let color = new Color(1, 1, 1);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(map.image as CanvasImageSource, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    if (n) color = new Color().setRGB(r / n / 255, g / n / 255, b / n / 255, "srgb");
  } catch {
    // An image the canvas can't read: plain white, as the material's own colour.
  }
  averages.set(map, color);
  return color.clone();
}

/** The shadow on her skin round his hands: how many panel pixels out it reaches, and how dark it is at his hand. */
const CONTACT_SHADOW = { reach: 4, depth: 0.42 } as const;

/** Flat colours for the mask of his hands (renderHandMask), and the ink drawn round them. */
const INK_BLACK = new MeshBasicMaterial({ color: 0x000000 });
const INK_WHITE = new MeshBasicMaterial({ color: 0xffffff });
const INK: readonly [number, number, number] = [0.07, 0.03, 0.04];

/** The plain shot's gesture for a cut-in's motion, so a cut-in's hand comes in and lies on her the right way. */
const MOTION_GESTURE: Record<CutMotion, Gesture> = {
  knead: "squeeze",
  pinch: "tap",
  rub: "stroke",
  circle: "tap",
  finger: "press",
  spread: "hold",
  suck: "press",
  spank: "smack",
  kiss: "none",
  pump: "hold",
  arch: "none",
  pose: "none",
  still: "none",
};

/** A CSS polygon's corners as shares of the box ("polygon(8% 6%, 100% 0%, ...)"). */
function outlineOf(shape: string): [number, number][] {
  return [...shape.matchAll(/(-?[\d.]+)%\s+(-?[\d.]+)%/g)].map((m) => [Number(m[1]) / 100, Number(m[2]) / 100]);
}

export class TouchComic {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, 4 / 3, 0.05, 20);
  private readonly surfaces: Record<CutFormat, Surface> = { wide: makeSurface("wide"), tall: makeSurface("tall") };
  /** The same at CLOSE_UP_SCALE, for close-ups (CutIn.closeUp), made when first wanted. */
  private readonly sharpSurfaces: Partial<Record<CutFormat, Surface>> = {};
  /** Whether this panel is a close-up, drawn sharper: how many of its pixels to one of a plain panel's. */
  private pixelScale = 1;
  private format: CutFormat = "wide";
  /** The panel's outline now (its CSS clip), for the effects drawn along its edges. */
  private outline: [number, number][] = [];
  private readonly root: HTMLElement;
  private readonly rim: HTMLElement;
  private readonly picture: HTMLElement;
  private letters: Lettering[] = [];

  private model: Object3D | null = null;
  private bones: { torso: Object3D; head: Object3D; upper: Object3D; fore: Object3D } | null = null;
  /** Her breasts' bone, while hands are squeezing them: it squishes with each squeeze. */
  private bust: Object3D | null = null;
  /** The middle of each of her breasts, in her model's space: her skin gives outward from these. */
  private breastMiddles: Vector3[] = [];
  /** How big each of her breasts is (how far its skin sits from its middle), in her model's space. */
  private breastSizes: number[] = [];
  /** A soft warm light from below and in front, lit only between her legs (KP's bright cheeks and thighs there). */
  private readonly below = new DirectionalLight(0xffd8c8, 0);
  /** Her skin round her clit, dragged after his fingertip (the clit cut-in). */
  private clitDrag: DragSkin | null = null;
  /**
   * Where her breasts are for the shadow under them in a close-up (UNDER_SHADE): each one's middle and size (world
   * space; size 0 for none), and which way the light comes from. Shared with her painted skin's shaders.
   */
  private readonly underShade: UnderShade = {
    uBreasts: { value: [new Vector4(), new Vector4()] },
    uShadeFrom: { value: new Vector3(0, 1, 0) },
  };
  /** Each breast's soft body: how far it's moved from where it sits, and how fast it's moving (world space). */
  private breastSprings: { at: Vector3; speed: Vector3 }[] = [];
  /** The clock when the springs last moved on. */
  private springAt = 0;
  /** Her breasts' skin, squeezed like a balloon under his hands. */
  private soft: SoftSkin | null = null;
  /** His body in the shot, for a kiss or her hand on him. */
  private partner: Object3D | null = null;
  private partnerHead: Object3D | null = null;
  private readonly partnerBase = new Vector3();
  /** The hands on her this moment. */
  private rigs: HandRig[] = [];
  /** Each kind of guest's arms, cut once from their model and kept: two, for the cut-ins with both his hands. */
  private readonly arms = new Map<GuestKind, Arm[]>();
  /** The cut-in playing, if this moment is one, and how hard. */
  private cut: CutIn | null = null;
  private cutKind: CutKind | null = null;
  private strength = 1;
  /** Which way his shaft runs, for her hand pumping along it. */
  private readonly shaftAxis = new Vector3(0, 1, 0);
  /** Her facing in the panel, for a kiss's rhythm. */
  private readonly facing = new Vector3();
  /** The loop the motion's on, to kick her soft parts once a loop; and when the last spank landed (the panel shakes). */
  private cycle = -1;
  private kickAt = -10;
  /** How worked up she is this moment, 0 to 1: the backdrop warms to rose and magenta with it. */
  private heat = 0;
  private jiggles: Jiggle[] = [];
  private show: TouchShow | null = null;
  private turn = 0;
  /** The shot for the touch showing. */
  private shot: Shot = SHOTS.hand;
  /** Where the panel centres on: where the touch lands, or between both his hands. */
  private readonly contact = new Vector3();
  /** Where her cheeks are, for the blush, in the panel scene. */
  private readonly cheeks = [new Vector3(), new Vector3()];
  private readonly glowAt = new Vector3();
  /** Whether her face is turned toward the camera, so a blush shows. */
  private faceShowing = true;
  /** The model's size in the panel scene. */
  private scale = 1;

  private time = 0;
  /** Runs on even while a held panel stands still, so the steam, the hearts and a cut-in's loop keep going. */
  private clock = 0;
  private active = false;
  private readonly played = new Set<string>();
  private plan: FxPlan | null = null;
  /** When the effects start: the touch landing, or the slap. */
  private fxFrom: number = T.contact;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly sound: (effect: Effect) => void,
    /** A male guest of this kind, dressed for it, whose arm reaches in. */
    private readonly guestModel: (kind: GuestKind) => Object3D,
    /** A male partner of this kind, undressed and ready, for a kiss or her hand on him. */
    private readonly partnerModel: (kind: GuestKind) => Object3D,
  ) {
    this.root = document.createElement("div");
    this.root.id = "touch-comic";
    this.root.setAttribute("aria-hidden", "true");
    this.rim = document.createElement("div");
    this.rim.className = "rim";
    this.picture = document.createElement("div");
    this.picture.className = "picture";
    this.root.append(this.rim, this.picture);
    this.useFormat("wide", PANEL_SHAPE);
    document.body.append(this.root);

    this.scene.add(new AmbientLight(0x6a6480, 0.9));
    this.scene.add(new HemisphereLight(0xb8c4e0, 0x3a2414, 0.7));
    const key = new DirectionalLight(0xffd0a0, 2.6);
    key.position.set(-1.5, 2.5, 3);
    const back = new DirectionalLight(0x8fa4d0, 2.2);
    back.position.set(2, 2, -2.5);
    this.below.position.set(0.3, -2, 2.5);
    this.scene.add(key, back, this.below);
  }

  get playing(): boolean {
    return this.active;
  }

  /** The surface for the panel's shape now. */
  private get surface(): Surface {
    if (this.pixelScale === 1) return this.surfaces[this.format];
    return (this.sharpSurfaces[this.format] ??= makeSurface(this.format, this.pixelScale));
  }

  /** Puts the panel in this shape: wide or tall, cut on this outline. */
  private useFormat(format: CutFormat, shape: string): void {
    this.format = format;
    this.outline = outlineOf(shape);
    const { canvas, fx, width, height } = this.surface;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.picture.replaceChildren(canvas, fx.canvas);
    this.root.classList.toggle("tall", format === "tall");
    this.rim.style.clipPath = shape;
    this.picture.style.clipPath = shape;
  }

  /** Shows a touch on this character: `body` is the sibling's own model, posed as it stands, and `name` its body name. */
  play(body: Object3D, name: string, show: TouchShow): void {
    this.clear();
    // A touch that lands plays its cut-in, Karryn-style; a slap or a pull, a brawl's blows, keep the plain shot.
    const kind = show.cut ?? (touchLands(show.answer) && !show.words ? cutKindFor(show.id, show.region, show.level ?? 4, show.noHand) : null);
    const cut = kind ? CUT_INS[kind] : null;
    this.cut = cut;
    this.cutKind = kind;
    this.strength = show.strength ?? (kind === "spank" ? spankLevel(show.level ?? 4) : 1);
    this.pixelScale = cut?.closeUp ? CLOSE_UP_SCALE : 1;
    this.useFormat(cut?.format ?? "wide", cut?.shape ?? PANEL_SHAPE);

    const model = cloneSkinned(body);
    model.position.set(0, 0, 0);
    if (cut?.closeUp) paintSkin(model, this.underShade);
    // Every cut-in shows her naked, as KP's do (user, 2026-11-17): on the panel's copy of her only, her clothes and
    // jewellery are off, nothing pulled down or bunched up showing. Her shoes and boots stay on.
    if (cut) {
      model.traverse((object) => {
        if (!(object instanceof Mesh) || !/_(Cloth|Jewel)/.test(object.name)) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        if (!materials.some((m: Material) => /boot|shoe/i.test(m.name))) object.visible = false;
      });
    }
    if (show.ownCloth || (kind && ON_BREASTS.has(kind)) || cut?.legs) {
      model.traverse((object) => {
        if (object instanceof Mesh) object.geometry = object.geometry.clone();
      });
    }
    const base = shotFor(show.id, cut?.region ?? show.region);
    const shot: Shot = cut
      ? {
          ...base,
          bone: cut.bone ?? base.bone,
          offset: cut.offset ?? base.offset,
          distance: cut.distance ?? base.distance,
          view: cut.view ?? base.view,
          gesture: cut.hands === 0 ? "none" : MOTION_GESTURE[cut.motion],
          sideOfFace: false,
        }
      : { ...base, ...(show.noHand ? { gesture: "none" as const } : {}) };
    this.shot = shot;
    // Facing the camera angled toward the guest on the panel's left, side on, or turned away so the hand coming
    // in from the left lands on the near side; side on to him for a kiss.
    this.turn = cut?.partner === "kiss" ? KISS_TURN : TURN[shot.view];
    model.rotation.set(0, this.turn, 0);
    model.visible = true;
    const part = (label: string) => model.getObjectByName(`${name}_${label}`);
    if (cut?.legs) {
      spreadLegs(model, name, cut.legs);
      // Seen from between her legs her hair down her back would fill the gap under her: not in KP's shot.
      model.traverse((object) => {
        if (object instanceof Mesh && /Hair/.test(object.name)) object.visible = false;
      });
    }
    const torso = part("Torso");
    const head = part("Head");
    const upper = part("UpperArm_R");
    const fore = part("ForeArm_R");
    const anchor = part(shot.bone) ?? torso;
    if (!torso || !head || !upper || !fore || !anchor) return;
    this.scene.add(model);
    this.model = model;
    this.bones = { torso, head, upper, fore };
    this.bust = kind && ON_BREASTS.has(kind) ? (part("Bust") ?? null) : null;
    this.show = show;
    this.heat = cut?.motion === "arch" || cut?.cum ? 1 : (show.heat ?? touchHeat(show.answer, show.level ?? 4));
    const soft = kind ? CUT_SOFT[kind] : SOFT[show.region];
    this.jiggles = (soft ?? [])
      .map((label) => part(label))
      .filter((bone): bone is Object3D => Boolean(bone))
      .map((bone) => new Jiggle(bone, { ...SPRING, axes: [...SPRING.axes] as [number, number, number] }));

    this.pose(0);
    const scale = model.getWorldScale(new Vector3()).y;
    this.scale = scale;
    this.facing.set(0, 0, -1).applyAxisAngle(new Vector3(0, 1, 0), this.turn);
    let d = shot.distance * scale;
    // Her own right arm, cut before she's hidden, for her hand on him.
    const herArm = cut?.partner === "crotch" ? cutArm(model, name) : null;

    // Where it lands, on the skin; with both hands, the other the mirror of it across her middle.
    const toWorld = (bone: Object3D, offset: [number, number, number]) =>
      model.localToWorld(model.worldToLocal(bone.getWorldPosition(new Vector3())).add(new Vector3(...offset)));
    const middle = model.worldToLocal(torso.getWorldPosition(new Vector3())).x;
    const mirrored = (point: Vector3) => {
      const local = model.worldToLocal(point.clone());
      local.x = 2 * middle - local.x;
      return model.localToWorld(local);
    };
    const contacts: Vector3[] = [toWorld(anchor, shot.offset)];
    // On her clit: drawn bigger than life, as KP's (a smooth swell round her vulva), then the top of her slit.
    if (kind === "clit" || kind === "pussy") {
      const middle = vulvaMiddle(model);
      if (middle) lensSkin(model, middle, CLIT_LENS.radius * scale, CLIT_LENS.gain);
    }
    const clit = kind === "clit" ? clitPoint(model) : null;
    if (clit) contacts[0] = clit;
    // In her (KP's petting pussy): the hole low in her opening, his two fingers in it.
    const hole = kind === "pussy" ? holePoint(model) : null;
    if (hole) contacts[0] = hole;
    // Kneading her breasts: a hand on the front of each, the heel of it low so the fingers spread up over her.
    const fronts = kind && ON_BREASTS.has(kind) ? breastFronts(model, name, middle) : null;
    // However big her sliders have made her breasts, the panel holds them as it holds a C cup: further back for a
    // bigger bust (or the camera ends up inside it), no closer for a small one.
    let bust = 1;
    if (fronts) {
      const sizes = fronts.map((f) => f.points.reduce((sum, p) => sum + p.distanceTo(f.centre), 0) / Math.max(1, f.points.length));
      bust = sizes.reduce((a, b) => a + b, 0) / sizes.length / BUST_AS_BUILT;
      this.breastSizes = sizes;
      // A bit more than in step with them: bigger breasts sit further apart too, and his hands with them.
      d *= MathUtils.clamp(bust ** 1.3, 1, 3);
    }
    const outs: Vector3[] = [];
    const aims: Vector3[] = [];
    if (fronts) {
      // The palm a little under the front of each, so the fingers spread up over her.
      // KP's grip: his palm on the lower, outer side of each breast, his fingers curling up and in over it. On her
      // nipples, his fingertips at the front of each.
      // Which breast is on the panel's left: there his left hand takes hold from the outside, in from the left edge
      // of the panel (KP).
      const across = fronts.map((front) => model.localToWorld(front.point.clone()).x);
      const tips = kind === "nipples" ? nippleTips(model, name, middle, fronts) : null;
      const placed = fronts.map((front, f) => {
        const away = Math.sign(front.point.x - middle) || 1;
        const left = across[f] === Math.min(...across) && fronts.length > 1;
        // On her skin, where her breast faces out, down and forward (forward is her -Z): the few points furthest
        // that way from its middle. His left hand higher up her side, on the front of it, not under it.
        const toward = new Vector3(away * (left ? GRIP.outLeft : GRIP.out), -(left ? GRIP.downLeft : GRIP.down), -GRIP.forward).normalize();
        const furthest = front.points
          .map((p) => ({ p, far: p.clone().sub(front.centre).dot(toward) }))
          .sort((a, b) => b.far - a.far)
          .slice(0, 6);
        const grip = furthest.reduce((sum, { p }) => sum.add(p), new Vector3()).divideScalar(Math.max(1, furthest.length));
        // On her nipples, right on the tip of each.
        const tip = tips?.find((t) => Math.sign(t.x - middle) === Math.sign(front.point.x - middle));
        const local = kind === "nipples" ? (tip ?? front.point).clone() : grip;
        return {
          at: model.localToWorld(local.clone()),
          out: local.clone().sub(front.centre).normalize().transformDirection(model.matrixWorld),
          aim: model.localToWorld(
            front.point.clone().add(new Vector3(0, REACH_PAST * front.points.reduce((sum, q) => sum + q.distanceTo(front.centre), 0) / Math.max(1, front.points.length), 0)),
          ),
        };
      });
      // The breast on the panel's left (lower world x: the camera looks down -Z) takes the hand from the left, and
      // the other the hand from the right, so his arms never cross.
      placed.sort((a, b) => a.at.x - b.at.x);
      contacts.length = 0;
      for (const { at, out, aim } of placed) {
        contacts.push(at);
        outs.push(out);
        aims.push(aim);
      }
    } else if (cut?.hands === 2) {
      // His two hands, one either side of her middle (her breasts, her cheeks).
      const side = cut.motion === "spread" ? 0.045 : kind === "butt" ? 0.075 : 0.085;
      const left = model.localToWorld(model.worldToLocal(contacts[0].clone()).add(new Vector3(side, 0, 0)));
      contacts[0] = left;
      contacts.push(mirrored(left));
    }

    let look: Vector3;
    if (cut?.partner === "kiss") {
      // Him, mouth to her mouth, side on and mirrored, his head tipped the other way.
      const partner = this.addPartner(show.kind);
      partner.rotation.set(0, -KISS_TURN, 0);
      partner.updateMatrixWorld(true);
      this.pose(T.contact + 0.8);
      const hers = head.localToWorld(MOUTH.clone());
      const his = this.partnerHead ? this.partnerHead.localToWorld(MOUTH.clone()) : hers.clone();
      partner.position.add(hers.clone().sub(his)).addScaledVector(this.facing, 0.012 * scale);
      this.partnerBase.copy(partner.position);
      this.pose(0);
      look = hers.clone();
      this.contact.copy(hers);
    } else if (cut?.partner === "crotch") {
      // Him standing to her, side on; her hidden but for her arm reaching to him.
      const partner = this.addPartner(show.kind);
      partner.rotation.set(0, Math.PI - 0.95, 0);
      // His arms up and out of the way, so it's her hand on him that's seen.
      for (const [side, way] of [["L", -1], ["R", 1]] as const) partner.getObjectByName(`Male_UpperArm_${side}`)?.rotation.set(0, 0, way * 1.2);
      partner.updateMatrixWorld(true);
      model.visible = false;
      const root = partner.localToWorld(SHAFT_ROOT.clone());
      const tip = partner.localToWorld(SHAFT_TIP.clone());
      this.shaftAxis.copy(tip).sub(root).normalize();
      this.contact.copy(root).lerp(tip, 0.45);
      contacts[0] = this.contact.clone();
      look = this.contact.clone().add(new Vector3(-0.06 * d, 0.02 * d, 0));
    } else {
      this.contact.copy(contacts[0]);
      if (contacts.length > 1) this.contact.lerp(contacts[1], 0.5);
      // Square on to her breasts, the panel full of them.
      if (fronts) this.contact.y += 0.035 * scale;
      // Centre on where it lands, close in, a little right of the middle so a lone hand has room to come in;
      // on her face, centre on her face, so her look is what's seen.
      look = this.contact.clone().add(new Vector3(contacts.length > 1 || !cut || cut.hands === 0 ? (cut ? 0 : -0.12 * d) : -0.1 * d, 0, 0));
      if (shot.sideOfFace) {
        const face = model.localToWorld(model.worldToLocal(head.getWorldPosition(new Vector3())).add(MIDDLE_OF_FACE));
        look.copy(face).lerp(contacts[0], 0.25);
      }
    }
    if (shot.view === "square") look.copy(this.contact);
    // Between her legs: her vulva just above the middle, her belly over it, the undersides of her cheeks below.
    // Between her legs the shot is framed on her clit, as KP's are; his fingers in her sit lower in it.
    if (shot.view === "between") look.copy(hole ? (clitPoint(model) ?? this.contact) : this.contact).add(new Vector3(0, -BETWEEN.below * d, 0));
    // From under and to her side: on the middle of her breasts, between the two.
    if (shot.view === "above" && fronts) look.copy(fronts.reduce((sum, f) => sum.add(model.localToWorld(f.centre.clone())), new Vector3()).divideScalar(fronts.length));
    if (shot.view === "under") {
      look.copy(this.contact);
      if (fronts) look.copy(fronts.reduce((sum, f) => sum.add(model.localToWorld(f.centre.clone())), new Vector3()).divideScalar(fronts.length));
      // A little under them, as KP frames it: his forearms come up from the bottom of the panel, her belly between.
      look.y -= 0.08 * d;
    }
    this.camera.position.set(look.x + 0.15 * d, look.y + 0.04 * d, look.z + d);
    // Square on: straight at her, from a touch below, as KP draws her breasts.
    if (shot.view === "square") this.camera.position.set(look.x + 0.03 * d, look.y - 0.08 * d, look.z + d);
    if (shot.view === "under") this.camera.position.set(look.x + 0.04 * d, look.y - 0.34 * d, look.z + 0.94 * d);
    // Low and square on (KP's nipple cut-in): her breasts from in front and a little below, her belly under them.
    if (shot.view === "low") {
      if (fronts) look.copy(fronts.reduce((sum, f) => sum.add(model.localToWorld(f.centre.clone())), new Vector3()).divideScalar(fronts.length));
      look.y -= LOW.below * d;
      this.camera.position.set(look.x, look.y - LOW.camera * d, look.z + d);
    }
    // From a little above: down over her breasts, her collarbone at the top of the panel (KP's nipple cut-in).
    if (shot.view === "above") this.camera.position.set(look.x + 0.05 * d, look.y + 0.3 * d, look.z + 0.95 * d);
    // From between her knees, a little below: up at her, as KP draws her spread.
    if (shot.view === "between") this.camera.position.set(look.x, look.y - BETWEEN.low * d, look.z + BETWEEN.ahead * d);
    this.below.intensity = shot.view === "between" ? BETWEEN.light : 0;
    if (cut?.motion === "arch" || cut?.motion === "pose") this.camera.position.y -= 0.12 * d;
    this.camera.lookAt(look);
    // A close-up tipped on the slant, as KP's.
    if (cut?.closeUp) this.camera.rotateZ(cut.closeUp.roll);
    this.glowAt.copy(this.contact);

    // His hands (or hers), each from off the panel's side: the first from the left, the mirrored one from the right.
    const count = cut ? cut.hands : shot.gesture === "none" ? 0 : 1;
    let arms = this.arms.get(show.kind);
    if (!arms) {
      arms = [];
      this.arms.set(show.kind, arms);
    }
    while (!herArm && arms.length < count) arms.push(cutArm(this.guestModel(show.kind), "Male"));
    // Sized to her: a man's hand a little bigger than her own, however the sliders have made her.
    const hers = Math.abs((herArm ?? cutArm(model, name)).palm.y);
    for (let i = 0; i < count; i++) {
      const arm = herArm ?? arms[i];
      // Which side of her this hand is on (the second on the panel's right), and whether it's his left hand (his
      // cut arm mirrored). On her breasts he faces her and the backs of his hands are seen, so his left is on the
      // panel's left, thumbs in toward her cleavage (KP); elsewhere the second hand is the mirrored one.
      const right = i === 1;
      const mirror = fronts ? !right : right;
      const contact = contacts[i] ?? contacts[0];
      const centre = shot.sideOfFace
        ? model.localToWorld(model.worldToLocal(head.getWorldPosition(new Vector3())).add(new Vector3(0, 0.08, 0)))
        : right
          ? mirrored(anchor.getWorldPosition(new Vector3()))
          : anchor.getWorldPosition(new Vector3());
      // Out of her at the touch: away from the bone it's on, and a little toward the camera, so the back of the
      // hand is what's seen. On her face, out from the middle of her head and barely toward the camera.
      const normal = outs[i]
        ? outs[i].clone()
        : contact
        .clone()
        .sub(centre)
        .setY(shot.sideOfFace ? 0 : contact.y - centre.y)
        .normalize()
        .addScaledVector(this.camera.position.clone().sub(contact).normalize(), shot.sideOfFace ? 0.25 : 0.6)
        .normalize();
      const start = contact.clone();
      if (shot.sideOfFace) start.addScaledVector(normal, 0.6 * d).add(new Vector3(0, -0.6 * d, 0));
      // Both his hands come up from below, KP-style, one either side; a lone hand comes in from the left.
      // On her breasts: up from below and from the viewer's side, KP-style, the forearms foreshortened.
      // On her breasts: in from below and outside each, KP-style, so his fingers wrap up and in over her.
      // KP: his forearms straight up from the bottom of the panel, his palms under the front of each breast.
      // On her nipples (KP): his arms round her, the hand on the panel's left in from her side, the other up from
      // under her breast.
      else if (fronts && kind === "nipples") start.add(right ? new Vector3(0.2 * d, -1 * d, 0.1 * d) : new Vector3(-1 * d, -0.25 * d, 0));
      else if (fronts) start.add(new Vector3((right ? 0.6 : -0.6) * d, -0.85 * d, 0.1 * d));
      else if (count === 2) start.add(new Vector3((right ? 0.5 : -0.5) * d, -0.9 * d, 0.2 * d));
      // Between her legs, or to her mouth: up from below on the left, so it doesn't cross her.
      // On her clit: down over her mound from the top of the panel, from her right (KP).
      else if (cut?.motion === "circle") start.add(new Vector3(0.9 * d, 0.8 * d, 0.35 * d));
      // In her: up from the bottom left of the panel, his fingers pointing up into her (KP).
      else if (cut?.motion === "finger") {
        // As the panel sees it: from its bottom left, and out toward the viewer.
        this.camera.updateMatrixWorld(true);
        const [right, up] = [0, 1].map((axis) => new Vector3().setFromMatrixColumn(this.camera.matrixWorld, axis));
        const toward = this.camera.position.clone().sub(contact).normalize();
        start.addScaledVector(right, -FINGERING.from[0] * d).addScaledVector(up, -FINGERING.from[1] * d).addScaledVector(toward, FINGERING.from[2] * d);
      }
      else if (cut && (cut.motion === "rub" || cut.motion === "suck")) start.add(new Vector3(-0.55 * d, -0.85 * d, 0.25 * d));
      else start.add(new Vector3((right ? 0.95 : -0.95) * d, -0.22 * d, 0.3 * d));
      if (cut?.motion === "pump") {
        // Her palm round his shaft from her side of it.
        normal.copy(start).sub(contact);
        normal.addScaledVector(this.shaftAxis, -normal.dot(this.shaftAxis)).normalize();
      }
      const out = mirrored(contact.clone()).sub(contact).negate();
      if (out.lengthSq() < 1e-8) out.set(right ? 1 : -1, 0, 0);
      out.normalize();
      const his = Math.abs(arm.palm.y);
      // On her breasts a little smaller, so they show round his fingers as KP draws them.
      // And a little with them, comic-style: on a small bust his hands don't swallow her, on a big one they still hold.
      const size = fronts ? HAND_TO_HERS * 0.85 * MathUtils.clamp(bust ** 0.5, 0.85, 1.4) : HAND_TO_HERS;
      const fit = herArm ? 1 : hers > 0 && his > 0 ? MathUtils.clamp((size * hers) / his, 0.4, fronts ? 1.7 : 1) : 1;
      arm.group.scale.set(scale * fit * (mirror ? -1 : 1), scale * fit, scale * fit);
      arm.curl(0);
      arm.group.visible = true;
      // On her breasts his bare forearm, as KP draws it, not his sleeve filling the bottom of the panel. (His arms are
      // kept between panels, so the sleeve comes back for the others.)
      // In her, only his hand, as KP draws it: from the low camera his forearm would come right past the lens.
      const handOnly = cut?.motion === "finger";
      for (const piece of arm.group.children) {
        if (piece instanceof Mesh) piece.visible = handOnly ? arm.hand.includes(piece) : !fronts || arm.hand.includes(piece) || /skin/i.test((piece.material as Material).name);
      }
      this.scene.add(arm.group);
      this.rigs.push({
        group: arm.group,
        arm,
        palm: arm.palm.clone(),
        contact,
        start,
        normal,
        mirror,
        delay: right ? 0.1 : 0,
        // Both hands on her breasts squeeze at once, as KP's do; elsewhere they take turns.
        phase: right && !fronts ? 0.5 : 0,
        out,
        press: 0,
        fingers: new Vector3(0, 1, 0),
        on: 0,
        touch: fronts && kind !== "nipples" ? handTouch(arm) : [],
        drag: new Vector3(),
        sit: 0,
        aim: aims[i] ?? null,
        pull: new Vector3(),
      });
    }

    if (this.bust) this.soft = softSkin(model, this.bust, show.ownCloth ? name : null);
    this.clitDrag = clit ? dragSkin(model, clit, CLIT.reach * scale) : hole ? dragSkin(model, hole, FINGERING.reach * scale) : null;
    this.breastMiddles = fronts ? fronts.map((front) => front.centre.clone()) : [];
    this.breastSprings = this.breastMiddles.map(() => ({ at: new Vector3(), speed: new Vector3() }));
    this.springAt = this.clock;

    // A smack or a slap lands hard; in a brawl, her blow or his fist does.
    const brawl = Boolean(show.words);
    const hard = show.answer === "slap" || (!brawl && shot.gesture === "smack" && touchLands(show.answer)) || (brawl && show.fist === true && show.answer === "allow");
    const plan = fxPlan({
      answer: cut ? (show.answer === "allow" && this.heat >= 0.6 ? "lean" : show.answer) : show.answer,
      region: show.region,
      heat: this.heat,
      brawl,
      hard: hard && kind !== "spank",
      face: shot.view !== "behind" || show.region === "rear",
    });
    if (cut) {
      if (cut.cum) plan.cum = cut.cum;
      if (cut.flash) plan.flash = this.strength;
      if (cut.sparkle) plan.sparkle = true;
      if (kind === "spank") plan.mark = this.strength;
      if (cut.motion === "arch") plan.focus = true;
      if (kind === "clit" || kind === "pussy") {
        // KP's: just the picture, her skin wet round his hand; nothing else drawn over it. In her, a small pink jolt
        // either side as his fingers go in.
        Object.assign(plan, { steam: 0, skinSteam: 0, quiver: false, blushLines: false, sweat: 0, hearts: 0, burst: false, focus: false, sparkle: false });
        plan.skin = 1 + Math.round(this.heat);
        if (kind === "pussy") plan.jolts = true;
      } else if (kind === "breasts" || kind === "nipples") {
        // KP's petting cut-in is just the picture: no drops, sweat, steam, hearts or marks drawn over it. On her
        // nipples, KP's two small touches: a spark under each as he tugs, and faint hatching round the edge (user,
        // 2026-11-17: small, never in the way).
        Object.assign(plan, { steam: 0, skinSteam: 0, quiver: false, blushLines: false, sweat: 0, hearts: 0, burst: false, focus: false, skin: 0, sparkle: false });
        if (kind === "nipples") Object.assign(plan, { spark: true, edgeLines: true });
      } else if (kind && ON_BREASTS.has(kind)) {
        // Her skin glistening; no quiver marks, which would frame his hands.
        plan.skin = 1 + Math.round(this.heat);
        plan.quiver = false;
      }
      plan.moan = null;
    }
    this.plan = plan;
    this.fxFrom = show.answer === "slap" ? T.swing + 0.15 : brawl && show.answer === "pull" ? T.contact + 0.2 : T.contact;
    this.makeLetters(show);
    this.time = 0;
    this.clock = 0;
    this.cycle = -1;
    this.kickAt = -10;
    this.active = true;
    this.played.clear();
    this.root.classList.add("open");
    this.render();
  }

  /** His body, undressed, in the shot. */
  private addPartner(kind: GuestKind): Object3D {
    const partner = cloneSkinned(this.partnerModel(kind));
    partner.position.set(0, 0, 0);
    partner.visible = true;
    this.partnerHead = partner.getObjectByName("Male_Head") ?? null;
    this.scene.add(partner);
    this.partner = partner;
    return partner;
  }

  update(dt: number): void {
    if (!this.active || !this.show) return;
    this.time += dt;
    this.clock += dt;
    // Held: the moment stays, hand still on her, and only her soft parts and a cut-in's loop keep moving.
    if (this.show.hold) this.time = Math.min(this.time, HOLD_AT);
    const t = this.time;
    const { answer, region } = this.show;
    if (t >= T.contact && !this.played.has("contact")) {
      this.played.add("contact");
      if (touchLands(answer)) {
        const kick = region === "rear" ? 0.9 : 0.6;
        for (const jiggle of this.jiggles) jiggle.kick(new Vector3(0, kick, kick * 0.4));
        this.sound(region === "rear" || this.cutKind === "spank" ? "putDown" : "cloth");
      } else if (answer === "slap") {
        this.sound("putDown");
      }
    }
    // A cut-in's loop: her soft parts bounce once a knead or a spank, and a spank shakes the panel as it lands.
    const cut = this.cut;
    if (cut && t >= T.contact && this.rigs.length > 0) {
      const at = (this.clock - T.contact) / cut.loop + (cut.motion === "spank" ? 0.34 : 0);
      const cycle = Math.floor(at);
      if (cycle !== this.cycle && (this.show.hold || t < T.release)) {
        this.cycle = cycle;
        if (cut.motion === "spank") {
          this.kickAt = this.clock;
          if (cycle > 0) this.sound("putDown");
          for (const jiggle of this.jiggles) jiggle.kick(new Vector3(0, 0.6 + this.strength * 0.3, 0.5));
        } else if (cut.motion === "knead" || cut.motion === "spread") {
          // (Not for a pinch: there her nipples lead her breasts, each its own way; a bounce of both together on top
          // squashes them into each other.)
          for (const jiggle of this.jiggles) jiggle.kick(new Vector3(0, 0.35, 0.2));
        }
      }
    }
    for (const jiggle of this.jiggles) jiggle.update(dt);
    if (t >= T.end) {
      this.clear();
      return;
    }
    this.render();
  }

  clear(): void {
    this.active = false;
    this.root.classList.remove("open");
    this.root.style.transform = "";
    if (this.model) this.scene.remove(this.model);
    if (this.partner) this.scene.remove(this.partner);
    for (const rig of this.rigs) this.scene.remove(rig.group);
    this.model = null;
    this.partner = null;
    this.partnerHead = null;
    this.bust = null;
    this.soft = null;
    this.clitDrag = null;
    this.bones = null;
    this.rigs = [];
    this.jiggles = [];
    this.plan = null;
    this.cut = null;
    this.cutKind = null;
    for (const surface of [...Object.values(this.surfaces), ...Object.values(this.sharpSurfaces)]) surface.fx.clear();
    for (const { el } of this.letters) el.remove();
    this.letters = [];
  }

  /** The words for this touch and answer: a smack's SMACK, a slap's SLAP, a squeak, a sigh; a cut-in's own. */
  private makeLetters(show: TouchShow): void {
    const letter = (text: string, kind: string, from: number, to: number) => {
      if (!text) return;
      const el = document.createElement("div");
      el.className = `sfx ${kind}`;
      el.textContent = text;
      this.root.append(el);
      this.letters.push({ el, from, to });
    };
    const moan = this.plan?.moan;
    const after = T.contact;
    // A brawl's own words, timed like the touch they look like.
    if (show.words) {
      const { hit, voice } = show.words;
      const [hitAt, voiceAt] =
        show.answer === "slap" ? [T.swing + 0.15, T.swing + 0.6] : show.answer === "pull" ? [after + 0.2, T.swing] : [after, after + 0.35];
      if (hit) letter(hit, "hit", hitAt, hitAt + 0.95);
      if (voice) letter(voice, "voice", voiceAt, T.popOut);
      return;
    }
    // A cut-in: its sound big over it, and her voice in a bubble, louder the more worked up she is.
    const cut = this.cut;
    if (cut) {
      const spank = this.cutKind === "spank" ? SPANK_LEVELS[Math.min(3, Math.max(1, this.strength)) - 1] : null;
      const hard = this.cutKind === "orgasm" && this.strength > 1;
      letter(spank?.hit ?? (hard ? "!!!!" : cut.hit), "hit", after, after + 1.3);
      // A squeeze's sound pops again with every squeeze, KP-style, for as long as his hands are on her.
      if (cut.motion === "knead" || cut.motion === "pinch") {
        const last = this.letters[this.letters.length - 1];
        if (last) last.repeat = cut.loop * 2;
      }
      const voice = spank?.voice ?? (hard ? "coming— again—♥♥" : cut.voice);
      if (voice) {
        const loud = this.heat >= 0.72 || cut.motion === "arch";
        const el = makeMoanBubble(voice, loud);
        this.root.append(el);
        this.letters.push({ el, from: after + 0.3, to: T.popOut, shake: loud });
      }
      return;
    }
    switch (show.answer) {
      case "allow":
      case "lean":
      case "givein": {
        const kiss = show.region === "lips" || show.region === "neck" || show.region === "face";
        const words: Record<Gesture, string> = {
          rest: "...",
          hold: "hold",
          stroke: "stroke~",
          strokeUp: "slide~",
          smack: "SMACK!",
          squeeze: "squeeze",
          press: kiss ? "mwah" : "press",
          tap: "boop!",
          tug: "tug!",
          none: "...",
        };
        // A kiss is a kiss, whatever the guest's hand is doing meanwhile.
        const word = show.region === "lips" && show.id !== "feed" && show.id !== "scuffleMouth" ? "mwah" : words[this.shot.gesture];
        letter(word, "hit", after, after + 0.9);
        // Her voice in a cloud bubble, the more worked up the louder; the hearts float up round her on their own.
        if (moan) {
          const el = makeMoanBubble(moan.text, moan.loud);
          this.root.append(el);
          this.letters.push({ el, from: after + 0.3, to: T.popOut, shake: moan.loud });
        } else {
          letter(show.answer === "lean" ? "mmh~" : show.answer === "givein" ? "ah~" : "eep!", "voice", after + 0.35, T.popOut);
        }
        if (show.answer === "lean" && !this.plan?.hearts) letter("♥", "heart", after + 0.6, T.popOut);
        break;
      }
      case "slap":
        letter("SLAP!", "hit", T.swing + 0.15, T.swing + 1.1);
        letter("hmph!", "voice", T.swing + 0.6, T.popOut);
        break;
      case "pull":
        letter("eep!", "voice", T.swing, T.swing + 0.9);
        letter("...", "hit", after + 0.2, T.popOut);
        break;
    }
  }

  /** Moves her and the hands to time `t`. */
  private pose(t: number): void {
    const { model, bones, show } = this;
    if (!model || !bones) return;
    const answer = show?.answer ?? "allow";
    const region = show?.region ?? "hand";
    // At rest: arms down, standing straight.
    let torsoX = 0;
    let torsoY = 0;
    let headX = 0;
    let headY = 0;
    let headZ = 0;
    let upper = 0.15;
    let across = 0.1;
    let elbow = 0.25;
    const landed = span(t, T.contact, T.contact + 0.12);
    const fade = 1 - ease(span(t, T.release, T.popOut));
    if (answer === "allow" || answer === "givein") {
      // A jolt as it lands, then still, head ducked shyly. Let or given in to, it lands the same.
      const jolt = Math.sin(Math.PI * span(t, T.contact, T.contact + 0.35));
      torsoX -= jolt * 0.14;
      headX += ease(landed) * 0.12 * fade;
      headY -= ease(landed) * 0.15 * fade;
    } else if (answer === "lean") {
      // Melts into it: leans in, head tipped toward the hand.
      const melt = ease(span(t, T.contact, T.contact + 0.8)) * fade;
      torsoX += melt * 0.1;
      headZ += melt * 0.25;
      headX += melt * 0.06;
      torsoY -= melt * 0.15;
    } else if (answer === "slap") {
      // The right arm swings across and knocks the hand away; the head turns, cross.
      const swing = ease(span(t, T.swing, T.swing + 0.18));
      const back = ease(span(t, T.swing + 0.45, T.release));
      const k = swing * (1 - back);
      // Out to her right, toward the guest on the panel's left, not across herself.
      upper = MathUtils.lerp(0.15, 1.2, k);
      across = MathUtils.lerp(0.1, 0.85, k);
      elbow = MathUtils.lerp(0.25, 0.35, k);
      headY += ease(span(t, T.swing + 0.3, T.swing + 0.6)) * 0.35 * fade;
      headX -= ease(span(t, T.swing + 0.3, T.swing + 0.6)) * 0.08 * fade;
    } else {
      // Twists out of reach.
      const twist = ease(span(t, T.swing, T.contact)) * fade;
      torsoY += twist * 0.5;
      headY += twist * 0.4;
    }
    // Caught from behind, she looks back over her shoulder.
    if (region === "rear" || this.cut?.view === "behind") headY -= ease(span(t, T.contact, T.contact + 0.4)) * 0.75 * fade;
    // A cut-in's own body: coming (arched back, head thrown back, shaking), posing, leaning into a kiss.
    const cut = this.cut;
    if (cut) {
      const loop = ((this.clock - T.contact) / cut.loop) * Math.PI * 2;
      const into = ease(span(t, T.contact - 0.3, T.contact + 0.4));
      switch (cut.motion) {
        case "arch": {
          const hard = this.strength > 1 ? 1.3 : 1;
          torsoX -= 0.28 * into * hard;
          headX -= 0.5 * into * hard;
          torsoX += Math.sin(this.clock * 47) * 0.03 * into * hard;
          headY += Math.sin(this.clock * 31) * 0.05 * into;
          break;
        }
        case "pose":
          torsoY += 0.35 * into + Math.sin(loop) * 0.06 * into;
          headZ += 0.22 * into;
          headX += 0.08 * into;
          torsoX -= 0.08 * into;
          break;
        case "kiss":
          headX += 0.1 * into;
          headZ += (this.cutKind === "kissHim" ? 0.35 : 0.28) * into;
          if (this.cutKind === "kissHim") torsoX += 0.08 * into;
          break;
        case "suck":
          headX += (0.06 + Math.sin(loop) * 0.05) * into;
          break;
        case "still":
          headX += 0.1 * into;
          headZ += 0.12 * into;
          break;
        case "spank": {
          const since = this.clock - this.kickAt;
          torsoX -= Math.sin(Math.PI * MathUtils.clamp(since / 0.3, 0, 1)) * 0.1 * (0.6 + this.strength * 0.3);
          break;
        }
        default:
          // His hands on her: she trembles the more, the more worked up she is.
          torsoX += Math.sin(this.clock * 23) * 0.012 * this.heat * into;
          break;
      }
    }
    bones.torso.rotation.set(torsoX + chestOverHips(bones.torso), torsoY, 0);
    bones.head.rotation.set(headX, headY, headZ);
    bones.upper.rotation.set(upper, 0, across);
    bones.fore.rotation.set(elbow, 0, 0);
    // Pulling away also turns the whole of her from the hand and steps her clear of it.
    const clear = answer === "pull" ? ease(span(t, T.swing, T.contact)) * fade : 0;
    model.rotation.y = this.turn + clear * 0.6;
    model.position.x = clear * 0.16 * this.scale;
    model.updateMatrixWorld(true);
    // A kiss: his head tipped the other way, and the two of them pressing in and easing off.
    if (this.partner && cut?.partner === "kiss") {
      if (this.partnerHead) this.partnerHead.rotation.set(0.1, 0, -0.28);
      const press = (0.5 - 0.5 * Math.cos(((this.clock - T.contact) / cut.loop) * Math.PI * 2)) * ease(span(t, T.contact - 0.2, T.contact + 0.3));
      this.partner.position.copy(this.partnerBase).addScaledVector(this.facing, 0.008 * this.scale * press);
      this.partner.updateMatrixWorld(true);
    }
    for (const rig of this.rigs) this.poseHand(rig, t, answer);

    const head = bones.head;
    head.updateMatrixWorld(true);
    head.localToWorld(this.cheeks[0].set(0.045, 0.1, -0.085));
    head.localToWorld(this.cheeks[1].set(-0.045, 0.1, -0.085));
    // The face looks down the head's -Z: only blush if that points back toward the camera.
    const facing = head.localToWorld(new Vector3(0, 0.1, -1)).sub(head.localToWorld(new Vector3(0, 0.1, 0)));
    this.faceShowing = model.visible && facing.dot(this.camera.position.clone().sub(this.cheeks[0])) > 0;
  }

  /**
   * One hand: in from the side pointing the way it reaches, then turning so the palm lies on her with the fingers
   * along her and the wrist lifted, and doing what this touch does (resting, holding, stroking, smacking,
   * squeezing, pressing, tapping or tugging); or a cut-in's loop (kneading, pinching, rubbing, circling,
   * spreading, in and out of her mouth, spanking, pumping); or knocked away, or grabbing at nothing.
   */
  private poseHand(rig: HandRig, time: number, answer: TouchAnswer): void {
    const hand = rig.group;
    const t = time - rig.delay;
    const scale = Math.abs(hand.scale.y);
    const cut = this.cut;
    const gesture = this.shot.gesture;
    const took = touchLands(answer);
    const n = rig.normal;
    const motion = cut?.motion;
    // A palm sits just off the skin; a tap or a press lands on the fingertips.
    const tips = gesture === "tap" || gesture === "press" || motion === "circle" || motion === "suck";
    // Pinching her nipple, his fingertips meet on it.
    const pinching = motion === "pinch" && rig.aim !== null;
    // On her clit, his index fingertip right on it.
    const flicking = motion === "circle" && this.clitDrag !== null;
    // In her, his two fingertips just inside the hole.
    const fingering = motion === "finger" && this.clitDrag !== null;
    const target = rig.contact
      .clone()
      .addScaledVector(n, (pinching ? -0.002 : flicking ? CLIT.sink : fingering ? FINGERING.sink : tips ? 0.03 : 0.015) * scale);

    let into = ease(span(t, T.reachFrom, T.contact));
    // A smack hangs back, then comes in fast.
    if (gesture === "smack" && !cut) into = 0.55 * ease(span(t, T.reachFrom, T.contact - 0.25)) + 0.45 * span(t, T.contact - 0.08, T.contact) ** 2;
    const out = ease(span(t, T.release, T.popOut));
    let reach = into * (1 - out);
    let spin = 0;
    if (answer === "slap") {
      // Stops just short, then is knocked off back the way it came, spinning.
      const knocked = ease(span(t, T.swing + 0.15, T.swing + 0.55));
      reach = Math.min(into, 0.85) * (1 - knocked);
      spin = knocked * 2.5;
    } else if (answer === "pull") {
      // Falls short of where she was, and hangs about grabbing at air.
      reach = Math.min(into, 0.8) * (1 - out);
    }
    const back = rig.start.clone().sub(target).normalize();
    const position = new Vector3().lerpVectors(rig.start, target, reach);

    // While it's on her, it does what this touch does.
    const on = span(t, T.contact, T.release);
    const there = took && on > 0 && (on < 1 || Boolean(this.show?.hold));
    let press = 0;
    // The fingers: spread wide as it comes in, then closing on her for a grab, a grip or a tug.
    const closing = ease(span(t, T.contact - 0.05, T.contact + 0.2));
    const letGo = 1 - ease(span(t, T.release, T.release + 0.3));
    const grip: Partial<Record<Gesture, number>> = { squeeze: 0.75, hold: 0.45, tug: 0.9, rest: 0.15, stroke: 0.1, strokeUp: 0.1, press: 0.35, tap: 0.55 };
    let curl = took ? (grip[gesture] ?? 0) * closing * letGo : 0;
    if (there && gesture === "squeeze" && !cut) curl += Math.abs(Math.sin(on * Math.PI * 3)) * 0.25;
    // Grabbing at air: snatches shut on nothing.
    if (answer === "pull") curl = ease(span(t, T.contact - 0.05, T.contact + 0.15)) * 0.95 * letGo;
    const right = new Vector3(1, 0, 0);
    const up = new Vector3(0, 1, 0);
    if (there && cut) {
      // A cut-in's loop, by the clock so a held panel keeps it going.
      const at = (this.clock - T.contact - rig.delay) / cut.loop + rig.phase;
      const f = at - Math.floor(at);
      const wave = 0.5 - 0.5 * Math.cos(f * Math.PI * 2);
      const s = Math.sin(f * Math.PI * 2);
      const c = Math.cos(f * Math.PI * 2);
      switch (cut.motion) {
        case "knead":
          press = wave;
          rig.press = wave;
          // His fingers close and sink into her as he squeezes; the skin gives under them (squeezeSkin).
          curl = (0.55 + 0.3 * wave) * closing;
          // Kneading round: as he squeezes, his hands press in and push her breasts up and together; easing off,
          // they let them down and out again.
          position
            .addScaledVector(n, -(0.006 + 0.01 * wave) * scale)
            .addScaledVector(up, (wave * 0.018 - 0.004) * scale)
            .addScaledVector(rig.out, -wave * 0.008 * scale);
          break;
        case "pinch":
          if (pinching) {
            // KP: he pinches her nipple and tugs it out, then lets it back; her breast is drawn out after it.
            rig.press = wave;
            // As KP's: his arms pull outward and a little back, away from her: the nipple on the panel's left out to
            // her side as far as her breast will stretch (and a little up), the right one out and down.
            const left = this.onPanelLeft(rig);
            const [outward, upward, toward] = left ? PINCH.pullUp : PINCH.pullDown;
            const tug = rig.out.clone().multiplyScalar(outward).add(new Vector3(0, upward, 0)).addScaledVector(n, toward).normalize();
            position.addScaledVector(tug, wave * PINCH.tug * (left ? PINCH.tugOut : 1) * scale);
            break;
          }
          rig.press = wave * 0.5;
          curl = (0.7 + 0.2 * wave) * closing;
          position.addScaledVector(right, s * 0.004 * scale).addScaledVector(up, c * 0.004 * scale).addScaledVector(n, -0.005 * scale);
          break;
        case "rub":
          curl = 0.2 * closing;
          position.addScaledVector(up, s * 0.035 * scale).addScaledVector(n, -0.008 * scale);
          break;
        case "circle":
          if (flicking) {
            // KP: small circles on her clit; her clit and the top of her lips go round with his fingertip.
            const across = new Vector3().crossVectors(n, up).normalize();
            const along = up.clone().addScaledVector(n, -up.dot(n)).normalize();
            position.addScaledVector(across, c * CLIT.circle * scale).addScaledVector(along, s * CLIT.circle * 0.8 * scale);
            break;
          }
          curl = 0.35 * closing;
          position.addScaledVector(right, c * 0.012 * scale).addScaledVector(up, s * 0.012 * scale);
          break;
        case "finger":
          // KP: his two fingers pushed into her and drawn back a little, her lips going in and out with them.
          rig.press = wave;
          position.addScaledVector(n, -wave * FINGERING.push * scale).addScaledVector(back, -wave * FINGERING.push * 0.5 * scale);
          break;
        case "spread":
          press = 0.5;
          curl = 0.35 * closing;
          position.addScaledVector(rig.out, wave * 0.03 * scale).addScaledVector(n, -0.01 * scale);
          break;
        case "suck":
          curl = 0.15;
          position.addScaledVector(n, -wave * 0.035 * scale);
          break;
        case "spank": {
          // Wound back off her, then brought down hard, then wound back again.
          const wind = SPANK_LEVELS[Math.min(3, Math.max(1, this.strength)) - 1].wind;
          const lift = f < 0.6 ? ease(f / 0.6) : 1 - (MathUtils.clamp((f - 0.6) / 0.07, 0, 1) ** 2);
          position.addScaledVector(n, lift * wind * scale).addScaledVector(up, lift * wind * 0.5 * scale);
          curl = 0.1;
          break;
        }
        case "pump":
          curl = 0.9 * closing;
          position.addScaledVector(this.shaftAxis, s * 0.035 * scale);
          break;
        default:
          break;
      }
    } else if (there) {
      switch (gesture) {
        case "stroke":
          position.addScaledVector(right, Math.sin(on * Math.PI * 3) * 0.035 * scale);
          break;
        case "strokeUp":
          position.addScaledVector(up, (ease(on) - 0.3) * 0.12 * scale);
          break;
        case "smack":
          // Bounces off, then settles back on for a moment.
          position.addScaledVector(n, Math.sin(span(on, 0, 0.12) * Math.PI) * 0.06 * scale);
          break;
        case "squeeze":
          press = Math.abs(Math.sin(on * Math.PI * 3));
          position.addScaledVector(n, -press * 0.015 * scale);
          break;
        case "hold":
          press = 0.4;
          break;
        case "press":
          position.addScaledVector(n, -Math.sin(span(on, 0, 0.3) * Math.PI * 0.5) * 0.015 * scale);
          break;
        case "tap":
          // Two quick boops, then away.
          position.addScaledVector(n, Math.abs(Math.sin(span(on, 0, 0.4) * Math.PI * 2)) * 0.05 * scale);
          break;
        case "tug":
          // Gets a grip, then pulls back.
          position.addScaledVector(back, ease(span(on, 0.15, 0.5)) * 0.07 * scale);
          break;
        default:
          break;
      }
    }

    // Reaching: the arm points where it's going. On her: fingers along her, palm to her, wrist up off her.
    const way = target.clone().sub(rig.start).normalize();
    // On the side of her face the fingers point up her cheek, not across it; round his shaft, they wrap it.
    const along = this.shot.sideOfFace
      ? new Vector3(0, 1, 0)
      : motion === "pump"
        ? new Vector3().crossVectors(this.shaftAxis, n)
        : pinching
          ? // (Turned from the pinch itself, below.)
            rig.out.clone().negate()
          : rig.aim && motion === "knead"
          ? // Toward her nipple, and up her body: so his forearm hangs down below her breast, elbow under it (KP),
            // not out at the viewer.
            rig.aim.clone().sub(rig.contact).normalize().add(new Vector3(0, GRIP_UP, 0))
          : way.clone();
    along.addScaledVector(n, -along.dot(n));
    if (along.lengthSq() < 1e-6) along.set(0, 1, 0);
    along.normalize();
    // Gripping her breasts his palm lies flat on her, cupping her from under (KP's frames): only a touch of tilt,
    // more as he squeezes. Elsewhere his wrist lifts off her.
    const gripping = rig.touch.length > 0 && motion === "knead";
    const dip = pinching ? 0 : gripping ? press * 0.06 : (motion === "pump" ? 0 : WRIST_LIFT) + (tips ? 0.35 : 0) + press * 0.15;
    // In her, his fingers point straight in along the way his hand came, not along her skin.
    const fingersOn = fingering ? way.clone() : along.clone().multiplyScalar(Math.cos(dip)).addScaledVector(n, -Math.sin(dip)).normalize();
    // A mirrored arm's palm side is its -X: aim that at her instead.
    const palmTo = (toward: Vector3) => (rig.mirror ? toward.clone().negate() : toward);
    const inward = n.clone().negate();
    const reaching = this.orient(way, palmTo(inward.clone().addScaledVector(way, -inward.dot(way)).normalize()));
    // In her, his palm turned up the panel, as KP's: his two fingers one behind the other going in, his curled ones
    // and his thumb at the side.
    let lying = this.orient(fingersOn, palmTo(fingering ? new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1) : inward));
    if (flicking) {
      // Two fingers out (index and middle, the index a little ahead), the others curled under, his thumb tucked:
      // his index fingertip is what lands on her clit.
      rig.arm.fingers.forEach((finger, f) => finger.bend(CLIT.bends[f] ?? CLIT.bends[3]));
      rig.arm.thumb?.bend(CLIT.thumb);
      hand.updateMatrixWorld(true);
      const index = rig.arm.fingers[0]?.tip.getWorldPosition(new Vector3());
      if (index) rig.palm.copy(hand.worldToLocal(index));
    }
    if (fingering) {
      // Index and middle out, together, in her; the other two curled; his thumb out. Between their tips is what goes in.
      rig.arm.fingers.forEach((finger, f) => finger.bend(FINGERING.bends[f] ?? FINGERING.bends[3]));
      rig.arm.thumb?.bend(FINGERING.thumb);
      hand.updateMatrixWorld(true);
      const index = rig.arm.fingers[0]?.tip.getWorldPosition(new Vector3());
      const middle = rig.arm.fingers[1]?.tip.getWorldPosition(new Vector3());
      if (index && middle) rig.palm.copy(hand.worldToLocal(index.add(middle).multiplyScalar(0.5)));
    }
    if (pinching) {
      // Pinching: thumb and finger closing on her nipple, harder as he tugs. His hand is turned from the pinch itself:
      // the line from his thumb's tip to his finger's lies across her (from under and outside her nipple to over and
      // in), not into her, so both are seen on it; his thumb's side to the viewer, his hand trailing off down and out
      // along that line (KP's).
      rig.arm.pinch(ease(span(t, T.contact - 0.3, T.contact)) * (0.55 + 0.45 * rig.press));
      hand.updateMatrixWorld(true);
      const thumb = rig.arm.thumb?.tip.getWorldPosition(new Vector3());
      const index = rig.arm.fingers[0]?.tip.getWorldPosition(new Vector3());
      if (thumb && index) {
        const thumbAt = hand.worldToLocal(thumb);
        const indexAt = hand.worldToLocal(index);
        rig.palm.copy(thumbAt).add(indexAt).multiplyScalar(0.5);
        // In the arm's own space, mirrored as it's drawn: the pinch line, and across his hand (the thumb's side).
        const flip = new Vector3(rig.mirror ? -1 : 1, 1, 1);
        const a = indexAt.sub(thumbAt).multiply(flip).normalize();
        const z = new Vector3(0, 0, 1).addScaledVector(a, -a.z).normalize();
        const own = new Matrix4().makeBasis(a, z, new Vector3().crossVectors(a, z));
        const across = rig.out.clone().negate().add(new Vector3(0, PINCH.rise, 0));
        across.addScaledVector(n, -across.dot(n)).normalize();
        const toViewer = n.clone().addScaledVector(across, -n.dot(across)).normalize();
        const onHer = new Matrix4().makeBasis(across, toViewer, new Vector3().crossVectors(across, toViewer));
        lying = new Quaternion().setFromRotationMatrix(onHer.multiply(own.transpose()));
      }
    }
    const settle = ease(span(reach, 0.6, 1));
    rig.fingers.copy(fingersOn);
    rig.on = took ? settle : 0;
    if (there && cut) {
      rig.drag.copy(position).sub(target);
      rig.drag.addScaledVector(n, -rig.drag.dot(n));
    } else {
      rig.drag.set(0, 0, 0);
    }
    hand.quaternion.copy(reaching).slerp(lying, settle);
    if (spin) hand.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spin));

    if (pinching || flicking || fingering) {
      // The point between his thumb's tip and his finger's (or his fingertip) is what lands on her (rig.palm, above),
      // and her skin there goes where it goes.
      rig.pull.copy(position).sub(target).multiplyScalar(there ? 1 : 0);
    } else rig.arm.curl(this.show?.fist ? 1 : Math.min(1, curl));
    // The arm's origin is its elbow: put it so the palm lands where it should.
    const palm = rig.palm.clone().multiply(hand.scale);
    hand.position.copy(position).sub(palm.applyQuaternion(hand.quaternion));
  }

  /** Whether this hand is the one on the panel's left: of two, the one further that way on screen. */
  private onPanelLeft(rig: HandRig): boolean {
    const others = this.rigs.filter((other) => other !== rig);
    if (!others.length) return true;
    const screenX = (at: Vector3) => at.clone().project(this.camera).x;
    return others.every((other) => screenX(rig.contact) < screenX(other.contact));
  }

  /**
   * The turn that points the arm's fingers (its -Y) along `fingers`, with its palm facing `palm`.
   */
  private orient(fingers: Vector3, palm: Vector3): Quaternion {
    const y = fingers.clone().negate().normalize();
    // The palm axis, kept square to the arm.
    const p = palm.clone().addScaledVector(y, -palm.dot(y));
    if (p.lengthSq() < 1e-6) p.set(1, 0, 0).addScaledVector(y, -y.x);
    p.normalize();
    // PALM is +X, so X follows the palm; Z makes up the rest.
    const x = PALM.x >= 0 ? p : p.clone().negate();
    const z = new Vector3().crossVectors(x, y).normalize();
    return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
  }

  /**
   * Squeezes her breasts like a balloon under his hands, on her skin as it is this frame (she trembles, jolts and
   * bounces). Her breast goes with his grip as he kneads; wherever his palm or a finger would still go into her, her
   * skin gives outward from her breast's middle to just under it, so his hand presses in and never through; each
   * dent is softened into the skin round it, and the flesh he's pushed aside swells up round his hand.
   */
  private squeezeSkin(skin: SoftSkin): void {
    const { model } = this;
    if (!model) return;
    const k = this.scale;
    const v = new Vector3();
    const d0 = new Vector3();
    const { posed, weight, aroundStart, around } = skin;
    const count = weight.length;
    // Where her skin is this frame, from the mesh as built.
    for (const piece of skin.pieces) {
      const { mesh } = piece;
      mesh.skeleton.update();
      for (let n = 0; n < piece.index.length; n++) {
        const i = piece.index[n];
        v.fromArray(piece.rest, i * 3);
        mesh.applyBoneTransform(i, v);
        v.applyMatrix4(mesh.matrixWorld);
        posed.set([v.x, v.y, v.z], piece.point[n] * 3);
      }
    }
    // Which way each point gives: out from the middle of the breast it's on.
    const middles = this.breastMiddles.map((m) => model.localToWorld(m.clone()));
    const outs = new Float32Array(count * 3);
    // Which breast each point is on, and how big each breast is: how far its skin sits from its middle, as her
    // sliders have made her this time (an A cup to a Z), so everything below is in shares of it.
    const sizeSum = middles.map(() => 0);
    const sizeCount = middles.map(() => 0);
    const nearest = (at: Vector3) => {
      let best = 0;
      for (let m = 1; m < middles.length; m++) if (middles[m].distanceToSquared(at) < middles[best].distanceToSquared(at)) best = m;
      return best;
    };
    for (let j = 0; j < count; j++) {
      if (weight[j] <= 0.6) continue;
      v.fromArray(posed, j * 3);
      const best = nearest(v);
      sizeSum[best] += v.distanceTo(middles[best]);
      sizeCount[best]++;
    }
    const sizes = middles.map((_, m) => (sizeCount[m] ? sizeSum[m] / sizeCount[m] : 0.06 * k));
    // How much of each point goes with each breast: all of it on a breast, shading from one to the other across her
    // cleavage (BREAST_BLEND of a breast's size either side of the middle), so the skin there is never torn between
    // two breasts moving their own ways. Which way it gives, the same blend of out from each breast's middle.
    const breasts = middles.length;
    const share = new Float32Array(count * Math.max(1, breasts));
    const meanSize = sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length);
    const o = new Vector3();
    for (let j = 0; j < count; j++) {
      v.fromArray(posed, j * 3);
      if (breasts === 2) {
        const first = MathUtils.smoothstep(v.distanceTo(middles[1]) - v.distanceTo(middles[0]), -BREAST_BLEND * meanSize, BREAST_BLEND * meanSize);
        share[j * 2] = first;
        share[j * 2 + 1] = 1 - first;
      } else if (breasts) share[j * breasts + nearest(v)] = 1;
      o.set(0, 0, 0);
      for (let m = 0; m < breasts; m++) {
        const s = share[j * breasts + m];
        if (s > 0) o.addScaledVector(d0.copy(v).sub(middles[m]).normalize(), s);
      }
      if (o.lengthSq() < 1e-8) o.set(0, 0, 1);
      o.normalize();
      outs.set([o.x, o.y, o.z], j * 3);
    }
    const breastOf = nearest;
    const holding = this.rigs.filter((rig) => rig.on > 0.15 && rig.touch.length > 0);
    const heldBreast = holding.map((rig) => breastOf(rig.contact));
    const q = new Vector3();
    const moves = new Float32Array(count * 3);
    const next = new Float32Array(count);

    // Each breast follows the hands on it with a spring: lifted and moved as he kneads, a little behind, overshooting
    // and bouncing back; let go, it bounces and settles where it sits.
    const dt = MathUtils.clamp(this.clock - this.springAt, 0, 0.05);
    this.springAt = this.clock;
    const omega = Math.PI * 2 * BREAST_SPRING.hz;
    this.breastSprings.forEach((spring, m) => {
      const target = new Vector3();
      holding.forEach((rig, h) => heldBreast[h] === m && target.addScaledVector(rig.drag, rig.on));
      // Pinched, the whole breast is drawn after her nipple (a little behind, bouncing back as he lets go).
      for (const rig of this.rigs) if (rig.pull.lengthSq() > 1e-10 && breastOf(rig.contact) === m) target.addScaledVector(rig.pull, PINCH.follow);
      for (let left = dt; left > 1e-5; left -= 1 / 240) {
        const h = Math.min(left, 1 / 240);
        const pull = target
          .clone()
          .sub(spring.at)
          .multiplyScalar(omega * omega)
          .addScaledVector(spring.speed, -2 * BREAST_SPRING.damping * omega);
        spring.speed.addScaledVector(pull, h);
        spring.at.addScaledVector(spring.speed, h);
      }
    });
    const d = new Vector3();
    const side = new Vector3();
    for (let j = 0; j < count; j++) {
      // The whole breast moves; less toward her chest, where it's held, and her chest itself not at all (or the
      // breast drags her chest askew with it).
      const soft = MathUtils.smoothstep(weight[j], BREAST_BODY[0], BREAST_BODY[1]);
      let mx = 0;
      let my = 0;
      let mz = 0;
      this.breastSprings.forEach((spring, m) => {
        const s = share[j * breasts + m] * soft;
        mx += spring.at.x * s;
        my += spring.at.y * s;
        mz += spring.at.z * s;
      });
      for (let h = 0; h < holding.length; h++) {
        const rig = holding[h];
        const m = heldBreast[h];
        const size = sizes[m];
        const press = rig.press * rig.on * share[j * breasts + m];
        if (press <= 0.001) continue;
        const n = rig.normal;
        // From the middle of his hand on her, palm to fingertips.
        d.fromArray(posed, j * 3).sub(rig.contact).addScaledVector(rig.fingers, -SQUEEZE.middle * size);
        const along = d.dot(n);
        // Toward the back of her breast his squeeze reaches less.
        const back = MathUtils.clamp(1 + along / (SQUEEZE.depth * size), 0, 1);
        if (back <= 0) continue;
        side.copy(d).addScaledVector(n, -along);
        const across = side.length() / size;
        // Flattened under his palm, smoothly, as a soft ball is.
        const flat = Math.exp(-((across / SQUEEZE.squashWide) ** 2)) * back * press * SQUEEZE.squash * size;
        mx -= n.x * flat;
        my -= n.y * flat;
        mz -= n.z * flat;
        // The flesh it pushes aside bulges out in a ring round his hand, and slides away from it.
        const ring = Math.exp(-(((across - SQUEEZE.ring) / SQUEEZE.ringWide) ** 2)) * back * press * size;
        if (across > 1e-4) side.divideScalar(across * size);
        mx += outs[j * 3] * ring * SQUEEZE.bulge + side.x * ring * SQUEEZE.slide;
        my += outs[j * 3 + 1] * ring * SQUEEZE.bulge + side.y * ring * SQUEEZE.slide;
        mz += outs[j * 3 + 2] * ring * SQUEEZE.bulge + side.z * ring * SQUEEZE.slide;
      }
      moves[j * 3] = mx;
      moves[j * 3 + 1] = my;
      moves[j * 3 + 2] = mz;
    }

    for (const rig of holding) {
      const points: number[] = [];
      const gather = () => {
        rig.group.updateMatrixWorld(true);
        points.length = 0;
        for (const { mesh, index } of rig.touch) {
          const position = mesh.geometry.getAttribute("position");
          for (const i of index) {
            q.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
            points.push(q.x, q.y, q.z);
          }
        }
      };
      gather();
      const at = rig.contact;
      // Everything about his hand on her in shares of the breast it's on.
      const mine = breastOf(at);
      const size = sizes[mine] ?? 0.06 * k;
      const reach = SQUEEZE.reach * size;
      const margin = SQUEEZE.margin * size;
      const most = SQUEEZE.most * size;
      // Only her skin near his hand can meet it: the points within reach, found once.
      const around2 = Math.max(0.17 * k, 2.4 * size) ** 2;
      const nearList: number[] = [];
      for (let j = 0; j < count; j++) {
        const fx = posed[j * 3] + moves[j * 3] - at.x;
        const fy = posed[j * 3 + 1] + moves[j * 3 + 1] - at.y;
        const fz = posed[j * 3 + 2] + moves[j * 3 + 2] - at.z;
        if (fx * fx + fy * fy + fz * fz <= around2) nearList.push(j);
      }
      const near = Uint32Array.from(nearList);
      // His hand rests on her, not in her: however its fingers curl, if any of it would go further into her than a
      // finger sinks, the whole hand comes back out along her until it doesn't (a quick look, every few points).
      const sink = SQUEEZE.sink * size;
      // How far his palm is into her (or, below nothing, off her): its deepest point against the nearest of her skin.
      const palmDepth = () => {
        let deep = -Infinity;
        for (let t = 0; t < points.length; t += 3) {
          let best = Infinity;
          let depth = 0;
          for (let n = 0; n < near.length; n += 2) {
            const j = near[n];
            // Only her skin facing his hand: not the far side of her cleavage or her breast's underside.
            if (outs[j * 3] * rig.normal.x + outs[j * 3 + 1] * rig.normal.y + outs[j * 3 + 2] * rig.normal.z < 0.2) continue;
            const dx = points[t] - posed[j * 3] - moves[j * 3];
            const dy = points[t + 1] - posed[j * 3 + 1] - moves[j * 3 + 1];
            const dz = points[t + 2] - posed[j * 3 + 2] - moves[j * 3 + 2];
            const far = dx * dx + dy * dy + dz * dz;
            if (far >= best) continue;
            best = far;
            depth = -(dx * outs[j * 3] + dy * outs[j * 3 + 1] + dz * outs[j * 3 + 2]);
          }
          deep = Math.max(deep, depth);
        }
        return deep;
      };
      // First his palm alone, open-fingered and spread wide as KP's are: it rests on her.
      rig.arm.curl(0);
      rig.arm.spread(GRIP_SPREAD);
      const palmOnly = rig.touch.slice(0, 1);
      const all = rig.touch;
      rig.touch = palmOnly;
      gather();
      // On her as she gives: in onto her if her squashed skin has gone from under it, out if it's gone into her.
      // Where it sat last frame, then eased toward resting on her: never a jump.
      rig.group.position.addScaledVector(rig.normal, rig.sit);
      gather();
      for (let tries = 0; tries < 2; tries++) {
        const deep = palmDepth();
        const sits = sink * (1 + SQUEEZE.palmIn * rig.press);
        if (!Number.isFinite(deep) || Math.abs(deep - sits) < 0.0015 * k) break;
        // A little at a time, and never far off where he took hold.
        const step = MathUtils.clamp(deep - sits, -0.006 * k, 0.006 * k);
        if (Math.abs(rig.sit + step) > SIT_MOST * k) break;
        rig.sit += step;
        rig.group.position.addScaledVector(rig.normal, step);
        gather();
      }
      rig.touch = all;
      // Then each finger bends until its tip meets her and sinks in: a little, and further as he squeezes.
      const want = sink + SQUEEZE.dig * size * rig.press;
      const tip = new Vector3();
      const depthAt = (p: Vector3) => {
        let best = Infinity;
        let deep = -Infinity;
        for (let n = 0; n < near.length; n++) {
          const j = near[n];
          const dx = p.x - posed[j * 3] - moves[j * 3];
          const dy = p.y - posed[j * 3 + 1] - moves[j * 3 + 1];
          const dz = p.z - posed[j * 3 + 2] - moves[j * 3 + 2];
          const far = dx * dx + dy * dy + dz * dz;
          if (far >= best) continue;
          best = far;
          deep = -(dx * outs[j * 3] + dy * outs[j * 3 + 1] + dz * outs[j * 3 + 2]);
        }
        return deep;
      };
      for (const finger of rig.arm.thumb ? [...rig.arm.fingers, rig.arm.thumb] : rig.arm.fingers) {
        // His thumb just rests on her, in her cleavage: it's his fingers that dig in.
        const thumb = finger === rig.arm.thumb;
        const wanted = thumb ? 0 : want;
        let low = 0;
        // Curled round her as far as a grip goes: a finger that finds nothing to press stays that far round.
        let high = 1;
        for (let step = 0; step < 6; step++) {
          const mid = (low + high) / 2;
          finger.bend(mid);
          finger.tip.updateWorldMatrix(true, false);
          if (depthAt(finger.tip.getWorldPosition(tip)) < wanted) low = mid;
          else high = mid;
        }
        // Easing off, his fingers open (no further bent than resting on her); squeezing, they close on her however
        // she's met them, sinking in (her skin gives under them): the grip opening and closing, plain to see.
        finger.bend(thumb ? low : MathUtils.lerp(Math.min(low, SQUEEZE.open), SQUEEZE.close, rig.press));
      }
      gather();
      // Where his hand would still go into her, her skin gives to just under it.
      const dent = new Float32Array(count);
      for (let n = 0; n < near.length; n++) {
        const j = near[n];
        const px = posed[j * 3] + moves[j * 3];
        const py = posed[j * 3 + 1] + moves[j * 3 + 1];
        const pz = posed[j * 3 + 2] + moves[j * 3 + 2];
        const fx = px - at.x;
        const fy = py - at.y;
        const held = breasts ? share[j * breasts + mine] : 1;
        const fz = pz - at.z;
        if (fx * fx + fy * fy + fz * fz > (0.17 * k) ** 2) continue;
        const ox = outs[j * 3];
        const oy = outs[j * 3 + 1];
        const oz = outs[j * 3 + 2];
        let need = 0;
        for (let t = 0; t < points.length; t += 3) {
          const dx = points[t] - px;
          const dy = points[t + 1] - py;
          const dz = points[t + 2] - pz;
          // How far out from her skin this point of his hand is, and how far to the side.
          const along = dx * ox + dy * oy + dz * oz;
          if (along > margin || along < -most * 1.5) continue;
          const side = dx * dx + dy * dy + dz * dz - along * along;
          if (side > reach * reach) continue;
          const w = 1 - Math.sqrt(side) / reach;
          need = Math.max(need, (margin - along) * Math.min(1, w * 1.6));
        }
        // Only on the breast this hand holds: a finger or the edge of his palm reaching over her cleavage doesn't
        // crumple the other one.
        dent[j] = Math.min(need, most) * held;
      }
      // Where his hand itself is on her (before softening): that skin never swells, or it would rise through him.
      const under = dent.slice();
      // Softened into the skin round it, so a dent is a smooth hollow, not a pit.
      for (let pass = 0; pass < SQUEEZE.passes; pass++) {
        for (let j = 0; j < count; j++) {
          const from = aroundStart[j];
          const to = aroundStart[j + 1];
          let sum = 0;
          for (let a = from; a < to; a++) sum += dent[around[a]];
          next[j] = Math.max(dent[j], to > from ? (sum / (to - from)) * SQUEEZE.spread : 0);
        }
        dent.set(next);
      }
      // The flesh he's pushed aside swells out just beside each dent: between his fingers and round the edge of his
      // hand, as much as the skin beside it sank (the dents spread further, less the dent itself), and nowhere else.
      const beside = dent.slice();
      for (let pass = 0; pass < SQUEEZE.aside; pass++) {
        for (let j = 0; j < count; j++) {
          const from = aroundStart[j];
          const to = aroundStart[j + 1];
          let sum = beside[j];
          for (let a = from; a < to; a++) sum += beside[around[a]];
          next[j] = sum / (to - from + 1);
        }
        beside.set(next);
      }
      for (let j = 0; j < count; j++) {
        const lift = -dent[j] + (under[j] > 0 ? 0 : Math.max(0, beside[j] - dent[j]) * SQUEEZE.swell);
        moves[j * 3] += outs[j * 3] * lift;
        moves[j * 3 + 1] += outs[j * 3 + 1] * lift;
        moves[j * 3 + 2] += outs[j * 3 + 2] * lift;
      }
    }
    // Pinched, her nipple is a handle: it goes where his fingers pull it, and the breast it's on comes after it,
    // mostly as one (keeping its round shape and the fold under it), a little more toward the nipple, so it draws
    // out a touch; her chest and her other breast stay where they are. The breast's own spring (above) carries
    // PINCH.follow of the pull, a little behind; this the rest.
    for (const rig of this.rigs) {
      if (rig.pull.lengthSq() < 1e-10) continue;
      const mine = breastOf(rig.contact);
      const size = sizes[mine] ?? 0.06 * k;
      const reach = PINCH.reach * size;
      for (let j = 0; j < count; j++) {
        // Squared: across her cleavage, where her skin is shared by both breasts, it hardly comes, so the crease stays.
        const own = (breasts ? share[j * breasts + mine] ** 2 : 1) * MathUtils.smoothstep(weight[j], BREAST_BODY[0], BREAST_BODY[1]);
        if (own <= 0.001) continue;
        const far = Math.sqrt((posed[j * 3] - rig.contact.x) ** 2 + (posed[j * 3 + 1] - rig.contact.y) ** 2 + (posed[j * 3 + 2] - rig.contact.z) ** 2);
        const tip = MathUtils.smoothstep(1 - far / reach, 0, 1);
        const f = own * (PINCH.whole + (1 - PINCH.whole) * tip) * (1 - PINCH.follow);
        moves[j * 3] += rig.pull.x * f;
        moves[j * 3 + 1] += rig.pull.y * f;
        moves[j * 3 + 2] += rig.pull.z * f;
      }
    }
    // Her areolae and nipples move as the skin under them does.
    for (const { point, on, weights } of skin.riders) {
      let mx = 0;
      let my = 0;
      let mz = 0;
      on.forEach((at, i) => {
        mx += moves[at * 3] * weights[i] * Math.min(1, weight[at] * 2);
        my += moves[at * 3 + 1] * weights[i] * Math.min(1, weight[at] * 2);
        mz += moves[at * 3 + 2] * weights[i] * Math.min(1, weight[at] * 2);
      });
      // Applied below scaled by its own weight (as every point is): undone here, so it moves just as the skin does.
      const own = Math.max(1e-3, Math.min(1, weight[point] * 2));
      moves[point * 3] = mx / own;
      moves[point * 3 + 1] = my / own;
      moves[point * 3 + 2] = mz / own;
    }
    for (const piece of skin.pieces) {
      const position = piece.mesh.geometry.getAttribute("position") as BufferAttribute;
      const array = position.array as Float32Array;
      const { rest, back } = piece;
      for (let n = 0; n < piece.index.length; n++) {
        const i = piece.index[n];
        const j = piece.point[n];
        // His hand moves everything it touches; only the soft follow fades out where her breast meets her chest.
        const w = Math.min(1, weight[j] * 2);
        const mx = moves[j * 3] * w;
        const my = moves[j * 3 + 1] * w;
        const mz = moves[j * 3 + 2] * w;
        const o = n * 9;
        array[i * 3] = rest[i * 3] + back[o] * mx + back[o + 1] * my + back[o + 2] * mz;
        array[i * 3 + 1] = rest[i * 3 + 1] + back[o + 3] * mx + back[o + 4] * my + back[o + 5] * mz;
        array[i * 3 + 2] = rest[i * 3 + 2] + back[o + 6] * mx + back[o + 7] * my + back[o + 8] * mz;
      }
      position.needsUpdate = true;
    }
    // Shaded across the seams as one surface: each welded point's normal from every piece's triangles round it.
    const weld = (arrayOf: (piece: SoftPiece) => ArrayLike<number>) => {
      const normals = new Float32Array(count * 3);
      const a = new Vector3();
      const b = new Vector3();
      const c = new Vector3();
      for (const piece of skin.pieces) {
        const array = arrayOf(piece);
        const { triangles, welded } = piece;
        for (let t = 0; t < triangles.length; t += 3) {
          const [i0, i1, i2] = [triangles[t], triangles[t + 1], triangles[t + 2]];
          a.fromArray(array, i0 * 3);
          b.fromArray(array, i1 * 3).sub(a);
          c.fromArray(array, i2 * 3).sub(a);
          b.cross(c);
          for (const i of [i0, i1, i2]) {
            const j = welded[i];
            if (j < 0) continue;
            normals[j * 3] += b.x;
            normals[j * 3 + 1] += b.y;
            normals[j * 3 + 2] += b.z;
          }
        }
      }
      for (let j = 0; j < count; j++) {
        a.fromArray(normals, j * 3).normalize();
        normals.set([a.x, a.y, a.z], j * 3);
      }
      // Blurred over each point's neighbours, as her rest shading is in a close-up (NORMAL_BLUR): her areolae not.
      const { around, aroundStart, disc } = skin;
      for (let pass = 0; pass < NORMAL_BLUR; pass++) {
        const next = normals.slice();
        for (let j = 0; j < count; j++) {
          if (disc[j]) continue;
          a.fromArray(normals, j * 3);
          for (let e = aroundStart[j]; e < aroundStart[j + 1]; e++) if (!disc[around[e]]) a.add(b.fromArray(normals, around[e] * 3));
          a.normalize();
          next.set([a.x, a.y, a.z], j * 3);
        }
        normals.set(next);
      }
      return normals;
    };
    // Welded, so the seams between her pieces shade smooth (the model's own normals split there).
    const now = weld((piece) => piece.mesh.geometry.getAttribute("position").array as Float32Array);
    // Fading out to her own normals toward the edge of her breasts' skin, so there's no seam in the shading there.
    const n0 = new Vector3();
    for (const piece of skin.pieces) {
      const normal = piece.mesh.geometry.getAttribute("normal") as BufferAttribute;
      for (let n = 0; n < piece.index.length; n++) {
        const point = piece.point[n];
        const j = point * 3;
        const i = piece.index[n];
        const k = MathUtils.smoothstep(weight[point], SOFT_SHADE[0], SOFT_SHADE[1]);
        n0.fromArray(piece.restNormal, i * 3).lerp(v.set(now[j], now[j + 1], now[j + 2]), k).normalize();
        normal.setXYZ(i, n0.x, n0.y, n0.z);
      }
      normal.needsUpdate = true;
    }
  }

  /**
   * How many pixels each pixel of the panel is from his hands (in the mask's own rows), 1 just outside them, out to
   * CONTACT_SHADOW.reach; 0 on his hands or further off.
   */
  private handDistance(): Uint8Array {
    const { maskPixels, width, height } = this.surface;
    const count = width * height;
    const steps = new Uint8Array(count);
    for (let i = 0; i < count; i++) if (maskPixels[i * 4] >= 128) steps[i] = 255;
    // Out from his hand's edge only (a hand pixel with a pixel off it beside it), ring by ring.
    let edge = new Int32Array(count);
    let next = new Int32Array(count);
    let size = 0;
    for (let i = 0; i < count; i++) {
      if (steps[i] !== 255) continue;
      const x = i % width;
      if ((x > 0 && steps[i - 1] !== 255) || (x < width - 1 && steps[i + 1] !== 255) || (i >= width && steps[i - width] !== 255) || (i + width < count && steps[i + width] !== 255)) edge[size++] = i;
    }
    const visit = (j: number, ring: number, grown: number): number => {
      if (steps[j]) return grown;
      steps[j] = ring;
      next[grown] = j;
      return grown + 1;
    };
    for (let ring = 1; ring <= CONTACT_SHADOW.reach * this.pixelScale && size; ring++) {
      let grown = 0;
      for (let e = 0; e < size; e++) {
        const i = edge[e];
        const x = i % width;
        if (x > 0) grown = visit(i - 1, ring, grown);
        if (x < width - 1) grown = visit(i + 1, ring, grown);
        if (i >= width) grown = visit(i - width, ring, grown);
        if (i + width < count) grown = visit(i + width, ring, grown);
      }
      [edge, next] = [next, edge];
      size = grown;
    }
    for (let i = 0; i < count; i++) if (steps[i] === 255) steps[i] = 0;
    return steps;
  }

  /**
   * Puts the shadow under her breasts (UNDER_SHADE) where her breasts are this frame: each one's middle, moved as
   * its soft body has, and its size; the light from above her and a little in front, as her breasts face.
   */
  private placeUnderShade(): void {
    const { uBreasts, uShadeFrom } = this.underShade;
    const model = this.model;
    for (const [m, sphere] of uBreasts.value.entries()) {
      const middle = this.breastMiddles[m];
      const size = this.breastSizes[m];
      if (!model || !middle || !size) {
        sphere.set(0, 0, 0, 0);
        continue;
      }
      const at = model.localToWorld(middle.clone()).add(this.breastSprings[m]?.at ?? new Vector3());
      sphere.set(at.x, at.y, at.z, size * model.getWorldScale(new Vector3()).x * UNDER_SHADE.fit);
    }
    // In front of her: from between her breasts out toward the camera's side of her.
    const front = model ? new Vector3(0, 0, -1).transformDirection(model.matrixWorld) : new Vector3(0, 0, 1);
    uShadeFrom.value.set(0, 1, 0).addScaledVector(front, UNDER_SHADE.ahead).normalize();
  }

  /** Whether this frame has a mask of his hands to ink round. */
  private inkMask = false;

  /**
   * Where his hands show this frame: everything drawn flat black first (so she hides what's behind her), then his
   * hands alone drawn white over it, only where they're in front. The ink outline goes round the white.
   */
  private renderHandMask(): boolean {
    const { renderer, scene, camera } = this;
    const { mask, maskPixels, width, height } = this.surface;
    const hidden = [this.model, this.partner].filter((o): o is Object3D => Boolean(o && o.visible));
    renderer.setRenderTarget(mask);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    scene.overrideMaterial = INK_BLACK;
    renderer.render(scene, camera);
    for (const o of hidden) o.visible = false;
    scene.overrideMaterial = INK_WHITE;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = autoClear;
    scene.overrideMaterial = null;
    for (const o of hidden) o.visible = true;
    renderer.readRenderTargetPixels(mask, 0, 0, width, height, maskPixels);
    return true;
  }

  private render(): void {
    this.pose(this.time);
    if (this.soft) this.squeezeSkin(this.soft);
    if (this.pixelScale > 1) this.placeUnderShade();
    const follow = this.cutKind === "pussy" ? FINGERING.follow : CLIT.follow;
    if (this.clitDrag) this.clitDrag.move(this.rigs[0]?.pull.clone().multiplyScalar(follow) ?? new Vector3());
    const { renderer } = this;
    const { target, pixels, width, height, ctx, image } = this.surface;
    const previousTarget = renderer.getRenderTarget();
    const previousColor = renderer.getClearColor(new Color());
    const previousAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    this.inkMask = this.rigs.length > 0 && this.renderHandMask();
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    this.drawPicture();
    ctx.putImageData(image, 0, 0);
    this.animate(this.time);
    this.drawFx();
  }

  /** Where her mouth, cheeks, temple and the touch are on the panel, and how big things are there. */
  private fxSpots(): FxSpots | null {
    const { bones, model } = this;
    if (!bones || !model) return null;
    const head = bones.head;
    const at = (local: Vector3) => this.onPanel(head.localToWorld(local.clone()));
    const temples = [at(TEMPLE), at(TEMPLE.clone().setX(-TEMPLE.x))];
    // Sweat on the side away from the hand, which comes in from the left.
    const temple = temples[0].x > temples[1].x ? temples[0] : temples[1];
    const cheeks = this.cheeks.map((c) => this.onPanel(c));
    const edge = this.onPanel(this.cheeks[0].clone().add(new Vector3(0.028 * this.scale, 0, 0)));
    const cheekSize = Math.max(4, Math.hypot(edge.x - cheeks[0].x, edge.y - cheeks[0].y));
    const contact = this.onPanel(this.contact);
    const reach = this.onPanel(this.contact.clone().add(new Vector3(0.1 * this.scale, 0, 0)));
    const bodySize = MathUtils.clamp(Math.hypot(reach.x - contact.x, reach.y - contact.y), 8, 48);
    const hands = this.rigs.map((rig) => this.onPanel(rig.contact));
    // Her nipples he's pinching, where his pull has them now (the spark under each), and a nipple's size there.
    const pinches =
      this.cutKind === "nipples"
        ? this.rigs.map((rig) => {
            const at = rig.contact.clone().add(rig.pull);
            const p = this.onPanel(at);
            const side = this.onPanel(at.clone().add(new Vector3(NIPPLE_SIZE * this.scale, 0, 0)));
            return { ...p, tug: rig.press, size: Math.max(2, Math.hypot(side.x - p.x, side.y - p.y)) };
          })
        : undefined;
    // In her: where his fingers are, how far in they are now, and how wide her vulva is there.
    const rig = this.rigs[0];
    const jolt =
      this.cutKind === "pussy" && rig
        ? (() => {
            const p = this.onPanel(rig.contact);
            const side = this.onPanel(rig.contact.clone().add(new Vector3(JOLT_WIDTH * this.scale, 0, 0)));
            return { ...p, beat: rig.press, size: Math.max(4, Math.hypot(side.x - p.x, side.y - p.y)) };
          })()
        : undefined;
    return { mouth: at(MOUTH), temple, cheeks, cheekSize, contact, bodySize, hands, pinches, jolt, outline: this.outline };
  }

  private drawFx(): void {
    const { fx } = this.surface;
    const spots = this.plan ? this.fxSpots() : null;
    if (!this.plan || !spots) {
      fx.clear();
      return;
    }
    // Blush lines only on a face that's turned to the camera.
    const plan = this.faceShowing ? this.plan : { ...this.plan, blushLines: false };
    const fade = 1 - ease(span(this.time, T.release, T.popOut));
    // A held panel stops its own time just before the release: the effects carry on by the clock.
    fx.draw(plan, spots, this.clock - this.fxFrom, this.clock, fade);
  }

  private onPanel(point: Vector3): { x: number; y: number } {
    const { width, height } = this.surface;
    const p = point.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
  }

  /**
   * How pink her cheeks are: none for a slap, a little for a pull, more for letting it, flushed when she gives in,
   * most for leaning in; a cut-in flushes her by how worked up she is.
   */
  private blush(): number {
    if (!this.show || this.show.words) return 0;
    const grow = ease(span(this.time, T.contact, T.contact + 0.6));
    if (this.cut) return grow * (0.55 + 0.4 * this.heat);
    const amount = { allow: 0.55, lean: 0.85, givein: 0.7, pull: 0.25, slap: 0 }[this.show.answer];
    return grow * amount;
  }

  /**
   * Her over a glow, cheeks pinking up, all dithered to the game's 5-bit colour: warm candlelight while she's
   * calm, turning KP's mottled rose and magenta the more worked up she is.
   */
  private drawPicture(): void {
    const { pixels, width, height, mottle } = this.surface;
    const ink = this.inkMask;
    const data = this.surface.image.data;
    const glow = this.onPanel(this.glowAt);
    const reach = Math.hypot(width, height) * 0.6;
    const blush = this.blush();
    const hot = this.show?.words ? 0 : MathUtils.smoothstep(this.heat, 0.2, 0.9);
    const paint = this.cut ? 0.07 + hot * 0.06 : 0;
    const inner = [MathUtils.lerp(0.42, 0.7, hot), MathUtils.lerp(0.25, 0.22, hot), MathUtils.lerp(0.11, 0.45, hot)];
    const outer = [MathUtils.lerp(0.06, 0.16, hot), MathUtils.lerp(0.04, 0.03, hot), MathUtils.lerp(0.03, 0.13, hot)];
    // Only show a blush where the cheeks are in front of the camera, at the size they are on the panel.
    const cheeks = blush > 0 && this.faceShowing ? this.cheeks.map((c) => this.onPanel(c)) : [];
    let radius = 2.5;
    if (cheeks.length) {
      const edge = this.onPanel(this.cheeks[0].clone().add(new Vector3(0.028 * this.scale, 0, 0)));
      radius = Math.max(radius, Math.hypot(edge.x - cheeks[0].x, edge.y - cheeks[0].y));
    }
    // Where his hand meets her, a soft shadow on her skin round it, as where two things touch: so his hand reads as
    // pressed on her, not pasted over her. Each pixel's distance from his hand, in steps out from its edge.
    const near = ink ? this.handDistance() : null;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const from = ((height - 1 - y) * width + x) * 4;
        const to = (y * width + x) * 4;
        const threshold = (BAYER4[(x & 3) + ((y & 3) << 2)] / 16 - 0.46875) / LEVELS;
        let r: number;
        let g: number;
        let b: number;
        // A comic's ink line round his hands, just outside them, so they read against her skin: as thick as on a plain
        // panel, at a close-up's sharper scale (the pixels a step or two out from his hand).
        const steps = near ? near[from >> 2] : 0;
        if (steps > 0 && steps <= this.pixelScale) {
          {
            data[to] = Math.round(INK[0] * 255);
            data[to + 1] = Math.round(INK[1] * 255);
            data[to + 2] = Math.round(INK[2] * 255);
            data[to + 3] = 255;
            continue;
          }
        }
        if (pixels[from + 3] >= 128) {
          r = TO_SRGB[pixels[from]];
          g = TO_SRGB[pixels[from + 1]];
          b = TO_SRGB[pixels[from + 2]];
          for (const c of cheeks) {
            const k = Math.max(0, 1 - Math.hypot(x - c.x, y - c.y) / radius) * blush;
            if (k <= 0) continue;
            r = MathUtils.lerp(r, 0.95, k * 0.6);
            g = MathUtils.lerp(g, 0.42, k * 0.6);
            b = MathUtils.lerp(b, 0.48, k * 0.6);
          }
          if (steps > 0) {
            // Darkest right against his hand, warm, fading out.
            const shade = CONTACT_SHADOW.depth * (1 - (steps - 1) / (CONTACT_SHADOW.reach * this.pixelScale));
            r *= 1 - shade * 0.85;
            g *= 1 - shade;
            b *= 1 - shade * 0.95;
          }
        } else {
          const gx = x - glow.x;
          const gy = y - glow.y;
          const k = Math.max(0, 1 - Math.sqrt(gx * gx + gy * gy) / reach) ** 1.6;
          const m = mottle[y * width + x] * paint;
          r = MathUtils.lerp(outer[0], inner[0], k) + m;
          g = MathUtils.lerp(outer[1], inner[1], k) + m * 0.4;
          b = MathUtils.lerp(outer[2], inner[2], k) + m;
        }
        // Snapped to the panel's few levels, dithered: each level's byte from a table (DITHERED).
        const rl = Math.round((r + threshold) * LEVELS);
        const gl = Math.round((g + threshold) * LEVELS);
        const bl = Math.round((b + threshold) * LEVELS);
        data[to] = DITHERED[rl < 0 ? 0 : rl > LEVELS ? LEVELS : rl];
        data[to + 1] = DITHERED[gl < 0 ? 0 : gl > LEVELS ? LEVELS : gl];
        data[to + 2] = DITHERED[bl < 0 ? 0 : bl > LEVELS ? LEVELS : bl];
        data[to + 3] = 255;
      }
    }
  }

  /**
   * Bursts the panel in and out, slides it across the screen while it's up (KP's drift), shakes it on a hit, a
   * spank or as she comes, and pops each word in its turn.
   */
  private animate(t: number): void {
    const opening = span(t, 0, T.popIn);
    const closing = span(t, T.popOut, T.end);
    const spring = 1 - Math.cos(opening * Math.PI * 1.5) * Math.exp(-opening * 5) * (1 - opening);
    const scale = Math.max(0, opening < 1 ? spring : 1 - MathUtils.smootherstep(closing, 0, 1));
    const answer = this.show?.answer;
    const cut = this.cut;
    const hitAt = answer === "slap" ? T.swing + 0.15 : T.contact;
    const hard = answer === "slap" || SMACK_TOUCHES.has(this.show?.id ?? "") || this.show?.region === "chest";
    let shakeX = !cut && answer !== "pull" && t > hitAt && t < hitAt + 0.15 ? Math.sin(t * 90) * (hard ? 5 : 2) : 0;
    let shakeY = 0;
    if (cut?.motion === "spank") {
      const since = this.clock - this.kickAt;
      if (since >= 0 && since < 0.16) shakeX = Math.sin(since * 120) * (2 + this.strength * 2);
    } else if (cut?.motion === "arch") {
      const k = 1 - span(t, T.contact + 0.2, T.contact + 1.8);
      const power = this.strength > 1 ? 6 : 4;
      shakeX = Math.sin(this.clock * 83) * power * k;
      shakeY = Math.cos(this.clock * 71) * power * 0.6 * k;
    }
    // KP's cut-ins slide a little way across the screen while they're up.
    const slide = cut ? span(t, 0, T.end) - 0.5 : 0;
    const dx = cut ? cut.drift[0] * slide * 100 : 0;
    const dy = cut ? cut.drift[1] * slide * 100 : 0;
    const tilt = cut ? 0 : 2;
    this.root.style.transform = `translate(calc(${dx.toFixed(2)}% + ${shakeX.toFixed(2)}px), calc(${dy.toFixed(2)}% + ${shakeY.toFixed(2)}px)) rotate(${tilt + (1 - opening) * 10}deg) scale(${scale})`;
    for (const { el, from, to, shake, repeat } of this.letters) {
      if (repeat) {
        // By the clock, again every `repeat` seconds, so a held panel keeps squeezing out its sound.
        const since = this.clock - from;
        const into = since - Math.floor(since / repeat) * repeat;
        const shown = since >= 0 && into < repeat * 0.7 && Boolean(this.show?.hold || t < T.release);
        el.classList.toggle("on", shown);
        if (shown) el.style.setProperty("--pop", String(into < 0.18 ? 0.3 + (into / 0.18) * 0.95 : 1.25 - Math.min(0.25, (into - 0.18) * 1.2)));
        continue;
      }
      const on = t >= from && t < to;
      el.classList.toggle("on", on);
      if (!on) continue;
      const pop = span(t, from, from + 0.18);
      const size = pop < 1 ? 0.3 + pop * 0.95 : 1.25 - Math.min(0.25, (t - from - 0.18) * 1.2);
      el.style.setProperty("--pop", String(size));
      // A loud moan trembles, by the clock so it keeps going on a held panel.
      if (shake) {
        const c = this.clock;
        el.style.setProperty("--jx", `${(Math.sin(c * 53) * 1.6).toFixed(2)}px`);
        el.style.setProperty("--jy", `${(Math.cos(c * 41) * 1.2).toFixed(2)}px`);
      }
    }
  }

  dispose(): void {
    this.clear();
    for (const surface of Object.values(this.surfaces)) {
      surface.target.dispose();
      surface.mask.dispose();
    }
    this.root.remove();
  }
}
