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
  newLook,
  OUTFIT_COLORS,
  PIRATE_LOOKS,
  pirateGuestColors,
  randomLook,
  storeLooks,
  type BodyName,
  type Look,
  type Looks,
  type LookTab,
} from "./appearance";
import { falloff, footfalls, musicFor, type Soundscape } from "./audio";
import { Customizer } from "./customizer";
import { resolveCircle, type Rect, type Vec2 } from "./collision";
import {
  BATH_NAME,
  BATH_SPOT,
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
  JOURNAL_NAME,
  JOURNAL_SPOT,
  makeBell,
  WASH_TUB_NAME,
  WASH_TUB_SPOT,
} from "./furnishings";
import { BuildMode, type Supply } from "./buildmode";
import { GuestActor, Walker } from "./guests";
import { cloneLayout, emptyLayout, footprint, HousePlan, seatSpecs, type FurnitureKind, type HouseLayout, type Placed } from "./house";
import { HouseView } from "./houseview";
import { COIN, FLAME, StatsHud, VILLAGERS } from "./hud";
import { changeLabel, dayIcon, dayStory, statusLines, townTalk, type Standing } from "./daystory";
import { StatusCard } from "./statuscard";
import { DRINK_COLORS, Icon, type IconName } from "./icons";
import type { Input } from "./input";
import { findDustSpots, MessLayer } from "./mess";
import { Outline, outlineMaterial } from "./outline";
import { renderPortrait, renderThumbnail } from "./portraits";
import {
  describeSave,
  latestSave,
  writeSave,
  type SaveData,
} from "./save";
import { INTRO, StoryBox } from "./story";
import { Chatter } from "./chatter";
import { DrinkComic } from "./comic";
import { showJournal } from "./journalpanel";
import { showBedChoice, showDuelTest, showFight, playAdultScene } from "./fightpanels";
import { confirmMenu, showLoadMenu, showSaveMenu, showSettingsMenu } from "./menus";
import { mindStage, mindStageName } from "./lewd";
import { PASSIVE_ICONS } from "./passiveicons";
import { saveBadges } from "./saveicons";
import { SkyDial } from "./skydial";
import { TouchComic } from "./touchcomic";
import { arousalOf, easeArousal } from "./nipples";
import { METER_MAX } from "./passives";
import type { Reaction, SoftPart } from "./player";
import { DialogueBox } from "./dialogue";
import { MessageLog } from "./messagelog";
import { AiNarrator } from "./ainarrator";
import { setFlavorSource } from "./flavor";
import { SpeechBubbles, type Speaker } from "./speech";
import { formatHour, type WorldClock } from "./time";
import { NavGrid } from "./path";
import type { CumSpot } from "./cum";
import type { DuelArea, DuelLogEntry, DuelState } from "./duel";
import type { HerMove } from "./duelmoves";
import type { TouchRegion } from "./touchtalk";
import type { TouchShow } from "./touchcomic";
import { BattleView, type BattleMode, type BattleStat } from "./battleview";
import { Body, Sibling, WALK_STYLE_NAMES } from "./player";
import { COAT_SECTIONS, COAT_STAGES, type CoatSection } from "./cum";
import { applyRetroLook, solidRetroMaterial } from "./retro";
import {
  BOTTLE_KINDS,
  BOTTLES,
  DEBT,
  DRUNK_MAX,
  drunkLabel,
  ENDINGS,
  HEAT_MAX,
  MAX_WARE,
  NIGHTS,
  STOCK_COST,
  STOCK_PACK,
  Tavern,
  TRAY_SIZE,
  TRUST_MAX,
  TRUST_TO_OVERTHROW,
  UPGRADE_COST,
  UPGRADES,
  WARE_NAMES,
  type AdultScene,
  type Bottle,
  type GuestKind,
  type Held,
  type Item,
  type Phase,
  type Prompt,
  type Station,
  type TalkLine,
  type Target,
  type TavernSave,
  type TouchMoment,
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
/** How far apart, in seconds, guests who arrive at once come through the door. */
const ENTRY_GAP_SECONDS = 0.9;
/** How long the shut door stays shut after the last guest leaves, before the last-call visitor comes in. */
const VISITOR_WAIT_SECONDS = 2.5;
const GUEST_CLEARANCE = 0.28;
const STATION_RANGE = 1.35;
/**
 * How much turning away from a thing counts against it when choosing what to use, in metres per unit of turn:
 * something straight to her side counts as this much further away, and something straight behind her twice that.
 */
const FACING_WEIGHT = 0.6;
const GUEST_RANGE = 1.7;
/** How close you need to be to dirty dishes on a table, or to a mess on the floor. */
const DISHES_RANGE = 1.3;
const FLOOR_MESS_RANGE = 1.1;
const FLOOR_MESS_ARROW_HEIGHT = 1.4;
const LISTEN_RANGE = 2.2;
/** Talk about you can be made out from this close. Further off, it's only whispering. */
const OVERHEAR_RANGE = 4.5;
const ITEM_SCALE = 1.6;
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
/** The bottles along the shelf behind the bar, which the shelf station pours from. */
const BOTTLES_NAME = "Bottles";
/** Where to stand to pour from the shelf: behind the bar, under the middle of the bottles. */
const SHELF_SPOT = new Vector3(4.2, 0, -4.6);
/** Room objects the game outlines or moves, which the room must keep whole instead of merging. */
export const WHOLE_PIECES = [
  ...BARRELS,
  BED_NAME,
  BEDROOM_DOOR_NAME,
  BIN_NAME,
  BOTTLES_NAME,
  DESK_NAME,
  JOURNAL_NAME,
  FRONT_DOOR_NAME,
  WASH_TUB_NAME,
  BATH_NAME,
];
/** How close you need to be to the middle of the bath to climb in. */
const BATH_RANGE = 1.3;
/** How close you need to be to the bedroom door, and how fast it swings (per second, eased). */
const BEDROOM_DOOR_RANGE = 1.3;
const BEDROOM_DOOR_SWING_RATE = 7;
const DESK_RANGE = 1.5;
/** The journal on the chest: close enough to reach down to it, and the arrow low over it. */
const JOURNAL_RANGE = 1.2;
const JOURNAL_ARROW_HEIGHT = 1.4;
/** How far the camera pulls back to look at the plans. */
const BUILD_ZOOM = 1.4;
const SIBLING_RADIUS = 0.3;
/** How she answered a touch, told to the AI narrator so its line never says otherwise. */
const TOUCH_ANSWER_TEXT: Record<TouchMoment["answer"], string> = {
  allow: "She lets them.",
  lean: "She leans into it, wanting more.",
  slap: "She slaps their hand away.",
  pull: "She pulls away from them.",
};
/** How far past the room's walls the follow camera has to reach for the room to fill the screen. */
const CAMERA_INSET_X = 6.5;
const CAMERA_INSET_Z = 4;
/** Places that must always be possible to walk to from the front door, whatever gets built. */
const BEHIND_THE_BAR: Vec2 = { x: 3.2, z: -3.85 };
const BY_THE_BEDROOM_DOOR: Vec2 = { x: 6.5, z: 0 };

/** The props.glb model of each item; the bottled drinks are the ale cup, recoloured (see DRINK_COLORS). */
const ITEM_NODES: Record<Exclude<Item, Bottle>, string> = {
  ale: "Item_Ale",
  bread: "Item_Bread",
  stew: "Item_Stew",
  cask: "Item_Cask",
};

const OUTFITS: Record<GuestKind | "visitor", { top: number; legs: number; hair: number }> = {
  farmer: { top: 0x8a7a3e, legs: 0x4c3a24, hair: 0x4a3420 },
  // Smugglers come in a pirate's rig instead, in colours of their own; only their hair is taken from here.
  smuggler: { top: 0x24242e, legs: 0x18181e, hair: 0x101012 },
  soldier: { top: 0x8c2020, legs: 0x3a3a40, hair: 0x2b2018 },
  fugitive: { top: 0xbcb4a2, legs: 0x6a6252, hair: 0x9a8c7a },
  // Whoever comes in at last call, dressed unlike any guest so nobody takes them for one who stayed behind.
  visitor: { top: 0x2f5590, legs: 0x1c1c22, hair: 0x2b2018 },
};

/** Who the player can be, by sibling index: the male body, then the female one. */
const PLAYER_LABELS = ["Male", "Female"];
/**
 * Which siblings the player may pick, by index. For now only the female: the male stays loaded but is kept
 * off the select screen and out of play. Put 0 back in to offer him again.
 */
const PLAYABLE: readonly number[] = [1];
const isPlayable = (index: number): boolean => PLAYABLE.includes(index);

/** Seconds each moment of a brawl turn shows before the next. */
const FIGHT_MOMENT_GAP = 1.8;
/** Each brawl event as a comic shot (fight.ts events): what it looks like, and the words over it. */
const FIGHT_SHOTS: Record<string, Omit<TouchShow, "kind">> = {
  start: { id: "grab", region: "shoulder", answer: "allow", words: { hit: "GRAB!", voice: "hey!" } },
  "strike:hit": { id: "chin", region: "face", answer: "slap", words: { hit: "POW!", voice: "take that!" } },
  "strike:miss": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "WHIFF", voice: "tch!" } },
  "shove:hit": { id: "grab", region: "shoulder", answer: "slap", words: { hit: "SHOVE!", voice: "back off!" } },
  "shove:miss": { id: "grab", region: "shoulder", answer: "allow", words: { hit: "...", voice: "ugh!" } },
  dodge: { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "", voice: "come on!" } },
  "talk:ok": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "...", voice: "sit DOWN." } },
  "talk:fail": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "!!", voice: "fine, then." } },
  "stare:ok": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "...", voice: "well?" } },
  "stare:win": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "", voice: "out." } },
  "stare:fail": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "HA!", voice: "tch." } },
  steel: { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "", voice: "not yet..." } },
  throw: { id: "grab", region: "shoulder", answer: "slap", words: { hit: "OUT!", voice: "and stay out!" } },
  knockout: { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "K.O.!", voice: "hmph." } },
  "their:hit": { id: "smack", region: "face", answer: "allow", fist: true, words: { hit: "WHAM!", voice: "ugh!" } },
  "their:miss": { id: "smack", region: "face", answer: "pull", fist: true, words: { hit: "WHOOSH", voice: "missed!" } },
  "their:dodged": { id: "smack", region: "face", answer: "pull", fist: true, words: { hit: "WHOOSH", voice: "too slow!" } },
  lost: { id: "smack", region: "face", answer: "allow", fist: true, words: { hit: "WHAM!", voice: "ow..." } },
};

