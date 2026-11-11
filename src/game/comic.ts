import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Matrix4,
  Object3D,
  PerspectiveCamera,
  Scene,
  SkinnedMesh,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { Effect } from "./audio";

/**
 * A panel that bursts open over the tavern when you take a drink with a guest, cut on the slant like a comic panel:
 * inside, your own character, rendered live from the real model in the game's dithered look, clinks mugs,
 * throws back their head and drains the lot. It plays by itself and doesn't hold up the conversation.
 */

/** The panel's size in game pixels; shown scaled up without smoothing, like the rest of the game. */
const WIDTH = 200;
const HEIGHT = 150;
/** 5-bit colour, matching the game's dithered screen. */
const LEVELS = 31;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** When each beat of the strip happens, in seconds from the panel popping up. */
const T = {
  /** The panel bursts open. */
  popIn: 0.3,
  /** The mug comes up in a toast. */
  toast: 0.35,
  /** The guest's mug comes in from the side. */
  clinkFrom: 0.45,
  clink: 0.7,
  /** Up to the lips. */
  lift: 1.15,
  /** Head back, three big swallows. */
  glug: 1.5,
  glugEnd: 2.85,
  /** Down it comes. */
  ahh: 3.15,
  popOut: 3.75,
  end: 4.1,
} as const;
const GULPS = 3;

/** Turns the character to look a little towards the guest, who toasts from the left of the panel. */
const TURN = -0.5;
/** How far the middle of the face is above the head bone, in model units. */
const FACE_ABOVE_NECK = 0.13;
/** How far back the camera stands from the face, in model units. */
const CAMERA_DISTANCE = 1.45;
/** Where a hand is along its forearm when the model gives no better idea. */
const FALLBACK_HAND = new Vector3(0, -0.3, 0.02);

/** Arm and head angles for one moment of the strip. Positive X swings a limb forwards; negative tips the head back. */
interface Pose {
  upper: number;
  /** Swings the right upper arm in across the chest (negative) or out (positive). */
  across: number;
  elbow: number;
  /** The upper arm's twist, so the forearm folds up towards the face instead of out to the side. */
  twist: number;
  torso: number;
  head: number;
  /** How far the mug is tipped towards the face. */
  tilt: number;
}

// For the torso and head, positive X tips them back. The arm angles at the lips are worked out for each body
// by `reach`, so the mug meets the mouth whatever shape the character is; these are only where it starts.
const REST: Pose = { upper: 0.15, across: 0.1, elbow: 0.25, twist: 0, torso: 0, head: 0, tilt: 0 };
const TOAST: Pose = { upper: 1.15, across: -0.05, elbow: 1.05, twist: 0, torso: 0.04, head: -0.05, tilt: -0.1 };
const LIPS: Pose = { upper: 1.0, across: -0.4, elbow: 1.9, twist: 0, torso: 0.06, head: 0.2, tilt: 0.75 };
const BOTTOMS_UP: Pose = { upper: 1.3, across: -0.4, elbow: 2.0, twist: 0, torso: 0.14, head: 0.55, tilt: 1.7 };
const CHEST: Pose = { upper: 0.55, across: -0.15, elbow: 1.35, twist: 0, torso: -0.04, head: -0.1, tilt: 0 };

/** Where the mouth is in the head bone's own space (the face looks down -Z), in model units. */
const MOUTH = new Vector3(0, 0.075, -0.1);
/** Where the mug's middle sits from the mouth, in the head's space, at the lips and tipped right up. */
const MUG_AT_LIPS = new Vector3(0, -0.04, -0.13);
const MUG_BOTTOMS_UP = new Vector3(0, 0.03, -0.12);

function mix(a: Pose, b: Pose, t: number): Pose {
  const k = MathUtils.smootherstep(t, 0, 1);
  const out = { ...a };
  for (const key of Object.keys(a) as (keyof Pose)[]) out[key] = MathUtils.lerp(a[key], b[key], k);
  return out;
}

