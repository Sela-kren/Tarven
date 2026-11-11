import {
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import type { Effect } from "./audio";
import { PANEL_SHAPE } from "./comic";
import { Jiggle } from "./jiggle";
import type { TouchAnswer, TouchRegion } from "./touch";
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

/** How the panel frames her: on the face, the chest and arms, or the hips. */
type Framing = "head" | "torso" | "hips";
const FRAMING: Record<TouchRegion, Framing> = {
  hand: "torso",
  face: "head",
  hair: "head",
  shoulder: "torso",
  waist: "hips",
  rear: "hips",
  chest: "torso",
  lap: "hips",
  lips: "head",
  neck: "head",
  thigh: "hips",
  clothes: "torso",
  invite: "head",
};
/** How far back the camera stands for each framing, in model units. */
const DISTANCE: Record<Framing, number> = { head: 1.3, torso: 2.0, hips: 1.9 };

/**
 * Where each touch lands: a bone, and an offset from it in the model's own space, where the front is -Z, so
 * the point sits on the skin rather than inside the body.
 */
const CONTACT: Record<TouchRegion, { bone: string; offset: [number, number, number] }> = {
  hand: { bone: "ForeArm_R", offset: [0, -0.3, -0.02] },
  face: { bone: "Head", offset: [-0.07, 0.12, -0.07] },
  hair: { bone: "Head", offset: [-0.09, 0.2, 0] },
  shoulder: { bone: "UpperArm_R", offset: [0, 0.02, 0] },
  waist: { bone: "Hips", offset: [-0.14, 0.12, -0.04] },
  rear: { bone: "Hips", offset: [-0.02, -0.08, 0.15] },
  chest: { bone: "Torso", offset: [-0.06, 0.26, -0.14] },
  lap: { bone: "Thigh_R", offset: [0, -0.12, -0.1] },
  lips: { bone: "Head", offset: [0, 0.075, -0.13] },
  neck: { bone: "Head", offset: [-0.06, 0.0, -0.04] },
  thigh: { bone: "Thigh_R", offset: [-0.04, -0.15, -0.09] },
  clothes: { bone: "Torso", offset: [-0.08, 0.1, -0.13] },
  invite: { bone: "Head", offset: [-0.1, 0.06, -0.16] },
};
/** The soft part a touch sets bouncing, if any. */
const SOFT: Partial<Record<TouchRegion, string[]>> = { rear: ["Glute_L", "Glute_R"], chest: ["Bust"], lap: ["Glute_L", "Glute_R", "Bust"] };
/** Springs for the panel's own copy of the soft parts: only kicks move them. */
const SPRING = { frequency: 2.3, damping: 0.16, gain: 0, axes: [0.35, 1, 0.35] as const, limit: 0.03 };

/** Sleeves the hand comes out of, by who's reaching. */
const SLEEVE: Record<GuestKind, number> = { farmer: 0x7a5a36, soldier: 0x8c2a22, smuggler: 0x2c2a30, fugitive: 0x5a5e66 };
const SKIN = 0xd29a76;

/** The sounds lettered over the panel. */
interface Lettering {
  el: HTMLElement;
  from: number;
  to: number;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function span(t: number, from: number, to: number): number {
  return MathUtils.clamp((t - from) / (to - from), 0, 1);
}

const ease = (t: number) => MathUtils.smootherstep(t, 0, 1);

/** A plain blocky hand coming out of a sleeve, fingers along +Z so it can be pointed at what it reaches for. */
function makeHand(sleeve: number): { hand: Group; fingers: Group } {
  const skin = new MeshStandardMaterial({ color: SKIN, roughness: 0.85 });
  const cloth = new MeshStandardMaterial({ color: sleeve, roughness: 0.95 });
  const hand = new Group();
  const palm = new Mesh(new BoxGeometry(0.1, 0.035, 0.1), skin);
  hand.add(palm);
  const fingers = new Group();
  fingers.position.z = 0.045;
  for (let i = 0; i < 4; i++) {
    const finger = new Mesh(new BoxGeometry(0.021, 0.022, 0.075), skin);
    finger.position.set(-0.036 + i * 0.024, 0, 0.035);
    fingers.add(finger);
  }
  hand.add(fingers);
  const thumb = new Mesh(new BoxGeometry(0.02, 0.022, 0.05), skin);
  thumb.position.set(0.05, 0, 0.01);
  thumb.rotation.y = -0.6;
  hand.add(thumb);
  // Just a cuff and a little forearm: the rest of the arm is off the panel.
  const cuff = new Mesh(new CylinderGeometry(0.038, 0.045, 0.26, 8), cloth);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = -0.18;
  hand.add(cuff);
  return { hand, fingers };
}

export interface TouchShow {
  region: TouchRegion;
  answer: TouchAnswer;
  /** The touch, for the words lettered over it. */
  id: string;
  kind: GuestKind;
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
  private hand: Group | null = null;
  private fingers: Group | null = null;
  private jiggles: Jiggle[] = [];
  private show: TouchShow | null = null;
  private turn = 0;
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
  private active = false;
  private readonly played = new Set<string>();

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly sound: (effect: Effect) => void,
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
    picture.append(this.canvas);
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
    // Facing the camera, angled toward the guest on the panel's left; for the backside, turned away, looking back.
    this.turn = show.region === "rear" ? 0.65 : Math.PI - 0.5;
    model.rotation.set(0, this.turn, 0);
    model.visible = true;
    const part = (label: string) => model.getObjectByName(`${name}_${label}`);
    const torso = part("Torso");
    const head = part("Head");
    const upper = part("UpperArm_R");
    const fore = part("ForeArm_R");
    const anchor = part(CONTACT[show.region].bone) ?? torso;
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
    const [x, y, z] = CONTACT[show.region].offset;
    this.contact.copy(model.localToWorld(local.add(new Vector3(x, y, z))));

    // Frame on the face, the chest, or the hips, with room on the left for the hand to come in.
    const framing = FRAMING[show.region];
    const focus = new Vector3();
    if (framing === "head") head.getWorldPosition(focus).add(new Vector3(0, 0.08 * scale, 0));
    else if (framing === "torso") torso.getWorldPosition(focus).add(new Vector3(0, 0.12 * scale, 0));
    else (part("Hips") ?? torso).getWorldPosition(focus).add(new Vector3(0, -0.04 * scale, 0));
    const look = focus.clone().lerp(this.contact, 0.35).add(new Vector3(-0.06 * scale, 0, 0));
    this.camera.position.set(look.x + 0.2 * scale, look.y + 0.02 * scale, look.z + DISTANCE[framing] * scale);
    this.camera.lookAt(look);
    this.glowAt.copy(focus);

    // The hand comes from off the panel's left, a little low and nearer the camera.
    this.start.copy(this.contact).add(new Vector3(-0.85 * scale, -0.2 * scale, 0.35 * scale));
    const { hand, fingers } = makeHand(SLEEVE[show.kind]);
    hand.scale.setScalar(scale);
    this.scene.add(hand);
    this.hand = hand;
    this.fingers = fingers;

    this.makeLetters(show);
    this.time = 0;
    this.active = true;
    this.played.clear();
    this.root.classList.add("open");
    this.render();
  }

  update(dt: number): void {
    if (!this.active || !this.show) return;
    this.time += dt;
    const t = this.time;
    const { answer, region } = this.show;
    if (t >= T.contact && !this.played.has("contact")) {
      this.played.add("contact");
      if (answer === "allow" || answer === "lean") {
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
    this.fingers = null;
    this.jiggles = [];
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
    const after = T.contact;
    switch (show.answer) {
      case "allow":
      case "lean": {
        const hit = show.id === "smack" ? "SMACK!" : show.region === "rear" || show.region === "chest" ? "squeeze" : show.region === "lips" ? "mwah" : show.region === "clothes" ? "tug!" : "touch";
        letter(hit, "hit", after, after + 0.9);
        letter(show.answer === "lean" ? "mmh~" : "eep!", "voice", after + 0.35, T.popOut);
        if (show.answer === "lean") letter("♥", "heart", after + 0.6, T.popOut);
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
    if (answer === "allow") {
      // A jolt as it lands, then still, head ducked shyly.
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
    bones.torso.rotation.set(torsoX, torsoY, 0);
    bones.head.rotation.set(headX, headY, headZ);
    bones.upper.rotation.set(upper, 0, across);
    bones.fore.rotation.set(elbow, 0, 0);
    // Pulling away also sways the whole of her back from the hand.
    model.rotation.y = this.turn + (answer === "pull" ? ease(span(t, T.swing, T.contact)) * fade * 0.4 : 0);
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

  /** The guest's hand: in from the side, then on her, knocked away, or grabbing at nothing. */
  private poseHand(t: number, answer: TouchAnswer): void {
    const { hand, fingers } = this;
    if (!hand || !fingers) return;
    const scale = hand.scale.x;
    const into = ease(span(t, T.reachFrom, T.contact));
    const out = ease(span(t, T.release, T.popOut));
    let reach = into * (1 - out);
    let spin = 0;
    const position = new Vector3();
    if (answer === "slap") {
      // Stops just short, then is knocked off back the way it came, spinning.
      const knocked = ease(span(t, T.swing + 0.15, T.swing + 0.55));
      reach = Math.min(into, 0.85) * (1 - knocked);
      spin = knocked * 2.5;
    } else if (answer === "pull") {
      // Gets there, finds nothing, and hangs about grabbing at air.
      reach = into * (1 - out);
    }
    position.lerpVectors(this.start, this.contact, reach);
    // It stops on the skin rather than in it.
    position.add(this.start.clone().sub(this.contact).normalize().multiplyScalar(0.05 * scale));
    hand.position.copy(position);
    hand.lookAt(this.contact);
    hand.rotateZ(spin);
    // A squeeze, a stroke, or a grab at air, while it's there.
    const on = span(t, T.contact, T.release);
    const curl = answer === "allow" || answer === "lean" ? 0.25 + Math.sin(on * Math.PI * 4) * 0.15 : answer === "pull" ? Math.abs(Math.sin(on * Math.PI * 6)) * 0.6 : 0;
    fingers.rotation.x = on > 0 && on < 1 ? curl : 0;
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
  }

  private onPanel(point: Vector3): { x: number; y: number } {
    const p = point.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * WIDTH, y: ((1 - p.y) / 2) * HEIGHT };
  }

  /** How pink her cheeks are: none for a slap, a little for a pull, more for letting it, most for leaning in. */
  private blush(): number {
    if (!this.show) return 0;
    const grow = ease(span(this.time, T.contact, T.contact + 0.6));
    const amount = { allow: 0.55, lean: 0.85, pull: 0.25, slap: 0 }[this.show.answer];
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
    const hard = answer === "slap" || this.show?.id === "smack" || this.show?.region === "chest";
    const shake = answer !== "pull" && t > hitAt && t < hitAt + 0.15 ? Math.sin(t * 90) * (hard ? 5 : 2) : 0;
    this.root.style.transform = `translate(${shake}px, 0) rotate(${2 + (1 - opening) * 10}deg) scale(${scale})`;
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
    this.root.remove();
  }
}
