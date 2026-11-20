import { fightTier } from "./fightface";
import type { LewdPart } from "./brawlai";
import { LEER_SHARE, talkGain } from "./lewdtalk";
/** Her dom side that unlocks KP's Deny Ejaculation in a brawl. */
const DENY_UNLOCK = 10;
import { growthOf, rentRooms, RIOT_AFTER, RIOT_PUT_DOWN, RIOT_TROUBLE, runShow, type Growth } from "./sidejobs";
import { TRINKET_BY_ID, TRINKET_SLOTS, TRINKETS, trinketsOwned } from "./trinkets";
import { crowdFactor, defeatFor, defeatLine, defeatPlay, DEFEATS, defeatWords, type DefeatId } from "./defeat";
import type { ScenePoseName } from "./sexpose";
import { foePrefixFor } from "./foeprefix";
import { barVoice, HER_BAR_LINES, type BarMoment } from "./barher";
import { BAR_VOICES, QUIP_LUST, REACH_PART } from "./barvoices";
import { DOOR_CREW_LINES, DOOR_LINES, FORCED_ROOM_CREW, FORCED_ROOM_ONE, invaderCount, invasionChance, NOISE_LINES, TALKED_LINES, WON_LINES } from "./invasion";
import { brawlFatigue, duelFatigue, FATIGUE_MAX, FATIGUE_REST, fatigueLevel, maxEnergy, NAP_ENERGY } from "./herstate";
import { cloneLayout, type HouseLayout } from "./house";
import {
  ARC_AFTERMATH_SEEN,
  arcCardLines,
  arcDawnStep,
  arcIndex,
  arcSeenFor,
  arcStage,
  corruptionDawnStep,
  CORRUPTION_TIERS,
  corruptionTier,
  flavorLine,
  herLegendNight,
  LEGEND_AT,
  LEGEND_FALL,
  LEGEND_RISE,
  legendCardLines,
  legendStep,
  newLegend,
  readLegend,
  TANSY_CALLBACK,
  type ArcFacts,
  type ArcStage,
  type LegendState,
  wildSensitivity,
} from "./lewd";
import { cardLines, cardTitle } from "./tropes";
import { faceLine } from "./facetalk";
import {
  JOIN_CHEERS,
  JOIN_LINES,
  joinChance,
  LAST_CLEAR_LINES,
  LAST_CLEAR_THOUGHT,
  WHOLE_ROOM_LINES,
  ONE_MORE_WARNING,
  PASS_OUT_AFTER,
  passOutLimit,
  PASS_OUT_LINES,
  PASS_OUT_RESPECT,
  REDRESS_LINES,
  REDRESS_ON_AT,
  REDRESS_SECONDS,
  REDRESS_PATIENCE,
  roomNerve,
  SOBER_NIGHT_SERVED,
  TRAY_DROP_LINES,
  trayDropChance,
} from "./barwork";
import { arrivalFeelings, arrivalMood, feltMood, HIGH_RESPECT, LOW_RESPECT, MOOD_LABELS, STRONG_LUST, moodAfterDrink, moodAfterReply, moodWhenServed, moodWhileWaiting, MOOD_BEHAVIOUR, type Mood } from "./mood";
import {
  complimentReplies,
  COMPLIMENTS,
  FAVORS,
  newPersona,
  OFFERS,
  pickLine,
  readPersona,
  REMARKS,
  shiftPersona,
  stripPiece,
  stripReplies,
  type BanterContext,
  type Persona,
  type PlayerBody,
  type Reply,
  type StripPiece,
} from "./banter";
import { legwearOverGroin, piecesOff, stripLadder, topPull } from "./wardrobe";
import {
  adultTouch,
  afterLine,
  answerLabel,
  desireNeeded,
  fillPiece,
  LEAN_MARGIN,
  nerve,
  newTouchMemory,
  pickTouch,
  reachChance,
  readTouchMemory,
  thoughtTier,
  intensityBonus,
  LAYER_BONUS,
  LAYER_LINES,
  layersOpen,
  LEWD_REGIONS,
  openness,
  pickLayer,
  touchAnswers,
  touchLands,
  touchOutcome,
  type TouchAnswer,
  type TouchDef,
  type TouchLayer,
  type TouchMemory,
  type TouchRegion,
} from "./touch";
import {
  FIRST_INVITE_PAUSE,
  FIRST_REACH_MAX,
  FIRST_REACH_THOUGHT,
  FIRST_REFUSAL,
  GUEST_TOO_DRUNK,
  PULLS,
  SLAPS,
  TOO_DRUNK_TO_ALLOW,
  WAVERED,
  WORN_THIN,
} from "./touchtalk";
import { GIVE_IN_TEXTS, IMPULSE_LINES } from "./touchtalk-givein";
import { KINK_TALK, kinkOf, type Kink } from "./kinktalk";
import { speakerIndex } from "./chatter";
import { DEBUFF_IDS, DEBUFFS, type Debuff, type DebuffId } from "./debuffs";
import {
  BEATS,
  COLLECTION,
  DOUBLED_DEBT,
  FANS_DELIGHTED,
  FANS_FILTHY,
  FANS_HAPPY,
  FANS_WALKOUT,
  FILTHY_AT,
  HOUSE_BY_ID,
  HOUSES,
  LATE_EVERY,
  PARTNER_FANS,
  PARTNER_GOLD,
  POACHED,
  rankOf,
  RIVAL_MOVE_CHANCE,
  rivalMoveLine,
  RUIN_CORRUPTION,
  RUIN_HEAT,
  SIDE_INTROS,
  SIDE_RUMORS,
  type Beat,
  type HouseDef,
  type HouseFate,
  type HouseId,
  type RivalMove,
  ordinal,
  PELL_AT_DAWN,
  DEFY_HEAT,
  DEFY_TRUST,
  EAR_COLLECTION,
  EAR_CORRUPTION,
  EAR_TRUST,
  NAME_CORRUPTION,
  PELL_DEFIED,
  PELL_DEFY,
  PELL_EAR,
  PELL_EARS,
  PELL_PROMISE,
  PELL_REFUSE,
  pellOpening,
  SHADY_AT,
  type PellAnswer,
} from "./ledger";
import { countWillNight, findLetter, findNextLetter, LETTER_BY_ID, letterLines, newLetterState, queueLetters, readLetters, saveLetters, type LetterId, type LettersSave, type LetterState } from "./letters";
import { addFanNight, CHAPTER_ENDINGS, chapterEndingFor, HOUSE_GROUP, isChapterEnding, newFanGroups, readFanGroups, type ChapterEndingId, type FanGroups } from "./chapter1";
import {
  partToSee,
  PART_WORDS,
  ROOM_LUST,
  showChance,
  SHOWN_BOLD,
  SHOWN_DESIRE,
  SHOWN_LUST,
  SHOW_AFTER,
  SHOW_ASKED_BONUS,
  SHOW_ASKED_MARK,
  SHOW_ASKS,
  SHOW_GOLD,
  SHOW_HOW,
  SHOW_LABELS,
  SHOW_METER,
  SHOW_NEED,
  SHOW_NO_LABEL,
  SHOW_NOT_READY,
  SHOW_NOT_WEARING,
  SHOW_PARTS,
  SHOW_THOUGHTS,
  SHOW_SIDES,
  SHOW_TOLD,
  SHOW_TOLD_ONE,
  SHOW_TOO_DRUNK,
  SHOW_UNDER,
  type ShowPart,
  type ShowSide,
} from "./show";
import {
  grabChance,
  GRAB_CAUGHT,
  GRAB_CAUGHT_THOUGHTS,
  GRAB_LET,
  GRAB_LET_LINES,
  GRAB_AT_ORDER,
  GRAB_LETS_GO,
  GRAB_MOVES,
  GRAB_SAYS,
  GRAB_SLAP,
  GRAB_SLAP_LINES,
  GRAB_THOUGHTS,
  GRAB_TWIST,
  GRAB_TWIST_LINES,
  type GrabAnswerLines,
} from "./grab";
import { START_TITLE, TITLE_BY_ID, TITLES, titleEarned, TWO_SLOTS_FAME } from "./titles";
import {
  EDICT_FAME_BONUS_AT,
  EDICT_POINTS_PER_DAY,
  EDICT_START_POINTS,
  edictPosts,
  edictStaff,
  edictState,
  TAVERN_RULE_BY_ID,
  type TavernRuleId,
} from "./tavernrules";
import {
  earnsRegular,
  newMarks,
  nextName,
  readRegulars,
  REGULAR_RETURNS,
  REGULARS_A_NIGHT,
  REGULARS_PER_KIND,
  regularNerve,
  returnChance,
  settleNight,
  type NightMarks,
  type Regular,
} from "./regulars";
import { FOLLOW_UP_BY_ID, followUpsAfter, type FollowUp } from "./favors";
import { HOUSE_RULES, Lantern, LANTERN_COST, ROOM_COST, type HouseRule, type LanternHost, type LanternSave, type RuleChoice } from "./lantern";
import {
  APPLICANTS_EVERY,
  arcDue,
  FRIEND_AT,
  FRIEND_TIME,
  hire,
  hireable,
  lewdWork,
  metAt,
  nightFor,
  perkNightly,
  playBeat,
  POSTING_FEE,
  readStaffMember,
  rollApplicants,
  STAFF_CAP,
  STAFF_PERK_BY_ID,
  type ArcBeat,
  type StaffDef,
  type StaffJob,
  type StaffMember,
  type Stage as StaffStage,
} from "./staff";
import {
  FEED_COST,
  FLYER_COST,
  handOutFlyers,
  marketPackCost,
  marketReplaceCost,
  MAX_ERRAND_GUESTS,
  postOnFeed,
  type ErrandResult,
  type FlyerFacts,
} from "./errands";
import { blockedReason, TOWN_PLACES, type TownOutcome, type TownPlaceId, type TownState } from "./townplaces";
import type { SeenEffect } from "./beingseen";
import { CAREERS, newCareers, nightlyPay, readCareers } from "./careers";
import * as Hall from "./townhall";
import * as Act2 from "./act2";
import * as Act3 from "./act3";
import { biggestFanGroup } from "./chapter1";
import {
  BAR_CHANCE,
  churchDay,
  DEVOTEE_FANS,
  helpRecruit,
  newRecruits,
  readRecruits,
  RECRUIT_IDS,
  recruitCard,
  RECRUITS,
  warnRecruit,
  type RecruitId,
  type RecruitOutfit,
} from "./recruits";
import {
  CENTREPIECE_MAX,
  centrepieceCrowd,
  DEFAULT_REVEL,
  REVEL_GROUP_LINES,
  REVEL_OPEN_LINES,
  REVEL_STOP_LINES,
  REVEL_UNLOCK,
  revelDawn,
  revelGuests,
  revelNight,
  revelUnlocked,
  type RevelDoor,
  type RevelPart,
  type RevelSettings,
  type RevelWho,
} from "./revel";
import * as Feed from "./feedstar";
import * as Knight from "./knight";
import * as Guild from "./guild";
import * as Field from "./questfield";

// ---------- Feed Star, the Knight path and the Guild (feedstar.ts, knight.ts, guild.ts) ----------

/** The staff friend behind each sponsor (staff.ts ids): breaking her deal costs their loyalty. */
const FEED_SPONSOR_STAFF: Readonly<Record<Feed.SponsorId, string | null>> = { brunhild: "bru", edda: "edda", warmhouse: null };
/** A live stream: how many chat requests, and how long it runs (seconds). */
const FEED_STREAM_REQUESTS = 5;
const FEED_STREAM_SECONDS = 32;
/** The chat's dares, by boldness: placeholders until the stream overlay and its lines are written. */
const FEED_DARES: Readonly<Record<Feed.Boldness, readonly string[]>> = {
  0: ["Pour one on camera!", "Show us the stew!", "Say hi to my mum!"],
  1: ["Twirl for us!", "Blow the chat a kiss!", "Show us tonight's dress!"],
  2: ["Lean over the bar for us...", "Lose the apron?", "Show a bit more leg!"],
  3: ["Top off for a hundred tips!", "Nothing but the apron, go on!", "Turn around and bend over?"],
};
/** Who she fights when a patrol choice comes to blows. */
const PATROL_FOES: Readonly<Record<string, GuestKind>> = { thief: "fugitive", fight: "farmer", soldier: "soldier", escort: "bandit", cart: "smuggler" };
/** A brawl outside the taproom, and what it's for. */
type SideFight =
  | { kind: "tourney" }
  | { kind: "commander" }
  | { kind: "patrol"; eventId: string; choiceId: string }
  | { kind: "quest"; encounter: number; optionId?: string; monsters?: readonly Field.MonsterSpec[] };
/** Her stamina going out on a quest (guild.ts, fight.ts's scale), before what her Level adds. */
const GUILD_STAMINA = 20;
/** The guest kind a monster brawls as (its voice, if it ever speaks); its name and numbers are its own. */
const MONSTER_BRAWL_KIND: GuestKind = "adventurer";
/** A monster's id in a brawl: its place in the pack, below zero and clear of every guest's and the -1 of side fights. */
export const questMonsterId = (index: number): number => -100 - index;
/** A foe's name to start a line: "the rat king" → "The rat king". */
const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
/** The guild counter in her taproom, the guild master's first step (A rank). */
export const GUILD_COUNTER_COST = 100;

/** Her guild card (guild.ts): rank, points, quests done and failed, a legend's deed, her party, injuries, and the hall once she runs it. */
export interface GuildCard {
  rank: Guild.GuildRankId;
  points: number;
  quests: number;
  failed: number;
  deed: boolean;
  party: Guild.Companion[];
  injuries: Guild.Injury[];
  counter: boolean;
  master: boolean;
  cut: Guild.QuestCutId;
  mood: number;
  members: number;
  /** The quest she's taken off the board and not yet walked (questfield.ts), or null. */
  accepted: string | null;
}

/**
 * A quest she's out walking (questfield.ts, questmap.ts): its encounters in order, the map, and what's come of each
 * so far. Not saved: a save made out there loads at home, with the quest still accepted.
 */
export interface QuestRun {
  quest: Guild.QuestTemplate;
  encounters: Guild.Encounter[];
  rival: boolean;
  plan: Field.FieldPlan;
  /** Each encounter's result once it's settled, null until then. */
  results: (Guild.EncounterResult | null)[];
  stamina: number;
  maxStamina: number;
  injuries: Guild.Injury[];
  loot: string[];
  gold: number;
  points: number;
  fans: number;
  corruption: number;
  /** Hikari's Hero's Luck, unspent. */
  luck: boolean;
  collapsed: boolean;
  captured: Guild.ExpeditionResult["captured"];
  /** Monsters she's put down, and the experience it's earned her. */
  kills: number;
  xp: number;
}
/** How much less guests wait on a night she keeps checking her phone (Feed Star's Refresh, Refresh). */
const PHONE_PATIENCE = 0.05;

/** One line of a set, by a roll from 0 to 1. */
function oneOf(lines: readonly string[], roll: number): string {
  return lines[Math.floor(roll * lines.length) % lines.length];
}
import { DESIRE_STRONG, HORNY_AT, horny, wet } from "./desire";
import { adultPlayChance, aroused, lewdnessEase, TABLE_COMES, TABLE_DRUNK, tableOpen } from "./adultplay";
import {
  autoTouchFits,
  DIFFICULTIES,
  defaultTouchSettings,
  GROUPS_OF_REGION,
  impulseCheck,
  impulsive,
  type ImpulseCheck,
  type ImpulseFacts,
  type TouchSettings,
} from "./touchsettings";
import { Fight, MAX_FOES, TROUBLE_SHOUTS, type Foe, type FighterStats, type FightMove, type FightOutcome, type FoeSpec } from "./fight";
import type { StrikeAim, StrikeResult } from "./brawlaim";
import { ROLE_PLAYS, type RolePlay } from "./duellines";
import { coatStages, type CoatSection, type CumSpot } from "./cum";

import { BRAWL_HERE_CREW, BRAWL_HERE_ONE, BRAWL_ROOM_CREW, BRAWL_ROOM_ONE, BRAWL_YARD_CREW, BRAWL_YARD_ONE, INVITE_ASKS, INVITE_CHOICE, INVITE_CHOICE_ROOM, INVITE_HUSH, INVITE_ROOM_YES, JOIN_ASKS, JOIN_ASKS_WOMEN, pickLine as storyLine, FORCED_HERE_CREW, FORCED_HERE_ONE, TABLE_OPEN_LINES, TAPROOM_END, TAPROOM_MORNING, TAPROOM_START } from "./invitetalk";
import {
  isBaron,
  isLocal,
  roomReaction,
  STIR_EVERY,
  STIR_PER_GIVE_IN,
  STIR_PER_MOVES,
  TAPROOM_TIP,
  taproomResult,
  wantsToJoin,
  willingJoiners,
  type RoomGuest,
} from "./taproom";
import { AREA_NAMES, Duel, DUEL_AREAS, type DuelArea, type DuelDefeat, type DuelistStats, type DuelMove, type DuelOutcome, type DuelTest, type Partner } from "./duel";
import {
  ACT_SKILL_OF,
  ACT_SKILLS,
  BODY_SKILLS,
  bodySkillBonus,
  charmBonus,
  levelOf,
  mindBonus,
  nameOfSkill,
  readExperience,
  SKILL_OF_REGION,
  STATS,
  type Experience,
  type SkillId,
  type StatId,
} from "./skills";
import {
  desireCap,
  desireCaps,
  effectsOf,
  emptyMeters,
  lewdnessOf,
  lewdWord,
  METER_NAMES,
  INTIMATE_REGIONS,
  METER_OF,
  METERS,
  newlyEarned,
  PASSIVE_BY_ID,
  newRecords,
  noEffects,
  readProgress,
  ROUGH_TOUCHES,
  type Effects,
  type Meter,
  type Meters,
  type PassiveDef,
  type PassiveFacts,
  type ProgressSave,
  type Records,
  type UpstairsAct,
} from "./passives";
import { GUEST_KIND_LIST, ROLES, ROLES_OF, roleLabel, rollStats, statsOf, type GuestRole, type RoleStats } from "./guestroles";
import { ALLOW_WILL, DRINK_WILL, LEAN_WILL, maxWillpower, NAP_RESTORE, refuseCost, STEADY_WILL } from "./willpower";
import { applyFields, captureFields } from "./moment";
import {
  BRAWL_HERE_LOG,
  crowdOf,
  type Crowd,
  BRAWL_ROOM_LOG,
  BRAWL_YARD_LOG,
  CLOSE_LOG,
  DESIRE_STRONG_LOG,
  EDGE_LOG,
  FORCED_FLOOR_LOG,
  GAME_LOST_LINE,
  GAME_LOST_LOG,
  GAME_STOPPED_LOG,
  GAME_WON_LINE,
  GAME_WON_LOG,
  GRAB_GOLD_LOG,
  GRAB_LOG,
  HEARD_YOU_LOG,
  HORNY_LOG,
  INVADED_DOWN_LOG,
  MORE_OFF_LOG,
  PIECE_OFF_LOG,
  REVEL_ASK_LOG,
  REVEL_CENTRE_FORCED_LOG,
  REVEL_MISSED_LOG,
  REVEL_TOO_DRUNK_LOG,
  SHOWED_LOG,
  SHOW_OFFER_LOG,
  TABLE_END_LOG,
  TABLE_START_LOG,
  TABLE_STOP_LOG,
  fillLog,
  pickLog,
} from "./loglines";
import {
  BOTTLE_MARKUP,
  bottlesDearer,
  DEEDS_IN_ORDER,
  FLAG_NEWS,
  isPlotFlag,
  needMet,
  nightOpening,
  SALT_STEW_GOLD,
  SILAS_ARRIVES,
  silasDue,
  type ChoiceNeed,
  type Deed,
  type PlotFlag,
} from "./plot";

/**
 * The rules of the game, with no graphics. The view layer tells this class what
 * the player did and reads the state back, which keeps the rules unit-testable.
 */

/** The drinks bought by the bottle and poured at the shelf behind the bar, on top of the ale on tap. */
export type Bottle = "wine" | "mead" | "vodka";
export type Item = "ale" | Bottle | "bread" | "stew" | "cask";
export type GuestKind = "farmer" | "smuggler" | "soldier" | "fugitive" | "adventurer" | "bandit" | "noble";
export type Station = "tap" | "shelf" | "bread" | "pot" | "barrel" | "bin" | "wash";
/** What food and drink are served on. The tavern owns a set number of each, and they have to be washed to be used again. */
export type Ware = "cup" | "dish";
/** What can be in your hands: something to serve, or a stack of dirty dishes on the way to the tub. */
export type Held = Item | "dirty";
/** A day: closed while it's light, "dusk" once the bell rings and the tavern waits for nightfall, then
 * the night's service and last call. "bedtime" is the closed tavern after last call, until you go to bed,
 * and "dawn" is the morning after. The world clock, not the tavern, decides when night falls. */
export type Phase = "day" | "dusk" | "service" | "lastcall" | "bedtime" | "dawn" | "ended";
/** Something she gained, for the game to show as it happens: a stat or skill level, or her kink changing. */
export type Gain =
  | { kind: "level"; id: StatId | SkillId; name: string; level: number }
  | { kind: "kink"; from: Kink; to: Kink }
  /** Her Level or her Slut Level went up (with the word for how far she's come, for the Slut Level). */
  | { kind: "rank"; which: "level" | "slut"; level: number; word?: string }
  /** She earned a title. */
  | { kind: "title"; id: string }
  /** Something went badly, and she carries it for a while (debuffs.ts). */
  | { kind: "debuff"; id: DebuffId; level: number };
export type GuestStatus = "arriving" | "waiting" | "eating" | "leaving";
export type PotState = "empty" | "cooking" | "ready" | "burnt";
export type Target =
  | { kind: "station"; station: Station }
  | { kind: "guest"; id: number }
  | { kind: "mess"; id: number }
  | { kind: "bell" }
  | { kind: "bed" }
  | { kind: "door" }
  | { kind: "desk" }
  | { kind: "book" }
  | { kind: "bath" }
  /** Her closet in the bedroom, to change her clothes. */
  | { kind: "closet" }
  /** Out through the front door by day ("out"), or a place on the high street (street.ts), which says its own label. */
  | { kind: "street"; place: string; label: string };
/** A sound the rules ask for. What each one actually sounds like is up to the audio layer. */
export type Cue =
  | "pour" | "aleReady" | "takeAle" | "takeBread" | "takeStew" | "takeCask" | "putDown" | "refill"
  | "stewStart" | "stewReady" | "stewBurnt" | "serve" | "tip" | "buy" | "drink" | "guestIn" | "walkOut"
  | "doorOpen" | "doorClose" | "smashTray" | "smashOne" | "drop" | "dishes" | "wipe" | "rumor" | "call" | "order";
const TAKE_CUES: Record<Item, Cue> = {
  ale: "takeAle",
  wine: "takeAle",
  mead: "takeAle",
  vodka: "takeAle",
  bread: "takeBread",
  stew: "takeStew",
  cask: "takeCask",
};
/**
 * What a night leaves behind: dirty dishes on the tables, ale on the floor, and dust tracked in. Cobwebs hang
 * high on the walls: the shut-up tavern is full of them on the first day, and spiders move back in after a
 * night opened dirty.
 */
export type MessKind = "dishes" | "spill" | "dust" | "cobweb";
export type UpgradeId = "quicktap" | "bigpot" | "cushions";
/**
 * The story's endings. For now only Chapter 1's (chapter1.ts), and those are chapter cards read as she becomes first
 * in Tarven, never the end of the run: `ending` and the "ended" phase are kept for the story's last endings, later.
 */
export type EndingId = ChapterEndingId;

export const DEBT = 150;
/** Heat at the most brings a raid instead of an arrest: a fine, the heat let off, and soldiers at the door. */
export const RAID_FINE = 20;
const RAID_COOL = 4;
export const TRUST_MAX = 15;
export const TRUST_TO_OVERTHROW = 13;
export const HEAT_MAX = 8;
export const UPGRADE_COST = 20;

const START_TRUST = 3;
const TAP_SIZE = 8;
const POUR_TIME = 1.5;
const QUICK_POUR_TIME = 0.8;
const STEW_TIME = 8;
/** How long ready stew keeps before it burns. Long enough for one person to serve a pot's worth. */
const BURN_TIME = 40;
const POT_BOWLS = 3;
const BIG_POT_BOWLS = 5;
/** How long someone on their own takes over their food or drink, in seconds: a random time in this range. */
const EAT_ALONE: readonly [number, number] = [18, 28];
/** A party takes longer, because they talk first: long enough for their chat and some table talk after it. */
const EAT_IN_PARTY: readonly [number, number] = [36, 50];
/** A guest with something to let slip lingers, so there's time to overhear it. */
const RUMOR_EXTRA_EAT = 6;
const LISTEN_TIME = 3;
// How popularity moves. Being served well spreads your name; people walking out, or selling them out, doesn't.
const FAME_SERVED = 1;
const FAME_TIPPED = 1;
const FAME_IDOLIZED = 1;
const FAME_WALKOUT = -2;
const FAME_DEEDS = [-6, 8, -3];
const RESPECT_DEEDS = [-2, 2, -1];
/** This drunk in front of the customers, and they stop taking you seriously. */
/**
 * Too drunk to say yes to anything (GAME_PATH.MD, consent rule): the 8th drink in a row (DRINK_STRENGTH 1/8). The 7th
 * is her last clear drink (barwork.ts), and the 9th puts her under the table.
 */
const SLOPPY_DRUNK = 0.95;
/** Staff (staff.ts, STAFF.md §1): mid game from this much gold or this night index; late from this fame. */
const STAFF_MID_GOLD = 150;
const STAFF_MID_NIGHT = 5;
const STAFF_LATE_FAME = 60;
/** The most she can pay any one of them a night. */
export const STAFF_WAGE_MAX = 20;
/** A barmaid on: guests wait this much longer, and she takes this share of the night's serves. */
export const BARMAID_PATIENCE = 0.2;
const BARMAID_SHARE = 0.3;
/** A doorman on: trouble starts this much less often; and at most this many thrown out a night. */
export const DOORMAN_TROUBLE = 0.25;
const DOORMAN_THROWS = 2;
/** A second (or third) on the same post adds this share of the first one's help. */
export const SECOND_POST_SHARE = 0.5;
/** Loyalty a night lost working another job's post, unless cross-trained (tavernrules.ts). */
export const OFF_POST_LOYALTY = 1;
/** The Revel Hall's price on the house plans; and the ids given the revel's partners asking at bedtime. */
export const REVEL_HALL_COST = 200;
const REVEL_CREW_ID = 900000;
/**
 * Bottoms she can hold up in her hands to show a guest (they hang on the model's skirt panels, which lift), and
 * those that stay on as she does, round her waist above it all; anything else comes off.
 */
const LIFTED_SKIRTS: ReadonlySet<string> = new Set(["skirt", "drapes"]);
const KEPT_ON_LIFT: ReadonlySet<string> = new Set(["girdle"]);
/** The drink a pleased guest bought her, as an option: it says whose drink it is, whatever else they've said since. */
export const TIP_DRINK_LABEL = "Drink the one they bought you";
const TIP_DRINK_TOO_DRUNK = "Drink the one they bought you (you've had more than enough)";
export const TIP_DRINK_DECLINE = "Not now, thanks";
/** Bar work: served this many with nobody walking out is a smooth night; this many at all, a busy one. */
const SMOOTH_NIGHT_SERVED = 8;
const BUSY_NIGHT_SERVED = 15;
/**
 * Her Level, Karryn-style: one for every few levels her stats and skills have grown in all. Each one past the
 * first gives her more willpower, more stamina in a brawl, and a little more on everything she's paid.
 */
const LEVELS_PER_LEVEL = 3;
const LEVEL_WILL = 2;
const LEVEL_STAMINA = 1;
const LEVEL_PAY = 0.02;
/** Her Slut Level is her lewdness by tens; every this many pays a gold more on each touch she lets happen. */
const LEWDNESS_PER_SLUT_LEVEL = 10;
const SLUT_LEVELS_PER_GOLD = 2;
/**
 * A foe reaching mid-brawl is bolder than they'd be at the table, Karryn-style: this much more nerve for what they
 * go for (never for whether it lands unasked: that still goes by their own nerve).
 */
const BRAWL_BOLDER = 2;
/** Mid-brawl, a foe's hands go for the part of her their type likes: these parts, this much more often. */
const BRAWL_PREFER_PULL = 2;
/** At the table, a guest goes for the part of her their type likes this much more often (GAME_PATH.MD, section 4). */
const PREFER_PULL = 0.4;
const REGIONS_OF_AREA: Record<DuelArea, readonly TouchRegion[]> = {
  hands: ["hand", "waist"],
  mouth: ["lips", "neck", "face"],
  breasts: ["chest"],
  butt: ["rear"],
  pussy: ["thigh", "intimate"],
};
/** How often a guest full of lust flatters you rather than asking a favor. */
const LUSTY_COMPLIMENT_SHARE = 0.9;
const CUSHION_PATIENCE = 1.25;
// The morning after. Every guest leaves something to clean up, and a dirty room wears on the next night's guests.
/** Patches of dust the night's crowd always tracks in, plus one more for every few guests. */
const DUST_BASE = 3;
const GUESTS_PER_DUST = 3;
/** The first morning: nobody has opened the place since Grandma Wren died, so it's thick with cobwebs and dust. */
const FIRST_DAY_COBWEBS = 5;
const FIRST_DAY_DUST = 6;
/** A night opened with mess still about lets a spider back in. It never gets more webs up than this. */
const MOST_COBWEBS = 4;
/** How much patience guests lose in a filthy room, and how many messes count as filthy. */
const MESS_PATIENCE_LOSS = 0.3;
const MESS_FOR_FULL_LOSS = 8;

// The washing up. Everything served goes out on a cup or a dish, and comes back dirty when the guest is done.
const START_CUPS = 6;
const START_DISHES = 6;

/** Where every new tavern's crowd is rolled from (Tavern.crowdRandom); the tests' setup sets it to null. */
export const crowdDice: { roll: (() => number) | null } = { roll: Math.random };
/** Whether the story runs on fans (Tavern.storyBeats). The tests' setup turns it off: their nights go by number. */
export const storyRules = { beats: true };
/**
 * Whether guests wait for her to take their order (Tavern.takeOrders). The tests' setup turns it off, so guests there
 * say what they want as they sit, the way the tests were written.
 */
export const tableService = { takeOrders: true };

/** Where every new tavern's grabs are rolled from (Tavern.grabRandom); the tests' setup sets it to null. */
export const grabDice: { roll: (() => number) | null } = { roll: Math.random };
/** Where every new tavern's asks for a look are rolled from (Tavern.showRandom); the tests' setup sets it to null. */
export const showDice: { roll: (() => number) | null } = { roll: Math.random };
/** Where every new tavern's adult play is rolled from (Tavern.adultRandom); the tests' setup sets it to null. */
export const adultDice: { roll: (() => number) | null } = { roll: Math.random };

// Who comes in. Each night has its own guests (NIGHTS), but the road isn't the same twice (rollArrivals).
/** Guests walking in on top of the night's own are never more than this. */
export const MAX_EXTRA_GUESTS = 6;
/** The chance a guest she slaps off her at the table takes it badly, and turns angry. */
const GRAB_SLAP_ANGERS = 0.35;
/** How much hornier a guest gets each time she lets them touch her. */
const LUST_PER_LET = 1;
/** After the first night, the chance someone who'd walk in alone stays home instead. */
const STAY_HOME_CHANCE = 0.15;
/** The chance someone walking in alone is someone else: another of the kinds out tonight. */
const SWAP_KIND_CHANCE = 0.3;
/** Someone walking in alone comes up to this many seconds after their time. */
const ARRIVAL_DRIFT = 8;
/** A party, or whoever carries the night's rumor, comes up to this many seconds before or after their time. */
const PARTY_DRIFT = 10;
/** The chance someone walking in alone orders something else off the night's menu than the written order. */
const REORDER_CHANCE = 0.5;
/** The guests on top come in between this many seconds in and this long after the night's last. */
const EXTRA_FIRST = 10;
const EXTRA_TAIL = 15;
/** How many different looks a guest can roll (Guest.look). */
const GUEST_LOOK_SEEDS = 1 << 30;
/** More can be bought from the house plans, this many at a time, for this much, up to what the shelves hold. */
export const STOCK_PACK = 3;
export const STOCK_COST = 10;
export const MAX_WARE: Record<Ware, number> = { cup: 12, dish: 12 };
export const WARE_NAMES: Record<Ware, string> = { cup: "cups", dish: "dishes" };
/** What one broken cup or dish costs to replace, from the house plans: cheaper than a new set. */
export const REPLACE_COST = 2;
const WARE_OF: Record<Item, Ware | null> = {
  ale: "cup",
  wine: "cup",
  mead: "cup",
  vodka: "cup",
  bread: "dish",
  stew: "dish",
  cask: null,
};

// The good stuff. Each drink is bought once from the house plans and stays on the shelf behind the bar for good,
// poured a cup at a time. Once it's in, guests who'd have had ale sometimes ask for their favourite, and pay more.
export const BOTTLE_KINDS: readonly Bottle[] = ["wine", "mead", "vodka"];
export const BOTTLES: Record<Bottle, { name: string; cost: number; extraPay: number; detail: string }> = {
  wine: { name: "Wine", cost: 35, extraPay: 5, detail: "Smugglers ask for it. 5 gold more a cup than ale." },
  mead: {
    name: "Mead",
    cost: 25,
    extraPay: 3,
    detail: "Farmers ask for it. 3 gold more a cup, and the honey warms them up to you.",
  },
  vodka: {
    name: "Vodka",
    cost: 30,
    extraPay: 4,
    detail: "Soldiers and fugitives ask for it. 4 gold more a cup, and it gets them drunk.",
  },
};
/** How often a guest who'd have had ale asks for their favourite instead, when there's some on the shelf. */
const ASKS_FOR_BOTTLE = 0.5;
/** Mead warms a guest's lust by this much; vodka gets a guest drunk this often. */
const MEAD_LUST = 2;
const VODKA_DRUNK_CHANCE = 0.6;
const isBottle = (item: Item | "dirty" | null): item is Bottle => item === "wine" || item === "mead" || item === "vodka";

/** Ale goes on a tray, which holds this many cups. Everything else is carried one at a time. */
export const TRAY_SIZE = 3;

// Drinking. Drunkenness runs from 0 (sober) to 1 (can barely stand).
export const DRUNK_MAX = 1;
/** How much one drink with a table adds. */
const DRINK_STRENGTH = 0.125;

// ---- Desire, pleasure and corruption (see passives.ts) ----
/** What a touch she lets happen adds to its own meter; the rest of her gets a third. Leaning in, half again. */
const TOUCH_DESIRE = 8;
const LEAN_DESIRE = 1.5;
/** What a drink adds to every meter. */
const DRINK_DESIRE = 6;
/** Pleasure for each step of a touch's boldness; at the top she's overwhelmed, which lifts every meter. */
const PLEASURE_PER_LEVEL = 2.5;
const PLEASURE_MAX = 100;
const OVERWHELM_DESIRE = 20;
/** A meter this high at bedtime, and she can't sleep until she's eased the ache. */
const RESTLESS_AT = 50;
/** Every meter this high on one night counts toward "Always Wanting". */
const ALL_HIGH = 60;
/** Respect this high at bedtime counts toward "Iron Will". */
const HIGH_RESPECT_NIGHT = 8;
/** Guests start asking her upstairs once she's this lewd. */
const INVITES_AT = 25;
/** The house can become a brothel once she's this lewd, or this corrupt. Either one is enough. */
const BROTHEL_AT_LEWDNESS = 50;
const BROTHEL_AT_CORRUPTION = 50;
/** A test partner's starting pleasure and stamina, from the test panel; null stamina is full. */
export function applyTestPartner(partner: Partner, setup: { pleasure: number; stamina: number | null } | undefined): void {
  if (!setup) return;
  partner.pleasure = Math.max(0, Math.min(99, Math.round(setup.pleasure)));
  partner.stamina = setup.stamina === null ? partner.maxStamina : Math.max(0, Math.min(partner.maxStamina, Math.round(setup.stamina)));
}

/** How often, in seconds, passives are checked during the night. */
const PASSIVE_CHECK_SECONDS = 0.5;
/** The stakes she can play an after-hours game for. */
const DUEL_STAKES = [0, 5, 10, 20];
/** Experience for each time she does something intimate: with a foe mid-brawl, or on the table (each act once a scene). */
const UPSTAIRS_XP = 5;
/** What she did in a game on the table counts toward her records like her own acts (riding them, like the bed). */
const ACT_OF_DUEL_MOVE: Partial<Record<string, UpstairsAct>> = { kiss: "kiss", hands: "hands", mouth: "mouth", ride: "bed", anal: "behind" };
/** How likely an angry or roaring drunk guest is to start a brawl, each second; at most this many a night. */
const TROUBLE_PER_SECOND = 0.012;
const MAX_FIGHTS = 2;
/** How long trouble brews at their table (the icon over their head, the shouting) before they come for her. */
const TROUBLE_BREWING = 4.5;
/** How long they have to reach her once they're up; if they can't get to her by then, it starts anyway. */
const TROUBLE_COMING = 10;
/** What a guest who knocks her down takes from the till, plus a little more each night. */
const LOST_FIGHT_GOLD = 6;
/** Corruption for each point of greed, each secret sold, each time she informs, and each cold choice. */
const CORRUPT_PER_GREED = 4;
const CORRUPT_PER_SOLD = 10;
const CORRUPT_PER_INFORM = 8;
const CORRUPT_PER_COLD = 3;
/** How fast you sober up, per second. One drink wears off in about half a minute. */
const SOBER_RATE = 0.01;
/** How many drinks one table will pour for you. */
const DRINKS_PER_TABLE = 2;
/** Past this, nobody pours you another. */
const TOO_DRUNK = SLOPPY_DRUNK;
/** What each guest at a table pays towards a jug of ale. */
const JUG_PAY = 3;
/** How much slower ale pours when you're drunk: half as slow again at the worst. */
const DRUNK_FUMBLE = 0.5;
/** How often a guest you served well offers you a drink as their tip, and gets talking. */
const TIP_CHAT_CHANCE = 0.35;
/** Of those, how many pay you a compliment; the rest ask a favor. */
const COMPLIMENT_SHARE = 0.6;
/** What a guest adds when you drink the one they bought you. */
const TIP_DRINK_BONUS = 2;
/** How often a guest also brings up something they've heard about you, when there's something to bring up. */
const REMARK_CHANCE = 0.6;
/**
 * How likely a guest who's drinking with you is to go for your clothes: a little to begin with, more the drunker
 * you are, more again from a lusty or drunk guest, a known flirt, or an innkeeper the room no longer respects.
 */
const DARE_BASE = 0.08;
const DARE_PER_DRUNK = 0.3;
const DARE_LUSTY = 0.25;
const DARE_DRUNK_GUEST = 0.1;
const DARE_FLIRT = 0.1;
const DARE_DISRESPECTED = 0.15;
const DARE_RESPECTED = -0.06;
const DARE_MAX = 0.6;

/** How a party's evening with you is going: drinks shared, a jug on the table, and a guest going for your clothes. */
interface PartyState {
  drinks: number;
  jug: boolean;
  dare: StripPiece | null;
}

/** "Name: \"Words\"" becomes the name and the words; anything else is narration. */
function splitSpeaker(text: string): TalkLine {
  const match = /^([A-Z][A-Za-z ]{0,24}): (".*)$/.exec(text);
  return match ? { speaker: match[1], text: match[2] } : { speaker: null, text };
}

const narrate = (text: string): TalkLine => ({ speaker: null, text });
/** The player's own words. */
const you = (text: string): TalkLine => ({ speaker: "You", text });

/** A word for how drunk the player is, or "" when sober. */
export function drunkLabel(level: number): string {
  // Eight drinks to the top (DRINK_STRENGTH): tipsy at two, drunk at four, very drunk at six, too drunk at eight.
  if (level >= SLOPPY_DRUNK) return "Hammered";
  if (level >= 0.7) return "Very drunk";
  if (level >= 0.45) return "Drunk";
  if (level >= 0.2) return "Tipsy";
  return "";
}
/** Serving with more than this share of patience left earns the tip. */
const TIP_THRESHOLD = 0.5;

export const UPGRADES: Record<UpgradeId, { name: string; detail: string }> = {
  quicktap: { name: "Better tap", detail: "Ale pours almost twice as fast." },
  bigpot: { name: "Bigger pot", detail: "Each pot makes 5 bowls instead of 3." },
  cushions: { name: "Cushions", detail: "Guests wait 25% longer." },
};

export interface Choice {
  label: string;
  result: string;
  gold: number;
  trust: number;
  heat: number;
  /** What a heard choice does with the secret. Without one, it's read from its place: truth, lie, sell. */
  deed?: Deed;
  /** The story flags it sets (plot.ts). */
  sets?: PlotFlag[];
  /** Only offered when this is met (plot.ts `needMet`). */
  needs?: ChoiceNeed;
}

export interface LastCall {
  visitor: string;
  question: string;
  rumor: string;
  heard: Choice[];
  unheard: Choice[];
}

export interface Arrival {
  at: number;
  kind: GuestKind;
  order: Item;
  rumor?: boolean;
  /** Guests with the same party come in together, sit at one table, and talk. An index into the night's parties. */
  party?: number;
  /** Their type in the group; left out, the group's types take turns (a party gets one of each). */
  role?: GuestRole;
  /** Paid by the house above her on the Ledger to start a fight (ledger.ts). */
  hired?: boolean;
  /** A named regular coming back (regulars.ts): they come as themselves, sheet and all. */
  regular?: string;
  /** One of the Warm House's recruits (recruits.ts), as far up the hill as they've gone. */
  recruit?: RecruitId;
}

/** A group of guests who come in together and talk over a table. */
export interface PartyPlan {
  /** What they're saying as you walk up, one line per speaker. */
  chat: string[];
  /** What they go on to say among themselves, in the same form. */
  overheard?: string[];
  /** What they say as they pour you one. */
  offer: string;
  /** What a drink loosens out of them. If the night's rumor is at this table, it comes out too. */
  gossip: string;
  /** A story flag their gossip gives her (plot.ts), such as the soldiers' talk of the Baron's silver. */
  clue?: PlotFlag;
}

export interface NightPlan {
  intro: string;
  guests: Arrival[];
  parties: PartyPlan[];
  lastCall: LastCall;
}

/** What Pell says at dawn (the letter she finds after is Wren's first: letters.ts "pell"). */
const PELL_LINES = PELL_AT_DAWN;
const ordinalOf = ordinal;

const sideNights = new Map<number, NightPlan>();

/**
 * A night between beats (STORY.md "What nights do"): the road brings the usual folk (the second and third written
 * nights' crowds, in turn) and a small side rumour from the pool at last call, never one of the story's own. Who
 * walks in alone is rolled as ever (rollArrivals).
 */
function sideNight(index: number): NightPlan {
  const base = NIGHTS[1 + (index % (NIGHTS.length - 1))];
  let night = sideNights.get(index);
  if (!night) {
    night = {
      ...base,
      intro: `Night ${index + 1}. ${SIDE_INTROS[index % SIDE_INTROS.length]}`,
      lastCall: SIDE_RUMORS[index % SIDE_RUMORS.length],
    };
    sideNights.set(index, night);
  }
  // The written night's guests, as they are now (the tests swap them for their own).
  night.guests = base.guests;
  return night;
}

const arrive = (at: number, kind: GuestKind, order: Item, rumor = false, party?: number, role?: GuestRole): Arrival => ({
  at,
  kind,
  order,
  rumor,
  party,
  role,
});

export const NIGHTS: NightPlan[] = [
  {
    intro: "Night 1. Ale is at the bar, bread is in the basket by the oven. Take dirty cups and dishes to the wash tub by the barrels. Press E to act.",
    guests: [
      // A gentle first night: five guests, one every 15 seconds or so, so she can learn the tap, the bread and the tub.
      arrive(5, "farmer", "ale"),
      arrive(20, "farmer", "bread", false, 0),
      arrive(20, "farmer", "ale", false, 0),
      arrive(40, "smuggler", "ale", true),
      arrive(60, "soldier", "bread"),
    ],
    parties: [
      {
        chat: [
          "Farmer: \"Snow's coming early to the pass this year. I can smell it.\"",
          "Other farmer: \"Snow or no snow, the baron's men will still want their toll.\"",
          "Farmer: \"Innkeeper! Sit with us a moment, you look like you need it.\"",
        ],
        overheard: [
          "Farmer: \"Did you pay Hollin back for the seed?\"",
          "Other farmer: \"With what? I paid him in promises.\"",
          "Farmer: \"He's got a barn full of those.\"",
          "Other farmer: \"Then he can plant them. They'll come up as well as the barley did.\"",
          "Farmer: \"It wasn't always like this. Remember the year of the plums?\"",
          "Other farmer: \"I remember the toll they put on plums.\"",
          "Farmer: \"They can't tax a thing if we eat it first.\"",
          "Other farmer: \"Don't say that too loud. They'll start charging by the mouthful.\"",
        ],
        offer: "The farmer slides a cup across. \"To the harvest, what's left of it.\"",
        gossip: "\"Between us, half the valley's behind on what they owe. The baron can't foreclose on all of us.\"",
      },
    ],
    lastCall: {
      // STORY.md section 9, beat 1. Each choice sets a story flag (plot.ts), and the nights after read it.
      visitor: "Pell, the baron's tax collector",
      question: "Wren and I were old friends, you know. Someone is running untaxed salt over this pass. Who have you heard talking?",
      rumor: "Silas the smuggler told Mara Holt the salt is safe under Oden's floor, at the chapel.",
      heard: [
        { label: "Tell the truth: the chapel floor", result: "Pell smiles and writes it down. By morning the village knows who talked, and Brother Oden's door is shut.", gold: 5, trust: -3, heat: -2, sets: ["odenShut"] },
        { label: "Lie: send him to the empty quarry", result: "Pell leaves for the quarry. Silas's crew quietly leave you a thank-you.", gold: 0, trust: 2, heat: 1, sets: ["silasOwes"] },
        { label: "Sell it: name your price", result: "Pell pays well and despises you for it. Only three people knew. Silas can count.", gold: 25, trust: -2, heat: 0, sets: ["silasAngry"] },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "He doesn't believe you, and he makes a note of your name.", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays for your story. He will be back when it proves false.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
  {
    intro: "Night 2. Stew is on the menu. Start the pot at the fire early, and serve it before it burns.",
    guests: [
      // Ten guests over 70 seconds: the two tables first, and the adventurers' party of four last, once the room has cleared.
      arrive(5, "farmer", "stew"),
      arrive(18, "fugitive", "stew", true, 0),
      arrive(18, "smuggler", "ale", false, 0),
      arrive(35, "soldier", "ale", false, 1),
      arrive(35, "soldier", "bread", false, 1),
      arrive(52, "farmer", "ale"),
      arrive(70, "adventurer", "ale", false, 2),
      arrive(70, "adventurer", "stew", false, 2),
      arrive(70, "adventurer", "bread", false, 2),
      arrive(70, "adventurer", "ale", false, 2),
    ],
    parties: [
      {
        chat: [
          "Smuggler: \"Keep your voice down. Half this room drinks with the garrison.\"",
          "Pale stranger: \"I know. I know. I just need to get over the ridge.\"",
          "Smuggler: \"Innkeeper. Join us. A friendly face makes a quiet table.\"",
        ],
        overheard: [
          "Pale stranger: \"That one by the fire keeps looking over.\"",
          "Smuggler: \"They're looking at the fire. Laugh at something.\"",
          "Pale stranger: \"I can't remember how.\"",
          "Smuggler: \"Then cough. Anything. You look like someone at their own hanging.\"",
          "Pale stranger: \"How do you stand it? Every night, like this?\"",
          "Smuggler: \"You get used to it. Or you get caught. It settles itself.\"",
          "Pale stranger: \"You're not a comfort.\"",
          "Smuggler: \"I'm not paid to be. Eat your stew.\"",
        ],
        offer: "The smuggler pours without asking. \"Drink. Nobody listens to a table that's laughing.\"",
        gossip: "The stranger's hands stop shaking after a second cup, and they lean in close.",
      },
      {
        chat: [
          "Soldier: \"Three weeks on this road and not one decent bed.\"",
          "Other soldier: \"Shut it. The sergeant's got ears in every tavern on the pass.\"",
          "Soldier: \"Innkeeper! Drink with the baron's finest, eh?\"",
        ],
        overheard: [
          "Other soldier: \"Pike says we're to double the watch on the ridge.\"",
          "Soldier: \"With who? Half the fort's got the flux.\"",
          "Other soldier: \"Then the other half's on double watch.\"",
          "Soldier: \"Who's even coming over the ridge in this?\"",
          "Other soldier: \"Somebody's got the captain in a sweat.\"",
          "Soldier: \"The captain sweats if you hand her a spoon.\"",
          "Other soldier: \"Keep that to yourself.\"",
          "Soldier: \"I keep everything to myself. It's all I've been paid in.\"",
        ],
        offer: "The soldier bangs a cup down in front of you. \"To the baron! May he choke on it.\"",
        gossip: "\"Word is the baron's short of silver himself. That's why he's squeezing every inn on the road.\"",
        clue: "heardSilver",
      },
      {
        chat: [
          "Warrior: \"Four ales! No, three ales and whatever the mage drinks!\"",
          "Mage: \"Stew. And a table that isn't moving, if you have one.\"",
          "Archer: \"Ruins on the north road by noon tomorrow. Kestrel says so.\"",
          "Cleric: \"Innkeeper, sit with us. You look like you've been fighting all night.\"",
        ],
        overheard: [
          "Archer: \"How many steps down did Kestrel say?\"",
          "Warrior: \"A hundred. Or a thousand. She was drunk.\"",
          "Mage: \"The map says forty. The map was drawn by a man who died there.\"",
          "Cleric: \"Then we go down thirty-nine and see how we feel.\"",
          "Warrior: \"I'll go first. I always go first.\"",
          "Archer: \"You always go first because you can't read the map.\"",
          "Mage: \"Nobody can read the map. That's why the gold is still there.\"",
          "Cleric: \"Drink up. Tomorrow we're rich, or we're a song.\"",
        ],
        offer: "The warrior thumps a cup down in front of you. \"To the gold under the hill, and whoever's mad enough to fetch it!\"",
        gossip: "\"Kestrel's been east, you know. Says there's a prisoner in the salt mines out there who swears he's from Tarven.\"",
      },
    ],
    lastCall: {
      // STORY.md section 9, beat 2. Hiding Ash is only offered if she protected Silas, or has a kind heart (plot.ts).
      visitor: "Garrick Thorne, a bounty hunter",
      question: "I'm tracking a deserter from the baron's army. Calls himself Ash. Did he come through tonight?",
      rumor: "Ash, the pale stranger, whispered that he deserted and crosses the border at dawn.",
      heard: [
        { label: "Tell the truth: the border, at dawn", result: "Garrick pays you the bounty and rides out at once. Nobody speaks to you at the well the next day.", gold: 10, trust: -2, heat: -2, sets: ["ashCaught"] },
        { label: "Lie: point him back down the valley", result: "Garrick rides the wrong way. Someone leaves flowers on your step.", gold: 0, trust: 1, heat: 1 },
        { label: "Sell it: name your price", result: "Garrick counts the coins onto the bar without looking at you.", gold: 25, trust: -2, heat: 0, sets: ["ashCaught"] },
        {
          label: "Hide him in the cellar",
          result: "You take Ash down the cellar steps before Garrick has finished his ale. Garrick leaves with nothing, and a long look back at you.",
          gold: 0,
          trust: 2,
          heat: 2,
          deed: "protect",
          sets: ["ashHidden"],
          needs: "shelter",
        },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "He shrugs and tells you the baron hates a blind innkeeper.", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "He pays you for it. He does not look like a forgiving man.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
  {
    intro: "Night 3. The road is busy, so keep moving.",
    guests: [
      // The busiest night, but still breathing room: thirteen guests over 105 seconds, a table every 15 or so.
      arrive(5, "soldier", "ale"),
      arrive(15, "farmer", "bread", true, 0),
      arrive(15, "farmer", "ale", false, 0),
      arrive(15, "smuggler", "stew", false, 0),
      arrive(32, "fugitive", "ale"),
      arrive(45, "bandit", "ale", false, 2),
      arrive(45, "bandit", "ale", false, 2),
      arrive(60, "soldier", "bread", false, 1),
      arrive(60, "soldier", "ale", false, 1),
      arrive(75, "smuggler", "stew"),
      arrive(90, "noble", "stew", false, 3),
      arrive(90, "noble", "bread", false, 3),
      arrive(105, "farmer", "ale"),
    ],
    parties: [
      {
        chat: [
          "Old farmer: \"Tomorrow the debt falls due, and then we'll see who owns this valley.\"",
          "Young farmer: \"Hush, grandfather. Not here.\"",
          "Stranger: \"Let the innkeeper sit. Whose side are you on, friend?\"",
        ],
        overheard: [
          "Young farmer: \"You're too loud, grandfather. You always are after two cups.\"",
          "Old farmer: \"At my age you say it while you can.\"",
          "Stranger: \"They're right about the cups, old man.\"",
          "Old farmer: \"I buried a wife and three harvests on that hill. I'll be as loud as I like.\"",
          "Young farmer: \"And if they come for you?\"",
          "Old farmer: \"Then they'll have to carry me. I'm not walking anywhere for that man.\"",
          "Stranger: \"I'd like to have known you when you were young.\"",
          "Old farmer: \"You'd have owed me money.\"",
        ],
        offer: "The old farmer fills your cup to the brim. \"Drink, and then tell me we can trust you.\"",
        gossip: "\"Every family on the pass is in it now. All they need is one night and one place.\"",
      },
      {
        chat: [
          "Soldier: \"The captain wants names by morning. Names, or it's our hides.\"",
          "Other soldier: \"Then let's drink till we've forgotten our own.\"",
          "Soldier: \"Innkeeper! You hear everything. Have one on the baron.\"",
        ],
        overheard: [
          "Other soldier: \"What do we give him, then? For names?\"",
          "Soldier: \"Yours, if you don't drink up.\"",
          "Other soldier: \"I grew up with half these people.\"",
          "Soldier: \"I know you did.\"",
          "Other soldier: \"My aunt keeps geese out by the bridge.\"",
          "Soldier: \"Then don't say her name, and don't think about it.\"",
          "Other soldier: \"Is that an order?\"",
          "Soldier: \"It's the only good advice you'll get in this uniform.\"",
        ],
        offer: "\"Go on, it's the baron's coin.\" The soldier tops your cup up twice.",
        gossip: "\"Half the garrison wouldn't lift a sword if the village came for the baron. Don't tell the captain I said so.\"",
      },
      {
        chat: [
          "Brute: \"Two ales. Big ones.\"",
          "Rogue: \"Nice place. Be a shame if it caught a chill.\"",
          "Brute: \"Corran says hello. Corran says a lot of things.\"",
          "Rogue: \"Sit down, innkeeper. We're friends here. Aren't we friends?\"",
        ],
        overheard: [
          "Rogue: \"The wagon was light. Lighter than they said.\"",
          "Brute: \"Corran'll want to know why.\"",
          "Rogue: \"Corran knows why. Somebody up at the keep skimmed it first.\"",
          "Brute: \"Then who are we robbing?\"",
          "Rogue: \"Whoever we're told to, and we keep our mouths shut.\"",
          "Brute: \"I like this ale. We should protect this place.\"",
          "Rogue: \"We should charge it for the privilege.\"",
        ],
        offer: "The rogue pushes a cup at you, red scarf loose at the throat. \"Drink with us. Friends drink together.\"",
        gossip: "\"Funny thing about the toll wagons. We take them, and the baron never sends anyone after us. Never once.\"",
      },
      {
        chat: [
          "Noble: \"The table is sticky. Have it wiped, and bring the stew.\"",
          "Servant: \"Bread for me, please. Only if it's no trouble.\"",
          "Noble: \"The Baroness sends her regards. She hears your name even in the lowlands.\"",
          "Noble: \"Do sit, innkeeper. I want to know what a pass tavern hears.\"",
        ],
        overheard: [
          "Noble: \"Hesk's road is a disgrace. Ruts like graves.\"",
          "Servant: \"Yes, my lord.\"",
          "Noble: \"When the Baroness holds the keep, the toll will mean something.\"",
          "Servant: \"And if he won't give it up?\"",
          "Noble: \"Men like Hesk always give it up. It's only a question of the price.\"",
          "Servant: \"The stew's good, my lord.\"",
          "Noble: \"It's adequate. Don't tell them. They'll put the price up.\"",
        ],
        offer: "The noble's servant pours for you, and the noble lifts a cup a finger's width. \"To better roads.\"",
        gossip: "\"The crown has an auditor on the road this season. Hesk's books won't survive a careful reader.\"",
      },
    ],
    lastCall: {
      // STORY.md section 9, beat 3. She asks, but she half hopes she won't get an answer. Telling her where the
      // baron's silver goes is only offered if she heard the soldiers' talk of it (plot.ts, `heardSilver`).
      visitor: "Captain Rhea Vance",
      question: "The villagers are meeting in secret against the baron. I'm ordered to ask you where.",
      rumor: "An old farmer said Mara Holt is gathering the village at the mill, the night after the debt falls due.",
      heard: [
        { label: "Tell the truth: the old mill", result: "Rhea closes her eyes for a moment. Her soldiers march for the mill before sunrise, and Mara is taken.", gold: 0, trust: -3, heat: -3, sets: ["maraArrested"] },
        { label: "Lie: the ruins on the north road", result: "Rhea marches her soldiers into the snow, away from the mill. She doesn't look back.", gold: 0, trust: 2, heat: 2 },
        { label: "Sell it: name your price", result: "Rhea pays in the baron's own silver, and won't meet your eye. It feels heavier than it should.", gold: 25, trust: -2, heat: 0, sets: ["maraArrested"] },
        {
          label: "Tell her where the baron's silver goes",
          result: "Rhea doesn't march. She sits a long while over a cup she doesn't drink, and leaves without a word.",
          gold: 0,
          trust: 0,
          heat: 1,
          deed: "protect",
          sets: ["rheaDoubts"],
          needs: "heardSilver",
        },
      ],
      unheard: [
        { label: "Say you heard nothing", result: "\"Good,\" Rhea says, too quickly. \"Then I've nothing to report.\"", gold: 0, trust: 0, heat: 1 },
        { label: "Make something up", result: "Rhea pays you and sends a rider to check.", gold: 5, trust: 0, heat: 2 },
      ],
    },
  },
];

/** Each ending's title and line (the Village Rises, overthrow, and the rest of Chapter 1's: chapter1.ts). */
export const ENDINGS: Readonly<Record<EndingId, { title: string; text: string }>> = CHAPTER_ENDINGS;

export interface Guest {
  id: number;
  /** Their group, which decides how they talk. */
  kind: GuestKind;
  /** Their type in the group, which decides their numbers: patience, purse, drink, nerve, fists (guestroles.ts). */
  role: GuestRole;
  /** Their own numbers, rolled in their type's range as they walk in, so no two are quite alike. */
  stats: RoleStats;
  /** Which body they come in, rolled as they walk in. */
  female: boolean;
  /**
   * Who they are to look at, rolled as they walk in: the view picks their skin, hair, eyes and clothes' colours
   * from it, so a farmer tonight isn't the farmer from last night. 0 is the plain look of their kind.
   */
  look: number;
  order: Item;
  /**
   * Whether she's taken their order. Until she has, they sit calling her over (a raised hand, and a line in the
   * log), and what they want is theirs to say: no icon, and nothing she can serve them.
   */
  ordered: boolean;
  seat: number;
  status: GuestStatus;
  patience: number;
  maxPatience: number;
  eatLeft: number;
  rumor: boolean;
  listened: number;
  /** The party this guest came in with, as an index into the night's parties, or null for someone alone. */
  party: number | null;
  /** Paid by the house above her on the Ledger to start trouble: in angry, and up for a fight at the first chance. */
  hired?: boolean;
  /** Served before their patience was half gone: one of the things that delights them (fans). */
  servedFast?: boolean;
  /** Hidden from the player for now: nothing shows these and nothing changes them yet. 0 to 10. */
  lust: number;
  desires: number;
  /** The state they're in, which changes how they talk and behave. */
  mood: Mood;
  /** A named regular (regulars.ts), by id. */
  regular?: string;
  /** One of the Warm House's recruits (recruits.ts), by id. */
  recruit?: RecruitId;
}

/**
 * A guest working up to a brawl. First it brews at their table: an angry mark over their head, and something
 * hateful said out loud (serve them now and they may settle). Then they get up and come for her, and the brawl
 * starts once they reach her, or when they've been on their way too long.
 */
export interface Trouble {
  guestId: number;
  stage: "brewing" | "coming";
  /** Seconds left in this stage. */
  timer: number;
  /** What they shout as it brews. */
  shout: string;
  /** Whether they've reached her (the game says so). */
  arrived: boolean;
  /** Whether they were still waiting for their order when it started: serving it then can settle them. */
  waiting: boolean;
}

/** Something to clean up. */
export interface Mess {
  id: number;
  kind: MessKind;
  /**
   * Dishes: the seats at one table that were eaten at. A spill: the one seat it's under. Dust: which of
   * the room's dust spots it lies on, and a cobweb which of its cobweb spots (the game decides where those are).
   */
  spots: number[];
  /** Dishes only: what was left at each of the spots, in the same order. Older saves have none. */
  wares?: Ware[];
}

/** The cups and dishes in a pile. A pile from an older save counts as one dish per seat. */
export function messWares(mess: Mess): Ware[] {
  if (mess.kind !== "dishes") return [];
  return mess.wares ?? mess.spots.map(() => "dish");
}

/** "the dirty cup", "the dirty dish", or "the 3 dirty dishes". */
function dirtyWords(wares: readonly Ware[]): string {
  return wares.length === 1 ? `the dirty ${wares[0]}` : `the ${wares.length} dirty dishes`;
}

const copyMess = (mess: Mess): Mess => ({
  ...mess,
  spots: [...mess.spots],
  ...(mess.wares ? { wares: [...mess.wares] } : {}),
});

/** One option in a conversation at a table. */
export interface TalkChoice {
  label: string;
  disabled: boolean;
}

/** One thing said in a conversation: who says it ("You" for the player, null for narration) and what. */
export interface TalkLine {
  speaker: string | null;
  text: string;
  /** The guest speaking, so the game can show them. */
  guestId?: number;
}

/** A guest who has tipped you with a drink, and has something to say while you're there. */
interface TipChat {
  speaker: string;
  guestId: number;
  /** Their offer of a drink, and how they are: what opens the talk. */
  lines: TalkLine[];
  /** What they say once she's taken the drink or turned it down: a dare, a compliment or a favor to answer. */
  ask: TalkLine[];
  replies: Reply[];
  /** She's answered the drink: taken it (`drank`) or turned it down. Until then, only the drink is asked. */
  offered: boolean;
  drank: boolean;
  answered: boolean;
  /** What was just said, after their lines. */
  reply: TalkLine[];
}

/** What a guest wants, in the log. */
const ORDER_WORDS: Record<Item, string> = {
  ale: "an ale",
  wine: "a cup of wine",
  mead: "a mead",
  vodka: "a vodka",
  bread: "some bread",
  stew: "a bowl of stew",
  cask: "a cask",
};

/** A guest who took hold of her as she served them (grab.ts), and her answer. */
interface GrabChat {
  guestId: number;
  lines: TalkLine[];
  answered: boolean;
  reply: TalkLine[];
}

/** Chapter 1's progress, as saved. */
export interface StorySave {
  fans: number;
  beats: string[];
  houses: Partial<Record<HouseId, HouseFate | "fallen">>;
  owed: number;
  arrears: number;
  promised: boolean;
  /** The written night tonight plays, or -1 for a night between beats. */
  storyNight: number;
  sideRumor: number;
  /** Act 1's story flags (plot.ts). Older saves have none. */
  flags?: string[];
  /** The furthest stage of her arc the dawn report has spoken of (STORY.md 4b). */
  arc?: number;
  /** Her Legend, the stage past Known (lewd.ts `legendStep`). Older saves have none: she's never been one. */
  legend?: LegendState;
  /** The furthest corruption tier the dawn has told her card for (CORRUPTION_TROPES.md). */
  tier?: number;
  /** Wren's letters (letters.ts). Older saves have none, except Pell's if his dawn has been. */
  letters?: LettersSave;
  /** The Chapter 1 ending she got (chapter1.ts). Older saves have none. */
  chapter1?: string;
  /** Her fans by group (chapter1.ts). Older saves count them all as Keeper. */
  fanGroups?: FanGroups;
}

/** How Pell's collection went: what was due, what he took, and what she still owes. */
export interface BaronVisit {
  due: number;
  paid: number;
  owed: number;
}

/** A guest who's offered coin for a look at her (show.ts), and her answer. */
interface ShowChat {
  guestId: number;
  /** What they asked to see. */
  part: ShowPart;
  lines: TalkLine[];
  answered: boolean;
  reply: TalkLine[];
  /** What she's showing them, while the talk lasts: the model shows it too (`shownPieces`, `showingPull`). */
  shown?: ShowPart;
  /** Which of her breasts she's baring, showing them her breasts: both, or just the one (picked at random). */
  side?: ShowSide;
}

/** The state that lasts between nights. */
export interface TavernSave {
  nightIndex: number;
  gold: number;
  trust: number;
  heat: number;
  upgrades: UpgradeId[];
  tapLeft: number;
  /** What last night left to clean up. Older saves have none. */
  messes?: Mess[];
  /** Who the player has become. Older saves start from nothing. */
  persona?: Persona;
  /** The building as you've changed it. Older saves, and an untouched building, have none. */
  layout?: HouseLayout;
  /** How many cups and dishes the tavern owns. Older saves start with the usual set. */
  stock?: Record<Ware, number>;
  /** Cups and dishes broken and not yet replaced. Older saves have none. */
  broken?: Record<Ware, number>;
  /** Her debuffs, and what she owes the baron. Older saves have none. */
  debuffs?: Debuff[];
  /** Chapter 1 (ledger.ts): her fans, the beats played, the houses beaten, and the debt. Older saves start fresh. */
  story?: StorySave;
  /** The bottled drinks bought for the shelf. */
  bottles?: Bottle[];
  /** The name written in the journal, or none yet. */
  name?: string;
  /** What was left in the wash tub. */
  tub?: Ware[];
  /** How far guests' touches have brought the innkeeper along. Older saves start from nothing. */
  touch?: TouchMemory;
  /** Her records, passives and corruption. Older saves start from nothing. */
  progress?: ProgressSave;
  /** Favors asked already, and what's still to come of them. Older saves start with none. */
  favors?: { asked: string[]; due: { id: string; night: number }[] };
  /** The Lantern (lantern.ts): the lamp, the room, the house rules and the girls. Older saves have none. */
  lantern?: LanternSave;
  /** Named regulars (regulars.ts). Older saves have none. */
  regulars?: Regular[];
  /** The Warm House's recruits (recruits.ts); older saves have none, and start them fresh. */
  recruits?: unknown;
  /** Her careers by day (careers.ts); older saves have none. */
  careers?: unknown;
  /** Act 2 (act2.ts): the Pass Ledger, the red book, the act's flags; older saves have none. */
  act2?: unknown;
  /** The town hall (townhall.ts); older saves have none, or kept it in the knight's state. */
  politics?: unknown;
  /** Her staff (staff.ts), the applicants waiting, and her friendship with the roster. Older saves have none. */
  staff?: { members: StaffMember[]; applicants: StaffMember[]; applicantsNight: number; nextApplicant: number; friendship: Record<string, number> };
  /** The Revel House (revel.ts): the hall, the night's settings and whether tonight's one. Older saves have none. */
  revel?: { hall: boolean; settings: RevelSettings; tonight: boolean };
  /** Her day errands (errands.ts): done today, and the guests and fans they're bringing. Older saves have none. */
  errands?: { flyered: boolean; posted: boolean; guests: number; fans: number; town?: string[] };
  /** Feed Star (feedstar.ts): her feed, sponsors, quiet days, DM hype, today's inbox, the trend week, today's stream. Older saves have none. */
  feed?: {
    records: Feed.FeedRecords;
    deals: Feed.SponsorDeal[];
    warned: Feed.SponsorId[];
    broken: Feed.SponsorId[];
    quietDays: number;
    hype: number;
    stalkerRisk: number;
    trendWeek: number;
    streamed: boolean;
    inbox: Feed.Dm[];
    inboxDay: number;
  };
  /** The Knight path (knight.ts): her place in the garrison, flags, the week of her last tourney, today's work and patrol. Older saves have none. */
  knight?: { state: Knight.KnightState; flags: string[]; tourneyWeek: number; done: string[]; patrol: string | null };
  /** The Guild (guild.ts): her card, today's board, and what she's done at the hall today. Older saves have none. */
  guild?: { card: GuildCard; board: string[]; boardDay: number; questToday: boolean; hallToday: boolean; questGold: number[] };
}

/** A moment that wants an 18+ card: a guest she's said yes to on the table, or being overwhelmed. */
/**
 * `table` is adult play (GAME_PATH.MD 7f, KP's Waitress Sex): on a table in the taproom, the room joining in.
 * `auto`: Consent off, and her state said yes, so it starts at once (`autoAdultPlay`) instead of her setting it up.
 */
export type AdultScene =
  | {
      kind: "table";
      guestId: number;
      guestKind: GuestKind;
      guestStats?: RoleStats;
      auto?: boolean;
      /** She put it to the whole room, on her last clear drink (barwork.ts): all of them, and the room left open. */
      wholeRoom?: boolean;
    }
  | { kind: "overwhelmed" };
/** Adult play she's said yes to: on a table, right here in the taproom. */
export type InviteScene = Extract<AdultScene, { kind: "table" }>;

/** An invitation she's answering in the taproom while the game's on: who's in it, and how the rest of the room took it. */
interface TaproomGame {
  hostId: number;
  /** Everyone in the game, the one who asked first; more join the line as it goes if she left the room open. */
  partnerIds: number[];
  /** She left the room open: watchers who get worked up enough join the line as it goes. */
  open: boolean;
  /** Her moves so far, and how many had given in at the last count: what stirs the watchers. */
  moves: number;
  givenIn: number;
  /** Who stayed to watch, and who got up and left (and how many of those were the village's own). */
  cheered: number;
  left: number;
  localsLeft: number;
}

/** The last Consent-off check: who reached, for what, both sides' numbers, and what came of it. */
export interface ImpulseRecord {
  guest: string;
  kind: GuestKind;
  prefers: DuelArea;
  touch: string;
  region: TouchRegion;
  brawl: boolean;
  /** Impulsive (lustful and bold), or a worked-up brawler. */
  eager: boolean;
  /** A touch the switch can cover: she could say yes, within the boldness, not clothes or upstairs. */
  covered: boolean;
  consentOff: boolean;
  facts: ImpulseFacts;
  check: ImpulseCheck;
  /** It played out without asking. */
  landed: boolean;
}

/** A guest reaching for you as you serve them, waiting on your answer. */
interface TouchChat {
  guestId: number;
  touch: TouchDef;
  lines: TalkLine[];
  answers: TouchAnswer[];
  answered: boolean;
  /** What she answered, once she has: the intensity bar shows only after a yes. */
  answer: TouchAnswer | null;
  /** How tempted she was when the hand came in: 0 not ready, 1 torn, 2 wanting it. Saying no costs willpower past 0. */
  tier: number;
  /** What was just said, after their lines. */
  reply: TalkLine[];
  /** An impulsive guest, and the player hasn't said yet whether they may touch without asking: she's asked here. */
  offerAuto: boolean;
  /** It landed without the question, because the player said impulsive guests may: the Force bar fills fast. */
  impulse: boolean;
  /**
   * A reach in the middle of a brawl: never a garment or an invitation, and the fight picks up after. Asked like any
   * other reach, unless Consent is switched off in Settings: then it may land on its own.
   */
  brawl?: boolean;
  /** How far in the touch goes: over her clothes, inside them, or bare skin (touch.ts). */
  layer?: TouchLayer;
  /** Everyone at this table who's had a turn this round, this guest included: a tablemate joins in only once (barwork.ts). */
  joined?: number[];
  /** The sibling she was when they reached, if she might still have a tray in her hands (barwork.ts). */
  sibling?: number;
  /** Adult play she put to the whole room, on her last clear drink (barwork.ts). */
  wholeRoom?: boolean;
}

/** Where the game after a lost brawl is played: right where she fell (the room watching), upstairs, or out back. */
export type BrawlPlace = "here" | "upstairs" | "yard";

/**
 * After she's lost a brawl, the one who won asks her (GAME_PATH.MD, "Brawl loss"). Hers to answer: going on takes
 * her to the After Hours rules (her parts, her stop), and stopping costs nothing past the loss itself. Either way
 * the night ends.
 */
export interface BrawlOffer {
  kind: GuestKind;
  stats: RoleStats;
  female: boolean;
  /** They were roaring drunk: too drunk to say yes to. */
  drunk: boolean;
  /**
   * Who they came in with (their party, or else whoever shares their table), still in the room and sober enough to
   * ask too. Each asks to come upstairs; she picks who does. Nobody is brought along unasked.
   */
  crew: BrawlCrewMate[];
}

/** One of the brawl winner's companions, asking to come up too. */
export interface BrawlCrewMate {
  id: number;
  kind: GuestKind;
  female: boolean;
  stats: RoleStats;
  label: string;
  /** What they say to ask. */
  ask: string;
}

/** A touch that's just been answered, for the game to play out on screen. */
export interface TouchMoment {
  id: string;
  region: TouchRegion;
  level: number;
  answer: TouchAnswer;
  /** Who reached for you. */
  kind: GuestKind;
  /** How far in it went: over her clothes, inside them, or on her bare skin (touch.ts). */
  layer: TouchLayer;
}

export interface TickContext {
  /** Guest the player is close enough to overhear. */
  listeningTo: number | null;
  /** Whether night has fallen, from the world clock. Once the doors are open, it starts the night. */
  night: boolean;
}

export interface Prompt {
  label: string;
  actionable: boolean;
}

interface Action {
  label: string;
  run?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MESS_LABELS: Record<Exclude<MessKind, "dishes">, string> = {
  spill: "Mop up the spilt ale",
  dust: "Sweep up the dust",
  cobweb: "Brush down the cobweb",
};
const MESS_DONE: Record<Exclude<MessKind, "dishes">, string> = {
  spill: "Floor mopped.",
  dust: "Swept.",
  cobweb: "Cobweb down.",
};

/** "1 cobweb", "3 patches of dust": what's left of one kind of mess, in words. */
const MESS_COUNT_WORDS: Record<MessKind, [string, string]> = {
  dishes: ["pile of dishes", "piles of dishes"],
  spill: ["puddle of ale", "puddles of ale"],
  dust: ["patch of dust", "patches of dust"],
  cobweb: ["cobweb", "cobwebs"],
};

/** "2 cobwebs and 1 patch of dust", for the messes given, cobwebs first. */
function messesLeftWords(messes: readonly Mess[]): string {
  const parts = (["cobweb", "dust", "spill", "dishes"] as const).flatMap((kind) => {
    const n = messes.filter((m) => m.kind === kind).length;
    return n === 0 ? [] : [`${n} ${MESS_COUNT_WORDS[kind][n === 1 ? 0 : 1]}`];
  });
  return parts.length <= 1 ? (parts[0] ?? "nothing") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** The numbers 0 to count - 1 in an order that looks random but is always the same for a seed. */
function shuffled(count: number, seed: number): number[] {
  const out = Array.from({ length: count }, (_, i) => i);
  let state = seed >>> 0 || 1;
  for (let i = count - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const STATION_OF_ITEM: Record<Item, Station> = {
  ale: "tap",
  wine: "shelf",
  mead: "shelf",
  vodka: "shelf",
  bread: "bread",
  stew: "pot",
  cask: "barrel",
};

/**
 * What a saved moment leaves alone: the dice, the rules the tests change, the player's settings and looks (kept
 * elsewhere), the room's shape (from the world), the Lantern (saved on its own), and the tub's sparkle (a clock time).
 */
const MOMENT_SKIP = [
  "random",
  "rollRandom",
  "crowdRandom",
  "grabRandom",
  "showRandom",
  "adultRandom",
  "storyBeats",
  "takeOrders",
  "touchSettings",
  "playerBody",
  "playerOutfit",
  "playerLegwear",
  "playerUnder",
  "seatCount",
  "seatTables",
  "dustSpots",
  "cobwebSpots",
  "lantern",
  "washedAt",
] as const satisfies readonly (keyof Tavern | "seatCount" | "seatTables" | "dustSpots" | "cobwebSpots")[];
const LANTERN_MOMENT_SKIP = ["random"] as const;

export class Tavern {
  phase: Phase = "day";
  nightIndex = 0;
  gold = 0;
  trust = START_TRUST;
  heat = 0;
  clock = 0;

  readonly guests: Guest[] = [];
  /** What each sibling has in their hands. */
  readonly carrying: [Held | null, Held | null] = [null, null];
  /** How many of it: up to TRAY_SIZE cups of ale on a tray, a stack of dirty dishes, otherwise 1. 0 with empty hands. */
  readonly carryCount: [number, number] = [0, 0];
  readonly upgrades = new Set<UpgradeId>();
  /** What's still to be cleaned up. Left alone, it carries on into the next day. */
  readonly messes: Mess[] = [];
  /** How many cups and dishes the tavern owns, clean or not. */
  readonly stock: Record<Ware, number> = { cup: START_CUPS, dish: START_DISHES };
  /** What she carries for things gone badly (debuffs.ts): a brawl lost, the baron unpaid, a raid. */
  debuffs: Debuff[] = [];
  /**
   * Chapter 1 (ledger.ts). Whether the story runs on fans: beats fire as she reaches them, and the nights between
   * are side nights. The tests' setup turns it off, so their nights go by night number as they were written.
   */
  storyBeats = storyRules.beats;
  /** Her fans, and the ones she's won or lost tonight (counted at dawn). */
  fans = 0;
  fansTonight = 0;
  /** The beats played so far, by id. The first night is the salt. */
  readonly beatsDone = new Set<string>(["salt"]);
  /** Act 1's story flags (plot.ts): what she did at the written nights' last calls, and what she's heard. */
  readonly plotFlags = new Set<PlotFlag>();
  /** The furthest stage of her arc the dawn report has spoken of (-1 for none yet; 4 once Known's aftermath has). */
  arcSeen = -1;
  /** Her Legend, the lasting comic stage past Known, and the nights counting toward it or back from it. */
  legend: LegendState = newLegend();
  /** The furthest corruption tier the dawn has told her card for (0 honest to 3 rotten; CORRUPTION_TROPES.md). */
  tierSeen = 0;
  /** The written night tonight plays (a beat night), or -1 for a night between beats. */
  storyNight = 0;
  /** The houses she's passed, and what she did with each (partner or ruin; "fallen" until its boss has come). */
  houses: Partial<Record<HouseId, HouseFate | "fallen">> = {};
  /** A beat waiting on her answer this morning: a house's boss at the door, or Pell. */
  pendingBeat: Beat | null = null;
  /** First in Tarven: the chapter's end, shown once. */
  private firstInTarven = false;
  /** The Chapter 1 ending she got as she became first in Tarven (chapter1.ts), or none yet. Saved with the story. */
  chapterEnding: ChapterEndingId | null = null;
  /** Her fans by why they come (Keeper, Lantern, Network; chapter1.ts), and tonight's tagged ones, counted at dawn. */
  fanGroups: FanGroups = newFanGroups();
  private fanTags = { lantern: 0, network: 0 };
  /** Wren's letters (letters.ts): found, waiting to be found, and the counters they read. Saved with the story. */
  letters: LetterState = newLetterState();
  /** The letter found this morning, for the morning card, once. */
  private letterToday: LetterId | null = null;
  /** Her willpower went below half at some point tonight (for the keeper's last letter). */
  private willDipped = false;
  /**
   * What she owes the Baron (Grandma's debt; doubled at Pell's dawn unless she promises the book), what's left
   * unpaid from his last collection, and whether she promised.
   */
  owed = DEBT;
  arrears = 0;
  bookPromised = false;
  /** What the house above is up to tonight, if anything. */
  rivalMove: RivalMove | null = null;
  /** Pell's last collection, once, for the game to show the morning after. */
  private baronVisit: BaronVisit | null = null;
  /** What happened overnight (a raid, the baron), for the morning report; cleared as the day begins. */
  readonly news: string[] = [];
  /** Cups and dishes she's broken (dropped them, drunk), still to be replaced from the house plans. */
  readonly broken: Record<Ware, number> = { cup: 0, dish: 0 };
  /** The bottled drinks on the shelf, bought once and kept for good. */
  readonly bottles = new Set<Bottle>();
  /** The innkeeper's name, as written in the journal; empty until the player writes one. */
  name = "";
  /** How many are clean and ready to use. */
  readonly cleanWare: Record<Ware, number> = { cup: START_CUPS, dish: START_DISHES };
  /** Dirty cups and dishes left in the tub overnight, waiting for a wash. */
  readonly tub: Ware[] = [];

  tapLeft = TAP_SIZE;
  aleReady = 0;
  pourLeft: number | null = null;
  potState: PotState = "empty";
  potTimer = 0;
  potBowls = 0;

  /** The building as you've changed it, or null while it's as it started. Only changes during the day. */
  layout: HouseLayout | null = null;
  /** The bedroom door. It stays however you left it, night to night. */
  doorOpen = false;
  /** Whether you've napped today. */
  napped = false;
  /** How drunk you are, from 0 to DRUNK_MAX. Wears off with time, and sleep clears it. */
  drunk = 0;
  /** The party you're talking with, or null. While set, the game shows the conversation. */
  talkingTo: number | null = null;
  /** What was just said at the table, after the opening chat. */
  private talkReply: TalkLine[] = [];
  /** A guest talking to you over the drink they tipped you, or null. */
  private tipChat: TipChat | null = null;
  /** A guest reaching for you, waiting on your answer, or null. */
  private touchChat: TouchChat | null = null;
  /** A guest with hold of her as she served them, waiting on her answer (Consent on), or null. */
  private grabChat: GrabChat | null = null;
  /** A guest offering coin for a look at her, waiting on her answer, or null. */
  private showChat: ShowChat | null = null;
  /** The last Consent-off check, whether or not it counted, for the dev panel (the ] key). */
  lastImpulse: ImpulseRecord | null = null;
  /**
   * The touch she has just said yes to, for the intensity (Force) bar: its boldness and her answer. Null before she
   * answers, and after a slap or a pull, so the bar never shows while she's still choosing.
   */
  get landedTouch(): { level: number; answer: TouchAnswer; impulse: boolean } | null {
    const chat = this.touchChat;
    if (!chat?.answered || !chat.answer || !touchLands(chat.answer)) return null;
    return { level: chat.touch.level, answer: chat.answer, impulse: chat.impulse };
  }
  /** How far guests' touches have brought you, which lasts from night to night. */
  touchMemory: TouchMemory = newTouchMemory();
  /** Touches tried tonight, so the same one doesn't keep coming round. */
  private readonly touchSeen = new Set<string>();
  /** How each guest's reaching has gone tonight: touches you let them have, and whether you slapped them. */
  private readonly touchHistory = new Map<number, { allowed: number; slapped: boolean }>();
  /** The touch just answered, until the game takes it to show. */
  private touchMoment: TouchMoment | null = null;
  /** Her desire tonight, a meter for each part of her from 0 to 100. Starts where her passives put it; gone by morning. */
  readonly meters: Meters = emptyMeters();
  /** The highest each meter got tonight, for records that count maxed nights. */
  private readonly peak: Meters = emptyMeters();
  /** Pleasure tonight, 0 to 100. At the top, she's overwhelmed. */
  pleasure = 0;
  /** Times she's come this shift (KP's orgasms in a bar shift): overwhelmed at a table, mid-brawl, in a game. */
  comesTonight = 0;
  /** Willpower she's spent since she last slept (see willpower.ts). Kept as what's spent, so it's right whatever her Mind does. */
  private willSpent = 0;
  /** Energy she's spent since she last slept (herstate.ts, GAME_PATH.MD 7k), kept the same way. */
  private energySpent = 0;
  /** How worn out she is, 0 to 100, day after day (herstate.ts): brawls and after-hours games add to it, sleep takes some away. */
  fatigue = 0;
  /** How far she's sold out, from 0 up. Lasts. */
  corruption = 0;
  /**
   * The player's say over impulsive guests touching without asking. Not part of a save: the game loads it from the
   * browser and keeps it there, like the sound settings.
   */
  touchSettings: TouchSettings = defaultTouchSettings();
  /** Play-mode cache: tavern now, brothel (and more) later. */
  houseMode: { current: "tavern" | "brothel"; unlocked: Set<string>; brothel: number } = {
    current: "tavern",
    unlocked: new Set(["tavern"]),
    brothel: 0,
  };
  /** The Lantern, once she hangs it: lit or dark nights, the room upstairs, the girls (lantern.ts). Lasts. */
  readonly lantern = new Lantern();
  /** Everything counted about her, for passives. Lasts. */
  records: Records = newRecords();
  /** The passives she holds, by id. */
  readonly passives = new Set<string>();
  /** What her passives add up to. */
  effects: Effects = noEffects();
  /** Passives earned as she went to bed last, for the morning to show. */
  newPassives: PassiveDef[] = [];
  /** Titles she's earned, and the ones she's wearing (titles.ts): one slot, two once she's famous enough. */
  titles = new Set<string>([START_TITLE]);
  /** Edict points to spend on the edict tree (tavernrules.ts): a few to start, more each morning. */
  edictPoints = EDICT_START_POINTS;
  /** Named regulars (regulars.ts), and what's happened with each guest tonight, settled at the end of the night. */
  regulars: Regular[] = [];
  /** The Warm House's recruits (recruits.ts): how far up the hill each has gone, and what she's done about it. */
  recruits = newRecruits();
  /** Her careers by day (careers.ts): rank (-1 until she joins) and jobs done on each. */
  careers = newCareers();
  /** The town hall (townhall.ts): the Reeve's chain, the Law board, and what she's won the town's blocs with. */
  politics = Hall.newPolitics();
  /** Act 2 (act2.ts): the Pass Ledger, the red book's pieces, and the act's own flags and beats done ("beat:<id>"). */
  act2 = Act2.readAct2(undefined);
  /** Tonight Grig's men come to break her furniture (the first Ledger), and her brawls won before it. */
  private ratBrawlTonight = false;
  private ratBrawlFrom = -1;
  private readonly nightMarks = new Map<number, { guest: Pick<Guest, "kind" | "role" | "female" | "look" | "stats" | "regular">; marks: NightMarks }>();
  /** The edicts she's enacted (tavernrules.ts), for good. */
  readonly rules = new Set<TavernRuleId>();
  worn: string[] = [START_TITLE];
  /** She eased the ache herself before sleeping last night. */
  eased = false;
  /** A moment waiting for its 18+ card, until the game takes it. */
  private adultScene: AdultScene | null = null;
  /** An invitation she's answering in the taproom, while the game's on (taproom.ts); see `startTaproom`. */
  private taproom: TaproomGame | null = null;
  /** What she'll find in the morning after tonight's adult play: said as she goes to bed. */
  private morningAfter: string[] = [];
  /** Experience in every stat and skill. Lasts. */
  xp: Experience = {};
  /** A guest working up to a brawl, before it starts: see `Trouble`. */
  trouble: Trouble | null = null;
  /** A brawl in progress, or null. While set, the game shows the fight and the night waits. */
  fight: Fight | null = null;
  /**
   * The guard meter in a brawl (brawlaim.ts): their swings wait on her timing. The game turns it on (its brawl screen
   * draws the meter); left off, as in the tests, their swings are rolled.
   */
  guardMeter = false;
  /** How the last brawl ended, for the game to show once. */
  lastFight: { outcome: FightOutcome; text: string; invasion?: boolean } | null = null;
  /**
   * Guests who left tonight wanting her (lust that showed, sober, never the Baron), latest last: who might come back
   * while she eases the ache (invasion.ts, Consent off).
   */
  leftWanting: { kind: GuestKind; stats: RoleStats }[] = [];
  /** The brawl going on came in through her door at night (invasion.ts). */
  invading = false;
  /** What the winner of a brawl she lost is asking, until she answers. */
  brawlOffer: BrawlOffer | null = null;
  /**
   * Side jobs and the rest (sidejobs.ts): whether she's danced on the bar or let the rooms tonight; a riot night (KP's
   * riots) and the brawls she's won on it; nights since her hair was last trimmed (KP's RemtairyHair).
   */
  private showTonight = false;
  private roomsTonight = false;
  /** The guests who took a room tonight: they go up the stairs when they leave, not out of the door. */
  roomGuests: number[] = [];
  riot = false;
  private riotWins = 0;
  hairNights = 0;

  /** Her hair, by the nights since it was trimmed (its look on her model is still to come). */
  get hairGrowth(): Growth {
    return growthOf(this.hairNights);
  }

  /** The bathhouse: trimmed bare again. */
  trimHair(): void {
    this.hairNights = 0;
    this.say("You get yourself trimmed at the bathhouse. Smooth as the day you were born.");
  }

  /** Whether she can dance on the bar now: during service, once a night. */
  get canDance(): boolean {
    return this.phase === "service" && !this.showTonight && this.playerBody === "Female";
  }

  /** KP's stripper job: a dance on the bar (sidejobs.ts runShow). Says whether she did. */
  danceOnBar(): boolean {
    if (!this.canDance) return false;
    this.showTonight = true;
    const room = this.guests.filter((g) => g.status === "waiting" || g.status === "eating");
    const men = room.filter((g) => !g.female);
    const show = runShow({ guests: room.length, men: men.length, fame: this.persona.fame, exposure: this.exposure, slutLevel: this.slutLevel });
    this.gold += show.gold;
    for (const g of men) g.lust = Math.min(10, g.lust + show.lust);
    this.shift({ fame: show.fame, respect: show.respect });
    this.raise("body", show.desire);
    this.raise("breasts", show.desire);
    this.records.shows++;
    this.say(`${show.line} (+${show.gold} gold)`);
    return true;
  }

  /** Whether she can let the rooms tonight: at last call or bedtime, once a night. */
  get canRentRooms(): boolean {
    return (this.phase === "lastcall" || this.phase === "bedtime") && !this.roomsTonight;
  }

  /** KP's receptionist job: lets the rooms upstairs to whoever would stay (sidejobs.ts rentRooms). */
  rentOutRooms(): boolean {
    if (!this.canRentRooms) return false;
    this.roomsTonight = true;
    const staying = this.guests.filter((g) => g.status !== "leaving" && g.mood !== "angry").sort((a, b) => b.lust - a.lust);
    const result = rentRooms(staying.map((g) => g.lust), STRONG_LUST);
    this.roomGuests = staying.slice(0, result.rented).map((g) => g.id);
    this.gold += result.gold;
    this.records.roomsRented += result.rented;
    this.records.roomAsks += result.asked;
    this.say(`${result.line}${result.gold > 0 ? ` (+${result.gold} gold)` : ""}`);
    return true;
  }

  /** The trinkets she's wearing (trinkets.ts, KP's accessories): up to TRINKET_SLOTS. */
  trinketsWorn: string[] = [];

  /** Her trinkets: the ones she has (by Charm, or her records), the rest and what they need, and which she wears. */
  trinkets(): { id: string; name: string; about: string; owned: boolean; worn: boolean; needs: string }[] {
    const owned = new Set(trinketsOwned(this.level("charm"), this.records).map((t) => t.id));
    return TRINKETS.map((t) => ({
      id: t.id,
      name: t.name,
      about: t.about,
      owned: owned.has(t.id),
      worn: this.trinketsWorn.includes(t.id),
      needs: t.charm !== undefined ? `Charm ${t.charm}` : (t.needText ?? ""),
    }));
  }

  /** Puts a trinket on, or takes it off; one she hasn't got, or past her slots, does nothing. Says whether it changed. */
  toggleTrinket(id: string): boolean {
    const t = this.trinkets().find((x) => x.id === id);
    if (!t || !t.owned) return false;
    if (t.worn) this.trinketsWorn = this.trinketsWorn.filter((w) => w !== id);
    else if (this.trinketsWorn.length < TRINKET_SLOTS) this.trinketsWorn.push(id);
    else return false;
    this.refreshEffects();
    return true;
  }

  // ---------- Staff (staff.ts, STAFF.md) ----------

  /** The people who work for her. The Lantern's girls are kept by the Lantern, and never count toward the cap. */
  staff: StaffMember[] = [];
  /** Random applicants answering her notice (recruitment), the night they came, and the next id to give one. */
  applicants: StaffMember[] = [];
  applicantsNight = -1;
  private nextApplicant = 1;
  /** Her friendship with each roster person: at FRIEND_AT, they'll work for her. */
  friendship: Record<string, number> = {};
  /** Who she's spent time with today (once a day each). */
  private friendTimeToday = new Set<string>();

  /** Her day errands in the square (errands.ts): flyers and the feed, once a day each. */
  flyeredToday = false;
  postedToday = false;
  /** Guests her errands are bringing in tonight, and fans they've won, counted at dawn. */
  errandGuests = 0;
  errandFans = 0;
  /** What she's done in town today ("place:action", townplaces.ts): each once a day. */
  readonly townDoneToday = new Set<string>();

  /**
   * Where the game is, for staff (STAFF.md §1): early (nights 1 to 5, no staff), mid (after Pell's first visit for
   * the Baron, gold 150 or more, or from night 6), and late (the chapter's end, first in Tarven, or fame 60).
   */
  get staffStage(): StaffStage {
    if (this.beatsDone.has("copperBell") || this.persona.fame >= STAFF_LATE_FAME) return "late";
    if (this.beatsDone.has("pell") || this.gold >= STAFF_MID_GOLD || this.nightIndex >= STAFF_MID_NIGHT) return "mid";
    return "early";
  }

  /** Staff who count toward the cap: everyone still here but a girl. */
  private get staffCounted(): StaffMember[] {
    return this.staff.filter((m) => !m.quit && m.job !== "girl");
  }

  /** How many she can keep at this stage (girls off the cap), and how many she has. */
  get staffCap(): { have: number; cap: number } {
    return { have: this.staffCounted.length, cap: STAFF_CAP[this.staffStage] };
  }

  /** Whether there's room for one more who counts toward the cap. */
  private get staffRoom(): boolean {
    return this.staffCounted.length < STAFF_CAP[this.staffStage];
  }

  /** Staff can be hired, let go and paid differently while the tavern's shut, never in the middle of service. */
  get canManageStaff(): boolean {
    return this.phase !== "service" && this.phase !== "lastcall" && this.fight === null && this.duel === null;
  }

  /** Roster people who'll work for her now: met by this stage, friends, not on her books (girls, once the lantern's hung). */
  staffHireable(): StaffDef[] {
    const stage = this.staffStage;
    const have = new Set([...this.staff.map((m) => m.id), ...this.lantern.girls.map((g) => g.id)]);
    const counted = this.staffCounted.map((m) => m.id);
    const open = [...hireable(stage, counted, this.friendship), ...hireable(stage, [], this.friendship).filter((d) => d.job === "girl")];
    return open.filter((d, i) => open.findIndex((o) => o.id === d.id) === i && !have.has(d.id) && (d.job !== "girl" || this.lantern.hung));
  }

  /** Roster people she's met at this stage and isn't yet friends with, with how far along she is. */
  staffToBefriend(): { def: StaffDef; friendship: number; spentToday: boolean }[] {
    const have = new Set([...this.staff.map((m) => m.id), ...this.lantern.girls.map((g) => g.id)]);
    return metAt(this.staffStage)
      .filter((d) => !have.has(d.id) && (this.friendship[d.id] ?? 0) < FRIEND_AT)
      .map((d) => ({ def: d, friendship: this.friendship[d.id] ?? 0, spentToday: this.friendTimeToday.has(d.id) }));
  }

  /** A placeholder for their story and the regulars' visits: time spent with one of them, once a day each. */
  spendTimeWith(id: string): boolean {
    if (!this.staffToBefriend().some((f) => f.def.id === id && !f.spentToday)) return false;
    this.friendTimeToday.add(id);
    this.friendship[id] = (this.friendship[id] ?? 0) + FRIEND_TIME;
    const name = metAt(this.staffStage).find((d) => d.id === id)!.name;
    this.say(this.friendship[id] >= FRIEND_AT ? `You and ${name} are friends now. Ask, and they'll work for you.` : `You spend a while with ${name}. (Friendship ${this.friendship[id]}/${FRIEND_AT})`);
    return true;
  }

  /** Hires a friend from the roster, if there's room (girls off the cap). Says whether she did. */
  hireStaff(id: string): boolean {
    if (!this.canManageStaff || !this.staffHireable().some((d) => d.id === id)) return false;
    const member = hire(id);
    this.staff.push(member);
    this.say(`${member.name} starts work as your ${member.job}. Wage ${member.wage} gold a night.`);
    this.refreshEffects();
    return true;
  }

  /** Takes on one of the applicants, if there's room. */
  hireApplicant(id: string): boolean {
    const a = this.applicants.find((x) => x.id === id);
    if (!this.canManageStaff || !a || !this.staffRoom) return false;
    this.applicants = this.applicants.filter((x) => x.id !== id);
    this.staff.push(a);
    this.say(`${a.name} starts work as your ${a.job}. Wage ${a.wage} gold a night.`);
    this.refreshEffects();
    return true;
  }

  /** A fresh lot of applicants: free every few nights, or for the posting fee now. */
  postForWork(paid = true): boolean {
    if (this.staffStage === "early") return false;
    if (paid) {
      if (!this.canManageStaff || this.gold < POSTING_FEE) return false;
      this.gold -= POSTING_FEE;
    }
    this.applicants = rollApplicants(this.staffStage, this.random, this.nextApplicant);
    this.nextApplicant += this.applicants.length;
    this.applicantsNight = this.nightIndex;
    if (paid) this.say(`You post a notice for work (${POSTING_FEE} gold). ${this.applicants.length} answer it.`);
    return true;
  }

  /** Lets one of them go. */
  fireStaff(id: string): boolean {
    const m = this.staff.find((x) => x.id === id);
    if (!this.canManageStaff || !m) return false;
    this.staff = this.staff.filter((x) => x.id !== id);
    this.say(`You let ${m.name} go.`);
    this.refreshEffects();
    return true;
  }

  /** Sets what one of them is paid a night (0 to STAFF_WAGE_MAX). */
  setWage(id: string, n: number): boolean {
    const m = this.staff.find((x) => x.id === id);
    if (!m) return false;
    m.wage = Math.max(0, Math.min(STAFF_WAGE_MAX, Math.round(n)));
    return true;
  }

  /** The beat of their story that's due, if one is. */
  staffBeat(id: string): ArcBeat | null {
    const m = this.staff.find((x) => x.id === id);
    return m ? arcDue(m) : null;
  }

  /** Plays the beat that's due with one of its outcomes. */
  playStaffBeat(id: string, outcomeId: string): boolean {
    const at = this.staff.findIndex((x) => x.id === id);
    if (at < 0) return false;
    const beat = arcDue(this.staff[at]);
    const next = playBeat(this.staff[at], outcomeId);
    if (!beat || !next) return false;
    this.staff[at] = next;
    this.say(`${next.name}, "${beat.title}": ${beat.outcomes.find((o) => o.id === outcomeId)!.text}`);
    return true;
  }

  /** One of them on tonight at this job's post (still here, with stamina to work). */
  staffWorking(job: StaffJob): boolean {
    return this.staffOnPost(job) > 0;
  }

  /** How many of them work this job's post tonight (still here, with stamina to work). */
  staffOnPost(job: StaffJob): number {
    return this.staff.filter((m) => !m.quit && m.stamina.current > 0 && this.postOf(m) === job).length;
  }

  /** The post one of them works: their own job's unless she's put them elsewhere; null while they rest. */
  postOf(m: StaffMember): StaffJob | null {
    return m.post === "rest" ? null : (m.post ?? m.job);
  }

  /** How many of them a job's post takes: one, and more from her edicts (the Staff & Posts branch). */
  postSlots(job: StaffJob): number {
    return 1 + (edictPosts(this.rules)[job] ?? 0);
  }

  /**
   * Puts one of them on a post, or to rest, while the tavern's shut. A post that's full takes no one more. Working
   * another job's post costs them a little loyalty each night, unless they're cross-trained (tavernrules.ts).
   */
  setPost(id: string, post: StaffJob | "rest"): boolean {
    const m = this.staff.find((x) => x.id === id);
    if (!this.canManageStaff || !m || m.quit || m.job === "girl" || post === "girl") return false;
    if (post !== "rest" && this.postOf(m) !== post) {
      const taken = this.staff.filter((x) => !x.quit && x.job !== "girl" && this.postOf(x) === post).length;
      if (taken >= this.postSlots(post)) return false;
    }
    if (post === m.job) delete m.post;
    else m.post = post;
    this.refreshEffects();
    return true;
  }

  /**
   * At the night's end, for each of them: their wage paid from the till (what she can), their night run (staff.ts
   * nightFor), and their dawn line for the morning. Anyone who's quit is gone; their perks add house fame and fans.
   */
  private settleStaff(): void {
    if (this.staff.length === 0) return;
    const greedy = this.lantern.hung ? HOUSE_RULES.filter((r) => this.lantern.rules[r] === "greedy").length : 0;
    const kept: StaffMember[] = [];
    const edicts = edictStaff(this.rules);
    for (const m of this.staff) {
      // Off their post (resting), they don't work or get paid tonight, and get their stamina back.
      const post = this.postOf(m);
      const worked = !m.quit && m.stamina.current > 0 && post !== null;
      const job = post ?? m.job;
      const paid = worked ? Math.min(m.wage, this.gold) : 0;
      this.gold -= paid;
      if (worked) {
        const perks = perkNightly(m);
        if (perks.fame) this.shift({ fame: perks.fame });
        this.fansTonight += perks.fans;
      }
      // What their job brought them tonight, lewd work too (staff.ts lewdWork): as handsy as the room was with
      // her, and the whole hall on a revel night.
      const done = worked
        ? {
            served: job === "barmaid" ? Math.floor(this.served * BARMAID_SHARE) : 0,
            throwOuts: job === "doorman" ? Math.min(DOORMAN_THROWS, this.fightsTonight) : 0,
            ...lewdWork(job, { reached: this.touchesTonight.reached, revel: this.revelHeld }),
          }
        : {};
      const { member, dawn } = nightFor(m, { worked, wagePaid: paid, houseFame: this.persona.fame, madamCorruption: this.corruption, greedyRules: greedy, done });
      // Her edicts on how staff are kept (meals, the tip jar), and a grudge for working someone else's job.
      if (worked && !member.quit) {
        const grudge = job !== m.job && !edicts.crossTrained ? OFF_POST_LOYALTY : 0;
        member.loyalty = Math.max(0, Math.min(100, member.loyalty + edicts.loyalty - grudge));
      }
      this.morningAfter.push(paid < m.wage && worked ? `${dawn.line} You could only pay ${paid} of ${m.wage} gold.` : dawn.line);
      for (const card of dawn.cards) this.morningAfter.push(...cardLines(card));
      if (dawn.beat) this.morningAfter.push(`${member.name}: "${dawn.beat.title}" is waiting (Settings, Staff).`);
      if (member.quit) continue;
      kept.push(member);
    }
    this.staff = kept;
  }

  // ---------- Feed Star (feedstar.ts, FEED_STAR.md) ----------
  // Placeholder menus (menus.ts showFeed) until the phone screen, the photo poses and the stream's crystal are drawn.

  /** Her feed records: followers, likes, bold posts, virals and streams (what the Watched awakening reads). */
  feed: Feed.FeedRecords = { ...Feed.EMPTY_RECORDS };
  /** Sponsor deals signed, sponsors warned once this deal, and sponsors she's broken with (they never offer again). */
  feedDeals: Feed.SponsorDeal[] = [];
  feedWarned: Feed.SponsorId[] = [];
  feedBroken: Feed.SponsorId[] = [];
  /** Days in a row without a post; hype her DMs have built for the next post (a share of its likes); a creep's pull. */
  feedQuietDays = 0;
  feedHype = 0;
  feedStalkerRisk = 0;
  /** Today's DMs (rolled the first time she looks, `feedInboxDay`), the week's trend she's joined, today's stream. */
  feedInbox: Feed.Dm[] = [];
  feedInboxDay = -1;
  feedTrendWeek = -1;
  feedStreamedToday = false;
  /** A live stream going on: its chat requests and her answers so far (true take, false decline, null let it pass). */
  feedStream: { requests: Feed.StreamRequest[]; answers: (boolean | null)[] } | null = null;
  /** She stopped to check her phone tonight (Refresh, Refresh): guests wait a little less. */
  private phoneTonight = false;

  /** The week, for sponsors and trends: seven nights each. */
  get feedWeek(): number {
    return Math.floor(this.nightIndex / 7);
  }

  /** Her Watched stage (FEED_STAR.md §5): what her feed records reach, never past her arc. */
  get watchedStage(): Feed.WatchedStage {
    return Feed.watchedStage(this.feed, this.arcStage);
  }

  /** The Watched passives she holds right now (her stage's, and the extras), and what they do. */
  get watchedPassives(): string[] {
    return Feed.earnedWatchedPassives(this.feed, this.arcStage);
  }

  get watchedEffects(): Feed.WatchedEffects {
    return Feed.watchedEffects(this.watchedPassives);
  }

  /** The posts her arc and stage allow, and the boldest tier among them (the most a stream's dare can be). */
  feedAllowedPosts(): Feed.PostKind[] {
    return Feed.allowedPosts(this.arcStage, this.watchedStage);
  }

  get feedMaxTier(): Feed.Boldness {
    return Math.max(0, ...this.feedAllowedPosts().map((k) => Feed.POSTS[k].tier)) as Feed.Boldness;
  }

  /** A Feed Star post shares the day's one feed post with the plain one (errands.ts): by day, once, the relay's fee. */
  get canFeedPost(): boolean {
    return this.canPostOnFeed();
  }

  /** A timing tap from the menu (until the camera view is drawn): how far off the moment, in ms, with a little wobble. */
  feedTapOffset(when: "early" | "on" | "late"): number {
    if (when === "on") return Math.round((this.random() - 0.5) * 100);
    const off = 110 + Math.round(this.random() * 200);
    return when === "early" ? -off : off;
  }

  /**
   * A Feed Star post (FEED_STAR.md §2, §6a): the shoot (outfit, prop, angle, and how far off the moment her tap was),
   * then the post. Likes, followers, fame and respect; willpower it costs her shy and the thrill of a good one; guests
   * tonight and fans at dawn; sponsors' gold for posts that show their goods; and the risks (stalker, Pell's men,
   * gossip). Null if she can't post it today.
   */
  feedPost(
    kind: Feed.PostKind,
    shoot: { outfit: Feed.ShootOutfit; prop: Feed.ShootProp; angle: Feed.ShootAngle },
    tapOffsetMs: number,
  ): { shot: Feed.ShootResult; post: Feed.PostResult; risks: Feed.RiskResult } | null {
    if (!this.canFeedPost || !Feed.postAllowed(kind, this.arcStage, this.watchedStage)) return null;
    const effects = this.watchedEffects;
    const shot = Feed.photoShoot({ post: kind, ...shoot }, tapOffsetMs);
    const post = Feed.scorePost({ kind, quality: shot.quality, followers: this.feed.followers, effects }, () => this.random());
    // Her Watched passives, and the hype her DMs built, add to the likes.
    const boost = 1 + this.effects.feedLikes + this.feedHype;
    if (boost !== 1) {
      post.likes = Math.round(post.likes * boost);
      post.newFollowers = Math.floor(post.likes / Feed.LIKES_PER_NEW_FOLLOWER);
    }
    this.feedHype = 0;
    this.gold -= FEED_COST;
    this.postedToday = true;
    this.feed = Feed.recordPost(this.feed, kind, post);
    this.records.feedPosts++;
    this.shift({ fame: post.fame, respect: post.respect });
    if (post.willpower < 0) this.spendWill(-post.willpower);
    if (post.bodyDesire > 0) this.raise("body", post.bodyDesire);
    // Followers come in tonight and as fans at dawn.
    this.errandGuests = Math.min(MAX_ERRAND_GUESTS, this.errandGuests + 1 + (post.newFollowers >= 10 ? 1 : 0) + (post.viral ? 1 : 0));
    this.errandFans += Math.max(1, Math.floor(post.newFollowers / 5));
    this.say(`${post.line} (${shot.grade} shot, +${post.newFollowers} followers, ${this.feed.followers} in all${post.respect ? `, respect ${post.respect}` : ""}${post.fame ? `, fame +${post.fame}` : ""})`);
    for (const deal of this.feedDeals) {
      const pay = Feed.sponsorPayout(deal.id, kind, shot.quality);
      if (pay <= 0) continue;
      deal.postsThisWeek++;
      this.adjust(pay, 0, 0);
      this.say(`${Feed.SPONSORS[deal.id].name} pays ${pay} gold for it.`);
    }
    const risks = this.feedRisks(shot.tier, post.viral);
    if (shot.tier >= 2) this.knightScandal("boldPost");
    this.feedSync();
    return { shot, post, risks };
  }

  /** A post's or a trend's risks (rollRisks), plus the pull of any creep she's teased in her DMs; into the log. */
  private feedRisks(tier: Feed.Boldness, viral: boolean): Feed.RiskResult {
    const risks = Feed.rollRisks(tier, this.feed.followers, viral, () => this.random());
    if (!risks.stalker && this.feedStalkerRisk > 0 && this.random() < this.feedStalkerRisk) {
      risks.stalker = true;
      risks.lines.unshift("One of the accounts from your DMs has found the tavern. He's at the end of the bar, not drinking.");
    }
    if (risks.stalker) {
      // TODO (FEED_STAR.md §8): the stalker as a guest event at the bar. For now a line and a record.
      this.records.stalkers++;
      this.feedStalkerRisk = 0;
    }
    if (risks.heat) this.adjust(0, 0, risks.heat);
    for (const line of risks.lines) this.say(line);
    return risks;
  }

  /** Copies her feed into her records (for the Watched passives) and checks for anything earned. */
  private feedSync(): void {
    const r = this.records;
    r.feedLikes = this.feed.totalLikes;
    r.feedFollowersMost = Math.max(r.feedFollowersMost, this.feed.followers);
    r.feedBold = this.feed.boldPosts;
    r.feedVirals = this.feed.virals;
    r.feedStreams = this.feed.streams;
    r.feedStage = Math.max(r.feedStage, Feed.watchedIndex(this.watchedStage));
    this.awardPassives();
  }

  /** Today's DMs: one to three, rolled the first time she looks each day. */
  feedDms(): Feed.Dm[] {
    if (this.feedInboxDay !== this.nightIndex) {
      this.feedInboxDay = this.nightIndex;
      const n = 1 + Math.floor(this.random() * 3);
      const names = ["quarry_lad", "goatwatch", "pell_is_watching_u", "mead_mage", "sir_likes_a_lot", "bakehouse_bea", "tollroad_tom", "zane_reposts"];
      this.feedInbox = [];
      for (let i = 0; i < n; i++) {
        const roll = this.random();
        const kind: Feed.DmKind = roll < 0.35 ? "fan" : roll < 0.6 ? "flirt" : roll < 0.75 ? "creep" : roll < 0.9 ? "gift" : "sponsor";
        const texts = Feed.DM_SAMPLES[kind];
        this.feedInbox.push({ kind, from: `@${oneOf(names, this.random())}`, text: oneOf(texts, this.random()) });
      }
    }
    return this.feedInbox;
  }

  /** Her answer to one of today's DMs (replyDM): followers, hype, a creep's pull, a gift's gold, a sponsor's offer. */
  feedReply(index: number, choice: Feed.DmChoice): Feed.DmOutcome | null {
    const dm = this.feedDms()[index];
    if (!dm) return null;
    const out = Feed.replyDM(dm, choice, () => this.random());
    this.feedInbox.splice(index, 1);
    this.feed = { ...this.feed, followers: Math.max(0, this.feed.followers + out.loyal) };
    this.feedHype = Math.min(0.5, this.feedHype + out.hype);
    this.feedStalkerRisk = clamp(this.feedStalkerRisk + out.stalkerRisk, 0, 0.5);
    if (out.gold) this.adjust(out.gold, 0, 0);
    if (out.respect) this.shift({ respect: out.respect });
    this.say(out.line);
    if (out.sponsorOffer) {
      const offers = this.feedSponsorOffers();
      this.say(offers.length > 0 ? `${Feed.SPONSORS[offers[0]].name} would sign you too (Feed, sponsors).` : "Nobody you'd want to work for, yet. Grow the feed and they'll come.");
    }
    this.feedSync();
    return out;
  }

  /** Sponsors who'd sign her now. */
  feedSponsorOffers(): Feed.SponsorId[] {
    return Feed.sponsorOffers(this.feed.followers, this.watchedStage, this.feedDeals.map((d) => d.id), this.feedBroken);
  }

  /** Signs a sponsor's deal, if they're offering. */
  signSponsor(id: Feed.SponsorId): boolean {
    if (!this.feedSponsorOffers().includes(id)) return false;
    this.feedDeals.push({ id, postsThisWeek: 0 });
    this.say(`${Feed.SPONSORS[id].offer} You sign. (${Feed.SPONSORS[id].perWeek} posts a week that show their goods.)`);
    return true;
  }

  /** The week's end for her sponsors: kept, warned, or broken (a broken deal costs her name and the friend's goodwill). */
  private feedSponsorWeek(): void {
    for (const deal of [...this.feedDeals]) {
      const verdict = Feed.weekForDeal(deal, this.feedWarned.includes(deal.id));
      const name = Feed.SPONSORS[deal.id].name;
      if (verdict === "kept") this.feedWarned = this.feedWarned.filter((id) => id !== deal.id);
      else if (verdict === "warned") {
        this.feedWarned.push(deal.id);
        this.say(`${name} wanted more posts this week. Next week, or the deal's off.`);
      } else {
        const b = Feed.breakDeal(deal.id, this.feed.followers);
        this.shift({ respect: b.respect });
        this.feed = { ...this.feed, followers: Math.max(0, this.feed.followers - b.followersLost) };
        const friend = this.staff.find((m) => m.id === FEED_SPONSOR_STAFF[deal.id]);
        if (friend && b.loyalty) friend.loyalty = clamp(friend.loyalty + b.loyalty, 0, 100);
        this.feedDeals = this.feedDeals.filter((d) => d.id !== deal.id);
        this.feedWarned = this.feedWarned.filter((id) => id !== deal.id);
        this.feedBroken.push(deal.id);
        this.say(`${b.line} (respect ${b.respect}, -${b.followersLost} followers)`);
      }
      deal.postsThisWeek = 0;
    }
  }

  /** Going live on the scrying crystal (§6c): by day, once a day. Five chat requests, one at a time. */
  get canStream(): boolean {
    return this.phase === "day" && !this.feedStreamedToday && this.feedStream === null;
  }

  feedGoLive(): boolean {
    if (!this.canStream) return false;
    const requests: Feed.StreamRequest[] = [];
    for (let i = 0; i < FEED_STREAM_REQUESTS; i++) {
      const tier = Math.min(3, Math.floor(this.random() * 4)) as Feed.Boldness;
      requests.push({ id: `r${i}`, at: 2 + i * 6, ttl: 5, tier, tip: 1 + Math.floor(this.random() * 4), text: oneOf(FEED_DARES[tier], this.random()) });
    }
    this.feedStreamedToday = true;
    this.feedStream = { requests, answers: [] };
    this.say("You prop the crystal on the bar and go live. The chat fills up.");
    return true;
  }

  /** The request she's answering now, or null. */
  get feedStreamRequest(): Feed.StreamRequest | null {
    const s = this.feedStream;
    return s ? (s.requests[s.answers.length] ?? null) : null;
  }

  /**
   * Her answer to the request on screen: take it (only if it's not bolder than she's ready for: then it counts as a
   * decline), decline it, or let it pass. After the last, the stream ends and its result is applied and returned.
   */
  feedStreamAnswer(answer: boolean | null): Feed.StreamResult | null {
    const s = this.feedStream;
    if (!s || !this.feedStreamRequest) return null;
    s.answers.push(answer);
    if (s.answers.length < s.requests.length) return null;
    const responses: Feed.StreamResponse[] = [];
    s.requests.forEach((req, i) => {
      const a = s.answers[i];
      if (a !== null) responses.push({ id: req.id, at: req.at + 2, accept: a });
    });
    const max = this.feedMaxTier;
    const result = Feed.liveStream(s.requests, responses, FEED_STREAM_SECONDS, max);
    this.feedStream = null;
    this.adjust(result.tips, 0, 0);
    this.feed = { ...this.feed, followers: this.feed.followers + result.newFollowers, streams: this.feed.streams + (result.endedEarly ? 0 : 1) };
    const bold = s.requests.some((req, i) => s.answers[i] === true && req.tier >= 2 && req.tier <= max);
    if (result.taken > 0) this.raise("body", result.taken * 2);
    this.say(
      result.endedEarly
        ? `The chat drifts off after ${result.lasted}s. (+${result.tips} gold in tips)`
        : `You sign off to a wall of hearts. (+${result.tips} gold in tips, +${result.newFollowers} followers, peak hype ${result.peak})`,
    );
    if (bold) this.knightScandal("boldPost");
    this.feedSync();
    return result;
  }

  /** This week's trend (§6d), and whether she can join it: by day, once a week, if her arc and stage allow it. */
  get feedTrend(): Feed.TrendId {
    return Feed.weeklyTrend(this.feedWeek);
  }

  get canTrend(): boolean {
    return this.phase === "day" && this.feedTrendWeek !== this.feedWeek && Feed.trendAllowed(this.feedTrend, this.arcStage, this.watchedStage);
  }

  /** Her taps for the trend's beats from the menu (until the rhythm screen is drawn): early, on the beat, late, or missed. */
  feedTrendTaps(beats: readonly ("early" | "on" | "late" | "miss")[]): number[] {
    const def = Feed.TRENDS[this.feedTrend];
    const taps: number[] = [];
    beats.forEach((b, i) => {
      const at = def.beats[i];
      if (at === undefined || b === "miss") return;
      if (b === "on") taps.push(at + Math.round((this.random() - 0.5) * 80));
      else taps.push(at + (b === "early" ? -1 : 1) * (90 + Math.round(this.random() * 90)));
    });
    return taps;
  }

  /** Joins this week's trend with her taps (ms from the start): followers, a sponsor's eye, its risks. */
  feedTrendDance(taps: readonly number[]): Feed.TrendResult | null {
    if (!this.canTrend) return null;
    const result = Feed.trendChallenge(this.feedTrend, taps);
    this.feedTrendWeek = this.feedWeek;
    const def = Feed.TRENDS[this.feedTrend];
    this.feed = { ...this.feed, followers: this.feed.followers + result.newFollowers, boldPosts: this.feed.boldPosts + (def.tier >= 2 ? 1 : 0) };
    this.shift({ respect: Feed.POST_RESPECT[def.tier], fame: result.sponsorAttention ? 2 : 0 });
    const place = typeof result.placement === "number" ? ["", "1st", "2nd", "3rd"][result.placement] : result.placement === "top10" ? "top ten" : "unplaced";
    this.say(`${def.tag}: ${place} (accuracy ${Math.round(result.accuracy * 100)}%, +${result.newFollowers} followers).${result.sponsorAttention ? " A sponsor's noticed you." : ""}`);
    this.feedRisks(def.tier, false);
    if (def.tier >= 2) this.knightScandal("boldPost");
    this.feedSync();
    return result;
  }

  /** A day passes on the feed: followers drift in or away, a quiet day leaves her restless (Craving), and at the week's turn the sponsors count her posts. */
  private feedDayPassed(postedYesterday: boolean): void {
    if (this.records.feedPosts === 0 && this.feed.followers === 0) return;
    this.feedQuietDays = postedYesterday ? 0 : this.feedQuietDays + 1;
    const day = Feed.followerDay(this.feed.followers, postedYesterday, this.feedQuietDays, this.watchedEffects);
    if (day.followers < this.feed.followers) this.say(`A quiet day on the feed: ${this.feed.followers - day.followers} followers drift away.`);
    this.feed = { ...this.feed, followers: day.followers };
    if (day.restless > 0 && this.playerBody === "Female") {
      this.raise("body", day.restless);
      this.say("No post yesterday, and you keep reaching for your phone. You start the day restless.");
    }
    if (this.nightIndex % 7 === 0) this.feedSponsorWeek();
    this.feedSync();
  }

  // ---------- The Knight path (knight.ts, KNIGHT_PATH.md) ----------
  // Placeholder menus (menus.ts showKnight) until the drill yard, the lists and her knight kits are drawn.

  /** Her place in the garrison, or null before she signs up. */
  knight: Knight.KnightState | null = null;
  /** Story flags her knight work has set (ashCaught, silasAngry ...), what she's done today, today's patrol, the week of her last tourney. */
  knightFlags: string[] = [];
  readonly knightDoneToday = new Set<string>();
  knightPatrolId: string | null = null;
  knightTourneyWeek = -1;
  /** A brawl going on that isn't a tavern brawl (a tourney, a patrol, the old commander), and what it's for. */
  private sideFight: SideFight | null = null;

  /** The story's act, for the ladder: 2 once Chapter 1's done (First in Tarven). Act 3 is still to come (STORY.md). */
  get storyAct(): number {
    if (this.act2.flags.includes("act2Done")) return 3;
    return this.beatsDone.has("copperBell") ? 2 : 1;
  }

  /** Her story flags, Act 1's and Act 2's together, for the rules that read either. */
  get storyFlags(): ReadonlySet<string> {
    return new Set<string>([...this.plotFlags, ...this.act2.flags]);
  }

  /** What the red book's ways read off her (act2.ts). */
  bookFacts(): Act2.BookFacts {
    return {
      trust: this.trust,
      gold: this.gold,
      arc: this.arcStage,
      brawlsWon: this.records.fightsWon,
      flags: this.storyFlags,
      odenRoute: this.records.town["oden:route"] ?? 0,
      maraTalks: this.records.town["fields:mara"] ?? 0,
      smugglerRank: this.careers.smuggler.rank,
    };
  }

  /** The Pass Ledger as lines, and the book she holds, for the Ledger cards. */
  private passLedgerLines(): string[] {
    const held = Act2.PIECE_IDS.filter((id) => this.act2.book[id] === "held").length;
    return [...Act2.ledgerLines(this.act2.pass, this.fans), `The red book: ${held} of ${Act2.PIECE_IDS.length} pieces in your hands.`];
  }

  /** What the ladder reads off the rest of the game. TODO: Rhea's doubts, the Baron's fall and the town vote (faction moods) once the story has them. */
  knightFacts(): Knight.KnightFacts {
    return {
      brawlsWon: this.records.fightsWon,
      fame: this.persona.fame,
      respect: this.persona.respect,
      act: this.storyAct,
      rheaDoubts: false,
      councilSeat: this.beatsDone.has("copperBell"),
      baronFallen: false,
      townVote: 0,
    };
  }

  /** What her rank adds to her brawl hits (a sword at her hip). */
  get knightBrawlDamage(): number {
    return this.knight ? Knight.effectsOf(this.knight).brawlDamage : 0;
  }

  /** Signing up at the garrison: by day, once. Captain Rhea Vance takes her name. */
  get canJoinGarrison(): boolean {
    return this.phase === "day" && this.knight === null;
  }

  joinGarrison(): boolean {
    if (!this.canJoinGarrison) return false;
    this.knight = Knight.newKnightState();
    this.say("Captain Rhea Vance writes your name in the garrison book and hands you an armband. \"Volunteer. Don't make me regret it.\"");
    return true;
  }

  /** Whether she can do this bit of knight work now: by day, enrolled, once a day, no brawl going on. */
  canKnight(what: "drill" | "patrol" | "raid"): boolean {
    return this.phase === "day" && this.knight !== null && !this.knightDoneToday.has(what) && this.fight === null;
  }

  /** The drill's presses from the menu (until the beat bar is drawn): eight beats, steady, rushed or sloppy. */
  knightDrillTimings(style: "steady" | "rushed" | "sloppy"): (number | null)[] {
    const spread = style === "steady" ? 90 : style === "rushed" ? 170 : 300;
    return Array.from({ length: 8 }, () => (style === "sloppy" && this.random() < 0.15 ? null : Math.round((this.random() * 2 - 1) * spread)));
  }

  /** The drill (§2): scored, her best kept, XP; a pass lifts the squad. Hikari on staff widens the windows. */
  knightDrill(timings: readonly (number | null)[]): Knight.DrillResult | null {
    if (!this.canKnight("drill") || !this.knight) return null;
    this.knightDoneToday.add("drill");
    const hikari = this.staff.some((m) => m.id === "hikari" && !m.quit);
    const r = Knight.drill(timings, { hikari });
    this.knight = Knight.recordDrill(this.knight, r);
    this.gainXp("agility", r.xp);
    if (r.passed) this.records.drillsPassed++;
    this.say(`Drill: ${r.score}/100 (${r.perfect} perfect, ${r.good} good, ${r.ok} ok, ${r.miss} missed)${r.passed ? ". Passed." : ". Not a pass."} (+${r.xp} XP)`);
    return r;
  }

  /** Today's patrol (§2): one event for her rank, rolled the first time she asks. */
  knightPatrol(): Knight.PatrolEvent | null {
    if (!this.knight) return null;
    if (this.knightPatrolId === null) {
      const open = Knight.patrolEvents(this.knight.rank);
      this.knightPatrolId = open[Math.floor(this.random() * open.length) % open.length].id;
    }
    return Knight.PATROL_EVENTS.find((e) => e.id === this.knightPatrolId) ?? null;
  }

  /**
   * Her choice on today's patrol. A fight choice is played as a real brawl when `brawl` is on (the result comes when
   * it ends: "fight"); otherwise it's rolled.
   */
  knightPatrolChoose(choiceId: string, brawl = true): Knight.PatrolResult | "fight" | null {
    const event = this.knightPatrol();
    if (!this.canKnight("patrol") || !this.knight || !event) return null;
    const choice = event.choices.find((c) => c.id === choiceId);
    if (!choice) return null;
    this.knightDoneToday.add("patrol");
    if (choice.fight && brawl && this.startSideFight(PATROL_FOES[event.id] ?? "farmer", { kind: "patrol", eventId: event.id, choiceId })) return "fight";
    const r = Knight.resolvePatrol(event, choiceId, this.knight.rank, () => this.random());
    this.knightPatrolDone(r);
    return r;
  }

  private knightPatrolDone(r: Knight.PatrolResult): void {
    if (!this.knight) return;
    this.knight = Knight.recordPatrol(this.knight, r);
    this.herKnightEffects(r.effects);
    this.records.knightPatrols++;
    if (r.line) this.say(r.line);
  }

  /** A raid with her squad (§2, Knight-Captain and up), with an order given. */
  knightRaid(target: Knight.RaidTargetId, order: Knight.SquadOrder): Knight.RaidResult | null {
    if (!this.canKnight("raid") || !this.knight || !Knight.canRaid(this.knight, target)) return null;
    this.knightDoneToday.add("raid");
    const r = Knight.resolveRaid(this.knight.squad, target, () => this.random(), order);
    this.knight = Knight.recordRaid(this.knight, r);
    const { favour: _f, scandal: _s, loyalty: _l, ...hers } = r.effects;
    this.herKnightEffects(hers);
    this.records.knightRaids++;
    this.say(`${r.line} (odds ${Math.round(r.odds * 100)}%)`);
    return r;
  }

  /** The tourney (§2): once a week, a one-on-one brawl in the lists. Only a win counts. */
  get canTourney(): boolean {
    return this.phase === "day" && this.knight !== null && this.knightTourneyWeek !== this.feedWeek && this.fight === null && this.duel === null;
  }

  knightTourney(): boolean {
    if (!this.canTourney || !this.startSideFight("soldier", { kind: "tourney" })) return false;
    this.knightTourneyWeek = this.feedWeek;
    this.say("The lists are sanded and the crowd's filming. Your rival salutes with a blunted sword.");
    return true;
  }

  /** The oath, to the Baron or the town (a squire with a tourney win). */
  knightOath(to: Knight.OathTo): boolean {
    if (!this.knight || this.phase !== "day") return false;
    const r = Knight.swearOath(this.knight, to, this.knightFacts());
    this.knight = r.state;
    this.say(r.line);
    return r.ok;
  }

  /** Step up a rank if she's earned it; what's missing goes in the log if not. */
  knightPromote(): boolean {
    if (!this.knight || this.phase !== "day") return false;
    const r = Knight.promote(this.knight, this.knightFacts());
    this.knight = r.state;
    if (!r.ok) {
      this.say(`${r.line} Still to do: ${r.missing.join("; ")}.`);
      return false;
    }
    this.gainXp("strength", r.xp);
    this.records.knightRankBest = Math.max(this.records.knightRankBest, Knight.rankIndex(this.knight.rank));
    this.say(`${r.line} You're ${Knight.KNIGHT_RANKS[this.knight.rank].name} now.`);
    this.refreshEffects();
    return true;
  }

  /** A Captain calls the old commander out: a brawl in the yard. */
  knightCommanderDuel(): boolean {
    if (!this.knight || this.knight.rank !== "captain" || this.phase !== "day" || this.knight.commanderBeaten) return false;
    return this.startSideFight("soldier", { kind: "commander" });
  }

  /** A Captain calls the squad's vote. TODO: Rhea backs her once the story gives her doubts. */
  knightVote(): boolean {
    if (!this.knight || this.knight.rank !== "captain" || this.phase !== "day") return false;
    const r = Knight.squadVote(this.knight, false);
    this.knight = r.state;
    this.say(`The squad votes: ${r.yes} for you, ${r.no} against.${r.won ? " The garrison is yours if you want it." : ""}`);
    return r.won;
  }

  /** The garrison's rules (Commander). */
  knightRules(rules: Knight.GarrisonRules): boolean {
    if (!this.knight) return false;
    const r = Knight.setRules(this.knight, rules);
    this.knight = r.state;
    return r.ok;
  }

  /** What the town hall's blocs read off the rest of the game (townhall.ts). */
  hallFacts(): Hall.HallFacts {
    const fate = (id: HouseId) => this.houses[id];
    const fates = Object.values(this.houses);
    return {
      trust: this.trust,
      respect: this.persona.respect,
      fame: this.persona.fame,
      corruption: this.corruption,
      fans: this.fans,
      knightRank: this.knight?.rank ?? null,
      clergyRank: this.careers.clergy.rank,
      helped: RECRUIT_IDS.reduce((n, id) => n + (this.recruits[id].helped > 0 ? 1 : 0), 0),
      warned: RECRUIT_IDS.reduce((n, id) => n + (this.recruits[id].warnings > 0 ? 1 : 0), 0),
      partners: fates.filter((f) => f === "partner").length,
      ruins: fates.filter((f) => f === "ruin").length,
      ciderPartner: fate("cider") === "partner",
      ciderRuined: fate("cider") === "ruin",
      canteenPartner: fate("canteen") === "partner",
      canteenRuined: fate("canteen") === "ruin",
      odenShut: this.plotFlags.has("odenShut"),
      maraArrested: this.plotFlags.has("maraArrested"),
      odenRoute: this.records.town["oden:route"] ?? 0,
      lanternLit: this.lantern.lit,
      seat: this.beatsDone.has("copperBell"),
      baronFallen: this.act2.flags.includes("book:auditor"),
    };
  }

  /** Her share of the town's vote, 0 to 1. */
  get voteShare(): number {
    return Hall.voteShare(this.hallFacts(), this.politics);
  }

  /** Reeve of Tarven (TOWN_DAY.md 6.2): whether she can stand, and what she still lacks. */
  reeveCheck(): { ok: boolean; missing: string[] } {
    const missing = Hall.reeveMissing(this.hallFacts(), this.politics);
    return { ok: !this.politics.reeve && missing.length === 0, missing };
  }

  /** She stands, and the town votes her in: the chain is hers. By day, with the seat and over half the vote. */
  becomeReeve(): boolean {
    if (this.phase !== "day" || !this.reeveCheck().ok) return false;
    this.politics = { ...this.politics, reeve: true };
    if (this.knight) this.knight = { ...this.knight, reeve: true };
    this.say("The town hall's chain goes round your neck on the market cross steps. Reeve of Tarven.");
    return true;
  }

  /** The council's support for her laws: her share of the vote and her Respect (townhall.ts). */
  get councilSupport(): number {
    return Hall.councilSupport(this.hallFacts(), this.politics);
  }

  /** What the laws as they stand do to the town (townhall.ts `lawEffects`). */
  get lawEffects(): Hall.LawEffects {
    return Hall.lawEffects(this.politics.laws, this.lantern.lit);
  }

  /** Puts a law to the council (Reeve only, by day). Passed, it costs its gold and the blocs answer. */
  passLaw(law: Knight.LawId, level: Knight.LawLevel): boolean {
    if (!this.politics.reeve || this.phase !== "day") return false;
    const cost = Knight.lawCost(this.politics.laws[law], level);
    if (this.gold < cost.gold) return false;
    const asKnight = { ...(this.knight ?? Knight.newKnightState()), reeve: true, laws: this.politics.laws };
    const r = Knight.passLaw(asKnight, law, level, this.councilSupport);
    if (r.passed) {
      this.politics = Hall.shiftByLaw(this.politics, law, level, r.factions);
      if (this.knight) this.knight = { ...this.knight, laws: { ...this.politics.laws } };
      this.adjust(-r.gold, 0, 0);
    }
    this.say(r.line);
    return r.passed;
  }

  /** A day's canvassing of one of the town's blocs (townhall.ts): it costs its gold, and wins them a little. */
  canvass(faction: Knight.Faction): void {
    this.politics = Hall.canvass(this.politics, faction);
  }

  /** She said no to someone under the Free use law (TOWN_DAY.md 6.3): her no counts, and the devotees tut. */
  refusedUnderFreeUse(): void {
    if (this.lawEffects.freeUse === 0) return;
    const was = this.politics.campaign.devotees ?? 0;
    this.politics = { ...this.politics, campaign: { ...this.politics.campaign, devotees: Math.max(-Hall.CANVASS_MOST, was - Hall.REFUSAL_COST) } };
  }

  /** What her knight work does to her and the tavern (the career's own share is applied in knight.ts). */
  private herKnightEffects(e: Knight.KnightEffects): void {
    if (e.xp) this.gainXp("strength", e.xp);
    if (e.respect || e.fame) this.shift({ respect: e.respect ?? 0, fame: e.fame ?? 0 });
    if (e.gold || e.heat) this.adjust(e.gold ?? 0, 0, e.heat ?? 0);
    if (e.flag && !this.knightFlags.includes(e.flag)) this.knightFlags.push(e.flag);
  }

  /** Her double life (§4): a bold post, a Lantern night or a revel may be found out (caughtChance), and talk adds up. */
  private knightScandal(kind: Knight.ScandalKind): void {
    if (!this.knight || this.random() >= Knight.caughtChance(kind, this.knight)) return;
    const r = Knight.scandal(this.knight, kind);
    this.knight = r.state;
    this.records.scandalsCaught++;
    if (this.phase === "day") this.say(r.line);
    else this.morningAfter.push(r.line);
  }

  /** A day passes in the garrison: talk fades, the Commander's rules have their say, and each week the town's respect for her rank. */
  private knightDayPassed(): void {
    if (!this.knight) return;
    this.knight = Knight.fadeScandal(this.knight, 1);
    if (this.knight.rules !== "none") {
      const per = Knight.GARRISON_RULES[this.knight.rules].perDay;
      this.knight = Knight.applyEffects(this.knight, per);
      this.herKnightEffects({ respect: per.respect, heat: per.heat });
    }
    const respect = Knight.effectsOf(this.knight).respectPerWeek;
    if (this.nightIndex % 7 === 0 && respect) {
      this.shift({ respect });
      this.say(`The town tips its hat to ${Knight.KNIGHT_RANKS[this.knight.rank].title}. (+${respect} respect)`);
    }
  }

  /** A brawl that isn't a tavern brawl: nobody in the room, a foe of this kind (rolled, unless `rolled` says who). */
  private startSideFight(kind: GuestKind, purpose: SideFight, rolled?: RoleStats): boolean {
    if (this.fight || this.duel) return false;
    const roster = ROLES_OF[kind];
    this.sideFight = purpose;
    this.sideFightFoe = rolled ?? rollStats(roster[Math.floor(this.random() * roster.length) % roster.length], this.rollRandom);
    this.fight = new Fight(-1, kind, false, this.fighterStats(), this.random, this.sideFightFoe);
    return true;
  }
  /** Who she's brawling in a side brawl, for the offer after a quest's (the one who won asks, as in the taproom). */
  private sideFightFoe: RoleStats | null = null;

  /** A side brawl's end: counted like any brawl (no till taken, no offer: it was in the lists or on patrol), then its purpose. */
  private finishSideFight(fight: Fight, purpose: SideFight): void {
    this.sideFight = null;
    const outcome = fight.outcome!;
    const r = this.records;
    if (outcome === "won") r.fightsWon++;
    else if (outcome === "talked") r.talkedDown++;
    else {
      r.fightsLost++;
      this.addDebuff("bruised");
    }
    let text = outcome === "won" ? "You win." : outcome === "talked" ? "You talk it down." : "You're beaten.";
    if (this.knight && purpose.kind === "tourney") {
      const t = Knight.tourneyDuel(this.knight, outcome);
      this.knight = Knight.applyEffects(t.state, t.effects);
      this.herKnightEffects({ ...t.effects, favour: undefined });
      if (outcome === "won") r.tourneyWins++;
      text = t.line;
    } else if (this.knight && purpose.kind === "patrol") {
      const event = Knight.PATROL_EVENTS.find((e) => e.id === purpose.eventId);
      if (event) {
        const res = Knight.resolvePatrol(event, purpose.choiceId, this.knight.rank, () => this.random(), outcome);
        this.knightPatrolDone({ ...res, line: "" });
        text = res.line;
      }
    } else if (purpose.kind === "quest") {
      text = this.questBrawlDone(outcome, purpose.encounter, purpose.optionId, purpose.monsters);
      // Lost to people on the road: the brawl-loss rule, as in the taproom (GAME_PATH.MD). Consent on, the one who
      // won asks, and it's hers to say yes or no to; Consent off, KP's defeat, right where she fell. Never monsters.
      const foe = this.sideFightFoe;
      if (outcome === "lost" && !purpose.monsters && foe && this.playerBody === "Female") {
        this.brawlOffer = { kind: foe.kind, stats: foe, female: false, drunk: false, crew: [] };
        if (this.consentOff) this.forceBrawlDuel();
      }
    } else if (this.knight && purpose.kind === "commander") {
      const c = Knight.commanderDuel(this.knight, outcome);
      this.knight = c.state;
      text = c.line;
    }
    this.lastFight = { outcome, text };
    this.say(text);
    this.fight = null;
  }

  // ---------- The Adventurers' Guild (guild.ts, ADVENTURERS_GUILD.md) ----------
  // Placeholder menus (menus.ts showGuild) until the hall, the board and the expedition screens are drawn.

  /** Her guild card, or null before she joins. */
  guild: GuildCard | null = null;
  /** Today's board (quest ids), the day it was put up, and what she's done at the hall today. */
  guildBoard: string[] = [];
  guildBoardDay = -1;
  guildQuestToday = false;
  guildHallToday = false;
  /** The posted gold of the quests done today, for the hall's cut (guild master). */
  guildQuestGold: number[] = [];

  /** Kestrel opens the guild to her at 300 fans. */
  get guildOpen(): boolean {
    return this.fans >= Guild.JOIN_FANS;
  }

  joinGuild(): boolean {
    if (this.guild || !this.guildOpen || this.phase !== "day") return false;
    this.guild = { rank: "F", points: 0, quests: 0, failed: 0, deed: false, party: [], injuries: [], counter: false, master: false, cut: "fair", mood: 0, members: 0, accepted: null };
    this.records.guildRankBest = Math.max(this.records.guildRankBest, 1);
    this.say("Kestrel Vey slides a guild card across the counter. \"F rank. Everyone starts somewhere, barmaid.\"");
    return true;
  }

  guildFacts(): Guild.GuildFacts {
    const g = this.guild;
    return { rank: g?.rank ?? "unranked", quests: g?.quests ?? 0, brawlWins: this.records.fightsWon, fans: this.fans, deed: g?.deed ?? false };
  }

  /** What stands between her and the next rank (empty at S). */
  guildMissing(): string[] {
    return this.guild ? Guild.promoteGuild(this.guild.points, this.guildFacts()).missing : [`${Guild.JOIN_FANS} fans (${this.fans})`];
  }

  /** Her card goes up a rank if she's earned it. */
  guildPromote(): boolean {
    const g = this.guild;
    if (!g) return false;
    const p = Guild.promoteGuild(g.points, this.guildFacts());
    if (!p.promoted) return false;
    g.rank = p.rank;
    this.records.guildRankBest = Math.max(this.records.guildRankBest, Guild.rankIndex(p.rank));
    this.say(`The clerk stamps your card: ${Guild.GUILD_RANK_BY_ID[p.rank].name}. ${Guild.GUILD_RANK_BY_ID[p.rank].about}`);
    return true;
  }

  /** Today's quests: put up the first time she looks each day. */
  guildQuests(): Guild.QuestTemplate[] {
    if (!this.guild) return [];
    if (this.guildBoardDay !== this.nightIndex) {
      this.guildBoardDay = this.nightIndex;
      this.guildBoard = Guild.questBoard(this.guild.rank, () => this.random()).map((q) => q.id);
    }
    return this.guildBoard.map((id) => Guild.QUEST_BY_ID[id]).filter((q): q is Guild.QuestTemplate => q !== undefined);
  }

  /** Her staff friends who'd go adventuring with her (on her books, not quit), at their loyalty as staff. */
  guildFriends(): Guild.Companion[] {
    return this.staff
      .filter((m) => !m.quit && Guild.FRIEND_COMPANIONS[m.id])
      .map((m) => ({ ...Guild.FRIEND_COMPANIONS[m.id], loyalty: Math.round(m.loyalty) }));
  }

  /** Takes a friend along, or hires an adventurer off the bench (the fee is paid with the quest), or leaves one behind. */
  guildTakeFriend(id: string): boolean {
    const g = this.guild;
    const c = this.guildFriends().find((f) => f.id === id);
    if (!g || !c || g.party.some((p) => p.id === id) || Guild.partyProblem(g.rank, [...g.party, c])) return false;
    g.party.push(c);
    return true;
  }

  guildHire(role: Guild.PartyRole): boolean {
    const g = this.guild;
    if (!g) return false;
    const c = Guild.hireAdventurer(role, g.rank, () => this.random());
    if (Guild.partyProblem(g.rank, [...g.party, c])) return false;
    g.party.push(c);
    this.say(`${c.name} signs on for the next quest (${c.role}, fee ${c.fee} gold).`);
    return true;
  }

  guildLeave(id: string): boolean {
    const g = this.guild;
    if (!g || !g.party.some((c) => c.id === id)) return false;
    g.party = g.party.filter((c) => c.id !== id);
    return true;
  }

  /** Why she can't take this quest now, or null. */
  guildBlocked(questId: string): string | null {
    const g = this.guild;
    if (!g) return "no guild card";
    if (this.phase !== "day") return "only by day";
    if (this.guildQuestToday) return "one quest a day";
    if (this.fight || this.duel) return "busy";
    const quest = Guild.QUEST_BY_ID[questId];
    if (!quest || (!this.guildBoard.includes(questId) && g.accepted !== questId)) return "not on today's board";
    const problem = Guild.partyProblem(g.rank, g.party);
    if (problem) return problem;
    for (const c of g.party) {
      const no = Guild.companionRefuses(c, quest);
      if (no) return no;
    }
    return null;
  }

  /**
   * An expedition (runExpedition, with the tavern's dice): gold (after fees), points, fans at dawn and adventurers
   * tonight, corruption, injuries (hers take levels off a stat for their days), loyalty to her friends, and who leaves.
   * Fights are rolled here. TODO: play them as real brawls (fight.ts) and feed the outcome back.
   */
  guildRun(questId: string, choices?: Readonly<Record<string, string>>): Guild.ExpeditionResult | null {
    const g = this.guild;
    if (!g || this.guildBlocked(questId)) return null;
    const quest = Guild.QUEST_BY_ID[questId];
    this.guildQuestToday = true;
    const res = Guild.runExpedition(quest, g.party, { levels: this.statLevels(), stamina: GUILD_STAMINA + this.levelStamina }, () => this.random(), { choices });
    for (const e of res.encounters) this.say(`${e.text}${e.kind === "fight" ? (e.passed ? " (won)" : " (lost)") : ""}`);
    this.applyExpedition(quest, res);
    return res;
  }

  /** What a quest's end does to her, her card, her friends and the tavern (gold, points, fans, injuries, loyalty). */
  private applyExpedition(quest: Guild.QuestTemplate, res: Guild.ExpeditionResult): void {
    const g = this.guild;
    if (!g) return;
    this.adjust(res.gold, 0, 0);
    g.points = Math.max(0, g.points + res.points);
    if (res.outcome === "fail") {
      g.failed++;
      this.records.questsFailed++;
    } else {
      g.quests++;
      this.records.questsDone++;
    }
    if (res.deed) g.deed = true;
    this.errandFans += res.fans;
    this.errandGuests = Math.min(MAX_ERRAND_GUESTS, this.errandGuests + res.guestsTonight);
    if (res.corruption) this.corruption = clamp(this.corruption + res.corruption, 0, 1000);
    for (const i of res.injuries) {
      g.injuries.push({ ...i });
      const def = Guild.INJURIES[i.id];
      const who = i.who === "her" ? "You" : (g.party.find((c) => c.id === i.who)?.name ?? i.who);
      this.say(`${who}: ${def.name} (${def.days} days).`);
    }
    // Loyalty: her friends' as staff; anyone it's sunk too low leaves the party; the hired go home paid.
    for (const [id, d] of Object.entries(res.loyalty)) {
      const m = this.staff.find((s) => s.id === id);
      if (m) m.loyalty = clamp(m.loyalty + d, 0, 100);
    }
    for (const id of res.leaves) {
      const c = g.party.find((p) => p.id === id);
      if (c?.friend) this.say(`${c.name} won't go out with you again for a while.`);
    }
    g.party = g.party.filter((c) => c.friend && !res.leaves.includes(c.id));
    this.guildQuestGold.push(quest.gold);
    if (res.captured) {
      // TODO (ADVENTURERS_GUILD.md §6): play it under the brawl-loss rule (Consent on: offered; off: KP's defeat).
      this.records.captures++;
      this.addDebuff("bruised");
      this.say(`${res.captured.by} take you. Your party gets you out by morning, without the loot.`);
    }
    const outcome = { success: "Quest done", partial: "Half done", fail: "Failed" }[res.outcome];
    this.say(`${outcome}: ${quest.title}. (${res.gold >= 0 ? "+" : ""}${res.gold} gold, ${res.points >= 0 ? "+" : ""}${res.points} points, +${res.fans} fans${res.loot.length ? `, ${res.loot.join(", ")}` : ""})`);
    this.refreshEffects();
  }

  // ---------- A quest walked on its map (questfield.ts, questmap.ts) ----------

  /** The quest she's out walking, or null. */
  questRun: QuestRun | null = null;

  /** Why she can't take this quest off the board now, or null. */
  guildAcceptBlocked(questId: string): string | null {
    const g = this.guild;
    if (!g) return "no guild card";
    if (g.accepted === questId) return "taken";
    if (g.accepted) return "you've a quest already";
    if (this.guildQuestToday) return "one quest a day";
    const quest = Guild.QUEST_BY_ID[questId];
    if (!quest || !this.guildBoard.includes(questId)) return "not on today's board";
    return null;
  }

  /** Takes a quest off the board: hers until she walks it or gives it up. */
  guildAccept(questId: string): boolean {
    const g = this.guild;
    if (!g || this.guildAcceptBlocked(questId)) return false;
    g.accepted = questId;
    const quest = Guild.QUEST_BY_ID[questId];
    this.say(`You pull "${quest.title}" off the board. The clerk stamps it: ${quest.place}, ${quest.rank} rank.`);
    return true;
  }

  /** Hands an accepted quest back to the clerk, unwalked. No harm done, but no reward either. */
  guildGiveUp(): boolean {
    const g = this.guild;
    if (!g?.accepted || this.questRun) return false;
    const quest = Guild.QUEST_BY_ID[g.accepted];
    g.accepted = null;
    this.say(`You hand "${quest?.title ?? "the quest"}" back. The clerk pins it up again without a word.`);
    return true;
  }

  /** The quest she's accepted, if any. */
  get acceptedQuest(): Guild.QuestTemplate | null {
    const id = this.guild?.accepted;
    return id ? (Guild.QUEST_BY_ID[id] ?? null) : null;
  }

  /** Why she can't set out on her accepted quest now, or null. */
  guildSetOutBlocked(): string | null {
    const g = this.guild;
    if (!g?.accepted) return "no quest accepted";
    if (this.questRun) return "already out";
    return this.guildBlocked(g.accepted);
  }

  /** Sets out on the accepted quest: its encounters (a rival party may cut in) on a fresh map. */
  guildSetOut(): QuestRun | null {
    const g = this.guild;
    if (!g?.accepted || this.guildSetOutBlocked()) return null;
    const quest = Guild.QUEST_BY_ID[g.accepted];
    const { encounters, rival } = Guild.questEncounters(quest, () => this.random());
    const plan = Field.planField(quest, encounters, Field.fieldRng(Field.fieldSeed(quest.id, this.nightIndex)));
    const stamina = GUILD_STAMINA + this.levelStamina;
    this.guildQuestToday = true;
    this.questRun = {
      quest,
      encounters,
      rival,
      plan,
      results: encounters.map(() => null),
      stamina,
      maxStamina: stamina,
      injuries: [],
      loot: [],
      gold: 0,
      points: 0,
      fans: 0,
      corruption: 0,
      luck: g.party.some((c) => c.trait === "heroLuck"),
      collapsed: false,
      captured: null,
      kills: 0,
      xp: 0,
    };
    const party = g.party.length ? ` with ${g.party.map((c) => c.name).join(", ")}` : " alone";
    this.say(`You set out for ${quest.place}${party}: ${quest.title}.`);
    return this.questRun;
  }

  /**
   * Monsters reached her on the map: the brawl, the taproom's own, against the first that got to her, the rest of
   * its pack piling in as it goes. Each has a tavern brawler's numbers (questfield.ts `MonsterSpec.fight`) under its
   * own name, and no prefix (a "horny" wolf is not a thing). Their ids are their places in the pack, below zero.
   */
  questMonsterBrawl(encounter: number, pack: readonly Field.MonsterSpec[]): boolean {
    const run = this.questRun;
    const e = run?.encounters[encounter];
    if (!run || !e || e.kind !== "fight" || run.results[encounter] || pack.length === 0 || this.fight || this.duel) return false;
    const rolled = (m: Field.MonsterSpec): RoleStats => ({ ...statsOf(MONSTER_BRAWL_KIND), label: Field.brawlLabel(m), fight: { ...m.fight } });
    const joiners: FoeSpec[] = pack.slice(1).map((m, i) => ({ guestId: questMonsterId(i + 1), kind: MONSTER_BRAWL_KIND, drunk: false, rolled: rolled(m) }));
    this.sideFight = { kind: "quest", encounter, monsters: [...pack] };
    this.fight = new Fight(questMonsterId(0), MONSTER_BRAWL_KIND, false, { ...this.fighterStats(), prefixOf: () => undefined, joiners }, this.random, rolled(pack[0]));
    return true;
  }

  /** A monster she put down: experience for her Strength and Agility, on top of the brawl's own. */
  private questKill(m: Field.MonsterSpec): void {
    const run = this.questRun;
    if (!run) return;
    run.kills++;
    for (const [stat, n] of Object.entries(Field.killXp(m))) {
      this.gainXp(stat as StatId, n ?? 0);
      run.xp += n ?? 0;
    }
  }

  /**
   * A check, or a choice's option that isn't a fight, settled where she stands: rolled (Hikari's luck rerolls the
   * first that fails), its gold, points, fans and corruption. Returns what came of it.
   */
  questDecide(encounter: number, optionId?: string): Guild.EncounterResult | null {
    const run = this.questRun;
    const g = this.guild;
    const e = run?.encounters[encounter];
    if (!run || !g || !e || run.results[encounter] || e.kind === "fight") return null;
    const dcBase = Guild.RANK_DC[run.quest.rank];
    const roll = (stat: StatId, role: Guild.PartyRole, dcMod: number) => {
      let c = Guild.rollQuestCheck(this.statLevels(), g.party, stat, role, dcBase + dcMod, () => this.random());
      let lucky = false;
      if (!c.passed && run.luck) {
        run.luck = false;
        c = Guild.rollQuestCheck(this.statLevels(), g.party, stat, role, dcBase + dcMod, () => this.random());
        lucky = c.passed;
      }
      return { ...c, lucky };
    };
    let r: Guild.EncounterResult;
    if (e.kind === "check") {
      const c = roll(e.stat, e.role, e.dcMod ?? 0);
      r = { id: e.id, kind: "check", text: c.passed ? e.pass : e.fail, passed: c.passed, score: c.score, dc: c.dc, staminaLost: c.passed ? 0 : 2, injuries: [] };
      if (c.lucky) r.lucky = true;
    } else {
      const o = e.options.find((x) => x.id === optionId) ?? e.options[0];
      if (o.fight) return null;
      if (o.stat) {
        const c = roll(o.stat, o.role ?? "scout", o.dcMod ?? 0);
        r = { id: e.id, kind: "choice", text: c.passed ? o.text : `${o.label}: it doesn't work.`, passed: c.passed, score: c.score, dc: c.dc, staminaLost: c.passed ? 0 : 2, injuries: [] };
        if (c.lucky) r.lucky = true;
      } else r = { id: e.id, kind: "choice", text: o.text, passed: true, staminaLost: 0, injuries: [] };
      r.chose = o.id;
      if (r.passed) {
        run.gold += o.gold ?? 0;
        run.points += o.points ?? 0;
        run.fans += o.fans ?? 0;
      }
      run.corruption += o.corruption ?? 0;
    }
    if (r.staminaLost) {
      run.stamina = Math.max(0, run.stamina - r.staminaLost);
      if (run.stamina <= 0) run.collapsed = true;
    }
    run.results[encounter] = r;
    this.say(`${r.text}${r.lucky ? " (Hero's Luck!)" : ""}`);
    return r;
  }

  /** People to fight on the road (bandits, smugglers, a rival party): a real brawl, its end settled into the quest. */
  questBrawl(encounter: number, optionId?: string): boolean {
    const run = this.questRun;
    const e = run?.encounters[encounter];
    if (!run || !e || run.results[encounter]) return false;
    const f = e.kind === "fight" ? e : e.kind === "choice" ? e.options.find((o) => o.id === optionId)?.fight : undefined;
    if (!f?.people) return false;
    // Rolled as one of their kind, under the quest's own name for them ("the outrider captain").
    const kind = f.brawlKind ?? "bandit";
    const roster = ROLES_OF[kind];
    const rolled = { ...rollStats(roster[Math.floor(this.random() * roster.length) % roster.length], this.rollRandom), label: f.foe.replace(/^(an?|the) /i, "") };
    return this.startSideFight(kind, { kind: "quest", encounter, ...(optionId ? { optionId } : {}) }, rolled);
  }

  /** A quest's brawl is over: won or talked down passes it; lost costs her stamina, and at the last stand, her. */
  private questBrawlDone(outcome: "won" | "lost" | "talked", encounter: number, optionId?: string, monsters?: readonly Field.MonsterSpec[]): string {
    const run = this.questRun;
    const e = run?.encounters[encounter];
    if (!run || !e) return outcome === "won" ? "You win." : outcome === "talked" ? "You talk it down." : "You're beaten.";
    if (monsters && e.kind === "fight") return this.questMonstersDone(outcome !== "lost", e, encounter, monsters);
    const option = e.kind === "choice" ? e.options.find((o) => o.id === optionId) : undefined;
    const f = e.kind === "fight" ? e : option?.fight;
    const power = f?.power ?? 10;
    const passed = outcome !== "lost";
    const lost = Math.max(1, Math.round(power / (passed ? 3 : 2)));
    run.stamina = Math.max(0, run.stamina - lost);
    const text = passed ? (option?.text ?? `${capitalize(f?.foe ?? "They")}: beaten.`) : `${capitalize(f?.foe ?? "They")} beat you.`;
    const r: Guild.EncounterResult = { id: e.id, kind: e.kind === "fight" ? "fight" : "choice", text, passed, useBrawl: true, foe: f?.foe, foePower: power, staminaLost: lost, injuries: [] };
    if (option) r.chose = option.id;
    if (f?.brawlKind) r.brawlKind = f.brawlKind;
    if (passed) {
      if (f?.loot) run.loot.push(f.loot);
      run.gold += option?.gold ?? 0;
      run.points += option?.points ?? 0;
      run.fans += option?.fans ?? 0;
    } else {
      const g = this.guild;
      const inj = g ? Guild.rollInjury("her", Guild.INJURY_CHANCE.lost, g.party, () => this.random()) : null;
      if (inj) {
        r.injuries.push(inj);
        run.injuries.push(inj);
      }
      // Beaten on the road, the quest's over: they have her (the defeat plays first, brawlOffer), then home to Tarven.
      if (f) run.captured = { by: f.foe, brawlKind: f.brawlKind };
      run.collapsed = true;
    }
    run.corruption += option?.corruption ?? 0;
    if (run.stamina <= 0) {
      run.collapsed = true;
      if (!passed && f && !run.captured) run.captured = { by: f.foe, brawlKind: f.brawlKind };
    }
    run.results[encounter] = r;
    return text;
  }

  /**
   * A monster brawl's end. Won (or, somehow, talked down): the pack's put down, each one experience for her, the
   * fight's loot, and a healer patches her up. Lost: she's hurt, the quest's over, and her party drags her home
   * to Tarven (monsters never take her).
   */
  private questMonstersDone(passed: boolean, e: Guild.FightEncounter, encounter: number, monsters: readonly Field.MonsterSpec[]): string {
    const run = this.questRun!;
    const g = this.guild;
    const lost = Math.max(1, Math.round(e.power / (passed ? 3 : 2)));
    run.stamina = Math.max(0, run.stamina - lost);
    const r: Guild.EncounterResult = { id: e.id, kind: "fight", text: e.text, passed, useBrawl: true, foe: e.foe, foePower: e.power, staminaLost: lost, injuries: [] };
    let text: string;
    if (passed) {
      for (const m of monsters) this.questKill(m);
      if (e.loot) run.loot.push(e.loot);
      const xp = monsters.reduce((sum, m) => sum + m.xp + Math.max(1, Math.round(m.xp / 2)), 0);
      text = `${capitalize(e.foe)}: beaten. (+${xp} XP${e.loot ? `, ${e.loot}` : ""})`;
      const mend = g && run.stamina > 0 ? Math.min(Field.healerMend(g.party), run.maxStamina - run.stamina) : 0;
      if (mend > 0) {
        run.stamina += mend;
        text += ` Your healer patches you up (+${mend} stamina).`;
      }
    } else {
      const inj = g ? Guild.rollInjury("her", Guild.INJURY_CHANCE.lost, g.party, () => this.random()) : null;
      if (inj) {
        r.injuries.push(inj);
        run.injuries.push(inj);
      }
      // Beaten, the quest's over: her party drags her clear and home to Tarven (monsters never take her).
      run.collapsed = true;
      text = `${capitalize(e.foe)} beats you. You're done: your party drags you clear.`;
    }
    if (run.stamina <= 0) run.collapsed = true;
    run.results[encounter] = r;
    return text;
  }

  /** Every encounter on the map settled. */
  get questAllDone(): boolean {
    return !!this.questRun && this.questRun.results.every((r) => r !== null);
  }

  /**
   * Home from the quest: settled like any expedition. Anything she left unwalked counts as failed, and the last
   * stand not won is a failed quest. Gone down out there, her party drags her home hurt (monsters never take her).
   */
  questFinish(): Guild.ExpeditionResult | null {
    const run = this.questRun;
    const g = this.guild;
    if (!run || !g) return null;
    if (run.collapsed) {
      const into = (inj: Guild.Injury | null) => inj && run.injuries.push(inj);
      into(Guild.rollInjury("her", Guild.INJURY_CHANCE.lost, g.party, () => this.random()));
      for (const c of g.party) into(Guild.rollInjury(c.id, Guild.INJURY_CHANCE.companion, g.party, () => this.random()));
      if (!run.captured) this.say("You go down. Your party drags you home between them.");
    }
    const results = run.encounters.map(
      (e, i): Guild.EncounterResult => run.results[i] ?? { id: e.id, kind: e.kind, text: `${e.text} (left undone)`, passed: false, staminaLost: 0, injuries: [] },
    );
    const bossFailed = run.encounters.some((e, i) => {
      const boss = e.boss || (e.kind === "choice" && e.options.some((o) => o.fight?.boss));
      return boss && !results[i].passed;
    });
    const res = Guild.settleExpedition(run.quest, g.party, {
      results,
      injuries: run.injuries,
      loot: run.loot,
      gold: run.gold,
      points: run.points,
      fans: run.fans,
      corruption: run.corruption,
      stamina: run.stamina,
      collapsed: run.collapsed,
      bossFailed,
      captured: run.captured,
      rival: run.rival,
    });
    g.accepted = null;
    this.questRun = null;
    this.applyExpedition(run.quest, res);
    if (run.kills) this.say(`Out there you put down ${run.kills} monster${run.kills === 1 ? "" : "s"} (+${Math.round(run.xp)} XP).`);
    return res;
  }

  /** Guild master (§8): whether she can take the hall, what's missing, and the counter in her taproom she needs first. */
  guildMasterCheck(): { ok: boolean; missing: string[] } {
    const g = this.guild;
    if (!g) return { ok: false, missing: ["a guild card"] };
    return Guild.guildMasterEligible({ rank: g.rank, points: g.points, quests: g.quests, guildCounter: g.counter, kestrelBacks: Guild.rankIndex(g.rank) >= Guild.rankIndex("C") });
  }

  buildGuildCounter(): boolean {
    const g = this.guild;
    if (!g || g.counter || this.phase !== "day" || Guild.rankIndex(g.rank) < Guild.rankIndex("A") || this.gold < GUILD_COUNTER_COST) return false;
    this.gold -= GUILD_COUNTER_COST;
    g.counter = true;
    this.say("A guild counter goes up at the end of your bar. Adventurers start leaving their cards on it.");
    return true;
  }

  becomeGuildMaster(): boolean {
    const g = this.guild;
    if (!g || g.master || !this.guildMasterCheck().ok) return false;
    g.master = true;
    this.say("The lowland hall's seal arrives by courier. You run the guild in Tarven now.");
    return true;
  }

  /** The hall's cut (guild master). */
  setGuildCut(cut: Guild.QuestCutId): boolean {
    if (!this.guild?.master) return false;
    this.guild.cut = cut;
    return true;
  }

  /** A day running the hall (guild master): the cut of today's quests, and a recruiting drive if she runs one. Once a day. */
  runGuildHall(drive?: Guild.RecruitDriveId): Guild.HallDay | null {
    const g = this.guild;
    if (!g?.master || this.guildHallToday || this.phase !== "day") return null;
    if (drive && this.gold < Guild.RECRUIT_DRIVES[drive].cost) return null;
    this.guildHallToday = true;
    const day = Guild.hallDay(g.cut, this.guildQuestGold, () => this.random(), drive);
    this.adjust(day.gold, 0, 0);
    g.mood += day.mood;
    g.members += day.recruits;
    this.say(`The hall's day: ${day.gold >= 0 ? "+" : ""}${day.gold} gold, mood ${g.mood}${drive ? `, ${day.recruits} recruits` : ""}.`);
    return day;
  }

  /** A day passes: her injuries and her friends' heal a day. */
  private guildDayPassed(): void {
    const g = this.guild;
    if (!g || g.injuries.length === 0) return;
    for (const i of g.injuries) i.days--;
    g.injuries = g.injuries.filter((i) => i.days > 0);
    this.refreshEffects();
  }

  // ---------- The Revel House (revel.ts, REVEL_HOUSE.md) ----------

  /** The Revel Hall, built from the house plans; the night's settings; and whether tonight's a revel night. */
  revelHall = false;
  revelSettings: RevelSettings = { ...DEFAULT_REVEL };
  revelTonight = false;
  /** Tonight's revel has been held. */
  private revelHeld = false;
  /** The offer waiting at bedtime is the revel's, not a brawl winner's (no defeat is counted). */
  private revelScene = false;

  /** Whether she can build the Revel Hall now: by day, in Act 3 and ready for it, with the gold. */
  get canBuildRevelHall(): boolean {
    return this.phase === "day" && !this.revelHall && this.revelReady && this.gold >= REVEL_HALL_COST;
  }

  buildRevelHall(): boolean {
    if (!this.canBuildRevelHall) return false;
    this.gold -= REVEL_HALL_COST;
    this.revelHall = true;
    this.say("Cushions, drapes and the big table: the taproom can be the Revel Hall on the nights you choose.");
    return true;
  }

  private get revelFacts() {
    return {
      lewdness: this.lewdness,
      corruption: this.corruption,
      tableScenes: this.records.taproomScenes,
      taproomPartners: this.records.taproomPartners,
      builds: this.revelHall ? ["revelHall"] : [],
    };
  }

  /** Whether the Revel Hall shows on the house plans: from Act 3 (Last Call, act3.ts) on. */
  get revelShown(): boolean {
    return this.storyAct >= 3 || this.revelHall;
  }

  /**
   * Whether she's ready to build the Revel Hall: Act 3, her lewdness or corruption, and the table scenes, all but the
   * Hall itself. From Act 3 the Hall shows on the house plans, greyed out with what's missing till she's ready.
   */
  get revelReady(): boolean {
    const f = this.revelFacts;
    return (
      this.storyAct >= 3 &&
      (f.lewdness >= REVEL_UNLOCK.lewdness || f.corruption >= REVEL_UNLOCK.corruption) &&
      (f.tableScenes >= REVEL_UNLOCK.tableScenes || f.taproomPartners >= REVEL_UNLOCK.partners)
    );
  }

  /** Whether a revel night is open to her: Act 3, and revel.ts's own conditions. */
  get revelOpen(): boolean {
    return this.storyAct >= 3 && revelUnlocked(this.revelFacts);
  }

  /** What's still missing before she can hold a revel night, in words (empty once it's open). */
  revelMissing(): string[] {
    const f = this.revelFacts;
    const out: string[] = [];
    if (this.storyAct < 3) out.push("Act 3, Last Call (after Act 2's second Ledger)");
    if (f.lewdness < REVEL_UNLOCK.lewdness && f.corruption < REVEL_UNLOCK.corruption) out.push(`lewdness ${REVEL_UNLOCK.lewdness} or corruption ${REVEL_UNLOCK.corruption}`);
    if (f.tableScenes < REVEL_UNLOCK.tableScenes && f.taproomPartners < REVEL_UNLOCK.partners) out.push(`${REVEL_UNLOCK.tableScenes} table scenes or ${REVEL_UNLOCK.partners} partners there (${f.tableScenes}, ${f.taproomPartners})`);
    if (!this.revelHall) out.push(`the Revel Hall (house plans, ${REVEL_HALL_COST} gold)`);
    return out;
  }

  /** Makes tonight a revel night, or not: by day, once it's open. */
  setRevelTonight(on: boolean): boolean {
    if (this.phase !== "day" || (on && !this.revelOpen)) return false;
    this.revelTonight = on;
    return true;
  }

  /** Steps one of the night's settings on to its next choice: by day. */
  cycleRevel(which: "who" | "herPart" | "door"): boolean {
    if (this.phase !== "day") return false;
    const next = <T>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length];
    const s = this.revelSettings;
    if (which === "who") s.who = next<RevelWho>(["men", "mixed", "women"], s.who);
    else if (which === "herPart") s.herPart = next<RevelPart>(["host", "join", "centrepiece"], s.herPart);
    else s.door = next<RevelDoor>(["open", "invite", "paying"], s.door);
    return true;
  }

  /**
   * Tonight's revel, as the doors shut (a placeholder until the hall and the group poses are drawn): who came, the
   * room's groups, and the night's worth at dawn. If she's joining in or the centrepiece, her scene uses the After
   * Hours game with as many as the crowd rule says: with Consent on she's asked (the bedtime offer, hers to take or
   * not); with Consent off, it follows the Consent-off rules. `withScene` false (put to bed without it) skips hers.
   */
  holdRevel(withScene = true): boolean {
    if (!this.revelTonight || this.revelHeld) return false;
    this.revelHeld = true;
    const s = this.revelSettings;
    const e = this.effects;
    const r = this.records;
    const mix = revelGuests(s, this.random);
    for (let i = 0; i < e.revelGuests; i++) {
      const female = s.who === "women" || this.random() < (s.who === "mixed" ? 0.5 : 0.1);
      mix.guests.push({ kind: GUEST_KIND_LIST[Math.floor(this.random() * GUEST_KIND_LIST.length) % GUEST_KIND_LIST.length], female });
    }
    mix.women = mix.guests.filter((g) => g.female).length;
    mix.men = mix.guests.length - mix.women;
    mix.shareFemale = mix.guests.length ? mix.women / mix.guests.length : 0;
    const night = revelNight(s, mix, this.random);
    if (s.who !== "men" && e.revelWomen > 0) night.wantHer.women = Math.min(mix.women, night.wantHer.women + e.revelWomen);
    this.say(this.logLine(REVEL_OPEN_LINES[s.who]));
    for (const g of night.groups.slice(0, 3)) this.say(this.logLine(REVEL_GROUP_LINES, { n: g.members.length }));
    if (night.stops > 0) this.say(this.logLine(REVEL_STOP_LINES));

    let herPartners = 0;
    if ((s.herPart === "join" || s.herPart === "centrepiece") && this.playerBody === "Female") {
      const crowd = centrepieceCrowd({ taproomPartners: r.taproomPartners, fightsLost: r.fightsLost, defeats: r.defeats }, s, night.wantHer);
      let { men, women } = crowd;
      if (e.centrepieceExtra > 0 && crowd.total > 0 && crowd.total < CENTREPIECE_MAX) {
        if (men < night.wantHer.men) men++;
        else if (women < night.wantHer.women) women++;
      }
      const males = mix.guests.filter((g) => !g.female).slice(0, men);
      const females = mix.guests.filter((g) => g.female).slice(0, women);
      const partners = [...males, ...females].map((g) => ({ kind: g.kind, female: g.female, stats: statsOf(g.kind) }));
      if (partners.length > 0 && !withScene) {
        this.morningAfter.push(this.logLine(REVEL_MISSED_LOG, { n: partners.length }));
      } else if (partners.length > 0 && this.consentOff) {
        this.forceDuel(partners, "here", partners.length > 1 ? FORCED_HERE_CREW : FORCED_HERE_ONE);
        herPartners = partners.length;
        this.say(this.logLine(REVEL_CENTRE_FORCED_LOG, { n: partners.length > 1 ? `${partners.length} of them` : "one of them" }));
      } else if (partners.length > 0 && this.drunk >= SLOPPY_DRUNK) {
        this.say(this.logLine(REVEL_TOO_DRUNK_LOG));
      } else if (partners.length > 0) {
        const [lead, ...rest] = partners;
        this.brawlOffer = {
          kind: lead.kind,
          stats: lead.stats,
          female: lead.female,
          drunk: false,
          crew: rest.map((p, i) => ({ id: REVEL_CREW_ID + i, kind: p.kind, female: p.female, stats: p.stats, label: p.stats.label ?? p.kind, ask: "\"Make room for me too?\"" })),
        };
        this.revelScene = true;
        this.say(this.logLine(REVEL_ASK_LOG[crowdOf(partners)], { n: partners.length > 1 ? `${partners.length} of them want` : "One of them wants" }));
      }
    }
    const dawn = revelDawn({ settings: s, mix, night, herPartners, records: { revelNights: r.revelNights, revelPartnersMost: r.revelPartnersMost, mixedNights: r.mixedNights } });
    this.adjust(dawn.gold, 0, dawn.heat);
    this.earned += dawn.gold;
    this.shift({ fame: dawn.fame, respect: dawn.respect });
    this.fansTonight += dawn.fans.count;
    this.fanTags.lantern += Math.max(0, dawn.fans.count);
    r.revelNights = dawn.records.revelNights;
    r.revelPartnersMost = dawn.records.revelPartnersMost;
    r.mixedNights = dawn.records.mixedNights;
    // More than hosting, and the barracks may hear of it (knight.ts).
    if (s.herPart !== "host") this.knightScandal("lanternNight");
    this.morningAfter.push(`${dawn.line} (+${dawn.gold} gold, fame +${dawn.fame}, respect ${dawn.respect}${dawn.heat ? `, +${dawn.heat} heat` : ""}, ${dawn.fans.count} Revel fans)`);
    return true;
  }

  /** Tonight's defeat, if she's had one (defeat.ts): which, for the picture and the morning. */
  defeatTonight: DefeatId | null = null;
  /** The pose the big picture holds while a defeat plays: its stand-in until its own is made (POSES_TODO.md). */
  get defeatPose(): ScenePoseName | null {
    const id = this.duel?.defeat?.id as DefeatId | undefined;
    return id && DEFEATS[id] ? DEFEATS[id].standIn : null;
  }
  /** An after-hours game in progress, or null; and how the last one ended, for the game to show once. */
  duel: Duel | null = null;
  lastDuel: { outcome: DuelOutcome; text: string; line: string; gold: number; test?: boolean; brawl?: boolean; taproom?: boolean } | null = null;
  /** Whether the duel going on is a test one, which counts for nothing. */
  private testDuel = false;
  /** Whether the duel going on is the one she agreed to after losing a brawl: the night ends after it. */
  private brawlDuel = false;

  /** Whether the game going on is the one after a brawl she lost: its picture starts with her down where she fell. */
  get duelAfterBrawl(): boolean {
    return this.brawlDuel;
  }
  /** Where the game after a lost brawl is played (`brawlPlaces`): right where she fell, upstairs, or out back. */
  private brawlPlace: BrawlPlace = "upstairs";
  /** Guests she let touch her tonight who weren't drunk: one of them might linger after closing. */
  private admirers: { kind: GuestKind; stats: RoleStats }[] = [];
  /** Sober guests she talked out of a brawl tonight: one of them might linger after closing too. */
  private peacemade: { kind: GuestKind; stats: RoleStats }[] = [];
  /** Whose turn it is in each group's roster, so a group's types take turns through the door. */
  private roleTurn: Partial<Record<GuestKind, number>> = {};
  /** Guests sit calling her over, and only say what they want once she comes to take their order. */
  takeOrders = tableService.takeOrders;
  private duelTonight = false;
  /** Brawls tonight, and drinks she's had tonight. */
  private fightsTonight = 0;
  private drinksTonight = 0;
  /** Bar work (barwork.ts): the sibling who last served, a tablemate waiting their turn, and her drinking herself under. */
  private lastServer: number | null = null;
  private joinNext: { guestId: number; prelude: TalkLine[]; joined: number[] } | null = null;
  private passingOut = false;
  /** The guest who'll ask for adult play once she's done talking, on her last clear drink; and whether one has tonight. */
  private lastClearFrom: number | null = null;
  private lastClearAsked = false;
  /** How far past the top of drunk she's drunk tonight, in drunk points: it wears off before she sobers (barwork.ts). */
  overLimit = 0;
  /** Something she's just started acting out, once, for the game to play on her (player.ts `Act`). */
  private actMoment: "dress" | "faint" | null = null;
  /** Seconds left of putting a piece back on: it's still off her until her hands bring it up (barwork.ts). */
  private dressLeft = 0;
  /** Tonight's touches, for the journal: how many guests reached, how many you let, how many you turned away. */
  readonly touchesTonight = { reached: 0, allowed: 0, refused: 0, boldest: 0 };
  /** Who the player is, so what guests say fits them. The game sets it. */
  playerBody: PlayerBody = "Male";
  /** The outfit the player has on, by id; missing means their own. Guests go for its pieces in its own order. */
  playerOutfit: string | undefined = undefined;
  /** The style of legwear she has on, by id; the outfit's own when undefined. */
  playerLegwear: string | undefined = undefined;
  /** Her bra (or one-piece) and briefs, by style id; her band and braies when unset. */
  playerUnder: { bra?: string; briefs?: string } = {};
  /** Where chance comes from: which guests offer a drink, and what they say. Tests replace it. */
  random: () => number = Math.random;
  /**
   * Where each guest's own numbers are rolled from, in their type's range, as they walk in. Kept apart from
   * `random` so the rolls don't shift what else chance decides. Tests pin it at 0.5, which gives the type's own.
   */
  rollRandom: () => number = Math.random;
  /**
   * Where the night's crowd is rolled from: who walks in alone, and how many more come (rollArrivals). Null gives
   * each night's list as written; the tests' setup makes that the default (crowdDice).
   */
  crowdRandom: (() => number) | null = crowdDice.roll;
  /** Where whether a guest grabs her as she serves them is rolled from (maybeGrab). Null: nobody grabs. */
  grabRandom: (() => number) | null = grabDice.roll;
  /** Where whether a guest asks for a look at her is rolled from (maybeAskToSee). Null: nobody asks. */
  showRandom: (() => number) | null = showDice.roll;
  /** Where whether a guest who reaches goes for adult play is rolled from (adultplay.ts). Null: nobody does. */
  adultRandom: (() => number) | null = adultDice.roll;
  /** Tonight's guests, in the order they come: the night's own list, rolled as the night begins. */
  private arrivals: Arrival[] = [];
  /** Tonight's guests, as rolled when the night began. */
  get tonight(): readonly Arrival[] {
    return this.arrivals;
  }
  /** The player's reputation, which changes what guests say. It lasts from night to night. */
  persona: Persona = newPersona();
  /** Lines guests have already said, so they say something new next time. */
  private readonly saidLines = new Set<string>();
  /** How far down the wardrobe's strip ladder guests have got you tonight: 0 is fully dressed. Back on by morning. */
  stripped = 0;

  /**
   * Her closet: she changes into the outfit, legwear and underwear picked there, and has all of it on, whatever
   * was off before. Guests go for the new clothes' pieces from then on.
   */
  changeClothes(outfit: string | undefined, legwear: string | undefined, under: { bra?: string; briefs?: string }): void {
    this.playerOutfit = outfit;
    this.playerLegwear = legwear;
    this.playerUnder = { ...under };
    this.stripped = 0;
    this.dressLeft = 0;
  }
  /** What men have left on her tonight, in ml by spot. She washes before the next night. */
  private coated: Partial<Record<CumSpot, number>> = {};
  /** How far she undressed herself in tonight's duel, kept until morning: 0, down to her shift, or bare. */
  private undressedTonight = 0;
  /** A test duel just over, still shown on her until its result is taken; it counts for nothing else. */
  private endedTest: Duel | null = null;
  /** Favors guests have already asked. Each is asked once, so nobody keeps pressing the same letter on you. */
  private readonly askedFavors = new Set<string>();
  /**
   * What's still to come of favors (favors.ts): a promise coming due, or a favor being returned, and the night it's
   * due from. It comes the next time she serves the right kind of guest on or after that night.
   */
  favorsDue: { id: string; night: number }[] = [];
  /** What a party was saying as you sat down with them. */
  private talkOpening: TalkLine[] = [];
  /** How each party has treated you tonight: drinks poured, and whether you sold them a jug. */
  private readonly partyState = new Map<number, PartyState>();

  heardRumor = false;
  served = 0;
  walkouts = 0;
  earned = 0;
  lastResult = "";
  ending: EndingId | null = null;

  private nextArrival = 0;
  private nextGuestId = 1;
  private nextMessId = 1;
  /** The dirty cups and dishes in each sibling's hands. */
  private readonly dirtyHeld: [Ware[], Ware[]] = [[], []];
  /** When the last wash came out clean (performance.now()), for the tub's sparkle. */
  washedAt = -Infinity;
  /** Seats where ale went on the floor tonight. */
  private readonly spiltAt = new Set<number>();
  private readonly messages: string[] = [];
  private readonly unlocks: PassiveDef[] = [];
  /** Level ups and a change in her kink, for the game to show as they happen (see takeGains). */
  private readonly gains: Gain[] = [];
  /** Her Level and Slut Level as last shown, so a rise is shown once (and a loaded game doesn't announce itself). */
  private shownLevel = 1;
  private shownSlut = 0;
  /** Seconds until passives are checked again during the night. */
  private passiveCheck = 0;
  private readonly cues: Cue[] = [];

  /** The night was opened with mess still about, which lets a spider back in by morning. */
  private openedDirty = false;

  /** `seatTables` names the table each seat is at, so a party can sit together. "Bar" stools are not a table. */
  /** `dustSpots` is how many places in the room dust can settle; with none, nights leave no dust. */
  /** `cobwebSpots` is how many places up on the walls a cobweb can hang; with none, there are never any. */
  constructor(
    private seatCount: number,
    private seatTables: readonly string[] = [],
    private readonly dustSpots = 0,
    private readonly cobwebSpots = 0,
  ) {
    this.openDay();
  }

  /**
   * A new game's first morning: the tavern has stood shut since Grandma Wren died, so there are cobwebs up in
   * the corners and dust all over the floor. Cleaning them is how she learns to clean, and the bell won't ring
   * until it's done. Only on the first day, and only once.
   */
  settleIn(): void {
    if (this.nightIndex !== 0 || this.phase !== "day" || this.messes.length > 0) return;
    const add = (kind: MessKind, spots: number[]) => this.messes.push({ id: this.nextMessId++, kind, spots });
    for (const spot of shuffled(this.cobwebSpots, 17).slice(0, FIRST_DAY_COBWEBS)) add("cobweb", [spot]);
    for (const spot of shuffled(this.dustSpots, 29).slice(0, FIRST_DAY_DUST)) add("dust", [spot]);
    if (this.messes.length === 0) return;
    // This morning's usual "the tavern is closed" line gives way to the one that says what to do.
    this.messages.length = 0;
    this.say(
      "Day 1. Nobody has opened the place since Grandma died. Cobwebs hang high on the walls, and dust lies all over the floor.",
    );
    this.say(
      "Clean it before you open. Walk up to a cobweb and press E to brush it down, then sweep the dust the same way. The bell on the bar rings once it's all done.",
    );
  }

  /** The first morning's cleaning still isn't done: the bell waits for it. */
  get settlingIn(): boolean {
    return this.nightIndex === 0 && this.phase === "day" && this.messes.some((m) => m.kind === "cobweb" || m.kind === "dust");
  }

  /** Replaces the seats, after furniture has moved. Only safe with no guests in the room. */
  setSeats(tables: readonly string[]): void {
    this.seatCount = tables.length;
    this.seatTables = tables;
  }

  /** Rings the bell to open for the night. The night's guests start coming once night has fallen. */
  open(): void {
    if (this.phase !== "day" || this.settlingIn) return;
    this.phase = "dusk";
    // Her line as the night starts (KP's waitress start).
    if (this.playerBody === "Female") this.say(`You: ${this.herBar("shift")}`);
    this.openedDirty = this.messes.length > 0;
    // Refresh, Refresh (feedstar.ts): some nights she can't keep off her phone.
    if (this.playerBody === "Female" && Feed.checksPhone(this.watchedEffects, () => this.random())) {
      this.phoneTonight = true;
      this.refreshEffects();
      this.say("You catch yourself checking the feed between orders. Again.");
    }
    this.say(
      this.messes.length > 0
        ? "You ring the bell and open up, mess and all. Guests won't wait as long in a dirty room."
        : "You ring the bell and open up. The sun goes down over Tarven.",
    );
  }

  /** Goes to bed after last call and sleeps until morning. */
  sleep(): void {
    if (this.phase !== "bedtime") return;
    this.phase = "dawn";
    // A night's sleep takes some of the wear off her (7k).
    this.tire(-FATIGUE_REST.sleep);
    this.drunk = 0;
    this.overLimit = 0;
    // A revel night not yet held (the night closed early) is held now, without her scene; an offer she slept on lapses.
    if (this.revelTonight && !this.revelHeld) this.holdRevel(false);
    if (this.revelScene) {
      this.brawlOffer = null;
      this.revelScene = false;
    }
    this.endOfNight();
    // The morning after tonight's invitations (invitetalk.ts).
    for (const line of this.morningAfter.splice(0)) this.say(line);
  }

  /**
   * As she goes to bed: the night's records are counted, her passives have their nightly say, and anything
   * she's earned is hers from tomorrow.
   */
  private endOfNight(): void {
    const r = this.records;
    // Three brawls tonight, and tomorrow's a riot night (KP's riots); her hair grows a night (KP's RemtairyHair).
    if (this.fightsTonight >= RIOT_AFTER && !this.riot) {
      this.riot = true;
      this.riotWins = 0;
      this.morningAfter.push("Word's all over the pass: the tavern's where the fighting is. Tonight will be a riot.");
    }
    this.hairNights++;
    this.showTonight = false;
    this.roomsTonight = false;
    this.roomGuests = [];
    // Maxed is as high as her cap let it go tonight (KP's max desire); the best a meter's ever reached lifts its cap.
    for (const m of METERS) if (this.peak[m] >= this.desireCap(m)) r.maxed[m] = (r.maxed[m] ?? 0) + 1;
    for (const m of METERS) r.best[m] = Math.max(r.best[m] ?? 0, Math.round(this.peak[m]));
    if (METERS.every((m) => this.peak[m] >= ALL_HIGH)) r.allHigh++;
    if (this.playerBody === "Female") {
      const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder).length;
      r.clothesLost += this.stripped;
      if (ladder > 0 && this.stripped >= ladder) r.bareNights++;
      if (this.touchesTonight.reached > 0 && this.touchesTonight.allowed === 0) r.chasteNights++;
    }
    // Bar work: a night nobody walked out of, and a busy one.
    if (this.walkouts === 0 && this.served >= SMOOTH_NIGHT_SERVED) r.smoothNights++;
    if (this.served >= BUSY_NIGHT_SERVED) r.busyNights++;
    if (this.persona.respect >= HIGH_RESPECT_NIGHT) r.respectNights++;
    // A night without a drink keeps her head clear; with a proper night's work, it's a sober shift.
    if (this.drinksTonight === 0) this.gainXp("mind", 3);
    if (this.drinksTonight === 0 && this.served >= SOBER_NIGHT_SERVED) r.soberNights++;
    // A Lantern night may be talked about in the barracks (knight.ts, her double life).
    if (this.lantern.hung && this.lantern.litTonight) this.knightScandal("lanternNight");
    // Anyone still upstairs comes down and pays, and the night has its say on the girls (lantern.ts).
    this.lantern.endNight(this.lanternHost);
    // Her staff: paid, their night, their dawn lines (staff.ts).
    this.settleStaff();
    // What the laws do to her takings every night (townhall.ts): the ale tax, the curfew, the brothel law.
    if (this.politics.reeve) {
      const law = this.lawEffects;
      if (law.nightlyGold || law.nightlyHeat) {
        this.adjust(law.nightlyGold, 0, law.nightlyHeat);
        if (law.nightlyGold > 0) this.earned += law.nightlyGold;
      }
    }
    // What her careers pay every night (careers.ts): the crew's cut, the devotees' tithe.
    const careerPay = nightlyPay(this.careers);
    if (careerPay.gold || careerPay.heat) {
      this.adjust(careerPay.gold, 0, careerPay.heat);
      this.earned += careerPay.gold;
    }
    const nightly = this.effects.perNight;
    this.adjust(nightly.gold, nightly.trust, nightly.heat);
    if (nightly.respect) this.shift({ respect: nightly.respect });
    // Her garrison rank keeps the heat down while she's in favour (knight.ts).
    if (this.knight) {
      const heat = Knight.effectsOf(this.knight).heatPerNight;
      if (heat) this.adjust(0, 0, heat);
    }
    this.settleRegulars();
    this.awardPassives();
    this.arcDawn();
    // The story's own clock: off in the tests' setup, whose nights go by number.
    if (this.storyBeats) this.recruitsDawn();
    this.countFans();
    this.lettersAtDawn();
    // A night gone off every debuff that lasts for nights.
    this.debuffs = this.debuffs.filter((d) => d.nights === 0 || --d.nights > 0);
    this.refreshEffects();
    // The baron's heard enough: the garrison comes in the night. Not the end of her, but it costs.
    if (this.heat >= HEAT_MAX) this.raid();
  }

  /**
   * The first morning she's a new stage on her arc (STORY.md 4b), she has her own line on the dawn report and the
   * stage's story card in its trope's voice (lewd.ts `ARC_CARDS`, CORRUPTION_TROPES.md), and at Willing, the words
   * she said to Tansy come back to her; the morning after Known, its aftermath. A new corruption tier has its card
   * too. Only words: no card starts anything.
   */
  private arcDawn(): void {
    const base = arcStage(this.arcFacts);
    const step = arcDawnStep(base, this.arcSeen, CORRUPTION_TIERS.indexOf(corruptionTier(this.corruption)) >= 2);
    if (step) {
      this.arcSeen = step.seen;
      this.news.push(cardTitle(step.card.title), ...arcCardLines(step, this.consentOff));
      if (step.stage === "willing" && this.plotFlags.has("deniedLantern")) this.news.push(TANSY_CALLBACK);
    }
    this.legendDawn(base);
    const tier = corruptionDawnStep(this.corruption, this.tierSeen);
    if (tier) {
      this.tierSeen = tier.seen;
      this.news.push(...cardLines(tier.card));
    }
  }

  /**
   * The Warm House's recruits at dawn (recruits.ts): each may have gone up the hill yesterday, and a stage made is its
   * story card in the church's voice and the town's gossip. One she helped all the way brings her their fans.
   * With Oden's chapel shut, Veyra fills the empty faith: every visit counts double.
   */
  private recruitsDawn(): void {
    const shut = this.plotFlags.has("odenShut") || this.lawEffects.veyraFaith;
    for (const id of RECRUIT_IDS) {
      const { state, stepped } = churchDay(this.recruits[id], this.random(), shut);
      this.recruits[id] = state;
      if (!stepped || state.stage === 0) continue;
      const def = RECRUITS[id];
      const stage = state.stage as 1 | 2 | 3;
      this.news.push(...cardLines(recruitCard(def, stage)), def.gossip[stage - 1]);
      if (stage === 3 && state.helped > 0) {
        this.errandFans += DEVOTEE_FANS;
        this.news.push(`${def.short} sends ${DEVOTEE_FANS} devotees your way: "the keeper who sent me up the hill."`);
      }
    }
  }

  /**
   * Her standing in town (towntalk.ts RoleId), the most public first: the garrison's ranks, a Priestess of Veyra or
   * higher, the Lantern's madam, a guild adventurer, else the keeper. The smuggler's ladder is never public.
   */
  get herRole(): string {
    if (this.politics.reeve) return "reeve";
    const k = this.knight?.rank;
    if (k === "captain" || k === "commander") return "knightCaptain";
    if (k === "knight") return "knight";
    if (k === "squire") return "squire";
    if (this.careers.clergy.rank >= 2) return "priestess";
    if (this.lantern.lit) return "madam";
    if (this.guild) return "adventurer";
    return "keeper";
  }

  /** What a recruit guest wears tonight: their stage's outfit (recruits.ts), or null for anyone else. */
  recruitOutfitOf(guest: Pick<Guest, "recruit">): RecruitOutfit | null {
    return guest.recruit ? RECRUITS[guest.recruit].outfits[this.recruits[guest.recruit].stage] : null;
  }

  /**
   * Her Legend at dawn (lewd.ts `legendStep`): tonight was wild (LEGEND_WILD touches let), quiet (willpower kept
   * above half, as Wren's keeper letter counts it, and next to nothing let), or neither, and a chapel visit today
   * counts toward coming back. A rise or a fall has its card. Only words: it changes no check and starts nothing.
   */
  private legendDawn(base: ArcStage): void {
    const night = herLegendNight({
      stage: base,
      lewdness: this.lewdness,
      lets: this.touchesTonight.allowed,
      keptWill: !this.willDipped && this.willpower * 2 >= this.maxWillpower,
      chapel: [...this.townDoneToday].some((done) => done.startsWith("chapel:")),
    });
    const { state, change } = legendStep(this.legend, night);
    this.legend = state;
    if (!change) return;
    if (change === "rise") this.records.legendRises++;
    else this.records.legendFalls++;
    this.news.push(...legendCardLines(change, state.rises, this.consentOff));
  }

  /** Where she stands on the Legend, for the journal: how close she is to it, or to coming back from it. */
  get legendNote(): string {
    if (this.legend.on) return `The room chants her name. ${this.legend.streak} of ${LEGEND_FALL} quiet nights to come back to Known (a day at the chapel counts one).`;
    if (arcStage(this.arcFacts) !== "known") return "";
    if (this.lewdness < LEGEND_AT) return `Legend lies past Lewdness ${LEGEND_AT}.`;
    return `${this.legend.streak} of ${LEGEND_RISE} wild nights in a row to Legend.`;
  }

  /** How many touches she's let happen, all told. */
  private get timesLet(): number {
    return Object.values(this.touchMemory.lets).reduce((sum, n) => sum + (n ?? 0), 0);
  }

  /** The night's fans, counted at dawn: the guests', a filthy room against her, and her partner houses'. */
  private countFans(): void {
    let won = this.fansTonight + this.errandFans;
    this.errandFans = 0;
    if (this.messes.length >= FILTHY_AT) won += FANS_FILTHY;
    const partners = HOUSES.filter((h) => this.houses[h.id] === "partner");
    // Partner houses send fans of their own kind (chapter1.ts HOUSE_GROUP).
    for (const h of partners) if (HOUSE_GROUP[h.id] === "network") this.fanTags.network += PARTNER_FANS;
    if (partners.length > 0) {
      won += PARTNER_FANS * partners.length;
      const gold = PARTNER_GOLD * partners.length;
      this.adjust(gold, 0, 0);
      this.news.push(`Your partner ${partners.length === 1 ? "house sends" : "houses send"} ${gold} gold and their regulars.`);
    }
    const before = this.fans;
    this.fans = Math.max(0, this.fans + won);
    this.fansTonight = 0;
    addFanNight(this.fanGroups, this.fans - before, this.fanTags);
    this.fanTags = { lantern: 0, network: 0 };
    if (won !== 0) this.news.push(`${won > 0 ? "+" : ""}${this.fans - before} fans (${this.fans} in all).`);
  }

  /** What Wren's letters read (letters.ts): all of it already kept, and the two counters of their own. */
  private get letterFacts() {
    const r = this.records;
    return {
      lets: this.timesLet,
      temptedNo: this.letters.temptedNo,
      duels: r.duelsWon + r.duelsLost + r.duelsStopped,
      brawlsWon: r.fightsWon,
      lewdness: this.lewdness,
      arc: this.arcStage,
      trust: this.trust,
      trustMax: TRUST_MAX,
      protected: this.persona.protected,
      willStreak: this.letters.willStreak,
      corruption: this.corruption,
    };
  }

  /**
   * At dawn, for Wren's letters: tonight's willpower counts toward her streak, and every letter whose milestone
   * she's reached is put by for the morning (one a morning: findMorningLetter).
   */
  private lettersAtDawn(): void {
    countWillNight(this.letters, !this.willDipped && this.willpower * 2 >= this.maxWillpower);
    this.willDipped = false;
    if (this.storyBeats) queueLetters(this.letters, this.letterFacts);
  }

  /** The morning: the next of Wren's letters is found, unless Pell's dawn brings his own (it's one a morning). */
  private findMorningLetter(): void {
    this.letterToday = null;
    if (!this.storyBeats || this.pendingBeat?.kind === "pell") return;
    this.letterToday = findNextLetter(this.letters);
  }

  /** The letter she found this morning, for the morning card: where, and the letter. Once. */
  takeLetter(): { id: LetterId; title: string; lines: string[] } | null {
    const id = this.letterToday;
    this.letterToday = null;
    if (!id) return null;
    return { id, title: `Wren's letter: ${LETTER_BY_ID.get(id)!.title}`, lines: letterLines(id) };
  }

  /** The house just above her on the Village Ledger: the next one to beat, or none once she's first. */
  get houseAbove(): HouseDef | null {
    return HOUSES.find((h) => !this.houses[h.id]) ?? null;
  }

  /** Her place in Tarven: 6th of 6 with no house beaten, 1st with all five. */
  get rank(): number {
    return rankOf(HOUSES.filter((h) => this.houses[h.id]).length);
  }

  /** The next beat, and the fans it needs. */
  get nextBeat(): Beat | null {
    return BEATS.find((b) => !this.beatsDone.has(b.id)) ?? null;
  }

  /**
   * The house above her fights back, some nights, as the night begins: it poaches some of her walk-ins, talks about
   * her in the square, or pays someone to start a fight. Rolled on the crowd's dice (none in the tests unless they roll).
   */
  private rivalNight(arrivals: Arrival[]): void {
    this.rivalMove = null;
    // The first Ledger's brawl night (act2.ts): Grig's men come to break her furniture, whatever else happens.
    if (this.ratBrawlTonight) {
      this.ratBrawlTonight = false;
      this.ratBrawlFrom = this.records.fightsWon;
      const last = Math.max(EXTRA_FIRST + 1, ...arrivals.map((a) => a.at));
      for (let i = 0; i < 2; i++) arrivals.push({ at: Math.max(EXTRA_FIRST, last / 2) + i, kind: "bandit", order: "ale", hired: true });
      arrivals.sort((a, b) => a.at - b.at);
      this.say("Grig's men from the Drowned Rat are here, and they haven't come to drink.");
    }
    const dice = this.crowdRandom;
    // On the pass (act2.ts), the rival just above her on the Ledger fights back the same way.
    const passAbove = !this.houseAbove && this.act2.pass.open ? Act2.rivalAbove(this.act2.pass, this.fans) : null;
    if (passAbove && this.storyBeats && dice && dice() < RIVAL_MOVE_CHANCE * (this.act2.pass.desperate ? 1.5 : 1)) {
      const moves: RivalMove[] = ["poach", "rumor", "thug"];
      const move = moves[Math.floor(dice() * moves.length) % moves.length];
      this.rivalMove = move;
      if (move === "poach") {
        for (let i = 0; i < POACHED; i++) {
          const at = arrivals.findIndex((a) => a.party === undefined && !a.rumor && !a.hired);
          if (at >= 0) arrivals.splice(at, 1);
        }
      } else if (move === "rumor") this.adjust(0, 0, 1);
      else {
        const last = Math.max(0, ...arrivals.map((a) => a.at));
        arrivals.push({ at: Math.max(EXTRA_FIRST, last / 2), kind: "bandit", order: "ale", hired: true });
        arrivals.sort((a, b) => a.at - b.at);
      }
      this.say(Act2.PASS_RIVALS[passAbove].fights);
      return;
    }
    const house = this.houseAbove;
    if (!this.storyBeats || !house || !dice || dice() >= RIVAL_MOVE_CHANCE) return;
    const moves: RivalMove[] = ["poach", "rumor", "thug"];
    const move = moves[Math.floor(dice() * moves.length) % moves.length];
    this.rivalMove = move;
    if (move === "poach") {
      for (let i = 0; i < POACHED; i++) {
        const at = arrivals.findIndex((a) => a.party === undefined && !a.rumor && !a.hired);
        if (at >= 0) arrivals.splice(at, 1);
      }
    } else if (move === "rumor") {
      if (dice() < 0.5) this.adjust(0, -1, 0);
      else this.adjust(0, 0, 1);
    } else {
      const last = Math.max(0, ...arrivals.map((a) => a.at));
      arrivals.push({ at: Math.max(EXTRA_FIRST, last / 2), kind: "bandit", order: "ale", hired: true });
      arrivals.sort((a, b) => a.at - b.at);
    }
    this.say(rivalMoveLine(move, house));
  }

  /**
   * What comes back of Act 1 as a night opens (plot.ts): Silas walks in angry the night after she sold the salt,
   * and the written nights open with what the room's saying about what she did.
   */
  private plotNight(arrivals: Arrival[]): void {
    if (!this.storyBeats) return;
    if (silasDue(this.plotFlags)) {
      this.plotFlags.add("silasCame");
      const last = Math.max(0, ...arrivals.map((a) => a.at));
      arrivals.push({ at: Math.max(EXTRA_FIRST, last / 3), kind: "smuggler", order: "ale", hired: true });
      arrivals.sort((a, b) => a.at - b.at);
      this.say(SILAS_ARRIVES);
    }
    for (const line of nightOpening(this.storyNight, this.plotFlags)) this.say(line);
  }

  /** Soldiers turn the place over in the night: a fine, the heat let off a little, and they'll be watching. */
  private raid(): void {
    const fine = Math.min(this.gold, RAID_FINE);
    this.gold -= fine;
    this.heat = HEAT_MAX - RAID_COOL;
    this.records.raids++;
    this.addDebuff("watched");
    this.news.push(`The garrison raided the tavern in the night. They fined you ${fine} gold, and they'll be watching.`);
    this.say(`Soldiers raid the tavern! -${fine} gold.`);
  }

  /** She takes on a debuff, or a worse one if she has it already, for its full time again. */
  addDebuff(id: DebuffId): void {
    const def = DEBUFFS[id];
    const had = this.debuffs.find((d) => d.id === id);
    if (had) {
      had.level = Math.min(def.maxLevel, had.level + 1);
      had.nights = def.nights;
    } else this.debuffs.push({ id, level: 1, nights: def.nights });
    const level = (had ?? this.debuffs[this.debuffs.length - 1]).level;
    this.gains.push({ kind: "debuff", id, level });
    this.refreshEffects();
  }

  /** Puts something right: the debuff goes. */
  clearDebuff(id: DebuffId): void {
    const before = this.debuffs.length;
    this.debuffs = this.debuffs.filter((d) => d.id !== id);
    if (this.debuffs.length !== before) this.refreshEffects();
  }

  /**
   * Gives her any passive she's earned, the moment she's earned it: checked through the night and once more at
   * bedtime, once the night's records are in. Each goes in tonight's list for the bedtime summary, and in the
   * queue for the game's log.
   */
  private awardPassives(): void {
    const earned = newlyEarned(this.passives, this.passiveFacts());
    const kinkBefore = this.kink;
    for (const def of earned) {
      this.passives.add(def.id);
      this.corruption += def.corruption ?? 0;
      this.newPassives.push(def);
      this.unlocks.push(def);
    }
    // Titles she's earned: the bonus once, now, and shown to her; she puts them on in the journal.
    const facts = this.passiveFacts();
    for (const def of TITLES) {
      if (this.titles.has(def.id) || !titleEarned(def, facts)) continue;
      this.titles.add(def.id);
      const { gold = 0, trust = 0, respect = 0, fame = 0 } = def.bonus;
      this.adjust(gold, trust, 0);
      if (respect || fame) this.shift({ respect, fame });
      this.gains.push({ kind: "title", id: def.id });
    }
    if (earned.length > 0) this.refreshEffects();
    // Her new passives can tip her kink over to another: how she talks after the Consent check changes with it.
    if (this.kink !== kinkBefore) this.gains.push({ kind: "kink", from: kinkBefore, to: this.kink });
    // Tonight's records count toward her lewdness even when no new passive came with them.
    this.unlockBrothel();
  }

  /** Passives earned since the game last asked, for the log. Reading them empties the queue. */
  takeUnlocks(): PassiveDef[] {
    return this.unlocks.splice(0);
  }

  /** Naps through the rest of the day while closed. Only once a day; the clock is moved on by the game. */
  nap(): void {
    if (this.phase !== "day" || this.napped) return;
    this.napped = true;
    this.drunk = 0;
    this.overLimit = 0;
    this.restoreWill(Math.round(this.maxWillpower * NAP_RESTORE));
    this.energySpent = Math.max(0, this.energySpent - Math.round(this.maxEnergy * NAP_ENERGY));
    this.tire(-FATIGUE_REST.nap);
    this.say("You wake up in the late afternoon. Ring the bell when you're ready.");
  }

  get plan(): NightPlan {
    if (!this.storyBeats) return NIGHTS[this.nightIndex] ?? sideNight(this.nightIndex);
    return NIGHTS[this.storyNight] ?? sideNight(this.nightIndex);
  }

  /** First in Tarven, the morning she passes the Copper Bell: once. */
  takeFirstInTarven(): boolean {
    const first = this.firstInTarven;
    this.firstInTarven = false;
    return first;
  }

  /**
   * The morning's beat, if she's reached the next one's fans: a written night tonight, a house's boss at her door,
   * or Pell. At most one a morning, in order. With none, tonight is a side night; and once the chapter's collections
   * are done, anything still owed is collected every few nights.
   */
  private fireBeat(): void {
    this.storyNight = -1;
    const beat = this.nextBeat;
    if (beat && this.fans >= beat.fans) {
      this.beatsDone.add(beat.id);
      if (beat.kind === "night") {
        this.storyNight = beat.night;
        return;
      }
      if (beat.kind === "house") {
        this.houses[beat.house] = "fallen";
        if (beat.collect) this.collect();
      }
      this.pendingBeat = beat;
      return;
    }
    const chapterDone = this.beatsDone.has("copperBell");
    if (chapterDone && this.owed > 0 && this.nightIndex % LATE_EVERY === 0) this.collect();
    if (chapterDone) this.act2Morning();
  }

  /**
   * Act 2's morning (act2.ts): a night on the pass for the rivals, Grig's brawl night settled, the partners' share,
   * then at most one card: a rival pushed to the bottom of the Ledger at her door, or the act's next beat.
   */
  private act2Morning(): void {
    const a = this.act2;
    if (a.pass.open) {
      a.pass = Act2.passNight(a.pass, () => this.random());
      const share = Act2.RIVAL_IDS.filter((id) => a.pass.rivals[id].fate === "partner").length * Act2.RIVAL_TERMS.partner.nightly;
      if (share) {
        this.adjust(share, 0, 0);
        this.earned += share;
      }
    }
    if (this.ratBrawlFrom >= 0) {
      if (this.records.fightsWon > this.ratBrawlFrom && !a.flags.includes("heldTheRoom")) {
        a.flags.push("heldTheRoom");
        this.news.push("You held the room against Grig's men. Silas's map of the toll routes is yours to claim, on the quarry road.");
      }
      this.ratBrawlFrom = -1;
    }
    if (this.pendingBeat) return;
    // A rival beaten in its showdown (act3.ts) is at her door, as one pushed to the bottom would be.
    const beaten = Act2.RIVAL_IDS.find((id) => a.pass.rivals[id].fallen && a.pass.rivals[id].fate === null);
    if (beaten) {
      this.pendingBeat = { id: `rival:${beaten}`, fans: this.fans, kind: "rival", rival: beaten };
      return;
    }
    const bottom = Act2.bottomRival(a.pass, this.fans);
    if (bottom) {
      a.pass.rivals[bottom].fallen = true;
      this.pendingBeat = { id: `rival:${bottom}`, fans: this.fans, kind: "rival", rival: bottom };
      return;
    }
    const next = Act2.nextAct2Beat(new Set(a.flags.filter((f) => f.startsWith("beat:")).map((f) => f.slice(5))));
    if (next && this.fans >= next.fans) {
      a.flags.push(`beat:${next.id}`);
      this.pendingBeat = { id: next.id, fans: next.fans, kind: "act2", beat: next.id };
      return;
    }
    if (a.flags.includes("act2Done")) this.act3Morning();
  }

  /**
   * Act 3's morning (act3.ts): its next card, once her fans reach it, one a morning. Father's trail, put off, comes
   * round again a few nights later.
   */
  private act3Morning(): void {
    const a = this.act2;
    if (a.flags.includes("act3Done")) return;
    const next = Act3.nextAct3Beat(new Set(a.flags.filter((f) => f.startsWith("beat3:")).map((f) => f.slice(6))));
    if (!next || this.fans < next.fans) return;
    const retry = a.flags.find((f) => f.startsWith("trailRetry:"));
    if (next.id === "fathersTrail" && retry && this.nightIndex < Number(retry.slice(11))) return;
    a.flags.push(`beat3:${next.id}`);
    this.pendingBeat = { id: next.id, fans: next.fans, kind: "act3", beat: next.id };
  }

  /** What Act 3 reads off her (act3.ts). */
  act3Facts(): Act3.Act3Facts {
    const a = this.act2;
    const held = Act2.PIECE_IDS.filter((id) => a.book[id] === "held");
    const left = Act2.standing(a.pass);
    const closest = left.sort((x, y) => Math.abs(a.pass.rivals[x].fans - this.fans) - Math.abs(a.pass.rivals[y].fans - this.fans))[0] ?? null;
    return {
      gold: this.gold,
      trust: this.trust,
      respect: this.persona.respect,
      fame: this.persona.fame,
      corruption: this.corruption,
      informed: this.persona.informed,
      brawlsWon: this.records.fightsWon,
      arcKnown: arcIndex(this.arcStage) >= arcIndex("known"),
      flags: new Set<string>([...this.storyFlags, ...held.map((id) => `${id}:held`)]),
      passRank: Act2.passRank(a.pass, this.fans),
      closest,
      pieces: held.length + (a.flags.includes("lastPages") ? 1 : 0),
      guild: this.guild?.rank ?? null,
      lanternHung: this.lantern.hung,
      girlGone: this.lantern.girls.some((g) => g.quit),
      owed: this.owed,
      crown: biggestFanGroup(this.fanGroups),
      owned: Act2.housesOwned(a.pass).length,
      ledger: this.passLedgerLines(),
    };
  }

  /** Her ending, once Act 3's final Ledger has been read (act3.ts `ENDINGS`), or null before. */
  get passEnding(): Act3.EndingId | null {
    const flag = this.act2.flags.find((f) => f.startsWith("ending:"));
    return flag ? (flag.slice(7) as Act3.EndingId) : null;
  }

  /** What an Act 2 card reads off her (act2.ts). */
  private beatFacts(): Act2.BeatFacts {
    return { gold: this.gold, trust: this.trust, respect: this.persona.respect, messes: this.messes.length, flags: this.storyFlags, ledger: this.passLedgerLines() };
  }

  /** Her answers to the morning's Act 2 card or fallen rival: [] for Chapter 1's own cards (Pell, a house). */
  get beatChoices(): { id: string; label: string }[] {
    const beat = this.pendingBeat;
    if (beat?.kind === "act2") {
      const f = this.beatFacts();
      return Act2.ACT2_CARDS[beat.beat].choices.filter((c) => !c.hidden?.(f)).map((c) => ({ id: c.id, label: c.label }));
    }
    if (beat?.kind === "act3") {
      const f = this.act3Facts();
      return Act3.ACT3_CARDS[beat.beat].choices(f).filter((c) => !c.hidden?.(f)).map((c) => ({ id: c.id, label: c.label }));
    }
    if (beat?.kind === "rival") {
      const r = Act2.PASS_RIVALS[beat.rival];
      return [
        ...(this.gold >= r.price ? [{ id: "bought", label: `Buy ${r.name} (${r.price} gold)` }] : []),
        { id: "partner", label: `Partner with ${r.boss}` },
        { id: "ruin", label: `Ruin ${r.name} (corruption, heat)` },
      ];
    }
    return [];
  }

  /** Her answer to the morning's Act 2 card, or to a fallen rival: applied, and what it brought on the news. */
  answerBeat(choice: string): void {
    const beat = this.pendingBeat;
    if (!beat || !this.beatChoices.some((c) => c.id === choice)) return;
    this.pendingBeat = null;
    if (beat.kind === "rival") {
      this.answerRival(beat.rival, choice as Act2.RivalFate);
      return;
    }
    if (beat.kind === "act3") {
      const f = this.act3Facts();
      this.applyAct3Effect(Act3.ACT3_CARDS[beat.beat].choices(f).find((c) => c.id === choice)!.run(f));
      return;
    }
    if (beat.kind !== "act2") return;
    const card = Act2.ACT2_CARDS[beat.beat];
    const e = card.choices.find((c) => c.id === choice)!.run(this.beatFacts());
    this.applyBeatEffect(e);
  }

  private applyBeatEffect(e: Act2.BeatEffect): void {
    const a = this.act2;
    this.news.push(...e.lines);
    this.adjust(e.gold ?? 0, e.trust ?? 0, e.heat ?? 0);
    if (e.corruption) this.corruption += e.corruption;
    this.shift({ respect: e.respect ?? 0, fame: e.fame ?? 0, kindness: e.kindness ?? 0 });
    if (e.fans) {
      this.fans += e.fans;
      this.fanGroups[e.group ?? "keeper"] += e.fans;
    }
    if (e.rival) a.pass.rivals[e.rival.id].fans = Math.max(0, a.pass.rivals[e.rival.id].fans + e.rival.fans);
    for (const flag of e.flags ?? []) if (!a.flags.includes(flag)) a.flags.push(flag);
    if (e.heard && a.book[e.heard] === "unknown") {
      a.book[e.heard] = "heard";
      const piece = Act2.PIECES[e.heard];
      this.news.push(`(The red book: ${piece.rumour} ${piece.holder} has ${piece.name}.)`);
    }
    if (e.openPass) a.pass.open = true;
    if (e.desperate) a.pass.desperate = true;
    if (e.brawlNight) this.ratBrawlTonight = true;
  }

  /** What an Act 3 choice does (act3.ts), and at the final Ledger, her ending. */
  private applyAct3Effect(e: Act3.Act3Effect): void {
    const a = this.act2;
    this.news.push(...e.lines);
    this.adjust(e.gold ?? 0, e.trust ?? 0, e.heat ?? 0);
    if (e.corruption) this.corruption += e.corruption;
    this.shift({ respect: e.respect ?? 0, fame: e.fame ?? 0 });
    for (const flag of e.flags ?? []) if (!a.flags.includes(flag)) a.flags.push(flag);
    if (e.rivalFalls) a.pass.rivals[e.rivalFalls].fallen = true;
    if (e.rivalGains) a.pass.rivals[e.rivalGains.id].fans += e.rivalGains.fans;
    if (e.retry) {
      // Father's trail comes round again in a few nights.
      a.flags = a.flags.filter((f) => f !== "beat3:fathersTrail" && !f.startsWith("trailRetry:"));
      a.flags.push(`trailRetry:${this.nightIndex + Act3.TRAIL_RETRY}`);
    }
    if (a.flags.includes("act3Done") && !this.passEnding) {
      const id = Act3.pickEnding(this.act3Facts());
      a.flags.push(`ending:${id}`);
      const end = Act3.ENDINGS[id];
      this.news.push(...cardLines({ title: end.title, lines: end.lines }), "(The nights go on: the tavern is still yours to run.)");
    }
  }

  /** A pass rival at her door, beaten: bought, partnered or ruined (STORY.md 7, "Winning a rival"). */
  private answerRival(id: Act2.RivalId, fate: Act2.RivalFate): void {
    const r = Act2.PASS_RIVALS[id];
    const terms = Act2.RIVAL_TERMS[fate];
    const state = this.act2.pass.rivals[id];
    const gained = Math.floor(state.fans * terms.fans);
    this.act2.pass.rivals[id] = { ...state, fate, fallen: false };
    if (fate === "bought") this.adjust(-r.price, 0, 0);
    if (terms.corruption) this.corruption += terms.corruption;
    if (terms.heat) this.adjust(0, 0, terms.heat);
    this.fans += gained;
    this.fanGroups[r.group] += gained;
    const capital = `${r.name[0].toUpperCase()}${r.name.slice(1)}`;
    this.news.push(
      fate === "bought"
        ? `${capital} is yours, bought outright. You put a manager in. +${gained} fans come with it.`
        : fate === "partner"
          ? `You shake on it with ${r.boss}. ${capital} stays open as your partner house: ${r.partner}. +${gained} fans, and a share every night.`
          : `${capital} closes for good. +${gained} of its fans find their way to you, and ${r.boss} will remember it.`,
      r.clue,
    );
  }

  /** The words for a beat waiting on her answer this morning: who's at the door, and what they say. */
  get beatCard(): { title: string; lines: string[]; house?: HouseDef } | null {
    const beat = this.pendingBeat;
    if (!beat) return null;
    if (beat.kind === "pell") {
      // He reads who she's become (STORY.md 4b): his opening changes with her arc and her corruption.
      const [arrives, ...terms] = PELL_LINES;
      return { title: "Pell at dawn", lines: [arrives, pellOpening(this.lateArc, this.corruption >= SHADY_AT), ...terms] };
    }
    if (beat.kind === "act2") {
      const card = Act2.ACT2_CARDS[beat.beat];
      return { title: card.title, lines: card.lines(this.beatFacts()) };
    }
    if (beat.kind === "act3") {
      const card = Act3.ACT3_CARDS[beat.beat];
      return { title: card.title, lines: card.lines(this.act3Facts()) };
    }
    if (beat.kind === "rival") {
      const r = Act2.PASS_RIVALS[beat.rival];
      return {
        title: `${r.name[0].toUpperCase()}${r.name.slice(1)} falls`,
        lines: [`You've pushed ${r.name} to the bottom of the Pass Ledger.`, ...this.passLedgerLines(), r.arrives],
      };
    }
    if (beat.kind === "house") {
      const house = HOUSE_BY_ID.get(beat.house)!;
      return {
        title: `${house.name} falls`,
        lines: [`Your fans have passed ${house.name}'s. You're ${ordinalOf(this.rank)} in Tarven now.`, house.arrives],
        house,
      };
    }
    return null;
  }

  /** Willing or Known: far enough along her arc that the room's talk of her reaches Pell. */
  private get lateArc(): boolean {
    return arcIndex(this.arcStage) >= arcIndex("willing");
  }

  /** What she can say to Pell at dawn: promise or refuse always; throwing him out, or her ear, only for some of her. */
  get pellChoices(): { answer: PellAnswer; label: string }[] {
    const choices: { answer: PellAnswer; label: string }[] = [
      { answer: "promise", label: PELL_PROMISE },
      { answer: "refuse", label: PELL_REFUSE },
    ];
    const shady = this.corruption >= SHADY_AT;
    if (!this.lateArc && !shady && this.trust * 2 >= TRUST_MAX) choices.push({ answer: "defy", label: PELL_DEFY });
    if (this.lateArc && shady) choices.push({ answer: "ear", label: PELL_EAR });
    return choices;
  }

  /**
   * Her answer to Pell at dawn: promise him the book (the debt's "forgotten", for now: he'll ask after it instead of
   * collecting), or refuse, and the debt doubles, collected in three parts. Or, for some of her: throw him out (the
   * debt doubles, the village loves her for it), or give him her ear (the debt stays, paid half in names).
   */
  answerPell(answer: PellAnswer | boolean): void {
    if (this.pendingBeat?.kind !== "pell") return;
    const said: PellAnswer = answer === true ? "promise" : answer === false ? "refuse" : answer;
    if (!this.pellChoices.some((c) => c.answer === said)) return;
    this.pendingBeat = null;
    if (said === "promise") {
      this.bookPromised = true;
      this.news.push("You promised Pell the book. The debt is forgotten, for now. He'll be back to ask where it is.");
    } else if (said === "refuse") {
      this.owed = DOUBLED_DEBT;
      this.news.push(`You told Pell there's no book. The debt is ${DOUBLED_DEBT} now, and he'll collect it in three parts.`);
    } else if (said === "defy") {
      this.owed = DOUBLED_DEBT;
      this.adjust(0, DEFY_TRUST, DEFY_HEAT);
      this.plotFlags.add("defiedPell");
      this.news.push(PELL_DEFIED, `The debt is ${DOUBLED_DEBT} now, and he'll collect it in three parts.`);
    } else {
      this.corruption += EAR_CORRUPTION;
      this.adjust(0, EAR_TRUST, 0);
      this.plotFlags.add("pellsEar");
      this.news.push(PELL_EARS);
    }
    // Then Wren's first letter (letters.ts): found this morning, shown with what her answer brought.
    findLetter(this.letters, "pell");
    this.news.push(...letterLines("pell"));
  }

  /**
   * Her answer to a fallen house's boss: partner (they send her a little gold and their regulars every night) or
   * ruin (the house closes, half its fans come to her, and it costs her corruption and heat). Either way, its boss
   * gives up what they know.
   */
  answerHouse(fate: HouseFate): void {
    const beat = this.pendingBeat;
    if (beat?.kind !== "house") return;
    this.pendingBeat = null;
    const house = HOUSE_BY_ID.get(beat.house)!;
    this.houses[house.id] = fate;
    if (fate === "partner") {
      this.adjust(0, 1, 0);
      this.news.push(`${house.boss} shakes on it. ${house.name} will send you its regulars, and a little gold, every night.`);
    } else {
      this.corruption += RUIN_CORRUPTION;
      this.adjust(0, 0, RUIN_HEAT);
      const gained = Math.floor(house.fans / 2);
      this.fans += gained;
      this.fanGroups[HOUSE_GROUP[house.id]] += gained;
      this.news.push(`${house.name} closes its doors. +${gained} fans walk up the hill to you.`);
    }
    this.news.push(house.clue);
    // Tansy's hint about the Lantern lands by who she's become (STORY.md 4b).
    if (house.id === "bakehouse") {
      if (!this.lateArc) {
        this.plotFlags.add("deniedLantern");
        this.news.push("\"Grandma kept a respectable house,\" you tell her. Tansy only smiles, and doesn't argue.");
      } else if (this.corruption < SHADY_AT) {
        this.news.push("Tansy looks you up and down. \"You've her walk now. She'd have laughed to see it.\"");
      } else {
        this.news.push("Tansy looks you up and down. \"You've her walk, and her eyes for coin. Be careful which half of her you turn into.\"");
      }
    }
    // Pike's soldiers talk about the silver wagons: she's heard it now, if she missed it on the deserter night.
    if (house.id === "canteen") this.plotFlags.add("heardSilver");
    if (house.id === "copperBell") {
      this.firstInTarven = true;
      this.chapterEnding = this.chapterEndingNow();
    }
  }

  /** The Chapter 1 ending her state earns right now (chapter1.ts `chapterEndingFor`). */
  chapterEndingNow(): ChapterEndingId {
    return chapterEndingFor({
      flags: this.plotFlags,
      trust: this.trust,
      groups: this.fanGroups,
      owed: this.owed,
      arrears: this.arrears,
      bookPromised: this.bookPromised,
      arc: this.arcStage,
      respect: this.persona.respect,
      lanternHung: this.lantern.hung,
    });
  }

  /** The baron's last visit, once. */
  takeBaronVisit(): BaronVisit | null {
    const visit = this.baronVisit;
    this.baronVisit = null;
    return visit;
  }

  get lastCallChoices(): Choice[] {
    if (!this.heardRumor) return this.plan.lastCall.unheard;
    const facts = { flags: this.plotFlags, kindness: this.persona.kindness };
    return this.plan.lastCall.heard.filter((choice) => !choice.needs || needMet(choice.needs, facts));
  }

  /** Text waiting to be shown to the player. Reading it empties the queue. */
  takeMessages(): string[] {
    return this.messages.splice(0);
  }

  /** Sounds waiting to be played. Reading them empties the queue. */
  takeCues(): Cue[] {
    return this.cues.splice(0);
  }

  private say(text: string): void {
    this.messages.push(text);
  }

  private cue(sound: Cue): void {
    this.cues.push(sound);
  }

  private adjust(gold: number, trust: number, heat: number): void {
    this.gold = Math.max(0, this.gold + gold);
    this.trust = clamp(this.trust + trust, 0, TRUST_MAX);
    this.heat = clamp(this.heat + heat, 0, HEAT_MAX);
  }

  private takenSeats(): Set<number> {
    return new Set(this.guests.filter((g) => g.status !== "leaving").map((g) => g.seat));
  }

  /** Seats with someone's dirty dishes still in front of them. Guests take these only when nothing else is free. */
  private dirtySeats(): Set<number> {
    return new Set(this.messes.flatMap((mess) => (mess.kind === "dishes" ? mess.spots : [])));
  }

  private freeSeat(): number | null {
    const taken = this.takenSeats();
    for (const avoid of [this.dirtySeats(), new Set<number>()]) {
      // Stepping by 5 spreads guests around the room instead of filling it in order.
      for (let i = 0; i < this.seatCount; i++) {
        const seat = (this.nextGuestId * 5 + i) % this.seatCount;
        if (!taken.has(seat) && !avoid.has(seat)) return seat;
      }
    }
    return null;
  }

  /**
   * A seat for someone in a party, beside the rest of the party if one of them is already in. Otherwise the
   * smallest table that fits them all, then side by side at the bar, then wherever most of them fit together.
   */
  private partySeat(party: number): number | null {
    const taken = this.takenSeats();
    const dirty = this.dirtySeats();
    const free = (table: string, allowDirty: boolean) =>
      this.seatTables.flatMap((name, seat) =>
        name === table && !taken.has(seat) && (allowDirty || !dirty.has(seat)) ? [seat] : [],
      );
    const friend = this.guests.find((g) => g.party === party && g.status !== "leaving");
    const friendTable = friend && this.seatTables[friend.seat];
    if (friendTable) return free(friendTable, false)[0] ?? free(friendTable, true)[0] ?? this.freeSeat();

    const size = this.arrivals.filter((a) => a.party === party).length;
    const rank = ({ name, seats }: { name: string; seats: number[] }) =>
      seats.length >= size ? (name === "Bar" ? 1000 : 0) + seats.length : 2000 - seats.length;
    const best = (allowDirty: boolean) =>
      [...new Set(this.seatTables)]
        .map((name) => ({ name, seats: free(name, allowDirty) }))
        .filter(({ seats }) => seats.length > 0)
        .sort((a, b) => rank(a) - rank(b))[0];
    return best(false)?.seats[0] ?? best(true)?.seats[0] ?? this.freeSeat();
  }

  /**
   * What draws more guests in: each upgrade, each set of cups or dishes bought past the first, and each bottle on
   * the shelf. Word gets round about a tavern that pours fast, never runs out of cups, and has wine.
   */
  get crowdDraw(): number {
    const packs = (ware: Ware, start: number) => Math.max(0, Math.floor((this.stock[ware] - start) / STOCK_PACK));
    return this.upgrades.size + packs("cup", START_CUPS) + packs("dish", START_DISHES) + this.bottles.size;
  }

  /** The fewest and most guests who walk in tonight on top of the night's own, for what she's bought. */
  get extraGuests(): { least: number; most: number } {
    const draw = this.crowdDraw;
    return { least: Math.floor(draw / 3), most: Math.min(MAX_EXTRA_GUESTS, 1 + Math.ceil(draw * 0.6)) };
  }

  /**
   * Tonight's guests, rolled as the night begins. The night's own story stays (parties, and whoever carries the
   * rumor), but anyone walking in alone may be someone else, may come a little later, or (after the first night)
   * may stay home; and a few more walk in on top, more for what she's bought (`extraGuests`). Without
   * `crowdRandom`, the night's list as written.
   */
  private rollArrivals(): { arrivals: Arrival[]; extra: number } {
    const script = this.plan.guests;
    const dice = this.crowdRandom;
    if (!dice) return { arrivals: script.map((a) => ({ ...a })), extra: 0 };
    const pick = <T>(list: readonly T[]) => list[Math.floor(dice() * list.length) % list.length];
    const kinds = script.map((a) => a.kind);
    const orders = script.map((a) => a.order);
    const arrivals: Arrival[] = [];
    // Those walking in alone trade their times about, so the written order of who comes when isn't the same twice.
    const alone = script.filter((a) => a.party === undefined && !a.rumor);
    const slots = alone.map((a) => a.at);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(dice() * (i + 1)) % (i + 1);
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    // The story's own (each party, and whoever carries the rumor) still come, together, but a little early or late.
    const shift = new Map<number | "rumor", number>();
    const shiftOf = (key: number | "rumor") => {
      if (!shift.has(key)) shift.set(key, (dice() * 2 - 1) * PARTY_DRIFT);
      return shift.get(key)!;
    };
    let slot = 0;
    for (const a of script) {
      if (a.party !== undefined || a.rumor) {
        arrivals.push({ ...a, at: Math.max(1, a.at + shiftOf(a.party ?? "rumor")) });
        continue;
      }
      const written = slots[slot++];
      const roll = dice();
      if (this.nightIndex > 0 && roll >= 1 - STAY_HOME_CHANCE) continue;
      const at = written + dice() * ARRIVAL_DRIFT;
      const swap = roll >= 1 - STAY_HOME_CHANCE - SWAP_KIND_CHANCE;
      // Half of them fancy something else off tonight's menu.
      const order = dice() < REORDER_CHANCE ? pick(orders) : a.order;
      arrivals.push(swap ? { ...a, at, order, kind: pick(kinds), role: undefined } : { ...a, at, order });
    }
    const { least, most } = this.extraGuests;
    const extra = least + Math.floor(dice() * (most - least + 1));
    const last = Math.max(...script.map((a) => a.at)) + EXTRA_TAIL;
    for (let i = 0; i < extra; i++) {
      arrivals.push({ at: EXTRA_FIRST + dice() * (last - EXTRA_FIRST), kind: pick(kinds), order: pick(orders) });
    }
    arrivals.sort((a, b) => a.at - b.at);
    return { arrivals, extra: arrivals.length - script.length };
  }

  /**
   * The guests her flyers and posts drew in (errands.ts), added to tonight's crowd: the night's own kinds, coming
   * through the evening. How many came; the count is spent either way.
   */
  private errandArrivals(arrivals: Arrival[]): number {
    const n = Math.min(MAX_ERRAND_GUESTS, this.errandGuests);
    this.errandGuests = 0;
    const script = this.plan.guests;
    if (n <= 0 || script.length === 0) return 0;
    const last = Math.max(...script.map((a) => a.at)) + EXTRA_TAIL;
    for (let i = 0; i < n; i++) {
      const like = script[Math.floor(this.random() * script.length) % script.length];
      arrivals.push({ at: EXTRA_FIRST + this.random() * (last - EXTRA_FIRST), kind: like.kind, order: like.order });
    }
    arrivals.sort((a, b) => a.at - b.at);
    return n;
  }

  private spawnArrivals(): void {
    const arrivals = this.arrivals;
    while (this.nextArrival < arrivals.length && arrivals[this.nextArrival].at <= this.clock) {
      const next = arrivals[this.nextArrival];
      const seat = next.party === undefined ? this.freeSeat() : this.partySeat(next.party);
      if (seat === null) return; // Tries again next tick, once someone leaves.
      this.nextArrival++;
      const { kind, rumor, party } = next;
      const role = next.role ?? this.nextRole(kind, party);
      // A regular comes as themselves: the sheet, body and look they've always had (regulars.ts).
      const regular = next.regular ? this.regulars.find((r) => r.id === next.regular) : undefined;
      const stats = regular ? structuredClone(regular.stats) : rollStats(role, this.rollRandom);
      // A recruit far enough up the hill tips more and stays longer, and comes in wanting it (CHURCH_RECRUITMENT.md).
      const recruit = next.recruit ? RECRUITS[next.recruit] : undefined;
      const recruitStage = next.recruit ? this.recruits[next.recruit].stage : 0;
      if (recruitStage >= 2) {
        stats.tip = Math.round(stats.tip * 1.5);
        stats.patience *= 1.3;
      }
      const order = this.chooseOrder(role, next.order);
      const maxPatience =
        stats.patience *
        (this.upgrades.has("cushions") ? CUSHION_PATIENCE : 1) *
        this.messPatienceFor(stats.fussy) *
        (1 + this.effects.patience + charmBonus(this.level("charm")).patience);
      const context = this.banterContext(kind, undefined, role, stats);
      const { lust, desires } = arrivalFeelings(context, this.random);
      const filth = Math.min(1, this.messes.length / MESS_FOR_FULL_LOSS);
      this.guests.push({
        id: this.nextGuestId++,
        kind,
        role,
        stats,
        ordered: !this.takeOrders,
        female: regular ? regular.female : recruit ? recruit.female : this.rollRandom() < 0.5,
        look: regular ? regular.look : recruit ? recruit.look : 1 + Math.floor(this.rollRandom() * GUEST_LOOK_SEEDS),
        order,
        seat,
        status: "arriving",
        patience: maxPatience,
        maxPatience,
        eatLeft: 0, // Decided when they're served.
        rumor: Boolean(rumor),
        listened: 0,
        party: party ?? null,
        lust: recruitStage >= 2 ? Math.max(lust, 6 + recruitStage) : lust,
        desires,
        mood: next.hired ? "angry" : arrivalMood(context, filth, this.random, lust),
        ...(next.hired ? { hired: true } : {}),
        ...(regular ? { regular: regular.id } : {}),
        ...(next.recruit ? { recruit: next.recruit } : {}),
      });
      this.cue("guestIn");
      if (recruit) this.say(recruit.atBar[recruitStage]);
      if (regular) {
        const lines = REGULAR_RETURNS[regular.last];
        this.say(lines[Math.floor(this.random() * lines.length) % lines.length].replaceAll("{name}", regular.name));
        this.mark(this.guests[this.guests.length - 1], () => {});
      }
    }
  }

  /**
   * The type a guest of this group comes as: a party gets one of each before any doubles up (archer, warrior,
   * mage, cleric), and guests on their own take turns through the roster.
   */
  private nextRole(kind: GuestKind, party?: number): GuestRole {
    const roster = ROLES_OF[kind];
    if (party !== undefined) {
      const taken = new Set(this.guests.filter((g) => g.party === party && g.kind === kind).map((g) => g.role));
      const open = roster.find((r) => !taken.has(r));
      if (open) return open;
    }
    const turn = this.roleTurn[kind] ?? 0;
    this.roleTurn[kind] = turn + 1;
    return roster[turn % roster.length];
  }

  /**
   * What a guest asks for. Ale drinkers sometimes want their favourite bottle instead, if it's on the shelf.
   */
  private chooseOrder(role: GuestRole, planned: Item): Item {
    if (planned !== "ale") return planned;
    const favourite = ROLES[role].favourite;
    if (!this.bottles.has(favourite)) return planned;
    return this.random() < ASKS_FOR_BOTTLE + this.effects.bottleAsk ? favourite : planned;
  }

  private startPour(): void {
    // The tap never runs dry: pouring only takes a clean cup.
    this.cleanWare.cup--;
    this.cue("pour");
    // Drunk hands fumble the tap.
    this.pourLeft = (this.upgrades.has("quicktap") ? QUICK_POUR_TIME : POUR_TIME) * (1 + DRUNK_FUMBLE * this.drunk);
  }

  /**
   * The bottle shelf pours whatever a waiting guest has asked for, the longest-waiting first, leaving out what
   * someone is already carrying to them.
   */
  private shelfAction(take: (item: Item) => void): Action | null {
    const carried = [...this.carrying];
    const wanted: Bottle[] = [];
    for (const guest of this.guests) {
      if (guest.status !== "waiting" && guest.status !== "arriving") continue;
      if (!isBottle(guest.order)) continue;
      const already = carried.indexOf(guest.order);
      if (already >= 0) carried.splice(already, 1);
      else wanted.push(guest.order);
    }
    if (wanted.length === 0) {
      if (this.bottles.size === 0) return this.phase === "day" ? { label: "The shelf is bare. Buy drinks on the house plans" } : null;
      return { label: "Nobody has asked for the good stuff" };
    }
    const pour = wanted[0];
    if (this.cleanWare.cup === 0) return { label: "No clean cups. Wash some at the tub" };
    return {
      label: `Pour a cup of ${pour}`,
      run: () => {
        this.cleanWare.cup--;
        take(pour);
        this.cue("pour");
      },
    };
  }

  private startStew(): void {
    this.potState = "cooking";
    // Stew Keeper: it cooks faster.
    this.potTimer = STEW_TIME * Math.max(0.2, 1 - this.effects.cookSpeed);
    this.cue("stewStart");
  }

  private updateTap(dt: number): void {
    if (this.pourLeft === null) return;
    this.pourLeft -= dt;
    if (this.pourLeft <= 0) {
      this.pourLeft = null;
      this.aleReady++;
      this.cue("aleReady");
    }
  }

  private updatePot(dt: number): void {
    if (this.potState === "cooking") {
      this.potTimer -= dt;
      if (this.potTimer <= 0) {
        this.potState = "ready";
        this.potTimer = this.burnTime;
        this.records.stewsCooked++;
        this.potBowls = this.upgrades.has("bigpot") ? BIG_POT_BOWLS : POT_BOWLS;
        this.say("The stew is ready.");
        this.cue("stewReady");
      }
    } else if (this.potState === "ready" && !this.staffWorking("cook")) {
      // A cook on tonight keeps the ready stew from burning (staff.ts).
      this.potTimer -= dt;
      if (this.potTimer <= 0) {
        this.potState = "burnt";
        this.potBowls = 0;
        this.say("The stew has burnt!");
        this.cue("stewBurnt");
      }
    }
  }

  private updateGuests(dt: number, listeningTo: number | null): void {
    for (const guest of this.guests) {
      const behaviour = MOOD_BEHAVIOUR[guest.mood];
      // Someone spoiling for a fight has better things to do than wait or eat.
      if (this.trouble?.guestId === guest.id) continue;
      if (guest.status === "waiting") {
        guest.patience -= dt * behaviour.patienceDrain;
        guest.mood = moodWhileWaiting(guest.mood, guest.patience / guest.maxPatience);
        if (guest.patience <= 0) this.walkOut(guest);
      } else if (guest.status === "eating") {
        guest.eatLeft -= dt;
        if (guest.eatLeft <= 0 && this.tableFinished(guest)) {
          const fansWon = this.fansFrom(guest);
          this.fansTonight += fansWon;
          // Why they'll come back (chapter1.ts): for her, if she let them touch her; for the talk, a rumour guest.
          if ((this.touchHistory.get(guest.id)?.allowed ?? 0) > 0) this.fanTags.lantern += fansWon;
          else if (guest.rumor) this.fanTags.network += fansWon;
          guest.status = "leaving";
          this.leaveDirty(guest);
          if (behaviour.spills) this.spiltAt.add(guest.seat);
        }
      }

      const seated = guest.status === "waiting" || guest.status === "eating";
      if (seated && guest.rumor && !this.heardRumor && guest.id === listeningTo) {
        guest.listened += dt * (1 + mindBonus(this.level("mind")).listen);
        if (guest.listened >= LISTEN_TIME) {
          this.heardRumor = true;
          this.records.rumors++;
          this.gainXp("mind", 3);
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
          this.cue("rumor");
        }
      }

      // Someone who's angry or roaring drunk might start trouble, now and then.
      const rowdy = guest.mood === "angry" || guest.mood === "drunk";
      if (
        seated &&
        rowdy &&
        this.phase === "service" &&
        !this.fight &&
        !this.trouble &&
        !this.inConversation &&
        this.fightsTonight < MAX_FIGHTS &&
        (guest.hired || this.random() < TROUBLE_PER_SECOND * dt * Math.max(0, 1 - this.effects.trouble))
      ) {
        this.brewTrouble(guest);
      }
    }
  }

  /** Whether a guest can get up: a party stays and talks until everyone still at the table has finished. */
  private tableFinished(guest: Guest): boolean {
    return guest.party === null || this.partyGuests(guest.party).every((g) => g.status === "eating" && g.eatLeft <= 0);
  }

  /**
   * A guest leaves in the middle of things (thrown out, or off with the till after knocking her down): whatever they
   * were eating or drinking from stays on the table, so no cup or dish goes missing with them.
   */
  private sendOff(guest: Guest): void {
    if (guest.status === "eating") this.leaveDirty(guest);
    if (guest.status !== "leaving" && !guest.female && guest.lust >= STRONG_LUST && guest.mood !== "drunk" && !isBaron(this.roomGuest(guest))) {
      this.leftWanting.push({ kind: guest.kind, stats: guest.stats });
    }
    guest.status = "leaving";
  }

  /** A guest has finished: what they ate from stays on the table, in that table's pile. */
  private leaveDirty(guest: Guest): void {
    const ware = WARE_OF[guest.order];
    if (!ware) return;
    const table = this.tableOf(guest.seat);
    const pile = this.messes.find((m) => m.kind === "dishes" && this.tableOf(m.spots[0]) === table);
    if (pile) {
      pile.wares = [...messWares(pile), ware];
      pile.spots.push(guest.seat);
    } else {
      this.messes.push({ id: this.nextMessId++, kind: "dishes", spots: [guest.seat], wares: [ware] });
    }
  }

  /**
   * Fans from a guest leaving fed (STORY.md "How fans are earned"): delighted if they were served fast, in a good
   * mood, in a clean room; happy if they're not leaving cross; nothing otherwise.
   */
  private fansFrom(guest: Guest): number {
    if (guest.mood === "angry" || guest.mood === "gloomy" || guest.mood === "scared") return 0;
    const glad = guest.mood === "happy" || guest.mood === "idolize" || guest.mood === "lust";
    return glad && guest.servedFast && this.messes.length < FILTHY_AT ? FANS_DELIGHTED : FANS_HAPPY;
  }

  private walkOut(guest: Guest): void {
    guest.status = "leaving";
    this.walkouts++;
    this.fansTonight += FANS_WALKOUT;
    this.shift({ fame: FAME_WALKOUT });
    // They knock their cup over on the way out.
    this.spiltAt.add(guest.seat);
    this.adjust(0, -1, guest.stats.walkoutHeat);
    this.say(`A ${this.nameOf(guest).toLowerCase()} walked out without paying.`);
    this.cue("walkOut");
  }

  tick(dt: number, context: TickContext): void {
    // Dead drunk: once she's done talking, she's done for the night (barwork.ts).
    if (this.passingOut && !this.inConversation) this.passOut();
    if (this.lastClearFrom !== null && !this.inConversation && !this.passingOut) this.askLastClear();
    this.dressLeft = Math.max(0, this.dressLeft - dt);
    // Over the limit wears off first; then she starts to sober up.
    if (this.overLimit > 0) this.overLimit = Math.max(0, this.overLimit - SOBER_RATE * dt);
    else this.drunk = Math.max(0, this.drunk - SOBER_RATE * dt);
    this.passiveCheck -= dt;
    if (this.passiveCheck <= 0) {
      this.passiveCheck = PASSIVE_CHECK_SECONDS;
      this.awardPassives();
    }
    if (this.phase === "day" || this.phase === "dusk") {
      // Closed, but the tap and the pot still work, so you can get ready.
      this.updateTap(dt);
      this.updatePot(dt);
      if (this.phase === "dusk" && context.night) {
        this.phase = "service";
        this.say(this.plan.intro);
        const { arrivals, extra } = this.rollArrivals();
        const drawn = this.errandArrivals(arrivals);
        if (drawn > 0) this.say(`Your flyers and posts worked: ${drawn} ${drawn === 1 ? "guest says" : "guests say"} they came because of them.`);
        this.regularsTonight(arrivals);
        this.recruitsTonight(arrivals);
        this.rivalNight(arrivals);
        this.plotNight(arrivals);
        // A lit lantern changes who walks in, and what the night costs her (lantern.ts).
        this.arrivals = this.lantern.openNight(arrivals, this.lanternHost);
        if (extra > 0) {
          const why = this.crowdDraw > 0 ? " Word of what you've done with the place is getting round." : "";
          this.say(`The road's busy tonight: ${extra} more than usual are on their way.${why}`);
        } else if (extra < 0) {
          this.say(`A quiet road tonight: ${-extra} fewer than usual about.`);
        }
      }
      return;
    }
    if (this.phase !== "service") return;
    this.clock += dt;
    this.spawnArrivals();
    this.updateTap(dt);
    this.updatePot(dt);
    this.updateGuests(dt, context.listeningTo);
    this.updateTrouble(dt);
    this.lantern.update(dt, this.lanternHost);

    // Last call waits for anyone still upstairs to come down and pay.
    if (this.nextArrival === this.arrivals.length && this.guests.length === 0 && !this.lantern.busy) {
      this.phase = "lastcall";
    }
  }

  guestArrived(id: number): void {
    const guest = this.guests.find((g) => g.id === id);
    if (guest?.status !== "arriving") return;
    guest.status = "waiting";
    if (!guest.ordered) {
      this.say(`A ${this.nameOf(guest).toLowerCase()} at table ${this.tableOf(guest.seat)} is calling you over.`);
      this.cue("call");
    }
  }

  /**
   * She goes over and asks what they'll have: now she knows, and can bring it. As she leans in to listen, they may
   * take hold of her (grab.ts).
   */
  private takeOrder(guest: Guest): void {
    guest.ordered = true;
    this.say(`The ${this.nameOf(guest).toLowerCase()} at table ${this.tableOf(guest.seat)} wants ${ORDER_WORDS[guest.order]}.`);
    // Worked up, they say what they really want, and she answers (barvoices.ts, barher.ts).
    if (this.playerBody === "Female" && guest.lust >= QUIP_LUST) {
      this.say(`${this.nameOf(guest)}: ${this.barQuip(guest, (v) => v.order).text}`);
      this.say(`You: ${this.herBar("order")}`);
    }
    this.cue("order");
    // Leaning in to listen: they may grab her, or ask for a look.
    if (!this.maybeGrab(guest, "order")) this.maybeAskToSee(guest);
  }

  guestLeft(id: number): void {
    const index = this.guests.findIndex((g) => g.id === id);
    if (index >= 0) this.guests.splice(index, 1);
  }

  private serve(guest: Guest, sibling: number): void {
    const rules = guest.stats;
    const left = guest.patience / guest.maxPatience;
    const behaviour = MOOD_BEHAVIOUR[guest.mood];
    const tipped = left > TIP_THRESHOLD && behaviour.tips;
    const bottle = isBottle(guest.order) ? guest.order : null;
    const e = this.effects;
    const base =
      rules.pay +
      (bottle ? BOTTLES[bottle].extraPay + e.bottleGold : 0) +
      // Silas's crate of salt (plot.ts): stew sells for more.
      (guest.order === "stew" && this.plotFlags.has("silasOwes") ? SALT_STEW_GOLD : 0) +
      (tipped ? rules.tip + behaviour.tipBonus + e.serveTip + charmBonus(this.level("charm")).tip : 0) +
      (this.stripped > 0 ? e.strippedGold : 0);
    // Her Level: a little more on everything, the more she's grown.
    const amount = Math.round(base * (1 + e.payPct + (this.herLevel - 1) * LEVEL_PAY));
    this.records.served++;
    this.lastServer = sibling;
    if (bottle) this.records.poured++;
    this.gainXp("agility", 0.5);
    if (tipped) this.gainXp("charm", 1);
    if (this.stripped > 0 && e.strippedFame > 0) this.shift({ fame: e.strippedFame });
    const idolized = guest.mood === "idolize";
    guest.servedFast = tipped;
    guest.mood = moodWhenServed(guest.mood, left);
    if (bottle === "mead") guest.lust = Math.min(10, guest.lust + MEAD_LUST);
    if (bottle === "vodka" && this.random() < VODKA_DRUNK_CHANCE * rules.lightweight) guest.mood = "drunk";
    this.shift({ fame: FAME_SERVED + (tipped ? FAME_TIPPED + rules.fame : 0) + (idolized ? FAME_IDOLIZED : 0) });
    this.takeOne(sibling);
    guest.status = "eating";
    if (this.playerBody === "Female" && guest.lust >= QUIP_LUST) {
      this.say(`${this.nameOf(guest)}: ${this.barQuip(guest, (v) => v.serve).text}`);
      this.say(`You: ${this.herBar("serve")}`);
    }
    this.served++;
    this.earned += amount;
    this.adjust(amount, rules.trust, 0);
    this.say(tipped ? `+${amount} gold, with a tip.` : `+${amount} gold.`);
    this.cue(tipped ? "tip" : "serve");
    // A promise come due, or a favor returned, before anything else they'd say.
    if (!this.startFollowUp(guest) && tipped && this.random() < TIP_CHAT_CHANCE) this.startTipChat(guest);
    // Nothing else to say: they may grab her as she sets it down, or reach for her.
    // On a lit night, a lustful guest may ask for company upstairs instead (lantern.ts): one of the girls, never her.
    if (!this.tipChat && !this.maybeGrab(guest) && !this.maybeAskToSee(guest) && !this.lantern.maybeAsk(guest, this.lanternHost)) {
      this.maybeReach(guest);
    }
    const [least, most] = guest.party === null ? EAT_ALONE : EAT_IN_PARTY;
    guest.eatLeft = (least + this.random() * (most - least)) * behaviour.stay * rules.stay + (guest.rumor ? RUMOR_EXTRA_EAT : 0);
  }

  /**
   * Someone's here about a favor: the guest just served is the brother come for his letter, the boy whose ewe is
   * lambing, a farmer settling the slate. No drink this time: straight to what they've come for.
   */
  private startFollowUp(guest: Guest): boolean {
    const at = this.favorsDue.findIndex((d) => d.night <= this.nightIndex && FOLLOW_UP_BY_ID.get(d.id)?.kinds.includes(guest.kind));
    if (at < 0) return false;
    const def = FOLLOW_UP_BY_ID.get(this.favorsDue[at].id)!;
    this.favorsDue.splice(at, 1);
    const line = (text: string): TalkLine => ({ speaker: def.who, text, guestId: guest.id });
    this.talkingTo = null;
    this.tipChat = {
      speaker: def.who,
      guestId: guest.id,
      lines: def.lines.map(line),
      ask: [],
      replies: def.replies,
      offered: true,
      drank: false,
      answered: false,
      reply: [],
    };
    return true;
  }

  /** What she's promised and what she's owed, for the journal. */
  get favorsAhead(): FollowUp[] {
    return this.favorsDue.map((d) => FOLLOW_UP_BY_ID.get(d.id)).filter((f): f is FollowUp => f !== undefined);
  }

  /** A pleased guest buys you a drink, and with the drink in them, flatters you or asks a favor. */
  private startTipChat(guest: Guest): void {
    const context = this.banterContext(guest.kind, guest);
    const pick = <T extends { id: string; when?: (c: BanterContext) => boolean }>(lines: readonly T[]) =>
      pickLine(lines, context, this.saidLines, this.random);
    // The conversation shows what state they're in.
    const label = MOOD_LABELS[feltMood(guest)];
    const speaker = label ? `${this.nameOf(guest)} (${label})` : this.nameOf(guest);
    const line = (text: string): TalkLine => ({ speaker, text, guestId: guest.id });

    const lines = [line(pick(OFFERS)?.text ?? "\"Have one on me!\"")];
    const face = faceLine(feltMood(guest), context, this.saidLines, this.random);
    if (face) lines.push(line(face));
    const remark = pick(REMARKS);
    if (remark && this.random() < REMARK_CHANCE) lines.push(line(remark.text));

    // What they say after the drink, so each choice comes right under the line it answers.
    const ask: TalkLine[] = [];
    let replies: Reply[];
    const dare = this.dare(guest);
    // Only favors nobody has asked yet; picked without marking, since a compliment may win instead.
    const favor = pickLine(
      FAVORS.filter((f) => f.kinds.includes(guest.kind) && !this.askedFavors.has(f.id)),
      context,
      new Set(),
      this.random,
    );
    const compliment = pick(COMPLIMENTS);
    const lusty = feltMood(guest) === "lust";
    if (dare) {
      ask.push(line(dare.dare));
      replies = stripReplies(dare, this.stripped);
    } else if (compliment && (this.random() < (lusty ? LUSTY_COMPLIMENT_SHARE : COMPLIMENT_SHARE) || !favor)) {
      ask.push(line(compliment.text));
      replies = complimentReplies(context);
    } else if (favor) {
      this.askedFavors.add(favor.id);
      ask.push(line(favor.ask));
      replies = [favor.agree, favor.refuse];
    } else {
      return;
    }
    this.talkingTo = null;
    this.tipChat = { speaker, guestId: guest.id, lines, ask, replies, offered: false, drank: false, answered: false, reply: [] };
  }

  /** The next piece of clothing guests would go for, or null once there's nothing left you'd lose. */
  get nextStripPiece(): StripPiece | null {
    const garment = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped];
    return garment ? stripPiece(garment) : null;
  }

  /** The ids of the clothes guests have got off you tonight, for the game to take off the model. */
  get strippedPieces(): string[] {
    return piecesOff(this.playerBody, this.stripped, this.playerOutfit, this.playerLegwear, this.playerUnder);
  }

  /**
   * What's off her as she's seen: tonight's dares, and in a duel, what she's taken off herself (down to her
   * shift, then everything). The dares are what count for anything else.
   */
  get shownPieces(): string[] {
    // A piece she's putting back on stays off until her hands bring it up (barwork.ts).
    const dressing = this.dressLeft > REDRESS_SECONDS * (1 - REDRESS_ON_AT);
    const goingOn = dressing ? piecesOff(this.playerBody, this.stripped + 1, this.playerOutfit, this.playerLegwear, this.playerUnder) : [];
    const off = [...this.strippedPieces, ...goingOn, ...this.showingPieces()];
    const undressed = Math.max(this.duel?.undressed ?? 0, this.endedTest?.undressed ?? 0, this.undressedTonight);
    if (undressed === 0) return [...new Set(off)];
    const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder);
    const more = undressed >= 2 ? ladder : ladder.filter((g) => g.layer !== "under" && g.layer !== "smallclothes");
    return [...new Set([...off, ...more.map((g) => g.id)])];
  }

  /** What she's showing a guest right now, while the talk lasts (7e): the game poses her for it. */
  get showingOff(): ShowPart | null {
    return this.showChat?.shown ?? null;
  }

  /**
   * Her tops, pulled down off her breasts or lifted up over them while she shows a guest her band or her breasts
   * (7e): the garments' ids, and which way. The game pulls them on the model in time with her hands; they're still
   * on her, never stripped. Null while she's showing nothing up there.
   */
  get showingPull(): { ids: string[]; dir: "down" | "up"; side?: "left" | "right" } | null {
    const shown = this.showChat?.shown;
    if (shown !== "band" && shown !== "breasts") return null;
    const pull = topPull(this.playerBody, this.playerOutfit, this.strippedPieces);
    const side = this.showingSide;
    return pull && side !== "both" ? { ...pull, side } : pull;
  }

  /** Which of her breasts she's baring for a guest right now (7e): both, or just her left or her right. */
  get showingSide(): ShowSide {
    return this.showChat?.shown === "breasts" ? (this.showChat.side ?? "both") : "both";
  }

  /** Which way her top comes off her breasts, as she has it on now (7e); down when there's none to move. */
  get topPullDir(): "down" | "up" {
    return topPull(this.playerBody, this.playerOutfit, this.strippedPieces)?.dir ?? "down";
  }

  /**
   * What's out of the way while she shows a guest what they paid to see (7e), for as long as the talk lasts; the
   * game poses her too. Her top half is pulled, not taken off (`showingPull`); showing her breasts bare, her band goes
   * too (it's painted on her). Her bottom half: a skirt stays on, lifted in her hands with her apron, and her girdle
   * stays round her waist; anything else there comes off, and bare, her smallclothes. Back to work, and it's all back.
   */
  private showingPieces(): string[] {
    const shown = this.showChat?.shown;
    if (!shown) return [];
    const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder);
    if (shown === "band") return [];
    if (shown === "breasts") return ladder.filter((g) => g.region === "top" && g.layer === "smallclothes").map((g) => g.id);
    const bare = SHOW_HOW[shown] === "bare";
    // Tights over her groin would hide it all: they come down too.
    const tights = legwearOverGroin(this.playerBody, this.playerOutfit, this.playerLegwear);
    return ladder
      .filter((g) => {
        if (g.layer === "smallclothes") return bare && g.region === "bottom";
        if (g.layer === "legwear") return tights;
        return g.layer === "outer" && g.region === "bottom" && !LIFTED_SKIRTS.has(g.id) && !KEPT_ON_LIFT.has(g.id);
      })
      .map((g) => g.id);
  }

  /**
   * Whether a guest drinking with you goes for your clothes, and if so, which piece. Rolls high rather than
   * low, so the commonest rolls still bring the usual talk.
   */
  private dare(guest: Guest): StripPiece | null {
    const piece = this.nextStripPiece;
    if (!piece) return null;
    const mood = feltMood(guest);
    let chance = DARE_BASE + this.drunk * DARE_PER_DRUNK;
    if (mood === "lust") chance += DARE_LUSTY;
    if (mood === "drunk") chance += DARE_DRUNK_GUEST;
    if (this.persona.flirt >= 4) chance += DARE_FLIRT;
    if (this.persona.respect <= LOW_RESPECT) chance += DARE_DISRESPECTED;
    if (this.persona.respect >= HIGH_RESPECT) chance += DARE_RESPECTED;
    return this.random() >= 1 - Math.min(DARE_MAX, Math.max(0, chance)) ? piece : null;
  }

  /** You let a guest have a piece of your clothing. */
  private loseClothing(): void {
    this.stripped++;
    this.cue("tip");
  }

  /** What guests can know and notice about the player, for choosing what they say. */
  banterContext(kind: GuestKind, guest?: Guest, role?: GuestRole, stats?: RoleStats): BanterContext {
    return {
      body: this.playerBody,
      persona: this.persona,
      trust: this.trust,
      heat: this.heat,
      gold: this.gold,
      debt: DEBT,
      night: this.nightIndex,
      drunk: this.drunk,
      kind,
      role: guest?.role ?? role,
      stats: guest?.stats ?? stats,
      mood: guest && feltMood(guest),
      lust: guest?.lust,
      desires: guest?.desires,
      stripped: this.stripped,
    };
  }

  /** You took a drink with a guest. */
  private takeDrink(with_: readonly Guest[] = []): void {
    const strength = this.drinkStrength;
    // Drunk enough, and a guest could get her down on a table (adultplay.ts; too drunk still blocks every yes).
    const wasOpen = this.tableOpen;
    // Her last clear drink: one more and she's too drunk to say yes to anything (barwork.ts).
    const lastClear = this.drunk < SLOPPY_DRUNK && this.drunk + 2 * strength >= SLOPPY_DRUNK && this.drunk + strength < SLOPPY_DRUNK;
    // Past the top of drunk, it piles up as over the limit (barwork.ts).
    this.overLimit += Math.max(0, this.drunk + strength - DRUNK_MAX);
    this.drunk = Math.min(DRUNK_MAX, this.drunk + strength);
    this.shift({ drinks: 1, fame: 1, respect: this.drunk >= SLOPPY_DRUNK ? -1 : 0 });
    this.raiseAll(DRINK_DESIRE + this.effects.drinkMeters);
    this.spendWill(DRINK_WILL);
    this.drinksTonight++;
    this.noteTable(wasOpen);
    this.cue("drink");
    // Karryn's dead drunk: past her limit she's done for the night, once whoever she's talking to is done with her.
    // The drink before, she knows it.
    // Whoever she drank with, aroused, asks for adult play before she has another (once a night).
    if (lastClear && !this.lastClearAsked && this.phase === "service" && this.playerBody === "Female") {
      const keen = [...with_].filter((g) => aroused(g.lust, g.mood === "drunk")).sort((a, b) => b.lust - a.lust)[0];
      if (keen) this.lastClearFrom = keen.id;
    }
    const limit = passOutLimit(strength, this.effects.holdLiquor);
    if (this.phase === "service" && this.overLimit >= limit) this.passingOut = true;
    else if (this.overLimit + strength >= limit) this.say(ONE_MORE_WARNING);
  }

  /** How drunk one drink makes her, after her passives. */
  private get drinkStrength(): number {
    return DRINK_STRENGTH * (1 - Math.min(0.9, this.effects.drunkRate));
  }

  /** She's drunk herself under the table: the night's over, and the room saw it. */
  private passOut(): void {
    this.passingOut = false;
    if (this.phase !== "service") return;
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    this.records.passedOut++;
    this.shift({ respect: PASS_OUT_RESPECT });
    this.say(pick(PASS_OUT_LINES));
    this.say(PASS_OUT_AFTER);
    this.closeEarly();
    this.actMoment = "faint";
  }

  /**
   * Her last clear drink (barwork.ts): before she has another and can't say yes to anything, the guest she drank
   * with goes for adult play. Consent on, it's asked, Yes or No; Consent off, her state decides, as for any adult
   * play (7f). A yes needs her ready, as ever, and goes to the Adult play card.
   */
  private askLastClear(): void {
    const id = this.lastClearFrom;
    this.lastClearFrom = null;
    const guest = this.guests.find((g) => g.id === id);
    // Gone, or drunk themselves by now: nobody's asking.
    if (!guest || guest.status === "leaving" || this.phase !== "service" || !aroused(guest.lust, guest.mood === "drunk")) return;
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const prelude = [{ ...narrate(pick(LAST_CLEAR_LINES)), guestId: guest.id }, you(LAST_CLEAR_THOUGHT)];
    if (this.maybeReach(guest, false, null, null, { prelude })) {
      this.lastClearAsked = true;
      this.records.lastClearAsks++;
    }
  }

  /** What she's just started acting out, once: the game plays it on her. */
  takeActMoment(): "dress" | "faint" | null {
    const act = this.actMoment;
    this.actMoment = null;
    return act;
  }

  /**
   * Behind the bar with empty hands, she puts the last piece she lost back on (barwork.ts). Everyone waiting gets
   * that much shorter of patience while she does.
   */
  private redress(): void {
    if (this.stripped === 0) return;
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    this.stripped--;
    const piece = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped]?.label ?? "clothes";
    for (const guest of this.guests) {
      if (guest.status === "waiting" || guest.status === "arriving") guest.patience = Math.max(1, guest.patience - guest.maxPatience * REDRESS_PATIENCE * Math.max(0, 1 - this.effects.redress));
    }
    this.records.redressed++;
    this.dressLeft = REDRESS_SECONDS;
    this.actMoment = "dress";
    this.say(pick(REDRESS_LINES).replaceAll("{piece}", piece));
    this.cue("putDown");
  }

  /** Whether a conversation is open: with a party at their table, or with a guest who tipped you a drink. */
  get inConversation(): boolean {
    return (
      this.talkingTo !== null ||
      this.tipChat !== null ||
      this.touchChat !== null ||
      this.grabChat !== null ||
      this.showChat !== null ||
      this.lantern.chat !== null
    );
  }

  /** Her lewdness: worked out from her passives and records, never raised directly. */
  get lewdness(): number {
    const total = Object.values(this.touchMemory.lets).reduce((sum, n) => sum + (n ?? 0), 0);
    // Her tavern rules count too, while they're on (a shorter apron says something about her).
    const rules = [...this.rules].reduce((sum, id) => sum + (TAVERN_RULE_BY_ID.get(id)?.lewd ?? 0), 0);
    return lewdnessOf(this.passives, total, this.records) + rules;
  }

  /** Where she is on her arc (STORY.md 4b): Sheltered, Curious, Willing or Known. The writing picks by it. */
  get arcStage(): ArcStage {
    return arcStage({ ...this.arcFacts, legend: this.legend.on });
  }

  /** What her stage is read from, without the Legend (that's a saved switch on top of Known). */
  private get arcFacts(): ArcFacts {
    const kinds = new Set(Object.values(this.records.kinds).flatMap((k) => k ?? [])).size;
    return { lewdness: this.lewdness, backStairs: this.passives.has("backStairs"), kinds };
  }

  /** Her desire for a kind of touch in the moment, 0 to 10: its meter, and whatever her passives take off. */
  desireFor(region: TouchRegion): number {
    const skill = bodySkillBonus(this.level(SKILL_OF_REGION[region])).ease;
    return Math.min(10, (this.meters[METER_OF[region]] + (this.effects.ease[region] ?? 0) + skill) / 10);
  }

  /** Whether she's restless enough at bedtime to ease the ache herself. */
  get restless(): boolean {
    return this.phase === "bedtime" && this.playerBody === "Female" && Math.max(...METERS.map((m) => this.meters[m])) >= RESTLESS_AT;
  }

  /** The 18+ moment waiting to be shown, once. */
  takeAdultScene(): AdultScene | null {
    const scene = this.adultScene;
    this.adultScene = null;
    return scene;
  }

  /** Wet: pleasure enough, sooner the higher her Pussy desire (desire.ts). */
  get wet(): boolean {
    return wet(this.meters.pussy, this.pleasure);
  }

  /** Loads into her records, by where they landed. */
  private addCum(cum: Partial<Record<CumSpot, number>>, loads: number): void {
    const r = this.records;
    for (const [spot, ml] of Object.entries(cum)) {
      r.cum[spot as CumSpot] = (r.cum[spot as CumSpot] ?? 0) + (ml ?? 0);
      this.coated[spot as CumSpot] = (this.coated[spot as CumSpot] ?? 0) + (ml ?? 0);
    }
    r.loads += loads;
  }

  /** Whether anything men left is still on her. */
  get messy(): boolean {
    return Object.values(this.coatStages).some((stage) => stage > 0);
  }

  /**
   * She climbs into the bath in her room and scrubs it all off. Her records keep every load; only what shows on
   * her goes. Morning washes it off too, if she never gets to the bath.
   */
  bathe(): void {
    this.coated = {};
    this.endedTest = null;
    this.cue("refill");
    this.say("You sink into the hot bath and scrub yourself clean, then dry off and dress again.");
  }

  /** How much shows on each part of her tonight, by stage: 0 is clean. A duel going on shows as it happens. */
  get coatStages(): Record<CoatSection, number> {
    const duel = (this.duel ?? this.endedTest)?.cum;
    if (!duel) return coatStages(this.coated);
    const both: Partial<Record<CumSpot, number>> = { ...this.coated };
    for (const [spot, ml] of Object.entries(duel)) both[spot as CumSpot] = (both[spot as CumSpot] ?? 0) + (ml ?? 0);
    return coatStages(both);
  }

  /**
   * She eases the ache herself before she sleeps. Her meters settle, and she sleeps easy; unless (Consent off, KP's
   * invasion) the noise draws someone who left tonight wanting her back through her door: then she's still worked up,
   * reeling from coming, and it's a brawl in her room. Returns whether they came in.
   */
  easeAche(): boolean {
    if (!this.restless) return false;
    this.records.alone++;
    this.cameTonight();
    if (this.maybeInvaded()) return true;
    this.eased = true;
    Object.assign(this.meters, emptyMeters());
    this.pleasure = 0;
    return false;
  }

  /** How likely her noise easing the ache draws someone in tonight (invasion.ts): never with Consent on. */
  get invasionChance(): number {
    if (!this.consentOff || this.playerBody !== "Female") return 0;
    return invasionChance({
      desire: Math.max(...METERS.map((m) => this.meters[m])),
      slutLevel: this.slutLevel,
      fame: this.persona.fame,
      candidates: this.leftWanting.length,
    });
  }

  /**
   * KP's invasion: the roll, and if it comes, the brawl. Still worked up (her desire stays), just come (she's reeling,
   * so they get the first move), and bare on her bed; nobody's watching. The ones who come in are the latest who left
   * wanting her, more the louder she was.
   */
  private maybeInvaded(): boolean {
    const chance = this.invasionChance;
    if (chance <= 0 || this.random() >= chance) return false;
    const desire = Math.max(...METERS.map((m) => this.meters[m]));
    const n = invaderCount(this.leftWanting.length, desire, this.random());
    const who = this.leftWanting.slice(-n).reverse();
    this.pleasure = 0;
    const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder);
    const lead = who[0];
    const id = (i: number) => -1000 - i;
    const stats: FighterStats = {
      ...this.fighterStats(),
      workedUp: true,
      desire: { ...this.meters },
      sens: { ...this.effects.sens },
      caps: desireCaps(this.effects),
      pleasure: 0,
      prefers: lead.stats.prefers,
      forceful: true,
      clothes: { pieces: ladder.map((g) => g.label), off: ladder.length },
      sexOk: true,
      rimjob: this.touchSettings.rimjob,
      footjob: this.touchSettings.footjob,
      tier: fightTier(this.slutLevel),
      fame: this.persona.fame,
      lewdTalk: this.effects.talk,
      experience: {
        hands: this.records.acts.hands ?? 0,
        mouth: this.records.acts.mouth ?? 0,
        breasts: this.records.acts.hands ?? 0,
        pussy: this.records.acts.bed ?? 0,
        butt: this.records.acts.behind ?? 0,
      },
      crowd: [],
      joiners: who.slice(1).map((g, i) => ({ guestId: id(i + 1), kind: g.kind, drunk: false, rolled: g.stats, prefers: g.stats.prefers, horny: true })),
    };
    const fight = new Fight(id(0), lead.kind, false, stats, this.random, lead.stats);
    fight.allIn();
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const name = (lead.stats.label ?? lead.kind).toLowerCase();
    const door = (who.length > 1 ? pick(DOOR_CREW_LINES) : pick(DOOR_LINES))
      .replaceAll("{Name}", `The ${name}`)
      .replaceAll("{name}", `the ${name}`)
      .replaceAll("{more}", String(who.length - 1));
    fight.narrate("noise", pick(NOISE_LINES));
    fight.narrate("invade", door);
    // She's just come: they get the first move (KP's sneak attack).
    fight.dazed = true;
    this.fight = fight;
    this.invading = true;
    this.fightsTonight++;
    this.records.invaded++;
    this.say(this.logLine(HEARD_YOU_LOG, { who: who.length > 1 ? `${who.length} of them` : `The ${name}` }));
    return true;
  }

  /**
   * How high a desire can go tonight (Karryn's Prison's max desire): low at first, lifted by the passives for
   * reaching it (passives.ts desireCap).
   */
  desireCap(meter: Meter): number {
    return desireCap(this.effects, meter);
  }

  /**
   * A leering guest's remark as she takes his order or brings it (chatter.ts), KP's waitress talk: lewd talk about the
   * part of her he goes for, half a brawl line's worth. It stirs her, gives her pleasure once she likes hearing it, and
   * counts toward her talk passives (lewdtalk.ts). Never enough on its own to make her come at the bar.
   */
  heardLeer(guestId: number): void {
    // Only while the bar is open and she's on the floor.
    if (this.playerBody !== "Female" || !(this.phase === "dusk" || this.phase === "service" || this.phase === "lastcall")) return;
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest) return;
    const prefers = guest.stats.prefers;
    const part: LewdPart = !prefers || prefers === "hands" ? "cock" : prefers;
    const t = this.effects.talk;
    const gain = talkGain({ talkLvl: 0, sense: t.sense, rate: t.rate, jerk: 0, spread: this.random() });
    this.raise(part, gain.desire * LEER_SHARE);
    const pleasure = gain.pleasure * LEER_SHARE;
    if (pleasure > 0) {
      this.pleasure = Math.min(PLEASURE_MAX - 1, this.pleasure + pleasure);
      this.records.talkPleasure += pleasure;
    }
    this.records.talkedAt[part] = (this.records.talkedAt[part] ?? 0) + 1;
  }

  /** Tonight's desire goes up on one meter, faster with passives that make it so. */
  private raise(meter: Meter, n: number): void {
    const gain = n > 0 ? n * (1 + this.effects.sens[meter]) : n;
    const prev = this.meters[meter];
    this.meters[meter] = clamp(this.meters[meter] + gain, 0, this.desireCap(meter));
    this.peak[meter] = Math.max(this.peak[meter], this.meters[meter]);
    const delta = this.meters[meter] - prev;
    if (delta >= 1) {
      const name = METER_NAMES[meter];
      this.say(wildSensitivity(name, delta, this.lewdness, this.houseMode.current === "brothel", this.logRoll()));
      // Both true now (desire.ts): from 50 it gets in her way in a brawl, from 80 twice as much.
      if (this.meters[meter] >= DESIRE_STRONG && prev < DESIRE_STRONG)
        this.say(this.logLine(DESIRE_STRONG_LOG, { Part: name }));
      if (this.meters[meter] >= HORNY_AT && prev < HORNY_AT) this.say(this.logLine(HORNY_LOG, { Part: name }));
    }
  }

  private raiseAll(n: number): void {
    if (n === 0) return;
    for (const meter of METERS) this.raise(meter, n);
  }

  /**
   * How much her passives ease the table (adultplay.ts), KP's waitress-sex passives: Open House and The Whole Room,
   * and the house rule The Back Room.
   */
  private get tableEase(): number {
    return (this.passives.has("openHouse") ? 1 : 0) + (this.passives.has("wholeRoom") ? 1 : 0) + this.effects.tableEase;
  }

  /** Whether a guest could get her down on a table tonight (KP's Waitress Sex): drunk enough, or come enough this shift. */
  get tableOpen(): boolean {
    // Consent off (KP): dead drunk doesn't shut it. Passed out is another matter: the night's over by then.
    const tooDrunk = this.consentOff ? Infinity : SLOPPY_DRUNK;
    return this.playerBody === "Female" && tableOpen({ drunk: this.drunk, tooDrunk, comes: this.comesTonight, ease: this.tableEase });
  }

  /**
   * How near the table is to opening, 0 to 100, for her status card: the drink or the times she's come this shift,
   * whichever's nearer. Too drunk, it's shut (0).
   */
  get tableProgress(): number {
    if (this.drunk >= SLOPPY_DRUNK && !this.consentOff) return 0;
    if (this.tableOpen) return 100;
    const ease = Math.max(0, Math.min(TABLE_COMES.length - 1, Math.floor(this.tableEase)));
    const drink = this.drunk / (ease > 0 ? TABLE_DRUNK.eased : TABLE_DRUNK.base);
    return Math.floor(Math.min(1, Math.max(drink, this.comesTonight / TABLE_COMES[ease])) * 100);
  }

  /** Says so as the table opens up (it wasn't before). */
  private noteTable(wasOpen: boolean): void {
    if (!wasOpen && this.tableOpen) this.say(storyLine(TABLE_OPEN_LINES, this.storyRoll(this.nightIndex, 30 + this.comesTonight)));
  }

  /** She came, this shift: counted toward the table (KP's orgasms in a bar shift). */
  private cameTonight(n = 1): void {
    if (n <= 0) return;
    const wasOpen = this.tableOpen;
    this.comesTonight += n;
    this.noteTable(wasOpen);
  }

  /** Changes her reputation, and with greed, cold choices and secrets sold or told, her corruption. */
  private shift(change: Partial<Persona> = {}): void {
    shiftPersona(this.persona, change);
    const gain =
      Math.max(0, change.greed ?? 0) * CORRUPT_PER_GREED +
      Math.max(0, change.sold ?? 0) * CORRUPT_PER_SOLD +
      Math.max(0, change.informed ?? 0) * CORRUPT_PER_INFORM +
      Math.max(0, -(change.kindness ?? 0)) * CORRUPT_PER_COLD;
    this.corruption = Math.min(1000, this.corruption + gain);
    if (gain > 0) {
      const tag = this.corruption >= 150 ? " (rotten)" : this.corruption >= 80 ? " (crooked)" : "";
      this.say(`Corruption +${Math.round(gain)}${tag}`);
    }
    this.unlockBrothel();
  }

  /**
   * Opens the brothel once she's lewd enough or corrupt enough. Checked whenever either can rise: as corruption
   * shifts, and as passives are earned (her lewdness is worked out from her passives and records). Quiet when a
   * save is loaded, so she isn't told again.
   */
  private unlockBrothel(quiet = false): void {
    if (this.houseMode.unlocked.has("brothel")) return;
    if (this.lewdness < BROTHEL_AT_LEWDNESS && this.corruption < BROTHEL_AT_CORRUPTION) return;
    this.houseMode.unlocked.add("brothel");
    this.houseMode.brothel = 1;
    if (!quiet) this.say("The house can now become a brothel.");
  }

  /** What passives read about her right now. */
  passiveFacts(): PassiveFacts {
    return {
      records: this.records,
      lets: this.touchMemory.lets,
      drinks: this.persona.drinks,
      sold: this.persona.sold,
      informed: this.persona.informed,
      protected: this.persona.protected,
      fame: this.persona.fame,
      trust: this.trust,
      trustMax: TRUST_MAX,
      lewdness: this.lewdness,
      corruption: this.corruption,
      levels: this.statLevels(),
      herLevel: this.herLevel,
      slutLevel: this.slutLevel,
    };
  }

  /** A stat's or skill's level: what experience has reached, and what passives add. */
  level(id: StatId | SkillId): number {
    return levelOf(this.xp[id] ?? 0) + (this.effects.skill[id] ?? 0);
  }

  statLevels(): Record<StatId, number> {
    return Object.fromEntries(STATS.map((s) => [s.id, this.level(s.id)])) as Record<StatId, number>;
  }

  /** Her willpower at the top: from Mind, and composure passives. */
  get maxWillpower(): number {
    return maxWillpower(this.level("mind"), this.effects.willMax + (this.herLevel - 1) * LEVEL_WILL);
  }

  /** Her energy at the top (7k): from Mind and Endurance. */
  get maxEnergy(): number {
    return maxEnergy(this.statLevels());
  }

  /** Her energy now, 0 up to the top. Full every morning. */
  get energy(): number {
    const max = this.maxEnergy;
    return Math.max(0, Math.min(max, max - this.energySpent));
  }

  /** Her fatigue level, 0 to 5 (KP's): each takes something off what she can do in a brawl. */
  get fatigueLevel(): number {
    return fatigueLevel(this.fatigue);
  }

  /** Wears her out; never past the top. */
  private tire(n: number): void {
    this.fatigue = Math.max(0, Math.min(FATIGUE_MAX, this.fatigue + n));
  }

  /** Her willpower now, 0 up to the top. Full every morning. */
  get willpower(): number {
    const max = this.maxWillpower;
    return Math.max(0, Math.min(max, max - this.willSpent));
  }

  /** Spends willpower, never below none. */
  private spendWill(n: number): void {
    this.willSpent = Math.min(this.maxWillpower, this.willSpent + Math.max(0, n));
    if (this.willpower * 2 < this.maxWillpower) this.willDipped = true;
  }

  /** Gives willpower back, never past the top. */
  private restoreWill(n: number): void {
    this.willSpent = Math.max(0, this.willSpent - Math.max(0, n));
  }

  /** After a brawl or a duel: she has what it left her with. */
  private settleWill(left: number): void {
    this.willSpent = Math.max(0, this.maxWillpower - left);
    if (this.willpower * 2 < this.maxWillpower) this.willDipped = true;
  }

  private gainXp(id: StatId | SkillId, n: number): void {
    // The difficulty: she grows faster on Easy, slower on Hard (KP's growth rates).
    if (n > 0) n *= DIFFICULTIES[this.touchSettings.difficulty ?? "normal"].growth;
    if (n <= 0) return;
    const before = levelOf(this.xp[id] ?? 0);
    this.xp[id] = (this.xp[id] ?? 0) + n;
    const after = levelOf(this.xp[id]);
    // A new level: the game shows it, so the player knows what practice has done for her.
    if (after > before) this.gains.push({ kind: "level", id, name: nameOfSkill(id), level: this.level(id) });
  }

  /**
   * Level ups, kink changes, and her Level or Slut Level going up, since the game last asked. Reading them empties
   * the queue.
   */
  takeGains(): Gain[] {
    const level = this.herLevel;
    if (level > this.shownLevel) this.gains.push({ kind: "rank", which: "level", level });
    const slut = this.slutLevel;
    if (slut > this.shownSlut) this.gains.push({ kind: "rank", which: "slut", level: slut, word: lewdWord(this.lewdness) });
    this.shownLevel = level;
    this.shownSlut = slut;
    return this.gains.splice(0);
  }

  /** What her passives add up to, with the titles she's wearing on top. */
  private refreshEffects(): void {
    const e = effectsOf(this.passives);
    for (const id of this.worn) TITLE_BY_ID.get(id)?.wear(e);
    for (const d of this.debuffs) DEBUFFS[d.id].effect(e, d.level);
    for (const id of this.rules) TAVERN_RULE_BY_ID.get(id)?.effect?.(e);
    // A riot night (KP's riots): trouble starts twice as easily.
    if (this.riot) e.trouble -= RIOT_TROUBLE;
    // Her trinkets (KP's accessories), the ones she has.
    const owned = new Set(trinketsOwned(this.level("charm"), this.records).map((t) => t.id));
    for (const id of this.trinketsWorn) if (owned.has(id)) TRINKET_BY_ID.get(id)?.wear(e);
    // Her staff on tonight (staff.ts): a barmaid keeps guests waiting happier, a doorman keeps trouble down, and
    // each one's perks have their say.
    // A second on the same post (from an edict) adds half as much again.
    const posted = (job: StaffJob) => {
      const n = this.staffOnPost(job);
      return n > 0 ? 1 + SECOND_POST_SHARE * (n - 1) : 0;
    };
    e.patience += BARMAID_PATIENCE * posted("barmaid");
    e.trouble += DOORMAN_TROUBLE * posted("doorman");
    for (const m of this.staff) {
      if (m.quit || m.stamina.current <= 0 || this.postOf(m) === null) continue;
      for (const id of m.perks) STAFF_PERK_BY_ID[id]?.effect?.(e);
    }
    // Checking her phone mid-shift (feedstar.ts): guests wait a little less.
    if (this.phoneTonight) e.patience -= PHONE_PATIENCE;
    // Her guild injuries (guild.ts) take levels off a stat while they last.
    for (const i of this.guild?.injuries ?? []) {
      if (i.who !== "her") continue;
      const d = Guild.INJURIES[i.id];
      e.skill[d.stat] = (e.skill[d.stat] ?? 0) - d.amount;
    }
    this.effects = e;
  }

  /** How many titles she can wear at once. */
  get titleSlots(): number {
    return this.persona.fame >= TWO_SLOTS_FAME ? 2 : 1;
  }

  /** Titles are changed while the tavern's shut, never in the middle of a night's service. */
  get canChangeTitles(): boolean {
    return this.phase !== "service" && this.phase !== "lastcall" && this.fight === null;
  }

  /** Puts a title on: into a free slot, or in place of the one worn longest if every slot's taken. */
  wearTitle(id: string): boolean {
    if (!this.canChangeTitles || !this.titles.has(id) || this.worn.includes(id)) return false;
    if (this.worn.length >= this.titleSlots) this.worn.shift();
    this.worn.push(id);
    this.refreshEffects();
    return true;
  }

  /** Takes a title off, leaving the slot empty. */
  takeOffTitle(id: string): boolean {
    if (!this.canChangeTitles || !this.worn.includes(id)) return false;
    this.worn = this.worn.filter((w) => w !== id);
    this.refreshEffects();
    return true;
  }

  /** Her Level: 1, and one more for every few levels her stats and skills have gained between them. */
  get herLevel(): number {
    const ids = [...STATS.map((s) => s.id), ...BODY_SKILLS.map((s) => s.id), ...ACT_SKILLS.map((s) => s.id)];
    const gained = ids.reduce((sum, id) => sum + (this.level(id) - 1), 0);
    return 1 + Math.floor(gained / LEVELS_PER_LEVEL);
  }

  /** Her Slut Level, Karryn's: her lewdness by tens. */
  get slutLevel(): number {
    return Math.floor(this.lewdness / LEWDNESS_PER_SLUT_LEVEL);
  }

  /** What her Level adds to her stamina in a brawl. */
  get levelStamina(): number {
    return (this.herLevel - 1) * LEVEL_STAMINA;
  }

  /** How long a ready stew keeps before it burns: longer with Never Burns. */
  private get burnTime(): number {
    return BURN_TIME * (1 + this.effects.burnGrace);
  }

  /** Willpower it costs to say no to a touch part of her wants: less with Firm No and Ice Queen. */
  private refuseWill(tier: number, boldness: number): number {
    const cost = refuseCost(tier, boldness);
    return cost === 0 ? 0 : Math.max(1, Math.round(cost * Math.max(0, 1 - this.effects.refuseEase)));
  }

  /** A brawl with nobody in the room, from the B key in development, to try the fight screen. */
  startTestFight(): void {
    if (this.fight) return;
    const kind = GUEST_KIND_LIST[Math.floor(this.random() * GUEST_KIND_LIST.length) % GUEST_KIND_LIST.length];
    const roster = ROLES_OF[kind];
    this.fight = new Fight(-1, kind, false, this.fighterStats(), this.random, rollStats(roster[Math.floor(this.random() * roster.length) % roster.length], this.rollRandom));
  }

  /** Trouble starts brewing at a guest's table: they shout something hateful, and the room hears it. */
  private brewTrouble(guest: Guest): void {
    const drunk = guest.mood === "drunk";
    const shouts = TROUBLE_SHOUTS[drunk ? "drunk" : "angry"];
    const shout = shouts[Math.floor(this.random() * shouts.length) % shouts.length];
    this.trouble = { guestId: guest.id, stage: "brewing", timer: TROUBLE_BREWING, shout, arrived: false, waiting: guest.status === "waiting" };
    const name = this.nameOf(guest).toLowerCase();
    this.say(drunk ? `The ${name} knocks a cup flying and starts shouting at you.` : `The ${name} slams a fist on the table and glares at you.`);
    this.say(`${this.nameOf(guest)}: "${shout}"`);
    this.cue("smashOne");
  }

  /** The game says the guest coming for her has reached her. */
  troubleArrived(guestId: number): void {
    if (this.trouble?.guestId === guestId && this.trouble.stage === "coming") this.trouble.arrived = true;
  }

  /**
   * Trouble boiling over: it brews, then they come for her, then the brawl. Serving them while it brews can
   * settle them; it all blows over if they leave, or the night ends first. She's never pulled out of a
   * conversation for it: they wait until she's done.
   */
  private updateTrouble(dt: number): void {
    const trouble = this.trouble;
    if (!trouble) return;
    const guest = this.guests.find((g) => g.id === trouble.guestId);
    if (!guest || guest.status === "leaving" || guest.status === "arriving" || this.phase !== "service" || this.fight) {
      this.trouble = null;
      return;
    }
    const name = this.nameOf(guest).toLowerCase();
    if (trouble.stage === "brewing") {
      if (trouble.waiting && guest.status === "eating") {
        this.trouble = null;
        guest.mood = "calm";
        this.say(`The ${name} grumbles, but takes the ${guest.order} and stays put.`);
        return;
      }
      trouble.timer -= dt;
      if (trouble.timer <= 0) {
        trouble.stage = "coming";
        trouble.timer = TROUBLE_COMING;
        this.say(`The ${name} kicks the chair back and comes for you!`);
        this.cue("drop");
      }
      return;
    }
    trouble.timer -= dt;
    if ((trouble.arrived || trouble.timer <= 0) && !this.inConversation) this.startFight(guest.id);
  }

  /** Starts a brawl with a guest. Whoever's playing deals with it. */
  startFight(guestId: number): void {
    const guest = this.guests.find((g) => g.id === guestId);
    if (!guest || this.fight) return;
    this.trouble = null;
    // Came in worked up: now and then they'll reach for her mid-fight, and she's asked on the touch screen.
    const female = this.playerBody === "Female";
    const workedUp = female && guest.lust >= STRONG_LUST;
    // Her desire comes into the fight with her (desire.ts): it gets in her way, their grapples stir it, and her
    // Cock desire opens up what she can do with her hands and mouth.
    // Their table, who may pile in as it goes (7i: KP's bar brawl joins).
    const joiners = this.brawlJoiners(guest, female);
    // How much is off her, and whether she's sober enough for a foe to start anything (7i; the consent rule).
    const desire = female
      ? {
          desire: { ...this.meters },
          sens: { ...this.effects.sens },
          caps: desireCaps(this.effects),
          pleasure: this.pleasure,
          prefers: guest.stats.prefers,
          exposure: this.exposure,
          // Her clothes, as they are going in (7l): a foe may go for them, asked like any reach; Consent off, torn
          // off her (KP).
          forceful: this.consentOff,
          clothes: {
            pieces: stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder).map((g) => g.label),
            off: this.stripped,
          },
          sexOk: this.drunk < SLOPPY_DRUNK,
          rimjob: this.touchSettings.rimjob,
          footjob: this.touchSettings.footjob,
          tier: fightTier(this.slutLevel),
          // What the room's heard of her, and what lewd talk does to her (lewdtalk.ts, KP's talk).
          fame: this.persona.fame,
          lewdTalk: this.effects.talk,
          // How used she is to each act (her records), for how she talks in a scene: her first time is her first time.
          experience: {
            hands: this.records.acts.hands ?? 0,
            mouth: this.records.acts.mouth ?? 0,
            breasts: this.records.acts.hands ?? 0,
            pussy: this.records.acts.bed ?? 0,
            butt: this.records.acts.behind ?? 0,
          },
          crowd: this.brawlWatchers(guest, joiners),
        }
      : {};
    this.fight = new Fight(guest.id, guest.kind, guest.mood === "drunk", { ...this.fighterStats(), workedUp, joiners, ...desire }, this.random, guest.stats);
    this.fightsTonight++;
    this.say(`Brawl! The ${this.nameOf(guest).toLowerCase()} is right in your face.`);
    this.cue("walkOut");
  }

  /**
   * Who's watching a brawl, as the log names them (7i): their table first, then the rest of the room. Only those sat
   * in it; never the Baron.
   */
  private brawlWatchers(foe: Guest, joiners: readonly FoeSpec[]): string[] {
    const table = this.tableOf(foe.seat);
    return this.guests
      .filter((g) => g.id !== foe.id && !joiners.some((j) => j.guestId === g.id))
      .filter((g) => (g.status === "waiting" || g.status === "eating") && !isBaron(this.roomGuest(g)))
      .map((g) => {
        const label = (g.stats.label ?? g.kind).toLowerCase();
        return this.tableOf(g.seat) === table ? `The ${label} at their table` : `${/^[aeiou]/.test(label) ? "An" : "A"} ${label} across the room`;
      });
  }

  /**
   * Who may jump into a brawl (7i, KP's bar brawl joins): the one who started it's party, or else their table; only
   * those sat in the room and spoiling for it (angry, drunk or lusting), never the Baron; the readiest first, up to
   * three. Worked up (strong lust), they want her as much as a fight.
   */
  private brawlJoiners(foe: Guest, female: boolean): FoeSpec[] {
    const table = this.tableOf(foe.seat);
    const keen = (g: Guest) => (g.mood === "drunk" ? 2 : g.mood === "lust" ? 1.5 : 1);
    return this.guests
      .filter((g) => g.id !== foe.id && (g.status === "waiting" || g.status === "eating"))
      .filter((g) => (foe.party !== null ? g.party === foe.party : this.tableOf(g.seat) === table))
      .filter((g) => (g.mood === "angry" || g.mood === "drunk" || g.mood === "lust") && !isBaron(this.roomGuest(g)))
      .sort((a, b) => keen(b) - keen(a))
      .slice(0, MAX_FOES - 1)
      .map((g) => ({ guestId: g.id, kind: g.kind, drunk: g.mood === "drunk", rolled: g.stats, prefers: g.stats.prefers, horny: female && g.lust >= STRONG_LUST }));
  }

  /** Her side of a brawl: her levels, what her passives add, and the willpower she has left. */
  private fighterStats(): FighterStats {
    const e = this.effects;
    return {
      guard: this.guardMeter,
      // KP's enemy prefixes (foeprefix.ts), and the difficulty.
      prefixOf: foePrefixFor,
      sceneEase: e.sceneEase,
      // KP's Deny Ejaculation comes with her dom side: 10 slaps and stands, all told.
      denyOk: this.records.slapped + this.records.domWins >= DENY_UNLOCK,
      foeScale: DIFFICULTIES[this.touchSettings.difficulty ?? "normal"].foes,
      levels: this.statLevels(),
      // Her garrison rank's sword (knight.ts).
      damage: e.fightDamage + this.knightBrawlDamage,
      dodge: e.fightDodge,
      talk: e.fightTalk,
      stare: e.fightStare,
      will: this.willpower,
      maxWill: this.maxWillpower,
      grappleHit: e.grappleHit,
      grappleGuard: e.grappleGuard,
      heldEase: e.heldEase,
      brawlSlap: e.brawlSlap,
      brawlReach: e.brawlReach,
      fightDesire: e.fightDesire,
      extraStamina: this.levelStamina,
      // Her energy and fatigue going in (7k).
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      fatigue: this.fatigueLevel,
    };
  }

  /** She makes a move in the brawl; when it's over, the room sees how it went. */
  fightMove(move: FightMove, aim?: StrikeAim, timed?: StrikeResult): void {
    const fight = this.fight;
    if (!fight) return;
    fight.act(move, aim, timed);
    this.afterFightStep(fight);
  }

  /** She stops the needle on the guard meter (`pos`, 0 to 1 across it): their swing is dodged, blocked or lands. */
  fightGuard(pos: number): void {
    const fight = this.fight;
    if (!fight?.incoming) return;
    fight.guard(pos);
    this.afterFightStep(fight);
  }

  /** After each step of a brawl: her clothes, a reach or a scene on offer to answer, and the end of it. */
  private afterFightStep(fight: Fight): void {
    // Fix Clothes puts a piece back on her (7l).
    this.syncClothes(fight);
    if (fight.reaching) this.brawlReach(fight);
    // A foe starting a scene with her (7i): with Consent off, her state has already said yes (she's ready for it);
    // with it on, she's asked (answerFightOffer).
    if (fight.offering && this.consentOff) fight.answerOffer("yes");
    if (fight.outcome) this.finishFight(fight);
  }

  /** Consent is off: the player has said yes in advance to what she's ready for. */
  get consentOff(): boolean {
    return this.touchSettings.autoTouch && this.touchSettings.agreed;
  }

  /** Her answer to a foe starting a scene with her mid-brawl (7i). Pull away always works. */
  answerFightOffer(answer: "yes" | "slap" | "pull"): void {
    const fight = this.fight;
    if (!fight?.offering) return;
    fight.answerOffer(answer);
    if (fight.outcome) this.finishFight(fight);
  }

  /**
   * A worked-up foe reaches for her mid-brawl: the fight waits, and she's asked on the usual touch screen, every
   * answer there (Pull away included). If there's nothing to ask about, she just twists clear.
   */
  private brawlReach(fight: Fight): void {
    const guest = this.guests.find((g) => g.id === fight.reachingGuestId);
    // What she has left after the blows so far is what she answers with.
    this.settleWill(fight.will);
    this.settleDesire(fight);
    // Going for her clothes (7l): a garment, asked like any reach; nothing to take, and she twists clear.
    // Come in through her door (invasion.ts): nobody in the room to ask about, and Consent's off, so it lands.
    if (!guest && this.invading) {
      fight.afterReach("yes", this.willpower);
      return;
    }
    if (!guest || !this.maybeReach(guest, true, null, null, null, fight.reachingFor === "clothes")) fight.afterReach("pull", this.willpower);
  }

  /** What's off her in the fight is what's off her (7l), for the model, her exposure and the night's records. */
  private syncClothes(fight: Fight): void {
    if (this.playerBody === "Female") this.stripped = fight.clothesOff;
  }

  /** She comes out of the fight (or into the touch screen mid-fight) with the desire and pleasure it left her. */
  private settleDesire(fight: Fight): void {
    if (!fight.desire) return;
    for (const m of METERS) {
      this.meters[m] = clamp(fight.desire[m], 0, this.desireCap(m));
      this.peak[m] = Math.max(this.peak[m], this.meters[m]);
    }
    this.pleasure = fight.pleasure;
  }

  private finishFight(fight: Fight): void {
    this.settleWill(fight.will);
    this.settleDesire(fight);
    // What she spent of her energy, and how it wore her out (7k).
    this.energySpent = Math.max(0, this.maxEnergy - fight.energy);
    this.tire(brawlFatigue(fight.foes.length, fight.turns, fight.climaxes));
    this.cameTonight(fight.climaxes);
    // What she did with her hands and mouth counts like it would upstairs (riding them, like the bed).
    for (const [move, n] of Object.entries(fight.acts)) {
      const act: UpstairsAct = move === "ride" ? "bed" : (move as UpstairsAct);
      this.records.acts[act] = (this.records.acts[act] ?? 0) + (n ?? 0);
      if (fight.desire) this.gainXp(ACT_SKILL_OF[act], UPSTAIRS_XP * (n ?? 0));
    }
    for (const [stat, n] of Object.entries(fight.xp)) this.gainXp(stat as StatId, n ?? 0);
    this.gainXp("endurance", 3);
    const r = this.records;
    // Lewd talk counts toward her talk passives (lewdtalk.ts, KP's talk records), whatever kind of brawl it was.
    for (const [part, n] of Object.entries(fight.talkedAt) as [LewdPart, number][]) r.talkedAt[part] = (r.talkedAt[part] ?? 0) + n;
    r.talkedBy += fight.talkers.size;
    r.talkPleasure += fight.talkPleasure;
    r.talkClimaxes += fight.talkClimaxes;
    r.jerkedAt += fight.jerkedAt;
    // So do stares, toward her sight passives (KP's sight records).
    for (const [part, n] of Object.entries(fight.seenAt) as [LewdPart, number][]) r.seenAt[part] = (r.seenAt[part] ?? 0) + n;
    r.seenBy += fight.starers.size;
    r.sightPleasure += fight.sightPleasure;
    r.sightClimaxes += fight.sightClimaxes;
    // A tourney, a patrol or the old commander (knight.ts): not a tavern brawl.
    if (this.sideFight) {
      this.finishSideFight(fight, this.sideFight);
      return;
    }
    if (this.invading) {
      this.finishInvasion(fight);
      return;
    }
    r.dodges += fight.dodges;
    r.grapplesLanded += fight.grapplesLanded;
    r.grapplesTaken += fight.grapplesTaken;
    r.timesHeld += fight.timesHeld;
    // Coming mid-brawl counts like any other time (7j).
    r.climaxes += fight.climaxes;
    const lead = fight.lead;
    const guest = this.guests.find((g) => g.id === lead.guestId);
    // Whoever else piled in (7i): out the door, besotted, back in their seat, or still standing over her.
    for (const foe of fight.foes.slice(1)) this.settleJoiner(foe);
    // For the regulars (regulars.ts): a brawl settles who's stronger, either way.
    if (fight.outcome === "won") this.mark(guest, (m) => (m.lostToHer = true));
    else if (fight.outcome === "lost") this.mark(guest, (m) => (m.beatHer = true));
    let text: string;
    if (fight.outcome === "won" && fight.spent) {
      // Worn out by her hands, mouth or the rest: the room talks about it, if not with respect.
      r.fightsWon++;
      if (guest) {
        guest.mood = "idolize";
        this.sendOff(guest);
      }
      this.shift({ fame: 3, flirt: 1, respect: -1 });
      text = "Spent. They stagger out grinning, and the room won't stop talking about it.";
    } else if (fight.outcome === "won") {
      r.fightsWon++;
      this.riotWin();
      r.toys += fight.toysIn;
      if (guest) this.sendOff(guest);
      this.shift({ respect: 2, fame: 3 });
      // Throwing out one of the baron's men gets back to him.
      this.adjust(0, 0, lead.kind === "soldier" ? 1 : 0);
      text = lead.kind === "soldier" ? "Thrown out. The room cheers, but the baron will hear of it. (+1 heat)" : "Thrown out. The room cheers.";
    } else if (fight.outcome === "talked") {
      r.talkedDown++;
      if (guest) guest.mood = "calm";
      // Sober, and talked round rather than beaten: they might linger after closing and ask for a game.
      if (guest && !lead.drunk) this.peacemade.push({ kind: guest.kind, stats: guest.stats });
      this.shift({ respect: 1 });
      this.adjust(0, 1, 0);
      text = "Talked down. They're back in their seat, and the village likes a peacemaker. (+1 trust)";
    } else {
      r.fightsLost++;
      const taken = Math.min(this.gold, LOST_FIGHT_GOLD + this.nightIndex * 2);
      this.adjust(-taken, 0, 0);
      if (guest) this.sendOff(guest);
      this.shift({ respect: -2 });
      text = `Knocked down. They grab ${taken} gold from the till. You'll be feeling it tomorrow.`;
      // She'll carry it into tomorrow night: bruised (a debuff).
      this.addDebuff("bruised");
      // The one who won asks her, and their companions ask too. Hers to answer; the night ends either way (see BrawlOffer).
      if (guest && this.playerBody === "Female") {
        this.brawlOffer = { kind: guest.kind, stats: guest.stats, female: guest.female, drunk: lead.drunk, crew: this.defeatCrew(guest) };
        // Consent off (KP's defeat): no asking. The one who won and their company take her where she fell.
        if (this.consentOff && !lead.drunk) this.forceBrawlDuel();
      }
    }
    this.lastFight = { outcome: fight.outcome!, text };
    this.say(text);
    this.fight = null;
  }

  /**
   * The brawl that came in through her door (invasion.ts) is over. Won or talked down, they're out and the door's
   * barred. Lost, it's KP's defeat, right there on her bed: all of them, no Stop.
   */
  private finishInvasion(fight: Fight): void {
    this.invading = false;
    this.fight = null;
    const r = this.records;
    r.dodges += fight.dodges;
    r.climaxes += fight.climaxes;
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    let text: string;
    if (fight.outcome === "won") {
      r.invadedWon++;
      text = pick(WON_LINES);
    } else if (fight.outcome === "talked") {
      r.talkedDown++;
      text = pick(TALKED_LINES);
    } else {
      r.fightsLost++;
      this.addDebuff("bruised");
      text = this.logLine(INVADED_DOWN_LOG);
      const partners = fight.foes.filter((f) => f.out !== "spent").map((f) => ({ kind: f.kind, female: false }));
      if (partners.length > 0) {
        const play = defeatPlay(defeatFor({ place: "upstairs", kind: partners[0].kind, heat: this.heat, invasion: true }));
        this.forceDuel(partners, "upstairs", partners.length > 1 ? FORCED_ROOM_CREW : FORCED_ROOM_ONE, play);
        this.beginDefeat("upstairs", partners[0].kind, partners.length, true);
      }
    }
    this.lastFight = { outcome: fight.outcome!, text, invasion: true };
    this.say(text);
  }

  /** One who jumped into a brawl, as it ended for them (7i). */
  private settleJoiner(foe: Foe): void {
    const guest = this.guests.find((g) => g.id === foe.guestId);
    if (!guest) return;
    if (foe.out === "spent") {
      guest.mood = "idolize";
      this.sendOff(guest);
      this.mark(guest, (m) => (m.lostToHer = true));
    } else if (foe.out === "talked") guest.mood = "calm";
    else if (foe.out) {
      this.sendOff(guest);
      this.mark(guest, (m) => (m.lostToHer = true));
    } else this.mark(guest, (m) => (m.beatHer = true));
  }

  /**
   * The brawl winner's companions: their party if they came in with one, or else whoever shares their table. Only
   * those sat in the room, sober enough to know what they're doing, and never the Baron. Each will ask; she picks.
   */
  /**
   * Who's in it after a lost brawl (defeat.ts, KP's defeat battles): the one who won's company, and then anyone in
   * the room keen enough (strong lust, sober, never the Baron), up to how many her records say a defeat holds
   * (KP's getDefeatedLv…Factor). Each still asks, with Consent on.
   */
  private defeatCrew(winner: Guest): BrawlCrewMate[] {
    const crew = this.brawlCrew(winner);
    const id = defeatFor({ place: "here", kind: winner.kind, heat: this.heat });
    const room = crowdFactor(this.records, id) - 1 - crew.length;
    if (room <= 0) return crew;
    const inIt = new Set([winner.id, ...crew.map((c) => c.id)]);
    const keen = this.guests
      .filter((g) => !inIt.has(g.id) && (g.status === "waiting" || g.status === "eating"))
      .filter((g) => !g.female && g.lust >= STRONG_LUST && g.mood !== "drunk" && !isBaron(this.roomGuest(g)))
      .sort((a, b) => b.lust - a.lust)
      .slice(0, room)
      .map((g) => ({ id: g.id, kind: g.kind, female: g.female, stats: g.stats, label: g.stats.label ?? g.kind, ask: this.joinAsk(g.id) }));
    return [...crew, ...keen];
  }

  /**
   * A defeat starting (defeat.ts): which one it is, by where and who won; counted in her records; its opening in
   * the game's log, and its morning after.
   */
  /** A brawl won on a riot night: two, and it's put down (KP's riots). */
  private riotWin(): void {
    if (!this.riot) return;
    this.riotWins++;
    if (this.riotWins < RIOT_PUT_DOWN) return;
    this.riot = false;
    this.records.riotsDown++;
    this.shift({ fame: 2, respect: 2 });
    this.refreshEffects();
    this.say("That's the last of them. The riot's put down, and the room drinks to you.");
  }

  private beginDefeat(place: BrawlPlace, kind: GuestKind, n: number, invasion = false, crowd: Crowd = "men"): void {
    const id = defeatFor({ place, kind, heat: this.heat, invasion });
    const r = this.records;
    r.defeats[id] = (r.defeats[id] ?? 0) + 1;
    r.defeatMost = Math.max(r.defeatMost, n);
    this.defeatTonight = id;
    const def = DEFEATS[id];
    const words = defeatWords(id, crowd);
    this.duel?.note(defeatLine(words.start, this.storyRoll(this.nightIndex, 13), n));
    // Its slots: what of her is theirs, how many stand round her, and how many at once (KP's defeat battles).
    const play = this.duel?.defeat;
    if (play) {
      const parts = DUEL_AREAS.filter((a) => play.areas.includes(a.id)).map((a) => AREA_NAMES[a.id].toLowerCase());
      const round = play.others > 0 ? `, and up to ${play.others} standing round you` : "";
      this.duel?.note(`${def.name}: ${parts.join(", ")}${round}. ${play.atOnce} at a time; the rest wait.`);
    }
    this.morningAfter.push(defeatLine(words.morning, this.storyRoll(this.nightIndex, 14), n));
  }

  private brawlCrew(winner: Guest): BrawlCrewMate[] {
    const table = this.tableOf(winner.seat);
    return this.guests
      .filter((g) => g.id !== winner.id && (g.status === "waiting" || g.status === "eating"))
      .filter((g) => (winner.party !== null ? g.party === winner.party : this.tableOf(g.seat) === table))
      .filter((g) => g.mood !== "drunk" && !isBaron(this.roomGuest(g)))
      .map((g) => ({ id: g.id, kind: g.kind, female: g.female, stats: g.stats, label: g.stats.label ?? g.kind, ask: this.joinAsk(g.id) }));
  }

  /** How the last brawl ended, once. */
  takeFightResult(): { outcome: FightOutcome; text: string; invasion?: boolean } | null {
    const result = this.lastFight;
    this.lastFight = null;
    return result;
  }

  // ---------- Adult play: upstairs, or the taproom ----------

  /** How likely this guest, reaching for her, goes for adult play (adultplay.ts): small early, bigger worked up. */
  adultChance(guest: Guest): number {
    return adultPlayChance({
      cock: this.meters.cock,
      horny: horny(this.meters),
      wet: this.wet,
      lust: guest.lust,
      lusting: feltMood(guest) === "lust",
      lewdness: this.lewdness,
      exposed: this.strippedPieces.length,
      night: this.nightIndex,
      pull: this.effects.pull.invite ?? 0,
      respected: this.persona.respect >= HIGH_RESPECT,
      open: this.tableOpen && this.canHostTable(guest),
    });
  }

  /** Whether this guest could have her on a table here and now: not drunk, not leaving, not the Baron, nothing else on. */
  private canHostTable(guest: Guest): boolean {
    if (this.playerBody !== "Female" || (this.drunk >= SLOPPY_DRUNK && !this.consentOff) || this.duel || this.fight) return false;
    return guest.mood !== "drunk" && guest.status !== "leaving" && !isBaron(this.roomGuest(guest));
  }

  /**
   * Her desire for adult play, 0 to 10, as the touch answers read it: Cock desire, less what her lewdness and
   * passives take off; or, horny and wet at once, ready whatever her Cock desire says.
   */
  adultDesire(): number {
    const own = Math.min(10, this.desireFor("invite") + lewdnessEase(this.lewdness) / 10);
    return horny(this.meters) && this.wet ? Math.max(own, desireNeeded(10)) : own;
  }

  /**
   * Consent off, and her state said yes: on the table at once, with everyone in the room who wants in, the room left
   * open, and every part of her she's warm enough for. It plays as the After Hours game, so Stop still ends it.
   * Returns whether it started.
   */
  autoAdultPlay(scene: InviteScene): boolean {
    const option = this.taproomOption(scene);
    if (!option.shown || option.blocked) return false;
    const areas = this.duelAreas().filter((a) => a.ready).map((a) => a.id);
    return this.startTaproom(scene, option.joiners.map((g) => g.id), areas, "plain", true);
  }

  /**
   * A roll from 0 to 1 for picking a line of the invitation's story, fixed by who and which night, so the words
   * vary from guest to guest without drawing on `random` (which decides everything else about the night).
   */
  /** How many log lines have been picked (loglines.ts): the log's own roll sequence. */
  private logRolls = 0;

  /** A roll for picking a log line: its own sequence, so it never draws on `random` (the seeded rolls stay as they were). */
  private logRoll(): number {
    this.logRolls++;
    const x = Math.sin(this.logRolls * 12.9898 + this.nightIndex * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  /** One line from a log pool (loglines.ts), its tokens filled. */
  private logLine(pool: readonly string[], tokens: Readonly<Record<string, string | number>> = {}): string {
    return fillLog(pickLog(pool, this.logRoll()), tokens);
  }

  private storyRoll(guestId: number, salt: number): number {
    const x = Math.sin(guestId * 12.9898 + salt * 78.233 + this.nightIndex * 37.719) * 43758.5453;
    return x - Math.floor(x);
  }

  /**
   * An invitation is told as a story (invitetalk.ts): first what they say to ask her, in their own kind's words,
   * then their reach, then the room going quiet to hear her answer, then her thought.
   */
  private tellInvitation(guest: Guest, lines: TalkLine[]): void {
    lines.unshift(this.guestSays(guest, storyLine(INVITE_ASKS[guest.kind], this.storyRoll(guest.id, 0))));
    lines.splice(2, 0, narrate(storyLine(INVITE_HUSH, this.storyRoll(guest.id, 1))));
    // Her first invitation: a beat of nerves, however ready she is (STORY.md 4b). Every answer stays the same.
    if (this.records.invitations === 0) lines.push(you(FIRST_INVITE_PAUSE));
  }

  /** Whether the game going on is on a table in the taproom (KP's Waitress Sex): the picture puts her on it. */
  get onTable(): boolean {
    return this.taproom !== null && this.duel !== null;
  }

  /** Someone in the room, as the taproom rules see them. */
  private roomGuest(g: Guest): RoomGuest {
    return { id: g.id, kind: g.kind, label: g.stats.label ?? g.kind, status: g.status, lust: g.lust, mood: g.mood, female: g.female };
  }

  /** Guests in the room who want to join, keenest first, all of them; she picks among them. */
  taproomJoiners(scene: InviteScene): RoomGuest[] {
    return willingJoiners(this.guests.map((g) => this.roomGuest(g)), scene.guestId);
  }

  /** What a guest who wants in says to ask: every one asks, and she chooses. */
  joinAsk(guestId: number): string {
    const guest = this.guests.find((g) => g.id === guestId);
    return guest ? `"${storyLine((guest.female ? JOIN_ASKS_WOMEN : JOIN_ASKS)[guest.kind], this.storyRoll(guestId, 3))}"` : "";
  }

  /**
   * Whether the table is an answer she can give (KP's Waitress Sex). `shown` is false when it isn't there at all: too
   * much to drink on either side (GAME_PATH.MD: too drunk blocks every yes), the Baron, or not her. `blocked` says why
   * it's there but not open: something else going on. With nobody else up for it, it's just the two of them, and the
   * room can still join in as it goes.
   */
  taproomOption(scene: InviteScene): { shown: boolean; blocked: string | null; joiners: RoomGuest[] } {
    const host = this.guests.find((g) => g.id === scene.guestId);
    const hidden = { shown: false, blocked: null, joiners: [] };
    // Too drunk shuts it, Consent on; Consent off (KP), dead drunk doesn't.
    if (this.playerBody !== "Female" || (this.drunk >= SLOPPY_DRUNK && !this.consentOff)) return hidden;
    if (!host || host.mood === "drunk" || host.status === "leaving" || isBaron(this.roomGuest(host))) return hidden;
    const joiners = this.taproomJoiners(scene);
    const blocked = this.duel || this.fight ? "not now" : null;
    return { shown: true, blocked, joiners };
  }

  /** The card's line: them with her on the table, and the room calling out if others want in. */
  inviteChoiceLine(scene: InviteScene): string {
    const option = this.taproomOption(scene);
    if (scene.wholeRoom && option.shown && !option.blocked) return storyLine(WHOLE_ROOM_LINES, this.storyRoll(scene.guestId, 4));
    const lines = option.joiners.length > 0 ? INVITE_CHOICE_ROOM : INVITE_CHOICE;
    return storyLine(lines, this.storyRoll(scene.guestId, 4));
  }

  /**
   * On the table (KP's Waitress Sex): the one who asked, and any she's picked from those who want in, in an After
   * Hours game (duel.ts) on her rules, with Stop always there. No stake: they pay in tips if it's played to the end.
   * Just the two of them is fine; left open, the room joins in as it goes. As it starts, the rest of the room takes
   * it how they will: most stay and cheer, the cold and the respectable get up and go. Returns whether it started.
   */
  startTaproom(scene: InviteScene, joinIds: readonly number[], areas: readonly DuelArea[], play: RolePlay = "plain", open = false): boolean {
    const option = this.taproomOption(scene);
    if (!option.shown || option.blocked) return false;
    // Every one of them wants in, and she's picked every one: nobody is pulled in.
    const willing = new Set(option.joiners.map((g) => g.id));
    const picked = [...new Set(joinIds)];
    if (picked.some((id) => !willing.has(id))) return false;
    const ready = new Set(this.duelAreas().filter((a) => a.ready).map((a) => a.id));
    if (areas.some((a) => !ready.has(a))) return false;
    if (!this.rolePlays().some((p) => p.id === play && p.ready)) return false;
    const partners = [scene.guestId, ...picked].map((id) => this.guests.find((g) => g.id === id)!);
    const inGame = new Set(partners.map((g) => g.id));
    let cheered = 0;
    const left: Guest[] = [];
    for (const g of this.guests) {
      if (inGame.has(g.id) || (g.status !== "waiting" && g.status !== "eating")) continue;
      if (roomReaction(this.roomGuest(g)) === "leave") {
        this.sendOff(g);
        left.push(g);
      } else cheered++;
    }
    this.taproom = { hostId: scene.guestId, partnerIds: [...inGame], open, moves: 0, givenIn: 0, cheered, left: left.length, localsLeft: left.filter((g) => isLocal(g.kind)).length };
    const r = this.records;
    r.taproomScenes++;
    r.taproomPartners += partners.length;
    // It's her adult play, for her records and her passives, as upstairs used to be.
    r.invitations++;
    if (!r.upstairsKinds.includes(scene.guestKind)) r.upstairsKinds.push(scene.guestKind);
    // It counts as tonight's game: nobody lingers at bedtime to ask for another.
    this.duelTonight = true;
    this.gainXp("exhibition", 5);
    this.gainXp("charm", 3);
    const setups = partners.map((g) => ({ kind: g.kind, female: g.female, stats: g.stats }));
    const duel = new Duel(partners[0].kind, new Set(areas), 0, this.duelistStats(), this.random, setups, play);
    duel.note(storyLine(TAPROOM_START, this.storyRoll(scene.guestId, 8)));
    duel.note(`You: ${this.herBar("table")}`);
    this.duel = duel;
    const room = [cheered > 0 ? `${cheered} stay to watch` : "", left.length > 0 ? `${left.length} get up and leave` : ""].filter(Boolean).join("; ");
    if (open) duel.note("You leave the room open: anyone watching who wants in can join the line.");
    const who = partners.length === 1 ? `the ${(partners[0].stats.label ?? partners[0].kind).toLowerCase()}` : `${partners.length} of them`;
    this.say(`${this.logLine(TABLE_START_LOG[crowdOf(setups)], { who })}${room ? ` ${room[0].toUpperCase()}${room.slice(1)}.` : ""}`);
    return true;
  }

  /**
   * A move in the taproom game: the room watches. Every few of her moves, and each time one of them gives in, the
   * watchers get more worked up; if she left the room open, those who want in now join the end of the line. Nobody
   * drunk, angry or scared joins (wantsToJoin), and her Stop still ends it for everyone.
   */
  private taproomTurn(duel: Duel): void {
    const game = this.taproom;
    if (!game) return;
    game.moves++;
    const givenIn = duel.partners.filter((p) => p.done).length;
    const stir = (game.moves % STIR_EVERY === 0 ? STIR_PER_MOVES : 0) + (givenIn - game.givenIn) * STIR_PER_GIVE_IN;
    game.givenIn = givenIn;
    if (stir <= 0) return;
    for (const g of this.guests) {
      if (game.partnerIds.includes(g.id) || (g.status !== "waiting" && g.status !== "eating")) continue;
      g.lust = Math.min(10, g.lust + stir);
      if (!game.open || !wantsToJoin(this.roomGuest(g))) continue;
      game.partnerIds.push(g.id);
      this.records.taproomPartners++;
      duel.join({ kind: g.kind, female: g.female, stats: g.stats });
      duel.note(`The ${(g.stats.label ?? g.kind).toLowerCase()} can't just watch any more: ${this.joinAsk(g.id)} They join the line.`);
    }
  }

  /**
   * The taproom game is over (called from `finishDuel`, which has done the game's own bookkeeping). Played to
   * the end, the pass talks about it: fame, a hit to respect, a heat for the Baron's ears, village trust if the
   * village's own walked out, and lust stirred in everyone who watched. Those who were in it are spent and
   * besotted, and tip her. Stopped, they step back at once and go back to their seats, no hard feelings.
   * Either way, the night goes on.
   */
  private finishTaproom(duel: Duel): { text: string; line: string; gold: number } {
    const game = this.taproom!;
    this.taproom = null;
    this.records.taproomMost = Math.max(this.records.taproomMost, game.partnerIds.length);
    const outcome = duel.outcome!;
    const played = outcome !== "stopped";
    // What she did on the table counts toward her records (each act once), and her skill at it.
    for (const [move, n] of Object.entries(duel.used)) {
      const act = ACT_OF_DUEL_MOVE[move];
      if (!act || !n) continue;
      this.records.acts[act] = (this.records.acts[act] ?? 0) + 1;
      this.gainXp(ACT_SKILL_OF[act], UPSTAIRS_XP);
    }
    const result = taproomResult(outcome, game.partnerIds.length, game.localsLeft);
    this.shift({ fame: result.fame, respect: result.respect, flirt: result.flirt });
    this.adjust(0, result.trust, result.heat + (played ? this.effects.upstairsHeat : 0));
    let gold = 0;
    for (const g of this.guests) {
      if (g.status === "leaving") continue;
      if (game.partnerIds.includes(g.id)) {
        if (played) {
          g.mood = "idolize";
          g.lust = 0;
          gold += Math.round((TAPROOM_TIP + g.stats.tip) * (1 + this.effects.upstairsGold));
        } else g.mood = "calm";
      } else g.lust = Math.min(10, g.lust + result.watcherLust);
    }
    this.adjust(gold, 0, 0);
    this.earned += gold;
    const line = storyLine(TAPROOM_END[outcome], this.storyRoll(game.hostId, 9));
    if (played) this.morningAfter.push(storyLine(TAPROOM_MORNING, this.storyRoll(game.hostId, 10)));
    const heat = result.heat ? ` +${result.heat} heat: the keep will hear of it.` : "";
    const trust = result.trust ? ` ${result.trust} trust: the village heard who walked out.` : "";
    const text = played
      ? this.logLine(TABLE_END_LOG[crowdOf(duel.partners)], { gold, fame: result.fame, respect: result.respect, heat, trust })
      : this.logLine(TABLE_STOP_LOG);
    return { text, line, gold };
  }

  // ---------- After hours ----------

  /**
   * After closing, a guest she warmed to tonight might linger and ask for an after-hours game: only if she's let
   * someone sober touch her tonight, she's lewd enough to be asked, and she hasn't played tonight already.
   */
  duelOffer(): GuestKind | null {
    if (this.duel) return null;
    // The winner of a brawl she lost asks at once, whatever the hour.
    if (this.brawlOffer) return this.brawlOffer.kind;
    if (this.phase !== "bedtime" || this.playerBody !== "Female" || this.duelTonight) return null;
    if (this.lewdness < INVITES_AT && !this.passives.has("upstairsCurious")) return null;
    return this.duelPartner()?.kind ?? null;
  }

  /** Who's asking at bedtime: someone she let touch her tonight, or else someone she talked out of a brawl. */
  private duelPartner(): { kind: GuestKind; stats: RoleStats } | null {
    return this.admirers[this.admirers.length - 1] ?? this.peacemade[this.peacemade.length - 1] ?? null;
  }

  /** Why tonight's offer is being made: "brawl" after a loss, "talked" by someone she talked down, else "admirer". */
  get duelOfferFrom(): "brawl" | "talked" | "admirer" | "revel" | null {
    if (!this.duelOffer()) return null;
    if (this.brawlOffer) return this.revelScene ? "revel" : "brawl";
    return this.admirers.length === 0 && this.peacemade.length > 0 ? "talked" : "admirer";
  }

  /** Why she can't say yes tonight, if she can't: too much to drink, on her side or theirs. */
  get duelBlocked(): string | null {
    if (this.drunk >= SLOPPY_DRUNK) return "You've had too much to drink to play tonight.";
    if (this.brawlOffer?.drunk) return "They're too drunk to know what they're doing.";
    return null;
  }

  /**
   * She says no to the brawl winner. That's the end of it: they go, and so does the night, with nothing lost
   * past what the fight already cost.
   */
  declineBrawlOffer(): void {
    if (!this.brawlOffer) return;
    this.brawlOffer = null;
    this.revelScene = false;
    this.say("You send them off. Nothing more comes of it.");
    this.closeEarly();
  }

  /**
   * After a brawl she lost, the night is over: everyone goes, nobody else comes in, and it's straight to bed (no
   * last call). `sleep` works from here.
   */
  private closeEarly(): void {
    if (this.phase !== "service") return;
    for (const guest of this.guests) if (guest.status !== "leaving") this.sendOff(guest);
    this.trouble = null;
    this.talkingTo = null;
    this.tipChat = null;
    this.touchChat = null;
    this.grabChat = null;
    this.showChat = null;
    this.joinNext = null;
    this.nextArrival = this.arrivals.length;
    this.phase = "bedtime";
    this.eased = false;
    this.say("The room empties out early. You bar the door and call it a night.");
  }

  /** Each part of her she could put in play, and whether she's warm enough there tonight. */
  duelAreas(): { id: DuelArea; name: string; ready: boolean; have: number; need: number; meter: string }[] {
    return DUEL_AREAS.map((a) => ({ id: a.id, name: a.name, ready: this.meters[a.meter] >= a.need, have: Math.floor(this.meters[a.meter]), need: a.need, meter: METER_NAMES[a.meter] }));
  }

  /** The stakes she can choose from: what she can afford. */
  duelStakes(): number[] {
    return DUEL_STAKES.filter((n) => n <= this.gold);
  }

  /**
   * Where the game after a lost brawl can be played (`place` in startDuel). Right where she fell, with the room
   * still watching (never her first time: that's behind a closed door); upstairs in her room; or out back in the
   * yard, half private.
   */
  brawlPlaces(): { id: BrawlPlace; label: string; blocked: string | null }[] {
    const r = this.records;
    const first = r.invitations + r.taproomScenes + r.duelsWon + r.duelsLost === 0;
    // Out on a quest there's no room upstairs: the road where she fell, or somewhere off it.
    if (this.questRun) {
      return [
        { id: "here", label: "Right here on the road, where you fell", blocked: first ? "your first time shouldn't be in the dirt" : null },
        { id: "yard", label: "Off the road, out of sight", blocked: null },
      ];
    }
    return [
      { id: "here", label: "Right here, where you fell (the room watches)", blocked: first ? "your first time should be behind a closed door" : null },
      { id: "upstairs", label: "Upstairs, in your room", blocked: null },
      { id: "yard", label: "Out back, in the yard", blocked: null },
    ];
  }

  /**
   * She says yes, on her rules: only parts she's warm enough for, and a stake she can pay. After a lost brawl it's
   * where she chooses (`place`: right where she fell, upstairs, or out back), with the one who won and whichever of
   * their companions she's said yes to (`crewIds`, each of whom asked); anyone else isn't part of it.
   */
  startDuel(areas: readonly DuelArea[], stake: number, scene: RolePlay = "plain", crewIds: readonly number[] = [], place: BrawlPlace = "upstairs"): boolean {
    const kind = this.duelOffer();
    if (!kind || this.duelBlocked) return false;
    if (this.brawlOffer && this.brawlPlaces().find((p) => p.id === place)?.blocked) return false;
    const ready = new Set(this.duelAreas().filter((a) => a.ready).map((a) => a.id));
    if (areas.some((a) => !ready.has(a)) || stake < 0 || stake > this.gold) return false;
    if (!this.rolePlays().some((p) => p.id === scene && p.ready)) return false;
    const offer = this.brawlOffer;
    const picked = new Set(crewIds);
    const revel = this.revelScene;
    if (picked.size > 0 && (!offer || [...picked].some((id) => !offer.crew.some((c) => c.id === id)))) return false;
    this.duelTonight = true;
    const partners = offer
      ? [{ kind, female: offer.female, stats: offer.stats }, ...offer.crew.filter((c) => picked.has(c.id)).map((c) => ({ kind: c.kind, female: c.female, stats: c.stats }))]
      : [{ kind, female: false, stats: this.duelPartner()?.stats }];
    this.brawlDuel = offer !== null;
    this.brawlOffer = null;
    this.revelScene = false;
    // A lost brawl (not the revel's chosen scene) is a defeat: its slots decide what's in play and how many at once.
    const defeat = offer && !revel ? defeatPlay(defeatFor({ place, kind, heat: this.heat })) : null;
    this.duel = new Duel(kind, new Set(areas), stake, this.duelistStats(), this.random, partners, scene, false, defeat);
    if (offer) {
      this.brawlPlace = place;
      const many = partners.length > 1;
      const words = { here: many ? BRAWL_HERE_CREW : BRAWL_HERE_ONE, upstairs: many ? BRAWL_ROOM_CREW : BRAWL_ROOM_ONE, yard: many ? BRAWL_YARD_CREW : BRAWL_YARD_ONE }[place];
      this.duel.note(storyLine(words, this.storyRoll(this.nightIndex, 11)).replaceAll("{n}", String(partners.length)));
      // The revel's scene is chosen, not lost: no defeat, but it counts toward her most at a revel.
      if (revel) this.records.revelPartnersMost = Math.max(this.records.revelPartnersMost, partners.length);
      else this.beginDefeat(place, kind, partners.length, false, crowdOf(partners));
      const them = many ? `${partners.length} of them` : "them";
      this.say(
        place === "here"
          ? this.logLine(BRAWL_HERE_LOG[crowdOf(partners)], { them })
          : place === "yard"
            ? this.logLine(BRAWL_YARD_LOG, { them })
            : this.logLine(BRAWL_ROOM_LOG, { them }),
      );
    }
    return true;
  }

  /**
   * Consent off, a brawl she lost (Karryn's Prison's defeat): it starts at once, right where she fell, with the one
   * who won and all their company, every part of her she's warm enough for (a kiss always), no stake and no Stop. It
   * ends when they're all spent or she gives in, and the night with it.
   */
  private forceBrawlDuel(): void {
    const offer = this.brawlOffer;
    if (!offer) return;
    const partners = [{ kind: offer.kind, female: offer.female, stats: offer.stats }, ...offer.crew.map((c) => ({ kind: c.kind, female: c.female, stats: c.stats }))];
    this.brawlOffer = null;
    const play = defeatPlay(defeatFor({ place: "here", kind: offer.kind, heat: this.heat }));
    this.forceDuel(partners, "here", partners.length > 1 ? FORCED_HERE_CREW : FORCED_HERE_ONE, play);
    this.beginDefeat("here", offer.kind, partners.length, false, crowdOf(partners));
    this.say(this.logLine(FORCED_FLOOR_LOG, { they: partners.length > 1 ? `${partners.length} of them` : "they" }));
  }

  /**
   * KP's defeat (Consent off): a game that just happens, with every part of her she's warm enough for (a kiss
   * always), no stake and no Stop; it ends when they're all spent or she gives in, and the night with it.
   */
  private forceDuel(partners: readonly { kind: GuestKind; female: boolean; stats?: RoleStats }[], place: BrawlPlace, lines: readonly string[], defeat: DuelDefeat | null = null): void {
    const areas = this.duelAreas().filter((a) => a.ready).map((a) => a.id);
    this.duelTonight = true;
    this.brawlDuel = true;
    this.brawlPlace = place;
    this.duel = new Duel(partners[0].kind, new Set(areas), 0, this.duelistStats(), this.random, partners, "plain", true, defeat);
    this.duel.note(storyLine(lines, this.storyRoll(this.nightIndex, 12)).replaceAll("{n}", String(partners.length)));
  }

  /** The brawl winner's companions, each asking to come up too (empty with no lost brawl to answer). */
  get brawlCrewAsking(): readonly BrawlCrewMate[] {
    return this.brawlOffer?.crew ?? [];
  }

  /** The role-plays she could choose, and whether she's ready for each: the bolder ones need a passive first. */
  rolePlays(): { id: RolePlay; name: string; about: string; ready: boolean; needs: string | null }[] {
    return ROLE_PLAYS.map((p) => ({
      id: p.id,
      name: p.name,
      about: p.about,
      ready: !p.needs || this.passives.has(p.needs),
      needs: p.needs ? (PASSIVE_BY_ID.get(p.needs)?.name ?? p.needs) : null,
    }));
  }

  /** Her side of a duel: her levels, and what her passives add. */
  private duelistStats(): DuelistStats {
    const e = this.effects;
    return {
      level: (id) => this.level(id),
      sens: e.sens,
      power: e.duelPower,
      resist: e.duelResist,
      stamina: e.duelStamina,
      hold: e.duelHold,
      edge: e.duelEdge,
      undress: e.duelUndress,
      will: this.willpower,
      maxWill: this.maxWillpower,
    };
  }

  /**
   * For testing (the P key, in development only): starts an after-hours game at once, any time, with whoever and
   * whatever's in play, and both sides starting where the test says. No checks, and nothing is counted or paid.
   */
  startTestDuel(test: DuelTest): void {
    const partners = test.partners.length > 0 ? test.partners : [{ kind: "fugitive" as GuestKind, female: false, pleasure: 0, stamina: null }];
    const duel = new Duel(partners[0].kind, new Set(test.areas), test.stake, this.duelistStats(), this.random, partners, test.scene);
    duel.partners.forEach((p, i) => applyTestPartner(p, partners[i]));
    const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));
    duel.pleasure = clamp(test.pleasure, 99);
    duel.stamina = test.stamina === null ? duel.maxStamina : clamp(test.stamina, duel.maxStamina);
    duel.undressed = clamp(test.undressed, 2);
    duel.note("(Test fight: nothing here counts.)");
    this.duel = duel;
    this.testDuel = true;
  }

  /** Whether the duel going on is a test one. */
  get testing(): boolean {
    return this.testDuel && this.duel !== null;
  }

  /** She makes a move; when it's over, it's settled. */
  duelMove(move: DuelMove, target?: number): void {
    const duel = this.duel;
    if (!duel) return;
    duel.act(move, target);
    if (this.taproom && !duel.outcome) this.taproomTurn(duel);
    if (duel.outcome) this.finishDuel(duel);
  }

  private finishDuel(duel: Duel): void {
    if (this.testDuel) {
      this.testDuel = false;
      const how = duel.outcome === "won" ? "You won" : duel.outcome === "lost" ? "You lost" : "You called it off";
      this.endedTest = duel;
      this.lastDuel = { outcome: duel.outcome!, text: `${how}. (Test fight: nothing counted.)`, line: "", gold: 0, test: true };
      this.duel = null;
      return;
    }
    this.settleWill(duel.will);
    const r = this.records;
    for (const [id, n] of Object.entries(duel.xp)) this.gainXp(id as StatId | SkillId, n ?? 0);
    for (const [move, n] of Object.entries(duel.used)) r.duelMoves[move as DuelMove] = (r.duelMoves[move as DuelMove] ?? 0) + (n ?? 0);
    r.heldBack += duel.heldBack;
    r.undressed += duel.undressed;
    r.climaxes += duel.climaxes;
    this.cameTonight(duel.climaxes);
    // An after-hours game wears her out too (7k), more with more of them.
    this.tire(duelFatigue(duel.partners.length, duel.climaxes));
    // Her willpower gave out: lost, whether it played out or she stopped it after. She carries it a night or two.
    if (duel.defeated) this.addDebuff("overwhelmed");
    this.undressedTonight = Math.max(this.undressedTonight, duel.undressed);
    this.addCum(duel.cum, duel.loads);
    for (const [meter, n] of Object.entries(duel.meterGains)) this.raise(meter as Meter, n ?? 0);
    let text: string;
    let line: string;
    let change = 0;
    if (duel.outcome === "won") {
      r.duelsWon++;
      if (duel.wonOnEdge) r.edgeWins++;
      if (duel.heldBack === 0) r.boldWins++;
      const gold = Math.round(duel.stake * (1 + this.effects.duelGold));
      change = gold;
      this.adjust(gold, 0, 0);
      this.earned += gold;
      this.shift({ fame: 2, flirt: 1 });
      text = this.logLine(GAME_WON_LOG, { gold });
      line = this.logLine(GAME_WON_LINE);
    } else if (duel.outcome === "lost") {
      r.duelsLost++;
      r.overwhelmed++;
      const paid = Math.min(this.gold, duel.stake);
      change = -paid;
      this.adjust(-paid, 0, 0);
      this.shift({ fame: 1, flirt: 1 });
      text = this.logLine(GAME_LOST_LOG, { paid });
      line = this.logLine(GAME_LOST_LINE);
    } else {
      r.duelsStopped++;
      text = this.logLine(GAME_STOPPED_LOG);
      line = "";
    }
    // Played to the end, she's spent, and sleeps easy.
    if (duel.outcome !== "stopped") {
      Object.assign(this.meters, emptyMeters());
      this.pleasure = 0;
    }
    const ml = Object.values(duel.cum).reduce((n, v) => n + (v ?? 0), 0);
    if (ml > 0) text += ` ${duel.loads === 1 ? "One load" : `${duel.loads} loads`}, ${ml} ml of cum.`;
    // An invitation answered in the taproom: its own words, and what the room makes of it (taproom.ts).
    const taproom = this.taproom ? this.finishTaproom(duel) : null;
    if (taproom) ({ text, line, gold: change } = taproom);
    const brawl = this.brawlDuel;
    const place = this.brawlPlace;
    const playedOut = duel.outcome !== "stopped";
    // With the winner's whole company: the line for all of them, wherever it was.
    if (brawl && duel.partners.length > 1 && playedOut) {
      const away = { here: "the room roars, and they stagger back to the bar", upstairs: "they go down the stairs quieter than they came up", yard: "they slip back in through the back door one at a time" }[place];
      line = duel.outcome === "won"
        ? `One by one, all ${duel.partners.length} of them give in. You win, and ${away}.`
        : `It's too much, all ${duel.partners.length} of them, and you go first. They see themselves out, and you lie where you are a long while.`;
    }
    if (brawl && playedOut) {
      if (place === "here") {
        // The whole room saw it: like the taproom, the pass talks (taproom.ts).
        const result = taproomResult(duel.outcome!, duel.partners.length, 0);
        this.shift({ fame: result.fame, respect: result.respect, flirt: result.flirt });
        this.adjust(0, 0, result.heat);
        text += ` The whole room saw it: fame +${result.fame}, respect ${result.respect}${result.heat ? `, +${result.heat} heat` : ""}.`;
      } else if (place === "yard") {
        // Someone in the lane saw something.
        this.shift({ fame: 1 });
        text += " Someone in the lane saw something: fame +1.";
      }
    }
    // Played out, every partner goes home satisfied and talks the place up (fans at dawn): delighted if they gave
    // in first, happy if she did. Called off, nobody's anything. Whoever robbed the till after a brawl isn't a fan.
    if (!brawl && duel.outcome !== "stopped") {
      this.fansTonight += duel.partners.length * (duel.outcome === "won" ? FANS_DELIGHTED : FANS_HAPPY);
      this.fanTags.lantern += duel.partners.length * (duel.outcome === "won" ? FANS_DELIGHTED : FANS_HAPPY);
    }
    this.lastDuel = { outcome: duel.outcome!, text, line, gold: change, brawl };
    this.say(text);
    this.duel = null;
    if (taproom) this.lastDuel.taproom = true;
    // The game after a lost brawl: played out or called off, the night ends with it.
    if (brawl) {
      this.brawlDuel = false;
      this.brawlPlace = "upstairs";
      this.closeEarly();
    }
  }

  /** How the last after-hours game ended, once. */
  takeDuelResult(): { outcome: DuelOutcome; text: string; line: string; gold: number; test?: boolean; brawl?: boolean; taproom?: boolean } | null {
    const result = this.lastDuel;
    this.lastDuel = null;
    this.endedTest = null;
    return result;
  }

  /** The nerve her passives and her name give every guest: the lewder she's known to be, the bolder they get. */
  private get nerveBonus(): number {
    const lewd = this.lewdness;
    // Karryn's bar: a well-known tavern draws a bolder crowd, and the room can tell when she's worked up (barwork.ts).
    const her = this.playerBody === "Female";
    const room = roomNerve({ fame: this.persona.fame, horny: her && horny(this.meters), wet: her && this.wet });
    return this.effects.nerve + (lewd >= 60 ? 2 : lewd >= 30 ? 1 : 0) + mindBonus(this.level("mind")).nerve + room;
  }

  /** The touch just answered, once: the game plays it out in a comic panel. */
  takeTouchMoment(): TouchMoment | null {
    const moment = this.touchMoment;
    this.touchMoment = null;
    return moment;
  }

  /**
   * Whether the guest you've just served reaches for you, and if so, for what. Their nerve decides how bold
   * they'll be; your desire decides what you can let them do. Only the innkeeper sister is reached for, for now.
   */
  /**
   * `brawl`: a foe reaching mid-fight. The fight has already decided they reach, so there's no roll; it's never a
   * garment or an invitation upstairs, and it's always asked (the Eager guests setting doesn't cover a fight).
   * Returns whether there's a touch to answer.
   */
  /**
   * `held`: a guest who has hold of her at the table (maybeGrab). They reach for sure, garments first, and their grip
   * adds to their push in the Consent-off check; `prelude` is how the grab went, said before the reach.
   */
  private maybeReach(
    guest: Guest,
    brawl = false,
    held: { prelude: TalkLine[] } | null = null,
    join: { prelude: TalkLine[]; joined: number[] } | null = null,
    lastClear: { prelude: TalkLine[] } | null = null,
    /** A foe going for her clothes mid-brawl (7l): only the scuffle's strip tries. */
    brawlStrip = false,
  ): boolean {
    if (this.playerBody !== "Female" || this.inConversation) return false;
    const guestNerve = this.nerveOf(guest);
    // A tablemate joining in, or a guest asking on her last clear drink, has already decided to (barwork.ts): no roll.
    if (!brawl && !held && !join && !lastClear && this.random() >= reachChance(guestNerve) * Math.max(0, 1 + this.effects.reach)) return false;
    const piece = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped]?.label ?? null;
    // Mid-brawl, their hands go bolder, and for the part of her their type likes.
    const pull = { ...this.effects.pull };
    const prefer = brawl ? BRAWL_PREFER_PULL : PREFER_PULL;
    for (const region of REGIONS_OF_AREA[guest.stats.prefers] ?? []) pull[region] = (pull[region] ?? 0) + prefer;
    // Karryn-style: her breasts and behind only as far as her desire and Slut Level open them (touch.ts). Not in a
    // brawl, which goes by its own rules.
    const open = brawl
      ? undefined
      : Object.fromEntries(LEWD_REGIONS.map((region) => [region, openness(this.desireFor(region), this.slutLevel)]));
    // The first reach of the whole run is always one of the gentlest (STORY.md 4b): she's new to all of it.
    const firstEver = !brawl && !held && !join && !lastClear && this.lewdness === 0 && this.records.pulled + this.records.slapped + this.timesLet === 0;
    const reachNerve = brawl ? Math.min(10, guestNerve + BRAWL_BOLDER) : firstEver ? Math.min(FIRST_REACH_MAX, guestNerve) : guestNerve;
    // Adult play (adultplay.ts), Karryn-style: once her stack is full, an aroused guest might go for it, by a chance
    // that grows with how worked up they both are. Never in a brawl, never with hold of her (they're after her
    // clothes), never the very first reach of the run.
    const askAdult =
      !brawl && !held && !firstEver && aroused(guest.lust, guest.mood === "drunk") && this.adultRandom !== null && this.adultRandom() < this.adultChance(guest);
    // Her last clear drink (barwork.ts): they ask for adult play, open or not, while she can still answer; only if
    // they could have her on the table.
    if (lastClear && (!this.canHostTable(guest) || !adultTouch(guest.kind, this.random))) return false;
    const touch =
      (lastClear ? adultTouch(guest.kind, this.adultRandom ?? this.random) : null) ??
      (askAdult && this.adultRandom ? adultTouch(guest.kind, this.adultRandom) : null) ??
      pickTouch(guest.kind, reachNerve, this.random, {
        canStrip: (!brawl || brawlStrip) && piece !== null,
        stripOnly: brawlStrip,
        seen: this.touchSeen,
        invites: false,
        pull,
        brawl,
        held: held !== null,
        open,
      });
    if (!touch) return false;
    this.touchSeen.add(touch.id);
    const adult = touch.region === "invite";

    const sloppy = this.drunk >= SLOPPY_DRUNK;
    const guestSloppy = guest.mood === "drunk";
    const desire = adult ? this.adultDesire() : this.desireFor(touch.region);
    const leanMargin = Math.max(0, LEAN_MARGIN - this.effects.leanMargin / 10);
    const fill = (text: string) => fillPiece(text, piece);
    // How far in they go, Karryn-style: over her clothes, inside them, or bare skin, as her desire and Slut Level
    // open it up (touch.ts). Picked by who and when, so it doesn't draw on `random`.
    const layer: TouchLayer =
      brawl || held || touch.strip
        ? "over"
        : pickLayer(
            layersOpen({ region: touch.region, level: touch.level, desire, slutLevel: this.slutLevel, exposed: this.strippedPieces.length }),
            this.storyRoll(guest.id, 20 + this.touchesTonight.reached),
          );
    const layerLine = layer === "over" ? "" : (LAYER_LINES[touch.region]?.[layer] ?? "");
    const reachText = layerLine ? `${fill(touch.reach)} ${layerLine}` : fill(touch.reach);
    const tempted = thoughtTier(touch, desire, leanMargin);
    let thought = fill(touch.thoughts[tempted]);
    // Her stage layers on the written thought (STORY.md 4b): never replaces it.
    thought = flavorLine(thought, this.arcStage, touch.region, true);
    if (sloppy) thought = TOO_DRUNK_TO_ALLOW;
    else if (guestSloppy) thought = GUEST_TOO_DRUNK;
    // Too drunk on either side, and it can't happen anyway: saying no takes nothing out of her.
    const tier = sloppy || guestSloppy ? 0 : tempted;
    const lines: TalkLine[] = [{ ...narrate(reachText), guestId: guest.id }, you(thought)];
    // What they say going for her, in their type's voice (barvoices.ts).
    const part = REACH_PART[touch.region];
    if (part) lines.unshift(this.barQuip(guest, (v) => v.reach[part]));
    if (firstEver && !sloppy && !guestSloppy) lines.push(you(FIRST_REACH_THOUGHT));
    if (tier > 0 && this.willpower < this.refuseWill(tier, touch.level)) lines.push(narrate(WORN_THIN));
    if (touch.region === "invite") this.tellInvitation(guest, lines);
    const answers = touchAnswers(touch, { desire, sloppy, guestSloppy, leanMargin });
    // An impulsive guest, on a touch she could say yes to anyway: covered by the player's setting, or asked about.
    const s = this.touchSettings;
    // The same Consent switch covers a brawl: a foe who reaches mid-fight came in worked up, so counts as impulsive.
    const eager = brawl || impulsive(feltMood(guest), guestNerve);
    // Only ever a touch within their own nerve (GAME_PATH.MD), not the bolder reach a brawl stirs up.
    const covered = s.autoTouch && eager && touch.level <= guestNerve && autoTouchFits(s, touch, answers);
    // Adult play with Consent off (Karryn's Prison): her state decides, not a push against her hold. Ready for it
    // (a yes is there: her desire's high enough) and them aroused, and it happens; dead drunk, it happens whether
    // she's ready or not (KP's waitress sex).
    const adultAuto = adult && s.autoTouch && s.agreed && (answers.includes("allow") || sloppy) && aroused(guest.lust, guestSloppy);
    // Consent off, mid-brawl (KP): their hands just land. Struggling free in a scene is still hers.
    const forced = brawl && s.autoTouch && s.agreed;
    // Consent off: weigh them against her. Worked out every time, so the dev panel can show it either way.
    const facts = { ...this.impulseFacts(guest, guestNerve, touch), held: held !== null };
    // Further in is bolder: her hold is that much the stronger for it.
    facts.level += LAYER_BONUS[layer].bold;
    const check = impulseCheck(facts);
    this.lastImpulse = {
      guest: guest.stats.label ?? guest.kind,
      kind: guest.kind,
      prefers: guest.stats.prefers,
      touch: touch.id,
      region: touch.region,
      brawl,
      eager,
      covered: adult ? adultAuto : covered,
      consentOff: s.autoTouch && s.agreed,
      facts,
      check,
      landed: false,
    };
    const chat: TouchChat = {
      guestId: guest.id,
      touch,
      lines,
      answers,
      answered: false,
      answer: null,
      tier,
      reply: [],
      offerAuto: covered && !s.agreed,
      impulse: false,
      brawl,
      layer,
      joined: [...(join?.joined ?? []), guest.id],
      sibling: brawl ? undefined : (this.lastServer ?? undefined),
      wholeRoom: lastClear !== null || undefined,
    };
    this.touchChat = chat;
    // Consent off, and they push past her hold: it lands without the question, as a yes she gave in advance.
    // If her hold stands, she's asked like any other time.
    const who = (guest.stats.label ?? guest.kind).toLowerCase();
    const talk = KINK_TALK[this.kink];
    if (adult ? adultAuto : forced || (covered && s.agreed && check.lands)) {
      // Adult play keeps what they said to ask; a touch is just the reach.
      chat.lines = [...(adult ? lines.slice(0, 1) : []), { ...narrate(reachText), guestId: guest.id }];
      chat.impulse = true;
      this.lastImpulse.landed = true;
      // Her sub side: giving in counts toward masochism, and her talk follows her kink from there.
      this.records.subWins++;
      this.answerTouch(chat, "allow");
      // Where and what are matched to her state when the card plays (autoAdultPlay).
      if (adult && this.adultScene?.kind === "table") this.adultScene.auto = true;
      // The guest crows about it, then her sub talk: she gives in, in her own voice. Both in the log too, and both
      // in the style of her kink (kinktalk.ts).
      const crow = oneOf(talk.guestWin, this.random()).replaceAll("{guest}", who);
      const sub = oneOf(talk.sub, this.random()).replaceAll("{guest}", who);
      chat.reply.unshift(narrate(oneOf(IMPULSE_LINES, this.random())), this.guestSays(guest, crow), you(sub));
      const why = adult ? "(her state: ready, and they're aroused)" : `(push ${check.push} vs hold ${check.hold})`;
      this.say(`${this.nameOf(guest)}: "${crow}" You: ${sub} ${why}`);
    } else if (!adult && covered && s.agreed) {
      // Dom talk: consent off, but their push fell short of her hold. She mocks them for trying, they're left
      // sheepish, and they have to ask after all. Both in the log too. Her dom side: it counts toward sadism.
      this.records.domWins++;
      const mock = oneOf(talk.dom, this.random()).replaceAll("{guest}", who);
      const sulk = oneOf(talk.guestFail, this.random()).replaceAll("{guest}", who);
      chat.lines.splice(1, 0, narrate(mock), this.guestSays(guest, sulk));
      this.say(`${mock} ${this.nameOf(guest)}: "${sulk}" (push ${check.push} vs hold ${check.hold})`);
    }
    // How the grab went comes first; or, a tablemate joining in, how they came to.
    if (held) chat.lines.unshift(...held.prelude);
    if (join) chat.lines.unshift(...join.prelude);
    if (lastClear) chat.lines.unshift(...lastClear.prelude);
    return true;
  }

  /** How bold a guest is right now: their type and mood, how she's treated them, and what she's known for. */
  private nerveOf(guest: Guest): number {
    const history = this.touchHistory.get(guest.id) ?? { allowed: 0, slapped: false };
    return nerve({
      kind: guest.kind,
      stats: guest.stats,
      lust: guest.lust,
      mood: feltMood(guest),
      respect: this.persona.respect,
      lowRespect: LOW_RESPECT,
      highRespect: HIGH_RESPECT,
      ...history,
      // A regular walks in bolder for what she's let them before, and cooler after a slap (regulars.ts).
      bonus: this.nerveBonus + this.regularNerveOf(guest),
      slapStops: this.effects.slapStops,
    });
  }

  /**
   * Whether the guest she's just served takes hold of her as she sets it down (grab.ts). Consent on, she answers it
   * (twist free, slap, or let them hold her); Consent off, it just happens, and they go straight for her clothes,
   * through the push-vs-hold check. Returns whether they grabbed.
   */
  private maybeGrab(guest: Guest, when: "order" | "serve" = "serve"): boolean {
    if (this.playerBody !== "Female" || this.inConversation) return false;
    const mood = feltMood(guest);
    const loose = mood === "drunk" || mood === "lust";
    if (!this.grabRandom || this.grabRandom() >= grabChance(guest.kind, this.nerveOf(guest), loose, this.effects.reach + this.effects.grab)) {
      return false;
    }
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const moves = when === "order" ? GRAB_AT_ORDER : GRAB_MOVES;
    const grab: TalkLine = { ...narrate(pick(moves).replaceAll("{item}", guest.order)), guestId: guest.id };
    const said = this.guestSays(guest, pick(GRAB_SAYS[guest.kind]));
    this.records.grabbed++;
    this.say(this.logLine(GRAB_LOG, { guest: this.nameOf(guest).toLowerCase(), when: when === "order" ? "take their order" : "serve them" }));
    const s = this.touchSettings;
    if (s.autoTouch && s.agreed) {
      // Consent off: caught before she can answer. What they go on to try is weighed, their grip on their side.
      const prelude = [grab, said, narrate(pick(GRAB_CAUGHT)), you(pick(GRAB_CAUGHT_THOUGHTS))];
      if (!this.maybeReach(guest, false, { prelude })) {
        this.grabChat = { guestId: guest.id, lines: prelude, answered: true, reply: [narrate(pick(GRAB_LETS_GO))] };
      }
      return true;
    }
    this.grabChat = { guestId: guest.id, lines: [grab, said, you(pick(GRAB_THOUGHTS))], answered: false, reply: [] };
    return true;
  }

  /**
   * Whether the guest she's just served offers coin for a look at her (show.ts): the part their type likes, if
   * they've the nerve to ask for it. Always asked; she answers. Returns whether they asked.
   */
  private maybeAskToSee(guest: Guest): boolean {
    if (this.playerBody !== "Female" || this.inConversation || !this.showRandom) return false;
    const guestNerve = this.nerveOf(guest);
    const mood = feltMood(guest);
    const loose = mood === "drunk" || mood === "lust";
    if (this.showRandom() >= showChance(guest.kind, guestNerve, loose, this.effects.showAsk)) return false;
    const part = partToSee(guest.stats.prefers, guestNerve);
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const offer = this.showGold(part, part);
    const ask = this.guestSays(guest, pick(SHOW_ASKS[part]).replaceAll("{gold}", String(offer)));
    this.showChat = { guestId: guest.id, part, lines: [ask, you(pick(SHOW_THOUGHTS))], answered: false, reply: [] };
    this.say(this.logLine(SHOW_OFFER_LOG, { guest: this.nameOf(guest).toLowerCase(), part: PART_WORDS[part] }));
    return true;
  }

  /** Whether she's ready to show a guest this much of her: that part's desire, helped by her exhibition passives. */
  showReady(part: ShowPart): boolean {
    return this.showMargin(part) >= 0;
  }

  /** How far past what it takes to show this she is (desire ÷ 10, less what her exhibition passives take off). */
  private showMargin(part: ShowPart): number {
    const owned = [...this.passives].filter((id) => PASSIVE_BY_ID.get(id)?.group === "exhibition").length;
    return this.meters[SHOW_METER[part]] / 10 + Math.min(2, owned) - SHOW_NEED[part];
  }

  /** How much of her clothes are off tonight, 0 to 1, for her face: the share of her outfit's strip ladder. */
  get exposure(): number {
    const ladder = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder);
    return ladder.length ? Math.min(1, this.strippedPieces.length / ladder.length) : 0;
  }

  /** How far past what it takes she is to show what she's showing a guest now (7e), for her face; null if nothing. */
  get showEagerness(): number | null {
    const shown = this.showChat?.shown;
    return shown ? this.showMargin(shown) : null;
  }

  /** What showing this pays, to a guest who asked for `asked`: more for just what they wanted. */
  private showGold(part: ShowPart, asked: ShowPart): number {
    return SHOW_GOLD[part] + (part === asked ? SHOW_ASKED_BONUS : 0) + this.effects.showGold;
  }

  /** What she calls the underwear a peek shows, as she has it on tonight; null if she has none on there. */
  private showUnder(part: ShowPart): string | null {
    const id = SHOW_UNDER[part];
    if (!id) return "";
    if (this.strippedPieces.includes(id)) return null;
    return stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder).find((g) => g.id === id)?.label ?? null;
  }

  /**
   * Her answers to a guest who's asked for a look: each thing she could show them, one at a time (the one they
   * asked for marked), or no. Once she's answered, back to work.
   */
  private showOptions(chat: ShowChat): (TalkChoice & { run: () => void })[] {
    const guest = this.guests.find((g) => g.id === chat.guestId);
    const options: (TalkChoice & { run: () => void })[] = [];
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    if (!chat.answered && guest) {
      // Too drunk on either side, and it can't be a yes (GAME_PATH.MD).
      const tooDrunk = this.drunk >= SLOPPY_DRUNK || guest.mood === "drunk";
      for (const part of SHOW_PARTS) {
        const under = this.showUnder(part);
        const label = SHOW_LABELS[part].replace("{under}", under || PART_WORDS[part]);
        const why = tooDrunk ? SHOW_TOO_DRUNK : under === null ? SHOW_NOT_WEARING : !this.showReady(part) ? SHOW_NOT_READY : null;
        const asked = part === chat.part ? `${SHOW_ASKED_MARK}, ` : "";
        options.push({
          label: why ? `${label} ${why}` : `${label} (${asked}+${this.showGold(part, chat.part)} gold)`,
          disabled: why !== null,
          run: () => this.showThem(chat, guest, part),
        });
      }
      options.push({
        label: SHOW_NO_LABEL,
        disabled: false,
        run: () => {
          chat.answered = true;
          this.records.showsRefused++;
          chat.reply = [you(this.herBar("lookNo")), this.guestSays(guest, pick(SHOW_AFTER.no))];
        },
      });
      return options;
    }
    options.push({ label: "Get back to work", disabled: false, run: () => (this.showChat = null) });
    return options;
  }

  /**
   * She shows them one thing: her underwear (a peek), or a part of her bare. The model acts it out while the talk
   * lasts. It leaves them hornier and bolder; bare, the whole room too.
   */
  private showThem(chat: ShowChat, guest: Guest, part: ShowPart): void {
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const how = SHOW_HOW[part];
    const gold = this.showGold(part, chat.part);
    chat.answered = true;
    chat.shown = part;
    // Her breasts: both, or just the one, by chance.
    if (part === "breasts") chat.side = pick(SHOW_SIDES);
    this.adjust(gold, 0, 0);
    this.earned += gold;
    if (how === "peek") this.records.peeks++;
    else this.records.flashes++;
    this.shift({ fame: how === "bare" ? 2 : 1, flirt: 1, respect: how === "bare" ? -1 : 0 });
    this.raise(SHOW_METER[part], SHOWN_DESIRE[how]);
    // Hornier, and bolder, as if she'd let them touch her.
    this.stirGuest(guest, SHOWN_LUST[how], SHOWN_BOLD[how]);
    // Bare: the whole room gets an eyeful.
    if (how === "bare") for (const other of this.guests) if (other !== guest && other.status !== "leaving") other.lust = Math.min(10, other.lust + ROOM_LUST);
    const one = chat.side && chat.side !== "both" ? chat.side : null;
    const told = (one ? pick(SHOW_TOLD_ONE).replaceAll("{side}", one) : pick(SHOW_TOLD[part])).replaceAll("{top}", this.topPullDir);
    const after = part === chat.part ? SHOW_AFTER[how] : SHOW_AFTER.other;
    chat.reply = [you(this.herBar("lookYes")), narrate(`${told} (+${gold} gold)`), this.guestSays(guest, pick(after))];
    this.say(this.logLine(SHOWED_LOG, { part: this.showUnder(part) || PART_WORDS[part], gold }));
    this.cue("tip");
  }

  /** A guest gets hornier (lust, up to 10) and bolder (as if she'd let them touch her `bold` more times). */
  private stirGuest(guest: Guest, lust: number, bold: number): void {
    guest.lust = Math.min(10, guest.lust + lust);
    const history = this.touchHistory.get(guest.id) ?? { allowed: 0, slapped: false };
    history.allowed += bold;
    this.touchHistory.set(guest.id, history);
  }

  /** Her answers to a guest with hold of her: twist free, slap their hand, or let them hold her. Then back to work. */
  private grabOptions(chat: GrabChat): (TalkChoice & { run: () => void })[] {
    const guest = this.guests.find((g) => g.id === chat.guestId);
    const options: (TalkChoice & { run: () => void })[] = [];
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const answer = (lines: GrabAnswerLines): TalkLine[] => [
      you(pick(lines.you)),
      narrate(pick(lines.told)),
      ...(guest ? [this.guestSays(guest, pick(lines.they))] : []),
    ];
    if (!chat.answered && guest) {
      options.push(
        {
          // Always works, like Pull away.
          label: GRAB_TWIST,
          disabled: false,
          run: () => {
            chat.answered = true;
            chat.reply = answer(GRAB_TWIST_LINES);
            this.records.grabsBroken++;
            this.gainXp("agility", 1);
          },
        },
        {
          label: GRAB_SLAP,
          disabled: false,
          run: () => {
            chat.answered = true;
            chat.reply = answer(GRAB_SLAP_LINES);
            this.records.grabsBroken++;
            this.shift({ respect: 1 });
            // Some take it badly.
            if (this.random() < GRAB_SLAP_ANGERS) guest.mood = "angry";
          },
        },
        {
          label: GRAB_LET,
          disabled: false,
          run: () => {
            const prelude = answer(GRAB_LET_LINES);
            this.records.grabsAllowed++;
            this.shift({ fame: 1, flirt: 1 });
            if (this.effects.grabGold > 0) {
              this.gold += this.effects.grabGold;
              this.earned += this.effects.grabGold;
              this.say(this.logLine(GRAB_GOLD_LOG, { gold: this.effects.grabGold }));
            }
            // Holding her makes them hornier, and bolder.
            this.stirGuest(guest, 1, 1);
            // Held, they go for her clothes; that still asks, Pull away and all.
            this.grabChat = null;
    this.showChat = null;
            if (!this.maybeReach(guest, false, { prelude })) {
              this.grabChat = { ...chat, answered: true, reply: [...prelude, narrate(pick(GRAB_LETS_GO))] };
            }
          },
        },
      );
    }
    options.push({ label: "Get back to work", disabled: !chat.answered && guest !== undefined, run: () => (this.grabChat = null) });
    return options;
  }


  /** Her kink, from her passives: how she (and the guest) talk after the Consent-off check (kinktalk.ts). */
  get kink(): Kink {
    return kinkOf(this.passives);
  }

  /** A guest saying something out loud in a conversation, under their own name, so the game shows them. */
  private guestSays(guest: Guest, text: string): TalkLine {
    return { speaker: this.nameOf(guest), text: `"${text}"`, guestId: guest.id };
  }

  /** Lines of the bar's talk picked so far: picked apart from `random`, so what's said never changes how it goes. */
  private barTexts = 0;

  /** A roll from 0 to 1 for the bar's lines (barher.ts, barvoices.ts), well spread, off the night's dice. */
  private barRoll(): number {
    this.barTexts++;
    const x = Math.sin(this.barTexts * 12.9898 + this.nightIndex * 78.233 + 4.1) * 43758.5453;
    return x - Math.floor(x);
  }

  private barPick(lines: readonly string[]): string {
    return lines[Math.floor(this.barRoll() * lines.length) % lines.length];
  }

  /** What she says out loud at the bar (barher.ts, KP's waitress lines): by her stage, horny or drunk over it. */
  private herBar(moment: BarMoment): string {
    return `"${this.barPick(HER_BAR_LINES[moment][barVoice(this.arcStage, horny(this.meters), this.drunk)])}"`;
  }

  /** A guest's crude bar talk (barvoices.ts), in their type's voice. */
  private barQuip(guest: Guest, pick: (v: (typeof BAR_VOICES)[GuestKind]) => readonly string[]): TalkLine {
    return this.guestSays(guest, this.barPick(pick(BAR_VOICES[guest.kind])));
  }

  /** Both sides of the Consent-off check for a touch: her desire, exposure, passives and practice; their nerve and taste. */
  impulseFacts(guest: Guest, guestNerve: number, touch: TouchDef): ImpulseFacts {
    const groups = GROUPS_OF_REGION[touch.region];
    const owned = [...this.passives].map((id) => PASSIVE_BY_ID.get(id)?.group);
    const preferred = DUEL_AREAS.find((a) => a.id === guest.stats.prefers)?.meter;
    return {
      level: touch.level,
      desire: Math.floor(this.meters[METER_OF[touch.region]]),
      exposed: this.strippedPieces.length,
      exhibition: owned.filter((g) => g === "exhibition").length,
      passives: owned.filter((g) => g !== undefined && groups.includes(g)).length,
      lets: this.touchMemory.lets[touch.region] ?? 0,
      skill: this.level(SKILL_OF_REGION[touch.region]),
      nerve: guestNerve,
      prefers: preferred === METER_OF[touch.region],
      strip: touch.strip === true,
      passiveHold: this.effects.hold + (this.effects.holdOf[touch.region] ?? 0),
    };
  }

  /** You answer a guest who reached for you. */
  private answerTouch(chat: TouchChat, answer: TouchAnswer): void {
    const { touch } = chat;
    const out = touchOutcome(touch, answer);
    const piece = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped]?.label ?? null;
    const fill = (text: string) => fillPiece(text, piece);
    chat.answered = true;
    chat.answer = answer;
    const guest = this.guests.find((g) => g.id === chat.guestId);
    const e = this.effects;
    // Letting it, leaning in or giving in: all three are her yes.
    const took = touchLands(answer);
    const r = this.records;
    // A reach mid-brawl, slapped away or let happen; a garment she kept on. Her answers, counted for her passives.
    if (chat.brawl && took) r.brawlLets++;
    if (chat.brawl && answer === "slap") r.brawlSlaps++;
    if (touch.strip && !took) r.clothesKept++;
    let gold = out.gold;
    let respect = out.respect;
    let fame = out.fame;
    let mood = out.mood;
    // Willpower: giving in wears it down; saying no costs it when part of her wanted it, and steadies her when not.
    const refusing = answer === "slap" || answer === "pull";
    const willCost = refusing ? this.refuseWill(chat.tier, touch.level) : 0;
    // A no while part of her wanted it (torn or wanting it): Wren's keeper letter answers the first (letters.ts).
    if (refusing && chat.tier > 0) this.letters.temptedNo++;
    const shaky = refusing && willCost > 0 && this.willpower < willCost;
    if (took) this.spendWill(answer === "lean" ? LEAN_WILL : ALLOW_WILL);
    else if (refusing && willCost === 0) this.restoreWill(STEADY_WILL);
    else if (shaky) this.spendWill(this.willpower);
    else if (refusing) {
      this.spendWill(willCost);
      this.gainXp("mind", 1);
    }
    if (took) {
      const skill = SKILL_OF_REGION[touch.region];
      const practised = bodySkillBonus(this.level(skill));
      // Her Slut Level: guests pay more for what they've heard she'll allow.
      gold += (e.touchGold[touch.region] ?? 0) + (answer === "lean" ? e.leanGold : 0) + practised.gold + Math.floor(this.slutLevel / SLUT_LEVELS_PER_GOLD);
      this.gainXp(skill, answer === "lean" ? 3 : 2);
      this.gainXp("charm", 1);
      // Further in (inside her clothes, bare skin): it pays more and stirs her more.
      const layer = LAYER_BONUS[chat.layer ?? "over"];
      gold += layer.gold;
      if (chat.layer === "inside") r.touchedInside++;
      else if (chat.layer === "bare") r.touchedBare++;
      // Her adult play stack fills with every touch she lets land, the bolder the more (adultplay.ts).
      // Tonight's desire: the meter for where it landed most, the rest of her a little; more the more practised.
      const own = TOUCH_DESIRE * (answer === "lean" ? LEAN_DESIRE : 1) * (1 + practised.sens) * layer.desire;
      const meter = METER_OF[touch.region];
      // A lap, a hand between her thighs, an invitation: she wants to be intimate too, as much as the part touched.
      const intimate = INTIMATE_REGIONS.has(touch.region);
      for (const m of METERS) this.raise(m, m === meter || (intimate && m === "cock") ? own : own / 3);
      // The intensity bar: a bold touch she said yes to tips a little more and warms her a little more.
      const intensity = intensityBonus(touch.level);
      gold += intensity.gold;
      this.raise(meter, own * intensity.meter);
      this.raiseAll(e.spill + (answer === "lean" ? e.leanMeters : 0));
      this.raise("pussy", e.spillPussy);
      if (ROUGH_TOUCHES.has(touch.id)) {
        r.rough++;
        this.raiseAll(e.roughMeters);
      }
      if (answer === "lean") r.leans++;
      const kinds = (r.kinds[touch.region] ??= []);
      if (guest && !kinds.includes(guest.kind)) kinds.push(guest.kind);
      this.pleasure += touch.level * PLEASURE_PER_LEVEL * (answer === "lean" ? LEAN_DESIRE : 1) * (1 + e.pleasure);
      if (this.pleasure >= 70 && this.pleasure < PLEASURE_MAX) this.say(this.logLine(CLOSE_LOG));
      else if (this.pleasure >= PLEASURE_MAX - 10) this.say(this.logLine(EDGE_LOG));
    } else if (answer === "slap") {
      r.slapped++;
      this.gainXp("mind", 1);
      this.gainXp("strength", 1);
      respect += e.slapRespect;
      fame += e.slapFame;
      this.raise("body", e.slapMeters);
      if (e.slapCalm) mood = null;
    } else {
      r.pulled++;
      this.gainXp("mind", 2);
      respect += e.pullRespect;
    }
    // Said no with nothing left to say it with: it's still no, but the room saw her waver.
    if (shaky) respect = Math.min(respect, 0);
    this.adjust(gold, 0, 0);
    this.earned += gold;
    this.shift({ respect, fame, flirt: out.flirt });
    if (guest && mood) guest.mood = mood;
    const history = this.touchHistory.get(chat.guestId) ?? { allowed: 0, slapped: false };

    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    this.touchesTonight.reached++;
    if (took) {
      history.allowed++;
      // A hand she let stay: they want more.
      if (guest) guest.lust = Math.min(10, guest.lust + LUST_PER_LET);
      this.touchesTonight.allowed++;
      if (guest && guest.mood !== "drunk") this.admirers.push({ kind: guest.kind, stats: guest.stats });
      this.touchesTonight.boldest = Math.max(this.touchesTonight.boldest, touch.level);
      const before = this.touchMemory.lets[touch.region] ?? 0;
      this.touchMemory.lets[touch.region] = before + 1;
      const tip = gold > 0 ? ` (+${gold} gold)` : "";
      // Giving in has several lines per touch: one of them, picked at random.
      const givenInLines = answer === "givein" ? GIVE_IN_TEXTS[touch.id] : undefined;
      const givenIn = givenInLines?.length ? pick(givenInLines) : undefined;
      let line = fill(answer === "lean" ? touch.lean : givenIn ?? touch.allow);
      // Her giving in is its own beat, so its line stays; otherwise her stage layers on the written line.
      if (!givenIn) line = flavorLine(line, this.arcStage, touch.region, false);
      chat.reply = [narrate(line + tip)];
      // Out loud, by where they have her, and them crowing (barher.ts, barvoices.ts).
      const part = REACH_PART[touch.region];
      if (part && guest) {
        const moment: BarMoment = ({ chest: "letChest", rear: "letRear", thigh: "letThigh", intimate: "letIntimate", mouth: "letMouth", body: "letBody" } as const)[part];
        chat.reply.push(you(this.herBar(moment)), this.barQuip(guest, (v) => v.crow));
      }
      const after = afterLine(touch.region, before, { unasked: chat.impulse, late: arcIndex(this.arcStage) >= arcIndex("willing") });
      if (after) chat.reply.push(you(after.text));
      if (touch.strip) {
        this.loseClothing();
        this.say(this.logLine(this.stripped >= 2 ? MORE_OFF_LOG : PIECE_OFF_LOG));
      }
      else this.cue("tip");
      if (touch.region === "invite" && guest) {
        chat.reply.push(narrate(storyLine(INVITE_ROOM_YES, this.storyRoll(guest.id, 2))));
        this.adultScene = { kind: "table", guestId: guest.id, guestKind: guest.kind, guestStats: guest.stats, wholeRoom: chat.wholeRoom };
      } else if (this.pleasure >= PLEASURE_MAX && !chat.brawl) {
        this.pleasure = 0;
        r.overwhelmed++;
        this.raiseAll(OVERWHELM_DESIRE + e.overwhelmBoost);
        this.cameTonight();
        chat.reply.push(narrate("It all comes over you at once, right there at the table. Your knees give. (18+)"), you(this.herBar("came")));
        this.adultScene = { kind: "overwhelmed" };
      }
    } else {
      this.touchesTonight.refused++;
      if (answer === "slap") history.slapped = true;
      const { say, result } = pick(answer === "slap" ? SLAPS : PULLS);
      chat.reply = [you(say), narrate(result)];
      if (guest && REACH_PART[touch.region]) chat.reply.push(this.barQuip(guest, (v) => v.sulk));
      if (shaky) chat.reply.push(narrate(WAVERED));
      // The first time she ever says no, the room approves (STORY.md 4b): saying no is a story moment too.
      else if (!chat.brawl && r.pulled + r.slapped === 1) chat.reply.push(narrate(FIRST_REFUSAL));
    }
    this.touchHistory.set(chat.guestId, history);
    // For the regulars (regulars.ts): what she let them, or a slap. Not a brawl's touches.
    if (!chat.brawl) {
      if (took && touch.region === "invite") this.mark(guest, (m) => m.adult++);
      else if (took) this.mark(guest, (m) => m.lets++);
      else if (answer === "slap") this.mark(guest, (m) => (m.slapped = true));
    }
    this.touchMoment = { id: touch.id, region: touch.region, level: touch.level, answer, kind: guest?.kind ?? "farmer", layer: chat.layer ?? "over" };
    // Karryn's bar (barwork.ts): a hand on her may cost her the tray, and the rest of their table was watching.
    if (took && !chat.brawl) {
      this.maybeDropTray(chat, guest);
      if (guest && touch.region !== "invite" && !this.adultScene) this.maybeJoin(chat, guest);
    }
    // A reach mid-brawl: her answer goes back to the fight, with the willpower she has left after it.
    const fight = this.fight;
    if (chat.brawl && fight?.reaching) {
      // And the desire and pleasure the touch left her with, and what's off her now (7l).
      fight.setDesire(this.meters, this.pleasure);
      fight.setClothes(this.stripped);
      fight.afterReach(took ? "yes" : answer === "slap" ? "slap" : "pull", this.willpower);
      chat.reply.push(narrate(fight.log[fight.log.length - 1]));
      if (fight.outcome) this.finishFight(fight);
    }
  }

  /**
   * A hand landing on her while she's still got something on the tray: she may drop the lot, and it breaks like a
   * stumble, with a spill under their seat to mop (barwork.ts). Steadier the more agile she is.
   */
  private maybeDropTray(chat: TouchChat, guest: Guest | undefined): void {
    const sibling = chat.sibling;
    if (sibling === undefined || this.effects.steady >= 1) return;
    const held = this.carrying[sibling];
    if (!held || held === "cask" || this.carryCount[sibling] === 0) return;
    const facts = { lean: chat.answer === "lean", sloppy: this.drunk >= SLOPPY_DRUNK, agility: this.level("agility") };
    const chance = trayDropChance(chat.touch.level, facts) * Math.max(0, 1 - this.effects.steady);
    if (this.random() >= chance) return;
    const smashed = this.smashHeld(sibling);
    if (!smashed) return;
    if (guest && !this.messes.some((m) => m.kind === "spill" && m.spots[0] === guest.seat)) {
      this.messes.push({ id: this.nextMessId++, kind: "spill", spots: [guest.seat] });
    }
    this.records.traysDropped++;
    chat.reply.push(narrate(TRAY_DROP_LINES[Math.floor(this.random() * TRAY_DROP_LINES.length) % TRAY_DROP_LINES.length]));
    this.say(`You dropped ${smashed.what}.`);
    this.cue(smashed.count > 1 ? "smashTray" : "smashOne");
  }

  /**
   * Someone else at their table saw her let that hand stay, and may want a turn: the boldest of them who hasn't had
   * one this round. Their reach comes once she's back to work, asked like any other (barwork.ts).
   */
  private maybeJoin(chat: TouchChat, guest: Guest): void {
    if (guest.party === null) return;
    const joined = chat.joined ?? [guest.id];
    let mate: Guest | null = null;
    let mateNerve = -1;
    for (const other of this.partyGuests(guest.party)) {
      if (joined.includes(other.id) || (other.status !== "waiting" && other.status !== "eating")) continue;
      const n = this.nerveOf(other);
      if (n > mateNerve) {
        mate = other;
        mateNerve = n;
      }
    }
    if (!mate) return;
    const mood = feltMood(mate);
    if (this.random() >= joinChance(mateNerve, mood === "drunk" || mood === "lust") * Math.max(0, 1 + this.effects.join)) return;
    const pick = <T>(lines: readonly T[]) => lines[Math.floor(this.random() * lines.length) % lines.length];
    const who = (mate.stats.label ?? mate.kind).toLowerCase();
    const prelude = [this.guestSays(guest, pick(JOIN_CHEERS[guest.kind])), { ...narrate(pick(JOIN_LINES).replaceAll("{who}", who)), guestId: mate.id }];
    this.joinNext = { guestId: mate.id, prelude, joined };
    chat.reply.push(narrate(`The ${who} at their table hasn't taken their eyes off you.`));
  }

  /** The tablemate waiting their turn reaches, now she's back to work. */
  private startJoin(): void {
    const join = this.joinNext;
    this.joinNext = null;
    if (!join || this.phase !== "service") return;
    const mate = this.guests.find((g) => g.id === join.guestId);
    if (!mate || mate.status === "leaving") return;
    if (this.maybeReach(mate, false, null, join)) this.records.tableJoins++;
  }

  /** Your answers to a guest reaching for you, then getting back to work once you've given one. */
  private touchOptions(chat: TouchChat): (TalkChoice & { run: () => void })[] {
    if (chat.answered) {
      const label = !chat.brawl ? "Get back to work" : this.fight ? "Back to the fight" : "See how it ended";
      return [
        {
          label,
          disabled: false,
          run: () => {
            this.touchChat = null;
            this.startJoin();
          },
        },
      ];
    }
    const cost = this.refuseWill(chat.tier, chat.touch.level);
    const willNote = (answer: TouchAnswer): string => {
      if ((answer !== "slap" && answer !== "pull") || cost === 0) return "";
      return this.willpower >= cost ? ` · ${cost} will` : " (no willpower left: it'll show)";
    };
    const options: (TalkChoice & { run: () => void })[] = chat.answers.map((answer) => ({
      label: answerLabel(chat.touch, answer) + willNote(answer),
      disabled: false,
      run: () => this.answerTouch(chat, answer),
    }));
    // The first impulsive guest: she's asked once whether guests like this may touch without asking from now on.
    // Every usual answer stays, Slap and Pull away included, and "Always ask me" keeps things as they are.
    if (chat.offerAuto) {
      const s = this.touchSettings;
      options.unshift(
        {
          label: `${answerLabel(chat.touch, "allow")}, and let eager guests skip asking (Consent off)`,
          disabled: false,
          run: () => {
            s.agreed = true;
            this.answerTouch(chat, "allow");
          },
        },
        {
          label: "Always ask me first",
          disabled: false,
          run: () => {
            s.autoTouch = false;
            chat.offerAuto = false;
            chat.reply = [narrate("Every guest will wait for your answer. (You can change this in Settings.)")];
          },
        },
      );
    }
    return options;
  }

  /**
   * The options with a tipping guest, in two steps so each choice sits right under what it answers. First the
   * drink they offered: take it, or turn it down. Then what they say next (a dare, a compliment, a favor): answer
   * it. Getting back to work is there at every step.
   */
  private tipOptions(chat: TipChat): (TalkChoice & { run: () => void })[] {
    const options: (TalkChoice & { run: () => void })[] = [];
    if (!chat.offered) {
      const tooDrunk = this.drunk >= TOO_DRUNK;
      options.push(
        {
          // Too drunk, it says so, but it's hers to drink: drink enough and she's under the table (barwork.ts).
          label: tooDrunk ? TIP_DRINK_TOO_DRUNK : TIP_DRINK_LABEL,
          disabled: false,
          run: () => {
            chat.offered = true;
            chat.drank = true;
            const guest = this.guests.find((g) => g.id === chat.guestId);
            this.takeDrink(guest ? [guest] : []);
            this.gold += TIP_DRINK_BONUS;
            this.earned += TIP_DRINK_BONUS;
            this.changeMood(chat.guestId, (mood) => moodAfterDrink(mood, 1));
            chat.reply = [
              you(this.playerBody === "Female" ? this.herBar("drinkYes") : "\"Cheers!\""),
              narrate(`You drink with them. They're delighted, and add a coin for luck. (+${TIP_DRINK_BONUS} gold)`),
              ...chat.ask,
            ];
          },
        },
        {
          label: TIP_DRINK_DECLINE,
          disabled: false,
          run: () => {
            chat.offered = true;
            chat.reply = [you(this.playerBody === "Female" ? this.herBar("drinkNo") : "\"Not just now, thanks.\""), ...chat.ask];
          },
        },
      );
    } else if (!chat.answered) {
      for (const reply of chat.replies) {
        options.push({
          label: reply.label,
          disabled: false,
          run: () => {
            chat.answered = true;
            this.adjust(reply.gold, reply.trust, reply.heat);
            this.earned += Math.max(0, reply.gold);
            this.shift(reply.persona);
            if ((reply.persona?.kindness ?? 0) > 0) this.shift({ respect: 1 });
            this.changeMood(chat.guestId, (mood) => moodAfterReply(mood, reply.persona?.flirt ?? 0, reply.persona?.kindness ?? 0));
            if (reply.strip) this.loseClothing();
            // What it sets up: a promise that will come due, or a favor that will be returned.
            for (const next of followUpsAfter(reply.id)) this.favorsDue.push({ id: next.id, night: this.nightIndex + next.nights });
            // You say your answer first, then what comes of it.
            const spoken = reply.say ?? (reply.label.startsWith("\"") ? reply.label : null);
            chat.reply = spoken ? [you(spoken), narrate(reply.result)] : [narrate(reply.result)];
          },
        });
      }
    }
    options.push({ label: "Get back to work", disabled: false, run: () => (this.tipChat = null) });
    return options;
  }

  private changeMood(guestId: number, change: (mood: Mood) => Mood): void {
    const guest = this.guests.find((g) => g.id === guestId);
    if (guest) guest.mood = change(guest.mood);
  }

  /** Takes one thing out of a sibling's hands: one cup off the tray, or the whole of anything else. */
  private takeOne(sibling: number): void {
    this.carryCount[sibling] = Math.max(0, this.carryCount[sibling] - 1);
    if (this.carryCount[sibling] === 0) this.carrying[sibling] = null;
  }

  private emptyHands(sibling: number): void {
    this.carrying[sibling] = null;
    this.carryCount[sibling] = 0;
    this.dirtyHeld[sibling].length = 0;
  }

  /** What's in a sibling's hands goes back where it came from, so its cup or dish is free again. */
  private freeHeldWare(sibling: number): void {
    const held = this.carrying[sibling];
    const ware = held && held !== "dirty" ? WARE_OF[held] : null;
    if (ware) this.cleanWare[ware] += this.carryCount[sibling];
  }

  /** Picks up the dirty dishes from a table, on top of any already in your hands. */
  private collectDishes(mess: Mess, sibling: number): void {
    const wares = messWares(mess);
    this.messes.splice(this.messes.indexOf(mess), 1);
    this.dirtyHeld[sibling].push(...wares);
    this.carrying[sibling] = "dirty";
    this.carryCount[sibling] = this.dirtyHeld[sibling].length;
    this.cue("dishes");
    this.say("Take them to the wash tub.");
  }

  /** Puts the dirty dishes in her hands in the tub, and washes the lot in one go. */
  private fillTub(sibling: number): void {
    this.tub.push(...this.dirtyHeld[sibling]);
    this.emptyHands(sibling);
    this.cue("dishes");
    this.washAll();
  }

  /** Everything in the tub, washed and back on the shelf at once. */
  private washAll(): void {
    const washed = this.tub.splice(0);
    if (washed.length === 0) return;
    for (const ware of washed) this.cleanWare[ware]++;
    this.records.washed += washed.length;
    this.washedAt = performance.now();
    this.cue("wipe");
    const done = washed.length === 1 ? `You wash the ${washed[0]}.` : `You wash all ${washed.length} cups and dishes in one go.`;
    this.say(this.messes.length === 0 && this.phase !== "service" ? `${done} The tavern is spotless.` : done);
  }

  private stationAction(station: Station, sibling: number): Action | null {
    const held = this.carrying[sibling];
    const count = this.carryCount[sibling];
    const take = (item: Item) => {
      this.carrying[sibling] = item;
      this.carryCount[sibling] = 1;
      this.cue(TAKE_CUES[item]);
    };
    const drop = () => {
      this.emptyHands(sibling);
      this.cue("putDown");
    };

    // Dirty dishes only go one place. Whatever's in the tub is washed in one go.
    if (held === "dirty") {
      if (station !== "wash") return null;
      const all = [...this.tub, ...this.dirtyHeld[sibling]];
      return { label: `Wash ${dirtyWords(all)}`, run: () => this.fillTub(sibling) };
    }
    if (station === "wash") {
      if (held) return null;
      if (this.tub.length > 0) return { label: `Wash ${dirtyWords(this.tub)}`, run: () => this.washAll() };
      // Behind the bar, out of sight: put a piece back on (barwork.ts).
      if (this.stripped > 0 && this.phase === "service" && this.playerBody === "Female") {
        const piece = stripLadder(this.playerBody, this.playerOutfit, this.playerLegwear, this.playerUnder)[this.stripped - 1]?.label ?? "clothes";
        return { label: `Duck behind the bar and put your ${piece} back on`, run: () => this.redress() };
      }
      return null;
    }

    // The bin takes anything you picked up by mistake, except a cask, which goes back on the barrels.
    if (station === "bin") {
      if (!held) return null;
      if (held === "cask") return { label: "A cask won't fit in the bin. Put it back on the barrels" };
      return {
        label: count > 1 ? `Throw away the ${count} ales` : `Throw away the ${held}`,
        run: () => {
          this.freeHeldWare(sibling);
          drop();
        },
      };
    }

    // With room on the tray, the tap fills it: put a poured cup on, or pour another.
    // Once it's full, or there's nothing to pour, a cup goes back instead.
    if (station === "tap" && held === "ale") {
      if (count < TRAY_SIZE && this.aleReady > 0) {
        return {
          label: `Put another ale on the tray (${count + 1}/${TRAY_SIZE})`,
          run: () => {
            this.aleReady--;
            this.carryCount[sibling]++;
            this.cue("takeAle");
          },
        };
      }
      if (count < TRAY_SIZE && this.pourLeft !== null) return { label: "Pouring..." };
      if (count < TRAY_SIZE && this.tapLeft > 0 && this.cleanWare.cup > 0) {
        return { label: "Pour another ale", run: () => this.startPour() };
      }
      return {
        label: count > 1 ? "Put an ale back" : "Put ale back",
        run: () => {
          this.takeOne(sibling);
          this.aleReady++;
          this.cue("putDown");
        },
      };
    }

    if (held && STATION_OF_ITEM[held] === station) {
      return {
        label: `Put ${held} back`,
        run: () => {
          this.freeHeldWare(sibling);
          drop();
          if (held === "ale") this.aleReady++;
          if (held === "stew") {
            this.potBowls++;
            if (this.potState !== "ready") {
              this.potState = "ready";
              this.potTimer = this.burnTime;
            }
          }
        },
      };
    }

    if (station === "tap") {
      if (held === "cask") {
        return { label: "Refill the tap", run: () => { this.emptyHands(sibling); this.cue("refill"); this.tapLeft = TAP_SIZE; } };
      }
      if (held) return null;
      if (this.aleReady > 0) return { label: "Take ale", run: () => { this.aleReady--; take("ale"); } };
      if (this.pourLeft !== null) return { label: "Pouring..." };
      if (this.tapLeft === 0) return { label: "Tap is empty. Bring a cask from the barrels" };
      if (this.cleanWare.cup === 0) return { label: "No clean cups. Wash some at the tub" };
      return { label: "Pour ale", run: () => this.startPour() };
    }

    if (held) return null;

    if (station === "shelf") return this.shelfAction(take);

    const noDishes = { label: "No clean dishes. Wash some at the tub" };
    if (station === "bread") {
      if (this.cleanWare.dish === 0) return noDishes;
      return { label: "Take bread", run: () => { this.cleanWare.dish--; take("bread"); } };
    }
    if (station === "barrel") return { label: "Take a cask", run: () => take("cask") };

    switch (this.potState) {
      case "empty":
        return { label: "Start the stew", run: () => this.startStew() };
      case "cooking":
        // Started by mistake, or not needed after all: tip it out and the pot is free again.
        return { label: "Stop cooking and tip out the stew", run: () => { this.potState = "empty"; this.potTimer = 0; this.cue("stewStart"); } };
      case "burnt":
        return { label: "Scrape out the burnt pot", run: () => { this.potState = "empty"; this.cue("stewStart"); } };
      case "ready":
        if (this.cleanWare.dish === 0) return noDishes;
        return {
          label: `Take stew (${this.potBowls} left)`,
          run: () => {
            this.cleanWare.dish--;
            take("stew");
            this.potBowls--;
            if (this.potBowls === 0) this.potState = "empty";
          },
        };
    }
  }

  private action(sibling: number, target: Target): Action | null {
    if (target.kind === "bell") {
      if (this.settlingIn) return { label: `Clean up before you open: ${messesLeftWords(this.messes)} left` };
      if (this.phase === "day") return { label: "Ring the bell to open for the night", run: () => this.open() };
      return this.phase === "dusk" ? { label: "The sun is going down..." } : null;
    }
    if (target.kind === "door") {
      return {
        label: this.doorOpen ? "Close the door" : "Open the door",
        run: () => {
          this.doorOpen = !this.doorOpen;
          this.cue(this.doorOpen ? "doorOpen" : "doorClose");
        },
      };
    }
    if (target.kind === "street") {
      if (target.place !== "out") return { label: target.label, run: () => undefined };
      // The town by day (TOWN_DAY.md): out of the front door while the tavern's shut, and back before evening.
      if (this.phase === "day") {
        return this.settlingIn ? { label: "Clean up before you go out" } : { label: "Go out into Tarven", run: () => undefined };
      }
      return this.phase === "dusk" ? { label: "No time to go out now" } : null;
    }
    if (target.kind === "book") return { label: "Read your journal", run: () => undefined };
    if (target.kind === "closet") {
      if (this.duel) return null;
      // Not while the tavern's open: she has guests waiting.
      if (this.phase === "service" || this.phase === "lastcall") return { label: "No time to change now" };
      return this.phase === "ended" ? null : { label: "Change your clothes", run: () => undefined };
    }
    if (target.kind === "bath") {
      if (this.duel) return null;
      return this.messy ? { label: "Bathe and wash yourself clean", run: () => this.bathe() } : { label: "You're clean" };
    }
    if (target.kind === "desk") {
      if (this.phase !== "day") return this.phase === "dusk" ? { label: "No time for plans now" } : null;
      // Dirty dishes and spills are tied to the seats they're at, so those have to go first.
      if (this.messes.some((mess) => mess.kind === "dishes" || mess.kind === "spill")) {
        return { label: "Clear the dishes and spills before changing the room" };
      }
      return { label: "Open the house plans", run: () => undefined };
    }
    if (target.kind === "bed") {
      if (this.phase === "bedtime") return { label: "Sleep until morning", run: () => this.sleep() };
      if (this.phase === "day") {
        return this.napped ? { label: "You've already rested today" } : { label: "Nap until evening", run: () => this.nap() };
      }
      return this.phase === "dusk" ? { label: "Too early for bed" } : null;
    }
    if (target.kind === "mess") {
      const mess = this.messes.find((m) => m.id === target.id);
      if (!mess || this.phase === "lastcall") return null;
      const held = this.carrying[sibling];
      if (mess.kind === "dishes") {
        if (held && held !== "dirty") return { label: "Put down what you're carrying to clean" };
        return {
          label: `${held ? "Stack up" : "Clear"} ${dirtyWords(messWares(mess))}`,
          run: () => this.collectDishes(mess, sibling),
        };
      }
      if (held) return { label: "Put down what you're carrying to clean" };
      const { kind } = mess;
      return { label: MESS_LABELS[kind], run: () => this.clean(mess.id, kind) };
    }
    const open = this.phase === "service";
    if (target.kind === "station") {
      // The washing up can still be done once the tavern has shut for the night.
      const usable = open || this.phase === "day" || this.phase === "dusk" || (this.phase === "bedtime" && target.station === "wash");
      return usable ? this.stationAction(target.station, sibling) : null;
    }
    if (!open) return null;

    const guest = this.guests.find((g) => g.id === target.id);
    if (!guest) return null;
    // Calling her over: she has to ask what they want before she can bring it. Tray or no tray.
    if (guest.status === "waiting" && !guest.ordered) {
      return { label: "Take their order", run: () => this.takeOrder(guest) };
    }
    if (guest.status === "waiting" && this.carrying[sibling] === guest.order) {
      return { label: `Serve ${guest.order}`, run: () => this.serve(guest, sibling) };
    }
    // A party at their table will talk to you, if your hands are free.
    const { party } = guest;
    if (party !== null && this.carrying[sibling] === null && this.partyChatting(party)) {
      return { label: "Join their conversation", run: () => this.talk(party) };
    }
    return null;
  }

  /** The name of the table at a seat. */
  tableOf(seat: number): string {
    return this.seatTables[seat] ?? `seat ${seat}`;
  }

  /** The members of a party who are sitting at their table. */
  partyGuests(party: number): Guest[] {
    return this.guests.filter((g) => g.party === party && (g.status === "waiting" || g.status === "eating"));
  }

  /** Whether a party is sitting together and talking: at least two of them at the table. */
  partyChatting(party: number): boolean {
    return this.partyGuests(party).length >= 2;
  }

  private stateOf(party: number): PartyState {
    let state = this.partyState.get(party);
    if (!state) {
      state = { drinks: 0, jug: false, dare: null };
      this.partyState.set(party, state);
    }
    return state;
  }

  /** Sits down with a party. The game holds time still while you talk. */
  talk(party: number): void {
    if (this.phase !== "service" || !this.partyChatting(party)) return;
    this.tipChat = null;
    this.grabChat = null;
    this.showChat = null;
    this.talkingTo = party;
    this.talkReply = [];

    // Each speaker in the scripted chat is one of the party, matched by what they're called (speakerIndex). Lines
    // for someone who isn't sitting there aren't said: the mage doesn't speak the warrior's lines.
    const members = this.partyGuests(party);
    const unmatched = [...members];
    const speakers = new Map<string, number>();
    const guestFor = (name: string): number | null => {
      let id = speakers.get(name);
      if (id === undefined) {
        const index = speakerIndex(name, unmatched);
        if (index < 0) return null;
        id = unmatched.splice(index, 1)[0].id;
        speakers.set(name, id);
      }
      return id;
    };
    const script = this.plan.parties[party].chat.map(splitSpeaker);
    const opening: TalkLine[] = [];
    for (const line of script) {
      if (!line.speaker) opening.push(line);
      else {
        const id = guestFor(line.speaker);
        if (id !== null) opening.push({ ...line, guestId: id });
      }
    }
    // Whoever's there still asks her to sit (the script's last line), in their own name if its speaker isn't here.
    const invite = script[script.length - 1];
    if (invite && !opening.some((l) => l.text === invite.text)) {
      const host = members[0];
      opening.push({ speaker: this.nameOf(host), text: invite.text, guestId: host.id });
    }
    // Then something they've heard about you, before they ask you to sit.
    const first = opening[0];
    const remark = pickLine(REMARKS, this.banterContext(members[0].kind), this.saidLines, this.random);
    if (remark && this.random() < REMARK_CHANCE) {
      opening.splice(opening.length - 1, 0, { speaker: first.speaker, text: remark.text, guestId: first.guestId });
    }
    // Whoever's in the strongest mood says something to your face, before they ask you to sit.
    const moody = members.find((g) => feltMood(g) !== "calm") ?? members[0];
    const face = faceLine(feltMood(moody), this.banterContext(moody.kind, moody), this.saidLines, this.random);
    if (face) {
      const name = opening.find((l) => l.guestId === moody.id)?.speaker ?? this.nameOf(moody);
      opening.splice(opening.length - 1, 0, { speaker: name, text: face, guestId: moody.id });
    }
    this.talkOpening = opening;
  }

  /** A party member's words, said by whoever spoke first at the table; anything not in quotes is narration. */
  private partySays(text: string): TalkLine {
    const first = this.talkOpening[0];
    return text.startsWith("\"") && first ? { speaker: first.speaker, text, guestId: first.guestId } : narrate(text);
  }

  /** The conversation so far: what was said when it opened, then the latest reply. */
  get talkLines(): TalkLine[] {
    if (this.touchChat) return [...this.touchChat.lines, ...this.touchChat.reply];
    if (this.grabChat) return [...this.grabChat.lines, ...this.grabChat.reply];
    if (this.showChat) return [...this.showChat.lines, ...this.showChat.reply];
    if (this.lantern.chat) return [...this.lantern.chat.lines, ...this.lantern.chat.reply];
    if (this.tipChat) return [...this.tipChat.lines, ...this.tipChat.reply];
    if (this.talkingTo === null) return [];
    return [...this.talkOpening, ...this.talkReply];
  }

  /** The guests in the conversation, so the game can show who's talking. */
  get talkGuests(): Guest[] {
    if (this.touchChat) {
      const id = this.touchChat.guestId;
      return this.guests.filter((g) => g.id === id);
    }
    if (this.tipChat || this.grabChat || this.showChat || this.lantern.chat) {
      const id = (this.tipChat ?? this.grabChat ?? this.showChat ?? this.lantern.chat)!.guestId;
      return this.guests.filter((g) => g.id === id);
    }
    return this.talkingTo === null ? [] : this.partyGuests(this.talkingTo);
  }

  /** Just the latest reply, which is all that needs showing after you pick an option. */
  get talkReplyLines(): TalkLine[] {
    // A reach that's only just begun (after a grab she let stand) has nothing answered yet: all of it is new.
    if (this.touchChat) return this.touchChat.answered || this.touchChat.reply.length > 0 ? this.touchChat.reply : this.touchChat.lines;
    if (this.grabChat) return this.grabChat.reply;
    if (this.showChat) return this.showChat.reply;
    if (this.lantern.chat) return this.lantern.chat.reply;
    if (this.tipChat) return this.tipChat.reply;
    return this.talkReply;
  }

  get talkChoices(): TalkChoice[] {
    if (this.touchChat) return this.touchOptions(this.touchChat).map(({ label, disabled }) => ({ label, disabled }));
    if (this.grabChat) return this.grabOptions(this.grabChat).map(({ label, disabled }) => ({ label, disabled }));
    if (this.showChat) return this.showOptions(this.showChat).map(({ label, disabled }) => ({ label, disabled }));
    if (this.lantern.chat) return this.lantern.options(this.lanternHost).map(({ label, disabled }) => ({ label, disabled }));
    if (this.tipChat) return this.tipOptions(this.tipChat).map(({ label, disabled }) => ({ label, disabled }));
    if (this.talkingTo === null) return [];
    const state = this.stateOf(this.talkingTo);
    const members = this.partyGuests(this.talkingTo).length;

    const pouredOut = state.drinks >= DRINKS_PER_TABLE;
    const tooDrunk = this.drunk >= TOO_DRUNK;
    let drink = state.drinks === 0 ? "Drink with them" : "Have another";
    if (tooDrunk) drink = "Drink with them (you've had more than enough)";
    else if (pouredOut) drink = "They've stopped pouring for you";

    let jug = `Sell them a jug of ale (+${JUG_PAY * members} gold, uses the tap)`;
    if (state.jug) jug = "They already have a jug";
    else if (this.tapLeft === 0) jug = "Sell them a jug (the tap is empty)";

    const choices = [
      { label: drink, disabled: pouredOut },
      { label: jug, disabled: state.jug || this.tapLeft === 0 },
    ];
    // Someone at the table is going for your clothes.
    if (state.dare) choices.push(...stripReplies(state.dare, this.stripped).map(({ label }) => ({ label, disabled: false })));
    choices.push({ label: "Get back to work", disabled: false });
    return choices;
  }

  /**
   * Picks an option in the conversation: 0 drinks with them, 1 sells them a jug, then, if someone's going for
   * your clothes, 2 lets them and 3 slaps their hand away. The last leaves the table.
   */
  chooseTalk(index: number): void {
    if (this.touchChat) {
      const option = this.touchOptions(this.touchChat)[index];
      if (option && !option.disabled) option.run();
      return;
    }
    if (this.grabChat) {
      const option = this.grabOptions(this.grabChat)[index];
      if (option && !option.disabled) option.run();
      return;
    }
    if (this.showChat) {
      const option = this.showOptions(this.showChat)[index];
      if (option && !option.disabled) option.run();
      return;
    }
    if (this.lantern.chat) {
      const option = this.lantern.options(this.lanternHost)[index];
      if (option && !option.disabled) option.run();
      return;
    }
    if (this.tipChat) {
      const option = this.tipOptions(this.tipChat)[index];
      if (option && !option.disabled) option.run();
      return;
    }
    const party = this.talkingTo;
    if (party === null) return;
    const choice = this.talkChoices[index];
    if (!choice || choice.disabled) return;
    const state = this.stateOf(party);
    const plan = this.plan.parties[party];
    const members = this.partyGuests(party);

    if (index === 0) {
      state.drinks++;
      this.takeDrink(members);
      for (const guest of members) guest.mood = moodAfterDrink(guest.mood, state.drinks);
      if (state.drinks === 1) {
        // Drinking with people loosens their tongues. Village folk trust you more for it,
        // and soldiers who've drunk with you speak well of you to the garrison.
        this.talkReply = [you("\"Don't mind if I do.\""), this.partySays(plan.offer), this.partySays(plan.gossip)];
        // Some talk is a clue the story remembers (plot.ts), such as the soldiers on the Baron's silver.
        if (plan.clue) this.plotFlags.add(plan.clue);
        if (members.some((g) => g.stats.trust > 0)) {
          this.adjust(0, 1, 0);
          this.talkReply.push(narrate("They like an innkeeper who drinks with them. (+1 trust)"));
        }
        if (members.some((g) => g.kind === "soldier")) {
          this.adjust(0, 0, -1);
          this.talkReply.push(narrate("The garrison will hear you're a friend. (-1 heat)"));
        }
        if (!this.heardRumor && members.some((g) => g.rumor)) {
          this.heardRumor = true;
          this.records.rumors++;
          this.gainXp("mind", 3);
          this.talkReply.push(narrate(`They let slip: ${this.plan.lastCall.rumor}`));
          this.say(`Overheard: ${this.plan.lastCall.rumor}`);
          this.cue("rumor");
        }
      } else {
        this.talkReply = [you("\"One more!\""), narrate("Another cup goes down, and the table cheers. The room has started to tilt.")];
      }
      // With drink in them, someone may go for your clothes: the boldest of them, if anyone's feeling it.
      const bold = members.find((g) => feltMood(g) === "lust") ?? members.find((g) => feltMood(g) === "drunk") ?? members[0];
      const dare = !state.dare && bold ? this.dare(bold) : null;
      if (dare) {
        state.dare = dare;
        this.talkReply.push(this.partySays(dare.dare));
      }
    } else if (index === 1) {
      const pay = JUG_PAY * members.length;
      state.jug = true;
      // A shared jug never goes round without some of it ending up on the floor.
      if (members[0]) this.spiltAt.add(members[0].seat);
      this.gold += pay;
      this.earned += pay;
      // A jug on the table keeps them happy while they wait for their food.
      for (const guest of members) {
        guest.patience = guest.maxPatience;
        guest.mood = "drunk";
      }
      this.talkReply = [you("\"A jug for the table? It'll keep you going till the food comes.\""), narrate(`You set a jug on the table. They pay ${pay} gold and stop watching the kitchen.`)];
      this.say(`+${pay} gold for a jug of ale.`);
    } else if (state.dare && (index === 2 || index === 3)) {
      const reply = stripReplies(state.dare, this.stripped)[index - 2];
      state.dare = null;
      this.adjust(reply.gold, reply.trust, reply.heat);
      this.earned += reply.gold;
      this.shift(reply.persona);
      for (const guest of members) guest.mood = moodAfterReply(guest.mood, reply.persona?.flirt ?? 0, 0);
      if (reply.strip) this.loseClothing();
      this.talkReply = [you(reply.say ?? reply.label), narrate(reply.result)];
    } else {
      this.talkingTo = null;
      this.talkReply = [];
    }
  }

  /**
   * What's in her hands hits the floor, and the cups and dishes it was on are broken for good. A cask she hangs on
   * to. Returns what went, or null if nothing did.
   */
  private smashHeld(sibling: number): { what: string; count: number } | null {
    const held = this.carrying[sibling];
    if (!held || held === "cask") return null;
    const count = this.carryCount[sibling];
    const broken = held === "dirty" ? [...this.dirtyHeld[sibling]] : Array.from({ length: count }, () => WARE_OF[held] as Ware);
    for (const ware of broken) {
      if (this.stock[ware] === 0) continue;
      this.stock[ware]--;
      this.broken[ware]++;
    }
    this.emptyHands(sibling);
    const what = held === "dirty" ? "the dirty dishes" : held === "ale" && count > 1 ? "the whole tray" : `the ${held}`;
    return { what, count };
  }

  /** You stumbled. What you were carrying hits the floor (smashHeld). */
  stumble(sibling: number): void {
    const smashed = this.smashHeld(sibling);
    if (smashed) {
      this.say(`You stumble and drop ${smashed.what}!`);
      this.cue(smashed.count > 1 ? "smashTray" : "smashOne");
    } else {
      this.say("You stumble and nearly go over.");
      this.cue("drop");
    }
  }

  prompt(sibling: number, target: Target): Prompt | null {
    const action = this.action(sibling, target);
    return action && { label: action.label, actionable: Boolean(action.run) };
  }

  interact(sibling: number, target: Target): void {
    this.action(sibling, target)?.run?.();
  }

  chooseLastCall(index: number): void {
    if (this.phase !== "lastcall") return;
    const choice = this.lastCallChoices[index];
    if (!choice) return;
    this.adjust(choice.gold, choice.trust, choice.heat);
    // What you did gets round, and changes how people talk to you.
    if (this.heardRumor) {
      // What she did with the secret: its own deed if it has one, or the usual by its place (truth, lie, sell).
      const deed = choice.deed ?? DEEDS_IN_ORDER[index] ?? "protect";
      const at = DEEDS_IN_ORDER.indexOf(deed);
      // Passives that pay off for informing, keeping secrets and selling them.
      const e = this.effects;
      if (deed === "inform") this.adjust(0, -e.informTrust, -e.informHeat);
      if (deed === "protect") this.adjust(0, e.protectTrust, e.protectHeat);
      if (deed === "sell") {
        this.adjust(e.secretGold, 0, 0);
        this.earned += e.secretGold;
      }
      const deeds: Partial<Persona>[] = [{ informed: 1, kindness: -1 }, { protected: 1, kindness: 1 }, { sold: 1, greed: 2 }];
      this.shift({ ...deeds[at], fame: FAME_DEEDS[at], respect: RESPECT_DEEDS[at] });
      // The story remembers (plot.ts), and the morning says what came of it.
      for (const flag of choice.sets ?? []) {
        if (this.plotFlags.has(flag)) continue;
        this.plotFlags.add(flag);
        const news = FLAG_NEWS[flag];
        if (news) this.news.push(news);
      }
    } else if (index === 1) {
      this.shift({ greed: 1 });
    }
    this.lastResult = choice.result;
    this.phase = "bedtime";
    this.eased = false;
    this.say("The tavern is shut for the night. Your bed is through the door in the east wall.");
    // A revel night: the hall opens as the tavern shuts (revel.ts).
    if (this.revelTonight) this.holdRevel(true);
  }

  /** Upgrades and wares are bought from the house plans, during the day while the tavern is shut. */
  canBuy(id: UpgradeId): boolean {
    return this.phase === "day" && !this.upgrades.has(id) && this.gold >= UPGRADE_COST;
  }

  buy(id: UpgradeId): void {
    if (!this.canBuy(id)) return;
    this.gold -= UPGRADE_COST;
    this.upgrades.add(id);
    this.cue("buy");
  }

  /**
   * Whether she can enact an edict now: by day, not yet enacted, grown from one she has, not locked out by its
   * either/or, and with the edict points and gold for it.
   */
  canEnact(id: TavernRuleId): boolean {
    const def = TAVERN_RULE_BY_ID.get(id);
    return (
      this.phase === "day" && def !== undefined && edictState(def, this.rules) === "open" &&
      this.edictPoints >= def.points && this.gold >= def.cost
    );
  }

  /** Enacts an edict for good: its points, gold and any corruption are paid once. */
  enact(id: TavernRuleId): void {
    const def = TAVERN_RULE_BY_ID.get(id);
    if (!def || !this.canEnact(id)) return;
    this.edictPoints -= def.points;
    this.gold -= def.cost;
    this.corruption = Math.min(1000, this.corruption + (def.corruption ?? 0));
    this.rules.add(id);
    this.cue("buy");
    this.refreshEffects();
    this.say(`New edict in the tavern: ${def.name}.`);
  }

  /** Edict points she earns this morning: one, and one more once the tavern's famous. */
  private get edictPointsToday(): number {
    return EDICT_POINTS_PER_DAY + (this.persona.fame >= EDICT_FAME_BONUS_AT ? 1 : 0);
  }

  /** Cups and dishes can be bought again and again, until the shelves are full. */
  /** The lantern, once the brothel is open to her (lantern.ts). Bought and set from the house plans, by day. */
  canHangLantern(): boolean {
    return this.phase === "day" && this.lantern.canHang(this.houseMode.unlocked.has("brothel"), this.gold);
  }

  hangLantern(): void {
    if (!this.canHangLantern()) return;
    this.gold -= LANTERN_COST;
    this.lantern.hang(this.lanternHost);
    this.cue("buy");
  }

  /** The plain room upstairs, once the lantern is hung: one booking at a time. */
  canFurnishRoom(): boolean {
    return this.phase === "day" && this.lantern.canFurnish(this.gold);
  }

  furnishRoom(): void {
    if (!this.canFurnishRoom()) return;
    this.gold -= ROOM_COST;
    this.lantern.furnish();
    this.cue("buy");
  }

  /** Whether tonight is a Lantern night, decided by day; and the house rules, also set by day. */
  setLanternLit(lit: boolean): void {
    if (this.phase === "day" && this.lantern.hung) this.lantern.lit = lit;
  }

  setHouseRule(rule: HouseRule, choice: RuleChoice): void {
    if (this.phase === "day" && this.lantern.hung) this.lantern.rules[rule] = choice;
  }

  /**
   * What the Lantern may touch in the tavern: the till, her standing and heat, the log, and the guests at their
   * tables. Nothing here reaches the heroine herself: being the madam obliges her to nothing.
   */
  private get lanternHost(): LanternHost {
    const corruption = () => this.corruption;
    return {
      guests: this.guests,
      get madamCorruption() {
        return corruption();
      },
      say: (text) => this.say(text),
      earn: (gold) => {
        this.adjust(gold, 0, 0);
        this.earned += gold;
      },
      shift: (change) => this.shift(change),
      addHeat: (n) => this.adjust(0, 0, n),
      addCorruption: (n) => {
        this.corruption = Math.min(1000, this.corruption + n);
        this.unlockBrothel();
      },
      addFans: (n) => {
        this.fansTonight += n;
        this.fanTags.lantern += Math.max(0, n);
      },
      guestSays: (guest, text) => this.guestSays(guest, text),
      nameOf: (guest) => this.nameOf(guest),
      tableOf: (seat) => this.tableOf(seat),
      leaveTable: (guest) => this.sendOff(guest),
      cue: (sound) => this.cue(sound),
    };
  }


  /** A broken cup or dish can be replaced, one at a time, during the day. */
  canReplace(ware: Ware): boolean {
    return this.phase === "day" && this.broken[ware] > 0 && this.gold >= REPLACE_COST;
  }

  /** Replaces one broken cup or dish: back on the shelf, clean. */
  replaceBroken(ware: Ware): void {
    if (!this.canReplace(ware)) return;
    this.gold -= REPLACE_COST;
    this.broken[ware]--;
    this.stock[ware]++;
    this.cleanWare[ware]++;
    this.cue("buy");
  }

  canBuyStock(ware: Ware): boolean {
    return this.phase === "day" && this.gold >= STOCK_COST && this.stock[ware] + STOCK_PACK <= MAX_WARE[ware];
  }

  /** Buys another set of cups or dishes. */
  buyStock(ware: Ware): void {
    if (!this.canBuyStock(ware)) return;
    this.gold -= STOCK_COST;
    this.stock[ware] += STOCK_PACK;
    this.cleanWare[ware] += STOCK_PACK;
    this.cue("buy");
  }

  /** Silas's crew have been crossed: the bottles and the market stalls charge more (plot.ts). */
  get silasCrossed(): boolean {
    return bottlesDearer(this.plotFlags);
  }

  /** A set of cups or dishes from the market stalls (errands.ts): cheaper than the cart, by day. */
  canMarketBuy(ware: Ware): boolean {
    return this.phase === "day" && this.gold >= marketPackCost(this.silasCrossed) && this.stock[ware] + STOCK_PACK <= MAX_WARE[ware];
  }

  marketBuy(ware: Ware): void {
    if (!this.canMarketBuy(ware)) return;
    this.gold -= marketPackCost(this.silasCrossed);
    this.stock[ware] += STOCK_PACK;
    this.cleanWare[ware] += STOCK_PACK;
    this.cue("buy");
  }

  /** One cup or dish from the stalls to replace a broken one. */
  canMarketReplace(ware: Ware): boolean {
    return this.phase === "day" && this.broken[ware] > 0 && this.gold >= marketReplaceCost(this.silasCrossed);
  }

  marketReplace(ware: Ware): void {
    if (!this.canMarketReplace(ware)) return;
    this.gold -= marketReplaceCost(this.silasCrossed);
    this.broken[ware]--;
    this.stock[ware]++;
    this.cleanWare[ware]++;
    this.cue("buy");
  }

  /** What the town sees of her (townplaces.ts). */
  get townState(): TownState {
    return {
      arc: this.arcStage,
      corruption: this.corruption,
      fame: this.persona.fame,
      respect: this.persona.respect,
      flirt: this.persona.flirt,
      heat: this.heat,
      trust: this.trust,
      fatigueLevel: this.fatigueLevel,
      flags: this.plotFlags,
      houses: this.houses,
      fans: this.fans,
      nights: this.nightIndex,
      done: this.records.town,
      recruits: this.recruits,
      careers: this.careers,
      body: this.playerBody === "Male" ? "Male" : "Female",
      knightRank: this.knight?.rank ?? null,
      guildRank: this.guild?.rank ?? null,
      hall: {
        seat: this.beatsDone.has("copperBell"),
        reeve: this.politics.reeve,
        vote: this.voteShare,
        missing: this.reeveCheck().missing,
        campaign: this.politics.campaign,
      },
      book: { status: this.act2.book, facts: this.bookFacts() },
    };
  }

  /** Why she can't do this in town right now, or null. `hoursLeft` is what's left before five. */
  townBlocked(place: TownPlaceId, id: string, hoursLeft: number): string | null {
    const action = TOWN_PLACES[place].actions.find((a) => a.id === id);
    if (!action) return "unknown";
    if (this.phase !== "day") return "only by day";
    return blockedReason(action, this.townState, this.gold, this.townDoneToday.has(`${place}:${id}`), hoursLeft);
  }

  /**
   * Does something in town (townplaces.ts), once a day each: pays the cost, then applies what it did to her (gold,
   * fans and guests, her name, heat, trust, corruption, fatigue, desire). Null if she can't. The game moves the
   * clock on by its hours.
   */
  doTownAction(place: TownPlaceId, id: string, hoursLeft = 24): TownOutcome | null {
    if (this.townBlocked(place, id, hoursLeft)) return null;
    const action = TOWN_PLACES[place].actions.find((a) => a.id === id)!;
    const o = action.run(this.townState, () => this.random());
    this.townDoneToday.add(`${place}:${id}`);
    // What she's ever done in town, and how far along a route, for the places that remember (Oden, the rivals).
    const town = this.records.town;
    town[`${place}:${id}`] = (town[`${place}:${id}`] ?? 0) + 1;
    if (o.mark) town[o.mark] = (town[o.mark] ?? 0) + 1;
    if (o.book) {
      this.act2.book[o.book.piece] = "held";
      this.act2.won[o.book.piece] = o.book.way;
    }
    if (o.hall?.canvass) this.canvass(o.hall.canvass);
    if (o.hall?.stand) this.becomeReeve();
    if (o.career) {
      const c = this.careers[o.career.id];
      if (o.career.act === "join") c.rank = Math.max(c.rank, 0);
      else if (o.career.act === "promote") c.rank = Math.min(CAREERS[o.career.id].ranks.length - 1, c.rank + 1);
      else c.jobs++;
    }
    if (o.recruit) {
      const was = this.recruits[o.recruit.id];
      this.recruits[o.recruit.id] = (o.recruit.act === "help" ? helpRecruit(was) : warnRecruit(was)) ?? was;
    }
    this.adjust((o.gold ?? 0) - (action.cost ?? 0), o.trust ?? 0, o.heat ?? 0);
    this.errandGuests = Math.min(MAX_ERRAND_GUESTS, this.errandGuests + (o.guests ?? 0));
    this.errandFans += o.fans ?? 0;
    shiftPersona(this.persona, { respect: o.respect ?? 0, fame: o.fame ?? 0, flirt: o.flirt ?? 0, lust: o.lust ?? 0, kindness: o.kindness ?? 0 });
    if (o.corruption) {
      this.corruption = Math.max(0, Math.min(1000, this.corruption + o.corruption));
      this.unlockBrothel();
    }
    if (o.fatigue) this.tire(o.fatigue);
    if (o.desire) {
      const meter: Meter = this.playerBody === "Female" ? "pussy" : "cock";
      this.meters[meter] = Math.max(0, Math.min(this.desireCap(meter), this.meters[meter] + o.desire));
    }
    if ((o.gold ?? 0) > 0) this.cue("buy");
    return o;
  }

  /**
   * The town has seen her (beingseen.ts): a photo, a yes, a hand, what she's out in, the walk of shame. Marked for
   * today so it's counted once, then applied: her name, heat, fans and guests, and her desire (to the part a hand
   * found, or her strongest).
   */
  beSeen(e: SeenEffect): void {
    if (this.townDoneToday.has(e.mark)) return;
    this.townDoneToday.add(e.mark);
    shiftPersona(this.persona, { respect: e.respect ?? 0, fame: e.fame ?? 0, lust: e.lust ?? 0, flirt: e.flirt ?? 0 });
    if (e.heat) this.adjust(0, 0, e.heat);
    this.errandGuests = Math.min(MAX_ERRAND_GUESTS, this.errandGuests + (e.guests ?? 0));
    this.errandFans += e.fans ?? 0;
    if (e.touched) this.records.grabbed++;
    if (e.desire) {
      const meter: Meter = e.touched ?? (this.playerBody === "Female" ? "pussy" : "cock");
      this.meters[meter] = Math.max(0, Math.min(this.desireCap(meter), this.meters[meter] + e.desire));
    }
  }

  canHandOutFlyers(): boolean {
    return this.phase === "day" && !this.flyeredToday && this.gold >= FLYER_COST;
  }

  canPostOnFeed(): boolean {
    return this.phase === "day" && !this.postedToday && this.gold >= FEED_COST;
  }

  /**
   * Flyers in the square or a post on the feed (errands.ts), once a day each: the cost, then what it did to her
   * name and the guests and fans it brings. `facts` is what the square sees (the game reads her clothes). Null if
   * she can't today.
   */
  runErrand(kind: "flyers" | "feed", facts?: Omit<FlyerFacts, "flirt" | "fame" | "respect" | "arc">): ErrandResult | null {
    if (kind === "flyers" ? !this.canHandOutFlyers() : !this.canPostOnFeed()) return null;
    const rng = () => this.random();
    const result =
      kind === "flyers"
        ? handOutFlyers({ flirt: this.persona.flirt, fame: this.persona.fame, respect: this.persona.respect, arc: this.arcStage, dress: facts?.dress ?? "dressed", outfit: facts?.outfit ?? "work" }, rng)
        : postOnFeed(this.persona.fame, rng);
    this.gold -= kind === "flyers" ? FLYER_COST : FEED_COST;
    if (kind === "flyers") this.flyeredToday = true;
    else this.postedToday = true;
    this.errandGuests = Math.min(MAX_ERRAND_GUESTS, this.errandGuests + result.guests);
    this.errandFans += result.fans;
    shiftPersona(this.persona, { respect: result.respect, fame: result.fame, lust: result.lust });
    if (result.heat) this.adjust(0, 0, result.heat);
    return result;
  }

  /** A new drink for the shelf, bought once. */
  canBuyBottle(bottle: Bottle): boolean {
    return this.phase === "day" && !this.bottles.has(bottle) && this.gold >= this.bottleCost(bottle);
  }

  /** What a bottle costs her: more once Silas's crew have been crossed (plot.ts). */
  bottleCost(bottle: Bottle): number {
    return BOTTLES[bottle].cost + (bottlesDearer(this.plotFlags) ? BOTTLE_MARKUP : 0);
  }

  buyBottle(bottle: Bottle): void {
    if (!this.canBuyBottle(bottle)) return;
    this.gold -= this.bottleCost(bottle);
    this.bottles.add(bottle);
    this.cue("buy");
  }

  /**
   * Pell collects a part of the debt: a hundred, plus whatever she was short last time. Short again, and he takes
   * what she has, and she's in the Baron's debt (a debuff) until she's caught up. If she promised the book, he asks
   * after it instead, and the garrison hears he's impatient.
   */
  private collect(): void {
    if (this.bookPromised) {
      this.adjust(0, 0, 1);
      this.news.push("Pell came by at dawn, not for gold: \"The book, innkeeper. The Baron is a patient man. I am not.\"");
      return;
    }
    if (this.owed === 0) return;
    // With her ear (plot.ts `pellsEar`), he takes half the gold, and a name from her room.
    const ear = this.plotFlags.has("pellsEar");
    if (ear) {
      this.corruption += NAME_CORRUPTION;
      this.shift({ informed: 1 });
      this.news.push("Pell wanted a name from your room before he'd count the gold. You gave him one.");
    }
    const due = Math.min(this.owed, (ear ? EAR_COLLECTION : COLLECTION) + this.arrears);
    const paid = Math.min(this.gold, due);
    this.gold -= paid;
    this.owed -= paid;
    this.arrears = due - paid;
    this.baronVisit = { due, paid, owed: this.owed };
    if (this.arrears === 0) {
      this.clearDebuff("inDebt");
      this.news.push(`Pell collected ${due} gold for the Baron. ${this.owed > 0 ? `${this.owed} still to go.` : "The debt is paid."}`);
    } else {
      this.addDebuff("inDebt");
      this.news.push(`Pell wanted ${due} gold. He took the ${paid} you had, and you're ${this.arrears} behind.`);
    }
  }

  nextNight(): void {
    if (this.phase !== "dawn") return;
    const messes = this.leftovers();
    const posted = this.postedToday;
    this.nightIndex++;
    this.edictPoints += this.edictPointsToday;
    this.openDay(messes);
    // A day passes on the feed, in the garrison and for her injuries (feedstar.ts, knight.ts, guild.ts).
    this.feedDayPassed(posted);
    this.knightDayPassed();
    this.guildDayPassed();
    if (this.storyBeats) this.fireBeat();
    this.findMorningLetter();
  }

  /** How long guests will wait, as a share of usual, given how dirty the room is. */
  get messPatience(): number {
    return this.messPatienceFor(1);
  }

  /** The same for someone who minds dirt this much: 1 is usual, 0 doesn't notice, 2 and up can barely sit down. */
  messPatienceFor(fussy: number): number {
    return Math.max(0.2, 1 - MESS_PATIENCE_LOSS * fussy * Math.max(0, 1 - this.effects.tidy) * Math.min(1, this.messes.length / MESS_FOR_FULL_LOSS));
  }

  /** What a guest is called: their type (a maid or footman for a servant, by body). */
  /** Notes something that happened with a guest tonight, for the regulars, settled at the end of the night. */
  private mark(guest: Guest | undefined, change: (m: NightMarks) => void): void {
    if (!guest) return;
    let entry = this.nightMarks.get(guest.id);
    if (!entry) {
      const { kind, role, female, look, stats, regular } = guest;
      entry = { guest: { kind, role, female, look, stats: structuredClone(stats), regular }, marks: newMarks() };
      this.nightMarks.set(guest.id, entry);
    }
    change(entry.marks);
  }

  /** The lasting nerve a regular walks in with (regulars.ts); 0 for anyone else. */
  private regularNerveOf(guest: Guest): number {
    const regular = guest.regular ? this.regulars.find((r) => r.id === guest.regular) : undefined;
    return regular ? regularNerve(regular) : 0;
  }

  /** Which regulars come in tonight: each by their own chance, at most REGULARS_A_NIGHT. */
  private regularsTonight(arrivals: Arrival[]): void {
    let coming = 0;
    const last = Math.max(EXTRA_FIRST + 1, ...arrivals.map((a) => a.at));
    for (const regular of this.regulars) {
      if (coming >= REGULARS_A_NIGHT) break;
      if (this.random() >= returnChance(regular)) continue;
      arrivals.push({ at: EXTRA_FIRST + this.random() * (last - EXTRA_FIRST), kind: regular.kind, order: "ale", role: regular.role, regular: regular.id });
      coming++;
    }
    arrivals.sort((a, b) => a.at - b.at);
  }

  /** The Warm House's recruits come in for a drink some nights, more often the further up the hill they've gone. */
  private recruitsTonight(arrivals: Arrival[]): void {
    // Rolled with the crowd: without its dice (the tests' setup), the night is as written. Not the first night
    // either, the salt night, which is written too: they start coming in once she's open for business.
    const dice = this.crowdRandom;
    if (!dice || this.nightIndex === 0) return;
    const last = Math.max(EXTRA_FIRST + 1, ...arrivals.map((a) => a.at));
    for (const id of RECRUIT_IDS) {
      if (dice() >= BAR_CHANCE[this.recruits[id].stage]) continue;
      arrivals.push({ at: EXTRA_FIRST + dice() * (last - EXTRA_FIRST), kind: RECRUITS[id].kind, order: "ale", recruit: id });
    }
    arrivals.sort((a, b) => a.at - b.at);
  }

  /**
   * The end of the night, for the regulars (regulars.ts): each regular who came settles what happened; a guest who
   * took a first with her, or settled a brawl with her, becomes a regular, if there's room for their kind.
   */
  private settleRegulars(): void {
    for (const [guestId, { guest, marks }] of this.nightMarks) {
      const index = guest.regular ? this.regulars.findIndex((r) => r.id === guest.regular) : -1;
      if (index >= 0) {
        this.regulars[index] = settleNight(this.regulars[index], marks);
        continue;
      }
      if (!earnsRegular(marks) || this.regulars.filter((r) => r.kind === guest.kind).length >= REGULARS_PER_KIND) continue;
      const name = nextName(guest.kind, new Set(this.regulars.map((r) => r.name)));
      const fresh: Regular = {
        id: `r${this.nightIndex}-${guestId}`,
        name,
        kind: guest.kind,
        role: guest.role,
        female: guest.female,
        look: guest.look,
        stats: guest.stats,
        nerve: 0,
        slapped: false,
        nights: 0,
        lets: 0,
        adult: 0,
        beatHer: 0,
        lostToHer: 0,
        since: this.nightIndex,
        last: "met",
      };
      this.regulars.push(settleNight(fresh, marks));
      this.news.push(`A face you'll see again: the ${roleLabel(guest.role, guest.female).toLowerCase()} goes by ${name}. (Wanted, in your journal.)`);
    }
    this.nightMarks.clear();
  }

  nameOf(guest: Guest): string {
    const regular = guest.regular ? this.regulars.find((r) => r.id === guest.regular) : undefined;
    if (regular) return regular.name;
    return roleLabel(guest.role, guest.female);
  }

  /** Mops or sweeps up one mess on the floor. */
  private clean(id: number, kind: Exclude<MessKind, "dishes">): void {
    const firstMorning = this.settlingIn;
    this.messes.splice(this.messes.findIndex((m) => m.id === id), 1);
    this.records.messesCleaned++;
    this.cue("wipe");
    if (firstMorning) {
      // The first morning walks her through it: what's left, and the bell once it's done.
      if (!this.settlingIn) this.say("The tavern is spotless, the way it was in Grandma's day. Ring the bell on the bar when you're ready to open.");
      else this.say(`${MESS_DONE[kind]} ${messesLeftWords(this.messes)} left.`);
      return;
    }
    if (this.messes.length === 0 && this.tub.length === 0) this.say("The tavern is spotless.");
    else this.say(`${MESS_DONE[kind]} ${this.messes.length} more to clean.`);
  }

  /**
   * Everything still to clean after tonight: what was left from before, any dishes nobody cleared, ale
   * wherever it was spilt, and dust the crowd tracked in. Messes in the same place join up.
   */
  private leftovers(): Mess[] {
    const messes = this.messes.map(copyMess);
    const add = (kind: MessKind, spots: number[]) => messes.push({ id: this.nextMessId++, kind, spots });
    const has = (kind: MessKind, spot: number) => messes.some((m) => m.kind === kind && m.spots.includes(spot));

    for (const seat of this.spiltAt) if (!has("spill", seat)) add("spill", [seat]);

    const crowd = this.served + this.walkouts;
    if (crowd > 0 && this.dustSpots > 0) {
      const want = DUST_BASE + Math.floor(crowd / GUESTS_PER_DUST) - messes.filter((m) => m.kind === "dust").length;
      const free = shuffled(this.dustSpots, this.nightIndex * 7919 + crowd).filter((spot) => !has("dust", spot));
      for (const spot of free.slice(0, Math.max(0, want))) add("dust", [spot]);
    }

    // Opening with mess still about lets a spider back in, up in one of the corners.
    const webs = messes.filter((m) => m.kind === "cobweb").length;
    if (this.openedDirty && this.cobwebSpots > 0 && webs < MOST_COBWEBS) {
      const free = shuffled(this.cobwebSpots, this.nightIndex * 4513 + 11).filter((spot) => !has("cobweb", spot));
      if (free.length > 0) add("cobweb", [free[0]]);
    }
    return messes;
  }

  /** What carries from one night to the next, taken as a night opens. A save holds this. */
  snapshot(): TavernSave {
    return {
      nightIndex: this.nightIndex,
      gold: this.gold,
      trust: this.trust,
      heat: this.heat,
      upgrades: [...this.upgrades],
      tapLeft: this.tapLeft,
      messes: this.messes.map(copyMess),
      persona: { ...this.persona },
      stock: { ...this.stock },
      broken: { ...this.broken },
      debuffs: this.debuffs.map((d) => ({ ...d })),
      story: {
        fans: this.fans,
        beats: [...this.beatsDone],
        houses: { ...this.houses },
        owed: this.owed,
        arrears: this.arrears,
        promised: this.bookPromised,
        storyNight: this.storyNight,
        sideRumor: 0,
        flags: [...this.plotFlags],
        arc: this.arcSeen,
        legend: { ...this.legend },
        tier: this.tierSeen,
        letters: saveLetters(this.letters),
        ...(this.chapterEnding ? { chapter1: this.chapterEnding } : {}),
        fanGroups: { ...this.fanGroups },
      },
      bottles: [...this.bottles],
      name: this.name,
      tub: [...this.tub],
      touch: { lets: { ...this.touchMemory.lets } },
      progress: {
        corruption: this.corruption,
        records: structuredClone(this.records),
        passives: [...this.passives],
        eased: this.eased,
        xp: { ...this.xp } as Record<string, number>,
        titles: [...this.titles],
        worn: [...this.worn],
        trinkets: [...this.trinketsWorn],
        riot: this.riot,
        hairNights: this.hairNights,
        // Older builds read edicts as "adopted" rules switched "on": both lists hold the enacted ones.
        rulesAdopted: [...this.rules],
        rules: [...this.rules],
        edictPoints: this.edictPoints,
      },
      favors: { asked: [...this.askedFavors], due: this.favorsDue.map((d) => ({ ...d })) },
      ...(this.layout ? { layout: cloneLayout(this.layout) } : {}),
      ...(this.lantern.hung ? { lantern: this.lantern.save() } : {}),
      ...(this.regulars.length > 0 ? { regulars: structuredClone(this.regulars) } : {}),
      ...(this.careers.smuggler.rank >= 0 || this.careers.clergy.rank >= 0 ? { careers: structuredClone(this.careers) } : {}),
      ...(this.act2.pass.open || this.act2.flags.length ? { act2: structuredClone(this.act2) } : {}),
      ...(this.politics.reeve || Object.keys(this.politics.campaign).length || Object.keys(this.politics.lawShift).length
        ? { politics: structuredClone(this.politics) }
        : {}),
      ...(RECRUIT_IDS.some((id) => this.recruits[id].stage > 0 || this.recruits[id].helped || this.recruits[id].warnings)
        ? { recruits: structuredClone(this.recruits) }
        : {}),
      ...(this.staff.length > 0 || this.applicants.length > 0 || Object.keys(this.friendship).length > 0
        ? {
            staff: {
              members: structuredClone(this.staff),
              applicants: structuredClone(this.applicants),
              applicantsNight: this.applicantsNight,
              nextApplicant: this.nextApplicant,
              friendship: { ...this.friendship },
            },
          }
        : {}),
      ...(this.revelHall || this.revelTonight ? { revel: { hall: this.revelHall, settings: { ...this.revelSettings }, tonight: this.revelTonight } } : {}),
      ...(this.flyeredToday || this.postedToday || this.errandGuests || this.errandFans || this.townDoneToday.size
        ? {
            errands: {
              flyered: this.flyeredToday,
              posted: this.postedToday,
              guests: this.errandGuests,
              fans: this.errandFans,
              town: [...this.townDoneToday],
            },
          }
        : {}),
      ...(this.records.feedPosts > 0 || this.feed.followers > 0 || this.feedDeals.length > 0 || this.feedBroken.length > 0 || this.feedTrendWeek >= 0 || this.feedStreamedToday || this.feedInboxDay >= 0
        ? {
            feed: {
              records: { ...this.feed },
              deals: this.feedDeals.map((d) => ({ ...d })),
              warned: [...this.feedWarned],
              broken: [...this.feedBroken],
              quietDays: this.feedQuietDays,
              hype: this.feedHype,
              stalkerRisk: this.feedStalkerRisk,
              trendWeek: this.feedTrendWeek,
              streamed: this.feedStreamedToday,
              inbox: this.feedInbox.map((d) => ({ ...d })),
              inboxDay: this.feedInboxDay,
            },
          }
        : {}),
      ...(this.knight
        ? { knight: { state: structuredClone(this.knight), flags: [...this.knightFlags], tourneyWeek: this.knightTourneyWeek, done: [...this.knightDoneToday], patrol: this.knightPatrolId } }
        : {}),
      ...(this.guild
        ? {
            guild: {
              card: structuredClone(this.guild),
              board: [...this.guildBoard],
              boardDay: this.guildBoardDay,
              questToday: this.guildQuestToday,
              hallToday: this.guildHallToday,
              questGold: [...this.guildQuestGold],
            },
          }
        : {}),
    };
  }

  /**
   * Everything about the tavern right now, mid-day or mid-night, for a save of this very moment (moment.ts). Taken
   * alongside a snapshot: the snapshot loads first, and this puts the night as it stood back on top.
   */
  captureMoment(): { tavern: Record<string, unknown>; lantern: Record<string, unknown> } {
    return { tavern: captureFields(this, MOMENT_SKIP), lantern: captureFields(this.lantern, LANTERN_MOMENT_SKIP) };
  }

  /** Puts a captured moment back, after `restore` has loaded the snapshot taken with it. Throws on a broken one. */
  resumeMoment(moment: { tavern?: unknown; lantern?: unknown }): void {
    applyFields(this, moment.tavern, MOMENT_SKIP);
    if (moment.lantern !== undefined) applyFields(this.lantern, moment.lantern, LANTERN_MOMENT_SKIP);
    this.refreshEffects();
  }

  /** Puts the tavern back at the start of a saved night, with no guests yet. */
  restore(save: TavernSave): void {
    this.nightIndex = save.nightIndex;
    this.gold = save.gold;
    this.trust = save.trust;
    this.heat = save.heat;
    this.upgrades.clear();
    for (const id of save.upgrades) this.upgrades.add(id);
    // The tap no longer runs dry, so an old save's empty tap comes back full.
    this.tapLeft = TAP_SIZE;
    this.persona = readPersona(save.persona);
    this.touchMemory = readTouchMemory(save.touch);
    const progress = readProgress(save.progress);
    this.corruption = progress.corruption;
    this.records = progress.records;
    this.passives.clear();
    for (const id of progress.passives) this.passives.add(id);
    // Titles: only ones that exist, the first one always; worn only if earned, and no more than she has slots for.
    this.titles = new Set([START_TITLE, ...(progress.titles ?? []).filter((id) => TITLE_BY_ID.has(id))]);
    this.worn = (progress.worn ?? [START_TITLE]).filter((id, i, all) => this.titles.has(id) && all.indexOf(id) === i);
    this.regulars = readRegulars(save.regulars);
    this.recruits = readRecruits(save.recruits);
    this.careers = readCareers(save.careers);
    this.act2 = Act2.readAct2(save.act2);
    // Staff (staff.ts): older saves have none.
    const staffSave = save.staff;
    this.staff = (staffSave?.members ?? []).map(readStaffMember).filter((m): m is StaffMember => m !== null);
    this.applicants = (staffSave?.applicants ?? []).map(readStaffMember).filter((m): m is StaffMember => m !== null);
    this.applicantsNight = typeof staffSave?.applicantsNight === "number" ? staffSave.applicantsNight : -1;
    this.nextApplicant = typeof staffSave?.nextApplicant === "number" ? staffSave.nextApplicant : 1;
    this.friendship = {};
    for (const [id, n] of Object.entries(staffSave?.friendship ?? {})) if (typeof n === "number") this.friendship[id] = n;
    this.friendTimeToday.clear();
    // The Revel House (revel.ts): older saves have no hall.
    const revel = save.revel;
    this.revelHall = revel?.hall === true;
    const rs = revel?.settings;
    this.revelSettings = {
      who: rs && ["men", "mixed", "women"].includes(rs.who) ? rs.who : DEFAULT_REVEL.who,
      herPart: rs && ["host", "join", "centrepiece"].includes(rs.herPart) ? rs.herPart : DEFAULT_REVEL.herPart,
      door: rs && ["open", "invite", "paying"].includes(rs.door) ? rs.door : DEFAULT_REVEL.door,
    };
    this.revelTonight = revel?.tonight === true;
    this.revelHeld = false;
    this.revelScene = false;
    this.riot = progress.riot === true;
    this.hairNights = progress.hairNights ?? 0;
    this.trinketsWorn = (progress.trinkets ?? []).filter((id, i, all) => TRINKET_BY_ID.has(id) && all.indexOf(id) === i).slice(0, TRINKET_SLOTS);
    // Edicts: only ones that exist. A save from when rules switched on and off keeps the ones that were on.
    this.rules.clear();
    for (const id of progress.rules ?? []) if (TAVERN_RULE_BY_ID.has(id)) this.rules.add(id as TavernRuleId);
    this.edictPoints = progress.edictPoints ?? EDICT_START_POINTS;
    // The brothel isn't saved: it opens again from what she's become.
    this.houseMode = { current: "tavern", unlocked: new Set(["tavern"]), brothel: 0 };
    this.unlockBrothel(true);
    // The Lantern is saved, though: what she's built, her rules, and her girls. No save of it, no lantern.
    this.lantern.restore(save.lantern);
    this.eased = progress.eased ?? false;
    this.xp = readExperience(progress.xp);
    // Favors: only ones that exist; what's still to come keeps its night.
    this.askedFavors.clear();
    for (const id of save.favors?.asked ?? []) if (typeof id === "string") this.askedFavors.add(id);
    this.favorsDue = (save.favors?.due ?? []).filter(
      (d) => d && typeof d.id === "string" && FOLLOW_UP_BY_ID.has(d.id) && typeof d.night === "number",
    );
    this.worn = this.worn.slice(0, this.titleSlots);
    this.refreshEffects();
    // Where she stands now isn't news: only a rise from here is shown.
    this.shownLevel = this.herLevel;
    this.shownSlut = this.slutLevel;
    this.fight = null;
    this.lastFight = null;
    this.brawlOffer = null;
    this.brawlDuel = false;
    this.duel = null;
    this.lastDuel = null;
    this.testDuel = false;
    this.newPassives = [];
    this.adultScene = null;
    this.layout = save.layout ? cloneLayout(save.layout) : null;
    this.stock.cup = save.stock?.cup ?? START_CUPS;
    this.broken.cup = Math.max(0, Math.floor(save.broken?.cup ?? 0));
    this.broken.dish = Math.max(0, Math.floor(save.broken?.dish ?? 0));
    this.debuffs = (save.debuffs ?? [])
      .filter((d) => d && DEBUFF_IDS.includes(d.id) && typeof d.level === "number" && typeof d.nights === "number")
      .map((d) => ({ id: d.id, level: Math.min(DEBUFFS[d.id].maxLevel, Math.max(1, Math.floor(d.level))), nights: Math.max(0, Math.floor(d.nights)) }));
    // Her debuffs are part of her effects, worked out again now they're back.
    this.refreshEffects();
    const story = save.story;
    const count = (n: unknown, fallback: number) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback);
    this.fans = count(story?.fans, 0);
    this.beatsDone.clear();
    for (const id of story?.beats ?? ["salt"]) if (BEATS.some((b) => b.id === id)) this.beatsDone.add(id);
    // Act 1's flags: only ones that exist. Older saves have none.
    this.plotFlags.clear();
    for (const flag of story?.flags ?? []) if (isPlotFlag(flag)) this.plotFlags.add(flag);
    // Older saves don't know which stage she's heard of: the one she's at, so nothing's announced twice.
    // Her Legend first (an older save has never been one), so the stage below reads it.
    this.legend = readLegend(story?.legend);
    const arc = story?.arc;
    this.arcSeen = typeof arc === "number" && arc >= -1 && arc <= ARC_AFTERMATH_SEEN ? Math.floor(arc) : arcSeenFor(this.arcStage);
    // And her corruption tier's card, the same way.
    const tier = story?.tier;
    this.tierSeen =
      typeof tier === "number" && tier >= 0 && tier < CORRUPTION_TIERS.length ? Math.floor(tier) : CORRUPTION_TIERS.indexOf(corruptionTier(this.corruption));
    this.houses = {};
    for (const h of HOUSES) {
      const fate = story?.houses?.[h.id];
      if (fate === "partner" || fate === "ruin" || fate === "fallen") this.houses[h.id] = fate;
    }
    this.owed = count(story?.owed, DEBT);
    this.arrears = count(story?.arrears, 0);
    this.bookPromised = Boolean(story?.promised);
    // An older save, from when nights went by number: carry on from the night it was on.
    this.storyNight = story ? (typeof story.storyNight === "number" ? story.storyNight : -1) : save.nightIndex;
    this.pendingBeat = null;
    this.firstInTarven = false;
    // Wren's letters, the Chapter 1 ending and her fans by group (letters.ts, chapter1.ts).
    this.letters = readLetters(story?.letters, this.beatsDone.has("pell"));
    this.letterToday = null;
    this.willDipped = false;
    this.chapterEnding = isChapterEnding(story?.chapter1) ? story.chapter1 : null;
    this.fanGroups = readFanGroups(story?.fanGroups, this.fans);
    this.fanTags = { lantern: 0, network: 0 };
    this.fansTonight = 0;
    this.rivalMove = null;
    this.baronVisit = null;
    this.stock.dish = save.stock?.dish ?? START_DISHES;
    this.bottles.clear();
    for (const bottle of save.bottles ?? []) this.bottles.add(bottle);
    this.name = save.name ?? "";
    this.tub.splice(0, this.tub.length, ...(save.tub ?? []));
    this.dirtyHeld[0].length = this.dirtyHeld[1].length = 0;
    this.guests.length = 0;
    this.nextGuestId = 1;
    this.messages.length = 0;
    this.unlocks.length = 0;
    this.cues.length = 0;
    this.lastResult = "";
    this.ending = null;
    this.openDay((save.messes ?? []).map(copyMess));
    // Her day errands (errands.ts), after the new day's reset: older saves have none.
    const errands = save.errands;
    this.flyeredToday = errands?.flyered === true;
    this.postedToday = errands?.posted === true;
    this.errandGuests = typeof errands?.guests === "number" ? Math.max(0, Math.min(MAX_ERRAND_GUESTS, errands.guests)) : 0;
    this.errandFans = typeof errands?.fans === "number" ? Math.max(0, errands.fans) : 0;
    for (const done of Array.isArray(errands?.town) ? errands.town : []) if (typeof done === "string") this.townDoneToday.add(done);
    this.restoreSideJobs(save);
  }

  /** Feed Star, the Knight path and the Guild from a save (older saves have none of them). */
  private restoreSideJobs(save: TavernSave): void {
    const n = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
    const ids = <T extends string>(list: unknown, ok: readonly T[]): T[] => (Array.isArray(list) ? list.filter((x): x is T => ok.includes(x as T)) : []);
    const f = save.feed;
    const rec = f?.records;
    this.feed = {
      followers: Math.max(0, Math.floor(n(rec?.followers))),
      totalLikes: Math.max(0, Math.floor(n(rec?.totalLikes))),
      boldPosts: Math.max(0, Math.floor(n(rec?.boldPosts))),
      virals: Math.max(0, Math.floor(n(rec?.virals))),
      streams: Math.max(0, Math.floor(n(rec?.streams))),
    };
    this.feedDeals = (Array.isArray(f?.deals) ? f.deals : [])
      .filter((d) => d && Feed.SPONSOR_IDS.includes(d.id))
      .map((d) => ({ id: d.id, postsThisWeek: Math.max(0, Math.floor(n(d.postsThisWeek))) }));
    this.feedWarned = ids(f?.warned, Feed.SPONSOR_IDS);
    this.feedBroken = ids(f?.broken, Feed.SPONSOR_IDS);
    this.feedQuietDays = Math.max(0, Math.floor(n(f?.quietDays)));
    this.feedHype = clamp(n(f?.hype), 0, 0.5);
    this.feedStalkerRisk = clamp(n(f?.stalkerRisk), 0, 0.5);
    this.feedTrendWeek = Math.floor(n(f?.trendWeek, -1));
    this.feedStreamedToday = f?.streamed === true;
    this.feedStream = null;
    this.feedInbox = (Array.isArray(f?.inbox) ? f.inbox : []).filter((d) => d && typeof d.from === "string" && typeof d.text === "string" && d.kind in Feed.DM_SAMPLES).map((d) => ({ ...d }));
    this.feedInboxDay = Math.floor(n(f?.inboxDay, -1));
    // The Knight path: a state with a rank she could hold, or none.
    const k = save.knight;
    const state = k?.state;
    if (state && Knight.KNIGHT_RANK_ORDER.includes(state.rank)) {
      const base = Knight.newKnightState();
      this.knight = {
        ...base,
        ...state,
        favour: clamp(n(state.favour, base.favour), 0, 100),
        scandal: Math.max(0, n(state.scandal)),
        squad: (Array.isArray(state.squad) ? state.squad : []).filter((m) => m && typeof m.name === "string").map((m) => ({ name: m.name, loyalty: clamp(n(m.loyalty), 0, 100) })),
        laws: { ...base.laws, ...(state.laws ?? {}) },
      };
    } else this.knight = null;
    // The town hall: its own save, or (older saves) the Reeve's chain and laws she kept as a knight.
    this.politics = Hall.readPolitics(save.politics, this.knight);
    this.knightFlags = Array.isArray(k?.flags) ? k.flags.filter((x): x is string => typeof x === "string") : [];
    this.knightTourneyWeek = Math.floor(n(k?.tourneyWeek, -1));
    this.knightDoneToday.clear();
    for (const d of Array.isArray(k?.done) ? k.done : []) if (typeof d === "string") this.knightDoneToday.add(d);
    this.knightPatrolId = typeof k?.patrol === "string" && Knight.PATROL_EVENTS.some((e) => e.id === k.patrol) ? k.patrol : null;
    this.sideFight = null;
    this.questRun = null;
    // The Guild: a card with a rank, or none.
    const g = save.guild;
    const card = g?.card;
    if (card && Guild.GUILD_RANK_IDS.includes(card.rank)) {
      this.guild = {
        rank: card.rank,
        points: Math.max(0, n(card.points)),
        quests: Math.max(0, Math.floor(n(card.quests))),
        failed: Math.max(0, Math.floor(n(card.failed))),
        deed: card.deed === true,
        party: (Array.isArray(card.party) ? card.party : []).filter((c) => c && typeof c.id === "string" && Guild.PARTY_ROLES.includes(c.role)).map((c) => ({ ...c })),
        injuries: (Array.isArray(card.injuries) ? card.injuries : []).filter((i) => i && i.id in Guild.INJURIES && typeof i.who === "string").map((i) => ({ who: i.who, id: i.id, days: Math.max(1, Math.floor(n(i.days, 1))) })),
        counter: card.counter === true,
        master: card.master === true,
        cut: card.cut in Guild.QUEST_CUTS ? card.cut : "fair",
        mood: n(card.mood),
        members: Math.max(0, Math.floor(n(card.members))),
        accepted: typeof card.accepted === "string" && card.accepted in Guild.QUEST_BY_ID ? card.accepted : null,
      };
    } else this.guild = null;
    this.guildBoard = Array.isArray(g?.board) ? g.board.filter((id): id is string => typeof id === "string" && id in Guild.QUEST_BY_ID) : [];
    this.guildBoardDay = Math.floor(n(g?.boardDay, -1));
    this.guildQuestToday = g?.questToday === true;
    this.guildHallToday = g?.hallToday === true;
    this.guildQuestGold = Array.isArray(g?.questGold) ? g.questGold.filter((x): x is number => typeof x === "number") : [];
    this.refreshEffects();
  }

  /** Starts a new day with the tavern closed, clearing everything that only lasts one night. */
  private openDay(messes: Mess[] = []): void {
    this.phase = "day";
    this.news.length = 0;
    this.pendingBeat = null;
    // The bedtime summary has shown last night's passives; tonight's start fresh.
    this.newPassives = [];
    this.messes.splice(0, this.messes.length, ...messes);
    this.nextMessId = Math.max(0, ...messes.map((m) => m.id)) + 1;
    this.openedDirty = false;
    this.spiltAt.clear();
    // Dirty dishes still in hand get left in the tub overnight. Anything else not dirty is back on the shelf.
    for (const held of this.dirtyHeld) this.tub.push(...held.splice(0));
    const dirty = [...this.tub, ...this.messes.flatMap(messWares)];
    for (const ware of ["cup", "dish"] as const) {
      this.cleanWare[ware] = Math.max(0, this.stock[ware] - dirty.filter((w) => w === ware).length);
    }
    this.clock = 0;
    this.nextArrival = 0;
    this.carrying[0] = this.carrying[1] = null;
    this.carryCount[0] = this.carryCount[1] = 0;
    this.aleReady = 0;
    this.pourLeft = null;
    this.potState = "empty";
    this.potBowls = 0;
    this.heardRumor = false;
    this.served = 0;
    this.walkouts = 0;
    this.earned = 0;
    this.napped = false;
    this.drunk = 0;
    this.overLimit = 0;
    this.passingOut = false;
    this.lastClearFrom = null;
    this.lastClearAsked = false;
    this.joinNext = null;
    this.dressLeft = 0;
    this.stripped = 0;
    this.undressedTonight = 0;
    this.coated = {};
    this.talkingTo = null;
    this.talkReply = [];
    this.tipChat = null;
    this.touchChat = null;
    this.grabChat = null;
    this.showChat = null;
    this.lantern.newDay();
    this.touchMoment = null;
    this.touchSeen.clear();
    this.touchHistory.clear();
    Object.assign(this.touchesTonight, { reached: 0, allowed: 0, refused: 0, boldest: 0 });
    // Tonight's desire is gone by morning. It starts again where her passives put it.
    const start = this.eased ? this.effects.aloneStart : 0;
    for (const m of METERS) this.meters[m] = this.peak[m] = Math.min(this.desireCap(m), this.effects.start[m] + start);
    this.pleasure = 0;
    this.defeatTonight = null;
    // A new shift: the times she's come start again from nothing (the table, adultplay.ts).
    this.comesTonight = 0;
    // A night's sleep, and she has all her willpower back, and her energy.
    this.willSpent = 0;
    this.energySpent = 0;
    this.adultScene = null;
    this.fight = null;
    this.trouble = null;
    this.fightsTonight = 0;
    this.drinksTonight = 0;
    this.duel = null;
    this.lastDuel = null;
    this.testDuel = false;
    this.admirers = [];
    this.leftWanting = [];
    this.invading = false;
    this.peacemade = [];
    this.brawlOffer = null;
    this.brawlDuel = false;
    this.duelTonight = false;
    this.revelHeld = false;
    this.revelScene = false;
    if (this.revelTonight && !this.revelOpen) this.revelTonight = false;
    this.friendTimeToday.clear();
    this.flyeredToday = false;
    this.postedToday = false;
    this.townDoneToday.clear();
    // Feed Star, the Knight path and the Guild: what's done once a day starts again.
    this.feedStreamedToday = false;
    this.feedStream = null;
    this.phoneTonight = false;
    this.knightDoneToday.clear();
    this.knightPatrolId = null;
    this.sideFight = null;
    this.guildQuestToday = false;
    this.guildHallToday = false;
    this.guildQuestGold = [];
    // A fresh lot of applicants every few nights, once staff come in (staff.ts).
    if (this.staffStage !== "early" && (this.applicantsNight < 0 || this.nightIndex - this.applicantsNight >= APPLICANTS_EVERY)) this.postForWork(false);
    this.taproom = null;
    this.morningAfter = [];
    this.partyState.clear();
    this.say(
      messes.length > 0
        ? `Day ${this.nightIndex + 1}. Last night left a mess: dirty dishes, spilt ale and dust. Clean up and get ready, then ring the bell on the bar.`
        : `Day ${this.nightIndex + 1}. The tavern is closed. Get ready, then ring the bell on the bar when you want the night to begin.`,
    );
    if (messes.some((m) => m.kind === "cobweb")) {
      this.say("Up on the wall, a spider has been busy. Mess left about overnight draws them back in.");
    }
  }
}
