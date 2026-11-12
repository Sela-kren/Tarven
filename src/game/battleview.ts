import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

/**
 * The big picture of her during a fight, the way Karryn's Prison shows Karryn the whole time she battles: her
 * whole body, rendered live from her own model (so whatever's come off her and whatever men have left on her
 * shows), breathing, flushing as she gets worked up and trembling on the edge, flinching when she's hit. A
 * status board under her says how she stands; the close-up comic panels pop in over her for each moment.
 *
 * It's drawn small and shown scaled up without smoothing, dithered to the game's 5-bit colour like the comics.
 */

const WIDTH = 168;
const HEIGHT = 280;
const LEVELS = 31;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** A brawl, or an after-hours game: the light, and how she stands. */
export type BattleMode = "brawl" | "duel";

/** One line of the status board: a label, and what it says. */
export interface BattleStat {
  label: string;
  value: string;
  /** A colour cue: "hot" for desire, "hurt" for a beating, "cum" for what's on her. */
  tone?: "hot" | "hurt" | "cum";
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export class BattleView {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(28, WIDTH / HEIGHT, 0.05, 30);
  private readonly target = new WebGLRenderTarget(WIDTH, HEIGHT);
  private readonly pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly root: HTMLElement;
  private readonly board: HTMLElement;
  private readonly title: HTMLElement;

  private model: Object3D | null = null;
  private bones: { torso: Object3D | null; head: Object3D | null; hips: Object3D | null } = { torso: null, head: null, hips: null };
  private readonly cheeks = [new Vector3(), new Vector3()];
  private scale = 1;
  private mode: BattleMode = "duel";
  private time = 0;
  private active = false;
  /** How worked up she is, 0 to 1 (the blush, her breathing), and whether she's on the edge (she trembles). */
  private heat = 0;
  private shownHeat = 0;
  private edge = false;
  /** A flinch from a hit or a jolt, fading. */
  private flinch = 0;
  private flinchHard = false;

  constructor(private readonly renderer: WebGLRenderer) {
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d")!;
    this.image = this.ctx.createImageData(WIDTH, HEIGHT);

    this.root = document.createElement("div");
    this.root.id = "battle-view";
    this.root.setAttribute("aria-hidden", "true");
    const frame = document.createElement("div");
    frame.className = "frame";
    this.title = document.createElement("div");
    this.title.className = "nameplate";
    const picture = document.createElement("div");
    picture.className = "picture";
    picture.append(this.canvas);
    const flash = document.createElement("div");
    flash.className = "flash";
    this.board = document.createElement("div");
    this.board.className = "status";
    frame.append(picture, flash, this.title);
    this.root.append(frame, this.board);
    document.body.append(this.root);

    this.scene.add(new AmbientLight(0x6a6480, 0.95));
    this.scene.add(new HemisphereLight(0xb8c4e0, 0x3a2414, 0.7));
    const key = new DirectionalLight(0xffd0a0, 2.6);
    key.position.set(-1.5, 2.5, 3);
    const back = new DirectionalLight(0x8fa4d0, 2.0);
    back.position.set(2, 2, -2.5);
    this.scene.add(key, back);
  }

  get open(): boolean {
    return this.active;
  }

  /**
   * Shows her, or shows her again as she is now: `body` is her own model as it stands in the room (dressed or
   * not, coated or not), and `name` its body name. Call it again whenever her clothes or what's on her change.
   */
  show(body: Object3D, name: string, mode: BattleMode, title: string): void {
    if (this.model) this.scene.remove(this.model);
    const model = cloneSkinned(body);
    model.position.set(0, 0, 0);
    // Turned a little toward the fight on the right, like Karryn facing her enemies.
    model.rotation.set(0, Math.PI - 0.35, 0);
    model.visible = true;
    this.scene.add(model);
    model.updateMatrixWorld(true);
    const part = (label: string) => model.getObjectByName(`${name}_${label}`) ?? null;
    this.bones = { torso: part("Torso"), head: part("Head"), hips: part("Hips") };
    this.model = model;
    this.scale = model.getWorldScale(new Vector3()).y;

    // Frame her whole body: from the top of her head to her feet, with a little room.
    const head = this.bones.head?.getWorldPosition(new Vector3()) ?? new Vector3(0, 1.6 * this.scale, 0);
    const top = head.y + 0.18 * this.scale;
    const middle = top / 2;
    const fov = MathUtils.degToRad(this.camera.fov);
    const distance = ((top * 1.08) / 2 / Math.tan(fov / 2));
    this.camera.position.set(0.25 * this.scale, middle + 0.05 * this.scale, distance);
    this.camera.lookAt(0, middle, 0);

    if (!this.active || this.mode !== mode) this.time = 0;
    this.mode = mode;
    this.title.textContent = title;
    this.root.classList.toggle("brawl", mode === "brawl");
    this.active = true;
    this.root.classList.add("open");
    this.render();
  }

  /** How worked up she is, 0 to 1, and whether she's on the edge. */
  setHeat(heat: number, edge: boolean): void {
    this.heat = MathUtils.clamp(heat, 0, 1);
    this.edge = edge;
  }

  /** She's hit (a brawl) or jolted (a duel): a flinch, and a flash over the picture. */
  hit(hard: boolean): void {
    this.flinch = 1;
    this.flinchHard = hard;
    const flash = this.root.querySelector(".flash");
    if (!flash) return;
    flash.classList.remove("on", "hurt", "hot");
    // Restart the flash's animation.
    void (flash as HTMLElement).offsetWidth;
    flash.classList.add("on", this.mode === "brawl" ? "hurt" : "hot");
  }

  /** The status board under her: how she stands, line by line. */
  setStatus(stats: readonly BattleStat[]): void {
    this.board.replaceChildren(
      ...stats.map((stat) => {
        const row = document.createElement("div");
        row.className = `row${stat.tone ? ` ${stat.tone}` : ""}`;
        const label = document.createElement("span");
        label.textContent = stat.label;
        const value = document.createElement("b");
        value.textContent = stat.value;
        row.append(label, value);
        return row;
      }),
    );
  }

  hide(): void {
    this.active = false;
    this.root.classList.remove("open");
    if (this.model) this.scene.remove(this.model);
    this.model = null;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    this.flinch = Math.max(0, this.flinch - dt * 2.2);
    this.shownHeat = MathUtils.damp(this.shownHeat, this.heat, 3, dt);
    this.render();
  }

  /** Breathing, faster and deeper the hotter she is; a tremble on the edge; a flinch when hit. */
  private pose(): void {
    const { model, bones } = this;
    if (!model) return;
    const t = this.time;
    const heat = this.shownHeat;
    const rate = 1.6 + heat * 2.4;
    const breath = Math.sin(t * rate) * (0.02 + heat * 0.03);
    const tremble = this.edge ? Math.sin(t * 41) * 0.012 + Math.sin(t * 29) * 0.008 : 0;
    const f = this.flinch * this.flinch;
    if (bones.torso) bones.torso.rotation.set(breath - f * (this.flinchHard ? 0.25 : 0.12), tremble, 0);
    if (bones.head) {
      // Head tips back a little as she gets hotter; snaps aside when hit.
      bones.head.rotation.set(-heat * 0.12 + f * 0.1, (this.flinchHard ? f * 0.45 : 0) + tremble * 2, heat * 0.08);
    }
    if (bones.hips) bones.hips.rotation.y = Math.sin(t * 0.7) * 0.03 * (0.5 + heat);
    model.position.x = this.flinchHard ? -f * 0.05 * this.scale : 0;
    model.updateMatrixWorld(true);
    if (bones.head) {
      bones.head.localToWorld(this.cheeks[0].set(0.045, 0.1, -0.085));
      bones.head.localToWorld(this.cheeks[1].set(-0.045, 0.1, -0.085));
    }
  }

  private onPicture(point: Vector3): { x: number; y: number } {
    const p = point.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * WIDTH, y: ((1 - p.y) / 2) * HEIGHT };
  }

