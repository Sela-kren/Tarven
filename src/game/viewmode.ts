import { MathUtils, PerspectiveCamera, Vector3 } from "three";
import { CameraCollider } from "./camcollide";
import { BEAM_DEPTH, CEILING_HEIGHT, showCloseView, wallClearance } from "./closeview";
import type { Aim, Game } from "./game";
import type { Input } from "./input";

/**
 * The camera views during play, stepped through with < and > (the comma and full-stop keys):
 * - **top**: the 3/4 view from above that the game was built for (main.ts drives it);
 * - **third**: over her shoulder, behind her; WASD walk by the camera;
 * - **first**: through her eyes; W/S walk, A/D step sideways, and she faces the way the camera looks.
 * In third and first person the mouse turns the camera: the game takes the pointer (pointer lock) when the view is
 * picked or the game is clicked, and Esc gives it back. Holding the right button and dragging works too.
 * A white dot marks the middle of the screen; E (or a left click, with the pointer taken) uses what it's on.
 * Menus, staged shots, build mode and the quest map keep their own cameras.
 */
export type ViewName = "top" | "third" | "first";

const VIEWS: readonly ViewName[] = ["top", "third", "first"];
const VIEW_LABELS: Record<ViewName, string> = {
  top: "Top-down view",
  third: "Third-person view: the mouse looks around (click the game if it doesn't, Esc frees the mouse)",
  first: "First-person view: the mouse looks around (click the game if it doesn't, Esc frees the mouse)",
};
const STORAGE_KEY = "tarven.view";

/** Field of view, degrees: the top view's narrow lens, wider down at her level. */
const FOV: Record<ViewName, number> = { top: 32, third: 55, first: 70 };
/** Near clip plane, metres: the top camera stands well back, the others are close to her. */
const NEAR: Record<ViewName, number> = { top: 0.5, third: 0.08, first: 0.04 };

/** Third person: how far behind her, how far over her right shoulder, and how high over her head bone it looks. */
const THIRD_DISTANCE = 2.4;
/**
 * Running in third person, the camera eases back by RUN_PULLBACK metres and widens by RUN_WIDEN degrees, for a sense
 * of speed; it eases in over about half a second (RUN_EASE_IN a second) and back a little quicker when she slows.
 */
const RUN_PULLBACK = 0.8;
const RUN_WIDEN = 8;
const RUN_EASE_IN = 2.2;
const RUN_EASE_OUT = 3;
/**
 * Over her shoulder: the camera stands this far to her side and looks straight ahead past her (not at her), so she's
 * to one side of the screen and the dot in the middle is out in the room. It's her right shoulder, unless a wall
 * there leaves more room on her left, and then it slides across (SHOULDER_SWAP_RATE a second).
 */
const THIRD_SHOULDER = 0.55;
const SHOULDER_SWAP_RATE = 4;
/** How thick the camera is for the room's real shapes (camcollide.ts), metres. */
const CAMERA_RADIUS = 0.2;
const THIRD_RAISE = 0.15;
/**
 * Keeping the camera out of the room: it comes no closer to her than THIRD_NEAREST, stands at least CAMERA_GAP off
 * any wall (it's pulled in along its line first, then nudged clear of a wall beside it), stays under the ceiling's
 * beams and over the floor by as much. Closer to her than HEAD_HIDE_DISTANCE, her head is hidden, as in first person.
 */
const THIRD_NEAREST = 0.15;
const CAMERA_GAP = 0.25;
const HEAD_HIDE_DISTANCE = 0.45;
/** First person: the eyes, above and ahead of the head bone. */
const EYE_RAISE = 0.09;
const EYE_AHEAD = 0.11;
/**
 * The camera doesn't ride her head bone, which sways and bobs with every stride of her walk: it follows her feet
 * along the floor, at her eye height eased at this rate per second (so sitting or bending still moves it), and keeps
 * this much of the head's bob (none in third person, a little in first so walking still feels like walking).
 */