/** A duel moment's comic shot: which touch it looks like (for the framing and the hand), and on what part of her. */
type DuelShot = { id: string; region: TouchRegion };
/** His moves, by the part of her he has, first to boldest (dueltalk.ts THEIR_STAGES). */
const DUEL_THEIR_SHOTS: Record<"kiss" | DuelArea, readonly DuelShot[]> = {
  kiss: [{ id: "deepKiss", region: "lips" }],
  hands: [
    { id: "roam", region: "waist" },
    { id: "fingers", region: "hand" },
    { id: "fingers", region: "hand" },
  ],
  mouth: [
    { id: "deepKiss", region: "lips" },
    { id: "chin", region: "face" },
    { id: "chin", region: "face" },
  ],
  breasts: [
    { id: "bothHands", region: "chest" },
    { id: "grab", region: "chest" },
    { id: "bothHands", region: "chest" },
  ],
  butt: [
    { id: "grab", region: "rear" },
    { id: "smack", region: "rear" },
    { id: "grab", region: "rear" },
  ],
  pussy: [
    { id: "thighUp", region: "intimate" },
    { id: "thighUp", region: "intimate" },
    { id: "thighUp", region: "intimate" },
  ],
};
/** Her own moves: the part of her that's doing it, with no hand in the shot. */
const DUEL_HER_SHOTS: Record<HerMove, DuelShot> = {
  kiss: { id: "kiss", region: "lips" },
  caress: { id: "gaze", region: "face" },
  tease: { id: "gaze", region: "face" },
  undress: { id: "collar", region: "clothes" },
  hands: { id: "fingers", region: "hand" },
  mouth: { id: "kiss", region: "lips" },
  tits: { id: "grab", region: "chest" },
  ride: { id: "lap", region: "lap" },
  anal: { id: "grab", region: "rear" },
};
/** Where a man finished on her. */
const DUEL_CUM_SHOTS: Record<CumSpot, DuelShot> = {
  mouth: { id: "kiss", region: "lips" },
  face: { id: "gaze", region: "face" },
  breasts: { id: "grab", region: "chest" },
  pussy: { id: "thighUp", region: "intimate" },
  ass: { id: "grab", region: "rear" },
  body: { id: "hip", region: "waist" },
};

/**
 * In development, shows her at set stages to look at without playing for it: "?coat=2" puts every part of her at
 * stage 2, and "?coat=Face:1,Back:3" only those parts at those stages. Null without it.
 */
const DEV_COAT: Record<CoatSection, number> | null = (() => {
  const asked = import.meta.env.DEV && typeof location !== "undefined" ? new URLSearchParams(location.search).get("coat") : null;
  if (!asked) return null;
  const clamp = (n: number) => Math.min(COAT_STAGES, Math.max(0, Math.round(n) || 0));
  const all = Number(asked);
  const stages = Object.fromEntries(COAT_SECTIONS.map((section) => [section, Number.isNaN(all) ? 0 : clamp(all)]));
  for (const pair of asked.split(",")) {
    const [section, stage] = pair.split(":");
    const known = COAT_SECTIONS.find((s) => s.toLowerCase() === section?.trim().toLowerCase());
    if (known && stage !== undefined) stages[known] = clamp(Number(stage));
  }
  return stages as Record<CoatSection, number>;
})();