/** 0 before `from`, 1 after `to`, straight in between. */
function span(t: number, from: number, to: number): number {
  return MathUtils.clamp((t - from) / (to - from), 0, 1);
}

/** The pose at a time in the strip, with the arm at the lips as `reach` found it for this body. */
export function poseAt(t: number, LIPS: Pose, BOTTOMS_UP: Pose): Pose {
  if (t < T.toast) return mix(REST, TOAST, span(t, 0, T.toast));
  if (t < T.clink + 0.25) return TOAST;
  if (t < T.lift) return mix(TOAST, LIPS, span(t, T.clink + 0.25, T.lift));
  if (t < T.glug) return mix(LIPS, BOTTOMS_UP, span(t, T.lift, T.glug));
  if (t < T.glugEnd) {
    // Each swallow bobs the head and tips the mug a little further.
    const gulp = Math.sin(span(t, T.glug, T.glugEnd) * Math.PI * GULPS);
    const pose = { ...BOTTOMS_UP };
    pose.head += Math.abs(gulp) * 0.08;
    pose.tilt += span(t, T.glug, T.glugEnd) * 0.25;
    return pose;
  }
  if (t < T.ahh) return mix({ ...BOTTOMS_UP, tilt: BOTTOMS_UP.tilt + 0.25 }, CHEST, span(t, T.glugEnd, T.ahh));
  return CHEST;
}

/**
 * The panel's outline as a CSS polygon: a comic panel cut on the slant, each side at its own angle, with one
 * corner clipped off, so it reads as a panel from a strip rather than a window.
 */
export const PANEL_SHAPE = "polygon(5% 0%, 100% 6%, 96% 88%, 88% 100%, 0% 93%)";

/** The sounds lettered over the panel, and when each one shows. */
interface Lettering {
  el: HTMLElement;
  from: number;
  to: number;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/**
 * Where the hand is in the forearm's own space: the far end of the skin the forearm moves, so a mug can be
 * put in it whatever shape the look has given the arm.
 */
function handOf(model: Object3D, forearm: Object3D): Vector3 {
  model.updateMatrixWorld(true);
  const local = new Vector3();
  const bind = new Matrix4();
  const found: Vector3[] = [];
  model.traverse((object) => {
    if (!(object instanceof SkinnedMesh) || !object.visible) return;
    const bone = object.skeleton.bones.indexOf(forearm as never);
    if (bone < 0) return;
    const position = object.geometry.getAttribute("position");
    const indices = object.geometry.getAttribute("skinIndex");
    const weights = object.geometry.getAttribute("skinWeight");
    if (!indices || !weights) return;
    bind.multiplyMatrices(object.skeleton.boneInverses[bone], object.bindMatrix);
    for (let i = 0; i < position.count; i++) {
      let weight = 0;
      for (let k = 0; k < 4; k++) if (indices.getComponent(i, k) === bone) weight += weights.getComponent(i, k);
      if (weight < 0.6) continue;
      found.push(local.fromBufferAttribute(position, i).applyMatrix4(bind).clone());
    }
  });
  if (found.length === 0) return FALLBACK_HAND.clone();
  // The hand is the last stretch of the arm: average what lies in it.
  const lowest = Math.min(...found.map((v) => v.y));
  const palm = found.filter((v) => v.y < lowest * 0.8);
  const middle = palm.reduce((sum, v) => sum.add(v), new Vector3()).divideScalar(palm.length);
  // Hold it in the palm rather than at the fingertips.
  middle.y *= 0.92;
  return middle;
}

export class DrinkComic {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(30, WIDTH / HEIGHT, 0.05, 20);
  private readonly target = new WebGLRenderTarget(WIDTH, HEIGHT);
  private readonly pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly letters: Lettering[] = [];

