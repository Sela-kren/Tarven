import {
  Box3,
  Camera,
  CylinderGeometry,
  Group,
  MathUtils,
  Material,
  Mesh,
  Object3D,
  PointLight,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import {
  averageColor,
  BODY_NAMES,
  displayHex,
  dressColors,
  Dresser,
  LOOK_OPTIONS,
  loadLooks,
  OUTFIT_COLORS,
  randomLook,
  storeLooks,
  type BodyName,
  type Look,
  type Looks,
  type LookTab,
} from "./appearance";
import { falloff, footfalls, musicFor, nextSoundLevel, type Soundscape } from "./audio";
import { Customizer } from "./customizer";
import { resolveCircle, type Rect, type Vec2 } from "./collision";
import {
  BED_NAME,
  BED_SPOT,
  BEDROOM_DOOR_NAME,
  BEDROOM_DOOR_OPEN,
  BEDROOM_DOOR_OPEN_ANGLE,
  BEDROOM_DOOR_SHUT,
  BEDROOM_DOOR_SPOT,
  BEDROOM_FROM_X,
  BELL_SPOT,
  BIN_NAME,
  BIN_SPOT,
  FRONT_DOOR_HINGE,
  FRONT_DOOR_NAME,
  FRONT_DOOR_OPEN_ANGLE,
  DESK_NAME,
  DESK_SPOT,
  makeBell,
  WASH_TUB_NAME,
  WASH_TUB_SPOT,
} from "./furnishings";
import { BuildMode } from "./buildmode";
import { GuestActor, Walker } from "./guests";
import { cloneLayout, emptyLayout, footprint, HousePlan, seatSpecs, type HouseLayout, type Placed } from "./house";
import { HouseView } from "./houseview";
import { StatsHud } from "./hud";
import { Icon, type IconName } from "./icons";
import type { Input } from "./input";
import { findDustSpots, MessLayer } from "./mess";
import { Outline, outlineMaterial } from "./outline";
import { renderPortrait } from "./portraits";
import {
  describeSave,
  latestSave,
  MANUAL_SLOTS,
  readSave,
  slotName,
  SLOTS,
  writeSave,
  type SaveData,
} from "./save";
import { INTRO, StoryBox } from "./story";
import { Chatter } from "./chatter";
import { DialogueBox } from "./dialogue";
import { SpeechBubbles, type Speaker } from "./speech";
import { formatHour, type WorldClock } from "./time";
import { NavGrid } from "./path";
import { Body, Sibling, WALK_STYLE_NAMES } from "./player";
import { applyRetroLook, solidRetroMaterial } from "./retro";
import {
  DEBT,
  drunkLabel,
  ENDINGS,
  HEAT_MAX,
  NIGHTS,
  STOCK_COST,
  STOCK_PACK,
  Tavern,
  TRAY_SIZE,
  TRUST_MAX,
  UPGRADE_COST,
  UPGRADES,
  WARE_NAMES,
  type GuestKind,
  type Held,
  type Item,
  type Phase,
  type Prompt,
  type Station,
  type TalkLine,
  type Target,
  type TavernSave,
  type UpgradeId,
  type Ware,
} from "./tavern";
import { makeSeat, type World } from "./world";

const ROOM: Rect = { minX: -7, maxX: 7, minZ: -5, maxZ: 5 };
/** How far the follow camera moves around the original room. */
const CAMERA_LIMIT_X = 0.5;
const CAMERA_LIMIT_Z = 1;
const DOOR: Vec2 = { x: -1.5, z: -4.4 };
const VISITOR_STOP: Vec2 = { x: -1.5, z: -3 };
/** Everyone comes in from out of sight behind the wall, straight through the door to just inside it. */
const ENTRANCE: readonly Vec2[] = [{ x: -1.5, z: -6.5 }, { x: -1.5, z: -3.5 }];
/** The middle of the front doorway, and how near someone walking must be for it to open. */
const FRONT_DOORWAY: Vec2 = { x: -1.5, z: -5 };
const FRONT_DOOR_REACH = 2.2;
const FRONT_DOOR_SWING_SECONDS = 0.5;
/** How long the shut door stays shut after the last guest leaves, before the last-call visitor comes in. */
const VISITOR_WAIT_SECONDS = 2.5;
const GUEST_CLEARANCE = 0.28;
const STATION_RANGE = 1.35;
const GUEST_RANGE = 1.7;
/** How close you need to be to dirty dishes on a table, or to a mess on the floor. */
const DISHES_RANGE = 1.3;
const FLOOR_MESS_RANGE = 1.1;
const FLOOR_MESS_ARROW_HEIGHT = 1.4;
const LISTEN_RANGE = 2.2;
/** Talk about you can be made out from this close. Further off, it's only whispering. */
const OVERHEAR_RANGE = 4.5;
const ITEM_SCALE = 1.6;
const TOAST_SECONDS = 5;
const POT_WARNING_SECONDS = 5;
const STATION_ICON_HEIGHT = 2;
const STATION_ARROW_HEIGHT = 2.6;
const GUEST_ARROW_HEIGHT = 3;
const HELD_ICON_HEIGHT = 2.15;
const BURNT_COLOR = 0x120c08;
/** The round tray ale is carried on: its size, and where its cups stand (x across, z away from the body). */
const TRAY_RADIUS = 0.24;
const TRAY_THICKNESS = 0.03;
const TRAY_COLOR = 0x6e5a40;
/** Pushes the tray out a little from where a single dish is held, so its back edge clears the body. */
const TRAY_REACH = -0.06;
const TRAY_CUPS: [number, number][] = [[0, -0.1], [-0.11, 0.07], [0.11, 0.07]];

// Character select: a close shot of both siblings standing side by side, facing the camera.
const SELECT_EYE = new Vector3(0, 1.55, 6.2);
const SELECT_LOOK_HEIGHT = 0.75;
/** How far the chosen sibling steps towards the camera. */
const SELECT_STEP = 0.35;
/** A warm fill light in front of the siblings, since the bar lantern lights them from behind. */
const SELECT_LIGHT_OFFSET = new Vector3(0, 2.4, 2.4);
const SELECT_LIGHT_INTENSITY = 9;
/**
 * Customising: the camera comes in close on the chosen sibling, off to one side so the panel on the right
 * doesn't cover them; for the face it frames the head. Distances are from the sibling, which faces the camera.
 */
const CUSTOMIZE_BODY_SHOT = { side: 0.5, height: 0.95, distance: 3.9 };
const CUSTOMIZE_FACE_SHOT = { side: 0.17, distance: 1.35 };
/** How fast the camera eases between customise shots, per second. */
const CUSTOMIZE_CAMERA_RATE = 6;
/** How far the character turns per pixel dragged, in radians. */
const CUSTOMIZE_TURN_PER_PIXEL = 0.012;
/** Outline thickness around a hovered or chosen sibling, in the model's own units. */
const OUTLINE_WIDTH = 0.026;
/** How fast the story's room shot drifts from side to side. */
const ROOM_SHOT_DRIFT = 0.12;
/** How far the story sprite turns away from facing straight out, so it doesn't look flat. */
const SPRITE_TURN = 0.3;
/** How long the screen takes to go black, and then to come back, when the night starts. */
const FADE_SECONDS = 0.45;

// The day's schedule on the world clock. The day passes slowly, then waits in the late afternoon
// until you open the doors; the sun then goes down over a few seconds.
const MORNING_HOUR = 8;
const AFTERNOON_HOLD_HOUR = 17;
/** Game hours per real second while the tavern is closed: morning to late afternoon in about four minutes. */
const DAY_HOURS_PER_SECOND = 0.04;
const NIGHT_HOUR = 21;
const SUNSET_SECONDS = 5;
/** How close you need to be to the middle of the bed to get into it. */
const BED_RANGE = 1.6;
const BED_ARROW_HEIGHT = 1.7;
/** Outline around whatever E would use, in world units. */
const TARGET_OUTLINE_WIDTH = 0.022;
/** How long the bell rocks after it rings, and how far. */
const BELL_RING_SECONDS = 0.8;
const BELL_ROCK = 0.22;
/** The barrels the barrel station takes casks from. */
const BARRELS = ["Barrel_0", "Barrel_1", "Barrel_2"];
/** Room objects the game outlines or moves, which the room must keep whole instead of merging. */
export const WHOLE_PIECES = [...BARRELS, BED_NAME, BEDROOM_DOOR_NAME, BIN_NAME, DESK_NAME, FRONT_DOOR_NAME, WASH_TUB_NAME];
/** How close you need to be to the bedroom door, and how fast it swings (per second, eased). */
const BEDROOM_DOOR_RANGE = 1.3;
const BEDROOM_DOOR_SWING_RATE = 7;
const DESK_RANGE = 1.5;
/** How far the camera pulls back to look at the plans. */
const BUILD_ZOOM = 1.4;
const SIBLING_RADIUS = 0.3;
/** How far past the room's walls the follow camera has to reach for the room to fill the screen. */
const CAMERA_INSET_X = 6.5;
const CAMERA_INSET_Z = 4;
/** Places that must always be possible to walk to from the front door, whatever gets built. */
const BEHIND_THE_BAR: Vec2 = { x: 3.2, z: -3.85 };
const BY_THE_BEDROOM_DOOR: Vec2 = { x: 6.5, z: 0 };

const ITEM_NODES: Record<Item, string> = {
  ale: "Item_Ale",
  bread: "Item_Bread",
  stew: "Item_Stew",
  cask: "Item_Cask",
};

const OUTFITS: Record<GuestKind | "visitor", { top: number; legs: number; hair: number }> = {
  farmer: { top: 0x8a7a3e, legs: 0x4c3a24, hair: 0x4a3420 },
  smuggler: { top: 0x24242e, legs: 0x18181e, hair: 0x101012 },
  soldier: { top: 0x8c2020, legs: 0x3a3a40, hair: 0x2b2018 },
  fugitive: { top: 0xbcb4a2, legs: 0x6a6252, hair: 0x9a8c7a },
  // Whoever comes in at last call, dressed unlike any guest so nobody takes them for one who stayed behind.
  visitor: { top: 0x2f5590, legs: 0x1c1c22, hair: 0x2b2018 },
};

/** Who the player can be, by sibling index: the male body, then the female one. */
const PLAYER_LABELS = ["Male", "Female"];
const STATIONS: Station[] = ["tap", "bread", "pot", "barrel", "bin", "wash"];

interface Assets {
  male: Object3D;
  female: Object3D;
  props: Object3D;
  /** Where the furniture stood in the room as it was loaded. */
  furniture: Placed[];
}

interface Button {
  label: string;
  onPick: () => void;
  disabled?: boolean;
}

function element(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Page is missing #${id}`);
  return found;
}

/** What the clock says the tavern is doing. */
const PHASE_LABELS: Record<Phase, string> = {
  day: "Closed",
  dusk: "Opening",
  service: "Open",
  lastcall: "Last call",
  bedtime: "Shut for the night",
  dawn: "Morning",
  ended: "",
};

/** A name for a target that stays the same from frame to frame. */
function targetKey(target: Target): string {
  if (target.kind === "station") return `station:${target.station}`;
  if (target.kind === "guest") return `guest:${target.id}`;
  if (target.kind === "mess") return `mess:${target.id}`;
  return target.kind;
}

/** The prop model of a station: Station_Tap, Station_Bread, Station_Pot. */
const STATION_NODES: Record<Exclude<Station, "barrel" | "bin" | "wash">, string> = {
  tap: "Station_Tap",
  bread: "Station_Bread",
  pot: "Station_Pot",
};

function requireNode(root: Object3D, name: string): Object3D {
  const node = root.getObjectByName(name);
  if (!node) throw new Error(`props.glb is missing "${name}"`);
  return node;
}

/** How far the hearth and the stew pot carry, in metres. The fire stays faintly audible all over the main room. */
const FIRE_REACH = 11;
const FIRE_ROOM_LEVEL = 0.2;
const FIRE_BEDROOM_LEVEL = 0.05;
const STEW_REACH = 6;
/** How many guests make a full room, and how much of them you hear from the bedroom. */
const CROWD_FULL = 6;
const CROWD_BEDROOM_LEVEL = 0.3;
const RUNNING_STEP_LOUDNESS = 1.6;

export class Game {
  readonly tavern: Tavern;
  readonly siblings: [Sibling, Sibling];
  active = 0;

  private screen:
    | "title" | "select" | "customize" | "fade" | "story" | "play" | "talk" | "visitor" | "panel" | "paused" | "build" = "title";
  private readonly dialogue = new DialogueBox(
    {
      root: element("talk"),
      guest: element("talk-guest"),
      you: element("talk-you"),
      name: element("talk-name"),
      text: element("talk-text"),
      next: element("talk-next"),
      choices: element("talk-choices"),
    },
    (line) => this.portraitFor(line),
  );
  /** Standing portraits for conversations: yours, and one per kind of guest and body. */
  private playerPortrait: HTMLCanvasElement | null = null;
  private readonly guestPortraits = new Map<string, HTMLCanvasElement>();
  /** What to return to when the pause menu closes. */
  private pausedFrom: "play" | "visitor" = "play";
  private afterFade: (() => void) | null = null;
  private readonly roomShot = { eye: new Vector3(), target: new Vector3() };
  /** True until the night starts; the camera holds the character select shot meanwhile. */
  private staging = true;
  private readonly spawnPoints: [Vector3, Vector3];
  private readonly selectShot: { eye: Vector3; target: Vector3 };
  private chosen: number | null = null;
  private hovered: number | null = null;
  private fadeLeft = 0;
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly hitBox = new Box3();
  private readonly stageLight = new PointLight(0xffc890, SELECT_LIGHT_INTENSITY, 9, 2);
  private readonly hoverOutline = outlineMaterial(0xf0e4c4, OUTLINE_WIDTH);
  private readonly chosenOutline = outlineMaterial(0xffd23a, OUTLINE_WIDTH);
  private readonly outlines: Outline[];
  private nav: NavGrid;
  private readonly houseView: HouseView;
  private readonly defaultLayout: HouseLayout;
  private plan: HousePlan;
  /** Everything that blocks walking and never moves, so the rest can be added back when the plan changes. */
  private readonly staticColliders: Rect[];
  private readonly build: BuildMode;
  private readonly actors = new Map<number, GuestActor>();
  /** What the guests are saying out loud, and the bubbles that show it over their heads. */
  private readonly chatter = new Chatter();
  private readonly speech = new SpeechBubbles(element("speech"));
  private readonly guestLayer = new Group();
  /** What the night left to clean up, drawn in the room. */
  private readonly messLayer: MessLayer;
  private readonly itemTemplates: Record<Item, Object3D>;
  private readonly guestModels: { male: Object3D; female: Object3D };
  /** Each sibling's look, kept on the customise screen and in saves; both start as the models were built. */
  private looks: Looks = loadLooks();
  /** Puts looks on the siblings; one each, in the same order. */
  private readonly dressers: Dresser[];
  private readonly customizer: Customizer;
  /** The camera's customise shot, easing towards the one the open tab wants. */
  private readonly customShot = { eye: new Vector3(), target: new Vector3() };
  private readonly customGoal = { eye: new Vector3(), target: new Vector3() };
  /** The pointer's last X while dragging the character round, or null when not dragging. */
  private dragX: number | null = null;
  private readonly spots: Record<Station, Vector3>;
  private readonly potStew: Mesh;
  private readonly potStewMaterial: Material;
  private readonly burntMaterial = solidRetroMaterial("T_burnt", BURNT_COLOR);
  /** What each sibling's hands show now, as "item:count", so a change of either rebuilds the model. */
  private readonly carried: [string | null, string | null] = [null, null];
  private readonly trayGeometry = new CylinderGeometry(TRAY_RADIUS, TRAY_RADIUS - 0.02, TRAY_THICKNESS, 12).translate(
    0,
    -TRAY_THICKNESS / 2,
    0,
  );
  private readonly trayMaterial = solidRetroMaterial("T_tray", TRAY_COLOR);
  private readonly bell: Object3D;
  private bellRinging = 0;
  private readonly bedroomDoor: Object3D;
  /** The rectangle the bedroom door blocks right now, kept in the world's colliders. */
  private bedroomDoorBlock: Rect | null = null;
  /** Outlines around each thing you can use, keyed by `targetKey`. */
  private readonly targetOutlines = new Map<string, Outline[]>();
  private readonly targetOutline = outlineMaterial(0xf0e4c4, TARGET_OUTLINE_WIDTH);
  /** What is outlined now, and the outline made for it when it is a guest. */
  private highlighted: string | null = null;
  private guestOutline: Outline | null = null;
  /** The drawn mess that outline is on, since a pile is redrawn when more is added to it. */
  private outlinedMess: Object3D | null = null;

  private readonly tapIcon = new Icon();
  private readonly potIcon = new Icon();
  private readonly washIcon = new Icon();
  private readonly targetArrow = new Icon(0.5);
  // A carried dish is hidden by the body whenever a sibling faces away from the camera.
  private readonly heldIcons = [new Icon(0.45), new Icon(0.45)];

  private readonly stats = new StatsHud(element("stats"));
  private readonly clockTimeEl = element("clock-time");
  private readonly clockDayEl = element("clock-day");
  private readonly clockSkyEl = element("clock-sky");
  private readonly clockMarkerEl = element("clock-marker");
  private readonly promptEl = element("prompt");
  private readonly toastEl = element("toast");
  private readonly panelEl = element("panel");
  private readonly selectEl = element("select");
  private readonly selectStartEl = element("select-start") as HTMLButtonElement;
  private readonly selectCustomizeEl = element("select-customize") as HTMLButtonElement;
  private readonly fadeEl = element("fade");
  private readonly storyEl = element("story");
  private readonly story = new StoryBox(
    {
      root: this.storyEl,
      name: element("story-name"),
      text: element("story-text"),
      next: element("story-next"),
      cg: element("story-cg"),
      sprite: element("story-sprite"),
    },
    {
      player: () => this.active,
      fill: (text) => text.replaceAll("{debt}", String(DEBT)),
    },
  );

  private panelButtons: Button[] = [];
  /** Where Esc leads from the open menu, or null when it has no way back. */
  private panelBack: (() => void) | null = null;
  /** Tonight as it opened: what a save holds. */
  private checkpoint: TavernSave;
  private visitor: Walker | null = null;
  private visitorWalking = false;
  private visitorWait = 0;
  private readonly frontDoorHinge = new Group();
  /** 0 is shut, 1 is wide open. */
  private frontDoorOpen = 0;
  private toastLeft = 0;
  private time = 0;

  constructor(
    scene: Scene,
    private readonly input: Input,
    private readonly world: World,
    assets: Assets,
    private readonly camera: Camera,
    private readonly renderer: WebGLRenderer,
    /** The world's time of day, shared with the lighting. */
    private readonly clock: WorldClock,
    private readonly audio: Soundscape,
  ) {
    this.bell = makeBell();
    this.bell.position.copy(BELL_SPOT);
    assets.props.add(this.bell);

    applyRetroLook(assets.male);
    applyRetroLook(assets.female);
    applyRetroLook(assets.props);

    this.houseView = new HouseView(world);
    this.staticColliders = [...world.colliders];
    this.defaultLayout = emptyLayout(assets.furniture);
    this.plan = new HousePlan(cloneLayout(this.defaultLayout));
    this.nav = this.applyPlan();

    const dustSpots = findDustSpots(world.colliders, ROOM);
    this.tavern = new Tavern(world.seats.length, world.seats.map((seat) => seat.table), dustSpots.length);
    this.messLayer = new MessLayer(world.seats, dustSpots);
    scene.add(this.messLayer.group);
    this.checkpoint = this.tavern.snapshot();

    const { props } = assets;
    props.updateMatrixWorld(true);
    this.itemTemplates = {} as Record<Item, Object3D>;
    for (const item of Object.keys(ITEM_NODES) as Item[]) {
      const template = requireNode(props, ITEM_NODES[item]);
      template.removeFromParent();
      template.scale.setScalar(ITEM_SCALE);
      this.itemTemplates[item] = template;
    }
    this.spots = {
      tap: requireNode(props, "Spot_Tap").getWorldPosition(new Vector3()),
      bread: requireNode(props, "Spot_Bread").getWorldPosition(new Vector3()),
      pot: requireNode(props, "Spot_Pot").getWorldPosition(new Vector3()),
      barrel: requireNode(props, "Spot_Barrel").getWorldPosition(new Vector3()),
      bin: BIN_SPOT.clone(),
      wash: WASH_TUB_SPOT.clone(),
    };
    this.potStew = requireNode(props, "Station_PotStew") as Mesh;
    this.potStewMaterial = this.potStew.material as Material;
    this.potStew.castShadow = false;
    this.potStew.visible = false;
    scene.add(props);

    // Made after the retro look is applied, which would otherwise make the outlines cast shadows.
    const outline = (objects: Object3D[]) => objects.map((object) => new Outline(object, this.targetOutline, true));
    const piece = (name: string) => {
      const found = world.pieces.get(name);
      if (!found) throw new Error(`The room did not keep "${name}" whole`);
      return found;
    };
    for (const station of STATIONS) {
      const objects =
        station === "barrel"
          ? BARRELS.map(piece)
          : station === "bin"
            ? [piece(BIN_NAME)]
            : station === "wash"
              ? [piece(WASH_TUB_NAME)]
              : [requireNode(props, STATION_NODES[station])];
      this.targetOutlines.set(targetKey({ kind: "station", station }), outline(objects));
    }
    this.targetOutlines.set(targetKey({ kind: "bell" }), outline([this.bell]));
    this.targetOutlines.set(targetKey({ kind: "bed" }), outline([piece(BED_NAME)]));
    this.bedroomDoor = piece(BEDROOM_DOOR_NAME);
    this.targetOutlines.set(targetKey({ kind: "door" }), outline([this.bedroomDoor]));
    this.targetOutlines.set(targetKey({ kind: "desk" }), outline([piece(DESK_NAME)]));
    this.updateBedroomDoor(Infinity);
    this.frontDoorHinge.position.copy(FRONT_DOOR_HINGE);
    world.root.add(this.frontDoorHinge);
    this.frontDoorHinge.attach(piece(FRONT_DOOR_NAME));

    // Copied first, because each Sibling moves its body out of the loaded model.
    this.guestModels = { male: cloneSkinned(assets.male), female: cloneSkinned(assets.female) };

    const { spawn } = world;
    this.siblings = [
      new Sibling(assets.male, "Male", spawn),
      new Sibling(assets.female, "Female", spawn.clone().setX(spawn.x + 1)),
    ];
    scene.add(this.siblings[0].root, this.siblings[1].root, this.guestLayer);

    // Each sibling gets meshes of its own to reshape, before the outlines are made from them.
    this.dressers = this.siblings.map((sibling, index) => new Dresser(sibling.root, BODY_NAMES[index]));
    this.siblings.forEach((_, index) => this.applyLook(index));
    this.customizer = new Customizer(element("customize"), {
      change: (look) => this.changeLook(look),
      tab: (tab) => this.aimCustomize(tab, false),
      done: () => this.closeCustomizer(),
      builtColor: (id) => this.builtColor(id),
      random: (body) => randomLook(body),
      undress: (undressed) => this.chosen !== null && this.dressers[this.chosen].setUndressed(undressed),
    });

    this.spawnPoints = [this.siblings[0].position.clone(), this.siblings[1].position.clone()];
    const middle = this.spawnPoints[0].clone().lerp(this.spawnPoints[1], 0.5);
    this.selectShot = {
      eye: middle.clone().add(SELECT_EYE),
      target: middle.clone().setY(SELECT_LOOK_HEIGHT),
    };
    this.outlines = this.siblings.map((sibling) => new Outline(sibling.root, this.hoverOutline));
    this.stageLight.position.copy(middle).add(SELECT_LIGHT_OFFSET);
    scene.add(this.stageLight);
    // The model faces -Z at rest; turn both round to face the select camera.
    this.siblings.forEach((sibling) => sibling.face(Math.PI));
    document.body.classList.add("staging");

    window.addEventListener("pointermove", (event) => this.pointAt(event, false));
    window.addEventListener("click", (event) => this.pointAt(event, true));
    this.selectStartEl.addEventListener("click", () => this.beginNight());
    this.selectCustomizeEl.addEventListener("click", () => this.openCustomizer());
    window.addEventListener("pointerdown", (event) => {
      if (this.screen === "customize" && event.target instanceof HTMLCanvasElement) this.dragX = event.clientX;
    });
    window.addEventListener("pointermove", (event) => this.dragCharacter(event));
    window.addEventListener("pointerup", () => (this.dragX = null));
    this.storyEl.addEventListener("click", () => this.advanceStory());
    element("story-skip").addEventListener("click", (event) => {
      event.stopPropagation();
      this.audio.play("page");
      this.story.finish();
    });
    // Leaving the window mid-night pauses, so guests don't walk out while you're away.
    window.addEventListener("blur", () => this.pause());

    this.tapIcon.sprite.position.copy(this.spots.tap).setY(STATION_ICON_HEIGHT);
    this.potIcon.sprite.position.copy(this.spots.pot).setY(STATION_ICON_HEIGHT);
    this.washIcon.sprite.position.copy(this.spots.wash).setY(STATION_ICON_HEIGHT);
    scene.add(
      this.tapIcon.sprite,
      this.potIcon.sprite,
      this.washIcon.sprite,
      this.targetArrow.sprite,
      this.heldIcons[0].sprite,
      this.heldIcons[1].sprite,
    );

    this.build = new BuildMode(element("build"), scene, this.houseView, input, {
      camera,
      plan: () => this.plan,
      gold: () => this.tavern.gold,
      addGold: (amount) => (this.tavern.gold += amount),
      blockers: () => this.staticColliders,
      routeProblem: () => this.routeProblem(),
      leave: () => this.closeBuild(),
    });

    // The story and the first day start on a bright morning.
    clock.setTime(0, MORNING_HOUR);
    this.showTitle();
  }

  /** The point the camera should keep in view. */
  get focus(): Vector3 {
    return this.siblings[this.active].position;
  }

  /** A fixed camera shot to hold instead of following the active sibling, or null during play. */
  get closeup(): { eye: Vector3; target: Vector3 } | null {
    if (!this.staging) return null;
    if (this.screen === "story") {
      // A slow drift across the empty room.
      const sway = Math.sin(this.time * ROOM_SHOT_DRIFT);
      this.roomShot.eye.set(sway * 3.2, 3.1, 5.4);
      this.roomShot.target.set(sway * 1.2, 0.9, -2);
      return this.roomShot;
    }
    if (this.screen === "customize") return this.customShot;
    return this.selectShot;
  }

  /** Where the camera looks in build mode, or null when it follows the player. */
  get buildFocus(): Vector3 | null {
    return this.screen === "build" ? this.build.focus : null;
  }

  get cameraZoom(): number {
    return this.screen === "build" ? BUILD_ZOOM : 1;
  }

  /** How far the follow camera may go, so all of a bigger house can be seen. */
  get cameraLimits(): Rect {
    const { minX, maxX, minZ, maxZ } = this.plan.bounds();
    return {
      minX: Math.min(-CAMERA_LIMIT_X, minX + CAMERA_INSET_X),
      maxX: Math.max(CAMERA_LIMIT_X, maxX - CAMERA_INSET_X),
      minZ: Math.min(-CAMERA_LIMIT_Z, minZ + CAMERA_INSET_Z),
      maxZ: Math.max(CAMERA_LIMIT_Z, maxZ - CAMERA_INSET_Z),
    };
  }

  /** The rectangles the plan puts in the way: its walls and furniture. */
  private planColliders(): Rect[] {
    const { plan } = this;
    return [
      ...plan.outerWalls().map((wall) => wall.rect),
      ...plan.drawnWalls().map((wall) => wall.rect),
      ...plan.layout.furniture.map(footprint),
    ];
  }

  /** Draws the plan and makes the room behave like it: walls and furniture block, seats go where the chairs are. */
  private applyPlan(): NavGrid {
    const { colliders, seats } = this.world;
    this.houseView.rebuild(this.plan);
    colliders.length = 0;
    colliders.push(...this.staticColliders, ...this.planColliders());
    if (this.bedroomDoorBlock) colliders.push(this.bedroomDoorBlock);

    const nav = new NavGrid(colliders, GUEST_CLEARANCE, this.plan.bounds());
    seats.length = 0;
    for (const spec of seatSpecs(this.plan.layout.furniture)) {
      const seat = makeSeat(spec);
      if (nav.findPath(DOOR, seat.approach)) seats.push(seat);
    }
    return nav;
  }

  /** What the current plan cuts off from the front door, in words, or null if everything can still be reached. */
  private routeProblem(): string | null {
    const nav = new NavGrid([...this.staticColliders, ...this.planColliders()], GUEST_CLEARANCE, this.plan.bounds());
    const places: [string, Vec2][] = [
      ["the bar", BEHIND_THE_BAR],
      ["the fireplace", this.spots.pot],
      ["the barrels", this.spots.barrel],
      ["the bread", this.spots.bread],
      ["the scrap bin", this.spots.bin],
      ["the wash tub", this.spots.wash],
      ["the bedroom", BY_THE_BEDROOM_DOOR],
      ["the middle of the room", VISITOR_STOP],
    ];
    const cut = places.find(([, place]) => !nav.findPath(DOOR, place));
    return cut ? `That would block the way to ${cut[0]}.` : null;
  }

  private openBuild(): void {
    this.setPrompt("");
    this.targetArrow.show(null);
    this.highlight(null);
    this.screen = "build";
    document.body.classList.add("building");
    this.build.enter();
  }

  /** Leaves build mode: the room takes on the new plan and the game is saved with it. */
  private closeBuild(): void {
    document.body.classList.remove("building");
    this.screen = "play";
    this.nav = this.applyPlan();
    this.tavern.setSeats(this.world.seats.map((seat) => seat.table));
    this.tavern.layout = cloneLayout(this.plan.layout);
    // Anyone standing where something now stands gets moved aside.
    for (const sibling of this.siblings) {
      const clear = resolveCircle(sibling.position, SIBLING_RADIUS, this.world.colliders, 8);
      sibling.position.setX(clear.x).setZ(clear.z);
    }
    this.checkpoint = this.tavern.snapshot();
    writeSave("auto", this.active, this.checkpoint, this.looks);
  }

  private makeItem(item: Item): Object3D {
    const copy = this.itemTemplates[item].clone(true);
    copy.traverse((object) => (object.castShadow = false));
    return copy;
  }

  private makeGuestBody(kind: GuestKind | "visitor", female: boolean): Body {
    const body: BodyName = female ? "Female" : "Male";
    const model = cloneSkinned(female ? this.guestModels.female : this.guestModels.male);
    const outfit = OUTFITS[kind];
    const slots = OUTFIT_COLORS[body];
    const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
    model.traverse((object) => {
      object.visible = true;
      // Only the siblings cast shadows, to keep the frame rate up.
      if (object instanceof Mesh) object.castShadow = false;
    });
    dressColors(model, body, { [slots.top]: hex(outfit.top), [slots.legs]: hex(outfit.legs), [slots.hair]: hex(outfit.hair) });
    return new Body(model, body);
  }

  /** Puts a sibling's look on them, and lets their walk and springs settle to the new shape. */
  private applyLook(index: number): void {
    this.dressers[index].apply(this.looks[BODY_NAMES[index]]);
    const dresser = this.dressers[index];
    this.siblings[index].refreshBody(dresser.legSize(), dresser.armSpread());
    this.playerPortrait = null;
  }

  private changeLook(look: Look): void {
    if (this.chosen === null) return;
    this.looks = { ...this.looks, [BODY_NAMES[this.chosen]]: look };
    this.applyLook(this.chosen);
  }

  /** The colour a customise setting has as built, for its "as built" swatch. */
  private builtColor(id: string): string {
    const index = this.chosen ?? 0;
    const body = BODY_NAMES[index];
    const def = LOOK_OPTIONS[body].colors.find((d) => d.id === id);
    const material = def ? this.dressers[index].original(def.parts[0][0], def.parts[0][1]) : undefined;
    return material ? displayHex(averageColor(material)) : "#808080";
  }

  /** Opens the customise panel on the chosen sibling, with the other out of the shot. */
  private openCustomizer(): void {
    if (this.screen !== "select" || this.chosen === null) return;
    this.audio.play("click");
    const index = this.chosen;
    this.screen = "customize";
    this.selectEl.classList.remove("open");
    this.outlines.forEach((outline) => outline.show(null));
    this.siblings.forEach((sibling, i) => (sibling.root.visible = i === index));
    this.customizer.open(BODY_NAMES[index], this.looks[BODY_NAMES[index]], PLAYER_LABELS[index]);
    this.aimCustomize("body", true);
  }

  private closeCustomizer(): void {
    if (this.screen !== "customize") return;
    this.audio.play("click");
    storeLooks(this.looks);
    this.customizer.close();
    // Undressing is only for looking: everyone is dressed again on the way out.
    this.dressers.forEach((dresser) => dresser.setUndressed(false));
    this.dragX = null;
    this.siblings.forEach((sibling) => {
      sibling.root.visible = true;
      sibling.face(Math.PI);
    });
    this.screen = "select";
    this.selectEl.classList.add("open");
  }

  /** Points the customise camera at what a tab edits; `cut` jumps there instead of easing. */
  private aimCustomize(tab: LookTab, cut: boolean): void {
    if (this.chosen === null) return;
    const at = this.spawnPoints[this.chosen].clone();
    at.z += SELECT_STEP;
    const { eye, target } = this.customGoal;
    if (tab === "face" || tab === "hair") {
      // The head's height changes with the sliders, so it is measured each time.
      const top = this.hitBox.setFromObject(this.siblings[this.chosen].root).max.y;
      const head = top - 0.14;
      target.set(at.x + CUSTOMIZE_FACE_SHOT.side, head, at.z);
      eye.set(at.x + CUSTOMIZE_FACE_SHOT.side, head + 0.05, at.z + CUSTOMIZE_FACE_SHOT.distance);
    } else {
      const { side, height, distance } = CUSTOMIZE_BODY_SHOT;
      target.set(at.x + side, height, at.z);
      eye.set(at.x + side, height + 0.25, at.z + distance);
    }
    if (cut) {
      this.customShot.eye.copy(eye);
      this.customShot.target.copy(target);
    }
  }

  private dragCharacter(event: PointerEvent): void {
    if (this.screen !== "customize" || this.dragX === null || this.chosen === null) return;
    const sibling = this.siblings[this.chosen];
    sibling.face(sibling.root.rotation.y + (event.clientX - this.dragX) * CUSTOMIZE_TURN_PER_PIXEL);
    this.dragX = event.clientX;
  }

  private updateCustomize(dt: number): void {
    if (this.chosen === null) return;
    const spot = this.spawnPoints[this.chosen].clone();
    spot.z += SELECT_STEP;
    this.siblings[this.chosen].stepTo(spot, dt);
    const ease = 1 - Math.exp(-CUSTOMIZE_CAMERA_RATE * dt);
    this.customShot.eye.lerp(this.customGoal.eye, ease);
    this.customShot.target.lerp(this.customGoal.target, ease);
  }

  private syncGuests(dt: number): void {
    const { tavern, actors } = this;
    for (const guest of [...tavern.guests]) {
      let actor = actors.get(guest.id);
      if (!actor) {
        actor = new GuestActor(
          this.makeGuestBody(guest.kind, guest.id % 2 === 0),
          guest,
          this.world.seats[guest.seat],
          this.nav,
          ENTRANCE,
          (item) => this.makeItem(item),
          this.guestLayer,
        );
        actors.set(guest.id, actor);
        this.guestLayer.add(actor.group);
      }
      if (actor.update(dt, tavern)) {
        if (this.highlighted === targetKey({ kind: "guest", id: guest.id })) this.highlight(null);
        this.guestLayer.remove(actor.group);
        actors.delete(guest.id);
        tavern.guestLeft(guest.id);
      }
    }
  }

  /** Ale is carried on a tray with its cups on top; anything else is held on its own. */
  private makeHeld(item: Held, count: number): Object3D {
    if (item !== "ale" && item !== "dirty") return this.makeItem(item);
    const tray = new Group();
    const board = new Mesh(this.trayGeometry, this.trayMaterial);
    board.castShadow = false;
    tray.add(board);
    if (item === "dirty") {
      tray.add(this.messLayer.dirtyStack(count));
    } else {
      TRAY_CUPS.slice(0, count).forEach(([x, z]) => {
        const cup = this.makeItem("ale");
        cup.position.set(x, 0, z);
        tray.add(cup);
      });
    }
    // Positioned by the sibling at the carry point; this inner group moves it out a little further.
    const held = new Group();
    tray.position.z = TRAY_REACH;
    held.add(tray);
    return held;
  }

  private syncCarried(): void {
    this.siblings.forEach((sibling, index) => {
      const item = this.tavern.carrying[index];
      const key = item && `${item}:${this.tavern.carryCount[index]}`;
      if (key === this.carried[index]) return;
      this.carried[index] = key;
      sibling.hold(item ? this.makeHeld(item, this.tavern.carryCount[index]) : null);
      this.heldIcons[index].show(item);
    });
  }

  private syncStations(): void {
    const { tavern } = this;
    let tap: IconName | null = null;
    if (tavern.aleReady > 0) tap = "ale";
    else if (tavern.pourLeft !== null) tap = "dots";
    else if (tavern.tapLeft === 0) tap = "alert";
    this.tapIcon.show(tap);

    const blinkOn = Math.floor(this.time * 4) % 2 === 0;
    const aboutToBurn = tavern.potState === "ready" && tavern.potTimer < POT_WARNING_SECONDS;
    const potIcons: Record<typeof tavern.potState, IconName | null> = {
      empty: null,
      cooking: "dots",
      ready: aboutToBurn && blinkOn ? "alert" : "stew",
      burnt: "alert",
    };
    this.potIcon.show(potIcons[tavern.potState]);
    this.washIcon.show(tavern.tub.length > 0 ? "dirty" : null);
    this.potStew.visible = tavern.potState !== "empty";
    this.potStew.material = tavern.potState === "burnt" ? this.burntMaterial : this.potStewMaterial;
  }

  private findTarget(): { target: Target; at: Vector3; height: number; prompt: Prompt } | null {
    const position = this.siblings[this.active].position;
    let best: { target: Target; at: Vector3; height: number; prompt: Prompt; score: number } | null = null;

    const consider = (target: Target, at: Vector3, height: number, range: number) => {
      const distance = position.distanceTo(new Vector3(at.x, position.y, at.z));
      if (distance > range) return;
      const prompt = this.tavern.prompt(this.active, target);
      if (!prompt) return;
      // Anything you can actually do beats a status message, and serving a guest
      // beats putting the item back on a station that happens to be closer.
      const serving = target.kind === "guest" && this.tavern.carrying[this.active] !== null;
      const score = distance + (prompt.actionable ? 0 : 100) - (serving ? 50 : 0);
      if (!best || score < best.score) best = { target, at, height, prompt, score };
    };

    for (const station of STATIONS) {
      consider({ kind: "station", station }, this.spots[station], STATION_ARROW_HEIGHT, STATION_RANGE);
    }
    for (const guest of this.tavern.guests) {
      consider({ kind: "guest", id: guest.id }, this.world.seats[guest.seat].position, GUEST_ARROW_HEIGHT, GUEST_RANGE);
    }
    for (const mess of this.tavern.messes) {
      const spots = this.messLayer.spots(mess.id);
      if (spots.length === 0) continue;
      const nearest = spots.reduce((a, b) => (a.distanceToSquared(position) <= b.distanceToSquared(position) ? a : b));
      const onTable = mess.kind === "dishes";
      consider(
        { kind: "mess", id: mess.id },
        nearest,
        onTable ? STATION_ARROW_HEIGHT : FLOOR_MESS_ARROW_HEIGHT,
        onTable ? DISHES_RANGE : FLOOR_MESS_RANGE,
      );
    }
    consider({ kind: "bell" }, BELL_SPOT, STATION_ARROW_HEIGHT, STATION_RANGE);
    consider({ kind: "bed" }, BED_SPOT, BED_ARROW_HEIGHT, BED_RANGE);
    consider({ kind: "door" }, BEDROOM_DOOR_SPOT, STATION_ARROW_HEIGHT, BEDROOM_DOOR_RANGE);
    consider({ kind: "desk" }, DESK_SPOT, STATION_ARROW_HEIGHT, DESK_RANGE);
    return best;
  }

  /** Opens the front door for anyone walking up to it, and shuts it once they're through. */
  private updateFrontDoor(dt: number): void {
    const near = ({ x, z }: Vec2) => Math.hypot(x - FRONT_DOORWAY.x, z - FRONT_DOORWAY.z) < FRONT_DOOR_REACH;
    const wanted =
      (this.visitor !== null && this.visitorWalking && near(this.visitor.group.position)) ||
      [...this.actors.values()].some((actor) => actor.walking && near(actor.group.position));
    const step = dt / FRONT_DOOR_SWING_SECONDS;
    this.frontDoorOpen = MathUtils.clamp(this.frontDoorOpen + (wanted ? step : -step), 0, 1);
    this.frontDoorHinge.rotation.y = FRONT_DOOR_OPEN_ANGLE * MathUtils.smoothstep(this.frontDoorOpen, 0, 1);
  }

  /** Swings the bedroom door towards open or shut, and moves what it blocks to match. `dt` of Infinity snaps it. */
  private updateBedroomDoor(dt: number): void {
    const open = this.tavern.doorOpen;
    const target = open ? BEDROOM_DOOR_OPEN_ANGLE : 0;
    const door = this.bedroomDoor;
    door.rotation.y += (target - door.rotation.y) * (1 - Math.exp(-BEDROOM_DOOR_SWING_RATE * dt));

    const block = open ? BEDROOM_DOOR_OPEN : BEDROOM_DOOR_SHUT;
    if (block === this.bedroomDoorBlock) return;
    const { colliders } = this.world;
    if (this.bedroomDoorBlock) colliders.splice(colliders.indexOf(this.bedroomDoorBlock), 1);
    colliders.push(block);
    this.bedroomDoorBlock = block;
  }

  /** Outlines what E would use, or nothing. */
  private highlight(target: Target | null): void {
    const key = target && targetKey(target);
    const mess = target?.kind === "mess" ? this.messLayer.root(target.id) : null;
    if (key === this.highlighted && mess === this.outlinedMess) return;
    this.outlinedMess = mess;
    if (this.highlighted) this.targetOutlines.get(this.highlighted)?.forEach((outline) => outline.show(null));
    this.guestOutline?.dispose();
    this.guestOutline = null;
    this.highlighted = key;
    if (!target || !key) return;
    if (target.kind === "guest" || target.kind === "mess") {
      const root = target.kind === "guest" ? this.actors.get(target.id)?.bodyRoot : this.messLayer.root(target.id);
      if (root) {
        this.guestOutline = new Outline(root, this.targetOutline, target.kind === "mess");
        this.guestOutline.show(this.targetOutline);
      }
      return;
    }
    this.targetOutlines.get(key)?.forEach((outline) => outline.show(this.targetOutline));
  }

  /** Rocks the bell for a moment after it rings. */
  private updateBell(dt: number): void {
    if (this.bellRinging <= 0) return;
    this.bellRinging = Math.max(0, this.bellRinging - dt);
    const fade = this.bellRinging / BELL_RING_SECONDS;
    this.bell.rotation.z = Math.sin(this.bellRinging * 45) * BELL_ROCK * fade * fade;
  }

  private listeningTo(): number | null {
    const position = this.siblings[this.active].position;
    for (const guest of this.tavern.guests) {
      if (!guest.rumor || (guest.status !== "waiting" && guest.status !== "eating")) continue;
      const seat = this.world.seats[guest.seat].position;
      if (position.distanceTo(new Vector3(seat.x, position.y, seat.z)) <= LISTEN_RANGE) return guest.id;
    }
    return null;
  }

  private updateHeldIcons(): void {
    this.siblings.forEach((sibling, index) => {
      this.heldIcons[index].sprite.position.set(sibling.position.x, HELD_ICON_HEIGHT, sibling.position.z);
    });
  }

  private updateHud(): void {
    const { tavern } = this;
    this.stats.update({
      gold: tavern.gold,
      debt: DEBT,
      trust: tavern.trust,
      trustMax: TRUST_MAX,
      heat: tavern.heat,
      heatMax: HEAT_MAX,
      tap: tavern.tapLeft,
      pot: tavern.potState,
      held: tavern.carrying[this.active],
      count: tavern.carryCount[this.active],
      traySize: TRAY_SIZE,
      drunk: drunkLabel(tavern.drunk),
      cups: tavern.cleanWare.cup,
      cupsOwned: tavern.stock.cup,
      dishes: tavern.cleanWare.dish,
      dishesOwned: tavern.stock.dish,
    });
  }

  /** The world clock in the corner: the time, the sun or moon, the day, and whether the tavern is open. */
  private updateClock(): void {
    const { hour } = this.clock;
    const time = formatHour(hour);
    if (this.clockTimeEl.textContent !== time) this.clockTimeEl.textContent = time;
    const day = `Day ${this.tavern.nightIndex + 1} of ${NIGHTS.length} · ${PHASE_LABELS[this.tavern.phase]}`;
    if (this.clockDayEl.textContent !== day) this.clockDayEl.textContent = day;
    const sky = this.clock.daylight > 0.5 ? "sun" : "moon";
    if (this.clockSkyEl.className !== sky) this.clockSkyEl.className = sky;
    this.clockMarkerEl.style.left = `${((hour / 24) * 100).toFixed(1)}%`;
  }

  private setPrompt(text: string): void {
    if (this.promptEl.textContent !== text) this.promptEl.textContent = text;
  }

  private updateToast(dt: number): void {
    const messages = this.tavern.takeMessages();
    if (messages.length > 0) {
      this.toastEl.textContent = messages[messages.length - 1];
      this.toastLeft = TOAST_SECONDS;
    } else if (this.toastLeft > 0) {
      this.toastLeft -= dt;
      if (this.toastLeft <= 0) this.toastEl.textContent = "";
    }
  }

  private openPanel(title: string, paragraphs: string[], buttons: Button[]): void {
    const box = document.createElement("div");
    box.className = "box";
    const heading = document.createElement("h1");
    heading.textContent = title;
    box.append(heading);
    for (const text of paragraphs) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      box.append(paragraph);
    }
    buttons.forEach((button, index) => {
      const el = document.createElement("button");
      el.type = "button";
      el.textContent = `${index + 1}. ${button.label}`;
      el.disabled = Boolean(button.disabled);
      el.addEventListener("click", () => this.pressButton(button));
      box.append(el);
    });
    this.panelEl.replaceChildren(box);
    this.panelEl.classList.add("open");
    this.panelButtons = buttons;
    this.panelBack = null;
    // Menus opened from the pause menu keep the night frozen.
    if (this.screen !== "paused") this.screen = "panel";
  }

  private closePanel(): void {
    this.panelEl.classList.remove("open");
    this.panelEl.replaceChildren();
    this.panelButtons = [];
    this.panelBack = null;
  }

  /** A menu that Esc (or its Back button) leaves by calling `back`. */
  private openMenu(title: string, paragraphs: string[], buttons: Button[], back: () => void): void {
    this.openPanel(title, paragraphs, [...buttons, { label: "Back", onPick: back }]);
    this.panelBack = back;
  }

  private pressButton(button: Button): void {
    this.audio.play("click");
    button.onPick();
  }

  private handlePanelKeys(): void {
    const buttons = this.panelButtons;
    const pick = buttons.findIndex((_, index) => this.input.pressed(`Digit${index + 1}`));
    if (pick >= 0 && !buttons[pick].disabled) this.pressButton(buttons[pick]);
    else if (buttons.length === 1 && this.input.pressed("Enter")) this.pressButton(buttons[0]);
  }

  /** Music and effects levels. Changing one also unmutes, so the change can be heard. */
  private showSoundMenu(back: () => void): void {
    const { settings } = this.audio;
    const percent = (level: number) => (level === 0 ? "Off" : `${Math.round(level * 100)}%`);
    const reopen = () => this.showSoundMenu(back);
    this.openMenu(
      "Sound",
      ["Each press steps the level up. M mutes everything at any time."],
      [
        {
          label: `Music: ${percent(settings.music)}`,
          onPick: () => {
            this.audio.change({ music: nextSoundLevel(settings.music), muted: false });
            reopen();
          },
        },
        {
          label: `Effects: ${percent(settings.effects)}`,
          onPick: () => {
            this.audio.change({ effects: nextSoundLevel(settings.effects), muted: false });
            reopen();
          },
        },
      ],
      back,
    );
  }

  /** Starts a day with the tavern closed. Every day starts here, so this is where the autosave is taken. */
  private startDay(): void {
    this.closePanel();
    this.screen = "play";
    this.clock.setTime(this.tavern.nightIndex, MORNING_HOUR);
    this.clock.run(DAY_HOURS_PER_SECOND, AFTERNOON_HOLD_HOUR);
    this.checkpoint = this.tavern.snapshot();
    writeSave("auto", this.active, this.checkpoint, this.looks);
  }

  private showTitle(): void {
    const latest = latestSave();
    this.openPanel(
      "Last Call at Tarven",
      [
        "An old tavern in a small market town on a dangerous mountain road, and the debt that came with it.",
        `The baron collects ${DEBT} gold in three nights. Everyone who stops here is hiding something, and everyone will pay to know what you heard.`,
      ],
      [
        { label: "New game", onPick: () => this.showCharacterSelect() },
        {
          label: latest ? `Continue: ${describeSave(latest.data, PLAYER_LABELS)}` : "Continue",
          disabled: !latest,
          onPick: () => latest && this.loadGame(latest.data),
        },
        { label: "Load game", disabled: !latest, onPick: () => this.showLoadMenu(() => this.showTitle()) },
        { label: "Sound", onPick: () => this.showSoundMenu(() => this.showTitle()) },
      ],
    );
  }

  /** Lists the save slots; picking one saves the start of today there. */
  private showSaveMenu(back: () => void, notice?: string): void {
    const night = this.tavern.nightIndex + 1;
    this.openMenu(
      "Save game",
      [notice ?? `Saving keeps your progress from the start of today (Day ${night}).`],
      MANUAL_SLOTS.map((slot) => {
        const existing = readSave(slot);
        const label = `${slotName(slot)}: ${existing ? describeSave(existing, PLAYER_LABELS) : "empty"}`;
        const save = () => {
          const saved = writeSave(slot, this.active, this.checkpoint, this.looks);
          this.showSaveMenu(back, saved ? `Saved to ${slotName(slot)}.` : "Could not save: this browser is blocking storage.");
        };
        return {
          label,
          onPick: existing
            ? () => this.confirm(`Overwrite ${slotName(slot)}?`, describeSave(existing, PLAYER_LABELS), save, () => this.showSaveMenu(back))
            : save,
        };
      }),
      back,
    );
  }

  /** Lists every save; picking one loads it. Mid-night, it asks first, since tonight's progress is lost. */
  private showLoadMenu(back: () => void): void {
    const midNight = this.screen === "paused";
    this.openMenu(
      "Load game",
      ["Each save starts at the beginning of a day."],
      SLOTS.map((slot) => {
        const data = readSave(slot);
        const load = () => data && this.loadGame(data);
        return {
          label: `${slotName(slot)}: ${data ? describeSave(data, PLAYER_LABELS) : "empty"}`,
          disabled: !data,
          onPick:
            midNight && data
              ? () => this.confirm(`Load ${slotName(slot)}?`, "Anything you have done since today began will be lost.", load, () => this.showLoadMenu(back))
              : load,
        };
      }),
      back,
    );
  }

  private confirm(title: string, text: string, yes: () => void, no: () => void): void {
    this.openMenu(title, [text], [{ label: "Yes", onPick: yes }], no);
  }

  /** Fades out, clears the room, and opens the saved night. */
  private loadGame(data: SaveData): void {
    this.closePanel();
    this.fadeTo(() => {
      this.selectEl.classList.remove("open");
      this.outlines.forEach((outline) => outline.dispose());
      this.removeVisitor();
      for (const actor of this.actors.values()) this.guestLayer.remove(actor.group);
      this.actors.clear();
      this.chatter.reset();
      this.tavern.restore(data.tavern);
      this.plan = new HousePlan(cloneLayout(data.tavern.layout ?? this.defaultLayout));
      this.nav = this.applyPlan();
      this.tavern.setSeats(this.world.seats.map((seat) => seat.table));
      this.active = data.active;
      this.chosen = data.active;
      if (data.looks) {
        this.looks = data.looks;
        this.siblings.forEach((_, index) => this.applyLook(index));
      }
      this.toastEl.textContent = "";
      this.toastLeft = 0;
      this.enterTavern();
    });
  }

  /** Both siblings stand facing the camera; the player picks one to start as. */
  private showCharacterSelect(): void {
    this.closePanel();
    this.screen = "select";
    this.selectEl.classList.add("open");
  }

  private choose(index: number): void {
    if (this.screen !== "select") return;
    if (this.chosen !== index) this.audio.play("click");
    this.chosen = index;
    this.active = index;
    this.selectStartEl.disabled = false;
    this.selectStartEl.textContent = `Start as ${PLAYER_LABELS[index].toLowerCase()}`;
    this.selectCustomizeEl.disabled = false;
    this.selectCustomizeEl.textContent = `Customize ${PLAYER_LABELS[index].toLowerCase()}`;
  }

  /** Which sibling sits under the pointer, judged by a box around each body. */
  private siblingAt(event: PointerEvent | MouseEvent): number | null {
    this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const { ray } = this.raycaster;
    let best: number | null = null;
    let bestDistance = Infinity;
    this.siblings.forEach((sibling, index) => {
      this.hitBox.setFromObject(sibling.root).expandByScalar(0.08);
      const hit = ray.intersectBox(this.hitBox, new Vector3());
      const distance = hit ? hit.distanceTo(ray.origin) : Infinity;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  private pointAt(event: PointerEvent | MouseEvent, click: boolean): void {
    if (this.screen !== "select" || !(event.target instanceof HTMLCanvasElement)) {
      if (event.target instanceof HTMLCanvasElement) event.target.style.cursor = "";
      return;
    }
    const index = this.siblingAt(event);
    this.hovered = index;
    event.target.style.cursor = index === null ? "" : "pointer";
    if (click && index !== null) this.choose(index);
  }

  /** Fades to black, runs `next` while the screen is dark, then fades back in. */
  private fadeTo(next: () => void): void {
    this.screen = "fade";
    this.fadeLeft = FADE_SECONDS;
    this.afterFade = next;
    this.fadeEl.classList.add("on");
  }

  private beginNight(): void {
    if (this.screen !== "select" || this.chosen === null) return;
    this.audio.play("click");
    this.fadeTo(() => this.startStory());
  }

  /** The visual novel intro: how you came to own the tavern. */
  private startStory(): void {
    this.selectEl.classList.remove("open");
    this.outlines.forEach((outline) => outline.dispose());
    this.siblings.forEach((sibling, index) => sibling.position.copy(this.spawnPoints[index]));
    // A standing sprite of the player's character, rendered from the real model.
    this.story.setSprite(renderPortrait(this.renderer, this.siblings[this.active].root, SPRITE_TURN));
    // The tavern behind the dialog shows empty; the player appears as a sprite instead.
    this.siblings.forEach((sibling) => (sibling.root.visible = false));
    this.screen = "story";
    this.story.start(INTRO, () => this.fadeTo(() => this.enterTavern()));
  }

  private advanceStory(): void {
    this.audio.play("page");
    this.story.advance();
  }

  private updateStory(dt: number): void {
    const { input } = this;
    if (input.pressed("Space") || input.pressed("Enter") || input.pressed("KeyE")) this.advanceStory();
    this.story.update(dt);
  }

  private enterTavern(): void {
    this.staging = false;
    this.tavern.playerBody = this.active === 1 ? "Female" : "Male";
    document.body.classList.remove("staging");
    // Only the character the player picked works the night; the other stays out of the game.
    this.siblings.forEach((sibling, index) => {
      sibling.position.copy(this.spawnPoints[index]);
      sibling.root.visible = index === this.active;
    });
    // Removed while the screen is black, so the shader rebuild for one less light is not seen.
    this.stageLight.removeFromParent();
    this.startDay();
  }

  /** Stops the night and opens the pause menu. Only works mid-night. */
  private pause(): void {
    if (this.screen !== "play" && this.screen !== "visitor") return;
    this.pausedFrom = this.screen;
    this.setPrompt("");
    this.screen = "paused";
    this.showPauseMenu();
  }

  private showPauseMenu(): void {
    const back = () => this.showPauseMenu();
    this.openPanel(
      "Paused",
      ["WASD / arrows: move   Shift: run   E: use / serve"],
      [
        { label: "Resume (Esc)", onPick: () => this.resume() },
        { label: "Save game", onPick: () => this.showSaveMenu(back) },
        { label: "Load game", disabled: !latestSave(), onPick: () => this.showLoadMenu(back) },
        { label: "Sound", onPick: () => this.showSoundMenu(back) },
        {
          label: "Quit to the title",
          onPick: () => this.confirm("Quit to the title?", "Anything you have not saved will be lost.", () => location.reload(), back),
        },
      ],
    );
  }

  private resume(): void {
    this.closePanel();
    this.screen = this.pausedFrom;
  }

  private updateSelect(dt: number): void {
    const { input } = this;
    if (input.pressed("Digit1") || input.pressed("ArrowLeft") || input.pressed("KeyA")) this.choose(0);
    if (input.pressed("Digit2") || input.pressed("ArrowRight") || input.pressed("KeyD")) this.choose(1);
    if (input.pressed("Enter")) this.beginNight();

    const spot = new Vector3();
    this.siblings.forEach((sibling, index) => {
      spot.copy(this.spawnPoints[index]);
      if (this.chosen === index) spot.z += SELECT_STEP;
      sibling.stepTo(spot, dt);

      // Gold around the chosen sibling, pale around the one under the pointer.
      const outline =
        this.chosen === index ? this.chosenOutline : this.hovered === index ? this.hoverOutline : null;
      this.outlines[index].show(outline);
    });
  }

  /** Hides the prompt, arrow and outline while the player can't act. */
  private clearTarget(): void {
    this.setPrompt("");
    this.targetArrow.show(null);
    this.highlight(null);
  }

  private startVisitor(): void {
    this.screen = "visitor";
    this.clearTarget();
    this.visitorWait = VISITOR_WAIT_SECONDS;
    this.toastEl.textContent = "The last guest is gone.";
    this.toastLeft = TOAST_SECONDS;
  }

  private letVisitorIn(): void {
    const visitor = new Walker(this.makeGuestBody("visitor", false));
    const doorstep = ENTRANCE[ENTRANCE.length - 1];
    visitor.group.position.set(ENTRANCE[0].x, 0, ENTRANCE[0].z);
    visitor.setPath([...ENTRANCE, ...(this.nav.findPath(doorstep, VISITOR_STOP) ?? [VISITOR_STOP])]);
    this.guestLayer.add(visitor.group);
    this.visitor = visitor;
    this.visitorWalking = true;
    this.toastEl.textContent = "Then the door opens again.";
    this.toastLeft = TOAST_SECONDS;
    this.audio.play("visitor");
  }

  /** The closed room after the last guest: the door shuts, a beat passes, someone comes in, the door shuts behind them. */
  private updateVisitor(dt: number): void {
    this.siblings.forEach((sibling) => sibling.rest(dt));
    if (!this.visitor) {
      if (this.frontDoorOpen === 0) this.visitorWait -= dt;
      if (this.visitorWait <= 0) this.letVisitorIn();
      return;
    }
    this.visitorWalking = !this.visitor.walk(dt);
    if (this.visitorWalking) return;
    this.visitor.turnTo(Math.PI, dt);
    if (this.frontDoorOpen === 0) this.showLastCall();
  }

  private removeVisitor(): void {
    if (this.visitor) this.guestLayer.remove(this.visitor.group);
    this.visitor = null;
    this.visitorWalking = false;
  }

  private showLastCall(): void {
    const { tavern } = this;
    const call = tavern.plan.lastCall;
    const paragraphs = [`${call.visitor}: "${call.question}"`];
    paragraphs.push(tavern.heardRumor ? `You remember: ${call.rumor}` : "You never caught what anyone was saying tonight.");
    this.openPanel(
      "Last Call",
      paragraphs,
      tavern.lastCallChoices.map((choice, index) => ({
        label: choice.label,
        onPick: () => {
          tavern.chooseLastCall(index);
          this.removeVisitor();
          // The tavern shuts, and the player walks to bed.
          this.closePanel();
          this.screen = "play";
        },
      })),
    );
  }

  /**
   * A conversation, with a party at their table or a guest who tipped you a drink: their lines play out in
   * the dialog box, then you choose. Time stands still meanwhile. `lines` defaults to the whole conversation.
   */
  private showTalk(lines = this.tavern.talkLines): void {
    this.clearTarget();
    this.screen = "talk";
    this.dialogue.start(lines, this.tavern.talkChoices, (index) => this.pickTalk(index));
  }

  private pickTalk(index: number): void {
    const { tavern } = this;
    this.audio.play("click");
    tavern.chooseTalk(index);
    if (!tavern.inConversation) {
      this.dialogue.close();
      this.screen = "play";
      return;
    }
    // Only the answer to what you picked plays; the conversation before it has been seen.
    this.showTalk(tavern.talkReplyLines);
  }

  /** Esc, or the last choice: get back to work. */
  private leaveTalk(): void {
    if (this.dialogue.open) this.pickTalk(this.tavern.talkChoices.length - 1);
  }

  private updateTalk(dt: number): void {
    const { input, dialogue } = this;
    if (input.pressed("Space") || input.pressed("Enter") || input.pressed("KeyE")) dialogue.advance();
    for (let i = 0; i < 5; i++) if (input.pressed(`Digit${i + 1}`)) dialogue.choose(i);
    dialogue.update(dt);
    this.siblings.forEach((sibling) => sibling.rest(dt));
  }

  /** Who is speaking a line: your own portrait, the guest's, or none for narration. */
  private portraitFor(line: TalkLine): HTMLCanvasElement | null {
    if (line.speaker === "You") {
      this.playerPortrait ??= renderPortrait(this.renderer, this.siblings[this.active].root, -SPRITE_TURN);
      return this.playerPortrait;
    }
    const guest = this.tavern.talkGuests.find((g) => g.id === line.guestId) ?? this.tavern.talkGuests[0];
    if (!guest) return null;
    // Guests are drawn standing, fresh from a body of the same kind, rather than as they sit.
    const female = guest.id % 2 === 0;
    const key = `${guest.kind}:${female}`;
    let portrait = this.guestPortraits.get(key);
    if (!portrait) {
      const body = this.makeGuestBody(guest.kind, female);
      body.pose(0, 0);
      portrait = renderPortrait(this.renderer, body.root, SPRITE_TURN);
      this.guestPortraits.set(key, portrait);
    }
    return portrait;
  }

  /** Sleeps away the rest of the day: wakes in the late afternoon, where the day waits for the bell. */
  private takeNap(): void {
    this.clearTarget();
    this.audio.play("cloth");
    this.fadeTo(() => {
      this.clock.setTime(this.tavern.nightIndex, Math.max(this.clock.hour, AFTERNOON_HOLD_HOUR));
      this.screen = "play";
    });
  }

  private goToSleep(): void {
    this.clearTarget();
    this.audio.play("cloth");
    this.fadeTo(() => {
      this.clock.setTime(this.tavern.nightIndex + 1, MORNING_HOUR);
      this.showDawn();
    });
  }

  private showDawn(): void {
    const { tavern } = this;
    const upgrades = (Object.keys(UPGRADES) as UpgradeId[]).map((id): Button => ({
      label: `${UPGRADES[id].name} (${UPGRADE_COST} gold): ${tavern.upgrades.has(id) ? "owned" : UPGRADES[id].detail}`,
      disabled: !tavern.canBuy(id),
      onPick: () => {
        tavern.buy(id);
        this.showDawn();
      },
    }));
    const wares = (Object.keys(WARE_NAMES) as Ware[]).map((ware): Button => ({
      label: `${STOCK_PACK} more ${WARE_NAMES[ware]} (${STOCK_COST} gold): you own ${tavern.stock[ware]}`,
      disabled: !tavern.canBuyStock(),
      onPick: () => {
        tavern.buyStock(ware);
        this.showDawn();
      },
    }));
    this.openPanel(
      `Morning after night ${tavern.nightIndex + 1}`,
      [
        tavern.lastResult,
        `Served ${tavern.served}, ${tavern.walkouts} walked out, earned ${tavern.earned} gold.`,
        `Gold ${tavern.gold}/${DEBT}   Trust ${tavern.trust}/${TRUST_MAX}   Heat ${tavern.heat}/${HEAT_MAX}`,
      ],
      [
        ...upgrades,
        ...wares,
        {
          label: tavern.isLastNight ? "Face the baron" : "Start the next day",
          // Already faded through the night on the way to bed.
          onPick: () => this.advanceNight(),
        },
      ],
    );
  }

  private advanceNight(): void {
    const { tavern } = this;
    tavern.nextNight();
    this.chatter.reset();
    if (tavern.phase === "ended" && tavern.ending) {
      const ending = ENDINGS[tavern.ending];
      this.openPanel(
        ending.title,
        [ending.text, `Final gold ${tavern.gold}/${DEBT}, Trust ${tavern.trust}, Heat ${tavern.heat}.`],
        [
          { label: "Play again", onPick: () => location.reload() },
          { label: "Load game", disabled: !latestSave(), onPick: () => this.showLoadMenu(() => this.advanceNight()) },
        ],
      );
    } else {
      this.startDay();
    }
  }

  private updatePlay(dt: number): void {
    const { tavern, input } = this;
    const player = this.siblings[this.active];
    const strideBefore = player.strideAngle;
    if (player.move(dt, input, this.world.colliders, tavern.drunk)) tavern.stumble(this.active);
    if (footfalls(strideBefore, player.strideAngle) > 0) this.audio.play("step", input.run ? RUNNING_STEP_LOUDNESS : 1);

    // O steps the sister's walk through its five styles, whoever is being played.
    if (input.pressed("KeyO")) {
      const sister = this.siblings.find((sibling) => sibling.walkStyle !== null);
      const level = sister?.cycleWalkStyle();
      if (level) {
        this.toastEl.textContent = `Walk style ${level} of 5: ${WALK_STYLE_NAMES[level - 1]}`;
        this.toastLeft = TOAST_SECONDS;
      }
    }

    const found = this.findTarget();
    if (found && found.prompt.actionable && input.pressed("KeyE")) {
      tavern.interact(this.active, found.target);
      if (tavern.inConversation) {
        this.showTalk();
        return;
      }
      // Ringing the bell opens the tavern and sends the world clock on to nightfall.
      if (found.target.kind === "bell" && tavern.phase === "dusk") {
        this.clock.transitionTo(NIGHT_HOUR, SUNSET_SECONDS);
        this.bellRinging = BELL_RING_SECONDS;
        this.audio.playBell();
      }
      if (found.target.kind === "desk") {
        this.openBuild();
        return;
      }
      if (found.target.kind === "bed" && tavern.phase === "dawn") {
        this.goToSleep();
        return;
      }
      if (found.target.kind === "bed" && tavern.phase === "day") {
        this.takeNap();
        return;
      }
    }

    const listening = this.listeningTo();
    const { position } = player;
    const atTub = Math.hypot(position.x - this.spots.wash.x, position.z - this.spots.wash.z) <= STATION_RANGE;
    tavern.tick(dt, { listeningTo: listening, night: this.clock.isNight, scrubber: atTub ? this.active : null });

    const refreshed = this.findTarget();
    if (refreshed?.prompt.actionable) {
      this.setPrompt(`E: ${refreshed.prompt.label}`);
      this.targetArrow.show("arrow");
      this.targetArrow.sprite.position.set(refreshed.at.x, refreshed.height, refreshed.at.z);
      this.highlight(refreshed.target);
    } else {
      this.setPrompt(refreshed?.prompt.label ?? (listening !== null && !tavern.heardRumor ? "Listening..." : ""));
      this.targetArrow.show(null);
      this.highlight(null);
    }

    this.updateHud();
    if (tavern.phase === "lastcall") this.startVisitor();
  }

  /**
   * Places the speech bubbles over whoever's talking. Called once the camera has moved for the frame, so
   * they stay fixed to the guests. A conversation or menu has the screen, so they wait until it's closed.
   */
  renderSpeech(): void {
    const speakers: Speaker[] = [];
    if (this.screen === "play") {
      for (const [id, actor] of this.actors) {
        const said = this.chatter.saying(id);
        if (!said) continue;
        const hushed = said.aboutYou && actor.group.position.distanceTo(this.focus) > OVERHEAR_RANGE;
        speakers.push({ id, said, at: actor.speechAnchor(new Vector3()), hushed });
      }
    }
    this.camera.updateMatrixWorld();
    this.speech.render(speakers, this.camera);
  }

  /** Plays what the rules cued and sets the music and the room's ambience for this moment. */
  private updateSound(): void {
    const { audio, tavern, focus } = this;
    for (const cue of tavern.takeCues()) audio.play(cue);
    audio.setPaused(this.screen === "paused");
    audio.setMusic(musicFor(this.staging, tavern.phase, tavern.nightIndex));

    // The room is only heard once you are in it. The stew pot hangs over the hearth, so both are heard from there.
    const fromHearth = focus.distanceTo(this.spots.pot);
    const inBedroom = focus.x > BEDROOM_FROM_X;
    const crowd = tavern.phase === "service" ? Math.sqrt(Math.min(1, tavern.guests.length / CROWD_FULL)) : 0;
    const bubbling = tavern.potState === "cooking" || tavern.potState === "ready";
    const fire = inBedroom ? FIRE_BEDROOM_LEVEL : Math.max(FIRE_ROOM_LEVEL, falloff(fromHearth, FIRE_REACH));
    audio.setLayer("fire", this.staging ? 0 : fire);
    audio.setLayer("crowd", this.staging ? 0 : crowd * (inBedroom ? CROWD_BEDROOM_LEVEL : 1));
    audio.setLayer("stew", !this.staging && bubbling ? falloff(fromHearth, STEW_REACH) : 0);
  }

  update(dt: number): void {
    if (this.input.pressed("KeyM")) {
      const muted = this.audio.toggleMute();
      if (!this.staging && this.screen !== "paused") {
        this.toastEl.textContent = muted ? "Sound off" : "Sound on";
        this.toastLeft = TOAST_SECONDS;
      }
    }
    // Paused: nothing moves, not even the guests.
    if (this.screen === "paused") {
      if (this.input.pressed("Escape")) (this.panelBack ?? (() => this.resume()))();
      else this.handlePanelKeys();
      this.updateSound();
      this.input.endFrame();
      return;
    }
    // Esc steps back out of a menu or a conversation, or pauses the night.
    if (this.input.pressed("Escape")) {
      if (this.screen === "talk") this.leaveTalk();
      else if (this.screen === "build") this.build.escape();
      else if (this.screen === "customize") this.closeCustomizer();
      else if (this.panelBack) this.panelBack();
      else this.pause();
    }

    this.time += dt;
    // Time stands still while you're looking at the plans.
    if (this.screen !== "build") this.clock.update(dt);

    if (this.screen === "story") {
      this.updateStory(dt);
    } else if (this.screen === "talk") {
      this.updateTalk(dt);
    } else if (this.screen === "panel" || this.screen === "title") {
      this.handlePanelKeys();
      this.siblings.forEach((sibling) => sibling.rest(dt));
    } else if (this.screen === "select") {
      this.updateSelect(dt);
    } else if (this.screen === "customize") {
      this.updateCustomize(dt);
    } else if (this.screen === "fade") {
      this.siblings.forEach((sibling) => sibling.rest(dt));
      this.fadeLeft -= dt;
      if (this.fadeLeft <= 0) {
        const next = this.afterFade;
        this.afterFade = null;
        next?.();
        this.fadeEl.classList.remove("on");
      }
    } else if (this.screen === "build") {
      this.build.update(dt);
      this.siblings.forEach((sibling) => sibling.rest(dt));
      this.updateHud();
    } else if (this.screen === "play") {
      this.updatePlay(dt);
      const { tavern } = this;
      this.chatter.update(
        dt,
        tavern.guests,
        tavern.plan.parties,
        (party) => tavern.partyChatting(party),
        (seat) => tavern.tableOf(seat),
        (kind) => tavern.banterContext(kind),
      );
    } else if (this.screen === "visitor") {
      this.updateVisitor(dt);
    }

    this.syncGuests(dt);
    this.messLayer.sync(this.tavern.messes, dt);
    this.updateBell(dt);
    this.updateBedroomDoor(dt);
    this.updateFrontDoor(dt);
    this.syncCarried();
    this.syncStations();
    this.updateHeldIcons();
    // The night's opening message waits until the select scene is over.
    if (!this.staging) {
      this.updateToast(dt);
      this.updateClock();
    }
    this.updateSound();
    this.input.endFrame();
  }
}
