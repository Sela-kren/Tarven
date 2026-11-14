import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Matrix4,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SkinnedMesh,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { Effect } from "./audio";
import { PANEL_SHAPE } from "./comic";
import { ComicFx, fxPlan, makeMoanBubble, touchHeat, type FxPlan, type FxSpots } from "./comicfx";
import { Jiggle } from "./jiggle";
import { chestOverHips } from "./player";
import { touchLands, type TouchAnswer, type TouchRegion } from "./touch";
import { SMACK_TOUCHES } from "./touchtalk";
import type { GuestKind } from "./tavern";

/**
 * The comic panel for a guest reaching for you, in the same dithered look as the drink panel: your own character,
 * rendered live from the real model and framed close on where the touch lands, and a guest's hand coming in from
 * the side. What happens next is your answer: the hand lands and she jolts or melts into it, she slaps it away,
 * or she twists out of reach and it grabs at air. It plays by itself alongside the conversation.
 */

const WIDTH = 200;
const HEIGHT = 150;
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
type View = "front" | "profile" | "behind";
const TURN: Record<View, number> = { front: Math.PI - 0.5, profile: Math.PI - 1.15, behind: 0.3 };

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
/** Springs for the panel's own copy of the soft parts: only kicks move them. */
const SPRING = { frequency: 2.3, damping: 0.16, gain: 0, axes: [0.35, 1, 0.35] as const, limit: 0.03 };


/** The sounds lettered over the panel. */
interface Lettering {
  el: HTMLElement;
  from: number;
  to: number;
  /** Trembles while it's up: a moan she can't hold in. */
  shake?: boolean;
}

/** Where her mouth is from the head bone, for the breath steaming out of it. */
const MOUTH = new Vector3(0, 0.075, -0.11);
/** Either temple, from the head bone (the left one mirrored), for sweat. */
const TEMPLE = new Vector3(0.075, 0.16, -0.03);

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
/** How big a guest's hand is next to hers. */
const HAND_TO_HERS = 1.15;

/**
 * A guest's right arm, cut out of their own model as it stands: every triangle that moves with the upper arm
 * or forearm, skin and sleeve alike, at its true size, in the forearm bone's own space with the hand toward
 * -Y. It can close its fingers (`curl`), bending everything past the knuckles toward the palm.
 */
export interface Arm {
  group: Group;
  /** Where the palm is, in the arm's own space. */
  palm: Vector3;
  /** Closes the fingers, from 0 (open) to 1 (a fist). */
  curl(amount: number): void;
}

export function cutArm(model: Object3D, name: string): Arm {
  const fore = model.getObjectByName(`${name}_ForeArm_R`);
  const upper = model.getObjectByName(`${name}_UpperArm_R`);
  const group = new Group();
  const none: Arm = { group, palm: new Vector3(0, -0.25, 0), curl: () => {} };
  if (!fore || !upper) return none;
  model.updateMatrixWorld(true);
  const toArm = fore.matrixWorld.clone().invert();
  const v = new Vector3();
  const parts: { geometry: BufferGeometry; rest: Float32Array }[] = [];
  const handPoints: Vector3[] = [];
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
      if (weightOf(old, [foreIndex]) >= 0.6) handPoints.push(v.clone());
      if (uv && uvs) uvs.set([uv.getX(old), uv.getY(old)], i * 2);
    }
    const cut = new BufferGeometry();
    cut.setAttribute("position", new BufferAttribute(positions, 3));
    if (uvs) cut.setAttribute("uv", new BufferAttribute(uvs, 2));
    cut.setIndex(kept);
    cut.computeVertexNormals();
    parts.push({ geometry: cut, rest: positions.slice() });
    group.add(new Mesh(cut, object.material));
  });
  if (handPoints.length === 0) return none;

  // The fingertips are the far end of the forearm; the knuckles a finger's length back; the palm just behind.
  const tips = Math.min(...handPoints.map((p) => p.y));
  const knuckles = tips + FINGER;
  const palmPoints = handPoints.filter((p) => p.y < knuckles + FINGER * 0.9 && p.y >= knuckles);
  const palm = palmPoints.reduce((sum, p) => sum.add(p), new Vector3()).divideScalar(Math.max(1, palmPoints.length));
  const pivotX = palm.x;

  let shown = -1;
  const curl = (amount: number) => {
    if (Math.abs(amount - shown) < 0.01) return;
    shown = amount;
    for (const { geometry, rest } of parts) {
      const position = geometry.getAttribute("position") as BufferAttribute;
      const out = position.array as Float32Array;
      for (let i = 0; i < rest.length; i += 3) {
        const x = rest[i];
        const y = rest[i + 1];
        const past = knuckles - y;
        if (past <= 0) {
          out[i] = x;
          out[i + 1] = y;
          continue;
        }
        // Bends more the further past the knuckles, toward the palm (+X), like fingers closing.
        const angle = amount * CURL * Math.min(1, past / FINGER);
        const dx = x - pivotX;
        const dy = y - knuckles;
        out[i] = pivotX + dx * Math.cos(angle) - dy * Math.sin(angle);
        out[i + 1] = knuckles + dx * Math.sin(angle) + dy * Math.cos(angle);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
    }
  };
  return { group, palm, curl };
}

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
}