  /** The character in the panel, turned to face the camera, and the bones the strip moves. */
  private model: Object3D | null = null;
  private bones: { torso: Object3D; head: Object3D; upper: Object3D; fore: Object3D; upperL: Object3D; foreL: Object3D } | null = null;
  private hand = new Vector3();
  private readonly mug: Object3D;
  private readonly theirMug: Object3D;
  /** Where the face is in the panel scene, which the candlelight behind centres on. */
  private readonly face = new Vector3();
  private readonly clinkAt = new Vector3();
  /** The drinking poses, with the arm fitted to this body. */
  private lips: Pose = LIPS;
  private bottomsUp: Pose = BOTTOMS_UP;

  private time = 0;
  private active = false;
  private drunk = 0;
  /** Sounds already played on this showing, so each plays once. */
  private readonly played = new Set<string>();

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly root: HTMLElement,
    makeMug: () => Object3D,
    private readonly sound: (effect: Effect) => void,
  ) {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d")!;
    this.image = this.ctx.createImageData(WIDTH, HEIGHT);

    // The slanted shape is cut twice: a rim, and the picture just inside it.
    const edge = PANEL_SHAPE;
    const rim = document.createElement("div");
    rim.className = "rim";
    rim.style.clipPath = edge;
    const picture = document.createElement("div");
    picture.className = "picture";
    picture.style.clipPath = edge;
    picture.append(this.canvas);
    root.append(rim, picture);

    const letter = (text: string, kind: string, from: number, to: number) => {
      const el = document.createElement("div");
      el.className = `sfx ${kind}`;
      el.textContent = text;
      root.append(el);
      this.letters.push({ el, from, to });
    };
    letter("*clink*", "clink", T.clink, T.clink + 0.75);
    const gulp = (T.glugEnd - T.glug) / GULPS;
    for (let i = 0; i < GULPS; i++) letter("glug", `glug glug${i + 1}`, T.glug + i * gulp, T.glugEnd + 0.15);
    letter("ahh!", "ahh", T.ahh - 0.1, T.end);

    // Lit like the conversation portraits: warm from the front, a cool rim behind.
    this.scene.add(new AmbientLight(0x6a6480, 0.9));
    this.scene.add(new HemisphereLight(0xb8c4e0, 0x3a2414, 0.7));
    const key = new DirectionalLight(0xffd0a0, 2.6);
    key.position.set(-1.5, 2.5, 3);
    const back = new DirectionalLight(0x8fa4d0, 2.2);
    back.position.set(2, 2, -2.5);
    this.scene.add(key, back);

    // Each mug sits centred in a holder, so it turns about its middle.
    const holder = () => {
      const group = new Group();
      const mug = makeMug();
      mug.position.set(0, 0, 0);
      mug.updateMatrixWorld(true);
      mug.position.sub(new Box3().setFromObject(mug).getCenter(new Vector3()));
      group.add(mug);
      return group;
    };
    this.mug = holder();
    this.theirMug = holder();
  }

  get playing(): boolean {
    return this.active;
  }

  /**
   * Shows the strip for this character: `body` is a sibling's own model, posed however it stands now, and
   * `name` its body name. `drunk`, from 0 to 1, makes them sway once it's down.
   */
  play(body: Object3D, name: string, drunk: number): void {
    this.clear();
    const model = cloneSkinned(body);
    model.position.set(0, 0, 0);
    // The model faces -Z at rest; turn it round to face the camera, angled towards the guest.
    model.rotation.set(0, Math.PI + TURN, 0);
    model.visible = true;
    const part = (label: string) => model.getObjectByName(`${name}_${label}`);
    const torso = part("Torso");
    const head = part("Head");
    const upper = part("UpperArm_R");
    const fore = part("ForeArm_R");
    const upperL = part("UpperArm_L");
    const foreL = part("ForeArm_L");
    if (!torso || !head || !upper || !fore || !upperL || !foreL) return;
    this.scene.add(model);
    this.model = model;
    this.bones = { torso, head, upper, fore, upperL, foreL };
    this.hand = handOf(model, fore);
    model.add(this.mug, this.theirMug);
    this.drunk = drunk;
    this.lips = this.reach(LIPS, MUG_AT_LIPS);
    this.bottomsUp = this.reach(BOTTOMS_UP, MUG_BOTTOMS_UP);

    // Frame the head and shoulders, leaving room beside them for the toast.
    this.pose(0);
    // The head bone sits at the neck; the face is a little above it.
    const scale = model.getWorldScale(new Vector3()).y;
    head.getWorldPosition(this.face);
    this.face.y += FACE_ABOVE_NECK * scale;
    const look = this.face.clone().add(new Vector3(-0.1 * scale, -0.1 * scale, 0));
    this.camera.position.set(look.x + 0.25 * scale, look.y + 0.05 * scale, look.z + CAMERA_DISTANCE * scale);
    this.camera.lookAt(look);
    // The guest's mug meets yours where the toast puts it.
    this.pose(T.clink);
    this.clinkAt.copy(this.mug.position);

    this.time = 0;
    this.active = true;
    this.played.clear();
    this.root.classList.add("open");
    this.render();
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    const t = this.time;
    if (t >= T.clink && !this.played.has("clink")) {
      this.played.add("clink");
      this.sound("cheers");
    }
    if (t >= T.glug + 0.1 && !this.played.has("glug")) {
      this.played.add("glug");
      this.sound("drink");
    }
    if (t >= T.end) {
      this.clear();
      return;
    }
    this.render();
  }