/** Furniture pictures on the house plans, in game pixels; shown at twice this, hard-edged. */
const FURNITURE_THUMB_SIZE = 32;

const STATIONS: Station[] = ["tap", "shelf", "bread", "pot", "barrel", "bin", "wash"];

interface Assets {
  male: Object3D;
  female: Object3D;
  props: Object3D;
  /** Where the furniture stood in the room as it was loaded. */
  furniture: Placed[];
}

export interface Button {
  label: string;
  onPick: () => void;
  disabled?: boolean;
  /** A save to show on the button, in icons after the label. */
  save?: SaveData;
}

// Kept for the browser tab only, so a new visit asks again. Storage can be blocked; then it just asks each time.
const AGE_KEY = "tarven.adult-confirmed";

function ageConfirmed(): boolean {
  try {
    return sessionStorage.getItem(AGE_KEY) === "yes";
  } catch {
    return false;
  }
}

function rememberAgeConfirmed(): void {
  try {
    sessionStorage.setItem(AGE_KEY, "yes");
  } catch {
    // Nowhere to keep it; the gate shows again next time.
  }
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
const STATION_NODES: Record<Exclude<Station, "shelf" | "barrel" | "bin" | "wash">, string> = {
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

  screen:
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
  /** The comic panel that pops up when you drink with a guest. */
  private readonly drinkComic: DrinkComic;
  /** The comic panel that pops up when a guest reaches for you, playing out your answer. */
  private readonly touchComic: TouchComic;
  /** The big picture of her during a fight, Karryn-style, and what it last showed of her. */
  private readonly battleView: BattleView;
  private battleShown = "";
  /** A brawl turn's moments still to play in the comic panel, and how long until the next. */
  private fightQueue: TouchShow[] = [];
  private fightQueueWait = 0;
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
  /** Seconds until the doorway is clear for the next guest to walk in. */
  private doorQueue = 0;
  /** What the guests are saying out loud, and the bubbles that show it over their heads. */
  private readonly chatter = new Chatter();
  private readonly speech = new SpeechBubbles(element("speech"));
  private readonly guestLayer = new Group();
  /** What the night left to clean up, drawn in the room. */
  private readonly messLayer: MessLayer;
  private readonly itemTemplates: Record<Item, Object3D>;
  private readonly guestModels: { male: Object3D; female: Object3D };
  /** Each sibling's look, kept on the customise screen and in saves; both start as the models were built. */
  looks: Looks = loadLooks();
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
  /** Her status window in the bottom-left, Karryn-style: face, willpower, pleasure, drink, desire. */
  private readonly statusCard = new StatusCard(element("status-card"));
  private readonly clockTimeEl = element("clock-time");
  private readonly clockDayEl = element("clock-day");
  /** The sky over Tarven at the top of the screen, with the sun and moon going round. */
  private readonly skyDial = new SkyDial(element("clock-dial") as HTMLCanvasElement);
  private readonly promptEl = element("prompt");
  /** The message log under the stats: news, what was said, and passives as she earns them. */
  private readonly log = new MessageLog(element("stats"));
  /** Extra lines for the log from a local AI model (KoboldCpp), when it's running. N turns it on and off. */
  private readonly narrator = new AiNarrator(
    (text) => this.log.add(text, "ai"),
    () => ({
      name: this.tavern.name,
      pronoun: this.active === 1 ? "she" : "he",
      night: this.tavern.nightIndex,
      serving: this.tavern.phase === "service" || this.tavern.phase === "lastcall",
      guests: this.tavern.guests.length,
      lewdness: this.tavern.lewdness,
      corruption: this.tavern.corruption,
      pleasure: this.tavern.pleasure,
      drunk: drunkLabel(this.tavern.drunk),
      stripped: this.tavern.strippedPieces,
    }),
  );
  readonly panelEl = element("panel");
  private readonly selectEl = element("select");
  private readonly furnitureImages = new Map<FurnitureKind, string>();
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

  panelButtons: Button[] = [];
  /** Where Esc leads from the open menu, or null when it has no way back. */
  panelBack: (() => void) | null = null;
  /** An 18+ moment the last answer led to, shown once the conversation closes. */
  private pendingAdult: AdultScene | null = null;
  /** Tonight as it opened: what a save holds. */
  checkpoint: TavernSave;
  /** Where she stood as today began, for the morning after to say what changed. */
  private dayStart: Standing | null = null;
  private visitor: Walker | null = null;
  private visitorWalking = false;
  private visitorWait = 0;
  private readonly frontDoorHinge = new Group();
  /** 0 is shut, 1 is wide open. */
  private frontDoorOpen = 0;
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
    readonly audio: Soundscape,
  ) {
    // The lines the AI wrote ahead of time; the narrator asks the live model only for what this doesn't cover.
    void this.narrator.loadBank(`${import.meta.env.BASE_URL}ai-lines.json`);
    // Brawls and duels take their colour lines from the same bank.
    setFlavorSource((key, guest) => this.narrator.draw(key, guest));
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
    for (const item of Object.keys(ITEM_NODES) as Exclude<Item, Bottle>[]) {
      const template = requireNode(props, ITEM_NODES[item]);
      template.removeFromParent();
      template.scale.setScalar(ITEM_SCALE);
      this.itemTemplates[item] = template;
    }
    // Wine, mead and vodka go out in the same cup as ale, with their own colour where the foam would be.
    for (const bottle of BOTTLE_KINDS) {
      const cup = this.itemTemplates.ale.clone(true);
      const drink = solidRetroMaterial(`T_${bottle}`, parseInt(DRINK_COLORS[bottle].slice(1), 16));
      cup.traverse((object) => {
        if (object instanceof Mesh && (object.material as Material).name.includes("foam")) object.material = drink;
      });
      this.itemTemplates[bottle] = cup;
    }
    this.drinkComic = new DrinkComic(renderer, element("comic"), () => this.makeItem("ale"), (effect) => this.audio.play(effect));
    this.battleView = new BattleView(this.renderer);
    this.touchComic = new TouchComic(
      renderer,
      (effect) => this.audio.play(effect),
      // The hand that reaches in is a male guest's of that kind, in their own sleeve.
      (kind) => this.makeGuestBody(kind, false).root,
    );
    this.spots = {
      tap: requireNode(props, "Spot_Tap").getWorldPosition(new Vector3()),
      bread: requireNode(props, "Spot_Bread").getWorldPosition(new Vector3()),
      pot: requireNode(props, "Spot_Pot").getWorldPosition(new Vector3()),
      barrel: requireNode(props, "Spot_Barrel").getWorldPosition(new Vector3()),
      shelf: SHELF_SPOT.clone(),
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
          : station === "shelf"
            ? [piece(BOTTLES_NAME)]
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
    this.targetOutlines.set(targetKey({ kind: "book" }), outline([piece(JOURNAL_NAME)]));
    this.targetOutlines.set(targetKey({ kind: "bath" }), outline([piece(BATH_NAME)]));
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
      dress: (dressing) => this.chosen !== null && this.dressers[this.chosen].setDressing(dressing),
    });

    this.spawnPoints = [this.siblings[0].position.clone(), this.siblings[1].position.clone()];
    // The select shot centres on whoever can be picked.
    const middle = new Vector3();
    PLAYABLE.forEach((index) => middle.add(this.spawnPoints[index]));
    middle.divideScalar(PLAYABLE.length);
    this.selectShot = {
      eye: middle.clone().add(SELECT_EYE),
      target: middle.clone().setY(SELECT_LOOK_HEIGHT),
    };
    this.outlines = this.siblings.map((sibling) => new Outline(sibling.root, this.hoverOutline));
    this.stageLight.position.copy(middle).add(SELECT_LIGHT_OFFSET);
    scene.add(this.stageLight);
    // The model faces -Z at rest; turn both round to face the select camera.
    this.siblings.forEach((sibling) => sibling.face(Math.PI));
    this.siblings.forEach((sibling, index) => (sibling.root.visible = isPlayable(index)));
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
      supplies: () => this.supplies(),
      furnitureImage: (kind) => this.furnitureImage(kind),
      plan: () => this.plan,
      gold: () => this.tavern.gold,
      addGold: (amount) => (this.tavern.gold += amount),
      blockers: () => this.staticColliders,
      routeProblem: () => this.routeProblem(),
      leave: () => this.closeBuild(),
    });

    // The story and the first day start on a bright morning.
    clock.setTime(0, MORNING_HOUR);
    // Asked once per visit: quitting to the title reloads the page, and that shouldn't ask again. The dev server
    // skips it, so testing goes straight to the title; every built copy of the game still asks.
    if (import.meta.env.DEV || ageConfirmed()) this.showTitle();
    else this.showAgeGate();
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

  /** Which colours of a guest's outfit they come in, so guests of one kind don't all look alike. */
  private guestLook(guest: { id: number; kind: GuestKind }): number {
    // The id's lowest bit already picks the body, so the rest of it picks the colours.
    return guest.kind === "smuggler" ? Math.floor(guest.id / 2) % PIRATE_LOOKS : 0;
  }

  private makeGuestBody(kind: GuestKind | "visitor", female: boolean, look = 0): Body {
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
    if (kind === "smuggler") {
      dressColors(model, body, { ...pirateGuestColors(body, look), [slots.hair]: hex(outfit.hair) }, "pirate");
    } else {
      dressColors(model, body, { [slots.top]: hex(outfit.top), [slots.legs]: hex(outfit.legs), [slots.hair]: hex(outfit.hair) });
    }
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
    this.siblings.forEach((sibling, index) => {
      sibling.root.visible = isPlayable(index);
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
    this.doorQueue = Math.max(0, this.doorQueue - dt);
    for (const guest of [...tavern.guests]) {
      let actor = actors.get(guest.id);
      if (!actor) {
        // Guests who turn up together (a party, or a backlog once a seat frees) file in one behind another.
        const wait = this.doorQueue;
        this.doorQueue += ENTRY_GAP_SECONDS;
        actor = new GuestActor(
          this.makeGuestBody(guest.kind, guest.id % 2 === 0, this.guestLook(guest)),
          guest,
          this.world.seats[guest.seat],
          this.nav,
          ENTRANCE,
          (item) => this.makeItem(item),
          this.guestLayer,
          wait,
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
    const player = this.siblings[this.active];
    const position = player.position;
    // The way she faces: the model looks down -Z at rest.
    const heading = player.root.rotation.y;
    const [forwardX, forwardZ] = [-Math.sin(heading), -Math.cos(heading)];
    let best: { target: Target; at: Vector3; height: number; prompt: Prompt; score: number } | null = null;

    const consider = (target: Target, at: Vector3, height: number, range: number) => {
      const [dx, dz] = [at.x - position.x, at.z - position.z];
      const distance = Math.hypot(dx, dz);
      if (distance > range) return;
      const prompt = this.tavern.prompt(this.active, target);
      if (!prompt) return;
      // Anything you can actually do beats a status message, and serving a guest
      // beats putting the item back on a station that happens to be closer.
      const serving = target.kind === "guest" && this.tavern.carrying[this.active] !== null;
      // What she is facing beats what is a little nearer behind her or off to the side.
      const ahead = distance > 0.01 ? (dx * forwardX + dz * forwardZ) / distance : 1;
      const turned = (1 - ahead) * FACING_WEIGHT;
      const score = distance + turned + (prompt.actionable ? 0 : 100) - (serving ? 50 : 0);
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
    consider({ kind: "book" }, JOURNAL_SPOT, JOURNAL_ARROW_HEIGHT, JOURNAL_RANGE);
    consider({ kind: "bath" }, BATH_SPOT, STATION_ARROW_HEIGHT, BATH_RANGE);
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
    this.playerPortrait ??= renderPortrait(this.renderer, this.siblings[this.active].root, -SPRITE_TURN);
    this.statusCard.update({
      name: tavern.name,
      portrait: this.playerPortrait,
      will: tavern.willpower,
      willMax: tavern.maxWillpower,
      pleasure: tavern.pleasure,
      drunk: tavern.drunk / DRUNK_MAX,
      drunkLabel: drunkLabel(tavern.drunk),
      meters: tavern.meters,
      piecesOff: tavern.strippedPieces.length,
      lewdness: Math.floor(tavern.lewdness),
      corruption: Math.floor(tavern.corruption),
    });
  }

  /** The world clock in the corner: the time, the sun or moon, the day, and whether the tavern is open. */
  private updateClock(): void {
    const { hour } = this.clock;
    const time = formatHour(hour);
    if (this.clockTimeEl.textContent !== time) this.clockTimeEl.textContent = time;
    const day = `Day ${this.tavern.nightIndex + 1} of ${NIGHTS.length} · ${PHASE_LABELS[this.tavern.phase]}`;
    if (this.clockDayEl.textContent !== day) this.clockDayEl.textContent = day;
    this.skyDial.draw(hour);
  }

  private setPrompt(text: string): void {
    if (this.promptEl.textContent !== text) this.promptEl.textContent = text;
  }

  private updateLog(dt: number): void {
    for (const text of this.tavern.takeMessages()) {
      this.log.add(text);
      this.narrator.note(text);
    }
    for (const def of this.tavern.takeUnlocks()) {
      this.log.addPassive(def);
      this.narrator.moment(`She has changed: she is now known for "${def.name}" (${def.benefit}).`, "passive");
      // A page turning: it's gone in her journal.
      this.audio.play("page");
    }
    this.log.update(dt);
    this.narrator.update(dt);
  }

  /**
   * Opens a menu over the game. The title screen hangs its name on a tavern sign; every other menu is a
   * framed wooden board.
   */
  openPanel(title: string, paragraphs: string[], buttons: Button[], style: "board" | "title" = "board"): void {
    const box = document.createElement("div");
    box.className = "box";
    this.panelEl.classList.toggle("title-screen", style === "title");
    this.panelEl.classList.remove("journal-open", "adult-open", "fight-open", "duel-open", "duel-test-open");
    const heading = document.createElement("h1");
    if (style === "title") {
      // "Last Call at" small over the sign, "Tarven" large across it.
      const split = title.lastIndexOf(" ");
      const over = document.createElement("span");
      over.className = "over";
      over.textContent = title.slice(0, split);
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = title.slice(split + 1);
      const sign = document.createElement("div");
      sign.className = "sign";
      heading.append(over, name);
      sign.append(heading);
      box.append(sign);
    } else {
      heading.textContent = title;
      box.append(heading);
    }
    // The words sit together on one piece of parchment (on the title) or one stretch of board.
    if (paragraphs.length > 0) {
      const story = document.createElement("div");
      story.className = "story";
      for (const text of paragraphs) {
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        story.append(paragraph);
      }
      box.append(story);
    }
    const menu = document.createElement("div");
    menu.className = "menu";
    buttons.forEach((button, index) => {
      const el = document.createElement("button");
      el.type = "button";
      // The key that picks it, on its own little badge.
      const key = document.createElement("span");
      key.className = "key";
      key.textContent = String(index + 1);
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = button.label;
      el.append(key, label);
      if (button.save) {
        el.append(saveBadges(button.save, PLAYER_LABELS));
        // The icons say it in pictures; screen readers get the words.
        el.setAttribute("aria-label", `${button.label}: ${describeSave(button.save, PLAYER_LABELS)}`);
      }
      el.disabled = Boolean(button.disabled);
      el.addEventListener("click", () => this.pressButton(button));
      menu.append(el);
    });
    box.append(menu);
    this.panelEl.replaceChildren(box);
    this.panelEl.classList.add("open");
    this.panelButtons = buttons;
    this.panelBack = null;
    // Menus opened from the pause menu keep the night frozen.
    if (this.screen !== "paused") this.screen = "panel";
  }

  closePanel(): void {
    this.panelEl.classList.remove("open", "journal-open", "adult-open", "fight-open", "duel-open", "duel-test-open");
    this.panelEl.replaceChildren();
    this.panelButtons = [];
    this.panelBack = null;
  }

  /** A menu that Esc (or its Back button) leaves by calling `back`. */
  openMenu(title: string, paragraphs: string[], buttons: Button[], back: () => void): void {
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

  /** Starts a day with the tavern closed. Every day starts here, so this is where the autosave is taken. */
  private startDay(): void {
    this.closePanel();
    this.screen = "play";
    this.clock.setTime(this.tavern.nightIndex, MORNING_HOUR);
    this.clock.run(DAY_HOURS_PER_SECOND, AFTERNOON_HOLD_HOUR);
    this.checkpoint = this.tavern.snapshot();
    writeSave("auto", this.active, this.checkpoint, this.looks);
    // The morning after measures the night against this.
    this.dayStart = this.standing();
  }

  /** Where she stands right now, for the day's cards. */
  private standing(): Standing {
    const { tavern } = this;
    const p = tavern.persona;
    return {
      gold: tavern.gold,
      trust: tavern.trust,
      heat: tavern.heat,
      respect: p.respect,
      fame: p.fame,
      lewdness: Math.floor(tavern.lewdness),
      corruption: Math.floor(tavern.corruption),
      flirt: p.flirt,
      kindness: p.kindness,
      greed: p.greed,
      drinks: p.drinks,
      protected: p.protected,
      informed: p.informed,
      sold: p.sold,
    };
  }

  /**
   * The card that opens each day: the day's own icon, a few lines on how things stand this morning, and her
   * status. Starting the day is its only button.
   */
  private showDayCard(): void {
    const { tavern } = this;
    const day = tavern.nightIndex;
    this.openPanel(
      `Day ${day + 1} of ${NIGHTS.length}`,
      dayStory({
        day,
        days: NIGHTS.length,
        gold: tavern.gold,
        debt: DEBT,
        trust: tavern.trust,
        trustMax: TRUST_MAX,
        trustToRise: TRUST_TO_OVERTHROW,
        heat: tavern.heat,
        heatMax: HEAT_MAX,
        messes: tavern.messes.length,
      }),
      [{ label: "Begin the day", onPick: () => this.startDay() }],
    );
    this.addDayIcon(day);
    this.addStatus(this.standing(), null);
  }

  /** Puts a day's icon in front of the open panel's heading. */
  private addDayIcon(day: number): void {
    const heading = this.panelEl.querySelector(".box h1");
    if (!heading) return;
    const icon = document.createElement("span");
    icon.className = "day-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = dayIcon(day);
    heading.prepend(icon);
  }

  /** Lists her status under the open panel's words, each with how it moved since `before` if given. */
  private addStatus(now: Standing, before: Standing | null): void {
    const box = this.panelEl.querySelector(".box");
    if (!box) return;
    const list = document.createElement("div");
    list.className = "day-status";
    const rows = statusLines(now, before, { debt: DEBT, trustMax: TRUST_MAX, heatMax: HEAT_MAX }, { gold: COIN, trust: VILLAGERS, heat: FLAME });
    for (const row of rows) {
      const item = document.createElement("div");
      item.className = "day-stat";
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.innerHTML = row.icon;
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = row.label;
      const value = document.createElement("b");
      value.textContent = row.value;
      item.append(icon, label, value);
      if (row.change !== 0) {
        const change = document.createElement("span");
        change.className = `change ${row.tone}`;
        change.textContent = changeLabel(row.change);
        item.append(change);
      }
      list.append(item);
    }
    const story = box.querySelector(".story");
    if (story) story.after(list);
    else box.querySelector(".menu")?.before(list);
  }

  /** Shown on every launch, before the title menu: the game is for adults, and the player has to say they are one. */
  private showAgeGate(): void {
    this.openPanel(
      "Adults only",
      [
        "Last Call at Tarven is an adult game. It contains nudity, sexual content and mature themes.",
        "All characters are 18 or older.",
        "By continuing you confirm that you are at least 18 (or the age of majority where you live) and that you want to see this content.",
      ],
      [
        {
          label: "I am 18 or older, continue",
          onPick: () => {
            rememberAgeConfirmed();
            this.showTitle();
          },
        },
        { label: "Leave", onPick: () => this.refuseAgeGate() },
      ],
    );
  }

  private refuseAgeGate(): void {
    this.openPanel(
      "Adults only",
      ["This game is only for adults. You can close this tab now."],
      [{ label: "Back", onPick: () => this.showAgeGate() }],
    );
  }

  private showTitle(): void {
    const latest = latestSave();
    this.openPanel(
      "Last Call at Tarven",
      // The intro tells the story; the title screen is just the sign and the menu.
      [],
      [
        { label: "New game", onPick: () => this.showCharacterSelect() },
        {
          label: "Continue",
          save: latest?.data,
          disabled: !latest,
          onPick: () => latest && this.loadGame(latest.data),
        },
        { label: "Load game", disabled: !latest, onPick: () => showLoadMenu(this, () => this.showTitle()) },
        { label: "Settings", onPick: () => showSettingsMenu(this, () => this.showTitle()) },
      ],
      "title",
    );
  }

  /** Fades out, clears the room, and opens the saved night. */
  loadGame(data: SaveData): void {
    this.closePanel();
    this.fadeTo(() => {
      this.selectEl.classList.remove("open");
      this.outlines.forEach((outline) => outline.dispose());
      this.removeVisitor();
      for (const actor of this.actors.values()) this.guestLayer.remove(actor.group);
      this.actors.clear();
      this.doorQueue = 0;
      this.chatter.reset();
      this.tavern.restore(data.tavern);
      this.plan = new HousePlan(cloneLayout(data.tavern.layout ?? this.defaultLayout));
      this.nav = this.applyPlan();
      this.tavern.setSeats(this.world.seats.map((seat) => seat.table));
      // A save made as someone no longer playable opens as the first playable sibling.
      this.active = isPlayable(data.active) ? data.active : PLAYABLE[0];
      this.chosen = this.active;
      // Always the saved looks, never whatever was last on screen; saves from before customising load as built.
      this.looks = data.looks ?? { Male: newLook(), Female: newLook() };
      this.siblings.forEach((_, index) => this.applyLook(index));
      // Nothing the last character had on (or off) tonight carries over to the loaded one.
      this.strippedShown = "";
      this.syncStripped();
      this.coatShown = "";
      this.syncCoat();
      this.playerPortrait = null;
      this.log.clear();
      this.narrator.clear();
      this.enterTavern();
    });
  }

  /** Both siblings stand facing the camera; the player picks one to start as. */
  private showCharacterSelect(): void {
    this.closePanel();
    this.screen = "select";
    this.selectEl.classList.add("open");
    // With only one to pick from, she is picked already.
    if (PLAYABLE.length === 1) {
      this.choose(PLAYABLE[0]);
      const hint = this.selectEl.querySelector(".hint");
      if (hint) hint.textContent = "Press C to customize, or Enter to start";
    }
  }

  private choose(index: number): void {
    if (this.screen !== "select" || !isPlayable(index)) return;
    if (this.chosen !== index) this.audio.play("click");
    this.chosen = index;
    this.active = index;
    this.selectStartEl.disabled = false;
    this.selectStartEl.querySelector(".label")!.textContent = `Start as ${PLAYER_LABELS[index].toLowerCase()}`;
    this.selectCustomizeEl.disabled = false;
    this.selectCustomizeEl.querySelector(".label")!.textContent = `Customize ${PLAYER_LABELS[index].toLowerCase()}`;
  }

  /** Which sibling sits under the pointer, judged by a box around each body. */
  private siblingAt(event: PointerEvent | MouseEvent): number | null {
    this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const { ray } = this.raycaster;
    let best: number | null = null;
    let bestDistance = Infinity;
    this.siblings.forEach((sibling, index) => {
      if (!isPlayable(index)) return;
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
    this.tavern.playerOutfit = this.looks[this.tavern.playerBody].outfit;
    this.tavern.playerLegwear = this.looks[this.tavern.playerBody].legwear;
    document.body.classList.remove("staging");
    // Only the character the player picked works the night; the other stays out of the game.
    this.siblings.forEach((sibling, index) => {
      sibling.position.copy(this.spawnPoints[index]);
      sibling.root.visible = index === this.active;
    });
    // Removed while the screen is black, so the shader rebuild for one less light is not seen.
    this.stageLight.removeFromParent();
    this.showDayCard();
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
      [],
      [
        { label: "Resume (Esc)", onPick: () => this.resume() },
        { label: "Save game", onPick: () => showSaveMenu(this, back) },
        { label: "Load game", disabled: !latestSave(), onPick: () => showLoadMenu(this, back) },
        { label: "Settings", onPick: () => showSettingsMenu(this, back) },
        {
          label: "Quit to the title",
          onPick: () => confirmMenu(this, "Quit to the title?", "Anything you have not saved will be lost.", () => location.reload(), back),
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
    if (input.pressed("KeyC")) this.openCustomizer();

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
  clearTarget(): void {
    this.setPrompt("");
    this.targetArrow.show(null);
    this.highlight(null);
  }

  private startVisitor(): void {
    this.screen = "visitor";
    this.clearTarget();
    this.visitorWait = VISITOR_WAIT_SECONDS;
    this.log.add("The last guest is gone.");
  }

  private letVisitorIn(): void {
    const visitor = new Walker(this.makeGuestBody("visitor", false));
    const doorstep = ENTRANCE[ENTRANCE.length - 1];
    visitor.group.position.set(ENTRANCE[0].x, 0, ENTRANCE[0].z);
    visitor.setPath([...ENTRANCE, ...(this.nav.findPath(doorstep, VISITOR_STOP) ?? [VISITOR_STOP])]);
    this.guestLayer.add(visitor.group);
    this.visitor = visitor;
    this.visitorWalking = true;
    this.log.add("Then the door opens again.");
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
    for (const line of lines) {
      this.log.addTalk(line);
      this.narrator.note(line.speaker ? `${line.speaker} says: ${line.text}` : line.text);
    }
    this.updateForceUI();
  }

  private updateForceUI(): void {
    const el = document.getElementById("touch-force");
    if (!el) return;
    const chat = this.tavern.touchChatPublic;
    const level = chat?.touch.level ?? 0;
    if (level > 0) {
      el.classList.add("visible");
      el.classList.toggle("high", level >= 6);
      el.classList.toggle("extreme", level >= 9);
      const fill = el.querySelector<HTMLElement>(".force-fill");
      const val = el.querySelector(".force-value");
      const modeEl = el.querySelector(".house-mode");
      if (fill) fill.style.width = `${(level / 10) * 100}%`;
      if (val) val.textContent = `${level}/10`;
      const stage = mindStage(this.tavern.corruption, this.tavern.lewdness);
      const mode = this.tavern.houseMode.current;
      if (modeEl) modeEl.textContent = `${mode === "brothel" ? "[Brothel] " : ""}${mindStageName(stage)}`;
      el.setAttribute("aria-hidden", "false");
    } else {
      el.classList.remove("visible", "high", "extreme");
      el.setAttribute("aria-hidden", "true");
    }
  }

  /** What guests have got off the player tonight, as last put on the model: who, and which pieces. */
  private strippedShown = "";

  /** Takes off the model whatever guests have got off the player, and puts it back on by morning. */
  private syncStripped(): void {
    const off = this.tavern.shownPieces;
    const key = `${this.active}:${off.join(",")}`;
    if (key === this.strippedShown) return;
    this.strippedShown = key;
    this.dressers.forEach((dresser, index) => dresser.setStripped(index === this.active ? off : []));
    this.playerPortrait = null;
  }

  /** How aroused the player shows, easing towards what the night has done to her. */
  private arousalShown = 0;

  /** Her nipples stand and her areolae flush as her breasts' desire, or a duel's pleasure, rises. */
  private syncArousal(dt: number): void {
    const { tavern } = this;
    const duel = tavern.duel ? { state: tavern.duel.state, pleasure: tavern.duel.pleasure / 100 } : null;
    const target = arousalOf(tavern.meters.breasts / METER_MAX, duel);
    this.arousalShown = easeArousal(this.arousalShown, target, dt);
    this.dressers.forEach((dresser, index) => dresser.setArousal(index === this.active ? this.arousalShown : 0));
  }

  /** What men have left on her tonight, stage by stage, as last shown; "" until it is first shown. */
  private coatShown = "";

  /** Shows on the player what men have left on her tonight, part by part; it's gone by the next night. */
  private syncCoat(): void {
    const stages = DEV_COAT ?? this.tavern.coatStages;
    const key = `${this.active}:${Object.values(stages).join(",")}`;
    if (key === this.coatShown) return;
    this.coatShown = key;
    this.dressers.forEach((dresser, index) => dresser.setCoat(index === this.active ? stages : {}));
    this.playerPortrait = null;
  }

  private pickTalk(index: number): void {
    const { tavern } = this;
    this.audio.play("click");
    const picked = tavern.talkChoices[index];
    if (picked && !picked.disabled) {
      this.log.addChoice(picked.label);
      this.narrator.note(`The innkeeper chooses: ${picked.label}`);
    }
    tavern.chooseTalk(index);
    this.syncStripped();
    this.showTouch();
    this.pendingAdult ??= tavern.takeAdultScene();
    if (!tavern.inConversation) {
      this.dialogue.close();
      this.screen = "play";
      document.getElementById("touch-force")?.classList.remove("visible", "high", "extreme");
      const scene = this.pendingAdult;
      this.pendingAdult = null;
      if (scene) {
        if (scene.kind === "upstairs") {
          this.narrator.moment(
            `She agrees to take a ${scene.guestKind} upstairs to her bed, and the room watches them go.`,
            `upstairs:${scene.guestKind}`,
            scene.guestKind,
          );
        } else this.narrator.moment("Her pleasure boils over and she is overwhelmed in front of the whole room.", "overwhelmed");
        playAdultScene(this, scene);
      }
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
    const look = this.guestLook(guest);
    const key = `${guest.kind}:${female}:${look}`;
    let portrait = this.guestPortraits.get(key);
    if (!portrait) {
      const body = this.makeGuestBody(guest.kind, female, look);
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

  goToSleep(): void {
    this.clearTarget();
    this.audio.play("cloth");
    this.fadeTo(() => {
      this.clock.setTime(this.tavern.nightIndex + 1, MORNING_HOUR);
      this.showDawn();
    });
  }

  /** A catalogue picture of a piece of furniture, rendered from its model the first time it's asked for. */
  private furnitureImage(kind: FurnitureKind): string {
    let image = this.furnitureImages.get(kind);
    if (!image) {
      image = renderThumbnail(this.renderer, this.houseView.model(kind), FURNITURE_THUMB_SIZE);
      this.furnitureImages.set(kind, image);
    }
    return image;
  }

  /** The upgrades and wares sold from the house plans, during the day. */
  private supplies(): Supply[] {
    const { tavern } = this;
    const upgrades = (Object.keys(UPGRADES) as UpgradeId[]).map(
      (id): Supply => ({
        name: UPGRADES[id].name,
        icon: id,
        price: UPGRADE_COST,
        detail: UPGRADES[id].detail,
        owned: tavern.upgrades.has(id),
        canBuy: tavern.canBuy(id),
        buy: () => tavern.buy(id),
      }),
    );
    const wares = (Object.keys(WARE_NAMES) as Ware[]).map(
      (ware): Supply => ({
        name: `+${STOCK_PACK} ${WARE_NAMES[ware]}`,
        icon: ware,
        price: STOCK_COST,
        detail: `${STOCK_PACK} more ${WARE_NAMES[ware]}, so you run out later in the night. Your shelves hold ${MAX_WARE[ware]}.`,
        owned: false,
        count: tavern.stock[ware],
        max: MAX_WARE[ware],
        canBuy: tavern.canBuyStock(ware),
        buy: () => tavern.buyStock(ware),
      }),
    );
    const drinks = BOTTLE_KINDS.map(
      (bottle): Supply => ({
        name: BOTTLES[bottle].name,
        icon: bottle,
        group: "Drinks",
        price: BOTTLES[bottle].cost,
        detail: BOTTLES[bottle].detail,
        owned: tavern.bottles.has(bottle),
        canBuy: tavern.canBuyBottle(bottle),
        buy: () => tavern.buyBottle(bottle),
      }),
    );
    return [...upgrades, ...wares, ...drinks];
  }

  /** The night's report. Spending happens at the house plans, during the day. */
  private showDawn(): void {
    const { tavern } = this;
    const now = this.standing();
    this.openPanel(
      `Morning after night ${tavern.nightIndex + 1}`,
      [
        tavern.lastResult,
        `Served ${tavern.served}, ${tavern.walkouts} walked out, earned ${tavern.earned} gold.`,
        // What the town is saying about her this morning, from what she did since the day began.
        ...(this.dayStart ? townTalk(this.dayStart, now) : []),
        ...(tavern.isLastNight ? [] : ["Upgrades and more cups and dishes are on the house plans in your room."]),
      ].filter((line) => line !== ""),
      [
        {
          label: tavern.isLastNight ? "Face the baron" : "Start the next day",
          // Already faded through the night on the way to bed.
          onPick: () => this.advanceNight(),
        },
      ],
    );
    this.addDayIcon(tavern.nightIndex);
    this.addStatus(now, this.dayStart);
    // What she earned as she lay down, each with her thought on it, the way Karryn's are shown at bedtime.
    if (tavern.newPassives.length > 0) {
      const list = document.createElement("div");
      list.className = "new-passives";
      const heading = document.createElement("h2");
      heading.textContent = tavern.newPassives.length === 1 ? "New passive" : `${tavern.newPassives.length} new passives`;
      list.append(heading);
      for (const def of tavern.newPassives) {
        const item = document.createElement("div");
        item.className = "new-passive";
        const icon = document.createElement("span");
        icon.className = "icon";
        icon.innerHTML = PASSIVE_ICONS[def.group];
        const text = document.createElement("div");
        const name = document.createElement("b");
        name.textContent = def.name;
        const thought = document.createElement("p");
        thought.className = "thought";
        thought.textContent = def.thought;
        const benefit = document.createElement("p");
        benefit.className = "benefit";
        benefit.textContent = def.cost ? `+ ${def.benefit}   - ${def.cost}` : `+ ${def.benefit}`;
        text.append(name, thought, benefit);
        item.append(icon, text);
        list.append(item);
      }
      this.panelEl.querySelector(".box")?.insertBefore(list, this.panelEl.querySelector(".box .menu"));
    }
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
          { label: "Load game", disabled: !latestSave(), onPick: () => showLoadMenu(this, () => this.advanceNight()) },
        ],
      );
    } else {
      this.showDayCard();
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
        this.log.add(`Walk style ${level} of 5: ${WALK_STYLE_NAMES[level - 1]}`);
      }
    }

    // P opens the sex fight test panel, in development only.
    if (import.meta.env.DEV && input.pressed("KeyP")) {
      this.clearTarget();
      showDuelTest(this);
      return;
    }
    // B starts a test brawl with a random kind of guest, in development only.
    if (import.meta.env.DEV && input.pressed("KeyB") && !tavern.fight) {
      tavern.startTestFight();
      this.clearTarget();
      showFight(this);
      return;
    }

    const found = this.findTarget();
    if (found && found.prompt.actionable && input.pressed("KeyE") && found.target.kind === "bed" && (tavern.restless || tavern.duelOffer())) {
      this.clearTarget();
      showBedChoice(this);
      return;
    }
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
      if (found.target.kind === "book") {
        showJournal(this);
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
    // A guest started a brawl: the night waits while it's settled.
    if (tavern.fight) {
      this.clearTarget();
      showFight(this);
      return;
    }

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

  /**
   * Plays out the answer to a guest who reached for you: on the floor she jolts, melts into it or twists away,
   * and whatever soft part was touched bounces; over the top, a comic panel shows it close up.
   */
  private showTouch(): void {
    const moment = this.tavern.takeTouchMoment();
    if (!moment) return;
    this.narrator.moment(
      `A ${moment.kind} reaches for her ${moment.region} (touch "${moment.id}", boldness ${moment.level}/10). ` +
        TOUCH_ANSWER_TEXT[moment.answer],
      `touch:${moment.region}:${moment.answer}:{tier}`,
      moment.kind,
    );
    const sibling = this.siblings[this.active];
    const took = moment.answer === "allow" || moment.answer === "lean";
    const soft: SoftPart | null = !took ? null : moment.region === "chest" ? "Bust" : moment.region === "rear" || moment.region === "lap" ? "Glute" : null;
    const reaction: Reaction = !took ? "recoil" : moment.answer === "lean" ? "melt" : "jolt";
    sibling.react(reaction, soft, moment.id === "smack" ? 0.9 : 0.6);
    const name = BODY_NAMES[this.active];
    const body = sibling.root.getObjectByName(name);
    if (body) this.touchComic.play(body, name, { id: moment.id, region: moment.region, answer: moment.answer, kind: moment.kind });
  }

  /**
   * One moment of an after-hours duel in the comic panel beside the log, like Karryn's battle picture: his move
   * on the part of her he has (his hand coming in), her own move, or where he finished (her alone, no hand).
   */
  showDuelMoment(entry: DuelLogEntry, state: DuelState): void {
    const shot = entry.spot
      ? { ...DUEL_CUM_SHOTS[entry.spot], noHand: true }
      : entry.part
        ? (DUEL_THEIR_SHOTS[entry.part][Math.min(entry.stage ?? 0, DUEL_THEIR_SHOTS[entry.part].length - 1)] ?? DUEL_THEIR_SHOTS.kiss[0])
        : entry.move
          ? { ...DUEL_HER_SHOTS[entry.move], noHand: true }
          : null;
    if (!shot) return;
    const name = BODY_NAMES[this.active];
    const body = this.siblings[this.active].root.getObjectByName(name);
    if (!body) return;
    this.touchComic.play(body, name, { ...shot, answer: state === "calm" ? "allow" : "lean", kind: entry.kind ?? "farmer", hold: true });
  }

  /**
   * A brawl turn in the comic panel beside the log: her move, then his answer, one after the other (his fist
   * coming in, her knocking him back, a dodge). The last one stays up until the next turn.
   */
  showFightMoments(events: readonly string[], kind: GuestKind): void {
    this.fightQueue = events.filter((event) => FIGHT_SHOTS[event]).map((event) => ({ ...FIGHT_SHOTS[event], kind, hold: true }));
    this.fightQueueWait = 0;
    this.nextFightMoment();
  }

  private nextFightMoment(): void {
    const show = this.fightQueue.shift();
    if (!show) return;
    const name = BODY_NAMES[this.active];
    const body = this.siblings[this.active].root.getObjectByName(name);
    if (body) this.touchComic.play(body, name, show);
    this.fightQueueWait = FIGHT_MOMENT_GAP;
  }

  /**
   * The big picture of her beside a fight, showing her as she is now: shown again only when what's off her or
   * on her has changed. `title` goes on its nameplate.
   */
  showBattle(mode: BattleMode, title: string, heat: number, edge: boolean, status: readonly BattleStat[]): void {
    this.syncStripped();
    this.syncCoat();
    const key = `${mode}:${this.strippedShown}:${this.coatShown}`;
    const name = BODY_NAMES[this.active];
    const body = this.siblings[this.active].root.getObjectByName(name);
    if (body && (key !== this.battleShown || !this.battleView.open)) {
      this.battleShown = key;
      this.battleView.show(body, name, mode, title);
    }
    this.battleView.setHeat(heat, edge);
    this.battleView.setStatus(status);
  }

  /** She's hit, or jolted, in the big picture. */
  battleHit(hard: boolean): void {
    this.battleView.hit(hard);
  }

  /** Takes the duel's comic panel down, once the game is over. */
  hideDuelMoment(): void {
    this.battleView.hide();
    this.battleShown = "";
    this.fightQueue = [];
    this.touchComic.clear();
  }

  /** Pops up the comic panel of the active sibling knocking back a drink. */
  private showDrinkComic(): void {
    const name = BODY_NAMES[this.active];
    const body = this.siblings[this.active].root.getObjectByName(name);
    if (body) this.drinkComic.play(body, name, this.tavern.drunk);
    else this.audio.play("drink");
  }

  /** Plays what the rules cued and sets the music and the room's ambience for this moment. */
  private updateSound(): void {
    const { audio, tavern, focus } = this;
    for (const cue of tavern.takeCues()) {
      // Drinking with a guest plays out in a comic panel, which makes its own clink and gulp in time.
      if (cue === "drink") this.showDrinkComic();
      else audio.play(cue);
    }
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
        this.log.add(muted ? "Sound off" : "Sound on");
      }
    }
    if (this.input.pressed("KeyN") && !this.staging) {
      const on = this.narrator.toggle();
      this.log.add(on ? `AI narrator on (KoboldCpp at ${this.narrator.endpoint})` : "AI narrator off");
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
    this.syncStripped();
    this.syncCoat();
    this.syncArousal(dt);

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

    this.drinkComic.update(dt);
    if (this.fightQueue.length > 0 && (this.fightQueueWait -= dt) <= 0) this.nextFightMoment();
    this.touchComic.update(dt);
    this.battleView.update(dt);
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
      this.updateLog(dt);
      this.updateClock();
    }
    this.updateSound();
    this.input.endFrame();
  }
}
