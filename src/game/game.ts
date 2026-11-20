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
  startLooks,
  GUEST_PERSON_LOOKS,
  guestHairstyle,
  guestOutfitColors,
  guestModernOutfit,
  guestPersonColors,
  OUTFIT_COLORS,
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
  CLOSET_NAME,
  CLOSET_SPOT,
  DESK_NAME,
  DESK_SPOT,
  JOURNAL_NAME,
  JOURNAL_SPOT,
  FRONT_DOOR_HINGE,
  FRONT_DOOR_NAME,
  FRONT_DOOR_OPEN_ANGLE,
  makeBell,
  WASH_TUB_NAME,
  WASH_TUB_SPOT,
} from "./furnishings";
import {
  atTopOfStairs,
  atTopOfWell,
  floorHeightAt,
  isUpstairs,
  LANDING,
  LANDING_HEADING,
  roomViewAt,
  STAIRS_COLLIDERS,
  STAIRS_FOOT,
  STAIRS_FOOT_HEADING,
  UP_THE_STAIRS,
  Upstairs,
  UPSTAIRS_CAMERA_LIMITS,
  UPSTAIRS_WHOLE,
} from "./upstairs";
import { BuildMode, type BuildHost, type EdictView, type StaffBoard, type Supply } from "./buildmode";
import type { Booking } from "./lantern";
import { lanternSupplies, revelSupplies } from "./lanternplans";
import { GuestActor, Walker } from "./guests";
import { softHeft } from "./heft";
import { statsOf, type GuestRole } from "./guestroles";
import { cloneLayout, emptyLayout, footprint, HousePlan, seatSpecs, type FurnitureKind, type HouseLayout, type Placed } from "./house";
import { HouseView } from "./houseview";
import { COIN, FLAME, StatsHud, VILLAGERS } from "./hud";
import { changeLabel, dayIcon, dayStory, statusLines, townTalk, type Standing } from "./daystory";
import { StatusCard } from "./statuscard";
import { DRINK_COLORS, Icon, type IconName } from "./icons";
import type { Input } from "./input";
import { CURSOR_EVENT, CURSOR_START, KeyNav } from "./keynav";
import { DEBUFFS } from "./debuffs";
import { ordinal } from "./ledger";
import { biggestFanGroup, chapterEndingCard, firstInTarvenCard } from "./chapter1";
import { findCobwebSpots, findDustSpots, MessLayer } from "./mess";
import { Outline, outlineMaterial } from "./outline";
import { renderPortrait, renderThumbnail } from "./portraits";
import {
  describeSave,
  latestSave,
  writeSave,
  type Moment,
  type SaveData,
  type SlotId,
} from "./save";
import { INTRO, StoryBox } from "./story";
import { Chatter } from "./chatter";
import { DrinkComic } from "./comic";
import { showJournal } from "./journalpanel";
import { showBedChoice, showDuelTest, showFight, playAdultScene } from "./fightpanels";
import { confirmMenu, showDevPanel, showLaws, showLoadMenu, showSaveMenu, showSettingsMenu } from "./menus";
import { arcStageName } from "./lewd";
import { isCardTitle } from "./tropes";
import { PASSIVE_ICONS } from "./passiveicons";
import { saveBadges } from "./saveicons";
import { SkyDial } from "./skydial";
import { TouchComic } from "./touchcomic";
import { CUT_INS, cutKindFor, type CutKind } from "./cutin";
import { duelHeat } from "./comicfx";
import { touchLands } from "./touch";
import { readTouchSettings, writeTouchSettings } from "./touchsettings";
import { arousalOf, easeArousal } from "./nipples";
import { easeOpening } from "./vulva";
import { METER_MAX, METERS } from "./passives";
import type { ShowPart, ShowSide } from "./show";
import {
  easeFace,
  expressionFor,
  EXPRESSIONS,
  EXPRESSIONS_LIST,
  faceFor,
  MOMENT_TIME,
  REST_FACE,
  type Expression,
  type FaceCause,
  type FaceMoment,
  type FaceShape,
} from "./face";
import { DialogueBox } from "./dialogue";
import { MessageLog } from "./messagelog";
import { UnlockToasts, type Toast } from "./unlocktoast";
import { bonusText, TITLE_BY_ID } from "./titles";
import { KINK_NAMES } from "./kinktalk";
import { ROLE_PLAYS } from "./duellines";
import type { PassiveDef, PassiveGroup } from "./passives";
import { BODY_SKILLS, STATS, type SkillId, type StatId } from "./skills";
import { AiNarrator } from "./ainarrator";
import { setFlavorSource } from "./flavor";
import { SpeechBubbles, type Speaker } from "./speech";
import { buildStreet, type Street } from "./street";
import { MAX_PUSHERS } from "./grass";
import { actEffect, outfitNoticed, walkOfShame, type SeenEffect, type SeenFacts } from "./beingseen";
import type { RecruitOutfit } from "./recruits";
import { questMonsterId } from "./tavern";
import { Townsfolk } from "./townsfolk";
import { StreetTalk } from "./streettalk";
import { dressOf, outfitStyleOf, type HeatMoment, type TownFacts, type Townsperson } from "./towntalk";
import { shiftPersona } from "./banter";
import { formatHour, type WorldClock } from "./time";
import { costLabel, isTownPlace, TOWN_PLACES, type TownPlaceId } from "./townplaces";
import { ERRANDS_CLOSE_HOUR, FEED_COST, FEED_HOURS, FLYER_COST, FLYER_HOURS, MARKET_HOURS, marketPackCost, marketReplaceCost } from "./errands";
import { NavGrid } from "./path";
import type { CumSpot } from "./cum";
import type { Duel, DuelArea, DuelLogEntry, DuelState } from "./duel";
import { DuelStage } from "./duelstage";
import type { CastMember } from "./battleview";
import type { HerMove } from "./duelmoves";
import { SMACK_TOUCHES, type TouchRegion } from "./touchtalk";
import { EDICT_BRANCHES, EDICT_POINTS_PER_DAY, edictState, TAVERN_RULE_BY_ID, TAVERN_RULES } from "./tavernrules";
import { JOB_UNLOCK, STAFF_JOBS, type StaffJob } from "./staff";
import { horny } from "./desire";
import { FAINT_HOLD, FAINT_SECONDS } from "./barwork";
import type { TouchShow } from "./touchcomic";
import { BattleView, FoeColumn, type BattleLust, type BattleMode, type BattleStat } from "./battleview";
import { ScreenShake, shakePixels, type ShakeKind } from "./screenshake";
import { fightFace } from "./fightface";
import { restingPose, type BattlePoseName } from "./battlepose";
import type { Fight, Foe } from "./fight";
import { brawlBeats, intimateOf, intimateScene, takenOf, takenScene, touchScene, TOUCH_SCENE_HOLD, type IntimateRun } from "./brawlscene";
import { scenePose } from "./brawlscenes";
import type { LewdPart } from "./brawlai";
import { SCENE_JOINS, type ScenePoseName } from "./sexpose";
import { FATIGUE_LABELS } from "./herstate";
import { Body, Sibling, SHOW_POSES, WALK_STYLE_NAMES, type Reaction, type ShowPose, type SoftPart } from "./player";
import { cutInPieces, stripLadder, topPull } from "./wardrobe";
import { COAT_SECTIONS, COAT_STAGES, type CoatSection } from "./cum";
import { applyRetroLook, solidRetroMaterial } from "./retro";
import { QuestMap } from "./questmap";
import {
  BOTTLE_KINDS,
  BOTTLES,
  DEBT,
  DRUNK_MAX,
  drunkLabel,
  ENDINGS,
  HEAT_MAX,
  MAX_WARE,
  STOCK_COST,
  REPLACE_COST,
  STOCK_PACK,
  Tavern,
  TRAY_SIZE,
  TRUST_MAX,
  TRUST_TO_OVERTHROW,
  UPGRADE_COST,
  UPGRADES,
  WARE_NAMES,
  type AdultScene,
  type Trouble,
  type Bottle,
  type Guest,
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
/** A cobweb is brushed down from the floor below it; the arrow floats there, under the web. */
const COBWEB_RANGE = 1.2;
const COBWEB_ARROW_HEIGHT = 2.6;
const LISTEN_RANGE = 2.2;
/** Talk about you can be made out from this close. Further off, it's only whispering. */
const OVERHEAR_RANGE = 4.5;
/** How close she must be to stop one of the townsfolk for a word. */
const TOWNSFOLK_TALK_RANGE = 1.6;
const TOWN_KINDS: GuestKind[] = ["farmer", "soldier", "noble", "farmer", "adventurer", "fugitive", "smuggler", "farmer", "bandit"];
/** Who each of the townsfolk is: their kind, and man or woman. */
const townPerson = (index: number): Townsperson => ({
  kind: TOWN_KINDS[index % TOWN_KINDS.length],
  female: index % 3 === 1 || index % 4 === 2,
});
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
/** The close shot of the groin "?groin" gives the body tab in development: the groin at this share of the height. */
const CUSTOMIZE_GROIN_SHOT = { side: 0.14, share: 0.5, distance: 1.3 };
/** How fast the camera eases between customise shots, per second. */
const CUSTOMIZE_CAMERA_RATE = 6;
/** How long a dish that's just come out clean sparkles over the tub, in milliseconds. */
const WASH_SPARKLE_MS = 300;
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
/** Where she stands to go out of the front door by day, how near she must be, and where she comes back in. */
const FRONT_DOOR_SPOT = new Vector3(-1.5, 0, -4.4);
const FRONT_DOOR_RANGE = 1.3;
const BACK_INSIDE: Vec2 = { x: -1.5, z: -3.8 };
/** Out in the street, the hour she's reminded to head home, before the bell at five (AFTERNOON_HOLD_HOUR). */
const STREET_REMIND_HOUR = 16;
/** How much further back the camera stands in the street than in the room. */
const STREET_ZOOM = 1.25;
/** The market's own words (its errands are errands.ts); every other place is townplaces.ts. */
const STREET_PLACES: Record<string, { title: string; text: string[] }> = {
  market: {
    title: "The Market Stalls",
    text: [
      "Flour, onions, and a whole side of something that used to be a boar. A goblin at the end stall is selling phone charms, and swears one of them is lucky.",
    ],
  },
};

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
  CLOSET_NAME,
  ...UPSTAIRS_WHOLE,
];
/** How close you need to be to the middle of the bath to climb in. */
const BATH_RANGE = 1.3;
/** What each staff post is called on the plans' Staff tab. */
const POST_NAMES: Readonly<Record<StaffJob, string>> = {
  barmaid: "Bar", cook: "Kitchen", doorman: "Door", girl: "Upstairs", dancer: "Stage", devotee: "Chapel corner", clerk: "Front desk",
};
/** How close you need to be to the middle of the closet to open it. */
const CLOSET_RANGE = 1.1;
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
  givein: "She could pull away, and she chooses not to: she gives in to it.",
};
/** How far past the room's walls the follow camera has to reach for the room to fill the screen. */
const CAMERA_INSET_X = 6.5;
const CAMERA_INSET_Z = 4;
/** Places that must always be possible to walk to from the front door, whatever gets built. */
const BEHIND_THE_BAR: Vec2 = { x: 3.2, z: -3.85 };
const BY_THE_BEDROOM_DOOR: Vec2 = { x: 6.5, z: 0 };
/** In the taproom by the stair hall's doorway in the west wall (upstairs.ts). */
const BY_THE_STAIRS: Vec2 = UP_THE_STAIRS[0];

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
  // The groups below come in their types' own outfits (guestroles.ts); only their hair is taken from here.
  adventurer: { top: 0x5a6a3a, legs: 0x4a3a2a, hair: 0x8a5a2a },
  bandit: { top: 0x6a1818, legs: 0x2a2420, hair: 0x1a1410 },
  noble: { top: 0x3a2a5a, legs: 0x22202a, hair: 0xc8b07a },
  // Whoever comes in at last call, dressed unlike any guest so nobody takes them for one who stayed behind.
  visitor: { top: 0x2f5590, legs: 0x1c1c22, hair: 0x2b2018 },
};

/**
 * The plain clothes a group comes in, one set per guest, so a room of farmers isn't one coat over and over. The
 * garrison keeps its red; only the breeches under it differ. The first set is the group's own (OUTFITS).
 */
const PLAIN_CLOTHES: Partial<Record<GuestKind | "visitor", { top: number; legs: number }[]>> = {
  farmer: [
    { top: 0x8a7a3e, legs: 0x4c3a24 },
    { top: 0x6a5a3a, legs: 0x3a2e22 },
    { top: 0x9a8a6a, legs: 0x5a4a32 },
    { top: 0x5c6a3a, legs: 0x4a3a2a },
    { top: 0x7a4a2a, legs: 0x3a3226 },
    { top: 0xb8a882, legs: 0x5c4c36 },
  ],
  soldier: [
    { top: 0x8c2020, legs: 0x3a3a40 },
    { top: 0x8c2020, legs: 0x2a2a2e },
    { top: 0x7a1c1c, legs: 0x4a4038 },
    { top: 0x962626, legs: 0x32323a },
  ],
  fugitive: [
    { top: 0xbcb4a2, legs: 0x6a6252 },
    { top: 0x5a5a52, legs: 0x3a3632 },
    { top: 0x6a5240, legs: 0x4a4236 },
    { top: 0x3e4a52, legs: 0x2e2e2a },
  ],
};
/** Which share of a guest's look picks their plain clothes: past what picks their outfit, skin, hair and eyes. */
const PLAIN_STEP = GUEST_PERSON_LOOKS;

/** Who the player can be, by sibling index: the male body, then the female one. */
const PLAYER_LABELS = ["Male", "Female"];
/**
 * Which siblings the player may pick, by index. For now only the female: the male stays loaded but is kept
 * off the select screen and out of play. Put 0 back in to offer him again.
 */
const PLAYABLE: readonly number[] = devFlag("male") ? [0, 1] : [1];
const isPlayable = (index: number): boolean => PLAYABLE.includes(index);

/** How long the "Brawl!" card holds the screen before the fight opens. */
const BRAWL_INTRO_SECONDS = 1.5;

/** The "Brawl!" card: a word that slams in, and who it's against under it. Hidden until a brawl starts. */
/** The bar along the top while she walks a quest's map. */
function makeQuestHud(): HTMLElement {
  const root = document.createElement("div");
  root.id = "quest-hud";
  root.setAttribute("aria-live", "polite");
  Object.assign(root.style, {
    position: "fixed",
    top: "10px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "6px 14px",
    background: "rgba(20, 16, 12, 0.78)",
    color: "#f2e6cf",
    font: "14px/1.4 Georgia, serif",
    borderRadius: "6px",
    border: "1px solid rgba(242, 230, 207, 0.35)",
    pointerEvents: "none",
    zIndex: "20",
    display: "none",
    maxWidth: "calc(100vw - 32px)",
    textAlign: "center",
  });
  const style = document.createElement("style");
  style.textContent = "#quest-hud.on { display: block !important; }";
  document.head.append(style);
  document.body.append(root);
  return root;
}

function makeBrawlIntro(): HTMLElement {
  const root = document.createElement("div");
  root.id = "brawl-intro";
  root.setAttribute("aria-live", "assertive");
  const word = document.createElement("div");
  word.className = "word";
  word.textContent = "Brawl!";
  const who = document.createElement("div");
  who.className = "who";
  root.append(word, who);
  document.body.append(root);
  return root;
}

/** Seconds each moment of a brawl turn shows before the next. */
const FIGHT_MOMENT_GAP = 1.8;
/** Each brawl event as a comic shot (fight.ts events): what it looks like, and the words over it. */
const FIGHT_SHOTS: Record<string, Omit<TouchShow, "kind">> = {
  start: { id: "grab", region: "shoulder", answer: "allow", words: { hit: "GRAB!", voice: "hey!" } },
  "strike:hit": { id: "chin", region: "face", answer: "slap", words: { hit: "POW!", voice: "take that!" } },
  "strike:miss": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "WHIFF", voice: "tch!" } },
  "kick:hit": { id: "chin", region: "face", answer: "slap", words: { hit: "THWACK!", voice: "hyah!" } },
  "kick:miss": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "WHOOSH", voice: "tch!" } },
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
  // Grapples, hers and theirs: fighting, like the rest.
  "grab:hit": { id: "grab", region: "shoulder", answer: "slap", words: { hit: "GOTCHA!", voice: "stay put!" } },
  "grab:miss": { id: "grab", region: "shoulder", answer: "allow", words: { hit: "WHIFF", voice: "slippery..." } },
  "headlock:hit": { id: "grab", region: "neck", answer: "slap", words: { hit: "SQUEEZE!", voice: "give up!" } },
  "headlock:miss": { id: "grab", region: "neck", answer: "allow", words: { hit: "...", voice: "tch!" } },
  "hairpull:hit": { id: "grab", region: "hair", answer: "slap", words: { hit: "YANK!", voice: "how's that?" } },
  "hairpull:miss": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "WHIFF", voice: "hold still!" } },
  "tackle:hit": { id: "grab", region: "waist", answer: "slap", words: { hit: "CRASH!", voice: "down you go!" } },
  "tackle:miss": { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "THUD", voice: "ow..." } },
  "their:grab": { id: "grab", region: "shoulder", answer: "allow", words: { hit: "GRAB!", voice: "let go!" } },
  "their:headlock": { id: "grab", region: "neck", answer: "allow", words: { hit: "SQUEEZE", voice: "gk—!" } },
  "their:hairpull": { id: "grab", region: "hair", answer: "allow", words: { hit: "YANK!", voice: "ow!" } },
  "their:tackle": { id: "smack", region: "face", answer: "allow", fist: true, words: { hit: "CRASH!", voice: "oof!" } },
  "their:bearhug": { id: "behind", region: "waist", answer: "allow", words: { hit: "CRUSH!", voice: "can't— breathe—" } },
  "their:armtwist": { id: "wrist", region: "hand", answer: "allow", words: { hit: "TWIST!", voice: "ow, ow, ow!" } },
  "their:pin": { id: "grab", region: "shoulder", answer: "allow", words: { hit: "SLAM!", voice: "get off me!" } },
  "their:sweep": { id: "smack", region: "face", answer: "allow", fist: true, words: { hit: "THUD!", voice: "my legs—!" } },
  "their:collar": { id: "collar", region: "shoulder", answer: "allow", words: { hit: "SHAKE!", voice: "put me down!" } },
  // Her hands, her mouth, riding them: no fighting words, the blush and the heart of a touch she wants.
  "intimate:hands": { id: "fingers", region: "hand", answer: "lean", noHand: true },
  "intimate:mouth": { id: "kiss", region: "lips", answer: "lean", noHand: true },
  "intimate:ride": { id: "lap", region: "lap", answer: "lean", noHand: true },
};