export class TouchComic {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, WIDTH / HEIGHT, 0.05, 20);
  private readonly target = new WebGLRenderTarget(WIDTH, HEIGHT);
  private readonly pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly root: HTMLElement;
  private letters: Lettering[] = [];

  private model: Object3D | null = null;
  private bones: { torso: Object3D; head: Object3D; upper: Object3D; fore: Object3D } | null = null;
  /** The guest's arm reaching in, and where its palm is in its own space. */
  private hand: Group | null = null;
  private palm = new Vector3();
  /** Each kind of guest's arm, cut once from their model and kept. */
  private readonly arms = new Map<GuestKind, Arm>();
  /** The arm showing, to close its fingers. */
  private arm: Arm | null = null;
  /** Which way is out of her at the touch, so the palm can lie on her. */
  private readonly normal = new Vector3();
  private jiggles: Jiggle[] = [];
  private show: TouchShow | null = null;
  private turn = 0;
  /** The shot for the touch showing. */
  private shot: Shot = SHOTS.hand;
  private readonly contact = new Vector3();
  private readonly start = new Vector3();
  /** Where her cheeks are, for the blush, in the panel scene. */
  private readonly cheeks = [new Vector3(), new Vector3()];
  private readonly glowAt = new Vector3();
  /** Whether her face is turned toward the camera, so a blush shows. */
  private faceShowing = true;
  /** The model's size in the panel scene. */
  private scale = 1;

  private time = 0;
  /** Runs on even while a held panel stands still, so the steam and hearts keep going. */
  private clock = 0;
  private active = false;
  private readonly played = new Set<string>();
  /** The comic effects over the picture, and which of them play for this moment. */
  private readonly fx = new ComicFx(WIDTH, HEIGHT);
  private plan: FxPlan | null = null;
  /** When the effects start: the touch landing, or the slap. */
  private fxFrom: number = T.contact;

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly sound: (effect: Effect) => void,
    /** A male guest of this kind, dressed for it, whose arm reaches in. */
    private readonly guestModel: (kind: GuestKind) => Object3D,
  ) {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d")!;
    this.image = this.ctx.createImageData(WIDTH, HEIGHT);

    this.root = document.createElement("div");
    this.root.id = "touch-comic";
    this.root.setAttribute("aria-hidden", "true");
    const rim = document.createElement("div");
    rim.className = "rim";
    rim.style.clipPath = PANEL_SHAPE;
    const picture = document.createElement("div");
    picture.className = "picture";
    picture.style.clipPath = PANEL_SHAPE;
    picture.append(this.canvas, this.fx.canvas);
    this.root.append(rim, picture);
    document.body.append(this.root);

    this.scene.add(new AmbientLight(0x6a6480, 0.9));
    this.scene.add(new HemisphereLight(0xb8c4e0, 0x3a2414, 0.7));
    const key = new DirectionalLight(0xffd0a0, 2.6);
    key.position.set(-1.5, 2.5, 3);
    const back = new DirectionalLight(0x8fa4d0, 2.2);
    back.position.set(2, 2, -2.5);
    this.scene.add(key, back);
  }

  get playing(): boolean {
    return this.active;
  }

  /** Shows a touch on this character: `body` is the sibling's own model, posed as it stands, and `name` its body name. */
  play(body: Object3D, name: string, show: TouchShow): void {
    this.clear();
    const model = cloneSkinned(body);
    model.position.set(0, 0, 0);
    const shot: Shot = { ...shotFor(show.id, show.region), ...(show.noHand ? { gesture: "none" as const } : {}) };
    this.shot = shot;
    // Facing the camera angled toward the guest on the panel's left, side on, or turned away so the hand coming
    // in from the left lands on the near side.
    this.turn = TURN[shot.view];
    model.rotation.set(0, this.turn, 0);
    model.visible = true;
    const part = (label: string) => model.getObjectByName(`${name}_${label}`);
    const torso = part("Torso");
    const head = part("Head");
    const upper = part("UpperArm_R");
    const fore = part("ForeArm_R");
    const anchor = part(shot.bone) ?? torso;
    if (!torso || !head || !upper || !fore || !anchor) return;
    this.scene.add(model);
    this.model = model;
    this.bones = { torso, head, upper, fore };
    this.show = show;
    this.jiggles = (SOFT[show.region] ?? [])
      .map((label) => part(label))
      .filter((bone): bone is Object3D => Boolean(bone))
      .map((bone) => new Jiggle(bone, { ...SPRING, axes: [...SPRING.axes] as [number, number, number] }));

    this.pose(0);
    const scale = model.getWorldScale(new Vector3()).y;
    this.scale = scale;
    // Where the hand lands, on the skin.
    const local = model.worldToLocal(anchor.getWorldPosition(new Vector3()));
    const [x, y, z] = shot.offset;
    this.contact.copy(model.localToWorld(local.add(new Vector3(x, y, z))));

    // Centre on where it lands, close in, with it a little right of the middle so the hand has room to come in;
    // on her face, centre on her face, so her look is what's seen.
    const d = shot.distance * scale;
    const look = this.contact.clone().add(new Vector3(-0.12 * d, 0, 0));
    if (shot.sideOfFace) {
      const face = model.localToWorld(model.worldToLocal(head.getWorldPosition(new Vector3())).add(MIDDLE_OF_FACE));
      look.copy(face).lerp(this.contact, 0.25);
    }
    this.camera.position.set(look.x + 0.15 * d, look.y + 0.04 * d, look.z + d);
    this.camera.lookAt(look);
    this.glowAt.copy(this.contact);

    // Out of her at the touch: away from the bone it's on, and a little toward the camera, so the back of the
    // hand is what's seen. On her face, out from the middle of her head and barely toward the camera, so the
    // hand cups her cheek from the side and its arm stays out to the side, clear of her face and neck.
    const centre = shot.sideOfFace
      ? model.localToWorld(model.worldToLocal(head.getWorldPosition(new Vector3())).add(new Vector3(0, 0.08, 0)))
      : anchor.getWorldPosition(new Vector3());
    this.normal
      .copy(this.contact)
      .sub(centre)
      .setY(shot.sideOfFace ? 0 : this.contact.y - centre.y)
      .normalize()
      .addScaledVector(this.camera.position.clone().sub(this.contact).normalize(), shot.sideOfFace ? 0.25 : 0.6)
      .normalize();

    // The hand comes from off the panel's left, a little low and nearer the camera; to her face, up from below
    // on that side, so it never crosses in front of her.
    if (shot.sideOfFace) this.start.copy(this.contact).addScaledVector(this.normal, 0.6 * d).add(new Vector3(0, -0.6 * d, 0));
    else this.start.copy(this.contact).add(new Vector3(-0.95 * d, -0.22 * d, 0.3 * d));
    let cut = this.arms.get(show.kind);
    if (!cut) {
      cut = cutArm(this.guestModel(show.kind), "Male");
      this.arms.set(show.kind, cut);
    }
    const hand = cut.group;
    this.arm = cut;
    this.palm.copy(cut.palm);
    cut.curl(0);
    // Sized to her: a man's hand a little bigger than her own, however the sliders have made her.
    const hers = Math.abs(cutArm(model, name).palm.y);
    const his = Math.abs(cut.palm.y);
    const fit = hers > 0 && his > 0 ? MathUtils.clamp((HAND_TO_HERS * hers) / his, 0.4, 1) : 1;
    hand.scale.setScalar(scale * fit);
    hand.visible = shot.gesture !== "none";
    this.scene.add(hand);
    this.hand = hand;

    // A smack or a slap lands hard; in a brawl, her blow or his fist does.
    const brawl = Boolean(show.words);
    const hard = show.answer === "slap" || (!brawl && shot.gesture === "smack" && touchLands(show.answer)) || (brawl && show.fist === true && show.answer === "allow");
    this.plan = fxPlan({
      answer: show.answer,
      region: show.region,
      heat: show.heat ?? touchHeat(show.answer, show.level ?? 4),
      brawl,
      hard,
      face: shot.view !== "behind" || show.region === "rear",
    });
    this.fxFrom = show.answer === "slap" ? T.swing + 0.15 : brawl && show.answer === "pull" ? T.contact + 0.2 : T.contact;
    this.makeLetters(show);
    this.time = 0;
    this.clock = 0;
    this.active = true;
    this.played.clear();
    this.root.classList.add("open");
    this.render();
  }

  update(dt: number): void {
    if (!this.active || !this.show) return;
    this.time += dt;
    this.clock += dt;
    // Held: the moment stays, hand still on her, and only her soft parts keep moving.
    if (this.show.hold) this.time = Math.min(this.time, HOLD_AT);
    const t = this.time;
    const { answer, region } = this.show;
    if (t >= T.contact && !this.played.has("contact")) {
      this.played.add("contact");
      if (touchLands(answer)) {
        const kick = region === "rear" ? 0.9 : 0.6;
        for (const jiggle of this.jiggles) jiggle.kick(new Vector3(0, kick, kick * 0.4));
        this.sound(region === "rear" ? "putDown" : "cloth");
      } else if (answer === "slap") {
        this.sound("putDown");
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
    if (this.hand) this.scene.remove(this.hand);
    this.model = null;
    this.bones = null;
    this.hand = null;
    this.arm = null;
    this.jiggles = [];
    this.plan = null;
    this.fx.clear();
    for (const { el } of this.letters) el.remove();
    this.letters = [];
  }

  /** The words for this touch and answer: a smack's SMACK, a slap's SLAP, a squeak, a sigh. */
  private makeLetters(show: TouchShow): void {
    const letter = (text: string, kind: string, from: number, to: number) => {
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

  /** Moves her and the hand to time `t`. */
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
    if (region === "rear") headY -= ease(span(t, T.contact, T.contact + 0.4)) * 0.75 * fade;
    bones.torso.rotation.set(torsoX + chestOverHips(bones.torso), torsoY, 0);
    bones.head.rotation.set(headX, headY, headZ);
    bones.upper.rotation.set(upper, 0, across);
    bones.fore.rotation.set(elbow, 0, 0);
    // Pulling away also turns the whole of her from the hand and steps her clear of it.
    const clear = answer === "pull" ? ease(span(t, T.swing, T.contact)) * fade : 0;
    model.rotation.y = this.turn + clear * 0.6;
    model.position.x = clear * 0.16 * this.scale;
    model.updateMatrixWorld(true);
    this.poseHand(t, answer);

    const head = bones.head;
    head.updateMatrixWorld(true);
    head.localToWorld(this.cheeks[0].set(0.045, 0.1, -0.085));
    head.localToWorld(this.cheeks[1].set(-0.045, 0.1, -0.085));
    // The face looks down the head's -Z: only blush if that points back toward the camera.
    const facing = head.localToWorld(new Vector3(0, 0.1, -1)).sub(head.localToWorld(new Vector3(0, 0.1, 0)));
    this.faceShowing = facing.dot(this.camera.position.clone().sub(this.cheeks[0])) > 0;
  }

  /**
   * The guest's arm: in from the side pointing the way it reaches, then turning so the palm lies on her with the
   * fingers along her and the wrist lifted, and doing what this touch does (resting, holding, stroking,
   * smacking, squeezing, pressing, tapping or tugging); or knocked away, or grabbing at nothing.
   */
  private poseHand(t: number, answer: TouchAnswer): void {
    const { hand } = this;
    if (!hand) return;
    const scale = hand.scale.x;
    const gesture = this.shot.gesture;
    const took = touchLands(answer);
    const n = this.normal;
    // A palm sits just off the skin; a tap or a press lands on the fingertips.
    const tips = gesture === "tap" || gesture === "press";
    const target = this.contact.clone().addScaledVector(n, (tips ? 0.03 : 0.015) * scale);

    let into = ease(span(t, T.reachFrom, T.contact));
    // A smack hangs back, then comes in fast.
    if (gesture === "smack") into = 0.55 * ease(span(t, T.reachFrom, T.contact - 0.25)) + 0.45 * span(t, T.contact - 0.08, T.contact) ** 2;
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
    const back = this.start.clone().sub(target).normalize();
    const position = new Vector3().lerpVectors(this.start, target, reach);

    // While it's on her, it does what this touch does.
    const on = span(t, T.contact, T.release);
    const there = took && on > 0 && on < 1;
    let press = 0;
    // The fingers: spread wide as it comes in, then closing on her for a grab, a grip or a tug.
    const closing = ease(span(t, T.contact - 0.05, T.contact + 0.2));
    const letGo = 1 - ease(span(t, T.release, T.release + 0.3));
    const grip: Partial<Record<Gesture, number>> = { squeeze: 0.75, hold: 0.45, tug: 0.9, rest: 0.15, stroke: 0.1, strokeUp: 0.1, press: 0.35, tap: 0.55 };
    let curl = took ? (grip[gesture] ?? 0) * closing * letGo : 0;
    if (there && gesture === "squeeze") curl += Math.abs(Math.sin(on * Math.PI * 3)) * 0.25;
    // Grabbing at air: snatches shut on nothing.
    if (answer === "pull") curl = ease(span(t, T.contact - 0.05, T.contact + 0.15)) * 0.95 * letGo;
    if (there) {
      const right = new Vector3(1, 0, 0);
      const up = new Vector3(0, 1, 0);
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
    const way = target.clone().sub(this.start).normalize();
    // On the side of her face the fingers point up her cheek, not across it.
    const along = this.shot.sideOfFace ? new Vector3(0, 1, 0) : way.clone();
    along.addScaledVector(n, -along.dot(n));
    if (along.lengthSq() < 1e-6) along.set(0, 1, 0);
    along.normalize();
    const dip = WRIST_LIFT + (tips ? 0.35 : 0) + press * 0.15;
    const fingersOn = along.clone().multiplyScalar(Math.cos(dip)).addScaledVector(n, -Math.sin(dip)).normalize();
    const reaching = this.orient(way, n.clone().negate().addScaledVector(way, -n.clone().negate().dot(way)).normalize());
    const lying = this.orient(fingersOn, n.clone().negate());
    const settle = ease(span(reach, 0.6, 1));
    hand.quaternion.copy(reaching).slerp(lying, settle);
    if (spin) hand.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), spin));

    this.arm?.curl(this.show?.fist ? 1 : Math.min(1, curl));
    // The arm's origin is its elbow: put it so the palm lands where it should.
    hand.position.copy(position).sub(this.palm.clone().multiplyScalar(scale).applyQuaternion(hand.quaternion));
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

  private render(): void {
    this.pose(this.time);
    const { renderer } = this;
    const previousTarget = renderer.getRenderTarget();
    const previousColor = renderer.getClearColor(new Color());
    const previousAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    renderer.readRenderTargetPixels(this.target, 0, 0, WIDTH, HEIGHT, this.pixels);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(previousColor, previousAlpha);
    this.drawPicture();
    this.ctx.putImageData(this.image, 0, 0);
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
    const bodySize = MathUtils.clamp(Math.hypot(reach.x - contact.x, reach.y - contact.y), 8, 40);
    return { mouth: at(MOUTH), temple, cheeks, cheekSize, contact, bodySize };
  }

  private drawFx(): void {
    const spots = this.plan ? this.fxSpots() : null;
    if (!this.plan || !spots) {
      this.fx.clear();
      return;
    }
    // Blush lines only on a face that's turned to the camera.
    const plan = this.faceShowing ? this.plan : { ...this.plan, blushLines: false };
    const fade = 1 - ease(span(this.time, T.release, T.popOut));
    // A held panel stops its own time just before the release: the effects carry on by the clock.
    this.fx.draw(plan, spots, this.clock - this.fxFrom, this.clock, fade);
  }

  private onPanel(point: Vector3): { x: number; y: number } {
    const p = point.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * WIDTH, y: ((1 - p.y) / 2) * HEIGHT };
  }

  /**
   * How pink her cheeks are: none for a slap, a little for a pull, more for letting it, flushed when she gives in,
   * most for leaning in.
   */
  private blush(): number {
    if (!this.show || this.show.words) return 0;
    const grow = ease(span(this.time, T.contact, T.contact + 0.6));
    const amount = { allow: 0.55, lean: 0.85, givein: 0.7, pull: 0.25, slap: 0 }[this.show.answer];
    return grow * amount;
  }

  /** Her over a warm candlelit glow, cheeks pinking up, all dithered to the game's 5-bit colour. */
  private drawPicture(): void {
    const { pixels } = this;
    const data = this.image.data;
    const glow = this.onPanel(this.glowAt);
    const reach = Math.hypot(WIDTH, HEIGHT) * 0.6;
    const blush = this.blush();
    // Only show a blush where the cheeks are in front of the camera, at the size they are on the panel.
    const cheeks = blush > 0 && this.faceShowing ? this.cheeks.map((c) => this.onPanel(c)) : [];
    let radius = 2.5;
    if (cheeks.length) {
      const edge = this.onPanel(this.cheeks[0].clone().add(new Vector3(0.028 * this.scale, 0, 0)));
      radius = Math.max(radius, Math.hypot(edge.x - cheeks[0].x, edge.y - cheeks[0].y));
    }
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const from = ((HEIGHT - 1 - y) * WIDTH + x) * 4;
        const to = (y * WIDTH + x) * 4;
        const threshold = (BAYER4[(x & 3) + ((y & 3) << 2)] / 16 - 0.46875) / LEVELS;
        let r: number;
        let g: number;
        let b: number;
        if (pixels[from + 3] >= 128) {
          r = linearToSrgb(pixels[from] / 255);
          g = linearToSrgb(pixels[from + 1] / 255);
          b = linearToSrgb(pixels[from + 2] / 255);
          for (const c of cheeks) {
            const k = Math.max(0, 1 - Math.hypot(x - c.x, y - c.y) / radius) * blush;
            if (k <= 0) continue;
            r = MathUtils.lerp(r, 0.95, k * 0.6);
            g = MathUtils.lerp(g, 0.42, k * 0.6);
            b = MathUtils.lerp(b, 0.48, k * 0.6);
          }
        } else {
          const k = Math.max(0, 1 - Math.hypot(x - glow.x, y - glow.y) / reach) ** 1.6;
          r = MathUtils.lerp(0.06, 0.42, k);
          g = MathUtils.lerp(0.04, 0.25, k);
          b = MathUtils.lerp(0.03, 0.11, k);
        }
        const dither = (c: number) => Math.round(MathUtils.clamp(Math.round((c + threshold) * LEVELS) / LEVELS, 0, 1) * 255);
        data[to] = dither(r);
        data[to + 1] = dither(g);
        data[to + 2] = dither(b);
        data[to + 3] = 255;
      }
    }
  }

  /** Bursts the panel in and out, shakes it on a hit, and pops each word in its turn. */
  private animate(t: number): void {
    const opening = span(t, 0, T.popIn);
    const closing = span(t, T.popOut, T.end);
    const spring = 1 - Math.cos(opening * Math.PI * 1.5) * Math.exp(-opening * 5) * (1 - opening);
    const scale = Math.max(0, opening < 1 ? spring : 1 - MathUtils.smootherstep(closing, 0, 1));
    const answer = this.show?.answer;
    const hitAt = answer === "slap" ? T.swing + 0.15 : T.contact;
    const hard = answer === "slap" || SMACK_TOUCHES.has(this.show?.id ?? "") || this.show?.region === "chest";
    const shake = answer !== "pull" && t > hitAt && t < hitAt + 0.15 ? Math.sin(t * 90) * (hard ? 5 : 2) : 0;
    this.root.style.transform = `translate(${shake}px, 0) rotate(${2 + (1 - opening) * 10}deg) scale(${scale})`;
    for (const { el, from, to, shake } of this.letters) {
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
    this.target.dispose();
    this.root.remove();
  }
}