const EYE_EASE_RATE = 3;
const BOB_KEPT: Record<ViewName, number> = { top: 0, third: 0, first: 0.3 };
/** Mouse look: radians per pixel moved with the pointer taken, and per pixel dragged; how far up and down it may look. */
const MOUSE_LOOK = 0.0025;
const DRAG_LOOK = 0.005;
const PITCH_LIMIT = 1.25;
const DEFAULT_PITCH: Record<ViewName, number> = { top: 0, third: -0.22, first: -0.08 };

/**
 * Throws out the impossible mouse moves some browsers report with the pointer taken: during a fast flick, Chrome on
 * Windows now and then sends one event that jumps hundreds of pixels, often the wrong way, which snaps the view back.
 * A move is dropped when it's both big (over SPIKE_PIXELS) and far bigger than the moves just before it; a real flick
 * builds up over several events, so it gets through.
 */
export class MouseSpikes {
  private recent = 0;
  private last = -Infinity;

  filter(dx: number, dy: number, time: number): [number, number] {
    // After a pause, the recent pace starts again from nothing.
    if (time - this.last > SPIKE_MEMORY_MS) this.recent = 0;
    this.last = time;
    const size = Math.hypot(dx, dy);
    const spike = size > SPIKE_PIXELS && size > this.recent * SPIKE_RATIO + SPIKE_PIXELS;
    // A dropped move still counts towards the pace, so a real flick that starts big gets through from its next move.
    this.recent += (size - this.recent) * (spike ? 0.5 : 0.3);
    return spike ? [0, 0] : [dx, dy];
  }

  reset(): void {
    this.recent = 0;
    this.last = -Infinity;
  }
}
const SPIKE_PIXELS = 120;
const SPIKE_RATIO = 4;
const SPIKE_MEMORY_MS = 100;

function loadView(): ViewName {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VIEWS.includes(saved as ViewName) ? (saved as ViewName) : "top";
  } catch {
    return "top";
  }
}