/** Karryn's battle (GAME_PATH.MD 7i): a foe's lewd moves and the scenes he starts, as comic shots, by the part of her. */
const AREA_SHOTS: Record<DuelArea, { id: string; region: TouchRegion; cut?: CutKind }> = {
  hands: { id: "fingers", region: "hand" },
  mouth: { id: "kiss", region: "lips", cut: "kissed" },
  breasts: { id: "bothHands", region: "chest", cut: "breasts" },
  pussy: { id: "thighUp", region: "intimate", cut: "pussy" },
  butt: { id: "grab", region: "rear", cut: "butt" },
};
const LEWD_SHOTS: Record<LewdPart, { id: string; region: TouchRegion }> = {
  mouth: { id: "gaze", region: "lips" },
  breasts: { id: "gaze", region: "chest" },
  butt: { id: "gaze", region: "rear" },
  pussy: { id: "gaze", region: "intimate" },
  cock: { id: "gaze", region: "face" },
};
for (const [area, shot] of Object.entries(AREA_SHOTS) as [DuelArea, (typeof AREA_SHOTS)[DuelArea]][]) {
  FIGHT_SHOTS[`their:offer:${area}`] = { ...shot, answer: "allow" };
  FIGHT_SHOTS[`taken:${area}`] = { ...shot, answer: "allow" };
  FIGHT_SHOTS[`their:pose:${area}`] = { ...shot, answer: "allow" };
  FIGHT_SHOTS[`taken:go:${area}`] = { ...shot, answer: "lean", noHand: true, cut: undefined };
}
for (const [part, shot] of Object.entries(LEWD_SHOTS) as [LewdPart, (typeof LEWD_SHOTS)[LewdPart]][]) {
  FIGHT_SHOTS[`their:talk:${part}`] = { ...shot, answer: "allow", noHand: true };
  FIGHT_SHOTS[`their:sight:${part}`] = { ...shot, answer: "allow", noHand: true };
}
for (const slot of ["mouth", "left", "right"] as const) {
  const shot = slot === "mouth" ? AREA_SHOTS.mouth : AREA_SHOTS.hands;
  FIGHT_SHOTS[`their:join:${slot}`] = { ...shot, answer: "allow" };
  FIGHT_SHOTS[`joined:${slot}`] = { ...shot, answer: "allow" };
}
FIGHT_SHOTS.join = { id: "grab", region: "shoulder", answer: "allow", words: { hit: "ANOTHER!", voice: "oh, come on!" } };
// Her clothes in a brawl (7l): him going for them, a piece coming off, the last one gone, and her fixing them.
FIGHT_SHOTS["their:strip"] = { id: "collar", region: "shoulder", answer: "allow", words: { hit: "GRAB!", voice: "not my clothes—!" } };
FIGHT_SHOTS["their:stripped"] = { id: "collar", region: "shoulder", answer: "allow", words: { hit: "RIIIP!", voice: "give that back!" } };
FIGHT_SHOTS.bare = { id: "gaze", region: "chest", answer: "allow", noHand: true, heat: 1, words: { hit: "!!", voice: "don't look...!" } };
FIGHT_SHOTS.fixClothes = { id: "gaze", region: "face", answer: "allow", noHand: true, words: { hit: "", voice: "there." } };
FIGHT_SHOTS["her:come"] = { id: "gaze", region: "face", answer: "lean", noHand: true, heat: 1, cut: "orgasm" };
FIGHT_SHOTS["their:come"] = { id: "gaze", region: "face", answer: "lean", noHand: true, cut: "cumBody" };
// Her own hands and mouth on them: her hand round him, her kissing him (KP's cock petting and Karryn kiss).
FIGHT_SHOTS["taken:go:hands"] = { id: "fingers", region: "hand", answer: "lean", cut: "stroke" };
FIGHT_SHOTS["taken:go:mouth"] = { id: "kiss", region: "lips", answer: "lean", cut: "kissHim" };
FIGHT_SHOTS["intimate:hands"] = { id: "fingers", region: "hand", answer: "lean", cut: "stroke" };
FIGHT_SHOTS["intimate:mouth"] = { id: "kiss", region: "lips", answer: "lean", cut: "kissHim" };
FIGHT_SHOTS["struggle:free"] = { id: "grab", region: "shoulder", answer: "slap", words: { hit: "SHOVE!", voice: "get OFF me!" } };
FIGHT_SHOTS["struggle:fail"] = { id: "grab", region: "waist", answer: "allow", words: { hit: "...", voice: "let go!" } };


/**
 * A duel moment's comic shot: which touch it looks like (for the framing and the hand), on what part of her, and
 * the Karryn-style cut-in it plays (cutin.ts), if it has one.
 */
type DuelShot = { id: string; region: TouchRegion; cut?: CutKind; strength?: number };
/** His moves, by the part of her he has, first to boldest (dueltalk.ts THEIR_STAGES). */
const DUEL_THEIR_SHOTS: Record<"kiss" | DuelArea, readonly DuelShot[]> = {
  kiss: [{ id: "kiss", region: "lips", cut: "kissed" }],
  hands: [
    { id: "roam", region: "waist" },
    { id: "fingers", region: "hand" },
    { id: "fingers", region: "hand" },
  ],
  mouth: [
    { id: "deepKiss", region: "lips", cut: "deepKiss" },
    { id: "scuffleMouth", region: "lips", cut: "fingers" },
    { id: "deepKiss", region: "lips", cut: "deepKiss" },
  ],
  breasts: [
    { id: "bothHands", region: "chest", cut: "breasts" },
    { id: "pinch", region: "chest", cut: "nipples" },
    { id: "bothHands", region: "chest", cut: "breasts" },
  ],
  butt: [
    { id: "grab", region: "rear", cut: "butt" },
    { id: "smack", region: "rear", cut: "spank", strength: 2 },
    { id: "grab", region: "rear", cut: "anal" },
  ],
  pussy: [
    { id: "thighUp", region: "intimate", cut: "pussy" },
    { id: "thighUp", region: "intimate", cut: "pussy" },
    { id: "thighUp", region: "intimate", cut: "clit" },
  ],
};
/** Her own moves: the part of her that's doing it, with no hand in the shot. */
const DUEL_HER_SHOTS: Record<HerMove, DuelShot> = {
  kiss: { id: "kiss", region: "lips", cut: "kissHim" },
  caress: { id: "gaze", region: "face" },
  tease: { id: "gaze", region: "chest", cut: "flaunt" },
  undress: { id: "collar", region: "clothes" },
  hands: { id: "fingers", region: "hand", cut: "stroke" },
  mouth: { id: "kiss", region: "lips", cut: "kissHim" },
  tits: { id: "grab", region: "chest" },
  ride: { id: "lap", region: "lap" },
  anal: { id: "grab", region: "rear" },
};
/** Where a man finished on her. */
const DUEL_CUM_SHOTS: Record<CumSpot, DuelShot> = {
  mouth: { id: "kiss", region: "lips", cut: "cumMouth" },
  face: { id: "gaze", region: "face", cut: "cumFace" },
  breasts: { id: "grab", region: "chest", cut: "cumBody" },
  pussy: { id: "thighUp", region: "intimate", cut: "creampie" },
  ass: { id: "grab", region: "rear", cut: "analCreampie" },
  body: { id: "hip", region: "waist", cut: "cumBody" },
};

/**
 * In development, whether the page was opened with this switch: "?male" offers the male on the select screen, and
 * "?groin" frames the body tab close on the groin. Always false in a build.
 */
function devFlag(name: string): boolean {
  return import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has(name);
}

/**
 * How she poses to show each thing (7e): her band or her breasts, her hands holding her top pulled down (or, for a
 * top that only lifts, up); her smallclothes or her pussy, her skirt lifted at the front; her behind, turned round
 * with it lifted behind.
 */
function showPoseOf(part: ShowPart, top: "down" | "up", side: ShowSide): ShowPose {
  if (part === "band" || part === "breasts") {
    const chest = top === "up" ? "chestUp" : "chestDown";
    return side === "left" ? `${chest}L` : side === "right" ? `${chest}R` : chest;
  }
  return part === "butt" ? "backLift" : "frontLift";
}

/** In development, holds her face in an expression to look at: "?face=shy" (any of face.ts's EXPRESSIONS_LIST). */
const DEV_FACE: Expression | null = (() => {
  const asked = import.meta.env.DEV && typeof location !== "undefined" ? new URLSearchParams(location.search).get("face") : null;
  return EXPRESSIONS_LIST.find((e) => e === asked) ?? null;
})();

/**
 * Her blinks: how long one takes (seconds) and the share of it spent closing; how much her lower lid comes up with it;
 * seconds between blinks (at least, at most), sooner when she's nervous, and how much slower (blinks and gaps) at her
 * most drunk or worn out.
 */
const BLINK = { time: 0.16, down: 0.4, lower: 0.25, every: [2.5, 5.5] as const, nervousSooner: 0.5, heavySlower: 0.8 };
/**
 * Her glances: how likely a pause ends in one, how far her eyes go (lookX, lookY), how long she holds it and how long
 * between, in seconds, and how fast her eyes get there.
 */
const GLANCE = { chance: 0.45, across: 0.6, up: 0.3, hold: [0.5, 1.4] as const, between: [2.5, 6] as const, speed: 18 };

/** How long her face holds one variant of an expression before another is picked, in seconds: at least, at most. */
const FACE_VARIANT_EVERY = [5, 9] as const;

/** A held development pose's pull: her top, off the breast the pose bares. */
function devPull(pose: ShowPose, top: ReturnType<typeof topPull>): { ids: string[]; dir: "down" | "up"; side?: "left" | "right" } | null {
  if (!pose.startsWith("chest") || !top) return null;
  return pose.endsWith("L") ? { ...top, side: "left" } : pose.endsWith("R") ? { ...top, side: "right" } : top;
}

/** In development, holds her in a show pose to look at: "?pose=chestDown" (any of SHOW_POSES: chestDownL bares her left). */
const DEV_SHOW_POSE: ShowPose | null = (() => {
  const asked = import.meta.env.DEV && typeof location !== "undefined" ? new URLSearchParams(location.search).get("pose") : null;
  return SHOW_POSES.find((p) => p === asked) ?? null;
})();

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
  /** The town kit the high street is dressed with (tools/blender/build_street_kit.py), if it loaded. */
  streetKit?: Object3D | null;
  /** Where the furniture stood in the room as it was loaded. */
  furniture: Placed[];
}

export interface Button {
  label: string;
  onPick: () => void;
  disabled?: boolean;
  /** A save to show on the button, in icons after the label. */
  save?: SaveData;
  /** Called when the menu cursor lands on it (keys or mouse). */
  onCursor?: () => void;
  /** The menu's cursor starts here rather than on the first button. */
  start?: boolean;
  /** A small pixel icon before the label, as SVG markup of our own (fighticons.ts). */
  icon?: string;
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
  if (target.kind === "street") return `street:${target.place}`;
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
/** How fast her feet follow the treads up or down the stairs, per second (eased), so she climbs rather than hops. */
const STAIR_STEP_RATE = 14;

/**
 * A hand between her legs in a cut-in finds her aroused and parted at least this much (KP's wet, open vulva):
 * her vulva's arousal (0 to 1) and how open it is (0 closed, 1 fully open).
 */
const CUT_WET = { arousal: 0.85, open: 0.45 } as const;

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
  /** Whoever she's up against in a brawl, across from her picture. */
  private readonly foeColumn: FoeColumn;
  /** A body made for a test brawl's foe, who has no one in the room to show. */
  private testFoe: { kind: GuestKind; body: Body } | null = null;
  /** A brawl turn's moments still to play in the comic panel, and how long until the next. */
  private fightQueue: TouchShow[] = [];
  private fightQueueWait = 0;
  /** What to return to when the pause menu closes. */
  private pausedFrom: "play" | "visitor" = "play";
  private afterFade: (() => void) | null = null;
  /** Tarven's high street (street.ts), and whether she's out in it rather than in the tavern. */
  private readonly street: Street;
  /** The people out in the street by day (townsfolk.ts), made the first time she goes out. */
  private townsfolk: Townsfolk | null = null;
  /** What the townsfolk say to her and to each other (streettalk.ts, towntalk.ts). */
  private streetTalk: StreetTalk | null = null;
  private readonly townLayer = new Group();
  outdoors = false;
  /**
   * A quest's map she's out walking (questmap.ts), its monsters' layer, the people waiting to brawl her there, and
   * where she set out from. Out there `outdoors` is true too, so the room isn't heard and a save loads her at home.
   */
  private questMap: QuestMap | null = null;
  private questMonsters: Group | null = null;
  private questFoes: { walker: Walker; encounter: number }[] = [];
  private questFrom: "street" | "inside" = "inside";
  /** The monsters in the brawl she's in out there, by their brawl ids, as the brawl's pictures show them. */
  private questBrawlers = new Map<number, Object3D>();
  /** The quest's done and she's been told so. */
  private questToldDone = false;
  private readonly questHud = makeQuestHud();
  /** The reminders to head home she's had today out in the street: 1 at four, 2 at five. */
  private streetReminders = 0;
  /** Seconds until the street next looks at what she's out in (beingseen.ts `outfitNoticed`). */
  private seenCheck = 0;
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
  /** The customise panel is open at her closet in the tavern (Clothes only), not on the select screen. */
  private closetOpen = false;
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
  /** The floor upstairs at play: the Lantern's room, its lamp and door (upstairs.ts). */
  private readonly upstairs: Upstairs;
  /** What the Lantern's room blocks right now, kept in the world's colliders while she's indoors. */
  private upstairsBlock: Rect[] = [];
  /** Guests coming back down the stairs from a booking, on their way out of the front door. */
  private readonly comingDown: Walker[] = [];
  /** The booking upstairs as last seen, so its end sends its guest back down the stairs. */
  private watchedBooking: Booking | null = null;
  /** How each guest who went up to a booking looked, so the same one comes back down. */
  private readonly wentUp = new Map<number, { kind: GuestKind; female: boolean; look: number; role: GuestRole | undefined }>();
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
  /** Big cards at the top of the screen for a new passive, a level up, or her kink changing. */
  private readonly toasts = new UnlockToasts();
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
  /** The "Brawl!" card that slams onto the screen before a fight, and how long it has left. */
  private readonly brawlIntroEl = makeBrawlIntro();
  private brawlIntro = 0;
  /** The screen shake (screenshake.ts), and how far out it was last drawn, in our pixels. */
  private readonly screenShake = new ScreenShake();
  private shakeShown = 0;
  /** Seconds until the room carries her up to bed, once she's passed out (barwork.ts); 0 when she hasn't. */
  private faintLeft = 0;
  /** The trouble whose shout has been said out loud, so it's said once. */
  private shoutedTrouble: Trouble | null = null;
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
  /** W/S and E through whatever menu is up (keynav.ts). */
  private readonly keyNav: KeyNav;
  private readonly talkChoicesEl = element("talk-choices");
  private readonly customizeEl = element("customize");
  /** An 18+ moment the last answer led to, shown once the conversation closes. */
  private pendingAdult: AdultScene | null = null;
  /** Today as it opened: what the autosave holds. */
  checkpoint: TavernSave;
  /** Where she stood as today began, for the morning after to say what changed. */
  private dayStart: Standing | null = null;
  /** Just loaded a saved moment: guests already sitting are put straight in their seats, not walked in again. */
  private seatGuestsOnSight = false;
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
    this.keyNav = new KeyNav(input);
    this.bell = makeBell();
    this.bell.position.copy(BELL_SPOT);
    assets.props.add(this.bell);

    applyRetroLook(assets.male);
    applyRetroLook(assets.female);
    applyRetroLook(assets.props);

    this.houseView = new HouseView(world);
    // The stairs' handrail, the well's banister and the open doors upstairs block too (upstairs.ts).
    this.staticColliders = [...world.colliders, ...STAIRS_COLLIDERS];
    this.upstairs = new Upstairs(world.pieces);
    this.defaultLayout = emptyLayout(assets.furniture);
    this.plan = new HousePlan(cloneLayout(this.defaultLayout));
    this.nav = this.applyPlan();

    const dustSpots = findDustSpots(world.colliders, ROOM);
    const cobwebSpots = findCobwebSpots(world.colliders, ROOM);
    this.tavern = new Tavern(world.seats.length, world.seats.map((seat) => seat.table), dustSpots.length, cobwebSpots.length);
    this.tavern.touchSettings = readTouchSettings();
    // The brawl screen draws the guard meter (fightpanels.ts), so their swings wait on her timing (brawlaim.ts).
    this.tavern.guardMeter = true;
    this.messLayer = new MessLayer(world.seats, dustSpots, cobwebSpots);
    scene.add(this.messLayer.group);
    this.street = buildStreet(assets.streetKit ?? null);
    scene.add(this.street.root);
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
    this.battleView.onBlow = () => this.shakeScreen("hit");
    this.battleView.onPose = (pose) => this.pickFightFace(pose);
    this.foeColumn = new FoeColumn(this.renderer);
    this.touchComic = new TouchComic(
      renderer,
      (effect) => this.audio.play(effect),
      // The hand that reaches in is a male guest's of that kind, in their own sleeve.
      (kind) => this.makeGuestBody(kind, false).root,
      // For a kiss or her hand on him, the whole of him, undressed and ready.
      (kind) => this.duelPartnerBody(kind, false).root,
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
    this.targetOutlines.set(targetKey({ kind: "closet" }), outline([piece(CLOSET_NAME)]));
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
    scene.add(this.siblings[0].root, this.siblings[1].root, this.guestLayer, this.townLayer);

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
      open: (vulva, anus) => (this.openingPreview = { vulva, anus }),
      erect: (level) => (this.erectionPreview = level),
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
      edicts: () => this.edictViews(),
      staffBoard: () => this.staffBoard(),
      setPost: (id, post) => this.tavern.setPost(id, post),
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
    // At her closet the camera comes round in front of her, as on the customise screen.
    if (this.closetOpen) return this.customShot;
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
    if (this.screen === "build") return BUILD_ZOOM;
    // The street's houses are taller than the room's walls, so the camera stands further back out there.
    return this.outdoors ? STREET_ZOOM : 1;
  }