  private render(): void {
    this.pose();
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
    this.draw();
    this.ctx.putImageData(this.image, 0, 0);
  }

  /** Her over the room's glow (candlelight after hours, cold lamplight in a brawl), cheeks pinking with heat. */
  private draw(): void {
    const { pixels } = this;
    const data = this.image.data;
    const heat = this.shownHeat;
    const brawl = this.mode === "brawl";
    const cheeks = heat > 0.05 ? this.cheeks.map((c) => this.onPicture(c)) : [];
    const radius = Math.max(2, (0.03 * this.scale * HEIGHT) / (this.camera.position.z * Math.tan(MathUtils.degToRad(this.camera.fov) / 2) * 2));
    const glowX = WIDTH * 0.5;
    const glowY = HEIGHT * 0.38;
    const reach = Math.hypot(WIDTH, HEIGHT) * 0.55;
    // After hours the room glows warmer and pinker the hotter she is.
    const warm = brawl ? [0.2, 0.17, 0.16] : [0.42 + heat * 0.18, 0.22 - heat * 0.04, 0.12 + heat * 0.12];
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
            const k = Math.max(0, 1 - Math.hypot(x - c.x, y - c.y) / radius) * heat;
            if (k <= 0) continue;
            r = MathUtils.lerp(r, 0.95, k * 0.6);
            g = MathUtils.lerp(g, 0.42, k * 0.6);
            b = MathUtils.lerp(b, 0.48, k * 0.6);
          }
        } else {
          const k = Math.max(0, 1 - Math.hypot(x - glowX, y - glowY) / reach) ** 1.5;
          r = MathUtils.lerp(0.05, warm[0], k);
          g = MathUtils.lerp(0.035, warm[1], k);
          b = MathUtils.lerp(0.03, warm[2], k);
          // A floor under her feet.
          if (y > HEIGHT * 0.9) {
            r *= 0.8;
            g *= 0.75;
            b *= 0.7;
          }
        }
        const dither = (c: number) => Math.round(MathUtils.clamp(Math.round((c + threshold) * LEVELS) / LEVELS, 0, 1) * 255);
        data[to] = dither(r);
        data[to + 1] = dither(g);
        data[to + 2] = dither(b);
        data[to + 3] = 255;
      }
    }
  }

  dispose(): void {
    this.hide();
    this.target.dispose();
    this.root.remove();
  }
}
