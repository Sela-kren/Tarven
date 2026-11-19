import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  type Material,
  MathUtils,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { applyPose, BATTLE_POSES, blendPose, NO_EXTRA, poseBones, type BattlePose, type BattlePoseName, type PoseBones, type PoseExtra } from "./battlepose";
import { chestOverHips } from "./player";
import { Heart, PleasureBar } from "./statuscard";
import { TAG_ICONS, type TagIcon } from "./fighticons";
import { cardFraming, facingTurn } from "./battleframe";
import type { BrawlBeat } from "./brawlscene";
import { makeProps, makeTable } from "./scenetable";
import { blendScene, placeBody, SCENE_JOINS, SCENE_POSES, sceneFraming, sizeForScene, type Body, type Posed, type ScenePose, type ScenePoseName } from "./sexpose";

/**
 * The big picture of her during a fight, the way Karryn's Prison shows Karryn the whole time she battles,
 * rendered live from her own model (so whatever's come off her and whatever men have left on her shows),
 * breathing, flushing as she gets worked up and trembling on the edge, flinching when she's hit. In a brawl she's
 * framed close, head to mid-thigh, and strikes Karryn's held fight poses as the turn plays out (battlepose.ts): her
 * swing, a blow landing, a dodge, a hold. A status board under her says how she stands; the close-up comic panels
 * pop in over her for each moment. After hours, once she's with someone, the picture is the two of them together in
 * Karryn's Prison's held sex poses (sexpose.ts), swapped as the game moves on.
 *
 * Drawn at about the size it's shown, anti-aliased and in full colour, to match the game's painted look (the old
 * low-res 5-bit dither was dropped with the retro look, 2026-11-16).
 */

/** How many times the old 168 x 280 picture it's drawn at; pixel sizes (the streak, the blush) scale with it. */
const RES = 2;
const WIDTH = 168 * RES;
const HEIGHT = 280 * RES;

/** A brawl, or an after-hours game: the light, and how she stands. */
export type BattleMode = "brawl" | "duel";

/** One line of the status board: a label, and what it says. */
export interface BattleStat {
  label: string;
  value: string;
  /** A colour cue: "hot" for desire, "hurt" for a beating, "cum" for what's on her. */
  tone?: "hot" | "hurt" | "cum";
  /** Drawn as a full-width bar filled to this share (0 to 1) instead of a line of text; `bar` is its colour. */
  share?: number;
  bar?: "stamina" | "foe" | "will" | "energy";
  /** Drawn as a row of tag chips, each with a little icon, instead of a line of text (`label` and `value` unused). */
  tags?: readonly BattleTag[];
}

/** One tag chip on a fight card: a word or two about how someone stands, with its icon. */
export interface BattleTag {
  text: string;
  icon?: TagIcon;
  tone?: "hot" | "hurt" | "calm" | "gold";
}

/**
 * The desire part of a card, as on her status card in the room: a row of hearts (hers, one per desire; a foe's,
 * his lust) over a pleasure bar.
 */
export interface BattleLust {
  hearts: readonly { id: string; name: string; value: number; what?: string }[];
  pleasure: number;
}

/** A stat as a full-width bar: its name, a track filled to the share, and the number. */
function barRow(stat: BattleStat): HTMLElement {
  const row = document.createElement("div");
  row.className = `row barline ${stat.bar ?? "stamina"}${stat.tone ? ` ${stat.tone}` : ""}`;
  const label = document.createElement("span");
  label.textContent = stat.label;
  const track = document.createElement("i");
  track.className = "track";
  const fill = document.createElement("i");
  fill.className = "fill";
  fill.style.width = `${Math.round(Math.max(0, Math.min(1, stat.share ?? 0)) * 100)}%`;
  track.append(fill);
  const value = document.createElement("b");
  value.textContent = stat.value;
  row.append(label, track, value);
  return row;
}

/** A row of tag chips, each a little icon and a word or two. */
function tagRow(tags: readonly BattleTag[]): HTMLElement {
  const row = document.createElement("div");
  row.className = "tagline";
  for (const t of tags) {
    const chip = document.createElement("span");
    chip.className = `chip${t.tone ? ` ${t.tone}` : ""}`;
    if (t.icon) {
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = TAG_ICONS[t.icon];
      chip.append(icon);
    }
    chip.append(t.text);
    row.append(chip);
  }
  return row;
}