  /**
   * Where the camera holds in her rooms, the stair hall and upstairs (upstairs.ts roomViewAt), written into `out`; null in the
   * taproom and out of doors, where the follow camera goes by cameraLimits.
   */
  roomView(out: Vector3): Vector3 | null {
    if (this.outdoors || this.questMap) return null;
    return roomViewAt(this.focus, out);
  }

  /** How far the follow camera may go, so all of a bigger house can be seen. */
  get cameraLimits(): Rect {
    if (this.questMap) return this.questMap.cameraLimits;
    if (this.outdoors) return this.street.cameraLimits;
    if (isUpstairs(this.focus)) return UPSTAIRS_CAMERA_LIMITS;
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
    // The room's walls are the ones that count: she's indoors.
    this.outdoors = false;
    this.houseView.rebuild(this.plan);
    colliders.length = 0;
    colliders.push(...this.staticColliders, ...this.planColliders());
    if (this.bedroomDoorBlock) colliders.push(this.bedroomDoorBlock);
    colliders.push(...this.upstairsBlock);

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
      ["the stairs", BY_THE_STAIRS],
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
    writeSave("auto", this.active, this.checkpoint, this.looks, this.captureMoment());
  }

  /** This very moment, for a save: the time on the clock, where she stands, and the tavern as it is. */
  captureMoment(): Moment {
    const player = this.siblings[this.active];
    return {
      time: this.clock.time,
      // Saved out in the street, she loads just inside her own front door.
      at: this.outdoors
        ? { x: BACK_INSIDE.x, z: BACK_INSIDE.z, facing: Math.PI }
        : { x: player.position.x, z: player.position.z, facing: player.facing },
      dayStart: this.dayStart ? { ...this.dayStart } : null,
      ...this.tavern.captureMoment(),
    };
  }

  /** Saves this very moment, day or night, to a slot. False when the browser won't store it. */
  saveNow(slot: SlotId): boolean {
    return writeSave(slot, this.active, this.tavern.snapshot(), this.looks, this.captureMoment());
  }

  private makeItem(item: Item): Object3D {
    const copy = this.itemTemplates[item].clone(true);
    copy.traverse((object) => (object.castShadow = false));
    return copy;
  }

  /** Who a guest is to look at, as they rolled it walking in (Guest.look): 0 is their kind's plain look. */
  private guestLook(guest: { look: number }): number {
    return guest.look;
  }

  /**
   * A guest's body: their group's plain clothes, or the outfit their type wears (an archer's kit, a brute's
   * scarf, a maid's apron), in one of its colourings.
   */
  private makeGuestBody(kind: GuestKind | "visitor", female: boolean, look = 0, role?: GuestRole, dressed?: RecruitOutfit | null): Body {
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
    // Most come in modern clothes now (WORLD.md, section 2b); some keep their type's kit or their plain clothes.
    const stats = kind === "visitor" ? null : statsOf(kind, role);
    const own = stats ? guestModernOutfit(look, stats.modern.share, stats.modern.styles) ?? stats.outfit : null;
    // Their own skin, hair and eyes, when they rolled a look; their kind's hair when they didn't.
    const person = look > 0 ? guestPersonColors(look) : { [slots.hair]: hex(outfit.hair) };
    // Their own hairstyle too, from the same look.
    const hairstyle = guestHairstyle(body, look);
    if (dressed) {
      // A Warm House recruit (recruits.ts): the outfit their stage puts them in, in its colours.
      const preset = LOOK_OPTIONS[body].outfits.find((o) => o.id === dressed.id)?.preset ?? {};
      dressColors(model, body, { ...preset, ...dressed.colors, ...person }, dressed.id, undefined, hairstyle);
    } else if (own) {
      dressColors(model, body, { ...guestOutfitColors(body, own, look), ...person }, own, undefined, hairstyle);
    } else {
      const plain = PLAIN_CLOTHES[kind] ?? [];
      const clothes = look > 0 && plain.length > 0 ? plain[Math.floor(look / PLAIN_STEP) % plain.length] : outfit;
      dressColors(model, body, { [slots.top]: hex(clothes.top), [slots.legs]: hex(clothes.legs), ...person }, undefined, undefined, hairstyle);
    }
    return new Body(model, body);
  }