  /** Takes the panel down at once. */
  clear(): void {
    this.active = false;
    this.root.classList.remove("open");
    this.root.style.transform = "";
    if (this.model) {
      this.model.remove(this.mug, this.theirMug);
      this.scene.remove(this.model);
    }
    this.model = null;
    this.bones = null;
  }

  /**
   * Finds the arm angles that bring the hand to `offset` from the mouth (in the head's own space) with the
   * body otherwise in `pose`. The elbow only bends one way, so the upper arm has to twist to fold the hand in
   * towards the face: a coarse search over the shoulder's three angles and the elbow, then finer ones round the best.
   */
  private reach(pose: Pose, offset: Vector3): Pose {
    const { model, bones } = this;
    if (!model || !bones) return pose;
    bones.torso.rotation.set(pose.torso, 0, 0);
    bones.head.rotation.set(pose.head, 0, 0);
    model.updateMatrixWorld(true);
    const goal = bones.head.localToWorld(MOUTH.clone().add(offset));
    const hand = new Vector3();
    type Arm = Pick<Pose, "upper" | "across" | "twist" | "elbow">;
    const miss = (arm: Arm) => {
      bones.upper.rotation.set(arm.upper, arm.twist, arm.across);
      bones.fore.rotation.set(arm.elbow, 0, 0);
      bones.upper.updateMatrixWorld(true);
      return bones.fore.localToWorld(hand.copy(this.hand)).distanceTo(goal);
    };
    const { clamp } = MathUtils;
    let best: Arm = { upper: pose.upper, across: pose.across, twist: pose.twist, elbow: pose.elbow };
    let bestMiss = miss(best);
    for (const step of [0.4, 0.15, 0.05, 0.02]) {
      const around = best;
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          for (let k = -2; k <= 2; k++) {
            for (let l = -2; l <= 2; l++) {
              const arm = {
                upper: clamp(around.upper + i * step, 0, 2.8),
                across: clamp(around.across + j * step, -1.8, 0.4),
                twist: clamp(around.twist + k * step, -1.6, 1.6),
                elbow: clamp(around.elbow + l * step, 0, 2.6),
              };
              const m = miss(arm);
              if (m < bestMiss) {
                bestMiss = m;
                best = arm;
              }
            }
          }
        }
      }
    }
    return { ...pose, ...best };
  }

  /** Moves the character and both mugs to time `t` of the strip. */
  private pose(t: number): void {
    const { model, bones } = this;
    if (!model || !bones) return;
    const p = poseAt(t, this.lips, this.bottomsUp);
    // Once it's down, a drunk sways a little where they stand.
    const sway = t > T.glugEnd ? Math.sin(t * 3.2) * 0.07 * (0.4 + this.drunk) : 0;
    bones.torso.rotation.set(p.torso, 0, sway);
    bones.head.rotation.set(p.head, 0, -sway * 0.6);
    bones.upper.rotation.set(p.upper, p.twist, p.across);
    bones.fore.rotation.set(p.elbow, 0, 0);
    bones.upperL.rotation.set(0.1, 0, -0.08);
    bones.foreL.rotation.set(0.2, 0, 0);
    model.updateMatrixWorld(true);

    // Your mug sits in your hand, turned so the handle faces out, tipped towards your face.
    const inHand = bones.fore.localToWorld(this.hand.clone());
    model.worldToLocal(inHand);
    this.mug.position.copy(inHand);
    this.mug.rotation.set(p.tilt, -Math.PI / 2, 0, "XYZ");
    // A clink knocks it back a touch.
    if (t > T.clink && t < T.clink + 0.25) this.mug.rotation.z = Math.sin(span(t, T.clink, T.clink + 0.25) * Math.PI) * 0.18;

    // The guest's mug swings in from off the panel, knocks yours, and goes back the way it came.
    const there = span(t, T.clinkFrom, T.clink);
    const away = span(t, T.clink + 0.2, T.lift);
    const reach = MathUtils.smootherstep(there, 0, 1) * (1 - MathUtils.smootherstep(away, 0, 1));
    this.theirMug.visible = reach > 0.001;
    // The character faces the camera, so the panel's left is their right: +X in their own space.
    const start = this.clinkAt.clone().add(new Vector3(0.75, -0.25, -0.15));
    const meet = this.clinkAt.clone().add(new Vector3(0.13, 0, -0.02));
    this.theirMug.position.lerpVectors(start, meet, reach);
    this.theirMug.rotation.set(-0.1, Math.PI / 2, -0.35 * (1 - reach) - 0.1, "XYZ");
  }

  private render(): void {
    const t = this.time;
    this.pose(t);

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
    this.animate(t);
  }

  /** Where a point in the panel scene lands on the panel, in game pixels. */
  private onPanel(point: Vector3): { x: number; y: number } {
    const p = point.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * WIDTH, y: ((1 - p.y) / 2) * HEIGHT };
  }

  /**
   * The character over a warm candlelit glow, both dithered down to the game's 5-bit colour.
   * Render targets hold linear colour bottom-up: convert to sRGB and flip the rows.
   */
  private drawPicture(): void {
    const { pixels } = this;
    const data = this.image.data;
    const glow = this.onPanel(this.face);
    const reach = Math.hypot(WIDTH, HEIGHT) * 0.6;
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
        } else {
          // Candlelight behind the head, fading out to the dark of the room.
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

  /** Bursts the panel in and out, and each sound in its turn. */
  private animate(t: number): void {
    const opening = span(t, 0, T.popIn);
    const closing = span(t, T.popOut, T.end);
    // An overshooting spring on the way in, a quick shrink on the way out.
    const spring = 1 - Math.cos(opening * Math.PI * 1.5) * Math.exp(-opening * 5) * (1 - opening);
    const scale = Math.max(0, opening < 1 ? spring : 1 - MathUtils.smootherstep(closing, 0, 1));
    const shake = t > T.clink && t < T.clink + 0.15 ? Math.sin(t * 90) * 4 : 0;
    const gulpShake = t > T.glug && t < T.glugEnd ? Math.sin(t * 40) * 1.2 : 0;
    this.root.style.transform = `translate(${shake + gulpShake}px, 0) rotate(${-2 + (1 - opening) * -10}deg) scale(${scale})`;

    for (const { el, from, to } of this.letters) {
      const on = t >= from && t < to;
      el.classList.toggle("on", on);
      if (!on) continue;
      const pop = span(t, from, from + 0.18);
      const size = pop < 1 ? 0.3 + pop * 0.95 : 1.25 - Math.min(0.25, (t - from - 0.18) * 1.2);
      el.style.setProperty("--pop", String(size));
    }
  }

  dispose(): void {
    this.clear();
    this.target.dispose();
  }
}