/** How long a new pose takes to snap in: Karryn's Prison swaps the whole picture; this is barely more than that. */
const SNAP = 0.12;
/** The picture's lens, in degrees up and down; a scene can widen it (`SceneView.fov`) for a close shot, as KP's POV ones. */
const FOV = 28;
/** How long her swing's streak shows, in seconds. */
const STREAK_TIME = 0.45;
/**
 * Drawn whatever its bounds say: a skinned mesh's bounds are measured once, as it stood in the room, so a head or a
 * leg posed far from there (upside down, a leg up) would be culled as out of the picture while it's in it.
 */
function unculled(model: Object3D): void {
  model.traverse((o) => {
    if (o instanceof Mesh) o.frustumCulled = false;
  });
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export class BattleView {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, WIDTH / HEIGHT, 0.05, 30);
  private readonly target = new WebGLRenderTarget(WIDTH, HEIGHT, { samples: 4 });
  private readonly pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly root: HTMLElement;
  private readonly board: HTMLElement;
  private readonly title: HTMLElement;

  private model: Object3D | null = null;
  private bones: PoseBones = poseBones(new Object3D(), "");
  /** Her own picture strikes the fight poses and is framed close; a foe's stands whole, as they stood in the room. */
  private readonly posed: boolean;
  /** Her hips' rest (a pose lowers her from it) and her legs' length, in the hips' own units. */
  private hipsBase = { y: 0, z: 0 };
  private legLength = 0;
  /** The top of her hair, in her head bone's own space, so it tips with her head (battleframe.ts). */
  private readonly crown = new Vector3();
  /** How tall she stands. */
  private height = 1.7;
  /** The model's turn toward the fight, before a pose turns her further. */
  private baseTurn = 0;
  /** The pose she's striking, the one she's snapping in from, and seconds since the snap began. */
  private poseName: BattlePoseName = "ready";
  private fromPose: BattlePose = BATTLE_POSES.ready;
  private snap = SNAP;
  /** The camera's framing for the pose she's snapping from and to, and where it looks now. */
  private readonly fromCam = { position: new Vector3(), target: new Vector3() };
  private readonly toCam = { position: new Vector3(), target: new Vector3() };
  private readonly look = new Vector3();
  /** A brawl turn's poses still to come, and seconds since the turn began. */
  private beats: BrawlBeat[] = [];
  private beatClock = 0;
  /** Her swing's streak: seconds since it began, or null; and where it runs on the picture, behind her to her fist. */
  private streak: number | null = null;
  private readonly streakPath = { from: { x: 0, y: 0 }, bend: { x: 0, y: 0 }, to: { x: 0, y: 0 } };
  private female = false;
  private readonly cheeks = [new Vector3(), new Vector3()];
  private scale = 1;
  /** The table under her in a table scene (KP's waitress_table), while there is one. */
  private table: Object3D | null = null;
  private mode: BattleMode = "duel";
  private time = 0;
  private active = false;
  /** How worked up she is, 0 to 1 (the blush, her breathing), and whether she's on the edge (she trembles). */
  private heat = 0;
  private shownHeat = 0;
  private edge = false;
  /** Her desire hearts and pleasure bar (or a foe's lust and pleasure), between the picture and the board. */
  private readonly lust = document.createElement("div");
  private readonly heartRow = document.createElement("div");
  private readonly pleasureBar = new PleasureBar();
  private hearts: Heart[] = [];
  private heartKey = "";

  /** A flinch from a hit or a jolt, fading. */
  private flinch = 0;
  private flinchHard = false;

  /** In a brawl, who'd be in a scene with her (brawlscene.ts): the one she's with, and anyone joined in. */
  private brawlCast: CastMember[] = [];

  /** Called as a blow lands on her in a brawl turn (the screen shakes, Karryn-style: screenshake.ts). */
  onBlow: (() => void) | null = null;
  /** Called as she strikes each pose in a brawl (her face changes with it: fightface.ts). */
  onPose: ((name: BattlePoseName) => void) | null = null;

  /**
   * After hours: whoever she's with in the picture (each body posed with hers: the lead, or joined at a slot of the
   * scene), the scene they're in, the one it's snapping from, and seconds since the snap began.
   */
  private readonly cast = new Map<string, Posed & { spot: CastSpot }>();
  private sceneName: ScenePoseName | null = null;
  private fromScene: ScenePose | null = null;
  private sceneSnap = SNAP;

  /** Which way the body is turned: toward a fight on the right of it, or on the left. */
  private facing: "left" | "right" = "right";

  /**
   * `id` names her own picture; a foe's picture goes without one, into `parent` (the column of foes), and is
   * styled by the shared `battle-card` class like hers. Hers strikes the fight poses; a foe's doesn't.
   */
  constructor(
    private readonly renderer: WebGLRenderer,
    options: { id?: string; parent?: HTMLElement } = { id: "battle-view" },
  ) {
    this.posed = !options.parent;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.ctx = this.canvas.getContext("2d")!;
    this.image = this.ctx.createImageData(WIDTH, HEIGHT);

    this.root = document.createElement("div");
    if (options.id) this.root.id = options.id;
    this.root.className = "battle-card";
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
    this.lust.className = "lust heart-ui";
    this.lust.hidden = true;
    this.lust.append(this.heartRow, this.pleasureBar.el);
    this.heartRow.className = "hearts";
    frame.append(picture, flash, this.title);
    // Under the picture (inside it, on a foe's card): the hearts and pleasure bar, then the status board.
    const dock = document.createElement("div");
    dock.className = "dock";
    dock.append(this.lust, this.board);
    this.root.append(frame, dock);
    (options.parent ?? document.body).append(this.root);

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

  /** The card on screen: its picture, nameplate and status. */
  get element(): HTMLElement {
    return this.root;
  }

  /**
   * Shows her, or shows her again as she is now: `body` is her own model as it stands in the room (dressed or
   * not, coated or not), and `name` its body name. Call it again whenever her clothes or what's on her change.
   */
  show(body: Object3D, name: string, mode: BattleMode, title: string, facing: "left" | "right" = "right"): void {
    if (this.model) this.scene.remove(this.model);
    const model = cloneSkinned(body);
    unculled(model);
    model.position.set(0, 0, 0);
    // Turned a little toward the fight beside the picture, like Karryn facing her enemies.
    const fresh = !this.active || this.mode !== mode;
    this.facing = facing;
    const side = facing === "right" ? 1 : -1;
    this.baseTurn = facingTurn(side);
    model.rotation.set(0, this.baseTurn, 0);
    model.visible = true;
    this.scene.add(model);
    this.bones = poseBones(model, name);
    this.female = name === "Female";
    this.model = model;
    this.mode = mode;
    this.scale = model.getWorldScale(new Vector3()).y;
    const hips = this.bones.hips;
    this.hipsBase = {
      y: (hips?.userData.baseY as number | undefined) ?? hips?.position.y ?? 0,
      z: (hips?.userData.baseZ as number | undefined) ?? hips?.position.z ?? 0,
    };
    this.legLength = this.hipsBase.y + (this.bones.thighL?.position.y ?? 0);
    if (fresh) {
      this.poseName = "ready";
      this.fromPose = BATTLE_POSES.ready;
      this.snap = SNAP;
      this.beats = [];
      this.streak = null;
      this.setCast(null, []);
    }

    // Measured standing: in a brawl, in her stance; otherwise as she stood in the room.
    if (this.closeUp) this.strike(BATTLE_POSES.ready, NO_EXTRA);
    model.updateMatrixWorld(true);
    // The head bone sits differently on each body (and a guest's hair or hat can stand taller), so the top is
    // whichever is higher: a little over the head bone, or the top of what's drawn.
    const head = this.bones.head?.getWorldPosition(new Vector3()) ?? new Vector3(0, 1.6 * this.scale, 0);
    const drawn = new Box3().setFromObject(model, true);
    const top = Math.max(head.y + 0.18 * this.scale, Number.isFinite(drawn.max.y) ? drawn.max.y + 0.06 * this.scale : 0);
    this.height = top;
    if (this.bones.head) this.bones.head.worldToLocal(this.crown.set(head.x, top, head.z));

    this.lens();
    if (this.inScene) {
      this.frameScene(this.toCam);
    } else if (this.closeUp) {
      // Framed close for the pose she's in, Karryn-style (battleframe.ts).
      this.frameFor(this.poseName, this.toCam);
    } else {
      // Her whole body: from the top of her head to her feet, with a little room.
      const middle = top / 2;
      const fov = MathUtils.degToRad(this.camera.fov);
      const distance = ((top * 1.08) / 2 / Math.tan(fov / 2));
      this.toCam.position.set(0.25 * side * this.scale, middle + 0.05 * this.scale, distance);
      this.toCam.target.set(0, middle, 0);
    }
    this.fromCam.position.copy(this.toCam.position);
    this.fromCam.target.copy(this.toCam.target);
    this.camera.position.copy(this.toCam.position);
    this.look.copy(this.toCam.target);
    this.camera.lookAt(this.look);

    if (fresh) this.time = 0;
    this.title.textContent = title;
    this.root.classList.toggle("brawl", mode === "brawl");
    // Facing left means the picture stands on the right of the screen, with the foes across from it.
    this.root.classList.toggle("right", facing === "left");
    this.active = true;
    this.root.classList.add("open");
    this.render();
  }

  /**
   * Her picture's copy barefoot, as KP draws her in its sex scenes (the dev scene pose tester's): whatever shoes she
   * has on hidden, and the bare-foot mesh shown in her skin. Only the copy; she's as she was in the room.
   */
  bareFeet(): void {
    const model = this.model;
    if (!model) return;
    let skin: Material | null = null;
    model.traverse((o) => {
      if (!skin && o instanceof Mesh && !Array.isArray(o.material) && /^T_skin/.test(o.material.name)) skin = o.material;
    });
    model.traverse((o) => {
      if (!(o instanceof Mesh) || !/_Shoes/.test(o.name) || /Outline/.test(o.name)) return;
      const bare = /_ShoesBarefoot/.test(o.name);
      o.visible = bare;
      if (bare && skin) o.material = skin;
    });
    this.render();
  }

  /** Who's in a scene with her mid-brawl (brawlscene.ts): the one she's with, and anyone joined in at a slot. */
  setBrawlCast(members: readonly CastMember[]): void {
    this.brawlCast = [...members];
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

  /** Hearts and a pleasure bar over the status board, or none (`null`). */
  setLust(lust: BattleLust | null): void {
    this.lust.hidden = !lust;
    if (!lust) return;
    const key = lust.hearts.map((h) => `${h.id}:${h.name}`).join("|");
    if (key !== this.heartKey) {
      this.heartKey = key;
      this.hearts = lust.hearts.map((h) => new Heart(h.id, h.name, h.what));
      this.heartRow.replaceChildren(...this.hearts.map((h) => h.el));
    }
    lust.hearts.forEach((h, i) => this.hearts[i]?.set(Math.floor(h.value)));
    this.pleasureBar.set(lust.pleasure);
  }

  /** The status board under her: how she stands, line by line. */
  setStatus(stats: readonly BattleStat[]): void {
    this.board.replaceChildren(
      ...stats.map((stat) => {
        if (stat.tags) return tagRow(stat.tags);
        if (stat.share !== undefined) return barRow(stat);
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

  /**
   * A brawl turn's poses, each struck as its moment comes up in the comic panel, then how she's left
   * (battlepose.ts `turnBeats`). A new turn's replaces whatever's left of the last one's.
   */
  play(beats: readonly BrawlBeat[]): void {
    if (!this.closeUp) return;
    this.beats = [...beats].sort((x, y) => x.at - y.at);
    this.beatClock = 0;
  }

  hide(): void {
    this.active = false;
    this.beats = [];
    this.streak = null;
    this.setCast(null, []);
    this.sceneName = null;
    this.fromScene = null;
    this.root.classList.remove("open");
    if (this.model) this.scene.remove(this.model);
    this.model = null;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.time += dt;
    this.flinch = Math.max(0, this.flinch - dt * 2.2);
    this.shownHeat = MathUtils.damp(this.shownHeat, this.heat, 3, dt);
    if (this.closeUp) {
      this.beatClock += dt;
      while (this.beats.length > 0 && this.beats[0].at <= this.beatClock) {
        const beat = this.beats.shift()!;
        this.startPose(beat.pose, beat.hurt, beat.scene);
      }
      this.snap = Math.min(SNAP, this.snap + dt);
      if (this.streak !== null) {
        this.streak += dt;
        if (this.streak > STREAK_TIME) this.streak = null;
      }
    }
    this.sceneSnap = Math.min(SNAP, this.sceneSnap + dt);
    this.render();
  }

  /**
   * After hours, who's in the picture with her, and the scene (duelstage.ts's cast): each member's body as it stands,
   * its body name, a key telling them apart (so the same one isn't set down again), and where they are in the scene.
   * A new scene snaps in, the camera coming round with it; someone joining or leaving reframes it. Null takes them
   * all away.
   */
  setCast(scene: ScenePoseName | null, members: readonly CastMember[]): void {
    const keys = new Set(members.map((m) => m.key));
    let changed = false;
    for (const [key, posed] of this.cast) {
      if (keys.has(key)) continue;
      this.scene.remove(posed.model);
      this.cast.delete(key);
      changed = true;
    }
    for (const member of members) {
      const had = this.cast.get(member.key);
      if (had) {
        if (had.spot !== member.spot) changed = true;
        had.spot = member.spot;
        continue;
      }
      const model = cloneSkinned(member.body);
      unculled(model);
      model.position.set(0, 0, 0);
      // A man drawn bigger in the picture than in the room, towering over her as KP's do (sexpose.ts SCENE_MAN_SCALE).
      sizeForScene(model, member.name);
      model.visible = true;
      this.scene.add(model);
      const bones = poseBones(model, member.name);
      const hips = bones.hips;
      const hipsBaseY = (hips?.userData.baseY as number | undefined) ?? hips?.position.y ?? 0;
      this.cast.set(member.key, {
        model,
        bones,
        female: member.name === "Female",
        hipsBaseY,
        hipsBaseZ: (hips?.userData.baseZ as number | undefined) ?? hips?.position.z ?? 0,
        legLength: hipsBaseY + (bones.thighL?.position.y ?? 0),
        scale: this.scale,
        spot: member.spot,
      });
      changed = true;
    }
    if (!scene || !this.posed || !this.model) {
      this.sceneName = null;
      this.fromScene = null;
      this.setTable(null);
      return;
    }
    if (scene === this.sceneName && !changed) return;
    this.setTable(SCENE_POSES[scene]);
    const first = this.sceneName === null;
    this.fromScene = first || scene === this.sceneName ? null : this.currentScene();
    this.fromCam.position.copy(this.camera.position);
    this.fromCam.target.copy(this.look);
    this.sceneName = scene;
    // In a brawl the camera comes round from the fight onto them; after hours the first scene is just there.
    this.sceneSnap = first && !this.closeUp ? SNAP : 0;
    this.frameScene(this.toCam);
    if (first && !this.closeUp) {
      this.fromCam.position.copy(this.toCam.position);
      this.fromCam.target.copy(this.toCam.target);
    }
  }

  /** Puts the scene's table under her, and its other props (a post, a wall, a bench), on the stage, or takes them away. */
  private setTable(scene: ScenePose | null): void {
    if (this.table) this.scene.remove(this.table);
    const pieces = scene ? [...(scene.table ? [makeTable(scene.table, this.scale)] : []), ...makeProps(scene.props ?? [], this.scale)] : [];
    this.table = pieces.length > 0 ? new Group().add(...pieces) : null;
    if (this.table) this.scene.add(this.table);
  }

  /** Whether the picture is her with someone, in a scene. */
  private get inScene(): boolean {
    return this.posed && this.sceneName !== null && this.cast.size > 0;
  }

  /** The scene as it stands now: partway through snapping into the new one. */
  private currentScene(): ScenePose {
    const to = SCENE_POSES[this.sceneName!];
    return this.fromScene ? blendScene(this.fromScene, to, MathUtils.smoothstep(this.sceneSnap / SNAP, 0, 1)) : to;
  }

  /** Her body's measures, for posing her in a scene. */
  private herPosed(): Posed | null {
    if (!this.model) return null;
    return { model: this.model, bones: this.bones, female: this.female, hipsBaseY: this.hipsBase.y, hipsBaseZ: this.hipsBase.z, legLength: this.legLength, scale: this.scale };
  }

  /**
   * Sets them all in a scene: her (with `extra`, her breathing, and her arm or head turned to whoever's joined her),
   * the lead where the scene has them, and the others at their slots.
   */
  private setScene(scene: ScenePose, extra: PoseExtra): void {
    const her = this.herPosed();
    if (!her || !this.sceneName) return;
    const spots = SCENE_JOINS[this.sceneName] ?? [];
    let body: Body = scene.her.body;
    for (const member of this.cast.values()) {
      const spot = member.spot === "lead" ? null : spots[member.spot];
      if (spot?.reach) body = { ...body, ...spot.reach };
    }
    placeBody(her, body, scene.her.place, extra);
    for (const member of this.cast.values()) {
      const at = member.spot === "lead" ? scene.them : spots[member.spot];
      member.model.visible = Boolean(at);
      if (at) placeBody(member, at.body, at.place);
    }
  }

  /** The lens for what the picture shows: a scene's own (its `view.fov`), or the usual one. */
  private lens(): void {
    const fov = (this.inScene && this.sceneName ? SCENE_POSES[this.sceneName].view.fov : undefined) ?? FOV;
    if (this.camera.fov === fov) return;
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  /** Where the camera stands for the scene they're snapping into: framed on all of them, set in it outright. */
  private frameScene(out: { position: Vector3; target: Vector3 }): void {
    if (!this.sceneName) return;
    const scene = SCENE_POSES[this.sceneName];
    this.setScene(scene, NO_EXTRA);
    const box = new Box3();
    for (const model of [this.model, ...[...this.cast.values()].map((m) => m.model)]) {
      if (!model?.visible) continue;
      model.updateMatrixWorld(true);
      box.union(new Box3().setFromObject(model, true));
    }
    this.lens();
    const frame = sceneFraming(box, scene.view, this.camera.fov, WIDTH / HEIGHT, this.scale);
    out.position.copy(frame.position);
    out.target.copy(frame.target);
  }

  /** Her own picture in a brawl: posed and framed close. */
  private get closeUp(): boolean {
    return this.posed && this.mode === "brawl";
  }

  /**
   * Snaps into a pose (a swing streaks; a blow landing flashes the picture), the camera coming round with her. With
   * a `scene` (brawlscene.ts), she's in it with the one she's fighting instead, and stays in it till a beat without.
   */
  private startPose(name: BattlePoseName, hurt: boolean, scene?: ScenePoseName): void {
    if (!this.model) return;
    if (scene && this.brawlCast.length > 0) {
      this.poseName = name;
      this.setCast(scene, this.brawlCast);
      this.onPose?.(name);
      if (hurt) {
        this.hit(true);
        this.onBlow?.();
      }
      return;
    }
    if (this.sceneName) {
      // Out of the scene and back in the fight: stood back up where she was.
      this.setCast(null, []);
      this.model.position.set(0, 0, 0);
      this.model.rotation.set(0, this.baseTurn, 0);
      this.snap = SNAP;
    }
    this.fromPose = this.currentPose();
    this.fromCam.position.copy(this.camera.position);
    this.fromCam.target.copy(this.look);
    this.poseName = name;
    this.frameFor(name, this.toCam);
    this.snap = 0;
    if (name === "strike") this.streak = 0;
    this.onPose?.(name);
    if (hurt) {
      this.hit(true);
      this.onBlow?.();
    }
  }

  /** The pose as it stands now: partway through snapping into the new one. */
  private currentPose(): BattlePose {
    return blendPose(this.fromPose, BATTLE_POSES[this.poseName], MathUtils.smoothstep(this.snap / SNAP, 0, 1));
  }

  /** Sets her bones to a pose, and turns her body with it. */
  private strike(pose: BattlePose, extra: PoseExtra): void {
    if (!this.model) return;
    const turn = applyPose(this.bones, pose, {
      mirror: this.facing === "right",
      female: this.female,
      legLength: this.legLength,
      hipsBaseY: this.hipsBase.y,
      hipsBaseZ: this.hipsBase.z,
      extra,
    });
    this.model.rotation.y = this.baseTurn + turn;
  }

  /** Where the camera stands to frame her in a pose: struck outright, framed on where the top of her hair goes. */
  private frameFor(name: BattlePoseName, out: { position: Vector3; target: Vector3 }): void {
    const { model, bones } = this;
    if (!model) return;
    this.strike(BATTLE_POSES[name], NO_EXTRA);
    model.updateMatrixWorld(true);
    const crown = bones.head ? bones.head.localToWorld(this.crown.clone()) : new Vector3(0, this.height, 0);
    const frame = cardFraming({ crown, height: this.height, side: this.facing === "right" ? 1 : -1, fov: this.camera.fov });
    out.position.copy(frame.position);
    out.target.copy(frame.target);
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
    // Over any pose: a breath, a hunch from a flinch, her head tipping back as she gets hotter and snapping aside
    // when she's hit.
    const extra: PoseExtra = {
      torsoX: breath - f * (this.flinchHard ? 0.25 : 0.12),
      torsoY: tremble,
      headX: -heat * 0.12 + f * 0.1,
      headY: (this.flinchHard ? f * 0.45 : 0) + tremble * 2,
      headZ: heat * 0.08,
    };
    this.lens();
    if (this.inScene) {
      this.setScene(this.currentScene(), extra);
      // The camera comes round with them as they snap into a scene.
      const k = MathUtils.smoothstep(this.sceneSnap / SNAP, 0, 1);
      this.camera.position.lerpVectors(this.fromCam.position, this.toCam.position, k);
      this.look.lerpVectors(this.fromCam.target, this.toCam.target, k);
      this.camera.lookAt(this.look);
    } else if (this.closeUp) {
      this.strike(this.currentPose(), extra);
      // The camera comes round with her as she snaps into a pose.
      const k = MathUtils.smoothstep(this.snap / SNAP, 0, 1);
      this.camera.position.lerpVectors(this.fromCam.position, this.toCam.position, k);
      this.look.lerpVectors(this.fromCam.target, this.toCam.target, k);
      this.camera.lookAt(this.look);
    } else {
      // A foe, or her after hours: their own stance from the room, breathing.
      if (bones.torso) bones.torso.rotation.set(chestOverHips(bones.torso) + extra.torsoX, extra.torsoY, 0);
      if (bones.head) bones.head.rotation.set(extra.headX, extra.headY, extra.headZ);
      model.rotation.y = this.baseTurn;
    }
    if (bones.hips) bones.hips.rotation.y = Math.sin(t * 0.7) * 0.03 * (0.5 + heat);
    if (!this.inScene) model.position.x = this.flinchHard ? -f * 0.05 * this.scale * (this.facing === "right" ? 1 : -1) : 0;
    model.updateMatrixWorld(true);
    if (bones.head) {
      bones.head.localToWorld(this.cheeks[0].set(0.045, 0.1, -0.085));
      bones.head.localToWorld(this.cheeks[1].set(-0.045, 0.1, -0.085));
    }
    if (this.streak !== null) this.traceStreak();
  }

  /**
   * Where her swing's streak runs on the picture: from behind her shoulder, curving over it, out to her fist (her
   * near arm's, the one she throws). The hand is past the elbow by about the upper arm's length.
   */
  private traceStreak(): void {
    const { bones } = this;
    const near = this.facing === "right" ? { upper: bones.upperL, fore: bones.foreL } : { upper: bones.upperR, fore: bones.foreR };
    if (!near.upper || !near.fore) return;
    const shoulder = near.upper.getWorldPosition(new Vector3());
    const elbow = near.fore.getWorldPosition(new Vector3());
    const fist = elbow.clone().add(elbow.clone().sub(shoulder));
    const reach = fist.distanceTo(shoulder);
    const behind = shoulder.clone().addScaledVector(fist.clone().sub(shoulder).normalize(), -reach * 0.35);
    behind.y += reach * 0.25;
    const over = shoulder.clone();
    over.y += reach * 0.45;
    this.streakPath.from = this.onPicture(behind);
    this.streakPath.bend = this.onPicture(over);
    this.streakPath.to = this.onPicture(fist);
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
    const radius = Math.max(2 * RES, (0.03 * this.scale * HEIGHT) / (this.camera.position.z * Math.tan(MathUtils.degToRad(this.camera.fov) / 2) * 2));
    const glowX = WIDTH * 0.5;
    const glowY = HEIGHT * 0.38;
    const reach = Math.hypot(WIDTH, HEIGHT) * 0.55;
    // After hours the room glows warmer and pinker the hotter she is.
    const warm = brawl ? [0.2, 0.17, 0.16] : [0.42 + heat * 0.18, 0.22 - heat * 0.04, 0.12 + heat * 0.12];
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const from = ((HEIGHT - 1 - y) * WIDTH + x) * 4;
        const to = (y * WIDTH + x) * 4;
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
          // A floor under her feet, when the picture reaches down to them.
          if (!this.closeUp && !this.inScene && y > HEIGHT * 0.9) {
            r *= 0.8;
            g *= 0.75;
            b *= 0.7;
          }
        }
        data[to] = Math.round(MathUtils.clamp(r, 0, 1) * 255);
        data[to + 1] = Math.round(MathUtils.clamp(g, 0, 1) * 255);
        data[to + 2] = Math.round(MathUtils.clamp(b, 0, 1) * 255);
        data[to + 3] = 255;
      }
    }
    if (this.streak !== null) this.drawStreak();
  }

  /**
   * Her swing's streak, drawn over the picture the way Karryn's Prison paints the arc of Karryn's halberd: a pale
   * band sweeping from behind her shoulder to her fist, widening as it goes, laid down fast and fading out.
   */
  private drawStreak(): void {
    const life = this.streak ?? 0;
    const data = this.image.data;
    const laid = Math.min(1, life / 0.1);
    const fade = 1 - MathUtils.smoothstep(life, STREAK_TIME * 0.35, STREAK_TIME);
    const { from, bend, to } = this.streakPath;
    const tint = [1, 0.93, 0.82];
    const steps = 90 * RES;
    for (let i = 0; i <= steps * laid; i++) {
      const u = i / steps;
      // Along the curve: from behind her shoulder, bending over it, to her fist.
      const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * bend.x + u * u * to.x;
      const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * bend.y + u * u * to.y;
      const width = (0.6 + 3.4 * u) * RES;
      const strength = (0.25 + 0.75 * u) * fade;
      for (let py = Math.floor(y - width); py <= Math.ceil(y + width); py++) {
        if (py < 0 || py >= HEIGHT) continue;
        for (let px = Math.floor(x - width); px <= Math.ceil(x + width); px++) {
          if (px < 0 || px >= WIDTH) continue;
          const k = Math.max(0, 1 - Math.hypot(px - x, py - y) / width) * strength;
          if (k <= 0) continue;
          const at = (py * WIDTH + px) * 4;
          for (let c = 0; c < 3; c++) {
            const v = MathUtils.lerp(data[at + c] / 255, tint[c], Math.min(1, k * 1.4));
            data[at + c] = Math.round(MathUtils.clamp(v, 0, 1) * 255);
          }
        }
      }
    }
  }

  dispose(): void {
    this.hide();
    this.target.dispose();
    this.root.remove();
  }
}

/** Where someone is in a scene: the lead, or joined at one of its slots (an index into its SCENE_JOINS). */
export type CastSpot = "lead" | number;

/** Someone in the after-hours picture with her: their body as it stands, its body name, a key, and where they are. */
export interface CastMember {
  key: string;
  body: Object3D;
  name: string;
  spot: CastSpot;
}

/** One foe in the column across from her: their body as it stands, what the plate says, and how they stand. */
export interface FoeShow {
  /** Tells foes apart from one show to the next, so a picture is only made again when the foe changes. */
  key: string;
  body: Object3D;
  name: string;
  title: string;
  status: readonly BattleStat[];
  lust?: BattleLust | null;
}

/**
 * Whoever she's up against, down the left of the screen across from her: one big picture for one foe, and the
 * column shared out between them when there are more.
 */
export class FoeColumn {
  private readonly root = document.createElement("div");
  private readonly views: BattleView[] = [];
  private readonly keys: string[] = [];
  /** While she's choosing who to go for: what clicking a foe's picture does. */
  private picking: ((index: number) => void) | null = null;

  constructor(private readonly renderer: WebGLRenderer) {
    this.root.id = "battle-foes";
    this.root.setAttribute("aria-hidden", "true");
    document.body.append(this.root);
    // Choosing: the cursor follows the mouse over their pictures, and a click picks one.
    const cardAt = (event: Event) => {
      const card = (event.target as Element | null)?.closest?.(".battle-card");
      return this.views.findIndex((view) => view.element === card);
    };
    this.root.addEventListener("pointerover", (event) => {
      const index = cardAt(event);
      if (this.picking && index >= 0) this.aim(index, this.picking);
    });
    this.root.addEventListener("click", (event) => {
      const index = cardAt(event);
      if (this.picking && index >= 0) this.picking(index);
    });
  }

  /**
   * The target cursor (KP's enemy select): over the picture of foe `index`, or none. With `pick`, she's choosing,
   * and their pictures can be pointed at and clicked.
   */
  aim(index: number | null, pick?: (index: number) => void): void {
    this.picking = pick ?? null;
    this.root.classList.toggle("picking", Boolean(pick));
    this.views.forEach((view, i) => view.element.classList.toggle("aimed", i === index));
  }

  show(foes: readonly FoeShow[], mode: BattleMode): void {
    while (this.views.length < foes.length) this.views.push(new BattleView(this.renderer, { parent: this.root }));
    this.views.forEach((view, i) => {
      const foe = foes[i];
      if (!foe) {
        view.hide();
        this.keys[i] = "";
        return;
      }
      if (this.keys[i] !== foe.key || !view.open) {
        this.keys[i] = foe.key;
        view.show(foe.body, foe.name, mode, foe.title, "right");
      }
      view.setStatus(foe.status);
      view.setLust(foe.lust ?? null);
    });
    this.root.dataset.count = String(foes.length);
    this.root.classList.toggle("open", foes.length > 0);
  }

  /** A foe takes a hit: a flinch and a flash over their picture. */
  hit(index: number): void {
    this.views[index]?.hit(true);
  }

  hide(): void {
    this.aim(null);
    for (const view of this.views) view.hide();
    this.keys.length = 0;
    this.root.classList.remove("open");
  }

  update(dt: number): void {
    for (const view of this.views) view.update(dt);
  }
}