  /** Puts a sibling's look on them, and lets their walk and springs settle to the new shape. */
  private applyLook(index: number): void {
    this.dressers[index].apply(this.looks[BODY_NAMES[index]]);
    const dresser = this.dressers[index];
    this.siblings[index].refreshBody(
      dresser.legSize(), dresser.armSpread(), dresser.posture(), softHeft(this.looks[BODY_NAMES[index]].sliders),
    );
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

  /**
   * Her closet in the bedroom: the customise panel on its Clothes tab only, framed on her where she stands. Time
   * stops while she changes, as it does over the house plans.
   */
  private openCloset(): void {
    if (this.screen !== "play") return;
    this.audio.play("click");
    this.setPrompt("");
    this.targetArrow.show(null);
    this.highlight(null);
    this.closetOpen = true;
    this.chosen = this.active;
    this.screen = "customize";
    document.body.classList.add("dressing");
    this.siblings[this.active].face(Math.PI);
    const body = BODY_NAMES[this.active];
    this.customizer.open(body, this.looks[body], PLAYER_LABELS[this.active], true);
    this.aimCustomize("clothes", true);
  }

  /** Out of the closet in what she picked: the tavern takes on her new clothes, fully on, and the game is saved. */
  private closeCloset(): void {
    this.closetOpen = false;
    document.body.classList.remove("dressing");
    const look = this.looks[BODY_NAMES[this.active]];
    this.tavern.changeClothes(look.outfit, look.legwear, { bra: look.bra, briefs: look.briefs });
    this.strippedShown = "";
    this.syncStripped();
    this.screen = "play";
    this.checkpoint = this.tavern.snapshot();
    writeSave("auto", this.active, this.checkpoint, this.looks, this.captureMoment());
  }

  private closeCustomizer(): void {
    if (this.screen !== "customize") return;
    this.audio.play("click");
    storeLooks(this.looks);
    this.customizer.close();
    // Undressing is only for looking: everyone is dressed again on the way out.
    this.dressers.forEach((dresser) => dresser.setUndressed(false));
    this.dragX = null;
    if (this.closetOpen) {
      this.closeCloset();
      return;
    }
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
    // At her closet, framed where she stands; on the customise screen, where she steps forward to.
    const at = this.closetOpen ? this.siblings[this.chosen].position.clone() : this.spawnPoints[this.chosen].clone();
    if (!this.closetOpen) at.z += SELECT_STEP;
    const { eye, target } = this.customGoal;
    if (tab === "face" || tab === "hair") {
      // The head's height changes with the sliders, so it is measured each time.
      const top = this.hitBox.setFromObject(this.siblings[this.chosen].root).max.y;
      const head = top - 0.14;
      target.set(at.x + CUSTOMIZE_FACE_SHOT.side, head, at.z);
      eye.set(at.x + CUSTOMIZE_FACE_SHOT.side, head + 0.05, at.z + CUSTOMIZE_FACE_SHOT.distance);
    } else if (tab === "body" && devFlag("groin")) {
      const top = this.hitBox.setFromObject(this.siblings[this.chosen].root).max.y;
      const { side, share, distance } = CUSTOMIZE_GROIN_SHOT;
      const groin = top * share;
      target.set(at.x + side, groin, at.z);
      eye.set(at.x + side, groin + 0.05, at.z + distance);
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
    if (this.closetOpen) {
      // She stays where she stands at her closet.
      this.siblings[this.chosen].rest(dt);
    } else {
      const spot = this.spawnPoints[this.chosen].clone();
      spot.z += SELECT_STEP;
      this.siblings[this.chosen].stepTo(spot, dt);
    }
    const ease = 1 - Math.exp(-CUSTOMIZE_CAMERA_RATE * dt);
    this.customShot.eye.lerp(this.customGoal.eye, ease);
    this.customShot.target.lerp(this.customGoal.target, ease);
  }

  private syncGuests(dt: number): void {
    const { tavern, actors } = this;
    this.doorQueue = Math.max(0, this.doorQueue - dt);
    const seatOnSight = this.seatGuestsOnSight;
    this.seatGuestsOnSight = false;
    for (const guest of [...tavern.guests]) {
      let actor = actors.get(guest.id);
      if (!actor) {
        // Guests who turn up together (a party, or a backlog once a seat frees) file in one behind another.
        const wait = this.doorQueue;
        this.doorQueue += ENTRY_GAP_SECONDS;
        actor = new GuestActor(
          this.makeGuestBody(guest.kind, guest.female, this.guestLook(guest), guest.role, tavern.recruitOutfitOf(guest)),
          guest,
          this.world.seats[guest.seat],
          this.nav,
          ENTRANCE,
          (item) => this.makeItem(item),
          this.guestLayer,
          wait,
        );
        if (seatOnSight && guest.status !== "arriving") actor.seatNow();
        actors.set(guest.id, actor);
        this.guestLayer.add(actor.group);
      }
      // Off to a booking or a rented room: out by the stairs, not the front door.
      actor.exitWay = this.goingUpstairs(guest) ? UP_THE_STAIRS : null;
      if (actor.update(dt, tavern, this.focus)) {
        if (this.highlighted === targetKey({ kind: "guest", id: guest.id })) this.highlight(null);
        this.guestLayer.remove(actor.group);
        actors.delete(guest.id);
        tavern.guestLeft(guest.id);
        continue;
      }
      // Up the stairs, they climb the treads.
      if (actor.walking) actor.group.position.y = floorHeightAt(actor.group.position.x, actor.group.position.z);
    }
    this.syncComingDown(dt);
  }

  /** Whether a guest leaving goes up the stairs: to tonight's Lantern booking, or to a room they've taken. */
  private goingUpstairs(guest: Guest): boolean {
    if (this.tavern.lantern.booking?.guestId === guest.id) {
      if (!this.wentUp.has(guest.id)) {
        this.wentUp.set(guest.id, { kind: guest.kind, female: guest.female, look: this.guestLook(guest), role: guest.role });
      }
      return true;
    }
    return this.tavern.roomGuests.includes(guest.id);
  }

  /**
   * A booking that's over sends its guest back down: they appear at the top of the stairs, come down them, and go
   * out of the front door. Moves everyone on their way down.
   */
  private syncComingDown(dt: number): void {
    const booking = this.tavern.lantern.booking;
    const done = this.watchedBooking;
    this.watchedBooking = booking;
    if (done && done !== booking) this.sendDown(done);
    for (const walker of [...this.comingDown]) {
      if (walker.walk(dt)) {
        this.guestLayer.remove(walker.group);
        this.comingDown.splice(this.comingDown.indexOf(walker), 1);
        continue;
      }
      walker.group.position.y = floorHeightAt(walker.group.position.x, walker.group.position.z);
    }
  }

  private sendDown(booking: Booking): void {
    const seen = this.wentUp.get(booking.guestId);
    this.wentUp.delete(booking.guestId);
    const body = seen ? this.makeGuestBody(seen.kind, seen.female, seen.look, seen.role) : this.makeGuestBody(booking.kind, false);
    const walker = new Walker(body);
    const down = [...UP_THE_STAIRS].reverse();
    const doorstep = ENTRANCE[ENTRANCE.length - 1];
    const across = this.nav.findPath(down[down.length - 1], doorstep) ?? [doorstep];
    walker.setPath([...down, ...across, ...[...ENTRANCE].reverse()]);
    const top = down[0];
    walker.group.position.set(top.x, floorHeightAt(top.x, top.z), top.z);
    walker.face(Math.PI);
    this.comingDown.push(walker);
    this.guestLayer.add(walker.group);
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
    // The tub sparkles for a moment after a wash, and shows anything left in it overnight.
    const justWashed = performance.now() - tavern.washedAt < WASH_SPARKLE_MS;
    this.washIcon.show(justWashed ? "sparkle" : tavern.tub.length > 0 ? "dirty" : null);
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

    if (this.questMap) {
      const run = this.tavern.questRun;
      const map = this.questMap;
      consider({ kind: "street", place: "quest:exit", label: this.tavern.questAllDone ? "Head home with the job done" : "Give up and head home" }, map.exit, STATION_ARROW_HEIGHT, 1.8);
      run?.encounters.forEach((e, i) => {
        if (run.results[i]) return;
        const spawn = map.plan.spawns[i];
        if (spawn.kind === "spot") consider({ kind: "street", place: `quest:${i}`, label: e.kind === "check" ? `Look: ${e.text}` : `Decide: ${e.text}` }, map.spotOf(i), STATION_ARROW_HEIGHT, 2.2);
        if (spawn.kind === "people" && e.kind === "fight") consider({ kind: "street", place: `quest:${i}`, label: `Fight ${e.foe}` }, map.spotOf(i), GUEST_ARROW_HEIGHT, 2.6);
      });
      return best;
    }
    if (this.outdoors) {
      for (const spot of this.street.spots) {
        consider({ kind: "street", place: spot.place, label: spot.label }, spot.at, STATION_ARROW_HEIGHT, spot.range);
      }
      // Anyone out in the street can be stopped for a word.
      for (const person of this.townsfolk?.people() ?? []) {
        if (!person.visible) continue;
        consider({ kind: "street", place: `folk:${person.index}`, label: "Talk" }, person.position, GUEST_ARROW_HEIGHT, TOWNSFOLK_TALK_RANGE);
      }
      return best;
    }

    for (const station of STATIONS) {
      consider({ kind: "station", station }, this.spots[station], STATION_ARROW_HEIGHT, STATION_RANGE);
    }
    const trouble = this.tavern.trouble;
    for (const guest of this.tavern.guests) {
      // Someone up out of their seat and coming for her isn't there to be served.
      if (trouble?.guestId === guest.id && trouble.stage === "coming") continue;
      consider({ kind: "guest", id: guest.id }, this.world.seats[guest.seat].position, GUEST_ARROW_HEIGHT, GUEST_RANGE);
    }
    for (const mess of this.tavern.messes) {
      const spots = this.messLayer.spots(mess.id);
      if (spots.length === 0) continue;
      const nearest = spots.reduce((a, b) => (a.distanceToSquared(position) <= b.distanceToSquared(position) ? a : b));
      const [height, range] =
        mess.kind === "dishes"
          ? [STATION_ARROW_HEIGHT, DISHES_RANGE]
          : mess.kind === "cobweb"
            ? [COBWEB_ARROW_HEIGHT, COBWEB_RANGE]
            : [FLOOR_MESS_ARROW_HEIGHT, FLOOR_MESS_RANGE];
      consider({ kind: "mess", id: mess.id }, nearest, height, range);
    }
    consider({ kind: "bell" }, BELL_SPOT, STATION_ARROW_HEIGHT, STATION_RANGE);
    consider({ kind: "bed" }, BED_SPOT, BED_ARROW_HEIGHT, BED_RANGE);
    consider({ kind: "door" }, BEDROOM_DOOR_SPOT, STATION_ARROW_HEIGHT, BEDROOM_DOOR_RANGE);
    consider({ kind: "desk" }, DESK_SPOT, STATION_ARROW_HEIGHT, DESK_RANGE);
    consider({ kind: "book" }, JOURNAL_SPOT, JOURNAL_ARROW_HEIGHT, JOURNAL_RANGE);
    consider({ kind: "bath" }, BATH_SPOT, STATION_ARROW_HEIGHT, BATH_RANGE);
    consider({ kind: "closet" }, CLOSET_SPOT, STATION_ARROW_HEIGHT, CLOSET_RANGE);
    consider({ kind: "street", place: "out", label: "" }, FRONT_DOOR_SPOT, STATION_ARROW_HEIGHT, FRONT_DOOR_RANGE);
    return best;
  }

  /** Opens the front door for anyone walking up to it, and shuts it once they're through. */
  private updateFrontDoor(dt: number): void {
    const near = ({ x, z }: Vec2) => Math.hypot(x - FRONT_DOORWAY.x, z - FRONT_DOORWAY.z) < FRONT_DOOR_REACH;
    const wanted =
      (this.visitor !== null && this.visitorWalking && near(this.visitor.group.position)) ||
      [...this.actors.values()].some((actor) => actor.walking && near(actor.group.position)) ||
      this.comingDown.some((walker) => near(walker.group.position));
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

  /** Shows the Lantern's room as tonight has it, and keeps what it blocks among the world's colliders. */
  private updateUpstairs(dt: number): void {
    const { lantern } = this.tavern;
    if (!this.upstairs.update(dt, lantern.room, lantern.busy)) return;
    // Out of doors the room's walls aren't in the colliders; applyPlan puts these back on the way in.
    const { colliders } = this.world;
    if (!this.outdoors) {
      for (const rect of this.upstairsBlock) {
        const index = colliders.indexOf(rect);
        if (index >= 0) colliders.splice(index, 1);
      }
    }
    this.upstairsBlock = this.upstairs.blockers;
    if (!this.outdoors) colliders.push(...this.upstairsBlock);
  }

  /** Keeps her feet on the stairs as she climbs, and takes her up or down when she reaches the top. True as it fades. */
  private followStairs(player: Sibling, dt: number): boolean {
    if (this.outdoors) return false;
    const { position } = player;
    const floor = floorHeightAt(position.x, position.z);
    position.y += (floor - position.y) * (1 - Math.exp(-STAIR_STEP_RATE * dt));
    const goingUp = atTopOfStairs(position);
    if (!goingUp && !atTopOfWell(position)) return false;
    this.clearTarget();
    this.audio.play("step");
    this.fadeTo(() => {
      position.copy(goingUp ? LANDING : STAIRS_FOOT);
      player.face(goingUp ? LANDING_HEADING : STAIRS_FOOT_HEADING);
      this.screen = "play";
    });
    return true;
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

  /** Her state as her portrait was last drawn for it: see `updateHud`. */
  private herStateShown = "";

  private updateHud(): void {
    const { tavern } = this;
    this.stats.update({
      gold: tavern.gold,
      debt: tavern.owed,
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
    // Karryn's Prison style: her picture follows her state while she talks. Drunker, horny, wet, flushed: it's
    // drawn again, and the talk box shows the new one at once.
    const herState = `${drunkLabel(tavern.drunk)}|${horny(tavern.meters)}|${tavern.wet}|${Math.floor(this.arousalShown * 4)}`;
    if (herState !== this.herStateShown) {
      this.herStateShown = herState;
      if (tavern.inConversation) this.playerPortrait = null;
    }
    this.playerPortrait ??= renderPortrait(this.renderer, this.siblings[this.active].root, -SPRITE_TURN);
    this.dialogue.setYou(this.playerPortrait);
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
      tableProgress: tavern.tableProgress,
      lewdness: Math.floor(tavern.lewdness),
      corruption: Math.floor(tavern.corruption),
      energy: tavern.energy,
      energyMax: tavern.maxEnergy,
      fatigueLabel: FATIGUE_LABELS[tavern.fatigueLevel] ?? "",
    });
  }

  /** The world clock in the corner: the time, the sun or moon, the day, and whether the tavern is open. */
  private updateClock(): void {
    const { hour } = this.clock;
    const time = formatHour(hour);
    if (this.clockTimeEl.textContent !== time) this.clockTimeEl.textContent = time;
    const day = `Day ${this.tavern.nightIndex + 1} · ${PHASE_LABELS[this.tavern.phase]}`;
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
      this.toasts.show(passiveToast(def));
      this.narrator.moment(`She has changed: she is now known for "${def.name}" (${def.benefit}).`, "passive");
      // A page turning: it's gone in her journal.
      this.audio.play("page");
    }
    for (const gain of this.tavern.takeGains()) {
      if (gain.kind === "level") {
        this.log.add(`${gain.name} is now level ${gain.level}.`);
        this.toasts.show({
          tone: "level",
          tag: "Level up",
          title: `${gain.name} ${gain.level}`,
          lines: [levelLine(gain.id)],
          icon: PASSIVE_ICONS[groupOfSkill(gain.id)],
        });
      } else if (gain.kind === "rank") {
        const slut = gain.which === "slut";
        this.log.add(slut ? `Slut Level ${gain.level}: ${gain.word}.` : `She's Level ${gain.level} now.`);
        this.toasts.show({
          tone: slut ? "kink" : "level",
          tag: slut ? "Slut Level up" : "Level up",
          title: slut ? `Slut Level ${gain.level} · ${gain.word}` : `Level ${gain.level}`,
          lines: slut
            ? ["+ Touches you allow pay more", "- Guests grow bolder with what they've heard"]
            : ["+ More willpower, more stamina in a brawl, and a little more on everything you're paid"],
          icon: PASSIVE_ICONS[slut ? "desire" : "mind"],
        });
        this.audio.play("page");
      } else if (gain.kind === "title") {
        const def = TITLE_BY_ID.get(gain.id);
        if (!def) continue;
        const bonus = bonusText(def.bonus);
        this.log.add(`New title: ${def.name}. Wear it from the journal while the tavern's shut.`);
        this.toasts.show({
          tone: "passive",
          tag: "New title",
          title: def.name,
          lines: [...(bonus ? [`+ ${bonus} now`] : []), `+ Worn: ${def.worn}`, ...(def.cost ? [`- ${def.cost}`] : []), "Put it on in the journal's Titles tab."],
          icon: PASSIVE_ICONS.fame,
        });
        this.audio.play("page");
      } else if (gain.kind === "debuff") {
        // Something gone badly, Karryn-style: not the end, but she carries it for a while.
        const def = DEBUFFS[gain.id];
        const lasts = def.nights === 0 ? "Until it's put right." : `For ${def.nights === 1 ? "tonight" : `${def.nights} nights`}.`;
        this.log.add(`${def.name}${gain.level > 1 ? ` (${gain.level})` : ""}: ${def.cause.toLowerCase()}.`);
        this.toasts.show({
          tone: "debuff",
          tag: gain.level > 1 ? "Debuff worse" : "Debuff",
          title: gain.level > 1 ? `${def.name} ${gain.level}` : def.name,
          lines: [...def.detail(gain.level).split(" · ").map((line) => `- ${line}`), lasts],
        });
      } else {
        this.log.add(`Her kink is now ${KINK_NAMES[gain.to]}.`);
        this.toasts.show({
          tone: "kink",
          tag: "Her kink changed",
          title: `${KINK_NAMES[gain.from]} → ${KINK_NAMES[gain.to]}`,
          lines: ["How she and the guests talk after the Consent check follows it now."],
          icon: gain.to === "plain" ? undefined : PASSIVE_ICONS[gain.to],
        });
      }
    }
    this.toasts.update(dt);
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
    this.panelEl.classList.remove("journal-open", "adult-open", "fight-open", "duel-open", "duel-test-open", "dawn-open");
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
        // A story card's title (tropes.ts `cardTitle`) reads as a heading over its lines.
        if (isCardTitle(text)) paragraph.className = "card-title";
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
      el.append(key);
      if (button.icon) {
        const icon = document.createElement("span");
        icon.className = "icon";
        icon.innerHTML = button.icon;
        el.append(icon);
      }
      el.append(label);
      if (button.save) {
        el.append(saveBadges(button.save, PLAYER_LABELS));
        // The icons say it in pictures; screen readers get the words.
        el.setAttribute("aria-label", `${button.label}: ${describeSave(button.save, PLAYER_LABELS)}`);
      }
      el.disabled = Boolean(button.disabled);
      el.addEventListener("click", () => this.pressButton(button));
      if (button.onCursor) el.addEventListener(CURSOR_EVENT, button.onCursor);
      if (button.start) el.dataset[CURSOR_START] = "";
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
    this.panelEl.classList.remove("open", "journal-open", "adult-open", "fight-open", "duel-open", "duel-test-open", "dawn-open");
    this.panelEl.replaceChildren();
    this.panelButtons = [];
    this.panelBack = null;
  }

  /**
   * Where the keyboard's menu cursor works this frame (keynav.ts): the open menu board, her talk's choices once
   * they're up, or the customizer. In the room, W/S walk instead.
   */
  private navRoot(): HTMLElement | null {
    switch (this.screen) {
      case "panel":
      case "title":
      case "paused":
        return this.panelEl;
      case "talk":
        return this.dialogue.choosing ? this.talkChoicesEl : null;
      case "customize":
        return this.customizeEl;
      default:
        return null;
    }
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

  /** A number picks its button. W/S and E work every menu, this one included (keynav.ts, run from update). */
  private handlePanelKeys(): void {
    const buttons = this.panelButtons;
    const pick = buttons.findIndex((_, index) => this.input.pressed(`Digit${index + 1}`));
    if (pick >= 0 && !buttons[pick].disabled) this.pressButton(buttons[pick]);
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
      `Day ${day + 1}`,
      dayStory({
        day,
        gold: tavern.gold,
        debt: tavern.owed,
        promised: tavern.bookPromised,
        fans: tavern.fans,
        rank: tavern.rank,
        above: tavern.houseAbove,
        trust: tavern.trust,
        trustMax: TRUST_MAX,
        trustToRise: TRUST_TO_OVERTHROW,
        heat: tavern.heat,
        heatMax: HEAT_MAX,
        messes: tavern.messes.length,
        cobwebs: tavern.messes.filter((mess) => mess.kind === "cobweb").length,
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
    const rows = statusLines(now, before, { debt: this.tavern.owed, trustMax: TRUST_MAX, heatMax: HEAT_MAX }, { gold: COIN, trust: VILLAGERS, heat: FLAME });
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
      for (const walker of this.comingDown) this.guestLayer.remove(walker.group);
      this.comingDown.length = 0;
      this.wentUp.clear();
      this.doorQueue = 0;
      this.chatter.reset();
      this.tavern.restore(data.tavern);
      // A save of the very moment puts the day (or night) back as it stood on top; a broken one opens its day.
      let moment = data.moment ?? null;
      if (moment) {
        try {
          this.tavern.resumeMoment(moment);
        } catch {
          this.tavern.restore(data.tavern);
          moment = null;
        }
      }
      // Nobody's on the stairs in a loaded game, and no booking that was running ends with a guest coming down.
      this.tavern.roomGuests = [];
      this.watchedBooking = this.tavern.lantern.booking;
      this.plan = new HousePlan(cloneLayout(data.tavern.layout ?? this.defaultLayout));
      this.nav = this.applyPlan();
      this.tavern.setSeats(this.world.seats.map((seat) => seat.table));
      // A save made as someone no longer playable opens as the first playable sibling.
      this.active = isPlayable(data.active) ? data.active : PLAYABLE[0];
      this.chosen = this.active;
      // Always the saved looks, never whatever was last on screen; saves from before customising load as built.
      this.looks = data.looks ?? startLooks();
      this.siblings.forEach((_, index) => this.applyLook(index));
      // Nothing the last character had on (or off) tonight carries over to the loaded one.
      this.strippedShown = "";
      this.syncStripped();
      this.coatShown = "";
      this.syncCoat();
      this.playerPortrait = null;
      this.log.clear();
      this.narrator.clear();
      this.enterTavern(moment);
    });
  }

  /** Back to the very moment a save was made: the clock where it was, she where she stood, the guests sat down. */
  private resumeMoment(moment: Moment): void {
    this.closePanel();
    this.screen = "play";
    const day = Math.floor(moment.time / 24);
    this.clock.setTime(day, moment.time - day * 24);
    // The day runs on to the late afternoon; a bell just rung takes the sun down; the night holds where it is.
    const { phase } = this.tavern;
    if (phase === "day" && this.clock.hour < AFTERNOON_HOLD_HOUR) this.clock.run(DAY_HOURS_PER_SECOND, AFTERNOON_HOLD_HOUR);
    else if (phase === "dusk") this.clock.transitionTo(NIGHT_HOUR, SUNSET_SECONDS);
    const player = this.siblings[this.active];
    const clear = resolveCircle({ x: moment.at.x, z: moment.at.z }, SIBLING_RADIUS, this.world.colliders, 8);
    player.position.setX(clear.x).setZ(clear.z);
    player.face(moment.at.facing);
    this.checkpoint = this.tavern.snapshot();
    this.dayStart = moment.dayStart;
    this.seatGuestsOnSight = true;
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
  /** A place on the high street, or the front door between it and the tavern (street.ts, TOWN_DAY.md). */
  private useStreet(place: string): void {
    if (place.startsWith("quest:")) {
      this.clearTarget();
      this.useQuestSpot(place.slice(6));
      return;
    }
    if (place === "out") {
      this.goOutside();
      return;
    }
    if (place.startsWith("folk:")) {
      this.streetTalk?.talkTo(Number(place.slice(5)), this.townFacts());
      return;
    }
    if (place === "home") {
      this.goInside();
      return;
    }
    if (place === "market") {
      this.clearTarget();
      this.openMarket();
      return;
    }
    if (isTownPlace(place)) {
      this.clearTarget();
      this.openTownPlace(place);
      return;
    }
    const info = STREET_PLACES[place];
    if (!info) return;
    this.clearTarget();
    this.openPanel(info.title, info.text, [
      {
        label: "Back to the street",
        onPick: () => {
          this.closePanel();
          this.screen = "play";
        },
      },
    ]);
  }

  /** The day's errand clock (TOWN_DAY.md §2): moves the hour on by what an errand took, never past five. */
  private spendHours(hours: number): void {
    const hour = Math.min(AFTERNOON_HOLD_HOUR, this.clock.hour + hours);
    this.clock.setTime(this.tavern.nightIndex, hour);
    if (hour < AFTERNOON_HOLD_HOUR) this.clock.run(DAY_HOURS_PER_SECOND, AFTERNOON_HOLD_HOUR);
  }

  /**
   * The market square (errands.ts, TOWN_DAY.md build step 2): cups and dishes cheaper than the cart, flyers, and a
   * post on the feed. Each costs time; after five the stalls are packing up.
   */
  private openMarket(note?: string): void {
    const tavern = this.tavern;
    const closed = this.clock.hour >= ERRANDS_CLOSE_HOUR;
    const pack = marketPackCost(tavern.silasCrossed);
    const fix = marketReplaceCost(tavern.silasCrossed);
    const wares = Object.keys(WARE_NAMES) as Ware[];
    const after = (hours: number, done: () => string | void) => () => {
      const line = done();
      this.spendHours(hours);
      this.openMarket(line || undefined);
    };
    const text = [...STREET_PLACES.market.text];
    if (tavern.silasCrossed) text.push("Half the stalls belong to Silas's cousins. Their prices went up the day you crossed him.");
    text.push(
      closed
        ? "It's past five: the stalls are packing up and the square is emptying. Head home and ring the bell."
        : `${formatHour(this.clock.hour)}. You have ${tavern.gold} gold. Everything here takes time.`,
    );
    if (note) text.push(note);
    const buttons: Button[] = [
      ...wares.map((ware) => ({
        label: `${STOCK_PACK} ${WARE_NAMES[ware]}: ${pack} gold (the cart wants ${STOCK_COST}), half an hour (${tavern.stock[ware]}/${MAX_WARE[ware]})`,
        disabled: closed || !tavern.canMarketBuy(ware),
        onPick: after(MARKET_HOURS, () => tavern.marketBuy(ware)),
      })),
      ...wares
        .filter((ware) => tavern.broken[ware] > 0)
        .map((ware) => ({
          label: `Replace a broken ${WARE_NAMES[ware].replace(/e?s$/, "")}: ${fix} gold, half an hour (${tavern.broken[ware]} broken)`,
          disabled: closed || !tavern.canMarketReplace(ware),
          onPick: after(MARKET_HOURS, () => tavern.marketReplace(ware)),
        })),
      {
        label: tavern.flyeredToday ? "Hand out flyers (done today)" : `Hand out flyers by the market cross: ${FLYER_COST} gold, an hour and a half`,
        disabled: closed || !tavern.canHandOutFlyers(),
        onPick: after(FLYER_HOURS, () => {
          const facts = this.townFacts();
          const result = tavern.runErrand("flyers", { dress: facts.dress, outfit: facts.outfit });
          if (result) this.log.add(result.line);
          return result?.line;
        }),
      },
      {
        label: tavern.postedToday ? "Post on the town feed (done today)" : `Post tonight's menu on the town feed: ${FEED_COST} gold, a quarter of an hour (Pell reads it)`,
        disabled: closed || !tavern.canPostOnFeed(),
        onPick: after(FEED_HOURS, () => {
          const result = tavern.runErrand("feed");
          if (result) this.log.add(result.line);
          return result?.line;
        }),
      },
      {
        label: "Back to the street",
        onPick: () => {
          this.closePanel();
          this.screen = "play";
        },
      },
    ];
    this.openPanel(STREET_PLACES.market.title, text, buttons);
  }

  /**
   * A place in town (townplaces.ts, TOWN_DAY.md v1): what she sees, and what she can do there, each once a day, each
   * costing hours. What it did goes in the log and under the place's words.
   */
  private openTownPlace(place: TownPlaceId, note?: string): void {
    const tavern = this.tavern;
    const info = TOWN_PLACES[place];
    const hoursLeft = ERRANDS_CLOSE_HOUR - this.clock.hour;
    const text = [...info.describe(tavern.townState)];
    text.push(
      hoursLeft <= 0
        ? "It's past five. Whatever this is, it'll keep till tomorrow: head home and ring the bell."
        : `${formatHour(this.clock.hour)}. You have ${tavern.gold} gold.`,
    );
    if (note) text.push(note);
    const state = tavern.townState;
    const buttons: Button[] = info.actions.filter((action) => !action.hidden?.(state)).map((action) => {
      const why = tavern.townBlocked(place, action.id, hoursLeft);
      return {
        label: `${action.label}: ${costLabel(action)}${why ? ` (${why})` : ""}`,
        disabled: why !== null,
        onPick: () => {
          const outcome = tavern.doTownAction(place, action.id, hoursLeft);
          if (!outcome) return;
          this.log.add(outcome.line);
          this.spendHours(action.hours);
          this.openTownPlace(place, outcome.line);
        },
      };
    });
    // The Reeve's board hangs on the cross (townhall.ts).
    if (place === "townhall" && tavern.politics.reeve) buttons.push({ label: "The Law board", onPick: () => showLaws(this, () => this.openTownPlace(place)) });
    buttons.push({
      label: "Back to the street",
      onPick: () => {
        this.closePanel();
        this.screen = "play";
      },
    });
    this.openPanel(info.title, text, buttons);
  }

  /** One of the townsfolk: every kind of person in Tarven, men and women, each with a look of their own. */
  private townBody(index: number): Body {
    const { kind, female } = townPerson(index);
    return this.makeGuestBody(kind, female, 1 + index * 3);
  }

  /** Everything about her the town's talk reads (towntalk.ts), from where the game keeps it. */
  private townFacts(): TownFacts {
    const tavern = this.tavern;
    const body = tavern.playerBody === "Female" ? "Female" : "Male";
    const ladder = stripLadder(tavern.playerBody, tavern.playerOutfit, tavern.playerLegwear, tavern.playerUnder);
    return {
      body,
      arc: tavern.arcStage,
      lewdness: tavern.lewdness,
      corruption: tavern.corruption,
      respect: tavern.persona.respect,
      fame: tavern.persona.fame,
      flirt: tavern.persona.flirt,
      lust: tavern.persona.lust,
      desire: Math.max(...METERS.map((m) => tavern.meters[m])),
      drunk: tavern.drunk,
      willpower: tavern.maxWillpower > 0 ? tavern.willpower / tavern.maxWillpower : 1,
      passives: tavern.passives,
      titles: tavern.worn,
      debuffs: tavern.debuffs.map((d) => d.id),
      messy: tavern.messy,
      stained: tavern.messy,
      smellsOfSex: tavern.messy || tavern.wet,
      dress: dressOf(ladder, tavern.shownPieces),
      outfit: outfitStyleOf(tavern.playerOutfit),
      hour: this.clock.hour,
      day: tavern.nightIndex,
      fans: tavern.fans,
      trust: tavern.trust,
      heat: tavern.heat,
      lantern: tavern.lantern.lit ? "lit" : tavern.lantern.hung ? "dark" : "none",
      plot: tavern.plotFlags,
      // Her standing (TOWN_DAY.md 6.1): the garrison, the Warm House, the Lantern, the guild (Tavern.herRole).
      role: tavern.herRole,
      // The laws she's passed (townhall.ts), for the street's talk about them.
      laws: tavern.politics.reeve ? { freeUse: tavern.politics.laws.freeUse, publicAffection: tavern.politics.laws.publicAffection, dressCode: tavern.politics.laws.dressCode } : undefined,
      consentOff: tavern.consentOff,
    };
  }

  /** A heat moment in the street has played out (towntalk.ts): what it does to her, and a line for the log. */
  private applyHeat(moment: HeatMoment): void {
    const tavern = this.tavern;
    const { respect = 0, fame = 0, lust = 0, desire = 0 } = moment.effects;
    shiftPersona(tavern.persona, { respect, fame, lust });
    if (desire) {
      const meter = tavern.playerBody === "Female" ? "pussy" : "cock";
      tavern.meters[meter] = MathUtils.clamp(tavern.meters[meter] + desire, 0, tavern.desireCap(meter));
    }
    this.log.add(moment.summary);
    // moment.offer ("kiss" | "touch" | "tonight" | "alley" | "upstairs") is the hook for a scene later.
  }

  // ---------- A quest's map (questfield.ts, questmap.ts, ADVENTURERS_GUILD.md) ----------

  /** Sets out on her accepted quest (from the guild's menu): a fresh map for it, and her at its start. */
  startQuestField(): boolean {
    const run = this.tavern.guildSetOut();
    if (!run) return false;
    this.closePanel();
    this.clearTarget();
    this.audio.play("doorOpen");
    this.fadeTo(() => {
      this.questFrom = this.outdoors ? "street" : "inside";
      const map = new QuestMap(run.plan);
      this.questMap = map;
      this.questMonsters = map.monsterLayer();
      this.townLayer.add(map.root, this.questMonsters);
      // People waiting on the road for a brawl: standing in their clearing, facing the way she'll come.
      this.questFoes = [];
      run.plan.spawns.forEach((spawn) => {
        if (spawn.kind !== "people") return;
        const e = run.encounters[spawn.encounter];
        if (e.kind !== "fight") return;
        const kind = e.brawlKind ?? "bandit";
        const walker = new Walker(this.makeGuestBody(kind, false, 7 + spawn.encounter * 5));
        walker.group.position.copy(map.spotOf(spawn.encounter));
        walker.face(Math.PI);
        this.questMonsters?.add(walker.group);
        this.questFoes.push({ walker, encounter: spawn.encounter });
      });
      this.outdoors = true;
      this.questToldDone = false;
      this.questBrawlers.clear();
      const { colliders } = this.world;
      colliders.length = 0;
      colliders.push(...map.colliders);
      const player = this.siblings[this.active];
      player.position.setX(map.start.x).setZ(map.start.z);
      player.face(map.startHeading);
      this.questHud.classList.add("on");
      this.screen = "play";
      this.log.add(`${run.quest.title}: ${run.quest.blurb} Whatever reaches you, you brawl. The signpost behind you is the way home.`);
    });
    return true;
  }

  /**
   * A frame out on the quest's map: the monsters (one that reaches her starts the brawl with its pack), brawls
   * settled (beaten packs go down, a pack that beat her leaves her be), the people waiting turned toward her, and
   * the bar. True when it's taken the screen (she's gone down, or the job's done and she's asked about going home).
   */
  private updateQuestField(dt: number): boolean {
    const map = this.questMap;
    const tavern = this.tavern;
    const run = tavern.questRun;
    if (!map || !run) return false;
    const her = this.siblings[this.active].position;

    // How each brawl came out, on the map.
    run.plan.spawns.forEach((spawn) => {
      const r = run.results[spawn.encounter];
      if (spawn.kind !== "monsters" || !r) return;
      for (const m of map.monsters) {
        if (m.encounter !== spawn.encounter) continue;
        if (r.passed) m.defeat();
        else m.calm();
      }
    });

    // A monster's reached her: the brawl, it and its pack.
    const reached = tavern.fight ? null : map.update(dt, her);
    if (reached && !run.collapsed) {
      const pack = map.pack(reached.encounter, reached);
      if (tavern.questMonsterBrawl(reached.encounter, pack.map((m) => m.spec))) {
        this.questBrawlers.clear();
        pack.forEach((m, i) => this.questBrawlers.set(questMonsterId(i), m.portrait()));
        this.clearTarget();
        return false;
      }
    }
    for (const foe of this.questFoes) {
      const at = foe.walker.group.position;
      foe.walker.turnTo(Math.atan2(-(her.x - at.x), -(her.z - at.z)), dt);
      foe.walker.settle(dt);
      // Beaten people leave the road.
      if (run.results[foe.encounter]) foe.walker.group.visible = false;
    }

    // A clearing with nothing left standing in it is won.
    for (let i = 0; i < run.results.length; i++) if (run.results[i]) map.markDone(i);
    this.drawQuestHud();

    if (run.collapsed) {
      this.clearTarget();
      const taken = run.captured;
      this.openPanel(
        taken ? "Left on the road" : "Out on your feet",
        [
          taken
            ? `${taken.by.charAt(0).toUpperCase()}${taken.by.slice(1)} leave you where you lie, and take the loot with them. Your party finds you and gets you home to Tarven.`
            : "Everything goes grey. The last thing you see is the sky, and then your party's boots. They carry you home to Tarven.",
        ],
        [{ label: "Home to Tarven", onPick: () => this.endQuestField() }],
      );
      this.panelBack = () => this.endQuestField();
      return true;
    }
    if (tavern.questAllDone && !this.questToldDone) {
      this.questToldDone = true;
      this.clearTarget();
      const stay = () => {
        this.closePanel();
        this.screen = "play";
        this.log.add("The job's done. The signpost where you came in is the way home.");
      };
      this.openPanel("The job's done", [`${run.quest.title}: everything here is settled.`, `Stamina ${run.stamina}/${run.maxStamina}. ${run.kills} monster${run.kills === 1 ? "" : "s"} down (+${Math.round(run.xp)} XP).`], [
        { label: "Head home and collect", onPick: () => this.endQuestField() },
        { label: "Stay a while", onPick: stay },
      ]);
      this.panelBack = stay;
      return true;
    }
    return false;
  }

  /** The quest's bar: the quest, her stamina, monsters left, and the last one she hit. */
  private drawQuestHud(): void {
    const run = this.tavern.questRun;
    if (!run || !this.questMap) return;
    const left = this.questMap.monsters.filter((m) => m.alive && m.state !== "calm").length;
    const parts = [
      `<b>${run.quest.title}</b>`,
      `Stamina ${run.stamina}/${run.maxStamina}`,
      `Monsters ${left}`,
      `Done ${run.results.filter((r) => r).length}/${run.results.length}`,
    ];
    parts.push("<i>Shift to run from them</i>");
    this.questHud.innerHTML = parts.join(" · ");
  }

  /** Something in a clearing she walked up to: a check, a choice, people to brawl, or the way home. */
  private useQuestSpot(what: string): void {
    const tavern = this.tavern;
    const run = tavern.questRun;
    if (!run) return;
    const back = () => {
      this.closePanel();
      this.screen = "play";
    };
    if (what === "exit") {
      const done = tavern.questAllDone;
      this.openPanel(
        done ? "Home" : "Give up?",
        [done ? "The job's done. Back to Tarven to collect." : "Head home now and the quest counts as failed where it isn't done."],
        [
          { label: done ? "Head home" : "Give up and head home", onPick: () => this.endQuestField() },
          { label: "Stay", onPick: back },
        ],
      );
      this.panelBack = back;
      return;
    }
    const i = Number(what);
    const e = run.encounters[i];
    if (!e || run.results[i]) return;
    const settled = (r: { text: string } | null) => {
      if (!r) return back();
      this.questMap?.markDone(i);
      this.openPanel(e.kind === "check" ? "Done" : "Decided", [r.text], [{ label: "On", onPick: back }]);
      this.panelBack = back;
    };
    const brawl = (optionId?: string) => {
      if (tavern.questBrawl(i, optionId)) {
        this.closePanel();
        this.screen = "play";
      } else back();
    };
    if (e.kind === "fight") {
      brawl();
      return;
    }
    const roleHelp = (role: string) => {
      const g = tavern.guild;
      const c = g?.party.filter((p) => p.role === role).sort((a, b) => b.skill - a.skill)[0];
      return c ? ` + ${c.name}` : "";
    };
    if (e.kind === "check") {
      this.openPanel(run.quest.title, [e.text], [
        { label: `Try it (${e.stat}${roleHelp(e.role)})`, onPick: () => settled(tavern.questDecide(i)) },
        { label: "Not yet", onPick: back },
      ]);
      this.panelBack = back;
      return;
    }
    this.openPanel(
      run.quest.title,
      [e.text],
      [
        ...e.options.map((o) => ({
          label: `${o.label}${o.fight ? " (a brawl)" : o.stat ? ` (${o.stat}${roleHelp(o.role ?? "scout")})` : ""}${o.gold ? ` (${o.gold > 0 ? "+" : ""}${o.gold} gold)` : ""}`,
          onPick: () => (o.fight ? brawl(o.id) : settled(tavern.questDecide(i, o.id))),
        })),
        { label: "Not yet", onPick: back },
      ],
    );
    this.panelBack = back;
  }

  /** Home from the quest: settled with the guild, the map taken down, the hours gone, and what came of it. */
  private endQuestField(): void {
    const quest = this.tavern.questRun?.quest;
    const res = this.tavern.questFinish();
    this.closePanel();
    this.fadeTo(() => {
      if (this.questMap) this.townLayer.remove(this.questMap.root);
      if (this.questMonsters) this.townLayer.remove(this.questMonsters);
      this.questMap = null;
      this.questMonsters = null;
      this.questFoes = [];
      this.questBrawlers.clear();
      this.questHud.classList.remove("on");
      const player = this.siblings[this.active];
      // Beaten, she's carried home through her own door; otherwise she walks back the way she went out.
      if (this.questFrom === "street" && res?.outcome !== "fail") {
        const { colliders } = this.world;
        colliders.length = 0;
        colliders.push(...this.street.colliders);
        player.position.setX(this.street.spawn.x).setZ(this.street.spawn.z);
        player.face(this.street.spawnHeading);
      } else {
        this.outdoors = false;
        this.nav = this.applyPlan();
        const clear = resolveCircle(BACK_INSIDE, SIBLING_RADIUS, this.world.colliders, 8);
        player.position.setX(clear.x).setZ(clear.z);
        player.face(Math.PI);
      }
      if (quest) this.spendHours(quest.hours);
      if (!res) {
        this.screen = "play";
        return;
      }
      const title = { success: "Quest done", partial: "Half done", fail: "Quest failed" }[res.outcome];
      const lines = [
        `${quest?.title ?? ""}: ${res.gold >= 0 ? "+" : ""}${res.gold} gold, ${res.points >= 0 ? "+" : ""}${res.points} guild points, +${res.fans} fans.`,
        ...(res.loot.length ? [`Loot: ${res.loot.join(", ")}.`] : []),
        ...(res.injuries.length ? [`Hurt: ${res.injuries.map((i) => i.who === "her" ? "you" : i.who).join(", ")}.`] : []),
        ...(res.captured ? [`${res.captured.by} took you. Your party got you out by morning, without the loot.`] : []),
      ];
      const back = () => {
        this.closePanel();
        this.screen = "play";
      };
      this.openPanel(title, lines, [{ label: "On", onPick: back }]);
      this.panelBack = back;
    });
  }

  /** Out of the front door onto the high street, for the rest of the day. */
  private goOutside(): void {
    this.clearTarget();
    this.audio.play("doorOpen");
    this.fadeTo(() => {
      this.outdoors = true;
      if (!this.townsfolk) {
        const { activities, doors, colliders, walkable } = this.street;
        this.townsfolk = new Townsfolk(activities, doors, colliders, walkable, (index) => this.townBody(index));
        this.townLayer.add(this.townsfolk.group);
        const chatPairs = activities.flatMap((a, i) => (a.pair !== undefined && i < a.pair ? [[i, a.pair] as const] : []));
        this.streetTalk = new StreetTalk(townPerson, chatPairs, (thought) => this.log.add(thought));
        this.streetTalk.onHeat = (moment) => this.applyHeat(moment);
        // What's done with a word (a photo, a yes, a hand) counts for something (beingseen.ts).
        this.streetTalk.onAct = (_index, act, answer) => {
          // Under the Free use law her no still counts (TOWN_DAY.md 6.3), and costs her with the devotees.
          if (act === "proposition" && answer === "no" && this.tavern.lawEffects.freeUse > 0) {
            this.tavern.refusedUnderFreeUse();
            this.log.add("(The devotees by the well tut. Under your own law, a no costs you a little.)");
          }
          const effect = actEffect(act, answer, this.seenFacts(), this.tavern.random());
          if (effect) this.applySeen(effect);
        };
      }
      this.streetReminders = this.clock.hour >= STREET_REMIND_HOUR ? 1 : 0;
      // The street's walls take the room's place until she comes back in.
      const { colliders } = this.world;
      colliders.length = 0;
      colliders.push(...this.street.colliders);
      const player = this.siblings[this.active];
      player.position.setX(this.street.spawn.x).setZ(this.street.spawn.z);
      player.face(this.street.spawnHeading);
      this.screen = "play";
      this.log.add(`Out on Tarven's high street. It's ${formatHour(this.clock.hour)}: be back to ring the bell by five.`);
      // Out before noon still wearing last night: the walk of shame (beingseen.ts).
      const shame = walkOfShame(this.seenFacts(), this.tavern.random());
      if (shame) {
        this.applySeen(shame.effect);
        this.openPanel(shame.title, [...shame.lines], [
          {
            label: "Keep walking",
            onPick: () => {
              this.closePanel();
              this.screen = "play";
            },
          },
        ]);
      }
      this.seenCheck = 2;
    });
  }

  /** What the street sees of her, for beingseen.ts: her stage, what she's out in, last night on her, the hour. */
  private seenFacts(): SeenFacts {
    const facts = this.townFacts();
    const law = this.tavern.lawEffects;
    return {
      arc: facts.arc,
      dress: facts.dress,
      outfit: facts.outfit,
      messy: facts.messy,
      hour: this.clock.hour,
      today: this.tavern.townDoneToday,
      exposureRespect: law.exposureRespect,
      bareLegal: law.bareLegal,
    };
  }

  /** The town has seen her: the tavern applies it, and the log says so. */
  private applySeen(effect: SeenEffect): void {
    if (this.tavern.townDoneToday.has(effect.mark)) return;
    this.tavern.beSeen(effect);
    if (effect.line) this.log.add(effect.line);
  }

  /** Back in through the front door, standing just inside it. */
  private goInside(): void {
    this.clearTarget();
    this.audio.play("doorClose");
    this.streetTalk?.clear();
    this.fadeTo(() => {
      this.nav = this.applyPlan();
      const player = this.siblings[this.active];
      const clear = resolveCircle(BACK_INSIDE, SIBLING_RADIUS, this.world.colliders, 8);
      player.position.setX(clear.x).setZ(clear.z);
      player.face(Math.PI);
      this.screen = "play";
    });
  }

  /** Out in the street, a nudge at four and at five that the tavern needs opening. */
  private remindToHeadHome(): void {
    if (!this.outdoors) return;
    const hour = this.clock.hour;
    if (this.streetReminders < 1 && hour >= STREET_REMIND_HOUR) {
      this.streetReminders = 1;
      this.log.add("The chapel bell rings four. An hour until the tavern should open.");
    }
    if (this.streetReminders < 2 && hour >= AFTERNOON_HOLD_HOUR - 0.01) {
      this.streetReminders = 2;
      this.log.add("Five o'clock. The tavern won't open itself: head home and ring the bell.");
    }
  }

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
    // A new game: the tavern she walks into has stood shut since Grandma died.
    this.tavern.settleIn();
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

  /** Into the tavern: at the start of a day, with its card, or (loading a saved moment) right where it was saved. */
  private enterTavern(moment: Moment | null = null): void {
    this.staging = false;
    this.tavern.playerBody = this.active === 1 ? "Female" : "Male";
    this.tavern.playerOutfit = this.looks[this.tavern.playerBody].outfit;
    this.tavern.playerLegwear = this.looks[this.tavern.playerBody].legwear;
    const { bra, briefs } = this.looks[this.tavern.playerBody];
    this.tavern.playerUnder = { bra, briefs };
    document.body.classList.remove("staging");
    // Only the character the player picked works the night; the other stays out of the game.
    this.siblings.forEach((sibling, index) => {
      sibling.position.copy(this.spawnPoints[index]);
      sibling.root.visible = index === this.active;
    });
    // Removed while the screen is black, so the shader rebuild for one less light is not seen.
    this.stageLight.removeFromParent();
    if (moment) this.resumeMoment(moment);
    else this.showDayCard();
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
    if (input.pressed("Enter") || input.pressed("KeyE")) this.beginNight();
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
  /** A foe reached for her mid-brawl: the fight board steps aside for the touch screen, and comes back after. */
  showBrawlReach(): void {
    this.closePanel();
    this.brawlReachOpen = true;
    this.showTalk();
  }

  /** Whether the touch screen open now is a reach in the middle of a brawl. */
  private brawlReachOpen = false;

  /** Clears the room at once: the night's over early, and nobody's left to walk out. */
  dismissGuests(): void {
    for (const [id, actor] of this.actors) {
      this.guestLayer.remove(actor.group);
      this.tavern.guestLeft(id);
    }
    this.actors.clear();
    this.highlight(null);
  }

  private showTalk(lines = this.tavern.talkLines): void {
    this.clearTarget();
    this.screen = "talk";
    this.dialogue.start(lines, this.tavern.talkChoices, (index) => this.pickTalk(index));
    // An impulsive guest's touch has already landed as the talk opens: play it out now.
    this.showTouch();
    for (const line of lines) {
      this.log.addTalk(line);
      this.narrator.note(line.speaker ? `${line.speaker} says: ${line.text}` : line.text);
    }
    this.updateForceUI();
  }

  private updateForceUI(): void {
    const el = document.getElementById("touch-force");
    if (!el) return;
    // Only once she has said yes: while she's still choosing, there's nothing to show.
    const level = this.tavern.landedTouch?.level ?? 0;
    if (level > 0) {
      el.classList.add("visible");
      el.classList.toggle("high", level >= 6);
      el.classList.toggle("extreme", level >= 9);
      // An impulsive guest who didn't wait to ask: the bar fills fast.
      el.classList.toggle("fast", this.tavern.landedTouch?.impulse ?? false);
      const fill = el.querySelector<HTMLElement>(".force-fill");
      const val = el.querySelector(".force-value");
      const modeEl = el.querySelector(".house-mode");
      if (fill) fill.style.width = `${(level / 10) * 100}%`;
      if (val) val.textContent = `${level}/10`;
      // Where she is on her arc (STORY.md 4b), next to the Force bar.
      const mode = this.tavern.houseMode.current;
      if (modeEl) modeEl.textContent = `${mode === "brothel" ? "[Brothel] " : ""}${arcStageName(this.tavern.arcStage)}`;
      el.setAttribute("aria-hidden", "false");
    } else {
      el.classList.remove("visible", "high", "extreme", "fast");
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

  /** The show pose last put on the player, as "sibling:pose"; "" for none. */
  private showPoseShown = "";
  /** The tops her hands last pulled off her breasts, kept while the pose eases off so the cloth goes back with them. */
  private pullShown: { ids: string[]; dir: "down" | "up"; side?: "left" | "right" } | null = null;
  /** Whether a show pose was on the model (held or easing off) last time, to notice it finishing. */
  private poseOnModel = false;

  /**
   * Poses her while she shows a guest what they paid to see (7e), and lets the pose ease off after; her top comes
   * down off her breasts (or up over them) with her hands, and goes back with them. It comes on at once, so the
   * portrait drawn for the next line has it.
   */
  private syncShowPose(): void {
    const { tavern } = this;
    const showing = tavern.showingOff;
    const pose: ShowPose | null = DEV_SHOW_POSE ?? (showing ? showPoseOf(showing, tavern.topPullDir, tavern.showingSide) : null);
    const key = `${this.active}:${pose ?? ""}`;
    if (key !== this.showPoseShown) {
      this.showPoseShown = key;
      this.siblings.forEach((sibling, index) => {
        sibling.display(index === this.active ? pose : null);
        sibling.rest(0);
      });
      this.playerPortrait = null;
    }
    const pull = DEV_SHOW_POSE ? devPull(DEV_SHOW_POSE, topPull(tavern.playerBody, tavern.playerOutfit, tavern.strippedPieces)) : tavern.showingPull;
    if (pull) this.pullShown = pull;
    const held = this.siblings[this.active]?.showing;
    // The pose has finished easing off her: the portrait (drawn the moment the talk ended, still mid-pose) is
    // drawn again, so the next talk doesn't open on her still showing.
    if (this.poseOnModel && !held) this.playerPortrait = null;
    this.poseOnModel = held !== null;
    const amount = held && held.pose.startsWith("chest") ? held.amount : 0;
    if (amount <= 0) this.pullShown = null;
    this.dressers.forEach((dresser, index) => dresser.setPull(index === this.active ? this.pullShown : null, amount));
  }

  /** Her face as it shows, easing towards her expression; and the expression leading it last time. */
  private faceShown: FaceShape = { ...REST_FACE };
  private faceLeading: Expression = "neutral";
  /** Something that just happened, on her face for a moment, and how long it has left. */
  private faceMoment: { kind: FaceMoment; left: number } | null = null;
  /** Times she's said no, as last counted (null before the first count): one more, and it shows on her face. */
  private refusalsSeen: number | null = null;

  /** After hours, a body for each kind of partner to stand in the big picture with her: undressed, and ready. */
  private readonly duelPartnerBodies = new Map<string, Body>();

  /** Who's in the after-hours picture with her, and how (duelstage.ts), for the game it's of. */
  private readonly duelStage = new DuelStage();
  private stagedDuel: Duel | null = null;

  /**
   * After hours, who's in the big picture with her, the way Karryn's Prison runs its sex poses (duelstage.ts,
   * sexpose.ts): `entry` is the moment the comic panel shows, or null just to show the picture as it stands (a new
   * game after a brawl she lost starts with her down where she fell). Riding him, she faces him or his feet: which,
   * for each partner, turns over each time she comes.
   */
  duelScene(entry: DuelLogEntry | null, duel: Duel): void {
    const partners = duel.partners.map((p) => ({ id: p.id, kind: p.kind, female: p.female, done: p.done }));
    if (this.stagedDuel !== duel) {
      this.stagedDuel = duel;
      this.duelStage.start(this.tavern.duelAfterBrawl, partners, this.tavern.onTable, this.tavern.defeatPose);
    }
    if (entry) {
      const alt = entry.partner !== undefined && (entry.partner + duel.climaxes) % 2 === 1;
      this.duelStage.moment(entry, partners, { defeated: duel.defeated, alt });
    }
    const cast = this.duelStage.cast;
    if (!cast) return;
    const member = (id: number, spot: CastMember["spot"]): CastMember[] => {
      const partner = duel.partners.find((p) => p.id === id);
      if (!partner) return [];
      return [{ key: String(id), body: this.duelPartnerBody(partner.kind, partner.female).root, name: partner.female ? "Female" : "Male", spot }];
    };
    this.battleView.setCast(cast.scene, [...member(cast.lead, "lead"), ...cast.joins.flatMap((j) => member(j.partner, j.spot))]);
  }

  /** A body for a kind of partner to stand in the big picture with her: undressed, and ready. Clones share it. */
  private duelPartnerBody(kind: GuestKind, female: boolean): Body {
    const key = `${kind}:${female ? "f" : "m"}`;
    let body = this.duelPartnerBodies.get(key);
    if (!body) {
      body = this.makeGuestBody(kind, female);
      const dresser = new Dresser(body.root, female ? "Female" : "Male");
      dresser.apply(newLook());
      dresser.setDressing("nude");
      if (!female) dresser.setErection(1);
      this.duelPartnerBodies.set(key, body);
    }
    return body;
  }

  /** In a brawl, her face for the moment she's in (fightface.ts), and whether it's just been picked (it snaps on). */
  private fightFace: FaceShape | null = null;
  private fightFaceNew = false;

  /** Picks her face for a moment of a brawl as she strikes its pose, Karryn-style, from how the fight stands. */
  private pickFightFace(pose: BattlePoseName): void {
    const fight = this.tavern.fight;
    if (!fight) return;
    this.fightFace = fightFace({
      pose,
      stamina: fight.maxStamina > 0 ? fight.stamina / fight.maxStamina : 0,
      foeStamina: fight.foeMax > 0 ? fight.foeStamina / fight.foeMax : 0,
      slut: this.tavern.slutLevel,
      arousal: this.arousalShown,
    }).shape;
    this.fightFaceNew = true;
  }

  /** Puts something that just happened on her face for a moment. */
  private faceFlash(kind: FaceMoment): void {
    this.faceMoment = { kind, left: MOMENT_TIME[kind] };
  }

  /**
   * Her face (face.ts): shy or sultry while she shows a guest something, reacting to a touch, otherwise at ease, her
   * lids heavier and her cheeks flushed as she's aroused or drunk. It eases from one expression to the next; starting
   * or finishing a show it changes at once, so the portrait drawn for the next line has it.
   */
  private syncFace(dt: number): void {
    const { tavern } = this;
    // Saying no shows for a moment: slapping a hand away, turning a touch down, refusing to show them.
    const refusals = tavern.records.slapped + tavern.touchesTonight.refused + tavern.records.showsRefused;
    if (this.refusalsSeen !== null && refusals > this.refusalsSeen) this.faceFlash("refused");
    this.refusalsSeen = refusals;
    // A moment holds for as long as the talk it came in lasts, so the portrait keeps it; otherwise it passes.
    if (this.faceMoment && !tavern.inConversation) {
      this.faceMoment.left -= dt;
      if (this.faceMoment.left <= 0) this.faceMoment = null;
    }
    const duel = tavern.duel ? { state: tavern.duel.state, pleasure: tavern.duel.pleasure / 100 } : null;
    // A brawl starts squared up; once it's over, its face goes.
    if (!tavern.fight) this.fightFace = null;
    else if (!this.fightFace) this.pickFightFace("ready");
    const cause: FaceCause = {
      showing: tavern.showEagerness,
      reaction: this.siblings[this.active]?.reacting ?? null,
      arousal: this.arousalShown,
      drunk: tavern.drunk,
      slut: tavern.slutLevel,
      will: tavern.maxWillpower > 0 ? tavern.willpower / tavern.maxWillpower : 1,
      exposed: tavern.exposure,
      fighting: tavern.fight !== null,
      fightFace: this.fightFace,
      duel,
      moment: this.faceMoment?.kind ?? null,
      variant: this.faceVariant,
    };
    // Her face never holds still on one look: a close variant is picked as her expression changes and every few
    // seconds while it holds, as KP re-rolls its pools (face.ts VARIANTS).
    const leadingNow = DEV_FACE ?? expressionFor(cause);
    this.faceVariantLeft -= dt;
    if (leadingNow !== this.faceLeading || this.faceVariantLeft <= 0) {
      this.faceVariant = Math.floor(Math.random() * 3);
      this.faceVariantLeft = FACE_VARIANT_EVERY[0] + Math.random() * (FACE_VARIANT_EVERY[1] - FACE_VARIANT_EVERY[0]);
      cause.variant = this.faceVariant;
    }
    const target = DEV_FACE ? EXPRESSIONS[DEV_FACE] : faceFor(cause);
    // In a talk, a new expression comes on at once, so the portrait drawn for the next line has it.
    const leading = DEV_FACE ?? expressionFor(cause);
    const snap = leading !== this.faceLeading && tavern.inConversation;
    this.faceLeading = leading;
    // A brawl's new face comes on with her pose, at once, as Karryn's Prison swaps the whole picture.
    this.faceShown = snap || this.fightFaceNew ? target : easeFace(this.faceShown, target, dt);
    this.fightFaceNew = false;
    if (snap) this.playerPortrait = null;
    const alive = this.eyesAlive(dt, cause, leading);
    this.dressers.forEach((dresser, index) => dresser.setExpression(index === this.active ? alive : REST_FACE));
  }

  /** Which close variant of her expression she wears (face.ts withVariant), and how long until it's picked again. */
  private faceVariant = 0;
  private faceVariantLeft = 0;
  /** Her blinks: seconds to the next, and how far into the one she's in (null between blinks). */
  private blinkIn = 2;
  private blinkAt: number | null = null;
  /** Her glances: where her eyes are off to (added to her expression's own look), where they're going, and for how long. */
  private glance = { x: 0, y: 0 };
  private glanceTo = { x: 0, y: 0 };
  private glanceLeft = 3;

  /**
   * Her eyes alive over her face (face.ts's anime eyes): she blinks every few seconds, more often when she's nervous
   * and slower when she's drunk or worn out; and now and then her eyes flick aside for a moment and back. Laid over the
   * eased face each frame, not eased themselves, so a blink is quick.
   */
  private eyesAlive(dt: number, cause: FaceCause, leading: Expression): FaceShape {
    const shape = { ...this.faceShown };
    const nervous = ["shy", "bashful", "embarrassed", "surprised", "overwhelmed"].includes(leading) || (cause.exposed ?? 0) > 0.5;
    const heavy = Math.max(cause.drunk, 1 - (cause.will ?? 1));
    if (this.blinkAt === null) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) this.blinkAt = 0;
    }
    if (this.blinkAt !== null) {
      const length = BLINK.time * (1 + heavy * BLINK.heavySlower);
      this.blinkAt += dt / length;
      // Down fast, up a little slower.
      const t = this.blinkAt;
      const shut = t < BLINK.down ? t / BLINK.down : Math.max(0, 1 - (t - BLINK.down) / (1 - BLINK.down));
      shape.lidUpper = Math.max(shape.lidUpper, shut);
      shape.lidLower = Math.max(shape.lidLower, shut * BLINK.lower);
      if (t >= 1) {
        this.blinkAt = null;
        const [lo, hi] = BLINK.every;
        this.blinkIn = (lo + Math.random() * (hi - lo)) * (nervous ? BLINK.nervousSooner : 1) * (1 + heavy * BLINK.heavySlower);
      }
    }
    this.glanceLeft -= dt;
    if (this.glanceLeft <= 0) {
      const away = this.glanceTo.x === 0 && this.glanceTo.y === 0 && Math.random() < GLANCE.chance;
      this.glanceTo = away
        ? { x: (Math.random() * 2 - 1) * GLANCE.across, y: (Math.random() * 2 - 1) * GLANCE.up }
        : { x: 0, y: 0 };
      const [lo, hi] = away ? GLANCE.hold : GLANCE.between;
      this.glanceLeft = lo + Math.random() * (hi - lo);
    }
    const k = 1 - Math.exp(-GLANCE.speed * dt);
    this.glance.x += (this.glanceTo.x - this.glance.x) * k;
    this.glance.y += (this.glanceTo.y - this.glance.y) * k;
    shape.lookX = Math.min(1, Math.max(-1, shape.lookX + this.glance.x));
    shape.lookY = Math.min(1, Math.max(-1, shape.lookY + this.glance.y));
    return shape;
  }

  /** How aroused the player shows, easing towards what the night has done to her. */
  private arousalShown = 0;
  /** Likewise for her vulva, which follows her Pussy desire. */
  private vulvaArousalShown = 0;
  /**
   * How open her vulva and anus show, 0 closed to 2 stretched, easing towards how open they're meant to be; and how
   * open the customizer's preview has them.
   */
  private openingShown = { vulva: 0, anus: 0 };
  private openingPreview = { vulva: 0, anus: 0 };
  /** How hard his penis shows, easing like her arousal; and how hard the customizer's preview has it. */
  private erectionShown = 0;
  private erectionPreview = 0;
  /**
   * How full the player's vulva and anus are, from 0 (nothing in her) to 1 (stretched as wide as she goes): for
   * mating, which sets them while something is in her and puts them back to 0 after. While full she shows stretched
   * open, more the fuller; let go, she gapes a while, then closes back slowly.
   */
  filled = { vulva: 0, anus: 0 };

  /**
   * Her nipples stand and her areolae flush as her breasts' desire, or a duel's pleasure, rises; her vulva swells
   * and parts with her Pussy desire, or the duel's pleasure.
   */
  private syncArousal(dt: number): void {
    const { tavern } = this;
    const duel = tavern.duel ? { state: tavern.duel.state, pleasure: tavern.duel.pleasure / 100 } : null;
    const target = arousalOf(tavern.meters.breasts / METER_MAX, duel);
    this.arousalShown = easeArousal(this.arousalShown, target, dt);
    const vulva = arousalOf(tavern.meters.pussy / METER_MAX, duel);
    this.vulvaArousalShown = easeArousal(this.vulvaArousalShown, vulva, dt);
    this.dressers.forEach((dresser, index) =>
      index === this.active ? dresser.setArousal(this.arousalShown, this.vulvaArousalShown) : dresser.setArousal(0),
    );
    // Played as him, he hardens as the night's desire or a duel's pleasure rises, whichever is strongest; in the
    // customizer, the preview's erection shows instead.
    if (this.screen === "customize") {
      if (this.chosen !== null) this.dressers[this.chosen].setErection(this.erectionPreview);
    } else {
      this.erectionShown = easeArousal(this.erectionShown, Math.max(target, vulva), dt);
      this.dressers.forEach((dresser, index) => dresser.setErection(index === this.active ? this.erectionShown : 0));
    }
    // Her desire relaxes her open a little: her vulva parts as Pussy desire rises, her anus eases a touch with Butt
    // desire; filled, she stretches round what's in her. In the customizer, the preview's opening shows instead.
    if (this.screen === "customize") {
      if (this.chosen !== null) this.dressers[this.chosen].setOpening(this.openingPreview.vulva, this.openingPreview.anus);
      return;
    }
    const butt = arousalOf(tavern.meters.butt / METER_MAX, null);
    const { filled } = this;
    const meant = (full: number, desire: number) => (full > 0 ? 1 + Math.min(1, full) : desire);
    this.openingShown = {
      vulva: easeOpening(this.openingShown.vulva, meant(filled.vulva, 0.3 * this.vulvaArousalShown), dt),
      anus: easeOpening(this.openingShown.anus, meant(filled.anus, 0.12 * butt), dt),
    };
    this.dressers.forEach((dresser, index) =>
      index === this.active ? dresser.setOpening(this.openingShown.vulva, this.openingShown.anus) : dresser.setOpening(0, 0),
    );
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
    // The first impulsive guest's offer can change the touch settings: remember the answer.
    writeTouchSettings(tavern.touchSettings);
    this.syncStripped();
    this.syncShowPose();
    this.syncFace(0);
    this.showTouch();
    this.pendingAdult ??= tavern.takeAdultScene();
    if (!tavern.inConversation) {
      this.dialogue.close();
      this.screen = "play";
      document.getElementById("touch-force")?.classList.remove("visible", "high", "extreme", "fast");
      // A reach mid-brawl, answered: back to the fight (or how it ended).
      if (this.brawlReachOpen) {
        this.brawlReachOpen = false;
        this.pendingAdult = null;
        showFight(this);
        return;
      }
      const scene = this.pendingAdult;
      this.pendingAdult = null;
      if (scene) {
        if (scene.kind === "table") {
          this.narrator.moment(
            scene.auto
              ? `Too worked up to hold back, she lets the ${(scene.guestStats?.label ?? scene.guestKind).toLowerCase()} lay her back on a table, and the room crowds in.`
              : `She says yes to the ${(scene.guestStats?.label ?? scene.guestKind).toLowerCase()}, on a table in the taproom, and the room crowds in.`,
            `table:${scene.guestKind}`,
            (scene.guestStats?.label ?? scene.guestKind).toLowerCase(),
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
    for (let i = 0; i < 9; i++) if (input.pressed(`Digit${i + 1}`)) dialogue.choose(i);
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
    const female = guest.female;
    const look = this.guestLook(guest);
    const dressed = this.tavern.recruitOutfitOf(guest);
    const key = `${guest.role}:${female}:${look}:${dressed?.id ?? ""}:${JSON.stringify(dressed?.colors ?? {})}`;
    let portrait = this.guestPortraits.get(key);
    if (!portrait) {
      const body = this.makeGuestBody(guest.kind, female, look, guest.role, dressed);
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
      // Up off the floor by morning, whatever she was in the middle of.
      this.siblings.forEach((sibling) => sibling.act(null));
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
    // What she broke, to buy back one at a time, under its own heading. The count is how many are still broken.
    const repairs = (Object.keys(WARE_NAMES) as Ware[])
      .filter((ware) => tavern.broken[ware] > 0)
      .map(
        (ware): Supply => ({
          name: `Buy back a broken ${WARE_NAMES[ware].replace(/e?s$/, "")}`,
          icon: ware,
          group: "Buy back",
          price: REPLACE_COST,
          detail: `You've broken ${tavern.broken[ware]} ${WARE_NAMES[ware]} (${tavern.stock[ware]} left on the shelf). Buy them back here, ${REPLACE_COST} gold each.`,
          owned: false,
          count: tavern.broken[ware],
          canBuy: tavern.canReplace(ware),
          buy: () => tavern.replaceBroken(ware),
        }),
      );
    const drinks = BOTTLE_KINDS.map(
      (bottle): Supply => ({
        name: BOTTLES[bottle].name,
        icon: bottle,
        group: "Drinks",
        price: tavern.bottleCost(bottle),
        detail: BOTTLES[bottle].detail,
        owned: tavern.bottles.has(bottle),
        canBuy: tavern.canBuyBottle(bottle),
        buy: () => tavern.buyBottle(bottle),
      }),
    );
    // The Lantern's builds, switches and girls, once the brothel is open to her (lanternplans.ts). The edicts have
    // their own tree on the Edicts tab (edictViews).
    return [...upgrades, ...wares, ...repairs, ...drinks, ...lanternSupplies(tavern), ...revelSupplies(tavern)];
  }

  /** The edict tree for the plans' Edicts tab (tavernrules.ts). */
  private edictViews(): ReturnType<BuildHost["edicts"]> {
    const { tavern } = this;
    const name = (id: string) => TAVERN_RULE_BY_ID.get(id)?.name ?? id;
    const list = TAVERN_RULES.map((def): EdictView => {
      const state = edictState(def, tavern.rules);
      const needs = def.requires ? ` Needs ${def.requires.map(name).join(" or ")}.` : "";
      const either = def.excludes ? ` Either/or with ${def.excludes.map(name).join(", ")}.` : "";
      const where =
        state === "enacted" ? " Enacted." :
        state === "excluded" ? " Locked out by the one you chose." :
        tavern.phase !== "day" ? " Edicts are enacted by day." : "";
      return {
        id: def.id,
        name: def.name,
        branch: def.branch,
        tier: def.tier,
        state,
        points: def.points,
        gold: def.cost,
        detail: `${def.does}.${def.costs ? ` Costs: ${def.costs}.` : ""}${needs}${either}${where}`,
        canEnact: tavern.canEnact(def.id),
        enact: () => tavern.enact(def.id),
      };
    });
    return { points: tavern.edictPoints, perDay: EDICT_POINTS_PER_DAY, branches: EDICT_BRANCHES, list };
  }

  /**
   * The Staff tab: a post for each job opened by now (or opened by an edict, or with someone on it), and her staff
   * (not the Lantern's girls, who keep the room upstairs).
   */
  private staffBoard(): StaffBoard {
    const { tavern } = this;
    const stages = ["early", "mid", "late"];
    const reached = stages.indexOf(tavern.staffStage);
    const people = tavern.staff
      .filter((m) => !m.quit && m.job !== "girl")
      .map((m) => {
        const post = tavern.postOf(m);
        const away = post !== null && post !== m.job ? ` Working the ${POST_NAMES[post].toLowerCase()} (not their own job).` : "";
        return {
          id: m.id,
          name: m.name,
          job: m.job,
          post,
          detail: `${m.name}, ${m.age}, ${m.job}. Skill ${m.skill}, loyalty ${Math.round(m.loyalty)}, stamina ${m.stamina.current}/${m.stamina.max}, wage ${m.wage} gold.${away}`,
        };
      });
    const posts = STAFF_JOBS.filter((job) => job !== "girl")
      .filter((job) => stages.indexOf(JOB_UNLOCK[job]) <= reached || tavern.postSlots(job) > 1 || people.some((p) => p.post === job))
      .map((job) => ({ job, name: POST_NAMES[job], slots: tavern.postSlots(job) }));
    return { posts, people, canChange: tavern.canManageStaff };
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
        // The Lantern's night: bookings, room takings, the girls' cut and mood, any trouble (lantern.ts).
        ...tavern.lantern.dawnLines(),
        // What the town is saying about her this morning, from what she did since the day began.
        ...(this.dayStart ? townTalk(this.dayStart, now) : []),
        ...tavern.news,
        ledgerLine(tavern),
        debtLine(tavern),
        "Upgrades and more cups and dishes are on the house plans in your room.",
        ...(tavern.broken.cup + tavern.broken.dish > 0
          ? [`You've broken ${brokenWords(tavern.broken)}. Buy them back on the house plans.`]
          : []),
      ].filter((line) => line !== ""),
      [
        {
          label: "Start the next day",
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
    this.splitDawn(tavern.nightIndex + 1);
  }

  /**
   * Lays the morning report out as two boards side by side: the night's log on the left (with the button),
   * and where she stands now (status and new passives) on the right.
   */
  private splitDawn(night: number): void {
    const box = this.panelEl.querySelector<HTMLElement>(".box");
    if (!box) return;
    box.classList.add("dawn-log");
    const side = document.createElement("div");
    side.className = "box dawn-side";
    const heading = document.createElement("h1");
    heading.textContent = "Where you stand";
    const sub = document.createElement("p");
    sub.className = "dawn-sub";
    sub.textContent = `After night ${night}`;
    side.append(heading, sub);
    for (const el of Array.from(box.querySelectorAll(".day-status, .new-passives"))) side.append(el);
    const spread = document.createElement("div");
    spread.className = "dawn-spread";
    spread.append(box, side);
    this.panelEl.replaceChildren(spread);
    this.panelEl.classList.add("dawn-open");
  }

  private advanceNight(): void {
    const { tavern } = this;
    tavern.nextNight();
    this.chatter.reset();
    if (tavern.phase === "ended" && tavern.ending) {
      const ending = ENDINGS[tavern.ending];
      this.openPanel(
        ending.title,
        [ending.text, `Night ${tavern.nightIndex + 1}. Gold ${tavern.gold}, Trust ${tavern.trust}, Heat ${tavern.heat}.`],
        [
          { label: "Play again", onPick: () => location.reload() },
          { label: "Load game", disabled: !latestSave(), onPick: () => showLoadMenu(this, () => this.advanceNight()) },
        ],
      );
    } else {
      this.showMorning();
    }
  }

  /**
   * The morning, before the day card (STORY.md, Chapter 1): Pell's collection if he came, a beat waiting on her
   * answer (a fallen house's boss, or Pell at dawn), what her answer brought, and First in Tarven when she passes
   * the Copper Bell. Each card leads to the next, and the day card comes last.
   */
  private showMorning(): void {
    const { tavern } = this;
    const again = () => this.showMorning();
    const visit = tavern.takeBaronVisit();
    if (visit) {
      const caughtUp = tavern.arrears === 0;
      this.openPanel(
        caughtUp ? "Pell collects" : "Short of the Baron's due",
        caughtUp
          ? [`Pell counts ${visit.due} gold into his purse for the Baron.`, visit.owed > 0 ? `${visit.owed} still owed.` : "The debt is paid. Grandma's tavern is yours, free and clear."]
          : [
              `Pell wanted ${visit.due} gold. He took the ${visit.paid} you had. You're ${tavern.arrears} behind, and it'll be on top of the next.`,
              "The tavern stays open. But you're in the Baron's debt now, and it shows.",
            ],
        [{ label: "Go on", onPick: again }],
      );
      this.panelBack = again;
      return;
    }
    const card = tavern.beatCard;
    if (card) {
      // Her answer, then what it brought (the clue, Wren's letter), before the rest of the morning.
      const answer = (pick: () => void) => {
        const before = tavern.news.length;
        pick();
        this.openPanel(card.title, tavern.news.slice(before), [{ label: "Go on", onPick: again }]);
        this.panelBack = again;
      };
      const buttons = card.house
        ? [
            { label: `Partner with ${card.house.boss}`, onPick: () => answer(() => tavern.answerHouse("partner")) },
            { label: `Ruin ${card.house.name} (corruption, heat)`, onPick: () => answer(() => tavern.answerHouse("ruin")) },
          ]
        : tavern.beatChoices.length > 0
          ? // Act 2's cards and the pass rivals at her door (act2.ts).
            tavern.beatChoices.map((c) => ({ label: c.label, onPick: () => answer(() => tavern.answerBeat(c.id)) }))
          : // Pell's answers change with who she's become (STORY.md 4b): two more for some of her.
            tavern.pellChoices.map((c) => ({ label: c.label, onPick: () => answer(() => tavern.answerPell(c.answer)) }));
      this.openPanel(card.title, card.lines, buttons);
      return;
    }
    // Wren's letter, if she found one this morning (letters.ts): where, and the letter. Words only.
    const letter = tavern.takeLetter();
    if (letter) {
      this.openPanel(letter.title, letter.lines, [{ label: "Fold it away", onPick: again }]);
      this.panelBack = again;
      return;
    }
    if (tavern.takeFirstInTarven()) {
      // The card changes with what she did in Act 1 (plot.ts) and her biggest fan group; then her Chapter 1 ending
      // (chapter1.ts), and the teaser. The chapter ends; the nights go on.
      const ending = chapterEndingCard(tavern.chapterEnding ?? tavern.chapterEndingNow());
      const showEnding = () => {
        this.openPanel(ending.title, ending.lines, [{ label: "Start the day", onPick: again }]);
        this.panelBack = again;
      };
      this.openPanel("First in Tarven", firstInTarvenCard(tavern.plotFlags, biggestFanGroup(tavern.fanGroups)), [{ label: "Go on", onPick: showEnding }]);
      this.panelBack = showEnding;
      return;
    }
    this.showDayCard();
  }

  private updatePlay(dt: number): void {
    const { tavern, input } = this;
    const player = this.siblings[this.active];
    // The "Brawl!" card is up: everyone holds still until it's done, then the fight screen opens.
    if (this.brawlIntro > 0) {
      this.siblings.forEach((sibling) => sibling.rest(dt));
      this.brawlIntro -= dt;
      if (this.brawlIntro <= 0 || !tavern.fight) {
        this.brawlIntro = 0;
        this.brawlIntroEl.classList.remove("on");
        showFight(this);
      }
      return;
    }
    // Something she's acting out (barwork.ts): putting a piece back on, or going under from drink. She holds still
    // for it; once she's down, the room carries her up to bed and it's morning.
    const act = tavern.takeActMoment();
    if (act) {
      player.act(act);
      this.audio.play(act === "faint" ? "drop" : "cloth");
      if (act === "faint") this.faintLeft = FAINT_SECONDS + FAINT_HOLD;
      this.playerPortrait = null;
    }
    if (this.faintLeft > 0) {
      this.faintLeft -= dt;
      if (this.faintLeft <= 0) {
        this.faintLeft = 0;
        tavern.sleep();
        this.goToSleep();
      }
    }
    const strideBefore = player.strideAngle;
    if (player.acted) player.rest(dt);
    else if (player.move(dt, input, this.world.colliders, tavern.drunk)) tavern.stumble(this.active);
    if (footfalls(strideBefore, player.strideAngle) > 0) this.audio.play("step", input.run ? RUNNING_STEP_LOUDNESS : 1);
    if (this.followStairs(player, dt)) return;

    // O steps the sister's walk through its five styles, whoever is being played.
    if (input.pressed("KeyO")) {
      const sister = this.siblings.find((sibling) => sibling.walkStyle !== null);
      const level = sister?.cycleWalkStyle();
      if (level) {
        this.log.add(`Walk style ${level} of 5: ${WALK_STYLE_NAMES[level - 1]}`);
      }
    }

    // K and L act out putting a piece back on and passing out, to check the animations, in development only.
    if (import.meta.env.DEV && input.pressed("KeyK")) player.act("dress");
    if (import.meta.env.DEV && input.pressed("KeyL")) player.act(player.acted?.kind === "faint" ? null : "faint");
    // [ plays the cut-in tester's last cut-in again, and \ takes the panel down, in development only.
    if (import.meta.env.DEV && input.pressed("BracketLeft") && this.testedCut) {
      const { kind, guest } = this.testedCut;
      this.testCutIn(kind, guest);
    }
    if (import.meta.env.DEV && input.pressed("Backslash")) {
      this.touchComic.clear();
      if (this.scenePoseShown) {
        this.scenePoseShown = false;
        this.battleView.hide();
        this.battleShown = "";
      }
    }

    // P opens the sex fight test panel, in development only.
    if (import.meta.env.DEV && input.pressed("KeyP")) {
      this.clearTarget();
      showDuelTest(this);
      return;
    }
    // ] opens the dev panel: the Consent check, her side and the last guest's, in development only.
    if (import.meta.env.DEV && input.pressed("BracketRight")) {
      this.clearTarget();
      showDevPanel(this, () => {
        this.closePanel();
        this.screen = "play";
      });
      return;
    }
    // B starts a test brawl with a random kind of guest, in development only.
    if (import.meta.env.DEV && input.pressed("KeyB") && !tavern.fight) {
      tavern.startTestFight();
      this.clearTarget();
      showFight(this);
      return;
    }

    this.remindToHeadHome();
    if (this.questMap) {
      if (this.updateQuestField(dt)) return;
    } else if (this.outdoors && this.townsfolk) {
      this.townsfolk.update(dt);
      const her = this.siblings[this.active].position;
      this.streetTalk?.update(dt, this.townsfolk.people(), her, this.townFacts());
      // Now and then the street takes in what she's out in (each step further, once a day).
      this.seenCheck -= dt;
      if (this.seenCheck <= 0 && this.screen === "play") {
        this.seenCheck = 1;
        const noticed = outfitNoticed(this.seenFacts(), this.tavern.random());
        if (noticed) this.applySeen(noticed);
      }
      // The grass bends in the wind and leans away from her and the townsfolk nearest her (grass.ts).
      const near = this.townsfolk
        .people()
        .filter((p) => p.visible)
        .map((p) => ({ x: p.position.x, z: p.position.z, d: p.position.distanceToSquared(her) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, MAX_PUSHERS - 1);
      this.street.grass.update(this.time, [{ x: her.x, z: her.z }, ...near]);
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
      if (found.target.kind === "street") {
        this.useStreet(found.target.place);
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
      if (found.target.kind === "closet") {
        this.openCloset();
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
    tavern.tick(dt, { listeningTo: listening, night: this.clock.isNight });
    // Trouble brewing: the guest shouts it out loud, once.
    if (tavern.trouble && tavern.trouble !== this.shoutedTrouble) {
      this.shoutedTrouble = tavern.trouble;
      this.chatter.shout(tavern.trouble.guestId, tavern.trouble.shout);
    }
    // A guest started a brawl: the "Brawl!" card slams in, then the night waits while it's settled.
    if (tavern.fight) {
      this.clearTarget();
      this.startBrawlIntro(tavern.fight.name);
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
    if (this.screen === "play" && this.outdoors) {
      if (this.townsfolk && this.streetTalk) {
        speakers.push(...this.streetTalk.speakers(this.townsfolk.people(), this.siblings[this.active].position));
      }
    } else if (this.screen === "play") {
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
    const took = touchLands(moment.answer);
    const soft: SoftPart | null = !took ? null : moment.region === "chest" ? "Bust" : moment.region === "rear" || moment.region === "lap" ? "Glute" : null;
    const reaction: Reaction = !took ? "recoil" : moment.answer === "lean" ? "melt" : "jolt";
    sibling.react(reaction, soft, SMACK_TOUCHES.has(moment.id) ? 0.9 : 0.6);
    if (took && SMACK_TOUCHES.has(moment.id)) this.shakeScreen("spank");
    if (took && this.brawlReachOpen) this.brawlTouchScene(moment);
    const name = BODY_NAMES[this.active];
    const body = sibling.root.getObjectByName(name);
    if (body) this.playComic({ id: moment.id, region: moment.region, answer: moment.answer, kind: moment.kind, level: moment.level });
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
    // Steam, moans and hearts by how worked up she is; where a man finished, she's at her peak whatever her state.
    const heat = entry.spot ? Math.max(0.9, duelHeat(state)) : duelHeat(state);
    this.playComic({ ...shot, answer: state === "calm" ? "allow" : "lean", kind: entry.kind ?? "farmer", hold: true, heat });
  }

  /** The cut-in the dev tester last played ([ plays it again), in development only. */
  private testedCut: { kind: CutKind; guest: GuestKind } | null = null;

  /** Plays one cut-in on her now, held up until cleared (\) or the next: the dev panel's cut-in tester. */
  testCutIn(kind: CutKind, guest: GuestKind): void {
    this.testedCut = { kind, guest };
    this.playComic({ id: "grab", region: CUT_INS[kind].region, answer: "allow", kind: guest, level: 6, hold: true, heat: 0.7, cut: kind });
  }

  /**
   * Dev only: shows one sex-scene pose in the big picture, in the game's own camera and look, with a man of `guest`'s
   * kind as the lead and (with `joins`) one at every slot the pose has. She's shown bare, as in the scenes. The \ key
   * takes it down. The dev panel's scene pose tester.
   */
  testScenePose(scene: ScenePoseName, guest: GuestKind, joins: boolean): void {
    const index = BODY_NAMES.indexOf("Female");
    const body = this.siblings[index]?.root.getObjectByName("Female");
    if (!body) return;
    // Her clothes and jewellery hidden just while the picture copies her, then put back; her band and smallclothes
    // (painted on her) and tights over her groin taken off for it too, as a cut-in does (playComic).
    const { tavern } = this;
    const dresser = this.dressers[index];
    const mine = index === this.active;
    const was = mine ? tavern.shownPieces : [];
    const off = cutInPieces("Female", mine ? tavern.playerOutfit : undefined, mine ? tavern.playerLegwear : undefined, mine ? tavern.playerUnder : undefined, was);
    if (off.length) dresser.setStripped([...was, ...off]);
    const hidden: Object3D[] = [];
    body.traverse((o) => {
      if (/_Cloth|_Jewel/.test(o.name) && o.visible) {
        o.visible = false;
        hidden.push(o);
      }
    });
    this.battleShown = "";
    // Afresh each time, so the same pose shown again is set down and framed again.
    this.battleView.setCast(null, []);
    this.battleView.show(body, "Female", "duel", `Scene: ${scene}`);
    for (const o of hidden) o.visible = true;
    if (off.length) dresser.setStripped(was);
    // Barefoot, as KP draws her in its sex scenes.
    this.battleView.bareFeet();
    const man = (spot: CastMember["spot"]): CastMember => ({ key: `test:${String(spot)}`, body: this.duelPartnerBody(guest, false).root, name: "Male", spot });
    const spots = joins ? (SCENE_JOINS[scene] ?? []).map((_, i) => man(i)) : [];
    this.battleView.setCast(scene, [man("lead"), ...spots]);
    this.scenePoseShown = true;
  }

  /** Whether the dev scene pose tester has a pose up (\ takes it down). */
  private scenePoseShown = false;

  /**
   * Plays a moment in the comic panel. A cut-in (Karryn-style) always shows her bare, as KP's do, never dressed, and
   * never by her clothes just vanishing where they can move instead: her top pulled down off her breasts (or lifted
   * over them), the way her hands pull it in a show pose (Dresser.setPull); her skirt lifted, at the front or (on her
   * behind) the back, as her hands lift it in a show; what can't move (her band and smallclothes, painted on her;
   * tights over her groin; a bottom that isn't a skirt) taken off. All on her own model just while the panel copies
   * her, then put back, so the room never sees it.
   */
  private playComic(show: TouchShow): void {
    const name = BODY_NAMES[this.active];
    const sibling = this.siblings[this.active];
    const body = sibling.root.getObjectByName(name);
    if (!body) return;
    const { tavern } = this;
    const kind = show.cut ?? (touchLands(show.answer) && !show.words ? cutKindFor(show.id, show.region, show.level ?? 4, show.noHand) : null);
    const pull = kind ? topPull(tavern.playerBody, tavern.playerOutfit, tavern.strippedPieces) : null;
    // Her shoes and boots stay on (cutInPieces never takes them).
    const off = kind ? cutInPieces(tavern.playerBody, tavern.playerOutfit, tavern.playerLegwear, tavern.playerUnder, tavern.shownPieces) : [];
    const behind = kind ? CUT_INS[kind].region === "rear" : false;
    // Seen from between her legs, from below, she holds it up all round.
    const between = kind ? CUT_INS[kind].view === "between" : false;
    // A hand between her legs finds her wet and parted, as KP's does, however she shows in the room.
    const intimate = kind ? CUT_INS[kind].region === "intimate" : false;
    const dresser = this.dressers[this.active];
    if (off.length) dresser.setStripped([...tavern.shownPieces, ...off]);
    if (pull) dresser.setPull(pull, 1);
    if (kind) sibling.liftSkirtNow(behind ? 0 : 1, behind || between ? 1 : 0);
    if (intimate) {
      dresser.setArousal(this.arousalShown, Math.max(this.vulvaArousalShown, CUT_WET.arousal));
      dresser.setOpening(Math.max(this.openingShown.vulva, CUT_WET.open), this.openingShown.anus);
    }
    this.touchComic.play(body, name, { ...show, ownCloth: Boolean(pull || off.length) });
    // Back as it was on her in the room; a show pose's own pull, and her skirt, come back with the next frame.
    if (pull) dresser.setPull(null, 0);
    if (off.length) dresser.setStripped(tavern.shownPieces);
    if (intimate) {
      dresser.setArousal(this.arousalShown, this.vulvaArousalShown);
      dresser.setOpening(this.openingShown.vulva, this.openingShown.anus);
    }
  }

  /** She came in a duel: KP's orgasm cut-in, harder (`strength` 2) from her second time on. */
  showDuelClimax(times: number): void {
    const name = BODY_NAMES[this.active];
    const body = this.siblings[this.active].root.getObjectByName(name);
    if (!body) return;
    this.playComic({ id: "gaze", region: "face", answer: "lean", noHand: true, kind: "farmer", hold: true, heat: 1, cut: "orgasm", strength: times > 1 ? 2 : 1 });
  }

  /** Whether a brawl event gets its own comic moment (so a turn's moments can be counted). */
  hasFightShot(event: string): boolean {
    return Boolean(FIGHT_SHOTS[event]);
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
    if (body) this.playComic(show);
    this.fightQueueWait = FIGHT_MOMENT_GAP;
  }

  /** Slams the "Brawl!" card onto the screen, with who it's against, and shakes the room. */
  private startBrawlIntro(name: string): void {
    const who = this.brawlIntroEl.querySelector(".who");
    if (who) who.textContent = `The ${name} wants a fight!`;
    this.brawlIntroEl.classList.remove("on");
    // Restart the animation.
    void this.brawlIntroEl.offsetWidth;
    this.brawlIntroEl.classList.add("on");
    this.brawlIntro = BRAWL_INTRO_SECONDS;
    this.audio.play("smashTray");
  }

  /**
   * The big picture of her beside a fight, showing her as she is now: shown again only when what's off her or
   * on her has changed. `title` goes on its nameplate.
   */
  showBattle(
    mode: BattleMode,
    title: string,
    heat: number,
    edge: boolean,
    status: readonly BattleStat[],
    foes: readonly { guestId: number; kind: GuestKind; title: string; status: readonly BattleStat[]; lust?: BattleLust | null }[] = [],
    lust: BattleLust | null = null,
  ): void {
    this.syncStripped();
    this.syncCoat();
    // With foes across from her, she stands on the right and turns to face them on the left.
    const facing = foes.length > 0 ? "left" : "right";
    const key = `${mode}:${facing}:${this.strippedShown}:${this.coatShown}`;
    const name = BODY_NAMES[this.active];
    const body = this.siblings[this.active].root.getObjectByName(name);
    if (body && (key !== this.battleShown || !this.battleView.open)) {
      this.battleShown = key;
      this.battleView.show(body, name, mode, title, facing);
    }
    this.battleView.setHeat(heat, edge);
    this.battleView.setStatus(status);
    this.battleView.setLust(lust);
    const shown = foes.flatMap((foe) => {
      const found = this.foeBody(foe.guestId, foe.kind);
      return found ? [{ key: `${foe.guestId}:${foe.kind}`, body: found.root, name: found.name, title: foe.title, status: foe.status, lust: foe.lust }] : [];
    });
    if (shown.length > 0) this.foeColumn.show(shown, mode);
    else this.foeColumn.hide();
  }

  /** A foe's body to picture: the guest as they stand in the room, or one made up for a test brawl. */
  private foeBody(guestId: number, kind: GuestKind): { root: Object3D; name: string } | null {
    const monster = this.questBrawlers.get(guestId);
    if (monster) return { root: monster, name: "Monster" };
    const actor = this.actors.get(guestId);
    const female = this.tavern.guests.find((g) => g.id === guestId)?.female ?? false;
    if (actor) return { root: actor.bodyRoot, name: female ? "Female" : "Male" };
    if (this.testFoe?.kind !== kind) this.testFoe = { kind, body: this.makeGuestBody(kind, false) };
    return { root: this.testFoe.body.root, name: "Male" };
  }

  /** A foe across from her takes a hit. */
  foeHit(index: number): void {
    this.foeColumn.hit(index);
  }

  /**
   * The target cursor over a foe's picture (KP's enemy select), or none. With `pick`, their pictures can be
   * clicked to choose them.
   */
  aimAtFoe(index: number | null, pick?: (index: number) => void): void {
    this.foeColumn.aim(index, pick);
  }

  /** Shakes the pictures on screen, Karryn's Prison's way (screenshake.ts): a blow, a spank, her coming. */
  shakeScreen(kind: ShakeKind): void {
    this.screenShake.start(kind);
  }

  /** Slides the pictures with the shake: only when it's moved a pixel, so a still screen costs nothing. */
  private updateShake(dt: number): void {
    const x = shakePixels(this.screenShake.update(dt), window.innerWidth);
    if (x === this.shakeShown) return;
    this.shakeShown = x;
    document.documentElement.style.setProperty("--shake-x", `${x}px`);
  }

  /** She's hit, or jolted, in the big picture. */
  battleHit(hard: boolean): void {
    this.battleView.hit(hard);
  }

  /**
   * A brawl turn in the big picture, Karryn-style: she strikes each pose as its moment comes up in the comic panel
   * (her swing, a blow landing, a dodge, a hold), then settles into `rest` once the turn has played out.
   */
  battleTurn(events: readonly string[], rest: BattlePoseName, fight: Fight): void {
    this.stageBrawl(fight);
    // Who she's in a scene with: the one who has her, or, for her own moves, the one she's going for.
    const with_ = fight.taken ? fight.foes[fight.taken.foe] : fight.targeted;
    const female = this.guestFemale(with_.guestId);
    const sceneOf = (event: string): ScenePoseName | null => {
      const area = takenOf(event);
      // KP's scenes have their own pose (brawlscenes.ts; Tarven's nearest for now), Tarven's own his type's way.
      if (area) return scenePose(fight.taken?.scene) ?? takenScene(area, with_.kind, female);
      const move = intimateOf(event);
      if (!move) return null;
      // Her mouth on them twice running goes deeper; riding them again, she turns round.
      const times = this.brawlRun?.move === move ? this.brawlRun.times + 1 : 1;
      this.brawlRun = { move, times };
      return intimateScene(move, with_.kind, female, times);
    };
    const { beats, held, taken } = brawlBeats(events, (event) => this.hasFightShot(event), FIGHT_MOMENT_GAP, rest, this.brawlHeld, sceneOf, this.brawlTaken, fight.taken !== null);
    this.brawlHeld = held;
    this.brawlTaken = taken;
    if (!held) this.brawlRun = null;
    this.castBrawl(fight, with_, held);
    this.battleView.play(beats);
  }

  /**
   * Who's in the big picture with her mid-brawl: `with_`, and anyone joined in with them at a slot the scene has
   * (KP's pose joins: her mouth, her hands). Each undressed and ready, like after hours.
   */
  private castBrawl(fight: Fight, with_: Foe, scene: ScenePoseName | null): void {
    const member = (foe: Foe, spot: CastMember["spot"]): CastMember => {
      const female = this.guestFemale(foe.guestId);
      return { key: `brawl:${foe.guestId}:${foe.name}`, body: this.duelPartnerBody(foe.kind, female).root, name: female ? "Female" : "Male", spot };
    };
    const spots = scene ? (SCENE_JOINS[scene] ?? []) : [];
    const joined = fight.joined.flatMap((j) => {
      const spot = spots.findIndex((s) => s.slot === j.slot);
      return spot >= 0 ? [member(fight.foes[j.foe], spot)] : [];
    });
    this.battleView.setBrawlCast([member(with_, "lead"), ...joined]);
  }

  /** Whether a guest is a woman (a made-up foe for a test brawl isn't). */
  private guestFemale(guestId: number): boolean {
    return this.tavern.guests.find((g) => g.id === guestId)?.female ?? false;
  }

  /**
   * Mid-brawl, a touch she let land shows in the big picture for a moment (brawlscene.ts), her and the one she's
   * fighting, then she's back in the fight; not while she's already in a scene with them.
   */
  private brawlTouchScene(touch: { id: string; region: TouchRegion }): void {
    const fight = this.tavern.fight;
    const scene = touchScene(touch);
    if (!fight || !scene || this.brawlHeld) return;
    this.stageBrawl(fight);
    // It's the one who reached for her she's in it with.
    this.castBrawl(fight, fight.foes.find((f) => f.guestId === fight.reachingGuestId) ?? fight.targeted, scene);
    const rest = restingPose({ stamina: fight.stamina, maxStamina: fight.maxStamina, lost: fight.outcome === "lost" });
    this.battleView.play([
      { pose: "held", at: 0, hurt: false, scene },
      { pose: rest, at: TOUCH_SCENE_HOLD, hurt: false },
    ]);
  }

  /** The brawl the big picture's scenes are of, the scene she's held in, and her run of one intimate move. */
  private stagedBrawl: Fight | null = null;
  private brawlHeld: ScenePoseName | null = null;
  private brawlRun: IntimateRun = null;
  /** Whether the scene she's held in is one a foe started (she can't just walk out of it). */
  private brawlTaken = false;

  /** A new brawl starts with no scene in the picture. */
  private stageBrawl(fight: Fight): void {
    if (this.stagedBrawl === fight) return;
    this.stagedBrawl = fight;
    this.brawlHeld = null;
    this.brawlRun = null;
    this.brawlTaken = false;
  }

  /** Takes the duel's comic panel down, once the game is over. */
  hideDuelMoment(): void {
    this.battleView.hide();
    this.foeColumn.hide();
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
      // A tip puts a smile on her face; a guest walking out on her, a scowl.
      if (cue === "tip") this.faceFlash("tipped");
      if (cue === "walkOut") this.faceFlash("walkedOut");
      // Drinking with a guest plays out in a comic panel, which makes its own clink and gulp in time.
      if (cue === "drink") this.showDrinkComic();
      else audio.play(cue);
    }
    audio.setPaused(this.screen === "paused");
    audio.setMusic(musicFor(this.staging, tavern.phase, tavern.nightIndex));

    // The room is only heard once you are in it. The stew pot hangs over the hearth, so both are heard from there.
    const fromHearth = focus.distanceTo(this.spots.pot);
    // In her bedroom behind the east door, or upstairs, the room is heard faintly.
    const inBedroom = focus.x > BEDROOM_FROM_X || isUpstairs(focus);
    const crowd = tavern.phase === "service" ? Math.sqrt(Math.min(1, tavern.guests.length / CROWD_FULL)) : 0;
    const bubbling = tavern.potState === "cooking" || tavern.potState === "ready";
    const fire = inBedroom ? FIRE_BEDROOM_LEVEL : Math.max(FIRE_ROOM_LEVEL, falloff(fromHearth, FIRE_REACH));
    // Out in the street the room isn't heard at all.
    const away = this.staging || this.outdoors;
    audio.setLayer("fire", away ? 0 : fire);
    audio.setLayer("crowd", away ? 0 : crowd * (inBedroom ? CROWD_BEDROOM_LEVEL : 1));
    audio.setLayer("stew", !away && bubbling ? falloff(fromHearth, STEW_REACH) : 0);
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
      else {
        this.keyNav.update(this.navRoot());
        this.handlePanelKeys();
      }
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
    // The menu cursor goes first and uses up the keys it acts on, so an E that picks from a menu isn't also taken
    // as the screen's own E.
    this.keyNav.update(this.navRoot());

    this.time += dt;
    // Time stands still while you're looking at the plans.
    if (this.screen !== "build" && !this.closetOpen) this.clock.update(dt);
    this.syncStripped();
    this.syncShowPose();
    this.syncCoat();
    this.syncArousal(dt);
    this.syncFace(dt);

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
      // A leer to her face gets to her (lewdtalk.ts, KP's waitress talk).
      for (const id of this.chatter.takeLeers()) tavern.heardLeer(id);
    } else if (this.screen === "visitor") {
      this.updateVisitor(dt);
    }

    this.drinkComic.update(dt);
    if (this.fightQueue.length > 0 && (this.fightQueueWait -= dt) <= 0) this.nextFightMoment();
    this.touchComic.update(dt);
    this.battleView.update(dt);
    this.foeColumn.update(dt);
    this.updateShake(dt);
    this.syncGuests(dt);
    this.messLayer.sync(this.tavern.messes, dt);
    this.updateBell(dt);
    this.updateBedroomDoor(dt);
    this.updateUpstairs(dt);
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

/** The card for a new passive: what it gives, what it costs, and what it opens up (a role-play it unlocks). */
function passiveToast(def: PassiveDef): Toast {
  const opens = ROLE_PLAYS.filter((p) => p.needs === def.id).map((p) => `+ Unlocks the "${p.name}" role-play After Hours`);
  return {
    tone: "passive",
    tag: "New passive",
    title: def.name,
    lines: [`+ ${def.benefit}`, ...(def.cost ? [`- ${def.cost}`] : []), ...opens],
    icon: PASSIVE_ICONS[def.group],
  };
}

/** What a level in a stat or skill does for her, in a line. */
function levelLine(id: StatId | SkillId): string {
  const stat = STATS.find((s) => s.id === id);
  if (stat) return `+ ${stat.does}`;
  if (BODY_SKILLS.some((s) => s.id === id)) return "+ Touches there need less desire, warm you faster and pay more";
  return "+ Better at it on the table and After Hours";
}

/** The passive group whose picture fits a stat or skill. */
function groupOfSkill(id: StatId | SkillId): PassiveGroup {
  if (id === "charm" || id === "mind") return id;
  if (id === "strength" || id === "agility" || id === "endurance") return "brawler";
  if (BODY_SKILLS.some((s) => s.id === id)) return id as PassiveGroup;
  return "afterHours";
}

/** "2 cups and a dish", for what she's broken. */
function brokenWords(broken: Record<Ware, number>): string {
  const word = (n: number, one: string, many: string) => (n === 1 ? `a ${one}` : `${n} ${many}`);
  const parts = [broken.cup > 0 ? word(broken.cup, "cup", "cups") : "", broken.dish > 0 ? word(broken.dish, "dish", "dishes") : ""];
  return parts.filter(Boolean).join(" and ");
}

/** Where she stands on the Village Ledger, for the morning report. */
function ledgerLine(tavern: Tavern): string {
  const above = tavern.houseAbove;
  const where = `You're ${ordinal(tavern.rank)} of 6 in Tarven, with ${tavern.fans} fans.`;
  return above ? `${where} Next: ${above.name}, at ${above.fans}.` : where;
}

/** What she owes the Baron, for the morning report. */
function debtLine(tavern: Tavern): string {
  if (tavern.bookPromised) return "Pell wants the book you promised him.";
  if (tavern.owed === 0) return "";
  return tavern.arrears > 0 ? `You owe the Baron ${tavern.owed} gold, and you're ${tavern.arrears} behind.` : `You owe the Baron ${tavern.owed} gold.`;
}