export class ViewMode {
  view: ViewName = loadView();
  /** Which way the camera looks about the vertical; 0 looks towards -Z, as the top view does. */
  yaw = 0;
  private pitch = DEFAULT_PITCH[this.view];
  private dragging = false;
  /** True from the moment this view is entered until it has set itself up behind her. */
  private fresh = true;
  private readonly eye = new Vector3();
  private readonly head = new Vector3();
  /** Her eye height over her feet, and how far ahead of them, eased (steadyEye). Null until the first frame. */
  private eyeHeight: number | null = null;
  private eyeAhead = 0;
  private readonly pivot = new Vector3();
  private readonly ahead = new Vector3();
  private headHidden = false;
  /** Throws out the odd impossible mouse jump (MouseSpikes). */
  private readonly spikes = new MouseSpikes();
  /** The dot in the middle of the screen, in the close views. */
  private readonly dot = document.createElement("div");
  private readonly aim: Aim = { origin: new Vector3(), dir: new Vector3(), flat: false };
  /** The third-person camera's distance behind her, pulled in by walls and easing back out. */
  private distance = THIRD_DISTANCE;
  /** Which shoulder, 1 right to -1 left, sliding between them. */
  private shoulder = 1;
  private readonly collider = new CameraCollider();
  private readonly sideDir = new Vector3();
  private readonly backDir = new Vector3();
  private readonly lookAt = new Vector3();
  /** How far into the run camera it is, 0 to 1 (RUN_PULLBACK, RUN_WIDEN). */
  private rush = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly game: Game,
    private readonly canvas: HTMLElement,
    private readonly input: Input,
  ) {
    this.dot.id = "aim-dot";
    document.body.append(this.dot);
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 2 || this.view === "top") return;
      this.dragging = true;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (this.dragging && !this.locked) this.look(event.movementX, event.movementY, DRAG_LOOK);
    });
    // With the pointer taken, every move of the mouse turns the camera.
    document.addEventListener("mousemove", (event) => {
      if (!this.locked) return;
      const [dx, dy] = this.spikes.filter(event.movementX, event.movementY, event.timeStamp);
      this.look(dx, dy, MOUSE_LOOK);
    });
    // A click on the game takes the pointer back, in the close views.
    // With it taken, a left click uses what the dot is on, as E does.
    canvas.addEventListener("click", () => {
      if (!this.active) return;
      if (this.locked) this.input.tap("KeyE");
      else this.lockPointer();
    });
    const stop = (event: PointerEvent) => {
      if (event.button !== 2 && event.type === "pointerup") return;
      this.dragging = false;
    };
    canvas.addEventListener("pointerup", stop);
    canvas.addEventListener("pointercancel", stop);
    this.applyLens();
  }

  /** Whether the chosen view can hold the camera now: only while she walks about, not in a menu or staged shot. */
  get active(): boolean {
    const { game } = this;
    return this.view !== "top" && game.screen === "play" && !game.closeup && !game.buildFocus && !game.onQuestMap;
  }

  /** < and > step through the views. Call before game.update, which ends the input's frame. */
  handleKeys(input: Input): void {
    const step = input.pressed("Period") ? 1 : input.pressed("Comma") ? -1 : 0;
    if (step === 0) return;
    const index = (VIEWS.indexOf(this.view) + step + VIEWS.length) % VIEWS.length;
    this.view = VIEWS[index];
    this.fresh = true;
    this.pitch = DEFAULT_PITCH[this.view];
    try {
      localStorage.setItem(STORAGE_KEY, this.view);
    } catch {
      // No storage: the view just isn't remembered.
    }
    this.applyLens();
    this.game.notice(VIEW_LABELS[this.view]);
    // The key press lets the game take the pointer straight away.
    if (this.view === "top") this.freePointer();
    else if (this.active) this.lockPointer();
  }

  private get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  private look(dx: number, dy: number, rate: number): void {
    if (!this.active) return;
    this.yaw -= dx * rate;
    this.pitch = MathUtils.clamp(this.pitch - dy * rate, -PITCH_LIMIT, PITCH_LIMIT);
  }

  private lockPointer(): void {
    if (this.locked) return;
    this.spikes.reset();
    // Raw mouse movement where the browser has it (unadjustedMovement): Chrome on Windows otherwise now and then
    // reports one wildly wrong move during a fast flick, and the view jumps back. Older browsers take no options, and
    // newer ones return a promise that rejects if they can't give raw movement, so it asks again plainly.
    const plain = () => {
      try {
        const asked = this.canvas.requestPointerLock() as unknown;
        if (asked instanceof Promise) asked.catch(() => undefined);
      } catch {
        // No pointer lock: right-drag still looks around.
      }
    };
    try {
      const request = this.canvas.requestPointerLock as (options?: { unadjustedMovement?: boolean }) => unknown;
      const asked = request.call(this.canvas, { unadjustedMovement: true });
      if (asked instanceof Promise) asked.catch(plain);
    } catch {
      plain();
    }
  }

  private freePointer(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** Before game.update: tells the walk which way the camera looks. */
  steer(): void {
    const { moveView } = this.game;
    if (!this.active) {
      moveView.yaw = 0;
      moveView.faceView = false;
      moveView.gentleTurn = false;
      // A menu, a conversation or a staged shot wants the pointer back.
      this.freePointer();
      if (this.view === "top") this.fresh = true;
      return;
    }
    if (this.fresh) {
      // Start behind her, looking the way she faces.
      this.yaw = this.game.player.facing;
      this.eyeHeight = null;
      this.fresh = false;
    }
    moveView.yaw = this.yaw;
    moveView.faceView = this.view === "first";
    moveView.gentleTurn = this.view === "third";
  }

  /** After game.update: places the camera. Returns false when the top view (main.ts) should place it instead. */
  place(dt: number): boolean {
    this.applyLens();
    // Indoors, the close views get a ceiling and full-height front walls (closeview.ts).
    showCloseView(this.active && !this.game.outdoors);
    this.dot.classList.toggle("on", this.active);
    if (!this.active || this.view !== "third") this.rush = 0;
    if (!this.active) {
      this.game.aim = null;
      return false;
    }
    this.steadyEye(dt);
    const cosPitch = Math.cos(this.pitch);
    this.ahead.set(-Math.sin(this.yaw) * cosPitch, Math.sin(this.pitch), -Math.cos(this.yaw) * cosPitch);

    if (this.view === "third") {
      const { colliders } = this.game;
      this.collider.use(this.game.room, dt);
      this.pivot.copy(this.eye);
      this.pivot.y += THIRD_RAISE;
      // Over a shoulder: whichever side has room, the right first; no further out than the room there allows.
      this.sideDir.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const roomTo = (sign: number) => {
        this.backDir.copy(this.sideDir).multiplyScalar(sign);
        const shapes = this.collider.clearance(this.pivot, this.backDir, THIRD_SHOULDER + CAMERA_RADIUS, CAMERA_RADIUS);
        const walls = wallClearance(colliders, this.eye.x, this.eye.z, this.backDir.x * THIRD_SHOULDER, this.backDir.z * THIRD_SHOULDER) *
          THIRD_SHOULDER;
        return Math.max(0, Math.min(shapes - CAMERA_RADIUS, walls - CAMERA_GAP));
      };
      const right = roomTo(1);
      const left = right < THIRD_SHOULDER * 0.6 ? roomTo(-1) : 0;
      const wanted = right < THIRD_SHOULDER * 0.6 && left > right + 0.1 ? -1 : 1;
      this.shoulder += (wanted - this.shoulder) * Math.min(1, SHOULDER_SWAP_RATE * dt);
      const room = this.shoulder >= 0 ? right : left;
      const out = Math.sign(this.shoulder || 1) * Math.min(Math.abs(this.shoulder) * THIRD_SHOULDER, room);
      this.pivot.addScaledVector(this.sideDir, out);
      // Pulled in short of the room behind (its real shapes and its walls), the ceiling (indoors) and the floor.
      // Running, it stands further back (and widens, applyLens).
      const run = this.game.player.runAmount;
      this.rush += (run - this.rush) * Math.min(1, (run > this.rush ? RUN_EASE_IN : RUN_EASE_OUT) * dt);
      const back = THIRD_DISTANCE + RUN_PULLBACK * this.rush;
      this.backDir.copy(this.ahead).negate();
      let reach = Math.min(
        wallClearance(colliders, this.pivot.x, this.pivot.z, this.backDir.x * back, this.backDir.z * back) * back - CAMERA_GAP,
        this.collider.clearance(this.pivot, this.backDir, back + CAMERA_RADIUS, CAMERA_RADIUS) - CAMERA_RADIUS,
      );
      const roof = CEILING_HEIGHT - BEAM_DEPTH - CAMERA_GAP;
      if (!this.game.outdoors && this.ahead.y < 0) reach = Math.min(reach, (roof - this.pivot.y) / -this.ahead.y);
      const floor = this.game.player.position.y + CAMERA_GAP;
      if (this.ahead.y > 0) reach = Math.min(reach, (this.pivot.y - floor) / this.ahead.y);
      reach = MathUtils.clamp(reach, THIRD_NEAREST, back);
      this.distance = reach < this.distance ? reach : this.distance + (reach - this.distance) * Math.min(1, 4 * dt);
      this.camera.position.copy(this.pivot).addScaledVector(this.ahead, -this.distance);
      // Nudged off anything running alongside it, which the line back from her doesn't cross: short probes to each
      // side push it away from what's within CAMERA_RADIUS, never through it.
      for (const sign of [1, -1]) {
        this.backDir.copy(this.sideDir).multiplyScalar(sign);
        const near = this.collider.clearance(this.camera.position, this.backDir, CAMERA_RADIUS, 0.0001);
        if (near < CAMERA_RADIUS) this.camera.position.addScaledVector(this.backDir, near - CAMERA_RADIUS);
      }
      // Last, nothing solid may stand between her and the camera: if it does, the camera comes in to this side of it.
      this.backDir.subVectors(this.camera.position, this.pivot);
      const span = this.backDir.length();
      if (span > 1e-3) {
        this.backDir.divideScalar(span);
        const blocked = Math.min(
          this.collider.clearance(this.pivot, this.backDir, span + CAMERA_GAP, 0.0001),
          wallClearance(colliders, this.pivot.x, this.pivot.z, this.backDir.x * span, this.backDir.z * span) * span + CAMERA_GAP,
        );
        if (blocked < span + CAMERA_GAP) {
          this.camera.position.copy(this.pivot).addScaledVector(this.backDir, Math.max(0, blocked - CAMERA_GAP));
          this.distance = Math.min(this.distance, Math.max(THIRD_NEAREST, blocked - CAMERA_GAP));
        }
      }
      // Looking straight ahead past her shoulder, not at her.
      this.camera.lookAt(this.lookAt.copy(this.camera.position).add(this.ahead));
      this.updateAim();
      return true;
    }

    // First person: from just ahead of her eyes.
    this.camera.position.set(
      this.eye.x - Math.sin(this.yaw) * EYE_AHEAD,
      this.eye.y + EYE_RAISE,
      this.eye.z - Math.cos(this.yaw) * EYE_AHEAD,
    );
    this.pivot.copy(this.camera.position).add(this.ahead);
    this.camera.lookAt(this.pivot);
    this.updateAim();
    return true;
  }

  /** Around the frame's render: in first person her head is shrunk away so the camera isn't inside her hair. */
  beforeRender(): void {
    // In third person too, once a wall has brought the camera right up behind her head.
    this.headHidden = this.active && (this.view === "first" || (this.view === "third" && this.distance < HEAD_HIDE_DISTANCE));
    if (this.headHidden) this.game.player.hideHead(true);
  }

  afterRender(): void {
    if (this.headHidden) this.game.player.hideHead(false);
    this.headHidden = false;
  }

  /** Where the camera follows: over her feet at her eased eye height, without the head's stride sway. */
  private steadyEye(dt: number): void {
    const player = this.game.player;
    const feet = player.position;
    player.eyePoint(this.head);
    const height = this.head.y - feet.y;
    const heading = player.facing;
    const ahead = -(this.head.x - feet.x) * Math.sin(heading) - (this.head.z - feet.z) * Math.cos(heading);
    if (this.eyeHeight === null) {
      this.eyeHeight = height;
      this.eyeAhead = ahead;
    }
    const ease = 1 - Math.exp(-EYE_EASE_RATE * dt);
    this.eyeHeight += (height - this.eyeHeight) * ease;
    this.eyeAhead += (ahead - this.eyeAhead) * ease;
    const bob = (height - this.eyeHeight) * BOB_KEPT[this.view];
    this.eye.set(
      feet.x - Math.sin(heading) * this.eyeAhead,
      feet.y + this.eyeHeight + bob,
      feet.z - Math.cos(heading) * this.eyeAhead,
    );
  }

  /** Tells the game where the dot points, for what E uses. */
  private updateAim(): void {
    const { aim } = this;
    // First person: straight out along the dot. Third person: from her, the way the camera faces, so what's at her feet
    // counts as much as what's across the room.
    aim.flat = this.view === "third";
    this.camera.getWorldDirection(aim.dir);
    if (aim.flat) aim.origin.copy(this.game.player.position);
    else aim.origin.copy(this.camera.position);
    this.game.aim = aim;
  }

  private applyLens(): void {
    const view = this.active ? this.view : "top";
    const fov = FOV[view] + (view === "third" ? RUN_WIDEN * this.rush : 0);
    if (Math.abs(this.camera.fov - fov) < 0.01 && this.camera.near === NEAR[view]) return;
    this.camera.fov = fov;
    this.camera.near = NEAR[view];
    this.camera.updateProjectionMatrix();
  }
}
